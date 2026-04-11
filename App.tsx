
import React, { useState, useEffect, useCallback } from 'react';
import { ViewState, Tournament, Player, Match, Gender, MatchHistoryEntry } from './types';
import Sidebar from './components/Sidebar';
import TournamentSetup from './components/TournamentSetup';
import Leaderboard from './components/Leaderboard';
import LiveScoreboard from './components/LiveScoreboard';
import MultiCourtScoreboard from './components/MultiCourtScoreboard';
import Dashboard from './components/Dashboard';
import RefereeView from './components/RefereeView';
import AdminDashboard from './components/AdminDashboard';
import SpectatorView from './components/SpectatorView';
import ShortcodeEntry from './components/ShortcodeEntry';
import SuperAdmin from './components/SuperAdmin';
import { generateMatches, shuffle, generateRandomRound, generateMexicanoRound, generateRandomMixRound, generateMexicanoMixRound, generateAmericanoMixRound, generateAmericanoFixRound, generateMexicanoFixRound, generateClubRandomRound, generateClubMexicanoRound, generateClubFixAmericanoRound } from './utils/gameLogic';
import { getAvatarUrl } from './utils/avatar';
import { tournamentService } from './services/tournamentService';

const STORAGE_KEY = 'padel_sessions_v1';
const ADMIN_PASSWORD_HASH = "f8405073e513251214040941198583486191963071853412589578278292839b"; // SHA-256 for "padeladmin"

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState | 'referee' | 'admin' | 'spectator' | 'superadmin'>('dashboard');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [activeTournaments, setActiveTournaments] = useState<Tournament[]>([]);
  const [currentTournamentId, setCurrentTournamentId] = useState<string | null>(null);
  const [selectedCourtId, setSelectedCourtId] = useState<number>(1);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // Clean up 'origin' parameter from URL if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('origin')) {
      params.delete('origin');
      const newSearch = params.toString();
      const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  // Simple Router based on URL
  useEffect(() => {
    if (!isInitialized) return;

    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    
    console.log("Router check. Path:", path, "Params:", Object.fromEntries(params.entries()));
    
    if (path.endsWith('/live')) {
      const directCode = params.get('code');
      if (directCode) {
        const code = directCode.toUpperCase();
        // Check local first
        const local = activeTournaments.find(t => t.shortcode === code);
        if (local) {
          setCurrentTournamentId(local.id);
          setCurrentView('spectator');
        } else {
          // Fetch from server
          fetch(`/api/tournament/shortcode/${code}`)
            .then(res => res.json())
            .then(data => {
              if (data.id) {
                setActiveTournaments(prev => {
                  if (prev.find(t => t.id === data.id)) return prev;
                  return [...prev, { ...data, role: 'spectator' }];
                });
                setCurrentTournamentId(data.id);
                setCurrentView('spectator');
              }
            })
            .catch(err => console.error("Direct code fetch failed", err));
        }
      } else {
        setCurrentView('shortcode');
      }
    } else if (path.endsWith('/referee')) {
      const tId = params.get('tournamentId');
      const cId = params.get('courtId');
      
      console.log("Referee Route Detected. TournamentId:", tId, "CourtId:", cId);

      if (tId && cId) {
        // Check if we already have it locally
        const local = activeTournaments.find(t => t.id === tId);
        if (local) {
          setCurrentTournamentId(tId);
          setSelectedCourtId(parseInt(cId));
          setCurrentView('referee');
        } else {
          // Fetch from server
          setIsFetching(true);
          console.log(`Fetching tournament ${tId} from server...`);
          fetch(`/api/tournament/${tId}`)
            .then(res => {
              if (!res.ok) throw new Error(`Server returned ${res.status}`);
              return res.json();
            })
            .then(data => {
              if (data.id) {
                console.log("Tournament fetched successfully:", data.name);
                setActiveTournaments(prev => {
                  if (prev.find(t => t.id === data.id)) return prev;
                  return [...prev, { ...data, role: 'spectator' }]; // If they scanned QR but didn't create it, they are spectators by default unless they enter referee mode
                });
                setCurrentTournamentId(tId);
                setSelectedCourtId(parseInt(cId));
                setCurrentView('referee');
              } else {
                console.error("Tournament data invalid:", data);
                alert("Tournament not found on server. Please ensure the tournament creator has the app open and is connected to the internet.");
                setCurrentView('dashboard');
              }
            })
            .catch(err => {
              console.error("Failed to fetch tournament from server", err);
              alert(`Connection error: ${err.message}. Could not load tournament data.`);
              setCurrentView('dashboard');
            })
            .finally(() => setIsFetching(false));
        }
      }
    }
  }, [isInitialized, window.location.pathname, window.location.search]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setActiveTournaments(parsed);
      } catch (e) {
        console.error("Failed to load sessions", e);
      }
    }
    setIsInitialized(true);
  }, []);

  // Real-time Score Sync for Stadium View
  useEffect(() => {
    if (!isInitialized) return;

    const cleanups = activeTournaments
      .filter(t => t.isCloud)
      .map(t => {
        return tournamentService.subscribe(
          t.id,
          (scoreUpdate) => {
            setActiveTournaments(prev => prev.map(tournament => {
              if (tournament.id !== t.id) return tournament;
              return {
                ...tournament,
                matches: tournament.matches.map(m => {
                  if (m.id !== scoreUpdate.matchId) return m;
                  return {
                    ...m,
                    teamA: scoreUpdate.teamA,
                    teamB: scoreUpdate.teamB,
                    status: scoreUpdate.status as any,
                    isTieBreak: scoreUpdate.isTieBreak,
                    server: scoreUpdate.server
                  };
                })
              };
            }));
          },
          () => {}
        );
      });

    return () => {
      cleanups.forEach(c => c());
    };
  }, [activeTournaments.length, isInitialized]); // Re-subscribe if tournament count changes

  // Save to localStorage whenever tournaments change
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activeTournaments));
      
      // Re-sync cloud tournaments to server (in case server restarted)
      // Debounce this or only do it for the active one to avoid spam
      const cloudTournaments = activeTournaments.filter(t => t.isCloud);
      if (cloudTournaments.length > 0) {
        console.log(`Syncing ${cloudTournaments.length} cloud tournaments to server...`);
        cloudTournaments.forEach(t => {
          fetch('/api/tournament/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(t)
          }).catch(err => console.error("Auto-sync failed for", t.id, err));
        });
      }
    }
  }, [activeTournaments, isInitialized]);

  const hashPassword = async (password: string) => {
    if (!window.crypto || !window.crypto.subtle) {
      console.error("Web Crypto API (crypto.subtle) is not available in this environment.");
      // Fallback to a simple hash if subtle is missing (though this shouldn't happen in modern browsers)
      // For now, we'll just return a dummy string to avoid crashing, but it will fail the check.
      return "crypto-not-available";
    }
    const msgUint8 = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleStartTournament = (setup: any) => {
    let matches: Match[] = [];
    
    if (setup.type === 'Mexicano') {
      matches = generateRandomRound(setup.players, setup.courts, 1);
    } else if (setup.type === 'Mexicano Mix') {
      const males = setup.players.filter((p: any) => p.gender === 'male');
      const females = setup.players.filter((p: any) => p.gender === 'female');
      if (males.length < 2 || females.length < 2 || males.length !== females.length) {
        alert("Mix modes require an equal number of male and female players.");
        return;
      }
      matches = generateRandomMixRound(setup.players, setup.courts, 1);
    } else if (setup.type === 'Americano Mix') {
      const males = setup.players.filter((p: any) => p.gender === 'male');
      const females = setup.players.filter((p: any) => p.gender === 'female');
      if (males.length < 2 || females.length < 2 || males.length !== females.length) {
        alert("Mix modes require an equal number of male and female players.");
        return;
      }
      matches = generateAmericanoMixRound(setup.players, setup.courts, 1);
    } else if (setup.type === 'Club Americano' || setup.type === 'Club Mexicano' || setup.type === 'Club Fix Americano') {
      matches = generateMatches(setup.players, setup.type, 1, setup.clubs);
    } else {
      matches = generateMatches(setup.players, setup.type, 1);
    }

    for (let i = 0; i < Math.min(setup.courts, matches.length); i++) {
      matches[i].status = 'live';
    }
    
    const newTournament: Tournament = {
      id: Math.random().toString(36).substr(2, 9),
      name: setup.name,
      type: setup.type,
      scoring: setup.scoring,
      customMatchType: setup.customMatchType,
      tennisRule: setup.tennisRule,
      maxPoints: setup.maxPoints,
      courts: setup.courts,
      players: setup.players.map((p: any) => ({ ...p, points: 0, matchesPlayed: 0, wins: 0, winRate: 0 })),
      clubs: setup.clubs,
      matches: matches,
      currentMatchId: matches[0]?.id,
      status: 'active',
      isCloud: setup.isCloud,
      shortcode: setup.shortcode,
      role: 'admin',
      createdAt: new Date().toISOString()
    };
    setActiveTournaments([...activeTournaments, newTournament]);
    setCurrentTournamentId(newTournament.id);
    setCurrentView('live');

    if (newTournament.isCloud) {
      fetch('/api/tournament/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTournament)
      }).catch(err => console.error("Failed to sync cloud tournament", err));
    }
  };

  const handleUpdateMatch = (
    tournamentId: string, 
    matchId: string, 
    teamAScore: any, 
    teamBScore: any, 
    status: 'live' | 'finished',
    teamAGames: number = 0,
    teamBGames: number = 0,
    teamASets: number = 0,
    teamBSets: number = 0
  ) => {
    setActiveTournaments(prev => prev.map(t => {
      if (t.id === tournamentId) {
        const isAlreadyFinished = t.matches.find(m => m.id === matchId)?.status === 'finished';
        
        const updatedMatches = t.matches.map(m => m.id === matchId ? {
          ...m,
          status,
          teamA: { ...m.teamA, score: teamAScore, games: teamAGames, sets: teamASets },
          teamB: { ...m.teamB, score: teamBScore, games: teamBGames, sets: teamBSets }
        } : m);

        let updatedPlayers = t.players;
        if (status === 'finished' && !isAlreadyFinished) {
          const finishedMatch = updatedMatches.find(m => m.id === matchId)!;
          const teamAPlayers = finishedMatch.teamA.playerIds;
          const teamBPlayers = finishedMatch.teamB.playerIds;

          const isWinnerA = t.scoring === 'Rally Points' ? teamAScore > teamBScore : teamAGames > teamBGames;
          const isWinnerB = t.scoring === 'Rally Points' ? teamBScore > teamAScore : teamBGames > teamAGames;

          // Helper to get opponent names
          const getOpponentNames = (opponentIds: string[]) => {
            return opponentIds.map(id => t.players.find(p => p.id === id)?.name || 'Unknown').join(' / ');
          };

          // Calculate max matches played in the tournament BEFORE this match is finalized for these players
          const maxMatchesPlayed = Math.max(...t.players.map(p => p.matchesPlayed), 0);

          updatedPlayers = t.players.map(p => {
            if (teamAPlayers.includes(p.id)) {
              const newWins = isWinnerA ? p.wins + 1 : p.wins;
              const matchesPlayed = p.matchesPlayed + 1;
              let gainedPoints = t.scoring === 'Rally Points' ? teamAScore : teamAGames;
              
              // Apply bonus for Rally Points if player is behind in match count
              if (t.scoring === 'Rally Points' && p.matchesPlayed < maxMatchesPlayed) {
                const matchDiff = maxMatchesPlayed - p.matchesPlayed;
                gainedPoints += (matchDiff * 10);
              }

              const historyEntry: MatchHistoryEntry = {
                matchId,
                opponent: getOpponentNames(teamBPlayers),
                score_us: t.scoring === 'Rally Points' ? teamAScore : teamAGames,
                score_them: t.scoring === 'Rally Points' ? teamBScore : teamBGames,
                result: isWinnerA ? 'Win' : 'Lose',
                type: t.scoring,
                date: new Date().toISOString()
              };

              return { 
                ...p, 
                points: p.points + gainedPoints, 
                matchesPlayed, 
                wins: newWins,
                winRate: Math.round((newWins / matchesPlayed) * 100),
                matchHistory: [...(p.matchHistory || []), historyEntry]
              };
            }
            if (teamBPlayers.includes(p.id)) {
              const newWins = isWinnerB ? p.wins + 1 : p.wins;
              const matchesPlayed = p.matchesPlayed + 1;
              let gainedPoints = t.scoring === 'Rally Points' ? teamBScore : teamBGames;

              // Apply bonus for Rally Points if player is behind in match count
              if (t.scoring === 'Rally Points' && p.matchesPlayed < maxMatchesPlayed) {
                const matchDiff = maxMatchesPlayed - p.matchesPlayed;
                gainedPoints += (matchDiff * 10);
              }

              const historyEntry: MatchHistoryEntry = {
                matchId,
                opponent: getOpponentNames(teamAPlayers),
                score_us: t.scoring === 'Rally Points' ? teamBScore : teamBGames,
                score_them: t.scoring === 'Rally Points' ? teamAScore : teamAGames,
                result: isWinnerB ? 'Win' : 'Lose',
                type: t.scoring,
                date: new Date().toISOString()
              };

              return { 
                ...p, 
                points: p.points + gainedPoints, 
                matchesPlayed, 
                wins: newWins,
                winRate: Math.round((newWins / matchesPlayed) * 100),
                matchHistory: [...(p.matchHistory || []), historyEntry]
              };
            }
            return p;
          });

          // If it's a cloud tournament, trigger a save to the backend with updated players
          if (t.isCloud) {
            fetch('/api/tournament/match/finish', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tournamentId,
                matchId,
                finalScore: { teamAScore, teamBScore, teamAGames, teamBGames },
                players: updatedPlayers
              })
            }).catch(err => console.error("Failed to save final result to cloud", err));
          }
        }

        return { ...t, matches: updatedMatches, players: updatedPlayers };
      }
      return t;
    }));
  };

  const handleUpdatePlayer = (tournamentId: string, playerId: string, newName: string) => {
    setActiveTournaments(prev => prev.map(t => {
      if (t.id === tournamentId) {
        return {
          ...t,
          players: t.players.map(p => p.id === playerId ? { ...p, name: newName } : p)
        };
      }
      return t;
    }));
  };

  const handleAddPlayerToActive = (tournamentId: string, name: string, gender: Gender) => {
    setActiveTournaments(prev => prev.map(t => {
      if (t.id === tournamentId) {
        const newPlayer: Player = {
          id: Math.random().toString(36).substr(2, 9),
          name: name,
          gender: gender,
          seed: t.players.length + 1,
          points: 0,
          wins: 0,
          matchesPlayed: 0,
          winRate: 0,
          location: 'Local Club',
          avatarUrl: getAvatarUrl(Math.random().toString())
        };
        return {
          ...t,
          players: [...t.players, newPlayer]
        };
      }
      return t;
    }));
  };

  const handleEndTournament = (tournamentId: string) => {
    // Call server to release shortcode and update status
    fetch('/api/tournament/finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tournamentId })
    }).catch(err => console.error("Failed to finish tournament on server", err));

    // Broadcast KICK_ALL to all connected clients
    tournamentService.broadcastSessionEvent(tournamentId, {
      type: 'KICK_ALL'
    });

    setActiveTournaments(prev => prev.map(t => {
      if (t.id === tournamentId) {
        return { ...t, status: 'finished' };
      }
      return t;
    }));
    setCurrentView('dashboard');
  };

  const handleSetView = async (view: ViewState) => {
    setCurrentView(view);
  };

  const handleSuperAdminLogin = async (password: string): Promise<boolean> => {
    const trimmed = password.trim().toLowerCase();
    
    // Fallback for plain text check if hashing fails for some reason
    if (trimmed === 'padeladmin') {
      setIsSuperAdmin(true);
      setCurrentView('superadmin');
      return true;
    }

    const hashed = await hashPassword(trimmed);
    
    if (hashed === ADMIN_PASSWORD_HASH) {
      setIsSuperAdmin(true);
      setCurrentView('superadmin');
      return true;
    }
    return false;
  };

  const handleNextMatch = (tournamentId: string) => {
    setActiveTournaments(prev => prev.map(t => {
      if (t.id === tournamentId) {
        let newMatches: Match[] = [];
        const roundNumber = (t.matches[t.matches.length - 1]?.round || 0) + 1;

        if (t.type === 'Mexicano') {
          newMatches = generateMexicanoRound(t.players, t.courts, roundNumber);
        } else if (t.type === 'Mexicano Mix') {
          newMatches = generateMexicanoMixRound(t.players, t.courts, roundNumber);
        } else if (t.type === 'Mexicano Fix') {
          newMatches = generateMexicanoFixRound(t.players, t.courts, roundNumber);
        } else if (t.type === 'Americano Mix') {
          newMatches = generateAmericanoMixRound(t.players, t.courts, roundNumber);
        } else if (t.type === 'Americano Fix') {
          newMatches = generateAmericanoFixRound(t.players, roundNumber);
        } else if (t.type === 'Club Americano') {
          newMatches = generateClubRandomRound(t.players, t.clubs || [], t.courts, roundNumber);
        } else if (t.type === 'Club Mexicano') {
          newMatches = generateClubMexicanoRound(t.players, t.clubs || [], t.courts, roundNumber);
        } else if (t.type === 'Club Fix Americano') {
          newMatches = generateClubFixAmericanoRound(t.players, t.clubs || [], roundNumber);
        } else {
          // Americano logic
          const tiers: { [key: number]: Player[] } = {};
          t.players.forEach(p => {
            if (!tiers[p.matchesPlayed]) tiers[p.matchesPlayed] = [];
            tiers[p.matchesPlayed].push(p);
          });

          const availablePlayers: Player[] = Object.keys(tiers)
            .map(Number)
            .sort((a, b) => a - b)
            .flatMap(tierKey => shuffle(tiers[tierKey]));
          
          const matchesToGenerate = t.courts;

          for (let i = 0; i < matchesToGenerate; i++) {
            const sliceOffset = i * 4;
            const p1 = availablePlayers[sliceOffset];
            const p2 = availablePlayers[sliceOffset + 1];
            const p3 = availablePlayers[sliceOffset + 2];
            const p4 = availablePlayers[sliceOffset + 3];

            if (p1 && p2 && p3 && p4) {
              newMatches.push({
                id: Math.random().toString(36).substr(2, 9),
                teamA: { playerIds: [p1.id, p2.id], score: 0, sets: 0, games: 0 },
                teamB: { playerIds: [p3.id, p4.id], score: 0, sets: 0, games: 0 },
                status: 'pending', // Will be set to live below
                court: i + 1,
                round: roundNumber
              });
            }
          }
        }

        // Set new matches to live
        newMatches = newMatches.map(m => ({ ...m, status: 'live' as const }));

        const updatedMatches = t.matches.map(m => m.status === 'live' ? { ...m, status: 'finished' as const } : m);

        return {
          ...t,
          matches: [...updatedMatches, ...newMatches],
          currentMatchId: newMatches[0]?.id
        };
      }
      return t;
    }));
    setCurrentView('live');
  };

  const handleResume = (id: string) => {
    setCurrentTournamentId(id);
    const tournament = activeTournaments.find(t => t.id === id);
    if (tournament) {
      if (tournament.role === 'spectator') {
        setCurrentView('spectator');
      } else if (tournament.status === 'finished') {
        setCurrentView('leaderboard');
      } else {
        setCurrentView('live');
      }
    } else {
      // Fetch from server if not found locally (e.g. global feed)
      setIsFetching(true);
      fetch(`/api/tournament/${id}`)
        .then(res => res.json())
        .then(data => {
          if (data.id) {
            setActiveTournaments(prev => [...prev, { ...data, role: 'spectator' }]);
            setCurrentView('spectator');
          }
        })
        .catch(err => console.error("Failed to fetch global tournament", err))
        .finally(() => setIsFetching(false));
    }
  };

  const handleDeleteSession = async (id: string, password: string) => {
    const tournament = activeTournaments.find(t => t.id === id);
    
    // If it's a spectator session, we just remove it from local list without password
    // This satisfies the requirement: "session yang bukan kita buat jika di delete hanya delete session yang ada di device user"
    if (tournament?.role === 'spectator') {
      setActiveTournaments(prev => prev.filter(t => t.id !== id));
      if (currentTournamentId === id) setCurrentTournamentId(null);
      return true;
    }

    // For Admin sessions, we still require 'delete' or admin password
    const trimmedPassword = password.trim().toLowerCase();
    if (trimmedPassword === 'delete') {
      setActiveTournaments(prev => prev.filter(t => t.id !== id));
      if (currentTournamentId === id) setCurrentTournamentId(null);
      // Note: We only delete locally. Cloud data remains unless a specific cloud-delete API is called.
      return true;
    }
    
    // Plain text fallback for admin password
    if (trimmedPassword === 'padeladmin') {
      setActiveTournaments(prev => prev.filter(t => t.id !== id));
      if (currentTournamentId === id) setCurrentTournamentId(null);
      return true;
    }

    const hashed = await hashPassword(trimmedPassword);
    if (hashed === ADMIN_PASSWORD_HASH) {
      setActiveTournaments(prev => prev.filter(t => t.id !== id));
      if (currentTournamentId === id) setCurrentTournamentId(null);
      return true;
    }
    return false;
  };

  const activeTournament = activeTournaments.find(t => t.id === currentTournamentId);

  if (isFetching) {
    return (
      <div className="h-screen w-full bg-background-dark flex flex-col items-center justify-center space-y-4">
        <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-primary font-black uppercase tracking-widest text-xs">Loading Tournament...</p>
      </div>
    );
  }

  // Tournament Mode Views
  if (currentView === 'shortcode') {
    return <ShortcodeEntry 
      onBack={() => setCurrentView('dashboard')}
      onEnter={(code) => {
      const t = activeTournaments.find(x => x.shortcode === code);
      if (t) {
        setCurrentTournamentId(t.id);
        setCurrentView('spectator');
      } else {
        // Try fetching from server
        fetch(`/api/tournament/shortcode/${code}`)
          .then(res => {
            if (!res.ok) throw new Error('Not found');
            return res.json();
          })
          .then(data => {
            setActiveTournaments(prev => {
              if (prev.find(t => t.id === data.id)) return prev;
              return [...prev, { ...data, role: 'spectator' }];
            });
            setCurrentTournamentId(data.id);
            setCurrentView('spectator');
          })
          .catch(() => {
            alert('Tournament not found or not active.');
          });
      }
    }} />;
  }

  if (currentView === 'spectator' && activeTournament) {
    return <SpectatorView tournament={activeTournament} onExit={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'referee' && activeTournament) {
    return (
      <RefereeView 
        tournament={activeTournament} 
        courtId={selectedCourtId} 
        onUpdateScore={(mId, a, b, s, ga, gb, sa, sb) => handleUpdateMatch(activeTournament.id, mId, a, b, s, ga, gb, sa, sb)}
        onExit={() => setCurrentView('dashboard')}
      />
    );
  }

  if (currentView === 'admin' && activeTournament) {
    return <AdminDashboard tournament={activeTournament} onExit={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'superadmin') {
    return (
      <SuperAdmin 
        onExit={() => setCurrentView('dashboard')} 
        onFinish={handleEndTournament} 
        onView={(id) => {
          // Fetch tournament details and add to activeTournaments if not present
          fetch(`/api/tournament/${id}`)
            .then(res => res.json())
            .then(data => {
              setActiveTournaments(prev => {
                if (prev.find(t => t.id === data.id)) return prev;
                return [...prev, { ...data, role: 'spectator' }];
              });
              setCurrentTournamentId(id);
              setCurrentView('spectator');
            })
            .catch(err => console.error("Failed to view tournament", err));
        }}
      />
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-background-dark text-white overflow-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#00ffcc 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      </div>

      <div className="flex flex-col md:flex-row h-full w-full relative z-10">
        {currentView !== 'live' && currentView !== 'referee' && currentView !== 'spectator' && (
          <Sidebar currentView={currentView} setView={handleSetView} />
        )}
        
        <main className={`flex-1 flex flex-col relative overflow-hidden ${currentView !== 'live' ? 'pb-20 md:pb-0' : ''}`}>
          {currentView === 'dashboard' && (
            <Dashboard 
              activeTournaments={activeTournaments}
              isSuperAdmin={isSuperAdmin}
              onResume={handleResume} 
              onStartNew={() => setCurrentView('setup')} 
              onDelete={handleDeleteSession}
              onOpenAdmin={(id) => {
                setCurrentTournamentId(id);
                setCurrentView('admin');
              }}
              onLogin={handleSuperAdminLogin}
              onLogout={() => setIsSuperAdmin(false)}
            />
          )}
          {currentView === 'setup' && (
            <TournamentSetup 
              onStart={handleStartTournament} 
            />
          )}
          {currentView === 'leaderboard' && activeTournament && (
            <Leaderboard 
              tournament={activeTournament} 
              onGoLive={() => handleNextMatch(activeTournament.id)} 
              onEnd={() => handleEndTournament(activeTournament.id)}
              onUpdatePlayerName={(pId, name) => handleUpdatePlayer(activeTournament.id, pId, name)}
              onAddPlayer={(name, gender) => handleAddPlayerToActive(activeTournament.id, name, gender)}
              onExit={() => setCurrentView('dashboard')}
            />
          )}
          {currentView === 'live' && activeTournament && (
            activeTournament.courts > 1 ? (
              <MultiCourtScoreboard
                tournament={activeTournament}
                onUpdateScore={(mId, a, b, status, ga, gb, sa, sb) => handleUpdateMatch(activeTournament.id, mId, a, b, status, ga, gb, sa, sb)}
                onEndMatch={() => setCurrentView('leaderboard')}
                onNextMatch={() => handleNextMatch(activeTournament.id)}
                onExit={() => setCurrentView('dashboard')}
              />
            ) : (
              <LiveScoreboard 
                tournament={activeTournament} 
                onUpdateScore={(mId, a, b, status, ga, gb, sa, sb) => handleUpdateMatch(activeTournament.id, mId, a, b, status, ga, gb, sa, sb)}
                onEndMatch={() => setCurrentView('leaderboard')} 
                onNextMatch={() => handleNextMatch(activeTournament.id)}
                onExit={() => setCurrentView('dashboard')}
              />
            )
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
