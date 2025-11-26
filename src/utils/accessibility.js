import { useEffect } from 'react';

/**
 * Custom hook to handle keyboard navigation
 * @param {Object} options - Configuration options
 * @param {Function} options.onEscape - Callback when Escape is pressed
 * @param {Function} options.onEnter - Callback when Enter is pressed
 * @param {Function} options.onArrowUp - Callback when Arrow Up is pressed
 * @param {Function} options.onArrowDown - Callback when Arrow Down is pressed
 * @param {boolean} options.enabled - Whether the hook is enabled
 */
export const useKeyboardNavigation = (options = {}) => {
    const {
        onEscape,
        onEnter,
        onArrowUp,
        onArrowDown,
        enabled = true
    } = options;

    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e) => {
            switch (e.key) {
                case 'Escape':
                    if (onEscape) {
                        e.preventDefault();
                        onEscape(e);
                    }
                    break;
                case 'Enter':
                    if (onEnter && !e.shiftKey) {
                        e.preventDefault();
                        onEnter(e);
                    }
                    break;
                case 'ArrowUp':
                    if (onArrowUp) {
                        e.preventDefault();
                        onArrowUp(e);
                    }
                    break;
                case 'ArrowDown':
                    if (onArrowDown) {
                        e.preventDefault();
                        onArrowDown(e);
                    }
                    break;
                default:
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onEscape, onEnter, onArrowUp, onArrowDown, enabled]);
};

/**
 * Custom hook to trap focus within a modal or dialog
 * @param {React.RefObject} containerRef - Ref to the container element
 * @param {boolean} isActive - Whether focus trap is active
 */
export const useFocusTrap = (containerRef, isActive = true) => {
    useEffect(() => {
        if (!isActive || !containerRef.current) return;

        const container = containerRef.current;
        const focusableElements = container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        // Focus first element when modal opens
        firstElement?.focus();

        const handleTabKey = (e) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                // Shift + Tab
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement?.focus();
                }
            } else {
                // Tab
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement?.focus();
                }
            }
        };

        container.addEventListener('keydown', handleTabKey);
        return () => container.removeEventListener('keydown', handleTabKey);
    }, [containerRef, isActive]);
};

/**
 * Custom hook to add skip to main content functionality
 * @param {string} mainContentId - ID of the main content element
 */
export const useSkipToMain = (mainContentId = 'main-content') => {
    useEffect(() => {
        const handleSkipLink = (e) => {
            if (e.key === 'Tab' && !e.shiftKey && document.activeElement.tagName === 'BODY') {
                const skipLink = document.getElementById('skip-to-main');
                if (skipLink) {
                    skipLink.focus();
                }
            }
        };

        document.addEventListener('keydown', handleSkipLink);
        return () => document.removeEventListener('keydown', handleSkipLink);
    }, [mainContentId]);
};
