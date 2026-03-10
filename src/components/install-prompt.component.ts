import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-install-prompt',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './install-prompt.component.html'
})
export class InstallPromptComponent {
  t = input.required<any>();
  
  installPwa = output<void>();
  dismissInstall = output<void>();
}
