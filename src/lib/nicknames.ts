/**
 * Generates deterministic, funny/bold Bengali nicknames 
 * designed to be viral and memorable
 */

const adjectives = [
  'সাহসী', 'দুর্ধর্ষ', 'অচেনা', 'রহস্যময়', 'ক্ষিপ্র', 'নির্ভীক', 'বিদ্রোহী', 'একাকী',
  'ভয়ংকর', 'তুফানি', 'মারাত্মক', 'বেপরোয়া', 'দাপুটে', 'উড়ন্ত', 'গোপন', 'নাম-না-জানা',
  'ভৌতিক', 'বিপজ্জনক', 'অদম্য', 'ক্ষেপা', 'পাগলা', 'হুলিয়া', 'ছদ্মবেশী', 'দুর্দান্ত',
  'জাদুকরী', 'বজ্র', 'ঝড়ো', 'উন্মাদ', 'চতুর', 'বিচিত্র'
];

const nouns = [
  'বাঘ', 'ঈগল', 'সিংহ', 'অজগর', 'ড্রাগন', 'কোবরা', 'বাজপাখি', 'চিতা',
  'নেকড়ে', 'প্যান্থার', 'ফিনিক্স', 'যোদ্ধা', 'গোয়েন্দা', 'নিনজা', 'সমুরাই', 'বিপ্লবী',
  'ভাইকিং', 'স্পার্টান', 'গ্ল্যাডিয়েটর', 'হ্যাকার', 'শিকারি', 'পাহারাদার', 'রক্ষক', 'সেনাপতি',
  'তীরন্দাজ', 'ঝটিকা', 'বিদ্যুৎ', 'অগ্নি', 'ভূমিকম্প', 'সুনামি'
];

/**
 * Generates a deterministic nickname from any string ID
 */
export function generateNickname(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const absHash = Math.abs(hash);
  const adj = adjectives[absHash % adjectives.length];
  const noun = nouns[(absHash >> 8) % nouns.length];
  return `${adj} ${noun}`;
}

/**
 * Generates a consistent avatar color from an ID
 */
export function generateAvatarColor(id: string): string {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
    '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
    '#a855f7', '#d946ef', '#ec4899', '#f43f5e'
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  return colors[Math.abs(hash) % colors.length];
}
