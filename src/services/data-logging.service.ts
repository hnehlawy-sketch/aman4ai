import { Injectable, inject } from '@angular/core';
import { collection, addDoc, getFirestore, serverTimestamp } from 'firebase/firestore';
import { LogEntry } from '../models';

@Injectable({
  providedIn: 'root'
})
export class DataLoggingService {
  private _db: any;

  private get db() {
    if (!this._db) {
      this._db = getFirestore();
    }
    return this._db;
  }

  async log(entry: Omit<LogEntry, 'id' | 'timestamp'>) {
    try {
      const fullEntry: any = {
        ...entry,
        timestamp: serverTimestamp()
      };
      await addDoc(collection(this.db, 'logs'), fullEntry);
    } catch (e) {
      console.warn('[DataLoggingService] Failed to log event:', e);
    }
  }

  async logChat(uid: string, email: string, role: 'user' | 'model', text: string, tokens?: number, metadata?: any) {
    await this.log({
      uid,
      email,
      type: 'chat',
      content: { role, text },
      tokens,
      metadata
    });
  }

  async logImage(uid: string, email: string, prompt: string, imageUrl: string, metadata?: any) {
    await this.log({
      uid,
      email,
      type: 'image',
      content: { prompt, imageUrl },
      metadata
    });
  }

  async logLocation(uid: string, email: string, lat: number, lng: number, metadata?: any) {
    await this.log({
      uid,
      email,
      type: 'location',
      content: { lat, lng },
      metadata
    });
  }

  async logAuth(uid: string, email: string, action: 'login' | 'logout' | 'signup' | 'reset_password', metadata?: any) {
    await this.log({
      uid,
      email,
      type: 'auth',
      content: { action },
      metadata
    });
  }

  async logError(uid: string, email: string, error: string, metadata?: any) {
    await this.log({
      uid,
      email,
      type: 'error',
      content: { error },
      metadata
    });
  }

  async logUsage(uid: string, email: string, tokens: number, metadata?: any) {
    await this.log({
      uid,
      email,
      type: 'token_usage',
      content: { tokens },
      tokens,
      metadata
    });
  }
}
