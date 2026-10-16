import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles, MessageSquare, Send, X, Bot, Volume2, VolumeX,
  Compass, MapPin, AlertTriangle, Lightbulb, RefreshCw, ThumbsUp, Copy, Check
} from 'lucide-react';

// Curated Knowledge Base for Cox's Bazar Tour 2026
const COX_BAZAR_KNOWLEDGE = [
  {
    keywords: ['খাবার', 'রেস্তোরাঁ', 'মাছ', 'সী-ফুড', 'সীফুড', 'রূপচাঁদা', 'কোরার', 'লাঞ্চ', 'ডিনার'],
    title: '🍽️ কক্সবাজারের সেরা সী-ফুড ও রেস্তোরাঁ টিপস',
    response: `কক্সবাজারে ফ্রেশ সী-ফুডের জন্য সেরা জায়গাগুলো হলো:\n
১. ঝাউবন ও পৌশী রেস্তোরাঁ (হোটেল মোটেল জোন) — এখানকার ভর্তা platter ও রূপচাঁদা ফ্রাই অত্যন্ত জনপ্রিয়।
২. কাছিম বিচ পয়েন্ট ও সুগন্ধা বিচের ফ্রাই মার্কেট — সরাসরি জীবন্ত মাছ পছন্দ করে চোখের সামনে ফ্রাই করিয়ে খেতে পারবেন। তবে আগে দরদাম করে নেবেন (রূপচাঁদা সাইজভেদে ৳৩৫০-৳৬০০)।
৩. নিরিবিলি রেস্তোরাঁ — ট্রেডিশনাল সামুদ্রিক কোরাল, লইট্টা ফ্রাই ও কাঁকড়া রান্নার জন্য পরিচিত।
৪. পরামর্শ: দুপুরের খাবারের জন্য হোটেল সি মুন থেকে সুগন্ধা পয়েন্টের পৌশী রেস্তোরাঁ মাত্র ৫ মিনিটের পথ।`
  },
  {
    keywords: ['ইনানী', 'হিমছড়ি', 'পাথর', 'প্রবাল', 'ঝর্ণা', 'পাহাড়', 'মেরিন ড্রাইভ'],
    title: '🏖️ ইনানী ও হিমছড়ি ভ্রমণের সেরা সময় ও পরামর্শ',
    response: `ইনানী ও হিমছড়ি ভ্রমণের জন্য সবচেয়ে আকর্ষণীয় হলো 'মেরিন ড্রাইভ রোড':\n
১. ইনানী বিচের প্রবাল পাথরে হাঁটার জন্য ভাটার সময় সবচেয়ে উপযুক্ত। ভাটার সময় পানি নেমে গেলে প্রবাল পাথরের প্রাকৃতিক রূপ ফুটে ওঠে।
২. আমাদের ট্যুর শিডিউলে ১৮ অক্টোবর দুপুর ২:৩০ টায় ছাদখোলা দোতলা বাসে মেরিন ড্রাইভ দিয়ে ইনানী যাত্রা নির্ধারিত রয়েছে।
৩. হিমছড়ি পাহাড়ে ওঠার সময় সাবধানে সিঁড়ি ব্যবহার করবেন, উপরে দাঁড়ালে পুরো সমুদ্র একসাথে দিগন্তজুড়ে দেখা যায়।
৪. প্রবাল পাথরে হাঁটার সময় গ্রিপযুক্ত স্লিপার বা স্যান্ডেল পরুন, কারণ কিছু পাথর পিচ্ছিল হতে পারে।`
  },
  {
    keywords: ['কেনাকাটা', 'শপিং', 'মার্কেট', 'বার্মিজ', 'আচার', 'শামুক', 'ঝিনুক', 'লুঙ্গি'],
    title: '🛍️ বার্মিজ মার্কেট ও কেনাকাটার সিক্রেট কৌশল',
    response: `বার্মিজ মার্কেটে কেনাকাটার কিছু প্রয়োজনীয় টিপস:\n
১. বার্মিজ আচার, চকলেট, স্যান্ডেল, থামি ও টেকনাফের চুরুট এখানে প্রচুর পাওয়া যায়।
২. প্রথম যে দাম চাইবে, সাধারণত তার ৬০-৭০% দামে দরদাম শুরু করা বুদ্ধিমানের কাজ।
৩. খাঁটি কাঠের তৈরি ও ঝিনুকের হস্তশিল্প কেনার জন্য বৌদ্ধ মন্দির রোডের পেছনের দোকানগুলো যাচাই করুন।
৪. শুঁটকি কেনার জন্য নুনিয়াছড়া বা বড়বাজার শুঁটকি পল্লীতে সরাসরি যাওয়া ভালো, সেখানে কেমিক্যালমুক্ত রূপচাঁদা ও লইট্টা শুঁটকি পাওয়া যায়।`
  },
  {
    keywords: ['সাঁতার', 'জোয়ার', 'ভাটা', 'বিপদ', 'গোসল', 'নিরাপত্তা', 'সতর্কতা', 'লাইফ জ্যাকেট'],
    title: '🛟 সমুদ্রে গোসল ও লাইফগার্ড নিরাপত্তা সতর্কতা',
    response: `সমুদ্রে নামার সময় অবশ্যই নিচের নিয়মগুলো মেনে চলুন:\n
১. ভাটার সময় কোনোভাবেই সমুদ্রে বেশি দূরে যাবেন না। ভাটার সময় পানির নিচের চোরাস্রোত বা রিপ কারেন্ট সমুদ্রের গভীরে টেনে নিতে পারে।
২. লাল পতাকা টানানো থাকলে সমুদ্রে নামা সম্পূর্ণ নিষেধ। হলুদ পতাকা থাকলে হাঁটু সমান পানিতে নিরাপদে গোসল করা যায়।
৩. পরিবারের ছোট বাচ্চাদের কখনোই একা পানিতে ছাড়বেন না।
৪. ট্যুর অ্যাপের ড্যাশবোর্ডে লাইভ 'জোয়ার-ভাটা শিডিউল' দেওয়া আছে—জোয়ারের শান্ত পানিতে গোসল করা সবচেয়ে নিরাপদ।
৫. জরুরি প্রয়োজনে ট্যুরিস্ট পুলিশের হেল্পলাইন: 01320-163599 অথবা 999 এ কল করুন।`
  },
  {
    keywords: ['মহেশখালী', 'আদিনাথ', 'পান', 'ট্রলার', 'পানের বরজ'],
    title: '🛕 মহেশখালী দ্বীপ ও আদিনাথ মন্দির গাইড',
    response: `মহেশখালী বাংলাদেশের একমাত্র পাহাড়ি দ্বীপ:\n
১. কক্সবাজার নুনিয়াছড়া ৬ নম্বর ঘাট থেকে স্পিডবোট বা ট্রলারে বাঁকখালী নদী পার হয়ে মহেশখালী যেতে ২০-২৫ মিনিট সময় লাগে।
২. মৈনাক পাহাড়ের চূড়ায় অবস্থিত ঐতিহাসিক 'শ্রী শ্রী আদিনাথ মন্দির' ও বৌদ্ধ বিহার ঘুরে দেখুন।
৩. মহেশখালীর বিখ্যাত মিষ্টি পান ও পানের বরজ দেখতে ভুলবেন না।`
  }
];

export default function AITourGuideModal({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'নমস্কার ও আসসালামু আলাইকুম! আমি আপনার Cox\'s Bazar Tour AI গাইড 🤖🌴\n\nকক্সবাজারের খাবার, দর্শনীয় স্থান, কেনাকাটার দরদাম, জোয়ার-ভাটা বা নিরাপত্তা নিয়ে যেকোনো প্রশ্ন করতে পারেন!',
      time: 'এইমাত্র'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Handle Speech Output (Text-to-Speech)
  const handleSpeak = (text) => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/[#*`_]/g, ''));
      utterance.lang = 'bn-BD';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    } else {
      alert('আপনার ব্রাউজারে টেক্সট-টু-স্পিচ সমর্থিত নয়।');
    }
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendMessage = (textToSend) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // AI Analysis Engine
    setTimeout(() => {
      const lower = query.toLowerCase();
      let matchedItem = COX_BAZAR_KNOWLEDGE.find(item =>
        item.keywords.some(kw => lower.includes(kw))
      );

      let reply = '';
      if (matchedItem) {
        reply = matchedItem.response;
      } else if (lower.includes('ক্যাপশন') || lower.includes('ছবি') || lower.includes('পোস্ট')) {
        reply = `📸 ইনস্টাফিডের জন্য কিছু চমৎকার বাংলা ক্যাপশন সাজেস্ট করছি:\n\n১. "সমুদ্রের নীল ঢেউ আর পরিবারের প্রাণখোলা হাসিমুখ — কক্সবাজার ২০২৬ স্মৃতিতে অমলিন! 🌊💙"\n২. "ইনানীর প্রবাল পাথরে পড়ন্ত বিকেলের স্নিগ্ধ রোদ 🌅✨"\n৩. "রংপুর থেকে টেকনাফ জিরো পয়েন্ট — দীর্ঘ পথ, কিন্তু ভালোবাসার বন্ধন অটুট! 🚌🌴"`;
      } else {
        reply = `কক্সবাজার ট্যুরের জন্য আপনার প্রশ্নটি চমৎকার! 😊\n\nআমাদের ফ্যামিলি ট্যুর ২০২৬-এর বিস্তারিত সূচি অনুযায়ী:
• হোটেল: হোটেল সি মুন (কলাতলী/সুগন্ধা বিচ)
• বাস: এভারগ্রীন এসি বাস ও ছাদখোলা দোতলা বাস
• বিশেষ দ্রষ্টব্য: সমুদ্র সৈকতে গোসলের পূর্বে ড্যাশবোর্ডের জোয়ার-ভাটা লাইভ কার্ডটি দেখে নিন।\n\nআপনি নির্দিষ্ট কোনো স্থান (ইনানী, হিমছড়ি, বার্মিজ মার্কেট বা সেরা খাবার) সম্পর্কে জানতে চাইলে নিচে বাটনে ট্যাপ করতে পারেন!`;
      }

      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: reply,
          time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setIsTyping(false);
    }, 700);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-teal-100">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-cyan-900 p-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-200 text-teal-950 flex items-center justify-center font-extrabold shadow-md">
              <Bot size={22} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm sm:text-base">AI ট্যুর গাইড ও কো-পাইলট</h3>
                <span className="text-[9px] bg-amber-400 text-teal-950 font-bold px-1.5 py-0.2 rounded-md">Gemini</span>
              </div>
              <p className="text-[10px] text-teal-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                কক্সবাজার ভ্রমণ ও নিরাপত্তা তথ্য ভাণ্ডার
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handleSpeak(messages[messages.length - 1]?.text || '')}
              className={`p-2 rounded-xl transition cursor-pointer ${
                isSpeaking ? 'bg-amber-400 text-teal-950 animate-bounce' : 'text-teal-200 hover:text-white hover:bg-teal-700/60'
              }`}
              title={isSpeaking ? 'কথা বলা বন্ধ করুন' : 'শেষ উত্তরটি বাংলায় শুনুন'}
            >
              {isSpeaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button
              onClick={() => {
                if (isSpeaking) window.speechSynthesis.cancel();
                onClose();
              }}
              className="p-2 text-teal-200 hover:text-white rounded-xl hover:bg-teal-700/60 transition cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3.5 py-2.5 bg-teal-50/80 border-b border-teal-100 flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0">
          <span className="text-[10px] font-bold text-teal-900 shrink-0">প্রশ্ন সাজেস্ট:</span>
          {[
            '🍽️ সেরা সী-ফুড রেস্তোরাঁ',
            '🏖️ ইনানী ও হিমছড়ি টিপস',
            '🛍️ বার্মিজ মার্কেটে দরদাম',
            '🛟 সমুদ্রে গোসল সতর্কতা',
            '📸 সুন্দর বাংলা ক্যাপশন'
          ].map(chip => (
            <button
              key={chip}
              onClick={() => handleSendMessage(chip)}
              className="px-2.5 py-1 bg-white hover:bg-teal-100/90 text-teal-950 font-semibold rounded-xl border border-teal-200/80 shrink-0 transition cursor-pointer shadow-2xs hover:scale-102"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Messages Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50 text-xs">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div className="w-7 h-7 rounded-xl bg-teal-800 text-amber-300 flex items-center justify-center shrink-0 font-bold text-xs shadow-2xs">
                  🤖
                </div>
              )}

              <div
                className={`relative group max-w-[85%] sm:max-w-[80%] p-3.5 rounded-2xl shadow-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-teal-700 text-white rounded-tr-xs'
                    : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs whitespace-pre-wrap'
                }`}
              >
                <p className="text-xs">{msg.text}</p>
                <div className="flex items-center justify-between gap-3 mt-1.5 pt-1 border-t border-black/5 text-[9px] opacity-75">
                  <span>{msg.time}</span>
                  {msg.sender === 'ai' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleSpeak(msg.text)}
                        className="hover:text-teal-700 cursor-pointer p-0.5"
                        title="বাংলায় শুনুন"
                      >
                        <Volume2 size={12} />
                      </button>
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="hover:text-teal-700 cursor-pointer p-0.5"
                        title="কপি করুন"
                      >
                        {copiedId === msg.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-2 text-teal-800 text-xs font-semibold p-2 bg-white rounded-2xl w-fit shadow-2xs border border-teal-100">
              <Bot size={15} className="animate-spin text-teal-600" />
              <span>AI উত্তর তৈরি করছে...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="কক্সবাজার সম্পর্কে যা খুশি জিজ্ঞাসা করুন..."
            className="flex-1 px-3.5 py-2.5 text-xs bg-slate-100/80 border border-slate-200 rounded-2xl focus:outline-none focus:border-teal-600 focus:bg-white text-slate-800"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2.5 bg-teal-800 hover:bg-teal-700 disabled:opacity-40 text-amber-300 font-bold rounded-2xl transition cursor-pointer shadow-sm hover:scale-105 active:scale-95 shrink-0"
          >
            <Send size={16} />
          </button>
        </form>

      </div>
    </div>
  );
}
