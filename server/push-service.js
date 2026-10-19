import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import webpush from 'web-push';

const DEFAULT_SUBJECT = 'mailto:tour2026@izhaanintellect.fun';

export function createPushService({
  dataDir,
  vapidKeys: initialVapidKeys,
  subject = DEFAULT_SUBJECT,
  serviceAccount: initialServiceAccount,
} = {}) {
  const vapidFile = path.join(dataDir, 'vapid.json');
  const subsFile = path.join(dataDir, 'push-subscriptions.json');

  let vapidKeys = initialVapidKeys;
  if (!vapidKeys) {
    if (fs.existsSync(vapidFile)) {
      try {
        vapidKeys = JSON.parse(fs.readFileSync(vapidFile, 'utf8'));
      } catch (err) {
        console.warn('Could not read existing vapid.json, generating new keys:', err.message);
      }
    }
    if (!vapidKeys || !vapidKeys.publicKey || !vapidKeys.privateKey) {
      vapidKeys = webpush.generateVAPIDKeys();
      try {
        fs.writeFileSync(vapidFile, JSON.stringify(vapidKeys, null, 2), 'utf8');
      } catch (err) {
        console.warn('Could not write vapid.json:', err.message);
      }
    }
  }

  webpush.setVapidDetails(subject, vapidKeys.publicKey, vapidKeys.privateKey);

  // Load Firebase Service Account for native FCM HTTP v1 notifications
  let fcmServiceAccount = initialServiceAccount || null;
  if (!fcmServiceAccount) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        fcmServiceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } catch (err) {
        console.warn('Could not parse FIREBASE_SERVICE_ACCOUNT env var:', err.message);
      }
    }
    if (!fcmServiceAccount) {
      const candidates = [
        path.join(dataDir, 'firebase-service-account.json'),
        path.join(dataDir, '..', 'server', 'firebase-service-account.json'),
        path.join(dataDir, '..', 'firebase-service-account.json'),
      ];
      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          try {
            fcmServiceAccount = JSON.parse(fs.readFileSync(cand, 'utf8'));
            break;
          } catch (err) {
            console.warn(`Could not read service account from ${cand}:`, err.message);
          }
        }
      }
    }
  }

  // Cache for Google OAuth2 token for FCM v1
  let fcmTokenCache = {
    token: null,
    expiresAt: 0,
  };

  async function getFcmAccessToken(sa) {
    const now = Math.floor(Date.now() / 1000);
    if (fcmTokenCache.token && now < fcmTokenCache.expiresAt - 60) {
      return fcmTokenCache.token;
    }

    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      iss: sa.client_email,
      sub: sa.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
    })).toString('base64url');

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(header + '.' + payload);
    const signature = sign.sign(sa.private_key, 'base64url');
    const jwt = `${header}.${payload}.${signature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`FCM OAuth2 token fetch failed (${res.status}): ${errText}`);
    }

    const data = await res.json();
    fcmTokenCache = {
      token: data.access_token,
      expiresAt: now + (data.expires_in || 3600),
    };
    return fcmTokenCache.token;
  }

  async function sendFcmMessage(sa, deviceToken, { title, body, url = '/', tag, tab }) {
    const accessToken = await getFcmAccessToken(sa);
    const projectId = sa.project_id || 'tour-26';

    const payload = {
      message: {
        token: deviceToken,
        notification: {
          title: title || '🏖️ কক্সবাজার ফ্যামিলি ট্যুর ২০২৬',
          body: body || 'নতুন আপডেট এসেছে!',
        },
        data: {
          title: title || '🏖️ কক্সবাজার ফ্যামিলি ট্যুর ২০২৬',
          body: body || '',
          url: url || '/',
          tag: tag || `tour_${Date.now()}`,
          tab: tab || 'dashboard',
        },
        android: {
          priority: 'HIGH',
          notification: {
            channel_id: 'tour_2026_channel',
            icon: 'ic_stat_notification',
            color: '#134e4a',
            sound: 'default',
            default_sound: true,
            default_vibrate_timings: true,
            notification_priority: 'PRIORITY_MAX',
            visibility: 'PUBLIC',
          },
        },
      },
    };

    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errCode = errData.error?.details?.[0]?.errorCode || errData.error?.status;
      const isUnregistered = errCode === 'UNREGISTERED' || res.status === 404;
      const err = new Error(errData.error?.message || `FCM send failed (${res.status})`);
      err.status = res.status;
      err.unregistered = isUnregistered;
      throw err;
    }

    return await res.json();
  }

  function readSubscriptions() {
    if (!fs.existsSync(subsFile)) return [];
    try {
      const data = JSON.parse(fs.readFileSync(subsFile, 'utf8'));
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function writeSubscriptions(subs) {
    const tmp = `${subsFile}.tmp-${Date.now()}`;
    fs.writeFileSync(tmp, JSON.stringify(subs, null, 2), 'utf8');
    fs.renameSync(tmp, subsFile);
  }

  return {
    getPublicKey() {
      return vapidKeys.publicKey;
    },

    listSubscriptions() {
      return readSubscriptions();
    },

    subscribe({ subscription, fcmToken, userEmail, deviceName = 'Device' }) {
      if (!subscription && !fcmToken) {
        throw new Error('invalid subscription: must provide either subscription or fcmToken');
      }

      const subs = readSubscriptions();
      const now = new Date().toISOString();
      const email = (userEmail || '').toLowerCase().trim();

      if (fcmToken) {
        if (typeof fcmToken !== 'string' || fcmToken.length < 10) {
          throw new Error('invalid fcmToken: invalid format');
        }
        const existingIndex = subs.findIndex((s) => s.fcmToken === fcmToken);
        if (existingIndex >= 0) {
          subs[existingIndex] = {
            ...subs[existingIndex],
            type: 'fcm',
            fcmToken,
            userEmail: email || subs[existingIndex].userEmail,
            deviceName: deviceName || subs[existingIndex].deviceName,
            updatedAt: now,
          };
        } else {
          const id = crypto.createHash('sha256').update(fcmToken).digest('hex').slice(0, 16);
          subs.push({
            id,
            type: 'fcm',
            fcmToken,
            userEmail: email,
            deviceName,
            createdAt: now,
            updatedAt: now,
          });
        }
      } else {
        if (!subscription || typeof subscription.endpoint !== 'string') {
          throw new Error('invalid subscription: missing endpoint');
        }
        if (!subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
          throw new Error('invalid subscription: missing encryption keys');
        }

        const existingIndex = subs.findIndex((s) => s.subscription?.endpoint === subscription.endpoint);
        if (existingIndex >= 0) {
          subs[existingIndex] = {
            ...subs[existingIndex],
            type: 'webpush',
            subscription,
            userEmail: email || subs[existingIndex].userEmail,
            deviceName: deviceName || subs[existingIndex].deviceName,
            updatedAt: now,
          };
        } else {
          const id = crypto.createHash('sha256').update(subscription.endpoint).digest('hex').slice(0, 16);
          subs.push({
            id,
            type: 'webpush',
            subscription,
            userEmail: email,
            deviceName,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      writeSubscriptions(subs);
      return { success: true, count: subs.length };
    },

    unsubscribe({ endpoint, fcmToken }) {
      if (!endpoint && !fcmToken) return { success: false };
      const subs = readSubscriptions();
      const filtered = subs.filter((s) => {
        if (endpoint && s.subscription?.endpoint === endpoint) return false;
        if (fcmToken && s.fcmToken === fcmToken) return false;
        return true;
      });
      if (filtered.length !== subs.length) {
        writeSubscriptions(filtered);
      }
      return { success: true, remaining: filtered.length };
    },

    async sendPush({
      title,
      body,
      icon = '/icons/icon-192.png?v=20261019',
      badge = '/icons/icon-192.png?v=20261019',
      url = '/',
      tag,
      tab,
      excludeEmail,
    } = {}) {
      const subs = readSubscriptions();
      if (subs.length === 0) {
        return { sent: 0, failed: 0, total: 0 };
      }

      const notifTitle = title || '🏖️ কক্সবাজার ফ্যামিলি ট্যুর ২০২৬';
      const notifBody = body || 'নতুন আপডেট এসেছে!';
      const notifTag = tag || `tour_${Date.now()}`;

      const normalizedExclude = (excludeEmail || '').toLowerCase().trim();
      const targets = subs.filter(
        (s) => !normalizedExclude || (s.userEmail || '').toLowerCase().trim() !== normalizedExclude,
      );

      let sent = 0;
      let failed = 0;
      const expiredIds = new Set();

      await Promise.all(
        targets.map(async (entry) => {
          if (entry.type === 'fcm' || entry.fcmToken) {
            if (!fcmServiceAccount) {
              console.warn('FCM push skipped: service account not configured');
              failed++;
              return;
            }
            try {
              await sendFcmMessage(fcmServiceAccount, entry.fcmToken, {
                title: notifTitle,
                body: notifBody,
                url,
                tag: notifTag,
                tab,
              });
              sent++;
            } catch (err) {
              failed++;
              if (err.unregistered) {
                expiredIds.add(entry.id);
              } else {
                console.warn(`FCM delivery error (${entry.userEmail}):`, err.message);
              }
            }
          } else if (entry.subscription) {
            const payload = JSON.stringify({
              title: notifTitle,
              body: notifBody,
              icon,
              badge,
              url,
              tag: notifTag,
              tab,
            });
            const options = {
              TTL: 86400, // 24 hours
              urgency: 'high',
            };
            try {
              await webpush.sendNotification(entry.subscription, payload, options);
              sent++;
            } catch (err) {
              failed++;
              if (err.statusCode === 404 || err.statusCode === 410) {
                expiredIds.add(entry.id);
              } else {
                console.warn(`Web push delivery error (${entry.userEmail}):`, err.statusCode || err.message);
              }
            }
          }
        }),
      );

      if (expiredIds.size > 0) {
        const remaining = subs.filter((s) => !expiredIds.has(s.id));
        try {
          writeSubscriptions(remaining);
        } catch (e) {
          console.warn('Failed to prune expired subscriptions:', e.message);
        }
      }

      return { sent, failed, total: targets.length };
    },

    async sendTest({ userEmail, endpoint, fcmToken } = {}) {
      const subs = readSubscriptions();
      const normalizedEmail = (userEmail || '').toLowerCase().trim();
      const targets = subs.filter((s) => {
        if (fcmToken) return s.fcmToken === fcmToken;
        if (endpoint) return s.subscription?.endpoint === endpoint;
        if (normalizedEmail) return (s.userEmail || '').toLowerCase().trim() === normalizedEmail;
        return true;
      });

      if (targets.length === 0) {
        return { sent: 0, failed: 0, total: 0, message: 'no subscription found for this user' };
      }

      const notifTitle = '🏖️ কক্সবাজার ফ্যামিলি ট্যুর ২০২৬';
      const notifBody = '🎉 টেস্ট সফল! আপনার ফোনে রিয়েল পুশ নোটিফিকেশন সক্রিয়ভাবে কাজ করছে।';
      const notifTag = `tour_test_${Date.now()}`;

      let sent = 0;
      let failed = 0;
      const expiredIds = new Set();

      await Promise.all(
        targets.map(async (entry) => {
          if (entry.type === 'fcm' || entry.fcmToken) {
            if (!fcmServiceAccount) {
              failed++;
              return;
            }
            try {
              await sendFcmMessage(fcmServiceAccount, entry.fcmToken, {
                title: notifTitle,
                body: notifBody,
                url: '/',
                tag: notifTag,
                tab: 'dashboard',
              });
              sent++;
            } catch (err) {
              failed++;
              if (err.unregistered) {
                expiredIds.add(entry.id);
              } else {
                console.warn(`FCM test delivery error (${entry.userEmail}):`, err.message);
              }
            }
          } else if (entry.subscription) {
            const payload = JSON.stringify({
              title: notifTitle,
              body: notifBody,
              icon: '/icons/icon-192.png?v=20261019',
              badge: '/icons/icon-192.png?v=20261019',
              url: '/',
              tag: notifTag,
            });
            try {
              await webpush.sendNotification(entry.subscription, payload, { TTL: 3600, urgency: 'high' });
              sent++;
            } catch (err) {
              failed++;
              if (err.statusCode === 404 || err.statusCode === 410) {
                expiredIds.add(entry.id);
              } else {
                console.warn('Web push test error:', err.statusCode || err.message);
              }
            }
          }
        }),
      );

      if (expiredIds.size > 0) {
        const remaining = subs.filter((s) => !expiredIds.has(s.id));
        try {
          writeSubscriptions(remaining);
        } catch {}
      }

      return { sent, failed, total: targets.length };
    },
  };
}
