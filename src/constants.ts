import { CorruptionType } from './types';

export const DEFAULT_CORRUPTION_TYPES: CorruptionType[] = [
  { id: 'bribe', name: 'ঘুষ', icon: 'Banknote' },
  { id: 'government', name: 'সরকারি দুর্নীতি', icon: 'Building2' },
  { id: 'police', name: 'পুলিশ দুর্নীতি', icon: 'ShieldAlert' },
  { id: 'tender', name: 'টেন্ডার দুর্নীতি', icon: 'FileText' },
  { id: 'other', name: 'অন্যান্য', icon: 'AlertCircle' },
];
