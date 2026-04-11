
import React, { useState, useEffect } from 'react';

interface TournamentInfo {
  id: string;
  name: string;
  shortcode: string;
  status: 'active' | 'finished';
  courts: number;
  activeCourts: number;
  lastActivity: number;
}

interface SuperAdminProps {
  onExit: () => void;
  onFinish: (id: string) => void;
  onView: (id: string) => void;
}

const SuperAdmin: React.FC<SuperAdminProps> = ({ onExit, onFinish, onView }) => {
  const [tournaments, setTournaments] = useState<TournamentInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTournaments = () => {
    setLoading(true);
    fetch('/api/admin/tournaments')
      .then(res => res.json())
      .then(data => setTournaments(data))
      .catch(err => console.error("Failed to fetch tournaments", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTournaments();
    const interval = setInterval(fetchTournaments, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full bg-background-dark text-white overflow-hidden">
      <header className="h-20 border-b border-border-dark flex items-center justify-between px-8 bg-background-dark/50 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="size-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
            <span className="material-symbols-outlined">admin_panel_settings</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Super Admin Control</h1>
            <p className="text-slate-500 text-sm">Global Tournament Lifecycle Management</p>
          </div>
        </div>
        <button 
          onClick={onExit}
          className="px-6 h-12 bg-white/5 border border-white/10 rounded-xl font-bold text-sm hover:bg-white/10 transition-all"
        >
          Exit Admin
        </button>
      </header>

      <main className="flex-1 p-8 overflow-y-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="bg-surface-dark border border-border-dark rounded-3xl overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Tournament Name</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Shortcode</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Courts</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Last Activity</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading && tournaments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center text-slate-500 font-bold uppercase tracking-widest">
                      Loading global data...
                    </td>
                  </tr>
                ) : tournaments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center text-slate-500 font-bold uppercase tracking-widest">
                      No tournaments found on server
                    </td>
                  </tr>
                ) : (
                  tournaments.map(t => (
                    <tr key={t.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-white">{t.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{t.id}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg font-black text-xs tracking-widest border border-primary/20">
                          {t.shortcode || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-widest border ${
                          t.status === 'active' 
                            ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                            : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold">
                        {t.activeCourts} / {t.courts}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {t.lastActivity ? new Date(t.lastActivity).toLocaleString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => onView(t.id)}
                            className="bg-primary text-background-dark px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
                          >
                            View
                          </button>
                          {t.status === 'active' && (
                            <button 
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to FORCE FINISH "${t.name}"? This will kick all users.`)) {
                                  onFinish(t.id);
                                  setTimeout(fetchTournaments, 500);
                                }
                              }}
                              className="bg-red-500 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
                            >
                              Force Finish
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SuperAdmin;
