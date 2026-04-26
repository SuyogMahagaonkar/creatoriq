import React, { useState, useEffect, useContext } from 'react';
import { UploadCloud, FileVideo, Layers, Wand2, CheckCircle2, AlertTriangle, Globe, Lock, Link, Play, X } from 'lucide-react';
import { generateFreshSEO, uploadVideoToYouTube, fetchPlaylists, addVideoToPlaylist } from '../api';
import { Spinner } from '../components/Shared';
import { CreatorContext } from '../context/CreatorContext';

export default function BulkUploadPage() {
  const { geminiKey, setIsSettingsOpen, setSettingsTab } = useContext(CreatorContext);
  const handleLockedAI = () => { setSettingsTab('ai'); setIsSettingsOpen(true); };
  const [topic, setTopic] = useState("");
  const [videos, setVideos] = useState([]);
  
  const [privacy, setPrivacy] = useState("private");
  const [allPlaylists, setAllPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState("");
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [globalError, setGlobalError] = useState("");

  useEffect(() => {
    const channelId = localStorage.getItem("creator_iq_channel_id");
    if (channelId) {
      fetchPlaylists(50).then(data => { if (data) setAllPlaylists(data); }).catch(console.error);
    }
  }, []);

  const handleFileSelect = (e) => {
    const newFiles = Array.from(e.target.files);
    if (!newFiles.length) return;
    
    setVideos(prev => [
      ...prev,
      ...newFiles.map(file => ({
        id: Math.random().toString(36).substring(7),
        file,
        status: 'IDLE', 
        title: "",
        description: "",
        tags: "",
        errorMsg: "",
        successId: ""
      }))
    ]);
  };

  const removeVideo = (id) => {
    setVideos(videos.filter(v => v.id !== id));
  };

  const handleGenerateAll = async () => {
    if (!topic.trim()) return setGlobalError("Please provide a Master Topic first.");
    if (videos.length === 0) return setGlobalError("Please upload at least one video.");
    setGlobalError("");
    setIsProcessing(true);

    const defaultLinks = localStorage.getItem("creator_iq_social_links") || "";
    const updatedVideos = [...videos];
    
    for (let i = 0; i < updatedVideos.length; i++) {
        const vid = updatedVideos[i];
        if (vid.status === 'GENERATED' || vid.status === 'DONE') continue;
        
        updatedVideos[i].status = 'GENERATING';
        setVideos([...updatedVideos]);

        try {
            const specificTopic = `${topic}. Context file name: ${vid.file.name}`;
            const titlesObj = await generateFreshSEO("title", specificTopic, "", "");
            const titleStr = Array.isArray(titlesObj) ? titlesObj[0] : String(titlesObj);
            
            const descObj = await generateFreshSEO("description", specificTopic, titleStr, "");
            let descStr = Array.isArray(descObj) ? descObj[0] : String(descObj);
            if (defaultLinks.trim()) {
                descStr += "\n\n" + defaultLinks.trim();
            }

            const tagsObj = await generateFreshSEO("tags", specificTopic, titleStr, descStr);
            const tagsStr = Array.isArray(tagsObj) ? (tagsObj.length > 1 ? tagsObj.join(", ") : tagsObj[0]) : String(tagsObj);

            updatedVideos[i].title = titleStr || vid.file.name;
            updatedVideos[i].description = descStr;
            updatedVideos[i].tags = tagsStr;
            updatedVideos[i].status = 'GENERATED';
        } catch (err) {
            console.error(err);
            updatedVideos[i].status = 'ERROR';
            updatedVideos[i].errorMsg = err.message || "Failed to generate AI data";
        }
        setVideos([...updatedVideos]);

        await new Promise(r => setTimeout(r, 1000));
    }
    
    setIsProcessing(false);
  };

  const handlePublishAll = async () => {
    const toUpload = videos.filter(v => v.status === 'GENERATED');
    if (toUpload.length === 0) return setGlobalError("No ready videos found. Please Generate SEO first.");
    
    setGlobalError("");
    setIsProcessing(true);
    const token = localStorage.getItem("creator_iq_token");

    const updatedVideos = [...videos];

    for (let i = 0; i < updatedVideos.length; i++) {
        const vid = updatedVideos[i];
        if (vid.status !== 'GENERATED') continue;

        updatedVideos[i].status = 'UPLOADING';
        setVideos([...updatedVideos]);

        try {
            const metadata = {
              snippet: { 
                title: vid.title.slice(0, 100).trim() || vid.file.name, 
                description: vid.description, 
                tags: vid.tags.split(",").map(t => t.trim()).filter(Boolean), 
                categoryId: "22" 
              },
              status: { privacyStatus: privacy, selfDeclaredMadeForKids: false }
            };

            const res = await uploadVideoToYouTube(vid.file, metadata, token);
            
            if (selectedPlaylist) {
                await addVideoToPlaylist(selectedPlaylist, res.id, token);
            }

            updatedVideos[i].status = 'DONE';
            updatedVideos[i].successId = res.id;
        } catch (err) {
            console.error(err);
            updatedVideos[i].status = 'ERROR';
            updatedVideos[i].errorMsg = err.message || "Upload Failed";
        }
        setVideos([...updatedVideos]);
    }
    setIsProcessing(false);
  };

  return (
    <div className="page fade-in" style={{ paddingBottom: 60, maxWidth: 1400, margin: '0 auto' }}>
      
      {/* PAGE HEADER */}
      <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 8, color: 'var(--text)' }}>
          Bulk Upload Pipeline
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Automate your workflow. Process and upload multiple videos simultaneously with AI-powered SEO.</p>
      </div>

      {globalError && <div style={{ padding: 16, background: 'var(--error-bg)', color: 'var(--error-text)', border: '1px solid var(--error-border)', borderRadius: 'var(--radius-md)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}><AlertTriangle size={16} /> {globalError}</div>}

      <div className="page-grid-2col">
        
        {/* LEFT PANE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          
          <div style={{ background: 'var(--surface)', padding: 24, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              1. Master Topic Context
            </h3>
            <input 
              className="form-input" 
              placeholder="e.g. Daily Minecraft Let's Play Series Episode..." 
              value={topic} 
              onChange={e => setTopic(e.target.value)} 
              disabled={isProcessing}
            />
          </div>

          <div style={{ background: 'var(--surface)', padding: 24, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><FileVideo size={18} color="var(--text-muted)"/> Queue ({videos.length})</h3>
                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', pointerEvents: isProcessing ? 'none' : 'auto', opacity: isProcessing ? 0.5 : 1 }}>
                   <UploadCloud size={14}/> Add Videos
                   <input type="file" multiple accept="video/mp4,video/x-m4v,video/*" style={{ display: 'none' }} onChange={handleFileSelect} disabled={isProcessing} />
                </label>
             </div>

             {videos.length === 0 ? (
                <div style={{ padding: 60, textAlign: 'center', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}>
                   <Layers size={40} style={{ opacity: 0.3, marginBottom: 12, margin: '0 auto' }} />
                   <p style={{ fontSize: 14 }}>Your queue is empty. Click <b>Add Videos</b> to begin.</p>
                </div>
             ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                   {videos.map((vid, idx) => (
                      <div key={vid.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 20, borderLeft: `6px solid ${vid.status === 'DONE' ? 'var(--success-text)' : vid.status === 'ERROR' ? 'var(--error-text)' : 'var(--accent)'}` }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: (vid.title || vid.description) ? 16 : 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)', wordBreak: 'break-word', paddingRight: 16 }}>{idx + 1}. {vid.file.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                               {vid.status === 'IDLE' && <span style={{ fontSize: 12, fontWeight: 600, background: 'var(--surface-hover)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>Pending AI</span>}
                               {vid.status === 'GENERATING' && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6 }}><Spinner size={12}/> Generating SEO</span>}
                               {vid.status === 'GENERATED' && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--success-text)', display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={14}/> Ready</span>}
                               {vid.status === 'UPLOADING' && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}><Spinner size={12}/> Uploading...</span>}
                               {vid.status === 'DONE' && <span style={{ fontSize: 12, fontWeight: 600, background: 'var(--success-text)', color: '#fff', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>Published</span>}
                               {vid.status === 'ERROR' && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--error-text)', display: 'flex', alignItems: 'center', gap: 4 }} title={vid.errorMsg}><AlertTriangle size={14}/> Error</span>}
                               
                               {['IDLE', 'ERROR', 'GENERATED'].includes(vid.status) && !isProcessing && (
                                  <button onClick={() => removeVideo(vid.id)} style={{ color: 'var(--text-light)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
                               )}
                            </div>
                         </div>
                         {(vid.title || vid.description) && (
                            <div style={{ background: 'var(--surface)', padding: 16, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                               <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: 'var(--text)' }}>{vid.title}</div>
                               <div style={{ color: 'var(--text-muted)', fontSize: 13, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{vid.description}</div>
                            </div>
                         )}
                         {vid.successId && (
                            <div style={{ marginTop: 12, fontSize: 13, textAlign: 'right' }}>
                               <a href={`https://studio.youtube.com/video/${vid.successId}/edit`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--success-text)", fontWeight: 600, textDecoration: 'underline' }}>View in YouTube Studio &rarr;</a>
                            </div>
                         )}
                      </div>
                   ))}
                </div>
             )}
          </div>
        </div>

        {/* RIGHT PANE */}
        <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          <div style={{ background: 'var(--surface)', padding: 24, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Upload Settings</h3>
            
            <div className="form-group mb-24">
              <label className="form-label">Add to Playlist</label>
              <select className="form-input" value={selectedPlaylist} onChange={(e) => setSelectedPlaylist(e.target.value)} disabled={isProcessing}>
                <option value="">None</option>
                {allPlaylists.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>

            <label className="form-label">Visibility Options</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[{ id: 'private', icon: Lock, label: 'Private' }, 
                { id: 'unlisted', icon: Link, label: 'Unlisted' }, 
                { id: 'public', icon: Globe, label: 'Public' }].map(item => (
                <div key={item.id} onClick={() => !isProcessing && setPrivacy(item.id)} style={{ display: 'flex', gap: 12, padding: 12, border: privacy === item.id ? '2px solid var(--accent)' : '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: isProcessing ? 'default' : 'pointer', background: privacy === item.id ? 'var(--bg)' : 'transparent', alignItems: 'center' }}>
                  <item.icon size={18} color={privacy === item.id ? 'var(--accent)' : 'var(--text-muted)'} /> 
                  <div style={{ fontSize: 14, fontWeight: 500, color: privacy === item.id ? 'var(--text)' : 'var(--text-muted)' }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button className="btn btn-secondary" style={{ width: '100%', padding: 16, fontSize: 14, display: 'flex', justifyContent: 'center', gap: 8, ...(geminiKey ? {} : { color: 'var(--text-muted)' }) }} onClick={geminiKey ? handleGenerateAll : handleLockedAI} disabled={(isProcessing || videos.length === 0) && !!geminiKey}>
              {geminiKey ? <><Wand2 size={18} className="text-accent" /> Auto-Write SEO (Batch)</> : <><Lock size={18} className="text-muted" /> Unlock AI SEO</>}
            </button>

            <button className="btn btn-primary" style={{ width: '100%', padding: 16, fontSize: 16, display: 'flex', justifyContent: 'center', gap: 8 }} onClick={handlePublishAll} disabled={isProcessing || !videos.some(v => v.status === 'GENERATED')}>
              <Play size={18} /> Execute Pipeline
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
