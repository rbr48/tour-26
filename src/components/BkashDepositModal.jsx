import React, { useState } from 'react';
import {
  CreditCard, Smartphone, Copy, Check, ExternalLink, X,
  AlertCircle, ArrowRight, ShieldCheck, DollarSign, Send
} from 'lucide-react';

export default function BkashDepositModal({
  isOpen,
  onClose,
  currentUser = null,
  currentProfile = {},
  onAddDepositTransaction
}) {
  const [selectedMethod, setSelectedMethod] = useState('bkash');
  const [copiedField, setCopiedField] = useState(null);

  // Form to submit deposit proof / transaction ID
  const [amount, setAmount] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [trxId, setTrxId] = useState('');
  const [depositorName, setDepositorName] = useState(() => currentProfile?.displayName || currentUser?.displayName || '');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Payment details
  const PAYMENT_DETAILS = {
    bkash: {
      name: 'bKash (বিকাশ)',
      number: '01712-345678',
      rawNumber: '01712345678',
      type: 'Personal (Send Money)',
      color: 'bg-[#E2136E] text-white',
      border: 'border-[#E2136E]',
      logo: '🌸 বিকাশ'
    },
    nagad: {
      name: 'Nagad (নগদ)',
      number: '01712-345678',
      rawNumber: '01712345678',
      type: 'Personal (Send Money)',
      color: 'bg-[#F7941D] text-white',
      border: 'border-[#F7941D]',
      logo: '🟠 নগদ'
    },
    rocket: {
      name: 'Rocket (রকেট)',
      number: '01712-345678-4',
      rawNumber: '017123456784',
      type: 'Personal',
      color: 'bg-[#8C3494] text-white',
      border: 'border-[#8C3494]',
      logo: '🚀 রকেট'
    }
  };

  const currentConfig = PAYMENT_DETAILS[selectedMethod];

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmitProof = (e) => {
    e.preventDefault();
    if (!amount || !depositorName) {
      alert('অনুগ্রহ করে নাম এবং টাকার পরিমাণ লিখুন');
      return;
    }

    if (onAddDepositTransaction) {
      onAddDepositTransaction({
        id: Date.now(),
        depositorName,
        amount: Number(amount),
        method: currentConfig.name,
        trxId: trxId.trim() || 'ম্যানুয়াল জমা',
        senderPhone: senderPhone.trim() || 'নির্ধারিত নয়',
        date: new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' }),
        time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
        status: 'approved'
      });
    }

    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setAmount('');
      setTrxId('');
      setSenderPhone('');
      onClose();
    }, 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-pink-100">

        {/* Top Header */}
        <div className="bg-gradient-to-r from-pink-900 via-rose-900 to-purple-950 p-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-pink-500 text-teal-950 flex items-center justify-center font-extrabold shadow-md">
              <CreditCard size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm sm:text-base">ট্যুর ফান্ডে জমা (bKash / Nagad)</h3>
                <span className="text-[9px] bg-amber-400 text-teal-950 font-bold px-1.5 py-0.2 rounded-md">Instant QR</span>
              </div>
              <p className="text-[10px] text-pink-200">
                বিকাশ, নগদ বা রকেটে সরাসরি ট্যুর ফান্ডে জমা পাঠান
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-pink-200 hover:text-white rounded-xl hover:bg-pink-800/60 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/60 text-xs">

          {/* Payment Method Switcher Tabs */}
          <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-200/70 rounded-2xl">
            {Object.entries(PAYMENT_DETAILS).map(([key, details]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedMethod(key)}
                className={`py-2 px-1 text-center font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${
                  selectedMethod === key
                    ? details.color + ' shadow-sm scale-102'
                    : 'bg-white hover:bg-slate-100 text-slate-700'
                }`}
              >
                <span>{details.logo}</span>
              </button>
            ))}
          </div>

          {/* Selected Method Details Card */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">পেমেন্ট মেথড ও ধরণ</span>
                <h4 className="font-extrabold text-sm text-slate-800">{currentConfig.name}</h4>
              </div>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded-lg border border-emerald-200">
                {currentConfig.type}
              </span>
            </div>

            {/* Account Number Box with 1-click Copy */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">ট্যুর অ্যাকাউন্ট নম্বর</span>
                <p className="font-mono font-extrabold text-base text-slate-900 tracking-wider">
                  {currentConfig.number}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleCopy(currentConfig.rawNumber, 'phone')}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold rounded-xl flex items-center gap-1 transition cursor-pointer text-[11px] shadow-xs"
              >
                {copiedField === 'phone' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copiedField === 'phone' ? 'কপি হয়েছে' : 'কপি করুন'}</span>
              </button>
            </div>

            {/* Smart Instructions */}
            <div className="text-[11px] text-slate-600 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200 space-y-1">
              <p className="font-semibold text-amber-950 flex items-center gap-1">
                💡 কীভাবে পাঠাবেন:
              </p>
              <p>১. আপনার বিকাশ/নগদ অ্যাপে ঢুকে <b>Send Money</b> করুন।</p>
              <p>২. রেফারেন্সে (Reference) আপনার নাম বা <b>Tour2026</b> লিখুন।</p>
              <p>৩. পাঠানো শেষ হলে নিচের ফর্মে ট্রানজেকশন আইডি (TrxID) দিন।</p>
            </div>
          </div>

          {/* Deposit Notification Submission Form */}
          <form onSubmit={handleSubmitProof} className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
            <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
              <DollarSign size={15} className="text-pink-600" />
              টাকা পাঠানোর পর জমা অন্তর্ভুক্ত করুন
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">সদস্যের নাম</label>
                <input
                  type="text"
                  required
                  value={depositorName}
                  onChange={(e) => setDepositorName(e.target.value)}
                  placeholder="যেমন: সোহাগ রানা"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-pink-600 bg-slate-50"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">টাকার পরিমাণ (৳)</label>
                <input
                  type="number"
                  required
                  min="100"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="যেমন: ৫০০০"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-pink-600 bg-slate-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">বিকাশ/নগদ TrxID (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  placeholder="যেমন: 9J4K2L8P"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-pink-600 bg-slate-50"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">যে নম্বর থেকে পাঠানো হয়েছে</label>
                <input
                  type="text"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder="যেমন: 017xxxxxxxx"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-pink-600 bg-slate-50"
                />
              </div>
            </div>

            {isSubmitted ? (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 border border-emerald-200 animate-in fade-in">
                <Check size={16} className="text-emerald-600" />
                জমার রসিদ সফলভাবে ফান্ডে যুক্ত হয়েছে!
              </div>
            ) : (
              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-extrabold rounded-2xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md text-xs hover:scale-101 active:scale-98"
              >
                <Send size={14} /> জমার এন্ট্রি নিশ্চিত করুন
              </button>
            )}
          </form>

        </div>

      </div>
    </div>
  );
}
