import { Injectable, inject } from '@angular/core';
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
}

@Injectable({ providedIn: 'root' })
export class FileStorageService {
  private readonly supabase = inject(SupabaseService);

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

    const { data: userData } = await this.supabase.auth.getUser();

    await this.supabase.from('portal_files').upsert(
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
        uploaded_by: userData.user?.id ?? null,
      },
      { onConflict: 'path' },
    );

    return {
      bucket,
      path,
      signedUrl: signed.signedUrl,
      filename,
      mimeType,
      sizeBytes: file.size,
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

  async delete(bucket: StorageBucket, path: string): Promise<void> {
    await this.supabase.storage(bucket).remove([path]);
    await this.supabase.from('portal_files').delete().eq('path', path);
  }

  async dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const res = await fetch(dataUrl);
    return res.blob();
  }
}
