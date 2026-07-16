import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { App } from './app';

describe('App shell', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('creates the shell', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the primary navigation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const nav = fixture.nativeElement as HTMLElement;
    expect(nav.querySelector('.brand .logo')?.getAttribute('alt')).toBe('Sahm');
    expect(nav.querySelector('.brand')?.textContent).toContain('POS');
    expect(nav.querySelectorAll('.topnav a').length).toBe(2);
  });
});
