import React, { useState } from 'react';
import { FolderOpen, LogOut, Save, Settings, Trash2 } from 'lucide-react';
import { CurrencyCode, EnergyRecoveryPolicy } from '../engine/types';
import { useCareerStore } from '../store/careerStore';

export const CustomiseView: React.FC = () => {
  const career = useCareerStore((s) => s.career);
  const savedSlots = useCareerStore((s) => s.savedSlots);
  const saveToSlot = useCareerStore((s) => s.saveToSlot);
  const loadFromSlot = useCareerStore((s) => s.loadFromSlot);
  const deleteSlot = useCareerStore((s) => s.deleteSlot);
  const updateSettings = useCareerStore((s) => s.updateSettings);
  const exitToClubSelect = useCareerStore((s) => s.exitToClubSelect);

  const [saveLabel, setSaveLabel] = useState('');

  if (!career) return null;

  return (
    <div className="mx-auto max-w-[1280px] px-4 lg:px-6 py-5 space-y-5">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <Settings className="w-5 h-5 text-[#38f2c8]" />
          <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide text-white">
            Customise &amp; Save Management
          </h2>
        </div>
        <button
          type="button"
          onClick={exitToClubSelect}
          className="fc-btn-secondary rounded px-4 py-2 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 text-rose-300"
        >
          <LogOut className="w-3.5 h-3.5" />
          Exit to Club Select
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Career Settings */}
        <div className="lg:col-span-6 fc-panel rounded-lg p-5 space-y-4 text-xs">
          <h3 className="font-display text-xl font-extrabold uppercase tracking-wide text-white">
            Career Preferences
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
              <div>
                <div className="font-bold text-white">Display Currency</div>
                <div className="text-[11px] text-[#8ba5b3]">Applied to xTV valuations, budgets, and wages</div>
              </div>
              <select
                value={career.settings.currency}
                onChange={(e) => updateSettings({ currency: e.target.value as CurrencyCode })}
                className="rounded border border-white/15 bg-[#0a1822] px-3 py-1.5 font-bold text-white"
              >
                <option value="EUR">Euro (€)</option>
                <option value="USD">US Dollar ($)</option>
                <option value="GBP">British Pound (£)</option>
              </select>
            </div>

            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
              <div>
                <div className="font-bold text-white">Energy Recovery Policy</div>
                <div className="text-[11px] text-[#8ba5b3]">Governs daily Match Fitness regeneration vs sharpness</div>
              </div>
              <select
                value={career.settings.energyRecovery}
                onChange={(e) => updateSettings({ energyRecovery: e.target.value as EnergyRecoveryPolicy })}
                className="rounded border border-white/15 bg-[#0a1822] px-3 py-1.5 font-bold text-white"
              >
                <option value="Balanced">Balanced</option>
                <option value="Aggressive">Aggressive</option>
                <option value="Conservative">Conservative</option>
              </select>
            </div>

            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
              <div>
                <div className="font-bold text-white">Live Match Sim Tick Speed</div>
                <div className="text-[11px] text-[#8ba5b3]">Default pace for minute-by-minute 2D tactical matches</div>
              </div>
              <select
                value={career.settings.liveSimSpeedMs}
                onChange={(e) => updateSettings({ liveSimSpeedMs: Number(e.target.value) })}
                className="rounded border border-white/15 bg-[#0a1822] px-3 py-1.5 font-bold text-white"
              >
                <option value={450}>Detailed (Slow)</option>
                <option value={280}>Standard (Default)</option>
                <option value={120}>Fast Broadcast</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save / Load Slots */}
        <div className="lg:col-span-6 fc-panel rounded-lg p-5 space-y-4">
          <h3 className="font-display text-xl font-extrabold uppercase tracking-wide text-white">
            Local Save Slots (localStorage)
          </h3>

          <div className="flex gap-2">
            <input
              type="text"
              value={saveLabel}
              onChange={(e) => setSaveLabel(e.target.value)}
              placeholder={`${career.clubs[career.userClubId].name} — ${career.currentDate}`}
              className="flex-1 rounded border border-white/15 bg-[#0a1822] px-3 py-2 text-xs text-white placeholder:text-[#6f8997]"
            />
            <button
              type="button"
              onClick={() => {
                saveToSlot(`slot-${Date.now()}`, saveLabel.trim() || undefined);
                setSaveLabel('');
              }}
              className="fc-btn-primary rounded px-4 py-2 text-xs uppercase tracking-wider inline-flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              Save Career
            </button>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {savedSlots.length === 0 ? (
              <div className="text-xs text-[#8ba5b3] py-6 text-center">
                No manual save slots yet. Your career also auto-saves continuously in this browser.
              </div>
            ) : (
              savedSlots.map((slot) => (
                <div
                  key={slot.slotId}
                  className="rounded border border-white/10 bg-[#0b1822]/80 px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-bold text-white">{slot.saveName}</div>
                    <div className="text-[11px] text-[#8ba5b3] font-mono-num">
                      {slot.clubName} · Season {slot.seasonNumber} · {slot.currentDate}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => loadFromSlot(slot.slotId)}
                      className="fc-btn-secondary rounded px-2.5 py-1.5 text-[11px] font-bold inline-flex items-center gap-1"
                    >
                      <FolderOpen className="w-3 h-3 text-[#38f2c8]" /> Load
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSlot(slot.slotId)}
                      className="fc-btn-secondary rounded p-1.5 text-rose-300"
                      title="Delete slot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
