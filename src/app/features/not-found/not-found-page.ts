import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { EmptyState } from '../../shared/components/empty-state/empty-state';

@Component({
  selector: 'app-not-found-page',
  imports: [EmptyState, MatButtonModule, RouterLink, TranslatePipe],
  template: `
    <app-empty-state
      icon="search_off"
      [title]="'notFound.title' | translate"
      [message]="'notFound.message' | translate"
    >
      <a matButton="filled" routerLink="/dashboard">
        {{ 'actions.backToDashboard' | translate }}
      </a>
    </app-empty-state>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {}
