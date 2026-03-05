import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { Youtube, Wand2, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Spinner } from '../components/Shared';
import { fetchMyChannel, validateGeminiKey } from '../api';

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [channelInfo, setChannelInfo] = useState(null);
  const [geminiKey, setGeminiKey] = useState("");
  const [validatingAI, setValidatingAI] = useState(false);
  const [aiError, setAiError] = useState("");
  // Step 1: Login & YouTube Auth
  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError("");
      try {
        // Temporarily save token to fetch their specific channel
        localStorage.setItem("creator_iq_token", tokenResponse.access_token);
        
        const channel = await fetchMyChannel();
        if (!channel) throw new Error("No YouTube channel found on this Google account.");
        
        setChannelInfo(channel);
        localStorage.setItem("creator_iq_channel_id", channel.id);
        setStep(2); // Move to confirm screen
      } catch (err) {
        setError(err.message);
        localStorage.removeItem("creator_iq_token");
      } finally {
        setLoading(false);
      }
    },
    scope: 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/youtube.upload',
    onError: () => setError("Google Login Failed. Please try again.")
  });




  // Updated Final Step Logic
  const finishSetup = async (skip = false) => {
    if (skip) {
      onComplete(); // Triggers the main app to load without a key
      return;
    }

    setAiError("");
    setValidatingAI(true);
    
    const isValid = await validateGeminiKey(geminiKey.trim());
    setValidatingAI(false);

    if (isValid) {
      localStorage.setItem("creator_iq_gemini_key", geminiKey.trim());
      onComplete(); 
    } else {
      setAiError("Invalid Gemini API Key. Please check and try again.");
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', padding: 24 }}>
      <div className="card fade-in" style={{ maxWidth: 480, width: '100%', textAlign: 'center', padding: 40 }}>
        
        {/* STEP 1: LOGIN */}
        {step === 1 && (
          <div className="fade-in">
            <div style={{ width: 64, height: 64, background: '#FDE8E9', color: '#CC1016', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <Youtube size={32} />
            </div>
            <h1 className="heading-xl mb-12">Connect YouTube</h1>
            <p className="text-muted mb-24 text-sm" style={{ lineHeight: 1.6 }}>
              CreatorIQ needs read/write access to your YouTube channel to audit your videos and apply SEO updates automatically.
            </p>
            
            {error && <div style={{ background: "#FDE8E9", color: "#CC1016", padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 20 }}>{error}</div>}

            <button className="btn btn-primary" onClick={() => login()} disabled={loading} style={{ width: '100%', padding: '12px 24px', fontSize: 16 }}>
              {loading ? <Spinner size={20} /> : "Sign in with Google"}
            </button>
            <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <ShieldAlert size={14} /> Only requests necessary YouTube permissions
            </div>
          </div>
        )}

        {/* STEP 2: CONFIRM CHANNEL */}
        {step === 2 && channelInfo && (
          <div className="fade-in">
            <div style={{ width: 64, height: 64, background: '#EAF4EA', color: '#057642', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <CheckCircle2 size={32} />
            </div>
            <h1 className="heading-xl mb-12">Channel Found!</h1>
            <p className="text-muted mb-24 text-sm">We successfully linked your account.</p>

            <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32, textAlign: 'left' }}>
              <img src={channelInfo.snippet?.thumbnails?.default?.url} alt="avatar" style={{ width: 48, height: 48, borderRadius: '50%' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{channelInfo.snippet?.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{channelInfo.snippet?.customUrl}</div>
              </div>
            </div>

            <button className="btn btn-primary" onClick={() => setStep(3)} style={{ width: '100%', padding: '12px 24px', fontSize: 16 }}>
              Continue <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* STEP 3: GEMINI AI SETUP */}
        {step === 3 && (
          <div className="fade-in">
            <div style={{ width: 64, height: 64, background: '#F4FAFF', color: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <Wand2 size={32} />
            </div>
            <h1 className="heading-xl mb-12">Enable AI Features</h1>
            <p className="text-muted mb-24 text-sm" style={{ lineHeight: 1.6 }}>
              To generate AI-powered titles, descriptions, and tags, paste your free Gemini API key below.
            </p>

            {aiError && <div style={{ background: "#FDE8E9", color: "#CC1016", padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 20 }}>{aiError}</div>}

            <input 
              type="password" 
              className="form-input mb-12" 
              placeholder="Paste your Gemini API Key here" 
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              style={{ textAlign: 'center' }}
            />
            
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: 12, color: 'var(--accent)', marginBottom: 32, textDecoration: 'none', fontWeight: 600 }}>
              Get a free key from Google AI Studio &rarr;
            </a>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary" onClick={() => finishSetup(true)} disabled={validatingAI} style={{ flex: 1 }}>Skip</button>
              <button className="btn btn-primary" onClick={() => finishSetup(false)} disabled={!geminiKey.trim() || validatingAI} style={{ flex: 1 }}>
                {validatingAI ? <Spinner size={20} /> : "Save & Finish"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}