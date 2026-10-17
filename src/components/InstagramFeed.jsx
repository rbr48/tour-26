import React, { useState, useEffect } from 'react';
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
  X,
  Check,
  Trash2,
  Loader2,
} from 'lucide-react';
import { compressImageFile } from '../utils/imageCompressor';
import {
  getDriveAccessToken,
  getAppsScriptWebhook,
  GOOGLE_DRIVE_FOLDER_URL,
} from '../services/googleDriveService';
import {
  isDataImage,
  preparePhotoFromDataUrl,
  preparePhotoFromUrl,
  syncLegacyPhotoToDrive,
} from '../services/photos';
import { newId } from '../services/tourStore';
import { connectGoogleDrive } from '../firebase';

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

export default function InstagramFeed({
  posts = [],
  currentUser = null,
  currentProfile = {},
  members = [],
  onAddPost,
  onLikePost,
  onAddComment,
  onDeletePost,
  onUpdatePost
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeStoryFilter, setActiveStoryFilter] = useState('all');
  const [previewMedia, setPreviewMedia] = useState(null);
  const [sharingPostId, setSharingPostId] = useState(null);

  // New post form state with auto-save draft
  const [caption, setCaption] = useState(() => {
    try {
      return localStorage.getItem('tour_post_draft_caption') || '';
    } catch {
      return '';
    }
  });

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
  const [imageFilePreview, setImageFilePreview] = useState(null);
  const [postError, setPostError] = useState('');

  // Google Drive state & handlers
  const [isDriveUploading, setIsDriveUploading] = useState(false);
  const [hasDriveToken, setHasDriveToken] = useState(() => Boolean(getDriveAccessToken()));
  const [driveNotification, setDriveNotification] = useState('');
  const [manualDriveUploadId, setManualDriveUploadId] = useState(null);
  const [isBatchSyncing, setIsBatchSyncing] = useState(false);
  const [batchSyncProgress, setBatchSyncProgress] = useState('');

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

  // Handle local file upload (converts & compresses to web-optimized DataURL)
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        alert('ছবির সাইজ ২৫MB এর কম হতে হবে');
        return;
      }
      setPostError('');
      try {
        const compressed = await compressImageFile(file, 900, 900, 0.7);
        setImageFilePreview(compressed);
      } catch (err) {
        console.warn('Image compression fallback to direct FileReader:', err);
        const reader = new FileReader();
        reader.onload = (loadEvt) => {
          if (loadEvt.target?.result) {
            setImageFilePreview(loadEvt.target.result);
          }
        };
        reader.readAsDataURL(file);
      }
      e.target.value = '';
    }
  };

  const photoSource = (post) => {
    if (!post) return null;
    if (post.thumb && typeof post.thumb === 'string') return post.thumb;
    if (post.image && typeof post.image === 'string' && !post.image.includes('drive.google.com/file/d/')) return post.image;
    if (post.photo && typeof post.photo === 'string') return post.photo;
    if (post.url && typeof post.url === 'string') return post.url;
    if (post.imageUrl && typeof post.imageUrl === 'string') return post.imageUrl;
    if (post.driveFileId) {
      return `https://drive.google.com/thumbnail?id=${post.driveFileId}&sz=w1000`;
    }
    return post.image || post.thumb || null;
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

  const handleShareMedia = async (post) => {
    const src = photoSource(post);
    if (!src) return;
    setSharingPostId(post.id);

    try {
      const file = await getFileFromPhoto(src, post);
      const shareText = post.caption ? `${post.author}: ${post.caption}` : 'রংপুর ➔ কক্সবাজার ফ্যামিলি ট্যুর ২০২৬';

      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'রংপুর ➔ কক্সবাজার ফ্যামিলি ট্যুর ২০২৬',
          text: shareText,
        });
        return;
      }

      downloadPhoto(src, post);
      if (navigator.share) {
        await navigator.share({
          title: 'রংপুর ➔ কক্সবাজার ফ্যামিলি ট্যুর ২০২৬',
          text: `${shareText}\n(ছবিটি ডিভাইসে ডাউনলোড করা হয়েছে)`,
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
    const link = imageInput.trim();
    const hasFile = Boolean(imageFilePreview);
    if (!hasFile && !link) {
      setPostError('অনুগ্রহ করে একটি ছবি নির্বাচন করুন বা ছবির লিংক দিন');
      return;
    }
    setPostError('');

    const authorName = currentProfile?.displayName || currentUser?.displayName || 'পরিবারের সদস্য';
    const finalLocation = isCustomLocMode && customLocInput.trim() ? customLocInput.trim() : (location || 'লাবণী ও সুগন্ধা বিচ');
    if (isCustomLocMode && customLocInput.trim()) {
      handleSaveCustomLocation(customLocInput.trim());
    }
    const postCaption = caption || 'রংপুর ➔ কক্সবাজার ফ্যামিলি ট্যুর ২০২৬ এর আনন্দঘন মুহূর্ত! 🏖️✨';

    const basePhoto = imageFilePreview || link || null;
    let finalThumb = basePhoto;
    try {
      finalThumb = await makeThumbnail(basePhoto);
    } catch (e) {
      console.warn('Thumbnail generation warning:', e);
    }

    const postId = newId();
    const profilePhoto = currentProfile?.customPhotoURL;

    const newPost = {
      id: postId,
      author: authorName,
      authorEmail: currentUser?.email || 'member@tour.family',
      authorPhoto: typeof profilePhoto === 'string' && !profilePhoto.startsWith('data:')
        ? profilePhoto
        : (currentUser?.photoURL || null),
      caption: postCaption,
      location: finalLocation,
      likes: [],
      comments: [],
      thumb: finalThumb,
      image: finalThumb,
      driveBackedUp: false,
      driveFileId: null,
      driveViewUrl: null,
      createdAt: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' }),
    };

    // 1. Post is added to feed and Firestore instantly!
    onAddPost(newPost);
    setCaption('');
    setImageInput('');
    setImageFilePreview(null);
    setIsCustomLocMode(false);
    setCustomLocInput('');
    try {
      localStorage.removeItem('tour_post_draft_caption');
    } catch {}
    setShowCreateModal(false);

    // 2. Upload to Google Drive in the background (zero blocking)
    if (hasFile && basePhoto) {
      uploadToGoogleDrive({
        imageDataUrl: basePhoto,
        fileName: `Tour2026_${authorName.replace(/\s+/g, '_')}_${Date.now()}.jpg`,
        caption: postCaption,
      }).then((upload) => {
        if (upload?.success && upload.fileId) {
          onUpdatePost?.(postId, {
            driveBackedUp: true,
            driveFileId: upload.fileId,
            driveViewUrl: upload.webViewLink,
          });
        }
      }).catch((err) => {
        console.warn('Background Drive backup skipped or delayed:', err?.message || err);
      });
    }
  };

  const handleCommentSubmit = (postId) => {
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;

    const authorName = currentProfile?.displayName || currentUser?.displayName || 'পরিবারের সদস্য';

    onAddComment(postId, {
      id: Date.now(),
      user: authorName,
      text: text.trim(),
      time: 'এইমাত্র'
    });

    setCommentInputs({ ...commentInputs, [postId]: '' });
  };

  // Filter posts if story filter is clicked
  const filteredPosts = activeStoryFilter === 'all'
    ? posts
    : posts.filter(p => p.author?.includes(activeStoryFilter));

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-8">
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
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 p-3.5 sm:p-4 rounded-3xl border border-emerald-200/90 shadow-2xs space-y-2.5 text-xs text-slate-700">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <HardDrive size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-extrabold text-xs text-slate-900">গুগল ড্রাইভ ব্যাকআপ হাব</p>
                {isDriveConfigured ? (
                  <span className="text-[9px] bg-emerald-200 text-emerald-900 font-bold px-1.5 py-0.2 rounded-md">
                    ✓ ড্রাইভ সংযুক্ত
                  </span>
                ) : (
                  <span className="text-[9px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.2 rounded-md">
                    কানেক্ট বাকি
                  </span>
                )}
              </div>
              <p className="text-[11px] text-emerald-800">
                {posts.length > 0
                  ? `${posts.length}টি ছবির মধ্যে ${posts.filter(p => p.driveBackedUp).length}টি ড্রাইভে ব্যাকআপ সম্পন্ন`
                  : 'কক্সবাজার ট্যুরের সব ছবি ড্রাইভে ক্লাউড ব্যাকআপ হবে'}
              </p>
            </div>
          </div>

          <a
            href={GOOGLE_DRIVE_FOLDER_URL}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-[11px] font-bold flex items-center gap-1 transition shadow-xs shrink-0 cursor-pointer"
            title="গুগল ড্রাইভ ফোল্ডার ব্রাউজ করুন"
          >
            <ExternalLink size={12} /> ফোল্ডার
          </a>
        </div>

        {/* Action Controls: Batch Sync All & Connect */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-200/80 text-[11px]">
          {isBatchSyncing ? (
            <div className="flex items-center gap-2 text-teal-900 font-bold w-full py-1">
              <Loader2 size={14} className="animate-spin text-teal-700" />
              <span>{batchSyncProgress || 'ড্রাইভে ছবি আপলোড হচ্ছে...'}</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                {posts.filter(p => !p.driveBackedUp && p.image).length > 0 ? (
                  <button
                    type="button"
                    onClick={handleSyncAllToDrive}
                    className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer transition text-[11px]"
                  >
                    <HardDrive size={13} /> সব ({posts.filter(p => !p.driveBackedUp && p.image).length}টি) ছবি ড্রাইভে সিঙ্ক করুন
                  </button>
                ) : (
                  <span className="text-emerald-800 font-semibold flex items-center gap-1">
                    <Check size={13} className="text-emerald-600" /> সব ছবি ড্রাইভে সুরক্ষিত আছে
                  </span>
                )}
              </div>

              {!hasDriveToken && (
                <button
                  type="button"
                  onClick={handleConnectDrive}
                  className="px-2.5 py-1.5 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 font-bold rounded-xl flex items-center gap-1 cursor-pointer transition text-[10px]"
                >
                  🔗 ড্রাইভ পারমিশন দিন
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Stories / Member Filters Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3 overflow-x-auto">
        <button
          onClick={() => setActiveStoryFilter('all')}
          className={`flex flex-col items-center gap-1 cursor-pointer shrink-0 ${
            activeStoryFilter === 'all' ? 'opacity-100' : 'opacity-70 hover:opacity-100'
          }`}
        >
          <div className={`w-13 h-13 rounded-full p-0.5 flex items-center justify-center ${
            activeStoryFilter === 'all'
              ? 'ring-2 ring-pink-500 bg-gradient-to-tr from-amber-400 to-pink-600'
              : 'border border-slate-200 bg-slate-50'
          }`}>
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center font-bold text-xs text-slate-800">
              সবাই
            </div>
          </div>
          <span className="text-[10px] font-medium text-slate-700">সকল ফটো</span>
        </button>

        {members.map(m => {
          const isSelected = activeStoryFilter === m.name;
          return (
            <button
              key={m.id}
              onClick={() => setActiveStoryFilter(isSelected ? 'all' : m.name)}
              className="flex flex-col items-center gap-1 cursor-pointer shrink-0"
            >
              <div className={`w-13 h-13 rounded-full p-0.5 flex items-center justify-center ${
                isSelected
                  ? 'ring-2 ring-pink-500 bg-gradient-to-tr from-amber-400 to-pink-600'
                  : 'bg-gradient-to-tr from-slate-200 to-teal-200 hover:from-amber-300 hover:to-pink-500'
              }`}>
                <div className="w-full h-full rounded-full bg-teal-800 text-white flex items-center justify-center font-bold text-xs">
                  {m.name.slice(0, 2)}
                </div>
              </div>
              <span className="text-[10px] font-medium text-slate-700 max-w-[60px] truncate">
                {m.name.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Instagram-style Posts Feed */}
      <div className="space-y-6">
        {filteredPosts.length > 0 ? (
          filteredPosts.map(post => {
            const isLiked = post.likes?.includes(currentUser?.displayName || 'user') || post.likes?.includes('রাজু ভাই');
            const likeCount = (post.likes || []).length;
            const isSharing = sharingPostId === post.id;

            return (
              <div
                key={post.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Post Header */}
                <div className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {post.authorPhoto ? (
                      <img
                        src={post.authorPhoto}
                        alt={post.author}
                        className="w-9 h-9 rounded-full object-cover ring-2 ring-pink-400"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-teal-700 to-teal-900 text-white flex items-center justify-center font-bold text-xs ring-2 ring-pink-400">
                        {post.author?.[0] || 'F'}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{post.author}</h4>
                      <p className="text-[10px] text-teal-700 flex items-center gap-1 font-medium">
                        <MapPin size={10} /> {post.location}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-[10px] text-slate-400">{post.createdAt}</span>
                    {onDeletePost && Boolean(
                      (currentUser?.email && post.authorEmail && post.authorEmail.toLowerCase() === currentUser.email.toLowerCase()) ||
                      (!post.authorEmail && (currentProfile?.displayName || currentUser?.displayName) && post.author === (currentProfile?.displayName || currentUser?.displayName))
                    ) && (
                      <button
                        onClick={() => onDeletePost(post.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                        title="নিজের পোস্ট মুছুন"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Media Image */}
                <div
                  className="relative bg-slate-900 cursor-pointer overflow-hidden max-h-[500px] flex items-center justify-center"
                 role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }}  onClick={() => setPreviewMedia(photoSource(post))}
                >
                  <img
                    src={photoSource(post)}
                    alt={post.caption}
                    className="w-full object-contain max-h-[500px] hover:scale-102 transition duration-300"
                  />
                  {post.driveBackedUp ? (
                    <a
                      href={post.driveViewUrl || GOOGLE_DRIVE_FOLDER_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute top-2 right-2 bg-emerald-950/80 hover:bg-emerald-900 backdrop-blur-xs text-emerald-300 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 transition shadow-xs border border-emerald-500/30"
                      title="গুগল ড্রাইভ ফোল্ডারে ছবিটি দেখুন"
                    >
                      <HardDrive size={10} className="text-emerald-400" /> ✓ ড্রাইভে সংরক্ষিত
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleManualDriveBackup(post)}
                      disabled={manualDriveUploadId === post.id}
                      className="absolute top-2 right-2 bg-black/60 hover:bg-slate-900 backdrop-blur-xs text-white hover:text-emerald-300 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 transition cursor-pointer border border-white/20"
                      title="গুগল ড্রাইভ ফোল্ডারে ব্যাকআপ পাঠান"
                    >
                      {manualDriveUploadId === post.id ? (
                        <Loader2 size={10} className="animate-spin text-emerald-400" />
                      ) : (
                        <HardDrive size={10} className="text-amber-300" />
                      )}
                      <span>ড্রাইভে পাঠান</span>
                    </button>
                  )}
                </div>

                {/* Post Actions Bar */}
                <div className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Like Button */}
                      <button
                        onClick={() => onLikePost(post.id, currentUser?.displayName || 'user')}
                        className={`flex items-center gap-1.5 transition cursor-pointer ${
                          isLiked ? 'text-rose-600 scale-110' : 'text-slate-700 hover:text-rose-500'
                        }`}
                      >
                        <Heart size={22} fill={isLiked ? 'currentColor' : 'none'} />
                        <span className="text-xs font-bold">{likeCount}</span>
                      </button>

                      {/* Comment Count */}
                      <button className="flex items-center gap-1.5 text-slate-700 hover:text-teal-600 transition cursor-pointer">
                        <MessageCircle size={21} />
                        <span className="text-xs font-bold">{(post.comments || []).length}</span>
                      </button>

                      {/* Share Original Media Button */}
                      <button
                        onClick={() => handleShareMedia(post)}
                        disabled={isSharing}
                        className="flex items-center gap-1 text-slate-700 hover:text-teal-600 transition cursor-pointer disabled:opacity-50"
                        title="সরাসরি মূল ছবিটি শেয়ার করুন"
                      >
                        {isSharing ? (
                          <Loader2 size={20} className="animate-spin text-teal-600" />
                        ) : (
                          <Share2 size={20} />
                        )}
                        <span className="text-[11px] font-medium hidden xs:inline">শেয়ার</span>
                      </button>
                    </div>

                    <a
                      href={photoSource(post)}
                      download={`CoxsBazar_Tour2026_${post.id}.jpg`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-400 hover:text-slate-800 transition p-1"
                      title="ছবি ডাউনলোড করুন"
                    >
                      <Download size={18} />
                    </a>
                  </div>

                  {/* Caption */}
                  <div className="text-xs text-slate-800 leading-relaxed pt-1">
                    <span className="font-bold mr-1.5">{post.author}</span>
                    <span>{post.caption}</span>
                  </div>

                  {/* Comments Preview */}
                  {(post.comments || []).length > 0 && (
                    <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
                      {post.comments.slice(-3).map(c => (
                        <div key={c.id} className="text-[11px] text-slate-700">
                          <strong className="font-bold text-slate-900 mr-1">{c.user}:</strong>
                          <span>{c.text}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Comment Input */}
                  <div className="pt-2 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="একটি মন্তব্য লিখুন..."
                      value={commentInputs[post.id] || ''}
                      onChange={e => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                      onKeyDown={e => e.key === 'Enter' && handleCommentSubmit(post.id)}
                      className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
                    />
                    <button
                      onClick={() => handleCommentSubmit(post.id)}
                      className="p-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl transition cursor-pointer"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
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
                <Camera size={18} className="text-pink-600 shrink-0" /> নতুন ট্যুর ফটো পোস্ট করুন
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
                {/* Media Selection / Upload */}
                <div className="space-y-2">
                  <p id="feed-media-label" className="text-xs font-bold text-slate-700 block">ছবি আপলোড বা ছবি নির্বাচন</p>

                  {/* File picker */}
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="feed-photo-file-input"
                      className="flex-1 py-4 px-4 bg-teal-50 hover:bg-teal-100 text-teal-900 border-2 border-dashed border-teal-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition text-xs font-semibold shadow-xs active:scale-98"
                    >
                      <Camera size={22} className="mb-1.5 text-teal-600" />
                      <span className="text-sm font-bold text-teal-950">ডিভাইস বা ক্যামেরা থেকে ছবি তুলুন</span>
                      <span className="text-[11px] text-teal-700 mt-0.5">গ্যালারি বা ক্যামেরা থেকে ছবি বাছাই করতে এখানে ট্যাপ করুন</span>
                      <input
                        id="feed-photo-file-input"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                    </label>
                  </div>

                  {/* Image preview */}
                  {imageFilePreview && (
                    <div className="space-y-1.5 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        <span className="flex items-center gap-1">✓ ছবি সফলভাবে নির্বাচন করা হয়েছে!</span>
                        <button
                          type="button"
                          onClick={() => setImageFilePreview(null)}
                          className="text-rose-600 hover:text-rose-800 text-[10px] underline cursor-pointer"
                        >
                          মুছে ফেলুন
                        </button>
                      </div>
                      <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-400 max-h-56 flex items-center justify-center bg-slate-900 shadow-inner">
                        <img src={imageFilePreview} alt="Preview" className="max-h-56 object-contain" />
                        <button
                          type="button"
                          onClick={() => setImageFilePreview(null)}
                          className="absolute top-2 right-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1.5 text-xs cursor-pointer shadow-md"
                          title="ছবি বাতিল করুন"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Or image URL input */}
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">অথবা ছবির সরাসরি ওয়েব/ড্রাইভ লিংক দিন:</span>
                    <input
                      type="url"
                      placeholder="https://... (ইমেজ লিংক)"
                      value={imageInput}
                      onChange={e => setImageInput(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                    />
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
              </div>

              {/* PINNED FOOTER */}
              <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 z-20">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
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
                  disabled={isDriveUploading}
                  className="px-5 py-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
                >
                  {isDriveUploading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> ড্রাইভে আপলোড হচ্ছে...
                    </>
                  ) : (
                    <>
                      <Send size={14} /> পোস্ট পাবলিশ করুন
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
          className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 cursor-pointer"
         role="presentation"
 onClick={() => setPreviewMedia(null)}
onKeyDown={(e) => { if (e.key === 'Escape') e.currentTarget.click(); }}
        >
          <div className="relative max-w-2xl w-full">
            <button
              onClick={() => setPreviewMedia(null)}
              className="absolute -top-10 right-0 text-white hover:text-rose-400 font-bold text-sm bg-white/20 p-1.5 rounded-full cursor-pointer"
            >
              <X size={18} />
            </button>
            <img
              src={previewMedia}
              alt="Fullscreen Preview"
              className="w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
