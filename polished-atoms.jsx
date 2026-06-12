// Hi-fi みわダッシュボード — polished SaaS aesthetic

// ── Icons (inline SVG, 18×18) ─────────────────────────────
const Ico = {
  grid: (s) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={s} className="nav-ico"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  chart: (s) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={s} className="nav-ico"><path d="M3 20h18"/><path d="M6 16V10"/><path d="M11 16V6"/><path d="M16 16v-9"/><path d="M21 16v-4"/></svg>,
  spot: (s) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={s} className="nav-ico"><path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/></svg>,
  factory: (s) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={s} className="nav-ico"><path d="M3 20V9l5 3V9l5 3V9l5 3v8H3z"/><path d="M8 16h2M13 16h2M17 16h.01"/></svg>,
  truck: (s) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={s} className="nav-ico"><path d="M1 4h13v11H1z"/><path d="M14 8h4l3 3v4h-7V8z"/><circle cx="5.5" cy="18" r="1.8"/><circle cx="17.5" cy="18" r="1.8"/></svg>,
  alert: (s) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={s} className="nav-ico"><path d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>,
  feedback: (s) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={s} className="nav-ico"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
  sparkle: (s) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={s} className="nav-ico"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3"/></svg>,
  heart: (s) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={s} className="nav-ico"><path d="M20.84 4.6a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.07a5.5 5.5 0 0 0-7.78 7.78l1.06 1.07L12 21.23l7.78-7.78 1.06-1.07a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  bell: (s) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={s} className="nav-ico"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>,
  news: (s) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={s} className="nav-ico"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h10M7 17h6"/></svg>,
  store: (s) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={s} className="nav-ico"><path d="M4 8h16l-1 4H5L4 8z"/><path d="M5 12v8h14v-8"/><path d="M3 8l2-4h14l2 4"/></svg>,
  board: (s) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={s} className="nav-ico"><path d="M3 11l15-4v10L3 13z"/><path d="M18 8.5a2.5 2.5 0 0 1 0 5"/><path d="M9 13v4a2 2 0 0 0 3.5 1.3"/></svg>,
  faq: (s) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={s} className="nav-ico"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/><path d="M9.6 9.2a2.4 2.4 0 0 1 4.7.6c0 1.6-2.4 2.4-2.4 2.4" strokeWidth="1.6"/><path d="M12 16h.01" strokeWidth="2"/></svg>,
  cog: (s) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={s} className="nav-ico"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>,
  search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>,
  plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 5v14M5 12h14"/></svg>,
  invoice: (s) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={s} className="nav-ico"><path d="M5 3h11l3 3v15l-2.5-1.5L14 21l-2.5-1.5L9 21l-2.5-1.5L5 21V3z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>,
  sun: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>,
  moon: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  arrowUp: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="m6 14 6-6 6 6"/></svg>,
  arrowDown: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="m6 10 6 6 6-6"/></svg>,
  more: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>,
};

// ── Sparkline ──────────────────────────────────────────────
const Sparkline = ({ data, color, fill, dir = "up" }) => {
  const w = 200, h = 48;
  const max = Math.max(...data), min = Math.min(...data);
  const range = Math.max(1, max - min);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 6 - ((v - min) / range) * (h - 12)]);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;
  const gid = `sg-${color.replace(/[^a-z0-9]/gi, "")}-${dir}`;
  return (
    <svg className="kpi-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity="0.45"/>
          <stop offset="100%" stopColor={fill} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`}/>
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
};

// ── Big area chart ─────────────────────────────────────────
const AreaChart = () => {
  const w = 600, h = 260;
  const labels = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
  // Two series — Revenue (sales) + Thanks count
  const sales =   [55, 62, 58, 70, 68, 76, 82, 78, 88, 92, 86, 95];
  const thanks =  [40, 48, 52, 55, 60, 58, 65, 72, 70, 78, 76, 84];

  const xs = labels.map((_, i) => 36 + (i / (labels.length - 1)) * (w - 60));
  const yScale = (v) => h - 28 - (v / 100) * (h - 60);

  const smooth = (pts) => {
    // simple Catmull-Rom-ish smoothing
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
    }
    return d;
  };

  const salesPts = sales.map((v, i) => [xs[i], yScale(v)]);
  const thanksPts = thanks.map((v, i) => [xs[i], yScale(v)]);
  const salesPath = smooth(salesPts);
  const thanksPath = smooth(thanksPts);
  const salesArea = `${salesPath} L ${xs[xs.length - 1]} ${h - 28} L ${xs[0]} ${h - 28} Z`;
  const thanksArea = `${thanksPath} L ${xs[xs.length - 1]} ${h - 28} L ${xs[0]} ${h - 28} Z`;

  // Highlight current month (May = idx 4)
  const cur = 4;

  return (
    <svg className="chart-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="grSales" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.45"/>
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="grThanks" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--c-2)" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="var(--c-2)" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {/* Y gridlines */}
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1="36" x2={w - 24} y1={yScale(v)} y2={yScale(v)} stroke="var(--line)" strokeDasharray="2 4"/>
          <text x="0" y={yScale(v) + 4} fontSize="10" fill="var(--ink-mute)">{v === 0 ? "0" : `${v}`}</text>
        </g>
      ))}
      {/* Thanks area + line (behind) */}
      <path d={thanksArea} fill="url(#grThanks)"/>
      <path d={thanksPath} fill="none" stroke="var(--c-2)" strokeWidth="2.5" strokeLinejoin="round"/>
      {/* Sales area + line */}
      <path d={salesArea} fill="url(#grSales)"/>
      <path d={salesPath} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round"/>
      {/* Highlighted point */}
      <line x1={xs[cur]} x2={xs[cur]} y1={yScale(sales[cur]) + 6} y2={h - 28} stroke="var(--ink-faint)" strokeDasharray="2 3"/>
      <circle cx={xs[cur]} cy={yScale(sales[cur])} r="6" fill="var(--card)" stroke="var(--accent)" strokeWidth="2.5"/>
      <circle cx={xs[cur]} cy={yScale(thanks[cur])} r="5" fill="var(--card)" stroke="var(--c-2)" strokeWidth="2"/>
      {/* Tooltip-like floating */}
      <g transform={`translate(${xs[cur] + 10}, ${yScale(sales[cur]) - 36})`}>
        <rect x="0" y="0" rx="8" width="90" height="44" fill="var(--ink)" />
        <text x="10" y="16" fontSize="9.5" fill="rgba(255,255,255,0.6)" letterSpacing="0.06em">5月 ・ 今月</text>
        <text x="10" y="32" fontSize="12" fontWeight="700" fill="white">¥ 8.42M</text>
      </g>
      {/* X labels */}
      {labels.map((l, i) => (
        <text key={l} x={xs[i]} y={h - 8} fontSize="10" fill="var(--ink-mute)" textAnchor="middle">{l}</text>
      ))}
    </svg>
  );
};

// ── Donut ──────────────────────────────────────────────────
const Donut = ({ items }) => {
  const total = items.reduce((s, i) => s + i.value, 0);
  let acc = 0;
  const r = 42, cx = 55, cy = 55, c = 2 * Math.PI * r;
  return (
    <svg className="donut-svg" viewBox="0 0 110 110">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line)" strokeWidth="10"/>
      {items.map((it, i) => {
        const len = (it.value / total) * c;
        const offset = c - acc;
        acc += len;
        return (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={it.color}
            strokeWidth="10"
            strokeDasharray={`${len} ${c}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
      })}
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="20" fontWeight="800" fill="var(--ink)">{total}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="9" fill="var(--ink-mute)" letterSpacing="0.08em">件 / 今月</text>
    </svg>
  );
};

Object.assign(window, { Ico, Sparkline, AreaChart, Donut });

// ── 店舗カラー（全ページ共通） ─────────────────────────────
// { bg: 塗り, fg: 文字色 }
const STORE_TAG_COLORS = {
  "本店":                 { bg: "#ffa500", fg: "#ffffff" },
  "新田店":               { bg: "#008000", fg: "#ffffff" },
  "草加西口店":           { bg: "#afeeee", fg: "#000000" },
  "モールプラザ草加店":   { bg: "#1e90ff", fg: "#ffffff" },
  "蒲生店":               { bg: "#9370db", fg: "#ffffff" },
  "西友蒲生伊原店":       { bg: "#fa8072", fg: "#000000" },
  "東川口店":             { bg: "#ffffff", fg: "#000000" },
  "東川口2号店":          { bg: "#ffffff", fg: "#00bfff" },
  "マミーマート川口安行店": { bg: "#ffff00", fg: "#000000" },
  "八潮工場":             { bg: "#475569", fg: "#ffffff" },
  "東川口工場":           { bg: "#0f766e", fg: "#ffffff" },
  "ルート":               { bg: "#b45309", fg: "#ffffff" },
};
// 表記ゆれ（データ側の別名）→ 上のキーに対応
const STORE_ALIASES = {
  "モールプラザ草加": "モールプラザ草加店",
  "マミー川口安行店": "マミーマート川口安行店",
  "マミーマート川口安行": "マミーマート川口安行店",
  "東川口2号店": "東川口2号店",
  "東川口２号店": "東川口2号店",
};
const storeColor = (raw) => {
  const name = (raw || "").trim();
  if (!name) return null;
  if (STORE_TAG_COLORS[name]) return STORE_TAG_COLORS[name];
  if (STORE_ALIASES[name] && STORE_TAG_COLORS[STORE_ALIASES[name]]) return STORE_TAG_COLORS[STORE_ALIASES[name]];
  // 末尾「店」有無のゆれを吸収して完全一致のみ許可
  const stem = name.replace(/店$/, "");
  for (const k of Object.keys(STORE_TAG_COLORS)) {
    if (k.replace(/店$/, "") === stem) return STORE_TAG_COLORS[k];
  }
  return null;
};
// 店舗名チップ
const StoreTag = ({ name, style, className = "" }) => {
  const c = storeColor(name);
  if (!c) return <span className={`store-tag store-tag-none ${className}`} style={style}>{name}</span>;
  const isWhite = /^#(f{3}|f{6})$/i.test(c.bg);
  return (
    <span className={`store-tag ${className}`}
          style={{ background: c.bg, color: c.fg, border: isWhite ? "1px solid var(--line-strong)" : "1px solid transparent", ...style }}>
      {name}
    </span>
  );
};

Object.assign(window, { STORE_TAG_COLORS, storeColor, StoreTag });
