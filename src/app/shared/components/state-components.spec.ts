import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { click, exists, query, text } from '../../../testing/component-helpers';
import { ApiError } from '../../core/models';
import { provideAppIcons } from '../icons/provide-icons';
import { EmptyState } from './empty-state/empty-state';
import { ErrorState } from './error-state/error-state';
import { PageHeader } from './page-header/page-header';
import { Skeleton } from './skeleton/skeleton';

function apiError(overrides: Partial<ApiError> = {}): ApiError {
  return {
    status: 500,
    kind: 'server',
    url: '/api/tasks',
    message: 'Something went wrong on our side.',
    retryable: true,
    ...overrides,
  };
}

describe('EmptyState', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [EmptyState], providers: [provideAppIcons()] });
  });

  it('renders the title and message', async () => {
    const fixture = TestBed.createComponent(EmptyState);
    fixture.componentRef.setInput('title', 'No tasks yet');
    fixture.componentRef.setInput('message', 'Create your first task.');
    await fixture.whenStable();

    expect(text(fixture, '.empty__title')).toBe('No tasks yet');
    expect(text(fixture, '.empty__message')).toBe('Create your first task.');
  });

  it('omits the message paragraph when none is given', async () => {
    const fixture = TestBed.createComponent(EmptyState);
    fixture.componentRef.setInput('title', 'Nothing here');
    await fixture.whenStable();

    expect(exists(fixture, '.empty__message')).toBe(false);
  });
});

describe('ErrorState', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ErrorState], providers: [provideAppIcons()] });
  });

  it('shows the normalised message, never a raw payload', async () => {
    const fixture = TestBed.createComponent(ErrorState);
    fixture.componentRef.setInput('error', apiError({ message: 'Please try again shortly.' }));
    await fixture.whenStable();

    expect(text(fixture, '.error__message')).toBe('Please try again shortly.');
  });

  it('offers a retry only when retrying could help', async () => {
    const fixture = TestBed.createComponent(ErrorState);
    fixture.componentRef.setInput('error', apiError({ retryable: true }));
    await fixture.whenStable();
    expect(exists(fixture, 'button')).toBe(true);

    fixture.componentRef.setInput('error', apiError({ retryable: false, kind: 'not-found' }));
    await fixture.whenStable();
    expect(exists(fixture, 'button')).toBe(false);
  });

  it('emits retry when the action is used', async () => {
    const fixture = TestBed.createComponent(ErrorState);
    fixture.componentRef.setInput('error', apiError());
    await fixture.whenStable();

    const spy = vi.fn();
    fixture.componentInstance.retry.subscribe(spy);

    await click(fixture, 'button');

    expect(spy).toHaveBeenCalled();
  });

  it.each([
    ['offline', 'cloud-off'],
    ['server', 'overdue'],
    ['not-found', 'overdue'],
  ] as const)('uses a distinct glyph for an %s failure', async (kind, icon) => {
    const fixture = TestBed.createComponent(ErrorState);
    fixture.componentRef.setInput('error', apiError({ kind }));
    await fixture.whenStable();

    expect(fixture.componentInstance['iconFor'](kind)).toBe(icon);
  });
});

describe('PageHeader', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [PageHeader] });
  });

  it('renders the title as the page heading', async () => {
    const fixture = TestBed.createComponent(PageHeader);
    fixture.componentRef.setInput('title', 'Dashboard');
    await fixture.whenStable();

    expect(query(fixture, 'h1').textContent?.trim()).toBe('Dashboard');
  });

  it('omits the subtitle when none is given', async () => {
    const fixture = TestBed.createComponent(PageHeader);
    fixture.componentRef.setInput('title', 'Dashboard');
    await fixture.whenStable();

    expect(exists(fixture, '.header__subtitle')).toBe(false);
  });

  it('renders a subtitle when supplied', async () => {
    const fixture = TestBed.createComponent(PageHeader);
    fixture.componentRef.setInput('title', 'Dashboard');
    fixture.componentRef.setInput('subtitle', '17 tasks');
    await fixture.whenStable();

    expect(text(fixture, '.header__subtitle')).toBe('17 tasks');
  });
});

describe('Skeleton', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Skeleton] });
  });

  it('is hidden from assistive technology, since it conveys nothing', async () => {
    const fixture = TestBed.createComponent(Skeleton);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).getAttribute('aria-hidden')).toBe('true');
  });

  it('reserves the shape it is given, so the layout does not shift on load', async () => {
    const fixture = TestBed.createComponent(Skeleton);
    fixture.componentRef.setInput('width', '120px');
    fixture.componentRef.setInput('height', '40px');
    fixture.componentRef.setInput('radius', '50%');
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;

    expect(host.style.width).toBe('120px');
    expect(host.style.height).toBe('40px');
    expect(host.style.borderRadius).toBe('50%');
  });
});
