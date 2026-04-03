import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-file-download',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mt-3 p-4 rounded-2xl border-2 border-blue-100 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-900/10 flex items-center justify-between gap-4 shadow-sm group transition-all hover:border-blue-200 dark:hover:border-blue-800">
      <div class="flex items-center gap-4">
        <div class="p-3 rounded-xl bg-white dark:bg-slate-800 text-blue-500 shadow-sm group-hover:scale-110 transition-transform">
          @switch (file().type) {
            @case ('docx') {
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            }
            @case ('pdf') {
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            }
            @default {
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            }
          }
        </div>
        <div class="flex flex-col min-w-0">
          <span class="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
            {{ file().filename }}
          </span>
          <span class="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            {{ file().type === 'docx' ? 'Word Document' : file().type === 'pdf' ? 'PDF Document' : 'Text File' }}
          </span>
        </div>
      </div>
      <button (click)="onDownload.emit(file())" 
              class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        تحميل
      </button>
    </div>
  `
})
export class FileDownloadComponent {
  file = input.required<any>();
  onDownload = output<any>();
}
