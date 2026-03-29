import { Injectable, signal, computed, effect } from '@angular/core';
import { translations } from '../translations';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  currentLang = signal<'ar' | 'en'>('ar');
  private allTranslations = translations;

  t = computed(() => {
    const lang = this.currentLang();
    return this.allTranslations[lang] || this.allTranslations['ar'];
  });

  constructor() {
    const savedLang = localStorage.getItem('aman_lang') as 'ar' | 'en';
    if (savedLang) {
      this.currentLang.set(savedLang);
    }

    effect(() => {
      const lang = this.currentLang();
      localStorage.setItem('aman_lang', lang);
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    });
  }

  setLanguage(lang: 'ar' | 'en') {
    this.currentLang.set(lang);
  }

  toggleLanguage() {
    this.currentLang.update(l => l === 'ar' ? 'en' : 'ar');
  }
}
