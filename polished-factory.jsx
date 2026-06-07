// 工場報告 — Main page component

// ── 回答スプレッドシート(CSV)を位置ベースで取り込む ───────────────
// フォームで八潮/東川口の質問名が同一でも、CSV は重複列を別セルとして保持するため、
// 出現順（1つ目=八潮ブロック / 2つ目=東川口ブロック）で正しく分離できる。
// （GAS の JSON では同名列が後勝ちで衝突し八潮の数値が失われるため、CSV 経路を用意）
const facCsvUrl = (raw) => {
  if (!raw) return "";
  const t = raw.trim();
  if (/output=csv|tqx=out:csv|format=csv/.test(t)) return t;
  const m = t.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]+)/);
  if (!m) return t;
  const gid = (t.match(/[?#&]gid=(\d+)/) || [])[1] || "0";
  return `https://docs.google.com/spreadsheets/d/${m[1]}/gviz/tq?tqx=out:csv&gid=${gid}`;
};
const facParseCsv = (text) => {
  const rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i+1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else if (c === "\r") { /* skip */ }
    else cur += c;
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows;
};
const facNum = (v) => { if (v == null || v === "") return 0; const n = parseFloat(String(v).replace(/,/g, "")); return isNaN(n) ? 0 : n; };
const importFactoryCsv = (text) => {
  const rows = facParseCsv(text).filter(r => r.some(c => c && c.trim()));
  if (rows.length < 2) return { rows: [], columns: [] };
  const H = rows[0].map(h => (h || "").replace(/\s+/g, " ").trim());
  const idxAll = (kw) => H.map((h, i) => h.includes(kw) ? i : -1).filter(i => i >= 0);
  const first = (a) => a.length ? a[0] : -1;
  const dateI = first(idxAll("報告日").concat(idxAll("日付")));
  const facI  = first(idxAll("どちらの工場").concat(idxAll("工場")));
  const tsI   = first(idxAll("タイムスタンプ"));
  const memI  = idxAll("出勤したメンバー").length ? idxAll("出勤したメンバー") : idxAll("メンバー");
  const norI  = idxAll("通常ロット");
  const extI  = idxAll("ロット外");
  const advI  = idxAll("先付け");
  const stoI  = idxAll("保管処理");
  const hrI   = idxAll("合計時間").length ? idxAll("合計時間") : idxAll("時間");
  const noteI = idxAll("自由報告").length ? idxAll("自由報告") : idxAll("その他");
  const out = [];
  for (let ri = 1; ri < rows.length; ri++) {
    const r = rows[ri];
    const cell = (i) => (i >= 0 && i < r.length) ? r[i] : "";
    const factory = String(cell(facI) || "").trim();
    if (!factory) continue;
    const isY = factory.includes("八潮") || factory.includes("ドライ");
    const b = isY ? 0 : 1;                       // 八潮=1つ目 / 東川口=2つ目のブロック
    const at = (arr) => arr.length ? cell(arr[Math.min(b, arr.length - 1)]) : "";
    let dateRaw = cell(dateI), date = "";
    if (dateRaw) { const d = new Date(dateRaw); if (!isNaN(d)) { const j = new Date(d.getTime() + 9*3600*1000); date = j.toISOString().slice(0,10); } else date = String(dateRaw).slice(0,10); }
    if (!date) continue;
    let ts = ""; const tsRaw = cell(tsI);
    if (tsRaw) { const d = new Date(tsRaw); if (!isNaN(d)) ts = d.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }); }
    out.push({
      timestamp: ts, date, factory, reportID: date + "_" + factory,
      members: String(at(memI) || ""),
      normalLot: facNum(at(norI)),
      extraLot:  facNum(at(extI)),
      advance:   facNum(at(advI)),
      storage:   isY ? facNum(at(stoI)) : null,
      hours:     facNum(at(hrI)),
      note:      String(at(noteI) || ""),
    });
  }
  return { rows: out, columns: H };
};

const useFbStateFactory = (key, initial) => {
  const [v, setV] = React.useState(() => {
    try { const s = localStorage.getItem(key); if (s) return JSON.parse(s); } catch {}
    return typeof initial === "function" ? initial() : initial;
  });
  React.useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }, [key, v]);
  return [v, setV];
};

// ── Settings modal ────────────────────────────────────
const FactorySettingsModal = ({ open, settings, onSave, onClose, onSyncNow, lastSync, lastError, syncing, diag }) => {
  const [url, setUrl] = React.useState(settings.url || "");
  const [autoSync, setAutoSync] = React.useState(settings.autoSync !== false);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>同期設定</h2>
            <div className="sub">GAS エンドポイントから 1 時間ごとに自動取得</div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="閉じる">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M6 6l12 12M18 6L6 18"/>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="field full">
              <label className="field-label">GAS Web App URL ／ 回答スプレッドシート URL</label>
              <input className="input" placeholder="https://script.google.com/.../exec または https://docs.google.com/spreadsheets/d/.../edit"
                     value={url} onChange={(e) => setUrl(e.target.value)}/>
              <div style={{ fontSize: 10.5, color: "var(--ink-mute)", marginTop: 6, lineHeight: 1.6 }}>
                <strong>八潮の数値が 0 になる場合（フォームの工場名区別が無い場合）:</strong><br/>
                回答スプレッドシートの URL を貼るのがおすすめです（出現順で八潮/東川口を正しく分離します）。<br/>
                1. 回答シートを開く → 共有 →「リンクを知っている全員 ・ 閲覧者」<br/>
                2. その URL をここに貼り付け（通常の編集 URL のままで OK）<br/>
                <span style={{ color: "var(--ink-faint)" }}>※ GAS の URL でも動きますが、同名列があると JSON 化で八潮の数値が失われます</span>
              </div>
            </div>
            <div className="field full">
              <label className="field-label">自動更新</label>
              <select className="select" value={autoSync ? "on" : "off"} onChange={(e) => setAutoSync(e.target.value === "on")}>
                <option value="on">1 時間ごとに自動更新</option>
                <option value="off">手動更新のみ</option>
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
              {diag && diag.columns && (
                <details style={{ marginTop: 10, fontSize: 11, color: "var(--ink-mute)" }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                    受信した列名（{diag.count} 行 ・ {diag.columns.length} 列）
                  </summary>
                  <div style={{ marginTop: 6, lineHeight: 1.7, maxHeight: 160, overflowY: "auto", background: "var(--bg-2)", borderRadius: 8, padding: "8px 10px" }}>
                    {diag.columns.length === 0 ? "（0列）" : diag.columns.map((c, i) => (
                      <div key={i} style={{ fontFamily: "ui-monospace, monospace" }}>{i + 1}. {c}</div>
                    ))}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    ※ 数字が 0 になる場合は、上記の列名に「通常ロット」「ロット外」「先付け」「合計時間」などが含まれているか、工場名列に「八潮」「東川口」があるかをご確認ください。
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>キャンセル</button>
          <button className="btn btn-primary" onClick={() => { onSave({ url, autoSync, intervalH: 1 }); onClose(); }}>保存</button>
        </div>
      </div>
    </div>
  );
};

// ── Edit modal ────────────────────────────────────────
const FactoryEditModal = ({ open, record, onSave, onClose }) => {
  const [form, setForm] = React.useState(record || {});

  React.useEffect(() => {
    setForm(record || {});
  }, [record]);

  if (!open || !record) return null;

  const isY = record.factory.includes("八潮");

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>📝 報告内容を修正</h2>
            <div className="sub">{record.date} ・ {record.factory}</div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="閉じる">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M6 6l12 12M18 6L6 18"/>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="field">
              <label className="field-label">通常ロット点数</label>
              <input type="number" className="input" value={form.normalLot || 0}
                     onChange={(e) => setForm({...form, normalLot: parseInt(e.target.value) || 0})}/>
            </div>
            <div className="field">
              <label className="field-label">ロット外点数</label>
              <input type="number" className="input" value={form.extraLot || 0}
                     onChange={(e) => setForm({...form, extraLot: parseInt(e.target.value) || 0})}/>
            </div>
            <div className="field">
              <label className="field-label">先付け処理点数</label>
              <input type="number" className="input" value={form.advance || 0}
                     onChange={(e) => setForm({...form, advance: parseInt(e.target.value) || 0})}/>
            </div>
            {isY && (
              <div className="field">
                <label className="field-label">保管処理点数</label>
                <input type="number" className="input" value={form.storage || 0}
                       onChange={(e) => setForm({...form, storage: parseInt(e.target.value) || 0})}/>
              </div>
            )}
            <div className="field">
              <label className="field-label">合計稼働時間</label>
              <input type="number" step="0.25" className="input" value={form.hours || 0}
                     onChange={(e) => setForm({...form, hours: parseFloat(e.target.value) || 0})}/>
            </div>
            <div className="field">
              <label className="field-label">出勤メンバー</label>
              <input type="text" className="input" value={form.members || ""}
                     onChange={(e) => setForm({...form, members: e.target.value})}
                     placeholder="名前,名前,名前"/>
            </div>
            <div className="field full">
              <label className="field-label">自由報告</label>
              <textarea className="input" rows="3" value={form.note || ""}
                        onChange={(e) => setForm({...form, note: e.target.value})}/>
            </div>
            <div className="field full" style={{ fontSize: 11, color: "var(--ink-mute)", background: "var(--bg-2)", padding: 10, borderRadius: 10 }}>
              ※ 修正内容はローカルに保存されます。同期時に最新データが反映されます。
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>キャンセル</button>
          <button className="btn btn-primary" onClick={() => { onSave(form); onClose(); }}>保存</button>
        </div>
      </div>
    </div>
  );
};

// ── Toast ────────────────────────────────────────────
const FactoryToast = ({ msg, onDone }) => {
  React.useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [msg, onDone]);
  return msg ? <div className="toast">{msg}</div> : null;
};

// ── Main page ─────────────────────────────────────────
const FactoryReportPage = () => {
  const [rows, setRows] = useFbStateFactory("miwa.factory.v3", () => SEED_FACTORY);
  const [settings, setSettings] = useFbStateFactory("miwa.factory.settings.v3", () => ({
    url: FACTORY_DEFAULT_GAS, autoSync: true, intervalH: 1,
  }));
  const [lastSync, setLastSync] = useFbStateFactory("miwa.factory.lastSync.v3", () => null);
  const [lastError, setLastError] = React.useState("");
  const [diag, setDiag] = React.useState(null);
  const [syncing, setSyncing] = React.useState(false);
  const [dark, setDark] = React.useState(false);
  const [selectedFactory, setSelectedFactory] = React.useState("all");
  const [showSettings, setShowSettings] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editRecord, setEditRecord] = React.useState(null);
  const [toast, setToast] = React.useState("");
  const [tableShowCount, setTableShowCount] = React.useState(10);

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  // ── GAS row helpers（フォーム改変に強い柔軟マッチング）──
  const findVal = (obj, partials) => {
    const cands = Array.isArray(partials) ? partials : [partials];
    for (const p of cands) {
      const key = Object.keys(obj).find(k => k.includes(p));
      if (key) return obj[key];
    }
    return null;
  };
  const prefixVal = (obj, prefix, partial) => {
    // 1) 「（八潮）」「（東川口）」等の接頭辞付き列を優先
    const key = Object.keys(obj).find(k => k.includes(prefix) && k.includes(partial));
    if (key !== undefined) return obj[key];
    // 2) フォーム改変で接頭辞が消えた場合 → 同名項目のうち値が入っている列を採用
    const matches = Object.keys(obj).filter(k => k.includes(partial));
    for (const k of matches) {
      const v = obj[k];
      if (v !== null && v !== undefined && String(v).trim() !== "") return v;
    }
    return matches.length ? obj[matches[0]] : null;
  };
  const numVal = (v) => {
    if (v === null || v === undefined || v === "") return 0;
    const n = parseFloat(String(v).replace(/,/g, ""));
    return isNaN(n) ? 0 : n;
  };
  const parseGasRow = (r) => {
    const factory = findVal(r, ["どちらの工場", "工場名", "工場を選択", "工場"]);
    if (!factory) return null;
    const isYashio = factory.includes("八潮") || factory.includes("ドライ");
    const prefix = isYashio ? "八潮" : "東川口";
    const tsRaw = findVal(r, ["タイムスタンプ", "Timestamp", "timestamp"]) || "";
    let ts = "";
    if (tsRaw) { const d = new Date(tsRaw); if (!isNaN(d)) ts = d.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }); }
    let dateRaw = findVal(r, ["報告日", "日付", "受付日", "対象日"]);
    let date = "";
    if (dateRaw) {
      const d = new Date(dateRaw);
      if (!isNaN(d)) { const jst = new Date(d.getTime() + 9*3600*1000); date = jst.toISOString().slice(0,10); }
      else { date = String(dateRaw).slice(0,10); }
    }
    if (!date) return null;
    return {
      timestamp: ts, date, factory,
      reportID: date + "_" + factory,
      members: String(prefixVal(r, prefix, "出勤したメンバー") || ""),
      normalLot: numVal(prefixVal(r, prefix, "通常ロット")),
      extraLot:  numVal(prefixVal(r, prefix, "ロット外")),
      advance:   numVal(prefixVal(r, prefix, "先付け")),
      storage:   isYashio ? numVal(prefixVal(r, prefix, "保管処理")) : null,
      hours:     numVal(prefixVal(r, prefix, "合計時間")),
      note:      String(prefixVal(r, prefix, "自由報告") || ""),
    };
  };

  // GAS 取得：まず fetch、失敗したら JSONP（GAS の CORS 制限を回避）
  const fetchRaw = React.useCallback((url) => {
    return fetch(url, { redirect: "follow" })
      .then(res => { if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
      .catch(() => new Promise((resolve, reject) => {
        const cb = "__facCb_" + Math.random().toString(36).slice(2);
        const sep = url.includes("?") ? "&" : "?";
        const s = document.createElement("script");
        const cleanup = () => { try { delete window[cb]; } catch {} s.remove(); clearTimeout(timer); };
        const timer = setTimeout(() => { cleanup(); reject(new Error("取得タイムアウト。GAS の公開範囲が「全員」か、URL が正しいかご確認ください")); }, 15000);
        window[cb] = (data) => { cleanup(); resolve(data); };
        s.onerror = () => { cleanup(); reject(new Error("接続できません。URL と公開設定をご確認ください")); };
        s.src = url + sep + "callback=" + cb;
        document.body.appendChild(s);
      }));
  }, []);

  const syncNow = React.useCallback(async () => {
    if (!settings.url) return;
    setSyncing(true);
    setLastError("");
    try {
      const isSheet = /docs\.google\.com\/spreadsheets/.test(settings.url) || /output=csv|tqx=out:csv/.test(settings.url);
      let parsed, columns;
      if (isSheet) {
        // 回答スプレッドシート(CSV)を位置ベースで取り込み（八潮/東川口を出現順で分離）
        const res = await fetch(facCsvUrl(settings.url), { redirect: "follow" });
        if (!res.ok) throw new Error("HTTP " + res.status + "（シートを『リンクを知っている全員・閲覧者』に共有してください）");
        const text = await res.text();
        ({ rows: parsed, columns } = importFactoryCsv(text));
      } else {
        // GAS(JSON)：まず fetch、失敗したら JSONP
        const raw = await fetchRaw(settings.url);
        if (raw && raw.error) throw new Error(raw.message || "GAS error");
        if (!Array.isArray(raw)) throw new Error("応答が配列ではありません（URL/公開設定を確認）");
        columns = raw.length ? Object.keys(raw[0]) : [];
        parsed = raw.map(r => parseGasRow(r)).filter(Boolean);
      }
      // 診断情報（フォーム改変の確認用）: 受信した列名と件数
      setDiag({ columns: columns || [], count: parsed ? parsed.length : 0 });
      const deduped = {};
      (parsed || []).forEach(r => {
        const key = r.date + "_" + r.factory;
        if (!deduped[key] || r.timestamp > deduped[key].timestamp) deduped[key] = r;
      });
      const data = Object.values(deduped);
      if (!data.length) throw new Error(`データを認識できませんでした。フォームの項目名が変わった可能性があります。設定画面の「受信した列名」をご確認ください`);
      setRows(data);
      setLastSync(Date.now());
      setToast(`${data.length} 件を同期しました`);
    } catch (e) {
      setLastError(e.message || String(e));
      setToast("同期に失敗しました");
    } finally {
      setSyncing(false);
    }
  }, [settings.url, fetchRaw]);

  // Auto-sync interval
  React.useEffect(() => {
    if (!settings.url || !settings.autoSync) return;
    const intervalMs = (Number(settings.intervalH) || 1) * 60 * 60 * 1000;
    const isStale = () => !lastSync || (Date.now() - lastSync) >= intervalMs;
    if (isStale()) syncNow();
    const tick = setInterval(() => { if (isStale()) syncNow(); }, 60_000);
    return () => clearInterval(tick);
  }, [settings.url, settings.autoSync, settings.intervalH, lastSync, syncNow]);

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

  const filteredRows = selectedFactory === "all"
    ? rows
    : rows.filter(r => r.factory === selectedFactory);

  const allUniqueDates = [...new Set(rows.map(r => r.date).filter(Boolean))].sort();
  const latestDate = allUniqueDates.length
    ? allUniqueDates[allUniqueDates.length - 1]
    : new Date().toISOString().slice(0, 10);

  const factoryCounts = React.useMemo(() => {
    const counts = { all: rows.length };
    FACTORIES.slice(1).forEach(f => {
      counts[f.id] = rows.filter(r => r.factory === f.id).length;
    });
    return counts;
  }, [rows]);

  const handleEdit = (record) => {
    setEditRecord(record);
    setShowEditModal(true);
  };

  const handleSaveEdit = (updated) => {
    setRows(rows.map(r => 
      r.reportID === editRecord.reportID ? { ...r, ...updated } : r
    ));
    setToast("修正を保存しました");
  };

  return (
    <div className="app">
      <div className="shell">
        <AppSidebar active="factory" />
        <main className="main">
          {/* Greeting */}
          <div className="greet">
            <div>
              <h1>🏭 工場報告</h1>
              <div className="sub">
                全 {rows.length} 件 ・ {lastSync ? `最終更新 ${new Date(lastSync).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}` : "未同期"} ・ {nextSyncLabel}
              </div>
            </div>
            <div className="right">
              <button className="btn btn-ghost" onClick={syncNow} disabled={!settings.url || syncing} title="今すぐ取得">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                     style={syncing ? { animation: "spin 1s linear infinite" } : null}>
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                {syncing ? "同期中" : "更新"}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowSettings(true)} title="同期設定">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>
                </svg>
                設定
              </button>
            </div>
          </div>

          {/* Alert */}
          <FactoryAlert rows={rows} />

          {/* Factory filter */}
          <div className="card" style={{ padding: "14px 16px" }}>
            <FactoryFilter value={selectedFactory} onChange={setSelectedFactory} counts={factoryCounts} />
          </div>

          {/* KPI */}
          <FactoryKpiGrid rows={filteredRows} selectedFactory={selectedFactory} latestDate={latestDate} />

          {/* Daily charts */}
          <div className="card chart-card">
            <div className="card-head">
              <h3 className="card-title">📊 日別 総点数</h3>
              <span className="card-sub">DAILY ITEMS</span>
            </div>
            <DailyBarChart rows={filteredRows} valueFn={totalPointsF} color="var(--accent)" unit="点" formatVal={(v) => Math.round(v)} />
          </div>

          <div className="card chart-card">
            <div className="card-head">
              <h3 className="card-title">⏱ 日別 合計稼働時間</h3>
              <span className="card-sub">DAILY HOURS</span>
            </div>
            <DailyBarChart rows={filteredRows} valueFn={(r) => r.hours} color="#4285F4" unit="h" formatVal={(v) => v.toFixed(1)} />
          </div>

          {/* Factory comparison */}
          <div className="card">
            <div className="card-head">
              <h3 className="card-title">🏭 工場別 比較</h3>
              <span className="card-sub">FACTORY COMPARISON</span>
            </div>
            <FactoryComparison rows={filteredRows} />
          </div>

          {/* Report table */}
          <div className="card">
            <div className="card-head">
              <h3 className="card-title">📋 報告一覧</h3>
              <span className="card-sub">{filteredRows.length} / {rows.length} 件</span>
            </div>
            <FactoryReportTable
              rows={filteredRows}
              showCount={tableShowCount}
              onShowMore={() => setTableShowCount(c => c + 10)}
              onEdit={handleEdit}
            />
          </div>
        </main>
      </div>

      <FactorySettingsModal
        open={showSettings}
        settings={settings}
        onSave={(s) => setSettings(s)}
        onClose={() => setShowSettings(false)}
        onSyncNow={syncNow}
        lastSync={lastSync}
        lastError={lastError}
        syncing={syncing}
        diag={diag}
      />

      <FactoryEditModal
        open={showEditModal}
        record={editRecord}
        onSave={handleSaveEdit}
        onClose={() => setShowEditModal(false)}
      />

      <FactoryToast msg={toast} onDone={() => setToast("")} />
    </div>
  );
};

window.FactoryReportPage = FactoryReportPage;
