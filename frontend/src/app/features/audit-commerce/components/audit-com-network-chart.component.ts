import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { Chart } from 'chart.js/auto';
import type { Agency } from '../audit-commerce.models';
import { monthKpis, ymShort } from '../utils/audit-commerce.utils';

@Component({
  selector: 'app-audit-com-network-chart',
  standalone: true,
  template: `<div class="chartbox"><canvas #canvas></canvas></div>`,
})
export class AuditComNetworkChartComponent implements AfterViewInit, OnDestroy {
  readonly agencies = input.required<Agency[]>();
  readonly ym = input.required<string>();

  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private chart: Chart | null = null;

  constructor() {
    effect(() => {
      this.agencies();
      this.ym();
      this.render();
    });
  }

  ngAfterViewInit(): void {
    this.render();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private render(): void {
    const el = this.canvas()?.nativeElement;
    if (!el) return;
    this.chart?.destroy();

    const y = this.ym().split('-')[0];
    const months = Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, '0')}`);
    const sign = months.map((mo) => this.agencies().reduce((s, a) => s + monthKpis(a, mo).signatures, 0));
    const entrant = months.map((mo) => this.agencies().reduce((s, a) => s + monthKpis(a, mo).entrant, 0));
    const totObj = this.agencies().reduce((s, a) => s + (Number(a.objectives?.signatures) || 0), 0);

    const datasets: Chart['data']['datasets'] = [
      { label: 'Contacts entrants réseau', data: entrant, backgroundColor: '#C2891B', borderRadius: 4 },
      { label: 'Signatures réseau', data: sign, backgroundColor: '#41532A', borderRadius: 4 },
    ];
    if (totObj > 0) {
      datasets.push({
        type: 'line',
        label: 'Objectif signatures (cumul réseau)',
        data: months.map(() => totObj),
        borderColor: '#D69362',
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 0,
        fill: false,
        tension: 0,
      });
    }

    this.chart = new Chart(el, {
      type: 'bar',
      data: { labels: months.map(ymShort), datasets },
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
