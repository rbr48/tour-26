import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Trash2,
  Sparkles,
  MessageCircle,
  Image as ImageIcon,
  Wallet,
  AlertCircle,
  ChevronRight,
  Volume2,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import {
  requestNotificationPermission,
  getNotificationPermission,
  subscribeToPushNotifications,
  sendBroadcastPush,
  sendTestPush,
  sendPushNotification,
  playNotificationSound,
} from '../services/notificationService';
import { useBackHandler } from '../utils/backNavigation';

export default function NotificationCenter({
  activities = [],
  onNavigate,
  activeToast,
  onDismissToast,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearActivity,
  onClearAllActivities,
}) {
  const [isOpen, setIsOpen] = useState(false);
  useBackHandler(isOpen, () => setIsOpen(false), 20);
  const [permission, setPermission] = useState('default');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let active = true;
    getNotificationPermission().then((perm) => {
      if (active) setPermission(perm || 'default');
    });
    return () => {
      active = false;
    };
  }, []);

  // Auto-dismiss active toast after 4 seconds
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      if (onDismissToast) onDismissToast();
    }, 4000);
    return () => clearTimeout(timer);
  }, [activeToast?.id]);

  // Unread count
  const unreadCount = activities.filter((a) => !a.read).length;

  const handleRequestPermission = async () => {
    setIsSubscribing(true);
    setFeedback(null);
    try {
      const res = await subscribeToPushNotifications();
      const currentPerm = await getNotificationPermission();
      setPermission(currentPerm || 'default');
      if (res.success) {
        setFeedback({ type: 'success', text: '✅ পুশ নোটিফিকেশন সফলভাবে সক্রিয় হয়েছে!' });
        sendPushNotification({
          title: '🎉 নোটিফিকেশন সক্রিয় হয়েছে!',
          body: 'এখন থেকে নতুন নোটিশ, ফটো, চ্যাট ও খরচের রিয়েল পুশ সরাসরি আপনার ফোনে পাবেন।',
          onClick: () => window.focus(),
        });
      } else {
        setFeedback({ type: 'error', text: res.error || 'নোটিফিকেশন চালু করা যায়নি' });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleTestNotification = async () => {
    setFeedback({ type: 'info', text: '📡 টেস্ট নোটিফিকেশন পাঠানো হচ্ছে...' });
    playNotificationSound();
    try {
      if (Capacitor.isNativePlatform()) {
        sendPushNotification({
          title: '🏖️ কক্সবাজার ফ্যামিলি ট্যুর ২০২৬',
          body: 'টেস্ট নোটিফিকেশন সফল! নতুন কোনো অ্যাক্টিভিটি হলে আপনার ফোনের নোটিফিকেশন বারে এভাবে অ্যালার্ট আসবে।',
          tab: 'feed',
          onClick: () => {
            if (onNavigate) onNavigate('feed');
          },
        });
        setFeedback({ type: 'success', text: '🔔 টেস্ট সফল! ফোনের স্ট্যাটাস বার চেক করুন।' });
        return;
      }
      const res = await sendTestPush();
      if (res.success) {
        setFeedback({ type: 'success', text: '🔔 টেস্ট সফল! ফোনের স্ট্যাটাস বার চেক করুন।' });
      } else {
        sendPushNotification({
          title: '🏖️ কক্সবাজার ফ্যামিলি ট্যুর ২০২৬',
          body: 'টেস্ট নোটিফিকেশন সফল! নতুন কোনো অ্যাক্টিভিটি হলে এভাবে তাৎক্ষণিক নোটিফিকেশন আসবে।',
          tab: 'feed',
          onClick: () => {
            window.focus();
            if (onNavigate) onNavigate('feed');
          },
        });
        setFeedback({ type: 'info', text: res.error ? `সার্ভার: ${res.error}` : 'লোকাল টেস্ট সম্পন্ন হয়েছে।' });
      }
    } catch {
      sendPushNotification({
        title: '🏖️ কক্সবাজার ফ্যামিলি ট্যুর ২০২৬',
        body: 'টেস্ট সম্পন্ন!',
      });
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'notice':
        return <AlertCircle size={15} className="text-amber-500 shrink-0" />;
      case 'feed':
        return <ImageIcon size={15} className="text-pink-500 shrink-0" />;
      case 'discussion':
        return <MessageCircle size={15} className="text-indigo-400 shrink-0" />;
      case 'expense':
        return <Wallet size={15} className="text-emerald-500 shrink-0" />;
      case 'success':
        return <CheckCheck size={16} className="text-emerald-400 shrink-0" />;
      default:
        return <Sparkles size={15} className="text-teal-400 shrink-0" />;
    }
  };

  return (
    <div className="relative">
      {/* HEADER BELL BUTTON */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer active:scale-95"
        title="নোটিফিকেশন ও অ্যাক্টিভিটি"
        aria-label="Notifications"
      >
        {permission === 'granted' ? <BellRing size={18} /> : <Bell size={18} />}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center animate-bounce shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* NOTIFICATION DROPDOWN MODAL / POPUP */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            role="presentation"
            onClick={() => setIsOpen(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') e.currentTarget.click();
            }}
          />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-3.5 bg-gradient-to-r from-teal-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-amber-300" />
                <h4 className="font-bold text-xs sm:text-sm">ট্যুর নোটিফিকেশন সেন্টার</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Feedback Message */}
            {feedback && (
              <div
                className={`p-2.5 text-xs border-b ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : feedback.type === 'error'
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-blue-50 text-blue-800 border-blue-200'
                }`}
              >
                {feedback.text}
              </div>
            )}

            {/* Permission Banner */}
            {permission !== 'granted' ? (
              <div className="p-3 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <Sparkles size={14} className="text-amber-600 shrink-0" />
                  <span>ডিভাইস পুশ নোটিফিকেশন চালু নেই</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  নতুন নোটিশ, ইনস্টাফিড ছবি বা চ্যাটের মেসেজ রিয়েল-টাইমে পেতে পুশ নোটিফিকেশন চালু করুন।
                </p>
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  disabled={isSubscribing}
                  className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-teal-950 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  {isSubscribing ? '⏳ চালু করা হচ্ছে...' : '🔔 নোটিফিকেশন সক্রিয় করুন'}
                </button>
              </div>
            ) : (
              <div className="px-3 py-1.5 bg-emerald-50 border-b border-emerald-100 text-emerald-800 text-[11px] font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Check size={12} className="text-emerald-600" /> পুশ নোটিফিকেশন সক্রিয়
                </span>
                <button
                  type="button"
                  onClick={handleTestNotification}
                  className="text-[10px] text-teal-700 hover:underline cursor-pointer font-bold"
                >
                  টেস্ট নোটিফিকেশন পাঠান
                </button>
              </div>
            )}

            {/* Action Toolbar (Mark all read & Clear all) */}
            {activities.length > 0 && (
              <div className="px-3.5 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                  <span>হিস্ট্রি ({activities.length})</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-teal-100 text-teal-800 font-bold rounded-full text-[10px]">
                      {unreadCount} নতুন
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  {unreadCount > 0 && onMarkAllAsRead && (
                    <button
                      type="button"
                      onClick={onMarkAllAsRead}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900 transition cursor-pointer"
                      title="সকল নোটিফিকেশন পঠিত হিসেবে চিহ্নিত করুন"
                    >
                      <CheckCheck size={13} /> সব পঠিত
                    </button>
                  )}
                  {onClearAllActivities && (
                    <button
                      type="button"
                      onClick={onClearAllActivities}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 transition cursor-pointer"
                      title="সকল নোটিফিকেশন মুছে ফেলুন"
                    >
                      <Trash2 size={12} /> সব মুছুন
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Activities List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {activities.length > 0 ? (
                activities.slice(0, 15).map((act, idx) => {
                  const isUnread = !act.read;
                  return (
                    <div
                      key={act.id || idx}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.currentTarget.click();
                        }
                      }}
                      onClick={() => {
                        if (onMarkAsRead) onMarkAsRead(act.id);
                        if (act.tab) onNavigate(act.tab);
                        setIsOpen(false);
                      }}
                      className={`p-3 transition cursor-pointer flex items-start gap-2.5 group relative ${
                        isUnread ? 'bg-teal-50/50 hover:bg-teal-50/90' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 shadow-2xs flex items-center justify-center shrink-0 mt-0.5">
                        {getActivityIcon(act.type)}
                      </div>

                      <div className="flex-1 min-w-0 pr-1">
                        <div className="flex items-center gap-1.5">
                          <p className={`text-xs truncate ${isUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                            {act.title}
                          </p>
                          {isUnread && (
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0" title="অপঠিত" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-2 leading-tight mt-0.5">{act.body}</p>
                        <span className="text-[9px] text-slate-400 mt-0.5 block">{act.time || 'এইমাত্র'}</span>
                      </div>

                      {/* Action buttons (Mark read & Delete) */}
                      <div className="flex items-center gap-1 shrink-0 self-center">
                        {isUnread && onMarkAsRead && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMarkAsRead(act.id);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-teal-700 hover:bg-slate-200/60 transition cursor-pointer"
                            title="পঠিত হিসেবে চিহ্নিত করুন"
                            aria-label="Mark as read"
                          >
                            <Check size={13} />
                          </button>
                        )}
                        {onClearActivity && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onClearActivity(act.id);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="এই নোটিফিকেশনটি মুছুন"
                            aria-label="Delete notification"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                        <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition" />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs space-y-1">
                  <Sparkles size={20} className="mx-auto text-slate-300 mb-1" />
                  <p className="font-semibold text-slate-500">কোনো নোটিফিকেশন নেই</p>
                  <p className="text-[11px] text-slate-400">নতুন আপডেট এলে এখানে দেখা যাবে</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
              <button
                type="button"
                onClick={() => {
                  playNotificationSound();
                  handleTestNotification();
                }}
                className="text-xs text-teal-700 hover:text-teal-900 font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Volume2 size={13} /> নোটিফিকেশন সাউন্ড টেস্ট করুন
              </button>
            </div>
          </div>
        </>
      )}

      {/* IN-APP FLOATING TOAST BANNER */}
      {activeToast && (
        <div className="fixed top-[calc(max(0.75rem,env(safe-area-inset-top))+4.25rem)] left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md animate-in slide-in-from-top duration-300 pointer-events-auto shadow-2xl">
          <div
            role="button"
            tabIndex={0}
            aria-label={activeToast.title}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.currentTarget.click();
              }
            }}
            onClick={() => {
              if (onMarkAsRead) onMarkAsRead(activeToast.id);
              if (activeToast.tab) onNavigate(activeToast.tab);
              onDismissToast();
            }}
            className="bg-slate-900/95 backdrop-blur-md text-white p-3 sm:p-3.5 rounded-2xl shadow-2xl border border-teal-500/50 flex items-center justify-between gap-3 cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                {getActivityIcon(activeToast.type)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-xs text-white leading-snug">{activeToast.title}</p>
                <p className="text-[11px] text-teal-100 line-clamp-2 leading-relaxed mt-0.5">{activeToast.body}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {activeToast.tab && activeToast.type !== 'success' && (
                <span className="px-2.5 py-1 bg-amber-400 text-teal-950 text-[10px] font-black rounded-lg shadow-xs">
                  দেখুন
                </span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismissToast();
                }}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs transition cursor-pointer"
                title="বন্ধ করুন"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
