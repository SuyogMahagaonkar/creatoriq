import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, Wand2, AlertTriangle, CheckCircle2, Video, Lock, Globe, Link, Layers, Image as ImageIcon, Sparkles, X, ImagePlus, Crop, LayoutList } from 'lucide-react';
import { analyzeTitle, analyzeDescription, analyzeTags, getScoreColor } from '../utils';
import { generateFreshSEO, uploadVideoToYouTube, fetchPlaylists, addVideoToPlaylist, analyzeThumbnailWithAI, generateAIThumbnail } from '../api';
import { Spinner, ScoreCircle } from '../components/Shared';

export default function UploadPage() {
  // Video & Text States
  const [file, setFile] = useState(null);
  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  
  // Settings States
  const [privacy, setPrivacy] = useState("private");
  const [allPlaylists, setAllPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState("");

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
  // Add this right below your videoRef
  const [videoUrl, setVideoUrl] = useState("");

  // This creates the video link exactly once when you upload a file
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      return () => URL.revokeObjectURL(url); // Cleans up memory when done
    } else {
      setVideoUrl("");
    }
  }, [file]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [extractTime, setExtractTime] = useState(0);

  // System States
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
  const overallSEO = Math.round((titleScore.score + descScore.score + tagsScore.score) / 3);

  // Helper to format video time (e.g., 65s -> 1:05)
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
      if (type === "description") setDescription(suggestions[0]);
      if (type === "tags") {
        setTags(Array.isArray(suggestions) ? (suggestions.length > 1 ? suggestions.join(", ") : suggestions[0]) : String(suggestions));
      }
    } catch (err) { setError(err.message); } 
    finally { setAiLoading(null); }
  };

  // --- THUMBNAIL MANAGERS ---
  const handleClearThumbnail = () => {
    setThumbFile(null); setThumbPreview(null); setThumbAnalysis(null); setThumbPrompt(""); setIsExtracting(false);
  };

  const handleFileSelect = (e) => {
    const newFile = e.target.files[0];
    if (newFile) {
      setFile(newFile);
      handleClearThumbnail(); // Clear old thumbnail if video changes
    }
  };

  const handleThumbUpload = (e) => {
    const imgFile = e.target.files[0];
    if (!imgFile) return;
    setThumbFile(imgFile); setThumbPreview(URL.createObjectURL(imgFile)); setThumbAnalysis(null);
  };

  // --- FRAME EXTRACTOR LOGIC ---
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
    setThumbPreview(dataUrl);
    
    fetch(dataUrl).then(res => res.blob()).then(blob => {
      setThumbFile(new File([blob], "extracted_thumb.jpg", { type: "image/jpeg" }));
      setThumbAnalysis(null);
      setIsExtracting(false);
    });
  };

  // --- AI GENERATION & ANALYSIS ---
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
      setSuccessId(res.id); setUploadProgress("");
      setFile(null); setTitle(""); setDescription(""); setTags(""); setTopic(""); setSelectedPlaylist(""); handleClearThumbnail();
    } catch (err) { setError(err.message); setUploadProgress(""); } 
    finally { setUploading(false); }
  };

  return (
    <div className="page fade-in" style={{ paddingBottom: 60 }}>
      {/* PAGE HEADER */}
      <div style={{ marginBottom: 32 }}>
        <h1 className="heading-xl mb-8" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <UploadCloud color="var(--accent)" size={32} /> Upload Studio
        </h1>
        <p className="text-muted text-sm">Prepare, optimize, and publish your content with a 100% SEO score.</p>
      </div>

      {/* ALERTS */}
      {error && <div className="error-box mb-24"><AlertTriangle size={18} /> {error}</div>}
      {successId && (
        <div style={{ background: "#EAF4EA", color: "#057642", padding: 16, borderRadius: 8, fontSize: 14, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #CDE2CD' }}>
          <CheckCircle2 size={18} /> Upload Complete! <a href={`https://studio.youtube.com/video/${successId}/edit`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", fontWeight: 600 }}>Edit in YouTube Studio &rarr;</a>
        </div>
      )}

      {/* MAIN LAYOUT GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32, alignItems: 'start' }}>
        
        {/* ========================================== */}
        {/* LEFT PANE: MEDIA & CONTENT WORKSPACE         */}
        {/* ========================================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* 1. MEDIA SECTION (Video + Thumbnail) */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <h3 className="heading-md" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Video size={18} className="text-muted"/> Primary Media</h3>
            
            {/* Video Uploader */}
            <div style={{ padding: 32, textAlign: 'center', border: '2px dashed var(--border-strong)', borderRadius: 12, background: file ? '#F4FAFF' : 'var(--surface)' }}>
              <input type="file" accept="video/mp4,video/x-m4v,video/*" id="video-upload" style={{ display: 'none' }} onChange={handleFileSelect} />
              <label htmlFor="video-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 56, height: 56, background: file ? 'var(--accent)' : 'var(--surface-2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: file ? '#fff' : 'var(--accent)', transition: 'all 0.2s ease' }}>
                  {file ? <CheckCircle2 size={28} /> : <UploadCloud size={28} />}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16, color: file ? 'var(--accent)' : 'var(--text)' }}>{file ? file.name : "Select video file"}</div>
                  {!file && <div style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 4 }}>MP4, MOV, or AVI</div>}
                </div>
              </label>
            </div>

            {/* Thumbnail Studio */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Thumbnail Studio</label>
                {(thumbPreview || isExtracting) && (
                  <button onClick={handleClearThumbnail} style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <X size={14}/> Clear
                  </button>
                )}
              </div>

              {isExtracting ? (
                /* --- STATE 1: VIDEO SCRUBBER --- */
                <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <video 
                    ref={videoRef} 
                    src={videoUrl} 
                    preload="auto"
                    onLoadedMetadata={handleVideoLoaded} 
                    style={{ width: '100%', borderRadius: 8, background: '#000', aspectRatio: '16/9' }} 
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', minWidth: 36 }}>{formatTime(extractTime)}</span>
                    <input 
                      type="range" min="0" max={videoDuration} step="0.1" 
                      value={extractTime} onChange={handleSliderChange} 
                      style={{ flex: 1, cursor: 'pointer', accentColor: 'var(--accent)' }} 
                    />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', minWidth: 36 }}>{formatTime(videoDuration)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn-secondary" onClick={() => setIsExtracting(false)} style={{ flex: 1 }}>Cancel</button>
                    <button className="btn btn-primary" onClick={captureFrame} style={{ flex: 2 }}><Crop size={16} style={{ marginRight: 6 }}/> Capture Frame</button>
                  </div>
                </div>
              ) : !thumbPreview ? (
                /* --- STATE 2: MENU OPTIONS --- */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <label htmlFor="thumb-upload" className="btn btn-secondary" style={{ display: 'flex', flexDirection: 'column', gap: 8, height: 90, justifyContent: 'center', padding: '16px 8px' }}>
                    <ImagePlus size={20} color="var(--accent)" />
                    <span style={{ fontSize: 12 }}>Upload File</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" id="thumb-upload" style={{ display: 'none' }} onChange={handleThumbUpload} />
                  </label>
                  
                  <button className="btn btn-secondary" onClick={() => { if(!file) setError("Please upload a video first."); else setIsExtracting(true); }} disabled={!file} style={{ display: 'flex', flexDirection: 'column', gap: 8, height: 90, justifyContent: 'center', padding: '16px 8px' }}>
                    <Crop size={20} color={file ? "var(--accent)" : "var(--text-light)"} />
                    <span style={{ fontSize: 12 }}>Extract Frame</span>
                  </button>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: 90 }}>
                    <input className="form-input" placeholder="AI Prompt..." value={thumbPrompt} onChange={e => setThumbPrompt(e.target.value)} style={{ height: '50%', padding: '4px 8px', fontSize: 11, background: 'var(--surface-2)', border: 'none' }} />
                    <button className="btn btn-primary" onClick={handleGenerateThumbAI} disabled={generatingThumb || !thumbPrompt} style={{ height: '50%', fontSize: 11, padding: 0 }}>
                      {generatingThumb ? <Spinner size={14} /> : <><Sparkles size={12} style={{ marginRight: 4 }}/> Generate</>}
                    </button>
                  </div>
                </div>
              ) : (
                /* --- STATE 3: PREVIEW & AI ANALYSIS --- */
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', background: 'var(--surface-2)', padding: 16, borderRadius: 12 }}>
                  <div style={{ width: '40%', flexShrink: 0 }}>
                    <img src={thumbPreview} alt="Preview" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)', aspectRatio: '16/9', objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    {!thumbAnalysis && !analyzingThumb && (
                      <button className="btn btn-primary" onClick={handleAnalyzeThumbnail} style={{ width: '100%' }}>
                        <Wand2 size={16} style={{ marginRight: 6 }}/> Calculate CTR Score
                      </button>
                    )}
                    {analyzingThumb && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)', fontSize: 13, fontWeight: 600, padding: 12 }}>
                        <Spinner size={16} /> Analyzing visual impact...
                      </div>
                    )}
                    {thumbAnalysis && (
                      <div style={{ background: 'var(--card)', border: `1px solid ${thumbAnalysis.score >= 70 ? '#CDE2CD' : '#F1B2B5'}`, borderRadius: 8, padding: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: 12, color: thumbAnalysis.score >= 70 ? '#057642' : '#CC1016', textTransform: 'uppercase' }}>CTR Score</span>
                          <span style={{ fontWeight: 800, fontSize: 18, color: thumbAnalysis.score >= 70 ? '#057642' : '#CC1016' }}>{thumbAnalysis.score}/100</span>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>
                          {(thumbExpanded ? thumbAnalysis.feedback : thumbAnalysis.feedback?.slice(0, 2)).map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                        {thumbAnalysis.feedback?.length > 2 && (
                          <div onClick={() => setThumbExpanded(!thumbExpanded)} style={{ cursor: 'pointer', color: 'var(--accent)', fontSize: 11, fontWeight: 700, marginTop: 8, textAlign: 'center' }}>
                            {thumbExpanded ? "Show Less" : "Show More"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. AI CONTENT ENGINE */}
          <div className="card">
            <h3 className="heading-md mb-20" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><LayoutList size={18} className="text-muted"/> Metadata & SEO</h3>
            
            <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 8, marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
              <Sparkles size={20} color="var(--accent)" style={{ flexShrink: 0 }} />
              <input className="form-input" placeholder="What is this video about? (e.g. Building a Minecraft base)" value={topic} onChange={e => setTopic(e.target.value)} style={{ background: 'var(--card)', border: 'none', flex: 1 }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Video Title</label>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleGenerateText("title")} disabled={aiLoading === "title"}><Wand2 size={12}/> Auto-Write</button>
                </div>
                <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Catchy, highly clickable title" />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Description</label>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleGenerateText("description")} disabled={aiLoading === "description"}><Wand2 size={12}/> Auto-Write</button>
                </div>
                <textarea className="form-input" rows={6} value={description} onChange={e => setDescription(e.target.value)} placeholder="Hook, summary, timestamps, and links" />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Keywords & Tags</label>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleGenerateText("tags")} disabled={aiLoading === "tags"}><Wand2 size={12}/> Auto-Extract</button>
                </div>
                <input className="form-input" value={tags} onChange={e => setTags(e.target.value)} placeholder="comma, separated, tags" />
              </div>
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* RIGHT PANE: SETTINGS & PUBLISHING (Sticky) */}
        {/* ========================================== */}
        <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* SEO Score Tracker */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 20, padding: 24 }}>
            <ScoreCircle score={overallSEO} size={80} />
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>SEO Readiness</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: getScoreColor(overallSEO) }}>{overallSEO}%</div>
            </div>
          </div>

          {/* Visibility & Playlist */}
          <div className="card">
            <h3 className="heading-md mb-16" style={{ fontSize: 15 }}>Video Settings</h3>
            
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Add to Playlist</label>
            <select className="form-input mb-24" value={selectedPlaylist} onChange={(e) => setSelectedPlaylist(e.target.value)} style={{ cursor: 'pointer', background: 'var(--surface-2)', border: 'none' }}>
              <option value="">None</option>
              {allPlaylists.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>

            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Visibility</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[{ id: 'private', icon: Lock, label: 'Private', desc: 'Only you can view' }, 
                { id: 'unlisted', icon: Link, label: 'Unlisted', desc: 'Anyone with link' }, 
                { id: 'public', icon: Globe, label: 'Public', desc: 'Live to everyone' }].map(item => (
                <div key={item.id} onClick={() => setPrivacy(item.id)} style={{ display: 'flex', gap: 12, padding: 12, border: privacy === item.id ? '2px solid var(--accent)' : '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: privacy === item.id ? 'var(--card)' : 'transparent', alignItems: 'center' }}>
                  <item.icon size={18} color={privacy === item.id ? 'var(--accent)' : 'var(--text-muted)'} /> 
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: privacy === item.id ? 'var(--accent)' : 'var(--text)' }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: privacy === item.id ? 'var(--accent)' : 'var(--text-muted)', opacity: 0.8 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Publish Action */}
          <div className="card" style={{ background: 'var(--card)'}}>
            <button className="btn btn-primary" style={{ width: '100%', padding: 16, fontSize: 16, display: 'flex', justifyContent: 'center', gap: 8, boxShadow: '0 4px 12px rgba(10, 102, 194, 0.2)' }} onClick={handleUpload} disabled={uploading}>
              {uploading ? <Spinner size={20} /> : <><UploadCloud size={20} /> Publish to YouTube</>}
            </button>
            {uploadProgress && <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 12, textAlign: 'center', fontWeight: 600 }}>{uploadProgress}</div>}
          </div>

        </div>
      </div>
    </div>
  );
}