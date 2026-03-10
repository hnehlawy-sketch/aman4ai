import { Component, input, output, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { UiService } from '../services/ui.service';

@Component({
  selector: 'app-chat-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-input.component.html'
})
export class ChatInputComponent {
  authService = inject(AuthService);
  uiService = inject(UiService);

  t = input.required<any>();
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
  selectedFile = input.required<any>();
  showInputModelMenu = input.required<boolean>();

  toggleInputModelMenu = output<void>();
  toggleWebSearch = output<void>();
  toggleGenerateImage = output<void>();
  openLiveView = output<void>();
  setModel = output<{key: string, closeMenu: boolean}>();
  triggerFileUpload = output<void>();
  onFileSelected = output<Event>();
  clearFile = output<void>();
  updateInput = output<Event>();
  handleKeydown = output<KeyboardEvent>();
  startVoiceInput = output<void>();
  stopGeneration = output<void>();
  sendMessage = output<void>();

  @ViewChild('textarea') textarea!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
}
