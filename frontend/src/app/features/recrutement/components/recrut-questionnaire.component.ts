import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { QFORM, qFields } from '../constants/recrutement-qform.constants';
import { Candidate, QuestionnaireData } from '../recrutement.models';
import { RecrutementDataService } from '../services/recrutement-data.service';
import { RecrutementModeService } from '../services/recrutement-mode.service';
import { RecrutementToastService } from '../services/recrutement-toast.service';

@Component({
  selector: 'app-recrut-questionnaire',
  standalone: true,
  template: `
    @if (mode() === 'recap') {
      <div style="margin-top:4px">
        <div style="font-size:12px;color:var(--muted);margin-bottom:10px">
          Complété le {{ questionnaire()?.date || '—' }}
        </div>
        @if (recapBlocks().length) {
          @for (block of recapBlocks(); track block.title) {
            <div class="pcard" style="margin-bottom:14px">
              <h4>{{ block.title }}</h4>
              @for (row of block.rows; track row.label) {
                <div class="ir">
                  <span class="il">{{ row.label }}</span>
                  <span>{{ row.value }}</span>
                </div>
              }
            </div>
          }
        } @else {
          <p style="color:var(--muted);font-size:13px">Aucune réponse renseignée pour le moment.</p>
        }
      </div>
    } @else {
      <div class="q-intro">
        📋 Dossier unique réseau Naturéa (synthèse CEGC + SMABTP). Tous les champs sont facultatifs — complétez ce que vous pouvez, le reste plus tard.
      </div>
      @for (section of QFORM; track section.t) {
        <div class="qs">
          <div class="qs-title">{{ section.t }}</div>
          @if ($any(section).help) {
            <p style="font-size:12px;color:var(--muted);margin:-4px 0 12px">{{ $any(section).help }}</p>
          }
          <div class="q-grid">
            @for (field of section.f; track field.k) {
              @if (field.type === 'sub') {
                <div class="q-subtitle">{{ field.l }}</div>
              } @else if (field.type === 'check') {
                <label class="ro" style="grid-column:1/-1;align-items:flex-start;gap:9px;padding:8px 0">
                  <input type="checkbox" [checked]="form()[field.k] === 'Oui'" (change)="setCheck(field.k, $event)" style="width:16px;height:16px;accent-color:var(--gold);margin-top:2px" />
                  <span style="font-size:13.5px">{{ field.l }}</span>
                </label>
              } @else {
                <div class="qi" [class.full]="field.type === 'area'">
                  <label>{{ field.l }}</label>
                  @if (field.type === 'radio') {
                    <div class="rg">
                      @for (opt of field.opts ?? []; track opt[0]) {
                        <label class="ro">
                          <input
                            type="radio"
                            [name]="field.k"
                            [value]="opt[0]"
                            [checked]="form()[field.k] === opt[0]"
                            (change)="setField(field.k, opt[0])"
                          />
                          {{ opt[1] }}
                        </label>
                      }
                    </div>
                  } @else if (field.type === 'sel') {
                    <select [value]="form()[field.k] || ''" (change)="setSelect(field.k, $event)">
                      <option value="">— Sélectionner —</option>
                      @for (opt of field.opts ?? []; track opt) {
                        <option [value]="opt">{{ opt }}</option>
                      }
                    </select>
                  } @else if (field.type === 'area') {
                    <textarea [value]="form()[field.k] || ''" (input)="setInput(field.k, $event)"></textarea>
                  } @else {
                    <input
                      [type]="field.type === 'num' ? 'number' : 'text'"
                      [id]="field.k"
                      [value]="form()[field.k] || ''"
                      [placeholder]="field.ph || ''"
                      (input)="setInput(field.k, $event)"
                    />
                  }
                </div>
              }
            }
          </div>
        </div>
      }
      <div class="q-actions">
        <button type="button" class="btn btn-primary" (click)="save()">💾 Enregistrer</button>
        <button type="button" class="btn btn-outline" (click)="reset()">Réinitialiser</button>
      </div>
    }
  `,
})
export class RecrutQuestionnaireComponent implements OnInit {
  private readonly data = inject(RecrutementDataService);
  private readonly modeService = inject(RecrutementModeService);
  private readonly toast = inject(RecrutementToastService);

  readonly QFORM = QFORM;
  readonly candidateId = input.required<string>();
  readonly mode = input<'edit' | 'recap'>('edit');
  readonly saved = output<void>();

  readonly form = signal<QuestionnaireData>({});

  questionnaire = () => this.data.getById(this.candidateId())?.questionnaire ?? null;

  ngOnInit(): void {
    this.loadForm();
  }

  loadForm(): void {
    const q = this.questionnaire();
    this.form.set({ ...(q ?? {}) });
  }

  recapBlocks() {
    const q = this.questionnaire() ?? {};
    return QFORM.map((section) => {
      const rows = section.f
        .filter((f) => f.type !== 'sub')
        .map((f) => {
          let value = q[f.k];
          if (value === undefined || value === null || value === '') return null;
          if (f.type === 'check') {
            if (value !== 'Oui') return null;
            value = '✔';
          }
          return { label: f.l, value: String(value) };
        })
        .filter(Boolean) as Array<{ label: string; value: string }>;
      if (!rows.length) return null;
      return { title: section.t, rows };
    }).filter(Boolean) as Array<{ title: string; rows: Array<{ label: string; value: string }> }>;
  }

  setField(key: string, value: string): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  setCheck(key: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.setField(key, checked ? 'Oui' : '');
  }

  setInput(key: string, event: Event): void {
    this.setField(key, (event.target as HTMLInputElement | HTMLTextAreaElement).value);
  }

  setSelect(key: string, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.setField(key, value === '— Sélectionner —' ? '' : value);
  }

  save(): void {
    const payload: QuestionnaireData = { ...this.form(), date: this.data.now() };
    this.data.setQuestionnaire(this.candidateId(), payload);
    this.toast.show('✅ Dossier enregistré');
    this.saved.emit();
  }

  reset(): void {
    if (!confirm('Réinitialiser tout le formulaire ?')) return;
    const empty: QuestionnaireData = {};
    qFields().forEach((f) => {
      empty[f.k] = '';
    });
    this.form.set(empty);
  }

  printPdf(): void {
    if (!this.modeService.isAdmin()) return;
    const candidate = this.data.getById(this.candidateId());
    if (!candidate) {
      this.toast.show('Candidat introuvable');
      return;
    }
    const q = candidate.questionnaire ?? {};
    const esc = (s: unknown) =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const blocks = QFORM.map((section) => {
      const rows = section.f
        .filter((f) => f.type !== 'sub')
        .map((f) => {
          let v = q[f.k];
          if (v === undefined || v === null || v === '') return '';
          if (f.type === 'check') {
            if (v !== 'Oui') return '';
            v = 'Oui';
          }
          return `<tr><td class="lab">${esc(f.l)}</td><td class="val">${esc(v)}</td></tr>`;
        })
        .filter(Boolean);
      if (!rows.length) return '';
      return `<section><h2>${esc(section.t)}</h2><table>${rows.join('')}</table></section>`;
    })
      .filter(Boolean)
      .join('');
    const corps = blocks || '<p>Aucune réponse renseignée.</p>';
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
      <title>Dossier ${esc(candidate.prenom + ' ' + candidate.nom)} — Maisons Naturéa</title>
      <style>
        *{box-sizing:border-box}
        body{font-family:Arial,Helvetica,sans-serif;color:#1E2D10;margin:0;padding:28px 32px;font-size:12px}
        .hd{border-bottom:3px solid #E07840;padding-bottom:14px;margin-bottom:22px}
        .hd .t{font-size:22px;font-weight:700;color:#2B4A1A}
        .hd .s{font-size:13px;color:#6B7A56;margin-top:4px}
        .meta{display:flex;flex-wrap:wrap;gap:6px 28px;font-size:12px;color:#1E2D10;margin-top:10px}
        .meta b{color:#2B4A1A}
        section{margin-bottom:18px;break-inside:avoid;page-break-inside:avoid}
        h2{font-size:13.5px;color:#2B4A1A;background:#EDE5D2;padding:7px 10px;border-radius:4px;margin:0 0 6px}
        table{width:100%;border-collapse:collapse}
        td{padding:5px 8px;border-bottom:1px solid #E5E0D2;vertical-align:top}
        td.lab{width:46%;color:#6B7A56}
        td.val{font-weight:500}
        .ft{margin-top:24px;border-top:1px solid #DDD5BF;padding-top:10px;font-size:10px;color:#6B7A56}
        @media print{ body{padding:0} @page{margin:14mm} .noprint{display:none} }
        .bar{position:fixed;top:0;left:0;right:0;background:#2B4A1A;color:#fff;padding:10px 16px;display:flex;gap:10px;justify-content:flex-end}
        .bar button{font-family:inherit;font-size:13px;padding:7px 16px;border:none;border-radius:6px;cursor:pointer}
        .bar .p{background:#E07840;color:#fff}.bar .c{background:rgba(255,255,255,.15);color:#fff}
        .wrap{margin-top:54px}
      </style></head><body>
      <div class="bar noprint"><button class="p" onclick="window.print()">🖨 Imprimer / Enregistrer en PDF</button><button class="c" onclick="window.close()">Fermer</button></div>
      <div class="wrap">
      <div class="hd">
        <div class="t">Dossier de candidature franchise</div>
        <div class="s">Synthèse réseau Naturéa — pièce pour conseil de décision &amp; assureurs</div>
        <div class="meta">
          <span><b>Candidat :</b> ${esc(candidate.prenom + ' ' + candidate.nom)}</span>
          <span><b>Ville :</b> ${esc(candidate.ville || '—')} ${esc(candidate.cp || '')}</span>
          <span><b>Email :</b> ${esc(candidate.email || '—')}</span>
          <span><b>Téléphone :</b> ${esc(candidate.tel || '—')}</span>
          <span><b>Statut :</b> ${esc(candidate.statut || '—')}</span>
          <span><b>Questionnaire complété le :</b> ${esc(q.date || '—')}</span>
        </div>
      </div>
      ${corps}
      <div class="ft">Document généré le ${esc(this.data.now())} depuis l'application Recrutement franchise — Maisons Naturéa. Informations déclaratives communiquées par le candidat.</div>
      </div>
      </body></html>`;
    const win = window.open('', '_blank');
    if (!win) {
      this.toast.show("Autorisez les pop-ups pour l'impression");
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  }
}
