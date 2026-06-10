import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CodirAction, CodirMember, CodirDataService } from '../../core/services/codir-data.service';
import { CodirMemberModalComponent } from './codir-member-modal.component';
import { CodirActionModalComponent } from './codir-action-modal.component';
import { CodirActionDetailModalComponent } from './codir-action-detail-modal.component';
import { CodirAgendaModalComponent } from './codir-agenda-modal.component';
import { CodirIconComponent } from '../../shared/components/codir-icon/codir-icon.component';

@Component({
  selector: 'app-codir-dashboard',
  standalone: true,
  imports: [RouterLink, CodirIconComponent],
  templateUrl: './codir-dashboard.component.html',
  styleUrl: './codir-pages.shared.scss',
})
export class CodirDashboardComponent {
  readonly codir = inject(CodirDataService);
  readonly stats = this.codir.dashboardStats;
  readonly themeStats = this.codir.themeStats;
  readonly today = computed(() => this.codir.todayLabel());
  readonly abs = Math.abs;
}

@Component({
  selector: 'app-codir-actions',
  standalone: true,
  imports: [CodirActionModalComponent, CodirActionDetailModalComponent, CodirAgendaModalComponent, CodirIconComponent],
  templateUrl: './codir-actions.component.html',
  styleUrl: './codir-pages.shared.scss',
})
export class CodirActionsComponent {
  readonly codir = inject(CodirDataService);
  private readonly route = inject(ActivatedRoute);

  readonly search = signal('');
  readonly statusFilter = signal<'all' | 'overdue' | 'todo' | 'in_progress' | 'done'>(
    (this.route.snapshot.queryParamMap.get('status') as 'overdue' | undefined) ?? 'all',
  );
  readonly themeFilter = signal(this.route.snapshot.queryParamMap.get('theme') ?? 'all');
  readonly ownerFilter = signal('all');
  readonly collapsed = signal<Record<string, boolean>>({});
  readonly createModalOpen = signal(false);
  readonly detailActionId = signal<string | null>(null);
  readonly selectedIds = signal<Set<string>>(new Set());
  readonly agendaOpen = signal(false);
  readonly toast = signal('');
  readonly exporting = signal(false);
  private toastHideTimer: ReturnType<typeof setTimeout> | undefined;

  readonly selectedCount = computed(() => this.selectedIds().size);
  readonly selectedIdsList = computed(() => [...this.selectedIds()]);

  readonly filteredActions = computed(() => {
    const q = this.search().toLowerCase().trim();
    const status = this.statusFilter();
    const theme = this.themeFilter();
    const owner = this.ownerFilter();
    return this.codir.activeActions().filter((a) => {
      if (theme !== 'all' && a.theme !== theme) return false;
      if (owner !== 'all' && a.ownerId !== owner && !(a.coOwnerIds ?? []).includes(owner)) return false;
      if (status === 'overdue') {
        if (a.status === 'done') return false;
        const d = this.codir.daysUntil(a.deadline);
        if (d === null || d >= 0) return false;
      } else if (status !== 'all' && a.status !== status) return false;
      if (q) {
        const inTitle = a.title.toLowerCase().includes(q);
        const inDesc = (a.description ?? '').toLowerCase().includes(q);
        const inComments = (a.comments ?? []).some((c) => c.text.toLowerCase().includes(q));
        if (!inTitle && !inDesc && !inComments) return false;
      }
      return true;
    });
  });

  readonly groupedByTheme = computed(() =>
    this.codir
      .themes()
      .map((theme) => {
        const actions = this.filteredActions()
          .filter((a) => a.theme === theme)
          .sort((a, b) => (a.deadline || 'z').localeCompare(b.deadline || 'z'));
        return [theme, actions] as const;
      })
      .filter(([, actions]) => actions.length > 0),
  );

  toggleTheme(theme: string): void {
    this.collapsed.update((c) => ({ ...c, [theme]: !c[theme] }));
  }

  isCollapsed(theme: string): boolean {
    return !!this.collapsed()[theme];
  }

  themeCounts(actions: CodirAction[]) {
    return {
      todo: actions.filter((a) => a.status === 'todo').length,
      progress: actions.filter((a) => a.status === 'in_progress').length,
      done: actions.filter((a) => a.status === 'done').length,
      overdue: actions.filter((a) => a.status !== 'done' && this.codir.daysUntil(a.deadline) !== null && this.codir.daysUntil(a.deadline)! < 0).length,
    };
  }

  toggleStatus(event: Event, id: string): void {
    event.stopPropagation();
    this.codir.toggleActionStatus(id);
  }

  openDetail(id: string): void {
    this.detailActionId.set(id);
  }

  closeDetail(): void {
    this.detailActionId.set(null);
  }

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  toggleSelect(event: Event, id: string): void {
    event.stopPropagation();
    this.selectedIds.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  bulkArchive(): void {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    if (!confirm(`Archiver ${ids.length} tâche${ids.length > 1 ? 's' : ''} ?`)) return;
    this.codir.archiveActions(ids);
    this.clearSelection();
    this.showToast(`${ids.length} tâche${ids.length > 1 ? 's' : ''} archivée${ids.length > 1 ? 's' : ''}`);
  }

  openAgenda(): void {
    if (!this.selectedIds().size) return;
    this.agendaOpen.set(true);
  }

  closeAgenda(): void {
    this.agendaOpen.set(false);
  }

  removeFromAgenda(id: string): void {
    this.selectedIds.update((set) => {
      const next = new Set(set);
      next.delete(id);
      return next;
    });
  }

  openNewAction(): void {
    this.createModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.createModalOpen.set(false);
  }

  onActionCreated(id: string): void {
    this.showToast('Action créée');
    this.openDetail(id);
  }

  async exportExcel(): Promise<void> {
    this.exporting.set(true);
    const result = await this.codir.exportToExcel();
    this.exporting.set(false);
    this.showToast(result.message);
  }

  showToast(message: string): void {
    if (this.toastHideTimer) clearTimeout(this.toastHideTimer);
    this.toast.set(message);
    this.toastHideTimer = setTimeout(() => {
      this.toast.set('');
      this.toastHideTimer = undefined;
    }, 3000);
  }

  actionOwners(action: CodirAction) {
    return this.codir.actionOwners(action);
  }
}

function formatArchiveMonth(key: string): string {
  if (key === '0000-00') return 'Sans date';
  const [y, m] = key.split('-');
  const d = new Date(+y, +m - 1, 1);
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

@Component({
  selector: 'app-codir-archives',
  standalone: true,
  imports: [CodirActionDetailModalComponent, CodirIconComponent],
  templateUrl: './codir-archives.component.html',
  styleUrl: './codir-pages.shared.scss',
})
export class CodirArchivesComponent {
  readonly codir = inject(CodirDataService);

  readonly detailActionId = signal<string | null>(null);
  readonly toast = signal('');
  private toastHideTimer: ReturnType<typeof setTimeout> | undefined;

  readonly archivedCount = computed(() => this.codir.archivedActions().length);

  readonly grouped = computed(() => {
    const map = new Map<string, CodirAction[]>();
    const archived = [...this.codir.archivedActions()].sort((a, b) =>
      (b.archivedAt || '').localeCompare(a.archivedAt || ''),
    );
    for (const a of archived) {
      const key = a.archivedAt ? a.archivedAt.slice(0, 7) : '0000-00';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, actions]) => ({ key, label: formatArchiveMonth(key), actions }));
  });

  actionOwners(action: CodirAction) {
    return this.codir.actionOwners(action);
  }

  openDetail(id: string): void {
    this.detailActionId.set(id);
  }

  closeDetail(): void {
    this.detailActionId.set(null);
  }

  toggleStatus(event: Event, id: string): void {
    event.stopPropagation();
    this.codir.toggleActionStatus(id);
  }

  showToast(message: string): void {
    if (this.toastHideTimer) clearTimeout(this.toastHideTimer);
    this.toast.set(message);
    this.toastHideTimer = setTimeout(() => {
      this.toast.set('');
      this.toastHideTimer = undefined;
    }, 3000);
  }
}

@Component({
  selector: 'app-codir-team',
  standalone: true,
  imports: [CodirMemberModalComponent, CodirIconComponent],
  templateUrl: './codir-team.component.html',
  styleUrl: './codir-pages.shared.scss',
})
export class CodirTeamComponent {
  readonly codir = inject(CodirDataService);
  readonly members = this.codir.members;

  readonly modalOpen = signal(false);
  readonly editingMember = signal<CodirMember | null>(null);

  openNewMember(): void {
    this.editingMember.set(null);
    this.modalOpen.set(true);
  }

  openEditMember(member: CodirMember): void {
    this.editingMember.set(member);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.editingMember.set(null);
  }
}