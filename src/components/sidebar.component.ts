import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { UiService } from '../services/ui.service';
import { ChatSession } from '../models';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent {
  authService = inject(AuthService);
  uiService = inject(UiService);

  t = input.required<any>();
  theme = input.required<'light' | 'dark'>();
  currentLang = input.required<'ar' | 'en'>();
  isSidebarOpen = input.required<boolean>();
  searchQuery = input.required<string>();
  sessions = input.required<ChatSession[]>();
  filteredSessions = input.required<ChatSession[]>();
  currentSessionId = input.required<string>();
  isSelectionMode = input.required<boolean>();
  selectedSessionIds = input.required<Set<string>>();
  activeMenuId = input.required<string | null>();

  toggleSidebar = output<void>();
  createNewChat = output<void>();
  searchQueryChange = output<string>();
  toggleSelectionMode = output<void>();
  deleteSelectedSessions = output<void>();
  toggleSessionSelection = output<{event: MouseEvent, id: string}>();
  loadSession = output<string>();
  toggleMenu = output<{event: MouseEvent, id: string}>();
  exportSession = output<{event: MouseEvent, session: ChatSession}>();
  deleteSession = output<{event: MouseEvent, id: string}>();

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQueryChange.emit(value);
  }
}
