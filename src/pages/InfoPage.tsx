import React from 'react';
import { Shield, Lock, AlertTriangle, Eye, Heart, Users, Scale, ExternalLink } from 'lucide-react';

export default function InfoPage() {
  const sections = [
    {
      title: 'Chor Koi কী?',
      icon: Shield,
      content: `"চোর কই" একটি জনগণের ক্ষমতায়নের প্ল্যাটফর্ম যা দুর্নীতি উদ্ঘাটন এবং জনসাধারণের জবাবদিহিতা নিশ্চিত করতে তৈরি করা হয়েছে।

আমরা বিশ্বাস করি যে স্বচ্ছতাই দুর্নীতিমুক্ত সমাজের প্রথম পদক্ষেপ। নাগরিকদের রিপোর্ট এবং যাচাই করার ক্ষমতা দিয়ে আমরা এমন একটি সম্মিলিত কণ্ঠ তৈরি করি যা উপেক্ষা করা যায় না।`,
      color: 'text-red-600 bg-red-50'
    },
    {
      title: 'কিভাবে কাজ করে?',
      icon: Eye,
      content: `ধাপ ১: দুর্নীতি দেখলে রিপোর্ট করুন — ধরন, বিবরণ, অবস্থান ও প্রমাণসহ
ধাপ ২: ম্যাপে সকল রিপোর্ট পিন আকারে দেখা যায়
ধাপ ৩: জনগণ ভোটের মাধ্যমে সত্যতা যাচাই করে
ধাপ ৪: ভোটের ভিত্তিতে রিপোর্টের বিশ্বাসযোগ্যতা নির্ধারণ হয়

সবকিছু সম্পূর্ণ বেনামে — আপনার পরিচয় কখনো প্রকাশ হবে না!`,
      color: 'text-blue-600 bg-blue-50'
    },
    {
      title: 'কেন রিপোর্ট করবেন?',
      icon: Heart,
      content: `• দুর্নীতির বিরুদ্ধে আওয়াজ তুলুন
• আপনার এলাকায় দুর্নীতির তথ্য সবাইকে জানান
• প্রমাণসহ রিপোর্ট দায়িত্বশীল প্রশাসনে চাপ সৃষ্টি করে
• জনগণের সম্মিলিত ভোট সত্যতা প্রমাণ করে
• ম্যাপে চিহ্নিত হলে সংশ্লিষ্ট কর্তৃপক্ষ সচেতন হয়

একজনের সাহসী পদক্ষেপ হাজারো মানুষকে অনুপ্রাণিত করে!`,
      color: 'text-green-600 bg-green-50'
    },
    {
      title: 'ভোটিং সিস্টেম',
      icon: Users,
      content: `প্রতিটি রিপোর্টে তিন ধরনের ভোট দেওয়া যায়:

"সত্য" — আপনি বিশ্বাস করেন রিপোর্টটি সঠিক
"মিথ্যা" — আপনি মনে করেন রিপোর্টটি ভুল বা মিথ্যা
"প্রমাণ চাই" — আরো প্রমাণ বা তথ্য প্রয়োজন

লাল পিন = সংখ্যাগরিষ্ঠ "সত্য" ভোট
হলুদ পিন = "প্রমাণ চাই" সর্বোচ্চ
সবুজ পিন = সংখ্যাগরিষ্ঠ "মিথ্যা" ভোট

প্রতিটি রিপোর্টে একবারই ভোট দেওয়া যায়।`,
      color: 'text-purple-600 bg-purple-50'
    },
    {
      title: 'গোপনীয়তা নীতি',
      icon: Lock,
      content: `আপনার গোপনীয়তা আমাদের সর্বোচ্চ অগ্রাধিকার।

• রিপোর্ট সম্পূর্ণ বেনামে জমা হয়
• আপনার ব্যক্তিগত পরিচয় ট্র্যাক করা হয় না
• লোকেশন ডেটা শুধুমাত্র ম্যাপে রিপোর্ট দেখানোর জন্য ব্যবহৃত হয়
• কোনো লগইন বা রেজিস্ট্রেশনের প্রয়োজন নেই
• প্রতিটি রিপোর্টকারীকে একটি স্বয়ংক্রিয় ছদ্মনাম দেওয়া হয়
• আইপি অ্যাড্রেস সংরক্ষণ করা হয় না`,
      color: 'text-indigo-600 bg-indigo-50'
    },
    {
      title: 'ব্যবহারের শর্তাবলী',
      icon: Scale,
      content: `এই অ্যাপ ব্যবহার করে আপনি সম্মত হচ্ছেন:

• সত্য ও নির্ভুল তথ্য প্রদান করবেন
• মিথ্যা রিপোর্ট বা দূষিত ব্যবহার করবেন না
• প্রমাণসহ দায়িত্বশীল রিপোর্ট করবেন
• অন্যের ব্যক্তিগত তথ্য অনুমতি ছাড়া প্রকাশ করবেন না
• ভোটিং সিস্টেমের অপব্যবহার করবেন না

মিথ্যা রিপোর্ট বা দূষিত ব্যবহারে রিপোর্ট সরিয়ে ফেলা হতে পারে।`,
      color: 'text-teal-600 bg-teal-50'
    },
    {
      title: 'দায়মুক্তি ঘোষণা',
      icon: AlertTriangle,
      content: `গুরুত্বপূর্ণ তথ্য:

• এই প্ল্যাটফর্মের রিপোর্টগুলি ব্যবহারকারী-জমাকৃত এবং জনগণের ভোটে যাচাইকৃত
• "চোর কই" প্রতিটি রিপোর্ট স্বাধীনভাবে যাচাই করে না
• ব্যবহারকারীদের নিজস্ব বিচারবুদ্ধি প্রয়োগ করা উচিত
• ব্যবহারকারী-তৈরি বিষয়বস্তুর নির্ভুলতার জন্য আমরা দায়ী নই
• এটি কোনো আইনি প্রমাণ হিসেবে গণ্য নয়`,
      color: 'text-yellow-600 bg-yellow-50'
    },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-red-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl rotate-3">
          <Shield size={40} className="text-white" />
        </div>
        <h1 className="text-4xl font-black text-gray-900 mb-2">চোর কই</h1>
        <p className="text-gray-500 font-medium">জনগণের ক্ষমতায়ন • দুর্নীতির বিরুদ্ধে আওয়াজ</p>
      </div>

      <div className="space-y-5 mb-12">
        {sections.map((section, i) => {
          const Icon = section.icon;
          return (
            <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2.5 rounded-xl ${section.color}`}>
                  <Icon size={20} />
                </div>
                <h2 className="text-lg font-bold text-gray-900">{section.title}</h2>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{section.content}</p>
            </div>
          );
        })}
      </div>

      {/* Developer section - name only with portfolio link */}
      <div className="bg-gray-900 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="relative z-10 text-center">
          <p className="text-red-500 font-bold text-xs uppercase tracking-widest mb-3">ডেভেলপার</p>
          <a
            href="https://ridoan-zisan.netlify.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-2xl font-black text-white hover:text-red-400 transition-colors"
          >
            Md Ridoan Mahmud Zisan
            <ExternalLink size={20} className="text-red-400" />
          </a>
        </div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-red-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-red-600/10 rounded-full blur-3xl"></div>
      </div>

      <p className="text-center text-gray-400 text-xs mt-12">
        &copy; {new Date().getFullYear()} Chor Koi। সর্বস্বত্ব সংরক্ষিত।
      </p>
    </div>
  );
}
