import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Report } from '../types';
import { DEFAULT_CORRUPTION_TYPES } from '../constants';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Navigation, Plus, Info, X, Banknote, Shield, Landmark, GraduationCap, Hospital, Building2, Home, Stamp, Zap, Droplets, Bus, Scale, FolderOpen } from 'lucide-react';

// Fix Leaflet default icon
const markerIcon = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const markerShadow = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// Icon map for filter bar (Lucide icons as text for buttons only)
const CORRUPTION_ICON_NAMES: Record<string, string> = {
  'ঘুষ': '💰', 'পুলিশ': '👮', 'রাজনৈতিক': '🏛', 'শিক্ষা': '🎓',
  'স্বাস্থ্যসেবা': '🏥', 'সরকারি অফিস': '🏢', 'ভূমি অফিস': '🏡',
  'পাসপোর্ট অফিস': '🛂', 'বিদ্যুৎ বিভাগ': '⚡', 'ওয়াসা/পানি': '🚰',
  'পরিবহন': '🚌', 'বিচার বিভাগ': '⚖️', 'অন্যান্য': '📁',
};

function LocationMarker({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return position === null ? null : (
    <Marker position={position}>
      <Popup>
        <div className="p-2 text-center">
          <p className="font-bold mb-2 text-sm">নির্বাচিত অবস্থান</p>
          <button onClick={() => onLocationSelect(position.lat, position.lng)}
            className="bg-red-600 text-white px-3 py-1.5 rounded-full text-xs font-bold">
            এখানে রিপোর্ট করুন
          </button>
        </div>
      </Popup>
    </Marker>
  );
}

function MapController({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom || map.getZoom());
  }, [center, map, zoom]);
  return null;
}

function LiveLocationTracker() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState(0);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        setAccuracy(pos.coords.accuracy);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  if (!position) return null;

  const userIcon = L.divIcon({
    html: `<div style="width:18px;height:18px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(59,130,246,0.3),0 2px 8px rgba(0,0,0,0.3);"></div>`,
    className: 'custom-div-icon',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

  return (
    <>
      <Marker position={position} icon={userIcon}>
        <Popup><div className="text-center text-sm font-bold p-1">আপনার অবস্থান</div></Popup>
      </Marker>
      <Circle center={position} radius={accuracy} pathOptions={{ fillColor: '#3b82f6', fillOpacity: 0.1, color: '#3b82f6', weight: 1, opacity: 0.3 }} />
    </>
  );
}

export default function MapPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [center, setCenter] = useState<[number, number]>([23.6850, 90.3563]);
  const [zoom, setZoom] = useState(7);
  const [showLegend, setShowLegend] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('All');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const targetId = searchParams.get('id');

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'reports'), (snapshot) => {
      const reportsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Report[];
      setReports(reportsData);
      if (targetId) {
        const target = reportsData.find(r => r.id === targetId);
        if (target) { setCenter([target.latitude, target.longitude]); setZoom(18); }
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'reports'));
    return () => unsubscribe();
  }, [targetId]);

  const filteredReports = useMemo(() => {
    if (selectedType === 'All') return reports;
    return reports.filter(r => r.corruptionType === selectedType);
  }, [reports, selectedType]);

  const summary = useMemo(() => {
    const total = filteredReports.length;
    const trueReports = filteredReports.filter(r => r.votesTrue > r.votesFalse && r.votesTrue > r.votesNeedEvidence).length;
    const falseReports = filteredReports.filter(r => r.votesFalse > r.votesTrue && r.votesFalse > r.votesNeedEvidence).length;
    return { total, trueReports, falseReports };
  }, [filteredReports]);

  const getMarkerIcon = (report: Report) => {
    const type = DEFAULT_CORRUPTION_TYPES.find(t => t.name === report.corruptionType);
    const icon = type?.icon || '📍';

    // Corruption app color scheme: dark red for verified, amber for needs proof, gray-green for false
    let color = '#6b7280'; // neutral gray for no votes
    const total = report.votesTrue + report.votesFalse + report.votesNeedEvidence;
    if (total > 0) {
      if (report.votesTrue > report.votesFalse && report.votesTrue > report.votesNeedEvidence) color = '#dc2626'; // red-600 - verified corruption
      else if (report.votesNeedEvidence > report.votesTrue && report.votesNeedEvidence > report.votesFalse) color = '#d97706'; // amber-600 - needs proof
      else if (report.votesFalse > report.votesTrue && report.votesFalse > report.votesNeedEvidence) color = '#059669'; // emerald-600 - likely false
    }

    return L.divIcon({
      html: `
        <div class="marker-pin-wrapper">
          <div class="marker-pin" style="background: linear-gradient(135deg, ${color}, ${color}dd);"></div>
          <div class="marker-icon-inner">${icon}</div>
        </div>
      `,
      className: 'custom-div-icon',
      iconSize: [44, 56],
      iconAnchor: [22, 56],
      popupAnchor: [0, -56]
    });
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    navigate(`/add?lat=${lat}&lng=${lng}`);
  };

  const locateUser = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setCenter([position.coords.latitude, position.coords.longitude]);
        setZoom(15);
      });
    }
  };

  return (
    <div className="relative h-full w-full">
      {/* Filter Bar - using Lucide icons for non-map elements */}
      <div className="absolute top-4 left-4 right-16 z-10 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        <button onClick={() => setSelectedType('All')}
          className={`px-4 py-2 rounded-full font-bold text-xs whitespace-nowrap shadow-md transition-all ${selectedType === 'All' ? 'bg-red-600 text-white' : 'bg-white text-gray-700'}`}>
          সব
        </button>
        {DEFAULT_CORRUPTION_TYPES.map(type => (
          <button key={type.id} onClick={() => setSelectedType(type.name)}
            className={`px-4 py-2 rounded-full font-bold text-xs whitespace-nowrap shadow-md transition-all flex items-center gap-1.5 ${selectedType === type.name ? 'bg-red-600 text-white' : 'bg-white text-gray-700'}`}>
            <span>{type.icon}</span><span>{type.name}</span>
          </button>
        ))}
      </div>

      {/* Summary - corruption-appropriate colors */}
      <div className="absolute top-16 left-4 z-10 bg-white/95 backdrop-blur-sm p-3 rounded-2xl shadow-lg border border-gray-200 flex gap-4">
        <div className="text-center"><p className="text-[10px] font-bold text-gray-500 uppercase">মোট</p><p className="text-sm font-black text-gray-900">{summary.total}</p></div>
        <div className="w-px bg-gray-200"></div>
        <div className="text-center"><p className="text-[10px] font-bold text-red-600 uppercase">যাচাইকৃত</p><p className="text-sm font-black text-red-700">{summary.trueReports}</p></div>
        <div className="w-px bg-gray-200"></div>
        <div className="text-center"><p className="text-[10px] font-bold text-emerald-600 uppercase">ভুল</p><p className="text-sm font-black text-emerald-700">{summary.falseReports}</p></div>
      </div>

      <MapContainer center={center} zoom={zoom} className="h-full w-full z-0">
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapController center={center} zoom={zoom} />
        <LocationMarker onLocationSelect={handleLocationSelect} />
        <LiveLocationTracker />

        {filteredReports.map((report) => (
          <Marker key={report.id} position={[report.latitude, report.longitude]} icon={getMarkerIcon(report)}
            eventHandlers={{ add: (e) => { if (targetId === report.id) e.target.openPopup(); } }}>
            <Popup>
              <div className="p-1 min-w-[200px]">
                <p className="text-[10px] font-bold text-red-600 uppercase mb-1">{report.corruptionType}</p>
                <h3 className="font-bold text-sm mb-1">{report.title}</h3>
                <p className="text-[10px] text-gray-500 mb-2">{report.locationName}</p>
                <div className="flex justify-between text-[10px] font-bold mb-3 border-t border-gray-100 pt-2">
                  <span className="text-red-600">যাচাইকৃত: {report.votesTrue}</span>
                  <span className="text-amber-600">প্রমাণ: {report.votesNeedEvidence}</span>
                  <span className="text-emerald-600">ভুল: {report.votesFalse}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => navigate(`/report/${report.id}`)} className="w-full bg-red-600 text-white py-1.5 rounded text-xs font-bold">সম্পূর্ণ রিপোর্ট দেখুন</button>
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${report.latitude},${report.longitude}`} target="_blank" rel="noopener noreferrer"
                    className="w-full border border-gray-200 text-gray-700 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1">
                    <Navigation size={12} /> Google Maps
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Right side controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button onClick={locateUser} className="bg-white p-3 rounded-full shadow-lg text-gray-700 hover:text-blue-600 transition-colors">
          <Navigation size={20} />
        </button>
        <button onClick={() => setShowLegend(!showLegend)} className="bg-white p-3 rounded-full shadow-lg text-gray-700 hover:text-red-600 transition-colors">
          <Info size={20} />
        </button>
      </div>

      {/* Floating plus button */}
      <button onClick={() => navigate('/add')}
        className="fixed bottom-24 left-4 z-50 bg-red-600 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-95">
        <Plus size={28} />
      </button>

      {/* Legend */}
      {showLegend && (
        <div className="absolute bottom-24 left-4 right-16 z-10 bg-white p-4 rounded-2xl shadow-xl border border-gray-100 max-h-[40vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-gray-900">ম্যাপ লিজেন্ড</h3>
            <button onClick={() => setShowLegend(false)} className="text-gray-400"><X size={18} /></button>
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase">মার্কার রঙ (ভোটের ভিত্তিতে)</p>
              <div className="flex gap-4 text-[10px] font-bold flex-wrap">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-600"></div> যাচাইকৃত দুর্নীতি</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-amber-600"></div> প্রমাণ দরকার</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-emerald-600"></div> সম্ভবত ভুল</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-gray-500"></div> নতুন রিপোর্ট</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow"></div> আপনার অবস্থান</div>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase">দুর্নীতির ধরন</p>
              <div className="grid grid-cols-2 gap-2">
                {DEFAULT_CORRUPTION_TYPES.map(type => (
                  <div key={type.id} className="flex items-center gap-2 text-xs"><span className="text-lg">{type.icon}</span><span className="text-gray-700">{type.name}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
