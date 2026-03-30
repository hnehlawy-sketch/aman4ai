import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../services/theme.service';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-input-model-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './input-model-menu.component.html'
})
export class InputModelMenuComponent {
  themeService = inject(ThemeService);
  translationService = inject(TranslationService);
  modelKey = input.required<string>();
  
  t = () => this.translationService.t();
  theme = () => this.themeService.isDark() ? 'dark' : 'light';

  setModel = output<{key: string, closeMenu: boolean}>();
  closeMenu = output<void>();
}
