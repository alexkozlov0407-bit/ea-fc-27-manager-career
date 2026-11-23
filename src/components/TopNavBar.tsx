import React, { useEffect } from 'react';
import { Star, User } from 'lucide-react';
import { formatMoney } from '../engine/ratings';
import { NavTab, useCareerStore } from '../store/careerStore';
import { ClubCrest } from './PlayerAvatar';

const NAV_TABS: NavTab[] = [
  'Central',
  'Notifications',
  'Squad',
  'Scouting',
  'Transfers',
  'Academy',
  'Office',
  'Customise',
];

export const TopNavBar: React.FC = () => {
  const career = useCareerStore((s) => s.career);
  const activeTab = useCareerStore((s) => s.activeTab);
  const setActiveTab = useCareerStore((s) => s.setActiveTab);

  // Keyboard navigation for L1/R1 tab switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      const currentIdx = NAV_TABS.indexOf(activeTab);
      if (e.key === 'q' || e.key === 'Q' || e.key === '[') {
        e.preventDefault();
        const prevIdx = (currentIdx - 1 + NAV_TABS.length) % NAV_TABS.length;
        setActiveTab(NAV_TABS[prevIdx]);
      } else if (e.key === 'e' || e.key === 'E' || e.key === ']') {
        e.preventDefault();
        const nextIdx = (currentIdx + 1) % NAV_TABS.length;
        setActiveTab(NAV_TABS[nextIdx]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, setActiveTab]);

  if (!career) return null;
  const userClub = career.clubs[career.userClubId];
  const unreadCount = career.inbox.filter((m) => !m.read).length;
  const activeNegCount = career.negotiations.filter(
    (n) => n.stage === 'CLUB_TALKS' || n.stage === 'PLAYER_TALKS' || n.stage === 'DELEGATED' || n.stage === 'HIJACKED'
  ).length;

  const currentIdx = NAV_TABS.indexOf(activeTab);

  // FC 27 4-segment manager rating bar calculation
  const filledSegments = Math.min(4, Math.max(1, Math.ceil((userClub.boardConfidence / 100) * 4)));

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#07131a]/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1520px] items-center justify-between gap-4 px-4 lg:px-6">
        {/* Left: Authentic EA FC 27 MC Emblem + Home + Bumper Tabs */}
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Official MC Roundel Logo */}
          <button
            type="button"
            onClick={() => setActiveTab('Central')}
            className="flex items-center gap-2 shrink-0 group focus:outline-none"
            title="Manager Career Central Hub"
          >
            <div className="relative">
              <img
                src="/assets/branding/mc-logo.png"
                alt="Manager Career"
                className="w-8 h-8 rounded-full object-contain filter drop-shadow hover:scale-105 transition-transform"
              />
            </div>
          </button>

          {/* Home Tab with L2 trigger badge */}
          <div className="relative flex flex-col items-center">
            <span className="hidden sm:inline-block rounded bg-white/10 px-1 py-0.2 text-[8px] font-mono-num font-bold text-white/60 mb-0.5 leading-none">
              L2
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('Central')}
              className={`text-sm font-black uppercase tracking-wide transition-colors ${
                activeTab === 'Central' ? 'text-white' : 'text-[#8ea5b3] hover:text-white'
              }`}
            >
              Home
            </button>
          </div>

          <div className="h-5 w-px bg-white/20 shrink-0 mx-1" />

          {/* L1 Bumper Indicator */}
          <button
            type="button"
            onClick={() => setActiveTab(NAV_TABS[(currentIdx - 1 + NAV_TABS.length) % NAV_TABS.length])}
            className="hidden sm:inline-flex items-center justify-center rounded bg-white/10 hover:bg-white/20 px-1.5 py-0.5 text-[10px] font-mono-num font-bold text-white/70 hover:text-white transition-colors"
            title="Previous Tab (Q / [)"
          >
            L1
          </button>

          <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar" aria-label="Primary Career Navigation">
            {NAV_TABS.map((tab) => {
              const isActive = activeTab === tab;
              const badge =
                tab === 'Notifications' && unreadCount > 0
                  ? unreadCount
                  : tab === 'Transfers' && activeNegCount > 0
                  ? activeNegCount
                  : 0;

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`relative whitespace-nowrap px-3 py-1.5 text-sm font-semibold tracking-wide transition-colors rounded ${
                    isActive
                      ? 'text-white bg-white/10 font-black'
                      : 'text-[#8ea5b3] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{tab}</span>
                  {badge > 0 && (
                    <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-sm bg-[#38f2c8] px-1 font-mono-num text-[10px] font-extrabold text-[#07131a]">
                      {badge}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-gradient-to-r from-[#38f2c8] to-[#dcd2ff]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* R1 Bumper Indicator */}
          <button
            type="button"
            onClick={() => setActiveTab(NAV_TABS[(currentIdx + 1) % NAV_TABS.length])}
            className="hidden sm:inline-flex items-center justify-center rounded bg-white/10 hover:bg-white/20 px-1.5 py-0.5 text-[10px] font-mono-num font-bold text-white/70 hover:text-white transition-colors"
            title="Next Tab (E / ])"
          >
            R1
          </button>
        </div>

        {/* Right: Budget + Club Crest + Segmented Rating Bar + FC Hub Profile */}
        <div className="hidden md:flex items-center gap-4 shrink-0">
          <div className="text-right leading-tight">
            <div className="text-[10px] uppercase tracking-wider text-[#7e98a7] font-semibold">
              Transfer Budget
            </div>
            <div className="font-mono-num text-sm font-bold text-[#b8fff0]">
              {formatMoney(userClub.transferBudgetEur, career.settings.currency)}
            </div>
          </div>

          <div className="h-6 w-px bg-white/12" />

          {/* Authentic FC 27 Club Profile & 4-Segment Rating Bar */}
          <div className="flex items-center gap-2.5">
            <ClubCrest club={userClub} size={30} />
            <div className="leading-tight">
              <div className="text-xs font-bold text-white uppercase tracking-wide truncate max-w-[130px]">
                {userClub.name}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {/* 4 Segment Rating Meter */}
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4].map((seg) => (
                    <div
                      key={seg}
                      className={`h-1.5 w-4 rounded-sm transition-colors ${
                        seg <= filledSegments ? 'bg-[#10c482]' : 'bg-white/15'
                      }`}
                    />
                  ))}
                </div>
                <span className="inline-flex items-center gap-0.5 font-mono-num text-[10px] font-bold text-amber-300">
                  <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                  {userClub.boardConfidence}
                </span>
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-white/12" />

          {/* FC Hub Profile Pill */}
          <div className="flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/15 px-2.5 py-1 text-xs text-white/90 cursor-pointer transition-colors" title="FC Hub (R2)">
            <User className="w-3.5 h-3.5 text-[#38f2c8]" />
            <span className="text-[11px] font-bold">FC HUB</span>
            <span className="rounded bg-black/40 px-1 font-mono-num text-[9px] font-extrabold text-white/70">R2</span>
          </div>
        </div>
      </div>
    </header>
  );
};
