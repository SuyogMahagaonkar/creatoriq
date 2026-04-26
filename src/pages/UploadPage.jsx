import React, { useState, useEffect, useRef, useContext } from 'react';
import { UploadCloud, Wand2, AlertTriangle, CheckCircle2, Video, Lock, Globe, Link, Layers, Image as ImageIcon, Sparkles, X, ImagePlus, Crop, LayoutList, Trash2 } from 'lucide-react';
import { analyzeTitle, analyzeDescription, analyzeTags, getScoreColor, calculateOverallSEO } from '../utils';
import { generateFreshSEO, uploadVideoToYouTube, fetchPlaylists, addVideoToPlaylist, analyzeThumbnailWithAI, generateAIThumbnail, uploadCustomThumbnail } from '../api';
import { CreatorContext } from '../context/CreatorContext';
import { Spinner, ScoreCircle } from '../components/Shared';

export default function UploadPage() {
  const { geminiKey, setIsSettingsOpen, setSettingsTab } = useContext(CreatorContext);
  const handleLockedAI = () => { setSettingsTab('ai'); setIsSettingsOpen(true); };
  const draft = JSON.parse(localStorage.getItem('creator_iq_upload_draft')) || {};

  const [file, setFile] = useState(null);
  const [topic, setTopic] = useState(draft.topic || "");
  const [title, setTitle] = useState(draft.title || "");
  const [description, setDescription] = useState(draft.description || "");
  const [tags, setTags] = useState(draft.tags || "");

  const [privacy, setPrivacy] = useState(draft.privacy || "private");
  const [allPlaylists, setAllPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(draft.selectedPlaylist || "");

  const [thumbs, setThumbs] = useState([{}, {}, {}]); 
  const [activeThumbIdx, setActiveThumbIdx] = useState(0);
  const [thumbWinnerIdx, setThumbWinnerIdx] = useState(0);

  const updateThumb = (idx, data) => {
    setThumbs(prev => prev.map((t, i) => i === idx ? { ...t, ...data } : t));
  };

  useEffect(() => {
    if (topic || title || description || tags) {
      localStorage.setItem('creator_iq_upload_draft', JSON.stringify({
        topic, title, description, tags, privacy, selectedPlaylist
      }));
    }
  }, [topic, title, description, tags, privacy, selectedPlaylist]);

  const handleClearDraft = () => {
    localStorage.removeItem('creator_iq_upload_draft');
    setTopic(""); setTitle(""); setDescription(""); setTags(""); setPrivacy("private"); setSelectedPlaylist(""); setThumbs([{}, {}, {}]);
  };

  const videoRef = useRef(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [extractTime, setExtractTime] = useState(0);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setVideoUrl("");
    }
  }, [file]);

  const [aiLoading, setAiLoading] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [error, setError] = useState("");
  const [successId, setSuccessId] = useState("");

  useEffect(() => {
    const channelId = localStorage.getItem("creator_iq_channel_id");
    if (channelId) {
      fetchPlaylists(50).then(data => { if (data) setAllPlaylists(data); }).catch(console.error);
    }
  }, []);

  const titleScore = analyzeTitle(title);
  const descScore = analyzeDescription(description);
  const tagsScore = analyzeTags(tags.split(",").filter(Boolean));
  const overallSEO = calculateOverallSEO(titleScore, descScore, tagsScore);

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleGenerateText = async (type) => {
    if (!topic) return setError("Please enter a short concept or topic first!");
    setError(""); setAiLoading(type);
    try {
      const suggestions = await generateFreshSEO(type, topic, title, description);
      if (type === "title") setTitle(suggestions[0]);
      if (type === "description") {
        let newDesc = suggestions[0];
        const defaultLinks = localStorage.getItem("creator_iq_social_links");
        if (defaultLinks && defaultLinks.trim()) {
          newDesc += "\n\n" + defaultLinks.trim();
        }
        setDescription(newDesc);
      }
      if (type === "tags") {
        setTags(Array.isArray(suggestions) ? (suggestions.length > 1 ? suggestions.join(", ") : suggestions[0]) : String(suggestions));
      }
    } catch (err) { setError(err.message); }
    finally { setAiLoading(null); }
  };

  const handleClearThumbnail = (idx) => {
    updateThumb(idx, { file: null, preview: null, analysis: null, prompt: "" });
    if (idx === activeThumbIdx) setIsExtracting(false);
  };

  const handleFileSelect = (e) => {
    const newFile = e.target.files[0];
    if (newFile) {
      setFile(newFile);
      setThumbs([{}, {}, {}]);
    }
  };

  const handleThumbUpload = (e) => {
    const imgFile = e.target.files[0];
    if (!imgFile) return;
    updateThumb(activeThumbIdx, { file: imgFile, preview: URL.createObjectURL(imgFile), analysis: null });
  };

  const handleVideoLoaded = (e) => {
    setVideoDuration(e.target.duration);
    setExtractTime(0);
  };

  const handleSliderChange = (e) => {
    const time = parseFloat(e.target.value);
    setExtractTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const captureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

    fetch(dataUrl).then(res => res.blob()).then(blob => {
      updateThumb(activeThumbIdx, { preview: dataUrl, file: new File([blob], "extracted_thumb.jpg", { type: "image/jpeg" }), analysis: null });
      setIsExtracting(false);
    });
  };

  const handleGenerateThumbAI = async () => {
    const prompt = thumbs[activeThumbIdx].prompt;
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
    const runners = thumbs.filter(t => t.file);
    if (runners.length === 0) return setError("Add at least one thumbnail to analyze.");

    setThumbs(prev => prev.map(t => (t.file && !t.analysis) ? { ...t, analyzing: true } : t));
    setError("");

    const newThumbs = [...thumbs];

    await Promise.all(newThumbs.map(async (t, i) => {
      if (!t.file || t.analysis) return;
      return new Promise((resolve) => {
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
      });
    }));

    let bestScore = -1;
    let bestIdx = 0;
    newThumbs.forEach((t, i) => {
      if (t.analysis?.score > bestScore) {
        bestScore = t.analysis.score;
        bestIdx = i;
      }
    });

    setThumbWinnerIdx(bestIdx);
    setThumbs(newThumbs);
  };

  const handleUpload = async () => {
    if (!file) return setError("Please select a video file.");
    if (!title || !description) return setError("Title and Description are required.");
    setError(""); setUploading(true); setUploadProgress("Uploading video file...");

    const token = localStorage.getItem("creator_iq_token");
    const metadata = {
      snippet: { title, description, tags: tags.split(",").map(t => t.trim()).filter(Boolean), categoryId: "22" },
      status: { privacyStatus: privacy, selfDeclaredMadeForKids: false }
    };

    try {
      const res = await uploadVideoToYouTube(file, metadata, token);
      if (selectedPlaylist) {
        setUploadProgress("Adding to playlist...");
        await addVideoToPlaylist(selectedPlaylist, res.id, token);
      }

      const winnerThumb = thumbs[thumbWinnerIdx]?.file;
      if (winnerThumb) {
        setUploadProgress("Uploading winning thumbnail...");
        await uploadCustomThumbnail(res.id, winnerThumb, token);
      }

      setSuccessId(res.id); setUploadProgress("");
      setFile(null); setTitle(""); setDescription(""); setTags(""); setTopic(""); setSelectedPlaylist(""); setThumbs([{}, {}, {}]);
    } catch (err) { setError(err.message); setUploadProgress(""); }
    finally { setUploading(false); }
  };

  return (
    <div className="page fade-in" style={{ paddingBottom: 60, maxWidth: 1400, margin: '0 auto' }}>
      
      {/* HEADER DIVIDER */}
      <div className="header-split" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 24, marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 8, color: 'var(--text)' }}>Upload Studio</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Publish directly to YouTube with AI-optimized metadata & A/B scored thumbnails.</p>
        </div>
        <button className="btn btn-primary" onClick={handleUpload} disabled={uploading || !file} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {uploading ? <Spinner size={16} /> : <><UploadCloud size={16} /> Publish to YouTube</>}
        </button>
      </div>

      {(topic || title || description) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, border: '1px solid var(--success-border)', background: 'var(--success-bg)', borderRadius: 'var(--radius-md)', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CheckCircle2 color="var(--success-text)" size={20} />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--success-text)', fontSize: 14 }}>Draft Available</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Unsaved edits detected on this device.</div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleClearDraft} style={{ color: 'var(--error-text)' }}>Discard Draft</button>
        </div>
      )}

      {error && <div style={{ padding: 16, background: 'var(--error-bg)', color: 'var(--error-text)', border: '1px solid var(--error-border)', borderRadius: 'var(--radius-md)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}><AlertTriangle size={16} /> {error}</div>}
      {successId && (
        <div style={{ padding: 16, background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-md)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={16} /> Upload Complete! <a href={`https://studio.youtube.com/video/${successId}/edit`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--success-text)', fontWeight: 600, textDecoration: 'underline' }}>Edit in YouTube Studio &rarr;</a>
        </div>
      )}

      <div className="page-grid-2col">
        
        {/* LEFT PANE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          
          {/* MEDIA WORKSPACE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
             <h3 style={{ fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}><Video size={18} className="text-muted" /> Source Media</h3>
             
             {!file ? (
                <div style={{ padding: 48, textAlign: 'center', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-lg)', background: 'var(--surface)' }}>
                  <input type="file" accept="video/mp4,video/x-m4v,video/*" id="video-upload" style={{ display: 'none' }} onChange={handleFileSelect} />
                  <label htmlFor="video-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 64, height: 64, background: 'var(--surface-hover)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                      <UploadCloud size={32} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>Click to browse or drag & drop</div>
                      <div style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 4 }}>MP4, MOV, or AVI up to 128GB</div>
                    </div>
                  </label>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
                     <video ref={videoRef} src={videoUrl} controls={!isExtracting} preload="auto" onLoadedMetadata={handleVideoLoaded} style={{ width: '100%', display: 'block', aspectRatio: '16/9' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{file.name}</div>
                    <label htmlFor="video-change" style={{ cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, background: 'var(--surface-hover)', padding: '4px 12px', borderRadius: 'var(--radius-full)' }}>
                      Replace File
                      <input type="file" accept="video/mp4,video/x-m4v,video/*" id="video-change" style={{ display: 'none' }} onChange={handleFileSelect} />
                    </label>
                  </div>
                </div>
              )}

              {file && (
                <div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 24, marginTop: 16 }}>
                     <h3 style={{ fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><ImageIcon size={18} className="text-muted" /> A/B Thumbnails</h3>
                     <button className="btn btn-secondary btn-sm" onClick={handleAnalyzeAllCandidates} disabled={thumbs.filter(t => t.file).length < 2 || thumbs.some(t => t.analyzing)} style={{ padding: '6px 12px' }}>
                       {thumbs.some(t => t.analyzing) ? <Spinner size={14} /> : "Analyze Variants"}
                     </button>
                   </div>

                   <div className="thumb-grid-3">
                     {thumbs.map((thumb, idx) => (
                       <div key={idx} onClick={() => setActiveThumbIdx(idx)} style={{ cursor: 'pointer' }}>
                         <div style={{ width: '100%', aspectRatio: '16/9', border: activeThumbIdx === idx ? '2px solid var(--accent)' : '2px solid transparent', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--surface)', position: 'relative', outline: '1px solid var(--border)' }}>
                           {thumb.preview ? (
                             <>
                               <img src={thumb.preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                               {thumbWinnerIdx === idx && <div style={{ position: 'absolute', top: 6, left: 6, background: 'var(--success-text)', color: 'var(--bg)', fontSize: 10, padding: '2px 6px', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>Best CTR</div>}
                               {thumb.analysis && (
                                 <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.7)', color: getScoreColor(thumb.analysis.score), padding: '4px 8px', fontSize: 12, fontWeight: 700, textAlign: 'center' }}>
                                   Score: {thumb.analysis.score}
                                 </div>
                               )}
                               <button onClick={(e) => { e.stopPropagation(); handleClearThumbnail(idx); }} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} /></button>
                             </>
                           ) : (
                             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-light)' }}>
                                {thumb.generating ? <Spinner size={20} /> : <ImagePlus size={20} />}
                             </div>
                           )}
                         </div>
                       </div>
                     ))}
                   </div>
                   
                   {/* Editor Panel for Active Slot */}
                   {activeThumbIdx !== null && (
                     <div className="fade-in" style={{ marginTop: 24 }}>
                        {isExtracting ? (
                          <div style={{ background: 'var(--surface)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 12 }}>Seek to capture frame:</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatTime(extractTime)}</span>
                              <input type="range" min="0" max={videoDuration} step="0.1" value={extractTime} onChange={handleSliderChange} style={{ flex: 1 }} />
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                              <button className="btn btn-secondary" onClick={() => setIsExtracting(false)}>Cancel</button>
                              <button className="btn btn-primary" onClick={captureFrame}>Capture Frame</button>
                            </div>
                          </div>
                        ) : !thumbs[activeThumbIdx].preview ? (
                           <div style={{ display: 'flex', gap: 16 }}>
                              <label className="btn btn-secondary" style={{ flexShrink: 0, height: 40, cursor: 'pointer' }}>
                                <ImagePlus size={16} /> Upload Image
                                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleThumbUpload} />
                              </label>
                              <button className="btn btn-secondary" onClick={() => setIsExtracting(true)} style={{ flexShrink: 0, height: 40 }}><Crop size={16} /> Capture Frame</button>
                              <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 4 }}>
                                 <input className="form-input" placeholder="Or enter AI prompt..." value={thumbs[activeThumbIdx].prompt || ""} onChange={(e) => updateThumb(activeThumbIdx, { prompt: e.target.value })} style={{ border: 'none', height: '100%', background: 'transparent' }} disabled={!geminiKey} />
                                 <button className="btn btn-ai btn-sm" onClick={geminiKey ? handleGenerateThumbAI : handleLockedAI} disabled={(thumbs[activeThumbIdx].generating || !thumbs[activeThumbIdx].prompt) && !!geminiKey} style={{ borderRadius: 'var(--radius-sm)' }}>
                                   {thumbs[activeThumbIdx].generating ? <Spinner size={14} /> : geminiKey ? "Generate" : <><Lock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Unlock AI</>}
                                 </button>
                              </div>
                           </div>
                        ) : thumbs[activeThumbIdx].analysis && (
                           <div style={{ background: 'var(--surface)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                             <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>AI Feedback</div>
                             <ul style={{ fontSize: 13, margin: '8px 0 0 16px', color: 'var(--text)' }}>
                               {thumbs[activeThumbIdx].analysis.feedback.map((f, i) => <li key={i}>{f}</li>)}
                             </ul>
                           </div>
                        )}
                     </div>
                   )}
                </div>
              )}
          </div>

          {/* AI CONTENT ENGINE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
             <h3 style={{ fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}><LayoutList size={18} className="text-muted" /> Metadata Editor</h3>

             <div className="form-group mb-0">
               <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Sparkles size={14} className="text-accent" /> Brainstorming Topic</label>
               <input className="form-input" placeholder="e.g. Building a cozy cabin in the woods" value={topic} onChange={e => setTopic(e.target.value)} />
             </div>

             <div className="form-group">
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                 <label className="form-label">Video Title</label>
                 <button className="btn btn-secondary btn-sm" onClick={geminiKey ? () => handleGenerateText("title") : handleLockedAI} disabled={aiLoading === "title" && !!geminiKey} style={{ padding: '4px 12px', fontSize: 11, border: 'none', background: 'var(--surface-hover)', ...(geminiKey ? {} : { color: 'var(--text-muted)' }) }}>
                   {aiLoading === 'title' ? <Spinner size={12} /> : geminiKey ? "Auto-Write" : <><Lock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Unlock AI</>}
                 </button>
               </div>
               <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} style={{ fontSize: 16, fontWeight: 500 }} />
             </div>

             <div className="form-group">
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                 <label className="form-label">Description</label>
                 <button className="btn btn-secondary btn-sm" onClick={geminiKey ? () => handleGenerateText("description") : handleLockedAI} disabled={aiLoading === "description" && !!geminiKey} style={{ padding: '4px 12px', fontSize: 11, border: 'none', background: 'var(--surface-hover)', ...(geminiKey ? {} : { color: 'var(--text-muted)' }) }}>
                   {aiLoading === 'description' ? <Spinner size={12} /> : geminiKey ? "Auto-Write" : <><Lock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Unlock AI</>}
                 </button>
               </div>
               <textarea className="form-input" rows={6} value={description} onChange={e => setDescription(e.target.value)} style={{ fontSize: 14, fontFamily: 'var(--font-mono)' }} />
             </div>

             <div className="form-group mb-0">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label className="form-label">Keywords & Tags</label>
                  <button className="btn btn-secondary btn-sm" onClick={geminiKey ? () => handleGenerateText("tags") : handleLockedAI} disabled={aiLoading === "tags" && !!geminiKey} style={{ padding: '4px 12px', fontSize: 11, border: 'none', background: 'var(--surface-hover)', ...(geminiKey ? {} : { color: 'var(--text-muted)' }) }}>
                    {aiLoading === 'tags' ? <Spinner size={12} /> : geminiKey ? "Auto-Extract" : <><Lock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Unlock AI</>}
                  </button>
                </div>
               <input className="form-input" value={tags} onChange={e => setTags(e.target.value)} placeholder="comma, separated, tags" />
             </div>
          </div>

        </div>

        {/* RIGHT PANE: settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

           {/* Score Card */}
           <div style={{ display: 'flex', alignItems: 'center', gap: 20, background: 'var(--surface)', padding: 24, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
             <ScoreCircle score={overallSEO} size={64} />
             <div>
               <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>SEO Readiness</div>
               <div style={{ fontSize: 24, fontWeight: 800, color: getScoreColor(overallSEO) }}>{overallSEO}%</div>
             </div>
           </div>

           {/* Settings */}
           <div>
             <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>Visibility Settings</h3>
             
             <div className="form-group mb-24">
               <label className="form-label">Add to Playlist</label>
               <select className="form-input" value={selectedPlaylist} onChange={(e) => setSelectedPlaylist(e.target.value)}>
                 <option value="">None</option>
                 {allPlaylists.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
               </select>
             </div>

             <label className="form-label">Visibility Status</label>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[{ id: 'private', icon: Lock, label: 'Private', desc: 'Only you can view' },
                { id: 'unlisted', icon: Link, label: 'Unlisted', desc: 'Anyone with link' },
                { id: 'public', icon: Globe, label: 'Public', desc: 'Live to everyone' }].map(item => (
                  <div key={item.id} onClick={() => setPrivacy(item.id)} style={{ display: 'flex', gap: 12, padding: 12, border: privacy === item.id ? '2px solid var(--accent)' : '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', background: privacy === item.id ? 'var(--bg)' : 'var(--surface)', alignItems: 'center' }}>
                    <item.icon size={18} color={privacy === item.id ? 'var(--accent)' : 'var(--text-muted)'} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: privacy === item.id ? 'var(--text)' : 'var(--text-muted)' }}>{item.label}</div>
                    </div>
                  </div>
              ))}
             </div>
           </div>

           {/* Publish block */}
           <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {uploadProgress && <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', fontWeight: 500 }}>{uploadProgress}</div>}
              <button className="btn btn-primary" onClick={handleUpload} disabled={uploading || !file} style={{ width: '100%', padding: '16px', fontSize: 16, justifyContent: 'center' }}>
                {uploading ? <Spinner size={20} /> : <><UploadCloud size={20} /> Publish to YouTube</>}
              </button>
           </div>
        </div>

      </div>
    </div>
  );
}