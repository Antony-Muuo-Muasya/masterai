
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MasteringIntensity, OutputTarget, MasteringState, SonicProfile } from './types';
import { MasteringEngine } from './services/audioEngine';
import { analyzeTrackProfile } from './services/geminiService';
import MasteringUI from './components/MasteringUI';
import WaveformVisualizer from './components/WaveformVisualizer';

const App: React.FC = () => {
  const [state, setState] = useState<MasteringState>({
    file: null,
    status: 'idle',
    intensity: MasteringIntensity.MEDIUM,
    target: OutputTarget.STREAMING,
    isBypass: false,
    sonicProfile: null
  });
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const audioEngine = useRef<MasteringEngine | null>(null);

  useEffect(() => {
    audioEngine.current = new MasteringEngine();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !audioEngine.current) return;

    if (isPlaying) {
      audioEngine.current.stop();
      setIsPlaying(false);
    }

    setState(prev => ({ ...prev, file, status: 'analyzing', isBypass: false, sonicProfile: null }));
    
    try {
      // Step 1: Analyze Sonic Profile via Gemini
      const profile = await analyzeTrackProfile(file.name, file.size);
      
      // Step 2: Load into Audio Engine
      await audioEngine.current.loadFile(file);
      
      // Apply initial profile parameters
      audioEngine.current.updateParameters(state.intensity, state.target, false);
      
      setState(prev => ({ 
        ...prev, 
        status: 'ready', 
        sonicProfile: profile 
      }));
    } catch (error) {
      console.error("Mastering failed", error);
      setState(prev => ({ ...prev, status: 'idle' }));
      alert("Failed to process audio. Please try a different file.");
    }
  };

  const togglePlay = async () => {
    if (!audioEngine.current || state.status !== 'ready') return;

    if (audioEngine.current.getState() === 'suspended') {
      await audioEngine.current.resume();
    }

    if (isPlaying) {
      audioEngine.current.stop();
      setIsPlaying(false);
    } else {
      audioEngine.current.play();
      setIsPlaying(true);
    }
  };

  const updateSettings = useCallback((updates: Partial<MasteringState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      if (audioEngine.current) {
        audioEngine.current.updateParameters(newState.intensity, newState.target, newState.isBypass);
      }
      return newState;
    });
  }, [state.intensity, state.target, state.isBypass]);

  const downloadMaster = async () => {
    if (!audioEngine.current || isExporting) return;
    
    setIsExporting(true);
    try {
      const blob = await audioEngine.current.exportMaster();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MasterAI_${state.file?.name?.split('.')[0] || 'track'}_${state.target}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed", error);
      alert("Failed to export master.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="p-6 flex justify-between items-center border-b border-zinc-900 glass sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/></svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight">MasterAI <span className="text-zinc-500 font-normal">v2.5</span></h1>
        </div>
        
        {state.status === 'ready' && (
          <button 
            onClick={downloadMaster}
            disabled={isExporting}
            className={`bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-full text-sm font-bold transition-all shadow-lg shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Rendering...
              </>
            ) : 'Export Master'}
          </button>
        )}
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Visualizer & Controls */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 min-h-[400px] flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none" />
            
            {state.status === 'idle' ? (
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 p-6 rounded-full bg-zinc-800 border-2 border-dashed border-zinc-700 group-hover:border-purple-500/50 transition-colors">
                  <svg className="w-12 h-12 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                </div>
                <h2 className="text-2xl font-bold mb-2">Drop your track here</h2>
                <p className="text-zinc-500 text-sm max-w-xs mb-8">Professional AI mastering for WAV and MP3 files up to 100MB.</p>
                <input 
                  type="file" 
                  accept="audio/*" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  id="audio-upload"
                />
                <label 
                  htmlFor="audio-upload"
                  className="bg-white text-black px-8 py-3 rounded-full font-bold cursor-pointer hover:bg-zinc-200 transition-colors"
                >
                  Browse Files
                </label>
              </div>
            ) : state.status === 'analyzing' ? (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-6" />
                <h3 className="text-xl font-bold">Sonic Analysis in Progress...</h3>
                <p className="text-zinc-500 animate-pulse mt-2">Gemini is mapping your frequency spectrum</p>
              </div>
            ) : (
              <div className="relative z-10 w-full h-full flex flex-col items-center">
                <div className="flex justify-between w-full mb-12">
                   <div className="space-y-1">
                      <p className="text-xs uppercase text-zinc-500 font-bold tracking-widest">Now Mastering</p>
                      <h4 className="text-lg font-mono truncate max-w-[200px] sm:max-w-md">{state.file?.name}</h4>
                   </div>
                   <div className="text-right">
                      <p className="text-xs uppercase text-zinc-500 font-bold tracking-widest">Status</p>
                      <span className="text-emerald-400 font-mono text-xs flex items-center gap-1">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" /> ENGINE ACTIVE
                      </span>
                   </div>
                </div>

                {/* Main Visualizer Area */}
                <div className="w-full bg-zinc-950/50 rounded-2xl border border-zinc-800 p-6 h-48 mb-8">
                  <WaveformVisualizer 
                    analyzer={audioEngine.current?.getAnalyzer() || null} 
                    isPlaying={isPlaying} 
                    color={state.isBypass ? "#52525b" : "#a855f7"}
                  />
                </div>

                {/* Comparison Bar */}
                <div className="w-full flex justify-between items-center bg-zinc-800/50 rounded-full p-2 mb-8">
                  <button 
                    onClick={() => updateSettings({ isBypass: true })}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${state.isBypass ? 'bg-zinc-700 text-white shadow-inner' : 'text-zinc-500 hover:text-zinc-300'}`}>Original</button>
                  <div className="flex-1 h-px bg-zinc-700 mx-4" />
                  <button 
                    onClick={() => updateSettings({ isBypass: false })}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${!state.isBypass ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40' : 'text-zinc-500 hover:text-zinc-300'}`}>AI Mastered</button>
                </div>

                <button 
                  onClick={togglePlay}
                  className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-transform shadow-2xl"
                >
                  {isPlaying ? (
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  ) : (
                    <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Settings */}
        <div className="lg:col-span-5">
          <div className="glass rounded-3xl p-8 space-y-8 sticky top-28">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
              Mastering Console
            </h2>
            
            <MasteringUI 
              state={state} 
              onIntensityChange={(i) => updateSettings({ intensity: i })}
              onTargetChange={(t) => updateSettings({ target: t })}
              onBypassToggle={() => updateSettings({ isBypass: !state.isBypass })}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-8 text-center text-zinc-600 text-xs border-t border-zinc-900 mt-12">
        <p>&copy; 2024 MasterAI Pro. Powered by Gemini Flash 3.0 Real-time Audio Processing.</p>
        <div className="flex justify-center gap-6 mt-4">
          <a href="#" className="hover:text-zinc-300 transition-colors">Documentation</a>
          <a href="#" className="hover:text-zinc-300 transition-colors">API Keys</a>
          <a href="#" className="hover:text-zinc-300 transition-colors">Support</a>
        </div>
      </footer>
    </div>
  );
};

export default App;
