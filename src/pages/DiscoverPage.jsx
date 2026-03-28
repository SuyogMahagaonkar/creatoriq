import React, { useState, useCallback } from "react";
import { Search, TrendingUp, Filter, BarChart } from "lucide-react";
import { ErrorBox, Spinner, VideoCard } from "../components/Shared";
import { fetchNicheVideos } from "../api";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatCount } from "../utils";

const NICHES = ["JavaScript", "React", "Python", "Machine Learning", "Web Development", "DevOps", "System Design", "Startup", "Productivity", "Finance"];

export default function DiscoverPage() {
  const [query, setQuery] = useState("JavaScript tutorials 2024");
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (q) => {
    if (!q.trim()) return;
    setLoading(true); setError(null); setSearched(true);
    try {
      const results = await fetchNicheVideos(q, 12);
      setVideos(results);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '16px', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', width: 220 }}>
          <p style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text)', marginBottom: '8px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{data.title}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderTop: '1px solid var(--border-light)' }}>
             <span style={{ color: 'var(--text-muted)' }}>Views</span>
             <span style={{ color: 'var(--text)', fontWeight: 600 }}>{formatCount(data.x)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
             <span style={{ color: 'var(--text-muted)' }}>Engagement</span>
             <span style={{ color: 'var(--chart-primary)', fontWeight: 600 }}>{(data.y * 100).toFixed(1)}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const chartData = videos.map(v => ({ x: v.viewCount, y: v.engagementRate, title: v.title }));

  return (
    <div className="page fade-in">
      <div style={{ marginBottom: '40px' }}>
         <h1 style={{ fontSize: '32px', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '8px' }}>Discover Niche</h1>
         <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>Search and analyze competitor videos. Unearth high-engagement outliers.</p>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
          <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
             style={{ width: '100%', padding: '14px 16px 14px 48px', fontSize: '15px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', color: 'var(--text)', outline: 'none', transition: 'box-shadow 0.2s ease' }}
             placeholder="Search YouTube topics..." 
             value={query} 
             onChange={e => setQuery(e.target.value)} 
             onKeyDown={e => e.key === "Enter" && search(query)} 
             onFocus={(e) => e.target.style.boxShadow = '0 0 0 3px var(--chart-primary-transparent)'}
             onBlur={(e) => e.target.style.boxShadow = 'none'}
          />
        </div>
        <button className="btn btn-primary" style={{ padding: '0 24px', borderRadius: 'var(--radius-lg)' }} onClick={() => search(query)}>Analyze Engine</button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: '8px', marginBottom: '48px' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-light)', display: 'flex', alignItems: 'center', marginRight: '8px', fontWeight: 500 }}><Filter size={14} style={{ marginRight: 4 }} />Trending:</span>
        {NICHES.map(n => (
           <button key={n} onClick={() => { setQuery(n); search(n); }} style={{ padding: '6px 14px', fontSize: '13px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', color: 'var(--text)', cursor: 'pointer', transition: 'background 0.2s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface)'}>
             {n}
           </button>
        ))}
      </div>

      {error && <ErrorBox message={error} />}
      {loading && <div style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>}
      
      {!loading && searched && videos.length > 0 && (
        <div className="fade-in">
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px', marginBottom: '48px' }}>
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '32px', background: 'var(--surface)' }}>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                 <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <TrendingUp size={16} color="var(--text-muted)" /> Outlier Mapping
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Top-left indicates high engagement multiplier against viewership.</p>
                 </div>
                 <span className="tag tag-ai">AI Evaluated</span>
               </div>

               <div style={{ width: '100%', height: 350 }}>
                 <ResponsiveContainer width="100%" height="100%">
                   <ScatterChart margin={{ top: 20, right: 20, bottom: 0, left: -20 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                     <XAxis type="number" dataKey="x" name="Views" tickFormatter={(val) => formatCount(val)} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                     <YAxis type="number" dataKey="y" name="Engagement" tickFormatter={(val) => (val * 100).toFixed(0) + '%'} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                     <Tooltip cursor={{ strokeDasharray: '3 3', stroke: 'var(--border)' }} content={<CustomTooltip />} />
                     <Scatter name="Videos" data={chartData} fill="var(--text-light)">
                       {chartData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.y > 0.05 ? 'var(--chart-primary)' : 'var(--text-light)'} />
                       ))}
                     </Scatter>
                   </ScatterChart>
                 </ResponsiveContainer>
               </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
             <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Top Results for "{query}"</h3>
             <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sorted by Engagement multiplier</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {[...videos].sort((a, b) => b.engagementRate - a.engagementRate).map(v => (
              <a key={v.id} href={`https://youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit" }}>
                <VideoCard video={v} />
              </a>
            ))}
          </div>
        </div>
      )}

      {!loading && !searched && (
        <div style={{ textAlign: "center", padding: "120px 0", color: "var(--text-light)" }}>
          <div style={{ display: 'inline-flex', padding: '24px', borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', marginBottom: '24px' }}>
             <BarChart size={32} color="var(--text-muted)" />
          </div>
          <div style={{ fontWeight: 600, fontSize: '18px', marginBottom: '8px', color: "var(--text)" }}>Ready to analyze</div>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Search for a topic or click a trending tag to begin plotting.</div>
        </div>
      )}
    </div>
  );
}