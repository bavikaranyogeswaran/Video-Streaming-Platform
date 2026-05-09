import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { videoService, type Video } from '../services/videoService.ts';
import { VideoPlayer } from '../components/VideoPlayer.tsx';
import { ChevronLeft, User, Calendar, Share2, MoreVertical, Globe } from 'lucide-react';

const VideoPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideo = async () => {
      if (!id) return;
      try {
        const data = await videoService.getVideo(id);
        setVideo(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load video');
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto animate-pulse">
        <div className="h-10 w-48 bg-white/5 rounded-lg mb-8" />
        <div className="aspect-video bg-white/5 rounded-2xl mb-8" />
        <div className="h-8 w-3/4 bg-white/5 rounded-lg mb-4" />
        <div className="h-4 w-1/4 bg-white/5 rounded-lg" />
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
        <h2 className="text-2xl font-bold">Video not found</h2>
        <Link to="/" className="btn-secondary">Back to Home</Link>
      </div>
    );
  }

  // Construct stream URL - In a real setup, this would use the Nginx proxy
  const streamUrl = `${import.meta.env.VITE_STREAM_URL || 'http://localhost/stream'}/${video.id}/playlist.m3u8`;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white mb-8 transition-colors group">
        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        Back to Feed
      </Link>

      <div className="space-y-8">
        {/* Player Container */}
        <VideoPlayer url={streamUrl} />

        {/* Video Info Container */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">{video.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-white/40">
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  <span className="font-medium text-white/80">{video.uploadedBy}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {new Date(video.createdAt).toLocaleDateString(undefined, { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/5">
                  <Globe className="w-3 h-3" />
                  {video.storageNodes.length} Replicas Active
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="btn-secondary py-2 px-4">
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button className="p-2.5 hover:bg-white/5 rounded-xl border border-white/10 transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6 glass-card bg-white/5 border-white/5">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/20 mb-3">Description</h3>
            <p className="text-white/80 leading-relaxed">
              {video.description || "No description provided for this video."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPage;
