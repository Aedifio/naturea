import type { StorageBucket } from '../../../core/storage/file-storage.service';
import type { PortalFileRow } from '../../../core/storage/file-storage.service';
import type { AuditPhotoRef } from '../audit-technique.models';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIGNED_URL_RE = /\/object\/sign\/([^/?]+)\/([^?]+)/;

export type StoredAuditPhotoRef =
  | { kind: 'id'; portalFileId: string }
  | { kind: 'legacy'; bucket: StorageBucket; path: string };

export function auditPhotoPathFromSignedUrl(url: string): { bucket: StorageBucket; path: string } | null {
  const match = url.match(SIGNED_URL_RE);
  if (!match) return null;
  return {
    bucket: match[1] as StorageBucket,
    path: decodeURIComponent(match[2]),
  };
}

export function filenameFromStoragePath(path: string): string {
  const base = path.split('/').pop() ?? 'photo';
  const dash = base.indexOf('-');
  return dash > 0 && /^\d+$/.test(base.slice(0, dash)) ? base.slice(dash + 1) : base;
}

/** Classifies a raw DB value as a portal_files id or legacy storage path. */
export function classifyStoredAuditPhoto(raw: unknown): StoredAuditPhotoRef | null {
  if (!raw) return null;

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (UUID_RE.test(trimmed)) return { kind: 'id', portalFileId: trimmed };
    const fromSigned = auditPhotoPathFromSignedUrl(trimmed);
    if (fromSigned) return { kind: 'legacy', ...fromSigned };
    if (!trimmed.startsWith('http')) {
      return { kind: 'legacy', bucket: 'audit-technique', path: trimmed };
    }
    return null;
  }

  if (typeof raw === 'object' && raw !== null) {
    if ('portalFileId' in raw && typeof (raw as AuditPhotoRef).portalFileId === 'string') {
      return { kind: 'id', portalFileId: (raw as AuditPhotoRef).portalFileId };
    }
    if ('portal_file_id' in raw && typeof (raw as { portal_file_id: string }).portal_file_id === 'string') {
      return { kind: 'id', portalFileId: (raw as { portal_file_id: string }).portal_file_id };
    }
    if ('storagePath' in raw && typeof (raw as { storagePath: string }).storagePath === 'string') {
      const legacy = raw as { storagePath: string; storageBucket?: StorageBucket };
      return {
        kind: 'legacy',
        bucket: legacy.storageBucket ?? 'audit-technique',
        path: legacy.storagePath,
      };
    }
  }

  return null;
}

export function storedPhotoLookupKey(ref: StoredAuditPhotoRef): string {
  return ref.kind === 'id' ? `id:${ref.portalFileId}` : `path:${ref.bucket}:${ref.path}`;
}

export function toAuditPhotoRef(row: PortalFileRow): AuditPhotoRef {
  return { portalFileId: row.id, filename: row.filename };
}

export function hydrateAuditPhotos(
  raw: unknown[] | null | undefined,
  fileMap: Map<string, PortalFileRow>,
): AuditPhotoRef[] {
  const result: AuditPhotoRef[] = [];
  for (const item of raw ?? []) {
    const classified = classifyStoredAuditPhoto(item);
    if (!classified) continue;
    const row = fileMap.get(storedPhotoLookupKey(classified));
    if (row) result.push(toAuditPhotoRef(row));
  }
  return result;
}

/** Persist only portal_files ids in audit_technique_corps.photos. */
export function serializeAuditPhotos(photos: AuditPhotoRef[]): string[] {
  return photos.map((p) => p.portalFileId);
}

export function collectStoredPhotoRefs(rawPhotos: unknown[][]): {
  ids: string[];
  paths: Array<{ bucket: StorageBucket; path: string }>;
} {
  const ids: string[] = [];
  const paths: Array<{ bucket: StorageBucket; path: string }> = [];
  for (const photos of rawPhotos) {
    for (const raw of photos ?? []) {
      const classified = classifyStoredAuditPhoto(raw);
      if (!classified) continue;
      if (classified.kind === 'id') ids.push(classified.portalFileId);
      else paths.push({ bucket: classified.bucket, path: classified.path });
    }
  }
  return { ids, paths };
}
