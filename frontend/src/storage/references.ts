import { getDb } from './db';
import trustedMerchantsSeed from '../../../data/seed/trusted_merchants.json' with { type: 'json' };

export interface SavedReference {
  id: string;
  label: string;
  vpa: string;
  normalizedVpa: string;
  payeeName: string;
  hash: string;
  createdAt: number;
  isDemo?: boolean;
}

export interface VerifiedReference extends SavedReference {
  isTampered: boolean;
  tamperWarning?: string;
}

const STORE_NAME = 'references';

export function normalizeVpa(vpa: string): string {
  return vpa.trim().toLowerCase();
}

export async function computeReferenceHash(normalizedVpa: string, payeeName: string): Promise<string> {
  const canonical = `${normalizedVpa}|${payeeName.trim().toLowerCase()}`;
  const data = new TextEncoder().encode(canonical);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function addReference(item: {
  label: string;
  vpa: string;
  payeeName: string;
  isDemo?: boolean;
}): Promise<SavedReference> {
  const normalizedVpa = normalizeVpa(item.vpa);
  const hash = await computeReferenceHash(normalizedVpa, item.payeeName);
  const ref: SavedReference = {
    id: `ref_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    label: item.label.trim(),
    vpa: item.vpa.trim(),
    normalizedVpa,
    payeeName: item.payeeName.trim(),
    hash,
    createdAt: Date.now(),
    isDemo: item.isDemo ?? false,
  };

  const db = await getDb();
  await db.put(STORE_NAME, ref);
  return ref;
}

export async function removeReference(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
}

export async function clearAllReferences(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE_NAME);
}

export async function listReferences(): Promise<VerifiedReference[]> {
  try {
    const db = await getDb();
    const rawList: SavedReference[] = await db.getAll(STORE_NAME);

    if (rawList.length === 0) {
      await seedTrustedMerchants(false);
      const seededList: SavedReference[] = await db.getAll(STORE_NAME);
      return verifyReferences(seededList);
    }

    return verifyReferences(rawList);
  } catch (err) {
    console.error('Failed to access references DB:', err);
    return [];
  }
}

async function verifyReferences(refs: SavedReference[]): Promise<VerifiedReference[]> {
  const verified: VerifiedReference[] = [];

  for (const ref of refs) {
    const expectedHash = await computeReferenceHash(ref.normalizedVpa, ref.payeeName);
    const isTampered = expectedHash !== ref.hash;
    verified.push({
      ...ref,
      isTampered,
      tamperWarning: isTampered ? 'this saved reference was modified' : undefined,
    });
  }

  return verified;
}

export async function seedTrustedMerchants(forceReset: boolean = false): Promise<void> {
  const db = await getDb();
  const count = await db.count(STORE_NAME);

  if (count > 0 && !forceReset) {
    return;
  }

  if (forceReset) {
    await db.clear(STORE_NAME);
  }

  for (const item of trustedMerchantsSeed as Array<{ label: string; vpa: string; payeeName: string }>) {
    await addReference({
      label: item.label,
      vpa: item.vpa,
      payeeName: item.payeeName,
      isDemo: true,
    });
  }
}
