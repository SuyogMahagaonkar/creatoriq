import React, { useState, useEffect, useRef, useContext } from 'react';
import { Edit3, Save, Video, Image as ImageIcon, Subtitles, List, AlertTriangle, CheckCircle2, Globe, Hash, ArrowLeft, ImagePlus, Sparkles, Wand2, X, PlayCircle, BarChart2, Search, ChevronLeft, ChevronRight, Eye, ThumbsUp, MessageSquare, Info, Lock } from 'lucide-react';
import { fetchSingleVideo, updateVideoMetadata, uploadCustomThumbnail, uploadCaptionTrack, fetchPlaylists, addVideoToPlaylist, generateAIThumbnail, analyzeThumbnailWithAI, checkVideoInPlaylist, removeVideoFromPlaylist, generateFreshSEO } from '../api';
import { CreatorContext } from '../context/CreatorContext';
import { Spinner, ScoreCircle } from '../components/Shared';
import { getScoreColor } from '../utils';

export default function EditVideoPage({ videoId, setPage }) {
  const { geminiKey, setIsSettingsOpen, setSettingsTab } = useContext(CreatorContext);
  const handleLockedAI = () => { setSettingsTab('ai'); setIsSettingsOpen(true); };

  const [rawVideo, setRawVideo] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [tags, setTags] = useState("");
  const [categoryId, setCategoryId] = useState("22");
  const [privacy, setPrivacy] = useState("public");
  const [defaultLanguage, setDefaultLanguage] = useState("en");
  const [audioLanguage, setAudioLanguage] = useState("en");

  const [thumbs, setThumbs] = useState([
    { preview: null, file: null, analysis: null, winner: true, isLive: true, prompt: "", generating: false, analyzing: false },
    { preview: null, file: null, analysis: null, winner: false, isLive: false, prompt: "", generating: false, analyzing: false },
    { preview: null, file: null, analysis: null, winner: false, isLive: false, prompt: "", generating: false, analyzing: false }
  ]);
  const [activeThumbIdx, setActiveThumbIdx] = useState(null);

  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);

  const [captionFile, setCaptionFile] = useState(null);

  const [targetKeyword, setTargetKeyword] = useState("");
  const [suggestedKeywords, setSuggestedKeywords] = useState([]);
  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false);
  const [isGeneratingChapters, setIsGeneratingChapters] = useState(false);

  const [allPlaylists, setAllPlaylists] = useState([]);
  const [playlistSearch, setPlaylistSearch] = useState("");
  const [initialPlaylists, setInitialPlaylists] = useState({});
  const [selectedPlaylists, setSelectedPlaylists] = useState(new Set());
  const [scanningPlaylists, setScanningPlaylists] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const playlistsPerPage = 10;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [draftData, setDraftData] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    fetchPlaylists(50).then(data => { if (data) setAllPlaylists(data); }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!videoId) { setError("No video selected."); setLoading(false); return; }

    const loadData = async () => {
      setLoading(true); setError(""); setSuccess("");
      try {
        const data = await fetchSingleVideo(videoId);
        setRawVideo(data);

        const draftKey = `creator_iq_edit_draft_${videoId}`;
        const draftStr = localStorage.getItem(draftKey);
        if (draftStr) {
          try { setDraftData(JSON.parse(draftStr)); } catch (e) { }
        }

        setTitle(data.snippet.title || "");

        setThumbs(prev => {
          const newT = [...prev];
          newT[0].preview = `https://img.youtube.com/vi/${data.id}/maxresdefault.jpg`;
          return newT;
        });

        const descText = data.snippet.description || "";
        const hashMatch = descText.match(/(#\w+\s*)+$/);
        if (hashMatch) {
          setHashtags(hashMatch[0].trim());
          setDescription(descText.replace(/(#\w+\s*)+$/, "").trim());
        } else {
          setDescription(descText);
          setHashtags("");
        }

        setTags(data.snippet.tags ? data.snippet.tags.join(", ") : "");
        setCategoryId(data.snippet.categoryId || "28");
        setPrivacy(data.status.privacyStatus || "public");
        setDefaultLanguage(data.snippet.defaultLanguage || "en");
        setAudioLanguage(data.snippet.defaultAudioLanguage || "en-IN");

        setTimeout(() => setIsDataLoaded(true), 1000);
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    };
    loadData();
  }, [videoId]);

  useEffect(() => {
    let isMounted = true;
    if (rawVideo?.id && allPlaylists.length > 0) {
      const scanPlaylists = async () => {
        setScanningPlaylists(true);
        const initialMap = {};
        const activeSet = new Set();
        for (const p of allPlaylists) {
          if (!isMounted) break;
          const result = await checkVideoInPlaylist(p.id, rawVideo.id);
          if (result.exists) {
            initialMap[p.id] = result.playlistItemId; 
            activeSet.add(p.id); 
          }
        }
        if (isMounted) {
          setInitialPlaylists(initialMap);
          setSelectedPlaylists(activeSet);
          setScanningPlaylists(false);
        }
      };
      scanPlaylists();
    }
    return () => { isMounted = false; };
  }, [rawVideo?.id, allPlaylists]);

  useEffect(() => {
    setCurrentPage(1);
  }, [playlistSearch]);

  useEffect(() => {
    if (!isDataLoaded || !videoId || !rawVideo) return;
    const draftKey = `creator_iq_edit_draft_${videoId}`;
    const descText = rawVideo.snippet.description || "";
    const hashMatch = descText.match(/(#\w+\s*)+$/);
    const snipDesc = hashMatch ? descText.replace(/(#\w+\s*)+$/, "").trim() : descText;
    const snipHash = hashMatch ? hashMatch[0].trim() : "";

    if (title !== (rawVideo.snippet.title || "") || description !== snipDesc || hashtags !== snipHash || tags !== (rawVideo.snippet.tags?.join(", ") || "")) {
      localStorage.setItem(draftKey, JSON.stringify({ title, description, hashtags, tags, categoryId, privacy }));
    } else {
      localStorage.removeItem(draftKey);
    }
  }, [title, description, hashtags, tags, categoryId, privacy, isDataLoaded, videoId, rawVideo]);

  const handleRestoreDraft = () => {
    if (!draftData) return;
    setTitle(draftData.title || "");
    setDescription(draftData.description || "");
    setHashtags(draftData.hashtags || "");
    setTags(draftData.tags || "");
    setCategoryId(draftData.categoryId || "28");
    setPrivacy(draftData.privacy || "public");
    setDraftData(null);
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem(`creator_iq_edit_draft_${videoId}`);
    setDraftData(null);
  };

  const togglePlaylist = (playlistId) => {
    const newSet = new Set(selectedPlaylists);
    if (newSet.has(playlistId)) {
      newSet.delete(playlistId);
    } else {
      newSet.add(playlistId);
    }
    setSelectedPlaylists(newSet);
  };

  const updateThumb = (idx, updates) => {
    setThumbs(prev => prev.map((t, i) => i === idx ? { ...t, ...updates } : t));
  };

  const handleClearThumbnail = (idx) => {
    updateThumb(idx, { file: null, preview: null, analysis: null, prompt: "" });
  };

  const handleThumbUpload = (e) => {
    const imgFile = e.target.files[0];
    if (!imgFile) return;
    updateThumb(activeThumbIdx, { file: imgFile, preview: URL.createObjectURL(imgFile), analysis: null });
  };

  const handleGenerateThumbAI = async () => {
    const prompt = thumbs[activeThumbIdx]?.prompt;
    if (!prompt) return setError("Please enter an image prompt first.");
    updateThumb(activeThumbIdx, { generating: true }); setError("");
    try {
      const base64Str = await generateAIThumbnail(prompt);
      const dataUrl = `data:image/jpeg;base64,${base64Str}`;
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      updateThumb(activeThumbIdx, { preview: dataUrl, file: new File([blob], "ai_thumb.jpg", { type: "image/jpeg" }), analysis: null });
    } catch (err) { setError(err.message); }
    finally { updateThumb(activeThumbIdx, { generating: false }); }
  };

  const handleAnalyzeAllCandidates = async () => {
    const runners = thumbs.filter(t => t.file || t.isLive);
    if (runners.length === 0) return setError("Add at least one thumbnail to analyze.");
    setThumbs(prev => prev.map(t => (!t.analysis && (t.file || t.isLive)) ? { ...t, analyzing: true } : t));
    setError("");

    const newThumbs = [...thumbs];
    await Promise.all(newThumbs.map(async (t, i) => {
      if (t.analysis || (!t.file && !t.isLive)) return;
      return new Promise((resolve) => {
        if (t.isLive) {
          newThumbs[i].analysis = { score: 75, feedback: ["Live Image"] };
          newThumbs[i].analyzing = false;
          resolve();
        } else {
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              newThumbs[i].analysis = await analyzeThumbnailWithAI(reader.result.split(',')[1], t.file.type);
            } catch (err) { }
            finally {
              newThumbs[i].analyzing = false;
              resolve();
            }
          };
          reader.readAsDataURL(t.file);
        }
      });
    }));

    setThumbs(newThumbs);
    const sorted = [...newThumbs].map((t, idx) => ({ ...t, originalIndex: idx })).filter(t => t.analysis).sort((a, b) => b.analysis.score - a.analysis.score);
    if (sorted.length > 0) handleSetWinner(sorted[0].originalIndex);
  };

  const handleSetWinner = (idx) => {
    setThumbs(prev => prev.map((t, i) => ({ ...t, winner: i === idx })));
  };

  const handleOptimizeTitle = async () => {
    setIsGeneratingTitle(true); setError("");
    try {
      const resp = await generateFreshSEO("title", title || (rawVideo ? rawVideo.snippet.title : "My video"), "", "");
      setTitle(Array.isArray(resp) ? resp[0] : String(resp));
    } catch (e) { setError(e.message); }
    finally { setIsGeneratingTitle(false); }
  };

  const handleOptimizeDesc = async () => {
    setIsGeneratingDesc(true); setError("");
    try {
      const resp = await generateFreshSEO("description", title || (rawVideo ? rawVideo.snippet.title : "My video"), "", title);
      setDescription(Array.isArray(resp) ? resp[0] : String(resp));
    } catch (e) { setError(e.message); }
    finally { setIsGeneratingDesc(false); }
  };

  const handleOptimizeTags = async () => {
    setIsGeneratingTags(true); setError("");
    try {
      const resp = await generateFreshSEO("tags", title, title, description);
      setTags(Array.isArray(resp) ? resp.join(", ") : String(resp));
    } catch (e) { setError(e.message); }
    finally { setIsGeneratingTags(false); }
  };

  const handleOptimizeKeywords = async () => {
    if (!targetKeyword.trim()) return setError("Please enter a Target Keyword first.");
    setIsGeneratingKeywords(true); setError(""); setSuggestedKeywords([]);
    try {
      const resp = await generateFreshSEO("long_tail_keywords", targetKeyword);
      setSuggestedKeywords(Array.isArray(resp) ? resp : []);
    } catch (e) { setError(e.message); }
    finally { setIsGeneratingKeywords(false); }
  };

  const handleGenerateChapters = async () => {
    setIsGeneratingChapters(true); setError("");
    try {
      const topic = title || (rawVideo ? rawVideo.snippet.title : "My video");
      const duration = rawVideo?.contentDetails?.duration || "Unknown";
      const resp = await generateFreshSEO("chapters", topic, "", description, duration);
      const chaptersStr = Array.isArray(resp) ? resp.join("\n") : String(resp);
      setDescription(prev => prev ? `${prev}\n\nChapters:\n${chaptersStr}` : `Chapters:\n${chaptersStr}`);
    } catch (e) { setError(e.message); }
    finally { setIsGeneratingChapters(false); }
  };

  const handleSave = async () => {
    if (!rawVideo) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      const finalDescription = hashtags.trim() ? `${description.trim()}\n\n${hashtags.trim()}` : description.trim();
      const updatedVideo = {
        id: rawVideo.id,
        snippet: {
          ...rawVideo.snippet, title: title, description: finalDescription,
          tags: tags.split(",").map(t => t.trim()).filter(Boolean),
          categoryId: categoryId, defaultLanguage: defaultLanguage, defaultAudioLanguage: audioLanguage
        },
        status: { ...rawVideo.status, privacyStatus: privacy }
      };

      await updateVideoMetadata(updatedVideo);

      const winnerThumb = thumbs.find(t => t.winner);
      if (winnerThumb && winnerThumb.file && !winnerThumb.isLive) {
        await uploadCustomThumbnail(rawVideo.id, winnerThumb.file);
      }

      if (captionFile) await uploadCaptionTrack(rawVideo.id, audioLanguage, captionFile);

      const playlistsToAdd = [...selectedPlaylists].filter(id => !initialPlaylists[id]);
      const playlistsToRemove = Object.keys(initialPlaylists).filter(id => !selectedPlaylists.has(id));

      const newInitialMap = { ...initialPlaylists };

      for (const id of playlistsToAdd) {
        const addedItem = await addVideoToPlaylist(id, rawVideo.id);
        newInitialMap[id] = addedItem.id;
      }

      for (const id of playlistsToRemove) {
        if (initialPlaylists[id]) {
          await removeVideoFromPlaylist(initialPlaylists[id]);
          delete newInitialMap[id];
        }
      }

      setInitialPlaylists(newInitialMap);
      setSuccess(`Video updated globally.`);
      setCaptionFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredPlaylists = allPlaylists.filter(p => p.title.toLowerCase().includes(playlistSearch.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filteredPlaylists.length / playlistsPerPage));
  const startIndex = (currentPage - 1) * playlistsPerPage;
  const currentPlaylists = filteredPlaylists.slice(startIndex, startIndex + playlistsPerPage);

  const formatStat = (num) => num ? parseInt(num).toLocaleString() : "0";

  // --- SEO SCORE CALCULATION ---
  const calculateScore = () => {
    let score = 0;
    const checks = [];

    // Title Length (20)
    const tLen = title.length;
    if (tLen >= 20 && tLen <= 60) {
      score += 20; checks.push({ text: "Title length between 20-60 chars (Optimal)", passed: true });
    } else {
      checks.push({ text: `Title is ${tLen} chars (Aim for 20-60)`, passed: false });
    }

    // Target Keyword in Title (20)
    const normalizedKeyword = targetKeyword.trim().toLowerCase();
    if (normalizedKeyword && title.toLowerCase().includes(normalizedKeyword)) {
      score += 20; checks.push({ text: "Target Keyword in Title", passed: true });
    } else {
      checks.push({ text: "Target Keyword in Title", passed: false });
    }

    // Target Keyword in First 150 Chars of Desc (20)
    const topDesc = description.substring(0, 150).toLowerCase();
    if (normalizedKeyword && topDesc.includes(normalizedKeyword)) {
      score += 20; checks.push({ text: "Keyword in first 2 lines of Description", passed: true });
    } else {
      checks.push({ text: "Missing Target Keyword early in Description", passed: false });
    }

    // Chapters (20)
    if (description.includes("00:00") || description.includes("0:00")) {
      score += 20; checks.push({ text: "Video Chapters included", passed: true });
    } else {
      checks.push({ text: "No Video Chapters (00:00)", passed: false });
    }

    // Hashtags & Tags (10 + 10 = 20)
    if (hashtags.length > 3) {
      score += 10; checks.push({ text: "Hashtags present", passed: true });
    } else {
      checks.push({ text: "Add hashtags to description", passed: false });
    }
    
    const tagsArr = tags.split(",").map(t => t.trim()).filter(Boolean);
    if (tagsArr.length >= 5) {
      score += 10; checks.push({ text: "5+ Search Tags added", passed: true });
    } else {
      checks.push({ text: "Less than 5 Search Tags", passed: false });
    }

    return { score, checks };
  };

  const seoData = calculateScore();

  return (
    <div className="page fade-in" style={{ paddingBottom: 60, maxWidth: 1400, margin: '0 auto' }}>
      
      <button onClick={() => setPage("myvideos")} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600, fontSize: 13, marginBottom: 24, padding: 0 }}>
        <ArrowLeft size={16} /> Content Library
      </button>

      <div className="header-split" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 24, marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 8, color: 'var(--text)' }}>Editor Studio</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Precision metadata and asset control.</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || !rawVideo || loading} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {saving ? <Spinner size={16} /> : <><Save size={16} /> Publish Changes</>}
        </button>
      </div>

      {draftData && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, border: '1px solid var(--success-border)', background: 'var(--success-bg)', borderRadius: 'var(--radius-md)', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CheckCircle2 color="var(--success-text)" size={20} />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--success-text)', fontSize: 14 }}>Draft Available</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Unsaved edits detected on this device.</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary btn-sm" onClick={handleDiscardDraft}>Discard</button>
            <button className="btn btn-primary btn-sm" onClick={handleRestoreDraft} style={{ background: 'var(--success-text)', borderColor: 'var(--success-text)', color: '#fff' }}>Restore</button>
          </div>
        </div>
      )}

      {error && <div style={{ padding: 16, background: 'var(--error-bg)', color: 'var(--error-text)', border: '1px solid var(--error-border)', borderRadius: 'var(--radius-md)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}><AlertTriangle size={16} /> {error}</div>}
      {success && <div style={{ padding: 16, background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-md)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle2 size={16} /> {success}</div>}

      {loading && <div style={{ padding: '80px 0', display: 'flex', justifyContent: 'center' }}><Spinner size={32} /></div>}

      {rawVideo && !loading && (
        <div className="page-grid-2col">

          {/* LEFT: Metadata & Thumbnails */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>

            {/* Core Metadata */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><Video size={18} className="text-muted" /> Video Details</h3>
              </div>
              
              {/* Target Keyword Tool */}
              <div style={{ background: 'var(--surface-hover)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                   <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Search size={14} /> Target Keyword</label>
                   <button className="btn btn-secondary btn-sm" onClick={geminiKey ? handleOptimizeKeywords : handleLockedAI} disabled={isGeneratingKeywords && !!geminiKey} style={{ padding: '4px 12px', fontSize: 11, border: 'none', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 4, ...(geminiKey ? {} : { color: 'var(--text-muted)' }) }}>
                     {isGeneratingKeywords ? <Spinner size={12} /> : geminiKey ? <><Wand2 size={12} /> Suggest Ideas</> : <><Lock size={12} /> Unlock AI</>}
                   </button>
                </div>
                <input className="form-input" value={targetKeyword} onChange={e => setTargetKeyword(e.target.value)} placeholder="e.g. 'iPhone 15 Review', 'How to bake a cake'" style={{ fontSize: 14, background: 'var(--bg)' }} />
                
                {suggestedKeywords.length > 0 && (
                  <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {suggestedKeywords.map((kw, i) => (
                      <span key={i} onClick={() => setTargetKeyword(kw)} style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: 16, fontSize: 11, cursor: 'pointer', transition: '0.2s' }}>{kw}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                   <label className="form-label">Title</label>
                   <button className="btn btn-secondary btn-sm" onClick={geminiKey ? handleOptimizeTitle : handleLockedAI} disabled={isGeneratingTitle && !!geminiKey} style={{ padding: '4px 12px', fontSize: 11, border: 'none', background: 'var(--surface-hover)', ...(geminiKey ? {} : { color: 'var(--text-muted)' }) }}>
                     {isGeneratingTitle ? <Spinner size={12} /> : geminiKey ? "Auto-Optimize" : <><Lock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Unlock AI</>}
                   </button>
                </div>
                <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} style={{ fontSize: 16, fontWeight: 500 }} />
              </div>

              <div className="form-group">
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                   <label className="form-label">Description</label>
                   <div style={{ display: 'flex', gap: 8 }}>
                     <button className="btn btn-secondary btn-sm" onClick={geminiKey ? handleGenerateChapters : handleLockedAI} disabled={isGeneratingChapters && !!geminiKey} title="Auto-Chapters" style={{ padding: '4px 12px', fontSize: 11, border: 'none', background: 'var(--surface-hover)', ...(geminiKey ? {} : { color: 'var(--text-muted)' }) }}>
                       {isGeneratingChapters ? <Spinner size={12} /> : geminiKey ? <><List size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Chapters</> : <><Lock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Unlock AI</>}
                     </button>
                     <button className="btn btn-secondary btn-sm" onClick={geminiKey ? handleOptimizeDesc : handleLockedAI} disabled={isGeneratingDesc && !!geminiKey} style={{ padding: '4px 12px', fontSize: 11, border: 'none', background: 'var(--surface-hover)', ...(geminiKey ? {} : { color: 'var(--text-muted)' }) }}>
                       {isGeneratingDesc ? <Spinner size={12} /> : geminiKey ? "Auto-Generate" : <><Lock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Unlock AI</>}
                     </button>
                   </div>
                 </div>
                <textarea className="form-input" rows={8} value={description} onChange={e => setDescription(e.target.value)} style={{ fontSize: 14, fontFamily: 'var(--font-mono)' }} />
              </div>

              <div className="form-row-2col">
                 <div className="form-group">
                   <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Hash size={14} /> Global Hashtags</label>
                   <input className="form-input" value={hashtags} onChange={e => setHashtags(e.target.value)} placeholder="#Tech #Review" />
                 </div>

                 <div className="form-group">
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                     <label className="form-label">Search Tags</label>
                     <span style={{ fontSize: 11, color: geminiKey ? 'var(--text-muted)' : 'var(--text-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }} onClick={geminiKey ? handleOptimizeTags : handleLockedAI}>
                       {geminiKey ? "Auto Extract" : <><Lock size={10} /> Unlock AI</>}
                     </span>
                   </div>
                   <input className="form-input" value={tags} onChange={e => setTags(e.target.value)} placeholder="Comma separated..." />
                 </div>
              </div>
            </div>

            {/* Thumbnail Studio */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><ImageIcon size={18} className="text-muted" /> A/B Thumbnails</h3>
                <button className="btn btn-secondary btn-sm" onClick={handleAnalyzeAllCandidates} disabled={thumbs.filter(t => t.file || t.isLive).length < 2} style={{ padding: '6px 12px' }}>
                  Analyze Variants
                </button>
              </div>

              <div className="thumb-grid-3">
                {thumbs.map((thumb, idx) => (
                  <div key={idx} onClick={() => setActiveThumbIdx(idx)} style={{ cursor: 'pointer' }}>
                    <div style={{ width: '100%', aspectRatio: '16/9', border: activeThumbIdx === idx ? '2px solid var(--accent)' : '2px solid transparent', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--surface)', position: 'relative', outline: '1px solid var(--border)' }}>
                      {thumb.preview ? (
                        <>
                          <img src={thumb.preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          {thumb.winner && <div style={{ position: 'absolute', top: 6, left: 6, background: 'var(--success-text)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>Winner</div>}
                          {thumb.analysis && (
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.7)', color: getScoreColor(thumb.analysis.score), padding: '4px 8px', fontSize: 12, fontWeight: 700, textAlign: 'center' }}>
                              Score: {thumb.analysis.score}
                            </div>
                          )}
                          {!thumb.isLive && (
                             <button onClick={(e) => { e.stopPropagation(); handleClearThumbnail(idx); }} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} /></button>
                          )}
                        </>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-light)' }}><ImagePlus size={20} /></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {activeThumbIdx !== null && !thumbs[activeThumbIdx].isLive && (
                <div className="fade-in" style={{ marginTop: 24 }}>
                  {!thumbs[activeThumbIdx].preview && (
                    <div style={{ display: 'flex', gap: 16 }}>
                      <label className="btn btn-secondary" style={{ flexShrink: 0, height: 40, cursor: 'pointer' }}>
                        <ImagePlus size={16} /> Upload Image
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleThumbUpload} />
                      </label>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 4 }}>
                         <input className="form-input" placeholder="Or enter AI prompt..." value={thumbs[activeThumbIdx].prompt} onChange={(e) => updateThumb(activeThumbIdx, { prompt: e.target.value })} style={{ border: 'none', height: '100%', background: 'transparent' }} disabled={!geminiKey} />
                         <button className="btn btn-ai btn-sm" onClick={geminiKey ? handleGenerateThumbAI : handleLockedAI} disabled={(thumbs[activeThumbIdx].generating || !thumbs[activeThumbIdx].prompt) && !!geminiKey} style={{ borderRadius: 'var(--radius-sm)' }}>
                           {thumbs[activeThumbIdx].generating ? <Spinner size={14} /> : geminiKey ? "Generate" : <><Lock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Unlock AI</>}
                         </button>
                      </div>
                    </div>
                  )}
                  {thumbs[activeThumbIdx].preview && thumbs[activeThumbIdx].analysis && (
                    <div style={{ marginTop: 16, background: 'var(--surface)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                       <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>AI Feedback</div>
                       <ul style={{ fontSize: 13, margin: '8px 0 0 16px', color: 'var(--text)' }}>
                         {thumbs[activeThumbIdx].analysis.feedback.map((f, i) => <li key={i}>{f}</li>)}
                       </ul>
                    </div>
                  )}
                  {thumbs[activeThumbIdx].preview && !thumbs[activeThumbIdx].winner && (
                     <button className="btn btn-secondary btn-sm" style={{ marginTop: 16 }} onClick={() => handleSetWinner(activeThumbIdx)}>Set as Winner Draft</button>
                   )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Distribution & Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

             <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
               <iframe width="100%" height="190" src={`https://www.youtube.com/embed/${rawVideo.id}`} frameBorder="0" allowFullScreen style={{ display: 'block' }}></iframe>
             </div>

             {/* LIVE SEO SCORECARD */}
             <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: 20, boxShadow: 'var(--shadow-sm)' }}>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border-light)' }}>
                 <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }}>
                   <BarChart2 size={18} color="var(--chart-primary)" /> SEO Score
                 </h3>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 24, color: getScoreColor(seoData.score) }}>
                   {seoData.score}<span style={{ fontSize: 14, color: 'var(--text-light)', fontWeight: 600 }}>/100</span>
                 </div>
               </div>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                 {seoData.checks.map((chk, i) => (
                   <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, lineHeight: 1.4 }}>
                     {chk.passed ? (
                       <CheckCircle2 size={16} color="var(--success-text)" style={{ flexShrink: 0, marginTop: 1 }} />
                     ) : (
                       <X size={16} color="var(--error-text)" style={{ flexShrink: 0, marginTop: 1 }} />
                     )}
                     <span style={{ color: chk.passed ? 'var(--text)' : 'var(--text-muted)', fontWeight: chk.passed ? 500 : 400 }}>{chk.text}</span>
                   </div>
                 ))}
               </div>
             </div>

             <div>
               <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>Localization</h3>
               <div className="form-group mb-12">
                 <label className="form-label" style={{ fontSize: 12 }}>Metadata Language</label>
                 <select className="form-input" style={{ fontSize: 13 }} value={defaultLanguage} onChange={e => setDefaultLanguage(e.target.value)}><option value="en">English</option><option value="en-IN">English (India)</option></select>
               </div>
               <div className="form-group mb-12">
                 <label className="form-label" style={{ fontSize: 12 }}>Spoken Language</label>
                 <select className="form-input" style={{ fontSize: 13 }} value={audioLanguage} onChange={e => setAudioLanguage(e.target.value)}><option value="en">English</option><option value="en-IN">English (India)</option></select>
               </div>
               <div className="form-group" style={{ marginBottom: 0 }}>
                 <label className="form-label" style={{ fontSize: 12 }}>Upload Captions</label>
                 <input type="file" accept=".srt,.vtt" onChange={e => setCaptionFile(e.target.files[0])} style={{ fontSize: 12, padding: 8, background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', width: '100%' }} />
               </div>
             </div>

             <div>
               <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>Visibility</h3>
               <div className="form-group mb-12">
                 <select className="form-input" value={privacy} onChange={e => setPrivacy(e.target.value)}><option value="public">Public</option><option value="unlisted">Unlisted</option><option value="private">Private</option></select>
               </div>
               <div className="form-group mb-12">
                 <select className="form-input" value={categoryId} onChange={e => setCategoryId(e.target.value)}><option value="28">Science & Technology</option><option value="27">Education</option><option value="20">Gaming</option></select>
               </div>

               <div className="form-group" style={{ marginBottom: 0 }}>
                 <label className="form-label" style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                   Included in Playlists
                   <span style={{ fontWeight: 400 }}>{selectedPlaylists.size} selected</span>
                 </label>
                 
                 <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 8, background: 'var(--surface)', maxHeight: 200, overflowY: 'auto' }}>
                    {scanningPlaylists ? (
                       <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-light)', fontSize: 12 }}><Spinner /></div>
                    ) : allPlaylists.map(p => {
                       const isChecked = selectedPlaylists.has(p.id);
                       return (
                         <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', cursor: 'pointer', borderRadius: 'var(--radius-sm)', background: isChecked ? 'var(--bg)' : 'transparent', marginBottom: 4 }}>
                           <input type="checkbox" checked={isChecked} onChange={() => togglePlaylist(p.id)} style={{ accentColor: 'var(--text)' }} />
                           <span style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</span>
                         </label>
                       );
                    })}
                 </div>
               </div>
             </div>

          </div>

        </div>
      )}
    </div>
  );
}