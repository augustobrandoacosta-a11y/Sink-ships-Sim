/**
 * Procedural Web Audio Sound Synthesizer
 * Zero external asset dependencies, works reliably offline and across all browsers.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // AudioContext will be initialized on user interaction to abide by browser autoplay policies
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // Helper to generate white noise buffer
  private createNoiseBuffer(duration: number): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // 1. Play Explosion (Bomb / Torpedo impact)
  public playExplosion(intensity: number = 1.0) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const noiseBuffer = this.createNoiseBuffer(1.4);
    if (!noiseBuffer) return;

    // Noise component
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600 * intensity, t);
    filter.frequency.exponentialRampToValueAtTime(40, t + 1.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8 * intensity, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.3);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noiseSource.start(t);
    noiseSource.stop(t + 1.3);

    // Deep sub-bass thud
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120 * intensity, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.9);

    oscGain.gain.setValueAtTime(0.7 * intensity, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.9);
  }

  // 2. Play Nuke Blast & Siren
  public playNuke() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Siren wail
    const sirenOsc = this.ctx.createOscillator();
    const sirenGain = this.ctx.createGain();
    sirenOsc.type = 'sawtooth';
    sirenOsc.frequency.setValueAtTime(500, t);
    sirenOsc.frequency.linearRampToValueAtTime(850, t + 0.6);
    sirenOsc.frequency.linearRampToValueAtTime(500, t + 1.2);
    sirenGain.gain.setValueAtTime(0.2, t);
    sirenGain.gain.linearRampToValueAtTime(0.3, t + 0.6);
    sirenGain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);

    sirenOsc.connect(sirenGain);
    sirenGain.connect(this.ctx.destination);
    sirenOsc.start(t);
    sirenOsc.stop(t + 1.8);

    // Colossal Blast after brief delay
    setTimeout(() => {
      if (this.isMuted || !this.ctx) return;
      const blastT = this.ctx.currentTime;
      const noiseBuffer = this.createNoiseBuffer(3.5);
      if (!noiseBuffer) return;

      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, blastT);
      filter.frequency.exponentialRampToValueAtTime(30, blastT + 3.2);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(1.0, blastT);
      gain.gain.exponentialRampToValueAtTime(0.001, blastT + 3.4);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(blastT);
      noise.stop(blastT + 3.4);

      // Deep nuclear seismic vibration
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(80, blastT);
      sub.frequency.exponentialRampToValueAtTime(18, blastT + 3.0);

      subGain.gain.setValueAtTime(0.9, blastT);
      subGain.gain.exponentialRampToValueAtTime(0.001, blastT + 3.0);

      sub.connect(subGain);
      subGain.connect(this.ctx.destination);
      sub.start(blastT);
      sub.stop(blastT + 3.0);
    }, 450);
  }

  // 3. Play Torpedo Launch & Underwater Whoosh
  public playTorpedo() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Ping sonar
    const ping = this.ctx.createOscillator();
    const pingGain = this.ctx.createGain();
    ping.type = 'sine';
    ping.frequency.setValueAtTime(1600, t);
    pingGain.gain.setValueAtTime(0.3, t);
    pingGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    ping.connect(pingGain);
    pingGain.connect(this.ctx.destination);
    ping.start(t);
    ping.stop(t + 0.5);

    // Underwater motor hum
    const hum = this.ctx.createOscillator();
    const humGain = this.ctx.createGain();
    hum.type = 'triangle';
    hum.frequency.setValueAtTime(180, t);
    hum.frequency.linearRampToValueAtTime(320, t + 0.8);
    humGain.gain.setValueAtTime(0.25, t);
    humGain.gain.exponentialRampToValueAtTime(0.01, t + 1.2);

    hum.connect(humGain);
    humGain.connect(this.ctx.destination);
    hum.start(t);
    hum.stop(t + 1.2);
  }

  // 4. Play Split Tool (Laser Cutter & Metal Shear)
  public playSplit() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Laser charge & cut
    const laser = this.ctx.createOscillator();
    const laserGain = this.ctx.createGain();
    laser.type = 'sawtooth';
    laser.frequency.setValueAtTime(1400, t);
    laser.frequency.exponentialRampToValueAtTime(180, t + 0.5);

    laserGain.gain.setValueAtTime(0.5, t);
    laserGain.gain.exponentialRampToValueAtTime(0.01, t + 0.55);

    laser.connect(laserGain);
    laserGain.connect(this.ctx.destination);
    laser.start(t);
    laser.stop(t + 0.55);

    // Heavy metal stress groan
    const metal = this.ctx.createOscillator();
    const metalGain = this.ctx.createGain();
    metal.type = 'square';
    metal.frequency.setValueAtTime(85, t + 0.1);
    metal.frequency.linearRampToValueAtTime(45, t + 1.5);

    metalGain.gain.setValueAtTime(0.35, t + 0.1);
    metalGain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

    metal.connect(metalGain);
    metalGain.connect(this.ctx.destination);
    metal.start(t + 0.1);
    metal.stop(t + 1.5);
  }

  // 5. Play Iceberg Crunch & Grinding
  public playIceberg() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const noiseBuffer = this.createNoiseBuffer(1.6);
    if (!noiseBuffer) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);
    filter.Q.setValueAtTime(2.5, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 1.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + 1.5);

    // Deep hull groan
    const groan = this.ctx.createOscillator();
    const groanGain = this.ctx.createGain();
    groan.type = 'sawtooth';
    groan.frequency.setValueAtTime(110, t);
    groan.frequency.linearRampToValueAtTime(70, t + 1.4);
    groanGain.gain.setValueAtTime(0.3, t);
    groanGain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);

    groan.connect(groanGain);
    groanGain.connect(this.ctx.destination);
    groan.start(t);
    groan.stop(t + 1.4);
  }

  // 6. Play Kraken Roar
  public playKraken() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const roar = this.ctx.createOscillator();
    const roarGain = this.ctx.createGain();
    roar.type = 'sawtooth';
    roar.frequency.setValueAtTime(70, t);
    roar.frequency.linearRampToValueAtTime(130, t + 0.4);
    roar.frequency.exponentialRampToValueAtTime(35, t + 1.6);

    roarGain.gain.setValueAtTime(0.5, t);
    roarGain.gain.exponentialRampToValueAtTime(0.001, t + 1.6);

    roar.connect(roarGain);
    roarGain.connect(this.ctx.destination);
    roar.start(t);
    roar.stop(t + 1.6);
  }

  // 7. Play Ship Horn
  public playHorn() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const horn1 = this.ctx.createOscillator();
    const horn2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    horn1.type = 'sawtooth';
    horn2.type = 'sawtooth';

    // Classic ocean liner resonant chords (e.g. 100Hz and 125Hz)
    horn1.frequency.setValueAtTime(110, t);
    horn2.frequency.setValueAtTime(138.6, t);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.15);
    gain.gain.setValueAtTime(0.4, t + 1.2);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);

    horn1.connect(gain);
    horn2.connect(gain);
    gain.connect(this.ctx.destination);

    horn1.start(t);
    horn2.start(t);
    horn1.stop(t + 1.8);
    horn2.stop(t + 1.8);
  }

  // 8. Water Splashing Sound
  public playSplash() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const noiseBuffer = this.createNoiseBuffer(0.8);
    if (!noiseBuffer) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.frequency.linearRampToValueAtTime(400, t + 0.7);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
    noise.stop(t + 0.8);
  }

  // 9. UI Click / Purchase sound
  public playClick(pitch: number = 600) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, t);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  }
}

export const soundManager = new SoundEngine();
