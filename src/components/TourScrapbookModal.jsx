import React, { useRef } from 'react';
import { triggerHaptic } from '../utils/haptics';
import { printDocument } from '../utils/printHelper';
import { resolveMediaUrl } from '../utils/videoHelper';
import {
  Award,
  BookOpen,
  Calendar,
  Camera,
  Coins,
  Download,
  Heart,
  MapPin,
  Printer,
  Sparkles,
  Users,
  X,
} from 'lucide-react';

const toBn = (n) => String(n ?? 0).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);

export default function TourScrapbookModal({
  isOpen,
  onClose,
  members = [],
  expenses = [],
  posts = [],
  itinerary = [],
}) {
  const contentRef = useRef(null);

  if (!isOpen) return null;

  // Compute key highlights
  const totalExpensePaisa = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalExpenseTaka = Math.round(totalExpensePaisa / 100);

  const photosWithImages = posts.filter((p) => p.thumb || p.fullUrl || p.mediaUrl);
  const samplePhotos = photosWithImages.slice(0, 8);

  const handlePrint = async () => {
    triggerHaptic('medium');
    await printDocument({ name: 'Tour2026_Family_Scrapbook_Magazine' });
  };

  return (
    <div id="tour-scrapbook-backdrop" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in print:p-0 print:bg-white print:static print:overflow-visible">
      <div id="tour-scrapbook-modal" className="bg-slate-900 border border-slate-800 w-full max-w-3xl max-h-[92vh] print:max-h-none print:h-auto print:border-none print:bg-white print:text-black rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-slide-up">
        {/* Header - Screen Only */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-600 via-rose-700 to-indigo-800 text-white flex items-center justify-between shrink-0 shadow-md print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner border border-white/20">
              📖
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>ডিজিটাল ফ্যামিলি স্ক্র্যাপবুক ও বুকলেট</span>
                <span className="text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-extrabold uppercase">
                  স্মৃতিচিহ্ন
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-white/80">
                ট্যুরের স্মরণীয় মুহূর্ত, পরিসংখ্যান ও প্রিন্টযোগ্য বুকলেট
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-white text-slate-950 hover:bg-slate-100 text-xs font-black flex items-center gap-1.5 shadow transition"
              title="প্রিন্ট বা PDF হিসেবে সংরক্ষণ"
            >
              <Printer className="w-4 h-4 text-amber-600" />
              <span className="hidden sm:inline">প্রিন্ট / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-black/20 hover:bg-black/30 text-white/90 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable & Scrollable Magazine Content */}
        <div
          ref={contentRef}
          id="tour-scrapbook-content" className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 print:p-6 print:overflow-visible print:space-y-6"
        >
          {/* Magazine Cover Section */}
          <div className="text-center py-6 sm:py-8 border-b border-slate-800 print:border-black/20 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent rounded-3xl p-4">
            <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400 print:text-amber-700">
              FAMILY MEMORIES & COMMEMORATIVE ALBUM
            </span>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-100 print:text-black mt-1">
              রংপুর ➔ কক্সবাজার ফ্যামিলি ট্যুর ২০২৬
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 print:text-gray-600 mt-2 max-w-md mx-auto leading-relaxed">
              সাগরপাড়ে আনন্দঘন পদচারণা, নীল ঢেউয়ের গান এবং অটুট পারিবারিক ভালোবাসার এক অনবদ্য স্মৃতিমালা।
            </p>
            <div className="flex items-center justify-center gap-4 mt-3 text-xs text-slate-300 print:text-gray-700 font-medium">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-400 print:text-amber-700" />
                ১৮ — ২৩ অক্টোবর ২০২৬
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-400 print:text-rose-700" />
                হোটেল সি মুন, কলাতলী, কক্সবাজার
              </span>
            </div>
          </div>

          {/* Trip Statistics Infographic Grid */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 print:text-gray-500 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>ট্যুরের পরিসংখ্যান ও অর্জন</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-800/60 print:bg-gray-100 border border-slate-700/60 print:border-gray-300 rounded-2xl p-3.5 text-center break-inside-avoid print:break-inside-avoid">
                <div className="text-xl sm:text-2xl font-black text-amber-400 print:text-amber-800">
                  {toBn(820)} কিমি
                </div>
                <div className="text-[11px] text-slate-400 print:text-gray-600 font-medium mt-0.5">
                  মোট মহাসড়ক পথ
                </div>
              </div>

              <div className="bg-slate-800/60 print:bg-gray-100 border border-slate-700/60 print:border-gray-300 rounded-2xl p-3.5 text-center break-inside-avoid print:break-inside-avoid">
                <div className="text-xl sm:text-2xl font-black text-teal-400 print:text-teal-800">
                  {toBn(members.length)} জন
                </div>
                <div className="text-[11px] text-slate-400 print:text-gray-600 font-medium mt-0.5">
                  পরিবারের সদস্য
                </div>
              </div>

              <div className="bg-slate-800/60 print:bg-gray-100 border border-slate-700/60 print:border-gray-300 rounded-2xl p-3.5 text-center break-inside-avoid print:break-inside-avoid">
                <div className="text-xl sm:text-2xl font-black text-rose-400 print:text-rose-800">
                  {toBn(photosWithImages.length)} টি
                </div>
                <div className="text-[11px] text-slate-400 print:text-gray-600 font-medium mt-0.5">
                  ক্যামেরার ক্লিক ও ছবি
                </div>
              </div>

              <div className="bg-slate-800/60 print:bg-gray-100 border border-slate-700/60 print:border-gray-300 rounded-2xl p-3.5 text-center break-inside-avoid print:break-inside-avoid">
                <div className="text-xl sm:text-2xl font-black text-indigo-400 print:text-indigo-800">
                  ৬ দিন ৫ রাত
                </div>
                <div className="text-[11px] text-slate-400 print:text-gray-600 font-medium mt-0.5">
                  ট্যুরের সময়কাল
                </div>
              </div>
            </div>
          </div>

          {/* Photo Memory Collage */}
          {samplePhotos.length > 0 && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 print:text-gray-500 mb-3 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-rose-400" />
                <span>ফটো মেমরি ওয়াল (ছবিসমূহ)</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {samplePhotos.map((p, idx) => (
                  <div
                    key={p.id || idx}
                    className="bg-slate-800/80 print:bg-gray-50 border border-slate-700 print:border-gray-300 rounded-xl overflow-hidden shadow-sm break-inside-avoid print:break-inside-avoid"
                  >
                    <div className="aspect-square bg-slate-900 overflow-hidden">
                      <img
                        src={resolveMediaUrl(p.thumb || p.fullUrl || p.mediaUrl, p.driveFileId)}
                        alt={p.caption || 'ট্যুর ছবি'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    {p.caption && (
                      <p className="p-2 text-[10px] text-slate-300 print:text-gray-700 truncate">
                        {p.caption}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Family Roll of Honor Directory */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 print:text-gray-500 mb-3 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>ট্যুর সদস্য পরিচিতি ও রোল অব অনার</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {members.map((m, idx) => (
                <div
                  key={m.id || idx}
                  className="bg-slate-800/40 print:bg-white border border-slate-700/60 print:border-gray-200 rounded-xl p-2.5 flex items-center justify-between break-inside-avoid print:break-inside-avoid"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-700 print:bg-gray-200 flex items-center justify-center text-[10px] font-bold text-slate-300 print:text-gray-700">
                      {toBn(idx + 1)}
                    </span>
                    <div>
                      <div className="font-bold text-slate-200 print:text-black">{m.name}</div>
                      <div className="text-[10px] text-slate-400 print:text-gray-500">
                        {m.role === 'coordinator' ? 'ট্যুর কো-অর্ডিনেটর' : m.category || 'সম্মানিত সদস্য'}
                      </div>
                    </div>
                  </div>
                  {m.role === 'coordinator' && (
                    <span className="text-[9px] px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 print:text-amber-800 font-bold border border-amber-400/30">
                      কো-অর্ডিনেটর
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Commemorative Keepsake Quote Footer */}
          <div className="text-center py-6 border-t border-slate-800 print:border-gray-300 mt-6">
            <Heart className="w-5 h-5 text-rose-500 mx-auto mb-1.5 fill-rose-500" />
            <p className="text-xs font-bold text-slate-200 print:text-black">
              "দূরত্ব যতই হোক, আমাদের পরিবারের বন্ধন চিরন্তন।"
            </p>
            <p className="text-[10px] text-slate-400 print:text-gray-500 mt-1">
              রংপুর ➔ কক্সবাজার ট্যুর ২০২৬ • হোটেল সি মুন • ডিজিটাল পারিবারিক প্রকাশনা
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
