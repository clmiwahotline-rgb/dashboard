// 業界ニュース — Google ニュース RSS をキーワード検索で集約
// 閲覧者の実ブラウザ上で CORS プロキシ経由 RSS を取得 → 重複除去 → 最新 10 件

const IN_KEY      = "miwa.industry.keywords.v1";
const IN_ITEMS    = "miwa.industry.items.v1";
const IN_SYNC     = "miwa.industry.lastSync.v1";
const IN_COUNT    = "miwa.industry.count.v1";
const IN_SET      = "miwa.industry.settings.v1";
const IN_EXC      = "miwa.industry.exclude.v1";

const DEFAULT_KEYWORDS = ["クリーニング", "クリーニング業界", "洗濯", "コインランドリー", "アパレル トレンド"];

// キーワードごとの色（OKLCH で統一トーン）
const KW_PALETTE = [
  { c: "var(--accent-ink)", b: "var(--accent-soft)" },
  { c: "#b45309", b: "rgba(245,158,11,0.14)" },
  { c: "#6d28d9", b: "rgba(167,139,250,0.16)" },
  { c: "#0e7490", b: "rgba(34,211,238,0.14)" },
  { c: "#be185d", b: "rgba(236,72,153,0.12)" },
  { c: "#1d4ed8", b: "rgba(96,165,250,0.14)" },
];

// ── ローカルストレージ hook ───────────────────────────
const useLS = (key, initial) => {
  const [v, setV] = React.useState(() => {
    try { const s = localStorage.getItem(key); if (s != null) return JSON.parse(s); } catch {}
    return typeof initial === "function" ? initial() : initial;
  });
  React.useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }, [key, v]);
  return [v, setV];
};

// ── CORS プロキシ（順に試す） ─────────────────────────
const PROXIES = [
  { build: (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`, json: true },
  { build: (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,           json: false },
  { build: (u) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`, json: false },
];

async function fetchViaProxy(url) {
  let lastErr;
  for (const p of PROXIES) {
    try {
      const res = await fetch(p.build(url), { redirect: "follow" });
      if (!res.ok) { lastErr = new Error(`HTTP ${res.status}`); continue; }
      let text;
      if (p.json) { const j = await res.json(); text = j && j.contents; }
      else        { text = await res.text(); }
      if (text && (text.includes("<item") || text.includes("<entry"))) return text;
      lastErr = new Error("RSS が空でした");
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("取得に失敗しました");
}

// ── Google ニュース RSS URL ───────────────────────────
const gnewsUrl = (q) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q + " when:14d")}&hl=ja&gl=JP&ceid=JP:ja`;

// ── 開ける記事の直 URL か（google系・画像は弾く） ──────
function isArticleUrl(u) {
  if (!u || !/^https?:\/\//.test(u)) return false;
  const h = ((u.match(/^https?:\/\/([^\/]+)/) || [])[1] || "").toLowerCase();
  if (!h || h.indexOf(".") === -1) return false;
  if (/(^|\.)google\.com$|(^|\.)google\.co|googleusercontent|gstatic|ggpht/.test(h)) return false;
  if (/\.(png|jpe?g|gif|webp|svg|ico|bmp)(\?|$)/i.test(u)) return false;
  return true;
}

// ── Google ニュースの中継 URL を、可能なら記事の直 URL にデコード ──
//  （記事ID内に base64 で直 URL が埋まっている旧形式に対応。
//    新形式など解決不能なものは null を返す）
function decodeGNewsLink(link) {
  try {
    if (!link || link.indexOf("news.google.com") === -1) {
      return isArticleUrl(link) ? link : null;
    }
    const m = link.match(/\/(?:articles|read)\/([^?\/]+)/);
    if (!m) return null;
    let b64 = m[1].replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const bin = atob(b64);
    const um = bin.match(/https?:\/\/[^\s\u0000-\u001f"'<>\\]+/);
    if (!um) return null;
    const url = um[0].replace(/[\u0080-\u00ff]+$/, "");
    return isArticleUrl(url) ? url : null;
  } catch (e) { return null; }
}

// ── 表示前サニタイズ：壊れた／google系／画像リンクを検索に振替 ──
function cleanItem(it) {
  if (isArticleUrl(it.link)) return it;
  return {
    ...it,
    link: `https://search.yahoo.co.jp/search?p=${encodeURIComponent(it.title)}&ei=UTF-8`,
    source: it.source && !/google/i.test(it.source) ? it.source : "Yahoo!検索",
    fallback: true,
  };
}

// ── RSS パース ────────────────────────────────────────
function parseGNews(xml, keyword) {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  return [...doc.querySelectorAll("item")].map((it) => {
    const get = (t) => it.querySelector(t)?.textContent || "";
    const raw = get("title");
    const sourceEl = it.getElementsByTagName("source")[0];
    let source = sourceEl ? sourceEl.textContent.trim() : "";
    let title = raw;
    if (source && raw.endsWith(" - " + source)) {
      title = raw.slice(0, raw.length - source.length - 3);
    } else if (!source && raw.includes(" - ")) {
      const i = raw.lastIndexOf(" - ");
      source = raw.slice(i + 3).trim();
      title = raw.slice(0, i);
    }
    title = title.trim();
    const pub = get("pubDate");
    // 中継URLを直リンクに解決。解決できなければタイトル検索へ逃がす
    const direct = decodeGNewsLink(get("link").trim());
    const link = direct
      || `https://search.yahoo.co.jp/search?p=${encodeURIComponent(title)}&ei=UTF-8`;
    return {
      title,
      link,
      source,
      date: pub ? new Date(pub).getTime() : 0,
      keyword,
      fallback: !direct,
    };
  }).filter((x) => x.title);
}

const normTitle = (t) => t.toLowerCase().replace(/[\s　・,、。！？!?\-–—|｜「」『』【】]/g, "");

// ── 毎日 9 時基準のスケジューリング ───────────────────
function lastNineAM() {
  const n = new Date();
  const nine = new Date(n); nine.setHours(9, 0, 0, 0);
  if (n < nine) nine.setDate(nine.getDate() - 1);
  return nine.getTime();
}
function nextNineAM() {
  const n = new Date();
  const nine = new Date(n); nine.setHours(9, 0, 0, 0);
  if (n >= nine) nine.setDate(nine.getDate() + 1);
  return nine.getTime();
}

// ── 時刻表示 ──────────────────────────────────────────
const relTime = (ts) => {
  if (!ts) return "";
  const diff = Date.now() - ts;
  if (diff < 0) return "たった今";
  const m = Math.floor(diff / 6e4);
  if (m < 60) return `${Math.max(1, m)}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}日前`;
  const dt = new Date(ts);
  return `${dt.getMonth() + 1}月${dt.getDate()}日`;
};

// ── 設定モーダル（GAS Web App URL） ────────────────────
const ModalIn = ({ title, sub, onClose, children, footer }) => (
  <div className="modal-backdrop" onClick={onClose}>
    <div className="modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-head">
        <div>
          <h2>{title}</h2>
          {sub && <div className="sub">{sub}</div>}
        </div>
        <button className="modal-close" onClick={onClose} aria-label="閉じる">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M6 6l12 12M18 6L6 18"/>
          </svg>
        </button>
      </div>
      <div className="modal-body">{children}</div>
      {footer && <div className="modal-foot">{footer}</div>}
    </div>
  </div>
);

const IndSettingsModal = ({ settings, onSave, onClose, onSyncNow, lastSync, lastError, syncing }) => {
  const [url, setUrl] = React.useState(settings.url || "");
  return (
    <ModalIn
      title="取得方法の設定"
      sub="GAS Web App を設定すると、CORS プロキシを使わず安定して取得できます"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>キャンセル</button>
          <button className="btn btn-primary" onClick={() => onSave({ ...settings, url: url.trim() })}>保存</button>
        </>
      }>
      <div className="form-grid">
        <div className="field full">
          <label className="field-label">GAS Web App URL</label>
          <input className="input" placeholder="https://script.google.com/macros/s/.../exec"
                 value={url} onChange={(e) => setUrl(e.target.value)}/>
          <div style={{ fontSize: 10.5, color: "var(--ink-mute)", marginTop: 6, lineHeight: 1.7 }}>
            <strong>設定手順:</strong><br/>
            1. <a href="https://script.google.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-ink)", fontWeight: 700 }}>script.google.com</a> で新規プロジェクトを作成<br/>
            2. プロジェクト内の <code>gas/業界ニュース.gs</code> の中身を貼り付け<br/>
            3. 「デプロイ」→「新しいデプロイ」→ 種類「ウェブアプリ」<br/>
            4. アクセスできるユーザー =「全員」でデプロイ<br/>
            5. 表示された <code>…/exec</code> の URL を上に貼り付け<br/>
            ※ 空欄のままなら公開プロキシ経由で取得します（不安定）
          </div>
        </div>
        <div className="field full">
          <button className="btn btn-ghost" onClick={onSyncNow} disabled={!url.trim() || syncing} style={{ width: "100%" }}>
            {syncing ? "接続テスト中…" : "この URL で今すぐ取得してテスト"}
          </button>
          {lastError && <div style={{ fontSize: 11, color: "#991b1b", marginTop: 6 }}>⚠ {lastError}</div>}
          {lastSync && !lastError && <div style={{ fontSize: 11, color: "var(--accent-ink)", marginTop: 6 }}>✓ 最終取得 {new Date(lastSync).toLocaleString("ja-JP")}</div>}
        </div>
      </div>
    </ModalIn>
  );
};

// ── ニュースカード ────────────────────────────────────
const IndNewsCard = ({ item, kwColor }) => (
  <a href={item.link} target="_blank" rel="noopener noreferrer" className="news-card-link">
    <div className="news-card">
      <div className="news-card-meta">
        <span className="in-source">{item.source || "ニュース"}</span>
        <span className="news-date">{relTime(item.date)}</span>
        <span className="news-cat-badge" style={{ background: kwColor.b, color: kwColor.c }}>
          {item.keyword}
        </span>
      </div>
      <div className="news-title">{item.title}</div>
      <div className="news-link-arrow">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 0 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
        {item.fallback ? "検索で記事を探す" : "記事を読む"}
      </div>
    </div>
  </a>
);

// ── メインページ ──────────────────────────────────────
const IndustryNewsPage = () => {
  const [keywords, setKeywords] = useLS(IN_KEY, () => DEFAULT_KEYWORDS);
  const [excludes, setExcludes] = useLS(IN_EXC, () => []);
  const [items, setItems]       = useLS(IN_ITEMS, () => []);
  const [lastSync, setLastSync] = useLS(IN_SYNC, () => null);
  const [count, setCount]       = useLS(IN_COUNT, () => 10);
  const [settings, setSettings] = useLS(IN_SET, () => ({ url: "" }));

  const [syncing, setSyncing]   = React.useState(false);
  const [progress, setProgress] = React.useState("");
  const [lastError, setLastError] = React.useState("");
  const [dark, setDark]         = React.useState(false);
  const [activeKw, setActiveKw] = React.useState("all");
  const [adding, setAdding]     = React.useState(false);
  const [draft, setDraft]       = React.useState("");
  const [addingEx, setAddingEx] = React.useState(false);
  const [draftEx, setDraftEx]   = React.useState("");
  const [showSettings, setShowSettings] = React.useState(false);
  const [toast, setToast]       = React.useState("");

  const kwColor = React.useCallback(
    (kw) => KW_PALETTE[Math.max(0, keywords.indexOf(kw)) % KW_PALETTE.length],
    [keywords]
  );

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  // ── 同期 ──
  const kwRef = React.useRef(keywords);
  kwRef.current = keywords;
  const exRef = React.useRef(excludes);
  exRef.current = excludes;
  const setRef = React.useRef(settings);
  setRef.current = settings;
  const countRef = React.useRef(count);
  countRef.current = count;

  const syncNow = React.useCallback(async () => {
    const kws = kwRef.current;
    if (!kws.length) { setLastError("キーワードがありません"); return; }
    setSyncing(true); setLastError("");
    const gasUrl = (setRef.current.url || "").trim();

    // ① GAS Web App が設定済みならサーバー取得
    if (gasUrl) {
      try {
        setProgress("GAS から取得中");
        const u = gasUrl + (gasUrl.includes("?") ? "&" : "?")
          + "q=" + encodeURIComponent(kws.join("\n"))
          + (exRef.current.length ? "&ex=" + encodeURIComponent(exRef.current.join("\n")) : "")
          + "&n=" + Math.max(30, countRef.current);
        const res = await fetch(u, { redirect: "follow" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data && data.error) throw new Error(data.message || "GAS error");
        if (!Array.isArray(data)) throw new Error("配列形式ではないレスポンス");
        setProgress("");
        setItems(data);
        setLastSync(Date.now());
        setSyncing(false);
        setToast(`${data.length} 件のニュースを取得しました（GAS）`);
      } catch (e) {
        setProgress("");
        setLastError("GAS 取得に失敗: " + (e.message || String(e)));
        setSyncing(false);
        setToast("取得に失敗しました");
      }
      return;
    }

    // ② 未設定なら公開プロキシ経由（フォールバック）
    const collected = [];
    let ok = 0;
    for (let i = 0; i < kws.length; i++) {
      setProgress(`${i + 1}/${kws.length}「${kws[i]}」`);
      try {
        const xml = await fetchViaProxy(gnewsUrl(kws[i]));
        collected.push(...parseGNews(xml, kws[i]));
        ok++;
      } catch (e) { /* 個別失敗は無視して続行 */ }
    }
    setProgress("");
    if (!ok) {
      setLastError("ニュースの取得に失敗しました（ネットワーク／プロキシ制限の可能性。設定から GAS を登録すると安定します）");
      setSyncing(false);
      setToast("取得に失敗しました");
      return;
    }
    // 重複除去（タイトル正規化）
    const seen = new Set();
    const deduped = [];
    for (const it of collected.sort((a, b) => b.date - a.date)) {
      const k = normTitle(it.title);
      if (seen.has(k)) continue;
      seen.add(k); deduped.push(it);
    }
    setItems(deduped);
    setLastSync(Date.now());
    setSyncing(false);
    setToast(`${deduped.length} 件のニュースを取得しました`);
  }, [setItems, setLastSync]);

  // ── 毎日 9 時 自動更新 ──
  React.useEffect(() => {
    const stale = () => !lastSync || lastSync < lastNineAM();
    if (stale() && !syncing) syncNow();
    const tick = setInterval(() => { if (stale() && !syncing) syncNow(); }, 5 * 60 * 1000);
    return () => clearInterval(tick);
    // eslint-disable-next-line
  }, [lastSync]);

  const nextLabel = React.useMemo(() => {
    const dt = new Date(nextNineAM());
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const isTomorrow = dt.getTime() >= today.getTime() + 864e5;
    return `次回更新 ${isTomorrow ? "明日" : "本日"} 9:00`;
  }, [lastSync]);

  // ── キーワード操作 ──
  const addKeyword = () => {
    const v = draft.trim();
    if (!v) { setAdding(false); return; }
    if (keywords.includes(v)) { setToast("すでに登録済みです"); setDraft(""); setAdding(false); return; }
    const next = [...keywords, v];
    setKeywords(next); setDraft(""); setAdding(false);
    setToast(`「${v}」を追加しました`);
    setTimeout(() => syncNow(), 50);
  };
  const removeKeyword = (kw) => {
    const next = keywords.filter((k) => k !== kw);
    setKeywords(next);
    if (activeKw === kw) setActiveKw("all");
    setItems(items.filter((it) => next.includes(it.keyword)));
  };

  const addExclude = () => {
    const v = draftEx.trim();
    if (!v) { setAddingEx(false); return; }
    if (excludes.includes(v)) { setToast("すでに登録済みです"); setDraftEx(""); setAddingEx(false); return; }
    setExcludes([...excludes, v]); setDraftEx(""); setAddingEx(false);
    setToast(`「${v}」を除外しました`);
  };
  const removeExclude = (w) => setExcludes(excludes.filter((k) => k !== w));

  const saveSettings = (s) => {
    setSettings(s);
    setShowSettings(false);
    setToast(s.url ? "GAS URL を保存しました" : "設定を保存しました");
  };

  // ── 除外フィルタ適用後のアイテム ──
  const visibleItems = React.useMemo(() => {
    if (!excludes.length) return items;
    const ex = excludes.map((e) => e.toLowerCase());
    return items.filter((it) => {
      const hay = (it.title + " " + (it.source || "")).toLowerCase();
      return !ex.some((e) => e && hay.includes(e));
    });
  }, [items, excludes]);

  // ── 表示するアイテム ──
  const shown = React.useMemo(() => {
    const base = activeKw === "all" ? visibleItems : visibleItems.filter((it) => it.keyword === activeKw);
    return base.slice(0, count).map(cleanItem);
  }, [visibleItems, activeKw, count]);

  return (
    <div className="app">
      <div className="shell">
        <AppSidebar active="news" />
        <main className="main">
          {/* Header */}
          <div className="greet">
            <div>
              <h1>📰 業界ニュース</h1>
              <div className="sub">
                {settings.url ? "GAS 経由で取得" : "Google ニュースより集約"} ・ {lastSync
                  ? `最終更新 ${new Date(lastSync).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}`
                  : "未同期"} ・ {nextLabel}
              </div>
            </div>
            <div className="right">
              <button className="btn btn-ghost" onClick={syncNow} disabled={syncing}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                     style={syncing ? { animation: "spin 1s linear infinite" } : null}>
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                {syncing ? (progress || "取得中") : "更新"}
              </button>
              <button className={`btn btn-ghost ${settings.url ? "" : ""}`} onClick={() => setShowSettings(true)} title="取得方法の設定">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>
                </svg>
                設定
              </button>
            </div>
          </div>

          {lastError && (
            <div className="in-error">⚠ {lastError}</div>
          )}

          {/* キーワード管理 */}
          <div className="card in-kwbar">
            <div className="in-kwbar-head">
              <span className="in-kwbar-title">監視キーワード</span>
              <span className="in-kwbar-hint">クリックで絞り込み ・ ×で削除</span>
            </div>
            <div className="in-kwlist">
              <button
                className={`in-kwchip ${activeKw === "all" ? "active" : ""}`}
                onClick={() => setActiveKw("all")}>
                すべて<span className="in-kwcount">{visibleItems.length}</span>
              </button>
              {keywords.map((kw) => {
                const c = kwColor(kw);
                const n = visibleItems.filter((it) => it.keyword === kw).length;
                const on = activeKw === kw;
                return (
                  <span key={kw}
                        className={`in-kwchip in-kwchip-kw ${on ? "active" : ""}`}
                        style={on ? { background: c.b, borderColor: c.c, color: c.c } : { "--kwc": c.c }}
                        onClick={() => setActiveKw(kw)}>
                    {kw}
                    {n > 0 && <span className="in-kwcount">{n}</span>}
                    <span className="in-kwx" title="削除"
                          onClick={(e) => { e.stopPropagation(); removeKeyword(kw); }}>×</span>
                  </span>
                );
              })}
              {adding ? (
                <span className="in-addbox">
                  <input
                    autoFocus className="in-addinput" value={draft}
                    placeholder="キーワードを入力"
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addKeyword(); if (e.key === "Escape") { setAdding(false); setDraft(""); } }}
                  />
                  <button className="in-addgo" onClick={addKeyword}>追加</button>
                </span>
              ) : (
                <button className="in-kwadd" onClick={() => setAdding(true)}>
                  <Ico.plus/> キーワード追加
                </button>
              )}
            </div>

            {/* 除外キーワード */}
            <div className="in-exdiv" />
            <div className="in-kwbar-head">
              <span className="in-kwbar-title in-extitle">除外キーワード</span>
              <span className="in-kwbar-hint">この語を含む記事を結果から外す</span>
            </div>
            <div className="in-kwlist">
              {excludes.length === 0 && !addingEx && (
                <span className="in-exempty">なし</span>
              )}
              {excludes.map((w) => (
                <span key={w} className="in-kwchip in-exchip">
                  {w}
                  <span className="in-kwx" title="削除"
                        onClick={(e) => { e.stopPropagation(); removeExclude(w); }}>×</span>
                </span>
              ))}
              {addingEx ? (
                <span className="in-addbox">
                  <input
                    autoFocus className="in-addinput" value={draftEx}
                    placeholder="除外する語を入力"
                    onChange={(e) => setDraftEx(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addExclude(); if (e.key === "Escape") { setAddingEx(false); setDraftEx(""); } }}
                  />
                  <button className="in-addgo" onClick={addExclude}>追加</button>
                </span>
              ) : (
                <button className="in-kwadd in-exadd" onClick={() => setAddingEx(true)}>
                  <Ico.plus/> 除外キーワード追加
                </button>
              )}
            </div>
          </div>

          {/* 件数コントロール */}
          <div className="in-listhead">
            <span className="in-listcount">
              {activeKw === "all" ? "最新ニュース" : `「${activeKw}」のニュース`}
              <b> {shown.length}</b> 件
            </span>
            <span className="in-countsel">
              表示件数
              {[10, 20, 30].map((n) => (
                <button key={n}
                        className={`in-countbtn ${count === n ? "active" : ""}`}
                        onClick={() => setCount(n)}>{n}</button>
              ))}
            </span>
          </div>

          {/* リスト */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {syncing && !items.length ? (
              [0, 1, 2, 3, 4].map((i) => <div key={i} className="in-skel" />)
            ) : shown.length === 0 ? (
              <div className="card in-empty">
                {lastError
                  ? "ニュースを取得できませんでした。「更新」を押して再試行してください。"
                  : "まだニュースがありません。「更新」を押すと取得します。"}
              </div>
            ) : (
              shown.map((it, i) => <IndNewsCard key={it.link + i} item={it} kwColor={kwColor(it.keyword)} />)
            )}
          </div>

          {/* フッター */}
          <div style={{ textAlign: "center", padding: "4px 0 8px" }}>
            <a href="https://search.yahoo.co.jp/search?p=クリーニング+業界&ei=UTF-8"
               target="_blank" rel="noopener noreferrer"
               style={{ fontSize: 12, color: "var(--accent-ink)", fontWeight: 600, textDecoration: "none" }}>
              Yahoo!検索で続きを見る →
            </a>
          </div>
        </main>
      </div>

      {showSettings && (
        <IndSettingsModal
          settings={settings}
          onSave={saveSettings}
          onClose={() => setShowSettings(false)}
          onSyncNow={syncNow}
          lastSync={lastSync}
          lastError={lastError}
          syncing={syncing}
        />
      )}

      {toast && <div className="toast" onClick={() => setToast("")}>{toast}</div>}
    </div>
  );
};

window.IndustryNewsPage = IndustryNewsPage;
