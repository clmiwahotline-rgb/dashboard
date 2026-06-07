// Daily / Store / Course charts + Cumulative chart for 売上レポート

const { fmtYen, fmtYenShort, fmtNum, fmtPct, fmtDateShort, STORE_COLOR, STORES } = window.SalesAtoms;

const WEEKDAY = ["日", "月", "火", "水", "木", "金", "土"];

// Daily comparison: side-by-side bars per date (今期 vs 昨年)
const DailyComparisonChart = ({ rows, storeFilter }) => {
  // Aggregate by date
  const byDate = {};
  rows.forEach((r) => {
    if (storeFilter && storeFilter !== "all" && r.store !== storeFilter) return;
    if (!byDate[r.date]) byDate[r.date] = { sales: 0, lastYear: 0 };
    byDate[r.date].sales += r.sales || 0;
    byDate[r.date].lastYear += r.lastYear || 0;
  });
  const dates = Object.keys(byDate).sort();
  if (!dates.length) return <div style={{ padding: 40, textAlign: "center", color: "var(--ink-mute)" }}>データがありません</div>;
  const max = Math.max(1, ...dates.flatMap((d) => [byDate[d].sales, byDate[d].lastYear])) * 1.15;

  const w = 720, h = 320;
  const padL = 50, padR = 16, padT = 16, padB = 36;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const groupW = innerW / dates.length;
  const barW = Math.max(4, (groupW - 6) / 2);
  const [hover, setHover] = React.useState(null);

  // Y ticks
  const tickStep = max < 600000 ? 200000 : max < 1200000 ? 400000 : 1000000;
  const ticks = [];
  for (let v = 0; v <= max; v += tickStep) ticks.push(v);

  return (
    <div style={{ position: "relative", flex: 1, width: "100%", height: "100%" }}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%", display: "block" }}
           onMouseLeave={() => setHover(null)}>
        {/* gridlines */}
        {ticks.map((v) => {
          const y = padT + innerH - (v / max) * innerH;
          return (
            <g key={v}>
              <line x1={padL} x2={w - padR} y1={y} y2={y} stroke="var(--line)" strokeDasharray="2 4"/>
              <text x={padL - 6} y={y + 3} fontSize="9.5" fill="var(--ink-mute)" textAnchor="end">¥{Math.round(v / 10000)}万</text>
            </g>
          );
        })}
        {/* bars + labels */}
        {dates.map((d, i) => {
          const cx = padL + i * groupW + groupW / 2;
          const sales = byDate[d].sales;
          const lastYear = byDate[d].lastYear;
          const dt = new Date(d);
          const wd = WEEKDAY[dt.getDay()];
          const dayLabel = `${parseInt(d.slice(8, 10))}(${wd})`;
          const bhSales = (sales / max) * innerH;
          const bhLast = (lastYear / max) * innerH;
          return (
            <g key={d}>
              {/* current */}
              <rect
                x={cx - barW - 1} y={padT + innerH - bhSales}
                width={barW} height={Math.max(0, bhSales)}
                fill="var(--accent)" rx="2"
                onMouseEnter={() => setHover({ d, sales, lastYear, x: cx })}
              />
              {/* last year */}
              <rect
                x={cx + 1} y={padT + innerH - bhLast}
                width={barW} height={Math.max(0, bhLast)}
                fill="var(--ink-faint)" rx="2"
                onMouseEnter={() => setHover({ d, sales, lastYear, x: cx })}
              />
              <text x={cx} y={h - 14} fontSize="9.5" fill="var(--ink-mute)" textAnchor="middle">
                {dayLabel}
              </text>
            </g>
          );
        })}
        {/* tooltip */}
        {hover && (() => {
          const tx = Math.min(hover.x + 12, w - 130);
          const ty = padT + 12;
          return (
            <g transform={`translate(${tx},${ty})`}>
              <rect x="0" y="0" width="118" height="58" rx="8" fill="var(--ink)"/>
              <text x="10" y="16" fontSize="10" fill="rgba(255,255,255,0.65)">{hover.d}</text>
              <text x="10" y="32" fontSize="11" fill="white">今期 {fmtYen(hover.sales)}</text>
              <text x="10" y="48" fontSize="11" fill="rgba(255,255,255,0.7)">昨年 {fmtYen(hover.lastYear)}</text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
};

// Cumulative: line chart of accumulated sales over period
const CumulativeChart = ({ rows, storeFilter }) => {
  const byDate = {};
  rows.forEach((r) => {
    if (storeFilter && storeFilter !== "all" && r.store !== storeFilter) return;
    if (!byDate[r.date]) byDate[r.date] = { sales: 0, lastYear: 0 };
    byDate[r.date].sales += r.sales || 0;
    byDate[r.date].lastYear += r.lastYear || 0;
  });
  const dates = Object.keys(byDate).sort();
  if (!dates.length) return <div style={{ padding: 40, textAlign: "center", color: "var(--ink-mute)" }}>データがありません</div>;

  let accS = 0, accL = 0;
  const cum = dates.map((d, i) => {
    accS += byDate[d].sales;
    accL += byDate[d].lastYear;
    return { i, sales: accS, lastYear: accL };
  });

  const max = Math.max(1, ...cum.flatMap((p) => [p.sales, p.lastYear])) * 1.05;
  const w = 720, h = 240;
  const padL = 50, padR = 16, padT = 16, padB = 36;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const xs = cum.map((_, i) => padL + (i / Math.max(1, cum.length - 1)) * innerW);
  const ys = (v) => padT + innerH - (v / max) * innerH;

  const pathS = cum.map((p, i) => `${i === 0 ? "M" : "L"} ${xs[i]} ${ys(p.sales)}`).join(" ");
  const pathL = cum.map((p, i) => `${i === 0 ? "M" : "L"} ${xs[i]} ${ys(p.lastYear)}`).join(" ");
  const areaS = `${pathS} L ${xs[cum.length - 1]} ${padT + innerH} L ${xs[0]} ${padT + innerH} Z`;

  const tickStep = max < 5000000 ? 1000000 : max < 12000000 ? 2000000 : 5000000;
  const ticks = [];
  for (let v = 0; v <= max; v += tickStep) ticks.push(v);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id="cumFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={padL} x2={w - padR} y1={ys(v)} y2={ys(v)} stroke="var(--line)" strokeDasharray="2 4"/>
          <text x={padL - 6} y={ys(v) + 3} fontSize="9.5" fill="var(--ink-mute)" textAnchor="end">¥{Math.round(v / 10000)}万</text>
        </g>
      ))}
      <path d={areaS} fill="url(#cumFill)"/>
      <path d={pathL} fill="none" stroke="var(--ink-faint)" strokeWidth="2" strokeDasharray="4 4" strokeLinejoin="round"/>
      <path d={pathS} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round"/>
      {cum.map((p, i) => (
        <g key={i}>
          <circle cx={xs[i]} cy={ys(p.sales)} r="3" fill="var(--card)" stroke="var(--accent)" strokeWidth="1.5"/>
          {i % Math.max(1, Math.floor(cum.length / 8)) === 0 && (
            <text x={xs[i]} y={h - 14} fontSize="9.5" fill="var(--ink-mute)" textAnchor="middle">{i + 1}日目</text>
          )}
        </g>
      ))}
      <text x={xs[cum.length - 1]} y={h - 14} fontSize="9.5" fill="var(--ink-mute)" textAnchor="middle">{cum.length}日目</text>
    </svg>
  );
};

// Store comparison: horizontal grouped bars 今期 vs 昨年
const StoreComparisonChart = ({ rows }) => {
  const byStore = {};
  rows.forEach((r) => {
    if (!byStore[r.store]) byStore[r.store] = { sales: 0, lastYear: 0 };
    byStore[r.store].sales += r.sales || 0;
    byStore[r.store].lastYear += r.lastYear || 0;
  });
  const entries = Object.entries(byStore).sort((a, b) => b[1].sales - a[1].sales);
  if (!entries.length) return <div style={{ padding: 40, textAlign: "center", color: "var(--ink-mute)" }}>データがありません</div>;

  const max = Math.max(1, ...entries.flatMap(([, v]) => [v.sales, v.lastYear])) * 1.05;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "8px 4px", flex: 1, minHeight: 0, overflowY: "auto" }}>
      {entries.map(([store, v]) => {
        const yoy = v.lastYear > 0 ? Math.round(((v.sales - v.lastYear) / v.lastYear) * 1000) / 10 : null;
        return (
          <div key={store}>
            <div style={{ display: "flex", alignItems: "baseline", marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: STORE_COLOR[store] || "var(--ink-mute)" }}></span>
                {store}
              </span>
              <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-soft)", fontVariantNumeric: "tabular-nums" }}>
                {fmtYen(v.sales)}
                {yoy !== null && (
                  <span className={yoy >= 0 ? "delta-up" : "delta-down"} style={{ marginLeft: 8, fontSize: 11 }}>
                    {fmtPct(yoy)}
                  </span>
                )}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ height: 10, background: "var(--line)", borderRadius: 4, position: "relative", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(v.sales / max) * 100}%`, background: STORE_COLOR[store] || "var(--accent)", borderRadius: 4 }}></div>
              </div>
              <div style={{ height: 10, background: "var(--line)", borderRadius: 4, position: "relative", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(v.lastYear / max) * 100}%`, background: "var(--ink-faint)", borderRadius: 4 }}></div>
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 10.5, color: "var(--ink-mute)", marginTop: -2 }}>
                <span><span style={{ display: "inline-block", width: 8, height: 8, background: "var(--accent)", borderRadius: 2, marginRight: 4 }}></span>今期 {fmtYen(v.sales)}</span>
                <span><span style={{ display: "inline-block", width: 8, height: 8, background: "var(--ink-faint)", borderRadius: 2, marginRight: 4 }}></span>昨年 {fmtYen(v.lastYear)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Course breakdown: stacked horizontal bar per store
const COURSE_FIELDS = [
  { key: "regular",  label: "レギュラー", color: "var(--accent)" },
  { key: "standard", label: "スタンダード", color: "#EA4335" },
  { key: "premium",  label: "プレミアム", color: "#FBBC04" },
  { key: "delicate", label: "デリケート", color: "#34A853" },
  { key: "brand",    label: "ブランド",   color: "#5e97f6" },
];

const CourseChart = ({ rows }) => {
  const byStore = {};
  rows.forEach((r) => {
    if (!byStore[r.store]) byStore[r.store] = { regular: 0, standard: 0, premium: 0, delicate: 0, brand: 0 };
    COURSE_FIELDS.forEach((c) => { byStore[r.store][c.key] += r[c.key] || 0; });
  });
  const entries = Object.entries(byStore)
    .map(([store, v]) => ({ store, ...v, total: COURSE_FIELDS.reduce((s, c) => s + v[c.key], 0) }))
    .filter((e) => e.total > 0)
    .sort((a, b) => b.total - a.total);
  if (!entries.length) return <div style={{ padding: 40, textAlign: "center", color: "var(--ink-mute)" }}>データがありません</div>;
  const max = Math.max(1, ...entries.map((e) => e.total));

  // Totals
  const totals = COURSE_FIELDS.map((c) => ({ ...c, total: entries.reduce((s, e) => s + e[c.key], 0) }));
  const grandTotal = totals.reduce((s, c) => s + c.total, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, minHeight: 0, overflowY: "auto", padding: "4px 4px" }}>
      {/* Legend / totals strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
        {totals.map((c) => (
          <div key={c.key} style={{ padding: "10px 12px", background: "var(--card-2)", borderRadius: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--ink-soft)", fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, background: c.color, borderRadius: 2 }}></span>{c.label}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
              {fmtNum(c.total)}<span style={{ fontSize: 11, color: "var(--ink-mute)", fontWeight: 600 }}> 点</span>
            </div>
            <div style={{ fontSize: 10.5, color: "var(--ink-mute)" }}>
              {grandTotal ? ((c.total / grandTotal) * 100).toFixed(1) : 0}% / 全店
            </div>
          </div>
        ))}
      </div>
      {/* Per-store stacked bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {entries.map((e) => (
          <div key={e.store}>
            <div style={{ display: "flex", alignItems: "baseline", marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: STORE_COLOR[e.store] || "var(--ink-mute)" }}></span>
                {e.store}
              </span>
              <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-soft)", fontVariantNumeric: "tabular-nums" }}>
                {fmtNum(e.total)} 点
              </span>
            </div>
            <div style={{ display: "flex", height: 14, width: `${(e.total / max) * 100}%`, borderRadius: 7, overflow: "hidden", background: "var(--line)" }}>
              {COURSE_FIELDS.map((c) => {
                const pct = e.total ? (e[c.key] / e.total) * 100 : 0;
                if (pct <= 0) return null;
                return (
                  <div key={c.key} style={{ width: `${pct}%`, background: c.color }} title={`${c.label}: ${e[c.key]}点`}/>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

window.SalesCharts = { DailyComparisonChart, CumulativeChart, StoreComparisonChart, CourseChart, COURSE_FIELDS };
