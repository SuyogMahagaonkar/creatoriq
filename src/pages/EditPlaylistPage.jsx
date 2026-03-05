import React, { useState, useEffect } from 'react';
import { Edit3, Save, ListVideo, AlertTriangle, CheckCircle2, ArrowLeft, Search, Video, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchSinglePlaylist, updatePlaylistMetadata, fetchPlaylistItemsExact, addVideoToPlaylist, removeVideoFromPlaylist } from '../api';
import { Spinner } from '../components/Shared';

export default function EditPlaylistPage({ playlistId, setPage, channelVideos, previousPage }) {
  const [rawPlaylist, setRawPlaylist] = useState(null);
  
  // Metadata States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState("public");
  
  // Video Management States
  const [videoSearch, setVideoSearch] = useState("");
  const [mergedVideos, setMergedVideos] = useState([]); 
  const [initialVideos, setInitialVideos] = useState({}); 
  const [selectedVideos, setSelectedVideos] = useState(new Set()); 

  // --- NEW PAGINATION STATES ---
  const [currentPage, setCurrentPage] = useState(1);
  const videosPerPage = 10;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // AUTO-LOAD PLAYLIST DATA & VIDEOS
  useEffect(() => {
    if (!playlistId) { setError("No playlist selected."); setLoading(false); return; }

    const loadData = async () => {
      setLoading(true); setError(""); setSuccess("");
      try {
        const pData = await fetchSinglePlaylist(playlistId);
        setRawPlaylist(pData);
        setTitle(pData.snippet.title || "");
        setDescription(pData.snippet.description || "");
        setPrivacy(pData.status?.privacyStatus || "public");

        const items = await fetchPlaylistItemsExact(playlistId);
        
        const initialMap = {};
        const activeSet = new Set();
        const playlistSpecificVideos = [];

        items.forEach(item => {
          const vidId = item.snippet.resourceId.videoId;
          initialMap[vidId] = item.id; 
          activeSet.add(vidId); 
          
          playlistSpecificVideos.push({
            id: vidId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails?.default?.url || ""
          });
        });

        const combined = [...channelVideos];
        playlistSpecificVideos.forEach(pv => {
          if (!combined.some(cv => (cv.id?.videoId || cv.id) === pv.id)) {
            combined.push({ id: pv.id, snippet: { title: pv.title, thumbnails: { default: { url: pv.thumbnail } } } });
          }
        });

        setMergedVideos(combined);
        setInitialVideos(initialMap);
        setSelectedVideos(activeSet);

      } catch (err) { setError(err.message); } 
      finally { setLoading(false); }
    };
    loadData();
  }, [playlistId, channelVideos]);

  // SMART RESET: Go back to page 1 if the user starts typing a search
  useEffect(() => {
    setCurrentPage(1);
  }, [videoSearch]);

  const toggleVideo = (vidId) => {
    const newSet = new Set(selectedVideos);
    if (newSet.has(vidId)) newSet.delete(vidId);
    else newSet.add(vidId);
    setSelectedVideos(newSet);
  };

  const handleSave = async () => {
    if (!rawPlaylist) return;
    setSaving(true); setError(""); setSuccess("");
    
    try {
      const updatedPlaylist = {
        id: rawPlaylist.id,
        snippet: { ...rawPlaylist.snippet, title: title, description: description },
        status: { ...rawPlaylist.status, privacyStatus: privacy }
      };
      await updatePlaylistMetadata(updatedPlaylist);

      const videosToAdd = [...selectedVideos].filter(id => !initialVideos[id]);
      const videosToRemove = Object.keys(initialVideos).filter(id => !selectedVideos.has(id));

      const newInitialMap = { ...initialVideos };

      for (const vidId of videosToAdd) {
        const addedItem = await addVideoToPlaylist(rawPlaylist.id, vidId);
        newInitialMap[vidId] = addedItem.id; 
      }

      for (const vidId of videosToRemove) {
        if (initialVideos[vidId]) {
          await removeVideoFromPlaylist(initialVideos[vidId]);
          delete newInitialMap[vidId]; 
        }
      }

      setInitialVideos(newInitialMap);
      setSuccess(`Playlist updated! Added ${videosToAdd.length} videos, removed ${videosToRemove.length} videos.`);
      
    } catch (err) { setError(err.message); } 
    finally { setSaving(false); }
  };

  // --- PAGINATION LOGIC ---
  const filteredVideos = mergedVideos.filter(v => (v.snippet?.title || v.title || "").toLowerCase().includes(videoSearch.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filteredVideos.length / videosPerPage));
  const startIndex = (currentPage - 1) * videosPerPage;
  const currentVideos = filteredVideos.slice(startIndex, startIndex + videosPerPage);

  return (
    <div className="page fade-in" style={{ paddingBottom: 60 }}>
      {/* NAVIGATION & HEADER */}
      <button 
        onClick={() => setPage(previousPage || "myvideos")} 
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600, fontSize: 14, marginBottom: 24 }}
      >
        <ArrowLeft size={16} /> Back to {previousPage === "dashboard" ? "Dashboard" : "Library"}
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
        <div>
          <h1 className="heading-xl mb-8" style={{ display: 'flex', alignItems: 'center', gap: 12 }}><ListVideo color="var(--accent)" size={32} /> Edit Playlist</h1>
          <p className="text-muted text-sm">Update playlist details and easily manage the videos inside it.</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || !rawPlaylist || loading} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', fontSize: 16 }}>
          {saving ? <Spinner size={20} /> : <><Save size={20} /> Save Changes</>}
        </button>
      </div>

      {error && <div className="error-box mb-24"><AlertTriangle size={18} /> {error}</div>}
      {success && <div style={{ background: "#EAF4EA", color: "#057642", padding: 16, borderRadius: 8, fontSize: 14, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle2 size={18} /> {success}</div>}

      {loading && <div style={{ padding: '80px 0', display: 'flex', justifyContent: 'center' }}><Spinner size={40} /></div>}

      {rawPlaylist && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32, alignItems: 'start' }}>
          
          {/* LEFT PANE: Core Metadata */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div className="card">
              <h3 className="heading-md mb-20" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Edit3 size={18} className="text-muted"/> Playlist Details</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Playlist Title</label>
                  <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} style={{ fontSize: 16, fontWeight: 600 }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Description</label>
                  <textarea className="form-input" rows={12} value={description} onChange={e => setDescription(e.target.value)} style={{ fontSize: 14, lineHeight: 1.6 }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Privacy Status</label>
                  <select className="form-input" value={privacy} onChange={e => setPrivacy(e.target.value)}>
                    <option value="public">Public</option>
                    <option value="unlisted">Unlisted</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANE: Video Manager */}
          <div className="card" style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', height: 'auto' }}>
            <h3 className="heading-md mb-16" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Video size={18} className="text-accent"/> Manage Videos
              <span style={{ background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 12, fontSize: 12, color: 'var(--text-muted)' }}>{selectedVideos.size} Selected</span>
            </h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-2)', padding: '8px 12px', borderRadius: 8, marginBottom: 16 }}>
              <Search size={16} color="var(--text-light)" />
              <input type="text" placeholder="Search videos to add/remove..." value={videoSearch} onChange={e => setVideoSearch(e.target.value)} style={{ border: 'none', background: 'transparent', flex: 1, fontSize: 14, outline: 'none', color: 'var(--text)' }} />
            </div>
            
            {/* Paginated Checkbox List */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 8, display: 'flex', flexDirection: 'column', gap: 4, background: 'var(--card)', minHeight: 400 }}>
              {filteredVideos.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-light)', fontSize: 13 }}>No videos match your search.</div>
              ) : (
                currentVideos.map(v => {
                  const vidId = v.id?.videoId || v.id;
                  const vidTitle = v.snippet?.title || v.title || "Untitled Video";
                  const vidThumb = v.snippet?.thumbnails?.default?.url || v.thumbnail;
                  const isChecked = selectedVideos.has(vidId);
                  
                  return (
                    <label key={vidId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px', cursor: 'pointer', borderRadius: 8, background: isChecked ? 'var(--surface-2)' : 'transparent', border: isChecked ? '1px solid var(--accent)' : '1px solid transparent', transition: 'all 0.2s ease' }}>
                      <input type="checkbox" checked={isChecked} onChange={() => toggleVideo(vidId)} style={{ accentColor: 'var(--accent)', width: 18, height: 18, cursor: 'pointer', flexShrink: 0 }} />
                      {vidThumb && <img src={vidThumb} alt="thumb" style={{ width: 40, height: 22, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />}
                      <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: isChecked ? 700 : 500, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{vidTitle}</span>
                    </label>
                  );
                })
              )}
            </div>

            {/* PAGINATION CONTROLS */}
            {filteredVideos.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: '0 4px' }}>
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                  disabled={currentPage === 1}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: currentPage === 1 ? 'var(--text-light)' : 'var(--text)', fontWeight: 600, fontSize: 13 }}
                >
                  <ChevronLeft size={16} /> Prev
                </button>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                  Page {currentPage} of {totalPages}
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                  disabled={currentPage === totalPages}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: currentPage === totalPages ? 'var(--text-light)' : 'var(--text)', fontWeight: 600, fontSize: 13 }}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            )}
            
          </div>

        </div>
      )}
    </div>
  );
}