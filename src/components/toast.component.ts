import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 right-4 z-[200] flex flex-col gap-2">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="px-6 py-3 rounded-xl shadow-lg backdrop-blur-md border animate-in slide-in-from-right duration-300"
             [ngClass]="{
               'bg-emerald-500/90 border-emerald-400/20 text-white': toast.type === 'success',
               'bg-rose-500/90 border-rose-400/20 text-white': toast.type === 'error',
               'bg-blue-500/90 border-blue-400/20 text-white': toast.type === 'info'
             }">
          {{ toast.message }}
        </div>
      }
    </div>
  `
})
export class ToastComponent {
  toastService = inject(ToastService);
}
