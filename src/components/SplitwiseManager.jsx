import React, { useMemo, useState } from 'react';
import {
  Split, Plus, Trash2, ArrowRight, PieChart, Printer, Edit3,
} from 'lucide-react';
import { FUND_LABEL, computeLedger } from '../utils/ledger';
import { localISODate, localTimeHHMM } from '../utils/date';

const CATEGORIES = {
  'পরিবহন': { color: 'bg-blue-500', bgLight: 'bg-blue-50 text-blue-700 border-blue-200' },
  'হোটেল': { color: 'bg-purple-500', bgLight: 'bg-purple-50 text-purple-700 border-purple-200' },
  'লোকাল ট্রান্সপোর্ট': { color: 'bg-amber-500', bgLight: 'bg-amber-50 text-amber-700 border-amber-200' },
  'খাবার': { color: 'bg-emerald-500', bgLight: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'অন্যান্য': { color: 'bg-slate-500', bgLight: 'bg-slate-50 text-slate-700 border-slate-200' },
};

const money = (value) => Number(value || 0).toLocaleString();

function settlementLabels(payment) {
  if (payment.fromFund) {
    return { badge: 'ফান্ড', text: 'ফেরত পাবেন' };
  }
  if (payment.toFund) {
    return { badge: 'দেবেন', text: 'ফান্ডে জমা' };
  }
  return { badge: 'দেবেন', text: 'টাকা পাবেন' };
}

const blankExpense = () => ({
  title: '',
  category: 'খাবার',
  amount: '',
  paidById: '',
  date: localISODate(),
  time: localTimeHHMM(),
});

export default function SplitwiseManager({
  members = [],
  expenses = [],
  onAddExpense,
  onDeleteExpense,
  onOpenPrintModal,
  onEditMemberDeposit,
}) {
  const [newExpense, setNewExpense] = useState(blankExpense);
  const [filterCategory, setFilterCategory] = useState('all');

  const ledger = useMemo(() => computeLedger({ members, expenses }), [members, expenses]);

  const categoryRows = Object.keys(CATEGORIES).map((category) => {
    const total = expenses
      .filter((expense) => expense.category === category)
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const pct = ledger.totalExpense > 0 ? Math.round((total / ledger.totalExpense) * 100) : 0;
    return { category, total, pct, ...CATEGORIES[category] };
  });

  const displayedExpenses = filterCategory === 'all'
    ? expenses
    : expenses.filter((expense) => expense.category === filterCategory);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!newExpense.title || !newExpense.amount) return;
    onAddExpense({
      title: newExpense.title,
      category: newExpense.category,
      amount: Number(newExpense.amount),
      paidById: newExpense.paidById === '' ? null : Number(newExpense.paidById),
      date: newExpense.date || localISODate(),
      time: newExpense.time || localTimeHHMM(),
    });
    setNewExpense(blankExpense());
  };

  const fundPositive = ledger.fundBalance >= 0;

  return (
    <div className="space-y-6">
      {/* Financial Top Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100">
          <p className="text-xs text-slate-500 font-medium">মোট জমা ফান্ড</p>
          <h3 className="text-xl sm:text-2xl font-bold text-teal-800 mt-1">৳ {money(ledger.totalDeposits)}</h3>
          <p className="text-[10px] text-teal-600 mt-0.5">{members.length} জন সদস্যের জমা</p>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100">
          <p className="text-xs text-slate-500 font-medium">মোট খরচ হয়েছে</p>
          <h3 className="text-xl sm:text-2xl font-bold text-rose-600 mt-1">৳ {money(ledger.totalExpense)}</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">{expenses.length}টি খাতে পরিশোধিত</p>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100">
          <p className="text-xs text-slate-500 font-medium">অবশিষ্ট ফান্ড ব্যালেন্স</p>
          <h3 className={`text-xl sm:text-2xl font-bold mt-1 ${fundPositive ? 'text-emerald-700' : 'text-rose-600'}`}>
            ৳ {money(ledger.fundBalance)}
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">{fundPositive ? 'ফান্ড উদ্বৃত্ত' : 'ফান্ড ঘাটতি'}</p>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-teal-50 p-4 rounded-2xl shadow-xs border border-indigo-100">
          <p className="text-xs text-indigo-900 font-medium">মাথাপিছু গড় খরচ</p>
          <h3 className="text-xl sm:text-2xl font-bold text-indigo-950 mt-1">৳ {money(ledger.perHeadCost)}</h3>
          <p className="text-[10px] text-indigo-700 mt-0.5">মোট সদস্য: {ledger.headcount} জন</p>
        </div>
      </div>

      {/* Category Breakdown Progress */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <PieChart size={17} className="text-teal-700" aria-hidden="true" /> খাতভিত্তিক ব্যয়ের বিশ্লেষণ
          </h3>
          <button
            type="button"
            onClick={onOpenPrintModal}
            className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer size={14} aria-hidden="true" /> অডিট রিপোর্ট প্রিন্ট / PDF
          </button>
        </div>

        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner" aria-hidden="true">
          {categoryRows.map((row) => (
            <div
              key={row.category}
              className={`${row.color} transition-all duration-500`}
              style={{ width: `${row.pct}%` }}
              title={`${row.category}: ৳${money(row.total)} (${row.pct}%)`}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {categoryRows.map((row) => (
            <span
              key={row.category}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${row.bgLight}`}
            >
              <span className={`w-2 h-2 rounded-full ${row.color}`} aria-hidden="true"></span>
              {row.category}: ৳{money(row.total)} ({row.pct}%)
            </span>
          ))}
        </div>
      </div>

      {/* Settlement */}
      <div className="bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white p-5 sm:p-6 rounded-3xl shadow-xl space-y-5 border border-teal-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="px-2.5 py-0.5 bg-amber-400 text-teal-950 text-xs font-bold rounded-full mb-1 inline-block">
              স্মার্ট স্প্লিট অ্যালগরিদম
            </span>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Split size={20} className="text-amber-300" aria-hidden="true" /> কে কাকে কত টাকা দেবে? (ফাইনাল সেটেলমেন্ট)
            </h3>
            <p className="text-xs text-teal-200 mt-0.5">
              সকল জমা এবং ব্যক্তিগতভাবে বহন করা বিল সমন্বয় করে চূড়ান্ত নিষ্পত্তির হিসাব
            </p>
          </div>
          <span className="text-xs bg-teal-800/80 px-3 py-1.5 rounded-xl border border-teal-700">
            জনপ্রতি ফেয়ার শেয়ার: ৳{money(ledger.perHeadCost)}
          </span>
        </div>

        {ledger.settlements.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ledger.settlements.map((payment, index) => {
              const labels = settlementLabels(payment);
              return (
                <div
                  key={`${payment.from}-${payment.to}-${index}`}
                  className="bg-white/10 hover:bg-white/15 p-3.5 rounded-2xl border border-white/10 flex items-center justify-between transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30 flex items-center justify-center font-bold text-[10px] shrink-0">
                      {labels.badge}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{payment.from}</p>
                      <p className="text-[10px] text-teal-300 flex items-center gap-1">
                        {labels.text} <ArrowRight size={10} aria-hidden="true" />{' '}
                        <span className="font-semibold text-amber-300">{payment.to}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-extrabold text-amber-300 bg-amber-400/10 px-2.5 py-1 rounded-xl border border-amber-300/30">
                      ৳ {money(payment.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 bg-teal-800/30 rounded-2xl text-center text-xs text-teal-200">
            🎉 চমৎকার! সকল সদস্যের হিসাব সম্পূর্ণ ব্যালেন্সড রয়েছে।
          </div>
        )}

        <div className="pt-2">
          <p className="text-xs font-bold text-teal-200 mb-2">সদস্যভিত্তিক ব্যালেন্স ওভারভিউ:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {ledger.rows.map((row) => (
              <div
                key={row.id}
                className="bg-black/25 p-3 rounded-xl border border-white/5 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-white truncate max-w-[130px]">{row.name}</p>
                  <p className="text-[10px] text-slate-400">
                    প্রদত্ত: ৳{money(row.contributed)} • শেয়ার: ৳{money(row.share)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {row.netPaisa >= 0 ? (
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                      + ৳{money(row.net)} (পাবেন)
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded-lg border border-rose-500/30">
                      - ৳{money(Math.abs(row.net))} (দেবেন)
                    </span>
                  )}
                  {onEditMemberDeposit && (
                    <button
                      type="button"
                      onClick={() => onEditMemberDeposit(members.find((member) => member.id === row.id))}
                      className="p-1 bg-white/10 hover:bg-white/25 text-amber-300 rounded-lg transition cursor-pointer"
                      title="ডিপোজিট আপডেট করুন"
                      aria-label={`${row.name} এর ডিপোজিট আপডেট করুন`}
                    >
                      <Edit3 size={13} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add New Expense Form */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 space-y-4">
        <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
          <Plus size={18} className="text-teal-700" aria-hidden="true" /> নতুন খরচের ভাউচার যুক্ত করুন
        </h3>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label htmlFor="expense-title" className="text-[11px] font-bold text-slate-600 block mb-1">খরচের বিবরণ / খাত</label>
            <input
              id="expense-title"
              type="text"
              placeholder="যেমন: বগুড়ায় রাতের ডিনার বিল, মহেশখালী ট্রলার ভাড়া..."
              value={newExpense.title}
              onChange={(event) => setNewExpense({ ...newExpense, title: event.target.value })}
              className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
              required
            />
          </div>

          <div>
            <label htmlFor="expense-category" className="text-[11px] font-bold text-slate-600 block mb-1">ক্যাটাগরি</label>
            <select
              id="expense-category"
              value={newExpense.category}
              onChange={(event) => setNewExpense({ ...newExpense, category: event.target.value })}
              className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
            >
              {Object.keys(CATEGORIES).map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="expense-amount" className="text-[11px] font-bold text-slate-600 block mb-1">পরিমাণ (টাকা)</label>
            <input
              id="expense-amount"
              type="number"
              min="1"
              step="any"
              placeholder="৳ যেমন: ৩০০০"
              value={newExpense.amount}
              onChange={(event) => setNewExpense({ ...newExpense, amount: event.target.value })}
              className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
              required
            />
          </div>

          <div>
            <label htmlFor="expense-payer" className="text-[11px] font-bold text-slate-600 block mb-1">বিল কে পরিশোধ করেছে? (Paid By)</label>
            <select
              id="expense-payer"
              value={newExpense.paidById}
              onChange={(event) => setNewExpense({ ...newExpense, paidById: event.target.value })}
              className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
            >
              <option value="">{FUND_LABEL} (সবার জমা ফান্ড থেকে)</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} (ব্যক্তিগত পকেট থেকে)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="expense-date" className="text-[11px] font-bold text-slate-600 block mb-1">খরচের তারিখ (Date)</label>
            <input
              id="expense-date"
              type="date"
              value={newExpense.date}
              onChange={(event) => setNewExpense({ ...newExpense, date: event.target.value })}
              className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
            />
          </div>

          <div>
            <label htmlFor="expense-time" className="text-[11px] font-bold text-slate-600 block mb-1">খরচের সময় (Time)</label>
            <input
              id="expense-time"
              type="time"
              value={newExpense.time}
              onChange={(event) => setNewExpense({ ...newExpense, time: event.target.value })}
              className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus size={16} aria-hidden="true" /> খরচ সেভ করুন
            </button>
          </div>
        </form>
      </div>

      {/* Expenses List */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-sm text-slate-800">খরচের ভাউচার তালিকা ({expenses.length})</h4>
            <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-medium">
              মোট: ৳{money(ledger.totalExpense)}
            </span>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setFilterCategory('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                filterCategory === 'all' ? 'bg-teal-700 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              সব ({expenses.length})
            </button>
            {Object.keys(CATEGORIES).map((category) => (
              <button
                type="button"
                key={category}
                onClick={() => setFilterCategory(category)}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer whitespace-nowrap ${
                  filterCategory === category ? 'bg-teal-700 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {displayedExpenses.map((item) => {
            const categoryInfo = CATEGORIES[item.category] || CATEGORIES['অন্যান্য'];
            return (
              <div key={item.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${categoryInfo.bgLight}`}>
                      {item.category}
                    </span>
                    <span className="text-[11px] text-slate-400">{item.date}</span>
                    <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                      পরিশোধ: {item.paidBy || FUND_LABEL}
                    </span>
                  </div>
                  <h5 className="font-bold text-sm text-slate-900 truncate">{item.title}</h5>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-extrabold text-sm sm:text-base text-slate-800">
                    ৳ {money(item.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteExpense(item.id)}
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 flex items-center justify-center transition cursor-pointer"
                    title="খরচ মুছে ফেলুন"
                    aria-label={`${item.title} মুছে ফেলুন`}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
