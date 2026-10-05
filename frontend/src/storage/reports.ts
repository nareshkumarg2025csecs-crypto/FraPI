import { getDb } from './db';
import knownBadSeed from '../../../data/seed/known_bad.json' with { type: 'json' };
import type { Reason } from '../engines/types';

export type EntityType = 'vpa' | 'url' | 'domain' | 'phone';

export interface ReportItem {
  id: string;
  entityType: EntityType;
  value: string;
  category: string;
  createdAt: number;
  source: 'seed' | 'user';
}

export interface BlocklistCheckResult {
  hit: boolean;
  score: number;
  matchedItem?: ReportItem;
  reason?: Reason;
}

const STORE_NAME = 'reports';

export function normalizeEntityValue(type: EntityType, val: string): string {
  const trimmed = val.trim().toLowerCase();
  switch (type) {
    case 'vpa':
      return trimmed;
    case 'phone':
      return trimmed.replace(/[^\d+]/g, '');
    case 'domain':
      return trimmed.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
    case 'url':
      try {
        const u = new URL(trimmed.startsWith('http') ? trimmed : 'http://' + trimmed);
        return `${u.protocol}//${u.host}${u.pathname}`.toLowerCase();
      } catch {
        return trimmed;
      }
  }
}

export async function addReport(item: {
  entityType: EntityType;
  value: string;
  category?: string;
  source?: 'seed' | 'user';
}): Promise<ReportItem> {
  const normalized = normalizeEntityValue(item.entityType, item.value);
  const record: ReportItem = {
    id: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    entityType: item.entityType,
    value: normalized,
    category: item.category || 'user_reported',
    createdAt: Date.now(),
    source: item.source || 'user',
  };

  const db = await getDb();
  await db.put(STORE_NAME, record);
  return record;
}

export async function removeReport(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
}

export async function clearAllReports(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE_NAME);
}

export async function listReports(): Promise<ReportItem[]> {
  try {
    const db = await getDb();
    const raw: ReportItem[] = await db.getAll(STORE_NAME);

    if (raw.length === 0) {
      await seedKnownBad(false);
      return db.getAll(STORE_NAME);
    }

    return raw;
  } catch (err) {
    console.error('Failed to access reports DB:', err);
    return [];
  }
}

export async function seedKnownBad(forceReset: boolean = false): Promise<void> {
  const db = await getDb();
  const count = await db.count(STORE_NAME);

  if (count > 0 && !forceReset) {
    return;
  }

  if (forceReset) {
    await db.clear(STORE_NAME);
  }

  const seedItems = knownBadSeed as Array<{ entityType: EntityType; value: string; category?: string }>;
  for (const item of seedItems) {
    await addReport({
      entityType: item.entityType,
      value: item.value,
      category: item.category || 'known_suspicious',
      source: 'seed',
    });
  }
}

export async function checkEntity(entity: { type: EntityType; value: string }): Promise<BlocklistCheckResult> {
  if (!entity.value || entity.value.trim().length === 0) {
    return { hit: false, score: 0 };
  }

  const normalized = normalizeEntityValue(entity.type, entity.value);
  const allReports = await listReports();

  const match = allReports.find(
    (r) => r.entityType === entity.type && (r.value === normalized || (entity.type === 'url' && normalized.includes(r.value)))
  );

  if (match) {
    return {
      hit: true,
      score: 70, // 0.7 score
      matchedItem: match,
      reason: {
        layer: 'web',
        severity: 'high',
        title: 'Local Blocklist Match',
        detail: 'You (or your imported list) previously reported this.',
        evidence: [`Type: ${match.entityType}`, `Reported Value: ${match.value}`, `Category: ${match.category}`],
      },
    };
  }

  return { hit: false, score: 0 };
}

export async function exportJSON(): Promise<string> {
  const reports = await listReports();
  return JSON.stringify(reports, null, 2);
}

export interface ImportResult {
  importedCount: number;
  errors: string[];
}

export async function importJSON(jsonString: string): Promise<ImportResult> {
  const errors: string[] = [];
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return { importedCount: 0, errors: ['Invalid JSON format: unable to parse input string.'] };
  }

  if (!Array.isArray(parsed)) {
    return { importedCount: 0, errors: ['Import format error: Root element must be an array of reports.'] };
  }

  const validTypes: EntityType[] = ['vpa', 'url', 'domain', 'phone'];
  let importedCount = 0;

  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];
    if (!item || typeof item !== 'object') {
      errors.push(`Item #${i} is not a valid object.`);
      continue;
    }

    const { entityType, value, category } = item as Record<string, unknown>;

    if (!entityType || !validTypes.includes(entityType as EntityType)) {
      errors.push(`Item #${i}: Missing or invalid entityType. Must be one of: ${validTypes.join(', ')}.`);
      continue;
    }

    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      errors.push(`Item #${i}: Missing or invalid value.`);
      continue;
    }

    await addReport({
      entityType: entityType as EntityType,
      value: String(value),
      category: typeof category === 'string' ? category : 'imported_report',
      source: 'user',
    });
    importedCount++;
  }

  return { importedCount, errors };
}
