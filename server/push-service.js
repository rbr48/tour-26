import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import webpush from 'web-push';

const DEFAULT_SUBJECT = 'mailto:tour2026@izhaanintellect.fun';

export function createPushService({ dataDir, vapidKeys: initialVapidKeys, subject = DEFAULT_SUBJECT } = {}) {
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

    subscribe({ subscription, userEmail, deviceName = 'Browser' }) {
      if (!subscription || typeof subscription.endpoint !== 'string') {
        throw new Error('invalid subscription: missing endpoint');
      }
      if (!subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
        throw new Error('invalid subscription: missing encryption keys');
      }

      const subs = readSubscriptions();
      const existingIndex = subs.findIndex((s) => s.subscription?.endpoint === subscription.endpoint);
      const now = new Date().toISOString();

      if (existingIndex >= 0) {
        subs[existingIndex] = {
          ...subs[existingIndex],
          subscription,
          userEmail: (userEmail || subs[existingIndex].userEmail || '').toLowerCase(),
          deviceName: deviceName || subs[existingIndex].deviceName,
          updatedAt: now,
        };
      } else {
        const id = crypto.createHash('sha256').update(subscription.endpoint).digest('hex').slice(0, 16);
        subs.push({
          id,
          subscription,
          userEmail: (userEmail || '').toLowerCase(),
          deviceName,
          createdAt: now,
          updatedAt: now,
        });
      }

      writeSubscriptions(subs);
      return { success: true, count: subs.length };
    },

    unsubscribe({ endpoint }) {
      if (!endpoint) return { success: false };
      const subs = readSubscriptions();
      const filtered = subs.filter((s) => s.subscription?.endpoint !== endpoint);
      if (filtered.length !== subs.length) {
        writeSubscriptions(filtered);
      }
      return { success: true, remaining: filtered.length };
    },

    async sendPush({ title, body, icon = '/icon-192.png', badge = '/icon-192.png', url = '/', tag, excludeEmail } = {}) {
      const subs = readSubscriptions();
      if (subs.length === 0) {
        return { sent: 0, failed: 0, total: 0 };
      }

      const payload = JSON.stringify({
        title: title || '🏖️ কক্সবাজার ফ্যামিলি ট্যুর ২০২৬',
        body: body || 'নতুন আপডেট এসেছে!',
        icon,
        badge,
        url,
        tag: tag || `tour_${Date.now()}`,
      });

      const options = {
        TTL: 86400, // 24 hours
        urgency: 'high',
      };

      const normalizedExclude = (excludeEmail || '').toLowerCase();
      const targets = subs.filter((s) => !normalizedExclude || s.userEmail !== normalizedExclude);

      let sent = 0;
      let failed = 0;
      const expiredEndpoints = new Set();

      await Promise.all(
        targets.map(async (entry) => {
          try {
            await webpush.sendNotification(entry.subscription, payload, options);
            sent++;
          } catch (err) {
            failed++;
            if (err.statusCode === 404 || err.statusCode === 410) {
              // The subscription is expired or unsubscribed
              expiredEndpoints.add(entry.subscription.endpoint);
            } else {
              console.warn(`Web push delivery error (${entry.userEmail}):`, err.statusCode || err.message);
            }
          }
        }),
      );

      if (expiredEndpoints.size > 0) {
        const remaining = subs.filter((s) => !expiredEndpoints.has(s.subscription?.endpoint));
        try {
          writeSubscriptions(remaining);
        } catch (e) {
          console.warn('Failed to prune expired subscriptions:', e.message);
        }
      }

      return { sent, failed, total: targets.length };
    },

    async sendTest({ userEmail, endpoint } = {}) {
      const subs = readSubscriptions();
      const normalizedEmail = (userEmail || '').toLowerCase();
      const targets = subs.filter((s) => {
        if (endpoint) return s.subscription?.endpoint === endpoint;
        if (normalizedEmail) return s.userEmail === normalizedEmail;
        return true;
      });

      if (targets.length === 0) {
        return { sent: 0, failed: 0, total: 0, message: 'no subscription found' };
      }

      const payload = JSON.stringify({
        title: '🏖️ কক্সবাজার ফ্যামিলি ট্যুর ২০২৬',
        body: '🎉 টেস্ট সফল! আপনার ফোনে রিয়েল পুশ নোটিফিকেশন সক্রিয়ভাবে কাজ করছে।',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        url: '/',
        tag: `tour_test_${Date.now()}`,
      });

      let sent = 0;
      let failed = 0;
      const expired = new Set();

      await Promise.all(
        targets.map(async (entry) => {
          try {
            await webpush.sendNotification(entry.subscription, payload, { TTL: 3600, urgency: 'high' });
            sent++;
          } catch (err) {
            failed++;
            if (err.statusCode === 404 || err.statusCode === 410) {
              expired.add(entry.subscription.endpoint);
            } else {
              console.warn('Web push test error:', err.statusCode || err.message);
            }
          }
        }),
      );

      if (expired.size > 0) {
        const remaining = subs.filter((s) => !expired.has(s.subscription?.endpoint));
        try {
          writeSubscriptions(remaining);
        } catch {}
      }

      return { sent, failed, total: targets.length };
    },
  };
}
