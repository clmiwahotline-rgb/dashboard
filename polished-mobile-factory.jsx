// モバイル版 ─ 工場報告（閲覧中心）
// データ: localStorage miwa.factory.v3（PC版と同キー）
//   各行: { date, factory, normalLot, normalLotToday, extraLot, advance, storage, hours, members, note }
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MFACT_LS_KEY = "miwa.factory.v3";
const MFACT_FACTORIES = [
  { id: "all",        short: "全工場",  color: "var(--accent)" },
  { id: "八潮ドライ工場",       short: "八潮",   color: "var(--accent)" },
  { id: "東川口ワイシャツ工場", short: "東川口", color: "#34A853" },
];
const MFACT_DAYS = ["日","月","火","水","木","金","土"];
const mfactTotal = (r) => (r.normalLot||0) + (r.extraLot||0) + (r.advance||0) + (r.storage||0);
const mfactDayColor = (d) => { if (!d) return null; const w = new Date(d).getDay(); return w===0?"#ef4444":w===6?"#4285F4":null; };
const mfactShort = (f) => f && f.includes("八潮") ? "八潮" : "東川口";
const mfactColor = (f) => f && f.includes("八潮") ? "var(--accent)" : "#34A853";

const MFactory = ({ registerHeader, registerFab }) => {
  const [rows] = React.useState(() => {
    try { const s = localStorage.getItem(MFACT_LS_KEY); if (s) return JSON.parse(s); } catch (e) {}
    return [];
  });
  const [factory, setFactory] = React.useState("all");

  React.useEffect(() => {
    registerHeader && registerHeader({ title: "工場報告", sub: rows.length ? `${rows.length}件` : "PC版と同期してください" });
    registerFab && registerFab(null);
  }, [rows.length]);

  const filtered = rows.filter((r) => factory === "all" || r.factory === factory);
  const sorted = [...filtered].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const latestDate = sorted.length ? sorted[0].date : null;
  const latestRows = latestDate ? rows.filter((r) => r.date === latestDate) : [];

  // KPI: 最新日の各工場
  const kpiFactory = (name) => {
    const r = latestRows.find((x) => x.factory === name);
    if (!r) return null;
    return { total: mfactTotal(r), hours: r.hours || 0, members: r.members || "" };
  };
  const yashio    = kpiFactory("八潮ドライ工場");
  const higashi   = kpiFactory("東川口ワイシャツ工場");

  if (rows.length === 0) {
    return (
      <div>
        <div className="m-card" style={{ padding: "24px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏭</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ink)" }}>データがありません</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-mute)", marginTop: 8, lineHeight: 1.6 }}>
            PC版の工場報告ページで同期すると<br />このページでも閲覧できます
          </div>
          <a className="m-bigbtn" href="工場報告.html" style={{ marginTop: 16, display: "block" }}>PC版で開く</a>
        </div>
      </div>
    );
  }

  return (
    <div>
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
        const dc = mfactDayColor(r.date);
        const dow = r.date ? MFACT_DAYS[new Date(r.date).getDay()] : "";
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
