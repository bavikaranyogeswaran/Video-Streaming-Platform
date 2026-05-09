import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings } from 'lucide-react';
import { cn } from '../lib/utils';


interface VideoPlayerProps {
  url: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ url }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [replicaInfo, setReplicaInfo] = useState<{ node: string, replica: string } | null>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({
        xhrSetup: (xhr) => {
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
               const node = xhr.getResponseHeader('X-Proxy-Node');
               const replica = xhr.getResponseHeader('X-Replica-ID');
               if (node && replica) setReplicaInfo({ node, replica });
            }
          };
        }
      });
      hls.loadSource(url);
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
    }

    // Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      
      switch(e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'm':
          setIsMuted(prev => !prev);
          break;
        case 'arrowright':
          if (video) video.currentTime += 5;
          break;
        case 'arrowleft':
          if (video) video.currentTime -= 5;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      if (hls) hls.destroy();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [url]);

  const togglePlay = () => {
    if (videoRef.current?.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current?.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(p);

      // Update buffered range
      if (videoRef.current.buffered.length > 0) {
        const b = (videoRef.current.buffered.end(videoRef.current.buffered.length - 1) / videoRef.current.duration) * 100;
        setBuffered(b);
      }
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickedProgress = (x / rect.width);
    if (videoRef.current) {
      videoRef.current.currentTime = clickedProgress * videoRef.current.duration;
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  return (
    <div 
      ref={containerRef} 
      onMouseMove={handleMouseMove}
      className={cn(
        "relative group aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 transition-all duration-500",
        !showControls && isPlaying ? "cursor-none" : "cursor-default"
      )}
    >
      <video 
        ref={videoRef}
        className="w-full h-full"
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        onTimeUpdate={handleTimeUpdate}
        playsInline
        autoPlay
      />

      {/* Overlay Controls */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6 transition-opacity duration-300",
        showControls ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        
        {/* Progress Bar Container */}
        <div className="group/progress-container mb-6 relative">
          {/* Buffering Track */}
          <div className="absolute top-1.5 left-0 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white/20 transition-all duration-300"
              style={{ width: `${buffered}%` }}
            />
          </div>
          
          {/* Interactive Progress Bar */}
          <div 
            className="h-1.5 w-full bg-transparent rounded-full cursor-pointer relative z-10"
            onClick={handleProgressClick}
          >
            <div 
              className="absolute top-0 left-0 h-full bg-primary rounded-full shadow-[0_0_10px_rgba(255,62,62,0.5)]"
              style={{ width: `${progress}%` }}
            />
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg scale-0 group-hover/progress-container:scale-100 transition-transform duration-200"
              style={{ left: `calc(${progress}% - 8px)` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={togglePlay} className="text-white hover:text-primary transition-all hover:scale-110 active:scale-90">
              {isPlaying ? <Pause className="w-7 h-7 fill-white" /> : <Play className="w-7 h-7 fill-white" />}
            </button>
            
            <div className="flex items-center gap-2 group/volume">
              <button 
                onClick={() => setIsMuted(!isMuted)} 
                className="text-white hover:text-primary transition-colors"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </button>
              <div className="w-0 group-hover/volume:w-24 overflow-hidden transition-all duration-300 ease-out">
                <input 
                    type="range" 
                    min="0" max="1" step="0.01" 
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setVolume(val);
                      if (videoRef.current) videoRef.current.volume = val;
                      setIsMuted(val === 0);
                    }}
                    className="w-full accent-primary h-1 bg-white/20 rounded-full cursor-pointer"
                />
              </div>
            </div>

            {/* Time Display */}
            <div className="text-sm font-medium text-white/80 tabular-nums">
              {videoRef.current ? (
                <>
                  {formatTime(videoRef.current.currentTime)} 
                  <span className="text-white/30 mx-1">/</span>
                  {formatTime(videoRef.current.duration || 0)}
                </>
              ) : '00:00 / 00:00'}
            </div>
          </div>

          <div className="flex items-center gap-4">
             {replicaInfo && (
                <div className="flex items-center gap-2 bg-emerald-500/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-emerald-500/20 text-[10px] font-bold tracking-widest uppercase text-emerald-400">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   Edge: Node {replicaInfo.node}
                </div>
             )}
             <button className="text-white/60 hover:text-white transition-all hover:rotate-45">
               <Settings className="w-5 h-5" />
             </button>
             <button onClick={toggleFullscreen} className="text-white/60 hover:text-white transition-all hover:scale-110">
               <Maximize className="w-5 h-5" />
             </button>
          </div>
        </div>
      </div>

      {/* Loading Spinner for Buffering */}
      {/* (Can be added if needed via hls events) */}

      {/* Center Play Button Overlay */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none group-hover:bg-black/40 transition-colors">
          <div className="bg-primary/20 backdrop-blur-xl p-8 rounded-full scale-100 group-hover:scale-125 transition-all duration-500 border border-white/10">
             <Play className="w-12 h-12 fill-primary text-primary" />
          </div>
        </div>
      )}
    </div>
  );
};

function formatTime(seconds: number): string {
  if (isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
