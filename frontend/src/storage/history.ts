import { getDb } from './db';
import type { RiskLevel } from '../engines/types';

export interface HistoryItem {
  id: string;
  timestamp: number;
  riskLevel: RiskLevel;
  scorePercentage: number;
  label: string;
  redactedSnippet: string;
  reasonsCount: number;
  sources: string[];
}

const STORE_NAME = 'history';
const SETTING_KEY_NO_HISTORY = 'frapi_dont_keep_history';

export function getDoNotKeepHistorySetting(): boolean {
  try {
    return localStorage.getItem(SETTING_KEY_NO_HISTORY) === 'true';
  } catch {
    return false;
  }
}

export function setDoNotKeepHistorySetting(value: boolean): void {
  try {
    localStorage.setItem(SETTING_KEY_NO_HISTORY, value ? 'true' : 'false');
  } catch {
    // Ignore storage errors
  }
}



export function redactTextSnippet(text?: string, maxLen = 80): string {
  if (!text) return 'QR payment scan check';
  // Redact potential 10-digit phone numbers and 4-6 digit OTPs/PINs
  let clean = text
    .replace(/\b\d{10}\b/g, 'XXXXXXXXXX')
    .replace(/\b\d{4,6}\b/g, '******')
    .trim();
  if (clean.length > maxLen) {
    clean = clean.slice(0, maxLen) + '...';
  }
  return clean;
}

export async function addHistoryItem(item: {
  riskLevel: RiskLevel;
  scorePercentage: number;
  label: string;
  rawTextSnippet?: string;
  reasonsCount: number;
  sources: string[];
}): Promise<HistoryItem | null> {
  if (getDoNotKeepHistorySetting()) {
    return null;
  }

  const record: HistoryItem = {
    id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    riskLevel: item.riskLevel,
    scorePercentage: item.scorePercentage,
    label: item.label,
    redactedSnippet: redactTextSnippet(item.rawTextSnippet),
    reasonsCount: item.reasonsCount,
    sources: item.sources,
  };

  const db = await getDb();
  await db.put(STORE_NAME, record);
  return record;
}

export async function listHistory(): Promise<HistoryItem[]> {
  const db = await getDb();
  const all: HistoryItem[] = await db.getAll(STORE_NAME);
  return all.sort((a, b) => b.timestamp - a.timestamp);
}

export async function removeHistoryItem(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
}

export async function clearAllHistory(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE_NAME);
}
