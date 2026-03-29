import { Component, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../services/theme.service';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-install-prompt',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './install-prompt.component.html'
})
export class InstallPromptComponent {
  themeService = inject(ThemeService);
  translationService = inject(TranslationService);
  
  installPwa = output<void>();
  dismissInstall = output<void>();
}
