import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../services/theme.service';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-chat-welcome',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-welcome.component.html'
})
export class ChatWelcomeComponent {
  themeService = inject(ThemeService);
  translationService = inject(TranslationService);
  
  usePrompt = output<string>();

  t() {
    return this.translationService.t();
  }
}
