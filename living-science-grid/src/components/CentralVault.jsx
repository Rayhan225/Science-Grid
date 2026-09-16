// src/components/CentralVault.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderPlus, FilePlus, ArrowLeft, Folder, FileText, Trash2, 
  Edit3, ChevronRight, ChevronLeft, Loader2, Database, HardDrive, LayoutGrid,
  List, Play, X, Image as ImageIcon, AlertCircle, BookMarked, 
  Search, ExternalLink, Copy, Check, Filter, Sparkles, Download, RefreshCw, Pin
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const API_BASE = 'http://127.0.0.1:8000';

export default function CentralVault({ setCurrentView }) {
  let themeContext = { isLight: false, themeClasses: { bgCard: 'bg-[#0a0a0a]', bgMain: 'bg-[#050505]' } };
  try {
    const ctx = useTheme();
    if (ctx) themeContext = ctx;
  } catch (e) {}
  const { themeClasses, isLight } = themeContext;

  const [activeTab, setActiveTab] = useState('files');

  // File State
  const [items, setItems] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [folderPath, setFolderPath] = useState([]); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [quota, setQuota] = useState({ count: 0, limit: 50 });
  const [uiFeedback, setUiFeedback] = useState({ message: '', type: '' }); 
  const [modal, setModal] = useState({ isOpen: false, type: '', item: null, inputValue: '' });
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const [fileSearchQuery, setFileSearchQuery] = useState('');

  // Dedicated Note Reader State
  const [readingNote, setReadingNote] = useState(null);

  // Citation Modal State (Academic Researcher)
  const [citationModal, setCitationModal] = useState({ isOpen: false, item: null, data: null, loading: false, copiedFormat: null });

  const handleOpenCiteForVaultFile = async (item) => {
    setCitationModal({ isOpen: true, item, data: null, loading: true, copiedFormat: null });
    try {
      const cleanTitle = item.name.replace(/\.[^/.]+$/, "");
      const res = await fetch(`${API_BASE}/api/citations/export?title=${encodeURIComponent(cleanTitle)}&authors=ScholarGrid%20Researcher&year=2024`);
      if (res.ok) {
        const data = await res.json();
        setCitationModal(prev => ({ ...prev, data, loading: false }));
      } else {
        setCitationModal(prev => ({ ...prev, loading: false }));
      }
    } catch (e) {
      setCitationModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleCopyCitation = (fmt, text) => {
    navigator.clipboard.writeText(text);
    setCitationModal(prev => ({ ...prev, copiedFormat: fmt }));
    setTimeout(() => setCitationModal(prev => ({ ...prev, copiedFormat: null })), 2500);
  };

  const handleDownloadBibFile = () => {
    if (!citationModal.data?.formats?.bibtex) return;
    const blob = new Blob([citationModal.data.formats.bibtex], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${citationModal.data.bibtexKey || 'citation'}.bib`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Drag State
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverTargetId, setDragOverTargetId] = useState(null);
  const draggedItemRef = useRef(null);

  // Notes State
  const [vaultNotes, setVaultNotes] = useState([]);
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  const [selectedNoteSource, setSelectedNoteSource] = useState('ALL');
  const [copiedNoteId, setCopiedNoteId] = useState(null);

  const ALLOWED_EXTENSIONS = ['pdf', 'txt', 'png', 'jpg', 'jpeg', 'gif', 'webp'];

  const getCurrentUserId = () => {
    try {
      const user = JSON.parse(localStorage.getItem('sg_current_user') || '{}');
      return user.id || 'usr_admin';
    } catch {
      return 'usr_admin';
    }
  };
  const getUserId = getCurrentUserId;

  const fetchData = async () => {
    try {
      const uid = getUserId();
      const parentParam = currentFolderId ? `parentId=${currentFolderId}&` : '';
      const url = `${API_BASE}/api/library?${parentParam}user_id=${encodeURIComponent(uid)}`;
      const [itemsRes, quotaRes] = await Promise.all([
        fetch(url),
        fetch(`${API_BASE}/api/library/quota?user_id=${encodeURIComponent(uid)}`)
      ]);
      if (itemsRes.ok) setItems(await itemsRes.json());
      if (quotaRes.ok) setQuota(await quotaRes.json());
    } catch (err) { 
      showFeedback('Database Sync Error', 'error'); 
    }
  };

  const fetchNotes = async () => {
    try {
      const uid = getUserId();
      const res = await fetch(`${API_BASE}/api/vault/notes?user_id=${encodeURIComponent(uid)}`);
      if (res.ok) {
        const data = await res.json();
        setVaultNotes(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn("Notes sync error", err);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, [currentFolderId]);

  useEffect(() => {
    if (activeTab === 'notes') fetchNotes();
  }, [activeTab]);

  useEffect(() => {
    const handleNotesUpdated = () => {
      fetchNotes();
    };
    window.addEventListener('vaultNotesUpdated', handleNotesUpdated);
    return () => window.removeEventListener('vaultNotesUpdated', handleNotesUpdated);
  }, []);

  const showFeedback = (msg, type = 'success') => {
    setUiFeedback({ message: msg, type });
    setTimeout(() => setUiFeedback({ message: '', type: '' }), 4000);
  };

  const handleOpenFile = (item) => {
    const filePayload = {
      id: item.id,
      title: item.name,
      url: `${API_BASE}/api/library/file/${item.id}`
    };
    
    localStorage.setItem('sg_active_vault_file', JSON.stringify(filePayload));
    window.dispatchEvent(new CustomEvent('sg-open-file', { detail: filePayload }));
    
    if (item.name.toLowerCase().endsWith('.pdf')) {
      setCurrentView('insight-lens');
    } else {
      setCurrentView('math-evaluator');
    }
  };

  const handleOpenNoteInInsightLens = (note) => {
    const matchingFile = items.find(i => (i.name || '').toLowerCase() === (note?.source || '').toLowerCase());
    const filePayload = {
      id: matchingFile ? matchingFile.id : `note_file_${note.id}`,
      title: note.source || "Research Document",
      pageNumber: note.page_number || 1,
      url: matchingFile ? `${API_BASE}/api/library/file/${matchingFile.id}` : `${API_BASE}/api/library/resolve-file?filename=${encodeURIComponent(note.source || '')}`
    };
    
    localStorage.setItem('sg_active_vault_file', JSON.stringify(filePayload));
    window.dispatchEvent(new CustomEvent('sg-open-file', { detail: filePayload }));
    setCurrentView('insight-lens');
  };

  const processFileUpload = async (file) => {
    if (!file) return;
    const extension = file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      showFeedback(`Unsupported format (.${extension}). Only PDF, TXT, and Images allowed.`, 'error');
      if (fileInputRef.current) fileInputRef.current.value = null;
      return;
    }

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const res = await fetch(`${API_BASE}/api/library`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              name: file.name, 
              type: 'file', 
              parentId: currentFolderId, 
              textContent: reader.result,
              userId: getCurrentUserId()
            })
          });
          
          if (!res.ok) throw new Error("Upload failed");
          showFeedback('File committed to Sovereign Vault');
          await fetchData();
        } catch (err) { 
          showFeedback(err.message, 'error'); 
        } finally {
          setIsProcessing(false);
          if (fileInputRef.current) fileInputRef.current.value = null;
        }
      };
    } catch (err) { 
      showFeedback(err.message, 'error'); 
      setIsProcessing(false);
    }
  };

  const handleItemDragStart = (e, item) => {
    e.stopPropagation();
    draggedItemRef.current = item;
    setDraggedItem(item);
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', item.id);
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleTargetDragOver = (e, targetId) => {
    e.preventDefault(); 
    e.stopPropagation();
    const currentItem = draggedItemRef.current || draggedItem;
    if (currentItem && currentItem.id !== targetId) {
      setDragOverTargetId(targetId);
    }
  };

  const handleTargetDrop = async (e, targetId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTargetId(null);

    const itemToMove = draggedItemRef.current || draggedItem;

    if (!itemToMove || itemToMove.id === targetId) {
      draggedItemRef.current = null;
      setDraggedItem(null);
      return;
    } 
    
    try {
      const res = await fetch(`${API_BASE}/api/library/${itemToMove.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: itemToMove.name, 
          parentId: targetId === 'root' ? null : targetId 
        })
      });
      if (!res.ok) throw new Error("Failed to move item.");
      
      showFeedback(`Moved '${itemToMove.name}' successfully.`);
      fetchData();
    } catch (err) {
      showFeedback(err.message, 'error');
    }
    draggedItemRef.current = null;
    setDraggedItem(null);
  };

  const submitModalAction = async () => {
    try {
      if (modal.type === 'CREATE_FOLDER') {
        if (!modal.inputValue.trim()) return;
        const res = await fetch(`${API_BASE}/api/library`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: modal.inputValue.trim(), type: 'folder', parentId: currentFolderId })
        });
        if (res.ok) {
          showFeedback('Folder created successfully');
          fetchData();
        }
      } else if (modal.type === 'RENAME') {
        if (!modal.inputValue.trim()) return;
        const res = await fetch(`${API_BASE}/api/library/${modal.item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: modal.inputValue.trim(), parentId: modal.item.parentId })
        });
        if (res.ok) {
          showFeedback('Item renamed');
          fetchData();
        }
      } else if (modal.type === 'RENAME_NOTE') {
        if (!modal.inputValue.trim()) return;
        const newTitle = modal.inputValue.trim();
        const res = await fetch(`${API_BASE}/api/vault/notes/${modal.item.id}/rename`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle })
        });
        if (res.ok) {
          showFeedback('Note renamed');
          setVaultNotes(prev => prev.map(n => n.id === modal.item.id ? { ...n, title: newTitle } : n));
          if (readingNote && readingNote.id === modal.item.id) {
            setReadingNote(prev => ({ ...prev, title: newTitle }));
          }
          fetchNotes();
        } else {
          showFeedback('Failed to rename note', 'error');
        }
      } else if (modal.type === 'DELETE') {
        const res = await fetch(`${API_BASE}/api/library/${modal.item.id}`, { method: 'DELETE' });
        if (res.ok) {
          showFeedback('Item removed');
          fetchData();
        }
      }
    } catch (err) {
      showFeedback('Action failed', 'error');
    } finally {
      setModal({ isOpen: false, type: '', item: null, inputValue: '' });
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      const res = await fetch(`${API_BASE}/api/vault/notes/${noteId}`, { method: 'DELETE' });
      if (res.ok) {
        showFeedback('Note deleted');
        fetchNotes();
      }
    } catch (err) {
      showFeedback('Failed to delete note', 'error');
    }
  };

  const handleCopyNote = (noteId, text) => {
    navigator.clipboard.writeText(text);
    setCopiedNoteId(noteId);
    setTimeout(() => setCopiedNoteId(null), 2000);
  };

  const navigateToFolder = (folder) => {
    if (folder === null) {
      setCurrentFolderId(null);
      setFolderPath([]);
    } else {
      setCurrentFolderId(folder.id);
      const index = folderPath.findIndex(f => f.id === folder.id);
      if (index !== -1) {
        setFolderPath(folderPath.slice(0, index + 1));
      } else {
        setFolderPath([...folderPath, folder]);
      }
    }
  };

  const filteredFiles = items.filter(item => {
    if (!fileSearchQuery.trim()) return true;
    const q = fileSearchQuery.toLowerCase().trim();
    return (item.name && item.name.toLowerCase().includes(q)) ||
           (item.type && item.type.toLowerCase().includes(q));
  });

  const handleTogglePinNote = async (e, note) => {
    if (e) e.stopPropagation();
    const nextPin = !note.is_pinned;
    try {
      const res = await fetch(`${API_BASE}/api/vault/notes/${note.id}/pin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pinned: nextPin })
      });
      if (res.ok) {
        setVaultNotes(prev => prev.map(n => n.id === note.id ? { ...n, is_pinned: nextPin } : n));
        if (readingNote && readingNote.id === note.id) {
          setReadingNote(prev => ({ ...prev, is_pinned: nextPin }));
        }
      }
    } catch (err) {
      console.error("Pin note error:", err);
    }
  };

  const handleRenameNote = (e, note) => {
    if (e) e.stopPropagation();
    const currentTitle = note.title || note.source || "Note";
    setModal({
      isOpen: true,
      type: 'RENAME_NOTE',
      item: note,
      inputValue: currentTitle
    });
  };

  const uniqueSources = ['ALL', ...Array.from(new Set(vaultNotes.map(n => n.source))).filter(Boolean)];

  const filteredNotes = vaultNotes
    .filter(note => {
      const matchesSource = selectedNoteSource === 'ALL' || note.source === selectedNoteSource;
      const q = noteSearchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        (note.title && note.title.toLowerCase().includes(q)) ||
        (note.text && note.text.toLowerCase().includes(q)) ||
        (note.insight && note.insight.toLowerCase().includes(q)) ||
        (note.source && note.source.toLowerCase().includes(q));
      return matchesSource && matchesSearch;
    })
    .sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));

  return (
    <div className={`h-full w-full flex flex-col overflow-hidden font-sans select-none ${themeClasses.bgMain}`}>
      {/* HEADER */}
      <div className={`px-8 py-5 border-b flex items-center justify-between z-10 flex-shrink-0 backdrop-blur-md ${isLight ? 'border-slate-200 bg-white/70' : 'border-white/10 bg-black/40'}`}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20 shadow-lg">
            <Database size={20}/>
          </div>
          <div>
            <h1 className={`text-base font-mono font-bold uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-white'}`}>Central Storage Vault</h1>
            <p className="text-xs font-mono text-slate-400">Sovereign Connected Repository</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-black/20 px-4 py-2 rounded-xl border border-white/5 font-mono text-xs">
            <HardDrive size={14} className="text-cyan-400" />
            <span className="text-slate-400">Storage:</span>
            <span className="text-white font-bold">{quota.count} / {quota.limit} Items</span>
          </div>

          <div className="flex bg-black/30 p-1 rounded-xl border border-white/10 font-mono text-xs uppercase tracking-widest">
            <button 
              onClick={() => setActiveTab('files')} 
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${activeTab === 'files' ? 'bg-cyan-500 text-black font-bold shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              <Folder size={14}/> Files
            </button>
            <button 
              onClick={() => setActiveTab('notes')} 
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${activeTab === 'notes' ? 'bg-cyan-500 text-black font-bold shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              <BookMarked size={14}/> Notes ({vaultNotes.length})
            </button>
          </div>
        </div>
      </div>

      {/* FEEDBACK TOAST */}
      {uiFeedback.message && (
        <div className={`mx-8 mt-4 p-3.5 rounded-xl border font-mono text-xs flex items-center gap-2 animate-fadeIn z-20 ${uiFeedback.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
          <AlertCircle size={15}/> {uiFeedback.message}
        </div>
      )}

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {activeTab === 'files' ? (
          <div className="space-y-6">
            {/* TOOLBAR & BREADCRUMBS */}
            <div className="flex items-center justify-between gap-4 bg-black/20 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
                <button 
                  onClick={() => navigateToFolder(null)} 
                  onDragOver={(e) => handleTargetDragOver(e, 'root')}
                  onDrop={(e) => handleTargetDrop(e, 'root')}
                  className={`hover:text-cyan-400 transition-colors ${dragOverTargetId === 'root' ? 'text-cyan-400 font-bold underline' : ''}`}
                >
                  Vault Root
                </button>
                {folderPath.map((folder, i) => (
                  <React.Fragment key={folder.id}>
                    <ChevronRight size={14} className="text-slate-600" />
                    <button 
                      onClick={() => navigateToFolder(folder)}
                      onDragOver={(e) => handleTargetDragOver(e, folder.id)}
                      onDrop={(e) => handleTargetDrop(e, folder.id)}
                      className={`hover:text-cyan-400 transition-colors ${dragOverTargetId === folder.id ? 'text-cyan-400 font-bold underline' : ''} ${i === folderPath.length - 1 ? 'text-white font-bold' : ''}`}
                    >
                      {folder.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative w-48 sm:w-60">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={fileSearchQuery}
                    onChange={(e) => setFileSearchQuery(e.target.value)}
                    placeholder="Search files, folders..."
                    className="w-full pl-8 pr-7 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none font-mono focus:border-cyan-400 transition-colors"
                  />
                  {fileSearchQuery && (
                    <button
                      onClick={() => setFileSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={(e) => processFileUpload(e.target.files[0])} 
                  accept=".pdf,.txt,.png,.jpg,.jpeg,.gif,.webp" 
                />

                <input
                  type="file"
                  ref={imageInputRef}
                  className="hidden"
                  onChange={(e) => processFileUpload(e.target.files[0])}
                  accept="image/*"
                />
                
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 text-black font-mono font-bold text-xs uppercase tracking-wider hover:bg-cyan-400 transition-all shadow-md disabled:opacity-50"
                  title="Upload File"
                >
                  {isProcessing ? <Loader2 size={13} className="animate-spin"/> : <FilePlus size={13}/>} Upload File
                </button>

                <button
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-xs uppercase tracking-wider hover:bg-emerald-500/30 transition-all shadow-md disabled:opacity-50"
                  title="Upload Image"
                >
                  <ImageIcon size={13}/> Upload Image
                </button>

                <button 
                  onClick={() => setModal({ isOpen: true, type: 'CREATE_FOLDER', item: null, inputValue: '' })} 
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 font-mono text-xs uppercase tracking-wider text-slate-300 hover:bg-white/10 transition-all"
                >
                  <FolderPlus size={13}/> New Folder
                </button>

                <div className="w-px h-6 bg-white/10 mx-1"></div>

                <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                  <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white/10 text-cyan-400' : 'text-slate-500 hover:text-white'}`}>
                    <LayoutGrid size={14}/>
                  </button>
                  <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white/10 text-cyan-400' : 'text-slate-500 hover:text-white'}`}>
                    <List size={14}/>
                  </button>
                </div>
              </div>
            </div>

            {/* FILES & FOLDERS LIST */}
            {filteredFiles.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl">
                <Folder size={40} className="text-slate-600 mx-auto mb-3" />
                <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
                  {fileSearchQuery ? 'No matching files or folders found' : 'Folder is empty'}
                </p>
                <p className="text-xs text-slate-600 mt-1">Upload a file, image, or create a folder to get started.</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredFiles.map(item => (
                  <div 
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleItemDragStart(e, item)}
                    onDragOver={(e) => item.type === 'folder' && handleTargetDragOver(e, item.id)}
                    onDrop={(e) => item.type === 'folder' && handleTargetDrop(e, item.id)}
                    onClick={() => item.type === 'folder' ? navigateToFolder(item) : handleOpenFile(item)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between h-36 ${dragOverTargetId === item.id ? 'border-cyan-400 bg-cyan-500/10' : isLight ? 'bg-slate-50 border-slate-200 hover:border-cyan-400' : 'bg-white/[0.02] border-white/5 hover:border-white/20'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-cyan-400">
                        {item.type === 'folder' ? <Folder size={20}/> : <FileText size={20}/>}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.type !== 'folder' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenCiteForVaultFile(item); }}
                            className="p-1.5 rounded-lg hover:bg-teal-500/20 text-slate-400 hover:text-teal-300"
                            title="Export Citation (BibTeX, APA, IEEE)"
                          >
                            <FileText size={13}/>
                          </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); setModal({ isOpen: true, type: 'RENAME', item, inputValue: item.name }); }} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white">
                          <Edit3 size={13}/>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setModal({ isOpen: true, type: 'DELETE', item, inputValue: '' }); }} className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400">
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className={`text-xs font-bold truncate mb-1 ${isLight ? 'text-slate-800' : 'text-white'}`}>{item.name}</h4>
                      <p className="text-[10px] font-mono text-slate-500 uppercase">{item.type} {item.created_at ? `• ${item.created_at.substring(0, 10)}` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
                {filteredFiles.map(item => (
                  <div 
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleItemDragStart(e, item)}
                    onDragOver={(e) => item.type === 'folder' && handleTargetDragOver(e, item.id)}
                    onDrop={(e) => item.type === 'folder' && handleTargetDrop(e, item.id)}
                    onClick={() => item.type === 'folder' ? navigateToFolder(item) : handleOpenFile(item)}
                    className={`p-4 flex items-center justify-between cursor-pointer transition-colors group ${dragOverTargetId === item.id ? 'bg-cyan-500/10' : isLight ? 'hover:bg-slate-100' : 'hover:bg-white/[0.02]'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-cyan-400">
                        {item.type === 'folder' ? <Folder size={18}/> : <FileText size={18}/>}
                      </div>
                      <span className={`text-xs font-medium ${isLight ? 'text-slate-800' : 'text-white'}`}>{item.name}</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-mono text-slate-500 uppercase">{item.type}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.type !== 'folder' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenCiteForVaultFile(item); }}
                            className="p-1 rounded hover:bg-teal-500/20 text-slate-400 hover:text-teal-300"
                            title="Export Citation (BibTeX, APA, IEEE)"
                          >
                            <FileText size={13}/>
                          </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); setModal({ isOpen: true, type: 'RENAME', item, inputValue: item.name }); }} className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white">
                          <Edit3 size={13}/>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setModal({ isOpen: true, type: 'DELETE', item, inputValue: '' }); }} className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400">
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : readingNote ? (
          /* DEDICATED NOTE READER VIEW */
          <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
            {/* Top Reader Navigation Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <button
                onClick={() => setReadingNote(null)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono text-xs uppercase tracking-wider transition-all"
              >
                <ArrowLeft size={14} className="text-cyan-400" /> Go Back to Notes
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleTogglePinNote(e, readingNote)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono text-xs transition-all ${readingNote.is_pinned ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
                  title={readingNote.is_pinned ? "Unpin Note" : "Pin Note to Top"}
                >
                  <Pin size={13} className={readingNote.is_pinned ? "fill-amber-400" : ""} />
                  {readingNote.is_pinned ? "Pinned" : "Pin Note"}
                </button>

                <button
                  onClick={(e) => handleRenameNote(e, readingNote)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-mono text-xs transition-all"
                  title="Rename Note"
                >
                  <Edit3 size={13} /> Rename
                </button>

                <button
                  onClick={() => handleCopyNote(readingNote.id, readingNote.text || readingNote.insight)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-mono text-xs transition-all"
                  title="Copy Full Content"
                >
                  {copiedNoteId === readingNote.id ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  {copiedNoteId === readingNote.id ? "Copied" : "Copy"}
                </button>

                <button
                  onClick={() => handleOpenNoteInInsightLens(readingNote)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono text-xs uppercase font-bold hover:bg-cyan-500/30 transition-all"
                  title="Open in InsightLens at exact page"
                >
                  <ExternalLink size={13} /> Open Lens (p.{readingNote.page_number || 1})
                </button>
              </div>
            </div>

            {/* Note Reader Content Card */}
            <div className={`p-8 rounded-3xl border shadow-2xl space-y-6 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0d1117] border-white/10'}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 font-mono text-[11px] text-cyan-400 font-bold uppercase tracking-wider">
                      {readingNote.source}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Page {readingNote.page_number || 1}
                    </span>
                    {readingNote.is_pinned && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] uppercase font-bold flex items-center gap-1">
                        <Pin size={10} className="fill-amber-300" /> Pinned
                      </span>
                    )}
                  </div>
                  <h2 className={`text-xl font-bold font-sans ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {readingNote.title || readingNote.source || "Research Note"}
                  </h2>
                </div>
                <span className="text-xs font-mono text-slate-500 whitespace-nowrap">
                  {readingNote.created_at ? new Date(readingNote.created_at).toLocaleDateString() : 'Active'}
                </span>
              </div>

              {/* Note Image if Present */}
              {readingNote.image && (
                <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/40 p-2">
                  <img
                    src={`data:image/jpeg;base64,${readingNote.image}`}
                    alt="Note Diagram / Capture"
                    className="max-h-96 mx-auto rounded-xl object-contain shadow-lg"
                  />
                </div>
              )}

              {/* Note Text */}
              {readingNote.text && (
                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold">Annotated Text Passage</span>
                  <div className={`p-5 rounded-2xl border text-sm font-serif leading-relaxed select-text ${isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-black/30 border-white/5 text-slate-200'}`}>
                    "{readingNote.text}"
                  </div>
                </div>
              )}

              {/* Note AI Insight */}
              {readingNote.insight && (
                <div className="space-y-2">
                  <div className="text-[10px] font-mono text-amber-400 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                    <Sparkles size={12} className="text-amber-400" /> Deep Synthesis & AI Insight
                  </div>
                  <div className={`p-5 rounded-2xl border leading-relaxed text-sm select-text whitespace-pre-wrap ${isLight ? 'bg-amber-50/50 border-amber-200 text-slate-800' : 'bg-black/40 border-white/5 text-slate-300'}`}>
                    {readingNote.insight}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* NOTES TAB - GRID VIEW */
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-black/20 p-4 rounded-2xl border border-white/5">
              <div className="relative w-full md:w-96">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="text" 
                  value={noteSearchQuery}
                  onChange={(e) => setNoteSearchQuery(e.target.value)}
                  placeholder="Search notes, titles, or insights..."
                  className="w-full pl-9 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 outline-none font-mono focus:border-cyan-400 transition-colors"
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <Filter size={14} className="text-slate-500" />
                <select 
                  value={selectedNoteSource}
                  onChange={(e) => setSelectedNoteSource(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none cursor-pointer"
                >
                  {uniqueSources.map(src => (
                    <option key={src} value={src}>{src}</option>
                  ))}
                </select>
              </div>
            </div>

            {filteredNotes.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl">
                <BookMarked size={40} className="text-slate-600 mx-auto mb-3" />
                <p className="font-mono text-xs uppercase tracking-widest text-slate-500">No notes found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredNotes.map(note => (
                  <div
                    key={note.id}
                    onClick={() => setReadingNote(note)}
                    className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 shadow-lg transition-all relative group cursor-pointer hover:scale-[1.01] ${note.is_pinned ? 'border-amber-500/40 bg-amber-500/[0.03]' : isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/5'}`}
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                        <div className="flex items-center gap-2 truncate max-w-[200px]">
                          {note.is_pinned && <Pin size={12} className="text-amber-400 fill-amber-400 flex-shrink-0" />}
                          <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider truncate">
                            {note.title || note.source} (p. {note.page_number || 1})
                          </span>
                        </div>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleTogglePinNote(e, note)}
                            className={`p-1 rounded transition-colors ${note.is_pinned ? 'text-amber-400' : 'text-slate-500 hover:text-amber-300'}`}
                            title={note.is_pinned ? "Unpin note" : "Pin note to top"}
                          >
                            <Pin size={12} className={note.is_pinned ? "fill-amber-400" : ""} />
                          </button>
                          <button
                            onClick={(e) => handleRenameNote(e, note)}
                            className="p-1 text-slate-500 hover:text-white rounded transition-colors"
                            title="Rename note"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={() => handleCopyNote(note.id, note.text || note.insight)}
                            className="p-1 text-slate-500 hover:text-white rounded transition-colors"
                            title="Copy text"
                          >
                            {copiedNoteId === note.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"
                            title="Delete note"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {note.image && (
                        <img src={`data:image/jpeg;base64,${note.image}`} alt="Note Context" className="w-full rounded-xl border border-white/10 mb-3 shadow-sm max-h-48 object-cover" />
                      )}

                      {note.text && (
                        <p className="text-xs text-slate-300 font-serif leading-relaxed mb-2 select-text line-clamp-4">
                          "{note.text}"
                        </p>
                      )}

                      {note.insight && (
                        <div className="p-3 bg-black/40 border border-white/5 rounded-xl text-[11px] text-slate-400 font-sans leading-relaxed select-text line-clamp-3">
                          <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Sparkles size={10} className="text-amber-400" /> AI Insight
                          </div>
                          {note.insight}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-slate-500">
                      <span>{note.created_at?.substring(0, 10)}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 hover:text-white transition-colors">Click to read full &rarr;</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenNoteInInsightLens(note); }}
                          className="flex items-center gap-1 text-cyan-400 hover:underline uppercase tracking-widest font-bold"
                        >
                          Lens <ExternalLink size={9} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ACTION MODAL */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 ${themeClasses.bgCard}`}>
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="font-mono text-xs uppercase tracking-wider text-white">
                {modal.type === 'CREATE_FOLDER' && 'Create New Folder'}
                {modal.type === 'RENAME' && 'Rename Item'}
                {modal.type === 'RENAME_NOTE' && 'Rename Note'}
                {modal.type === 'DELETE' && 'Confirm Deletion'}
              </h3>
              <button onClick={() => setModal({ isOpen: false, type: '', item: null, inputValue: '' })} className="text-slate-500 hover:text-white">
                <X size={16}/>
              </button>
            </div>

            {modal.type === 'DELETE' ? (
              <p className="text-xs text-slate-400 font-light leading-relaxed">
                Are you sure you want to delete <span className="text-white font-bold">"{modal.item?.name}"</span>? This action cannot be undone.
              </p>
            ) : (
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-500 block mb-1.5">
                  {modal.type === 'RENAME_NOTE' ? 'Note Title' : 'Name'}
                </label>
                <input 
                  type="text" 
                  value={modal.inputValue} 
                  onChange={(e) => setModal({ ...modal, inputValue: e.target.value })} 
                  placeholder={modal.type === 'RENAME_NOTE' ? 'Enter note title...' : 'Enter name...'}
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white outline-none font-mono"
                  autoFocus
                />
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setModal({ isOpen: false, type: '', item: null, inputValue: '' })} className="px-4 py-2 rounded-xl text-xs font-mono uppercase text-slate-400 hover:bg-white/5">
                Cancel
              </button>
              <button 
                onClick={submitModalAction} 
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase ${modal.type === 'DELETE' ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-cyan-500 text-black hover:bg-cyan-400'}`}
              >
                {modal.type === 'DELETE' ? 'Delete' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CITATION MODAL (Academic Researcher & Vault Export) */}
      {citationModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-2xl bg-[#0e0e10] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-teal-400" />
                <div>
                  <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                    Academic Citation Exporter
                  </h3>
                  <p className="text-[11px] text-slate-400 font-sans truncate max-w-md">
                    {citationModal.item?.name || "Vault Document"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCitationModal({ isOpen: false, item: null, data: null, loading: false, copiedFormat: null })}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {citationModal.loading ? (
              <div className="py-12 text-center text-slate-400 font-mono text-xs flex flex-col items-center gap-2">
                <RefreshCw size={18} className="animate-spin text-teal-400" />
                Formatting academic citations from vault document...
              </div>
            ) : citationModal.data ? (
              <div className="space-y-4">
                {/* BibTeX Entry */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    <span className="font-bold text-teal-300">BibTeX Citation</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyCitation('bibtex', citationModal.data.formats?.bibtex)}
                        className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 transition-all"
                      >
                        {citationModal.copiedFormat === 'bibtex' ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                        {citationModal.copiedFormat === 'bibtex' ? 'Copied' : 'Copy BibTeX'}
                      </button>
                      <button
                        onClick={handleDownloadBibFile}
                        className="px-2 py-0.5 rounded bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 flex items-center gap-1 transition-all"
                      >
                        <Download size={10} /> Download .bib
                      </button>
                    </div>
                  </div>
                  <pre className="p-3 bg-black/60 border border-white/10 rounded-xl text-[10.5px] font-mono text-emerald-300 overflow-x-auto leading-relaxed select-text">
                    <code>{citationModal.data.formats?.bibtex}</code>
                  </pre>
                </div>

                {/* Standard Inline Citations */}
                <div className="grid grid-cols-1 gap-2.5 pt-2 border-t border-white/10">
                  {['apa', 'ieee', 'chicago'].map(fmt => (
                    <div key={fmt} className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 block font-bold">
                          {fmt.toUpperCase()} {fmt === 'apa' ? '(7th ed.)' : ''}
                        </span>
                        <p className="text-xs text-slate-300 font-serif leading-relaxed mt-0.5 select-text">
                          {citationModal.data.formats?.[fmt]}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCopyCitation(fmt, citationModal.data.formats?.[fmt])}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-mono flex items-center gap-1 shrink-0 transition-all"
                      >
                        {citationModal.copiedFormat === fmt ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                        {citationModal.copiedFormat === fmt ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 font-mono text-xs">
                Citation could not be generated. Please verify document name.
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                onClick={() => setCitationModal({ isOpen: false, item: null, data: null, loading: false, copiedFormat: null })}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs uppercase tracking-wider"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}