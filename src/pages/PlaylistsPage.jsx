import React from 'react';
import { ArrowLeft, Layers } from 'lucide-react';
import { PlaylistCard } from '../components/Shared';

export default function PlaylistsPage({ playlists, setPage, setEditingPlaylistId, setPreviousPage }) {
  
  const handlePlaylistClick = (playlist) => {
    if(setPreviousPage) setPreviousPage("playlists");
    if(setEditingPlaylistId) setEditingPlaylistId(playlist.id);
    if(setPage) setPage("editplaylist");
  };

  return (
    <div className="page fade-in" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Header & Back Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <button 
          className="btn btn-secondary" 
          onClick={() => setPage && setPage("dashboard")}
          style={{ padding: '8px 12px' }}
        >
          <ArrowLeft size={16} /> Dashboard
        </button>
        <div>
          <h1 className="heading-xl" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Layers size={24} color="var(--accent)" /> All Playlists
          </h1>
          <p className="text-muted text-sm">Manage and organize your channel's curated content.</p>
        </div>
      </div>

      {/* Playlists Grid */}
      {playlists && playlists.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
          {playlists.map((playlist) => (
            <div 
              key={playlist.id} 
              className="hover-lift"
              style={{ cursor: 'pointer' }}
            >
              <PlaylistCard playlist={playlist} onClick={() => handlePlaylistClick(playlist)} />
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Layers size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
          <h3>No Playlists Found</h3>
          <p>This channel currently doesn't have any public playlists.</p>
        </div>
      )}

    </div>
  );
}
