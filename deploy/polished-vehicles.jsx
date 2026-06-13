// 車両管理 — 車両一覧 / 期限アラート / 給油・燃費 / 整備履歴
// クラウド共有：シート「車両」「給油」「整備」。入力は Google フォーム参照。
// localStorage: miwa.vehicle.v1 / miwa.fuel.v1 / miwa.maint.v1 / miwa.vehicle.forms.v1

const NOW_V = new Date();

// ── サンプルデータ（クラウド未接続/空のとき）──────────────
const SEED_VEHICLES = [];

const SEED_FUEL = [];

const SEED_MAINT = [];

// ── ユーティリティ ──────────────────────────────────────
const ymdV = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const TODAY_ISO = ymdV(NOW_V);
const fmtYenV = (n) => "¥" + Math.round(n || 0).toLocaleString("ja-JP");
const fmtKm = (n) => Math.round(n || 0).toLocaleString("ja-JP") + " km";
const dateJP = (s) => {
  if (!s) return "—";
  const d = new Date(s + "T00:00:00");
  if (isNaN(d)) return s;
  const w = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}（${w}）`;
};
const daysUntil = (s) => {
  if (!s) return null;
  const d = new Date(s + "T00:00:00");
  if (isNaN(d)) return null;
  const t = new Date(TODAY_ISO + "T00:00:00");
  return Math.round((d - t) / 864e5);
};
// 月数を加算した日付（ISO）を返す
const addMonthsV = (iso, m) => { if (!iso) return null; const d = new Date(iso + "T00:00:00"); d.setMonth(d.getMonth() + m); return ymdV(d); };

// 期限のステータス（日数ベース・しきい値は項目ごと）
const dueStatus = (days, warnAt) => {
  if (days == null) return { cls: "na", label: "未設定" };
  if (days < 0) return { cls: "overdue", label: `${-days}日 超過` };
  if (days === 0) return { cls: "overdue", label: "本日期限" };
  if (days <= 14) return { cls: "urgent", label: `あと${days}日` };
  if (days <= warnAt) return { cls: "warn", label: `あと${days}日` };
  return { cls: "ok", label: `あと${days}日` };
};

// オイル交換：前回からの走行が 6000km、または前回から 7か月 経過でアラート（早い方）
const OIL_KM = 6000, OIL_MONTHS = 7, TIRE_MONTHS = 2, WASH_DAYS = 60;
const oilStatus = (v) => {
  const odo = Number(v.odometer) || 0;
  const lastOdo = Number(v.oilLastOdo) || 0;
  const remKm = lastOdo > 0 ? OIL_KM - (odo - lastOdo) : null;       // 残り走行 km
  const nextDate = addMonthsV(v.oilLastDate, OIL_MONTHS);
  const remDays = nextDate ? daysUntil(nextDate) : null;             // 残り日数（7か月まで）
  if (remKm == null && remDays == null) return { cls: "na", label: "未設定", sub: "前回記録なし" };
  const overdue = (remKm != null && remKm <= 0) || (remDays != null && remDays <= 0);
  const urgent  = (remKm != null && remKm <= 800) || (remDays != null && remDays <= 14);
  const warn    = (remKm != null && remKm <= 1500) || (remDays != null && remDays <= 30);
  const cls = overdue ? "overdue" : urgent ? "urgent" : warn ? "warn" : "ok";
  const km = remKm != null ? Math.max(0, remKm) : null;
  const dys = remDays != null ? Math.max(0, remDays) : null;
  const label = overdue ? "交換時期"
    : km != null && dys != null ? `残${km}km/${dys}日`
    : km != null ? `残${km}km` : `あと${dys}日`;
  const sub = `前回 ${v.oilLastDate ? dateJP(v.oilLastDate) : "—"}${lastOdo > 0 ? " ・ " + fmtKm(lastOdo) : ""}`;
  return { cls, label, sub };
};
// 空気圧チェック：前回から 2か月 ごと
const tireStatus = (v) => {
  const nextDate = addMonthsV(v.tireLastDate, TIRE_MONTHS);
  const days = nextDate ? daysUntil(nextDate) : null;
  if (days == null) return { cls: "na", label: "未設定", sub: "前回記録なし" };
  const cls = days <= 0 ? "overdue" : days <= 7 ? "urgent" : days <= 14 ? "warn" : "ok";
  const label = days <= 0 ? (days === 0 ? "本日" : `${-days}日 超過`) : `あと${days}日`;
  return { cls, label, sub: `前回 ${dateJP(v.tireLastDate)}` };
};
// 洗車：前回から 60日 ごと（前回日は整備履歴の「洗車」記録から自動取得）
const washStatus = (v) => {
  if (!v.washLastDate) return { cls: "na", label: "未設定", sub: "記録なし" };
  const last = new Date(v.washLastDate + "T00:00:00");
  if (isNaN(last)) return { cls: "na", label: "未設定", sub: "記録なし" };
  const nextDate = ymdV(new Date(last.getTime() + WASH_DAYS * 864e5));
  const days = daysUntil(nextDate);
  const cls = days <= 0 ? "overdue" : days <= 7 ? "urgent" : days <= 14 ? "warn" : "ok";
  const label = days <= 0 ? (days === 0 ? "本日" : `${-days}日 超過`) : `あと${days}日`;
  return { cls, label, sub: `前回 ${dateJP(v.washLastDate)}` };
};

// 期限項目の定義（type=date は満了日、oil/tire/wash は前回からの間隔で判定）
const DUE_ITEMS = [
  { key: "inspectionDue", label: "車検",     type: "date", warn: 60 },
  { key: "oil",           label: "オイル交換", type: "oil" },
  { key: "tire",          label: "空気圧チェック", type: "tire" },
  { key: "wash",          label: "洗車", type: "wash" },
];
// 各項目の状態を統一的に返す { cls, label, sub }
const itemStatus = (v, it) => {
  if (it.type === "oil") return oilStatus(v);
  if (it.type === "tire") return tireStatus(v);
  if (it.type === "wash") return washStatus(v);
  const st = dueStatus(daysUntil(v[it.key]), it.warn);
  return { ...st, sub: v[it.key] ? dateJP(v[it.key]) : "未設定" };
};
const STATUS_RANK = { overdue: 0, urgent: 1, warn: 2, ok: 3, na: 4 };

// ── localStorage ────────────────────────────────────────
const vehLoad = (key, seed) => {
  try { const s = localStorage.getItem(key); if (s) { const v = JSON.parse(s); if (Array.isArray(v)) return v; } } catch {}
  return seed;
};
const vehSave = (key, rows) => { try { localStorage.setItem(key, JSON.stringify(rows)); } catch {} };

// 燃費（km/L）：車両ごとに連続する給油記録のオドメーター差 ÷ 給油量で算出
const computeFuelEconomy = (fuel) => {
  const byV = {};
  fuel.forEach((r) => {
    const v = r.vehicle || "—";
    (byV[v] = byV[v] || []).push({ odo: parseFloat(r.odometer) || 0, l: parseFloat(r.liters) || 0, date: r.date });
  });
  const out = {};
  Object.entries(byV).forEach(([v, arr]) => {
    arr.sort((a, b) => a.odo - b.odo);
    let dist = 0, liters = 0;
    for (let i = 1; i < arr.length; i++) {
      const d = arr[i].odo - arr[i - 1].odo;
      if (d > 0 && d < 3000) { dist += d; liters += arr[i].l; }
    }
    out[v] = liters > 0 ? dist / liters : null;
  });
  return out;
};

// ── クラウド共有データ層 ────────────────────────────────
const useVehicleData = () => {
  const cloudOn = (typeof cloudEnabled === "function") && cloudEnabled();
  const [vehicles, setVehicles] = React.useState(() => vehLoad("miwa.vehicle.v1", SEED_VEHICLES));
  const [fuel, setFuel] = React.useState(() => vehLoad("miwa.fuel.v1", SEED_FUEL));
  const [maint, setMaint] = React.useState(() => vehLoad("miwa.maint.v1", SEED_MAINT));
  const [cloudState, setCloudState] = React.useState(cloudOn ? "loading" : "off");
  const [lastSync, setLastSync] = React.useState(null);

  React.useEffect(() => { vehSave("miwa.vehicle.v1", vehicles); }, [vehicles]);
  React.useEffect(() => { vehSave("miwa.fuel.v1", fuel); }, [fuel]);
  React.useEffect(() => { vehSave("miwa.maint.v1", maint); }, [maint]);

  const pull = React.useCallback(async () => {
    if (!cloudOn) return;
    setCloudState("loading");
    const [v, f, m] = await Promise.all([cloudGet("車両"), cloudGet("給油"), cloudGet("整備")]);
    if (v == null && f == null && m == null) { setCloudState("error"); return; }
    if (Array.isArray(v)) {
      if (v.length) setVehicles(v.map((r) => ({ ...r, odometer: parseFloat(r.odometer) || 0 })));
      else if (vehicles.length) await cloudReplaceAll("車両", vehicles);
    }
    if (Array.isArray(f)) {
      if (f.length) setFuel(f);
      else if (fuel.length) await cloudReplaceAll("給油", fuel);
    }
    if (Array.isArray(m)) {
      if (m.length) setMaint(m);
      else if (maint.length) await cloudReplaceAll("整備", maint);
    }
    setCloudState("ok");
    setLastSync(Date.now());
  }, [cloudOn]);

  React.useEffect(() => { pull(); }, [pull]);
  React.useEffect(() => {
    if (!cloudOn) return;
    const t = setInterval(pull, 60000);
    return () => clearInterval(t);
  }, [cloudOn, pull]);

  // ── 追加 / 更新 / 削除（localStorage 即時 ＋ クラウド同期）──
  const mkMut = (setter, sheet) => ({
    upsert: (row, isNew) => {
      setter((prev) => {
        const key = row.id;
        return prev.some((x) => x.id === key) ? prev.map((x) => (x.id === key ? row : x)) : [row, ...prev];
      });
      if (cloudOn) { if (isNew) cloudAdd(sheet, row); else cloudUpdate(sheet, row.id, row); }
    },
    remove: (id) => {
      setter((prev) => prev.filter((x) => x.id !== id));
      if (cloudOn) cloudDelete(sheet, id);
    },
  });
  const vehicleMut = React.useMemo(() => mkMut(setVehicles, "車両"), [cloudOn]);
  const fuelMut = React.useMemo(() => mkMut(setFuel, "給油"), [cloudOn]);
  const maintMut = React.useMemo(() => mkMut(setMaint, "整備"), [cloudOn]);

  return { vehicles, fuel, maint, cloudOn, cloudState, lastSync, pull, vehicleMut, fuelMut, maintMut };
};

// ── 期限チップ ──────────────────────────────────────────
const DueChip = ({ v, it }) => {
  const st = itemStatus(v, it);
  return (
    <div className={`veh-due veh-due-${st.cls}`}>
      <div className="veh-due-label">{it.label}</div>
      <div className="veh-due-date">{st.sub}</div>
      <div className="veh-due-badge">{st.label}</div>
    </div>
  );
};

// ── 車両カード ──────────────────────────────────────────
const VehicleCard = ({ v, economy, report, onEdit }) => {
  // 最も切迫した期限でカードの左帯色を決める
  const worst = DUE_ITEMS.reduce((acc, it) => {
    const st = itemStatus(v, it);
    return STATUS_RANK[st.cls] < STATUS_RANK[acc] ? st.cls : acc;
  }, "ok");
  return (
    <div className={`veh-card veh-rim-${worst}`}>
      <div className="veh-card-head">
        <div>
          <div className="veh-plate">{v.name}</div>
          <div className="veh-model">{v.model}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <StoreTag name={v.store} />
          {onEdit && <button className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => onEdit(v)}>編集</button>}
        </div>
      </div>
      <div className="veh-meta">
        <span className="veh-meta-item"><span className="k">担当</span>{v.staff || "—"}</span>
        <span className="veh-meta-item"><span className="k">走行</span>{fmtKm(v.odometer)}</span>
        {economy != null && <span className="veh-meta-item"><span className="k">燃費</span>{economy.toFixed(1)} km/L</span>}
      </div>
      <div className="veh-report">
        <span className="veh-report-k">直近の報告</span>
        {report
          ? <span className="veh-report-v"><b>{(report.date || "").replaceAll("-", "/")}</b>　<span className={`veh-report-tag veh-report-${report.kind}`}>{report.label}</span>{report.odo ? `　${fmtKm(report.odo)}` : ""}</span>
          : <span className="veh-report-v veh-report-none">報告なし</span>}
      </div>
      <div className="veh-due-grid">
        {DUE_ITEMS.map((it) => <DueChip key={it.key} v={v} it={it} />)}
      </div>
    </div>
  );
};

// ── アラートバナー ──────────────────────────────────────
const AlertBanner = ({ vehicles }) => {
  const alerts = [];
  vehicles.forEach((v) => {
    DUE_ITEMS.forEach((it) => {
      const st = itemStatus(v, it);
      if (st.cls === "overdue" || st.cls === "urgent" || st.cls === "warn") {
        alerts.push({ vehicle: v.name, item: it.label, sub: st.sub, cls: st.cls, label: st.label, rank: STATUS_RANK[st.cls] });
      }
    });
  });
  alerts.sort((a, b) => a.rank - b.rank);

  if (!alerts.length) {
    return (
      <div className="veh-alert-empty">✓ 直近で期限が近い項目はありません（全車両 余裕あり）</div>
    );
  }
  return (
    <div className="card veh-alert-card">
      <div className="card-head">
        <h3 className="card-title">⚠ 期限が近い項目</h3>
        <span className="card-sub">{alerts.length}件 ・ 車検60日／オイル6000kmか7か月・空気圧2か月・洗車60日で表示</span>
      </div>
      <div className="veh-alert-list">
        {alerts.map((a, i) => (
          <div key={i} className={`veh-alert-row veh-due-${a.cls}`}>
            <span className={`veh-alert-pill veh-due-${a.cls}`}>{a.label}</span>
            <span className="veh-alert-item">{a.item}</span>
            <span className="veh-alert-vehicle">{a.vehicle}</span>
            <span className="veh-alert-date">{a.sub}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── KPI ─────────────────────────────────────────────────
const VehicleKpi = ({ vehicles, fuel }) => {
  const count = vehicles.length;
  let needAttention = 0;
  vehicles.forEach((v) => {
    const worst = DUE_ITEMS.reduce((acc, it) => {
      const st = itemStatus(v, it);
      return STATUS_RANK[st.cls] < STATUS_RANK[acc] ? st.cls : acc;
    }, "ok");
    if (worst === "overdue" || worst === "urgent" || worst === "warn") needAttention++;
  });
  const thisMonth = TODAY_ISO.slice(0, 7);
  const monthFuel = fuel.filter((f) => (f.date || "").startsWith(thisMonth) || (f.date || "").startsWith("2026-05"));
  const fuelAmount = monthFuel.reduce((s, f) => s + (parseFloat(f.amount) || 0), 0);
  const eco = computeFuelEconomy(fuel);
  const ecoVals = Object.values(eco).filter((x) => x != null);
  const avgEco = ecoVals.length ? ecoVals.reduce((a, b) => a + b, 0) / ecoVals.length : 0;

  const card = (label, value, sub, accent, valueColor) => (
    <div className="kpi" style={{ borderTop: `3px solid ${accent}`, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
      <div className="kpi-label"><span className="kpi-dot" style={{ background: accent }}></span>{label}</div>
      <div className="kpi-value" style={{ color: valueColor || accent, fontSize: 30 }}>{value}</div>
      <div className="kpi-delta">{sub}</div>
    </div>
  );
  return (
    <div className="kpi-row kpi-row-4">
      {card("🚚 保有台数", count + " 台", "全拠点", "var(--accent)")}
      {card("⚠ 要対応", needAttention + " 台", "期限が近い車両", needAttention > 0 ? "#EA4335" : "#34A853", needAttention > 0 ? "#EA4335" : "#34A853")}
      {card("⛽ 給油額", fmtYenV(fuelAmount), "直近月", "#4285F4")}
      {card("📈 平均燃費", avgEco ? avgEco.toFixed(1) + " km/L" : "—", "全車平均", "#FBBC04")}
    </div>
  );
};

// ── 給油・燃費 ──────────────────────────────────────────
const FuelSection = ({ fuel, onAdd, onEdit }) => {
  const eco = computeFuelEconomy(fuel);
  const sorted = [...fuel].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return (
    <div className="card">
      <div className="card-head">
        <h3 className="card-title">⛽ 給油記録・燃費</h3>
        <div className="right" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="card-sub">直近 {sorted.length} 件</span>
          {onAdd && <button className="btn btn-ghost" onClick={onAdd}>＋ 給油記録</button>}
        </div>
      </div>
      {sorted.length === 0 ? (
        <div className="veh-empty">給油記録がありません</div>
      ) : (
        <div className="veh-table">
          <div className="veh-tr veh-th">
            <span>日付</span><span>車両</span><span className="num">給油量</span><span className="num">金額</span><span className="num">オドメーター</span><span className="num">燃費</span>
          </div>
          {sorted.map((f, i) => (
            <div key={f.id || i} className="veh-tr" onClick={onEdit ? () => onEdit(f) : null} style={onEdit ? { cursor: "pointer" } : null}>
              <span>{(f.date || "").replaceAll("-", "/")}</span>
              <span className="veh-td-vehicle">{f.vehicle}</span>
              <span className="num">{(parseFloat(f.liters) || 0).toFixed(1)} L</span>
              <span className="num">{fmtYenV(f.amount)}</span>
              <span className="num">{fmtKm(f.odometer)}</span>
              <span className="num">{eco[f.vehicle] != null ? eco[f.vehicle].toFixed(1) + " km/L" : "—"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── 整備・修理履歴 ──────────────────────────────────────
const MAINT_COLOR = {
  "車検": "#EA4335", "法定点検": "#4285F4", "点検": "#4285F4",
  "オイル交換": "#FBBC04", "修理": "#EA4335", "タイヤ交換": "#34A853", "洗車": "#00A0B0", "整備": "#5f6368",
};
const MaintSection = ({ maint, onAdd, onEdit }) => {
  const sorted = [...maint].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return (
    <div className="card">
      <div className="card-head">
        <h3 className="card-title">🔧 整備・修理履歴</h3>
        <div className="right" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="card-sub">直近 {sorted.length} 件</span>
          {onAdd && <button className="btn btn-ghost" onClick={onAdd}>＋ 整備記録</button>}
        </div>
      </div>
      {sorted.length === 0 ? (
        <div className="veh-empty">整備記録がありません</div>
      ) : (
        <div className="veh-maint-list">
          {sorted.map((m, i) => (
            <div key={m.id || i} className="veh-maint-row" onClick={onEdit ? () => onEdit(m) : null} style={onEdit ? { cursor: "pointer" } : null}>
              <div className="veh-maint-date">{(m.date || "").replaceAll("-", "/")}</div>
              <span className="veh-maint-type" style={{ background: (MAINT_COLOR[m.type] || "#5f6368") + "22", color: MAINT_COLOR[m.type] || "#5f6368" }}>{m.type}</span>
              <div className="veh-maint-main">
                <div className="veh-maint-vehicle">{m.vehicle}</div>
                <div className="veh-maint-detail">{m.detail}{m.shop ? ` ・ ${m.shop}` : ""}</div>
              </div>
              <div className="veh-maint-cost">{m.cost ? fmtYenV(m.cost) : ""}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Google フォーム入力リンク（設定可能）──────────────────
const FORMS_KEY = "miwa.vehicle.forms.v1";
const FORM_DEFS = [
  { key: "vehicle", label: "車両情報の更新", icon: "🚚" },
  { key: "fuel",    label: "給油記録の入力", icon: "⛽" },
  { key: "maint",   label: "整備・修理の入力", icon: "🔧" },
];
const FormLinks = () => {
  const [urls, setUrls] = React.useState(() => { try { return JSON.parse(localStorage.getItem(FORMS_KEY)) || {}; } catch { return {}; } });
  const [editing, setEditing] = React.useState(false);
  const save = (next) => { setUrls(next); try { localStorage.setItem(FORMS_KEY, JSON.stringify(next)); } catch {} };

  return (
    <div className="card veh-forms-card">
      <div className="card-head">
        <h3 className="card-title">📝 入力フォーム（Google フォーム）</h3>
        <div className="right">
          <button className="btn btn-ghost" onClick={() => setEditing(!editing)}>{editing ? "完了" : "フォームURL設定"}</button>
        </div>
      </div>
      {editing ? (
        <div className="veh-form-edit">
          {FORM_DEFS.map((f) => (
            <div key={f.key} className="field">
              <label className="field-label">{f.icon} {f.label}</label>
              <input className="input" placeholder="https://docs.google.com/forms/.../viewform"
                     value={urls[f.key] || ""} onChange={(e) => save({ ...urls, [f.key]: e.target.value })} />
            </div>
          ))}
          <div className="veh-form-hint">Google フォームの送信先スプレッドシートのシート名を「車両」「給油」「整備」にすると、このページに自動反映されます。</div>
        </div>
      ) : (
        <div className="veh-form-btns">
          {FORM_DEFS.map((f) => (
            urls[f.key]
              ? <a key={f.key} className="veh-form-btn" href={urls[f.key]} target="_blank" rel="noopener"><span className="ic">{f.icon}</span>{f.label}<span className="go">開く →</span></a>
              : <button key={f.key} className="veh-form-btn disabled" onClick={() => setEditing(true)}><span className="ic">{f.icon}</span>{f.label}<span className="go">URL未設定</span></button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── 直近の報告（給油・整備・洗車を新しい順に一覧）──────────
const RecentReports = ({ fuel, maint }) => {
  const items = [];
  fuel.forEach((r) => items.push({
    id: r.id, date: r.date, vehicle: r.vehicle, kind: "fuel", label: "給油",
    detail: [`${(parseFloat(r.liters) || 0).toFixed(1)}L`, r.amount ? fmtYenV(r.amount) : "", r.odometer ? fmtKm(r.odometer) : ""].filter(Boolean).join(" ・ "),
  }));
  maint.forEach((r) => items.push({
    id: r.id, date: r.date, vehicle: r.vehicle, kind: r.type === "洗車" ? "wash" : "maint", label: r.type || "整備",
    detail: [r.detail, r.shop, r.cost ? fmtYenV(r.cost) : ""].filter(Boolean).join(" ・ "),
  }));
  items.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const [showAll, setShowAll] = React.useState(false);
  const shown = showAll ? items : items.slice(0, 5);
  return (
    <div className="card">
      <div className="card-head">
        <h3 className="card-title">🕒 直近の報告</h3>
        <div className="right" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="card-sub">給油・整備・洗車 ・ 全 {items.length} 件</span>
          {items.length > 5 && <button className="btn btn-ghost" onClick={() => setShowAll(!showAll)}>{showAll ? "最新5件のみ" : "すべて表示"}</button>}
        </div>
      </div>
      {shown.length === 0 ? (
        <div className="veh-empty">まだ報告がありません（フォームから取込で反映されます）</div>
      ) : (
        <div className="veh-report-list">
          {shown.map((it, i) => (
            <div key={it.id || i} className="veh-report-row">
              <span className="veh-report-row-date">{(it.date || "").replaceAll("-", "/")}</span>
              <span className={`veh-report-tag veh-report-${it.kind}`}>{it.label}</span>
              <span className="veh-report-row-vehicle">{it.vehicle || "—"}</span>
              <span className="veh-report-row-detail">{it.detail}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 車両フォーム回答シートのCSVダイレクト取込（GAS未接続時のフォールバック）
const VEH_FORM_CSV_KEY = 'miwa.vehicle.formCsvUrl.v1';
const VEH_FORM_CSV_DEFAULT = 'https://docs.google.com/spreadsheets/d/1gkGDEGAO8NW-70lk_HmA1e0Elhb1rka9iDMAFfDGlxQ/gviz/tq?tqx=out:csv&gid=0';
function vehParseCSV(text) {
  const rows=[]; let row=[],cur='',q=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(q){if(c=='"'){if(text[i+1]=='"'){cur+='"';i++;}else q=false;}else cur+=c;}else if(c=='"')q=true;else if(c===','){row.push(cur);cur='';}else if(c==='\n'){row.push(cur);rows.push(row);row=[];cur='';}else if(c!=='\r')cur+=c;}
  if(cur||row.length){row.push(cur);rows.push(row);}
  return rows;
}
function vehColIdx(headers, re) { return headers.findIndex(h => re.test(h)); }
async function vehImportCsvDirect(fuelState, maintState) {
  let url = '';
  try { url = localStorage.getItem(VEH_FORM_CSV_KEY)||''; } catch(e){}
  if (!url) url = VEH_FORM_CSV_DEFAULT;
  if (url.includes('/edit')) {
    const m = url.match(/\/d\/([A-Za-z0-9_-]+)/);
    const gid = (url.match(/[?#&]gid=(\d+)/)||[])[1]||'0';
    if (m) url = `https://docs.google.com/spreadsheets/d/${m[1]}/gviz/tq?tqx=out:csv&gid=${gid}`;
  }
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error('CSV取得失敗 HTTP' + res.status);
  const text = await res.text();
  const rows = vehParseCSV(text);
  if (rows.length < 2) return { fuel: 0, maint: 0 };
  const H = rows[0].map(h => (h||'').replace(/\s+/g,' ').trim());
  const ci = (re) => vehColIdx(H, re);
  const cTs=0, cDate=ci(/日付/), cVeh=ci(/車両/), cType=ci(/どのような報告/);
  const cLit=ci(/給油量/), cAmt=ci(/金額/), cOdo=ci(/走行距離/);
  const cMType=ci(/どんな整備|整備.*行/), cCost=ci(/費用/), cDetail=ci(/内容/), cShop=ci(/店舗|整備工場/);
  // formTsをISO形式に正規化（重複検知用）
  function normTs(ts) {
    if (!ts) return '';
    const s = String(ts).trim();
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0,16); // 秒以下無視で分単位比較
    const m = s.match(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (m) {
      // スプレッドシートのタイムスタンプはJST（UTC+9）→UTCに変換して比較
      const jstMs = Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3]),Number(m[4]),Number(m[5]),Number(m[6]||0));
      const utcMs = jstMs - 9*3600000;
      return new Date(utcMs).toISOString().slice(0,16);
    }
    return s.slice(0,16);
  }
  // 既存のformTsセット（重複防止）
  const seenF = new Set((fuelState||[]).map(r=>normTs(r.formTs)).filter(Boolean));
  const seenM = new Set((maintState||[]).map(r=>normTs(r.formTs)).filter(Boolean));
  const newFuel=[], newMaint=[];
  for(let i=1;i<rows.length;i++){
    const r=rows[i]; if(r.every(c=>!c)) continue;
    const ts=r[cTs]||''; if(!ts) continue;
    const date=(cDate>=0?r[cDate]:'')||ts.slice(0,10);
    const isoDate = date.replace(/\//g,'-').slice(0,10);
    const vehicle=r[cVeh]||'';
    const typeRaw=cType>=0?r[cType]:'';
    const liters=parseFloat(cLit>=0?r[cLit]:'')||0;
    const amount=parseFloat(cAmt>=0?r[cAmt]:'')||0;
    const odo=parseFloat(cOdo>=0?r[cOdo]:'')||0;
    const maintType=cMType>=0?r[cMType]:'';
    const cost=parseFloat(cCost>=0?r[cCost]:'')||0;
    const detail=cDetail>=0?r[cDetail]:'';
    const shop=cShop>=0?r[cShop]:'';
    const isWash=/洗車/.test(typeRaw);
    const isFuel=/給油/.test(typeRaw);
    const isMaint=isWash||/整備|修理|点検|車検|タイヤ|オイル/.test(typeRaw)||!!maintType||!!detail;
    const isoTs = normTs(ts);
    if(isFuel&&!seenF.has(isoTs)){
      newFuel.push({id:'VF'+Date.now()+Math.floor(Math.random()*100),formTs:isoTs,date:isoDate,vehicle,liters,amount,odometer:odo});
      seenF.add(isoTs);
    }
    if(isMaint&&!seenM.has(isoTs)){
      newMaint.push({id:'VM'+Date.now()+Math.floor(Math.random()*100),formTs:isoTs,date:isoDate,vehicle,type:isWash?'洗車':(maintType||'整備'),detail,cost,shop});
      seenM.add(isoTs);
    }
  }
  return { newFuel, newMaint, fuel: newFuel.length, maint: newMaint.length };
}
const VEH_STORES = ["本部", "本店", "新田店", "草加西口店", "モール草加店", "蒲生店", "西友伊原店", "東川口店", "東川口2号店", "マミー安行店", "八潮工場", "東川口工場", "ルート"];

const VField = ({ label, children, full }) => (
  <div className="field" style={full ? { gridColumn: "1 / -1" } : null}>
    <label className="field-label">{label}</label>
    {children}
  </div>
);

const VehicleEditor = ({ initial, vehicles, onClose, onSave, onDelete }) => {
  const isNew = !initial;
  const [f, setF] = React.useState(() => initial ? { ...initial } : {
    id: "v" + Date.now(), name: "", model: "", store: "", staff: "", odometer: 0,
    inspectionDue: "", insuranceDue: "", oilLastDate: "", oilLastOdo: 0, tireLastDate: "",
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const save = () => {
    if (!f.name.trim()) { alert("ナンバー（車両名）を入力してください"); return; }
    onSave({ ...f, odometer: Number(f.odometer) || 0, oilLastOdo: Number(f.oilLastOdo) || 0 }, isNew);
    onClose();
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div><h2>{isNew ? "車両を追加" : "車両を編集"}</h2><div className="sub">ナンバー・車種・配備拠点・各種期限を設定</div></div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <VField label="ナンバー（車両名）"><input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="例：草加 800 あ 12-34" /></VField>
            <VField label="車種"><input className="input" value={f.model} onChange={(e) => set("model", e.target.value)} placeholder="例：トヨタ ハイエース" /></VField>
            <VField label="配備拠点">
              <select className="input" value={f.store} onChange={(e) => set("store", e.target.value)}>
                <option value="">選択してください</option>
                {VEH_STORES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </VField>
            <VField label="担当者"><input className="input" value={f.staff} onChange={(e) => set("staff", e.target.value)} placeholder="例：集配 / 田中" /></VField>
            <VField label="走行距離（現在の km）"><input className="input" type="number" inputMode="numeric" value={f.odometer} onChange={(e) => set("odometer", e.target.value)} /></VField>
            <VField label="車検 満了日"><input className="input" type="date" value={f.inspectionDue} onChange={(e) => set("inspectionDue", e.target.value)} /></VField>
            <VField label="前回オイル交換 日"><input className="input" type="date" value={f.oilLastDate} onChange={(e) => set("oilLastDate", e.target.value)} /></VField>
            <VField label="前回オイル交換時の距離（km）"><input className="input" type="number" inputMode="numeric" value={f.oilLastOdo} onChange={(e) => set("oilLastOdo", e.target.value)} placeholder="6000kmでアラート" /></VField>
            <VField label="前回 空気圧チェック 日"><input className="input" type="date" value={f.tireLastDate} onChange={(e) => set("tireLastDate", e.target.value)} /></VField>
          </div>
          {!isNew && <button className="btn btn-ghost" style={{ marginTop: 14, color: "#c5221f" }} onClick={() => { if (confirm("この車両を削除しますか？")) { onDelete(f.id); onClose(); } }}>この車両を削除</button>}
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>キャンセル</button>
          <button className="btn btn-primary" onClick={save}>{isNew ? "追加する" : "保存する"}</button>
        </div>
      </div>
    </div>
  );
};

const FuelEditor = ({ initial, vehicles, onClose, onSave, onDelete }) => {
  const isNew = !initial;
  const [f, setF] = React.useState(() => initial ? { ...initial } : { id: "f" + Date.now(), date: TODAY_ISO, vehicle: (vehicles[0] && vehicles[0].name) || "", liters: 0, amount: 0, odometer: 0 });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const save = () => { onSave({ ...f, liters: Number(f.liters) || 0, amount: Number(f.amount) || 0, odometer: Number(f.odometer) || 0 }, isNew); onClose(); };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><div><h2>{isNew ? "給油記録を追加" : "給油記録を編集"}</h2></div><button className="modal-close" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <VField label="日付"><input className="input" type="date" value={f.date} onChange={(e) => set("date", e.target.value)} /></VField>
            <VField label="車両"><select className="input" value={f.vehicle} onChange={(e) => set("vehicle", e.target.value)}>{vehicles.map((v) => <option key={v.id || v.name} value={v.name}>{v.name}</option>)}</select></VField>
            <VField label="給油量（L）"><input className="input" type="number" inputMode="decimal" value={f.liters} onChange={(e) => set("liters", e.target.value)} /></VField>
            <VField label="金額（円）"><input className="input" type="number" inputMode="numeric" value={f.amount} onChange={(e) => set("amount", e.target.value)} /></VField>
            <VField label="オドメーター（km）" full><input className="input" type="number" inputMode="numeric" value={f.odometer} onChange={(e) => set("odometer", e.target.value)} /></VField>
          </div>
          {!isNew && <button className="btn btn-ghost" style={{ marginTop: 14, color: "#c5221f" }} onClick={() => { if (confirm("削除しますか？")) { onDelete(f.id); onClose(); } }}>削除</button>}
        </div>
        <div className="modal-foot"><button className="btn btn-ghost" onClick={onClose}>キャンセル</button><button className="btn btn-primary" onClick={save}>{isNew ? "追加する" : "保存する"}</button></div>
      </div>
    </div>
  );
};

const MAINT_TYPES = ["オイル交換", "法定点検", "車検", "修理", "タイヤ交換", "洗車", "整備"];
const MaintEditor = ({ initial, vehicles, onClose, onSave, onDelete }) => {
  const isNew = !initial;
  const [f, setF] = React.useState(() => initial ? { ...initial } : { id: "m" + Date.now(), date: TODAY_ISO, vehicle: (vehicles[0] && vehicles[0].name) || "", type: "オイル交換", detail: "", cost: 0, shop: "" });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const save = () => { onSave({ ...f, cost: Number(f.cost) || 0 }, isNew); onClose(); };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><div><h2>{isNew ? "整備・修理を追加" : "整備・修理を編集"}</h2></div><button className="modal-close" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <VField label="日付"><input className="input" type="date" value={f.date} onChange={(e) => set("date", e.target.value)} /></VField>
            <VField label="車両"><select className="input" value={f.vehicle} onChange={(e) => set("vehicle", e.target.value)}>{vehicles.map((v) => <option key={v.id || v.name} value={v.name}>{v.name}</option>)}</select></VField>
            <VField label="種別"><select className="input" value={f.type} onChange={(e) => set("type", e.target.value)}>{MAINT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></VField>
            <VField label="費用（円）"><input className="input" type="number" inputMode="numeric" value={f.cost} onChange={(e) => set("cost", e.target.value)} /></VField>
            <VField label="内容" full><input className="input" value={f.detail} onChange={(e) => set("detail", e.target.value)} placeholder="例：エンジンオイル＋エレメント交換" /></VField>
            <VField label="整備店" full><input className="input" value={f.shop} onChange={(e) => set("shop", e.target.value)} placeholder="例：ディーラー / 自社" /></VField>
          </div>
          {!isNew && <button className="btn btn-ghost" style={{ marginTop: 14, color: "#c5221f" }} onClick={() => { if (confirm("削除しますか？")) { onDelete(f.id); onClose(); } }}>削除</button>}
        </div>
        <div className="modal-foot"><button className="btn btn-ghost" onClick={onClose}>キャンセル</button><button className="btn btn-primary" onClick={save}>{isNew ? "追加する" : "保存する"}</button></div>
      </div>
    </div>
  );
};

// ── メインページ ────────────────────────────────────────
const VehiclePage = () => {
  const { vehicles, fuel, maint, cloudOn, cloudState, lastSync, pull, vehicleMut, fuelMut, maintMut } = useVehicleData();
  const eco = computeFuelEconomy(fuel);
  const [editVeh, setEditVeh] = React.useState(null);   // vehicle | "new" | null
  const [editFuel, setEditFuel] = React.useState(null);
  const [editMaint, setEditMaint] = React.useState(null);
  const [importing, setImporting] = React.useState(false);
  const [importMsg, setImportMsg] = React.useState(null); // {ok, text}

  const importFromForm = async () => {
    if (importing) return;
    setImporting(true); setImportMsg(null);
    try {
      // GAS接続時：GAS経由でインポート（サーバー側で重複除去）
      if (cloudOn && typeof cloudImportVehicleForm === 'function') {
        const res = await cloudImportVehicleForm();
        if (res && res.ok) {
          await pull();
          const n = (res.fuel||0) + (res.maint||0);
          setImportMsg({ ok: true, text: n > 0 ? `フォームから取り込みました（給油 ${res.fuel||0}件・整備/洗車 ${res.maint||0}件）` : '新しいフォーム回答はありませんでした' });
          return;
        }
        // GAS失敗時はフォールバックに続行
      }
      // フォールバック：CSVダイレクト取込（車両回答スプレットシートから直接）
      const result = await vehImportCsvDirect(fuel, maint);
      if (result.fuel > 0 || result.maint > 0) {
        if (result.newFuel && result.newFuel.length > 0) {
          result.newFuel.forEach(r => fuelMut.upsert(r, true));
        }
        if (result.newMaint && result.newMaint.length > 0) {
          result.newMaint.forEach(r => maintMut.upsert(r, true));
        }
        const n = result.fuel + result.maint;
        setImportMsg({ ok: true, text: `フォームから取り込みました（給油 ${result.fuel}件・整備/洗車 ${result.maint}件）` });
      } else {
        setImportMsg({ ok: true, text: '新しいフォーム回答はありませんでした' });
      }
    } catch (e) {
      setImportMsg({ ok: false, text: String((e && e.message) || e) });
    } finally {
      setImporting(false);
      setTimeout(() => setImportMsg(null), 7000);
    }
  };

  // 切迫した順に車両を並べる
  // 洗車の前回日は整備履歴の「洗車」記録から自動取得して各車両に付与
  const lastWashByVehicle = React.useMemo(() => {
    const m = {};
    maint.forEach((r) => {
      if (r.type !== "洗車") return;
      const v = (r.vehicle || "").trim(), d = r.date || "";
      if (v && d && (!m[v] || d > m[v])) m[v] = d;
    });
    return m;
  }, [maint]);
  // 報告された最新オドメーター（給油記録）
  const latestOdoByVehicle = React.useMemo(() => {
    const m = {};
    fuel.forEach((r) => {
      const v = (r.vehicle || "").trim(), o = parseFloat(r.odometer) || 0;
      if (v && o && (!m[v] || o > m[v])) m[v] = o;
    });
    return m;
  }, [fuel]);
  // 各車両の「直近の報告」（給油 / 整備 / 洗車 のうち最新）
  const latestReportByVehicle = React.useMemo(() => {
    const m = {};
    const consider = (vn, date, label, kind, odo) => {
      const v = (vn || "").trim();
      if (!v || !date) return;
      if (!m[v] || date > m[v].date) m[v] = { date, label, kind, odo: odo || 0 };
    };
    fuel.forEach((r) => consider(r.vehicle, r.date, `給油 ${(parseFloat(r.liters) || 0).toFixed(1)}L`, "fuel", parseFloat(r.odometer) || 0));
    maint.forEach((r) => consider(r.vehicle, r.date, r.type || "整備", (r.type === "洗車" ? "wash" : "maint"), 0));
    return m;
  }, [fuel, maint]);
  const vehiclesEnriched = React.useMemo(
    () => vehicles.map((v) => {
      const name = (v.name || "").trim();
      const repOdo = latestOdoByVehicle[name] || 0;
      return {
        ...v,
        odometer: Math.max(Number(v.odometer) || 0, repOdo),
        washLastDate: (() => {
          const fromMaint = lastWashByVehicle[name] || "";
          const fromVehicle = v.washLastDate || "";
          // 最新の洗車日を使用（整備履歴から自動取得を優先）
          if (fromMaint && fromVehicle) return fromMaint > fromVehicle ? fromMaint : fromVehicle;
          return fromMaint || fromVehicle;
        })(),
      };
    }),
    [vehicles, lastWashByVehicle, latestOdoByVehicle]
  );

  const worstRank = (v) => DUE_ITEMS.reduce((acc, it) => Math.min(acc, STATUS_RANK[itemStatus(v, it).cls]), 9);
  const sortedVehicles = [...vehiclesEnriched].sort((a, b) => worstRank(a) - worstRank(b));

  const cloudLabel = cloudOn
    ? (cloudState === "ok" ? "☁ 全店で共有中" : cloudState === "loading" ? "☁ 接続中…" : "☁ 接続エラー（端末内表示）")
    : "端末内表示";

  return (
    <div className="app">
      <div className="shell">
        <AppSidebar active="vehicle" />
        <main className="main">
          <div className="greet">
            <div>
              <h1>🚚 車両管理</h1>
              <div className="sub">
                保有 {vehicles.length} 台 ・ {cloudLabel}
                {lastSync ? ` ・ 最終更新 ${new Date(lastSync).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}` : ""}
              </div>
            </div>
            <div className="right">
              <button className="btn btn-ghost" onClick={importFromForm} disabled={importing} title="Googleフォームの回答（給油・整備・洗車）を取り込む">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={importing ? { animation: "spin 1s linear infinite" } : null}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                {importing ? "取込中…" : "フォームから取込"}
              </button>
              <button className="btn btn-ghost" onClick={pull} disabled={!cloudOn || cloudState === "loading"} title="今すぐ取得">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                     style={cloudState === "loading" ? { animation: "spin 1s linear infinite" } : null}>
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                更新
              </button>
            </div>
          </div>

          {importMsg && (
            <div style={{ background: importMsg.ok ? "#e6f4ea" : "#fde2e2", color: importMsg.ok ? "#1e7a36" : "#b5271b", border: "1px solid " + (importMsg.ok ? "#aadcb8" : "#f3b9b3"), borderRadius: 10, padding: "10px 14px", fontSize: 13.5, fontWeight: 700, marginBottom: 14 }}>
              {importMsg.ok ? "✓ " : "⚠ "}{importMsg.text}
            </div>
          )}

          <AlertBanner vehicles={vehiclesEnriched} />
          <VehicleKpi vehicles={vehiclesEnriched} fuel={fuel} />
          <RecentReports fuel={fuel} maint={maint} />

          <div className="card">
            <div className="card-head">
              <h3 className="card-title">🚙 車両一覧</h3>
              <div className="right" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="card-sub">{vehicles.length} 台 ・ 期限が近い順</span>
                <button className="btn btn-primary" onClick={() => setEditVeh("new")}>＋ 車両を追加</button>
              </div>
            </div>
            <div className="veh-grid">
              {sortedVehicles.map((v) => <VehicleCard key={v.id || v.name} v={v} economy={eco[v.name]} report={latestReportByVehicle[(v.name || "").trim()]} onEdit={setEditVeh} />)}
            </div>
          </div>

          <FuelSection fuel={fuel} onAdd={() => setEditFuel("new")} onEdit={setEditFuel} />
          <MaintSection maint={maint} onAdd={() => setEditMaint("new")} onEdit={setEditMaint} />
        </main>
      </div>

      {editVeh && <VehicleEditor initial={editVeh === "new" ? null : editVeh} vehicles={vehicles} onClose={() => setEditVeh(null)} onSave={vehicleMut.upsert} onDelete={vehicleMut.remove} />}
      {editFuel && <FuelEditor initial={editFuel === "new" ? null : editFuel} vehicles={vehicles} onClose={() => setEditFuel(null)} onSave={fuelMut.upsert} onDelete={fuelMut.remove} />}
      {editMaint && <MaintEditor initial={editMaint === "new" ? null : editMaint} vehicles={vehicles} onClose={() => setEditMaint(null)} onSave={maintMut.upsert} onDelete={maintMut.remove} />}
    </div>
  );
};

window.VehiclePage = VehiclePage;
