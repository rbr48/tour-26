import React, { useEffect, useMemo, useState } from 'react';
import { Printer, Download, X } from 'lucide-react';
import { FUND_LABEL, categoryTotals, computeLedger } from '../utils/ledger';
import { csvRow } from '../utils/csv';
import { localISODate } from '../utils/date';

export default function PrintableReport({
  tourInfo = {},
  members = [],
  expenses = [],
  onClose
}) {
  // The same ledger as the dashboard and the settlement view, so every figure agrees.
  const ledger = useMemo(() => computeLedger({ members, expenses }), [members, expenses]);
  const [generatedAt] = useState(() => new Date());
  const totalDeposit = ledger.totalDeposits;
  const totalExpense = ledger.totalExpense;
  const remaining = ledger.fundBalance;
  const totalHeadcount = ledger.headcount;
  const perHead = ledger.perHeadCost;

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
    const rows = [];
    const line = (...values) => rows.push(csvRow(values));
    const section = (title) => {
      rows.push('');
      rows.push(csvRow([`================== ${title} =================`]));
    };

    line('রংপুর ➔ কক্সবাজার ফ্যামিলি ট্যুর ২০২৬ - অফিশিয়াল হিসাব ও অডিট বিবরণী');
    line('ভ্রমণকাল', tourInfo.duration || '১৯ অক্টোবর ২০২৬ – ২৩ অক্টোবর ২০২৬');
    line('প্রধান পরিবহন', tourInfo.busName || 'এভারগ্রীন এসি বাস');
    line('আবাসন / হোটেল', tourInfo.hotelName || 'হোটেল সি মুন');
    line('রিপোর্ট তৈরির তারিখ', new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' }));

    section('আর্থিক সারসংক্ষেপ (FINANCIAL AUDIT SUMMARY)');
    line('বিবরণ', 'পরিমাণ (টাকা)');
    line('মোট সংগৃহীত জমা ফান্ড', ledger.totalDeposits);
    line('সর্বমোট খরচ', ledger.totalExpense);
    line('ফান্ড থেকে পরিশোধিত খরচ বাদে অবশিষ্ট ফান্ড', ledger.fundBalance);
    line('মোট সদস্য সংখ্যা (হেডকাউন্ট)', `${ledger.headcount} জন`);
    line('মাথাপিছু গড় ব্যয়', ledger.perHeadCost);

    section('খাতভিত্তিক খরচের সারসংক্ষেপ (CATEGORY BREAKDOWN)');
    line('খাত', 'মোট ব্যয় (টাকা)', 'শতকরা অনুপাত (%)');
    for (const row of categoryTotals(expenses)) {
      const pct = ledger.totalExpense > 0 ? Math.round((row.amount / ledger.totalExpense) * 1000) / 10 : 0;
      line(row.category, row.amount, `${pct}%`);
    }

    section('খরচের সম্পূর্ণ বিবরণী (EXPENSES LEDGER)');
    line('ক্রমিক নং', 'তারিখ', 'সময়', 'খাত', 'খরচের বিবরণ', 'বিল পরিশোধক', 'পরিমাণ (টাকা)');
    expenses.forEach((expense, index) => {
      line(index + 1, expense.date || '', expense.time || '', expense.category || '', expense.title || '', expense.paidBy || FUND_LABEL, Number(expense.amount) || 0);
    });
    line('', '', '', '', 'সর্বমোট ব্যয়:', '', ledger.totalExpense);

    section('সদস্যদের জমা ও সিট/রুম বরাদ্দ (MEMBERS & DEPOSITS)');
    line('ক্রমিক নং', 'সদস্যের নাম', 'মোবাইল নম্বর', 'পরিবার সদস্য সংখ্যা', 'বাস সিট', 'হোটেল রুম', 'জমা (টাকা)', 'শেয়ার (টাকা)', 'হিসাব (+ পাবেন / - দেবেন)');
    ledger.rows.forEach((row, index) => {
      const member = members.find((item) => item.id === row.id) ?? {};
      line(index + 1, row.name, member.phone || '', row.familyCount, member.seat || '', member.room || '', row.deposit, row.share, row.net);
    });
    line('', '', '', 'মোট সংগৃহীত ফান্ড:', '', '', ledger.totalDeposits, ledger.totalExpense, ledger.fundBalance);

    section('চূড়ান্ত সেটেলমেন্ট (SETTLEMENT)');
    line('কে দেবেন', 'কাকে দেবেন', 'টাকা');
    ledger.settlements.forEach((payment) => line(payment.from, payment.to, payment.amount));

    section('অডিট অনুমোদন ও স্বাক্ষর');
    line("ট্যুর লিডার: রাজু ভাই","কোষাধ্যক্ষ: সোহাগ রানা","অডিটর: পরিবারের অভিভাবকবৃন্দ");

    const csv = rows.join('\n') + '\n';

    // Prepend UTF-8 BOM ('\uFEFF') so Microsoft Excel and Windows apps display Bangla 100% cleanly!
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `CoxsBazar_Tour2026_Complete_Audit_${localISODate()}.csv`;
    link.click();
  };

  return (
    <div
      id="printable-report-backdrop"
      className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 print:p-0 print:static print:bg-white print:overflow-visible"
     role="presentation"
 onClick={onClose}
onKeyDown={(e) => { if (e.key === 'Escape') e.currentTarget.click(); }}
    >
      <div
        id="printable-report-modal"
        className="bg-white rounded-2xl sm:rounded-3xl max-w-4xl w-full shadow-2xl max-h-[94vh] flex flex-col overflow-hidden my-auto print:max-h-none print:shadow-none print:rounded-none print:overflow-visible animate-in fade-in zoom-in-95 duration-200"
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
            <p className="text-[11px] text-slate-400">রিপোর্ট তৈরির তারিখ: {generatedAt.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
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
