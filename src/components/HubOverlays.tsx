import React from 'react';
import {
  Activity,
  Briefcase,
  Check,
  Heart,
  MessageSquare,
  Play,
  Shield,
  SlidersHorizontal,
  Stethoscope,
  UserPlus,
  X,
  Zap,
} from 'lucide-react';
import { formatMoney } from '../engine/ratings';
import {
  useCareerStore,
  type BroadcastStory,
  type NavTab,
} from '../store/careerStore';
import type { HubOverlayKind } from '../navigation/hubFocus';
import { ClubCrest, PlayerAvatar } from './PlayerAvatar';

export interface HubTaskItem {
  id: string;
  kind: 'coach' | 'transfer' | 'injury' | 'contract' | 'inbox' | 'tactics';
  title: string;
  detail: string;
  negotiationId?: string;
  playerId?: string;
  counterpartClubId?: string;
}

interface HubOverlaysProps {
  activeOverlay: HubOverlayKind;
  selectedTask: HubTaskItem | null;
  allTasks: HubTaskItem[];
  currentStory: BroadcastStory;
  isLiked: boolean;
  onClose: () => void;
  onSelectTaskFromAll: (index: number) => void;
  onOpenComments: () => void;
}

const COACH_CANDIDATES = [
  {
    name: 'M. Pellegrini',
    specialty: 'Attacking',
    rating: '★★★★★',
    wage: '€18K/wk',
    boost: '+4 Finishing & Positioning',
  },
  {
    name: 'L. Spalletti',
    specialty: 'Midfield',
    rating: '★★★★☆',
    wage: '€14K/wk',
    boost: '+3 Vision & Short Passing',
  },
  {
    name: 'R. Ayala',
    specialty: 'Defending',
    rating: '★★★★☆',
    wage: '€12K/wk',
    boost: '+3 Interceptions & Marking',
  },
];

const PRACTICE_DRILLS = [
  {
    id: 'free-kick',
    title: 'Free Kick Precision',
    focus: 'Curve & Dead-Ball Accuracy',
    duration: '5 min drill',
  },
  {
    id: 'one-on-one',
    title: '1v1 Keeper Finishing',
    focus: 'Composure & Finesse Shot',
    duration: '4 min drill',
  },
  {
    id: 'set-piece',
    title: 'Corner & Set-Piece Routines',
    focus: 'Near-Post Delivery & Timing',
    duration: '6 min drill',
  },
];

export const HubOverlays: React.FC<HubOverlaysProps> = ({
  activeOverlay,
  selectedTask,
  allTasks,
  currentStory,
  isLiked,
  onClose,
  onSelectTaskFromAll,
  onOpenComments,
}) => {
  const career = useCareerStore((s) => s.career);
  const setActiveTab = useCareerStore((s) => s.setActiveTab);
  const switchClub = useCareerStore((s) => s.switchClub);
  const hireCoachForClub = useCareerStore((s) => s.hireCoachForClub);
  const respondToTransferOffer = useCareerStore((s) => s.respondToTransferOffer);
  const toggleStoryLike = useCareerStore((s) => s.toggleStoryLike);
  const quickSimNextMatch = useCareerStore((s) => s.quickSimNextMatch);
  const updateAdvanceSetting = useCareerStore((s) => s.updateAdvanceSetting);

  const [activeDrill, setActiveDrill] = React.useState<string | null>(null);

  if (!activeOverlay || !career) return null;

  const userClub = career.clubs[career.userClubId];
  const injuredPlayers = Object.values(career.players).filter(
    (p) => p.clubId === career.userClubId && (p.injury?.daysRemaining ?? 0) > 0
  );
  const activeOffer = selectedTask?.negotiationId
    ? career.negotiations.find((n) => n.id === selectedTask.negotiationId)
    : undefined;
  const offerPlayer = activeOffer ? career.players[activeOffer.playerId] : undefined;

  // Available clubs for FC Hub switcher: top clubs in career
  const availableClubs = Object.values(career.clubs).slice(0, 6);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Career Hub Detail Overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="fc-panel w-full max-w-2xl rounded-2xl overflow-hidden border border-white/15">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/30">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#38f2c8]/15 text-[#38f2c8]">
              {activeOverlay === 'practice' && <Play className="w-4 h-4" />}
              {activeOverlay === 'matchday' && <Zap className="w-4 h-4" />}
              {activeOverlay === 'task-detail' && <Briefcase className="w-4 h-4" />}
              {activeOverlay === 'tasks-all' && <Activity className="w-4 h-4" />}
              {activeOverlay === 'story-detail' && <MessageSquare className="w-4 h-4" />}
              {activeOverlay === 'comments' && <MessageSquare className="w-4 h-4" />}
              {activeOverlay === 'tutorials' && <Shield className="w-4 h-4" />}
              {activeOverlay === 'advance-customisation' && (
                <SlidersHorizontal className="w-4 h-4" />
              )}
              {activeOverlay === 'shortcuts' && <Zap className="w-4 h-4" />}
              {activeOverlay === 'fc-hub' && <Shield className="w-4 h-4" />}
            </span>
            <h2 className="font-expanded text-base font-extrabold uppercase tracking-wide text-white">
              {activeOverlay === 'practice' && 'Practice Arena'}
              {activeOverlay === 'matchday' && 'Matchday Kickoff'}
              {activeOverlay === 'task-detail' && (selectedTask?.title ?? 'Task Detail')}
              {activeOverlay === 'tasks-all' && `All Tasks (${allTasks.length})`}
              {activeOverlay === 'story-detail' && `${currentStory.source} · ${currentStory.dateLabel}`}
              {activeOverlay === 'comments' && `Fan Comments (${currentStory.commentsCountLabel})`}
              {activeOverlay === 'tutorials' && '60% Keyboard Console Controls'}
              {activeOverlay === 'advance-customisation' && 'Advance Customisation'}
              {activeOverlay === 'shortcuts' && 'L2 Quick Shortcuts'}
              {activeOverlay === 'fc-hub' && 'FC HUB · Club & Career Switcher'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-white/80 hover:text-white bg-white/8 hover:bg-white/14 transition-colors"
            aria-label="Back to Career Hub"
          >
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/60 text-[10px]">
              ◯
            </span>
            <span>Back (Esc)</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
          {activeOverlay === 'practice' && (
            <>
              <p className="text-sm text-white/75">
                Select a pre-match training session with <strong className="text-white">{userClub.name}</strong>. Press <kbd className="font-mono-num text-[#38f2c8]">Esc</kbd> to return directly to the Practice Arena tile.
              </p>
              <div className="grid grid-cols-1 gap-3">
                {PRACTICE_DRILLS.map((drill) => {
                  const selected = activeDrill === drill.id;
                  return (
                    <button
                      key={drill.id}
                      type="button"
                      onClick={() => setActiveDrill(drill.id)}
                      className={`w-full text-left rounded-xl p-4 border transition-all flex items-center justify-between ${
                        selected
                          ? 'fc-btn-primary border-white'
                          : 'bg-white/[0.04] border-white/12 text-white hover:border-[#38f2c8]/50'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm">{drill.title}</div>
                        <div className={`text-xs mt-0.5 ${selected ? 'text-[#081016]/75' : 'text-white/60'}`}>
                          {drill.focus} · {drill.duration}
                        </div>
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {selected ? 'Active Session' : 'Start Drill'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {activeOverlay === 'matchday' && (
            <div className="space-y-4">
              <p className="text-sm text-white/80">
                Matchday has arrived for <strong className="text-white">{userClub.name}</strong>. Launch the simulation or return to the Hub to adjust your squad.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => quickSimNextMatch()}
                  className="fc-btn-primary rounded-lg px-5 py-2.5 text-sm font-bold inline-flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  <span>Quick Sim Match</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setActiveTab('Squad');
                  }}
                  className="fc-btn-secondary rounded-lg px-5 py-2.5 text-sm font-semibold"
                >
                  Open Team Sheet
                </button>
              </div>
            </div>
          )}

          {activeOverlay === 'task-detail' && selectedTask && (
            <>
              {selectedTask.kind === 'coach' && (
                <div className="space-y-3">
                  <p className="text-sm text-white/75">
                    {userClub.name} Coaching Staff ({userClub.coachSlotsFilled ?? userClub.coaches?.length ?? 4}/{userClub.coachSlotsTotal ?? 6} slots filled). Hire a coach to boost squad development.
                  </p>
                  {COACH_CANDIDATES.map((coach) => (
                    <div
                      key={coach.name}
                      className="rounded-xl border border-white/12 bg-white/[0.04] p-4 flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <UserPlus className="w-4 h-4 text-[#38f2c8]" />
                          <span className="font-bold text-white text-sm">{coach.name}</span>
                          <span className="text-xs text-[#d8ff4a]">{coach.rating}</span>
                        </div>
                        <div className="text-xs text-white/65 mt-1">
                          {coach.specialty} Coach · {coach.boost} · {coach.wage}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          hireCoachForClub(coach.name, coach.specialty);
                          onClose();
                        }}
                        className="fc-btn-primary rounded-lg px-4 py-2 text-xs font-bold shrink-0"
                      >
                        Hire Coach
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {selectedTask.kind === 'transfer' && activeOffer && offerPlayer && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-white/12 bg-white/[0.04] p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <PlayerAvatar player={offerPlayer} clubColor={userClub.primaryColor} size="md" />
                      <div>
                        <div className="text-base font-bold text-white">{offerPlayer.knownAs}</div>
                        <div className="text-xs text-white/65">
                          {offerPlayer.primaryPosition} · OVR {offerPlayer.dynamicOvr.dynamicOvr} · Bid from {activeOffer.counterpartClubName}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-white/55">Transfer Offer</div>
                      <div className="font-mono-num text-lg font-bold text-[#38f2c8]">
                        {formatMoney(activeOffer.currentOffer.transferFeeEur, career.settings.currency)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        respondToTransferOffer(activeOffer.id, 'accept');
                        onClose();
                      }}
                      className="fc-btn-primary rounded-lg px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
                    >
                      Accept Offer
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        respondToTransferOffer(activeOffer.id, 'reject');
                        onClose();
                      }}
                      className="fc-btn-secondary rounded-lg px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
                    >
                      Reject Offer
                    </button>
                  </div>
                </div>
              )}

              {selectedTask.kind === 'injury' && (
                <div className="space-y-3">
                  <p className="text-sm text-white/75">
                    Medical Room Report for {userClub.name}. Rest injured players to avoid aggravation before matchday.
                  </p>
                  {injuredPlayers.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-[#38f2c8]">
                      All players are currently fit and available for selection.
                    </div>
                  ) : (
                    injuredPlayers.map((p) => (
                      <div
                        key={p.id}
                        className="rounded-xl border border-white/12 bg-white/[0.04] p-4 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#ff5a36]/15 text-[#ff6f47]">
                            <Stethoscope className="w-5 h-5" />
                          </span>
                          <div>
                            <div className="font-bold text-white text-sm">
                              {p.knownAs} ({p.primaryPosition})
                            </div>
                            <div className="text-xs text-white/65">
                              {p.injury?.type} · Aggravation risk {p.injury?.aggravationRiskPct}%
                            </div>
                          </div>
                        </div>
                        <span className="font-mono-num text-xs font-bold text-[#ff865c]">
                          {p.injury?.daysRemaining}d out
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {selectedTask.kind !== 'coach' &&
                selectedTask.kind !== 'transfer' &&
                selectedTask.kind !== 'injury' && (
                  <div className="space-y-4">
                    <p className="text-sm text-white/80 leading-relaxed">{selectedTask.detail}</p>
                    <button
                      type="button"
                      onClick={() => {
                        const targetTab: NavTab =
                          selectedTask.kind === 'inbox'
                            ? 'Notifications'
                            : selectedTask.kind === 'contract'
                            ? 'Office'
                            : 'Squad';
                        onClose();
                        setActiveTab(targetTab);
                      }}
                      className="fc-btn-primary rounded-lg px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
                    >
                      Go to Section
                    </button>
                  </div>
                )}
            </>
          )}

          {activeOverlay === 'tasks-all' && (
            <div className="divide-y divide-white/10">
              {allTasks.map((task, idx) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onSelectTaskFromAll(idx)}
                  className="w-full py-3.5 px-3 text-left flex items-center justify-between gap-4 hover:bg-white/[0.06] rounded-lg transition-colors"
                >
                  <div>
                    <div className="text-sm font-semibold text-white">{task.title}</div>
                    <div className="text-xs text-white/60 mt-0.5">{task.detail}</div>
                  </div>
                  <span className="text-xs font-semibold text-[#38f2c8] shrink-0">Open</span>
                </button>
              ))}
            </div>
          )}

          {activeOverlay === 'story-detail' && (
            <div className="space-y-4">
              <h3 className="font-expanded text-xl font-black text-white leading-snug">
                {currentStory.headline}
              </h3>
              <div className="flex items-center gap-6 py-2 border-y border-white/10">
                <div>
                  <div className="font-expanded text-2xl font-black text-white tabular-nums">
                    {currentStory.statLeftValue}
                  </div>
                  <div className="text-[11px] font-bold tracking-wider text-[#38e878] uppercase">
                    {currentStory.statLeftLabel}
                  </div>
                </div>
                <div>
                  <div className="font-expanded text-2xl font-black text-white tabular-nums">
                    {currentStory.statRightValue}
                  </div>
                  <div className="text-[11px] font-bold tracking-wider text-[#38e878] uppercase">
                    {currentStory.statRightLabel}
                  </div>
                </div>
              </div>
              <p className="text-sm text-white/80 leading-relaxed">{currentStory.fullArticle}</p>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => toggleStoryLike(currentStory.id)}
                  className={`rounded-lg px-4 py-2 text-xs font-bold inline-flex items-center gap-2 border transition-colors ${
                    isLiked
                      ? 'border-rose-400/60 bg-rose-500/15 text-rose-300'
                      : 'border-white/15 bg-white/[0.05] text-white/85 hover:text-white'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                  <span>{isLiked ? 'Liked' : 'Like Story'} ({currentStory.likesLabel})</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenComments}
                  className="fc-btn-secondary rounded-lg px-4 py-2 text-xs font-bold"
                >
                  View Comments ({currentStory.commentsCountLabel})
                </button>
              </div>
            </div>
          )}

          {activeOverlay === 'comments' && (
            <div className="space-y-3">
              <div className="text-xs text-white/60">
                {currentStory.source} · {currentStory.headline}
              </div>
              {currentStory.comments.map((cm, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5 space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">
                      {cm.user}{' '}
                      <span className="font-normal text-[#38f2c8] ml-1">{cm.handle}</span>
                    </span>
                    <span className="text-white/45">{cm.time}</span>
                  </div>
                  <p className="text-sm text-white/85 leading-relaxed">{cm.text}</p>
                </div>
              ))}
            </div>
          )}

          {activeOverlay === 'tutorials' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {[
                ['W / A / S / D', 'Move focus across buttons, tasks, and newsfeed'],
                ['Enter / Space', '✕ Select focused tile'],
                ['Esc / Backspace', '◯ Back & restore focus to exact tile'],
                ['Q / E', 'L1 / R1 Switch Top Nav tabs'],
                ['R / Shift+R', 'R Scroll Broadcast Newsfeed'],
                ['T', 'L3 Open/Close Tutorials'],
                ['C', '≡ Advance Customisation'],
                ['Tab', 'L2 Quick Shortcuts'],
                ['H', 'R2 Open FC HUB & Switch Club'],
              ].map(([keys, desc]) => (
                <div
                  key={keys}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-3 flex items-center justify-between gap-3"
                >
                  <span className="text-xs text-white/75">{desc}</span>
                  <kbd className="font-mono-num text-[11px] font-bold text-[#38f2c8] bg-black/50 border border-[#38f2c8]/30 px-2 py-1 rounded shrink-0">
                    {keys}
                  </kbd>
                </div>
              ))}
            </div>
          )}

          {activeOverlay === 'advance-customisation' && (
            <div className="space-y-3">
              <p className="text-sm text-white/70">
                Configure which career events pause calendar advancement automatically.
              </p>
              {(
                [
                  ['stopOnTransferOffers', 'Pause on Incoming Transfer Offers'],
                  ['stopOnTrainingReady', 'Pause on Pre-Match Training Briefings'],
                  ['stopOnInjuryUpdate', 'Pause on Squad Medical Updates'],
                ] as const
              ).map(([key, label]) => {
                const enabled = Boolean(career.settings[key]);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => updateAdvanceSetting(key, !enabled)}
                    className="w-full rounded-xl border border-white/12 bg-white/[0.04] hover:bg-white/[0.08] p-4 flex items-center justify-between text-left transition-colors"
                  >
                    <span className="text-sm font-medium text-white">{label}</span>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                        enabled ? 'text-[#38f2c8]' : 'text-white/45'
                      }`}
                    >
                      {enabled && <Check className="w-3.5 h-3.5" />}
                      {enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {activeOverlay === 'shortcuts' && (
            <div className="grid grid-cols-2 gap-3">
              {(['Squad', 'Transfers', 'Scouting', 'Office', 'Notifications', 'Customise'] as NavTab[]).map(
                (tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      onClose();
                      setActiveTab(tab);
                    }}
                    className="rounded-xl border border-white/12 bg-white/[0.04] hover:border-[#38f2c8]/60 hover:bg-white/[0.08] p-3.5 text-left text-sm font-semibold text-white transition-colors"
                  >
                    Jump to {tab}
                  </button>
                )
              )}
            </div>
          )}

          {activeOverlay === 'fc-hub' && (
            <div className="space-y-4">
              <p className="text-sm text-white/75">
                Switch active career club to verify that the Career Hub reads club crest, name, date, competition, fixture ranks, tasks, and newsfeed directly from career state.
              </p>
              <div className="grid grid-cols-1 gap-3">
                {availableClubs.map((club) => {
                  const isCurrent = career.userClubId === club.id;
                  return (
                    <button
                      key={club.id}
                      type="button"
                      onClick={() => {
                        switchClub(club.id);
                        onClose();
                      }}
                      className={`w-full rounded-xl p-4 border flex items-center justify-between gap-4 text-left transition-all ${
                        isCurrent
                          ? 'fc-btn-primary border-white'
                          : 'bg-white/[0.04] border-white/12 text-white hover:border-[#38f2c8]/55'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <ClubCrest club={club} size={38} />
                        <div>
                          <div className="font-bold text-sm">{club.name}</div>
                          <div
                            className={`text-xs mt-0.5 ${
                              isCurrent ? 'text-[#081016]/75' : 'text-white/60'
                            }`}
                          >
                            {club.competitionLabel ?? 'Domestic League'} · {club.formation} · Budget{' '}
                            {formatMoney(club.transferBudgetEur, career.settings.currency)}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider shrink-0">
                        {isCurrent ? 'Active Club' : 'Switch Club'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
