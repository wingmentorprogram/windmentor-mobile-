import React, { useState, useEffect } from 'react';
import { Wind, Plane, Activity, AlertTriangle } from 'lucide-react';
import { Page } from '../types.ts';
import SimulatorRoom from './SimulatorRoom.tsx';
import ExamTerminal from './ExamTerminal.tsx';
import Forum from './Forum.tsx';
import UserProfile from './UserProfile.tsx';
import ProgramHandbook from './ProgramHandbook.tsx';
import BlackBox from './BlackBox.tsx';

interface PrimaryFlightDisplayProps {
    activePage: Page;
    subPageId?: string | number | null;
    isMiniMfdOpen: boolean;
    setIsMiniMfdOpen: (isOpen: boolean) => void;
    onSelectSubPage: (id: string | number) => void;
}

// Utility for rolling numbers
const Digit = ({ value }: { value: string }) => (
    <div className="w-3 h-6 flex items-center justify-center font-g1000 font-bold text-lg bg-[#111] text-g1000-white border-l border-[#333]">
        {value}
    </div>
);

const PrimaryFlightDisplay: React.FC<PrimaryFlightDisplayProps> = ({ activePage, subPageId, isMiniMfdOpen, setIsMiniMfdOpen, onSelectSubPage }) => {
  // Simulated flight data state
  const [pitch, setPitch] = useState(0);
  const [roll, setRoll] = useState(0);
  const [heading, setHeading] = useState(360);
  const [altitude, setAltitude] = useState(5500);
  const [airspeed, setAirspeed] = useState(110);
  const [verticalSpeed, setVerticalSpeed] = useState(0);

  // Simple animation loop to make it feel alive
  useEffect(() => {
    const interval = setInterval(() => {
        const time = Date.now() / 1000;
        setPitch(Math.sin(time * 0.5) * 2.5); // +/- 2.5 degrees
        setRoll(Math.sin(time * 0.3) * 4);  // +/- 4 degrees
        
        const newAlt = 5500 + Math.sin(time * 0.2) * 50;
        setAltitude(newAlt);
        
        // Calculate approx VS based on altitude change rate
        setVerticalSpeed(Math.cos(time * 0.2) * 200);

        setAirspeed(110 + Math.sin(time * 0.8) * 3);
        setHeading((prev) => (prev + 0.05) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const renderContent = () => {
      switch (activePage) {
          case Page.HANDBOOK: return <ProgramHandbook selectedChapterId={subPageId} />;
          case Page.EXAMS: return <ExamTerminal examId={subPageId} />;
          case Page.SIMULATOR: return <SimulatorRoom missionId={subPageId} />;
          case Page.COMMS: return (
               <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-black">
                  <div className="text-g1000-cyan font-g1000 text-sm mb-2">ACTIVE FREQ</div>
                  <div className="text-6xl text-g1000-green font-g1000 font-bold tracking-widest border-2 border-g1000-darkgray p-4 rounded bg-g1000-darkgray/20 shadow-[inset_0_0_20px_rgba(0,0,0,1)]">
                     121.500
                  </div>
                  <div className="mt-4 text-g1000-white font-g1000 text-xs">GUARD MONITORING ENABLED</div>
               </div>
          );
          case Page.FORUM: return <Forum postId={subPageId} />;
          case Page.BLACKBOX: return <BlackBox />;
          case Page.PROFILE: return <UserProfile />;
          case Page.PFD:
          default: 
            return (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 font-g1000 text-xs">
                    <p>NO SUB-PAGE SELECTED</p>
                    <p>USE MFD TO SELECT A TOPIC</p>
                </div>
            );
      }
  };
  
  const handleMiniMfdSelect = (id: string | number) => {
    onSelectSubPage(id);
    setIsMiniMfdOpen(false); // Close menu on selection
  };

  const renderMiniMfdContent = () => {
    switch (activePage) {
        case Page.FORUM:
            return <Forum onSelectSubPage={handleMiniMfdSelect} isMini={true} />;
        case Page.HANDBOOK:
            return <ProgramHandbook onSelectChapter={handleMiniMfdSelect} isMini={true} />;
        case Page.EXAMS:
            return <ExamTerminal onSelectExam={handleMiniMfdSelect} isMini={true} />;
        default:
            return null;
    }
  };

  const showInstruments = activePage === Page.PFD || (!subPageId && [Page.HANDBOOK, Page.EXAMS, Page.FORUM].includes(activePage));

  return (
    <div className="w-full h-full bg-g1000-black relative flex flex-col font-g1000 text-g1000-white select-none overflow-hidden">
        
        {isMiniMfdOpen && (
            <div className="absolute top-0 left-0 w-[320px] h-full bg-black/90 backdrop-blur-md z-50 border-r-2 border-g1000-cyan/50 shadow-2xl animate-slide-in-left">
                {renderMiniMfdContent()}
            </div>
        )}

        {showInstruments ? (
        <div className="h-full relative w-full overflow-hidden shrink-0">
            
            {/* --- TOP NAV/COM BAR --- */}
            <div className="absolute top-0 w-full h-8 bg-[#111] border-b border-[#333] flex justify-between items-center px-2 z-30 shadow-lg font-bold">
                <div className="flex gap-2 items-center">
                    <div className="flex flex-col leading-none">
                        <span className="text-[9px] text-g1000-cyan">NAV1</span>
                    </div>
                    <div className="bg-black border border-[#444] px-1.5 py-0.5 text-g1000-green text-sm">113.50</div>
                    <div className="bg-[#111] px-1.5 py-0.5 text-g1000-white text-sm">109.10</div>
                    <div className="ml-2 text-g1000-white text-xs">LAX <span className="text-g1000-magenta">11.4 NM</span></div>
                </div>
                
                {/* Center: Autopilot / Waypoint Status */}
                <div className="flex gap-4 text-xs tracking-wider">
                    <span className="text-g1000-magenta">WPT <span className="text-white">LAX</span></span>
                    <span className="text-g1000-magenta">DIS <span className="text-white">11.4</span></span>
                    <span className="text-g1000-magenta">DTK <span className="text-white">265°</span></span>
                    <span className="text-g1000-magenta">TRK <span className="text-white">265°</span></span>
                </div>

                <div className="flex gap-2 items-center justify-end">
                    <div className="bg-[#111] px-1.5 py-0.5 text-g1000-white text-sm">118.70</div>
                    <div className="bg-black border border-[#444] px-1.5 py-0.5 text-g1000-green text-sm">121.50</div>
                     <div className="flex flex-col leading-none text-right">
                        <span className="text-[9px] text-g1000-cyan">COM1</span>
                    </div>
                </div>
            </div>

            {/* --- FMA (Flight Mode Annunciator) --- */}
            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[400px] h-6 bg-[#111] border-b border-x border-[#333] z-20 flex text-xs font-bold">
                <div className="flex-1 flex items-center justify-center text-g1000-green border-r border-[#333]">AP</div>
                <div className="flex-1 flex items-center justify-center text-g1000-green border-r border-[#333]">PIT</div>
                <div className="flex-1 flex items-center justify-center text-g1000-white border-r border-[#333]">ALTS</div>
                <div className="flex-1 flex items-center justify-center text-g1000-green">ROL</div>
            </div>

            {/* --- HORIZON (Background) --- */}
            <div className="absolute inset-0 z-0 overflow-hidden bg-g1000-sky">
                {/* The Rotating Container */}
                <div 
                    className="absolute w-[300%] h-[300%] top-[-100%] left-[-100%] origin-center transition-transform duration-75 ease-linear"
                    style={{ transform: `rotate(${-roll}deg) translateY(${pitch * 10}px)` }}
                >
                    {/* Sky */}
                    <div className="w-full h-1/2 bg-gradient-to-b from-[#1a4480] to-[#2c6cbd]"></div>
                    {/* Ground */}
                    <div className="w-full h-1/2 bg-gradient-to-t from-[#2f1b0c] to-[#5a3a1e] border-t border-white/50"></div>
                </div>
                
                {/* Pitch Ladder (Static relative to screen center, moves with pitch via parent transform usually, but here fixed for simplicity or needs animation) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 pointer-events-none"
                     style={{ transform: `translateY(${pitch * 10}px) rotate(${-roll}deg)` }}
                >
                    <div className="w-full h-px bg-white absolute top-1/2 shadow-sm"></div>
                    <div className="w-24 h-px bg-white absolute top-[30%] left-1/2 -translate-x-1/2"></div>
                    <div className="w-24 h-px bg-white absolute bottom-[30%] left-1/2 -translate-x-1/2"></div>
                </div>

                {/* Aircraft Reference Symbol (Fixed) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-2 z-10">
                     <div className="absolute left-0 w-24 h-1.5 bg-g1000-amber border border-black rounded-full"></div>
                     <div className="absolute right-0 w-24 h-1.5 bg-g1000-amber border border-black rounded-full"></div>
                     <div className="absolute left-1/2 -translate-x-1/2 top-0 w-2 h-2 bg-g1000-amber border border-black rounded-full"></div>
                </div>
            </div>

            {/* --- AIRSPEED TAPE (Left) --- */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[70%] w-24 bg-g1000-tapedark border-r border-[#444] z-20 backdrop-blur-sm">
                <div className="absolute top-0 w-full h-6 bg-[#111] border-b border-[#333] flex items-center justify-center text-g1000-cyan font-bold text-sm">110</div>
                <div className="relative h-full overflow-hidden">
                    <div className="absolute top-1/2 -translate-y-1/2 right-0 w-4 h-0 border-y-[8px] border-y-transparent border-r-[12px] border-r-black z-30"></div>
                     {/* Simplified Ticks */}
                    <div className="absolute w-full top-1/2 transition-transform duration-75" style={{ transform: `translateY(${(airspeed % 10) * 4}px)` }}>
                         {[-40,-30,-20,-10,0,10,20,30,40].map(i => (
                             <div key={i} className="absolute right-0 w-full flex justify-end items-center h-px" style={{ top: `${i * 8}px` }}>
                                 <span className="text-white text-xs mr-2 font-bold">{airspeed + (i * -1) - (airspeed % 10)}</span>
                                 <div className="w-3 h-0.5 bg-white"></div>
                             </div>
                         ))}
                    </div>
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black border border-white px-2 py-1 text-xl font-bold text-white z-40">
                    {Math.round(airspeed)}
                </div>
            </div>

            {/* --- ALTIMETER TAPE (Right) --- */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[70%] w-24 bg-g1000-tapedark border-l border-[#444] z-20 backdrop-blur-sm">
                <div className="absolute top-0 w-full h-6 bg-[#111] border-b border-[#333] flex items-center justify-center text-g1000-cyan font-bold text-sm">5500</div>
                 <div className="relative h-full overflow-hidden">
                     {/* Rolling Tape Logic Simplified */}
                     <div className="absolute w-full top-1/2 transition-transform duration-75" style={{ transform: `translateY(${(altitude % 100) * 0.5}px)` }}>
                         {[-400,-300,-200,-100,0,100,200,300,400].map(i => (
                             <div key={i} className="absolute left-0 w-full flex justify-start items-center h-px" style={{ top: `${i * -0.5}px` }}>
                                 <div className="w-3 h-0.5 bg-white"></div>
                                 <span className="text-white text-xs ml-2 font-bold">{Math.round(altitude / 100) * 100 + i}</span>
                             </div>
                         ))}
                    </div>
                 </div>
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black border border-white px-1 py-1 text-xl font-bold text-white z-40 flex">
                     {Math.floor(altitude / 1000)}<span className="text-sm pt-1">{Math.floor((altitude % 1000)/20)*20}</span>
                </div>
            </div>
            
             {/* --- HSI (Bottom) --- */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-64 h-64 z-20">
                 <div className="w-full h-full rounded-full bg-[#111] border-4 border-[#333] relative flex items-center justify-center overflow-hidden shadow-2xl">
                     <div className="absolute inset-0 transition-transform duration-75" style={{ transform: `rotate(${-heading}deg)` }}>
                         {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => (
                             <div key={deg} className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-px">
                                 <div className="w-1 h-3 bg-white"></div>
                                 <span className="absolute top-4 left-1/2 -translate-x-1/2 text-sm font-bold text-white" style={{ transform: `rotate(${-deg}deg)` }}>
                                     {deg === 0 ? 'N' : deg === 90 ? 'E' : deg === 180 ? 'S' : deg === 270 ? 'W' : deg/10}
                                 </span>
                             </div>
                         ))}
                     </div>
                     {/* Rotated plane icon to face UP (North/Heading) relative to instrument */}
                     <Plane className="w-10 h-10 text-white fill-white absolute" style={{ transform: 'rotate(-45deg)' }} />
                     <div className="absolute top-2 bg-black border border-white px-1 rounded text-g1000-magenta font-bold text-xs">HDG</div>
                 </div>
            </div>

        </div>
        ) : (
            <div className="w-full h-full bg-[#050505] p-1">
                {renderContent()}
            </div>
        )}
    </div>
  );
};

export default PrimaryFlightDisplay;