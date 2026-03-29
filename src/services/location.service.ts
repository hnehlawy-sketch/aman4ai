import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class LocationService {
  private authService = inject(AuthService);

  async getCurrentLocation(): Promise<{ lat: number, lng: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  }

  async searchLocation(query: string): Promise<{ lat: number, lng: number, label: string }> {
    const apiKey = this.authService.systemSettings()?.mapsApiKey;
    let lat, lng, label;

    if (apiKey) {
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`);
      const data = await res.json();
      if (data.status === 'OK' && data.results.length > 0) {
        lat = data.results[0].geometry.location.lat;
        lng = data.results[0].geometry.location.lng;
        label = data.results[0].formatted_address.split(',')[0];
        return { lat, lng, label };
      }
    }

    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'AmanAI-App/1.0' }
    });
    const data = await response.json();
    if (data && data.length > 0) {
      lat = parseFloat(data[0].lat);
      lng = parseFloat(data[0].lon);
      label = data[0].display_name.split(',')[0];
      return { lat, lng, label };
    }

    throw new Error('Location not found');
  }

  async getDirections(origin: string, dest: string): Promise<any> {
    const apiKey = this.authService.systemSettings()?.mapsApiKey;
    
    let originLat, originLng, originLabel;
    if (origin.toLowerCase().includes('current') || origin.includes('حالي') || origin.includes('موقعي')) {
      const pos = await this.getCurrentLocation();
      originLat = pos.lat;
      originLng = pos.lng;
      originLabel = 'موقعك الحالي';
    } else {
      const originData = await this.searchLocation(origin);
      originLat = originData.lat;
      originLng = originData.lng;
      originLabel = originData.label;
    }

    const destData = await this.searchLocation(dest);
    const destLat = destData.lat;
    const destLng = destData.lng;
    const destLabel = destData.label;

    let distanceText = '';
    let durationText = '';
    try {
      const osrmRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false`, {
        headers: { 'User-Agent': 'AmanAI-App/1.0' }
      });
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

    return {
      origin: { lat: originLat, lng: originLng, label: originLabel },
      destination: { lat: destLat, lng: destLng, label: destLabel },
      distance: distanceText,
      duration: durationText
    };
  }
}
