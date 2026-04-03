import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphoneStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  
  private nextStartTime: number = 0;
  private audioQueue: AudioBufferSourceNode[] = [];

  audioScale = signal(1);
  private smoothedRms = 0;
  private animationFrameId: number | null = null;

  async setupAudio(onAudioData: (base64: string) => void) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Microphone access is not supported by your browser.");
    }
    
    this.microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioContext = new AudioContext({ sampleRate: 16000 });
    const source = this.audioContext.createMediaStreamSource(this.microphoneStream);
    
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    source.connect(this.analyser);
    
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmData = this.floatTo16BitPCM(inputData);
      const base64 = this.arrayBufferToBase64(pcmData.buffer);
      onAudioData(base64);
    };
    source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);

    this.startVisualizerDataLoop();
  }

  stopAudio() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => track.stop());
      this.microphoneStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.interruptSpeech();
  }

  interruptSpeech() {
    this.audioQueue.forEach(source => {
      try { source.stop(); } catch(e) {}
    });
    this.audioQueue = [];
    this.nextStartTime = 0;
  }

  playAudioChunk(base64: string, onEnded?: () => void) {
    if (!this.audioContext) return;
    
    const pcmData = this.base64ToArrayBuffer(base64);
    const floatData = this.pcm16ToFloat32(new Int16Array(pcmData));
    
    const audioBuffer = this.audioContext.createBuffer(1, floatData.length, 24000);
    audioBuffer.getChannelData(0).set(floatData);
    
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    
    const currentTime = this.audioContext.currentTime;
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime + 0.05;
    }
    
    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
    this.audioQueue.push(source);
    
    source.onended = () => {
      this.audioQueue = this.audioQueue.filter(s => s !== source);
      if (onEnded) onEnded();
    };
  }

  getAnalyser() {
    return this.analyser;
  }

  private startVisualizerDataLoop() {
    if (!this.analyser) return;
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const update = () => {
      this.animationFrameId = requestAnimationFrame(update);
      if (!this.analyser) return;
      
      this.analyser.getByteTimeDomainData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += (dataArray[i] - 128) * (dataArray[i] - 128);
      }
      let rms = Math.sqrt(sum / bufferLength);
      this.smoothedRms = this.smoothedRms * 0.8 + rms * 0.2;
      this.audioScale.set(1 + (this.smoothedRms / 40));
    };
    update();
  }

  getSmoothedRms() {
    return this.smoothedRms;
  }

  private floatTo16BitPCM(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const buffer = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return buffer;
  }

  private pcm16ToFloat32(input: Int16Array): Float32Array {
    const output = new Float32Array(input.length);
    for (let i = 0; i < input.length; i++) {
      output[i] = input[i] / 0x8000;
    }
    return output;
  }
}
