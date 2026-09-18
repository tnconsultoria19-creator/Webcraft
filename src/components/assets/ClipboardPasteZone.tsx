import React, { useState, useEffect } from 'react';
import { Upload, Clipboard, Image as ImageIcon, Trash2, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { ImageAsset } from '../../types';
import { api } from '../../lib/api';
import { formatTimeAgo } from '../../lib/utils';

interface ClipboardPasteZoneProps {
  leadId: string;
  images: ImageAsset[];
  onImagesUpdated: () => void;
}

export const ClipboardPasteZone: React.FC<ClipboardPasteZoneProps> = ({
  leadId,
  images,
  onImagesUpdated
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [selectedImage, setSelectedImage] = useState<ImageAsset | null>(null);

  // Global Ctrl+V clipboard paste listener when focused
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) {
            await processAndUploadFile(file, 'Clipboard Paste Image');
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [leadId]);

  const processAndUploadFile = async (file: File, defaultCaption?: string) => {
    setIsUploading(true);
    setUploadError('');

    try {
      // Read as Base64 for uniform handling
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          await api.uploadClipboardImage(
            leadId,
            base64Data,
            file.name || `paste_${Date.now()}.png`,
            caption.trim() || defaultCaption || 'Uploaded image'
          );
          setCaption('');
          onImagesUpdated();
        } catch (err: any) {
          setUploadError(err.message || 'Failed to save clipboard image');
        } finally {
          setIsUploading(false);
        }
      };
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload image');
      setIsUploading(false);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files: File[] = Array.from(e.target.files);
      for (const file of files) {
        await processAndUploadFile(file);
      }
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;
    try {
      await api.deleteImage(imageId);
      if (selectedImage?.id === imageId) setSelectedImage(null);
      onImagesUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to delete image');
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Upload & Paste Zone */}
      <div className="p-4 bg-white/50 border-2 border-dashed border-[#DDD8CE] hover:border-[#245F6B]/60 rounded-xl transition-all text-[#68645D]">
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <div className="flex gap-2 mb-2 text-[#245F6B]">
            <div className="p-2.5 bg-[#E5EEEE]/80 rounded-lg border border-[#245F6B]/20">
              <Clipboard className="w-5 h-5" />
            </div>
            <div className="p-2.5 bg-[#E5EEEE]/80 rounded-lg border border-[#245F6B]/20">
              <Upload className="w-5 h-5" />
            </div>
          </div>

          <h4 className="font-semibold text-[#292A29] text-sm mb-1">
            Drag & Drop, Browse, or <span className="text-[#245F6B] font-bold">Paste (Ctrl+V)</span> Images
          </h4>
          <p className="text-xs text-[#969188] max-w-md">
            Right-click & copy any business logo, Gumtree photo, or Facebook image from another window, then press <kbd className="px-1.5 py-0.5 bg-[#F0EDE5] text-[#292A29] rounded text-[10px] ">Ctrl+V</kbd> anywhere on this page!
          </p>

          <div className="mt-3 flex items-center gap-3">
            <input
              type="text"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Optional image caption..."
              className="bg-white border border-[#DDD8CE] text-xs px-3 py-1.5 rounded-lg text-[#292A29] focus:outline-none focus:ring-2 focus:ring-[#245F6B] w-48"
            />

            <label className="px-3 py-1.5 bg-[#245F6B] hover:bg-[#1E505A] text-white rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Browse Files
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileInputChange}
                className="hidden"
              />
            </label>
          </div>

          {isUploading && (
            <p className="text-xs text-[#245F6B] mt-2 font-medium animate-pulse">
              Uploading image to persistent storage...
            </p>
          )}

          {uploadError && (
            <p className="text-xs text-red-400 mt-2 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {uploadError}
            </p>
          )}
        </div>
      </div>

      {/* Image Gallery Grid */}
      <div>
        <h4 className="text-xs font-semibold text-[#68645D] uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Collected Business Assets ({images.length})</span>
        </h4>

        {images.length === 0 ? (
          <div className="p-6 bg-[#F4F1EA] rounded-xl border border-[#DDD8CE] text-center text-[#68645D] text-xs">
            No images collected yet for this lead.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map(img => (
              <div
                key={img.id}
                onClick={() => setSelectedImage(img)}
                className="group relative bg-white rounded-lg border border-[#DDD8CE] overflow-hidden cursor-pointer hover:border-[#245F6B] transition-all shadow-sm"
              >
                <div className="aspect-square bg-[#F0EDE5] relative overflow-hidden">
                  <img
                    src={img.url}
                    alt={img.filename}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  {img.isPrimary && (
                    <span className="absolute top-1.5 left-1.5 bg-[#245F6B] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                      Primary
                    </span>
                  )}
                </div>

                <div className="p-2 text-[11px] bg-white border-t border-[#DDD8CE]/80">
                  <div className="font-medium text-[#292A29] truncate" title={img.filename}>
                    {img.filename}
                  </div>
                  <div className="text-[10px] text-[#969188] mt-0.5 flex items-center justify-between">
                    <span>{img.uploadedByName || 'User'}</span>
                    <span>{formatTimeAgo(img.createdAt)}</span>
                  </div>
                </div>

                {/* Delete Hover Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteImage(img.id);
                  }}
                  className="absolute top-1.5 right-1.5 p-1 bg-white/80 hover:bg-red-600 text-[#68645D] hover:text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete image"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs" onClick={() => setSelectedImage(null)}>
          <div className="bg-white border border-[#DDD8CE] rounded-xl p-4 max-w-2xl w-full text-slate-100" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-sm text-[#292A29]">{selectedImage.filename}</h3>
                <p className="text-xs text-[#969188]">Uploaded by {selectedImage.uploadedByName} • {formatTimeAgo(selectedImage.createdAt)}</p>
              </div>
              <button onClick={() => setSelectedImage(null)} className="text-[#969188] hover:text-white">✕</button>
            </div>
            <div className="bg-[#F0EDE5] rounded-lg overflow-hidden max-h-96 flex items-center justify-center">
              <img src={selectedImage.url} alt={selectedImage.filename} className="max-h-96 object-contain" referrerPolicy="no-referrer" />
            </div>
            {selectedImage.caption && (
              <p className="text-xs text-[#68645D] mt-2 bg-white p-2 rounded">{selectedImage.caption}</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
