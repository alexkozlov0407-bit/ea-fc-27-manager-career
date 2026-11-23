import React from 'react';
import { Star } from 'lucide-react';
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

  if (!career) return null;
  const userClub = career.clubs[career.userClubId];
  const unreadCount = career.inbox.filter((m) => !m.read).length;
  const activeNegCount = career.negotiations.filter(
    (n) => n.stage === 'CLUB_TALKS' || n.stage === 'PLAYER_TALKS' || n.stage === 'DELEGATED' || n.stage === 'HIJACKED'
  ).length;

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#07131a]/92 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1520px] items-center justify-between gap-4 px-4 lg:px-6">
        {/* Left: MC Logo + Top Nav Tabs */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setActiveTab('Central')}
            className="flex items-center gap-2 shrink-0 group focus:outline-none"
            title="Manager Career Home"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/80 bg-[#0c1d28] font-display text-base font-extrabold italic tracking-tight text-white group-hover:border-[#38f2c8] transition-colors">
              MC
            </span>
          </button>

          <div className="h-5 w-px bg-white/15 shrink-0 hidden sm:block" />

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
                      ? 'text-white bg-white/10'
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
        </div>

        {/* Right: Budget + Club Crest + Board Confidence */}
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

          <div className="flex items-center gap-2.5">
            <ClubCrest club={userClub} size={30} />
            <div className="leading-tight">
              <div className="text-xs font-bold text-white uppercase tracking-wide">
                {userClub.name}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-20 h-1.5 rounded-full bg-white/15 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#10c482] to-[#38f2c8]"
                    style={{ width: `${userClub.boardConfidence}%` }}
                  />
                </div>
                <span className="inline-flex items-center gap-0.5 font-mono-num text-[10px] font-bold text-amber-300">
                  <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                  {userClub.boardConfidence}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
