import React from 'react';
import { Page } from '../types.ts';
import { playSound } from '../services/audioService.ts';

interface NavigationProps {
  activePage: Page;
  setPage: (page: Page) => void;
  currentView: 'PFD' | 'MFD';
  isMiniMfdOpen: boolean;
  setIsMiniMfdOpen: (isOpen: boolean) => void;
  onHover?: (text: string | null) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activePage, setPage, currentView, isMiniMfdOpen, setIsMiniMfdOpen, onHover }) => {
  const hasMiniMfd = [Page.HANDBOOK, Page.EXAMS, Page.FORUM].includes(activePage);
  
  let miniMfdLabel = 'INDEX';
  if (activePage === Page.HANDBOOK) miniMfdLabel = 'CHAPT';
  if (activePage === Page.EXAMS) miniMfdLabel = 'EXAMS';
  if (activePage === Page.FORUM) miniMfdLabel = 'TOPIC';

  const navItems = [
    { page: Page.DASHBOARD, label: 'MENU', desc: 'RETURN TO MAIN MENU', isActive: activePage === Page.DASHBOARD },
    { page: Page.HANDBOOK, label: 'HNDBK', desc: 'OPEN TRAINING HANDBOOK', isActive: activePage === Page.HANDBOOK },
    { page: Page.EXAMS, label: 'EXAM', desc: 'WRITTEN EXAM TERMINAL', isActive: activePage === Page.EXAMS },
    { page: Page.SIMULATOR, label: 'SIM', desc: 'FLIGHT SIMULATOR', isActive: activePage === Page.SIMULATOR },
    { page: Page.BLACKBOX, label: 'LOGS', desc: 'FLIGHT DATA RECORDER LOGS', isActive: activePage === Page.BLACKBOX },
    { page: Page.COMMS, label: 'COMM', desc: 'RADIO COMMUNICATION STACK', isActive: activePage === Page.COMMS },
    { page: Page.FORUM, label: 'FORUM', desc: 'PILOT COMMUNITY FORUM', isActive: activePage === Page.FORUM },
    { page: Page.PROFILE, label: 'PROF', desc: 'PILOT PROFILE & LOGBOOK', isActive: activePage === Page.PROFILE },
    (currentView === 'PFD' && hasMiniMfd) ? { 
        label: isMiniMfdOpen ? `CLOSE` : miniMfdLabel, 
        desc: isMiniMfdOpen ? 'CLOSE SIDE MENU' : `OPEN ${miniMfdLabel}`,
        action: () => setIsMiniMfdOpen(!isMiniMfdOpen),
        isActive: isMiniMfdOpen
    } : null,
    null,
    null,
    { page: Page.DASHBOARD, label: 'BACK', desc: 'GO BACK', isBack: true },
  ];

  return (
    <div className="w-full h-full flex flex-col justify-center px-4 relative z-20 bg-[#151515] border-t border-white/5 shadow-[inset_0_5px_15px_rgba(0,0,0,0.8)]">
       {/* Material Texture */}
       <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] pointer-events-none mix-blend-overlay"></div>
       
       {/* Top Highlight Line */}
       <div className="absolute top-0 left-0 w-full h-[1px] bg-white/10 opacity-30"></div>

       {/* Softkey Buttons Strip */}
       <div className="flex justify-between items-center w-full h-12 gap-1.5 relative z-10 px-1">
         {navItems.map((item, i) => (
           <div key={i} className="relative w-full h-full group perspective-[800px]">
              {/* Button Slot/Housing */}
              <div className="absolute inset-0 bg-black/60 rounded-[3px] border border-white/5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] translate-y-[1px]"></div>

              {/* Physical Button */}
              <button
                onMouseEnter={() => item && onHover?.(item.desc || null)}
                onMouseLeave={() => onHover?.(null)}
                onClick={() => {
                  playSound('click');
                  if (item) {
                    if ('page' in item) setPage(item.page);
                    if ('action' in item) (item as any).action();
                  }
                }}
                disabled={!item}
                className={`
                  relative w-full h-full rounded-[2px] transition-all duration-75 
                  flex flex-col items-center justify-center gap-0.5
                  border-t border-white/10 border-b border-black
                  ${item 
                    ? 'bg-gradient-to-b from-[#383838] to-[#202020] cursor-pointer shadow-[0_4px_4px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] active:translate-y-[2px] active:shadow-[0_1px_2px_rgba(0,0,0,0.8),inset_0_1px_3px_rgba(0,0,0,0.8)] active:border-t-black hover:from-[#444] hover:to-[#2a2a2a]' 
                    : 'bg-[#181818] opacity-50 cursor-default border-transparent shadow-none grayscale'
                  }
                `}
              >
                 {/* Tactile Triangle (Embossed Indicator) */}
                 {item && (
                   <div className={`w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[6px] ${item.isActive ? 'border-b-g1000-cyan drop-shadow-[0_0_4px_rgba(0,255,255,0.6)]' : 'border-b-zinc-500 group-hover:border-b-zinc-300'} transition-all mb-0.5 opacity-90`}></div>
                 )}

                 {/* Text Label */}
                 {item && (
                    <span className={`text-[10px] font-black uppercase tracking-tighter font-mono transform scale-y-90 leading-none ${item.isActive ? 'text-g1000-cyan drop-shadow-[0_0_3px_rgba(0,255,255,0.5)]' : 'text-zinc-400 group-hover:text-zinc-200'} transition-colors`}>
                        {item.label}
                    </span>
                 )}
                 
                 {/* Specular Highlight on Top Edge */}
                 {item && <div className="absolute top-0 left-[2px] right-[2px] h-[1px] bg-white/20 opacity-40"></div>}
              </button>
           </div>
         ))}
       </div>
       
       {/* Decorative Screws */}
       <Screw position="left-2" />
       <Screw position="right-2" />
    </div>
  );
};

// Helper for decorative screws
const Screw = ({ position }: { position: string }) => (
  <div className={`absolute ${position} top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#111] shadow-[inset_0_1px_1px_rgba(0,0,0,0.8),0_1px_0_rgba(255,255,255,0.05)] border border-black flex items-center justify-center opacity-60`}>
      <div className="w-1.5 h-[1px] bg-[#333] rotate-45"></div>
      <div className="w-1.5 h-[1px] bg-[#333] -rotate-45 absolute"></div>
  </div>
);

export default Navigation;