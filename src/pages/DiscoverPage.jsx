import React, { useState, useCallback } from "react";
import { Search } from "lucide-react";
import { ErrorBox, Spinner, VideoCard } from "../components/Shared";
import { fetchNicheVideos } from "../api";

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

  return (
    <div className="page fade-in">
      <h1 className="heading-xl mb-8">Discover Videos</h1>
      <p className="text-muted text-sm mb-24">Search YouTube for real competitor and niche videos. Ranked by engagement quality.</p>

      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <Search size={18} color="var(--text-light)" />
          <input className="search-input" placeholder="Search YouTube videos..." value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && search(query)} />
        </div>
        <button className="btn btn-primary" onClick={() => search(query)}>Search</button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
        {NICHES.map(n => <button key={n} className="tag tag-outline" onClick={() => { setQuery(n); search(n); }}>{n}</button>)}
      </div>

      {error && <ErrorBox message={error} />}
      {loading && <Spinner />}
      {!loading && searched && videos.length > 0 && (
        <>
          <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 16 }}>{videos.length} results for "<strong>{query}</strong>" — sorted by engagement rate</div>
          <div className="grid-4">
            {[...videos].sort((a, b) => b.engagementRate - a.engagementRate).map(v => (
              <a key={v.id} href={`https://youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit" }}>
                <VideoCard video={v} />
              </a>
            ))}
          </div>
        </>
      )}
      {!loading && !searched && (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-light)" }}>
          <div style={{ marginBottom: 16 }}><Search size={48} /></div>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: "var(--text-muted)" }}>Search any topic above</div>
          <div className="text-sm">Or click a niche tag to instantly see top videos</div>
        </div>
      )}
    </div>
  );
}