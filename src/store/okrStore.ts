import { create } from 'zustand';
import type { OKR, OKRWithDetails, TreeNode, KeyResult } from '@/types';
import * as api from '@/api';

interface OkrStore {
  okrs: OKR[];
  currentOkr: OKRWithDetails | null;
  alignmentTree: TreeNode[];
  loading: boolean;
  error: string | null;

  fetchOkrs: (params?: Record<string, string>) => Promise<void>;
  fetchOkrById: (id: string) => Promise<void>;
  fetchAlignmentTree: () => Promise<void>;
  createOkr: (data: Partial<OKR>) => Promise<void>;
  updateOkr: (id: string, data: Partial<OKR>) => Promise<void>;
  deleteOkr: (id: string) => Promise<void>;
  createKeyResult: (okrId: string, data: Partial<KeyResult>) => Promise<void>;
  updateKeyResultProgress: (okrId: string, krId: string, currentValue: number) => Promise<void>;
  deleteKeyResult: (okrId: string, krId: string) => Promise<void>;
  clearCurrentOkr: () => void;
}

export const useOkrStore = create<OkrStore>((set) => ({
  okrs: [],
  currentOkr: null,
  alignmentTree: [],
  loading: false,
  error: null,

  fetchOkrs: async (params) => {
    set({ loading: true, error: null });
    try {
      const okrs = await api.fetchOkrs(params);
      set({ okrs, loading: false });
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : String(e), loading: false });
    }
  },

  fetchOkrById: async (id) => {
    set({ loading: true, error: null });
    try {
      const currentOkr = await api.fetchOkrById(id);
      set({ currentOkr, loading: false });
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : String(e), loading: false });
    }
  },

  fetchAlignmentTree: async () => {
    set({ loading: true, error: null });
    try {
      const alignmentTree = await api.fetchAlignmentTree();
      set({ alignmentTree, loading: false });
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : String(e), loading: false });
    }
  },

  createOkr: async (data) => {
    set({ loading: true, error: null });
    try {
      const newOkr = await api.createOkr(data);
      set((state) => ({ okrs: [...state.okrs, newOkr], loading: false }));
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : String(e), loading: false });
    }
  },

  updateOkr: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const updated = await api.updateOkr(id, data);
      set((state) => ({
        okrs: state.okrs.map((o) => (o.id === id ? updated : o)),
        currentOkr: state.currentOkr?.id === id ? { ...state.currentOkr, ...updated, key_results: state.currentOkr.key_results } : state.currentOkr,
        loading: false,
      }));
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : String(e), loading: false });
    }
  },

  deleteOkr: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.deleteOkr(id);
      set((state) => ({
        okrs: state.okrs.filter((o) => o.id !== id),
        currentOkr: state.currentOkr?.id === id ? null : state.currentOkr,
        loading: false,
      }));
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : String(e), loading: false });
    }
  },

  createKeyResult: async (okrId, data) => {
    set({ loading: true, error: null });
    try {
      const kr = await api.createKeyResult(okrId, data);
      set((state) => ({
        currentOkr:
          state.currentOkr?.id === okrId
            ? { ...state.currentOkr, key_results: [...state.currentOkr.key_results, kr] }
            : state.currentOkr,
        loading: false,
      }));
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : String(e), loading: false });
    }
  },

  updateKeyResultProgress: async (okrId, krId, currentValue) => {
    set({ loading: true, error: null });
    try {
      const updatedKr = await api.updateKeyResultProgress(okrId, krId, currentValue);
      set((state) => ({
        currentOkr:
          state.currentOkr?.id === okrId
            ? {
                ...state.currentOkr,
                key_results: state.currentOkr.key_results.map((kr) => (kr.id === krId ? updatedKr : kr)),
              }
            : state.currentOkr,
        loading: false,
      }));
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : String(e), loading: false });
    }
  },

  deleteKeyResult: async (okrId, krId) => {
    set({ loading: true, error: null });
    try {
      await api.deleteKeyResult(okrId, krId);
      set((state) => ({
        currentOkr:
          state.currentOkr?.id === okrId
            ? {
                ...state.currentOkr,
                key_results: state.currentOkr.key_results.filter((kr) => kr.id !== krId),
              }
            : state.currentOkr,
        loading: false,
      }));
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : String(e), loading: false });
    }
  },

  clearCurrentOkr: () => set({ currentOkr: null }),
}));
