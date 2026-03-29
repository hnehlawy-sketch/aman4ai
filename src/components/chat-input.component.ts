import { Component, input, output, inject, ViewChild, ElementRef, HostListener, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { UiService } from '../services/ui.service';
import { TranslationService } from '../services/translation.service';

import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-chat-input',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './chat-input.component.html'
})
export class ChatInputComponent {
  authService = inject(AuthService);
  uiService = inject(UiService);
  el = inject(ElementRef);
  translationService = inject(TranslationService);

  theme = input.required<'light' | 'dark'>();
  currentModelLabel = input.required<string>();
  modelKey = input.required<string>();
  useWebSearch = input.required<boolean>();
  generateImage = input.required<boolean>();
  isLimitExceeded = input.required<boolean>();
  usagePercentage = input.required<number>();
  inputMessage = input.required<string>();
  isListening = input.required<boolean>();
  isLoading = input.required<boolean>();
  isSending = input.required<boolean>();
  selectedFiles = input.required<any[]>();
  showInputModelMenu = input.required<boolean>();

  toggleInputModelMenu = output<void>();
  toggleWebSearch = output<void>();
  toggleGenerateImage = output<void>();
  openLiveView = output<void>();
  setModel = output<{key: string, closeMenu: boolean}>();
  triggerFileUpload = output<void>();
  onFileSelected = output<Event>();
  removeFile = output<number>();
  clearFiles = output<void>();
  updateInput = output<Event>();
  handleKeydown = output<KeyboardEvent>();
  startVoiceInput = output<void>();
  stopGeneration = output<void>();
  sendMessage = output<void>();

  // -- Translations --
  t = computed(() => this.translationService.t());
  currentLang = computed(() => this.translationService.currentLang());

  @ViewChild('chatTextarea') textarea!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('cameraInput') cameraInput!: ElementRef<HTMLInputElement>;
  @ViewChild('imageInput') imageInput!: ElementRef<HTMLInputElement>;

  showUploadMenu = false;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.el.nativeElement.contains(event.target)) {
      this.showUploadMenu = false;
    }
  }

  toggleUploadMenu() {
    this.showUploadMenu = !this.showUploadMenu;
  }

  onTriggerFileUpload(type: 'all' | 'camera' | 'image' = 'all') {
    this.showUploadMenu = false;
    if (type === 'camera' && this.cameraInput?.nativeElement) {
      this.cameraInput.nativeElement.click();
    } else if (type === 'image' && this.imageInput?.nativeElement) {
      this.imageInput.nativeElement.click();
    } else if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.click();
    }
  }

  inputValue() {
    return this.inputMessage();
  }

  onInput(event: Event) {
    this.updateInput.emit(event);
    this.adjustHeight();
  }

  onKeyDown(event: KeyboardEvent) {
    this.handleKeydown.emit(event);
  }

  onToggleVoice() {
    this.startVoiceInput.emit();
  }

  onSendMessage() {
    this.sendMessage.emit();
  }

  onFileSelectedHandler(event: Event) {
    this.onFileSelected.emit(event);
  }

  focus() {
    if (this.textarea?.nativeElement) {
      this.textarea.nativeElement.focus();
    }
  }

  resetHeight() {
    if (this.textarea?.nativeElement) {
      this.textarea.nativeElement.style.height = 'auto';
    }
  }

  adjustHeight() {
    if (this.textarea?.nativeElement) {
      this.textarea.nativeElement.style.height = 'auto';
      this.textarea.nativeElement.style.height = Math.min(this.textarea.nativeElement.scrollHeight, 150) + 'px';
    }
  }
}
