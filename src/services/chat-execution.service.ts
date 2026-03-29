import { Injectable, inject, signal } from '@angular/core';
import { ChatStateService } from './chat-state.service';
import { GeminiService, ChatMessage } from './gemini.service';
import { AuthService } from './auth.service';
import { UiService } from './ui.service';
import { LocationService } from './location.service';
import { SpeechService } from './speech.service';
import { ImageService } from './image.service';
import { Subscription } from 'rxjs';
import { SelectedFile } from './file-handling.service';

@Injectable({ providedIn: 'root' })
export class ChatExecutionService {
  private chatState = inject(ChatStateService);
  private geminiService = inject(GeminiService);
  private authService = inject(AuthService);
  private uiService = inject(UiService);
  private locationService = inject(LocationService);
  private speechService = inject(SpeechService);
  private imageService = inject(ImageService);

  isLoading = signal(false);
  isSending = signal(false);
  abortController: AbortController | null = null;
  messageSubscription: Subscription | null = null;
  processedFunctionCalls = new Set<string>();
  private pendingGeneratedFile: any = null;

  async sendMessage(
    text: string,
    files: SelectedFile[],
    modelKey: 'fast' | 'core' | 'pro',
    useWebSearch: boolean,
    generateImage: boolean,
    currentLang: 'ar' | 'en',
    onSuccess: () => void,
    onScrollToBottom: () => void,
    onLimitExceeded: () => void,
    onGenerateImageReset: () => void,
    isInternalRetry: boolean = false
  ) {
    if (this.isSending()) return;
    this.isSending.set(true);

    if (!this.authService.user()) {
      this.uiService.openAuthModal();
      this.isSending.set(false);
      return;
    }

    if ((!text && (!files || files.length === 0)) || this.isLoading()) {
      this.isSending.set(false);
      return;
    }

    let msgId = '';
    let modelMsgId = '';

    if (!isInternalRetry) {
      // 1. Add User Message to State IMMEDIATELY for responsive UI
      msgId = crypto.randomUUID();
      const userMsg: ChatMessage = { 
        id: msgId, 
        role: 'user', 
        text: text, 
        files: files && files.length > 0 ? files.map(f => ({ name: f.name, mimeType: f.mimeType, data: f.data })) : undefined 
      };
      
      this.chatState.messages.update(prev => [...prev, userMsg]);
      
      // 2. Clear input and scroll
      onSuccess();
      this.isLoading.set(true);
      onScrollToBottom();

      // 3. Add Model Placeholder
      const placeholderImages = generateImage ? [{ url: null, mimeType: 'image/png', isPending: true }] : undefined;
      modelMsgId = crypto.randomUUID();
      this.chatState.messages.update(prev => [...prev, { id: modelMsgId, role: 'model', text: '', generatedImages: placeholderImages }]);
    } else {
      // For internal retry, we already have the user message and we just removed the failed model message
      // We need to add a new model placeholder
      this.isLoading.set(true);
      modelMsgId = crypto.randomUUID();
      const placeholderImages = generateImage ? [{ url: null, mimeType: 'image/png', isPending: true }] : undefined;
      this.chatState.messages.update(prev => [...prev, { id: modelMsgId, role: 'model', text: '', generatedImages: placeholderImages }]);
      onScrollToBottom();
    }

    // 4. Proceed with async operations (Location, Token Counting, Session Sync)
    let preFetchedLocation: { lat: number, lng: number } | undefined;
    try {
      const currentLocationKeywords = ['اين انا', 'أين أنا', 'موقعي', 'مكاني', 'وين انا', 'وينني'];
      if (currentLocationKeywords.some(k => text.includes(k))) {
        preFetchedLocation = await this.locationService.getCurrentLocation();
      }
    } catch (err) {
      console.warn('Could not pre-fetch location:', err);
    }

    let useImageModel = generateImage;
    if (useImageModel) {
      useWebSearch = false;
    }
    onGenerateImageReset();

    const isPremium = this.authService.isPremium();
    let estimatedTokens = 0;

    if (!isPremium) {
      const historyToCount = this.chatState.messages();
      try {
        const inputTokens = await this.geminiService.countTokens(historyToCount, { 
          modelKey, 
          generateImage: useImageModel 
        });
        estimatedTokens = inputTokens + 800;
      } catch (e) {
        estimatedTokens = Math.ceil(text.length / 4) + (files ? files.length * 1000 : 0) + 1000;
      }
    }

    const allowed = await this.authService.checkAndIncrementUsage(estimatedTokens);

    if (!allowed) {
      onLimitExceeded();
      // Remove the messages we just added if not allowed
      this.chatState.messages.update(msgs => msgs.filter(m => m.id !== msgId && m.id !== modelMsgId));
      this.isLoading.set(false);
      this.isSending.set(false);
      return;
    }

    const id = this.chatState.currentSessionId();
    const sessions = this.chatState.sessions();
    
    if (!sessions.some(s => s.id === id)) {
      const newSession = {
        id: id,
        title: currentLang === 'ar' ? 'محادثة جديدة' : 'New Chat',
        messages: [],
        timestamp: Date.now()
      };
      this.chatState.sessions.update(prev => [newSession, ...prev]);
      this.chatState.syncChatToFirestore(newSession);
    }

    if (files && files.length > 0) {
      const user = this.authService.user();
      if (user) {
        files.forEach((file, index) => {
          this.authService.processAndUploadImage(user.uid, file.data, file.mimeType, false).then(result => {
            if (result.url) {
              this.chatState.messages.update(msgs => msgs.map(m => 
                m.id === msgId ? { 
                  ...m, 
                  files: m.files?.map((f, i) => i === index ? { ...f, url: result.url } : f) 
                } : m
              ));
              this.chatState.syncChatToFirestore();
            }
          });
        });
      }
    }

    const currentHistory = this.chatState.messages();
    this.abortController = new AbortController();
    let receivedFunctionCall = false;

    this.messageSubscription = this.geminiService.sendMessage(
      currentHistory,
      this.authService.userPlan(),
      this.abortController.signal,
      {
        modelKey,
        userProfile: this.authService.userProfile(),
        webSearch: useWebSearch,
        generateImage: useImageModel,
        location: preFetchedLocation,
        uid: this.authService.user()?.uid,
        email: this.authService.user()?.email || ''
      }
    ).subscribe({
      next: (response) => {
        if (response.functionCall) {
          receivedFunctionCall = true;
          this.chatState.messages.update(msgs => {
            const newMsgs = [...msgs];
            const lastModelIdx = newMsgs.map(m => m.role).lastIndexOf('model');
            if (lastModelIdx !== -1) {
              newMsgs[lastModelIdx] = { ...newMsgs[lastModelIdx], functionCall: response.functionCall };
            }
            return newMsgs;
          });
          this.chatState.syncChatToFirestore();
          this.handleFunctionCall(response.functionCall, modelKey, useWebSearch, useImageModel, currentLang, onScrollToBottom, onLimitExceeded, onGenerateImageReset);
          return;
        }
        this.chatState.messages.update(msgs => {
          const newMsgs = [...msgs];
          const lastModelIdx = newMsgs.map(m => m.role).lastIndexOf('model');
          
          if (lastModelIdx !== -1) {
            const currentMsg = newMsgs[lastModelIdx];
            let updatedMsg = { ...currentMsg };
            
            if (response.textChunk !== undefined) {
              updatedMsg.text = (updatedMsg.text || '') + response.textChunk;
            } else if (response.finalText !== undefined) {
              updatedMsg.text = response.finalText;
            }

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
            
            if (updatedMsg.text && updatedMsg.text.includes('ERROR_POLICY:')) {
               updatedMsg.isError = true;
               updatedMsg.text = updatedMsg.text.replace('ERROR_POLICY:', '').trim();
               updatedMsg.generatedImages = undefined;
            }

            if (response.images) {
              updatedMsg.generatedImages = response.images;
            }
            newMsgs[lastModelIdx] = updatedMsg;
          }
          return newMsgs;
        });
        this.chatState.syncChatToFirestore();
        onScrollToBottom();
      },
      error: (error) => {
        const errText = error.message || 'Error occurred';
        this.chatState.messages.update(msgs => {
          const last = msgs[msgs.length - 1];
          if (last.role === 'model' && !last.text) {
            const newMsgs = [...msgs];
            newMsgs[newMsgs.length - 1] = { id: crypto.randomUUID(), role: 'system', text: errText, isError: true };
            return newMsgs;
          }
          return [...msgs, { id: crypto.randomUUID(), role: 'system', text: errText, isError: true }];
        });
        this.isLoading.set(false);
        this.isSending.set(false);
        this.messageSubscription = null;
        onScrollToBottom();
        this.chatState.syncChatToFirestore();
      },
      complete: async () => {
        this.isSending.set(false);
        if (receivedFunctionCall) return;

        const currentMessages = this.chatState.messages();
        const lastModelMsg = currentMessages[currentMessages.length - 1];
        const lastUserMsg = currentMessages.filter(m => m.role === 'user').pop();

        if (!useImageModel && lastModelMsg?.role === 'model' && lastModelMsg.text && lastUserMsg) {
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
            let refinedPrompt = lastUserMsg.text;
            const toolCallMatch = lastModelMsg.text.match(/\[طلب توليد صورة:\s*([^\]]+)\]/i) || 
                               lastModelMsg.text.match(/\[generate_image:\s*([^\]]+)\]/i);
            if (toolCallMatch && toolCallMatch[1]) {
              refinedPrompt = toolCallMatch[1].trim();
            }

            this.chatState.messages.update(msgs => msgs.slice(0, -1));
            this.isSending.set(false); // Reset sending state before recursive call
            this.sendMessage(refinedPrompt, null, modelKey, useWebSearch, true, currentLang, () => {}, onScrollToBottom, onLimitExceeded, onGenerateImageReset, true);
            return;
          }
        }

        if (useImageModel) {
           const lastMsg = this.chatState.messages()[this.chatState.messages().length - 1];
           const hasRealImages = lastMsg.generatedImages && lastMsg.generatedImages.some(img => img.url !== null);
           if (lastMsg.role === 'model' && !hasRealImages) {
             if (!lastMsg.text || lastMsg.text.trim().length < 5) {
               this.chatState.messages.update(msgs => {
                 const newMsgs = [...msgs];
                 newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], generatedImages: undefined };
                 newMsgs.push({ 
                   id: crypto.randomUUID(), 
                   role: 'system', 
                   text: currentLang === 'ar' ? 'لم يتم إنشاء الصورة. قد يكون الوصف مخالفاً لسياسات المحتوى أو غير واضح.' : 'Image was not generated. The description might be unclear or violate content policies.',
                   isError: true 
                 });
                 return newMsgs;
               });
             } else {
               this.chatState.messages.update(msgs => {
                 const newMsgs = [...msgs];
                 newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], generatedImages: undefined };
                 return newMsgs;
               });
             }
           }
        }

        onScrollToBottom();

        const user = this.authService.user();
        if (user) {
          try {
            let lastModelMessage: ChatMessage | undefined;
            const currentMessages = this.chatState.messages();
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
                    updatedImages.push({ ...img, isPending: false });
                  }
                } else {
                  updatedImages.push({ ...img, isPending: false });
                }
              }
              this.chatState.messages.update(msgs => msgs.map(msg => 
                msg.id === lastModelMessage!.id ? { ...msg, generatedImages: updatedImages } : msg
              ));
              this.chatState.syncChatToFirestore();
            }
          } catch (e) {
            console.error('Failed to process generated images:', e);
          }
        } else {
          let lastModelMessage: ChatMessage | undefined;
          const currentMessages = this.chatState.messages();
          for (let i = currentMessages.length - 1; i >= 0; i--) {
            if (currentMessages[i].role === 'model') {
              lastModelMessage = currentMessages[i];
              break;
            }
          }
          if (lastModelMessage && lastModelMessage.generatedImages && lastModelMessage.generatedImages.length > 0) {
            const updatedImages = lastModelMessage.generatedImages.map(img => ({ ...img, isPending: false }));
            this.chatState.messages.update(msgs => msgs.map(msg => 
              msg.id === lastModelMessage!.id ? { ...msg, generatedImages: updatedImages } : msg
            ));
          }
        }
        
        this.isLoading.set(false);
        this.messageSubscription = null;
        this.chatState.syncChatToFirestore();
      }
    });
  }

  async handleFunctionCall(
    call: any,
    modelKey: 'fast' | 'core' | 'pro',
    useWebSearch: boolean,
    useImageModel: boolean,
    currentLang: 'ar' | 'en',
    onScrollToBottom: () => void,
    onLimitExceeded: () => void,
    onGenerateImageReset: () => void
  ) {
    const callId = call.id || `${call.name}-${JSON.stringify(call.args)}`;
    if (this.processedFunctionCalls.has(callId)) return;
    this.processedFunctionCalls.add(callId);

    if (call.name === 'generateImage') {
      const prompt = call.args.prompt;
      this.isLoading.set(true);
      const imageMsgId = crypto.randomUUID();
      let actualTargetId: string = imageMsgId;
      
      this.chatState.messages.update(msgs => {
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
      this.chatState.syncChatToFirestore();

      try {
        const user = this.authService.user();
        const images = await this.geminiService.generateImageDirect(prompt, user?.uid || 'anonymous', user?.email || 'anonymous');

        if (images && images.length > 0) {
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

          this.chatState.messages.update(msgs => {
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

          this.sendFunctionResponse(call.name, { success: true, message: 'Image generated successfully and shown to the user.' }, modelKey, useWebSearch, useImageModel, currentLang, onScrollToBottom, onLimitExceeded, onGenerateImageReset);
          
        } else {
          this.chatState.messages.update(msgs => {
            const newMsgs = [...msgs];
            const targetIdx = newMsgs.findIndex(m => m.id === actualTargetId);
            if (targetIdx !== -1) {
              newMsgs[targetIdx] = { ...newMsgs[targetIdx], generatedImages: undefined, text: 'عذراً، لم أتمكن من توليد الصورة.', isError: true };
            }
            newMsgs.push({
              id: crypto.randomUUID(),
              role: 'user',
              text: '',
              isHidden: true,
              functionResponse: {
                name: call.name,
                response: { error: 'Failed to generate image' }
              }
            });
            return newMsgs;
          });
          this.sendFunctionResponse(call.name, { error: 'Failed to generate image' }, modelKey, useWebSearch, useImageModel, currentLang, onScrollToBottom, onLimitExceeded, onGenerateImageReset);
        }
      } catch (err) {
        this.chatState.messages.update(msgs => {
          const newMsgs = [...msgs];
          const targetIdx = newMsgs.findIndex(m => m.id === actualTargetId);
          if (targetIdx !== -1) {
            newMsgs[targetIdx] = { ...newMsgs[targetIdx], generatedImages: undefined, text: 'حدث خطأ أثناء محاولة رسم الصورة.', isError: true };
          }
          newMsgs.push({
            id: crypto.randomUUID(),
            role: 'user',
            text: '',
            isHidden: true,
            functionResponse: {
              name: call.name,
              response: { error: 'Error generating image' }
            }
          });
          return newMsgs;
        });
        this.sendFunctionResponse(call.name, { error: 'Error generating image' }, modelKey, useWebSearch, useImageModel, currentLang, onScrollToBottom, onLimitExceeded, onGenerateImageReset);
      }
      return;
    }

    if (call.name === 'getUserLocation') {
      this.isLoading.set(true);
      const tempId = crypto.randomUUID();
      this.chatState.messages.update(msgs => [...msgs, { id: tempId, role: 'system', text: 'جاري تحديد موقعك...' }]);
      
      try {
        const pos = await this.locationService.getCurrentLocation();
        this.chatState.messages.update(msgs => msgs.filter(m => m.id !== tempId));
        this.chatState.messages.update(msgs => {
          const newMsgs = [...msgs];
          const lastModelIdx = newMsgs.map(m => m.role).lastIndexOf('model');
          if (lastModelIdx !== -1) {
            newMsgs[lastModelIdx] = { ...newMsgs[lastModelIdx], location: { lat: pos.lat, lng: pos.lng, label: 'موقعك الحالي' } };
          } else {
            newMsgs.push({ id: crypto.randomUUID(), role: 'model', text: '', location: { lat: pos.lat, lng: pos.lng, label: 'موقعك الحالي' } });
          }
          newMsgs.push({
            id: crypto.randomUUID(),
            role: 'user',
            text: '',
            isHidden: true,
            functionResponse: {
              name: call.name,
              response: { latitude: pos.lat, longitude: pos.lng }
            }
          });
          return newMsgs;
        });
        this.sendFunctionResponse(call.name, { latitude: pos.lat, longitude: pos.lng }, modelKey, useWebSearch, useImageModel, currentLang, onScrollToBottom, onLimitExceeded, onGenerateImageReset);
      } catch (err) {
        this.chatState.messages.update(msgs => msgs.map(m => m.id === tempId ? { ...m, text: 'تعذر تحديد الموقع' } : m));
        this.chatState.messages.update(msgs => {
          const newMsgs = [...msgs];
          newMsgs.push({
            id: crypto.randomUUID(),
            role: 'user',
            text: '',
            isHidden: true,
            functionResponse: {
              name: call.name,
              response: { error: 'Location error' }
            }
          });
          return newMsgs;
        });
        this.sendFunctionResponse(call.name, { error: 'Location error' }, modelKey, useWebSearch, useImageModel, currentLang, onScrollToBottom, onLimitExceeded, onGenerateImageReset);
      }
    } else if (call.name === 'searchLocation') {
      const query = call.args.query;
      this.isLoading.set(true);
      const tempId = crypto.randomUUID();
      this.chatState.messages.update(msgs => [...msgs, { id: tempId, role: 'system', text: `جاري البحث عن "${query}"...` }]);

      try {
        const data = await this.locationService.searchLocation(query);
        this.chatState.messages.update(msgs => msgs.filter(m => m.id !== tempId));
        this.chatState.messages.update(msgs => {
          const newMsgs = [...msgs];
          const lastModelIdx = newMsgs.map(m => m.role).lastIndexOf('model');
          if (lastModelIdx !== -1) {
            newMsgs[lastModelIdx] = { ...newMsgs[lastModelIdx], location: { lat: data.lat, lng: data.lng, label: data.label } };
          } else {
            newMsgs.push({ id: crypto.randomUUID(), role: 'model', text: '', location: { lat: data.lat, lng: data.lng, label: data.label } });
          }
          newMsgs.push({
            id: crypto.randomUUID(),
            role: 'user',
            text: '',
            isHidden: true,
            functionResponse: {
              name: call.name,
              response: { latitude: data.lat, longitude: data.lng, label: data.label }
            }
          });
          return newMsgs;
        });
        this.sendFunctionResponse(call.name, { latitude: data.lat, longitude: data.lng, label: data.label }, modelKey, useWebSearch, useImageModel, currentLang, onScrollToBottom, onLimitExceeded, onGenerateImageReset);
      } catch (err) {
        this.chatState.messages.update(msgs => msgs.map(m => m.id === tempId ? { ...m, text: 'حدث خطأ أثناء البحث عن الموقع' } : m));
        this.chatState.messages.update(msgs => {
          const newMsgs = [...msgs];
          newMsgs.push({
            id: crypto.randomUUID(),
            role: 'user',
            text: '',
            isHidden: true,
            functionResponse: {
              name: call.name,
              response: { error: 'Search failed' }
            }
          });
          return newMsgs;
        });
        this.sendFunctionResponse(call.name, { error: 'Search failed' }, modelKey, useWebSearch, useImageModel, currentLang, onScrollToBottom, onLimitExceeded, onGenerateImageReset);
      }
    } else if (call.name === 'getDirections') {
      const origin = call.args.originQuery;
      const dest = call.args.destinationQuery;
      this.isLoading.set(true);
      const tempId = crypto.randomUUID();
      this.chatState.messages.update(msgs => [...msgs, { id: tempId, role: 'system', text: `جاري البحث عن المسار من "${origin}" إلى "${dest}"...` }]);

      try {
        const routeData = await this.locationService.getDirections(origin, dest);
        this.chatState.messages.update(msgs => msgs.filter(m => m.id !== tempId));
        this.chatState.messages.update(msgs => {
          const newMsgs = [...msgs];
          const lastModelIdx = newMsgs.map(m => m.role).lastIndexOf('model');
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
              response: { success: true, origin: routeData.origin, destination: routeData.destination, distance: routeData.distance, duration: routeData.duration }
            }
          });
          return newMsgs;
        });
        this.sendFunctionResponse(call.name, { success: true, origin: routeData.origin, destination: routeData.destination, distance: routeData.distance, duration: routeData.duration }, modelKey, useWebSearch, useImageModel, currentLang, onScrollToBottom, onLimitExceeded, onGenerateImageReset);
      } catch (err: any) {
        this.chatState.messages.update(msgs => msgs.map(m => m.id === tempId ? { ...m, text: err.message || 'حدث خطأ أثناء البحث عن المسار' } : m));
        this.chatState.messages.update(msgs => {
          const newMsgs = [...msgs];
          newMsgs.push({
            id: crypto.randomUUID(),
            role: 'user',
            text: '',
            isHidden: true,
            functionResponse: {
              name: call.name,
              response: { error: err.message || 'Route search failed' }
            }
          });
          return newMsgs;
        });
        this.sendFunctionResponse(call.name, { error: err.message || 'Route search failed' }, modelKey, useWebSearch, useImageModel, currentLang, onScrollToBottom, onLimitExceeded, onGenerateImageReset);
      }
    } else if (call.name === 'generateDocument') {
      const { content, type, filename } = call.args;
      this.pendingGeneratedFile = { content, type, filename };
      this.isLoading.set(true);
      this.chatState.messages.update(msgs => {
        const newMsgs = [...msgs];
        const lastModelIdx = newMsgs.map(m => m.role).lastIndexOf('model');
        if (lastModelIdx !== -1) {
          newMsgs[lastModelIdx] = { 
            ...newMsgs[lastModelIdx], 
            generatedFile: { content, type, filename } 
          };
        }
        newMsgs.push({
          id: crypto.randomUUID(),
          role: 'user',
          text: '',
          isHidden: true,
          functionResponse: {
            name: call.name,
            response: { success: true, message: `File ${filename}.${type} generated successfully.` }
          }
        });
        return newMsgs;
      });
      this.sendFunctionResponse(call.name, { success: true, message: `File ${filename}.${type} generated successfully.` }, modelKey, useWebSearch, useImageModel, currentLang, onScrollToBottom, onLimitExceeded, onGenerateImageReset);
    }
  }

  async sendFunctionResponse(
    name: string,
    response: any,
    modelKey: 'fast' | 'core' | 'pro',
    useWebSearch: boolean,
    useImageModel: boolean,
    currentLang: 'ar' | 'en',
    onScrollToBottom: () => void,
    onLimitExceeded: () => void,
    onGenerateImageReset: () => void
  ) {
    this.isSending.set(true);
    let receivedFunctionCall = false;
    const modelMsgId = crypto.randomUUID();
    this.chatState.messages.update(prev => [...prev, { 
      id: modelMsgId, 
      role: 'model', 
      text: '', 
      generatedFile: this.pendingGeneratedFile 
    }]);
    this.pendingGeneratedFile = null; // Reset after use

    this.messageSubscription = this.geminiService.sendMessage(
      this.chatState.messages(),
      this.authService.userPlan(),
      undefined,
      {
        modelKey,
        userProfile: this.authService.userProfile(),
        webSearch: useWebSearch,
        generateImage: useImageModel,
        toolResponse: { name, response },
        uid: this.authService.user()?.uid,
        email: this.authService.user()?.email || ''
      }
    ).subscribe({
      next: (res) => {
        if (res.functionCall) {
          receivedFunctionCall = true;
          this.chatState.messages.update(msgs => {
            const newMsgs = [...msgs];
            const lastModelIdx = newMsgs.map(m => m.role).lastIndexOf('model');
            if (lastModelIdx !== -1) {
              newMsgs[lastModelIdx] = { ...newMsgs[lastModelIdx], functionCall: res.functionCall };
            }
            return newMsgs;
          });
          this.chatState.syncChatToFirestore();
          this.handleFunctionCall(res.functionCall, modelKey, useWebSearch, useImageModel, currentLang, onScrollToBottom, onLimitExceeded, onGenerateImageReset);
          return;
        }
        
        this.chatState.messages.update(msgs => {
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
        onScrollToBottom();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.isSending.set(false);
        this.chatState.syncChatToFirestore();
      },
      complete: () => {
        this.isSending.set(false);
        if (receivedFunctionCall) return;
        this.isLoading.set(false);
        onGenerateImageReset();
        onScrollToBottom();
        this.chatState.syncChatToFirestore();
      }
    });
  }

  stopGeneration() {
    this.speechService.stopListening();
    this.isSending.set(false);
    this.isLoading.set(false);
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
      this.messageSubscription = null;
    }
    this.isLoading.set(false);
    this.chatState.syncChatToFirestore();
  }
}
