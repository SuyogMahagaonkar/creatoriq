import { API_KEY, YT_BASE } from "./config";
import { parseDuration, calcEngagement } from "./utils";

// --- DYNAMIC CREDENTIALS HELPERS ---
const getToken = () => localStorage.getItem("creator_iq_token");
const getChannelId = () => localStorage.getItem("creator_iq_channel_id");
const getGeminiKey = () => localStorage.getItem("creator_iq_gemini_key") || import.meta.env.VITE_GEMINI_API_KEY;

async function ytFetch(endpoint, params = {}) {
  const url = new URL(`${YT_BASE}/${endpoint}`);
  
  // Fallback to API key if no token is present (for public searches)
  if (API_KEY && API_KEY !== "undefined" && !getToken()) {
    url.searchParams.set("key", API_KEY);
  }
  
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  
  const headers = {};
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || "YouTube API error");
  }
  return res.json();
}

// NEW: Fetch the currently logged-in user's channel
export async function fetchMyChannel() {
  const data = await ytFetch("channels", {
    part: "snippet,statistics,brandingSettings",
    mine: "true",
  });
  return data.items?.[0] || null;
}

export async function fetchChannelStats() {
  const channelId = getChannelId();
  if (!channelId) throw new Error("No channel ID configured");
  const data = await ytFetch("channels", {
    part: "snippet,statistics,brandingSettings",
    id: channelId,
  });
  return data.items?.[0] || null;
}

export async function fetchChannelVideos(maxResults = 20) {
  const channelId = getChannelId();
  const chanData = await ytFetch("channels", { part: "contentDetails", id: channelId });
  const uploadsId = chanData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsId) throw new Error("Could not find uploads playlist");

  const playlistData = await ytFetch("playlistItems", { part: "snippet", playlistId: uploadsId, maxResults });
  const videoIds = playlistData.items.map(i => i.snippet.resourceId.videoId).join(",");
  if (!videoIds) return [];

  const videoData = await ytFetch("videos", { part: "snippet,statistics,contentDetails", id: videoIds });

  return videoData.items.map(v => ({
    id: v.id,
    title: v.snippet.title,
    description: v.snippet.description,
    thumbnail: v.snippet.thumbnails?.maxres?.url || v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.medium?.url,
    publishedAt: v.snippet.publishedAt,
    tags: v.snippet.tags || [],
    duration: parseDuration(v.contentDetails.duration),
    viewCount: parseInt(v.statistics.viewCount || 0),
    likeCount: parseInt(v.statistics.likeCount || 0),
    commentCount: parseInt(v.statistics.commentCount || 0),
    engagementRate: calcEngagement(v.statistics),
  }));
}

export async function fetchPlaylists(maxResults = 50) {
  const channelId = getChannelId();
  const data = await ytFetch("playlists", { part: "snippet,contentDetails", channelId: channelId, maxResults });
  if (!data.items) return [];
  return data.items.map(p => ({
    id: p.id,
    title: p.snippet.title,
    description: p.snippet.description,
    thumbnail: p.snippet.thumbnails?.maxres?.url || p.snippet.thumbnails?.high?.url || p.snippet.thumbnails?.medium?.url,
    publishedAt: p.snippet.publishedAt,
    itemCount: p.contentDetails.itemCount,
    tags: p.snippet.tags || [],
  }));
}

export async function fetchPlaylistVideos(playlistId, maxResults = 50) {
  const playlistData = await ytFetch("playlistItems", { part: "snippet", playlistId: playlistId, maxResults });
  const videoIds = playlistData.items.map(i => i.snippet.resourceId.videoId).filter(Boolean).join(",");
  if (!videoIds) return [];

  const videoData = await ytFetch("videos", { part: "snippet,statistics,contentDetails", id: videoIds });
  return videoData.items.map(v => ({
    id: v.id,
    title: v.snippet.title,
    description: v.snippet.description,
    thumbnail: v.snippet.thumbnails?.maxres?.url || v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.medium?.url,
    publishedAt: v.snippet.publishedAt,
    tags: v.snippet.tags || [],
    duration: parseDuration(v.contentDetails.duration),
    viewCount: parseInt(v.statistics.viewCount || 0),
    likeCount: parseInt(v.statistics.likeCount || 0),
    commentCount: parseInt(v.statistics.commentCount || 0),
    engagementRate: calcEngagement(v.statistics),
  }));
}

export async function fetchNicheVideos(query, maxResults = 12) {
  const data = await ytFetch("search", { part: "snippet", q: query, type: "video", order: "relevance", maxResults, relevanceLanguage: "en" });
  const ids = data.items.map(i => i.id.videoId).join(",");
  if (!ids) return [];
  const stats = await ytFetch("videos", { part: "statistics,contentDetails,snippet", id: ids });
  return stats.items.map(v => ({
    id: v.id,
    title: v.snippet.title,
    channelTitle: v.snippet.channelTitle,
    thumbnail: v.snippet.thumbnails?.high?.url,
    publishedAt: v.snippet.publishedAt,
    duration: parseDuration(v.contentDetails.duration),
    viewCount: parseInt(v.statistics.viewCount || 0),
    likeCount: parseInt(v.statistics.likeCount || 0),
    commentCount: parseInt(v.statistics.commentCount || 0),
    engagementRate: calcEngagement(v.statistics),
  }));
}

export async function updateYouTubeMetadata(type, id, updates, token) {
  if (!token) throw new Error("You must be signed in with Google to save changes.");
  const isVideo = type === "video";
  const endpoint = isVideo ? "videos" : "playlists";
  
  const getRes = await fetch(`${YT_BASE}/${endpoint}?part=snippet&id=${id}`, { headers: { Authorization: `Bearer ${token}` } });
  const getData = await getRes.json();
  if (!getData.items || getData.items.length === 0) throw new Error("Entity not found on YouTube");
  
  const currentSnippet = getData.items[0].snippet;
  if (updates.title !== undefined) currentSnippet.title = updates.title;
  if (updates.description !== undefined) currentSnippet.description = updates.description;
  if (updates.tags !== undefined) currentSnippet.tags = updates.tags;

  const putRes = await fetch(`${YT_BASE}/${endpoint}?part=snippet`, {
    method: "PUT",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ id: id, snippet: currentSnippet })
  });
  const putData = await putRes.json();
  if (!putRes.ok) throw new Error(putData?.error?.message || "Failed to save to YouTube");
  return putData;
}

// NEW: Validate the Gemini API key without using generation tokens
export async function validateGeminiKey(key) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    // If we get a 200 OK, the key is real. If 400, it's fake.
    return res.ok; 
  } catch (err) {
    return false;
  }
}

// --- UPLOAD VIDEO TO YOUTUBE ---
export async function uploadVideoToYouTube(file, metadata, token) {
  if (!token) throw new Error("Authentication token required to upload.");
  
  // YouTube Data API requires a specific multipart format for uploads
  const formData = new FormData();
  
  // 1. Append the JSON metadata part
  formData.append("metadata", new Blob([JSON.stringify({
    snippet: metadata.snippet,
    status: metadata.status
  })], { type: "application/json" }));
  
  // 2. Append the actual video file
  formData.append("file", file);

  const res = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`
    },
    body: formData
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || "Failed to upload video to YouTube");
  }

  return res.json();
}

// --- GENERATE FRESH SEO CONTENT FROM A TOPIC ---
// --- GENERATE FRESH SEO CONTENT FROM A TOPIC ---
export async function generateFreshSEO(type, topic, currentTitle = "", currentDesc = "", videoDuration = "Unknown") {
  const apiKey = getGeminiKey();
  if (!apiKey) throw new Error("Missing Gemini API Key in Settings.");

  let prompt = "";
  if (type === "title") {
    prompt = `Act as an expert YouTube SEO strategist. I am making a video about: "${topic}". 
Generate 5 highly engaging, high-CTR, SEO-optimized titles. Use power words, curiosity, and keep them under 70 characters.
Output ONLY a valid JSON array of strings. Example: ["Title 1", "Title 2", "Title 3", "Title 4", "Title 5"]`;
  } else if (type === "description") {
    prompt = `Act as an expert YouTube SEO strategist. Write a full, highly engaging, and SEO-optimized YouTube video description.
Topic: "${topic}"
Video Title: "${currentTitle}"
Format it beautifully with an engaging hook, a summary paragraph, a "Timestamps" placeholder section, and a call to action. 
Output ONLY a valid JSON array containing exactly 1 string.`;
  } else if (type === "tags") {
    prompt = `Act as an expert YouTube SEO strategist. Generate 15 highly searched, long-tail and short-tail tags for this video.
Video Title: "${currentTitle}"
Video Description: "${currentDesc}"
Output ONLY a valid JSON array of strings. Example: ["tag1", "tag2", "tag3"]`;
  } else if (type === "chapters") {
    // If the duration is an ISO string like PT1M30S, Gemini can usually parse it natively, but if parseDuration is available we use it if we can. 
    // Usually Gemini is smart enough to handle PT1M30S or 1:30 formats.
    prompt = `Act as an expert YouTube SEO strategist. Create logical video chapters (timestamps) starting at 00:00 for the video.
Topic/Title: "${topic}"
Video Duration: "${videoDuration}"
Context/Description: "${currentDesc}"

CRITICAL INSTRUCTIONS: 
1. The timestamps MUST linearly progress and MUST NOT exceed the precise Video Duration (${videoDuration}).
2. The final chapter timestamp must be at least 10% before the end of the duration.
3. Read the Context/Description. If specific events or times are mentioned, use them! If not, logically estimate typical sections for this topic within the exact duration.
Output ONLY a valid JSON array of strings in format: ["00:00 Intro", "01:15 Section 1", "03:00 Outro"]. Exactly 5-8 chapters.`;
  } else if (type === "long_tail_keywords") {
    prompt = `Act as an expert YouTube SEO strategist. Suggest exactly 5 low-competition, high-search-intent long-tail keywords based on the seed topic: "${topic}".
Output ONLY a valid JSON array of strings. Example: ["how to...", "best way to..."]`;
  }

  // 1. Fallback cascade (Same as your SEO Auditor)
  const modelsToTry = [
    "gemini-2.5-flash",        // Start here
              // Best fallback
    
   
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.0-flash-exp",
    "gemini-2.0-flash-lite"
  ];

  for (let i = 0; i < modelsToTry.length; i++) {
    const currentModel = modelsToTry[i];
    
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: "application/json" }
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const errorMessage = err?.error?.message || "";
        
        // If Rate Limited (429) and not the last model, try the next one
        if (res.status === 429) {
          console.warn(`[${currentModel}] Rate limit hit. Falling back to next model...`);
          
          // If this was the VERY LAST model in our array, trigger the UI wait timer
          if (i === modelsToTry.length - 1) {
            const match = errorMessage.match(/retry in (\d+(\.\d+)?)s/);
            const waitTimeSec = match ? Math.ceil(parseFloat(match[1])) : 60;
            throw new Error(`RATE_LIMIT:${waitTimeSec}`);
          }
          
          // Otherwise, skip the rest of the loop and try the next model
          continue; 
        }
        
        // If it's a real error (or we ran out of models), throw the ACTUAL error message
        throw new Error(errorMessage || `Failed to communicate with ${currentModel}`);
      }

      const data = await res.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("No response from AI.");
      
      // Clean up the JSON if the AI decided to wrap it in markdown block quotes
      text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      
      try {
        return JSON.parse(text);
      } catch (parseError) {
        // If the AI spits out plain text instead of JSON, catch it!
        console.error("AI returned invalid JSON:", text);
        throw new Error("AI returned an invalid format. Please click Auto-Write again.");
      }

    } catch (err) {
      // If we are on the very last model, throw the error to the UI
      if (i === modelsToTry.length - 1 || !err.message.includes("Rate limit")) {
        throw err;
      }
    }
  }
}




export async function fetchGeminiSuggestions(field, currentText, targetObj, issues) {
  if (!getGeminiKey()) throw new Error("Missing VITE_GEMINI_API_KEY. Please add it to your .env file.");
  
  const safeTags = targetObj.tags ? targetObj.tags.join(", ") : "";
  const issuesList = issues.length > 0 ? issues.join(" | ") : "None. Just optimize for better CTR and engagement.";

  let prompt = "";
  if (field === "title") {
    prompt = `You are an expert YouTube SEO consultant. Suggest 3 highly engaging, high-CTR, SEO-optimized alternative titles.\nContext:\n- Current Title: "${currentText}"\n- Description: "${targetObj.description}"\n- Tags: "${safeTags}"\nCRITICAL SEO ISSUES TO FIX: ${issuesList}\nINSTRUCTIONS: Your suggestions must explicitly resolve the SEO issues listed above while remaining highly relevant to the description and tags.\nOutput ONLY a valid JSON array of 3 strings. Example: ["Title 1", "Title 2", "Title 3"]`;
  } else if (field === "description") {
    prompt = `You are an expert YouTube SEO consultant. Rewrite the following video description to be more engaging, readable, and SEO-optimized. Provide 2 distinct versions.\nContext:\n- Video Title: "${targetObj.title}"\n- Tags: "${safeTags}"\n- Current Description: "${currentText}"\nCRITICAL SEO ISSUES TO FIX: ${issuesList}\nINSTRUCTIONS: Ensure you explicitly resolve the SEO issues listed above. Make sure to use proper line breaks (\\n) and paragraph spacing to format the description beautifully.\nOutput ONLY a valid JSON array of 2 strings.`;
  } else if (field === "tags") {
    prompt = `You are an expert YouTube SEO consultant. Suggest 3 different sets of SEO-optimized tags.\nContext:\n- Video Title: "${targetObj.title}"\n- Description: "${targetObj.description}"\n- Current Tags: "${currentText}"\nCRITICAL SEO ISSUES TO FIX: ${issuesList}\nINSTRUCTIONS: Ensure you explicitly resolve the SEO issues listed above. Extract powerful keywords from the description and title.\nEach set should be a comma-separated string of 10-15 tags. Output ONLY a valid JSON array of 3 strings. Example: ["tag1, tag2", "tag3, tag4", "tag5, tag6"]`;
  }

  // 1. Define the fallback cascade (Primary first, then Best -> Worst)
  const modelsToTry = [
    "gemini-2.5-flash",        // Start here
    "gemini-3.1-pro",          // Best fallback
    "gemini-3.0-pro",
    "gemini-3.0-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.0-flash-exp",
    "gemini-2.0-flash-lite"
  ];

  // 2. Loop through the models
  for (let i = 0; i < modelsToTry.length; i++) {
    const currentModel = modelsToTry[i];
    
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${getGeminiKey()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: "application/json" }
        })
      });

      if (!res.ok) {
        const err = await res.json();
        const errorMessage = err?.error?.message || "";
        
        // If Rate Limited (429)
        if (res.status === 429) {
          console.warn(`[${currentModel}] Rate limit hit. Falling back to next model...`);
          
          // If this was the VERY LAST model in our array, trigger the UI wait timer
          if (i === modelsToTry.length - 1) {
            const match = errorMessage.match(/retry in (\d+(\.\d+)?)s/);
            const waitTimeSec = match ? Math.ceil(parseFloat(match[1])) : 60;
            throw new Error(`RATE_LIMIT:${waitTimeSec}`);
          }
          
          // Otherwise, skip the rest of the loop and try the next model
          continue; 
        }
        
        // If it's a completely different error (like Bad Request 400), stop and throw it
        throw new Error(errorMessage || `Failed to communicate with ${currentModel}`);
      }

      // 3. Success! Parse and return the data.
      const data = await res.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("No response from AI");
      
      text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      
      console.log(`Success! Generated SEO tags using: ${currentModel}`);
      return JSON.parse(text);

    } catch (err) {
      // If the error is our custom RATE_LIMIT string or if we are on the last model, 
      // throw it to the UI. Otherwise, the loop just continues to the next model.
      if (err.message.startsWith("RATE_LIMIT:") || i === modelsToTry.length - 1) {
        throw err;
      }
    }
  }
}

// ============================================================
// NEW: AI THUMBNAIL ANALYZER (Gemini Vision)
// ============================================================
// ============================================================
// NEW: AI THUMBNAIL ANALYZER (Gemini Vision)
// ============================================================
export async function analyzeThumbnailWithAI(base64Image, mimeType) {
  const apiKey = getGeminiKey();
  if (!apiKey) throw new Error("Missing Gemini API Key in Settings.");

  const prompt = `Act as an expert YouTube strategist. Analyze this video thumbnail for Click-Through Rate (CTR) potential. 
Evaluate visual hierarchy, text readability, contrast, and curiosity hook.
Output ONLY valid JSON in this exact format: 
{ "score": 85, "feedback": ["Point 1", "Point 2", "Point 3"] }`;

  // Models that support Vision processing
  // Real, currently active models that support Vision and Text
  const modelsToTry = [
    "gemini-2.5-flash",
    "gemini-3.0-flash",
    "gemini-2.5-pro",
    "gemini-3.0-pro",
    "gemini-3.1-pro"
  ];

  for (let i = 0; i < modelsToTry.length; i++) {
    const currentModel = modelsToTry[i];
    
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              // FIX: Google REST API requires camelCase 'inlineData' and 'mimeType'
              { inlineData: { mimeType: mimeType, data: base64Image } } 
            ]
          }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const errorMessage = err?.error?.message || "";
        
        if (res.status === 429 && i < modelsToTry.length - 1) {
          console.warn(`[${currentModel}] Rate limit hit for Vision. Falling back...`);
          continue; 
        }
        
        throw new Error(errorMessage || `HTTP ${res.status} from ${currentModel}`);
      }
      
      const data = await res.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("No response from AI.");
      
      try {
        return JSON.parse(text.replace(/```json/gi, "").replace(/```/g, "").trim());
      } catch (parseError) {
        console.error("AI returned invalid JSON:", text);
        throw new Error("AI returned an invalid format. Please try another image.");
      }

    } catch (err) {
      if (i === modelsToTry.length - 1 || !err.message.includes("Rate limit")) {
        throw err;
      }
    }
  }
}
// ============================================================
// NEW: AI THUMBNAIL GENERATOR (Imagen 3)
// ============================================================
export async function generateAIThumbnail(prompt) {
  const apiKey = getGeminiKey();
  if (!apiKey) throw new Error("Missing Gemini API Key.");

  // Using the official v1beta Imagen 3 endpoint for AI Studio
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt: prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: "16:9"
      }
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Failed to generate AI thumbnail.");
  }

  const data = await res.json();
  const base64Image = data.predictions?.[0]?.bytesBase64Encoded;
  if (!base64Image) throw new Error("No image generated. Try a different prompt.");
  
  return base64Image;
}
// ============================================================
// NEW: YOUTUBE COMMENTS & AI REPLIES
// ============================================================
// ============================================================
// NEW: YOUTUBE COMMENTS & AI REPLIES
// ============================================================
// ============================================================
// NEW: YOUTUBE COMMENTS & AI REPLIES
// ============================================================
export async function fetchRecentComments(maxResults = 50) {
  const channelId = localStorage.getItem("creator_iq_channel_id");
  const token = localStorage.getItem("creator_iq_token");
  
  // 1. Pre-check: Don't even hit the network if we know we're logged out
  if (!channelId || !token) {
    throw new Error("AUTH_REQUIRED");
  }

  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/commentThreads?part=snippet,replies&allThreadsRelatedToChannelId=${channelId}&maxResults=${maxResults}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    // 2. Handle the 401 "Invalid Credentials" specifically
    if (res.status === 401) {
      console.error("🚨 YouTube Token Expired.");
      localStorage.removeItem("creator_iq_token"); // Wipe the bad token
      throw new Error("AUTH_REQUIRED");
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || "Failed to fetch comments from YouTube.");
    }
    
    const data = await res.json();
    if (!data.items) return [];
    
    return data.items.map(item => {
      const topComment = item.snippet.topLevelComment.snippet;
      const rawReplies = item.replies ? item.replies.comments : [];

      const replies = rawReplies.map(reply => ({
        commentId: reply.id,
        author: reply.snippet.authorDisplayName,
        authorAvatar: reply.snippet.authorProfileImageUrl,
        text: reply.snippet.textOriginal,
        publishedAt: reply.snippet.publishedAt,
        isCreator: reply.snippet.authorChannelId?.value === channelId
      })).reverse(); 

      const creatorReplied = replies.some(r => r.isCreator);

      return {
        threadId: item.id,
        commentId: item.snippet.topLevelComment.id,
        videoId: item.snippet.videoId,
        author: topComment.authorDisplayName,
        authorAvatar: topComment.authorProfileImageUrl,
        text: topComment.textOriginal,
        publishedAt: topComment.publishedAt,
        likeCount: topComment.likeCount,
        totalReplyCount: item.snippet.totalReplyCount,
        replies: replies,
        creatorReplied: creatorReplied,
        isCreatorComment: topComment.authorChannelId?.value === channelId 
      };
    });
  } catch (err) {
    // Pass the specific error up so the UI can react
    throw err;
  }
}

// ============================================================
// NEW: EDIT & DELETE COMMENTS
// ============================================================
export async function editComment(commentId, newText) {
  const token = localStorage.getItem("creator_iq_token");
  if (!token) throw new Error("Missing auth token.");

  const res = await fetch(`https://www.googleapis.com/youtube/v3/comments?part=snippet`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id: commentId,
      snippet: { textOriginal: newText }
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Failed to edit comment.");
  }
  return res.json();
}

export async function deleteComment(commentId) {
  const token = localStorage.getItem("creator_iq_token");
  if (!token) throw new Error("Missing auth token.");

  const res = await fetch(`https://www.googleapis.com/youtube/v3/comments?id=${commentId}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Failed to delete comment.");
  }
  return true; // Delete requests usually return a 204 No Content response
}

export async function postCommentReply(parentId, replyText) {
  const token = localStorage.getItem("creator_iq_token");
  if (!token) throw new Error("Missing auth token.");

  // FIX: Explicitly using the full Google API URL instead of YT_BASE
  const res = await fetch(`https://www.googleapis.com/youtube/v3/comments?part=snippet`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      snippet: {
        parentId: parentId,
        textOriginal: replyText
      }
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Failed to post reply to YouTube.");
  }
  
  return res.json();
}

export async function draftCommentReply(commentText) {
  const apiKey = getGeminiKey();
  if (!apiKey) throw new Error("Missing Gemini API Key.");

  const prompt = `Act as the friendly and professional creator of a YouTube channel. 
Draft a concise, engaging, and appreciative reply to this viewer's comment: "${commentText}".
Output ONLY the raw reply text, no quotes or JSON.`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });

  if (!res.ok) throw new Error("Failed to draft reply.");
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Thank you for watching!";
}

// ============================================================
// NEW: ADVANCED VIDEO EDITING
// ============================================================

export async function fetchSingleVideo(videoId) {
  const token = localStorage.getItem("creator_iq_token");
  const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,status,contentDetails&id=${videoId}`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to fetch video details.");
  const data = await res.json();
  if (!data.items || data.items.length === 0) throw new Error("Video not found.");
  return data.items[0]; // Returns the full raw video object
}

export async function updateVideoMetadata(videoObj) {
  const token = localStorage.getItem("creator_iq_token");
  
  // YouTube requires a PUT request with the ID, snippet, and status
  const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,status`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id: videoObj.id,
      snippet: videoObj.snippet,
      status: videoObj.status
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Failed to update video metadata.");
  }
  return res.json();
}

export async function uploadCustomThumbnail(videoId, file) {
  const token = localStorage.getItem("creator_iq_token");
  const res = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": file.type
    },
    body: file
  });
  if (!res.ok) throw new Error("Failed to upload custom thumbnail.");
  return res.json();
}

export async function uploadCaptionTrack(videoId, language, file) {
  const token = localStorage.getItem("creator_iq_token");
  
  // Create metadata for the caption track
  const metadata = { snippet: { videoId: videoId, language: language, name: `${language} Captions`, isDraft: false } };
  
  // We must construct a multipart/form-data request manually for Google's API
  const formData = new FormData();
  formData.append("snippet", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  formData.append("media", file);

  const res = await fetch(`https://www.googleapis.com/upload/youtube/v3/captions?part=snippet`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}` },
    body: formData
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Failed to upload captions.");
  }
  return res.json();
}

export async function addVideoToPlaylist(playlistId, videoId) {
  const token = localStorage.getItem("creator_iq_token");
  if (!token) throw new Error("Missing auth token for playlist action.");

  const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      snippet: {
        playlistId: playlistId,
        resourceId: {
          kind: "youtube#video",
          videoId: videoId
        }
      }
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Failed to push video to the playlist.");
  }
  return res.json();
}

export async function checkVideoInPlaylist(playlistId, videoId) {
  const token = localStorage.getItem("creator_iq_token");
  if (!token) return { exists: false };

  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,id&maxResults=50&playlistId=${playlistId}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (!res.ok) return { exists: false };
    const data = await res.json();
    if (!data.items) return { exists: false };

    // We now look for the item and grab its specific unique ID so we can delete it later if needed!
    const foundItem = data.items.find(item => item.snippet.resourceId.videoId === videoId);
    if (foundItem) return { exists: true, playlistItemId: foundItem.id };
    
    return { exists: false };
  } catch (err) {
    console.error("Playlist API Error:", err);
    return { exists: false };
  }
}

export async function removeVideoFromPlaylist(playlistItemId) {
  const token = localStorage.getItem("creator_iq_token");
  if (!token) throw new Error("Missing auth token.");

  console.log(`🗑️ API: Attempting to remove item ID -> ${playlistItemId}`);

  const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?id=${playlistItemId}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` }
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("❌ API Delete Failed:", errText);
    throw new Error("Failed to remove video from playlist. Check console.");
  }
  
  console.log(`✅ API: Successfully removed item ID -> ${playlistItemId}`);
  return true;
}

// ============================================================
// NEW: ADVANCED PLAYLIST EDITING
// ============================================================

export async function fetchSinglePlaylist(playlistId) {
  const token = localStorage.getItem("creator_iq_token");
  const res = await fetch(`https://www.googleapis.com/youtube/v3/playlists?part=snippet,status&id=${playlistId}`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to fetch playlist details.");
  const data = await res.json();
  if (!data.items || data.items.length === 0) throw new Error("Playlist not found.");
  return data.items[0]; 
}

export async function updatePlaylistMetadata(playlistObj) {
  const token = localStorage.getItem("creator_iq_token");
  const res = await fetch(`https://www.googleapis.com/youtube/v3/playlists?part=snippet,status`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(playlistObj)
  });

  if (!res.ok) throw new Error("Failed to update playlist metadata.");
  return res.json();
}

export async function fetchPlaylistItemsExact(playlistId) {
  const token = localStorage.getItem("creator_iq_token");
  const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,id&maxResults=50&playlistId=${playlistId}`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
}

// --- ADD TO api.js ---

// 1. Summarizer API
export async function summarizeCommentsVibe(commentsTextArray) {
  const apiKey = localStorage.getItem("creator_iq_gemini_key");
  if (!apiKey) throw new Error("Missing Gemini API Key.");

  // 1. Combine all the comments into a single string list
  const combinedText = commentsTextArray.join("\n- ");
  
  // 2. Create the strict prompt for Gemini
  const prompt = `You are an expert YouTube audience analyst. Read the following recent comments from my video. Give me a concise, 2-sentence summary of the overall vibe, how the audience feels, and if there are any common questions or requests.\n\nComments:\n- ${combinedText}`;

  // 3. Make the API call using your exact setup
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });

  if (!res.ok) throw new Error("Failed to generate summary.");
  const data = await res.json();
  
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "No summary generated.";
}

// 2. Translator API
export async function translateCommentText(text) {
  const apiKey = localStorage.getItem("creator_iq_gemini_key");
  if (!apiKey) throw new Error("Missing Gemini API Key.");

  const prompt = `Translate the following YouTube comment to English. Output ONLY the raw translated text, no quotes or explanations: "${text}"`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });

  if (!res.ok) throw new Error("Failed to translate comment.");
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || text;
}

// 3. Sentiment Analysis API (Batch processing)
export async function analyzeSentiments(commentsArray) {
  const apiKey = localStorage.getItem("creator_iq_gemini_key");
  if (!apiKey) throw new Error("Missing Gemini API Key.");

  const prompt = `Analyze the sentiment of the following YouTube comments. 
  Return ONLY a valid JSON array of objects with 'id' and 'sentiment' (must be exactly 'positive', 'negative', or 'neutral'). Output absolutely nothing else.
  Comments: ${JSON.stringify(commentsArray)}`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });

  if (!res.ok) throw new Error("Failed to analyze sentiments.");
  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "[]";
  
  // Clean up markdown formatting just in case Gemini adds ```json
  const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  
  return JSON.parse(cleanJson);
}