import React, { useState } from 'react';
import { X, Lock, Key, Loader2 } from 'lucide-react';

const TARGET_HASH = "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9";

interface AdminLoginProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export default function AdminLogin({ isOpen, onClose, onLoginSuccess }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsChecking(true);

    try {
      const msgBuffer = new TextEncoder().encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      if (hashHex === TARGET_HASH) {
        onLoginSuccess();
        setPassword('');
        onClose();
      } else {
        setError('Mật khẩu không đúng. Vui lòng thử lại.');
      }
    } catch (err) {
      setError('Đã có lỗi xảy ra. Trình duyệt không hỗ trợ mã hóa.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-viet-gold relative">
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-viet-red/10 rounded-full flex items-center justify-center mx-auto mb-4 text-viet-red">
              <Lock size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 font-serif">Đăng nhập Quản trị</h2>
            <p className="text-sm text-gray-500 mt-1">Nhập mật khẩu để mở khóa tính năng chỉnh sửa.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <div className="relative">
                <Key size={18} className="absolute left-3 top-3 text-gray-400" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-viet-red/20 focus:border-viet-red focus:outline-none transition-all"
                  placeholder="Mật khẩu..."
                  autoFocus
                />
              </div>
              {error && <p className="text-xs text-red-600 mt-2 font-medium">{error}</p>}
            </div>

            <button 
              type="submit" 
              disabled={isChecking}
              className="w-full py-2.5 bg-viet-red text-white font-bold rounded-lg hover:bg-red-800 transition-colors shadow-lg shadow-red-900/20 flex items-center justify-center gap-2"
            >
              {isChecking ? <Loader2 size={18} className="animate-spin" /> : 'Mở khóa'}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">Chỉ dành cho hội đồng gia tộc.</p>
          </div>
        </div>
      </div>
    </div>
  );
}