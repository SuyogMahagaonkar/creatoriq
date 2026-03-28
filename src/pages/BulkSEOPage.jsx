import React, { useState, useMemo } from 'react';
import {
  AlertTriangle, Search, Filter, Activity, Target, ChevronLeft,
  CheckCircle, AlertOctagon, ArrowRight, BarChart2, Video, ChevronRight
} from "lucide-react";
import { analyzeTitle, analyzeDescription, analyzeTags, getScoreColor, getScoreLabel } from "../utils";
import { ScoreCircle } from "../components/Shared";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

export default function BulkSEOPage({ videos, setPage, setEditingVideoId }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOrder] = useState("worst");
  const [filterStatus, setFilterStatus] = useState("all");

  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortOption, filterStatus]);

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

  const totalAudited = analyzedVideos.length;
  const avgScore = totalAudited > 0 ? Math.round(analyzedVideos.reduce((acc, v) => acc + v.seo.overall, 0) / totalAudited) : 0;

  const avgTitleScore = totalAudited > 0 ? Math.round(analyzedVideos.reduce((acc, v) => acc + v.seo.t.score, 0) / totalAudited) : 0;
  const avgDescScore = totalAudited > 0 ? Math.round(analyzedVideos.reduce((acc, v) => acc + v.seo.d.score, 0) / totalAudited) : 0;
  const avgTagsScore = totalAudited > 0 ? Math.round(analyzedVideos.reduce((acc, v) => acc + v.seo.tg.score, 0) / totalAudited) : 0;

  const radarData = [
    { subject: 'Titles', A: avgTitleScore, fullMark: 100 },
    { subject: 'Descriptions', A: avgDescScore, fullMark: 100 },
    { subject: 'Keywords', A: avgTagsScore, fullMark: 100 },
  ];

  const criticalCount = analyzedVideos.filter(v => v.seo.overall < 50).length;
  const optimizedCount = analyzedVideos.filter(v => v.seo.overall >= 80).length;

  const displayedVideos = useMemo(() => {
    let result = [...analyzedVideos];

    if (searchTerm) {
      result = result.filter(v => v.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    if (filterStatus === "critical") {
      result = result.filter(v => v.seo.overall < 50);
    } else if (filterStatus === "ok") {
      result = result.filter(v => v.seo.overall >= 80);
    }

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

      {/* HEADER DIVIDER */}
      <div style={{ paddingBottom: 32, borderBottom: '1px solid var(--border)', marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 8, color: 'var(--text)' }}>Bulk SEO Audit</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Analyze your entire catalog's search visibility and fix critical metadata issues centrally.</p>
      </div>

      {/* INTELLIGENCE DASHBOARD (SPLIT LAYOUT) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: 24, marginBottom: 40 }}>
        
        {/* Left Col: KPI Stack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 24, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
            <ScoreCircle score={avgScore} size={64} />
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.05em' }}>Global Health</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)' }}>{avgScore}<span style={{ fontSize: 16, color: 'var(--text-muted)', fontWeight: 600 }}>/100</span></div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: 'var(--error-bg)', borderRadius: 'var(--radius-lg)', padding: 20, border: '1px solid var(--error-border)' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                 <AlertTriangle size={18} color="var(--error-text)" />
                 <div style={{ fontSize: 12, color: 'var(--error-text)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Critical</div>
               </div>
               <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--error-text)' }}>{criticalCount}</div>
            </div>

            <div style={{ background: 'var(--success-bg)', borderRadius: 'var(--radius-lg)', padding: 20, border: '1px solid var(--success-border)' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                 <CheckCircle size={18} color="var(--success-text)" />
                 <div style={{ fontSize: 12, color: 'var(--success-text)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Optimized</div>
               </div>
               <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--success-text)' }}>{optimizedCount}</div>
            </div>
          </div>

        </div>

        {/* Right Col: Radar Chart */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 24, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 250, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={16} color="var(--chart-primary)" /> Radar Analysis
          </div>
          <div style={{ flex: 1, width: '100%', minHeight: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Avg Score" dataKey="A" stroke="var(--chart-primary)" fill="var(--chart-primary)" fillOpacity={0.2} strokeWidth={2} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)' }} itemStyle={{ color: 'var(--chart-primary)' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* FILTER & SEARCH BAR (SPOTLIGHT STYLE) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', padding: '12px 20px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', flex: '1 1 400px', maxWidth: 600 }}>
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search audited videos..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 15, width: '100%', color: 'var(--text)', fontWeight: 500 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', padding: '6px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)' }}>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ padding: '8px 16px', background: filterStatus !== 'all' ? 'var(--surface-hover)' : 'transparent', border: 'none', borderRadius: 'var(--radius-full)', color: 'var(--text)', fontSize: 13, fontWeight: 600, outline: 'none', cursor: 'pointer' }}
          >
            <option value="all">All Status</option>
            <option value="critical">Critical</option>
            <option value="ok">Optimized</option>
          </select>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
          <select
            value={sortOption}
            onChange={e => setSortOrder(e.target.value)}
            style={{ padding: '8px 16px', background: sortOption !== 'worst' ? 'var(--surface-hover)' : 'transparent', border: 'none', borderRadius: 'var(--radius-full)', color: 'var(--text)', fontSize: 13, fontWeight: 600, outline: 'none', cursor: 'pointer' }}
          >
            <option value="worst">Worst First</option>
            <option value="best">Best First</option>
          </select>
        </div>
      </div>

      {/* ACTIONABLE AI DATA TABLE */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--surface)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        
        {/* Table Header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 3.5fr) 2fr 3fr 120px', gap: 24, padding: '12px 24px', background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <div>Video Asset</div>
          <div>Vital Signs</div>
          <div>Top Issue</div>
          <div style={{ textAlign: 'center' }}>Action</div>
        </div>

        {paginatedVideos.map((v, i) => (
          <div key={v.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 3.5fr) 2fr 3fr 120px', gap: 24, padding: '20px 24px', alignItems: 'center', borderBottom: i < paginatedVideos.length - 1 ? '1px solid var(--border-light)' : 'none', transition: 'background 0.2s' }} className="list-row">

            {/* Video Column */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {v.thumbnail ? (
                  <img src={v.thumbnail} style={{ width: 100, height: 56, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'block' }} />
                ) : (
                  <div style={{ width: 100, height: 56, background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Video size={20} color="var(--text-muted)" /></div>
                )}
                {/* Score floating badge */}
                <div style={{ position: 'absolute', bottom: -6, right: -6, background: 'var(--surface)', borderRadius: '50%', padding: 2, border: '1px solid var(--border)' }}>
                   <ScoreCircle score={v.seo.overall} size={24} strokeWidth={3} />
                </div>
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.4 }}>
                {v.title}
              </div>
            </div>

            {/* Vital Signs Badges */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[{ label: "TTL", score: v.seo.t.score }, { label: "DSC", score: v.seo.d.score }, { label: "TAG", score: v.seo.tg.score }].map(s => {
                const isCrit = s.score < 50;
                const isWarn = s.score >= 50 && s.score < 80;
                const badgeBg = isCrit ? 'var(--error-bg)' : isWarn ? 'var(--warning-bg)' : 'var(--success-bg)';
                const badgeColoredTxt = isCrit ? 'var(--error-text)' : isWarn ? 'var(--warning-text)' : 'var(--success-text)';
                const Icon = isCrit ? AlertOctagon : isWarn ? AlertTriangle : CheckCircle;
                return (
                  <div key={s.label} style={{ background: badgeBg, color: badgeColoredTxt, border: `1px solid ${isCrit ? 'var(--error-border)' : isWarn ? 'var(--warning-border)' : 'var(--success-border)'}`, padding: '4px 8px', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em' }}>
                    <Icon size={12} strokeWidth={3} /> {s.label} {s.score}
                  </div>
                );
              })}
            </div>

            {/* Issue Preview */}
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>
              {v.seo.allIssues.length > 0 ? (
                <div style={{ color: "var(--text)", display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <AlertTriangle size={16} color="var(--error-text)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{v.seo.allIssues[0]}</span>
                </div>
              ) : (
                <div style={{ color: "var(--text)", display: 'flex', gap: 8, alignItems: 'center' }}>
                  <CheckCircle size={16} color="var(--success-text)" />
                  <span style={{ fontWeight: 500 }}>Fully Optimized</span>
                </div>
              )}
            </div>

            {/* Action - Optimize AI */}
            <div style={{ display: "flex", justifyContent: 'center' }}>
               <button
                 className="btn btn-ai btn-sm"
                 style={{ padding: '8px 16px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center' }}
                 onClick={() => {
                   if (setEditingVideoId && setPage) {
                     setEditingVideoId(v.id?.videoId || v.id);
                     setPage("editvideo");
                   }
                 }}
               >
                 <Activity size={14} /> Optimize
               </button>
            </div>

          </div>
        ))}

        {displayedVideos.length === 0 && (
          <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-light)' }}>
             <Search size={40} style={{ marginBottom: 16, opacity: 0.2 }} />
             <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>No videos found</div>
             <p style={{ fontSize: 14, marginTop: 4 }}>Try altering your search or filters.</p>
          </div>
        )}
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 40 }}>
           <button className="btn btn-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ borderRadius: 'var(--radius-full)', padding: '8px 16px' }}><ChevronLeft size={16} /> Prev</button>
           <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '6px 16px', borderRadius: 'var(--radius-full)' }}>
             <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Page <span style={{ color: 'var(--text)' }}>{currentPage}</span> of {totalPages}</span>
           </div>
           <button className="btn btn-secondary" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={{ borderRadius: 'var(--radius-full)', padding: '8px 16px' }}>Next <ChevronRight size={16} /></button>
        </div>
      )}

    </div>
  );
}