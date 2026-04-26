import React, { useState, useEffect, useContext } from "react";
import {
  Video, ListVideo, Search, Eye, ThumbsUp, MessageSquare, Clock, Youtube,
  Sparkles, AlertTriangle, CheckCircle2, Edit3, Type, AlignLeft, Tags, X, Wand2, Save, Layers, ChevronLeft, BarChart2, ChevronRight, Grid, List as ListIcon, Filter, TrendingUp,
  LayoutGrid, AlignJustify, ExternalLink, Activity, Lock
} from "lucide-react";
import { ExpandableText, ScoreCircle, SuggestionCard, Spinner } from "../components/Shared";
import { analyzeTitle, analyzeDescription, analyzeTags, getScoreColor, getScoreLabel, formatCount, timeAgo, calculateOverallSEO } from "../utils";
import { fetchPlaylistVideos, fetchGeminiSuggestions, updateYouTubeMetadata } from "../api";
import { CreatorContext } from '../context/CreatorContext';

export default function MyVideosPage({ videos, playlists, setVideos, setPlaylists, accessToken, setPage, setEditingVideoId, setEditingPlaylistId, setPreviousPage }) {
  const { geminiKey, setIsSettingsOpen, setSettingsTab } = useContext(CreatorContext);
  const handleLockedAI = () => { setSettingsTab('ai'); setIsSettingsOpen(true); };
  const [tab, setTab] = useState("videos");
  const [query, setQuery] = useState("");
  const [layoutStyle, setLayoutStyle] = useState("list"); // 'list' or 'grid'
  const [activeFilter, setActiveFilter] = useState("all");

  const ITEMS_PER_PAGE = layoutStyle === "grid" ? 16 : 24;
  const [videoPage, setVideoPage] = useState(1);
  const [playlistPage, setPlaylistPage] = useState(1);

  useEffect(() => {
    setVideoPage(1);
    setPlaylistPage(1);
  }, [query, tab, activeFilter]);
  
  const [selectedAsset, setSelectedAsset] = useState(null); // The split-pane target
  const [playlistVideos, setPlaylistVideos] = useState([]);
  const [loadingPlaylistVideos, setLoadingPlaylistVideos] = useState(false);

  const [editModal, setEditModal] = useState({ isOpen: false, field: null, value: "", targetObj: null, type: null });
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Auto-fetch subset videos if playlist is selected in the master pane
  useEffect(() => {
    if (tab === "playlists" && selectedAsset) {
      let isMounted = true;
      setLoadingPlaylistVideos(true);
      fetchPlaylistVideos(selectedAsset.id)
        .then(vids => {
          if (isMounted) {
            setPlaylistVideos(vids);
            setLoadingPlaylistVideos(false);
          }
        }).catch(err => {
          console.error(err);
          if (isMounted) setLoadingPlaylistVideos(false);
        });
      return () => { isMounted = false; };
    }
  }, [selectedAsset, tab]);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    } else if (cooldown === 0 && apiError.includes("Free tier limit")) {
      setApiError("");
    }
    return () => clearTimeout(timer);
  }, [cooldown, apiError]);

  const getSimulatedScore = (v) => {
    return calculateOverallSEO(analyzeTitle(v.title), analyzeDescription(v.description), analyzeTags(v.tags));
  };

  let processedVideos = [...videos];
  if (activeFilter === "high-eng") {
    processedVideos.sort((a, b) => b.engagementRate - a.engagementRate);
  } else if (activeFilter === "needs-seo") {
    processedVideos.sort((a, b) => getSimulatedScore(a) - getSimulatedScore(b));
  } else if (activeFilter === "oldest") {
    processedVideos.sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));
  } else if (activeFilter === "recent") {
    processedVideos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }

  const filteredVideos = processedVideos.filter(v => !query || v.title.toLowerCase().includes(query.toLowerCase()));
  const filteredPlaylists = playlists.filter(p => !query || p.title.toLowerCase().includes(query.toLowerCase()));
  
  const totalVideoPages = Math.ceil(filteredVideos.length / ITEMS_PER_PAGE);
  const paginatedVideos = filteredVideos.slice((videoPage - 1) * ITEMS_PER_PAGE, videoPage * ITEMS_PER_PAGE);
  
  const totalPlaylistPages = Math.ceil(filteredPlaylists.length / ITEMS_PER_PAGE);
  const paginatedPlaylists = filteredPlaylists.slice((playlistPage - 1) * ITEMS_PER_PAGE, playlistPage * ITEMS_PER_PAGE);

  const targetObj = selectedAsset;
  const objType = tab === "videos" ? "video" : "playlist";

  const titleAnalysis = targetObj ? analyzeTitle(targetObj.title) : null;
  const descAnalysis = targetObj ? analyzeDescription(targetObj.description) : null;
  const tagAnalysis = targetObj ? analyzeTags(targetObj.tags) : null;
  const overallSEO = targetObj ? calculateOverallSEO(titleAnalysis, descAnalysis, tagAnalysis) : null;

  const actionPlan = targetObj ? [
    ...titleAnalysis.issues.map(issue => ({ field: "title", issue })),
    ...descAnalysis.issues.map(issue => ({ field: "description", issue })),
    ...tagAnalysis.issues.map(issue => ({ field: "tags", issue }))
  ] : [];

  const openEditModal = (field) => {
    if (!accessToken) {
      alert("Please connect your YouTube account in Settings first.");
      return;
    }
    let initialValue = targetObj[field] || "";
    if (field === "tags" && Array.isArray(initialValue)) initialValue = initialValue.join(", ");
    setEditModal({ isOpen: true, field, value: initialValue, targetObj, type: objType });
    setApiError("");
    setAiSuggestions([]);
  };

  const handleGenerateAI = async () => {
    setApiError("");
    setIsGeneratingAI(true);
    try {
      const fieldIssues = actionPlan.filter(item => item.field === editModal.field).map(item => item.issue);
      const suggestions = await fetchGeminiSuggestions(editModal.field, editModal.value, targetObj, fieldIssues);
      setAiSuggestions(suggestions);
    } catch (err) {
      if (err.message.startsWith("RATE_LIMIT:")) {
        const secs = parseInt(err.message.split(":")[1], 10);
        setCooldown(secs);
        setApiError(`Free tier limit reached. Please wait ${secs}s.`);
      } else {
        setApiError(err.message);
      }
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSaveToYouTube = async () => {
    setIsSaving(true);
    setApiError("");
    try {
      let finalValue = editModal.value;
      if (editModal.field === "tags") finalValue = editModal.value.split(",").map(t => t.trim()).filter(Boolean);

      await updateYouTubeMetadata(editModal.type, editModal.targetObj.id, { [editModal.field]: finalValue }, accessToken);

      const updatedItem = { ...editModal.targetObj, [editModal.field]: finalValue };
      if (editModal.type === "video") {
        setVideos(prev => prev.map(v => v.id === updatedItem.id ? updatedItem : v));
        setSelectedAsset(updatedItem);
        setPlaylistVideos(prev => prev.map(v => v.id === updatedItem.id ? updatedItem : v));
      } else {
        setPlaylists(prev => prev.map(p => p.id === updatedItem.id ? updatedItem : p));
        setSelectedAsset(updatedItem);
      }
      setEditModal({ isOpen: false, field: null, value: "", targetObj: null, type: null });
    } catch (err) {
      setApiError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Close SidePanel when clicking outside / pressing escape
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === "Escape") setSelectedAsset(null); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  return (
    <div className="page fade-in" style={{ paddingBottom: 60, maxWidth: 1600, margin: '0 auto', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      
      {/* HEADER: STICKY MAC-STYLE TOOLBAR */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'var(--bg-transparent)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', padding: '16px 0', marginBottom: 24, margin: '0 -24px', paddingLeft: 24, paddingRight: 24 }}>
         <div className="toolbar-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Asset Library</h1>
              
              {/* SEGMENTED CONTROL */}
              <div style={{ display: 'flex', background: 'var(--surface-hover)', padding: 4, borderRadius: 'var(--radius-full)' }}>
                <button
                  onClick={() => { setTab("videos"); setQuery(""); setSelectedAsset(null); }}
                  style={{ padding: '6px 16px', borderRadius: 'var(--radius-full)', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: tab === 'videos' ? 'var(--text)' : 'transparent', color: tab === 'videos' ? 'var(--bg)' : 'var(--text-muted)' }}
                >
                  All Videos
                </button>
                <button
                  onClick={() => { setTab("playlists"); setQuery(""); setSelectedAsset(null); }}
                  style={{ padding: '6px 16px', borderRadius: 'var(--radius-full)', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: tab === 'playlists' ? 'var(--text)' : 'transparent', color: tab === 'playlists' ? 'var(--bg)' : 'var(--text-muted)' }}
                >
                  Playlists
                </button>
              </div>
            </div>

            <div className="toolbar-actions">
               {/* SEARCH */}
               <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 'var(--radius-md)', width: 260 }}>
                  <Search size={14} color="var(--text-muted)" />
                  <input type="text" placeholder={`Search ${tab}...`} value={query} onChange={e => setQuery(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, width: '100%', color: 'var(--text)' }} />
               </div>
               
               {/* LAYOUT TOGGLE */}
               <div style={{ display: 'flex', background: 'var(--surface)', padding: 2, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                 <button onClick={() => setLayoutStyle("grid")} style={{ padding: 6, borderRadius: 'var(--radius-sm)', background: layoutStyle === "grid" ? 'var(--surface-hover)' : 'transparent', color: layoutStyle === "grid" ? 'var(--text)' : 'var(--text-light)', border: 'none', cursor: 'pointer' }}><LayoutGrid size={16} /></button>
                 <button onClick={() => setLayoutStyle("list")} style={{ padding: 6, borderRadius: 'var(--radius-sm)', background: layoutStyle === "list" ? 'var(--surface-hover)' : 'transparent', color: layoutStyle === "list" ? 'var(--text)' : 'var(--text-light)', border: 'none', cursor: 'pointer' }}><AlignJustify size={16} /></button>
               </div>
            </div>
         </div>

         {/* FILTERS */}
         {tab === "videos" && (
           <div style={{ display: 'flex', gap: 8, marginTop: 16, overflowX: 'auto' }} className="hide-scroll">
              {[{ id: "all", label: "Everything" }, { id: "high-eng", label: "🔥 Hot Engagement" }, { id: "needs-seo", label: "⚠️ SEO Warnings" }, { id: "recent", label: "Recently Uploaded" }].map(f => (
                <button key={f.id} onClick={() => setActiveFilter(f.id)} style={{ whiteSpace: 'nowrap', padding: '4px 12px', fontSize: 12, fontWeight: 500, borderRadius: 'var(--radius-full)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s', background: activeFilter === f.id ? 'var(--surface-hover)' : 'transparent', color: activeFilter === f.id ? 'var(--text)' : 'var(--text-muted)' }}>
                  {f.label}
                </button>
              ))}
           </div>
         )}
      </div>

      {/* MASTER-DETAIL SPLIT PANE */}
      <div className="split-pane">

         {/* LEFT PANE: MASTER LIBRARY */}
         <div style={{ flex: 1, minWidth: 0, transition: 'all 0.3s ease' }}>
            
            {tab === "videos" ? (
               <>
                 {layoutStyle === "grid" ? (
                   <div style={{ display: 'grid', gridTemplateColumns: selectedAsset ? 'repeat(auto-fill, minmax(220px, 1fr))' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                     {paginatedVideos.map(v => {
                        const isSelected = selectedAsset?.id === v.id;
                        const score = getSimulatedScore(v);
                        return (
                          <div key={v.id} onClick={() => setSelectedAsset(v)} style={{ cursor: 'pointer', position: 'relative', outline: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', aspectRatio: '16/9', transition: 'transform 0.2s, outline 0.2s', transform: isSelected ? 'scale(0.98)' : 'scale(1)' }}>
                            <img src={v.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 40%, transparent 100%)' }} />
                            <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12 }}>
                               <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.3 }}>{v.title}</div>
                               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', display: 'flex', gap: 8 }}>
                                    <span>{formatCount(v.viewCount)} views</span>
                                  </div>
                                  <div style={{ background: getScoreColor(score), width: 8, height: 8, borderRadius: '50%' }} title={`Health: ${score}/100`} />
                               </div>
                            </div>
                            {isSelected && <div style={{ position: 'absolute', top: 8, right: 8, background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>SELECTED</div>}
                          </div>
                        )
                     })}
                   </div>
                 ) : (
                   /* HYPER-DENSE LIST VIEW */
                   <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                      <div className="data-table-header video-cols">
                         <div>Media</div>
                         <div>Title & Metadata</div>
                         <div className="mobile-hide">Views</div>
                         <div className="mobile-hide">Engagement</div>
                         <div className="mobile-hide">Published</div>
                         <div className="mobile-hide" style={{ textAlign: 'right' }}>Health</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                         {paginatedVideos.map((v, i) => {
                           const isSelected = selectedAsset?.id === v.id;
                           const score = getSimulatedScore(v);
                           return (
                             <div key={v.id} onClick={() => setSelectedAsset(v)} className="data-table-row video-cols" style={{ cursor: 'pointer', borderBottom: i < paginatedVideos.length - 1 ? '1px solid var(--border)' : 'none', background: isSelected ? 'var(--bg)' : 'transparent', transition: 'background 0.2s', outline: isSelected ? '1px solid var(--accent)' : 'none', zIndex: isSelected ? 10 : 1, padding: '12px 16px' }}>
                               <img src={v.thumbnail} alt="" style={{ width: 48, height: 27, objectFit: 'cover', borderRadius: 4, background: 'var(--surface-hover)' }} />
                               <div style={{ fontSize: 13, fontWeight: 500, color: isSelected ? 'var(--accent)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 16 }}>{v.title}</div>
                               <div style={{ fontSize: 12, color: 'var(--text-muted)' }} className="mobile-hide">{formatCount(v.viewCount)}</div>
                               <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} className="mobile-hide">
                                  <div style={{ width: 32, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                                     <div style={{ width: `${Math.min(100, (v.engagementRate/10)*100)}%`, height: '100%', background: v.engagementRate > 4 ? 'var(--success-text)' : v.engagementRate > 2 ? 'var(--warning-text)' : 'var(--error-text)' }} />
                                  </div>
                                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.engagementRate}%</span>
                               </div>
                               <div style={{ fontSize: 12, color: 'var(--text-muted)' }} className="mobile-hide">{new Date(v.publishedAt).toLocaleDateString()}</div>
                               <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }} className="mobile-hide">
                                  <div style={{ fontSize: 12, fontWeight: 600, color: getScoreColor(score), background: `${getScoreColor(score)}15`, padding: '2px 6px', borderRadius: 4 }}>{score}</div>
                               </div>
                             </div>
                           )
                         })}
                      </div>
                   </div>
                 )}
                 {totalVideoPages > 1 && (
                   <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 40 }}>
                     <button className="btn btn-secondary btn-sm" disabled={videoPage === 1} onClick={() => setVideoPage(p => p - 1)}><ChevronLeft size={14} /> Prev</button>
                     <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>{videoPage} / {totalVideoPages}</span>
                     <button className="btn btn-secondary btn-sm" disabled={videoPage === totalVideoPages} onClick={() => setVideoPage(p => p + 1)}>Next <ChevronRight size={14} /></button>
                   </div>
                 )}
                 {paginatedVideos.length === 0 && <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-light)" }}>No videos found in library.</div>}
               </>
            ) : (
               /* PLAYLISTS TAB */
               <>
                 {layoutStyle === "grid" ? (
                   <div style={{ display: 'grid', gridTemplateColumns: selectedAsset ? 'repeat(auto-fill, minmax(220px, 1fr))' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                     {paginatedPlaylists.map(p => {
                       const isSelected = selectedAsset?.id === p.id;
                       return (
                         <div key={p.id} onClick={() => setSelectedAsset(p)} style={{ cursor: 'pointer', position: 'relative', outline: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', aspectRatio: '16/9', transition: 'transform 0.2s', transform: isSelected ? 'scale(0.98)' : 'scale(1)' }}>
                            <img src={p.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)' }} />
                            <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12 }}>
                               <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontSize: 11, fontWeight: 700, marginBottom: 4 }}><ListVideo size={12} /> PLAYLIST</div>
                               <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.3 }}>{p.title}</div>
                               <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 8 }}>{p.itemCount} Items • Updated {timeAgo(p.publishedAt)}</div>
                            </div>
                         </div>
                       )
                     })}
                   </div>
                 ) : (
                   <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                      <div className="data-table-header playlist-cols">
                         <div>Cover</div>
                         <div>Playlist Title & Info</div>
                         <div className="mobile-hide">Video Count</div>
                         <div className="mobile-hide">Last Updated</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                         {paginatedPlaylists.map((p, i) => {
                           const isSelected = selectedAsset?.id === p.id;
                           return (
                             <div key={p.id} onClick={() => setSelectedAsset(p)} className="data-table-row playlist-cols" style={{ cursor: 'pointer', borderBottom: i < paginatedPlaylists.length - 1 ? '1px solid var(--border)' : 'none', background: isSelected ? 'var(--bg)' : 'transparent', outline: isSelected ? '1px solid var(--accent)' : 'none', zIndex: isSelected ? 10 : 1, padding: '12px 16px' }}>
                               <img src={p.thumbnail} alt="" style={{ width: 48, height: 27, objectFit: 'cover', borderRadius: 4, background: 'var(--surface-hover)' }} />
                               <div style={{ fontSize: 13, fontWeight: 500, color: isSelected ? 'var(--accent)' : 'var(--text)' }}>{p.title}</div>
                               <div style={{ fontSize: 12, color: 'var(--text-muted)' }} className="mobile-hide"><span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-hover)', padding: '2px 8px', borderRadius: 12 }}>{p.itemCount}</span></div>
                               <div style={{ fontSize: 12, color: 'var(--text-muted)' }} className="mobile-hide">{timeAgo(p.publishedAt)}</div>
                             </div>
                           )
                         })}
                      </div>
                   </div>
                 )}
                 {totalPlaylistPages > 1 && (
                   <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 40 }}>
                     <button className="btn btn-secondary btn-sm" disabled={playlistPage === 1} onClick={() => setPlaylistPage(p => p - 1)}><ChevronLeft size={14} /> Prev</button>
                     <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>{playlistPage} / {totalPlaylistPages}</span>
                     <button className="btn btn-secondary btn-sm" disabled={playlistPage === totalPlaylistPages} onClick={() => setPlaylistPage(p => p + 1)}>Next <ChevronRight size={14} /></button>
                   </div>
                 )}
               </>
            )}

         </div>

         {/* RIGHT PANE: CONTEXT PANEL SLIDE-IN */}
         {selectedAsset && (
            <>
            {/* Mobile overlay for context panel */}
            <div className="context-panel-overlay" style={{ display: 'none' }} onClick={() => setSelectedAsset(null)} />
            <div className="context-panel fade-in">
               
               {/* Context Header */}
               <div style={{ padding: 16, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'var(--surface-hover)' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                     <div style={{ width: 40, height: 40, background: 'var(--bg)', borderRadius: '50%', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Activity size={18} color="var(--accent)" />
                     </div>
                     <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{tab === 'videos' ? 'Video Tracker' : 'Playlist Hub'}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedAsset.title}</div>
                     </div>
                  </div>
                  <button onClick={() => setSelectedAsset(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', padding: 4 }}><X size={16} /></button>
               </div>

               {/* Scrollable Content */}
               <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 32 }}>

                  {/* Top Stats */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Global Health Score</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: getScoreColor(overallSEO) }}>{overallSEO}<span style={{ fontSize: 14, color: 'var(--text-light)', fontWeight: 500 }}>/100</span></div>
                     </div>
                     <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {tab === 'videos' ? (
                          <>
                           <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Performance</div>
                           <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}><Eye size={12} style={{ display: 'inline', marginBottom: -2 }}/> {formatCount(selectedAsset.viewCount)} · <MessageSquare size={12} style={{ display: 'inline', marginBottom: -2 }}/> {formatCount(selectedAsset.commentCount)}</div>
                          </>
                        ) : (
                          <>
                           <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Size</div>
                           <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}><ListVideo size={12} style={{ display: 'inline', marginBottom: -2 }}/> {selectedAsset.itemCount} Videos</div>
                          </>
                        )}
                     </div>
                  </div>

                  {/* Component Breakdown */}
                  <div>
                     <h4 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Metadata Diagnostics</h4>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                       {[
                         { label: "Title", analysis: titleAnalysis, icon: Type },
                         { label: "Description", analysis: descAnalysis, icon: AlignLeft },
                         { label: "Tags", analysis: tagAnalysis, icon: Tags }
                       ].map(({ label, analysis, icon: IconComponent }) => (
                         <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                             <IconComponent size={14} color="var(--text-muted)" />
                             <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{label}</span>
                           </div>
                           <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                             {analysis.issues.length > 0 ? (
                               <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--error-text)', background: 'var(--error-bg)', padding: '2px 6px', borderRadius: 12 }}>{analysis.issues.length} Flag{analysis.issues.length > 1 && 's'}</span>
                             ) : (
                               <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--success-text)', background: 'var(--success-bg)', padding: '2px 6px', borderRadius: 12 }}>OK</span>
                             )}
                             <span style={{ fontSize: 13, fontWeight: 700, color: getScoreColor(analysis.score), width: 24, textAlign: 'right' }}>{analysis.score}</span>
                           </div>
                         </div>
                       ))}
                     </div>
                  </div>

                  {/* Action Plan */}
                  <div>
                    <h4 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Sparkles size={12} className="text-gradient" /> Next Actions</h4>
                    {actionPlan.length === 0 ? (
                      <div style={{ padding: 16, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>Fully optimized. No actions required.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {actionPlan.slice(0, 4).map((item, i) => (
                          <div key={i} style={{ padding: 16, background: 'var(--bg)', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                               <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', marginBottom: 4, background: 'var(--surface-hover)', display: 'inline-block', padding: '2px 6px', borderRadius: 4 }}>Optimize {item.field}</div>
                               <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>{item.issue}</div>
                            </div>
                            <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(item.field)} style={{ alignSelf: 'flex-start', fontSize: 11, padding: '4px 12px' }}>Fix in Context Menu</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

               </div>

               {/* Footer Actions */}
               <div style={{ padding: 16, borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', gap: 12 }}>
                  <button className="btn btn-secondary" style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 6 }} onClick={() => window.open(tab === 'videos' ? `https://youtube.com/watch?v=${selectedAsset.id}` : `https://youtube.com/playlist?list=${selectedAsset.id}`, '_blank')}>
                    <ExternalLink size={16} /> Live
                  </button>
                  <button className="btn btn-primary" style={{ flex: 2, display: 'flex', justifyContent: 'center', gap: 6 }} onClick={() => {
                     if (tab === "videos") { setEditingVideoId(selectedAsset.id?.videoId || selectedAsset.id); setPage("editvideo"); }
                     else { if (setPreviousPage) setPreviousPage("myvideos"); if (setEditingPlaylistId) setEditingPlaylistId(selectedAsset.id); if (setPage) setPage("editplaylist"); }
                  }}>
                    <Edit3 size={16} /> Open Studio Editor
                  </button>
               </div>
            </div>
            </>
         )}
      </div>

      {/* FLOATING SLEEK MODAL FOR QUICK AI FIXES */}
      {editModal.isOpen && (
        <div className="modal-overlay" onClick={() => setEditModal({ isOpen: false, field: null, value: "", targetObj: null, type: null })}>
          <div className="modal-content fade-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700, padding: 0, overflow: 'hidden' }}>
            
            <div style={{ background: 'var(--surface-hover)', padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h2 style={{ fontSize: 16, fontWeight: 600 }}>Resolve <span style={{ textTransform: 'capitalize' }}>{editModal.field}</span> Warning</h2>
               <button className="btn btn-secondary" style={{ padding: 4, border: 'none' }} onClick={() => setEditModal({ isOpen: false, field: null, value: "", targetObj: null, type: null })}><X size={16} /></button>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
               <div style={{ background: 'var(--bg)', border: '1px solid var(--accent)', padding: 16, borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                     <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6 }}><Wand2 size={14} /> AI Context Engine</div>
                     <button className="btn btn-ai btn-sm" onClick={geminiKey ? handleGenerateAI : handleLockedAI} disabled={(isGeneratingAI || cooldown > 0) && !!geminiKey}>
                       {isGeneratingAI ? <Spinner size={12} /> : geminiKey ? (cooldown > 0 ? `Wait ${cooldown}s` : "Generate Rewrite") : <><Lock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Unlock AI</>}
                     </button>
                  </div>
                  {aiSuggestions.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {aiSuggestions.map((sug, idx) => (
                         <div key={idx} style={{ background: 'var(--surface)', padding: 12, borderRadius: 6, border: '1px solid var(--border)', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                           <div style={{ flex: 1, paddingRight: 12, lineHeight: 1.5 }}>{sug}</div>
                           <button className="btn btn-secondary btn-sm" style={{ flexShrink: 0, background: 'var(--text)', color: 'var(--bg)' }} onClick={() => setEditModal({ ...editModal, value: sug })}>Replace</button>
                         </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Click generate for context-aware optimizations based on channel metrics.</div>
                  )}
               </div>

               <div>
                 <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>Active {editModal.field}</label>
                 {editModal.field === "description" ? (
                   <textarea className="form-input" rows={6} value={editModal.value} onChange={e => setEditModal({ ...editModal, value: e.target.value })} style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }} />
                 ) : (
                   <input type="text" className="form-input" value={editModal.value} onChange={e => setEditModal({ ...editModal, value: e.target.value })} />
                 )}
               </div>

               {apiError && <div style={{ color: "var(--error-text)", fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}><AlertTriangle size={14} /> {apiError}</div>}
            </div>

            <div style={{ padding: '16px 24px', display: "flex", justifyContent: "flex-end", gap: 12, borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
              <button className="btn btn-secondary" onClick={() => setEditModal({ isOpen: false, field: null, value: "", targetObj: null, type: null })} disabled={isSaving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveToYouTube} disabled={isSaving}>
                {isSaving ? <Spinner size={16} /> : "Save Override"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}