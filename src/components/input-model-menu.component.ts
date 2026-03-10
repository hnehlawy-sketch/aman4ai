import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-input-model-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './input-model-menu.component.html'
})
export class InputModelMenuComponent {
  t = input.required<any>();
  theme = input.required<'light' | 'dark'>();
  modelKey = input.required<string>();
  
  setModel = output<{key: string, closeMenu: boolean}>();
  closeMenu = output<void>();
}
