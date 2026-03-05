import React, { useState, useEffect, useRef } from 'react';
import { Edit3, Save, Video, Image as ImageIcon, Subtitles, List, AlertTriangle, CheckCircle2, Globe, Hash, ArrowLeft, ImagePlus, Crop, Sparkles, Wand2, X, PlayCircle, BarChart2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchSingleVideo, updateVideoMetadata, uploadCustomThumbnail, uploadCaptionTrack, fetchPlaylists, addVideoToPlaylist, generateAIThumbnail, analyzeThumbnailWithAI, checkVideoInPlaylist, removeVideoFromPlaylist } from '../api';
import { Spinner } from '../components/Shared';

export default function EditVideoPage({ videoId, setPage }) {
  const [rawVideo, setRawVideo] = useState(null);
  
  // Edit States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [tags, setTags] = useState("");
  const [categoryId, setCategoryId] = useState("22");
  const [privacy, setPrivacy] = useState("public");
  const [defaultLanguage, setDefaultLanguage] = useState("en");
  const [audioLanguage, setAudioLanguage] = useState("en");
  
  // Thumbnail States
  const [thumbFile, setThumbFile] = useState(null);
  const [thumbPreview, setThumbPreview] = useState(null);
  const [thumbPrompt, setThumbPrompt] = useState("");
  const [generatingThumb, setGeneratingThumb] = useState(false);
  const [thumbAnalysis, setThumbAnalysis] = useState(null);
  const [analyzingThumb, setAnalyzingThumb] = useState(false);
  const [thumbExpanded, setThumbExpanded] = useState(false);

  // Video Extraction States
  const videoRef = useRef(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoDuration, setVideoDuration] = useState(0);
  const [extractTime, setExtractTime] = useState(0);
  const [captionFile, setCaptionFile] = useState(null);
  
  // --- PLAYLIST STATES ---
  const [allPlaylists, setAllPlaylists] = useState([]);
  const [playlistSearch, setPlaylistSearch] = useState("");
  const [initialPlaylists, setInitialPlaylists] = useState({}); 
  const [selectedPlaylists, setSelectedPlaylists] = useState(new Set()); 
  const [scanningPlaylists, setScanningPlaylists] = useState(false);

  // --- NEW PAGINATION STATES ---
  const [currentPage, setCurrentPage] = useState(1);
  const playlistsPerPage = 10;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load Playlists once
  useEffect(() => {
    fetchPlaylists(50).then(data => { if (data) setAllPlaylists(data); }).catch(console.error);
  }, []);

  // AUTO-LOAD VIDEO DATA
  useEffect(() => {
    if (!videoId) { setError("No video selected."); setLoading(false); return; }

    const loadData = async () => {
      setLoading(true); setError(""); setSuccess("");
      try {
        const data = await fetchSingleVideo(videoId);
        setRawVideo(data);
        setTitle(data.snippet.title || "");
        
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
      } catch (err) { setError(err.message); } 
      finally { setLoading(false); }
    };
    loadData();
  }, [videoId]);

  // AUTOMATIC PLAYLIST SCANNER (Maps initial checkbox states)
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
            initialMap[p.id] = result.playlistItemId; // Save the unique ID needed for deletion
            activeSet.add(p.id); // Check the box
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

  // SMART RESET: Go back to page 1 if the user starts typing a search
  useEffect(() => {
    setCurrentPage(1);
  }, [playlistSearch]);

  // Checkbox Toggle Handler
  const togglePlaylist = (playlistId) => {
    const newSet = new Set(selectedPlaylists);
    if (newSet.has(playlistId)) {
      newSet.delete(playlistId);
    } else {
      newSet.add(playlistId); 
    }
    setSelectedPlaylists(newSet);
  };

  // --- THUMBNAIL LOGIC ---
  const formatTime = (seconds) => {
    if (isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleClearThumbnail = () => {
    setThumbFile(null); setThumbPreview(null); setThumbAnalysis(null); setThumbPrompt(""); 
    setIsExtracting(false); 
    if (videoUrl) { URL.revokeObjectURL(videoUrl); setVideoUrl(""); }
  };

  const handleThumbUpload = (e) => {
    const imgFile = e.target.files[0];
    if (!imgFile) return;
    setThumbFile(imgFile); setThumbPreview(URL.createObjectURL(imgFile)); setThumbAnalysis(null);
  };

  const handleLocalVideoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setIsExtracting(true);
    }
  };

  const handleVideoLoaded = (e) => { setVideoDuration(e.target.duration); setExtractTime(0); };
  
  const handleSliderChange = (e) => {
    const time = parseFloat(e.target.value);
    setExtractTime(time);
    if (videoRef.current) videoRef.current.currentTime = time;
  };

  const captureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setThumbPreview(dataUrl);
    
    fetch(dataUrl).then(res => res.blob()).then(blob => {
      setThumbFile(new File([blob], "extracted_thumb.jpg", { type: "image/jpeg" }));
      setThumbAnalysis(null); setIsExtracting(false); URL.revokeObjectURL(videoUrl); setVideoUrl("");
    });
  };

  const handleGenerateThumbAI = async () => {
    if (!thumbPrompt) return setError("Please enter an image prompt first.");
    setGeneratingThumb(true); setError("");
    try {
      const base64Str = await generateAIThumbnail(thumbPrompt);
      const dataUrl = `data:image/jpeg;base64,${base64Str}`;
      setThumbPreview(dataUrl);
      
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      setThumbFile(new File([blob], "ai_thumb.jpg", { type: "image/jpeg" }));
      setThumbAnalysis(null);
    } catch (err) { setError(err.message); } 
    finally { setGeneratingThumb(false); }
  };

  const handleAnalyzeThumbnail = async () => {
    if (!thumbFile) return;
    setAnalyzingThumb(true); setThumbAnalysis(null); setError("");
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const result = await analyzeThumbnailWithAI(reader.result.split(',')[1], thumbFile.type);
        setThumbAnalysis(result); setThumbExpanded(false);
      } catch (err) { setError("Analysis Failed: " + err.message); } 
      finally { setAnalyzingThumb(false); }
    };
    reader.readAsDataURL(thumbFile);
  };

  // --- ROBUST SAVE LOGIC ---
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

      // 1. Update Core Meta & Media
      await updateVideoMetadata(updatedVideo);
      if (thumbFile) await uploadCustomThumbnail(rawVideo.id, thumbFile);
      if (captionFile) await uploadCaptionTrack(rawVideo.id, audioLanguage, captionFile);
      
      // 2. Playlist Synchronizer
      const playlistsToAdd = [...selectedPlaylists].filter(id => !initialPlaylists[id]);
      const playlistsToRemove = Object.keys(initialPlaylists).filter(id => !selectedPlaylists.has(id));

      const newInitialMap = { ...initialPlaylists };

      // Add to new playlists
      for (const id of playlistsToAdd) {
        const addedItem = await addVideoToPlaylist(id, rawVideo.id);
        newInitialMap[id] = addedItem.id; 
      }

      // Remove from unchecked playlists
      for (const id of playlistsToRemove) {
        if (initialPlaylists[id]) {
          await removeVideoFromPlaylist(initialPlaylists[id]);
          delete newInitialMap[id]; 
        }
      }

      setInitialPlaylists(newInitialMap);
      setSuccess(`Success! Video updated${playlistsToAdd.length > 0 ? `, added to ${playlistsToAdd.length} playlists` : ''}${playlistsToRemove.length > 0 ? `, removed from ${playlistsToRemove.length} playlists` : ''}.`);
      
      handleClearThumbnail(); setCaptionFile(null);
    } catch (err) { 
      setError(err.message); 
    } finally { 
      setSaving(false); 
    }
  };

  // --- PAGINATION MATH ---
  const filteredPlaylists = allPlaylists.filter(p => p.title.toLowerCase().includes(playlistSearch.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filteredPlaylists.length / playlistsPerPage));
  const startIndex = (currentPage - 1) * playlistsPerPage;
  const currentPlaylists = filteredPlaylists.slice(startIndex, startIndex + playlistsPerPage);

  return (
    <div className="page fade-in" style={{ paddingBottom: 60 }}>
      {/* NAVIGATION & HEADER */}
      <button onClick={() => setPage("myvideos")} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600, fontSize: 14, marginBottom: 24 }}>
        <ArrowLeft size={16} /> Back to Video List
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
        <div>
          <h1 className="heading-xl mb-8" style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Edit3 color="var(--accent)" size={32} /> Video Editor</h1>
          <p className="text-muted text-sm">Update metadata, captions, and thumbnails without losing SEO.</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || !rawVideo || loading} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', fontSize: 16 }}>
          {saving ? <Spinner size={20} /> : <><Save size={20} /> Save Changes</>}
        </button>
      </div>

      {error && <div className="error-box mb-24"><AlertTriangle size={18} /> {error}</div>}
      {success && <div style={{ background: "#EAF4EA", color: "#057642", padding: 16, borderRadius: 8, fontSize: 14, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle2 size={18} /> {success}</div>}

      {loading && <div style={{ padding: '80px 0', display: 'flex', justifyContent: 'center' }}><Spinner size={40} /></div>}

      {rawVideo && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32, alignItems: 'start' }}>
          
          {/* ============================================== */}
          {/* LEFT PANE: THUMBNAIL STUDIO & METADATA           */}
          {/* ============================================== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            
            {/* THUMBNAIL STUDIO */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 className="heading-md" style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
                  <ImageIcon size={20} className="text-accent"/> Cinematic Thumbnail Studio
                </h3>
                {(thumbPreview || isExtracting) && (
                  <button className="btn btn-secondary btn-sm" onClick={handleClearThumbnail} style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 20 }}>
                    <X size={14}/> Reset Image
                  </button>
                )}
              </div>

              {/* SCRUBBING UI */}
              {isExtracting ? (
                <div style={{ background: '#000', padding: 24, borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 20, boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.5)' }}>
                  <video ref={videoRef} src={videoUrl} preload="auto" onLoadedMetadata={handleVideoLoaded} style={{ width: '100%', borderRadius: 8, aspectRatio: '16/9', border: '1px solid #333' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#aaa', minWidth: 40 }}>{formatTime(extractTime)}</span>
                    <input type="range" min="0" max={videoDuration} step="0.1" value={extractTime} onChange={handleSliderChange} style={{ flex: 1, cursor: 'pointer', accentColor: 'var(--accent)', height: 6 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#aaa', minWidth: 40 }}>{formatTime(videoDuration)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn-secondary" onClick={handleClearThumbnail} style={{ flex: 1, background: '#222', color: '#fff', border: 'none' }}>Cancel</button>
                    <button className="btn btn-primary" onClick={captureFrame} style={{ flex: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, fontSize: 16 }}>
                      <Crop size={18} /> Capture Perfect Frame
                    </button>
                  </div>
                </div>
              ) : (
                /* PREVIEW & AI UI */
                <div>
                  <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: 16, overflow: 'hidden', border: thumbPreview ? '3px solid var(--accent)' : '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', marginBottom: 20 }}>
                    <img src={thumbPreview || `https://img.youtube.com/vi/${rawVideo.id}/maxresdefault.jpg`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Thumbnail Area" />
                    <div style={{ position: 'absolute', top: 16, left: 16, background: thumbPreview ? 'var(--accent)' : 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 11, fontWeight: 800, padding: '6px 12px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.5px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                      {thumbPreview ? "Pending Replacement" : "Current Live Image"}
                    </div>
                  </div>

                  {!thumbPreview ? (
                    <div style={{ display: 'flex', gap: 12, background: 'var(--surface-2)', padding: 12, borderRadius: 12, alignItems: 'stretch' }}>
                      <label htmlFor="edit-thumb-upload" className="btn btn-secondary" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: 'var(--card)' }}>
                        <ImagePlus size={16} color="var(--accent)" /> Upload New
                        <input type="file" accept="image/jpeg,image/png,image/webp" id="edit-thumb-upload" style={{ display: 'none' }} onChange={handleThumbUpload} />
                      </label>
                      <label htmlFor="edit-local-video" className="btn btn-secondary" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: 'var(--card)' }}>
                        <Crop size={16} color="var(--accent)" /> Scrub Local File
                        <input type="file" accept="video/mp4,video/x-m4v,video/*" id="edit-local-video" style={{ display: 'none' }} onChange={handleLocalVideoSelect} />
                      </label>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 4px 4px 16px' }}>
                        <Sparkles size={16} color="var(--accent)" style={{ flexShrink: 0 }} />
                        <input className="form-input" placeholder="Or type a prompt to generate an AI thumbnail..." value={thumbPrompt} onChange={e => setThumbPrompt(e.target.value)} style={{ border: 'none', background: 'transparent', padding: 0, height: '100%' }} />
                        <button className="btn btn-primary btn-sm" onClick={handleGenerateThumbAI} disabled={generatingThumb || !thumbPrompt} style={{ padding: '8px 16px' }}>
                          {generatingThumb ? <Spinner size={14} /> : "Generate"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: thumbAnalysis ? 16 : 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>AI Click-Through-Rate Prediction</div>
                        {!thumbAnalysis && !analyzingThumb && (
                          <button className="btn btn-primary btn-sm" onClick={handleAnalyzeThumbnail} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <BarChart2 size={14} /> Calculate CTR Score
                          </button>
                        )}
                        {analyzingThumb && <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}><Spinner size={14} /> Analyzing...</div>}
                      </div>

                      {thumbAnalysis && (
                        <div style={{ background: 'var(--card)', border: `1px solid ${thumbAnalysis.score >= 70 ? '#CDE2CD' : '#F1B2B5'}`, borderRadius: 8, padding: 16 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: thumbAnalysis.score >= 70 ? '#057642' : '#CC1016', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estimated Performance</span>
                            <span style={{ fontWeight: 800, fontSize: 24, color: thumbAnalysis.score >= 70 ? '#057642' : '#CC1016' }}>{thumbAnalysis.score}/100</span>
                          </div>
                          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
                            {(thumbExpanded ? thumbAnalysis.feedback : thumbAnalysis.feedback?.slice(0, 2)).map((f, i) => <li key={i}>{f}</li>)}
                          </ul>
                          {thumbAnalysis.feedback?.length > 2 && (
                            <div onClick={() => setThumbExpanded(!thumbExpanded)} style={{ cursor: 'pointer', color: 'var(--accent)', fontSize: 12, fontWeight: 700, marginTop: 12, display: 'inline-block' }}>
                              {thumbExpanded ? "Show Less" : "Read Full Analysis"}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* CORE METADATA */}
            <div className="card">
              <h3 className="heading-md mb-20" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Video size={18} className="text-muted"/> Core Metadata</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div><label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Video Title</label><input className="form-input" value={title} onChange={e => setTitle(e.target.value)} style={{ fontSize: 15 }} /></div>
                <div><label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Description</label><textarea className="form-input" rows={10} value={description} onChange={e => setDescription(e.target.value)} style={{ fontSize: 14, lineHeight: 1.5 }} /></div>
                <div><label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Hash size={14}/> Appended Hashtags</label><input className="form-input" value={hashtags} onChange={e => setHashtags(e.target.value)} placeholder="#Java #DSA #Programming" /></div>
                <div><label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Tags (Comma Separated)</label><input className="form-input" value={tags} onChange={e => setTags(e.target.value)} /></div>
              </div>
            </div>
          </div>

          {/* ============================================== */}
          {/* RIGHT PANE: MEDIA PREVIEW & SETTINGS             */}
          {/* ============================================== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, position: 'sticky', top: 24 }}>
            
            {/* LIVE YOUTUBE PLAYER PREVIEW */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-strong)' }}>
              <div style={{ background: 'var(--surface)', padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                <h3 className="heading-md" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}><PlayCircle size={16} className="text-accent"/> Live Video Context</h3>
              </div>
              <iframe
                width="100%"
                height="190"
                src={`https://www.youtube.com/embed/${rawVideo.id}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ display: 'block', background: '#000' }}
              ></iframe>
            </div>

            {/* LOCALIZATION */}
            <div className="card">
              <h3 className="heading-md mb-16" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Globe size={18} className="text-muted"/> Localization</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Metadata Language</label>
                  <select className="form-input" value={defaultLanguage} onChange={e => setDefaultLanguage(e.target.value)}>
                    <option value="en">English</option><option value="en-IN">English (India)</option><option value="hi">Hindi</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Spoken Language</label>
                  <select className="form-input" value={audioLanguage} onChange={e => setAudioLanguage(e.target.value)}>
                    <option value="en">English</option><option value="en-IN">English (India)</option><option value="hi">Hindi</option>
                  </select>
                </div>
                <div style={{ background: 'var(--surface-2)', padding: 12, borderRadius: 8, border: '1px dashed var(--border-strong)' }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Subtitles size={14} /> Upload Captions (.srt / .vtt)</label>
                  <input type="file" accept=".srt,.vtt" onChange={e => setCaptionFile(e.target.files[0])} style={{ fontSize: 11, width: '100%' }} />
                </div>
              </div>
            </div>

            {/* PLAYLIST MANAGER & SETTINGS */}
            <div className="card">
              <h3 className="heading-md mb-16">Visibility & Reach</h3>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Privacy Status</label>
                <select className="form-input" value={privacy} onChange={e => setPrivacy(e.target.value)}><option value="public">Public</option><option value="unlisted">Unlisted</option><option value="private">Private</option></select>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Video Category</label>
                <select className="form-input" value={categoryId} onChange={e => setCategoryId(e.target.value)}><option value="28">Science & Technology</option><option value="27">Education</option><option value="20">Gaming</option><option value="22">People & Blogs</option></select>
              </div>
              
              {/* PAGINATED PLAYLIST MANAGER UI */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><List size={14}/> Playlist Memberships</label>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-2)', padding: '6px 12px', borderRadius: 8, marginBottom: 8 }}>
                  <Search size={14} color="var(--text-light)" />
                  <input type="text" placeholder="Search playlists..." value={playlistSearch} onChange={e => setPlaylistSearch(e.target.value)} style={{ border: 'none', background: 'transparent', flex: 1, fontSize: 13, outline: 'none', color: 'var(--text)' }} />
                </div>
                
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 8, display: 'flex', flexDirection: 'column', gap: 4, background: 'var(--card)', minHeight: 180 }}>
                  {scanningPlaylists ? (
                    <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-light)', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <Spinner size={18}/> Scanning your playlists...
                    </div>
                  ) : allPlaylists.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-light)', fontSize: 13 }}>No playlists found on channel.</div>
                  ) : filteredPlaylists.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-light)', fontSize: 13 }}>No playlists match your search.</div>
                  ) : (
                    currentPlaylists.map(p => {
                      const isChecked = selectedPlaylists.has(p.id);
                      return (
                        <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px', cursor: 'pointer', borderRadius: 8, background: isChecked ? 'var(--surface-2)' : 'transparent', border: isChecked ? '1px solid var(--accent)' : '1px solid transparent', transition: 'all 0.2s ease' }}>
                          <input type="checkbox" checked={isChecked} onChange={() => togglePlaylist(p.id)} style={{ accentColor: 'var(--accent)', width: 16, height: 16, cursor: 'pointer' }} />
                          <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: isChecked ? 600 : 400, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</span>
                        </label>
                      );
                    })
                  )}
                </div>

                {/* PAGINATION CONTROLS */}
                {filteredPlaylists.length > 0 && !scanningPlaylists && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, padding: '0 4px' }}>
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                      disabled={currentPage === 1}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: currentPage === 1 ? 'var(--text-light)' : 'var(--text)', fontWeight: 600, fontSize: 12 }}
                    >
                      <ChevronLeft size={14} /> Prev
                    </button>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                      Page {currentPage} of {totalPages}
                    </div>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                      disabled={currentPage === totalPages}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: currentPage === totalPages ? 'var(--text-light)' : 'var(--text)', fontWeight: 600, fontSize: 12 }}
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}