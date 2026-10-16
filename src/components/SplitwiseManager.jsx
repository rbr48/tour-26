import React, { useState } from 'react';
import {
  Wallet, Split, Plus, Trash2, ArrowRight, CheckCircle2,
  PieChart, DollarSign, TrendingDown, TrendingUp, Users,
  Printer, Filter, AlertCircle, Sparkles, Edit3
} from 'lucide-react';

export default function SplitwiseManager({
  members = [],
  expenses = [],
  onAddExpense,
  onDeleteExpense,
  onOpenPrintModal,
  onEditMemberDeposit
}) {
  const [newExpense, setNewExpense] = useState({
    title: '',
    category: 'খাবার',
    amount: '',
    paidBy: 'ট্যুর ফান্ড',
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  });

  const [filterCategory, setFilterCategory] = useState('all');

  // Categories & color mapping
  const CATEGORIES = {
    'পরিবহন': { color: 'bg-blue-500', bgLight: 'bg-blue-50 text-blue-700 border-blue-200' },
    'হোটেল': { color: 'bg-purple-500', bgLight: 'bg-purple-50 text-purple-700 border-purple-200' },
    'লোকাল ট্রান্সপোর্ট': { color: 'bg-amber-500', bgLight: 'bg-amber-50 text-amber-700 border-amber-200' },
    'খাবার': { color: 'bg-emerald-500', bgLight: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    'অন্যান্য': { color: 'bg-slate-500', bgLight: 'bg-slate-50 text-slate-700 border-slate-200' }
  };

  // 1. Basic totals
  const totalDeposit = members.reduce((sum, m) => sum + Number(m.deposit || 0), 0);
  const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const remainingFund = totalDeposit - totalExpense;

  // Total headcount for fair share
  const totalHeadcount = members.reduce((sum, m) => sum + (Number(m.familyCount) || 1), 0);
  const perHeadCost = totalHeadcount > 0 ? Math.round(totalExpense / totalHeadcount) : 0;

  // 2. Member balances calculation
  const memberLedger = members.map(m => {
    const deposit = Number(m.deposit || 0);
    const directPaid = expenses
      .filter(e => e.paidBy === m.name)
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalContributed = deposit + directPaid;
    const fairShare = perHeadCost * (Number(m.familyCount) || 1);
    const netBalance = totalContributed - fairShare;

    return {
      id: m.id,
      name: m.name,
      familyCount: Number(m.familyCount) || 1,
      deposit,
      directPaid,
      totalContributed,
      fairShare,
      netBalance: Math.round(netBalance)
    };
  });

  // 3. Automated Debt Settlement Algorithm (Minimum cash flow)
  const calculateSettlements = () => {
    let debtors = memberLedger.filter(m => m.netBalance < 0).map(m => ({ ...m, owes: -m.netBalance }));
    let creditors = memberLedger.filter(m => m.netBalance > 0).map(m => ({ ...m, gets: m.netBalance }));

    const settlements = [];
    let d = 0;
    let c = 0;

    while (d < debtors.length && c < creditors.length) {
      const debtor = debtors[d];
      const creditor = creditors[c];
      const amount = Math.min(debtor.owes, creditor.gets);

      if (amount > 0) {
        settlements.push({
          id: `${debtor.id}-${creditor.id}-${d}-${c}`,
          from: debtor.name,
          to: creditor.name,
          amount
        });
      }

      debtor.owes -= amount;
      creditor.gets -= amount;

      if (debtor.owes === 0) d++;
      if (creditor.gets === 0) c++;
    }

    return settlements;
  };

  const settlements = calculateSettlements();

  // Category breakdown
  const categoryTotals = Object.keys(CATEGORIES).map(cat => {
    const total = expenses.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount || 0), 0);
    const pct = totalExpense > 0 ? Math.round((total / totalExpense) * 100) : 0;
    return { category: cat, total, pct, ...CATEGORIES[cat] };
  });

  // Filtered expenses
  const displayedExpenses = filterCategory === 'all'
    ? expenses
    : expenses.filter(e => e.category === filterCategory);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newExpense.title || !newExpense.amount) return;
    onAddExpense({
      title: newExpense.title,
      category: newExpense.category,
      amount: Number(newExpense.amount),
      paidBy: newExpense.paidBy || 'ট্যুর ফান্ড',
      date: newExpense.date || new Date().toISOString().slice(0, 10),
      time: newExpense.time || new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    });
    setNewExpense({
      title: '',
      category: 'খাবার',
      amount: '',
      paidBy: 'ট্যুর ফান্ড',
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    });
  };

  return (
    <div className="space-y-6">
      {/* Financial Top Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100">
          <p className="text-xs text-slate-500 font-medium">মোট জমা ফান্ড</p>
          <h3 className="text-xl sm:text-2xl font-bold text-teal-800 mt-1">
            ৳ {totalDeposit.toLocaleString()}
          </h3>
          <p className="text-[10px] text-teal-600 mt-0.5">{members.length} জন সদস্যের জমা</p>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100">
          <p className="text-xs text-slate-500 font-medium">মোট খরচ হয়েছে</p>
          <h3 className="text-xl sm:text-2xl font-bold text-rose-600 mt-1">
            ৳ {totalExpense.toLocaleString()}
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">{expenses.length}টি খাতে পরিশোধিত</p>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100">
          <p className="text-xs text-slate-500 font-medium">অবশিষ্ট ফান্ড ব্যালেন্স</p>
          <h3 className={`text-xl sm:text-2xl font-bold mt-1 ${remainingFund >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            ৳ {remainingFund.toLocaleString()}
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">{remainingFund >= 0 ? 'ফান্ড উদ্বৃত্ত' : 'ফান্ড ঘাটতি'}</p>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-teal-50 p-4 rounded-2xl shadow-xs border border-indigo-100">
          <p className="text-xs text-indigo-900 font-medium">মাথাপিছু গড় খরচ</p>
          <h3 className="text-xl sm:text-2xl font-bold text-indigo-950 mt-1">
            ৳ {perHeadCost.toLocaleString()}
          </h3>
          <p className="text-[10px] text-indigo-700 mt-0.5">মোট সদস্য: {totalHeadcount} জন</p>
        </div>
      </div>

      {/* Category Breakdown Progress */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <PieChart size={17} className="text-teal-700" /> খাতভিত্তিক ব্যয়ের বিশ্লেষণ
          </h3>
          <button
            onClick={onOpenPrintModal}
            className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer size={14} /> অডিট রিপোর্ট প্রিন্ট / PDF
          </button>
        </div>

        {/* Multi-colored progress bar */}
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
          {categoryTotals.map(cat => (
            <div
              key={cat.category}
              className={`${cat.color} transition-all duration-500`}
              style={{ width: `${cat.pct}%` }}
              title={`${cat.category}: ৳${cat.total.toLocaleString()} (${cat.pct}%)`}
            />
          ))}
        </div>

        {/* Category tags */}
        <div className="flex flex-wrap gap-2 pt-1">
          {categoryTotals.map(cat => (
            <span
              key={cat.category}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${cat.bgLight}`}
            >
              <span className={`w-2 h-2 rounded-full ${cat.color}`}></span>
              {cat.category}: ৳{cat.total.toLocaleString()} ({cat.pct}%)
            </span>
          ))}
        </div>
      </div>

      {/* SMART DEBT SETTLEMENT ENGINE */}
      <div className="bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white p-5 sm:p-6 rounded-3xl shadow-xl space-y-5 border border-teal-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="px-2.5 py-0.5 bg-amber-400 text-teal-950 text-xs font-bold rounded-full mb-1 inline-block">
              স্মার্ট স্প্লিট অ্যালগরিদম
            </span>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Split size={20} className="text-amber-300" /> কে কাকে কত টাকা দেবে? (ফাইনাল সেটেলমেন্ট)
            </h3>
            <p className="text-xs text-teal-200 mt-0.5">
              সকল জমা এবং ব্যক্তিগতভাবে বহন করা বিল সমন্বয় করে চূড়ান্ত নিষ্পত্তির হিসাব
            </p>
          </div>
          <span className="text-xs bg-teal-800/80 px-3 py-1.5 rounded-xl border border-teal-700">
            জনপ্রতি ফেয়ার শেয়ার: ৳{perHeadCost.toLocaleString()}
          </span>
        </div>

        {/* Settlements Table / Cards */}
        {settlements.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {settlements.map((s, idx) => (
              <div
                key={s.id || idx}
                className="bg-white/10 hover:bg-white/15 p-3.5 rounded-2xl border border-white/10 flex items-center justify-between transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30 flex items-center justify-center font-bold text-xs shrink-0">
                    দেবেন
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{s.from}</p>
                    <p className="text-[10px] text-teal-300 flex items-center gap-1">
                      টাকা পাবেন <ArrowRight size={10} /> <span className="font-semibold text-amber-300">{s.to}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm font-extrabold text-amber-300 bg-amber-400/10 px-2.5 py-1 rounded-xl border border-amber-300/30">
                    ৳ {s.amount.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-teal-800/30 rounded-2xl text-center text-xs text-teal-200">
            🎉 চমৎকার! সকল সদস্যের হিসাব সম্পূর্ণ ব্যালেন্সড রয়েছে।
          </div>
        )}

        {/* Detailed Member Balances Ledger */}
        <div className="pt-2">
          <p className="text-xs font-bold text-teal-200 mb-2">সদস্যভিত্তিক ব্যালেন্স ওভারভিউ:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {memberLedger.map(m => (
              <div
                key={m.id}
                className="bg-black/25 p-3 rounded-xl border border-white/5 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-white truncate max-w-[130px]">{m.name}</p>
                  <p className="text-[10px] text-slate-400">
                    প্রদত্ত: ৳{m.totalContributed.toLocaleString()} • শেয়ার: ৳{m.fairShare.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {m.netBalance >= 0 ? (
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                      + ৳{m.netBalance.toLocaleString()} (পাবেন)
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded-lg border border-rose-500/30">
                      - ৳{Math.abs(m.netBalance).toLocaleString()} (দেবেন)
                    </span>
                  )}
                  {onEditMemberDeposit && (
                    <button
                      onClick={() => onEditMemberDeposit(members.find(x => x.id === m.id))}
                      className="p-1 bg-white/10 hover:bg-white/25 text-amber-300 rounded-lg transition cursor-pointer"
                      title="ডিপোজিট আপডেট করুন"
                    >
                      <Edit3 size={13} />
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
          <Plus size={18} className="text-teal-700" /> নতুন খরচের ভাউচার যুক্ত করুন
        </h3>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label className="text-[11px] font-bold text-slate-600 block mb-1">খরচের বিবরণ / খাত</label>
            <input
              type="text"
              placeholder="যেমন: বগুড়ায় রাতের ডিনার বিল, মহেশখালী ট্রলার ভাড়া..."
              value={newExpense.title}
              onChange={e => setNewExpense({ ...newExpense, title: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
              required
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">ক্যাটাগরি</label>
            <select
              value={newExpense.category}
              onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
            >
              <option value="পরিবহন">পরিবহন</option>
              <option value="হোটেল">হোটেল</option>
              <option value="লোকাল ট্রান্সপোর্ট">লোকাল ট্রান্সপোর্ট</option>
              <option value="খাবার">খাবার</option>
              <option value="অন্যান্য">অন্যান্য</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">পরিমাণ (টাকা)</label>
            <input
              type="number"
              placeholder="৳ যেমন: ৩০০০"
              value={newExpense.amount}
              onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
              required
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">বিল কে পরিশোধ করেছে? (Paid By)</label>
            <select
              value={newExpense.paidBy}
              onChange={e => setNewExpense({ ...newExpense, paidBy: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
            >
              <option value="ট্যুর ফান্ড">ট্যুর ফান্ড (সবার জমা ফান্ড থেকে)</option>
              {members.map(m => (
                <option key={m.id} value={m.name}>
                  {m.name} (ব্যক্তিগত পকেট থেকে)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">খরচের তারিখ (Date)</label>
            <input
              type="date"
              value={newExpense.date}
              onChange={e => setNewExpense({ ...newExpense, date: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">খরচের সময় (Time)</label>
            <input
              type="time"
              value={newExpense.time}
              onChange={e => setNewExpense({ ...newExpense, time: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 bg-white"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus size={16} /> খরচ সেভ করুন
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
              মোট: ৳{totalExpense.toLocaleString()}
            </span>
          </div>

          {/* Filter chips */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                filterCategory === 'all' ? 'bg-teal-700 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              সব ({expenses.length})
            </button>
            {Object.keys(CATEGORIES).map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer whitespace-nowrap ${
                  filterCategory === cat ? 'bg-teal-700 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {displayedExpenses.map(item => {
            const catInfo = CATEGORIES[item.category] || CATEGORIES['অন্যান্য'];
            return (
              <div
                key={item.id}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${catInfo.bgLight}`}>
                      {item.category}
                    </span>
                    <span className="text-[11px] text-slate-400">{item.date}</span>
                    <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                      পরিশোধ: {item.paidBy || 'ট্যুর ফান্ড'}
                    </span>
                  </div>
                  <h5 className="font-bold text-sm text-slate-900 truncate">{item.title}</h5>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-extrabold text-sm sm:text-base text-slate-800">
                    ৳ {Number(item.amount).toLocaleString()}
                  </span>
                  <button
                    onClick={() => onDeleteExpense(item.id)}
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 flex items-center justify-center transition cursor-pointer"
                    title="খরচ মুছে ফেলুন"
                  >
                    <Trash2 size={15} />
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
