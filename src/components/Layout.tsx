import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Newspaper, Map as MapIcon, PlusSquare, Info, Download } from 'lucide-react';
import logo from '../assets/logo.jpg';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
  };

  const navItems = [
    { name: 'ফিড', path: '/', icon: Newspaper },
    { name: 'ম্যাপ', path: '/map', icon: MapIcon },
    { name: 'রিপোর্ট', path: '/add', icon: PlusSquare },
    { name: 'তথ্য', path: '/info', icon: Info },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top Nav */}
      <header className="bg-red-600 text-white px-4 py-3 shadow-md flex items-center justify-between sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Chor Koi" className="w-8 h-8 rounded-lg object-cover" />
          <h1 className="text-lg font-black tracking-tight">Chor Koi</h1>
        </Link>
        {!isInstalled && deferredPrompt && (
          <button
            onClick={handleInstall}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full text-sm font-bold transition-all active:scale-95"
          >
            <Download size={16} /> ইনস্টল
          </button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 z-50 safe-area-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                isActive ? 'text-red-600' : 'text-gray-500 hover:text-red-400'
              }`}
            >
              <Icon size={22} />
              <span className="text-[10px] mt-0.5 font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
