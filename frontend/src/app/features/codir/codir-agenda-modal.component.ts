import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CodirAgendaService } from '../../core/services/codir-agenda.service';
import { CodirDataService } from '../../core/services/codir-data.service';
import { CodirIconComponent } from '../../shared/components/codir-icon/codir-icon.component';

@Component({
  selector: 'app-codir-agenda-modal',
  standalone: true,
  imports: [FormsModule, CodirIconComponent],
  templateUrl: './codir-agenda-modal.component.html',
  styleUrl: './codir-agenda-modal.component.scss',
})
export class CodirAgendaModalComponent {
  readonly codir = inject(CodirDataService);
  private readonly agenda = inject(CodirAgendaService);

  readonly open = input(false);
  readonly selectedIds = input<string[]>([]);

  readonly close = output<void>();
  readonly toast = output<string>();
  readonly removeAction = output<string>();

  readonly meetingTitle = signal('');
  readonly meetingDate = signal('');
  readonly meetingTime = signal('');
  readonly meetingLocation = signal('');
  readonly intro = signal('');
  readonly durations = signal<Record<string, number>>({});
  readonly includeOwners = signal(true);
  readonly includeStatus = signal(true);
  readonly includeComments = signal(false);
  readonly recipients = signal<Record<string, boolean>>({});
  readonly preview = signal('');

  readonly selectedActions = computed(() => {
    const idSet = new Set(this.selectedIds());
    return this.codir.activeActions().filter((a) => idSet.has(a.id));
  });

  readonly selectedByTheme = computed(() =>
    this.codir
      .themes()
      .map((theme) => ({
        theme,
        actions: this.selectedActions().filter((a) => a.theme === theme),
      }))
      .filter((g) => g.actions.length > 0),
  );

  constructor() {
    effect(() => {
      if (!this.open()) return;
      this.initState();
    });
  }

  private initState(): void {
    const date = this.agenda.defaultMeetingDate();
    this.meetingDate.set(date);
    this.meetingTitle.set(this.agenda.defaultMeetingTitle(date));
    this.meetingTime.set('');
    this.meetingLocation.set('');
    this.intro.set('');
    this.includeOwners.set(true);
    this.includeStatus.set(true);
    this.includeComments.set(false);

    const dur: Record<string, number> = {};
    const recip: Record<string, boolean> = {};
    for (const m of this.codir.assignees()) {
      recip[m.id] = !!m.email;
    }
    for (const id of this.selectedIds()) {
      dur[id] = 10;
    }
    this.durations.set(dur);
    this.recipients.set(recip);
    this.refreshPreview();
  }

  private collectParams() {
    return {
      meetingTitle: this.meetingTitle(),
      meetingDate: this.meetingDate(),
      meetingTime: this.meetingTime(),
      meetingLocation: this.meetingLocation(),
      intro: this.intro(),
      durationsByTheme: this.durations(),
      includeOwners: this.includeOwners(),
      includeStatus: this.includeStatus(),
      includeComments: this.includeComments(),
      recipientsState: this.recipients(),
    };
  }

  refreshPreview(): void {
    this.preview.set(this.agenda.buildAgendaText(this.selectedIds(), this.collectParams()));
  }

  durationFor(id: string): number {
    return this.durations()[id] ?? 10;
  }

  setDuration(id: string, value: number | string): void {
    const n = Math.max(1, Math.min(180, Number(value) || 10));
    this.durations.update((d) => ({ ...d, [id]: n }));
    this.refreshPreview();
  }

  toggleRecipient(memberId: string): void {
    const member = this.codir.assigneeById(memberId);
    if (!member?.email) return;
    this.recipients.update((r) => ({ ...r, [memberId]: !r[memberId] }));
  }

  removeFromAgenda(id: string): void {
    const remaining = this.selectedIds().filter((x) => x !== id);
    this.removeAction.emit(id);
    if (!remaining.length) {
      this.close.emit();
      return;
    }
    this.durations.update((d) => {
      const next = { ...d };
      delete next[id];
      return next;
    });
    this.preview.set(this.agenda.buildAgendaText(remaining, this.collectParams()));
  }

  onBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.close.emit();
    }
  }

  copy(): void {
    navigator.clipboard
      .writeText(this.preview())
      .then(() => this.toast.emit('Ordre du jour copié dans le presse-papier'))
      .catch(() => this.toast.emit('Échec de la copie'));
  }

  sendMail(): void {
    try {
      const params = this.collectParams();
      const filename = this.agenda.generateAgendaDocx(this.selectedIds(), params);
      this.agenda.openMailClient(this.selectedIds(), params, filename);
      this.toast.emit('Document Word téléchargé. Glissez-le dans le mail qui s\u2019ouvre.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.toast.emit(msg.includes('destinataire') ? msg : 'Erreur : ' + msg.slice(0, 100));
    }
  }
}
