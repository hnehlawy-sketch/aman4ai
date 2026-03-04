import { Injectable, signal, inject } from '@angular/core';
import { UserProfile, PaymentRequest } from '../models';

// Use a simpler, more standard import for Firebase compat.
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithRedirect, createUserWithEmailAndPassword, updateProfile, sendEmailVerification, signOut, updateEmail, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, limit, getDocs, getDocsFromServer, writeBatch, addDoc, where, query, updateDoc, deleteDoc, enableMultiTabIndexedDbPersistence, orderBy } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { User } from 'firebase/auth';


const firebaseConfig = {
  apiKey: "AIzaSyBHuDsfjLV-F8LxPzk_BZ30Fc2vl3M_fqg",
  authDomain: "studio-772832865-33905.firebaseapp.com",
  projectId: "studio-772832865-33905",
  storageBucket: "studio-772832865-33905.firebasestorage.app",
  messagingSenderId: "585654670642",
  appId: "1:585654670642:web:fd0b505485b03042e0332b"
};

// Initialize Firebase once at module level
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

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
  isAdmin = signal<boolean>(false);
  isLoading = signal<boolean>(true);
  dailyUsage = signal<number>(0);
  dailyLimit = signal<number>(60000);
  
  constructor() {
    // 3. Set up Auth Listener
    onAuthStateChanged(this.auth, async (user) => {
      this.user.set(user);
      if (user) {
        try {
          await this.syncUserToDB(user);
        } catch (e) {
          console.warn('Initial sync failed, will retry on next action', e);
        }
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
    await signOut(this.auth);
    this.isPremium.set(false);
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
    
    await updateEmail(user, newEmail);
    await updateDoc(doc(this.db, 'users', user.uid), { email: newEmail });
    // Update local signal if needed, but onAuthStateChanged might handle it
  }

  async updateUserMobile(mobile: string) {
    const user = this.auth.currentUser;
    if (!user) throw new Error('User not logged in');

    await updateDoc(doc(this.db, 'users', user.uid), { mobile: mobile });
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
      
      const adminEmails = ['admin@aman-ai.com', 'h.nehlawy@gmail.com', 'queeeensila@gmail.com'];
      const shouldBeAdminByEmail = user.email ? adminEmails.includes(user.email) : false;

      console.log(`[AuthService] Syncing user ${uid} (${user.email}). Admin by email: ${shouldBeAdminByEmail}`);

      // Optimistically set admin/premium if email matches
      if (shouldBeAdminByEmail) {
        this.isAdmin.set(true);
        this.isPremium.set(true);
      }
      
      let docSnap;
      try {
        docSnap = await getDoc(docRef);
      } catch (e: any) {
        console.warn('[AuthService] Firestore getDoc failed:', e.message);
        // If we can't even get the doc, we can't sync. 
        // But if we are an admin by email, we should still allow access to the UI
        return;
      }
      
      let isPremium = shouldBeAdminByEmail;
      let isAdmin = shouldBeAdminByEmail;
      let plan: 'free' | 'pro' | 'premium' = shouldBeAdminByEmail ? 'premium' : 'free';
      
      if (docSnap && docSnap.exists()) {
        const data = docSnap.data();
        isPremium = data?.['isPremium'] || shouldBeAdminByEmail;
        isAdmin = data?.['isAdmin'] || shouldBeAdminByEmail;
        plan = data?.['plan'] || (isPremium ? 'premium' : 'free');
        
        console.log(`[AuthService] User exists in DB. Premium: ${isPremium}, Plan: ${plan}, Admin: ${isAdmin}`);

        // Ensure email-based admins are always recognized in DB
        if (shouldBeAdminByEmail && (!data?.['isAdmin'] || !data?.['isPremium'] || data?.['plan'] !== 'premium')) {
          console.log('[AuthService] Updating admin status for email-based admin');
          setDoc(docRef, { isAdmin: true, isPremium: true, plan: 'premium' }, { merge: true }).catch(err => console.warn('Failed to update admin status:', err.message));
        }

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
          // Check if first user WITHOUT querying the whole collection if possible
          // If we are an admin by email, we don't need to check if we are the first user
          let isFirstUser = false;
          if (!shouldBeAdminByEmail) {
            try {
              const usersCollection = collection(this.db, 'users');
              const firstUserQuery = query(usersCollection, limit(1));
              const firstUserSnap = await getDocs(firstUserQuery);
              isFirstUser = firstUserSnap.empty;
            } catch (e) {
              console.warn('[AuthService] Could not check if first user (permission?):', e);
            }
          }

          const shouldBeAdmin = isFirstUser || shouldBeAdminByEmail;
          plan = shouldBeAdmin ? 'premium' : 'free';

          await setDoc(docRef, { 
            uid: uid,
            email: user.email,
            displayName: displayNameOverride || user.displayName || 'User',
            photoURL: user.photoURL || null,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            isPremium: shouldBeAdmin,
            plan: plan,
            isAdmin: shouldBeAdmin,
            dailyUsage: 0,
            usageDate: new Date().toDateString()
          });
          isAdmin = shouldBeAdmin;
          isPremium = shouldBeAdmin;
          this.dailyUsage.set(0);
          console.log(`[AuthService] New user record created. Admin: ${isAdmin}`);
        } catch (e: any) {
          console.error('[AuthService] Failed to create user record:', e.message);
        }
      }
      
      this.isPremium.set(isPremium);
      this.userPlan.set(plan);
      this.isAdmin.set(isAdmin);
      
      // Set daily usage if available
      if (docSnap && docSnap.exists()) {
        const data = docSnap.data();
        const plan = data?.['plan'] || 'free';
        const customLimit = data?.['customDailyLimit'];
        const limit = customLimit || (plan === 'pro' ? 200000 : 60000);
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
    const plan = this.userPlan();
    if (plan === 'premium') return true; // Premium (Gold) Account has no limits

    const user = this.user();
    if (!user) return false;

    try {
      const userRef = doc(this.db, 'users', user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) return false;

      const data = snap.data();
      if (!data) return false;

      const today = new Date().toDateString();
      
      // Check if we need to reset
      let currentUsage = data['dailyUsage'] || 0;
      const lastUsageDate = data['usageDate'] || '';

      if (lastUsageDate !== today) {
        currentUsage = 0; // Reset for new day
      }

      // Free: 60k, Pro: 200k, or custom limit
      const DAILY_LIMIT = data['customDailyLimit'] || (plan === 'pro' ? 200000 : 60000);

      if (currentUsage + estimatedTokens > DAILY_LIMIT) {
        return false; // Limit exceeded
      }

      // Increment and update date (optimistic)
      const newUsage = currentUsage + estimatedTokens;
      setDoc(userRef, {
        dailyUsage: newUsage,
        usageDate: today
      }, { merge: true }).catch(err => console.warn('Failed to update usage (offline):', err.message));
      
      this.dailyUsage.set(newUsage);

      return true;
    } catch (e: any) {
      console.warn('Usage check failed (offline?):', e.message);
      // Strict mode: If we can't verify with DB, we assume limit reached to prevent abuse.
      // However, we can check local signal as a fallback if it was already loaded.
      // For custom limit, we might not have it locally easily, so we return false.
      return false; 
    }
  }

  async updateUserDailyLimit(uid: string, limit: number) {
    await updateDoc(doc(this.db, 'users', uid), { customDailyLimit: limit });
  }

  async submitPaymentRequest(transactionId: string, receiptUrl?: string, planRequested: 'pro' | 'premium' = 'premium') {
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

  async getPendingPayments(): Promise<PaymentRequest[]> {
    const paymentsCollection = collection(this.db, 'payment_requests');
    const q = query(paymentsCollection, where('status', '==', 'pending'));
    const snap = await getDocs(q);
    
    const requests = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentRequest));
    
    // Sort manually on the client-side
    return requests.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async approvePayment(request: PaymentRequest, barcodeFile?: File) {
    if (!request.id) return;

    const batch = writeBatch(this.db);
    
    // 1. Update request status
    const requestRef = doc(this.db, 'payment_requests', request.id);

    // Handle barcode upload if file is provided
    if (barcodeFile) {
      const barcodeRef = ref(this.storage, `barcodes/${request.uid}/${request.id}-${barcodeFile.name}`);
      await uploadBytes(barcodeRef, barcodeFile);
      const barcodeUrl = await getDownloadURL(barcodeRef);
      batch.update(requestRef, { status: 'approved', barcodeUrl: barcodeUrl });
    } else {
      batch.update(requestRef, { status: 'approved' });
    }

    // 2. Update user premium status
    const userRef = doc(this.db, 'users', request.uid);
    const planToSet = request.planRequested || 'premium';
    batch.update(userRef, { 
      isPremium: true,
      plan: planToSet
    });

    await batch.commit();
  }

  async rejectPayment(requestId: string) {
    await updateDoc(doc(this.db, 'payment_requests', requestId), { status: 'rejected' });
  }

  async forceSync() {
    const user = this.auth.currentUser;
    if (user) {
      await this.syncUserToDB(user);
    }
  }

  async getAllUsers(): Promise<any[]> {
    try {
      console.log('[AuthService] getAllUsers: Fetching from Firestore...');
      const snapshot = await getDocs(collection(this.db, 'users'));
      console.log('[AuthService] getAllUsers: Snapshot size:', snapshot.size);
      if (snapshot.empty) {
        console.warn('[AuthService] getAllUsers: Snapshot is empty.');
      }
      return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    } catch (e: any) {
      console.error('[AuthService] getAllUsers: Error fetching users:', e);
      throw e;
    }
  }

  async updateUserPremiumStatus(uid: string, isPremium: boolean) {
    await updateDoc(doc(this.db, 'users', uid), { isPremium });
  }

  async updateUserPlan(uid: string, plan: 'free' | 'pro' | 'premium') {
    await updateDoc(doc(this.db, 'users', uid), { 
      plan: plan,
      isPremium: plan === 'premium' || plan === 'pro' // Or however you define premium/pro
    });
  }

  async updateUserStatus(uid: string, isSuspended: boolean) {
    await updateDoc(doc(this.db, 'users', uid), { isSuspended });
  }

  async updateUserAccounting(uid: string, accountingId: string) {
    await updateDoc(doc(this.db, 'users', uid), { accountingId });
  }

  async updateUserVariables(uid: string, variables: {[key: string]: any}) {
    await updateDoc(doc(this.db, 'users', uid), { customVariables: variables });
  }

  async updateUserSubscription(uid: string, isPremium: boolean, endDate?: string) {
    await updateDoc(doc(this.db, 'users', uid), { 
      isPremium, 
      subscriptionEndDate: endDate || null 
    });
  }

  // --- Payment Methods Management ---
  async getPaymentMethods(): Promise<any[]> {
    try {
      const snap = await getDocs(collection(this.db, 'payment_methods'));
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e: any) {
      console.warn('[AuthService] getPaymentMethods failed:', e.message);
      throw e;
    }
  }

  async getLogs(limitCount: number = 100): Promise<any[]> {
    try {
      const q = query(
        collection(this.db, 'logs'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e: any) {
      console.warn('[AuthService] getLogs failed:', e.message);
      throw e;
    }
  }

  async addPaymentMethod(method: any) {
    console.log('Adding payment method:', method);
    await addDoc(collection(this.db, 'payment_methods'), method);
  }

  async updatePaymentMethod(id: string, method: any) {
    await updateDoc(doc(this.db, 'payment_methods', id), method);
  }

  async deletePaymentMethod(id: string) {
    await deleteDoc(doc(this.db, 'payment_methods', id));
  }

  async uploadPaymentMethodQR(file: File): Promise<string> {
    console.log('Uploading QR code:', file.name);
    const fileRef = ref(this.storage, `admin/payment_methods/${Date.now()}-${file.name}`);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    console.log('QR code uploaded, URL:', url);
    return url;
  }

  async uploadPaymentMethodIcon(file: File): Promise<string> {
    console.log('Uploading payment method icon:', file.name);
    const fileRef = ref(this.storage, `admin/payment_icons/${Date.now()}-${file.name}`);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    console.log('Icon uploaded, URL:', url);
    return url;
  }

  async uploadPaymentReceipt(uid: string, file: File): Promise<string> {
    const fileRef = ref(this.storage, `users/${uid}/receipts/${Date.now()}-${file.name}`);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  }

  // --- Storage Helpers ---
  async processAndUploadImage(uid: string, dataUrl: string, mimeType?: string, addWatermark: boolean = true): Promise<{ url: string | null, localDataUrl: string | null }> {
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
        return { url: downloadUrl, localDataUrl };
      } catch (uploadError) {
        console.error('Failed to upload file to Firebase (CORS or other error)', uploadError);
        return { url: null, localDataUrl };
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
        const watermark = await this.loadImage(this.getWatermarkSvgDataUrl());
        const padding = Math.max(12, Math.round(w * 0.02));
        const targetW = Math.max(140, Math.round(w * 0.25)); // Increased size
        const ratio = (watermark.naturalWidth || watermark.width) / (watermark.naturalHeight || watermark.height);
        const targetH = Math.round(targetW / ratio);

        ctx.globalAlpha = 0.8;
        ctx.drawImage(watermark, w - targetW - padding, h - targetH - padding, targetW, targetH);
        ctx.globalAlpha = 1;
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
      '<g transform="translate(0,8) scale(2.2)" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 1.5a4.5 4.5 0 0 0-4.5 4.5V9h9V6a4.5 4.5 0 0 0-4.5-4.5ZM12 12a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM3 9h18v10.5a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V9Z" />' +
      '</g>' +
      '<text x="70" y="46" fill="#fff" font-size="28" font-family="Arial, sans-serif" font-weight="700">Aman</text>' +
      '</svg>';
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }
}
