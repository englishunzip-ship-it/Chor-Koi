import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../firebase';
import { Report } from '../types';
import { onAuthStateChanged } from 'firebase/auth';
import {
  MapPin, Calendar, Share2, AlertCircle, ArrowLeft,
  ThumbsUp, ThumbsDown, HelpCircle, Navigation as NavIcon,
  X, Maximize2, Play, ExternalLink, UserX
} from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation as SwiperNavigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import L from 'leaflet';
import { generateNickname } from '../lib/nicknames';
import { getViralShareMessage } from '../lib/shareMessages';

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [voted, setVoted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const navigate = useNavigate();

  const nickname = report ? generateNickname(report.id) : '';

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 2500);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => setIsAdmin(!!user));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchReport = async () => {
      if (!id) return;
      try {
        const docSnap = await getDoc(doc(db, 'reports', id));
        if (docSnap.exists()) setReport({ id: docSnap.id, ...docSnap.data() } as Report);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `reports/${id}`);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
    const hasVoted = localStorage.getItem(`voted_${id}`) || JSON.parse(localStorage.getItem('votedReports') || '{}')[id!];
    if (hasVoted) setVoted(true);
  }, [id]);

  useEffect(() => {
    if (report && mapRef.current && !mapInstance.current) {
      const map = L.map(mapRef.current, {
        center: [report.latitude, report.longitude],
        zoom: 16,
        zoomControl: true,
        attributionControl: false,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      L.marker([report.latitude, report.longitude]).addTo(map);
      mapInstance.current = map;
    }
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [report]);

  const handleVote = async (type: 'votesTrue' | 'votesFalse' | 'votesNeedEvidence') => {
    if ((voted && !isAdmin) || !id || !report) return;
    try {
      await updateDoc(doc(db, 'reports', id), { [type]: increment(1) });
      setReport({ ...report, [type]: report[type] + 1 });
      setVoted(true);
      localStorage.setItem(`voted_${id}`, 'true');
      const votedReports = JSON.parse(localStorage.getItem('votedReports') || '{}');
      votedReports[id] = true;
      localStorage.setItem('votedReports', JSON.stringify(votedReports));
      triggerToast('✅ আপনার ভোট সফলভাবে জমা হয়েছে!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reports/${id}`);
      triggerToast('❌ ভোট দিতে সমস্যা হয়েছে!');
    }
  };

  const getYoutubeId = (url: string) => {
    const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const isMedia = (url: string) => {
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.ogg', 'i.ibb.co'].some(ext => url.toLowerCase().includes(ext)) || getYoutubeId(url);
  };

  const renderMedia = (link: string, index: number) => {
    const ytId = getYoutubeId(link);
    if (ytId) {
      return (
        <div className="relative w-full h-full bg-black flex items-center justify-center group cursor-pointer" onClick={() => setSelectedMedia(link)}>
          <img src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`} alt="Video" className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
            onError={(e) => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${ytId}/0.jpg`; }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
              <Play size={40} className="text-white fill-current ml-1" />
            </div>
          </div>
        </div>
      );
    }
    if (link.match(/\.(mp4|webm|ogg)$/)) {
      return (
        <div className="relative w-full h-full bg-black flex items-center justify-center group cursor-pointer" onClick={() => setSelectedMedia(link)}>
          <video className="w-full h-full object-contain"><source src={link} /></video>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
              <Play size={40} className="text-white fill-current ml-1" />
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="relative w-full h-full cursor-pointer group" onClick={() => setSelectedMedia(link)}>
        <img src={link} alt={`Evidence ${index + 1}`} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-black/50 p-3 rounded-full text-white backdrop-blur-sm"><Maximize2 size={20} /></div>
        </div>
      </div>
    );
  };

  const shareReport = () => {
    if (!report) return;
    const shareUrl = `${window.location.origin}/report/${report.id}`;
    const viralText = getViralShareMessage(report.title);
    if (navigator.share) {
      navigator.share({ title: report.title, text: viralText, url: shareUrl });
    } else {
      navigator.clipboard.writeText(`${viralText}\n${shareUrl}`);
      triggerToast('📋 লিঙ্ক কপি হয়েছে! শেয়ার করুন!');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!report) return (
    <div className="flex flex-col items-center justify-center h-screen p-4 text-center">
      <AlertCircle size={48} className="text-gray-300 mb-4" />
      <h2 className="text-xl font-bold text-gray-900 mb-2">রিপোর্ট পাওয়া যায়নি</h2>
      <button onClick={() => navigate(-1)} className="text-red-600 font-bold flex items-center gap-2">
        <ArrowLeft size={18} /> ফিরে যান
      </button>
    </div>
  );

  const totalVotes = report.votesTrue + report.votesFalse + report.votesNeedEvidence;
  const truePercent = totalVotes > 0 ? Math.round((report.votesTrue / totalVotes) * 100) : 0;
  const falsePercent = totalVotes > 0 ? Math.round((report.votesFalse / totalVotes) * 100) : 0;
  const evidencePercent = totalVotes > 0 ? Math.round((report.votesNeedEvidence / totalVotes) * 100) : 0;
  const mediaLinks = report.evidenceLinks?.filter(link => isMedia(link)) || [];
  const otherLinks = report.evidenceLinks?.filter(link => !isMedia(link)) || [];
  const canVote = !voted || isAdmin;

  return (
    <div className="max-w-4xl mx-auto pb-24 relative">
      {/* Toast */}
      {showToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] bg-gray-900 text-white text-sm font-bold px-6 py-3 rounded-full shadow-2xl animate-bounce">
          {showToast}
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft size={24} /></button>
        <h1 className="text-lg font-black text-gray-900 truncate px-4">রিপোর্ট বিস্তারিত</h1>
        <button onClick={shareReport} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><Share2 size={24} /></button>
      </div>

      {/* Anonymous header with nickname */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
            <UserX size={20} className="text-red-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">{nickname}</p>
            <p className="text-[11px] text-gray-400 flex items-center gap-1"><Calendar size={12} /> {new Date(report.date).toLocaleDateString('bn-BD')}</p>
          </div>
        </div>
        <span className="px-3 py-1 bg-red-50 text-red-600 text-xs font-black rounded-full uppercase">{report.corruptionType}</span>
      </div>

      {/* Media */}
      {mediaLinks.length > 0 && (
        <div className="w-full aspect-[4/3] bg-gray-100">
          <Swiper modules={[Autoplay, SwiperNavigation, Pagination]} navigation pagination={{ clickable: true }} autoplay={{ delay: 4000, disableOnInteraction: true }} className="h-full w-full">
            {mediaLinks.map((link, idx) => (
              <SwiperSlide key={idx}>{renderMedia(link, idx)}</SwiperSlide>
            ))}
          </Swiper>
        </div>
      )}

      <div className="px-4 py-4">
        <h2 className="text-xl font-black text-gray-900 mb-2 leading-tight">{report.title}</h2>
        <div className="flex items-center text-gray-500 text-sm mb-4">
          <MapPin size={16} className="mr-1 text-red-400" /><span>{report.locationName}</span>
        </div>

        {/* Voting */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button onClick={() => handleVote('votesTrue')} disabled={!canVote}
            className={`flex flex-col items-center py-3 rounded-xl border transition-all active:scale-95 ${canVote ? 'bg-green-50 border-green-100 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
            <ThumbsUp size={20} /><span className="text-[10px] font-bold mt-1">সত্য ({report.votesTrue})</span>
          </button>
          <button onClick={() => handleVote('votesFalse')} disabled={!canVote}
            className={`flex flex-col items-center py-3 rounded-xl border transition-all active:scale-95 ${canVote ? 'bg-red-50 border-red-100 text-red-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
            <ThumbsDown size={20} /><span className="text-[10px] font-bold mt-1">মিথ্যা ({report.votesFalse})</span>
          </button>
          <button onClick={() => handleVote('votesNeedEvidence')} disabled={!canVote}
            className={`flex flex-col items-center py-3 rounded-xl border transition-all active:scale-95 ${canVote ? 'bg-yellow-50 border-yellow-100 text-yellow-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
            <HelpCircle size={20} /><span className="text-[10px] font-bold mt-1">প্রমাণ চাই ({report.votesNeedEvidence})</span>
          </button>
        </div>

        {/* Share */}
        <div className="flex gap-4 mb-6 pb-4 border-b border-gray-100">
          <button onClick={shareReport} className="text-gray-400 hover:text-red-600 transition-colors"><Share2 size={20} /></button>
          <button onClick={() => navigate(`/map?id=${report.id}`)} className="text-gray-400 hover:text-red-600 transition-colors"><MapPin size={20} /></button>
        </div>

        {/* Description */}
        <div className="mb-6">
          <h3 className="text-lg font-black text-gray-900 mb-3">বিবরণ</h3>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{report.description}</p>
        </div>

        {/* Verification stats */}
        <div className="bg-white rounded-2xl p-5 mb-6 border border-gray-100 shadow-sm">
          <h3 className="text-base font-black text-gray-900 mb-4">যাচাইকরণ অবস্থা</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm font-bold mb-1"><span className="text-green-600">সত্য</span><span>{report.votesTrue} ({truePercent}%)</span></div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-green-500 transition-all duration-700" style={{ width: `${truePercent}%` }}></div></div>
            </div>
            <div>
              <div className="flex justify-between text-sm font-bold mb-1"><span className="text-yellow-600">প্রমাণ চাই</span><span>{report.votesNeedEvidence} ({evidencePercent}%)</span></div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-yellow-500 transition-all duration-700" style={{ width: `${evidencePercent}%` }}></div></div>
            </div>
            <div>
              <div className="flex justify-between text-sm font-bold mb-1"><span className="text-red-600">মিথ্যা</span><span>{report.votesFalse} ({falsePercent}%)</span></div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-red-500 transition-all duration-700" style={{ width: `${falsePercent}%` }}></div></div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="mb-6">
          <h3 className="text-base font-black text-gray-900 mb-3">অবস্থান</h3>
          <div className="rounded-2xl overflow-hidden border border-gray-200 h-48 relative">
            <div ref={mapRef} className="w-full h-full" />
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${report.latitude},${report.longitude}`} target="_blank" rel="noopener noreferrer"
              className="absolute bottom-3 right-3 z-[500] bg-white/90 backdrop-blur-sm text-gray-700 text-xs font-bold px-4 py-2 rounded-full shadow flex items-center gap-1.5">
              <NavIcon size={14} /> গুগল ম্যাপে ডিরেকশন
            </a>
          </div>
        </div>

        {/* External links */}
        {otherLinks.length > 0 && (
          <div className="mb-6">
            <h3 className="text-base font-black text-gray-900 mb-3">আরও প্রমাণ</h3>
            <div className="space-y-2">
              {otherLinks.map((link, idx) => (
                <a key={idx} href={link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl hover:bg-white hover:shadow-md transition-all group">
                  <span className="text-sm text-blue-600 font-bold truncate pr-4">{link}</span>
                  <ExternalLink size={16} className="text-gray-400 group-hover:text-blue-600 shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Media modal */}
      {selectedMedia && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4" onClick={() => setSelectedMedia(null)}>
          <button onClick={() => setSelectedMedia(null)} className="absolute top-6 right-6 text-white hover:scale-110 transition-transform z-10"><X size={32} /></button>
          <div className="max-w-5xl w-full max-h-[85vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {getYoutubeId(selectedMedia) ? (
              <iframe className="w-full aspect-video rounded-xl" src={`https://www.youtube.com/embed/${getYoutubeId(selectedMedia)}?autoplay=1`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            ) : selectedMedia.match(/\.(mp4|webm|ogg)$/) ? (
              <video controls autoPlay className="max-w-full max-h-full rounded-xl"><source src={selectedMedia} /></video>
            ) : (
              <img src={selectedMedia} alt="Evidence" className="max-w-full max-h-full object-contain rounded-xl" referrerPolicy="no-referrer" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
