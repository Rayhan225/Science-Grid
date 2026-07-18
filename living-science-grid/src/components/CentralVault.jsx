// src/components/CentralVault.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderPlus, FilePlus, ArrowLeft, Folder, FileText, Trash2, 
  Edit3, ChevronRight, Loader2, Database, HardDrive, LayoutGrid, 
  List, Play, X, Image as ImageIcon, AlertCircle 
} from 'lucide-react';

export default function CentralVault({ setCurrentView }) {
  const [items, setItems] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [folderPath, setFolderPath] = useState([]); 
  const [isProcessing, setIsProcessing] = useState(false);
  
  // File Upload Drag State
  const [isFileDragging, setIsFileDragging] = useState(false);
  
  // Internal Item Move Drag State
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverTargetId, setDragOverTargetId] = useState(null);
  
  const [viewMode, setViewMode] = useState('grid');
  const [quota, setQuota] = useState({ count: 0, limit: 50 });
  const [uiFeedback, setUiFeedback] = useState({ message: '', type: '' }); 
  
  const [modal, setModal] = useState({ isOpen: false, type: '', item: null, inputValue: '' });
  const fileInputRef = useRef(null);

  const ALLOWED_EXTENSIONS = ['pdf', 'txt', 'png', 'jpg', 'jpeg', 'gif', 'webp'];

  const fetchData = async () => {
    try {
      const url = currentFolderId ? `http://localhost:5000/api/library?parentId=${currentFolderId}` : 'http://localhost:5000/api/library';
      const [itemsRes, quotaRes] = await Promise.all([fetch(url), fetch('http://localhost:5000/api/library/quota')]);
      setItems(await itemsRes.json());
      setQuota(await quotaRes.json());
    } catch (err) { 
      showFeedback('Data Sync Error', 'error'); 
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, [currentFolderId]);

  const showFeedback = (msg, type = 'success') => {
    setUiFeedback({ message: msg, type });
    setTimeout(() => setUiFeedback({ message: '', type: '' }), 4000);
  };

  // ==========================================
  // EXTERNAL FILE UPLOAD (DRAG & DROP)
  // ==========================================
  const handleDragOver = (e) => { 
    if (draggedItem) return; 
    e.preventDefault(); 
    setIsFileDragging(true); 
  };
  
  const handleDragLeave = () => setIsFileDragging(false);
  
  const handleDrop = async (e) => {
    if (draggedItem) return; 
    e.preventDefault();
    setIsFileDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFileUpload(e.dataTransfer.files[0]);
    }
  };

  const processFileUpload = async (file) => {
    if (!file) return;
    
    // Strict Type Validation
    const extension = file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      showFeedback(`Unsupported format (.${extension}). Only PDF, TXT, and Images are allowed.`, 'error');
      if (fileInputRef.current) fileInputRef.current.value = null;
      return;
    }

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        try {
          const base64Content = reader.result;
          const res = await fetch('http://localhost:5000/api/library', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: file.name, type: 'file', parentId: currentFolderId, textContent: base64Content })
          });
          
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Upload failed");
          
          showFeedback('File uploaded successfully');
          await fetchData();
        } catch (err) { 
          showFeedback(err.message, 'error'); 
        } finally {
          setIsProcessing(false);
          if (fileInputRef.current) fileInputRef.current.value = null;
        }
      };
      reader.onerror = () => { 
        showFeedback("Failed to read file", 'error'); 
        setIsProcessing(false); 
      };
    } catch (err) { 
      showFeedback(err.message, 'error'); 
      setIsProcessing(false);
    }
  };

  // ==========================================
  // INTERNAL ITEM MOVING (DRAG & DROP)
  // ==========================================
  const handleItemDragStart = (e, item) => {
    e.stopPropagation();
    setDraggedItem(item);
  };

  const handleTargetDragOver = (e, targetId) => {
    e.preventDefault(); 
    e.stopPropagation();
    if (draggedItem && draggedItem.id !== targetId) {
      setDragOverTargetId(targetId);
    }
  };

  const handleTargetDrop = async (e, targetId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTargetId(null);

    if (!draggedItem) return;
    if (draggedItem.id === targetId) { setDraggedItem(null); return; } 
    
    try {
      const res = await fetch(`http://localhost:5000/api/library/${draggedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: draggedItem.name, 
          parentId: targetId === 'root' ? null : targetId 
        })
      });
      if (!res.ok) throw new Error("Failed to move item.");
      
      showFeedback(`Moved '${draggedItem.name}' successfully.`);
      fetchData();
    } catch (err) {
      showFeedback(err.message, 'error');
    }
    setDraggedItem(null);
  };

  // ==========================================
  // CRUD & NAVIGATION
  // ==========================================
  const submitModalAction = async () => {
    try {
      if (modal.type === 'CREATE_FOLDER') {
        if (!modal.inputValue.trim()) return;
        await fetch('http://localhost:5000/api/library', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: modal.inputValue, type: 'folder', parentId: currentFolderId })
        });
        showFeedback('Folder created');
      } 
      else if (modal.type === 'RENAME') {
        if (!modal.inputValue.trim()) return;
        await fetch(`http://localhost:5000/api/library/${modal.item.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: modal.inputValue })
        });
        showFeedback('Renamed successfully');
      } 
      else if (modal.type === 'DELETE') {
        await fetch(`http://localhost:5000/api/library/${modal.item.id}`, { method: 'DELETE' });
        showFeedback('Item deleted', 'error'); 
      }
      setModal({ isOpen: false, type: '', item: null, inputValue: '' });
      fetchData();
    } catch (err) { 
      showFeedback('Action failed', 'error'); 
    }
  };

  const navigateToFolder = (folder) => {
    setFolderPath(prev => [...prev, folder]);
    setCurrentFolderId(folder.id);
  };

  const navigateUp = () => {
    const pathCopy = [...folderPath];
    pathCopy.pop();
    setFolderPath(pathCopy);
    setCurrentFolderId(pathCopy.length > 0 ? pathCopy[pathCopy.length - 1].id : null);
  };

  const getFileIcon = (filename) => {
    if (filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return <ImageIcon size={20} className="text-pink-400" />;
    if (filename.match(/\.(pdf)$/i)) return <FileText size={20} className="text-red-400" />;
    return <FileText size={20} className="text-blue-400" />;
  };

  return (
    <div 
      className="p-8 h-full max-w-[1400px] mx-auto flex flex-col animate-fadeIn select-none relative outline-none"
      onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
    >
      {/* Dynamic Toast Feedback */}
      {uiFeedback.message && (
        <div className={`absolute top-6 right-8 z-50 px-6 py-4 rounded-xl border font-mono text-xs uppercase tracking-widest shadow-2xl animate-fadeIn flex items-center gap-3 ${uiFeedback.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'}`}>
          {uiFeedback.type === 'error' ? <AlertCircle size={16}/> : <Database size={16}/>}
          {uiFeedback.message}
        </div>
      )}

      {/* External File Upload Overlay */}
      {isFileDragging && (
        <div className="absolute inset-0 z-40 bg-cyan-900/20 backdrop-blur-sm border-4 border-cyan-500 border-dashed rounded-3xl flex items-center justify-center m-8 pointer-events-none">
          <div className="bg-[#0a0a0a] px-12 py-8 rounded-3xl shadow-2xl flex flex-col items-center animate-bounce border border-cyan-500/30">
            <FilePlus size={56} className="text-cyan-400 mb-4" />
            <span className="font-mono text-white tracking-widest uppercase font-bold text-lg mb-2">Drop File to Upload</span>
            <span className="text-xs text-cyan-400 font-mono">Accepts: PDF, TXT, PNG, JPG, WEBP</span>
          </div>
        </div>
      )}

      {/* Item Action Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fadeIn">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-mono uppercase tracking-widest text-sm">
                {modal.type === 'CREATE_FOLDER' ? 'Create Directory' : modal.type === 'RENAME' ? 'Rename Item' : 'Confirm Purge'}
              </h3>
              <button onClick={() => setModal({ isOpen: false })} className="text-slate-500 hover:text-white"><X size={18}/></button>
            </div>
            
            {modal.type !== 'DELETE' ? (
              <input 
                type="text" autoFocus
                value={modal.inputValue} onChange={(e) => setModal({ ...modal, inputValue: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && submitModalAction()}
                placeholder="Enter name..."
                className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 mb-6 font-mono"
              />
            ) : (
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-red-400">{modal.item?.name}</strong>? This will cascade and destroy all associated vectors.
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={() => setModal({ isOpen: false })} className="px-5 py-2.5 rounded-xl text-xs font-mono uppercase tracking-widest text-slate-400 hover:bg-white/5 transition-colors">Cancel</button>
              <button onClick={submitModalAction} className={`px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-widest transition-colors text-black ${modal.type === 'DELETE' ? 'bg-red-500 hover:bg-red-400' : 'bg-cyan-500 hover:bg-cyan-400'}`}>
                {modal.type === 'DELETE' ? 'Delete' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER & BREADCRUMBS */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-serif text-white tracking-tight mb-4 flex items-center gap-3">
            <Database className="text-cyan-400" size={28}/> Global Vault
          </h1>
          
          <div className="flex items-center gap-2 text-sm font-medium text-slate-400 bg-white/5 px-4 py-2 rounded-xl w-fit border border-transparent transition-colors">
            <span 
              className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${dragOverTargetId === 'root' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'hover:text-white'}`}
              onClick={() => { setCurrentFolderId(null); setFolderPath([]); }}
              onDragOver={(e) => handleTargetDragOver(e, 'root')}
              onDragLeave={() => setDragOverTargetId(null)}
              onDrop={(e) => handleTargetDrop(e, 'root')}
            >
              Root
            </span>
            
            {folderPath.map(folder => (
              <React.Fragment key={folder.id}>
                <ChevronRight size={14} className="opacity-50"/>
                <span 
                  className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${dragOverTargetId === folder.id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'text-cyan-400 hover:text-cyan-300'}`}
                  onClick={() => {
                    const idx = folderPath.findIndex(f => f.id === folder.id);
                    setFolderPath(folderPath.slice(0, idx + 1));
                    setCurrentFolderId(folder.id);
                  }}
                  onDragOver={(e) => handleTargetDragOver(e, folder.id)}
                  onDragLeave={() => setDragOverTargetId(null)}
                  onDrop={(e) => handleTargetDrop(e, folder.id)}
                >
                  {folder.name}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>
        
        {/* ACTION BUTTONS */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-4">
            <div className="flex bg-white/5 rounded-xl p-1 mr-2">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}><LayoutGrid size={16}/></button>
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}><List size={16}/></button>
            </div>
            <button onClick={() => setModal({ isOpen: true, type: 'CREATE_FOLDER', inputValue: '' })} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider transition-all text-slate-300">
              <FolderPlus size={16}/> New Folder
            </button>
            <button onClick={() => fileInputRef.current.click()} disabled={isProcessing || quota.count >= quota.limit} className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(34,211,238,0.2)] disabled:opacity-50">
              {isProcessing ? <Loader2 size={16} className="animate-spin"/> : <FilePlus size={16}/>} Upload File
            </button>
            <input type="file" ref={fileInputRef} onChange={(e) => processFileUpload(e.target.files[0])} accept=".pdf,.txt,.png,.jpg,.jpeg,.gif,.webp" className="hidden" />
          </div>
          <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mr-2">Supported: PDF, TXT, Images</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-grow overflow-hidden pb-12">
        {/* SIDEBAR: Storage Quota */}
        <div className="lg:w-64 flex-shrink-0 flex flex-col gap-4">
          <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-3 text-slate-300 mb-6 font-medium">
              <HardDrive size={18} className="text-cyan-400"/> Storage
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-3">
              <div className={`h-full transition-all duration-500 ${(quota.count/quota.limit) > 0.9 ? 'bg-red-500' : 'bg-cyan-400'}`} style={{ width: `${(quota.count / quota.limit) * 100}%` }}></div>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              <span className={(quota.count/quota.limit) > 0.9 ? 'text-red-400 font-bold' : 'text-white'}>{quota.count}</span> of {quota.limit} files used
            </div>
          </div>
        </div>

        {/* MAIN DRIVE CANVAS */}
        <div className="flex-grow bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 shadow-xl overflow-y-auto hide-scrollbar flex flex-col relative">
          
          {currentFolderId && (
            <button onClick={navigateUp} className="w-fit mb-6 flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors">
              <ArrowLeft size={16}/> Back
            </button>
          )}

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full opacity-40 py-20">
              <Database size={48} className="text-slate-500 mb-4"/>
              <p className="text-sm font-medium text-slate-300">This folder is empty</p>
              <p className="text-xs text-slate-500 mt-2">Drag files here to upload.</p>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-max" : "flex flex-col gap-2"}>
              
              {/* FOLDERS (Acts as Drop Targets) */}
              {items.filter(i => i.type === 'folder').map(item => (
                <div 
                  key={item.id} 
                  draggable 
                  onDragStart={(e) => handleItemDragStart(e, item)}
                  onDragOver={(e) => handleTargetDragOver(e, item.id)}
                  onDragLeave={() => setDragOverTargetId(null)}
                  onDrop={(e) => handleTargetDrop(e, item.id)}
                  onDoubleClick={() => navigateToFolder(item)} 
                  className={`group relative transition-all cursor-pointer border ${dragOverTargetId === item.id ? 'bg-cyan-500/20 border-cyan-500/50 scale-105 z-10 shadow-2xl' : 'bg-white/[0.02] hover:bg-white/[0.04] border-white/5 hover:border-white/10'} ${draggedItem?.id === item.id ? 'opacity-50' : ''} ${viewMode === 'grid' ? 'p-5 rounded-2xl flex flex-col gap-3' : 'p-3 rounded-xl flex items-center justify-between'}`}
                >
                  <div className={`flex items-center gap-3 ${viewMode === 'grid' ? 'w-full' : ''}`}>
                    <Folder size={viewMode === 'grid' ? 24 : 18} className="text-slate-400 fill-slate-500/20 group-hover:text-cyan-400 transition-colors pointer-events-none" />
                    <span className="text-sm font-medium text-slate-200 truncate pointer-events-none">{item.name}</span>
                  </div>
                  
                  {/* Context Actions */}
                  <div className={`flex items-center gap-1 ${viewMode === 'grid' ? 'absolute top-3 right-3 opacity-0 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity bg-[#0a0a0a] rounded-lg p-1 shadow-lg border border-white/10`}>
                    <button onClick={(e) => { e.stopPropagation(); setModal({ isOpen: true, type: 'RENAME', item, inputValue: item.name }); }} className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-white/10"><Edit3 size={14}/></button>
                    <button onClick={(e) => { e.stopPropagation(); setModal({ isOpen: true, type: 'DELETE', item }); }} className="p-1.5 text-slate-400 hover:text-red-400 rounded hover:bg-red-500/20"><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}

              {/* FILES (Draggable, but cannot be dropped into) */}
              {items.filter(i => i.type === 'file').map(item => (
                <div 
                  key={item.id} 
                  draggable 
                  onDragStart={(e) => handleItemDragStart(e, item)}
                  className={`group relative bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all ${draggedItem?.id === item.id ? 'opacity-50' : ''} ${viewMode === 'grid' ? 'p-5 rounded-2xl flex flex-col gap-3' : 'p-3 rounded-xl flex items-center justify-between'}`}
                >
                  <div className={`flex items-center gap-3 ${viewMode === 'grid' ? 'w-full' : ''} pointer-events-none`}>
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                      {getFileIcon(item.name)}
                    </div>
                    <div className="flex flex-col truncate">
                      <span className="text-sm font-medium text-slate-300 truncate">{item.name}</span>
                      {viewMode === 'grid' && <span className="text-[10px] text-slate-500 font-mono mt-1">{new Date(item.uploaded_at).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  {viewMode === 'list' && <span className="text-xs text-slate-500 font-mono flex-grow text-center">{new Date(item.uploaded_at).toLocaleDateString()}</span>}
                  
                  {/* Context Actions */}
                  <div className={`flex items-center gap-1 ${viewMode === 'grid' ? 'absolute top-3 right-3 opacity-0 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity bg-[#0a0a0a] rounded-lg p-1 shadow-lg border border-white/10`}>
                    <button onClick={() => setCurrentView(item.name.endsWith('.pdf') ? 'insight-lens' : 'math-evaluator')} className="p-1.5 text-cyan-400 hover:text-cyan-300 rounded hover:bg-cyan-500/20 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                      <Play size={14}/> Open
                    </button>
                    <div className="w-px h-4 bg-white/10 mx-1"></div>
                    <button onClick={(e) => { e.stopPropagation(); setModal({ isOpen: true, type: 'RENAME', item, inputValue: item.name }); }} className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-white/10"><Edit3 size={14}/></button>
                    <button onClick={(e) => { e.stopPropagation(); setModal({ isOpen: true, type: 'DELETE', item }); }} className="p-1.5 text-slate-400 hover:text-red-400 rounded hover:bg-red-500/20"><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}