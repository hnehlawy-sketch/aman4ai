import { Component, ElementRef, ViewChild, inject, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioService } from '../services/audio.service';

@Component({
  selector: 'app-live-visualizer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-48 h-48 flex items-center justify-center mb-8 shrink-0">
      <canvas #liveCanvas class="absolute inset-0 w-full h-full"></canvas>
      
      <!-- Core Orb -->
      <div class="absolute w-24 h-24 rounded-full bg-black border-2 border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] flex items-center justify-center z-10 transition-transform duration-200"
           [style.transform]="'scale(' + audioService.audioScale() + ')'">
        @if (state() === 'listening') {
          <div class="w-3 h-3 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
        } @else if (state() === 'speaking') {
          <div class="w-3 h-3 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.8)]"></div>
        } @else if (state() === 'connecting') {
          <svg class="animate-spin h-6 w-6 text-white/50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        }
      </div>
    </div>
  `
})
export class LiveVisualizerComponent {
  audioService = inject(AudioService);
  state = input<'idle' | 'connecting' | 'listening' | 'speaking' | 'error'>('idle');
  
  @ViewChild('liveCanvas') private liveCanvas!: ElementRef<HTMLCanvasElement>;
  private animationFrameId: number | null = null;

  constructor() {
    effect(() => {
      if (this.state() !== 'idle' && this.state() !== 'error') {
        this.startDrawing();
      } else {
        this.stopDrawing();
      }
    });
  }

  private startDrawing() {
    if (this.animationFrameId) return;
    
    const draw = () => {
      this.animationFrameId = requestAnimationFrame(draw);
      this.render();
    };
    draw();
  }

  private stopDrawing() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private render() {
    const analyser = this.audioService.getAnalyser();
    const canvas = this.liveCanvas?.nativeElement;
    if (!analyser || !canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;
    
    ctx.clearRect(0, 0, width, height);

    const smoothedRms = this.audioService.getSmoothedRms();
    const centerX = width / 2;
    const centerY = height / 2;
    const baseRadius = 50;

    // Draw waveform circle
    ctx.beginPath();
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const angle = (i / bufferLength) * Math.PI * 2;
      const radius = baseRadius + (v * smoothedRms * 1.5);
      
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    
    if (this.state() === 'speaking') {
      ctx.strokeStyle = `rgba(249, 115, 22, ${0.4 + (smoothedRms / 50)})`;
      ctx.lineWidth = 2 + (smoothedRms / 15);
    } else if (this.state() === 'listening') {
      ctx.strokeStyle = `rgba(59, 130, 246, ${0.4 + (smoothedRms / 50)})`;
      ctx.lineWidth = 2 + (smoothedRms / 20);
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
    }
    
    ctx.stroke();
    
    // Draw a second, smoother ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius + smoothedRms, 0, 2 * Math.PI);
    ctx.strokeStyle = this.state() === 'speaking' ? 'rgba(249, 115, 22, 0.2)' : 'rgba(59, 130, 246, 0.2)';
    ctx.lineWidth = 1 + (smoothedRms / 10);
    ctx.stroke();
  }
}
