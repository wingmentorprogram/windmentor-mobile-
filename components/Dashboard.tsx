import React, { useState, useEffect } from 'react';
import { Page } from '../types.ts';
import { Plane, ChevronRight, ChevronLeft, ArrowRight, Clock, Signal, Bell, Radio, PlayCircle, BookOpen, MessageSquare, AlertCircle, HardDrive } from 'lucide-react';
import { playSound } from '../services/audioService.ts';
import SmokeBackground from './SmokeBackground.tsx';

interface DashboardProps {
  activePage?: Page;
  setPage: (page: Page) => void;
  onSelectSubPage?: (id: string | number) => void;
  welcomeComplete?: boolean;
}

// --- CONFIGURATION ---

interface DockItem {
  id: Page;
  label: string;
  img: string;
  desc: string;
  scale?: number;
  x?: number;
  y?: number;
}

interface NewsItem {
  label: string;
  color: string;
  text: string;
}

interface CarouselItem {
  id: number | string;
  title: string;
  subtitle: string;
  desc: string;
  image: string;
  action: Page; // The page to navigate to
  subPageId?: string | number; // Specific ID to pass (e.g., Exam ID, Chapter ID)
  news: NewsItem;
  icon?: React.ReactNode | null;
}

// 1. DOCK ITEMS (Bottom Navigation / Quick Launch)
const dockItems: DockItem[] = [
  { 
    id: Page.FORUM, 
    label: 'Comms', 
    img: 'https://lh3.googleusercontent.com/d/1InHXB-jhAZ3UNDXcvHbENwbB5ApY8eOp', 
    desc: 'Community',
  },
  { 
    id: Page.HANDBOOK, 
    label: 'Handbook', 
    img: 'https://lh3.googleusercontent.com/d/1GbUopHNGyXMhzi5sW1Ybo5gZMh2_YSKN', 
    desc: 'Library',
  },
  { 
    id: Page.PROFILE, 
    label: 'Passport', 
    img: 'https://lh3.googleusercontent.com/d/1sUUBI2blGY9oNoutvN9fH1cJ8j6RVOiX', 
    desc: 'Logbook',
    scale: 1.8,
    x: 5,
  },
  { 
    id: Page.EXAMS, 
    label: 'Exams', 
    img: 'https://lh3.googleusercontent.com/d/11j7ZHv874EBZZ6O36etvuHC6rRWWm8kF', 
    desc: 'Testing',
  },
  { 
    id: Page.SIMULATOR, 
    label: 'Simulator', 
    img: 'https://lh3.googleusercontent.com/d/1HpzTC2mR312qpDeG6i1Cy4FU0JeRrfuE', 
    desc: 'Flight Deck',
    scale: 1.8,
  },
  { 
    id: Page.BLACKBOX, 
    label: 'Blackbox', 
    img: 'https://lh3.googleusercontent.com/d/1yLM_bGVPN8Sa__fqR95C0EeA1CUsTAA7', 
    desc: 'Telemetry',
  },
];

// 2. FEATURED TOPICS (The "Cards" on the Carousel)
const carouselData: CarouselItem[] = [
  {
    id: 'cpl-exam',
    title: "CPL EXAMINATION",
    subtitle: "TERMINAL • ASSESSMENT",
    desc: "Commercial Pilot License Theory. Advanced aircraft systems, complex regulations, and commercial operations.",
    image: "https://lh3.googleusercontent.com/d/1l3DzGrf1cgUAExrS5d-9ncs_j455G9c_",
    action: Page.EXAMS,
    subPageId: 'CPL',
    icon: <AlertCircle className="w-4 h-4 text-amber-400" />,
    news: { label: "EXAM", color: "bg-amber-500", text: "Q-BANK UPDATED" }
  },
  {
    id: 'sim-vor',
    title: "FUNDAMENTALS OF IFR",
    subtitle: "SIMULATOR • SCENARIO",
    desc: "Practice radial interception and tracking. Master the HSI and VOR instruments in a controlled environment.",
    image: "https://lh3.googleusercontent.com/d/1TQFFjrDKWlyqCkiHJjWC5QPlEAWQEIEu",
    action: Page.SIMULATOR,
    subPageId: 'f-outbound',
    icon: <Plane className="w-4 h-4 text-cyan-400" />,
    news: { label: "TRAINING", color: "bg-blue-500", text: "WIND: CALM" }
  },
  {
    id: 'forum-career',
    title: "WING MENTOR MASTER CLASS",
    subtitle: "",
    desc: "Expert-led sessions on advanced aviation topics. Learn from industry veterans in these exclusive live masterclasses.",
    image: "https://lh3.googleusercontent.com/d/1VNI13hbdlRSDkt2QdRR0lxUHi0U7tn9f",
    action: Page.FORUM,
    subPageId: '2',
    icon: null,
    news: { label: "LIVE", color: "bg-emerald-500", text: "STARTING IN 2H" }
  },
  {
    id: 'sim-crosswind',
    title: "CROSSWIND LANDING",
    subtitle: "SIMULATOR • CHALLENGE",
    desc: "Advanced approach scenario with 25kt gusting crosswinds at KLAX. Test your crab-and-kick skills.",
    image: "https://images.unsplash.com/photo-1474302770737-173ee21bab63?auto=format&fit=crop&q=80&w=800",
    action: Page.SIMULATOR,
    subPageId: 'l-crosswind',
    icon: <Plane className="w-4 h-4 text-red-400" />,
    news: { label: "HARD", color: "bg-red-500", text: "GUSTS 25KTS" }
  },
  {
    id: 'blackbox-logs',
    title: "FLIGHT LOGS",
    subtitle: "BLACKBOX • DATA",
    desc: "Review telemetry from your recent sessions. Analyze altitude deviations and approach stability.",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800",
    action: Page.BLACKBOX,
    subPageId: 'logs',
    icon: <HardDrive className="w-4 h-4 text-blue-400" />,
    news: { label: "SYNC", color: "bg-blue-600", text: "CLOUD SYNC ON" }
  }
];

const Dashboard: React.FC<DashboardProps> = ({ setPage, onSelectSubPage, welcomeComplete = true }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isNavigatingAway, setIsNavigatingAway] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
      if (!welcomeComplete) return; 
      const timer = setTimeout(() => setIsLoaded(true), 100);
      return () => clearTimeout(timer);
  }, [welcomeComplete]);

  useEffect(() => {
    if (isNavigatingAway) return;
    const interval = setInterval(() => {
       setActiveIndex((prev) => (prev + 1) % carouselData.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isNavigatingAway]);

  const handleCardClick = (item: CarouselItem) => {
    if (isNavigatingAway) return;
    playSound('click');
    setIsNavigatingAway(true);
    
    setTimeout(() => {
        setPage(item.action);
        if (item.subPageId && onSelectSubPage) onSelectSubPage(item.subPageId);
    }, 400);
  };

  const handleDockNav = (item: DockItem) => {
    if (isNavigatingAway) return;
    playSound('click');
    setIsNavigatingAway(true);
    
    setTimeout(() => {
        setPage(item.id);
    }, 400);
  };

  const nextSlide = () => {
    if(isNavigatingAway) return;
    playSound('click');
    setActiveIndex((prev) => (prev + 1) % carouselData.length);
  };

  const prevSlide = () => {
    if(isNavigatingAway) return;
    playSound('click');
    setActiveIndex((prev) => (prev - 1 + carouselData.length) % carouselData.length);
  };

  const currentItem = carouselData[activeIndex];
  // Fix: Corrected the variable declaration to avoid self-reference and illegal constant assignment
  const currentNews = currentItem.news;

  return (
    <div className={`h-full w-full font-sans flex flex-col relative selection:bg-cyan-500/30 text-slate-800 overflow-hidden`}>
      
      {/* --- TRANSITION OVERLAY (Glass Blur) --- */}
      {isNavigatingAway && (
          <div className="absolute inset-0 z-[1200] backdrop-blur-2xl bg-white/10 animate-fade-in transition-all duration-300"></div>
      )}

      <SmokeBackground />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none z-0 mix-blend-multiply"></div>
      
      {/* --- TOP APP BAR --- */}
      <div className={`h-16 md:h-20 flex items-center justify-between px-4 sm:px-8 z-50 shrink-0 bg-gradient-to-b from-white/80 to-transparent relative transition-all duration-1000 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${isLoaded && !isNavigatingAway ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
         <div className="absolute left-1/2 top-4 -translate-x-1/2 flex flex-col items-center">
            <h1 className="text-lg sm:text-2xl md:text-4xl font-black font-sans uppercase tracking-[0.15em] sm:tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-b from-slate-900 via-slate-700 to-slate-400 drop-shadow-sm leading-none whitespace-nowrap">WING MENTOR</h1>
            <div className="text-sky-600 font-mono text-[8px] sm:text-xs font-bold tracking-[0.3em] sm:tracking-[0.5em] mt-1 uppercase">G1000 SYSTEM</div>
         </div>
         <div className="ml-auto flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-4 bg-white/40 backdrop-blur-md border border-white/40 px-4 py-2 rounded-full shadow-sm">
                <Clock className="w-3 h-3 text-slate-500" />
                <span className="text-xs font-mono font-bold text-slate-600">ZULU: {new Date().toISOString().split('T')[1].substring(0,5)}Z</span>
            </div>
            <div className="relative">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer" />
                <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
            </div>
         </div>
      </div>

      {/* --- NEWS STRIP --- */}
      <div className={`w-full flex flex-col items-center justify-center py-2 z-40 relative gap-2 transition-all duration-1000 delay-100 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${isLoaded && !isNavigatingAway ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 -translate-y-4 blur-sm'}`}>
          <div className="group relative transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] w-64 sm:w-80 h-10 hover:h-48 bg-white/60 hover:bg-white/95 backdrop-blur-md border border-slate-200 hover:border-slate-300 rounded-full hover:rounded-2xl shadow-lg hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)] overflow-hidden cursor-pointer">
              <div className="absolute inset-0 flex items-center p-1 pr-5 gap-3 group-hover:opacity-0 transition-opacity duration-300 pointer-events-none">
                  <div className="relative overflow-hidden w-16 h-6 rounded-full bg-slate-200 shadow-inner shrink-0">
                     <div key={activeIndex} className={`absolute inset-0 flex items-center justify-center ${currentNews.color} animate-slide-in-left`}>
                        <span className="text-[9px] font-black text-black tracking-widest">{currentNews.label}</span>
                     </div>
                  </div>
                  <div className="h-4 relative overflow-hidden flex-1">
                     <div key={activeIndex} className="absolute inset-0 flex items-center animate-fade-in">
                        <span className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-widest truncate">{currentNews.text}</span>
                     </div>
                  </div>
              </div>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-75 flex flex-col">
                   <div className="absolute inset-0 z-0">
                      <img src={currentItem.image} className="w-full h-full object-cover opacity-10 transition-transform duration-700 group-hover:scale-105 filter grayscale" alt="" />
                      <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent"></div>
                   </div>
                   <div className="relative z-10 p-6 h-full flex flex-col justify-end">
                       <div className="flex justify-between items-end mb-2">
                           <div className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded w-fit ${currentNews.color} text-black shadow-sm`}>{currentNews.label}</div>
                           <span className="text-[9px] text-slate-400 font-mono">LIVE FEED</span>
                       </div>
                       <h4 className="text-slate-800 font-bold text-sm mb-2 leading-tight">{currentNews.text}</h4>
                       <p className="text-[10px] text-slate-600 line-clamp-2 leading-relaxed opacity-90">{currentItem.desc}</p>
                       <div className="mt-3 w-full h-[1px] bg-slate-300"></div>
                   </div>
              </div>
          </div>
          <span className="text-[9px] text-slate-400 font-mono uppercase tracking-[0.3em] font-bold animate-pulse pointer-events-none mix-blend-multiply">Featured Topics</span>
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      <div className={`flex-1 relative flex flex-col items-center justify-center min-h-0 transition-all duration-1000 delay-200 ease-out ${isLoaded ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-95 blur-md'}`}>
          <div className={`relative w-full max-w-[1400px] h-[280px] sm:h-[320px] flex items-center justify-center z-10 mt-4 perspective-[1200px]`}>
              <button onClick={prevSlide} className={`absolute left-2 md:left-10 z-[60] p-3 rounded-full bg-white/20 border border-white/40 hover:bg-white/40 transition-all group backdrop-blur-md shadow-lg ${isNavigatingAway ? 'opacity-0' : 'opacity-100'}`}><ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-slate-800" /></button>
              <button onClick={nextSlide} className={`absolute right-2 md:right-10 z-[60] p-3 rounded-full bg-white/20 border border-white/40 hover:bg-white/40 transition-all group backdrop-blur-md shadow-lg ${isNavigatingAway ? 'opacity-0' : 'opacity-100'}`}><ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-slate-800" /></button>

              {carouselData.map((item, index) => {
                  let offset = (index - activeIndex);
                  if (offset > carouselData.length / 2) offset -= carouselData.length;
                  if (offset < -carouselData.length / 2) offset += carouselData.length;
                  const isActive = offset === 0;
                  const absOffset = Math.abs(offset);
                  if (absOffset > 2) return null;
                  const isMasterclass = item.id === 'forum-career';
                  // Responsive sizing for cards
                  const transform = `translateX(${offset * (window.innerWidth < 640 ? 55 : 45)}%) scale(${isActive ? 1 : 0.85}) translateZ(${isActive ? 0 : -150}px) rotateY(${offset * -20}deg)`;
                  const opacity = isNavigatingAway ? 0 : (isActive ? 1 : Math.max(0.3, 1 - absOffset * 0.5));
                  const filter = isNavigatingAway ? 'blur(20px)' : (isActive ? 'none' : 'grayscale(0.5)');

                  return (
                      <div key={item.id} className={`absolute w-[260px] sm:w-[320px] md:w-[420px] h-[200px] sm:h-[240px] md:h-[280px] cursor-pointer transition-all duration-700`} style={{ transform, opacity, zIndex: 50 - absOffset, filter }} onClick={() => isActive ? handleCardClick(item) : setActiveIndex(index)}>
                         <div className="w-full h-full rounded-2xl overflow-hidden border border-white/50 bg-white/20 backdrop-blur-2xl shadow-2xl relative group">
                            <img src={item.image} className="absolute inset-0 w-full h-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-110" alt="" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80"></div>
                            {!isMasterclass && (
                                <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md p-2 rounded-full border border-white/30">
                                    {item.icon || <PlayCircle className="w-4 h-4 text-white" />}
                                </div>
                            )}
                            <div className={`absolute inset-0 flex flex-col ${isMasterclass ? 'justify-end items-center text-center p-4 sm:p-6 pb-2 sm:pb-4' : 'justify-end p-4 sm:p-6'}`}>
                                {!isMasterclass && item.subtitle && (
                                    <div className="mb-auto flex justify-between items-start">
                                        <div className="px-2 py-1 bg-white/20 border border-white/30 rounded backdrop-blur-md shadow-sm">
                                            <span className="text-[8px] sm:text-[9px] font-black text-white uppercase tracking-widest drop-shadow-sm">{item.subtitle}</span>
                                        </div>
                                    </div>
                                )}
                                <h2 className={`font-black text-white tracking-tight drop-shadow-md ${isMasterclass ? 'text-[12px] sm:text-[14px] mb-0 px-2 sm:px-4 leading-[1.2] uppercase opacity-90 text-center' : 'text-xl sm:text-2xl md:text-3xl mb-1 sm:mb-2'}`}>
                                  {isMasterclass ? (
                                    <span>WING MENTOR<br/>MASTER CLASS</span>
                                  ) : (
                                    item.title
                                  )}
                                </h2>
                            </div>
                         </div>
                      </div>
                  );
              })}
          </div>
          <div className={`h-24 w-full flex items-center justify-center mt-4 z-10 transition-all duration-300 ${isNavigatingAway ? 'opacity-0 translate-y-10 blur-md' : 'opacity-100'}`}>
              <div key={activeIndex} className="max-w-lg text-center px-4 sm:px-6 animate-slide-up">
                  <h3 className="text-slate-500 text-[10px] font-black tracking-[0.2em] uppercase mb-1">Topic Brief</h3>
                  <p className="text-slate-800 text-xs sm:text-sm md:text-base font-medium leading-relaxed line-clamp-2 sm:line-clamp-none">{carouselData[activeIndex]?.desc}</p>
              </div>
          </div>
      </div>

      {/* --- BOTTOM DOCK --- */}
      <div className={`h-48 sm:h-64 shrink-0 flex flex-col items-center justify-start pt-2 pb-6 sm:pb-10 gap-2 transition-all duration-1000 delay-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${isLoaded && !isNavigatingAway ? 'translate-y-0 opacity-100' : 'translate-y-40 opacity-0'}`}>
          <div className="flex items-end gap-3 sm:gap-6 px-4 py-1 relative">
              {dockItems.map((item) => (
                  <button key={item.id} onClick={() => handleDockNav(item)} className={`group relative flex flex-col items-center gap-2 px-1 sm:px-2 py-1 transition-all duration-300 hover:-translate-y-4`}>
                      <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 relative rounded-xl sm:rounded-2xl overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow">
                          <div className="w-full h-full transition-transform duration-300" style={{ transform: `scale(${item.scale || 1}) translate(${item.x || 0}px, ${item.y || 0}px)` }}>
                              <img src={item.img} alt={item.label} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                          </div>
                      </div>
                      <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-slate-300 group-hover:bg-cyan-500 transition-all duration-300 opacity-0 group-hover:opacity-100 translate-y-2"></div>
                  </button>
              ))}
          </div>
          <div className={`w-32 sm:w-48 h-[1px] bg-gradient-to-r from-transparent via-slate-400/40 to-transparent shadow-[0_1px_0_rgba(255,255,255,0.2)]`}></div>
          <div className={`text-[8px] sm:text-[9px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] font-mono flex gap-1.5 mt-1`}>
             <span className="text-slate-500">Apps</span><span className="text-red-600">for pilots</span><span className="text-slate-500">made</span><span className="text-blue-600">by pilots</span>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;