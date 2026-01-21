import React, { useState } from 'react';
import { Book, X } from 'lucide-react';

interface ProgramHandbookProps {
    selectedChapterId?: string | number | null;
    onSelectChapter?: (id: string | number) => void;
    isMini?: boolean;
    onExit?: () => void;
}

const ProgramHandbook: React.FC<ProgramHandbookProps> = ({ isMini = false, onExit }) => {
  const EXTERNAL_URL = "https://programhandbook.vercel.app/";
  const [showExit, setShowExit] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // For the Mini MFD view (Side Panel)
  if (isMini) {
      return (
          <div className="h-full w-full bg-black border-r border-white/20 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
              <div className="w-16 h-16 rounded-full border-2 border-g1000-cyan flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(0,255,255,0.2)] bg-g1000-cyan/10">
                  <Book className="w-8 h-8 text-g1000-cyan" />
              </div>
              <h3 className="text-g1000-white font-bold tracking-widest text-sm mb-2">TRAINING HANDBOOK</h3>
              <p className="text-[10px] text-zinc-500 font-mono leading-relaxed uppercase">
                  Digital Syllabus Active.<br/>
                  Open main view to access study materials.
              </p>
          </div>
      );
  }

  // Main View - Full Screen Overlay (Simulating Redirect)
  // Using fixed inset-0 z-[5000] to cover ALL App UI including headers and nav bars
  return (
    <div 
        className="fixed inset-0 w-screen h-screen bg-black z-[5000] flex flex-col animate-fade-in"
        onMouseEnter={() => setShowExit(true)}
        onMouseLeave={() => setShowExit(false)}
    >
        {/* Loader / Placeholder behind iframe - Only removed once iframe reports load */}
        {!iframeLoaded && (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-black pointer-events-none">
                <div className="flex flex-col items-center gap-4 animate-pulse">
                    <div className="w-16 h-16 border-4 border-t-white border-r-transparent border-b-white border-l-transparent rounded-full animate-spin"></div>
                    <div className="text-white font-mono text-sm tracking-[0.3em]">LOADING SYLLABUS CONTENT...</div>
                </div>
            </div>
        )}

        {/* The External App - Hidden until loaded */}
        <iframe 
            src={EXTERNAL_URL}
            onLoad={() => setIframeLoaded(true)}
            className={`absolute inset-0 w-full h-full border-none z-10 bg-black transition-opacity duration-700 ease-in ${iframeLoaded ? 'opacity-100' : 'opacity-0'}`}
            title="WingMentor Handbook"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; camera; microphone; geolocation"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-presentation allow-top-navigation-by-user-activation"
        />

        {/* Emergency Exit Button (Hidden unless hovered at top) */}
        <div className={`absolute top-0 left-0 w-full h-16 z-50 transition-opacity duration-300 ${showExit ? 'opacity-100' : 'opacity-0'} pointer-events-none`}>
            <div className="absolute top-4 right-4 pointer-events-auto">
                <button 
                    onClick={() => onExit ? onExit() : window.location.reload()} // Use callback if available
                    className="bg-zinc-900/80 hover:bg-zinc-700 text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md border border-white/10 flex items-center gap-2 transition-all shadow-lg"
                >
                    <X className="w-4 h-4" /> Close Handbook
                </button>
            </div>
        </div>
    </div>
  );
};

export default ProgramHandbook;