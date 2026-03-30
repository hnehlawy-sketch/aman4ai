import { Injectable, signal, computed } from '@angular/core';
import { translations } from '../translations';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  currentLang = signal<'ar' | 'en'>('ar');

  t = computed(() => {
    const lang = this.currentLang();
    return translations[lang] || translations['ar'];
  });

  constructor() {
    const savedLang = localStorage.getItem('aman_lang') as 'ar' | 'en';
    if (savedLang) {
      this.currentLang.set(savedLang);
    }
  }

  setLang(lang: 'ar' | 'en') {
    this.currentLang.set(lang);
    localStorage.setItem('aman_lang', lang);
  }

  toggleLang() {
    this.setLang(this.currentLang() === 'ar' ? 'en' : 'ar');
  }
}
