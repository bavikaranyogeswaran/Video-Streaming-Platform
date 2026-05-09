import React, { useEffect, useState } from 'react';
import { videoService, type Video } from '../services/videoService.ts';
import { VideoCard } from '../components/VideoCard.tsx';
import { AlertCircle, RefreshCcw } from 'lucide-react';

const HomePage: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await videoService.getVideos();
      setVideos(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
    // Poll for status updates every 10 seconds if there are processing videos
    const pollInterval = setInterval(() => {
       const hasProcessing = videos.some(v => v.status === 'processing');
       if (hasProcessing) fetchVideos();
    }, 10000);
    
    return () => clearInterval(pollInterval);
  }, [videos.length]); // Simple dependency for polling check

  if (loading && videos.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-8 tracking-tight">Discovery Feed</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="glass-card h-64 animate-pulse bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
        <div className="bg-red-500/10 p-4 rounded-full">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold">Something went wrong</h2>
        <p className="text-white/40">{error}</p>
        <button onClick={fetchVideos} className="btn-secondary mt-2">
          <RefreshCcw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-screen-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Discovery Feed</h1>
        <div className="flex items-center gap-2 text-sm text-white/40">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          Live Platform
        </div>
      </div>

      {videos.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center h-64 border-dashed bg-transparent">
          <p className="text-white/30 text-lg">No videos found. Be the first to upload!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
};

export default HomePage;
