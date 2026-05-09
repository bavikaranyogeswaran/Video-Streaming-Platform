import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, ShieldCheck } from 'lucide-react';

interface VideoPlayerProps {
  url: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ url }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [replicaInfo, setReplicaInfo] = useState<{ node: string, replica: string } | null>(null);

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
               if (node && replica) {
                 setReplicaInfo({ node, replica });
               }
            }
          };
        }
      });
      hls.loadSource(url);
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
    }

    return () => {
      if (hls) hls.destroy();
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
    if (containerRef.current?.requestFullscreen) {
      containerRef.current.requestFullscreen();
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="relative group aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10"
    >
      <video 
        ref={videoRef}
        className="w-full h-full cursor-pointer"
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        playsInline
      />

      {/* Overlay Controls */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
        
        {/* Progress Bar */}
        <div 
          className="h-1.5 w-full bg-white/20 rounded-full mb-6 cursor-pointer relative group/progress"
          onClick={handleProgressClick}
        >
          <div 
            className="absolute top-0 left-0 h-full bg-primary rounded-full"
            style={{ width: `${progress}%` }}
          />
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity"
            style={{ left: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={togglePlay} className="text-white hover:text-primary transition-colors">
              {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white" />}
            </button>
            
            <div className="flex items-center gap-2 group/volume">
              <button onClick={() => setIsMuted(!isMuted)} className="text-white">
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <div className="w-0 group-hover/volume:w-20 overflow-hidden transition-all duration-300">
                <input 
                    type="range" 
                    min="0" max="1" step="0.1" 
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full accent-primary h-1"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
             {replicaInfo && (
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[10px] font-bold tracking-widest uppercase text-emerald-400">
                   <ShieldCheck className="w-3 h-3" />
                   Streamed via Node {replicaInfo.node} [Replica {replicaInfo.replica}]
                </div>
             )}
             <button className="text-white/60 hover:text-white transition-colors">
               <Settings className="w-5 h-5" />
             </button>
             <button onClick={toggleFullscreen} className="text-white/60 hover:text-white transition-colors">
               <Maximize className="w-5 h-5" />
             </button>
          </div>
        </div>
      </div>

      {/* Center Play Button (Large) */}
      {!isPlaying && (
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          onClick={togglePlay}
        >
          <div className="bg-primary/20 backdrop-blur-md p-6 rounded-full scale-100 group-hover:scale-110 transition-transform">
             <Play className="w-10 h-10 fill-primary text-primary" />
          </div>
        </div>
      )}
    </div>
  );
};
