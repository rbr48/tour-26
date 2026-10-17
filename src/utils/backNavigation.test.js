import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  registerBackHandler,
  dispatchBackAction,
  getActiveBackHandlerCount,
  clearBackHandlers,
} from './backNavigation';

describe('backNavigation', () => {
  beforeEach(() => {
    clearBackHandlers();
  });

  it('starts with zero handlers and returns false on empty dispatch', () => {
    expect(getActiveBackHandlerCount()).toBe(0);
    expect(dispatchBackAction()).toBe(false);
  });

  it('registers and executes the topmost handler in LIFO order', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    registerBackHandler(handler1);
    registerBackHandler(handler2);

    expect(getActiveBackHandlerCount()).toBe(2);

    const handled = dispatchBackAction();
    expect(handled).toBe(true);
    expect(handler2).toHaveBeenCalledTimes(1);
    expect(handler1).not.toHaveBeenCalled();
    expect(getActiveBackHandlerCount()).toBe(1);

    const handledSecond = dispatchBackAction();
    expect(handledSecond).toBe(true);
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(getActiveBackHandlerCount()).toBe(0);
  });

  it('respects priority over insertion order', () => {
    const lowPriorityHandler = vi.fn();
    const highPriorityHandler = vi.fn();

    registerBackHandler(lowPriorityHandler, 5);
    registerBackHandler(highPriorityHandler, 50);

    const handled = dispatchBackAction();
    expect(handled).toBe(true);
    expect(highPriorityHandler).toHaveBeenCalledTimes(1);
    expect(lowPriorityHandler).not.toHaveBeenCalled();
  });

  it('unregisters cleanly when cleanup function is invoked', () => {
    const handler = vi.fn();
    const unregister = registerBackHandler(handler);

    expect(getActiveBackHandlerCount()).toBe(1);
    unregister();
    expect(getActiveBackHandlerCount()).toBe(0);
    expect(dispatchBackAction()).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });
});
