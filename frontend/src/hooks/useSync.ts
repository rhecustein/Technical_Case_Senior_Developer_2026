'use client';

import { useState, useCallback } from 'react';
import { SyncResult } from '../types/api-response';
import { syncService } from '../services/sync.service';
import { getErrorMessage } from '../lib/utils';

interface UseSyncReturn {
  pulling: boolean;
  pushing: boolean;
  lastResult: SyncResult | null;
  pullFromOdoo: () => Promise<SyncResult | null>;
  pushToOdoo: () => Promise<SyncResult | null>;
}

export function useSync(): UseSyncReturn {
  const [pulling, setPulling] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  const pullFromOdoo = useCallback(async (): Promise<SyncResult | null> => {
    setPulling(true);
    try {
      const response = await syncService.pullFromOdoo();
      setLastResult(response.data);
      return response.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    } finally {
      setPulling(false);
    }
  }, []);

  const pushToOdoo = useCallback(async (): Promise<SyncResult | null> => {
    setPushing(true);
    try {
      const response = await syncService.pushToOdoo();
      setLastResult(response.data);
      return response.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    } finally {
      setPushing(false);
    }
  }, []);

  return { pulling, pushing, lastResult, pullFromOdoo, pushToOdoo };
}
