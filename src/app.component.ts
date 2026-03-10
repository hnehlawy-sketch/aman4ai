import { StorageService } from './services/storage.service';
import { Component, ElementRef, ViewChild, inject, signal, effect, OnInit, computed, WritableSignal, HostListener } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService, ChatMessage } from './services/gemini.service';
import { AuthService } from './services/auth.service';
import { UiService } from './services/ui.service';
import { ImageService } from './services/image.service';
import { MessageBubbleComponent } from './components/message-bubble.component';
import { doc, setDoc, collection, writeBatch, getDocs, deleteDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { translations } from './translations';
import { ChatSession, UserProfile } from './models';

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

// Import New Components
import { AuthModalComponent } from './components/auth-modal.component';
import { SettingsModalComponent } from './components/settings-modal.component';
import { ExportModalComponent } from './components/export-modal.component';
import { PersonalizationModalComponent } from './components/personalization-modal.component';
import { LiveChatComponent } from './components/live-chat.component';
import { InfoModalComponent } from './components/info-modal.component';
import { ImageViewModalComponent } from './components/image-view-modal.component';
import { AccountModalComponent } from './components/account-modal.component';
import { UpgradeModalComponent } from './components/upgrade-modal.component';
import { SidebarComponent } from './components/sidebar.component';
import { HeaderComponent } from './components/header.component';
import { ChatInputComponent } from './components/chat-input.component';
import { InstallPromptComponent } from './components/install-prompt.component';
import { InputModelMenuComponent } from './components/input-model-menu.component';


declare var window: any;

export const DEFAULT_PROFILE: UserProfile = {
  name: '',
  dob: '',
  education: 'unspecified',
  maritalStatus: 'unspecified',
  instructions: ''
};

import { DataLoggingService } from './services/data-logging.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    MessageBubbleComponent,
    AuthModalComponent,
    SettingsModalComponent,
    ExportModalComponent,
    PersonalizationModalComponent,
    LiveChatComponent,
    InfoModalComponent,
    ImageViewModalComponent,
    AccountModalComponent,
    UpgradeModalComponent,
    SidebarComponent,
    HeaderComponent,
    ChatInputComponent,
    InstallPromptComponent,
    InputModelMenuComponent
  ],
  templateUrl: './app.component.html',
  host: {
    'class': 'h-full block'
  }
})
export class AppComponent implements OnInit {
  private geminiService = inject(GeminiService);
  public authService = inject(AuthService); 
  public uiService = inject(UiService);
  public imageService = inject(ImageService);
  public storageService = inject(StorageService);
  private logger = inject(DataLoggingService);
  
  // -- PWA Install State --
  deferredPrompt: any = null;
  showInstallPrompt = signal(false);

  // -- App Settings --
  currentLang: WritableSignal<'ar'|'en'> = signal('ar');
  theme: WritableSignal<'light'|'dark'> = signal('light');
  modelKey: WritableSignal<'fast' | 'core' | 'pro'> = signal('fast');
  
  // -- Translations --
  private allTranslations = translations;
  t = computed(() => {
    const lang = this.currentLang();
    return this.allTranslations[lang] || this.allTranslations['ar'];
  });

  filteredSessions = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const all = this.sessions();
    if (!query) return all;
    return all.filter(s => s.title.toLowerCase().includes(query));
  });
  
  currentModelLabel = computed(() => {
    const key = this.modelKey();
    if (key === 'fast') return this.t().engineFast;
    if (key === 'core') return this.t().engineCore;
    if (key === 'pro') return this.t().enginePro;
    return '...';
  });

  // -- Core State --
  currentSessionId = signal<string>('');
  sessions = signal<ChatSession[]>([]);
  messages: WritableSignal<ChatMessage[]> = signal([]);
  abortController: AbortController | null = null;
  private messageSubscription: Subscription | null = null;
  private processedFunctionCalls = new Set<string>();
  private isSending = false;
  private sessionUnsubscribe: Unsubscribe | null = null;
  private chatsUnsubscribe: Unsubscribe | null = null;
  private isSyncingFromRemote = false;
  
  // -- User Profile State --
  userProfile = signal<UserProfile | null>(null);
  profileForm: WritableSignal<UserProfile> = signal(DEFAULT_PROFILE);
  
  // -- UI State --
  inputMessage = signal('');
  isLoading = signal(false);
  isSidebarOpen = signal(false);
  isListening = signal(false);
  showUserMenu = signal(false);
  showInputModelMenu = signal(false);
  searchQuery = signal('');
  isLimitExceeded = signal(false);
  activeMenuId = signal<string | null>(null);
  
  // -- Multi-delete state --
  isSelectionMode = signal(false);
  selectedSessionIds = signal<Set<string>>(new Set());
  
  useWebSearch = signal(true);
  generateImage = signal(false);
  
  // -- Usage Stats --
  usagePercentage = computed(() => {
    if (this.authService.userPlan() === 'premium') return 0;
    const usage = this.authService.dailyUsage();
    const limit = this.authService.dailyLimit();
    return Math.min(100, Math.round((usage / limit) * 100));
  });

  selectedFile = signal<{name: string, data: string, mimeType: string, previewUrl?: string} | null>(null);
  
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  @ViewChild('fileInput') private fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('textarea') private textarea!: ElementRef<HTMLTextAreaElement>;

  constructor() {
    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallPrompt.set(true);
    });

    effect(() => {
      const allSessions = this.sessions();
      if (allSessions.length > 0) {
        this.storageService.saveAllSessions(allSessions).catch(err => {
          console.error('Failed to save sessions to IndexedDB', err);
        });
      }
    });

    effect(() => {
      const msgs = this.messages();
      const id = this.currentSessionId();
      if (id && msgs.length >= 0) {
        this.updateSessionMessages(id, msgs);
        // Auto-sync to Firestore if user is logged in and NOT currently receiving a remote update
        if (this.authService.user() && !this.isSyncingFromRemote) {
          this.syncChatToFirestore();
        }
      }
    });

    effect(async () => {
      const user = this.authService.user();
      if (user) {
        this.loadRemoteSessions(user.uid);
        await this.loadProfile();
      } else {
        this.userProfile.set(null);
      }
    });

    const savedTheme = localStorage.getItem('aman_theme') as 'light' | 'dark';
    if (savedTheme) this.theme.set(savedTheme);

    effect(() => {
      if (this.authService.userPlan() === 'premium') {
        this.isLimitExceeded.set(false);
      }
    });

    effect(() => {
      if (this.theme() === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    });

    const savedModel = localStorage.getItem('aman_model') as 'fast'|'core'|'pro';
    if(savedModel) this.modelKey.set(savedModel);

    // Handle actions from Live Chat
    effect(() => {
      const action = this.uiService.mainChatAction();
      if (action) {
        this.handleLiveChatAction(action);
        // Reset the action
        this.uiService.mainChatAction.set(null);
      }
    });
  }

  ngOnInit() {
    this.setupSecurity();
    this.loadSessions();
    const sessions = this.sessions();
    
    if (sessions.length > 0) {
      // Load the most recent session
      this.loadSession(sessions[0].id, false);
    } else {
      // Start a fresh new chat (won't be persisted until first message)
      this.createNewChat(false);
    }
  }

  private setupSecurity() {
    // 1. Block common developer tools keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U
      if (e.ctrlKey && (e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C') || e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        return false;
      }
      // Mac equivalents (Cmd+Opt+I, etc.)
      if (e.metaKey && e.altKey && (e.key === 'i' || e.key === 'j' || e.key === 'c')) {
        e.preventDefault();
        return false;
      }
      return true;
    });

    // 2. Deterrent: Disable right-click context menu
    // Note: This prevents the "Inspect" option, but users can still use Ctrl+C to copy text.
    window.addEventListener('contextmenu', (e) => {
      // We only prevent it if the user isn't holding a specific key or if we want to be strict
      // To allow copying, we could check if there's a selection, but usually blocking the menu is the goal.
      e.preventDefault();
      return false;
    });

    // 3. Deterrent: Debugger trap (optional, can be annoying for devs)
    /*
    setInterval(() => {
      (function() {
        (function a() {
          try {
            (function b(i) {
              if (("" + i / i).length !== 1 || i % 20 === 0) {
                (function() {}).constructor("debugger")();
              } else {
                debugger;
              }
              b(++i);
            })(0);
          } catch (e) {
            setTimeout(a, 5000);
          }
        })();
      })();
    }, 5000);
    */
  }

  async installPwa() {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;
    this.showInstallPrompt.set(false);
  }

  dismissInstall() {
    this.showInstallPrompt.set(false);
  }

  setModel(key: 'fast' | 'core' | 'pro', fromInputMenu = false) {
    if ((key === 'core' || key === 'pro') && !this.authService.isPremium()) {
      if (fromInputMenu) this.showInputModelMenu.set(false);
      // Show premium required modal or open auth modal if not logged in
      if (!this.authService.user()) {
        this.uiService.openAuthModal();
      } else {
        alert(this.t().premiumRequired || 'هذا النموذج متاح فقط للمشتركين في الباقة المميزة. يرجى الترقية.');
        this.uiService.openUpgradeModal('pro'); // Open upgrade modal directly
      }
      return;
    }
    this.modelKey.set(key);
    localStorage.setItem('aman_model', key);
    if (fromInputMenu) {
      this.showInputModelMenu.set(false);
    }
  }
  
  onLoginSuccess() {
    if (this.inputMessage() || this.selectedFile()) {
       this.sendMessage();
    }
  }
  
  async logout() {
    if (this.chatsUnsubscribe) {
      this.chatsUnsubscribe();
      this.chatsUnsubscribe = null;
    }
    this.sessions.set([]);
    await this.authService.logout();
    this.showUserMenu.set(false);
  }

  getUserInitials(name: string): string {
    if (!name) return 'A';
    return name.slice(0, 2).toUpperCase();
  }

  async loadSessions() {
    try {
      // Try loading from IndexedDB first
      const sessions = await this.storageService.getAllSessions();
      
      if (sessions.length > 0) {
        // Sort by timestamp descending
        sessions.sort((a, b) => b.timestamp - a.timestamp);
        this.sessions.set(sessions);
      } else {
        // Fallback to localStorage for migration
        const saved = localStorage.getItem('aman_sessions_v1');
        if (saved && saved !== 'undefined' && saved !== 'null') {
          try {
            const localSessions = JSON.parse(saved);
            if (Array.isArray(localSessions)) {
              this.sessions.set(localSessions);
              // Migrate to IndexedDB
              await this.storageService.saveAllSessions(localSessions);
              // Clear localStorage to free up space
              localStorage.removeItem('aman_sessions_v1');
            }
          } catch (e) {
            console.error('Failed to parse sessions from localStorage', e);
          }
        } else {
          this.sessions.set([]);
        }
      }
    } catch (e) {
      console.error('Failed to load sessions', e);
      this.sessions.set([]);
    }
  }

  async loadRemoteSessions(uid: string) {
    if (this.chatsUnsubscribe) {
      this.chatsUnsubscribe();
    }

    try {
      const chatsRef = collection(this.authService.db, 'users', uid, 'chats');
      
      this.chatsUnsubscribe = onSnapshot(chatsRef, (snapshot) => {
        const remoteSessions: ChatSession[] = [];
        snapshot.forEach(doc => {
          const data = doc.data() as ChatSession;
          if (data.id && data.messages) {
            remoteSessions.push(data);
          }
        });

        if (remoteSessions.length > 0) {
          this.sessions.update(current => {
            const combined = [...current];
            remoteSessions.forEach(r => {
              const idx = combined.findIndex(c => c.id === r.id);
              if (idx >= 0) {
                combined[idx] = r; 
              } else {
                combined.push(r);
              }
            });
            return combined.sort((a,b) => b.timestamp - a.timestamp);
          });
          
          // If the current session was updated remotely, we need to update the local messages signal
          const activeId = this.currentSessionId();
          if (activeId) {
            const updated = remoteSessions.find(s => s.id === activeId);
            if (updated) {
              // Compare messages to avoid infinite loops
              const currentMsgs = JSON.stringify(this.messages());
              const remoteMsgs = JSON.stringify(updated.messages);
              
              if (currentMsgs !== remoteMsgs) {
                console.log('[AppComponent] Remote update detected for active session');
                this.isSyncingFromRemote = true;
                this.messages.set(updated.messages);
                setTimeout(() => this.isSyncingFromRemote = false, 100);
              }
            }
          }
        }
      }, (error) => {
        this.handleFirestoreError(error, OperationType.LIST, `users/${uid}/chats`);
      });
    } catch (e) {
      console.error('Error setting up remote chats listener', e);
    }
  }

  private handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
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
    // Optionally show a toast or error boundary update
    this.uiService.showToast(this.t().error, 'error');
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.activeMenuId.set(null);
  }

  createNewChat(closeSidebar = true) {
    const newId = crypto.randomUUID();
    // We don't add it to this.sessions yet to avoid empty session clutter
    this.currentSessionId.set(newId);
    this.messages.set([]);
    this.processedFunctionCalls.clear();
    this.inputMessage.set('');
    this.selectedFile.set(null);
    this.geminiService.startNewChat(this.currentLang());
    this.abortController = null;
    this.activeMenuId.set(null);
    
    if (this.textarea?.nativeElement) {
      this.textarea.nativeElement.style.height = 'auto';
    }

    if (closeSidebar) this.isSidebarOpen.set(false);
  }

  loadSession(id: string, closeSidebar = true) {
    const session = this.sessions().find(s => s.id === id);
    console.log('Loading session:', session);
    if (session) {
      this.currentSessionId.set(id);
      this.messages.set([...session.messages]);
      this.geminiService.startNewChat(this.currentLang()); 
      if (closeSidebar) this.isSidebarOpen.set(false);
      this.scrollToBottom();
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

  async deleteSession(event: Event, id: string) {
    event.stopPropagation();
    this.activeMenuId.set(null);
    if(confirm(this.t().deleteConfirm)) {
      this.sessions.update(prev => prev.filter(s => s.id !== id));
      this.storageService.deleteSession(id); // Delete from IndexedDB
      
      // Delete from Firestore if user is logged in
      const user = this.authService.user();
      if (user) {
        try {
          const chatDocRef = doc(this.authService.db, 'users', user.uid, 'chats', id);
          await deleteDoc(chatDocRef);
          console.log(`[AppComponent] Deleted remote session: ${id}`);
        } catch (e) {
          console.error(`[AppComponent] Failed to delete remote session: ${id}`, e);
        }
      }

      if (this.currentSessionId() === id) {
        if (this.sessions().length > 0) {
          this.loadSession(this.sessions()[0].id, false);
        } else {
          this.createNewChat(false);
        }
      }
      if (this.sessions().length === 0) {
        localStorage.removeItem('aman_sessions_v1'); // Just in case
      }
    }
  }

  toggleMenu(event: Event, id: string) {
    event.stopPropagation();
    this.activeMenuId.set(this.activeMenuId() === id ? null : id);
  }

  exportSession(event: Event, session: ChatSession) {
    event.stopPropagation();
    this.activeMenuId.set(null);
    const content = session.messages.map(m => `${m.role === 'user' ? 'User' : 'Aman'}: ${m.text}`).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title || 'chat'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  toggleSelectionMode() {
    this.isSelectionMode.update(v => !v);
    this.selectedSessionIds.set(new Set());
  }

  toggleSessionSelection(event: Event, id: string) {
    event.stopPropagation();
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

  async deleteSelectedSessions() {
    const idsToDelete = Array.from(this.selectedSessionIds());
    if (idsToDelete.length === 0) return;

    if (confirm(this.t().deleteSelectedConfirm)) {
      this.sessions.update(prev => prev.filter(s => !idsToDelete.includes(s.id)));
      
      // Delete from Firestore if user is logged in
      const user = this.authService.user();
      if (user) {
        const batch = writeBatch(this.authService.db);
        idsToDelete.forEach(id => {
          const chatDocRef = doc(this.authService.db, 'users', user.uid, 'chats', id);
          batch.delete(chatDocRef);
        });
        try {
          await batch.commit();
          console.log(`[AppComponent] Deleted ${idsToDelete.length} remote sessions`);
        } catch (e) {
          console.error('[AppComponent] Failed to delete remote sessions batch', e);
        }
      }

      for (const id of idsToDelete) {
        this.storageService.deleteSession(id);
      }
      
      if (idsToDelete.includes(this.currentSessionId())) {
        if (this.sessions().length > 0) {
          this.loadSession(this.sessions()[0].id, false);
        } else {
          this.createNewChat(false);
        }
      }
      
      if (this.sessions().length === 0) {
        localStorage.removeItem('aman_sessions_v1');
      }

      this.isSelectionMode.set(false);
      this.selectedSessionIds.set(new Set());
    }
  }

  startVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = this.currentLang() === 'ar' ? 'ar-SA' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      this.isListening.set(true);
    };

    recognition.onend = () => {
      this.isListening.set(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      this.inputMessage.set(this.inputMessage() + ' ' + transcript);
      if (this.textarea?.nativeElement) {
         this.textarea.nativeElement.style.height = 'auto';
         this.textarea.nativeElement.style.height = Math.min(this.textarea.nativeElement.scrollHeight, 150) + 'px';
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech error', event.error);
      this.isListening.set(false);
    };

    recognition.start();
  }

  openLiveView() {
    // If current session has messages, create a new one for the live chat
    if (this.messages().length > 0) {
      this.createNewChat();
    }
    
    // Ensure we have an active session before opening live view
    const currentId = this.currentSessionId();
    const sessions = this.sessions();
    if (!sessions.some(s => s.id === currentId)) {
      const newSession: ChatSession = {
        id: currentId,
        title: this.currentLang() === 'ar' ? 'محادثة مباشرة' : 'Live Chat',
        messages: [],
        timestamp: Date.now()
      };
      this.sessions.update(prev => [newSession, ...prev]);
    }
    this.uiService.openLiveView(); 
  }

  toggleSidebar() {
    this.isSidebarOpen.update(v => !v);
  }

  scrollToBottom() {
    requestAnimationFrame(() => {
      if (this.scrollContainer?.nativeElement) {
        this.scrollContainer.nativeElement.scrollTo({
          top: this.scrollContainer.nativeElement.scrollHeight,
          behavior: 'auto'
        });
      }
    });
  }

  usePrompt(text: string) {
    this.inputMessage.set(text);
    setTimeout(() => {
      if (this.textarea?.nativeElement) {
        this.textarea.nativeElement.focus();
        this.textarea.nativeElement.style.height = 'auto';
        this.textarea.nativeElement.style.height = Math.min(this.textarea.nativeElement.scrollHeight, 150) + 'px';
      }
    }, 0);
  }

  updateInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.inputMessage.set(target.value);
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, 150) + 'px';
  }

  triggerFileUpload() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const base64Data = (e.target?.result as string).split(',')[1];
        const user = this.authService.user();
        if (user) {
          this.logger.log({
            uid: user.uid,
            email: user.email || '',
            type: 'file',
            content: { name: file.name, mimeType: file.type, size: file.size }
          });
        }
        this.selectedFile.set({
          name: file.name,
          mimeType: file.type,
          data: base64Data,
          previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
        });
        input.value = '';
      };
      reader.readAsDataURL(file);
    }
  }

  clearFile() {
    this.selectedFile.set(null);
  }

  stopGeneration() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
      this.messageSubscription = null;
    }
    this.isLoading.set(false);
    this.syncChatToFirestore();
  }

  async handleLiveChatAction(action: { name: string, args: any }) {
    console.log('[AppComponent] Handling Live Chat Action:', action);
    
    if (action.name === 'generateImage') {
      this.generateImage.set(true);
      this.inputMessage.set(action.args.prompt);
      this.sendMessage();
    } else if (action.name === 'getUserLocation' || action.name === 'searchLocation') {
      // For these, we can just call handleFunctionCall directly
      this.handleFunctionCall(action);
    }
  }

  async handleFunctionCall(call: any) {
    const callId = call.id || `${call.name}-${JSON.stringify(call.args)}`;
    if (this.processedFunctionCalls.has(callId)) return;
    this.processedFunctionCalls.add(callId);

    if (call.name === 'generateImage') {
      const prompt = call.args.prompt;
      
      this.isLoading.set(true);
      
      const imageMsgId = crypto.randomUUID();
      let actualTargetId: string = imageMsgId;
      
      this.messages.update(msgs => {
        const newMsgs = [...msgs];
        const lastModelIdx = newMsgs.map(m => m.role).lastIndexOf('model');
        if (lastModelIdx !== -1 && !newMsgs[lastModelIdx].text && !newMsgs[lastModelIdx].generatedImages) {
          newMsgs[lastModelIdx] = { ...newMsgs[lastModelIdx], generatedImages: [{ url: null, mimeType: 'image/png', isPending: true }] };
          actualTargetId = newMsgs[lastModelIdx].id;
        } else {
          newMsgs.push({ id: imageMsgId, role: 'model', text: '', generatedImages: [{ url: null, mimeType: 'image/png', isPending: true }] });
        }
        return newMsgs;
      });
      this.syncChatToFirestore();

      try {
        const user = this.authService.user();
        const images = await this.geminiService.generateImageDirect(prompt, user?.uid || 'anonymous', user?.email || 'anonymous');

        if (images && images.length > 0) {
          // Upload images to Firebase Storage immediately
          const updatedImages = [];
          if (user) {
             for (const img of images) {
                if (img.url && img.url.startsWith('data:')) {
                   try {
                      const result = await this.authService.processAndUploadImage(user.uid, img.url, img.mimeType);
                      if (result.url) {
                         if (result.blob) {
                            this.imageService.cacheBlob(result.url, result.blob);
                         }
                         updatedImages.push({ ...img, url: result.url, isPending: false });
                      } else {
                         updatedImages.push({ ...img, isPending: false });
                      }
                   } catch (e) {
                      updatedImages.push({ ...img, isPending: false });
                   }
                } else {
                   updatedImages.push({ ...img, isPending: false });
                }
             }
          } else {
             updatedImages.push(...images.map((img: any) => ({ ...img, isPending: false })));
          }

          this.messages.update(msgs => {
            const newMsgs = [...msgs];
            const targetIdx = newMsgs.findIndex(m => m.id === actualTargetId);
            if (targetIdx !== -1) {
              newMsgs[targetIdx] = { ...newMsgs[targetIdx], generatedImages: updatedImages };
            }
            
            newMsgs.push({
              id: crypto.randomUUID(),
              role: 'user',
              text: '',
              isHidden: true,
              functionResponse: {
                name: call.name,
                response: { success: true, message: 'Image generated successfully and shown to the user.' }
              }
            });
            return newMsgs;
          });

          this.sendFunctionResponse(call.name, { success: true, message: 'Image generated successfully and shown to the user.' });
          
        } else {
          this.messages.update(msgs => {
            const newMsgs = [...msgs];
            const targetIdx = newMsgs.findIndex(m => m.id === actualTargetId);
            if (targetIdx !== -1) {
              newMsgs[targetIdx] = { ...newMsgs[targetIdx], generatedImages: undefined, text: 'عذراً، لم أتمكن من توليد الصورة.', isError: true };
            }
            return newMsgs;
          });
          this.sendFunctionResponse(call.name, { error: 'Failed to generate image' });
        }
      } catch (err) {
        this.messages.update(msgs => {
          const newMsgs = [...msgs];
          const targetIdx = newMsgs.findIndex(m => m.id === actualTargetId);
          if (targetIdx !== -1) {
            newMsgs[targetIdx] = { ...newMsgs[targetIdx], generatedImages: undefined, text: 'حدث خطأ أثناء محاولة رسم الصورة.', isError: true };
          }
          return newMsgs;
        });
        this.sendFunctionResponse(call.name, { error: 'Error generating image' });
      }
      return;
    }

    if (call.name === 'getUserLocation') {
      this.isLoading.set(true);
      const tempId = crypto.randomUUID();
      this.messages.update(msgs => [...msgs, { id: tempId, role: 'system', text: this.t().locationRequested }]);
      
      if (!navigator.geolocation) {
        this.updateSystemMessage(tempId, this.t().locationError);
        this.sendFunctionResponse(call.name, { error: 'Geolocation not supported' });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          this.messages.update(msgs => msgs.filter(m => m.id !== tempId));
          
          // Add location data to the last model message or create a new one
          this.messages.update(msgs => {
            const newMsgs = [...msgs];
            const lastModelIdx = newMsgs.map(m => m.role).lastIndexOf('model');
            if (lastModelIdx !== -1) {
              newMsgs[lastModelIdx] = { ...newMsgs[lastModelIdx], location: { lat, lng, label: 'موقعك الحالي' } };
            } else {
              newMsgs.push({ id: crypto.randomUUID(), role: 'model', text: '', location: { lat, lng, label: 'موقعك الحالي' } });
            }
            
            // Add the function response message
            newMsgs.push({
              id: crypto.randomUUID(),
              role: 'user',
              text: '',
              isHidden: true,
              functionResponse: {
                name: call.name,
                response: { latitude: lat, longitude: lng }
              }
            });
            return newMsgs;
          });
          
          this.sendFunctionResponse(call.name, { latitude: lat, longitude: lng });
        },
        (err) => {
          let errMsg = this.t().locationError;
          if (err.code === 1) errMsg = this.t().locationDenied;
          this.updateSystemMessage(tempId, errMsg);
          
          this.messages.update(msgs => {
            const newMsgs = [...msgs];
            newMsgs.push({
              id: crypto.randomUUID(),
              role: 'user',
              text: '',
              isHidden: true,
              functionResponse: {
                name: call.name,
                response: { error: errMsg }
              }
            });
            return newMsgs;
          });

          this.sendFunctionResponse(call.name, { error: errMsg });
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else if (call.name === 'searchLocation') {
      console.log('searchLocation called with:', call.args);
      const query = call.args.query;
      this.isLoading.set(true);
      const tempId = crypto.randomUUID();
      this.messages.update(msgs => [...msgs, { id: tempId, role: 'system', text: `جاري البحث عن "${query}"...` }]);

      try {
        const apiKey = this.authService.systemSettings()?.mapsApiKey;
        let lat, lng, label;

        if (apiKey) {
          const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`);
          const data = await res.json();
          if (data.status === 'OK' && data.results.length > 0) {
            lat = data.results[0].geometry.location.lat;
            lng = data.results[0].geometry.location.lng;
            label = data.results[0].formatted_address.split(',')[0];
          }
        }

        if (!lat) {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`, {
            headers: { 'User-Agent': 'AmanAI-App/1.0' }
          });
          const data = await response.json();
          if (data && data.length > 0) {
            lat = parseFloat(data[0].lat);
            lng = parseFloat(data[0].lon);
            label = data[0].display_name.split(',')[0];
          }
        }

        if (lat && lng) {
          this.messages.update(msgs => msgs.filter(m => m.id !== tempId));

          this.messages.update(msgs => {
            const newMsgs = [...msgs];
            const lastModelIdx = newMsgs.map(m => m.role).lastIndexOf('model');
            if (lastModelIdx !== -1) {
              newMsgs[lastModelIdx] = { ...newMsgs[lastModelIdx], location: { lat, lng, label } };
            } else {
              newMsgs.push({ id: crypto.randomUUID(), role: 'model', text: '', location: { lat, lng, label } });
            }
            
            newMsgs.push({
              id: crypto.randomUUID(),
              role: 'user',
              text: '',
              isHidden: true,
              functionResponse: {
                name: call.name,
                response: { latitude: lat, longitude: lng, label }
              }
            });
            return newMsgs;
          });

          this.sendFunctionResponse(call.name, { latitude: lat, longitude: lng, label });
        } else {
          this.updateSystemMessage(tempId, `لم يتم العثور على موقع باسم "${query}"`);
          this.sendFunctionResponse(call.name, { error: 'Location not found' });
        }
      } catch (err) {
        this.updateSystemMessage(tempId, 'حدث خطأ أثناء البحث عن الموقع');
        this.sendFunctionResponse(call.name, { error: 'Search failed' });
      }
    } else if (call.name === 'getDirections') {
      const origin = call.args.originQuery;
      const dest = call.args.destinationQuery;
      this.isLoading.set(true);
      const tempId = crypto.randomUUID();
      this.messages.update(msgs => [...msgs, { id: tempId, role: 'system', text: `جاري البحث عن المسار من "${origin}" إلى "${dest}"...` }]);

      try {
        const apiKey = this.authService.systemSettings()?.mapsApiKey;
        let originLat, originLng, originLabel;
        if (origin.toLowerCase().includes('current') || origin.includes('حالي') || origin.includes('موقعي')) {
           const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
             navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, enableHighAccuracy: true });
           });
           originLat = pos.coords.latitude;
           originLng = pos.coords.longitude;
           originLabel = 'موقعك الحالي';
        } else {
           if (apiKey) {
             const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(origin)}&key=${apiKey}`);
             const data = await res.json();
             if (data.status === 'OK' && data.results.length > 0) {
               originLat = data.results[0].geometry.location.lat;
               originLng = data.results[0].geometry.location.lng;
               originLabel = data.results[0].formatted_address.split(',')[0];
             }
           }
           
           if (!originLat) {
             const res1 = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(origin)}`, {
               headers: { 'User-Agent': 'AmanAI-App/1.0' }
             });
             const data1 = await res1.json();
             if (data1 && data1.length > 0) {
               originLat = parseFloat(data1[0].lat);
               originLng = parseFloat(data1[0].lon);
               originLabel = data1[0].display_name.split(',')[0];
             } else {
               throw new Error(`Origin not found: ${origin}`);
             }
           }
        }

        let destLat, destLng, destLabel;
        if (apiKey) {
          const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(dest)}&key=${apiKey}`);
          const data = await res.json();
          if (data.status === 'OK' && data.results.length > 0) {
            destLat = data.results[0].geometry.location.lat;
            destLng = data.results[0].geometry.location.lng;
            destLabel = data.results[0].formatted_address.split(',')[0];
          }
        }

        if (!destLat) {
          const res2 = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(dest)}`, {
            headers: { 'User-Agent': 'AmanAI-App/1.0' }
          });
          const data2 = await res2.json();
          if (data2 && data2.length > 0) {
             destLat = parseFloat(data2[0].lat);
             destLng = parseFloat(data2[0].lon);
             destLabel = data2[0].display_name.split(',')[0];
          } else {
             throw new Error(`Destination not found: ${dest}`);
          }
        }

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

        this.messages.update(msgs => msgs.filter(m => m.id !== tempId));

        this.messages.update(msgs => {
          const newMsgs = [...msgs];
          const lastModelIdx = newMsgs.map(m => m.role).lastIndexOf('model');
          const routeData = {
             origin: { lat: originLat, lng: originLng, label: originLabel },
             destination: { lat: destLat, lng: destLng, label: destLabel },
             distance: distanceText,
             duration: durationText
          };
          if (lastModelIdx !== -1) {
            newMsgs[lastModelIdx] = { ...newMsgs[lastModelIdx], route: routeData };
          } else {
            newMsgs.push({ id: crypto.randomUUID(), role: 'model', text: '', route: routeData });
          }
          
          newMsgs.push({
            id: crypto.randomUUID(),
            role: 'user',
            text: '',
            isHidden: true,
            functionResponse: {
              name: call.name,
              response: { success: true, origin: routeData.origin, destination: routeData.destination, distance: distanceText, duration: durationText }
            }
          });
          return newMsgs;
        });

        this.sendFunctionResponse(call.name, { success: true, origin: { lat: originLat, lng: originLng }, destination: { lat: destLat, lng: destLng }, distance: distanceText, duration: durationText });
      } catch (err: any) {
        let errorMsg = 'حدث خطأ أثناء البحث عن المسار';
        if (err.message?.includes('Origin not found')) errorMsg = `لم يتم العثور على نقطة الانطلاق: ${origin}`;
        if (err.message?.includes('Destination not found')) errorMsg = `لم يتم العثور على وجهة الوصول: ${dest}`;
        this.updateSystemMessage(tempId, errorMsg);
        this.sendFunctionResponse(call.name, { error: err.message || 'Route search failed' });
      }
    }
  }

  updateSystemMessage(id: string, text: string) {
    this.messages.update(msgs => msgs.map(m => m.id === id ? { ...m, text } : m));
  }

  async sendFunctionResponse(name: string, response: any) {
    let receivedFunctionCall = false;

    this.messages.update(prev => [...prev, { id: crypto.randomUUID(), role: 'model', text: '' }]);

    this.messageSubscription = this.geminiService.sendMessage(
      this.messages(),
      this.authService.userPlan(),
      undefined,
      {
        modelKey: this.modelKey(),
        userProfile: this.userProfile(),
        webSearch: this.useWebSearch(),
        generateImage: this.generateImage(),
        toolResponse: { name, response },
        uid: this.authService.user()?.uid,
        email: this.authService.user()?.email || ''
      }
    ).subscribe({
      next: (res) => {
        if (res.functionCall) {
          receivedFunctionCall = true;
          this.messages.update(msgs => {
            const newMsgs = [...msgs];
            const lastModelIdx = newMsgs.map(m => m.role).lastIndexOf('model');
            if (lastModelIdx !== -1) {
              newMsgs[lastModelIdx] = { ...newMsgs[lastModelIdx], functionCall: res.functionCall };
            }
            return newMsgs;
          });
          this.syncChatToFirestore();
          this.handleFunctionCall(res.functionCall);
          return;
        }
        
        this.messages.update(msgs => {
          const newMsgs = [...msgs];
          const lastModelIdx = newMsgs.map(m => m.role).lastIndexOf('model');
          if (lastModelIdx !== -1) {
            const currentMsg = newMsgs[lastModelIdx];
            let updatedMsg = { ...currentMsg };
            if (res.textChunk !== undefined) {
              updatedMsg.text = (updatedMsg.text || '') + res.textChunk;
            } else if (res.finalText !== undefined) {
              updatedMsg.text = res.finalText;
            }
            newMsgs[lastModelIdx] = updatedMsg;
          }
          return newMsgs;
        });
        this.scrollToBottom();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.syncChatToFirestore();
      },
      complete: () => {
        if (receivedFunctionCall) return;
        this.isLoading.set(false);
        this.generateImage.set(false); // Reset after tool response
        this.scrollToBottom();
        this.syncChatToFirestore();
      }
    });
  }

  async sendMessage() {
    console.log('sendMessage called');
    if (this.isSending) return;
    this.isSending = true;

    if (!this.authService.user()) {
      console.log('User not logged in, opening auth modal');
      this.uiService.openAuthModal();
      this.isSending = false;
      return;
    }

    const text = this.inputMessage().trim();
    const file = this.selectedFile();
    if ((!text && !file) || this.isLoading()) {
      console.log('Message is empty or loading is true. text:', text, 'file:', file, 'isLoading:', this.isLoading());
      this.isSending = false;
      return;
    }

    // Clear input and show loading immediately for better UX
    this.inputMessage.set('');
    this.selectedFile.set(null);
    this.isLoading.set(true);
    if (this.textarea?.nativeElement) this.textarea.nativeElement.style.height = 'auto';
    this.scrollToBottom();

    // Auto-detect intent based on keywords
    const textLower = text.toLowerCase();
    
    let preFetchedLocation: { lat: number, lng: number } | undefined;
      try {
        // Only pre-fetch if specifically asking for *current* location
        const currentLocationKeywords = ['اين انا', 'أين أنا', 'موقعي', 'مكاني', 'وين انا', 'وينني'];
        if (currentLocationKeywords.some(k => text.includes(k))) {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, enableHighAccuracy: true });
          });
          preFetchedLocation = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          };
          console.log('Pre-fetched location:', preFetchedLocation);
        }
      } catch (err) {
        console.warn('Could not pre-fetch location:', err);
      }

    // Determine final mode based on explicit UI toggles
    let useImageModel = this.generateImage();
    let useWebSearch = this.useWebSearch();
    
    // If image generation is requested, disable web search to avoid tool conflict
    if (useImageModel) {
      useWebSearch = false;
    }
    
    // Reset the image toggle for the NEXT message so it doesn't stick
    this.generateImage.set(false);

    const isPremium = this.authService.isPremium();
    
    let estimatedTokens = 0;

    if (isPremium) {
      estimatedTokens = 0; // Premium users have no limits, so we skip the expensive count check
    } else {
      // For free users, use accurate token counting from Gemini API
      const tempMsg: ChatMessage = {
        id: 'temp-count',
        role: 'user',
        text: text,
        fileData: file ? { name: file.name, mimeType: file.mimeType, data: file.data } : undefined
      };
      
      // We need to count the whole context that will be sent
      const historyToCount = [...this.messages(), tempMsg];
      
      try {
        const inputTokens = await this.geminiService.countTokens(historyToCount, { 
          modelKey: this.modelKey(), 
          generateImage: useImageModel 
        });
        // Add buffer for output (e.g. 800 tokens)
        estimatedTokens = inputTokens + 800;
        console.log('Accurate token count:', inputTokens, 'Total estimated:', estimatedTokens);
      } catch (e) {
        console.warn('Token counting failed, falling back to estimation', e);
        estimatedTokens = Math.ceil(text.length / 4) + (file ? 1000 : 0) + 1000;
      }
    }

    const allowed = await this.authService.checkAndIncrementUsage(estimatedTokens);

    if (!allowed) {
      console.log('Usage limit reached');
      this.isLimitExceeded.set(true);
      this.isLoading.set(false); // Reset loading if not allowed
      return;
    }

    console.log('Sending message...');
    const msgId = crypto.randomUUID();
    
    // Ensure session exists in the list before sending
    const id = this.currentSessionId();
    const sessions = this.sessions();
    if (!sessions.some(s => s.id === id)) {
      const newSession: ChatSession = {
        id: id,
        title: this.currentLang() === 'ar' ? 'محادثة جديدة' : 'New Chat',
        messages: [],
        timestamp: Date.now()
      };
      this.sessions.update(prev => [newSession, ...prev]);
      this.syncChatToFirestore(newSession);
    }

    // Upload user file to Firebase Storage in the background if it exists
    if (file) {
      const user = this.authService.user();
      if (user) {
        this.authService.processAndUploadImage(user.uid, file.data, file.mimeType, false).then(result => {
          if (result.url) {
            this.messages.update(msgs => msgs.map(m => 
              m.id === msgId ? { ...m, fileData: { ...m.fileData!, url: result.url } } : m
            ));
            this.syncChatToFirestore();
          }
        });
      }
    }

    this.messages.update(prev => [
      ...prev,
      { id: msgId, role: 'user', text: text, fileData: file ? { name: file.name, mimeType: file.mimeType, data: file.data } : undefined }
    ]);

    // Add a placeholder for the model's response immediately
    const placeholderImages = useImageModel ? [{ url: null, mimeType: 'image/png', isPending: true }] : undefined;
    this.messages.update(prev => [...prev, { id: crypto.randomUUID(), role: 'model', text: '', generatedImages: placeholderImages }]);

    const currentHistory = this.messages(); // Get the updated history including the placeholder

    this.abortController = new AbortController();
    
    let receivedFunctionCall = false;

    this.messageSubscription = this.geminiService.sendMessage(
      currentHistory,
      this.authService.userPlan(),
      this.abortController.signal,
      {
        modelKey: this.modelKey(),
        userProfile: this.authService.userProfile(),
        webSearch: useWebSearch, // Use the determined webSearch state
        generateImage: useImageModel,
        location: preFetchedLocation,
        uid: this.authService.user()?.uid,
        email: this.authService.user()?.email || ''
      }
    ).subscribe({
      next: (response) => {
        if (response.functionCall) {
          receivedFunctionCall = true;
          console.log('Received function call from Gemini:', response.functionCall);
          this.messages.update(msgs => {
            const newMsgs = [...msgs];
            const lastModelIdx = newMsgs.map(m => m.role).lastIndexOf('model');
            if (lastModelIdx !== -1) {
              newMsgs[lastModelIdx] = { ...newMsgs[lastModelIdx], functionCall: response.functionCall };
            }
            return newMsgs;
          });
          this.syncChatToFirestore(); // Sync after function call update
          this.handleFunctionCall(response.functionCall);
          return;
        }
        this.messages.update(msgs => {
          const newMsgs = [...msgs];
          // Find the last model message to update
          const lastModelIdx = newMsgs.map(m => m.role).lastIndexOf('model');
          
          if (lastModelIdx !== -1) {
            const currentMsg = newMsgs[lastModelIdx];
            let updatedMsg = { ...currentMsg };
            
            if (response.textChunk !== undefined) {
              updatedMsg.text = (updatedMsg.text || '') + response.textChunk;
            } else if (response.finalText !== undefined) {
              updatedMsg.text = response.finalText;
            }

            // Check if this message should be hidden (e.g. it's a refusal we're about to fallback from)
            if (!useImageModel && updatedMsg.text) {
              const lowerText = updatedMsg.text.toLowerCase();
              const cannotGeneratePatterns = [
                'لا أستطيع توليد صور', 'لا يمكنني رسم', 'أنا نموذج لغوي', 'لا أملك القدرة على إنشاء صور', 'لا أستطيع إنشاء صور',
                'i cannot generate images', 'i am a text-based ai', 'i don\'t have the ability to create images', 'i cannot draw', 'i can\'t generate images'
              ];
              const willGeneratePatterns = [
                'سأقوم بتوليد صورة', 'إليك الرسمة', 'جاري إنشاء الصورة', 'سأرسم لك',
                'i will generate an image', 'here is your drawing', 'generating image', 'i will draw'
              ];
              
              if (cannotGeneratePatterns.some(p => lowerText.includes(p)) || willGeneratePatterns.some(p => lowerText.includes(p))) {
                // If the user's message had image intent, we hide this message because we will re-trigger
                const lastUserMsg = newMsgs.filter(m => m.role === 'user').pop();
                if (lastUserMsg) {
                  const userTextLower = lastUserMsg.text.toLowerCase();
                  const imageKeywords = ['رسم', 'ارسم', 'صورة', 'صور', 'توليد', 'انشاء', 'تخيل', 'draw', 'generate', 'image', 'picture', 'photo', 'create', 'imagine'];
                  if (imageKeywords.some(k => userTextLower.includes(k))) {
                    updatedMsg.isHidden = true;
                  }
                }
              }
            }
            
            // Handle Policy Errors explicitly
            if (updatedMsg.text && updatedMsg.text.includes('ERROR_POLICY:')) {
               updatedMsg.isError = true;
               updatedMsg.text = updatedMsg.text.replace('ERROR_POLICY:', '').trim();
               updatedMsg.generatedImages = undefined; // Clear pending image
            }

            if (response.images) {
              updatedMsg.generatedImages = response.images;
            }
            newMsgs[lastModelIdx] = updatedMsg;
          }
          return newMsgs;
        });
        this.syncChatToFirestore(); // Sync after each chunk for real-time persistence
        this.scrollToBottom();
      },
      error: (error) => {
        console.error('Action failed', error);
        const errText = error.message || this.t().error;
        this.messages.update(msgs => {
          const last = msgs[msgs.length - 1];
          if (last.role === 'model' && !last.text) {
            const newMsgs = [...msgs];
            newMsgs[newMsgs.length - 1] = { id: crypto.randomUUID(), role: 'system', text: errText, isError: true };
            return newMsgs;
          }
          return [...msgs, { id: crypto.randomUUID(), role: 'system', text: errText, isError: true }];
        });
        this.isLoading.set(false);
        this.isSending = false;
        this.messageSubscription = null;
        this.scrollToBottom();
        this.syncChatToFirestore();
      },
      complete: async () => {
        this.isSending = false;
        if (receivedFunctionCall) {
          return;
        }

        const currentMessages = this.messages();
        const lastModelMsg = currentMessages[currentMessages.length - 1];
        const lastUserMsg = currentMessages.filter(m => m.role === 'user').pop();

        // Fallback Logic: If the model says it can't generate images but the user asked for one
        if (!this.generateImage() && lastModelMsg?.role === 'model' && lastModelMsg.text && lastUserMsg) {
          const textLower = lastModelMsg.text.toLowerCase();
          const cannotGeneratePatterns = [
            'لا أستطيع توليد صور', 'لا يمكنني رسم', 'أنا نموذج لغوي', 'لا أملك القدرة على إنشاء صور', 'لا أستطيع إنشاء صور',
            'i cannot generate images', 'i am a text-based ai', 'i don\'t have the ability to create images', 'i cannot draw', 'i can\'t generate images'
          ];

          const willGeneratePatterns = [
            'سأقوم بتوليد صورة', 'إليك الرسمة', 'جاري إنشاء الصورة', 'سأرسم لك', '[طلب توليد صورة:', 'توليد صورة:',
            'i will generate an image', 'here is your drawing', 'generating image', 'i will draw', '[generate_image:', 'generate image:'
          ];
          
          const userTextLower = lastUserMsg.text.toLowerCase();
          const imageKeywords = ['رسم', 'ارسم', 'صورة', 'صور', 'توليد', 'انشاء', 'تخيل', 'بدي', 'أريد', 'اريد', 'draw', 'generate', 'image', 'picture', 'photo', 'create', 'imagine'];
          const userHadImageIntent = imageKeywords.some(k => userTextLower.includes(k));

          const modelClaimedFailure = cannotGeneratePatterns.some(p => textLower.includes(p));
          const modelClaimedSuccessButNoTool = willGeneratePatterns.some(p => textLower.includes(p));

          if (userHadImageIntent && (modelClaimedFailure || modelClaimedSuccessButNoTool)) {
            console.log('Model response suggests image intent but no tool was called. Re-triggering...');
            
            // Try to extract a better prompt from the model's hallucinated tool call if present
            let refinedPrompt = lastUserMsg.text;
            const toolCallMatch = lastModelMsg.text.match(/\[طلب توليد صورة:\s*([^\]]+)\]/i) || 
                               lastModelMsg.text.match(/\[generate_image:\s*([^\]]+)\]/i);
            if (toolCallMatch && toolCallMatch[1]) {
              refinedPrompt = toolCallMatch[1].trim();
              console.log('Extracted refined prompt from model response:', refinedPrompt);
            }

            // Remove the model message
            this.messages.update(msgs => msgs.slice(0, -1));
            
            // Re-send with image mode enabled
            this.generateImage.set(true);
            this.inputMessage.set(refinedPrompt);
            this.sendMessage();
            return;
          }
        }

        // Check if we expected an image but got none
        if (this.generateImage()) {
           const lastMsg = this.messages()[this.messages().length - 1];
           const hasRealImages = lastMsg.generatedImages && lastMsg.generatedImages.some(img => img.url !== null);
           if (lastMsg.role === 'model' && !hasRealImages) {
             // We expected an image but didn't get one.
             // Only add the error message if the model didn't provide a text explanation
             if (!lastMsg.text || lastMsg.text.trim().length < 5) {
               this.messages.update(msgs => {
                 const newMsgs = [...msgs];
                 newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], generatedImages: undefined };
                 newMsgs.push({ 
                   id: crypto.randomUUID(), 
                   role: 'system', 
                   text: this.currentLang() === 'ar' ? 'لم يتم إنشاء الصورة. قد يكون الوصف مخالفاً لسياسات المحتوى أو غير واضح.' : 'Image was not generated. The description might be unclear or violate content policies.',
                   isError: true 
                 });
                 return newMsgs;
               });
             } else {
               this.messages.update(msgs => {
                 const newMsgs = [...msgs];
                 newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], generatedImages: undefined };
                 return newMsgs;
               });
             }
           }
        }

        this.scrollToBottom();

        // Upload generated images to Firebase Storage if any
        const user = this.authService.user();
        if (user) {
          try {
            let lastModelMessage: ChatMessage | undefined;
            const currentMessages = this.messages();
            for (let i = currentMessages.length - 1; i >= 0; i--) {
              if (currentMessages[i].role === 'model') {
                lastModelMessage = currentMessages[i];
                break;
              }
            }

            if (lastModelMessage && lastModelMessage.generatedImages && lastModelMessage.generatedImages.length > 0) {
              const updatedImages = [];
              for (const img of lastModelMessage.generatedImages) {
                if (img.url && img.url.startsWith('data:')) { 
                  try {
                    const result = await this.authService.processAndUploadImage(user.uid, img.url, img.mimeType);
                    if (result.url) {
                      if (result.blob) {
                        this.imageService.cacheBlob(result.url, result.blob);
                      }
                      updatedImages.push({ ...img, url: result.url, isPending: false });
                    } else if (result.localDataUrl) {
                      updatedImages.push({ ...img, url: result.localDataUrl, isPending: false });
                    } else {
                      updatedImages.push({ ...img, isPending: false });
                    }
                  } catch (uploadErr) {
                    console.error('Image upload failed:', uploadErr);
                    updatedImages.push({ ...img, isPending: false });
                  }
                } else {
                  updatedImages.push({ ...img, isPending: false });
                }
              }
              // Update the message with new URLs
              this.messages.update(msgs => msgs.map(msg => 
                msg.id === lastModelMessage!.id ? { ...msg, generatedImages: updatedImages } : msg
              ));
              this.syncChatToFirestore(); // Sync after images are uploaded and URLs updated
            }
          } catch (e) {
            console.error('Failed to process generated images:', e);
          }
        } else {
          // For anonymous users, just set isPending to false
          let lastModelMessage: ChatMessage | undefined;
          const currentMessages = this.messages();
          for (let i = currentMessages.length - 1; i >= 0; i--) {
            if (currentMessages[i].role === 'model') {
              lastModelMessage = currentMessages[i];
              break;
            }
          }
          if (lastModelMessage && lastModelMessage.generatedImages && lastModelMessage.generatedImages.length > 0) {
            const updatedImages = lastModelMessage.generatedImages.map(img => ({ ...img, isPending: false }));
            this.messages.update(msgs => msgs.map(msg => 
              msg.id === lastModelMessage!.id ? { ...msg, generatedImages: updatedImages } : msg
            ));
          }
        }
        
        this.isLoading.set(false);
        this.messageSubscription = null;
        this.syncChatToFirestore();
      }
    });
  }

  handleKeydown(event: KeyboardEvent) {
    console.log('handleKeydown triggered', event.key);
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
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

  async syncChatToFirestore(sessionOverride?: ChatSession) {
    const user = this.authService.user();
    if (!user || this.isSyncingFromRemote) return;

    try {
      const sessionId = this.currentSessionId();
      const session = sessionOverride || this.sessions().find(s => s.id === sessionId);
      if (!session) return;

      const currentMessages = this.messages();

      const db = this.authService.db;
      const path = `users/${user.uid}/chats/${sessionId}`;
      const chatDocRef = doc(db, path);
      
      // Deep clean messages for Firestore
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
          // Explicitly exclude base64 data
        }

        if (msg.generatedImages && msg.generatedImages.length > 0) {
          clean.generatedImages = msg.generatedImages.map(img => {
            // Check if URL is base64 data to prevent Firestore document size limit errors
            if (img.url && img.url.startsWith('data:')) {
              return {
                url: null, // Do not save base64 to Firestore
                mimeType: img.mimeType,
                alt: img.alt || null,
                isPending: true // Flag to indicate image is pending upload or failed
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

      await setDoc(chatDocRef, {
        id: sessionId,
        title: session.title,
        timestamp: session.timestamp,
        messages: cleanMessages,
        updatedAt: new Date().toISOString()
      }, { merge: true });

    } catch (error) {
      const sessionId = this.currentSessionId();
      const user = this.authService.user();
      this.handleFirestoreError(error, OperationType.WRITE, `users/${user?.uid}/chats/${sessionId}`);
    }
  }

  async loadProfile() {
    const user = this.authService.user();
    if (!user) return;

    const savedProfile = localStorage.getItem(`aman_profile_${user.uid}`);
    if (savedProfile) {
      const parsed = JSON.parse(savedProfile);
      this.userProfile.set(parsed);
      this.profileForm.set(parsed);
    }

    const remoteProfile = await this.authService.loadUserProfile(user.uid);
    if (remoteProfile) {
      this.userProfile.set(remoteProfile);
      this.profileForm.set(remoteProfile);
      localStorage.setItem(`aman_profile_${user.uid}`, JSON.stringify(remoteProfile));
    }
  }
}
