// src/components/CentralVault.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderPlus, FilePlus, ArrowLeft, Folder, FileText, Trash2, 
  Edit3, ChevronRight, Loader2, Database, HardDrive, LayoutGrid, 
  List, Play, X, Image as ImageIcon, AlertCircle, BookMarked, 
  Search, ExternalLink, Copy, Check, Filter, Sparkles
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

  // Drag State
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverTargetId, setDragOverTargetId] = useState(null);

  // Notes State
  const [vaultNotes, setVaultNotes] = useState([]);
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  const [selectedNoteSource, setSelectedNoteSource] = useState('ALL');
  const [copiedNoteId, setCopiedNoteId] = useState(null);

  const ALLOWED_EXTENSIONS = ['pdf', 'txt', 'png', 'jpg', 'jpeg', 'gif', 'webp'];

  const fetchData = async () => {
    try {
      const url = currentFolderId ? `${API_BASE}/api/library?parentId=${currentFolderId}` : `${API_BASE}/api/library`;
      const [itemsRes, quotaRes] = await Promise.all([
        fetch(url),
        fetch(`${API_BASE}/api/library/quota`)
      ]);
      if (itemsRes.ok) setItems(await itemsRes.json());
      if (quotaRes.ok) setQuota(await quotaRes.json());
    } catch (err) { 
      showFeedback('Database Sync Error', 'error'); 
    }
  };

  const fetchNotes = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/vault/notes`);
      if (res.ok) setVaultNotes(await res.json());
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
    const matchingFile = items.find(i => i.name.toLowerCase() === note.source.toLowerCase());
    const filePayload = {
      id: matchingFile ? matchingFile.id : `note_file_${note.id}`,
      title: note.source,
      pageNumber: note.page_number || 1,
      url: matchingFile ? `${API_BASE}/api/library/file/${matchingFile.id}` : `${API_BASE}/api/library/resolve-file?filename=${encodeURIComponent(note.source)}`
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
              textContent: reader.result 
            })
          });
          
          if (!res.ok) throw new Error("Upload failed");
          showFeedback('File committed to Supabase Vault');
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

    if (!draggedItem || draggedItem.id === targetId) {
      setDraggedItem(null);
      return;
    } 
    
    try {
      const res = await fetch(`${API_BASE}/api/library/${draggedItem.id}`, {
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

  const uniqueSources = ['ALL', ...Array.from(new Set(vaultNotes.map(n => n.source))).filter(Boolean)];

  const filteredNotes = vaultNotes.filter(note => {
    const matchesSource = selectedNoteSource === 'ALL' || note.source === selectedNoteSource;
    const matchesSearch = !noteSearchQuery || 
      note.text?.toLowerCase().includes(noteSearchQuery.toLowerCase()) ||
      note.insight?.toLowerCase().includes(noteSearchQuery.toLowerCase()) ||
      note.source?.toLowerCase().includes(noteSearchQuery.toLowerCase());
    return matchesSource && matchesSearch;
  });

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
            <p className="text-xs font-mono text-slate-400">Supabase Connected Repository</p>
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

              <div className="flex items-center gap-3">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={(e) => processFileUpload(e.target.files[0])} 
                  accept=".pdf,.txt,.png,.jpg,.jpeg,.gif,.webp" 
                />
                
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 text-black font-mono font-bold text-xs uppercase tracking-wider hover:bg-cyan-400 transition-all shadow-md disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 size={14} className="animate-spin"/> : <FilePlus size={14}/>} Upload File
                </button>

                <button 
                  onClick={() => setModal({ isOpen: true, type: 'CREATE_FOLDER', item: null, inputValue: '' })} 
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 font-mono text-xs uppercase tracking-wider text-slate-300 hover:bg-white/10 transition-all"
                >
                  <FolderPlus size={14}/> New Folder
                </button>

                <div className="w-px h-6 bg-white/10 mx-1"></div>

                <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                  <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white/10 text-cyan-400' : 'text-slate-500 hover:text-white'}`}>
                    <LayoutGrid size={15}/>
                  </button>
                  <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white/10 text-cyan-400' : 'text-slate-500 hover:text-white'}`}>
                    <List size={15}/>
                  </button>
                </div>
              </div>
            </div>

            {/* FILES & FOLDERS LIST */}
            {items.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl">
                <Folder size={40} className="text-slate-600 mx-auto mb-3" />
                <p className="font-mono text-xs uppercase tracking-widest text-slate-500">Folder is empty</p>
                <p className="text-xs text-slate-600 mt-1">Upload a file or create a folder to get started.</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {items.map(item => (
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
                {items.map(item => (
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
        ) : (
          /* NOTES TAB */
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-black/20 p-4 rounded-2xl border border-white/5">
              <div className="relative w-full md:w-96">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="text" 
                  value={noteSearchQuery}
                  onChange={(e) => setNoteSearchQuery(e.target.value)}
                  placeholder="Search notes or insights..."
                  className="w-full pl-9 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 outline-none font-mono"
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
                  <div key={note.id} className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 shadow-lg transition-all relative group ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/5'}`}>
                    <div>
                      <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                        <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider truncate max-w-[200px]">
                          {note.source} (p. {note.page_number})
                        </span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleCopyNote(note.id, note.text || note.insight)} className="p-1 text-slate-500 hover:text-white rounded transition-colors" title="Copy Text">
                            {copiedNoteId === note.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                          <button onClick={() => handleDeleteNote(note.id)} className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors" title="Delete Note">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {note.image && (
                        <img src={`data:image/jpeg;base64,${note.image}`} alt="Note Context" className="w-full rounded-xl border border-white/10 mb-3 shadow-sm" />
                      )}

                      {note.text && (
                        <p className="text-xs text-slate-300 font-serif leading-relaxed mb-2 select-text">
                          "{note.text}"
                        </p>
                      )}

                      {note.insight && (
                        <div className="p-3 bg-black/40 border border-white/5 rounded-xl text-[11px] text-slate-400 font-sans leading-relaxed select-text">
                          <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Sparkles size={10} className="text-amber-400" /> AI Insight
                          </div>
                          {note.insight}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-slate-600">
                      <span>{note.created_at?.substring(0, 10)}</span>
                      <button 
                        onClick={() => handleOpenNoteInInsightLens(note)}
                        className="flex items-center gap-1 text-cyan-400 hover:underline uppercase tracking-widest font-bold"
                      >
                        Open Lens <ExternalLink size={10} />
                      </button>
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
                <label className="text-[10px] font-mono uppercase text-slate-500 block mb-1.5">Name</label>
                <input 
                  type="text" 
                  value={modal.inputValue} 
                  onChange={(e) => setModal({ ...modal, inputValue: e.target.value })} 
                  placeholder="Enter name..."
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
    </div>
  );
}