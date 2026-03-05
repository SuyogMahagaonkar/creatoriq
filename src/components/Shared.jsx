import { useState } from "react";
import { AlertTriangle, Sparkles, Youtube, Clock, Eye, ThumbsUp, MessageSquare, Zap, ListVideo } from "lucide-react";
import { formatCount, timeAgo, getScoreColor } from "../utils";

export function Spinner({ size = 32 }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: size, height: size, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function ErrorBox({ message }) {
  return (
    <div className="error-box">
      <AlertTriangle size={20} />
      <div>
        <strong>Error:</strong> {message}
        <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8, color: "var(--text)", fontWeight: 400 }}>
          Please check your console or .env configuration.
        </div>
      </div>
    </div>
  );
}

export function ExpandableText({ text, maxLength = 300 }) {
  const [isExpanded, setIsExpanded] = useState(false);
  if (!text) return <span style={{ color: "var(--text-light)" }}>No description provided.</span>;
  if (text.length <= maxLength) return <div style={{ whiteSpace: "pre-wrap" }}>{text}</div>;

  return (
    <div>
      <div style={{ whiteSpace: "pre-wrap" }}>
        {isExpanded ? text : `${text.slice(0, maxLength)}...`}
      </div>
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ background: "none", border: "none", color: "var(--accent)", fontWeight: 600, cursor: "pointer", marginTop: 8, padding: 0, fontSize: 14 }}
      >
        {isExpanded ? "Show less" : "Show more"}
      </button>
    </div>
  );
}

export function SuggestionCard({ text, onApply }) {
  const [expanded, setExpanded] = useState(false);
  const maxLength = 250;
  const isLong = text.length > maxLength;

  return (
    <div style={{ background: '#fff', border: '1px solid #CDE1F4', borderRadius: 8, padding: 16, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
      <div style={{ whiteSpace: "pre-wrap", fontSize: 13, color: 'var(--text)', lineHeight: 1.6, marginBottom: 12, fontFamily: 'inherit' }}>
        {isLong && !expanded ? `${text.slice(0, maxLength)}...` : text}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {isLong ? (
          <button type="button" onClick={() => setExpanded(!expanded)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0 }}>
            {expanded ? "Show less" : "Show more"}
          </button>
        ) : <div />}
        <button type="button" onClick={() => onApply(text)} className="btn btn-primary btn-sm" style={{ background: '#F4FAFF', color: 'var(--accent)', border: '1px solid #CDE1F4', boxShadow: 'none' }}>
          <Sparkles size={14} style={{marginRight: 6}}/> Apply Fix
        </button>
      </div>
    </div>
  );
}

export function ScoreCircle({ score, size = 80 }) {
  const r = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = getScoreColor(score);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth="6" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6" strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: size > 70 ? 20 : 16, color }}>{score}</span>
        <span style={{ fontSize: 10, color: "var(--text-light)", fontWeight: 600 }}>/100</span>
      </div>
    </div>
  );
}

export function VideoCard({ video, onClick }) {
  const engColor = video.engagementRate >= 5 ? "var(--accent-3)" : video.engagementRate >= 2 ? "#B24020" : "#CC1016";
  const bgBadge = video.engagementRate >= 5 ? "#EAF4EA" : video.engagementRate >= 2 ? "#FDF0EB" : "#FDE8E9";
  
  return (
    <div className="video-card fade-in" onClick={() => onClick && onClick(video)}>
      <div className="video-thumb">
        {video.thumbnail
          ? <img src={video.thumbnail} alt={video.title} loading="lazy" />
          : <div className="video-thumb-placeholder" style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', color: 'var(--text-muted)'}}>
              <Youtube size={32} />
            </div>}
        <span className="video-duration"><Clock size={12} /> {video.duration}</span>
      </div>
      <div className="video-info">
        <div className="video-title">{video.title}</div>
        {video.channelTitle && <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>{video.channelTitle}</div>}
        <div className="video-meta">
          <div className="video-stats">
            <span className="video-stat-item"><Eye size={14} /> {formatCount(video.viewCount)}</span>
            <span className="video-stat-item"><ThumbsUp size={14} /> {formatCount(video.likeCount)}</span>
            <span className="video-stat-item"><MessageSquare size={14} /> {formatCount(video.commentCount)}</span>
          </div>
          <span className="eng-badge" style={{ background: bgBadge, color: engColor, alignSelf: 'flex-start' }}>
            <Zap size={12} /> {video.engagementRate}×
          </span>
        </div>
      </div>
    </div>
  );
}

export function PlaylistCard({ playlist, onClick }) {
  return (
    <div className="video-card fade-in" onClick={() => onClick && onClick(playlist)}>
      <div className="video-thumb">
        {playlist.thumbnail
          ? <img src={playlist.thumbnail} alt={playlist.title} loading="lazy" />
          : <div className="video-thumb-placeholder" style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', color: 'var(--text-muted)'}}>
              <ListVideo size={32} />
            </div>}
        <span className="video-duration" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <ListVideo size={12} /> {playlist.itemCount} videos
        </span>
      </div>
      <div className="video-info">
        <div className="video-title">{playlist.title}</div>
        <div className="video-meta">
          <div className="video-stats">
            <span className="video-stat-item"><Clock size={14} /> Updated {timeAgo(playlist.publishedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}