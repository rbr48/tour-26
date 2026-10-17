import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  MapPin, Calendar, Wallet, Users, CheckSquare, PhoneCall,
  Plus, Trash2, CheckCircle2, Circle, RefreshCw, Bus, Hotel,
  Utensils, Navigation, AlertTriangle, Share2, CloudUpload, Server,
  Eye, Image as ImageIcon, Sparkles, Compass, ShieldCheck, Clock,
  LogIn, LogOut, Check, UserCheck, Flame, Megaphone, Terminal,
  Printer, Edit3, Save, X, Waves, ArrowRight, DollarSign, Split,
  SlidersHorizontal, Camera, MessageSquare, User, HardDrive, Menu,
  ExternalLink, Smartphone, Download
} from 'lucide-react';
import {
  auth,
  signInWithGoogle,
  logoutUser,
  subscribeToTourData,
  pushTourDataToFirestore
} from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Custom Advanced Components
import CommandPalette from './components/CommandPalette';
import SplitwiseManager from './components/SplitwiseManager';
import BusSeatMap from './components/BusSeatMap';
import HotelRoomMap from './components/HotelRoomMap';
import TideWeatherWidget from './components/TideWeatherWidget';
import NoticeBoard from './components/NoticeBoard';
import PrintableReport from './components/PrintableReport';
import UserProfileModal from './components/UserProfileModal';
import InstagramFeed from './components/InstagramFeed';
import DiscordDiscussion from './components/DiscordDiscussion';
import NotificationCenter from './components/NotificationCenter';
import FamilySafetyHub from './components/FamilySafetyHub';
import TourQuizModal from './components/TourQuizModal';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Network } from '@capacitor/network';
import { sendPushNotification } from './services/notificationService';
import { sanitizeAndCompressTourData } from './utils/imageCompressor';

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
    driveFolderUrl: 'https://drive.google.com/drive/folders/1G_g7cTkA489hbL9dsF6LU5tdfX3E54vM?usp=sharing',
    photoAlbumUrl: 'https://drive.google.com/drive/folders/1G_g7cTkA489hbL9dsF6LU5tdfX3E54vM?usp=sharing'
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
    { id: 1, name: 'রাজু ভাই (ট্যুর অর্গানাইজার)', phone: '01711000000', seat: 'স্লিপার S1, S2 (২ সিট)', room: 'রুম ৩০১ (সি-সাইড)', deposit: 15000, familyCount: 2 },
    { id: 2, name: 'মাসুদ ভাই (এসবিএল)', phone: '01712000000', seat: 'বিজনেস B1, B2, B3 (৩ সিট)', room: 'রুম ৪০১ (ফ্যামিলি)', deposit: 15000, familyCount: 3 },
    { id: 3, name: 'আশেক মো: আসিফ ভাই', phone: '01713000000', seat: 'স্লিপার S3, S4, S5, S6 (৪ সিট)', room: 'রুম ৫০১ ও ৫০২', deposit: 20000, familyCount: 4 },
    { id: 4, name: 'শশি ভাই (সচিবুল ভাই)', phone: '01714000000', seat: 'বিজনেস B4, B5, B6 (৩ সিট)', room: 'রুম ৬০১ (ফ্যামিলি)', deposit: 15000, familyCount: 3 },
    { id: 5, name: 'নুরুজ্জামান ভাই', phone: '01715000000', seat: 'বিজনেস B7, B8, B9 (৩ সিট)', room: 'রুম ৬০২ (ফ্যামিলি)', deposit: 15000, familyCount: 3 },
    { id: 6, name: 'লতিফ ভাই / খালু (কুড়িগ্রাম)', phone: '01716000000', seat: 'বিজনেস B10, B11 (২ সিট)', room: 'রুম ৩০২ (ফ্রন্ট ভিউ)', deposit: 10000, familyCount: 2 },
    { id: 7, name: 'আলিম ভাই', phone: '01717000000', seat: 'স্লিপার S7, S8 (২ সিট)', room: 'রুম ৫০৩ (ডাবল)', deposit: 10000, familyCount: 2 },
    { id: 8, name: 'সাইফুল ভাই / জামাই', phone: '01718000000', seat: 'স্লিপার S9, S10 (২ সিট)', room: 'রুম ৭০১ (সি-ভিউ)', deposit: 10000, familyCount: 2 },
    { id: 9, name: 'মো: সোহাগ রানা / এম এস রানা (ট্যুর কো-অর্ডিনেটর)', phone: '01737910040', seat: 'বিজনেস B12 (সিঙ্গেল)', room: 'রুম ৭০২ (শেয়ার্ড)', deposit: 10000, familyCount: 1 },
    { id: 10, name: 'আলমগীর ভাই (ফটোগ্রাফার)', phone: '01720000000', seat: 'বিজনেস B13 (সিঙ্গেল)', room: 'রুম ৭০২ (শেয়ার্ড)', deposit: 8000, familyCount: 1 }
  ],
  expenses: [
    { id: 1, title: 'হোটেল সি মুন রুম বুকিং অ্যাডভান্স (১০টি রুম)', category: 'হোটেল', amount: 25000, paidBy: 'ট্যুর ফান্ড', date: '2026-09-04', time: '11:30' },
    { id: 2, title: 'এভারগ্রীন এসি বাস টিকিট (আসা-যাওয়া ২১+ সিট কনফার্ম)', category: 'পরিবহন', amount: 48000, paidBy: 'ট্যুর ফান্ড', date: '2026-09-26', time: '16:00' },
    { id: 3, title: 'বিআরটিসি ছাদখোলা বাস মেরিন ড্রাইভ রিজার্ভেশন', category: 'লোকাল ট্রান্সপোর্ট', amount: 12000, paidBy: 'ট্যুর ফান্ড', date: '2026-10-10', time: '10:15' },
    { id: 4, title: 'মহেশখালী স্পিডবোট ও ট্রলার রিজার্ভ বুকিং', category: 'লোকাল ট্রান্সপোর্ট', amount: 5000, paidBy: 'ট্যুর ফান্ড', date: '2026-10-12', time: '14:20' },
    { id: 5, title: 'সী বীচ বারবিকিউ (BBQ) ও পার্টি স্পেশাল আয়োজন', category: 'খাবার', amount: 8000, paidBy: 'ট্যুর ফান্ড', date: '2026-10-13', time: '19:45' },
    { id: 6, title: 'ট্যুর স্পেশাল উপহার ও জরুরি সামগ্রী স্টক', category: 'অন্যান্য', amount: 3500, paidBy: 'ট্যুর ফান্ড', date: '2026-10-13', time: '18:10' }
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
  ],
  notices: [
    {
      id: 1,
      title: 'যাত্রার দিন কামারপাড়া বাস স্ট্যান্ডে উপস্থিতি',
      content: '১৯ অক্টোবর বিকাল ৫:৩০ টার মধ্যে সবাইকে কামারপাড়া বাস স্ট্যান্ডে উপস্থিত হতে অনুরোধ করা হচ্ছে। বাস ঠিক সন্ধ্যা ৬:১৫ টায় ছাড়বে।',
      author: 'রাজু ভাই',
      date: '১৬ অক্টোবর',
      urgent: true
    },
    {
      id: 2,
      title: 'হোটেল চেক-ইন ও মূল NID কার্ড প্রদর্শন',
      content: 'হোটেল সি মুনে চেক-ইনের জন্য পরিবারের সকল প্রাপ্তবয়স্ক সদস্য ও ভাবীদের মূল NID কার্ড সাথে রাখুন।',
      author: 'রাজু ভাই',
      date: '১৬ অক্টোবর',
      urgent: false
    }
  ],
  meetingPoint: {
    title: 'হোটেল সি মুন লবি (কলাতলী মোড়)',
    note: 'যেকোনো আউটডোর স্পটে যাওয়া ও ফেরার সময় সবাই হোটেল লবিতে সমবেত হবেন।',
    mapUrl: 'https://maps.google.com/?q=Hotel+Sea+Moon+Kolatoli+Coxs+Bazar'
  },
  posts: [
    {
      id: 1,
      author: 'আলমগীর ভাই (ফটোগ্রাফার)',
      authorPhoto: null,
      caption: 'কক্সবাজার সমুদ্র সৈকতের গোধূলিলগ্নে সূর্যাস্তের অসাধারণ দৃশ্য! সবাই প্রস্তুত তো? 🌅📸',
      image: '/plans/day2.jpeg',
      location: 'সুগন্ধা বিচ, কক্সবাজার',
      likes: ['রাজু ভাই', 'মাসুদ ভাই', 'আসিফ ভাই'],
      comments: [
        { id: 1, user: 'রাজু ভাই', text: 'অসাধারণ ক্লিক! বারবিকিউ এর আগে সবাই চলে আসব।' }
      ],
      driveBackedUp: true,
      createdAt: '১৬ অক্টো, ১৯:৩০'
    },
    {
      id: 2,
      author: 'রাজু ভাই (ট্যুর অর্গানাইজার)',
      authorPhoto: null,
      caption: 'এভারগ্রীন এসি বাসের সব টিকেট এবং সিট ফাইনাল কনফার্ম করা হয়েছে। ১৯ অক্টোবর সন্ধ্যা কামারপাড়া দেখা হচ্ছে! 🚌✨',
      image: '/plans/day1.jpeg',
      location: 'কামারপাড়া বাস স্ট্যান্ড',
      likes: ['মাসুদ ভাই', 'শশি ভাই', 'নুরুজ্জামান ভাই'],
      comments: [
        { id: 1, user: 'মাসুদ ভাই', text: 'ইনশাআল্লাহ, দারুণ একটা ট্যুর হবে!' }
      ],
      driveBackedUp: true,
      createdAt: '১৬ অক্টো, ১৪:১৫'
    }
  ],
  discussions: {
    'general': [
      { id: 1, author: 'রাজু ভাই', authorRole: 'ট্যুর লিডার', authorEmoji: '👑', text: 'আসসালামু আলাইকুম সবাইকে! ট্যুরের আর মাত্র ২ দিন বাকি। সবাই প্রয়োজনীয় প্রস্তুতি সম্পন্ন করুন।', time: '০৬:৩০ PM', reactions: { '👍': 4, '❤️': 3 } },
      { id: 2, author: 'মাসুদ ভাই', authorRole: 'সদস্য', authorEmoji: '👨‍👩‍👦', text: 'ওয়ালাইকুম আসসালাম। বাসের জন্য শীতের চাদর ও ফার্স্ট এইড রেডি করেছি।', time: '০৬:৪৫ PM', reactions: { '👍': 2 } }
    ],
    'plans': [
      { id: 1, author: 'আশেক মো: আসিফ ভাই', authorRole: 'সদস্য', authorEmoji: '🕶️', text: '২১ অক্টোবর বুধবার বিআরটিসি ছাদখোলা বাসে মেরিন ড্রাইভ দিয়ে যাওয়ার সময় সাবরাং জিরো পয়েন্টে কতক্ষণ থাকব?', time: '০৮:০০ PM', reactions: { '🚌': 3 } },
      { id: 2, author: 'রাজু ভাই', authorRole: 'ট্যুর লিডার', authorEmoji: '👑', text: 'সেখানে ১ থেকে দেড় ঘণ্টার মত সময় কাটাব এবং দুপুরের লাঞ্চ সেরে নেব।', time: '০৮:১৫ PM', reactions: { '🔥': 2 } }
    ],
    'food': [
      { id: 1, author: 'আলমগীর ভাই', authorRole: 'ফটোগ্রাফার', authorEmoji: '📸', text: 'কক্সবাজার পৌছে প্রথম দিন দুপুরের খাবারের জন্য হোটেল সি মুনের কাছে কোন রেস্টুরেন্ট ভালো হবে?', time: '১০:০০ AM', reactions: { '🍤': 3 } },
      { id: 2, author: 'নুরুজ্জামান ভাই', authorRole: 'সদস্য', authorEmoji: '👨‍👩‍👦', text: 'ঝাউবন বা পৌশী রেস্টুরেন্টে তাজা রূপচাঁদা ও সামুদ্রিক মাছের ভর্তা খুব ভালো পাওয়া যায়!', time: '১০:১০ AM', reactions: { '🔥': 2 } }
    ],
    'emergency': [
      { id: 1, author: 'রাজু ভাই', authorRole: 'ট্যুর লিডার', authorEmoji: '👑', text: 'জরুরি প্রয়োজনে ট্যুরিস্ট পুলিশের কন্ট্রোল রুম: ০১৩২০-২২২২২২ এবং হটলাইন: ০১৩২০-১৬০০০১। সবাই সেভ করে রাখুন।', time: '০৯:০০ AM', reactions: { '🚨': 5 } }
    ]
  },
  userProfiles: {}
};

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

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    // 1. Check URL hash first (e.g. #expenses, #feed, #discussions, etc.)
    const hash = window.location.hash.replace('#', '').trim();
    const VALID_TABS = ['dashboard', 'itinerary', 'expenses', 'seats_rooms', 'feed', 'discussions', 'notices', 'checklist'];
    if (hash && VALID_TABS.includes(hash)) {
      return hash;
    }
    // 2. Check localStorage
    try {
      const saved = localStorage.getItem('tour_active_tab');
      if (saved && VALID_TABS.includes(saved)) {
        return saved;
      }
    } catch {}
    return 'dashboard';
  });

  const [seatRoomSubTab, setSeatRoomSubTab] = useState(() => {
    try {
      return localStorage.getItem('tour_seat_room_subtab') || 'bus';
    } catch {
      return 'bus';
    }
  });

  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem('rangpur_coxs_tour_data');
      return saved ? JSON.parse(saved) : INITIAL_DATA;
    } catch {
      return INITIAL_DATA;
    }
  });

  // Mobile Drawer State
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Firebase Auth State
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Server & Firestore Sync State
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem('tour_api_url') || '/api.php');
  const [syncStatus, setSyncStatus] = useState('সংযোগ করা হচ্ছে...');
  const [lastSyncedTime, setLastSyncedTime] = useState(null);
  const [showServerModal, setShowServerModal] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Advanced Feature Modals & Navigation Sub-states
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [showPrintReport, setShowPrintReport] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  // Feature Modals
  const [showSafetyHubModal, setShowSafetyHubModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);

  // Activity Feed & Push Notification State
  const [activities, setActivities] = useState(() => {
    try {
      const saved = localStorage.getItem('tour_recent_activities');
      return saved ? JSON.parse(saved) : [
        { id: 1, type: 'notice', title: 'ট্যুর যাত্রা নিশ্চিত', body: '১৯ অক্টোবর সন্ধ্যা ৬টায় কামারপাড়া থেকে বাস ছাড়বে।', tab: 'notices', time: 'আজ' },
        { id: 2, type: 'feed', title: 'ইনস্টাফিড সক্রিয়', body: 'ট্যুরের আনন্দঘন ছবি শেয়ার করতে ইনস্টাফিড প্রস্তুত!', tab: 'feed', time: 'আজ' }
      ];
    } catch {
      return [];
    }
  });
  const [activeToast, setActiveToast] = useState(null);
  const prevDataRef = useRef(null);

  const addActivity = useCallback((activity) => {
    setActivities(prev => {
      const updated = [activity, ...prev.slice(0, 24)];
      try {
        localStorage.setItem('tour_recent_activities', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setActiveToast(activity);
    setTimeout(() => {
      setActiveToast(cur => cur?.id === activity.id ? null : cur);
    }, 5500);
  }, []);

  // Sync activeTab with URL hash and localStorage (prevents resetting on refresh)
  useEffect(() => {
    try {
      localStorage.setItem('tour_active_tab', activeTab);
      if (window.location.hash !== `#${activeTab}`) {
        window.history.replaceState(null, '', `#${activeTab}`);
      }
    } catch {}
  }, [activeTab]);

  // Sync seatRoomSubTab with localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tour_seat_room_subtab', seatRoomSubTab);
    } catch {}
  }, [seatRoomSubTab]);

  // Listen for browser back/forward or hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').trim();
      const VALID_TABS = ['dashboard', 'itinerary', 'expenses', 'seats_rooms', 'feed', 'discussions', 'notices', 'checklist'];
      if (hash && VALID_TABS.includes(hash)) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Native Android Platform Lifecycle: Status Bar, Splash Screen, & Network Listener
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // 1. Configure Native Status Bar
      try {
        StatusBar.setStyle({ style: Style.Dark });
        StatusBar.setBackgroundColor({ color: '#134e4a' });
      } catch (err) {
        console.warn('StatusBar configuration skipped:', err);
      }

      // 2. Hide Splash Screen smoothly once React mounts
      setTimeout(() => {
        try {
          SplashScreen.hide({ fadeOutDuration: 350 });
        } catch {}
      }, 300);

      // 3. Listen to Network state changes
      try {
        Network.addListener('networkStatusChange', (status) => {
          if (!status.connected) {
            setSyncStatus('ইন্টারনেট অফলাইন (লোকাল মোড)');
          } else {
            setSyncStatus('ইন্টারনেট সংযুক্ত');
          }
        });
      } catch {}
    }
  }, []);

  // Native Android Hardware Back Button: Modals -> Drawer -> Dashboard -> Exit
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const backListenerPromise = CapApp.addListener('backButton', () => {
      if (previewImage) {
        setPreviewImage(null);
        return;
      }
      if (showSafetyHubModal) {
        setShowSafetyHubModal(false);
        return;
      }
      if (showQuizModal) {
        setShowQuizModal(false);
        return;
      }
      if (showProfileModal) {
        setShowProfileModal(false);
        return;
      }
      if (showPrintReport) {
        setShowPrintReport(false);
        return;
      }
      if (showServerModal) {
        setShowServerModal(false);
        return;
      }
      if (isCommandOpen) {
        setIsCommandOpen(false);
        return;
      }
      if (isMobileSidebarOpen) {
        setIsMobileSidebarOpen(false);
        return;
      }
      if (activeTab !== 'dashboard') {
        setActiveTab('dashboard');
        return;
      }
      CapApp.exitApp();
    });

    return () => {
      backListenerPromise.then(handler => handler.remove()).catch(() => {});
    };
  }, [
    previewImage,
    showSafetyHubModal,
    showQuizModal,
    showProfileModal,
    showPrintReport,
    showServerModal,
    isCommandOpen,
    isMobileSidebarOpen,
    activeTab
  ]);

  // Haptic Feedback Tab Navigation
  const handleSelectTab = (tabId) => {
    if (Capacitor.isNativePlatform()) {
      try {
        Haptics.impact({ style: ImpactStyle.Light });
      } catch {}
    }
    setActiveTab(tabId);
  };

  // Form States
  const [newMember, setNewMember] = useState({ name: '', phone: '', seat: '', room: '', deposit: '', familyCount: 1 });
  const [newPlan, setNewPlan] = useState({ day: '', title: '', time: '', location: '', notes: '' });
  const [newCheckItem, setNewCheckItem] = useState('');

  // 1. Listen for Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setIsAuthLoading(false);
        setSyncStatus('ফায়ারবেস ক্লাউড সক্রিয়');
      } else {
        const savedGuest = localStorage.getItem('tour_guest_user');
        if (savedGuest) {
          try {
            setCurrentUser(JSON.parse(savedGuest));
            setSyncStatus('সদস্য মোড সক্রিয়');
          } catch {
            setCurrentUser(null);
            setSyncStatus('অফলাইন / স্থানীয় মোড');
          }
        } else {
          setCurrentUser(null);
          setSyncStatus('অফলাইন / স্থানীয় মোড');
        }
        setIsAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Realtime sync with Cloud Firestore & Push Notification Diffing
  useEffect(() => {
    if (!currentUser) return;

    setSyncStatus('ফায়ারবেস সিঙ্ক হচ্ছে...');
    const unsubscribe = subscribeToTourData(
      (remoteData) => {
        if (remoteData && remoteData.tourInfo) {
          // Detect remote activity updates from other users!
          const prev = prevDataRef.current;
          if (prev) {
            // A. New Notice detected
            if ((remoteData.notices?.length || 0) > (prev.notices?.length || 0)) {
              const latestNotice = remoteData.notices[0];
              sendPushNotification({
                title: '📢 নতুন জরুরি নোটিশ',
                body: latestNotice?.title || 'ট্যুরের নতুন আপডেট ও নোটিশ এসেছে',
                onClick: () => setActiveTab('notices')
              });
              addActivity({
                id: Date.now(),
                type: 'notice',
                title: '📢 নতুন জরুরি নোটিশ',
                body: latestNotice?.title || 'নতুন আপডেট প্রকাশিত হয়েছে',
                tab: 'notices',
                time: 'এইমাত্র'
              });
            }

            // B. New Photo Post detected
            if ((remoteData.posts?.length || 0) > (prev.posts?.length || 0)) {
              const latestPost = remoteData.posts[0];
              if (latestPost && latestPost.authorEmail !== currentUser?.email) {
                sendPushNotification({
                  title: `📸 ${latestPost.author} নতুন ছবি শেয়ার করেছেন`,
                  body: latestPost.caption || 'ইনস্টাফিডে নতুন ছবি যুক্ত হয়েছে',
                  onClick: () => setActiveTab('feed')
                });
                addActivity({
                  id: Date.now(),
                  type: 'feed',
                  title: `📸 ${latestPost.author} নতুন ছবি দিয়েছেন`,
                  body: latestPost.caption || 'ইনস্টাফিডে নতুন ছবি শেয়ার হয়েছে',
                  tab: 'feed',
                  time: 'এইমাত্র'
                });
              }
            }

            // C. New Expense detected
            if ((remoteData.expenses?.length || 0) > (prev.expenses?.length || 0)) {
              const latestExp = remoteData.expenses[0] || remoteData.expenses[remoteData.expenses.length - 1];
              sendPushNotification({
                title: '💸 নতুন খরচ যুক্ত হয়েছে',
                body: `${latestExp?.title}: ৳${Number(latestExp?.amount || 0).toLocaleString()}`,
                onClick: () => setActiveTab('expenses')
              });
              addActivity({
                id: Date.now(),
                type: 'expense',
                title: '💸 নতুন খরচ অন্তর্ভুক্ত হয়েছে',
                body: `${latestExp?.title} • ৳${Number(latestExp?.amount || 0).toLocaleString()}`,
                tab: 'expenses',
                time: 'এইমাত্র'
              });
            }

            // D. New Discussion Message detected
            const countDiscussions = (disc) => Object.values(disc || {}).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
            if (countDiscussions(remoteData.discussions) > countDiscussions(prev.discussions)) {
              let latestMsg = null;
              let chTitle = 'আলোচনা';
              const chLabels = { general: 'সাধারণ আড্ডা', food: 'খাবার মেনু', sightseeing: 'দর্শনীয় স্থান', emergency: 'জরুরি সাহায্য' };
              Object.entries(remoteData.discussions || {}).forEach(([chId, msgs]) => {
                const prevCount = prev.discussions?.[chId]?.length || 0;
                if ((msgs?.length || 0) > prevCount) {
                  latestMsg = msgs[msgs.length - 1];
                  chTitle = chLabels[chId] || chId;
                }
              });

              if (latestMsg && latestMsg.senderEmail !== currentUser?.email) {
                sendPushNotification({
                  title: `💬 ${latestMsg.senderName || 'সদস্য'} (${chTitle})`,
                  body: latestMsg.text || 'নতুন আলোচনা বার্তা পাঠিয়েছেন',
                  onClick: () => setActiveTab('discussions')
                });
                addActivity({
                  id: Date.now(),
                  type: 'discussion',
                  title: `💬 ${latestMsg.senderName || 'সদস্য'}: #${chTitle}`,
                  body: latestMsg.text || 'নতুন বার্তা',
                  tab: 'discussions',
                  time: 'এইমাত্র'
                });
              }
            }

            // E. New Deposit or Member balance updated
            const prevTotalDep = (prev.members || []).reduce((s, m) => s + Number(m.deposit || 0), 0);
            const newTotalDep = (remoteData.members || []).reduce((s, m) => s + Number(m.deposit || 0), 0);
            if (newTotalDep > prevTotalDep) {
              const diff = newTotalDep - prevTotalDep;
              sendPushNotification({
                title: '💰 নতুন জমা যুক্ত হয়েছে',
                body: `ফান্ডে ৳${diff.toLocaleString()} জমা হয়েছে (মোট: ৳${newTotalDep.toLocaleString()})`,
                onClick: () => setActiveTab('expenses')
              });
              addActivity({
                id: Date.now(),
                type: 'deposit',
                title: '💰 নতুন জমা আপডেট',
                body: `+৳${diff.toLocaleString()} যুক্ত হয়েছে (মোট: ৳${newTotalDep.toLocaleString()})`,
                tab: 'expenses',
                time: 'এইমাত্র'
              });
            }
          }

          prevDataRef.current = remoteData;
          setData(remoteData);
          setSyncStatus('ফায়ারবেস লাইভ সিঙ্ক');
          setLastSyncedTime(new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }));
        } else if (remoteData === null) {
          pushTourDataToFirestore(data, currentUser)
            .then(() => {
              setSyncStatus('ফায়ারবেস ইনিশিয়ালাইজড');
              setLastSyncedTime(new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }));
            })
            .catch(err => console.error('Initial Firestore seeding failed:', err));
        }
      },
      (err) => {
        console.warn('Firestore subscription status:', err.message);
        setSyncStatus('ফায়ারবেস কানেকশন ত্রুটি');
      }
    );

    return () => unsubscribe();
  }, [currentUser, addActivity]);

  // 3. Fallback VPS API fetch on mount if not signed in or for initial load
  const fetchFromServer = useCallback(async (urlToFetch = apiUrl) => {
    if (!urlToFetch) return;
    try {
      setSyncStatus('সার্ভার সিঙ্ক হচ্ছে...');
      const res = await fetch(urlToFetch);
      if (res.ok) {
        const remoteData = await res.json();
        if (remoteData && remoteData.tourInfo) {
          setData(remoteData);
          setSyncStatus('সার্ভার আপডেটেড');
          setLastSyncedTime(new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }));
        }
      } else {
        setSyncStatus('লোকাল মোড');
      }
    } catch {
      setSyncStatus('লোকাল মোড');
    }
  }, [apiUrl]);

  useEffect(() => {
    if (!currentUser && apiUrl) {
      fetchFromServer(apiUrl);
    }
  }, [currentUser, apiUrl, fetchFromServer]);

  // 4. Save to localStorage whenever data changes
  useEffect(() => {
    try {
      localStorage.setItem('rangpur_coxs_tour_data', JSON.stringify(data));
    } catch (e) {
      console.error('LocalStorage save error:', e);
    }
  }, [data]);

  // 5. Unified Push: Firestore (Primary) + Custom Server (Secondary backup)
  const pushToServer = async (updatedData) => {
    let toPush = updatedData;
    try {
      toPush = await sanitizeAndCompressTourData(updatedData);
    } catch {}
    setData(toPush);

    if (currentUser) {
      try {
        setSyncStatus('ফায়ারবেসে সেভ হচ্ছে...');
        await pushTourDataToFirestore(toPush, currentUser);
        setSyncStatus('ফায়ারবেস লাইভ সিঙ্ক');
        setLastSyncedTime(new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }));
      } catch (fbErr) {
        console.error('Firestore save error:', fbErr);
        setSyncStatus('ফায়ারবেস সেভ ব্যর্থ');
      }
    }

    if (apiUrl) {
      try {
        await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedData)
        });
      } catch {
        // silent fallback
      }
    }
  };

  // Profile Lookup
  const currentProfileKey = currentUser?.email || currentUser?.uid || 'default';
  const currentProfile = data.userProfiles?.[currentProfileKey] || {};

  // Auth Action Handlers
  const handleGoogleSignIn = async () => {
    try {
      setAuthError(null);
      setSyncStatus('গুগলে লগইন হচ্ছে...');
      localStorage.removeItem('tour_guest_user');
      const user = await signInWithGoogle();
      if (user) {
        setActiveTab('dashboard');
        setShowServerModal(false);
        setSyncStatus('ফায়ারবেস ক্লাউড সক্রিয়');
      }
    } catch (err) {
      console.error('Google Sign-in failed:', err);
      let msg = 'গুগল সাইন-ইন সম্পন্ন হয়নি।';
      if (err.code === 'auth/unauthorized-domain') {
        msg = 'ডোমেইনটি ফায়ারবেসে অনুমোদিত নয়। নিচের সদস্য তালিকা থেকে সরাসরি প্রবেশ করুন।';
      } else if (err.code === 'auth/popup-closed-by-user') {
        msg = 'সাইন-ইন উইন্ডো বন্ধ করা হয়েছে।';
      } else if (err.message) {
        msg += ` (${err.message})`;
      }
      setAuthError(msg);
      setSyncStatus('সাইন-ইন ব্যর্থ');
    }
  };

  const handleMemberQuickLogin = (selectedMember) => {
    if (!selectedMember) return;
    const guestUser = {
      uid: 'member_' + (selectedMember.id || Date.now()),
      email: selectedMember.phone ? `${selectedMember.phone}@tour2026.app` : `member_${selectedMember.id}@tour2026.app`,
      displayName: selectedMember.name,
      photoURL: null,
      isAnonymous: true
    };
    try {
      localStorage.setItem('tour_guest_user', JSON.stringify(guestUser));
    } catch {}
    setCurrentUser(guestUser);
    setActiveTab('dashboard');
    setShowServerModal(false);
    setSyncStatus('সদস্য মোড সক্রিয়');
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('tour_guest_user');
      await logoutUser();
      setCurrentUser(null);
      setSyncStatus('লগআউট সম্পন্ন');
    } catch (err) {
      console.error('Logout error:', err);
      localStorage.removeItem('tour_guest_user');
      setCurrentUser(null);
    }
  };

  // Financial Calculations
  const totalDeposit = (data.members || []).reduce((sum, m) => sum + Number(m.deposit || 0), 0);
  const totalExpense = (data.expenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const remainingBalance = totalDeposit - totalExpense;
  const completedChecklist = (data.checklist || []).filter(c => c.checked).length;

  // Profile Update Handler
  const handleSaveProfile = (newProf) => {
    const key = currentUser?.email || currentUser?.uid || 'default';
    const updatedProfiles = {
      ...(data.userProfiles || {}),
      [key]: newProf
    };

    const updatedMembers = (data.members || []).map(m => {
      if (
        m.name?.toLowerCase().includes((newProf.displayName || '').toLowerCase()) ||
        (newProf.phone && m.phone === newProf.phone)
      ) {
        return {
          ...m,
          name: newProf.displayName || m.name,
          phone: newProf.phone || m.phone,
          seat: newProf.seat || m.seat,
          room: newProf.room || m.room
        };
      }
      return m;
    });

    const updated = {
      ...data,
      userProfiles: updatedProfiles,
      members: updatedMembers
    };
    pushToServer(updated);
  };

  // Media Feed Handlers
  const handleAddPost = (post) => {
    const updated = {
      ...data,
      posts: [post, ...(data.posts || [])]
    };
    pushToServer(updated);
    addActivity({
      id: Date.now(),
      type: 'feed',
      title: '📸 আপনি নতুন ছবি শেয়ার করেছেন',
      body: post.caption || 'ইনস্টাফিডে ফটো পোস্ট হয়েছে',
      tab: 'feed',
      time: 'এইমাত্র'
    });
    sendPushNotification({
      title: '📸 ছবি সফলভাবে শেয়ার হয়েছে',
      body: post.caption || 'ইনস্টাফিডে আপনার পোস্ট লাইভ হয়েছে',
      onClick: () => setActiveTab('feed')
    });
  };

  const handleLikePost = (postId, userName) => {
    const updated = {
      ...data,
      posts: (data.posts || []).map(p => {
        if (p.id === postId) {
          const likes = p.likes || [];
          const alreadyLiked = likes.includes(userName);
          const newLikes = alreadyLiked ? likes.filter(u => u !== userName) : [...likes, userName];
          return { ...p, likes: newLikes };
        }
        return p;
      })
    };
    pushToServer(updated);
  };

  const handleAddComment = (postId, comment) => {
    const updated = {
      ...data,
      posts: (data.posts || []).map(p => {
        if (p.id === postId) {
          return { ...p, comments: [...(p.comments || []), comment] };
        }
        return p;
      })
    };
    pushToServer(updated);
  };

  const handleDeletePost = (postId) => {
    const updated = {
      ...data,
      posts: (data.posts || []).filter(p => p.id !== postId)
    };
    pushToServer(updated);
  };

  const handleUpdatePost = (updatedPost) => {
    if (!updatedPost || !updatedPost.id) return;
    const updated = {
      ...data,
      posts: (data.posts || []).map(p => p.id === updatedPost.id ? { ...p, ...updatedPost } : p)
    };
    pushToServer(updated);
  };

  // Discussion Handlers
  const handleSendMessage = (channelId, message) => {
    const updated = {
      ...data,
      discussions: {
        ...(data.discussions || {}),
        [channelId]: [...(data.discussions?.[channelId] || []), message]
      }
    };
    pushToServer(updated);
    addActivity({
      id: Date.now(),
      type: 'discussion',
      title: '💬 আলোচনা বার্তা পাঠানো হয়েছে',
      body: message.text || 'চ্যানেলে বার্তা পোস্ট হয়েছে',
      tab: 'discussions',
      time: 'এইমাত্র'
    });
  };

  const handleAddReaction = (channelId, messageId, emoji) => {
    const updated = {
      ...data,
      discussions: {
        ...(data.discussions || {}),
        [channelId]: (data.discussions?.[channelId] || []).map(msg => {
          if (msg.id === messageId) {
            const reactions = { ...(msg.reactions || {}) };
            reactions[emoji] = (reactions[emoji] || 0) + 1;
            return { ...msg, reactions };
          }
          return msg;
        })
      }
    };
    pushToServer(updated);
  };

  // Itinerary Handlers
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

  // Expense Handlers
  const handleAddExpense = (expData) => {
    if (!expData.title || !expData.amount) return;
    const newEntry = {
      id: Date.now(),
      title: expData.title,
      category: expData.category || 'খাবার',
      amount: Number(expData.amount),
      paidBy: expData.paidBy || 'ট্যুর ফান্ড',
      date: expData.date || new Date().toISOString().slice(0, 10),
      time: expData.time || new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    };
    const updated = {
      ...data,
      expenses: [newEntry, ...(data.expenses || [])]
    };
    pushToServer(updated);
    addActivity({
      id: Date.now(),
      type: 'expense',
      title: '💸 নতুন খরচ যুক্ত হয়েছে',
      body: `${expData.title} • ৳${Number(expData.amount || 0).toLocaleString()}`,
      tab: 'expenses',
      time: 'এইমাত্র'
    });
    sendPushNotification({
      title: '💸 নতুন খরচ অন্তর্ভুক্ত হয়েছে',
      body: `${expData.title}: ৳${Number(expData.amount || 0).toLocaleString()}`,
      onClick: () => setActiveTab('expenses')
    });
  };

  const handleDeleteExpense = (id) => {
    const updated = {
      ...data,
      expenses: (data.expenses || []).filter(e => e.id !== id)
    };
    pushToServer(updated);
  };

  // Member & Deposit Handlers
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
          phone: newMember.phone || '01700000000',
          seat: newMember.seat || 'নির্ধারিত নয়',
          room: newMember.room || 'নির্ধারিত নয়',
          deposit: Number(newMember.deposit || 0),
          familyCount: Number(newMember.familyCount || 1)
        }
      ]
    };
    pushToServer(updated);
    setNewMember({ name: '', phone: '', seat: '', room: '', deposit: '', familyCount: 1 });
  };

  const handleUpdateMember = (updatedMember) => {
    if (!updatedMember || !updatedMember.id) return;
    const updated = {
      ...data,
      members: data.members.map(m => m.id === updatedMember.id ? {
        ...m,
        ...updatedMember,
        deposit: Number(updatedMember.deposit || 0),
        familyCount: Number(updatedMember.familyCount || 1)
      } : m)
    };
    pushToServer(updated);
    setEditingMember(null);
    addActivity({
      id: Date.now(),
      type: 'deposit',
      title: '👤 সদস্য তথ্য ও জমা আপডেট',
      body: `${updatedMember.name} • জমা: ৳${Number(updatedMember.deposit || 0).toLocaleString()}`,
      tab: 'expenses',
      time: 'এইমাত্র'
    });
    sendPushNotification({
      title: '✅ সদস্য তথ্য ও জমা সংরক্ষিত',
      body: `${updatedMember.name}: জমা ৳${Number(updatedMember.deposit || 0).toLocaleString()}`,
      onClick: () => setActiveTab('expenses')
    });
  };

  const handleDeleteMember = (id) => {
    const updated = {
      ...data,
      members: data.members.filter(m => m.id !== id)
    };
    pushToServer(updated);
  };

  // Superpower Handlers
  const handleShareLocation = (loc) => {
    const updated = {
      ...data,
      familyLocations: {
        ...(data.familyLocations || {}),
        [loc.uid]: loc
      }
    };
    pushToServer(updated);
    addActivity({
      id: Date.now(),
      type: 'location',
      title: `📍 ${loc.name} অবস্থান শেয়ার করেছেন`,
      body: loc.note || 'সৈকত এলাকায় লাইভ অবস্থান আপডেট হয়েছে',
      tab: 'dashboard',
      time: 'এইমাত্র'
    });
    sendPushNotification({
      title: `📍 ${loc.name} এর নতুন অবস্থান`,
      body: loc.note || 'কক্সবাজার সমুদ্র সৈকত এলাকায় অবস্থান শেয়ার করেছেন',
      onClick: () => setActiveTab('dashboard')
    });
  };

  // Notice Handlers
  const handleAddNotice = (notice) => {
    const updated = {
      ...data,
      notices: [notice, ...(data.notices || [])]
    };
    pushToServer(updated);
    addActivity({
      id: Date.now(),
      type: 'notice',
      title: '📢 জরুরি নোটিশ জারি হয়েছে',
      body: notice.title || 'নোটিশ বোর্ডে পোস্ট হয়েছে',
      tab: 'notices',
      time: 'এইমাত্র'
    });
    sendPushNotification({
      title: '📢 জরুরি নোটিশ জারি হয়েছে',
      body: notice.title || 'সকল ট্যুর সদস্যের জন্য নতুন নোটিশ',
      onClick: () => setActiveTab('notices')
    });
  };

  const handleDeleteNotice = (id) => {
    const updated = {
      ...data,
      notices: (data.notices || []).filter(n => n.id !== id)
    };
    pushToServer(updated);
  };

  const handleUpdateMeetingPoint = (meetingPoint) => {
    const updated = {
      ...data,
      meetingPoint
    };
    pushToServer(updated);
  };

  // Checklist Handlers
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

  // EXACTLY 5 PRIMARY TABS FOR MOBILE BOTTOM NAVIGATION
  const primaryBottomNavItems = [
    { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: Navigation },
    { id: 'itinerary', label: 'সূচি', icon: Calendar },
    { id: 'feed', label: 'ইনস্টাফিড', icon: Camera },
    { id: 'discussions', label: 'চ্যাট', icon: MessageSquare },
    { id: 'expenses', label: 'হিসাব', icon: Wallet }
  ];

  // ALL 8 TABS FOR SIDEBARS (Desktop & Mobile Drawer)
  const allNavItems = [
    { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: Navigation, desc: 'ওভারভিউ ও আবহাওয়া' },
    { id: 'itinerary', label: 'ভ্রমণ সূচি', icon: Calendar, desc: '৫ দিনের রুটিন ও চার্ট' },
    { id: 'feed', label: 'ইনস্টাফিড 📸', icon: Camera, desc: 'ফটো শেয়ার ও গ্যালারি' },
    { id: 'discussions', label: 'ডিসকর্ড চ্যাট 💬', icon: MessageSquare, desc: '৪টি ফ্যামিলি চ্যানেল' },
    { id: 'expenses', label: 'হিসাব ও স্প্লিট', icon: Wallet, desc: 'খরচ ও সেটেলমেন্ট' },
    { id: 'seats_rooms', label: 'সিট ও রুম প্ল্যান', icon: Bus, desc: 'বাস ও হোটেল ম্যাপ' },
    { id: 'notices', label: 'নোটিশ ও মিটিং', icon: Megaphone, desc: 'জরুরি বার্তা ও ম্যাপ' },
    { id: 'checklist', label: 'চেকলিস্ট', icon: CheckSquare, desc: 'প্যাকিং ও ডকুমেন্টস' }
  ];

  // 1. Loading State Screen
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-950 via-teal-900 to-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="relative mb-6">
          <img
            src="/logo.png"
            alt="App Logo"
            className="w-24 h-24 rounded-3xl object-cover ring-4 ring-amber-400 shadow-2xl animate-pulse"
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
                className="w-20 h-20 rounded-2xl object-cover ring-4 ring-amber-400 shadow-lg mx-auto"
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

            {/* Quick Member Access / Instant Entry */}
            <div className="pt-2">
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[11px] text-slate-500 font-bold uppercase tracking-wider">অথবা সরাসরি ড্যাশবোর্ডে প্রবেশ</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <div className="space-y-3 mt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    সদস্য তালিকা থেকে আপনার নাম নির্বাচন করুন:
                  </label>
                  <select
                    id="quick-member-select"
                    className="w-full text-xs sm:text-sm bg-slate-50 border-2 border-slate-200 hover:border-teal-500 rounded-xl px-3.5 py-3 text-slate-800 font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none transition"
                    defaultValue={data.members?.[8]?.name || data.members?.[0]?.name || ''}
                  >
                    {(data.members || []).map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name} {m.phone ? `(${m.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => {
                    const sel = document.getElementById('quick-member-select');
                    const selectedName = sel?.value;
                    const matchedMember = (data.members || []).find(m => m.name === selectedName) || data.members?.[0];
                    handleMemberQuickLogin(matchedMember);
                  }}
                  className="w-full py-3.5 px-4 bg-teal-800 hover:bg-teal-900 active:bg-teal-950 text-amber-300 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg"
                >
                  <UserCheck size={18} />
                  <span>পরিবারের সদস্য হিসেবে সরাসরি প্রবেশ করুন</span>
                </button>

                <p className="text-[11px] text-slate-500 text-center font-medium">
                  💡 গুগল সাইন-ইন ছাড়াও পরিবারের যে-কোনো সদস্য হিসেবে সরাসরি ড্যাশবোর্ড ব্যবহার করতে পারবেন
                </p>
              </div>
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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row font-sans">
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
              href="/Tour2026-v2.apk"
              download="Tour2026-v2.apk"
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
              onClick={() => setShowProfileModal(true)}
              className="bg-teal-950/80 hover:bg-teal-950 p-3 rounded-2xl border border-teal-700/60 space-y-2 cursor-pointer transition group"
            >
              <div className="flex items-center gap-2.5">
                {currentProfile.customPhotoURL || currentUser.photoURL ? (
                  <img
                    src={currentProfile.customPhotoURL || currentUser.photoURL}
                    alt={currentProfile.displayName || currentUser.displayName || 'User'}
                    className="w-8 h-8 rounded-full ring-2 ring-amber-400 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-teal-800 flex items-center justify-center font-bold text-base text-amber-300 ring-2 ring-amber-400">
                    {currentProfile.avatarEmoji || '👑'}
                  </div>
                )}
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
            onClick={() => setIsMobileSidebarOpen(false)}
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
                    className="w-10 h-10 rounded-2xl object-cover ring-2 ring-amber-400 shadow-md"
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
                  onClick={() => {
                    setIsMobileSidebarOpen(false);
                    setShowProfileModal(true);
                  }}
                  className="p-3 bg-gradient-to-r from-teal-900 to-teal-800 rounded-2xl border border-teal-700/80 flex items-center justify-between cursor-pointer hover:border-amber-400 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {currentProfile.customPhotoURL || currentUser.photoURL ? (
                      <img
                        src={currentProfile.customPhotoURL || currentUser.photoURL}
                        alt="Profile"
                        className="w-9 h-9 rounded-full object-cover ring-2 ring-amber-400"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-teal-950 flex items-center justify-center text-lg font-bold ring-2 ring-amber-400">
                        {currentProfile.avatarEmoji || '👑'}
                      </div>
                    )}
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
                  href="/Tour2026-v2.apk"
                  download="Tour2026-v2.apk"
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
              <div className="flex items-center justify-between text-[11px] text-teal-300 px-1">
                <span className="flex items-center gap-1 text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {syncStatus}
                </span>
                <button
                  onClick={() => {
                    setIsMobileSidebarOpen(false);
                    setShowServerModal(true);
                  }}
                  className="text-amber-300 hover:underline text-[10px]"
                >
                  সিঙ্ক সেটিংস
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
                className="w-9 h-9 md:w-11 md:h-11 rounded-xl object-cover ring-2 ring-amber-400 shadow-md md:hidden"
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
              />

              {/* User Profile Button in Header */}
              {currentUser && (
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="px-2 py-1.5 bg-black/25 hover:bg-black/35 rounded-xl border border-white/20 flex items-center gap-1.5 transition cursor-pointer text-xs"
                  title="আমার প্রোফাইল খুলুন"
                >
                  {currentProfile.customPhotoURL || currentUser.photoURL ? (
                    <img
                      src={currentProfile.customPhotoURL || currentUser.photoURL}
                      alt="Avatar"
                      className="w-5 h-5 rounded-full object-cover ring-1 ring-amber-400"
                    />
                  ) : (
                    <span className="text-base leading-none">{currentProfile.avatarEmoji || '👑'}</span>
                  )}
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
                onClick={() => (currentUser ? pushToServer(data) : fetchFromServer())}
                className="p-2 bg-white/15 hover:bg-white/25 rounded-xl text-white transition cursor-pointer"
                title="সার্ভার ও ক্লাউড রিফ্রেশ করুন"
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 max-w-5xl w-full mx-auto p-3.5 md:p-6 space-y-6">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Financial Quick Cards */}
              <div className="grid grid-cols-3 gap-3 bg-gradient-to-r from-teal-950 via-teal-900 to-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-md border border-teal-800/80">
                <div>
                  <p className="text-[11px] sm:text-xs text-teal-200">মোট জমা ফান্ড</p>
                  <p className="text-base sm:text-2xl font-bold mt-0.5">৳ {totalDeposit.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[11px] sm:text-xs text-teal-200">মোট খরচ</p>
                  <p className="text-base sm:text-2xl font-bold text-amber-300 mt-0.5">৳ {totalExpense.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[11px] sm:text-xs text-teal-200">অবশিষ্ট ব্যালেন্স</p>
                  <p className="text-base sm:text-2xl font-bold text-emerald-300 mt-0.5">৳ {remainingBalance.toLocaleString()}</p>
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

              {/* Route Progress Banner */}
              <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Bus size={17} className="text-teal-600" /> যাত্রাপথ: রংপুর কামারপাড়া ➔ কক্সবাজার ডলফিন মোড়
                  </h3>
                  <span className="text-[10px] sm:text-xs bg-teal-50 text-teal-700 font-medium px-2 py-0.5 rounded-lg border border-teal-200">
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
                    <span className="w-3.5 h-3.5 rounded-full bg-amber-500 mb-1"></span>
                    <span className="font-bold">বগুড়া</span>
                    <span className="text-[10px] text-slate-400">ফুড ভিলেজ (ডিনার)</span>
                  </div>
                  <div className="flex-1 h-1 bg-teal-200 mx-1"></div>
                  <div className="flex flex-col items-center min-w-[75px]">
                    <span className="w-3.5 h-3.5 rounded-full bg-amber-500 mb-1"></span>
                    <span className="font-bold">চট্টগ্রাম</span>
                    <span className="text-[10px] text-slate-400">হাইওয়ে নাস্তা</span>
                  </div>
                  <div className="flex-1 h-1 bg-teal-200 mx-1"></div>
                  <div className="flex flex-col items-center min-w-[75px]">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 mb-1"></span>
                    <span className="font-bold">কক্সবাজার</span>
                    <span className="text-[10px] text-slate-400">হোটেল সি মুন</span>
                  </div>
                </div>
              </div>

              {/* Emergency Contacts & Tourist Police Section */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-4 sm:p-5 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="text-amber-600" size={20} />
                  <h3 className="font-bold text-amber-900 text-sm">জরুরি যোগাযোগ ও পর্যটক নিরাপত্তা নির্দেশিকা</h3>
                </div>
                <div className="space-y-3 text-xs text-amber-900">
                  <ul className="space-y-1">
                    <li>• সমুদ্রে নামার আগে লাল পতাকা (বিপদ সংকেত) টাঙানো আছে কিনা তা নিশ্চিত হয়ে নিন।</li>
                    <li>• শিশুদের সবসময় বড়দের নজরে রাখুন এবং সাথে হোটেলের ফোন নম্বর রাখুন।</li>
                    <li>• জরুরি যেকোনো প্রয়োজনে নিচের নম্বরে সরাসরি ট্যাপ করে কল করুন:</li>
                  </ul>
                  
                  {/* Emergency Direct Call Grid */}
                  <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <a
                      href="tel:01320160001"
                      className="p-3 bg-white hover:bg-emerald-50 text-slate-800 rounded-2xl border border-amber-200/90 shadow-2xs flex items-center justify-between transition group"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-800">ট্যুরিস্ট পুলিশ হটলাইন ১</p>
                        <p className="text-[11px] text-slate-500">মোবাইল কল সার্ভিস</p>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                        <PhoneCall size={13} /> ০১৩২০-১৬০০০১
                      </span>
                    </a>

                    <a
                      href="tel:01320160000"
                      className="p-3 bg-white hover:bg-teal-50 text-slate-800 rounded-2xl border border-amber-200/90 shadow-2xs flex items-center justify-between transition group"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900 group-hover:text-teal-800">ট্যুরিস্ট পুলিশ হটলাইন ২</p>
                        <p className="text-[11px] text-slate-500">কক্সবাজার হেল্পডেস্ক</p>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded-lg border border-teal-200">
                        <PhoneCall size={13} /> ০১৩২০-১৬০০০
                      </span>
                    </a>

                    <a
                      href="tel:01320222222"
                      className="p-3 bg-white hover:bg-sky-50 text-slate-800 rounded-2xl border border-amber-200/90 shadow-2xs flex items-center justify-between transition group"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900 group-hover:text-sky-800">ট্যুরিস্ট পুলিশ কন্ট্রোল রুম</p>
                        <p className="text-[11px] text-slate-500">কেন্দ্রীয় মনিটরিং</p>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-bold text-sky-700 bg-sky-50 px-2 py-1 rounded-lg border border-sky-200">
                        <PhoneCall size={13} /> ০১৩২০-২২২২২২
                      </span>
                    </a>

                    <a
                      href="tel:01320158995"
                      className="p-3 bg-white hover:bg-indigo-50 text-slate-800 rounded-2xl border border-amber-200/90 shadow-2xs flex items-center justify-between transition group"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-800">এসপি (কক্সবাজার রিজিয়ন)</p>
                        <p className="text-[11px] text-slate-500">পুলিশ সুপার অফিস</p>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-200">
                        <PhoneCall size={13} /> ০১৩২০-১৫৮৯৯৫
                      </span>
                    </a>

                    <a
                      href="tel:999"
                      className="sm:col-span-2 p-3 bg-rose-50 hover:bg-rose-100 text-rose-950 rounded-2xl border border-rose-200 shadow-2xs flex items-center justify-between transition group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
                        <div>
                          <p className="text-xs font-bold text-rose-900">জাতীয় জরুরি সেবা (টোল ফ্রি)</p>
                          <p className="text-[11px] text-rose-700">পুলিশ, ফায়ার সার্ভিস ও জরুরি অ্যাম্বুলেন্স</p>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-extrabold text-white bg-rose-600 px-3 py-1 rounded-lg shadow-xs">
                        <PhoneCall size={13} /> ৯৯৯ (কল করুন)
                      </span>
                    </a>
                  </div>
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
                <BusSeatMap members={data.members || []} />
              )}

              {seatRoomSubTab === 'hotel' && (
                <HotelRoomMap members={data.members || []} />
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
                            <button
                              onClick={() => handleDeleteMember(member.id)}
                              className="text-slate-300 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 size={15} />
                            </button>
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
              onOpenDrive={() => window.open('https://drive.google.com/drive/folders/1G_g7cTkA489hbL9dsF6LU5tdfX3E54vM?usp=sharing', '_blank')}
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

      {/* Floating Quick Action Command Button (Mobile & Desktop) */}
      <button
        onClick={() => setIsCommandOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-30 bg-gradient-to-r from-teal-800 to-teal-900 hover:from-teal-700 hover:to-teal-800 text-amber-300 font-bold text-xs py-2.5 px-3.5 sm:py-3 sm:px-4 rounded-full shadow-2xl border-2 border-amber-400/80 flex items-center gap-2 transition transform hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
      >
        <Terminal size={15} />
        <span>কমান্ড (Ctrl+K)</span>
      </button>

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
      />

      {/* EDIT MEMBER & DEPOSIT UPDATE MODAL (Pinned header/footer, mobile-friendly) */}
      {editingMember && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-150"
          onClick={() => setEditingMember(null)}
        >
          <div
            className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full shadow-2xl max-h-[88vh] flex flex-col overflow-hidden my-auto border border-slate-100 animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
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
                <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200/80 space-y-2">
                  <span className="text-xs font-bold text-amber-900 block">
                    ⚡ দ্রুত ডিপোজিট যোগ করুন (ট্যাপ করলেই জমা বাড়বে):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[1000, 2000, 3000, 5000, 10000].map(addAmt => (
                      <button
                        key={addAmt}
                        type="button"
                        onClick={() => {
                          const cur = Number(editingMember.deposit || 0);
                          setEditingMember({ ...editingMember, deposit: cur + addAmt });
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-lg border border-amber-300 transition cursor-pointer shadow-2xs"
                      >
                        + ৳{addAmt.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">মোট জমা ফান্ড / ডিপোজিট (৳)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">৳</span>
                    <input
                      type="number"
                      value={editingMember.deposit}
                      onChange={e => setEditingMember({ ...editingMember, deposit: e.target.value })}
                      className="w-full pl-8 pr-3.5 py-2.5 text-sm font-bold text-emerald-800 border-2 border-emerald-400 rounded-xl focus:outline-none focus:border-teal-700 bg-emerald-50/20"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">সদস্যের নাম</label>
                    <input
                      type="text"
                      value={editingMember.name}
                      onChange={e => setEditingMember({ ...editingMember, name: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">মোবাইল নম্বর</label>
                    <input
                      type="text"
                      value={editingMember.phone}
                      onChange={e => setEditingMember({ ...editingMember, phone: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">সদস্য সংখ্যা</label>
                    <input
                      type="number"
                      value={editingMember.familyCount || 1}
                      onChange={e => setEditingMember({ ...editingMember, familyCount: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">বাস সিট</label>
                    <input
                      type="text"
                      value={editingMember.seat || ''}
                      onChange={e => setEditingMember({ ...editingMember, seat: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">হোটেল রুম</label>
                    <input
                      type="text"
                      value={editingMember.room || ''}
                      onChange={e => setEditingMember({ ...editingMember, room: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
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
      )}

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

      {/* CLOUD & SERVER SYNC CONFIGURATION MODAL */}
      {showServerModal && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-150"
          onClick={() => setShowServerModal(false)}
        >
          <div
            className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[88vh] overflow-y-auto animate-in fade-in zoom-in duration-200 my-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <CloudUpload size={22} className="text-teal-700" /> ক্লাউড ও সার্ভার সিঙ্ক সেটিংস
              </h3>
              <button
                onClick={() => setShowServerModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-gradient-to-br from-teal-50 to-emerald-50/60 p-4 rounded-2xl border border-teal-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    FB
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Firebase Cloud Backend</h4>
                    <p className="text-[11px] text-slate-500">Project: tour-26 (asia-south1)</p>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5 ${
                  currentUser ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${currentUser ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                  {currentUser ? 'সংযুক্ত' : 'লগইন প্রয়োজন'}
                </span>
              </div>

              {currentUser ? (
                <div className="bg-white p-3 rounded-xl border border-teal-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {currentUser.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt="Profile"
                        className="w-8 h-8 rounded-full ring-2 ring-emerald-400 object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-teal-800 text-white font-bold text-xs flex items-center justify-center">
                        {(currentUser.displayName || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{currentUser.displayName}</p>
                      <p className="text-[10px] text-slate-500 truncate">{currentUser.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2.5 py-1 rounded-lg border border-rose-200 hover:bg-rose-50 transition cursor-pointer shrink-0"
                  >
                    লগআউট
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-600">
                    Cloud Firestore-এ পরিবারের সবার সাথে সাথে লাইভ ডেটা সিঙ্ক ও হিসাব আপডেট করতে আপনার গুগল অ্যাকাউন্ট দিয়ে সাইন-ইন করুন।
                  </p>
                  <button
                    onClick={handleGoogleSignIn}
                    className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                  >
                    <GoogleIcon /> গুগল একাউন্ট দিয়ে সাইন-ইন করুন
                  </button>
                  {authError && (
                    <p className="text-[11px] text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100">
                      {authError}
                    </p>
                  )}
                </div>
              )}

              {currentUser && (
                <button
                  onClick={() => {
                    pushToServer(data);
                    setShowServerModal(false);
                  }}
                  className="w-full py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
                >
                  <CloudUpload size={14} /> বর্তমান ডেটা এখনই ফায়ারবেসে ফোর্স পুশ করুন
                </button>
              )}
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-2">
                <Server size={18} className="text-slate-700" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">VPS সেকেন্ডারি ব্যাকআপ API</h4>
                  <p className="text-[10px] text-slate-500">tour2026.izhaanintellect.fun / api.php</p>
                </div>
              </div>

              <form onSubmit={saveServerConfig} className="space-y-2.5">
                <input
                  type="text"
                  placeholder="/api.php অথবা https://tour2026.izhaanintellect.fun/api.php"
                  value={apiUrl}
                  onChange={e => setApiUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  সার্ভার API কনফিগারেশন সেভ করুন
                </button>
              </form>
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
        onShareLocation={handleShareLocation}
      />

      <TourQuizModal
        isOpen={showQuizModal}
        onClose={() => setShowQuizModal(false)}
        currentUser={currentUser}
        currentProfile={currentProfile}
      />

    </div>
  );
}

