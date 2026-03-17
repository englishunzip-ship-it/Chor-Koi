import React, { useState, useEffect } from 'react';
import { 
  LayoutGrid, 
  PlusCircle, 
  Map as MapIcon, 
  Info, 
  Search, 
  TrendingUp, 
  Clock, 
  MapPin,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Share2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertTriangle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  increment, 
  addDoc, 
  serverTimestamp,
  where,
  limit,
  getDocs
} from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { db, auth } from './firebase';
import { Report, CorruptionType, VoteType } from './types';
import { cn, uploadToImgBB, getVoteStatus } from './utils';
import { DEFAULT_CORRUPTION_TYPES } from './constants';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// --- Components ---

const FullscreenModal = ({ url, onClose }: { url: string | null, onClose: () => void }) => {
  if (!url) return null;
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm"
    >
      <button 
        onClick={onClose} 
        className="absolute top-6 right-6 text-white p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-[101]"
      >
        <X size={28} />
      </button>
      <motion.img 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        src={url} 
        alt="Fullscreen Evidence" 
        className="max-w-full max-h-full object-contain shadow-2xl" 
      />
    </motion.div>
  );
};

const EvidenceSlider = ({ links, onImageClick }: { links: string[], onImageClick: (url: string) => void }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (links.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % links.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [links.length]);

  const isImage = (url: string) => /\.(jpeg|jpg|gif|png|webp)$/i.test(url) || url.includes('imgbb.com');

  return (
    <div className="relative w-full aspect-video bg-gray-900 rounded-2xl overflow-hidden group">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="w-full h-full flex items-center justify-center"
        >
          {isImage(links[currentIndex]) ? (
            <img 
              src={links[currentIndex]} 
              alt="Evidence" 
              className="w-full h-full object-cover cursor-zoom-in"
              onClick={() => onImageClick(links[currentIndex])}
            />
          ) : (
            <div className="text-center p-8 bg-gray-800 w-full h-full flex flex-col items-center justify-center">
              <ExternalLink size={40} className="text-red-500 mb-3" />
              <p className="text-white text-xs font-bold mb-4 opacity-60 uppercase tracking-widest">External Evidence</p>
              <a 
                href={links[currentIndex]} 
                target="_blank" 
                rel="noreferrer" 
                className="text-red-400 underline break-all text-sm font-medium hover:text-red-300 transition-colors"
              >
                {links[currentIndex].length > 40 ? links[currentIndex].substring(0, 40) + '...' : links[currentIndex]}
              </a>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      
      {links.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10">
          {links.map((_, i) => (
            <button 
              key={i} 
              onClick={() => setCurrentIndex(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === currentIndex ? "bg-white w-6" : "bg-white/30 w-1.5"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Navbar = () => (
  <nav className="bg-red-600 text-white p-4 sticky top-0 z-50 shadow-md flex items-center gap-3">
    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden">
      <img src="https://api.dicebear.com/7.x/shapes/svg?seed=chorkoi" alt="Logo" className="w-8 h-8" />
    </div>
    <h1 className="text-2xl font-bold font-serif tracking-tight">চোর কই</h1>
  </nav>
);

const BottomNav = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) => {
  const tabs = [
    { id: 'feed', label: 'Feed', icon: LayoutGrid },
    { id: 'report', label: 'Report', icon: PlusCircle },
    { id: 'map', label: 'Map', icon: MapIcon },
    { id: 'info', label: 'Info', icon: Info },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 z-50 pb-safe">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={cn(
            "flex flex-col items-center gap-1 p-2 transition-colors",
            activeTab === tab.id ? "text-red-600" : "text-gray-500"
          )}
        >
          <tab.icon size={24} />
          <span className="text-xs font-medium">{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

// --- Pages ---

const FeedPage = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState('latest');
  const [typeFilter, setTypeFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [stats, setStats] = useState({ today: 0, total: 0 });
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report));
      setReports(data);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayCount = data.filter(r => r.createdAt?.toDate() >= today).length;
      setStats({ today: todayCount, total: data.length });
    });
    return unsubscribe;
  }, []);

  const handleVote = async (reportId: string, voteType: VoteType) => {
    const voted = localStorage.getItem(`voted_${reportId}`);
    if (voted) return alert('আপনি ইতিমধ্যে ভোট দিয়েছেন');

    const reportRef = doc(db, 'reports', reportId);
    const field = voteType === 'true' ? 'votesTrue' : voteType === 'false' ? 'votesFalse' : 'votesNeedEvidence';
    
    await updateDoc(reportRef, {
      [field]: increment(1)
    });
    localStorage.setItem(`voted_${reportId}`, 'true');
  };

  const handleShare = async (report: Report) => {
    const shareData = {
      title: report.title,
      text: `দুর্নীতির রিপোর্ট: ${report.title} - ${report.locationName}`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('লিংক কপি করা হয়েছে');
      }
    } catch (err) {
      console.error(err);
    }
  };

  let filteredReports = reports.filter(r => {
    if (typeFilter !== 'all' && r.corruptionType !== typeFilter) return false;
    return true;
  });

  if (filter === 'trending') {
    filteredReports.sort((a, b) => (b.votesTrue + b.votesFalse + b.votesNeedEvidence) - (a.votesTrue + a.votesFalse + a.votesNeedEvidence));
  } else if (filter === 'near') {
    if (userLocation) {
      filteredReports.sort((a, b) => {
        const distA = calculateDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude);
        const distB = calculateDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude);
        return distA - distB;
      });
    }
  }

  return (
    <div className="p-4 pb-24 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4">সাম্প্রতিক রিপোর্ট</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-red-50 p-4 rounded-2xl border border-red-100 shadow-sm">
          <p className="text-xs text-red-600 font-bold uppercase tracking-wider mb-1">আজকের রিপোর্ট</p>
          <p className="text-3xl font-black text-red-700">{stats.today}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">মোট রিপোর্ট</p>
          <p className="text-3xl font-black text-gray-700">{stats.total}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
        <button onClick={() => setFilter('latest')} className={cn("px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap", filter === 'latest' ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600")}>সর্বশেষ</button>
        <button onClick={() => setFilter('trending')} className={cn("px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap", filter === 'trending' ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600")}>ট্রেন্ডিং</button>
        <button onClick={() => setFilter('near')} className={cn("px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap", filter === 'near' ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600")}>আমার কাছাকাছি</button>
        <select 
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-600 outline-none border-none"
        >
          <option value="all">সব ধরনের দুর্নীতি</option>
          {DEFAULT_CORRUPTION_TYPES.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredReports.map((report) => (
          <motion.div 
            layout
            key={report.id} 
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold px-2 py-1 bg-red-100 text-red-600 rounded-lg">
                  {DEFAULT_CORRUPTION_TYPES.find(t => t.id === report.corruptionType)?.name || 'দুর্নীতি'}
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {report.createdAt?.toDate().toLocaleDateString('bn-BD')}
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1 leading-tight">{report.title}</h3>
              <div className="flex items-center gap-1 text-gray-500 text-xs mb-3">
                <MapPin size={12} />
                <span>{report.locationName}</span>
              </div>

              <div className="flex justify-between items-center gap-2 mb-4">
                <button onClick={() => handleVote(report.id, 'true')} className="flex-1 flex flex-col items-center p-2 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
                  <CheckCircle2 size={18} />
                  <span className="text-[10px] font-bold mt-1">সত্য ({report.votesTrue})</span>
                </button>
                <button onClick={() => handleVote(report.id, 'needEvidence')} className="flex-1 flex flex-col items-center p-2 rounded-xl bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors">
                  <HelpCircle size={18} />
                  <span className="text-[10px] font-bold mt-1">প্রমাণ ({report.votesNeedEvidence})</span>
                </button>
                <button onClick={() => handleVote(report.id, 'false')} className="flex-1 flex flex-col items-center p-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 transition-colors">
                  <XCircle size={18} />
                  <span className="text-[10px] font-bold mt-1">মিথ্যা ({report.votesFalse})</span>
                </button>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => setExpandedId(expandedId === report.id ? null : report.id)}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                >
                  {expandedId === report.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {expandedId === report.id ? 'বন্ধ করুন' : 'বিস্তারিত দেখুন'}
                </button>
                <button onClick={() => handleShare(report)} className="p-2 bg-gray-100 text-gray-700 rounded-xl">
                  <Share2 size={20} />
                </button>
              </div>

              <AnimatePresence>
                {expandedId === report.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mt-4 pt-4 border-t border-gray-100"
                  >
                    <p className="text-gray-600 text-sm mb-6 leading-relaxed whitespace-pre-wrap">
                      {report.description}
                    </p>
                    {report.evidenceLinks && report.evidenceLinks.length > 0 && (
                      <div className="space-y-3 -mx-4 md:mx-0">
                        <div className="px-4 md:px-0">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">প্রমাণসমূহ</p>
                        </div>
                        <EvidenceSlider 
                          links={report.evidenceLinks} 
                          onImageClick={(url) => setFullscreenUrl(url)} 
                        />
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {fullscreenUrl && (
          <FullscreenModal url={fullscreenUrl} onClose={() => setFullscreenUrl(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

const ReportPage = ({ initialLocation, onSuccess }: { initialLocation?: {lat: number, lng: number} | null, onSuccess: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    corruptionType: 'bribe',
    locationName: '',
    latitude: initialLocation?.lat || 23.8103,
    longitude: initialLocation?.lng || 90.4125,
    evidenceLinks: [] as string[],
  });

  useEffect(() => {
    if (initialLocation) {
      setFormData(prev => ({
        ...prev,
        latitude: initialLocation.lat,
        longitude: initialLocation.lng
      }));
    }
  }, [initialLocation]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [linkInput, setLinkInput] = useState('');

  const handleLocationGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setFormData(prev => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        }));
        alert('GPS লোকেশন পাওয়া গেছে');
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const uploadedUrls = await Promise.all(imageFiles.map(file => uploadToImgBB(file)));
      const finalEvidence = [...formData.evidenceLinks, ...uploadedUrls];
      
      await addDoc(collection(db, 'reports'), {
        ...formData,
        evidenceLinks: finalEvidence,
        votesTrue: 0,
        votesFalse: 0,
        votesNeedEvidence: 0,
        createdAt: serverTimestamp(),
      });
      
      alert('রিপোর্ট সফলভাবে জমা দেওয়া হয়েছে');
      onSuccess();
    } catch (err) {
      console.error(err);
      alert('কিছু ভুল হয়েছে, আবার চেষ্টা করুন');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 pb-24 max-w-2xl mx-auto">
      <h2 className="text-2xl font-black mb-6">দুর্নীতির রিপোর্ট দিন</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700">দুর্নীতির ধরন</label>
          <select 
            value={formData.corruptionType}
            onChange={(e) => setFormData({...formData, corruptionType: e.target.value})}
            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-red-500 transition-colors"
          >
            {DEFAULT_CORRUPTION_TYPES.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700">স্থান</label>
          <input 
            required
            type="text"
            placeholder="যেমন: মতিঝিল, ঢাকা"
            value={formData.locationName}
            onChange={(e) => setFormData({...formData, locationName: e.target.value})}
            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-red-500 transition-colors"
          />
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button type="button" onClick={handleLocationGPS} className="py-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
              <MapPin size={16} />
              📍 GPS লোকেশন
            </button>
            <button type="button" onClick={() => alert('ম্যাপ থেকে লোকেশন সিলেক্ট করতে ম্যাপ ট্যাবে গিয়ে যেকোনো জায়গায় ক্লিক করুন।')} className="py-3 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
              <MapIcon size={16} />
              🗺️ ম্যাপ থেকে দিন
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Latitude</label>
              <input 
                type="number" 
                step="any"
                value={formData.latitude}
                onChange={(e) => setFormData({...formData, latitude: parseFloat(e.target.value)})}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Longitude</label>
              <input 
                type="number" 
                step="any"
                value={formData.longitude}
                onChange={(e) => setFormData({...formData, longitude: parseFloat(e.target.value)})}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700">রিপোর্টের শিরোনাম</label>
          <input 
            required
            type="text"
            placeholder="সংক্ষেপে শিরোনাম দিন"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-red-500 transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700">বিস্তারিত বর্ণনা</label>
          <textarea 
            required
            rows={4}
            placeholder="ঘটনার বিস্তারিত বিবরণ দিন..."
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-red-500 transition-colors resize-none"
          />
        </div>

        <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 space-y-4">
          <h3 className="text-lg font-black">প্রমাণ যোগ করুন</h3>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase">ছবি আপলোড</label>
            <input 
              type="file" 
              multiple 
              accept="image/*"
              onChange={(e) => setImageFiles(Array.from(e.target.files || []))}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
            />
            {imageFiles.length > 0 && (
              <div className="flex gap-2 overflow-x-auto py-2 no-scrollbar">
                {imageFiles.map((file, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                    <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase">অন্যান্য লিংক (ভিডিও/ওয়েব)</label>
            <div className="flex gap-2">
              <input 
                type="url"
                placeholder="https://..."
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                className="flex-1 p-3 bg-white border border-gray-200 rounded-xl outline-none text-sm"
              />
              <button 
                type="button"
                onClick={() => {
                  if (linkInput) {
                    setFormData({...formData, evidenceLinks: [...formData.evidenceLinks, linkInput]});
                    setLinkInput('');
                  }
                }}
                className="px-4 py-2 bg-gray-800 text-white rounded-xl text-sm font-bold"
              >
                যোগ করুন
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.evidenceLinks.map((link, i) => (
                <div key={i} className="group relative bg-white border border-gray-200 px-3 py-1.5 rounded-xl flex items-center gap-2 max-w-[200px]">
                  <ExternalLink size={12} className="text-gray-400" />
                  <span className="text-[10px] font-medium truncate">{link}</span>
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, evidenceLinks: formData.evidenceLinks.filter((_, idx) => idx !== i)})}
                    className="text-red-500 font-bold text-xs ml-1"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button 
          disabled={loading}
          type="submit" 
          className="w-full py-5 bg-red-600 text-white rounded-2xl text-lg font-black shadow-lg shadow-red-200 hover:bg-red-700 transition-all disabled:opacity-50"
        >
          {loading ? 'জমা হচ্ছে...' : 'রিপোর্ট জমা দিন'}
        </button>
      </form>
    </div>
  );
};

const MapEvents = ({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const MapPage = ({ onAddReport, setReportLocation, setActiveTab }: { onAddReport: () => void, setReportLocation: (lat: number, lng: number) => void, setActiveTab: (t: string) => void }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [center, setCenter] = useState<[number, number]>([23.8103, 90.4125]);
  const [showLegend, setShowLegend] = useState(false);

  const handleNearMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setCenter([pos.coords.latitude, pos.coords.longitude]);
      });
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'reports'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report)));
    });
    return unsubscribe;
  }, []);

  const getMarkerIcon = (type: string, report: Report) => {
    const status = getVoteStatus(report);
    const color = status === 'red' ? '#ef4444' : status === 'yellow' ? '#f59e0b' : '#6b7280';
    const typeInfo = DEFAULT_CORRUPTION_TYPES.find(t => t.id === type);
    const emoji = typeInfo?.icon || '📍';
    
    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: ${color}; width: 36px; height: 36px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.3);">
              <div style="transform: rotate(45deg); font-size: 18px;">${emoji}</div>
            </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 36]
    });
  };

  const filteredReports = typeFilter === 'all' ? reports : reports.filter(r => r.corruptionType === typeFilter);

  return (
    <div className="h-[calc(100vh-130px)] relative">
      <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-col gap-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <select 
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 rounded-full text-sm font-bold bg-white shadow-lg border-none outline-none min-w-[120px]"
          >
            <option value="all">সব ধরন</option>
            {DEFAULT_CORRUPTION_TYPES.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button 
            onClick={handleNearMe}
            className="p-2 w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-lg text-red-600 hover:bg-red-50 transition-colors"
            title="আমার কাছাকাছি"
          >
            <MapPin size={20} />
          </button>
          <button 
            onClick={() => setShowLegend(!showLegend)}
            className="p-2 w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-lg text-gray-700 hover:bg-gray-50 transition-colors"
            title="আইকন নির্দেশিকা"
          >
            <Info size={20} />
          </button>
        </div>

        <AnimatePresence>
          {showLegend && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100 max-w-[250px]"
            >
              <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">আইকন নির্দেশিকা</h4>
              <div className="grid grid-cols-1 gap-2">
                {DEFAULT_CORRUPTION_TYPES.map(t => (
                  <div key={t.id} className="flex items-center gap-3">
                    <span className="text-lg">{t.icon}</span>
                    <span className="text-xs font-bold text-gray-700">{t.name}</span>
                  </div>
                ))}
                <hr className="my-1 border-gray-100" />
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  <span className="text-[10px] font-bold text-gray-500">সত্য (বেশি ভোট)</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                  <span className="text-[10px] font-bold text-gray-500">প্রমাণ প্রয়োজন</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-gray-500"></span>
                  <span className="text-[10px] font-bold text-gray-500">মিথ্যা/নতুন</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <MapContainer center={center} zoom={7} className="h-full w-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapEvents onLocationSelect={(lat, lng) => {
          setReportLocation(lat, lng);
          onAddReport();
        }} />
        {filteredReports.map(report => (
          <Marker 
            key={report.id} 
            position={[report.latitude, report.longitude]}
            icon={getMarkerIcon(report.corruptionType, report)}
          >
            <Popup>
              <div className="p-1 min-w-[200px]">
                <h3 className="font-bold text-sm mb-1">{report.title}</h3>
                <p className="text-[10px] text-gray-500 mb-2">{report.locationName}</p>
                <div className="flex justify-between text-[10px] font-bold mb-3">
                  <span className="text-green-600">✔ {report.votesTrue}</span>
                  <span className="text-yellow-600">⚠ {report.votesNeedEvidence}</span>
                  <span className="text-red-600">❌ {report.votesFalse}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => {
                      // Logic to view details - for now just switch to feed and filter?
                      // Or we could add a detailed view modal.
                      setActiveTab('feed');
                    }}
                    className="bg-red-600 text-white py-1 px-2 rounded text-[10px] font-bold"
                  >
                    বিস্তারিত
                  </button>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="bg-gray-800 text-white py-1 px-2 rounded text-[10px] font-bold text-center"
                  >
                    গুগল ম্যাপ
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <button 
        onClick={onAddReport}
        className="absolute bottom-8 right-8 z-[1000] w-14 h-14 bg-red-600 text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform"
        title="নতুন রিপোর্ট দিন"
      >
        <PlusCircle size={32} />
      </button>
    </div>
  );
};

const InfoPage = () => (
  <div className="p-6 pb-24 max-w-2xl mx-auto space-y-8">
    <div className="text-center space-y-2">
      <div className="w-20 h-20 bg-red-600 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-red-200">
        <AlertTriangle size={40} className="text-white" />
      </div>
      <h2 className="text-3xl font-black text-red-600">চোর কই</h2>
      <p className="text-gray-500 font-medium">দুর্নীতির বিরুদ্ধে জনতার শক্তি</p>
    </div>

    <div className="space-y-6">
      <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-3">
        <h3 className="text-lg font-black flex items-center gap-2">
          <Info size={20} className="text-red-600" />
          আমাদের লক্ষ্য
        </h3>
        <p className="text-gray-600 text-sm leading-relaxed">
          "চোর কই" একটি অরাজনৈতিক ও সামাজিক উদ্যোগ। আমাদের লক্ষ্য হলো প্রযুক্তির মাধ্যমে দুর্নীতির তথ্য সাধারণ মানুষের কাছে পৌঁছে দেওয়া এবং একটি স্বচ্ছ ও জবাবদিহিমূলক সমাজ গঠন করা। আমরা বিশ্বাস করি, যখন সবাই দুর্নীতির বিরুদ্ধে সোচ্চার হবে, তখনই পরিবর্তন সম্ভব।
        </p>
      </section>

      <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <h3 className="text-lg font-black">কিভাবে কাজ করে?</h3>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold flex-shrink-0">১</div>
            <p className="text-sm text-gray-600">আপনি কোনো দুর্নীতির সাক্ষী হলে বা তথ্য থাকলে তা ছবি ও প্রমাণসহ রিপোর্ট করুন।</p>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold flex-shrink-0">২</div>
            <p className="text-sm text-gray-600">অন্যান্য নাগরিকরা আপনার রিপোর্টের সত্যতা যাচাই করে ভোট দেবেন।</p>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold flex-shrink-0">৩</div>
            <p className="text-sm text-gray-600">বেশি ভোট পাওয়া রিপোর্টগুলো ম্যাপে লাল রঙে হাইলাইট হবে এবং জনসচেতনতা তৈরি করবে।</p>
          </div>
        </div>
      </section>

      <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-3">
        <h3 className="text-lg font-black">গোপনীয়তা ও নিরাপত্তা</h3>
        <p className="text-gray-600 text-sm leading-relaxed">
          আমরা ব্যবহারকারীর গোপনীয়তাকে সর্বোচ্চ গুরুত্ব দিই। রিপোর্ট করার সময় আপনার পরিচয় গোপন রাখা হয়। তবে বিভ্রান্তিকর বা মিথ্যা তথ্য প্রদান থেকে বিরত থাকার অনুরোধ করা হলো।
        </p>
      </section>

      <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-3">
        <h3 className="text-lg font-black">যোগাযোগ</h3>
        <p className="text-gray-600 text-sm leading-relaxed">
          যেকোনো পরামর্শ বা অভিযোগের জন্য আমাদের ইমেইল করুন: <span className="font-bold text-red-600">support@chorkoi.com</span>
        </p>
      </section>

      <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-3">
        <h3 className="text-lg font-black">ডেভেলপার</h3>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-100 rounded-full overflow-hidden">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Ridoan" alt="Developer" />
          </div>
          <div>
            <a 
              href="https://ridoan-zisan.netlify.app" 
              target="_blank" 
              rel="noreferrer"
              className="font-bold text-red-600 hover:underline"
            >
              Md Ridoan Mahmud Zisan
            </a>
            <p className="text-xs text-gray-400">Full Stack Developer</p>
          </div>
        </div>
      </section>
    </div>
  </div>
);

const AdminPage = () => {
  const [user, setUser] = useState<any>(null);
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
      return onSnapshot(q, (s) => setReports(s.docs.map(d => ({ id: d.id, ...d.data() } as Report))));
    }
  }, [user]);

  const handleLogin = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider);
  };

  const handleDelete = async (id: string) => {
    if (confirm('আপনি কি নিশ্চিত যে এই রিপোর্টটি ডিলিট করতে চান?')) {
      // In a real app, you'd use a delete function. For now, we'll just log.
      alert('Admin only delete feature');
    }
  };

  if (!user) {
    return (
      <div className="h-[calc(100vh-130px)] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-black mb-4">অ্যাডমিন প্যানেল</h2>
        <p className="text-gray-500 mb-8">অ্যাডমিন হিসেবে লগইন করুন</p>
        <button 
          onClick={handleLogin}
          className="px-8 py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-100"
        >
          Google দিয়ে লগইন করুন
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-black">অ্যাডমিন ড্যাশবোর্ড</h2>
        <button onClick={() => signOut(auth)} className="text-sm font-bold text-red-600">লগআউট</button>
      </div>

      <div className="space-y-4">
        {reports.map(r => (
          <div key={r.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
            <div>
              <h3 className="font-bold">{r.title}</h3>
              <p className="text-xs text-gray-400">{r.locationName}</p>
            </div>
            <div className="flex gap-2">
              <button className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Clock size={18} /></button>
              <button onClick={() => handleDelete(r.id)} className="p-2 bg-red-50 text-red-600 rounded-lg"><XCircle size={18} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('feed');
  const [preselectedLocation, setPreselectedLocation] = useState<{lat: number, lng: number} | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <Navbar />
      
      <main className="pb-16">
        {activeTab === 'feed' && <FeedPage />}
        {activeTab === 'report' && (
          <ReportPage 
            initialLocation={preselectedLocation} 
            onSuccess={() => {
              setPreselectedLocation(null);
              setActiveTab('feed');
            }} 
          />
        )}
        {activeTab === 'map' && (
          <MapPage 
            onAddReport={() => setActiveTab('report')} 
            setReportLocation={(lat, lng) => setPreselectedLocation({ lat, lng })}
            setActiveTab={setActiveTab}
          />
        )}
        {activeTab === 'info' && <InfoPage />}
        {activeTab === 'admin' && <AdminPage />}
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Hidden Admin Access (Triple tap info to access admin) */}
      <div 
        className="fixed top-0 right-0 w-10 h-10 z-[60] opacity-0"
        onClick={(e) => {
          if (e.detail === 3) setActiveTab('admin');
        }}
      />
    </div>
  );
}
