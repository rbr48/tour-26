import React, { useState, useEffect } from 'react';
import {
  Bus,
  PhoneCall,
  Armchair,
  Info,
  X,
  Edit3,
  Check,
  Trash2,
  Plus,
  RotateCcw,
  Sparkles,
  Bed,
} from 'lucide-react';

import { phoneForMember } from '../utils/members';
import { useBackHandler } from '../utils/backNavigation';

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
  { id: 'B7', deck: 'lower', type: 'business', position: 'left-single', member: 'নুরুজ্জামান ভাই', label: 'বিজনেস B7', desc: 'লোয়ার ডেক • বিজনেস রিক্লাইনার' },
  { id: 'B8', deck: 'lower', type: 'business', position: 'right-aisle', member: 'নুরুজ্জামান ভাই', label: 'বিজনেস B8', desc: 'লোয়ার ডেক • ডাবল রিক্লাইনার' },
  { id: 'B9', deck: 'lower', type: 'business', position: 'right-window', member: 'নুরুজ্জামান ভাই', label: 'বিজনেস B9', desc: 'লোয়ার ডেক • ডাবল উইন্ডো' },
  { id: 'B10', deck: 'lower', type: 'business', position: 'left-single', member: 'লতিফ ভাই / খালু (কুড়িগ্রাম)', label: 'বিজনেস B10', desc: 'লোয়ার ডেক • বিজনেস রিক্লাইনার' },
  { id: 'B11', deck: 'lower', type: 'business', position: 'right-aisle', member: 'লতিফ ভাই / খালু (কুড়িগ্রাম)', label: 'বিজনেস B11', desc: 'লোয়ার ডেক • ডাবল রিক্লাইনার' },
  { id: 'B12', deck: 'lower', type: 'business', position: 'right-window', memberName: 'মো: সোহাগ রানা / এম এস রানা (ট্যুর কো-অর্ডিনেটর)', member: 'এম এস রানা ভাই (বিকেবি)', label: 'বিজনেস B12', desc: 'লোয়ার ডেক • ডাবল উইন্ডো' },
  { id: 'B13', deck: 'lower', type: 'business', position: 'back-row', member: 'আলমগীর ভাই (ফটোগ্রাফার)', label: 'বিজনেস B13', desc: 'লোয়ার ডেক • ব্যাক রো' },
  { id: 'B14', deck: 'lower', type: 'business', position: 'back-row', member: 'অতিরিক্ত / ব্যাকআপ সিট', label: 'বিজনেস B14', desc: 'লোয়ার ডেক • রিজার্ভ সিট' },
];

// Helper colors for different families
const getFamilyColor = (name) => {
  if (!name || name === 'খালি সিট' || name.includes('খালি')) {
    return 'bg-slate-50 border-dashed border-slate-300 text-slate-400 hover:bg-slate-100';
  }
  if (name.includes('রাজু')) return 'bg-teal-50 border-teal-300 text-teal-800 hover:bg-teal-100';
  if (name.includes('মাসুদ')) return 'bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100';
  if (name.includes('আসিফ')) return 'bg-purple-50 border-purple-300 text-purple-800 hover:bg-purple-100';
  if (name.includes('শশি')) return 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100';
  if (name.includes('নুরুজ্জামান')) return 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100';
  if (name.includes('লতিফ')) return 'bg-indigo-50 border-indigo-300 text-indigo-800 hover:bg-indigo-100';
  if (name.includes('আলিম')) return 'bg-cyan-50 border-cyan-300 text-cyan-800 hover:bg-cyan-100';
  if (name.includes('সাইফুল')) return 'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100';
  if (name.includes('রানা')) return 'bg-sky-50 border-sky-300 text-sky-800 hover:bg-sky-100';
  if (name.includes('আলমগীর')) return 'bg-orange-50 border-orange-300 text-orange-800 hover:bg-orange-100';
  return 'bg-slate-100 border-slate-200 text-slate-700';
};

export default function BusSeatMap({
  members = [],
  seats: externalSeats,
  onUpdateSeats,
  onUpdateMember,
}) {
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [activeDeck, setActiveDeck] = useState('both'); // 'upper', 'lower', 'both'
  const [notification, setNotification] = useState('');

  // Phone back button handlers
  useBackHandler(Boolean(selectedSeat), () => setSelectedSeat(null), 15);
  useBackHandler(isAddModalOpen, () => setIsAddModalOpen(false), 20);

  const [seats, setSeats] = useState(() => {
    if (Array.isArray(externalSeats) && externalSeats.length > 0) {
      return externalSeats;
    }
    try {
      const saved = localStorage.getItem('tour_bus_seats');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_BUS_SEATS;
  });

  // Sync with Firestore externalSeats updates
  useEffect(() => {
    if (Array.isArray(externalSeats) && externalSeats.length > 0) {
      setSeats(externalSeats);
    }
  }, [externalSeats]);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3500);
  };

  const persistSeats = (updatedSeats) => {
    setSeats(updatedSeats);
    try {
      localStorage.setItem('tour_bus_seats', JSON.stringify(updatedSeats));
    } catch {}
    onUpdateSeats?.(updatedSeats);
  };

  // Dynamically resolve seat occupant
  const getSeatOccupant = (s) => {
    if (!s) return '';
    if (s.member !== undefined && s.member !== null) {
      return s.member;
    }
    const matched = members.find((m) => {
      if (!m.seat) return false;
      const clean = m.seat.toUpperCase();
      const id = s.id.toUpperCase();
      return clean.includes(id);
    });
    if (matched) return matched.name;
    return '';
  };

  // Reassignment Modal State inside selectedSeat
  const [isEditingSeat, setIsEditingSeat] = useState(false);
  const [editMemberId, setEditMemberId] = useState('');
  const [customNameInput, setCustomNameInput] = useState('');
  const [editSeatLabel, setEditSeatLabel] = useState('');
  const [editSeatDesc, setEditSeatDesc] = useState('');

  // Add Seat Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSeatData, setNewSeatData] = useState({
    id: '',
    deck: 'upper',
    type: 'sleeper',
    position: 'left-window',
    label: '',
    desc: '',
    member: '',
  });

  // Open Add Seat Modal
  const handleOpenAddModal = () => {
    const upperIds = seats
      .filter((s) => s.id.startsWith('S'))
      .map((s) => parseInt(s.id.slice(1), 10) || 0);
    const maxS = upperIds.length > 0 ? Math.max(...upperIds) : 10;
    const nextSId = `S${maxS + 1}`;

    setNewSeatData({
      id: nextSId,
      deck: 'upper',
      type: 'sleeper',
      position: 'left-window',
      label: `স্লিপার ${nextSId}`,
      desc: 'আপার ডেক • নতুন স্লিপার বার্থ',
      member: '',
    });
    setIsAddModalOpen(true);
  };

  // Save New Seat
  const handleSaveNewSeat = (e) => {
    e.preventDefault();
    const cleanId = newSeatData.id.trim().toUpperCase();
    if (!cleanId) {
      alert('সিট নম্বর বা আইডি দিন (যেমন: S11 বা B15)');
      return;
    }
    if (seats.some((s) => s.id.toUpperCase() === cleanId)) {
      alert(`সিট ${cleanId} ইতিমধ্যে তালিকায় রয়েছে! অন্য একটি নম্বর দিন।`);
      return;
    }

    const createdSeat = {
      id: cleanId,
      deck: newSeatData.deck,
      type: newSeatData.type,
      position: newSeatData.position,
      label:
        newSeatData.label.trim() ||
        (newSeatData.type === 'sleeper' ? `স্লিপার ${cleanId}` : `বিজনেস ${cleanId}`),
      desc:
        newSeatData.desc.trim() ||
        (newSeatData.deck === 'upper'
          ? 'আপার ডেক • স্লিপার বার্থ'
          : 'লোয়ার ডেক • বিজনেস রিক্লাইনার'),
      member: newSeatData.member.trim(),
    };

    const updated = [...seats, createdSeat];
    persistSeats(updated);

    // If a registered member was chosen, update member.seat
    if (createdSeat.member && onUpdateMember) {
      const matchedM = members.find((m) => m.name === createdSeat.member);
      if (matchedM) {
        const existingSeats = matchedM.seat
          ? matchedM.seat.split(/[,+]/).map((s) => s.trim()).filter(Boolean)
          : [];
        if (!existingSeats.some((s) => s.toUpperCase() === createdSeat.id)) {
          existingSeats.push(createdSeat.id);
        }
        onUpdateMember({
          ...matchedM,
          seat: existingSeats.join(', '),
        });
      }
    }

    setIsAddModalOpen(false);
    showNotification(`✓ নতুন সিট ${createdSeat.id} সফলভাবে যুক্ত হয়েছে!`);
  };

  // Delete Seat
  const handleDeleteSeat = (seatToDelete) => {
    if (!seatToDelete) return;
    const occupant = getSeatOccupant(seatToDelete);
    const label = seatToDelete.label || `সিট ${seatToDelete.id}`;
    const desc = occupant ? ` (যাত্রী: ${occupant})` : '';
    const confirmDelete = window.confirm(
      `আপনি কি সত্যিই ${label}${desc} বাস প্ল্যান থেকে মুছে ফেলতে চান?`
    );
    if (!confirmDelete) return;

    const updated = seats.filter((s) => s.id !== seatToDelete.id);
    persistSeats(updated);

    // Remove from member assignment if registered member
    if (occupant && onUpdateMember) {
      const matchedM = members.find((m) => m.name === occupant);
      if (matchedM && matchedM.seat) {
        const remainingSeats = matchedM.seat
          .split(/[,+]/)
          .map((item) => item.trim())
          .filter((id) => id.toUpperCase() !== seatToDelete.id.toUpperCase());
        onUpdateMember({
          ...matchedM,
          seat: remainingSeats.join(', '),
        });
      }
    }

    if (selectedSeat?.id === seatToDelete.id) {
      setSelectedSeat(null);
    }
    showNotification(`🗑️ ${label} মুছে ফেলা হয়েছে!`);
  };

  // Unassign / Clear Occupant
  const handleClearOccupant = (seatToClear) => {
    if (!seatToClear) return;
    const currentOccupant = getSeatOccupant(seatToClear);
    const confirmClear = window.confirm(
      `আপনি কি নিশ্চিতভাবে ${seatToClear.label || seatToClear.id} এর যাত্রী (${
        currentOccupant || 'বর্তমান'
      }) মুছে সিটটি খালি করতে চান?`
    );
    if (!confirmClear) return;

    const updated = seats.map((s) => {
      if (s.id === seatToClear.id) {
        return { ...s, member: '', memberName: '' };
      }
      return s;
    });
    persistSeats(updated);

    // Clean member record if applicable
    if (currentOccupant && onUpdateMember) {
      const matchedM = members.find((m) => m.name === currentOccupant);
      if (matchedM && matchedM.seat) {
        const remainingSeats = matchedM.seat
          .split(/[,+]/)
          .map((item) => item.trim())
          .filter((id) => id.toUpperCase() !== seatToClear.id.toUpperCase());
        onUpdateMember({
          ...matchedM,
          seat: remainingSeats.join(', '),
        });
      }
    }

    if (selectedSeat?.id === seatToClear.id) {
      setSelectedSeat({ ...seatToClear, member: '', memberName: '' });
    }
    setIsEditingSeat(false);
    showNotification(`✓ ${seatToClear.label || seatToClear.id} খালি করা হয়েছে!`);
  };

  // Reset to Defaults
  const handleResetDefaults = () => {
    const confirmReset = window.confirm(
      'আপনি কি বাসের আসন তালিকা ডিফল্ট ২৪টি সিটে (১০টি স্লিপার ও ১৪টি বিজনেস) ফিরিয়ে নিতে চান?'
    );
    if (!confirmReset) return;

    persistSeats(DEFAULT_BUS_SEATS);
    showNotification('✓ বাসের আসন তালিকা ডিফল্ট ২৪টি সিটে রিসেট করা হয়েছে!');
  };

  // Save Edited Seat
  const handleSaveEditSeat = () => {
    if (!selectedSeat) return;

    let newName = '';
    if (editMemberId === '__empty__') {
      newName = '';
    } else if (editMemberId === '__custom__') {
      newName = customNameInput.trim();
    } else if (editMemberId) {
      const m = members.find((mem) => String(mem.id) === String(editMemberId));
      if (m) {
        newName = m.name;
        if (onUpdateMember) {
          const existingSeats = m.seat
            ? m.seat.split(/[,+]/).map((s) => s.trim()).filter(Boolean)
            : [];
          if (!existingSeats.some((s) => s.toUpperCase() === selectedSeat.id.toUpperCase())) {
            existingSeats.push(selectedSeat.id);
          }
          onUpdateMember({
            ...m,
            seat: existingSeats.join(', '),
          });
        }
      }
    }

    const updated = seats.map((s) => {
      if (s.id === selectedSeat.id) {
        return {
          ...s,
          member: newName,
          label: editSeatLabel.trim() || s.label,
          desc: editSeatDesc.trim() || s.desc,
        };
      }
      return s;
    });

    persistSeats(updated);
    setSelectedSeat((prev) =>
      prev
        ? {
            ...prev,
            member: newName,
            label: editSeatLabel.trim() || prev.label,
            desc: editSeatDesc.trim() || prev.desc,
          }
        : null
    );
    setIsEditingSeat(false);
    showNotification(
      newName
        ? `✓ সিট ${selectedSeat.id} "${newName}" এর নামে সংরক্ষণ হয়েছে!`
        : `✓ সিট ${selectedSeat.id} খালি হিসেবে সংরক্ষণ হয়েছে!`
    );
  };

  // Separate Decks
  const upperDeckSeats = seats.filter(
    (s) => s.deck === 'upper' || s.type === 'sleeper' || s.id.startsWith('S')
  );
  const lowerDeckSeats = seats.filter(
    (s) =>
      s.deck === 'lower' ||
      s.type === 'business' ||
      s.id.startsWith('B') ||
      !upperDeckSeats.some((u) => u.id === s.id)
  );

  const occupiedSeatsCount = seats.filter((s) => Boolean(getSeatOccupant(s))).length;
  const emptySeatsCount = seats.length - occupiedSeatsCount;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="p-3 bg-teal-50 border border-teal-200 text-teal-900 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in">
          <Sparkles size={16} className="text-teal-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Bus Header Card */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-cyan-900 text-white p-5 sm:p-6 rounded-3xl shadow-lg relative overflow-hidden border border-teal-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-amber-400 text-teal-950 text-xs font-bold rounded-full">
                Evergreen AC Bus
              </span>
              <span className="text-xs text-teal-200">স্লিপার ও বিজনেস ক্লাস</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Bus size={22} className="text-amber-300" /> এভারগ্রীন এসি বাসের ইন্টারেক্টিভ সিট ম্যাপ
            </h3>
            <p className="text-xs text-teal-100">
              রংপুর কামারপাড়া বাস স্ট্যান্ড (১৯ অক্টোবর, সন্ধ্যা ০৬:০০ টা) ➔ কক্সবাজার ডলফিন মোড়
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Deck Switcher */}
            <div className="flex items-center gap-1.5 bg-teal-950/60 p-1.5 rounded-2xl border border-teal-700">
              <button
                type="button"
                onClick={() => setActiveDeck('both')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeDeck === 'both'
                    ? 'bg-amber-400 text-teal-950 shadow-sm'
                    : 'text-teal-200 hover:bg-teal-800'
                }`}
              >
                উভয় ডেক
              </button>
              <button
                type="button"
                onClick={() => setActiveDeck('upper')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeDeck === 'upper'
                    ? 'bg-amber-400 text-teal-950 shadow-sm'
                    : 'text-teal-200 hover:bg-teal-800'
                }`}
              >
                আপার ({upperDeckSeats.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveDeck('lower')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeDeck === 'lower'
                    ? 'bg-amber-400 text-teal-950 shadow-sm'
                    : 'text-teal-200 hover:bg-teal-800'
                }`}
              >
                লোয়ার ({lowerDeckSeats.length})
              </button>
            </div>

            {/* Action Buttons: Add Seat & Reset */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-teal-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-md active:scale-95"
              >
                <Plus size={15} />
                <span>সিট যোগ করুন</span>
              </button>

              <button
                type="button"
                onClick={handleResetDefaults}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition cursor-pointer"
                title="ডিফল্ট ২৪টি সিটে রিসেট করুন"
              >
                <RotateCcw size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Legend & Stats */}
        <div className="mt-4 pt-3 border-t border-teal-700/60 flex flex-wrap items-center justify-between text-xs text-teal-200 gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-purple-200 border border-purple-400"></span> স্লিপার
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-blue-200 border border-blue-400"></span> বিজনেস
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-slate-200 border border-dashed border-slate-400"></span> খালি সিট
            </span>
            <span className="flex items-center gap-1.5 text-amber-300 font-medium hidden sm:inline-flex">
              💡 সিটে ট্যাপ করে বিস্তারিত বা ডিলিট করুন
            </span>
          </div>
          <span className="text-xs bg-white/10 px-2.5 py-0.5 rounded-md font-mono">
            মোট সিট: {seats.length}টি • বুকড: {occupiedSeatsCount}টি • খালি: {emptySeatsCount}টি
          </span>
        </div>
      </div>

      {/* Visual Bus Interior */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. UPPER DECK: SLEEPERS */}
        {(activeDeck === 'both' || activeDeck === 'upper') && (
          <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-base text-slate-800 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> আপার ডেক (Upper Deck Sleeper)
                </h4>
                <p className="text-[11px] text-slate-500">আরামদায়ক ডাবল ও সিঙ্গেল স্লিপার বার্থ</p>
              </div>
              <span className="text-xs bg-purple-50 text-purple-700 font-bold px-2.5 py-1 rounded-xl border border-purple-200">
                {upperDeckSeats.length}টি স্লিপার বার্থ
              </span>
            </div>

            {/* Bus Front Indicator */}
            <div className="w-full py-1.5 bg-slate-100 text-slate-500 text-[11px] font-bold text-center rounded-xl uppercase tracking-wider flex items-center justify-center gap-2">
              <Bus size={14} /> বাসের সম্মুখভাগ (ড্রাইভার কেবিন)
            </div>

            {/* Sleeper Layout Grid */}
            <div className="grid grid-cols-2 gap-3.5 pt-2">
              {upperDeckSeats.map((s) => {
                const occupant = getSeatOccupant(s);
                const colorClass = getFamilyColor(occupant);
                const isSelected = selectedSeat?.id === s.id;
                return (
                  <div
                    key={s.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${s.label}, ${occupant || 'খালি'}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.currentTarget.click();
                      }
                    }}
                    onClick={() => {
                      setSelectedSeat(s);
                      setIsEditingSeat(false);
                    }}
                    className={`p-3.5 rounded-2xl border-2 transition transform hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between min-h-[92px] shadow-2xs relative group ${colorClass} ${
                      isSelected ? 'ring-2 ring-teal-600 scale-[1.02]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs bg-white/80 px-2 py-0.5 rounded-md shadow-2xs">
                        {s.id}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500 font-medium">স্লিপার</span>
                        {/* Quick Delete button like Hotel Room */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSeat(s);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition shadow-xs cursor-pointer"
                          title="এই সিটটি মুছুন"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <h5 className={`font-bold text-xs leading-tight line-clamp-1 ${!occupant ? 'text-slate-400 italic font-normal' : ''}`}>
                        {occupant || 'খালি সিট'}
                      </h5>
                      <p className="text-[10px] opacity-75">{s.desc?.split('•')[1] || s.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {upperDeckSeats.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-400">
                আপার ডেকে কোনো সিট পাওয়া যায়নি।
              </div>
            )}
          </div>
        )}

        {/* 2. LOWER DECK: BUSINESS CLASS */}
        {(activeDeck === 'both' || activeDeck === 'lower') && (
          <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-base text-slate-800 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> লোয়ার ডেক (Lower Deck Business Class)
                </h4>
                <p className="text-[11px] text-slate-500">প্রশস্ত ও আরামদায়ক রিক্লাইনার সিট</p>
              </div>
              <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded-xl border border-blue-200">
                {lowerDeckSeats.length}টি বিজনেস সিট
              </span>
            </div>

            {/* Bus Front Indicator */}
            <div className="w-full py-1.5 bg-slate-100 text-slate-500 text-[11px] font-bold text-center rounded-xl uppercase tracking-wider flex items-center justify-center gap-2">
              <Bus size={14} /> বাসের সম্মুখভাগ (ড্রাইভার কেবিন)
            </div>

            {/* Business Layout Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              {lowerDeckSeats.map((s) => {
                const occupant = getSeatOccupant(s);
                const colorClass = getFamilyColor(occupant);
                const isSelected = selectedSeat?.id === s.id;
                return (
                  <div
                    key={s.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${s.label}, ${occupant || 'খালি'}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.currentTarget.click();
                      }
                    }}
                    onClick={() => {
                      setSelectedSeat(s);
                      setIsEditingSeat(false);
                    }}
                    className={`p-3 rounded-2xl border-2 transition transform hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between min-h-[85px] shadow-2xs relative group ${colorClass} ${
                      isSelected ? 'ring-2 ring-teal-600 scale-[1.02]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs bg-white/80 px-2 py-0.5 rounded-md shadow-2xs">
                        {s.id}
                      </span>
                      <div className="flex items-center gap-1">
                        <Armchair size={13} className="opacity-60" />
                        {/* Quick Delete button like Hotel Room */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSeat(s);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition shadow-xs cursor-pointer"
                          title="এই সিটটি মুছুন"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <h5 className={`font-bold text-xs leading-tight line-clamp-1 ${!occupant ? 'text-slate-400 italic font-normal' : ''}`}>
                        {occupant || 'খালি সিট'}
                      </h5>
                      <p className="text-[10px] opacity-75">{s.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {lowerDeckSeats.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-400">
                লোয়ার ডেকে কোনো সিট পাওয়া যায়নি।
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Seat Detail Modal */}
      {selectedSeat && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150 cursor-pointer"
          role="presentation"
          onClick={() => setSelectedSeat(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') e.currentTarget.click();
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150 cursor-auto space-y-4"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-mono font-bold text-sm">
                  {selectedSeat.id}
                </span>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">{selectedSeat.label}</h4>
                  <p className="text-[11px] text-slate-500">{selectedSeat.desc}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSeat(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Occupant Card */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-slate-400 font-medium">বরাদ্দকৃত সদস্য / পরিবার:</p>
                  {!isEditingSeat && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingSeat(true);
                        const cur = getSeatOccupant(selectedSeat);
                        const matchedM = members.find((m) => m.name === cur);
                        setEditMemberId(matchedM ? String(matchedM.id) : cur ? '__custom__' : '__empty__');
                        setCustomNameInput(matchedM ? '' : cur);
                        setEditSeatLabel(selectedSeat.label || '');
                        setEditSeatDesc(selectedSeat.desc || '');
                      }}
                      className="text-[11px] text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 cursor-pointer hover:underline"
                    >
                      <Edit3 size={12} /> এডিট / পরিবর্তন
                    </button>
                  )}
                </div>
                <h5 className="font-bold text-base text-slate-900">
                  {getSeatOccupant(selectedSeat) || (
                    <span className="text-slate-400 font-normal italic">খালি সিট (বরাদ্দ করা হয়নি)</span>
                  )}
                </h5>
              </div>

              {/* Seat reassignment & detail editor */}
              {isEditingSeat && (
                <div className="p-3 bg-teal-50/80 border border-teal-200 rounded-2xl space-y-2.5 animate-in fade-in duration-150">
                  <p className="text-xs font-bold text-teal-950 flex items-center gap-1">
                    <Edit3 size={13} className="text-teal-700" /> সিটের তথ্য ও যাত্রী পরিবর্তন ({selectedSeat.id})
                  </p>

                  <div className="space-y-1">
                    <label className="text-[10px] text-teal-900 font-semibold block">যাত্রী নির্বাচন:</label>
                    <select
                      value={editMemberId}
                      onChange={(e) => setEditMemberId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-teal-300 rounded-xl bg-white text-slate-800 font-medium cursor-pointer"
                    >
                      <option value="__empty__">❌ -- খালি সিট (কোন যাত্রী নেই) --</option>
                      <option value="">-- সদস্য তালিকা থেকে নির্বাচন করুন --</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.seat ? `(${m.seat})` : ''}
                        </option>
                      ))}
                      <option value="__custom__" className="text-teal-700 font-bold bg-teal-50">
                        ✍️ + নতুন কাস্টম নাম লিখুন...
                      </option>
                    </select>
                  </div>

                  {editMemberId === '__custom__' && (
                    <input
                      type="text"
                      placeholder="যাত্রী বা পরিবারের নাম লিখুন..."
                      value={customNameInput}
                      onChange={(e) => setCustomNameInput(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-teal-300 rounded-xl bg-white text-slate-800"
                      autoFocus
                    />
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-teal-900 font-semibold block">লেবেল:</label>
                      <input
                        type="text"
                        value={editSeatLabel}
                        onChange={(e) => setEditSeatLabel(e.target.value)}
                        placeholder="যেমন: স্লিপার S1"
                        className="w-full px-2.5 py-1.5 text-xs border border-teal-300 rounded-xl bg-white text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-teal-900 font-semibold block">বিবরণ:</label>
                      <input
                        type="text"
                        value={editSeatDesc}
                        onChange={(e) => setEditSeatDesc(e.target.value)}
                        placeholder="যেমন: বাম উইন্ডো"
                        className="w-full px-2.5 py-1.5 text-xs border border-teal-300 rounded-xl bg-white text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingSeat(false)}
                      className="flex-1 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      বাতিল
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEditSeat}
                      disabled={editMemberId === '__custom__' && !customNameInput.trim()}
                      className="flex-1 py-1.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
                    >
                      সংরক্ষণ করুন
                    </button>
                  </div>
                </div>
              )}

              {/* ACTION BUTTONS: Delete Seat & Clear Occupant (Matches Hotel Room Map) */}
              {!isEditingSeat && (
                <div className="flex items-center gap-2 pt-1">
                  {getSeatOccupant(selectedSeat) && (
                    <button
                      type="button"
                      onClick={() => handleClearOccupant(selectedSeat)}
                      className="flex-1 py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <span>যাত্রী খালি করুন</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteSeat(selectedSeat)}
                    className="flex-1 py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>সিট মুছুন</span>
                  </button>
                </div>
              )}

              {/* Journey Tip */}
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 text-xs text-amber-950 space-y-1 leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <Info size={14} /> বাস জার্নি টিপস:
                </div>
                <p>• ছাড়ার সময়: ১৯ অক্টোবর, সন্ধ্যা ০৬:০০ টা (কামারপাড়া)</p>
                <p>• বাসে এসির কারণে হালকা চাদর ও ঘাড়ের বালিশ সাথে রাখবেন।</p>
              </div>

              {/* Call Passenger */}
              {phoneForMember(members, selectedSeat.memberName ?? getSeatOccupant(selectedSeat)) && (
                <a
                  href={`tel:${phoneForMember(
                    members,
                    selectedSeat.memberName ?? getSeatOccupant(selectedSeat)
                  )}`}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition"
                >
                  <PhoneCall size={14} /> সদস্যকে সরাসরি কল করুন
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add New Seat Modal (Matches Hotel Room Map Add Modal) */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150 cursor-pointer"
          role="presentation"
          onClick={() => setIsAddModalOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsAddModalOpen(false);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150 cursor-auto space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <Plus size={18} className="text-teal-700" /> নতুন সিট যুক্ত করুন
              </h4>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSaveNewSeat} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    সিট নম্বর / আইডি *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: S11 বা B15"
                    value={newSeatData.id}
                    onChange={(e) => setNewSeatData({ ...newSeatData, id: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    ডেক নির্বাচন *
                  </label>
                  <select
                    value={newSeatData.deck}
                    onChange={(e) => {
                      const deck = e.target.value;
                      const type = deck === 'upper' ? 'sleeper' : 'business';
                      setNewSeatData({
                        ...newSeatData,
                        deck,
                        type,
                        label: deck === 'upper' ? `স্লিপার ${newSeatData.id}` : `বিজনেস ${newSeatData.id}`,
                      });
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white cursor-pointer"
                  >
                    <option value="upper">আপার ডেক (স্লিপার)</option>
                    <option value="lower">লোয়ার ডেক (বিজনেস)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    লেবেল
                  </label>
                  <input
                    type="text"
                    placeholder="যেমন: স্লিপার S11"
                    value={newSeatData.label}
                    onChange={(e) => setNewSeatData({ ...newSeatData, label: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    বিবরণ / অবস্থান
                  </label>
                  <input
                    type="text"
                    placeholder="যেমন: আপার ডেক • বাম উইন্ডো"
                    value={newSeatData.desc}
                    onChange={(e) => setNewSeatData({ ...newSeatData, desc: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  বরাদ্দকৃত যাত্রী (ঐচ্ছিক)
                </label>
                <select
                  value={newSeatData.member}
                  onChange={(e) => setNewSeatData({ ...newSeatData, member: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white cursor-pointer"
                >
                  <option value="">-- খালি সিট (কোন যাত্রী নেই) --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} {m.seat ? `(${m.seat})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-md"
                >
                  সিট সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
