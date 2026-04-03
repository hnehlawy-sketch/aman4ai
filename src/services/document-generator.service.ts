import { Injectable } from '@angular/core';
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

@Injectable({
  providedIn: 'root'
})
export class DocumentGeneratorService {

  constructor() { }

  async generatePDF(content: string, filename: string, language: string = 'ar'): Promise<Blob> {
    const isRtl = language === 'ar';
    
    // Create a temporary container for HTML rendering
    const container = document.createElement('div');
    container.id = 'pdf-gen-container';
    
    // Styling for the container - make it visible but off-screen
    Object.assign(container.style, {
      position: 'fixed',
      left: '-5000px',
      top: '0',
      width: '800px', // Approx A4 width in pixels
      padding: '40px',
      backgroundColor: 'white',
      color: 'black',
      zIndex: '-9999',
      display: 'block',
      visibility: 'visible',
      opacity: '1'
    });
    
    // Add Google Fonts
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&family=Inter:wght@400;700&display=swap';
    document.head.appendChild(fontLink);

    container.style.fontFamily = isRtl ? '"Cairo", sans-serif' : '"Inter", sans-serif';
    container.style.direction = isRtl ? 'rtl' : 'ltr';
    container.style.textAlign = isRtl ? 'right' : 'left';
    container.style.lineHeight = '1.6';
    
    // Format content
    const safeContent = document.createElement('div');
    safeContent.innerText = content || 'No content provided';
    let htmlContent = safeContent.innerHTML
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    container.innerHTML = `
      <div style="background: white; min-height: 1100px;">
        <h1 style="font-size: 32px; margin-bottom: 30px; border-bottom: 3px solid #3b82f6; padding-bottom: 15px; color: #1e293b;">
          ${filename.split('.')[0]}
        </h1>
        <div style="font-size: 18px; color: #334155; line-height: 1.8;">
          ${htmlContent}
        </div>
        <div style="margin-top: 100px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 14px; color: #94a3b8; text-align: center;">
          تم الإنشاء بواسطة Aman AI - ${new Date().toLocaleDateString('ar-SA')}
        </div>
      </div>
    `;

    document.body.appendChild(container);

    // Wait for fonts and rendering
    try {
      if ((document as any).fonts && (document as any).fonts.ready) {
        await (document as any).fonts.ready;
      }
    } catch (e) {}
    await new Promise(resolve => setTimeout(resolve, 2500));

    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 800,
        height: container.scrollHeight > 1122 ? container.scrollHeight : 1122 // Ensure full height
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add subsequent pages if content is long
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const blob = pdf.output('blob');
      
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
      
      return blob;
    } catch (error) {
      console.error('Error generating PDF:', error);
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
      // Fallback to plain text blob
      return new Blob([content], { type: 'text/plain;charset=utf-8' });
    }
  }

  async generateDocx(content: string, filename: string, language: string = 'ar'): Promise<Blob> {
    const isRtl = language === 'ar';
    
    // Ensure content is a string and not empty
    const textContent = String(content || 'لا يوجد محتوى متاح');
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Title
          new Paragraph({
            alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
            bidirectional: isRtl,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: String(filename || 'document').split('.')[0],
                bold: true,
                size: 48, // 24pt
                font: 'Arial',
              }),
            ],
          }),
          // Body
          ...textContent.split('\n').map(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine) {
              return new Paragraph({ spacing: { before: 120, after: 120 } });
            }
            
            // Basic markdown bold support
            const parts = line.split(/(\*\*.*?\*\*)/g);
            const children = parts.map(part => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return new TextRun({
                  text: part.substring(2, part.length - 2),
                  bold: true,
                  size: 26, // 13pt
                  font: 'Arial',
                });
              }
              return new TextRun({
                text: part,
                size: 26, // 13pt
                font: 'Arial',
              });
            });

            return new Paragraph({
              alignment: isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
              bidirectional: isRtl,
              spacing: { line: 360, before: 80, after: 80 },
              children: children,
            });
          }),
          // Footer
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 1000 },
            children: [
              new TextRun({
                text: `تم الإنشاء بواسطة Aman AI - ${new Date().toLocaleDateString('ar-SA')}`,
                size: 18,
                color: '999999',
                font: 'Arial',
              }),
            ],
          }),
        ],
      }],
    });

    try {
      const blob = await Packer.toBlob(doc);
      if (blob.size === 0) {
        throw new Error('Generated DOCX blob is empty');
      }
      return blob;
    } catch (error) {
      console.error('Error generating DOCX:', error);
      return new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    }
  }

  downloadFile(blob: Blob, filename: string) {
    saveAs(blob, filename);
  }
}
