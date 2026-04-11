
import React from 'react';
import { ViewState } from '../types';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: 'dashboard' },
    { id: 'setup', label: 'Tournaments', icon: 'trophy' },
    { id: 'leaderboard', label: 'Statistics', icon: 'analytics' },
    { id: 'shortcode', label: 'Live Match', icon: 'sensors' },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-slate-200 dark:border-border-dark flex-col p-6 bg-white dark:bg-background-dark shrink-0 transition-all h-full">
        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl flex items-center justify-center">
            <img
              src="/logo.png"
              alt="Padel Scoring Pro"
              className="w-10 h-10 object-contain drop-shadow-[0_0_10px_rgba(0,255,204,0.4)]"
              />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold leading-tight tracking-tight">Padel Score Pro</h1>
              <p className="text-slate-500 dark:text-[#9abcb5] text-xs font-medium uppercase tracking-widest">Admin Console</p>
            </div>
          </div>
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id as ViewState)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  currentView === item.id
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-slate-600 dark:text-[#9abcb5] hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'
                }`}
              >
                <span className={`material-symbols-outlined ${currentView === item.id ? 'fill-1' : ''}`}>
                  {item.icon}
                </span>
                <span className={`text-sm ${currentView === item.id ? 'font-semibold' : 'font-medium'}`}>
                  {item.id === 'dashboard' ? 'Dashboard' : 
                   item.id === 'setup' ? 'Tournaments' : 
                   item.id === 'leaderboard' ? 'Statistics' : 
                   item.id === 'superadmin' ? 'Super Admin' :
                   'Live Match'}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background-dark border-t border-white/10 flex items-center justify-around md:hidden z-[100] px-4">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id as ViewState)}
            className={`flex flex-col items-center justify-center gap-1 transition-all flex-1 h-full ${
              currentView === item.id ? 'text-primary' : 'text-slate-500'
            }`}
          >
            <span className={`material-symbols-outlined ${currentView === item.id ? 'fill-1' : ''}`}>
              {item.icon}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
};

export default Sidebar;
