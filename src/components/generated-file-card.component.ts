import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage } from '../services/gemini.service';
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import html2pdf from 'html2pdf.js';
import { marked } from 'marked';

@Component({
  selector: 'app-generated-file-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './generated-file-card.component.html'
})
export class GeneratedFileCardComponent {
  file = input.required<NonNullable<ChatMessage['generatedFile']>>();

  async downloadGeneratedFile() {
    const file = this.file();
    const isArabic = (text: string) => /[\u0600-\u06FF]/.test(text);
    
    if (file.type === 'docx') {
      const paragraphs = file.content.split('\n').map(line => {
        const lineIsRtl = isArabic(line);
        return new Paragraph({
          children: [new TextRun({ text: line, rightToLeft: lineIsRtl })],
          alignment: lineIsRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
          bidirectional: lineIsRtl
        });
      });

      const doc = new Document({
        sections: [{
          properties: {},
          children: paragraphs
        }],
      });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${file.filename}.docx`);
    } else if (file.type === 'pdf') {
      const isRtl = isArabic(file.content);
      const direction = isRtl ? 'rtl' : 'ltr';
      const textAlign = isRtl ? 'right' : 'left';
      
      const htmlContent = await marked.parse(file.content);
      const element = document.createElement('div');
      element.innerHTML = `
        <div style="font-family: 'Arial', sans-serif; padding: 40px; direction: ${direction}; text-align: ${textAlign};">
          <div style="line-height: 1.6; font-size: 14px; color: #444;">
            ${htmlContent}
          </div>
        </div>
      `;
      
      await html2pdf().from(element).set({
        margin: 10,
        filename: `${file.filename}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).save();
    } else { // txt
      const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, `${file.filename}.txt`);
    }
  }
}
