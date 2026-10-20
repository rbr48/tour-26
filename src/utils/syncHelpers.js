/**
 * Utilities for dynamic synchronization between Members, Bus Seats, Hotel Rooms, and Expenses.
 * Single source of truth is the `members` collection.
 */

export const FUND_LABEL = 'ট্যুর ফান্ড';

export const DEFAULT_BUS_SEATS = [
  // Upper Deck: 10 Sleepers
  { id: 'S1', deck: 'upper', type: 'sleeper', position: 'left-window', member: 'রাজু ভাই (ট্যুর অর্গানাইজার)', label: 'স্লিপার S1', desc: 'আপার ডেক • বাম উইন্ডো' },
  { id: 'S2', deck: 'upper', type: 'sleeper', position: 'left-aisle', member: 'রাজু ভাই (ট্যুর অর্গানাইজার)', label: 'স্লিপার S2', desc: 'আপার ডেক • বাম আইল' },
  { id: 'S3', deck: 'upper', type: 'sleeper', position: 'right-window', member: 'আশেক মো: আসিফ ভাই', label: 'স্লিপার S3', desc: 'আপার ডেক • ডান উইন্ডো' },
  { id: 'S4', deck: 'upper', type: 'sleeper', position: 'right-aisle', member: 'আশেক মো: আসিফ ভাই', label: 'স্লিপার S4', desc: 'আপার ডেক • ডান আইল' },
  { id: 'S5', deck: 'upper', type: 'sleeper', position: 'left-window', member: 'আশেক মো: আসিফ ভাই', label: 'স্লিপার S5', desc: 'আপার ডেক • বাম উইন্ডো' },
  { id: 'S6', deck: 'upper', type: 'sleeper', position: 'left-aisle', member: 'আশেক মো: আসিফ ভাই', label: 'স্লিপার S6', desc: 'আপার ডেক • বাম আইল' },
  { id: 'S7', deck: 'upper', type: 'sleeper', position: 'right-window', member: 'আলিম ভাই', label: 'স্লিপার S7', desc: 'আপার ডেক • ডান উইন্ডো' },
  { id: 'S8', deck: 'upper', type: 'sleeper', position: 'right-aisle', member: 'আলিম ভাই', label: 'স্লিপার S8', desc: 'আপার ডেক • ডান আইল' },
  { id: 'S9', deck: 'upper', type: 'sleeper', position: 'left-window', member: 'সাইফুল ভাই / জামাই', label: 'স্লিপার S9', desc: 'আপার ডেক • বাম উইন্ডো' },
  { id: 'S10', deck: 'upper', type: 'sleeper', position: 'left-aisle', member: 'সাইফুল ভাই / জামাই', label: 'স্লিপার S10', desc: 'আপার ডেক • বাম আইল' },
  // Lower Deck: 14 Business Class
  { id: 'B1', deck: 'lower', type: 'business', position: 'left-single', member: 'মাসুদ ভাই (এসবিএল)', label: 'বিজনেস B1', desc: 'লোয়ার ডেক • বিজনেস রিক্লাইনার' },
  { id: 'B2', deck: 'lower', type: 'business', position: 'right-aisle', member: 'মাসুদ ভাই (এসবিএল)', label: 'বিজনেস B2', desc: 'লোয়ার ডেক • ডাবল রিক্লাইনার' },
  { id: 'B3', deck: 'lower', type: 'business', position: 'right-window', member: 'মাসুদ ভাই (এসবিএল)', label: 'বিজনেস B3', desc: 'লোয়ার ডেক • ডাবল উইন্ডো' },
  { id: 'B4', deck: 'lower', type: 'business', position: 'left-single', member: 'শশি ভাই (সচিবুল ভাই)', label: 'বিজনেস B4', desc: 'লোয়ার ডেক • বিজনেস রিক্লাইনার' },
  { id: 'B5', deck: 'lower', type: 'business', position: 'right-aisle', member: 'শশি ভাই (সচিবুল ভাই)', label: 'বিজনেস B5', desc: 'লোয়ার ডেক • ডাবল রিক্লাইনার' },
  { id: 'B6', deck: 'lower', type: 'business', position: 'right-window', member: 'শশি ভাই (সচিবুল ভাই)', label: 'বিজনেস B6', desc: 'লোয়ার ডেক • ডাবল উইন্ডো' },
  { id: 'B7', deck: 'lower', type: 'business', position: 'left-single', member: 'নুর ভাই', label: 'বিজনেস B7', desc: 'লোয়ার ডেক • বিজনেস রিক্লাইনার' },
  { id: 'B8', deck: 'lower', type: 'business', position: 'right-aisle', member: 'নুর ভাই', label: 'বিজনেস B8', desc: 'লোয়ার ডেক • ডাবল রিক্লাইনার' },
  { id: 'B9', deck: 'lower', type: 'business', position: 'right-window', member: 'নুর ভাই', label: 'বিজনেস B9', desc: 'লোয়ার ডেক • ডাবল উইন্ডো' },
  { id: 'B10', deck: 'lower', type: 'business', position: 'left-single', member: 'লতিফ ভাই / খালু (কুড়িগ্রাম)', label: 'বিজনেস B10', desc: 'লোয়ার ডেক • বিজনেস রিক্লাইনার' },
  { id: 'B11', deck: 'lower', type: 'business', position: 'right-aisle', member: 'লতিফ ভাই / খালু (কুড়িগ্রাম)', label: 'বিজনেস B11', desc: 'লোয়ার ডেক • ডাবল রিক্লাইনার' },
  { id: 'B12', deck: 'lower', type: 'business', position: 'right-window', memberName: 'মো: সোহাগ রানা / এম এস রানা (ট্যুর কো-অর্ডিনেটর)', member: 'এম এস রানা ভাই (বিকেবি)', label: 'বিজনেস B12', desc: 'লোয়ার ডেক • ডাবল উইন্ডো' },
  { id: 'B13', deck: 'lower', type: 'business', position: 'back-row', member: 'আলমগীর ভাই (ফটোগ্রাফার)', label: 'বিজনেস B13', desc: 'লোয়ার ডেক • ব্যাক রো' },
  { id: 'B14', deck: 'lower', type: 'business', position: 'back-row', member: 'অতিরিক্ত / ব্যাকআপ সিট', label: 'বিজনেস B14', desc: 'লোয়ার ডেক • রিজার্ভ সিট' },
];

export const DEFAULT_ROOMS = [
  {
    roomNo: '301',
    floor: 3,
    type: 'ডাবল বেড এসি (সি-সাইড)',
    occupants: 'রাজু ভাই ও পরিবার (ট্যুর লিডার)',
    memberName: 'রাজু ভাই (ট্যুর অর্গানাইজার)',
    beds: '১টি কিং সাইজ ডাবল বেড',
    view: 'সি-সাইড ভিউ',
    color: 'border-teal-300 bg-teal-50/50',
  },
  {
    roomNo: '302',
    floor: 3,
    type: 'ডাবল বেড এসি',
    occupants: 'লতিফ ভাই / খালু ও পরিবার (কুড়িগ্রাম)',
    memberName: 'লতিফ ভাই / খালু (কুড়িগ্রাম)',
    beds: '১টি কিং সাইজ ডাবল বেড',
    view: 'হোটেল ফ্রন্ট ভিউ',
    color: 'border-indigo-300 bg-indigo-50/50',
  },
  {
    roomNo: '401',
    floor: 4,
    type: 'ডিলাক্স ফ্যামিলি ৩-বেড এসি',
    occupants: 'মাসুদ ভাই ও পরিবার (এসবিএল)',
    memberName: 'মাসুদ ভাই (এসবিএল)',
    beds: '১টি ডাবল + ১টি সিঙ্গেল বেড',
    view: 'ব্যালকনি ভিউ',
    color: 'border-blue-300 bg-blue-50/50',
  },
  {
    roomNo: '402',
    floor: 4,
    type: 'ডিলাক্স ফ্যামিলি ৩-বেড এসি',
    occupants: 'শশি ভাই ও পরিবার (সচিবুল ভাই)',
    memberName: 'শশি ভাই (সচিবুল ভাই)',
    beds: '১টি ডাবল + ১টি সিঙ্গেল বেড',
    view: 'ব্যালকনি ভিউ',
    color: 'border-amber-300 bg-amber-50/50',
  },
  {
    roomNo: '501',
    floor: 5,
    type: 'সুইট ফ্যামিলি ৪-বেড এসি',
    occupants: 'আশেক মো: আসিফ ভাই ও পরিবার',
    memberName: 'আশেক মো: আসিফ ভাই',
    beds: '২টি কিং সাইজ ডাবল বেড',
    view: 'প্রিমিয়াম সি-ভিউ',
    color: 'border-purple-300 bg-purple-50/50',
  },
  {
    roomNo: '502',
    floor: 5,
    type: 'ডিলাক্স ফ্যামিলি ৩-বেড এসি',
    occupants: 'নুর ভাই ও পরিবার',
    memberName: 'নুর ভাই',
    beds: '১টি ডাবল + ১টি সিঙ্গেল বেড',
    view: 'ব্যালকনি ভিউ',
    color: 'border-emerald-300 bg-emerald-50/50',
  },
  {
    roomNo: '601',
    floor: 6,
    type: 'ডাবল বেড এসি',
    occupants: 'আলিম ভাই ও পরিবার',
    memberName: 'আলিম ভাই',
    beds: '১টি কিং সাইজ ডাবল বেড',
    view: 'উইন্ডো ভিউ',
    color: 'border-cyan-300 bg-cyan-50/50',
  },
  {
    roomNo: '602',
    floor: 6,
    type: 'ডাবল বেড এসি',
    occupants: 'সাইফুল ভাই / জামাই ও পরিবার',
    memberName: 'সাইফুল ভাই / জামাই',
    beds: '১টি কিং সাইজ ডাবল বেড',
    view: 'উইন্ডো ভিউ',
    color: 'border-rose-300 bg-rose-50/50',
  },
  {
    roomNo: '701',
    floor: 7,
    type: 'ডাবল বেড সি-ভিউ এসি',
    occupants: 'এম এস রানা ভাই ও পরিবার (বিকেবি)',
    memberName: 'মো: সোহাগ রানা / এম এস রানা (ট্যুর কো-অর্ডিনেটর)',
    beds: '১টি কিং সাইজ ডাবল বেড',
    view: 'টপ ফ্লোর সি-ভিউ',
    color: 'border-sky-300 bg-sky-50/50',
  },
  {
    roomNo: '702',
    floor: 7,
    type: 'টুইন বেড সি-ভিউ এসি',
    occupants: 'আলমগীর ভাই ও মিডিয়া টিম',
    memberName: 'আলমগীর ভাই (ফটোগ্রাফার)',
    beds: '২টি আরামদায়ক সিঙ্গেল বেড',
    view: 'টপ ফ্লোর সি-ভিউ',
    color: 'border-orange-300 bg-orange-50/50',
  },
];

/** Converts Bengali numeric digits (০-৯) to standard English ASCII digits (0-9). */
export function bengaliToEnglishDigits(str) {
  if (!str) return '';
  return String(str).replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d));
}

/** Converts standard English ASCII digits (0-9) to Bengali numeric digits (০-৯). */
export function englishToBengaliDigits(str) {
  if (!str && str !== 0) return '';
  return String(str).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]);
}

/**
 * Extracts normalized seat IDs (e.g. ['S1', 'S2'], ['B12']) from any string.
 * Handles patterns like "স্লিপার S1, S2 (২ সিট)", "বিজনেস B12 (সিঙ্গেল)", "B-12", "S 1".
 */
export function extractSeats(str) {
  if (!str) return [];
  const normalized = bengaliToEnglishDigits(str).toUpperCase();
  const matches = normalized.match(/\b[SB]\s*-?\s*\d+\b/g) || [];
  return [...new Set(matches.map((s) => s.replace(/[\s-]/g, '')))];
}

/**
 * Extracts 3-digit room numbers (e.g. ['301', '302'], ['702']) from room strings.
 * Handles Bengali & English formats: "রুম ৩০১ (সি-সাইড)", "রুম ৫০১ ও ৫০২", "401".
 */
export function extractRooms(str) {
  if (!str) return [];
  const converted = bengaliToEnglishDigits(str);
  const matches = converted.match(/\b\d{3}\b/g) || [];
  return [...new Set(matches)];
}

/**
 * Dynamically resolves the payer display name for an expense.
 * Prioritizes:
 * 1. Live member name from `members` matching `expense.paidById`
 * 2. Fallback to existing `expense.paidBy` string
 * 3. Default `FUND_LABEL` ("ট্যুর ফান্ড")
 */
export function resolvePayerName(expense, members = []) {
  if (!expense) return FUND_LABEL;
  if (expense.paidById !== undefined && expense.paidById !== null && Array.isArray(members)) {
    const matched = members.find((m) => String(m.id) === String(expense.paidById));
    if (matched?.name) return matched.name;
  }
  return expense.paidBy || FUND_LABEL;
}

/**
 * Synchronizes bus seats with the active members list.
 * Ensures seat occupants, member IDs, and contact phone numbers reflect the latest member data.
 */
export function syncBusSeatsWithMembers(seats = [], members = []) {
  if (!Array.isArray(seats) || seats.length === 0) return [];
  if (!Array.isArray(members) || members.length === 0) return seats;

  return seats.map((seat) => {
    const seatId = String(seat.id || '').toUpperCase();

    // 1. Primary: Match member who has this seat ID assigned in their `seat` attribute
    const memberBySeat = members.find((m) => extractSeats(m.seat).includes(seatId));
    if (memberBySeat) {
      return {
        ...seat,
        memberId: memberBySeat.id,
        member: memberBySeat.name,
        memberName: memberBySeat.name,
        memberPhone: memberBySeat.phone || '',
      };
    }

    // 2. Secondary: If seat already holds a memberId, check if member still exists and keeps this seat
    if (seat.memberId !== undefined && seat.memberId !== null) {
      const memberById = members.find((m) => String(m.id) === String(seat.memberId));
      if (memberById && extractSeats(memberById.seat).includes(seatId)) {
        return {
          ...seat,
          memberId: memberById.id,
          member: memberById.name,
          memberName: memberById.name,
          memberPhone: memberById.phone || '',
        };
      }
      // Member no longer has this seat assigned -> auto unassign
      return {
        ...seat,
        memberId: null,
        member: '',
        memberName: '',
        memberPhone: '',
      };
    }

    // 3. Tertiary: Fallback name match if member has this seat or was manually entered
    if (seat.member) {
      const memberByName = members.find((m) => m.name === seat.member || m.name === seat.memberName);
      if (memberByName) {
        return {
          ...seat,
          memberId: memberByName.id,
          member: memberByName.name,
          memberName: memberByName.name,
          memberPhone: memberByName.phone || '',
        };
      }
    }

    return seat;
  });
}

/**
 * Synchronizes hotel rooms with the active members list.
 * Populates occupant descriptions, room representative, and phone numbers dynamically.
 */
export function syncHotelRoomsWithMembers(rooms = [], members = []) {
  if (!Array.isArray(rooms) || rooms.length === 0) return [];
  if (!Array.isArray(members) || members.length === 0) return rooms;

  return rooms.map((room) => {
    const roomNo = String(room.roomNo || '');
    const matchingMembers = members.filter((m) => extractRooms(m.room).includes(roomNo));

    if (matchingMembers.length > 0) {
      let occupants;
      if (matchingMembers.length === 1) {
        const m = matchingMembers[0];
        occupants = m.familyCount > 1 ? `${m.name} ও পরিবার` : m.name;
      } else {
        occupants = `${matchingMembers.map((m) => m.name).join(' ও ')} (শেয়ার্ড)`;
      }

      return {
        ...room,
        occupants,
        memberName: matchingMembers[0].name,
        memberPhone: matchingMembers[0].phone || '',
        memberIds: matchingMembers.map((m) => m.id),
      };
    }

    return room;
  });
}
