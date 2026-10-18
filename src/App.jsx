import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar, Wallet, CheckSquare, PhoneCall, Trash2, CheckCircle2, Circle, RefreshCw, Bus, Hotel,
  Navigation, Eye, ShieldCheck, Clock, LogOut, Flame, Megaphone, Printer, Edit3, Save, X,
  Camera, MessageSquare, Menu, Smartphone, Sparkles, Compass, Plus, ExternalLink, Users,
  ImageIcon, Terminal, AlertTriangle, MapPin, HardDrive, RotateCcw,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Network } from '@capacitor/network';
import { auth, signInWithGoogle, logoutUser } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import TideWeatherWidget from './components/TideWeatherWidget';
import NotificationCenter from './components/NotificationCenter';
import ConfirmDialog from './components/ConfirmDialog';
import UserAvatar from './components/UserAvatar';
import { useBackHandler, dispatchBackAction } from './utils/backNavigation';
import {
  sendPushNotification,
  sendBroadcastPush,
  subscribeToPushNotifications,
  initNativePushListeners,
} from './services/notificationService';
import { SEED_DATA } from './data/seed';
import {
  addItem,
  clearMyLocation,
  migrateLegacyTour,
  newId,
  pullFromArray,
  pushToArray,
  removeItem,
  saveLocation,
  saveProfile,
  seedTour,
  setReaction,
  subscribeToTour,
  updateItem,
  updateTourDetails,
} from './services/tourStore';
import { saveBackup } from './services/backupService';
import { FUND_LABEL, computeLedger, payerIdFor } from './utils/ledger';
import { localISODate, localTimeHHMM } from './utils/date';
import { toBnNum } from './utils/videoHelper';
import { checkForAppUpdate } from './utils/appUpdater';

// Heavy screens load on demand so the first screen opens quickly.
const SplitwiseManager = lazy(() => import('./components/SplitwiseManager'));
const BusSeatMap = lazy(() => import('./components/BusSeatMap'));
const HotelRoomMap = lazy(() => import('./components/HotelRoomMap'));
const NoticeBoard = lazy(() => import('./components/NoticeBoard'));
const InstagramFeed = lazy(() => import('./components/InstagramFeed'));
const DiscordDiscussion = lazy(() => import('./components/DiscordDiscussion'));
const CommandPalette = lazy(() => import('./components/CommandPalette'));
const UserProfileModal = lazy(() => import('./components/UserProfileModal'));
const PrintableReport = lazy(() => import('./components/PrintableReport'));
const FamilySafetyHub = lazy(() => import('./components/FamilySafetyHub'));
const TourQuizModal = lazy(() => import('./components/TourQuizModal'));
const AppUpdateModal = lazy(() => import('./components/AppUpdateModal'));

const VALID_TABS = ['dashboard', 'itinerary', 'expenses', 'seats_rooms', 'feed', 'discussions', 'notices', 'checklist'];
const CACHE_KEY = 'rangpur_coxs_tour_data';
const ACTIVITY_KEY = 'tour_recent_activities';
const CHANNEL_LABELS = { general: 'সাধারণ আড্ডা', food: 'খাবার মেনু', sightseeing: 'দর্শনীয় স্থান', emergency: 'জরুরি সাহায্য' };
const LIST_KEYS = ['itinerary', 'members', 'expenses', 'checklist', 'notices', 'posts'];

const nowLabel = () => new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });

const emptyTrip = () => ({
  tourInfo: SEED_DATA.tourInfo,
  meetingPoint: SEED_DATA.meetingPoint,
  hotelRooms: null,
  busSeats: null,
  itinerary: [],
  members: [],
  expenses: [],
  checklist: [],
  notices: [],
  posts: [],
  discussions: {},
  familyLocations: {},
  userProfiles: {},
});

/** Last trip data seen on this device, shown instantly before the live data arrives. */
function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const cached = raw ? JSON.parse(raw) : null;
    if (!cached || LIST_KEYS.some((key) => cached[key] !== undefined && !Array.isArray(cached[key]))) {
      return null;
    }
    return cached;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    const slim = {
      ...data,
      posts: (data.posts || []).slice(0, 30).map((post) => ({
        ...post,
        thumb: post.thumb || post.image || null,
        image: post.image || post.thumb || null,
        images: Array.isArray(post.images) ? post.images.slice(0, 10) : undefined,
      })),
      familyLocations: {},
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(slim));
  } catch {
    // Storage can be full or unavailable; the live data still works without the cache.
  }
}

function initialTripData() {
  const cached = readCache();
  return cached ? { ...emptyTrip(), ...cached, tourInfo: cached.tourInfo ?? SEED_DATA.tourInfo } : emptyTrip();
}

const GoogleIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

const LoadingFallback = () => (
  <div className="flex items-center justify-center py-10 text-xs font-medium text-slate-500">লোড হচ্ছে...</div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    // 1. Check URL hash first (e.g. #expenses, #feed, #discussions, etc.)
    const hash = window.location.hash.replace('#', '').trim();
    const tab = hash.split('?')[0];
    if (tab && VALID_TABS.includes(tab)) {
      return tab;
    }
    // 2. Check localStorage
    try {
      const saved = localStorage.getItem('tour_active_tab');
      if (saved && VALID_TABS.includes(saved)) {
        return saved;
      }
    } catch {
      // Storage unavailable: fall back to the dashboard.
    }
    return 'dashboard';
  });

  const [seatRoomSubTab, setSeatRoomSubTab] = useState(() => {
    try {
      return localStorage.getItem('tour_seat_room_subtab') || 'bus';
    } catch {
      return 'bus';
    }
  });

  const [data, setData] = useState(initialTripData);

  // Mobile Drawer State
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [tabHistory, setTabHistory] = useState(() => [activeTab]);
  const lastBackPressRef = useRef(0);

  // Sign-in and sync state
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [syncStatus, setSyncStatus] = useState('সংযোগ করা হচ্ছে...');
  const [lastSyncedTime, setLastSyncedTime] = useState(null);
  const [backupStatus, setBackupStatus] = useState(null);
  const [remoteReady, setRemoteReady] = useState(false);
  const [tourExists, setTourExists] = useState(false);
  const [upgradeNotice, setUpgradeNotice] = useState(null);

  const [previewImage, setPreviewImage] = useState(null);

  // Advanced Feature Modals & Navigation Sub-states
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [showPrintReport, setShowPrintReport] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  // Feature Modals
  const [showSafetyHubModal, setShowSafetyHubModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [confirmRequest, setConfirmRequest] = useState(null);
  const [appUpdateInfo, setAppUpdateInfo] = useState(null);
  const [showAppUpdateModal, setShowAppUpdateModal] = useState(false);

  // Check for in-app OTA updates on launch (Native Android APK only)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let active = true;
    const timer = setTimeout(() => {
      checkForAppUpdate().then((info) => {
        if (active && info?.hasUpdate) {
          setAppUpdateInfo(info);
          setShowAppUpdateModal(true);
        }
      });
    }, 2500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  // Activity Feed & Push Notification State
  const [activities, setActivities] = useState(() => {
    try {
      const saved = localStorage.getItem(ACTIVITY_KEY);
      return saved ? JSON.parse(saved) : [
        { id: 1, type: 'notice', title: 'ট্যুর যাত্রা নিশ্চিত', body: '১৯ অক্টোবর সন্ধ্যা ৬টায় কামারপাড়া থেকে বাস ছাড়বে।', tab: 'notices', time: 'আজ' },
        { id: 2, type: 'feed', title: 'ইনস্টাফিড সক্রিয়', body: 'ট্যুরের আনন্দঘন ছবি শেয়ার করতে ইনস্টাফিড প্রস্তুত!', tab: 'feed', time: 'আজ' },
      ];
    } catch {
      return [];
    }
  });
  const [activeToast, setActiveToast] = useState(null);

  // Form States
  const [newMember, setNewMember] = useState({ name: '', phone: '', seat: '', room: '', deposit: '', familyCount: 1 });
  const [newPlan, setNewPlan] = useState({ day: '', title: '', time: '', location: '', notes: '' });
  const [newCheckItem, setNewCheckItem] = useState('');

  const emailRef = useRef(null);
  const membersRef = useRef([]);
  const seedingRef = useRef(false);
  const upgradingRef = useRef(false);

  const addActivity = useCallback((activity) => {
    setActivities((prev) => {
      const updated = [{ ...activity, read: false }, ...prev.slice(0, 24)];
      try {
        localStorage.setItem(ACTIVITY_KEY, JSON.stringify(updated));
      } catch {
        // Activity history is a convenience; losing it is harmless.
      }
      return updated;
    });
    setActiveToast(activity);
    setTimeout(() => {
      setActiveToast((cur) => (cur?.id === activity.id ? null : cur));
    }, 5500);
  }, []);

  const markActivityRead = useCallback((id) => {
    setActivities((prev) => {
      const updated = prev.map((act) => (act.id === id ? { ...act, read: true } : act));
      try {
        localStorage.setItem(ACTIVITY_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const markAllActivitiesRead = useCallback(() => {
    setActivities((prev) => {
      const updated = prev.map((act) => ({ ...act, read: true }));
      try {
        localStorage.setItem(ACTIVITY_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const clearActivity = useCallback((id) => {
    setActivities((prev) => {
      const updated = prev.filter((act) => act.id !== id);
      try {
        localStorage.setItem(ACTIVITY_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const clearAllActivities = useCallback(() => {
    setActivities([]);
    try {
      localStorage.removeItem(ACTIVITY_KEY);
    } catch {}
  }, []);

  const closeConfirm = useCallback(() => setConfirmRequest(null), []);

  const askConfirm = (request) => setConfirmRequest(request);

  const reportSaveFailure = useCallback((err) => {
    console.error('Save failed:', err);
    const denied = err?.code === 'permission-denied';
    setActiveToast({
      id: newId(),
      type: 'error',
      title: 'সংরক্ষণ হয়নি',
      body: denied ? 'আপনার এই কাজটি করার অনুমতি নেই।' : 'ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।',
      tab: 'dashboard',
      time: 'এইমাত্র',
    });
  }, []);

  const save = (promise) => promise.catch(reportSaveFailure);

  // Sync activeTab with URL hash and localStorage (prevents resetting on refresh)
  useEffect(() => {
    try {
      localStorage.setItem('tour_active_tab', activeTab);
      const currentTabInHash = window.location.hash.replace('#', '').split('?')[0];
      if (currentTabInHash !== activeTab) {
        window.history.replaceState(null, '', `#${activeTab}`);
      }
    } catch {
      // Storage or history unavailable: the tab still works for this visit.
    }
  }, [activeTab]);

  // Sync seatRoomSubTab with localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tour_seat_room_subtab', seatRoomSubTab);
    } catch {
      // Remembering the sub-tab is optional.
    }
  }, [seatRoomSubTab]);

  // Listen for browser back/forward or hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').trim();
      const tab = hash.split('?')[0];
      if (tab && VALID_TABS.includes(tab)) {
        setActiveTab(tab);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Native Android Platform Lifecycle: Status Bar, Splash Screen, & Network Listener
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    StatusBar.setBackgroundColor({ color: '#134e4a' }).catch(() => {});
    const splashTimer = setTimeout(() => {
      SplashScreen.hide({ fadeOutDuration: 350 }).catch(() => {});
      initNativePushListeners((tab) => setActiveTab(tab));
    }, 300);
    const networkListener = Network.addListener('networkStatusChange', (status) => {
      setSyncStatus(status.connected ? 'ইন্টারনেট সংযুক্ত' : 'ইন্টারনেট অফলাইন (লোকাল মোড)');
    });
    return () => {
      clearTimeout(splashTimer);
      networkListener.then((handle) => handle.remove()).catch(() => {});
    };
  }, []);

  // App-level modal back handlers registered with priority
  useBackHandler(Boolean(confirmRequest), closeConfirm, 100);
  useBackHandler(Boolean(previewImage), () => setPreviewImage(null), 50);
  useBackHandler(showSafetyHubModal, () => setShowSafetyHubModal(false), 20);
  useBackHandler(showQuizModal, () => setShowQuizModal(false), 20);
  useBackHandler(showProfileModal, () => setShowProfileModal(false), 20);
  useBackHandler(showPrintReport, () => setShowPrintReport(false), 20);
  useBackHandler(isCommandOpen, () => setIsCommandOpen(false), 20);
  useBackHandler(isMobileSidebarOpen, () => setIsMobileSidebarOpen(false), 15);

  // Universal Back Button Handler for Native Android and Mobile Web
  useEffect(() => {
    const handleBackButton = () => {
      // 1. If any modal, drawer, or lightbox is open on the stack, close it!
      if (dispatchBackAction()) {
        return;
      }

      // 2. If tab history has previous tabs, navigate back to previous tab
      if (tabHistory.length > 1) {
        setTabHistory((prev) => {
          if (prev.length <= 1) return prev;
          const next = [...prev];
          next.pop(); // remove current tab
          const prevTab = next[next.length - 1] || 'dashboard';
          setActiveTab(prevTab);
          return next;
        });
        return;
      }

      // 3. If activeTab is not dashboard, return to dashboard
      if (activeTab !== 'dashboard') {
        setActiveTab('dashboard');
        setTabHistory(['dashboard']);
        return;
      }

      // 4. On root dashboard with no overlays: require double-back confirmation to exit
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        if (Capacitor.isNativePlatform()) {
          CapApp.exitApp();
        }
      } else {
        lastBackPressRef.current = now;
        if (!Capacitor.isNativePlatform()) {
          try {
            window.history.pushState({ tourRoot: true }, '');
          } catch {}
        }
        setActiveToast({
          id: newId(),
          type: 'info',
          title: 'অ্যাপ বন্ধ করতে আবার ব্যাক চাপুন',
        });
      }
    };

    let capListenerHandle = null;
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('backButton', handleBackButton).then((handle) => {
        capListenerHandle = handle;
      }).catch(() => {});
    }

    const handlePopState = () => {
      handleBackButton();
    };
    window.addEventListener('popstate', handlePopState);

    if (!Capacitor.isNativePlatform()) {
      try {
        window.history.replaceState({ tourRoot: true }, '');
      } catch {}
    }

    return () => {
      if (capListenerHandle) {
        capListenerHandle.remove();
      }
      window.removeEventListener('popstate', handlePopState);
    };
  }, [tabHistory, activeTab]);

  // Haptic Feedback Tab Navigation with history stack tracking
  const handleSelectTab = (tabId) => {
    if (Capacitor.isNativePlatform()) {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    }
    if (tabId !== activeTab) {
      setTabHistory((prev) => [...prev.filter((t) => t !== tabId), tabId]);
      setActiveTab(tabId);
    }
  };

  // 1. Firebase Auth state. Only Google accounts on the family list can use the app.
  useEffect(() => onAuthStateChanged(auth, (user) => {
    setCurrentUser(user);
    setIsAuthLoading(false);
    setSyncStatus(user ? 'ফায়ারবেস সিঙ্ক হচ্ছে...' : 'লগইন প্রয়োজন');
    if (user) {
      setAuthError(null);
    } else {
      setRemoteReady(false);
      setTourExists(false);
    }
  }), []);

  useEffect(() => {
    emailRef.current = currentUser?.email ? currentUser.email.toLowerCase() : null;
  }, [currentUser]);

  useEffect(() => {
    membersRef.current = data.members;
  }, [data.members]);

  const uid = currentUser?.uid ?? null;
  const isAdmin = Boolean(currentUser?.email);

  // Auto-subscribe to Push if permission is granted or on native platform
  useEffect(() => {
    if (!uid) return;
    if (Capacitor.isNativePlatform()) {
      subscribeToPushNotifications(currentUser).catch(() => {});
    } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      subscribeToPushNotifications(currentUser).catch(() => {});
    }
  }, [uid, currentUser]);

  // 2. Live trip data. Each change in Firestore arrives here, and the app announces what
  //    other people added. Writes made on this device are not announced.
  useEffect(() => {
    const announce = ({ title, body, tab, type }) => {
      sendPushNotification({ title, body, tab, onClick: () => setActiveTab(tab) });
      addActivity({ id: newId(), type, title, body, tab, time: 'এইমাত্র' });
    };

    const stopTour = subscribeToTour({
      onUpdate: ({ data: next, tourExists: exists, legacy, raw }) => {
        const hasAnything = LIST_KEYS.some((key) => next[key].length > 0);
        setData({
          ...next,
          tourInfo: next.tourInfo ?? SEED_DATA.tourInfo,
          meetingPoint: next.meetingPoint ?? SEED_DATA.meetingPoint,
        });
        setTourExists(exists);
        setRemoteReady(true);
        setSyncStatus('ফায়ারবেস লাইভ সিঙ্ক');
        setLastSyncedTime(nowLabel());

        if (!exists && !hasAnything && !seedingRef.current) {
          seedingRef.current = true;
          seedTour(SEED_DATA).catch((err) => {
            seedingRef.current = false;
            console.error('Initial trip setup failed:', err);
          });
        }

        if (legacy && !upgradingRef.current) {
          upgradingRef.current = true;
          setUpgradeNotice('তথ্য নতুন ব্যবস্থায় আপগ্রেড হচ্ছে...');
          migrateLegacyTour(raw, {
            onProgress: (done, total) => setUpgradeNotice(`তথ্য আপগ্রেড হচ্ছে (${done}/${total})`),
          })
            .then(() => setUpgradeNotice(null))
            .catch((err) => {
              console.error('Upgrade failed:', err);
              setUpgradeNotice(err.code === 'NOT_ADMIN' ? 'পুরনো তথ্য আপগ্রেড করতে একজন অ্যাডমিনকে অ্যাপ খুলতে হবে' : err.message);
              if (err.code === 'MIGRATION_IN_PROGRESS') {
                setTimeout(() => {
                  upgradingRef.current = false;
                }, 60000);
              }
            });
        }
      },
      onError: (err) => {
        console.warn('Firestore subscription status:', err?.code, err?.message);
        if (err?.code !== 'permission-denied') {
          setSyncStatus('ফায়ারবেস কানেকশন ত্রুটি');
        }
      },
      onChange: ({ collection: name, channel, initial, fromCache, changes }) => {
        if (initial || fromCache) return;
        const me = emailRef.current;
        for (const change of changes) {
          if (change.pending || !change.data) continue;
          const item = change.data;
          if (name === 'notices' && change.type === 'added') {
            announce({ title: '📢 নতুন জরুরি নোটিশ', body: item.title || 'ট্যুরের নতুন আপডেট ও নোটিশ এসেছে', tab: 'notices', type: 'notice' });
          }
          if (name === 'posts' && change.type === 'added' && item.authorEmail !== me) {
            announce({ title: `📸 ${item.author} নতুন ছবি শেয়ার করেছেন`, body: item.caption || 'ইনস্টাফিডে নতুন ছবি যুক্ত হয়েছে', tab: 'feed', type: 'feed' });
          }
          if (name === 'expenses' && change.type === 'added') {
            announce({ title: '💸 নতুন খরচ যুক্ত হয়েছে', body: `${item.title}: ৳${Number(item.amount || 0).toLocaleString()}`, tab: 'expenses', type: 'expense' });
          }
          if (name === 'messages' && change.type === 'added' && item.senderEmail !== me) {
            announce({
              title: `💬 ${item.author || 'সদস্য'} (${CHANNEL_LABELS[channel] || channel})`,
              body: item.text || 'নতুন আলোচনা বার্তা পাঠিয়েছেন',
              tab: 'discussions',
              type: 'discussion',
            });
          }
          if (name === 'members' && change.type === 'modified') {
            const before = membersRef.current.find((member) => member.id === item.id);
            const added = Number(item.deposit || 0) - Number(before?.deposit || 0);
            if (before && added > 0) {
              announce({ title: '💰 নতুন জমা যুক্ত হয়েছে', body: `ফান্ডে ৳${added.toLocaleString()} জমা হয়েছে`, tab: 'expenses', type: 'deposit' });
            }
          }
        }
      },
    });

    return () => {
      stopTour();
    };
  }, [addActivity]);

  // 3. Keep this device's copy for instant display on the next visit.
  useEffect(() => {
    if (remoteReady) {
      writeCache(data);
    }
  }, [data, remoteReady]);

  // 4. Server backup: a short pause after the last change, so bursts of edits send once.
  const backupNow = useCallback(async () => {
    try {
      const result = await saveBackup(data);
      setBackupStatus(result.ok
        ? `ব্যাকআপ সংরক্ষিত ${nowLabel()}`
        : result.reason === 'too-large'
          ? 'ব্যাকআপ খুব বড় হয়েছে, সংরক্ষণ হয়নি'
          : 'ব্যাকআপ সংরক্ষণ হয়নি');
    } catch {
      setBackupStatus('ব্যাকআপ সংরক্ষণ হয়নি');
    }
  }, [data]);

  useEffect(() => {
    if (!uid || !remoteReady || !tourExists) return undefined;
    const timer = setTimeout(() => {
      backupNow();
    }, 5000);
    return () => clearTimeout(timer);
  }, [uid, remoteReady, tourExists, backupNow]);

  // Profile Lookup
  const currentProfileKey = currentUser?.email ? currentUser.email.toLowerCase() : null;
  const currentProfile = (currentProfileKey && data.userProfiles?.[currentProfileKey]) || {};

  // Money (see src/utils/ledger.js)
  const ledger = useMemo(
    () => computeLedger({ members: data.members, expenses: data.expenses }),
    [data.members, data.expenses],
  );
  const totalDeposit = ledger.totalDeposits;
  const totalExpense = ledger.totalExpense;
  const remainingBalance = ledger.fundBalance;

  // Auth Action Handlers
  const handleGoogleSignIn = async () => {
    try {
      setAuthError(null);
      setSyncStatus('গুগলে লগইন হচ্ছে...');
      const user = await signInWithGoogle();
      if (user) {
        setActiveTab('dashboard');
        setSyncStatus('ফায়ারবেস সিঙ্ক হচ্ছে...');
      }
    } catch (err) {
      console.error('Google Sign-in failed:', err);
      let msg = 'গুগল সাইন-ইন সম্পন্ন হয়নি।';
      if (err.code === 'auth/unauthorized-domain') {
        msg = 'এই ডোমেইন থেকে সাইন-ইন অনুমোদিত নয়। অ্যাডমিনের সাথে যোগাযোগ করুন।';
      } else if (err.code === 'auth/popup-closed-by-user') {
        msg = 'সাইন-ইন উইন্ডো বন্ধ করা হয়েছে।';
      } else if (err.message) {
        msg += ` (${err.message})`;
      }
      setAuthError(msg);
      setSyncStatus('সাইন-ইন ব্যর্থ');
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error('Logout error:', err);
    }
    // Trip data is private to the family, so nothing about it stays on a signed-out device.
    try {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(ACTIVITY_KEY);
    } catch {
      // Nothing to clear if storage is unavailable.
    }
    setData(emptyTrip());
    setCurrentUser(null);
    setSyncStatus('লগআউট সম্পন্ন');
  };

  const handleSaveProfile = (profile) => {
    const userEmail = emailRef.current || (currentUser?.email ? currentUser.email.toLowerCase() : null);
    if (userEmail) {
      setData((prev) => ({
        ...prev,
        userProfiles: {
          ...prev.userProfiles,
          [userEmail]: {
            ...(prev.userProfiles?.[userEmail] || {}),
            ...profile,
            email: userEmail,
            updatedAt: new Date().toISOString(),
          },
        },
      }));
    }
    save(saveProfile({ ...profile, updatedAt: new Date().toISOString() }));
  };

  // Media Feed Handlers
  const handleAddPost = (post) => {
    const userEmail = emailRef.current || (currentUser?.email ? currentUser.email.toLowerCase() : null) || 'member@tour.family';
    const postImages = Array.isArray(post.images) && post.images.length > 0
      ? post.images
      : (post.image || post.thumb ? [post.image || post.thumb] : []);
    const completePost = {
      ...post,
      authorEmail: userEmail,
      thumb: post.thumb || post.image || (postImages[0] || null),
      image: post.image || post.thumb || (postImages[0] || null),
      images: postImages,
    };

    // 1. Instant optimistic feed update
    setData((prev) => ({
      ...prev,
      posts: [completePost, ...(prev.posts || []).filter((p) => String(p.id) !== String(completePost.id))],
    }));

    // 2. Persist to Firestore
    save(addItem(['posts'], completePost));

    // 3. User feedback
    setActiveToast({
      id: newId(),
      type: 'success',
      title: '📸 ছবি সফলভাবে পোস্ট হয়েছে',
      body: completePost.caption || 'ইনস্টাফিডে নতুন ছবি যুক্ত হয়েছে',
      tab: 'feed',
      time: 'এইমাত্র',
    });

    addActivity({
      id: newId(),
      type: 'feed',
      title: '📸 আপনি নতুন ছবি শেয়ার করেছেন',
      body: completePost.caption || 'ইনস্টাফিডে ফটো পোস্ট হয়েছে',
      tab: 'feed',
      time: 'এইমাত্র',
    });
    sendPushNotification({
      title: '📸 ছবি সফলভাবে শেয়ার হয়েছে',
      body: post.caption || 'ইনস্টাফিডে আপনার পোস্ট লাইভ হয়েছে',
      onClick: () => setActiveTab('feed'),
    });
    sendBroadcastPush({
      title: `📸 ${post.author || 'পরিবারের সদস্য'} নতুন ছবি শেয়ার করেছেন`,
      body: post.caption || 'ইনস্টাফিডে নতুন ছবি যুক্ত হয়েছে',
      url: '/#feed',
      tag: 'feed',
    });
  };

  const handleLikePost = (postId, userName) => {
    const post = data.posts.find((item) => item.id === postId);
    const liked = (post?.likes || []).includes(userName);
    save((liked ? pullFromArray : pushToArray)(['posts'], postId, 'likes', userName));
  };

  const handleAddComment = (postId, comment) => {
    setData((prev) => ({
      ...prev,
      posts: (prev.posts || []).map((p) =>
        String(p.id) === String(postId)
          ? { ...p, comments: [...(p.comments || []), comment] }
          : p
      ),
    }));
    save(pushToArray(['posts'], postId, 'comments', comment));
  };

  const handleCommentReaction = (postId, commentId, emoji) => {
    const post = (data.posts || []).find((p) => String(p.id) === String(postId));
    if (!post) return;
    const me = (emailRef.current || currentUser?.email || currentProfile?.displayName || currentUser?.displayName || 'user').toLowerCase();

    const updatedComments = (post.comments || []).map((c, idx) => {
      const cId = c.id !== undefined && c.id !== null ? String(c.id) : String(idx);
      if (cId !== String(commentId)) return c;
      const currentReactions = { ...(c.reactions || {}) };
      const currentVoters = Array.isArray(currentReactions[emoji]) ? [...currentReactions[emoji]] : [];
      const alreadyVoted = currentVoters.map((v) => String(v).toLowerCase()).includes(me);
      if (alreadyVoted) {
        currentReactions[emoji] = currentVoters.filter((v) => String(v).toLowerCase() !== me);
        if (currentReactions[emoji].length === 0) {
          delete currentReactions[emoji];
        }
      } else {
        currentReactions[emoji] = [...currentVoters, me];
      }
      return { ...c, reactions: currentReactions };
    });

    setData((prev) => ({
      ...prev,
      posts: (prev.posts || []).map((p) =>
        String(p.id) === String(postId) ? { ...p, comments: updatedComments } : p
      ),
    }));
    save(updateItem(['posts'], postId, { comments: updatedComments }));
  };

  const handleDeletePost = (postId) => {
    const post = (data.posts || []).find((p) => String(p.id) === String(postId));
    const myEmail = (currentUser?.email || '').toLowerCase();
    const myName = (currentProfile?.displayName || currentUser?.displayName || '').trim().toLowerCase();
    const isAuthor = Boolean(
      (myEmail && post?.authorEmail && post.authorEmail.toLowerCase() === myEmail) ||
      (!post?.authorEmail && myName && post?.author && post.author.trim().toLowerCase() === myName)
    );

    if (!isAuthor && (myEmail || myName)) {
      setActiveToast({
        id: newId(),
        type: 'error',
        title: 'মুছতে পারবেন না',
        body: 'শুধুমাত্র যিনি পোস্ট করেছেন তিনি নিজের ছবি মুছতে পারবেন।',
        tab: 'feed',
        time: 'এইমাত্র',
      });
      return;
    }

    askConfirm({
      title: 'ছবিটি মুছে ফেলবেন?',
      message: 'এই পোস্টটি সবার ইনস্টাফিড থেকে মুছে যাবে।',
      onConfirm: () => {
        setData((prev) => ({
          ...prev,
          posts: (prev.posts || []).filter((p) => String(p.id) !== String(postId)),
        }));
        save(removeItem(['posts'], postId));
        setActiveToast({
          id: newId(),
          type: 'success',
          title: 'ছবি মুছে ফেলা হয়েছে',
          body: 'পোস্টটি সফলভাবে মুছে ফেলা হয়েছে।',
          tab: 'feed',
          time: 'এইমাত্র',
        });
      },
    });
  };

  const handleUpdatePost = (postId, patch, options) => {
    setData((prev) => ({
      ...prev,
      posts: (prev.posts || []).map((p) => (String(p.id) === String(postId) ? { ...p, ...patch } : p)),
    }));
    save(updateItem(['posts'], postId, patch, options));
  };

  const handleViewPost = (postId) => {
    const post = (data.posts || []).find((p) => String(p.id) === String(postId));
    if (!post) return;
    const currentViews = Number(post.views || 0);
    const newViews = currentViews + 1;
    setData((prev) => ({
      ...prev,
      posts: (prev.posts || []).map((p) => (String(p.id) === String(postId) ? { ...p, views: newViews } : p)),
    }));
    save(updateItem(['posts'], postId, { views: newViews }));
  };

  const handleUpdateHotelRooms = (rooms) => {
    setData((prev) => ({ ...prev, hotelRooms: rooms }));
    save(updateTourDetails({ hotelRooms: rooms }));
  };

  const handleUpdateBusSeats = (seats) => {
    setData((prev) => ({ ...prev, busSeats: seats }));
    save(updateTourDetails({ busSeats: seats }));
  };

  // Discussion Handlers
  const handleSendMessage = (channelId, message) => {
    save(addItem(['channels', channelId, 'messages'], { ...message, senderEmail: emailRef.current }));
    addActivity({
      id: newId(),
      type: 'discussion',
      title: '💬 আলোচনা বার্তা পাঠানো হয়েছে',
      body: message.text || 'চ্যানেলে বার্তা পোস্ট হয়েছে',
      tab: 'discussions',
      time: 'এইমাত্র',
    });
    sendBroadcastPush({
      title: `💬 ${message.author || 'সদস্য'} (${CHANNEL_LABELS[channelId] || channelId})`,
      body: message.text || 'নতুন বার্তা পাঠিয়েছেন',
      url: '/#discussions',
      tag: 'discussion',
    });
  };

  const handleAddReaction = (channelId, messageId, emoji) => {
    const me = (emailRef.current || currentUser?.email || currentProfile?.displayName || currentUser?.displayName || 'user').toLowerCase();
    const message = (data.discussions?.[channelId] || []).find((item) => String(item.id) === String(messageId));
    if (!message) return;

    // Collect all emojis where this user has previously reacted
    const reactions = message.reactions || {};
    const previousEmojis = [];
    for (const [e, voters] of Object.entries(reactions)) {
      if (Array.isArray(voters) && voters.some((v) => String(v).toLowerCase() === me)) {
        previousEmojis.push(e);
      }
    }

    const isTogglingOff = previousEmojis.length === 1 && previousEmojis[0] === emoji;

    // Construct next reactions map removing 'me' from any existing emoji
    const nextReactions = {};
    for (const [e, voters] of Object.entries(reactions)) {
      if (Array.isArray(voters)) {
        const remaining = voters.filter((v) => String(v).toLowerCase() !== me);
        if (remaining.length > 0) {
          nextReactions[e] = remaining;
        }
      }
    }

    if (!isTogglingOff) {
      // Add 'me' only to the selected emoji
      nextReactions[emoji] = [...(nextReactions[emoji] || []), me];
    }

    // Optimistically update discussion messages in state
    setData((prev) => ({
      ...prev,
      discussions: {
        ...(prev.discussions || {}),
        [channelId]: (prev.discussions?.[channelId] || []).map((m) =>
          String(m.id) === String(messageId) ? { ...m, reactions: nextReactions } : m
        ),
      },
    }));

    const removeEmojis = previousEmojis.filter((e) => e !== emoji);
    save(setReaction(channelId, messageId, emoji, me, !isTogglingOff, removeEmojis));
  };

  // Itinerary Handlers
  const toggleItineraryDone = (id) => {
    const item = data.itinerary.find((entry) => entry.id === id);
    if (item) save(updateItem(['itinerary'], id, { done: !item.done }));
  };

  const handleAddPlan = (e) => {
    e.preventDefault();
    if (!newPlan.title || !newPlan.day) return;
    save(addItem(['itinerary'], { ...newPlan, title: newPlan.title.trim(), done: false }));
    setNewPlan({ day: '', title: '', time: '', location: '', notes: '' });
  };

  const handleDeletePlan = (id) => {
    askConfirm({
      title: 'ভ্রমণ সূচি থেকে মুছবেন?',
      message: 'এই সূচিটি সবার তালিকা থেকে মুছে যাবে।',
      onConfirm: () => save(removeItem(['itinerary'], id)),
    });
  };

  // Expense Handlers
  const handleAddExpense = (expData) => {
    const amount = Number(expData.amount);
    if (!expData.title || !(amount > 0)) return;
    const payer = data.members.find((member) => member.id === expData.paidById) ?? null;
    save(addItem(['expenses'], {
      title: expData.title.trim(),
      category: expData.category || 'খাবার',
      amount,
      paidById: payer ? payer.id : null,
      paidBy: payer ? payer.name : FUND_LABEL,
      addedByEmail: emailRef.current,
      date: expData.date || localISODate(),
      time: expData.time || localTimeHHMM(),
    }));
    addActivity({
      id: newId(),
      type: 'expense',
      title: '💸 নতুন খরচ যুক্ত হয়েছে',
      body: `${expData.title} • ৳${amount.toLocaleString()}`,
      tab: 'expenses',
      time: 'এইমাত্র',
    });
    sendPushNotification({
      title: '💸 নতুন খরচ অন্তর্ভুক্ত হয়েছে',
      body: `${expData.title}: ৳${amount.toLocaleString()}`,
      onClick: () => setActiveTab('expenses'),
    });
    sendBroadcastPush({
      title: '💸 নতুন খরচ যুক্ত হয়েছে',
      body: `${expData.title}: ৳${amount.toLocaleString()}`,
      url: '/#expenses',
      tag: 'expense',
    });
  };

  const handleDeleteExpense = (id) => {
    const expense = data.expenses.find((entry) => entry.id === id);
    askConfirm({
      title: 'খরচটি মুছে ফেলবেন?',
      message: expense ? `"${expense.title}" হিসাব থেকে মুছে যাবে।` : 'এই খরচটি হিসাব থেকে মুছে যাবে।',
      onConfirm: () => save(removeItem(['expenses'], id)),
    });
  };

  // Member & Deposit Handlers
  const handleAddMember = (e) => {
    e.preventDefault();
    if (!newMember.name.trim()) return;
    save(addItem(['members'], {
      name: newMember.name.trim(),
      phone: newMember.phone.trim(),
      seat: newMember.seat || 'নির্ধারিত নয়',
      room: newMember.room || 'নির্ধারিত নয়',
      deposit: Math.max(0, Number(newMember.deposit) || 0),
      familyCount: Math.max(1, Number(newMember.familyCount) || 1),
    }));
    setNewMember({ name: '', phone: '', seat: '', room: '', deposit: '', familyCount: 1 });
  };

  const handleUpdateMember = (member) => {
    if (!member || member.id === undefined) return;
    save(updateItem(['members'], member.id, {
      name: String(member.name || '').trim(),
      phone: String(member.phone || '').trim(),
      seat: member.seat ?? '',
      room: member.room ?? '',
      deposit: Math.max(0, Number(member.deposit) || 0),
      familyCount: Math.max(1, Number(member.familyCount) || 1),
    }));
    setEditingMember(null);
    addActivity({
      id: newId(),
      type: 'deposit',
      title: '👤 সদস্য তথ্য ও জমা আপডেট',
      body: `${member.name} • জমা: ৳${Number(member.deposit || 0).toLocaleString()}`,
      tab: 'expenses',
      time: 'এইমাত্র',
    });
    if (Number(member.deposit || 0) > 0) {
      sendBroadcastPush({
        title: '💰 ফান্ডে জমা আপডেট',
        body: `${member.name} এর মোট জমা: ৳${Number(member.deposit || 0).toLocaleString()}`,
        url: '/#expenses',
        tag: 'deposit',
      });
    }
  };

  const handleDeleteMember = (id) => {
    const member = data.members.find((entry) => entry.id === id);
    if (!member) return;
    const hasPayments = data.expenses.some((expense) => payerIdFor(expense, data.members) === id);
    if (hasPayments) {
      setActiveToast({
        id: newId(),
        type: 'error',
        title: 'সদস্য মোছা যাবে না',
        body: `${member.name} এর নামে খরচ লেখা আছে। আগে সেই খরচগুলো বদলান।`,
        tab: 'expenses',
        time: 'এইমাত্র',
      });
      return;
    }
    askConfirm({
      title: 'সদস্যকে তালিকা থেকে মুছবেন?',
      message: `${member.name} এর জমার তথ্যও তালিকা থেকে মুছে যাবে।`,
      onConfirm: () => save(removeItem(['members'], id)),
    });
  };

  // Superpower Handlers
  const handleShareLocation = (loc) => {
    save(saveLocation(loc));
    addActivity({
      id: newId(),
      type: 'location',
      title: `📍 ${loc.name} অবস্থান শেয়ার করেছেন`,
      body: loc.note || 'সৈকত এলাকায় লাইভ অবস্থান আপডেট হয়েছে',
      tab: 'dashboard',
      time: 'এইমাত্র',
    });
    sendPushNotification({
      title: `📍 ${loc.name} এর নতুন অবস্থান`,
      body: loc.note || 'কক্সবাজার সমুদ্র সৈকত এলাকায় অবস্থান শেয়ার করেছেন',
      onClick: () => setActiveTab('dashboard'),
    });
    sendBroadcastPush({
      title: `📍 ${loc.name} অবস্থান শেয়ার করেছেন`,
      body: loc.note || 'কক্সবাজার সমুদ্র সৈকত এলাকায় অবস্থান আপডেট হয়েছে',
      url: '/',
      tag: 'location',
    });
  };

  const handleClearLocation = () => {
    save(clearMyLocation());
  };

  // Notice Handlers
  const handleAddNotice = (notice) => {
    save(addItem(['notices'], {
      ...notice,
      author: notice.author || currentProfile.displayName || currentUser?.displayName || 'পরিবারের সদস্য',
    }));
    addActivity({
      id: newId(),
      type: 'notice',
      title: '📢 জরুরি নোটিশ জারি হয়েছে',
      body: notice.title || 'নোটিশ বোর্ডে পোস্ট হয়েছে',
      tab: 'notices',
      time: 'এইমাত্র',
    });
    sendPushNotification({
      title: '📢 জরুরি নোটিশ জারি হয়েছে',
      body: notice.title || 'সকল ট্যুর সদস্যের জন্য নতুন নোটিশ',
      onClick: () => setActiveTab('notices'),
    });
    sendBroadcastPush({
      title: '📢 জরুরি নোটিশ জারি হয়েছে',
      body: notice.title || 'সকল ট্যুর সদস্যের জন্য নতুন নোটিশ',
      url: '/#notices',
      tag: 'notice',
    });
  };

  const handleDeleteNotice = (id) => {
    askConfirm({
      title: 'নোটিশটি মুছবেন?',
      message: 'এই নোটিশটি সবার নোটিশ বোর্ড থেকে মুছে যাবে।',
      onConfirm: () => save(removeItem(['notices'], id)),
    });
  };

  const handleUpdateMeetingPoint = (meetingPoint) => {
    save(updateTourDetails({ meetingPoint }));
  };

  // Checklist Handlers
  const toggleCheck = (id) => {
    const item = data.checklist.find((entry) => entry.id === id);
    if (item) save(updateItem(['checklist'], id, { checked: !item.checked }));
  };

  const handleAddCheckItem = (e) => {
    e.preventDefault();
    if (!newCheckItem.trim()) return;
    save(addItem(['checklist'], { item: newCheckItem.trim(), category: 'অন্যান্য', checked: false }));
    setNewCheckItem('');
  };

  const handleDeleteCheckItem = (id) => {
    askConfirm({
      title: 'চেকলিস্ট থেকে মুছবেন?',
      message: 'এই আইটেমটি চেকলিস্ট থেকে মুছে যাবে।',
      onConfirm: () => save(removeItem(['checklist'], id)),
    });
  };

  // EXACTLY 5 PRIMARY TABS FOR MOBILE BOTTOM NAVIGATION
  const primaryBottomNavItems = [
    { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: Navigation },
    { id: 'itinerary', label: 'সূচি', icon: Calendar },
    { id: 'feed', label: 'ইনস্টাফিড', icon: Camera },
    { id: 'discussions', label: 'চ্যাট', icon: MessageSquare },
    { id: 'expenses', label: 'হিসাব', icon: Wallet },
  ];

  // ALL 8 TABS FOR SIDEBARS (Desktop & Mobile Drawer)
  const allNavItems = [
    { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: Navigation, desc: 'ওভারভিউ ও আবহাওয়া' },
    { id: 'itinerary', label: 'ভ্রমণ সূচি', icon: Calendar, desc: '৫ দিনের রুটিন ও চার্ট' },
    { id: 'feed', label: 'ইনস্টাফিড 📸', icon: Camera, desc: 'ফটো শেয়ার ও গ্যালারি' },
    { id: 'discussions', label: 'ডিসকর্ড চ্যাট 💬', icon: MessageSquare, desc: '৪টি ফ্যামিলি চ্যানেল' },
    { id: 'expenses', label: 'হিসাব ও স্প্লিট', icon: Wallet, desc: 'খরচ ও সেটেলমেন্ট' },
    { id: 'seats_rooms', label: 'সিট ও রুম প্ল্যান', icon: Bus, desc: 'বাস ও হোটেল ম্যাপ' },
    { id: 'notices', label: 'নোটিশ ও মিটিং', icon: Megaphone, desc: 'জরুরি বার্তা ও ম্যাপ' },
    { id: 'checklist', label: 'চেকলিস্ট', icon: CheckSquare, desc: 'প্যাকিং ও ডকুমেন্টস' },
  ];

  // 1. Loading State Screen
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-950 via-teal-900 to-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="relative mb-6">
          <img
            src="/logo.png"
            alt="App Logo"
            className="w-24 h-24 rounded-3xl object-contain bg-white p-1 ring-4 ring-amber-400 shadow-2xl animate-pulse"
          />
          <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-2 border-teal-900 rounded-full"></span>
        </div>
        <h1 className="text-xl md:text-2xl font-bold mb-1 text-center">রংপুর ➔ কক্সবাজার ফ্যামিলি ট্যুর ২০২৬</h1>
        <p className="text-sm text-teal-200">নিরাপদ সংযোগ পরীক্ষা করা হচ্ছে...</p>
        <div className="mt-6 flex items-center gap-2 text-amber-300 text-xs font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
          লোড হচ্ছে...
        </div>
      </div>
    );
  }

  // 2. Authentication Gate: If not signed in
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-950 via-teal-900 to-slate-900 text-slate-800 flex flex-col items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden">
        <div className="absolute top-0 -left-20 w-80 h-80 bg-teal-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 z-10 animate-in fade-in zoom-in duration-300">
          <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-cyan-700 text-white p-6 sm:p-8 text-center relative">
            <div className="mx-auto w-20 h-20 mb-3.5 relative">
              <img
                src="/logo.png"
                alt="Tour 2026 Logo"
                className="w-20 h-20 rounded-2xl object-contain bg-white p-1 ring-4 ring-amber-400 shadow-lg mx-auto"
              />
              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-teal-800 rounded-full"></span>
            </div>
            <span className="inline-block px-3 py-1 bg-amber-400 text-teal-950 text-xs font-bold rounded-full mb-2 shadow-xs">
              {data.tourInfo.duration}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold leading-tight">
              {data.tourInfo.title}
            </h1>
            <p className="text-xs text-teal-100 mt-1 flex items-center justify-center gap-1.5">
              <Hotel size={14} className="text-amber-300" /> {data.tourInfo.hotelName}
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                <ShieldCheck size={14} className="text-teal-600" /> ফ্যামিলি প্রাইভেট ড্যাশবোর্ড
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                এটি আমাদের পরিবারের সম্পূর্ণ ব্যক্তিগত ট্যুর ড্যাশবোর্ড। ভ্রমণ সূচি, বাসের সিট, হোটেল রুম এবং ফান্ড ও খরচের লাইভ হিসাব দেখতে অনুগ্রহ করে সাইন-ইন করুন।
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleGoogleSignIn}
                className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm rounded-2xl border-2 border-slate-200 hover:border-teal-600 flex items-center justify-center gap-3 shadow-sm hover:shadow transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <GoogleIcon />
                <span>গুগল একাউন্ট দিয়ে সাইন-ইন করুন</span>
              </button>

              {authError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 leading-snug">
                  {authError}
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <Bus size={14} className="text-teal-600 shrink-0" />
                <span>{data.tourInfo.departure}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <Hotel size={14} className="text-teal-600 shrink-0" />
                <span>{data.tourInfo.hotelName}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-500 mb-2">জরুরি প্রয়োজনে কক্সবাজার ট্যুরিস্ট পুলিশ:</p>
              <div className="flex justify-center gap-2 text-xs">
                <a
                  href="tel:01320160001"
                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold rounded-lg border border-emerald-200 flex items-center gap-1 transition"
                >
                  <PhoneCall size={12} /> ০১৩২০-১৬০০০১
                </a>
                <a
                  href="tel:999"
                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 font-semibold rounded-lg border border-rose-200 flex items-center gap-1 transition"
                >
                  <PhoneCall size={12} /> ৯৯৯
                </a>
              </div>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-teal-300/70 mt-6 text-center z-10">
          রংপুর ➔ কক্সবাজার ফ্যামিলি ট্যুর ২০২৬ • com.izhaanintellect.tour2026
        </p>
      </div>
    );
  }

  // 3. Authenticated User View
  return (
    <Suspense fallback={<LoadingFallback />}>
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row font-sans">
      {upgradeNotice && (
        <output aria-live="polite" className="fixed bottom-20 left-3 right-3 z-40 block rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 shadow-lg md:left-auto md:right-6 md:bottom-6 md:max-w-sm">
          {upgradeNotice}
        </output>
      )}
      {/* =========================================================================
          DESKTOP SIDEBAR
      ========================================================================= */}
      <aside className="hidden md:flex md:w-64 bg-teal-900 text-white flex-col justify-between p-4 shadow-xl shrink-0 h-screen sticky top-0 overflow-y-auto">
        <div>
          <div className="flex items-center gap-3 pb-6 border-b border-teal-700">
            <div className="relative">
              <img
                src="/logo.png"
                alt="App Logo"
                className="w-13 h-13 rounded-2xl object-contain bg-white p-0.5 ring-2 ring-amber-400 shadow-md"
              />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-teal-900 rounded-full"></span>
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight">ফ্যামিলি ট্যুর ২০২৬</h1>
              <p className="text-xs text-amber-300 font-medium">রংপুর ➔ কক্সবাজার</p>
              <p className="text-[10px] text-teal-300/80 mt-0.5">com.izhaanintellect.tour2026</p>
            </div>
          </div>

          {/* Quick Command Trigger in Sidebar */}
          <button
            onClick={() => setIsCommandOpen(true)}
            className="w-full mt-4 py-2.5 px-3 bg-teal-950/60 hover:bg-teal-800 text-amber-300 rounded-xl text-xs font-semibold flex items-center justify-between border border-teal-700/70 transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Terminal size={15} /> কমান্ড প্যালেট
            </span>
            <kbd className="px-1.5 py-0.5 bg-teal-900 text-[10px] text-teal-200 rounded font-mono border border-teal-700">
              Ctrl+K
            </kbd>
          </button>

          <nav className="mt-4 space-y-1">
            {allNavItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeTab === item.id
                      ? 'bg-amber-400 text-teal-950 shadow-md font-bold'
                      : 'text-teal-100 hover:bg-teal-800'
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Special Features & Tools */}
          <div className="mt-4 pt-3 border-t border-teal-800 space-y-1.5">
            <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wider px-2">
              ট্যুর সুপারপাওয়ার ও বিশেষ টুলস
            </p>

            <button
              onClick={() => setShowSafetyHubModal(true)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-teal-800 to-rose-950 hover:from-teal-700 hover:to-rose-900 text-teal-100 hover:text-white transition cursor-pointer border border-rose-600/40 shadow-xs"
            >
              <div className="flex items-center gap-2.5 truncate">
                <Compass size={15} className="text-rose-400 shrink-0" />
                <span className="truncate">সুরক্ষা ও বিচ কম্পাস</span>
              </div>
              <span className="text-[9px] bg-rose-500 text-white font-bold px-1.5 py-0.5 rounded shrink-0">
                GPS
              </span>
            </button>

            <button
              onClick={() => setShowQuizModal(true)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-teal-800 to-amber-950 hover:from-teal-700 hover:to-amber-900 text-teal-100 hover:text-white transition cursor-pointer border border-amber-600/40 shadow-xs"
            >
              <div className="flex items-center gap-2.5 truncate">
                <Flame size={15} className="text-amber-400 shrink-0" />
                <span className="truncate">ফ্যামিলি কুইজ</span>
              </div>
              <span className="text-[9px] bg-amber-400 text-teal-950 font-bold px-1.5 py-0.5 rounded shrink-0">
                ৮ রাউন্ড
              </span>
            </button>

            <a
              href="/Tour2026.apk?v=20261018b"
              download="Tour2026.apk"
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-950 hover:bg-emerald-900 text-emerald-200 hover:text-white transition cursor-pointer border border-emerald-500/50 shadow-xs"
            >
              <div className="flex items-center gap-2.5 truncate">
                <Smartphone size={15} className="text-emerald-400 shrink-0" />
                <span className="truncate">অ্যান্ড্রয়েড APK</span>
              </div>
              <span className="text-[9px] bg-emerald-500 text-teal-950 font-extrabold px-1.5 py-0.5 rounded shrink-0">
                ডাউনলোড
              </span>
            </a>
          </div>
        </div>

        {/* Desktop Sidebar Bottom: Auth & Profile */}
        <div className="space-y-3 pt-3 border-t border-teal-800">
          {currentUser && (
            <div
             role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }}  onClick={() => setShowProfileModal(true)}
              className="bg-teal-950/80 hover:bg-teal-950 p-3 rounded-2xl border border-teal-700/60 space-y-2 cursor-pointer transition group"
            >
              <div className="flex items-center gap-2.5">
                <UserAvatar
                  photoUrl={currentProfile.customPhotoURL || currentUser.photoURL}
                  name={currentProfile.displayName || currentUser.displayName}
                  size="w-8 h-8"
                  ring="ring-2 ring-amber-400"
                  fallbackEmoji={currentProfile.avatarEmoji}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-white truncate">
                      {currentProfile.displayName || currentUser.displayName || 'পরিবারের সদস্য'}
                    </p>
                    <span className="text-[9px] bg-amber-400/90 text-teal-950 font-bold px-1.5 py-0.2 rounded-md">
                      {currentProfile.role || 'সদস্য'}
                    </span>
                  </div>
                  <p className="text-[10px] text-teal-300 truncate">{currentUser.email}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1.5 border-t border-teal-800/80 text-[11px]">
                <span className="text-amber-300 group-hover:underline flex items-center gap-1 font-semibold text-[10px]">
                  <Edit3 size={11} /> প্রোফাইল এডিট
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLogout();
                  }}
                  className="text-rose-300 hover:text-rose-200 transition cursor-pointer flex items-center gap-1 font-medium text-[10px]"
                  title="লগআউট করুন"
                >
                  <LogOut size={11} /> লগআউট
                </button>
              </div>
            </div>
          )}

          {/* Sync Status Box */}
          <div className="bg-teal-950/50 p-2 rounded-xl border border-teal-800/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-teal-200">
              <span className="text-[10px]">স্ট্যাটাস:</span>
              <span className="font-semibold text-amber-300 flex items-center gap-1 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                {syncStatus}
              </span>
            </div>
            {lastSyncedTime && (
              <p className="text-[9px] text-teal-300/80 text-right">শেষ সিঙ্ক: {lastSyncedTime}</p>
            )}
          </div>
        </div>
      </aside>

      {/* =========================================================================
          MOBILE SLIDING DRAWER / SIDEBAR (Smooth Animated Drawer)
      ========================================================================= */}
      {isMobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop Blur */}
          <div
            className="fixed inset-0 bg-black/65 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
           role="presentation"
 onClick={() => setIsMobileSidebarOpen(false)}
onKeyDown={(e) => { if (e.key === 'Escape') e.currentTarget.click(); }}
          />

          {/* Drawer Panel */}
          <div className="relative w-[84%] max-w-xs bg-teal-950 text-white flex flex-col justify-between p-4 shadow-2xl z-10 overflow-y-auto animate-in slide-in-from-left duration-250 border-r border-teal-800">
            <div className="space-y-4">
              {/* Drawer Top Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-teal-800/90">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/logo.png"
                    alt="App Logo"
                    className="w-10 h-10 rounded-2xl object-contain bg-white p-0.5 ring-2 ring-amber-400 shadow-md"
                  />
                  <div>
                    <h3 className="font-extrabold text-sm text-white leading-tight">ফ্যামিলি ট্যুর ২০২৬</h3>
                    <p className="text-[10px] text-amber-300 font-medium">রংপুর ➔ কক্সবাজার</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="w-8 h-8 rounded-full bg-teal-900 hover:bg-teal-800 text-teal-200 flex items-center justify-center transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* User Profile Card in Drawer */}
              {currentUser && (
                <div
                 role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }}  onClick={() => {
                    setIsMobileSidebarOpen(false);
                    setShowProfileModal(true);
                  }}
                  className="p-3 bg-gradient-to-r from-teal-900 to-teal-800 rounded-2xl border border-teal-700/80 flex items-center justify-between cursor-pointer hover:border-amber-400 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <UserAvatar
                      photoUrl={currentProfile.customPhotoURL || currentUser.photoURL}
                      name={currentProfile.displayName || currentUser.displayName}
                      size="w-9 h-9"
                      ring="ring-2 ring-amber-400"
                      fallbackEmoji={currentProfile.avatarEmoji}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">
                        {currentProfile.displayName || currentUser.displayName || 'সদস্য'}
                      </p>
                      <span className="text-[9px] bg-amber-400 text-teal-950 font-bold px-1.5 py-0.2 rounded">
                        {currentProfile.role || 'সদস্য'}
                      </span>
                    </div>
                  </div>
                  <Edit3 size={15} className="text-amber-300 shrink-0" />
                </div>
              )}

              {/* All Navigation Items in Drawer */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-teal-400 uppercase tracking-wider px-2 pt-1">
                  সকল ফিচার ও মেন্যু
                </p>
                {allNavItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        handleSelectTab(item.id);
                        setIsMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        isActive
                          ? 'bg-amber-400 text-teal-950 font-bold shadow-md'
                          : 'text-teal-100 hover:bg-teal-900 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon size={16} className={isActive ? 'text-teal-950' : 'text-teal-300'} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.desc && (
                        <span className={`text-[9px] truncate max-w-[85px] ${
                          isActive ? 'text-teal-900 font-bold' : 'text-teal-400'
                        }`}>
                          {item.desc}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Special Features in Mobile Drawer */}
              <div className="pt-2 border-t border-teal-800/90 space-y-1.5">
                <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wider px-2">
                  ট্যুর সুপারপাওয়ার ও বিশেষ ফিচার
                </p>

                <button
                  onClick={() => {
                    setIsMobileSidebarOpen(false);
                    setShowSafetyHubModal(true);
                  }}
                  className="w-full py-2 px-3 bg-gradient-to-r from-teal-900 to-rose-950 hover:bg-teal-800 text-teal-100 rounded-xl text-xs font-semibold flex items-center justify-between border border-rose-700/50 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Compass size={14} className="text-rose-400" /> ফ্যামিলি সুরক্ষা ও বিচ কম্পাস
                  </span>
                  <span className="text-[9px] bg-rose-500 text-white font-bold px-1.5 py-0.5 rounded">GPS</span>
                </button>

                <button
                  onClick={() => {
                    setIsMobileSidebarOpen(false);
                    setShowQuizModal(true);
                  }}
                  className="w-full py-2 px-3 bg-gradient-to-r from-teal-900 to-amber-950 hover:bg-teal-800 text-teal-100 rounded-xl text-xs font-semibold flex items-center justify-between border border-amber-700/50 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Flame size={14} className="text-amber-400" /> ফ্যামিলি ট্রাভেল কুইজ
                  </span>
                  <span className="text-[9px] bg-amber-400 text-teal-950 font-bold px-1.5 py-0.5 rounded">৮ রাউন্ড</span>
                </button>

                <a
                  href="/Tour2026.apk?v=20261018b"
                  download="Tour2026.apk"
                  className="w-full py-2 px-3 bg-emerald-950 hover:bg-emerald-900 text-emerald-200 rounded-xl text-xs font-semibold flex items-center justify-between border border-emerald-600/60 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Smartphone size={14} className="text-emerald-400" /> অ্যান্ড্রয়েড অ্যাপ (APK ডাউনলোড)
                  </span>
                  <span className="text-[9px] bg-emerald-500 text-teal-950 font-extrabold px-1.5 py-0.5 rounded">ইনস্টল</span>
                </a>
              </div>

              {/* Quick Access & Tools Section */}
              <div className="pt-2 border-t border-teal-800/90 space-y-1.5">
                <p className="text-[10px] font-bold text-teal-400 uppercase tracking-wider px-2">
                  কুইক টুলস ও শর্টকাট
                </p>

                <button
                  onClick={() => {
                    setIsMobileSidebarOpen(false);
                    setIsCommandOpen(true);
                  }}
                  className="w-full py-2 px-3 bg-teal-900/60 hover:bg-teal-900 text-amber-300 rounded-xl text-xs font-semibold flex items-center justify-between border border-teal-700/60 transition"
                >
                  <span className="flex items-center gap-2">
                    <Terminal size={14} /> কমান্ড প্যালেট
                  </span>
                  <span className="text-[9px] bg-teal-950 px-1.5 py-0.5 rounded text-teal-300">Ctrl+K</span>
                </button>

                <a
                  href="https://drive.google.com/drive/folders/1G_g7cTkA489hbL9dsF6LU5tdfX3E54vM?usp=sharing"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2 px-3 bg-teal-900/60 hover:bg-teal-900 text-teal-100 rounded-xl text-xs font-semibold flex items-center justify-between border border-teal-700/60 transition"
                >
                  <span className="flex items-center gap-2">
                    <HardDrive size={14} className="text-emerald-400" /> গুগল ড্রাইভ ব্যাকআপ
                  </span>
                  <ExternalLink size={12} className="text-teal-400" />
                </a>

                <button
                  onClick={() => {
                    setIsMobileSidebarOpen(false);
                    setShowPrintReport(true);
                  }}
                  className="w-full py-2 px-3 bg-teal-900/60 hover:bg-teal-900 text-teal-100 rounded-xl text-xs font-semibold flex items-center gap-2 border border-teal-700/60 transition"
                >
                  <Printer size={14} className="text-cyan-300" /> অডিট শিট প্রিন্ট ও ডাউনলোড
                </button>

                <a
                  href="tel:01320160001"
                  className="w-full py-2 px-3 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 rounded-xl text-xs font-semibold flex items-center justify-between border border-emerald-700/60 transition"
                >
                  <span className="flex items-center gap-2">
                    <PhoneCall size={14} className="text-emerald-400" /> ট্যুরিস্ট পুলিশ কল
                  </span>
                  <span className="text-[10px] font-bold text-emerald-300">০১৩২০-১৬০০০১</span>
                </a>
              </div>
            </div>

            {/* Drawer Bottom Status & Logout */}
            <div className="pt-3 border-t border-teal-800 space-y-2 mt-4">
              {backupStatus && <p className="px-1 text-[10px] text-teal-300/80">{backupStatus}</p>}
              <div className="flex items-center justify-between text-[11px] text-teal-300 px-1">
                <span className="flex items-center gap-1 text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {syncStatus}
                </span>
                <button
                  onClick={() => {
                    setIsMobileSidebarOpen(false);
                    backupNow();
                  }}
                  disabled={!currentUser}
                  className="text-amber-300 hover:underline text-[10px] disabled:opacity-40"
                >
                  এখনই ব্যাকআপ
                </button>
              </div>

              <button
                onClick={handleLogout}
                className="w-full py-2 bg-rose-950/60 hover:bg-rose-900 text-rose-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-rose-800/60 transition"
              >
                <LogOut size={13} /> লগআউট করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MAIN CONTENT AREA
      ========================================================================= */}
      <div className="flex-1 flex flex-col pb-24 md:pb-6 min-w-0">
        {/* Top Header with Mobile Hamburger Menu */}
        <header className="sticky top-0 z-30 bg-gradient-to-r from-teal-900/95 via-teal-800/95 to-cyan-900/95 backdrop-blur-md text-white px-3 py-3 md:px-8 md:py-4 shadow-md border-b border-teal-700/50 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {/* Mobile Hamburger Drawer Button */}
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="md:hidden p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title="মেন্যু ও সাইডবার খুলুন"
              >
                <Menu size={20} />
              </button>

              <img
                src="/logo.png"
                alt="App Logo"
                className="w-9 h-9 md:w-11 md:h-11 rounded-xl object-contain bg-white p-0.5 ring-2 ring-amber-400 shadow-md md:hidden"
              />

              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="px-2 py-0.5 text-[9px] md:text-[10px] bg-amber-400 text-teal-950 font-extrabold rounded-full whitespace-nowrap">
                    {data.tourInfo.duration}
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-white/20 px-2 py-0.5 rounded-full text-teal-100 whitespace-nowrap">
                    <Bus size={10} /> {data.tourInfo.busName}
                  </span>
                </div>
                <h2 className="text-sm md:text-lg font-bold leading-tight truncate">{data.tourInfo.title}</h2>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Notification Center (Push alerts & activity history) */}
              <NotificationCenter
                activities={activities}
                onNavigate={(tab) => setActiveTab(tab)}
                activeToast={activeToast}
                onDismissToast={() => setActiveToast(null)}
                onMarkAsRead={markActivityRead}
                onMarkAllAsRead={markAllActivitiesRead}
                onClearActivity={clearActivity}
                onClearAllActivities={clearAllActivities}
              />

              {/* User Profile Button in Header */}
              {currentUser && (
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="px-2 py-1.5 bg-black/25 hover:bg-black/35 rounded-xl border border-white/20 flex items-center gap-1.5 transition cursor-pointer text-xs"
                  title="আমার প্রোফাইল খুলুন"
                >
                  <UserAvatar
                    photoUrl={currentProfile.customPhotoURL || currentUser.photoURL}
                    name={currentProfile.displayName || currentUser.displayName}
                    size="w-5 h-5"
                    ring="ring-1 ring-amber-400"
                    textClass="text-[9px]"
                    fallbackEmoji={currentProfile.avatarEmoji}
                  />
                  <span className="font-semibold text-white hidden sm:inline max-w-[90px] truncate">
                    {currentProfile.displayName || currentUser.displayName?.split(' ')[0] || 'প্রোফাইল'}
                  </span>
                </button>
              )}

              {/* Quick Command Button in Header (Desktop / Tablet only) */}
              <button
                onClick={() => setIsCommandOpen(true)}
                className="hidden md:flex p-2 md:px-3 md:py-1.5 bg-amber-400 hover:bg-amber-300 text-teal-950 font-bold text-xs rounded-xl items-center gap-1.5 shadow-sm transition cursor-pointer"
                title="কমান্ড প্যালেট খুলুন (Ctrl+K)"
              >
                <Terminal size={14} />
                <span>কমান্ড</span>
              </button>

              <button
                onClick={() => backupNow()}
                disabled={!currentUser}
                className="p-2 bg-white/15 hover:bg-white/25 rounded-xl text-white transition cursor-pointer disabled:opacity-40"
                title="ব্যাকআপ সংরক্ষণ করুন"
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 max-w-5xl w-full mx-auto p-3.5 md:p-6 space-y-6 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-6">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Financial Quick Cards */}
              <div className="grid grid-cols-3 gap-2 min-[380px]:gap-3 bg-gradient-to-r from-teal-950 via-teal-900 to-slate-900 text-white p-3.5 min-[380px]:p-4 sm:p-5 rounded-3xl shadow-md border border-teal-800/80">
                <div className="min-w-0">
                  <p className="text-[10px] min-[380px]:text-[11px] sm:text-xs text-teal-200 truncate">মোট জমা ফান্ড</p>
                  <p className="text-sm min-[380px]:text-base sm:text-2xl font-bold mt-0.5 truncate">৳ {totalDeposit.toLocaleString()}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] min-[380px]:text-[11px] sm:text-xs text-teal-200 truncate">মোট খরচ</p>
                  <p className="text-sm min-[380px]:text-base sm:text-2xl font-bold text-amber-300 mt-0.5 truncate">৳ {totalExpense.toLocaleString()}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] min-[380px]:text-[11px] sm:text-xs text-teal-200 truncate">অবশিষ্ট ব্যালেন্স</p>
                  <p className="text-sm min-[380px]:text-base sm:text-2xl font-bold text-emerald-300 mt-0.5 truncate">৳ {remainingBalance.toLocaleString()}</p>
                </div>
              </div>

              {/* LIVE TIDE & SUNSET WIDGET */}
              <TideWeatherWidget />

              {/* Quick Feature Launchers */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                <button
                  onClick={() => setActiveTab('feed')}
                  className="p-3.5 bg-gradient-to-br from-pink-50 to-rose-50 hover:from-pink-100 hover:to-rose-100 border border-pink-200 rounded-3xl text-left transition shadow-xs group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-2xl bg-pink-600 text-white flex items-center justify-center mb-2 group-hover:scale-110 transition shadow-2xs">
                    <Camera size={18} />
                  </div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-800">ইনস্টাফিড 📸</h4>
                  <p className="text-[11px] text-pink-700 mt-0.5">ফটো শেয়ার ও ড্রাইভ ব্যাকআপ</p>
                </button>

                <button
                  onClick={() => setActiveTab('discussions')}
                  className="p-3.5 bg-gradient-to-br from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 border border-indigo-200 rounded-3xl text-left transition shadow-xs group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-2 group-hover:scale-110 transition shadow-2xs">
                    <MessageSquare size={18} />
                  </div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-800">ডিসকর্ড চ্যাট 💬</h4>
                  <p className="text-[11px] text-indigo-700 mt-0.5">৪টি ফ্যামিলি চ্যানেল</p>
                </button>

                <button
                  onClick={() => { setActiveTab('seats_rooms'); setSeatRoomSubTab('bus'); }}
                  className="p-3.5 bg-white hover:bg-teal-50 border border-slate-200 rounded-3xl text-left transition shadow-xs group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center mb-2 group-hover:scale-110 transition shadow-2xs">
                    <Bus size={18} />
                  </div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-800">বাস সিট প্ল্যান</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">স্লিপার ও বিজনেস সিট</p>
                </button>

                <button
                  onClick={() => { setActiveTab('seats_rooms'); setSeatRoomSubTab('hotel'); }}
                  className="p-3.5 bg-white hover:bg-teal-50 border border-slate-200 rounded-3xl text-left transition shadow-xs group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-2 group-hover:scale-110 transition shadow-2xs">
                    <Hotel size={18} />
                  </div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-800">হোটেল সি মুন</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">১০টি রুমের ফ্লোর প্ল্যান</p>
                </button>
              </div>

              {/* Route Progress & Milestone Timeline */}
              <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-100 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Bus size={17} className="text-teal-700" /> যাত্রাপথ ও সম্ভাব্য সময়সূচি (রংপুর ➔ কক্সবাজার)
                  </h3>
                  <span className="text-[10px] sm:text-xs bg-teal-50 text-teal-800 font-bold px-2.5 py-0.5 rounded-full border border-teal-200">
                    এভারগ্রীন এসি বাস
                  </span>
                </div>

                {/* Milestone Stepper */}
                <div className="pt-2 pb-1 overflow-x-auto">
                  <div className="grid grid-cols-4 min-w-[340px] gap-2 text-center relative">
                    {/* Connecting Line */}
                    <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 -z-0"></div>

                    {/* Milestone 1: Rangpur */}
                    <div className="flex flex-col items-center relative z-10">
                      <div className="w-8 h-8 rounded-full bg-teal-800 text-white flex items-center justify-center font-bold text-xs shadow-sm ring-4 ring-teal-100">
                        ১
                      </div>
                      <p className="font-bold text-xs text-slate-900 mt-2">রংপুর</p>
                      <span className="text-[10px] text-teal-800 font-bold bg-teal-50 px-1.5 py-0.5 rounded mt-0.5">
                        সন্ধ্যা ০৬:০০
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">কামারপাড়া ছাড়বে</span>
                    </div>

                    {/* Milestone 2: Bogura */}
                    <div className="flex flex-col items-center relative z-10">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 border-2 border-slate-300 flex items-center justify-center font-bold text-xs shadow-xs ring-4 ring-white">
                        ২
                      </div>
                      <p className="font-bold text-xs text-slate-800 mt-2">বগুড়া</p>
                      <span className="text-[10px] text-slate-700 font-bold bg-slate-100 px-1.5 py-0.5 rounded mt-0.5">
                        রাত ১০:৩০
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">ফুড ভিলেজ (ডিনার)</span>
                    </div>

                    {/* Milestone 3: Chittagong */}
                    <div className="flex flex-col items-center relative z-10">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 border-2 border-slate-300 flex items-center justify-center font-bold text-xs shadow-xs ring-4 ring-white">
                        ৩
                      </div>
                      <p className="font-bold text-xs text-slate-800 mt-2">চট্টগ্রাম</p>
                      <span className="text-[10px] text-slate-700 font-bold bg-slate-100 px-1.5 py-0.5 rounded mt-0.5">
                        ভোর ০৫:০০
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">হাইওয়ে নাস্তা ও ফ্রেশ</span>
                    </div>

                    {/* Milestone 4: Cox's Bazar */}
                    <div className="flex flex-col items-center relative z-10">
                      <div className="w-8 h-8 rounded-full bg-amber-400 text-teal-950 flex items-center justify-center font-extrabold text-xs shadow-sm ring-4 ring-amber-100">
                        ৪
                      </div>
                      <p className="font-bold text-xs text-slate-900 mt-2">কক্সবাজার</p>
                      <span className="text-[10px] text-amber-900 font-bold bg-amber-100 px-1.5 py-0.5 rounded mt-0.5">
                        সকাল ০৮:৩০
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">হোটেল সি মুন</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Emergency Contacts & Tourist Police Section */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                  <div>
                    <h3 className="font-bold text-amber-950 text-sm">জরুরি যোগাযোগ ও নিরাপত্তা নির্দেশিকা</h3>
                    <p className="text-[11px] text-amber-800">যেকোনো প্রয়োজনে সরাসরি ট্যাপ করে কল করুন</p>
                  </div>
                </div>

                {/* Priority Contacts (Tour Coordinator, Hotel & Bus) */}
                {(() => {
                  const coordinatorMember = (data.members || []).find(
                    (m) =>
                      m.role === 'coordinator' ||
                      m.name?.includes('রাজু') ||
                      m.name?.includes('সমন্বয়') ||
                      m.name?.includes('কো-অর্ডিনেটর')
                  );
                  const coordinatorPhone = coordinatorMember?.phone || '';

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* 1. Tour Leader */}
                      <a
                        href={coordinatorPhone ? `tel:${coordinatorPhone}` : '#roster'}
                        onClick={(e) => {
                          if (!coordinatorPhone) {
                            e.preventDefault();
                            setActiveTab('seats_rooms');
                            setSeatRoomSubTab('roster');
                          }
                        }}
                        className="p-3 bg-white hover:bg-teal-50 text-slate-800 rounded-2xl border-2 border-teal-600/30 shadow-xs flex items-center justify-between transition group cursor-pointer"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-teal-950 truncate">
                            {coordinatorMember?.name || 'ট্যুর লিডার (রাজু ভাই)'}
                          </p>
                          <p className="text-[10px] text-slate-500">মূল ট্যুর সমন্বয়ক</p>
                        </div>
                        <span className="flex items-center gap-1 text-[11px] font-bold text-teal-800 bg-teal-100/80 px-2 py-1 rounded-xl shrink-0">
                          <PhoneCall size={12} /> {coordinatorPhone ? 'কল দিন' : 'নম্বর দেখুন'}
                        </span>
                      </a>

                      {/* 2. Hotel Sea Moon Reception */}
                      <a
                        href="tel:01819012345"
                        className="p-3 bg-white hover:bg-amber-50 text-slate-800 rounded-2xl border border-amber-200/90 shadow-2xs flex items-center justify-between transition group cursor-pointer"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-amber-950 truncate">হোটেল সি মুন (রিসিপশন)</p>
                          <p className="text-[10px] text-slate-500">কলাতলী, কক্সবাজার</p>
                        </div>
                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-1 rounded-xl shrink-0">
                          <PhoneCall size={12} /> কল দিন
                        </span>
                      </a>

                      {/* 3. Evergreen Bus Helpline */}
                      <a
                        href="tel:01711000000"
                        className="p-3 bg-white hover:bg-cyan-50 text-slate-800 rounded-2xl border border-amber-200/90 shadow-2xs flex items-center justify-between transition group cursor-pointer"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">এভারগ্রীন এসি বাস হেল্পলাইন</p>
                          <p className="text-[10px] text-slate-500">কামারপাড়া কাউন্টার</p>
                        </div>
                        <span className="flex items-center gap-1 text-[11px] font-bold text-cyan-800 bg-cyan-100/80 px-2 py-1 rounded-xl shrink-0">
                          <PhoneCall size={12} /> কল দিন
                        </span>
                      </a>
                    </div>
                  );
                })()}

                {/* Public Tourist Police & Emergency 999 Grid */}
                <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <a
                    href="tel:01320160001"
                    className="p-2.5 bg-white hover:bg-emerald-50 text-slate-800 rounded-2xl border border-amber-200/70 shadow-2xs flex items-center justify-between transition group"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-800">ট্যুরিস্ট পুলিশ হটলাইন ১</p>
                      <p className="text-[10px] text-slate-500">সৈকত নিরাপত্তা হেল্পডেস্ক</p>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                      <PhoneCall size={12} /> ০১৩২০-১৬০০০১
                    </span>
                  </a>

                  <a
                    href="tel:01320160000"
                    className="p-2.5 bg-white hover:bg-teal-50 text-slate-800 rounded-2xl border border-amber-200/70 shadow-2xs flex items-center justify-between transition group"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-teal-800">ট্যুরিস্ট পুলিশ হটলাইন ২</p>
                      <p className="text-[10px] text-slate-500">কক্সবাজার হেল্পলাইন</p>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                      <PhoneCall size={12} /> ০১৩২০-১৬০০০০
                    </span>
                  </a>

                  <a
                    href="tel:999"
                    className="sm:col-span-2 p-3 bg-rose-50 hover:bg-rose-100 text-rose-950 rounded-2xl border border-rose-200 shadow-2xs flex items-center justify-between transition group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></span>
                      <div>
                        <p className="text-xs font-bold text-rose-900">জাতীয় জরুরি সেবা (টোল ফ্রি)</p>
                        <p className="text-[11px] text-rose-700">পুলিশ, ফায়ার সার্ভিস ও অ্যাম্বুলেন্স</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-extrabold text-white bg-rose-600 px-3 py-1 rounded-xl shadow-xs">
                      <PhoneCall size={13} /> ৯৯৯ (কল করুন)
                    </span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ITINERARY */}
          {activeTab === 'itinerary' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-teal-900 to-teal-800 text-white p-5 rounded-3xl shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm flex items-center gap-2 text-amber-300">
                    <Sparkles size={17} /> দিনভিত্তিক অফিশিয়াল ভ্রমণ চার্ট (৫ দিন)
                  </h3>
                  <span className="text-xs text-teal-200">কার্ডে ক্লিক করে বড় করে দেখুন</span>
                </div>
                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                  {[
                    { day: '১ম দিন', date: '১৯ অক্টো', img: '/plans/day1.jpeg', label: 'যাত্রা' },
                    { day: '২য় দিন', date: '২০ অক্টো', img: '/plans/day2.jpeg', label: 'আগমন' },
                    { day: '৩য় দিন', date: '২১ অক্টো', img: '/plans/day3.jpeg', label: 'ছাদখোলা বাস' },
                    { day: '৪র্থ দিন', date: '২২ অক্টো', img: '/plans/day4.jpeg', label: 'মহেশখালী' },
                    { day: '৫ম দিন', date: '২৩ অক্টো', img: '/plans/day5.jpeg', label: 'ফেরা' }
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => setPreviewImage(p.img)}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-xl border border-teal-700 transition cursor-pointer flex flex-col items-center"
                    >
                      <span className="font-bold text-amber-300">{p.day}</span>
                      <span className="text-[10px] text-teal-200">{p.date}</span>
                      <span className="text-[10px] text-white mt-1 bg-teal-950/60 px-1.5 py-0.5 rounded">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-base mb-4">নতুন ভ্রমণ প্ল্যান যুক্ত করুন</h3>
                <form onSubmit={handleAddPlan} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="দিন (যেমন: ৩য় দিন বিকাল)"
                    value={newPlan.day}
                    onChange={e => setNewPlan({ ...newPlan, day: e.target.value })}
                    className="px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                  />
                  <input
                    type="text"
                    placeholder="সময় (যেমন: বিকাল ০৪:৩০ মি.)"
                    value={newPlan.time}
                    onChange={e => setNewPlan({ ...newPlan, time: e.target.value })}
                    className="px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                  />
                  <input
                    type="text"
                    placeholder="ইভেন্টের নাম (যেমন: ইনানী বিচ ভ্রমণ)"
                    value={newPlan.title}
                    onChange={e => setNewPlan({ ...newPlan, title: e.target.value })}
                    className="px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                  />
                  <input
                    type="text"
                    placeholder="স্থান / লোকেশন"
                    value={newPlan.location}
                    onChange={e => setNewPlan({ ...newPlan, location: e.target.value })}
                    className="px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                  />
                  <input
                    type="text"
                    placeholder="নোট বা বিশেষ নির্দেশনা"
                    value={newPlan.notes}
                    onChange={e => setNewPlan({ ...newPlan, notes: e.target.value })}
                    className="md:col-span-2 px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                  />
                  <button
                    type="submit"
                    className="md:col-span-2 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Plus size={18} /> সূচিতে যুক্ত করুন
                  </button>
                </form>
              </div>

              <div className="space-y-3">
                {data.itinerary.map(item => (
                  <div
                    key={item.id}
                    className={`bg-white p-4 md:p-5 rounded-3xl shadow-sm border transition flex items-start gap-3.5 ${
                      item.done ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100'
                    }`}
                  >
                    <button
                      onClick={() => toggleItineraryDone(item.id)}
                      className="mt-1 text-teal-600 hover:scale-110 transition cursor-pointer shrink-0"
                    >
                      {item.done ? <CheckCircle2 size={22} className="text-emerald-600" /> : <Circle size={22} />}
                    </button>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold px-2.5 py-0.5 bg-teal-100 text-teal-800 rounded-full">
                          {item.day}
                        </span>
                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                          <Clock size={12} /> {item.time}
                        </span>
                        {item.category && (
                          <span className="text-[11px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-semibold">
                            {item.category}
                          </span>
                        )}
                      </div>
                      <h4 className={`font-bold text-base mt-1.5 ${item.done ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {item.title}
                      </h4>
                      <p className="text-xs text-teal-700 font-medium mt-1 flex items-center gap-1">
                        <MapPin size={13} /> {item.location}
                      </p>
                      {item.notes && <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">{item.notes}</p>}
                    </div>

                    <div className="flex items-center gap-1">
                      {item.image && (
                        <button
                          onClick={() => setPreviewImage(item.image)}
                          className="text-teal-600 hover:text-teal-800 p-1.5 rounded-lg hover:bg-teal-50 transition cursor-pointer"
                          title="কার্ড ইমেজ দেখুন"
                        >
                          <Eye size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeletePlan(item.id)}
                        className="text-slate-300 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: EXPENSES & SMART SPLITWISE MANAGER */}
          {activeTab === 'expenses' && (
            <SplitwiseManager
              members={data.members || []}
              expenses={data.expenses || []}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
              onOpenPrintModal={() => setShowPrintReport(true)}
              onEditMemberDeposit={(m) => setEditingMember(m)}
            />
          )}

          {/* TAB 4: SEATS, ROOMS & MEMBERS ROSTER */}
          {activeTab === 'seats_rooms' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 p-1 bg-slate-200/70 rounded-2xl max-w-md">
                <button
                  onClick={() => setSeatRoomSubTab('bus')}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    seatRoomSubTab === 'bus'
                      ? 'bg-teal-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Bus size={14} /> বাস সিট ম্যাপ
                </button>
                <button
                  onClick={() => setSeatRoomSubTab('hotel')}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    seatRoomSubTab === 'hotel'
                      ? 'bg-teal-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Hotel size={14} /> হোটেল রুম
                </button>
                <button
                  onClick={() => setSeatRoomSubTab('roster')}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    seatRoomSubTab === 'roster'
                      ? 'bg-teal-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users size={14} /> সদস্য ও ডিপোজিট
                </button>
              </div>

              {seatRoomSubTab === 'bus' && (
                <BusSeatMap
                  members={data.members || []}
                  seats={data.busSeats}
                  onUpdateSeats={handleUpdateBusSeats}
                  onUpdateMember={handleUpdateMember}
                  currentUser={currentUser}
                />
              )}

              {seatRoomSubTab === 'hotel' && (
                <HotelRoomMap
                  members={data.members || []}
                  rooms={data.hotelRooms}
                  onUpdateRooms={handleUpdateHotelRooms}
                  currentUser={currentUser}
                />
              )}

              {seatRoomSubTab === 'roster' && (
                <div className="space-y-6">
                  <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-base mb-4">নতুন সদস্য যুক্ত করুন</h3>
                    <form onSubmit={handleAddMember} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="সদস্য বা পরিবারের নাম"
                        value={newMember.name}
                        onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                        className="px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                        required
                      />
                      <input
                        type="text"
                        placeholder="মোবাইল নম্বর"
                        value={newMember.phone}
                        onChange={e => setNewMember({ ...newMember, phone: e.target.value })}
                        className="px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                      />
                      <input
                        type="number"
                        placeholder="পরিবারের সদস্য সংখ্যা (হেডকাউন্ট)"
                        value={newMember.familyCount}
                        onChange={e => setNewMember({ ...newMember, familyCount: e.target.value })}
                        className="px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                        min="1"
                      />
                      <input
                        type="text"
                        placeholder="বাস সিট (যেমন: স্লিপার ২ সিট)"
                        value={newMember.seat}
                        onChange={e => setNewMember({ ...newMember, seat: e.target.value })}
                        className="px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                      />
                      <input
                        type="text"
                        placeholder="হোটেল রুম (যেমন: ডাবল বেড রুম)"
                        value={newMember.room}
                        onChange={e => setNewMember({ ...newMember, room: e.target.value })}
                        className="px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                      />
                      <input
                        type="number"
                        placeholder="জমা দেওয়া ফান্ড/চাঁদা (৳)"
                        value={newMember.deposit}
                        onChange={e => setNewMember({ ...newMember, deposit: e.target.value })}
                        className="px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                      />
                      <button
                        type="submit"
                        className="md:col-span-3 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <Plus size={16} /> সদস্য তালিকায় যোগ করুন
                      </button>
                    </form>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {(data.members || []).map(member => (
                      <div key={member.id} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between gap-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-800 text-base">{member.name}</h4>
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                                {member.familyCount || 1} জন
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                                জমা: ৳ {Number(member.deposit || 0).toLocaleString()}
                              </span>
                              <button
                                onClick={() => setEditingMember(member)}
                                className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded-lg border border-teal-200 flex items-center gap-1 transition cursor-pointer"
                              >
                                <Edit3 size={12} /> ডিপোজিট আপডেট
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {member.phone && member.phone !== '01700000000' && (
                              <a
                                href={`tel:${member.phone}`}
                                className="p-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg transition"
                                title="কল করুন"
                              >
                                <PhoneCall size={14} />
                              </a>
                            )}
                            <button
                              onClick={() => setEditingMember(member)}
                              className="text-slate-400 hover:text-teal-600 p-1.5 rounded-lg hover:bg-teal-50 transition cursor-pointer"
                              title="তথ্য পরিবর্তন করুন"
                            >
                              <Edit3 size={15} />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteMember(member.id)}
                                className="text-slate-300 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                                title="মুছে ফেলুন"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                          <div className="bg-slate-50 p-2.5 rounded-xl flex items-center gap-2 border border-slate-100">
                            <Bus size={14} className="text-teal-600 shrink-0" />
                            <div className="min-w-0">
                              <span className="text-[10px] text-slate-400 block">বাস সিট</span>
                              <span className="font-semibold text-slate-700 truncate block">{member.seat}</span>
                            </div>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded-xl flex items-center gap-2 border border-slate-100">
                            <Hotel size={14} className="text-amber-600 shrink-0" />
                            <div className="min-w-0">
                              <span className="text-[10px] text-slate-400 block">হোটেল রুম</span>
                              <span className="font-semibold text-slate-700 truncate block">{member.room}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: INSTAGRAM MEDIA FEED */}
          {activeTab === 'feed' && (
            <InstagramFeed
              posts={data.posts || []}
              currentUser={currentUser}
              currentProfile={currentProfile}
              members={data.members || []}
              onAddPost={handleAddPost}
              onLikePost={handleLikePost}
              onAddComment={handleAddComment}
              onDeletePost={handleDeletePost}
              onUpdatePost={handleUpdatePost}
              onViewPost={handleViewPost}
              onCommentReaction={handleCommentReaction}
            />
          )}

          {/* TAB 6: DISCORD CHAT & DISCUSSIONS */}
          {activeTab === 'discussions' && (
            <DiscordDiscussion
              discussions={data.discussions || {}}
              currentUser={currentUser}
              currentProfile={currentProfile}
              members={data.members || []}
              onSendMessage={handleSendMessage}
              onAddReaction={handleAddReaction}
            />
          )}

          {/* TAB 7: NOTICE BOARD & EMERGENCY MEETINGS */}
          {activeTab === 'notices' && (
            <NoticeBoard
              notices={data.notices || []}
              meetingPoint={data.meetingPoint || {}}
              onAddNotice={handleAddNotice}
              canDelete={isAdmin}
              onDeleteNotice={handleDeleteNotice}
              onUpdateMeetingPoint={handleUpdateMeetingPoint}
            />
          )}

          {/* TAB 8: CHECKLIST */}
          {activeTab === 'checklist' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-base mb-3">প্যাকিং চেকলিস্টে নতুন আইটেম যোগ করুন</h3>
                <form onSubmit={handleAddCheckItem} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="যেমন: ক্যামেরা মেমোরি কার্ড, বাচ্চাদের সুইমিং ড্রেস..."
                    value={newCheckItem}
                    onChange={e => setNewCheckItem(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-sm rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus size={18} /> যোগ করুন
                  </button>
                </form>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 divide-y divide-slate-100">
                {(data.checklist || []).map(item => (
                  <div
                    key={item.id}
                    className="p-4 flex items-center justify-between gap-3.5 hover:bg-slate-50 transition"
                  >
                    <div
                     role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }}  onClick={() => toggleCheck(item.id)}
                      className="flex-1 flex items-center gap-3.5 cursor-pointer"
                    >
                      <button className="text-teal-600 cursor-pointer">
                        {item.checked ? <CheckCircle2 size={22} className="text-emerald-600" /> : <Circle size={22} />}
                      </button>
                      <div>
                        <p className={`text-sm font-medium ${item.checked ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {item.item}
                        </p>
                        <span className="text-[11px] text-slate-400">{item.category}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteCheckItem(item.id)}
                      className="text-slate-300 hover:text-rose-500 p-1 transition cursor-pointer"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>


      {/* =========================================================================
          EXACTLY 5 BUTTONS FOR MOBILE BOTTOM NAVIGATION (Polished & Balanced)
      ========================================================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 py-1.5 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex justify-around items-center z-40 shadow-2xl">
        {primaryBottomNavItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className={`flex-1 flex flex-col items-center py-1 rounded-2xl transition duration-200 cursor-pointer relative ${
                isActive ? 'text-teal-800 font-extrabold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition ${
                isActive ? 'bg-teal-100/70 text-teal-900 scale-110 shadow-2xs' : ''
              }`}>
                <Icon size={20} className={isActive ? 'text-teal-800' : 'text-slate-400'} />
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight ${
                isActive ? 'font-extrabold text-teal-900' : 'font-medium'
              }`}>
                {item.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-0.5 animate-pulse"></span>
              )}
            </button>
          );
        })}
      </nav>

      {/* GLOBAL COMMAND PALETTE (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={setIsCommandOpen}
        members={data.members || []}
        onSelectTab={(tabId) => {
          setActiveTab(tabId);
          setIsCommandOpen(false);
        }}
        onOpenExpenseModal={() => {
          setActiveTab('expenses');
          setIsCommandOpen(false);
        }}
        onOpenPrintModal={() => {
          setShowPrintReport(true);
          setIsCommandOpen(false);
        }}
        onOpenProfileModal={() => {
          setShowProfileModal(true);
          setIsCommandOpen(false);
        }}
        onTriggerSOS={() => {
          setActiveTab('notices');
          setIsCommandOpen(false);
        }}
      />

      {/* USER PROFILE MODAL */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        currentUser={currentUser}
        currentProfile={currentProfile}
        members={data.members || []}
        onSaveProfile={handleSaveProfile}
        onOpenUpdateModal={(info) => {
          setAppUpdateInfo(info);
          setShowAppUpdateModal(true);
        }}
      />

      {/* EDIT MEMBER & DEPOSIT UPDATE MODAL (Pinned header/footer, mobile-friendly) */}
      {editingMember && (() => {
        const originalMember = (data.members || []).find((m) => m.id === editingMember.id) || editingMember;
        const initialDeposit = Number(originalMember.deposit || 0);
        const currentDeposit = Number(editingMember.deposit || 0);
        const addedAmount = currentDeposit - initialDeposit;

        return (
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-150"
            role="presentation"
            onClick={() => setEditingMember(null)}
            onKeyDown={(e) => { if (e.key === 'Escape') setEditingMember(null); }}
          >
            <div
              className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full shadow-2xl max-h-[90vh] flex flex-col overflow-hidden my-auto border border-slate-100 animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* PINNED TOP HEADER */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200 bg-slate-50/95 backdrop-blur-md shrink-0 z-20">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                    <Edit3 size={18} />
                  </div>
                  <div className="truncate">
                    <h3 className="font-bold text-sm sm:text-base text-slate-800 truncate">সদস্যের তথ্য ও ডিপোজিট আপডেট</h3>
                    <p className="text-[11px] text-slate-500 truncate">{editingMember.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="w-8 h-8 rounded-full bg-slate-200 hover:bg-rose-100 hover:text-rose-600 text-slate-700 flex items-center justify-center transition cursor-pointer active:scale-95 shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              {/* SCROLLABLE FORM BODY */}
              <form
                id="edit-member-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleUpdateMember(editingMember);
                }}
                className="flex-1 flex flex-col min-h-0 overflow-hidden"
              >
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                  {/* QUICK DEPOSIT ADDITION CARD */}
                  <div className="bg-amber-50/90 p-3.5 rounded-2xl border border-amber-200/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                        ⚡ দ্রুত ডিপোজিট যোগ করুন (ট্যাপ করলেই জমা যোগ হবে):
                      </span>
                      {addedAmount !== 0 && (
                        <button
                          type="button"
                          onClick={() => setEditingMember({ ...editingMember, deposit: initialDeposit })}
                          className="text-[11px] font-bold text-amber-800 hover:text-rose-600 flex items-center gap-1 bg-amber-100/70 hover:bg-rose-50 px-2 py-0.5 rounded-md transition cursor-pointer"
                          title="পূর্বে যা ছিল তাতে রিসেট করুন"
                        >
                          <RotateCcw size={11} /> রিসেট
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[1000, 2000, 3000, 5000, 10000].map(addAmt => (
                        <button
                          key={addAmt}
                          type="button"
                          onClick={() => {
                            const cur = Number(editingMember.deposit || 0);
                            setEditingMember({ ...editingMember, deposit: cur + addAmt });
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-amber-100/80 text-amber-950 font-bold text-xs rounded-lg border border-amber-300 transition cursor-pointer shadow-2xs active:scale-95"
                        >
                          + ৳ {toBnNum(addAmt.toLocaleString())}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* DEPOSIT AMOUNT INPUT WITH LIVE BREAKDOWN */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700" htmlFor="app-field-1">
                        মোট জমা ফান্ড / ডিপোজিট (৳)
                      </label>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        পূর্বের জমা: ৳ {toBnNum(initialDeposit.toLocaleString())}
                      </span>
                    </div>

                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold text-base">৳</span>
                      <input
                        id="app-field-1"
                        type="number"
                        inputMode="numeric"
                        value={editingMember.deposit ?? ''}
                        onChange={e => setEditingMember({ ...editingMember, deposit: e.target.value })}
                        className="w-full pl-8 pr-3.5 py-2.5 text-base font-extrabold text-emerald-800 border-2 border-emerald-400 rounded-xl focus:outline-none focus:border-teal-700 bg-emerald-50/20 shadow-2xs"
                        required
                        min="0"
                      />
                    </div>

                    {/* LIVE AUDIT STATUS BADGE */}
                    <div className="mt-1.5 flex items-center justify-between text-[11px] px-1">
                      {addedAmount > 0 ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          ✓ নতুন যোগ হচ্ছে: + ৳ {toBnNum(addedAmount.toLocaleString())}
                        </span>
                      ) : addedAmount < 0 ? (
                        <span className="text-rose-600 font-semibold flex items-center gap-1">
                          ⚠ কমে যাচ্ছে: - ৳ {toBnNum(Math.abs(addedAmount).toLocaleString())}
                        </span>
                      ) : (
                        <span className="text-slate-400">বর্তমানে কোনো পরিবর্তন হয়নি</span>
                      )}
                      <span className="font-mono text-slate-500">
                        মোট: ৳ {toBnNum(currentDeposit.toLocaleString())}
                      </span>
                    </div>
                  </div>

                  {/* MEMBER NAME (FULL-WIDTH TO PREVENT TEXT CLIPPING) */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1" htmlFor="app-field-2">
                      সদস্যের পুরো নাম
                    </label>
                    <input
                      id="app-field-2"
                      type="text"
                      value={editingMember.name || ''}
                      onChange={e => setEditingMember({ ...editingMember, name: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                      required
                    />
                  </div>

                  {/* PHONE AND FAMILY HEADCOUNT */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1" htmlFor="app-field-3">
                        মোবাইল নম্বর
                      </label>
                      <input
                        id="app-field-3"
                        type="tel"
                        inputMode="tel"
                        placeholder="01XXXXXXXXX"
                        value={editingMember.phone || ''}
                        onChange={e => setEditingMember({ ...editingMember, phone: e.target.value })}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1" htmlFor="app-field-4">
                        সদস্য সংখ্যা (হেডকাউন্ট)
                      </label>
                      <input
                        id="app-field-4"
                        type="number"
                        inputMode="numeric"
                        value={editingMember.familyCount || 1}
                        onChange={e => setEditingMember({ ...editingMember, familyCount: e.target.value })}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                        min="1"
                      />
                    </div>
                  </div>

                  {/* BUS SEAT & HOTEL ROOM */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1" htmlFor="app-field-5">
                        বাস সিট
                      </label>
                      <input
                        id="app-field-5"
                        type="text"
                        placeholder="যেমন: বিজনেস B12, স্লিপার S1"
                        value={editingMember.seat || ''}
                        onChange={e => setEditingMember({ ...editingMember, seat: e.target.value })}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1" htmlFor="app-field-6">
                        হোটেল রুম
                      </label>
                      <input
                        id="app-field-6"
                        type="text"
                        placeholder="যেমন: রুম ৭০১ (সি-ভিউ)"
                        value={editingMember.room || ''}
                        onChange={e => setEditingMember({ ...editingMember, room: e.target.value })}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* PINNED FOOTER */}
                <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 z-20">
                  <button
                    type="button"
                    onClick={() => setEditingMember(null)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
                  >
                    <Save size={14} /> আপডেট সেভ করুন
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* PRINTABLE AUDIT & EXPENSE REPORT MODAL */}
      {showPrintReport && (
        <PrintableReport
          tourInfo={data.tourInfo || {}}
          members={data.members || []}
          expenses={data.expenses || []}
          onClose={() => setShowPrintReport(false)}
        />
      )}

      {/* OFFICIAL DAY CARD PREVIEW MODAL */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 cursor-pointer"
         role="presentation"
 onClick={() => setPreviewImage(null)}
onKeyDown={(e) => { if (e.key === 'Escape') e.currentTarget.click(); }}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200"
          >
            <div className="p-3 bg-teal-900 text-white flex items-center justify-between">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <ImageIcon size={15} className="text-amber-300" /> অফিশিয়াল ভ্রমণ সূচি কার্ড
              </span>
              <button
                onClick={() => setPreviewImage(null)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-2 bg-slate-100 flex items-center justify-center">
              <img
                src={previewImage}
                alt="Tour Card Preview"
                className="w-full max-h-[75vh] object-contain rounded-2xl shadow"
              />
            </div>
          </div>
        </div>
      )}

      {/* SUPERPOWER MODALS */}
      <FamilySafetyHub
        isOpen={showSafetyHubModal}
        onClose={() => setShowSafetyHubModal(false)}
        currentUser={currentUser}
        currentProfile={currentProfile}
        familyLocations={data.familyLocations || {}}
        members={data.members || []}
        onShareLocation={handleShareLocation}
        onClearLocation={handleClearLocation}
      />

      <TourQuizModal
        isOpen={showQuizModal}
        onClose={() => setShowQuizModal(false)}
        currentUser={currentUser}
        currentProfile={currentProfile}
      />

      {/* IN-APP OTA APP UPDATER MODAL */}
      <AppUpdateModal
        isOpen={showAppUpdateModal}
        updateInfo={appUpdateInfo}
        onClose={() => setShowAppUpdateModal(false)}
      />

    </div>
    <ConfirmDialog request={confirmRequest} onCancel={closeConfirm} />
    </Suspense>
  );
}
