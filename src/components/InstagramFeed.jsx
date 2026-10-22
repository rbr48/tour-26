import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  MessageCircle,
  Send,
  Share2,
  Download,
  Camera,
  MapPin,
  Plus,
  HardDrive,
  ExternalLink,
  CloudUpload,
  FolderOpen,
  X,
  Check,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Images,
  Film,
  Play,
  Scissors,
  Video,
  Sparkles,
  Clock,
  Edit3,
  Eye,
  Bookmark,
  Grid3X3,
  LayoutList,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Users,
  Tag,
  Calendar,
  WifiOff,
  RefreshCw,
  MessageSquare,
  Compass,
  Utensils,
  ShieldAlert,
  Copy,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useBackHandler } from '../utils/backNavigation';
import VideoTrimmerModal from './VideoTrimmerModal';
import ReelsPlayerModal from './ReelsPlayerModal';
import StoryViewerModal from './StoryViewerModal';
import InstagramCommentSheet from './InstagramCommentSheet';
import InstagramPostCard from './InstagramPostCard';
import UserAvatar from './UserAvatar';
import { triggerHaptic } from '../utils/haptics';
import { formatDuration, PRODUCTION_ORIGIN, resolveMediaUrl } from '../utils/videoHelper';
import { saveLocalVideo } from '../utils/localVideoCache';
import { uploadReelVideo, uploadMedia } from '../utils/reelUploader';
import { uploadWithQueue } from '../utils/uploadQueue';
import ProgressiveImage from './ProgressiveImage';
import { compressImageFile } from '../utils/imageCompressor';
import {
  getDriveAccessToken,
  getAppsScriptWebhook,
  GOOGLE_DRIVE_FOLDER_URL,
  uploadToGoogleDrive,
} from '../services/googleDriveService';
import {
  isDataImage,
  makeThumbnail,
  preparePhotoFromDataUrl,
  preparePhotoFromUrl,
  syncLegacyPhotoToDrive,
} from '../services/photos';
import { newId } from '../services/tourStore';
import { connectGoogleDrive } from '../firebase';
import {
  TOUR_DAYS,
  getTourDayById,
  getPostTourDay,
  getSuggestedTourLocation,
  getCurrentTourDay,
} from '../utils/tourSchedule';
import {
  enqueueOfflinePost,
  getOfflineQueue,
  drainOfflineQueue,
  registerAutoDrain,
} from '../utils/offlineQueue';

// Instagram Preset CSS Filters
export const IG_FILTERS = [
  { id: 'normal', name: 'Normal', css: 'none', label: 'নরমাল' },
  { id: 'clarendon', name: 'Clarendon', css: 'contrast(1.2) saturate(1.25)', label: 'ক্ল্যারেন্ডন' },
  { id: 'juno', name: 'Juno', css: 'contrast(1.15) saturate(1.3) brightness(1.04)', label: 'জুনো' },
  { id: 'valencia', name: 'Valencia', css: 'contrast(1.08) brightness(1.08) sepia(0.18)', label: 'ভ্যালেন্সিয়া' },
  { id: 'lark', name: 'Lark', css: 'contrast(0.95) brightness(1.12) saturate(1.15)', label: 'লার্ক' },
  { id: 'sunset', name: 'Sunset', css: 'sepia(0.22) saturate(1.35) contrast(1.12)', label: 'সূর্যাস্ত' },
  { id: 'moon', name: 'Moon (B&W)', css: 'grayscale(1) contrast(1.15) brightness(1.05)', label: 'মুন' },
  { id: 'vintage', name: 'Vintage', css: 'sepia(0.35) contrast(0.95) brightness(0.95)', label: 'ভিন্টেজ' },
];

export const getFilterCss = (filterId) => {
  const match = IG_FILTERS.find((f) => f.id === filterId);
  return match ? match.css : 'none';
};

// Bengali numeral formatter
export const toBnNum = (n) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);

// Extract all images from a post (carousel or single)
export function isSafeMediaUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('data:image/')) return true;
  if (trimmed.startsWith('blob:')) return true;
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.startsWith('/') || trimmed.startsWith('uploads/')) {
    return true;
  }
  return false;
}

export const getPostImages = (post) => {
  if (!post) return [];
  if (Array.isArray(post.images) && post.images.length > 0) {
    const list = post.images
      .filter((img) => typeof img === 'string' && isSafeMediaUrl(img))
      .map((img, idx) => {
        if (img.includes('drive.google.com/file/d/')) {
          const m = img.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
          if (m && m[1]) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1600`;
        }
        const itemDriveId = post.driveFileIds?.[idx] || post.driveFileId;
        return resolveMediaUrl(img, itemDriveId);
      })
      .filter(Boolean);
    if (list.length > 0) return list;
  }
  const single = photoSource(post);
  return single ? [single] : [];
};

export const photoSource = (post) => {
  if (!post) return null;
  let raw = null;
  if (Array.isArray(post.images) && post.images.length > 0 && typeof post.images[0] === 'string' && !post.images[0].includes('drive.google.com/file/d/')) {
    raw = post.images[0];
  } else if (post.thumb && typeof post.thumb === 'string') {
    raw = post.thumb;
  } else if (post.image && typeof post.image === 'string' && !post.image.includes('drive.google.com/file/d/')) {
    raw = post.image;
  } else if (post.photo && typeof post.photo === 'string') {
    raw = post.photo;
  } else if (post.url && typeof post.url === 'string') {
    raw = post.url;
  } else if (post.imageUrl && typeof post.imageUrl === 'string') {
    raw = post.imageUrl;
  } else if (post.driveFileId) {
    return `https://drive.google.com/thumbnail?id=${post.driveFileId}&sz=w1600`;
  } else {
    raw = post.image || post.thumb || null;
  }

  // Handle raw Google Drive file links
  if (typeof raw === 'string' && raw.includes('drive.google.com/file/d/')) {
    const match = raw.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1600`;
    }
  }

  const resolved = resolveMediaUrl(raw, post.driveFileId);
  return isSafeMediaUrl(resolved) ? resolved : null;
};

// Preset Default Locations for Tour
const DEFAULT_LOCATIONS = [
  'লাবণী ও সুগন্ধা বিচ, কক্সবাজার',
  'হোটেল সি মুন (Hotel Sea Moon)',
  'এভারগ্রীন এসি বাস (রংপুর ➔ কক্সবাজার)',
  'বিআরটিসি ছাদখোলা দোতলা বাস',
  'হিমছড়ি পাহাড় ও ঝর্ণা',
  'ইনানী পাথুরে প্রবাল সৈকত',
  'পটুয়ারটেক বিচ পয়েন্ট',
  'সাবরাং জিরো পয়েন্ট (টেকনাফ)',
  'মহেশখালী আদিনাথ মন্দির ও মিষ্টি পানের বরজ',
  'নুনিয়াছড়া ঘাট ও বাঁকখালী নদী ট্রলার',
  'বার্মিজ মার্কেট ফ্যামিলি শপিং',
  'রেডিয়েন্ট ফিশ ওয়ার্ল্ড একুরিয়াম'
];

const COMMENT_REACTIONS = ['❤️', '👍', '😂', '🔥', '👏'];

export default function InstagramFeed({
  posts = [],
  currentUser = null,
  currentProfile = {},
  members = [],
  userProfiles = {},
  onAddPost,
  onLikePost,
  onAddComment,
  onDeletePost,
  onUpdatePost,
  onViewPost,
  onCommentReaction,
  onShareToDiscussion = null,
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeStoryFilter, setActiveStoryFilter] = useState('all');
  const [activeTourDayFilter, setActiveTourDayFilter] = useState(() => {
    try {
      return localStorage.getItem('tour_active_day_filter') || 'all';
    } catch {
      return 'all';
    }
  });
  const [previewMedia, setPreviewMedia] = useState(null);
  const [sharingPostId, setSharingPostId] = useState(null);

  // In-app Share Sheet modal state
  const [shareModalPost, setShareModalPost] = useState(null);
  const [shareFeedback, setShareFeedback] = useState('');

  // Lightbox Zoom & Swipe state
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxTouchCoord, setLightboxTouchCoord] = useState({ start: null, end: null });
  const lightboxLastTapRef = useRef(0);

  // Offline Post Upload Queue state
  const [offlineQueueCount, setOfflineQueueCount] = useState(() => {
    try {
      return getOfflineQueue().length;
    } catch {
      return 0;
    }
  });
  const [isDrainingQueue, setIsDrainingQueue] = useState(false);
  const [offlineNotification, setOfflineNotification] = useState('');

  // Deduplicated view tracker per session
  const viewedPostsRef = useRef(new Set());

  const recordPostView = (postId) => {
    if (!postId || !onViewPost) return;
    const strId = String(postId);
    if (viewedPostsRef.current.has(strId)) return;
    try {
      const sessionKey = `tour_viewed_${strId}`;
      if (sessionStorage.getItem(sessionKey)) {
        viewedPostsRef.current.add(strId);
        return;
      }
      sessionStorage.setItem(sessionKey, '1');
    } catch {
      // ignore storage access errors
    }
    viewedPostsRef.current.add(strId);
    onViewPost(postId);
  };

  // New post form state with auto-save draft
  const [caption, setCaption] = useState(() => {
    try {
      return localStorage.getItem('tour_post_draft_caption') || '';
    } catch {
      return '';
    }
  });

  // Tour Day selector and Member Tagging state for new post
  const [selectedTourDay, setSelectedTourDay] = useState('auto');
  const [selectedTaggedMembers, setSelectedTaggedMembers] = useState([]);

  // Custom user locations persisted in localStorage
  const [customLocations, setCustomLocations] = useState(() => {
    try {
      const saved = localStorage.getItem('tour_custom_locations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [location, setLocation] = useState('লাবণী ও সুগন্ধা বিচ');
  const [isCustomLocMode, setIsCustomLocMode] = useState(false);
  const [customLocInput, setCustomLocInput] = useState('');
  const [locationNotification, setLocationNotification] = useState('');

  const [imageInput, setImageInput] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [postError, setPostError] = useState('');
  const [postActiveIndices, setPostActiveIndices] = useState({});
  const [touchCoordinates, setTouchCoordinates] = useState({});

  // Reels State & Handlers
  const [feedSubTab, setFeedSubTab] = useState(() => {
    try {
      return localStorage.getItem('tour_feed_subtab') || 'photos';
    } catch {
      return 'photos';
    }
  });

  const [reelsPlayer, setReelsPlayer] = useState({ isOpen: false, initialIndex: 0 });
  const [createPostMode, setCreatePostMode] = useState('photos'); // 'photos' | 'reel'
  const [videoSourceForTrimmer, setVideoSourceForTrimmer] = useState(null);
  const [showTrimmerModal, setShowTrimmerModal] = useState(false);
  const [trimmedReelData, setTrimmedReelData] = useState(null);
  const [videoUrlInput, setVideoUrlInput] = useState('');

  // Post & Reel Edit State
  const [editingPost, setEditingPost] = useState(null);
  const [editCaption, setEditCaption] = useState('');
  const [editLocation, setEditLocation] = useState('');

  // Instagram Native Modals: Comments Bottom Sheet & Story Viewer
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [storyViewer, setStoryViewer] = useState({ isOpen: false, memberIndex: 0 });

  // Instagram Filter Selection for New Posts
  const [selectedFilter, setSelectedFilter] = useState('normal');

  // Photo Feed View Mode: 'feed' (vertical 4:5 cards) vs 'grid' (3x3 explore mosaic)
  const [photoViewMode, setPhotoViewMode] = useState(() => {
    try {
      return localStorage.getItem('tour_photo_view_mode') || 'feed';
    } catch {
      return 'feed';
    }
  });

  // Saved / Bookmarked Posts
  const [savedPostIds, setSavedPostIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tour_saved_posts') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const handleSavedUpdated = () => {
      try {
        setSavedPostIds(JSON.parse(localStorage.getItem('tour_saved_posts') || '[]'));
      } catch {}
    };
    window.addEventListener('tour_saved_updated', handleSavedUpdated);
    window.addEventListener('storage', handleSavedUpdated);
    return () => {
      window.removeEventListener('tour_saved_updated', handleSavedUpdated);
      window.removeEventListener('storage', handleSavedUpdated);
    };
  }, []);

  const savedPosts = React.useMemo(() => {
    return posts.filter((p) => savedPostIds.includes(p.id));
  }, [posts, savedPostIds]);

  // Group posts by author to construct genuine Instagram Stories
  const membersWithStories = React.useMemo(() => {
    const memberMap = new Map();
    posts.forEach((p) => {
      const author = p.author?.trim();
      if (!author) return;
      if (!memberMap.has(author)) {
        memberMap.set(author, {
          memberName: author,
          authorPhoto: p.authorPhoto,
          posts: [],
        });
      }
      memberMap.get(author).posts.push(p);
    });
    return Array.from(memberMap.values());
  }, [posts]);

  // Extract unique family member names for tagging
  const familyMemberNames = React.useMemo(() => {
    const set = new Set();
    (members || []).forEach((m) => {
      if (!m?.name) return;
      const clean = m.name.split('/')[0].split('(')[0].trim();
      if (clean) set.add(clean);
    });
    return Array.from(set);
  }, [members]);

  // Phone Back Button Handlers for modals inside InstagramFeed
  useBackHandler(storyViewer.isOpen, () => setStoryViewer({ isOpen: false, memberIndex: 0 }), 28);
  useBackHandler(Boolean(shareModalPost), () => setShareModalPost(null), 27);
  useBackHandler(Boolean(activeCommentPost), () => setActiveCommentPost(null), 26);
  useBackHandler(Boolean(previewMedia), () => {
    setPreviewMedia(null);
    setLightboxZoom(1);
  }, 25);
  useBackHandler(Boolean(editingPost), () => setEditingPost(null), 20);
  useBackHandler(showCreateModal, () => setShowCreateModal(false), 15);

  // Discussion Channel Sharing Handler
  const handleShareToDiscussionChannel = (channelId, post) => {
    if (!post) return;
    triggerHaptic('success');
    const authorName = currentProfile?.displayName || currentUser?.displayName || 'পরিবারের সদস্য';
    const profilePhoto = currentProfile?.customPhotoURL || currentProfile?.photoURL || currentUser?.photoURL;
    const media = photoSource(post);

    const shareMessage = {
      id: newId(),
      author: authorName,
      senderEmail: (currentUser?.email || '').toLowerCase() || 'member@tour.family',
      userPhoto: typeof profilePhoto === 'string' && !profilePhoto.startsWith('data:') ? profilePhoto : (currentUser?.photoURL || null),
      text: `📸 [ইনস্টাফিড শেয়ার]\n${post.author}: "${post.caption || 'আনন্দঘন স্মৃতি'}"\n📍 ${post.location || 'কক্সবাজার'}\n\n👉 ফিডে দেখুন: ${window.location.origin}/#feed`,
      photoUrl: media || null,
      time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      reactions: {},
    };

    if (onShareToDiscussion) {
      onShareToDiscussion(channelId, shareMessage);
    }

    setShareFeedback(`✓ #${channelId} চ্যানেলে সফলভাবে শেয়ার করা হয়েছে!`);
    setTimeout(() => {
      setShareFeedback('');
      setShareModalPost(null);
    }, 1200);
  };

  // Offline Upload Queue Drain Handler
  const handleDrainOfflineQueue = async () => {
    if (isDrainingQueue) return;
    setIsDrainingQueue(true);
    setOfflineNotification('অফলাইন পোস্ট আপলোড হচ্ছে...');
    try {
      await drainOfflineQueue(async (queuedPost) => {
        await onAddPost(queuedPost);
      });
      const remaining = getOfflineQueue().length;
      setOfflineQueueCount(remaining);
      if (remaining === 0) {
        setOfflineNotification('✓ সব অফলাইন পোস্ট সফলভাবে আপলোড সম্পন্ন হয়েছে!');
      } else {
        setOfflineNotification(`⚠️ এখনও ${remaining}টি পোস্ট বাকি রয়েছে`);
      }
    } catch (err) {
      console.warn('Queue drain error:', err);
      setOfflineNotification('আপলোড করার সময় সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsDrainingQueue(false);
      setTimeout(() => setOfflineNotification(''), 3500);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      const q = getOfflineQueue();
      setOfflineQueueCount(q.length);
      if (q.length > 0) {
        handleDrainOfflineQueue();
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const handleStartEditPost = (post) => {
    setEditingPost(post);
    setEditCaption(post.caption || '');
    setEditLocation(post.location || '');
  };

  const handleSavePostEdit = (e) => {
    e.preventDefault();
    if (!editingPost) return;
    onUpdatePost?.(editingPost.id, {
      caption: editCaption.trim(),
      location: editLocation.trim(),
    });
    setEditingPost(null);
  };

  const handleVideoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024 * 1024) {
      alert('ভিডিও ফাইলটি ৫০০ MB এর চেয়ে বড়। অনুগ্রহ করে কিছুটা ছোট ফাইল নির্বাচন করুন।');
      e.target.value = '';
      return;
    }

    setVideoSourceForTrimmer(file);
    setShowTrimmerModal(true);
    e.target.value = '';
  };

  const handleVideoUrlConfirm = () => {
    const url = videoUrlInput.trim();
    if (!url) return;
    setVideoSourceForTrimmer(url);
    setShowTrimmerModal(true);
  };

  // Google Drive state & handlers
  const [isDriveUploading, setIsDriveUploading] = useState(false);
  const [hasDriveToken, setHasDriveToken] = useState(() => Boolean(getDriveAccessToken()));
  const [driveNotification, setDriveNotification] = useState('');
  const [manualDriveUploadId, setManualDriveUploadId] = useState(null);
  const [isBatchSyncing, setIsBatchSyncing] = useState(false);
  const [batchSyncProgress, setBatchSyncProgress] = useState('');
  const [isUploadingReel, setIsUploadingReel] = useState(false);
  const [reelUploadProgress, setReelUploadProgress] = useState(null);

  const handleConnectDrive = async () => {
    try {
      setDriveNotification('গুগলে লগইন ও ড্রাইভ কানেক্ট হচ্ছে...');
      const res = await connectGoogleDrive();
      if (res?.success) {
        setHasDriveToken(true);
        setDriveNotification('✓ গুগল ড্রাইভ সফলভাবে সংযুক্ত হয়েছে!');
        setTimeout(() => setDriveNotification(''), 3000);
        return res;
      }
    } catch (err) {
      console.error('Drive connection error:', err);
      setDriveNotification('ড্রাইভ কানেকশন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
      setTimeout(() => setDriveNotification(''), 3500);
    }
    return null;
  };

  const isDriveConfigured = Boolean(getAppsScriptWebhook() || hasDriveToken);

  const handleManualDriveBackup = async (post) => {
    setManualDriveUploadId(post.id);
    try {
      const result = await syncLegacyPhotoToDrive({ image: post.image, caption: post.caption });
      onUpdatePost?.(post.id, result, { remove: ['image'] });
      alert('গুগল ড্রাইভে ছবিটি সফলভাবে সংরক্ষিত হয়েছে!\n\nফোল্ডার: কক্সবাজার ফ্যামিলি ট্যুর ২০২৬');
    } catch (err) {
      if (err.message === 'NO_TOKEN' || err.message === 'TOKEN_EXPIRED') {
        const proceed = confirm('গুগল ড্রাইভ ফোল্ডারে ফাইল আপলোড করার জন্য অনুমোদন প্রয়োজন। আপনি কি এখন ড্রাইভ এক্সেস অনুমোদন করতে চান?');
        if (proceed) {
          const authRes = await handleConnectDrive();
          if (authRes?.success) {
            setTimeout(() => handleManualDriveBackup(post), 600);
          }
        }
      } else {
        alert('গুগল ড্রাইভ আপলোড ব্যর্থ: ' + err.message);
      }
    } finally {
      setManualDriveUploadId(null);
    }
  };

  const handleSyncAllToDrive = async () => {
    // Only photos that still exist only inside the trip data need uploading.
    const unsyncedPosts = posts.filter(p => !p.driveBackedUp && isDataImage(p.image));
    if (unsyncedPosts.length === 0) {
      alert('সব ছবি ইতিমধ্যে গুগল ড্রাইভে সংরক্ষিত আছে! ✅');
      return;
    }

    if (!isDriveConfigured) {
      const proceed = confirm(`মোট ${unsyncedPosts.length}টি ছবি ড্রাইভে ব্যাকআপ করা হবে। অনুগ্রহ করে ড্রাইভ অনুমোদনের জন্য আপনার গুগল অ্যাকাউন্ট কানেক্ট করুন।`);
      if (!proceed) return;
      const res = await connectGoogleDrive();
      if (!res?.success) {
        alert('গুগল ড্রাইভ কানেকশন সম্পন্ন হয়নি।');
        return;
      }
      setHasDriveToken(true);
    }

    setIsBatchSyncing(true);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < unsyncedPosts.length; i++) {
      const p = unsyncedPosts[i];
      setBatchSyncProgress(`ড্রাইভে সিঙ্ক হচ্ছে (${i + 1}/${unsyncedPosts.length})...`);
      try {
        const result = await syncLegacyPhotoToDrive({ image: p.image, caption: p.caption });
        successCount++;
        onUpdatePost?.(p.id, result, { remove: ['image'] });
      } catch (err) {
        console.error('Batch upload error on post', p.id, err);
        failCount++;
      }
    }

    setIsBatchSyncing(false);
    setBatchSyncProgress('');
    alert(`ড্রাইভ ব্যাকআপ সম্পন্ন হয়েছে!\n\nসফল: ${successCount}টি\nব্যর্থ: ${failCount}টি\n\nকক্সবাজার ফ্যামিলি ট্যুর ২০২৬ ফোল্ডারে ছবি সংরক্ষিত হয়েছে।`);
  };

  // Save custom location to state and localStorage
  const handleSaveCustomLocation = (locToAdd) => {
    const trimmed = (locToAdd || customLocInput).trim();
    if (!trimmed) return;
    if (!DEFAULT_LOCATIONS.includes(trimmed) && !customLocations.includes(trimmed)) {
      const updated = [trimmed, ...customLocations];
      setCustomLocations(updated);
      try {
        localStorage.setItem('tour_custom_locations', JSON.stringify(updated));
      } catch {}
    }
    setLocation(trimmed);
    setIsCustomLocMode(false);
    setCustomLocInput('');
    setLocationNotification(`"${trimmed}" স্থান তালিকায় সংরক্ষিত হয়েছে!`);
    setTimeout(() => setLocationNotification(''), 2500);
  };

  // Persist draft caption
  useEffect(() => {
    try {
      if (caption) {
        localStorage.setItem('tour_post_draft_caption', caption);
      } else {
        localStorage.removeItem('tour_post_draft_caption');
      }
    } catch (e) {
      console.warn('Could not save draft caption:', e);
    }
  }, [caption]);

  // Comment input state per post
  const [commentInputs, setCommentInputs] = useState({});

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowCreateModal(false);
        setPreviewMedia(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-drain offline post queue whenever device reconnects to internet
  useEffect(() => {
    const unregister = registerAutoDrain(async (post) => {
      await onAddPost(post);
    });

    const handleSyncComplete = (e) => {
      setOfflineQueueCount(getOfflineQueue().length);
      console.log(`Offline queue drained: ${e.detail?.count || 1} post(s) uploaded successfully!`);
    };

    window.addEventListener('tour:offline-sync-complete', handleSyncComplete);

    return () => {
      unregister();
      window.removeEventListener('tour:offline-sync-complete', handleSyncComplete);
    };
  }, [onAddPost]);

  // Handle local file uploads (converts & compresses to web-optimized DataURL)
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (selectedImages.length + files.length > 10) {
      alert(`একসাথে সর্বোচ্চ ১০টি ছবি বাছাই করা যাবে। (বর্তমানে ${selectedImages.length}টি আছে)`);
    }

    const availableSlots = Math.max(0, 10 - selectedImages.length);
    const filesToProcess = files.slice(0, availableSlots);

    setPostError('');
    setIsProcessingImages(true);

    try {
      const processed = await Promise.all(
        filesToProcess.map(async (file) => {
          if (file.size > 25 * 1024 * 1024) {
            console.warn(`File ${file.name} is too large (>25MB)`);
            return null;
          }
          try {
            return await compressImageFile(file, 2560, 2560, 0.90);
          } catch (err) {
            console.warn('Image compression fallback to direct FileReader:', err);
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = (loadEvt) => resolve(loadEvt.target?.result || null);
              reader.onerror = () => resolve(null);
              reader.readAsDataURL(file);
            });
          }
        })
      );

      const validNew = processed.filter(Boolean);
      setSelectedImages((prev) => [...prev, ...validNew]);
    } catch (err) {
      console.error('Error reading files:', err);
      setPostError('ছবি প্রসেস করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsProcessingImages(false);
      e.target.value = '';
    }
  };

  const handleRemoveSelectedImage = (indexToRemove) => {
    setSelectedImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleAddUrlImage = () => {
    const url = imageInput.trim();
    if (!url) return;
    if (selectedImages.length >= 10) {
      alert('একসাথে সর্বোচ্চ ১০টি ছবি যোগ করা যাবে।');
      return;
    }
    setSelectedImages((prev) => [...prev, url]);
    setImageInput('');
  };

  // Touch swipe gestures for carousels in feed
  const handleTouchStart = (postId, e) => {
    if (!e.targetTouches?.[0]) return;
    setTouchCoordinates((prev) => ({
      ...prev,
      [postId]: { start: e.targetTouches[0].clientX, end: null },
    }));
  };

  const handleTouchMove = (postId, e) => {
    if (!e.targetTouches?.[0]) return;
    setTouchCoordinates((prev) => {
      const cur = prev[postId] || {};
      return { ...prev, [postId]: { ...cur, end: e.targetTouches[0].clientX } };
    });
  };

  const handleTouchEnd = (postId, total) => {
    const coords = touchCoordinates[postId];
    if (!coords || coords.start == null || coords.end == null) return;
    const distance = coords.start - coords.end;
    const current = postActiveIndices[postId] || 0;
    if (distance > 45 && current < total - 1) {
      setPostActiveIndices((prev) => ({ ...prev, [postId]: current + 1 }));
    } else if (distance < -45 && current > 0) {
      setPostActiveIndices((prev) => ({ ...prev, [postId]: current - 1 }));
    }
    setTouchCoordinates((prev) => {
      const next = { ...prev };
      delete next[postId];
      return next;
    });
  };

  const getFileFromPhoto = async (src, post) => {
    if (src.startsWith('data:')) {
      try {
        const parts = src.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
        const byteCharacters = atob(parts[1]);
        const byteNumbers = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([byteNumbers], { type: mime });
        const ext = mime.includes('png') ? 'png' : 'jpg';
        return new File([blob], `Tour2026_${post.id}.${ext}`, { type: mime });
      } catch (err) {
        console.warn('Base64 to blob conversion failed:', err);
      }
    }

    const fileName = `Tour2026_${post.id}.jpg`;
    try {
      const response = await fetch(src, { mode: 'cors' });
      const blob = await response.blob();
      return new File([blob], fileName, { type: blob.type || 'image/jpeg' });
    } catch (e) {
      console.warn('Direct fetch failed, falling back to canvas:', e);
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          canvas.getContext('2d').drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            resolve(blob ? new File([blob], fileName, { type: 'image/jpeg' }) : null);
          }, 'image/jpeg', 0.95);
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  };

  const downloadPhoto = (src, post) => {
    const a = document.createElement('a');
    a.href = src;
    a.download = `CoxsBazar_Tour2026_${post.id}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleShareMedia = async (post, customSrc = null) => {
    const src = customSrc || photoSource(post);
    if (!src) return;
    setSharingPostId(post.id);

    try {
      const file = await getFileFromPhoto(src, post);
      const shareUrl = `${PRODUCTION_ORIGIN}/#feed`;
      const shareText = post.caption ? `${post.author}: ${post.caption}` : 'রংপুর ➔ কক্সবাজার ফ্যামিলি ট্যুর ২০২৬';

      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'রংপুর ➔ কক্সবাজার ফ্যামিলি ট্যুর ২০২৬',
          text: shareText,
          url: shareUrl,
        });
        return;
      }

      downloadPhoto(src, post);
      if (navigator.share) {
        await navigator.share({
          title: 'রংপুর ➔ কক্সবাজার ফ্যামিলি ট্যুর ২০২৬',
          text: `${shareText}\n(ছবিটি ডিভাইসে ডাউনলোড করা হয়েছে)`,
          url: shareUrl,
        });
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error sharing media:', err);
        downloadPhoto(src, post);
      }
    } finally {
      setSharingPostId(null);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();

    const authorName = currentProfile?.displayName || currentUser?.displayName || 'পরিবারের সদস্য';
    const finalLocation = isCustomLocMode && customLocInput.trim() ? customLocInput.trim() : (location || 'লাবণী ও সুগন্ধা বিচ');
    if (isCustomLocMode && customLocInput.trim()) {
      handleSaveCustomLocation(customLocInput.trim());
    }

    // 1. REELS CREATION FLOW
    if (createPostMode === 'reel') {
      if (!trimmedReelData || !trimmedReelData.thumb) {
        setPostError('অনুগ্রহ করে একটি ভিডিও নির্বাচন ও ট্রিম করে কনফার্ম করুন (সর্বোচ্চ ৩ মিনিট)');
        return;
      }
      setPostError('');

      const postCaption = caption || 'রংপুর ➔ কক্সবাজার ফ্যামিলি ট্যুর ২০২৬ এর আনন্দঘন রিলস! 🏖️🎬';
      const postId = newId();
      const profilePhoto = currentProfile?.customPhotoURL;

      const finalTourDay = selectedTourDay === 'auto' ? getCurrentTourDay().id : selectedTourDay;

      const newReelPost = {
        id: postId,
        type: 'reel',
        author: authorName,
        authorEmail: currentUser?.email || 'member@tour.family',
        authorPhoto: typeof profilePhoto === 'string' && !profilePhoto.startsWith('data:')
          ? profilePhoto
          : (currentUser?.photoURL || null),
        caption: postCaption,
        location: finalLocation,
        tourDay: finalTourDay,
        taggedMembers: selectedTaggedMembers,
        likes: [],
        comments: [],
        views: 0,
        videoUrl: (trimmedReelData.videoUrl && !trimmedReelData.videoUrl.startsWith('blob:')) ? trimmedReelData.videoUrl : null,
        startTime: trimmedReelData.startTime || 0,
        endTime: trimmedReelData.endTime || trimmedReelData.duration || 0,
        duration: trimmedReelData.duration || 0,
        totalDuration: trimmedReelData.totalDuration || 0,
        thumb: (await makeThumbnail(trimmedReelData.thumb).catch(() => trimmedReelData.thumb)),
        image: (await makeThumbnail(trimmedReelData.thumb).catch(() => trimmedReelData.thumb)),
        images: [(await makeThumbnail(trimmedReelData.thumb).catch(() => trimmedReelData.thumb))],
        driveBackedUp: false,
        driveFileId: null,
        driveViewUrl: null,
        createdAt: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' }),
      };

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        enqueueOfflinePost(newReelPost);
        setOfflineQueueCount(getOfflineQueue().length);
        setCaption('');
        setTrimmedReelData(null);
        setSelectedTaggedMembers([]);
        setShowCreateModal(false);
        alert('ইন্টারনেট সংযোগ না থাকায় আপনার রিলসটি অফলাইনে জমা রাখা হয়েছে। অনলাইনে এলে এটি স্বয়ংক্রিয়ভাবে আপলোড হবে! 📶');
        return;
      }

      // Storage & upload for video file if provided
      const fileToUpload = (trimmedReelData.videoSource instanceof Blob || trimmedReelData.videoSource instanceof File)
        ? trimmedReelData.videoSource
        : null;

      if (fileToUpload) {
        setIsUploadingReel(true);
        setReelUploadProgress({ percent: 5, stage: 'uploading' });

        // 1. Instantly cache in IndexedDB on this device
        try {
          await saveLocalVideo(postId, fileToUpload);
        } catch (e) {
          console.warn('Local video save failed:', e);
        }

        // 2. Upload to server storage using chunked uploader (safe under Cloudflare 100MB body limit)
        try {
          const resData = await uploadWithQueue(fileToUpload, {
            postId,
            fileName: fileToUpload.name,
            onProgress: ({ percent, stage }) => {
              setReelUploadProgress({ percent, stage });
            },
          });

          if (resData?.url) {
            newReelPost.videoUrl = resData.url;
            newReelPost.vpsVideoUrl = resData.url;
            newReelPost.storageTier = 'vps_hot';
          }
        } catch (uploadErr) {
          console.error('Server video upload failed:', uploadErr);
          setPostError('ভিডিও আপলোড সম্পন্ন হতে পারেনি (' + (uploadErr.message || 'ইন্টারনেট সমস্যা') + ')। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
          setIsUploadingReel(false);
          setReelUploadProgress(null);
          return;
        }

        setIsUploadingReel(false);
        setReelUploadProgress(null);

        // 3. Backup to Google Drive if authorized (runs in background)
        (async () => {
          try {
            const upload = await uploadToGoogleDrive({
              file: fileToUpload,
              fileName: `Tour2026_Reel_${authorName.replace(/\s+/g, '_')}_${Date.now()}.mp4`,
              caption: `${postCaption} (রিলস)`,
            });
            if (upload?.success && upload.fileId) {
              onUpdatePost?.(postId, {
                driveBackedUp: true,
                driveFileId: upload.fileId,
                driveViewUrl: upload.webViewLink,
              });
            }
          } catch (err) {
            console.warn('Background Drive video upload skipped or failed:', err);
          }
        })();
      }

      // Save post to Firestore
      onAddPost(newReelPost);
      setCaption('');
      setTrimmedReelData(null);
      setVideoSourceForTrimmer(null);
      setVideoUrlInput('');
      setSelectedTaggedMembers([]);
      setIsCustomLocMode(false);
      setCustomLocInput('');
      try {
        localStorage.removeItem('tour_post_draft_caption');
      } catch {}
      setShowCreateModal(false);
      return;
    }

    // 2. STANDARD PHOTO CAROUSEL FLOW
    let finalImages = [...selectedImages];
    const link = imageInput.trim();
    if (link && finalImages.length < 10) {
      finalImages.push(link);
    }

    if (finalImages.length === 0) {
      setPostError('অনুগ্রহ করে অন্তত একটি ছবি নির্বাচন করুন বা ছবির লিংক দিন');
      return;
    }
    setPostError('');
    const postCaption = caption || 'রংপুর ➔ কক্সবাজার ফ্যামিলি ট্যুর ২০২৬ এর আনন্দঘন মুহূর্ত! 🏖️✨';

    const postId = newId();

    // 1. Generate lightweight thumbnails for all images (fast offline viewing & instant feed render)
    const thumbnailImages = await Promise.all(
      finalImages.map(async (img) => {
        try {
          return await makeThumbnail(img);
        } catch (e) {
          console.warn('Thumbnail generation warning:', e);
          return img;
        }
      })
    );

    // 2. Upload photos to VPS server storage with controlled concurrency queue
    let serverImages = thumbnailImages;
    if (typeof navigator === 'undefined' || navigator.onLine) {
      try {
        const uploadPromises = finalImages.map(async (img, idx) => {
          if (isDataImage(img)) {
            try {
              const res = await uploadWithQueue(img, {
                postId,
                fileName: `Tour2026_${authorName.replace(/\s+/g, '_')}_${Date.now()}_${idx + 1}.jpg`,
              });
              return res?.url || null;
            } catch (upErr) {
              console.warn(`VPS queue upload skipped for image ${idx + 1}:`, upErr);
              return null;
            }
          }
          return img;
        });
        const uploaded = await Promise.all(uploadPromises);
        serverImages = finalImages.map((img, idx) => uploaded[idx] || thumbnailImages[idx] || null).filter(Boolean);
      } catch (err) {
        console.warn('Image server upload skipped, using local thumbnails:', err);
      }
    }

    const profilePhoto = currentProfile?.customPhotoURL;
    const finalTourDay = selectedTourDay === 'auto' ? getCurrentTourDay().id : selectedTourDay;

    const newPost = {
      id: postId,
      author: authorName,
      authorEmail: (currentUser?.email ? currentUser.email.toLowerCase() : null) || 'member@tour.family',
      authorPhoto: typeof profilePhoto === 'string' && !profilePhoto.startsWith('data:')
        ? profilePhoto
        : (currentUser?.photoURL || null),
      caption: postCaption,
      location: finalLocation,
      tourDay: finalTourDay,
      taggedMembers: selectedTaggedMembers,
      likes: [],
      comments: [],
      views: 0,
      filter: selectedFilter || 'normal',
      images: serverImages,
      thumbs: thumbnailImages,
      thumb: thumbnailImages[0] || serverImages[0] || null,
      image: serverImages[0] || thumbnailImages[0] || null,
      driveBackedUp: false,
      driveFileId: null,
      driveFileIds: {},
      driveViewUrl: null,
      driveViewUrls: {},
      createdAt: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' }),
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      enqueueOfflinePost(newPost);
      setOfflineQueueCount(getOfflineQueue().length);
      setCaption('');
      setImageInput('');
      setSelectedImages([]);
      setSelectedFilter('normal');
      setSelectedTaggedMembers([]);
      setIsCustomLocMode(false);
      setCustomLocInput('');
      try {
        localStorage.removeItem('tour_post_draft_caption');
      } catch {}
      setShowCreateModal(false);
      alert('ইন্টারনেট সংযোগ না থাকায় পোস্টটি অফলাইনে জমা রাখা হয়েছে। অনলাইনে এলে এটি স্বয়ংক্রিয়ভাবে আপলোড হবে! 📶');
      return;
    }

    // 1. Post is added to feed and Firestore instantly!
    onAddPost(newPost);
    setCaption('');
    setImageInput('');
    setSelectedImages([]);
    setSelectedFilter('normal');
    setSelectedTaggedMembers([]);
    setIsCustomLocMode(false);
    setCustomLocInput('');
    try {
      localStorage.removeItem('tour_post_draft_caption');
    } catch {}
    setShowCreateModal(false);

    // 2. Upload to Google Drive in the background (zero blocking) with per-image mapping
    const filesToUpload = finalImages.filter((img) => isDataImage(img));
    if (filesToUpload.length > 0) {
      (async () => {
        let firstUploaded = null;
        const driveFileIds = {};
        const driveViewUrls = {};
        for (let i = 0; i < filesToUpload.length; i++) {
          try {
            const upload = await uploadToGoogleDrive({
              imageDataUrl: filesToUpload[i],
              fileName: `Tour2026_${authorName.replace(/\s+/g, '_')}_${Date.now()}_${i + 1}.jpg`,
              caption: `${postCaption} (${i + 1}/${filesToUpload.length})`,
            });
            if (upload?.success && upload.fileId) {
              driveFileIds[i] = upload.fileId;
              if (upload.webViewLink) driveViewUrls[i] = upload.webViewLink;
              if (!firstUploaded) {
                firstUploaded = upload;
              }
            }
          } catch (err) {
            console.warn(`Background Drive backup skipped for image ${i + 1}:`, err);
          }
        }
        if (firstUploaded?.fileId) {
          onUpdatePost?.(postId, {
            driveBackedUp: true,
            driveFileId: firstUploaded.fileId,
            driveViewUrl: firstUploaded.webViewLink,
            driveFileIds,
            driveViewUrls,
          });
        }
      })();
    }
  };

  const handleCommentSubmit = (postId) => {
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;

    const authorName = currentProfile?.displayName || currentUser?.displayName || 'পরিবারের সদস্য';
    const profilePhoto = currentProfile?.customPhotoURL || currentProfile?.photoURL || currentUser?.photoURL;

    onAddComment(postId, {
      id: Date.now(),
      user: authorName,
      authorEmail: (currentUser?.email || '').toLowerCase() || 'member@tour.family',
      userPhoto: typeof profilePhoto === 'string' && !profilePhoto.startsWith('data:') ? profilePhoto : (currentUser?.photoURL || null),
      text: text.trim(),
      time: 'এইমাত্র',
    });

    setCommentInputs({ ...commentInputs, [postId]: '' });
  };

  // Separation of Reels vs Photo Posts
  const isPostReel = (p) => Boolean(p && (p.type === 'reel' || p.videoUrl || p.video));
  const allReelPosts = posts.filter(isPostReel);

  // Filter posts by Tour Day Highlights
  const dayFilteredPosts = activeTourDayFilter === 'all'
    ? posts
    : posts.filter((p) => (p.tourDay || getPostTourDay(p)) === activeTourDayFilter);

  // Filter posts if story filter is clicked
  const filteredPosts = activeStoryFilter === 'all'
    ? dayFilteredPosts
    : dayFilteredPosts.filter((p) => p.author?.includes(activeStoryFilter));

  const filteredReelPosts = filteredPosts.filter(isPostReel);
  const filteredPhotoPosts = filteredPosts.filter((p) => !isPostReel(p));

  // Auto-open Reel if URL has ?reel=<id> (from deep-link or shared reel)
  useEffect(() => {
    if (!allReelPosts || allReelPosts.length === 0) return;

    const getReelIdFromUrl = () => {
      try {
        // 1. Check URL query params: ?reel=...
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get('reel')) return searchParams.get('reel');

        // 2. Check hash query params: #feed?reel=... or #reel=...
        const hash = window.location.hash || '';
        const qIdx = hash.indexOf('?');
        if (qIdx !== -1) {
          const hashParams = new URLSearchParams(hash.slice(qIdx));
          if (hashParams.get('reel')) return hashParams.get('reel');
        }
      } catch (err) {
        console.warn('Error reading reel ID from URL:', err);
      }
      return null;
    };

    const targetReelId = getReelIdFromUrl();
    if (!targetReelId) return;

    const rIdx = allReelPosts.findIndex((r) => String(r.id) === String(targetReelId));
    if (rIdx !== -1) {
      setReelsPlayer({ isOpen: true, initialIndex: rIdx });
    }
  }, [allReelPosts]);

  const handleCloseReelsPlayer = () => {
    setReelsPlayer({ isOpen: false, initialIndex: 0 });
    try {
      const hash = window.location.hash || '';
      if (hash.includes('reel=')) {
        const cleanHash = hash.split('?')[0] || '#feed';
        window.history.replaceState(null, '', cleanHash);
      }
      if (window.location.search.includes('reel=')) {
        const url = new URL(window.location.href);
        url.searchParams.delete('reel');
        window.history.replaceState(null, '', url.pathname + (window.location.hash || ''));
      }
    } catch {}
  };

  // Auto-record post view when post card is visible in viewport
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-post-id');
            if (id) {
              recordPostView(id);
            }
          }
        });
      },
      { threshold: 0.3 }
    );

    const elements = document.querySelectorAll('[data-post-id]');
    elements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [filteredPosts, feedSubTab]);

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-8">
      {/* Offline Upload Queue Status Banner */}
      {offlineQueueCount > 0 && (
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/15 border border-amber-300 p-3.5 rounded-3xl flex items-center justify-between gap-3 text-xs text-amber-950 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <WifiOff size={16} />
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-xs truncate">
                {toBnNum(offlineQueueCount)}টি পোস্ট অফলাইন ড্রাফটে জমা আছে
              </p>
              <p className="text-[11px] text-amber-800 truncate">
                ইন্টারনেট পেলেই স্বয়ংক্রিয়ভাবে ক্লাউডে আপলোড হবে
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDrainOfflineQueue}
            disabled={isDrainingQueue}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer text-xs shrink-0 disabled:opacity-50"
          >
            {isDrainingQueue ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <RefreshCw size={13} />
            )}
            <span>এখনই আপলোড</span>
          </button>
        </div>
      )}

      {offlineNotification && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl text-center animate-in fade-in">
          {offlineNotification}
        </div>
      )}

      {/* Top Banner: InstaTour & Google Drive Backup Status */}
      <div className="bg-gradient-to-r from-purple-900 via-pink-900 to-rose-900 text-white p-4 sm:p-5 rounded-3xl shadow-md flex items-center justify-between border border-pink-700/50">
        <div>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-pink-500/30 text-pink-200 rounded-full border border-pink-400/30 inline-block mb-1">
            📸 ফ্যামিলি ইনস্টাফিড • InstaTour
          </span>
          <h3 className="font-extrabold text-base sm:text-lg">ট্যুর মেমোয়ার্স ও ফটো গ্যালারি</h3>
          <p className="text-[11px] text-pink-100/80 mt-0.5">ছবি শেয়ার করুন এবং সবার মুহূর্ত একসাথে উপভোগ করুন</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3.5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-teal-950 font-bold text-xs rounded-2xl flex items-center gap-1.5 shadow-lg transition transform hover:scale-105 active:scale-95 cursor-pointer shrink-0"
        >
          <Plus size={16} /> পোস্ট করুন
        </button>
      </div>

      {/* Google Drive Backup Hub Bar */}
      {(() => {
        const unbackedPostsCount = posts.filter((p) => !p.driveBackedUp && (p.image || p.images?.length)).length;
        const backedUpPostsCount = posts.filter((p) => p.driveBackedUp).length;

        return (
          <div className="bg-gradient-to-r from-emerald-50/90 via-teal-50/80 to-cyan-50/90 p-3.5 sm:p-4 rounded-3xl border border-emerald-200/90 shadow-2xs text-xs text-slate-700 transition">
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
              {/* Left: Hub Title, Status Badge & Backup Counts */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <HardDrive size={18} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                      গুগল ড্রাইভ ব্যাকআপ হাব
                    </h4>
                    {isDriveConfigured ? (
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-md border border-emerald-300/60 shrink-0">
                        ✓ ড্রাইভ সংযুক্ত
                      </span>
                    ) : (
                      <span className="text-[9px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded-md border border-amber-300/60 shrink-0">
                        কানেক্ট বাকি
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-emerald-800 truncate mt-0.5">
                    {posts.length > 0
                      ? `${toBnNum(posts.length)}টি ছবির মধ্যে ${toBnNum(backedUpPostsCount)}টি ড্রাইভে ব্যাকআপ সম্পন্ন`
                      : 'কক্সবাজার ট্যুরের সব ছবি ড্রাইভে ক্লাউড ব্যাকআপ হবে'}
                  </p>
                </div>
              </div>

              {/* Right: Actions (Sync Button to the Left of Folder Open Button) */}
              <div className="flex items-center gap-2 shrink-0">
                {unbackedPostsCount > 0 ? (
                  <button
                    type="button"
                    onClick={handleSyncAllToDrive}
                    disabled={isBatchSyncing}
                    className="px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 active:scale-95 text-white font-bold rounded-2xl flex items-center gap-1.5 shadow-xs transition cursor-pointer text-xs shrink-0 disabled:opacity-75"
                    title="ড্রাইভে বাকি ছবিগুলো সিঙ্ক করুন"
                  >
                    {isBatchSyncing ? (
                      <>
                        <Loader2 size={13} className="animate-spin text-white" />
                        <span className="text-[11px] font-semibold">{batchSyncProgress || 'সিঙ্ক হচ্ছে...'}</span>
                      </>
                    ) : (
                      <>
                        <CloudUpload size={14} className="text-emerald-100" />
                        <span>সিঙ্ক করুন ({toBnNum(unbackedPostsCount)})</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-white/80 px-2.5 py-1.5 rounded-xl border border-emerald-200/80 shadow-2xs">
                    <Check size={13} className="text-emerald-600" />
                    <span>সব সুরক্ষিত</span>
                  </div>
                )}

                <a
                  href={GOOGLE_DRIVE_FOLDER_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 active:scale-95 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs shrink-0 cursor-pointer"
                  title="গুগল ড্রাইভ ফোল্ডার খুলুন"
                >
                  <FolderOpen size={14} className="text-emerald-200" />
                  <span>ফোল্ডার</span>
                </a>
              </div>
            </div>

            {/* Mobile Progress Bar if Batch Syncing is in flight */}
            {isBatchSyncing && (
              <div className="mt-2.5 pt-2 border-t border-emerald-200/60 flex items-center gap-2 text-teal-900 font-bold text-[11px]">
                <Loader2 size={13} className="animate-spin text-teal-700 shrink-0" />
                <span className="truncate">{batchSyncProgress || 'ড্রাইভে ছবি আপলোড হচ্ছে...'}</span>
              </div>
            )}
          </div>
        );
      })()}

      {/* Sub-tab Switcher: Photos Feed vs Reels Shorts vs Saved Collection */}
      <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-center">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setFeedSubTab('photos');
            try { localStorage.setItem('tour_feed_subtab', 'photos'); } catch {}
          }}
          className={`py-2 px-1.5 sm:px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
            feedSubTab === 'photos'
              ? 'bg-white text-teal-950 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Camera size={14} className={feedSubTab === 'photos' ? 'text-pink-600' : 'text-slate-400'} />
          <span>ফটো ({toBnNum(filteredPhotoPosts.length)})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setFeedSubTab('reels');
            try { localStorage.setItem('tour_feed_subtab', 'reels'); } catch {}
          }}
          className={`py-2 px-1.5 sm:px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
            feedSubTab === 'reels'
              ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Film size={14} />
          <span>রিলস ({toBnNum(filteredReelPosts.length)})</span>
          {filteredReelPosts.length > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setFeedSubTab('saved');
            try { localStorage.setItem('tour_feed_subtab', 'saved'); } catch {}
          }}
          className={`py-2 px-1.5 sm:px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
            feedSubTab === 'saved'
              ? 'bg-white text-amber-950 shadow-xs ring-1 ring-amber-300'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bookmark size={14} className={feedSubTab === 'saved' ? 'fill-amber-600 text-amber-600' : 'text-slate-400'} />
          <span>সংরক্ষিত ({toBnNum(savedPosts.length)})</span>
        </button>
      </div>

      {feedSubTab === 'reels' ? (
        /* REELS VERTICAL 9:16 GRID VIEW */
        <div className="space-y-4">
          {filteredReelPosts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredReelPosts.map((reel) => {
                const reelIndexInAll = allReelPosts.findIndex((r) => r.id === reel.id);
                return (
                  <div
                    key={reel.id}
                    data-post-id={reel.id}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        recordPostView(reel.id);
                        setReelsPlayer({ isOpen: true, initialIndex: Math.max(0, reelIndexInAll) });
                      }
                    }}
                    onClick={() => {
                      recordPostView(reel.id);
                      setReelsPlayer({ isOpen: true, initialIndex: Math.max(0, reelIndexInAll) });
                    }}
                    className="relative aspect-[9/16] bg-slate-900 rounded-2xl overflow-hidden cursor-pointer group shadow-md border border-slate-200 select-none"
                  >
                    <img
                      src={resolveMediaUrl(reel.thumb, reel.driveFileId) || photoSource(reel)}
                      alt={reel.caption}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      loading="lazy"
                      onError={(e) => {
                        if (reel.driveFileId) {
                          e.target.src = `https://drive.google.com/thumbnail?id=${reel.driveFileId}&sz=w1600`;
                        }
                      }}
                    />

                    {/* Gradient shadows */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/40 pointer-events-none" />

                    {/* Top Duration & Reel badge */}
                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between text-[10px] pointer-events-none">
                      <span className="bg-pink-600/90 text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-xs">
                        <Film size={10} /> রিলস
                      </span>
                      <span className="bg-black/60 text-white/95 px-2 py-0.5 rounded-full font-mono backdrop-blur-xs">
                        ⏱️ {formatDuration(reel.duration || 0, { bengali: true })}
                      </span>
                    </div>

                    {/* Center Play Button Icon on Hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-85 group-hover:opacity-100 group-hover:scale-110 transition duration-300 pointer-events-none">
                      <div className="w-12 h-12 rounded-full bg-pink-600/80 text-white flex items-center justify-center backdrop-blur-xs shadow-xl border border-white/20">
                        <Play size={22} className="ml-0.5 fill-white" />
                      </div>
                    </div>

                    {/* Bottom Metadata */}
                    <div className="absolute bottom-2 inset-x-2 text-white pointer-events-none">
                      <p className="text-xs font-bold truncate drop-shadow">{reel.author}</p>
                      {reel.caption && (
                        <p className="text-[10px] text-white/80 truncate drop-shadow">{reel.caption}</p>
                      )}
                      <div className="flex items-center gap-2.5 mt-1 text-[10px] text-white/90 font-mono">
                        <span className="flex items-center gap-0.5" title="ভিউ সংখ্যা">
                          <Eye size={11} className="text-teal-300" />
                          {toBnNum(reel.views || 0)}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Heart size={11} className="fill-rose-500 text-rose-500" />
                          {toBnNum((reel.likes || []).length)}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <MessageCircle size={11} />
                          {toBnNum((reel.comments || []).length)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mx-auto text-2xl">
                🎬
              </div>
              <h4 className="font-bold text-slate-800 text-sm">এখনো কোনো রিলস পোস্ট করা হয়নি!</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                যেকোনো বড় ভিডিও থেকে সর্বোচ্চ ৩ মিনিটের অংশ কেটে রিলস তৈরি করুন এবং পরিবারের সবার সাথে শেয়ার করুন।
              </p>
              <button
                type="button"
                onClick={() => {
                  setCreatePostMode('reel');
                  setShowCreateModal(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                🎬 প্রথম রিলস পোস্ট করুন
              </button>
            </div>
          )}
        </div>
      ) : feedSubTab === 'saved' ? (
        /* SAVED POSTS COLLECTION TAB */
        <div className="space-y-4">
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Bookmark size={20} className="fill-amber-600 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800">সংরক্ষিত পোস্টসমূহ</h3>
                <p className="text-[11px] text-slate-500">
                  {toBnNum(savedPosts.length)}টি প্রিয় ছবি ও মুহূর্ত সেভ করা আছে
                </p>
              </div>
            </div>

            {savedPosts.length > 0 && (
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setPhotoViewMode('feed');
                    try { localStorage.setItem('tour_photo_view_mode', 'feed'); } catch {}
                  }}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    photoViewMode === 'feed'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="ফিড ভিউ"
                  aria-label="ফিড ভিউ"
                >
                  <LayoutList size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setPhotoViewMode('grid');
                    try { localStorage.setItem('tour_photo_view_mode', 'grid'); } catch {}
                  }}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    photoViewMode === 'grid'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="গ্রিড ভিউ"
                  aria-label="গ্রিড ভিউ"
                >
                  <Grid3X3 size={16} />
                </button>
              </div>
            )}
          </div>

          {savedPosts.length > 0 ? (
            photoViewMode === 'grid' ? (
              /* 3x3 Grid Mode for Saved Posts */
              <div className="grid grid-cols-3 gap-1 sm:gap-2">
                {savedPosts.map((post) => {
                  const mediaSrc = photoSource(post);
                  const isCarousel = (post.images || []).length > 1;
                  return (
                    <div
                      key={post.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        recordPostView(post.id);
                        if (post.type === 'reel') {
                          const rIdx = allReelPosts.findIndex((r) => r.id === post.id);
                          setReelsPlayer({ isOpen: true, initialIndex: Math.max(0, rIdx) });
                        } else {
                          const imgs = getPostImages(post);
                          setPreviewMedia({ images: imgs, index: 0, post });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          recordPostView(post.id);
                          if (post.type === 'reel') {
                            const rIdx = allReelPosts.findIndex((r) => r.id === post.id);
                            setReelsPlayer({ isOpen: true, initialIndex: Math.max(0, rIdx) });
                          } else {
                            const imgs = getPostImages(post);
                            setPreviewMedia({ images: imgs, index: 0, post });
                          }
                        }
                      }}
                      className="relative aspect-square bg-slate-900 rounded-xl overflow-hidden cursor-pointer group shadow-2xs select-none"
                    >
                      <ProgressiveImage
                        src={mediaSrc}
                        thumb={post.thumb}
                        driveFileId={post.driveFileId}
                        alt={post.caption || 'Saved post'}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300 pointer-events-none"
                        style={{ filter: getFilterCss(post.filter) }}
                        loading="lazy"
                      />
                      {isCarousel && (
                        <span className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-xs text-white p-1 rounded-md text-[10px]">
                          <Images size={12} />
                        </span>
                      )}
                      {post.type === 'reel' && (
                        <span className="absolute top-1.5 right-1.5 bg-pink-600/80 backdrop-blur-xs text-white p-1 rounded-md text-[10px]">
                          <Film size={12} />
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-3 text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <span className="flex items-center gap-1 drop-shadow-md">
                          <Heart size={14} className="fill-white" />
                          {toBnNum((post.likes || []).length)}
                        </span>
                        <span className="flex items-center gap-1 drop-shadow-md">
                          <Eye size={14} />
                          {toBnNum(post.views || 0)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Feed Mode for Saved Posts */
              <div className="space-y-4 sm:space-y-6">
                {savedPosts.map((post) => {
                  const postHasStory = membersWithStories.some((m) => m.memberName === post.author);
                  return (
                    <InstagramPostCard
                      key={post.id}
                      post={post}
                      currentUser={currentUser}
                      currentProfile={currentProfile}
                      members={members}
                      userProfiles={userProfiles}
                      onLikePost={onLikePost}
                      onViewPost={recordPostView}
                      onOpenComments={(p) => {
                        triggerHaptic('light');
                        setActiveCommentPost(p);
                      }}
                      onShareMedia={handleShareMedia}
                      onOpenShareModal={(p) => setShareModalPost(p)}
                      onManualDriveBackup={handleManualDriveBackup}
                      onStartEditPost={handleStartEditPost}
                      onDeletePost={onDeletePost}
                      onOpenReel={(p) => {
                        const rIdx = allReelPosts.findIndex((r) => r.id === p.id);
                        setReelsPlayer({ isOpen: true, initialIndex: Math.max(0, rIdx) });
                      }}
                      onOpenFullscreenImage={(media) => {
                        if (typeof media === 'string') {
                          const imgs = (post.images && post.images.length > 0) ? post.images : [media];
                          setPreviewMedia({ images: imgs, index: 0, post });
                        } else {
                          setPreviewMedia({ ...media, post: media.post || post });
                        }
                      }}
                      manualDriveUploadId={manualDriveUploadId}
                      hasStory={postHasStory}
                      onOpenStory={(author) => {
                        const mIdx = membersWithStories.findIndex((m) => m.memberName === author);
                        if (mIdx >= 0) {
                          setStoryViewer({ isOpen: true, memberIndex: mIdx });
                        }
                      }}
                    />
                  );
                })}
              </div>
            )
          ) : (
            <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-2xl">
                <Bookmark size={26} className="fill-amber-600/20 text-amber-600" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">কোনো সংরক্ষিত পোস্ট নেই!</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                ফিডের যেকোনো ছবির নিচে বা রিলসের নিচে থাকা বুকমার্ক আইকনে ট্যাপ করে আপনার পছন্দের পোস্টগুলো এখানে সেভ করে রাখতে পারেন।
              </p>
              <button
                type="button"
                onClick={() => setFeedSubTab('photos')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                📸 ফিড ব্রাউজ করুন
              </button>
            </div>
          )}
        </div>
      ) : (
        /* REGULAR PHOTO FEED MODE */
        <>
          {/* Authentic Instagram Stories Tray */}
          <div className="bg-white py-3 px-2 border-b border-slate-200/80 flex items-center gap-3 overflow-x-auto scrollbar-none select-none">
            {/* 1. Your Story Button */}
            <div
              onClick={() => {
                triggerHaptic('light');
                const myName = currentProfile?.displayName || currentUser?.displayName;
                const myIdx = membersWithStories.findIndex((m) => m.memberName === myName);
                if (myIdx >= 0) {
                  setStoryViewer({ isOpen: true, memberIndex: myIdx });
                } else {
                  setCreatePostMode('photos');
                  setShowCreateModal(true);
                }
              }}
              className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0"
            >
              <div className="relative">
                <div className="p-0.5 rounded-full bg-slate-200">
                  <UserAvatar
                    photoUrl={currentUser?.photoURL || currentProfile?.photoURL}
                    name={currentUser?.displayName || currentProfile?.displayName || 'আমি'}
                    size="w-14 h-14"
                  />
                </div>
                <div className="absolute bottom-0 right-0 w-4.5 h-4.5 rounded-full bg-blue-500 border-2 border-white text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  <Plus size={11} strokeWidth={3} />
                </div>
              </div>
              <span className="text-[11px] font-medium text-slate-700">আপনার স্টোরি</span>
            </div>

            {/* 2. All Members Filter Option */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setActiveStoryFilter('all');
              }}
              className={`flex flex-col items-center gap-1.5 cursor-pointer shrink-0 ${
                activeStoryFilter === 'all' ? 'opacity-100' : 'opacity-65 hover:opacity-100'
              }`}
            >
              <div
                className={`w-14 h-14 rounded-full p-0.5 flex items-center justify-center ${
                  activeStoryFilter === 'all'
                    ? 'ring-2 ring-pink-500 bg-gradient-to-tr from-amber-400 to-pink-600'
                    : 'border border-slate-300 bg-slate-100'
                }`}
              >
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center font-bold text-xs text-slate-800">
                  সবাই
                </div>
              </div>
              <span className="text-[11px] font-medium text-slate-700">সকল ফটো</span>
            </button>

            {/* 3. Family Members Stories with Instagram Gradient Rings */}
            {membersWithStories.map((m, idx) => {
              const isSelected = activeStoryFilter === m.memberName;
              return (
                <div
                  key={m.memberName}
                  onClick={() => {
                    triggerHaptic('light');
                    setStoryViewer({ isOpen: true, memberIndex: idx });
                  }}
                  className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 group"
                >
                  <div className={`p-0.5 rounded-full transition-transform duration-200 group-hover:scale-105 shadow-xs ${
                    isSelected
                      ? 'ring-2 ring-pink-500 bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]'
                      : 'bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]'
                  }`}>
                    <div className="p-0.5 bg-white rounded-full">
                      <UserAvatar
                        photoUrl={m.authorPhoto}
                        name={m.memberName}
                        size="w-14 h-14"
                      />
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-slate-700 max-w-[66px] truncate text-center">
                    {m.memberName.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Tour Day Highlights Bubbles (Day 1 – Day 5) */}
          <div className="bg-slate-50/80 border-b border-slate-200/80 py-2.5 px-2 flex items-center gap-3 overflow-x-auto scrollbar-none select-none">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setActiveTourDayFilter('all');
                try { localStorage.setItem('tour_active_day_filter', 'all'); } catch {}
              }}
              className={`flex flex-col items-center gap-1 shrink-0 cursor-pointer transition ${
                activeTourDayFilter === 'all' ? 'opacity-100 scale-105' : 'opacity-70 hover:opacity-100'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full p-0.5 flex items-center justify-center ${
                  activeTourDayFilter === 'all'
                    ? 'ring-2 ring-teal-600 bg-gradient-to-tr from-teal-500 to-cyan-600'
                    : 'border border-slate-300 bg-white'
                }`}
              >
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-xs font-black text-teal-900">
                  সব
                </div>
              </div>
              <span className="text-[10px] font-bold text-slate-700">সব দিন</span>
            </button>

            {TOUR_DAYS.map((day) => {
              const count = posts.filter((p) => (p.tourDay || getPostTourDay(p)) === day.id).length;
              const isSelected = activeTourDayFilter === day.id;
              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveTourDayFilter(day.id);
                    try { localStorage.setItem('tour_active_day_filter', day.id); } catch {}
                  }}
                  className={`flex flex-col items-center gap-1 shrink-0 cursor-pointer transition relative ${
                    isSelected ? 'opacity-100 scale-105' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-full p-0.5 flex items-center justify-center ${
                      isSelected
                        ? 'ring-2 ring-pink-500 bg-gradient-to-tr from-pink-500 to-amber-500 shadow-xs'
                        : 'border border-slate-200 bg-white shadow-2xs'
                    }`}
                  >
                    <div className="w-full h-full rounded-full bg-slate-50 flex items-center justify-center text-lg">
                      {day.emoji}
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-700 truncate max-w-[64px]">
                    {day.shortLabel}
                  </span>
                  {count > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-slate-800 text-white text-[9px] font-bold px-1 rounded-full">
                      {toBnNum(count)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* View Mode & Filter Subheader Toolbar */}
          <div className="flex items-center justify-between px-1 py-1">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 flex-wrap">
              {activeTourDayFilter !== 'all' && (
                <span className="bg-sky-50 text-sky-800 font-bold px-2 py-0.5 rounded-full border border-sky-200 text-[10px]">
                  {getTourDayById(activeTourDayFilter)?.emoji} {getTourDayById(activeTourDayFilter)?.title}
                </span>
              )}
              {activeStoryFilter !== 'all' ? (
                <span>
                  <strong className="text-slate-800">{activeStoryFilter}</strong> এর ছবি ({toBnNum(filteredPosts.length)}টি)
                </span>
              ) : (
                <span>পোস্ট ({toBnNum(filteredPosts.length)}টি)</span>
              )}
            </span>

            {/* View Mode Toggle: Feed (Cards) vs Grid (3x3 Explore) */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setPhotoViewMode('feed');
                  try { localStorage.setItem('tour_photo_view_mode', 'feed'); } catch {}
                }}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  photoViewMode === 'feed'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="ফিড ভিউ"
                aria-label="ফিড ভিউ"
              >
                <LayoutList size={15} />
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setPhotoViewMode('grid');
                  try { localStorage.setItem('tour_photo_view_mode', 'grid'); } catch {}
                }}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  photoViewMode === 'grid'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="গ্রিড ভিউ"
                aria-label="গ্রিড ভিউ"
              >
                <Grid3X3 size={15} />
              </button>
            </div>
          </div>

          {/* Instagram-style Posts Feed / 3x3 Grid */}
          <div>
            {filteredPosts.length > 0 ? (
              photoViewMode === 'grid' ? (
                /* 3x3 Explore Grid */
                <div className="grid grid-cols-3 gap-1 sm:gap-2">
                  {filteredPosts.map((post) => {
                    const mediaSrc = photoSource(post);
                    const isCarousel = (post.images || []).length > 1;
                    return (
                      <div
                        key={post.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          recordPostView(post.id);
                          if (post.type === 'reel') {
                            const rIdx = allReelPosts.findIndex((r) => r.id === post.id);
                            setReelsPlayer({ isOpen: true, initialIndex: Math.max(0, rIdx) });
                          } else {
                            const imgs = getPostImages(post);
                            setPreviewMedia({ images: imgs, index: 0, post });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            recordPostView(post.id);
                            if (post.type === 'reel') {
                              const rIdx = allReelPosts.findIndex((r) => r.id === post.id);
                              setReelsPlayer({ isOpen: true, initialIndex: Math.max(0, rIdx) });
                            } else {
                              const imgs = (post.images && post.images.length > 0) ? post.images : [mediaSrc];
                              setPreviewMedia({ images: imgs, index: 0, post });
                            }
                          }
                        }}
                        className="relative aspect-square bg-slate-900 rounded-xl overflow-hidden cursor-pointer group shadow-2xs select-none"
                      >
                        <ProgressiveImage
                          src={mediaSrc}
                          thumb={post.thumb}
                          driveFileId={post.driveFileId}
                          alt={post.caption || 'Tour photo'}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300 pointer-events-none"
                          style={{ filter: getFilterCss(post.filter) }}
                          loading="lazy"
                        />
                        {isCarousel && (
                          <span className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-xs text-white p-1 rounded-md text-[10px]">
                            <Images size={12} />
                          </span>
                        )}
                        {post.type === 'reel' && (
                          <span className="absolute top-1.5 right-1.5 bg-pink-600/80 backdrop-blur-xs text-white p-1 rounded-md text-[10px]">
                            <Film size={12} />
                          </span>
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-3 text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <span className="flex items-center gap-1 drop-shadow-md">
                            <Heart size={14} className="fill-white" />
                            {toBnNum((post.likes || []).length)}
                          </span>
                          <span className="flex items-center gap-1 drop-shadow-md">
                            <Eye size={14} />
                            {toBnNum(post.views || 0)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Full Card Feed */
                <div className="space-y-4 sm:space-y-6">
                  {filteredPosts.map((post) => {
                    const postHasStory = membersWithStories.some((m) => m.memberName === post.author);
                    return (
                      <InstagramPostCard
                        key={post.id}
                        post={post}
                        currentUser={currentUser}
                        currentProfile={currentProfile}
                        members={members}
                        userProfiles={userProfiles}
                        onLikePost={onLikePost}
                        onViewPost={recordPostView}
                        onOpenComments={(p) => {
                          triggerHaptic('light');
                          setActiveCommentPost(p);
                        }}
                        onShareMedia={handleShareMedia}
                        onOpenShareModal={(p) => setShareModalPost(p)}
                        onManualDriveBackup={handleManualDriveBackup}
                        onStartEditPost={handleStartEditPost}
                        onDeletePost={onDeletePost}
                        onOpenReel={(p) => {
                          const rIdx = allReelPosts.findIndex((r) => r.id === p.id);
                          setReelsPlayer({ isOpen: true, initialIndex: Math.max(0, rIdx) });
                        }}
                        onOpenFullscreenImage={(media) => {
                          if (typeof media === 'string') {
                            const imgs = (post.images && post.images.length > 0) ? post.images : [media];
                            setPreviewMedia({ images: imgs, index: 0, post });
                          } else {
                            setPreviewMedia({ ...media, post: media.post || post });
                          }
                        }}
                        manualDriveUploadId={manualDriveUploadId}
                        hasStory={postHasStory}
                        onOpenStory={(author) => {
                          const mIdx = membersWithStories.findIndex((m) => m.memberName === author);
                          if (mIdx >= 0) {
                            setStoryViewer({ isOpen: true, memberIndex: mIdx });
                          }
                        }}
                      />
                    );
                  })}
                </div>
              )
            ) : (
              <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center mx-auto text-xl">
                  📸
                </div>
                <h4 className="font-bold text-slate-800 text-sm">এখনো কোনো ছবি শেয়ার করা হয়নি!</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  কক্সবাজার ভ্রমণের সুন্দর সুন্দর ছবি ও সেলফি আপলোড করে পরিবারের সবার সাথে শেয়ার করুন।
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-teal-800 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  প্রথম ছবিটি পোস্ট করুন
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* CREATE NEW INSTA POST MODAL (Pinned header/footer, mobile-friendly) */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-200"
         role="presentation"
 onClick={() => setShowCreateModal(false)}
onKeyDown={(e) => { if (e.key === 'Escape') e.currentTarget.click(); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full shadow-2xl max-h-[88vh] flex flex-col overflow-hidden my-auto border border-slate-100"
          >
            {/* PINNED HEADER */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200 bg-slate-50/95 backdrop-blur-md shrink-0 z-20">
              <h3 className="font-bold text-sm sm:text-base text-slate-800 flex items-center gap-2 truncate">
                {createPostMode === 'reel' ? (
                  <>
                    <Film size={18} className="text-pink-600 shrink-0" /> নতুন ট্যুর রিলস পাবলিশ করুন
                  </>
                ) : (
                  <>
                    <Camera size={18} className="text-pink-600 shrink-0" /> নতুন ট্যুর ফটো পোস্ট করুন
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-rose-100 hover:text-rose-600 text-slate-700 flex items-center justify-center transition cursor-pointer active:scale-95 shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* SCROLLABLE FORM BODY */}
            <form id="create-post-form" onSubmit={handleCreatePost} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {/* Media Type Switcher: Photo Carousel vs Reels Video */}
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setCreatePostMode('photos');
                      setPostError('');
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer ${
                      createPostMode === 'photos'
                        ? 'bg-white text-teal-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Camera size={15} className="text-pink-600" />
                    <span>ফটো অ্যালবাম</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreatePostMode('reel');
                      setPostError('');
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer ${
                      createPostMode === 'reel'
                        ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Film size={15} />
                    <span>ইনস্টা রিলস (≤ ৩ মি.)</span>
                  </button>
                </div>

                {/* 1. REELS VIDEO UPLOADER & TRIMMER SECTION */}
                {createPostMode === 'reel' ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Film size={14} className="text-pink-600" />
                        রিলস ভিডিও বাছাই (যেকোনো দৈর্ঘ্যের ভিডিও)
                      </p>
                      <span className="text-[10px] font-bold text-pink-700 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-200">
                        অনুমোদিত সর্বোচ্চ ৩ মিনিট
                      </span>
                    </div>

                    {!trimmedReelData ? (
                      <div className="space-y-3">
                        <label className="py-7 px-4 bg-gradient-to-br from-pink-50/70 via-purple-50/70 to-indigo-50/70 hover:from-pink-100/70 hover:to-purple-100/70 text-slate-800 border-2 border-dashed border-pink-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition text-xs font-semibold shadow-xs">
                          <Film size={32} className="mb-2 text-pink-600" />
                          <span className="text-sm font-bold text-slate-900">ডিভাইস থেকে ভিডিও ফাইল বাছাই করুন</span>
                          <span className="text-[11px] text-slate-600 mt-1 text-center max-w-xs">
                            যেকোনো বড় ভিডিও (৫, ১০ বা ২০ মিনিট) থেকে পছন্দের ৩ মিনিটের অংশ কেটে নেওয়ার ট্রিমার ওপেন হবে
                          </span>
                          <input
                            type="file"
                            accept="video/*"
                            onChange={handleVideoFileChange}
                            className="sr-only"
                          />
                        </label>

                        <div>
                          <span className="text-[10px] text-slate-500 block mb-1">অথবা সরাসরি ভিডিও লিংক দিয়ে ট্রিম করুন:</span>
                          <div className="flex gap-2">
                            <input
                              type="url"
                              placeholder="https://... (mp4/webm ভিডিও লিংক)"
                              value={videoUrlInput}
                              onChange={(e) => setVideoUrlInput(e.target.value)}
                              className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-pink-600 bg-white"
                            />
                            <button
                              type="button"
                              onClick={handleVideoUrlConfirm}
                              disabled={!videoUrlInput.trim()}
                              className="px-3.5 py-2 bg-gradient-to-r from-pink-600 to-purple-600 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs whitespace-nowrap"
                            >
                              ✂️ ট্রিম করুন
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Selected Clip Preview Card */
                      <div className="p-3.5 bg-slate-900 text-white rounded-2xl border border-slate-700 space-y-3 shadow-md">
                        <div className="flex items-center gap-3">
                          <div className="relative w-16 h-22 bg-black rounded-xl overflow-hidden border border-slate-700 shrink-0">
                            <img
                              src={trimmedReelData.thumb}
                              alt="Reel Cover"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <Play size={16} className="text-white fill-white" />
                            </div>
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-pink-400">রিলস ক্লিপ প্রস্তুত ✓</span>
                            </div>
                            <p className="text-xs text-slate-200 font-mono">
                              ⏱️ ক্লিপ দৈর্ঘ্য: <strong>{formatDuration(trimmedReelData.duration, { bengali: true })}</strong>
                            </p>
                            <p className="text-[10px] text-slate-400">
                              সময়সীমা: {formatDuration(trimmedReelData.startTime, { bengali: true })} ➔ {formatDuration(trimmedReelData.endTime, { bengali: true })}
                            </p>
                            {trimmedReelData.totalDuration > 0 && (
                              <p className="text-[10px] text-slate-500">
                                মূল ভিডিওর দৈর্ঘ্য: {formatDuration(trimmedReelData.totalDuration, { bengali: true })}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1 border-t border-slate-800 text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              setVideoSourceForTrimmer(trimmedReelData.videoSource);
                              setShowTrimmerModal(true);
                            }}
                            className="flex-1 py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-pink-300 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-700"
                          >
                            <Scissors size={13} /> পুনরায় ট্রিম করুন
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setTrimmedReelData(null);
                              setVideoSourceForTrimmer(null);
                            }}
                            className="py-1.5 px-3 bg-rose-950/80 hover:bg-rose-900 text-rose-300 rounded-xl font-semibold transition cursor-pointer border border-rose-800/80"
                          >
                            বদলান
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* 2. PHOTO ALBUM SELECTION */
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p id="feed-media-label" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Camera size={14} className="text-pink-600" />
                        ছবি আপলোড বা ছবি নির্বাচন (সর্বোচ্চ ১০টি)
                      </p>
                      {selectedImages.length > 0 && (
                        <span className="text-[11px] font-bold text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded-full">
                          {toBnNum(selectedImages.length)}/১০টি নির্বাচিত
                        </span>
                      )}
                    </div>

                  {/* Empty state: big file picker box */}
                  {selectedImages.length === 0 ? (
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="feed-photo-file-input"
                        className="flex-1 py-5 px-4 bg-teal-50 hover:bg-teal-100/80 text-teal-900 border-2 border-dashed border-teal-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition text-xs font-semibold shadow-xs active:scale-98"
                      >
                        <Camera size={26} className="mb-1.5 text-teal-600" />
                        <span className="text-sm font-bold text-teal-950">ডিভাইস বা ক্যামেরা থেকে ছবি তুলুন</span>
                        <span className="text-[11px] text-teal-700 mt-0.5">এক বা একাধিক (সর্বোচ্চ ১০টি) ছবি বাছাই করতে ট্যাপ করুন</span>
                        <input
                          id="feed-photo-file-input"
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleFileChange}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  ) : (
                    /* Multi-image preview grid */
                    <div className="space-y-2 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200">
                        <span className="flex items-center gap-1">
                          ✓ {toBnNum(selectedImages.length)}টি ছবি অ্যালবাম আকারে সাজানো হয়েছে
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedImages([])}
                          className="text-rose-600 hover:text-rose-800 text-[10px] underline cursor-pointer"
                        >
                          সব মুছুন
                        </button>
                      </div>

                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-2 bg-slate-50 rounded-2xl border border-slate-200 max-h-56 overflow-y-auto">
                        {selectedImages.map((img, idx) => (
                          <div
                            key={idx}
                            className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group shadow-2xs"
                          >
                            <img
                              src={img}
                              alt={`Selected ${idx + 1}`}
                              className="w-full h-full object-cover"
                              style={{ filter: getFilterCss(selectedFilter) }}
                            />
                            {/* Sequence number badge */}
                            <span className="absolute top-1 left-1 bg-black/75 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                              {toBnNum(idx + 1)}
                            </span>
                            {/* Remove button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveSelectedImage(idx)}
                              className="absolute top-1 right-1 bg-rose-600/90 hover:bg-rose-700 text-white rounded-full p-1 text-xs cursor-pointer shadow-sm transition active:scale-90"
                              title="ছবিটি বাতিল করুন"
                              aria-label={`Remove photo ${idx + 1}`}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}

                        {/* + Add more tile if slots available */}
                        {selectedImages.length < 10 && (
                          <label
                            htmlFor="feed-photo-file-input"
                            className="aspect-square rounded-xl border-2 border-dashed border-teal-300 hover:border-teal-500 hover:bg-teal-50/70 flex flex-col items-center justify-center cursor-pointer transition text-teal-700 active:scale-95"
                            title="আরও ছবি যোগ করুন"
                          >
                            <Plus size={20} />
                            <span className="text-[10px] font-bold mt-1">+ যোগ করুন</span>
                            <input
                              id="feed-photo-file-input"
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleFileChange}
                              className="sr-only"
                            />
                          </label>
                        )}
                      </div>

                      {/* Instagram Presets Filter Ribbon */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                            <Sparkles size={12} className="text-pink-600" />
                            ইনস্টাগ্রাম ফিল্টার প্রিসেট
                          </span>
                          <span className="text-[10px] text-pink-600 font-bold">
                            {IG_FILTERS.find((f) => f.id === selectedFilter)?.nameBn || 'স্বাভাবিক'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none select-none">
                          {IG_FILTERS.map((f) => {
                            const isSelected = selectedFilter === f.id;
                            return (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => {
                                  triggerHaptic('light');
                                  setSelectedFilter(f.id);
                                }}
                                className={`flex flex-col items-center gap-1 shrink-0 p-1 rounded-xl transition cursor-pointer ${
                                  isSelected ? 'bg-pink-50 ring-2 ring-pink-500 shadow-2xs' : 'hover:bg-slate-100'
                                }`}
                              >
                                <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-300 relative bg-slate-900">
                                  <img
                                    src={selectedImages[0]}
                                    alt={f.name}
                                    className="w-full h-full object-cover"
                                    style={{ filter: f.css }}
                                  />
                                  {isSelected && (
                                    <div className="absolute inset-0 bg-pink-600/30 flex items-center justify-center">
                                      <Check size={14} className="text-white drop-shadow-md stroke-[3]" />
                                    </div>
                                  )}
                                </div>
                                <span className={`text-[10px] font-medium leading-tight ${isSelected ? 'text-pink-600 font-bold' : 'text-slate-600'}`}>
                                  {f.name}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {isProcessingImages && (
                    <div className="flex items-center gap-2 text-xs text-teal-800 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200 font-medium">
                      <Loader2 size={14} className="animate-spin text-teal-600" />
                      <span>ছবি প্রক্রিয়াকরণ ও অপ্টিমাইজেশন হচ্ছে...</span>
                    </div>
                  )}

                  {/* Or image URL input with + Add button */}
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-1">অথবা ছবির সরাসরি ওয়েব/ড্রাইভ লিংক দিন:</span>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://... (ইমেজ লিংক)"
                        value={imageInput}
                        onChange={(e) => setImageInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddUrlImage();
                          }
                        }}
                        className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddUrlImage}
                        disabled={!imageInput.trim() || selectedImages.length >= 10}
                        className="px-3 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs whitespace-nowrap"
                      >
                        + যোগ করুন
                      </button>
                    </div>
                  </div>
                </div>
                )}

                {/* Tour Day Selection Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Calendar size={13} className="text-pink-600" /> ট্যুর দিন (Tour Day)
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {selectedTourDay === 'auto' ? `স্বয়ংক্রিয় (${getCurrentTourDay().name})` : (getTourDayById(selectedTourDay)?.title || selectedTourDay)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setSelectedTourDay('auto')}
                      className={`py-1.5 px-2 rounded-xl border text-center transition cursor-pointer font-bold ${
                        selectedTourDay === 'auto'
                          ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      ✨ অটো (তারিখ)
                    </button>
                    {TOUR_DAYS.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setSelectedTourDay(d.id)}
                        className={`py-1.5 px-2 rounded-xl border text-center transition cursor-pointer font-semibold truncate ${
                          selectedTourDay === d.id
                            ? 'bg-pink-600 text-white border-pink-600 shadow-2xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {d.emoji} {d.shortLabel}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Caption with auto-saved draft indicator */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700" htmlFor="instagramfeed-field-1">ক্যাপশন (Caption)</label>
                    {caption && <span className="text-[10px] text-emerald-600">✓ ড্রাফট সংরক্ষিত</span>}
                  </div>
                  <textarea id="instagramfeed-field-1"
                    placeholder="যেমন: ইনানী বিচে পাথর ও ঢেউয়ের খেলা! কী চমৎকার আবহাওয়া... 🌊🌴"
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 resize-none bg-white"
                  />
                </div>

                {/* Location Selection & Custom Location Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <MapPin size={13} className="text-teal-600" /> লোকেশন / স্থান
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !isCustomLocMode;
                        setIsCustomLocMode(next);
                        if (next) setCustomLocInput(location);
                      }}
                      className="text-[11px] text-teal-700 hover:text-teal-900 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      {isCustomLocMode ? '⤺ ড্রপডাউন তালিকা দেখুন' : '✍️ কাস্টম স্থান লিখুন'}
                    </button>
                  </div>

                  {/* Tour Schedule Auto-Location Suggestion */}
                  {(() => {
                    const suggested = getSuggestedTourLocation();
                    const suggestedSpot = suggested?.spot || '';
                    if (!suggestedSpot || location === suggestedSpot) return null;
                    return (
                      <div className="flex items-center justify-between p-2 bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-xl text-xs text-sky-950 shadow-2xs">
                        <span className="flex items-center gap-1.5 truncate">
                          <Sparkles size={13} className="text-sky-600 shrink-0" />
                          <span className="text-[10px] font-medium text-sky-700">বর্তমান শিডিউল:</span>
                          <strong className="truncate text-[11px] font-bold">{suggestedSpot}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setLocation(suggestedSpot);
                            setIsCustomLocMode(false);
                            if (suggested?.day?.id) {
                              setSelectedTourDay(suggested.day.id);
                            }
                          }}
                          className="px-2.5 py-0.5 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-bold rounded-lg shrink-0 cursor-pointer text-[10px] shadow-2xs"
                        >
                          প্রয়োগ করুন
                        </button>
                      </div>
                    );
                  })()}

                  {locationNotification && (
                    <div className="px-2.5 py-1 bg-emerald-50 text-emerald-800 text-[10px] font-semibold rounded-lg border border-emerald-200">
                      ✓ {locationNotification}
                    </div>
                  )}

                  {!isCustomLocMode ? (
                    <div className="relative">
                      <select
                        value={location}
                        onChange={e => {
                          if (e.target.value === '__add_custom__') {
                            setIsCustomLocMode(true);
                            setCustomLocInput('');
                          } else {
                            setLocation(e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white cursor-pointer font-medium text-slate-800"
                      >
                        <optgroup label="জনপ্রিয় ট্যুর স্পট">
                          {DEFAULT_LOCATIONS.map((loc, idx) => (
                            <option key={idx} value={loc}>{loc}</option>
                          ))}
                        </optgroup>
                        {customLocations.length > 0 && (
                          <optgroup label="আমার যোগ করা কাস্টম স্থান">
                            {customLocations.map((loc, idx) => (
                              <option key={`c-${idx}`} value={loc}>⭐ {loc}</option>
                            ))}
                          </optgroup>
                        )}
                        <option value="__add_custom__" className="text-teal-700 font-bold bg-teal-50">
                          ✍️ + নতুন কাস্টম স্থান টাইপ করুন...
                        </option>
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-1.5 p-3 bg-teal-50/70 border border-teal-200 rounded-2xl animate-in fade-in duration-150">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="যেমন: ক্যাফে ডি সমুদ্র, ঝাউবন বিচ পয়েন্ট..."
                          value={customLocInput}
                          onChange={e => setCustomLocInput(e.target.value)}
                          className="flex-1 px-3 py-2 text-xs border border-teal-300 rounded-xl focus:outline-none focus:border-teal-700 bg-white text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveCustomLocation(customLocInput)}
                          disabled={!customLocInput.trim()}
                          className="px-3 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs whitespace-nowrap"
                        >
                          সংরক্ষণ
                        </button>
                      </div>
                      <p className="text-[10px] text-teal-700 leading-tight">
                        * যেকোনো কাস্টম স্থান লিখুন। এটি স্বয়ংক্রিয়ভাবে ড্রপডাউন অপশনেও সংরক্ষিত থাকবে।
                      </p>
                    </div>
                  )}

                  {/* Quick Shortcut Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px]">
                    <span className="text-slate-400 shrink-0 font-medium">দ্রুত পছন্দ:</span>
                    {['সুগন্ধা বিচ', 'ইনানী বিচ', 'হিমছড়ি', 'হোটেল সি মুন', 'ছাদখোলা বাস', 'মারমেইড ক্যাফে'].map(chip => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => {
                          setLocation(chip);
                          setIsCustomLocMode(false);
                        }}
                        className={`px-2 py-0.5 rounded-lg border shrink-0 transition cursor-pointer ${
                          location.includes(chip)
                            ? 'bg-teal-700 text-white border-teal-700 font-bold'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Member Tagging Multi-Select Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Users size={13} className="text-sky-600" /> সাথে আছেন (সদস্য ট্যাগ করুন)
                    </span>
                    {selectedTaggedMembers.length > 0 && (
                      <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full">
                        {toBnNum(selectedTaggedMembers.length)} জন ট্যাগ
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
                    {familyMemberNames.map((name) => {
                      const isSelected = selectedTaggedMembers.includes(name);
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            triggerHaptic('light');
                            setSelectedTaggedMembers((prev) =>
                              isSelected ? prev.filter((m) => m !== name) : [...prev, name]
                            );
                          }}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition cursor-pointer flex items-center gap-1 ${
                            isSelected
                              ? 'bg-sky-600 text-white shadow-2xs font-bold'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span>{name}</span>
                          {isSelected && <Check size={10} strokeWidth={3} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Drive Backup Toggle & Connection Hub */}
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HardDrive size={18} className="text-emerald-700 shrink-0" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-emerald-950">গুগল ড্রাইভে সরাসরি ব্যাকআপ</p>
                          <a
                            href={GOOGLE_DRIVE_FOLDER_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-emerald-700 hover:underline flex items-center gap-0.5 font-semibold"
                            title="ফোল্ডারটি ড্রাইভে খুলুন"
                          >
                            <ExternalLink size={10} /> ফোল্ডার
                          </a>
                        </div>
                        <p className="text-[10px] text-emerald-800">
                          কক্সবাজার ট্যুরের শেয়ার্ড ড্রাইভ ফোল্ডারে মূল ছবি সংরক্ষিত হবে
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* The full-size copy is always saved to the shared Drive folder. */}
                  {(
                    <div className="pt-2 border-t border-emerald-200/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      {isDriveConfigured ? (
                        <span className="text-emerald-800 flex items-center gap-1 font-semibold">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          ✓ ক্লাউড ড্রাইভ সক্রিয় (পোস্টের সাথে অটো-আপলোড হবে)
                        </span>
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-amber-800 font-medium text-[10px]">
                            ⚠️ ড্রাইভ এক্সেস পারমিশন দিতে হবে
                          </span>
                          <button
                            type="button"
                            onClick={handleConnectDrive}
                            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-[10px] transition cursor-pointer flex items-center gap-1 shadow-xs"
                          >
                            🔗 ড্রাইভ কানেক্ট করুন
                          </button>
                        </div>
                      )}

                      {driveNotification && (
                        <p className="text-[10px] text-teal-800 w-full font-bold">
                          {driveNotification}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                {/* Reel Upload Progress Card */}
                {isUploadingReel && (
                  <div className="p-3 bg-pink-50 border border-pink-200 rounded-2xl space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs font-bold text-pink-950">
                      <span className="flex items-center gap-1.5">
                        <Loader2 size={13} className="animate-spin text-pink-600" />
                        {reelUploadProgress?.stage === 'processing'
                          ? 'সার্ভারে কমপ্রেস ও অপ্টিমাইজ করা হচ্ছে...'
                          : `ভিডিও সার্ভারে আপলোড হচ্ছে... (${toBnNum(reelUploadProgress?.percent || 0)}%)`}
                      </span>
                      <span className="font-mono text-pink-700">{toBnNum(reelUploadProgress?.percent || 0)}%</span>
                    </div>
                    <div className="w-full bg-pink-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-pink-500 to-rose-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${reelUploadProgress?.percent || 5}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-pink-800">
                      {reelUploadProgress?.stage === 'processing'
                        ? '💡 ভিডিওর সাইজ ছোট করা হচ্ছে যাতে পরিবারের সবাই বাফার ছাড়া স্মুথভাবে দেখতে পায়।'
                        : '⚠️ অনুগ্রহ করে অপেক্ষা করুন, আপলোড শেষ না হওয়া পর্যন্ত অ্যাপ বা স্ক্রিন বন্ধ করবেন না।'}
                    </p>
                  </div>
                )}
              </div>

              {/* PINNED FOOTER */}
              <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 z-20">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isDriveUploading || isUploadingReel}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-40 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  বাতিল
                </button>
                {postError && (
                  <p role="alert" className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                    {postError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isDriveUploading || isUploadingReel}
                  className="px-5 py-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
                >
                  {isUploadingReel ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>
                        {reelUploadProgress?.stage === 'processing'
                          ? 'এইচডি প্রসেস হচ্ছে...'
                          : `আপলোড হচ্ছে (${toBnNum(reelUploadProgress?.percent || 0)}%)`}
                      </span>
                    </>
                  ) : isDriveUploading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> ড্রাইভে আপলোড হচ্ছে...
                    </>
                  ) : (
                    <>
                      <Send size={14} /> {createPostMode === 'reel' ? '🎬 রিলস পাবলিশ করুন' : 'পোস্ট পাবলিশ করুন'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULLSCREEN PHOTO PREVIEW MODAL */}
      {previewMedia && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-50 cursor-pointer animate-in fade-in duration-150 select-none"
          role="presentation"
          onClick={() => {
            setPreviewMedia(null);
            setLightboxZoom(1);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setPreviewMedia(null);
              setLightboxZoom(1);
            }
          }}
        >
          {(() => {
            const isGallery = typeof previewMedia === 'object' && Array.isArray(previewMedia?.images);
            const galleryImages = isGallery ? previewMedia.images : [previewMedia];
            const currentGalleryIdx = isGallery ? (previewMedia.index || 0) : 0;
            const currentImg = galleryImages[currentGalleryIdx] || (typeof previewMedia === 'string' ? previewMedia : '');

            return (
              <div
                className="relative max-w-4xl w-full flex flex-col items-center justify-center cursor-default"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header Controls */}
                <div className="w-full flex items-center justify-between py-2 text-white mb-1">
                  <div className="flex items-center gap-2">
                    {galleryImages.length > 1 && (
                      <span className="text-xs bg-white/20 backdrop-blur-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 shadow-sm">
                        <Images size={13} className="text-pink-300" />
                        {toBnNum(currentGalleryIdx + 1)} / {toBnNum(galleryImages.length)}
                      </span>
                    )}
                    {previewMedia?.post && (
                      <span className="text-xs bg-white/20 backdrop-blur-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5 shadow-sm text-white/95">
                        <Eye size={13} className="text-teal-300" />
                        {toBnNum(previewMedia.post.views || 0)} ভিউ
                      </span>
                    )}
                  </div>
                  {/* Zoom Controls & Action Buttons */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white/15 rounded-full p-0.5 border border-white/10">
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setLightboxZoom((z) => Math.max(1, +(z - 0.5).toFixed(1)));
                        }}
                        disabled={lightboxZoom <= 1}
                        className="p-1.5 rounded-full hover:bg-white/20 disabled:opacity-30 text-white transition cursor-pointer"
                        title="জুম কমান"
                      >
                        <ZoomOut size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setLightboxZoom(1);
                        }}
                        className="px-2 py-0.5 text-xs font-bold text-white/90 hover:text-white transition cursor-pointer"
                        title="জুম রিসেট"
                      >
                        {lightboxZoom}x
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setLightboxZoom((z) => Math.min(2.5, +(z + 0.5).toFixed(1)));
                        }}
                        disabled={lightboxZoom >= 2.5}
                        className="p-1.5 rounded-full hover:bg-white/20 disabled:opacity-30 text-white transition cursor-pointer"
                        title="জুম বাড়ান"
                      >
                        <ZoomIn size={15} />
                      </button>
                    </div>

                    <a
                      href={currentImg}
                      download={`Tour2026_${currentGalleryIdx + 1}.jpg`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-full bg-white/15 hover:bg-white/30 text-white transition cursor-pointer"
                      title="ছবিটি ডাউনলোড করুন"
                    >
                      <Download size={18} />
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewMedia(null);
                        setLightboxZoom(1);
                      }}
                      className="text-white hover:text-rose-400 bg-white/20 hover:bg-white/30 p-1.5 rounded-full transition cursor-pointer active:scale-95"
                      title="বন্ধ করুন"
                      aria-label="Close lightbox"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Main Preview Image with Double-Tap Zoom & Swipe */}
                <div
                  className="relative w-full flex items-center justify-center max-h-[75vh] overflow-hidden"
                  onTouchStart={(e) => {
                    if (lightboxZoom === 1 && e.touches.length === 1) {
                      setLightboxTouchCoord({ start: e.touches[0].clientX, end: null });
                    }
                  }}
                  onTouchMove={(e) => {
                    if (lightboxZoom === 1 && e.touches.length === 1) {
                      setLightboxTouchCoord((prev) => ({ ...prev, end: e.touches[0].clientX }));
                    }
                  }}
                  onTouchEnd={() => {
                    if (lightboxZoom === 1 && lightboxTouchCoord.start !== null && lightboxTouchCoord.end !== null) {
                      const delta = lightboxTouchCoord.start - lightboxTouchCoord.end;
                      if (delta > 50 && galleryImages.length > 1 && currentGalleryIdx < galleryImages.length - 1) {
                        triggerHaptic('light');
                        setPreviewMedia({ images: galleryImages, index: currentGalleryIdx + 1, post: previewMedia.post });
                      } else if (delta < -50 && galleryImages.length > 1 && currentGalleryIdx > 0) {
                        triggerHaptic('light');
                        setPreviewMedia({ images: galleryImages, index: currentGalleryIdx - 1, post: previewMedia.post });
                      }
                    }
                    setLightboxTouchCoord({ start: null, end: null });
                  }}
                >
                  <img
                    src={resolveMediaUrl(currentImg, previewMedia.post?.driveFileIds?.[currentGalleryIdx] || previewMedia.post?.driveFileId) || currentImg}
                    alt="Fullscreen Preview"
                    onError={(e) => {
                      const cur = e.currentTarget.getAttribute('data-error-stage') || '0';
                      const itemDriveId = previewMedia.post?.driveFileIds?.[currentGalleryIdx] || previewMedia.post?.driveFileId;
                      const itemThumb = (Array.isArray(previewMedia.post?.thumbs) ? previewMedia.post.thumbs[currentGalleryIdx] : null) || previewMedia.post?.thumb;
                      if (cur === '0' && itemThumb) {
                        e.currentTarget.setAttribute('data-error-stage', '1');
                        e.currentTarget.src = resolveMediaUrl(itemThumb, itemDriveId);
                      } else if (cur !== '2' && itemDriveId) {
                        e.currentTarget.setAttribute('data-error-stage', '2');
                        e.currentTarget.src = `https://drive.google.com/thumbnail?id=${itemDriveId}&sz=w1600`;
                      } else {
                        e.currentTarget.onerror = null;
                      }
                    }}
                    onClick={() => {
                      const now = Date.now();
                      if (now - lightboxLastTapRef.current < 300) {
                        triggerHaptic('medium');
                        setLightboxZoom((z) => (z > 1 ? 1 : 2));
                      }
                      lightboxLastTapRef.current = now;
                    }}
                    className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl select-none transition-transform duration-200 cursor-zoom-in"
                    style={{
                      transform: `scale(${lightboxZoom})`,
                      filter: getFilterCss(previewMedia.post?.filter),
                    }}
                  />

                  {/* Prev Button in Lightbox */}
                  {galleryImages.length > 1 && currentGalleryIdx > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setPreviewMedia({ images: galleryImages, index: currentGalleryIdx - 1, post: previewMedia.post });
                        setLightboxZoom(1);
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition shadow-lg cursor-pointer active:scale-90"
                      title="পূর্ববর্তী ছবি"
                      aria-label="Previous image"
                    >
                      <ChevronLeft size={24} />
                    </button>
                  )}

                  {/* Next Button in Lightbox */}
                  {galleryImages.length > 1 && currentGalleryIdx < galleryImages.length - 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setPreviewMedia({ images: galleryImages, index: currentGalleryIdx + 1, post: previewMedia.post });
                        setLightboxZoom(1);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition shadow-lg cursor-pointer active:scale-90"
                      title="পরবর্তী ছবি"
                      aria-label="Next image"
                    >
                      <ChevronRight size={24} />
                    </button>
                  )}
                </div>

                {/* Bottom Caption & Post Info Overlay */}
                {previewMedia?.post && (
                  <div className="w-full mt-2 px-3 py-2 bg-black/60 backdrop-blur-md rounded-xl text-white text-xs flex flex-col gap-1 max-w-2xl border border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-teal-300">{previewMedia.post.author}</span>
                      {previewMedia.post.location && (
                        <span className="text-[11px] text-slate-300 flex items-center gap-1">
                          <MapPin size={11} className="text-teal-400" />
                          {previewMedia.post.location}
                        </span>
                      )}
                    </div>
                    {previewMedia.post.caption && (
                      <p className="text-[11px] text-slate-200 line-clamp-2 leading-relaxed">
                        {previewMedia.post.caption}
                      </p>
                    )}
                    {Array.isArray(previewMedia.post.taggedMembers) && previewMedia.post.taggedMembers.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-white/10 text-[10px] text-sky-200">
                        <Users size={11} className="text-sky-400 shrink-0" />
                        <span>সাথে: {previewMedia.post.taggedMembers.join(', ')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* IN-APP SHARE SHEET MODAL */}
      {shareModalPost && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          role="presentation"
          onClick={() => setShareModalPost(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShareModalPost(null);
          }}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-teal-800 to-teal-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 size={18} className="text-teal-300" />
                <h4 className="font-bold text-sm">ট্যুর মেমোরি শেয়ার করুন</h4>
              </div>
              <button
                type="button"
                onClick={() => setShareModalPost(null)}
                className="p-1 rounded-full hover:bg-white/20 text-white cursor-pointer transition active:scale-90"
              >
                <X size={18} />
              </button>
            </div>

            {/* Post Preview Snippet */}
            <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
              <img
                src={photoSource(shareModalPost)}
                alt="Post preview"
                className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
              />
              <div className="min-w-0 flex-1 text-xs">
                <p className="font-bold text-slate-800 truncate">{shareModalPost.author}</p>
                <p className="text-slate-500 text-[11px] truncate flex items-center gap-1">
                  <MapPin size={10} className="text-teal-600" />
                  {shareModalPost.location || 'কক্সবাজার'}
                </p>
                {shareModalPost.caption && (
                  <p className="text-slate-600 text-[11px] truncate italic mt-0.5">
                    "{shareModalPost.caption}"
                  </p>
                )}
              </div>
            </div>

            {/* Share Feedback Toast */}
            {shareFeedback && (
              <div className="mx-4 mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold text-center animate-in fade-in">
                {shareFeedback}
              </div>
            )}

            <div className="p-4 space-y-4">
              {/* Discussion Channels Section */}
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  ট্যুর ডিসকাশন চ্যানেলে পাঠান
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleShareToDiscussionChannel('general', shareModalPost)}
                    className="p-2.5 rounded-xl border border-sky-200 bg-sky-50/70 hover:bg-sky-100 text-sky-900 flex items-center gap-2 transition text-left cursor-pointer active:scale-95"
                  >
                    <MessageSquare size={16} className="text-sky-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">সাধারণ আড্ডা</p>
                      <p className="text-[10px] text-sky-700 truncate">#general</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShareToDiscussionChannel('sightseeing', shareModalPost)}
                    className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 flex items-center gap-2 transition text-left cursor-pointer active:scale-95"
                  >
                    <Compass size={16} className="text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">দর্শনীয় স্থান</p>
                      <p className="text-[10px] text-emerald-700 truncate">#sightseeing</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShareToDiscussionChannel('food', shareModalPost)}
                    className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-900 flex items-center gap-2 transition text-left cursor-pointer active:scale-95"
                  >
                    <Utensils size={16} className="text-amber-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">খাবার মেনু</p>
                      <p className="text-[10px] text-amber-700 truncate">#food</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShareToDiscussionChannel('emergency', shareModalPost)}
                    className="p-2.5 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-900 flex items-center gap-2 transition text-left cursor-pointer active:scale-95"
                  >
                    <ShieldAlert size={16} className="text-rose-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">জরুরি হেল্প</p>
                      <p className="text-[10px] text-rose-700 truncate">#emergency</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* External Share Section */}
              <div className="pt-2 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  অন্যান্য মাধ্যমে শেয়ার
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      const shareText = `রংপুর ➔ কক্সবাজার ট্যুর ২০২৬\n${shareModalPost.author}: "${shareModalPost.caption || 'আনন্দঘন মুহূর্ত'}"\n📍 ${shareModalPost.location || 'কক্সবাজার'}\n\n👉 ফিডে দেখুন: ${window.location.origin}/#feed`;
                      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
                    }}
                    className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
                  >
                    <span>💬 WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      triggerHaptic('light');
                      const shareText = `${shareModalPost.author}: "${shareModalPost.caption || 'ট্যুর মেমোরি'}" - ${shareModalPost.location || 'কক্সবাজার'}`;
                      if (navigator.share) {
                        try {
                          await navigator.share({
                            title: 'কক্সবাজার ট্যুর ২০২৬',
                            text: shareText,
                            url: `${window.location.origin}/#feed`,
                          });
                        } catch {}
                      } else {
                        try {
                          await navigator.clipboard.writeText(`${shareText}\n${window.location.origin}/#feed`);
                          setShareFeedback('✓ লিঙ্ক ক্লিপবোর্ডে কপি হয়েছে!');
                          setTimeout(() => setShareFeedback(''), 2000);
                        } catch {}
                      }
                    }}
                    className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
                  >
                    <Copy size={14} />
                    <span>লিঙ্ক কপি</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN REELS PLAYER MODAL */}
      <ReelsPlayerModal
        reels={allReelPosts}
        initialIndex={reelsPlayer.initialIndex}
        isOpen={reelsPlayer.isOpen}
        currentUser={currentUser}
        currentProfile={currentProfile}
        members={members}
        userProfiles={userProfiles}
        onClose={handleCloseReelsPlayer}
        onLikePost={onLikePost}
        onAddComment={onAddComment}
        onViewPost={recordPostView}
        onCommentReaction={onCommentReaction}
        onUpdatePost={onUpdatePost}
      />

      {/* EDIT POST / REEL MODAL */}
      {editingPost && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
          role="presentation"
          onClick={() => setEditingPost(null)}
          onKeyDown={(e) => { if (e.key === 'Escape') setEditingPost(null); }}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden my-auto border border-slate-100 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-teal-900 text-white flex items-center justify-between">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <Edit3 size={16} className="text-amber-300" />
                {editingPost.type === 'reel' ? 'রিলসের ক্যাপশন ও স্থান এডিট করুন' : 'ছবির ক্যাপশন ও স্থান এডিট করুন'}
              </h4>
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="p-1 rounded-full hover:bg-white/20 text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePostEdit} className="p-5 space-y-4">
              <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-2xl border border-slate-100">
                <img
                  src={editingPost.thumb || photoSource(editingPost)}
                  alt="Preview"
                  className="w-14 h-14 object-cover rounded-xl shrink-0 border border-slate-200"
                />
                <div className="text-xs min-w-0">
                  <p className="font-bold text-slate-800 truncate">{editingPost.author}</p>
                  <p className="text-slate-500 text-[11px] truncate">{editingPost.createdAt}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">ক্যাপশন</label>
                <textarea
                  rows={3}
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  placeholder="একটি সুন্দর ক্যাপশন লিখুন..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">স্থান / লোকেশন</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="যেমন: সুগন্ধা বিচ, কলাতলী, ইনানী বিচ"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-md active:scale-95"
                >
                  আপডেট সেভ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIDEO TRIMMER MODAL (up to 3 minutes / 180s) */}
      <VideoTrimmerModal
        videoSource={videoSourceForTrimmer}
        isOpen={showTrimmerModal}
        onClose={() => setShowTrimmerModal(false)}
        onConfirm={(data) => {
          setTrimmedReelData(data);
          setShowTrimmerModal(false);
        }}
      />

      {/* INSTAGRAM SLIDING BOTTOM SHEET FOR COMMENTS */}
      <InstagramCommentSheet
        isOpen={Boolean(activeCommentPost)}
        post={posts.find((p) => String(p.id) === String(activeCommentPost?.id)) || activeCommentPost}
        currentUser={currentUser}
        currentProfile={currentProfile}
        members={members}
        userProfiles={userProfiles}
        onClose={() => setActiveCommentPost(null)}
        onAddComment={onAddComment}
        onCommentReaction={onCommentReaction}
      />

      {/* FULLSCREEN INSTAGRAM STORY VIEWER MODAL */}
      <StoryViewerModal
        isOpen={storyViewer.isOpen}
        membersWithStories={membersWithStories}
        initialMemberIndex={storyViewer.memberIndex}
        onClose={() => setStoryViewer({ isOpen: false, memberIndex: 0 })}
        onLikePost={onLikePost}
        onAddComment={onAddComment}
        onViewPost={recordPostView}
        currentUser={currentUser}
        currentProfile={currentProfile}
        members={members}
        userProfiles={userProfiles}
      />
    </div>
  );
}
