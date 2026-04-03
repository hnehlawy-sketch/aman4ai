import { Injectable, signal, computed } from '@angular/core';
import { translations } from '../translations';

@Injectable({ providedIn: 'root' })
export class TranslationService {
  currentLang = signal<'ar' | 'en'>('ar');
  t = computed(() => translations[this.currentLang()]);

  constructor() {
    const saved = localStorage.getItem('aman_lang');
    if (saved === 'ar' || saved === 'en') {
      this.currentLang.set(saved);
    }
    
    // Set document direction
    this.updateDir();
  }

  setLang(lang: 'ar' | 'en') {
    this.currentLang.set(lang);
    localStorage.setItem('aman_lang', lang);
    this.updateDir();
  }

  toggleLang() {
    this.setLang(this.currentLang() === 'ar' ? 'en' : 'ar');
  }

  private updateDir() {
    document.documentElement.dir = this.currentLang() === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = this.currentLang();
  }
}
