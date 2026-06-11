// 工場報告 — atoms (KPI, charts, comparison, table)

// ── Constants ─────────────────────────────────────────
// 【重要】取込元は「回答スプレッドシート」を使うこと。
// このフォームは八潮/東川口で同じ設問名の列が重複しており、GASのJSONだと
// 同名キーが衝突して八潮の数値が消える。CSV（スプレッドシート直）なら
// 列を位置で保持でき、八潮/東川口と前日/当日を正しく分離できる。
const FACTORY_DEFAULT_GAS    = "https://docs.google.com/spreadsheets/d/1vG_IRqtef1ZCiG1MkZgUot4Vrmj59RIfQjhRO4aKDMQ/edit";
const FACTORY_DEFAULT_COMMENT_GAS = "https://script.google.com/macros/s/AKfycbye_DKfP4mj3TPKrxoAj1W4gNyREg70FyV_qJES67x-unRVwprbXg4j1FVm2mG51EPk/exec";

const FACTORIES = [
  { id: "all",  short: "全工場",   long: "全工場",          color: "var(--accent)" },
  { id: "八潮ドライ工場",       short: "八潮",      long: "八潮ドライ工場",     color: "var(--accent)" },
  { id: "東川口ワイシャツ工場", short: "東川口",   long: "東川口ワイシャツ工場", color: "#34A853"       },
];

const FACTORY_RATES = { "八潮ドライ工場": 1260, "東川口ワイシャツ工場": 1160 };

const DAYS_JP = ["日","月","火","水","木","金","土"];
const dayNameF = (d) => d ? DAYS_JP[new Date(d).getDay()] : "";
const dayColorF = (d) => {
  if (!d) return null;
  const w = new Date(d).getDay();
  return w === 0 ? "#ef4444" : w === 6 ? "#4285F4" : null;
};

const factoryColor = (factory) => factory && factory.includes("八潮") ? "var(--accent)" : "#34A853";
const factoryShort = (factory) => factory && factory.includes("八潮") ? "八潮" : "東川口";

const totalPointsF = (r) => (r.normalLot || 0) + (r.extraLot || 0) + (r.advance || 0) + (r.storage || 0);
const countMembersF = (m) => !m || !m.trim() ? 0 : m.split(/[,、\s]+/).filter(s => s.trim()).length;
const fmtYenF = (n) => "¥" + Math.round(n || 0).toLocaleString("ja-JP");

// ── Seed data (~2週分, 平日のみ) ───────────────────────
const SEED_FACTORY = [];

const SEED_COMMENTS = {};

// ── Filter pills ──────────────────────────────────────
const FactoryFilter = ({ value, onChange, counts }) => (
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    {FACTORIES.map((f) => (
      <button key={f.id}
              onClick={() => onChange(f.id)}
              className={`fc-pill ${value === f.id ? "active" : ""}`}
              style={value === f.id ? { borderColor: f.color, color: f.color, background: "var(--accent-soft)" } : null}>
        {f.short}
        <span className="fc-pill-count">{counts[f.id] ?? 0}</span>
      </button>
    ))}
  </div>
);

// ── Alert bar (未提出) ────────────────────────────────
const FactoryAlert = ({ rows }) => {
  const y = rows.filter(r => r.factory === "八潮ドライ工場").map(r => r.date).sort();
  const h = rows.filter(r => r.factory === "東川口ワイシャツ工場").map(r => r.date).sort();
  const yL = y[y.length - 1], hL = h[h.length - 1];
  if (!yL || !hL || yL === hL) return null;
  const missing = yL > hL
    ? { factory: "東川口ワイシャツ工場", last: hL, other: yL }
    : { factory: "八潮ドライ工場", last: yL, other: hL };
  return (
    <div className="fc-alert">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <div>
        <div className="fc-alert-title">報告未提出の可能性</div>
        <div className="fc-alert-desc">
          <strong>{missing.factory}</strong> の最終報告は <code>{missing.last}（{dayNameF(missing.last)}）</code>。
          もう一方は <code>{missing.other}（{dayNameF(missing.other)}）</code>まで提出済みです。
        </div>
      </div>
    </div>
  );
};

// ── KPI grid ──────────────────────────────────────────
const FactoryKpiGrid = ({ rows, selectedFactory, latestDate }) => {
  const pd = rows.filter(r => r.date === latestDate);
  const sum = (key) => pd.reduce((s, r) => s + (r[key] || 0), 0);
  const total = pd.reduce((s, r) => s + totalPointsF(r), 0);
  const hours = sum("hours");
  const members = pd.reduce((s, r) => s + countMembersF(r.members), 0);
  const isHigashi = selectedFactory === "東川口ワイシャツ工場";
  const cost = pd.reduce((s, r) => s + Math.round(r.hours * (FACTORY_RATES[r.factory] || 1200)), 0);
  const prod = hours > 0 ? (total / hours).toFixed(1) : "0";
  const perPt = total > 0 ? Math.round(cost / total) : 0;
  const costSub = selectedFactory === "all"
    ? "八潮 ¥1,260 / 東川口 ¥1,160"
    : `${(hours || 0).toFixed(1)}h × ¥${(FACTORY_RATES[selectedFactory] || 1200).toLocaleString()}`;

  const cards = [
    { label: "総点数",       v: total.toLocaleString(),                u: "点",   sub: "前日通常+ロット外+先付け+保管", c: "var(--ink)" },
    { label: "前日通常ロット", v: sum("normalLot").toLocaleString(),     u: "点",   sub: "前日までの入荷", c: "var(--accent)" },
    { label: "当日通常ロット", v: sum("normalLotToday").toLocaleString(), u: "点",   sub: "当日の入荷", c: "#7C4DFF" },
    { label: "ロット外",     v: sum("extraLot").toLocaleString(),      u: "点",   sub: "", c: "#4285F4" },
    { label: "先付け処理",   v: sum("advance").toLocaleString(),       u: "点",   sub: "", c: "#34A853" },
    { label: "保管処理",     v: isHigashi ? "—" : sum("storage").toLocaleString(), u: isHigashi ? "" : "点", sub: isHigashi ? "対象外" : "", c: "#34A853" },
    { label: "稼働時間",     v: (hours || 0).toFixed(2),               u: "h",    sub: `${members}名出勤`, c: "#EA4335" },
    { label: "人件費目安",   v: fmtYenF(cost),                          u: "",     sub: costSub, c: "#EA4335" },
    { label: "生産性",       v: prod,                                   u: "点/h", sub: "総点数÷稼働時間", c: "var(--accent)" },
    { label: "1点単価",      v: perPt > 0 ? fmtYenF(perPt) : "—",       u: "",     sub: "人件費÷総点数", c: "var(--accent)" },
  ];

  return (
    <div className="kpi-row kpi-row-5">
      {cards.map((c, i) => (
        <div key={i} className="kpi" style={{ borderTop: `3px solid ${c.c}`, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
          <div className="kpi-label"><span className="kpi-dot" style={{ background: c.c }}></span>{c.label}</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>
            {c.v}<span className="kpi-unit" style={{ marginLeft: 4 }}>{c.u}</span>
          </div>
          <div className="kpi-delta">{c.sub || "\u00A0"}</div>
        </div>
      ))}
    </div>
  );
};

// ── Daily bar chart (SVG) ─────────────────────────────
const DailyBarChart = ({ rows, valueFn, color, unit, formatVal }) => {
  if (!rows || rows.length === 0) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--ink-mute)", fontSize: 12 }}>データがありません</div>;
  }
  const dates = [...new Set(rows.map(r => r.date).filter(d => d))].sort();
  if (!dates.length) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--ink-mute)", fontSize: 12 }}>データがありません</div>;
  }
  const vals = dates.map(d => {
    const day = rows.filter(r => r.date === d);
    return { date: d, value: day.reduce((s, r) => s + valueFn(r), 0) };
  });
  const max = Math.max(...vals.map(v => v.value), 1);

  const w = 720, h = 200;
  const padL = 40, padR = 16, padT = 24, padB = 36;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const barW = Math.max(10, Math.min(48, innerW / vals.length - 6));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: 200, display: "block" }}>
      {/* gridlines */}
      {[0, 0.5, 1].map(p => {
        const y = padT + innerH - p * innerH;
        return (
          <g key={p}>
            <line x1={padL} x2={w - padR} y1={y} y2={y} stroke="var(--line)" strokeDasharray="2 4"/>
            <text x={padL - 6} y={y + 3} fontSize="9" fill="var(--ink-mute)" textAnchor="end">
              {formatVal ? formatVal(max * p) : Math.round(max * p)}
            </text>
          </g>
        );
      })}
      {vals.map((v, i) => {
        const cx = padL + (innerW / vals.length) * (i + 0.5);
        const barH = (v.value / max) * innerH;
        const y = padT + innerH - barH;
        const dc = dayColorF(v.date);
        const disp = formatVal ? formatVal(v.value) : (Number.isInteger(v.value) ? v.value : v.value.toFixed(1));
        return (
          <g key={v.date}>
            <rect x={cx - barW/2} y={y} width={barW} height={Math.max(2, barH)} fill={color} rx="4" opacity="0.92">
              <title>{`${v.date} (${dayNameF(v.date)}): ${disp}${unit||""}`}</title>
            </rect>
            <text x={cx} y={y - 6} fontSize="9.5" fill="var(--ink-soft)" textAnchor="middle" fontWeight="600" fontFamily="ui-monospace, monospace">{disp}</text>
            <text x={cx} y={h - 18} fontSize="9.5" fill="var(--ink-mute)" textAnchor="middle">{v.date.slice(5)}</text>
            <text x={cx} y={h - 6} fontSize="9" fill={dc || "var(--ink-mute)"} textAnchor="middle" fontWeight="600">({dayNameF(v.date)})</text>
          </g>
        );
      })}
    </svg>
  );
};

// ── Factory comparison ────────────────────────────────
const FactoryComparison = ({ rows }) => {
  // last 7 days
  const allDates = [...new Set(rows.map(r => r.date))].sort();
  const weekDates = allDates.slice(-7);
  const period = weekDates.length ? `${weekDates[0]} 〜 ${weekDates[weekDates.length-1]}` : "—";

  const sections = [
    { name: "八潮ドライ工場",       color: "var(--accent)", hasStorage: true,  rawColor: "#1a73e8" },
    { name: "東川口ワイシャツ工場", color: "#34A853",       hasStorage: false, rawColor: "#34A853" },
  ];

  return (
    <div className="fc-comp">
      <div style={{ fontSize: 11, color: "var(--ink-mute)", marginBottom: 14 }}>{period}</div>
      <div className="fc-comp-grid">
        {sections.map((f) => {
          const fd = rows.filter(r => r.factory === f.name && weekDates.includes(r.date));
          const days = new Set(fd.map(r => r.date)).size || 1;
          const nl = fd.reduce((s,r)=>s+r.normalLot,0)/days;
          const nt = fd.reduce((s,r)=>s+(r.normalLotToday||0),0)/days;
          const el = fd.reduce((s,r)=>s+r.extraLot,0)/days;
          const ad = fd.reduce((s,r)=>s+r.advance,0)/days;
          const st = fd.reduce((s,r)=>s+(r.storage||0),0)/days;
          const tot = nl + el + ad + st;
          const hr = fd.reduce((s,r)=>s+r.hours,0)/days;
          const totHr = fd.reduce((s,r)=>s+r.hours,0);
          const totPt = fd.reduce((s,r)=>s+totalPointsF(r),0);
          const maxV = Math.max(nl, nt, el, ad, st, 1);

          const bar = (label, val) => {
            const pct = (val / maxV) * 100;
            const dv = val % 1 !== 0 ? val.toFixed(1) : val;
            return (
              <div className="fc-bar-row" key={label}>
                <div className="fc-bar-label">{label}</div>
                <div className="fc-bar-track">
                  <div className="fc-bar-fill" style={{ width: `${pct}%`, background: f.color }}></div>
                </div>
                <div className="fc-bar-val">{dv}</div>
              </div>
            );
          };

          return (
            <div key={f.name} className="fc-comp-col">
              <div className="fc-comp-name" style={{ color: f.color }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: f.color, display: "inline-block", marginRight: 8 }}></span>
                {f.name}
                <span style={{ fontSize: 10.5, fontWeight: 500, color: "var(--ink-mute)", marginLeft: 8 }}>{days}日間の平均</span>
              </div>
              <div className="fc-comp-total" style={{ color: f.color }}>
                <span style={{ fontSize: 11, color: "var(--ink-mute)", fontWeight: 600, marginRight: 6 }}>総点数</span>
                {Math.round(tot * 10) / 10}
                <span style={{ fontSize: 12, color: "var(--ink-mute)", fontWeight: 500, marginLeft: 4 }}>点/日</span>
              </div>
              {bar("前日通常", Math.round(nl*10)/10)}
              {bar("当日通常", Math.round(nt*10)/10)}
              {bar("ロット外",   Math.round(el*10)/10)}
              {bar("先付け",     Math.round(ad*10)/10)}
              {f.hasStorage && bar("保管処理", Math.round(st*10)/10)}
              <div className="fc-comp-stats">
                平均稼働: <strong>{(hr || 0).toFixed(2)}h/日</strong>
                <span style={{ margin: "0 6px", color: "var(--ink-faint)" }}>·</span>
                平均生産性: <strong>{totHr > 0 ? (totPt/totHr).toFixed(1) : "0"}点/h</strong>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Report table ──────────────────────────────────────
const FactoryReportTable = ({ rows, showCount, onShowMore, onEdit }) => {
  if (!rows) rows = [];
  const sorted = [...rows].sort((a, b) => {
    const dateComp = (b.date || "").localeCompare(a.date || "");
    if (dateComp !== 0) return dateComp;
    return (b.timestamp || "").localeCompare(a.timestamp || "");
  });
  const showing = sorted.slice(0, showCount);

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <table className="fc-table">
          <thead>
            <tr>
              <th>日付</th><th>曜</th><th>工場</th><th>人数</th>
              <th>前日通常</th><th>当日通常</th><th>ロット外</th><th>先付け</th><th>保管</th>
              <th>総点数</th><th>時間</th><th>生産性</th><th></th>
            </tr>
          </thead>
          <tbody>
            {showing.length === 0 && (
              <tr><td colSpan="13" style={{ padding: 32, textAlign: "center", color: "var(--ink-mute)" }}>データがありません</td></tr>
            )}
            {showing.map((r, i) => {
              const tp = totalPointsF(r);
              const rHours = r.hours || 0;
              const prod = rHours > 0 ? (tp / rHours).toFixed(1) : "—";
              const isY = (r.factory || "").includes("八潮");
              const dc = r.date ? dayColorF(r.date) : null;
              return (
                <tr key={(r.reportID || i) + i}>
                  <td className="mono">{(r.date || "").slice(5)}</td>
                  <td style={{ color: dc || "var(--ink-soft)", fontWeight: 600 }}>{dayNameF(r.date)}</td>
                  <td>
                    <span className="fc-tag" style={{
                      background: isY ? "var(--accent-soft)" : "rgba(52,168,83,0.16)",
                      color: isY ? "var(--accent-ink)" : "#1e8e3e",
                    }}>{factoryShort(r.factory)}</span>
                  </td>
                  <td>{countMembersF(r.members)}名</td>
                  <td className="mono" style={{ fontWeight: 700 }}>{r.normalLot}</td>
                  <td className="mono" style={{ color: "#7C4DFF" }}>{r.normalLotToday ?? 0}</td>
                  <td className="mono">{r.extraLot}</td>
                  <td className="mono">{r.advance}</td>
                  <td className="mono" style={r.storage == null ? { color: "var(--ink-faint)" } : null}>{r.storage ?? "—"}</td>
                  <td className="mono" style={{ fontWeight: 700 }}>{tp}</td>
                  <td className="mono">{(r.hours || 0).toFixed(2)}h</td>
                  <td className="mono" style={{ color: "var(--accent-ink)" }}>{prod}</td>
                  <td>
                    <button className="row-action" onClick={() => onEdit(r)} title="修正">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {sorted.length > showCount && (
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <button className="btn btn-ghost" onClick={onShowMore}>さらに表示（残り {sorted.length - showCount} 件）</button>
        </div>
      )}
    </div>
  );
};

Object.assign(window, {
  FACTORY_DEFAULT_GAS, FACTORY_DEFAULT_COMMENT_GAS, FACTORIES, FACTORY_RATES,
  SEED_FACTORY, SEED_COMMENTS,
  dayNameF, dayColorF, totalPointsF, countMembersF, fmtYenF, factoryColor, factoryShort,
  FactoryFilter, FactoryAlert, FactoryKpiGrid, DailyBarChart, FactoryComparison, FactoryReportTable,
});
