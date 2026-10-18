import { describe, it, expect, vi } from 'vitest';
import { triggerHaptic } from './haptics';

describe('haptics utility', () => {
  it('triggers haptic safely without throwing error', async () => {
    await expect(triggerHaptic('light')).resolves.not.toThrow();
    await expect(triggerHaptic('medium')).resolves.not.toThrow();
    await expect(triggerHaptic('heavy')).resolves.not.toThrow();
    await expect(triggerHaptic('success')).resolves.not.toThrow();
  });

  it('calls navigator.vibrate when available on web', async () => {
    const vibrateMock = vi.fn();
    const originalVibrate = navigator.vibrate;
    navigator.vibrate = vibrateMock;

    try {
      await triggerHaptic('light');
      expect(vibrateMock).toHaveBeenCalledWith(10);

      await triggerHaptic('medium');
      expect(vibrateMock).toHaveBeenCalledWith(18);
    } finally {
      navigator.vibrate = originalVibrate;
    }
  });
});
