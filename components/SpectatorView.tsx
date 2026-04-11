import React, { useState, useEffect } from 'react';
import { tournamentService } from '../services/tournamentService';
import { Tournament } from '../types';
import { ScoreBroadcast } from '../lib/supabase';

interface SpectatorViewProps {
  tournament: Tournament;
  onExit: () => void;
}

const SpectatorView: React.FC<SpectatorViewProps> = ({ tournament, onExit }) => {
  const [liveScores, setLiveScores] = useState<{ [courtId: number]: ScoreBroadcast }>({});
  const [isKicked, setIsKicked] = useState(false);

  useEffect(() => {
    const cleanup = tournamentService.subscribe(
      tournament.id,
      (score) => {
        setLiveScores(prev => ({ ...prev, [score.courtId]: score }));
      },
      (event) => {
        if (event.type === 'KICK_ALL') {
          setIsKicked(true);
        }
      }
    );

    return () => cleanup();
  }, [tournament.id]);

  if (isKicked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background-dark text-white text-center">
        <div className="size-24 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6 animate-pulse">
          <span className="material-symbols-outlined text-6xl">sports_tennis</span>
        </div>
        <h2 className="text-3xl font-black uppercase italic mb-2">Turnamen Berakhir</h2>
        <p className="text-slate-400 mb-8 max-w-xs">Turnamen ini telah berakhir. Terima kasih telah menonton!</p>
        <button 
          onClick={onExit}
          className="w-full max-w-xs h-16 bg-primary text-background-dark font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20"
        >
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background-dark text-white font-display overflow-hidden">
      <header className="p-6 border-b border-white/5 flex justify-between items-center bg-surface/50 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-black uppercase italic tracking-tighter text-primary">Live Match</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{tournament.name}</p>
        </div>
        <button onClick={onExit} className="size-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-all group">
          <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">arrow_back</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: tournament.courts }).map((_, i) => {
            const courtId = i + 1;
            const score = liveScores[courtId];
            const match = tournament.matches.find(m => m.court === courtId && (m.status === 'live' || m.status === 'finished'));
            
            const getPlayerNames = (ids: string[]) => {
              return ids.map(id => tournament.players.find(p => p.id === id)?.name || 'Unknown').join(' / ');
            };

            const teamANames = match ? getPlayerNames(match.teamA.playerIds) : 'Team A';
            const teamBNames = match ? getPlayerNames(match.teamB.playerIds) : 'Team B';

            return (
              <div key={courtId} className="bg-surface border border-white/5 rounded-3xl p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4">
                  <span className="text-[10px] font-black text-primary/30 uppercase tracking-[0.2em]">Court {courtId}</span>
                </div>
                
                <div className="flex flex-col items-center gap-8">
                  {/* Team A */}
                  <div className="text-center space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest line-clamp-1 px-2">
                      {teamANames}
                    </p>
                    <span className="text-7xl font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                      {score?.teamA.score ?? 0}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 w-full">
                    <div className="h-px flex-1 bg-white/5"></div>
                    <span className="text-lg font-black italic text-primary">VS</span>
                    <div className="h-px flex-1 bg-white/5"></div>
                  </div>

                  {/* Team B */}
                  <div className="text-center space-y-2">
                    <span className="text-7xl font-black text-primary drop-shadow-[0_0_20px_rgba(0,255,204,0.2)]">
                      {score?.teamB.score ?? 0}
                    </span>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest line-clamp-1 px-2">
                      {teamBNames}
                    </p>
                  </div>
                </div>

                {score?.status === 'finished' && (
                  <div className="absolute inset-0 bg-primary/90 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-500">
                    <div className="text-center">
                      <span className="material-symbols-outlined text-background-dark text-6xl">emoji_events</span>
                      <h3 className="text-2xl font-black text-background-dark uppercase italic tracking-tighter mt-2">Match Finished</h3>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      <footer className="p-4 border-t border-white/5 bg-background-dark/50 flex justify-center">
        <p className="text-[8px] text-slate-600 font-black uppercase tracking-[0.5em]">Real-time Broadcaster Active</p>
      </footer>
    </div>
  );
};

export default SpectatorView;
