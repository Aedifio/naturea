import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  viewChild,
} from '@angular/core';
import { Chart } from 'chart.js/auto';
import type { Agency } from '../audit-commerce.models';
import type { SynthView } from '../audit-commerce.models';
import { monthKpis, monthsBack, ymShort } from '../utils/audit-commerce.utils';

@Component({
  selector: 'app-audit-com-evolution-chart',
  standalone: true,
  template: `<div class="chartbox"><canvas #canvas></canvas></div>`,
})
export class AuditComEvolutionChartComponent implements AfterViewInit, OnDestroy {
  readonly agency = input.required<Agency>();
  readonly ym = input.required<string>();
  readonly synthView = input.required<SynthView>();

  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private chart: Chart | null = null;

  constructor() {
    effect(() => {
      this.agency();
      this.ym();
      this.synthView();
      this.render();
    });
  }

  ngAfterViewInit(): void {
    this.render();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private series(): { labels: string[]; sign: number[]; ccmi: number[]; entrant: number[] } {
    const a = this.agency();
    const view = this.synthView();
    const ym = this.ym();

    if (view === 'annee') {
      const yset = new Set((a.audits ?? []).map((au) => au.date.slice(0, 4)));
      const arr = [...yset].sort().map((y) => {
        let s = 0;
        let c = 0;
        let e = 0;
        for (let mo = 1; mo <= 12; mo++) {
          const kp = monthKpis(a, `${y}-${String(mo).padStart(2, '0')}`);
          s += kp.signatures;
          c += kp.ccmi;
          e += kp.entrant;
        }
        return { label: y, s, c, e };
      });
      if (!arr.length) arr.push({ label: ym.split('-')[0], s: 0, c: 0, e: 0 });
      return { labels: arr.map((x) => x.label), sign: arr.map((x) => x.s), ccmi: arr.map((x) => x.c), entrant: arr.map((x) => x.e) };
    }

    const list =
      view === 'glissant'
        ? monthsBack(ym, 12)
        : Array.from({ length: 12 }, (_, i) => `${ym.split('-')[0]}-${String(i + 1).padStart(2, '0')}`);

    return {
      labels: list.map(ymShort),
      sign: list.map((k) => monthKpis(a, k).signatures),
      ccmi: list.map((k) => monthKpis(a, k).ccmi),
      entrant: list.map((k) => monthKpis(a, k).entrant),
    };
  }

  private render(): void {
    const el = this.canvas()?.nativeElement;
    if (!el) return;
    this.chart?.destroy();
    const s = this.series();

    this.chart = new Chart(el, {
      type: 'bar',
      data: {
        labels: s.labels,
        datasets: [
          { label: 'Contacts entrants', data: s.entrant, backgroundColor: '#C2891B', borderRadius: 4 },
          { label: 'Signatures', data: s.sign, backgroundColor: '#41532A', borderRadius: 4 },
          { label: 'Résiliations', data: s.ccmi, backgroundColor: '#D69362', borderRadius: 4 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: { beginAtZero: true, ticks: { precision: 0, font: { size: 11 } }, grid: { color: '#EFEAE0' } },
        },
      },
    });
  }
}
