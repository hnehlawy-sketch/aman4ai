import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  isDark = signal(true);

  constructor() {
    const saved = localStorage.getItem('aman_theme');
    if (saved) {
      this.isDark.set(saved === 'dark');
    } else {
      this.isDark.set(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }

    effect(() => {
      const dark = this.isDark();
      localStorage.setItem('aman_theme', dark ? 'dark' : 'light');
      if (dark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    });
  }

  toggleTheme() {
    this.isDark.update(v => !v);
  }
}
