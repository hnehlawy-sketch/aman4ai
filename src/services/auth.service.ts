import { Injectable, signal, inject, computed } from '@angular/core';
import { UserProfile, PaymentRequest, SystemSettings, OperationType, FirestoreErrorInfo } from '../models';
import { StorageService } from './storage.service';

// Use a simpler, more standard import for Firebase compat.
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithRedirect, createUserWithEmailAndPassword, updateProfile, sendEmailVerification, signOut, updateEmail, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, limit, getDocs, getDocsFromServer, getDocFromServer, writeBatch, addDoc, where, query, updateDoc, deleteDoc, enableMultiTabIndexedDbPersistence, orderBy, deleteField, initializeFirestore } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { User } from 'firebase/auth';


import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase once at module level
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
// Use the database ID from config, defaulting to '(default)' if not specified
const dbId = (firebaseConfig as any).firestoreDatabaseId || '(default)';

// Initialize Firestore with long polling to bypass potential proxy/iframe streaming issues
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, dbId);

const storage = getStorage(app);

// Enable persistence for better offline experience - handle errors gracefully
// In some environments (like iframes), persistence might fail or be unavailable
if (typeof window !== 'undefined' && window.indexedDB) {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence failed: multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence failed: browser not supported');
    } else {
      console.warn('Firestore persistence failed:', err.message);
    }
  });
}

import { DataLoggingService } from './data-logging.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private app = app; // FirebaseApp
  public auth = auth; // Auth
  public db = db; // Firestore
  public storage = storage; // FirebaseStorage
  private logger = inject(DataLoggingService);

  user = signal<User | null>(null);
  userProfile = signal<UserProfile | null>(null);
  isPremium = signal<boolean>(false);
  userPlan = signal<'free' | 'pro' | 'premium'>('free');
  isEmailVerified = signal<boolean>(false);
  isLoading = signal<boolean>(true);
  dailyUsage = signal<number>(0);
  dailyLimit = signal<number>(60000);
  systemSettings = signal<SystemSettings | null>(null);
  pricing = signal<any>(null);
  
  isFirestoreAvailable = signal<boolean>(true);
  
  private storageService = inject(StorageService);

  constructor() {
    // 1. Test connection
    this.testConnection();

    // 2. Set up Auth Listener
    onAuthStateChanged(this.auth, async (user) => {
      this.user.set(user);
      if (user) {
        this.isEmailVerified.set(user.emailVerified);
        try {
          await this.syncUserToDB(user);
        } catch (e) {
          console.warn('Initial sync failed, will retry on next action', e);
        }
      } else {
        this.isPremium.set(false);
        this.isEmailVerified.set(false);
        // Clear local storage when user logs out to prevent cross-user data leakage
        this.storageService.clearAllSessions().catch(err => console.error('Failed to clear sessions on logout', err));
      }
      this.isLoading.set(false);
    });

    // 3. Load System Settings and Pricing immediately (for guests too)
    this.initBaseSettings();
  }

  private async initBaseSettings() {
    console.log('[AuthService] Starting base settings initialization...');
    try {
      // Use Promise.allSettled to ensure one failure doesn't block the other
      const results = await Promise.allSettled([
        this.loadSystemSettings(),
        this.getPricing().then(p => {
          console.log('[AuthService] Pricing fetched successfully:', !!p);
          this.pricing.set(p);
        })
      ]);
      
      results.forEach((res, idx) => {
        if (res.status === 'rejected') {
          console.error(`[AuthService] Initialization task ${idx} failed:`, res.reason);
        }
      });
      
      console.log('[AuthService] Base settings initialization completed');
    } catch (e) {
      console.error('[AuthService] Critical failure in initBaseSettings:', e);
    }
  }

  private async testConnection() {
    try {
      await getDoc(doc(this.db, 'test', 'connection'));
      console.log('[AuthService] Firestore connection test successful');
      this.isFirestoreAvailable.set(true);
    } catch (error: any) {
      if (error.message?.includes('the client is offline') || error.code === 'unavailable' || error.code === 'failed-precondition') {
        console.error("[AuthService] Firestore connection failed: client is offline or service unavailable.");
        this.isFirestoreAvailable.set(false);
      } else {
        // Other errors (like permission denied) might still mean the service is reachable
        this.isFirestoreAvailable.set(true);
      }
    }
  }

  // --- Email/Password Login ---
  async login(email: string, pass: string) {
    try {
      console.log(`[AuthService] Attempting login for email: ${email}`);
      const credential = await signInWithEmailAndPassword(this.auth, email, pass);
      console.log(`[AuthService] Login successful for uid: ${credential.user.uid}`);
      await this.logger.logAuth(credential.user.uid, email, 'login');
    } catch (e: any) {
      console.error('[AuthService] Login failed:', e.code, e.message);
      throw e;
    }
  }

  // --- Google Login ---
  async loginWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      try {
        const credential = await signInWithPopup(this.auth, provider);
        if (credential.user) {
          await this.logger.logAuth(credential.user.uid, credential.user.email || '', 'login', { method: 'google' });
        }
      } catch (popupError: any) {
        console.warn('Popup login failed, trying redirect...', popupError);
        if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/popup-closed-by-user' || popupError.code === 'auth/cancelled-popup-request') {
           await signInWithRedirect(this.auth, provider);
        } else {
           throw popupError;
        }
      }
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
      const credential = await createUserWithEmailAndPassword(this.auth, email, pass);
      const user = credential.user;
      if (!user) {
        throw new Error('User creation failed.');
      }

      // 2. Update Profile with Name
      await updateProfile(user, { displayName: name });

      // 3. Send Verification Email
      await sendEmailVerification(user);

      // 4. Force sync
      await this.syncUserToDB(user, name);

      // 5. Log Signup
      await this.logger.logAuth(user.uid, email, 'signup');

      // Force update local signal
      this.user.set(Object.assign({}, user)); 
    } catch (e: any) {
      console.error('Signup failed', e);
      throw e;
    }
  }

  async logout() {
    const user = this.user();
    if (user) {
      await this.logger.logAuth(user.uid, user.email || '', 'logout');
    }
    // Clear local storage before signing out
    await this.storageService.clearAllSessions().catch(err => console.error('Failed to clear sessions during logout', err));
    await signOut(this.auth);
    
    // Reset user status
    this.isPremium.set(false);
    this.userPlan.set('free');
  }

  async resetPassword(email: string) {
    try {
      await sendPasswordResetEmail(this.auth, email);
    } catch (e) {
      console.error('Password reset failed', e);
      throw e;
    }
  }

  async updateUserEmail(newEmail: string) {
    const user = this.auth.currentUser;
    if (!user) throw new Error('User not logged in');
    
    try {
      await updateEmail(user, newEmail);
      await updateDoc(doc(this.db, 'users', user.uid), { email: newEmail });
    } catch (error) {
      this.handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  }

  async updateUserMobile(mobile: string) {
    const user = this.auth.currentUser;
    if (!user) throw new Error('User not logged in');

    try {
      await updateDoc(doc(this.db, 'users', user.uid), { mobile: mobile });
    } catch (error) {
      this.handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  }

  async updateUserPhoto(file: File) {
    const user = this.auth.currentUser;
    if (!user) throw new Error('User not logged in');

    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve) => {
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });

    const { url } = await this.processAndUploadImage(user.uid, dataUrl, file.type, false);
    
    if (url) {
      await updateProfile(user, { photoURL: url });
      await updateDoc(doc(this.db, 'users', user.uid), { photoURL: url });
      // Force update user signal to reflect new photo immediately
      this.user.set({ ...user, photoURL: url } as any);
    }
  }

  async getUserMobile(uid: string): Promise<string> {
    const snap = await getDoc(doc(this.db, 'users', uid));
    return snap.exists() ? snap.data()['mobile'] || '' : '';
  }

  // --- Database Operations ---

  private async syncUserToDB(user: User, displayNameOverride?: string) {
    try {
      const uid = user.uid;
      const docRef = doc(this.db, 'users', uid);
      
      console.log(`[AuthService] Syncing user ${uid} (${user.email}).`);

      let docSnap;
      try {
        docSnap = await getDoc(docRef);
      } catch (e: any) {
        console.error('[AuthService] Firestore getDoc failed:', e.message);
        return;
      }
      
      let isPremium = false;
      let plan: 'free' | 'pro' | 'premium' = 'free';
      
      if (docSnap && docSnap.exists()) {
        const data = docSnap.data();
        isPremium = data?.['isPremium'] || false;
        plan = data?.['plan'] || (isPremium ? 'premium' : 'free');
        
        console.log(`[AuthService] User exists in DB. Premium: ${isPremium}, Plan: ${plan}`);

        // Update last login and profile info
        setDoc(docRef, { 
          lastLogin: new Date().toISOString(),
          email: user.email,
          displayName: displayNameOverride || user.displayName || data?.['displayName'] || 'User',
          photoURL: user.photoURL || data?.['photoURL'] || null
        }, { merge: true }).catch(err => console.warn('Failed to update last login:', err.message));
      } else {
        // Create new record
        console.log('[AuthService] Creating new user record');
        try {
          plan = 'free';

          await setDoc(docRef, { 
            uid: uid,
            email: user.email,
            displayName: displayNameOverride || user.displayName || 'User',
            photoURL: user.photoURL || null,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            isPremium: false,
            plan: plan,
            dailyUsage: 0,
            usageDate: new Date().toDateString()
          });
          isPremium = false;
          this.dailyUsage.set(0);
          console.log(`[AuthService] New user record created. Premium: ${isPremium}`);
        } catch (e: any) {
          console.error('[AuthService] Failed to create user record:', e.message);
        }
      }
      
      this.isPremium.set(isPremium);
      this.userPlan.set(plan);
      
      // Set daily usage if available
      if (docSnap && docSnap.exists()) {
        const data = docSnap.data();
        const plan = data?.['plan'] || 'free';
        const customLimit = data?.['customDailyLimit'];
        const settings = this.systemSettings();
        const defaultLimit = plan === 'pro' ? (settings?.limits.pro || 200000) : (settings?.limits.free || 60000);
        const limit = customLimit || defaultLimit;
        this.dailyLimit.set(limit);
        
        const today = new Date().toDateString();
        const lastUsageDate = data?.['usageDate'] || '';
        if (lastUsageDate === today) {
          this.dailyUsage.set(data?.['dailyUsage'] || 0);
        } else {
          this.dailyUsage.set(0);
        }
      }

      // Load Profile
      const profile = await this.loadUserProfile(uid);
      this.userProfile.set(profile);

      // Load System Settings
      await this.loadSystemSettings();

    } catch (e) {
      console.error('[AuthService] Error in syncUserToDB:', e);
    }
  }

  async saveUserProfile(uid: string, profile: UserProfile) {
    try {
      const userRef = doc(this.db, 'users', uid);
      await setDoc(userRef, { profile }, { merge: true });
      this.userProfile.set(profile);
    } catch (e) {
      console.error('Failed to save user profile:', e);
      throw new Error('Could not save profile.');
    }
  }

  async loadUserProfile(uid: string): Promise<UserProfile> {
    try {
      const userRef = doc(this.db, 'users', uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data?.['profile']) {
          return data['profile'] as UserProfile;
        } else if (data?.['prefs']) {
          // Fallback to old prefs format
          return {
            name: data['displayName'] || '',
            dob: '',
            education: 'unspecified',
            maritalStatus: 'unspecified',
            instructions: (data['prefs']?.about || '') + '\n' + (data['prefs']?.focus || ''),
            voiceName: 'Puck'
          };
        }
      }
      return { name: '', dob: '', education: 'unspecified', maritalStatus: 'unspecified', instructions: '' };
    } catch (e) {
      console.warn('Failed to load user profile (offline?):', e);
      // Return a default profile if offline or error occurs
      return { name: '', dob: '', education: 'unspecified', maritalStatus: 'unspecified', instructions: '' };
    }
  }

  // --- Limit Checking ---
  async checkAndIncrementUsage(estimatedTokens: number): Promise<boolean> {
    // 1. Fast check using signals
    if (this.isPremium()) return true;

    const currentUsage = this.dailyUsage();
    const limit = this.dailyLimit();

    if (currentUsage + estimatedTokens > limit) {
      return false; // Limit exceeded based on local state
    }

    // 2. Optimistic update
    const newUsage = currentUsage + estimatedTokens;
    this.dailyUsage.set(newUsage);

    // 3. Async Firestore update (don't await this to keep chat fast)
    const user = this.user();
    if (user) {
      const userRef = doc(this.db, 'users', user.uid);
      const today = new Date().toDateString();
      
      setDoc(userRef, {
        dailyUsage: newUsage,
        usageDate: today
      }, { merge: true }).catch(err => {
        console.warn('Failed to update usage in Firestore:', err.message);
        // If Firestore update fails, we might want to revert or handle it, 
        // but for now, we prioritize chat speed.
      });
    }

    return true;
  }

  async submitPaymentRequest(transactionId: string, receiptUrl?: string, planRequested: string = 'premium') {
    const user = this.user();
    if (!user) throw new Error('User not logged in');

    const request: PaymentRequest = {
      uid: user.uid,
      email: user.email || '',
      transactionId: transactionId,
      timestamp: new Date().toISOString(),
      status: 'pending',
      planRequested: planRequested
    };
    
    if (receiptUrl) {
      request.receiptUrl = receiptUrl;
    }

    await addDoc(collection(this.db, 'payment_requests'), request);
  }

  async forceSync() {
    await this.testConnection();
    const user = this.auth.currentUser;
    if (user) {
      await this.syncUserToDB(user);
    }
  }

  async loadSystemSettings(): Promise<SystemSettings> {
    try {
      const settingsRef = doc(this.db, 'settings', 'system');
      const snap = await getDoc(settingsRef);
      
      if (snap.exists()) {
        const settings = snap.data() as SystemSettings;
        this.systemSettings.set(settings);
        console.log('[AuthService] System settings loaded from Firestore');
        return settings;
      } else {
        console.warn('[AuthService] System settings document not found, using defaults');
        // Default settings
        const defaults: SystemSettings = {
          models: {
            fast: 'gemini-2.5-flash-lite-preview-09-2025',
            core: 'gemini-2.5-flash',
            pro: 'gemini-2.5-pro',
            image: 'gemini-2.5-flash-image',
            live: 'gemini-2.5-flash-native-audio-preview-09-2025',
            tts: 'gemini-2.5-flash-preview-tts'
          },
          limits: {
            free: 60000,
            pro: 200000
          }
        };
        this.systemSettings.set(defaults);
        return defaults;
      }
    } catch (e) {
      console.error('[AuthService] Failed to load system settings', e);
      const defaults: SystemSettings = {
        models: { fast: '', core: '', pro: '', image: '', live: '', tts: '' },
        limits: { free: 60000, pro: 200000 }
      };
      this.systemSettings.set(defaults);
      return defaults;
    }
  }

  async uploadPaymentReceipt(uid: string, file: File): Promise<string> {
    const fileRef = ref(this.storage, `users/${uid}/receipts/${Date.now()}-${file.name}`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  }

  // --- Payment Methods Management ---
  async getPaymentMethods(): Promise<any[]> {
    try {
      const colRef = collection(this.db, 'payment_methods');
      const snap = await getDocs(colRef);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e: any) {
      console.warn('[AuthService] getPaymentMethods failed:', e.message);
      throw e;
    }
  }

  // --- Pricing Management ---
  async getPricing(): Promise<any> {
    try {
      console.log('[AuthService] Fetching pricing from Firestore...');
      const docRef = doc(this.db, 'settings', 'pricing');
      const snap = await getDoc(docRef);
      
      let data: any;
      if (snap.exists()) {
        data = snap.data();
        console.log('[AuthService] Pricing loaded successfully:', data);
      } else {
        console.warn('[AuthService] Pricing document does not exist at settings/pricing, using defaults');
        data = {
          pro: {
            monthly: { usd: 7, syp: 820 },
            yearly: { usd: 70, syp: 8200 }
          },
          premium: {
            monthly: { usd: 13, syp: 1520 },
            yearly: { usd: 130, syp: 15200 }
          }
        };
      }
      this.pricing.set(data);
      return data;
    } catch (e: any) {
      console.error('[AuthService] getPricing critical error:', e.message);
      const defaultData = {
        pro: { monthly: { usd: 7, syp: 820 }, yearly: { usd: 70, syp: 8200 } },
        premium: { monthly: { usd: 13, syp: 1520 }, yearly: { usd: 130, syp: 15200 } }
      };
      this.pricing.set(defaultData);
      return defaultData;
    }
  }

  // --- Storage Helpers ---
  async processAndUploadImage(uid: string, dataUrl: string, mimeType?: string, addWatermark: boolean = true): Promise<{ url: string | null, localDataUrl: string | null, blob?: Blob }> {
    try {
      const isImage = mimeType?.startsWith('image/') ?? false;
      const safeUrl = dataUrl.startsWith('data:')
        ? dataUrl
        : `data:${mimeType || 'application/octet-stream'};base64,${dataUrl}`;

      let blobToUpload: Blob;
      let extToUpload: string;

      if (isImage) {
        const prepared = await this.prepareImageForUpload(safeUrl, addWatermark);
        if (!prepared) return { url: null, localDataUrl: safeUrl };
        blobToUpload = prepared.blob;
        extToUpload = prepared.ext;
      } else {
        // For non-images, just convert base64 to blob
        const res = await fetch(safeUrl);
        blobToUpload = await res.blob();
        extToUpload = mimeType?.split('/')[1] || 'bin';
      }
      
      const localDataUrl = isImage ? await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blobToUpload);
      }) : safeUrl;

      try {
        const folder = addWatermark ? 'generated' : 'uploads';
        const fileRef = ref(this.storage, `users/${uid}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extToUpload}`);
        await uploadBytes(fileRef, blobToUpload, { contentType: blobToUpload.type });
        const downloadUrl = await getDownloadURL(fileRef);
        return { url: downloadUrl, localDataUrl, blob: blobToUpload };
      } catch (uploadError) {
        console.error('Failed to upload file to Firebase (CORS or other error)', uploadError);
        return { url: null, localDataUrl, blob: blobToUpload };
      }
    } catch (e) {
      console.error('Failed to process file', e);
      return { url: null, localDataUrl: dataUrl };
    }
  }

  private async prepareImageForUpload(dataUrl: string, addWatermark: boolean): Promise<{ blob: Blob; ext: string } | null> {
    try {
      const baseImage = await this.loadImage(dataUrl);

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

      if (addWatermark) {
        try {
          const watermark = await this.loadImage(this.getWatermarkSvgDataUrl());
          const padding = Math.max(12, Math.round(w * 0.02));
          const targetW = Math.max(140, Math.round(w * 0.25)); // Increased size
          const ratio = (watermark.naturalWidth || watermark.width) / (watermark.naturalHeight || watermark.height);
          const targetH = Math.round(targetW / ratio);

          ctx.globalAlpha = 0.8;
          ctx.drawImage(watermark, w - targetW - padding, h - targetH - padding, targetW, targetH);
          ctx.globalAlpha = 1;
        } catch (e) {
          console.warn('Failed to add watermark, proceeding without it', e);
        }
      }

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
      if (!url.startsWith('data:')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => resolve(img);
      img.onerror = (e) => {
        console.error('Failed to load image', e);
        reject(e);
      };
      img.src = url;
    });
  }

  private getWatermarkSvgDataUrl(): string {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="72" viewBox="0 0 220 72">' +
      '<g transform="translate(8,8) scale(2.2)" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />' +
      '<path d="m9 12 2 2 4-4" />' +
      '</g>' +
      '<text x="75" y="46" fill="#fff" font-size="28" font-family="Arial, sans-serif" font-weight="700">Aman</text>' +
      '</svg>';
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: this.auth.currentUser?.uid,
        email: this.auth.currentUser?.email,
        emailVerified: this.auth.currentUser?.emailVerified,
        isAnonymous: this.auth.currentUser?.isAnonymous,
        tenantId: this.auth.currentUser?.tenantId,
        providerInfo: this.auth.currentUser?.providerData.map(provider => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL
        })) || []
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  }
}
