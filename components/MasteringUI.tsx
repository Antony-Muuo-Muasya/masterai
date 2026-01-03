
import React from 'react';
import { MasteringIntensity, OutputTarget, MasteringState } from '../types';

interface Props {
  state: MasteringState;
  onIntensityChange: (i: MasteringIntensity) => void;
  onTargetChange: (t: OutputTarget) => void;
  onBypassToggle: () => void;
}

const MasteringUI: React.FC<Props> = ({ state, onIntensityChange, onTargetChange, onBypassToggle }) => {
  return (
    <div className="space-y-8">
      {/* Intensity Selector */}
      <div>
        <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-4 block">Mastering Intensity</label>
        <div className="grid grid-cols-3 gap-4">
          {Object.values(MasteringIntensity).map((intensity) => (
            <button
              key={intensity}
              onClick={() => onIntensityChange(intensity)}
              className={`py-3 px-4 rounded-lg border transition-all text-sm font-medium ${
                state.intensity === intensity 
                  ? 'bg-purple-600/20 border-purple-500 text-purple-100' 
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              {intensity}
            </button>
          ))}
        </div>
      </div>

      {/* Target Selector */}
      <div>
        <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-4 block">Output Optimization</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.values(OutputTarget).map((target) => (
            <button
              key={target}
              onClick={() => onTargetChange(target)}
              className={`py-3 px-2 rounded-lg border transition-all text-xs font-bold ${
                state.target === target 
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-100' 
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              {target}
            </button>
          ))}
        </div>
      </div>

      {/* Bypass Toggle */}
      <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
        <div className="flex flex-col">
          <span className="text-sm font-semibold">Mastering Bypass</span>
          <span className="text-xs text-zinc-500">Compare original vs mastered audio</span>
        </div>
        <button
          onClick={onBypassToggle}
          className={`w-14 h-8 rounded-full transition-colors relative ${state.isBypass ? 'bg-zinc-700' : 'bg-purple-600'}`}
        >
          <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${state.isBypass ? 'left-1' : 'left-7'}`} />
        </button>
      </div>
      
      {/* AI Insights Card */}
      {state.sonicProfile && (
        <div className="p-6 bg-purple-900/10 border border-purple-500/20 rounded-2xl">
          <h3 className="text-purple-400 font-bold text-sm mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z"/></svg>
            AI SONIC INSIGHTS
          </h3>
          <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-xs">
            <div>
              <span className="text-zinc-500 block mb-1">DETECTED GENRE</span>
              <span className="font-mono text-zinc-200">{state.sonicProfile.genre}</span>
            </div>
            <div>
              <span className="text-zinc-500 block mb-1">NATIVE LOUDNESS</span>
              <span className="font-mono text-zinc-200">{state.sonicProfile.lufs} LUFS</span>
            </div>
            <div>
              <span className="text-zinc-500 block mb-1">DYNAMICS RANGE</span>
              <span className="font-mono text-zinc-200">{state.sonicProfile.dynamics}</span>
            </div>
            <div>
              <span className="text-zinc-500 block mb-1">STEREO WIDTH</span>
              <span className="font-mono text-zinc-200">{state.sonicProfile.suggestedWidening.toFixed(2)}x</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasteringUI;
