import React, { useState, useEffect, useCallback } from 'react';
import { Upload, Download, Search, BookOpen, Layers, Lock, Edit3, Trash2, PlusCircle, LogOut, Heart, Baby, Clock, Activity, User, ChevronRight, X } from 'lucide-react';
import TreeContainer from './components/TreeContainer';
import AdminLogin from './components/AdminLogin';
import PersonForm from './components/PersonForm';
import { Gender, TreeData, Person } from './types';
import { loadTreeFromUrl, parseExcelToTree, exportTreeToExcel } from './services/genealogyService';

export default function App() {
  const [treeData, setTreeData] = useState<TreeData>({ persons: {}, rootId: null });
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'family' | 'timeline'>('info');

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('edit');
  
  useEffect(() => {
    const adminSession = sessionStorage.getItem('genealogy_is_admin');
    if (adminSession === 'true') {
      setIsAdmin(true);
    }
  }, []);

  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      try {
        // Attempt to load 'GiaPha_Export.xlsx' from the root/public directory
        const data = await loadTreeFromUrl('./GiaPha_Export.xlsx');
        setTreeData(data);
        
        if (data.rootId) {
          const initialExpanded = new Set<string>();
          initialExpanded.add(data.rootId);
          data.persons[data.rootId]?.childrenIds.forEach(id => initialExpanded.add(id));
          setExpandedNodes(initialExpanded);
        }
      } catch (error) {
        console.error("Failed to load initial data from GiaPha_Export.xlsx", error);
        // Fallback or empty state will be handled by UI
      } finally {
        setIsLoading(false);
      }
    };

    initData();
  }, []);

  const toggleNodeExpansion = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const handleSelectPerson = (id: string) => {
    setSelectedPersonId(id);
    setSidebarOpen(true);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const data = await parseExcelToTree(file);
      setTreeData(data);
      setSelectedPersonId(null);
      setSidebarOpen(false);

      if (data.rootId) {
        const initialExpanded = new Set<string>();
        initialExpanded.add(data.rootId);
        data.persons[data.rootId]?.childrenIds.forEach(id => initialExpanded.add(id));
        setExpandedNodes(initialExpanded);
      }
    } catch (error) {
      console.error(error);
      alert("Lỗi khi đọc file Excel. Vui lòng kiểm tra định dạng.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    exportTreeToExcel(treeData.persons);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Ép kiểu rõ ràng thành Person[] để tránh lỗi 'unknown' trong một số cấu hình TS
    const persons = Object.values(treeData.persons) as Person[];
    const exists = persons.some((p) => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.id === searchTerm
    );
    if (!exists) alert("Không tìm thấy thành viên phù hợp trong dữ liệu.");
  };

  const handleLoginSuccess = () => {
    setIsAdmin(true);
    sessionStorage.setItem('genealogy_is_admin', 'true');
  };

  const handleLogout = () => {
    setIsAdmin(false);
    sessionStorage.removeItem('genealogy_is_admin');
    setIsFormOpen(false);
  };

  const handleDeletePerson = () => {
    if (!selectedPersonId) return;
    if (!isAdmin) {
      alert("Bạn cần quyền quản trị để xóa thành viên.");
      return;
    }
    
    const target = treeData.persons[selectedPersonId];
    if (!target) return;

    const isBloodRelative = !!target.parentId || target.isRoot;

    let confirmMsg = "";
    if (isBloodRelative) {
        confirmMsg = `XÓA DÒNG MÁU: Bạn đang xóa "${target.name}".\n\nĐây là thành viên huyết thống (Con ruột/Gốc). Hành động này sẽ XÓA VĨNH VIỄN:\n1. Bản thân người này.\n2. Vợ/Chồng của người này.\n3. TOÀN BỘ con cháu thuộc nhánh này.\n\nBạn có chắc chắn muốn cắt bỏ hoàn toàn nhánh này không?`;
    } else {
        confirmMsg = `XÓA DÂU/RỂ: Bạn đang xóa "${target.name}".\n\nHành động này chỉ xóa người này. Các con (nếu có) sẽ được giữ lại và gắn kết với người phối ngẫu còn lại.\n\nBạn có chắc chắn không?`;
    }

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setTreeData(prev => {
      const nextPersons = { ...prev.persons };
      
      if (isBloodRelative) {
        const idsToDelete = new Set<string>();

        const collectBranchIds = (pid: string) => {
           if (idsToDelete.has(pid)) return;
           idsToDelete.add(pid);
           
           const p = prev.persons[pid]; 
           if (!p) return;

           p.spouseIds.forEach(spId => {
               if(!idsToDelete.has(spId)) idsToDelete.add(spId);
           });

           p.childrenIds.forEach(childId => collectBranchIds(childId));
        };

        collectBranchIds(target.id);

        if (target.parentId && nextPersons[target.parentId]) {
           const parent = nextPersons[target.parentId];
           nextPersons[target.parentId] = {
              ...parent,
              childrenIds: parent.childrenIds.filter(id => id !== target.id)
           };
        }

        idsToDelete.forEach(id => {
            delete nextPersons[id];
        });

        if (target.isRoot) {
            return { persons: {}, rootId: null };
        }

      } else {
        let bloodSpouseId: string | null = null;
        
        for (const spId of target.spouseIds) {
            const spouse = prev.persons[spId];
            if (spouse && (spouse.parentId || spouse.isRoot)) {
                bloodSpouseId = spId;
                break;
            }
        }
        
        if (!bloodSpouseId && target.spouseIds.length > 0) {
            bloodSpouseId = target.spouseIds[0];
        }

        if (bloodSpouseId && nextPersons[bloodSpouseId]) {
            const survivor = nextPersons[bloodSpouseId];

            nextPersons[bloodSpouseId] = {
                ...survivor,
                spouseIds: survivor.spouseIds.filter(id => id !== target.id)
            };

            target.childrenIds.forEach(childId => {
                const child = nextPersons[childId];
                if (child) {
                    let updates: Partial<Person> = {};
                    
                    if (child.parentId === target.id) {
                        updates.parentId = bloodSpouseId;
                    }
                    
                    if (Object.keys(updates).length > 0) {
                        nextPersons[childId] = { ...child, ...updates };
                    }
                    
                    if (!nextPersons[bloodSpouseId].childrenIds.includes(childId)) {
                         nextPersons[bloodSpouseId] = {
                             ...nextPersons[bloodSpouseId],
                             childrenIds: [...nextPersons[bloodSpouseId].childrenIds, childId]
                         };
                    }
                }
            });
        }

        delete nextPersons[target.id];
      }

      return { persons: nextPersons, rootId: prev.rootId };
    });

    setSelectedPersonId(null);
    setSidebarOpen(false);
    
    setExpandedNodes(prev => {
        const next = new Set(prev);
        if (next.has(selectedPersonId)) next.delete(selectedPersonId);
        return next;
    });
  };

  const handleFormSubmit = (formData: any) => {
    const newPersons = { ...treeData.persons };
    const timestampId = Date.now().toString();
    let newRootId = treeData.rootId;
    let nodesToExpand: string[] = [];

    if (formMode === 'edit' && selectedPersonId) {
       if (newPersons[selectedPersonId]) {
         newPersons[selectedPersonId] = { ...newPersons[selectedPersonId], ...formData };
       }
    } 
    else if (formMode === 'add_child' && selectedPersonId) {
       const parent = newPersons[selectedPersonId];
       if (parent) {
          const newChild: Person = {
            id: timestampId,
            name: formData.name || 'Unknown',
            gender: formData.gender || Gender.UNKNOWN,
            birthYear: formData.birthYear || '',
            deathYear: formData.deathYear || '',
            avatarUrl: formData.avatarUrl,
            notes: formData.notes,
            parentId: selectedPersonId,
            spouseIds: [],
            childrenIds: [],
            generation: parent.generation + 1,
            isRoot: false
          };
          
          newPersons[timestampId] = newChild;
          
          newPersons[selectedPersonId] = {
            ...parent,
            childrenIds: [...parent.childrenIds, timestampId]
          };

          parent.spouseIds.forEach(spouseId => {
             const spouse = newPersons[spouseId];
             if (spouse) {
                newPersons[spouseId] = {
                   ...spouse,
                   childrenIds: [...spouse.childrenIds, timestampId]
                };
             }
          });

          nodesToExpand.push(selectedPersonId);
          parent.spouseIds.forEach(sid => nodesToExpand.push(sid));
       }
    } 
    else if (formMode === 'add_spouse' && selectedPersonId) {
       const person = newPersons[selectedPersonId];
       if (person && person.spouseIds.length < 1) {
          const newSpouse: Person = {
            id: timestampId,
            name: formData.name || 'Unknown',
            gender: formData.gender || Gender.UNKNOWN,
            birthYear: formData.birthYear || '',
            deathYear: formData.deathYear || '',
            avatarUrl: formData.avatarUrl,
            notes: formData.notes,
            parentId: null,
            spouseIds: [selectedPersonId],
            childrenIds: [],
            generation: person.generation,
            isRoot: false
          };

          newPersons[timestampId] = newSpouse;
          newPersons[selectedPersonId] = {
            ...person,
            spouseIds: [...person.spouseIds, timestampId]
          };
          
          nodesToExpand.push(selectedPersonId);
          nodesToExpand.push(timestampId);
       }
    }
    else if (formMode === 'edit' && !selectedPersonId && formData.name) {
        const newRoot: Person = {
            id: timestampId,
            name: formData.name,
            gender: formData.gender || Gender.MALE,
            birthYear: formData.birthYear || '',
            deathYear: '',
            parentId: null,
            spouseIds: [],
            childrenIds: [],
            generation: 1,
            isRoot: true,
            notes: formData.notes
        };
        newPersons[timestampId] = newRoot;
        newRootId = timestampId;
        nodesToExpand.push(timestampId);
    }

    setTreeData({ persons: newPersons, rootId: newRootId });

    if (nodesToExpand.length > 0) {
      setExpandedNodes(prev => {
        const next = new Set(prev);
        nodesToExpand.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const openForm = (mode: string) => {
    setFormMode(mode);
    setIsFormOpen(true);
  };

  const calculateAgeAndStatus = (p: Person) => {
    const currentYear = new Date().getFullYear();
    const birth = parseInt(p.birthYear);
    const death = p.deathYear ? parseInt(p.deathYear) : null;
    
    if (isNaN(birth)) return { age: '?', status: 'Không rõ', isAlive: false };

    if (death) {
      const val = death - birth;
      return { age: val >= 0 ? `${val}` : '?', status: 'Đã mất', isAlive: false };
    } else {
      const val = currentYear - birth;
      return { age: val >= 0 ? `${val}` : '?', status: 'Còn sống', isAlive: true };
    }
  };

  const getAggregatedChildrenIds = (personId: string, persons: Record<string, Person>) => {
    const person = persons[personId];
    if (!person) return [];

    const ids = new Set(person.childrenIds);
    
    person.spouseIds.forEach(spouseId => {
      const spouse = persons[spouseId];
      if (spouse) {
        spouse.childrenIds.forEach(childId => ids.add(childId));
      }
    });

    return Array.from(ids);
  };

  const selectedPerson = selectedPersonId ? treeData.persons[selectedPersonId] : null;
  const personDetails = selectedPerson ? calculateAgeAndStatus(selectedPerson) : null;
  const aggregatedChildrenIds = selectedPerson ? getAggregatedChildrenIds(selectedPerson.id, treeData.persons) : [];

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden font-sans text-viet-brown">
      
      <AdminLogin 
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <PersonForm 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        mode={formMode}
        initialData={formMode === 'edit' ? selectedPerson : null}
        relativePerson={selectedPerson}
        onSubmit={handleFormSubmit}
      />

      <header 
        className="h-16 border-b border-white/10 flex items-center justify-between px-4 md:px-6 shadow-md z-30 shrink-0 relative transition-all duration-500 bg-pattern-dragon-red"
      >
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] z-0"></div>

        <div className="flex items-center gap-4 relative z-10">
          <div className="bg-white/10 text-viet-gold p-2 rounded-lg shadow-sm backdrop-blur-sm border border-white/20">
            <BookOpen size={24} />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-viet-gold uppercase tracking-wide leading-none shadow-black/20 drop-shadow-md">Gia Phả Việt</h1>
            <p className="text-[10px] text-white/90 font-medium tracking-widest mt-0.5 shadow-black/20 drop-shadow-md">LƯU GIỮ CỘI NGUỒN</p>
          </div>
        </div>
        
        <div className="hidden md:block flex-1 max-w-md mx-8 relative z-10">
           <form onSubmit={handleSearch} className="relative group">
             <input 
                type="text" 
                placeholder="Tìm thành viên..." 
                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/80 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-viet-gold/50 focus:bg-white/20 transition-all shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
             <Search size={16} className="absolute left-3.5 top-2.5 text-white/80 group-focus-within:text-viet-gold transition-colors" />
           </form>
        </div>

        <div className="flex items-center gap-2 relative z-10">
          {isAdmin && (
            <>
               {Object.keys(treeData.persons).length === 0 && (
                 <button 
                   onClick={() => { setSelectedPersonId(null); openForm('edit'); }}
                   className="flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded-full text-xs font-bold hover:bg-green-700 transition-colors shadow-sm mr-2 animate-fadeIn"
                 >
                   <PlusCircle size={16} />
                   Thêm Tổ Tiên (Gốc)
                 </button>
               )}

              <div className="h-6 w-px bg-white/20 mx-1 hidden md:block"></div>

              <label className="cursor-pointer hover:bg-white/10 p-2 rounded-full transition-colors tooltip relative group" title="Nhập Excel">
                <Upload size={20} className="text-white/90" />
                <input type="file" accept=".xlsx" onChange={handleFileUpload} className="hidden" />
              </label>
              
              <button 
                onClick={handleExport}
                className="hover:bg-white/10 p-2 rounded-full transition-colors text-white/90"
                title="Xuất Excel"
              >
                <Download size={20} />
              </button>
            </>
          )}

          {isAdmin ? (
            <button 
              onClick={handleLogout}
              className="ml-2 flex items-center gap-2 bg-viet-gold text-viet-red px-3 py-1.5 rounded-full text-xs font-bold hover:bg-white hover:text-viet-red transition-colors shadow-sm"
              title="Đăng xuất quản trị"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Admin</span>
            </button>
          ) : (
            <button 
              onClick={() => setIsLoginOpen(true)}
              className="ml-1 hover:bg-white/10 p-2 rounded-full transition-colors text-white/60 hover:text-white"
              title="Đăng nhập quản trị"
            >
              <Lock size={18} />
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 relative flex overflow-hidden">
        
        <div className="flex-1 h-full relative transition-all duration-500 bg-pattern-bronze-drum">
           {isLoading && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-50 backdrop-blur-sm">
               <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-viet-red mb-4"></div>
               <p className="text-viet-brown font-medium">Đang xử lý dữ liệu...</p>
             </div>
           )}
           
           <TreeContainer 
              data={treeData} 
              onSelectPerson={handleSelectPerson} 
              searchTerm={searchTerm}
              expandedNodes={expandedNodes}
              onToggleExpand={toggleNodeExpansion}
           />

           <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur border border-gray-200 p-4 rounded-lg shadow-sm text-xs space-y-2 hidden md:block">
              <div className="flex items-center gap-2 text-gray-600">
                 <User size={14} />
                 <span>Thành viên: <strong className="text-viet-brown">{Object.keys(treeData.persons).length}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                 <Layers size={14} />
                 <span>Đời: <strong className="text-viet-brown">5</strong></span>
              </div>
           </div>
        </div>

        <aside 
          className={`
            absolute top-4 bottom-4 right-4 w-[400px] bg-white rounded-xl shadow-2xl border border-gray-200 
            transform transition-transform duration-300 ease-out z-40 flex flex-col overflow-hidden
            ${isSidebarOpen ? 'translate-x-0' : 'translate-x-[120%]'}
          `}
        >
          {selectedPerson && personDetails ? (
            <>
              <div className="h-32 relative shrink-0 bg-pattern-dragon-red">
                 <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                 <button 
                   onClick={() => setSidebarOpen(false)}
                   className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 p-1.5 rounded-full transition-colors z-10"
                 >
                   <X size={20} />
                 </button>
                 <div className="absolute -bottom-10 left-6 z-10">
                    <div className="w-20 h-20 rounded-full border-4 border-white bg-white shadow-md overflow-hidden relative group">
                      {selectedPerson.avatarUrl ? (
                         <img src={selectedPerson.avatarUrl} alt={selectedPerson.name} className="w-full h-full object-cover" />
                      ) : (
                         <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                            <User size={32} />
                         </div>
                      )}
                      
                      {isAdmin && (
                        <button 
                          onClick={() => openForm('edit')}
                          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                        >
                           <Edit3 size={24} />
                        </button>
                      )}
                    </div>
                 </div>
              </div>

              <div className="mt-12 px-6 pb-6 border-b border-gray-100 shrink-0">
                 <h2 className="text-2xl font-serif font-bold text-gray-900">{selectedPerson.name}</h2>
                 <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="bg-viet-gold/20 text-viet-gold-dark px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                       Đời thứ {selectedPerson.generation}
                    </span>
                    <span className="text-sm text-gray-500 border-l border-gray-300 pl-3">
                       {selectedPerson.gender === Gender.MALE ? 'Nam' : selectedPerson.gender === Gender.FEMALE ? 'Nữ' : 'Không rõ'}
                    </span>
                    <span className={`text-sm flex items-center gap-1 ${personDetails.isAlive ? 'text-green-600' : 'text-gray-500'}`}>
                        {personDetails.isAlive ? <Activity size={12} /> : null}
                        {personDetails.status}
                    </span>
                 </div>
              </div>

              <div className="flex border-b border-gray-200 shrink-0">
                <button 
                  onClick={() => setActiveTab('info')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === 'info' ? 'text-viet-red' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Thông tin
                  {activeTab === 'info' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-viet-red"></div>}
                </button>
                <button 
                  onClick={() => setActiveTab('family')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === 'family' ? 'text-viet-red' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Gia đình
                  {activeTab === 'family' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-viet-red"></div>}
                </button>
                <button 
                  onClick={() => setActiveTab('timeline')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === 'timeline' ? 'text-viet-red' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Sự kiện
                  {activeTab === 'timeline' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-viet-red"></div>}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 relative">
                
                {activeTab === 'info' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-gray-50">
                         <span className="text-gray-500 text-sm flex items-center gap-2"><Clock size={14} /> Tuổi thọ</span>
                         <span className="font-medium text-gray-900">{personDetails.age !== '?' ? `${personDetails.age} tuổi` : '---'}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-50">
                         <span className="text-gray-500 text-sm">Năm sinh</span>
                         <span className="font-medium text-gray-900">{selectedPerson.birthYear}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-50">
                         <span className="text-gray-500 text-sm">Năm mất</span>
                         <span className="font-medium text-gray-900">{selectedPerson.deathYear || '---'}</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Tiểu sử & Ghi chú</h4>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                        {selectedPerson.notes || 'Chưa có ghi chú nào cho thành viên này.'}
                      </div>
                    </div>

                     {isAdmin && (
                        <div className="grid grid-cols-2 gap-3 mt-4">
                           {selectedPerson.spouseIds.length === 0 ? (
                              <button 
                                onClick={() => openForm('add_spouse')}
                                className="flex items-center justify-center gap-2 bg-pink-50 text-pink-700 border border-pink-100 py-3 rounded-lg text-xs font-bold hover:bg-pink-100 transition-colors"
                              >
                                  <Heart size={16} />
                                  Thêm Vợ/Chồng
                              </button>
                           ) : (
                             <div className="flex items-center justify-center gap-2 bg-gray-50 text-gray-400 border border-gray-100 py-3 rounded-lg text-xs font-bold cursor-not-allowed" title="Đã có vợ/chồng">
                                <Heart size={16} />
                                Đã kết hôn
                             </div>
                           )}

                           <button 
                             onClick={() => openForm('add_child')}
                             className="flex items-center justify-center gap-2 bg-blue-50 text-blue-700 border border-blue-100 py-3 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                           >
                              <Baby size={16} />
                              Thêm Con
                           </button>
                        </div>
                     )}
                  </div>
                )}

                {activeTab === 'family' && (
                   <div className="space-y-6 animate-fadeIn">
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Cha Mẹ</h4>
                        {selectedPerson.parentId ? (
                           <button 
                             onClick={() => setSelectedPersonId(selectedPerson.parentId!)}
                             className="flex items-center gap-3 w-full p-2 hover:bg-gray-50 rounded-lg transition-colors text-left group"
                           >
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                                 <User size={14} className="text-gray-500" />
                              </div>
                              <div>
                                 <div className="text-sm font-medium text-viet-brown group-hover:text-viet-red transition-colors">
                                    {treeData.persons[selectedPerson.parentId!]?.name}
                                 </div>
                                 <div className="text-[10px] text-gray-400">Thế hệ trước</div>
                              </div>
                              <ChevronRight size={14} className="ml-auto text-gray-300" />
                           </button>
                        ) : (
                           <div className="text-sm text-gray-400 italic pl-2">Không có thông tin (hoặc là gốc/dâu/rể)</div>
                        )}
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-3">
                           <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vợ / Chồng</h4>
                        </div>
                        {selectedPerson.spouseIds.length > 0 ? (
                           <div className="space-y-2">
                              {selectedPerson.spouseIds.map(sid => {
                                 const spouse = treeData.persons[sid];
                                 return (
                                    <button 
                                      key={sid} 
                                      onClick={() => setSelectedPersonId(sid)}
                                      className="flex items-center gap-3 w-full p-2 border border-gray-100 hover:bg-gray-50 rounded-lg transition-colors group text-left"
                                    >
                                       <div className="w-8 h-8 rounded-full bg-yellow-50 flex items-center justify-center shrink-0 border border-yellow-100">
                                          <User size={14} className="text-yellow-600" />
                                       </div>
                                       <div>
                                          <div className="text-sm font-medium text-gray-700 group-hover:text-viet-red">
                                             {spouse ? spouse.name : `Người phối ngẫu (${sid})`}
                                          </div>
                                          {spouse && <div className="text-[10px] text-gray-400">{spouse.birthYear}</div>}
                                       </div>
                                       <ChevronRight size={14} className="ml-auto text-gray-300 opacity-0 group-hover:opacity-100" />
                                    </button>
                                 );
                              })}
                           </div>
                        ) : (
                           <div className="text-sm text-gray-400 italic pl-2">Độc thân hoặc chưa cập nhật</div>
                        )}
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-3">
                           <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                              Con cái ({aggregatedChildrenIds.length})
                           </h4>
                        </div>
                        
                        {aggregatedChildrenIds.length > 0 ? (
                           <div className="space-y-1">
                              {aggregatedChildrenIds.map(cid => {
                                 const child = treeData.persons[cid];
                                 if (!child) return null;
                                 return (
                                    <button 
                                      key={cid}
                                      onClick={() => setSelectedPersonId(cid)}
                                      className="flex items-center gap-3 w-full p-2 hover:bg-gray-50 rounded-lg transition-colors text-left group"
                                    >
                                       <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                          <User size={14} className="text-gray-500" />
                                       </div>
                                       <div className="flex-1">
                                          <div className="text-sm font-medium text-gray-700 group-hover:text-viet-red transition-colors flex justify-between">
                                             <span>{child.name}</span>
                                             <span className="text-[10px] text-gray-400 font-normal">{child.gender === Gender.MALE ? 'Nam' : 'Nữ'}</span>
                                          </div>
                                          <div className="text-[10px] text-gray-400">{child.birthYear}</div>
                                       </div>
                                    </button>
                                 );
                              })}
                           </div>
                        ) : (
                           <div className="text-sm text-gray-400 italic pl-2">Chưa có thông tin con cái</div>
                        )}
                      </div>
                   </div>
                )}

                {activeTab === 'timeline' && (
                   <div className="space-y-4 animate-fadeIn">
                      <div className="relative pl-4 border-l-2 border-gray-100 space-y-6 py-2">
                         <div className="relative">
                            <div className="absolute -left-[21px] top-1 w-3 h-3 bg-viet-gold rounded-full border-2 border-white shadow-sm"></div>
                            <div className="text-sm font-bold text-gray-900">{selectedPerson.birthYear}</div>
                            <div className="text-sm text-gray-600">Sinh ra</div>
                         </div>
                         {selectedPerson.spouseIds.length > 0 && (
                            <div className="relative">
                               <div className="absolute -left-[21px] top-1 w-3 h-3 bg-gray-200 rounded-full border-2 border-white"></div>
                               <div className="text-sm font-bold text-gray-900">---</div>
                               <div className="text-sm text-gray-600">Kết hôn</div>
                            </div>
                         )}
                         {selectedPerson.deathYear && (
                            <div className="relative">
                               <div className="absolute -left-[21px] top-1 w-3 h-3 bg-gray-400 rounded-full border-2 border-white"></div>
                               <div className="text-sm font-bold text-gray-900">{selectedPerson.deathYear}</div>
                               <div className="text-sm text-gray-600">Qua đời</div>
                            </div>
                         )}
                      </div>
                   </div>
                )}

              </div>

              {isAdmin && (
                <div className="bg-gray-50 p-4 border-t border-gray-200 flex gap-3 animate-slideUp">
                  <button 
                    onClick={() => openForm('edit')}
                    className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 font-bold py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <Edit3 size={16} />
                    Chỉnh sửa
                  </button>
                  <button 
                    onClick={handleDeletePerson}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-50 border border-red-100 text-red-600 font-bold py-2 rounded-lg hover:bg-red-100 transition-colors shadow-sm"
                  >
                    <Trash2 size={16} />
                    Xóa
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400">
               <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <User size={32} />
               </div>
               <p className="text-sm">Chọn một thành viên trên cây gia phả để xem chi tiết.</p>
            </div>
          )}
        </aside>

      </main>
    </div>
  );
}