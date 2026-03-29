import { StorageService } from './services/storage.service';
import { Component, ElementRef, ViewChild, inject, signal, effect, OnInit, computed, WritableSignal, HostListener } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService, ChatMessage } from './services/gemini.service';
import { AuthService } from './services/auth.service';
import { UiService } from './services/ui.service';
import { ImageService } from './services/image.service';
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

import { TranslationService } from './services/translation.service';
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
import { PromptTemplatesComponent } from './components/prompt-templates.component';
import { LoadingIndicatorComponent } from './components/loading-indicator.component';
import { UserMessageComponent } from './components/message/user-message.component';
import { AiMessageComponent } from './components/message/ai-message.component';
import { DataLoggingService } from './services/data-logging.service';
import { ChatStateService } from './services/chat-state.service';
import { ChatExecutionService } from './services/chat-execution.service';
import { LocationService } from './services/location.service';
import { SpeechService } from './services/speech.service';
import { FileHandlingService } from './services/file-handling.service';
import { SecurityService } from './services/security.service';
import { PwaService } from './services/pwa.service';

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
    InputModelMenuComponent,
    PromptTemplatesComponent,
    LoadingIndicatorComponent,
    UserMessageComponent,
    AiMessageComponent
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
  public translationService = inject(TranslationService);
  
  public chatState = inject(ChatStateService);
  public chatExecution = inject(ChatExecutionService);
  public locationService = inject(LocationService);
  public speechService = inject(SpeechService);
  public fileHandling = inject(FileHandlingService);
  private securityService = inject(SecurityService);
  public pwaService = inject(PwaService);
  
  // -- App Settings --
  theme: WritableSignal<'light'|'dark'> = signal('light');
  modelKey: WritableSignal<'fast' | 'core' | 'pro'> = signal('fast');
  
  // -- Translations --
  t = computed(() => this.translationService.t());
  currentLang = computed(() => this.translationService.currentLang());

  currentModelLabel = computed(() => {
    const key = this.modelKey();
    if (key === 'fast') return this.t().engineFast;
    if (key === 'core') return this.t().engineCore;
    if (key === 'pro') return this.t().enginePro;
    return '...';
  });

  // -- Core State --
  get currentSessionId() { return this.chatState.currentSessionId; }
  get sessions() { return this.chatState.sessions; }
  get messages() { return this.chatState.messages; }
  get isSending() { return this.chatExecution.isSending(); }
  get isSyncingFromRemote() { return this.chatState.isSyncingFromRemote; }
  
  // -- User Profile State --
  profileForm = signal<UserProfile>({ ...DEFAULT_PROFILE });

  async loadProfile() {
    const user = this.authService.user();
    if (user) {
      const profile = await this.authService.loadUserProfile(user.uid);
      this.profileForm.set(profile);
    }
  }
  
  // -- UI State --
  inputMessage = signal('');
  get isLoading() { return this.chatExecution.isLoading; }
  isSidebarOpen = signal(false);
  get isListening() { return this.speechService.isListening; }
  showUserMenu = signal(false);
  showInputModelMenu = signal(false);
  isLimitExceeded = signal(false);
  showScrollButton = signal(false);
  
  // -- Multi-delete state --
  get isSelectionMode() { return this.chatState.isSelectionMode; }
  get selectedSessionIds() { return this.chatState.selectedSessionIds; }
  
  useWebSearch = signal(true);
  generateImage = signal(false);
  
  // -- Usage Stats --
  usagePercentage = computed(() => {
    if (this.authService.userPlan() === 'premium') return 0;
    const usage = this.authService.dailyUsage();
    const limit = this.authService.dailyLimit();
    return Math.min(100, Math.round((usage / limit) * 100));
  });

  get selectedFiles() { return this.fileHandling.selectedFiles; }
  
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  @ViewChild(ChatInputComponent) private chatInput!: ChatInputComponent;

  chatsUnsubscribe: (() => void) | null = null;

  constructor() {
    this.pwaService.init();

    const savedTheme = localStorage.getItem('aman_theme') as 'light' | 'dark';
    if (savedTheme) this.theme.set(savedTheme);

    effect(() => {
      if (this.authService.user()) {
        this.loadProfile();
      }
    });

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

    effect(() => {
      const lang = this.currentLang();
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
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

  async ngOnInit() {
    this.securityService.setupSecurity();
    await this.loadSessions();
    this.createNewChat(false);
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
    if (this.inputMessage() || this.selectedFiles().length > 0) {
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
    this.createNewChat();
  }

  getUserInitials(name: string): string {
    if (!name) return 'A';
    return name.slice(0, 2).toUpperCase();
  }

  async loadSessions() {
    await this.chatState.loadSessions();
  }

  async loadRemoteSessions(uid: string) {
    await this.chatState.loadRemoteSessions(uid);
  }

  createNewChat(closeSidebar = true) {
    this.chatState.createNewChat();
    this.chatInput?.resetHeight();
    if (closeSidebar) this.isSidebarOpen.set(false);
  }

  loadSession(id: string, closeSidebar = true) {
    this.chatState.loadSession(id);
    if (closeSidebar) this.isSidebarOpen.set(false);
    this.scrollToBottom();
  }

  updateSessionMessages(id: string, msgs: ChatMessage[]) {
    this.chatState.updateSessionMessages(id, msgs);
  }

  async deleteSession(event: Event, id: string) {
    if(confirm(this.t().deleteConfirm)) {
      await this.chatState.deleteSession(id);
    }
  }

  exportSession(event: Event, session: ChatSession) {
    this.fileHandling.exportSession(session);
  }

  toggleSelectionMode() {
    this.chatState.toggleSelectionMode();
  }

  toggleSessionSelection(event: Event, id: string) {
    event.stopPropagation();
    this.chatState.toggleSessionSelection(id);
  }

  async deleteSelectedSessions() {
    const idsToDelete = Array.from(this.selectedSessionIds());
    if (idsToDelete.length === 0) return;

    if (confirm(this.t().deleteSelectedConfirm)) {
      await this.chatState.deleteSelectedSessions(idsToDelete);
      this.chatState.isSelectionMode.set(false);
      this.chatState.selectedSessionIds.set(new Set());
    }
  }

  startVoiceInput() {
    if (this.speechService.isListening()) {
      this.speechService.stopListening();
      return;
    }
    this.speechService.startVoiceInput(
      this.currentLang(),
      (text) => {
        this.inputMessage.update(m => m ? m + ' ' + text : text);
        this.chatInput?.adjustHeight();
      },
      (err) => {
        this.uiService.showToast(this.t().error, 'error');
      }
    );
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

  onScroll(event: any) {
    const element = event.target;
    const threshold = 300;
    const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < threshold;
    this.showScrollButton.set(!isNearBottom);
  }

  scrollToBottom() {
    requestAnimationFrame(() => {
      if (this.scrollContainer?.nativeElement) {
        this.scrollContainer.nativeElement.scrollTo({
          top: this.scrollContainer.nativeElement.scrollHeight,
          behavior: 'smooth'
        });
      }
    });
  }

  usePrompt(text: string) {
    this.inputMessage.set(text);
    setTimeout(() => {
      this.chatInput?.focus();
      this.chatInput?.adjustHeight();
    }, 0);
  }

  updateInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.inputMessage.set(target.value);
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, 150) + 'px';
  }

  triggerFileUpload() {
    this.chatInput?.onTriggerFileUpload();
  }

  onFileSelected(event: Event) {
    this.fileHandling.onFileSelected(event);
  }

  removeFile(index: number) {
    this.fileHandling.removeFile(index);
  }

  clearFiles() {
    this.fileHandling.clearFiles();
  }

  stopGeneration() {
    this.chatExecution.stopGeneration();
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
    await this.chatExecution.handleFunctionCall(
      call,
      this.modelKey(),
      this.useWebSearch(),
      this.generateImage(),
      this.currentLang(),
      () => this.scrollToBottom(),
      () => {
        this.isLimitExceeded.set(true);
        this.uiService.openUpgradeModal('pro');
      },
      () => this.generateImage.set(false)
    );
  }

  updateSystemMessage(id: string, text: string) {
    this.chatState.updateSystemMessage(id, text);
  }

  async sendFunctionResponse(name: string, response: any) {
    await this.chatExecution.sendFunctionResponse(
      name,
      response,
      this.modelKey(),
      this.useWebSearch(),
      this.generateImage(),
      this.currentLang(),
      () => this.scrollToBottom(),
      () => {
        this.isLimitExceeded.set(true);
        this.uiService.openUpgradeModal('pro');
      },
      () => this.generateImage.set(false)
    );
  }

  async sendMessage() {
    await this.chatExecution.sendMessage(
      this.inputMessage(),
      this.selectedFiles(),
      this.modelKey(),
      this.useWebSearch(),
      this.generateImage(),
      this.currentLang(),
      () => {
        this.inputMessage.set('');
        this.fileHandling.clearFiles();
        this.chatInput?.resetHeight();
        this.scrollToBottom();
      },
      () => this.scrollToBottom(),
      () => {
        this.isLimitExceeded.set(true);
        this.uiService.openUpgradeModal('pro');
      },
      () => this.generateImage.set(false)
    );
  }

  handleKeydown(event: KeyboardEvent) {
    console.log('handleKeydown triggered', event.key);
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  deleteMessage(msgId: string) {
    this.chatState.deleteMessage(msgId);
  }

  editMessage(updatedMsg: ChatMessage) {
    this.chatState.editMessage(updatedMsg);
  }

  async syncChatToFirestore(sessionOverride?: ChatSession) {
    await this.chatState.syncChatToFirestore(sessionOverride);
  }


}
