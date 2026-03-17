import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, ExternalLink } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  quickReplies?: string[];
}

const RESPONSES: { keywords: string[]; reply: string; links?: { text: string; url: string }[] }[] = [
  {
    keywords: ['হ্যালো', 'hello', 'hi', 'হাই', 'hey', 'শুভ', 'আসসালামু'],
    reply: 'হ্যালো! 👋 Chor Koi-তে স্বাগতম!\n\nআমি আপনার সহকারী। আমি আপনাকে ধাপে ধাপে সাহায্য করবো। নিচের যেকোনো বিষয়ে জানতে চাইলে ক্লিক করুন বা লিখুন!',
  },
  {
    keywords: ['রিপোর্ট', 'report', 'অভিযোগ', 'complain', 'কিভাবে রিপোর্ট'],
    reply: '📝 রিপোর্ট করার ধাপসমূহ:\n\n🔹 ধাপ ১: নিচের "রিপোর্ট" বাটনে যান\n🔹 ধাপ ২: দুর্নীতির ধরন বাছাই করুন (ঘুষ, পুলিশ, শিক্ষা ইত্যাদি)\n🔹 ধাপ ৩: একটি শিরোনাম দিন (যেমন: "পাসপোর্ট অফিসে ঘুষ")\n🔹 ধাপ ৪: বিস্তারিত বিবরণ লিখুন\n🔹 ধাপ ৫: অবস্থানের নাম লিখুন ও GPS/ম্যাপ থেকে লোকেশন নির্বাচন করুন\n🔹 ধাপ ৬: প্রমাণের ছবি আপলোড করুন বা লিঙ্ক দিন\n🔹 ধাপ ৭: "রিপোর্ট জমা দিন" বাটনে ক্লিক করুন\n\n✅ আপনার পরিচয় সম্পূর্ণ গোপন থাকবে!',
    links: [{ text: 'এখনই রিপোর্ট করুন', url: '/add' }],
  },
  {
    keywords: ['ম্যাপ', 'map', 'অবস্থান', 'location', 'কোথায়', 'পিন'],
    reply: '🗺️ ম্যাপ কিভাবে ব্যবহার করবেন:\n\n🔹 ম্যাপ পেজে যান - সব রিপোর্ট পিন আকারে দেখবেন\n🔹 রঙের অর্থ:\n   🔴 লাল = সংখ্যাগরিষ্ঠ মানুষ "সত্য" বলেছে\n   🟡 হলুদ = আরো প্রমাণ দরকার\n   🟢 সবুজ = সংখ্যাগরিষ্ঠ "মিথ্যা" বলেছে\n🔹 যেকোনো পিনে ক্লিক করলে বিস্তারিত দেখবেন\n🔹 ম্যাপে ক্লিক করে সরাসরি নতুন রিপোর্ট করতে পারবেন\n🔹 🔵 নীল বিন্দু = আপনার বর্তমান অবস্থান',
    links: [{ text: 'ম্যাপ দেখুন', url: '/map' }],
  },
  {
    keywords: ['ভোট', 'vote', 'সত্য', 'মিথ্যা', 'প্রমাণ', 'যাচাই'],
    reply: '🗳️ ভোট দেওয়ার নিয়ম:\n\n🔹 প্রতিটি রিপোর্টে ৩টি অপশন থাকে:\n   ✅ "সত্য" - আপনি বিশ্বাস করেন এটি সত্য\n   ❌ "মিথ্যা" - আপনি মনে করেন এটি ভুল\n   ❓ "প্রমাণ চাই" - আরো তথ্য দরকার\n\n🔹 ভোট দিতে লগইনের দরকার নেই!\n🔹 প্রতিটি রিপোর্টে একবারই ভোট দেওয়া যায়\n🔹 ভোটের মাধ্যমেই জনগণ সত্যতা যাচাই করে\n\n💡 আপনার ভোট গুরুত্বপূর্ণ - এটি দুর্নীতি প্রতিরোধে সাহায্য করে!',
  },
  {
    keywords: ['install', 'ইনস্টল', 'app', 'অ্যাপ', 'ডাউনলোড', 'ফোনে'],
    reply: '📱 অ্যাপ ইনস্টল করুন:\n\n🔹 ধাপ ১: উপরে "ইনস্টল" বাটন দেখুন (যদি থাকে)\n🔹 ধাপ ২: বাটনে ক্লিক করুন\n🔹 ধাপ ৩: "Add to Home Screen" বা "Install" সিলেক্ট করুন\n\n📌 যদি বাটন না দেখেন:\n   • Chrome: মেনু (⋮) > "Add to Home Screen"\n   • Safari: Share (🔗) > "Add to Home Screen"\n\n✅ ইনস্টল হলে ফোনের মতো কাজ করবে - ইন্টারনেট ছাড়াও!',
  },
  {
    keywords: ['সাহায্য', 'help', 'কিভাবে', 'how', 'বুঝি না', 'বুঝতেছি না', 'শিখাও'],
    reply: '🤝 আমি আপনাকে সাহায্য করবো!\n\nনিচের যেকোনো বিষয়ে জানতে চাইলে ক্লিক করুন:\n\n📝 "রিপোর্ট" - দুর্নীতি রিপোর্ট করার নিয়ম\n🗺️ "ম্যাপ" - ম্যাপ কিভাবে ব্যবহার করবেন\n🗳️ "ভোট" - ভোট দেওয়ার নিয়ম\n📱 "ইনস্টল" - অ্যাপ ইনস্টল করার উপায়\nℹ️ "তথ্য" - Chor Koi সম্পর্কে জানুন\n🔒 "গোপনীয়তা" - আপনার তথ্য কতটা সুরক্ষিত\n\n💬 অথবা আপনার প্রশ্ন সরাসরি লিখুন!',
  },
  {
    keywords: ['ধন্যবাদ', 'thanks', 'thank', 'শুকরিয়া'],
    reply: 'আপনাকেও ধন্যবাদ! 🙏\n\nদুর্নীতিমুক্ত বাংলাদেশ গড়তে আমরা সবাই একসাথে। আপনার প্রতিটি রিপোর্ট এবং ভোট গুরুত্বপূর্ণ!\n\n💪 সাহসী হন, সত্য বলুন!',
  },
  {
    keywords: ['info', 'তথ্য', 'about', 'সম্পর্কে', 'কি এটা', 'কেন'],
    reply: 'ℹ️ Chor Koi কী?\n\n🔹 এটি একটি জনগণের ক্ষমতায়নের প্ল্যাটফর্ম\n🔹 যে কেউ বেনামে দুর্নীতির রিপোর্ট করতে পারে\n🔹 জনগণ ভোটের মাধ্যমে সত্যতা যাচাই করে\n🔹 ম্যাপে সব রিপোর্ট দেখা যায়\n\n🎯 উদ্দেশ্য: স্বচ্ছতা ও জবাবদিহিতা নিশ্চিত করা\n\n🔒 আপনার পরিচয় সম্পূর্ণ গোপন থাকে',
    links: [{ text: 'আরও জানুন', url: '/info' }],
  },
  {
    keywords: ['গোপনীয়তা', 'privacy', 'গোপন', 'নিরাপদ', 'safe', 'security', 'পরিচয়'],
    reply: '🔒 আপনার গোপনীয়তা:\n\n🔹 রিপোর্ট সম্পূর্ণ বেনামে হয়\n🔹 আপনার নাম, ফোন নম্বর কিছুই সংরক্ষণ হয় না\n🔹 আইপি অ্যাড্রেসও ট্র্যাক করা হয় না\n🔹 প্রতিটি রিপোর্টকারীর ছদ্মনাম দেওয়া হয়\n🔹 লোকেশন শুধু ম্যাপে দেখানোর জন্য ব্যবহৃত হয়\n\n✅ আপনি নিশ্চিন্তে রিপোর্ট করতে পারেন!',
  },
  {
    keywords: ['কে বানাইছে', 'developer', 'ডেভেলপার', 'নির্মাতা', 'বানাইছে কে'],
    reply: '👨‍💻 Chor Koi তৈরি করেছেন:\n\nMd Ridoan Mahmud Zisan\n🌐 Web Developer & IT Specialist\n📍 Bogura, Bangladesh\n\n🔗 Portfolio: ridoan-zisan.netlify.app\n\n💡 দুর্নীতিমুক্ত সমাজ গড়ার স্বপ্ন নিয়ে এই প্ল্যাটফর্ম তৈরি।',
  },
];

const DEFAULT_QUICK_REPLIES = ['📝 রিপোর্ট করবো', '🗺️ ম্যাপ দেখাও', '🗳️ ভোট কিভাবে?', '📱 অ্যাপ ইনস্টল', '🔒 গোপনীয়তা', '❓ সাহায্য'];

function findResponse(text: string): { reply: string; links?: { text: string; url: string }[] } {
  const lower = text.toLowerCase();
  for (const r of RESPONSES) {
    if (r.keywords.some(k => lower.includes(k))) return r;
  }
  return {
    reply: 'দুঃখিত, আমি ঠিক বুঝতে পারিনি। 😅\n\nনিচের অপশনগুলো থেকে বাছাই করুন, অথবা সহজ বাংলায় আবার লিখুন!\n\n💡 টিপস: "রিপোর্ট", "ম্যাপ", "ভোট", "সাহায্য" - এই শব্দগুলো লিখে দেখুন।',
  };
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'আসসালামু আলাইকুম! 👋\n\nআমি Chor Koi বট। আমি আপনাকে ধাপে ধাপে সাহায্য করবো - আপনি কিছু না জানলেও চিন্তা নেই!\n\nনিচের যেকোনো বাটনে ক্লিক করুন বা আপনার প্রশ্ন লিখুন:',
      sender: 'bot',
      quickReplies: DEFAULT_QUICK_REPLIES,
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), text, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const response = findResponse(text);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: response.reply + (response.links ? '\n\n' + response.links.map(l => `🔗 ${l.text}`).join('\n') : ''),
        sender: 'bot',
        quickReplies: DEFAULT_QUICK_REPLIES,
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 600 + Math.random() * 500);
  };

  const renderMessageText = (text: string) => {
    // Simple rendering with link detection
    const parts = text.split(/(https?:\/\/[^\s]+|\/[a-z/]+)/g);
    return parts.map((part, i) => {
      if (part.match(/^(https?:\/\/|\/[a-z])/)) {
        return (
          <a key={i} href={part} className="text-blue-500 underline font-bold inline-flex items-center gap-0.5" onClick={(e) => {
            if (part.startsWith('/')) { e.preventDefault(); window.location.href = part; }
          }}>
            {part} <ExternalLink size={12} />
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <>
      {/* FAB - fixed bottom-right, same size as map plus button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all active:scale-90 ${
          isOpen ? 'bg-gray-800' : 'bg-red-600'
        } text-white bottom-24 right-4`}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden bottom-40 right-4 left-4 sm:left-auto sm:w-96" style={{ maxHeight: '60vh' }}>
          {/* Header */}
          <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle size={16} />
              </div>
              <div>
                <span className="font-bold text-sm block leading-tight">Chor Koi সহকারী</span>
                <span className="text-[10px] text-white/70">সবসময় আপনার পাশে</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1.5 rounded-full"><X size={18} /></button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px]">
            {messages.map((msg) => (
              <div key={msg.id}>
                <div className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-red-600 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}>
                    {renderMessageText(msg.text)}
                  </div>
                </div>
                {msg.quickReplies && msg.sender === 'bot' && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {msg.quickReplies.map((qr, i) => (
                      <button key={i} onClick={() => sendMessage(qr)}
                        className="px-3 py-1.5 text-[11px] font-bold bg-red-50 text-red-600 rounded-full border border-red-100 hover:bg-red-100 transition-colors active:scale-95">
                        {qr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1.5">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 p-2 flex gap-2 shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
              placeholder="আপনার প্রশ্ন লিখুন..."
              className="flex-1 px-3 py-2 rounded-full bg-gray-50 border border-gray-200 text-sm outline-none focus:border-red-300"
            />
            <button onClick={() => sendMessage(input)} className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 active:scale-90 transition-all">
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
