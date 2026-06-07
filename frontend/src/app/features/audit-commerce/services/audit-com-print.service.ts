import { Injectable } from '@angular/core';
import type { Agency, Audit, AuditTreeNode } from '../audit-commerce.models';
import { AUDIT_TREE } from '../constants/audit-commerce.constants';
import {
  computeHS,
  computeKpis,
  computeRatios,
  fmtDate,
  leafTotal,
  leafTotalEmp,
  noteStats,
  todayISO,
} from '../utils/audit-commerce.utils';

@Injectable({ providedIn: 'root' })
export class AuditComPrintService {
  exportAuditPDF(agency: Agency, audit: Audit): void {
    let root = document.getElementById('print-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'print-root';
      document.body.appendChild(root);
    }
    root.innerHTML = this.reportHTML(agency, audit);
    const oldTitle = document.title;
    document.title = `Audit ${(agency.name || 'agence').replace(/[^\w-]+/g, '_')}_${audit.date}`;
    document.body.classList.add('audit-com-printing');
    const cleanup = () => {
      document.body.classList.remove('audit-com-printing');
      root!.innerHTML = '';
      document.title = oldTitle;
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(() => {
      window.print();
      setTimeout(cleanup, 1500);
    }, 60);
  }

  private reportHTML(a: Agency, au: Audit): string {
    const k = computeKpis(au);
    const ns = noteStats(au);
    const ag = computeRatios(au, null);
    const pf = (v: number | null) => (v == null ? '—' : `${v.toFixed(1)}%`);
    const stLabel = au.status === 'validated' ? 'Validé' : au.status === 'archived' ? 'Archivé' : 'Brouillon';
    const perEmp = a.employees
      .filter((e) => ns.emp[e.id])
      .map(
        (e) =>
          `<tr><td>${this.esc(e.name || '(sans nom)')}</td><td>${ns.emp[e.id].avg.toFixed(1)}/10</td><td>${ns.emp[e.id].count}</td></tr>`,
      )
      .join('');
    return `<div class="pr-doc">
      <div class="pr-head"><div><div class="pr-title">${this.esc(a.name || 'Agence')}</div><div class="pr-mut">${this.esc(a.address || '')}</div></div>
        <div style="text-align:right"><div style="font-weight:700">Audit du ${fmtDate(au.date)}</div><div class="pr-mut">${stLabel}</div></div></div>
      <table class="pr-tb" style="margin-bottom:14px"><tr><th>Contacts entrants</th><th>Signatures</th><th>Résiliations</th><th>Taux transfo.</th><th>Note agence</th></tr>
        <tr><td>${k.entrant}</td><td>${k.signatures}</td><td>${k.ccmi}</td><td>${k.transfo.toFixed(1)}%</td><td>${ns.agency == null ? '—' : `${ns.agency.toFixed(1)}/10`}</td></tr></table>
      ${AUDIT_TREE.map((s) => this.reportSection(a, au, s)).join('')}
      <div class="pr-section"><div class="pr-st">Ratios de conversion (agence)</div>
        <table class="pr-tb"><tr><th>Ratio</th><th>Valeur</th></tr>
          <tr><td>Traités / entrants</td><td>${pf(ag.r_traite)}</td></tr>
          <tr><td>RDV / entrants</td><td>${pf(ag.r_rdv)}</td></tr>
          <tr><td>Signatures / entrants</td><td>${pf(ag.r_sign)}</td></tr>
          <tr><td>Signatures / R1</td><td>${pf(ag.r_sign_r1)}</td></tr>
          <tr><td>Résiliations / signatures</td><td>${pf(ag.r_resil)}</td></tr>
          <tr><td>HS / entrants</td><td>${pf(ag.r_hs)}</td></tr>
        </table></div>
      <div class="pr-section"><div class="pr-st">Notes des salariés</div>
        ${perEmp ? `<table class="pr-tb"><tr><th>Salarié</th><th>Moyenne</th><th>Points notés</th></tr>${perEmp}</table>` : '<div class="pr-mut">Aucune note saisie.</div>'}
      </div>
      <div class="pr-foot">Document généré le ${fmtDate(todayISO())} · Réseau Audit</div>
    </div>`;
  }

  private reportSection(a: Agency, au: Audit, node: AuditTreeNode): string {
    if (node.children) {
      return `<div class="pr-section"><div class="pr-st">${this.esc(node.label)}</div>${node.children.map((c) => this.reportSection(a, au, c)).join('')}</div>`;
    }
    return this.reportLeaf(a, au, node);
  }

  private reportLeaf(a: Agency, au: Audit, node: AuditTreeNode): string {
    const lf = au.leaves?.[node.id];
    if (node.kind === 'text') {
      const t = lf?.text || '';
      const n = lf?.note || '';
      return `<div class="pr-leaf"><div class="pr-lt">${this.esc(node.label)}</div><div>${t ? this.esc(t) : "<span class='pr-mut'>—</span>"}</div>${n ? `<div class="pr-note">Commentaire : ${this.esc(n)}</div>` : ''}</div>`;
    }
    if (node.kind === 'calc') {
      const total = computeHS(au, null);
      const per = a.employees
        .filter(
          (e) =>
            leafTotalEmp(au, 'cli.contact.entrant', e.id) ||
            leafTotalEmp(au, 'cli.contact.traite', e.id) ||
            leafTotalEmp(au, 'cli.contact.relance', e.id),
        )
        .map((e) => ({ e, v: computeHS(au, e.id) }));
      return `<div class="pr-leaf"><div class="pr-lt">${this.esc(node.label)} : <b>${total}</b></div>${
        per.length
          ? `<table class="pr-tb"><tr><th>Salarié</th><th>HS</th></tr>${per.map((x) => `<tr><td>${this.esc(this.empName(a, x.e.id))}</td><td>${x.v}</td></tr>`).join('')}</table>`
          : ''
      }</div>`;
    }
    const rows = lf?.rows ?? [];
    if (!rows.length) return `<div class="pr-leaf"><div class="pr-lt">${this.esc(node.label)}</div><div class="pr-mut">—</div></div>`;
    if (node.kind === 'multi') {
      const cols = node.cols ?? [];
      return `<div class="pr-leaf"><div class="pr-lt">${this.esc(node.label)}</div><table class="pr-tb"><tr><th>Salarié</th>${cols.map((c) => `<th>${this.esc(c.label)}</th>`).join('')}<th>/10</th><th>Commentaire</th></tr>${rows.map((r) => `<tr><td>${this.esc(this.empName(a, r.empId))}</td>${cols.map((c) => `<td>${r.vals?.[c.key] ?? ''}</td>`).join('')}<td>${r.note ?? ''}</td><td>${this.esc(r.comment || '')}</td></tr>`).join('')}</table></div>`;
    }
    if (node.kind === 'qual') {
      return `<div class="pr-leaf"><div class="pr-lt">${this.esc(node.label)}</div><table class="pr-tb"><tr><th>Salarié</th><th>/10</th><th>Commentaire</th></tr>${rows.map((r) => `<tr><td>${this.esc(this.empName(a, r.empId))}</td><td>${r.note ?? ''}</td><td>${this.esc(r.comment || '')}</td></tr>`).join('')}</table></div>`;
    }
    const total = rows.reduce((s, r) => s + (Number(r.val) || 0), 0);
    return `<div class="pr-leaf"><div class="pr-lt">${this.esc(node.label)} <span class="pr-mut">(total ${total})</span></div><table class="pr-tb"><tr><th>Salarié</th><th>Quantité</th><th>/10</th><th>Commentaire</th></tr>${rows.map((r) => `<tr><td>${this.esc(this.empName(a, r.empId))}</td><td>${r.val ?? ''}</td><td>${r.note ?? ''}</td><td>${this.esc(r.comment || '')}</td></tr>`).join('')}</table></div>`;
  }

  private empName(a: Agency, id?: string): string {
    if (!id) return 'Non attribué';
    const e = a.employees.find((x) => x.id === id);
    return e ? e.name || '(sans nom)' : '(salarié supprimé)';
  }

  private esc(s: string): string {
    return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  }
}
