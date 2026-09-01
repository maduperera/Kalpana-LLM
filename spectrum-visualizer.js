/**
 * Kalpanā Real-Time Phase Spectrum & Interference Visualizer
 * High-Performance HTML5 Canvas Waveform & Fourier Band Renderer
 */

class SpectrumVisualizer {
  constructor(canvasId, bands = 2048) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.bands = bands;
    this.spectrumData = new Float32Array(this.bands);
    this.smoothedData = new Float32Array(this.bands);
    this.isRunning = false;
    this.time = 0;
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.width = this.canvas.width = rect.width;
    this.height = this.canvas.height = rect.height || 240;
  }

  updateData(newData) {
    if (!newData) return;
    if (this.bands !== newData.length) {
      this.bands = newData.length;
      this.spectrumData = new Float32Array(this.bands);
      this.smoothedData = new Float32Array(this.bands);
    }
    for (let i = 0; i < this.bands; i++) {
      this.spectrumData[i] = newData[i];
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.render();
  }

  stop() {
    this.isRunning = false;
  }

  render() {
    if (!this.isRunning || !this.canvas) return;
    requestAnimationFrame(() => this.render());

    this.time += 0.02;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Dark cyber backdrop with subtle motion trail
    ctx.fillStyle = 'rgba(10, 15, 29, 0.35)';
    ctx.fillRect(0, 0, w, h);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < w; x += 40) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0; y < h; y += 30) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    // Smooth data
    for (let i = 0; i < this.bands; i++) {
      this.smoothedData[i] += (this.spectrumData[i] - this.smoothedData[i]) * 0.15;
    }

    const numDisplayBars = Math.min(128, Math.floor(w / 4));
    const step = Math.floor(this.bands / numDisplayBars);
    const barWidth = (w / numDisplayBars) - 1;

    // 1. Draw Frequency Energy Spectrum Bars
    const gradient = ctx.createLinearGradient(0, h, 0, 0);
    gradient.addColorStop(0, 'rgba(56, 189, 248, 0.2)');
    gradient.addColorStop(0.5, 'rgba(129, 140, 248, 0.8)');
    gradient.addColorStop(1, 'rgba(236, 72, 153, 0.95)');

    let maxVal = 0.01;
    for (let i = 0; i < numDisplayBars; i++) {
      const val = this.smoothedData[i * step];
      if (val > maxVal) maxVal = val;
    }

    for (let i = 0; i < numDisplayBars; i++) {
      const val = this.smoothedData[i * step];
      const normalizedH = Math.min(h - 10, (val / (maxVal || 1)) * (h * 0.75) + 6);
      const x = i * (barWidth + 1);
      const y = h - normalizedH;

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, normalizedH);

      // Neon cap on top of each bar
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillRect(x, y, barWidth, 2);
    }

    // 2. Draw Continuous Harmonic Resonance Phase Waveform
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#34d399';
    ctx.shadowBlur = 12;

    const waveMidY = h * 0.45;
    for (let x = 0; x < w; x += 3) {
      const k = Math.floor((x / w) * (this.bands - 1));
      const amp = (this.smoothedData[k] / (maxVal || 1)) * 35;
      const freq = 0.04 + (k / this.bands) * 0.08;
      const y = waveMidY + Math.sin(x * freq + this.time * 2) * (amp + 8) + Math.cos(x * 0.02 - this.time) * 6;

      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0; // Reset shadow

    // 3. Draw Legend / Status overlay
    ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillText(`HARMONIC BANDS: ${this.bands} | RESONANT PEAK: ${maxVal.toFixed(3)} | SAMPLING: 60 FPS`, 14, 20);
    ctx.fillStyle = 'rgba(52, 211, 153, 0.9)';
    ctx.fillText(`● INTERFERENCE ACTIVE`, w - 175, 20);
  }
}

window.SpectrumVisualizer = SpectrumVisualizer;
