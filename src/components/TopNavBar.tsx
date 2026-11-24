import React, { useEffect } from 'react';
import { Star } from 'lucide-react';
import { NavTab, useCareerStore } from '../store/careerStore';
import { openHubOverlay } from '../navigation/hubFocus';
import { ClubCrest } from './PlayerAvatar';

export const NAV_TABS: NavTab[] = [
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
  const hubFocus = useCareerStore((s) => s.hubFocus);
  const setHubFocus = useCareerStore((s) => s.setHubFocus);

  // 60% keyboard L1/R1 tab switching (Q / E / [ / ] and 1-8)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      // Do not switch primary nav tabs while a modal overlay is open on Central
      if (hubFocus?.activeOverlay !== null) return;

      const currentIdx = NAV_TABS.indexOf(activeTab);
      if (e.key === 'q' || e.key === 'Q' || e.key === '[') {
        e.preventDefault();
        const prevIdx = (currentIdx - 1 + NAV_TABS.length) % NAV_TABS.length;
        setActiveTab(NAV_TABS[prevIdx]);
      } else if (e.key === 'e' || e.key === 'E' || e.key === ']') {
        e.preventDefault();
        const nextIdx = (currentIdx + 1) % NAV_TABS.length;
        setActiveTab(NAV_TABS[nextIdx]);
      } else if (['1', '2', '3', '4', '5', '6', '7', '8'].includes(e.key)) {
        const numIdx = parseInt(e.key, 10) - 1;
        if (numIdx >= 0 && numIdx < NAV_TABS.length) {
          e.preventDefault();
          setActiveTab(NAV_TABS[numIdx]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, setActiveTab, hubFocus?.activeOverlay]);

  if (!career) return null;

  const userClub = career.clubs[career.userClubId];
  const currentIdx = NAV_TABS.indexOf(activeTab);
  const filledSegments = Math.min(
    4,
    Math.max(1, Math.round((userClub.boardConfidence / 100) * 4))
  );

  const handleOpenClubHub = () => {
    setActiveTab('Central');
    setHubFocus((prev) => openHubOverlay(prev, 'fc-hub'));
  };

  return (
    <header className="relative z-30 shrink-0 bg-gradient-to-b from-[#080d11]/95 via-[#091117]/88 to-transparent border-b border-white/[0.08]">
      <div className="mx-auto flex h-[74px] w-full max-w-[1460px] items-end justify-between gap-6 px-6 lg:px-10 pb-2.5">
        <div className="flex items-end gap-5 min-w-0">
          <button
            type="button"
            onClick={() => setActiveTab('Central')}
            className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[2px] border-white/90 text-white hover:border-[#38f2c8] hover:text-[#38f2c8] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38f2c8]"
            aria-label="Manager Career Home"
            title="Manager Career Central Hub"
          >
            <span className="font-expanded text-[13px] font-black italic tracking-tighter leading-none">
              MC
            </span>
          </button>

          <div className="flex flex-col items-center shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab('Central');
                setHubFocus((prev) => openHubOverlay(prev, 'shortcuts'));
              }}
              className="mb-1 inline-flex h-[17px] min-w-[22px] items-center justify-center rounded-[5px] bg-white/15 px-1.5 font-mono-num text-[9px] font-bold text-white/75 hover:bg-white/25 hover:text-white transition-colors"
              title="Shortcuts (Tab)"
              aria-label="Open L2 Shortcuts"
            >
              L2
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('Central')}
              className="pb-1.5 text-[15px] font-bold tracking-tight text-white hover:text-[#b8fff0] transition-colors whitespace-nowrap shrink-0"
            >
              Home
            </button>
          </div>

          <div className="mb-1.5 h-6 w-px bg-white/18 shrink-0" aria-hidden="true" />

          <div className="flex flex-col min-w-0">
            <div className="mb-1 flex items-center gap-1.5 pl-1">
              <button
                type="button"
                onClick={() =>
                  setActiveTab(NAV_TABS[(currentIdx - 1 + NAV_TABS.length) % NAV_TABS.length])
                }
                className="inline-flex h-[17px] min-w-[22px] items-center justify-center rounded-[4px] bg-white/15 px-1.5 font-mono-num text-[9px] font-bold text-white/75 hover:bg-white/25 hover:text-white transition-colors"
                title="Previous Tab (Q)"
                aria-label="Previous navigation tab (L1 / Q)"
              >
                L1
              </button>
              <button
                type="button"
                onClick={() => setActiveTab(NAV_TABS[(currentIdx + 1) % NAV_TABS.length])}
                className="inline-flex h-[17px] min-w-[22px] items-center justify-center rounded-[4px] bg-white/15 px-1.5 font-mono-num text-[9px] font-bold text-white/75 hover:bg-white/25 hover:text-white transition-colors"
                title="Next Tab (E)"
                aria-label="Next navigation tab (R1 / E)"
              >
                R1
              </button>
            </div>

            <nav
              className="flex items-center gap-5 lg:gap-6 overflow-x-auto no-scrollbar"
              aria-label="Primary Career Navigation"
            >
              {NAV_TABS.map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`relative pb-1.5 text-[14px] tracking-wide transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:text-[#38f2c8] ${
                      isActive
                        ? 'font-bold text-white'
                        : 'font-normal text-white/62 hover:text-white/95'
                    }`}
                  >
                    <span>{tab}</span>
                    {isActive && (
                      <span
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#38f2c8] shadow-[0_0_10px_rgba(56,242,200,0.85)]"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenClubHub}
          className="mb-0.5 hidden md:flex items-center gap-3 shrink-0 group text-left rounded-lg px-2 py-1 -mr-2 hover:bg-white/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38f2c8]"
          title="Open FC HUB / Switch Club (H)"
          aria-label={`Active club ${userClub.name}. Open FC Hub and club switcher.`}
        >
          <ClubCrest club={userClub} size={32} />
          <div className="min-w-[144px]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[14px] font-medium tracking-wide text-white/95 group-hover:text-[#b8fff0] transition-colors whitespace-nowrap">
                {userClub.name}
              </span>
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#d8ff4a]/40 bg-[#d8ff4a]/10">
                <Star className="w-3 h-3 fill-[#d8ff4a] text-[#d8ff4a]" />
              </span>
            </div>
            <div className="mt-1.5 grid grid-cols-4 gap-1" aria-label={`Board confidence ${userClub.boardConfidence}%`}>
              {[1, 2, 3, 4].map((seg) => (
                <div
                  key={seg}
                  className={`h-[4px] rounded-[1px] transition-colors ${
                    seg <= filledSegments ? 'bg-[#22d68a]' : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>
        </button>
      </div>
    </header>
  );
};
