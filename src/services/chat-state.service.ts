import { Injectable, signal, computed, inject, WritableSignal, effect, untracked } from '@angular/core';
import { ChatSession, ChatMessage } from '../models';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';
import { doc, setDoc, collection, writeBatch, deleteDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { UiService } from './ui.service';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

@Injectable({ providedIn: 'root' })
export class ChatStateService {
  private storageService = inject(StorageService);
  private authService = inject(AuthService);
  private uiService = inject(UiService);

  currentSessionId = signal<string>('');
  sessions = signal<ChatSession[]>([]);
  messages: WritableSignal<ChatMessage[]> = signal([]);
  
  isSelectionMode = signal(false);
  selectedSessionIds = signal<Set<string>>(new Set());

  isSyncingFromRemote = false;
  private chatsUnsubscribe: Unsubscribe | null = null;

  constructor() {
    // 1. Persist sessions to storage whenever they change
    effect(() => {
      const allSessions = this.sessions();
      if (allSessions.length > 0) {
        this.storageService.saveAllSessions(allSessions).catch(err => 
          console.error('[ChatStateService] Failed to save sessions to IndexedDB', err)
        );
      }
    });

    // 2. Persist current messages to active session
    effect(() => {
      const msgs = this.messages();
      const id = this.currentSessionId();
      if (id && msgs.length >= 0) {
        untracked(() => {
          this.updateSessionMessages(id, msgs);
          if (this.authService.user() && !this.isSyncingFromRemote) {
            this.syncChatToFirestore();
          }
        });
      }
    });

    // 3. Load remote sessions when user is available
    effect(() => {
      const user = this.authService.user();
      if (user) {
        console.log('[ChatStateService] User logged in, loading remote sessions for:', user.uid);
        this.loadRemoteSessions(user.uid);
      } else {
        if (this.chatsUnsubscribe) {
          this.chatsUnsubscribe();
          this.chatsUnsubscribe = null;
        }
      }
    });
  }

  async loadSessions() {
    try {
      console.log('[ChatStateService] Loading local sessions...');
      const sessions = await this.storageService.getAllSessions();
      if (sessions && sessions.length > 0) {
        console.log(`[ChatStateService] Loaded ${sessions.length} local sessions`);
        sessions.sort((a, b) => b.timestamp - a.timestamp);
        this.sessions.set(sessions);
      } else {
        const saved = localStorage.getItem('aman_sessions_v1');
        if (saved && saved !== 'undefined' && saved !== 'null') {
          try {
            const localSessions = JSON.parse(saved);
            if (Array.isArray(localSessions)) {
              console.log(`[ChatStateService] Migrated ${localSessions.length} sessions from localStorage`);
              this.sessions.set(localSessions);
              await this.storageService.saveAllSessions(localSessions);
              localStorage.removeItem('aman_sessions_v1');
            }
          } catch (e) {
            console.error('[ChatStateService] Failed to parse sessions from localStorage', e);
          }
        } else {
          console.log('[ChatStateService] No local sessions found');
          this.sessions.set([]);
        }
      }
    } catch (e) {
      console.error('[ChatStateService] Failed to load sessions', e);
      this.sessions.set([]);
    }
  }

  loadRemoteSessions(uid: string) {
    if (this.chatsUnsubscribe) {
      this.chatsUnsubscribe();
    }

    try {
      const chatsRef = collection(this.authService.db, 'users', uid, 'chats');
      console.log('[ChatStateService] Subscribing to remote chats at:', chatsRef.path);
      
      this.chatsUnsubscribe = onSnapshot(chatsRef, (snapshot) => {
        const remoteSessions: ChatSession[] = [];
        snapshot.forEach(doc => {
          const data = doc.data() as any;
          if (data.id && data.messages) {
            remoteSessions.push({
              id: data.id,
              title: data.title || 'Untitled Chat',
              timestamp: data.timestamp || Date.now(),
              messages: data.messages
            });
          }
        });

        console.log(`[ChatStateService] Received ${remoteSessions.length} remote sessions from Firestore`);

        if (remoteSessions.length > 0) {
          this.sessions.update(current => {
            const combined = [...current];
            remoteSessions.forEach(r => {
              const idx = combined.findIndex(c => c.id === r.id);
              if (idx >= 0) {
                const localStr = JSON.stringify(combined[idx].messages);
                const remoteStr = JSON.stringify(r.messages);
                if (localStr !== remoteStr) {
                  combined[idx] = r;
                }
              } else {
                combined.push(r);
              }
            });
            return combined.sort((a, b) => b.timestamp - a.timestamp);
          });
          
          const activeId = this.currentSessionId();
          const activeMsgs = this.messages();

          if (activeId) {
            const updated = remoteSessions.find(s => s.id === activeId);
            if (updated) {
              const currentMsgsStr = JSON.stringify(this.messages());
              const remoteMsgsStr = JSON.stringify(updated.messages);
              
              if (currentMsgsStr !== remoteMsgsStr) {
                console.log('[ChatStateService] Remote update detected for active session:', activeId);
                this.isSyncingFromRemote = true;
                this.messages.set([...updated.messages]);
                setTimeout(() => {
                  this.isSyncingFromRemote = false;
                }, 1000);
              }
            }
          }
        }
      }, (error) => {
        console.error('[ChatStateService] Firestore onSnapshot error:', error);
        this.handleFirestoreError(error, OperationType.LIST, `users/${uid}/chats`);
      });
    } catch (e) {
      console.error('[ChatStateService] Error setting up remote chats listener', e);
    }
  }

  private handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
    const user = this.authService.user();
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: user?.uid,
        email: user?.email,
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    this.uiService.showToast('حدث خطأ في مزامنة البيانات', 'error');
  }

  createNewChat() {
    const newId = crypto.randomUUID();
    this.currentSessionId.set(newId);
    this.messages.set([]);
  }

  loadSession(id: string) {
    const session = this.sessions().find(s => s.id === id);
    if (session) {
      this.currentSessionId.set(id);
      this.messages.set([...session.messages]);
    }
  }

  updateSessionMessages(id: string, msgs: ChatMessage[]) {
    this.sessions.update(prev => prev.map(s => {
      if (s.id === id) {
        let title = s.title;
        const isDefault = s.title === 'محادثة جديدة' || s.title === 'New Chat';
        if (isDefault && msgs.length > 0) {
           const firstUserMsg = msgs.find(m => m.role === 'user');
           if (firstUserMsg) {
             title = firstUserMsg.text.substring(0, 30) + (firstUserMsg.text.length > 30 ? '...' : '');
           }
        }
        return { ...s, messages: msgs, title };
      }
      return s;
    }));
  }

  async deleteSession(id: string) {
    this.sessions.update(prev => prev.filter(s => s.id !== id));
    this.storageService.deleteSession(id);
    
    const user = this.authService.user();
    if (user) {
      try {
        const chatDocRef = doc(this.authService.db, 'users', user.uid, 'chats', id);
        await deleteDoc(chatDocRef);
        console.log(`[ChatStateService] Deleted remote session: ${id}`);
      } catch (e) {
        console.error(`[ChatStateService] Failed to delete remote session: ${id}`, e);
      }
    }

    if (this.currentSessionId() === id) {
      if (this.sessions().length > 0) {
        this.loadSession(this.sessions()[0].id);
      } else {
        this.createNewChat();
      }
    }
    if (this.sessions().length === 0) {
      localStorage.removeItem('aman_sessions_v1');
    }
  }

  toggleSelectionMode() {
    this.isSelectionMode.update(v => !v);
    this.selectedSessionIds.set(new Set());
  }

  toggleSessionSelection(id: string) {
    this.selectedSessionIds.update(set => {
      const newSet = new Set(set);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  async deleteSelectedSessions(idsToDelete: string[]) {
    if (idsToDelete.length === 0) return;

    this.sessions.update(prev => prev.filter(s => !idsToDelete.includes(s.id)));
    
    const user = this.authService.user();
    if (user) {
      const batch = writeBatch(this.authService.db);
      idsToDelete.forEach(id => {
        const chatDocRef = doc(this.authService.db, 'users', user.uid, 'chats', id);
        batch.delete(chatDocRef);
      });
      try {
        await batch.commit();
      } catch (e) {
        console.error('[ChatStateService] Failed to delete remote sessions batch', e);
      }
    }

    for (const id of idsToDelete) {
      this.storageService.deleteSession(id);
    }
    
    if (idsToDelete.includes(this.currentSessionId())) {
      if (this.sessions().length > 0) {
        this.loadSession(this.sessions()[0].id);
      } else {
        this.createNewChat();
      }
    }
    
    if (this.sessions().length === 0) {
      localStorage.removeItem('aman_sessions_v1');
    }
  }

  deleteMessage(msgId: string) {
    this.messages.update(prev => prev.filter(m => m.id !== msgId));
    this.syncChatToFirestore();
  }

  editMessage(updatedMsg: ChatMessage) {
    this.messages.update(prev => prev.map(m => 
      m.id === updatedMsg.id ? updatedMsg : m
    ));
    this.syncChatToFirestore();
  }

  updateSystemMessage(id: string, text: string) {
    this.messages.update(msgs => msgs.map(m => m.id === id ? { ...m, text } : m));
  }

  async syncChatToFirestore(sessionOverride?: ChatSession) {
    const user = this.authService.user();
    if (!user || this.isSyncingFromRemote) return;

    try {
      const sessionId = this.currentSessionId();
      console.log('[ChatStateService] Syncing session to Firestore:', sessionId);
      const session = sessionOverride || this.sessions().find(s => s.id === sessionId);
      if (!session) return;

      const currentMessages = this.messages();
      const db = this.authService.db;
      const path = `users/${user.uid}/chats/${sessionId}`;
      const chatDocRef = doc(db, path);
      
      const cleanMessages = currentMessages.map(msg => {
        const clean: any = {
          id: msg.id || crypto.randomUUID(),
          role: msg.role,
          text: msg.text || ''
        };

        if (msg.isError) clean.isError = true;
        if (msg.isEdited) clean.isEdited = true;
        if (msg.isHidden) clean.isHidden = true;
        if (msg.location) clean.location = JSON.parse(JSON.stringify(msg.location));
        if (msg.route) clean.route = JSON.parse(JSON.stringify(msg.route));

        if (msg.files && msg.files.length > 0) {
          clean.files = msg.files.map(f => ({
            mimeType: f.mimeType,
            name: f.name,
            url: f.url || null
          }));
        }

        if (msg.generatedImages && msg.generatedImages.length > 0) {
          clean.generatedImages = msg.generatedImages.map(img => {
            if (img.url && img.url.startsWith('data:')) {
              return { url: null, mimeType: img.mimeType, alt: img.alt || null, isPending: true };
            }
            return { url: img.url, mimeType: img.mimeType, alt: img.alt || null, isPending: img.isPending };
          });
        }

        if (msg.functionCall) clean.functionCall = JSON.parse(JSON.stringify(msg.functionCall));
        if (msg.functionResponse) clean.functionResponse = JSON.parse(JSON.stringify(msg.functionResponse));
        if (msg.generatedFile) clean.generatedFile = JSON.parse(JSON.stringify(msg.generatedFile));

        return clean;
      });

      await setDoc(chatDocRef, {
        id: sessionId,
        title: session.title,
        timestamp: session.timestamp,
        messages: cleanMessages,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log('[ChatStateService] Sync successful');
    } catch (error) {
      console.error('[ChatStateService] Sync to Firestore failed', error);
      const sessionId = this.currentSessionId();
      const user = this.authService.user();
      this.handleFirestoreError(error, OperationType.WRITE, `users/${user?.uid}/chats/${sessionId}`);
    }
  }
}
