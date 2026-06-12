import { Component, effect, inject, input, signal } from '@angular/core';
import type { AuditPhotoRef } from '../audit-technique.models';
import { AuditTechniqueDataService } from '../services/audit-technique-data.service';

interface ResolvedPhoto {
  photo: AuditPhotoRef;
  url: string | null;
}

@Component({
  selector: 'app-audit-photo-grid',
  standalone: true,
  template: `
    <div class="photo-grid">
      @for (item of resolved(); track item.photo.portalFileId) {
        @if (item.url) {
          <a class="photo-wrap" [href]="item.url" target="_blank" rel="noopener" [title]="item.photo.filename">
            <img [src]="item.url" [alt]="item.photo.filename" loading="lazy" />
          </a>
        } @else {
          <div class="photo-wrap photo-missing" [title]="item.photo.filename">?</div>
        }
      }
    </div>
  `,
  styles: `
    .photo-grid {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .photo-wrap {
      display: block;
    }

    .photo-wrap img {
      width: 90px;
      height: 90px;
      border-radius: 8px;
      object-fit: cover;
      border: 1px solid var(--border, #e2dccd);
      display: block;
    }

    .photo-missing {
      width: 90px;
      height: 90px;
      border-radius: 8px;
      border: 1px dashed var(--border2, #d8d0bc);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text3, #5e6b4f);
      font-size: 18px;
      background: var(--bg3, #e9e1d1);
    }
  `,
})
export class AuditPhotoGridComponent {
  private readonly data = inject(AuditTechniqueDataService);

  readonly photos = input.required<AuditPhotoRef[]>();
  readonly resolved = signal<ResolvedPhoto[]>([]);

  constructor() {
    effect(() => {
      const photos = this.photos();
      void this.resolve(photos);
    });
  }

  private async resolve(photos: AuditPhotoRef[]): Promise<void> {
    if (!photos.length) {
      this.resolved.set([]);
      return;
    }
    const items = await Promise.all(
      photos.map(async (photo) => ({
        photo,
        url: await this.data.resolvePhotoUrl(photo),
      })),
    );
    this.resolved.set(items);
  }
}
