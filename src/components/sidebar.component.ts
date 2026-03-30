import { Component, input, output, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../services/auth.service';
import { UiService } from '../services/ui.service';
import { TranslationService } from '../services/translation.service';
import { ChatSession } from '../models';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent {
  authService = inject(AuthService);
  uiService = inject(UiService);
  translationService = inject(TranslationService);

  // -- Inputs --
  theme = input.required<'light' | 'dark'>();
  isSidebarOpen = input.required<boolean>();
  sessions = input.required<ChatSession[]>();
  currentSessionId = input.required<string>();
  isSelectionMode = input.required<boolean>();
  selectedSessionIds = input.required<Set<string>>();

  // -- Outputs --
  toggleSidebar = output<void>();
  createNewChat = output<void>();
  toggleSelectionMode = output<void>();
  deleteSelectedSessions = output<void>();
  toggleSessionSelection = output<{event: MouseEvent, id: string}>();
  loadSession = output<string>();
  exportSession = output<{event: MouseEvent, session: ChatSession}>();
  deleteSession = output<{event: MouseEvent, id: string}>();

  // -- Translations --
  t = computed(() => this.translationService.t());
  currentLang = computed(() => this.translationService.currentLang());

  // -- Internal State --
  searchQuery = signal('');
  activeMenuId = signal<string | null>(null);

  filteredSessions = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const all = this.sessions();
    if (!query) return all;
    return all.filter(s => s.title.toLowerCase().includes(query));
  });

  @HostListener('document:click')
  onDocumentClick() {
    this.activeMenuId.set(null);
  }

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  onNewChat() {
    this.searchQuery.set('');
    this.createNewChat.emit();
  }

  onLoadSession(id: string) {
    this.searchQuery.set('');
    this.loadSession.emit(id);
  }

  onToggleMenu(event: MouseEvent, id: string) {
    event.stopPropagation();
    this.activeMenuId.set(this.activeMenuId() === id ? null : id);
  }

  onExportSession(event: MouseEvent, session: ChatSession) {
    event.stopPropagation();
    this.activeMenuId.set(null);
    this.exportSession.emit({event, session});
  }

  onDeleteSession(event: MouseEvent, id: string) {
    event.stopPropagation();
    this.activeMenuId.set(null);
    this.deleteSession.emit({event, id});
  }
}
