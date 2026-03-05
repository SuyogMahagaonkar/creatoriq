import React, { useState, useEffect } from 'react';
import { MessageCircle, Wand2, Send, Clock, CheckCircle2, ThumbsUp, ThumbsDown, Heart, MessageSquare, Sparkles, RefreshCw, AlertTriangle, Inbox, Edit2, Trash2, Save, Flame, PlayCircle, ChevronDown, ChevronUp, Smile, Zap, Globe, ScanFace, LayoutList, Columns, Frown, Meh } from 'lucide-react';
import { fetchRecentComments, draftCommentReply, postCommentReply, editComment, deleteComment, summarizeCommentsVibe, analyzeSentiments, translateCommentText } from '../api';
import { Spinner } from '../components/Shared';
import EmojiPicker from 'emoji-picker-react';

// Helper for formatting time
const timeAgo = (dateString) => {
  const date = new Date(dateString);
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";
  return Math.floor(seconds) + "s ago";
};

// YouTube-style @mention highlighter
const formatYouTubeText = (text) => {
  if (!text) return "";
  const parts = text.split(/(@[^\s]+)/g);
  return parts.map((part, index) => 
    part.startsWith('@') 
      ? <span key={index} style={{ color: '#3EA6FF', cursor: 'pointer' }}>{part}</span> 
      : part
  );
};

export default function CommentsPage({ setIsSessionExpired }) {
  // Core States
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  
  // Filters, Tabs & Layout
  const [activeTab, setActiveTab] = useState("needs"); 
  const [showCreatorComments, setShowCreatorComments] = useState(false); 
  const [expandedReplies, setExpandedReplies] = useState(new Set());
  const [viewMode, setViewMode] = useState("list"); // 'list' | 'kanban'

  // Drafting States
  const [activeDraftId, setActiveDraftId] = useState(null);
  const [draftText, setDraftText] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [successIds, setSuccessIds] = useState(new Set());
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); 
  const [translatingId, setTranslatingId] = useState(null);
  
  // AI States
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [isScanningVibes, setIsScanningVibes] = useState(false);
  const [summary, setSummary] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Editing States
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [processingAction, setProcessingAction] = useState(false);

  // Load Data
  const loadComments = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const data = await fetchRecentComments(50); 
      setComments(data);
    } catch (err) { 
      if (err.message === "AUTH_REQUIRED" && setIsSessionExpired) setIsSessionExpired(true); 
      else setError(err.message); 
    } finally { 
      setLoading(false); 
      setRefreshing(false); 
    }
  };

  useEffect(() => { loadComments(); }, []);

  // Professional CRM Sentiment Badges
  const renderSentimentBadge = (sentiment) => {
    if (sentiment === 'positive') {
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(5, 118, 66, 0.1)', color: '#057642', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          <Smile size={12} /> Positive
        </span>
      );
    }
    if (sentiment === 'negative') {
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(204, 16, 22, 0.1)', color: '#CC1016', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          <Frown size={12} /> Negative
        </span>
      );
    }
    if (sentiment === 'neutral') {
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(107, 114, 128, 0.1)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          <Meh size={12} /> Neutral
        </span>
      );
    }
    return null;
  };

  // --- AI ACTIONS ---
  const handleSummarizeVibe = async () => {
    setIsSummarizing(true);
    try {
      const textList = comments.slice(0, 50).map(c => c.text);
      const vibe = await summarizeCommentsVibe(textList);
      setSummary(vibe);
    } catch (err) {
      alert("Failed to summarize: " + err.message);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleTranslate = async (commentId, text, isReply = false) => {
    setTranslatingId(commentId);
    try {
      const englishText = await translateCommentText(text);
      setComments(prev => prev.map(c => {
        if (!isReply && c.commentId === commentId) return { ...c, text: englishText, isTranslated: true };
        if (c.replies) {
          return { ...c, replies: c.replies.map(r => r.commentId === commentId ? { ...r, text: englishText, isTranslated: true } : r) };
        }
        return c;
      }));
    } catch (err) {
      alert("Translation failed");
    } finally {
      setTranslatingId(null);
    }
  };

  const handleScanSentiments = async () => {
    setIsScanningVibes(true);
    try {
      const payload = comments.map(c => ({ id: c.commentId, text: c.text }));
      const results = await analyzeSentiments(payload);
      setComments(prev => prev.map(c => {
        const found = results.find(r => r.id === c.commentId);
        return found ? { ...c, sentiment: found.sentiment } : c;
      }));
    } catch (err) {
      alert("Failed to scan vibes");
    } finally {
      setIsScanningVibes(false);
    }
  };

  // --- STANDARD ACTIONS ---
  const openReplyBox = (commentId, authorToTag = null) => {
    setActiveDraftId(commentId);
    setDraftText(authorToTag ? `@${authorToTag} ` : "");
    setEditingId(null);
    setShowEmojiPicker(false);
    setExpandedReplies(prev => new Set(prev).add(commentId));
  };

  const generateAiReply = async (commentObj) => {
    setDrafting(true);
    setError("");
    try {
      const generated = await draftCommentReply(commentObj.text, commentObj.videoId);
      setDraftText(generated);
    } catch (err) {
      if (err.message === "AUTH_REQUIRED" && setIsSessionExpired) setIsSessionExpired(true);
      else setError("AI Draft Failed: " + err.message);
    } finally {
      setDrafting(false);
    }
  };

  const handleSend = async (threadId) => {
    if (!draftText.trim()) return;
    setSending(true);
    setError("");
    setExpandedReplies(prev => new Set(prev).add(threadId));
    setShowEmojiPicker(false);
    try {
      await postCommentReply(threadId, draftText);
      const newSet = new Set(successIds).add(threadId);
      setSuccessIds(newSet);
      setActiveDraftId(null);
      setDraftText("");
    } catch (err) {
      if (err.message === "AUTH_REQUIRED" && setIsSessionExpired) setIsSessionExpired(true);
      else setError("Failed to post reply: " + err.message);
    } finally {
      setSending(false);
    }
  };

  const startEditing = (commentId, currentText) => {
    setEditingId(commentId);
    setEditText(currentText);
    setActiveDraftId(null);
    setShowEmojiPicker(false);
  };

  const handleSaveEdit = async (commentId) => {
    setProcessingAction(true);
    try {
      await editComment(commentId, editText);
      setComments(comments.map(c => {
        if (c.commentId === commentId) return { ...c, text: editText };
        if (c.replies) return { ...c, replies: c.replies.map(r => r.commentId === commentId ? { ...r, text: editText } : r) };
        return c;
      }));
      setEditingId(null);
    } catch (err) {
      if (err.message === "AUTH_REQUIRED" && setIsSessionExpired) setIsSessionExpired(true);
      else setError("Edit failed: " + err.message);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm("Delete this comment permanently?")) return;
    setProcessingAction(true);
    try {
      await deleteComment(commentId);
      setComments(comments.filter(c => c.commentId !== commentId).map(c => ({
        ...c, replies: c.replies ? c.replies.filter(r => r.commentId !== commentId) : []
      })));
    } catch (err) {
      if (err.message === "AUTH_REQUIRED" && setIsSessionExpired) setIsSessionExpired(true);
      else setError("Delete failed: " + err.message);
    } finally {
      setProcessingAction(false);
    }
  };

  // --- FILTERING LOGIC ---
  // --- FILTERING LOGIC ---
  // 1. Define columns as 'let' so we can filter them dynamically
  let needsEngagement = comments.filter(c => !c.creatorReplied && !successIds.has(c.commentId) && !c.isCreatorComment);
  let alreadyCommented = comments.filter(c => c.creatorReplied || successIds.has(c.commentId) || c.isCreatorComment);
  
  // 2. Apply "Show My Comments" filter to BOTH columns
  if (showCreatorComments) {
    needsEngagement = needsEngagement.filter(c => c.isCreatorComment);
    alreadyCommented = alreadyCommented.filter(c => c.isCreatorComment);
  }
  
  // 3. Apply Sentiment filter to BOTH columns
  if (sentimentFilter !== "all") {
    needsEngagement = needsEngagement.filter(c => c.sentiment === sentimentFilter);
    alreadyCommented = alreadyCommented.filter(c => c.sentiment === sentimentFilter);
  }

  // 4. List View Assignment (Pulls from the now-filtered columns)
  let displayedComments = activeTab === "needs" ? needsEngagement : alreadyCommented;
  // NEW: Check if we have scanned sentiments yet
  const hasScannedSentiments = comments.some(c => c.sentiment);

  // ============================================================================
  // EXTRACTED COMPONENT: Renders a single YouTube Comment Tree
  // ============================================================================
  const renderCommentCard = (c) => {
    const isSuccess = successIds.has(c.commentId);
    const isDraftingHere = activeDraftId === c.commentId;
    const isEditingTop = editingId === c.commentId;
    const isHot = c.likeCount > 2 || c.totalReplyCount > 1; 
    const isExpanded = expandedReplies.has(c.commentId);
    const hasReplies = c.replies && c.replies.length > 0;

    return (
      <div key={c.commentId} style={{ 
        background: 'var(--card)', borderRadius: 16, padding: '24px 20px', marginBottom: 16,
        boxShadow: isDraftingHere ? '0 8px 32px rgba(10, 102, 194, 0.15)' : '0 2px 8px rgba(0,0,0,0.04)', 
        border: isDraftingHere ? '1px solid var(--accent)' : '1px solid var(--border)',
        opacity: isSuccess && viewMode === 'list' && activeTab === "needs" ? 0.6 : 1, transition: 'all 0.4s ease' 
      }}>
        <div style={{ display: 'flex', gap: 16 }}>
          
          {/* LEFT COLUMN: Avatar & Vertical Line */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', width: 44, flexShrink: 0 }}>
            <img src={c.authorAvatar} alt="author" style={{ width: 44, height: 44, borderRadius: '50%', position: 'relative', zIndex: 2 }} />
            {(hasReplies || isDraftingHere) && (
              <div style={{ position: 'absolute', top: 44, bottom: 0, width: 2, background: 'var(--border-strong)', opacity: 0.4, zIndex: 1 }}></div>
            )}
          </div>
          
          {/* RIGHT COLUMN */}
          <div style={{ flex: 1, minWidth: 0 }}>
            
            {/* Top Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{c.author}</span>
                {c.isCreatorComment && <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 12, textTransform: 'uppercase' }}>Creator</span>}
                <span style={{ fontSize: 12, color: 'var(--text-light)' }}>{timeAgo(c.publishedAt)}</span>
                
                {renderSentimentBadge(c.sentiment)}
                
                <a href={`https://youtube.com/watch?v=${c.videoId}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 12, border: '1px solid var(--border)', marginLeft: 4 }}>
                  <PlayCircle size={10} color="var(--text-muted)" />
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Context</span>
                </a>
                
                {!c.isTranslated && (
                  <button onClick={() => handleTranslate(c.commentId, c.text, false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                    {translatingId === c.commentId ? <Spinner size={12} /> : <><Globe size={12} /> Translate</>}
                  </button>
                )}
                {isHot && <span style={{ color: '#D95C00', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><Flame size={10} fill="#D95C00" /> Hot</span>}
              </div>

              {c.isCreatorComment && !isEditingTop && (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => startEditing(c.commentId, c.text)} disabled={processingAction} className="btn btn-secondary btn-sm" style={{ padding: 6, border: 'none', background: 'transparent' }}><Edit2 size={14}/></button>
                  <button onClick={() => handleDelete(c.commentId)} disabled={processingAction} className="btn btn-secondary btn-sm" style={{ padding: 6, border: 'none', background: 'transparent', color: '#CC1016' }}><Trash2 size={14}/></button>
                </div>
              )}
            </div>
            
            {/* Top Comment Body */}
            {isEditingTop ? (
              <div style={{ marginBottom: 12 }}>
                <textarea className="form-input mb-8" rows={3} value={editText} onChange={e => setEditText(e.target.value)} style={{ borderRadius: 12 }} />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={() => setEditingId(null)} disabled={processingAction}>Cancel</button>
                  <button className="btn btn-primary" onClick={() => handleSaveEdit(c.commentId)} disabled={processingAction || !editText.trim()}>{processingAction ? <Spinner size={16} /> : "Save"}</button>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.5, marginBottom: 8, whiteSpace: 'pre-wrap' }}>
                {formatYouTubeText(c.text)}
              </div>
            )}

            {/* Top Comment Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', color: 'var(--text-muted)' }}>
                <button style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}><ThumbsUp size={16} /> <span style={{ fontSize: 12 }}>{c.likeCount || ''}</span></button>
                <button style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}><ThumbsDown size={16} /></button>
                <button style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}><Heart size={16} /></button>
                {!c.isCreatorComment && (
                  <button onClick={() => openReplyBox(c.commentId)} style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: '4px 8px', borderRadius: 16 }}>Reply</button>
                )}
              </div>
            </div>

            {/* YOUTUBE ACCORDION TOGGLE (> 2 REPLIES) */}
            {hasReplies && c.replies.length > 2 && !isExpanded && (
              <div style={{ display: 'flex', gap: 12, position: 'relative', marginTop: 16, alignItems: 'center', animation: 'fadeIn 0.2s ease' }}>
                <div style={{ position: 'absolute', left: -39, top: -20, height: 32, width: 32, borderLeft: '2px solid var(--border-strong)', borderBottom: '2px solid var(--border-strong)', borderBottomLeftRadius: 16, opacity: 0.4, zIndex: 0 }} />
                <div style={{ position: 'absolute', left: -42, top: 12, bottom: -50, width: 10, background: 'var(--card)', zIndex: 1 }} />
                <img src={c.replies[c.replies.length - 1]?.authorAvatar || c.replies[0]?.authorAvatar} alt="reply" style={{ width: 24, height: 24, borderRadius: '50%', position: 'relative', zIndex: 2 }} />
                <button 
                  onClick={() => setExpandedReplies(prev => new Set(prev).add(c.commentId))}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#3EA6FF', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '6px 12px', borderRadius: 16, position: 'relative', zIndex: 2, transition: 'background 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(62, 166, 255, 0.1)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  • {c.replies.length} replies <ChevronDown size={18} />
                </button>
              </div>
            )}

            {/* NESTED REPLIES */}
            {hasReplies && (c.replies.length <= 2 || isExpanded) && (
              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {c.replies.map((reply, idx) => {
                  const isEditingReply = editingId === reply.commentId;
                  const isLast = idx === c.replies.length - 1;
                  const shouldMaskLine = isLast && !isDraftingHere && c.replies.length <= 2;

                  return (
                    <div key={reply.commentId} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                      <div style={{ position: 'absolute', left: -39, top: -24, height: 38, width: 32, borderLeft: '2px solid var(--border-strong)', borderBottom: '2px solid var(--border-strong)', borderBottomLeftRadius: 16, opacity: 0.4, zIndex: 0 }} />
                      {shouldMaskLine && <div style={{ position: 'absolute', left: -42, top: 14, bottom: -100, width: 10, background: 'var(--card)', zIndex: 1 }} />}
                      <img src={reply.authorAvatar} alt="reply author" style={{ width: 28, height: 28, borderRadius: '50%', position: 'relative', zIndex: 2 }} />
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{reply.author}</span>
                            {reply.isCreator && <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 8, textTransform: 'uppercase' }}>Creator</span>}
                            <span style={{ fontSize: 11, color: 'var(--text-light)' }}>{timeAgo(reply.publishedAt)}</span>
                          </div>
                          {reply.isCreator && !isEditingReply && (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => startEditing(reply.commentId, reply.text)} disabled={processingAction} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Edit2 size={12}/></button>
                              <button onClick={() => handleDelete(reply.commentId)} disabled={processingAction} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CC1016' }}><Trash2 size={12}/></button>
                            </div>
                          )}
                        </div>
                        
                        {isEditingReply ? (
                          <div style={{ marginTop: 8 }}>
                            <textarea className="form-input mb-8" rows={2} value={editText} onChange={e => setEditText(e.target.value)} style={{ fontSize: 13, padding: 12, borderRadius: 8 }} />
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                              <button className="btn btn-primary btn-sm" onClick={() => handleSaveEdit(reply.commentId)} disabled={processingAction || !editText.trim()}>{processingAction ? <Spinner size={12} /> : "Save"}</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap', marginBottom: 6 }}>
                            {formatYouTubeText(reply.text)}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 16, alignItems: 'center', color: 'var(--text-muted)' }}>
                          <div style={{ display: 'flex', gap: 12 }}>
                            <button style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}><ThumbsUp size={14} /></button>
                            <button style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}><ThumbsDown size={14} /></button>
                            <button style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}><Heart size={14} /></button>
                          </div>
                          {!reply.isCreator && (
                            <button onClick={() => openReplyBox(c.commentId, reply.author)} style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: '4px 8px', borderRadius: 12 }}>Reply</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* EXPANDED "HIDE REPLIES" TOGGLE AT BOTTOM */}
            {hasReplies && c.replies.length > 2 && isExpanded && (
              <div style={{ display: 'flex', gap: 12, position: 'relative', marginTop: 16, alignItems: 'center', animation: 'fadeIn 0.2s ease' }}>
                <div style={{ position: 'absolute', left: -39, top: -20, height: 32, width: 32, borderLeft: '2px solid var(--border-strong)', borderBottom: '2px solid var(--border-strong)', borderBottomLeftRadius: 16, opacity: 0.4, zIndex: 0 }} />
                {!isDraftingHere && <div style={{ position: 'absolute', left: -42, top: 12, bottom: -50, width: 10, background: 'var(--card)', zIndex: 1 }} />}
                <div style={{ width: 24 }}></div> 
                <button 
                  onClick={() => setExpandedReplies(prev => { const next = new Set(prev); next.delete(c.commentId); return next; })}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: -8, background: 'none', border: 'none', color: '#3EA6FF', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '6px 12px', borderRadius: 16, position: 'relative', zIndex: 2, transition: 'background 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(62, 166, 255, 0.1)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  Hide replies <ChevronUp size={18} />
                </button>
              </div>
            )}

            {/* REPLY DRAFTER TEXTBOX */}
            {isDraftingHere && !isSuccess && (
              <div style={{ marginTop: 16, position: 'relative', animation: 'fadeIn 0.2s ease' }}>
                <div style={{ position: 'absolute', left: -39, top: -24, height: 40, width: 32, borderLeft: '2px solid var(--border-strong)', borderBottom: '2px solid var(--border-strong)', borderBottomLeftRadius: 16, opacity: 0.4, zIndex: 0 }} />
                <div style={{ position: 'absolute', left: -42, top: 16, bottom: -100, width: 10, background: 'var(--card)', zIndex: 1 }} />

                {drafting ? (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>
                    <Spinner size={24} /> <div style={{ marginTop: 12 }}>Gemini is drafting...</div>
                  </div>
                ) : (
                  <div style={{ position: 'relative', zIndex: 2 }}>
                    <div style={{ position: 'relative', marginBottom: 12 }}>
                      <textarea 
                        className="form-input" rows={3} value={draftText} onChange={e => setDraftText(e.target.value)} placeholder="Add a reply..."
                        style={{ fontSize: 14, borderRadius: 12, paddingRight: 110, padding: 16, background: 'var(--surface)', width: '100%', resize: 'vertical', border: '1px solid var(--border-strong)' }} 
                      />
                      {showEmojiPicker && (
                        <div style={{ position: 'absolute', bottom: 50, right: 0, zIndex: 50, boxShadow: '0 10px 40px rgba(0,0,0,0.15)', borderRadius: 8 }}>
                          <EmojiPicker onEmojiClick={(emojiData) => setDraftText(prev => prev + emojiData.emoji)} theme="auto" width={300} height={350} />
                        </div>
                      )}
                      <button onClick={() => setShowEmojiPicker(prev => !prev)} title="Add Emoji" style={{ position: 'absolute', bottom: 16, right: 78, background: 'none', border: 'none', color: showEmojiPicker ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: '0.2s' }}>
                        <Smile size={20} />
                      </button>
                      <button onClick={() => generateAiReply(c)} disabled={drafting} title="Write with AI" style={{ position: 'absolute', bottom: 12, right: 12, background: 'linear-gradient(135deg, var(--accent), #6b21a8)', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700, boxShadow: '0 2px 8px rgba(10, 102, 194, 0.2)' }}>
                        <Sparkles size={14} /> AI
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => {setActiveDraftId(null);setShowEmojiPicker(false);}} disabled={sending} style={{ borderRadius: 16 }}>Cancel</button>
                      <button className="btn btn-primary btn-sm" onClick={() => handleSend(c.commentId)} disabled={sending || !draftText.trim()} style={{ borderRadius: 16 }}>
                        {sending ? <Spinner size={14} /> : "Reply"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page fade-in" style={{ paddingBottom: 60, maxWidth: 1400, margin: '0 auto' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="heading-xl mb-8" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <MessageSquare color="var(--accent)" size={32} /> CRM Dashboard
          </h1>
          <p className="text-muted text-sm">Manage your community pipeline and analyze audience sentiment.</p>
        </div>
        <button className="btn btn-secondary" onClick={() => loadComments(true)} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? "spin" : ""} /> {refreshing ? "Syncing..." : "Refresh Feed"}
        </button>
      </div>

      {error && <div className="error-box mb-24"><Flame size={18} /> {error}</div>}

      {/* DASHBOARD GRID (Responsive Auto-Fit Grid) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 32 }}>
        
        {/* WIDGET 1: AI VIBE SUMMARY */}
        <div style={{ background: 'var(--card)', padding: 20, borderRadius: 16, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: summary ? 16 : 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }}>
              <div style={{ background: 'var(--surface-2)', padding: 6, borderRadius: 8 }}><Zap size={16} color="var(--accent)" /></div>
              AI Vibe Summary
            </div>
            <button onClick={handleSummarizeVibe} disabled={isSummarizing || comments.length === 0} className="btn btn-secondary btn-sm" style={{ borderRadius: 16 }}>
              {isSummarizing ? <Spinner size={14} /> : "Generate"}
            </button>
          </div>
          {summary ? (
            <div style={{ 
              fontSize: 14, color: 'var(--text)', lineHeight: 1.6, padding: 12, 
              background: 'var(--surface)', borderRadius: 8, borderLeft: '3px solid var(--accent)', 
              flex: 1, 
              maxHeight: 110,      // Locks the maximum height
              overflowY: 'auto'    // Adds the scrollbar if text exceeds the height
            }}>
              {summary}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13, minHeight: 60 }}>
              No summary generated yet.
            </div>
          )}
        </div>

        {/* WIDGET 2: KANBAN STATS & ACTIONS */}
        <div style={{ background: 'var(--card)', padding: 20, borderRadius: 16, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }}>
              <div style={{ background: 'var(--surface-2)', padding: 6, borderRadius: 8 }}><ScanFace size={16} color="#057642" /></div>
              Pipeline & Sentiment
            </div>
            <button onClick={handleScanSentiments} disabled={isScanningVibes} className="btn btn-secondary btn-sm" style={{ borderRadius: 16 }}>
              {isScanningVibes ? <Spinner size={14} /> : "Scan Sentiments"}
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, background: 'var(--surface)', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border-strong)' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>{needsEngagement.length}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Inbox</div>
            </div>
            <div style={{ flex: 1, background: 'var(--surface)', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border-strong)' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#057642' }}>{alreadyCommented.length}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Resolved</div>
            </div>
          </div>
        </div>

      </div>

      {/* CONTROLS BAR: Views & Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        
        {/* VIEW TOGGLE (List vs Kanban) */}
        <div style={{ display: 'flex', background: 'var(--surface)', padding: 4, borderRadius: 12, border: '1px solid var(--border)' }}>
          <button 
            onClick={() => setViewMode('list')} 
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: viewMode === 'list' ? 'var(--card)' : 'transparent', color: viewMode === 'list' ? 'var(--text)' : 'var(--text-muted)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: viewMode === 'list' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none' }}
          >
            <LayoutList size={16} /> List
          </button>
          <button 
            onClick={() => setViewMode('kanban')} 
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: viewMode === 'kanban' ? 'var(--card)' : 'transparent', color: viewMode === 'kanban' ? 'var(--text)' : 'var(--text-muted)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: viewMode === 'kanban' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none' }}
          >
            <Columns size={16} /> Board
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {/* SENTIMENT FILTER (Only visible after scanning) */}
          {hasScannedSentiments && (
            <select 
              value={sentimentFilter} 
              onChange={(e) => setSentimentFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontSize: 13, fontWeight: 600, outline: 'none', animation: 'fadeIn 0.3s ease' }}
            >
              <option value="all">All Sentiments</option>
              <option value="positive">😊 Positive Only</option>
              <option value="neutral">😐 Neutral Only</option>
              <option value="negative">☹️ Negative Only</option>
            </select>
          )}

          {/* MY COMMENTS TOGGLE */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: 'var(--surface-2)', padding: '8px 12px', borderRadius: 20, border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Show My Comments</span>
            <div onClick={() => setShowCreatorComments(!showCreatorComments)} style={{ width: 36, height: 20, background: showCreatorComments ? 'var(--accent)' : 'var(--border-strong)', borderRadius: 20, position: 'relative', transition: '0.3s' }}>
              <div style={{ width: 14, height: 14, background: '#fff', borderRadius: '50%', position: 'absolute', top: 3, left: showCreatorComments ? 19 : 3, transition: '0.3s' }} />
            </div>
          </label>
        </div>
      </div>

      {loading && <div className="loading"><Spinner size={40} /><p>Loading your pipeline...</p></div>}

      {/* ========================================================= */}
      {/* CONDITIONAL RENDER: LIST VIEW vs KANBAN BOARD               */}
      {/* ========================================================= */}
      {!loading && (
        viewMode === 'list' ? (
          /* TRADITIONAL LIST VIEW */
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            {/* List Tabs */}
            <div style={{ display: 'flex', marginBottom: 24, gap: 12 }}>
              <button onClick={() => setActiveTab("needs")} style={{ flex: 1, padding: '12px 0', border: 'none', borderBottom: activeTab === "needs" ? '3px solid var(--accent)' : '3px solid transparent', background: 'transparent', color: activeTab === "needs" ? 'var(--text)' : 'var(--text-muted)', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: '0.2s' }}>
                Inbox ({needsEngagement.length})
              </button>
              <button onClick={() => setActiveTab("done")} style={{ flex: 1, padding: '12px 0', border: 'none', borderBottom: activeTab === "done" ? '3px solid #057642' : '3px solid transparent', background: 'transparent', color: activeTab === "done" ? 'var(--text)' : 'var(--text-muted)', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: '0.2s' }}>
                Responded ({alreadyCommented.length})
              </button>
            </div>
            
            {displayedComments.length === 0 ? (
              <div className="card" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={48} style={{ opacity: 0.2, marginBottom: 16, color: '#057642' }} />
                <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>Pipeline Clear</h3>
                <p style={{ fontSize: 14, marginTop: 8 }}>No comments in this view.</p>
              </div>
            ) : (
              displayedComments.map(renderCommentCard)
            )}
          </div>
        ) : (
          /* KANBAN BOARD VIEW */
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', overflowX: 'auto', paddingBottom: 24 }}>
            
            {/* COLUMN 1: INBOX */}
            <div style={{ flex: '1 1 400px', minWidth: 350, background: 'var(--surface-2)', padding: 16, borderRadius: 20, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '0 8px' }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}><Inbox size={18} color="var(--accent)" /> Inbox</h3>
                <span style={{ background: 'var(--card)', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>{needsEngagement.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {needsEngagement.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 14 }}>Nothing to reply to! 🎉</div>
                ) : (
                  needsEngagement.map(renderCommentCard)
                )}
              </div>
            </div>

            {/* COLUMN 2: RESPONDED */}
            <div style={{ flex: '1 1 400px', minWidth: 350, background: 'var(--surface-2)', padding: 16, borderRadius: 20, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '0 8px' }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle2 size={18} color="#057642" /> Responded</h3>
                <span style={{ background: 'var(--card)', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>{alreadyCommented.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {alreadyCommented.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 14 }}>No history yet.</div>
                ) : (
                  alreadyCommented.map(renderCommentCard)
                )}
              </div>
            </div>

          </div>
        )
      )}
    </div>
  );
}