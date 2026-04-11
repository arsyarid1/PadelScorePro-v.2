
import { Player, Match, GameType } from '../types';

/**
 * Fisher-Yates Shuffle for true randomness.
 * Standardizes how we randomize player pools.
 */
export const shuffle = <T>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export const generateRandomRound = (players: Player[], courts: number, roundNumber: number): Match[] => {
  const shuffled = shuffle(players);
  const matches: Match[] = [];
  const maxMatches = Math.min(courts, Math.floor(shuffled.length / 4));

  for (let i = 0; i < maxMatches; i++) {
    const offset = i * 4;
    matches.push({
      id: Math.random().toString(36).substr(2, 9),
      teamA: { playerIds: [shuffled[offset].id, shuffled[offset + 1].id], score: 0, sets: 0, games: 0 },
      teamB: { playerIds: [shuffled[offset + 2].id, shuffled[offset + 3].id], score: 0, sets: 0, games: 0 },
      status: 'pending',
      court: i + 1,
      round: roundNumber
    });
  }
  return matches;
};

export const generateMexicanoRound = (players: Player[], courts: number, roundNumber: number): Match[] => {
  // Sort players by points descending, then by winRate descending
  const sortedPlayers = [...players].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.winRate - a.winRate;
  });
  
  const matches: Match[] = [];
  const maxMatches = Math.min(courts, Math.floor(sortedPlayers.length / 4));

  for (let i = 0; i < maxMatches; i++) {
    const offset = i * 4;
    const p1 = sortedPlayers[offset];
    const p2 = sortedPlayers[offset + 1];
    const p3 = sortedPlayers[offset + 2];
    const p4 = sortedPlayers[offset + 3];

    // Standard Mexicano pairing for a court: (1 & 4) vs (2 & 3)
    matches.push({
      id: Math.random().toString(36).substr(2, 9),
      teamA: { playerIds: [p1.id, p4.id], score: 0, sets: 0, games: 0 },
      teamB: { playerIds: [p2.id, p3.id], score: 0, sets: 0, games: 0 },
      status: 'pending',
      court: i + 1,
      round: roundNumber
    });
  }
  return matches;
};

export const generateRandomMixRound = (players: Player[], courts: number, roundNumber: number): Match[] => {
  const males = shuffle(players.filter(p => p.gender === 'male'));
  const females = shuffle(players.filter(p => p.gender === 'female'));
  
  const matches: Match[] = [];
  const maxMatches = Math.min(courts, Math.floor(Math.min(males.length, females.length) / 2));

  for (let i = 0; i < maxMatches; i++) {
    const mOffset = i * 2;
    const fOffset = i * 2;
    
    matches.push({
      id: Math.random().toString(36).substr(2, 9),
      teamA: { playerIds: [males[mOffset].id, females[fOffset].id], score: 0, sets: 0, games: 0 },
      teamB: { playerIds: [males[mOffset + 1].id, females[fOffset + 1].id], score: 0, sets: 0, games: 0 },
      status: 'pending',
      court: i + 1,
      round: roundNumber
    });
  }
  
  // Shuffle matches and re-assign court numbers for better randomness
  return shuffle(matches).map((m, idx) => ({ ...m, court: idx + 1 }));
};

export const generateMexicanoMixRound = (players: Player[], courts: number, roundNumber: number): Match[] => {
  const males = [...players].filter(p => p.gender === 'male').sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.winRate - a.winRate;
  });
  const females = [...players].filter(p => p.gender === 'female').sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.winRate - a.winRate;
  });

  const matches: Match[] = [];
  const maxMatches = Math.min(courts, Math.floor(Math.min(males.length, females.length) / 2));

  for (let i = 0; i < maxMatches; i++) {
    const offset = i * 2;
    const m1 = males[offset];
    const f1 = females[offset];
    const m2 = males[offset + 1];
    const f2 = females[offset + 1];

    if (m1 && f1 && m2 && f2) {
      matches.push({
        id: Math.random().toString(36).substr(2, 9),
        teamA: { playerIds: [m1.id, f1.id], score: 0, sets: 0, games: 0 },
        teamB: { playerIds: [m2.id, f2.id], score: 0, sets: 0, games: 0 },
        status: 'pending',
        court: i + 1,
        round: roundNumber
      });
    }
  }
  return matches;
};

export const generateAmericanoMixRound = (players: Player[], courts: number, roundNumber: number): Match[] => {
  const males = shuffle(players.filter(p => p.gender === 'male'));
  const females = shuffle(players.filter(p => p.gender === 'female'));
  
  // To rotate, we use the roundNumber to shift the female array
  const shift = (roundNumber - 1) % females.length;
  const shiftedFemales = [...females.slice(shift), ...females.slice(0, shift)];
  
  const matches: Match[] = [];
  const maxMatches = Math.min(courts, Math.floor(Math.min(males.length, females.length) / 2));

  // Now we have pairs: (males[i], shiftedFemales[i])
  // We need to pair these teams into matches
  for (let i = 0; i < maxMatches; i++) {
    const t1_m = males[i * 2];
    const t1_f = shiftedFemales[i * 2];
    const t2_m = males[i * 2 + 1];
    const t2_f = shiftedFemales[i * 2 + 1];

    if (t1_m && t1_f && t2_m && t2_f) {
      matches.push({
        id: Math.random().toString(36).substr(2, 9),
        teamA: { playerIds: [t1_m.id, t1_f.id], score: 0, sets: 0, games: 0 },
        teamB: { playerIds: [t2_m.id, t2_f.id], score: 0, sets: 0, games: 0 },
        status: 'pending',
        court: i + 1,
        round: roundNumber
      });
    }
  }
  
  // Shuffle matches and re-assign court numbers for better randomness
  return shuffle(matches).map((m, idx) => ({ ...m, court: idx + 1 }));
};

export const generateFixedTeams = (players: Player[]): { p1: Player, p2: Player }[] => {
  const teams: { p1: Player, p2: Player }[] = [];
  for (let i = 0; i < players.length; i += 2) {
    if (players[i] && players[i + 1]) {
      teams.push({ p1: players[i], p2: players[i + 1] });
    }
  }
  return teams;
};

export const generateAmericanoFixMatches = (players: Player[], rounds: number = 1): Match[] => {
  const teams = generateFixedTeams(players);
  const matches: Match[] = [];
  const numTeams = teams.length;
  if (numTeams < 2) return [];

  // Circle Method for Round Robin
  const teamList = [...teams];
  const numRounds = numTeams - 1;
  const half = numTeams / 2;

  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < numRounds; i++) {
      for (let j = 0; j < half; j++) {
        const teamA = teamList[j];
        const teamB = teamList[numTeams - 1 - j];
        
        matches.push({
          id: Math.random().toString(36).substr(2, 9),
          teamA: { playerIds: [teamA.p1.id, teamA.p2.id], score: 0, sets: 0, games: 0 },
          teamB: { playerIds: [teamB.p1.id, teamB.p2.id], score: 0, sets: 0, games: 0 },
          status: 'pending',
          court: j + 1,
          round: i + 1 + (r * numRounds)
        });
      }
      // Rotate
      if (numTeams > 2) {
        teamList.splice(1, 0, teamList.pop()!);
      }
    }
  }
  return matches;
};

export const generateMexicanoFixRound = (players: Player[], courts: number, roundNumber: number): Match[] => {
  const teams = generateFixedTeams(players);
  
  // Sort teams by total points of players
  const sortedTeams = [...teams].sort((a, b) => {
    const pointsA = a.p1.points + a.p2.points;
    const pointsB = b.p1.points + b.p2.points;
    if (pointsB !== pointsA) return pointsB - pointsA;
    const winRateA = (a.p1.winRate + a.p2.winRate) / 2;
    const winRateB = (b.p1.winRate + b.p2.winRate) / 2;
    return winRateB - winRateA;
  });

  const matches: Match[] = [];
  const maxMatches = Math.min(courts, Math.floor(sortedTeams.length / 2));

  for (let i = 0; i < maxMatches; i++) {
    const offset = i * 2;
    const t1 = sortedTeams[offset];
    const t2 = sortedTeams[offset + 1];

    if (t1 && t2) {
      matches.push({
        id: Math.random().toString(36).substr(2, 9),
        teamA: { playerIds: [t1.p1.id, t1.p2.id], score: 0, sets: 0, games: 0 },
        teamB: { playerIds: [t2.p1.id, t2.p2.id], score: 0, sets: 0, games: 0 },
        status: 'pending',
        court: i + 1,
        round: roundNumber
      });
    }
  }
  return matches;
};

export const generateAmericanoFixRound = (players: Player[], roundNumber: number): Match[] => {
  const teams = generateFixedTeams(players);
  const numTeams = teams.length;
  if (numTeams < 2) return [];

  const teamList = [...teams];
  const numRounds = numTeams - 1;
  const currentRound = (roundNumber - 1) % numRounds;

  // Rotate to the correct round using Circle Method
  for (let i = 0; i < currentRound; i++) {
    if (numTeams > 2) {
      teamList.splice(1, 0, teamList.pop()!);
    }
  }

  const matches: Match[] = [];
  const half = numTeams / 2;
  for (let j = 0; j < half; j++) {
    const teamA = teamList[j];
    const teamB = teamList[numTeams - 1 - j];
    matches.push({
      id: Math.random().toString(36).substr(2, 9),
      teamA: { playerIds: [teamA.p1.id, teamA.p2.id], score: 0, sets: 0, games: 0 },
      teamB: { playerIds: [teamB.p1.id, teamB.p2.id], score: 0, sets: 0, games: 0 },
      status: 'pending',
      court: j + 1,
      round: roundNumber
    });
  }
  return matches;
};

export const generateMatches = (players: Player[], type: GameType, rounds: number = 1, clubs?: { id: string, name: string }[]): Match[] => {
  const matches: Match[] = [];
  
  if (type === 'Club Americano') {
    if (!clubs || clubs.length < 2) return [];
    for (let r = 0; r < rounds; r++) {
      matches.push(...generateClubRandomRound(players, clubs, 99, r + 1));
    }
    return matches;
  } else if (type === 'Club Mexicano') {
    if (!clubs || clubs.length < 2) return [];
    // Round 1 is random
    matches.push(...generateClubRandomRound(players, clubs, 99, 1));
    // Subsequent rounds would need to be generated one by one in App.tsx
    return matches;
  } else if (type === 'Club Fix Americano') {
    if (!clubs || clubs.length < 2) return [];
    for (let r = 0; r < rounds; r++) {
      matches.push(...generateClubFixAmericanoRound(players, clubs, r + 1));
    }
    return matches;
  }

  if (type === 'Mexicano') {
    // Mexicano: Fixed partners. Usually paired by rank (1-2, 3-4).
    // For initial setup, we sort by seed then pair.
    const sortedPlayers = [...players].sort((a, b) => a.seed - b.seed);
    const teams: { p1: Player, p2: Player }[] = [];
    for (let i = 0; i < sortedPlayers.length; i += 2) {
      if (sortedPlayers[i] && sortedPlayers[i + 1]) {
        teams.push({ p1: sortedPlayers[i], p2: sortedPlayers[i + 1] });
      }
    }

    // Generate matches by shuffling the existing fixed teams
    for (let r = 0; r < rounds; r++) {
      const shuffledTeams = shuffle(teams);
      for (let j = 0; j < Math.floor(shuffledTeams.length / 2); j++) {
        const t1 = shuffledTeams[j * 2];
        const t2 = shuffledTeams[j * 2 + 1];
        matches.push({
          id: Math.random().toString(36).substr(2, 9),
          teamA: { playerIds: [t1.p1.id, t1.p2.id], score: 0, sets: 0, games: 0 },
          teamB: { playerIds: [t2.p1.id, t2.p2.id], score: 0, sets: 0, games: 0 },
          status: 'pending',
          court: j + 1,
          round: r + 1,
        });
      }
    }
  } else if (type === 'Americano Fix') {
    return generateAmericanoFixMatches(players, rounds);
  } else if (type === 'Mexicano Fix') {
    // Round 1 is random pairing of teams
    const teams = generateFixedTeams(players);
    const shuffledTeams = shuffle(teams);
    for (let j = 0; j < Math.floor(shuffledTeams.length / 2); j++) {
      const t1 = shuffledTeams[j * 2];
      const t2 = shuffledTeams[j * 2 + 1];
      matches.push({
        id: Math.random().toString(36).substr(2, 9),
        teamA: { playerIds: [t1.p1.id, t1.p2.id], score: 0, sets: 0, games: 0 },
        teamB: { playerIds: [t2.p1.id, t2.p2.id], score: 0, sets: 0, games: 0 },
        status: 'pending',
        court: j + 1,
        round: 1,
      });
    }
  } else {
    // Americano: Rotating/Random partners
    // We maintain a pool and shift it per round to ensure "evenness" 
    // (no one is left out twice in a row if counts are uneven).
    let playerPool = shuffle(players);

    for (let r = 0; r < rounds; r++) {
      const currentRoundPool = [...playerPool];
      const numMatches = Math.floor(currentRoundPool.length / 4);
      
      for (let j = 0; j < numMatches; j++) {
        const p1 = currentRoundPool[j * 4];
        const p2 = currentRoundPool[j * 4 + 1];
        const p3 = currentRoundPool[j * 4 + 2];
        const p4 = currentRoundPool[j * 4 + 3];

        matches.push({
          id: Math.random().toString(36).substr(2, 9),
          teamA: { playerIds: [p1.id, p2.id], score: 0, sets: 0, games: 0 },
          teamB: { playerIds: [p3.id, p4.id], score: 0, sets: 0, games: 0 },
          status: 'pending',
          court: j + 1,
          round: r + 1,
        });
      }
      
      // Rotate pool for the next round to change who is "left out"
      // and ensure everyone plays an even amount of games over time.
      if (playerPool.length > 0) {
        const first = playerPool.shift()!;
        playerPool.push(first);
      }
    }
  }
  
  return matches;
};

export const generateClubRandomRound = (players: Player[], clubs: { id: string, name: string }[], courts: number, roundNumber: number): Match[] => {
  const clubAPlayers = shuffle(players.filter(p => p.clubId === clubs[0].id));
  const clubBPlayers = shuffle(players.filter(p => p.clubId === clubs[1].id));
  
  const matches: Match[] = [];
  const maxMatches = Math.min(courts, Math.floor(Math.min(clubAPlayers.length, clubBPlayers.length) / 2));

  for (let i = 0; i < maxMatches; i++) {
    const offset = i * 2;
    matches.push({
      id: Math.random().toString(36).substr(2, 9),
      teamA: { playerIds: [clubAPlayers[offset].id, clubAPlayers[offset + 1].id], score: 0, sets: 0, games: 0 },
      teamB: { playerIds: [clubBPlayers[offset].id, clubBPlayers[offset + 1].id], score: 0, sets: 0, games: 0 },
      status: 'pending',
      court: i + 1,
      round: roundNumber
    });
  }
  return matches;
};

export const generateClubMexicanoRound = (players: Player[], clubs: { id: string, name: string }[], courts: number, roundNumber: number): Match[] => {
  const clubAPlayers = [...players].filter(p => p.clubId === clubs[0].id).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.winRate - a.winRate;
  });
  const clubBPlayers = [...players].filter(p => p.clubId === clubs[1].id).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.winRate - a.winRate;
  });

  const matches: Match[] = [];
  const maxMatches = Math.min(courts, Math.floor(Math.min(clubAPlayers.length, clubBPlayers.length) / 2));

  for (let i = 0; i < maxMatches; i++) {
    const offset = i * 2;
    matches.push({
      id: Math.random().toString(36).substr(2, 9),
      teamA: { playerIds: [clubAPlayers[offset].id, clubAPlayers[offset + 1].id], score: 0, sets: 0, games: 0 },
      teamB: { playerIds: [clubBPlayers[offset].id, clubBPlayers[offset + 1].id], score: 0, sets: 0, games: 0 },
      status: 'pending',
      court: i + 1,
      round: roundNumber
    });
  }
  return matches;
};

export const generateClubFixAmericanoRound = (players: Player[], clubs: { id: string, name: string }[], roundNumber: number): Match[] => {
  const clubAPlayers = players.filter(p => p.clubId === clubs[0].id);
  const clubBPlayers = players.filter(p => p.clubId === clubs[1].id);
  
  const teamsA = generateFixedTeams(clubAPlayers);
  const teamsB = generateFixedTeams(clubBPlayers);
  
  const numTeams = Math.min(teamsA.length, teamsB.length);
  const matches: Match[] = [];

  for (let i = 0; i < numTeams; i++) {
    // Rotate teamsB based on roundNumber
    const bIndex = (i + roundNumber - 1) % teamsB.length;
    const tA = teamsA[i];
    const tB = teamsB[bIndex];

    matches.push({
      id: Math.random().toString(36).substr(2, 9),
      teamA: { playerIds: [tA.p1.id, tA.p2.id], score: 0, sets: 0, games: 0 },
      teamB: { playerIds: [tB.p1.id, tB.p2.id], score: 0, sets: 0, games: 0 },
      status: 'pending',
      court: i + 1,
      round: roundNumber
    });
  }
  return matches;
};

export const getNextTennisScore = (current: number | string): string | number => {
  if (current === 0) return 15;
  if (current === 15) return 30;
  if (current === 30) return 40;
  return 'Game';
};
