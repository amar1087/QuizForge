import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MockAudioVisualizer } from '@/lib/audio';

interface AudioPlayerProps {
  src: string;
}

export function AudioPlayer({ src }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualizerRef = useRef<MockAudioVisualizer | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(15); // 15 second preview
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    const canvas = canvasRef.current;
    
    if (audio && canvas) {
      // Setup visualizer
      visualizerRef.current = new MockAudioVisualizer(canvas);
      
      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
      };
      
      const handleLoadedMetadata = () => {
        setDuration(Math.min(audio.duration, 15)); // Cap at 15 seconds for preview
      };
      
      const handleEnded = () => {
        setIsPlaying(false);
        visualizerRef.current?.stopVisualization();
      };

      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('ended', handleEnded);
      
      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('ended', handleEnded);
        visualizerRef.current?.destroy();
      };
    }
  }, [src]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      visualizerRef.current?.stopVisualization();
    } else {
      audio.play();
      visualizerRef.current?.startVisualization();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-black/30 rounded-xl p-6">
      <audio ref={audioRef} src={src} preload="metadata" />
      
      <div className="flex items-center space-x-4 mb-4">
        <Button
          onClick={togglePlayPause}
          className="w-12 h-12 bg-primary rounded-full flex items-center justify-center hover:scale-110 transform transition-all"
          data-testid="button-play-pause"
        >
          <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-xl`}></i>
        </Button>
        
        <div className="flex-1">
          <div className="w-full bg-white/10 rounded-full h-2 mb-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-100"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            className="text-slate-400 hover:text-white transition-colors"
            onClick={() => setVolume(volume > 0 ? 0 : 1)}
          >
            <i className={`fas ${volume > 0 ? 'fa-volume-up' : 'fa-volume-mute'}`}></i>
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={handleVolumeChange}
            className="w-16 h-1 bg-white/20 rounded-lg appearance-none slider"
          />
        </div>
      </div>
      
      {/* Visual Audio Bars */}
      <canvas
        ref={canvasRef}
        className="w-full h-16 rounded-lg"
        width={800}
        height={64}
      />
    </div>
  );
}
