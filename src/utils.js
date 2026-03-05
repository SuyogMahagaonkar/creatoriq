// ============================================================
// FORMATTERS & HELPERS
// ============================================================
export function parseDuration(iso) {
  if (!iso) return "0:00";
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "0:00";
  const h = parseInt(match[1] || 0);
  const m = parseInt(match[2] || 0);
  const s = parseInt(match[3] || 0);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function calcEngagement(stats) {
  if (!stats) return 0;
  const views = parseInt(stats.viewCount || 0);
  if (!views) return 0;
  const likes = parseInt(stats.likeCount || 0);
  const comments = parseInt(stats.commentCount || 0);
  return parseFloat((((likes + comments) / views) * 100).toFixed(2));
}

export function formatCount(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

export function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "Today";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// ============================================================
// SEO ANALYZER
// ============================================================
export function analyzeTitle(title) {
  let score = 0; const issues = []; const tips = [];
  const len = title?.length || 0;
  if (len >= 40 && len <= 70) { score += 25; } 
  else if (len < 40) { score += 10; issues.push("Title too short — aim for 50–70 characters"); }
  else { score += 15; issues.push("Title may be truncated in search (>70 chars)"); }
  
  const powerWords = ["how","why","what","best","top","ultimate","guide","secret","fast","easy","free","proven","exact","complete","step","never","always","new","first","last","every","only"];
  const hasPower = title ? powerWords.some(w => title.toLowerCase().includes(w)) : false;
  if (hasPower) { score += 20; tips.push("Contains power word"); }
  else { score += 5; issues.push("Add a power word (How, Why, Best, Ultimate, Secret...)"); }
  
  const hasNumber = /\d/.test(title || "");
  if (hasNumber) { score += 15; tips.push("Contains number — boosts CTR"); }
  else { issues.push("Add a specific number (5 Tips, 3 Mistakes, 30-Day...)"); }
  
  const hasColon = title ? (title.includes(":") || title.includes("—") || title.includes("|")) : false;
  if (hasColon) { score += 10; tips.push("Good title structure with separator"); }
  
  const hasQuestion = title ? title.includes("?") : false;
  if (hasQuestion) { score += 10; tips.push("Question format drives curiosity"); }
  
  const hasYear = /20\d{2}/.test(title || "");
  if (hasYear) { score += 10; tips.push("Year adds freshness signal"); }
  
  score = Math.min(score, 100);
  return { score, issues, tips };
}

export function analyzeDescription(desc) {
  let score = 0; const issues = []; const tips = [];
  if (!desc || desc.length < 50) {
    return { score: 5, issues: ["Description is empty or too short — this hurts SEO significantly"], tips: [] };
  }
  const len = desc.length;
  if (len >= 200) { score += 25; tips.push("Good description length"); }
  else { score += 10; issues.push("Description too short — aim for 200+ characters"); }
  
  const firstLine = desc.split("\n")[0];
  if (firstLine.length >= 100) { score += 15; tips.push("First line is descriptive (shows in search)"); }
  else { issues.push("Expand first line — it appears in search previews"); }
  
  const hasLinks = /https?:\/\//.test(desc);
  if (hasLinks) { score += 10; tips.push("Contains links"); }
  else { issues.push("Add relevant links (social, website, related content)"); }
  
  const hasTimestamps = /\d+:\d+/.test(desc);
  if (hasTimestamps) { score += 20; tips.push("Has timestamps — improves retention/chapters"); }
  else { issues.push("Consider adding timestamps if relevant to the content"); }
  
  const hasHashtags = /#\w+/.test(desc);
  if (hasHashtags) { score += 10; tips.push("Uses hashtags"); }
  else { issues.push("Add 3–5 relevant hashtags at the end"); }
  
  const hasCTA = /subscribe|comment|like|share|notify|bell/i.test(desc);
  if (hasCTA) { score += 10; tips.push("Has call to action"); }
  else { issues.push("Add a CTA (Subscribe, Comment below, etc.)"); }
  
  const hasKeywords = len > 300;
  if (hasKeywords) { score += 10; tips.push("Long enough for keyword density"); }
  
  score = Math.min(score, 100);
  return { score, issues, tips };
}

export function analyzeTags(tags) {
  let score = 0; const issues = []; const tips = [];
  const count = tags?.length || 0;
  if (count === 0) return { score: 0, issues: ["No tags found — add 10–15 relevant tags"], tips: [] };
  if (count >= 10) { score += 30; tips.push(`Good tag count: ${count} tags`); }
  else { score += 15; issues.push(`Only ${count} tags — aim for 10–15`); }
  
  const hasLongTail = tags.some(t => t.split(" ").length >= 3);
  if (hasLongTail) { score += 30; tips.push("Has long-tail keyword tags"); }
  else { issues.push("Add long-tail tags (3+ words) for niche targeting"); }
  
  const hasShort = tags.some(t => t.split(" ").length === 1);
  if (hasShort) { score += 20; tips.push("Mix of broad and specific tags"); }
  
  score += Math.min(count * 2, 20);
  score = Math.min(score, 100);
  return { score, issues, tips };
}

export function getScoreColor(score) {
  if (score >= 75) return "#057642"; 
  if (score >= 50) return "#B24020"; 
  return "#CC1016"; 
}

export function getScoreLabel(score) {
  if (score >= 75) return "Strong";
  if (score >= 50) return "Needs Work";
  return "Poor";
}