import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import webpush from 'web-push';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPushService } from './push-service.js';

describe('pushService', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'push-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('generates vapid keys and returns public key', () => {
    const service = createPushService({ dataDir: tmpDir });
    const key = service.getPublicKey();
    expect(typeof key).toBe('string');
    expect(key.length).toBeGreaterThan(30);

    const vapidFile = path.join(tmpDir, 'vapid.json');
    expect(fs.existsSync(vapidFile)).toBe(true);
  });

  it('manages subscriptions and prunes expired ones', async () => {
    const service = createPushService({ dataDir: tmpDir });
    const dummySub1 = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/device1',
      keys: { p256dh: 'p256key1', auth: 'authkey1' },
    };
    const dummySub2 = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/device2',
      keys: { p256dh: 'p256key2', auth: 'authkey2' },
    };

    service.subscribe({ subscription: dummySub1, userEmail: 'user1@example.com', deviceName: 'Phone 1' });
    service.subscribe({ subscription: dummySub2, userEmail: 'user2@example.com', deviceName: 'Phone 2' });

    expect(service.listSubscriptions()).toHaveLength(2);

    // Mock webpush.sendNotification
    const sendSpy = vi.spyOn(webpush, 'sendNotification').mockImplementation(async (sub) => {
      if (sub.endpoint.includes('device2')) {
        const err = new Error('Gone');
        err.statusCode = 410;
        throw err;
      }
      return { statusCode: 201 };
    });

    const res = await service.sendPush({
      title: 'নতুন নোটিশ',
      body: 'টেস্ট মেসেজ',
      excludeEmail: 'user3@example.com',
    });

    expect(res.sent).toBe(1);
    expect(res.failed).toBe(1);
    expect(res.total).toBe(2);

    // device2 should have been pruned
    const remaining = service.listSubscriptions();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].subscription.endpoint).toBe(dummySub1.endpoint);

    sendSpy.mockRestore();
  });

  it('excludes the sender when excludeEmail is provided', async () => {
    const service = createPushService({ dataDir: tmpDir });
    const dummySub = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/device_alice',
      keys: { p256dh: 'key', auth: 'auth' },
    };
    service.subscribe({ subscription: dummySub, userEmail: 'alice@example.com' });

    const sendSpy = vi.spyOn(webpush, 'sendNotification').mockResolvedValue({ statusCode: 201 });

    const res = await service.sendPush({
      title: 'নোটিশ',
      body: 'হ্যালো',
      excludeEmail: 'alice@example.com',
    });

    expect(res.total).toBe(0);
    expect(sendSpy).not.toHaveBeenCalled();

    sendSpy.mockRestore();
  });
});
