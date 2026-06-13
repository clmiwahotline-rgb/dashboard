// お知らせ — WordPress REST API から cl-miwa.jp の投稿を取得

const NEWS_API = "https://www.cl-miwa.jp/wp-json/wp/v2/posts?per_page=20&_embed=1";
const NEWS_SITE = "https://www.cl-miwa.jp";

// カテゴリ設定
const CAT_CONFIG = {
  "news":          { label: "お知らせ",       color: "var(--accent)",  bg: "var(--accent-soft)" },
  "campaign":      { label: "キャンペーン",   color: "#EA4335",        bg: "rgba(234,67,53,0.1)" },
  "openandclosed": { label: "営業日・定休日", color: "#4285F4",        bg: "rgba(66,133,244,0.12)" },
  "service":       { label: "サービス紹介",   color: "#34A853",        bg: "rgba(52,168,83,0.12)" },
  "recruit":       { label: "スタッフ募集",   color: "#FBBC04",        bg: "rgba(251,188,4,0.12)" },
  "etc":           { label: "未分類",         color: "var(--ink-mute)", bg: "var(--card-2)" },
};
const catCfg = (slug) => CAT_CONFIG[slug] || CAT_CONFIG["etc"];

// シードデータ（スクレイピング済み）
const SEED_NEWS = [];

// ── 日付フォーマット ──────────────────────────────────
const fmtNewsDate = (dateStr) => {
  try {
    const d = new Date(dateStr);
    return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
  } catch { return dateStr || "—"; }
};

const isNew = (dateStr) => {
  try { return (Date.now() - new Date(dateStr)) / 864e5 <= 7; } catch { return false; }
};

// ── WordPress API から取得してパース ─────────────────
const parseWpPost = (post) => {
  const cats = post._embedded?.["wp:term"]?.[0] || [];
  const catSlugs = cats.map(c => c.slug).filter(Boolean);
  const excerpt = (post.excerpt?.rendered || "")
    .replace(/<[^>]+>/g, "")
    .replace(/\[&hellip;\]|…|Continue reading.*/g, "")
    .trim()
    .slice(0, 160);
  return {
    id: post.id,
    date: (post.date || "").slice(0, 10),
    title: post.title?.rendered?.replace(/&#[0-9]+;/g, c => String.fromCharCode(c.slice(2,-1))) || "",
    link: post.link || "",
    excerpt,
    categories: catSlugs.length ? catSlugs : ["etc"],
  };
};

// ── useNewsState ──────────────────────────────────────
const useNewsState = (key, initial) => {
  const [v, setV] = React.useState(() => {
    try { const s = localStorage.getItem(key); if (s) return JSON.parse(s); } catch {}
    return typeof initial === "function" ? initial() : initial;
  });
  React.useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }, [key, v]);
  return [v, setV];
};

// ── News card ─────────────────────────────────────────
const NewsCard = ({ item }) => {
  const primary = item.categories[0] || "etc";
  const cfg = catCfg(primary);

  return (
    <a href={item.link} target="_blank" rel="noopener noreferrer" className="news-card-link">
      <div className="news-card">
        <div className="news-card-meta">
          <span className="news-date">{fmtNewsDate(item.date)}</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {item.categories.slice(0, 2).map(slug => {
              const c = catCfg(slug);
              return (
                <span key={slug} className="news-cat-badge" style={{ background: c.bg, color: c.color }}>
                  {c.label}
                </span>
              );
            })}
          </div>
          {isNew(item.date) && <span className="news-new-badge">NEW</span>}
        </div>
        <div className="news-title">{item.title}</div>
        {item.excerpt && <div className="news-excerpt">{item.excerpt}</div>}
        <div className="news-link-arrow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 0 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          cl-miwa.jp で見る
        </div>
      </div>
    </a>
  );
};

// ── Main Page ─────────────────────────────────────────
const NewsPage = () => {
  const [posts, setPosts]     = useNewsState("miwa.news.v1", () => SEED_NEWS);
  const [lastSync, setLastSync] = useNewsState("miwa.news.lastSync.v1", () => null);
  const [lastError, setLastError] = React.useState("");
  const [syncing, setSyncing] = React.useState(false);
  const [dark, setDark]       = React.useState(false);
  const [activeCat, setActiveCat] = React.useState("all");
  const [search, setSearch]   = React.useState("");
  const [toast, setToast]     = React.useState("");

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  const syncNow = React.useCallback(async () => {
    setSyncing(true);
    setLastError("");
    try {
      const res = await fetch(NEWS_API, { redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Invalid response");
      const parsed = data.map(parseWpPost);
      setPosts(parsed);
      setLastSync(Date.now());
      setToast(`${parsed.length} 件を取得しました`);
    } catch (e) {
      setLastError(e.message || String(e));
      setToast("取得に失敗しました（シードデータを表示中）");
    } finally {
      setSyncing(false);
    }
  }, []);

  // 30分ごと自動更新
  React.useEffect(() => {
    const ms = 30 * 60 * 1000;
    const isStale = () => !lastSync || (Date.now() - lastSync) >= ms;
    if (isStale()) syncNow();
    const tick = setInterval(() => { if (isStale()) syncNow(); }, 60_000);
    return () => clearInterval(tick);
  }, [lastSync, syncNow]);

  const nextLabel = React.useMemo(() => {
    const ms = 30 * 60 * 1000;
    const next = (lastSync || 0) + ms;
    const diff = next - Date.now();
    if (diff <= 0) return "更新待機中…";
    const min = Math.round(diff / 60000);
    return `次回 ${min}分後`;
  }, [lastSync]);

  // カテゴリ一覧（シードから動的生成）
  const allCats = React.useMemo(() => {
    const slugs = new Set(posts.flatMap(p => p.categories));
    return [...slugs].filter(s => CAT_CONFIG[s]).sort();
  }, [posts]);

  // フィルタ & 検索
  const filtered = React.useMemo(() => {
    return posts
      .filter(p => {
        const catOk = activeCat === "all" || p.categories.includes(activeCat);
        const searchOk = !search || (p.title + p.excerpt).toLowerCase().includes(search.toLowerCase());
        return catOk && searchOk;
      })
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [posts, activeCat, search]);

  return (
    <div className="app">
      <div className="shell">
        <AppSidebar active="notice" />
        <main className="main">
          {/* Header */}
          <div className="greet">
            <div>
              <h1>🔔 お知らせ</h1>
              <div className="sub">
                cl-miwa.jp より取得 ・ {lastSync ? `最終更新 ${new Date(lastSync).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}` : "未同期"} ・ {nextLabel}
              </div>
            </div>
            <div className="right">
              <button className="btn btn-ghost" onClick={syncNow} disabled={syncing}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                     style={syncing ? { animation: "spin 1s linear infinite" } : null}>
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                {syncing ? "取得中" : "更新"}
              </button>
              <a href={`${NEWS_SITE}/news`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 0 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                サイトへ
              </a>
            </div>
          </div>

          {lastError && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid #fca5a5", borderRadius: 12, padding: "10px 14px", fontSize: 12, color: "#991b1b", marginBottom: 4 }}>
              ⚠ {lastError} — シードデータを表示しています
            </div>
          )}

          {/* Filters */}
          <div className="card" style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input
                type="text" value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="タイトル・本文を検索..."
                className="input" style={{ width: 220, fontSize: 12, padding: "7px 12px" }}
              />
              <button
                onClick={() => setActiveCat("all")}
                className={`ag-pill ${activeCat === "all" ? "active" : ""}`}>
                すべて
              </button>
              {allCats.map(slug => {
                const cfg = catCfg(slug);
                return (
                  <button key={slug}
                          onClick={() => setActiveCat(slug)}
                          className={`ag-pill ${activeCat === slug ? "active" : ""}`}
                          style={activeCat === slug ? {} : { borderColor: "var(--line)" }}>
                    {cfg.label}
                  </button>
                );
              })}
              <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink-mute)" }}>{filtered.length} 件</span>
            </div>
          </div>

          {/* News list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {filtered.length === 0 ? (
              <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--ink-mute)" }}>
                該当する記事がありません
              </div>
            ) : (
              filtered.map(item => <NewsCard key={item.id} item={item} />)
            )}
          </div>

          {/* Footer link */}
          <div style={{ textAlign: "center", paddingBottom: 8 }}>
            <a href={`${NEWS_SITE}/news`} target="_blank" rel="noopener noreferrer"
               style={{ fontSize: 12, color: "var(--accent-ink)", fontWeight: 600, textDecoration: "none" }}>
              cl-miwa.jp でお知らせをすべて見る →
            </a>
          </div>
        </main>
      </div>

      {toast && <div className="toast" onClick={() => setToast("")}>{toast}</div>}
    </div>
  );
};

window.NewsPage = NewsPage;
