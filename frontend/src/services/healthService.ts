import axios from 'axios';

const HEALTH_URL = import.meta.env.VITE_HEALTH_URL || 'http://localhost/api/system/health';

export interface NodeHealth {
  id: string;
  url: string;
  type: 'streaming' | 'storage';
  status: 'up' | 'down';
  latencyMs: number;
  lastChecked: string;
}

export const healthService = {
  getNodes: async () => {
    const response = await axios.get<NodeHealth[]>(`${HEALTH_URL}/nodes`);
    return response.data;
  },
};
