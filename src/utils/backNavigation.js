import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

// Stack of active back handlers sorted by priority & insertion order
const backHandlers = [];
let nextHandlerId = 1;

/**
 * Register a back-action callback (e.g. closing a modal, drawer, or lightbox).
 * Returns an unregister function.
 *
 * @param {Function} handler - function to call when back is pressed
 * @param {number} priority - higher priority handlers are executed first (default: 0)
 * @returns {Function} unregister function
 */
export function registerBackHandler(handler, priority = 0) {
  if (typeof handler !== 'function') return () => {};
  const id = nextHandlerId++;
  const entry = { id, handler, priority, timestamp: Date.now() };
  backHandlers.push(entry);

  // On Web, push a history state so pressing browser/phone back triggers popstate instead of exiting the page
  if (typeof window !== 'undefined' && !Capacitor.isNativePlatform()) {
    try {
      window.history.pushState({ tourModalId: id }, '');
    } catch {}
  }

  return () => {
    const idx = backHandlers.findIndex((h) => h.id === id);
    if (idx !== -1) {
      backHandlers.splice(idx, 1);
    }
  };
}

/**
 * React hook to register a back action whenever isOpen is true.
 */
export function useBackHandler(isOpen, onBack, priority = 0) {
  useEffect(() => {
    if (!isOpen || typeof onBack !== 'function') return undefined;
    return registerBackHandler(onBack, priority);
  }, [isOpen, onBack, priority]);
}

/**
 * Dispatches the topmost back action.
 * Returns true if an action was handled, false otherwise.
 */
export function dispatchBackAction() {
  if (backHandlers.length === 0) return false;

  // Sort descending: highest priority first, then most recently added (highest id)
  backHandlers.sort((a, b) => (b.priority - a.priority) || (b.id - a.id));
  const top = backHandlers.shift();
  if (top && typeof top.handler === 'function') {
    try {
      top.handler();
    } catch (err) {
      console.warn('Error executing back handler:', err);
    }
    return true;
  }
  return false;
}

/**
 * Returns the count of registered back handlers currently active.
 */
export function getActiveBackHandlerCount() {
  return backHandlers.length;
}

/**
 * Clears all registered handlers (used for tests/reset)
 */
export function clearBackHandlers() {
  backHandlers.length = 0;
}
