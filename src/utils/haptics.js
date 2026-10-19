import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Triggers safe hardware haptic feedback on supported mobile devices (Capacitor Android/iOS).
 * Gracefully falls back to navigator.vibrate on modern mobile web browsers, or no-op on desktop.
 */
export const triggerHaptic = async (style = 'medium') => {
  try {
    if (Capacitor.isNativePlatform()) {
      if (style === 'light') {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else if (style === 'heavy') {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } else if (style === 'success') {
        await Haptics.notification({ type: NotificationType.Success });
      } else {
        await Haptics.impact({ style: ImpactStyle.Medium });
      }
      return;
    }

    // Web Fallback if supported
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      if (style === 'light') {
        navigator.vibrate(10);
      } else if (style === 'heavy') {
        navigator.vibrate([20, 40, 20]);
      } else if (style === 'success') {
        navigator.vibrate([15, 30, 20]);
      } else {
        navigator.vibrate(18);
      }
    }
  } catch {
    // Graceful no-op on unsupported platforms or when permission denied
  }
};
