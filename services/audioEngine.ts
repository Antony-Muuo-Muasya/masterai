
import { MasteringIntensity, OutputTarget } from '../types';

export class MasteringEngine {
  private context: AudioContext;
  private source: AudioBufferSourceNode | null = null;
  private buffer: AudioBuffer | null = null;
  
  // DSP Nodes
  private inputGain: GainNode;
  private eqLow: BiquadFilterNode;
  private eqMid: BiquadFilterNode;
  private eqHigh: BiquadFilterNode;
  private compressor: DynamicsCompressorNode;
  private limiter: DynamicsCompressorNode;
  private makeupGain: GainNode;
  private outputGain: GainNode;
  private bypassGain: GainNode;
  private analyzer: AnalyserNode;

  // State
  private intensity: MasteringIntensity = MasteringIntensity.MEDIUM;
  private target: OutputTarget = OutputTarget.STREAMING;
  private isBypass: boolean = false;

  constructor() {
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    this.inputGain = this.context.createGain();
    this.eqLow = this.context.createBiquadFilter();
    this.eqMid = this.context.createBiquadFilter();
    this.eqHigh = this.context.createBiquadFilter();
    this.compressor = this.context.createDynamicsCompressor();
    this.limiter = this.context.createDynamicsCompressor();
    this.makeupGain = this.context.createGain();
    this.outputGain = this.context.createGain();
    this.bypassGain = this.context.createGain();
    this.analyzer = this.context.createAnalyser();

    this.setupChain();
  }

  private setupChain() {
    // EQ Types
    this.eqLow.type = 'lowshelf';
    this.eqLow.frequency.value = 180;
    
    this.eqMid.type = 'peaking';
    this.eqMid.frequency.value = 2500;
    this.eqMid.Q.value = 0.7;
    
    this.eqHigh.type = 'highshelf';
    this.eqHigh.frequency.value = 8000;

    // Mastering Limiter (Fixed Peak Protection)
    this.limiter.threshold.value = -0.3;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.001;
    this.limiter.release.value = 0.1;

    // Route: source -> inputGain
    // Path A: Mastered (inputGain -> EQ -> Comp -> Limiter -> Makeup -> outputGain -> analyzer)
    // Path B: Bypass (inputGain -> bypassGain -> analyzer)
    
    this.inputGain.connect(this.eqLow);
    this.eqLow.connect(this.eqMid);
    this.eqMid.connect(this.eqHigh);
    this.eqHigh.connect(this.compressor);
    this.compressor.connect(this.limiter);
    this.limiter.connect(this.makeupGain);
    this.makeupGain.connect(this.outputGain);
    this.outputGain.connect(this.analyzer);

    this.inputGain.connect(this.bypassGain);
    this.bypassGain.connect(this.analyzer);

    this.analyzer.connect(this.context.destination);

    // Initial state: Mastered path on, bypass off
    this.updateGains();
  }

  private updateGains() {
    if (this.isBypass) {
      this.outputGain.gain.setTargetAtTime(0, this.context.currentTime, 0.05);
      this.bypassGain.gain.setTargetAtTime(1, this.context.currentTime, 0.05);
    } else {
      this.outputGain.gain.setTargetAtTime(1, this.context.currentTime, 0.05);
      this.bypassGain.gain.setTargetAtTime(0, this.context.currentTime, 0.05);
    }
  }

  async loadFile(file: File): Promise<AudioBuffer> {
    const arrayBuffer = await file.arrayBuffer();
    this.buffer = await this.context.decodeAudioData(arrayBuffer);
    return this.buffer;
  }

  updateParameters(intensity: MasteringIntensity, target: OutputTarget, isBypass: boolean) {
    this.intensity = intensity;
    this.target = target;
    this.isBypass = isBypass;

    this.updateGains();

    const now = this.context.currentTime;
    const intensityFactor = intensity === MasteringIntensity.HIGH ? 1.5 : intensity === MasteringIntensity.MEDIUM ? 1.0 : 0.5;

    // Reset EQ
    this.eqLow.gain.setTargetAtTime(0, now, 0.1);
    this.eqMid.gain.setTargetAtTime(0, now, 0.1);
    this.eqHigh.gain.setTargetAtTime(0, now, 0.1);

    switch (target) {
      case OutputTarget.STREAMING:
        this.compressor.threshold.setTargetAtTime(-16 * intensityFactor, now, 0.1);
        this.compressor.ratio.setTargetAtTime(3 * intensityFactor + 1, now, 0.1);
        this.eqHigh.gain.setTargetAtTime(2 * intensityFactor, now, 0.1);
        this.makeupGain.gain.setTargetAtTime(1.2, now, 0.1);
        break;
      case OutputTarget.CLUB:
        this.compressor.threshold.setTargetAtTime(-12 * intensityFactor, now, 0.1);
        this.compressor.ratio.setTargetAtTime(5 * intensityFactor + 1, now, 0.1);
        this.eqLow.gain.setTargetAtTime(6 * intensityFactor, now, 0.1); // Massive Bass
        this.eqHigh.gain.setTargetAtTime(3 * intensityFactor, now, 0.1); // Crisp Highs
        this.makeupGain.gain.setTargetAtTime(1.5, now, 0.1);
        break;
      case OutputTarget.PODCAST:
        this.compressor.threshold.setTargetAtTime(-24 * intensityFactor, now, 0.1); // Heavy leveling
        this.compressor.ratio.setTargetAtTime(6 * intensityFactor + 1, now, 0.1);
        this.eqMid.gain.setTargetAtTime(4 * intensityFactor, now, 0.1); // Presence
        this.eqLow.gain.setTargetAtTime(-3, now, 0.1); // De-mud
        this.makeupGain.gain.setTargetAtTime(1.1, now, 0.1);
        break;
      case OutputTarget.DYNAMIC:
        this.compressor.threshold.setTargetAtTime(-6 * intensityFactor, now, 0.1);
        this.compressor.ratio.setTargetAtTime(1.5 * intensityFactor + 1, now, 0.1);
        this.makeupGain.gain.setTargetAtTime(1.0, now, 0.1);
        break;
    }
  }

  async exportMaster(): Promise<Blob> {
    if (!this.buffer) throw new Error("No audio buffer loaded");

    const offlineCtx = new OfflineAudioContext(
      this.buffer.numberOfChannels,
      this.buffer.length,
      this.buffer.sampleRate
    );

    // Recreate chain in offline context
    const source = offlineCtx.createBufferSource();
    source.buffer = this.buffer;

    const eqLow = offlineCtx.createBiquadFilter();
    const eqMid = offlineCtx.createBiquadFilter();
    const eqHigh = offlineCtx.createBiquadFilter();
    const compressor = offlineCtx.createDynamicsCompressor();
    const limiter = offlineCtx.createDynamicsCompressor();
    const makeupGain = offlineCtx.createGain();

    // Copy parameters from real-time nodes
    eqLow.type = 'lowshelf';
    eqLow.frequency.value = this.eqLow.frequency.value;
    eqLow.gain.value = this.eqLow.gain.value;

    eqMid.type = 'peaking';
    eqMid.frequency.value = this.eqMid.frequency.value;
    eqMid.Q.value = this.eqMid.Q.value;
    eqMid.gain.value = this.eqMid.gain.value;

    eqHigh.type = 'highshelf';
    eqHigh.frequency.value = this.eqHigh.frequency.value;
    eqHigh.gain.value = this.eqHigh.gain.value;

    compressor.threshold.value = this.compressor.threshold.value;
    compressor.ratio.value = this.compressor.ratio.value;
    compressor.attack.value = this.compressor.attack.value;
    compressor.release.value = this.compressor.release.value;

    limiter.threshold.value = this.limiter.threshold.value;
    limiter.ratio.value = this.limiter.ratio.value;

    makeupGain.gain.value = this.makeupGain.gain.value;

    // Connect offline chain
    source.connect(eqLow);
    eqLow.connect(eqMid);
    eqMid.connect(eqHigh);
    eqHigh.connect(compressor);
    compressor.connect(limiter);
    limiter.connect(makeupGain);
    makeupGain.connect(offlineCtx.destination);

    source.start(0);
    const renderedBuffer = await offlineCtx.startRendering();

    return this.bufferToWav(renderedBuffer);
  }

  private bufferToWav(buffer: AudioBuffer): Blob {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArray = new ArrayBuffer(length);
    const view = new DataView(bufferArray);
    const channels = [];
    let i;
    let sample;
    let offset = 0;
    let pos = 0;

    // write WAVE header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit (hardcoded)

    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    // write interleaved data
    for (i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (i = 0; i < numOfChan; i++) {
        // interleave channels
        sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
        view.setInt16(pos, sample, true); // write 16-bit sample
        pos += 2;
      }
      offset++; // next source sample
    }

    return new Blob([bufferArray], { type: "audio/wav" });

    function setUint16(data: number) {
      view.setUint16(pos, data, true);
      pos += 2;
    }

    function setUint32(data: number) {
      view.setUint32(pos, data, true);
      pos += 4;
    }
  }

  play() {
    if (!this.buffer) return;
    if (this.source) {
      try { this.source.stop(); } catch(e) {}
    }
    
    this.source = this.context.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.loop = true; // Loop for easier comparison
    this.source.connect(this.inputGain);
    this.source.start(0);
  }

  stop() {
    if (this.source) {
      try { this.source.stop(); } catch(e) {}
      this.source = null;
    }
  }

  getAnalyzer() {
    return this.analyzer;
  }

  getState() {
    return this.context.state;
  }

  resume() {
    return this.context.resume();
  }
}
