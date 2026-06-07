// フィードバック報告 — adapted from feedback_report Google Apps Script dashboard

const STORES_FB = ["本店", "東川口店", "新田店", "西友蒲生伊原店", "草加西口店", "蒲生店", "東川口2号店", "モールプラザ草加", "マミー川口安行店"];
const FACTORIES = ["本工場", "草加工場", "東川口工場"];
const ITEMS = ["スーツ", "ワイシャツ", "ジャケット", "コート", "ブラウス", "ワンピース", "セーター", "スカート", "ダウン", "Tシャツ"];

// 対応区分（フォームの選択肢）— すべて異なる色
const TYPE_ORDER = ["再洗い", "再乾燥", "再プレス", "再シミ抜き", "再加工", "再包装", "その他"];
const TYPE_COLORS = {
  "再洗い":    { bg: "#e8f0fe", color: "#1967d2", dot: "#4285F4" }, // 青
  "再乾燥":    { bg: "#e0f7fa", color: "#00747c", dot: "#12b5cb" }, // シアン
  "再プレス":  { bg: "#feefc3", color: "#9a6700", dot: "#f9ab00" }, // 黄
  "再シミ抜き": { bg: "#fce8e6", color: "#c5221f", dot: "#ea4335" }, // 赤
  "再加工":    { bg: "#e6f4ea", color: "#1e8e3e", dot: "#34a853" }, // 緑
  "再包装":    { bg: "#f3e8fd", color: "#8430ce", dot: "#a142f4" }, // 紫
  "その他":    { bg: "#f1f3f4", color: "#5f6368", dot: "#9aa0a6" }, // グレー
};
const typeColor = (t) => TYPE_COLORS[t] || { bg: "#fde7f3", color: "#b80672", dot: "#e8388a" };

const SEED_FEEDBACK = [];

// Color hash for placeholder photo backgrounds
const ITEM_EMOJI = {
  "スーツ": "🕴️", "ワイシャツ": "👔", "ジャケット": "🧥", "コート": "🧥",
  "ブラウス": "👚", "ワンピース": "👗", "セーター": "🧶", "スカート": "👗",
  "ダウン": "🧥", "Tシャツ": "👕",
};

const fmtFbDate = (s) => {
  if (!s) return "";
  const [, m, d] = s.split("-");
  return `${parseInt(m)}/${parseInt(d)}`;
};

// Useful: localStorage helper
const useFbState = (key, initial) => {
  const [v, setV] = React.useState(() => {
    try {
      const s = localStorage.getItem(key);
      if (s) return JSON.parse(s);
    } catch {}
    return typeof initial === "function" ? initial() : initial;
  });
  React.useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }, [key, v]);
  return [v, setV];
};

// ── KPI cards ──────────────────────────────────────────
const FbKpiRow = ({ rows }) => {
  const total = rows.length;
  const counts = {};
  rows.forEach((r) => { counts[r.type] = (counts[r.type] || 0) + 1; });
  const known = TYPE_ORDER.filter((t) => t !== "その他");
  const extras = Object.keys(counts).filter((t) => t && !TYPE_ORDER.includes(t));
  const types = [...known, ...extras, "その他"];

  return (
    <div className="fb-kpi-row">
      <div className="kpi" style={{ borderTop: "3px solid var(--accent)", borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
        <div className="kpi-label"><span className="kpi-dot" style={{ background: "var(--accent)" }}></span>今月の件数</div>
        <div className="kpi-value" style={{ color: "var(--accent)", fontSize: 32 }}>
          {total}<span className="kpi-unit" style={{ color: "var(--ink-mute)" }}> 件</span>
        </div>
        <div className="kpi-delta" style={{ color: "var(--ink-mute)" }}>全店舗・全工場の合計</div>
      </div>
      <div className="kpi" style={{ justifyContent: "center" }}>
        <div className="kpi-label" style={{ marginBottom: 12 }}>対応区分の内訳</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {types.map((t) => {
            const c = typeColor(t);
            const n = counts[t] || 0;
            return (
              <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, background: c.bg, color: c.color, fontSize: 12.5, fontWeight: 700, opacity: n ? 1 : 0.4 }}>
                <span style={{ width: 9, height: 9, borderRadius: 999, background: c.dot }}></span>
                {t}<span style={{ fontVariantNumeric: "tabular-nums", marginLeft: 2 }}>{n}</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Photo / placeholder ───────────────────────────────
const FbPhoto = ({ fileId, item }) => {
  const [srcIdx, setSrcIdx] = React.useState(0);
  const raw = String(fileId || "").trim();
  // ドライブURL / 画像直URL / ID のいずれも受け付ける
  const driveMatch = raw.match(/\/d\/([A-Za-z0-9_-]{20,})/) || raw.match(/[?&]id=([A-Za-z0-9_-]{20,})/);
  const driveId = driveMatch ? driveMatch[1] : (/^[A-Za-z0-9_-]{20,}$/.test(raw) ? raw : "");
  const isHttpImg = /^https?:\/\//.test(raw) && !driveId;
  const has = raw.length > 0;
  if (!has) {
    return (
      <div className="fb-photo fb-photo-placeholder">
        <span style={{ fontSize: 48 }}>{ITEM_EMOJI[item] || "🧺"}</span>
        <span style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 4 }}>{item}</span>
      </div>
    );
  }
  // Google Drive / Forms アップロードは複数のサムネイルURLを順に試す
  // iOS Safari はサードパーティCookieをブロックするため lh3.googleusercontent.com を先に試す
  const candidates = driveId
    ? [
        `https://lh3.googleusercontent.com/d/${driveId}=w600`,
        `https://drive.google.com/thumbnail?id=${driveId}&sz=w600`,
        `https://drive.google.com/uc?export=view&id=${driveId}`,
      ]
    : isHttpImg
      ? [raw]
      : [`https://picsum.photos/seed/${encodeURIComponent(raw)}/600/360`];
  const src = candidates[srcIdx];
  const href = driveId ? `https://drive.google.com/file/d/${driveId}/view` : (isHttpImg ? raw : src);

  if (srcIdx >= candidates.length) {
    // All sources failed — placeholder
    return (
      <div className="fb-photo fb-photo-placeholder">
        <span style={{ fontSize: 36 }}>🖼️</span>
        <span style={{ fontSize: 11, color: "var(--ink-mute)", marginTop: 4 }}>
          画像を読み込めません
        </span>
        <a href={href} target="_blank" rel="noopener" style={{ fontSize: 10, color: "var(--accent-ink)", marginTop: 4 }}>
          Drive で開く →
        </a>
      </div>
    );
  }

  return (
    <a className="fb-photo" href={href} target="_blank" rel="noopener" style={{ position: "relative", display: "block" }}>
      <img
        src={src}
        alt={item}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setSrcIdx(srcIdx + 1)}
        style={{ width: "100%", height: 200, objectFit: "cover", display: "block", background: "var(--card-2)" }}
      />
      <span style={{
        position: "absolute", bottom: 8, right: 10,
        background: "rgba(0,0,0,0.55)", color: "white", padding: "3px 9px",
        borderRadius: 999, fontSize: 10.5, fontWeight: 600,
        display: "inline-flex", alignItems: "center", gap: 4,
      }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
        拡大
      </span>
    </a>
  );
};

// ── Card ───────────────────────────────────────────────
const FbCard = ({ fb, onEdit, onDelete }) => {
  const sc = typeColor(fb.type);

  return (
    <div className="card fb-card-root">
      <FbPhoto fileId={fb.fileId} item={fb.item} />
      <div className="fb-body">
        <div className="fb-meta">
          <StoreTag name={fb.store} />
          <span className="fb-date">{fmtFbDate(fb.reportDate)}</span>
        </div>
        <div className="fb-content">{fb.content}</div>
        <div className="fb-info">
          <div><strong>原因:</strong> {fb.cause || "—"}</div>
          <div><strong>改善:</strong> {fb.improvement || "—"}</div>
        </div>
        <div className="fb-footer">
          <span className="fb-factory">🏭 {fb.factory}</span>
          <span className="fb-status" style={{ background: sc.bg, color: sc.color }}>{fb.type || "—"}</span>
        </div>
        <div className="fb-actions">
          <button className="row-action" title="編集" onClick={() => onEdit(fb)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
            </svg>
          </button>
          <button className="row-action danger" title="削除" onClick={() => onDelete(fb.id)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Add/Edit form modal ───────────────────────────────
const Modal = ({ title, sub, onClose, children, footer }) => (
  <div className="modal-backdrop" onClick={onClose}>
    <div className="modal wide" onClick={(e) => e.stopPropagation()}>
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

const FbForm = ({ initial, onSave, onClose }) => {
  const [form, setForm] = React.useState(() => initial || {
    reportDate: new Date().toISOString().slice(0, 10),
    factory: FACTORIES[0],
    store: STORES_FB[0],
    item: ITEMS[0],
    type: "再プレス",
    content: "",
    cause: "",
    improvement: "",
    fileId: "",
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <Modal
      title={initial?.id ? "フィードバックを編集" : "フィードバックを追加"}
      sub="店舗から報告された案件を記録します"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>キャンセル</button>
          <button className="btn btn-primary" onClick={() => onSave(form)} disabled={!form.content}>
            {initial?.id ? "更新する" : "追加する"}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field">
          <label className="field-label">受付日</label>
          <input className="input" type="date" value={form.reportDate} onChange={set("reportDate")}/>
        </div>
        <div className="field">
          <label className="field-label">対応区分</label>
          <select className="select" value={form.type} onChange={set("type")}>
            {TYPE_ORDER.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label">店舗</label>
          <select className="select" value={form.store} onChange={set("store")}>
            {STORES_FB.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label">工場</label>
          <select className="select" value={form.factory} onChange={set("factory")}>
            {FACTORIES.map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div className="field full">
          <label className="field-label">品目</label>
          <select className="select" value={form.item} onChange={set("item")}>
            {ITEMS.map((it) => <option key={it}>{it}</option>)}
          </select>
        </div>
        <div className="field full">
          <label className="field-label">内容</label>
          <textarea className="input" rows={3} placeholder="どんな状況でフィードバックを受けたか"
                    value={form.content} onChange={set("content")}/>
        </div>
        <div className="field full">
          <label className="field-label">原因</label>
          <textarea className="input" rows={2} placeholder="調査結果・推定原因"
                    value={form.cause} onChange={set("cause")}/>
        </div>
        <div className="field full">
          <label className="field-label">改善策</label>
          <textarea className="input" rows={2} placeholder="再発防止・実施内容"
                    value={form.improvement} onChange={set("improvement")}/>
        </div>
        <div className="field full">
          <label className="field-label">写真ファイル ID（任意）</label>
          <input className="input" placeholder="Google Drive ID、または https://drive.google.com/file/d/【ID】/view から抽出"
                 value={form.fileId} onChange={(e) => {
                   // Auto-extract ID from a pasted Drive URL
                   const v = e.target.value;
                   const m = v.match(/\/d\/([A-Za-z0-9_-]{20,})/) ||
                             v.match(/[?&]id=([A-Za-z0-9_-]{20,})/);
                   setForm({ ...form, fileId: m ? m[1] : v });
                 }}/>
          <div style={{ fontSize: 10.5, color: "var(--ink-mute)", marginTop: 4 }}>
            ※ Google Drive の共有設定が「リンクを知っている全員」になっている必要があります
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ── Toast ──────────────────────────────────────────────
const Toast = ({ msg, onDone }) => {
  React.useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [msg]);
  return msg ? <div className="toast">{msg}</div> : null;
};

// ── Google Sheet sync ──────────────────────────────────
// User publishes spreadsheet to web as CSV → URL ends with /pub?output=csv
// or uses gviz/tq?tqx=out:csv (works with private but shared sheets).
// We accept either, and a regular /edit URL — we'll try to construct the
// CSV export URL from a sheet ID / gid.

const toCsvUrl = (raw) => {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (/output=csv|tqx=out:csv|format=csv/.test(trimmed)) return trimmed;
  const m = trimmed.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]+)/);
  if (!m) return trimmed;
  const id = m[1];
  const gidMatch = trimmed.match(/[?#&]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : "0";
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid}`;
};

const parseCsv = (text) => {
  const rows = [];
  let row = [], cur = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else if (c === "\r") { /* skip */ }
      else cur += c;
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows;
};

const FB_HEADER_HINTS = {
  date:        ["タイムスタンプ", "timestamp", "日付", "受付日", "報告日"],
  factory:     ["工場"],
  store:       ["店舗"],
  item:        ["アイテム", "品目", "衣類", "商品のアイテム"],
  type:        ["種類", "対応", "区分", "ステータス", "再洗い", "再プレス"],
  fileId:      ["写真", "画像", "ファイル", "添付", "photo", "image"],
  cause:       ["原因"],
  improvement: ["改善", "対策"],
  content:     ["内容", "詳細", "状況"],
};

const matchHeader = (h) => {
  for (const [key, hints] of Object.entries(FB_HEADER_HINTS)) {
    if (hints.some((w) => h.includes(w))) return key;
  }
  return null;
};

const extractDriveId = (s) => {
  const v = String(s || "").trim();
  if (!v) return "";
  const m = v.match(/\/d\/([A-Za-z0-9_-]{20,})/) || v.match(/[?&]id=([A-Za-z0-9_-]{20,})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{20,}$/.test(v)) return v;
  return v;
};

const normalizeDate = (raw) => {
  if (!raw) return new Date().toISOString().slice(0, 10);
  const m = String(raw).match(/(\d{4})[\/\-年.](\d{1,2})[\/\-月.](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  const d = new Date(raw);
  if (!isNaN(d)) return d.toISOString().slice(0, 10);
  return raw;
};

const importSheetCsv = (text) => {
  const rows = parseCsv(text).filter((r) => r.some((c) => c && c.trim()));
  if (rows.length < 2) return { rows: [], errors: ["データ行がありません"] };
  const header = rows[0].map((h) => h.trim());
  const map = header.map(matchHeader);
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const o = { id: Date.now() + i + Math.random() };
    map.forEach((k, ci) => { if (k) o[k] = (r[ci] || "").trim(); });
    if (!o.content && !o.store && !o.factory) continue;
    o.reportDate = normalizeDate(o.date || o.reportDate);
    delete o.date;
    o.factory     = o.factory     || "";
    o.store       = o.store       || "";
    o.item        = o.item        || "";
    o.type        = o.type        || "再プレス";
    o.content     = o.content     || "";
    o.cause       = o.cause       || "";
    o.improvement = o.improvement || "";
    o.fileId      = extractDriveId(o.fileId);
    if (/再洗/.test(o.type))           o.type = "再洗い";
    else if (/再プレス/.test(o.type))  o.type = "再プレス";
    else if (/再加工|再仕上/.test(o.type)) o.type = "再加工";
    out.push(o);
  }
  return { rows: out, errors: [] };
};

// ── GAS(JSON) 取得 & マッピング ───────────────────────
// 工場報告と同じく、URL が GAS(/macros/) の場合は JSON を取得して取り込む。
const fbJsonpFetch = (url) => new Promise((resolve, reject) => {
  const cb = "__fbCb_" + Math.random().toString(36).slice(2);
  const sep = url.includes("?") ? "&" : "?";
  const s = document.createElement("script");
  const cleanup = () => { try { delete window[cb]; } catch {} s.remove(); clearTimeout(timer); };
  const timer = setTimeout(() => { cleanup(); reject(new Error("取得タイムアウト。GAS の公開範囲が「全員」か、URL が正しいかご確認ください")); }, 15000);
  window[cb] = (data) => { cleanup(); resolve(data); };
  s.onerror = () => { cleanup(); reject(new Error("接続できません。URL と公開設定をご確認ください")); };
  s.src = url + sep + "callback=" + cb;
  document.body.appendChild(s);
});

const mapFbObject = (obj, i) => {
  const o = { id: Date.now() + i + Math.random() };
  for (const [k, v] of Object.entries(obj)) {
    const key = matchHeader(k);
    if (key && (o[key] === undefined || o[key] === "")) o[key] = v;
  }
  if (!o.content && !o.store && !o.factory && !o.fileId) return null;
  o.reportDate = normalizeDate(o.date || o.reportDate);
  delete o.date;
  o.factory = o.factory || ""; o.store = o.store || ""; o.item = o.item || "";
  o.type = o.type || "再プレス"; o.content = o.content || "";
  o.cause = o.cause || ""; o.improvement = o.improvement || "";
  o.fileId = extractDriveId(o.fileId);
  if (/再洗/.test(o.type)) o.type = "再洗い";
  else if (/再プレス/.test(o.type)) o.type = "再プレス";
  else if (/再加工|再仕上/.test(o.type)) o.type = "再加工";
  return o;
};
const importGasJson = (raw) => {
  if (!Array.isArray(raw)) return { rows: [], errors: ["応答が配列ではありません"], columns: [] };
  const columns = raw.length ? Object.keys(raw[0]) : [];
  const rows = raw.map((r, i) => mapFbObject(r, i)).filter(Boolean);
  return { rows, errors: [], columns };
};

// ── Settings modal ─────────────────────────────────────
const FbSettingsModal = ({ settings, onSave, onClose, onSyncNow, lastSync, lastError, syncing, diag }) => {
  const [url, setUrl] = React.useState(settings.url || "");
  const [autoSync, setAutoSync] = React.useState(settings.autoSync !== false);
  const [intervalH, setIntervalH] = React.useState(settings.intervalH || 1);

  return (
    <Modal
      title="同期設定"
      sub="Google スプレッドシートと自動同期 ・ 定期的に取得します"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>キャンセル</button>
          <button className="btn btn-primary" onClick={() => onSave({ url, autoSync, intervalH: Number(intervalH) || 1 })}>保存</button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field full">
          <label className="field-label">スプレッドシート URL</label>
          <input className="input" placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=..."
                 value={url} onChange={(e) => setUrl(e.target.value)}/>
          <div style={{ fontSize: 10.5, color: "var(--ink-mute)", marginTop: 4, lineHeight: 1.6 }}>
            <strong>事前準備:</strong><br/>
            1. スプレッドシートを開く → 共有 → 「リンクを知っている全員 ・ 閲覧者」<br/>
            2. このフォームに URL を貼って保存 ・ 通常の編集 URL のままで OK<br/>
            3. GAS（/macros/...）の JSON エンドポイント URL もそのまま貼れます<br/>
            ※ 写真を出すには、写真列に Drive の共有URL（またはファイルID）が入っている必要があります
          </div>
        </div>
        <div className="field">
          <label className="field-label">自動更新</label>
          <select className="select" value={autoSync ? "on" : "off"} onChange={(e) => setAutoSync(e.target.value === "on")}>
            <option value="on">有効</option>
            <option value="off">無効</option>
          </select>
        </div>
        <div className="field">
          <label className="field-label">更新間隔</label>
          <select className="select" value={String(intervalH)} onChange={(e) => setIntervalH(e.target.value)}>
            <option value="0.25">15分ごと</option>
            <option value="0.5">30分ごと</option>
            <option value="1">1時間ごと</option>
            <option value="2">2時間ごと</option>
            <option value="6">6時間ごと</option>
            <option value="12">12時間ごと</option>
            <option value="24">24時間ごと</option>
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
            {lastSync ? `最終更新: ${new Date(lastSync).toLocaleString("ja-JP")}` : "未同期"}
            {lastError && <div style={{ color: "#dc2626", marginTop: 4 }}>⚠ {lastError}</div>}
          </div>
          {diag && diag.columns && (
            <details style={{ marginTop: 10, fontSize: 11, color: "var(--ink-mute)" }}>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                受信した列名（{diag.count} 件取得 ・ {diag.columns.length} 列）
              </summary>
              <div style={{ marginTop: 6, lineHeight: 1.7, maxHeight: 160, overflowY: "auto", background: "var(--bg-2)", borderRadius: 8, padding: "8px 10px" }}>
                {diag.columns.length === 0 ? "（0列）" : diag.columns.map((c, i) => (
                  <div key={i} style={{ fontFamily: "ui-monospace, monospace" }}>{i + 1}. {c}</div>
                ))}
              </div>
              <div style={{ marginTop: 6 }}>
                ※ 写真が出ない場合は、上記に「写真」「画像」「ファイル」を含む列があり、その値が Drive の共有URL（「リンクを知っている全員」）になっているかご確認ください。
              </div>
            </details>
          )}
        </div>
      </div>
    </Modal>
  );
};

// ── Main page ─────────────────────────────────────────
const FeedbackPage = () => {
  const [rows, setRows] = useFbState("miwa.feedback.v3", () => SEED_FEEDBACK);
  const [settings, setSettings] = useFbState("miwa.feedback.settings.v2", () => ({
    url: "", autoSync: true, intervalH: 1,
  }));
  const [lastSync, setLastSync] = useFbState("miwa.feedback.lastSync", () => null);
  const [lastError, setLastError] = React.useState("");
  const [diag, setDiag] = React.useState(null);
  const [syncing, setSyncing] = React.useState(false);

  const [filter, setFilter] = React.useState({ store: "", status: "", q: "" });
  const [editing, setEditing] = React.useState(null);
  const [showSettings, setShowSettings] = React.useState(false);
  const [toast, setToast] = React.useState("");
  const [dark, setDark] = React.useState(false);

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  // ── 共有クラウド（読み書き）─ 全端末で同じ最新を表示・入力も反映 ──
  const [cloudOn] = React.useState(() => typeof cloudEnabled === "function" && cloudEnabled());
  const [cloudState, setCloudState] = React.useState(cloudOn ? "loading" : "off"); // off|loading|ok|error
  React.useEffect(() => {
    if (!cloudOn) return;
    let cancelled = false;
    (async () => {
      const remote = await cloudGet("フィードバック");
      if (cancelled) return;
      if (remote == null) { setCloudState("error"); return; }
      if (remote.length) {
        setRows(remote);                       // クラウドが正：全端末で同じ
      } else if (rows.length) {
        await cloudReplaceAll("フィードバック", rows); // 初回：空シードをクラウドへ移行
      }
      setCloudState("ok");
      setLastSync(Date.now());
    })();
    return () => { cancelled = true; };
  }, [cloudOn]); // eslint-disable-line

  // クラウドから取り直す（手動更新）
  const cloudRefresh = React.useCallback(async () => {
    if (!cloudOn) return;
    setSyncing(true);
    const remote = await cloudGet("フィードバック");
    if (remote != null) { setRows(remote); setLastSync(Date.now()); setToast(`${remote.length} 件を取得しました`); }
    else setToast("取得に失敗しました");
    setSyncing(false);
  }, [cloudOn]);

  // Core sync function— GAS(JSON) と 公開CSV の両対応
  const syncNow = React.useCallback(async () => {
    if (!settings.url) return;
    setSyncing(true);
    setLastError("");
    try {
      const isGas = /script\.google\.com\/macros\//.test(settings.url);
      let parsed, errors, columns;
      if (isGas) {
        // GAS: まず fetch、ダメなら JSONP
        let raw;
        try {
          const res = await fetch(settings.url, { redirect: "follow" });
          if (!res.ok) throw new Error("HTTP " + res.status);
          raw = await res.json();
        } catch (_) {
          raw = await fbJsonpFetch(settings.url);
        }
        if (raw && raw.error) throw new Error(raw.message || "GAS error");
        ({ rows: parsed, errors, columns } = importGasJson(raw));
      } else {
        const url = toCsvUrl(settings.url);
        const res = await fetch(url, { redirect: "follow" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const csvRows = parseCsv(text).filter((r) => r.some((c) => c && c.trim()));
        columns = csvRows.length ? csvRows[0].map((h) => h.trim()) : [];
        ({ rows: parsed, errors } = importSheetCsv(text));
      }
      setDiag({ columns: columns || [], count: parsed ? parsed.length : 0 });
      if (errors && errors.length) throw new Error(errors.join(" / "));
      if (!parsed || !parsed.length) throw new Error("データ行が見つかりません。設定画面の「受信した列名」と公開設定をご確認ください");
      setRows(parsed);
      setLastSync(Date.now());
      setToast(`${parsed.length} 件を同期しました`);
    } catch (e) {
      setLastError(e.message || String(e));
      setToast("同期に失敗しました");
    } finally {
      setSyncing(false);
    }
  }, [settings.url]);

  // Stale-check + interval trigger
  React.useEffect(() => {
    if (!settings.url || !settings.autoSync) return;
    const intervalMs = (Number(settings.intervalH) || 1) * 60 * 60 * 1000;
    const isStale = () => !lastSync || (Date.now() - lastSync) >= intervalMs;
    // Catch-up on load
    if (isStale()) syncNow();
    // Periodic trigger — check every minute
    const tick = setInterval(() => { if (isStale()) syncNow(); }, 60_000);
    return () => clearInterval(tick);
  }, [settings.url, settings.autoSync, settings.intervalH, lastSync, syncNow]);

  // "Next sync at" — for display
  const nextSyncLabel = React.useMemo(() => {
    if (!settings.url) return "未設定";
    if (!settings.autoSync) return "自動同期 OFF";
    const intervalMs = (Number(settings.intervalH) || 1) * 60 * 60 * 1000;
    const next = (lastSync || 0) + intervalMs;
    const ms = next - Date.now();
    if (ms <= 0) return "更新待機中…";
    const min = Math.round(ms / 60000);
    if (min < 60) return `次回 ${min}分後`;
    const h = Math.floor(min / 60), m = min % 60;
    return `次回 ${h}時間${m ? `${m}分` : ""}後`;
  }, [settings, lastSync]);

  const filtered = React.useMemo(() => rows.filter((r) =>
    (!filter.store || r.store === filter.store) &&
    (!filter.status || r.type === filter.status) &&
    (!filter.q || `${r.store}${r.factory}${r.content}${r.cause}${r.improvement}${r.item}`.includes(filter.q))
  ).sort((a, b) => {
    const d = (b.reportDate || "").localeCompare(a.reportDate || "");
    if (d !== 0) return d;               // 受付日が新しい順
    return (Number(b.id) || 0) - (Number(a.id) || 0); // 同日は登録が新しい順
  }), [rows, filter]);

  const saveRow = (data) => {
    if (data.id) {
      setRows(rows.map((r) => r.id === data.id ? data : r));
      setToast("フィードバックを更新しました");
      if (cloudOn) cloudUpdate("フィードバック", data.id, data).then((res) => {
        if (!res.ok) setToast("⚠ クラウド保存に失敗（端末内には保存済み）");
      });
    } else {
      const id = Date.now();
      const row = { ...data, id };
      setRows([row, ...rows]);
      setToast("フィードバックを追加しました");
      if (cloudOn) cloudAdd("フィードバック", row).then((res) => {
        if (!res.ok) setToast("⚠ クラウド保存に失敗（端末内には保存済み）");
      });
    }
    setEditing(null);
  };

  const deleteRow = (id) => {
    if (!confirm("このフィードバックを削除しますか?")) return;
    setRows(rows.filter((r) => r.id !== id));
    setToast("削除しました");
    if (cloudOn) cloudDelete("フィードバック", id).then((res) => {
      if (!res.ok) setToast("⚠ クラウド削除に失敗（端末内では削除済み）");
    });
  };

  const saveSettings = (s) => {
    setSettings(s);
    setShowSettings(false);
    setToast("設定を保存しました");
  };

  return (
    <div className="app">
      <div className="shell">
        <AppSidebar active="feedback" />
        <main className="main">
          {/* Greeting */}
          <div className="greet">
            <div>
              <h1>💬 フィードバック報告</h1>
              <div className="sub">
                全 {rows.length} 件 ・ {cloudOn
                  ? (cloudState === "ok" ? "☁ クラウド同期中" : cloudState === "loading" ? "☁ 接続中…" : "☁ 接続エラー（端末内データ表示）")
                  : (lastSync ? `最終更新 ${new Date(lastSync).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}` : "未同期")}
                {lastSync ? ` ・ 最終更新 ${new Date(lastSync).toLocaleString("ja-JP", { hour: "2-digit", minute: "2-digit" })}` : ""}
              </div>
            </div>
            <div className="right">
              <button className="btn btn-ghost" onClick={cloudOn ? cloudRefresh : syncNow} disabled={(cloudOn ? false : !settings.url) || syncing} title={cloudOn ? "クラウドから取り直す" : "今すぐスプレッドシートから取得"}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                     style={syncing ? { animation: "spin 1s linear infinite" } : null}>
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                {syncing ? "同期中" : "同期"}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowSettings(true)} title="同期設定">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>
                </svg>
                設定
              </button>
              <button className="btn btn-primary" onClick={() => setEditing({})}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 5v14M5 12h14"/></svg>
                新規フィードバック
              </button>
            </div>
          </div>

          {/* KPI */}
          <FbKpiRow rows={filtered} />

          {/* Filter bar */}
          <div className="card" style={{ padding: 16 }}>
            <div className="filter-bar">
              <div className="field">
                <label className="field-label">店舗</label>
                <select className="select" style={{ width: 180 }}
                        value={filter.store} onChange={(e) => setFilter({ ...filter, store: e.target.value })}>
                  <option value="">すべて</option>
                  {STORES_FB.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">対応区分</label>
                <select className="select" style={{ width: 160 }}
                        value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
                  <option value="">すべて</option>
                  {TYPE_ORDER.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="field" style={{ flex: 1, minWidth: 200 }}>
                <label className="field-label">キーワード</label>
                <input className="input" placeholder="店舗・工場・内容で検索"
                       value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })}/>
              </div>
            </div>
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--ink-mute)" }}>
              該当するフィードバックがありません
            </div>
          ) : (
            <div className="fb-grid">
              {filtered.map((fb) => (
                <FbCard key={fb.id} fb={fb} onEdit={(r) => setEditing(r)} onDelete={deleteRow}/>
              ))}
            </div>
          )}
        </main>
      </div>

      {editing !== null && (
        <FbForm
          initial={editing.id ? editing : null}
          onSave={saveRow}
          onClose={() => setEditing(null)}
        />
      )}
      {showSettings && (
        <FbSettingsModal
          settings={settings}
          onSave={saveSettings}
          onClose={() => setShowSettings(false)}
          onSyncNow={syncNow}
          lastSync={lastSync}
          lastError={lastError}
          syncing={syncing}
          diag={diag}
        />
      )}

      <Toast msg={toast} onDone={() => setToast("")}/>
    </div>
  );
};

window.FeedbackPage = FeedbackPage;
