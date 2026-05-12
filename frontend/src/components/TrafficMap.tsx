import React, { useMemo } from 'react';
import { type NodeHealth } from '../services/healthService.ts';
import { cn } from '../lib/utils.ts';

interface TrafficMapProps {
  nodes: NodeHealth[];
}

export const TrafficMap: React.FC<TrafficMapProps> = ({ nodes }) => {
  const streamingNodes = useMemo(() => nodes.filter(n => n.type === 'streaming'), [nodes]);
  const storageNodes = useMemo(() => nodes.filter(n => n.type === 'storage'), [nodes]);

  return (
    <div className="glass-card p-10 bg-white/[0.02] border-dashed relative overflow-hidden h-[400px]">
      <div className="absolute inset-0 flex items-center justify-around">
        
        {/* Streaming Cluster Column */}
        <div className="flex flex-col gap-12 z-10">
          <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/20 text-center mb-4">Ingress / Proxy</h3>
          {streamingNodes.map((node, i) => (
            <div key={node.id} className="relative group">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-500",
                node.status === 'up' ? "bg-accent/10 border-accent/30 shadow-[0_0_20px_rgba(59,130,246,0.2)]" : "bg-red-500/10 border-red-500/30"
              )}>
                <span className="text-[10px] font-bold text-white/60">{node.id.split('-').pop()}</span>
              </div>
              
              {/* Flow Lines to Storage Nodes */}
              {node.status === 'up' && storageNodes.map((sNode, j) => (
                sNode.status === 'up' && (
                  <div 
                    key={`${node.id}-${sNode.id}`}
                    className="absolute top-1/2 left-full h-px pointer-events-none origin-left overflow-hidden"
                    style={{
                      width: '280px',
                      transform: `rotate(${((j - 1) * 25)}deg)`,
                      opacity: 0.1 + (i * 0.05)
                    }}
                  >
                     <div className="w-full h-full bg-gradient-to-r from-accent to-amber-500 animate-flow-right" />
                  </div>
                )
              ))}
            </div>
          ))}
        </div>

        {/* Central "Mesh" indicator */}
        <div className="hidden lg:flex flex-col items-center justify-center opacity-10">
           <div className="w-32 h-32 rounded-full border-4 border-white border-dashed animate-spin-slow" />
           <div className="mt-4 font-bold tracking-[0.5em] text-xs uppercase">Distributed Grid</div>
        </div>

        {/* Storage Cluster Column */}
        <div className="flex flex-col gap-12 z-10">
          <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/20 text-center mb-4">Egress / Storage</h3>
          {storageNodes.map(node => (
            <div key={node.id} className="relative">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-500",
                node.status === 'up' ? "bg-amber-500/10 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.2)]" : "bg-red-500/10 border-red-500/30"
              )}>
                <span className="text-[10px] font-bold text-white/60">{node.id.split('-').pop()?.toUpperCase()}</span>
              </div>
              
              {/* Connection Indicators */}
              {node.status === 'up' && (
                <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Background Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} 
      />
      
      {/* Legend */}
      <div className="absolute bottom-6 left-10 flex gap-6 text-[10px] uppercase tracking-widest font-bold text-white/20">
         <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent" />
            HLS Proxying
         </div>
         <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            Chunk Retrieval
         </div>
      </div>
    </div>
  );
};
