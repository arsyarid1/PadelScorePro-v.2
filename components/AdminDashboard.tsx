import React, { useState, useEffect } from 'react';
import { tournamentService } from '../services/tournamentService';
import { Tournament, RefereeSession } from '../types';
import { ScoreBroadcast } from '../lib/supabase';
import { supabase } from '../lib/supabase';

interface AdminDashboardProps {
  tournament: Tournament;
  onExit: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ tournament, onExit }) => {
  const [referees, setReferees] = useState<RefereeSession[]>([]);
  const [liveScores, setLiveScores] = useState<{ [courtId: number]: ScoreBroadcast }>({});
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const presenceChannel = supabase.channel(`presence:${tournament.id}`);
    
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const activeReferees: RefereeSession[] = Object.values(state).flat() as any;
        setReferees(activeReferees);
      })
      .subscribe();

    const cleanup = tournamentService.subscribe(
      tournament.id,
      (score) => {
        setLiveScores(prev => ({ ...prev, [score.courtId]: score }));
        setLogs(prev => [`Court ${score.courtId}: ${score.teamA.score} - ${score.teamB.score}`, ...prev].slice(0, 10));
      },
      () => {}
    );

    return () => {
      presenceChannel.unsubscribe();
      cleanup();
    };
  }, [tournament.id]);

  const handleKick = (courtId: number, deviceId: string) => {
    tournamentService.broadcastSessionEvent(tournament.id, {
      type: 'KICK',
      targetCourt: courtId,
      deviceId: deviceId
    });
  };

  const handleKickAll = () => {
    if (confirm('Are you sure you want to reset all referee sessions?')) {
      tournamentService.broadcastSessionEvent(tournament.id, {
        type: 'KICK_ALL'
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background-dark text-white font-display overflow-hidden">
      <header className="p-6 border-b border-white/5 flex justify-between items-center bg-surface/50 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-black uppercase italic tracking-tighter text-primary">Command Center</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{tournament.name}</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleKickAll}
            className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
          >
            Kick All
          </button>
          <button onClick={onExit} className="size-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-all group">
            <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">arrow_back</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Court Monitor */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Court Monitor</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: tournament.courts }).map((_, i) => {
              const courtId = i + 1;
              const score = liveScores[courtId];
              const referee = referees.find(r => r.courtId === courtId);
              
              return (
                <div key={courtId} className="bg-surface border border-white/5 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-black text-primary">Court {courtId}</span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${referee ? 'bg-green-500/20 text-green-500' : 'bg-slate-500/20 text-slate-500'}`}>
                      {referee ? 'Active' : 'Idle'}
                    </span>
                  </div>
                  
                  <div className="flex justify-center items-center gap-4 py-4">
                    <span className="text-4xl font-black">{score?.teamA.score ?? 0}</span>
                    <span className="text-slate-500 font-black italic">VS</span>
                    <span className="text-4xl font-black">{score?.teamB.score ?? 0}</span>
                  </div>

                  {referee && (
                    <div className="pt-4 border-t border-white/5 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Referee</span>
                        <span className="text-[10px] font-black text-white">{referee.refereeName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Device</span>
                        <span className="text-[8px] text-slate-500 truncate max-w-[150px]">{referee.browserInfo}</span>
                      </div>
                      <button 
                        onClick={() => handleKick(courtId, referee.deviceId)}
                        className="w-full mt-2 py-2 bg-red-500/10 text-red-500 text-[8px] font-black uppercase tracking-widest rounded-md hover:bg-red-500 hover:text-white transition-all"
                      >
                        Kick Referee
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Logs */}
        <div className="space-y-6">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Live Activity</h3>
          <div className="bg-background-dark border border-white/5 rounded-2xl p-4 h-[600px] overflow-y-auto font-mono text-[10px] space-y-2">
            {logs.length === 0 ? (
              <p className="text-slate-600 italic">No activity yet...</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="flex gap-2 text-slate-400">
                  <span className="text-primary opacity-50">[{new Date().toLocaleTimeString()}]</span>
                  <span>{log}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
