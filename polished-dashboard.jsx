// Hi-fi みわダッシュボード — main view (v2 レイアウト)

// ★ アプリ版数 — 全データをフォルダ出力するたびに +0.01 する（2.01 スタート）
const APP_VERSION = "2.11";

const Sidebar = () => <AppSidebar active="dashboard" />;

// ── localStorage 読み出し（各ページが保存したデータを共有） ──
const dashLS = (key, fallback) => {
  try {
    const s = localStorage.getItem(key);
    if (s) {
      const v = JSON.parse(s);
      if (Array.isArray(v) ? v.length : (v != null)) return v;
    }
  } catch {}
  return fallback;
};

const NOW = new Date();
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseDate = (s) => { const d = new Date(s); return isNaN(d) ? null : d; };
const relTimeD = (s) => {
  const d = parseDate(s); if (!d) return "";
  const diff = NOW - d;
  if (diff < 0) return "予定";
  const m = Math.floor(diff / 6e4);
  if (m < 60) return `${Math.max(1, m)}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  const dd = Math.floor(h / 24);
  if (dd < 7) return `${dd}日前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
};
const mdLabel = (s) => { const d = parseDate(s); return d ? `${d.getMonth() + 1}/${d.getDate()}` : s; };
const fmtYen = (n) => "¥" + Math.round(n).toLocaleString("ja-JP");
const fmtK = (n) => "¥" + Math.round(n * 1000).toLocaleString("ja-JP");

// フォーム連携GAS（共有クラウドとは別エンドポイント）— ダッシュボード起動時の更新に使用
const DASH_ARIGATOU_GAS = "https://script.google.com/macros/s/AKfycbxCHJ4OB8uYtdEflKyld4h3oitjW2Tr80UihXnVTd_jyUREAWz0qF5ebGzJpUhq2eQh/exec";
const DASH_STAIN_GAS = "https://script.google.com/macros/s/AKfycbzkNu60eKOiHaBzWEH_5vRsVeErqrPhtkmhYSPNSdR7iZgiE3zIIFJAMQdU-E7cTo-7/exec";

// ════════════════════════════════════════════════════════
//  サンプルフォールバック（localStorage が空のとき用）
// ════════════════════════════════════════════════════════
const SAMPLE_ARIGATOU = [];
const SAMPLE_STAIN = [];
const SAMPLE_FACTORY = [];
const SAMPLE_NEWS = [];
const SAMPLE_INDUSTRY = [];

// ════════════════════════════════════════════════════════
//  Greeting
// ════════════════════════════════════════════════════════
const DAYJP = ["日", "月", "火", "水", "木", "金", "土"];

// ── 新着通知：各ページの localStorage 行数を前回既読と比較 ──
const NOTIFY_SOURCES = [
  { id: "feedback", key: "miwa.feedback.v3",  label: "フィードバック",     href: "フィードバック.html",                       icon: "💬" },
  { id: "stain",    key: "miwa.stain.v1",     label: "シミ抜き報告",       href: "シミ抜き報告.html",                         icon: "🧴" },
  { id: "thanks",   key: "miwa.arigatou.v1",  label: "ありがとうカード",   href: encodeURIComponent("ありがとうカード.html"), icon: "🙏" },
];
const notifySeenKey = (id) => `miwa.${id}.seenCount.v1`;
const notifyCount = (key) => {
  try { const a = JSON.parse(localStorage.getItem(key)); return Array.isArray(a) ? a.length : 0; }
  catch { return 0; }
};

const NotificationBell = () => {
  const [open, setOpen] = React.useState(false);
  const [news, setNews] = React.useState([]); // [{id,label,href,icon,count}]
  const ref = React.useRef(null);

  React.useEffect(() => {
    const compute = () => {
      const out = [];
      for (const s of NOTIFY_SOURCES) {
        const total = notifyCount(s.key);
        const seen = parseInt(localStorage.getItem(notifySeenKey(s.id)) || "0", 10);
        const count = Math.max(0, total - seen);
        if (count > 0) out.push({ ...s, count });
      }
      setNews(out);
    };
    compute();
    window.addEventListener("storage", compute);
    const t = setInterval(compute, 4000);
    return () => { window.removeEventListener("storage", compute); clearInterval(t); };
  }, []);

  React.useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const totalNew = news.reduce((a, b) => a + b.count, 0);

  return (
    <div className="notify" ref={ref}>
      <div className="icon-btn" onClick={() => setOpen((v) => !v)} title="新着の更新">
        {Ico.bell({})}
        {totalNew > 0 && <span className="notify-dot">{totalNew > 9 ? "9+" : totalNew}</span>}
      </div>
      {open && (
        <div className="notify-menu">
          <div className="notify-head">新着の更新{totalNew > 0 ? ` ・ ${totalNew}件` : ""}</div>
          {news.length === 0 ? (
            <div className="notify-empty">新着はありません</div>
          ) : (
            news.map((n) => (
              <a key={n.id} className="notify-item" href={n.href}>
                <span className="notify-ico">{n.icon}</span>
                <span className="notify-label">{n.label}</span>
                <span className="notify-count">{n.count}件の新着</span>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
};


// 天気コード → アイコン＋ラベル（Open-Meteo WMO weather code）
const WMO = (c) => {
  if (c === 0) return { i: "☀️", t: "快晴" };
  if (c <= 2) return { i: "🌤️", t: "晴れ" };
  if (c === 3) return { i: "☁️", t: "くもり" };
  if (c <= 48) return { i: "🌫️", t: "霧" };
  if (c <= 57) return { i: "🌦️", t: "霧雨" };
  if (c <= 67) return { i: "🌧️", t: "雨" };
  if (c <= 77) return { i: "🌨️", t: "雪" };
  if (c <= 82) return { i: "🌧️", t: "にわか雨" };
  if (c <= 86) return { i: "🌨️", t: "にわか雪" };
  if (c <= 99) return { i: "⛈️", t: "雷雨" };
  return { i: "🌡️", t: "—" };
};

const Greeting = ({ dark, setDark }) => {
  const [now, setNow] = React.useState(() => new Date());
  const [wx, setWx] = React.useState(null); // {temp, code, hi, lo}
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  React.useEffect(() => {
    let cancelled = false;
    const url = "https://api.open-meteo.com/v1/forecast?latitude=35.825&longitude=139.805"
      + "&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min"
      + "&timezone=Asia%2FTokyo&forecast_days=1";
    const load = () => fetch(url).then((r) => r.json()).then((d) => {
      if (cancelled || !d.current) return;
      setWx({
        temp: Math.round(d.current.temperature_2m),
        code: d.current.weather_code,
        hi: Math.round(d.daily.temperature_2m_max[0]),
        lo: Math.round(d.daily.temperature_2m_min[0]),
      });
    }).catch(() => {});
    load();
    const t = setInterval(load, 600000); // 10分ごとに更新
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const w = wx ? WMO(wx.code) : null;
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  return (
  <div className="greet">
    <div className="db-now">
      <div className="db-now-date">
        <span className="db-now-md">{now.getMonth() + 1}月{now.getDate()}日</span>
        <span className={`db-now-dow dow-${now.getDay()}`}>（{DAYJP[now.getDay()]}）</span>
        <span className="db-now-year">{now.getFullYear()}年</span>
      </div>
      <div className="db-now-clock">
        {hh}<span className="db-now-colon">:</span>{mm}<span className="db-now-sec">:{ss}</span>
      </div>
      <div className="db-wx-group">
        <div className="db-now-wx" title="埼玉県草加市の現在の天気">
          {w ? (
            <>
              <span className="db-wx-ico">{w.i}</span>
              <span className="db-wx-temp">{wx.temp}°</span>
              <span className="db-wx-meta">
                <span className="db-wx-place">草加市</span>
                <span className="db-wx-hilo">{w.t} ・ <span className="hi">↑{wx.hi}°</span> <span className="lo">↓{wx.lo}°</span></span>
              </span>
            </>
          ) : (
            <span className="db-wx-meta"><span className="db-wx-place">草加市</span><span className="db-wx-hilo">天気を取得中…</span></span>
          )}
        </div>
        <a className="db-version" href="更新レポート.html" title="更新レポートを見る（全データ出力ごとに更新）">v{APP_VERSION}</a>
      </div>
    </div>
    <div className="right">
      <a className="db-report-link" href="https://clmiwahotline-rgb.github.io/formsite/" target="_blank" rel="noopener" title="報告フォーム管理システムを開く">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/>
        </svg>
        <span>報告フォーム</span>
      </a>
      <a className="db-manual-link" href="機能説明書.html" target="_blank" rel="noopener" title="機能説明書・操作マニュアルを開く">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
        <span>機能説明書</span>
      </a>
      <NotificationBell />
    </div>
  </div>
  );
};

// ════════════════════════════════════════════════════════
//  1段目左：当月の日別売上（昨年実績付き）— 実データ（売上レポートと共有）
// ════════════════════════════════════════════════════════
const buildSalesSample = () => {
  const y = NOW.getFullYear(), mo = NOW.getMonth();
  const days = new Date(y, mo + 1, 0).getDate();
  const today = NOW.getDate();
  const ym = `${y}-${String(mo + 1).padStart(2, "0")}`;
  const rows = dashLS("miwa.sales.v9", []);
  const cur = new Array(days).fill(0), prev = new Array(days).fill(0);
  let hasData = false;
  (Array.isArray(rows) ? rows : []).forEach((r) => {
    const ds = String(r.date || "");
    if (ds.slice(0, 7) !== ym) return;
    const d = parseInt(ds.slice(8, 10), 10);
    if (!(d >= 1 && d <= days)) return;
    cur[d - 1] += (Number(r.sales) || 0) / 1000;       // ¥k/日
    prev[d - 1] += (Number(r.lastYear) || 0) / 1000;   // 昨年 ¥k/日
    hasData = true;
  });
  return { days, today, cur, prev, hasData };
};

const SalesDailyChart = ({ days, today, cur, prev }) => {
  const w = 660, h = 250;
  const padL = 44, padR = 14, padT = 14, padB = 26;
  const innerW = w - padL - padR, innerH = h - padT - padB;
  const yMax = Math.max(...cur, ...prev) * 1.18;
  const slot = innerW / days;
  const barW = Math.min(15, slot * 0.56);
  const xAt = (i) => padL + slot * i + slot / 2;
  const yAt = (v) => padT + innerH - (v / yMax) * innerH;

  const prevPts = prev.map((v, i) => [xAt(i), yAt(v)]);
  const prevPath = prevPts.map((p, i) => `${i ? "L" : "M"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const ticks = [];
  for (let d = 1; d <= days; d++) if (d === 1 || d === days || d % 5 === 0) ticks.push(d);

  return (
    <svg className="chart-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: 250 }}>
      {[0, 0.25, 0.5, 0.75, 1].map((p) => {
        const yv = yMax * p;
        return (
          <g key={p}>
            <line x1={padL} x2={w - padR} y1={yAt(yv)} y2={yAt(yv)} stroke="var(--line)" strokeDasharray="2 4"/>
            <text x={padL - 6} y={yAt(yv) + 3} fontSize="9.5" fill="var(--ink-mute)" textAnchor="end">{Math.round(yv)}</text>
          </g>
        );
      })}
      {/* 今年：日別バー */}
      {cur.map((v, i) => {
        const isToday = (i + 1) === today;
        const isFuture = (i + 1) > today;
        return (
          <rect key={i} x={xAt(i) - barW / 2} y={yAt(v)} width={barW} height={Math.max(0, padT + innerH - yAt(v))}
                rx="2.5"
                fill={isFuture ? "var(--card-2)" : (isToday ? "var(--accent)" : "color-mix(in oklch, var(--accent) 62%, transparent)")}>
            <title>{`${i + 1}日：${fmtK(v)}`}</title>
          </rect>
        );
      })}
      {/* 昨年：折れ線 */}
      <path d={prevPath} fill="none" stroke="var(--c-2)" strokeWidth="2.2" strokeLinejoin="round" strokeDasharray="1 0" opacity="0.9"/>
      {/* x ラベル */}
      {ticks.map((d) => (
        <text key={d} x={xAt(d - 1)} y={h - 8} fontSize="9.5" fill="var(--ink-mute)" textAnchor="middle">{d}</text>
      ))}
    </svg>
  );
};

const SalesProgressCard = () => {
  const { days, today, cur, prev, hasData } = React.useMemo(buildSalesSample, []);
  const curTotal = cur.slice(0, today).reduce((s, v) => s + v, 0) * 1000;
  const prevSame = prev.slice(0, today).reduce((s, v) => s + v, 0) * 1000;
  const prevMonth = prev.reduce((s, v) => s + v, 0) * 1000;
  const delta = prevSame ? ((curTotal - prevSame) / prevSame) * 100 : 0;
  const up = delta >= 0;
  if (!hasData) {
    return (
      <div className="chart-card">
        <div className="card-head">
          <h3 className="card-title">当月の日別売上</h3>
          <span className="card-sub">{NOW.getMonth() + 1}月 ・ 昨年実績比</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 250, gap: 8, color: "var(--ink-mute)" }}>
          <div style={{ fontSize: 32, opacity: 0.4 }}>📊</div>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>当月の売上データがまだありません</div>
          <a href="売上レポート.html" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent-ink)", textDecoration: "none" }}>売上レポートで取り込む →</a>
        </div>
      </div>
    );
  }
  return (
    <div className="chart-card">
      <div className="card-head">
        <h3 className="card-title">当月の日別売上</h3>
        <span className="card-sub">{NOW.getMonth() + 1}月 ・ 昨年実績比</span>
        <div className="chart-legend">
          <span className="lg"><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--accent)" }}></span>今年</span>
          <span className="lg"><span style={{ width: 14, height: 3, borderRadius: 2, background: "var(--c-2)" }}></span>昨年</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 28, alignItems: "flex-end", marginBottom: 6, flexWrap: "wrap" }}>
        <div>
          <div className="metric-cap">当月累計（{today}日時点）</div>
          <div className="metric-big" style={{ fontSize: 30 }}>{fmtYen(curTotal)}</div>
        </div>
        <div>
          <div className="metric-cap">前年同日</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--ink-soft)" }}>{fmtYen(prevSame)}</div>
        </div>
        <div className={`metric-delta ${up ? "up" : "down"}`} style={{ fontSize: 13, marginBottom: 4 }}>
          {up ? Ico.arrowUp() : Ico.arrowDown()} 前年比 {up ? "+" : ""}{delta.toFixed(1)}%
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div className="metric-cap">昨年 月間実績</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-mute)" }}>{fmtYen(prevMonth)}</div>
        </div>
      </div>
      <SalesDailyChart days={days} today={today} cur={cur} prev={prev} />
    </div>
  );
};

// ════════════════════════════════════════════════════════
//  1段目右：ありがとうカード 最新4件
// ════════════════════════════════════════════════════════
const THX_WARN = ["苦情", "不満", "クレーム"];
const ThanksLatest = () => {
  const data = dashLS("miwa.arigatou.v1", SAMPLE_ARIGATOU);
  const latest = [...data].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 3);
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column" }}>
      <div className="card-head">
        <h3 className="card-title">ありがとうカード</h3>
        <span className="card-sub">最新3件</span>
        <div className="right"><a className="link" href={encodeURIComponent("ありがとうカード.html")} style={{ textDecoration: "none" }}>すべて →</a></div>
      </div>
      <div className="thanks-list">
        {latest.map((t, i) => {
          const warn = THX_WARN.some((w) => (t.kind || "").includes(w));
          return (
            <div key={i} className={`thanks ${i === 0 && !warn ? "featured" : ""}`}>
              <div className={`thanks-av ${warn ? "pink" : "green"}`}>{(t.store || "店")[0]}</div>
              <div className="thanks-body">
                <div className="thanks-meta">
                  <StoreTag name={t.store} />
                  <span className="thanks-time">{relTimeD(t.date)}</span>
                </div>
                <div className="thanks-text" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t.content}</div>
                <div style={{ marginTop: 7 }}>
                  <span className={`pill ${warn ? "pill-thx-warn" : "pill-thx"}`}>{t.kind}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════
//  2段目①：フィードバック件数
// ════════════════════════════════════════════════════════
const FB_PALETTE = ["var(--accent)", "#4285F4", "#FBBC04", "#34A853", "#EA4335", "var(--c-2)"];
const FeedbackCountCard = () => {
  const rows = dashLS("miwa.feedback.v3", []);
  const monthPrefix = ymd(NOW).slice(0, 7);
  const monthRows = rows.filter((r) => (r.reportDate || "").startsWith(monthPrefix));
  const byType = {};
  monthRows.forEach((r) => { byType[r.type || "その他"] = (byType[r.type || "その他"] || 0) + 1; });
  const types = Object.entries(byType).sort((a, b) => b[1] - a[1]);
  return (
    <div className="card dash-card dash-half">
      <div className="card-head">
        <h3 className="card-title">フィードバック件数</h3>
        <span className="card-sub">今月</span>
        <div className="right"><a className="link" href={encodeURIComponent("フィードバック.html")} style={{ textDecoration: "none" }}>詳細 →</a></div>
      </div>
      <div className="fb-compact">
        <div style={{ flexShrink: 0 }}>
          <span className="metric-big" style={{ fontSize: 30 }}>{monthRows.length}<span className="u">件</span></span>
          <div className="metric-cap" style={{ marginTop: 4 }}>累計 {rows.length} 件</div>
        </div>
        <div className="fb-compact-chips">
          {types.length === 0 && <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>今月の報告はありません</div>}
          {types.slice(0, 6).map(([t, n], i) => {
            const c = FB_PALETTE[i % FB_PALETTE.length];
            return (
              <span key={t} className="fb-chip" style={{ background: `color-mix(in oklch, ${c} 15%, transparent)`, color: c }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: c }}></span>
                {t}<span className="n">{n}</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════
//  2段目②：昨日の八潮・東川口 生産性
// ════════════════════════════════════════════════════════
const totalPts = (r) => (r.normalLot || 0) + (r.extraLot || 0) + (r.advance || 0) + (r.storage || 0);
const FactoryProductivityCard = () => {
  const rows = dashLS("miwa.factory.v3", SAMPLE_FACTORY);
  const latestFor = (match) => {
    const f = rows.filter((r) => (r.factory || "").includes(match));
    if (!f.length) return null;
    return [...f].sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
  };
  const yd = ymd(new Date(NOW.getTime() - 864e5));
  const facs = [
    { key: "八潮", label: "八潮ドライ" },
    { key: "東川口", label: "東川口ワイシャツ" },
  ].map((f) => {
    const r = latestFor(f.key);
    const prod = r && r.hours > 0 ? totalPts(r) / r.hours : 0;
    return { ...f, r, prod, isYesterday: r && r.date === yd };
  });
  return (
    <div className="card dash-card dash-half">
      <div className="card-head">
        <h3 className="card-title">工場の生産性</h3>
        <span className="card-sub">昨日</span>
        <div className="right"><a className="link" href={encodeURIComponent("工場報告.html")} style={{ textDecoration: "none" }}>詳細 →</a></div>
      </div>
      <div style={{ marginTop: 2 }}>
        {facs.map((f) => (
          <div key={f.key} className="fac-row">
            <div>
              <div className="fac-name">{f.label}</div>
              <div className="fac-sub">
                {f.r
                  ? (f.isYesterday ? `昨日 ${mdLabel(f.r.date)} ・ 総${totalPts(f.r).toLocaleString()}点` : `直近 ${mdLabel(f.r.date)} ・ 総${totalPts(f.r).toLocaleString()}点`)
                  : "データなし"}
              </div>
            </div>
            <div className="fac-prod">
              <b>{f.r ? f.prod.toFixed(1) : "—"}</b><span className="u">点/h</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════
//  2段目③：直近1か月のシミ抜き除去率
// ════════════════════════════════════════════════════════
const StainRateCard = () => {
  const rows = dashLS("miwa.stain.v1", SAMPLE_STAIN);
  const since = ymd(new Date(NOW.getTime() - 30 * 864e5));
  const recent = rows.filter((r) => (r.date || "") >= since);
  const processed = recent.reduce((s, r) => s + (parseInt(r.processed) || 0), 0);
  // 実データは removalRate（= 除去成功率）を保持。件数は rate×処理数で復元
  const removed = recent.reduce((s, r) => s + Math.round((parseFloat(r.removalRate) || 0) * (parseInt(r.processed) || 0)), 0);
  const rate = processed ? (removed / processed) * 100 : 0;
  const R = 42, C = 2 * Math.PI * R, len = (rate / 100) * C;

  return (
    <div className="card dash-card dash-half">
      <div className="card-head">
        <h3 className="card-title">シミ抜き除去率</h3>
        <span className="card-sub">直近1か月</span>
        <div className="right"><a className="link" href={encodeURIComponent("シミ抜き報告.html")} style={{ textDecoration: "none" }}>詳細 →</a></div>
      </div>
      <div className="stain-mini">
        <svg className="ring-svg" viewBox="0 0 104 104">
          <circle cx="52" cy="52" r={R} fill="none" stroke="var(--line)" strokeWidth="11"/>
          <circle cx="52" cy="52" r={R} fill="none" stroke="var(--accent)" strokeWidth="11" strokeLinecap="round"
                  strokeDasharray={`${len} ${C}`} strokeDashoffset="0" transform="rotate(-90 52 52)"/>
          <text x="52" y="50" textAnchor="middle" fontSize="22" fontWeight="800" fill="var(--ink)">{rate.toFixed(1)}</text>
          <text x="52" y="66" textAnchor="middle" fontSize="10" fill="var(--ink-mute)">％</text>
        </svg>
        <div className="stain-mini-stats">
          <div className="stain-mini-stat">
            <div className="metric-cap">除去率</div>
            <div className="v">{rate.toFixed(1)}<span className="u">％</span></div>
          </div>
          <div className="stain-mini-stat">
            <div className="metric-cap">処理件数</div>
            <div className="v">{processed}<span className="u">件</span></div>
          </div>
          <div className="stain-mini-stat">
            <div className="metric-cap">除去成功</div>
            <div className="v" style={{ color: "var(--accent-ink)" }}>{removed}<span className="u">件</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════
//  リスト自動フィット：カードの空き高さに収まるだけ件数を出す
// ════════════════════════════════════════════════════════
const useFitCount = (total) => {
  const ref = React.useRef(null);
  const cache = React.useRef([]);
  const [n, setN] = React.useState(total);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const compute = () => {
      const heights = cache.current;
      if (!heights.length) return;
      const H = el.clientHeight;
      if (!H) return;
      let acc = 0, k = 0;
      for (let i = 0; i < total; i++) {
        acc += heights[i] || 0;
        if (acc > H + 1) break;
        k++;
      }
      setN(Math.max(1, k));
    };
    if (cache.current.length !== total) {
      if (n === total && el.children.length === total) {
        cache.current = Array.from(el.children).map((c) => c.offsetHeight);
      } else {
        if (n !== total) setN(total);
        return;
      }
    }
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [total, n]);
  return [ref, n];
};

// ════════════════════════════════════════════════════════
//  3段目①：業界ニュース（カードに収まるだけ表示）
// ════════════════════════════════════════════════════════
const dashArticleOk = (u) => {
  if (!u || !/^https?:\/\//.test(u)) return false;
  const h = ((u.match(/^https?:\/\/([^\/]+)/) || [])[1] || "").toLowerCase();
  if (!h || h.indexOf(".") === -1) return false;
  if (/google\.com|google\.co|googleusercontent|gstatic|ggpht/.test(h)) return false;
  if (/\.(png|jpe?g|gif|webp|svg|ico|bmp)(\?|$)/i.test(u)) return false;
  return true;
};
const dashNewsKey = (it) => {
  const t = (it.title || "").toLowerCase()
    .replace(/[\s\u3000・,、。!?！？\-–—|｜「」『』【】]/g, "")
    .replace(/[…]|\.{2,}/g, "");
  return t.slice(0, 36) || (it.link || "");
};
const dashDedupeNews = (arr) => {
  const seen = new Set(); const out = [];
  for (const it of arr) { const k = dashNewsKey(it); if (!k || seen.has(k)) continue; seen.add(k); out.push(it); }
  return out;
};
const IndustryNewsLatest = () => {
  const items = dashLS("miwa.industry.items.v1", SAMPLE_INDUSTRY);
  const sorted = dashDedupeNews([...items].sort((a, b) => (b.date || 0) - (a.date || 0)));
  const [listRef, n] = useFitCount(sorted.length);
  const shown = sorted.slice(0, n);
  const linkFor = (it) => dashArticleOk(it.link) ? it.link : `https://search.yahoo.co.jp/search?p=${encodeURIComponent(it.title)}&ei=UTF-8`;
  const srcFor = (it) => (it.source && !/google/i.test(it.source)) ? it.source : (it.keyword || "ニュース");
  return (
    <div className="card dash-card">
      <div className="card-head">
        <h3 className="card-title">業界ニュース</h3>
        <span className="card-sub">新着 {n}件</span>
        <div className="right"><a className="link" href={encodeURIComponent("業界ニュース.html")} style={{ textDecoration: "none" }}>もっと見る →</a></div>
      </div>
      <div className="dl-list" ref={listRef} style={{ height: 304, overflow: "hidden" }}>
        {shown.map((it, i) => (
          <a key={i} className="dl-item" href={linkFor(it)} target="_blank" rel="noopener noreferrer">
            <span className="dl-idx">{i + 1}</span>
            <div style={{ minWidth: 0 }}>
              <div className="dl-title">{it.title}</div>
              <div className="dl-meta"><span className="src">{srcFor(it)}</span><span>{relTimeD(it.date ? new Date(it.date) : null)}</span></div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════
//  3段目②：お知らせ（カードに収まるだけ表示）
// ════════════════════════════════════════════════════════
const NoticeLatest = () => {
  const posts = dashLS("miwa.news.v1", SAMPLE_NEWS);
  const sorted = [...posts].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const [listRef, n] = useFitCount(sorted.length);
  const shown = sorted.slice(0, n);
  return (
    <div className="card dash-card">
      <div className="card-head">
        <h3 className="card-title">お知らせ</h3>
        <span className="card-sub">新着 {n}件</span>
        <div className="right"><a className="link" href={encodeURIComponent("お知らせ.html")} style={{ textDecoration: "none" }}>もっと見る →</a></div>
      </div>
      <div className="dl-list" ref={listRef} style={{ height: 304, overflow: "hidden" }}>
        {shown.map((p, i) => (
          <a key={p.id || i} className="dl-item" href={p.link && p.link !== "#" ? p.link : encodeURIComponent("お知らせ.html")} target={p.link && p.link !== "#" ? "_blank" : "_self"} rel="noopener noreferrer">
            <span className="dl-idx">{mdLabel(p.date)}</span>
            <div style={{ minWidth: 0 }}>
              <div className="dl-title">{p.title}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════
//  現在の出勤スタッフ（横長・店舗別 ・ 20時以降は翌日の出勤に切替）
// ════════════════════════════════════════════════════════
const DOW_JP = ["日", "月", "火", "水", "木", "金", "土"];

const TodayShiftCard = () => {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const SHIFT = (typeof window !== "undefined" && window.SHIFT_2026_06) || null;
  if (!SHIFT) {
    return (
      <div className="card">
        <div className="card-head"><h3 className="card-title">現在の出勤スタッフ</h3></div>
        <div className="shift-now-empty">シフトデータを読み込めませんでした</div>
      </div>
    );
  }

  // スタッフが実際に入っている日付（定休日・休業日を除外）
  const staffedDates = [];
  const sset = new Set();
  SHIFT.stores.forEach((s) => (s.staff || []).forEach((st) => {
    Object.keys(st.cells || {}).forEach((d) => { if (st.cells[d] && st.cells[d].time && !sset.has(d)) { sset.add(d); } });
  }));
  sset.forEach((d) => staffedDates.push(d));
  staffedDates.sort();

  const todayISO = ymd(now);
  // 20時以降は「翌日の出勤スタッフ」に切替
  const tomorrowMode = now.getHours() >= 20;

  let eff, label;
  if (tomorrowMode) {
    const tISO = ymd(new Date(now.getTime() + 864e5));
    eff = staffedDates.find((d) => d >= tISO) || staffedDates[staffedDates.length - 1];
  } else {
    eff = sset.has(todayISO) ? todayISO : (staffedDates.filter((d) => d <= todayISO).pop() || staffedDates[0]);
  }

  // 当日モードは現在時刻（営業時間に丸め）で勤務中を抽出。翌日モードは全出勤者
  const nowH = now.getHours() + now.getMinutes() / 60;
  const refH = Math.min(18.99, Math.max(9, nowH));
  const filterNow = !tomorrowMode;

  const groups = SHIFT.stores.map((s) => {
    const arr = [];
    (s.staff || []).forEach((st) => {
      const c = st.cells && st.cells[eff];
      if (c && c.time && (!filterNow || (c.time.s <= refH && refH < c.time.e))) arr.push({ name: st.name, time: c.time });
    });
    ((s.help && s.help[eff]) || []).forEach((h) => {
      if (h && h.time && (!filterNow || (h.time.s <= refH && refH < h.time.e))) arr.push({ name: h.name, time: h.time, help: true });
    });
    return { store: s.store, people: arr };
  }).filter((g) => g.people.length > 0);

  const total = groups.reduce((a, b) => a + b.people.length, 0);
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const effD = new Date(eff + "T00:00:00");
  const dateLbl = `${effD.getMonth() + 1}/${effD.getDate()}（${DOW_JP[effD.getDay()]}）`;

  const title = tomorrowMode ? `${dateLbl}の出勤予定` : "現在の出勤スタッフ";
  const sub = tomorrowMode
    ? `翌日 ・ ${total}名`
    : `${hh}:${mm} 時点 ・ ${total}名${eff === todayISO ? "" : ` ・ ${dateLbl}`}`;

  return (
    <div className="card">
      <div className="card-head">
        <h3 className="card-title">{title}</h3>
        <span className="card-sub">{sub}</span>
        <div className="right"><a className="link" href={encodeURIComponent("シフト.html")} style={{ textDecoration: "none" }}>シフト表 →</a></div>
      </div>
      {groups.length === 0 ? (
        <div className="shift-now-empty">{tomorrowMode ? "翌日の出勤予定はありません" : "現在出勤中のスタッフはいません"}</div>
      ) : (
        <div className="shift-strip">
          {groups.map((g) => (
            <div key={g.store} className="shift-pill">
              <span className="shift-pill-head">
                <StoreTag name={g.store} />
                <span className="n">{g.people.length}</span>
              </span>
              <span className="shift-pill-people">
                {g.people.map((p, i) => (
                  <span key={i} className="shift-pill-person">
                    <b>{p.name}</b>
                    {p.help && <span className="help-tag">応援</span>}
                    <span className="t">{p.time.text}</span>
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════
//  要対応①：クレーム・事故品の簡易表示（未解決）
// ════════════════════════════════════════════════════════
const CLAIM_TYPE_COLOR = {
  "クレーム": { c: "#c5221f", b: "#fde2e2" }, "破損": { c: "#d9730a", b: "#fdebcf" },
  "紛失": { c: "#8430ce", b: "#f3e8fd" }, "変色": { c: "#9a6700", b: "#fef3cd" },
  "付着": { c: "#1a73e8", b: "#e3f0fd" }, "その他": { c: "#5f6368", b: "#eef0f2" },
};
const CLAIM_STATUS_COLOR = {
  "受付": { c: "#1a73e8", b: "#e3f0fd" }, "対応中": { c: "#d9730a", b: "#fdebcf" },
  "解決": { c: "#1e8e3e", b: "#e6f4ea" }, "弁償": { c: "#8430ce", b: "#f3e8fd" },
};
const CLAIM_UNRESOLVED_ST = ["受付", "対応中"];
const SAMPLE_CLAIM_DASH = [];
const ClaimSummaryCard = () => {
  const rows = dashLS("miwa.claim.v1", SAMPLE_CLAIM_DASH);
  const unresolved = rows.filter((c) => CLAIM_UNRESOLVED_ST.includes(c.status));
  const sorted = [...unresolved].sort((a, b) => (b.receivedOn || "").localeCompare(a.receivedOn || ""));
  return (
    <div className="card dash-card">
      <div className="card-head">
        <h3 className="card-title">⚠ クレーム・事故品</h3>
        <span className="card-sub">{unresolved.length ? `未解決 ${unresolved.length}件` : "未解決なし"}</span>
        <div className="right"><a className="link" href={encodeURIComponent("クレーム・事故品.html")} style={{ textDecoration: "none" }}>一覧 →</a></div>
      </div>
      {unresolved.length === 0 ? (
        <div className="db-mini-empty">未解決のクレーム・事故品はありません 🎉</div>
      ) : (
        <div className="cl-dash-list">
          {sorted.slice(0, 4).map((c, i) => {
            const t = CLAIM_TYPE_COLOR[c.type] || CLAIM_TYPE_COLOR["その他"];
            const s = CLAIM_STATUS_COLOR[c.status] || CLAIM_STATUS_COLOR["受付"];
            return (
              <div key={i} className="cl-dash-row">
                <span className="cl-dash-badge" style={{ background: t.b, color: t.c }}>{c.type}</span>
                <StoreTag name={c.store} />
                <span className="cl-dash-item">{c.item || "（品目未記入）"}</span>
                <span className="cl-dash-badge" style={{ background: s.b, color: s.c }}>{c.status}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════
//  要対応②：車両の期限が近い項目
// ════════════════════════════════════════════════════════
const VEH_DUE_ITEMS = [
  { key: "inspectionDue", label: "車検", warn: 60 },
  { key: "insuranceDue", label: "保険", warn: 30 },
];
const SAMPLE_VEH_DASH = [];
const daysUntilD = (s) => {
  const d = parseDate(s); if (!d) return null;
  const t = new Date(ymd(NOW) + "T00:00:00");
  return Math.round((new Date(ymd(d) + "T00:00:00") - t) / 864e5);
};
const dueStatusD = (days, warn) => {
  if (days == null) return null;
  if (days < 0) return { cls: "overdue", label: `${-days}日超過` };
  if (days === 0) return { cls: "overdue", label: "本日" };
  if (days <= 14) return { cls: "urgent", label: `あと${days}日` };
  if (days <= warn) return { cls: "warn", label: `あと${days}日` };
  return { cls: "ok", label: `あと${days}日` };
};
const VEH_RANK = { overdue: 0, urgent: 1, warn: 2 };
// オイル：6000km または 7か月 ／ 空気圧：2か月（前回からの間隔）
const addMonthsD = (iso, m) => { if (!iso) return null; const d = new Date(iso + "T00:00:00"); d.setMonth(d.getMonth() + m); return ymd(d); };
const oilStatusD = (v) => {
  const lastOdo = Number(v.oilLastOdo) || 0;
  const remKm = lastOdo > 0 ? 6000 - ((Number(v.odometer) || 0) - lastOdo) : null;
  const nd = addMonthsD(v.oilLastDate, 7); const remDays = nd ? daysUntilD(nd) : null;
  if (remKm == null && remDays == null) return null;
  const lbl = remKm != null ? `残${Math.max(0, remKm)}km` : `あと${remDays}日`;
  if ((remKm != null && remKm <= 0) || (remDays != null && remDays <= 0)) return { cls: "overdue", label: "交換時期" };
  if ((remKm != null && remKm <= 800) || (remDays != null && remDays <= 14)) return { cls: "urgent", label: lbl };
  if ((remKm != null && remKm <= 1500) || (remDays != null && remDays <= 30)) return { cls: "warn", label: lbl };
  return null;
};
const tireStatusD = (v) => {
  const nd = addMonthsD(v.tireLastDate, 2); const days = nd ? daysUntilD(nd) : null;
  if (days == null) return null;
  if (days <= 0) return { cls: "overdue", label: days === 0 ? "本日" : `${-days}日超過` };
  if (days <= 7) return { cls: "urgent", label: `あと${days}日` };
  if (days <= 14) return { cls: "warn", label: `あと${days}日` };
  return null;
};
const VehicleDueCard = () => {
  const rows = dashLS("miwa.vehicle.v1", SAMPLE_VEH_DASH);
  const alerts = [];
  rows.forEach((v) => {
    VEH_DUE_ITEMS.forEach((it) => {
      const st = dueStatusD(daysUntilD(v[it.key]), it.warn);
      if (st && (st.cls === "overdue" || st.cls === "urgent" || st.cls === "warn"))
        alerts.push({ vehicle: v.name, item: it.label, rank: VEH_RANK[st.cls], ...st });
    });
    const oil = oilStatusD(v); if (oil) alerts.push({ vehicle: v.name, item: "オイル", rank: VEH_RANK[oil.cls], ...oil });
    const tire = tireStatusD(v); if (tire) alerts.push({ vehicle: v.name, item: "空気圧", rank: VEH_RANK[tire.cls], ...tire });
  });
  alerts.sort((a, b) => a.rank - b.rank);
  return (
    <div className="card dash-card">
      <div className="card-head">
        <h3 className="card-title">🚚 車両の期限</h3>
        <span className="card-sub">{alerts.length ? `要対応 ${alerts.length}件` : "余裕あり"}</span>
        <div className="right"><a className="link" href={encodeURIComponent("車両管理.html")} style={{ textDecoration: "none" }}>詳細 →</a></div>
      </div>
      {alerts.length === 0 ? (
        <div className="db-mini-empty">直近で期限が近い項目はありません</div>
      ) : (
        <div className="veh-alert-list">
          {alerts.slice(0, 4).map((a, i) => (
            <div key={i} className={`veh-alert-row veh-due-${a.cls}`}>
              <span className={`veh-alert-pill veh-due-${a.cls}`}>{a.label}</span>
              <span className="veh-alert-item">{a.item}</span>
              <span className="veh-alert-vehicle">{a.vehicle}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════
//  Dashboard
// ════════════════════════════════════════════════════════
const Dashboard = () => {
  const [dark, setDark] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);
  // 初回オープン時：共有クラウド＋フォーム連携GASから最新を取得して反映（取得中はスピナー表示）
  // ※ 各ページを開かなくてもダッシュボードだけで最新化される。表示はキャッシュ(localStorage)で即時。
  React.useEffect(() => {
    let cancelled = false;
    const tasks = [];
    // 共有クラウド：クレーム・車両・共有事項・フィードバック
    if (typeof cloudEnabled === "function" && cloudEnabled() && typeof cloudGet === "function") {
      const sheets = [["クレーム", "miwa.claim.v1"], ["車両", "miwa.vehicle.v1"], ["共有事項", "miwa.board.v1"], ["フィードバック", "miwa.feedback.v3"]];
      sheets.forEach(([sheet, key]) => tasks.push(cloudGet(sheet).then((r) => {
        if (!Array.isArray(r) || !r.length) return;
        const norm = r.map((x) => {
          if (typeof x.files === "string") { try { return { ...x, files: JSON.parse(x.files) }; } catch { return { ...x, files: [] }; } }
          return x;
        });
        try { localStorage.setItem(key, JSON.stringify(norm)); } catch {}
      }).catch(() => {})));
    }
    // フォーム連携GAS：ありがとうカード・シミ抜き（設定URLがあれば優先）
    const gsUrl = (settingsKey, fallback) => { try { const s = JSON.parse(localStorage.getItem(settingsKey)); if (s && s.url) return s.url; } catch {} return fallback; };
    tasks.push(fetch(gsUrl("miwa.arigatou.settings.v1", DASH_ARIGATOU_GAS), { redirect: "follow" })
      .then((r) => r.json()).then((d) => { if (Array.isArray(d)) { try { localStorage.setItem("miwa.arigatou.v1", JSON.stringify(d)); } catch {} } }).catch(() => {}));
    tasks.push(fetch(gsUrl("miwa.stain.settings.v1", DASH_STAIN_GAS), { redirect: "follow" })
      .then((r) => r.json()).then((d) => {
        if (Array.isArray(d)) { const f = d.filter((r) => (Number(r.processed) || 0) > 0 && (Number(r.amount) || 0) > 0); try { localStorage.setItem("miwa.stain.v1", JSON.stringify(f)); } catch {} }
      }).catch(() => {}));

    if (!tasks.length) return;
    setRefreshing(true);
    Promise.all(tasks).then(() => { if (!cancelled) { setRefreshing(false); setTick((t) => t + 1); } });
    return () => { cancelled = true; };
  }, []);
  return (
    <div className="app">
      <div className="shell">
        <Sidebar />
        <main className="main">
          <Greeting dark={dark} setDark={setDark} />
          {refreshing && <div className="db-refresh"><span className="db-spin"></span>最新の情報に更新中…</div>}

          {/* 共有事項ボード */}
          <ShareBoard />

          {/* 1段目：売上 + ありがとう */}
          <div className="grid">
            <SalesProgressCard />
            <ThanksLatest />
          </div>

          {/* 2段目：要対応（クレーム・車両期限） */}
          <div className="grid-eq2">
            <ClaimSummaryCard />
            <VehicleDueCard />
          </div>

          {/* 3段目：KPI（フィードバック・工場・シミ抜き） */}
          <div className="grid-eq3">
            <FeedbackCountCard />
            <FactoryProductivityCard />
            <StainRateCard />
          </div>

          {/* 4段目：現在の出勤スタッフ（横長・店舗別） */}
          <TodayShiftCard />

          {/* 5段目：業界ニュース + お知らせ */}
          <div className="grid-eq2">
            <IndustryNewsLatest />
            <NoticeLatest />
          </div>
        </main>
      </div>
    </div>
  );
};

window.Dashboard = Dashboard;
