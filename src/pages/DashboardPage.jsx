import React from 'react';
import { Trophy, Eye, Zap, Layers, AlignLeft, Users, Video } from "lucide-react";
import { formatCount, getScoreColor } from "../utils";
import { PlaylistCard, ExpandableText } from "../components/Shared";
import { CHANNEL_ID } from "../config";

export default function DashboardPage({ channelData, videos, playlists, setPage, setEditingPlaylistId, setPreviousPage }) {
  const ch = channelData?.statistics || {};
  const snippet = channelData?.snippet || {};
  
  const totalViews = videos.reduce((a, v) => a + v.viewCount, 0);
  const avgEng = videos.length ? (videos.reduce((a, v) => a + v.engagementRate, 0) / videos.length).toFixed(2) : 0;
  const bestEng = [...videos].sort((a, b) => b.engagementRate - a.engagementRate)[0];

  return (
    <div className="page fade-in" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* 1. KEY PERFORMANCE INDICATORS (KPIs) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {[
          { label: "Subscribers", val: formatCount(parseInt(ch.subscriberCount || 0)), icon: <Users size={20} color="var(--accent)" />, bg: "var(--surface-2)" },
          { label: "Total Channel Views", val: formatCount(parseInt(ch.viewCount || 0)), icon: <Eye size={20} color="#057642" />, bg: "rgba(5, 118, 66, 0.1)" },
          { label: "Total Videos", val: formatCount(parseInt(videos.length || 0)), icon: <Video size={20} color="#D95C00" />, bg: "rgba(217, 92, 0, 0.1)" },
          { label: "Avg. Engagement", val: `${avgEng}×`, icon: <Zap size={20} color="#6b21a8" />, bg: "rgba(107, 33, 168, 0.1)" },
        ].map((stat, i) => (
          <div key={i} style={{ background: 'var(--card)', borderRadius: '16px', padding: '20px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: stat.bg, padding: '12px', borderRadius: '12px', display: 'flex' }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                {stat.label}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)' }}>
                {stat.val}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MAIN CONTENT GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        
        {/* 2. CHANNEL PROFILE HERO */}
        <div style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #6b21a8 100%)', borderRadius: '20px', padding: '32px', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
          {/* Decorative Background Element */}
          <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '300px', height: '300px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', blur: '40px' }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', position: 'relative', zIndex: 1 }}>
            {snippet.thumbnails?.high?.url ? (
              <img src={snippet.thumbnails.high.url} alt="channel" style={{ width: 100, height: 100, borderRadius: "50%", border: "4px solid rgba(255,255,255,0.2)", objectFit: "cover", boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }} />
            ) : (
               <div style={{ width: 100, height: 100, borderRadius: "50%", border: "4px solid rgba(255,255,255,0.2)", background: 'rgba(255,255,255,0.1)' }} />
            )}
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: '32px', fontWeight: 800, marginBottom: '8px', lineHeight: 1.2 }}>{snippet.title}</h2>
              <div style={{ fontSize: '15px', color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>{snippet.customUrl || CHANNEL_ID}</div>
            </div>
          </div>

          {snippet.description && (
             <div style={{ marginTop: '24px', fontSize: '14px', color: "rgba(255,255,255,0.9)", lineHeight: 1.6, background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '12px' }}>
                <ExpandableText text={snippet.description} maxLength={150} />
             </div>
          )}
        </div>

        {/* 3. PERFORMANCE HIGHLIGHTS (Top Video & Best Engagement) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Top Video Card */}
          <div style={{ background: 'var(--card)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border)' }}>
             <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
               <Trophy size={18} color="#D95C00" /> Most Viewed Video
             </h3>
             {videos.length > 0 ? (() => {
               const topVid = [...videos].sort((a, b) => b.viewCount - a.viewCount)[0];
               return (
                 <div style={{ display: 'flex', gap: '16px' }}>
                    {topVid.thumbnail && <img src={topVid.thumbnail} style={{ width: 120, height: 68, objectFit: "cover", borderRadius: '8px', flexShrink: 0 }} />}
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{topVid.title}</div>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Eye size={14}/> {formatCount(topVid.viewCount)} Views</span>
                      </div>
                    </div>
                 </div>
               );
             })() : (
               <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No video data available.</div>
             )}
          </div>

          {/* Best Engagement Card */}
          <div style={{ background: 'var(--card)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border)' }}>
             <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
               <Zap size={18} color="var(--accent)" /> Highest Engagement
             </h3>
             {bestEng ? (
                <div style={{ display: 'flex', gap: '16px' }}>
                  {bestEng.thumbnail && <img src={bestEng.thumbnail} style={{ width: 120, height: 68, objectFit: "cover", borderRadius: '8px', flexShrink: 0 }} />}
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{bestEng.title}</div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '13px', fontWeight: 600, color: getScoreColor(Math.min(bestEng.engagementRate * 10, 100)) }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Zap size={14}/> {bestEng.engagementRate}× Rate</span>
                    </div>
                  </div>
               </div>
             ) : (
               <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No engagement data available.</div>
             )}
          </div>
        </div>
      </div>

      {/* 4. LISTS SECTION (Top 5 Videos & Playlists side-by-side) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        
        {/* Top 5 Videos List */}
        <div style={{ background: 'var(--card)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <AlignLeft size={18} color="var(--text-muted)" /> Top Performing Recent Videos
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[...videos].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5).map((v, i) => (
              <div key={v.id} style={{ display: "flex", gap: '12px', alignItems: "center", paddingBottom: "16px", borderBottom: i !== 4 ? "1px solid var(--surface-2)" : "none" }}>
                <span style={{ fontWeight: 800, fontSize: '14px', color: "var(--text-light)", width: '20px', textAlign: "center", flexShrink: 0 }}>{i + 1}</span>
                {v.thumbnail && <img src={v.thumbnail} style={{ width: 64, height: 36, objectFit: "cover", borderRadius: '4px', flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: '4px' }}>{v.title}</div>
                  <div style={{ fontSize: '12px', color: "var(--text-muted)", display: 'flex', gap: '12px', fontWeight: 500 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Eye size={12}/> {formatCount(v.viewCount)}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Zap size={12}/> {v.engagementRate}×</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Playlists Grid (If available) */}
        {playlists.length > 0 && (
          <div style={{ background: 'var(--card)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} color="var(--text-muted)" /> Quick Playlists
              </h3>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', cursor: 'pointer' }} onClick={() => setPage && setPage("playlists")}>View All</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
              {playlists.slice(0, 4).map(p => (
                <div 
                  key={p.id} 
                  onClick={() => {
                    if(setPreviousPage) setPreviousPage("dashboard");
                    if(setEditingPlaylistId) setEditingPlaylistId(p.id);
                    if(setPage) setPage("editplaylist");
                  }}
                  style={{ cursor: 'pointer', transition: 'transform 0.2s ease' }}
                  title={`Edit Playlist: ${p.title}`}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <PlaylistCard playlist={p} />
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}