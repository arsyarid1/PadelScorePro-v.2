
import React, { useState, useEffect, useRef } from 'react';
import { Player, Gender, GameType, ScoringFormat, TennisRule, CustomMatchType, Club } from '../types';
import { getAvatarUrl } from '../utils/avatar';
import { 
  ChevronDown, 
  Users, 
  UserPlus, 
  Trophy, 
  Settings2, 
  Shield, 
  Zap, 
  Target, 
  Dribbble,
  Check,
  Info,
  Layers,
  Shuffle,
  TrendingUp,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TournamentSetupProps {
  onStart: (config: any) => void;
}

const GAME_CATEGORIES = [
  {
    id: 'americano',
    name: 'Americano',
    icon: <Shuffle className="size-4" />,
    description: 'Rotational play where everyone pairs with everyone.',
    types: ['Americano', 'Americano Mix', 'Americano Fix'] as GameType[]
  },
  {
    id: 'mexicano',
    name: 'Mexicano',
    icon: <TrendingUp className="size-4" />,
    description: 'Dynamic ranking system for balanced competition.',
    types: ['Mexicano', 'Mexicano Mix', 'Mexicano Fix'] as GameType[]
  },
  {
    id: 'club',
    name: 'Club Match',
    icon: <Building2 className="size-4" />,
    description: 'Inter-club battle for ultimate bragging rights.',
    types: ['Club Americano', 'Club Mexicano', 'Club Fix Americano'] as GameType[]
  }
];

const TournamentSetup: React.FC<TournamentSetupProps> = ({ onStart }) => {
  const [name, setName] = useState('New Padel Cup');
  const [type, setType] = useState<GameType>('Americano');
  const [activeCategory, setActiveCategory] = useState<'americano' | 'mexicano' | 'club'>('americano');
  const [scoring, setScoring] = useState<ScoringFormat>('Rally Points');
  const [customMatchType, setCustomMatchType] = useState<CustomMatchType>('Race to');
  const [tennisRule, setTennisRule] = useState<TennisRule>('Advantage');
  const [maxPoints, setMaxPoints] = useState(21);
  const [targetGames, setTargetGames] = useState(4);
  const [courts, setCourts] = useState(1);
  const [isCloud, setIsCloud] = useState(false);
  const [shortcode, setShortcode] = useState('');
  const [availableShortcodes, setAvailableShortcodes] = useState<string[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (isCloud) {
      fetch('/api/shortcodes/available')
        .then(res => res.json())
        .then(data => {
          setAvailableShortcodes(data);
          if (data.length > 0 && !shortcode) {
            setShortcode(data[0]);
          }
        })
        .catch(err => console.error("Failed to fetch shortcodes", err));
    }
  }, [isCloud]);

  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerGender, setNewPlayerGender] = useState<Gender>('male');
  const [clubs, setClubs] = useState<Club[]>([
    { id: 'c1', name: 'Club A' },
    { id: 'c2', name: 'Club B' }
  ]);
  const [newClubName, setNewClubName] = useState('');
  const [selectedClubId, setSelectedClubId] = useState<string>('c1');

  useEffect(() => {
    if (type.startsWith('Club')) setActiveCategory('club');
    else if (type.includes('Mexicano')) setActiveCategory('mexicano');
    else setActiveCategory('americano');
  }, [type]);

  const gameTypeDescriptions: Record<GameType, string> = {
    'Americano': 'Players rotate partners every round. Everyone plays with everyone else. Individual points are tracked.',
    'Americano Mix': 'Rotational system where each team must have 1 Male and 1 Female. Partners change every match.',
    'Americano Fix': 'Fixed partners for the entire session. Teams play against all other teams in a Round Robin format.',
    'Mexicano': 'Players are paired based on their current ranking. Higher-ranked players play together or against each other.',
    'Mexicano Mix': 'Ranked pairing system that strictly maintains mixed-gender teams (1 Male + 1 Female).',
    'Mexicano Fix': 'Fixed partners for the entire session. Teams are paired based on their total Power Ranking.',
    'Club Americano': 'Random partners within the same club. Matches are always Club vs Club. Partners rotate.',
    'Club Mexicano': 'Power Ranking pairing within the club. Matches are always Club vs Club.',
    'Club Fix Americano': 'Fixed partners within the club. Matches are always Club vs Club.'
  };

  const scoringDescriptions: Record<ScoringFormat, string> = {
    'Tournament Pro': 'Standard tennis scoring (0, 15, 30, 40) with Sets and Tie-breaks. Best of 3 sets.',
    'Custom Match': 'Fast-paced tennis scoring (0, 15, 30, 40) without sets. Choose "Race to" or "Best of" games.',
    'Rally Points': 'Simple point-by-point scoring (1, 2, 3...). First to reach the target points wins.',
    'Tennis Classic': ''
  };

  const tennisSubModeDescriptions: Record<CustomMatchType, string> = {
    'Tournament Pro': 'Professional format: Best of 3 sets with tie-breaks at 6-6.',
    'Race to': 'First team to reach the target number of games wins the match.',
    'Best of': 'Play a fixed number of games; team with most games wins.'
  };

  const addPlayer = () => {
    if (!newPlayerName.trim()) return;
    const newPlayer: Player = {
      id: Math.random().toString(36).substr(2, 9),
      name: newPlayerName,
      gender: newPlayerGender,
      seed: players.length + 1,
      points: 0,
      wins: 0,
      matchesPlayed: 0,
      winRate: 0,
      location: 'Local Club',
      avatarUrl: getAvatarUrl(Math.random().toString()),
      clubId: isClubMatch ? selectedClubId : undefined
    };
    setPlayers([...players, newPlayer]);
    setNewPlayerName('');
  };

  const addClub = () => {
    if (!newClubName.trim()) return;
    const newClub: Club = {
      id: Math.random().toString(36).substr(2, 9),
      name: newClubName
    };
    setClubs([...clubs, newClub]);
    setNewClubName('');
    if (clubs.length === 0) setSelectedClubId(newClub.id);
  };

  const removeClub = (id: string) => {
    if (clubs.length <= 2) {
      alert("Minimum 2 clubs required for Club Match.");
      return;
    }
    setClubs(clubs.filter(c => c.id !== id));
    setPlayers(players.filter(p => p.clubId !== id));
    if (selectedClubId === id) setSelectedClubId(clubs.find(c => c.id !== id)?.id || '');
  };

  const toggleGender = (id: string) => {
    setPlayers(prev => prev.map(p => 
      p.id === id ? { ...p, gender: p.gender === 'male' ? 'female' : 'male' } : p
    ));
  };

  const isOdd = players.length % 2 !== 0;
  const isFix = type === 'Americano Fix' || type === 'Mexicano Fix' || type === 'Club Fix Americano';
  const isMexicano = type === 'Mexicano' || type === 'Mexicano Mix' || type === 'Mexicano Fix' || type === 'Club Mexicano';
  const isMexicanoMix = type === 'Mexicano Mix';
  const isAmericanoMix = type === 'Americano Mix';
  const isClubMatch = type.startsWith('Club');
  
  const malesCount = players.filter(p => p.gender === 'male').length;
  const femalesCount = players.filter(p => p.gender === 'female').length;
  const isMixBalanced = malesCount === femalesCount && malesCount >= 2;

  const isFixValid = players.length > 0 && players.length % 4 === 0;

  // Club Match Validation: Balanced players per club
  const clubCounts = clubs.map(c => players.filter(p => p.clubId === c.id).length);
  const isClubBalanced = clubCounts.length >= 2 && clubCounts.every(count => count > 0 && count === clubCounts[0]);
  const isClubFixValid = isClubBalanced && clubCounts[0] % 2 === 0; // Each club needs even players for pairs

  const canStart = players.length >= 4 && 
    (!isMexicano || !isOdd) && 
    (!(isMexicanoMix || isAmericanoMix) || isMixBalanced) &&
    (!isFix || isFixValid) &&
    (!isClubMatch || (isClubBalanced && (!isFix || isClubFixValid)));

  const handleFinalStart = () => {
    if (players.length < 4) {
      alert("Need at least 4 players for a match!");
      return;
    }
    if (isClubMatch && !isClubBalanced) {
      alert("Club Match requires an equal number of players from each club.");
      return;
    }
    if (type === 'Club Fix Americano' && !isClubFixValid) {
      alert("Club Fix Americano requires an even number of players in each club to form pairs.");
      return;
    }
    if (isFix && !isClubMatch && !isFixValid) {
      alert("Fixed Partner modes require a multiple of 4 players (4, 8, 12...) to ensure an even number of teams.");
      return;
    }
    if (isMexicano && isOdd) {
      alert("Mexicano requires an even number of players to form fixed pairs.");
      return;
    }
    if ((isMexicanoMix || isAmericanoMix) && !isMixBalanced) {
      alert("Mix modes require an equal number of male and female players (at least 2 each).");
      return;
    }
    
    let finalScoring = scoring;
    let finalCustomType = customMatchType;
    
    if (scoring === 'Tennis Classic') {
      if (customMatchType === 'Tournament Pro') {
        finalScoring = 'Tournament Pro';
        finalCustomType = undefined as any;
      } else {
        finalScoring = 'Custom Match';
      }
    }

    onStart({ 
      name, 
      type, 
      scoring: finalScoring, 
      customMatchType: finalScoring === 'Custom Match' ? finalCustomType : undefined,
      tennisRule, 
      maxPoints: scoring === 'Rally Points' ? maxPoints : targetGames, 
      courts, 
      players,
      clubs: isClubMatch ? clubs : undefined,
      isCloud,
      shortcode: isCloud ? shortcode : undefined
    });
  };

  return (
    <div className="flex flex-col h-full bg-background-dark overflow-y-auto lg:overflow-hidden">
      <header className="h-16 md:h-20 border-b border-border-dark flex items-center justify-between px-6 md:px-8 bg-background-dark/50 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-4">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Settings2 className="size-6" />
          </div>
          <div>
            <h1 className="text-lg md:text-2xl font-bold tracking-tight text-white">Match Setup</h1>
            <p className="text-slate-500 text-[10px] md:text-sm hidden sm:block">Configure your tournament parameters</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((step) => (
            <div 
              key={step} 
              className={`size-2 rounded-full transition-all duration-500 ${step <= 3 ? 'bg-primary w-6' : 'bg-white/10'}`} 
            />
          ))}
        </div>
      </header>

      <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden">
        {/* Left Section: Config */}
        <section className="w-full lg:w-1/2 p-6 md:p-8 border-b lg:border-b-0 lg:border-r border-border-dark overflow-y-auto custom-scrollbar shrink-0">
          <div className="max-w-md mx-auto space-y-10">
            <div className="space-y-4 p-4 bg-primary/5 border border-primary/10 rounded-2xl">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest text-primary/70 flex items-center gap-2">
                  <Zap className="size-3" /> Cloud Connectivity
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Real-time Broadcaster</span>
                  <button 
                    onClick={() => setIsCloud(!isCloud)}
                    className={`w-10 h-5 rounded-full transition-all relative ${isCloud ? 'bg-primary' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 size-3 rounded-full bg-white transition-all ${isCloud ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              </div>
              {isCloud && (
                <div className="relative group animate-in slide-in-from-top-2 duration-300">
                  {availableShortcodes.length > 0 ? (
                    <select 
                      value={shortcode}
                      onChange={e => setShortcode(e.target.value)}
                      className="w-full h-14 bg-background-dark border border-primary/30 rounded-xl px-6 text-white text-sm font-bold focus:border-primary transition-all appearance-none"
                    >
                      {availableShortcodes.map(code => (
                        <option key={code} value={code}>{code}</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      value={shortcode}
                      onChange={e => setShortcode(e.target.value.toUpperCase())}
                      className="w-full h-14 bg-background-dark border border-primary/30 rounded-xl px-6 text-white text-sm font-bold focus:border-primary transition-all placeholder:text-slate-700" 
                      placeholder="Enter Shortcode (e.g. PADEL24)" 
                      maxLength={20}
                    />
                  )}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary/50 pointer-events-none">
                    <span className="material-symbols-outlined text-lg">cloud_sync</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest text-primary/70 flex items-center gap-2">
                  <Trophy className="size-3" /> Tournament Name
                </label>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Step 01/04</span>
              </div>
              <div className="relative group">
                <input 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full h-16 bg-surface-dark border border-border-dark rounded-2xl px-6 text-white text-lg font-bold focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-700" 
                  placeholder="e.g. Weekend Warriors Cup" 
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-primary transition-colors">
                  <Trophy className="size-5" />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-8">
              {/* Game Category Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-primary/70 flex items-center gap-2">
                    <Layers className="size-3" /> Game Category
                  </label>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Step 02/04</span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 p-1 bg-surface-dark rounded-2xl border border-border-dark">
                  {GAME_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setActiveCategory(cat.id as any);
                        setType(cat.types[0]);
                      }}
                      className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl transition-all relative overflow-hidden ${activeCategory === cat.id ? 'bg-primary text-background-dark shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                    >
                      {activeCategory === cat.id && (
                        <motion.div 
                          layoutId="cat-bg"
                          className="absolute inset-0 bg-primary"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      <div className="relative z-10 flex flex-col items-center gap-1.5">
                        {React.cloneElement(cat.icon as React.ReactElement, { 
                          className: `size-5 ${activeCategory === cat.id ? 'text-background-dark' : 'text-primary'}` 
                        })}
                        <span className="text-[10px] font-black uppercase tracking-widest">{cat.name}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeCategory}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-1 gap-2"
                  >
                    <div className="px-1 mb-1">
                      <p className="text-[11px] text-slate-500 font-medium italic">
                        {GAME_CATEGORIES.find(c => c.id === activeCategory)?.description}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {GAME_CATEGORIES.find(c => c.id === activeCategory)?.types.map((t) => (
                        <button
                          key={t}
                          onClick={() => setType(t)}
                          className={`group flex items-center justify-between p-4 rounded-2xl border transition-all ${type === t ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(0,255,204,0.1)]' : 'bg-surface-dark border-border-dark hover:border-white/20'}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`size-10 rounded-xl flex items-center justify-center transition-all ${type === t ? 'bg-primary text-background-dark' : 'bg-white/5 text-slate-500 group-hover:text-white'}`}>
                              {t.includes('Mix') ? <Users className="size-5" /> : t.includes('Fix') ? <Shield className="size-5" /> : <Shuffle className="size-5" />}
                            </div>
                            <div className="text-left">
                              <span className={`block text-sm font-bold ${type === t ? 'text-primary' : 'text-white'}`}>{t}</span>
                              <span className="block text-[10px] text-slate-500 font-medium">
                                {t.includes('Mix') ? 'Mixed Gender (1M + 1F)' : t.includes('Fix') ? 'Fixed Partners (Permanent)' : 'Individual Rotation'}
                              </span>
                            </div>
                          </div>
                          <div className={`size-6 rounded-full border flex items-center justify-center transition-all ${type === t ? 'bg-primary border-primary text-background-dark' : 'border-white/10 text-transparent'}`}>
                            <Check className="size-3.5 font-black" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>

                <motion.div 
                  key={type + "-desc"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3 p-4 bg-white/5 border border-white/5 rounded-2xl"
                >
                  <Info className="size-4 text-slate-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-400 leading-relaxed italic">
                    {gameTypeDescriptions[type]}
                  </p>
                </motion.div>
              </div>

              {/* Scoring System Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-primary/70 flex items-center gap-2">
                    <Trophy className="size-3" /> Scoring System
                  </label>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Step 03/04</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 p-1 bg-surface-dark rounded-2xl border border-border-dark">
                  <button 
                    onClick={() => setScoring('Rally Points')} 
                    className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl transition-all relative overflow-hidden ${scoring === 'Rally Points' ? 'bg-primary text-background-dark shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                  >
                    {scoring === 'Rally Points' && (
                      <motion.div layoutId="score-bg" className="absolute inset-0 bg-primary" />
                    )}
                    <div className="relative z-10 flex flex-col items-center gap-1.5">
                      <Zap className={`size-5 ${scoring === 'Rally Points' ? 'text-background-dark' : 'text-primary'}`} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Rally Points</span>
                    </div>
                  </button>
                  <button 
                    onClick={() => setScoring('Tennis Classic')} 
                    className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl transition-all relative overflow-hidden ${scoring === 'Tennis Classic' ? 'bg-primary text-background-dark shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                  >
                    {scoring === 'Tennis Classic' && (
                      <motion.div layoutId="score-bg" className="absolute inset-0 bg-primary" />
                    )}
                    <div className="relative z-10 flex flex-col items-center gap-1.5">
                      <Dribbble className={`size-5 ${scoring === 'Tennis Classic' ? 'text-background-dark' : 'text-primary'}`} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Tennis Classic</span>
                    </div>
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {scoring === 'Tennis Classic' ? (
                    <motion.div 
                      key="tennis-sub"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/5 overflow-hidden"
                    >
                      <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Format Selection</label>
                      <div className="grid grid-cols-1 gap-2">
                        {(['Tournament Pro', 'Race to', 'Best of'] as CustomMatchType[]).map((m) => (
                          <button 
                            key={m}
                            onClick={() => setCustomMatchType(m)}
                            className={`flex items-center justify-between px-4 py-3 rounded-xl text-[10px] font-bold transition-all ${customMatchType === m ? 'bg-primary/20 text-primary border border-primary/30' : 'text-slate-500 hover:bg-white/5'}`}
                          >
                            <span>{m === 'Tournament Pro' ? 'Professional Sets' : m === 'Race to' ? 'Race to N Games' : 'Best of N Games'}</span>
                            {customMatchType === m && <Check className="size-3" />}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <div className="flex gap-3 px-1">
                  <Info className="size-3.5 text-slate-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-500 leading-relaxed italic">
                    {scoring === 'Tennis Classic' 
                      ? tennisSubModeDescriptions[customMatchType]
                      : scoringDescriptions[scoring]}
                  </p>
                </div>
              </div>
            </div>

            {scoring === 'Tennis Classic' && customMatchType !== 'Tournament Pro' && (
              <div className="space-y-4 p-4 bg-surface-dark/50 rounded-2xl border border-white/5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Target Games (N)</label>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Target Games (N)</span>
                    <span className="text-primary font-black">{targetGames}</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="21" 
                    value={targetGames} 
                    onChange={e => setTargetGames(parseInt(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 bg-surface-dark border border-border-dark rounded-xl px-4 h-14 focus-within:border-primary transition-all">
                <Settings2 className="size-4 text-primary/70 shrink-0" />
                <div className="flex-1 min-w-0">
                  <label className="block text-[8px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Courts</label>
                  <select 
                    value={courts}
                    onChange={e => setCourts(parseInt(e.target.value))}
                    className="w-full bg-transparent text-white focus:outline-none appearance-none font-bold text-xs"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                      <option key={n} value={n} className="bg-surface-dark">{n} Court{n > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-surface-dark border border-border-dark rounded-xl px-4 h-14 focus-within:border-primary transition-all">
                {scoring === 'Rally Points' ? <Target className="size-4 text-primary/70 shrink-0" /> : <Shield className="size-4 text-primary/70 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <label className="block text-[8px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">
                    {scoring === 'Rally Points' ? 'Target' : 'Rules'}
                  </label>
                  {scoring === 'Rally Points' ? (
                    <input 
                      type="number" 
                      value={maxPoints} 
                      onChange={e => setMaxPoints(parseInt(e.target.value))} 
                      className="w-full bg-transparent text-white font-bold text-xs focus:outline-none" 
                    />
                  ) : (
                    <select 
                      value={tennisRule}
                      onChange={e => setTennisRule(e.target.value as TennisRule)}
                      className="w-full bg-transparent text-white focus:outline-none appearance-none font-bold text-xs"
                    >
                      <option value="Advantage" className="bg-surface-dark">Advantage</option>
                      <option value="Golden Point" className="bg-surface-dark">Golden Point</option>
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Match Preview Visualization */}
            <div className="pt-6 border-t border-border-dark space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Info className="size-3" /> Match Preview
              </label>
              
              <div className="bg-surface-dark/30 rounded-2xl p-6 border border-border-dark relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  {type.startsWith('Club') ? <Building2 className="size-12" /> : <Shuffle className="size-12" />}
                </div>
                
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex -space-x-2">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="size-8 rounded-full bg-primary/20 border-2 border-background-dark flex items-center justify-center text-[10px] font-bold text-primary">
                          P{i}
                        </div>
                      ))}
                    </div>
                    <div className="h-px flex-1 bg-white/5"></div>
                    <span className="text-[10px] font-black text-primary uppercase">Court 1</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: '60%' }}
                          className="h-full bg-primary"
                        />
                      </div>
                      <span className="text-[9px] text-slate-500 uppercase font-bold">Team A (Club 1)</span>
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: '40%' }}
                          className="h-full bg-white/20"
                        />
                      </div>
                      <span className="text-[9px] text-slate-500 uppercase font-bold">Team B (Club 2)</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <Zap className="size-3 text-primary" />
                      <span className="text-[10px] text-slate-400">{scoring}: {scoring === 'Rally Points' ? maxPoints : targetGames}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="size-3 text-slate-500" />
                      <span className="text-[10px] text-slate-400">{type}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Section: Roster */}
        <section className="w-full lg:w-1/2 p-6 md:p-8 bg-surface-dark/20 flex flex-col lg:overflow-y-auto border-t lg:border-t-0 border-border-dark">
          <div className="max-w-md mx-auto w-full flex flex-col h-full space-y-8">
            {isClubMatch && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-[10px] font-bold uppercase tracking-widest text-primary/70 flex items-center gap-2">
                    <Building2 className="size-3" /> Club Management
                  </h2>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Required for Club Match</span>
                </div>
                
                <div className="flex gap-2">
                  <input 
                    value={newClubName}
                    onChange={e => setNewClubName(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && addClub()}
                    className="flex-1 h-12 bg-background-dark border border-border-dark rounded-xl px-4 text-white focus:border-primary transition-all text-sm font-bold" 
                    placeholder="Enter club name..." 
                  />
                  <button 
                    onClick={addClub}
                    className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center hover:bg-primary/20 transition-all shrink-0 border border-primary/20"
                  >
                    <UserPlus className="size-5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <AnimatePresence>
                    {clubs.map(c => (
                      <motion.div 
                        key={c.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-2 bg-surface-dark border border-border-dark px-3 py-2 rounded-xl"
                      >
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">{c.name}</span>
                        <button onClick={() => removeClub(c.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                          <span className="material-symbols-outlined text-xs">close</span>
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-primary/70 flex items-center gap-2">
                  <Users className="size-3" /> Player Roster ({players.length})
                </h2>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Step 04/04</span>
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1 flex flex-col gap-3">
                    <div className="relative">
                      <textarea 
                        value={newPlayerName}
                        onChange={e => setNewPlayerName(e.target.value)}
                        onKeyPress={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            addPlayer();
                          }
                        }}
                        className="w-full min-h-[80px] bg-background-dark border border-border-dark rounded-xl px-4 py-3 text-white focus:border-primary transition-all text-sm font-bold resize-none" 
                        placeholder="Player name..." 
                      />
                      <div className="absolute right-4 top-4 text-slate-600">
                        <UserPlus className="size-4" />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/5">
                        <button 
                          onClick={() => setNewPlayerGender('male')}
                          className={`px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${newPlayerGender === 'male' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          Male
                        </button>
                        <button 
                          onClick={() => setNewPlayerGender('female')}
                          className={`px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${newPlayerGender === 'female' ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          Female
                        </button>
                      </div>
                      
                      {isClubMatch && (
                        <div className="relative flex-1">
                          <select 
                            value={selectedClubId}
                            onChange={e => setSelectedClubId(e.target.value)}
                            className="w-full bg-surface-dark border border-border-dark rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white focus:border-primary outline-none appearance-none"
                          >
                            {clubs.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3 text-slate-500 pointer-events-none" />
                        </div>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={addPlayer}
                    className="w-14 h-14 bg-primary text-background-dark rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shrink-0 shadow-lg shadow-primary/20"
                  >
                    <UserPlus className="size-6" />
                  </button>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                  <AnimatePresence initial={false}>
                    {players.map((p, idx) => {
                      const isFirstInPair = idx % 2 === 0;
                      const playerClub = clubs.find(c => c.id === p.clubId);
                      
                      return (
                        <motion.div 
                          key={p.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="flex flex-col"
                        >
                          {(isMexicano || isFix) && isFirstInPair && (
                            <div className="flex items-center gap-2 mb-2 mt-2 px-1">
                              <span className="text-[8px] font-black text-primary uppercase tracking-widest">Team {Math.floor(idx / 2) + 1}</span>
                              <div className="h-px flex-1 bg-primary/20"></div>
                            </div>
                          )}
                          <div className="p-4 rounded-2xl flex items-center justify-between border bg-surface-dark border-border-dark hover:border-white/10 transition-all group">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <img src={p.avatarUrl} className="size-10 rounded-xl border border-primary/20" />
                                <div className={`absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-surface-dark flex items-center justify-center ${p.gender === 'male' ? 'bg-blue-500' : 'bg-pink-500'}`}>
                                  <span className="text-[8px] text-white font-black">{p.gender === 'male' ? 'M' : 'F'}</span>
                                </div>
                              </div>
                              <div className="flex flex-col gap-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-sm text-white break-words">{p.name}</span>
                                  {playerClub && (
                                    <span className="text-[8px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-black uppercase tracking-tighter border border-primary/20 shrink-0">
                                      {playerClub.name}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <button 
                                    onClick={() => toggleGender(p.id)}
                                    className="text-[9px] text-slate-500 hover:text-primary transition-colors font-bold uppercase tracking-widest"
                                  >
                                    Switch Gender
                                  </button>
                                </div>
                              </div>
                            </div>
                            <button 
                              onClick={() => setPlayers(players.filter(x => x.id !== p.id))} 
                              className="text-slate-600 hover:text-red-400 p-2 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  {players.length === 0 && (
                    <div className="py-12 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-white/5 rounded-3xl">
                      <Users className="size-12 mb-4 opacity-20" />
                      <p className="text-xs font-bold uppercase tracking-widest">No players added yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="relative mt-6 mb-6 lg:mt-8 lg:mb-0">
              <button 
                onClick={handleFinalStart}
                disabled={!canStart}
                className={`w-full h-20 rounded-2xl font-black uppercase tracking-widest text-xl transition-all relative overflow-hidden group ${canStart ? 'bg-primary text-background-dark hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_50px_rgba(0,255,204,0.3)]' : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50 shadow-none'}`}
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                <span className="relative z-10 flex items-center justify-center gap-3">
                  {players.length < 4 ? <UserPlus className="size-6" /> : <Trophy className="size-6" />}
                  {players.length < 4 ? 'Add Players' : 
                   (isClubMatch && !isClubBalanced) ? 'Balance Clubs' :
                   (type === 'Club Fix Americano' && !isClubFixValid) ? 'Even Pairs' :
                   (isFix && !isClubMatch && !isFixValid) ? 'Need 4, 8, 12...' : 
                   (isMexicano && isOdd) ? 'Fix Pairs' : 
                   ((isMexicanoMix || isAmericanoMix) && !isMixBalanced) ? 'Balance Gender' : 
                   'Initialize Tournament'}
                </span>
              </button>
              
              {canStart && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute -top-3 -right-3 size-8 bg-white text-background-dark rounded-full flex items-center justify-center font-black text-xs shadow-xl z-20"
                >
                  GO
                </motion.div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TournamentSetup;
