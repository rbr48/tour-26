import React, { useMemo, useState } from 'react';
import {
  Split, Plus, Trash2, ArrowRight, PieChart, Printer, Edit3, X, Check, Info,
} from 'lucide-react';
import { FUND_LABEL, computeLedger } from '../utils/ledger';
import { localISODate, localTimeHHMM } from '../utils/date';
import { useBackHandler } from '../utils/backNavigation';
import { resolvePayerName } from '../utils/syncHelpers';

export const DEFAULT_CATEGORIES = {
  'খাবার': { color: 'bg-emerald-500', bgLight: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'নাস্তা ও স্ন্যাক্স': { color: 'bg-lime-500', bgLight: 'bg-lime-50 text-lime-700 border-lime-200' },
  'হোটেল': { color: 'bg-purple-500', bgLight: 'bg-purple-50 text-purple-700 border-purple-200' },
  'পরিবহন': { color: 'bg-blue-500', bgLight: 'bg-blue-50 text-blue-700 border-blue-200' },
  'লোকাল ট্রান্সপোর্ট': { color: 'bg-amber-500', bgLight: 'bg-amber-50 text-amber-700 border-amber-200' },
  'দর্শনীয় স্থান ও টিকিট': { color: 'bg-pink-500', bgLight: 'bg-pink-50 text-pink-700 border-pink-200' },
  'কেনাকাটা ও উপহার': { color: 'bg-indigo-500', bgLight: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  'জরুরি ও চিকিৎসা': { color: 'bg-rose-500', bgLight: 'bg-rose-50 text-rose-700 border-rose-200' },
  'টোল ও সার্ভিস চার্জ': { color: 'bg-teal-500', bgLight: 'bg-teal-50 text-teal-700 border-teal-200' },
  'অন্যান্য': { color: 'bg-slate-500', bgLight: 'bg-slate-50 text-slate-700 border-slate-200' },
};

const COLOR_PALETTES = [
  { color: 'bg-blue-500', bgLight: 'bg-blue-50 text-blue-700 border-blue-200' },
  { color: 'bg-purple-500', bgLight: 'bg-purple-50 text-purple-700 border-purple-200' },
  { color: 'bg-emerald-500', bgLight: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { color: 'bg-amber-500', bgLight: 'bg-amber-50 text-amber-700 border-amber-200' },
  { color: 'bg-rose-500', bgLight: 'bg-rose-50 text-rose-700 border-rose-200' },
  { color: 'bg-indigo-500', bgLight: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { color: 'bg-pink-500', bgLight: 'bg-pink-50 text-pink-700 border-pink-200' },
  { color: 'bg-cyan-500', bgLight: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { color: 'bg-lime-500', bgLight: 'bg-lime-50 text-lime-700 border-lime-200' },
  { color: 'bg-teal-500', bgLight: 'bg-teal-50 text-teal-700 border-teal-200' },
];

export const getCategoryMeta = (cat) => {
  if (!cat) return DEFAULT_CATEGORIES['অন্যান্য'];
  if (DEFAULT_CATEGORIES[cat]) return DEFAULT_CATEGORIES[cat];
  let hash = 0;
  for (let i = 0; i < cat.length; i++) {
    hash = (hash << 5) - hash + cat.charCodeAt(i);
    hash |= 0;
  }
  return COLOR_PALETTES[Math.abs(hash) % COLOR_PALETTES.length];
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
  isAdmin = false,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onOpenPrintModal,
  onEditMemberDeposit,
}) {
  const [newExpense, setNewExpense] = useState(blankExpense);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editForm, setEditForm] = useState(blankExpense);
  const [filterCategory, setFilterCategory] = useState('all');
  const [customCategories, setCustomCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('tour_custom_expense_categories');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCustomCategoryMode, setIsCustomCategoryMode] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');

  useBackHandler(Boolean(editingExpense), () => setEditingExpense(null), 20);

  const ledger = useMemo(() => computeLedger({ members, expenses }), [members, expenses]);

  const allCategoryKeys = useMemo(() => {
    const set = new Set(Object.keys(DEFAULT_CATEGORIES));
    customCategories.forEach((c) => set.add(c));
    expenses.forEach((e) => {
      if (e.category) set.add(e.category);
    });
    return Array.from(set);
  }, [customCategories, expenses]);

  const categoryRows = allCategoryKeys
    .map((category) => {
      const total = expenses
        .filter((expense) => expense.category === category)
        .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
      const pct = ledger.totalExpense > 0 ? Math.round((total / ledger.totalExpense) * 100) : 0;
      return { category, total, pct, ...getCategoryMeta(category) };
    })
    .filter((row) => row.total > 0 || Object.keys(DEFAULT_CATEGORIES).slice(0, 6).includes(row.category));

  const displayedExpenses = filterCategory === 'all'
    ? expenses
    : expenses.filter((expense) => expense.category === filterCategory);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!newExpense.title || !newExpense.amount) return;

    let finalCategory = newExpense.category;
    if (isCustomCategoryMode && customCategoryInput.trim()) {
      finalCategory = customCategoryInput.trim();
      if (!allCategoryKeys.includes(finalCategory)) {
        const updated = [...customCategories, finalCategory];
        setCustomCategories(updated);
        try {
          localStorage.setItem('tour_custom_expense_categories', JSON.stringify(updated));
        } catch {}
      }
    }

    onAddExpense({
      title: newExpense.title,
      category: finalCategory || 'অন্যান্য',
      amount: Number(newExpense.amount),
      paidById: newExpense.paidById === '' ? null : Number(newExpense.paidById),
      date: newExpense.date || localISODate(),
      time: newExpense.time || localTimeHHMM(),
    });
    setNewExpense(blankExpense());
    setIsCustomCategoryMode(false);
    setCustomCategoryInput('');
  };

  const handleUpdateSubmit = (event) => {
    event.preventDefault();
    if (!editingExpense || !editForm.title || !editForm.amount) return;
    if (onUpdateExpense) {
      onUpdateExpense(editingExpense.id, {
        title: editForm.title.trim(),
        category: editForm.category || 'অন্যান্য',
        amount: Number(editForm.amount),
        paidById: editForm.paidById === '' ? null : Number(editForm.paidById),
        date: editForm.date || localISODate(),
        time: editForm.time || localTimeHHMM(),
      });
    }
    setEditingExpense(null);
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
            <div className="mt-2.5 p-2.5 bg-white/10 rounded-xl border border-white/15 text-[11px] text-teal-100 flex items-start gap-2 max-w-xl">
              <Info size={15} className="text-amber-300 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <span className="font-bold text-amber-300">হিসাব পরিবর্তন বা সংশোধন করবেন কীভাবে?</span> এই সেটেলমেন্ট তালিকাটি সদস্যদের মোট জমা (ডিপোজিট) এবং খরচের ভাউচার হতে স্বয়ংক্রিয়ভাবে ক্যালকুলেট হয়। হিসাব ঠিক করতে নিচের <strong>খরচের ভাউচার তালিকা থেকে ✏️ এডিট</strong> করুন অথবা সদস্যদের <strong>ডিপোজিট আপডেট</strong> করুন।
              </div>
            </div>
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
                  {isAdmin && onEditMemberDeposit && (
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

      {/* Add New Expense Form (Admin Only) */}
      {isAdmin && (
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
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="expense-category" className="text-[11px] font-bold text-slate-600 block">ক্যাটাগরি / খাত</label>
              <button
                type="button"
                onClick={() => {
                  const next = !isCustomCategoryMode;
                  setIsCustomCategoryMode(next);
                  if (next) setCustomCategoryInput(newExpense.category);
                }}
                className="text-[10px] text-teal-700 hover:text-teal-900 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
              >
                {isCustomCategoryMode ? '⤺ তালিকা দেখুন' : '✍️ কাস্টম খাত লিখুন'}
              </button>
            </div>

            {!isCustomCategoryMode ? (
              <select
                id="expense-category"
                value={newExpense.category}
                onChange={(event) => {
                  if (event.target.value === '__add_custom__') {
                    setIsCustomCategoryMode(true);
                    setCustomCategoryInput('');
                  } else {
                    setNewExpense({ ...newExpense, category: event.target.value });
                  }
                }}
                className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white cursor-pointer"
              >
                <optgroup label="প্রস্তাবিত খরচের খাতসমূহ">
                  {Object.keys(DEFAULT_CATEGORIES).map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </optgroup>
                {customCategories.length > 0 && (
                  <optgroup label="আমার কাস্টম যোগ করা খাত">
                    {customCategories.map((category) => (
                      <option key={`c-${category}`} value={category}>⭐ {category}</option>
                    ))}
                  </optgroup>
                )}
                <option value="__add_custom__" className="text-teal-700 font-bold bg-teal-50">
                  ✍️ + ম্যানুয়ালি নতুন খাত লিখুন...
                </option>
              </select>
            ) : (
              <div className="space-y-1">
                <input
                  type="text"
                  placeholder="যেমন: বারবিকিউ নাইট, ফটোগ্রাফি..."
                  value={customCategoryInput}
                  onChange={(e) => setCustomCategoryInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border-2 border-teal-500 rounded-xl focus:outline-none focus:border-teal-700 bg-white"
                  autoFocus
                />
              </div>
            )}
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
      )}

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
            {allCategoryKeys
              .filter((category) => expenses.some((e) => e.category === category) || Object.keys(DEFAULT_CATEGORIES).slice(0, 6).includes(category))
              .map((category) => (
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
            const categoryInfo = getCategoryMeta(item.category);
            return (
              <div key={item.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${categoryInfo.bgLight}`}>
                      {item.category}
                    </span>
                    <span className="text-[11px] text-slate-400">{item.date}</span>
                    <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                      পরিশোধ: {resolvePayerName(item, members)}
                    </span>
                  </div>
                  <h5 className="font-bold text-sm text-slate-900 truncate">{item.title}</h5>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <span className="font-extrabold text-sm sm:text-base text-slate-800 mr-1 sm:mr-2">
                    ৳ {money(item.amount)}
                  </span>
                  {isAdmin && onUpdateExpense && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingExpense(item);
                        setEditForm({
                          title: item.title,
                          category: item.category || 'অন্যান্য',
                          amount: item.amount,
                          paidById: item.paidById ?? '',
                          date: item.date || localISODate(),
                          time: item.time || localTimeHHMM(),
                        });
                      }}
                      className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-500 flex items-center justify-center transition cursor-pointer"
                      title="খরচ এডিট করুন"
                      aria-label={`${item.title} এডিট করুন`}
                    >
                      <Edit3 size={15} aria-hidden="true" />
                    </button>
                  )}
                  {isAdmin && onDeleteExpense && (
                    <button
                      type="button"
                      onClick={() => onDeleteExpense(item.id)}
                      className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 flex items-center justify-center transition cursor-pointer"
                      title="খরচ মুছে ফেলুন"
                      aria-label={`${item.title} মুছে ফেলুন`}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Expense Modal (Admin Only) */}
      {isAdmin && editingExpense && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setEditingExpense(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white w-full max-w-lg rounded-2xl p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 my-auto animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <Edit3 size={18} className="text-teal-700" aria-hidden="true" /> খরচের ভাউচার সংশোধন করুন
              </h4>
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                aria-label="বন্ধ করুন"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-3">
              <div>
                <label htmlFor="edit-expense-title" className="text-xs font-bold text-slate-700 block mb-1">
                  খরচের বিবরণ / খাত
                </label>
                <input
                  id="edit-expense-title"
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-expense-category" className="text-xs font-bold text-slate-700 block mb-1">
                    ক্যাটাগরি
                  </label>
                  <select
                    id="edit-expense-category"
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white cursor-pointer"
                  >
                    {allCategoryKeys.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-expense-amount" className="text-xs font-bold text-slate-700 block mb-1">
                    পরিমাণ (টাকা)
                  </label>
                  <input
                    id="edit-expense-amount"
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label htmlFor="edit-expense-payer" className="text-xs font-bold text-slate-700 block mb-1">
                    বিল কে পরিশোধ করেছে? (Paid By)
                  </label>
                  <select
                    id="edit-expense-payer"
                    value={editForm.paidById ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, paidById: e.target.value === '' ? null : Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white cursor-pointer"
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
                  <label htmlFor="edit-expense-date" className="text-xs font-bold text-slate-700 block mb-1">
                    তারিখ (Date)
                  </label>
                  <input
                    id="edit-expense-date"
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="edit-expense-time" className="text-xs font-bold text-slate-700 block mb-1">
                    সময় (Time)
                  </label>
                  <input
                    id="edit-expense-time"
                    type="time"
                    value={editForm.time}
                    onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={14} aria-hidden="true" /> আপডেট নিশ্চিত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
