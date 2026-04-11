import React, { useState } from 'react';

interface ShortcodeEntryProps {
  onEnter: (shortcode: string) => void;
  onBack?: () => void;
}

const ShortcodeEntry: React.FC<ShortcodeEntryProps> = ({ onEnter, onBack }) => {
  const [shortcode, setShortcode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (shortcode.length >= 4) {
      onEnter(shortcode.toUpperCase());
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-background-dark text-white font-display overflow-y-auto relative">
      {onBack && (
        <button 
          onClick={onBack}
          className="absolute top-8 left-8 size-12 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 transition-all group"
        >
          <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">arrow_back</span>
        </button>
      )}
      <div className="w-full max-w-md space-y-12 text-center">
        <div className="space-y-4">
          <div className="size-20 bg-primary/20 rounded-3xl flex items-center justify-center mx-auto animate-pulse">
            <span className="material-symbols-outlined text-4xl text-primary">sensors</span>
          </div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">Live Match</h1>
          <p className="text-slate-400 font-medium">Enter the tournament shortcode to view live scores</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="text"
            value={shortcode}
            onChange={(e) => setShortcode(e.target.value.toUpperCase())}
            placeholder="E.G. PADEL24"
            maxLength={20}
            className="w-full h-20 bg-surface border-2 border-white/5 rounded-3xl px-8 text-3xl font-black text-center text-white tracking-[0.2em] focus:border-primary transition-all placeholder:text-white/10"
          />
          <button
            type="submit"
            disabled={shortcode.length < 4}
            className="w-full h-16 bg-primary text-background-dark font-black uppercase tracking-widest rounded-2xl shadow-[0_10px_40px_rgba(0,255,204,0.3)] disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
          >
            Connect to Live Feed
          </button>
        </form>

        <div className="pt-12 border-t border-white/5">
          <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.3em]">Padel Score Pro • Tournament Mode</p>
        </div>
      </div>
    </div>
  );
};

export default ShortcodeEntry;
