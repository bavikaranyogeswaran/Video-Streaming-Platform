import api from './api.ts';

export interface Video {
  id: string;
  title: string;
  description?: string;
  uploadedBy: string;
  hlsPath?: string;
  storageNodes: string[];
  createdAt: string;
  status: 'processing' | 'ready' | 'error';
}

export const videoService = {
  getVideos: async () => {
    const response = await api.get<Video[]>('/videos');
    return response.data;
  },

  getVideo: async (id: string) => {
    const response = await api.get<Video>(`/videos/${id}`);
    return response.data;
  },

  uploadVideo: async (file: File, title: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteVideo: async (id: string) => {
    const response = await api.delete(`/videos/${id}`);
    return response.data;
  },
};
