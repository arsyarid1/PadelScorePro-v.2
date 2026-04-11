
import React from 'react';
import { Bracket, Match, Player } from '../types';

interface TournamentBracketProps {
  bracket: Bracket;
  players: Player[];
}

const TournamentBracket: React.FC<TournamentBracketProps> = ({ bracket, players }) => {
  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || 'TBD';

  return (
    <div className="flex gap-8 overflow-x-auto p-8 custom-scrollbar bg-background-dark/50 rounded-3xl border border-white/5">
      {bracket.rounds.map((round, roundIdx) => (
        <div key={roundIdx} className="flex flex-col gap-8 min-w-[240px]">
          <div className="text-center">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4">{round.name}</h3>
          </div>
          <div className="flex flex-col justify-around flex-1 gap-4">
            {round.matches.map((match, matchIdx) => (
              <div key={matchIdx} className="relative">
                <div className={`bg-surface-dark border ${match.status === 'live' ? 'border-primary shadow-[0_0_20px_rgba(0,255,204,0.1)]' : 'border-white/10'} rounded-2xl p-4 space-y-3 transition-all hover:border-primary/50`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold truncate ${match.winner === 'A' ? 'text-primary' : 'text-slate-400'}`}>
                        {match.teamA.playerIds.length > 0 ? `${getPlayerName(match.teamA.playerIds[0])} / ${getPlayerName(match.teamA.playerIds[1])}` : 'TBD'}
                      </p>
                    </div>
                    <span className="text-xs font-black text-white">{match.teamA.score}</span>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold truncate ${match.winner === 'B' ? 'text-primary' : 'text-slate-400'}`}>
                        {match.teamB.playerIds.length > 0 ? `${getPlayerName(match.teamB.playerIds[0])} / ${getPlayerName(match.teamB.playerIds[1])}` : 'TBD'}
                      </p>
                    </div>
                    <span className="text-xs font-black text-white">{match.teamB.score}</span>
                  </div>
                </div>
                
                {/* Connector lines */}
                {roundIdx < bracket.rounds.length - 1 && (
                  <div className="absolute -right-8 top-1/2 w-8 h-px bg-white/10" />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TournamentBracket;
