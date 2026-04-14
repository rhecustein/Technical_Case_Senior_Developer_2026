'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';

interface HeaderProps {
  title: string;
}

interface Notification {
  id: string;
  type: 'sync' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  time: string; // ISO string
  read: boolean;
}

const STORAGE_KEY = 'app_notifications';

function loadNotifications(): Notification[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveNotifications(notifs: Notification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs.slice(0, 50)));
}

export function pushNotification(notif: Omit<Notification, 'id' | 'read' | 'time'>) {
  const all = loadNotifications();
  const next: Notification = {
    ...notif,
    id: Date.now().toString(),
    read: false,
    time: new Date().toISOString(),
  };
  saveNotifications([next, ...all]);
  window.dispatchEvent(new CustomEvent('app:notification'));
}

function typeIcon(type: Notification['type']) {
  switch (type) {
    case 'sync':
      return (
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
      );
    case 'error':
      return (
        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
      );
    case 'success':
      return (
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
    default:
      return (
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
  }
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}

export default function Header({ title }: HeaderProps) {
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [detailNotif, setDetailNotif] = useState<Notification | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const refresh = useCallback(() => {
    setNotifications(loadNotifications());
  }, []);

  useEffect(() => {
    refresh();

    // Sync badge
    const stored = localStorage.getItem('lastSyncAt');
    if (stored) setLastSync(stored);

    function onStorage(e: StorageEvent) {
      if (e.key === 'lastSyncAt') setLastSync(e.newValue);
      if (e.key === STORAGE_KEY) refresh();
    }

    function onNotif() { refresh(); }

    window.addEventListener('storage', onStorage);
    window.addEventListener('app:notification', onNotif);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('app:notification', onNotif);
    };
  }, [refresh]);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (
        open &&
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !btnRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  function markAllRead() {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    saveNotifications(updated);
  }

  function markRead(id: string) {
    const updated = notifications.map((n) => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    saveNotifications(updated);
  }

  function openDetail(n: Notification) {
    markRead(n.id);
    setOpen(false);
    setDetailNotif({ ...n, read: true });
  }

  function clearAll() {
    setNotifications([]);
    saveNotifications([]);
  }

  function formatLastSync(iso: string): string {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return 'baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    return `${Math.floor(diff / 86400)} hari lalu`;
  }

  return (
    <>
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between relative z-30">
      <div className="flex items-center gap-3">
        <Image src="/logo.webp" alt="Multi Power Logo" width={36} height={36} className="object-contain" />
        <div className="h-5 w-px bg-gray-200" />
        <h2 className="text-base font-semibold text-gray-800">{title}</h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Sync badge */}
        {lastSync && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block animate-pulse" />
            <span>Sync: {formatLastSync(lastSync)}</span>
          </div>
        )}

        {/* Notification bell */}
        <div className="relative">
          <button
            ref={btnRef}
            onClick={() => { setOpen((v) => !v); if (!open) markAllRead(); }}
            className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title="Notifikasi"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown panel */}
          {open && (
            <div
              ref={panelRef}
              className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-800">Notifikasi</span>
                <div className="flex items-center gap-2">
                  {notifications.length > 0 && (
                    <>
                      <button
                        onClick={markAllRead}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        Tandai semua dibaca
                      </button>
                      <span className="text-gray-200">|</span>
                      <button
                        onClick={clearAll}
                        className="text-xs text-gray-400 hover:text-red-500"
                      >
                        Hapus semua
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* List */}
              <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-50">
                {notifications.length === 0 ? (
                  <div className="py-12 text-center">
                    <svg className="w-10 h-10 mx-auto text-gray-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <p className="text-sm text-gray-400">Belum ada notifikasi</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => openDetail(n)}
                      className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50/40' : ''}`}
                    >
                      {typeIcon(n.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-xs font-semibold truncate ${!n.read ? 'text-gray-900' : 'text-gray-600'}`}>
                            {n.title}
                          </p>
                          {!n.read && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.time)}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>

    {/* Notification Detail Modal */}
    {detailNotif && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        onClick={() => setDetailNotif(null)}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal header */}
          <div className={`px-6 py-4 flex items-center gap-3 border-b ${
            detailNotif.type === 'error' ? 'bg-red-50 border-red-100' :
            detailNotif.type === 'success' ? 'bg-green-50 border-green-100' :
            detailNotif.type === 'sync' ? 'bg-blue-50 border-blue-100' :
            'bg-gray-50 border-gray-100'
          }`}>
            {typeIcon(detailNotif.type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{detailNotif.title}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{new Date(detailNotif.time).toLocaleString('id-ID')}</p>
            </div>
            <button
              onClick={() => setDetailNotif(null)}
              className="ml-2 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Modal body */}
          <div className="px-6 py-5">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
              {detailNotif.message}
            </p>
          </div>

          {/* Modal footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
            <button
              onClick={() => setDetailNotif(null)}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
              style={{ backgroundColor: '#13664E' }}
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
}
