import React, { useState, useEffect } from "react";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { BarChart2, Video, FileSearch, Globe, CheckCircle2, LogOut, Settings, X, Youtube, Key, Trash2, ShieldAlert, Save, UploadCloud } from "lucide-react";
import UploadPage from "./pages/UploadPage";import { GOOGLE_CLIENT_ID } from "./config";
import { Spinner, ErrorBox } from "./components/Shared";
import Onboarding from "./pages/Onboarding";
import DashboardPage from "./pages/DashboardPage";
import MyVideosPage from "./pages/MyVideosPage";
import BulkSEOPage from "./pages/BulkSEOPage";
import DiscoverPage from "./pages/DiscoverPage";
import "./index.css"; 
import { fetchChannelStats, fetchChannelVideos, fetchPlaylists, validateGeminiKey } from "./api";
import { MessageCircle,Edit3,Sun,Moon,Monitor } from "lucide-react";
import CommentsPage from "./pages/CommentsPage";
import EditVideoPage from "./pages/EditVideoPage";
import EditPlaylistPage from "./pages/EditPlaylistPage";
const NAV = [
  { id: "dashboard", label: "Channel Overview", icon: BarChart2 },
  { id: "upload", label: "Upload New Video", icon: UploadCloud }, // NEW TAB
  { id: "comments", label: "Audience & Comments", icon: MessageCircle },
  { id: "myvideos", label: "My Content & SEO", icon: Video },
  { id: "bulkseo", label: "Bulk SEO Audit", icon: FileSearch },
  { id: "discover", label: "Discover Niche", icon: Globe },
];

const TITLES = {
  dashboard: "Channel Overview",
  upload: "Upload & Optimize New Video", // NEW TITLE
  myvideos: "My Content Library & SEO",
  bulkseo: "Bulk SEO Audit",
  discover: "Discover Niche Videos",
  comments: "Comment Manager & AI Replies",
  editvideo: "Video Editor & Localization",
};

function MainApp() {
  const [page, setPage] = useState("dashboard");
  const [editingVideoId, setEditingVideoId] = useState(null);
  const [editingPlaylistId, setEditingPlaylistId] = useState(null);
  const [channelData, setChannelData] = useState(null);
  const [videos, setVideos] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [keyError, setKeyError] = useState(""); 
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  // App & Connection States
  const [isOnboarded, setIsOnboarded] = useState(!!localStorage.getItem("creator_iq_token"));
  const accessToken = localStorage.getItem("creator_iq_token");
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem("creator_iq_gemini_key") || "");
  const [newGeminiKey, setNewGeminiKey] = useState("");
  const [previousPage, setPreviousPage] = useState("dashboard");
  // Settings Modal States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState("youtube");

  // Handle completely logging out the user (Disconnects YouTube)
  // Handle completely logging out the user (Disconnects YouTube & AI)
  const handleLogout = () => {
    localStorage.removeItem("creator_iq_token");
    localStorage.removeItem("creator_iq_channel_id");
    
    // NEW: Wipe the Gemini key completely on logout
    localStorage.removeItem("creator_iq_gemini_key"); 
    setGeminiKey(""); 
    
    setIsOnboarded(false);
    setChannelData(null);
    setVideos([]);
    setPlaylists([]);
    setIsSettingsOpen(false);
  };

  // This physically flips the switch on the website body
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);
  // Handle AI Key Disconnect/Save
  const handleRemoveGeminiKey = () => {
    localStorage.removeItem("creator_iq_gemini_key");
    setGeminiKey("");
  };

  const handleSessionReconnect = () => {
  localStorage.removeItem("creator_iq_token"); // Clear the bad data
  setIsSessionExpired(false);
  window.location.reload(); // This will trigger your existing login flow
};

  const handleSaveGeminiKey = async () => {
    if (!newGeminiKey.trim()) return;
    
    setKeyError("");
    setIsValidatingKey(true);
    
    const isValid = await validateGeminiKey(newGeminiKey.trim());
    setIsValidatingKey(false);

    if (isValid) {
      localStorage.setItem("creator_iq_gemini_key", newGeminiKey.trim());
      setGeminiKey(newGeminiKey.trim());
      setNewGeminiKey("");
    } else {
      setKeyError("Invalid API Key. Please check and try again.");
    }
  };

  // Load dashboard data ONLY if onboarded
  useEffect(() => {
    if (!isOnboarded) return;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [ch, vids, plists] = await Promise.all([
          fetchChannelStats(), 
          fetchChannelVideos(20), 
          fetchPlaylists(50)
        ]);
        setChannelData(ch); 
        setVideos(vids); 
        setPlaylists(plists);
      } catch (e) { 
        setError(e.message); 
        if (e.message.includes("API error") || e.message.includes("401")) {
          handleLogout(); // Auto-logout if token is dead
        }
      } finally { 
        setLoading(false); 
      }
    }
    load();
  }, [isOnboarded]);

  if (!isOnboarded) {
    return <Onboarding onComplete={() => {
      setIsOnboarded(true);
      setGeminiKey(localStorage.getItem("creator_iq_gemini_key") || "");
    }} />;
  }

  const snippet = channelData?.snippet || {};

  return (
    <div className="app-shell">
      <nav className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">
            <div className="logo-icon"><BarChart2 size={20} /></div>
            <div><div className="logo-text">CreatorIQ</div><div className="logo-sub">Intelligence Platform</div></div>
          </div>
        </div>
        
        <div className="sidebar-nav">
          {snippet.thumbnails && (
            <div className="channel-info mb-12">
              <img className="channel-avatar" src={snippet.thumbnails.default?.url} alt="channel" />
              <div>
                <div className="channel-name-sidebar">{snippet.title || "Your Channel"}</div>
                <div className="channel-subs">{snippet.customUrl || "Loading..."}</div>
              </div>
            </div>
          )}
          <div className="nav-section-label">Navigation</div>
          {NAV.map(item => {
            const IconComponent = item.icon;
            return (
              <button key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => setPage(item.id)}>
                <span className="nav-icon"><IconComponent size={20} /></span>{item.label}
              </button>
            );
          })}
        </div>
        
        {/* SIDEBAR FOOTER */}
        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          
          
          

          {/* Settings Button */}
          <button 
            onClick={() => setIsSettingsOpen(true)} 
            className="btn btn-secondary" 
            style={{ marginTop: 8, padding: '6px 12px', fontSize: 13, display: 'flex', justifyContent: 'center', gap: '6px', borderColor: 'var(--border)', background: 'var(--surface-2)'}}
          >
            <Settings size={14} /> Settings
          </button>

          {/* Logout Button */}
          <button 
            onClick={handleLogout} 
            className="btn btn-secondary" 
            style={{ padding: '6px 12px', fontSize: 13, display: 'flex', justifyContent: 'center', gap: '6px' }}
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </nav>

      <main className="main-content">
        <div className="topbar">
          <h1 className="topbar-title">{TITLES[page]}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {!loading && !error && (
                <span className="tag tag-green" style={{ display: 'flex', gap: 6 }}>
                  <span style={{ width: 8, height: 8, background: 'currentColor', borderRadius: '50%' }}></span> Live Data
                </span>
              )}
              <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>
                {videos.length} videos • {playlists.length} playlists
              </span>
            </div>
          </div>
        </div>

        {loading && <Spinner />}
        
        {error && !loading && (
          <div className="page">
            <ErrorBox message={error} />
          </div>
        )}
        
        {!loading && !error && (
        <>
          {page === "dashboard" && <DashboardPage channelData={channelData} videos={videos} playlists={playlists} setPage={setPage} setEditingPlaylistId={setEditingPlaylistId} setPreviousPage={setPreviousPage} setIsSessionExpired={setIsSessionExpired} />}

          {page === "myvideos" && <MyVideosPage videos={videos} playlists={playlists} setVideos={setVideos} setPlaylists={setPlaylists} accessToken={accessToken} setPage={setPage} setEditingVideoId={setEditingVideoId} setEditingPlaylistId={setEditingPlaylistId} setPreviousPage={setPreviousPage} setIsSessionExpired={setIsSessionExpired}/>}

          {page === "editplaylist" && <EditPlaylistPage playlistId={editingPlaylistId} setPage={setPage} channelVideos={videos} previousPage={previousPage} setIsSessionExpired={setIsSessionExpired}/>}
          {page === "upload" && <UploadPage setIsSessionExpired={setIsSessionExpired}/>}
          
          {/* ADDED THE TWO PROPS TO THE END OF THIS LINE: */}
          
          {page === "bulkseo" && <BulkSEOPage videos={videos} setIsSessionExpired={setIsSessionExpired} setPage={setPage} setEditingVideoId={setEditingVideoId}/>}
          {page === "editvideo" && <EditVideoPage videoId={editingVideoId} setPage={setPage} setIsSessionExpired={setIsSessionExpired}/>}
          {page === "comments" && <CommentsPage setIsSessionExpired={setIsSessionExpired}/>}
          {page === "discover" && <DiscoverPage setIsSessionExpired={setIsSessionExpired}/>}
        </>
      )}
      </main>

      {/* SETTINGS MODAL */}
      {isSettingsOpen && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="modal-content fade-in" style={{ maxWidth: 700, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            
            {/* Modal Header */}
            <div className="modal-header" style={{ padding: '20px 24px', margin: 0, background: 'var(--card)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {snippet.thumbnails && <img src={snippet.thumbnails.default?.url} style={{ width: 40, height: 40, borderRadius: '50%' }} alt="avatar" />}
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)' }}>Settings</h2>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{snippet.title || "Your Channel"}</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setIsSettingsOpen(false)}><X size={24} /></button>
            </div>

            {/* Modal Body (Two-Pane Layout) */}
            <div style={{ display: 'flex', minHeight: 400 }}>
              
              {/* Settings Sidebar */}
              <div style={{ width: 220, borderRight: '1px solid var(--border)', background: 'var(--surface)', padding: '16px 12px' }}>
                <button 
                  onClick={() => setSettingsTab('youtube')} 
                  className={`nav-item ${settingsTab === 'youtube' ? 'active' : ''}`}
                  style={{ width: '100%', borderRadius: 6, marginBottom: 8 }}
                >
                  <Youtube size={16} /> YouTube Connection
                </button>
                <button 
                  onClick={() => setSettingsTab('ai')} 
                  className={`nav-item ${settingsTab === 'ai' ? 'active' : ''}`}
                  style={{ width: '100%', borderRadius: 6, marginBottom: 8 }}
                >
                  <Key size={16} /> AI Engine (Gemini)
                </button>
                {/* NEW APPEARANCE TAB */}
                <button 
                  onClick={() => setSettingsTab('appearance')} 
                  className={`nav-item ${settingsTab === 'appearance' ? 'active' : ''}`}
                  style={{ width: '100%', borderRadius: 6 }}
                >
                  <Monitor size={16} /> Appearance
                </button>
              </div>

              {/* Settings Content Area */}
              <div style={{ flex: 1, padding: 32, background: 'var(--card)' }}>
                
                {/* YOUTUBE TAB */}
                {settingsTab === 'youtube' && (
                  <div className="fade-in">
                    <h3 className="heading-md mb-8">YouTube API Status</h3>
                    <p className="text-muted text-sm mb-24">Manage your channel's connection to CreatorIQ.</p>
                    
                    <div style={{ background: '#EAF4EA', border: '1px solid #CDE2CD', borderRadius: 8, padding: 16, display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 24 }}>
                      <CheckCircle2 size={20} color="#057642" style={{ marginTop: 2 }} />
                      <div>
                        <div style={{ fontWeight: 600, color: '#057642', fontSize: 14 }}>Connected & Active</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                          You have granted this app permission to read your channel analytics and write SEO updates directly to your videos.
                        </div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Danger Zone</h4>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Disconnecting will log you out immediately and stop all data syncing.</p>
                      <button className="btn btn-primary" onClick={handleLogout} style={{ color: '#CC1016', borderColor: '#FDE8E9', background: '#FDE8E9' }}>
                        <LogOut size={16} /> Disconnect YouTube Account
                      </button>
                    </div>
                  </div>
                )}

                
                {/* AI TAB */}
                {settingsTab === 'ai' && (
                  <div className="fade-in">
                    <h3 className="heading-md mb-8">Google AI Studio (Gemini)</h3>
                    <p className="text-muted text-sm mb-24">Power your automated SEO suggestions by connecting your own AI key.</p>
                    
                    {geminiKey ? (
                      /* --- STATE 1: KEY IS CONNECTED --- */
                      <>
                        <div style={{ background: '#F4FAFF', border: '1px solid #CDE1F4', borderRadius: 8, padding: 16, display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 24 }}>
                          <CheckCircle2 size={20} color="var(--accent)" style={{ marginTop: 2 }} />
                          <div style={{ width: '100%' }}>
                            <div style={{ fontWeight: 600, color: 'var(--accent)', fontSize: 14, marginBottom: 4 }}>API Key Connected</div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'monospace', background: '#fff', padding: '6px 12px', borderRadius: 4, border: '1px solid #CDE1F4' }}>
                              ••••••••••••••••••••••••{geminiKey.slice(-6)}
                            </div>
                          </div>
                        </div>

                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
                          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Remove Key</h4>
                          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Disconnect your AI Studio account to disable AI features or if you need to add a different key.</p>
                          <button 
                            className="btn btn-secondary" 
                            onClick={handleRemoveGeminiKey} 
                            style={{ color: '#CC1016', borderColor: '#FDE8E9', background: '#FDE8E9' }}
                          >
                            <Trash2 size={16} style={{ marginRight: 6 }} /> Disconnect API Key
                          </button>
                        </div>
                      </>
                    ) : (
                      /* --- STATE 2: NO KEY CONNECTED --- */
                      <>
                        <div style={{ background: '#FDE8E9', border: '1px solid #F1B2B5', borderRadius: 8, padding: 16, display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 24 }}>
                          <ShieldAlert size={20} color="#CC1016" style={{ marginTop: 2 }} />
                          <div>
                            <div style={{ fontWeight: 600, color: '#CC1016', fontSize: 14 }}>Not Connected</div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                              AI generation features are currently disabled. You need to provide a valid Google AI Studio API key.
                            </div>
                          </div>
                        </div>

                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
                          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Connect New Key</h4>
                          {keyError && <div style={{ color: "#CC1016", fontSize: 13, marginBottom: 8 }}>{keyError}</div>}
                          <input 
                            type="password" 
                            className="form-input mb-12" 
                            placeholder="Paste your Gemini API Key here" 
                            value={newGeminiKey}
                            onChange={(e) => setNewGeminiKey(e.target.value)}
                          />
                          <button className="btn btn-primary" onClick={handleSaveGeminiKey} disabled={!newGeminiKey.trim() || isValidatingKey}>
                            {isValidatingKey ? <Spinner size={16} /> : <><Save size={16} style={{ marginRight: 6 }} /> Save Key & Connect</>}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* --- NEW APPEARANCE TAB CONTENT --- */}
                {settingsTab === 'appearance' && (
                  <div className="fade-in">
                    <h3 className="heading-md mb-8">Appearance</h3>
                    <p className="text-muted text-sm mb-24">Customize your workspace experience.</p>
                    
                    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>Theme Preference</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                          Toggle between Light and Dark mode.
                        </div>
                      </div>

                      {/* THE PILL TOGGLE SWITCH */}
                      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface)', padding: 4, borderRadius: 30, border: '1px solid var(--border)' }}>
                        <div 
                          onClick={() => setIsDarkMode(false)}
                          style={{ 
                            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 24, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            background: !isDarkMode ? 'var(--card)' : 'transparent',
                            color: !isDarkMode ? 'var(--text)' : 'var(--text-muted)',
                            boxShadow: !isDarkMode ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <Sun size={14} /> Light
                        </div>

                        <div 
                          onClick={() => setIsDarkMode(true)}
                          style={{ 
                            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 24, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            background: isDarkMode ? '#2d2d2d' : 'transparent',
                            color: isDarkMode ? '#fff' : 'var(--text-muted)',
                            boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <Moon size={14} /> Dark
                        </div>
                      </div>
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
          <div className="modal-content fade-in" style={{ maxWidth: 400, textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ 
              width: 64, height: 64, background: 'rgba(204, 16, 22, 0.1)', 
              borderRadius: '50%', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', margin: '0 auto 20px' 
            }}>
              <ShieldAlert size={32} color="#CC1016" />
            </div>
            
            <h2 className="heading-xl mb-12">Session Expired</h2>
            <p className="text-muted text-sm mb-24" style={{ lineHeight: 1.6 }}>
              Your YouTube security token has expired (Google refreshes these every hour). 
              Please reconnect to continue managing your channel.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button className="btn btn-primary" onClick={handleSessionReconnect} style={{ width: '100%', py: 12 }}>
                Reconnect YouTube Account
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => setIsSessionExpired(false)}
                style={{ width: '100%', border: 'none' }}
              >
                Close & Stay Offline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  if (!GOOGLE_CLIENT_ID) {
    return (
      <div style={{ padding: 40, fontFamily: 'sans-serif', lineHeight: 1.6 }}>
        <h2>Missing VITE_GOOGLE_CLIENT_ID</h2>
        <p>To enable Google Login and YouTube access, you must set this up.</p>
        <ol>
          <li>Go to Google Cloud Console → APIs & Services → Credentials.</li>
          <li>Create an <b>OAuth Client ID (Web Application)</b>.</li>
          <li>Add <code>http://localhost:5173</code> to the <b>Authorized JavaScript origins</b>.</li>
          <li>Put the Client ID in your <code>.env</code> file: <code>VITE_GOOGLE_CLIENT_ID=...</code></li>
        </ol>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <MainApp />
    </GoogleOAuthProvider>
  );
}