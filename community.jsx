import React, { useState, useEffect, useRef, useMemo } from 'react';
import SocialProfileModal from './SocialProfileModal';
import PeerProfileModal from './PeerProfileModal';
import { 
  MessageSquare, 
  ThumbsUp, 
  X, 
  Send, 
  Share2, 
  Tag, 
  User, 
  Clock, 
  Sparkles, 
  MessageCircle,
  CornerDownRight,
  Globe,
  Search,
  Filter,
  Pin,
  Edit3,
  Trash2,
  RefreshCw,
  Eye,
  Check,
  TrendingUp,
  Award,
  Users,
  Flame,
  ChevronDown
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const CATEGORIES = [
  'All',
  'General',
  'Machine Learning',
  'Mathematics',
  'LaTeX & Typesetting',
  'Peer Review & Rigor',
  'Quantum Physics',
  'Systems & WASM'
];

export default function CommunitySection({ currentUser, setCurrentView }) {
  const { themeClasses, isLight } = useTheme();

  // Primary State
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activePeerProfile, setActivePeerProfile] = useState(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTag, setSelectedTag] = useState(null);
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'top' | 'views' | 'comments'

  // Summary Metrics
  const [metrics, setMetrics] = useState({
    discussions_count: 0,
    comments_count: 0,
    chat_count: 0,
    online_peers_count: 1
  });

  // Create Post Form State
  const currentUsername = currentUser?.name || 'AG. Hamim';
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState(currentUsername);
  const [category, setCategory] = useState('General');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [showCreateCard, setShowCreateCard] = useState(false);

  // Edit Discussion State
  const [editingPost, setEditingPost] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('General');
  const [editTags, setEditTags] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Interaction Drawer State
  const [selectedDiscussion, setSelectedDiscussion] = useState(null);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [copied, setCopied] = useState(false);

  // Upvote Tracking (local cache + DB sync)
  const [upvotedPosts, setUpvotedPosts] = useState(new Set());

  // Live Chatbox State
  const [chatMessages, setChatMessages] = useState([]);
  const [newChatInput, setNewChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const chatScrollRef = useRef(null);

  // Sync author name if currentUser changes
  useEffect(() => {
    if (currentUser?.name) {
      setAuthor(currentUser.name);
    }
  }, [currentUser]);

  // Robust API Fetcher with automatic port fallback (8000 -> 5001)
  const apiFetch = async (path, options = {}) => {
    const urls = [
      `http://127.0.0.1:8000/api${path}`,
      `http://localhost:5001/api${path}`,
      `http://127.0.0.1:8000${path}`
    ];
    let lastErr = null;
    for (const url of urls) {
      try {
        const res = await fetch(url, options);
        if (res.ok || res.status === 404 || res.status === 400) {
          return res;
        }
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error('Backend services unreachable');
  };

  // Fetch summary telemetry
  const fetchMetrics = async () => {
    try {
      const res = await apiFetch('/community/stats/summary');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (e) {
      console.warn('Metrics fetch warning:', e);
    }
  };

  // Fetch Discussions Feed
  const fetchDiscussions = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'All') params.append('category', selectedCategory);
      if (selectedTag) params.append('tag', selectedTag);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (sortBy) params.append('sort', sortBy);
      if (author) params.append('username', author);

      const res = await apiFetch(`/community?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const data = await res.json();
      setDiscussions(data);

      // Hydrate local upvoted set
      const userUpvotes = new Set();
      data.forEach(d => {
        if (d.user_has_upvoted) userUpvotes.add(d.id);
      });
      setUpvotedPosts(userUpvotes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch Global Lounge Live Chat
  const fetchChatMessages = async () => {
    try {
      const res = await apiFetch('/chat/messages');
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data);
      }
    } catch (err) {
      console.error('Error fetching chat messages:', err);
    }
  };

  // Fetch Comments for Selected Discussion
  const fetchCommentsForDiscussion = async (discussionId) => {
    setLoadingComments(true);
    try {
      const res = await apiFetch(`/community/${discussionId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  // Initial Data Load & Polling intervals
  useEffect(() => {
    fetchDiscussions();
    fetchChatMessages();
    fetchMetrics();

    const chatInterval = setInterval(fetchChatMessages, 4000);
    const metricsInterval = setInterval(fetchMetrics, 15000);
    return () => {
      clearInterval(chatInterval);
      clearInterval(metricsInterval);
    };
  }, [selectedCategory, selectedTag, sortBy]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDiscussions(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Real-time user heartbeat
  useEffect(() => {
    const pingPresence = async () => {
      if (!author) return;
      try {
        await apiFetch(`/presence/${encodeURIComponent(author)}`, { method: 'POST' });
      } catch (err) {}
    };

    pingPresence();
    const interval = setInterval(pingPresence, 45000);
    return () => clearInterval(interval);
  }, [author]);

  // Auto-scroll chatbox on new message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Open drawer and load comments
  const handleOpenDiscussion = async (disc) => {
    setSelectedDiscussion(disc);
    fetchCommentsForDiscussion(disc.id);
    // Optimistically update views count locally
    setDiscussions(prev => prev.map(d => d.id === disc.id ? { ...d, views_count: (d.views_count || 0) + 1 } : d));
  };

  // CREATE: Publish Discussion
  const handlePublish = async (e) => {
    e.preventDefault();
    if (!title.trim() || !author.trim() || !content.trim()) return;

    setPublishing(true);
    const tagsArray = tagInput.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean);

    try {
      const res = await apiFetch('/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          author: author.trim(),
          content: content.trim(),
          tags: tagsArray,
          category
        })
      });

      if (!res.ok) throw new Error('Failed to publish discussion');
      const newPost = await res.json();

      setDiscussions(prev => [newPost, ...prev]);
      setTitle('');
      setContent('');
      setTagInput('');
      setShowCreateCard(false);
      fetchMetrics();
    } catch (err) {
      alert(`Error publishing post: ${err.message}`);
    } finally {
      setPublishing(false);
    }
  };

  // UPDATE: Edit Discussion
  const startEditPost = (disc, e) => {
    if (e) e.stopPropagation();
    setEditingPost(disc);
    setEditTitle(disc.title);
    setEditContent(disc.content);
    setEditCategory(disc.category || 'General');
    setEditTags(Array.isArray(disc.tags) ? disc.tags.join(', ') : '');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingPost || !editTitle.trim() || !editContent.trim()) return;

    setSavingEdit(true);
    const tagsArray = editTags.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean);

    try {
      const res = await apiFetch(`/community/${editingPost.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          content: editContent.trim(),
          category: editCategory,
          tags: tagsArray
        })
      });

      if (!res.ok) throw new Error('Failed to update discussion');
      const updated = await res.json();

      setDiscussions(prev => prev.map(d => d.id === updated.id ? { ...d, ...updated } : d));
      if (selectedDiscussion?.id === updated.id) {
        setSelectedDiscussion(prev => ({ ...prev, ...updated }));
      }
      setEditingPost(null);
    } catch (err) {
      alert(`Update error: ${err.message}`);
    } finally {
      setSavingEdit(false);
    }
  };

  // TOGGLE PIN
  const handleTogglePin = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await apiFetch(`/community/${id}/pin`, { method: 'POST' });
      if (res.ok) {
        const updated = await res.json();
        setDiscussions(prev => prev.map(d => d.id === id ? { ...d, is_pinned: updated.is_pinned } : d));
        if (selectedDiscussion?.id === id) {
          setSelectedDiscussion(prev => ({ ...prev, is_pinned: updated.is_pinned }));
        }
      }
    } catch (err) {
      console.error('Pin toggle error:', err);
    }
  };

  // DELETE: Remove Discussion
  const handleDeleteDiscussion = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this discussion and its comments?")) return;

    try {
      const res = await apiFetch(`/community/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDiscussions(prev => prev.filter(d => d.id !== id));
        if (selectedDiscussion?.id === id) {
          setSelectedDiscussion(null);
        }
        fetchMetrics();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // UPVOTE: Toggle Upvote per User
  const handleUpvote = async (id, e) => {
    if (e) e.stopPropagation();

    // Optimistic Update
    const wasUpvoted = upvotedPosts.has(id);
    setUpvotedPosts(prev => {
      const next = new Set(prev);
      if (wasUpvoted) next.delete(id);
      else next.add(id);
      return next;
    });

    setDiscussions(prev => prev.map(d => {
      if (d.id === id) {
        const delta = wasUpvoted ? -1 : 1;
        return { ...d, upvotes: Math.max(0, (d.upvotes || 0) + delta) };
      }
      return d;
    }));

    if (selectedDiscussion?.id === id) {
      const delta = wasUpvoted ? -1 : 1;
      setSelectedDiscussion(prev => ({ ...prev, upvotes: Math.max(0, (prev.upvotes || 0) + delta) }));
    }

    try {
      const res = await apiFetch(`/community/${id}/upvote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: author })
      });
      if (res.ok) {
        const serverData = await res.json();
        setDiscussions(prev => prev.map(d => d.id === id ? { ...d, upvotes: serverData.upvotes } : d));
        if (selectedDiscussion?.id === id) {
          setSelectedDiscussion(prev => ({ ...prev, upvotes: serverData.upvotes }));
        }
      }
    } catch (err) {
      console.error('Upvote sync error:', err);
    }
  };

  // COMMENTS: Add Comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedDiscussion) return;

    setSubmittingComment(true);
    const commentPayload = {
      author: author || 'Academic Researcher',
      content: newCommentText.trim()
    };

    try {
      const res = await apiFetch(`/community/${selectedDiscussion.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commentPayload)
      });

      if (res.ok) {
        const savedComment = await res.json();
        setComments(prev => [...prev, savedComment]);
        setNewCommentText('');
        // Update comments count on the post
        setDiscussions(prev => prev.map(d => d.id === selectedDiscussion.id ? { ...d, comments_count: (d.comments_count || 0) + 1 } : d));
        fetchMetrics();
      }
    } catch (err) {
      alert(`Error submitting comment: ${err.message}`);
    } finally {
      setSubmittingComment(false);
    }
  };

  // COMMENTS: Delete Comment
  const handleDeleteComment = async (commentId) => {
    try {
      const res = await apiFetch(`/community/comments/${commentId}`, { method: 'DELETE' });
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        if (selectedDiscussion) {
          setDiscussions(prev => prev.map(d => d.id === selectedDiscussion.id ? { ...d, comments_count: Math.max(0, (d.comments_count || 1) - 1) } : d));
        }
        fetchMetrics();
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  // LIVE CHAT: Send Chat Message
  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!newChatInput.trim()) return;

    setSendingChat(true);
    const msgPayload = {
      sender: author || 'AG. Hamim',
      text: newChatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    try {
      const res = await apiFetch('/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msgPayload)
      });
      if (res.ok) {
        const savedMsg = await res.json();
        setChatMessages(prev => [...prev, savedMsg]);
        setNewChatInput('');
        fetchMetrics();
      }
    } catch (err) {
      console.error('Error posting chat message:', err);
    } finally {
      setSendingChat(false);
    }
  };

  // SHARE: Copy URL
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden text-slate-200 relative select-none">
      
      {/* Top Banner / Metrics Strip */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <MessageSquare size={17} />
            </div>
            <div>
              <h1 className="text-lg font-serif font-bold text-white tracking-wide flex items-center gap-2">
                ScholarGrid Research Community
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  Supabase Live Sync
                </span>
              </h1>
              <p className="text-[11px] font-mono text-slate-400">
                Peer review discussions, mathematical hypotheses, and cross-domain collaborative lounge
              </p>
            </div>
          </div>
        </div>

        {/* Live Metrics Telemetry Badges */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <Flame size={14} className="text-orange-400" />
            <span className="text-slate-400">Posts:</span>
            <span className="text-white font-bold">{metrics.discussions_count || discussions.length}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <MessageCircle size={14} className="text-cyan-400" />
            <span className="text-slate-400">Comments:</span>
            <span className="text-white font-bold">{metrics.comments_count}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Peers Active:</span>
            <span className="font-bold text-white">{metrics.online_peers_count}</span>
          </div>
          <button
            onClick={() => fetchDiscussions(false)}
            title="Refresh Community Feed"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-cyan-500/40 transition-all cursor-pointer"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-cyan-400' : ''} />
          </button>
        </div>
      </div>

      {/* Main 2-Column Responsive Workspace */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/80">
        
        {/* LEFT COLUMN: Feed & Interactive Discussions (2 Cols) */}
        <div className="lg:col-span-2 flex flex-col h-full overflow-hidden min-h-0">
          
          {/* Controls Bar: Search, Category Filter, and Start Discussion Toggle */}
          <div className="p-4 border-b border-slate-800/60 bg-slate-900/40 space-y-3 flex-shrink-0">
            <div className="flex flex-wrap items-center gap-3">
              {/* Universal Search Input */}
              <div className="flex-1 relative min-w-[200px]">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="text"
                  placeholder="Search discussions by topic, author, or keywords..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono transition-all"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Sort Order Selector */}
              <div className="flex items-center gap-1.5 font-mono text-xs">
                <span className="text-[11px] text-slate-400">Sort:</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono cursor-pointer"
                >
                  <option value="newest">Newest First</option>
                  <option value="top">Most Upvoted</option>
                  <option value="views">Most Viewed</option>
                  <option value="comments">Most Discussed</option>
                </select>
              </div>

              {/* Start Discussion Button */}
              <button
                onClick={() => setShowCreateCard(!showCreateCard)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl font-mono text-xs font-bold transition-all shadow-md cursor-pointer active:scale-95"
              >
                <Sparkles size={14} />
                <span>{showCreateCard ? 'Close Editor' : 'Start Discussion'}</span>
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-xs font-mono">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mr-1 flex items-center gap-1">
                <Filter size={11} /> Filters:
              </span>
              {CATEGORIES.map(cat => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setSelectedTag(null);
                    }}
                    className={`px-3 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer text-[11px] ${
                      isActive 
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm' 
                        : 'bg-slate-950/60 text-slate-400 border border-slate-800/80 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
              {selectedTag && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[11px]">
                  <span>#{selectedTag}</span>
                  <button onClick={() => setSelectedTag(null)} className="hover:text-white"><X size={11}/></button>
                </div>
              )}
            </div>
          </div>

          {/* Collapsible Create Discussion Composer */}
          {showCreateCard && (
            <div className="p-5 border-b border-cyan-500/30 bg-slate-900/90 animate-fadeIn">
              <form onSubmit={handlePublish} className="space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-2 uppercase tracking-wider">
                    <Sparkles size={15} /> Compose Research Topic
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setShowCreateCard(false)}
                    className="text-slate-500 hover:text-white"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Title *</label>
                    <input 
                      type="text"
                      placeholder="e.g. Benchmarking Sparse Attention in Nested WASM Kernels"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-sans"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Category</label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    >
                      {CATEGORIES.filter(c => c !== 'All').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Author Name / Academic Title *</label>
                    <input 
                      type="text"
                      placeholder="e.g. Dr. Elena Rostova"
                      value={author}
                      onChange={e => setAuthor(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-sans"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Tags (Comma-separated)</label>
                    <input 
                      type="text"
                      placeholder="PyTorch, WASM, Rigor, FormalProof"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Research Hypothesis / Methodological Details *</label>
                  <textarea 
                    rows={4}
                    placeholder="Describe your questions, findings, citations, or formulas to share with peers..."
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none font-sans leading-relaxed"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCreateCard(false)}
                    className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={publishing}
                    className="flex items-center gap-2 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <Send size={13} />
                    <span>{publishing ? 'Publishing to DB...' : 'Publish to Feed'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Discussion Feed Scrollable Stream */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 min-h-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <div className="w-10 h-10 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin mb-3" />
                <span className="text-xs font-mono">Synchronizing with Supabase Discussions...</span>
              </div>
            ) : error ? (
              <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-center space-y-2">
                <div className="text-xs font-mono text-red-400 font-bold">Failed to load discussions</div>
                <div className="text-[11px] font-mono text-slate-400">{error}</div>
                <button 
                  onClick={() => fetchDiscussions()} 
                  className="px-4 py-2 bg-red-500/20 text-red-300 rounded-xl text-xs font-mono font-bold hover:bg-red-500/30 transition-all cursor-pointer"
                >
                  Retry Connection
                </button>
              </div>
            ) : discussions.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                  <MessageSquare size={22} />
                </div>
                <h3 className="text-sm font-serif font-bold text-white">No discussions match your filter</h3>
                <p className="text-xs font-mono text-slate-500 max-w-sm mx-auto">
                  Be the first researcher to post a topic in this category or clear your search term.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory('All');
                    setSelectedTag(null);
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-400 hover:text-cyan-300"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              discussions.map(disc => {
                const isUpvoted = upvotedPosts.has(disc.id);
                return (
                  <div 
                    key={disc.id}
                    onClick={() => handleOpenDiscussion(disc)}
                    className={`relative bg-slate-900/70 border rounded-2xl p-5 transition-all shadow-md hover:shadow-cyan-500/5 cursor-pointer group ${
                      disc.is_pinned 
                        ? 'border-cyan-500/40 bg-slate-900/90 shadow-cyan-500/5' 
                        : 'border-slate-800/80 hover:border-cyan-500/40'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-4 mb-2.5">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {disc.is_pinned && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold">
                              <Pin size={10} className="fill-current" /> Pinned
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-cyan-400 text-[10px] font-mono">
                            {disc.category || 'General'}
                          </span>
                        </div>
                        <h3 className="text-base font-serif font-bold text-white group-hover:text-cyan-300 transition-colors leading-snug">
                          {disc.title}
                        </h3>
                      </div>

                      {/* Action Bar (Upvote, Interact, Edit, Pin) */}
                      <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={(e) => handleUpvote(disc.id, e)}
                          title={isUpvoted ? "Remove Upvote" : "Upvote Discussion"}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                            isUpvoted 
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-sm' 
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300'
                          }`}
                        >
                          <ThumbsUp size={13} className={isUpvoted ? "fill-current" : ""} />
                          <span>{disc.upvotes || 0}</span>
                        </button>

                        <button 
                          onClick={() => handleOpenDiscussion(disc)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 text-xs font-mono font-bold transition-all cursor-pointer"
                        >
                          <MessageCircle size={13} />
                          <span>{disc.comments_count || 0}</span>
                        </button>

                        {/* Author/Admin Edit & Pin Tools */}
                        <button
                          onClick={(e) => handleTogglePin(disc.id, e)}
                          title={disc.is_pinned ? "Unpin Topic" : "Pin Topic to Top"}
                          className="p-1.5 text-slate-400 hover:text-amber-300 bg-slate-950 border border-slate-800 rounded-lg transition-colors cursor-pointer"
                        >
                          <Pin size={13} className={disc.is_pinned ? "fill-current text-amber-400" : ""} />
                        </button>

                        <button
                          onClick={(e) => startEditPost(disc, e)}
                          title="Edit Discussion"
                          className="p-1.5 text-slate-400 hover:text-cyan-300 bg-slate-950 border border-slate-800 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit3 size={13} />
                        </button>

                        <button
                          onClick={(e) => handleDeleteDiscussion(disc.id, e)}
                          title="Delete Discussion"
                          className="p-1.5 text-slate-400 hover:text-red-400 bg-slate-950 border border-slate-800 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Content Snippet */}
                    <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed mb-4 font-sans whitespace-pre-wrap">
                      {disc.content}
                    </p>

                    {/* Footer Row: Author, Date, Views & Tags */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-slate-500 pt-3 border-t border-slate-800/60">
                      <div className="flex items-center gap-2 truncate">
                        <User size={12} className="text-cyan-400 flex-shrink-0" />
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePeerProfile({
                              id: `usr_${disc.author}`,
                              name: disc.author,
                              role: 'Academic Researcher',
                              avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(disc.author),
                              status: 'online',
                              papers: 8,
                              cites: 142,
                              impact: '4.8'
                            });
                          }}
                          className="hover:underline text-cyan-400 font-bold cursor-pointer"
                        >
                          {disc.author}
                        </button>
                        <span>•</span>
                        <Clock size={12} />
                        <span>{disc.created_at ? new Date(disc.created_at).toLocaleDateString() : 'Recent'}</span>
                        <span>•</span>
                        <Eye size={12} />
                        <span>{disc.views_count || 0} views</span>
                      </div>

                      {/* Tag Chips */}
                      {disc.tags && disc.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap" onClick={e => e.stopPropagation()}>
                          {disc.tags.map((t, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedTag(t)}
                              className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 hover:border-cyan-500/40 text-[10px] text-slate-400 hover:text-cyan-300 transition-colors"
                            >
                              #{t}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Global Live Research Lounge Chatbox (1 Col) */}
        <div className="lg:col-span-1 flex flex-col h-full overflow-hidden bg-slate-950/60">
          
          {/* Lounge Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 flex-shrink-0">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
              <Globe size={16} /> Global Live Lounge
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Pulse
            </div>
          </div>

          {/* Lounge Chat Messages Scroll Area */}
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 min-h-0">
            {chatMessages.length === 0 ? (
              <div className="text-center py-16 text-slate-500 space-y-2">
                <Globe size={24} className="mx-auto text-slate-600 animate-pulse" />
                <p className="text-xs font-mono">No broadcasts yet in the live lounge.</p>
                <p className="text-[10px] font-mono text-slate-600">Send a greeting to your peer researchers!</p>
              </div>
            ) : (
              chatMessages.map(msg => {
                const isSelf = msg.sender === author;
                return (
                  <div 
                    key={msg.id} 
                    className={`border rounded-xl p-3 space-y-1 transition-all shadow-sm ${
                      isSelf 
                        ? 'bg-cyan-950/30 border-cyan-800/40 ml-4' 
                        : 'bg-slate-900/90 border-slate-800/80 mr-4'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <button
                        onClick={() => {
                          setActivePeerProfile({
                            id: `usr_${msg.sender}`,
                            name: msg.sender,
                            role: 'Peer Researcher',
                            avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(msg.sender),
                            status: 'online',
                            papers: 4,
                            cites: 68,
                            impact: '3.9'
                          });
                        }}
                        className="font-bold text-cyan-400 hover:underline cursor-pointer truncate max-w-[140px]"
                      >
                        {msg.sender}
                      </button>
                      <span className="text-slate-500 text-[10px]">{msg.time}</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-normal font-sans select-text break-words">
                      {msg.text}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* Lounge Chat Input Box */}
          <form onSubmit={handleSendChat} className="p-3 border-t border-slate-800 bg-slate-900/80 flex gap-2 flex-shrink-0">
            <input 
              type="text"
              placeholder="Broadcast to academic peers..."
              value={newChatInput}
              onChange={e => setNewChatInput(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
            <button 
              type="submit"
              disabled={!newChatInput.trim() || sendingChat}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-xl transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center flex-shrink-0"
            >
              <Send size={14} />
            </button>
          </form>

        </div>

      </div>

      {/* RIGHT SIDE INTERACTION DRAWER PANEL FOR DISCUSSIONS & COMMENTS */}
      {selectedDiscussion && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="absolute inset-0" onClick={() => setSelectedDiscussion(null)} />

          <div className="relative w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full flex flex-col z-10 shadow-2xl p-6 overflow-hidden">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4 flex-shrink-0">
              <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase font-bold tracking-wider">
                <MessageSquare size={16} /> Research Discussion Thread
              </div>
              <button 
                onClick={() => setSelectedDiscussion(null)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-950 border border-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-1 min-h-0">
              {/* Discussion Body */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-cyan-400 text-[10px] font-mono">
                    {selectedDiscussion.category || 'General'}
                  </span>
                  {selectedDiscussion.is_pinned && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold flex items-center gap-1">
                      <Pin size={10} className="fill-current" /> Pinned
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-serif font-bold text-white leading-snug">
                  {selectedDiscussion.title}
                </h2>

                <div className="flex items-center gap-2 text-xs font-mono text-slate-400 pb-3 border-b border-slate-800/80">
                  <span className="text-cyan-400 font-bold">{selectedDiscussion.author}</span>
                  <span>•</span>
                  <span>{selectedDiscussion.created_at ? new Date(selectedDiscussion.created_at).toLocaleString() : 'Recent'}</span>
                  <span>•</span>
                  <span>{selectedDiscussion.views_count || 0} views</span>
                </div>

                <div className="text-xs text-slate-200 leading-relaxed bg-slate-950/70 border border-slate-800/80 p-4 rounded-2xl whitespace-pre-wrap font-sans select-text">
                  {selectedDiscussion.content}
                </div>

                {selectedDiscussion.tags && selectedDiscussion.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedDiscussion.tags.map((tag, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400 flex items-center gap-1">
                        <Tag size={10} className="text-cyan-400" /> #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Interaction Actions */}
                <div className="flex items-center gap-3 pt-3">
                  <button 
                    onClick={() => handleUpvote(selectedDiscussion.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                      upvotedPosts.has(selectedDiscussion.id)
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/30'
                    }`}
                  >
                    <ThumbsUp size={14} className={upvotedPosts.has(selectedDiscussion.id) ? "fill-current" : ""} />
                    <span>Upvote ({selectedDiscussion.upvotes || 0})</span>
                  </button>

                  <button 
                    onClick={handleShare}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-950 border border-slate-800 text-slate-300 rounded-xl font-mono text-xs hover:border-slate-700 transition-all cursor-pointer"
                  >
                    <Share2 size={14} />
                    <span>{copied ? 'Copied Link!' : 'Share'}</span>
                  </button>

                  <button
                    onClick={(e) => startEditPost(selectedDiscussion, e)}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-950 border border-slate-800 text-slate-300 hover:text-cyan-300 rounded-xl font-mono text-xs cursor-pointer ml-auto"
                  >
                    <Edit3 size={13} />
                    <span>Edit</span>
                  </button>
                </div>
              </div>

              {/* Comments Section */}
              <div className="pt-6 border-t border-slate-800">
                <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CornerDownRight size={14} className="text-cyan-400" /> Responses ({comments.length})
                  </span>
                  {loadingComments && <RefreshCw size={12} className="animate-spin text-cyan-400" />}
                </h3>

                <div className="space-y-3 mb-6">
                  {comments.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-slate-950/50 border border-slate-800/80 text-center">
                      <p className="text-xs font-mono text-slate-500 italic">No responses recorded yet.</p>
                      <p className="text-[10px] font-mono text-slate-600 mt-1">Submit your academic perspective below.</p>
                    </div>
                  ) : (
                    comments.map(c => (
                      <div key={c.id} className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 space-y-1.5 group/comment">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="font-bold text-cyan-400">{c.author}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 text-[10px]">
                              {c.created_at ? new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                            </span>
                            <button
                              onClick={() => handleDeleteComment(c.id)}
                              title="Delete response"
                              className="text-slate-600 hover:text-red-400 opacity-0 group-hover/comment:opacity-100 transition-opacity cursor-pointer"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">{c.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Comment Form Input */}
            <form onSubmit={handleAddComment} className="pt-4 border-t border-slate-800 mt-auto flex gap-2 flex-shrink-0">
              <input 
                type="text"
                placeholder="Write an academic response..."
                value={newCommentText}
                onChange={e => setNewCommentText(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <button 
                type="submit"
                disabled={!newCommentText.trim() || submittingComment}
                className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center flex-shrink-0"
              >
                <Send size={14} />
              </button>
            </form>

          </div>
        </div>
      )}

      {/* EDIT DISCUSSION MODAL */}
      {editingPost && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Edit3 size={15} className="text-cyan-400" /> Edit Discussion #{editingPost.id}
              </h3>
              <button onClick={() => setEditingPost(null)} className="text-slate-500 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">Title</label>
                <input 
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs font-sans focus:border-cyan-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-cyan-500 outline-none"
                  >
                    {CATEGORIES.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Tags</label>
                  <input 
                    type="text"
                    value={editTags}
                    onChange={e => setEditTags(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs font-mono focus:border-cyan-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">Content</label>
                <textarea 
                  rows={5}
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs font-sans focus:border-cyan-500 outline-none resize-none leading-relaxed"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Render Peer Profile Modal */}
      {activePeerProfile && (
        <PeerProfileModal 
          peer={activePeerProfile}
          onClose={() => setActivePeerProfile(null)}
          onMessageClick={(name) => {
            setNewChatInput(`@${name} `);
            setActivePeerProfile(null);
          }}
        />
      )}
    </div>
  );
}