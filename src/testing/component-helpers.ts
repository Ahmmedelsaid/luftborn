import { ComponentFixture } from '@angular/core/testing';

/** Trimmed `textContent` of the first element matching `selector`, or `null`. */
export function text(fixture: ComponentFixture<unknown>, selector: string): string | null {
  const element = fixture.nativeElement as HTMLElement;
  return element.querySelector(selector)?.textContent?.trim() ?? null;
}

/** Trimmed text of every element matching `selector`. */
export function texts(fixture: ComponentFixture<unknown>, selector: string): string[] {
  const element = fixture.nativeElement as HTMLElement;
  return [...element.querySelectorAll(selector)].map((node) => node.textContent?.trim() ?? '');
}

/** First matching element, typed. Throws when absent, so specs fail loudly. */
export function query<T extends Element>(fixture: ComponentFixture<unknown>, selector: string): T {
  const element = fixture.nativeElement as HTMLElement;
  const found = element.querySelector<T>(selector);

  if (!found) {
    throw new Error(`No element matched "${selector}"`);
  }

  return found;
}

/** Whether any element matches `selector`. */
export function exists(fixture: ComponentFixture<unknown>, selector: string): boolean {
  const element = fixture.nativeElement as HTMLElement;
  return element.querySelector(selector) !== null;
}

/** Clicks the first matching element and settles change detection. */
export async function click(fixture: ComponentFixture<unknown>, selector: string): Promise<void> {
  query<HTMLElement>(fixture, selector).click();
  await fixture.whenStable();
}
