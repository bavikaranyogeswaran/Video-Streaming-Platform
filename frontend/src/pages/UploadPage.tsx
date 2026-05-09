import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileVideo, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { videoService } from '../services/videoService.ts';
import { cn } from '../lib/utils.ts';

const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('video/')) {
      setFile(droppedFile);
      if (!title) setTitle(droppedFile.name.split('.')[0]);
    } else {
      setError('Please upload a valid video file');
    }
  }, [title]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) setTitle(selectedFile.name.split('.')[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;

    setIsUploading(true);
    setError(null);

    try {
      await videoService.uploadVideo(file, title);
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed');
      setIsUploading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] space-y-6">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center animate-bounce">
          <CheckCircle2 className="w-12 h-12 text-emerald-500" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold">Upload Successful!</h2>
          <p className="text-white/40">Your video is now being transcoded. You'll be redirected shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Publish Content</h1>
        <p className="text-white/40 text-lg">Upload your video to the distributed edge network.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Upload Zone */}
        <div 
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            "relative group aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center transition-all duration-300",
            isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-white/10 hover:border-white/20 bg-white/[0.02]",
            file && "border-emerald-500/50 bg-emerald-500/5 border-solid"
          )}
        >
          {file ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                <FileVideo className="w-8 h-8 text-emerald-500" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-lg">{file.name}</p>
                <p className="text-white/40 text-sm">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
              <button 
                type="button" 
                onClick={() => setFile(null)}
                className="text-white/40 hover:text-red-500 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <X className="w-4 h-4" />
                Remove
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-xl font-semibold mb-1">Drag and drop video</p>
                <p className="text-white/30">Support for MP4, MKV, and AVI</p>
              </div>
              <label className="btn-secondary mt-4 cursor-pointer">
                <span>Browse Files</span>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="video/*" 
                  onChange={handleFileChange} 
                />
              </label>
            </div>
          )}
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold uppercase tracking-widest text-white/30">Video Title</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. My Distributed Stream"
              className="input-field w-full text-lg py-3"
              required
              disabled={isUploading}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-500">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <button 
            type="submit" 
            disabled={!file || !title || isUploading}
            className={cn(
              "btn-primary w-full py-4 text-lg shadow-xl shadow-primary/20",
              (!file || !title || isUploading) && "opacity-50 cursor-not-allowed grayscale"
            )}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Publishing to Edge...
              </>
            ) : (
              "Publish Video"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UploadPage;
