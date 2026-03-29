import { Injectable, signal, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { DataLoggingService } from './data-logging.service';

export interface SelectedFile {
  name: string;
  data: string;
  mimeType: string;
  previewUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class FileHandlingService {
  private authService = inject(AuthService);
  private logger = inject(DataLoggingService);

  selectedFiles = signal<SelectedFile[]>([]);

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64Data = (e.target?.result as string).split(',')[1];
          const user = this.authService.user();
          if (user) {
            this.logger.log({
              uid: user.uid,
              email: user.email || '',
              type: 'file',
              content: { name: file.name, mimeType: file.type, size: file.size }
            });
          }
          
          const newFile: SelectedFile = {
            name: file.name,
            mimeType: file.type,
            data: base64Data,
            previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
          };

          this.selectedFiles.update(prev => [...prev, newFile]);
        };
        reader.readAsDataURL(file);
      });
      
      input.value = '';
    }
  }

  removeFile(index: number) {
    this.selectedFiles.update(prev => {
      const newFiles = [...prev];
      if (newFiles[index]?.previewUrl) {
        URL.revokeObjectURL(newFiles[index].previewUrl!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  }

  clearFiles() {
    this.selectedFiles().forEach(f => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    this.selectedFiles.set([]);
  }

  exportSession(session: any) {
    const content = session.messages.map((m: any) => `${m.role === 'user' ? 'User' : 'Aman'}: ${m.text}`).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title || 'chat'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
