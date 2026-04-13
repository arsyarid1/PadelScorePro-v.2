
import React, { useState } from 'react';
import { Tournament, Gender, Player, MatchHistoryEntry } from '../types';
import TournamentBracket from './TournamentBracket';

interface ScoreDetailModalProps {
  player: Player;
  onClose: () => void;
}

const ScoreDetailModal: React.FC<ScoreDetailModalProps> = ({ player, onClose }) => {
  const totalPoints = player.matchHistory?.reduce((sum, entry) => sum + (typeof entry.score_us === 'number' ? entry.score_us : 0), 0) || 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background-dark/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-surface-dark border border-primary/20 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
        <div className="p-6 border-b border-white/5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <img src={player.avatarUrl} className="size-12 rounded-xl border border-white/10" alt={player.name} />
            <div>
              <h2 className="text-lg font-black uppercase italic text-white">{player.name}</h2>
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Score History</p>
            </div>
          </div>
          <button onClick={onClose} className="size-10 flex items-center justify-center rounded-full bg-white/5 text-slate-500 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 bg-primary/5 border-b border-white/5 shrink-0">
          <div className="flex justify-between items-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Points Earned</p>
            <p className="text-2xl font-black text-primary italic">{totalPoints}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          {!player.matchHistory || player.matchHistory.length === 0 ? (
            <div className="py-12 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-600 mb-2">history</span>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">No match history yet</p>
            </div>
          ) : (
            [...player.matchHistory].reverse().map((entry, idx) => (
              <div key={entry.matchId + idx} className="p-4 rounded-xl bg-background-dark border border-white/5 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${entry.result === 'Win' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                      {entry.result}
                    </span>
                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">{entry.type}</span>
                  </div>
                  <p className="text-xs font-bold text-white truncate">vs {entry.opponent}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-black text-white italic">
                    {entry.score_us} - {entry.score_them}
                  </p>
                  <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">
                    {new Date(entry.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-white/5 shrink-0">
          <button 
            onClick={onClose}
            className="w-full h-14 bg-surface-dark border border-white/10 text-white font-black uppercase tracking-widest rounded-xl hover:bg-white/5 transition-all text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

interface LeaderboardProps {
  tournament: Tournament;
  onGoLive: () => void;
  onEnd: () => void;
  onUpdatePlayerName: (playerId: string, newName: string) => void;
  onAddPlayer: (name: string, gender: Gender) => void;
  onExit?: () => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ tournament, onGoLive, onEnd, onUpdatePlayerName, onAddPlayer, onExit }) => {
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<Gender>('male');
  const [leaderboardType, setLeaderboardType] = useState<'individual' | 'club'>(tournament.clubs ? 'club' : 'individual');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const isClubMatch = tournament.type.startsWith('Club');

  const sortedPlayers = [...tournament.players].sort((a, b) => b.points - a.points);
  
  const isProfessional = tournament.type === 'Professional Tournament';

  const clubStats = tournament.clubs?.map(club => {
    const clubPlayers = tournament.players.filter(p => p.clubId === club.id);
    const totalPoints = clubPlayers.reduce((sum, p) => sum + p.points, 0);
    const totalWins = clubPlayers.reduce((sum, p) => sum + p.wins, 0);
    
    // For Club Fix Americano, wins are counted per pair, but since each player in a winning pair gets a 'win',
    // totalWins / 2 would be the number of match wins.
    const matchWins = tournament.type === 'Club Fix Americano' ? totalWins / 2 : totalWins;

    return {
      ...club,
      points: totalPoints,
      wins: matchWins,
      playerCount: clubPlayers.length
    };
  }).sort((a, b) => {
    if (tournament.type === 'Club Fix Americano') {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.points - a.points;
    }
    return b.points - a.points;
  }) || [];

  const leader = leaderboardType === 'individual' ? sortedPlayers[0] : (clubStats[0] as any);
  const totalPoints = tournament.players.reduce((sum, p) => sum + p.points, 0);

  const handleStartEdit = (pId: string, currentName: string) => {
    setEditingPlayerId(pId);
    setEditValue(currentName);
  };

  const handleSaveEdit = () => {
    if (editingPlayerId && editValue.trim()) {
      onUpdatePlayerName(editingPlayerId, editValue.trim());
    }
    setEditingPlayerId(null);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onAddPlayer(newName.trim(), newGender);
      setNewName('');
      setShowAddForm(false);
    }
  };

  const isTournamentActive = tournament.status === 'active';

  return (
    <div className="flex flex-col h-full bg-background-dark overflow-y-auto">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-800 bg-background-dark/80 backdrop-blur-md px-4 md:px-10 py-3 md:py-4 shrink-0">
        <div className="flex items-center gap-3 md:gap-6">
          {onExit && (
            <button 
              onClick={onExit} 
              className="size-9 md:size-12 flex items-center justify-center rounded-lg md:rounded-xl bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all"
            >
              <span className="material-symbols-outlined text-lg">home</span>
            </button>
          )}
          <div className="flex items-center gap-2 md:gap-3">
            <div className="size-8 md:size-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
              <span className="material-symbols-outlined fill-1 text-sm md:text-base">sports_tennis</span>
            </div>
            <div>
              <h1 className="text-sm md:text-xl font-bold leading-tight tracking-tight text-white line-clamp-1">{tournament.name}</h1>
              <p className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest hidden sm:block">Season Statistics</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {isTournamentActive && (
            <>
              <button 
                onClick={() => setShowAddForm(true)}
                className="flex items-center justify-center size-9 md:size-auto md:px-4 md:h-12 rounded-lg md:rounded-xl bg-surface-dark border border-primary/20 text-primary font-bold text-xs hover:bg-primary/10 transition-all"
                title="Add Player"
              >
                <span className="material-symbols-outlined text-lg">person_add</span>
                <span className="hidden lg:inline ml-2">Add</span>
              </button>
              
              <button 
                onClick={onEnd}
                className="flex items-center justify-center size-9 md:size-auto md:px-4 md:h-12 rounded-lg md:rounded-xl border border-red-500/20 text-red-500 font-bold text-xs hover:bg-red-500/10 transition-all"
                title="End Tournament"
              >
                <span className="material-symbols-outlined text-lg">stop_circle</span>
                <span className="hidden lg:inline ml-2">Finish</span>
              </button>
            </>
          )}
          
          <button 
            onClick={onGoLive}
            className="flex items-center justify-center h-9 md:h-12 px-3 md:px-6 rounded-lg md:rounded-xl bg-primary text-background-dark font-bold text-[10px] md:text-sm transition-transform active:scale-95 shadow-[0_0_15px_rgba(0,255,204,0.2)]"
          >
            <span className="material-symbols-outlined text-lg sm:mr-2">play_arrow</span>
            <span className="hidden sm:inline">Next</span>
          </button>
        </div>
      </header>

      {/* Add Player Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background-dark/95 backdrop-blur-xl">
          <div className="w-full max-w-md bg-surface-dark border border-primary/20 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
               <h2 className="text-lg font-black uppercase italic text-white">Join Pro Hub</h2>
               <button onClick={() => setShowAddForm(false)} className="text-slate-500 hover:text-white transition-colors">
                 <span className="material-symbols-outlined">close</span>
               </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 md:space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary/70">Player Identity</label>
                <input 
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full h-12 bg-background-dark border border-white/10 rounded-xl px-4 text-white font-bold focus:border-primary transition-all text-sm"
                  placeholder="Enter name..."
                />
              </div>
              <button 
                type="submit"
                className="w-full h-14 bg-primary text-background-dark font-black uppercase tracking-widest rounded-xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-xs"
              >
                Finalize Entry
              </button>
            </form>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col lg:flex-row max-w-[1600px] mx-auto w-full p-4 md:p-8 gap-4 md:gap-8 overflow-y-auto lg:overflow-hidden">
        {/* Sidebar Rank info */}
        <aside className="w-full lg:w-80 flex flex-col gap-4 md:gap-6 shrink-0 lg:overflow-y-auto custom-scrollbar">
          <div className="flex flex-col gap-1 md:gap-2">
            <h2 className="text-xl md:text-3xl font-black tracking-tight text-white uppercase italic leading-none">Standings</h2>
            <p className="text-[#9abcb5] text-[10px] md:text-sm">Global accumulation tracker.</p>
          </div>
          
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="p-3 md:p-4 rounded-xl bg-surface-dark border border-white/5">
              <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Score Pool</p>
              <p className="text-lg md:text-2xl font-bold text-white">{totalPoints.toLocaleString()}</p>
            </div>
            <div className="p-3 md:p-4 rounded-xl bg-surface-dark border border-white/5">
              <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Athletes</p>
              <p className="text-lg md:text-2xl font-bold text-white">{tournament.players.length}</p>
            </div>
          </div>

          {leader && leader.points > 0 && (
            <div className="relative overflow-hidden group p-4 md:p-6 rounded-2xl bg-surface-dark border-2 border-primary/20 podium-rank-1">
              <div className="absolute -right-4 -top-4 text-6xl md:text-8xl font-black text-primary/5 select-none italic">#1</div>
              <div className="relative z-10 flex flex-col gap-3 md:gap-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="size-12 md:size-16 rounded-xl bg-cover bg-center border-2 border-accent-gold" 
                    style={{ backgroundImage: `url('${leader.avatarUrl}')` }}
                  ></div>
                  <div>
                    <p className="text-[8px] font-bold text-accent-gold uppercase tracking-widest">Global Seed #1</p>
                    <h3 className="text-lg md:text-xl font-bold text-white uppercase tracking-tight">{leader.name}</h3>
                  </div>
                </div>
                <div className="flex justify-between items-end border-t border-white/5 pt-3 md:pt-4">
                  <div>
                    <p className="text-[8px] text-slate-500 uppercase">Played</p>
                    <p className="text-sm md:text-lg font-bold text-primary">{leader.matchesPlayed}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] text-slate-500 uppercase">Points</p>
                    <p className="text-sm md:text-lg font-bold text-white">{leader.points}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Top 3 List for mobile/compact screens */}
          <div className="grid grid-cols-1 gap-3 sm:hidden md:grid">
            {sortedPlayers.slice(1, 4).filter(p => p.points > 0).map((player, idx) => (
              <div key={player.id} className={`flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl bg-surface-dark border border-white/5 ${idx === 0 ? 'podium-rank-2' : 'podium-rank-3'}`}>
                <div 
                  className={`size-10 md:size-12 rounded-lg bg-cover bg-center border border-white/10`}
                  style={{ backgroundImage: `url('${player.avatarUrl}')` }}
                ></div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-white uppercase line-clamp-1">{player.name}</p>
                  <p className="text-xs md:text-sm font-bold text-primary">{player.points} PTS</p>
                </div>
                <span className="text-[10px] md:text-xs font-bold text-slate-400">#{idx + 2}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Table/List section */}
        <section className="flex-1 flex flex-col min-w-0 lg:overflow-y-auto custom-scrollbar pb-20 lg:pb-0">
          {isProfessional && tournament.bracket ? (
            <div className="mb-8">
              <div className="flex flex-col gap-1 md:gap-2 mb-6">
                <h2 className="text-xl md:text-3xl font-black tracking-tight text-white uppercase italic leading-none">Tournament Bracket</h2>
                <p className="text-[#9abcb5] text-[10px] md:text-sm">Knockout progression to the championship.</p>
              </div>
              <TournamentBracket bracket={tournament.bracket} players={tournament.players} />
            </div>
          ) : null}

          {isClubMatch && (
            <div className="sticky top-[72px] z-40 flex gap-2 mb-4 p-1 bg-surface-dark/90 backdrop-blur-md rounded-xl border border-white/5 w-fit">
              <button 
                onClick={() => setLeaderboardType('club')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${leaderboardType === 'club' ? 'bg-primary text-background-dark' : 'text-slate-500 hover:text-white'}`}
              >
                Club Standings
              </button>
              <button 
                onClick={() => setLeaderboardType('individual')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${leaderboardType === 'individual' ? 'bg-primary text-background-dark' : 'text-slate-500 hover:text-white'}`}
              >
                MVP Race
              </button>
            </div>
          )}

          <div className="bg-surface-dark rounded-xl md:rounded-2xl border border-white/5 overflow-hidden flex flex-col shadow-2xl">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[500px] md:min-w-0">
                <thead className="top-[72px] z-30 bg-surface-dark/95 backdrop-blur-sm">
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="px-4 md:px-6 py-4 text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400 w-16 md:w-24">Rank</th>
                    <th className="px-4 md:px-6 py-4 text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {leaderboardType === 'individual' ? 'Athlete' : 'Club'}
                    </th>
                    <th className="px-4 md:px-6 py-4 text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">
                      {leaderboardType === 'individual' ? 'W-L' : 'Match Wins'}
                    </th>
                    <th className="px-4 md:px-6 py-4 text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Total Score</th>
                    <th className="px-4 md:px-6 py-4 text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right w-20">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {leaderboardType === 'individual' ? (
                    sortedPlayers.map((player, idx) => (
                      <tr key={player.id} className="group hover:bg-primary/5 transition-colors">
                        <td className="px-4 md:px-6 py-4">
                          <span className={`text-base md:text-xl font-black italic ${idx < 3 ? 'text-primary' : 'text-white/40'}`}>{(idx + 1).toString().padStart(2, '0')}</span>
                        </td>
                        <td className="px-4 md:px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={player.avatarUrl} className="size-8 md:size-10 rounded-lg border border-white/10" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 group/name">
                                <p className="font-bold text-white uppercase text-xs md:text-sm tracking-tight truncate">{player.name}</p>
                                {player.clubId && (
                                  <span className="text-[8px] bg-white/5 text-slate-500 px-1.5 py-0.5 rounded font-black uppercase">
                                    {tournament.clubs?.find(c => c.id === player.clubId)?.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-4 text-center">
                          <span className="text-xs font-bold text-slate-300">{player.wins}-{player.matchesPlayed - player.wins}</span>
                        </td>
                        <td className="px-4 md:px-6 py-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className="inline-flex items-center justify-center px-2 md:px-4 py-1.5 md:py-2 rounded-lg bg-primary/10 text-primary border border-primary/20 text-[10px] md:text-sm font-black min-w-[50px] md:min-w-[80px]">
                              {player.points}
                            </span>
                            <span className="text-[7px] text-slate-500 font-bold uppercase mt-1">Accumulated</span>
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-4 text-right">
                          <button 
                            onClick={() => setSelectedPlayer(player)}
                            className="size-8 md:size-10 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-primary hover:border-primary/50 flex items-center justify-center transition-all"
                            title="View Details"
                          >
                            <span className="material-symbols-outlined text-lg">analytics</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    clubStats.map((club, idx) => (
                      <tr key={club.id} className="group hover:bg-primary/5 transition-colors">
                        <td className="px-4 md:px-6 py-4">
                          <span className={`text-base md:text-xl font-black italic ${idx < 3 ? 'text-primary' : 'text-white/40'}`}>{(idx + 1).toString().padStart(2, '0')}</span>
                        </td>
                        <td className="px-4 md:px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="size-8 md:size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                              {club.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-white uppercase text-xs md:text-sm tracking-tight truncate">{club.name}</p>
                              <p className="text-[8px] text-slate-500 font-bold uppercase">{club.playerCount} Members</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-4 text-center">
                          <span className="text-xs font-bold text-slate-300">{club.wins}</span>
                        </td>
                        <td className="px-4 md:px-6 py-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className="inline-flex items-center justify-center px-2 md:px-4 py-1.5 md:py-2 rounded-lg bg-primary/10 text-primary border border-primary/20 text-[10px] md:text-sm font-black min-w-[50px] md:min-w-[80px]">
                              {club.points}
                            </span>
                            <span className="text-[7px] text-slate-500 font-bold uppercase mt-1">Accumulated</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      {selectedPlayer && (
        <ScoreDetailModal 
          player={selectedPlayer} 
          onClose={() => setSelectedPlayer(null)} 
        />
      )}
    </div>
  );
};

export default Leaderboard;
