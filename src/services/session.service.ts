import { Injectable, signal, inject, computed, WritableSignal } from '@angular/core';
import { ChatSession, UserProfile } from '../models';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';
import { ChatMessage } from './gemini.service';
import { doc, setDoc, collection, writeBatch, getDocs, deleteDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getApp } from 'firebase/app';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private storageService = inject(StorageService);
  private authService = inject(AuthService);
  
  // Core State
  currentSessionId = signal<string>('');
  sessions = signal<ChatSession[]>([]);
  messages: WritableSignal<ChatMessage[]> = signal([]);
  
  private sessionUnsubscribe: Unsubscribe | null = null;
  private chatsUnsubscribe: Unsubscribe | null = null;
  public isSyncingFromRemote = false;

  constructor() {}

  handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
    const user = this.authService.user();
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: user?.uid,
        email: user?.email,
        emailVerified: user?.emailVerified,
        isAnonymous: user?.isAnonymous,
        tenantId: user?.tenantId,
        providerInfo: user?.providerData.map(provider => ({
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

  async loadSessions() {
    try {
      const localSessions = await this.storageService.getAllSessions();
      this.sessions.set(localSessions.sort((a, b) => b.timestamp - a.timestamp));
      
      const uid = this.authService.user()?.uid;
      if (uid) {
        await this.loadRemoteSessions(uid);
      }
    } catch (e) {
      console.error('Error loading sessions:', e);
    }
  }

  async loadRemoteSessions(uid: string) {
    const db = getFirestore(getApp());
    const chatsRef = collection(db, `users/${uid}/chats`);
    
    if (this.chatsUnsubscribe) {
      this.chatsUnsubscribe();
    }

    this.chatsUnsubscribe = onSnapshot(chatsRef, (snapshot) => {
      this.isSyncingFromRemote = true;
      const remoteSessions: ChatSession[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data && data['id']) {
          remoteSessions.push(data as ChatSession);
        }
      });

      const localSessions = this.sessions();
      const merged = [...localSessions];
      
      remoteSessions.forEach(rs => {
        const idx = merged.findIndex(ls => ls.id === rs.id);
        if (idx >= 0) {
          if (rs.timestamp > merged[idx].timestamp) {
            merged[idx] = rs;
          }
        } else {
          merged.push(rs);
        }
      });

      merged.sort((a, b) => b.timestamp - a.timestamp);
      this.sessions.set(merged);
      
      const currentId = this.currentSessionId();
      if (currentId) {
        const currentSession = merged.find(s => s.id === currentId);
        if (currentSession) {
          this.messages.set(currentSession.messages || []);
        }
      }
      
      setTimeout(() => this.isSyncingFromRemote = false, 100);
    }, (error) => {
      console.error('Error syncing remote sessions:', error);
    });
  }

  clearRemoteSessions() {
    if (this.chatsUnsubscribe) {
      this.chatsUnsubscribe();
      this.chatsUnsubscribe = null;
    }
    this.sessions.set([]);
  }

  createNewChat(closeSidebarCallback?: () => void) {
    this.currentSessionId.set('');
    this.messages.set([]);
    if (closeSidebarCallback) closeSidebarCallback();
  }

  loadSession(id: string, closeSidebarCallback?: () => void) {
    const session = this.sessions().find(s => s.id === id);
    if (session) {
      this.currentSessionId.set(id);
      this.messages.set(session.messages || []);
      if (closeSidebarCallback) closeSidebarCallback();
    }
  }

  updateSessionMessages(id: string, msgs: ChatMessage[]) {
    this.sessions.update(all => {
      const idx = all.findIndex(s => s.id === id);
      if (idx >= 0) {
        const updated = [...all];
        updated[idx] = { ...updated[idx], messages: msgs, timestamp: Date.now() };
        return updated;
      }
      return all;
    });
  }

  async deleteSession(id: string) {
    this.sessions.update(all => all.filter(s => s.id !== id));
    if (this.currentSessionId() === id) {
      this.createNewChat();
    }
    await this.storageService.deleteSession(id);
    
    const uid = this.authService.user()?.uid;
    if (uid) {
      try {
        const db = getFirestore(getApp());
        await deleteDoc(doc(db, `users/${uid}/chats`, id));
      } catch (e) {
        console.error('Error deleting remote session:', e);
      }
    }
  }

  async deleteSelectedSessions(selectedIds: Set<string>) {
    if (selectedIds.size === 0) return;
    
    const idsToDelete = Array.from(selectedIds);
    this.sessions.update(all => all.filter(s => !selectedIds.has(s.id)));
    
    if (selectedIds.has(this.currentSessionId())) {
      this.createNewChat();
    }

    for (const id of idsToDelete) {
      await this.storageService.deleteSession(id);
    }

    const uid = this.authService.user()?.uid;
    if (uid) {
      try {
        const db = getFirestore(getApp());
        const batch = writeBatch(db);
        for (const id of idsToDelete) {
          batch.delete(doc(db, `users/${uid}/chats`, id));
        }
        await batch.commit();
      } catch (e) {
        console.error('Error deleting remote sessions batch:', e);
      }
    }
  }

  async syncChatToFirestore(sessionOverride?: ChatSession) {
    if (this.isSyncingFromRemote) return;
    
    const uid = this.authService.user()?.uid;
    if (!uid) return;

    const sessionId = sessionOverride?.id || this.currentSessionId();
    if (!sessionId) return;

    const session = sessionOverride || this.sessions().find(s => s.id === sessionId);
    if (!session) return;

    try {
      const db = getFirestore(getApp());
      const chatRef = doc(db, `users/${uid}/chats`, sessionId);
      
      const currentMessages = session.messages || this.messages();
      const cleanMessages = currentMessages.map(msg => {
        const clean: any = {
          id: msg.id || crypto.randomUUID(),
          role: msg.role,
          text: msg.text || ''
        };

        if (msg.isError) clean.isError = true;
        if (msg.isEdited) clean.isEdited = true;
        if (msg.location) clean.location = JSON.parse(JSON.stringify(msg.location));
        
        if (msg.route) {
          clean.route = JSON.parse(JSON.stringify(msg.route));
        }

        if (msg.fileData) {
          clean.fileData = {
            mimeType: msg.fileData.mimeType,
            name: msg.fileData.name,
            url: msg.fileData.url || null
          };
        }

        if (msg.generatedImages && msg.generatedImages.length > 0) {
          clean.generatedImages = msg.generatedImages.map(img => {
            if (img.url && img.url.startsWith('data:')) {
              return {
                url: null,
                mimeType: img.mimeType,
                alt: img.alt || null,
                isPending: true
              };
            }
            return {
              url: img.url,
              mimeType: img.mimeType,
              alt: img.alt || null,
              isPending: img.isPending
            };
          });
        }

        if (msg.functionCall) {
          clean.functionCall = JSON.parse(JSON.stringify(msg.functionCall));
        }

        if (msg.functionResponse) {
          clean.functionResponse = JSON.parse(JSON.stringify(msg.functionResponse));
        }

        if (msg.generatedFile) {
          clean.generatedFile = JSON.parse(JSON.stringify(msg.generatedFile));
        }

        return clean;
      });

      await setDoc(chatRef, {
        id: sessionId,
        title: session.title,
        timestamp: session.timestamp,
        messages: cleanMessages,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.error('Error syncing chat to Firestore:', e);
    }
  }
}
