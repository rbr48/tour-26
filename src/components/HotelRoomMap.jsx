import React, { useState } from 'react';
import {
  Hotel, Users, PhoneCall, Bed, Check, Sparkles,
  MapPin, Clock, Key, ShieldCheck, Wifi, Compass
} from 'lucide-react';

export default function HotelRoomMap({ members = [] }) {
  const [selectedFloor, setSelectedFloor] = useState('all');

  const ROOMS = [
    {
      roomNo: '301',
      floor: 3,
      type: 'ডাবল বেড এসি (সি-সাইড)',
      occupants: 'রাজু ভাই ও পরিবার (ট্যুর লিডার)',
      phone: '01711000000',
      beds: '১টি কিং সাইজ ডাবল বেড',
      view: 'সি-সাইড ভিউ',
      color: 'border-teal-300 bg-teal-50/50'
    },
    {
      roomNo: '302',
      floor: 3,
      type: 'ডাবল বেড এসি',
      occupants: 'লতিফ ভাই / খালু ও পরিবার (কুড়িগ্রাম)',
      phone: '01716000000',
      beds: '১টি কিং সাইজ ডাবল বেড',
      view: 'হোটেল ফ্রন্ট ভিউ',
      color: 'border-indigo-300 bg-indigo-50/50'
    },
    {
      roomNo: '401',
      floor: 4,
      type: 'ডিলাক্স ফ্যামিলি ৩-বেড এসি',
      occupants: 'মাসুদ ভাই ও পরিবার (এসবিএল)',
      phone: '01712000000',
      beds: '১টি ডাবল + ১টি সিঙ্গেল বেড',
      view: 'ব্যালকনি ভিউ',
      color: 'border-blue-300 bg-blue-50/50'
    },
    {
      roomNo: '402',
      floor: 4,
      type: 'ডিলাক্স ফ্যামিলি ৩-বেড এসি',
      occupants: 'শশি ভাই ও পরিবার (সচিবুল ভাই)',
      phone: '01714000000',
      beds: '১টি ডাবল + ১টি সিঙ্গেল বেড',
      view: 'ব্যালকনি ভিউ',
      color: 'border-amber-300 bg-amber-50/50'
    },
    {
      roomNo: '501',
      floor: 5,
      type: 'সুইট ফ্যামিলি ৪-বেড এসি',
      occupants: 'আশেক মো: আসিফ ভাই ও পরিবার',
      phone: '01713000000',
      beds: '২টি কিং সাইজ ডাবল বেড',
      view: 'প্রিমিয়াম সি-ভিউ',
      color: 'border-purple-300 bg-purple-50/50'
    },
    {
      roomNo: '502',
      floor: 5,
      type: 'ডিলাক্স ফ্যামিলি ৩-বেড এসি',
      occupants: 'নুরুজ্জামান ভাই ও পরিবার',
      phone: '01715000000',
      beds: '১টি ডাবল + ১টি সিঙ্গেল বেড',
      view: 'ব্যালকনি ভিউ',
      color: 'border-emerald-300 bg-emerald-50/50'
    },
    {
      roomNo: '601',
      floor: 6,
      type: 'ডাবল বেড এসি',
      occupants: 'আলিম ভাই ও পরিবার',
      phone: '01717000000',
      beds: '১টি কিং সাইজ ডাবল বেড',
      view: 'উইন্ডো ভিউ',
      color: 'border-cyan-300 bg-cyan-50/50'
    },
    {
      roomNo: '602',
      floor: 6,
      type: 'ডাবল বেড এসি',
      occupants: 'সাইফুল ভাই / জামাই ও পরিবার',
      phone: '01718000000',
      beds: '১টি কিং সাইজ ডাবল বেড',
      view: 'উইন্ডো ভিউ',
      color: 'border-rose-300 bg-rose-50/50'
    },
    {
      roomNo: '701',
      floor: 7,
      type: 'ডাবল বেড সি-ভিউ এসি',
      occupants: 'এম এস রানা ভাই ও পরিবার (বিকেবি)',
      phone: '01737910040',
      beds: '১টি কিং সাইজ ডাবল বেড',
      view: 'টপ ফ্লোর সি-ভিউ',
      color: 'border-sky-300 bg-sky-50/50'
    },
    {
      roomNo: '702',
      floor: 7,
      type: 'টুইন বেড সি-ভিউ এসি',
      occupants: 'আলমগীর ভাই ও মিডিয়া টিম',
      phone: '01720000000',
      beds: '২টি আরামদায়ক সিঙ্গেল বেড',
      view: 'টপ ফ্লোর সি-ভিউ',
      color: 'border-orange-300 bg-orange-50/50'
    }
  ];

  const filteredRooms = selectedFloor === 'all'
    ? ROOMS
    : ROOMS.filter(r => r.floor === Number(selectedFloor));

  return (
    <div className="space-y-6">
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
        </div>

        {/* Floor Filter Tabs */}
        <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-teal-700/60">
          <span className="text-xs text-teal-200 font-semibold mr-1">ফ্লোর ফিল্টার:</span>
          {['all', 3, 4, 5, 6, 7].map(fl => (
            <button
              key={fl}
              onClick={() => setSelectedFloor(fl)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedFloor === fl
                  ? 'bg-amber-400 text-teal-950 shadow-sm'
                  : 'bg-teal-950/60 text-teal-200 hover:bg-teal-800 border border-teal-700/60'
              }`}
            >
              {fl === 'all' ? 'সব ফ্লোর (১০টি রুম)' : `${fl}ম তলা`}
            </button>
          ))}
        </div>
      </div>

      {/* Hotel Amenities Info Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 bg-white rounded-2xl border border-slate-100 flex items-center gap-2.5 text-slate-700">
          <Key size={16} className="text-teal-600" />
          <span>রিসিপশনে মূল NID কার্ড প্রদর্শন</span>
        </div>
        <div className="p-3 bg-white rounded-2xl border border-slate-100 flex items-center gap-2.5 text-slate-700">
          <Wifi size={16} className="text-teal-600" />
          <span>ফ্রি হাই-স্পিড ওয়াইফাই</span>
        </div>
        <div className="p-3 bg-white rounded-2xl border border-slate-100 flex items-center gap-2.5 text-slate-700">
          <Compass size={16} className="text-teal-600" />
          <span>সুগন্ধা ও কলাতলী বিচ সংলগ্ন</span>
        </div>
        <div className="p-3 bg-white rounded-2xl border border-slate-100 flex items-center gap-2.5 text-slate-700">
          <ShieldCheck size={16} className="text-teal-600" />
          <span>২৪/৭ সিকিউরিটি ও পাওয়ার ব্যাকআপ</span>
        </div>
      </div>

      {/* Rooms Visual Floor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRooms.map(room => (
          <div
            key={room.roomNo}
            className={`p-5 rounded-3xl border-2 transition transform hover:-translate-y-0.5 shadow-2xs space-y-3.5 ${room.color}`}
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

              <span className="text-xs bg-white/90 text-slate-600 px-2 py-1 rounded-xl border border-slate-200/80 font-medium">
                {room.beds}
              </span>
            </div>

            <div className="p-3 bg-white/90 rounded-2xl border border-slate-100 space-y-1">
              <p className="text-[11px] text-slate-400 font-medium">রুম বরাদ্দপ্রাপ্ত পরিবার:</p>
              <h5 className="font-bold text-sm text-slate-800">{room.occupants}</h5>
            </div>

            {room.phone && (
              <a
                href={`tel:${room.phone}`}
                className="w-full py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-2xs transition"
              >
                <PhoneCall size={13} className="text-teal-700" /> রুমের প্রতিনিধির সাথে যোগাযোগ
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
