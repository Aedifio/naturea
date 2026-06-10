import { REFS } from '../constants/chiffrage-refs.constants';
import { USINE_DETECTION } from '../constants/chiffrage-import.constants';
import type {
  ParsedImportMeta,
  ParsedImportPoste,
  PosteRef,
  UsineKey,
} from '../chiffrage.models';

export function parseFloatFR(s: string | null | undefined): number | null {
  if (!s) return null;
  const n = parseFloat(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function detectUsineFromText(text: string): UsineKey | null {
  for (const [key, patterns] of Object.entries(USINE_DETECTION)) {
    if (patterns.some((p) => p.test(text))) return key as UsineKey;
  }
  return null;
}

export function extractMetadata(text: string): ParsedImportMeta {
  const meta: ParsedImportMeta = {};

  const numMatch = text.match(/(?:Devis\s*n[°º]?|N[°º]?\s*(?:devis)?)\s*([A-Z0-9\-\/]{2,20})/i);
  if (numMatch) meta.devis_num = numMatch[1].replace(/[\/]$/, '');

  const dateMatch =
    text.match(/du\s+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/i) ||
    text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dateMatch) {
    const [, d, m, y] = dateMatch;
    meta.devis_date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const cliMatch = text.match(/(?:Sujet|Client|Affaire)\s*:?\s*([^\n]{3,80})/i);
  if (cliMatch) {
    let c = cliMatch[1].replace(/MAISONS\s*NATUREA\s*\/\s*/i, '').trim();
    meta.client = c.split(/[\n\r]/)[0].substring(0, 60);
  }

  const totMatch = text.match(/Total\s*H\.?T\.?\s*[:\s]?\s*([\d\s]+[.,]\d{2})(?!\s*\d)/i);
  if (totMatch) meta.total_ht = parseFloatFR(totMatch[1]);

  return meta;
}

export function parsePostes(text: string): ParsedImportPoste[] {
  const lines = text.split(/[\n\r]+/);
  const postes: ParsedImportPoste[] = [];
  const numStr = '\\d{1,3}(?:[\\s\\u00A0]\\d{3})*(?:[.,]\\d+)?';
  const tailRx = new RegExp(
    '^\\s*(.+?)\\s+(' + numStr + ')\\s+(' + numStr + ')\\s+(' + numStr + ')\\s+(\\d+)\\s*%\\s*$',
  );
  const uniteRx = /^(.+?)\s+(ENS|M2|M3|ML|FRT|U|BTE|H|FORFAIT|M²|m²|ml|u|forfait)\s*$/;
  const skipPatterns = [
    /total\s*h\.?t\.?/i,
    /total\s*t\.?t\.?c/i,
    /total\s*tva/i,
    /sous[\s\-]*total/i,
    /^page\b/i,
    /^designation/i,
    /^d[ée]signation/i,
    /siren\b/i,
    /capital\b/i,
  ];

  for (const raw of lines) {
    const line = raw.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
    if (line.length < 10 || line.length > 250) continue;
    if (skipPatterns.some((p) => p.test(line))) continue;

    const m = line.match(tailRx);
    if (!m) continue;

    const [, prefix, qteS, puS, totalS, tva] = m;
    const qte = parseFloatFR(qteS);
    const pu = parseFloatFR(puS);
    const total = parseFloatFR(totalS);
    const tvaNum = parseInt(tva, 10);

    if (qte === null || pu === null || total === null) continue;
    if (![5, 10, 20].includes(tvaNum)) continue;
    if (Math.abs(qte * pu - total) > Math.max(1, total * 0.01)) continue;
    if (pu < 1 || qte <= 0 || total < 5) continue;

    let nom: string;
    let unite: string;
    const um = prefix.match(uniteRx);
    if (um) {
      nom = um[1].trim();
      unite = um[2].toUpperCase().replace('M²', 'M2').replace('forfait', 'FORFAIT');
    } else {
      nom = prefix.trim();
      unite = 'ENS';
    }

    if (!/^[A-ZÀ-ÿ]/.test(nom)) continue;
    if (nom.length < 3 || nom.length > 120) continue;
    if (/^[\d\s.,]+$/.test(nom)) continue;

    postes.push({ label_pdf: nom, unite, qte, pu, total });
  }

  return postes;
}

export function suggestMapping(
  usineKey: UsineKey,
  posteDetecte: ParsedImportPoste,
  customPostes: Record<string, PosteRef>,
): string | null {
  if (!REFS[usineKey]) return null;

  const target = posteDetecte.label_pdf.toLowerCase().replace(/[^a-zà-ÿ0-9 ]/g, '');
  let best: string | null = null;
  let bestScore = 0;

  const allPostes: Record<string, PosteRef> = {
    ...(REFS[usineKey].postes as Record<string, PosteRef>),
    ...customPostes,
  };

  Object.entries(allPostes).forEach(([code, p]) => {
    const labels = [p.label_pdf, p.label_user]
      .filter(Boolean)
      .map((l) => l.toLowerCase().replace(/[^a-zà-ÿ0-9 ]/g, ''));
    labels.forEach((lbl) => {
      if (!lbl) return;
      const tgtWords = new Set(target.split(/\s+/).filter((w) => w.length >= 3));
      const lblWords = new Set(lbl.split(/\s+/).filter((w) => w.length >= 3));
      let common = 0;
      tgtWords.forEach((w) => {
        if (lblWords.has(w)) common++;
      });
      const score = tgtWords.size ? common / tgtWords.size : 0;
      if (score > bestScore) {
        bestScore = score;
        best = code;
      }
    });
  });

  return bestScore >= 0.5 ? best : null;
}
