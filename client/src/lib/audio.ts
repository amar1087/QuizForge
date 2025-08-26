export class AudioVisualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  async setupAudio(audioElement: HTMLAudioElement) {
    try {
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaElementSource(audioElement);
      this.analyser = this.audioContext.createAnalyser();
      
      source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
      
      this.analyser.fftSize = 256;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    } catch (error) {
      console.error('Failed to setup audio analysis:', error);
    }
  }

  startVisualization() {
    if (!this.analyser || !this.dataArray) return;

    const draw = () => {
      if (!this.analyser || !this.dataArray) return;

      this.analyser.getByteFrequencyData(this.dataArray);
      
      const { width, height } = this.canvas;
      this.ctx.clearRect(0, 0, width, height);
      
      const barWidth = width / this.dataArray.length * 2;
      let x = 0;
      
      const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#10B981');
      gradient.addColorStop(0.5, '#F97316');
      gradient.addColorStop(1, '#10B981');
      
      for (let i = 0; i < this.dataArray.length; i++) {
        const barHeight = (this.dataArray[i] / 255) * height;
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);
        
        x += barWidth;
      }
      
      this.animationId = requestAnimationFrame(draw);
    };
    
    draw();
  }

  stopVisualization() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  destroy() {
    this.stopVisualization();
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

// Mock visualizer for when audio analysis isn't available
export class MockAudioVisualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  startVisualization() {
    const draw = () => {
      const { width, height } = this.canvas;
      this.ctx.clearRect(0, 0, width, height);
      
      const barCount = 32;
      const barWidth = width / barCount;
      
      const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#10B981');
      gradient.addColorStop(0.5, '#F97316');
      gradient.addColorStop(1, '#10B981');
      
      for (let i = 0; i < barCount; i++) {
        const barHeight = (Math.random() * 0.8 + 0.2) * height;
        const x = i * barWidth;
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);
      }
      
      this.animationId = requestAnimationFrame(draw);
    };
    
    draw();
  }

  stopVisualization() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  destroy() {
    this.stopVisualization();
  }
}
