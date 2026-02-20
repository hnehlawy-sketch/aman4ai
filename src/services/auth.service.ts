import { Injectable, signal } from '@angular/core';
import { UserProfile, PaymentRequest } from '../models';

// Use a simpler, more standard import for Firebase compat.
import firebase from 'firebase/compat/app';
// Import other services for their side-effects (they augment the main firebase object).
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';


const firebaseConfig = {
  apiKey: "AIzaSyBHuDsfjLV-F8LxPzk_BZ30Fc2vl3M_fqg",
  authDomain: "studio-772832865-33905.firebaseapp.com",
  projectId: "studio-772832865-33905",
  storageBucket: "studio-772832865-33905.appspot.com",
  messagingSenderId: "585654670642",
  appId: "1:585654670642:web:fd0b505485b03042e0332b"
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Update types to use the imported `firebase` object.
  private app: firebase.app.App;
  public auth: firebase.auth.Auth;
  public db: firebase.firestore.Firestore;
  public storage: firebase.storage.Storage;

  user = signal<firebase.User | null>(null);
  isPremium = signal<boolean>(false);
  isAdmin = signal<boolean>(false);
  isLoading = signal<boolean>(true);
  
  constructor() {
    // 1. Initialize Firebase App
    if (!firebase.apps.length) {
      this.app = firebase.initializeApp(firebaseConfig);
    } else {
      this.app = firebase.app(); // Get default app
    }

    // 2. Initialize Auth, Firestore & Storage
    this.auth = firebase.auth();
    this.db = firebase.firestore();
    this.storage = firebase.storage();

    // 3. Set up Auth Listener
    this.auth.onAuthStateChanged(async (user) => {
      this.user.set(user);
      if (user) {
        await this.syncUserToDB(user);
      } else {
        this.isPremium.set(false);
        this.isAdmin.set(false);
      }
      this.isLoading.set(false);
    });
  }

  // --- Email/Password Login ---
  async login(email: string, pass: string) {
    try {
      await this.auth.signInWithEmailAndPassword(email, pass);
    } catch (e: any) {
      console.error('Login failed', e);
      throw e;
    }
  }

  // --- Google Login ---
  async loginWithGoogle() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await this.auth.signInWithPopup(provider);
      // User sync happens in onAuthStateChanged
    } catch (e: any) {
      console.error('Google Login failed', e);
      throw e;
    }
  }

  // --- Sign Up with Name & Verification ---
  async signup(name: string, email: string, pass: string) {
    try {
      // 1. Create User
      const credential = await this.auth.createUserWithEmailAndPassword(email, pass);
      const user = credential.user;
      if (!user) {
        throw new Error('User creation failed.');
      }

      // 2. Update Profile with Name
      await user.updateProfile({ displayName: name });

      // 3. Send Verification Email
      await user.sendEmailVerification();

      // 4. Force sync
      await this.syncUserToDB(user, name);

      // Force update local signal
      this.user.set(Object.assign({}, user)); 
    } catch (e: any) {
      console.error('Signup failed', e);
      throw e;
    }
  }

  async logout() {
    await this.auth.signOut();
    this.isPremium.set(false);
  }

  // --- Database Operations ---

  // Update type for the user parameter
  private async syncUserToDB(user: firebase.User, displayNameOverride?: string) {
    try {
      const uid = user.uid;
      const docRef = this.db.collection('users').doc(uid);
      const docSnap = await docRef.get();
      
      let isPremium = false;
      let isAdmin = false;
      
      if (docSnap.exists) {
        const data = docSnap.data();
        isPremium = data?.['isPremium'] || false;
        isAdmin = data?.['isAdmin'] || false;
        // Update last login
        await docRef.set({ 
          lastLogin: new Date().toISOString(),
          email: user.email,
          displayName: displayNameOverride || user.displayName || 'User',
          photoURL: user.photoURL || null
        }, { merge: true });
      } else {
        // Create new record
        await docRef.set({ 
          uid: uid,
          email: user.email,
          displayName: displayNameOverride || user.displayName || 'User',
          photoURL: user.photoURL || null,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          isPremium: false,
          isAdmin: false, // Default to false
          dailyUsage: 0,
          usageDate: new Date().toDateString()
        });
      }
      
      this.isPremium.set(isPremium);
      this.isAdmin.set(isAdmin);

    } catch (e) {
      console.error('Error syncing user to DB', e);
    }
  }

  async saveUserProfile(uid: string, profile: UserProfile) {
    try {
      const userRef = this.db.collection('users').doc(uid);
      await userRef.set({ profile }, { merge: true });
    } catch (e) {
      console.error('Failed to save user profile:', e);
      throw new Error('Could not save profile.');
    }
  }

  async loadUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const userRef = this.db.collection('users').doc(uid);
      const docSnap = await userRef.get();
      if (docSnap.exists) {
        const data = docSnap.data();
        return data?.profile as UserProfile || null;
      }
      return null;
    } catch (e) {
      console.error('Failed to load user profile:', e);
      return null;
    }
  }

  // --- Limit Checking ---
  async checkAndIncrementUsage(estimatedTokens: number): Promise<boolean> {
    if (this.isPremium()) return true; // Gold Account has no limits

    const user = this.user();
    if (!user) return false;

    const userRef = this.db.collection('users').doc(user.uid);
    const snap = await userRef.get();

    if (!snap.exists) return false;

    const data = snap.data();
    if (!data) return false;

    const today = new Date().toDateString();
    
    // Check if we need to reset
    let currentUsage = data['dailyUsage'] || 0;
    const lastUsageDate = data['usageDate'] || '';

    if (lastUsageDate !== today) {
      currentUsage = 0; // Reset for new day
    }

    const DAILY_LIMIT = 20000; // Roughly 20k chars/tokens per day for standard users

    if (currentUsage + estimatedTokens > DAILY_LIMIT) {
      return false; // Limit exceeded
    }

    // Increment and update date
    await userRef.set({
      dailyUsage: currentUsage + estimatedTokens,
      usageDate: today
    }, { merge: true });

    return true;
  }

  async submitPaymentRequest(transactionId: string) {
    const user = this.user();
    if (!user) throw new Error('User not logged in');

    const request: PaymentRequest = {
      uid: user.uid,
      email: user.email || '',
      transactionId: transactionId,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    await this.db.collection('payment_requests').add(request);
  }

  async getPendingPayments(): Promise<PaymentRequest[]> {
    const snap = await this.db.collection('payment_requests')
      .where('status', '==', 'pending')
      .get();
    
    const requests = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentRequest));
    
    // Sort in-memory to avoid Firestore composite index requirement
    return requests.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  async approvePayment(request: PaymentRequest) {
    if (!request.id) return;

    const batch = this.db.batch();
    
    // 1. Update request status
    const requestRef = this.db.collection('payment_requests').doc(request.id);
    batch.update(requestRef, { status: 'approved' });

    // 2. Update user premium status
    const userRef = this.db.collection('users').doc(request.uid);
    batch.update(userRef, { isPremium: true });

    await batch.commit();
  }

  async rejectPayment(requestId: string) {
    await this.db.collection('payment_requests').doc(requestId).update({ status: 'rejected' });
  }

  // --- Advanced Admin Methods ---
  async getAllUsers(): Promise<any[]> {
    const snap = await this.db.collection('users').get();
    const users = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    
    // Sort in-memory by createdAt
    return users.sort((a: any, b: any) => {
      const dateA = a.createdAt || '';
      const dateB = b.createdAt || '';
      return dateB.localeCompare(dateA);
    });
  }

  async updateUserStatus(uid: string, updates: { isPremium?: boolean, isAdmin?: boolean }) {
    await this.db.collection('users').doc(uid).update(updates);
  }

  async getSystemSettings(): Promise<any> {
    const doc = await this.db.collection('system_settings').doc('global').get();
    return doc.exists ? doc.data() : { qrCodeUrl: '' };
  }

  async updateQrCode(url: string) {
    await this.db.collection('system_settings').doc('global').set({ qrCodeUrl: url }, { merge: true });
  }

  async uploadQrCode(file: File): Promise<string> {
    const ref = this.storage.ref(`system/qr_code_${Date.now()}`);
    await ref.put(file);
    return await ref.getDownloadURL();
  }

  // --- Storage Helpers ---
  async uploadGeneratedImage(uid: string, dataUrl: string, mimeType?: string): Promise<string | null> {
    try {
      const safeUrl = dataUrl.startsWith('data:')
        ? dataUrl
        : `data:${mimeType || 'image/png'};base64,${dataUrl}`;

      const prepared = await this.prepareImageForUpload(safeUrl);
      if (!prepared) return null;

      const { blob, ext } = prepared;
      const fileRef = this.storage.ref(`users/${uid}/generated/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);

      await fileRef.put(blob, { contentType: blob.type });
      return await fileRef.getDownloadURL();
    } catch (e) {
      console.error('Failed to upload generated image', e);
      return null;
    }
  }

  private async prepareImageForUpload(dataUrl: string): Promise<{ blob: Blob; ext: string } | null> {
    try {
      const baseImage = await this.loadImage(dataUrl);
      const watermark = await this.loadImage(this.getWatermarkSvgDataUrl());

      const maxSize = 1536;
      const iw = baseImage.naturalWidth || baseImage.width;
      const ih = baseImage.naturalHeight || baseImage.height;
      const scale = Math.min(1, maxSize / Math.max(iw, ih));
      const w = Math.round(iw * scale);
      const h = Math.round(ih * scale);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.drawImage(baseImage, 0, 0, w, h);

      const padding = Math.max(12, Math.round(w * 0.02));
      const targetW = Math.max(90, Math.round(w * 0.18));
      const ratio = (watermark.naturalWidth || watermark.width) / (watermark.naturalHeight || watermark.height);
      const targetH = Math.round(targetW / ratio);

      ctx.globalAlpha = 0.6;
      ctx.drawImage(watermark, w - targetW - padding, h - targetH - padding, targetW, targetH);
      ctx.globalAlpha = 1;

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
      if (!blob) return null;

      return { blob, ext: 'jpg' };
    } catch (e) {
      console.error('Failed to prepare image for upload', e);
      return null;
    }
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  private getWatermarkSvgDataUrl(): string {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="72" viewBox="0 0 220 72">' +
      '<g transform="translate(0,8) scale(2.2)" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"/>' +
      '</g>' +
      '<text x="70" y="46" fill="#fff" font-size="28" font-family="Arial, sans-serif" font-weight="700">Aman</text>' +
      '</svg>';
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }
}
