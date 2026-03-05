import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ImageService {

  private async prepareWatermarkedCanvas(imageUrl: string): Promise<HTMLCanvasElement> {
    const img = await this.loadImage(imageUrl);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    // Draw Image
    ctx.drawImage(img, 0, 0);

    // Draw Watermark (Bottom Right)
    this.drawWatermark(ctx, canvas.width, canvas.height);
    
    return canvas;
  }

  async downloadImageWithWatermark(imageUrl: string, filename: string = 'aman-ai-image.png') {
    try {
      const canvas = await this.prepareWatermarkedCanvas(imageUrl);
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Watermark download failed:', error);
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = filename;
      link.target = '_blank';
      link.click();
    }
  }

  async shareImage(imageUrl: string, title: string = 'Aman AI Image') {
    if (!navigator.share) {
      this.downloadImageWithWatermark(imageUrl);
      return;
    }
    try {
      const canvas = await this.prepareWatermarkedCanvas(imageUrl);
      canvas.toBlob(async (blob) => {
        if (!blob) throw new Error('Blob creation failed');
        const file = new File([blob], 'image.png', { type: 'image/png' });
        try {
          await navigator.share({ files: [file], title: title });
        } catch (shareError) {
          console.error('Share API failed (Watermarked):', shareError);
        }
      }, 'image/png');
    } catch (error) {
      console.warn('Watermarked share failed, trying original image...', error);
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], 'image.png', { type: blob.type });
        await navigator.share({ files: [file], title: title });
      } catch (fetchError) {
         try {
             await navigator.share({ title: title, url: imageUrl });
         } catch (urlShareError) {
             this.downloadImageWithWatermark(imageUrl);
         }
      }
    }
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = url;
    });
  }

  private drawWatermark(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const scale = Math.max(width, height) / 1000;
    const padding = 20 * scale;
    const logoSize = 40 * scale;
    
    const x = width - logoSize - padding - 60 * scale; // Adjust for text
    const y = height - logoSize - padding;

    // Glassmorphism Background
    ctx.save();
    ctx.beginPath();
    this.roundRect(ctx, x - 10 * scale, y - 10 * scale, logoSize + 80 * scale, logoSize + 20 * scale, 12 * scale);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1 * scale;
    ctx.stroke();
    ctx.restore();

    // Draw Logo (Stylized 'A' in Shield)
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale * 1.6, scale * 1.6);
    
    // Shield
    ctx.beginPath();
    ctx.moveTo(12, 22);
    ctx.bezierCurveTo(20, 18, 20, 12, 20, 5);
    ctx.lineTo(12, 2);
    ctx.lineTo(4, 5);
    ctx.bezierCurveTo(4, 12, 4, 18, 12, 22);
    ctx.fillStyle = '#3b82f6'; // Aman Blue
    ctx.fill();
    
    // Letter 'A'
    ctx.font = 'bold 12px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('A', 12, 12);
    ctx.restore();

    // Text "Aman AI"
    ctx.save();
    ctx.fillStyle = 'white';
    ctx.font = `bold ${18 * scale}px sans-serif`;
    ctx.fillText('Aman AI', x + logoSize + 5 * scale, y + logoSize / 2 + 6 * scale);
    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}
