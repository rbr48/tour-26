/**
 * journeyRoute.js
 * Official Highway Roadmap & Milestones for Rangpur ➔ Cox's Bazar Tour 2026.
 * Total Highway Distance: ~820 km across Bangladesh (North to South-East).
 */

export const TOTAL_DISTANCE_KM = 820;

export const HIGHWAY_MILESTONES = [
  {
    id: 'RANGPUR_START',
    index: 0,
    name: 'রংপুর জিরো পয়েন্ট (মডার্ন মোড়)',
    nameEn: 'Rangpur Zero Point',
    kmFromStart: 0,
    lat: 25.7439,
    lng: 89.2752,
    estDuration: '০০:০০ ঘণ্টা',
    highlight: 'যাত্রার শুভ সূচনা ও দোয়া',
    details: 'পরিবারের সকলের বাসে আসন গ্রহণ, ব্যাগপত্র চেকিং ও নিরাপদ ভ্রমণের শুভ দোয়া।',
    amenities: ['বাস ডিপো', 'চা ও কফি', 'নামাজ'],
    icon: '🚌',
  },
  {
    id: 'BOGRA_SHERPUR',
    index: 1,
    name: 'বগুড়া শেরপুর (ফুড ভিলেজ প্লাস)',
    nameEn: 'Sherpur, Bogra',
    kmFromStart: 110,
    lat: 24.6738,
    lng: 89.4187,
    estDuration: '০২:১৫ ঘণ্টা',
    highlight: 'শেরপুরের বিখ্যাত দই ও রাতের হালকা নাস্তা',
    details: 'ফুড ভিলেজে হাইওয়ে বিরতি, পরিষ্কার ওয়াশরুম এবং স্পেশাল চা ও মিষ্টি দই।',
    amenities: ['রেস্তোরাঁ', 'ওয়াশরুম', 'নামাজঘর', 'এটিএম'],
    icon: '🍲',
  },
  {
    id: 'JAMUNA_BRIDGE',
    index: 2,
    name: 'বঙ্গবন্ধু যমুনা বহুমুখী সেতু',
    nameEn: 'Jamuna Bridge',
    kmFromStart: 180,
    lat: 24.3985,
    lng: 89.7828,
    estDuration: '০৩:৪৫ ঘণ্টা',
    highlight: 'যমুনা নদীর নৈসর্গিক রূপ ও ৪.৮ কিমি সেতু পারাপার',
    details: 'পশ্চিম টোল প্লাজা অতিক্রম করে ঐতিহ্যবাহী যমুনা পারাপার। রাতে নদীর শীতল বাতাস।',
    amenities: ['টোল প্লাজা', 'ভিউ পয়েন্ট'],
    icon: '🌉',
  },
  {
    id: 'ELENGA_TANGAIL',
    index: 3,
    name: 'এলেঙ্গা ও টাঙ্গাইল বাইপাস',
    nameEn: 'Elenga, Tangail',
    kmFromStart: 215,
    lat: 24.3364,
    lng: 89.9234,
    estDuration: '০৪:৩০ ঘণ্টা',
    highlight: 'পোড়াবাড়ির চমচম অঞ্চল ও চারলেন এক্সপ্রেসওয়ে',
    details: 'টাঙ্গাইল বাইপাস ধরে দ্রুত ঢাকা অভিমুখে যাত্রা। হাইওয়ে ফুয়েলিং স্টেশন।',
    amenities: ['সিএনজি/তেল পাম্প', 'ওয়াশরুম'],
    icon: '⛽',
  },
  {
    id: 'CHANDRA_GAZIPUR',
    index: 4,
    name: 'চন্দ্রা মোড় ও ঢাকা বাইপাস',
    nameEn: 'Chandra, Gazipur',
    kmFromStart: 270,
    lat: 24.0384,
    lng: 90.2647,
    estDuration: '০৫:৪৫ ঘণ্টা',
    highlight: 'ঢাকা উত্তর এশিয়ান হাইওয়ে বাইপাস সংযোগ',
    details: 'ঢাকা শহরের যানজট এড়িয়ে বাইপাস এক্সপ্রেসওয়ে ধরে সরাসরি চট্টগ্রাম রোডের দিকে অগ্রসর।',
    amenities: ['বাইপাস রোড', 'পুলিশ বক্স'],
    icon: '🛣️',
  },
  {
    id: 'KANCHPUR_MEGHNA',
    index: 5,
    name: 'কাঁচপুর ও মেঘনা ঘাট (হাইওয়ে ইন)',
    nameEn: 'Kanchpur / Meghna Ghat',
    kmFromStart: 330,
    lat: 23.5937,
    lng: 90.6128,
    estDuration: '০৭:০০ ঘণ্টা',
    highlight: 'মেঘনা নদী পারাপার ও ফজর নামাজের বিরতি',
    details: 'হাইওয়ে ইন রেস্টুরেন্টে ভোরবেলা ফজর নামাজের বিশেষ বিরতি ও গরম চা।',
    amenities: ['নামাজঘর', 'পরিচ্ছন্ন ওয়াশরুম', 'হাইওয়ে ক্যাফে'],
    icon: '🕌',
  },
  {
    id: 'DAUDKANDI_COMILLA',
    index: 6,
    name: 'দাউদকান্দি ও গোমতী টোল প্লাজা',
    nameEn: 'Daudkandi, Cumilla',
    kmFromStart: 365,
    lat: 23.5358,
    lng: 90.7203,
    estDuration: '০৭:৪৫ ঘণ্টা',
    highlight: 'মেঘনা-গোমতী চারলেন এক্সপ্রেসওয়ে',
    details: 'সকালের স্নিগ্ধ রোদে কুমিল্লা জেলার সীমানায় প্রবেশ ও স্মুথ ড্রাইভ।',
    amenities: ['টোল প্লাজা', 'হাইওয়ে পুলিশ'],
    icon: '🚗',
  },
  {
    id: 'COMILLA_PADUAR',
    index: 7,
    name: 'কুমিল্লা পদুয়ার বাজার ও বিশ্বরোড',
    nameEn: 'Paduar Bazar, Cumilla',
    kmFromStart: 430,
    lat: 23.4192,
    lng: 91.1714,
    estDuration: '০৯:০০ ঘণ্টা',
    highlight: 'ঐতিহ্যবাহী মাতৃভাণ্ডার রসমালাই ও সকালের নাস্তা',
    details: 'হোটেল নূরজাহান বা ক্যাফে রাজিবপুরে পরিবারসহ গরম পরোটা, ডিম, ডাল ও কুমিল্লার রসমালাই।',
    amenities: ['সকালের নাস্তা', 'মাতৃভাণ্ডার রসমালাই', 'বিশ্রামাগার'],
    icon: '🥛',
  },
  {
    id: 'FENI_MOHIPAL',
    index: 8,
    name: 'ফেনী মহিপাল সিক্স লেন ফ্লাইওভার',
    nameEn: 'Mohipal, Feni',
    kmFromStart: 490,
    lat: 23.0186,
    lng: 91.3966,
    estDuration: '১০:১৫ ঘণ্টা',
    highlight: 'বাংলাদেশের প্রথম ৬-লেন মহাসড়ক ফ্লাইওভার',
    details: 'দ্রুতগতির ফ্লাইওভার দিয়ে ফেনী শহর অতিক্রম। চট্টগ্রাম বিভাগের গভীরে প্রবেশ।',
    amenities: ['ফ্লাইওভার ভিউ', 'হাইওয়ে স্টপ'],
    icon: '🌉',
  },
  {
    id: 'SITAKUNDA_MIRSHARAI',
    index: 9,
    name: 'মিরসরাই ও সীতাকুণ্ড পাহাড়ী হাইওয়ে',
    nameEn: 'Mirsharai / Sitakunda',
    kmFromStart: 560,
    lat: 22.6178,
    lng: 91.6622,
    estDuration: '১১:৩০ ঘণ্টা',
    highlight: 'ডানপাশে বঙ্গোপসাগর ও বামে চন্দ্রনাথ সবুজ পাহাড়',
    details: 'পাহাড় ও সমুদ্রের মনোরম মিলনস্থল। জানালার বাইরে সবুজ পাহাড়ের সারি দৃশ্যমান।',
    amenities: ['পাহাড়ী ভিউ', 'শর্ট ওয়াশরুম'],
    icon: '⛰️',
  },
  {
    id: 'CHITTAGONG_KARNAPHULI',
    index: 10,
    name: 'চট্টগ্রাম কর্ণফুলী নতুন ব্রিজ (পটিয়া)',
    nameEn: 'Karnaphuli Bridge, Chattogram',
    kmFromStart: 655,
    lat: 22.3273,
    lng: 91.8488,
    estDuration: '১৩:৩০ ঘণ্টা',
    highlight: 'কর্ণফুলী নদী পারাপার ও চট্টগ্রামের মেজবানি সুবাস',
    details: 'তৃতীয় কর্ণফুলী সেতু হয়ে দক্ষিণ চট্টগ্রাম মহাসড়কে প্রবেশ। দুপুরের নামাজ ও খাবারের প্রস্তুতি।',
    amenities: ['কর্ণফুলী সেতু', 'দুপুরের খাবার স্টপ'],
    icon: '⛵',
  },
  {
    id: 'CHAKARIA_RAMU',
    index: 11,
    name: 'চকরিয়া মাতামুহুরী ব্রিজ ও রামু বাইপাস',
    nameEn: 'Chakaria / Ramu',
    kmFromStart: 760,
    lat: 21.6844,
    lng: 92.0722,
    estDuration: '১৫:৩০ ঘণ্টা',
    highlight: 'রামু রবার বাগান ও কক্সবাজারের মিষ্টি সুপারি বন',
    details: 'মাতামুহুরী নদী পেরিয়ে রামুর পাহাড়ী ঢাল বেয়ে সমুদ্র শহরের দ্বারপ্রান্তে আগমন।',
    amenities: ['রবার বাগান ভিউ', 'ডাব ও ফলমূল'],
    icon: '🌴',
  },
  {
    id: 'COXS_BAZAR_HOTEL',
    index: 12,
    name: 'কক্সবাজার কলাতলী ডলফিন মোড় (হোটেল সি মুন)',
    nameEn: 'Hotel Sea Moon, Cox\'s Bazar',
    kmFromStart: 820,
    lat: 21.4172,
    lng: 91.9806,
    estDuration: '১৬:৩০ ঘণ্টা',
    highlight: 'আলহামদুলিল্লাহ! দীর্ঘ প্রতীক্ষিত সমুদ্র সৈকত ও হোটেল চেক-ইন',
    details: 'হোটেল সি মুনে উষ্ণ অভ্যর্থনা, রুম চাবি বন্টন, গোসল, বিশ্রাম এবং বিকেলে সমুদ্র সৈকতে পদার্পণ!',
    amenities: ['হোটেল সি মুন', 'সমুদ্র সৈকত', 'লাক্সারি রেস্টুরেন্ট'],
    icon: '🌊',
  },
];

const toBn = (n) => String(n ?? 0).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);

/**
 * Returns formatted km string in Bengali
 */
export function formatKm(num) {
  return `${toBn(Math.round(num))} কিমি`;
}

/**
 * Calculate progress stats for a given milestone index
 */
export function calculateProgress(milestoneIndex) {
  const safeIdx = Math.max(0, Math.min(milestoneIndex, HIGHWAY_MILESTONES.length - 1));
  const current = HIGHWAY_MILESTONES[safeIdx];
  const completedKm = current.kmFromStart;
  const remainingKm = Math.max(0, TOTAL_DISTANCE_KM - completedKm);
  const percentage = Math.round((completedKm / TOTAL_DISTANCE_KM) * 100);

  return {
    currentIndex: safeIdx,
    currentMilestone: current,
    nextMilestone: HIGHWAY_MILESTONES[safeIdx + 1] || null,
    completedKm,
    remainingKm,
    percentage,
    isComplete: safeIdx === HIGHWAY_MILESTONES.length - 1,
  };
}

/**
 * Haversine formula to compute great-circle distance between two GPS coordinates in kilometers
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Automatically determine the closest milestone to a GPS point
 */
export function findNearestMilestone(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return HIGHWAY_MILESTONES[0];
  let minDistance = Infinity;
  let nearest = HIGHWAY_MILESTONES[0];

  for (const m of HIGHWAY_MILESTONES) {
    const d = calculateDistanceKm(lat, lng, m.lat, m.lng);
    if (d < minDistance) {
      minDistance = d;
      nearest = m;
    }
  }

  return { milestone: nearest, distanceKm: Math.round(minDistance * 10) / 10 };
}
