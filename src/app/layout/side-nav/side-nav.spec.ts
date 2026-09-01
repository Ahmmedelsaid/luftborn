import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { click, query, texts } from '../../../testing/component-helpers';
import { provideAppIcons } from '../../shared/icons/provide-icons';
import { NavItem } from '../interfaces/nav-item.interface';
import { SideNav } from './side-nav';

const ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
  { label: 'Tasks', icon: 'tasks', route: '/tasks' },
];

describe('SideNav', () => {
  let fixture: ComponentFixture<SideNav>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [SideNav],
      providers: [
        provideAppIcons(),
        provideRouter([
          { path: 'dashboard', children: [] },
          { path: 'tasks', children: [] },
        ]),
      ],
    });

    fixture = TestBed.createComponent(SideNav);
    fixture.componentRef.setInput('items', ITEMS);
    await fixture.whenStable();
  });

  it('renders a link per item, in the order given', async () => {
    expect(texts(fixture, '.nav__label')).toEqual(['Dashboard', 'Tasks']);
  });

  it('is a labelled navigation landmark', () => {
    const host = fixture.nativeElement as HTMLElement;

    expect(host.getAttribute('role')).toBe('navigation');
    expect(host.getAttribute('aria-label')).toBe('Main navigation');
  });

  it('marks the current route with aria-current', async () => {
    await TestBed.inject(Router).navigate(['/tasks']);
    await fixture.whenStable();

    const links = (fixture.nativeElement as HTMLElement).querySelectorAll('.nav__link');

    expect(links[1].getAttribute('aria-current')).toBe('page');
    expect(links[0].getAttribute('aria-current')).toBeNull();
  });

  it('emits navigated on a link activation, so the drawer can close', async () => {
    const spy = vi.fn();
    fixture.componentInstance.navigated.subscribe(spy);

    await click(fixture, '.nav__link');

    expect(spy).toHaveBeenCalled();
  });

  it('emits createTask from the primary action', async () => {
    const spy = vi.fn();
    fixture.componentInstance.createTask.subscribe(spy);

    await click(fixture, '.nav__cta');

    expect(spy).toHaveBeenCalled();
  });

  it('renders no count chips, matching the design', () => {
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('.nav__badge')).toBeNull();
  });

  it('hides decorative icons from assistive technology', () => {
    expect(query(fixture, '.nav__icon').getAttribute('aria-hidden')).toBe('true');
  });
});
