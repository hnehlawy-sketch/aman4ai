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
      
      // Download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Watermark download failed:', error);
      // Fallback
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
      // 1. Try sharing watermarked image
      const canvas = await this.prepareWatermarkedCanvas(imageUrl);
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
           throw new Error('Blob creation failed');
        }
        
        const file = new File([blob], 'image.png', { type: 'image/png' });
        try {
          await navigator.share({
            files: [file],
            title: title
          });
        } catch (shareError) {
          console.error('Share API failed (Watermarked):', shareError);
        }
      }, 'image/png');

    } catch (error) {
      console.warn('Watermarked share failed, trying original image...', error);
      
      try {
        // 2. Try sharing original image (if watermark fails, e.g. Tainted Canvas)
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], 'image.png', { type: blob.type });
        await navigator.share({
          files: [file],
          title: title
        });
      } catch (fetchError) {
         console.warn('Original image share failed, sharing URL instead...', fetchError);
         
         try {
             // 3. Try sharing just the URL
             await navigator.share({
                 title: title,
                 url: imageUrl
             });
         } catch (urlShareError) {
             console.error('URL share failed:', urlShareError);
             // 4. Final Fallback: Download
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
    const padding = 16 * scale;
    const fontSize = 20 * scale;
    const iconSize = 32 * scale;
    
    const text = 'Aman';
    ctx.font = `bold ${fontSize}px sans-serif`;
    const textMetrics = ctx.measureText(text);
    
    // Calculate Box Dimensions
    const contentWidth = Math.max(iconSize, textMetrics.width);
    const contentHeight = iconSize + fontSize + (padding * 0.5);
    
    const boxWidth = contentWidth + (padding * 2.5);
    const boxHeight = contentHeight + (padding * 2);
    
    const x = width - boxWidth - padding;
    const y = height - boxHeight - padding;
    const radius = 16 * scale;

    // Glassmorphism Background
    ctx.save();
    this.roundRect(ctx, x, y, boxWidth, boxHeight, radius);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; // Darker glass for better contrast
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1 * scale;
    ctx.stroke();
    ctx.restore();
    
    const centerX = x + (boxWidth / 2);
    
    // --- Draw Shield Icon ---
    ctx.save();
    const iconY = y + padding + (iconSize / 2);
    ctx.translate(centerX, iconY);
    const iconScale = scale * 1.5;
    ctx.scale(iconScale, iconScale);
    ctx.translate(-12, -12); // Center the path (24x24 viewbox)

    // Shield Body (Standard Shield Shape)
    ctx.beginPath();
    ctx.moveTo(12, 22);
    ctx.bezierCurveTo(20, 18, 20, 12, 20, 5);
    ctx.lineTo(12, 2);
    ctx.lineTo(4, 5);
    ctx.bezierCurveTo(4, 12, 4, 18, 12, 22);
    ctx.closePath();
    ctx.fillStyle = 'white';
    ctx.fill();

    // Checkmark (Clearer)
    ctx.beginPath();
    ctx.moveTo(9, 12);
    ctx.lineTo(11, 14);
    ctx.lineTo(15, 10);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#3b82f6'; // Blue
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();

    // --- Draw Text ---
    ctx.save();
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText(text, centerX, y + boxHeight - padding);
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
