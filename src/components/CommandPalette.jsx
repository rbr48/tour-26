import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Terminal, PhoneCall, Wallet, Bus, Hotel,
  Waves, Split, Printer, AlertOctagon, Calendar, CheckSquare,
  ArrowRight, Users, ShieldAlert, Sparkles, MapPin, X,
  Camera, MessageSquare, User, HardDrive
} from 'lucide-react';

export default function CommandPalette({
  isOpen,
  onClose,
  members = [],
  onSelectTab,
  onOpenExpenseModal,
  onOpenPrintModal,
  onOpenProfileModal,
  onTriggerSOS
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Global Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onClose(prev => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        onClose(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Static action commands
  const commands = [
    {
      id: 'cmd-expense',
      title: 'নতুন খরচ যোগ করুন',
      shortcut: '/expense',
      icon: Wallet,
      color: 'text-emerald-600 bg-emerald-50',
      action: () => {
        onClose(false);
        onOpenExpenseModal();
      }
    },
    {
      id: 'cmd-split',
      title: 'স্মার্ট স্প্লিটওয়াইজ ও হিসাব সেটেলমেন্ট',
      shortcut: '/split',
      icon: Split,
      color: 'text-indigo-600 bg-indigo-50',
      action: () => {
        onClose(false);
        onSelectTab('expenses');
      }
    },
    {
      id: 'cmd-seats',
      title: 'এভারগ্রীন এসি বাসের সিট ম্যাপ',
      shortcut: '/seats',
      icon: Bus,
      color: 'text-amber-600 bg-amber-50',
      action: () => {
        onClose(false);
        onSelectTab('seats_rooms');
      }
    },
    {
      id: 'cmd-rooms',
      title: 'হোটেল সি মুন ১০টি রুমের ফ্লোর প্ল্যান',
      shortcut: '/rooms',
      icon: Hotel,
      color: 'text-cyan-600 bg-cyan-50',
      action: () => {
        onClose(false);
        onSelectTab('seats_rooms');
      }
    },
    {
      id: 'cmd-tide',
      title: 'কক্সবাজার জোয়ার-ভাটা সূচি ও সূর্যাস্ত টাইমার',
      shortcut: '/tide',
      icon: Waves,
      color: 'text-blue-600 bg-blue-50',
      action: () => {
        onClose(false);
        onSelectTab('dashboard');
      }
    },
    {
      id: 'cmd-itinerary',
      title: '৫ দিনের ভ্রমণ সূচি ও অফিশিয়াল চার্ট',
      shortcut: '/plan',
      icon: Calendar,
      color: 'text-teal-600 bg-teal-50',
      action: () => {
        onClose(false);
        onSelectTab('itinerary');
      }
    },
    {
      id: 'cmd-checklist',
      title: 'প্যাকিং ও ডকুমেন্ট চেকলিস্ট',
      shortcut: '/checklist',
      icon: CheckSquare,
      color: 'text-purple-600 bg-purple-50',
      action: () => {
        onClose(false);
        onSelectTab('checklist');
      }
    },
    {
      id: 'cmd-notices',
      title: 'ট্যুর নোটিশবোর্ড ও ফ্যামিলি মিটিং পয়েন্ট',
      shortcut: '/notices',
      icon: MapPin,
      color: 'text-orange-600 bg-orange-50',
      action: () => {
        onClose(false);
        onSelectTab('notices');
      }
    },
    {
      id: 'cmd-print',
      title: 'সম্পূর্ণ ট্যুর হিসাব শিট প্রিন্ট ও PDF',
      shortcut: '/print',
      icon: Printer,
      color: 'text-slate-700 bg-slate-100',
      action: () => {
        onClose(false);
        onOpenPrintModal();
      }
    },
    {
      id: 'cmd-feed',
      title: 'ইনস্টাফিড ও ট্যুর ফটো মেমোয়ার্স',
      shortcut: '/feed',
      icon: Camera,
      color: 'text-pink-600 bg-pink-50',
      action: () => {
        onClose(false);
        onSelectTab('feed');
      }
    },
    {
      id: 'cmd-chat',
      title: 'ফ্যামিলি ডিসকর্ড ও ডিসকাশন চ্যানেল',
      shortcut: '/chat',
      icon: MessageSquare,
      color: 'text-indigo-600 bg-indigo-50',
      action: () => {
        onClose(false);
        onSelectTab('discussions');
      }
    },
    {
      id: 'cmd-profile',
      title: 'আমার ট্যুর প্রোফাইল ও নিরাপত্তা ডেটা',
      shortcut: '/profile',
      icon: User,
      color: 'text-teal-600 bg-teal-50',
      action: () => {
        onClose(false);
        if (onOpenProfileModal) onOpenProfileModal();
      }
    },
    {
      id: 'cmd-drive',
      title: 'গুগল ড্রাইভ মিডিয়া ব্যাকআপ ফোল্ডার',
      shortcut: '/drive',
      icon: HardDrive,
      color: 'text-emerald-600 bg-emerald-50',
      action: () => {
        onClose(false);
        window.open('https://drive.google.com/drive/folders/1G_g7cTkA489hbL9dsF6LU5tdfX3E54vM?usp=sharing', '_blank');
      }
    },
    {
      id: 'cmd-sos',
      title: 'জরুরি পুলিশ ও এসওএস (SOS) সহায়তা',
      shortcut: '/sos',
      icon: AlertOctagon,
      color: 'text-rose-600 bg-rose-50',
      action: () => {
        onClose(false);
        onTriggerSOS();
      }
    }
  ];

  // Filter commands by query
  const filteredCommands = commands.filter(c =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.shortcut.toLowerCase().includes(query.toLowerCase())
  );

  // Filter members by query (name, seat, room, phone)
  const filteredMembers = query.trim() ? members.filter(m =>
    m.name.toLowerCase().includes(query.toLowerCase()) ||
    (m.seat && m.seat.toLowerCase().includes(query.toLowerCase())) ||
    (m.room && m.room.toLowerCase().includes(query.toLowerCase())) ||
    (m.phone && m.phone.includes(query))
  ) : [];

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-start justify-center p-4 pt-16 sm:pt-24 z-50 animate-in fade-in duration-150 cursor-pointer"
      onClick={() => onClose(false)}
    >
      <div
        className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150 cursor-auto flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
          <Search size={20} className="text-teal-700 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="কমান্ড খুঁজুন বা সদস্যের নাম লিখুন... (যেমন: /expense, /split, রাজু ভাই, সিট)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 text-sm bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 font-medium"
          />
          <span className="hidden sm:inline-block text-[10px] bg-slate-200/80 text-slate-600 px-2 py-0.5 rounded-md font-mono">
            ESC বন্ধ করতে
          </span>
          <button
            onClick={() => onClose(false)}
            className="w-7 h-7 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Scrollable Results */}
        <div className="overflow-y-auto p-3 space-y-4 flex-1">
          {/* Members match results if any */}
          {filteredMembers.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
                সদস্য তালিকা ({filteredMembers.length})
              </p>
              <div className="space-y-1">
                {filteredMembers.map(m => (
                  <div
                    key={m.id}
                    className="p-3 bg-slate-50 hover:bg-teal-50/80 rounded-2xl border border-slate-100 flex items-center justify-between gap-3 transition"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{m.name}</h4>
                      <p className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-medium">সিট: {m.seat}</span>
                        <span className="bg-teal-100 text-teal-900 px-1.5 py-0.2 rounded font-medium">রুম: {m.room}</span>
                      </p>
                    </div>
                    {m.phone && m.phone !== '01700000000' ? (
                      <a
                        href={`tel:${m.phone}`}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs transition"
                      >
                        <PhoneCall size={12} /> কল
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400">জমা: ৳{m.deposit?.toLocaleString()}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Action Commands */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
              কুইক কমান্ড ও নেভিগেশন
            </p>
            <div className="grid grid-cols-1 gap-1">
              {filteredCommands.map(cmd => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.id}
                    onClick={cmd.action}
                    className="w-full p-2.5 hover:bg-teal-50 rounded-2xl flex items-center justify-between text-left transition group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${cmd.color}`}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 group-hover:text-teal-900">
                          {cmd.title}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono bg-slate-100 group-hover:bg-teal-100 text-slate-600 group-hover:text-teal-900 px-2 py-0.5 rounded-lg font-medium">
                        {cmd.shortcut}
                      </span>
                      <ArrowRight size={14} className="text-slate-300 group-hover:text-teal-700 transition transform group-hover:translate-x-0.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <Sparkles size={13} className="text-amber-500" /> যেকোনো স্থান থেকে <kbd className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 font-mono">Ctrl+K</kbd> চাপুন
          </span>
          <span className="font-medium text-teal-800">ফ্যামিলি ট্যুর ২০২৬</span>
        </div>
      </div>
    </div>
  );
}
