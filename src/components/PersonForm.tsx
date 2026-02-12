import React, { useState, useEffect } from 'react';
import { X, Save, User, Calendar, FileText, Image as ImageIcon } from 'lucide-react';
import { Gender, Person } from '../types';

interface PersonFormProps {
  isOpen: boolean;
  onClose: () => void;
  mode: string;
  relativePerson: Person | null;
  initialData: Person | null;
  onSubmit: (data: any) => void;
}

export default function PersonForm({ isOpen, onClose, mode, relativePerson, initialData, onSubmit }: PersonFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    gender: Gender.MALE,
    birthYear: '',
    deathYear: '',
    avatarUrl: '',
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        setFormData({ 
            name: initialData.name,
            gender: initialData.gender,
            birthYear: initialData.birthYear,
            deathYear: initialData.deathYear,
            avatarUrl: initialData.avatarUrl || '',
            notes: initialData.notes || '',
         });
      } else if (mode === 'add_spouse' && relativePerson) {
        setFormData({
            name: '',
            gender: relativePerson.gender === Gender.MALE ? Gender.FEMALE : Gender.MALE,
            birthYear: '',
            deathYear: '',
            avatarUrl: '',
            notes: '',
        });
      } else {
        setFormData({
          name: '',
          gender: Gender.MALE,
          birthYear: '',
          deathYear: '',
          avatarUrl: '',
          notes: '',
        });
      }
    }
  }, [isOpen, mode, initialData, relativePerson]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const birth = parseInt(formData.birthYear || '');
    const death = formData.deathYear ? parseInt(formData.deathYear) : null;
    const currentYear = new Date().getFullYear();

    if (!isNaN(birth) && birth > currentYear) {
        alert("Năm sinh không được lớn hơn năm hiện tại.");
        return;
    }

    if (death !== null && !isNaN(death) && !isNaN(birth) && death < birth) {
        alert("Năm mất không thể nhỏ hơn năm sinh.");
        return;
    }

    if (mode === 'add_spouse' && relativePerson) {
        if (formData.gender === relativePerson.gender) {
            alert("Vợ/Chồng phải khác giới với thành viên được chọn.");
            return;
        }
    }

    onSubmit(formData);
    onClose();
  };

  const getTitle = () => {
    if (mode === 'edit') return 'Chỉnh sửa thông tin';
    if (mode === 'add_child') return `Thêm con cho ${relativePerson?.name}`;
    if (mode === 'add_spouse') return `Thêm vợ/chồng cho ${relativePerson?.name}`;
    return 'Thông tin thành viên';
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-viet-gold flex flex-col max-h-[90vh]">
        
        <div className="bg-viet-red p-4 flex justify-between items-center border-b border-viet-gold/30 shrink-0">
          <h3 className="text-viet-gold font-serif font-bold text-lg flex items-center gap-2">
            <User size={20} />
            {getTitle()}
          </h3>
          <button onClick={onClose} className="text-viet-gold/80 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <form id="person-form" onSubmit={handleSubmit} className="space-y-5">
            
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">Họ và Tên <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-viet-red/20 focus:border-viet-red transition-all"
                placeholder="Ví dụ: Nguyễn Văn A"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">Giới tính</label>
              <div className="flex gap-4">
                <label className={`flex items-center gap-2 ${mode === 'add_spouse' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input 
                    type="radio" 
                    name="gender" 
                    value={Gender.MALE}
                    checked={formData.gender === Gender.MALE}
                    onChange={() => mode !== 'add_spouse' && setFormData({...formData, gender: Gender.MALE})}
                    disabled={mode === 'add_spouse'}
                    className="text-viet-red focus:ring-viet-red"
                  />
                  <span className="text-gray-700">Nam</span>
                </label>
                <label className={`flex items-center gap-2 ${mode === 'add_spouse' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input 
                    type="radio" 
                    name="gender" 
                    value={Gender.FEMALE}
                    checked={formData.gender === Gender.FEMALE}
                    onChange={() => mode !== 'add_spouse' && setFormData({...formData, gender: Gender.FEMALE})}
                    disabled={mode === 'add_spouse'}
                    className="text-viet-red focus:ring-viet-red"
                  />
                  <span className="text-gray-700">Nữ</span>
                </label>
              </div>
              {mode === 'add_spouse' && (
                  <p className="text-[10px] text-gray-500 italic">* Giới tính được tự động chọn ngược với người phối ngẫu.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-1">
                  <Calendar size={14} /> Năm sinh
                </label>
                <input 
                  type="number" 
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-viet-red/20 focus:border-viet-red transition-all"
                  placeholder="VD: 1990"
                  value={formData.birthYear}
                  onChange={(e) => setFormData({...formData, birthYear: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-1">
                  <Calendar size={14} /> Năm mất (nếu có)
                </label>
                <input 
                  type="number"
                  min="0" 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-viet-red/20 focus:border-viet-red transition-all"
                  placeholder="VD: 2020"
                  value={formData.deathYear}
                  onChange={(e) => setFormData({...formData, deathYear: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-1">
                <ImageIcon size={14} /> Đường dẫn ảnh đại diện
              </label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-viet-red/20 focus:border-viet-red transition-all text-sm"
                  placeholder="https://example.com/photo.jpg"
                  value={formData.avatarUrl || ''}
                  onChange={(e) => setFormData({...formData, avatarUrl: e.target.value})}
                />
              </div>
              {formData.avatarUrl && (
                <div className="mt-2 w-16 h-16 rounded-full border border-gray-200 overflow-hidden mx-auto">
                   <img src={formData.avatarUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-1">
                <FileText size={14} /> Ghi chú / Tiểu sử
              </label>
              <textarea 
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-viet-red/20 focus:border-viet-red transition-all text-sm"
                placeholder="Nhập ghi chú thêm về thành viên..."
                value={formData.notes || ''}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>

          </form>
        </div>

        <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            type="button"
            className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
          >
            Hủy bỏ
          </button>
          <button 
            type="submit"
            form="person-form"
            className="px-6 py-2 bg-viet-red text-white font-bold rounded-lg hover:bg-red-800 transition-colors shadow-sm flex items-center gap-2"
          >
            <Save size={18} />
            Lưu thông tin
          </button>
        </div>
      </div>
    </div>
  );
}