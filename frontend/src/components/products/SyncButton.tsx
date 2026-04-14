'use client';

import toast from 'react-hot-toast';
import { useSync } from '../../hooks/useSync';
import { getErrorMessage } from '../../lib/utils';

interface SyncButtonProps {
  onSyncComplete?: () => void;
}

export default function SyncButton({ onSyncComplete }: SyncButtonProps) {
  const { pulling, pushing, pullFromOdoo, pushToOdoo } = useSync();

  async function handlePull() {
    try {
      const result = await pullFromOdoo();
      if (result) {
        toast.success(
          `Pulled ${result.recordsSuccess} products from Odoo` +
            (result.recordsFailed > 0 ? ` (${result.recordsFailed} failed)` : ''),
        );
        onSyncComplete?.();
      }
    } catch (err) {
      toast.error(`Pull failed: ${getErrorMessage(err)}`);
    }
  }

  async function handlePush() {
    try {
      const result = await pushToOdoo();
      if (result) {
        toast.success(
          `Pushed ${result.recordsSuccess} products to Odoo` +
            (result.recordsFailed > 0 ? ` (${result.recordsFailed} failed)` : ''),
        );
      }
    } catch (err) {
      toast.error(`Push failed: ${getErrorMessage(err)}`);
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handlePull}
        disabled={pulling || pushing}
        className="btn-secondary"
        title="Pull products from Odoo into local database"
      >
        {pulling ? (
          <>
            <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            Pulling...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Pull from Odoo
          </>
        )}
      </button>
      <button
        onClick={handlePush}
        disabled={pulling || pushing}
        className="btn-secondary"
        title="Push local products to Odoo"
      >
        {pushing ? (
          <>
            <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            Pushing...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4 4l4-4m0 0l4 4m-4-4V4" />
            </svg>
            Push to Odoo
          </>
        )}
      </button>
    </div>
  );
}
