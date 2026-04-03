import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  isDark = signal<boolean>(false);

  constructor() {
    const savedTheme = localStorage.getItem('aman_theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      this.isDark.set(true);
    }

    effect(() => {
      if (this.isDark()) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('aman_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('aman_theme', 'light');
      }
    });
  }

  toggleTheme() {
    this.isDark.update(v => !v);
  }

  setTheme(theme: 'light' | 'dark') {
    this.isDark.set(theme === 'dark');
  }
}
