import React, { createContext, useState, useEffect } from 'react';
import { fetchChannelStats, fetchChannelVideos, fetchPlaylists, validateGeminiKey } from '../api';

export const CreatorContext = createContext();

export const CreatorProvider = ({ children }) => {
  const [page, setPage] = useState("dashboard");
  const [editingVideoId, setEditingVideoId] = useState(null);
  const [editingPlaylistId, setEditingPlaylistId] = useState(null);
  const [previousPage, setPreviousPage] = useState("dashboard");
  
  const [channelData, setChannelData] = useState(null);
  const [videos, setVideos] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isOnboarded, setIsOnboarded] = useState(!!localStorage.getItem("creator_iq_token"));
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem("creator_iq_gemini_key") || import.meta.env.VITE_GEMINI_API_KEY || "");
  const [newGeminiKey, setNewGeminiKey] = useState("");
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [keyError, setKeyError] = useState("");
  
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem("theme") === "dark");

  // Authentication Wipe
  const handleLogout = () => {
    localStorage.removeItem("creator_iq_token");
    localStorage.removeItem("creator_iq_channel_id");
    localStorage.removeItem("creator_iq_gemini_key"); 
    setGeminiKey(""); 
    setIsOnboarded(false);
    setChannelData(null);
    setVideos([]);
    setPlaylists([]);
  };

  const handleSessionReconnect = () => {
    localStorage.removeItem("creator_iq_token");
    setIsSessionExpired(false);
    window.location.reload(); 
  };

  // Dark Mode
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  // AI Key Management
  const handleRemoveGeminiKey = () => {
    localStorage.removeItem("creator_iq_gemini_key");
    setGeminiKey("");
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

  // Initial YouTube Data Load
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
          handleLogout(); 
        }
      } finally { 
        setLoading(false); 
      }
    }
    load();
  }, [isOnboarded]);

  const value = {
    // Nav States
    page, setPage,
    editingVideoId, setEditingVideoId,
    editingPlaylistId, setEditingPlaylistId,
    previousPage, setPreviousPage,

    // Data States
    channelData, setChannelData,
    videos, setVideos,
    playlists, setPlaylists,

    // UI States
    loading, setLoading,
    error, setError,
    isDarkMode, setIsDarkMode,
    
    // Auth States
    isOnboarded, setIsOnboarded,
    isSessionExpired, setIsSessionExpired,
    handleLogout, handleSessionReconnect,

    // AI Settings
    geminiKey, setGeminiKey,
    newGeminiKey, setNewGeminiKey,
    isValidatingKey, setIsValidatingKey,
    keyError, setKeyError,
    handleSaveGeminiKey, handleRemoveGeminiKey
  };

  return (
    <CreatorContext.Provider value={value}>
      {children}
    </CreatorContext.Provider>
  );
};
