import React from 'react';
import { Link } from 'react-router-dom';
import { Play, User, Clock } from 'lucide-react';
import { cn } from '../lib/utils.ts';

interface VideoCardProps {
  video: {
    id: string;
    title: string;
    uploadedBy: string;
    createdAt: string;
    status: 'processing' | 'ready' | 'error';
    storageNodes: string[];
  };
}

export const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
  const isReady = video.status === 'ready';

  return (
    <Link 
      to={isReady ? `/video/${video.id}` : '#'} 
      className={cn(
        "group glass-card overflow-hidden transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/10",
        !isReady && "cursor-default opacity-80"
      )}
    >
      {/* Thumbnail Placeholder */}
      <div className="relative aspect-video bg-white/5 flex items-center justify-center overflow-hidden">
        {isReady ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <Play className="w-12 h-12 text-primary fill-primary opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all duration-300" />
            
            {/* Storage Node Badges */}
            <div className="absolute top-2 right-2 flex gap-1">
              {video.storageNodes.map(node => (
                <div key={node} className="bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-bold border border-white/10 uppercase">
                  Node {node}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
             <div className="w-10 h-10 border-2 border-white/10 border-t-primary rounded-full animate-spin" />
             <span className="text-[10px] uppercase tracking-widest text-white/40">Transcoding...</span>
          </div>
        )}
        
        {/* Status Indicator */}
        <div className={cn(
            "absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border",
            video.status === 'ready' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : 
            video.status === 'processing' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
            "bg-red-500/10 text-red-500 border-red-500/20"
        )}>
          {video.status}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
          {video.title}
        </h3>
        
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white/40 group-hover:text-white/60 transition-colors">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-3 h-3 text-primary" />
            </div>
            <span className="text-xs font-medium">{video.uploadedBy}</span>
          </div>
          
          <div className="flex items-center gap-1.5 text-[10px] text-white/30 uppercase font-bold tracking-tight">
            <Clock className="w-3 h-3" />
            {new Date(video.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    </Link>
  );
};
