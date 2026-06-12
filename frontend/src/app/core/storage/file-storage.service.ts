import { Injectable, inject, Injector } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { SupabaseService } from '../supabase/supabase.service';

export type StorageBucket =
  | 'audit-commerce'
  | 'recrutement'
  | 'audit-technique'
  | 'ossature'
  | 'chiffrage'
  | 'portal';

export interface FileUploadMeta {
  appSlot: string;
  entityType: string;
  entityId: string;
  kind?: string;
  storageKey?: string;
}

export interface UploadedFileRef {
  bucket: StorageBucket;
  path: string;
  signedUrl: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  portalFileId: string;
}

export interface PortalFileRow {
  id: string;
  bucket: StorageBucket;
  path: string;
  filename: string;
}

@Injectable({ providedIn: 'root' })
export class FileStorageService {
  private readonly supabase = inject(SupabaseService);
  private readonly injector = inject(Injector);

  async upload(
    bucket: StorageBucket,
    path: string,
    file: Blob | File,
    meta: FileUploadMeta,
  ): Promise<UploadedFileRef> {
    const filename = file instanceof File ? file.name : path.split('/').pop() ?? 'file';
    const mimeType = file.type || 'application/octet-stream';

    const { error: upErr } = await this.supabase.storage(bucket).upload(path, file, {
      upsert: true,
      contentType: mimeType,
    });
    if (upErr) throw upErr;

    const { data: signed, error: signErr } = await this.supabase.storage(bucket).createSignedUrl(path, 3600);
    if (signErr || !signed?.signedUrl) throw signErr ?? new Error('Signed URL unavailable');

    const { data: fileRow, error: dbErr } = await this.supabase
      .from('portal_files')
      .upsert(
        {
          bucket,
          path,
          storage_key: meta.storageKey ?? null,
          app_slot: meta.appSlot,
          entity_type: meta.entityType,
          entity_id: meta.entityId,
          filename,
          mime_type: mimeType,
          size_bytes: file.size,
          kind: meta.kind ?? null,
          uploaded_by: this.injector.get(AuthService).portalUserId(),
        },
        { onConflict: 'path' },
      )
      .select('id')
      .single();
    if (dbErr || !fileRow?.id) throw dbErr ?? new Error('portal_files row missing after upload');

    return {
      bucket,
      path,
      signedUrl: signed.signedUrl,
      filename,
      mimeType,
      sizeBytes: file.size,
      portalFileId: fileRow.id,
    };
  }

  async getSignedUrl(bucket: StorageBucket, path: string, expiresIn = 3600): Promise<string | null> {
    const { data, error } = await this.supabase.storage(bucket).createSignedUrl(path, expiresIn);
    if (error) {
      console.warn('[FileStorage] signed URL failed', path, error);
      return null;
    }
    return data?.signedUrl ?? null;
  }

  async getPortalFile(id: string): Promise<PortalFileRow | null> {
    const { data, error } = await this.supabase
      .from('portal_files')
      .select('id, bucket, path, filename')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return data as PortalFileRow;
  }

  async getPortalFilesByIds(ids: string[]): Promise<PortalFileRow[]> {
    if (!ids.length) return [];
    const { data, error } = await this.supabase
      .from('portal_files')
      .select('id, bucket, path, filename')
      .in('id', ids);
    if (error) {
      console.warn('[FileStorage] portal_files lookup failed', error);
      return [];
    }
    return (data ?? []) as PortalFileRow[];
  }

  async getPortalFileByPath(bucket: StorageBucket, path: string): Promise<PortalFileRow | null> {
    const { data, error } = await this.supabase
      .from('portal_files')
      .select('id, bucket, path, filename')
      .eq('bucket', bucket)
      .eq('path', path)
      .maybeSingle();
    if (error || !data) return null;
    return data as PortalFileRow;
  }

  async resolvePortalFileUrl(portalFileId: string): Promise<string | null> {
    const row = await this.getPortalFile(portalFileId);
    if (!row) return null;
    return this.getSignedUrl(row.bucket, row.path);
  }

  /** Batch-load portal_files rows referenced by id or legacy storage path. */
  async resolvePortalFileRefs(
    ids: string[],
    paths: Array<{ bucket: StorageBucket; path: string }>,
  ): Promise<Map<string, PortalFileRow>> {
    const map = new Map<string, PortalFileRow>();
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length) {
      for (const row of await this.getPortalFilesByIds(uniqueIds)) {
        map.set(`id:${row.id}`, row);
      }
    }
    const uniquePaths = [...new Map(paths.map((p) => [`${p.bucket}:${p.path}`, p])).values()];
    for (const { bucket, path } of uniquePaths) {
      const row = await this.getPortalFileByPath(bucket, path);
      if (row) map.set(`path:${bucket}:${path}`, row);
    }
    return map;
  }

  async delete(bucket: StorageBucket, path: string): Promise<void> {
    await this.supabase.storage(bucket).remove([path]);
    await this.supabase.from('portal_files').delete().eq('path', path);
  }

  async deletePortalFile(portalFileId: string): Promise<void> {
    const row = await this.getPortalFile(portalFileId);
    if (row) {
      await this.supabase.storage(row.bucket).remove([row.path]);
    }
    await this.supabase.from('portal_files').delete().eq('id', portalFileId);
  }

  /** Removes all storage objects and `portal_files` rows for an entity. */
  async deleteEntityFiles(
    bucket: StorageBucket,
    entityType: string,
    entityId: string,
  ): Promise<void> {
    const { data, error } = await this.supabase
      .from('portal_files')
      .select('path')
      .eq('bucket', bucket)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId);
    if (error) throw error;
    await Promise.all((data ?? []).map((row) => this.delete(bucket, row.path)));
  }

  async dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const res = await fetch(dataUrl);
    return res.blob();
  }
}
