import { Injectable } from '@angular/core';
import { saveAs } from 'file-saver';

@Injectable({ providedIn: 'root' })
export class ImageService {

  downloadImage(imageUrl: string, filename: string = 'aman-ai-image.png') {
    console.log('[ImageService] Downloading image:', imageUrl.substring(0, 50) + '...');
    
    // Create a temporary anchor element to trigger the download
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    link.target = '_blank'; // Some browsers require this for cross-origin downloads
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async shareImage(imageUrl: string, title: string = 'Aman AI Image') {
    if (!navigator.share) {
      this.downloadImage(imageUrl);
      return;
    }
    
    try {
      if (imageUrl.startsWith('data:')) {
        const blob = this.dataUrlToBlob(imageUrl);
        const file = new File([blob], 'image.png', { type: blob.type || 'image/png' });
        await navigator.share({ files: [file], title: title });
      } else {
        await navigator.share({ title: title, url: imageUrl });
      }
    } catch (error) {
      console.error('[ImageService] Failed to share image:', error);
      this.downloadImage(imageUrl);
    }
  }

  private dataUrlToBlob(dataUrl: string): Blob {
    const parts = dataUrl.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }
}
