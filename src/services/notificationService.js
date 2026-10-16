// Push Notification & Sound Service for Tour 2026 App

// 1. Play gentle synthesized notification chime (Zero external file dependencies)
export const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Pleasant dual chime (F#5 to A5)
    osc.frequency.setValueAtTime(739.99, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.45);
  } catch {
    // AudioContext requires prior user interaction on some mobile browsers
  }
};

// 2. Request OS / Browser Notification Permission
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (e) {
    console.warn('Error requesting notification permission:', e);
    return 'denied';
  }
};

// 3. Check current permission
export const getNotificationPermission = () => {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
};

// 4. Trigger Native Push Notification (Android status bar / PC Action Center)
export const sendPushNotification = ({ title, body, icon = '/logo.png', tag, onClick }) => {
  // Sound
  playNotificationSound();

  // Vibration on mobile phones
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([120, 60, 120]);
    } catch {}
  }

  // System notification
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        body,
        icon,
        badge: icon,
        tag: tag || 'tour_activity_' + Date.now(),
        renotify: true
      });

      notif.onclick = () => {
        window.focus();
        if (onClick) onClick();
        notif.close();
      };
    } catch (e) {
      console.warn('Native notification failed:', e);
    }
  }
};
