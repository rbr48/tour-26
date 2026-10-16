import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin, Calendar, Wallet, Users, CheckSquare, PhoneCall,
  Plus, Trash2, CheckCircle2, Circle, RefreshCw, Bus, Hotel,
  Utensils, Navigation, AlertTriangle, Share2, CloudUpload, Server,
  Eye, Image as ImageIcon, Sparkles, Compass, ShieldCheck, Clock
} from 'lucide-react';

const INITIAL_DATA = {
  tourInfo: {
    title: 'রংপুর ➔ কক্সবাজার ফ্যামিলি ট্যুর ২০২৬',
    startDate: '2026-10-19',
    endDate: '2026-10-23',
    duration: '৫ দিন ৪ রাত (১৯ - ২৩ অক্টোবর ২০২৬)',
    hotelName: 'হোটেল সি মুন (Hotel Sea Moon), কলাতলী, কক্সবাজার',
    busName: 'এভারগ্রীন পরিবহন এসি বাস (Evergreen AC Bus)',
    departure: 'রংপুর কামারপাড়া বাস স্ট্যান্ড (১৯ অক্টোবর, সন্ধ্যা ০৬:০০ টা)',
    returnDeparture: 'ডলফিন মোড়, কক্সবাজার (২৩ অক্টোবর, দুপুর ০২:৪৫ টা)',
    photoAlbumUrl: 'https://photos.google.com'
  },
  itinerary: [
    {
      id: 1,
      day: '১ম দিন: ১৯/১০/২০২৬ (সোমবার)',
      category: 'যাত্রার সূচনা',
      title: 'রংপুর কামারপাড়া বাস স্ট্যান্ড হতে কক্সবাজার যাত্রা',
      time: 'সন্ধ্যা ০৬:০০ টা',
      location: 'কামারপাড়া বাস স্ট্যান্ড, রংপুর',
      notes: 'Evergreen AC Bus-এ কক্সবাজারের উদ্দেশ্যে রওনা। অফিশিয়াল ছাড়ার সময় ৬:১৫। বাসে হালকা শীতের চাদর ও ঘাড়ের বালিশ সাথে রাখা।',
      image: '/plans/day1.jpeg',
      done: false
    },
    {
      id: 2,
      day: '১ম দিন: ১৯/১০/২০২৬ (সোমবার)',
      category: 'নৈশভোজ ও বিরতি',
      title: 'বগুড়া ফুড ভিলেজে রাতের খাবার (ডিনার) ও রিফ্রেশমেন্ট',
      time: 'রাত ১১:০০ টা',
      location: 'ফুড ভিলেজ, বগুড়া',
      notes: 'বগুড়ায় রাতের খাবার বিরতি। এরপর বাসে আরামদায়ক নৈশভ্রমণ ও বিশ্রাম।',
      image: '/plans/day1.jpeg',
      done: false
    },
    {
      id: 3,
      day: '২য় দিন: ২০/১০/২০২৬ (মঙ্গলবার)',
      category: 'কক্সবাজার আগমন',
      title: 'হাইওয়ে রেস্টুরেন্টে নাস্তা ও কক্সবাজার আগমন',
      time: 'সকাল ০৮:০০ টা',
      location: 'চট্টগ্রাম / নিকটস্থ হাইওয়ে রেস্টুরেন্ট',
      notes: 'চট্টগ্রাম হাইওয়ে রেস্টুরেন্টে পুষ্টিকর সকালের নাস্তা গ্রহণ। এরপর প্রাকৃতিক সৌন্দর্য দেখতে দেখতে কক্সবাজারের উদ্দেশ্যে যাত্রা।',
      image: '/plans/day2.jpeg',
      done: false
    },
    {
      id: 4,
      day: '২য় দিন: ২০/১০/২০২৬ (মঙ্গলবার)',
      category: 'হোটেল চেক-ইন',
      title: 'হোটেল সি মুনে চেক-ইন, লাঞ্চ ও পূর্ণ বিশ্রাম',
      time: 'দুপুর ১২:০০ টা',
      location: 'হোটেল সি মুন (Hotel Sea Moon), কলাতলী',
      notes: 'দুপুর ১২টায় হোটেলে চেক-ইন ও ফ্রেশ হওয়া (১০টি রুম বরাদ্দ: ৩য় থেকে ৭ম তলা)। দুপুর ২টায় মধ্যাহ্নভোজ (লাঞ্চ) এবং দুপুর ২:৩০ হতে সন্ধ্যা ৬:০০ পর্যন্ত দীর্ঘ ভ্রমণের পর পূর্ণ বিশ্রাম।',
      image: '/plans/day2.jpeg',
      done: false
    },
    {
      id: 5,
      day: '২য় দিন: ২০/১০/২০২৬ (মঙ্গলবার)',
      category: 'বিচ সূর্যাস্ত',
      title: 'লাবণী ও সুগন্ধা বিচে সূর্যাস্তের মনোরম দৃশ্য উপভোগ',
      time: 'বিকাল ০৬:০০ টা',
      location: 'লাবণী ও সুগন্ধা বিচ পয়েন্ট',
      notes: 'সবাই মিলে বিচে সূর্যাস্তের মনোরম দৃশ্য উপভোগ, সমুদ্রের হাওয়ায় আড্ডা ও ফটোসেশন। রাত ৯টায় রাতের খাবার (ডিনার) শেষ করে হোটেলে ফিরে বিশ্রাম ও নৈশযাপন।',
      image: '/plans/day2.jpeg',
      done: false
    },
    {
      id: 6,
      day: '৩য় দিন: ২১/১০/২০২৬ (বুধবার)',
      category: 'ছাদখোলা বাস ট্যুর',
      title: 'বিআরটিসি ছাদখোলা বাসে মেরিন ড্রাইভ ধরে যাত্রা',
      time: 'সকাল ০৮:৩০ টা',
      location: 'কলাতলী ➔ মেরিন ড্রাইভ রোড',
      notes: 'সকাল ৮:০০ টায় হোটেলে নাস্তা সম্পন্ন করে কলাতলী থেকে বিআরটিসি ছাদখোলা দোতলা বাসে মেরিন ড্রাইভ ধরে রোমাঞ্চকর যাত্রা শুরু।',
      image: '/plans/day3.jpeg',
      done: false
    },
    {
      id: 7,
      day: '৩য় দিন: ২১/১০/২০২৬ (বুধবার)',
      category: 'দর্শনীয় স্থান',
      title: 'হিমছড়ি, ইনানী বিচ, পটুয়ারটেক ও সাবরাং জিরো পয়েন্ট (টেকনাফ)',
      time: 'সকাল ১০:০০ টা - দুপুর ০২:০০ টা',
      location: 'হিমছড়ি ➔ ইনানী ➔ পটুয়ারটেক ➔ সাবরাং জিরো পয়েন্ট',
      notes: 'হিমছড়ি পাহাড় ও ঝর্ণা, ইনানীর পাথুরে সৈকত, পটুয়ারটেক প্রবাল সৈকত ভ্রমণ। দুপুর ১টা থেকে ২টার মধ্যে সাবরাং জিরো পয়েন্টের টং দোকানে দেশীয় স্বাদে লাঞ্চ শেষ করা।',
      image: '/plans/day3.jpeg',
      done: false
    },
    {
      id: 8,
      day: '৩য় দিন: ২১/১০/২০২৬ (বুধবার)',
      category: 'বারবিকিউ & পার্টি',
      title: 'সী বীচের পাশে জমজমাট বারবিকিউ (BBQ) ও সংগীত সন্ধ্যা',
      time: 'সন্ধ্যা ০৭:৩০ টা',
      location: 'সী বীচ প্রাঙ্গণ / হোটেল বিচ পয়েন্ট',
      notes: 'বিকাল ৫:০০ টায় হোটেলে প্রত্যাবর্তন ও বিশ্রাম। সন্ধ্যা ৭:৩০ টায় সমুদ্রের গর্জনের সাথে বারবিকিউ পার্টি এবং মাসুদ ভাই ও আলমগীর ভাইয়ের গানের বিশেষ আসর!',
      image: '/plans/day3.jpeg',
      done: false
    },
    {
      id: 9,
      day: '৪র্থ দিন: ২২/১০/২০২৬ (বৃহস্পতিবার)',
      category: 'দ্বীপ সফর',
      title: 'নুনিয়াছড়া ঘাট হয়ে লঞ্চে মহেশখালী দ্বীপ যাত্রা',
      time: 'সকাল ০৮:০০ টা',
      location: 'নুনিয়াছড়া ঘাট ➔ বাঁকখালী নদী',
      notes: 'সকালে নাস্তা শেষ করে নুনিয়াছড়া ঘাট হয়ে লঞ্চ/ট্রলারে মহেশখালীর উদ্দেশ্যে রওনা। বাঁকখালী নদীর নয়নাভিরাম জলপথ উপভোগ।',
      image: '/plans/day4.jpeg',
      done: false
    },
    {
      id: 10,
      day: '৪র্থ দিন: ২২/১০/২০২৬ (বৃহস্পতিবার)',
      category: 'মহেশখালী দর্শন',
      title: 'আদিনাথ পাহাড়ি মন্দির, মিষ্টি পানের বরজ ও শুঁটকি পল্লী',
      time: 'সকাল ১০:৩০ টা - দুপুর',
      location: 'মহেশখালী আদিনাথ পাহাড় ও শুঁটকি পল্লী',
      notes: 'ঐতিহাসিক আদিনাথ মন্দির দর্শন, পাহাড়ি প্রাকৃতিক পরিবেশ, মহেশখালীর বিখ্যাত মিষ্টি পানের বরজ এবং ঐতিহ্যবাহী শুঁটকি পল্লী পরিদর্শন। মহেশখালীতে লাঞ্চ শেষ করে বিকেলে কক্সবাজার ফেরা।',
      image: '/plans/day4.jpeg',
      done: false
    },
    {
      id: 11,
      day: '৪র্থ দিন: ২২/১০/২০২৬ (বৃহস্পতিবার)',
      category: 'শপিং ও নাইট বিচ',
      title: 'রাতের বিচে ঘোরাঘুরি ও বার্মিজ মার্কেটে ফ্যামিলি শপিং',
      time: 'রাত ০৮:০০ টা',
      location: 'বার্মিজ মার্কেট ও সুগন্ধা বিচ',
      notes: 'রাতের খাবার গ্রহণ করে রাতের আলোকোজ্জ্বল বিচে পদচারণা এবং বার্মিজ মার্কেটে শুঁটকি, আচার, বার্মিজ চাদর ও স্যুভেনিয়ার কেনাকাটা।',
      image: '/plans/day4.jpeg',
      done: false
    },
    {
      id: 12,
      day: '৫ম দিন: ২৩/১০/২০২৬ (শুক্রবার)',
      category: 'শহর ভ্রমণ',
      title: 'রেডিয়েন্ট ফিশ ওয়ার্ল্ড একুরিয়াম বা নিকটবর্তী স্পট ভ্রমণ',
      time: 'সকাল ০৯:৩০ টা',
      location: 'রেডিয়েন্ট ফিশ ওয়ার্ল্ড, কক্সবাজার',
      notes: 'সকালের নাস্তা শেষ করে কক্সবাজার শহরের ভেতরের অন্যতম আকর্ষণ আন্তর্জাতিক মানের রেডিয়েন্ট ফিশ ওয়ার্ল্ড একুরিয়াম ভ্রমণ ও ফটোসেশন।',
      image: '/plans/day5.jpeg',
      done: false
    },
    {
      id: 13,
      day: '৫ম দিন: ২৩/১০/২০২৬ (শুক্রবার)',
      category: 'নামাজ ও মধ্যাহ্নভোজ',
      title: 'জুম্মার নামাজ আদায়, লাঞ্চ সম্পন্ন ও হোটেল চেক-আউট',
      time: 'দুপুর ০১:০০ টা - ০২:৩০ টা',
      location: 'কলাতলী জামে মসজিদ ও হোটেল সি মুন',
      notes: 'পবিত্র জুম্মার নামাজ জামায়াতে আদায়, পরিবারের সাথে দুপুরের লাঞ্চ সম্পন্ন করা, ব্যাগ গুছিয়ে হোটেল সি মুন হতে চেক-আউট।',
      image: '/plans/day5.jpeg',
      done: false
    },
    {
      id: 14,
      day: '৫ম দিন: ২৩/১০/২০২৬ (শুক্রবার)',
      category: 'ফিরতি যাত্রা',
      title: 'ডলফিন মোড় থেকে রংপুরের উদ্দেশ্যে ফিরতি বাসে উঠা',
      time: 'দুপুর ০২:৪৫ টা',
      location: 'ডলফিন মোড়, কলাতলী, কক্সবাজার',
      notes: 'ডলফিন মোড় হতে Evergreen ফিরতি বাসে রংপুরের উদ্দেশ্যে রওনা। ৫ দিনের স্মৃতিময় সফর শেষে ইনশাআল্লাহ সহি-সালামতে রংপুরে পৌঁছানো।',
      image: '/plans/day5.jpeg',
      done: false
    }
  ],
  members: [
    { id: 1, name: 'রাজু ভাই (ট্যুর অর্গানাইজার)', phone: '01700000000', seat: 'স্লিপার (২ সিট)', room: 'রুম বরাদ্দ', deposit: 15000 },
    { id: 2, name: 'মাসুদ ভাই (এসবিএল)', phone: '01700000000', seat: 'বিজনেস ক্লাস (৩ সিট)', room: 'ডাবল বেড রুম', deposit: 15000 },
    { id: 3, name: 'আশেক মো: আসিফ ভাই', phone: '01700000000', seat: 'স্লিপার (৪ সিট)', room: 'ডাবল বেড রুম', deposit: 20000 },
    { id: 4, name: 'শশি ভাই (সচিবুল ভাই)', phone: '01700000000', seat: 'বিজনেস ক্লাস (৩ সিট)', room: 'রুম বরাদ্দ', deposit: 15000 },
    { id: 5, name: 'নুরুজ্জামান ভাই', phone: '01700000000', seat: 'বিজনেস ক্লাস (৩ সিট)', room: 'ডাবল বেড রুম', deposit: 15000 },
    { id: 6, name: 'লতিফ ভাই / খালু (কুড়িগ্রাম)', phone: '01700000000', seat: 'বিজনেস ক্লাস (২ সিট)', room: 'রুম বরাদ্দ', deposit: 10000 },
    { id: 7, name: 'আলিম ভাই', phone: '01700000000', seat: 'স্লিপার (২ সিট)', room: 'রুম বরাদ্দ', deposit: 10000 },
    { id: 8, name: 'সাইফুল ভাই / জামাই', phone: '01700000000', seat: 'স্লিপার (২ সিট)', room: 'রুম বরাদ্দ', deposit: 10000 },
    { id: 9, name: 'এম এস রানা ভাই (বিকেবি)', phone: '01700000000', seat: 'সিট নির্ধারিত', room: 'ডাবল বেড রুম', deposit: 10000 },
    { id: 10, name: 'আলমগীর ভাই (ফটোগ্রাফার)', phone: '01700000000', seat: 'সিট নির্ধারিত', room: 'সিঙ্গেল রুম', deposit: 8000 }
  ],
  expenses: [
    { id: 1, title: 'হোটেল সি মুন রুম বুকিং অ্যাডভান্স (১০টি রুম)', category: 'হোটেল', amount: 25000, date: '2026-09-04' },
    { id: 2, title: 'এভারগ্রীন এসি বাস টিকিট (আসা-যাওয়া ২১+ সিট কনফার্ম)', category: 'পরিবহন', amount: 48000, date: '2026-09-26' },
    { id: 3, title: 'বিআরটিসি ছাদখোলা বাস মেরিন ড্রাইভ রিজার্ভেশন', category: 'লোকাল ট্রান্সপোর্ট', amount: 12000, date: '2026-10-10' },
    { id: 4, title: 'মহেশখালী স্পিডবোট ও ট্রলার রিজার্ভ বুকিং', category: 'লোকাল ট্রান্সপোর্ট', amount: 5000, date: '2026-10-12' },
    { id: 5, title: 'সী বীচ বারবিকিউ (BBQ) ও পার্টি স্পেশাল আয়োজন', category: 'খাবার', amount: 8000, date: '2026-10-13' },
    { id: 6, title: 'ট্যুর স্পেশাল উপহার ও জরুরি সামগ্রী স্টক', category: 'অন্যান্য', amount: 3500, date: '2026-10-13' }
  ],
  checklist: [
    { id: 1, item: 'সবার মূল NID কার্ড ও ফটোকপি (ভাবীদের সহ, হোটেল সি মুন চেক-ইনের জন্য বাধ্যতামূলক)', category: 'ডকুমেন্টস', checked: true },
    { id: 2, item: 'বাস ও হোটেল বুকিং স্লিপ/ভাউচার (Evergreen & Hotel Sea Moon)', category: 'ডকুমেন্টস', checked: true },
    { id: 3, item: 'সানগ্লাস ও ট্রাভেল ক্যাপ (ভাবীদের ক্যাপ ও সবার সানগ্লাস)', category: 'পোশাক', checked: true },
    { id: 4, item: 'বিচে খেলার জন্য ফুটবল ⚽', category: 'বিনোদন', checked: false },
    { id: 5, item: 'একশন ক্যামেরা / মোবাইল ক্যামেরা ও পাওয়ার ব্যাংক 📷', category: 'ইলেকট্রনিক্স', checked: true },
    { id: 6, item: 'সমুদ্র স্নানের হাফ প্যান্ট, তোয়ালে ও সানস্ক্রিন লোশন', category: 'প্রসাধন', checked: false },
    { id: 7, item: 'বমির ওষুধ, প্যারাসিটামল, ওআরএস (ORS), গ্যাস্ট্রিকের ওষুধ ও ফার্স্ট এইড 💊', category: 'ওষুধ', checked: true },
    { id: 8, item: 'বাচ্চাদের গরম কাপড় ও প্রয়োজনীয় শুকনো খাবার 👶', category: 'শিশু যত্ন', checked: false },
    { id: 9, item: 'কাদেরের দোকান থেকে বেনসন/লাকি সিগারেট কার্টুন (ট্যুর স্পেশাল)', category: 'অন্যান্য', checked: true },
    { id: 10, item: 'বাসে রাতের আরামদায়ক ঘুমের জন্য ঘাড়ের বালিশ ও চাদর 🛌', category: 'ভ্রমণ সামগ্রী', checked: false }
  ]
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem('rangpur_coxs_tour_data');
      return saved ? JSON.parse(saved) : INITIAL_DATA;
    } catch {
      return INITIAL_DATA;
    }
  });

  // Server Sync State - defaults to /api.php so it works out of the box on domain!
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem('tour_api_url') || '/api.php');
  const [syncStatus, setSyncStatus] = useState('সংযুক্ত');
  const [showServerModal, setShowServerModal] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Form States
  const [newExpense, setNewExpense] = useState({ title: '', category: 'খাবার', amount: '' });
  const [newMember, setNewMember] = useState({ name: '', phone: '', seat: '', room: '', deposit: '' });
  const [newPlan, setNewPlan] = useState({ day: '', title: '', time: '', location: '', notes: '' });
  const [newCheckItem, setNewCheckItem] = useState('');

  // Save to localStorage whenever data changes
  useEffect(() => {
    try {
      localStorage.setItem('rangpur_coxs_tour_data', JSON.stringify(data));
    } catch (e) {
      console.error('LocalStorage save error:', e);
    }
  }, [data]);

  // Fetch from custom server
  const fetchFromServer = useCallback(async (urlToFetch = apiUrl) => {
    if (!urlToFetch) return;
    try {
      setSyncStatus('সিঙ্ক হচ্ছে...');
      const res = await fetch(urlToFetch);
      if (res.ok) {
        const remoteData = await res.json();
        if (remoteData && remoteData.tourInfo) {
          setData(remoteData);
          setSyncStatus('সার্ভার আপডেটেড');
        } else if (remoteData && remoteData.status === 'empty') {
          // If server has no data yet, initialize server with local data
          await fetch(urlToFetch, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          setSyncStatus('সার্ভারে সেভড');
        }
      } else {
        setSyncStatus('লোকাল মোড');
      }
    } catch {
      setSyncStatus('অফলাইন (লোকাল)');
    }
  }, [apiUrl, data]);

  // Initial fetch on mount
  useEffect(() => {
    if (apiUrl) {
      fetchFromServer(apiUrl);
    }
  }, []);

  // Push to custom server
  const pushToServer = async (updatedData) => {
    setData(updatedData);
    if (!apiUrl) return;
    try {
      setSyncStatus('সেভ হচ্ছে...');
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      if (res.ok) {
        setSyncStatus('সার্ভারে সেভড');
      } else {
        setSyncStatus('লোকাল সেভড');
      }
    } catch {
      setSyncStatus('লোকাল সেভড (অফলাইন)');
    }
  };

  // Financial Calculations
  const totalDeposit = data.members.reduce((sum, m) => sum + Number(m.deposit || 0), 0);
  const totalExpense = data.expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const remainingBalance = totalDeposit - totalExpense;
  const completedChecklist = data.checklist.filter(c => c.checked).length;

  // Handlers
  const toggleItineraryDone = (id) => {
    const updated = {
      ...data,
      itinerary: data.itinerary.map(item => item.id === id ? { ...item, done: !item.done } : item)
    };
    pushToServer(updated);
  };

  const handleAddPlan = (e) => {
    e.preventDefault();
    if (!newPlan.title || !newPlan.day) return;
    const updated = {
      ...data,
      itinerary: [...data.itinerary, { ...newPlan, id: Date.now(), done: false }]
    };
    pushToServer(updated);
    setNewPlan({ day: '', title: '', time: '', location: '', notes: '' });
  };

  const handleDeletePlan = (id) => {
    const updated = {
      ...data,
      itinerary: data.itinerary.filter(item => item.id !== id)
    };
    pushToServer(updated);
  };

  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!newExpense.title || !newExpense.amount) return;
    const updated = {
      ...data,
      expenses: [
        {
          id: Date.now(),
          title: newExpense.title,
          category: newExpense.category,
          amount: Number(newExpense.amount),
          date: new Date().toISOString().slice(0, 10)
        },
        ...data.expenses
      ]
    };
    pushToServer(updated);
    setNewExpense({ title: '', category: 'খাবার', amount: '' });
  };

  const handleDeleteExpense = (id) => {
    const updated = {
      ...data,
      expenses: data.expenses.filter(e => e.id !== id)
    };
    pushToServer(updated);
  };

  const handleAddMember = (e) => {
    e.preventDefault();
    if (!newMember.name) return;
    const updated = {
      ...data,
      members: [
        ...data.members,
        {
          id: Date.now(),
          name: newMember.name,
          phone: newMember.phone,
          seat: newMember.seat || 'নির্ধারিত নয়',
          room: newMember.room || 'নির্ধারিত নয়',
          deposit: Number(newMember.deposit || 0)
        }
      ]
    };
    pushToServer(updated);
    setNewMember({ name: '', phone: '', seat: '', room: '', deposit: '' });
  };

  const handleDeleteMember = (id) => {
    const updated = {
      ...data,
      members: data.members.filter(m => m.id !== id)
    };
    pushToServer(updated);
  };

  const toggleCheck = (id) => {
    const updated = {
      ...data,
      checklist: data.checklist.map(c => c.id === id ? { ...c, checked: !c.checked } : c)
    };
    pushToServer(updated);
  };

  const handleAddCheckItem = (e) => {
    e.preventDefault();
    if (!newCheckItem) return;
    const updated = {
      ...data,
      checklist: [...data.checklist, { id: Date.now(), item: newCheckItem, category: 'অন্যান্য', checked: false }]
    };
    pushToServer(updated);
    setNewCheckItem('');
  };

  const handleDeleteCheckItem = (id) => {
    const updated = {
      ...data,
      checklist: data.checklist.filter(c => c.id !== id)
    };
    pushToServer(updated);
  };

  const saveServerConfig = (e) => {
    e.preventDefault();
    localStorage.setItem('tour_api_url', apiUrl);
    setShowServerModal(false);
    fetchFromServer(apiUrl);
  };

  const navItems = [
    { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: Navigation },
    { id: 'itinerary', label: 'ভ্রমণ সূচি', icon: Calendar },
    { id: 'expenses', label: 'হিসাব-নিকাশ', icon: Wallet },
    { id: 'members', label: 'সিট ও রুম', icon: Users },
    { id: 'checklist', label: 'চেকলিস্ট', icon: CheckSquare }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 bg-teal-900 text-white flex-col justify-between p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-3 pb-6 border-b border-teal-700">
            <div className="relative">
              <img
                src="/logo.png"
                alt="App Logo"
                className="w-13 h-13 rounded-2xl object-cover ring-2 ring-amber-400 shadow-md"
              />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-teal-900 rounded-full"></span>
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight">ফ্যামিলি ট্যুর ২০২৬</h1>
              <p className="text-xs text-amber-300 font-medium">রংপুর ➔ কক্সবাজার</p>
              <p className="text-[10px] text-teal-300/80 mt-0.5">com.izhaanintellect.tour2026</p>
            </div>
          </div>

          <nav className="mt-6 space-y-2">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition cursor-pointer ${
                    activeTab === item.id
                      ? 'bg-amber-400 text-teal-950 shadow-md font-semibold'
                      : 'text-teal-100 hover:bg-teal-800'
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="bg-teal-950/60 p-4 rounded-xl space-y-2 border border-teal-800">
          <div className="flex items-center justify-between text-xs text-teal-200">
            <span>সার্ভার স্ট্যাটাস:</span>
            <span className="font-semibold text-amber-300 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {syncStatus}
            </span>
          </div>
          <button
            onClick={() => setShowServerModal(true)}
            className="w-full py-2 px-3 bg-teal-800 hover:bg-teal-700 text-xs rounded-lg flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Server size={14} /> সার্ভার সিঙ্ক সেটিংস
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col pb-20 md:pb-0">
        {/* Top Header */}
        <header className="bg-gradient-to-r from-teal-800 via-teal-700 to-cyan-700 text-white p-4 md:px-8 md:py-6 shadow-md">
          <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <img
                src="/logo.png"
                alt="App Logo"
                className="w-12 h-12 md:w-14 md:h-14 rounded-2xl object-cover ring-2 ring-amber-400 shadow-md md:hidden"
              />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 text-xs bg-amber-400 text-teal-950 font-bold rounded-full">
                    {data.tourInfo.duration}
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] bg-white/20 px-2 py-0.5 rounded-full text-teal-100">
                    <Bus size={12} /> {data.tourInfo.busName}
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold">{data.tourInfo.title}</h2>
                <p className="text-xs md:text-sm text-teal-100 mt-0.5 flex items-center gap-1.5">
                  <Hotel size={15} className="text-amber-300" /> {data.tourInfo.hotelName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchFromServer()}
                className="p-2.5 bg-white/15 hover:bg-white/25 rounded-xl text-white transition cursor-pointer"
                title="সার্ভার থেকে রিফ্রেশ করুন"
              >
                <RefreshCw size={18} />
              </button>
              <button
                onClick={() => setShowServerModal(true)}
                className="md:hidden p-2.5 bg-white/15 hover:bg-white/25 rounded-xl text-white transition cursor-pointer"
                title="সার্ভার সেটিংস"
              >
                <Server size={18} />
              </button>
              <a
                href={data.tourInfo.photoAlbumUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-teal-950 font-semibold text-xs md:text-sm rounded-xl flex items-center gap-1.5 shadow-sm transition"
              >
                <Share2 size={16} /> ফটো অ্যালবাম
              </a>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 space-y-6">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Route Progress Banner */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Bus size={17} className="text-teal-600" /> যাত্রাপথ: রংপুর কামারপাড়া ➔ কক্সবাজার ডলফিন মোড়
                  </h3>
                  <span className="text-xs bg-teal-50 text-teal-700 font-medium px-2 py-0.5 rounded-lg border border-teal-200">
                    এভারগ্রীন এসি বাস
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs md:text-sm font-medium text-slate-700 overflow-x-auto pb-2">
                  <div className="flex flex-col items-center min-w-[75px]">
                    <span className="w-3.5 h-3.5 rounded-full bg-teal-600 mb-1"></span>
                    <span className="font-bold">রংপুর</span>
                    <span className="text-[10px] text-slate-400">কামারপাড়া</span>
                  </div>
                  <div className="flex-1 h-1 bg-teal-200 mx-1"></div>
                  <div className="flex flex-col items-center min-w-[75px]">
                    <span className="w-3.5 h-3.5 rounded-full bg-teal-500 mb-1"></span>
                    <span>বগুড়া</span>
                    <span className="text-[10px] text-slate-400">ফুড ভিলেজ</span>
                  </div>
                  <div className="flex-1 h-1 bg-teal-200 mx-1"></div>
                  <div className="flex flex-col items-center min-w-[75px]">
                    <span className="w-3.5 h-3.5 rounded-full bg-teal-500 mb-1"></span>
                    <span>কুমিল্লা</span>
                    <span className="text-[10px] text-slate-400">হাইওয়ে</span>
                  </div>
                  <div className="flex-1 h-1 bg-teal-200 mx-1"></div>
                  <div className="flex flex-col items-center min-w-[75px]">
                    <span className="w-3.5 h-3.5 rounded-full bg-teal-500 mb-1"></span>
                    <span>চট্টগ্রাম</span>
                    <span className="text-[10px] text-slate-400">নাস্তা বিরতি</span>
                  </div>
                  <div className="flex-1 h-1 bg-amber-300 mx-1"></div>
                  <div className="flex flex-col items-center min-w-[90px] text-teal-800 font-bold">
                    <span className="w-4 h-4 rounded-full bg-amber-400 ring-4 ring-amber-100 mb-1"></span>
                    <span className="text-teal-900">কক্সবাজার</span>
                    <span className="text-[10px] text-teal-700">হোটেল সি মুন</span>
                  </div>
                </div>
              </div>

              {/* Quick Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                  <p className="text-xs text-slate-500">মোট জমা ফান্ড</p>
                  <p className="text-xl md:text-2xl font-bold text-teal-700 mt-1">৳ {totalDeposit.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                  <p className="text-xs text-slate-500">মোট খরচ</p>
                  <p className="text-xl md:text-2xl font-bold text-rose-600 mt-1">৳ {totalExpense.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                  <p className="text-xs text-slate-500">অবশিষ্ট ব্যালেন্স</p>
                  <p className="text-xl md:text-2xl font-bold text-emerald-600 mt-1">৳ {remainingBalance.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                  <p className="text-xs text-slate-500">প্যাকিং প্রস্তুতি</p>
                  <p className="text-xl md:text-2xl font-bold text-amber-600 mt-1">
                    {completedChecklist} / {data.checklist.length} টি
                  </p>
                </div>
              </div>

              {/* Next Itinerary & Emergency Box */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <Calendar size={18} className="text-teal-600" /> ভ্রমণ সূচির সারসংক্ষেপ
                    </h3>
                    <button
                      onClick={() => setActiveTab('itinerary')}
                      className="text-xs text-teal-600 font-semibold hover:underline cursor-pointer"
                    >
                      সম্পূর্ণ প্ল্যান ➔
                    </button>
                  </div>
                  <div className="space-y-3">
                    {data.itinerary.slice(0, 3).map(item => (
                      <div key={item.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold px-2 py-0.5 bg-teal-100 text-teal-800 rounded-md">
                              {item.day.split(':')[0]}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">{item.time}</span>
                          </div>
                          <h4 className="font-semibold text-sm mt-1 text-slate-800">{item.title}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">{item.location}</p>
                        </div>
                        {item.image && (
                          <button
                            onClick={() => setPreviewImage(item.image)}
                            className="p-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition shrink-0"
                            title="অফিশিয়াল কার্ড দেখুন"
                          >
                            <ImageIcon size={15} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-amber-50/70 p-5 rounded-2xl border border-amber-200/80 space-y-4">
                  <h3 className="font-bold text-amber-950 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-600" /> জরুরি কন্টাক্ট ও বিচ সেফটি
                  </h3>
                  <ul className="text-xs text-amber-900 space-y-2 leading-relaxed">
                    <li>• সমুদ্রে নামার আগে জোয়ার-ভাটার সময় ও লাল পতাকা খেয়াল রাখুন।</li>
                    <li>• হোটেল সি মুন চেক-ইনের সময় সবার মূল এনআইডি কার্ড রিসেপশনে প্রদর্শন আবশ্যক।</li>
                    <li>• শিশুদের সবসময় বড়দের নজরে রাখুন এবং পকেটে হোটেলের ভিজিটিং কার্ড রাখুন।</li>
                    <li>• বিচে সানগ্লাস, টুপি এবং সানস্ক্রিন ব্যবহার করুন।</li>
                  </ul>
                  <div className="pt-2 space-y-2">
                    <a
                      href="tel:01320160000"
                      className="w-full py-2.5 px-4 bg-white hover:bg-amber-100 text-amber-950 rounded-xl border border-amber-200 flex items-center justify-between text-xs font-semibold transition"
                    >
                      <span>ট্যুরিস্ট পুলিশ কক্সবাজার হটলাইন</span>
                      <span className="flex items-center gap-1 text-teal-700"><PhoneCall size={14} /> 01320-160000</span>
                    </a>
                    <a
                      href="tel:999"
                      className="w-full py-2.5 px-4 bg-white hover:bg-amber-100 text-amber-950 rounded-xl border border-amber-200 flex items-center justify-between text-xs font-semibold transition"
                    >
                      <span>জাতীয় জরুরি সেবা</span>
                      <span className="flex items-center gap-1 text-rose-600"><PhoneCall size={14} /> 999</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ITINERARY */}
          {activeTab === 'itinerary' && (
            <div className="space-y-6">
              {/* Day Visual Slides Banner */}
              <div className="bg-gradient-to-r from-teal-900 to-teal-800 text-white p-5 rounded-2xl shadow-sm">
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

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
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
                    className={`bg-white p-4 md:p-5 rounded-2xl shadow-sm border transition flex items-start gap-3.5 ${
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

          {/* TAB 3: EXPENSES & FUND */}
          {activeTab === 'expenses' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-3 bg-teal-900 text-white p-5 rounded-2xl shadow-md">
                <div>
                  <p className="text-xs text-teal-200">মোট জমা ফান্ড</p>
                  <p className="text-lg md:text-2xl font-bold mt-0.5">৳ {totalDeposit.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-teal-200">মোট খরচ</p>
                  <p className="text-lg md:text-2xl font-bold text-amber-300 mt-0.5">৳ {totalExpense.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-teal-200">অবশিষ্ট ব্যালেন্স</p>
                  <p className="text-lg md:text-2xl font-bold text-emerald-300 mt-0.5">৳ {remainingBalance.toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-base mb-4">নতুন খরচ যোগ করুন</h3>
                <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="খরচের বিবরণ (যেমন: দুপুরের খাবার)"
                    value={newExpense.title}
                    onChange={e => setNewExpense({ ...newExpense, title: e.target.value })}
                    className="px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                  />
                  <select
                    value={newExpense.category}
                    onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}
                    className="px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                  >
                    <option value="খাবার">খাবার ও নাস্তা</option>
                    <option value="পরিবহন">বাস / পরিবহন</option>
                    <option value="হোটেল">হোটেল ও রিসোর্ট</option>
                    <option value="লোকাল ট্রান্সপোর্ট">ছাদখোলা বাস / বোট / অটো</option>
                    <option value="অন্যান্য">অন্যান্য</option>
                  </select>
                  <input
                    type="number"
                    placeholder="টাকার পরিমাণ (৳)"
                    value={newExpense.amount}
                    onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                    className="px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                  />
                  <button
                    type="submit"
                    className="md:col-span-3 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Plus size={18} /> খরচের তালিকায় যোগ করুন
                  </button>
                </form>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-bold text-slate-800">খরচের বিস্তারিত তালিকা</h3>
                  <span className="text-xs bg-teal-50 text-teal-800 font-semibold px-2.5 py-1 rounded-lg border border-teal-200">
                    মাথাপিছু গড় খরচ: ৳ {data.members.length ? Math.round(totalExpense / data.members.length).toLocaleString() : 0}
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {data.expenses.map(exp => (
                    <div key={exp.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <span className="text-[11px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                          {exp.category} • {exp.date}
                        </span>
                        <h4 className="font-semibold text-sm text-slate-800 mt-1">{exp.title}</h4>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-rose-600">৳ {Number(exp.amount).toLocaleString()}</span>
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="text-slate-400 hover:text-rose-600 transition cursor-pointer p-1"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MEMBERS, SEATS & ROOMS */}
          {activeTab === 'members' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-base mb-4">সদস্য, সিট ও রুম বরাদ্দ যুক্ত করুন</h3>
                <form onSubmit={handleAddMember} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="সদস্য বা পরিবারের নাম"
                    value={newMember.name}
                    onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                    className="px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                  />
                  <input
                    type="text"
                    placeholder="মোবাইল নম্বর"
                    value={newMember.phone}
                    onChange={e => setNewMember({ ...newMember, phone: e.target.value })}
                    className="px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                  />
                  <input
                    type="text"
                    placeholder="বাস সিট (যেমন: স্লিপার ২ সিট)"
                    value={newMember.seat}
                    onChange={e => setNewMember({ ...newMember, seat: e.target.value })}
                    className="px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                  />
                  <input
                    type="text"
                    placeholder="হোটেল রুম (যেমন: ডাবল বেড রুম)"
                    value={newMember.room}
                    onChange={e => setNewMember({ ...newMember, room: e.target.value })}
                    className="px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                  />
                  <input
                    type="number"
                    placeholder="জমা দেওয়া ফান্ড/চাঁদা (৳)"
                    value={newMember.deposit}
                    onChange={e => setNewMember({ ...newMember, deposit: e.target.value })}
                    className="px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                  />
                  <button
                    type="submit"
                    className="py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Plus size={18} /> সদস্য যোগ করুন
                  </button>
                </form>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {data.members.map(member => (
                  <div key={member.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between gap-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-800 text-base">{member.name}</h4>
                        <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                          জমা ফান্ড: ৳ {Number(member.deposit).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {member.phone && member.phone !== '01700000000' && (
                          <a
                            href={`tel:${member.phone}`}
                            className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                          >
                            <PhoneCall size={14} /> কল করুন
                          </a>
                        )}
                        <button
                          onClick={() => handleDeleteMember(member.id)}
                          className="text-slate-300 hover:text-rose-500 p-1 transition cursor-pointer"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="bg-slate-50 p-2.5 rounded-xl flex items-center gap-2 border border-slate-100">
                        <Bus size={15} className="text-teal-600 shrink-0" />
                        <div>
                          <span className="text-[10px] text-slate-400 block">বাস সিট</span>
                          <span className="font-semibold text-slate-700">{member.seat}</span>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl flex items-center gap-2 border border-slate-100">
                        <Hotel size={15} className="text-amber-600 shrink-0" />
                        <div>
                          <span className="text-[10px] text-slate-400 block">হোটেল রুম</span>
                          <span className="font-semibold text-slate-700">{member.room}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: CHECKLIST */}
          {activeTab === 'checklist' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
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

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100">
                {data.checklist.map(item => (
                  <div
                    key={item.id}
                    className="p-4 flex items-center justify-between gap-3.5 hover:bg-slate-50 transition"
                  >
                    <div
                      onClick={() => toggleCheck(item.id)}
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

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-1.5 flex justify-around items-center z-40 shadow-lg">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition cursor-pointer ${
                isActive ? 'text-teal-700 font-bold' : 'text-slate-500'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-teal-700' : 'text-slate-400'} />
              <span className="text-[11px] mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Official Day Card Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200"
            onClick={e => e.stopPropagation()}
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

      {/* Server Sync Configuration Modal */}
      {showServerModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <CloudUpload size={20} className="text-teal-700" /> নিজস্ব সার্ভার সিঙ্ক সেটআপ
              </h3>
              <button onClick={() => setShowServerModal(false)} className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer">
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              আপনার সার্ভারের <code className="bg-slate-100 px-1 py-0.5 rounded text-teal-800 font-mono">/api.php</code> লিংকটি নিচে দিন। এটি সেট করলে পরিবারের সবাই একই আপডেটেড হিসাব ও রুটিন দেখতে পাবে।
            </p>
            <form onSubmit={saveServerConfig} className="space-y-3">
              <input
                type="text"
                placeholder="/api.php অথবা https://tour2026.izhaanintellect.fun/api.php"
                value={apiUrl}
                onChange={e => setApiUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-sm rounded-xl transition cursor-pointer"
                >
                  সেভ ও সিঙ্ক করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
