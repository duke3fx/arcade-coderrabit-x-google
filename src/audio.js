// Procedural Web Audio API Retro Arcade Synthesizer
class ArcadeAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.marchIndex = 0;
    this.marchNotes = [92.5, 82.41, 73.42, 65.41]; // F#2, E2, D2, C2
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playTone(freq, type, duration, vol = 0.15, slideTo = null) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
    }

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  playNoise(duration, vol = 0.2, filterFreq = 900) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, now);
    filter.frequency.exponentialRampToValueAtTime(120, now + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
  }

  shoot(isSpread = false, isPierce = false) {
    if (isPierce) {
      this.playTone(1100, 'sawtooth', 0.14, 0.12, 260);
      this.playTone(1650, 'square', 0.1, 0.08, 420);
    } else if (isSpread) {
      this.playTone(880, 'square', 0.11, 0.1, 220);
      this.playTone(1120, 'triangle', 0.11, 0.08, 300);
    } else {
      this.playTone(780, 'square', 0.09, 0.11, 190);
    }
  }

  hit() {
    this.playTone(280, 'triangle', 0.06, 0.12, 90);
  }

  explode(isBig = false) {
    if (isBig) {
      this.playNoise(0.45, 0.28, 650);
      this.playTone(120, 'sawtooth', 0.4, 0.2, 30);
    } else {
      this.playNoise(0.18, 0.16, 1100);
      this.playTone(190, 'square', 0.14, 0.1, 55);
    }
  }

  powerup() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 'square', 0.1, 0.12), idx * 55);
    });
  }

  dash() {
    this.playTone(320, 'sine', 0.14, 0.14, 980);
  }

  bomb() {
    this.playNoise(0.65, 0.32, 1400);
    this.playTone(440, 'sawtooth', 0.6, 0.22, 42);
  }

  marchStep() {
    const note = this.marchNotes[this.marchIndex % this.marchNotes.length];
    this.marchIndex++;
    this.playTone(note, 'triangle', 0.07, 0.14, note * 0.85);
  }

  ufoPulse() {
    this.playTone(620, 'sine', 0.12, 0.07, 880);
  }

  bossAlert() {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.playTone(440, 'sawtooth', 0.18, 0.16, 220);
      }, i * 220);
    }
  }

  waveClear() {
    const melody = [523.25, 659.25, 783.99, 987.77, 1046.5];
    melody.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'square', 0.14, 0.13), i * 80);
    });
  }

  gameOver() {
    const sad = [392.0, 369.99, 349.23, 329.63, 261.63];
    sad.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'sawtooth', 0.22, 0.14), i * 140);
    });
  }
}

window.ArcadeAudio = ArcadeAudio;
