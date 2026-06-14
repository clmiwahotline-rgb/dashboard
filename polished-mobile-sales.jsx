// モバイル版 ─ 売上レポート（閲覧中心：月選択・KPI・店舗ランキング・日次トレンド）
// データ: window.MIWA_SEED_DATA（seed）/ localStorage miwa.sales.v9（PC版と共有）
//         クラウド: "売上_マミー安行" シート（PC版CSV取込＋マミー手動分が同期済み）
//   各行: { sales, customers, newCustomers, items, itemPrice, drySheets, shirts, rotto,
//           regular, standard, premium, delicate, brand, date:"YYYY-MM-DD", store }
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MS_SALES_SHEET = "売上_マミー安行";
const MS_STORES = ["本店", "東川口店", "新田店", "西友蒲生伊原店", "草加西口店", "蒲生店", "東川口2号店", "モールプラザ草加", "マミー川口安行店"];
const MS_STORE_SHORT = {
  "本店": "本店", "東川口店": "東川口", "新田店": "新田", "西友蒲生伊原店": "蒲生伊原",
  "草加西口店": "草加西口", "蒲生店": "蒲生", "東川口2号店": "東川口2号", "モールプラザ草加": "モール草加", "マミー川口安行店": "マミー安行",
};
const MS_PALETTE = ["#1e8e3e", "#2a6fdb", "#9334e6", "#e8710a", "#0b8043", "#d01884", "#1a73e8", "#a50e0e", "#188038"];
const MS_COLOR = Object.fromEntries(MS_STORES.map((s, i) => [s, MS_PALETTE[i % MS_PALETTE.length]]));
const MS_NUM_SKIP = new Set(["date", "store", "ts"]);

const msYen = (n) => "¥" + Math.round(n || 0).toLocaleString("ja-JP");
const msYenShort = (n) => {
  const v = Math.round(n || 0);
  if (Math.abs(v) >= 100000000) return "¥" + (v / 100000000).toFixed(2) + "億";
  if (Math.abs(v) >= 10000) return "¥" + (v / 10000).toFixed(1) + "万";
  return "¥" + v.toLocaleString("ja-JP");
};
const msNum = (n) => Math.round(n || 0).toLocaleString("ja-JP");

// 文字列数値 → number に強制変換（PC版 coerceSalesRow と同ロジック）
const msCoerce = (r) => {
  const o = { ...r };
  for (const k in o) {
    if (MS_NUM_SKIP.has(k)) continue;
    const v = o[k];
    if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) o[k] = Number(v);
  }
  return o;
};

// ── データフック（クラウド優先・ローカル落とし） ──
const useMSalesData = () => {
  const cloudOn = typeof cloudEnabled === "function" && cloudEnabled();
  const [rows, setRows] = React.useState(() => {
    try { const s = localStorage.getItem("miwa.sales.v9"); if (s) { const v = JSON.parse(s); if (Array.isArray(v) && v.length) return v; } } catch (e) {}
    return (window.MIWA_SEED_DATA || []).map((r, i) => ({ ...r, id: r.id || Date.now() + i }));
  });
  const [cloudState, setCloudState] = React.useState(cloudOn ? "loading" : "off");

  React.useEffect(() => {
    if (!cloudOn) return;
    let cancelled = false;
    (async () => {
      const remote = await cloudGet(MS_SALES_SHEET);
      if (cancelled) return;
      if (remote == null) { setCloudState("error"); return; }
      if (remote.length) {
        const cloudRows = remote.map(msCoerce);
        // シードはクラウドにない (date|store) のみ残す
        const seed = (window.MIWA_SEED_DATA || []).map((r, i) => ({ ...r, id: r.id || i }));
        const ck = new Set(cloudRows.map((r) => `${r.date}|${r.store}`));
        const seedKept = seed.filter((r) => !ck.has(`${r.date}|${r.store}`));
        const merged = [...cloudRows, ...seedKept];
        setRows(merged);
        try { localStorage.setItem("miwa.sales.v9", JSON.stringify(merged)); } catch (e) {}
      }
      setCloudState("ok");
    })();
    return () => { cancelled = true; };
  }, []);

  return { rows, cloudOn, cloudState };
};

const MSales = ({ registerHeader, registerFab }) => {
  const { rows, cloudOn, cloudState } = useMSalesData();
  const [month, setMonth] = React.useState("");
  const [store, setStore] = React.useState("");

  React.useEffect(() => {
    const sub = cloudOn
      ? (cloudState === "ok" ? "☁ 全店データ同期済み" : cloudState === "loading" ? "☁ 同期中…" : "☁ オフライン")
      : "端末内データ";
    registerHeader && registerHeader({ title: "売上レポート", sub });
    registerFab && registerFab(null);
  }, [cloudState]);

  // 利用可能な月（降順）
  const months = React.useMemo(() => {
    const set = new Set(rows.map((r) => (r.date || "").slice(0, 7)).filter(Boolean));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [rows]);

  React.useEffect(() => { if (!month && months.length) setMonth(months[0]); }, [months]);

  // 当月フィルタ
  const monthRows = React.useMemo(() =>
    rows.filter((r) => (r.date || "").startsWith(month) && (!store || r.store === store)),
  [rows, month, store]);

  // KPI集計
  const kpi = React.useMemo(() => {
    const sum = (k) => monthRows.reduce((a, r) => a + (Number(r[k]) || 0), 0);
    const sales = sum("sales"), customers = sum("customers"), items = sum("items");
    const salesLY = sum("lastYear"), customersLY = sum("customersLastYear"), itemsLY = sum("itemsLastYear");
    const yoy = (cur, prev) => prev > 0 ? Math.round((cur / prev - 1) * 1000) / 10 : null;
    return {
      sales, customers, items,
      newCustomers: sum("newCustomers"),
      itemPrice: customers > 0 ? Math.round(sales / customers) : 0,
      days: new Set(monthRows.map((r) => r.date)).size,
      salesYoy: yoy(sales, salesLY),
      customersYoy: yoy(customers, customersLY),
      itemsYoy: yoy(items, itemsLY),
    };
  }, [monthRows]);

  // 店舗別ランキング（売上順）
  const byStore = React.useMemo(() => {
    const map = {};
    rows.filter((r) => (r.date || "").startsWith(month)).forEach((r) => {
      map[r.store] = (map[r.store] || 0) + (Number(r.sales) || 0);
    });
    return Object.entries(map).map(([s, v]) => ({ store: s, sales: v })).sort((a, b) => b.sales - a.sales);
  }, [rows, month]);
  const maxStore = byStore.length ? byStore[0].sales : 1;

  // 日次トレンド
  const daily = React.useMemo(() => {
    const map = {};
    monthRows.forEach((r) => { map[r.date] = (map[r.date] || 0) + (Number(r.sales) || 0); });
    return Object.entries(map).map(([d, v]) => ({ date: d, sales: v })).sort((a, b) => a.date.localeCompare(b.date));
  }, [monthRows]);
  const maxDaily = daily.length ? Math.max(...daily.map((d) => d.sales)) : 1;

  const monthLabel = month ? `${month.slice(0, 4)}年${parseInt(month.slice(5, 7))}月` : "";

  return (
    <div>
      {/* 月・店舗フィルタ */}
      <div className="m-sales-filters">
        <div className="m-field">
          <label className="m-label">対象月</label>
          <select className="m-input" value={month} onChange={(e) => setMonth(e.target.value)}>
            {months.length === 0 && <option value="">データなし</option>}
            {months.map((m) => (
              <option key={m} value={m}>{m.slice(0, 4)}年{parseInt(m.slice(5, 7))}月</option>
            ))}
          </select>
        </div>
        <div className="m-field">
          <label className="m-label">店舗</label>
          <select className="m-input" value={store} onChange={(e) => setStore(e.target.value)}>
            <option value="">全店合計</option>
            {MS_STORES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* KPIカード */}
      <div className="m-sales-kpis">
        <div className="m-sales-kpi big">
          <div className="m-sales-kpi-label">売上{store ? "" : "（全店）"}</div>
          <div className="m-sales-kpi-val">{msYenShort(kpi.sales)}{kpi.salesYoy !== null && <span className={`ms-yoy ${kpi.salesYoy >= 0 ? "up" : "dn"}`}>{kpi.salesYoy >= 0 ? "▲" : "▼"}{Math.abs(kpi.salesYoy)}%</span>}</div>
          <div className="m-sales-kpi-sub">{monthLabel} ・ {kpi.days}日分{kpi.salesYoy !== null ? "（昨年比）" : ""}</div>
        </div>
        <div className="m-sales-kpi">
          <div className="m-sales-kpi-label">客数</div>
          <div className="m-sales-kpi-val">{msNum(kpi.customers)}<span className="u">人</span>{kpi.customersYoy !== null && <span className={`ms-yoy ${kpi.customersYoy >= 0 ? "up" : "dn"}`}>{kpi.customersYoy >= 0 ? "▲" : "▼"}{Math.abs(kpi.customersYoy)}%</span>}</div>
        </div>
        <div className="m-sales-kpi">
          <div className="m-sales-kpi-label">客単価</div>
          <div className="m-sales-kpi-val">{msYen(kpi.itemPrice)}</div>
        </div>
        <div className="m-sales-kpi">
          <div className="m-sales-kpi-label">新規客</div>
          <div className="m-sales-kpi-val">{msNum(kpi.newCustomers)}<span className="u">人</span></div>
        </div>
        <div className="m-sales-kpi">
          <div className="m-sales-kpi-label">点数</div>
          <div className="m-sales-kpi-val">{msNum(kpi.items)}<span className="u">点</span>{kpi.itemsYoy !== null && <span className={`ms-yoy ${kpi.itemsYoy >= 0 ? "up" : "dn"}`}>{kpi.itemsYoy >= 0 ? "▲" : "▼"}{Math.abs(kpi.itemsYoy)}%</span>}</div>
        </div>
      </div>

      {/* 店舗別ランキング（全店表示時のみ） */}
      {!store && byStore.length > 0 && (
        <div className="m-sales-section">
          <div className="m-sec-title">店舗別売上</div>
          <div className="m-card">
            <div className="m-card-body">
              {byStore.map((s, i) => (
                <div key={s.store} className="m-sales-rank" onClick={() => setStore(s.store)}>
                  <div className="m-sales-rank-top">
                    <span className="m-sales-rank-no">{i + 1}</span>
                    <span className="m-sales-rank-name">{MS_STORE_SHORT[s.store] || s.store}</span>
                    <span className="m-sales-rank-val">{msYenShort(s.sales)}</span>
                  </div>
                  <div className="m-sales-bar"><div className="m-sales-bar-fill" style={{ width: `${(s.sales / maxStore) * 100}%`, background: MS_COLOR[s.store] }}></div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 日次トレンド */}
      {daily.length > 0 && (
        <div className="m-sales-section">
          <div className="m-sec-title">日次売上{store ? `（${MS_STORE_SHORT[store] || store}）` : "（全店）"}</div>
          <div className="m-card">
            <div className="m-card-body">
              <div className="m-sales-trend">
                {daily.map((d) => (
                  <div key={d.date} className="m-sales-trend-col" title={`${d.date}: ${msYen(d.sales)}`}>
                    <div className="m-sales-trend-bar" style={{ height: `${Math.max(4, (d.sales / maxDaily) * 100)}%` }}></div>
                    <div className="m-sales-trend-day">{parseInt(d.date.slice(8, 10))}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: 16 }}></div>
    </div>
  );
};

window.MSales = MSales;
