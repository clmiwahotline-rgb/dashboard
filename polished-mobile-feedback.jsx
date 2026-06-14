// モバイル版 ─ フィードバック（閲覧中心）
// データ: cloudGet("フィードバック") → localStorage miwa.feedback.v3
//   各行: { id, reportDate, factory, store, type, status, content, item, fileId, tagNo }
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MFB_KEY   = "miwa.feedback.v3";
const MFB_SHEET = "フィードバック";

const MFB_TYPE_COLORS = {
  "再洗い":    { bg: "#e8f0fe", color: "#1967d2" },
  "再乾燥":    { bg: "#e0f7fa", color: "#00747c" },
  "再プレス":  { bg: "#feefc3", color: "#9a6700" },
  "再シミ抜き": { bg: "#fce8e6", color: "#c5221f" },
  "再加工":    { bg: "#e6f4ea", color: "#1e8e3e" },
  "再包装":    { bg: "#f3e8fd", color: "#8430ce" },
  "その他":    { bg: "#f1f3f4", color: "#5f6368" },
};
const mfbTypeColor  = (t) => MFB_TYPE_COLORS[t] || { bg: "#fde7f3", color: "#b80672" };
const mfbFmt        = (s) => { if (!s) return ""; const [,m,d] = (s||"").split("-"); return `${parseInt(m)}/${parseInt(d)}`; };
const mfbDriveThumb = (id) => `https://lh3.googleusercontent.com/d/${id}=w400`;
const mfbDriveView  = (id) => `https://drive.google.com/file/d/${id}/view`;
// タグ番号を 0-000 形式にフォーマット
const mfbTagFmt = (n) => {
  if (!n) return null;
  const s = String(n).replace(/\D/g, "").padStart(4, "0");
  return s.length >= 4 ? s.slice(0, 1) + "-" + s.slice(-3) : null;
};
// クラウド生データのフィールド名ゆれを吸収。短小名とフォーム識キーの両方に対応
const mfbGetTag = (row) => {
  // GASは タグ列を 'tag' フィールドに格納
  const direct = row.tag || row.tagNo || row["タグ番号"] || row["番号"] || row["管理番号"] || row["受付番号"];
  if (direct) return direct;
  // Googleフォームの長い列名に対応（部分一致）
  const key = Object.keys(row).find(k => k.includes("商品のタグ") || k.includes("タグを教えて") || k.includes("タグNo"));
  return key ? row[key] : "";
};

// ── データフック ────────────────────────────────────
const useMFbData = () => {
  const cloudOn = typeof cloudEnabled === "function" && cloudEnabled();
  const [rows, setRows] = React.useState(() => {
    try { const s = localStorage.getItem(MFB_KEY); if (s) return JSON.parse(s); } catch (e) {}
    return [];
  });
  const [cloudState, setCloudState] = React.useState(cloudOn ? "loading" : "off");

  React.useEffect(() => {
    if (!cloudOn) return;
    let cancelled = false;
    (async () => {
      const remote = await cloudGet(MFB_SHEET);
      if (cancelled) return;
      if (remote == null) { setCloudState("error"); return; }
      if (remote.length) {
        setRows(remote);
        try { localStorage.setItem(MFB_KEY, JSON.stringify(remote)); } catch (e) {}
      }
      setCloudState("ok");
    })();
    const t = setInterval(async () => {
      const remote = await cloudGet(MFB_SHEET);
      if (remote && remote.length) { setRows(remote); }
    }, 30000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  return { rows, cloudOn, cloudState };
};

// ── フィードバックカード ────────────────────────────
const MFbCard = ({ row, onImg }) => {
  const tc = mfbTypeColor(row.type);
  const [expanded, setExpanded] = React.useState(false);
  const long = (row.content || "").length > 100;
  const tag = mfbTagFmt(mfbGetTag(row));
  return (
    <div className="mfb-card">
      <div className="mfb-card-head">
        {tag && <span className="mfb-tag">{tag}</span>}
        <span className="mfb-type-badge" style={{ background: tc.bg, color: tc.color }}>{row.type || "その他"}</span>
        {row.status && <span className="mfb-status">{row.status}</span>}
        <span className="mfb-date">{mfbFmt(row.reportDate)}</span>
      </div>
      <div className="mfb-meta">
        {row.store && <span className="mfb-store">{row.store}</span>}
        {row.factory && <span className="mfb-factory">{row.factory}</span>}
        {row.item && <span className="mfb-item">{row.item}</span>}
      </div>
      {row.content && (
        <div className={`mfb-content ${!expanded && long ? "clamp" : ""}`} onClick={() => long && setExpanded(v => !v)}>
          {row.content}
        </div>
      )}
      {long && <button className="m-board-more" onClick={() => setExpanded(v => !v)}>{expanded ? "閉じる" : "続きを読む"}</button>}
      {row.fileId && (
        <a className="mfb-photo-link" href={mfbDriveView(row.fileId)} target="_blank" rel="noreferrer"
           onClick={(e) => { e.preventDefault(); onImg(mfbDriveThumb(row.fileId)); }}>
          <img src={mfbDriveThumb(row.fileId)} alt="" referrerPolicy="no-referrer" />
        </a>
      )}
    </div>
  );
};

// ── メイン ─────────────────────────────────────────
const MFeedback = ({ registerHeader, registerFab }) => {
  const { rows, cloudOn, cloudState } = useMFbData();
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [lightbox, setLightbox] = React.useState(null);

  React.useEffect(() => {
    const sub = cloudOn
      ? (cloudState === "ok" ? "☁ クラウド同期済み" : cloudState === "loading" ? "☁ 同期中…" : "☁ オフライン")
      : "端末内データ";
    registerHeader && registerHeader({ title: "フィードバック", sub });
    registerFab && registerFab(null);
  }, [cloudState]);

  const sorted = [...rows].sort((a, b) => (b.reportDate || "").localeCompare(a.reportDate || ""));

  // 区分別集計
  const typeCounts = React.useMemo(() => {
    const m = {};
    rows.forEach((r) => { m[r.type || "その他"] = (m[r.type || "その他"] || 0) + 1; });
    return m;
  }, [rows]);

  const allTypes = Object.keys(MFB_TYPE_COLORS);
  // KPI: データのある上位2区分
  const activeTypes = allTypes.filter((t) => typeCounts[t] > 0);

  const filtered = typeFilter === "all" ? sorted : sorted.filter((r) => (r.type || "その他") === typeFilter);

  return (
    <div>
      {/* KPI */}
      <div className="m-sales-kpis" style={{ marginBottom: 14 }}>
        <div className="m-sales-kpi big">
          <div className="m-sales-kpi-label">フィードバック総数</div>
          <div className="m-sales-kpi-val">{rows.length}<span className="u">件</span></div>
        </div>
        {activeTypes.slice(0, 2).map((t) => {
          const tc = mfbTypeColor(t);
          return (
            <div key={t} className="m-sales-kpi" style={{ borderLeft: `3px solid ${tc.color}` }}>
              <div className="m-sales-kpi-label">{t}</div>
              <div className="m-sales-kpi-val" style={{ color: tc.color }}>{typeCounts[t]}<span className="u">件</span></div>
            </div>
          );
        })}
      </div>

      {/* 区分フィルタ：常に全7種表示 */}
      <div className="m-chips" style={{ marginBottom: 12 }}>
        <button className={`m-chip ${typeFilter === "all" ? "active" : ""}`} onClick={() => setTypeFilter("all")}>
          すべて<span className="m-pr-tabn">{rows.length}</span>
        </button>
        {allTypes.map((t) => {
          const n = typeCounts[t] || 0;
          const tc = mfbTypeColor(t);
          return (
            <button key={t} className={`m-chip ${typeFilter === t ? "active" : ""}`}
              onClick={() => setTypeFilter(t)}
              style={typeFilter === t ? {} : n === 0 ? { opacity: 0.4 } : { borderColor: tc.color + "44" }}>
              {t}{n > 0 && <span className="m-pr-tabn">{n}</span>}
            </button>
          );
        })}
      </div>

      {/* リスト */}
      {filtered.length === 0
        ? <div className="m-empty" style={{ marginTop: 24 }}>フィードバックがありません</div>
        : filtered.map((r, i) => <MFbCard key={r.id || i} row={r} onImg={setLightbox} />)
      }

      {lightbox && (
        <div className="m-lb" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" referrerPolicy="no-referrer" />
        </div>
      )}
      <div style={{ height: 16 }}></div>
    </div>
  );
};

window.MFeedback = MFeedback;
