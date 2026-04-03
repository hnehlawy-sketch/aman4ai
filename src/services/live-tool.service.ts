import { Injectable, inject } from '@angular/core';
import { GeminiService } from './gemini.service';
import { AuthService } from './auth.service';
import { UiService } from './ui.service';

@Injectable({
  providedIn: 'root'
})
export class LiveToolService {
  private geminiService = inject(GeminiService);
  private authService = inject(AuthService);
  private uiService = inject(UiService);

  async handleToolCall(call: any, onVisualContent: (content: any) => void, onHistoryCommit: (role: 'user' | 'model', text: string, images?: any[]) => void) {
    const { name, args, id } = call;
    console.log(`[LiveToolService] Handling tool call: ${name}`, args);
    let intentText = '';
    let isCustomTool = false;
    let toastMessage = '';

    if (name === 'generateImage') {
      intentText = `[طلب توليد صورة: ${args.prompt}]`;
      toastMessage = 'جاري تحضير الصورة...';
      isCustomTool = true;
      
      this.geminiService.sendMessage([{ id: crypto.randomUUID(), role: 'user', text: args.prompt }], this.authService.userPlan(), undefined, {
        generateImage: true,
        modelKey: 'fast',
        uid: this.authService.user()?.uid,
        email: this.authService.user()?.email || ''
      }).subscribe({
        next: async (res) => {
          if (res.images && res.images.length > 0) {
            const rawImageUrl = res.images[0].url;
            const mimeType = res.images[0].mimeType || 'image/png';
            onVisualContent({ type: 'image', data: rawImageUrl });
            
            const user = this.authService.user();
            if (user && rawImageUrl.startsWith('data:')) {
              try {
                const result = await this.authService.processAndUploadImage(user.uid, rawImageUrl, mimeType);
                const finalUrl = result.url || result.localDataUrl || rawImageUrl;
                onVisualContent({ type: 'image', data: finalUrl });
                onHistoryCommit('model', `[تم توليد الصورة: ${args.prompt}]`, [{ url: finalUrl, mimeType }]);
              } catch (e) {
                onHistoryCommit('model', `[تم توليد الصورة: ${args.prompt}]`, [{ url: rawImageUrl, mimeType }]);
              }
            } else {
              onHistoryCommit('model', `[تم توليد الصورة: ${args.prompt}]`, [{ url: rawImageUrl, mimeType }]);
            }
          } else {
            this.uiService.showToast('فشل توليد الصورة', 'error');
          }
        },
        error: (err) => {
          this.uiService.showToast('حدث خطأ أثناء توليد الصورة', 'error');
        }
      });

    } else if (name === 'getUserLocation') {
      intentText = `[طلب معرفة الموقع الحالي]`;
      toastMessage = 'جاري تحديد الموقع...';
      isCustomTool = true;

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          onVisualContent({ type: 'map', data: { lat, lng, label: 'موقعك الحالي' } });
          onHistoryCommit('model', `[تم تحديد الموقع: ${lat}, ${lng}]`);
        });
      }

    } else if (name === 'searchLocation') {
      intentText = `[طلب البحث عن موقع: ${args.query}]`;
      toastMessage = `جاري البحث عن ${args.query}...`;
      isCustomTool = true;

      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(args.query)}`);
        const data = await response.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          const label = data[0].display_name.split(',')[0];
          onVisualContent({ type: 'map', data: { lat, lng, label } });
          onHistoryCommit('model', `[تم العثور على الموقع: ${label}]`);
        }
      } catch (e) {}

    } else if (name === 'getDirections') {
      intentText = `[طلب البحث عن مسار من ${args.originQuery} إلى ${args.destinationQuery}]`;
      toastMessage = `جاري البحث عن المسار...`;
      isCustomTool = true;

      try {
        let originLat, originLng, originLabel;
        if (args.originQuery.toLowerCase().includes('current') || args.originQuery.includes('حالي') || args.originQuery.includes('موقعي')) {
           const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
             navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, enableHighAccuracy: true });
           });
           originLat = pos.coords.latitude;
           originLng = pos.coords.longitude;
           originLabel = 'موقعك الحالي';
        } else {
           const res1 = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(args.originQuery)}`);
           const data1 = await res1.json();
           if (data1 && data1.length > 0) {
             originLat = parseFloat(data1[0].lat);
             originLng = parseFloat(data1[0].lon);
             originLabel = data1[0].display_name.split(',')[0];
           } else {
             throw new Error(`Origin not found: ${args.originQuery}`);
           }
        }

        const res2 = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(args.destinationQuery)}`);
        const data2 = await res2.json();
        let destLat, destLng, destLabel;
        if (data2 && data2.length > 0) {
           destLat = parseFloat(data2[0].lat);
           destLng = parseFloat(data2[0].lon);
           destLabel = data2[0].display_name.split(',')[0];
        } else {
           throw new Error(`Destination not found: ${args.destinationQuery}`);
        }

        let distanceText = '';
        let durationText = '';
        try {
           const osrmRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false`);
           const osrmData = await osrmRes.json();
           if (osrmData && osrmData.routes && osrmData.routes.length > 0) {
              const distanceKm = (osrmData.routes[0].distance / 1000).toFixed(1);
              const durationMin = Math.round(osrmData.routes[0].duration / 60);
              distanceText = `${distanceKm} كم`;
              durationText = `${durationMin} دقيقة`;
           }
        } catch (e) {
           console.error('Failed to fetch route distance', e);
        }

        onVisualContent({ 
          type: 'route', 
          data: { 
            origin: { lat: originLat, lng: originLng, label: originLabel },
            destination: { lat: destLat, lng: destLng, label: destLabel },
            distance: distanceText,
            duration: durationText
          } 
        });
        onHistoryCommit('model', `[تم العثور على المسار من ${originLabel} إلى ${destLabel}: ${distanceText} (${durationText})]`);
      } catch (e) {
        this.uiService.showToast('فشل البحث عن المسار', 'error');
      }

    } else if (name === 'googleSearch') {
      intentText = `[طلب بحث في الويب]`;
    }

    if (intentText) {
      onHistoryCommit('model', intentText);
    }

    if (isCustomTool) {
      this.geminiService.sendLiveToolResponse(id, { success: true });
      if (toastMessage) {
        this.uiService.showToast(toastMessage, 'info');
      }
    }
  }
}
