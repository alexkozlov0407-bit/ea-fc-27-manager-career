import { useEffect } from 'react';
import { X } from 'lucide-react';
import { AcademyView } from './components/AcademyView';
import { CentralHub } from './components/CentralHub';
import { ClubSelectScreen } from './components/ClubSelectScreen';
import { CustomiseView } from './components/CustomiseView';
import { LiveMatchModal, PostMatchSummaryModal } from './components/LiveMatchModal';
import { NotificationsView, UnexpectedEventModal } from './components/NotificationsView';
import { OfficeView } from './components/OfficeView';
import { ScoutingView } from './components/ScoutingView';
import { SquadView } from './components/SquadView';
import { TopNavBar } from './components/TopNavBar';
import { TransferRevealModal, TransfersView } from './components/TransfersView';
import { useCareerStore } from './store/careerStore';

export default function App() {
  const loadDatabase = useCareerStore((s) => s.loadDatabase);
  const loadingDb = useCareerStore((s) => s.loadingDb);
  const dbError = useCareerStore((s) => s.dbError);
  const career = useCareerStore((s) => s.career);
  const activeTab = useCareerStore((s) => s.activeTab);
  const toast = useCareerStore((s) => s.toast);
  const clearToast = useCareerStore((s) => s.clearToast);

  useEffect(() => {
    void loadDatabase();
  }, [loadDatabase]);

  useEffect(() => {
    document.body.dataset.state = career ? 'playing' : 'title';
  }, [career]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => clearToast(), 4200);
    return () => window.clearTimeout(t);
  }, [toast, clearToast]);

  if (loadingDb) {
    return (
      <div className="min-h-screen fc-backdrop flex flex-col items-center justify-center text-white gap-3">
        <div className="h-12 w-12 rounded-full border-2 border-[#38f2c8] border-t-transparent animate-spin" />
        <div className="font-display text-2xl font-extrabold uppercase tracking-wider">
          Loading EA FC 27 Database (550 Players · 20 LaLiga Clubs)...
        </div>
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="min-h-screen fc-backdrop flex flex-col items-center justify-center text-white p-6 text-center gap-3">
        <div className="font-display text-3xl font-extrabold uppercase text-rose-400">
          Database Initialization Error
        </div>
        <p className="text-sm text-[#9bb4c2] max-w-md">{dbError}</p>
        <button
          type="button"
          onClick={() => void loadDatabase()}
          className="fc-btn-primary rounded px-5 py-2 text-xs uppercase tracking-wider"
        >
          Retry Load
        </button>
      </div>
    );
  }

  if (!career) {
    return <ClubSelectScreen />;
  }

  return (
    <div className="min-h-screen fc-backdrop fc-facet-overlay text-[#f1f6f8] flex flex-col">
      <TopNavBar />

      <main className="flex-1 pb-10">
        {activeTab === 'Central' && <CentralHub />}
        {activeTab === 'Notifications' && <NotificationsView />}
        {activeTab === 'Squad' && <SquadView />}
        {activeTab === 'Scouting' && <ScoutingView />}
        {activeTab === 'Transfers' && <TransfersView />}
        {activeTab === 'Academy' && <AcademyView />}
        {activeTab === 'Office' && <OfficeView />}
        {activeTab === 'Customise' && <CustomiseView />}
      </main>

      {/* Global Interactive Career Modals */}
      <LiveMatchModal />
      <PostMatchSummaryModal />
      <TransferRevealModal />
      <UnexpectedEventModal />

      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed top-16 right-6 z-50 max-w-md fc-panel-active rounded-lg px-4 py-2.5 text-xs font-semibold text-white shadow-2xl flex items-center gap-3">
          <span>{toast}</span>
          <button
            type="button"
            onClick={clearToast}
            aria-label="Dismiss notification"
            className="text-white/75 hover:text-white shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
