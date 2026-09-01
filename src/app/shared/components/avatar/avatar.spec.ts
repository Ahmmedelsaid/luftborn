import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { Avatar } from './avatar';

describe('Avatar', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Avatar] });
  });

  /** Renders the component with the given inputs and returns its host element. */
  async function render(inputs: {
    name: string;
    avatar?: string;
    color?: string;
    size?: number;
  }): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(Avatar);
    fixture.componentRef.setInput('name', inputs.name);

    if (inputs.avatar !== undefined) {
      fixture.componentRef.setInput('avatar', inputs.avatar);
    }
    if (inputs.color !== undefined) {
      fixture.componentRef.setInput('color', inputs.color);
    }
    if (inputs.size !== undefined) {
      fixture.componentRef.setInput('size', inputs.size);
    }

    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('prefers the initials the API supplies', async () => {
    const host = await render({ name: 'John Doe', avatar: 'XY' });

    expect(host.textContent?.trim()).toBe('XY');
  });

  it('derives initials from a two-word name', async () => {
    const host = await render({ name: 'Sarah Smith' });

    expect(host.textContent?.trim()).toBe('SS');
  });

  it('derives a single initial from a one-word name', async () => {
    const host = await render({ name: 'cher' });

    expect(host.textContent?.trim()).toBe('C');
  });

  it('uses the first and last initial for a three-word name', async () => {
    const host = await render({ name: 'Ada Byron Lovelace' });

    expect(host.textContent?.trim()).toBe('AL');
  });

  it('falls back to a placeholder for an empty name', async () => {
    const host = await render({ name: '   ' });

    expect(host.textContent?.trim()).toBe('?');
  });

  it('defaults to the brand colour, which is what the design uses', async () => {
    const host = await render({ name: 'John Doe' });

    expect(host.style.getPropertyValue('--app-avatar-color')).toBe('var(--app-primary)');
  });

  it('honours an explicit colour', async () => {
    const host = await render({ name: 'John Doe', color: '#7B1FA2' });

    expect(host.style.getPropertyValue('--app-avatar-color')).toBe('#7B1FA2');
  });

  it('scales the font with the size', async () => {
    const host = await render({ name: 'John Doe', size: 40 });

    expect(host.style.width).toBe('40px');
    expect(host.style.fontSize).toBe('16px');
  });

  it('is hidden from assistive technology, with the name in a tooltip', async () => {
    const host = await render({ name: 'John Doe' });

    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect(host.getAttribute('title')).toBe('John Doe');
  });
});
