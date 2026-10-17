import React, { useState } from 'react';
import { Trophy, Award, CheckCircle2, XCircle, RotateCcw, X, Star, ArrowRight } from 'lucide-react';

const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: 'কক্সবাজার সমুদ্র সৈকত পৃথিবীর কততম দীর্ঘতম প্রাকৃতিক অবিচ্ছিন্ন বালুকাময় সৈকত?',
    options: ['প্রথম (১ম)', 'দ্বিতীয় (২য়)', 'তৃতীয় (৩য়)', 'পঞ্চম (৫ম)'],
    correct: 0,
    explanation: 'কক্সবাজার সমুদ্র সৈকত প্রায় ১২০ কিলোমিটার দীর্ঘ এবং এটি পৃথিবীর দীর্ঘতম প্রাকৃতিক অবিচ্ছিন্ন সমুদ্র সৈকত!'
  },
  {
    id: 2,
    question: 'রংপুর থেকে কক্সবাজারের দূরত্ব সড়কপথে আনুমানিক কত কিলোমিটার?',
    options: ['৫৫০ কি.মি.', '৬৮০ কি.মি.', '৭৮০ কি.মি.', '৯৫০ কি.মি.'],
    correct: 2,
    explanation: 'রংপুর থেকে ঢাকা হয়ে কক্সবাজারের মোট দূরত্ব প্রায় ৭৭০-৭৯০ কিলোমিটার, যা আমাদের এভারগ্রীন বাসে অতিক্রম করা হচ্ছে।'
  },
  {
    id: 3,
    question: 'ইনানী বিচের প্রধান ও বিশেষ বৈশিষ্ট্য কী?',
    options: ['লাল কাঁকড়া', 'প্রবাল ও প্রবাল পাথর (Coral Rocks)', 'গভীর খাল', 'ম্যানগ্রোভ বন'],
    correct: 1,
    explanation: 'ইনানী সৈকত তার শান্ত পরিবেশ এবং প্রাকৃতিকভাবে গড়ে ওঠা প্রবাল পাথরের জন্য বিখ্যাত।'
  },
  {
    id: 4,
    question: 'সমুদ্র সৈকতে কখন গোসল করা সবচেয়ে বিপজ্জনক?',
    options: ['জোয়ারের সময়', 'ভাটার সময় (Low Tide)', 'সকালের শান্ত বাতাসে', 'দুপুরের রোদে'],
    correct: 1,
    explanation: 'ভাটার সময় পানির টান বা রিপ কারেন্ট সমুদ্রের গভীরে টেনে নেয়, তাই ভাটার সময় গভীর সমুদ্রে যাওয়া নিষেধ।'
  },
  {
    id: 5,
    question: 'বাংলাদেশের একমাত্র পাহাড়ি দ্বীপ কোনটি?',
    options: ['সেন্টমার্টিন', 'মহেশখালী', 'ছেঁড়াদ্বীপ', 'হাতিয়া'],
    correct: 1,
    explanation: 'মহেশখালী বাংলাদেশের একমাত্র পাহাড়ি দ্বীপ, যেখানে বিখ্যাত আদিনাথ মন্দির ও পানের বরজ রয়েছে।'
  },
  {
    id: 6,
    question: 'হিমছড়ি পাহাড়ে কোন প্রাকৃতিক সৌন্দর্য দেখার মতো?',
    options: ['পাহাড়ি ঝর্ণা ও সমুদ্রের ভিউ', 'আইসবর্গ', 'চা বাগান', 'হরিণ প্রজনন কেন্দ্র'],
    correct: 0,
    explanation: 'হিমছড়িতে রয়েছে শীতল পাহাড়ি ঝর্ণা এবং পাহাড়ের চূড়া থেকে বঙ্গোপসাগরের দিগন্ত বিস্তৃত রূপ।'
  },
  {
    id: 7,
    question: 'মেরিন ড্রাইভ রোড কোন দুটি স্থানকে সরাসরি সংযুক্ত করেছে?',
    options: ['কক্সবাজার থেকে টেকনাফ', 'কক্সবাজার থেকে চট্টগ্রাম', 'কক্সবাজার থেকে বান্দরবান', 'কক্সবাজার থেকে রাঙ্গামাটি'],
    correct: 0,
    explanation: '৮০ কি.মি. দীর্ঘ মেরিন ড্রাইভ রোড কক্সবাজার কলাতলী থেকে টেকনাফ পর্যন্ত বিস্তৃত, যার একপাশে পাহাড় ও অন্যপাশে সমুদ্র।'
  },
  {
    id: 8,
    question: 'বার্মিজ মার্কেটের সবচেয়ে জনপ্রিয় কেনাকাটার আইটেম কোনটি?',
    options: ['বার্মিজ আচার, চকোলেট ও স্যান্ডেল', 'মোবাইল ফোন', 'ল্যাপটপ', 'মাটির হাড়ি'],
    correct: 0,
    explanation: 'বার্মিজ আচার, চকোলেট, স্যান্ডেল, থামি এবং কাঠের হস্তশিল্প পর্যটকদের প্রধান আকর্ষণ।'
  }
];

export default function TourQuizModal({
  isOpen,
  onClose,
  currentUser = null,
  currentProfile = {},
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const currentQ = QUIZ_QUESTIONS[currentIdx];

  const handleSelectOption = (idx) => {
    if (isAnswered) return;
    setSelectedOpt(idx);
    setIsAnswered(true);

    if (idx === currentQ.correct) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 < QUIZ_QUESTIONS.length) {
      setCurrentIdx(prev => prev + 1);
      setSelectedOpt(null);
      setIsAnswered(false);
    } else {
      setIsFinished(true);
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelectedOpt(null);
    setIsAnswered(false);
    setScore(0);
    setIsFinished(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-amber-100">

        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 p-4 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs text-white flex items-center justify-center font-extrabold shadow-inner">
              <Trophy size={22} className="text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm sm:text-base text-white">কক্সবাজার ফ্যামিলি কুইজ ২০২৬</h3>
                <span className="text-[9px] bg-white text-orange-950 font-bold px-1.5 py-0.2 rounded-md">Trivia</span>
              </div>
              <p className="text-[10px] text-amber-100">
                বাস জার্নি ও আড্ডার আনন্দঘন জ্ঞান ও মেমোরি কুইজ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-amber-100 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-50/70 text-xs flex flex-col justify-between">
          {!isFinished ? (
            <div className="space-y-4">
              {/* Progress Bar & Score Counter */}
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                <span>প্রশ্ন {currentIdx + 1} / {QUIZ_QUESTIONS.length}</span>
                <span className="text-amber-600 flex items-center gap-1">
                  <Star size={13} fill="currentColor" /> স্কোর: {score}
                </span>
              </div>

              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-300"
                  style={{ width: `${((currentIdx + 1) / QUIZ_QUESTIONS.length) * 100}%` }}
                />
              </div>

              {/* Question Text */}
              <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-2xs">
                <h4 className="font-extrabold text-sm sm:text-base text-slate-800 leading-snug">
                  {currentQ.question}
                </h4>
              </div>

              {/* Options */}
              <div className="space-y-2 pt-1">
                {currentQ.options.map((opt, idx) => {
                  let btnStyle = 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200';
                  if (isAnswered) {
                    if (idx === currentQ.correct) {
                      btnStyle = 'bg-emerald-50 text-emerald-950 border-emerald-400 font-bold shadow-xs';
                    } else if (idx === selectedOpt) {
                      btnStyle = 'bg-rose-50 text-rose-950 border-rose-400 font-bold';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isAnswered}
                      onClick={() => handleSelectOption(idx)}
                      className={`w-full p-3 sm:p-3.5 rounded-2xl border text-left text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-between ${btnStyle}`}
                    >
                      <span>{opt}</span>
                      {isAnswered && idx === currentQ.correct && (
                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                      )}
                      {isAnswered && idx === selectedOpt && idx !== currentQ.correct && (
                        <XCircle size={18} className="text-rose-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation Card */}
              {isAnswered && (
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-950 leading-relaxed animate-in fade-in">
                  <p className="font-bold flex items-center gap-1 mb-0.5">
                    💡 সঠিক ব্যাখ্যা:
                  </p>
                  <p>{currentQ.explanation}</p>
                </div>
              )}
            </div>
          ) : (
            /* FINISHED RESULT SCREEN */
            <div className="text-center py-6 space-y-4">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center font-black text-3xl shadow-lg">
                🏆
              </div>

              <div>
                <h3 className="font-extrabold text-xl text-slate-800">
                  কুইজ সম্পন্ন হয়েছে!
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {currentProfile?.displayName || currentUser?.displayName || 'ট্যুর সদস্য'} এর ফলাফল:
                </p>
              </div>

              <div className="p-4 bg-white rounded-3xl border border-amber-200 inline-block shadow-sm">
                <span className="text-xs text-slate-400 font-bold block">আপনার মোট স্কোর</span>
                <span className="text-3xl font-black text-amber-600">{score} / {QUIZ_QUESTIONS.length}</span>
                <p className="text-[11px] text-slate-600 font-semibold mt-1">
                  {score >= 7 ? '🌟 অসাধারণ! আপনি একজন ট্রু কক্সবাজার প্রো!' : score >= 5 ? '👍 চমৎকার জ্ঞান! শুভ ভ্রমণ!' : '🌴 সুন্দর চেষ্টা! ট্যুরে গিয়ে নতুন অভিজ্ঞতা হবে!'}
                </p>
              </div>

              {/* Badge Certificate */}
              <div className="p-3 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl border border-teal-200 flex items-center justify-center gap-2 text-teal-900 font-bold text-xs">
                <Award size={18} className="text-teal-700" />
                <span>অ্যাওয়ার্ড: 'কক্সবাজার ফ্যামিলি ট্যুর মেমোরি চ্যাম্পিয়ন ২০২৬'</span>
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            {!isFinished ? (
              <button
                type="button"
                disabled={!isAnswered}
                onClick={handleNext}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 text-white font-extrabold rounded-2xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md text-xs"
              >
                <span>{currentIdx + 1 === QUIZ_QUESTIONS.length ? 'ফলাফল দেখুন' : 'পরবর্তী প্রশ্ন'}</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <div className="flex gap-2 w-full">
                <button
                  type="button"
                  onClick={handleRestart}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl flex items-center justify-center gap-1 transition cursor-pointer text-xs"
                >
                  <RotateCcw size={14} /> আবার খেলুন
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-teal-800 hover:bg-teal-700 text-white font-bold rounded-2xl flex items-center justify-center gap-1 transition cursor-pointer text-xs shadow-md"
                >
                  <CheckCircle2 size={14} /> শেষ করুন
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
