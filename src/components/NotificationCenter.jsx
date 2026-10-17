import React, { useState } from 'react';
import {
  Bell,
  BellRing,
  Check,
  Sparkles,
  MessageCircle,
  Image as ImageIcon,
  Wallet,
  AlertCircle,
  ChevronRight,
  Volume2,
} from 'lucide-react';
import {
  requestNotificationPermission,
  getNotificationPermission,
  sendPushNotification,
  playNotificationSound
} from '../services/notificationService';

export default function NotificationCenter({
  activities = [],
  onNavigate,
  activeToast,
  onDismissToast
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [permission, setPermission] = useState(() => getNotificationPermission());
  // Calculate unread items
  const unreadCount = activities.filter(a => !a.read).length;

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    if (res === 'granted') {
      sendPushNotification({
        title: '🎉 নোটিফিকেশন সক্রিয় হয়েছে!',
        body: 'এখন থেকে নতুন নোটিশ, ফটো, চ্যাট ও খরচের আপডেট সরাসরি নোটিফিকেশনে পাবেন।',
        onClick: () => window.focus()
      });
    }
  };

  const handleTestNotification = () => {
    sendPushNotification({
      title: '🏖️ কক্সবাজার ফ্যামিলি ট্যুর ২০২৬',
      body: 'টেস্ট নোটিফিকেশন সফল! নতুন কোনো অ্যাক্টিভিটি হলে এভাবে তাৎক্ষণিক নোটিফিকেশন আসবে।',
      onClick: () => {
        window.focus();
        onNavigate('feed');
      }
    });
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
      default:
        return <Sparkles size={15} className="text-teal-400 shrink-0" />;
    }
  };

  return (
    <div className="relative">
      {/* HEADER BELL BUTTON */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setUnreadCount(0);
        }}
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
          <div className="fixed inset-0 z-40"role="presentation"
 onClick={() => setIsOpen(false)}
onKeyDown={(e) => { if (e.key === 'Escape') e.currentTarget.click(); }} />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-3.5 bg-gradient-to-r from-teal-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-amber-300" />
                <h4 className="font-bold text-xs sm:text-sm">ট্যুর নোটিফিকেশন সেন্টার</h4>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

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
                  onClick={handleRequestPermission}
                  className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-teal-950 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  🔔 নোটিফিকেশন সক্রিয় করুন
                </button>
              </div>
            ) : (
              <div className="px-3 py-1.5 bg-emerald-50 border-b border-emerald-100 text-emerald-800 text-[11px] font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Check size={12} className="text-emerald-600" /> পুশ নোটিফিকেশন সক্রিয়
                </span>
                <button
                  onClick={handleTestNotification}
                  className="text-[10px] text-teal-700 hover:underline cursor-pointer font-bold"
                >
                  টেস্ট করুন
                </button>
              </div>
            )}

            {/* Activities List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {activities.length > 0 ? (
                activities.slice(0, 10).map((act, idx) => (
                  <div
                    key={act.id || idx}
                   role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }}  onClick={() => {
                      if (act.tab) onNavigate(act.tab);
                      setIsOpen(false);
                    }}
                    className="p-3 hover:bg-slate-50 transition cursor-pointer flex items-start gap-2.5"
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                      {getActivityIcon(act.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{act.title}</p>
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-tight">{act.body}</p>
                      <span className="text-[9px] text-slate-400 mt-0.5 block">{act.time || 'এইমাত্র'}</span>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 shrink-0 self-center" />
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-slate-400 text-xs">
                  <p>এখনো কোনো নতুন নোটিফিকেশন নেই</p>
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

      {/* IN-APP FLOATING TOAST BANNER (Slides down at top of the screen on new activity) */}
      {activeToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md animate-in slide-in-from-top duration-300">
          <div
           role="button" tabIndex={0} aria-label={activeToast.title} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }}  onClick={() => {
              if (activeToast.tab) onNavigate(activeToast.tab);
              onDismissToast();
            }}
            className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl border border-teal-500/50 flex items-center justify-between gap-3 cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-amber-300 flex items-center justify-center shrink-0">
                {getActivityIcon(activeToast.type)}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs text-white truncate">{activeToast.title}</p>
                <p className="text-[11px] text-teal-100 truncate">{activeToast.body}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2 py-0.5 bg-amber-400 text-teal-950 text-[10px] font-bold rounded-lg">
                দেখুন
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismissToast();
                }}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs"
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
