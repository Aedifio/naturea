import { Component, effect, inject, input, output, signal } from '@angular/core';
import { DQ, DP } from '../constants/recrutement-disc.constants';
import { DiscResult } from '../recrutement.models';
import { RecrutementDataService } from '../services/recrutement-data.service';

@Component({
  selector: 'app-recrut-disc-test',
  standalone: true,
  template: `
    @if (phase() === 'test') {
      <div class="card" style="padding:28px">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span style="font-size:12.5px;color:var(--muted)">Question {{ questionIndex() + 1 }}/{{ total }}</span>
          <span style="font-size:12.5px;color:var(--gold);font-weight:600">{{ progressPercent() }}%</span>
        </div>
        <div class="pbar-bg" style="margin-bottom:20px">
          <div class="pbar-fill" [style.width.%]="progressPercent()"></div>
        </div>
        <div class="disc-qtext">{{ currentQuestion().q }}</div>
        <div class="disc-opts">
          @for (opt of currentQuestion().opts; track opt.d; let i = $index) {
            <div
              class="disc-opt"
              [class.sel]="answers()[questionIndex()] === opt.d"
              (click)="pick(opt.d)"
            >
              <span class="ol">{{ letters[i] }}</span>
              <span>{{ opt.t }}</span>
            </div>
          }
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:16px">
          <button type="button" class="btn btn-outline" [disabled]="questionIndex() === 0" (click)="prev()">← Précédent</button>
          <button
            type="button"
            class="btn btn-primary"
            [disabled]="!answers()[questionIndex()]"
            (click)="next()"
          >
            {{ questionIndex() === total - 1 ? 'Voir résultats →' : 'Suivant →' }}
          </button>
        </div>
      </div>
    } @else {
      @if (result(); as disc) {
      <div class="disc-hero">
        <div class="disc-ltr">{{ disc.dominant }}</div>
        <div class="disc-pname">Profil {{ profileName() }}</div>
        <div class="disc-pdesc">{{ profileDesc() }}</div>
      </div>
      <div class="card" style="padding:22px;margin-top:16px">
        <div class="disc-bars">
          @for (entry of scoreEntries(disc); track entry.key) {
            <div class="dbi">
              <div class="dbi-lbl">{{ entry.key }} — {{ entry.name }}</div>
              <div class="dbi-track">
                <div class="dbi-fill" [class]="entry.key" [style.height.%]="entry.percent"></div>
              </div>
              <div class="dbi-score">{{ entry.percent }}%</div>
            </div>
          }
        </div>
      </div>
      @if (showSavedMessage()) {
        <p style="text-align:center;color:var(--green);font-size:13px;margin-top:14px">✅ Résultats enregistrés dans le dossier</p>
      }
      }
    }
  `,
})
export class RecrutDiscTestComponent {
  private readonly data = inject(RecrutementDataService);

  readonly candidateId = input.required<string>();
  readonly showSavedMessage = input(true);
  readonly initialDisc = input<DiscResult | null>(null);
  readonly finished = output<DiscResult>();

  readonly total = DQ.length;
  readonly letters = ['A', 'B', 'C', 'D'];

  readonly phase = signal<'test' | 'result'>('test');
  readonly questionIndex = signal(0);
  readonly answers = signal<Record<number, 'D' | 'I' | 'S' | 'C'>>({});
  readonly result = signal<DiscResult | null>(null);

  constructor() {
    effect(() => {
      const initial = this.initialDisc();
      if (initial) this.showResult(initial);
    });
  }

  currentQuestion = () => DQ[this.questionIndex()];
  progressPercent = () => Math.round((this.questionIndex() / this.total) * 100);

  start(): void {
    this.phase.set('test');
    this.questionIndex.set(0);
    this.answers.set({});
    this.result.set(null);
  }

  pick(value: 'D' | 'I' | 'S' | 'C'): void {
    this.answers.update((a) => ({ ...a, [this.questionIndex()]: value }));
  }

  prev(): void {
    if (this.questionIndex() > 0) this.questionIndex.update((i) => i - 1);
  }

  next(): void {
    if (!this.answers()[this.questionIndex()]) return;
    if (this.questionIndex() < this.total - 1) {
      this.questionIndex.update((i) => i + 1);
      return;
    }
    this.finish();
  }

  showResult(disc: DiscResult): void {
    this.result.set(disc);
    this.phase.set('result');
  }

  profileName(): string {
    const disc = this.result();
    return disc ? DP[disc.dominant].name : '';
  }

  profileDesc(): string {
    const disc = this.result();
    return disc ? DP[disc.dominant].desc : '';
  }

  scoreEntries(disc: DiscResult) {
    return (Object.entries(disc.scores) as Array<['D' | 'I' | 'S' | 'C', number]>).map(
      ([key, value]) => ({
        key,
        name: DP[key].name,
        percent: Math.round((value / this.total) * 100),
      }),
    );
  }

  private finish(): void {
    const scores = { D: 0, I: 0, S: 0, C: 0 };
    Object.values(this.answers()).forEach((d) => scores[d]++);
    const dominant = (Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0] ??
      'D') as DiscResult['dominant'];
    const disc: DiscResult = { scores, dominant, date: this.data.now() };
    this.data.setDisc(this.candidateId(), disc);
    this.showResult(disc);
    this.finished.emit(disc);
  }
}
