import React, { useState } from 'react';
import { Megaphone, MapPin, AlertOctagon, Plus, Trash2, ShieldCheck, Navigation, X } from 'lucide-react';

export default function NoticeBoard({
  notices = [],
  meetingPoint = {},
  canDelete = false,
  onAddNotice,
  onDeleteNotice,
  onUpdateMeetingPoint
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNotice, setNewNotice] = useState({ title: '', content: '', author: '', urgent: false });
  const [isEditingMeeting, setIsEditingMeeting] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    title: meetingPoint?.title || 'হোটেল সি মুন লবি (কলাতলী)',
    note: meetingPoint?.note || 'আউটডোর ইভেন্টের আগে ও পরে সবাই এখানে একত্র হব।',
    mapUrl: meetingPoint?.mapUrl || 'https://maps.google.com/?q=Hotel+Sea+Moon+Kolatoli+Coxs+Bazar'
  });

  const handleCreateNotice = (e) => {
    e.preventDefault();
    if (!newNotice.title || !newNotice.content) return;
    onAddNotice({
      title: newNotice.title,
      content: newNotice.content,
      author: newNotice.author || 'ট্যুর লিডার',
      date: new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'long' }),
      urgent: newNotice.urgent
    });
    setNewNotice({ title: '', content: '', author: '', urgent: false });
    setShowAddModal(false);
  };

  const handleSaveMeetingPoint = (e) => {
    e.preventDefault();
    onUpdateMeetingPoint(meetingForm);
    setIsEditingMeeting(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. CURRENT MEETING POINT & MAP HUB */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-cyan-900 text-white p-5 sm:p-6 rounded-3xl shadow-lg border border-teal-700 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="px-2.5 py-0.5 bg-amber-400 text-teal-950 text-xs font-bold rounded-full inline-block mb-1">
              লাইভ মিটিং পয়েন্ট
            </span>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <MapPin size={22} className="text-amber-300" /> {meetingPoint?.title || 'হোটেল সি মুন লবি (কলাতলী)'}
            </h3>
            <p className="text-xs text-teal-100 mt-0.5">
              {meetingPoint?.note || 'সকল ভ্রমণের আগে ও পরে সবাই নির্ধারিত সময়ে এখানে সমবেত হব।'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={meetingPoint?.mapUrl || 'https://maps.google.com/?q=Hotel+Sea+Moon+Kolatoli+Coxs+Bazar'}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-teal-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition"
            >
              <Navigation size={15} /> গুগল ম্যাপসে ডিরেকশন
            </a>
            <button
              onClick={() => setIsEditingMeeting(!isEditingMeeting)}
              className="px-3 py-2 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              মিটিং স্পট পরিবর্তন
            </button>
          </div>
        </div>

        {/* Inline Edit Form for Meeting Point */}
        {isEditingMeeting && (
          <form onSubmit={handleSaveMeetingPoint} className="pt-3 border-t border-teal-700/60 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-teal-200 block mb-1" htmlFor="noticeboard-field-1">মিটিং স্পটের নাম</label>
              <input id="noticeboard-field-1"
                type="text"
                value={meetingForm.title}
                onChange={e => setMeetingForm({ ...meetingForm, title: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white text-slate-800 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-teal-200 block mb-1" htmlFor="noticeboard-field-2">বিশেষ নির্দেশনা / সময়</label>
              <input id="noticeboard-field-2"
                type="text"
                value={meetingForm.note}
                onChange={e => setMeetingForm({ ...meetingForm, note: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white text-slate-800 rounded-xl outline-none"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                আপডেট সেভ করুন
              </button>
              <button
                type="button"
                onClick={() => setIsEditingMeeting(false)}
                className="px-3 py-2 bg-white/20 text-white text-xs rounded-xl cursor-pointer"
              >
                বাতিল
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 2. FAMILY TOUR NOTICEBOARD */}
      <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-100 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
              <Megaphone size={18} className="text-teal-700" /> ফ্যামিলি ট্যুর নোটিশবোর্ড ও ঘোষণা
            </h3>
            <p className="text-xs text-slate-500">ট্যুর লিডার ও সদস্যদের জরুরি নোটিশ</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Plus size={15} /> নতুন নোটিশ দিন
          </button>
        </div>

        {/* Notices Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notices.map(notice => (
            <div
              key={notice.id}
              className={`p-4 rounded-2xl border transition flex flex-col justify-between space-y-3 ${
                notice.urgent
                  ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {notice.urgent && (
                      <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-extrabold rounded-md animate-pulse">
                        জরুরি ঘোষণা
                      </span>
                    )}
                    <span className="text-[11px] text-slate-500">{notice.date}</span>
                  </div>
                  {canDelete && onDeleteNotice && (
                    <button
                      onClick={() => onDeleteNotice(notice.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                      title="নোটিশ মুছুন"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <h4 className="font-bold text-sm text-slate-900">{notice.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{notice.content}</p>
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                <span>পোস্ট করেছেন: <strong className="text-teal-800 font-semibold">{notice.author || 'ট্যুর লিডার'}</strong></span>
                <span className="text-teal-700 flex items-center gap-1"><ShieldCheck size={12} /> ভেরিফাইড</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. EMERGENCY SOS LOST & FOUND ASSISTANCE */}
      <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-amber-950 text-white p-5 rounded-3xl shadow-lg border border-rose-700 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base flex items-center gap-2 text-white">
            <AlertOctagon size={20} className="text-amber-300 animate-bounce" /> হারিয়ে গেলে বা বিচ্ছিন্ন হলে জরুরি SOS নির্দেশিকা
          </h3>
          <span className="text-xs bg-rose-950/60 px-2.5 py-1 rounded-full text-rose-200 font-semibold border border-rose-600">
            সেফটি হেল্প
          </span>
        </div>
        <p className="text-xs text-rose-100 leading-relaxed">
          লাবণী বা সুগন্ধা বিচের ভিড়ে পরিবারের কোনো সদস্য বা বাচ্চা যদি আলাদা হয়ে যায়, অবিলম্বে নিচের ধাপগুলো অনুসরণ করুন:
        </p>
        <ul className="text-xs text-rose-200 space-y-1 list-disc list-inside">
          <li>নিকটস্থ ট্যুরিস্ট পুলিশ বুথে গিয়ে জানান এবং <strong>হোটেল সি মুন (কলাতলী)</strong>-এর ঠিকানা দিন।</li>
          <li>ট্যুর লিডার বা কোঅর্ডিনেটরকে সরাসরি কল করুন (নম্বর আছে সদস্য তালিকায়), অথবা ট্যুরিস্ট পুলিশ <strong>০১৩২০-১৬০০০১</strong>-এ কল দিন।</li>
          <li>বিচের লাইফগার্ড মাইকে তাৎক্ষণিক নাম ও বিবরণ ঘোষণার জন্য অনুরোধ করুন।</li>
        </ul>
      </div>

      {/* New Notice Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Megaphone size={18} className="text-teal-700" /> নতুন নোটিশ বা ঘোষণা লিখুন
              </h4>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleCreateNotice} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1" htmlFor="noticeboard-field-3">নোটিশের শিরোনাম</label>
                <input id="noticeboard-field-3"
                  type="text"
                  placeholder="যেমন: কাল সকালের নাস্তা ও মহেশখালী যাত্রা..."
                  value={newNotice.title}
                  onChange={e => setNewNotice({ ...newNotice, title: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-teal-600"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1" htmlFor="noticeboard-field-4">ঘোষণার বিস্তারিত তথ্য</label>
                <textarea id="noticeboard-field-4"
                  rows={3}
                  placeholder="যেমন: সকাল ৮টায় সবাই নাস্তা শেষ করে লবিতে চলে আসবেন..."
                  value={newNotice.content}
                  onChange={e => setNewNotice({ ...newNotice, content: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-teal-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1" htmlFor="noticeboard-field-5">ঘোষক / নাম</label>
                  <input id="noticeboard-field-5"
                    type="text"
                    placeholder="যেমন: রাজু ভাই / মাসুদ ভাই"
                    value={newNotice.author}
                    onChange={e => setNewNotice({ ...newNotice, author: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-teal-600"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-xs font-semibold text-rose-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newNotice.urgent}
                      onChange={e => setNewNotice({ ...newNotice, urgent: e.target.checked })}
                      className="w-4 h-4 text-rose-600 rounded"
                    />
                    জরুরি নোটিশ হিসেবে মার্ক করুন
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  নোটিশ পোস্ট করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
