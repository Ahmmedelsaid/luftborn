import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { provideTestTranslate, useTranslations } from '../../../../testing/translate-helpers';
import { TaskPriority } from '../../../core/interfaces';
import { PriorityBadge } from './priority-badge';

describe('PriorityBadge', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PriorityBadge],
      providers: [provideTestTranslate()],
    });
  });

  async function render(priority: TaskPriority): Promise<HTMLElement> {
    useTranslations();
    const fixture = TestBed.createComponent(PriorityBadge);
    fixture.componentRef.setInput('priority', priority);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it.each([
    ['high', 'High'],
    ['medium', 'Medium'],
    ['low', 'Low'],
  ] as const)('renders %s as "%s"', async (priority, label) => {
    const host = await render(priority);

    expect(host.textContent?.trim()).toBe(label);
  });

  it.each(['high', 'medium', 'low'] as const)('carries a %s modifier class', async (priority) => {
    const host = await render(priority);

    expect(host.classList.contains(`priority--${priority}`)).toBe(true);
  });

  it('announces the priority to assistive technology', async () => {
    const host = await render('high');

    expect(host.getAttribute('aria-label')).toBe('Priority: High');
  });
});
