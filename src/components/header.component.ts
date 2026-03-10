import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { UiService } from '../services/ui.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html'
})
export class HeaderComponent {
  authService = inject(AuthService);
  uiService = inject(UiService);

  t = input.required<any>();
  theme = input.required<'light' | 'dark'>();
  currentLang = input.required<'ar' | 'en'>();
  showUserMenu = input.required<boolean>();

  toggleSidebar = output<void>();
  createNewChat = output<void>();
  toggleUserMenu = output<void>();
  closeUserMenu = output<void>();
  logout = output<void>();

  getUserInitials(name: string): string {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }
}
