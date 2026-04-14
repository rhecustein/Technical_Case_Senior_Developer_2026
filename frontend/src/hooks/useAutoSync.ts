'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export type SyncMode = 'pull' | 'push' | 'both';

interface AutoSyncSettings {
  enabled: boolean;
  intervalMinutes: number;
  mode: SyncMode;
}

interface UseAutoSyncOptions {
  onSync: (mode: SyncMode) => Promise<void>;
}

interface UseAutoSyncReturn {
  enabled: boolean;
  intervalMinutes: number;
  mode: SyncMode;
  countdown: number; // seconds remaining until next sync
  syncing: boolean;
  toggle: () => void;
  setIntervalMinutes: (m: number) => void;
  setMode: (m: SyncMode) => void;
  triggerNow: () => void;
}

const STORAGE_KEY = 'auto_sync_settings';
const DEFAULTS: AutoSyncSettings = {
  enabled: false,
  intervalMinutes: 15,
  mode: 'pull',
};

function loadSettings(): AutoSyncSettings {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<AutoSyncSettings>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function saveSettings(s: AutoSyncSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function useAutoSync({ onSync }: UseAutoSyncOptions): UseAutoSyncReturn {
  const [settings, setSettings] = useState<AutoSyncSettings>(DEFAULTS);
  const [countdown, setCountdown] = useState(0);
  const [syncing, setSyncing] = useState(false);
  // Use a ref so the interval callback always sees the latest values without being recreated
  const settingsRef = useRef(settings);
  const syncingRef = useRef(syncing);
  settingsRef.current = settings;
  syncingRef.current = syncing;

  // Load settings from localStorage on mount (client only, avoids SSR mismatch)
  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    setCountdown(s.enabled ? s.intervalMinutes * 60 : 0);
  }, []);

  const runSync = useCallback(async () => {
    if (syncingRef.current) return;
    setSyncing(true);
    try {
      await onSync(settingsRef.current.mode);
    } finally {
      setSyncing(false);
      // Reset countdown to the full interval after sync completes
      setCountdown(settingsRef.current.intervalMinutes * 60);
    }
  }, [onSync]);

  // Countdown tick — fires every second when enabled
  useEffect(() => {
    if (!settings.enabled) {
      setCountdown(0);
      return;
    }

    const id = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Fire sync asynchronously — don't block the tick
          void runSync();
          return settingsRef.current.intervalMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [settings.enabled, settings.intervalMinutes, runSync]);

  function toggle() {
    setSettings((prev) => {
      const next = { ...prev, enabled: !prev.enabled };
      saveSettings(next);
      if (next.enabled) setCountdown(next.intervalMinutes * 60);
      else setCountdown(0);
      return next;
    });
  }

  function setIntervalMinutes(m: number) {
    setSettings((prev) => {
      const next = { ...prev, intervalMinutes: m };
      saveSettings(next);
      if (next.enabled) setCountdown(m * 60);
      return next;
    });
  }

  function setMode(mode: SyncMode) {
    setSettings((prev) => {
      const next = { ...prev, mode };
      saveSettings(next);
      return next;
    });
  }

  function triggerNow() {
    void runSync();
  }

  return {
    enabled: settings.enabled,
    intervalMinutes: settings.intervalMinutes,
    mode: settings.mode,
    countdown,
    syncing,
    toggle,
    setIntervalMinutes,
    setMode,
    triggerNow,
  };
}
