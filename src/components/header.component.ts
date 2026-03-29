import { Component, input, output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { UiService } from '../services/ui.service';
import { ThemeService } from '../services/theme.service';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html'
})
export class HeaderComponent {
  authService = inject(AuthService);
  uiService = inject(UiService);
  themeService = inject(ThemeService);
  translationService = inject(TranslationService);

  showUserMenu = input.required<boolean>();
  theme = input.required<'light' | 'dark'>();

  toggleSidebar = output<void>();
  createNewChat = output<void>();
  toggleUserMenu = output<void>();
  closeUserMenu = output<void>();
  logout = output<void>();

  // -- Translations --
  t = computed(() => this.translationService.t());
  currentLang = computed(() => this.translationService.currentLang());

  getUserInitials(name: string): string {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }
}
