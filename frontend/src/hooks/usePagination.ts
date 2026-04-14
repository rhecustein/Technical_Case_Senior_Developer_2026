'use client';

import { useState, useCallback } from 'react';
import { PaginationParams } from '../types/pagination';

interface UsePaginationReturn {
  params: PaginationParams;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setSearch: (search: string) => void;
  setSortBy: (sortBy: string, order: 'ASC' | 'DESC') => void;
}

export function usePagination(initial?: Partial<PaginationParams>): UsePaginationReturn {
  const [params, setParams] = useState<PaginationParams>({
    page: 1,
    pageSize: 10,
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'DESC',
    ...initial,
  });

  // Wrap all setters in useCallback so their references stay stable across renders.
  // Without this, any component that lists these as useEffect deps will re-fire
  // on every render even when the values haven't changed.
  const setPage = useCallback(
    (page: number) => setParams((p) => ({ ...p, page })),
    [],
  );

  const setPageSize = useCallback(
    (pageSize: number) => setParams((p) => ({ ...p, pageSize, page: 1 })),
    [],
  );

  const setSearch = useCallback(
    (search: string) => setParams((p) => ({ ...p, search, page: 1 })),
    [],
  );

  const setSortBy = useCallback(
    (sortBy: string, sortOrder: 'ASC' | 'DESC') =>
      setParams((p) => ({ ...p, sortBy, sortOrder })),
    [],
  );

  return { params, setPage, setPageSize, setSearch, setSortBy };
}
