import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { DEFAULT_CORRUPTION_TYPES, IMGBB_API_KEY } from '../constants';
import { MapPin, Link as LinkIcon, Navigation, CheckCircle, AlertCircle, X, Camera, Send } from 'lucide-react';
import L from 'leaflet';

export default function AddReportPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mapPickerRef = useRef<HTMLDivElement>(null);
  const mapPickerInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    corruptionType: '',
    description: '',
    locationName: '',
    latitude: parseFloat(searchParams.get('lat') || '0'),
    longitude: parseFloat(searchParams.get('lng') || '0'),
    date: new Date().toISOString().split('T')[0],
  });

  const [images, setImages] = useState<File[]>([]);
  const [externalLinks, setExternalLinks] = useState<string[]>(['']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (searchParams.get('lat') && searchParams.get('lng')) {
      setFormData(prev => ({
        ...prev,
        latitude: parseFloat(searchParams.get('lat')!),
        longitude: parseFloat(searchParams.get('lng')!),
      }));
    }
  }, [searchParams]);

  useEffect(() => {
    if (showMapPicker && mapPickerRef.current && !mapPickerInstance.current) {
      const lat = formData.latitude || 23.8103;
      const lng = formData.longitude || 90.4125;
      const map = L.map(mapPickerRef.current, { center: [lat, lng], zoom: 13, attributionControl: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      markerRef.current = marker;
      mapPickerInstance.current = map;

      map.on('click', (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        setFormData(prev => ({ ...prev, latitude: e.latlng.lat, longitude: e.latlng.lng }));
      });
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setFormData(prev => ({ ...prev, latitude: pos.lat, longitude: pos.lng }));
      });
    }
    if (!showMapPicker && mapPickerInstance.current) {
      mapPickerInstance.current.remove();
      mapPickerInstance.current = null;
      markerRef.current = null;
    }
  }, [showMapPicker]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setImages(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  const removeImage = (index: number) => setImages(prev => prev.filter((_, i) => i !== index));
  const addExternalLink = () => setExternalLinks(prev => [...prev, '']);
  const updateExternalLink = (index: number, value: string) => {
    const newLinks = [...externalLinks];
    newLinks[index] = value;
    setExternalLinks(newLinks);
  };
  const removeExternalLink = (index: number) => setExternalLinks(prev => prev.filter((_, i) => i !== index));

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
        if (mapPickerInstance.current && markerRef.current) {
          mapPickerInstance.current.setView([lat, lng], 15);
          markerRef.current.setLatLng([lat, lng]);
        }
      });
    }
  };

  const uploadToImgbb = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append('image', file);
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: fd });
    const data = await response.json();
    if (data.success) return data.data.url;
    throw new Error('Image upload failed');
  };

  // Validation for each step
  const validateStep = (s: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (s === 1) {
      if (!formData.corruptionType) newErrors.corruptionType = 'দুর্নীতির ধরন নির্বাচন করুন';
      if (!formData.title.trim()) newErrors.title = 'শিরোনাম আবশ্যক';
      if (formData.title.trim().length < 10) newErrors.title = 'শিরোনাম কমপক্ষে ১০ অক্ষর হতে হবে';
      if (!formData.description.trim()) newErrors.description = 'বিবরণ আবশ্যক';
      if (formData.description.trim().length < 20) newErrors.description = 'বিবরণ কমপক্ষে ২০ অক্ষর হতে হবে';
    }

    if (s === 2) {
      if (!formData.locationName.trim()) newErrors.locationName = 'অবস্থানের নাম আবশ্যক';
      if (formData.latitude === 0 && formData.longitude === 0) newErrors.location = 'GPS বা ম্যাপ থেকে অবস্থান নির্বাচন করুন';
    }

    if (s === 3) {
      if (images.length === 0 && externalLinks.every(l => !l.trim())) {
        newErrors.evidence = 'কমপক্ষে একটি ছবি বা লিঙ্ক প্রদান করুন';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const goToStep = (s: number) => {
    if (s > step) {
      if (!validateStep(step)) return;
    }
    setStep(s);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;

    setIsSubmitting(true);
    setStatus(null);
    try {
      const uploadedUrls = await Promise.all(images.map(img => uploadToImgbb(img)));
      const evidenceLinks = [...uploadedUrls, ...externalLinks.filter(link => link.trim() !== '')];
      await addDoc(collection(db, 'reports'), {
        ...formData,
        evidenceLinks,
        votesTrue: 0,
        votesFalse: 0,
        votesNeedEvidence: 0,
        createdAt: serverTimestamp(),
      });
      setStatus({ type: 'success', message: 'রিপোর্ট সফলভাবে জমা দেওয়া হয়েছে!' });
      setTimeout(() => navigate('/'), 2000);
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'রিপোর্ট জমা দিতে ব্যর্থ হয়েছে। আবার চেষ্টা করুন।' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepTitles = ['তথ্য', 'অবস্থান', 'প্রমাণ'];

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-28">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">রিপোর্ট করুন</h1>
        <p className="text-gray-400 text-sm mt-1">আপনার তথ্য সম্পূর্ণ গোপন থাকবে</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-6">
        {[1, 2, 3].map(s => (
          <button key={s} type="button" onClick={() => goToStep(s)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              step === s ? 'bg-red-600 text-white shadow-md' : step > s ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'
            }`}>
            {stepTitles[s - 1]}
          </button>
        ))}
      </div>

      {status && (
        <div className={`p-4 rounded-xl mb-4 flex items-center gap-3 ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <p className="font-bold text-sm">{status.message}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">
                দুর্নীতির ধরন <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {DEFAULT_CORRUPTION_TYPES.map(type => (
                  <button key={type.id} type="button"
                    onClick={() => { setFormData({ ...formData, corruptionType: type.name }); setErrors(prev => ({ ...prev, corruptionType: '' })); }}
                    className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all text-center ${
                      formData.corruptionType === type.name ? 'border-red-500 bg-red-50 shadow-sm' : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}>
                    <span className="text-xl mb-1">{type.icon}</span>
                    <span className="text-[10px] font-bold text-gray-700 leading-tight">{type.name}</span>
                  </button>
                ))}
              </div>
              {errors.corruptionType && <p className="text-red-500 text-xs mt-1">{errors.corruptionType}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">
                শিরোনাম <span className="text-red-500">*</span>
              </label>
              <input type="text" placeholder="যেমন: পাসপোর্ট অফিসে ঘুষ চাওয়া হয়েছে"
                value={formData.title} onChange={(e) => { setFormData({ ...formData, title: e.target.value }); setErrors(prev => ({ ...prev, title: '' })); }}
                className={`w-full bg-gray-50 border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 outline-none ${errors.title ? 'border-red-400' : 'border-gray-200'}`} />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">
                বিবরণ <span className="text-red-500">*</span>
              </label>
              <textarea rows={4} placeholder="কি ঘটেছিল বিস্তারিত লিখুন..."
                value={formData.description} onChange={(e) => { setFormData({ ...formData, description: e.target.value }); setErrors(prev => ({ ...prev, description: '' })); }}
                className={`w-full bg-gray-50 border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none ${errors.description ? 'border-red-400' : 'border-gray-200'}`} />
              {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
            </div>

            <button type="button" onClick={() => goToStep(2)} className="w-full bg-red-600 text-white py-3 rounded-xl font-bold text-sm active:scale-[0.98] transition-all">
              পরবর্তী →
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">
                অবস্থানের নাম <span className="text-red-500">*</span>
              </label>
              <input type="text" placeholder="যেমন: আগারগাঁও পাসপোর্ট অফিস, ঢাকা"
                value={formData.locationName} onChange={(e) => { setFormData({ ...formData, locationName: e.target.value }); setErrors(prev => ({ ...prev, locationName: '' })); }}
                className={`w-full bg-gray-50 border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 outline-none ${errors.locationName ? 'border-red-400' : 'border-gray-200'}`} />
              {errors.locationName && <p className="text-red-500 text-xs mt-1">{errors.locationName}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={getCurrentLocation}
                className="flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-xl font-bold text-xs active:scale-95 transition-all">
                <Navigation size={14} /> জিপিএস
              </button>
              <button type="button" onClick={() => setShowMapPicker(!showMapPicker)}
                className="flex items-center justify-center gap-2 bg-red-600 text-white py-3 rounded-xl font-bold text-xs active:scale-95 transition-all">
                <MapPin size={14} /> {showMapPicker ? 'ম্যাপ বন্ধ' : 'ম্যাপে নির্বাচন'}
              </button>
            </div>

            {errors.location && <p className="text-red-500 text-xs">{errors.location}</p>}

            {showMapPicker && (
              <div className="h-56 rounded-xl overflow-hidden border border-gray-200">
                <div ref={mapPickerRef} className="w-full h-full" />
              </div>
            )}

            <div className="flex gap-3">
              <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-[10px] font-bold text-gray-400">Lat</span>
                <p className="text-xs text-gray-600">{formData.latitude ? formData.latitude.toFixed(6) : '—'}</p>
              </div>
              <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-[10px] font-bold text-gray-400">Lng</span>
                <p className="text-xs text-gray-600">{formData.longitude ? formData.longitude.toFixed(6) : '—'}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-bold text-sm active:scale-[0.98]">← পূর্ববর্তী</button>
              <button type="button" onClick={() => goToStep(3)} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold text-sm active:scale-[0.98]">পরবর্তী →</button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2">
                প্রমাণের ছবি <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {images.map((img, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200">
                    <img src={URL.createObjectURL(img)} alt="Preview" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-black/60 text-white p-0.5 rounded-full"><X size={12} /></button>
                  </div>
                ))}
                <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                  <Camera size={20} className="text-gray-400 mb-1" />
                  <span className="text-[9px] font-bold text-gray-400">যোগ করুন</span>
                  <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              </div>
              {errors.evidence && <p className="text-red-500 text-xs mt-1">{errors.evidence}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2">এভিডেন্স লিঙ্ক</label>
              <div className="space-y-2">
                {externalLinks.map((link, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="flex-1 relative">
                      <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="url" placeholder="ভিডিও বা নিউজ লিঙ্ক" value={link}
                        onChange={(e) => updateExternalLink(i, e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500 outline-none" />
                    </div>
                    {externalLinks.length > 1 && (
                      <button type="button" onClick={() => removeExternalLink(i)} className="text-gray-400 hover:text-red-600"><X size={18} /></button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addExternalLink} className="text-red-600 text-xs font-bold hover:underline">+ আরও লিঙ্ক</button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setStep(2)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-bold text-sm active:scale-[0.98]">← পূর্ববর্তী</button>
              <button type="submit" disabled={isSubmitting}
                className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all ${
                  isSubmitting ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-red-600 text-white hover:bg-red-700'
                }`}>
                <Send size={16} />
                {isSubmitting ? 'জমা হচ্ছে...' : 'রিপোর্ট জমা দিন'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
