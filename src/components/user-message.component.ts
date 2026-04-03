import { Component, input, output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage } from '../services/gemini.service';
import { TranslationService } from '../services/translation.service';
import { UiService } from '../services/ui.service';

@Component({
  selector: 'app-user-message',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-message.component.html'
})
export class UserMessageComponent {
  message = input.required<ChatMessage>();
  translationService = inject(TranslationService);
  uiService = inject(UiService);

  onEdit = output<ChatMessage>();
  onDelete = output<string>();
  onShare = output<void>();

  isEditing = signal(false);
  editValue = signal('');
  isConfirmingDelete = signal(false);
  showMobileActions = signal(false);
  private pressTimer: any;

  onTouchStart() {
    this.pressTimer = setTimeout(() => {
      this.showMobileActions.set(true);
      setTimeout(() => this.showMobileActions.set(false), 5000);
    }, 500);
  }

  onTouchEnd() {
    if (this.pressTimer) clearTimeout(this.pressTimer);
  }

  startEdit() {
    this.editValue.set(this.message().text);
    this.isEditing.set(true);
  }

  saveEdit() {
    const newText = this.editValue().trim();
    if (newText && newText !== this.message().text) {
      this.onEdit.emit({ ...this.message(), text: newText, isEdited: true });
    }
    this.isEditing.set(false);
  }

  cancelEdit() {
    this.isEditing.set(false);
  }

  confirmDelete() {
    this.isConfirmingDelete.set(true);
  }

  executeDelete() {
    this.onDelete.emit(this.message().id);
    this.isConfirmingDelete.set(false);
  }

  cancelDelete() {
    this.isConfirmingDelete.set(false);
  }
}
