// Simple Sound Manager using Web Audio API
// No external dependencies, pure synthesis

class SoundManager {
  private ctx: AudioContext | null = null
  private gainNode: GainNode | null = null
  private droneOsc: OscillatorNode | null = null
  private droneGain: GainNode | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      this.ctx = new AudioContextClass()
      this.gainNode = this.ctx.createGain()
      this.gainNode.connect(this.ctx.destination)
      this.gainNode.gain.value = 0.3 // Master volume
    }
  }

  // 0. Ensure Context is Running (Call on first interaction)
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  // 1. UI Click/Hover Sound (High-tech Tick)
  playClick() {
    if (!this.ctx || !this.gainNode) return
    if (this.ctx.state === 'suspended') this.ctx.resume()

    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    
    osc.connect(gain)
    gain.connect(this.gainNode)

    // Crisp high frequency "tick"
    osc.type = 'square' // Square wave for more "digital" bite
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.08)
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08)

    osc.start()
    osc.stop(this.ctx.currentTime + 0.08)
  }

  // 2. UI Hover Low (Subtle texture)
  playHover() {
    if (!this.ctx || !this.gainNode) return
    if (this.ctx.state === 'suspended') this.ctx.resume()

    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.connect(gain)
    gain.connect(this.gainNode)

    // Ultra short, high frequency "tick" for scroll
    osc.type = 'sine'
    // Start very high, drop fast
    osc.frequency.setValueAtTime(2000, this.ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(500, this.ctx.currentTime + 0.02)

    // Fast envelope (20ms)
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.02)

    osc.start()
    osc.stop(this.ctx.currentTime + 0.02)
  }

  // 3. Ambient Drone (Starts and stays)
  startDrone() {
    if (!this.ctx || !this.gainNode || this.droneOsc) return
    
    this.droneOsc = this.ctx.createOscillator()
    this.droneGain = this.ctx.createGain()
    
    this.droneOsc.connect(this.droneGain)
    this.droneGain.connect(this.gainNode)
    
    this.droneOsc.type = 'sine'
    this.droneOsc.frequency.value = 60 // Low bass
    this.droneGain.gain.value = 0.05
    
    this.droneOsc.start()
  }

  // Change drone frequency based on "mood" (project index)
  updateDrone(index: number) {
    if (!this.ctx || !this.droneOsc) return
    
    const baseFreq = 60
    const targetFreq = baseFreq + (index * 20)
    
    this.droneOsc.frequency.exponentialRampToValueAtTime(targetFreq, this.ctx.currentTime + 1)
  }
  // 4. System Boot Sound (Power Up)
  playBootSequence() {
    if (!this.ctx || !this.gainNode) return
    if (this.ctx.state === 'suspended') this.ctx.resume()

    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    
    osc.connect(gain)
    gain.connect(this.gainNode)

    // Short, punchy power-on "thud" + "chime"
    // Layer 1: The "Power" (Low sine punch)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(150, this.ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.3)
    
    gain.gain.setValueAtTime(0, this.ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3)

    osc.start()
    osc.stop(this.ctx.currentTime + 0.3)

    // Layer 2: The "Tech" (High digital chime)
    const osc2 = this.ctx.createOscillator()
    const gain2 = this.ctx.createGain()
    osc2.connect(gain2)
    gain2.connect(this.gainNode)

    osc2.type = 'sine' // Pure sine for clean chime
    osc2.frequency.setValueAtTime(880, this.ctx.currentTime) // A5
    osc2.frequency.setValueAtTime(1760, this.ctx.currentTime + 0.05) // A6 (Octave jump)
    
    gain2.gain.setValueAtTime(0, this.ctx.currentTime)
    gain2.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 0.05)
    gain2.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4)

    osc2.start()
    osc2.stop(this.ctx.currentTime + 0.4)
  }
}

export const soundManager = new SoundManager()
