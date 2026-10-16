import React, { useEffect } from 'react';
import { Printer, Download, X, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

export default function PrintableReport({
  tourInfo = {},
  members = [],
  expenses = [],
  onClose
}) {
  const totalDeposit = members.reduce((sum, m) => sum + Number(m.deposit || 0), 0);
  const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const remaining = totalDeposit - totalExpense;
  const totalHeadcount = members.reduce((sum, m) => sum + (Number(m.familyCount) || 1), 0);
  const perHead = totalHeadcount > 0 ? Math.round(totalExpense / totalHeadcount) : 0;

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // COMPLETE & FLAWLESS UTF-8 CSV EXPORT (With BOM so Excel renders Bangla perfectly)
  const handleExportCSV = () => {
    let csv = "";

    // 1. TOUR TITLE & METADATA
    csv += `"রংপুর ➔ কক্সবাজার ফ্যামিলি ট্যুর ২০২৬ - অফিশিয়াল হিসাব ও অডিট বিবরণী"\n`;
    csv += `"ভ্রমণকাল","${tourInfo.duration || '২৩ অক্টোবর ২০২৬ – ২৬ অক্টোবর ২০২৬'}"\n`;
    csv += `"প্রধান পরিবহন","${tourInfo.busName || 'এভারগ্রীন এসি বাস'}"\n`;
    csv += `"আবাসন / হোটেল","${tourInfo.hotelName || 'হোটেল সি মুন'}"\n`;
    csv += `"রিপোর্ট তৈরির তারিখ","${new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}"\n`;
    csv += `\n`;

    // 2. FINANCIAL AUDIT SUMMARY
    csv += `"================== আর্থিক সারসংক্ষেপ (FINANCIAL AUDIT SUMMARY) ================="\n`;
    csv += `"বিবরণ","পরিমাণ (টাকা)"\n`;
    csv += `"মোট সংগৃহীত জমা ফান্ড","${totalDeposit}"\n`;
    csv += `"সর্বমোট মোট খরচ","${totalExpense}"\n`;
    csv += `"অবশিষ্ট উদ্বৃত্ত ফান্ড","${remaining}"\n`;
    csv += `"মোট সদস্য সংখ্যা (হেডকাউন্ট)","${totalHeadcount} জন"\n`;
    csv += `"মাথাপিছু গড় ব্যয়","${perHead}"\n`;
    csv += `\n`;

    // 3. EXPENSE BREAKDOWN BY CATEGORY
    csv += `"================== খাতভিত্তিক খরচের সারসংক্ষেপ (CATEGORY BREAKDOWN) ================="\n`;
    csv += `"খাত","মোট ব্যয় (টাকা)","শতকরা অনুপাত (%)"\n`;
    const catMap = {};
    expenses.forEach(e => {
      const c = e.category || 'অন্যান্য';
      catMap[c] = (catMap[c] || 0) + Number(e.amount || 0);
    });
    Object.entries(catMap).forEach(([cat, amt]) => {
      const pct = totalExpense > 0 ? ((amt / totalExpense) * 100).toFixed(1) : 0;
      csv += `"${cat}","${amt}","${pct}%"\n`;
    });
    csv += `\n`;

    // 4. DETAILED EXPENSE LEDGER
    csv += `"================== ১. খরচের সম্পূর্ণ বিবরণী (EXPENSES LEDGER) ================="\n`;
    csv += `"ক্রমিক নং","তারিখ","সময়","খাত","খরচের বিবরণ","বিল পরিশোধক","পরিমাণ (টাকা)"\n`;
    expenses.forEach((e, idx) => {
      csv += `"${idx + 1}","${e.date || ''}","${e.time || ''}","${e.category || ''}","${(e.title || '').replace(/"/g, '""')}","${e.paidBy || 'ট্যুর ফান্ড'}","${e.amount || 0}"\n`;
    });
    csv += `"","","","","সর্বমোট ব্যয়:","","${totalExpense}"\n`;
    csv += `\n`;

    // 5. MEMBERS ROSTER & DEPOSIT SETTLEMENT LEDGER
    csv += `"================== ২. সদস্যদের জমা ও সিট/রুম বরাদ্দ (MEMBERS & DEPOSITS) ================="\n`;
    csv += `"ক্রমিক নং","সদস্যের নাম","মোবাইল নম্বর","পরিবার সদস্য সংখ্যা","বাস সিট","হোটেল রুম","মোট জমা (টাকা)","ন্যায্য অংশ খরচ (টাকা)","নেট ব্যালেন্স / পাওনা (টাকা)"\n`;
    members.forEach((m, idx) => {
      const fCount = Number(m.familyCount || 1);
      const dep = Number(m.deposit || 0);
      const fairShare = perHead * fCount;
      const net = dep - fairShare;
      csv += `"${idx + 1}","${(m.name || '').replace(/"/g, '""')}","${m.phone || ''}","${fCount}","${m.seat || ''}","${m.room || ''}","${dep}","${fairShare}","${net >= 0 ? '+' : ''}${net}"\n`;
    });
    csv += `"","","","মোট সংগৃহীত ফান্ড:","","","${totalDeposit}","${totalExpense}","${remaining}"\n`;
    csv += `\n`;

    // 6. AUDIT SIGN-OFF
    csv += `"================== অডিট অনুমোদন ও স্বাক্ষর ================="\n`;
    csv += `"ট্যুর লিডার: রাজু ভাই","কোষাধ্যক্ষ: সোহাগ রানা","অডিটর: পরিবারের অভিভাবকবৃন্দ"\n`;

    // Prepend UTF-8 BOM ('\uFEFF') so Microsoft Excel and Windows apps display Bangla 100% cleanly!
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `CoxsBazar_Tour2026_Complete_Audit_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div
      id="printable-report-backdrop"
      className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 print:p-0 print:static print:bg-white print:overflow-visible"
      onClick={onClose}
    >
      <div
        id="printable-report-modal"
        className="bg-white rounded-2xl sm:rounded-3xl max-w-4xl w-full shadow-2xl max-h-[94vh] flex flex-col overflow-hidden my-auto print:max-h-none print:shadow-none print:rounded-none print:overflow-visible animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* TOP PINNED CONTROL BAR (Fixed at top, hidden during print) */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200 bg-slate-50/95 backdrop-blur-md shrink-0 print:hidden z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
              <Printer size={18} />
            </div>
            <div className="truncate">
              <h3 className="font-bold text-sm sm:text-base text-slate-800 truncate">অফিশিয়াল ট্যুর অডিট ও হিসাব শিট</h3>
              <p className="text-[10px] text-slate-500 hidden sm:block">প্রিন্ট বা PDF হিসেবে সংরক্ষণ করুন অথবা সম্পূর্ণ CSV স্প্রেডশিট ডাউনলোড করুন</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-2xs"
              title="বাংলা ফন্টসহ সম্পূর্ণ এক্সেল/CSV স্প্রেডশিট ডাউনলোড করুন"
            >
              <Download size={14} className="text-emerald-700" /> <span className="hidden xs:inline">সম্পূর্ণ</span> CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
              title="কেবল এই রিপোর্টটি প্রিন্ট বা PDF হিসেবে সেভ করুন"
            >
              <Printer size={14} /> প্রিন্ট / PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-200 hover:bg-rose-100 hover:text-rose-600 text-slate-700 flex items-center justify-center transition cursor-pointer active:scale-95"
              title="বন্ধ করুন (Esc)"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* SCROLLABLE DOCUMENT BODY (In print: 100% visible, page breaks cleanly) */}
        <div
          id="printable-report-content"
          className="p-4 sm:p-8 overflow-y-auto space-y-6 flex-1 text-slate-800 font-sans print:p-0 print:overflow-visible"
        >
          {/* Header */}
          <div className="text-center border-b border-slate-300 pb-4 space-y-1">
            <div className="inline-block px-3 py-0.5 bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-bold rounded-full mb-1">
              অফিশিয়াল ট্যুর অডিট স্টেটমেন্ট
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-teal-900">{tourInfo.title || 'রংপুর ➔ কক্সবাজার ফ্যামিলি ট্যুর ২০২৬'}</h2>
            <p className="text-xs text-slate-600 font-medium">
              ভ্রমণকাল: {tourInfo.duration} • যানবাহন: {tourInfo.busName} • হোটেল: {tourInfo.hotelName}
            </p>
            <p className="text-[11px] text-slate-400">রিপোর্ট তৈরির তারিখ: {new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>

          {/* Key Totals Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center border border-slate-200 rounded-2xl p-3 bg-slate-50">
            <div className="p-1">
              <p className="text-[10px] text-slate-500 font-bold">মোট জমা ফান্ড</p>
              <h4 className="text-base sm:text-lg font-bold text-teal-800">৳ {totalDeposit.toLocaleString()}</h4>
            </div>
            <div className="p-1">
              <p className="text-[10px] text-slate-500 font-bold">মোট খরচ</p>
              <h4 className="text-base sm:text-lg font-bold text-rose-600">৳ {totalExpense.toLocaleString()}</h4>
            </div>
            <div className="p-1">
              <p className="text-[10px] text-slate-500 font-bold">উদ্বৃত্ত ব্যালেন্স</p>
              <h4 className="text-base sm:text-lg font-bold text-emerald-700">৳ {remaining.toLocaleString()}</h4>
            </div>
            <div className="p-1">
              <p className="text-[10px] text-slate-500 font-bold">মাথাপিছু গড় খরচ ({totalHeadcount} জন)</p>
              <h4 className="text-base sm:text-lg font-bold text-indigo-900">৳ {perHead.toLocaleString()}</h4>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="space-y-2">
            <h4 className="font-bold text-sm text-slate-800 flex items-center justify-between">
              <span>১. খরচের সম্পূর্ণ বিবরণী</span>
              <span className="text-xs font-normal text-slate-500">মোট {expenses.length} টি এন্ট্রি</span>
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="p-2 border-b">নং</th>
                    <th className="p-2 border-b whitespace-nowrap">তারিখ ও সময়</th>
                    <th className="p-2 border-b">খাত</th>
                    <th className="p-2 border-b">খরচের বিবরণ</th>
                    <th className="p-2 border-b whitespace-nowrap">বিল পরিশোধক</th>
                    <th className="p-2 border-b text-right whitespace-nowrap">পরিমাণ (টাকা)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.map((e, idx) => (
                    <tr key={e.id} className="hover:bg-slate-50/50">
                      <td className="p-2 font-mono">{idx + 1}</td>
                      <td className="p-2 text-slate-500 font-mono whitespace-nowrap">
                        {e.date} {e.time ? `• ${e.time}` : ''}
                      </td>
                      <td className="p-2 font-semibold text-teal-800">{e.category}</td>
                      <td className="p-2">{e.title}</td>
                      <td className="p-2 text-slate-600 whitespace-nowrap">{e.paidBy || 'ট্যুর ফান্ড'}</td>
                      <td className="p-2 font-bold text-right whitespace-nowrap">৳ {Number(e.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-bold">
                    <td colSpan={5} className="p-2 text-right">সর্বমোট ব্যয়:</td>
                    <td className="p-2 text-right text-rose-700 whitespace-nowrap">৳ {totalExpense.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Members Deposit Table */}
          <div className="space-y-2">
            <h4 className="font-bold text-sm text-slate-800 flex items-center justify-between">
              <span>২. সদস্যদের জমা ও সিট/রুম বরাদ্দ</span>
              <span className="text-xs font-normal text-slate-500">মোট {members.length} জন সদস্য</span>
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="p-2 border-b">নং</th>
                    <th className="p-2 border-b whitespace-nowrap">সদস্যের নাম</th>
                    <th className="p-2 border-b whitespace-nowrap">পরিবার সদস্য</th>
                    <th className="p-2 border-b whitespace-nowrap">বাস সিট</th>
                    <th className="p-2 border-b whitespace-nowrap">হোটেল রুম</th>
                    <th className="p-2 border-b text-right whitespace-nowrap">মোট জমা (টাকা)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((m, idx) => (
                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="p-2 font-mono">{idx + 1}</td>
                      <td className="p-2 font-bold text-slate-800 whitespace-nowrap">{m.name}</td>
                      <td className="p-2 text-slate-600 font-mono whitespace-nowrap">{m.familyCount || 1} জন</td>
                      <td className="p-2 text-slate-600 whitespace-nowrap">{m.seat}</td>
                      <td className="p-2 text-slate-600 whitespace-nowrap">{m.room}</td>
                      <td className="p-2 font-bold text-right text-teal-800 whitespace-nowrap">৳ {Number(m.deposit).toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-bold">
                    <td colSpan={5} className="p-2 text-right">মোট সংগৃহীত ফান্ড:</td>
                    <td className="p-2 text-right text-teal-900 whitespace-nowrap">৳ {totalDeposit.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-8 grid grid-cols-3 gap-4 text-center text-xs text-slate-500">
            <div>
              <div className="w-24 sm:w-32 border-b border-slate-400 mx-auto mb-1"></div>
              <p className="font-semibold text-slate-700">ট্যুর লিডার</p>
              <p className="text-[10px] text-slate-400">রাজু ভাই</p>
            </div>
            <div>
              <div className="w-24 sm:w-32 border-b border-slate-400 mx-auto mb-1"></div>
              <p className="font-semibold text-slate-700">কোষাধ্যক্ষ / হিসাবরক্ষক</p>
              <p className="text-[10px] text-slate-400">সোহাগ রানা</p>
            </div>
            <div>
              <div className="w-24 sm:w-32 border-b border-slate-400 mx-auto mb-1"></div>
              <p className="font-semibold text-slate-700">অডিটর / অভিভাবক</p>
              <p className="text-[10px] text-slate-400">পরিবার প্রতিনিধি</p>
            </div>
          </div>
        </div>

        {/* BOTTOM PINNED ACTION BAR (Hidden when printed) */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 print:hidden z-20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer active:scale-95"
          >
            <X size={15} /> বন্ধ করুন
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <Download size={14} className="text-emerald-700" /> সম্পূর্ণ CSV (বাংলা ফন্টসহ)
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
            >
              <Printer size={15} /> প্রিন্ট / PDF সংরক্ষণ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
