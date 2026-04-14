
import React, { useState, useEffect, useMemo } from 'react';
import { Tournament, MatchState, Player } from '../types';

// Letakkan di bagian atas file, di bawah baris import
if (typeof window !== 'undefined') {
  const debugDiv = document.createElement('div');
  debugDiv.id = 'remote-debug-portal';
  debugDiv.style.cssText = "position:fixed;top:10px;right:10px;z-index:999999;background:#000;color:#0f0;padding:15px;border:2px solid #0f0;font-family:monospace;font-size:14px;pointer-events:none;";
  debugDiv.innerText = "Sinyal: Menunggu...";
  document.body.appendChild(debugDiv);

  window.addEventListener('keydown', (e) => {
    const el = document.getElementById('remote-debug-portal');
    if (el) {
      el.innerText = `Key: ${e.key} | Code: ${e.code}`;
      el.style.background = '#030'; // Berkedip hijau saat ada sinyal
      setTimeout(() => { if(el) el.style.background = '#000'; }, 100);
    }
    
    // Coba blokir volume secara agresif di sini
    if (e.key === 'VolumeUp' || e.key === 'AudioVolumeUp') {
      e.preventDefault();
    }
  }, { capture: true });
}

interface LiveScoreboardProps {
  tournament: Tournament;
  onUpdateScore: (
    matchId: string, 
    teamAScore: any, 
    teamBScore: any, 
    status: 'live' | 'finished',
    teamAGames?: number,
    teamBGames?: number,
    teamASets?: number,
    teamBSets?: number
  ) => void;
  onEndMatch: () => void;
  onNextMatch?: () => void;
  onExit?: () => void;
}

const Confetti = () => {
  const particles = useMemo(() => {
    return Array.from({ length: 100 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 3}s`,
      color: ['#00ffcc', '#ffffff', '#ff0066', '#ffcc00', '#0099ff'][Math.floor(Math.random() * 5)],
      duration: `${2 + Math.random() * 3}s`,
      size: `${Math.random() * 10 + 5}px`,
      rotate: `${Math.random() * 360}deg`,
    }));
  }, []);

    // Script Debugging Mandiri (Tanpa Inspect.dev)
useEffect(() => {
  const debugElement = document.createElement('div');
  debugElement.style.cssText = "position:fixed; bottom:10px; right:10px; z-index:9999; background:rgba(0,0,0,0.8); color:#00ffcc; padding:10px; border-radius:8px; font-family:monospace; font-size:12px; border:1px solid #00ffcc;";
  debugElement.innerHTML = "Remote Status: Waiting...";
  document.body.appendChild(debugElement);

  const handleAnyKey = (e: KeyboardEvent) => {
    // Menampilkan nama tombol di layar iPad
    debugElement.innerHTML = `Key: ${e.key} <br> Code: ${e.code}`;
    console.log(e.key);
    
    // Jika Anda ingin langsung tes preventDefault
    if (e.key === 'VolumeUp' || e.key === 'AudioVolumeUp') {
      e.preventDefault();
      debugElement.style.borderColor = "red"; // Berubah merah jika sistem dicegah
    }
  };

  window.addEventListener('keydown', handleAnyKey, { capture: true });
  return () => {
    window.removeEventListener('keydown', handleAnyKey, { capture: true });
    document.body.removeChild(debugElement);
  };
}, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
      {particles.map(p => (
        <div
          key={p.id}
          className="confetti-particle animate-confetti"
          style={{
            left: p.left,
            backgroundColor: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
            width: p.size,
            height: p.size,
            transform: `rotate(${p.rotate})`,
          }}
        />
      ))}
    </div>
  );
};

const LiveScoreboard: React.FC<LiveScoreboardProps> = ({ tournament, onUpdateScore, onEndMatch, onNextMatch, onExit }) => {
  const isRally = tournament.scoring === 'Rally Points';
  const liveMatch = tournament.matches.find(m => m.id === tournament.currentMatchId) || tournament.matches[tournament.matches.length - 1];
  
  const [match, setMatch] = useState<MatchState>({
    teamA: { 
      players: liveMatch.teamA.playerIds, 
      score: liveMatch.teamA.score || 0, 
      games: liveMatch.teamA.games || 0,
      sets: liveMatch.teamA.sets || 0,
      totalGames: liveMatch.teamA.games || 0
    },
    teamB: { 
      players: liveMatch.teamB.playerIds, 
      score: liveMatch.teamB.score || 0, 
      games: liveMatch.teamB.games || 0,
      sets: liveMatch.teamB.sets || 0,
      totalGames: liveMatch.teamB.games || 0
    },
    server: 'A',
    time: 0,
    isTieBreak: false
  });

  const [history, setHistory] = useState<MatchState[]>([]);
  const [flash, setFlash] = useState<{ team: 'A' | 'B' | null, color: 'green' | 'red' }>({ team: null, color: 'green' });
  const [isFinished, setIsFinished] = useState(liveMatch.status === 'finished');
  const lastClickTime = React.useRef<number>(0);

  // Reset state when match changes (e.g. Next Match)
  useEffect(() => {
    setMatch({
      teamA: { 
        players: liveMatch.teamA.playerIds, 
        score: liveMatch.teamA.score || 0, 
        games: liveMatch.teamA.games || 0,
        sets: liveMatch.teamA.sets || 0,
        totalGames: liveMatch.teamA.games || 0
      },
      teamB: { 
        players: liveMatch.teamB.playerIds, 
        score: liveMatch.teamB.score || 0, 
        games: liveMatch.teamB.games || 0,
        sets: liveMatch.teamB.sets || 0,
        totalGames: liveMatch.teamB.games || 0
      },
      server: 'A',
      time: 0,
      isTieBreak: false
    });
    setIsFinished(liveMatch.status === 'finished');
    setHistory([]);
  }, [liveMatch.id]);

  // Sync scores and state from props (for remote viewing/stadium view)
  useEffect(() => {
    setMatch(prev => ({
      ...prev,
      teamA: { 
        ...prev.teamA, 
        score: liveMatch.teamA.score || 0,
        games: liveMatch.teamA.games || 0,
        sets: liveMatch.teamA.sets || 0,
        totalGames: liveMatch.teamA.games || 0
      },
      teamB: { 
        ...prev.teamB, 
        score: liveMatch.teamB.score || 0,
        games: liveMatch.teamB.games || 0,
        sets: liveMatch.teamB.sets || 0,
        totalGames: liveMatch.teamB.games || 0
      },
      isTieBreak: liveMatch.isTieBreak || false,
      server: liveMatch.server || 'A'
    }));
    if (liveMatch.status === 'finished') setIsFinished(true);
    else setIsFinished(false);
  }, [
    liveMatch.teamA.score, 
    liveMatch.teamB.score, 
    liveMatch.teamA.games, 
    liveMatch.teamB.games, 
    liveMatch.teamA.sets, 
    liveMatch.teamB.sets, 
    liveMatch.status,
    liveMatch.isTieBreak,
    liveMatch.server
  ]);

  useEffect(() => {
    if (isFinished) return;
    const interval = setInterval(() => {
      setMatch(prev => ({ ...prev, time: prev.time + 1 }));
    }, 1000);
    return () => clearInterval(interval);
  }, [isFinished]);

  useEffect(() => {
    if (isFinished && onNextMatch) {
      const timer = setTimeout(() => {
        onNextMatch(); 
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isFinished, onNextMatch]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const tennisPoints = ['0', '15', '30', '40', 'Ad'];

  const getPointsDisplay = (score: any, teamSets: number, team: 'A' | 'B') => {
    if (isFinished) {
      return isRally ? score : (tournament.scoring === 'Custom Match' ? match[team === 'A' ? 'teamA' : 'teamB'].games : teamSets);
    }
    if (isRally || match.isTieBreak) return score;
    if (typeof score === 'number' && score >= 0 && score < tennisPoints.length) {
      const mapped = tennisPoints[score];
      return mapped === 'Ad' ? 'ADV' : mapped;
    }
    return score === 'Ad' ? 'ADV' : score;
  };

  const addPoint = (team: 'A' | 'B', e?: React.MouseEvent | KeyboardEvent) => {
    if (e && 'stopPropagation' in e) e.stopPropagation();
    
    const now = Date.now();
    if (e && 'type' in e && e.type === 'click') {
      if (now - lastClickTime.current < 500) return;
      lastClickTime.current = now;
    }

    if (isFinished) return;

    if (tournament.isCloud) {
      console.log("Manual scoring disabled for cloud tournaments. Use referee view.");
      return;
    }

    setMatch(prev => {
      // 1. Save history
      setHistory(h => [...h, JSON.parse(JSON.stringify(prev))]);
      
      // 2. Visual feedback
      setFlash({ team, color: 'green' });
      setTimeout(() => setFlash({ team: null, color: 'green' }), 300);

      // 3. Calculate next state
      const next = JSON.parse(JSON.stringify(prev)) as MatchState;
      const teamKey = team === 'A' ? 'teamA' : 'teamB';
      const oppKey = team === 'A' ? 'teamB' : 'teamA';
      let nextFinished = false;

      if (isRally) {
        next[teamKey].score += 1;
        next[teamKey].totalGames += 1;
        if (next.teamA.score + next.teamB.score >= tournament.maxPoints) {
          nextFinished = true;
        }
      } else {
        if (next.isTieBreak) {
          next[teamKey].score += 1;
          if (next[teamKey].score >= 7 && (next[teamKey].score - next[oppKey].score) >= 2) {
            next[teamKey].games += 1;
            next[teamKey].totalGames += 1;
            nextFinished = checkWinner(next, teamKey, oppKey);
          }
        } else {
          if (next[teamKey].score < 3) {
            next[teamKey].score += 1;
          } else if (next[teamKey].score === 3) {
            if (next[oppKey].score === 3) {
              if (tournament.tennisRule === 'Golden Point') {
                next[teamKey].games += 1;
                next[teamKey].totalGames += 1;
                nextFinished = checkWinner(next, teamKey, oppKey);
              } else {
                next[teamKey].score = 'Ad';
              }
            } else if (next[oppKey].score === 'Ad') {
              next[oppKey].score = 3; 
            } else {
              next[teamKey].games += 1;
              next[teamKey].totalGames += 1;
              nextFinished = checkWinner(next, teamKey, oppKey);
            }
          } else if (next[teamKey].score === 'Ad') {
            next[teamKey].games += 1;
            next[teamKey].totalGames += 1;
            nextFinished = checkWinner(next, teamKey, oppKey);
          }
        }
      }

      if (nextFinished) setIsFinished(true);
      
      // 5. Update parent state
      onUpdateScore(
        liveMatch.id, 
        next.teamA.score, 
        next.teamB.score, 
        nextFinished ? 'finished' : 'live',
        next.teamA.totalGames,
        next.teamB.totalGames,
        next.teamA.sets,
        next.teamB.sets
      );

      return next;
    });
  };

  const checkWinner = (next: MatchState, teamKey: 'teamA' | 'teamB', oppKey: 'teamA' | 'teamB'): boolean => {
    if (tournament.scoring === 'Custom Match') {
      const totalGames = next.teamA.games + next.teamB.games;
      const majority = Math.floor(tournament.maxPoints / 2) + 1;

      if (tournament.customMatchType === 'Race to') {
        if (next[teamKey].games >= tournament.maxPoints) {
          next.teamA.score = 0;
          next.teamB.score = 0;
          return true;
        }
      } else if (tournament.customMatchType === 'Best of') {
        // Fixed Games logic: only end when total games reach maxPoints
        if (totalGames >= tournament.maxPoints) {
          next.teamA.score = 0;
          next.teamB.score = 0;
          return true;
        }
      }
      
      // Reset points for next game if not finished
      next.teamA.score = 0;
      next.teamB.score = 0;
      next.isTieBreak = false;
      return false;
    } else {
      // Tournament Pro (Sets)
      return checkGameWinLogic(next, teamKey, oppKey);
    }
  };

  const checkGameWinLogic = (next: MatchState, teamKey: 'teamA' | 'teamB', oppKey: 'teamA' | 'teamB'): boolean => {
    next.teamA.score = 0;
    next.teamB.score = 0;
    next.isTieBreak = false;

    if (next[teamKey].games >= 6 && (next[teamKey].games - next[oppKey].games) >= 2) {
      return checkSetWinLogic(next, teamKey, oppKey);
    } else if (next.teamA.games === 6 && next.teamB.games === 6) {
      next.isTieBreak = true;
    }
    return false;
  };

  const checkSetWinLogic = (next: MatchState, teamKey: 'teamA' | 'teamB', oppKey: 'teamA' | 'teamB'): boolean => {
    next[teamKey].sets += 1;
    
    if (next[teamKey].sets === 2) {
      return true;
    } else {
      next.teamA.games = 0;
      next.teamB.games = 0;
      next.teamA.score = 0;
      next.teamB.score = 0;
      next.isTieBreak = false;
      return false;
    }
  };

  const undo = (e?: React.MouseEvent | KeyboardEvent) => {
    if (e && 'stopPropagation' in e) e.stopPropagation();
    
    setHistory(prevHistory => {
      if (prevHistory.length === 0) return prevHistory;
      
      const lastState = prevHistory[prevHistory.length - 1];
      setMatch(lastState);
      setIsFinished(false);

      // Update parent after undo
      onUpdateScore(
        liveMatch.id, 
        lastState.teamA.score, 
        lastState.teamB.score, 
        'live',
        lastState.teamA.totalGames,
        lastState.teamB.totalGames,
        lastState.teamA.sets,
        lastState.teamB.sets
      );

      return prevHistory.slice(0, -1);
    });
  };

  const clickCount = React.useRef<number>(0);
  const clickTimer = React.useRef<NodeJS.Timeout | null>(null);
  const longPressTimer = React.useRef<NodeJS.Timeout | null>(null);
  const isLongPressActive = React.useRef<boolean>(false);

  useEffect(() => {
    const handleRemoteKey = (e: KeyboardEvent) => {
      const isVolumeUp = e.key === 'VolumeUp' || e.key === 'AudioVolumeUp';
      if (!isVolumeUp) return;

      // Block system behavior immediately
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isVolumeUp = e.key === 'VolumeUp' || e.key === 'AudioVolumeUp';
      if (!isVolumeUp) return;

      handleRemoteKey(e);
      if (e.repeat) return;

      isLongPressActive.current = false;
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      
      longPressTimer.current = setTimeout(() => {
        isLongPressActive.current = true;
        undo();
        if (window.navigator && window.navigator.vibrate) {
          window.navigator.vibrate(100);
        }
      }, 1000);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const isVolumeUp = e.key === 'VolumeUp' || e.key === 'AudioVolumeUp';
      if (!isVolumeUp) return;

      handleRemoteKey(e);

      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }

      if (isLongPressActive.current) return;

      clickCount.current += 1;
      if (clickTimer.current) clearTimeout(clickTimer.current);

      clickTimer.current = setTimeout(() => {
        if (clickCount.current === 1) {
          addPoint('A');
        } else if (clickCount.current >= 2) {
          addPoint('B');
        }
        clickCount.current = 0;
        clickTimer.current = null;
      }, 300);
    };

    // Use capture: true to intercept events before system/other listeners
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
      if (clickTimer.current) clearTimeout(clickTimer.current);
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, [isFinished, liveMatch.id]); // Re-bind if match changes to ensure fresh closures

  const getPlayer = (id: string) => tournament.players.find(p => p.id === id);
  
  const winner = isRally 
    ? (match.teamA.score > match.teamB.score ? 'A' : (match.teamA.score < match.teamB.score ? 'B' : null))
    : (tournament.scoring === 'Custom Match' 
        ? (match.teamA.games > match.teamB.games ? 'A' : (match.teamA.games < match.teamB.games ? 'B' : null))
        : (match.teamA.sets >= 2 ? 'A' : (match.teamB.sets >= 2 ? 'B' : null)));

  return (
    <div className="flex flex-col h-screen w-full bg-background-dark font-display text-white overflow-hidden select-none">
      <header className="flex items-center justify-between border-b border-primary/10 px-4 md:px-8 py-3 md:py-4 bg-background-dark z-50">
        <div className="flex items-center gap-2 md:gap-4">
          {onExit && (
            <button onClick={onExit} className="size-8 md:size-10 flex items-center justify-center rounded-lg md:rounded-xl bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors">
              <span className="material-symbols-outlined text-sm md:text-base">home</span>
            </button>
          )}
          <button onClick={onEndMatch} className="size-8 md:size-10 flex items-center justify-center rounded-lg md:rounded-xl bg-surface border border-primary/20 hover:bg-primary/20 transition-colors">
            <span className="material-symbols-outlined text-sm md:text-base">analytics</span>
          </button>
          <div>
            <h2 className="text-sm md:text-xl font-bold tracking-tight uppercase italic leading-none">{tournament.name}</h2>
            <p className="text-[8px] md:text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wider">
              {tournament.type} • {tournament.scoring}{tournament.customMatchType ? ` (${tournament.customMatchType} ${tournament.maxPoints})` : ''}
              {(tournament.type === 'Americano Fix' || tournament.type === 'Mexicano Fix' || tournament.type === 'Club Fix Americano') && (
                <span className="ml-2 text-primary font-bold border border-primary/30 px-1.5 py-0.5 rounded">Fixed Partner</span>
              )}
              {tournament.type.startsWith('Club') && (
                <span className="ml-2 text-blue-400 font-bold border border-blue-400/30 px-1.5 py-0.5 rounded">Club Match</span>
              )}
            </p>
            <p className="text-[8px] md:text-[10px] text-primary tracking-[0.1em] md:tracking-[0.2em] font-bold opacity-70 mt-1">
              {match.isTieBreak ? 'TIE-BREAK' : isFinished ? 'MATCH OVER' : (tournament.scoring === 'Custom Match' ? (tournament.customMatchType === 'Best of' ? `GAME ${match.teamA.games + match.teamB.games + 1} OF ${tournament.maxPoints}` : `${(tournament.customMatchType || '').toUpperCase()} ${tournament.maxPoints}`) : `ROUND ${liveMatch.round}`)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 md:gap-6">
          <div className="flex flex-col items-center">
            <span className="text-[8px] md:text-[10px] uppercase tracking-widest text-white/50">Time</span>
            <span className="text-sm md:text-xl font-mono font-bold tracking-tighter">{formatTime(match.time)}</span>
          </div>
          <button 
            onClick={undo} 
            disabled={history.length === 0} 
            className={`flex h-8 md:h-12 px-3 md:px-6 items-center gap-2 rounded-lg md:rounded-xl bg-surface border border-primary/20 hover:bg-primary/20 transition-colors ${history.length === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            <span className="material-symbols-outlined text-sm">undo</span>
            <span className="font-bold uppercase text-[10px] md:text-xs tracking-widest hidden sm:inline">Undo</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row w-full relative overflow-hidden">
        {isFinished && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-background-dark/80 backdrop-blur-md animate-in fade-in duration-500">
            <div className="max-w-lg w-full p-8 md:p-12 rounded-[2.5rem] bg-surface border-2 border-primary/30 shadow-[0_0_100px_rgba(0,255,204,0.3)] flex flex-col items-center text-center scale-in-center">
              <div className="size-24 md:size-32 rounded-full bg-primary/20 flex items-center justify-center mb-6 md:mb-8 animate-bounce">
                <span className="material-symbols-outlined text-5xl md:text-7xl text-primary">emoji_events</span>
              </div>
              <h2 className="text-3xl md:text-6xl font-black uppercase tracking-tighter text-white mb-2">
                {winner ? `Team ${winner} Wins!` : "It's a Draw!"}
              </h2>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs md:text-sm mb-8 md:mb-12">
                Final Score: {match.teamA.games} - {match.teamB.games}
              </p>
              
              <div className="flex flex-col w-full gap-4">
                <button 
                  onClick={onNextMatch || onEndMatch}
                  className="w-full h-16 md:h-20 bg-primary text-background-dark rounded-2xl font-black uppercase tracking-widest text-lg md:text-xl shadow-[0_10px_40px_rgba(0,255,204,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Next Match
                </button>
                <button 
                  onClick={onEndMatch}
                  className="w-full h-12 md:h-14 border-2 border-white/10 text-white/50 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-white/5 transition-all"
                >
                  Back to Leaderboard
                </button>
              </div>
            </div>
            <Confetti />
          </div>
        )}

        {/* Team A Section */}
        <div 
          onClick={(e) => addPoint('A', e)}
          className={`flex-1 flex flex-col p-4 md:p-6 gap-2 md:gap-6 border-b md:border-b-0 md:border-r border-primary/10 transition-all duration-300 relative
            ${!isFinished ? 'cursor-pointer active:bg-white/[0.05] hover:bg-white/[0.02]' : 'pointer-events-none'}
            ${flash.team === 'A' ? 'bg-green-500/20' : ''}`}
        >
          {isFinished && (winner === 'A' || winner === null) && <Confetti />}
          <div className="flex items-center justify-between px-4 md:px-6 py-2 md:py-4 rounded-xl bg-surface/50 border border-primary/5">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="flex items-center">
                <div className="size-10 md:size-16 rounded-full bg-cover bg-center border-2 border-primary/40 shadow-xl" style={{ backgroundImage: `url('${getPlayer(match.teamA.players[0])?.avatarUrl}')` }}></div>
                <div className="size-10 md:size-16 rounded-full bg-cover bg-center border-2 border-primary/40 -ml-5 md:-ml-8 shadow-xl" style={{ backgroundImage: `url('${getPlayer(match.teamA.players[1])?.avatarUrl}')` }}></div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm md:text-4xl font-bold uppercase tracking-tight line-clamp-1">
                    {getPlayer(match.teamA.players[0])?.name.split(' ')[0]} / {getPlayer(match.teamA.players[1])?.name.split(' ')[0]}
                  </h3>
                  {tournament.type.startsWith('Club') && (
                    <span className="text-[10px] md:text-xl bg-white/10 text-slate-400 px-2 py-0.5 rounded font-black uppercase tracking-tighter">
                      {tournament.clubs?.find(c => c.id === getPlayer(match.teamA.players[0])?.clubId)?.name.substring(0, 3)}
                    </span>
                  )}
                </div>
                <span className="text-[8px] md:text-[10px] text-primary font-bold uppercase tracking-widest">Team A</span>
              </div>
            </div>
            {!isRally && (
              <div className="flex gap-3 md:gap-6">
                {tournament.scoring === 'Tournament Pro' && (
                  <div className="text-right">
                    <span className="text-[8px] md:text-[10px] uppercase text-white/40 block">Sets</span>
                    <span className="text-lg md:text-4xl font-black text-primary">{match.teamA.sets}</span>
                  </div>
                )}
                <div className="text-right">
                  <span className="text-[8px] md:text-[10px] uppercase text-white/40 block">Games</span>
                  <span className="text-lg md:text-4xl font-black">{match.teamA.games}</span>
                </div>
              </div>
            )}
          </div>
          <div className={`flex-1 flex flex-col items-center justify-center transition-all ${isFinished && winner === 'A' ? 'animate-winner text-primary' : ''}`}>
            {isFinished && winner === 'A' && (
              <span className="text-xl md:text-4xl font-black uppercase tracking-[0.2em] md:tracking-[0.4em] mb-2 md:mb-4 text-primary animate-pulse">Winner</span>
            )}
            <span className="text-[8rem] sm:text-[12rem] md:text-[20rem] lg:text-[25rem] font-black leading-none tracking-tighter drop-shadow-2xl">
              {getPointsDisplay(match.teamA.score, match.teamA.sets, 'A')}
            </span>
          </div>
        </div>

        {/* VS Indicator */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none opacity-20 md:opacity-50">
          <div className="text-4xl md:text-8xl font-black italic text-primary/10 tracking-tighter">VS</div>
        </div>

        {/* Team B Section */}
        <div 
          onClick={(e) => addPoint('B', e)}
          className={`flex-1 flex flex-col p-4 md:p-6 gap-2 md:gap-6 transition-all duration-300 relative
            ${!isFinished ? 'cursor-pointer active:bg-white/[0.05] hover:bg-white/[0.02]' : 'pointer-events-none'}
            ${flash.team === 'B' ? 'bg-green-500/20' : ''}`}
        >
          {isFinished && (winner === 'B' || winner === null) && <Confetti />}
          <div className="flex items-center justify-between px-4 md:px-6 py-2 md:py-4 rounded-xl bg-surface/50 border border-primary/5">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="flex items-center">
                <div className="size-10 md:size-16 rounded-full bg-cover bg-center border-2 border-primary/40 shadow-xl" style={{ backgroundImage: `url('${getPlayer(match.teamB.players[0])?.avatarUrl}')` }}></div>
                <div className="size-10 md:size-16 rounded-full bg-cover bg-center border-2 border-primary/40 -ml-5 md:-ml-8 shadow-xl" style={{ backgroundImage: `url('${getPlayer(match.teamB.players[1])?.avatarUrl}')` }}></div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm md:text-4xl font-bold uppercase tracking-tight line-clamp-1">
                    {getPlayer(match.teamB.players[0])?.name.split(' ')[0]} / {getPlayer(match.teamB.players[1])?.name.split(' ')[0]}
                  </h3>
                  {tournament.type.startsWith('Club') && (
                    <span className="text-[10px] md:text-xl bg-white/10 text-slate-400 px-2 py-0.5 rounded font-black uppercase tracking-tighter">
                      {tournament.clubs?.find(c => c.id === getPlayer(match.teamB.players[0])?.clubId)?.name.substring(0, 3)}
                    </span>
                  )}
                </div>
                <span className="text-[8px] md:text-[10px] text-primary font-bold uppercase tracking-widest">Team B</span>
              </div>
            </div>
            {!isRally && (
              <div className="flex gap-3 md:gap-6">
                {tournament.scoring === 'Tournament Pro' && (
                  <div className="text-right">
                    <span className="text-[8px] md:text-[10px] uppercase text-white/40 block">Sets</span>
                    <span className="text-lg md:text-4xl font-black text-primary">{match.teamB.sets}</span>
                  </div>
                )}
                <div className="text-right">
                  <span className="text-[8px] md:text-[10px] uppercase text-white/40 block">Games</span>
                  <span className="text-lg md:text-4xl font-black">{match.teamB.games}</span>
                </div>
              </div>
            )}
          </div>
          <div className={`flex-1 flex flex-col items-center justify-center transition-all ${isFinished && winner === 'B' ? 'animate-winner text-primary' : ''}`}>
            {isFinished && winner === 'B' && (
              <span className="text-xl md:text-4xl font-black uppercase tracking-[0.2em] md:tracking-[0.4em] mb-2 md:mb-4 text-primary animate-pulse">Winner</span>
            )}
            <span className="text-[8rem] sm:text-[12rem] md:text-[20rem] lg:text-[25rem] font-black leading-none tracking-tighter drop-shadow-2xl">
              {getPointsDisplay(match.teamB.score, match.teamB.sets, 'B')}
            </span>
          </div>
        </div>
      </main>

      <footer className="bg-background-dark border-t border-primary/10 p-4 md:p-8 flex items-center justify-center">
        {isFinished ? (
          <button 
            onClick={onNextMatch || onEndMatch}
            className="h-12 md:h-20 px-8 md:px-16 bg-primary text-background-dark rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-sm md:text-xl shadow-[0_0_40px_rgba(0,255,204,0.5)] hover:scale-105 active:scale-95 transition-all animate-pulse"
          >
            {winner ? `TEAM ${winner} WINS - FINISH` : (match.teamA.games === match.teamB.games ? 'DRAW - FINISH' : 'FINISH MATCH')}
          </button>
        ) : (
          <button 
            onClick={() => {
              setIsFinished(true);
              onUpdateScore(
                liveMatch.id, 
                match.teamA.score, 
                match.teamB.score, 
                'finished',
                match.teamA.totalGames,
                match.teamB.totalGames,
                match.teamA.sets,
                match.teamB.sets
              );
            }}
            className="h-12 md:h-20 px-8 md:px-16 bg-red-500 text-white rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-sm md:text-xl shadow-[0_0_40px_rgba(239,68,68,0.3)] hover:scale-105 active:scale-95 transition-all"
          >
            Finish Match
          </button>
        )}
      </footer>
    </div>
  );
};

export default LiveScoreboard;
