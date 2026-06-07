/** Usine detection patterns for PDF import (chiffrage-app.html). */
export const USINE_DETECTION: Record<string, RegExp[]> = {
  sicob: [/\bSICOB\b/i, /\b444\s*231\s*955\b/, /RIEUPEYROUX/i],
  boisboreal: [/\bBOIS[\s\-]*BOR[ÉE]AL\b/i, /\bBoisbor[ée]al\b/i],
  cobs: [/\bCOBS\b/i, /\bGIPEN\b/i],
  imaj: [/\bIMAJ\b/i, /MARMANDE/i],
  savare: [/\bSAVARE\b/i, /\bEIFFAGE\b.*BOIS/i, /LESSAY|MOULT/i],
  lowall: [/\bLOWALL\b/i, /GARDANNE/i],
};
