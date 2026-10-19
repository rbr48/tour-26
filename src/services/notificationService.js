import { Capacitor } from '@capacitor/core';
import { auth } from '../firebase';

export const API_BASE = Capacitor.isNativePlatform()
  ? 'https://tour2026.izhaanintellect.fun'
  : '';

export const NOTIFICATION_CHANNEL_ID = 'tour_2026_channel';

let cachedFcmToken = null;
try {
  cachedFcmToken = typeof window !== 'undefined' ? localStorage.getItem('tour_fcm_token') : null;
} catch {}

// Helper: Send FCM Token to VPS Server
export const sendFcmTokenToServer = async (fcmToken, currentUser) => {
  const user = currentUser || auth.currentUser;
  if (!user || !fcmToken) return { success: false, error: 'User or token missing' };
  try {
    const idToken = await user.getIdToken();
    const res = await fetch(`${API_BASE}/api/push/subscribe`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fcmToken,
        deviceName: typeof navigator !== 'undefined' && navigator.userAgent?.includes('Mobile') ? 'Android Mobile' : 'Android Device',
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error || 'FCM registration failed' };
    }
    try {
      localStorage.setItem('tour_push_active', 'true');
    } catch {}
    return await res.json();
  } catch (err) {
    console.warn('Failed to send FCM token to server:', err);
    return { success: false, error: err.message };
  }
};

// Helper: Convert URL-safe base64 string to Uint8Array for PushManager
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// 1. Play synthesized notification chime
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

    gain.gain.setValueAtTime(0.2, now);
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
  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const localPerm = await LocalNotifications.requestPermissions();

      const { PushNotifications } = await import('@capacitor/push-notifications');
      const pushPerm = await PushNotifications.requestPermissions().catch(() => ({ receive: 'denied' }));

      const granted = localPerm.display === 'granted' || pushPerm.receive === 'granted';
      return granted ? 'granted' : 'denied';
    } catch (e) {
      console.warn('Native notification permission error:', e);
      return 'denied';
    }
  }

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
export const getNotificationPermission = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const perm = await LocalNotifications.checkPermissions();
      return perm.display;
    } catch {
      return 'granted';
    }
  }
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
};

// 4. Ensure high-importance Android Notification Channel exists
export const ensureNotificationChannel = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.createChannel({
      id: NOTIFICATION_CHANNEL_ID,
      name: 'ট্যুর ২০২৬ নোটিফিকেশন',
      description: 'জরুরি নোটিশ, ফটো আপডেট, আলোচনা ও খরচ সংক্রান্ত তথ্য',
      importance: 5, // High / Heads-up
      visibility: 1, // Public on lockscreen
      vibration: true,
      sound: 'default',
    }).catch(() => {});

    const { PushNotifications } = await import('@capacitor/push-notifications');
    await PushNotifications.createChannel({
      id: NOTIFICATION_CHANNEL_ID,
      name: 'ট্যুর ২০২৬ নোটিফিকেশন',
      description: 'জরুরি নোটিশ, ফটো আপডেট, আলোচনা ও খরচ সংক্রান্ত তথ্য',
      importance: 5,
      visibility: 1,
      vibration: true,
      sound: 'default',
    }).catch(() => {});
  } catch (err) {
    console.warn('Failed to ensure notification channel:', err);
  }
};

// 5. Initialize native push and local listeners on startup
export const initNativePushListeners = async (onNavigate) => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await ensureNotificationChannel();

    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const { PushNotifications } = await import('@capacitor/push-notifications');

    // Action when user taps local notification in Android notification bar
    await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      const tab = action.notification?.extra?.tab;
      if (tab && typeof onNavigate === 'function') {
        onNavigate(tab);
      }
    }).catch(() => {});

    // Action when FCM registration delivers device token
    await PushNotifications.addListener('registration', async ({ value: token }) => {
      cachedFcmToken = token;
      try {
        localStorage.setItem('tour_fcm_token', token);
      } catch {}
      const user = auth.currentUser;
      if (user) {
        await sendFcmTokenToServer(token, user);
      }
    }).catch(() => {});

    // Action on registration error
    await PushNotifications.addListener('registrationError', (err) => {
      console.warn('Native push registration error:', err);
    }).catch(() => {});

    // Action when user taps remote push notification
    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const tab = action.notification?.data?.tab;
      if (tab && typeof onNavigate === 'function') {
        onNavigate(tab);
      }
    }).catch(() => {});

    // Show heads-up banner when push is received in foreground
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      LocalNotifications.schedule({
        notifications: [
          {
            title: notification.title || '🏖️ কক্সবাজার ফ্যামিলি ট্যুর ২০২৬',
            body: notification.body || '',
            id: Math.floor(Math.random() * 1000000) + 1,
            channelId: NOTIFICATION_CHANNEL_ID,
            sound: 'default',
            extra: { tab: notification.data?.tab || 'feed' },
          },
        ],
      }).catch(() => {});
    }).catch(() => {});

    // Auto-register if permission was already granted previously
    const pushPerm = await PushNotifications.checkPermissions().catch(() => ({ receive: 'prompt' }));
    if (pushPerm.receive === 'granted') {
      await PushNotifications.register().catch(() => {});
    }
  } catch (err) {
    console.warn('Native notification listener setup failed:', err);
  }
};

// 6. Register Device with Web Push Server (Real remote push)
export const subscribeToPushNotifications = async (currentUser) => {
  const user = currentUser || auth.currentUser;
  if (!user) {
    return { success: false, error: 'অনুগ্রহ করে প্রথমে লগইন করুন' };
  }

  // Handle Native Capacitor platform
  if (Capacitor.isNativePlatform()) {
    try {
      await ensureNotificationChannel();

      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const { PushNotifications } = await import('@capacitor/push-notifications');

      let localPerm = await LocalNotifications.checkPermissions();
      if (localPerm.display !== 'granted') {
        localPerm = await LocalNotifications.requestPermissions();
      }

      let pushPerm = await PushNotifications.checkPermissions().catch(() => ({ receive: 'prompt' }));
      if (pushPerm.receive !== 'granted') {
        pushPerm = await PushNotifications.requestPermissions().catch(() => ({ receive: 'denied' }));
      }

      if (pushPerm.receive !== 'granted' && localPerm.display !== 'granted') {
        return { success: false, error: 'নোটিফিকেশন পারমিশন বাতিল করা হয়েছে' };
      }

      // Check existing cached token
      let token = cachedFcmToken || (typeof window !== 'undefined' ? localStorage.getItem('tour_fcm_token') : null);

      // Register with FCM and wait for token if needed
      const tokenPromise = new Promise((resolve) => {
        let done = false;
        const timer = setTimeout(() => {
          if (!done) {
            done = true;
            resolve(cachedFcmToken || localStorage.getItem('tour_fcm_token'));
          }
        }, 5000);

        PushNotifications.addListener('registration', (t) => {
          if (!done) {
            done = true;
            clearTimeout(timer);
            resolve(t.value);
          }
        }).catch(() => {});
      });

      await PushNotifications.register().catch(() => {});

      if (!token) {
        token = await tokenPromise;
      }

      if (token) {
        cachedFcmToken = token;
        try {
          localStorage.setItem('tour_fcm_token', token);
        } catch {}
        const serverResult = await sendFcmTokenToServer(token, user);
        try {
          localStorage.setItem('tour_push_active', 'true');
        } catch {}
        return { success: true, fcmToken: token, ...serverResult };
      }

      try {
        localStorage.setItem('tour_push_active', 'true');
      } catch {}
      return { success: true };
    } catch (err) {
      console.warn('Native push registration error:', err);
      return { success: false, error: err.message };
    }
  }

  // Handle Web / PWA Push
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, error: 'এই ব্রাউজারে পুশ নোটিফিকেশন সমর্থিত নয়' };
  }

  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      return { success: false, error: 'নোটিফিকেশন পারমিশন বাতিল করা হয়েছে' };
    }

    const reg = await navigator.serviceWorker.ready;

    // 1. Fetch server's VAPID public key
    const keyRes = await fetch(`${API_BASE}/api/push/vapid-public-key`);
    if (!keyRes.ok) {
      throw new Error('পুশ কী সার্ভার থেকে পাওয়া যায়নি');
    }
    const { publicKey } = await keyRes.json();
    if (!publicKey) throw new Error('VAPID public key is empty');

    // 2. Subscribe via PushManager
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    // 3. Send subscription to server
    const idToken = await user.getIdToken();
    const subRes = await fetch(`${API_BASE}/api/push/subscribe`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription,
        deviceName: navigator.userAgent.includes('Mobile') ? 'Mobile Phone' : 'Computer',
      }),
    });

    if (!subRes.ok) {
      throw new Error(`সার্ভার সাবস্ক্রিপশন ব্যর্থ (${subRes.status})`);
    }

    localStorage.setItem('tour_push_active', 'true');
    return { success: true, subscription };
  } catch (err) {
    console.error('Failed to subscribe to push notifications:', err);
    return { success: false, error: err.message };
  }
};

// 7. Broadcast Push Notification from Server to all family members
export const sendBroadcastPush = async ({ title, body, url = '/', tag, tab, excludeSender = true }) => {
  const user = auth.currentUser;
  if (!user) return { success: false };

  try {
    const idToken = await user.getIdToken();
    const res = await fetch(`${API_BASE}/api/push/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        body,
        url,
        tag,
        tab,
        excludeSender,
      }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Push broadcast error:', err.message);
  }
  return { success: false };
};

// 8. Send Test Push Notification directly to current user's phone
export const sendTestPush = async (currentUser) => {
  const user = currentUser || auth.currentUser;
  if (!user) return { success: false, error: 'অনুগ্রহ করে প্রথমে লগইন করুন' };

  try {
    const idToken = await user.getIdToken();
    const token = cachedFcmToken || (typeof window !== 'undefined' ? localStorage.getItem('tour_fcm_token') : null);
    const res = await fetch(`${API_BASE}/api/push/test`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fcmToken: token || undefined,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error || 'টেস্ট নোটিফিকেশন পাঠানো যায়নি' };
    }
    const data = await res.json();
    return { success: data.sent > 0, ...data };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// 9. Trigger System Notification in Android Status Bar or Browser
export const sendPushNotification = ({ title, body, icon = '/icons/icon-192.png?v=20261019', tag, tab, onClick }) => {
  // 1. Play sound chime
  playNotificationSound();

  // 2. Vibration on mobile phones
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([120, 60, 120]);
    } catch {}
  }

  // 3. Native Android status bar notification via @capacitor/local-notifications
  if (Capacitor.isNativePlatform()) {
    import('@capacitor/local-notifications')
      .then(({ LocalNotifications }) => {
        LocalNotifications.schedule({
          notifications: [
            {
              title: title || '🏖️ কক্সবাজার ফ্যামিলি ট্যুর ২০২৬',
              body: body || '',
              id: Math.floor(Math.random() * 1000000) + 1,
              channelId: NOTIFICATION_CHANNEL_ID,
              smallIcon: 'ic_stat_notification',
              sound: 'default',
              extra: { tab, tag },
            },
          ],
        }).catch((err) => console.warn('Native LocalNotifications schedule error:', err));
      })
      .catch((err) => console.warn('LocalNotifications load error:', err));
    return;
  }

  // 4. Safe system notification for Web (ServiceWorker or Notification constructor)
  if ('Notification' in window && Notification.permission === 'granted') {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => {
          reg.showNotification(title, {
            body,
            icon,
            badge: icon,
            tag: tag || `tour_local_${Date.now()}`,
            renotify: true,
            data: { tab },
          });
        })
        .catch(() => {
          try {
            const notif = new Notification(title, { body, icon, tag });
            if (onClick) notif.onclick = onClick;
          } catch {}
        });
    } else {
      try {
        const notif = new Notification(title, { body, icon, tag });
        if (onClick) notif.onclick = onClick;
      } catch {}
    }
  }
};
