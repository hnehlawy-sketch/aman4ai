import { Injectable } from '@angular/core';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ChatSession } from '../models';

interface AmanDB extends DBSchema {
  sessions: {
    key: string;
    value: ChatSession;
  };
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private dbPromise: Promise<IDBPDatabase<AmanDB>>;

  constructor() {
    this.dbPromise = openDB<AmanDB>('aman-db', 1, {
      upgrade(db) {
        db.createObjectStore('sessions', { keyPath: 'id' });
      },
    });
  }

  async getAllSessions(): Promise<ChatSession[]> {
    return (await this.dbPromise).getAll('sessions');
  }

  async getSession(id: string): Promise<ChatSession | undefined> {
    return (await this.dbPromise).get('sessions', id);
  }

  async saveSession(session: ChatSession): Promise<void> {
    await (await this.dbPromise).put('sessions', session);
  }

  async saveAllSessions(sessions: ChatSession[]): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction('sessions', 'readwrite');
    const store = tx.objectStore('sessions');
    await Promise.all(sessions.map(session => store.put(session)));
    await tx.done;
  }

  async deleteSession(id: string): Promise<void> {
    await (await this.dbPromise).delete('sessions', id);
  }

  async clearAllSessions(): Promise<void> {
    await (await this.dbPromise).clear('sessions');
  }
}
