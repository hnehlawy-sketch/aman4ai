import { Component, inject, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage } from '../services/gemini.service';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, AlignmentType, ShadingType } from 'docx';
import saveAs from 'file-saver';
import { TranslationService } from '../services/translation.service';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-export-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[70] flex items-center justify-center p-4">
       <div (click)="close.emit()" class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-[fadeIn_0.2s_ease-out]"></div>
       <div class="w-full max-w-sm rounded-3xl shadow-2xl p-6 relative z-10 animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]"
            [class.bg-white]="!themeService.isDark()"
            [class.bg-slate-900]="themeService.isDark()"
            [class.border]="themeService.isDark()"
            [class.border-slate-800]="themeService.isDark()">
         
         <div class="flex flex-col items-center text-center">
            <h2 class="text-xl font-bold mb-4">{{ t().exportTitle }}</h2>
            <div class="w-full space-y-3">
              <button (click)="exportAsTxt()" [disabled]="isExporting()" class="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl transition-colors bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-50">
                <span class="font-bold text-sm">TXT</span> {{ t().exportTxt }}
              </button>
              <button (click)="exportAsPdf()" [disabled]="isExporting()" class="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl transition-colors bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-50">
                @if (isExporting()) {
                  <svg class="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{{ t().exporting || 'جاري التصدير...' }}</span>
                } @else {
                  <span class="font-bold text-sm">PDF</span> {{ t().exportPdf }}
                }
              </button>
              <button (click)="exportAsDocx()" [disabled]="isExporting()" class="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl transition-colors bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-50">
                <span class="font-bold text-sm">DOCX</span> {{ t().exportDocx }}
              </button>
            </div>
         </div>
       </div>
    </div>
  `
})
export class ExportModalComponent {
  translationService = inject(TranslationService);
  themeService = inject(ThemeService);
  
  messages = input<ChatMessage[]>([]);
  close = output<void>();

  t = this.translationService.t;
  currentLang = this.translationService.currentLang;

  isExporting = signal(false);

  exportAsTxt() {
    this.close.emit();
    const msgs = this.messages();
    if (msgs.length === 0) return;

    let textContent = `Aman AI Chat Export - ${new Date().toLocaleString()}\n\n`;
    msgs.forEach(msg => {
      const role = msg.role === 'user' ? 'You' : 'Aman';
      textContent += `[${role}]:\n${msg.text}\n\n${'-'.repeat(40)}\n\n`;
    });

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `Aman-Chat-${new Date().toISOString().slice(0,10)}.txt`);
  }

  async exportAsPdf() {
    if (this.isExporting()) return;
    if (this.messages().length === 0) return;

    this.isExporting.set(true);
    
    const printContainer = document.createElement('div');
    printContainer.style.position = 'fixed';
    printContainer.style.left = '-9999px';
    printContainer.style.width = '794px'; // A4 width at 96 DPI
    printContainer.style.padding = '40px';
    printContainer.style.backgroundColor = 'white';
    printContainer.style.color = 'black';
    printContainer.style.fontFamily = "'Cairo', 'Amiri', sans-serif";
    printContainer.style.direction = 'rtl';
    
    printContainer.innerHTML = `
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 15px;">
        <h1 style="font-size: 28px; color: #1e293b; margin: 0;">Aman AI Chat Export</h1>
        <p style="font-size: 14px; color: #64748b; margin-top: 5px;">${new Date().toLocaleString('ar-SA')}</p>
      </div>
    `;

    this.messages().forEach(msg => {
        const msgDiv = document.createElement('div');
        msgDiv.style.marginBottom = '20px';
        msgDiv.style.padding = '15px';
        msgDiv.style.borderRadius = '12px';
        msgDiv.style.border = '1px solid #e2e8f0';
        msgDiv.style.position = 'relative';

        const role = document.createElement('div');
        role.style.fontWeight = 'bold';
        role.style.fontSize = '12px';
        role.style.marginBottom = '8px';
        role.style.textTransform = 'uppercase';
        role.style.letterSpacing = '0.05em';
        
        const isUser = msg.role === 'user';
        role.textContent = isUser ? 'أنت' : 'أمان';
        role.style.color = isUser ? '#2563eb' : '#059669';
        
        const text = document.createElement('div');
        text.textContent = msg.text;
        text.style.whiteSpace = 'pre-wrap';
        text.style.margin = '0';
        text.style.fontSize = '16px';
        text.style.lineHeight = '1.6';

        if (isUser) {
            msgDiv.style.backgroundColor = '#f8fafc';
            msgDiv.style.marginRight = '40px';
            msgDiv.style.borderRight = '4px solid #2563eb';
            text.style.textAlign = 'right';
        } else {
            msgDiv.style.backgroundColor = '#f0fdf4';
            msgDiv.style.marginLeft = '40px';
            msgDiv.style.borderLeft = '4px solid #059669';
            text.style.textAlign = 'right';
        }
        
        msgDiv.appendChild(role);
        msgDiv.appendChild(text);
        printContainer.appendChild(msgDiv);
    });

    document.body.appendChild(printContainer);

    try {
        // Use a small delay to ensure fonts are rendered
        await new Promise(resolve => setTimeout(resolve, 500));

        const canvas = await html2canvas(printContainer, { 
          scale: 1.5, // Reduced scale for faster processing of long chats
          useCORS: true,
          logging: false
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.8); // Use JPEG with compression for smaller size
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = pdfWidth / imgWidth;
        const finalImgHeight = imgHeight * ratio;
        
        let heightLeft = finalImgHeight;
        let position = 0;

        // First page
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, finalImgHeight);
        heightLeft -= pdfHeight;

        // Subsequent pages
        while (heightLeft > 0) {
            position = heightLeft - finalImgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, finalImgHeight);
            heightLeft -= pdfHeight;
        }
        
        pdf.save(`Aman-Chat-${new Date().toISOString().slice(0,10)}.pdf`);
        this.close.emit();
    } catch (e) {
        console.error("Error generating PDF", e);
    } finally {
        document.body.removeChild(printContainer);
        this.isExporting.set(false);
    }
  }

  async exportAsDocx() {
    this.close.emit();
    if (this.messages().length === 0) return;

    const paragraphs: Paragraph[] = [
      new Paragraph({
        children: [new TextRun({ text: 'Aman AI Chat Export', bold: true, size: 32 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 }
      })
    ];

    this.messages().forEach(msg => {
      const isUser = msg.role === 'user';
      
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: isUser ? 'You:' : 'Aman:', bold: true })],
        shading: { type: ShadingType.CLEAR, fill: isUser ? 'FFF9C4' : 'F1F1F1' },
        alignment: isUser ? AlignmentType.LEFT : AlignmentType.RIGHT,
        bidirectional: true,
      }));
      
      msg.text.split('\n').forEach(line => {
        paragraphs.push(new Paragraph({
          children: [new TextRun(line)],
          alignment: isUser ? AlignmentType.LEFT : AlignmentType.RIGHT,
          bidirectional: true,
        }));
      });
      
      paragraphs.push(new Paragraph({ text: '', spacing: { after: 200 } }));
    });
    
    const doc = new Document({
      sections: [{ children: paragraphs }],
      features: { updateFields: true },
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Aman-Chat-${new Date().toISOString().slice(0,10)}.docx`);
  }
}
