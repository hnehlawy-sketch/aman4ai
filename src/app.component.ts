import { Component, ElementRef, ViewChild, inject, signal, effect, OnInit, computed, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService, ChatMessage } from './services/gemini.service';
import { AuthService } from './services/auth.service';
import { UiService } from './services/ui.service';
import { MessageBubbleComponent } from './components/message-bubble.component';
import { doc, setDoc, collection, writeBatch, getDocs } from 'firebase/firestore';
import { translations } from './translations';
import { ChatSession, UserProfile } from './models';

// Import New Components
import { AuthModalComponent } from './components/auth-modal.component';
import { SettingsModalComponent } from './components/settings-modal.component';
import { ExportModalComponent } from './components/export-modal.component';
import { PersonalizationModalComponent } from './components/personalization-modal.component';
import { LiveChatComponent } from './components/live-chat.component';
import { AdminPanelComponent } from './components/admin-panel.component';


declare var window: any;

export const DEFAULT_PROFILE: UserProfile = {
  name: '',
  dob: '',
  education: 'unspecified',
  maritalStatus: 'unspecified',
  instructions: ''
};

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
    AdminPanelComponent
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
  
  // -- PWA Install State --
  deferredPrompt: any = null;
  showInstallPrompt = signal(false);

  // -- App Settings --
  currentLang: WritableSignal<'ar'|'en'> = signal('ar');
  theme: WritableSignal<'light'|'dark'> = signal('light');
  modelKey: WritableSignal<'fast' | 'core' | 'pro'> = signal('fast');
  
  // -- Translations --
  private allTranslations = translations;
  t = computed(() => this.allTranslations[this.currentLang()]);
  
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
  selectedFile = signal<{name: string, data: string, mimeType: string} | null>(null);
  
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
        localStorage.setItem('aman_sessions_v1', JSON.stringify(allSessions));
      }
    });

    effect(() => {
      const msgs = this.messages();
      const id = this.currentSessionId();
      if (id && msgs.length >= 0) {
        this.updateSessionMessages(id, msgs);
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

    const savedModel = localStorage.getItem('aman_model') as 'fast'|'core'|'pro';
    if(savedModel) this.modelKey.set(savedModel);
  }

  ngOnInit() {
    this.loadSessions();
    if (this.sessions().length === 0) {
      this.createNewChat(false);
    } else {
      this.loadSession(this.sessions()[0].id, false);
    }
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
    await this.authService.logout();
    this.showUserMenu.set(false);
  }

  getUserInitials(name: string): string {
    if (!name) return 'A';
    return name.slice(0, 2).toUpperCase();
  }

  loadSessions() {
    try {
      const saved = localStorage.getItem('aman_sessions_v1');
      if (!saved || saved === 'undefined' || saved === 'null') {
        this.sessions.set([]);
        return;
      }
      
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) throw new Error('Session data is not an array.');

      parsed.sort((a: ChatSession, b: ChatSession) => b.timestamp - a.timestamp);
      this.sessions.set(parsed);

    } catch (e: any) {
      console.warn('Could not load sessions due to an error, starting fresh.', e.message);
      localStorage.removeItem('aman_sessions_v1');
      this.sessions.set([]);
    }
  }

  async loadRemoteSessions(uid: string) {
    try {
      const chatsRef = collection(this.authService.db, 'users', uid, 'chats');
      const snapshot = await getDocs(chatsRef);
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
        
        if (this.currentSessionId()) {
          const updated = this.sessions().find(s => s.id === this.currentSessionId());
          if (updated) {
            this.messages.set(updated.messages);
          }
        }
      }
    } catch (e) {
      console.error('Error loading remote chats', e);
    }
  }

  createNewChat(closeSidebar = true) {
    const newId = crypto.randomUUID();
    const newSession: ChatSession = {
      id: newId,
      title: this.currentLang() === 'ar' ? 'محادثة جديدة' : 'New Chat',
      messages: [],
      timestamp: Date.now()
    };
    
    this.sessions.update(prev => [newSession, ...prev]);
    this.currentSessionId.set(newId);
    this.messages.set([]);
    this.inputMessage.set('');
    this.selectedFile.set(null);
    this.geminiService.startNewChat(this.currentLang());
    this.abortController = null;
    
    if (this.textarea?.nativeElement) {
      this.textarea.nativeElement.style.height = 'auto';
    }

    if (closeSidebar) this.isSidebarOpen.set(false);
  }

  loadSession(id: string, closeSidebar = true) {
    const session = this.sessions().find(s => s.id === id);
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

  deleteSession(event: Event, id: string) {
    event.stopPropagation();
    if(confirm(this.t().deleteConfirm)) {
      this.sessions.update(prev => prev.filter(s => s.id !== id));
      if (this.currentSessionId() === id) {
        if (this.sessions().length > 0) {
          this.loadSession(this.sessions()[0].id, false);
        } else {
          this.createNewChat(false);
        }
      }
      if (this.sessions().length === 0) {
        localStorage.removeItem('aman_sessions_v1');
      }
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

  updateInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.inputMessage.set(target.value);
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, 150) + 'px';
  }

  triggerFileUpload() {
    if (!this.authService.isPremium() && this.authService.user()) {
        alert('Image generation is a premium feature.');
        return;
    }
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const base64Data = (e.target?.result as string).split(',')[1];
        this.selectedFile.set({
          name: file.name,
          mimeType: file.type,
          data: base64Data
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
      this.isLoading.set(false);
      
      this.messages.update(prev => {
        const last = prev[prev.length - 1];
        if (last.role === 'model' && !last.text) {
          return [...prev.slice(0, -1), { role: 'model', text: '...' }];
        }
        return prev;
      });
      this.syncChatToFirestore();
    }
  }

  async sendMessage() {
    if (!this.authService.user()) {
      this.uiService.openAuthModal();
      return;
    }

    const text = this.inputMessage().trim();
    const file = this.selectedFile();
    
    if ((!text && !file) || this.isLoading()) return;

    // Use a higher token estimation for non-premium to account for smaller limit
    const isPremium = this.authService.isPremium();
    const tokenCost = isPremium ? 10 : 1330; // Approx 20000 / 15
    const estimatedTokens = Math.ceil(text.length / 4) + (file ? 1000 : 0) + tokenCost;
    const allowed = await this.authService.checkAndIncrementUsage(estimatedTokens);
    
    if (!allowed) {
      alert(this.t().limitReached);
      return;
    }

    this.messages.update(prev => [
      ...prev, 
      { 
        role: 'user', 
        text: text, 
        fileData: file ? { name: file.name, mimeType: file.mimeType, data: file.data } : undefined 
      }
    ]);
    
    const currentHistory = this.messages();

    this.inputMessage.set('');
    this.selectedFile.set(null);
    this.isLoading.set(true);
    
    this.abortController = new AbortController();
    
    if (this.textarea?.nativeElement) this.textarea.nativeElement.style.height = 'auto';
    this.scrollToBottom();

    try {
        const aiMsgIndex = this.messages().length;
        
        this.messages.update(prev => [...prev, { role: 'model', text: '' }]);
        
        const response = await this.geminiService.sendMessage(
          currentHistory, 
          isPremium,
          this.abortController.signal,
          { modelKey: this.modelKey(), userProfile: this.userProfile() }
        );

        let responseText = response.text;
        let generatedImages = response.images;
        const generatedFile = response.generatedFile;

        const user = this.authService.user();
        if (user && isPremium && generatedImages && generatedImages.length > 0) {
            try {
                const uploadPromises = generatedImages.map(img => 
                    this.authService.uploadGeneratedImage(user.uid, img.url, img.mimeType)
                );
                const uploadedUrls = await Promise.all(uploadPromises);

                generatedImages = generatedImages
                    .map((img, index) => {
                        const newUrl = uploadedUrls[index];
                        return newUrl ? { ...img, url: newUrl } : null;
                    })
                    .filter((img): img is NonNullable<typeof img> => img !== null);
            } catch (e) {
                console.error("Image upload process failed:", e);
            }
        }

        if (generatedFile) {
           this.messages.update(msgs => {
             const newMsgs = [...msgs];
             if (aiMsgIndex < newMsgs.length) {
                newMsgs[aiMsgIndex] = {
                  ...newMsgs[aiMsgIndex],
                  generatedFile: generatedFile,
                  text: newMsgs[aiMsgIndex].text || responseText || `I have created the file: ${generatedFile.filename}`
                };
             }
             return newMsgs;
           });
        }

        if (generatedImages && generatedImages.length > 0) {
           this.messages.update(msgs => {
             const newMsgs = [...msgs];
             if (aiMsgIndex < newMsgs.length) {
                newMsgs[aiMsgIndex] = {
                  ...newMsgs[aiMsgIndex],
                  generatedImages: generatedImages
                };
             }
             return newMsgs;
           });
        }
        
        if (!responseText && !generatedFile && (!generatedImages || generatedImages.length === 0)) {
           responseText = this.currentLang() === 'ar' ? 'عذراً، لم أتلقى إجابة.' : 'Sorry, no response received.';
        } else if (!responseText) {
           responseText = '';
        }

        const typingSpeed = 12; 
        
        for (let i = 0; i < responseText.length; i++) {
           if (this.currentSessionId() !== this.sessions().find(s => s.id === this.currentSessionId())?.id) break;
           
           if (!this.isLoading() && !this.abortController) break; 

           const char = responseText[i];
           
           this.messages.update(msgs => {
              const newMsgs = [...msgs];
              if (aiMsgIndex < newMsgs.length) {
                 const currentMsg = newMsgs[aiMsgIndex];
                 newMsgs[aiMsgIndex] = { 
                   ...currentMsg, 
                   text: (currentMsg.text || '') + char
                 };
              }
              return newMsgs;
           });
           
           if (i % 5 === 0) this.scrollToBottom();
           await new Promise(resolve => setTimeout(resolve, typingSpeed));
        }

        this.scrollToBottom();
      
    } catch (error: any) {
      if (error.message !== 'تم إيقاف التوليد.') {
        console.error('Action failed', error);
        const errText = error.message || this.t().error;
        this.messages.update(msgs => {
          const last = msgs[msgs.length - 1];
          if (last.role === 'model' && !last.text) {
              const newMsgs = [...msgs];
              newMsgs[newMsgs.length - 1] = { role: 'system', text: errText, isError: true };
              return newMsgs;
          }
          return [...msgs, { role: 'system', text: errText, isError: true }];
        });
      }
    } finally {
      this.isLoading.set(false);
      this.abortController = null;
      this.scrollToBottom();
      this.syncChatToFirestore();
    }
  }

  handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  async syncChatToFirestore() {
    const user = this.authService.user();
    if (!user) return;

    try {
      const sessionId = this.currentSessionId();
      const session = this.sessions().find(s => s.id === sessionId);
      if (!session) return;

      const db = this.authService.db;
      const chatDocRef = doc(db, 'users', user.uid, 'chats', sessionId);
      
      const cleanMessages = session.messages.map(msg => {
        const clean: any = { ...msg };
        if (clean.fileData === undefined) delete clean.fileData;
        if (clean.isError === undefined) delete clean.isError;
        if (clean.generatedImages === undefined) delete clean.generatedImages;
        if (clean.generatedFile === undefined) delete clean.generatedFile;
        return JSON.parse(JSON.stringify(clean));
      });

      await setDoc(chatDocRef, {
        id: sessionId,
        title: session.title,
        timestamp: session.timestamp,
        messages: cleanMessages,
        updatedAt: new Date().toISOString()
      }, { merge: true });

    } catch (e) {
      console.error('Failed to sync chat to DB', e);
    }
  }

  async loadProfile() {
    const user = this.authService.user();
    if (!user) return;

    const savedProfile = localStorage.getItem(`aman_profile_${user.uid}`);
    if (savedProfile) {
      this.userProfile.set(JSON.parse(savedProfile));
    }

    const remoteProfile = await this.authService.loadUserProfile(user.uid);
    if (remoteProfile) {
      this.userProfile.set(remoteProfile);
      localStorage.setItem(`aman_profile_${user.uid}`, JSON.stringify(remoteProfile));
    }
  }
}
