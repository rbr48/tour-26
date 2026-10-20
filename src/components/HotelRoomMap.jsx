import React, { useState, useEffect } from 'react';
import {
  Hotel,
  PhoneCall,
  MapPin,
  Key,
  ShieldCheck,
  Wifi,
  Compass,
  Plus,
  Edit3,
  Trash2,
  X,
  Check,
  RotateCcw,
  Sparkles,
  Bed,
  Layers,
} from 'lucide-react';
import { phoneForMember } from '../utils/members';
import { syncHotelRoomsWithMembers, extractRooms } from '../utils/syncHelpers';

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

const COLOR_OPTIONS = [
  { label: 'টিয়াল', value: 'border-teal-300 bg-teal-50/50' },
  { label: 'ইন্ডিগো', value: 'border-indigo-300 bg-indigo-50/50' },
  { label: 'ব্লু', value: 'border-blue-300 bg-blue-50/50' },
  { label: 'অ্যাম্বার', value: 'border-amber-300 bg-amber-50/50' },
  { label: 'পার্পল', value: 'border-purple-300 bg-purple-50/50' },
  { label: 'এমারেল্ড', value: 'border-emerald-300 bg-emerald-50/50' },
  { label: 'সায়ান', value: 'border-cyan-300 bg-cyan-50/50' },
  { label: 'রোজ', value: 'border-rose-300 bg-rose-50/50' },
  { label: 'স্কাই', value: 'border-sky-300 bg-sky-50/50' },
  { label: 'অরেঞ্জ', value: 'border-orange-300 bg-orange-50/50' },
];

export default function HotelRoomMap({ members = [], rooms: externalRooms, isAdmin = false, onUpdateRooms, onUpdateMember }) {
  const [selectedFloor, setSelectedFloor] = useState('all');

  const [rooms, setRooms] = useState(() => {
    const base = Array.isArray(externalRooms) && externalRooms.length > 0 ? externalRooms : DEFAULT_ROOMS;
    return Array.isArray(members) && members.length > 0 ? syncHotelRoomsWithMembers(base, members) : base;
  });

  // Sync with Firestore externalRooms updates & live members
  useEffect(() => {
    const baseRooms = Array.isArray(externalRooms) && externalRooms.length > 0 ? externalRooms : rooms;
    if (Array.isArray(members) && members.length > 0) {
      const synced = syncHotelRoomsWithMembers(baseRooms, members);
      setRooms(synced);
    } else if (Array.isArray(externalRooms) && externalRooms.length > 0) {
      setRooms(externalRooms);
    }
  }, [externalRooms, members]);

  // Modal State for Add / Edit
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit' | null
  const [editingRoomIndex, setEditingRoomIndex] = useState(-1);
  const [roomFormData, setRoomFormData] = useState({
    roomNo: '',
    floor: 3,
    type: 'ডাবল বেড এসি',
    occupants: '',
    memberName: '',
    beds: '১টি কিং সাইজ ডাবল বেড',
    view: 'সি-সাইড ভিউ',
    color: 'border-teal-300 bg-teal-50/50',
  });
  const [notification, setNotification] = useState('');

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  const persistRooms = (updatedRooms) => {
    setRooms(updatedRooms);
    try {
      localStorage.setItem('tour_hotel_rooms', JSON.stringify(updatedRooms));
    } catch {}
    onUpdateRooms?.(updatedRooms);
  };

  // Open Add Room Modal
  const handleOpenAddModal = () => {
    setRoomFormData({
      roomNo: '',
      floor: 3,
      type: 'ডাবল বেড এসি',
      occupants: '',
      memberName: '',
      beds: '১টি কিং সাইজ ডাবল বেড',
      view: 'সি-সাইড ভিউ',
      color: 'border-teal-300 bg-teal-50/50',
    });
    setEditingRoomIndex(-1);
    setModalMode('add');
  };

  // Open Edit Room Modal
  const handleOpenEditModal = (room, idx) => {
    setRoomFormData({
      roomNo: room.roomNo || '',
      floor: Number(room.floor) || 3,
      type: room.type || '',
      occupants: room.occupants || '',
      memberName: room.memberName || '',
      beds: room.beds || '',
      view: room.view || '',
      color: room.color || 'border-teal-300 bg-teal-50/50',
    });
    setEditingRoomIndex(idx);
    setModalMode('edit');
  };

  // Save Room (Add or Edit)
  const handleSaveRoom = (e) => {
    e.preventDefault();
    if (!roomFormData.roomNo.trim()) {
      alert('রুম নম্বর দিন');
      return;
    }

    const newRoomItem = {
      ...roomFormData,
      roomNo: roomFormData.roomNo.trim(),
      floor: Number(roomFormData.floor) || 3,
      type: roomFormData.type.trim(),
      occupants: roomFormData.occupants.trim(),
      memberName: roomFormData.memberName.trim(),
      beds: roomFormData.beds.trim(),
      view: roomFormData.view.trim(),
    };

    let updated;
    if (modalMode === 'edit' && editingRoomIndex >= 0) {
      updated = rooms.map((r, i) => (i === editingRoomIndex ? newRoomItem : r));
      showNotification(`✓ রুম ${newRoomItem.roomNo} এর তথ্য সফলভাবে আপডেট হয়েছে!`);
    } else {
      updated = [...rooms, newRoomItem];
      showNotification(`✓ নতুন রুম ${newRoomItem.roomNo} সফলভাবে যুক্ত হয়েছে!`);
    }

    persistRooms(updated);
    setModalMode(null);
  };

  // Delete Room
  const handleDeleteRoom = (room, idx) => {
    const confirmDelete = window.confirm(`আপনি কি সত্যিই রুম ${room.roomNo} (${room.occupants}) তালিকা থেকে মুছে ফেলতে চান?`);
    if (!confirmDelete) return;

    const updated = rooms.filter((_, i) => i !== idx);
    persistRooms(updated);
    showNotification(`🗑️ রুম ${room.roomNo} মুছে ফেলা হয়েছে!`);
  };

  // Reset to Defaults
  const handleResetDefaults = () => {
    const confirmReset = window.confirm('আপনি কি রুমের তালিকা ডিফল্ট ১০টি রুমে ফিরিয়ে নিতে চান?');
    if (!confirmReset) return;

    persistRooms(DEFAULT_ROOMS);
    showNotification('✓ হোটেল রুমের তালিকা ডিফল্ট ১০টি রুমে রিসেট করা হয়েছে!');
  };

  // Dynamic floors calculation for filter buttons
  const availableFloors = Array.from(new Set(rooms.map((r) => Number(r.floor) || 3))).sort((a, b) => a - b);

  const filteredRooms = selectedFloor === 'all'
    ? rooms
    : rooms.filter((r) => Number(r.floor) === Number(selectedFloor));

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="p-3 bg-teal-50 border border-teal-200 text-teal-900 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in">
          <Sparkles size={16} className="text-teal-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Hotel Meta Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-cyan-900 to-slate-900 text-white p-5 sm:p-6 rounded-3xl shadow-lg border border-teal-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="px-2.5 py-0.5 bg-amber-400 text-teal-950 text-xs font-bold rounded-full inline-block">
              হোটেল আবাসন বুকিং
            </span>
            <h3 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Hotel size={22} className="text-amber-300" /> হোটেল সি মুন (Hotel Sea Moon)
            </h3>
            <p className="text-xs text-teal-100 flex items-center gap-1.5">
              <MapPin size={13} className="text-amber-300" /> কলাতলী মেইন রোড, কক্সবাজার (সৈকত থেকে মাত্র ২ মিনিট দূরত্ব)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-xs bg-black/30 p-2.5 rounded-2xl border border-white/10">
              <div>
                <p className="text-[10px] text-teal-200">চেক-ইন:</p>
                <p className="font-bold text-white">২০ অক্টো, ১২:০০ PM</p>
              </div>
              <div className="w-px h-6 bg-white/20"></div>
              <div>
                <p className="text-[10px] text-teal-200">চেক-আউট:</p>
                <p className="font-bold text-white">২৩ অক্টো, ০২:৩০ PM</p>
              </div>
            </div>

            {/* Action Buttons: Add Room & Reset */}
            {isAdmin && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-teal-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-md active:scale-95"
                >
                  <Plus size={15} />
                  <span>রুম যোগ করুন</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition cursor-pointer"
                  title="ডিফল্ট ১০টি রুমে রিসেট করুন"
                >
                  <RotateCcw size={15} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Floor Filter Tabs */}
        <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-teal-700/60">
          <span className="text-xs text-teal-200 font-semibold mr-1 flex items-center gap-1">
            <Layers size={13} /> ফ্লোর ফিল্টার:
          </span>
          <button
            onClick={() => setSelectedFloor('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              selectedFloor === 'all'
                ? 'bg-amber-400 text-teal-950 shadow-sm'
                : 'bg-teal-950/60 text-teal-200 hover:bg-teal-800 border border-teal-700/60'
            }`}
          >
            সব ফ্লোর ({rooms.length}টি রুম)
          </button>
          {availableFloors.map((fl) => (
            <button
              key={fl}
              onClick={() => setSelectedFloor(fl)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedFloor === fl
                  ? 'bg-amber-400 text-teal-950 shadow-sm'
                  : 'bg-teal-950/60 text-teal-200 hover:bg-teal-800 border border-teal-700/60'
              }`}
            >
              {fl}ম তলা
            </button>
          ))}
        </div>
      </div>

      {/* Hotel Amenities Info Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 bg-white rounded-2xl border border-slate-100 flex items-center gap-2.5 text-slate-700 shadow-2xs">
          <Key size={16} className="text-teal-600" />
          <span>রিসিপশনে মূল NID কার্ড প্রদর্শন</span>
        </div>
        <div className="p-3 bg-white rounded-2xl border border-slate-100 flex items-center gap-2.5 text-slate-700 shadow-2xs">
          <Wifi size={16} className="text-teal-600" />
          <span>ফ্রি হাই-স্পিড ওয়াইফাই</span>
        </div>
        <div className="p-3 bg-white rounded-2xl border border-slate-100 flex items-center gap-2.5 text-slate-700 shadow-2xs">
          <Compass size={16} className="text-teal-600" />
          <span>সুগন্ধা ও কলাতলী বিচ সংলগ্ন</span>
        </div>
        <div className="p-3 bg-white rounded-2xl border border-slate-100 flex items-center gap-2.5 text-slate-700 shadow-2xs">
          <ShieldCheck size={16} className="text-teal-600" />
          <span>২৪/৭ সিকিউরিটি ও পাওয়ার ব্যাকআপ</span>
        </div>
      </div>

      {/* Rooms Visual Floor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRooms.map((room, idx) => (
          <div
            key={`${room.roomNo}_${idx}`}
            className={`p-5 rounded-3xl border-2 transition transform hover:-translate-y-0.5 shadow-2xs space-y-3.5 relative group ${room.color}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center font-mono font-extrabold text-base text-slate-800">
                  {room.roomNo}
                </span>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{room.floor}ম তলা • {room.type}</h4>
                  <span className="text-[10px] font-semibold text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded-md">
                    {room.view}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs bg-white/90 text-slate-600 px-2 py-1 rounded-xl border border-slate-200/80 font-medium">
                  {room.beds}
                </span>

                {/* Edit & Delete Action Buttons */}
                {isAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(room, idx)}
                      className="p-1.5 bg-white/90 hover:bg-teal-50 text-slate-600 hover:text-teal-700 rounded-lg border border-slate-200 transition cursor-pointer"
                      title="রুমের তথ্য এডিট করুন"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRoom(room, idx)}
                      className="p-1.5 bg-white/90 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg border border-slate-200 transition cursor-pointer"
                      title="রুমটি তালিকা থেকে মুছুন"
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="p-3 bg-white/90 rounded-2xl border border-slate-100 space-y-1">
              <p className="text-[11px] text-slate-400 font-medium">রুম বরাদ্দপ্রাপ্ত পরিবার:</p>
              <h5 className="font-bold text-sm text-slate-800">{room.occupants || 'বরাদ্দ করা হয়নি'}</h5>
            </div>

            {(room.memberPhone || phoneForMember(members, room.memberName)) && (
              <a
                href={`tel:${room.memberPhone || phoneForMember(members, room.memberName)}`}
                className="w-full py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-2xs transition"
              >
                <PhoneCall size={13} className="text-teal-700" /> রুমের প্রতিনিধির সাথে যোগাযোগ ({room.memberName})
              </a>
            )}
          </div>
        ))}
      </div>

      {filteredRooms.length === 0 && (
        <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 p-6 space-y-3">
          <Hotel size={40} className="mx-auto text-slate-300" />
          <p className="text-sm font-semibold text-slate-600">এই ফ্লোরে কোনো রুম পাওয়া যায়নি</p>
          <button
            onClick={() => setSelectedFloor('all')}
            className="px-4 py-2 bg-teal-800 text-white text-xs font-bold rounded-xl"
          >
            সব রুম দেখুন
          </button>
        </div>
      )}

      {/* EDIT / ADD ROOM MODAL (Admin Only) */}
      {isAdmin && modalMode && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
          role="presentation"
          onClick={() => setModalMode(null)}
          onKeyDown={(e) => { if (e.key === 'Escape') setModalMode(null); }}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden my-auto border border-slate-100 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-teal-900 text-white flex items-center justify-between">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <Hotel size={16} className="text-amber-300" />
                {modalMode === 'edit' ? `রুম ${roomFormData.roomNo} এডিট করুন` : 'নতুন হোটেল রুম যোগ করুন'}
              </h4>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="p-1 rounded-full hover:bg-white/20 text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">রুম নম্বর *</label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: 301, 801"
                    value={roomFormData.roomNo}
                    onChange={(e) => setRoomFormData({ ...roomFormData, roomNo: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">ফ্লোর / তলা *</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    placeholder="যেমন: 3, 4"
                    value={roomFormData.floor}
                    onChange={(e) => setRoomFormData({ ...roomFormData, floor: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">রুমের ধরন</label>
                <input
                  type="text"
                  placeholder="যেমন: ডাবল বেড এসি, ডিলাক্স ফ্যামিলি ৩-বেড এসি"
                  value={roomFormData.type}
                  onChange={(e) => setRoomFormData({ ...roomFormData, type: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">বেড সুবিধা</label>
                  <input
                    type="text"
                    placeholder="১টি কিং সাইজ ডাবল বেড"
                    value={roomFormData.beds}
                    onChange={(e) => setRoomFormData({ ...roomFormData, beds: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">রুম ভিউ</label>
                  <input
                    type="text"
                    placeholder="সি-সাইড ভিউ, ব্যালকনি ভিউ"
                    value={roomFormData.view}
                    onChange={(e) => setRoomFormData({ ...roomFormData, view: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">রুম বরাদ্দপ্রাপ্ত পরিবার / সদস্যগণ</label>
                <input
                  type="text"
                  placeholder="যেমন: রাজু ভাই ও পরিবার (ট্যুর লিডার)"
                  value={roomFormData.occupants}
                  onChange={(e) => setRoomFormData({ ...roomFormData, occupants: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">রুমের প্রতিনিধি সদস্য (কল সুবিধার জন্য)</label>
                <select
                  value={roomFormData.memberName}
                  onChange={(e) => setRoomFormData({ ...roomFormData, memberName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                >
                  <option value="">সদস্য বাছাই করুন</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} {m.phone ? `(${m.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">কার্ডের কালার থিম</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setRoomFormData({ ...roomFormData, color: c.value })}
                      className={`p-1.5 text-[10px] font-semibold rounded-lg border text-center transition ${
                        roomFormData.color === c.value
                          ? 'ring-2 ring-teal-600 font-bold border-teal-600 shadow-xs'
                          : 'border-slate-200'
                      } ${c.value}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-md active:scale-95"
                >
                  {modalMode === 'edit' ? 'রুম আপডেট করুন' : 'রুম সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
