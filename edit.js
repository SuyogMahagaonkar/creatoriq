const fs = require('fs');
let code = fs.readFileSync('src/pages/UploadPage.jsx', 'utf8');

code = code.replace(
  "import { generateFreshSEO, uploadVideoToYouTube, fetchPlaylists, addVideoToPlaylist, analyzeThumbnailWithAI, generateAIThumbnail } from '../api';",
  "import { generateFreshSEO, uploadVideoToYouTube, fetchPlaylists, addVideoToPlaylist, analyzeThumbnailWithAI, generateAIThumbnail, uploadCustomThumbnail } from '../api';"
);

const stateTarget = `  // Thumbnail States
  const [thumbFile, setThumbFile] = useState(null);
  const [thumbPreview, setThumbPreview] = useState(null);
  const [thumbPrompt, setThumbPrompt] = useState(draft.thumbPrompt || "");

  // Detect unsaved text draft changes
  useEffect(() => {
    // Only save if at least one field is non-empty
    if (topic || title || description || tags || thumbPrompt) {
      localStorage.setItem('creator_iq_upload_draft', JSON.stringify({
        topic, title, description, tags, privacy, selectedPlaylist, thumbPrompt
      }));
    }
  }, [topic, title, description, tags, privacy, selectedPlaylist, thumbPrompt]);

  const handleClearDraft = () => {
    localStorage.removeItem('creator_iq_upload_draft');
    setTopic(""); setTitle(""); setDescription(""); setTags(""); setPrivacy("private"); setSelectedPlaylist(""); setThumbPrompt("");
  };
  const [generatingThumb, setGeneratingThumb] = useState(false);
  const [thumbAnalysis, setThumbAnalysis] = useState(null);
  const [analyzingThumb, setAnalyzingThumb] = useState(false);
  const [thumbExpanded, setThumbExpanded] = useState(false);`;

const stateReplacement = `  // Thumbnail Arena States
  const [thumbs, setThumbs] = useState([{}, {}, {}]); // { file, preview, prompt, analysis, generating, analyzing, expanded }
  const [activeThumbIdx, setActiveThumbIdx] = useState(0);
  const [thumbWinnerIdx, setThumbWinnerIdx] = useState(0); 

  const updateThumb = (idx, data) => {
    setThumbs(prev => prev.map((t, i) => i === idx ? { ...t, ...data } : t));
  };

  // Detect unsaved text draft changes
  useEffect(() => {
    if (topic || title || description || tags) {
      localStorage.setItem('creator_iq_upload_draft', JSON.stringify({
        topic, title, description, tags, privacy, selectedPlaylist
      }));
    }
  }, [topic, title, description, tags, privacy, selectedPlaylist]);

  const handleClearDraft = () => {
    localStorage.removeItem('creator_iq_upload_draft');
    setTopic(""); setTitle(""); setDescription(""); setTags(""); setPrivacy("private"); setSelectedPlaylist(""); setThumbs([{},{},{}]);
  };`;

code = code.replace(stateTarget, stateReplacement);

const handlersTargetIndex = code.indexOf('// --- THUMBNAIL MANAGERS ---');
const handlersEndIndex = code.indexOf('const handleUpload = async () =>');
const handlersTarget = code.substring(handlersTargetIndex, handlersEndIndex);

const handlersReplacement = `// --- THUMBNAIL MANAGERS ---
  const handleClearThumbnail = (idx) => {
    updateThumb(idx, { file: null, preview: null, analysis: null, prompt: "" });
    if(idx === activeThumbIdx) setIsExtracting(false);
  };

  const handleFileSelect = (e) => {
    const newFile = e.target.files[0];
    if (newFile) {
      setFile(newFile);
      setThumbs([{},{},{}]); // Clear arena if video changes
    }
  };

  const handleThumbUpload = (e) => {
    const imgFile = e.target.files[0];
    if (!imgFile) return;
    updateThumb(activeThumbIdx, { file: imgFile, preview: URL.createObjectURL(imgFile), analysis: null });
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
    
    fetch(dataUrl).then(res => res.blob()).then(blob => {
      updateThumb(activeThumbIdx, { preview: dataUrl, file: new File([blob], "extracted_thumb.jpg", { type: "image/jpeg" }), analysis: null });
      setIsExtracting(false);
    });
  };

  // --- AI GENERATION & ANALYSIS ---
  const handleGenerateThumbAI = async () => {
    const prompt = thumbs[activeThumbIdx].prompt;
    if (!prompt) return setError("Please enter an image prompt first.");
    updateThumb(activeThumbIdx, { generating: true }); setError("");
    try {
      const base64Str = await generateAIThumbnail(prompt);
      const dataUrl = \`data:image/jpeg;base64,\${base64Str}\`;
      
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
          } catch (err) { console.error(err); } 
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

  `;
code = code.replace(handlersTarget, handlersReplacement);

const uploadTarget = `    try {
      const res = await uploadVideoToYouTube(file, metadata, token);
      if (selectedPlaylist) {
        setUploadProgress("Adding to playlist...");
        await addVideoToPlaylist(selectedPlaylist, res.id, token);
      }
      setSuccessId(res.id); setUploadProgress("");
      setFile(null); setTitle(""); setDescription(""); setTags(""); setTopic(""); setSelectedPlaylist(""); handleClearThumbnail();
    } catch (err) { setError(err.message); setUploadProgress(""); } `;
const uploadReplacement = `    try {
      const res = await uploadVideoToYouTube(file, metadata, token);
      if (selectedPlaylist) {
        setUploadProgress("Adding to playlist...");
        await addVideoToPlaylist(selectedPlaylist, res.id, token);
      }
      
      const winnerThumb = thumbs[thumbWinnerIdx]?.file;
      if(winnerThumb) {
        setUploadProgress("Uploading winning thumbnail...");
        await uploadCustomThumbnail(res.id, winnerThumb, token);
      }

      setSuccessId(res.id); setUploadProgress("");
      setFile(null); setTitle(""); setDescription(""); setTags(""); setTopic(""); setSelectedPlaylist(""); setThumbs([{},{},{}]);
    } catch (err) { setError(err.message); setUploadProgress(""); } `;
code = code.replace(uploadTarget, uploadReplacement);

const uiTargetIndex = code.indexOf('{/* Thumbnail Studio */}');
const uiEndIndex = code.indexOf('{/* 2. AI CONTENT ENGINE */}');
const uiTarget = code.substring(uiTargetIndex, uiEndIndex);

const uiReplacement = `{/* THUMBNAIL ARENA */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}><Wand2 size={16}/> A/B Thumbnail Arena</label>
                {thumbs.some(t => t.file) && (
                   <button className="btn btn-primary btn-sm" onClick={handleAnalyzeAllCandidates} disabled={thumbs.some(t => t.analyzing)}>
                     {thumbs.some(t => t.analyzing) ? <Spinner size={14}/> : <><Sparkles size={14}/> Analyze All</>}
                   </button>
                )}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                 {thumbs.map((thumb, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setActiveThumbIdx(idx)}
                      style={{ border: activeThumbIdx === idx ? '2px solid var(--accent)' : '2px solid transparent', borderRadius: 12, padding: 4, background: thumbWinnerIdx === idx && thumb.file ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.2), transparent)' : 'transparent', position: 'relative', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                       {thumbWinnerIdx === idx && thumb.analysis && (
                          <div style={{ position: 'absolute', top: -10, right: -10, background: '#eab308', color: '#fff', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', zIndex: 10 }}>#1</div>
                       )}

                       <div style={{ background: 'var(--surface-2)', borderRadius: 8, overflow: 'hidden', aspectRatio: '16/9', position: 'relative', border: '1px solid var(--border)' }}>
                          {thumb.preview ? (
                             <>
                               <img src={thumb.preview} alt={\`Thumb \${idx}\`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                               <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent 50%)' }} />
                               
                               <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  {thumb.analysis ? (
                                    <div style={{ background: thumb.analysis.score >= 70 ? '#057642' : '#CC1016', color: '#fff', padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                                      {thumb.analysis.score} CTR
                                    </div>
                                  ) : thumb.analyzing ? (
                                    <div style={{ color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}><Spinner size={10}/> Scoring...</div>
                                  ) : (
                                    <div style={{ color: '#fff', fontSize: 11, opacity: 0.8 }}>Ready</div>
                                  )}
                                  
                                  <button onClick={(e) => { e.stopPropagation(); handleClearThumbnail(idx); }} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', borderRadius: 4, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                    <X size={12}/>
                                  </button>
                               </div>
                             </>
                          ) : (
                             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                               {thumb.generating ? <Spinner size={20}/> : <span style={{ fontSize: 40, opacity: 0.1 }}>{idx+1}</span>}
                             </div>
                          )}
                       </div>
                    </div>
                 ))}
              </div>

              {/* EDITOR PANEL FOR ACTIVE SLOT */}
              <div style={{ marginTop: 16, background: 'var(--surface-2)', padding: 16, borderRadius: 12, border: '1px solid var(--accent)' }}>
                 <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 12, textTransform: 'uppercase' }}>Editing Slot {activeThumbIdx + 1}</div>
                 
                 {isExtracting ? (
                   <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Extract highly-clickable frame:</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', minWidth: 36 }}>{formatTime(extractTime)}</span>
                        <input type="range" min="0" max={videoDuration} step="0.1" value={extractTime} onChange={handleSliderChange} style={{ flex: 1, cursor: 'pointer', accentColor: 'var(--accent)' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button className="btn btn-secondary" onClick={() => setIsExtracting(false)} style={{ flex: 1 }}>Cancel</button>
                        <button className="btn btn-primary" onClick={captureFrame} style={{ flex: 2 }}><Crop size={16} style={{ marginRight: 6 }}/> Capture Frame</button>
                      </div>
                   </div>
                 ) : (
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                      <label className="btn btn-secondary" style={{ display: 'flex', flexDirection: 'column', gap: 8, height: 90, justifyContent: 'center', padding: '16px 8px' }}>
                        <ImagePlus size={20} color="var(--accent)" />
                        <span style={{ fontSize: 12 }}>Upload File</span>
                        <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleThumbUpload} />
                      </label>
                      <button className="btn btn-secondary" onClick={() => { if(!file) setError("Please upload a video first."); else setIsExtracting(true); }} disabled={!file} style={{ display: 'flex', flexDirection: 'column', gap: 8, height: 90, justifyContent: 'center', padding: '16px 8px' }}>
                        <Crop size={20} color={file ? "var(--accent)" : "var(--text-light)"} />
                        <span style={{ fontSize: 12 }}>Extract Frame</span>
                      </button>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: 90 }}>
                        <input className="form-input" placeholder="AI Prompt..." value={thumbs[activeThumbIdx].prompt || ""} onChange={e => updateThumb(activeThumbIdx, { prompt: e.target.value })} style={{ height: '50%', padding: '4px 8px', fontSize: 11, background: 'var(--surface)', border: '1px solid var(--border)' }} />
                        <button className="btn btn-primary" onClick={handleGenerateThumbAI} disabled={thumbs[activeThumbIdx].generating || !thumbs[activeThumbIdx].prompt} style={{ height: '50%', fontSize: 11, padding: 0 }}>
                          {thumbs[activeThumbIdx].generating ? <Spinner size={14} /> : <><Sparkles size={12} style={{ marginRight: 4 }}/> Generate</>}
                        </button>
                      </div>
                   </div>
                 )}
                 
                 {thumbs[activeThumbIdx].analysis && (
                    <div className="fade-in" style={{ marginTop: 16, background: 'var(--card)', border: \`1px solid \${thumbs[activeThumbIdx].analysis.score >= 70 ? '#CDE2CD' : '#F1B2B5'}\`, borderRadius: 8, padding: 12 }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: 12, color: thumbs[activeThumbIdx].analysis.score >= 70 ? '#057642' : '#CC1016', textTransform: 'uppercase' }}>CTR Score Analysis</span>
                          <span style={{ fontWeight: 800, fontSize: 16, color: thumbs[activeThumbIdx].analysis.score >= 70 ? '#057642' : '#CC1016' }}>{thumbs[activeThumbIdx].analysis.score}/100</span>
                       </div>
                       <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>
                          {(thumbs[activeThumbIdx].expanded ? thumbs[activeThumbIdx].analysis.feedback : thumbs[activeThumbIdx].analysis.feedback?.slice(0, 2)).map((f, i) => <li key={i}>{f}</li>)}
                       </ul>
                       {thumbs[activeThumbIdx].analysis.feedback?.length > 2 && (
                          <div onClick={() => updateThumb(activeThumbIdx, { expanded: !thumbs[activeThumbIdx].expanded })} style={{ cursor: 'pointer', color: 'var(--accent)', fontSize: 11, fontWeight: 700, marginTop: 8, textAlign: 'center' }}>
                            {thumbs[activeThumbIdx].expanded ? "Show Less" : "Show More"}
                          </div>
                       )}
                    </div>
                 )}
              </div>
            </div>
            
            `;
code = code.replace(uiTarget, uiReplacement);

fs.writeFileSync('src/pages/UploadPage.jsx', code);
console.log('Done!');
