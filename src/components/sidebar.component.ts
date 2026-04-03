import { Component, input, output, inject, signal, computed, HostListener, model } from '@angular/core';
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
  theme = input.required<boolean>();
  isSidebarOpen = input.required<boolean>();
  sessions = input.required<ChatSession[]>();
  currentSessionId = input.required<string>();
  isSelectionMode = input.required<boolean>();
  selectedSessionIds = input.required<Set<string>>();
  searchQuery = input.required<string>();
  filteredSessions = input.required<ChatSession[]>();
  activeMenuId = model<string | null>(null);

  // -- Outputs --
  toggleSidebar = output<void>();
  createNewChat = output<void>();
  toggleSelectionMode = output<void>();
  deleteSelectedSessions = output<void>();
  toggleSessionSelection = output<{event: MouseEvent, id: string}>();
  loadSession = output<string>();
  exportSession = output<{event: MouseEvent, session: ChatSession}>();
  deleteSession = output<{event: MouseEvent, id: string}>();
  searchQueryChange = output<string>();
  toggleMenu = output<{event: MouseEvent, id: string}>();

  // -- Translations --
  t = this.translationService.t;
  currentLang = this.translationService.currentLang;

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQueryChange.emit(value);
  }

  onNewChat() {
    this.createNewChat.emit();
  }

  onLoadSession(id: string) {
    this.loadSession.emit(id);
  }

  onToggleMenu(event: MouseEvent, id: string) {
    event.stopPropagation();
    this.toggleMenu.emit({event, id});
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
