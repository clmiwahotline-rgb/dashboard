// モバイル版 ─ 工場報告（閲覧＋GAS同期）
// データ: localStorage miwa.factory.v3（PC版と同キー）
//   各行: { date, factory, normalLot, normalLotToday, extraLot, advance, storage, hours, members, note }
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MFACT_LS_KEY      = "miwa.factory.v3";
const MFACT_SETTINGS_KEY = "miwa.factory.settings.v4";
const MFACT_DEFAULT_URL  = "https://docs.google.com/spreadsheets/d/1vG_IRqtef1ZCiG1MkZgUot4Vrmj59RIfQjhRO4aKDMQ/edit";

const MFACT_FACTORIES = [
  { id: "all",              short: "全工場",  color: "var(--accent)" },
  { id: "八潮ドライ工場",       short: "八潮",   color: "var(--accent)" },
  { id: "東川口ワイシャツ工場", short: "東川口", color: "#34A853" },
];
const MFACT_DAYS  = ["日","月","火","水","木","金","土"];
const mfactTotal  = (r) => (r.normalLot||0) + (r.extraLot||0) + (r.advance||0) + (r.storage||0);
const mfactDayColor = (d) => { if (!d) return null; const w = new Date(d).getDay(); return w===0?"#ef4444":w===6?"#4285F4":null; };
const mfactShort  = (f) => f && f.includes("八潮") ? "八潮" : "東川口";
const mfactColor  = (f) => f && f.includes("八潮") ? "var(--accent)" : "#34A853";

// ── CSV パーサ（PC版 polished-factory.jsx と同一ロジック） ───────────
const mfacCsvUrl = (raw) => {
  if (!raw) return "";
  const t = raw.trim();
  if (/output=csv|tqx=out:csv|format=csv/.test(t)) return t;
  const m = t.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]+)/);
  if (!m) return t;
  const gid = (t.match(/[?#&]gid=(\d+)/) || [])[1] || "0";
  return `https://docs.google.com/spreadsheets/d/${m[1]}/gviz/tq?tqx=out:csv&gid=${gid}`;
};

const mfacParseCsv = (text) => {
  const rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c==='"') { if (text[i+1]==='"') { cur+='"'; i++; } else q=false; } else cur+=c; }
    else if (c==='"') q=true;
    else if (c===",") { row.push(cur); cur=""; }
    else if (c==="\n") { row.push(cur); rows.push(row); row=[]; cur=""; }
    else if (c==="\r") { /* skip */ }
    else cur+=c;
  }
  if (cur.length||row.length) { row.push(cur); rows.push(row); }
  return rows;
};

const mfacNum = (v) => { if (v==null||v==="") return 0; const n=parseFloat(String(v).replace(/,/g,"")); return isNaN(n)?0:n; };

const mfacImportCsv = (text) => {
  const rows = mfacParseCsv(text).filter(r => r.some(c => c && c.trim()));
  if (rows.length < 2) return [];
  const H = rows[0].map(h => (h||"").replace(/\s+/g," ").trim());
  const idxAll = (kw) => H.map((h,i) => h.includes(kw)?i:-1).filter(i=>i>=0);
  const idxBy  = (pred) => H.map((h,i) => pred(h)?i:-1).filter(i=>i>=0);
  const first  = (a) => a.length ? a[0] : -1;
  const dateI  = first(idxAll("報告日").concat(idxAll("日付")));
  const facI   = first(idxAll("どちらの工場").concat(idxAll("工場")));
  const tsI    = first(idxAll("タイムスタンプ"));
  const memI   = idxAll("出勤したメンバー").length ? idxAll("出勤したメンバー") : idxAll("メンバー");
  const norPrevI  = idxBy(h=>h.includes("通常ロット")&&h.includes("前日"));
  const norTodayI = idxBy(h=>h.includes("通常ロット")&&(h.includes("当日")||h.includes("本日")));
  const norPlainI = idxBy(h=>h.includes("通常ロット")&&!h.includes("前日")&&!h.includes("当日")&&!h.includes("本日"));
  const norI   = norPrevI.length ? norPrevI : norPlainI;
  const extI   = idxAll("ロット外");
  const advI   = idxAll("先付け");
  const stoI   = idxAll("保管処理");
  const hrI    = idxAll("合計時間").length ? idxAll("合計時間") : idxAll("時間");
  const noteI  = idxAll("自由報告").length ? idxAll("自由報告") : idxAll("その他");
  const out    = [];
  for (let ri = 1; ri < rows.length; ri++) {
    const r = rows[ri];
    const cell = (i) => (i>=0&&i<r.length)?r[i]:"";
    const factory = String(cell(facI)||"").trim();
    if (!factory) continue;
    const isY = factory.includes("八潮")||factory.includes("ドライ");
    const b   = isY ? 0 : 1;
    const at  = (arr) => arr.length ? cell(arr[Math.min(b,arr.length-1)]) : "";
    let date = "";
    const dateRaw = cell(dateI);
    if (dateRaw) { const d=new Date(dateRaw); if (!isNaN(d)) { const j=new Date(d.getTime()+9*3600*1000); date=j.toISOString().slice(0,10); } else date=String(dateRaw).slice(0,10); }
    if (!date) continue;
    let ts = "";
    const tsRaw = cell(tsI);
    if (tsRaw) { const d=new Date(tsRaw); if (!isNaN(d)) ts=d.toLocaleString("ja-JP",{timeZone:"Asia/Tokyo"}); }
    out.push({
      timestamp: ts, date, factory, reportID: date+"_"+factory,
      members:       String(at(memI)||""),
      normalLot:     mfacNum(at(norI)),
      normalLotToday:mfacNum(at(norTodayI)),
      extraLot:      mfacNum(at(extI)),
      advance:       mfacNum(at(advI)),
      storage:       isY ? mfacNum(at(stoI)) : null,
      hours:         mfacNum(at(hrI)),
      note:          String(at(noteI)||""),
    });
  }
  return out;
};

// ── コンポーネント本体 ─────────────────────────────────────
const MFactory = ({ registerHeader, registerFab }) => {
  const [rows, setRows] = React.useState(() => {
    try { const s = localStorage.getItem(MFACT_LS_KEY); if (s) return JSON.parse(s); } catch (e) {}
    return [];
  });
  const [factory, setFactory] = React.useState("all");
  const [syncing, setSyncing] = React.useState(false);
  const [syncMsg, setSyncMsg] = React.useState("");

  React.useEffect(() => {
    registerHeader && registerHeader({ title: "工場報告", sub: rows.length ? `${rows.length}件` : "同期ボタンで取得" });
    registerFab && registerFab(null);
  }, [rows.length]);

  // GAS/スプレッドシートから同期
  const syncFromGas = React.useCallback(async () => {
    setSyncing(true);
    setSyncMsg("");
    try {
      let url = MFACT_DEFAULT_URL;
      try {
        const cfg = JSON.parse(localStorage.getItem(MFACT_SETTINGS_KEY) || "{}");
        if (cfg && cfg.url) url = cfg.url;
      } catch (e) {}
      const csvUrl = mfacCsvUrl(url);
      const res = await fetch(csvUrl, { redirect: "follow" });
      if (!res.ok) throw new Error("取得失敗 HTTP " + res.status);
      const text = await res.text();
      const imported = mfacImportCsv(text);
      if (imported.length === 0) throw new Error("データが見つかりませんでした");
      // 既存データとマージ（reportID でユニーク）
      const seen = new Set(imported.map(r => r.reportID));
      const prev = rows.filter(r => !seen.has(r.reportID));
      const merged = [...imported, ...prev].sort((a,b) => (b.date||"").localeCompare(a.date||""));
      setRows(merged);
      try { localStorage.setItem(MFACT_LS_KEY, JSON.stringify(merged)); } catch (e) {}
      setSyncMsg(`✅ ${imported.length}件を取得しました`);
    } catch (e) {
      setSyncMsg("⚠️ " + (e.message || "同期に失敗しました"));
    }
    setSyncing(false);
    setTimeout(() => setSyncMsg(""), 4000);
  }, [rows]);

  const filtered = rows.filter((r) => factory === "all" || r.factory === factory);
  const sorted   = [...filtered].sort((a,b) => (b.date||"").localeCompare(a.date||""));
  const latestDate = sorted.length ? sorted[0].date : null;
  const latestRows = latestDate ? rows.filter((r) => r.date === latestDate) : [];

  const kpiFactory = (name) => {
    const r = latestRows.find((x) => x.factory === name);
    if (!r) return null;
    return { total: mfactTotal(r), hours: r.hours||0, members: r.members||"" };
  };
  const yashio  = kpiFactory("八潮ドライ工場");
  const higashi = kpiFactory("東川口ワイシャツ工場");

  // 同期ボタン（空/非空どちらでも右上に常時表示）
  const syncBtn = (
    <button
      onClick={syncFromGas}
      disabled={syncing}
      className="m-card-link"
      style={{ cursor: "pointer", fontSize: 12.5, fontWeight: 700, border: "none", background: "none",
               color: syncing ? "var(--ink-mute)" : "var(--accent-ink)", padding: 0 }}
    >
      {syncing ? "同期中…" : "🔄 同期"}
    </button>
  );

  if (rows.length === 0) {
    return (
      <div>
        <div className="m-card" style={{ padding: "24px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏭</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ink)" }}>データがありません</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-mute)", marginTop: 8, lineHeight: 1.6 }}>
            「同期」ボタンを押すとスプレッドシートから<br />最新データを取得します
          </div>
          <button
            onClick={syncFromGas}
            disabled={syncing}
            className="m-bigbtn"
            style={{ marginTop: 16, display: "block", width: "100%", border: "none",
                     background: "var(--accent)", color: "#fff", cursor: syncing ? "not-allowed" : "pointer" }}
          >
            {syncing ? "同期中…" : "🔄 スプレッドシートから同期"}
          </button>
          {syncMsg && (
            <div style={{ marginTop: 10, fontSize: 13, color: syncMsg.startsWith("✅") ? "var(--accent)" : "#c5221f", fontWeight: 600 }}>
              {syncMsg}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* 同期ステータスバー */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 2px 10px", minHeight: 28 }}>
        <span style={{ fontSize: 11.5, color: "var(--ink-mute)", fontWeight: 600 }}>
          {syncMsg || `最終: ${latestDate || "—"}`}
        </span>
        {syncBtn}
      </div>

      {/* 最新日KPI */}
      {latestDate && (
        <>
          <div className="m-sec-title" style={{ marginTop: 2 }}>最新日: {latestDate}</div>
          <div className="m-sales-kpis" style={{ marginBottom: 14 }}>
            {yashio && (
              <div className="m-sales-kpi" style={{ borderLeft: "3px solid var(--accent)" }}>
                <div className="m-sales-kpi-label" style={{ color: "var(--accent-ink)" }}>八潮 総点数</div>
                <div className="m-sales-kpi-val">{yashio.total.toLocaleString()}<span className="u">点</span></div>
                <div className="m-sales-kpi-sub">{yashio.hours}h</div>
              </div>
            )}
            {higashi && (
              <div className="m-sales-kpi" style={{ borderLeft: "3px solid #34A853" }}>
                <div className="m-sales-kpi-label" style={{ color: "#1e8e3e" }}>東川口 総点数</div>
                <div className="m-sales-kpi-val">{higashi.total.toLocaleString()}<span className="u">点</span></div>
                <div className="m-sales-kpi-sub">{higashi.hours}h</div>
              </div>
            )}
          </div>
        </>
      )}

      {/* 工場フィルタ */}
      <div className="m-chips" style={{ marginBottom: 12 }}>
        {MFACT_FACTORIES.map((f) => (
          <button key={f.id} className={`m-chip ${factory === f.id ? "active" : ""}`} onClick={() => setFactory(f.id)}>
            {f.short}
          </button>
        ))}
      </div>

      {/* 報告リスト */}
      {sorted.slice(0, 30).map((r, i) => {
        const total = mfactTotal(r);
        const dc    = mfactDayColor(r.date);
        const dow   = r.date ? MFACT_DAYS[new Date(r.date).getDay()] : "";
        return (
          <div key={i} className="mfact-card">
            <div className="mfact-card-head">
              <span className="mfact-factory" style={{ color: mfactColor(r.factory) }}>{mfactShort(r.factory)}</span>
              <span className="mfact-date" style={{ color: dc || "var(--ink)" }}>{r.date} ({dow})</span>
            </div>
            <div className="mfact-grid">
              <div className="mfact-cell">
                <div className="mfact-cell-label">総点数</div>
                <div className="mfact-cell-val">{total.toLocaleString()}<span className="u">点</span></div>
              </div>
              <div className="mfact-cell">
                <div className="mfact-cell-label">通常ロット</div>
                <div className="mfact-cell-val">{(r.normalLot||0).toLocaleString()}<span className="u">点</span></div>
              </div>
              <div className="mfact-cell">
                <div className="mfact-cell-label">稼働時間</div>
                <div className="mfact-cell-val">{r.hours||0}<span className="u">h</span></div>
              </div>
              <div className="mfact-cell">
                <div className="mfact-cell-label">ロット外</div>
                <div className="mfact-cell-val">{(r.extraLot||0).toLocaleString()}<span className="u">点</span></div>
              </div>
            </div>
            {r.note && <div className="mfact-note">{r.note}</div>}
          </div>
        );
      })}
      {sorted.length > 30 && <div className="m-empty">最新30件を表示しています</div>}
      <div style={{ height: 16 }}></div>
    </div>
  );
};

window.MFactory = MFactory;
