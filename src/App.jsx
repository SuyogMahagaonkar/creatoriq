import React, { useState, useEffect, useContext } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { BarChart2, Video, FileSearch, Globe, CheckCircle2, LogOut, Settings, X, Youtube, Key, Trash2, ShieldAlert, Save, UploadCloud, Layers, Menu, Moon, Sun, Monitor, MessageCircle, Edit3, HelpCircle } from "lucide-react";
import UploadPage from "./pages/UploadPage"; 
import { GOOGLE_CLIENT_ID } from "./config";
import { Spinner, ErrorBox } from "./components/Shared";
import Onboarding from "./pages/Onboarding";
import DashboardPage from "./pages/DashboardPage";
import MyVideosPage from "./pages/MyVideosPage";
import BulkSEOPage from "./pages/BulkSEOPage";
import DiscoverPage from "./pages/DiscoverPage";
import "./index.css";
import { CreatorContext } from "./context/CreatorContext";
import CommentsPage from "./pages/CommentsPage";
import EditVideoPage from "./pages/EditVideoPage";
import EditPlaylistPage from "./pages/EditPlaylistPage";
import PlaylistsPage from "./pages/PlaylistsPage";
import BulkUploadPage from "./pages/BulkUploadPage";
import Walkthrough from "./components/Walkthrough";

const NAV = [
  { path: "/", id: "dashboard", label: "Overview", icon: BarChart2 },
  { path: "/upload", id: "upload", label: "Upload Studio", icon: UploadCloud },
  { path: "/pipeline", id: "bulkupload", label: "Pipeline", icon: Layers },
  { path: "/videos", id: "myvideos", label: "Content Library", icon: Video },
  { path: "/discover", id: "discover", label: "Discover", icon: Globe },
  { path: "/bulkseo", id: "bulkseo", label: "Bulk SEO", icon: FileSearch },
  { path: "/comments", id: "comments", label: "Audience", icon: MessageCircle },
];

const TITLES = {
  "/": "Overview",
  "/upload": "Upload Studio",
  "/videos": "Content Library",
  "/bulkseo": "Bulk SEO",
  "/discover": "Discover",
  "/comments": "Audience",
  "/video/edit": "Video Editor",
  "/playlists": "Playlists",
  "/playlist/edit": "Playlist Editor",
  "/pipeline": "Pipeline",
};

function MainApp() {
  const {
    page, setPage,
    editingVideoId, setEditingVideoId,
    editingPlaylistId, setEditingPlaylistId,
    previousPage, setPreviousPage,
    channelData, setChannelData,
    videos, setVideos,
    playlists, setPlaylists,
    loading, setLoading,
    error, setError,
    isDarkMode, setIsDarkMode,
    isOnboarded, setIsOnboarded,
    isSessionExpired, setIsSessionExpired,
    handleLogout, handleSessionReconnect,
    geminiKey, setGeminiKey,
    newGeminiKey, setNewGeminiKey,
    isValidatingKey, setIsValidatingKey,
    keyError, setKeyError,
    handleSaveGeminiKey, handleRemoveGeminiKey,
    isSettingsOpen, setIsSettingsOpen,
    settingsTab, setSettingsTab
  } = useContext(CreatorContext);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const accessToken = localStorage.getItem("creator_iq_token");

  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const legacySetPage = (dest) => {
    const routeMap = {
      "dashboard": "/",
      "myvideos": "/videos",
      "playlists": "/playlists",
      "editplaylist": "/playlist/edit",
      "upload": "/upload",
      "bulkupload": "/pipeline",
      "bulkseo": "/bulkseo",
      "editvideo": "/video/edit",
      "comments": "/comments",
      "discover": "/discover",
    };
    navigate(routeMap[dest] || "/");
  };

  const [defaultSocialLinks, setDefaultSocialLinks] = useState(localStorage.getItem("creator_iq_social_links") || "");

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    if (isSettingsOpen) {
      setGeminiKey(localStorage.getItem("creator_iq_gemini_key") || import.meta.env.VITE_GEMINI_API_KEY || "");
      setDefaultSocialLinks(localStorage.getItem("creator_iq_social_links") || "");
    }
  }, [isSettingsOpen]);

  if (!isOnboarded) {
    return <Onboarding onComplete={() => {
      setIsOnboarded(true);
      setGeminiKey(localStorage.getItem("creator_iq_gemini_key") || import.meta.env.VITE_GEMINI_API_KEY || "");
    }} />;
  }

  const snippet = channelData?.snippet || {};

  return (
    <div className={`app-shell ${isDarkMode ? "dark" : ""}`}>
      <div
        className={`sidebar-overlay ${isMobileMenuOpen ? "open" : ""}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />
      
      {/* SIDEBAR: Sleek, minimalistic rail */}
      <nav className={`sidebar ${isMobileMenuOpen ? "open" : ""} tour-sidebar`}>
        <div className="sidebar-logo">
          <div className="logo-mark">
            <img src={`${import.meta.env.BASE_URL}ciq-logo.png`} alt="CreatorIQ" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} />
            <div className="logo-text">CreatorIQ</div>
          </div>
        </div>

        <div className="sidebar-nav">
          <div className="nav-section-label">Menu</div>
          {NAV.map(item => {
            const IconComponent = item.icon;
            const isActive = currentPath === item.path || (item.path !== "/" && currentPath.startsWith(item.path));
            return (
              <button key={item.id} className={`nav-item ${isActive ? "active" : ""}`} onClick={() => { navigate(item.path); setIsMobileMenuOpen(false); }}>
                <span style={{ color: isActive ? "var(--text)" : "var(--text-light)" }}><IconComponent size={16} /></span>
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {snippet.thumbnails && (
             <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
               <img src={snippet.thumbnails.default?.url} alt="avatar" style={{ width: 24, height: 24, borderRadius: '50%' }} />
               <div style={{ overflow: 'hidden' }}>
                 <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{snippet.title}</div>
               </div>
             </div>
          )}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="btn btn-secondary tour-settings-btn"
              style={{ flex: 1, padding: '8px', fontSize: '12px', display: 'flex', justifyContent: 'center' }}
            >
              <Settings size={14} />
            </button>
            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{ flex: 1, padding: '8px', fontSize: '12px', display: 'flex', justifyContent: 'center' }}
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT CANVAS */}
      <main className="main-content tour-main-content">
        <div className="topbar">
          <div className="topbar-title">
            <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={20} />
            </button>
            {TITLES[currentPath] || "Workspace"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
             {!loading && !error && (
               <div className="tour-topbar-sync" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-light)' }}>
                 <span style={{ width: 6, height: 6, background: 'var(--success-text)', borderRadius: '50%' }} /> Sync Active
               </div>
             )}
          </div>
        </div>

        {loading && <div style={{ height: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>}
        {error && !loading && (
          <div className="page" style={{ paddingTop: '80px' }}>
            <ErrorBox message={error} />
          </div>
        )}

        {!loading && !error && (
          <Routes>
            <Route path="/" element={<DashboardPage channelData={channelData} videos={videos} playlists={playlists} setPage={legacySetPage} setEditingPlaylistId={setEditingPlaylistId} setPreviousPage={setPreviousPage} setIsSessionExpired={setIsSessionExpired} />} />
            <Route path="/videos" element={<MyVideosPage videos={videos} playlists={playlists} setVideos={setVideos} setPlaylists={setPlaylists} accessToken={accessToken} setPage={legacySetPage} setEditingVideoId={setEditingVideoId} setEditingPlaylistId={setEditingPlaylistId} setPreviousPage={setPreviousPage} setIsSessionExpired={setIsSessionExpired} />} />
            <Route path="/playlists" element={<PlaylistsPage playlists={playlists} setPage={legacySetPage} setEditingPlaylistId={setEditingPlaylistId} setPreviousPage={setPreviousPage} />} />
            <Route path="/playlist/edit" element={<EditPlaylistPage playlistId={editingPlaylistId} setPage={legacySetPage} channelVideos={videos} previousPage={previousPage} setIsSessionExpired={setIsSessionExpired} />} />
            <Route path="/upload" element={<UploadPage setIsSessionExpired={setIsSessionExpired} />} />
            <Route path="/pipeline" element={<BulkUploadPage setIsSessionExpired={setIsSessionExpired} />} />
            <Route path="/bulkseo" element={<BulkSEOPage videos={videos} setIsSessionExpired={setIsSessionExpired} setPage={legacySetPage} setEditingVideoId={setEditingVideoId} />} />
            <Route path="/video/edit" element={<EditVideoPage videoId={editingVideoId} setPage={legacySetPage} setIsSessionExpired={setIsSessionExpired} />} />
            <Route path="/comments" element={<CommentsPage setIsSessionExpired={setIsSessionExpired} />} />
            <Route path="/discover" element={<DiscoverPage setIsSessionExpired={setIsSessionExpired} />} />
          </Routes>
        )}
      </main>

      {/* SETTINGS MODAL */}
      {isSettingsOpen && (
        <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="modal-content fade-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 800, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '600px' }}>
            <div className="settings-layout">
              
              {/* Settings Sidebar */}
              <div className="settings-sidebar">
                <div style={{ fontSize: '18px', fontWeight: 600, padding: '0 8px', marginBottom: '24px' }}>Settings</div>
                <button onClick={() => setSettingsTab('youtube')} className={`nav-item ${settingsTab === 'youtube' ? 'active' : ''}`}><Youtube size={16} /> Connections</button>
                <button onClick={() => setSettingsTab('ai')} className={`nav-item ${settingsTab === 'ai' ? 'active' : ''}`}><Key size={16} /> API Keys</button>
                <button onClick={() => setSettingsTab('appearance')} className={`nav-item ${settingsTab === 'appearance' ? 'active' : ''}`}><Monitor size={16} /> Appearance</button>
                <button onClick={() => setSettingsTab('upload_defaults')} className={`nav-item ${settingsTab === 'upload_defaults' ? 'active' : ''}`}><UploadCloud size={16} /> Upload Defaults</button>
              </div>

              {/* Settings Content Area */}
              <div className="settings-content">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
                   <button className="btn btn-secondary" style={{ padding: '6px', border: 'none' }} onClick={() => setIsSettingsOpen(false)}><X size={20} /></button>
                </div>

                {settingsTab === 'youtube' && (
                  <div className="fade-in max-w-lg">
                    <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Connections</h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '32px' }}>Manage connected accounts and integrations.</p>

                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ padding: '12px', background: 'var(--error-bg)', borderRadius: 'var(--radius-sm)', color: 'var(--error-text)' }}><Youtube size={24} /></div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '14px' }}>YouTube</div>
                          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{snippet.title || "Connected"}</div>
                        </div>
                      </div>
                      <span className="tag tag-green">Connected</span>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                      <button className="btn" onClick={handleLogout} style={{ color: 'var(--error-text)', background: 'var(--error-bg)' }}>
                        <LogOut size={14} /> Disconnect Account
                      </button>
                    </div>
                  </div>
                )}

                {settingsTab === 'ai' && (
                  <div className="fade-in max-w-lg">
                    <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Google AI Engine</h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '32px' }}>Connect your Gemini key to enable AI-driven insights.</p>

                    {geminiKey ? (
                      <>
                        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: '24px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>API Key</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text)', background: 'var(--bg-sidebar)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                            ••••••••••••••••••••••••{geminiKey.slice(-6)}
                          </div>
                        </div>
                        <button className="btn" onClick={handleRemoveGeminiKey} style={{ color: 'var(--error-text)', background: 'var(--error-bg)' }}>
                           <Trash2 size={14} /> Remove Key
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="form-group">
                           <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                             Gemini API Key 
                             <span title="The key needed to unlock AI features. Get it from aistudio.google.com" style={{ color: 'var(--text-muted)', cursor: 'help', display: 'flex' }}>
                               <HelpCircle size={14} />
                             </span>
                           </label>
                           <input
                             type="password"
                             className="form-input"
                             placeholder="AIzaSy..."
                             value={newGeminiKey}
                             onChange={(e) => setNewGeminiKey(e.target.value)}
                           />
                           <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
                             Don't have an API key? Get one for free at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--chart-primary)', fontWeight: 600, textDecoration: 'none' }}>Google AI Studio ↗</a>
                           </div>
                           {keyError && <div style={{ color: 'var(--error-text)', fontSize: '12px', marginTop: '8px' }}>{keyError}</div>}
                        </div>
                        <button className="btn btn-primary" onClick={handleSaveGeminiKey} disabled={!newGeminiKey.trim() || isValidatingKey}>
                          {isValidatingKey ? <Spinner size={16} /> : "Save API Key"}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {settingsTab === 'appearance' && (
                  <div className="fade-in max-w-lg">
                    <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Appearance</h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '32px' }}>Customize the UI aesthetic.</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div 
                        onClick={() => setIsDarkMode(false)}
                        style={{ padding: '24px', border: `2px solid ${!isDarkMode ? 'var(--text)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer', background: '#fafafa', color: '#111' }}
                      >
                         <Sun size={24} style={{ marginBottom: '16px' }} />
                         <div style={{ fontWeight: 600, fontSize: '14px' }}>Light Mode</div>
                         <div style={{ fontSize: '13px', color: '#666' }}>Clean & bright</div>
                      </div>
                      
                      <div 
                        onClick={() => setIsDarkMode(true)}
                        style={{ padding: '24px', border: `2px solid ${isDarkMode ? 'var(--text)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer', background: '#0a0a0a', color: '#fff' }}
                      >
                         <Moon size={24} style={{ marginBottom: '16px' }} />
                         <div style={{ fontWeight: 600, fontSize: '14px' }}>Dark Mode</div>
                         <div style={{ fontSize: '13px', color: '#888' }}>Sleek & minimal</div>
                      </div>
                    </div>

                    <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Reset Tour</h4>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>Restart the CreatorIQ quick tour to learn the interface.</p>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => {
                          localStorage.setItem("creator_iq_walkthrough", "false");
                          window.location.reload();
                        }}
                      >
                        Restart Walkthrough
                      </button>
                    </div>
                  </div>
                )}

                {settingsTab === 'upload_defaults' && (
                  <div className="fade-in max-w-lg">
                    <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Upload Defaults</h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '32px' }}>Automatic appends for generated descriptions.</p>

                    <div className="form-group">
                      <label className="form-label">Social Links & Footer</label>
                      <textarea
                        className="form-input"
                        rows={6}
                        placeholder="Follow me on Twitter..."
                        value={defaultSocialLinks}
                        onChange={(e) => {
                          setDefaultSocialLinks(e.target.value);
                          localStorage.setItem("creator_iq_social_links", e.target.value);
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SESSION EXPIRED MODAL */}
      {isSessionExpired && (
        <div className="modal-overlay" style={{ zIndex: 3000 }}>
          <div className="modal-content fade-in" style={{ maxWidth: 400, padding: '32px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: 16, background: 'rgba(239,68,68,0.1)', borderRadius: '50%', marginBottom: 24 }}>
              <ShieldAlert size={32} color="var(--error-text)" />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 12 }}>Session Expired</h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 32 }}>Your YouTube security token has expired. Please reconnect to continue.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button className="btn btn-primary" onClick={handleSessionReconnect}>Reconnect Account</button>
              <button className="btn btn-secondary" onClick={() => setIsSessionExpired(false)}>Stay Offline</button>
            </div>
          </div>
        </div>
      )}

      {/* Global Walkthrough Component */}
      <Walkthrough />
    </div>
  );
}

export default function App() {
  if (!GOOGLE_CLIENT_ID) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Missing VITE_GOOGLE_CLIENT_ID</h2>
        <p>Set up OAuth in Google Cloud Console and add it to .env.</p>
      </div>
    );
  }
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <MainApp />
    </GoogleOAuthProvider>
  );
}