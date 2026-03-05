import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, Search, Filter, Activity, Target, ChevronLeft ,
  CheckCircle, AlertOctagon, ArrowRight, BarChart2, Video, ChevronRight 
} from "lucide-react";
import { analyzeTitle, analyzeDescription, analyzeTags, getScoreColor, getScoreLabel } from "../utils";
import { ScoreCircle } from "../components/Shared";

export default function BulkSEOPage({ videos, setPage, setEditingVideoId }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOrder] = useState("worst"); // 'worst', 'best'
  const [filterStatus, setFilterStatus] = useState("all"); // 'all', 'critical', 'ok'
    // Pagination States
  const ITEMS_PER_PAGE = 10; 
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 whenever search, sort, or filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortOption, filterStatus]);

  // 1. Calculate scores for all videos once using useMemo for performance
  const analyzedVideos = useMemo(() => {
    return videos.map(v => {
      const t = analyzeTitle(v.title);
      const d = analyzeDescription(v.description);
      const tg = analyzeTags(v.tags);
      const overall = Math.round((t.score + d.score + tg.score) / 3);
      const allIssues = [...t.issues, ...d.issues, ...tg.issues];
      
      let status = "ok";
      if (overall < 50) status = "critical";
      else if (overall < 80) status = "warning";

      return { ...v, seo: { t, d, tg, overall, allIssues, status } };
    });
  }, [videos]);

  // 2. Calculate Channel KPIs
  const totalAudited = analyzedVideos.length;
  const avgScore = totalAudited > 0 ? Math.round(analyzedVideos.reduce((acc, v) => acc + v.seo.overall, 0) / totalAudited) : 0;
  const criticalCount = analyzedVideos.filter(v => v.seo.overall < 50).length;
  const optimizedCount = analyzedVideos.filter(v => v.seo.overall >= 80).length;
  // Calculate Pagination
  
  // 3. Filter & Sort Logic
  const displayedVideos = useMemo(() => {
    let result = [...analyzedVideos];

    // Apply Search
    if (searchTerm) {
      result = result.filter(v => v.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    // Apply Status Filter
    if (filterStatus === "critical") {
      result = result.filter(v => v.seo.overall < 50);
    } else if (filterStatus === "ok") {
      result = result.filter(v => v.seo.overall >= 80);
    }

    // Apply Sorting
    result.sort((a, b) => {
      if (sortOption === "worst") return a.seo.overall - b.seo.overall;
      if (sortOption === "best") return b.seo.overall - a.seo.overall;
      return 0;
    });

    return result;
  }, [analyzedVideos, searchTerm, filterStatus, sortOption]);

  const totalPages = Math.ceil(displayedVideos.length / ITEMS_PER_PAGE);
  const paginatedVideos = displayedVideos.slice(
    (currentPage - 1) * ITEMS_PER_PAGE, 
    currentPage * ITEMS_PER_PAGE
  );


  return (
    <div className="page fade-in" style={{ paddingBottom: 60, maxWidth: 1400, margin: '0 auto' }}>
      
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
        <div>
          <h1 className="heading-xl mb-8" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Activity color="var(--accent)" size={32} /> Bulk SEO Audit
          </h1>
          <p className="text-muted text-sm">Analyze your entire catalog's search visibility and fix critical metadata issues.</p>
        </div>
      </div>

      {/* KPI METRICS ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 32 }}>
        <div style={{ background: 'var(--card)', borderRadius: 16, padding: 20, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: 'rgba(10, 102, 194, 0.1)', padding: 12, borderRadius: 12 }}><BarChart2 size={24} color="var(--accent)" /></div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Avg. SEO Score</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: getScoreColor(avgScore) }}>{avgScore}/100</div>
          </div>
        </div>

        <div style={{ background: 'var(--card)', borderRadius: 16, padding: 20, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: 'var(--surface-2)', padding: 12, borderRadius: 12 }}><Target size={24} color="var(--text)" /></div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Videos Audited</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>{totalAudited}</div>
          </div>
        </div>

        <div style={{ background: 'var(--card)', borderRadius: 16, padding: 20, border: '1px solid rgba(204, 16, 22, 0.2)', display: 'flex', alignItems: 'center', gap: 16, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: '#CC1016' }} />
          <div style={{ background: 'rgba(204, 16, 22, 0.1)', padding: 12, borderRadius: 12 }}><AlertOctagon size={24} color="#CC1016" /></div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Critical Action Needed</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#CC1016' }}>{criticalCount}</div>
          </div>
        </div>

        <div style={{ background: 'var(--card)', borderRadius: 16, padding: 20, border: '1px solid rgba(5, 118, 66, 0.2)', display: 'flex', alignItems: 'center', gap: 16, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: '#057642' }} />
          <div style={{ background: 'rgba(5, 118, 66, 0.1)', padding: 12, borderRadius: 12 }}><CheckCircle size={24} color="#057642" /></div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Fully Optimized</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#057642' }}>{optimizedCount}</div>
          </div>
        </div>
      </div>

      {/* TOOLBAR: Search & Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card)', padding: 16, borderRadius: 16, border: '1px solid var(--border)', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-2)', padding: '10px 16px', borderRadius: 12, flex: '1 1 300px', maxWidth: 400 }}>
          <Search size={18} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Search audited videos..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 14, width: '100%', color: 'var(--text)' }} 
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={16} color="var(--text-muted)" />
            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, fontWeight: 600, outline: 'none', cursor: 'pointer' }}
            >
              <option value="all">All Health Tiers</option>
              <option value="critical">🔴 Critical (less than 50)</option>
              <option value="ok">🟢 Optimized (80+)</option>
            </select>
          </div>

          <select 
            value={sortOption} 
            onChange={e => setSortOrder(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, fontWeight: 600, outline: 'none', cursor: 'pointer' }}
          >
            <option value="worst">Sort: Worst Score First</option>
            <option value="best">Sort: Best Score First</option>
          </select>
        </div>
      </div>

      {/* DATA TABLE / LIST VIEW */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {paginatedVideos.map(v => (
          <div key={v.id} style={{ 
            background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', padding: 20,
            display: 'grid', gridTemplateColumns: 'minmax(250px, 2fr) minmax(200px, 1.5fr) minmax(200px, 1.5fr) minmax(150px, 1fr)', gap: 24, alignItems: 'center',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            
            {/* Column 1: Video Info */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              {v.thumbnail ? (
                <img src={v.thumbnail} style={{ width: 100, height: 56, objectFit: 'cover', borderRadius: 8, flexShrink: 0, border: '1px solid var(--border)' }} />
              ) : (
                <div style={{ width: 100, height: 56, background: 'var(--surface-2)', borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Video size={20} color="var(--text-muted)"/></div>
              )}
              <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", color: 'var(--text)' }}>
                {v.title}
              </div>
            </div>

            {/* Column 2: Component Breakdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[{ label: "Title", score: v.seo.t.score }, { label: "Desc.", score: v.seo.d.score }, { label: "Tags", score: v.seo.tg.score }].map(s => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, width: 36, textTransform: 'uppercase' }}>{s.label}</span>
                  <div style={{ flex: 1, height: 6, background: "var(--surface-2)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${s.score}%`, height: "100%", background: getScoreColor(s.score), borderRadius: 3 }}></div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, width: 24, textAlign: 'right', color: getScoreColor(s.score) }}>{s.score}</span>
                </div>
              ))}
            </div>

            {/* Column 3: Top Issue Warning */}
            <div>
              {v.seo.allIssues.length > 0 ? (
                <div style={{ background: 'rgba(204, 16, 22, 0.05)', border: '1px solid rgba(204, 16, 22, 0.15)', padding: '10px 12px', borderRadius: 8, fontSize: 12, color: "#CC1016", fontWeight: 500, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} /> 
                  <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.4 }}>
                    {v.seo.allIssues[0]}
                  </span>
                </div>
              ) : (
                <div style={{ background: 'rgba(5, 118, 66, 0.05)', border: '1px solid rgba(5, 118, 66, 0.15)', padding: '10px 12px', borderRadius: 8, fontSize: 12, color: "#057642", fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={14} /> Fully Optimized
                </div>
              )}
            </div>

            {/* Column 4: Score & Action */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: 'space-between', gap: 16, paddingLeft: 16, borderLeft: '1px solid var(--surface-2)' }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <ScoreCircle score={v.seo.overall} size={54} />
                <span style={{ fontSize: 11, fontWeight: 700, color: getScoreColor(v.seo.overall), textTransform: 'uppercase' }}>{getScoreLabel(v.seo.overall)}</span>
              </div>
              
              {/* Action Button: Routes to Edit Video Page */}
              <button 
                className="btn btn-secondary btn-sm" 
                style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--surface-2)', border: 'none', color: 'var(--text)', fontWeight: 600, cursor: 'pointer', transition: '0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)'; }}
                onClick={() => {
                  if (setEditingVideoId && setPage) {
                    setEditingVideoId(v.id);
                    setPage("editvideo");
                  } else {
                    alert("Routing functions not attached! Ensure setPage and setEditingVideoId are passed to BulkSEOPage.");
                  }
                }}
              >
                <ArrowRight size={18} />
              </button>
            </div>

          </div>
        ))}

        {displayedVideos.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 20px", background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)' }}>
            <AlertOctagon size={48} color="var(--border-strong)" style={{ marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>No videos found</h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
      {/* BULK AUDIT PAGINATION FOOTER */}
      {totalPages > 1 && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginTop: 32, 
          padding: '20px', 
          background: 'var(--card)', 
          borderRadius: 16, 
          border: '1px solid var(--border)' 
        }}>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>
            Showing {Math.min(ITEMS_PER_PAGE, displayedVideos.length)} of {displayedVideos.length} videos
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button 
              className="btn btn-secondary btn-sm" 
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(prev => prev - 1)}
            >
              <ChevronLeft size={16} /> Previous
            </button>
            
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
              Page {currentPage} of {totalPages}
            </span>
            
            <button 
              className="btn btn-secondary btn-sm" 
              disabled={currentPage === totalPages} 
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

    </div>
    
  );
}