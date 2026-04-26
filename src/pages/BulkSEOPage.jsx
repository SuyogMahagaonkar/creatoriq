import React, { useState, useMemo, useContext } from 'react';
import { CreatorContext } from "../context/CreatorContext";
import {
  AlertTriangle, Search, Filter, Activity, Target, ChevronLeft,
  CheckCircle, AlertOctagon, ArrowRight, BarChart2, Video, ChevronRight
} from "lucide-react";
import { analyzeTitle, analyzeDescription, analyzeTags, getScoreColor, getScoreLabel, calculateOverallSEO } from "../utils";
import { ScoreCircle } from "../components/Shared";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

export default function BulkSEOPage({ videos, setPage, setEditingVideoId }) {
  const { geminiKey } = useContext(CreatorContext);
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
      const overall = calculateOverallSEO(t, d, tg);
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

  if (!geminiKey) {
    return (
      <div className="page fade-in" style={{ paddingBottom: 60, maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 120px)' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '60px 40px', maxWidth: 720, textAlign: 'center', boxShadow: 'var(--shadow-md)' }}>
           <div style={{ padding: 20, background: 'linear-gradient(135deg, rgba(88,101,242,0.1) 0%, rgba(168,85,247,0.1) 100%)', borderRadius: '50%', display: 'inline-flex', marginBottom: 24, border: '1px solid rgba(88,101,242,0.2)' }}>
              <Target size={48} color="var(--chart-primary)" />
           </div>
           <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>Unlock AI SEO</h2>
           <p style={{ fontSize: 16, color: 'var(--text-muted)', marginBottom: 40, lineHeight: 1.6 }}>Harness the power of Google's Gemini AI to automatically generate high-performing video titles, descriptions, and tags. To begin, you need to connect your free API key.</p>
           
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, textAlign: 'left', marginBottom: 40 }}>
              <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                 <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>STEP 1</div>
                 <div style={{ fontSize: 13, color: 'var(--text)' }}>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--chart-primary)', fontWeight: 600, textDecoration: 'none' }}>Google AI Studio</a> and sign in.</div>
              </div>
              <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                 <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>STEP 2</div>
                 <div style={{ fontSize: 13, color: 'var(--text)' }}>Click <b>"Get API Key"</b> in the left menu and create a key.</div>
              </div>
              <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                 <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>STEP 3</div>
                 <div style={{ fontSize: 13, color: 'var(--text)' }}>Open the <b>CreatorIQ Settings Menu</b> (gear icon) and paste it.</div>
              </div>
           </div>

           <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="btn btn-primary" style={{ padding: '12px 32px', fontSize: 16, display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              Get Free API Key <ArrowRight size={18} />
           </a>
        </div>
      </div>
    );
  }

  return (
    <div className="page fade-in" style={{ paddingBottom: 60, maxWidth: 1400, margin: '0 auto' }}>

      {/* HEADER DIVIDER */}
      <div style={{ paddingBottom: 32, borderBottom: '1px solid var(--border)', marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 8, color: 'var(--text)' }}>Bulk SEO Audit</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Analyze your entire catalog's search visibility and fix critical metadata issues centrally.</p>
      </div>

      {/* INTELLIGENCE DASHBOARD (SPLIT LAYOUT) */}
      <div className="page-grid-sidebar" style={{ marginBottom: 40 }}>
        
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
      <div className="controls-bar" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', padding: '12px 20px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', flex: '1 1 auto', minWidth: 0, maxWidth: 600 }}>
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

      {/* REDESIGNED SEO AUDIT CARDS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {paginatedVideos.map((v, i) => {
          const scoreColor = getScoreColor(v.seo.overall);
          const getBarColor = (s) => s < 50 ? 'var(--error-text)' : s < 80 ? 'var(--warning-text)' : 'var(--success-text)';

          return (
            <div key={v.id} className="seo-audit-card" style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              transition: 'all 0.25s ease',
              cursor: 'pointer',
              position: 'relative'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = scoreColor; e.currentTarget.style.boxShadow = `0 4px 24px ${scoreColor}15`; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              {/* Score accent line */}
              <div style={{ height: 3, background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}40)` }} />

              <div className="seo-card-body" style={{ padding: '20px 24px', display: 'flex', gap: 20, alignItems: 'center' }}>

                {/* LEFT: Score Ring */}
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <ScoreCircle score={v.seo.overall} size={56} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: scoreColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {v.seo.overall >= 80 ? 'Good' : v.seo.overall >= 50 ? 'Fair' : 'Critical'}
                  </span>
                </div>

                {/* CENTER: Video + Vital Bars */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Video Title Row */}
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ flexShrink: 0 }}>
                      {v.thumbnail ? (
                        <img src={v.thumbnail} alt="" style={{ width: 72, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)', display: 'block' }} />
                      ) : (
                        <div style={{ width: 72, height: 40, background: 'var(--surface-hover)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Video size={16} color="var(--text-muted)" /></div>
                      )}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.4, flex: 1 }}>
                      {v.title}
                    </div>
                  </div>

                  {/* Vital Signs Mini Bar Chart */}
                  <div className="seo-vital-bars" style={{ display: 'flex', gap: 16 }}>
                    {[{ label: "Title", score: v.seo.t.score }, { label: "Description", score: v.seo.d.score }, { label: "Tags", score: v.seo.tg.score }].map(s => (
                      <div key={s.label} style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: getBarColor(s.score) }}>{s.score}</span>
                        </div>
                        <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
                          <div style={{ width: `${s.score}%`, height: '100%', borderRadius: 2, background: getBarColor(s.score), transition: 'width 0.6s ease' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* RIGHT: Issue + Action */}
                <div className="seo-card-right" style={{ flexShrink: 0, width: 220, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-muted)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    {v.seo.allIssues.length > 0 ? (
                      <>
                        <AlertTriangle size={14} color="var(--error-text)" style={{ flexShrink: 0, marginTop: 1 }} />
                        <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", color: 'var(--text)' }}>{v.seo.allIssues[0]}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={14} color="var(--success-text)" style={{ flexShrink: 0, marginTop: 1 }} />
                        <span style={{ fontWeight: 500, color: 'var(--success-text)' }}>Fully Optimized</span>
                      </>
                    )}
                  </div>
                  <button
                    className="btn btn-ai btn-sm"
                    style={{ padding: '8px 20px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center' }}
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
            </div>
          );
        })}

        {displayedVideos.length === 0 && (
          <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-light)', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
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