import { Injectable, inject } from '@angular/core';
import { CodirAction, CodirDataService } from './codir-data.service';

export interface AgendaParams {
  meetingTitle: string;
  meetingDate: string;
  meetingTime: string;
  meetingLocation: string;
  intro: string;
  durationsByTheme: Record<string, number>;
  includeOwners: boolean;
  includeStatus: boolean;
  includeComments: boolean;
  recipientsState: Record<string, boolean>;
}

@Injectable({ providedIn: 'root' })
export class CodirAgendaService {
  private readonly codir = inject(CodirDataService);

  defaultMeetingDate(): string {
    const d = new Date();
    const day = d.getDay();
    const offset = day === 0 ? 1 : day === 6 ? 2 : 8 - day;
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  }

  defaultMeetingTitle(dateIso: string): string {
    return `CODIR du ${this.codir.formatDate(dateIso)}`;
  }

  buildAgendaText(selectedIds: string[], params: AgendaParams): string {
    const data = this.codir.data();
    if (!data) return '';
    const idSet = new Set(selectedIds);
    const selected = data.actions.filter((a) => idSet.has(a.id));
    const byTheme: Record<string, CodirAction[]> = {};
    for (const a of selected) {
      if (!byTheme[a.theme]) byTheme[a.theme] = [];
      byTheme[a.theme].push(a);
    }

    const lines: string[] = [];
    lines.push(params.meetingTitle);
    lines.push(
      `Date : ${this.codir.formatDateLong(params.meetingDate)}${params.meetingTime ? ' à ' + params.meetingTime : ''}`,
    );
    if (params.meetingLocation) lines.push(`Lieu : ${params.meetingLocation}`);
    lines.push('');
    if (params.intro) {
      lines.push(params.intro);
      lines.push('');
    }
    lines.push('ORDRE DU JOUR');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    let counter = 1;
    let totalDuration = 0;
    for (const theme of data.themes) {
      const items = byTheme[theme];
      if (!items?.length) continue;
      lines.push('');
      lines.push(`▸ ${theme.toUpperCase()}`);
      for (const a of items) {
        const dur = params.durationsByTheme[a.id] ?? 10;
        totalDuration += dur;
        const owners = this.codir.actionOwners(a).map((m) => m.name).join(', ');
        lines.push(`  ${counter}. ${a.title}  [${dur} min]`);
        if (params.includeOwners && owners) lines.push(`     Responsable : ${owners}`);
        if (params.includeStatus) {
          lines.push(
            `     Statut : ${this.codir.statusMeta(a.status).label}${a.deadline ? ' · échéance ' + this.codir.formatDate(a.deadline) : ''}`,
          );
        }
        if (params.includeComments) {
          const lastComment = (a.comments ?? []).slice(-1)[0];
          if (lastComment) lines.push(`     Note : ${lastComment.text}`);
        }
        counter++;
      }
    }
    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push(
      `Durée totale prévue : ${totalDuration} min (${Math.floor(totalDuration / 60)}h${(totalDuration % 60).toString().padStart(2, '0')})`,
    );
    return lines.join('\n');
  }

  generateAgendaDocx(selectedIds: string[], params: AgendaParams): string {
    const data = this.codir.data();
    if (!data) throw new Error('Aucune donnée');
    const idSet = new Set(selectedIds);
    const selected = data.actions.filter((a) => idSet.has(a.id));
    const byTheme: Record<string, CodirAction[]> = {};
    for (const a of selected) {
      if (!byTheme[a.theme]) byTheme[a.theme] = [];
      byTheme[a.theme].push(a);
    }

    const recipients = data.members.filter((m) => params.recipientsState[m.id]);
    let totalDuration = 0;
    for (const a of selected) totalDuration += params.durationsByTheme[a.id] ?? 10;

    const esc = (s: string) =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    let counter = 1;
    const themesHtml = data.themes
      .filter((t) => byTheme[t])
      .map((theme) => {
        const items = byTheme[theme]
          .map((a) => {
            const dur = params.durationsByTheme[a.id] ?? 10;
            const owners = this.codir.actionOwners(a).map((m) => m.name).join(', ');
            const lastComment = (a.comments ?? []).slice(-1)[0];
            const metaParts: string[] = [];
            if (params.includeOwners && owners) metaParts.push(`<strong>Responsable :</strong> ${esc(owners)}`);
            if (params.includeStatus) {
              metaParts.push(`<strong>Statut :</strong> ${esc(this.codir.statusMeta(a.status).label)}`);
              if (a.deadline) metaParts.push(`<strong>Échéance :</strong> ${esc(this.codir.formatDate(a.deadline))}`);
            }
            return `
        <p style="margin:14pt 0 4pt 0;">
          <span style="color:#A8472C;font-weight:bold;">${counter++}.</span>
          <strong style="font-size:12pt;">&nbsp;${esc(a.title)}</strong>
          <span style="color:#6B6B5F;">&nbsp;&nbsp;[${dur} min]</span>
        </p>
        ${metaParts.length ? `<p style="margin:0 0 4pt 24pt;font-size:10pt;color:#444;">${metaParts.join(' &nbsp;·&nbsp; ')}</p>` : ''}
        ${a.description?.trim() ? `<p style="margin:0 0 4pt 24pt;font-size:10pt;">${esc(a.description)}</p>` : ''}
        ${params.includeComments && lastComment ? `<p style="margin:0 0 4pt 24pt;font-size:10pt;color:#6B6B5F;font-style:italic;">« ${esc(lastComment.text)} »</p>` : ''}
      `;
          })
          .join('');
        return `
      <h2 style="color:#A8472C;font-size:11pt;letter-spacing:1pt;text-transform:uppercase;border-bottom:1pt solid #E8E1D1;padding-bottom:4pt;margin:24pt 0 8pt 0;">${esc(theme)}</h2>
      ${items}
    `;
      })
      .join('');

    const totalH = Math.floor(totalDuration / 60);
    const totalM = totalDuration % 60;
    const totalLabel = totalH > 0 ? `${totalH}h${totalM.toString().padStart(2, '0')}` : `${totalM} min`;
    const today = new Date().toISOString().slice(0, 10);

    const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${esc(params.meetingTitle)}</title>
<style>@page WordSection1 { size: 21cm 29.7cm; margin: 2.5cm 2cm; } body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1f2e25; }</style>
</head><body><div class="WordSection1">
<p style="color:#A8472C;font-size:10pt;letter-spacing:1.5pt;text-transform:uppercase;font-weight:bold;">Ordre du jour</p>
<h1 style="font-size:22pt;font-weight:normal;">${esc(params.meetingTitle)}</h1>
${params.meetingDate || params.meetingTime ? `<p style="color:#6B6B5F;">${params.meetingDate ? esc(this.codir.formatDateLong(params.meetingDate)) : ''}${params.meetingTime ? ' à ' + esc(params.meetingTime) : ''}</p>` : ''}
${params.meetingLocation ? `<p><strong>Lieu :</strong> ${esc(params.meetingLocation)}</p>` : ''}
${recipients.length ? `<p style="margin-top:18pt;font-weight:bold;">Participants (${recipients.length})</p><p>${recipients.map((m) => esc(m.name)).join(' · ')}</p>` : ''}
${params.intro.trim() ? `<p style="margin-top:18pt;font-weight:bold;">Introduction</p><p>${esc(params.intro).replace(/\n/g, '<br>')}</p>` : ''}
<p style="border-top:1pt solid #D4CCB8;border-bottom:1pt solid #D4CCB8;padding:8pt 0;margin:16pt 0;"><strong>Durée totale prévue : ${totalLabel}</strong> · ${selected.length} point(s) à l'ordre du jour</p>
${themesHtml}
<p style="color:#9A9A8A;font-size:9pt;font-style:italic;text-align:center;margin-top:30pt;">Document généré le ${esc(this.codir.formatDate(today))} · Codir</p>
</div></body></html>`;

    const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
    const safeTitle = (params.meetingTitle || 'codir')
      .replace(/[^a-zA-Z0-9À-ÿ\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 60);
    const filename = `Ordre-du-jour-${safeTitle}-${today}.doc`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return filename;
  }

  openMailClient(selectedIds: string[], params: AgendaParams, filename: string): void {
    const data = this.codir.data();
    if (!data) return;
    const recipientEmails = data.members
      .filter((m) => params.recipientsState[m.id] && m.email)
      .map((m) => m.email)
      .join(',');
    if (!recipientEmails) throw new Error('Aucun destinataire avec email sélectionné');

    const shortBody = [
      'Bonjour,',
      '',
      `Vous trouverez ci-joint l'ordre du jour pour ${params.meetingTitle}${params.meetingDate ? ' du ' + this.codir.formatDateLong(params.meetingDate) : ''}${params.meetingTime ? ' à ' + params.meetingTime : ''}.`,
      params.meetingLocation ? `Lieu : ${params.meetingLocation}` : '',
      '',
      params.intro || '',
      '',
      `📎 Pièce jointe : ${filename}`,
      '(le fichier vient d\'être téléchargé sur votre ordinateur — glissez-le dans le mail avant l\'envoi)',
      '',
      'Cordialement.',
    ]
      .filter((l) => l !== '')
      .join('\n');

    const mailto = `mailto:${recipientEmails}?subject=${encodeURIComponent(params.meetingTitle)}&body=${encodeURIComponent(shortBody)}`;
    setTimeout(() => {
      window.location.href = mailto;
    }, 400);
  }
}
