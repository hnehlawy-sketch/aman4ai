import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  theme = signal<'light' | 'dark'>('light');
  isDark = signal(false);

  constructor() {
    const savedTheme = localStorage.getItem('aman_theme') as 'light' | 'dark';
    if (savedTheme) {
      this.theme.set(savedTheme);
      this.isDark.set(savedTheme === 'dark');
    }

    effect(() => {
      const currentTheme = this.theme();
      this.isDark.set(currentTheme === 'dark');
      localStorage.setItem('aman_theme', currentTheme);
      if (currentTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    });
  }

  toggleTheme() {
    this.theme.update(t => t === 'light' ? 'dark' : 'light');
  }

  setTheme(theme: 'light' | 'dark') {
    this.theme.set(theme);
  }
}
