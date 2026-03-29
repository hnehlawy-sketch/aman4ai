import { Injectable, inject } from '@angular/core';
import { collection, addDoc, getFirestore, serverTimestamp, doc, writeBatch, increment } from 'firebase/firestore';
import { LogEntry } from '../models';

import { db } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class DataLoggingService {
  private db = db;

  private calculateCost(log: any): number {
    if (!log.tokens) return 0;
    const model = log.metadata?.model || '';
    const isPro = model.includes('pro');
    const isFlash = model.includes('flash');
    
    // Rates per 1M tokens
    const rates = {
      pro: { input: 1.25, output: 5.0 },
      flash: { input: 0.1, output: 0.4 },
      default: { input: 0.1, output: 0.4 }
    };

    const rate = isPro ? rates.pro : (isFlash ? rates.flash : rates.default);
    
    const inputTokens = log.metadata?.tokensInput || (log.metadata?.isInput ? log.tokens : log.tokens * 0.7); // Estimate if not split
    const outputTokens = log.metadata?.tokensOutput || (log.metadata?.isOutput ? log.tokens : log.tokens * 0.3);

    return (inputTokens * rate.input / 1000000) + (outputTokens * rate.output / 1000000);
  }

  async log(entry: Omit<LogEntry, 'id' | 'timestamp'>) {
    try {
      const fullEntry: any = {
        ...entry,
        timestamp: serverTimestamp()
      };
      
      // Ensure metadata is not undefined, as Firestore doesn't support it
      if (fullEntry.metadata === undefined) {
        delete fullEntry.metadata;
      }
      
      const batch = writeBatch(this.db);
      
      // 1. Save the actual log
      const logRef = doc(collection(this.db, 'logs'));
      batch.set(logRef, fullEntry);
      
      // 2. Update aggregated reports
      const date = new Date();
      const year = date.getFullYear().toString();
      const month = `${year}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const day = `${month}-${date.getDate().toString().padStart(2, '0')}`;
      
      const cost = this.calculateCost(fullEntry);
      const tokens = fullEntry.tokens || 0;
      
      // Daily report
      const dailyRef = doc(this.db, 'reports', `daily_${day}`);
      batch.set(dailyRef, {
        type: 'daily',
        date: day,
        tokens: increment(tokens),
        cost: increment(cost),
        count: increment(1),
        lastUpdated: serverTimestamp()
      }, { merge: true });
      
      // Monthly report
      const monthlyRef = doc(this.db, 'reports', `monthly_${month}`);
      batch.set(monthlyRef, {
        type: 'monthly',
        month: month,
        tokens: increment(tokens),
        cost: increment(cost),
        count: increment(1),
        lastUpdated: serverTimestamp()
      }, { merge: true });
      
      // Yearly report
      const yearlyRef = doc(this.db, 'reports', `yearly_${year}`);
      batch.set(yearlyRef, {
        type: 'yearly',
        year: year,
        tokens: increment(tokens),
        cost: increment(cost),
        count: increment(1),
        lastUpdated: serverTimestamp()
      }, { merge: true });
      
      // User report
      if (entry.uid && entry.email) {
        const userRef = doc(this.db, 'reports', `user_${entry.uid}`);
        batch.set(userRef, {
          type: 'user',
          uid: entry.uid,
          email: entry.email,
          tokens: increment(tokens),
          cost: increment(cost),
          count: increment(1),
          lastUpdated: serverTimestamp()
        }, { merge: true });
      }
      
      await batch.commit();
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
