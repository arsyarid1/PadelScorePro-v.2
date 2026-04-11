import React, { useState, useEffect } from 'react';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { tournamentService } from '../services/tournamentService';
import { Tournament, Match, Player } from '../types';
import { ScoreBroadcast } from '../lib/supabase';

interface RefereeViewProps {
  tournament: Tournament;
  courtId: number;
  onUpdateScore: (mId: string, a: any, b: any, status: 'live' | 'finished', ga?: number, gb?: number, sa?: number, sb?: number) => void;
  onExit: () => void;
}

const RefereeView: React.FC<RefereeViewProps> = ({ tournament, courtId, onUpdateScore, onExit }) => {
  const [refereeName, setRefereeName] = useState(localStorage.getItem('referee_name') || '');
  const [isJoined, setIsJoined] = useState(false);
  const [isKicked, setIsKicked] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [match, setMatch] = useState<Match | null>(null);
  const [history, setHistory] = useState<Match[]>([]);
  const lastClickTime = React.useRef<number>(0);

  useEffect(() => {
    const initFingerprint = async () => {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      setDeviceId(result.visitorId);
    };
    initFingerprint();
  }, []);

  useEffect(() => {
    const currentMatch = tournament.matches.find(m => m.court === courtId && (m.status === 'live' || m.status === 'finished'));
    setMatch(currentMatch || null);
  }, [tournament.matches, courtId]);

  useEffect(() => {
    if (isJoined && deviceId) {
      const cleanup = tournamentService.subscribe(
        tournament.id,
        (scoreUpdate) => {
          if (scoreUpdate.courtId === courtId) {
            setMatch(prev => {
              if (!prev || prev.id !== scoreUpdate.matchId) return prev;
              return { 
                ...prev, 
                teamA: scoreUpdate.teamA, 
                teamB: scoreUpdate.teamB,
                status: scoreUpdate.status as any
              };
            });
          }
        },
        (event) => {
          if (event.type === 'KICK_ALL') {
            setIsJoined(false);
            setIsKicked(true);
          } else if (event.type === 'KICK' && event.targetCourt === courtId && event.deviceId !== deviceId) {
            setIsJoined(false);
            alert('Your session has been terminated by an administrator or another device.');
          }
        }
      );

      const presence = tournamentService.trackPresence(tournament.id, {
        refereeName,
        deviceId,
        courtId,
        browserInfo: navigator.userAgent,
        lastActive: Date.now(),
      });

      return () => {
        cleanup();
        presence.unsubscribe();
      };
    }
  }, [isJoined, deviceId, tournament.id, courtId, refereeName]);

  const handleJoin = () => {
    if (!refereeName.trim()) return;
    localStorage.setItem('referee_name', refereeName);
    setIsJoined(true);
    
    // Broadcast initial join to kick others
    tournamentService.broadcastSessionEvent(tournament.id, {
      type: 'KICK',
      targetCourt: courtId,
      deviceId: deviceId
    });
  };

  const updateScore = (team: 'A' | 'B') => {
    if (!match) return;
    
    // Debounce
    const now = Date.now();
    if (now - lastClickTime.current < 500) return;
    lastClickTime.current = now;

    if (match.status === 'finished') return;

    // Save history for undo
    setHistory(prev => [...prev, JSON.parse(JSON.stringify(match))]);

    const nextMatch = JSON.parse(JSON.stringify(match)) as Match;
    const teamKey = team === 'A' ? 'teamA' : 'teamB';
    const oppKey = team === 'A' ? 'teamB' : 'teamA';
    
    const isRally = tournament.scoring === 'Rally Points';
    const isCustom = tournament.scoring === 'Custom Match';
    const maxPoints = tournament.maxPoints || 21;

    let matchFinished = false;

    if (isRally) {
      nextMatch[teamKey].score++;
      if (nextMatch.teamA.score + nextMatch.teamB.score >= maxPoints) {
        matchFinished = true;
      }
    } else if (isCustom) {
      // Custom Match logic (Race to / Best of)
      nextMatch[teamKey].score++;
      // In Custom Match, score is usually games
      if (tournament.customMatchType === 'Race to') {
        if (nextMatch[teamKey].score >= maxPoints) matchFinished = true;
      } else {
        if (nextMatch.teamA.score + nextMatch.teamB.score >= maxPoints) matchFinished = true;
      }
    } else {
      // Tennis / Tournament Pro logic
      const tennisPoints = [0, 15, 30, 40, 'Ad'];
      
      if (nextMatch.isTieBreak) {
        nextMatch[teamKey].score = (nextMatch[teamKey].score as number) + 1;
        if ((nextMatch[teamKey].score as number) >= 7 && ((nextMatch[teamKey].score as number) - (nextMatch[oppKey].score as number)) >= 2) {
          nextMatch[teamKey].games++;
          nextMatch.isTieBreak = false;
          nextMatch.teamA.score = 0;
          nextMatch.teamB.score = 0;
          matchFinished = checkSetWin(nextMatch, teamKey, oppKey);
        }
      } else {
        const currentScore = nextMatch[teamKey].score;
        const oppScore = nextMatch[oppKey].score;

        if (currentScore === 0) nextMatch[teamKey].score = 15;
        else if (currentScore === 15) nextMatch[teamKey].score = 30;
        else if (currentScore === 30) nextMatch[teamKey].score = 40;
        else if (currentScore === 40) {
          if (oppScore === 40) {
            if (tournament.tennisRule === 'Golden Point') {
              nextMatch[teamKey].games++;
              nextMatch.teamA.score = 0;
              nextMatch.teamB.score = 0;
              matchFinished = checkSetWin(nextMatch, teamKey, oppKey);
            } else {
              nextMatch[teamKey].score = 'Ad';
            }
          } else if (oppScore === 'Ad') {
            nextMatch[oppKey].score = 40;
          } else {
            nextMatch[teamKey].games++;
            nextMatch.teamA.score = 0;
            nextMatch.teamB.score = 0;
            matchFinished = checkSetWin(nextMatch, teamKey, oppKey);
          }
        } else if (currentScore === 'Ad') {
          nextMatch[teamKey].games++;
          nextMatch.teamA.score = 0;
          nextMatch.teamB.score = 0;
          matchFinished = checkSetWin(nextMatch, teamKey, oppKey);
        }
      }
    }

    const status = matchFinished ? 'finished' : 'live';
    if (matchFinished) nextMatch.status = 'finished';

    // Broadcast update
    tournamentService.broadcastScore(tournament.id, {
      matchId: match.id,
      courtId: courtId,
      teamA: nextMatch.teamA,
      teamB: nextMatch.teamB,
      server: nextMatch.server || 'A',
      isTieBreak: nextMatch.isTieBreak || false,
      status: status,
      lastUpdate: Date.now()
    });

    setMatch(nextMatch);
  };

  const checkSetWin = (m: Match, teamKey: 'teamA' | 'teamB', oppKey: 'teamA' | 'teamB'): boolean => {
    if (m[teamKey].games >= 6 && (m[teamKey].games - m[oppKey].games) >= 2) {
      m[teamKey].sets++;
      m.teamA.games = 0;
      m.teamB.games = 0;
      if (m[teamKey].sets >= 2) return true;
    } else if (m.teamA.games === 6 && m.teamB.games === 6) {
      m.isTieBreak = true;
    }
    return false;
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setMatch(prev);
    setHistory(prevHist => prevHist.slice(0, -1));

    tournamentService.broadcastScore(tournament.id, {
      matchId: prev.id,
      courtId: courtId,
      teamA: prev.teamA,
      teamB: prev.teamB,
      server: prev.server || 'A',
      isTieBreak: prev.isTieBreak || false,
      status: prev.status as any,
      lastUpdate: Date.now()
    });
  };

  const handleFinish = () => {
    if (!match) return;
    onUpdateScore(match.id, match.teamA.score, match.teamB.score, 'finished');
    
    // Final broadcast
    tournamentService.broadcastScore(tournament.id, {
      matchId: match.id,
      courtId: courtId,
      teamA: match.teamA,
      teamB: match.teamB,
      server: 'A',
      isTieBreak: false,
      status: 'finished',
      lastUpdate: Date.now()
    });

    // Clear session and exit
    onExit();
  };

  const isRally = tournament.scoring === 'Rally Points';
  const maxPoints = tournament.maxPoints || 21;
  const isMatchFinished = match?.status === 'finished' || (isRally && match && (match.teamA.score + match.teamB.score >= maxPoints));

  if (isKicked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background-dark text-white text-center">
        <div className="size-24 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-6 animate-pulse">
          <span className="material-symbols-outlined text-6xl">cancel</span>
        </div>
        <h2 className="text-3xl font-black uppercase italic mb-2">Turnamen Berakhir</h2>
        <p className="text-slate-400 mb-8 max-w-xs">Turnamen ini telah berakhir. Terima kasih atas partisipasi Anda!</p>
        <button 
          onClick={onExit}
          className="w-full max-w-xs h-16 bg-primary text-background-dark font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20"
        >
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  if (!isJoined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background-dark text-white">
        <div className="w-full max-w-md space-y-8 bg-surface p-8 rounded-3xl border border-primary/20">
          <div className="text-center">
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-primary">Court {courtId}</h1>
            <p className="text-slate-400 mt-2">Enter your name to start refereeing</p>
          </div>
          <div className="space-y-4">
            <input
              type="text"
              value={refereeName}
              onChange={(e) => setRefereeName(e.target.value)}
              placeholder="Referee Name"
              className="w-full h-14 bg-background-dark border border-white/10 rounded-xl px-6 text-white font-bold focus:border-primary transition-all"
            />
            <button
              onClick={handleJoin}
              disabled={!refereeName.trim()}
              className="w-full h-14 bg-primary text-background-dark font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              Join Session
            </button>
            <button onClick={onExit} className="w-full text-slate-500 font-bold uppercase text-xs tracking-widest">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background-dark text-white font-display">
      <header className="p-6 border-b border-white/5 flex justify-between items-center bg-surface/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={onExit} className="size-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black uppercase italic text-primary">Court {courtId}</h2>
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20 font-black uppercase">Live Controller</span>
            </div>
            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-1">{tournament.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleUndo}
            disabled={history.length === 0}
            className={`size-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 transition-all ${history.length === 0 ? 'opacity-20' : 'active:scale-95 hover:bg-white/10'}`}
          >
            <span className="material-symbols-outlined text-sm">undo</span>
          </button>
          <button onClick={() => setIsJoined(false)} className="text-xs font-bold text-red-500 uppercase tracking-widest bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20">
            Leave
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto">
        {!match ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
            <div className="size-20 rounded-full bg-white/5 flex items-center justify-center text-slate-600">
              <span className="material-symbols-outlined text-5xl">event_busy</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">No Active Match</h3>
              <p className="text-slate-500 text-sm max-w-xs mx-auto mt-2">Tidak ada jadwal pertandingan aktif di Lapangan ini.</p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-white/5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              Refresh Status
            </button>
          </div>
        ) : match.status === 'finished' ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
            <div className="size-24 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-bounce">
              <span className="material-symbols-outlined text-6xl">emoji_events</span>
            </div>
            <div>
              <h3 className="text-2xl font-black uppercase italic text-white">Match Finished</h3>
              <p className="text-slate-400 text-sm mt-2">Pertandingan di Lapangan {courtId} telah selesai.</p>
            </div>
            <div className="bg-surface p-6 rounded-2xl border border-white/5 w-full max-w-xs">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black uppercase text-slate-500">Final Score</span>
                <span className="text-[10px] font-black uppercase text-primary">Verified</span>
              </div>
              <div className="flex justify-around items-center gap-4">
                <div className="flex-1 text-center">
                  <div className="text-3xl font-black text-white">{match.teamA.score}</div>
                  <div className="text-[8px] uppercase text-slate-500 mt-1 line-clamp-2">
                    {match.teamA.playerIds.map(id => tournament.players.find(p => p.id === id)?.name.split(' ')[0]).join(' / ')}
                  </div>
                </div>
                <div className="text-xl font-black text-primary italic">VS</div>
                <div className="flex-1 text-center">
                  <div className="text-3xl font-black text-white">{match.teamB.score}</div>
                  <div className="text-[8px] uppercase text-slate-500 mt-1 line-clamp-2">
                    {match.teamB.playerIds.map(id => tournament.players.find(p => p.id === id)?.name.split(' ')[0]).join(' / ')}
                  </div>
                </div>
              </div>
            </div>
            <button 
              onClick={onExit}
              className="w-full max-w-xs h-16 bg-primary text-background-dark font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20"
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 grid grid-cols-1 gap-4">
              <button 
                onClick={() => updateScore('A')}
                disabled={match.status === 'finished'}
                className={`bg-surface border-2 rounded-3xl flex flex-col items-center justify-center active:scale-95 transition-all relative overflow-hidden ${match.status === 'finished' ? 'border-white/5 opacity-50' : 'border-primary/20'}`}
              >
                <div className="absolute top-4 left-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Team A</div>
                <div className="flex flex-col items-center">
                  {!isRally && (
                    <div className="flex gap-4 mb-2">
                      <div className="text-center">
                        <div className="text-[8px] uppercase text-slate-500">Sets</div>
                        <div className="text-xl font-black text-primary">{match.teamA.sets || 0}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[8px] uppercase text-slate-500">Games</div>
                        <div className="text-xl font-black">{match.teamA.games || 0}</div>
                      </div>
                    </div>
                  )}
                  <span className={`text-8xl font-black ${match.status === 'finished' && match.teamA.score > match.teamB.score ? 'text-primary' : 'text-white'}`}>
                    {match.isTieBreak ? match.teamA.score : (tournament.scoring === 'Tournament Pro' ? ([0, 15, 30, 40, 'ADV'][match.teamA.score as any] || match.teamA.score) : match.teamA.score)}
                  </span>
                </div>
              </button>
              <button 
                onClick={() => updateScore('B')}
                disabled={match.status === 'finished'}
                className={`bg-surface border-2 rounded-3xl flex flex-col items-center justify-center active:scale-95 transition-all relative overflow-hidden ${match.status === 'finished' ? 'border-white/5 opacity-50' : 'border-primary/20'}`}
              >
                <div className="absolute top-4 left-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Team B</div>
                <div className="flex flex-col items-center">
                  {!isRally && (
                    <div className="flex gap-4 mb-2">
                      <div className="text-center">
                        <div className="text-[8px] uppercase text-slate-500">Sets</div>
                        <div className="text-xl font-black text-primary">{match.teamB.sets || 0}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[8px] uppercase text-slate-500">Games</div>
                        <div className="text-xl font-black">{match.teamB.games || 0}</div>
                      </div>
                    </div>
                  )}
                  <span className={`text-8xl font-black ${match.status === 'finished' && match.teamB.score > match.teamA.score ? 'text-primary' : 'text-white'}`}>
                    {match.isTieBreak ? match.teamB.score : (tournament.scoring === 'Tournament Pro' ? ([0, 15, 30, 40, 'ADV'][match.teamB.score as any] || match.teamB.score) : match.teamB.score)}
                  </span>
                </div>
              </button>
            </div>
            <button 
              onClick={handleFinish}
              className={`h-20 font-black uppercase tracking-widest rounded-2xl shadow-lg transition-all ${isMatchFinished ? 'bg-primary text-background-dark shadow-primary/30 animate-pulse' : 'bg-red-500 text-white shadow-red-500/20'}`}
            >
              {isMatchFinished ? 'Confirm & Finish Match' : 'Match Finished'}
            </button>
          </>
        )}
      </main>
    </div>
  );
};

export default RefereeView;
