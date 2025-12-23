
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import App from '../App';
import * as supabaseClient from '../supabaseClient';

// Mock Supabase client
vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(),
        })),
        insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn() })) })),
      })),
      update: vi.fn(() => ({ eq: vi.fn() })),
    })),
  },
}));

// Mock child components to isolate App logic
vi.mock('../components/auth/Login', () => ({ default: () => <div data-testid="login-view">Login</div> }));
vi.mock('../components/dashboards/StudentDashboard', () => ({ default: () => <div data-testid="student-dashboard">Student Dashboard</div> }));
vi.mock('../components/dashboards/TeacherDashboard', () => ({ default: () => <div data-testid="teacher-dashboard">Teacher Dashboard</div> }));
vi.mock('../components/dashboards/SuperAdminDashboard', () => ({ default: () => <div data-testid="superadmin-dashboard">SuperAdmin Dashboard</div> }));
vi.mock('../components/quizzes/TeacherControl', () => ({ default: () => <div data-testid="teacher-control">Teacher Control</div> }));

describe('App Session Bootstrapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('should route to teacher dashboard if role is teacher', async () => {
    // Mock active session
    supabaseClient.supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'teacher-123', app_metadata: {} } } },
      error: null,
    });

    // Mock teacher profile fetch
    const mockProfile = { id: 'teacher-123', role: 'teacher', email: 't@test.com', approved: true, verified: true };
    supabaseClient.supabase.from.mockImplementation((table) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        };
      }
      return { select: vi.fn() }; // Default
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('teacher-dashboard')).toBeInTheDocument();
    });
  });

  it('should route to student dashboard if role is student', async () => {
    // Mock active session
    supabaseClient.supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'student-123', app_metadata: {} } } },
      error: null,
    });

    // Mock student profile fetch
    const mockProfile = { id: 'student-123', role: 'student', email: 's@test.com', approved: true, verified: true };
    supabaseClient.supabase.from.mockImplementation((table) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        };
      }
      return { select: vi.fn() };
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('student-dashboard')).toBeInTheDocument();
    });
  });

  it('should persist "teacher-control" view from sessionStorage on reload', async () => {
    // Setup sessionStorage to simulate active quiz session
    sessionStorage.setItem('quizapp_view', 'teacher-control');
    sessionStorage.setItem('quizapp_selectedSessionId', JSON.stringify('session-789'));

    // Mock active auth session
    supabaseClient.supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'teacher-123', app_metadata: {} } } },
      error: null,
    });

    const mockProfile = { id: 'teacher-123', role: 'teacher', email: 't@test.com', approved: true, verified: true };
    supabaseClient.supabase.from.mockImplementation((table) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        };
      }
      return { select: vi.fn() };
    });

    render(<App />);

    // Expect it to STAY on teacher-control, not redirect to dashboard
    await waitFor(() => {
      expect(screen.getByTestId('teacher-control')).toBeInTheDocument();
    });

    // Verify dashboard was NOT rendered
    expect(screen.queryByTestId('teacher-dashboard')).not.toBeInTheDocument();
  });
});
