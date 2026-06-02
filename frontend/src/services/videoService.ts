import api from './api.ts';

export interface Video {
  id: string;
  title: string;
  description?: string;
  uploadedBy: string;
  hlsPath?: string;
  storageNodes: string[];
  s3Key?: string;
  createdAt: string;
  status: 'processing' | 'ready' | 'error';
}

export interface UploadResult {
  message: string;
  videoId: string;
  deduped?: boolean;
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

  /**
   * POST /api/upload as multipart/form-data.
   * The backend's FileInterceptor binds the file to the field named "video",
   * NOT "file" — getting that wrong silently sends an empty upload.
   *
   * onProgress receives a 0..100 percentage so the UI can render a real bar.
   */
  uploadVideo: async (
    file: File,
    title: string,
    onProgress?: (pct: number) => void,
  ): Promise<UploadResult> => {
    const formData = new FormData();
    // Field name MUST be 'video' — see UploadController @UseInterceptors(FileInterceptor('video'))
    formData.append('video', file);
    formData.append('title', title);

    const response = await api.post<UploadResult>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (!onProgress || !evt.total) return;
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      },
    });
    return response.data;
  },

  deleteVideo: async (id: string) => {
    const response = await api.delete(`/videos/${id}`);
    return response.data;
  },
};
