import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage } from '../services/gemini.service';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, AlignmentType, ShadingType } from 'docx';
import saveAs from 'file-saver';

@Component({
  selector: 'app-export-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[70] flex items-center justify-center p-4">
       <div (click)="close.emit()" class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-[fadeIn_0.2s_ease-out]"></div>
       <div class="w-full max-w-sm rounded-3xl shadow-2xl p-6 relative z-10 animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]"
            [class.bg-white]="theme() === 'light'"
            [class.bg-slate-900]="theme() === 'dark'"
            [class.border]="theme() === 'dark'"
            [class.border-slate-800]="theme() === 'dark'">
         
         <div class="flex flex-col items-center text-center">
            <h2 class="text-xl font-bold mb-4">{{ t().exportTitle }}</h2>
            <div class="w-full space-y-3">
              <button (click)="exportAsTxt()" class="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl transition-colors bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10">
                <span class="font-bold text-sm">TXT</span> {{ t().exportTxt }}
              </button>
              <button (click)="exportAsPdf()" class="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl transition-colors bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10">
                <span class="font-bold text-sm">PDF</span> {{ t().exportPdf }}
              </button>
              <button (click)="exportAsDocx()" class="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl transition-colors bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10">
                <span class="font-bold text-sm">DOCX</span> {{ t().exportDocx }}
              </button>
            </div>
         </div>
       </div>
    </div>
  `
})
export class ExportModalComponent {
  t = input.required<any>();
  theme = input.required<'light' | 'dark'>();
  messages = input.required<ChatMessage[]>();
  close = output<void>();

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
    this.close.emit();
    if (this.messages().length === 0) return;

    const printContainer = document.createElement('div');
    printContainer.style.position = 'fixed';
    printContainer.style.left = '-9999px';
    printContainer.style.width = '794px';
    printContainer.style.padding = '20px';
    printContainer.style.backgroundColor = 'white';
    printContainer.style.color = 'black';
    printContainer.style.fontFamily = 'Amiri, Cairo, sans-serif';
    printContainer.innerHTML = `<h1 style="font-family: Amiri; font-size: 24px; text-align: center;">Aman AI Chat Export</h1><hr style="margin: 10px 0;">`;

    this.messages().forEach(msg => {
        const msgDiv = document.createElement('div');
        msgDiv.style.marginBottom = '15px';
        msgDiv.style.padding = '10px';
        msgDiv.style.borderRadius = '8px';
        msgDiv.style.border = '1px solid #eee';

        const role = document.createElement('strong');
        role.textContent = msg.role === 'user' ? 'You:' : 'Aman:';
        role.style.display = 'block';
        role.style.marginBottom = '5px';
        
        const text = document.createElement('p');
        text.textContent = msg.text;
        text.style.whiteSpace = 'pre-wrap';
        text.style.margin = '0';

        if (msg.role === 'user') {
            msgDiv.style.backgroundColor = '#FFF9C4';
            msgDiv.style.direction = 'ltr';
            text.style.textAlign = 'left';
        } else {
            msgDiv.style.backgroundColor = '#F1F1F1';
            msgDiv.style.direction = 'rtl';
            text.style.textAlign = 'right';
        }
        
        msgDiv.appendChild(role);
        msgDiv.appendChild(text);
        printContainer.appendChild(msgDiv);
    });

    document.body.appendChild(printContainer);

    try {
        const canvas = await html2canvas(printContainer, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgProps = pdf.getImageProperties(imgData);
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        let heightLeft = pdfHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();

        while (heightLeft > 0) {
            position = heightLeft - pdfHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pdf.internal.pageSize.getHeight();
        }
        
        pdf.save(`Aman-Chat-${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (e) {
        console.error("Error generating PDF", e);
    } finally {
        document.body.removeChild(printContainer);
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
