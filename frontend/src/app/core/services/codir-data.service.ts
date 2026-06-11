import { Injectable, computed, inject, signal } from '@angular/core';
import { PortalUsersService } from './portal-users.service';
import { SupabaseService } from '../supabase/supabase.service';

export const CODIR_OWNER_UNASSIGNED = 'À attribuer';

export interface CodirAssignee {
  id: string;
  name: string;
  role: string;
  email: string | null;
}

export interface CodirAction {
  id: string;
  theme: string;
  title: string;
  description?: string;
  ownerId?: string;
  coOwnerIds?: string[];
  startDate?: string;
  deadline?: string;
  deadlineNote?: string;
  status: string;
  priority?: string;
  archived?: boolean;
  archivedAt?: string;
  createdAt?: string;
  comments?: Array<{ id?: string; text: string; authorId?: string | null; createdAt?: string }>;
  history?: Array<{ date: string; action: string; userId?: string | null }>;
  subtasks?: Array<{ id: string; text: string; done: boolean }>;
}

export interface CodirData {
  actions: CodirAction[];
  themes: string[];
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  todo: { label: 'À faire', cls: 'app-status-todo' },
  in_progress: { label: 'En cours', cls: 'app-status-in_progress' },
  done: { label: 'Terminé', cls: 'app-status-done' },
  blocked: { label: 'Bloqué', cls: 'app-status-blocked' },
};

export const CODIR_PRIORITY_LABELS: Record<string, string> = {
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Haute',
};

export const CODIR_MEMBER_COLORS = [
  '#a8472c', '#2d5f3f', '#6b4a8b', '#b8860b', '#2c6b8b', '#8b2c2c',
  '#4a5568', '#c97a4a', '#5d4037', '#1b5e20', '#bf360c', '#4527a0',
];

@Injectable({ providedIn: 'root' })
export class CodirDataService {
  private readonly supabase = inject(SupabaseService);
  private readonly portalUsers = inject(PortalUsersService);
  private readonly _data = signal<CodirData | null>(null);
  private readonly _assignees = signal<CodirAssignee[]>([]);
  private readonly _version = signal(0);

  readonly data = computed(() => {
    this._version();
    return this._data();
  });

  readonly assignees = computed(() => this._assignees());
  /** @deprecated Use assignees — kept for gradual template migration. */
  readonly members = this.assignees;

  async load(): Promise<void> {
    const [assignees, themesRes, actionsRes] = await Promise.all([
      this.portalUsers.listCodirTeam(),
      this.supabase.from('codir_themes').select('label').order('label'),
      this.supabase.from('codir_actions').select('*').order('created_at'),
    ]);

    if (themesRes.error || actionsRes.error) {
      console.error('[Codir] load failed', themesRes.error ?? actionsRes.error);
      return;
    }

    this._assignees.set(
      assignees.map((u) => ({
        id: u.id,
        name: u.name,
        role: u.role,
        email: u.email,
      })),
    );

    const themes = (themesRes.data ?? []).map((t) => t.label as string);

    const actions: CodirAction[] = (actionsRes.data ?? []).map((a) => ({
      id: a.id,
      theme: a.theme,
      title: a.title,
      description: a.description ?? '',
      ownerId: a.owner_id ?? undefined,
      coOwnerIds: this.sanitizeCoOwnerIds(a.owner_id, a.co_owner_ids ?? []),
      startDate: a.start_date ?? undefined,
      deadline: a.deadline ?? undefined,
      deadlineNote: a.deadline_note ?? '',
      status: a.status,
      priority: a.priority ?? 'medium',
      archived: a.archived ?? false,
      archivedAt: a.archived_at ?? undefined,
      createdAt: a.created_at ?? undefined,
      comments: a.comments ?? [],
      history: a.history ?? [],
      subtasks: a.subtasks ?? [],
    }));

    this._data.set({ actions, themes });
    this._version.update((v) => v + 1);
  }

  readonly actions = computed(() => this.data()?.actions ?? []);
  readonly themes = computed(() => this.data()?.themes ?? []);

  readonly activeActions = computed(() => this.actions().filter((a) => !a.archived));
  readonly archivedActions = computed(() => this.actions().filter((a) => a.archived));

  readonly overdueCount = computed(
    () => this.activeActions().filter((a) => a.status !== 'done' && this.daysUntil(a.deadline) !== null && this.daysUntil(a.deadline)! < 0).length,
  );

  readonly archivedCount = computed(() => this.archivedActions().length);

  readonly dashboardStats = computed(() => {
    const actions = this.activeActions();
    const overdue = actions.filter((a) => a.status !== 'done' && this.daysUntil(a.deadline) !== null && this.daysUntil(a.deadline)! < 0);
    const upcoming = actions.filter((a) => {
      const d = this.daysUntil(a.deadline);
      return a.status !== 'done' && d !== null && d >= 0 && d <= 7;
    });
    return {
      total: actions.length,
      overdue: overdue.length,
      upcoming: upcoming.length,
      inProgress: actions.filter((a) => a.status === 'in_progress').length,
      done: actions.filter((a) => a.status === 'done').length,
      overdueList: overdue,
      upcomingList: upcoming,
    };
  });

  readonly themeStats = computed(() =>
    this.themes()
      .map((theme) => {
        const items = this.activeActions().filter((a) => a.theme === theme);
        return {
          theme,
          total: items.length,
          done: items.filter((a) => a.status === 'done').length,
          overdue: items.filter((a) => a.status !== 'done' && this.daysUntil(a.deadline) !== null && this.daysUntil(a.deadline)! < 0).length,
        };
      })
      .filter((s) => s.total > 0),
  );

  statusMeta(status: string) {
    return STATUS_LABELS[status] ?? { label: status, cls: 'app-status-todo' };
  }

  assigneeById(id?: string): CodirAssignee | undefined {
    if (!id) return undefined;
    return this.assignees().find((m) => m.id === id);
  }

  /** @deprecated Use assigneeById */
  memberById(id?: string): CodirAssignee | undefined {
    return this.assigneeById(id);
  }

  actionOwners(action: CodirAction): CodirAssignee[] {
    const ids = [action.ownerId, ...(action.coOwnerIds ?? [])].filter(Boolean) as string[];
    return ids.map((id) => this.assigneeById(id)).filter(Boolean) as CodirAssignee[];
  }

  hasOwner(action: CodirAction): boolean {
    return this.actionOwners(action).length > 0;
  }

  ownerNames(action: CodirAction): string {
    const owners = this.actionOwners(action);
    if (owners.length) return owners.map((o) => o.name).join(', ');
    return CODIR_OWNER_UNASSIGNED;
  }

  assigneeColor(id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash + id.charCodeAt(i)) % CODIR_MEMBER_COLORS.length;
    }
    return CODIR_MEMBER_COLORS[hash];
  }

  initials(name: string): string {
    return name
      .split(/[\s/]+/)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  daysUntil(iso?: string): number | null {
    if (!iso) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(iso);
    d.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - today.getTime()) / 86400000);
  }

  formatDateLong(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  formatDateShort(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  formatDate(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  deadlineLabel(action: CodirAction): { text: string; tone: 'red' | 'amber' | 'muted' } {
    const dU = this.daysUntil(action.deadline);
    if (action.deadline && dU !== null) {
      if (action.status !== 'done' && dU < 0) return { text: `Retard ${Math.abs(dU)}j`, tone: 'red' };
      if (action.status !== 'done' && dU === 0) return { text: "Aujourd'hui", tone: 'amber' };
      if (action.status !== 'done' && dU > 0 && dU <= 14) return { text: `Dans ${dU}j`, tone: 'amber' };
      return { text: this.formatDateShort(action.deadline), tone: 'muted' };
    }
    return { text: action.deadlineNote || '—', tone: 'muted' };
  }

  todayLabel(): string {
    return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  createAction(input: {
    theme: string;
    title: string;
    description?: string;
    ownerId?: string;
    startDate?: string;
    deadline?: string;
    priority?: string;
  }): string {
    const current = this.data();
    if (!current) return '';
    const id = `a_${Date.now().toString(36)}`;
    const now = new Date().toISOString();
    const action: CodirAction = {
      id,
      theme: input.theme,
      title: input.title,
      description: input.description || '',
      ownerId: input.ownerId,
      coOwnerIds: [],
      startDate: input.startDate || now.slice(0, 10),
      deadline: input.deadline || '',
      deadlineNote: '',
      priority: input.priority || 'medium',
      status: 'todo',
      createdAt: now.slice(0, 10),
      comments: [],
      history: [{ date: now, action: 'Action créée' }],
    };
    this.persist({ ...current, actions: [...current.actions, action] });
    return id;
  }

  actionById(id?: string | null): CodirAction | undefined {
    if (!id) return undefined;
    return this.actions().find((a) => a.id === id);
  }

  formatDateTime(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  patchAction(id: string, patch: Partial<CodirAction>, historyText?: string): void {
    const current = this.data();
    if (!current) return;
    this.persist({
      ...current,
      actions: current.actions.map((a) => {
        if (a.id !== id) return a;
        const updated: CodirAction = { ...a, ...patch };
        if (historyText) {
          updated.history = [...(updated.history ?? []), { date: new Date().toISOString(), action: historyText }];
        }
        return updated;
      }),
    });
  }

  deleteAction(id: string): void {
    const current = this.data();
    if (!current) return;
    this.persist({ ...current, actions: current.actions.filter((a) => a.id !== id) });
  }

  archiveActions(ids: string[]): void {
    const current = this.data();
    if (!current) return;
    const now = new Date().toISOString();
    const idSet = new Set(ids);
    this.persist({
      ...current,
      actions: current.actions.map((a) =>
        idSet.has(a.id)
          ? {
              ...a,
              archived: true,
              archivedAt: now,
              history: [...(a.history ?? []), { date: now, action: 'Tâche archivée' }],
            }
          : a,
      ),
    });
  }

  archiveAction(id: string): void {
    this.archiveActions([id]);
  }

  unarchiveAction(id: string): void {
    this.patchAction(id, { archived: false, archivedAt: undefined }, 'Tâche désarchivée');
  }

  setOwner(actionId: string, ownerId?: string, historyText?: string): void {
    const action = this.actionById(actionId);
    if (!action) return;
    const coOwnerIds = ownerId
      ? this.sanitizeCoOwnerIds(ownerId, action.coOwnerIds ?? [])
      : (action.coOwnerIds ?? []);
    const assignee = ownerId ? this.assigneeById(ownerId) : undefined;
    this.patchAction(
      actionId,
      { ownerId, coOwnerIds },
      historyText ?? `Responsable → ${assignee?.name ?? 'À attribuer'}`,
    );
  }

  toggleCoOwner(actionId: string, assigneeId: string): void {
    const action = this.actionById(actionId);
    if (!action) return;
    const co = action.coOwnerIds ?? [];
    const has = co.includes(assigneeId);
    if (!has && assigneeId === action.ownerId) return;
    const assignee = this.assigneeById(assigneeId);
    this.patchAction(
      actionId,
      { coOwnerIds: has ? co.filter((c) => c !== assigneeId) : [...co, assigneeId] },
      `Co-responsable ${has ? 'retiré' : 'ajouté'}${assignee ? ' : ' + assignee.name : ''}`,
    );
  }

  private sanitizeCoOwnerIds(ownerId: string | null | undefined, coOwnerIds: string[]): string[] {
    if (!ownerId) return coOwnerIds;
    return coOwnerIds.filter((id) => id !== ownerId);
  }

  addComment(actionId: string, text: string, authorId?: string): void {
    const action = this.actionById(actionId);
    if (!action) return;
    const assignee = authorId ? this.assigneeById(authorId) : undefined;
    const comment = {
      id: `cmt_${Date.now().toString(36)}`,
      text,
      authorId: authorId || null,
      createdAt: new Date().toISOString(),
    };
    this.patchAction(
      actionId,
      { comments: [...(action.comments ?? []), comment] },
      `Commentaire ajouté${assignee ? ' par ' + assignee.name : ''}`,
    );
  }

  removeComment(actionId: string, commentId: string): void {
    const action = this.actionById(actionId);
    if (!action) return;
    this.patchAction(
      actionId,
      { comments: (action.comments ?? []).filter((c) => c.id !== commentId) },
      'Commentaire supprimé',
    );
  }

  toggleActionStatus(id: string): void {
    const current = this.data();
    if (!current) return;
    this.persist({
      ...current,
      actions: current.actions.map((a) => {
        if (a.id !== id) return a;
        const status = a.status === 'done' ? 'todo' : 'done';
        return {
          ...a,
          status,
          history: [...(a.history ?? []), { date: new Date().toISOString(), action: `Statut changé : ${STATUS_LABELS[status].label}` }],
        };
      }),
    });
  }

  async exportToExcel(): Promise<{ ok: boolean; message: string }> {
    const data = this.data();
    if (!data) return { ok: false, message: 'Aucune donnée CODIR.' };
    try {
      const XLSX = await import('xlsx');
      const rows = data.actions.map((a) => {
        const dU = this.daysUntil(a.deadline);
        const lastComment = (a.comments ?? []).slice(-1)[0];
        return {
          Thème: a.theme,
          'Date démarrage': a.startDate || '',
          Tâche: a.title,
          'Responsable(s)': this.ownerNames(a),
          Échéance: a.deadline || a.deadlineNote || '',
          Statut: this.statusMeta(a.status).label,
          Priorité: CODIR_PRIORITY_LABELS[a.priority ?? 'medium'] ?? a.priority ?? '',
          'Retard (j)': a.status !== 'done' && dU !== null && dU < 0 ? Math.abs(dU) : 0,
          'Nb commentaires': (a.comments ?? []).length,
          'Dernier commentaire': lastComment?.text ?? '',
          'Date dernier commentaire': lastComment?.createdAt?.slice(0, 10) ?? '',
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      const cols = Object.keys(rows[0] ?? {}).map((k) => ({
        wch: Math.max(k.length, ...rows.map((r) => String((r as Record<string, unknown>)[k] ?? '').length)) + 2,
      }));
      ws['!cols'] = cols;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Plan d'action");
      const filename = `plan-action-codir-${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, filename);
      return { ok: true, message: `Excel exporté (${rows.length} actions)` };
    } catch {
      return { ok: false, message: 'Export Excel impossible.' };
    }
  }

  private persist(data: CodirData): void {
    this._data.set(data);
    this._version.update((v) => v + 1);
    void this.persistToDb(data);
  }

  private async persistToDb(data: CodirData): Promise<void> {
    for (const label of data.themes) {
      const { error } = await this.supabase.from('codir_themes').upsert({ label });
      if (error) console.error('[Codir] theme persist failed', label, error);
    }

    const actionRows = data.actions.map((a) => ({
      id: a.id,
      theme: a.theme,
      title: a.title,
      description: a.description ?? '',
      owner_id: a.ownerId ?? null,
      co_owner_ids: a.coOwnerIds ?? [],
      start_date: a.startDate || null,
      deadline: a.deadline || null,
      deadline_note: a.deadlineNote ?? '',
      priority: a.priority ?? 'medium',
      status: a.status,
      archived: a.archived ?? false,
      archived_at: a.archivedAt ?? null,
      created_at: a.createdAt || null,
      comments: a.comments ?? [],
      history: a.history ?? [],
      subtasks: a.subtasks ?? [],
    }));
    const { error: aErr } = await this.supabase.from('codir_actions').upsert(actionRows);
    if (aErr) console.error('[Codir] actions persist failed', aErr);
  }
}
