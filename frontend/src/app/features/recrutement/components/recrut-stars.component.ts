import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-recrut-stars',
  standalone: true,
  template: `
    <div class="stars" [class.readonly]="readonly()">
      @for (star of stars; track star) {
        <span
          [class]="star <= rating() ? 'on' : 'off'"
          (click)="onStar(star)"
          (keydown.enter)="onStar(star)"
          [attr.tabindex]="readonly() ? -1 : 0"
          role="button"
        >★</span>
      }
    </div>
  `,
  styles: `:host { display: inline-flex; } .stars.readonly { cursor: default; } .stars.readonly span { cursor: default; }`,
})
export class RecrutStarsComponent {
  readonly rating = input(0);
  readonly readonly = input(false);
  readonly ratingChange = output<number>();

  readonly stars = [1, 2, 3, 4, 5];

  onStar(value: number): void {
    if (this.readonly()) return;
    this.ratingChange.emit(value);
  }
}
