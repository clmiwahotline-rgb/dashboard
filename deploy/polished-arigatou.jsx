// ありがとうカード — メインページ

const DEFAULT_ARIGATOU_GAS = "https://script.google.com/macros/s/AKfycbxCHJ4OB8uYtdEflKyld4h3oitjW2Tr80UihXnVTd_jyUREAWz0qF5ebGzJpUhq2eQh/exec";

const KIND_CONFIG = {
  "お客様からのありがとう": { emoji: "🙏", color: "var(--accent)",  bg: "var(--accent-soft)" },
  "接客対応":               { emoji: "😊", color: "var(--accent)",  bg: "var(--accent-soft)" },
  "お客様からの苦情・不満": { emoji: "⚠️",  color: "#EA4335",        bg: "rgba(234,67,53,0.1)" },
  "チームワーク":           { emoji: "🤝", color: "#FBBC04",        bg: "rgba(251,188,4,0.12)" },
  "業務改善":               { emoji: "💡", color: "#5e97f6",        bg: "rgba(94,151,246,0.12)" },
  "サポート":               { emoji: "🙌", color: "#34A853",        bg: "rgba(52,168,83,0.12)" },
};
const DEFAULT_KIND = { emoji: "📌", color: "var(--ink-mute)", bg: "var(--card-2)" };
const kindCfg = (k) => KIND_CONFIG[k] || DEFAULT_KIND;

// 日時を日本時間(JST)で表示。GASはUTC(末尾Z)で返すため変換が必要。
const fmtJst = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d).replace("T", " ").substring(0, 16);
  return dt.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
};

const STORE_COLORS = [
  "var(--accent)", "#EA4335", "#FBBC04", "#34A853",
  "#5e97f6", "#ff7b6b", "#fdd663", "#81c995", "#1a73e8",
];

const SEED_ARIGATOU = [];

const useArigatouState = (key, initial) => {
  const [v, setV] = React.useState(() => {
    try { const s = localStorage.getItem(key); if (s) return JSON.parse(s); } catch {}
    return typeof initial === "function" ? initial() : initial;
  });
  React.useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }, [key, v]);
  return [v, setV];
};

// ── KPI strip ─────────────────────────────────────────
const ArigatouKpi = ({ data }) => {
  const total = data.length;
  const storeCounts = {};
  data.forEach(d => { if (d.store) storeCounts[d.store] = (storeCounts[d.store] || 0) + 1; });
  const topStore = Object.entries(storeCounts).sort((a,b) => b[1]-a[1])[0];

  const kindCounts = {};
  data.forEach(d => { if (d.kind) kindCounts[d.kind] = (kindCounts[d.kind] || 0) + 1; });
  const topKind = Object.entries(kindCounts).sort((a,b) => b[1]-a[1])[0];

  const week = data.filter(d => {
    try { return (Date.now() - new Date(d.date).getTime()) / 864e5 <= 7; } catch(e) { return false; }
  }).length;

  const cfg = topKind ? kindCfg(topKind[0]) : DEFAULT_KIND;

  const cards = [
    { icon: "📮", label: "総登録数",    value: total,                             sub: "全店舗合計",     accent: "var(--accent)" },
    { icon: "🥇", label: "投稿最多店舗", value: topStore ? topStore[0] : "—",     sub: topStore ? topStore[1]+"件" : "",  accent: "#EA4335", small: true },
    { icon: "🏷", label: "最多種別",    value: topKind ? topKind[0] : "—",        sub: topKind ? topKind[1]+"件" : "",    accent: cfg.color, small: true },
    { icon: "📅", label: "今週の登録",  value: week,                              sub: "直近7日間",     accent: "#34A853" },
  ];

  return (
    <div className="kpi-row kpi-row-4">
      {cards.map((c, i) => (
        <div key={i} className="kpi" style={{ borderTop: `3px solid ${c.accent}`, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
          <div className="kpi-label"><span style={{ marginRight: 5 }}>{c.icon}</span>{c.label}</div>
          <div className="kpi-value" style={{ color: c.accent, fontSize: c.small ? 16 : 26, lineHeight: 1.3 }}>{c.value}</div>
          <div className="kpi-delta">{c.sub}</div>
        </div>
      ))}
    </div>
  );
};

// ── 店舗別バーチャート ────────────────────────────────
const StoreBarChart = ({ data }) => {
  const stores = [...new Set(data.map(d => d.store).filter(Boolean))];
  const counts = stores.map(s => ({ store: s, count: data.filter(d => d.store === s).length }));
  counts.sort((a,b) => b.count - a.count);
  const max = counts[0]?.count || 1;

  if (!counts.length) return <div style={{ padding: 24, textAlign: "center", color: "var(--ink-mute)", fontSize: 12 }}>データがありません</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {counts.map(({ store, count }, i) => {
        const pct = Math.round(count / max * 100);
        const col = STORE_COLORS[i % STORE_COLORS.length];
        return (
          <div key={store} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 100, fontSize: 11.5, color: "var(--ink-soft)", textAlign: "right", flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{store}</div>
            <div style={{ flex: 1, height: 22, background: "var(--bg-2)", borderRadius: 6, overflow: "hidden", border: "1px solid var(--line)" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: col, borderRadius: 5, display: "flex", alignItems: "center", paddingLeft: 8, minWidth: 28, transition: "width 0.4s ease" }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "white", whiteSpace: "nowrap" }}>{count}件</span>
              </div>
            </div>
            <div style={{ width: 24, textAlign: "right", fontSize: 11.5, color: "var(--ink-soft)", flexShrink: 0 }}>{count}</div>
          </div>
        );
      })}
    </div>
  );
};

// ── 種別内訳 ──────────────────────────────────────────
const KindBreakdown = ({ data }) => {
  const total = data.length || 1;
  const kindCounts = {};
  data.forEach(d => { if (d.kind) kindCounts[d.kind] = (kindCounts[d.kind] || 0) + 1; });
  const sorted = Object.entries(kindCounts).sort((a,b) => b[1]-a[1]);
  const max = sorted[0]?.[1] || 1;

  if (!sorted.length) return <div style={{ padding: 24, textAlign: "center", color: "var(--ink-mute)", fontSize: 12 }}>データがありません</div>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {sorted.map(([kind, count]) => {
        const cfg = kindCfg(kind);
        const pct = Math.round(count / max * 100);
        const totalPct = Math.round(count / total * 100);
        return (
          <div key={kind} style={{ background: "var(--card-2)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>{cfg.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 4, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{kind}</div>
              <div style={{ height: 4, background: "var(--line)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: cfg.color, borderRadius: 2 }}></div>
              </div>
              <div style={{ fontSize: 10, color: "var(--ink-mute)", marginTop: 2 }}>{totalPct}%</div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: cfg.color, flexShrink: 0 }}>{count}</div>
          </div>
        );
      })}
    </div>
  );
};

// 各カードの安定キー（GASフィードにIDが無いため内容から生成）
const cardKeyOf = (card) => {
  const s = `${card.store || ""}|${card.date || ""}|${card.content || ""}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return "k" + (h >>> 0).toString(36);
};

// ── Individual card ───────────────────────────────────
const ThankCard = ({ card, storeColorMap, comments = [], onAddComment, onDelComment }) => {
  const cfg = kindCfg(card.kind);
  const dateStr = fmtJst(card.date);
  const [who, setWho] = React.useState("");
  const [text, setText] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onAddComment({ who: who.trim(), text: t });
    setText("");
  };
  const copyCard = async () => {
    const lines = [
      `【${card.store || "不明"}】${card.kind ? "（" + card.kind + "）" : ""}`,
      dateStr,
      "",
      card.content || "",
    ];
    if (comments.length) {
      lines.push("", "── コメント ──");
      comments.forEach((c) => lines.push(`・${c.who ? c.who + "：" : ""}${c.text}`));
    }
    const out = lines.join("\n");
    try {
      await navigator.clipboard.writeText(out);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = out; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch {}
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div className="ag-card">
      <div className="ag-card-top">
        <StoreTag name={card.store || "不明"} />
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 10.5, color: "var(--ink-mute)" }}>{dateStr}</span>
          <button className={`ag-copy ${copied ? "done" : ""}`} onClick={copyCard} title="この内容をコピー">
            {copied ? "✓ コピー" : "⧉ コピー"}
          </button>
        </div>
      </div>
      <div className="ag-kind-badge" style={{ background: cfg.bg, color: cfg.color }}>
        {cfg.emoji} {card.kind || ""}
      </div>
      <div className="ag-content">{card.content || ""}</div>

      <div className="ag-comments">
        {comments.length > 0 && (
          <div className="ag-cmt-list">
            {comments.map((c) => (
              <div key={c.id} className="ag-cmt">
                <span className="ag-cmt-ico" aria-hidden="true">💬</span>
                <span className="ag-cmt-txt">{c.who ? <b>{c.who}：</b> : null}{c.text}</span>
                <button className="ag-cmt-del" onClick={() => onDelComment(c.id)} aria-label="コメント削除">×</button>
              </div>
            ))}
          </div>
        )}
        <div className="ag-cmt-form">
          <input className="ag-cmt-name" placeholder="名前(任意)" value={who} onChange={(e) => setWho(e.target.value)} />
          <input className="ag-cmt-input" placeholder="コメントを追加…" value={text}
                 onChange={(e) => setText(e.target.value)}
                 onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
          <button className="ag-cmt-add" onClick={submit} disabled={!text.trim()}>追加</button>
        </div>
      </div>
    </div>
  );
};

// ── Card list with filters ────────────────────────────
const CardList = ({ data, commentsByKey = {}, onAddComment, onDelComment }) => {
  const [activeStore, setActiveStore] = React.useState("all");
  const [activeKind,  setActiveKind]  = React.useState("all");
  const [search, setSearch]           = React.useState("");

  const stores = React.useMemo(() => [...new Set(data.map(d => d.store).filter(Boolean))].sort(), [data]);
  const kinds  = React.useMemo(() => [...new Set(data.map(d => d.kind).filter(Boolean))].sort(),  [data]);

  const storeColorMap = React.useMemo(() => {
    const map = {};
    stores.forEach((s, i) => { map[s] = STORE_COLORS[i % STORE_COLORS.length]; });
    return map;
  }, [stores]);

  const filtered = data.filter(d => {
    const storeOk  = activeStore === "all" || d.store === activeStore;
    const kindOk   = activeKind  === "all" || d.kind  === activeKind;
    const searchOk = !search || (d.store + d.kind + d.content).toLowerCase().includes(search.toLowerCase());
    return storeOk && kindOk && searchOk;
  }).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const Pill = ({ label, active, onClick }) => (
    <button className={`ag-pill ${active ? "active" : ""}`} onClick={onClick}>{label}</button>
  );

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <input
          type="text" value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="内容・店舗で検索..."
          className="input" style={{ width: 200, fontSize: 12, padding: "7px 12px" }}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Pill label="全店舗" active={activeStore === "all"} onClick={() => setActiveStore("all")} />
          {stores.map(s => <Pill key={s} label={s} active={activeStore === s} onClick={() => setActiveStore(s)} />)}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Pill label="全種別" active={activeKind === "all"} onClick={() => setActiveKind("all")} />
          {kinds.map(k => {
            const cfg = kindCfg(k);
            return <Pill key={k} label={`${cfg.emoji} ${k}`} active={activeKind === k} onClick={() => setActiveKind(k)} />;
          })}
        </div>
        <span style={{ fontSize: 11, color: "var(--ink-mute)", marginLeft: "auto" }}>{filtered.length} 件</span>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--ink-mute)", fontSize: 13 }}>該当するカードがありません</div>
      ) : (
        <div className="ag-card-grid">
          {filtered.map((card, i) => {
            const ck = cardKeyOf(card);
            return (
              <ThankCard key={ck + "_" + i} card={card} storeColorMap={storeColorMap}
                comments={commentsByKey[ck] || []}
                onAddComment={(c) => onAddComment(ck, c)}
                onDelComment={onDelComment} />
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── AI Report (clipboard方式) ─────────────────────────
const ArigatouAiReport = ({ data }) => {
  const [reportType, setReportType] = React.useState("summary");
  const [output, setOutput]         = React.useState(null);
  const [loading, setLoading]       = React.useState(false);

  const TYPES = [
    { id: "summary",  label: "📊 月次まとめ" },
    { id: "followup", label: "⚠️ フォロー確認" },
    { id: "trend",    label: "📈 トレンド分析" },
    { id: "praise",   label: "🏆 表彰候補" },
  ];

  const PROMPTS = {
    summary:  "以下のありがとうカードデータをもとに、月次レポートを日本語で作成してください。全体の傾向・店舗別の特徴・種別ごとの傾向・良かった点のまとめを箇条書きでわかりやすくまとめてください。",
    followup: "以下のありがとうカードデータの中から、マネージャーがフォローすべき内容や注意が必要な状況があれば指摘してください。特に業務上の課題やサポートが必要そうな従業員・店舗があれば教えてください。",
    trend:    "以下のありがとうカードデータからトレンドを分析してください。どの店舗が活発か・どの種別が多いか・今後改善できる点はあるか、わかりやすく日本語でまとめてください。",
    praise:   "以下のありがとうカードデータから、特に表彰・感謝すべき店舗や行動を選んでください。理由も含めて3〜5件、日本語で紹介してください。",
  };

  const generate = async () => {
    if (!data.length) { setOutput({ type: "error", text: "先にデータを読み込んでください。" }); return; }
    setLoading(true);
    const summary = data.map(d => `【${d.store}】種別:${d.kind} 内容:${d.content}`).join("\n");
    const prompt = PROMPTS[reportType] + "\n\n=== データ ===\n" + summary;
    try {
      await navigator.clipboard.writeText(prompt);
      setOutput({ type: "success" });
    } catch {
      setOutput({ type: "manual", prompt });
    }
    setLoading(false);
  };

  return (
    <div className="card">
      <div className="card-head">
        <h3 className="card-title">
          🤖 AIレポート
          <span style={{ marginLeft: 8, background: "linear-gradient(135deg, var(--accent), #EA4335)", color: "white", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>Claude AI</span>
        </h3>
      </div>

      {/* Type selector */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {TYPES.map(t => (
          <button key={t.id}
                  onClick={() => setReportType(t.id)}
                  className={`ag-pill ${reportType === t.id ? "active" : ""}`}>
            {t.label}
          </button>
        ))}
      </div>

      <button className="btn btn-primary" onClick={generate} disabled={loading} style={{ marginBottom: 14 }}>
        {loading ? "⏳ 準備中..." : "✨ レポートを作成"}
      </button>

      {!output && (
        <div style={{ background: "var(--card-2)", border: "1px solid var(--line)", borderRadius: 12, padding: 18, color: "var(--ink-mute)", fontSize: 13, textAlign: "center" }}>
          「レポートを作成」ボタンを押すと、Claudeが分析用プロンプトを生成してコピーします。
        </div>
      )}

      {output?.type === "success" && (
        <div style={{ background: "var(--card-2)", border: "1px solid var(--line)", borderRadius: 12, padding: 18, lineHeight: 1.9 }}>
          <div style={{ fontWeight: 700, color: "var(--accent)", marginBottom: 8 }}>✅ プロンプトをコピーしました！</div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.9 }}>
            <strong style={{ color: "var(--ink)" }}>あと2ステップで完成です：</strong><br/>
            ① 下のボタンを押して Claude.ai を開く<br/>
            ② 画面に貼り付ける（Ctrl+V）→ Enter を押す
          </div>
          <a href="https://claude.ai" target="_blank" rel="noopener"
             className="btn btn-primary" style={{ display: "inline-block", marginTop: 12, textDecoration: "none" }}>
            Claude.ai を開く →
          </a>
        </div>
      )}

      {output?.type === "manual" && (
        <div style={{ background: "var(--card-2)", border: "1px solid var(--line)", borderRadius: 12, padding: 18 }}>
          <div style={{ fontWeight: 700, color: "var(--accent)", marginBottom: 8 }}>以下をコピーして Claude.ai に貼り付けてください：</div>
          <textarea readOnly value={output.prompt} className="input" style={{ width: "100%", height: 120, fontSize: 11, fontFamily: "ui-monospace, monospace", resize: "vertical" }}/>
          <a href="https://claude.ai" target="_blank" rel="noopener"
             className="btn btn-primary" style={{ display: "inline-block", marginTop: 10, textDecoration: "none" }}>
            Claude.ai を開く →
          </a>
        </div>
      )}

      {output?.type === "error" && (
        <div style={{ color: "#dc2626", padding: 12, background: "rgba(239,68,68,0.06)", borderRadius: 10, fontSize: 13 }}>{output.text}</div>
      )}
    </div>
  );
};

// ── Settings modal ────────────────────────────────────
const ArigatouSettings = ({ open, settings, onSave, onClose, onSyncNow, lastSync, lastError, syncing }) => {
  const [url, setUrl] = React.useState(settings.url || "");
  const [interval, setInterval_] = React.useState(settings.intervalMin || 30);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>同期設定</h2>
            <div className="sub">GAS エンドポイントから定期取得</div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="field full">
              <label className="field-label">GAS Web App URL</label>
              <input className="input" placeholder="https://script.google.com/macros/s/.../exec"
                     value={url} onChange={e => setUrl(e.target.value)}/>
            </div>
            <div className="field full">
              <label className="field-label">自動更新間隔</label>
              <select className="select" value={interval} onChange={e => setInterval_(Number(e.target.value))}>
                <option value={30}>30秒ごと</option>
                <option value={60}>1分ごと</option>
                <option value={300}>5分ごと</option>
                <option value={1800}>30分ごと</option>
              </select>
            </div>
            <div className="field full">
              <button className="btn btn-ghost" style={{ width: "100%" }} onClick={onSyncNow} disabled={!url || syncing}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                     style={syncing ? { animation: "spin 1s linear infinite" } : null}>
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                {syncing ? "同期中..." : "今すぐ同期"}
              </button>
              <div style={{ fontSize: 11, color: "var(--ink-mute)", marginTop: 8, lineHeight: 1.6 }}>
                {lastSync ? `最終更新: ${new Date(lastSync).toLocaleString("ja-JP")}` : "未同期 ・ デモデータを表示中"}
                {lastError && <div style={{ color: "#dc2626", marginTop: 4 }}>⚠ {lastError}</div>}
              </div>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>キャンセル</button>
          <button className="btn btn-primary" onClick={() => { onSave({ url, intervalMin: interval }); onClose(); }}>保存</button>
        </div>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────
const ArigatouPage = () => {
  const [rows, setRows]       = useArigatouState("miwa.arigatou.v1", () => SEED_ARIGATOU);
  const [settings, setSettings] = useArigatouState("miwa.arigatou.settings.v1", () => ({ url: DEFAULT_ARIGATOU_GAS, intervalMin: 30 }));
  const [lastSync, setLastSync] = useArigatouState("miwa.arigatou.lastSync.v1", () => null);
  const [lastError, setLastError] = React.useState("");
  const [syncing, setSyncing]   = React.useState(false);
  const [dark, setDark]         = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [toast, setToast]       = React.useState("");

  // ── 個別カードコメント（全端末同期）──
  const COMMENT_SHEET = "ありがとうコメント";
  const cloudOn = React.useRef(typeof cloudEnabled === "function" && cloudEnabled()).current;
  const [comments, setComments] = useArigatouState("miwa.arigatou.comments.v1", () => []);

  React.useEffect(() => {
    if (!cloudOn) return;
    let cancelled = false;
    (async () => {
      const remote = await cloudGet(COMMENT_SHEET);
      if (cancelled || remote == null) return;
      setComments(remote.map((c) => ({ ...c, ts: Number(c.ts) || 0 })));
    })();
    return () => { cancelled = true; };
  }, [cloudOn]); // eslint-disable-line

  const commentsByKey = React.useMemo(() => {
    const m = {};
    comments.forEach((c) => { (m[c.cardKey] = m[c.cardKey] || []).push(c); });
    Object.values(m).forEach((a) => a.sort((x, y) => (x.ts || 0) - (y.ts || 0)));
    return m;
  }, [comments]);

  const addComment = (cardKey, c) => {
    const note = {
      id: "ac" + Date.now() + Math.random().toString(36).slice(2, 5),
      cardKey, who: c.who || "", text: c.text, ts: Date.now(),
    };
    setComments((prev) => [...prev, note]);
    if (cloudOn) cloudAdd(COMMENT_SHEET, note).then((r) => { if (!r.ok) setToast("⚠ コメントのクラウド保存に失敗"); });
  };
  const delComment = (id) => {
    setComments((prev) => prev.filter((x) => x.id !== id));
    if (cloudOn) cloudDelete(COMMENT_SHEET, id);
  };

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  const syncNow = React.useCallback(async () => {
    if (!settings.url) return;
    setSyncing(true);
    setLastError("");
    try {
      const res = await fetch(settings.url, { redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Invalid response format");
      setRows(data);
      setLastSync(Date.now());
      setToast(`${data.length} 件を同期しました`);
    } catch (e) {
      setLastError(e.message || String(e));
      setToast("同期に失敗しました");
    } finally {
      setSyncing(false);
    }
  }, [settings.url]);

  // Auto-sync
  React.useEffect(() => {
    if (!settings.url) return;
    const ms = (settings.intervalMin || 30) * 1000;
    const isStale = () => !lastSync || (Date.now() - lastSync) >= ms;
    if (isStale()) syncNow();
    const tick = setInterval(() => { if (isStale()) syncNow(); }, ms);
    return () => clearInterval(tick);
  }, [settings.url, settings.intervalMin, lastSync, syncNow]);

  const nextLabel = React.useMemo(() => {
    if (!settings.url) return "未設定";
    const ms = (settings.intervalMin || 30) * 1000;
    const next = (lastSync || 0) + ms;
    const diff = next - Date.now();
    if (diff <= 0) return "更新待機中…";
    const sec = Math.round(diff / 1000);
    if (sec < 60) return `次回 ${sec}秒後`;
    return `次回 ${Math.round(sec / 60)}分後`;
  }, [settings, lastSync]);

  const exportPDF = () => window.print();

  return (
    <div className="app">
      <div className="shell">
        <AppSidebar active="thanks" />
        <main className="main">
          {/* Header */}
          <div className="greet">
            <div>
              <h1>🙏 ありがとうカード</h1>
              <div className="sub">
                全 {rows.length} 件 ・ {lastSync ? `最終更新 ${new Date(lastSync).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}` : "未同期"} ・ {nextLabel}
              </div>
            </div>
            <div className="right">
              <button className="btn btn-ghost" onClick={syncNow} disabled={!settings.url || syncing}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                     style={syncing ? { animation: "spin 1s linear infinite" } : null}>
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                {syncing ? "同期中" : "更新"}
              </button>
              <button className="btn btn-ghost" onClick={exportPDF} title="PDF出力">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                PDF
              </button>
              <button className="btn btn-ghost" onClick={() => setShowSettings(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>
                </svg>
                設定
              </button>
            </div>
          </div>

          {/* KPI */}
          <ArigatouKpi data={rows} />

          {/* Charts row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="card">
              <div className="card-head">
                <h3 className="card-title">🏪 店舗別 登録数</h3>
                <span className="card-sub">{[...new Set(rows.map(d => d.store).filter(Boolean))].length}店舗</span>
              </div>
              <StoreBarChart data={rows} />
            </div>
            <div className="card">
              <div className="card-head">
                <h3 className="card-title">🏷 種別 内訳</h3>
                <span className="card-sub">{[...new Set(rows.map(d => d.kind).filter(Boolean))].length}種別</span>
              </div>
              <KindBreakdown data={rows} />
            </div>
          </div>

          {/* Card list */}
          <div className="card">
            <div className="card-head">
              <h3 className="card-title">📋 個別カード一覧</h3>
            </div>
            <CardList data={rows} commentsByKey={commentsByKey} onAddComment={addComment} onDelComment={delComment} />
          </div>

          {/* AI Report */}
          <ArigatouAiReport data={rows} />
        </main>
      </div>

      <ArigatouSettings
        open={showSettings}
        settings={settings}
        onSave={s => setSettings(s)}
        onClose={() => setShowSettings(false)}
        onSyncNow={syncNow}
        lastSync={lastSync}
        lastError={lastError}
        syncing={syncing}
      />

      {toast && <div className="toast" onClick={() => setToast("")}>{toast}</div>}
    </div>
  );
};

window.ArigatouPage = ArigatouPage;
