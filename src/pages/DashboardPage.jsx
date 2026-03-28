import React from 'react';
import { Eye, Zap, Users, Video, BarChart2, TrendingUp, Sparkles } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Bar, ComposedChart, CartesianGrid, Legend } from 'recharts';
import { formatCount, getScoreColor } from "../utils";
import { PlaylistCard, ExpandableText } from "../components/Shared";
import { CHANNEL_ID } from "../config";

export default function DashboardPage({ channelData, videos, playlists, setPage, setEditingPlaylistId, setPreviousPage }) {
  const ch = channelData?.statistics || {};
  const snippet = channelData?.snippet || {};

  const totalViews = videos.reduce((a, v) => a + v.viewCount, 0);
  const avgEng = videos.length ? (videos.reduce((a, v) => a + v.engagementRate, 0) / videos.length).toFixed(2) : 0;
  const bestEng = [...videos].sort((a, b) => b.engagementRate - a.engagementRate)[0];

  const chartData = [...videos].sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt)).map(v => {
    return {
      name: new Date(v.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      Views: v.viewCount,
      Engagement: Math.round(v.engagementRate * 100),
      Title: v.title
    };
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '16px', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', minWidth: 200 }}>
          <p style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text)', marginBottom: '8px' }}>{payload[0].payload.Title}</p>
          <div style={{ fontSize: '12px', color: 'var(--text-light)', marginBottom: '12px' }}>{label}</div>
          {payload.map((entry, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 500, padding: '4px 0', borderTop: index > 0 ? '1px solid var(--border-light)' : 'none' }}>
              <span style={{ color: 'var(--text-muted)' }}>{entry.name}</span>
              <span style={{ color: 'var(--text)' }}>{formatCount(entry.value)}{entry.name === 'Engagement' ? '%' : ''}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="page fade-in">
      
      {/* 1. CHANNEL HEADLINE */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '40px' }}>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          {snippet.thumbnails?.high?.url ? (
            <img src={snippet.thumbnails.high.url} alt="channel" style={{ width: 80, height: 80, borderRadius: "50%", border: "1px solid var(--border)", objectFit: "cover" }} />
          ) : (
             <div style={{ width: 80, height: 80, borderRadius: "50%", background: 'var(--surface-hover)', border: "1px solid var(--border)" }} />
          )}
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '4px' }}>{snippet.title || "Overview"}</h1>
            <div style={{ fontSize: '14px', color: "var(--text-muted)", display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{snippet.customUrl || CHANNEL_ID}</span>
              <span>•</span>
              <span className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}><Sparkles size={14} /> AI Engine Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MINIMALIST KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '48px' }}>
        {[
          { label: "Total Subscribers", val: formatCount(parseInt(ch.subscriberCount || 0)) },
          { label: "Channel Views", val: formatCount(parseInt(ch.viewCount || totalViews || 0)) },
          { label: "Published Videos", val: formatCount(parseInt(videos.length || 0)) },
          { label: "Avg. Engagement", val: `${avgEng}×` },
        ].map((stat, i) => (
          <div key={i} style={{ padding: '20px 0', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
              {stat.label}
            </div>
            <div style={{ fontSize: '36px', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {stat.val}
            </div>
          </div>
        ))}
      </div>

      {/* 3. CHART CANVAS */}
      {videos.length > 0 && (
        <div style={{ marginBottom: '64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
             <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>Performance Trajectory</h3>
             <button className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>Last 30 Days</button>
          </div>
          <div style={{ width: '100%', height: 350, border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px', background: 'var(--surface)' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                   <linearGradient id="aiGlow" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="var(--chart-primary)" stopOpacity={0.2} />
                     <stop offset="95%" stopColor="var(--chart-primary)" stopOpacity={0} />
                   </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} dy={10} />
                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} tickFormatter={(val) => formatCount(val)} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" hide />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface-hover)' }} />
                <Area yAxisId="left" type="basis" dataKey="Views" stroke="url(#aiGlow)" strokeWidth={2} fillOpacity={1} fill="url(#aiGlow)" />
                <Bar yAxisId="right" dataKey="Engagement" barSize={4} fill="var(--text-light)" radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 4. LIST VIEWS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '40px', marginBottom: '48px' }}>
        
        {/* Top Videos Linear List */}
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={16} color="var(--text-muted)" /> Top Performing Videos
          </h3>
          <div style={{ borderTop: '1px solid var(--border)' }}>
            {[...videos].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5).map((v, i) => (
              <div key={v.id} className="list-row">
                <span style={{ fontSize: '12px', fontWeight: 600, color: "var(--text-light)", width: '24px' }}>{i + 1}</span>
                {v.thumbnail ? (
                  <img src={v.thumbnail} style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 'var(--radius-sm)', marginRight: '16px' }} />
                ) : (
                  <div style={{ width: 48, height: 48, background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', marginRight: '16px' }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: '4px' }}>{v.title}</div>
                  <div style={{ fontSize: '12px', color: "var(--text-muted)", display: 'flex', gap: '16px' }}>
                    <span>{formatCount(v.viewCount)} views</span>
                    <span>{v.engagementRate}× eng</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Highlighted Engagement (Best AI opportunity) */}
        {bestEng && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <Sparkles size={16} color="var(--chart-primary)" /> AI Outlier Alert
            </h3>
            <div style={{ padding: '24px', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--surface)' }}>
              <div style={{ display: 'flex', gap: '20px' }}>
                {bestEng.thumbnail && <img src={bestEng.thumbnail} style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 'var(--radius-md)' }} />}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--chart-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Peak Engagement</div>
                  <div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text)', marginBottom: '12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>{bestEng.title}</div>
                  <div style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em' }}>{bestEng.engagementRate}×</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Over baseline average</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}