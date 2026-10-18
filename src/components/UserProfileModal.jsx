import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Phone,
  Save,
  X,
  Camera,
  Bus,
  Hotel,
  Sparkles,
  CheckCircle2,
  HardDrive,
  Trash2,
  ExternalLink,
  RefreshCw,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { compressImageFile } from '../utils/imageCompressor';
import { findLinkedMember } from '../utils/members';
import { useBackHandler } from '../utils/backNavigation';
import { resolveMediaUrl } from '../utils/videoHelper';
import { checkForAppUpdate } from '../utils/appUpdater';

const AVATAR_OPTIONS = [
  { id: 'leader', label: 'ট্যুর লিডার', emoji: '👑', bg: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'photo', label: 'ফটোগ্রাফার', emoji: '📸', bg: 'bg-teal-100 text-teal-800 border-teal-300' },
  { id: 'family', label: 'অভিভাবক', emoji: '👨‍👩‍👦', bg: 'bg-blue-100 text-blue-800 border-blue-300' },
  { id: 'bhabi', label: 'ভাবী / গৃহিণী', emoji: '🧕', bg: 'bg-purple-100 text-purple-800 border-purple-300' },
  { id: 'youngster', label: 'ইয়ংস্টার', emoji: '🕶️', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { id: 'kid', label: 'কিডস / শিশু', emoji: '👶', bg: 'bg-rose-100 text-rose-800 border-rose-300' }
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'জানা নেই'];

const GOOGLE_DRIVE_FOLDER_URL = 'https://drive.google.com/drive/folders/1G_g7cTkA489hbL9dsF6LU5tdfX3E54vM?usp=sharing';

export default function UserProfileModal({
  isOpen,
  onClose,
  currentUser,
  currentProfile = {},
  members = [],
  onSaveProfile,
  onOpenUpdateModal,
}) {
  useBackHandler(isOpen, onClose, 20);
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(() => {
    // Linked by the chosen member ID, or by an exact name match. Never a partial match.
    const matchedMember = findLinkedMember(members, currentProfile, currentUser?.displayName);

    return {
      memberId: matchedMember?.id ?? null,
      displayName: currentProfile?.displayName || currentUser?.displayName || '',
      nickname: currentProfile?.nickname || '',
      role: currentProfile?.role || 'সদস্য',
      phone: currentProfile?.phone || matchedMember?.phone || '',
      bloodGroup: currentProfile?.bloodGroup || 'O+',
      foodPreference: currentProfile?.foodPreference || '',
      emergencyContact: currentProfile?.emergencyContact || '',
      emergencyPhone: currentProfile?.emergencyPhone || '',
      avatarEmoji: currentProfile?.avatarEmoji || '👑',
      customPhotoURL: currentProfile?.customPhotoURL || currentProfile?.photoURL || currentUser?.photoURL || '',
      seat: currentProfile?.seat || matchedMember?.seat || 'স্লিপার / বিজনেস',
      room: currentProfile?.room || matchedMember?.room || 'হোটেল সি মুন'
    };
  });

  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [photoNotification, setPhotoNotification] = useState('');
  const [photoLoadError, setPhotoLoadError] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatusMsg, setUpdateStatusMsg] = useState('');

  const handleCheckUpdateManual = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatusMsg('');
    try {
      const info = await checkForAppUpdate();
      if (info?.hasUpdate) {
        onOpenUpdateModal?.(info);
      } else {
        setUpdateStatusMsg(`✓ অ্যাপটি আপ-টু-ডেট আছে (v${info?.currentVersion || '2.1'})`);
      }
    } catch {
      setUpdateStatusMsg('আপডেট চেক করতে সমস্যা হয়েছে');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  useEffect(() => {
    setPhotoLoadError(false);
  }, [profile.customPhotoURL]);

  // Sync state whenever modal is opened with the latest currentProfile & member info
  useEffect(() => {
    if (isOpen) {
      const matchedMember = findLinkedMember(members, currentProfile, currentUser?.displayName);
      setProfile({
        memberId: currentProfile?.memberId ?? matchedMember?.id ?? null,
        displayName: currentProfile?.displayName || currentUser?.displayName || '',
        nickname: currentProfile?.nickname || '',
        role: currentProfile?.role || 'সদস্য',
        phone: String(currentProfile?.phone || matchedMember?.phone || ''),
        bloodGroup: currentProfile?.bloodGroup || 'O+',
        foodPreference: currentProfile?.foodPreference || '',
        emergencyContact: currentProfile?.emergencyContact || '',
        emergencyPhone: String(currentProfile?.emergencyPhone || ''),
        avatarEmoji: currentProfile?.avatarEmoji || '👑',
        customPhotoURL: currentProfile?.customPhotoURL || currentProfile?.photoURL || currentUser?.photoURL || '',
        seat: currentProfile?.seat || matchedMember?.seat || 'স্লিপার / বিজনেস',
        room: currentProfile?.room || matchedMember?.room || 'হোটেল সি মুন',
      });
      setShowUrlInput(false);
      setUrlInput('');
      setSavedSuccess(false);
      setPhotoNotification('');
    }
  }, [isOpen, currentProfile, currentUser, members]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 1. Handle File Upload (Pick from device or take photo with auto-compression)
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        alert('ছবির সাইজ ২০MB এর কম হতে হবে');
        return;
      }
      try {
        const compressed = await compressImageFile(file, 300, 300, 0.75);
        setProfile(prev => ({ ...prev, customPhotoURL: compressed }));
        setPhotoNotification('নতুন প্রোফাইল ছবি যুক্ত হয়েছে!');
        setTimeout(() => setPhotoNotification(''), 2500);
      } catch (err) {
        console.error('Avatar compression error:', err);
      }
    }
  };

  // 2. Handle Image URL input
  const handleApplyUrl = (e) => {
    e.preventDefault();
    if (urlInput && urlInput.trim()) {
      setProfile(prev => ({ ...prev, customPhotoURL: urlInput.trim() }));
      setUrlInput('');
      setShowUrlInput(false);
      setPhotoNotification('ছবির লিংক থেকে প্রোফাইল ছবি সেট হয়েছে!');
      setTimeout(() => setPhotoNotification(''), 2500);
    }
  };

  // 3. Handle Delete / Remove profile picture
  const handleDeletePhoto = () => {
    setProfile(prev => ({ ...prev, customPhotoURL: '' }));
    setPhotoNotification('প্রোফাইল ছবি মুছে ফেলা হয়েছে (ডিফল্ট ব্যাজ সেট হলো)');
    setTimeout(() => setPhotoNotification(''), 2500);
  };

  // 4. Revert to Google Photo
  const handleUseGooglePhoto = () => {
    if (currentUser?.photoURL) {
      setProfile(prev => ({ ...prev, customPhotoURL: currentUser.photoURL }));
      setPhotoNotification('গুগল অ্যাকাউন্টের ছবি সেট করা হয়েছে!');
      setTimeout(() => setPhotoNotification(''), 2500);
    }
  };

  const linkedMember = members.find((member) => String(member.id) === String(profile.memberId)) ?? null;

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const cleanPhone = String(profile.phone || '').trim();
      const cleanEmergencyPhone = String(profile.emergencyPhone || '').trim();
      const cleanDisplayName = String(profile.displayName || currentUser?.displayName || '').trim();

      onSaveProfile?.({
        ...profile,
        displayName: cleanDisplayName,
        memberId: profile.memberId ?? null,
        phone: cleanPhone,
        emergencyPhone: cleanEmergencyPhone,
      });
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Save profile error:', err);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-200"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') e.currentTarget.click(); }}
    >
      <div
        className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full shadow-2xl max-h-[88vh] flex flex-col overflow-hidden my-auto border border-slate-100 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* PINNED TOP HEADER BAR (Never scrolls off the screen) */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200 bg-slate-50/95 backdrop-blur-md shrink-0 z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold shadow-2xs shrink-0">
              <User size={20} />
            </div>
            <div className="truncate">
              <h3 className="font-bold text-sm sm:text-base text-slate-800 truncate">আমার ট্যুর প্রোফাইল</h3>
              <p className="text-[10px] text-slate-500 truncate">ছবি, ভূমিকা ও জরুরি নিরাপত্তা তথ্য পরিবর্তন করুন</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200 hover:bg-rose-100 hover:text-rose-600 text-slate-700 flex items-center justify-center transition cursor-pointer active:scale-95 shrink-0"
            title="বন্ধ করুন (Esc)"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* NOTIFICATION TOAST */}
        {photoNotification && (
          <div className="mx-4 mt-2 p-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in shrink-0">
            <Sparkles size={14} className="text-amber-600 shrink-0" />
            <span className="truncate">{photoNotification}</span>
          </div>
        )}

        {/* FORM & SCROLLABLE CONTENT BODY */}
        <form id="user-profile-form" onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* PROFILE PICTURE MANAGEMENT SECTION */}
            <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white p-4 rounded-2xl space-y-3.5 shadow-md border border-teal-700/60">
              <div className="flex flex-col sm:flex-row items-center gap-3.5">
                {/* Visual Avatar */}
                <div className="relative group shrink-0">
                  {profile.customPhotoURL && !photoLoadError ? (
                    <img
                      src={resolveMediaUrl(profile.customPhotoURL)}
                      alt={profile.displayName || 'Profile'}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      onError={() => setPhotoLoadError(true)}
                      className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover ring-4 ring-amber-400 shadow-xl"
                    />
                  ) : (
                    <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-teal-950 flex items-center justify-center text-3xl font-bold ring-4 ring-amber-400 shadow-xl">
                      {profile.avatarEmoji}
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 text-sm bg-white rounded-full p-1 shadow-md border border-slate-200">
                    {profile.avatarEmoji}
                  </span>
                </div>

                {/* Profile Pic Action Controls */}
                <div className="flex-1 text-center sm:text-left space-y-1.5 w-full">
                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base text-white truncate">
                      {profile.displayName || currentUser?.displayName || 'পরিবারের সদস্য'}
                    </h4>
                    <p className="text-[11px] text-teal-200 truncate">{currentUser?.email}</p>
                  </div>

                  {/* Action Buttons: Add / Change / Delete in neat responsive grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                    {/* Upload from device / camera */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2 py-1.5 bg-amber-400 hover:bg-amber-300 text-teal-950 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1 transition cursor-pointer shadow-xs active:scale-95"
                    >
                      <Camera size={13} />
                      <span className="truncate">{profile.customPhotoURL ? 'ছবি বদল' : 'আপলোড'}</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {/* Delete Photo Button */}
                    {profile.customPhotoURL ? (
                      <button
                        type="button"
                        onClick={handleDeletePhoto}
                        className="px-2 py-1.5 bg-rose-600/90 hover:bg-rose-600 text-white text-[11px] font-semibold rounded-xl flex items-center justify-center gap-1 transition cursor-pointer active:scale-95"
                        title="প্রোফাইল ছবি মুছে ফেলুন"
                      >
                        <Trash2 size={12} />
                        <span>মুছুন</span>
                      </button>
                    ) : (
                      <div className="hidden sm:block"></div>
                    )}

                    {/* Revert to Google Account Photo */}
                    {currentUser?.photoURL && profile.customPhotoURL !== currentUser.photoURL && (
                      <button
                        type="button"
                        onClick={handleUseGooglePhoto}
                        className="px-2 py-1.5 bg-white/20 hover:bg-white/30 text-white text-[11px] font-medium rounded-xl flex items-center justify-center gap-1 transition cursor-pointer active:scale-95"
                        title="গুগল অ্যাকাউন্টের মূল ছবি সেট করুন"
                      >
                        <RefreshCw size={12} />
                        <span className="truncate">গুগল ছবি</span>
                      </button>
                    )}

                    {/* Enter URL button */}
                    <button
                      type="button"
                      onClick={() => setShowUrlInput(!showUrlInput)}
                      className="px-2 py-1.5 bg-white/10 hover:bg-white/20 text-teal-200 hover:text-white text-[11px] font-medium rounded-xl flex items-center justify-center gap-1 transition cursor-pointer active:scale-95"
                      title="ছবির সরাসরি লিংক দিন"
                    >
                      <ImageIcon size={12} />
                      <span>লিংক</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Optional Web Image URL input */}
              {showUrlInput && (
                <div className="pt-2 border-t border-teal-800/80">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="ছবির সরাসরি ওয়েব লিংক দিন..."
                      value={urlInput}
                      onChange={e => setUrlInput(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs bg-slate-900 border border-teal-700 rounded-xl focus:outline-none focus:border-amber-400 text-white placeholder-teal-400"
                    />
                    <button
                      type="button"
                      onClick={handleApplyUrl}
                      className="px-3 py-1.5 bg-amber-400 text-teal-950 font-bold text-xs rounded-xl cursor-pointer"
                    >
                      সেট
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Avatar Preset Selection */}
            <fieldset className="space-y-1.5 min-w-0">
              <legend id="profile-role-group" className="text-xs font-bold text-slate-700 block">ট্যুর রোল / প্রোফাইল ব্যাজ নির্বাচন করুন:</legend>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {AVATAR_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setProfile({ ...profile, role: opt.label, avatarEmoji: opt.emoji })}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer text-center ${
                      profile.role === opt.label
                        ? 'border-teal-600 bg-teal-50 ring-2 ring-teal-600/30 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-lg">{opt.emoji}</span>
                    <span className="text-[10px] leading-tight truncate w-full">{opt.label}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1" htmlFor="userprofilemodal-field-1">পূর্ণ নাম</label>
                <input id="userprofilemodal-field-1"
                  type="text"
                  value={profile.displayName}
                  onChange={e => setProfile({ ...profile, displayName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="profile-member" className="text-xs font-bold text-slate-600 block mb-1">
                  আমি কোন সদস্য? (বাস সিট ও রুম দেখাতে)
                </label>
                <select
                  id="profile-member"
                  value={profile.memberId ?? ''}
                  onChange={e => setProfile({ ...profile, memberId: e.target.value === '' ? null : Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                >
                  <option value="">তালিকায় নেই / পরে ঠিক করব</option>
                  {members.map(member => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1" htmlFor="userprofilemodal-field-2">ডাকনাম / ফ্যামিলি সম্পর্ক</label>
                <input id="userprofilemodal-field-2"
                  type="text"
                  placeholder="যেমন: বড় ভাই, মেঝ ভাবী, রাজু ভাই"
                  value={profile.nickname}
                  onChange={e => setProfile({ ...profile, nickname: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1" htmlFor="userprofilemodal-field-3">মোবাইল নম্বর (সরাসরি কল/WhatsApp)</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input id="userprofilemodal-field-3"
                    type="text"
                    placeholder="017XXXXXXXX"
                    value={profile.phone}
                    onChange={e => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1" htmlFor="userprofilemodal-field-4">রক্তের গ্রুপ (Blood Group)</label>
                <select id="userprofilemodal-field-4"
                  value={profile.bloodGroup}
                  onChange={e => setProfile({ ...profile, bloodGroup: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                >
                  {BLOOD_GROUPS.map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1" htmlFor="userprofilemodal-field-5">
                খাবার পছন্দ ও অ্যালার্জি সতর্কতা (Dietary / Allergies)
              </label>
              <input id="userprofilemodal-field-5"
                type="text"
                placeholder="যেমন: চিংড়িতে অ্যালার্জি, মিষ্টি কম খান, বাচ্চার জন্য নরম খিচুড়ি"
                value={profile.foodPreference}
                onChange={e => setProfile({ ...profile, foodPreference: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-rose-50/60 rounded-2xl border border-rose-100">
              <div>
                <label className="text-[11px] font-bold text-rose-900 block mb-1" htmlFor="userprofilemodal-field-6">জরুরি যোগাযোগকারী ব্যক্তি</label>
                <input id="userprofilemodal-field-6"
                  type="text"
                  placeholder="যেমন: স্ত্রী / ভাই / পিতা"
                  value={profile.emergencyContact}
                  onChange={e => setProfile({ ...profile, emergencyContact: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-rose-200 rounded-xl focus:outline-none focus:border-rose-500 bg-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-rose-900 block mb-1" htmlFor="userprofilemodal-field-7">জরুরি ফোন নম্বর</label>
                <input id="userprofilemodal-field-7"
                  type="text"
                  placeholder="017XXXXXXXX"
                  value={profile.emergencyPhone}
                  onChange={e => setProfile({ ...profile, emergencyPhone: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-rose-200 rounded-xl focus:outline-none focus:border-rose-500 bg-white"
                />
              </div>
            </div>

            {/* Seat & Room Assignments */}
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
                <Bus size={15} className="text-teal-600 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block">বাস সিট</span>
                  <span className="font-semibold text-slate-700 truncate block">{linkedMember?.seat || profile.seat}</span>
                </div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
                <Hotel size={15} className="text-amber-600 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 block">হোটেল রুম</span>
                  <span className="font-semibold text-slate-700 truncate block">{linkedMember?.room || profile.room}</span>
                </div>
              </div>
            </div>

            {/* Official Google Drive Backup Folder Integration Card */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-3 rounded-2xl border border-emerald-200/90 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <HardDrive size={16} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 text-[11px]">অফিশিয়াল গুগল ড্রাইভ ব্যাকআপ</p>
                  <p className="text-[10px] text-emerald-800 truncate">ফোল্ডার আইডি: 1G_g7cTkA489...</p>
                </div>
              </div>

              <a
                href={GOOGLE_DRIVE_FOLDER_URL}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-[11px] font-bold flex items-center gap-1 transition shadow-xs shrink-0"
              >
                <ExternalLink size={12} /> ফোল্ডার
              </a>
            </div>

            {/* In-App OTA Update Check Card */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/90 flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-teal-800 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Sparkles size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-[11px]">Tour 2026 অ্যাপ ভার্সন</p>
                    <p className="text-[10px] text-slate-500">ইন-অ্যাপ স্বয়ংক্রিয় OTA সিস্টেম</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCheckUpdateManual}
                  disabled={isCheckingUpdate}
                  className="px-3 py-1.5 bg-teal-800 hover:bg-teal-700 active:scale-95 text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition shadow-xs shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {isCheckingUpdate ? (
                    <>
                      <Loader2 size={12} className="animate-spin text-white" />
                      <span>চেক হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={12} className="text-white" />
                      <span>আপডেট চেক</span>
                    </>
                  )}
                </button>
              </div>

              {updateStatusMsg && (
                <p className="text-[10px] text-teal-800 font-bold bg-teal-50 border border-teal-200 rounded-lg p-1.5 text-center">
                  {updateStatusMsg}
                </p>
              )}
            </div>

            {savedSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center justify-center gap-2">
                <CheckCircle2 size={16} /> প্রোফাইল সফলভাবে আপডেট হয়েছে!
              </div>
            )}
          </div>

          {/* PINNED BOTTOM ACTION BAR (Always visible, thumb-accessible) */}
          <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 z-20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer active:scale-95"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
            >
              <Save size={14} /> প্রোফাইল সেভ করুন
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
