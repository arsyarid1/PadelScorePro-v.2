
import React, { useMemo, useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Tournament, Match, Player, TennisRule, MatchState } from '../types';

interface MultiCourtScoreboardProps {
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
  onNextMatch: () => void;
  onExit?: () => void;
}

const Confetti = () => {
  const particles = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 2}s`,
      color: ['#00ffcc', '#ffffff', '#ff0066', '#ffcc00', '#0099ff'][Math.floor(Math.random() * 5)],
      duration: `${1.5 + Math.random() * 2}s`,
      size: `${Math.random() * 8 + 4}px`,
      rotate: `${Math.random() * 360}deg`,
    }));
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

const ScoreEntryModal: React.FC<{
  match: Match;
  tournament: Tournament;
  onClose: () => void;
  onConfirm: (
    id: string, 
    a: any, 
    b: any, 
    status: 'live' | 'finished',
    ga?: number,
    gb?: number,
    sa?: number,
    sb?: number
  ) => void;
}> = ({ match, tournament, onClose, onConfirm }) => {
  const isRally = tournament.scoring === 'Rally Points';
  const isCustom = tournament.scoring === 'Custom Match';
  const targetScore = tournament.maxPoints || 21;
  const [scoreA, setScoreA] = useState<any>(match.teamA.score || 0);
  const [scoreB, setScoreB] = useState<any>(match.teamB.score || 0);
  
  const [setsA, setSetsA] = useState(match.teamA.sets || 0);
  const [setsB, setSetsB] = useState(match.teamB.sets || 0);
  const [gamesA, setGamesA] = useState(match.teamA.games || 0);
  const [gamesB, setGamesB] = useState(match.teamB.games || 0);
  const [totalGamesA, setTotalGamesA] = useState(match.teamA.games || 0);
  const [totalGamesB, setTotalGamesB] = useState(match.teamB.games || 0);
  const [isTieBreak, setIsTieBreak] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const getPlayerName = (id: string) => tournament.players.find(p => p.id === id)?.name || 'Unknown';
  const teamAPlayers = match.teamA.playerIds.map(getPlayerName).join(' / ');
  const teamBPlayers = match.teamB.playerIds.map(getPlayerName).join(' / ');

  const tennisPoints = ['0', '15', '30', '40', 'Ad'];

  const isFinished = isRally 
    ? (scoreA + scoreB >= targetScore)
    : (isCustom 
        ? (tournament.customMatchType === 'Race to' 
            ? (gamesA >= tournament.maxPoints || gamesB >= tournament.maxPoints)
            : (gamesA + gamesB >= tournament.maxPoints))
        : (setsA >= 2 || setsB >= 2));

  const handleRallyChange = (team: 'A' | 'B', value: number) => {
    if (isFinished) return;
    if (team === 'A') {
      setScoreA(value);
      setTotalGamesA(value);
      const bVal = Math.max(0, targetScore - value);
      setScoreB(bVal);
      setTotalGamesB(bVal);
    } else {
      setScoreB(value);
      setTotalGamesB(value);
      const aVal = Math.max(0, targetScore - value);
      setScoreA(aVal);
      setTotalGamesA(aVal);
    }
  };

  const handleTennisPoint = (team: 'A' | 'B') => {
    if (isFinished) return;
    const currentState = { scoreA, scoreB, gamesA, gamesB, setsA, setsB, totalGamesA, totalGamesB, isTieBreak };
    setHistory(prev => [...prev, currentState]);

    let nextA = scoreA;
    let nextB = scoreB;
    let nextGA = gamesA;
    let nextGB = gamesB;
    let nextSA = setsA;
    let nextSB = setsB;
    let nextTB = isTieBreak;

    if (nextTB) {
      if (team === 'A') nextA++; else nextB++;
      if (nextA >= 7 && (nextA - nextB) >= 2) {
        if (team === 'A') {
          nextGA++;
          setTotalGamesA(prev => prev + 1);
        } else {
          nextGB++;
          setTotalGamesB(prev => prev + 1);
        }
        nextA = 0; nextB = 0; nextTB = false;
        setHistory([]);
      } else if (nextB >= 7 && (nextB - nextA) >= 2) {
        if (team === 'B') {
          nextGB++;
          setTotalGamesB(prev => prev + 1);
        } else {
          nextGA++;
          setTotalGamesA(prev => prev + 1);
        }
        nextA = 0; nextB = 0; nextTB = false;
        setHistory([]);
      }
    } else {
      const teamVal = team === 'A' ? nextA : nextB;
      const oppVal = team === 'A' ? nextB : nextA;

      if (teamVal < 3) {
        if (team === 'A') nextA++; else nextB++;
      } else if (teamVal === 3) {
        if (oppVal === 3) {
          if (tournament.tennisRule === 'Golden Point') {
            if (team === 'A') {
              nextGA++;
              setTotalGamesA(prev => prev + 1);
            } else {
              nextGB++;
              setTotalGamesB(prev => prev + 1);
            }
            nextA = 0; nextB = 0;
            setHistory([]);
          } else {
            if (team === 'A') nextA = 'Ad'; else nextB = 'Ad';
          }
        } else if (oppVal === 'Ad') {
          if (team === 'A') nextB = 3; else nextA = 3;
        } else {
          if (team === 'A') {
            nextGA++;
            setTotalGamesA(prev => prev + 1);
          } else {
            nextGB++;
            setTotalGamesB(prev => prev + 1);
          }
          nextA = 0; nextB = 0;
          setHistory([]);
        }
      } else if (teamVal === 'Ad') {
        if (team === 'A') {
          nextGA++;
          setTotalGamesA(prev => prev + 1);
        } else {
          nextGB++;
          setTotalGamesB(prev => prev + 1);
        }
        nextA = 0; nextB = 0;
        setHistory([]);
      }
    }

    if (tournament.scoring === 'Tournament Pro') {
      if (nextGA >= 6 && (nextGA - nextGB) >= 2) {
        nextSA++; nextGA = 0; nextGB = 0;
      } else if (nextGB >= 6 && (nextGB - nextGA) >= 2) {
        nextSB++; nextGA = 0; nextGB = 0;
      } else if (nextGA === 6 && nextGB === 6) {
        nextTB = true; nextA = 0; nextB = 0;
      }
    }

    setScoreA(nextA); setScoreB(nextB);
    setGamesA(nextGA); setGamesB(nextGB);
    setSetsA(nextSA); setSetsB(nextSB);
    setIsTieBreak(nextTB);
  };

  const handleTennisUndo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setScoreA(last.scoreA); setScoreB(last.scoreB);
    setGamesA(last.gamesA); setGamesB(last.gamesB);
    setSetsA(last.setsA); setSetsB(last.setsB);
    setTotalGamesA(last.totalGamesA); setTotalGamesB(last.totalGamesB);
    setIsTieBreak(last.isTieBreak);
    setHistory(prev => prev.slice(0, -1));
  };

  const finalize = () => {
    onConfirm(
      match.id, 
      scoreA, 
      scoreB, 
      'finished',
      totalGamesA,
      totalGamesB,
      setsA,
      setsB
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6 bg-background-dark/95 backdrop-blur-xl animate-in fade-in zoom-in duration-300">
      <div className="w-full max-w-2xl bg-surface-dark border border-primary/20 rounded-[1.5rem] md:rounded-[2.5rem] shadow-[0_0_100px_rgba(0,255,204,0.1)] overflow-hidden flex flex-col max-h-[90dvh]">
        <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-white">Score Control</h2>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">Court {match.court} Admin</p>
          </div>
          <button onClick={onClose} className="size-10 md:size-12 rounded-xl md:rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 md:p-10 flex-1 overflow-y-auto custom-scrollbar">
          {isRally ? (
            <div className="space-y-8 md:space-y-12">
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Target Score</label>
                <div className="w-full h-12 md:h-14 bg-background-dark/50 border border-white/5 rounded-xl md:rounded-2xl px-4 md:px-6 flex items-center text-slate-400 font-bold text-sm select-none opacity-70">
                  {targetScore} Points (Locked)
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 md:gap-12">
                <div className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Team A</label>
                    <p className="text-[13px] font-semibold text-slate-300 line-clamp-1">{teamAPlayers}</p>
                  </div>
                  <select 
                    value={scoreA}
                    onChange={(e) => handleRallyChange('A', parseInt(e.target.value))}
                    className="w-full h-16 md:h-24 bg-background-dark border-primary/30 rounded-2xl md:rounded-3xl text-3xl md:text-5xl font-black text-center text-white appearance-none"
                  >
                    {Array.from({ length: targetScore + 1 }).map((_, i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Team B</label>
                    <p className="text-[13px] font-semibold text-slate-300 line-clamp-1">{teamBPlayers}</p>
                  </div>
                  <select 
                    value={scoreB}
                    onChange={(e) => handleRallyChange('B', parseInt(e.target.value))}
                    className="w-full h-16 md:h-24 bg-background-dark border-primary/30 rounded-2xl md:rounded-3xl text-3xl md:text-5xl font-black text-center text-white appearance-none"
                  >
                    {Array.from({ length: targetScore + 1 }).map((_, i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 md:space-y-8">
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="bg-background-dark p-4 md:p-6 rounded-2xl md:rounded-3xl border border-white/5 flex flex-col items-center">
                  <span className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase">Team A</span>
                  <p className="text-[13px] font-semibold text-slate-300 mb-2 md:mb-4 text-center line-clamp-1">{teamAPlayers}</p>
                  <span className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase mb-2">
                    {tournament.scoring === 'Tournament Pro' ? 'Sets Won' : 'Games Won'}
                  </span>
                  <span className="text-4xl md:text-6xl font-black text-white">
                    {tournament.scoring === 'Tournament Pro' ? setsA : gamesA}
                  </span>
                </div>
                <div className="bg-background-dark p-4 md:p-6 rounded-2xl md:rounded-3xl border border-white/5 flex flex-col items-center">
                  <span className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase">Team B</span>
                  <p className="text-[13px] font-semibold text-slate-300 mb-2 md:mb-4 text-center line-clamp-1">{teamBPlayers}</p>
                  <span className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase mb-2">
                    {tournament.scoring === 'Tournament Pro' ? 'Sets Won' : 'Games Won'}
                  </span>
                  <span className="text-4xl md:text-6xl font-black text-white">
                    {tournament.scoring === 'Tournament Pro' ? setsB : gamesB}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 md:gap-6">
                 <button 
                  onClick={() => handleTennisPoint('A')}
                  disabled={isFinished}
                  className={`bg-primary/10 border-2 border-primary/20 rounded-2xl md:rounded-[2rem] h-24 md:h-48 flex flex-col items-center justify-center transition-all group ${isFinished ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
                 >
                    <span className="text-3xl md:text-6xl font-black text-primary">
                      {isTieBreak ? scoreA : (scoreA === 'Ad' ? 'ADV' : (typeof scoreA === 'number' ? tennisPoints[scoreA] : scoreA))}
                    </span>
                    <span className="text-[8px] md:text-[10px] font-black uppercase text-primary/60 mt-1 md:mt-2">Team A Point</span>
                 </button>
                 <button 
                  onClick={() => handleTennisPoint('B')}
                  disabled={isFinished}
                  className={`bg-primary/10 border-2 border-primary/20 rounded-2xl md:rounded-[2rem] h-24 md:h-48 flex flex-col items-center justify-center transition-all group ${isFinished ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
                 >
                    <span className="text-3xl md:text-6xl font-black text-primary">
                      {isTieBreak ? scoreB : (scoreB === 'Ad' ? 'ADV' : (typeof scoreB === 'number' ? tennisPoints[scoreB] : scoreB))}
                    </span>
                    <span className="text-[8px] md:text-[10px] font-black uppercase text-primary/60 mt-1 md:mt-2">Team B Point</span>
                 </button>
              </div>

              <div className="flex justify-center">
                <button 
                  onClick={handleTennisUndo}
                  disabled={history.length === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-slate-400 font-bold text-[10px] uppercase tracking-widest disabled:opacity-30"
                >
                  <span className="material-symbols-outlined text-sm">undo</span>
                  Undo
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 md:p-8 bg-background-dark/50 border-t border-white/5 flex flex-col md:flex-row gap-4 shrink-0">
          <button 
            onClick={() => {
              onConfirm(
                match.id, 
                scoreA, 
                scoreB, 
                'live',
                totalGamesA,
                totalGamesB,
                setsA,
                setsB
              );
              onClose();
            }}
            className="flex-1 h-12 md:h-16 border border-primary/30 text-primary font-black uppercase tracking-widest rounded-xl md:rounded-2xl text-xs md:text-sm hover:bg-primary/5 transition-all"
          >
            Update Score Only
          </button>
          <button 
            onClick={finalize}
            className="flex-1 h-12 md:h-16 bg-red-500 text-white font-black uppercase tracking-widest rounded-xl md:rounded-2xl text-xs md:text-sm shadow-lg shadow-red-500/20 active:scale-95 transition-all"
          >
            Finish Match
          </button>
        </div>
      </div>
    </div>
  );
};

const CourtCard: React.FC<{
  match: Match;
  players: Player[];
  clubs?: { id: string, name: string }[];
  scoring: string;
  maxPoints: number;
  activeCourts: number;
  onOpenAdmin: (match: Match) => void;
  tournamentId: string;
  isCloud?: boolean;
  shortcode?: string;
}> = ({ match, players, clubs, scoring, maxPoints, activeCourts, onOpenAdmin, tournamentId, isCloud, shortcode }) => {
  const [showLargeQR, setShowLargeQR] = useState(false);
  const getPlayer = (id: string) => players.find(p => p.id === id);
  const pA1 = getPlayer(match.teamA.playerIds[0]);
  const pA2 = getPlayer(match.teamA.playerIds[1]);
  const pB1 = getPlayer(match.teamB.playerIds[0]);
  const pB2 = getPlayer(match.teamB.playerIds[1]);

  const playerClubA = clubs?.find(c => c.id === pA1?.clubId);
  const playerClubB = clubs?.find(c => c.id === pB1?.clubId);

  const isRally = scoring === 'Rally Points';
  const isCustom = scoring === 'Custom Match';
  const getDisplay = (score: any) => {
    if (isRally) return score;
    return score === 'Ad' ? 'ADV' : score;
  };

  const isFinished = match.status === 'finished';
  const winner = isFinished 
    ? (isRally 
        ? (match.teamA.score > match.teamB.score ? 'A' : (match.teamA.score < match.teamB.score ? 'B' : null))
        : (isCustom 
            ? (match.teamA.games > match.teamB.games ? 'A' : (match.teamA.games < match.teamB.games ? 'B' : null))
            : (match.teamA.sets > match.teamB.sets ? 'A' : (match.teamB.sets > match.teamA.sets ? 'B' : null))))
    : null;

  // Stadium Mode logic: Only 1-court matches get the "locked" viewport fit.
  // 2+ courts follow a scrollable layout with a readable minimum card height.
  const isStadiumMode = activeCourts === 1;
  const scoreFontSize = isStadiumMode 
    ? "text-[clamp(4rem,15dvh,14rem)]" 
    : "text-[clamp(2.5rem,8.5dvh,7.5rem)]";

  const playerFontSize = isStadiumMode
    ? "text-[clamp(0.9rem,3dvh,2.2rem)]"
    : "text-[clamp(0.8rem,2.2dvh,1.5rem)]";

  const avatarSize = isStadiumMode
    ? "size-[clamp(3rem,9.5dvh,7rem)]"
    : "size-[clamp(2rem,6dvh,4.5rem)]";

  return (
    <div className={`flex flex-col bg-surface-dark border rounded-xl md:rounded-3xl overflow-hidden transition-all h-full w-full relative ${isFinished ? 'border-primary shadow-[0_0_60px_rgba(0,255,204,0.15)]' : 'border-border-dark'}`}>
      {isFinished && <Confetti />}
      
      <div className="bg-background-dark/80 px-4 md:px-6 py-1 md:py-2 flex justify-between items-center border-b border-white/5 shrink-0 h-[60px] md:h-[6dvh]">
        <div className="flex items-center gap-2">
           <span className="material-symbols-outlined text-primary text-xs md:text-sm">grid_view</span>
           <span className="text-[10px] md:text-xs font-black text-white uppercase tracking-widest">Court {match.court}</span>
        </div>
        {isFinished ? (
           <span className="text-[8px] md:text-[10px] font-black text-primary uppercase flex items-center gap-1">
             <span className="material-symbols-outlined text-xs">emoji_events</span> Final Result
           </span>
        ) : (
           <div className="flex items-center gap-1.5 md:gap-2">
             <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_12px_rgba(0,255,204,0.9)]"></span>
             <span className="text-[8px] md:text-[10px] font-black text-primary uppercase">
               {isCustom && match.status === 'live' && (match.teamA.games + match.teamB.games < maxPoints)
                 ? `Game ${match.teamA.games + match.teamB.games + 1} of ${maxPoints}`
                 : 'Live Hub'}
             </span>
           </div>
        )}
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className={`flex-1 flex flex-col items-center justify-center p-4 md:p-6 border-b border-white/5 transition-all duration-500 overflow-hidden ${isFinished && winner === 'A' ? 'bg-primary/10' : (isFinished && winner !== null ? 'opacity-30 grayscale' : '')}`}>
          <div className="flex -space-x-4 md:-space-x-6 mb-2 md:mb-4 shrink-0">
            <img src={pA1?.avatarUrl} className={`${avatarSize} rounded-xl md:rounded-2xl border-2 border-primary/20 shadow-2xl object-cover`} />
            <img src={pA2?.avatarUrl} className={`${avatarSize} rounded-xl md:rounded-2xl border-2 border-primary/20 shadow-2xl object-cover`} />
          </div>
          <div className="flex items-center gap-2 max-w-full px-4 shrink-0">
            <p className={`${playerFontSize} font-black text-white uppercase tracking-tighter italic text-center leading-tight`}>
              {pA1?.name} / {pA2?.name}
            </p>
            {playerClubA && (
              <span className="text-[8px] md:text-xs bg-white/10 text-slate-400 px-1.5 py-0.5 rounded font-black uppercase shrink-0">
                {playerClubA.name.substring(0, 3)}
              </span>
            )}
          </div>
          <span className={`${scoreFontSize} font-black leading-none drop-shadow-2xl tracking-tighter shrink-0 ${isFinished && winner === 'A' ? 'text-primary' : 'text-white'}`}>
            {getDisplay(match.teamA.score)}
          </span>
        </div>

        <div className={`flex-1 flex flex-col items-center justify-center p-4 md:p-6 transition-all duration-500 overflow-hidden ${isFinished && winner === 'B' ? 'bg-primary/10' : (isFinished && winner !== null ? 'opacity-30 grayscale' : '')}`}>
          <div className="flex -space-x-4 md:-space-x-6 mb-2 md:mb-4 shrink-0">
            <img src={pB1?.avatarUrl} className={`${avatarSize} rounded-xl md:rounded-2xl border-2 border-primary/20 shadow-2xl object-cover`} />
            <img src={pB2?.avatarUrl} className={`${avatarSize} rounded-xl md:rounded-2xl border-2 border-primary/20 shadow-2xl object-cover`} />
          </div>
          <div className="flex items-center gap-2 max-w-full px-4 shrink-0">
            <p className={`${playerFontSize} font-black text-white uppercase tracking-tighter italic text-center leading-tight`}>
              {pB1?.name} / {pB2?.name}
            </p>
            {playerClubB && (
              <span className="text-[8px] md:text-xs bg-white/10 text-slate-400 px-1.5 py-0.5 rounded font-black uppercase shrink-0">
                {playerClubB.name.substring(0, 3)}
              </span>
            )}
          </div>
          <span className={`${scoreFontSize} font-black leading-none drop-shadow-2xl tracking-tighter shrink-0 ${isFinished && winner === 'B' ? 'text-primary' : (isFinished && winner !== null ? 'text-white' : 'text-primary')}`}>
            {getDisplay(match.teamB.score)}
          </span>
        </div>
      </div>

      <div className="p-3 md:p-4 bg-background-dark/50 border-t border-white/5 shrink-0 h-auto min-h-[80px] md:min-h-[9dvh]">
        {!isFinished ? (
          <div className="flex flex-col gap-4">
            {isCloud && (
              <>
                <div 
                  onClick={() => setShowLargeQR(true)}
                  className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition-all group/qr"
                >
                  <div className="bg-white p-2 rounded-lg shrink-0 group-hover/qr:scale-105 transition-transform">
                    <QRCodeCanvas 
                      value={`${window.location.origin}/referee?tournamentId=${tournamentId}&courtId=${match.court}`}
                      size={64}
                      level="H"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest">Referee Access</p>
                      <span className="material-symbols-outlined text-xs text-primary animate-pulse">zoom_in</span>
                    </div>
                    <p className="text-[8px] text-slate-500 font-medium leading-tight mt-1">Click to enlarge. Scan to control Court {match.court} from your smartphone.</p>
                  </div>
                </div>

                {showLargeQR && (
                  <div 
                    className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-background-dark/95 backdrop-blur-xl animate-in fade-in duration-300"
                    onClick={() => setShowLargeQR(false)}
                  >
                    <div 
                      className="bg-white p-8 rounded-[2rem] shadow-[0_0_100px_rgba(0,255,204,0.3)] flex flex-col items-center gap-6 animate-in zoom-in duration-300"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="text-center">
                        <h3 className="text-background-dark text-xl font-black uppercase italic tracking-tighter">Court {match.court} Controller</h3>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Scan to Join as Referee</p>
                      </div>
                      <QRCodeCanvas 
                        value={`${window.location.origin}/referee?tournamentId=${tournamentId}&courtId=${match.court}`}
                        size={280}
                        level="H"
                      />
                      <button 
                        onClick={() => setShowLargeQR(false)}
                        className="w-full h-14 bg-background-dark text-white font-black uppercase tracking-widest rounded-2xl"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
            <button 
              onClick={() => {
                if (isCloud) {
                  alert("This is a Cloud Tournament. Only the Referee can update scores via the QR Code.");
                  return;
                }
                onOpenAdmin(match);
              }}
              className={`w-full h-12 md:h-16 rounded-lg md:rounded-xl font-black uppercase text-[10px] md:text-sm tracking-[0.3em] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-lg ${isCloud ? 'bg-surface-dark text-slate-500 border border-white/5' : 'bg-primary text-background-dark shadow-primary/20 hover:brightness-110'}`}
            >
              <span className="material-symbols-outlined text-lg md:text-2xl">
                {isCloud ? 'cloud_lock' : ((isRally && match.teamA.score + match.teamB.score >= maxPoints) ? 'check_circle' : 'edit_square')}
              </span>
              <span>
                {isCloud ? 'Referee Controlled' : ((isRally && match.teamA.score + match.teamB.score >= maxPoints) ? 'Finish Match' : 'Update Score')}
              </span>
            </button>
            {isCloud && shortcode && (
              <button 
                onClick={() => {
                  const shareUrl = `${window.location.origin}/live?code=${shortcode}`;
                  navigator.clipboard.writeText(shareUrl);
                  alert("Live link copied to clipboard!");
                }}
                className="w-full h-10 mt-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 font-black uppercase text-[8px] tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
              >
                <span className="material-symbols-outlined text-sm">share</span>
                Share Live Link ({shortcode})
              </button>
            )}
          </div>
        ) : (
           <div className="h-full w-full flex items-center justify-center gap-3 border border-primary/20 rounded-lg md:rounded-xl bg-primary/5">
             <span className="text-[10px] font-black uppercase text-primary tracking-[0.5em]">Locked</span>
             <span className="material-symbols-outlined text-sm md:text-xl text-primary">verified</span>
           </div>
        )}
      </div>
    </div>
  );
};

const MultiCourtScoreboard: React.FC<MultiCourtScoreboardProps> = ({ tournament, onUpdateScore, onEndMatch, onNextMatch, onExit }) => {
  const [adminMatch, setAdminMatch] = useState<Match | null>(null);
  
  const liveMatches = tournament.matches.filter(m => m.status === 'live' || m.status === 'finished').slice(-tournament.courts);
  const allFinished = liveMatches.length > 0 && liveMatches.every(m => m.status === 'finished');

  const getGridClasses = () => {
    const count = liveMatches.length;
    // 1 Court: Maximum visibility, fills screen.
    if (count === 1) {
      return "grid-cols-1 grid-rows-1 h-full";
    }
    // 2+ Courts: Allow multi-column on desktop, single on mobile, always allow scrolling for readability.
    return "grid-cols-1 md:grid-cols-2 auto-rows-fr";
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-background-dark overflow-hidden font-display fixed inset-0 select-none">
      <header className="h-[10dvh] border-b border-primary/10 flex items-center justify-between px-4 md:px-10 bg-background-dark/95 backdrop-blur-3xl z-50 shrink-0">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          {onExit && (
            <button 
              onClick={onExit} 
              className="group size-10 md:size-14 flex items-center justify-center rounded-xl md:rounded-2xl bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-all shrink-0"
            >
              <span className="material-symbols-outlined text-primary text-sm md:text-2xl">home</span>
            </button>
          )}
          <button 
            onClick={onEndMatch} 
            className="group size-10 md:size-14 flex items-center justify-center rounded-xl md:rounded-2xl bg-surface-dark border border-white/10 hover:border-primary/60 hover:bg-primary/5 transition-all shrink-0"
          >
            <span className="material-symbols-outlined text-slate-400 group-hover:text-primary text-sm md:text-2xl">analytics</span>
          </button>
          <div className="hidden sm:block truncate">
            <h1 className="text-sm md:text-3xl font-black tracking-tighter text-white uppercase italic leading-none truncate">{tournament.name}</h1>
            <p className="text-[8px] md:text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              {tournament.type} • {tournament.scoring}{tournament.customMatchType ? ` (${tournament.customMatchType} ${tournament.maxPoints})` : ''}
              {(tournament.type === 'Americano Fix' || tournament.type === 'Mexicano Fix' || tournament.type === 'Club Fix Americano') && (
                <span className="ml-2 text-primary font-black border border-primary/30 px-1.5 py-0.5 rounded text-[7px] md:text-[9px]">Fixed Partner</span>
              )}
              {tournament.type.startsWith('Club') && (
                <span className="ml-2 text-blue-400 font-black border border-blue-400/30 px-1.5 py-0.5 rounded text-[7px] md:text-[9px]">Club Match</span>
              )}
            </p>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-2">
                <p className="text-[8px] md:text-[11px] text-primary font-black uppercase tracking-[0.4em]">Stadium Feed Active</p>
                <span className="size-1.5 rounded-full bg-primary animate-ping"></span>
              </div>
              {tournament.isCloud && (
                <button 
                  onClick={() => {
                    fetch('/api/tournament/create', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(tournament)
                    }).then(() => alert("Tournament synced to cloud successfully!"))
                      .catch(err => alert("Sync failed: " + err.message));
                  }}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all"
                >
                  <span className="material-symbols-outlined text-[10px] md:text-xs text-primary">cloud_sync</span>
                  <span className="text-[7px] md:text-[9px] font-black text-primary uppercase tracking-widest">Manual Sync</span>
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          {allFinished && (
            <button 
              onClick={onNextMatch}
              className="h-10 md:h-16 px-4 md:px-12 bg-primary text-background-dark rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-sm shadow-[0_0_50px_rgba(0,255,204,0.5)] active:scale-95 transition-all flex items-center gap-3 animate-pulse"
            >
              <span className="material-symbols-outlined text-xl md:text-3xl">fast_forward</span>
              <span className="hidden sm:inline">Next Round</span>
              <span className="sm:hidden">Next</span>
            </button>
          )}

          <button 
             onClick={onEndMatch}
             className={`h-10 md:h-16 px-4 md:px-10 border rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-sm transition-all active:scale-95 ${allFinished ? 'bg-surface-dark border-white/10 text-slate-400' : 'bg-primary text-background-dark border-primary shadow-lg shadow-primary/20'}`}
          >
            {allFinished ? 'Summary' : 'Stats'}
          </button>
        </div>
      </header>

      <main className="flex-1 w-full p-3 md:p-6 overflow-y-auto custom-scrollbar bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,204,0.04),transparent)]">
        <div className={`grid gap-4 md:gap-8 w-full ${getGridClasses()}`}>
          {liveMatches.map(match => (
            <div 
              key={match.id} 
              className={`w-full flex overflow-hidden ${liveMatches.length === 1 ? 'h-full' : 'min-h-[480px] md:min-h-[580px]'}`}
            >
              <CourtCard 
                match={match} 
                players={tournament.players} 
                clubs={tournament.clubs}
                scoring={tournament.scoring}
                maxPoints={tournament.maxPoints}
                activeCourts={liveMatches.length}
                onOpenAdmin={(m) => setAdminMatch(m)}
                tournamentId={tournament.id}
                isCloud={tournament.isCloud}
                shortcode={tournament.shortcode}
              />
            </div>
          ))}
          {/* Failsafe Slot for 3-court setups to maintain visual consistency */}
          {liveMatches.length === 3 && (
            <div className="h-full w-full min-h-[480px] md:min-h-[580px] rounded-2xl md:rounded-3xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center p-8 opacity-10 overflow-hidden">
               <span className="material-symbols-outlined text-7xl md:text-[10rem] mb-6 font-thin">sports_tennis</span>
               <p className="text-[10px] md:text-sm font-black uppercase tracking-[0.5em]">Awaiting Pairing</p>
            </div>
          )}
        </div>
      </main>

      <footer className="h-[6dvh] border-t border-white/5 bg-background-dark/95 flex items-center justify-between px-6 md:px-10 shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex h-2 w-2 rounded-full bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.8)]"></span>
          <p className="text-[8px] md:text-[11px] font-black text-slate-500 uppercase tracking-[0.5em]">Stadium Engine v5.6 Pro</p>
        </div>
        <div className="flex items-center gap-4 text-slate-500">
           <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded bg-white/5 border border-white/10">{tournament.courts} Node Cluster</span>
        </div>
      </footer>

      {adminMatch && (
        <ScoreEntryModal 
          match={adminMatch} 
          tournament={tournament} 
          onClose={() => setAdminMatch(null)} 
          onConfirm={onUpdateScore}
        />
      )}
    </div>
  );
};

export default MultiCourtScoreboard;
