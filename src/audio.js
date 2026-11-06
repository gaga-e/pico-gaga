// Lightweight Web Audio API Synthesizer (0 external asset files, 0KB downloads)
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
                this.initialized = true;
            }
        } catch (e) {
            console.warn("Web Audio not supported:", e);
        }
    }

    ensureContext() {
        if (!this.initialized) this.init();
        if (this.ctx && this.ctx.state === "suspended") {
            this.ctx.resume();
        }
    }

    play(soundName) {
        this.ensureContext();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        switch (soundName) {
            case "jump": {
                // Classic platformer upward pitch sweep
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = "sine";
                osc.frequency.setValueAtTime(140, t);
                osc.frequency.exponentialRampToValueAtTime(420, t + 0.12);
                gain.gain.setValueAtTime(0.2, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(t);
                osc.stop(t + 0.13);
                break;
            }
            case "key": {
                // Bright double chime
                [880, 1320].forEach((freq, idx) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    const start = t + idx * 0.08;
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(freq, start);
                    gain.gain.setValueAtTime(0.22, start);
                    gain.gain.exponentialRampToValueAtTime(0.005, start + 0.18);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(start);
                    osc.stop(start + 0.2);
                });
                break;
            }
            case "door": {
                // Warm unlock chord
                [523.25, 659.25, 783.99].forEach((freq) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = "triangle";
                    osc.frequency.setValueAtTime(freq, t);
                    gain.gain.setValueAtTime(0.12, t);
                    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.35);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(t);
                    osc.stop(t + 0.36);
                });
                break;
            }
            case "enter": {
                // Player enters door pop
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = "sine";
                osc.frequency.setValueAtTime(500, t);
                osc.frequency.exponentialRampToValueAtTime(250, t + 0.1);
                gain.gain.setValueAtTime(0.2, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(t);
                osc.stop(t + 0.11);
                break;
            }
            case "levelComplete": {
                // Victory fanfare arpeggio
                const notes = [440, 554.37, 659.25, 880];
                notes.forEach((freq, idx) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    const start = t + idx * 0.1;
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(freq, start);
                    gain.gain.setValueAtTime(0.25, start);
                    gain.gain.exponentialRampToValueAtTime(0.005, start + 0.25);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(start);
                    osc.stop(start + 0.28);
                });
                break;
            }
            case "death": {
                // Downward retro buzz
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = "sawtooth";
                osc.frequency.setValueAtTime(280, t);
                osc.frequency.exponentialRampToValueAtTime(70, t + 0.3);
                gain.gain.setValueAtTime(0.25, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(t);
                osc.stop(t + 0.32);
                break;
            }
            case "button": {
                // Tactile switch click
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = "square";
                osc.frequency.setValueAtTime(700, t);
                gain.gain.setValueAtTime(0.15, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(t);
                osc.stop(t + 0.05);
                break;
            }
        }
    }
}

window.AudioEngine = new SoundEngine();

// Auto-unlock audio context on first user gesture
["touchstart", "touchend", "mousedown", "keydown"].forEach((evt) => {
    window.addEventListener(evt, () => {
        if (window.AudioEngine) window.AudioEngine.ensureContext();
    }, { once: false, passive: true });
});
