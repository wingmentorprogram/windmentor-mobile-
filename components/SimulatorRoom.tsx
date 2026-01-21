import React, { useState } from 'react';
import { Gamepad2, X } from 'lucide-react';

interface SimulatorRoomProps {
  isMini?: boolean;
  onExit?: () => void;
  missionId?: string | number | null;
}

const SimulatorRoom: React.FC<SimulatorRoomProps> = ({ isMini = false, onExit, missionId }) => {
  // Use GeoFS for the crosswind landing scenario, otherwise use default sim
  const EXTERNAL_URL = missionId === 'l-crosswind' 
    ? "https://www.geo-fs.com/geofs.php?aircraft=2" 
    : "https://simulatoroom.vercel.app/";
    
  const [showExit, setShowExit] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // For the Mini MFD view (Side Panel)
  if (isMini) {
      return (
          <div className="h-full w-full bg-black border-r border-white/20 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
              <div className="w-16 h-16 rounded-full border-2 border-g1000-cyan flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(0,255,255,0.2)] bg-g1000-cyan/10">
                  <Gamepad2 className="w-8 h-8 text-g1000-cyan" />
              </div>
              <h3 className="text-g1000-white font-bold tracking-widest text-sm mb-2">FLIGHT SIMULATOR</h3>
              <p className="text-[10px] text-zinc-500 font-mono leading-relaxed uppercase">
                  Remote Sim Link Active.<br/>
                  View full simulation on main display.
              </p>
          </div>
      );
  }

  // Main View - Full Screen Overlay
  // Using 100dvh for height to handle mobile browser toolbars correctly
  return (
    <div 
        className="fixed inset-0 w-screen h-[100dvh] bg-black z-[5000] flex flex-col animate-fade-in overflow-hidden"
        onMouseEnter={() => setShowExit(true)}
        onMouseLeave={() => setShowExit(false)}
        onTouchStart={() => setShowExit(true)}
    >
        {/* Loader */}
        {!iframeLoaded && (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-black pointer-events-none">
                <div className="flex flex-col items-center gap-4 animate-pulse">
                    <div className="w-16 h-16 border-4 border-t-g1000-cyan border-r-transparent border-b-g1000-cyan border-l-transparent rounded-full animate-spin"></div>
                    <div className="text-g1000-cyan font-mono text-sm tracking-[0.3em]">INITIALIZING SIMULATOR...</div>
                </div>
            </div>
        )}

        {/* The External App */}
        <iframe 
            src={EXTERNAL_URL}
            onLoad={() => setIframeLoaded(true)}
            className={`absolute inset-0 w-full h-[100dvh] border-none z-10 bg-black transition-opacity duration-700 ease-in ${iframeLoaded ? 'opacity-100' : 'opacity-0'}`}
            title="WingMentor Simulator"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; camera; microphone; geolocation; fullscreen"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-presentation allow-top-navigation-by-user-activation"
        />

        {/* Exit Button - More accessible on mobile */}
        <div className={`absolute top-0 left-0 w-full h-24 z-50 transition-opacity duration-300 ${showExit ? 'opacity-100' : 'opacity-0'} pointer-events-none`}>
            <div className="absolute top-4 right-4 pointer-events-auto">
                <button 
                    onClick={() => onExit ? onExit() : window.location.reload()} 
                    className="bg-red-900/90 hover:bg-red-600 text-white px-5 py-3 md:px-4 md:py-2 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md border border-white/20 flex items-center gap-2 transition-all shadow-xl"
                >
                    <X className="w-4 h-4" /> Exit Simulator
                </button>
            </div>
        </div>
    </div>
  );
};

export default SimulatorRoom;