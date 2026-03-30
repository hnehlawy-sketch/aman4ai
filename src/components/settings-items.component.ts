import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiService } from '../services/ui.service';
import { ThemeService } from '../services/theme.service';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-settings-items',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings-items.component.html'
})
export class SettingsItemsComponent {
  uiService = inject(UiService);
  themeService = inject(ThemeService);
  translationService = inject(TranslationService);
}
