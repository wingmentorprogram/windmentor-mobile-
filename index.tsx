import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import Navigation from './components/Navigation.tsx';
import Dashboard from './components/Dashboard.tsx';
import SimulatorRoom from './components/SimulatorRoom.tsx';
import ExamTerminal from './components/ExamTerminal.tsx';
import Forum from './components/Forum.tsx';
import UserProfile from './components/UserProfile.tsx';
import ProgramHandbook from './components/ProgramHandbook.tsx';
import BlackBox from './components/BlackBox.tsx';
import PrimaryFlightDisplay from './components/PrimaryFlightDisplay.tsx';
import SmokeBackground from './components/SmokeBackground.tsx';
import { Page } from './types.ts';
import { Volume2, VolumeX, Power, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Settings2, SlidersHorizontal, Monitor, LayoutTemplate, Home, Book, FileText, Plane, BarChart2, Radio, MessageSquare, User, LogOut, Info, Bell, Search, Menu, LifeBuoy, Map, ArrowRight } from 'lucide-react';
import { playSound, toggleMute, getMuted, startMusic } from './services/audioService.ts';

type ScreenView = 'PFD' | 'MFD';
type InterfaceMode = 'W1000' | 'STANDARD';

const WelcomeScreen: React.FC<{ onStart: () => void }> = ({ onStart }) => {
    const [isExiting, setIsExiting] = useState(false);
    const [text, setText] = useState("");
    const [textOpacity, setTextOpacity] = useState("opacity-0 translate-y-4");
    const [logoTransform, setLogoTransform] = useState("opacity-0 scale-[1.6]");
    
    useEffect(() => {
        const tLogo = setTimeout(() => {
            setLogoTransform("opacity-100 scale-100");
        }, 100);
        
        const t1 = setTimeout(() => {
            setText("Welcome");
            setTextOpacity("opacity-100 translate-y-0 scale-100");
        }, 400);

        const t2 = setTimeout(() => {
            setTextOpacity("opacity-0 -translate-y-4 scale-95");
        }, 1400);

        const t3 = setTimeout(() => {
            setText("Fellow pilot.");
            setTextOpacity("opacity-100 translate-y-0 scale-100");
        }, 1900);

        const t4 = setTimeout(() => {
            handleStart();
        }, 3200);

        return () => {
            clearTimeout(tLogo);
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
            clearTimeout(t4);
        };
    }, []);

    const handleStart = () => {
        if (isExiting) return;
        setIsExiting(true);
        
        try {
            playSound('click');
            startMusic();
        } catch (e) {
            console.warn("Audio autoplay blocked by browser policy");
        }
        
        setTimeout(onStart, 800);
    };

    return (
        <div className={`fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center overflow-hidden transition-all duration-1000 ease-[cubic-bezier(0.7,0,0.3,1)] ${isExiting ? 'opacity-0 blur-xl scale-110 pointer-events-none' : 'opacity-100 blur-0 scale-100'}`}>
            <SmokeBackground />
            <div className="relative z-10 flex flex-col items-center px-4 text-center">
                <img 
                    src="https://lh3.googleusercontent.com/d/1KgVuIuCv8mKxTcJ4rClCUCdaQ3fxm0x6" 
                    alt="Wing Mentor Logo"
                    className={`w-48 md:w-80 h-auto mb-12 drop-shadow-2xl transition-all duration-[2000ms] ease-[cubic-bezier(0.16,1,0.3,1)] transform ${logoTransform} ${isExiting ? 'scale-90 opacity-0' : ''}`}
                />
                <h1 className={`text-4xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-slate-900 via-slate-700 to-slate-400 drop-shadow-sm mb-12 transition-all duration-500 ease-in-out transform ${textOpacity} min-h-[1.5em]`}>
                    {text}
                </h1>
            </div>
            <div className="absolute bottom-8 text-[9px] text-slate-400 font-mono tracking-widest uppercase opacity-40">
                v2.4.1 • Flight Training Systems
            </div>
        </div>
    );
};

const App: React.FC = () => {
  const [hasLaunched, setHasLaunched] = useState(true);
  const [interfaceMode, setInterfaceMode] = useState<InterfaceMode>('STANDARD');
  const [currentView, setCurrentView] = useState<ScreenView>('MFD');
  const [activeModule, setActiveModule] = useState<Page>(Page.DASHBOARD);
  const [subPageId, setSubPageId] = useState<string | number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [avionicsOn, setAvionicsOn] = useState(true);
  const [isMiniMfdOpen, setIsMiniMfdOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [hoveredControl, setHoveredControl] = useState<string | null>(null);
  const [isMutedState, setIsMutedState] = useState(getMuted());

  // Detect mobile and force Standard Mode for better simulator visibility
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && interfaceMode === 'W1000') {
        setInterfaceMode('STANDARD');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [interfaceMode]);

  useEffect(() => {
    if (!hasLaunched) return;
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [hasLaunched]);

  const handleMenuSelection = (page: Page) => {
      playSound('click');
      setActiveModule(page);
      setSubPageId(null);
      setIsMiniMfdOpen(false);

      if (page === Page.DASHBOARD) {
        setCurrentView('MFD');
        return;
      }

      const directToPfdModules = [Page.SIMULATOR, Page.BLACKBOX, Page.PROFILE, Page.COMMS, Page.PFD];
      if (directToPfdModules.includes(page)) {
        setCurrentView('PFD');
      } else {
        setCurrentView('MFD');
      }
  };

  const handleSubPageSelection = (id: string | number) => {
      setSubPageId(id);
      setCurrentView('PFD');
      setIsMiniMfdOpen(true);
  };

  const handleGoBack = () => {
      playSound('click');
      if (subPageId) {
          setSubPageId(null);
          setCurrentView('MFD'); 
      } else if (activeModule !== Page.DASHBOARD) {
          setActiveModule(Page.DASHBOARD);
          setCurrentView('MFD');
      }
  };

  const handleGoHome = () => {
      playSound('click');
      setSubPageId(null);
      setActiveModule(Page.DASHBOARD);
      setCurrentView('MFD');
  };

  const handleToggleMute = () => {
      const newState = toggleMute();
      setIsMutedState(newState);
      if (!newState) playSound('click');
  };
  
  const renderMfdContent = () => {
    switch (activeModule) {
        case Page.DASHBOARD: return <Dashboard setPage={handleMenuSelection} welcomeComplete={!showWelcome} />;
        case Page.FORUM: return <Forum onSelectSubPage={handleSubPageSelection} />;
        case Page.HANDBOOK: return <ProgramHandbook onSelectChapter={handleSubPageSelection} onExit={handleGoHome} />;
        case Page.EXAMS: return <ExamTerminal onSelectExam={handleSubPageSelection} onExit={handleGoHome} />;
        case Page.SIMULATOR: return <SimulatorRoom onExit={handleGoHome} missionId={subPageId} />;
        case Page.BLACKBOX: return <BlackBox onExit={handleGoHome} />;
        case Page.PROFILE: return <UserProfile />;
        case Page.COMMS:
             return (
               <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-black">
                  <div className="text-g1000-cyan font-mono text-sm mb-2">ACTIVE FREQ</div>
                  <div className="text-6xl text-g1000-green font-mono font-bold tracking-widest border-2 border-g1000-darkgray p-4 rounded bg-g1000-darkgray/20 shadow-[inset_0_0_20px_rgba(0,0,0,1)]">
                     121.500
                  </div>
                  <div className="mt-4 text-g1000-white font-mono text-xs">GUARD MONITORING ENABLED</div>
               </div>
             );
        default:
            return (
                <div className="h-full w-full bg-black text-white font-mono flex flex-col items-center justify-center p-2">
                    <span className="text-g1000-amber font-bold mb-4 text-lg">MODULE ACTIVE</span>
                    <button onClick={() => { setCurrentView('PFD'); }} className="bg-white/10 border border-white/30 px-4 py-2 hover:bg-white/20 text-sm">VIEW ON PFD</button>
                </div>
            );
    }
  }
  
  const renderScreenContent = () => {
    if (!avionicsOn) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-[#050505]">
          <div className="text-zinc-800 font-mono text-sm tracking-[0.5em] mb-4">SYSTEM POWER OFF</div>
        </div>
      );
    }
    
    return (
      <div className="h-full w-full relative">
        {currentView === 'MFD' && renderMfdContent()}
        {currentView === 'PFD' && (
            <PrimaryFlightDisplay 
                  activePage={activeModule} 
                  subPageId={subPageId}
                  isMiniMfdOpen={isMiniMfdOpen}
                  setIsMiniMfdOpen={setIsMiniMfdOpen}
                  onSelectSubPage={handleSubPageSelection}
            />
        )}
      </div>
    );
  };

  const Screw = ({ className }: { className?: string }) => <div className={`screw opacity-90 ${className}`}></div>;

  const withHint = (label: string, element: React.ReactElement) => {
      return React.cloneElement(element, {
          onMouseEnter: () => setHoveredControl(label),
          onMouseLeave: () => setHoveredControl(null)
      });
  };

  const SideControls = ({ mode }: { mode: InterfaceMode }) => (
    <>
      {withHint("Toggle Controls Panel", 
          <button 
          onClick={() => { playSound('click'); setShowSidePanel(!showSidePanel); }}
          className={`absolute ${showSidePanel ? 'left-24' : 'left-2'} top-1/2 -translate-y-1/2 z-[60] bg-[#1a1a1d] border-2 border-black/80 w-10 h-24 rounded-r-md shadow-2xl hidden md:flex flex-col items-center justify-center gap-1 transition-all duration-500 group active:scale-95 overflow-hidden hover:border-g1000-cyan/30`}
          >
          <div className="absolute inset-0 bg-gradient-to-l from-white/10 via-transparent to-black/30 pointer-events-none"></div>
          <span className="text-[7px] font-mono text-zinc-500 font-black uppercase -rotate-90 tracking-widest mb-2 whitespace-nowrap">Controls</span>
          {showSidePanel ? (
              <ChevronLeft className="w-5 h-5 text-zinc-500 group-hover:text-g1000-cyan transition-colors" />
          ) : (
              <SlidersHorizontal className="w-5 h-5 text-zinc-500 group-hover:text-g1000-cyan transition-colors" />
          )}
          </button>
      )}

      <div className={`absolute left-2 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-6 z-50 w-24 items-center pointer-events-auto py-5 bg-[#141414] rounded-r-xl border-y-2 border-r-2 border-black shadow-[0_20px_50px_rgba(0,0,0,1),5px_0_15px_rgba(0,0,0,0.5)] transition-all duration-500 ${showSidePanel ? 'translate-x-0' : '-translate-x-[120%]'}`}>
          <div className="absolute top-0 right-0 w-full h-[1px] bg-white/5"></div>
          
          {withHint("Change Interface Design",
              <button 
                  onClick={() => { playSound('click'); setInterfaceMode(mode === 'STANDARD' ? 'W1000' : 'STANDARD'); }}
                  className="relative w-14 h-14 group flex flex-col items-center justify-center mb-2"
              >
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[7px] text-zinc-500 font-bold font-mono tracking-tighter uppercase whitespace-nowrap">Design</span>
                  <div className="w-12 h-12 rounded-full bg-[#181818] shadow-knob border border-black flex items-center justify-center cursor-pointer active:scale-95 transition-transform material-rubber overflow-hidden group-hover:border-g1000-cyan/30">
                      <LayoutTemplate className="w-5 h-5 text-zinc-500 group-hover:text-g1000-cyan transition-colors" />
                  </div>
              </button>
          )}
          
          <div className="w-12 h-px bg-white/5 my-1"></div>

          {withHint("Audio Mute / Unmute",
              <div className="relative w-14 h-14 group" onClick={handleToggleMute}>
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[7px] text-zinc-500 font-bold font-mono tracking-tighter uppercase">Audio</span>
                  <div className={`w-14 h-14 rounded-full bg-[#181818] shadow-knob border flex items-center justify-center cursor-pointer active:scale-95 transition-all material-rubber overflow-hidden hover:border-zinc-500 ${isMutedState ? 'border-red-900/50' : 'border-black'}`}>
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-20"></div>
                      {isMutedState ? 
                           <VolumeX className="w-6 h-6 text-red-500" /> : 
                           <Volume2 className="w-6 h-6 text-zinc-500 group-hover:text-g1000-cyan" />
                      }
                  </div>
              </div>
          )}

          {withHint("Return to Main Menu",
              <div className="relative w-12 h-12 group" onClick={handleGoHome}>
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[7px] text-zinc-500 font-bold font-mono tracking-tighter uppercase">Menu</span>
                  <div className="w-12 h-12 rounded-full bg-[#181818] shadow-knob border border-black flex items-center justify-center cursor-pointer active:scale-95 material-rubber overflow-hidden hover:border-zinc-500">
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-20"></div>
                  <span className="text-[7px] font-mono text-zinc-400 font-black uppercase">Push</span>
                  </div>
              </div>
          )}

          {withHint("Black Box Directory",
              <div className="relative w-16 h-16 mt-2 group" onClick={() => { playSound('click'); handleMenuSelection(Page.BLACKBOX); }}>
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[7px] text-zinc-500 font-bold font-mono tracking-tighter uppercase">BOX</span>
                  <div className="w-16 h-16 rounded-full bg-[#181818] shadow-knob border border-black flex items-center justify-center cursor-pointer active:rotate-12 transition-transform material-rubber overflow-hidden hover:border-zinc-500">
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-20"></div>
                      <div className="text-[6px] font-black text-zinc-600 text-center leading-tight uppercase tracking-tighter">Push<br/>Dir</div>
                      <div className="absolute w-8 h-8 bg-[#111] rounded-full border border-black shadow-[0_2px_4px_rgba(0,0,0,0.8)]"></div>
                  </div>
              </div>
          )}

           {withHint("Go Back",
              <div className="relative w-12 h-12 mt-2 group" onClick={handleGoBack}>
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[7px] text-zinc-500 font-bold font-mono tracking-tighter uppercase">Clr</span>
                  <div className="w-12 h-12 rounded-full bg-[#181818] shadow-knob border border-black flex items-center justify-center cursor-pointer active:scale-95 material-rubber relative hover:border-red-900/50">
                      <ChevronLeft className="w-6 h-6 text-zinc-500 font-black" />
                  </div>
              </div>
          )}
      </div>
    </>
  );

  const welcomeOverlay = showWelcome ? <WelcomeScreen onStart={() => setShowWelcome(false)} /> : null;

  if (interfaceMode === 'STANDARD') {
     return (
        <div className="h-screen w-screen bg-[#050505] text-slate-200 font-sans overflow-hidden animate-fade-in selection:bg-cyan-500/30 relative">
            {welcomeOverlay}
            <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none z-0"></div>
            <SideControls mode="STANDARD" />
            <main className="absolute inset-0 w-full h-full flex flex-col z-0 pt-0">
                <div key={activeModule} className="flex-1 overflow-hidden relative animate-app-pop-up">
                    {activeModule === Page.SIMULATOR ? (
                         <div className="absolute inset-0 bg-black">
                            <SimulatorRoom onExit={handleGoHome} missionId={subPageId} />
                         </div>
                    ) : (
                         <div className="h-full w-full relative">
                             {renderMfdContent()}
                         </div>
                    )}
                </div>
                
                <div className="h-16 w-full bg-gradient-to-t from-[#0a0a0a] to-[#1c1c1c] border-t border-black shadow-[0_-5px_20px_rgba(0,0,0,0.8),inset_0_-1px_0_rgba(255,255,255,0.05)] relative shrink-0 z-30">
                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-white/5 opacity-50"></div>
                    <Navigation 
                      activePage={activeModule} 
                      setPage={handleMenuSelection}
                      currentView={currentView}
                      isMiniMfdOpen={isMiniMfdOpen}
                      setIsMiniMfdOpen={setIsMiniMfdOpen}
                      onHover={setHoveredControl}
                    />
                </div>
            </main>
        </div>
     );
  }

  return (
    <div className="h-screen w-screen bg-[#111] material-plastic overflow-hidden flex flex-col relative shadow-[inset_0_0_150px_rgba(0,0,0,1)] animate-fade-in">
        {welcomeOverlay}
        {hoveredControl && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[100] animate-fade-in pointer-events-none">
                <div className="bg-black/90 text-g1000-cyan px-6 py-2 rounded-full border border-g1000-cyan/30 shadow-[0_0_20px_rgba(0,255,255,0.2)] flex items-center gap-3 backdrop-blur-md">
                    <Info className="w-4 h-4 animate-pulse" />
                    <span className="text-xs font-mono font-bold tracking-widest uppercase">{hoveredControl}</span>
                </div>
            </div>
        )}

        <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/asfalt-dark.png')] z-10"></div>
        <Screw className="absolute top-2 left-2 z-50" />
        <Screw className="absolute top-2 right-2 z-50" />
        <Screw className="absolute bottom-2 left-2 z-50" />
        <Screw className="absolute bottom-2 right-2 z-50" />
        
        <div className="flex-1 relative mx-3 my-1 flex flex-col min-h-0">
          <div className="bezel-frame flex-1 flex p-[6px] bg-[#1a1a1a]">
            <div className="relative bg-[#050505] rounded-[2px] flex-1 overflow-hidden flex flex-col shadow-screen-inset border border-[#333]">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/30 z-[45] pointer-events-none mix-blend-overlay"></div>
              <div className={`flex-1 relative bg-aviation-screen overflow-hidden ${avionicsOn ? 'lcd-glow' : ''}`}>
                  <div key={activeModule} className="absolute inset-0 z-20 overflow-hidden animate-app-pop-up">
                     {renderScreenContent()}
                  </div>
              </div>
            </div>
          </div>
        </div>

        <SideControls mode="W1000" />

        <div className="h-16 w-full bg-gradient-to-t from-[#0a0a0a] to-[#1c1c1c] border-t border-black shadow-[0_-5px_20px_rgba(0,0,0,0.8),inset_0_-1px_0_rgba(255,255,255,0.05)] relative shrink-0 z-30">
            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-white/5 opacity-50"></div>
            <Navigation 
              activePage={activeModule} 
              setPage={handleMenuSelection}
              currentView={currentView}
              isMiniMfdOpen={isMiniMfdOpen}
              setIsMiniMfdOpen={setIsMiniMfdOpen}
              onHover={setHoveredControl}
            />
        </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);