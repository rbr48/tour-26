import { Capacitor } from '@capacitor/core';
import { auth } from '../firebase';

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
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const perm = await PushNotifications.requestPermissions();
      return perm.receive === 'granted' ? 'granted' : 'denied';
    } catch {
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
export const getNotificationPermission = () => {
  if (Capacitor.isNativePlatform()) return 'granted';
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
};

// 4. Register Device with Web Push Server (Real remote push)
export const subscribeToPushNotifications = async (currentUser) => {
  const user = currentUser || auth.currentUser;
  if (!user) {
    return { success: false, error: 'অনুগ্রহ করে প্রথমে লগইন করুন' };
  }

  // Handle Native Capacitor platform
  if (Capacitor.isNativePlatform()) {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      let perm = await PushNotifications.checkPermissions();
      if (perm.receive !== 'granted') {
        perm = await PushNotifications.requestPermissions();
      }
      if (perm.receive === 'granted') {
        await PushNotifications.register();
        localStorage.setItem('tour_push_active', 'true');
        return { success: true };
      }
      return { success: false, error: 'নোটিফিকেশন পারমিশন দেওয়া হয়নি' };
    } catch (err) {
      console.warn('Native push error:', err);
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
    const keyRes = await fetch('/api/push/vapid-public-key');
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
    const subRes = await fetch('/api/push/subscribe', {
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

// 5. Broadcast Push Notification from Server to all family members
export const sendBroadcastPush = async ({ title, body, url = '/', tag, excludeSender = true }) => {
  const user = auth.currentUser;
  if (!user) return { success: false };

  try {
    const idToken = await user.getIdToken();
    const res = await fetch('/api/push/send', {
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

// 6. Send Test Push Notification directly to current user's phone
export const sendTestPush = async (currentUser) => {
  const user = currentUser || auth.currentUser;
  if (!user) return { success: false, error: 'অনুগ্রহ করে প্রথমে লগইন করুন' };

  try {
    const idToken = await user.getIdToken();
    const res = await fetch('/api/push/test', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error || 'টেস্ট নোটিফিকেশন পাঠানো যায়নি' };
    }
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// 7. Trigger Local/Foreground Notification safely (Compatible with mobile Chrome)
export const sendPushNotification = ({ title, body, icon = '/logo.png', tag, onClick }) => {
  // Sound
  playNotificationSound();

  // Vibration on mobile phones
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([120, 60, 120]);
    } catch {}
  }

  // Safe system notification (ServiceWorker showNotification avoids Chrome Android illegal constructor error)
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
