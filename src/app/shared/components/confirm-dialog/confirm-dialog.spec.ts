import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { settle } from '../../../../testing/test-helpers';
import { provideTestTranslate, useTranslations } from '../../../../testing/translate-helpers';
import { ConfirmDialogService } from './confirm-dialog.service';

/** Host that opens the dialog, so the spec exercises the real service path. */
@Component({
  selector: 'app-confirm-host',
  template: '',
})
class ConfirmHost {
  readonly service = inject(ConfirmDialogService);
}

/** Clicks a dialog action by its visible label. */
function clickAction(label: string): void {
  const buttons = [...document.querySelectorAll<HTMLElement>('.mat-mdc-dialog-actions button')];
  const match = buttons.find((button) => button.textContent?.trim() === label);

  if (!match) {
    throw new Error(
      `No dialog action labelled "${label}". Found: ${buttons.map((b) => b.textContent?.trim()).join(', ')}`,
    );
  }

  match.click();
}

describe('ConfirmDialogService', () => {
  let host: ConfirmHost;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ConfirmHost],
      providers: [provideTestTranslate()],
    });
    useTranslations();
    const fixture = TestBed.createComponent(ConfirmHost);
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    for (const container of document.querySelectorAll('.cdk-overlay-container')) {
      container.remove();
    }
  });

  it('renders the title and message it is given', async () => {
    const answer = host.service.ask({ title: 'Delete task?', message: 'This cannot be undone.' });
    await settle();

    expect(document.querySelector('.confirm__title')?.textContent).toContain('Delete task?');
    expect(document.querySelector('.confirm__message')?.textContent).toContain(
      'This cannot be undone.',
    );

    clickAction('Cancel');
    await settle();
    await answer;
  });

  it('resolves true when confirmed', async () => {
    const answer = host.service.ask({
      title: 'Delete task?',
      message: 'Gone for good.',
      confirmLabel: 'Delete',
    });
    await settle();

    clickAction('Delete');
    await settle();

    await expect(answer).resolves.toBe(true);
  });

  it('resolves false when cancelled', async () => {
    const answer = host.service.ask({ title: 'Delete task?', message: 'Gone for good.' });
    await settle();

    clickAction('Cancel');
    await settle();

    await expect(answer).resolves.toBe(false);
  });

  it('uses the default action labels when none are given', async () => {
    const answer = host.service.ask({ title: 'Proceed?', message: 'Are you sure?' });
    await settle();

    const labels = [...document.querySelectorAll('.mat-mdc-dialog-actions button')].map((button) =>
      button.textContent?.trim(),
    );

    expect(labels).toEqual(['Cancel', 'Confirm']);

    clickAction('Cancel');
    await settle();
    await answer;
  });

  it('marks a destructive confirmation, so it does not look routine', async () => {
    const answer = host.service.ask({
      title: 'Delete task?',
      message: 'Gone for good.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    await settle();

    const confirm = [
      ...document.querySelectorAll<HTMLElement>('.mat-mdc-dialog-actions button'),
    ].at(-1);

    expect(confirm?.classList.contains('confirm__danger')).toBe(true);

    clickAction('Delete');
    await settle();
    await answer;
  });
});
