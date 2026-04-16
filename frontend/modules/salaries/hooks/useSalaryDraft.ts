/**
 * useSalaryDraft — manages draft auto-save logic for the salaries page.
 *
 * Extracted from SalariesPage to reduce the component's responsibility.
 * Handles:
 *  - Building the draft map from dirty rows
 *  - Mirroring to localStorage for offline persistence
 *  - Debounced server sync via salaryDraftService (2s after change)
 *  - Skipping the first render (avoids writing back what we just loaded)
 *  - Resetting tracking refs when selectedMonth or user changes
 */
import { useEffect, useRef } from 'react';
import { logError } from '@shared/lib/logger';
import { salaryDraftService } from '@services/salaryDraftService';
import { buildSalaryDraftPatch } from '@modules/salaries/lib/salaryDomain';
import type { SalaryRow } from '@modules/salaries/types/salary.types';

const DRAFT_DEBOUNCE_MS = 2_000;

const buildSalaryDraftMap = (rows: SalaryRow[]) => {
  const draft: Record<string, ReturnType<typeof buildSalaryDraftPatch>> = {};
  rows
    .filter((row) => !!row.isDirty)
    .forEach((row) => {
      draft[row.id] = buildSalaryDraftPatch(row);
    });
  return draft;
};

interface UseSalaryDraftParams {
  rows: SalaryRow[];
  loadingData: boolean;
  selectedMonth: string;
  salariesDraftKey: string;
  userId: string | undefined;
}

export function useSalaryDraft({
  rows,
  loadingData,
  selectedMonth,
  salariesDraftKey,
  userId,
}: UseSalaryDraftParams): void {
  const skipNextDraftSaveRef = useRef(true);
  const lastDraftSignatureRef = useRef<string | null>(null);

  // Reset draft tracking when selectedMonth or user changes so the first render
  // with new data doesn't trigger a premature server sync.
  // FIX M2: userId was missing from deps — reset must run when user switches too
  useEffect(() => {
    skipNextDraftSaveRef.current = true;
    lastDraftSignatureRef.current = null;
  }, [selectedMonth, userId]);

  // Draft auto-save effect:
  // 1. Build draft patch from dirty rows → serialize to JSON.
  // 2. Mirror to localStorage for offline persistence.
  // 3. On first data load (skipNextDraftSaveRef), capture signature but don't sync to server.
  // 4. On subsequent changes, compare signature. If changed, debounce 2s then sync to server.
  useEffect(() => {
    if (loadingData) return;

    const draft = buildSalaryDraftMap(rows);
    const serializedDraft = JSON.stringify(draft);

    // ── localStorage mirror ────────────────────────────────────────────────
    try {
      if (Object.keys(draft).length === 0) {
        localStorage.removeItem(salariesDraftKey);
      } else {
        localStorage.setItem(salariesDraftKey, serializedDraft);
      }
    } catch (e) {
      logError('[SalaryDraft] Failed to mirror drafts to localStorage', e, { level: 'warn' });
    }

    // ── Skip first render (data just loaded) ──────────────────────────────
    if (skipNextDraftSaveRef.current) {
      skipNextDraftSaveRef.current = false;
      lastDraftSignatureRef.current = serializedDraft;
      return;
    }

    // ── Skip if nothing changed ───────────────────────────────────────────
    if (lastDraftSignatureRef.current === serializedDraft) return;

    // FIX W1: if draft is now empty (e.g. after approve/pay cleared isDirty),
    // sync immediately — do not debounce. This ensures the server draft is
    // cleared even if a previous 2s timer was cancelled mid-flight by approve.
    const draftIsEmpty = Object.keys(draft).length === 0;
    if (draftIsEmpty) {
      lastDraftSignatureRef.current = serializedDraft;
      void (async () => {
        try {
          await salaryDraftService.syncDraftsForMonth(selectedMonth, draft);
        } catch (e) {
          logError('[SalaryDraft] Failed to clear server drafts after approve', e, { level: 'warn' });
        }
      })();
      return;
    }

    // ── Debounced server sync (dirty rows) ────────────────────────────────
    const timer = setTimeout(() => {
      void (async () => {
        try {
          await salaryDraftService.syncDraftsForMonth(selectedMonth, draft);
          lastDraftSignatureRef.current = serializedDraft;
        } catch (e) {
          logError('[SalaryDraft] Failed to auto-save drafts to server', e, { level: 'warn' });
        }
      })();
    }, DRAFT_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [rows, loadingData, salariesDraftKey, selectedMonth, userId]);
}
