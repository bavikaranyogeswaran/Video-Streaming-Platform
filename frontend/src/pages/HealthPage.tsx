import React, { useEffect, useState } from 'react';
import { healthService, type NodeHealth } from '../services/healthService.ts';
import { ShieldCheck, Activity, Database, Server, Wifi, WifiOff, Globe, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils.ts';

const HealthPage: React.FC = () => {
  const [nodes, setNodes] = useState<NodeHealth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const data = await healthService.getNodes();
        setNodes(data);
      } catch (err) {
        console.error('Failed to fetch health data');
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  const streamingNodes = nodes.filter(n => n.type === 'streaming');
  const storageNodes = nodes.filter(n => n.type === 'storage');

  if (loading && nodes.length === 0) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <ShieldCheck className="w-10 h-10 text-emerald-500" />
            Cluster Control
          </h1>
          <p className="text-white/40 text-lg">Real-time health and latency telemetry from the distributed edge nodes.</p>
        </div>
        
        <div className="flex items-center gap-6 bg-secondary/50 p-4 rounded-2xl border border-white/5">
           <div className="text-center">
              <div className="text-2xl font-bold text-emerald-500">{nodes.filter(n => n.status === 'up').length}</div>
              <div className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Healthy</div>
           </div>
           <div className="w-px h-10 bg-white/10" />
           <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{nodes.filter(n => n.status === 'down').length}</div>
              <div className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Offline</div>
           </div>
           <div className="w-px h-10 bg-white/10" />
           <div className="text-center">
              <div className="text-2xl font-bold text-accent">
                {Math.round(nodes.reduce((acc, n) => acc + (n.latencyMs > 0 ? n.latencyMs : 0), 0) / (nodes.length || 1))}ms
              </div>
              <div className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Avg Latency</div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Streaming Cluster */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
             <div className="bg-accent/10 p-2 rounded-lg">
                <Server className="w-6 h-6 text-accent" />
             </div>
             <h2 className="text-2xl font-bold">Streaming Cluster</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {streamingNodes.map(node => (
              <NodeCard key={node.id} node={node} icon={<Activity className="w-4 h-4" />} />
            ))}
          </div>
        </section>

        {/* Storage Cluster */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
             <div className="bg-amber-500/10 p-2 rounded-lg">
                <Database className="w-6 h-6 text-amber-500" />
             </div>
             <h2 className="text-2xl font-bold">Storage Edge</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {storageNodes.map(node => (
              <NodeCard key={node.id} node={node} icon={<Globe className="w-4 h-4" />} />
            ))}
          </div>
        </section>
      </div>

      {/* Connectivity Visualization (Decorative/Informational) */}
      <div className="mt-16 glass-card p-8 border-dashed bg-transparent flex flex-col items-center text-center">
         <div className="flex items-center gap-8 mb-8 opacity-20">
            <div className="w-16 h-16 rounded-full border-2 border-white/50 border-dashed" />
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            <div className="w-16 h-16 rounded-full border-2 border-white/50 border-dashed" />
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            <div className="w-16 h-16 rounded-full border-2 border-white/50 border-dashed" />
         </div>
         <p className="text-white/20 text-sm font-medium tracking-wide italic">
           The cluster is automatically synchronized and load-balanced via Nginx edge proxies.
         </p>
      </div>
    </div>
  );
};

const NodeCard = ({ node, icon }: { node: NodeHealth, icon: React.ReactNode }) => {
  const isUp = node.status === 'up';

  return (
    <div className={cn(
      "glass-card p-5 relative overflow-hidden group transition-all hover:border-white/20",
      !isUp && "border-red-500/30 bg-red-500/5"
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg transition-colors",
            isUp ? "bg-white/5 group-hover:bg-primary/20" : "bg-red-500/20"
          )}>
            {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { 
              className: cn("w-5 h-5", isUp ? "text-white/60 group-hover:text-primary" : "text-red-500") 
            })}
          </div>
          <div>
            <h3 className="font-bold uppercase tracking-widest text-xs opacity-40">Identity</h3>
            <p className="font-bold">{node.id}</p>
          </div>
        </div>
        
        {isUp ? <Wifi className="w-5 h-5 text-emerald-500" /> : <WifiOff className="w-5 h-5 text-red-500" />}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
           <span className="text-xs text-white/30 font-bold uppercase tracking-tight">Latency</span>
           <span className={cn("text-sm font-mono", isUp ? "text-emerald-400" : "text-red-500")}>
             {isUp ? `${node.latencyMs}ms` : 'OFFLINE'}
           </span>
        </div>
        
        {/* Visual Latency Bar */}
        {isUp && (
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
             <div 
               className={cn(
                 "h-full transition-all duration-1000",
                 node.latencyMs < 50 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : 
                 node.latencyMs < 150 ? "bg-amber-500" : "bg-red-500"
               )}
               style={{ width: `${Math.min(node.latencyMs, 100)}%` }}
             />
          </div>
        )}
      </div>

      {/* Decorative pulse if up */}
      {isUp && (
        <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-emerald-500/5 rounded-full animate-ping" />
      )}
    </div>
  );
};

export default HealthPage;
