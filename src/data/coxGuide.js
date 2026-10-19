/**
 * coxGuide.js
 * Curated Spot Guide, Verified Seafood & Bengali Restaurants,
 * Sunset / Golden Hour Radar, and Live Swim Safety Analysis for Cox's Bazar 2026.
 */

import { tidesForDate } from './tideSchedule';

const toBn = (n) => String(n ?? 0).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);

/**
 * 10 Verified Family Restaurants in Cox's Bazar
 */
export const VERIFIED_RESTAURANTS = [
  {
    id: 'poushee',
    name: 'পৌষী রেস্তোরাঁ (Poushee Restaurant)',
    category: 'খাঁটি বাংলা ও সামুদ্রিক মাছ',
    location: 'ঝাউতলা, মেইন রোড',
    distanceFromHotel: '২.৫ কিমি (টমটমে ১০ মিনিট)',
    specialties: ['৩০+ পদের ভর্তা', 'মুচমুচে লইট্টা ফ্রাই', 'রূপচাঁদা দোপেঁয়াজা', 'লবস্টার কারি'],
    priceRange: '১৫০ — ৫০০ ৳',
    rating: 4.6,
    familyFriendly: true,
    mapsUrl: 'https://maps.google.com/?q=Poushee+Restaurant+Coxs+Bazar',
    tip: 'দুপুরে প্রচুর ভিড় হয়, তাই দুপুর ১টা বা ১:৩০টার মধ্যে পৌঁছানো ভালো।',
  },
  {
    id: 'jhaubon',
    name: 'ঝাউবন রেস্তোরাঁ (Jhaubon Restaurant)',
    category: 'ঐতিহ্যবাহী সামুদ্রিক মাছ ও ভর্তা',
    location: 'ঝাউতলা রোড, প্রধান সড়ক',
    distanceFromHotel: '২.৪ কিমি (টমটমে ১০ মিনিট)',
    specialties: ['সামুদ্রিক কোরাল কারি', 'চিংড়ি মালাইকারি', 'কালোজিরা ও শুঁটকি ভর্তা'],
    priceRange: '২০০ — ৫০০ ৳',
    rating: 4.5,
    familyFriendly: true,
    mapsUrl: 'https://maps.google.com/?q=Jhaubon+Restaurant+Coxs+Bazar',
    tip: 'পরিবারের সাথে দুপুরের খাবার খাওয়ার জন্য চমৎকার ও দ্রুত সার্ভিস।',
  },
  {
    id: 'koyla',
    name: 'কয়লা লাইভ কিচেন ও কাবাব (Koyla Live BBQ)',
    category: 'লাইভ সি-ফুড ও বারবিকিউ',
    location: 'সুগন্ধা পয়েন্ট মোড়',
    distanceFromHotel: '১.২ কিমি (হাঁটলে ১২ মিনিট)',
    specialties: ['লাইভ স্কুইড ফ্রাই', 'তন্দুরি রূপচাঁদা', 'কাঁকড়া ভুনা / ক্র্যাব কারি', 'চিকেন চাপ'],
    priceRange: '৩০০ — ৮০০ ৳',
    rating: 4.7,
    familyFriendly: true,
    mapsUrl: 'https://maps.google.com/?q=Koyla+Live+Kitchen+Coxs+Bazar',
    tip: 'সন্ধ্যার পর তাজা মাছ ওজন করে চোখের সামনে বারবিকিউ করিয়ে নেওয়ার দারুণ অভিজ্ঞতা।',
  },
  {
    id: 'pathorkuchi',
    name: 'পাথরকুঁড়ি সি-ফুড ও বাংলা খাবার',
    category: 'সি-ফুড ও ফ্যামিলি ডাইনিং',
    location: 'হোটেল মোটেল জোন, কলাতলী',
    distanceFromHotel: '৭০০ মিটার (হোটেল সি মুনের কাছে)',
    specialties: ['কালা ভুনা', 'রূপচাঁদা ফ্রাই', 'চিংড়ি ফ্রাই', 'স্পেশাল ডাল'],
    priceRange: '১৮০ — ৪৫০ ৳',
    rating: 4.4,
    familyFriendly: true,
    mapsUrl: 'https://maps.google.com/?q=Pathorkuchi+Restaurant+Coxs+Bazar',
    tip: 'হোটেল সি মুন থেকে সবচেয়ে কাছে, ক্লান্ত অবস্থায় রাতের খাবারের জন্য সেরা।',
  },
  {
    id: 'shalik',
    name: 'শালিক রেস্তোরাঁ (Shalik Restaurant)',
    category: 'বাজেট ফ্রেন্ডলি বাংলা ও সামুদ্রিক',
    location: 'মোটেল রোড, লাবণী মোড়',
    distanceFromHotel: '২.৮ কিমি',
    specialties: ['টাকি মাছের ভর্তা', 'কাটা মসলায় মুরগি ভুনা', 'পাবদা মাছের ঝোল'],
    priceRange: '১২০ — ৩৫০ ৳',
    rating: 4.3,
    familyFriendly: true,
    mapsUrl: 'https://maps.google.com/?q=Shalik+Restaurant+Coxs+Bazar',
    tip: 'স্বচ্ছ কিচেন ও সুলভ মূল্যে দারুণ ফ্রেশ খাবার।',
  },
  {
    id: 'mermaid_cafe',
    name: 'মারমেইড বিচ ক্যাফে (Mermaid Cafe)',
    category: 'কন্টিনেন্টাল, ইতালিয়ান ও সী ভিউ',
    location: 'পেঁচার দ্বীপ ও কলাতলী রোড',
    distanceFromHotel: '৩.৫ কিমি (মেরিন ড্রাইভ)',
    specialties: ['উড-ফায়ার্ড সি-ফুড পিৎজা', 'গ্রিল্ড স্ন্যাপার', 'ফ্রেশ ফ্রুট স্মুদি'],
    priceRange: '৫০০ — ১২০০ ৳',
    rating: 4.8,
    familyFriendly: true,
    mapsUrl: 'https://maps.google.com/?q=Mermaid+Cafe+Coxs+Bazar',
    tip: 'সূর্যাস্তের সময় সমুদ্রের ঠিক সামনে বসে কফি ও স্ন্যাকসের জন্য অপার্থিব স্থান।',
  },
  {
    id: 'devbhoj',
    name: 'দেবভোজ নিরামিষ ভোজনালয় (Pure Veg)',
    category: 'নিরামিষ ও মিষ্টি',
    location: 'গোলদিঘির পাড়, বাজার রোড',
    distanceFromHotel: '৩ কিমি',
    specialties: ['স্পেশাল থালি', 'পনির মাখনওয়ালা', 'ছানার রসগোল্লা ও মিষ্টি দই'],
    priceRange: '১০০ — ২৫০ ৳',
    rating: 4.5,
    familyFriendly: true,
    mapsUrl: 'https://maps.google.com/?q=Pure+Veg+Restaurant+Coxs+Bazar',
    tip: 'যাঁরা পুরোপুরি নিরামিষ পছন্দ করেন তাঁদের জন্য শতভাগ বিশুদ্ধ খাবার।',
  },
  {
    id: 'cafe_lyka',
    name: 'ক্যাফে লাইকা ও পেস্ট্রি শপ',
    category: 'কফি, পেস্ট্রি ও স্ন্যাকস',
    location: 'হোটেল সায়মন রোড, কলাতলী',
    distanceFromHotel: '১ কিমি',
    specialties: ['ক্যাপুচিনো ও লাতে', 'রেড ভেলভেট কেক', 'ক্রিস্পি বাফেলো উইংস'],
    priceRange: '১৫০ — ৪০০ ৳',
    rating: 4.6,
    familyFriendly: true,
    mapsUrl: 'https://maps.google.com/?q=Cafe+Lyka+Coxs+Bazar',
    tip: 'বিকেলে বাচ্চাদের আইসক্রিম ও পরিবারের চমৎকার কফি আড্ডার জন্য উপযুক্ত।',
  },
  {
    id: 'sugandha_street',
    name: 'সুগন্ধা স্ট্রিট ফুড ও ফ্রাই কর্নার',
    category: 'স্ট্রিট ফ্রাই ও ফুচকা',
    location: 'সুগন্ধা বিচ এন্ট্রান্স',
    distanceFromHotel: '১.২ কিমি',
    specialties: ['তাত্ক্ষণিক ভাজা চিংড়ি', 'কাঁকড়া ফ্রাই', 'টক-মিষ্টি ফুচকা ও চটপটি'],
    priceRange: '৫০ — ২০০ ৳',
    rating: 4.2,
    familyFriendly: true,
    mapsUrl: 'https://maps.google.com/?q=Sugandha+Beach+Coxs+Bazar',
    tip: 'তাজা ভাজা খাবার খাওয়ার আগে ফ্রেশ দেখে নিশ্চিত হয়ে অর্ডার করুন।',
  },
  {
    id: 'inani_drivein',
    name: 'রূপচাঁদা ড্রাইভ-ইন ও ডাব কর্নার',
    category: 'মেরিন ড্রাইভ রিফ্রেশমেন্ট',
    location: 'ইনানী বিচ লিংক, মেরিন ড্রাইভ',
    distanceFromHotel: '২২ কিমি',
    specialties: ['মিষ্টি ডাব', 'গ্রিল্ড রূপচাঁদা', 'কচি নারিকেলের পানি'],
    priceRange: '১০০ — ৫০০ ৳',
    rating: 4.7,
    familyFriendly: true,
    mapsUrl: 'https://maps.google.com/?q=Inani+Beach+Coxs+Bazar',
    tip: 'ইনানী ভ্রমণের পথে মেরিন ড্রাইভে গাড়ি থামিয়ে রিফ্রেশ হওয়ার অসাধারণ স্পট।',
  },
];

/**
 * Top Sightseeing Spots in Cox's Bazar
 */
export const SIGHTSEEING_SPOTS = [
  {
    id: 'kolatoli_beach',
    name: 'কলাতলী বিচ (Kolotoli Beach)',
    distanceFromHotel: '৫০০ মিটার (হাঁটা দূরত্ব)',
    bestTime: 'ভোরবেলা ও সূর্যাস্তের সময়',
    highlights: 'হোটেল সি মুনের কাছেই, সহজে যাওয়া যায়, সকালে মনোরম হাওয়া।',
    tips: 'লাইফগার্ড টাওয়ারের সামনে গোসল করবেন।',
    mapsUrl: 'https://maps.google.com/?q=Kolatoli+Beach+Coxs+Bazar',
  },
  {
    id: 'sugandha_beach',
    name: 'সুগন্ধা বিচ (Sugandha Beach)',
    distanceFromHotel: '১.২ কিমি (টমটমে ৫ মিনিট)',
    bestTime: 'বিকেল ৫টা থেকে রাত ৯টা',
    highlights: 'বারবিকিউ, লাইভ সি-ফুড, ঘোড়সওয়ার ও রাতের ঝমঝমে আলোকসজ্জা।',
    tips: 'পরিবারের কেনাকাটা ও বিচ আড্ডার প্রাণকেন্দ্র।',
    mapsUrl: 'https://maps.google.com/?q=Sugandha+Beach+Coxs+Bazar',
  },
  {
    id: 'laboni_beach',
    name: 'লাবণী পয়েন্ট ও ঝিনুক মার্কেট',
    distanceFromHotel: '২.৫ কিমি',
    bestTime: 'বিকেল ৪টা থেকে সন্ধ্যা',
    highlights: 'পুরোনো ও ঐতিহ্যবাহী বিচ, বার্মিজ আচার ও শামুক-ঝিনুকের বিশাল মার্কেট।',
    tips: 'কেনাকাটায় দরদাম করে কিনবেন।',
    mapsUrl: 'https://maps.google.com/?q=Laboni+Beach+Coxs+Bazar',
  },
  {
    id: 'himchari',
    name: 'হিমছড়ি পাহাড় ও জাতীয় উদ্যান',
    distanceFromHotel: '৮.৫ কিমি (মেরিন ড্রাইভ ধরে চান্দের গাড়ি / অটো)',
    bestTime: 'সকাল ৯টা — দুপুর ১২টা',
    highlights: 'পাহাড় চূড়া থেকে সাগরের ১৮০ ডিগ্রি রূপ ও পাহাড়ি ঝর্ণা।',
    tips: 'সিঁড়ি বেয়ে পাহাড়ে ওঠার সময় বয়োজ্যেষ্ঠরা সাবধানে উঠবেন।',
    mapsUrl: 'https://maps.google.com/?q=Himchari+Coxs+Bazar',
  },
  {
    id: 'inani_beach',
    name: 'ইনানী পাথুরে প্রবাল সৈকত',
    distanceFromHotel: '২৫ কিমি (মেরিন ড্রাইভ)',
    bestTime: 'ভাটার সময় (পাথর দেখার সেরা সময়)',
    highlights: 'স্বচ্ছ নীল জল, শান্ত পরিবেশ ও কোটি বছরের পুরোনো প্রবাল পাথর।',
    tips: 'পাথরে পিচ্ছিল শ্যাওলা থাকতে পারে, খালি পায়ে সাবধানে হাঁটুন।',
    mapsUrl: 'https://maps.google.com/?q=Inani+Beach+Coxs+Bazar',
  },
  {
    id: 'patuartek',
    name: 'পাটুয়ারটেক লাল কাঁকড়া বিচ',
    distanceFromHotel: '৩২ কিমি',
    bestTime: 'সকাল ১০টা — দুপুর ২টা',
    highlights: 'অসংখ্য লাল কাঁকড়ার ঝাঁক ও প্রকৃতির নিরবতা।',
    tips: 'কাঁকড়া ধরার চেষ্টা না করে দূর থেকে ছবি তুলুন।',
    mapsUrl: 'https://maps.google.com/?q=Patuartek+Beach+Coxs+Bazar',
  },
  {
    id: 'ramu_monastery',
    name: 'রামু প্রাচীন বৌদ্ধ বিহার ও রাবার বাগান',
    distanceFromHotel: '১৬ কিমি (চট্টগ্রাম হাইওয়ে)',
    bestTime: 'সকাল ১০টা — বিকেল ৩টা',
    highlights: '১০০ ফুট সিংহশয্যা বুদ্ধমূর্তি ও শতবর্ষী রাবার গাছ।',
    tips: 'শান্ত ও পরিচ্ছন্ন পরিবেশ বজায় রাখুন।',
    mapsUrl: 'https://maps.google.com/?q=Ramu+Buddhist+Temple+Coxs+Bazar',
  },
  {
    id: 'marine_drive',
    name: 'কক্সবাজার-টেকনাফ মেরিন ড্রাইভ',
    distanceFromHotel: '০ কিমি থেকে শুরু (৮০ কিমি দীর্ঘ)',
    bestTime: 'বিকেল ৩:৩০ — সূর্যাস্ত',
    highlights: 'একপাশে নীল সাগর আর অন্যপাশে সবুজে ঘেরা আকাশছোঁয়া পাহাড়!',
    tips: 'খোলা জিপ বা ছাদখোলা চান্দের গাড়িতে ভ্রমণ করলে দারুণ অনুভূতি হয়।',
    mapsUrl: 'https://maps.google.com/?q=Marine+Drive+Coxs+Bazar',
  },
];

/**
 * Live Swim Safety Analysis based on tide schedule & time
 */
export function getSwimSafetyStatus(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const isoDate = `${year}-${month}-${day}`;

  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const windows = tidesForDate(isoDate) || tidesForDate('2026-10-18') || [];

  // Match current window
  let activeWindow = null;
  for (const w of windows) {
    if (currentMinutes >= w.startM && currentMinutes <= w.endM) {
      activeWindow = w;
      break;
    }
  }

  if (activeWindow) {
    if (activeWindow.type === 'high') {
      return {
        code: 'safe',
        flag: 'green',
        title: 'সাঁতারের অনুকূল সময় (জোয়ার)',
        statusText: 'নিরাপদ জোয়ার',
        color: 'emerald',
        badge: '🟢 নিরাপদ স্নান',
        desc: activeWindow.desc || 'এখন সাগরে জোয়ার চলছে। স্রোত কূলের দিকে থাকায় অগভীর পানিতে গোসল করা অপেক্ষাকৃত নিরাপদ।',
        tips: 'সর্বদা লাইফগার্ডের নির্দিষ্ট জোনে থাকুন এবং বুক পানির ওপরে যাবেন না।',
        windowName: activeWindow.name,
      };
    } else {
      return {
        code: 'danger',
        flag: 'red',
        title: 'বিপদজনক ভাটা — পানিতে নামা নিষেধ!',
        statusText: 'বিপদজনক ভাটা',
        color: 'rose',
        badge: '🔴 সাঁতার নিষেধ',
        desc: activeWindow.desc || 'সাবধান! এখন সমুদ্রে ভাটা চলছে। ভাটার তীব্র টানে চোরাবালি ও গুপ্ত গর্তে ভেসে যাওয়ার চরম ঝুঁকি থাকে।',
        tips: 'পানিতে নামবেন না! বালিয়াড়িতে হাঁটা, সেলফি তোলা ও ডাব পানের উপযুক্ত সময়।',
        windowName: activeWindow.name,
      };
    }
  }

  // If outside known window (transitional tide or nighttime)
  const isNight = date.getHours() >= 18 || date.getHours() < 6;
  if (isNight) {
    return {
      code: 'night',
      flag: 'red',
      title: 'রাতের সমুদ্র — পানিতে নামা সম্পূর্ণ নিষেধ',
      statusText: 'রাতের বেলা',
      color: 'rose',
      badge: '⛔ রাতে নামা নিষেধ',
      desc: 'সূর্যাস্তের পর সমুদ্রে লাইফগার্ড থাকে না এবং তীব্র চোরাস্রোতের কারণে সাগরে নামা সম্পূর্ণ নিষিদ্ধ।',
      tips: 'বিচ বেঞ্চে বসে সাগরের গর্জন ও ঠান্ডা হাওয়া উপভোগ করুন।',
      windowName: 'রাত্রিকালীন নিষেধাজ্ঞা',
    };
  }

  return {
    code: 'caution',
    flag: 'yellow',
    title: 'সতর্কতার সাথে সৈকতে অবস্থান (পরিবর্তনশীল)',
    statusText: 'সতর্কতা জোন',
    color: 'amber',
    badge: '🟡 সতর্কতা অবলম্বন',
    desc: 'জোয়ার ও ভাটার পরিবর্তনের সময়। স্রোত যে-কোনো মুহূর্তে দিক পরিবর্তন করতে পারে।',
    tips: 'হাঁটুর বেশি পানিতে নামবেন না। শিশুদের হাত ধরে রাখুন।',
    windowName: 'সাধারণ সতর্কতা',
  };
}

/**
 * Sunset and Golden Hour Countdown
 * In October, Cox's Bazar sunset is approximately 17:42 (5:42 PM).
 */
export function getSunsetCountdown(date = new Date()) {
  const sunsetHour = 17;
  const sunsetMin = 42;
  const sunsetTotalMin = sunsetHour * 60 + sunsetMin;
  const currentTotalMin = date.getHours() * 60 + date.getMinutes();

  const diffMin = sunsetTotalMin - currentTotalMin;

  if (diffMin > 45) {
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return {
      state: 'day',
      title: 'সূর্যাস্তের অপেক্ষা',
      countdownText: hours > 0 ? `আর ${toBn(hours)} ঘণ্টা ${toBn(mins)} মিনিট পর সূর্যাস্ত` : `আর ${toBn(mins)} মিনিট পর সূর্যাস্ত`,
      subtext: 'আজকের সম্ভাব্য সূর্যাস্ত: বিকেল ৫:৪২ মিনিটে',
      isGoldenHour: false,
    };
  } else if (diffMin > 0 && diffMin <= 45) {
    return {
      state: 'golden_hour',
      title: '🌅 গোল্ডেন আওয়ার চলছে!',
      countdownText: `আর মাত্র ${toBn(diffMin)} মিনিট পর সূর্যাস্ত!`,
      subtext: 'ছবি তোলার সবচেয়ে জাদুকরী আলো এখন বিচে বিরাজমান!',
      isGoldenHour: true,
    };
  } else if (diffMin <= 0 && diffMin >= -30) {
    return {
      state: 'twilight',
      title: '🌇 গোধূলির মায়াবী রূপ',
      countdownText: 'সূর্যাস্ত সবেমাত্র সম্পন্ন হয়েছে',
      subtext: 'আকাশে লাল-কমলা আভা ছড়িয়ে পড়ছে। চমৎকার সন্ধ্যার সূচনা।',
      isGoldenHour: false,
    };
  } else {
    return {
      state: 'night',
      title: '🌙 সাগরপাড়ে স্নিগ্ধ রাত',
      countdownText: 'আগামীকাল সূর্যাস্ত: বিকেল ৫:৪১ মিনিটে',
      subtext: 'রাতের চাঁদের আলো ও সাগরের গর্জন উপভোগ করুন।',
      isGoldenHour: false,
    };
  }
}
