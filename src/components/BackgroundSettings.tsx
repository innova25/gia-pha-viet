import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Link, Upload, RefreshCcw, Check } from 'lucide-react';

interface BackgroundSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: { header?: string | null; body?: string | null };
  onSave: (settings: { header: string | null; body: string | null }) => void;
}

export default function BackgroundSettings({ isOpen, onClose, currentSettings, onSave }: BackgroundSettingsProps) {
  const [headerBg, setHeaderBg] = useState('');
  const [bodyBg, setBodyBg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setHeaderBg(currentSettings.header || '');
      setBodyBg(currentSettings.body || '');
    }
  }, [isOpen, currentSettings]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: 'header' | 'body') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (target === 'header') setHeaderBg(result);
        else setBodyBg(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onSave({
      header: headerBg || null,
      body: bodyBg || null
    });
    onClose();
  };

  const handleReset = () => {
    setHeaderBg('');
    setBodyBg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-viet-gold">
        <div className="bg-viet-red p-4 flex justify-between items-center border-b border-viet-gold/30">
          <h3 className="text-viet-gold font-serif font-bold text-lg flex items-center gap-2">
            <ImageIcon size={20} />
            Tùy Chỉnh Giao Diện
          </h3>
          <button onClick={onClose} className="text-viet-gold/80 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-bold text-viet-brown uppercase tracking-wider flex items-center gap-2">
              1. Hình nền Thanh Tiêu Đề (Header)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link size={16} className="absolute left-3 top-3 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Dán đường dẫn ảnh (URL)..." 
                  value={headerBg}
                  onChange={(e) => setHeaderBg(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-viet-red/20"
                />
              </div>
              <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-lg transition-colors" title="Tải ảnh lên">
                <Upload size={20} />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'header')} />
              </label>
            </div>
            {headerBg && (
              <div className="h-16 w-full rounded-md border border-gray-200 overflow-hidden relative group">
                <img src={headerBg} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  onClick={() => setHeaderBg('')}
                  className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Xóa ảnh
                </button>
              </div>
            )}
          </div>

          <div className="w-full h-px bg-gray-100"></div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-viet-brown uppercase tracking-wider flex items-center gap-2">
              2. Hình nền Cây Gia Phả (Nội dung)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link size={16} className="absolute left-3 top-3 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Dán đường dẫn ảnh (URL)..." 
                  value={bodyBg}
                  onChange={(e) => setBodyBg(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-viet-red/20"
                />
              </div>
              <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-lg transition-colors" title="Tải ảnh lên">
                <Upload size={20} />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'body')} />
              </label>
            </div>
             {bodyBg && (
              <div className="h-32 w-full rounded-md border border-gray-200 overflow-hidden relative group">
                <img src={bodyBg} alt="Preview" className="w-full h-full object-cover" />
                <button 
                   onClick={() => setBodyBg('')}
                   className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Xóa ảnh
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-between items-center">
          <button 
            onClick={handleReset}
            className="text-gray-500 hover:text-viet-red text-sm font-medium flex items-center gap-1.5 transition-colors"
          >
            <RefreshCcw size={16} />
            Khôi phục mặc định
          </button>
          
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button 
              onClick={handleSave}
              className="px-6 py-2 bg-viet-red text-white font-bold rounded-lg hover:bg-red-800 transition-colors shadow-sm flex items-center gap-2"
            >
              <Check size={18} />
              Áp dụng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}