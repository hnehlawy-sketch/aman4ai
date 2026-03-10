import { Component, input, computed, signal, effect, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ChatMessage, GeminiService } from '../services/gemini.service';
import { UiService } from '../services/ui.service';
import { ImageService } from '../services/image.service';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import saveAs from 'file-saver';
import { translations } from '../translations';

@Component({
  selector: 'app-message-bubble',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full mb-2 group flex" 
         [class.justify-start]="!isUser()" 
         [class.justify-end]="isUser()">
      
      <!-- ================= USER LAYOUT (Bubble) ================= -->
      @if (isUser()) {
        <div class="max-w-[85%] sm:max-w-[75%] flex flex-col items-end animate-slide-up relative"
             (touchstart)="onTouchStart()" 
             (touchend)="onTouchEnd()" 
             (touchcancel)="onTouchEnd()" 
             (touchmove)="onTouchEnd()">
          <div class="rounded-3xl rounded-tr-lg px-5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 relative shadow-sm border border-slate-200/50 dark:border-slate-700/50">
            @if (message().fileData; as file) {
              @if (file.mimeType.startsWith('image/')) {
                <div class="mb-2 rounded-lg overflow-hidden border border-white/10 max-w-[200px] sm:max-w-xs relative group/img cursor-pointer" (click)="file.url ? uiService.openImageView(file.url) : null">
                  <img [src]="file.url || ('data:' + file.mimeType + ';base64,' + file.data)" [alt]="file.name" class="w-full h-auto object-cover">
                  @if (file.url) {
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6 text-white">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                      </svg>
                    </div>
                  }
                </div>
              } @else {
                <div class="mb-2 p-2 rounded-lg flex items-center gap-3 bg-black/10 border border-white/10">
                  <div class="w-8 h-8 rounded bg-white/20 flex items-center justify-center text-xs font-bold uppercase text-white">
                    {{ file.mimeType.split('/')[1] || 'FILE' }}
                  </div>
                  <div class="overflow-hidden text-right">
                    <p class="text-xs truncate font-bold">{{ file.name }}</p>
                  </div>
                </div>
              }
            }
            
            @if (isEditing()) {
              <textarea 
                class="w-full bg-white/20 text-slate-800 dark:text-white placeholder-slate-500 dark:placeholder-white/50 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none mt-2"
                rows="3"
                [value]="editValue()"
                (input)="editValue.set($any($event.target).value)"
                dir="auto"
              ></textarea>
              <div class="flex justify-end gap-2 mt-2">
                <button (click)="cancelEdit()" class="px-3 py-1 text-xs rounded-md bg-black/20 hover:bg-black/30 transition-colors text-slate-800 dark:text-white">{{ t().cancel || 'إلغاء' }}</button>
                <button (click)="saveEdit()" class="px-3 py-1 text-xs rounded-md bg-white text-blue-600 font-bold hover:bg-gray-100 transition-colors">{{ t().save || 'حفظ' }}</button>
              </div>
            } @else {
              <div class="whitespace-pre-wrap leading-relaxed text-lg font-medium" dir="auto">
                {{ message().text }}
              </div>
              
              @if (message().isEdited) {
                <div class="text-[10px] opacity-60 mt-1 italic">{{ t().edited || 'تم التعديل' }}</div>
              }
            }
          </div>
          
            <!-- User Actions (Edit/Delete/Share) -->
          @if (!isEditing()) {
            <div class="flex gap-2 transition-opacity no-print mt-1.5 mr-1 z-10"
                 [class.opacity-0]="!showMobileActions()"
                 [class.opacity-100]="showMobileActions()"
                 class="sm:opacity-0 sm:group-hover:opacity-100">
              @if (isConfirmingDelete()) {
                <div class="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full border border-red-100 dark:border-red-900/50">
                  <span class="text-xs text-red-600 dark:text-red-400 font-bold px-1">{{ t().deleteConfirm || 'تأكيد الحذف؟' }}</span>
                  <button (click)="executeDelete()" class="p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3 h-3"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  </button>
                  <button (click)="cancelDelete()" class="p-1 rounded-full bg-gray-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-gray-300 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3 h-3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              } @else {
                <button (click)="shareText()" class="p-1.5 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700 text-slate-400 hover:text-blue-500 transition-colors" title="Share">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                  </svg>
                </button>
                <button (click)="startEdit()" class="p-1.5 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700 text-slate-400 hover:text-blue-500 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                  </svg>
                </button>
                <button (click)="confirmDelete()" class="p-1.5 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700 text-slate-400 hover:text-red-500 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              }
            </div>
          }
        </div>
      }

      <!-- ================= AI LAYOUT (Flat & Formatted) ================= -->
      @else {
        <div class="flex gap-4 sm:gap-5"
             [class.max-w-full]="message().generatedImages && message().generatedImages!.length > 0"
             [class.w-full]="message().generatedImages && message().generatedImages!.length > 0"
             [class.max-w-[95%]]="!(message().generatedImages && message().generatedImages!.length > 0)"
             [class.sm:max-w-[85%]]="!(message().generatedImages && message().generatedImages!.length > 0)">
          
          <!-- Content -->
          <div class="flex-1 min-w-0">
             
             <!-- GENERATED IMAGES DISPLAY (Professional Grid) -->
             @if (message().generatedImages && message().generatedImages!.length > 0) {
               <div class="mb-4 grid gap-4"
                    [class.grid-cols-1]="message().generatedImages!.length === 1"
                    [class.grid-cols-2]="message().generatedImages!.length > 1">
                 
                 @for (img of message().generatedImages; track $index) {
                   <div class="relative group rounded-2xl overflow-hidden shadow-xl border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 transition-all duration-500 hover:shadow-2xl">
                     
                     <!-- Image Container -->
                     <div class="relative w-full overflow-hidden flex items-center justify-center bg-black/5 min-h-[200px] rounded-xl">
                        
                        @if (img.url) {
                            <img [src]="img.url" 
                                 [alt]="img.alt || 'Generated Image'" 
                                 class="w-full h-auto max-h-[500px] object-contain transition-transform duration-700 group-hover:scale-105"
                                 loading="eager"
                                 referrerpolicy="no-referrer">
                            
                            <!-- Gradient Overlay -->
                            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                            <!-- Aman Logo Watermark (Bottom Right) -->
                            <div class="absolute bottom-3 right-3 z-20 pointer-events-none opacity-90">
                              <div class="px-2 py-1 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 flex items-center gap-1.5 shadow-sm">
                                 <div class="w-5 h-5 bg-blue-500 rounded-md flex items-center justify-center text-white shadow-sm">
                                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-3.5 h-3.5">
                                     <path fill-rule="evenodd" d="M12.516 2.17a.75.75 0 0 0-1.032 0 11.209 11.209 0 0 1-7.877 3.08.75.75 0 0 0-.722.515A12.74 12.74 0 0 0 2.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 0 0 .374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 0 0-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08Zm3.094 8.016a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clip-rule="evenodd" />
                                   </svg>
                                 </div>
                                 <span class="text-[10px] font-bold text-white drop-shadow-md">Aman AI</span>
                              </div>
                            </div>
                        } @else if (img.isPending) {
                            <!-- Loading State (Horizontal Premium Design - Ultra Wide) -->
                            <div class="flex flex-col lg:flex-row items-center justify-between gap-8 p-8 sm:p-12 w-full min-h-[240px] rounded-3xl bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/60 dark:from-slate-900 dark:via-blue-900/20 dark:to-indigo-900/30 border border-slate-200/60 dark:border-slate-700/40 relative overflow-hidden group/loading shadow-2xl shadow-blue-500/5">
                                
                                <!-- Animated Background Elements -->
                                <div class="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-shimmer"></div>
                                <div class="absolute -inset-[100%] opacity-[0.05] dark:opacity-[0.08] bg-[radial-gradient(#3b82f6_1.5px,transparent_1.5px)] [background-size:32px_32px]"></div>

                                <!-- Text Content (Left Side) -->
                                <div class="flex flex-col items-center lg:items-start gap-4 z-10 flex-1 text-center lg:text-right">
                                  <div class="flex items-center gap-4">
                                    <div class="w-2.5 h-10 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full animate-pulse"></div>
                                    <h4 class="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-blue-800 to-slate-700 dark:from-white dark:via-blue-400 dark:to-slate-400 tracking-tight">
                                      {{ t().generatingImage || 'جاري رسم خيالك...' }}
                                    </h4>
                                  </div>
                                  <p class="text-base text-slate-500 dark:text-slate-400 font-medium max-w-md leading-relaxed">
                                    {{ t().generatingImageDesc }}
                                  </p>
                                  
                                  <div class="flex items-center gap-3 mt-4 bg-white/50 dark:bg-black/20 px-4 py-2 rounded-full border border-white/50 dark:border-white/5">
                                    <div class="flex gap-1.5">
                                      <span class="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]"></span>
                                      <span class="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]"></span>
                                      <span class="w-2.5 h-2.5 rounded-full bg-purple-500 animate-bounce"></span>
                                    </div>
                                    <span class="text-sm text-blue-600 dark:text-blue-400 font-black tracking-widest uppercase">{{ t().pleaseWait || 'يرجى الانتظار لحظات' }}</span>
                                  </div>
                                </div>

                                <!-- Center Logo Animation (Right Side) -->
                                <div class="relative flex-shrink-0 lg:ml-12">
                                    <!-- Premium Glow Effects -->
                                    <div class="absolute inset-0 bg-blue-500/15 blur-[60px] rounded-full animate-pulse"></div>
                                    <div class="absolute inset-0 bg-indigo-500/10 blur-[40px] rounded-full animate-pulse [animation-delay:0.7s]"></div>
                                    
                                    <!-- Main Spinner Container -->
                                    <div class="relative w-44 h-44 flex items-center justify-center">
                                        <!-- Outer Rotating Ring (SVG) -->
                                        <div class="absolute inset-0 animate-[spin_4s_linear_infinite]">
                                          <svg class="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <!-- Background Track -->
                                            <circle cx="50" cy="50" r="44" stroke="currentColor" stroke-width="1" class="text-blue-100/30 dark:text-blue-900/10" />
                                            <!-- Animated Arc -->
                                            <circle cx="50" cy="50" r="44" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="70 210" class="text-blue-600 dark:text-blue-400" />
                                          </svg>
                                        </div>

                                        <!-- Inner Rotating Dotted Ring -->
                                        <div class="absolute inset-6 animate-[spin_10s_linear_infinite_reverse]">
                                          <svg class="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <circle cx="50" cy="50" r="46" stroke="currentColor" stroke-width="1" stroke-dasharray="4 12" class="text-indigo-300/40 dark:text-indigo-700/20" />
                                          </svg>
                                        </div>

                                        <!-- Jumping Aman Logo (Perfectly Centered) -->
                                        <div class="relative z-10 animate-bounce [animation-duration:1.8s]">
                                          <div class="w-20 h-20 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 dark:from-blue-500 dark:via-blue-600 dark:to-indigo-700 rounded-[30px] flex items-center justify-center text-white shadow-[0_25px_50px_-12px_rgba(37,99,235,0.5)] rotate-3">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-11 h-11">
                                              <path stroke-linecap="round" stroke-linejoin="round" d="M12 1.5a4.5 4.5 0 0 0-4.5 4.5V9h9V6a4.5 4.5 0 0 0-4.5-4.5ZM12 12a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM3 9h18v10.5a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V9Z" />
                                            </svg>
                                          </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        } @else {
                            <!-- Error State -->
                            <div class="flex flex-col items-center justify-center gap-2 py-10 text-red-400">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 opacity-50">
                                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                </svg>
                                <span class="text-xs">فشل تحميل الصورة</span>
                            </div>
                        }
                     </div>
                     
                     <!-- Actions Overlay (Centered) -->
                     @if (img.url) {
                         <div class="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 z-30">
                           
                           <button (click)="downloadImage(img.url!)" class="p-3 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-all hover:scale-110 active:scale-95 border border-white/20" title="Download">
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                               <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M12 12.75l-3-3m0 0 3-3m-3 3h7.5" transform="rotate(-90 12 12)" />
                             </svg>
                           </button>
    
                           <button (click)="uiService.openImageView(img.url!)" class="p-3 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-all hover:scale-110 active:scale-95 border border-white/20" title="View Full Screen">
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                               <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                             </svg>
                           </button>
    
                           <button (click)="shareImage(img.url!)" class="p-3 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-all hover:scale-110 active:scale-95 border border-white/20" title="Share Image">
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                               <path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                             </svg>
                           </button>
    
                         </div>
                     }
 
                     <!-- Prompt Tooltip (Optional) -->
                     <div class="absolute bottom-4 left-4 right-32 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0 z-10 pointer-events-none">
                        <p class="text-[10px] text-white/80 line-clamp-2 font-medium drop-shadow-md">{{ img.alt || message().text }}</p>
                     </div>
                   </div>
                 }
               </div>
             }

             <!-- Formatted Text (Markdown) -->
             @if (message().text) {
                <div 
                  class="text-slate-800 dark:text-white prose prose-lg dark:prose-invert max-w-none break-words leading-loose font-medium" 
                  (click)="handleContentClick($event)">
                  @if (renderedText()) {
                    <div [innerHTML]="renderedText()"></div>
                  } @else {
                    <div class="whitespace-pre-wrap">{{ message().text }}</div>
                  }
                </div>
             }

             <!-- LOCATION CARD (Premium Redesign) -->
             @if (message().location; as loc) {
               <div class="mt-4 mb-4 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl animate-slide-up max-w-sm group/card">
                 <!-- Real Map Iframe -->
                 <div class="h-56 bg-slate-100 dark:bg-slate-950 relative overflow-hidden">
                   <iframe 
                     [src]="getMapUrl(loc.lat, loc.lng)"
                     width="100%" 
                     height="100%" 
                     style="border:0;" 
                     allowfullscreen="" 
                     loading="lazy" 
                     referrerpolicy="no-referrer-when-downgrade">
                   </iframe>
                 </div>
                 <!-- Old content hidden -->
                 <div style="display:none">
                   <!-- Grid Background -->
                   <div class="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]"></div>
                   
                   <!-- Pulse Rings -->
                   <div class="absolute inset-0 flex items-center justify-center">
                     <div class="w-24 h-24 rounded-full border border-blue-500/20 animate-ping [animation-duration:3s]"></div>
                     <div class="w-16 h-16 rounded-full border border-blue-500/30 animate-ping [animation-duration:2s]"></div>
                   </div>

                   <!-- Marker -->
                   <div class="relative z-10 flex flex-col items-center">
                     <div class="w-12 h-12 bg-blue-600 rounded-2xl rotate-45 flex items-center justify-center text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-transform group-hover/card:scale-110">
                       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 -rotate-45">
                         <path fill-rule="evenodd" d="m11.54 22.351.07.04.028.016a.76.76 0 0 0 .723 0l.028-.015.071-.041a16.975 16.975 0 0 0 1.144-.742 19.58 19.58 0 0 0 2.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 0 0-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 0 0 2.682 2.282 16.975 16.975 0 0 0 1.145.742ZM12 13.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clip-rule="evenodd" />
                       </svg>
                     </div>
                     <div class="w-6 h-1.5 bg-black/20 dark:bg-white/10 blur-md rounded-full mt-4 scale-x-150"></div>
                   </div>

                   <!-- Coordinates Overlay -->
                   <div class="absolute bottom-3 left-4 px-2 py-1 rounded-md bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 text-[9px] font-mono text-slate-500">
                     {{ loc.lat.toFixed(4) }}, {{ loc.lng.toFixed(4) }}
                   </div>
                 </div>

                 <!-- Info Section -->
                 <div class="p-5">
                   <div class="flex items-center gap-4 mb-5">
                     <div class="flex-1">
                       <p class="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-bold mb-1">{{ t().currentLocation || 'الموقع الحالي' }}</p>
                       <h3 class="text-sm font-bold text-slate-800 dark:text-white truncate">{{ loc.label || 'تم تحديد موقعك بدقة' }}</h3>
                     </div>
                     <div class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                         <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                         <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                       </svg>
                     </div>
                   </div>

                   <div class="grid grid-cols-2 gap-3 mb-5">
                     <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                       <p class="text-[9px] uppercase text-slate-400 font-bold mb-1">{{ t().latitude || 'خط العرض' }}</p>
                       <p class="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">{{ loc.lat.toFixed(4) }}</p>
                     </div>
                     <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                       <p class="text-[9px] uppercase text-slate-400 font-bold mb-1">{{ t().longitude || 'خط الطول' }}</p>
                       <p class="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">{{ loc.lng.toFixed(4) }}</p>
                     </div>
                   </div>

                   <div class="flex gap-2">
                     <button (click)="openInMaps(loc.lat, loc.lng)" class="flex-1 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2 shadow-xl shadow-slate-900/10 dark:shadow-white/5">
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                         <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                       </svg>
                       {{ t().openInMaps || 'فتح في الخرائط' }}
                     </button>
                     <button (click)="openInMaps(loc.lat, loc.lng, false)" class="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]">
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
                         <path stroke-linecap="round" stroke-linejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
                       </svg>
                     </button>
                   </div>
                 </div>
               </div>
             }

             <!-- ROUTE CARD -->
             @if (message().route; as route) {
               <div class="mt-4 mb-4 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl animate-slide-up max-w-sm group/card">
                 <div class="h-56 bg-slate-100 dark:bg-slate-950 relative overflow-hidden">
                   <iframe 
                     [src]="getRouteUrl(route.origin.lat, route.origin.lng, route.destination.lat, route.destination.lng)"
                     width="100%" 
                     height="100%" 
                     style="border:0;" 
                     allowfullscreen="" 
                     loading="lazy" 
                     referrerpolicy="no-referrer-when-downgrade">
                   </iframe>
                 </div>
                 <div class="p-5">
                   <div class="flex items-center gap-4 mb-5">
                     <div class="flex-1">
                       <p class="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-bold mb-1">المسار</p>
                       <h3 class="text-sm font-bold text-slate-800 dark:text-white truncate" [title]="route.origin.label">من: {{ route.origin.label }}</h3>
                       <h3 class="text-sm font-bold text-slate-800 dark:text-white truncate" [title]="route.destination.label">إلى: {{ route.destination.label }}</h3>
                       <div class="flex items-center gap-3 mt-2">
                         @if (route.distance) {
                           <p class="text-xs font-bold text-blue-600 dark:text-blue-400">{{ route.distance }}</p>
                         }
                         @if (route.duration) {
                           <span class="text-slate-300 dark:text-slate-600">|</span>
                           <p class="text-xs font-bold text-green-600 dark:text-green-400">{{ route.duration }}</p>
                         }
                       </div>
                     </div>
                   </div>
                   <div class="flex gap-2">
                     <button (click)="openRouteInMaps(route.origin.lat, route.origin.lng, route.destination.lat, route.destination.lng)" class="flex-1 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2 shadow-xl shadow-slate-900/10 dark:shadow-white/5">
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                         <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                       </svg>
                       فتح في الخرائط
                     </button>
                   </div>
                 </div>
               </div>
             }

             <!-- GENERATED FILE DOWNLOAD -->
             @if (message().generatedFile; as file) {
               <div class="mt-4">
                 <button (click)="downloadGeneratedFile(file)" class="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors shadow-sm border border-blue-200 dark:border-blue-800/50">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                     <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                   </svg>
                   <span>{{ file.filename }}</span>
                 </button>
               </div>
             }

             <!-- Error -->
             @if (message().isError) {
                <div class="mt-2 text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2">
                   <span>{{ message().text || t().error }}</span>
                </div>
             }
             
             <!-- Actions (Copy Only) -->
             @if (!message().isError && message().text) {
               <div class="mt-2 flex justify-end gap-2 no-print">
                  <!-- Delete Button -->
                  <button (click)="onDelete.emit(message().id)" 
                          class="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1.5 text-xs"
                          title="Delete Message">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                  <!-- TTS Button -->
                  <button (click)="playAudio()" 
                          class="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 transition-colors flex items-center gap-1.5 text-xs"
                          title="Listen to Text">
                    @switch (ttsState()) {
                      @case ('idle') {
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                        </svg>
                      }
                      @case ('loading') {
                        <svg class="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      }
                      @case ('playing') {
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 text-blue-500">
                          <path fill-rule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3-3h-9a3 3 0 0 1-3-3v-9Z" clip-rule="evenodd" />
                        </svg>
                      }
                    }
                  </button>
                  <!-- Share Button -->
                  <button (click)="shareText()" 
                          class="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 transition-colors flex items-center gap-1.5 text-xs"
                          title="Share Text">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                    </svg>
                  </button>
                  <!-- Copy Button -->
                  <button (click)="copyText()" 
                          class="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 transition-colors flex items-center gap-1.5 text-xs"
                          title="Copy Full Text">
                    @if (copied()) {
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4 text-green-500">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    } @else {
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5" />
                      </svg>
                    }
                  </button>
               </div>
             }
          </div>
        </div>
      }
    </div>
  `
})
export class MessageBubbleComponent {
  message = input<ChatMessage>({ id: 'system-msg', role: 'system', text: '' });
  t = input<any>(translations.ar);
  isUser = computed(() => this.message().role === 'user');
  onEdit = output<ChatMessage>();
  onDelete = output<string>();
  renderedText = signal('');
  copied = signal(false);
  ttsState = signal<'idle' | 'loading' | 'playing'>('idle');
  
  isEditing = signal(false);
  editValue = signal('');
  isConfirmingDelete = signal(false);
  showMobileActions = signal(false);
  private pressTimer: any;

  onTouchStart() {
    this.pressTimer = setTimeout(() => {
      this.showMobileActions.set(true);
      // Auto-hide after 5 seconds
      setTimeout(() => this.showMobileActions.set(false), 5000);
    }, 500); // 500ms long press
  }

  onTouchEnd() {
    if (this.pressTimer) {
      clearTimeout(this.pressTimer);
    }
  }

  private geminiService = inject(GeminiService);
  public uiService = inject(UiService);
  private imageService = inject(ImageService);
  private audio = new Audio();

  startEdit() {
    this.editValue.set(this.message().text);
    this.isEditing.set(true);
  }

  saveEdit() {
    const newText = this.editValue().trim();
    if (newText && newText !== this.message().text) {
      this.onEdit.emit({ ...this.message(), text: newText, isEdited: true });
    }
    this.isEditing.set(false);
  }

  cancelEdit() {
    this.isEditing.set(false);
  }

  confirmDelete() {
    this.isConfirmingDelete.set(true);
  }

  executeDelete() {
    this.onDelete.emit(this.message().id);
    this.isConfirmingDelete.set(false);
  }

  cancelDelete() {
    this.isConfirmingDelete.set(false);
  }

  constructor() {
    // 1. Configure Marked Renderer for Code Blocks with Modern UI
    const renderer = new marked.Renderer();
    // FIX: Corrected renderer.code signature for marked v12 to prevent compilation errors.
    // Corrected the signature for renderer.code to accept a single object argument based on the TypeScript error.
    renderer.code = (code: string, lang: string | undefined) => {
      const validLang = lang || 'code';
      const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
      return `
        <div class="code-wrapper group my-4 rounded-xl overflow-hidden bg-[#1e1e1e] text-gray-200 border border-gray-700 relative shadow-lg" dir="ltr">
          <!-- Header -->
          <div class="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-gray-700">
             <span class="font-mono text-xs font-bold text-gray-400 uppercase tracking-wider">${validLang}</span>
             <div class="flex items-center gap-2">
               <!-- Share Button -->
               <button type="button" class="share-code-btn p-1.5 text-gray-300 hover:text-white transition-colors rounded-md hover:bg-white/10" title="${this.t().share || 'مشاركة'}">
                 <svg class="w-4 h-4 pointer-events-none" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                   <path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                 </svg>
               </button>
               <!-- Copy Button -->
               <button type="button" class="copy-code-btn p-1.5 text-gray-300 hover:text-white transition-colors rounded-md hover:bg-white/10" title="${this.t().copyCode || 'نسخ الكود'}">
                 <svg class="copy-icon w-4 h-4 pointer-events-none" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                   <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5" />
                 </svg>
                 <svg class="check-icon w-4 h-4 text-green-500 pointer-events-none hidden" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                   <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                 </svg>
               </button>
             </div>
          </div>
          <pre class="!m-0 !p-4 overflow-x-auto text-sm leading-6 font-mono text-gray-300 bg-[#1e1e1e]"><code class="language-${validLang}">${DOMPurify.sanitize(escapedCode)}</code></pre>
        </div>
      `;
    };
    marked.use({ renderer });

    effect(() => {
      const msg = this.message();
      if (msg.role !== 'user' && msg.text) {
        try {
          // Parse markdown asynchronously
          marked.parse(msg.text, { async: true }).then(raw => {
            const cleanHtml = DOMPurify.sanitize(raw, {
              ADD_TAGS: ['svg', 'path', 'button', 'div', 'span', 'pre', 'code'],
              ADD_ATTR: ['class', 'dir', 'title', 'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'd', 'xmlns', 'type', 'aria-hidden', 'aria-label']
            });
            this.renderedText.set(cleanHtml);
          });
        } catch (e) {
          this.renderedText.set(msg.text); 
        }
      }
    });
  }

  handleContentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    
    // Handle Copy
    const copyBtn = target.closest('.copy-code-btn') as HTMLElement;
    if (copyBtn) {
      const wrapper = copyBtn.closest('.code-wrapper');
      if (wrapper) {
        const codeElement = wrapper.querySelector('code');
        if (codeElement) {
          const textToCopy = codeElement.textContent || (codeElement as HTMLElement).innerText || '';
          navigator.clipboard.writeText(textToCopy).then(() => {
            const copyIcon = copyBtn.querySelector('.copy-icon');
            const checkIcon = copyBtn.querySelector('.check-icon');
            
            if (copyIcon && checkIcon) {
              copyIcon.classList.add('hidden');
              checkIcon.classList.remove('hidden');
              
              setTimeout(() => {
                copyIcon.classList.remove('hidden');
                checkIcon.classList.add('hidden');
              }, 2000);
            }
          }).catch(err => console.error('Failed to copy code: ', err));
        }
      }
      return;
    }

    // Handle Share
    const shareBtn = target.closest('.share-code-btn') as HTMLElement;
    if (shareBtn) {
      const wrapper = shareBtn.closest('.code-wrapper');
      if (wrapper) {
        const codeElement = wrapper.querySelector('code');
        if (codeElement) {
          const textToShare = codeElement.textContent || (codeElement as HTMLElement).innerText || '';
          if (navigator.share) {
            navigator.share({
              title: 'Code Snippet',
              text: textToShare
            }).catch(e => console.error(e));
          } else {
             this.uiService.showToast(this.t().shareNotSupported || 'المشاركة غير مدعومة', 'error');
          }
        }
      }
      return;
    }
  }

  async playAudio() {
    if (this.ttsState() === 'playing') {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.ttsState.set('idle');
        return;
    }

    this.ttsState.set('loading');
    try {
        const textToSpeak = this.message().text;
        if (!textToSpeak) {
            this.ttsState.set('idle');
            return;
        }
        const { url } = await this.geminiService.synthesizeSpeech(textToSpeak);
        this.audio.src = url;
        this.audio.play();
        this.ttsState.set('playing');

        this.audio.onended = () => {
            this.ttsState.set('idle');
        };
        this.audio.onerror = () => {
            console.error('Error playing audio.');
            this.ttsState.set('idle');
        }
    } catch (error) {
        console.error('TTS failed', error);
        this.ttsState.set('idle');
    }
  }

  shareText() {
    const text = this.message().text;
    if (text) {
      if (navigator.share) {
        navigator.share({
          title: 'Aman AI Message',
          text: text
        }).catch(err => console.error('Error sharing:', err));
      } else {
        this.copyText();
      }
    }
  }

  async shareImage(url: string) {
    this.imageService.shareImage(url, 'Aman AI Image');
  }

  copyText() {
    const text = this.message().text;
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      });
    }
  }

  downloadImage(url: string) {
    this.imageService.downloadImageWithWatermark(url, `aman-ai-image-${Date.now()}.png`);
  }

  openInMaps(lat: number, lng: number, viewOnly: boolean = false) {
    const url = viewOnly 
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  }

  sanitizer = inject(DomSanitizer);

  getMapUrl(lat: number, lng: number): SafeResourceUrl {
    const url = `https://maps.google.com/maps?q=${lat},${lng}&hl=ar&z=15&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  getRouteUrl(olat: number, olng: number, dlat: number, dlng: number): SafeResourceUrl {
    const url = `https://maps.google.com/maps?saddr=${olat},${olng}&daddr=${dlat},${dlng}&hl=ar&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  openRouteInMaps(olat: number, olng: number, dlat: number, dlng: number) {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${olat},${olng}&destination=${dlat},${dlng}`;
    window.open(url, '_blank');
  }

  async downloadGeneratedFile(file: NonNullable<ChatMessage['generatedFile']>) {
    if (file.type === 'docx') {
      const doc = new Document({
        sections: [{
          children: file.content.split('\n').map(p => new Paragraph({
            children: [new TextRun(p)],
            bidirectional: true
          })),
        }],
      });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, file.filename);
    } else if (file.type === 'pdf') {
      const pdf = new jsPDF();
      pdf.text(file.content, 10, 10); // Basic text to PDF
      pdf.save(file.filename);
    } else { // txt
      const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, file.filename);
    }
  }
}
