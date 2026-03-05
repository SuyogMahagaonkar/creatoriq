import React, { useState, useEffect } from "react";
import { 
  Video, ListVideo, Search, Eye, ThumbsUp, MessageSquare, Clock, Youtube, 
  Sparkles, AlertTriangle, CheckCircle2, Edit3, Type, AlignLeft, Tags, X, Wand2, Save, Layers, ChevronLeft, BarChart2 ,ChevronRight
} from "lucide-react";
import { VideoCard, PlaylistCard, ExpandableText, ScoreCircle, SuggestionCard, Spinner } from "../components/Shared";
import { analyzeTitle, analyzeDescription, analyzeTags, getScoreColor, getScoreLabel, formatCount, timeAgo } from "../utils";
import { fetchPlaylistVideos, fetchGeminiSuggestions, updateYouTubeMetadata } from "../api";

export default function MyVideosPage({ videos, playlists, setVideos, setPlaylists, accessToken, setPage, setEditingVideoId, setEditingPlaylistId, setPreviousPage }) {
  const [tab, setTab] = useState("videos"); 
  const [query, setQuery] = useState("");
  // Pagination States
  const ITEMS_PER_PAGE = 12; // 12 is great because it divides evenly into 2, 3, or 4 column grids!
  const [videoPage, setVideoPage] = useState(1);
  const [playlistPage, setPlaylistPage] = useState(1);

  // Reset to page 1 whenever the user types a new search or switches tabs
  useEffect(() => {
    setVideoPage(1);
    setPlaylistPage(1);
  }, [query, tab]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistVideos, setPlaylistVideos] = useState([]);
  const [loadingPlaylistVideos, setLoadingPlaylistVideos] = useState(false);
  
  // Modal & AI States
  const [editModal, setEditModal] = useState({ isOpen: false, field: null, value: "", targetObj: null, type: null });
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Load Playlist Videos when a playlist is selected for SEO audit
  useEffect(() => {
    if (tab === "playlist-seo" && selectedPlaylist) {
      let isMounted = true;
      setLoadingPlaylistVideos(true);
      fetchPlaylistVideos(selectedPlaylist.id)
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
  }, [selectedPlaylist, tab]);

  // Handle cooldown tick
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    } else if (cooldown === 0 && apiError.includes("Free tier limit")) {
      setApiError("");
    }
    return () => clearTimeout(timer);
  }, [cooldown, apiError]);

  const filteredVideos = videos.filter(v => !query || v.title.toLowerCase().includes(query.toLowerCase()));
  const filteredPlaylists = playlists.filter(p => !query || p.title.toLowerCase().includes(query.toLowerCase()));
  // Video Pagination Math
  const totalVideoPages = Math.ceil(filteredVideos.length / ITEMS_PER_PAGE);
  const paginatedVideos = filteredVideos.slice((videoPage - 1) * ITEMS_PER_PAGE, videoPage * ITEMS_PER_PAGE);

  // Playlist Pagination Math
  const totalPlaylistPages = Math.ceil(filteredPlaylists.length / ITEMS_PER_PAGE);
  const paginatedPlaylists = filteredPlaylists.slice((playlistPage - 1) * ITEMS_PER_PAGE, playlistPage * ITEMS_PER_PAGE);
  
  // Target obj is either the selected video or the selected playlist
  const targetObj = tab === "video-seo" ? selectedVideo : (tab === "playlist-seo" ? selectedPlaylist : null);
  const objType = tab === "video-seo" ? "video" : "playlist";

  const titleAnalysis = targetObj ? analyzeTitle(targetObj.title) : null;
  const descAnalysis = targetObj ? analyzeDescription(targetObj.description) : null;
  const tagAnalysis = targetObj ? analyzeTags(targetObj.tags) : null;
  const overallSEO = targetObj ? Math.round((titleAnalysis.score + descAnalysis.score + tagAnalysis.score) / 3) : null;

  const actionPlan = targetObj ? [
    ...titleAnalysis.issues.map(issue => ({ field: "title", issue })),
    ...descAnalysis.issues.map(issue => ({ field: "description", issue })),
    ...tagAnalysis.issues.map(issue => ({ field: "tags", issue }))
  ] : [];

  const openEditModal = (field) => {
    if (!accessToken) {
      alert("You need to sign in with Google to enable writing changes to YouTube.");
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
        setApiError(`Free tier limit reached. Please wait ${secs} seconds.`);
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
        setSelectedVideo(updatedItem);
        setPlaylistVideos(prev => prev.map(v => v.id === updatedItem.id ? updatedItem : v));
      } else {
        setPlaylists(prev => prev.map(p => p.id === updatedItem.id ? updatedItem : p));
        setSelectedPlaylist(updatedItem);
      }
      setEditModal({ isOpen: false, field: null, value: "", targetObj: null, type: null });
    } catch (err) { 
      setApiError(err.message); 
    } finally { 
      setIsSaving(false); 
    }
  };

  return (
    <div className="page fade-in" style={{ paddingBottom: 60, maxWidth: 1400, margin: '0 auto' }}>
      
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
        <div>
          <h1 className="heading-xl mb-8" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BarChart2 color="var(--accent)" size={32} /> Content Library & SEO
          </h1>
          <p className="text-muted text-sm">Audit your videos and playlists, and apply AI-driven SEO fixes directly to YouTube.</p>
        </div>
      </div>

      {/* --- GRID VIEWS (VIDEOS & PLAYLISTS) --- */}
      {(tab === "videos" || tab === "playlists") && (
        <div className="fade-in">
          {/* Controls Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
            {/* Modern Segmented Control */}
            <div style={{ display: 'flex', background: 'var(--surface-2)', padding: 4, borderRadius: 12, border: '1px solid var(--border)' }}>
              <button 
                onClick={() => { setTab("videos"); setQuery(""); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', background: tab === 'videos' ? 'var(--card)' : 'transparent', color: tab === 'videos' ? 'var(--text)' : 'var(--text-muted)', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: tab === 'videos' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: '0.2s' }}
              >
                <Video size={16} /> Videos ({videos.length})
              </button>
              <button 
                onClick={() => { setTab("playlists"); setQuery(""); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', background: tab === 'playlists' ? 'var(--card)' : 'transparent', color: tab === 'playlists' ? 'var(--text)' : 'var(--text-muted)', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: tab === 'playlists' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: '0.2s' }}
              >
                <ListVideo size={16} /> Playlists ({playlists.length})
              </button>
            </div>

            {/* Search Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--card)', padding: '10px 16px', borderRadius: 12, border: '1px solid var(--border)', flex: '1 1 300px', maxWidth: 400 }}>
              <Search size={18} color="var(--text-muted)" />
              <input 
                type="text" 
                placeholder={`Search ${tab}...`} 
                value={query} 
                onChange={e => setQuery(e.target.value)} 
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 14, width: '100%', color: 'var(--text)' }} 
              />
            </div>
          </div>

          {/* Grids */}
          {tab === "videos" && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
                {paginatedVideos.map(v => (
                    <div key={v.id} onClick={() => { setSelectedVideo(v); setTab("video-seo"); }} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                    <VideoCard video={v} />
                    </div>
                ))}
                </div>

                {/* VIDEO PAGINATION CONTROLS */}
                {totalVideoPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 32 }}>
                    <button 
                    className="btn btn-secondary" 
                    disabled={videoPage === 1} 
                    onClick={() => setVideoPage(p => p - 1)}
                    style={{ opacity: videoPage === 1 ? 0.5 : 1, padding: '8px 16px', borderRadius: 8 }}
                    >
                    <ChevronLeft size={16} /> Previous
                    </button>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                    Page {videoPage} of {totalVideoPages}
                    </span>
                    <button 
                    className="btn btn-secondary" 
                    disabled={videoPage === totalVideoPages} 
                    onClick={() => setVideoPage(p => p + 1)}
                    style={{ opacity: videoPage === totalVideoPages ? 0.5 : 1, padding: '8px 16px', borderRadius: 8 }}
                    >
                    Next <ChevronRight size={16} />
                    </button>
                </div>
                )}

                {paginatedVideos.length === 0 && <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}><Video size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }}/> No videos found.</div>}
            </>
          )}

          {tab === "playlists" && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
                {paginatedPlaylists.map(p => (
                    <div key={p.id} onClick={() => { setSelectedPlaylist(p); setTab("playlist-seo"); }} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                    <PlaylistCard playlist={p} />
                    </div>
                ))}
                </div>

                {/* PLAYLIST PAGINATION CONTROLS */}
                {totalPlaylistPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 32 }}>
                    <button 
                    className="btn btn-secondary" 
                    disabled={playlistPage === 1} 
                    onClick={() => setPlaylistPage(p => p - 1)}
                    style={{ opacity: playlistPage === 1 ? 0.5 : 1, padding: '8px 16px', borderRadius: 8 }}
                    >
                    <ChevronLeft size={16} /> Previous
                    </button>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                    Page {playlistPage} of {totalPlaylistPages}
                    </span>
                    <button 
                    className="btn btn-secondary" 
                    disabled={playlistPage === totalPlaylistPages} 
                    onClick={() => setPlaylistPage(p => p + 1)}
                    style={{ opacity: playlistPage === totalPlaylistPages ? 0.5 : 1, padding: '8px 16px', borderRadius: 8 }}
                    >
                    Next <ChevronRight size={16} />
                    </button>
                </div>
                )}

                {paginatedPlaylists.length === 0 && <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}><ListVideo size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }}/> No playlists found.</div>}
            </>
          )}
        </div>
      )}

      {/* --- SEO AUDIT WORKSPACE (Split Layout) --- */}
      {(tab === "video-seo" || tab === "playlist-seo") && targetObj && (
        <div className="fade-in">
          
          {/* Breadcrumb / Back Button */}
          <button 
            onClick={() => { setTab(tab === "video-seo" ? "videos" : "playlists"); setSelectedVideo(null); setSelectedPlaylist(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginBottom: 24, padding: 0 }}
          >
            <ChevronLeft size={18} /> Back to Library
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) minmax(400px, 1.5fr)', gap: 32, alignItems: 'start' }}>
            
            {/* LEFT COLUMN: Asset Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {/* Asset Header Card */}
              <div style={{ background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden' }}>
                {targetObj.thumbnail ? (
                  <img src={targetObj.thumbnail} alt="Thumbnail" style={{ width: '100%', height: 'auto', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ width: '100%', aspectRatio: '16/9', background: 'var(--surface-2)' }} />
                )}
                <div style={{ padding: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--accent)', background: 'rgba(10, 102, 194, 0.1)', padding: '4px 10px', borderRadius: 12 }}>
                      {tab === "playlist-seo" ? "Playlist" : "Video"}
                    </div>
                    <a href={tab === "playlist-seo" ? `https://youtube.com/playlist?list=${targetObj.id}` : `https://youtube.com/watch?v=${targetObj.id}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                      <Youtube size={16} /> View Live
                    </a>
                  </div>
                  
                  <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, lineHeight: 1.3, color: 'var(--text)' }}>{targetObj.title}</h2>
                  
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
                    {tab === "video-seo" ? (
                      <>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}><Eye size={16} color="var(--text-light)" /> {formatCount(targetObj.viewCount)}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}><ThumbsUp size={16} color="var(--text-light)" /> {formatCount(targetObj.likeCount)}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}><MessageSquare size={16} color="var(--text-light)" /> {formatCount(targetObj.commentCount)}</span>
                      </>
                    ) : (
                      <>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}><ListVideo size={16} color="var(--text-light)" /> {targetObj.itemCount} items</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}><Clock size={16} color="var(--text-light)" /> Updated {timeAgo(targetObj.publishedAt)}</span>
                      </>
                    )}
                  </div>

                  <div style={{ paddingTop: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}><AlignLeft size={16}/> Description</h3>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, background: 'var(--surface-2)', padding: 12, borderRadius: 8 }}>
                      <ExpandableText text={targetObj.description} maxLength={200} />
                    </div>
                  </div>

                  {targetObj.tags && targetObj.tags.length > 0 && (
                    <div style={{ paddingTop: 20 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><Tags size={16}/> Tags</h3>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {targetObj.tags.map((tag, i) => <span key={i} style={{ background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: 16, padding: "4px 10px", fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{tag}</span>)}
                      </div>
                    </div>
                  )}

                  {/* Deep Edit Actions */}
                  <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                    {tab === "video-seo" ? (
                      <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setEditingVideoId(targetObj.id?.videoId || targetObj.id); setPage("editvideo"); }}>
                        <Edit3 size={16} /> Advanced Edit
                      </button>
                    ) : (
                      <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { if(setPreviousPage) setPreviousPage("myvideos"); if(setEditingPlaylistId) setEditingPlaylistId(targetObj.id); if(setPage) setPage("editplaylist"); }}>
                        <Edit3 size={16} /> Manage Playlist
                      </button>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: SEO Engine & Action Plan */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {/* Overall Score Banner */}
              <div style={{ background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', padding: 24, display: 'flex', alignItems: 'center', gap: 24 }}>
                <ScoreCircle score={overallSEO} size={80} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Overall SEO Score</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: getScoreColor(overallSEO) }}>{getScoreLabel(overallSEO)}</div>
                  <p style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 4 }}>Based on Title, Description, and Tag optimization.</p>
                </div>
              </div>

              {/* AI Action Plan */}
              <div style={{ background: 'var(--surface-2)', borderRadius: 16, border: '1px solid var(--border)', padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ background: 'var(--accent)', padding: 8, borderRadius: 8 }}><Sparkles size={20} color="#fff" /></div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Optimization Action Plan</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Fix these issues to rank higher in search.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {actionPlan.slice(0, 6).map((item, i) => (
                    <div key={i} style={{ background: 'var(--card)', padding: 16, borderRadius: 12, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#D95C00', textTransform: 'uppercase', marginBottom: 4 }}>
                          <AlertTriangle size={12} /> Optimization Required
                        </div>
                        <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{item.issue}</div>
                      </div>
                      <button className="btn btn-secondary btn-sm" style={{ flexShrink: 0, borderRadius: 20 }} onClick={() => openEditModal(item.field)}>
                        Fix {item.field}
                      </button>
                    </div>
                  ))}
                  {actionPlan.length === 0 && (
                    <div style={{ background: "rgba(5, 118, 66, 0.1)", border: "1px solid rgba(5, 118, 66, 0.2)", borderRadius: 12, padding: 20, textAlign: 'center', color: "#057642", fontWeight: 600 }}>
                      <CheckCircle2 size={24} style={{ display: "block", margin: '0 auto 8px' }}/> All metadata looks perfectly optimized!
                    </div>
                  )}
                </div>
              </div>

              {/* Detailed Category Scores */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                {[
                  { label: "Title", analysis: titleAnalysis, icon: Type }, 
                  { label: "Description", analysis: descAnalysis, icon: AlignLeft }, 
                  { label: "Tags", analysis: tagAnalysis, icon: Tags }
                ].map(({ label, analysis, icon: IconComponent }) => (
                  <div key={label} style={{ background: 'var(--card)', padding: 20, borderRadius: 16, border: '1px solid var(--border)' }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}><IconComponent size={16}/> {label}</h3>
                      <ScoreCircle score={analysis.score} size={40} />
                    </div>
                    <div>
                      {analysis.issues.length > 0 ? (
                        <div style={{ fontSize: 13, color: "#CC1016", fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <AlertTriangle size={14} /> {analysis.issues.length} Issue{analysis.issues.length > 1 ? 's' : ''}
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, color: "#057642", fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <CheckCircle2 size={14} /> Optimized
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* PLAYLIST VIDEOS SECTION (Bottom full width) */}
          {tab === "playlist-seo" && (
            <div style={{ background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', padding: 24, marginTop: 32 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}><Layers size={20} color="var(--accent)" /> Playlist Videos</h3>
              {loadingPlaylistVideos ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <Spinner size={32} /><br/><span className="text-muted" style={{ marginTop: 16, display: 'inline-block' }}>Loading playlist videos...</span>
                </div>
              ) : playlistVideos.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
                  {playlistVideos.map(v => (
                    <div key={v.id} onClick={() => { setSelectedVideo(v); setTab("video-seo"); }} style={{ cursor: 'pointer' }}>
                      <VideoCard video={v} />
                    </div>
                  ))}
                </div>
              ) : <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-light)" }}>No videos found in this playlist.</div>}
            </div>
          )}

        </div>
      )}

      {/* EDIT MODAL */}
      {editModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 700 ,padding:'inherted'}}>
            <div className="modal-header" style={{ paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}><Edit3 size={20} color="var(--accent)" /> Edit {editModal.field.charAt(0).toUpperCase() + editModal.field.slice(1)}</h2>
              <button className="modal-close" onClick={() => setEditModal({ isOpen: false, field: null, value: "", targetObj: null, type: null })}><X size={24} /></button>
            </div>
            
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Current Data</label>
                {editModal.field === "tags" && <p style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 8 }}>Separate tags with commas (e.g., react, javascript, tutorial)</p>}
                {editModal.field === "description" ? (
                  <textarea className="form-input" rows={8} value={editModal.value} onChange={e => setEditModal({...editModal, value: e.target.value})} style={{ marginBottom: 0, fontFamily: 'monospace', fontSize: 13 }} />
                ) : (
                  <input type="text" className="form-input" value={editModal.value} onChange={e => setEditModal({...editModal, value: e.target.value})} style={{ marginBottom: 0, fontSize: 14 }} />
                )}
              </div>
              
              <div style={{ background: 'rgba(10, 102, 194, 0.05)', padding: 24, borderRadius: 12, border: '1px solid rgba(10, 102, 194, 0.15)' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: aiSuggestions.length > 0 ? 20 : 0, flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ background: 'var(--accent)', padding: 6, borderRadius: 8 }}><Wand2 size={16} color="#fff" /></div>
                      <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 16 }}>AI Optimization Assistant</span>
                    </div>
                    <button 
                        className="btn btn-primary btn-sm" 
                        onClick={handleGenerateAI} 
                        disabled={isGeneratingAI || cooldown > 0} 
                        style={{ borderRadius: 20 }}
                        >
                        {isGeneratingAI ? <Spinner size={14} /> : 
                        cooldown > 0 ? <><Clock size={14} style={{marginRight: 6}}/> Wait {cooldown}s</> : 
                        <><Sparkles size={14} style={{marginRight: 6}}/> Generate Fixes</>}
                    </button>
                 </div>
                 
                 {aiSuggestions.length > 0 && (
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                     {aiSuggestions.map((sug, idx) => <SuggestionCard key={idx} text={sug} onApply={(text) => setEditModal({...editModal, value: text})} />)}
                   </div>
                 )}
              </div>
            </div>
            
            {apiError && (
            <div style={{ background: "#FDE8E9", color: "#CC1016", padding: 16, borderRadius: 8, fontSize: 13, marginBottom: 24, border: '1px solid #F1B2B5', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={16} />
                <div><strong>{apiError.includes("quota") || apiError.includes("generativelanguage") ? "AI Generation Error:" : "YouTube API Error:"}</strong> {apiError}</div>
            </div>
            )}

            <div style={{ padding: '24px',display: "flex", justifyContent: "flex-end", gap: 12, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-secondary" onClick={() => setEditModal({ isOpen: false, field: null, value: "", targetObj: null, type: null })} disabled={isSaving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveToYouTube} disabled={isSaving}>
                {isSaving ? <Spinner size={16} /> : <><Save size={16} /> Update YouTube</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}