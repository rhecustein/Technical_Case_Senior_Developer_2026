'use client';

import { useState, useRef, useEffect } from 'react';
import { SyncMode } from '../../hooks/useAutoSync';

interface AutoSyncControlProps {
  enabled: boolean;
  intervalMinutes: number;
  mode: SyncMode;
  countdown: number;
  syncing: boolean;
  onToggle: () => void;
  onIntervalChange: (m: number) => void;
  onModeChange: (m: SyncMode) => void;
  onSyncNow: () => void;
}

const INTERVAL_OPTIONS = [
  { label: '5 menit', value: 5 },
  { label: '15 menit', value: 15 },
  { label: '30 menit', value: 30 },
  { label: '1 jam', value: 60 },
  { label: '6 jam', value: 360 },
];

const MODE_OPTIONS: { label: string; value: SyncMode }[] = [
  { label: 'Pull saja', value: 'pull' },
  { label: 'Push saja', value: 'push' },
  { label: 'Pull & Push', value: 'both' },
];

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function AutoSyncControl({
  enabled,
  intervalMinutes,
  mode,
  countdown,
  syncing,
  onToggle,
  onIntervalChange,
  onModeChange,
  onSyncNow,
}: AutoSyncControlProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        open &&
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !btnRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
          enabled
            ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
        }`}
        title="Pengaturan auto sync"
      >
        {syncing ? (
          <span className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
        ) : (
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              enabled ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
            }`}
          />
        )}
        <span className="hidden sm:inline">Auto Sync</span>
        {enabled && !syncing && (
          <span className="text-xs font-mono tabular-nums text-green-600">
            {formatCountdown(countdown)}
          </span>
        )}
        {syncing && (
          <span className="text-xs text-green-600">Syncing…</span>
        )}
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-20"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Auto Sync</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Sinkronisasi otomatis dengan Odoo</p>
          </div>

          <div className="p-4 space-y-4">
            {/* Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Aktifkan</p>
                <p className="text-xs text-gray-400">Jalankan sync secara terjadwal</p>
              </div>
              <button
                onClick={onToggle}
                className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${
                  enabled ? 'bg-green-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Interval */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1.5">Interval</p>
              <div className="grid grid-cols-5 gap-1">
                {INTERVAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onIntervalChange(opt.value)}
                    className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      intervalMinutes === opt.value
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {opt.value < 60 ? `${opt.value}m` : `${opt.value / 60}j`}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1.5">Arah Sync</p>
              <div className="grid grid-cols-3 gap-1">
                {MODE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onModeChange(opt.value)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
                      mode === opt.value
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status + Manual trigger */}
            <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
              {enabled ? (
                <div className="text-xs text-gray-500">
                  Sync berikutnya dalam{' '}
                  <span className="font-mono font-semibold text-green-600">
                    {formatCountdown(countdown)}
                  </span>
                </div>
              ) : (
                <div className="text-xs text-gray-400">Auto sync tidak aktif</div>
              )}
              <button
                onClick={() => { onSyncNow(); setOpen(false); }}
                disabled={syncing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
