import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { Report } from '../types';
import ReportCard from '../components/ReportCard';
import { DEFAULT_CORRUPTION_TYPES } from '../constants';
import { TrendingUp, Clock, MapPin as MapPinIcon, Search, AlertTriangle, BarChart3, Banknote, Shield, Landmark, GraduationCap, Hospital, Building2, Home, Stamp, Zap, Droplets, Bus, Scale, FolderOpen } from 'lucide-react';

const CORRUPTION_ICONS: Record<string, React.ReactNode> = {
  'ঘুষ': <Banknote size={14} />,
  'পুলিশ': <Shield size={14} />,
  'রাজনৈতিক': <Landmark size={14} />,
  'শিক্ষা': <GraduationCap size={14} />,
  'স্বাস্থ্যসেবা': <Hospital size={14} />,
  'সরকারি অফিস': <Building2 size={14} />,
  'ভূমি অফিস': <Home size={14} />,
  'পাসপোর্ট অফিস': <Stamp size={14} />,
  'বিদ্যুৎ বিভাগ': <Zap size={14} />,
  'ওয়াসা/পানি': <Droplets size={14} />,
  'পরিবহন': <Bus size={14} />,
  'বিচার বিভাগ': <Scale size={14} />,
  'অন্যান্য': <FolderOpen size={14} />,
};

export default function FeedPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState<'latest' | 'trending' | 'near'>('latest');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reportsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Report[];
      setReports(reportsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reports');
    });
    return () => unsubscribe();
  }, []);

  const getFilteredReports = () => {
    let filtered = [...reports];
    if (filterType !== 'all') filtered = filtered.filter(r => r.corruptionType === filterType);
    if (sortBy === 'latest') filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    else if (sortBy === 'trending') filtered.sort((a, b) => (b.votesTrue + b.votesFalse + b.votesNeedEvidence) - (a.votesTrue + a.votesFalse + a.votesNeedEvidence));
    else if (sortBy === 'near' && userLocation) {
      filtered.sort((a, b) => {
        const dA = Math.sqrt(Math.pow(a.latitude - userLocation.lat, 2) + Math.pow(a.longitude - userLocation.lng, 2));
        const dB = Math.sqrt(Math.pow(b.latitude - userLocation.lat, 2) + Math.pow(b.longitude - userLocation.lng, 2));
        return dA - dB;
      });
    }
    return filtered;
  };

  const handleNearMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSortBy('near');
      });
    }
  };

  const filteredReports = getFilteredReports();
  const todayReports = reports.filter(r => new Date(r.date).toDateString() === new Date().toDateString()).length;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Stats Banner - Red only */}
      <div className="mx-4 mt-4 mb-4 bg-red-600 rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-700/50 to-red-500/50" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <AlertTriangle size={28} className="text-white" />
            </div>
            <div>
              <p className="text-white/80 text-[11px] font-bold uppercase tracking-widest">আজকের রিপোর্ট</p>
              <p className="text-4xl font-black text-white leading-none mt-0.5">{todayReports}</p>
            </div>
          </div>
          <div className="h-14 w-px bg-white/30" />
          <div className="flex items-center gap-3">
            <div>
              <p className="text-white/80 text-[11px] font-bold uppercase tracking-widest text-right">মোট রিপোর্ট</p>
              <p className="text-4xl font-black text-white leading-none text-right mt-0.5">{reports.length}</p>
            </div>
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <BarChart3 size={28} className="text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Corruption Type Filter - with Lucide icons */}
      <div className="px-4 mb-3">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button
            onClick={() => setFilterType('all')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 border ${
              filterType === 'all'
                ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-200'
                : 'bg-white text-gray-600 border-gray-200 hover:border-red-200'
            }`}
          >
            <AlertTriangle size={14} /> সব
          </button>
          {DEFAULT_CORRUPTION_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => setFilterType(type.name)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 border ${
                filterType === type.name
                  ? 'text-white border-transparent shadow-md'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
              style={filterType === type.name ? { backgroundColor: type.color, borderColor: type.color } : {}}
            >
              {CORRUPTION_ICONS[type.name] || <FolderOpen size={14} />}
              <span>{type.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sort Buttons */}
      <div className="px-4 mb-4">
        <div className="flex gap-2">
          <button onClick={() => setSortBy('latest')} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${sortBy === 'latest' ? 'bg-gray-900 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}>
            <Clock size={14} /> সাম্প্রতিক
          </button>
          <button onClick={() => setSortBy('trending')} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${sortBy === 'trending' ? 'bg-gray-900 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}>
            <TrendingUp size={14} /> ট্রেন্ডিং
          </button>
          <button onClick={handleNearMe} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${sortBy === 'near' ? 'bg-gray-900 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}>
            <MapPinIcon size={14} /> কাছাকাছি
          </button>
        </div>
      </div>

      {/* Reports - 2 columns on desktop */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-medium">লোড হচ্ছে...</p>
        </div>
      ) : filteredReports.length > 0 ? (
        <div className="md:px-4 md:grid md:grid-cols-2 md:gap-4">
          {filteredReports.map(report => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 mx-4 bg-white rounded-2xl border border-dashed border-gray-300">
          <Search size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">কোনো রিপোর্ট পাওয়া যায়নি।</p>
        </div>
      )}
    </div>
  );
}
