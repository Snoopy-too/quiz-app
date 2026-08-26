import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import AvatarThumbnail from '../components/settings/AvatarThumbnail';

describe('AvatarThumbnail Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders loading skeleton on initial mount', () => {
    render(
      <AvatarThumbnail
        src="https://api.dicebear.com/7.x/open-peeps/svg?seed=Avatar51"
        alt="Avatar option 51"
        isSelected={false}
        onClick={() => {}}
      />
    );

    expect(screen.getByTestId('avatar-skeleton')).toBeInTheDocument();
    const img = screen.getByAltText('Avatar option 51');
    expect(img).toHaveClass('opacity-0');
  });

  it('transitions to loaded state when onLoad fires', () => {
    render(
      <AvatarThumbnail
        src="https://api.dicebear.com/7.x/open-peeps/svg?seed=Avatar51"
        alt="Avatar option 51"
        isSelected={false}
        onClick={() => {}}
      />
    );

    const img = screen.getByAltText('Avatar option 51');
    fireEvent.load(img);

    expect(screen.queryByTestId('avatar-skeleton')).not.toBeInTheDocument();
    expect(img).toHaveClass('opacity-100');
  });

  it('renders checkmark overlay when isSelected is true', () => {
    render(
      <AvatarThumbnail
        src="https://api.dicebear.com/7.x/open-peeps/svg?seed=Avatar51"
        alt="Avatar option 51"
        isSelected={true}
        onClick={() => {}}
      />
    );

    expect(screen.getByTestId('avatar-selected')).toBeInTheDocument();
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('triggers onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(
      <AvatarThumbnail
        src="https://api.dicebear.com/7.x/open-peeps/svg?seed=Avatar51"
        alt="Avatar option 51"
        isSelected={false}
        onClick={handleClick}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('retries loading on image error with exponential backoff', () => {
    render(
      <AvatarThumbnail
        src="https://api.dicebear.com/7.x/open-peeps/svg?seed=Avatar51"
        alt="Avatar option 51"
        isSelected={false}
        onClick={() => {}}
        maxRetries={2}
      />
    );

    const img = screen.getByAltText('Avatar option 51');
    
    // Trigger first error
    fireEvent.error(img);
    expect(screen.getByTestId('avatar-skeleton')).toBeInTheDocument();

    // Fast-forward timers for retry attempt 1
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const updatedImg = screen.getByAltText('Avatar option 51');
    expect(updatedImg.getAttribute('src')).toContain('_r=1');

    // Trigger second error
    fireEvent.error(updatedImg);

    // Fast-forward timers for retry attempt 2
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    const updatedImg2 = screen.getByAltText('Avatar option 51');
    expect(updatedImg2.getAttribute('src')).toContain('_r=2');

    // Trigger third error (exceeds maxRetries = 2)
    fireEvent.error(updatedImg2);

    // Now error fallback should appear
    expect(screen.getByTestId('avatar-error')).toBeInTheDocument();
  });
});
