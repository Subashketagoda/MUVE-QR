// ============================================================
// MUVE QR — High-Impact Tactical Audio Engine (Web Audio API)
// Designed for 100% offline reliability, mobile speakers & zero external asset lag.
// ============================================================

class SoundEngine {
  private audioCtx: AudioContext | null = null
  private activeOscillators: { stop: () => void }[] = []
  private isSirenPlaying = false

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass()
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume()
    }
    return this.audioCtx
  }

  /**
   * 🚨 SUPIRI TACTICAL SOS SIREN (Continuous Dual-Tone Yelp & Wail)
   * Plays a loud, piercing, multi-harmonic police/ambulance emergency siren.
   */
  public startSOSSiren(): { stop: () => void } {
    this.stopSOSSiren()
    const ctx = this.getContext()
    if (!ctx) return { stop: () => {} }

    this.isSirenPlaying = true
    const now = ctx.currentTime

    // Master Volume Gain
    const masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(0.35, now)
    masterGain.connect(ctx.destination)

    // Oscillator 1: High piercing tactical wail (sawtooth)
    const osc1 = ctx.createOscillator()
    osc1.type = 'sawtooth'
    const osc1Gain = ctx.createGain()
    osc1Gain.gain.setValueAtTime(0.3, now)
    osc1.connect(osc1Gain)
    osc1Gain.connect(masterGain)

    // LFO 1 to sweep frequency of osc1 up and down (Fast tactical Yelp)
    const lfo1 = ctx.createOscillator()
    lfo1.type = 'triangle'
    lfo1.frequency.setValueAtTime(2.4, now) // 2.4 cycles per second (fast siren sweep)
    const lfo1Gain = ctx.createGain()
    lfo1Gain.gain.setValueAtTime(320, now) // Sweep depth: ±320Hz
    lfo1.connect(osc1.frequency)
    osc1.frequency.setValueAtTime(860, now) // Base frequency: 860Hz (Sweeps 540Hz - 1180Hz)

    // Oscillator 2: Secondary dissonant alarm tone (square wave for punch and authority)
    const osc2 = ctx.createOscillator()
    osc2.type = 'square'
    const osc2Gain = ctx.createGain()
    osc2Gain.gain.setValueAtTime(0.18, now)
    osc2.connect(osc2Gain)
    osc2Gain.connect(masterGain)

    const lfo2 = ctx.createOscillator()
    lfo2.type = 'sawtooth'
    lfo2.frequency.setValueAtTime(4.8, now) // Strobe pulse
    const lfo2Gain = ctx.createGain()
    lfo2Gain.gain.setValueAtTime(240, now)
    lfo2.connect(osc2.frequency)
    osc2.frequency.setValueAtTime(620, now)

    // Oscillator 3: Sub-bass war horn punch (sine wave 140Hz)
    const subOsc = ctx.createOscillator()
    subOsc.type = 'sine'
    subOsc.frequency.setValueAtTime(140, now)
    const subGain = ctx.createGain()
    subGain.gain.setValueAtTime(0.25, now)
    subOsc.connect(subGain)
    subGain.connect(masterGain)

    // Start all sound generators
    osc1.start(now)
    lfo1.start(now)
    osc2.start(now)
    lfo2.start(now)
    subOsc.start(now)

    // Trigger aggressive phone hardware vibration pattern
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate([600, 150, 600, 150, 800, 200, 1000])
      }
    } catch (e) {}

    const stopFn = () => {
      this.isSirenPlaying = false
      try {
        const stopTime = ctx.currentTime + 0.1
        masterGain.gain.exponentialRampToValueAtTime(0.001, stopTime)
        setTimeout(() => {
          try {
            osc1.stop()
            lfo1.stop()
            osc2.stop()
            lfo2.stop()
            subOsc.stop()
            osc1.disconnect()
            osc2.disconnect()
            subOsc.disconnect()
          } catch (e) {}
        }, 150)
      } catch (e) {}
    }

    this.activeOscillators.push({ stop: stopFn })
    return { stop: stopFn }
  }

  /**
   * Stops all active sirens
   */
  public stopSOSSiren() {
    this.isSirenPlaying = false
    while (this.activeOscillators.length > 0) {
      const osc = this.activeOscillators.pop()
      try {
        osc?.stop()
      } catch (e) {}
    }
  }

  /**
   * 🔔 Short 2-tone tactical chime for confirmation
   */
  public playSuccessChime() {
    const ctx = this.getContext()
    if (!ctx) return
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(587.33, now) // D5
    osc.frequency.setValueAtTime(880, now + 0.12) // A5

    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.35)
  }

  public isPlaying(): boolean {
    return this.isSirenPlaying
  }

  /**
   * 📻 Motorola PTT Key Tone / Talk-Permit Grant Tone
   * 3 rapid ascending chirps (880Hz -> 1046Hz -> 1318Hz) indicating mic is open.
   */
  public playPTTKeyTone() {
    const ctx = this.getContext()
    if (!ctx) return
    const now = ctx.currentTime

    const freqs = [880, 1046.5, 1318.5]
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + idx * 0.04)

      gain.gain.setValueAtTime(0.2, now + idx * 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, now + (idx + 1) * 0.04)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now + idx * 0.04)
      osc.stop(now + (idx + 1) * 0.04)
    })
  }

  /**
   * 📻 Classic End-of-Transmission Roger Beep + Squelch Tail
   * Clear 1200Hz tone followed by a realistic radio RF white-noise squelch burst.
   */
  public playRogerBeep() {
    const ctx = this.getContext()
    if (!ctx) return
    const now = ctx.currentTime

    // 1. Clear Roger Tone
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1174.66, now) // D6 tone

    gain.gain.setValueAtTime(0.22, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.12)

    // 2. Realistic Squelch Tail Noise Burst right after tone
    this.playRadioSquelchBurst(90, now + 0.11)
  }

  /**
   * 📻 Radio Squelch Noise Burst (Simulates RF Carrier Cut)
   */
  public playRadioSquelchBurst(durationMs = 80, startTime?: number) {
    const ctx = this.getContext()
    if (!ctx) return
    const t = startTime ?? ctx.currentTime
    const duration = durationMs / 1000

    try {
      const bufferSize = Math.floor(ctx.sampleRate * duration)
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const output = noiseBuffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1
      }

      const whiteNoise = ctx.createBufferSource()
      whiteNoise.buffer = noiseBuffer

      // Bandpass filter to make it sound like tactical FM radio receiver noise
      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(1600, t)
      filter.Q.setValueAtTime(1.8, t)

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.12, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration)

      whiteNoise.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)

      whiteNoise.start(t)
      whiteNoise.stop(t + duration)
    } catch {
      // Audio buffer creation fallback
    }
  }

  /**
   * 📻 Alert tone when an incoming radio transmission begins
   */
  public playIncomingTransmissionAlert() {
    const ctx = this.getContext()
    if (!ctx) return
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(740, now)
    osc.frequency.setValueAtTime(987.77, now + 0.05)

    gain.gain.setValueAtTime(0.18, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.12)
  }
}

export const soundEngine = new SoundEngine()

