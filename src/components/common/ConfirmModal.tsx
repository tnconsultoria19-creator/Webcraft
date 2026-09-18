import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Delete Permanently',
  cancelLabel = 'Cancel',
  isDanger = true,
  isLoading = false,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs font-['Poppins'] animate-in fade-in duration-150">
      <div className="bg-white border border-[#DDD8CE] rounded-3xl shadow-2xl max-w-md w-full p-6 text-[#292A29] space-y-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${isDanger ? 'bg-[#F1E2E0] text-[#A65B55]' : 'bg-[#E5EEEE] text-[#245F6B]'}`}>
              {isDanger ? <AlertTriangle className="w-6 h-6" /> : <Trash2 className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="font-bold text-base text-[#292A29]">{title}</h3>
              <p className="text-xs text-[#68645D] mt-1 leading-relaxed">{description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#969188] hover:text-[#292A29] hover:bg-[#F0EDE5] rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#DDD8CE]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-5 py-2.5 bg-[#F0EDE5] hover:bg-[#e4dfd3] text-[#292A29] text-xs font-semibold rounded-full transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-6 py-2.5 text-xs font-semibold rounded-full transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-2 ${
              isDanger
                ? 'bg-[#A65B55] hover:bg-[#8C4B46] text-white'
                : 'bg-[#245F6B] hover:bg-[#1E505A] text-white'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            {isLoading ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
