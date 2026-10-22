import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Wallet,
  ArrowRight,
  Grid3X3,
  Film,
  Heart,
  MessageCircle,
  Play,
  Images,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Edit3,
} from 'lucide-react';
import { compressImageFile } from '../utils/imageCompressor';
import { findLinkedMember } from '../utils/members';
import { useBackHandler } from '../utils/backNavigation';
import { resolveMediaUrl, toBnNum, formatDuration } from '../utils/videoHelper';
import { checkForAppUpdate } from '../utils/appUpdater';
import { photoSource, getPostImages, getFilterCss } from './InstagramFeed';
import ProgressiveImage from './ProgressiveImage';
import { triggerHaptic } from '../utils/haptics';

const AVATAR_OPTIONS = [
  { id: 'leader', label: 'ট্যুর লিডার', emoji: '👑', bg: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'photo', label: 'ফটোগ্রাফার', emoji: '📸', bg: 'bg-teal-100 text-teal-800 border-teal-300' },
  { id: 'family', label: 'অভিভাবক', emoji: '👨‍👩‍👦', bg: 'bg-blue-100 text-blue-800 border-blue-300' },
  { id: 'bhabi', label: 'ভাবী / গৃহিণী', emoji: '🧕', bg: 'bg-purple-100 text-purple-800 border-purple-300' },
  { id: 'youngster', label: 'ইয়ংস্টার', emoji: '🕶️', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { id: 'kid', label: 'কিডস / শিশু', emoji: '👶', bg: 'bg-rose-100 text-rose-800 border-rose-300' },
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'জানা নেই'];

const GOOGLE_DRIVE_FOLDER_URL = 'https://drive.google.com/drive/folders/1G_g7cTkA489hbL9dsF6LU5tdfX3E54vM?usp=sharing';

export default function UserProfileModal({
  isOpen,
  onClose,
  currentUser,
  currentProfile = {},
  targetUser = null,
  isOwnProfile = true,
  members = [],
  posts = [],
  ledger = null,
  onNavigateToExpenses,
  onNavigateToFeed,
  onSaveProfile,
  onOpenUpdateModal,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'reels' | 'info'
  const [selectedGridPost, setSelectedGridPost] = useState(null);
  const [selectedReel, setSelectedReel] = useState(null);
  const [lightboxImgIdx, setLightboxImgIdx] = useState(0);

  // Phone Back Button Handlers (priority order)
  useBackHandler(Boolean(selectedReel), () => setSelectedReel(null), 28);
  useBackHandler(Boolean(selectedGridPost), () => setSelectedGridPost(null), 27);
  useBackHandler(isEditing, () => setIsEditing(false), 24);
  useBackHandler(isOpen, onClose, 20);

  const fileInputRef = useRef(null);

  // Effective profile state for editing and display
  const effectiveUser = targetUser || currentUser;
  const effectiveProfile = currentProfile || {};

  const [profile, setProfile] = useState(() => {
    const matchedMember = findLinkedMember(members, effectiveProfile, effectiveUser?.displayName);
    return {
      memberId: effectiveProfile?.memberId ?? matchedMember?.id ?? null,
      displayName: effectiveProfile?.displayName || effectiveUser?.displayName || '',
      nickname: effectiveProfile?.nickname || '',
      role: effectiveProfile?.role || 'সদস্য',
      phone: String(effectiveProfile?.phone || matchedMember?.phone || ''),
      bloodGroup: effectiveProfile?.bloodGroup || 'O+',
      foodPreference: effectiveProfile?.foodPreference || '',
      emergencyContact: effectiveProfile?.emergencyContact || '',
      emergencyPhone: String(effectiveProfile?.emergencyPhone || ''),
      avatarEmoji: effectiveProfile?.avatarEmoji || '👑',
      customPhotoURL: effectiveProfile?.customPhotoURL || effectiveProfile?.photoURL || effectiveUser?.photoURL || '',
      seat: effectiveProfile?.seat || matchedMember?.seat || 'স্লিপার / বিজনেস',
      room: effectiveProfile?.room || matchedMember?.room || 'হোটেল সি মুন',
    };
  });

  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [photoNotification, setPhotoNotification] = useState('');
  const [photoLoadError, setPhotoLoadError] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatusMsg, setUpdateStatusMsg] = useState('');

  // Synchronize state when target or profile changes
  useEffect(() => {
    if (isOpen) {
      const matchedMember = findLinkedMember(members, effectiveProfile, effectiveUser?.displayName);
      setProfile({
        memberId: effectiveProfile?.memberId ?? matchedMember?.id ?? null,
        displayName: effectiveProfile?.displayName || effectiveUser?.displayName || '',
        nickname: effectiveProfile?.nickname || '',
        role: effectiveProfile?.role || 'সদস্য',
        phone: String(effectiveProfile?.phone || matchedMember?.phone || ''),
        bloodGroup: effectiveProfile?.bloodGroup || 'O+',
        foodPreference: effectiveProfile?.foodPreference || '',
        emergencyContact: effectiveProfile?.emergencyContact || '',
        emergencyPhone: String(effectiveProfile?.emergencyPhone || ''),
        avatarEmoji: effectiveProfile?.avatarEmoji || '👑',
        customPhotoURL: effectiveProfile?.customPhotoURL || effectiveProfile?.photoURL || effectiveUser?.photoURL || '',
        seat: effectiveProfile?.seat || matchedMember?.seat || 'স্লিপার / বিজনেস',
        room: effectiveProfile?.room || matchedMember?.room || 'হোটেল সি মুন',
      });
      setShowUrlInput(false);
      setUrlInput('');
      setSavedSuccess(false);
      setPhotoNotification('');
      setIsEditing(false);
      setSelectedGridPost(null);
      setSelectedReel(null);
    }
  }, [isOpen, effectiveProfile, effectiveUser, members]);

  // Handle OTA update check
  const handleCheckUpdateManual = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatusMsg('');
    try {
      const info = await checkForAppUpdate();
      if (info?.hasUpdate) {
        onOpenUpdateModal?.(info);
      } else {
        setUpdateStatusMsg(`✓ অ্যাপটি আপ-টু-ডেট আছে (v${info?.currentVersion || '2.24'})`);
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

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedReel) setSelectedReel(null);
        else if (selectedGridPost) setSelectedGridPost(null);
        else if (isEditing) setIsEditing(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedReel, selectedGridPost, isEditing, onClose]);

  // Linked Member & Financial ledger calculations
  const linkedMember = useMemo(() => {
    return members.find((member) => String(member.id) === String(profile.memberId)) ?? null;
  }, [members, profile.memberId]);

  const memberLedger = useMemo(() => {
    if (!linkedMember || !ledger?.rows) return null;
    return ledger.rows.find((r) => r.id === linkedMember.id) || null;
  }, [linkedMember, ledger]);

  // Filter posts belonging to this specific user (matched by email or displayName)
  const targetEmail = (effectiveUser?.email || '').trim().toLowerCase();
  const targetName = (profile.displayName || effectiveUser?.displayName || '').trim().toLowerCase();

  const userPosts = useMemo(() => {
    return (posts || []).filter((p) => {
      const postEmail = (p.authorEmail || '').trim().toLowerCase();
      const postAuthor = (p.author || '').trim().toLowerCase();

      if (targetEmail && postEmail && postEmail === targetEmail) return true;
      if (targetName && postAuthor && (postAuthor === targetName || targetName.includes(postAuthor) || postAuthor.includes(targetName))) {
        return true;
      }
      return false;
    });
  }, [posts, targetEmail, targetName]);

  const photoPosts = useMemo(() => {
    return userPosts.filter((p) => p.type !== 'reel' && !p.isReel && !p.videoUrl);
  }, [userPosts]);

  const reelPosts = useMemo(() => {
    return userPosts.filter((p) => p.type === 'reel' || p.isReel || Boolean(p.videoUrl));
  }, [userPosts]);

  const totalLikes = useMemo(() => {
    return userPosts.reduce((acc, p) => acc + (Array.isArray(p.likes) ? p.likes.length : 0), 0);
  }, [userPosts]);

  if (!isOpen) return null;

  // File Upload Handlers for Profile Picture
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        alert('ছবির সাইজ ২০MB এর কম হতে হবে');
        return;
      }
      try {
        const compressed = await compressImageFile(file, 400, 400, 0.80);
        setProfile((prev) => ({ ...prev, customPhotoURL: compressed }));
        setPhotoNotification('নতুন প্রোফাইল ছবি যুক্ত হয়েছে!');
        setTimeout(() => setPhotoNotification(''), 2500);
      } catch (err) {
        console.error('Avatar compression error:', err);
      }
    }
  };

  const handleApplyUrl = (e) => {
    e.preventDefault();
    if (urlInput && urlInput.trim()) {
      setProfile((prev) => ({ ...prev, customPhotoURL: urlInput.trim() }));
      setUrlInput('');
      setShowUrlInput(false);
      setPhotoNotification('ছবির লিংক থেকে প্রোফাইল ছবি সেট হয়েছে!');
      setTimeout(() => setPhotoNotification(''), 2500);
    }
  };

  const handleDeletePhoto = () => {
    setProfile((prev) => ({ ...prev, customPhotoURL: '' }));
    setPhotoNotification('প্রোফাইল ছবি মুছে ফেলা হয়েছে (ডিফল্ট ব্যাজ সেট হলো)');
    setTimeout(() => setPhotoNotification(''), 2500);
  };

  const handleUseGooglePhoto = () => {
    if (effectiveUser?.photoURL) {
      setProfile((prev) => ({ ...prev, customPhotoURL: effectiveUser.photoURL }));
      setPhotoNotification('গুগল অ্যাকাউন্টের ছবি সেট করা হয়েছে!');
      setTimeout(() => setPhotoNotification(''), 2500);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const cleanPhone = String(profile.phone || '').trim();
      const cleanEmergencyPhone = String(profile.emergencyPhone || '').trim();
      const cleanDisplayName = String(profile.displayName || effectiveUser?.displayName || '').trim();

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
        setIsEditing(false);
      }, 1000);
    } catch (err) {
      console.error('Save profile error:', err);
    }
  };

  const cleanHandle = targetEmail
    ? targetEmail.split('@')[0].replace(/[^a-zA-Z0-9._]/g, '')
    : (profile.displayName || 'family.member').toLowerCase().replace(/\s+/g, '.');

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-200"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') e.currentTarget.click();
      }}
    >
      <div
        className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full shadow-2xl max-h-[92vh] flex flex-col overflow-hidden my-auto border border-slate-100 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP INSTAGRAM-STYLE HEADER BAR */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 bg-white/95 backdrop-blur-md shrink-0 z-20">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-mono font-bold text-slate-800 tracking-tight truncate">
              @{cleanHandle}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
              {profile.avatarEmoji} {profile.role}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isOwnProfile && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setIsEditing(!isEditing);
                }}
                className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition cursor-pointer active:scale-95 ${
                  isEditing
                    ? 'bg-teal-50 text-teal-800 border-teal-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
                title="প্রোফাইল পরিবর্তন"
              >
                <Edit3 size={15} />
                <span className="hidden sm:inline">{isEditing ? 'প্রোফাইল দেখুন' : 'এডিট'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-600 flex items-center justify-center transition cursor-pointer active:scale-95"
              title="বন্ধ করুন (Esc)"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* NOTIFICATION TOAST */}
        {photoNotification && (
          <div className="mx-4 mt-2 p-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in shrink-0">
            <Sparkles size={14} className="text-amber-600 shrink-0" />
            <span className="truncate">{photoNotification}</span>
          </div>
        )}

        {/* MAIN MODAL SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto">
          {/* A. EDIT PROFILE FORM VIEW */}
          {isEditing ? (
            <form id="user-profile-form" onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              {/* Profile Pic Management */}
              <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white p-4 rounded-2xl space-y-3.5 shadow-md border border-teal-700/60">
                <div className="flex flex-col sm:flex-row items-center gap-3.5">
                  <div className="relative group shrink-0">
                    {profile.customPhotoURL && !photoLoadError ? (
                      <img
                        src={resolveMediaUrl(profile.customPhotoURL)}
                        alt={profile.displayName || 'Profile'}
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        onError={() => setPhotoLoadError(true)}
                        className="w-20 h-20 rounded-2xl object-cover ring-4 ring-amber-400 shadow-xl"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-teal-950 flex items-center justify-center text-3xl font-bold ring-4 ring-amber-400 shadow-xl">
                        {profile.avatarEmoji}
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1 text-sm bg-white rounded-full p-1 shadow-md border border-slate-200">
                      {profile.avatarEmoji}
                    </span>
                  </div>

                  <div className="flex-1 text-center sm:text-left space-y-1.5 w-full">
                    <div>
                      <h4 className="font-extrabold text-base text-white truncate">
                        {profile.displayName || effectiveUser?.displayName || 'পরিবারের সদস্য'}
                      </h4>
                      <p className="text-[11px] text-teal-200 truncate">{effectiveUser?.email}</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
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

                      {profile.customPhotoURL && (
                        <button
                          type="button"
                          onClick={handleDeletePhoto}
                          className="px-2 py-1.5 bg-rose-600/90 hover:bg-rose-600 text-white text-[11px] font-semibold rounded-xl flex items-center justify-center gap-1 transition cursor-pointer active:scale-95"
                          title="প্রোফাইল ছবি মুছে ফেলুন"
                        >
                          <Trash2 size={12} />
                          <span>মুছুন</span>
                        </button>
                      )}

                      {effectiveUser?.photoURL && profile.customPhotoURL !== effectiveUser.photoURL && (
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

                      <button
                        type="button"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        className="px-2 py-1.5 bg-white/10 hover:bg-white/20 text-teal-200 hover:text-white text-[11px] font-medium rounded-xl flex items-center justify-center gap-1 transition cursor-pointer active:scale-95"
                      >
                        <ImageIcon size={12} />
                        <span>লিংক</span>
                      </button>
                    </div>
                  </div>
                </div>

                {showUrlInput && (
                  <div className="pt-2 border-t border-teal-800/80">
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="ছবির সরাসরি ওয়েব লিংক দিন..."
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
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

              {/* Avatar Preset Badges */}
              <fieldset className="space-y-1.5 min-w-0">
                <legend className="text-xs font-bold text-slate-700 block">
                  ট্যুর রোল / প্রোফাইল ব্যাজ নির্বাচন করুন:
                </legend>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {AVATAR_OPTIONS.map((opt) => (
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

              {/* Form Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">পূর্ণ নাম</label>
                  <input
                    type="text"
                    value={profile.displayName}
                    onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="profile-member-select" className="text-xs font-bold text-slate-600 block mb-1">
                    আমি কোন সদস্য? (বাস সিট ও রুম লিঙ্ক করার জন্য)
                  </label>
                  <select
                    id="profile-member-select"
                    value={profile.memberId ?? ''}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        memberId: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                  >
                    <option value="">তালিকায় নেই / পরে ঠিক করব</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">ডাকনাম / ফ্যামিলি সম্পর্ক</label>
                  <input
                    type="text"
                    placeholder="যেমন: বড় ভাই, মেঝ ভাবী, রাজু ভাই"
                    value={profile.nickname}
                    onChange={(e) => setProfile({ ...profile, nickname: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">মোবাইল নম্বর (সরাসরি কল/WhatsApp)</label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="017XXXXXXXX"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">রক্তের গ্রুপ (Blood Group)</label>
                  <select
                    value={profile.bloodGroup}
                    onChange={(e) => setProfile({ ...profile, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                  >
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  খাবার পছন্দ ও অ্যালার্জি সতর্কতা (Dietary / Allergies)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: চিংড়িতে অ্যালার্জি, মিষ্টি কম খান, বাচ্চার নরম খিচুড়ি"
                  value={profile.foodPreference}
                  onChange={(e) => setProfile({ ...profile, foodPreference: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-rose-50/60 rounded-2xl border border-rose-100">
                <div>
                  <label className="text-[11px] font-bold text-rose-900 block mb-1">জরুরি যোগাযোগকারী ব্যক্তি</label>
                  <input
                    type="text"
                    placeholder="যেমন: স্ত্রী / ভাই / পিতা"
                    value={profile.emergencyContact}
                    onChange={(e) => setProfile({ ...profile, emergencyContact: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-rose-200 rounded-xl focus:outline-none focus:border-rose-500 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-rose-900 block mb-1">জরুরি ফোন নম্বর</label>
                  <input
                    type="text"
                    placeholder="017XXXXXXXX"
                    value={profile.emergencyPhone}
                    onChange={(e) => setProfile({ ...profile, emergencyPhone: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-rose-200 rounded-xl focus:outline-none focus:border-rose-500 bg-white"
                  />
                </div>
              </div>

              {savedSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} /> প্রোফাইল সফলভাবে আপডেট হয়েছে!
                </div>
              )}

              {/* Bottom Buttons */}
              <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
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
          ) : (
            /* B. AUTHENTIC INSTAGRAM PROFILE VIEW */
            <div>
              {/* 1. INSTAGRAM PROFILE HEADER */}
              <div className="p-4 sm:p-6 pb-3 space-y-3.5">
                <div className="flex items-center gap-4 sm:gap-6">
                  {/* Large Avatar with Authentic Instagram Gradient Ring */}
                  <div className="relative shrink-0">
                    <div className="p-0.5 rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] shadow-md">
                      <div className="p-0.5 bg-white rounded-full">
                        {profile.customPhotoURL && !photoLoadError ? (
                          <img
                            src={resolveMediaUrl(profile.customPhotoURL)}
                            alt={profile.displayName || 'Profile'}
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                            onError={() => setPhotoLoadError(true)}
                            className="w-18 h-18 sm:w-20 sm:h-20 rounded-full object-cover select-none"
                          />
                        ) : (
                          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-teal-800 to-slate-900 text-white flex items-center justify-center text-3xl font-bold select-none">
                            {profile.avatarEmoji}
                          </div>
                        )}
                      </div>
                    </div>

                    <span className="absolute -bottom-1 -right-1 text-sm bg-white rounded-full p-1 shadow-md border border-slate-200">
                      {profile.avatarEmoji}
                    </span>
                  </div>

                  {/* 3 Stats Columns: Posts | Likes | Reels */}
                  <div className="flex-1 flex justify-around items-center text-center">
                    <button
                      type="button"
                      onClick={() => setActiveTab('posts')}
                      className="cursor-pointer group focus:outline-none"
                    >
                      <span className="block text-base sm:text-lg font-black text-slate-900 group-hover:text-pink-600 transition">
                        {toBnNum(userPosts.length)}
                      </span>
                      <span className="text-[11px] text-slate-500 block font-medium">পোস্ট</span>
                    </button>

                    <div className="cursor-default">
                      <span className="block text-base sm:text-lg font-black text-slate-900">
                        {toBnNum(totalLikes)}
                      </span>
                      <span className="text-[11px] text-slate-500 block font-medium">লাইক</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('reels')}
                      className="cursor-pointer group focus:outline-none"
                    >
                      <span className="block text-base sm:text-lg font-black text-slate-900 group-hover:text-pink-600 transition">
                        {toBnNum(reelPosts.length)}
                      </span>
                      <span className="text-[11px] text-slate-500 block font-medium">রিলস</span>
                    </button>
                  </div>
                </div>

                {/* Name, Nickname & Bio Details */}
                <div className="space-y-1.5 leading-tight">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                      {profile.displayName || effectiveUser?.displayName || 'পরিবারের সদস্য'}
                    </h3>
                    {profile.nickname && (
                      <span className="text-xs text-slate-600 font-medium">({profile.nickname})</span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 flex items-center gap-1.5">
                    <span className="font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 text-[10px]">
                      {profile.avatarEmoji} {profile.role}
                    </span>
                    {effectiveUser?.email && (
                      <span className="text-slate-400 text-[11px] truncate">· {effectiveUser.email}</span>
                    )}
                  </p>

                  {/* Tour Quick Chips (Bus Seat, Room, Blood, Food) */}
                  <div className="flex flex-wrap gap-1.5 pt-1 text-[11px]">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                      <Bus size={11} className="text-teal-600" />
                      {linkedMember?.seat || profile.seat}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                      <Hotel size={11} className="text-amber-600" />
                      {linkedMember?.room || profile.room}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 text-rose-800 font-semibold border border-rose-200">
                      🩸 {profile.bloodGroup}
                    </span>
                    {profile.foodPreference && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 font-medium border border-amber-200 truncate max-w-[200px]">
                        🍲 {profile.foodPreference}
                      </span>
                    )}
                  </div>
                </div>

                {/* Profile Action Buttons */}
                <div className="flex gap-2 pt-1">
                  {isOwnProfile ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setIsEditing(true);
                        }}
                        className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-98"
                      >
                        <Edit3 size={13} />
                        <span>প্রোফাইল এডিট</span>
                      </button>

                      {onNavigateToFeed && (
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('light');
                            onNavigateToFeed();
                          }}
                          className="flex-1 py-1.5 px-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs active:scale-98"
                        >
                          <Camera size={13} />
                          <span>নতুন পোস্ট</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      {profile.phone && (
                        <a
                          href={`tel:${profile.phone}`}
                          className="flex-1 py-1.5 px-3 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition shadow-xs text-center"
                        >
                          <Phone size={13} />
                          <span>কল করুন</span>
                        </a>
                      )}
                      {profile.phone && (
                        <a
                          href={`https://wa.me/88${profile.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition shadow-xs text-center"
                        >
                          <span>হোয়াটসঅ্যাপ</span>
                        </a>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* 2. INSTAGRAM NAVIGATION TABS */}
              <div className="flex border-t border-b border-slate-200 bg-white sticky top-0 z-10">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveTab('posts');
                  }}
                  className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs transition cursor-pointer relative ${
                    activeTab === 'posts'
                      ? 'text-pink-600 font-extrabold'
                      : 'text-slate-500 hover:text-slate-800 font-semibold'
                  }`}
                >
                  <Grid3X3 size={16} />
                  <span>পোস্ট ({toBnNum(photoPosts.length)})</span>
                  {activeTab === 'posts' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-600" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveTab('reels');
                  }}
                  className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs transition cursor-pointer relative ${
                    activeTab === 'reels'
                      ? 'text-pink-600 font-extrabold'
                      : 'text-slate-500 hover:text-slate-800 font-semibold'
                  }`}
                >
                  <Film size={16} />
                  <span>রিলস ({toBnNum(reelPosts.length)})</span>
                  {activeTab === 'reels' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-600" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveTab('info');
                  }}
                  className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs transition cursor-pointer relative ${
                    activeTab === 'info'
                      ? 'text-teal-700 font-extrabold'
                      : 'text-slate-500 hover:text-slate-800 font-semibold'
                  }`}
                >
                  <User size={16} />
                  <span>ট্যুর তথ্য</span>
                  {activeTab === 'info' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-700" />
                  )}
                </button>
              </div>

              {/* 3. TAB CONTENT */}
              <div className="p-1 sm:p-2">
                {/* TAB 1: 3-COLUMN SQUARE POSTS GRID */}
                {activeTab === 'posts' && (
                  <div>
                    {photoPosts.length === 0 ? (
                      <div className="py-12 px-4 text-center space-y-3">
                        <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-slate-400">
                          <Camera size={26} strokeWidth={1.5} />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm text-slate-800">এখনও কোনো ছবি পোস্ট করা হয়নি</h4>
                          <p className="text-xs text-slate-500 max-w-xs mx-auto">
                            কক্সবাজার সফরের সুন্দর সুন্দর ছবি পরিবারের সাথে ফিডে শেয়ার করুন।
                          </p>
                        </div>
                        {isOwnProfile && onNavigateToFeed && (
                          <button
                            type="button"
                            onClick={onNavigateToFeed}
                            className="px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold text-xs rounded-xl shadow-xs transition hover:brightness-105 cursor-pointer"
                          >
                            ছবি পোস্ট করুন 📸
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
                        {photoPosts.map((post) => {
                          const src = photoSource(post);
                          const isCarousel = Array.isArray(post.images) && post.images.length > 1;
                          const likeCount = Array.isArray(post.likes) ? post.likes.length : 0;
                          const commentCount = Array.isArray(post.comments) ? post.comments.length : 0;

                          return (
                            <div
                              key={post.id}
                              onClick={() => {
                                triggerHaptic('light');
                                setLightboxImgIdx(0);
                                setSelectedGridPost(post);
                              }}
                              className="aspect-square bg-slate-900 rounded-lg sm:rounded-xl overflow-hidden relative cursor-pointer group select-none shadow-2xs"
                            >
                              <ProgressiveImage
                                src={src}
                                thumb={post.thumb}
                                driveFileId={post.driveFileId}
                                alt={post.caption || 'User post'}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                style={{ filter: getFilterCss(post.filter) }}
                                loading="lazy"
                              />

                              {/* Multi-Photo Carousel Badge in Top-Right Corner */}
                              {isCarousel && (
                                <div className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-xs text-white p-1 rounded-md shadow-md pointer-events-none">
                                  <Images size={12} className="text-white drop-shadow" />
                                </div>
                              )}

                              {/* Instagram Hover / Touch Overlay with Likes & Comments */}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3 text-white text-xs font-bold pointer-events-none">
                                <span className="flex items-center gap-1 drop-shadow">
                                  <Heart size={13} className="fill-white text-white" />
                                  {toBnNum(likeCount)}
                                </span>
                                <span className="flex items-center gap-1 drop-shadow">
                                  <MessageCircle size={13} className="fill-white text-white" />
                                  {toBnNum(commentCount)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: 3-COLUMN 9:16 VERTICAL REELS GRID */}
                {activeTab === 'reels' && (
                  <div>
                    {reelPosts.length === 0 ? (
                      <div className="py-12 px-4 text-center space-y-3">
                        <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-slate-400">
                          <Film size={26} strokeWidth={1.5} />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm text-slate-800">কোনো রিলস শেয়ার করা হয়নি</h4>
                          <p className="text-xs text-slate-500 max-w-xs mx-auto">
                            ভিডিও ট্রিম করে ৩ মিনিটের আনন্দঘন রিলস তৈরি করুন।
                          </p>
                        </div>
                        {isOwnProfile && onNavigateToFeed && (
                          <button
                            type="button"
                            onClick={onNavigateToFeed}
                            className="px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold text-xs rounded-xl shadow-xs transition hover:brightness-105 cursor-pointer"
                          >
                            রিলস তৈরি করুন 🎬
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
                        {reelPosts.map((reel) => {
                          const thumbUrl = resolveMediaUrl(reel.thumb, reel.driveFileId) || photoSource(reel);
                          const durationSec = reel.duration || 0;
                          const views = reel.views || 0;

                          return (
                            <div
                              key={reel.id}
                              onClick={() => {
                                triggerHaptic('light');
                                setSelectedReel(reel);
                              }}
                              className="aspect-[9/16] bg-slate-900 rounded-xl overflow-hidden relative cursor-pointer group select-none shadow-2xs border border-slate-100"
                            >
                              <img
                                src={thumbUrl}
                                alt={reel.caption || 'Reel thumbnail'}
                                loading="lazy"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />

                              {/* Gradient overlay */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                              {/* Duration Pill at top */}
                              <div className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-xs text-white text-[9px] font-mono px-1.5 py-0.5 rounded-md pointer-events-none">
                                {formatDuration(durationSec, { bengali: true })}
                              </div>

                              {/* Views & Play icon at bottom */}
                              <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between text-white text-[10px] font-bold pointer-events-none drop-shadow">
                                <span className="flex items-center gap-1">
                                  <Play size={10} className="fill-white text-white" />
                                  {toBnNum(views)}
                                </span>
                                <span className="flex items-center gap-0.5">
                                  <Heart size={10} className="fill-white text-white" />
                                  {toBnNum(reel.likes?.length || 0)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: TOUR DETAILS & SETTINGS */}
                {activeTab === 'info' && (
                  <div className="p-3 sm:p-4 space-y-3.5">
                    {/* Bus & Hotel Seat Cards */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-2.5 shadow-2xs">
                        <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                          <Bus size={16} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-400 font-semibold block">বাস সিট নম্বর</span>
                          <span className="font-bold text-slate-800 truncate block">
                            {linkedMember?.seat || profile.seat}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-2.5 shadow-2xs">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                          <Hotel size={16} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-400 font-semibold block">হোটেল রুম</span>
                          <span className="font-bold text-slate-800 truncate block">
                            {linkedMember?.room || profile.room}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Emergency & Medical Info */}
                    <div className="p-3.5 bg-rose-50/80 rounded-2xl border border-rose-200/80 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-rose-900 text-[11px] flex items-center gap-1.5">
                          🚨 জরুরি নিরাপত্তা তথ্য
                        </span>
                        <span className="bg-rose-200 text-rose-900 font-bold px-2 py-0.5 rounded-full text-[10px]">
                          রক্ত: {profile.bloodGroup}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-rose-950">
                        <div>
                          <span className="text-rose-700 block text-[10px]">যোগাযোগকারী:</span>
                          <span className="font-semibold">
                            {profile.emergencyContact || 'পরিবারের সদস্য'}
                          </span>
                        </div>
                        <div>
                          <span className="text-rose-700 block text-[10px]">জরুরি ফোন:</span>
                          {profile.emergencyPhone ? (
                            <a
                              href={`tel:${profile.emergencyPhone}`}
                              className="font-bold text-rose-800 underline flex items-center gap-1"
                            >
                              <Phone size={11} /> {profile.emergencyPhone}
                            </a>
                          ) : (
                            <span className="text-slate-400">তথ্য যুক্ত নেই</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Live Financial Summary */}
                    {memberLedger && (
                      <div className="bg-gradient-to-br from-slate-900 to-teal-950 text-white p-3.5 rounded-2xl border border-teal-800/40 shadow-sm space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-teal-300">
                            <Wallet size={15} />
                            <span>ব্যক্তিগত ফিনান্সিয়াল হিসাব ({linkedMember?.name})</span>
                          </div>
                          {onNavigateToExpenses && (
                            <button
                              type="button"
                              onClick={onNavigateToExpenses}
                              className="text-[10px] text-teal-200 hover:text-white flex items-center gap-0.5 cursor-pointer hover:underline"
                            >
                              সম্পূর্ণ হিসাব <ArrowRight size={10} />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
                            <span className="text-[10px] text-slate-300 block">মোট জমা</span>
                            <span className="text-xs sm:text-sm font-extrabold text-teal-300">
                              ৳{toBnNum(Number(memberLedger.deposit || 0).toLocaleString())}
                            </span>
                          </div>
                          <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
                            <span className="text-[10px] text-slate-300 block">
                              খরচের ভাগ ({toBnNum(memberLedger.familyCount)} জন)
                            </span>
                            <span className="text-xs sm:text-sm font-extrabold text-amber-300">
                              ৳{toBnNum(Number(memberLedger.share || 0).toLocaleString())}
                            </span>
                          </div>
                          <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
                            <span className="text-[10px] text-slate-300 block">
                              {memberLedger.net >= 0 ? 'উদ্বৃত্ত পাবে' : 'বকেয়া দিতে হবে'}
                            </span>
                            <span
                              className={`text-xs sm:text-sm font-extrabold ${
                                memberLedger.net >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              ৳{toBnNum(Math.abs(Number(memberLedger.net || 0)).toLocaleString())}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Official Google Drive Backup Folder Integration */}
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-3 rounded-2xl border border-emerald-200/90 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                          <HardDrive size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-[11px]">অফিশিয়াল গুগল ড্রাইভ ব্যাকআপ</p>
                          <p className="text-[10px] text-emerald-800 truncate">কক্সবাজার ফ্যামিলি ট্যুর ২০২৬ ফোল্ডার</p>
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

                    {/* In-App OTA Update Check */}
                    {isOwnProfile && (
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
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 4. POST DETAIL LIGHTBOX MODAL (When tapping any photo in grid) */}
        {selectedGridPost && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            onClick={() => setSelectedGridPost(null)}
          >
            <div
              className="bg-slate-900 border border-slate-800 text-white rounded-2xl sm:rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh] my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-0.5">
                    <img
                      src={resolveMediaUrl(selectedGridPost.authorPhoto) || resolveMediaUrl(profile.customPhotoURL)}
                      alt={selectedGridPost.author}
                      className="w-full h-full rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="leading-tight min-w-0">
                    <h5 className="font-bold text-xs sm:text-sm text-white truncate">
                      {selectedGridPost.author}
                    </h5>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                      <MapPin size={10} className="text-pink-400 shrink-0" />
                      {selectedGridPost.location || 'কক্সবাজার'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedGridPost(null)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Image Canvas with Carousel Next/Prev */}
              <div className="relative aspect-[4/5] bg-black flex items-center justify-center overflow-hidden">
                {(() => {
                  const images = getPostImages(selectedGridPost);
                  const activeImg = images[lightboxImgIdx] || photoSource(selectedGridPost);

                  return (
                    <>
                      <ProgressiveImage
                        src={activeImg}
                        thumb={selectedGridPost.thumb}
                        driveFileId={selectedGridPost.driveFileIds?.[lightboxImgIdx] || selectedGridPost.driveFileId}
                        alt={selectedGridPost.caption || 'Post image'}
                        className="w-full h-full object-contain pointer-events-none select-none"
                        style={{ filter: getFilterCss(selectedGridPost.filter) }}
                      />

                      {images.length > 1 && (
                        <>
                          {lightboxImgIdx > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerHaptic('light');
                                setLightboxImgIdx((prev) => Math.max(0, prev - 1));
                              }}
                              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center transition hover:bg-black/80 cursor-pointer"
                            >
                              <ChevronLeft size={18} />
                            </button>
                          )}

                          {lightboxImgIdx < images.length - 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerHaptic('light');
                                setLightboxImgIdx((prev) => Math.min(images.length - 1, prev + 1));
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center transition hover:bg-black/80 cursor-pointer"
                            >
                              <ChevronRight size={18} />
                            </button>
                          )}

                          <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded-full pointer-events-none">
                            {toBnNum(lightboxImgIdx + 1)} / {toBnNum(images.length)}
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Caption & Stats */}
              <div className="p-3 sm:p-4 space-y-2 border-t border-slate-800 bg-slate-900/90 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-bold text-pink-400">
                      <Heart size={14} className="fill-pink-400 text-pink-400" />
                      {toBnNum(selectedGridPost.likes?.length || 0)} লাইক
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <MessageCircle size={14} />
                      {toBnNum(selectedGridPost.comments?.length || 0)} মন্তব্য
                    </span>
                  </div>

                  {onNavigateToFeed && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGridPost(null);
                        onClose();
                        onNavigateToFeed();
                      }}
                      className="px-2.5 py-1 bg-teal-800 hover:bg-teal-700 text-teal-100 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      ফিডে দেখুন <ArrowRight size={12} />
                    </button>
                  )}
                </div>

                {selectedGridPost.caption && (
                  <p className="text-slate-200 text-xs leading-relaxed line-clamp-3">
                    <strong className="text-white mr-1.5">{selectedGridPost.author}</strong>
                    {selectedGridPost.caption}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 5. REEL PLAYER POPUP (When tapping any reel in grid) */}
        {selectedReel && (
          <div
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            onClick={() => setSelectedReel(null)}
          >
            <div
              className="bg-black border border-slate-800 text-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh] my-auto relative aspect-[9/16]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedReel(null)}
                className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center transition hover:bg-black/80 cursor-pointer shadow-lg"
              >
                <X size={18} />
              </button>

              {/* Video Player */}
              <video
                src={resolveMediaUrl(selectedReel.videoUrl || selectedReel.video, selectedReel.driveFileId)}
                poster={resolveMediaUrl(selectedReel.thumb, selectedReel.driveFileId)}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />

              {/* Bottom Caption Overlay */}
              <div className="absolute bottom-12 left-3 right-3 z-20 pointer-events-none drop-shadow-md">
                <p className="text-xs font-bold text-white mb-0.5">
                  @{selectedReel.author}
                </p>
                <p className="text-[11px] text-slate-200 line-clamp-2">
                  {selectedReel.caption}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
