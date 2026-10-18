/**
 * Tour Schedule & Day Highlights Utility
 * Rangpur ➔ Cox's Bazar Tour 2026 (19 - 23 October 2026)
 */

export const TOUR_DAYS = [
  {
    id: 'day1',
    dayNum: 1,
    name: '১ম দিন',
    date: '2026-10-19',
    badge: 'যাত্রার সূচনা',
    title: 'রংপুর ➔ বগুড়া ➔ ঢাকা নাইট জার্নি',
    color: 'from-amber-500 to-orange-500',
    ringColor: 'ring-amber-500',
    emoji: '🚌',
  },
  {
    id: 'day2',
    dayNum: 2,
    name: '২য় দিন',
    date: '2026-10-20',
    badge: 'কক্সবাজার আগমন',
    title: 'হোটেল সি মুন ও লাবণী বিচ সূর্যাস্ত',
    color: 'from-emerald-500 to-teal-600',
    ringColor: 'ring-teal-500',
    emoji: '🏖️',
  },
  {
    id: 'day3',
    dayNum: 3,
    name: '৩য় দিন',
    date: '2026-10-21',
    badge: 'ইনানী ও BBQ নাইট',
    title: 'হিমছড়ি, ইনানী, পটুয়ারটেক ও বারবিকিউ',
    color: 'from-blue-500 to-indigo-600',
    ringColor: 'ring-blue-500',
    emoji: '🔥',
  },
  {
    id: 'day4',
    dayNum: 4,
    name: '৪র্থ দিন',
    date: '2026-10-22',
    badge: 'মহেশখালী সফর',
    title: 'আদিনাথ মন্দির, পানের বরজ ও বার্মিজ মার্কেট',
    color: 'from-purple-500 to-pink-600',
    ringColor: 'ring-purple-500',
    emoji: '⛵',
  },
  {
    id: 'day5',
    dayNum: 5,
    name: '৫ম দিন',
    date: '2026-10-23',
    badge: 'প্রত্যাবর্তন',
    title: 'চেক-আউট ও রংপুরের উদ্দেশ্যে ফিরতি যাত্রা',
    color: 'from-rose-500 to-red-600',
    ringColor: 'ring-rose-500',
    emoji: '🏠',
  },
];

/**
 * Returns the tour day object matching the dayId (e.g. 'day1').
 */
export function getTourDayById(dayId) {
  if (!dayId) return TOUR_DAYS[0];
  return TOUR_DAYS.find((d) => d.id === dayId) || TOUR_DAYS[0];
}

/**
 * Returns today's ISO date string in Asia/Dhaka time (YYYY-MM-DD).
 */
export function getDhakaDateString(date = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Returns the active tour day object based on Dhaka time.
 */
export function getCurrentTourDay(date = new Date()) {
  const dhakaDate = getDhakaDateString(date);
  const matched = TOUR_DAYS.find((d) => d.date === dhakaDate);
  if (matched) return matched;

  // If before tour starts, default to Day 1
  if (dhakaDate < TOUR_DAYS[0].date) return TOUR_DAYS[0];
  // If after tour finishes, default to Day 5
  if (dhakaDate > TOUR_DAYS[TOUR_DAYS.length - 1].date) return TOUR_DAYS[TOUR_DAYS.length - 1];

  return TOUR_DAYS[0];
}

/**
 * Determines which tour day a post belongs to.
 * Matches post.tourDay, post.date, or post.createdAt.
 */
export function getPostTourDay(post) {
  if (!post) return 'day1';
  if (post.tourDay) return post.tourDay;

  const dateStr = post.date || post.createdAtDate || '';
  if (dateStr) {
    const matched = TOUR_DAYS.find((d) => d.date === dateStr);
    if (matched) return matched.id;
  }

  // Check if createdAt timestamp string contains an ISO date or day number
  const fullText = `${post.createdAt || ''} ${post.caption || ''} ${post.title || ''}`;
  for (const d of TOUR_DAYS) {
    if (fullText.includes(d.date) || fullText.includes(d.name)) {
      return d.id;
    }
  }

  // Fallback to day 1
  return 'day1';
}

/**
 * Suggested tour spots based on tour day & current schedule.
 */
export const TOUR_SPOTS = [
  'কামারপাড়া বাস স্ট্যান্ড, রংপুর',
  'ফুড ভিলেজ, বগুড়া',
  'হাইওয়ে রেস্টুরেন্ট, চট্টগ্রাম',
  'হোটেল সি মুন, কলাতলী',
  'লাবণী বিচ, কক্সবাজার',
  'সুগন্ধা বিচ ও ঝাউবন',
  'কলাতলী বিচ পয়েন্ট',
  'হিমছড়ি পাহাড় ও ঝর্ণা',
  'ইনানী পাথুরে সৈকত',
  'পটুয়ারটেক প্রবাল বিচ',
  'সাবরাং জিরো পয়েন্ট (টেকনাফ)',
  'সী বীচ বারবিকিউ পার্টি জোন',
  'মহেশখালী আদিনাথ মন্দির',
  'মহেশখালী মিষ্টি পানের বরজ',
  'শুঁটকি পল্লী ও শুঁটকি মার্কেট',
  'বার্মিজ মার্কেট শপিং',
  'রেডিয়েন্ট ফিশ ওয়ার্ল্ড একুরিয়াম',
  'ডলফিন মোড়, কক্সবাজার',
];

/**
 * Returns an automatic spot suggestion based on current time.
 */
export function getSuggestedTourLocation(date = new Date()) {
  const currentDay = getCurrentTourDay(date);
  const hour = date.getHours();

  if (currentDay.id === 'day1') {
    if (hour < 21) return { spot: 'কামারপাড়া বাস স্ট্যান্ড, রংপুর', day: currentDay };
    return { spot: 'ফুড ভিলেজ, বগুড়া', day: currentDay };
  }
  if (currentDay.id === 'day2') {
    if (hour < 11) return { spot: 'হাইওয়ে রেস্টুরেন্ট, চট্টগ্রাম', day: currentDay };
    if (hour < 16) return { spot: 'হোটেল সি মুন, কলাতলী', day: currentDay };
    return { spot: 'লাবণী বিচ ও সুগন্ধা বিচ', day: currentDay };
  }
  if (currentDay.id === 'day3') {
    if (hour < 17) return { spot: 'হিমছড়ি ও ইনানী বিচ', day: currentDay };
    return { spot: 'সী বীচ বারবিকিউ পার্টি জোন', day: currentDay };
  }
  if (currentDay.id === 'day4') {
    if (hour < 17) return { spot: 'মহেশখালী আদিনাথ পাহাড় ও মিষ্টি পান', day: currentDay };
    return { spot: 'বার্মিজ মার্কেট ও নাইট বিচ', day: currentDay };
  }
  if (currentDay.id === 'day5') {
    if (hour < 14) return { spot: 'হোটেল সি মুন (চেক-আউট)', day: currentDay };
    return { spot: 'ডলফিন মোড় (ফিরতি যাত্রা)', day: currentDay };
  }

  return { spot: 'হোটেল সি মুন, কক্সবাজার', day: currentDay };
}
