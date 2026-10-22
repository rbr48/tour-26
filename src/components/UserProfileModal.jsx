import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
  Pin,
  Volume2,
  VolumeX,
  Share2,
  Tag,
  Award,
  Copy,
  Check,
  Smile,
  Send,
  Download,
  Info,
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

const STORY_HIGHLIGHTS = [
  { id: 'all', label: 'সব পোস্ট', emoji: '🌟', keywords: [] },
  { id: 'beach', label: 'সি-বিচ', emoji: '🏖️', keywords: ['বিচ', 'sea', 'beach', 'পানি', 'সৈকত', 'সাগর', 'ঢেউ'] },
  { id: 'food', label: 'সী-ফুড', emoji: '🦐', keywords: ['ফুড', 'খাবার', 'মাছ', 'কাঁকড়া', 'রূপচাঁদা', 'ডিনার', 'লাঞ্চ', 'রেস্তোরাঁ', 'চা'] },
  { id: 'bus', label: 'বাস জার্নি', emoji: '🚌', keywords: ['বাস', 'জার্নি', 'হাইওয়ে', 'যাত্রা', 'রোড', 'যাত্রা'] },
  { id: 'sunset', label: 'সানসেট', emoji: '🌅', keywords: ['সানসেট', 'সূর্যাস্ত', 'বিকেল', 'সন্ধ্যা', 'গোধূলি'] },
  { id: 'hotel', label: 'সি মুন', emoji: '🏨', keywords: ['হোটেল', 'রুম', 'সি মুন', 'বিশ্রাম', 'হোস্টেল'] },
  { id: 'party', label: 'আড্ডা', emoji: '🎉', keywords: ['আড্ডা', 'গান', 'আনন্দ', 'মজা', 'হাসি', 'খেলা'] },
];

const NOTE_PRESETS = [
  { text: '🌊 কক্সবাজারের হাওয়ায় মন ভালো!', emoji: '🌊' },
  { text: '🦐 রূপচাঁদা ফ্রাই খুঁজছি...', emoji: '🦐' },
  { text: '🚌 সুপার বাস জার্নি ভাইব!', emoji: '🚌' },
  { text: '📸 বেস্ট ফটো তোলার অপেক্ষায়!', emoji: '📸' },
  { text: '🏨 সি মুনের বারান্দায় কফি...', emoji: '☕' },
  { text: '😴 একটু পাওয়ার ন্যাপ দরকার!', emoji: '😴' },
  { text: '🌅 সানসেট দেখার পারফেক্ট টাইম!', emoji: '🌅' },
];

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
  onLikePost,
  onAddComment,
  onNavigateToExpenses,
  onNavigateToFeed,
  onSaveProfile,
  onOpenUpdateModal,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'reels' | 'tagged' | 'info'
  const [selectedGridPost, setSelectedGridPost] = useState(null);
  const [selectedReel, setSelectedReel] = useState(null);
  const [lightboxImgIdx, setLightboxImgIdx] = useState(0);
  const [activeHighlight, setActiveHighlight] = useState('all');

  // Interactive Lightbox State
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [inlineComment, setInlineComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Profile Share Card Modal
  const [showShareCard, setShowShareCard] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // 24-Hour Note Modal & State
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [currentNote, setCurrentNote] = useState(() => {
    try {
      const email = (targetUser?.email || currentUser?.email || 'guest').toLowerCase();
      const saved = localStorage.getItem(`tour2026_note_${email}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return null;
  });

  // Pinned Posts State (stored in localStorage)
  const userStorageKey = useMemo(() => {
    const email = (targetUser?.email || currentUser?.email || 'user').toLowerCase().trim();
    return `tour2026_pinned_posts_${email}`;
  }, [targetUser, currentUser]);

  const [pinnedPostIds, setPinnedPostIds] = useState(() => {
    try {
      const saved = localStorage.getItem(userStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const togglePinPost = useCallback((postId) => {
    setPinnedPostIds((prev) => {
      let updated;
      if (prev.includes(postId)) {
        updated = prev.filter((id) => id !== postId);
      } else {
        if (prev.length >= 3) {
          alert('আপনি সর্বোচ্চ ৩টি পোস্ট পিন করতে পারবেন');
          return prev;
        }
        updated = [...prev, postId];
      }
      try {
        localStorage.setItem(userStorageKey, JSON.stringify(updated));
      } catch {
        // ignore
      }
      triggerHaptic('medium');
      return updated;
    });
  }, [userStorageKey]);

  // Ambient Beach Ocean Waves Web Audio Synthesizer
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioContextRef = useRef(null);
  const audioNodesRef = useRef(null);

  const toggleBeachAudio = useCallback(() => {
    if (isAudioPlaying) {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
        audioNodesRef.current = null;
      }
      setIsAudioPlaying(false);
      triggerHaptic('light');
    } else {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        // Generate pink-noise ocean wave simulator
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        // Lowpass filter for deep ocean rumble
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(320, ctx.currentTime);

        // Low-frequency oscillator (LFO) for wave swells (~0.12 Hz wave cycle)
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.12, ctx.currentTime);

        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(200, ctx.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        // Master Gain for smooth beach volume
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.18, ctx.currentTime);

        whiteNoise.connect(filter);
        filter.connect(masterGain);
        masterGain.connect(ctx.destination);

        whiteNoise.start(0);
        lfo.start(0);

        audioNodesRef.current = { whiteNoise, lfo, filter, masterGain };
        setIsAudioPlaying(true);
        triggerHaptic('medium');
      } catch (err) {
        console.warn('Web Audio Ocean Wave could not start:', err);
      }
    }
  }, [isAudioPlaying]);

  // Stop ambient beach audio when modal unmounts or closes
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
        audioNodesRef.current = null;
      }
    };
  }, []);

  // Back Button Handlers (priority order)
  useBackHandler(Boolean(showShareCard), () => setShowShareCard(false), 29);
  useBackHandler(Boolean(showNoteModal), () => setShowNoteModal(false), 29);
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

  // OTA update check
  const handleCheckUpdateManual = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatusMsg('');
    try {
      const info = await checkForAppUpdate();
      if (info?.hasUpdate) {
        onOpenUpdateModal?.(info);
      } else {
        setUpdateStatusMsg(`✓ অ্যাপটি আপ-টু-ডেট আছে (v${info?.currentVersion || '2.25'})`);
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

  // Tagged posts: posts where this user was tagged in taggedMembers
  const taggedPosts = useMemo(() => {
    return (posts || []).filter((p) => {
      if (!p.taggedMembers || !Array.isArray(p.taggedMembers)) return false;
      return p.taggedMembers.some((tm) => {
        const tmStr = String(tm || '').trim().toLowerCase();
        return (
          (targetName && tmStr === targetName) ||
          (targetEmail && tmStr === targetEmail) ||
          (profile.nickname && tmStr === profile.nickname.trim().toLowerCase())
        );
      });
    });
  }, [posts, targetName, targetEmail, profile.nickname]);

  // Separate regular photo posts and reels
  const photoPosts = useMemo(() => {
    return userPosts.filter((p) => !p.video && !p.videoUrl && !p.isReel);
  }, [userPosts]);

  const reelPosts = useMemo(() => {
    return userPosts.filter((p) => Boolean(p.video || p.videoUrl || p.isReel));
  }, [userPosts]);

  // Filter photo posts based on active Story Highlight filter
  const filteredPhotoPosts = useMemo(() => {
    let list = photoPosts;
    if (activeHighlight !== 'all') {
      const hl = STORY_HIGHLIGHTS.find((h) => h.id === activeHighlight);
      if (hl && hl.keywords.length > 0) {
        list = photoPosts.filter((p) => {
          const text = `${p.caption || ''} ${p.location || ''}`.toLowerCase();
          return hl.keywords.some((kw) => text.includes(kw));
        });
      }
    }
    // Sort pinned posts first
    return [...list].sort((a, b) => {
      const isAPinned = pinnedPostIds.includes(a.id);
      const isBPinned = pinnedPostIds.includes(b.id);
      if (isAPinned && !isBPinned) return -1;
      if (!isAPinned && isBPinned) return 1;
      return 0;
    });
  }, [photoPosts, activeHighlight, pinnedPostIds]);

  // Total likes received across all user's content
  const totalLikesReceived = useMemo(() => {
    return userPosts.reduce((acc, p) => acc + (Array.isArray(p.likes) ? p.likes.length : 0), 0);
  }, [userPosts]);

  // Dynamic Badges & Trophies Cabinet
  const badges = useMemo(() => {
    const list = [];
    if (userPosts.length >= 5) {
      list.push({ id: 'photo_master', label: '📸 ফটোগ্রাফার', desc: '৫+ পোস্ট শেয়ার করেছেন', color: 'from-amber-400 to-orange-500' });
    }
    if (reelPosts.length >= 2) {
      list.push({ id: 'reel_star', label: '🎬 রিলস ডিরেক্টর', desc: '২+ ভিডিও রিলস আপলোড', color: 'from-fuchsia-500 to-pink-500' });
    }
    if (totalLikesReceived >= 10) {
      list.push({ id: 'popular', label: '💖 স্টার ট্রাভেলার', desc: '১০+ লাইক পেয়েছেন', color: 'from-rose-500 to-red-500' });
    }
    if (taggedPosts.length >= 2) {
      list.push({ id: 'team_player', label: '👥 টিম প্লেয়ার', desc: 'অন্যদের ছবিতে ট্যাগড', color: 'from-cyan-400 to-blue-500' });
    }
    if (profile.role === 'কো-অর্ডিনেটর' || profile.role === 'এডমিন') {
      list.push({ id: 'leader', label: '👑 ট্যুর লিডার', desc: 'ভ্রমণ সমন্বয়ক ও দায়িত্বশীল', color: 'from-yellow-400 to-amber-600' });
    }
    if (profile.bloodGroup && profile.bloodGroup !== 'জানা নেই') {
      list.push({ id: 'blood_donor', label: '🩸 লাইফ সেভার', desc: `রক্তের গ্রুপ: ${profile.bloodGroup}`, color: 'from-red-500 to-rose-700' });
    }
    if (profile.room && profile.room !== 'হোটেল সি মুন') {
      list.push({ id: 'resident', label: '🏨 সি মুন রেসিডেন্ট', desc: `রুম: ${profile.room}`, color: 'from-emerald-400 to-teal-600' });
    }
    return list;
  }, [userPosts.length, reelPosts.length, totalLikesReceived, taggedPosts.length, profile.role, profile.bloodGroup, profile.room]);

  // Double tap to like in Lightbox
  const lastTapRef = useRef(0);
  const handleImageTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap detected
      if (selectedGridPost && onLikePost) {
        onLikePost(selectedGridPost.id);
        setShowHeartBurst(true);
        triggerHaptic('heavy');
        setTimeout(() => setShowHeartBurst(false), 800);
      }
    }
    lastTapRef.current = now;
  }, [selectedGridPost, onLikePost]);

  // Inline comment submission inside profile lightbox
  const handleSubmitInlineComment = async (e) => {
    e.preventDefault();
    if (!inlineComment.trim() || !selectedGridPost || !onAddComment) return;
    setIsSubmittingComment(true);
    try {
      await onAddComment(selectedGridPost.id, inlineComment.trim());
      setInlineComment('');
      triggerHaptic('success');
    } catch (err) {
      console.error('Comment submission error:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Save 24-Hour Note
  const handleSaveNote = (text) => {
    const email = (targetUser?.email || currentUser?.email || 'guest').toLowerCase();
    const newNote = {
      text,
      timestamp: Date.now(),
    };
    setCurrentNote(newNote);
    try {
      localStorage.setItem(`tour2026_note_${email}`, JSON.stringify(newNote));
    } catch {
      // ignore
    }
    setShowNoteModal(false);
    triggerHaptic('success');
  };

  // Avatar upload
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedBase64 = await compressImageFile(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.8,
      });

      setProfile((prev) => ({ ...prev, customPhotoURL: compressedBase64 }));
      setPhotoLoadError(false);
      setPhotoNotification('ছবি প্রস্তুত! সেভ বাটনে চাপুন।');
    } catch {
      setPhotoNotification('ছবি প্রসেস করতে ব্যর্থ হয়েছে');
    }
  };

  // Form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!onSaveProfile) return;

    onSaveProfile({
      ...profile,
      memberId: profile.memberId ? Number(profile.memberId) : null,
    });

    setSavedSuccess(true);
    setIsEditing(false);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER BAR */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/95 sticky top-0 z-20 backdrop-blur-xs">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>@{profile.nickname || (profile.displayName || '').replace(/\s+/g, '_').toLowerCase() || 'traveler'}</span>
              {profile.role === 'কো-অর্ডিনেটর' && (
                <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px]" title="ভেরিফাইড ট্যুর কো-অর্ডিনেটর">
                  ✓
                </span>
              )}
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Ambient Beach Wave Audio Synthesizer Toggle */}
            <button
              type="button"
              onClick={toggleBeachAudio}
              className={`p-2 rounded-full transition flex items-center gap-1 text-xs font-semibold cursor-pointer ${
                isAudioPlaying
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm shadow-teal-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title={isAudioPlaying ? 'বিচ অডিও বন্ধ করুন' : 'বিচ অডিও শুনুন (Cox’s Bazar Waves)'}
            >
              {isAudioPlaying ? (
                <>
                  <Volume2 size={16} className="text-teal-400 animate-pulse" />
                  <span className="hidden sm:inline text-[11px] font-mono">লাইভ বিচ</span>
                  <div className="flex items-end gap-0.5 h-3 ml-0.5">
                    <span className="w-0.5 bg-teal-400 h-full animate-[bounce_1s_infinite_100ms]" />
                    <span className="w-0.5 bg-teal-400 h-2/3 animate-[bounce_1s_infinite_300ms]" />
                    <span className="w-0.5 bg-teal-400 h-4/5 animate-[bounce_1s_infinite_200ms]" />
                  </div>
                </>
              ) : (
                <VolumeX size={16} />
              )}
            </button>

            {/* Profile Share Card Button */}
            <button
              type="button"
              onClick={() => {
                setShowShareCard(true);
                triggerHaptic('light');
              }}
              className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title="প্রোফাইল শেয়ার কার্ড"
            >
              <Share2 size={16} />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              aria-label="বন্ধ করুন"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 pb-8 scrollbar-thin scrollbar-thumb-slate-700">
          {/* 1. TOP PROFILE HERO SECTION */}
          <div className="p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Avatar with Story Ring & Instagram Note Bubble */}
              <div className="relative shrink-0">
                {/* 24-hr Note Bubble */}
                {currentNote && !isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      if (isOwnProfile) setShowNoteModal(true);
                    }}
                    className="absolute -top-7 -left-2 z-10 max-w-[130px] bg-slate-800/95 border border-teal-500/40 text-teal-200 text-[10px] font-medium px-2 py-1 rounded-2xl rounded-bl-xs shadow-lg backdrop-blur-xs flex items-center gap-1 truncate hover:border-teal-400 transition cursor-pointer"
                  >
                    <span>{currentNote.text}</span>
                  </button>
                )}

                {/* Add Note Button if own profile & no note */}
                {!currentNote && isOwnProfile && !isEditing && (
                  <button
                    type="button"
                    onClick={() => setShowNoteModal(true)}
                    className="absolute -top-5 -left-1 z-10 bg-slate-800/90 border border-slate-700 text-slate-400 hover:text-teal-300 text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow cursor-pointer"
                  >
                    <Smile size={10} /> + নোট
                  </button>
                )}

                {/* Instagram Gradient Ring */}
                <div className="p-1 rounded-full bg-gradient-to-tr from-amber-500 via-pink-500 to-teal-400 shadow-md shadow-pink-500/20">
                  <div className="p-0.5 bg-slate-900 rounded-full">
                    {profile.customPhotoURL && !photoLoadError ? (
                      <img
                        src={profile.customPhotoURL}
                        alt={profile.displayName}
                        onError={() => setPhotoLoadError(true)}
                        className="w-18 h-18 sm:w-20 sm:h-20 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-slate-800 flex items-center justify-center text-3xl sm:text-4xl select-none">
                        {profile.avatarEmoji || '👑'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Edit avatar overlay if editing */}
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-full shadow-lg border-2 border-slate-900 transition cursor-pointer"
                    title="ছবি পরিবর্তন করুন"
                  >
                    <Camera size={14} />
                  </button>
                )}
              </div>

              {/* Stats Counters (Instagram Grid/Likes/Tagged/Money) */}
              <div className="flex-1 grid grid-cols-4 gap-1 text-center">
                <div className="p-1">
                  <div className="text-base sm:text-lg font-extrabold text-white font-mono">
                    {toBnNum(userPosts.length)}
                  </div>
                  <div className="text-[10px] text-slate-400">পোস্ট</div>
                </div>

                <div className="p-1">
                  <div className="text-base sm:text-lg font-extrabold text-pink-400 font-mono">
                    {toBnNum(totalLikesReceived)}
                  </div>
                  <div className="text-[10px] text-slate-400">লাইক</div>
                </div>

                <div className="p-1">
                  <div className="text-base sm:text-lg font-extrabold text-teal-400 font-mono">
                    {toBnNum(taggedPosts.length)}
                  </div>
                  <div className="text-[10px] text-slate-400">ট্যাগড</div>
                </div>

                <div className="p-1">
                  <div className={`text-base sm:text-lg font-extrabold font-mono ${
                    (memberLedger?.balance || 0) < 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {memberLedger ? `${toBnNum(Math.abs(Math.round(memberLedger.balance / 100)))}৳` : '০৳'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {(memberLedger?.balance || 0) < 0 ? 'বকেয়া' : 'ব্যালেন্স'}
                  </div>
                </div>
              </div>
            </div>

            {/* Name, Role & Bio */}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-white">
                  {profile.displayName || 'নাম নেই'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-900/60 text-teal-300 border border-teal-700/50">
                  {profile.role || 'সদস্য'}
                </span>
              </div>

              <div className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                {profile.room && (
                  <span className="flex items-center gap-1 text-slate-400">
                    <Hotel size={12} className="text-teal-400" /> {profile.room}
                  </span>
                )}
                {profile.seat && (
                  <span className="flex items-center gap-1 text-slate-400">
                    <Bus size={12} className="text-amber-400" /> {profile.seat}
                  </span>
                )}
                {profile.bloodGroup && (
                  <span className="flex items-center gap-1 text-rose-400 font-bold">
                    🩸 {profile.bloodGroup}
                  </span>
                )}
              </div>
            </div>

            {/* Profile Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              {isOwnProfile ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(!isEditing);
                      triggerHaptic('light');
                    }}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
                  >
                    <Edit3 size={14} />
                    {isEditing ? 'ভিউ মোড' : 'প্রোফাইল এডিট'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowShareCard(true);
                      triggerHaptic('light');
                    }}
                    className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1 border border-slate-700 transition cursor-pointer"
                  >
                    <Share2 size={14} />
                    <span>শেয়ার</span>
                  </button>
                </>
              ) : (
                <>
                  {profile.phone && (
                    <a
                      href={`tel:${profile.phone}`}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-teal-900/30 transition cursor-pointer"
                    >
                      <Phone size={14} />
                      কল করুন ({profile.phone})
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setShowShareCard(true);
                      triggerHaptic('light');
                    }}
                    className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1 border border-slate-700 transition cursor-pointer"
                  >
                    <Share2 size={14} />
                    <span>কার্ড</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 2. STORY HIGHLIGHTS BAR */}
          {!isEditing && (
            <div className="py-2.5 px-4 bg-slate-900/60 overflow-x-auto scrollbar-none flex items-center gap-3">
              {STORY_HIGHLIGHTS.map((hl) => {
                const isActive = activeHighlight === hl.id;
                return (
                  <button
                    key={hl.id}
                    type="button"
                    onClick={() => {
                      setActiveHighlight(hl.id);
                      triggerHaptic('light');
                    }}
                    className="flex flex-col items-center gap-1 shrink-0 group cursor-pointer"
                  >
                    <div
                      className={`w-13 h-13 rounded-full flex items-center justify-center text-xl transition transform active:scale-95 ${
                        isActive
                          ? 'p-0.5 bg-gradient-to-tr from-amber-400 via-pink-500 to-teal-400 shadow-md shadow-pink-500/20'
                          : 'p-0.5 bg-slate-800 border border-slate-700 group-hover:border-slate-500'
                      }`}
                    >
                      <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center">
                        {hl.emoji}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-medium tracking-tight ${
                        isActive ? 'text-teal-300 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {hl.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 3. TROPHIES & BADGES CABINET (If available) */}
          {!isEditing && badges.length > 0 && (
            <div className="px-4 py-3 bg-slate-900/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <Award size={13} className="text-amber-400" /> অর্জনের শোকেস ({toBnNum(badges.length)})
                </span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
                {badges.map((b) => (
                  <div
                    key={b.id}
                    className="shrink-0 px-2.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center gap-1.5 shadow-xs"
                    title={b.desc}
                  >
                    <span className="text-xs font-bold text-slate-200">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. MAIN EDITING VIEW (When Edit Mode is active) */}
          {isEditing ? (
            <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {photoNotification && (
                <div className="p-2.5 bg-teal-900/30 border border-teal-500/40 text-teal-300 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 size={14} /> {photoNotification}
                </div>
              )}

              {/* Emoji avatar selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  প্রোফাইল ব্যাকগ্রাউন্ড ইমোজি
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {AVATAR_OPTIONS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setProfile((p) => ({ ...p, avatarEmoji: item.emoji }))}
                      className={`p-2 rounded-xl border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                        profile.avatarEmoji === item.emoji
                          ? 'bg-teal-900/40 border-teal-500 text-teal-200'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <span className="text-xl">{item.emoji}</span>
                      <span className="text-[10px] font-medium">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Photo URL toggle */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">কাস্টম ফটো লিংক</label>
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="text-xs text-teal-400 hover:underline cursor-pointer"
                  >
                    {showUrlInput ? 'লুকান' : 'লিংক দিন'}
                  </button>
                </div>
                {showUrlInput && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="url"
                      placeholder="https://example.com/avatar.jpg"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (urlInput.trim()) {
                          setProfile((p) => ({ ...p, customPhotoURL: urlInput.trim() }));
                          setUrlInput('');
                          setShowUrlInput(false);
                        }
                      }}
                      className="px-3 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-500 transition cursor-pointer"
                    >
                      যোগ
                    </button>
                  </div>
                )}
              </div>

              {/* Member Link Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  ট্যুর মেম্বার প্রোফাইল লিংক
                </label>
                <select
                  value={profile.memberId ?? ''}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const member = members.find((m) => String(m.id) === String(selectedId));
                    setProfile((prev) => ({
                      ...prev,
                      memberId: selectedId || null,
                      displayName: member?.name || prev.displayName,
                      phone: member?.phone ? String(member.phone) : prev.phone,
                      seat: member?.seat || prev.seat,
                      room: member?.room || prev.room,
                    }));
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 cursor-pointer"
                >
                  <option value="">(কোনো মেম্বার লিংক নেই)</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.phone || 'ফোন নেই'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Form Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">পূর্ণ নাম</label>
                  <input
                    type="text"
                    value={profile.displayName}
                    onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">ডাকনাম / ইউজারনেম</label>
                  <input
                    type="text"
                    value={profile.nickname}
                    onChange={(e) => setProfile((p) => ({ ...p, nickname: e.target.value }))}
                    placeholder="যেমন: shuvo"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">ফোন নম্বর</label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">রক্তের গ্রুপ</label>
                  <select
                    value={profile.bloodGroup}
                    onChange={(e) => setProfile((p) => ({ ...p, bloodGroup: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                  >
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">বাসের সিট</label>
                  <input
                    type="text"
                    value={profile.seat}
                    onChange={(e) => setProfile((p) => ({ ...p, seat: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">হোটেল রুম</label>
                  <input
                    type="text"
                    value={profile.room}
                    onChange={(e) => setProfile((p) => ({ ...p, room: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-teal-900/40 transition cursor-pointer"
                >
                  <Save size={14} /> সেভ করুন
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  বাতিল
                </button>
              </div>
            </form>
          ) : (
            /* 5. INSTAGRAM 4-TAB NAVIGATION (Grid, Reels, Tagged, Info) */
            <div>
              {/* Tab Selector */}
              <div className="flex border-b border-slate-800 bg-slate-900/80 sticky top-0 z-10">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('posts');
                    triggerHaptic('light');
                  }}
                  className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-bold transition border-b-2 cursor-pointer ${
                    activeTab === 'posts'
                      ? 'border-teal-500 text-teal-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Grid3X3 size={16} />
                  <span>পোস্ট</span>
                  <span className="text-[10px] font-mono opacity-80">({toBnNum(filteredPhotoPosts.length)})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('reels');
                    triggerHaptic('light');
                  }}
                  className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-bold transition border-b-2 cursor-pointer ${
                    activeTab === 'reels'
                      ? 'border-fuchsia-500 text-fuchsia-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Film size={16} />
                  <span>রিলস</span>
                  <span className="text-[10px] font-mono opacity-80">({toBnNum(reelPosts.length)})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('tagged');
                    triggerHaptic('light');
                  }}
                  className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-bold transition border-b-2 cursor-pointer ${
                    activeTab === 'tagged'
                      ? 'border-amber-500 text-amber-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Tag size={16} />
                  <span>ট্যাগড</span>
                  <span className="text-[10px] font-mono opacity-80">({toBnNum(taggedPosts.length)})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('info');
                    triggerHaptic('light');
                  }}
                  className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-bold transition border-b-2 cursor-pointer ${
                    activeTab === 'info'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Info size={16} />
                  <span>তথ্য</span>
                </button>
              </div>

              {/* TAB 1: PHOTO POSTS 3x3 GRID */}
              {activeTab === 'posts' && (
                <div>
                  {filteredPhotoPosts.length > 0 ? (
                    <div className="grid grid-cols-3 gap-0.5 sm:gap-1 p-0.5 sm:p-1 bg-slate-950">
                      {filteredPhotoPosts.map((post) => {
                        const images = getPostImages(post);
                        const isMulti = images.length > 1;
                        const isPinned = pinnedPostIds.includes(post.id);

                        return (
                          <div
                            key={post.id}
                            onClick={() => {
                              setSelectedGridPost(post);
                              setLightboxImgIdx(0);
                              triggerHaptic('light');
                            }}
                            className="relative aspect-square bg-slate-900 overflow-hidden group cursor-pointer"
                          >
                            <ProgressiveImage
                              src={photoSource(post)}
                              thumb={post.thumb}
                              driveFileId={post.driveFileId}
                              alt={post.caption || 'User post'}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              style={{ filter: getFilterCss(post.filter) }}
                            />

                            {/* Pinned Post Badge */}
                            {isPinned && (
                              <div className="absolute top-1.5 left-1.5 bg-amber-500/90 text-slate-950 p-1 rounded-full shadow-md z-10">
                                <Pin size={10} className="fill-slate-950" />
                              </div>
                            )}

                            {/* Multi-image carousel indicator */}
                            {isMulti && (
                              <div className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-xs text-white p-1 rounded-md shadow-xs pointer-events-none">
                                <Images size={12} />
                              </div>
                            )}

                            {/* Hover overlay with Like/Comment counts */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 text-white text-xs font-bold pointer-events-none">
                              <span className="flex items-center gap-1">
                                <Heart size={14} className="fill-white" />
                                {post.likes?.length || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle size={14} className="fill-white" />
                                {post.comments?.length || 0}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 px-4 text-center text-slate-500">
                      <ImageIcon size={36} className="mx-auto mb-2 opacity-40 text-teal-400" />
                      <p className="text-xs font-medium">কোনো ছবি পাওয়া যায়নি</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: REELS GRID */}
              {activeTab === 'reels' && (
                <div>
                  {reelPosts.length > 0 ? (
                    <div className="grid grid-cols-3 gap-0.5 sm:gap-1 p-0.5 sm:p-1 bg-slate-950">
                      {reelPosts.map((reel) => {
                        const thumbSrc = resolveMediaUrl(reel.thumb, reel.driveFileId);
                        return (
                          <div
                            key={reel.id}
                            onClick={() => {
                              setSelectedReel(reel);
                              triggerHaptic('light');
                            }}
                            className="relative aspect-[9/16] bg-slate-900 overflow-hidden group cursor-pointer"
                          >
                            {thumbSrc ? (
                              <img
                                src={thumbSrc}
                                alt={reel.caption || 'Reel thumbnail'}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                <Film size={24} className="text-slate-600" />
                              </div>
                            )}

                            {/* Play icon overlay */}
                            <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[11px] font-bold text-white drop-shadow-md">
                              <Play size={12} className="fill-white" />
                              <span>{reel.duration ? formatDuration(reel.duration) : 'রিল'}</span>
                            </div>

                            {/* Hover overlay with Like counts */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold pointer-events-none">
                              <span className="flex items-center gap-1">
                                <Heart size={14} className="fill-white" />
                                {reel.likes?.length || 0}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 px-4 text-center text-slate-500">
                      <Film size={36} className="mx-auto mb-2 opacity-40 text-fuchsia-400" />
                      <p className="text-xs font-medium">কোনো রিলস ভিডিও আপলোড করা হয়নি</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: TAGGED POSTS */}
              {activeTab === 'tagged' && (
                <div>
                  {taggedPosts.length > 0 ? (
                    <div className="grid grid-cols-3 gap-0.5 sm:gap-1 p-0.5 sm:p-1 bg-slate-950">
                      {taggedPosts.map((post) => (
                        <div
                          key={post.id}
                          onClick={() => {
                            setSelectedGridPost(post);
                            setLightboxImgIdx(0);
                            triggerHaptic('light');
                          }}
                          className="relative aspect-square bg-slate-900 overflow-hidden group cursor-pointer"
                        >
                          <ProgressiveImage
                            src={photoSource(post)}
                            thumb={post.thumb}
                            driveFileId={post.driveFileId}
                            alt={post.caption || 'Tagged post'}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            style={{ filter: getFilterCss(post.filter) }}
                          />

                          <div className="absolute bottom-1.5 left-1.5 bg-black/70 backdrop-blur-xs text-amber-300 p-1 rounded-md text-[10px] flex items-center gap-1">
                            <Tag size={10} />
                            <span className="truncate max-w-[60px]">{post.author}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 px-4 text-center text-slate-500">
                      <Tag size={36} className="mx-auto mb-2 opacity-40 text-amber-400" />
                      <p className="text-xs font-medium">এই ব্যবহারকারী কোনো ছবিতে এখনো ট্যাগ হননি</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: MEMBER DETAILS & LEDGER INFO */}
              {activeTab === 'info' && (
                <div className="p-4 space-y-4">
                  {/* Financial Ledger Summary */}
                  {memberLedger && (
                    <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <Wallet size={14} className="text-teal-400" /> ট্যুর ফিন্যান্সিয়াল হিসাব
                        </span>
                        {onNavigateToExpenses && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onNavigateToExpenses();
                            }}
                            className="text-xs text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            বিস্তারিত হিসাব <ArrowRight size={12} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center pt-1">
                        <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                          <div className="text-[10px] text-slate-400">জমা দিয়েছেন</div>
                          <div className="text-xs sm:text-sm font-bold text-emerald-400 font-mono">
                            {toBnNum(Math.round(memberLedger.paid / 100))}৳
                          </div>
                        </div>

                        <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                          <div className="text-[10px] text-slate-400">বরাদ্দ খরচ</div>
                          <div className="text-xs sm:text-sm font-bold text-slate-200 font-mono">
                            {toBnNum(Math.round(memberLedger.share / 100))}৳
                          </div>
                        </div>

                        <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                          <div className="text-[10px] text-slate-400">অবশিষ্ট স্থিতি</div>
                          <div
                            className={`text-xs sm:text-sm font-bold font-mono ${
                              memberLedger.balance < 0 ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {memberLedger.balance < 0
                              ? `-${toBnNum(Math.round(Math.abs(memberLedger.balance) / 100))}৳`
                              : `+${toBnNum(Math.round(memberLedger.balance / 100))}৳`}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Travel & Room Info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                        <Bus size={16} />
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-medium">বাসের সিট</div>
                        <div className="text-xs font-bold text-slate-200">{profile.seat || 'বরাদ্দ করা হয়নি'}</div>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0">
                        <Hotel size={16} />
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-medium">হোটেল রুম</div>
                        <div className="text-xs font-bold text-slate-200">{profile.room || 'বরাদ্দ করা হয়নি'}</div>
                      </div>
                    </div>
                  </div>

                  {/* App Version & OTA Updater */}
                  <div className="p-3.5 rounded-2xl bg-slate-800/30 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-200">অ্যাপ ভার্সন</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {updateStatusMsg || 'Tour 2026 v2.25 (Build 25)'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCheckUpdateManual}
                      disabled={isCheckingUpdate}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition cursor-pointer disabled:opacity-50"
                    >
                      {isCheckingUpdate ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                      আপডেট চেক
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 6. FULLSCREEN INTERACTIVE LIGHTBOX (When tapping any grid photo) */}
        {selectedGridPost && (
          <div
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            onClick={() => setSelectedGridPost(null)}
          >
            <div
              className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[94vh] my-auto relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Lightbox Header */}
              <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-900/90 z-20">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center text-sm font-bold border border-slate-700">
                    {profile.customPhotoURL ? (
                      <img src={profile.customPhotoURL} alt={profile.displayName} className="w-full h-full object-cover" />
                    ) : (
                      profile.avatarEmoji || '👑'
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">
                      {selectedGridPost.author || profile.displayName}
                    </h4>
                    <p className="text-[10px] text-teal-400 flex items-center gap-0.5">
                      <MapPin size={10} />
                      {selectedGridPost.location || 'কক্সবাজার'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Pin/Unpin Post Button */}
                  {isOwnProfile && (
                    <button
                      type="button"
                      onClick={() => togglePinPost(selectedGridPost.id)}
                      className={`p-1.5 rounded-full transition cursor-pointer ${
                        pinnedPostIds.includes(selectedGridPost.id)
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                      title={pinnedPostIds.includes(selectedGridPost.id) ? 'আনপিন করুন' : 'পিন করুন'}
                    >
                      <Pin size={15} />
                    </button>
                  )}

                  {/* Close Lightbox */}
                  <button
                    type="button"
                    onClick={() => setSelectedGridPost(null)}
                    className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Image Canvas with Double-Tap to Like & Carousel Next/Prev */}
              <div
                className="relative aspect-[4/5] bg-black flex items-center justify-center overflow-hidden cursor-pointer select-none"
                onClick={handleImageTap}
              >
                {(() => {
                  const images = getPostImages(selectedGridPost);
                  const activeImg = images[lightboxImgIdx] || photoSource(selectedGridPost);
                  const activeDriveId = selectedGridPost.driveFileIds?.[lightboxImgIdx] || selectedGridPost.driveFileId;
                  const itemThumb = selectedGridPost.thumbs?.[lightboxImgIdx] || (lightboxImgIdx === 0 ? selectedGridPost.thumb : null);

                  return (
                    <>
                      <ProgressiveImage
                        key={`profile-lightbox-${selectedGridPost.id}-${lightboxImgIdx}`}
                        src={activeImg}
                        thumb={itemThumb}
                        driveFileId={activeDriveId}
                        alt={selectedGridPost.caption || 'Post image'}
                        className="w-full h-full object-contain pointer-events-none"
                        style={{ filter: getFilterCss(selectedGridPost.filter) }}
                      />

                      {/* Heart Burst Animation on Double Tap */}
                      {showHeartBurst && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-in zoom-in-50 fade-in duration-200">
                          <Heart size={90} className="fill-pink-500 text-pink-500 drop-shadow-2xl animate-bounce" />
                        </div>
                      )}

                      {/* Next / Previous Carousel Controls */}
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
                              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center transition hover:bg-black/80 cursor-pointer shadow-lg z-20"
                            >
                              <ChevronLeft size={20} />
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
                              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center transition hover:bg-black/80 cursor-pointer shadow-lg z-20"
                            >
                              <ChevronRight size={20} />
                            </button>
                          )}

                          {/* Slide Indicator Badge */}
                          <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded-full pointer-events-none z-20">
                            {toBnNum(lightboxImgIdx + 1)} / {toBnNum(images.length)}
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Lightbox Footer: Likes, Caption & Inline Comment Box */}
              <div className="p-3 sm:p-4 space-y-2.5 border-t border-slate-800 bg-slate-900/95 text-xs">
                {/* Stats & Actions */}
                <div className="flex items-center justify-between text-slate-300">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (onLikePost) {
                          onLikePost(selectedGridPost.id);
                          triggerHaptic('medium');
                        }
                      }}
                      className="flex items-center gap-1 font-bold text-pink-400 hover:scale-105 transition cursor-pointer"
                    >
                      <Heart size={16} className={selectedGridPost.likes?.includes(currentUser?.email) ? 'fill-pink-400 text-pink-400' : ''} />
                      <span>{toBnNum(selectedGridPost.likes?.length || 0)} লাইক</span>
                    </button>

                    <span className="flex items-center gap-1 text-slate-400 font-medium">
                      <MessageCircle size={15} />
                      {toBnNum(selectedGridPost.comments?.length || 0)} মন্তব্য
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* High-res Download Button */}
                    <a
                      href={photoSource(selectedGridPost)}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={`tour2026_${selectedGridPost.id}.jpg`}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      title="ছবি ডাউনলোড বা বড় করে দেখুন"
                    >
                      <Download size={14} />
                    </a>

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
                </div>

                {/* Caption */}
                {selectedGridPost.caption && (
                  <p className="text-slate-200 text-xs leading-relaxed max-h-16 overflow-y-auto">
                    <strong className="text-white mr-1.5">{selectedGridPost.author}</strong>
                    {selectedGridPost.caption}
                  </p>
                )}

                {/* Inline Comment Box */}
                {onAddComment && (
                  <form onSubmit={handleSubmitInlineComment} className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                    <input
                      type="text"
                      placeholder="একটি মন্তব্য লিখুন..."
                      value={inlineComment}
                      onChange={(e) => setInlineComment(e.target.value)}
                      className="flex-1 bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingComment || !inlineComment.trim()}
                      className="p-1.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white rounded-xl transition cursor-pointer"
                    >
                      <Send size={13} />
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 7. REEL PLAYER POPUP */}
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
              <button
                type="button"
                onClick={() => setSelectedReel(null)}
                className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center transition hover:bg-black/80 cursor-pointer shadow-lg"
              >
                <X size={18} />
              </button>

              <video
                src={resolveMediaUrl(selectedReel.videoUrl || selectedReel.video, selectedReel.driveFileId)}
                poster={resolveMediaUrl(selectedReel.thumb, selectedReel.driveFileId)}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />

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

        {/* 8. 24-HOUR NOTE MODAL */}
        {showNoteModal && (
          <div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            onClick={() => setShowNoteModal(false)}
          >
            <div
              className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Smile size={16} className="text-teal-400" /> আপনার ২৪-ঘণ্টার নোট
                </h3>
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  maxLength={60}
                  placeholder="মনের কথা শেয়ার করুন (সর্বোচ্চ ৬০ অক্ষর)..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                />

                <div className="text-[10px] text-slate-400 font-bold mb-1">কুইক প্রিসেট বাছাই করুন:</div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {NOTE_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setNoteText(preset.text)}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded-lg border border-slate-700 cursor-pointer"
                    >
                      {preset.text}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleSaveNote(noteText)}
                  disabled={!noteText.trim()}
                  className="flex-1 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  শেয়ার করুন
                </button>
                {currentNote && (
                  <button
                    type="button"
                    onClick={() => {
                      const email = (targetUser?.email || currentUser?.email || 'guest').toLowerCase();
                      localStorage.removeItem(`tour2026_note_${email}`);
                      setCurrentNote(null);
                      setShowNoteModal(false);
                      triggerHaptic('light');
                    }}
                    className="py-2 px-3 bg-rose-900/40 hover:bg-rose-900 text-rose-300 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    মুছুন
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 9. PROFILE SHARE CARD MODAL */}
        {showShareCard && (
          <div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            onClick={() => setShowShareCard(false)}
          >
            <div
              className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 border border-teal-500/30 text-white rounded-3xl max-w-xs w-full p-6 space-y-4 shadow-2xl relative text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowShareCard(false)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-800/80 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>

              <div className="pt-2">
                <div className="w-20 h-20 mx-auto rounded-full p-1 bg-gradient-to-tr from-amber-400 via-pink-500 to-teal-400 shadow-lg">
                  <div className="w-full h-full bg-slate-900 rounded-full overflow-hidden flex items-center justify-center text-3xl">
                    {profile.customPhotoURL ? (
                      <img src={profile.customPhotoURL} alt={profile.displayName} className="w-full h-full object-cover" />
                    ) : (
                      profile.avatarEmoji || '👑'
                    )}
                  </div>
                </div>

                <h3 className="text-base font-extrabold text-white mt-2.5">
                  {profile.displayName || 'ট্যুর ট্রাভেলার'}
                </h3>
                <p className="text-xs text-teal-400 font-mono">
                  @{profile.nickname || 'tourist'} • {profile.role}
                </p>
              </div>

              {/* Tour Badges Pill */}
              <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-700/60 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>কক্সবাজার ট্যুর ২০২৬</span>
                  <span className="font-bold text-amber-400">{profile.seat}</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>হোটেল সি মুন</span>
                  <span className="font-bold text-teal-400">{profile.room}</span>
                </div>
              </div>

              {/* Share Actions */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const shareUrl = window.location.origin;
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(shareUrl);
                      setCopiedLink(true);
                      triggerHaptic('success');
                      setTimeout(() => setCopiedLink(false), 2000);
                    }
                  }}
                  className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-teal-900/30 transition cursor-pointer"
                >
                  {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedLink ? 'লিংক কপি হয়েছে!' : 'প্রোফাইল লিংক কপি করুন'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
