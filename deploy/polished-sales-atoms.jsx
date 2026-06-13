// 売上レポート atoms — schema: sales / yoy / lastYear / items / itemPrice

const STORE_PALETTE = [
  "var(--accent)", "#EA4335", "#FBBC04", "#34A853",
  "#5e97f6", "#ff7b6b", "#fdd663", "#81c995",
  "#1a73e8", "#a50e0e",
];
const DEFAULT_STORES = ["本店", "東川口店", "新田店", "西友蒲生伊原店", "草加西口店", "蒲生店", "東川口2号店", "モールプラザ草加", "マミー川口安行店"];
const STORES = DEFAULT_STORES.map((id, i) => ({ id, color: STORE_PALETTE[i % STORE_PALETTE.length] }));
const STORE_COLOR = Object.fromEntries(STORES.map((s) => [s.id, s.color]));

// ── Seed data ─────────────────────────────────────────
const seedData = () => {
  if (window.MIWA_SEED_DATA && window.MIWA_SEED_DATA.length) {
    return window.MIWA_SEED_DATA.map((r, i) => ({ ...r, id: Date.now() + i }));
  }
  return generateSyntheticSeed();
};

const generateSyntheticSeed = () => {
  const rows = [];
  let id = 1;
  const today = new Date("2026-05-18");
  for (let d = 13; d >= 0; d--) {
    const date = new Date(today);
    date.setDate(today.getDate() - d);
    const dateStr = date.toISOString().slice(0, 10);
    STORES.slice(0, 3).forEach((s, si) => {
      const base = [380000, 260000, 320000][si];
      const sales = Math.round(base * (1 + (Math.random() - 0.5) * 0.4));
      const lastYear = Math.round(sales * (0.9 + Math.random() * 0.2));
      const items = Math.round(sales / (700 + si * 50));
      rows.push({
        id: id++, date: dateStr, store: s.id,
        sales, yoy: Math.round(((sales - lastYear) / lastYear) * 1000) / 10,
        lastYear, items,
        itemPrice: Math.round(sales / items / 10) * 10,
        drySheets: Math.round(items * 0.55),
        shirts: Math.round(items * 0.3),
        rotto: Math.round(items * 0.15),
      });
    });
  }
  return rows;
};

// ── Helpers ────────────────────────────────────────────
const fmtYen = (n) => "¥" + Math.round(n || 0).toLocaleString("ja-JP");
const fmtYenShort = (n) => {
  const v = Math.round(n || 0);
  if (Math.abs(v) >= 100000000) return "¥" + (v / 100000000).toFixed(1) + "億";
  if (Math.abs(v) >= 10000)     return "¥" + (v / 10000).toFixed(1) + "万";
  return "¥" + v.toLocaleString("ja-JP");
};
const fmtNum = (n) => Math.round(n || 0).toLocaleString("ja-JP");
const fmtPct = (n) => (n >= 0 ? "+" : "") + n.toFixed(1) + "%";
const fmtDateShort = (s) => {
  if (!s) return "";
  const [, m, d] = s.split("-");
  return `${parseInt(m)}/${parseInt(d)}`;
};

const useLocalState = (key, initial) => {
  const [v, setV] = React.useState(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch {}
    return typeof initial === "function" ? initial() : initial;
  });
  React.useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  }, [key, v]);
  return [v, setV];
};

// ── CSV parse ──────────────────────────────────────────
const HEADER_MAP = {
  "日付": "date", "date": "date",
  "店舗": "store", "store": "store",
  "売上額": "sales", "売上金額": "sales", "売上": "sales", "sales": "sales",
  "昨対比": "yoy", "前年比": "yoy", "yoy": "yoy",
  "昨年実績": "lastYear", "前年実績": "lastYear", "last_year": "lastYear",
  "総点数": "items", "全点数": "items", "点数": "items", "items": "items",
  "1点単価": "itemPrice", "１点単価": "itemPrice", "一点単価": "itemPrice", "item_price": "itemPrice",
  "ドライ点数": "drySheets",
  "ドライ点数（昨年）": "drySheetsLastYear", "ドライ点数(昨年)": "drySheetsLastYear",
  "ワイシャツ点数": "shirts",
  "ﾜｲｼｬﾂ点数（昨年）": "shirtsLastYear", "ワイシャツ点数（昨年）": "shirtsLastYear",
  "ロット外・外注点数": "rotto", "ロット外": "rotto",
  "ﾛｯﾄ外点数（昨年）": "rottoLastYear", "ロット外点数（昨年）": "rottoLastYear",
  "レギュラー": "regular", "レギュラーコース": "regular",
  "スタンダード": "standard", "スタンダードコース": "standard",
  "プレミアム": "premium", "プレミアムコース": "premium",
  "デリケート": "delicate", "デリケートコース": "delicate",
  "ブランド": "brand", "ブランドコース": "brand",
  "客数": "customers", "customers": "customers",
  "客数前年実績": "customersLastYear", "客数前年": "customersLastYear",
  "客数前年比": "customersYoy",
  "新規数": "newCustomers", "新規客数": "newCustomers", "新規": "newCustomers",
  "新規前年実績": "newCustomersLastYear", "新規前年": "newCustomersLastYear",
  "新規前年比": "newCustomersYoy",
};

// 店舗別日別売上表（My帳票アドバンス）専用の列マップ。
// ※この帳票は「客数前年比 / 新規前年比」列に “前年の実数” が入っているため LastYear（前年実績）に割り当てる。
//   同様に「○○（昨年）」列も各 LastYear に割り当てる。半角/全角・括弧・空白の差は normHeader で吸収。
const MULTI_HEADER_MAP = {
  "売上額": "sales", "昨年実績": "lastYear",
  "ドライ点数": "drySheets", "ドライ点数(昨年)": "drySheetsLastYear",
  "ワイシャツ点数": "shirts", "ﾜｲｼｬﾂ点数(昨年)": "shirtsLastYear", "ワイシャツ点数(昨年)": "shirtsLastYear",
  "ロット外・外注点数": "rotto", "ﾛｯﾄ外点数(昨年)": "rottoLastYear", "ロット外点数(昨年)": "rottoLastYear",
  "レギュラーコース": "regular", "スタンダードコース": "standard", "プレミアムコース": "premium",
  "デリケートコース": "delicate", "ブランドコース": "brand",
  "1点単価": "itemPrice",
  "客数": "customers", "客数前年比": "customersLastYear", "客数前年": "customersLastYear", "客数前年実績": "customersLastYear",
  "新規数": "newCustomers", "新規": "newCustomers", "新規前年比": "newCustomersLastYear", "新規前年": "newCustomersLastYear", "新規前年実績": "newCustomersLastYear",
};
// ヘッダ表記ゆれ吸収：全角数字→半角、全角括弧→半角、空白除去
const normHeader = (s) => String(s || "").trim()
  .replace(/[\uFF10-\uFF19]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xFEE0))
  .replace(/（/g, "(").replace(/）/g, ")")
  .replace(/\s+/g, "");

const parseCSV = (text) => {
  // Detect "My帳票アドバンス" multi-store report format → use specialized parser
  if (/店舗別日別売上表/.test(text.slice(0, 200)) || /：本店|：[\u4e00-\u9faf]+店/.test(text.slice(0, 1500))) {
    const r = parseMultiStoreReport(text);
    if (r.rows.length > 0) return r;
  }

  const lines = text.replace(/\r/g, "").trim().split("\n").filter((l) => l.trim());
  if (!lines.length) return { rows: [], errors: ["空のデータ"] };
  const header = lines[0].split(/[,\t]/).map((h) => h.trim().replace(/^"|"$/g, ""));
  const colMap = header.map((h) => HEADER_MAP[h] || HEADER_MAP[h.toLowerCase()] || null);
  if (!colMap.includes("date") || !colMap.includes("store") || !colMap.includes("sales")) {
    return { rows: [], errors: ["必須カラム (日付・店舗・売上額) が見つかりません"] };
  }
  const rows = [];
  const errors = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(/[,\t]/).map((c) => c.trim().replace(/^"|"$/g, ""));
    const row = { id: Date.now() + i };
    colMap.forEach((k, ci) => {
      if (!k) return;
      const val = cells[ci];
      if (k === "date" || k === "store") row[k] = val;
      else row[k] = Number(String(val).replace(/[¥, %人円件]/g, "")) || 0;
    });
    if (!row.date || !row.store) { errors.push(`${i + 1}行目: 日付/店舗が空欄`); continue; }
    finishRow(row);
    rows.push({
      sales: 0, yoy: 0, lastYear: 0, items: 0, itemPrice: 0,
      customers: 0, customersLastYear: 0, customersYoy: 0,
      newCustomers: 0, newCustomersLastYear: 0, newCustomersYoy: 0,
      regular: 0, standard: 0, premium: 0, delicate: 0, brand: 0,
      drySheets: 0, drySheetsLastYear: 0, shirts: 0, shirtsLastYear: 0, rotto: 0, rottoLastYear: 0, itemsLastYear: 0,
      ...row,
    });
  }
  return { rows, errors };
};

const finishRow = (row) => {
  if (!row.yoy && row.lastYear > 0 && row.sales > 0) {
    row.yoy = Math.round(((row.sales - row.lastYear) / row.lastYear) * 1000) / 10;
  }
  if (!row.customersYoy && row.customersLastYear > 0 && row.customers > 0) {
    row.customersYoy = Math.round(((row.customers - row.customersLastYear) / row.customersLastYear) * 1000) / 10;
  }
  if (!row.newCustomersYoy && row.newCustomersLastYear > 0 && row.newCustomers > 0) {
    row.newCustomersYoy = Math.round(((row.newCustomers - row.newCustomersLastYear) / row.newCustomersLastYear) * 1000) / 10;
  }
  // Items totals
  if (!row.items) row.items = (row.drySheets || 0) + (row.shirts || 0) + (row.rotto || 0);
  if (!row.itemsLastYear) row.itemsLastYear = (row.drySheetsLastYear || 0) + (row.shirtsLastYear || 0) + (row.rottoLastYear || 0);
};

// Parse "My帳票アドバンス" / multi-store format where each store occupies N columns.
// Layout per store (auto-detected from sub-header row):
//   売上額, 昨年実績, ドライ点数, ワイシャツ点数, ロット外・外注点数,
//   レギュラーコース, スタンダードコース, プレミアムコース, デリケートコース, ブランドコース,
//   １点単価, 客数, 客数前年比, 新規数, 新規前年比
const parseMultiStoreReport = (text) => {
  const parseLine = (line) => {
    const out = []; let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
      else if (c === "," && !inQ) { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out;
  };
  const lines = text.split(/\r?\n/);
  // Locate store-header row (contains "：" followed by a store name)
  let storeRowIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 50); i++) {
    if (/：[\u4e00-\u9faf]+店/.test(lines[i]) || lines[i].includes("：本店")) { storeRowIdx = i; break; }
  }
  if (storeRowIdx < 0) return { rows: [], errors: ["店舗ヘッダ行が見つかりません"] };

  const storeCells = parseLine(lines[storeRowIdx]);
  const subCells = parseLine(lines[storeRowIdx + 1] || "");
  const stores = [];
  storeCells.forEach((s, i) => {
    if (s.trim() && s.includes("：")) stores.push({ name: s.split("：")[1].trim(), col: i });
  });
  if (!stores.length) return { rows: [], errors: ["店舗が認識できません"] };
  // Determine columns per store by next store's col - this store's col
  for (let i = 0; i < stores.length; i++) {
    stores[i].width = (stores[i + 1] ? stores[i + 1].col : subCells.length) - stores[i].col;
  }
  // Index columns by header name within each store block
  const num = (s) => { const v = String(s).replace(/[,¥%\s]/g, "").trim(); return v === "" || v === "-" ? 0 : Number(v) || 0; };

  const result = [];
  for (let i = storeRowIdx + 2; i < lines.length; i++) {
    const cells = parseLine(lines[i]);
    const m = (cells[0] || "").match(/(\d{4})年(\d{2})月(\d{2})日/);
    if (!m) continue;
    const date = `${m[1]}-${m[2]}-${m[3]}`;
    for (const s of stores) {
      const row = { date, store: s.name };
      for (let k = 0; k < s.width; k++) {
        const colName = normHeader(subCells[s.col + k]);
        const key = MULTI_HEADER_MAP[colName];
        if (!key) continue;
        row[key] = num(cells[s.col + k]);
      }
      // Skip ONLY if both this-year and last-year fields are all empty (true empty row)
      const hasThisYear = (row.sales || 0) + (row.customers || 0) + (row.regular || 0) + (row.drySheets || 0) > 0;
      const hasLastYear = (row.lastYear || 0) + (row.drySheetsLastYear || 0) + (row.shirtsLastYear || 0) + (row.rottoLastYear || 0) > 0;
      if (!hasThisYear && !hasLastYear) continue;
      // Compute total items
      row.items = (row.drySheets || 0) + (row.shirts || 0) + (row.rotto || 0);
      finishRow(row);
      result.push({
        sales: 0, yoy: 0, lastYear: 0, items: 0, itemPrice: 0,
        customers: 0, customersLastYear: 0, customersYoy: 0,
        newCustomers: 0, newCustomersLastYear: 0, newCustomersYoy: 0,
        regular: 0, standard: 0, premium: 0, delicate: 0, brand: 0,
        drySheets: 0, drySheetsLastYear: 0, shirts: 0, shirtsLastYear: 0, rotto: 0, rottoLastYear: 0, itemsLastYear: 0,
        id: Date.now() + Math.random(),
        ...row,
      });
    }
  }
  return { rows: result, errors: result.length ? [] : ["データ行が見つかりませんでした"] };
};

const SAMPLE_CSV = `日付,店舗,売上額,昨年実績,客数,客数前年実績,新規数,新規前年実績,総点数,1点単価
2026-04-03,本店,206396,46130,55,52,3,2,270,764
2026-04-04,本店,279032,172429,97,89,5,4,469,595`;

// ── KPI summary rows (4 + 6) ───────────────────────────
const SalesKpiRow = ({ rows }) => {
  const sum = (k) => rows.reduce((s, r) => s + (r[k] || 0), 0);
  const totalSales = sum("sales");
  const totalLastYear = sum("lastYear");
  const yoyRate = totalLastYear > 0 ? (totalSales / totalLastYear) * 100 : 0;
  const yoyDelta = totalSales - totalLastYear;

  const totalCustomers = sum("customers");
  const totalCustomersLY = sum("customersLastYear");
  const custYoy = totalCustomersLY > 0 ? ((totalCustomers - totalCustomersLY) / totalCustomersLY) * 100 : 0;

  const totalNew = sum("newCustomers");
  const totalNewLY = sum("newCustomersLastYear");
  const newYoy = totalNewLY > 0 ? ((totalNew - totalNewLY) / totalNewLY) * 100 : 0;

  const dry = sum("drySheets"),  dryLY = sum("drySheetsLastYear");
  const shirts = sum("shirts"),  shirtsLY = sum("shirtsLastYear");
  const rotto = sum("rotto"),    rottoLY = sum("rottoLastYear");

  const pointYoy = (cur, ly) => ly > 0 ? Math.round(((cur - ly) / ly) * 1000) / 10 : null;
  const dyoy = pointYoy(dry, dryLY);
  const syoy = pointYoy(shirts, shirtsLY);
  const ryoy = pointYoy(rotto, rottoLY);

  const totalDelicate = sum("delicate");
  const totalStandard = sum("standard");
  const totalRegular = sum("regular");
  const totalPremium = sum("premium");
  const totalBrand = sum("brand");
  const ratioDS = dry ? ((totalDelicate + totalStandard) / dry) * 100 : 0;
  const ratioBP = dry ? ((totalBrand + totalPremium) / dry) * 100 : 0;

  const upDown = (n) => (n >= 0 ? "up" : "down");
  const upDownColor = (n) => (n >= 0 ? "oklch(0.55 0.16 150)" : "#e54863");
  const ptDelta = (yoy) => yoy === null
    ? <span className="kpi-delta">前年データなし</span>
    : <span className={`kpi-delta ${upDown(yoy)}`}>前年比 {yoy >= 0 ? "+" : ""}{yoy.toFixed(1)}%</span>;

  return (
    <>
      {/* Row 1 — headline metrics (4 cards) */}
      <div className="kpi-row kpi-row-4">
        <div className="kpi">
          <div className="kpi-label"><span className="kpi-dot" style={{ background: "var(--accent)" }}></span>累計売上（全店）</div>
          <div className="kpi-value">{fmtYen(totalSales)}</div>
          <div className="kpi-delta">昨年 {fmtYen(totalLastYear)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="kpi-dot" style={{ background: upDownColor(yoyRate - 100) }}></span>昨対比（累計）</div>
          <div className="kpi-value" style={{ color: upDownColor(yoyRate - 100) }}>
            {totalLastYear ? Math.round(yoyRate) + "%" : "—"}
          </div>
          <div className={`kpi-delta ${upDown(yoyDelta)}`}>
            {yoyDelta >= 0 ? "+" : ""}{fmtYen(yoyDelta)}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="kpi-dot" style={{ background: "#4285F4" }}></span>客数（累計）</div>
          <div className="kpi-value">{fmtNum(totalCustomers)}<span className="kpi-unit"> 人</span></div>
          <div className={`kpi-delta ${totalCustomersLY ? upDown(custYoy) : ""}`}>
            {totalCustomersLY ? `前年比 ${custYoy >= 0 ? "+" : ""}${custYoy.toFixed(1)}%` : "前年データなし"}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="kpi-dot" style={{ background: "#34A853" }}></span>新規客数（累計）</div>
          <div className="kpi-value">{fmtNum(totalNew)}<span className="kpi-unit"> 人</span></div>
          <div className={`kpi-delta ${totalNewLY ? upDown(newYoy) : ""}`}>
            {totalNewLY ? `前年比 ${newYoy >= 0 ? "+" : ""}${newYoy.toFixed(1)}%` : "前年データなし"}
          </div>
        </div>
      </div>

      {/* Row 2 — points / ratios (6 cards) */}
      <div className="kpi-row kpi-row-6">
        <div className="kpi">
          <div className="kpi-label"><span className="kpi-dot" style={{ background: "#0ea5e9" }}></span>ドライ点数 累計</div>
          <div className="kpi-value">{fmtNum(dry)}<span className="kpi-unit"> 点</span></div>
          {ptDelta(dyoy)}
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="kpi-dot" style={{ background: "#06b6d4" }}></span>ワイシャツ点数 累計</div>
          <div className="kpi-value">{fmtNum(shirts)}<span className="kpi-unit"> 点</span></div>
          {ptDelta(syoy)}
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="kpi-dot" style={{ background: "#0d9488" }}></span>ロット外点数 累計</div>
          <div className="kpi-value">{fmtNum(rotto)}<span className="kpi-unit"> 点</span></div>
          {ptDelta(ryoy)}
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="kpi-dot" style={{ background: "#EA4335" }}></span>デリケート 累計</div>
          <div className="kpi-value">{fmtNum(totalDelicate)}<span className="kpi-unit"> 点</span></div>
          <div className="kpi-delta">全店合計</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="kpi-dot" style={{ background: "#34A853" }}></span>(デリ+スタ)÷ドライ点数</div>
          <div className="kpi-value">{ratioDS.toFixed(1)}<span className="kpi-unit"> %</span></div>
          <div className="kpi-delta">{fmtNum(totalDelicate + totalStandard)} ÷ {fmtNum(dry)} 点</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="kpi-dot" style={{ background: "#FBBC04" }}></span>(ブラ+プレ)÷ドライ点数</div>
          <div className="kpi-value">{ratioBP.toFixed(1)}<span className="kpi-unit"> %</span></div>
          <div className="kpi-delta">{fmtNum(totalBrand + totalPremium)} ÷ {fmtNum(dry)} 点</div>
        </div>
      </div>
    </>
  );
};

// ── Stacked bar chart by date / store ──────────────────
const SalesChart = ({ rows }) => {
  const byDate = {};
  rows.forEach((r) => {
    if (!byDate[r.date]) byDate[r.date] = {};
    byDate[r.date][r.store] = (byDate[r.date][r.store] || 0) + (r.sales || 0);
  });
  const dates = Object.keys(byDate).sort();
  if (!dates.length) return <div style={{ padding: 40, textAlign: "center", color: "var(--ink-mute)" }}>データがありません</div>;
  const max = Math.max(1, ...dates.map((d) => STORES.reduce((s, st) => s + (byDate[d][st.id] || 0), 0))) * 1.1;
  const w = 720, h = 260;
  const barW = Math.max(6, (w - 60) / dates.length - 4);

  return (
    <svg className="chart-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
      {[0, 0.25, 0.5, 0.75, 1].map((p) => (
        <g key={p}>
          <line x1="40" x2={w - 12} y1={h - 28 - p * (h - 60)} y2={h - 28 - p * (h - 60)} stroke="var(--line)" strokeDasharray="2 4"/>
          <text x="0" y={h - 24 - p * (h - 60)} fontSize="9.5" fill="var(--ink-mute)">{Math.round(max * p / 10000)}万</text>
        </g>
      ))}
      {dates.map((d, i) => {
        const x = 44 + i * ((w - 60) / dates.length);
        let yAcc = h - 28;
        return (
          <g key={d}>
            {STORES.map((s) => {
              const v = byDate[d][s.id] || 0;
              if (!v) return null;
              const bh = (v / max) * (h - 60);
              yAcc -= bh;
              return (
                <rect key={s.id} x={x} y={yAcc} width={barW} height={Math.max(0, bh - 0.5)}
                      fill={s.color} rx="1.5">
                  <title>{`${d} / ${s.id} : ${fmtYen(v)}`}</title>
                </rect>
              );
            })}
            <text x={x + barW / 2} y={h - 10} fontSize="9" fill="var(--ink-mute)" textAnchor="middle">
              {fmtDateShort(d)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// ── Modal shell ────────────────────────────────────────
const Modal = ({ title, sub, onClose, children, footer, wide }) => (
  <div className="modal-backdrop" onClick={onClose}>
    <div className={`modal ${wide ? "wide" : ""}`} onClick={(e) => e.stopPropagation()}>
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

// ── Manual entry form ──────────────────────────────────
const ManualForm = ({ initial, onSave, onClose }) => {
  const [form, setForm] = React.useState(() => initial || {
    date: new Date().toISOString().slice(0, 10),
    store: "本店",
    sales: "", lastYear: "",
    customers: "", customersLastYear: "",
    newCustomers: "", newCustomersLastYear: "",
    items: "", itemPrice: "",
    drySheets: "", shirts: "", rotto: "",
    regular: "", standard: "", premium: "", delicate: "", brand: "",
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = () => {
    if (!form.date || !form.store) return;
    const n = (v) => Number(v) || 0;
    const sales = n(form.sales);
    const lastYear = n(form.lastYear);
    const items = n(form.items);
    const itemPrice = n(form.itemPrice) || (items ? Math.round(sales / items) : 0);
    const customers = n(form.customers);
    const customersLastYear = n(form.customersLastYear);
    const newCustomers = n(form.newCustomers);
    const newCustomersLastYear = n(form.newCustomersLastYear);
    const yoy = lastYear > 0 ? Math.round(((sales - lastYear) / lastYear) * 1000) / 10 : 0;
    const customersYoy = customersLastYear > 0 ? Math.round(((customers - customersLastYear) / customersLastYear) * 1000) / 10 : 0;
    const newCustomersYoy = newCustomersLastYear > 0 ? Math.round(((newCustomers - newCustomersLastYear) / newCustomersLastYear) * 1000) / 10 : 0;
    onSave({
      ...form,
      sales, lastYear, yoy,
      customers, customersLastYear, customersYoy,
      newCustomers, newCustomersLastYear, newCustomersYoy,
      items, itemPrice,
      drySheets: n(form.drySheets),
      shirts: n(form.shirts),
      rotto: n(form.rotto),
      regular: n(form.regular),
      standard: n(form.standard),
      premium: n(form.premium),
      delicate: n(form.delicate),
      brand: n(form.brand),
    });
  };

  return (
    <Modal
      title={initial?.id ? "売上データを編集" : "売上を手動入力"}
      sub="昨対比は自動計算（売上額・客数・新規数 と各前年実績から）"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>キャンセル</button>
          <button className="btn btn-primary" onClick={submit}>{initial?.id ? "更新する" : "追加する"}</button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field">
          <label className="field-label">日付</label>
          <input className="input" type="date" value={form.date} onChange={set("date")} />
        </div>
        <div className="field">
          <label className="field-label">店舗</label>
          <select className="select" value={form.store} onChange={set("store")}>
            {STORES.map((s) => <option key={s.id} value={s.id}>{s.id}</option>)}
          </select>
        </div>

        <div className="field full"><div className="field-label" style={{ marginTop: 4 }}>売上</div></div>
        <div className="field">
          <label className="field-label">売上額 (円)</label>
          <input className="input" type="number" inputMode="numeric" placeholder="例: 206396"
                 value={form.sales} onChange={set("sales")}/>
        </div>
        <div className="field">
          <label className="field-label">昨年実績 (円)</label>
          <input className="input" type="number" inputMode="numeric" placeholder="例: 46130"
                 value={form.lastYear} onChange={set("lastYear")}/>
        </div>

        <div className="field full"><div className="field-label" style={{ marginTop: 4 }}>客数</div></div>
        <div className="field">
          <label className="field-label">客数</label>
          <input className="input" type="number" inputMode="numeric" placeholder="例: 55"
                 value={form.customers} onChange={set("customers")}/>
        </div>
        <div className="field">
          <label className="field-label">客数 前年実績</label>
          <input className="input" type="number" inputMode="numeric" placeholder="例: 52"
                 value={form.customersLastYear} onChange={set("customersLastYear")}/>
        </div>
        <div className="field">
          <label className="field-label">新規数</label>
          <input className="input" type="number" inputMode="numeric" placeholder="例: 3"
                 value={form.newCustomers} onChange={set("newCustomers")}/>
        </div>
        <div className="field">
          <label className="field-label">新規 前年実績</label>
          <input className="input" type="number" inputMode="numeric" placeholder="例: 2"
                 value={form.newCustomersLastYear} onChange={set("newCustomersLastYear")}/>
        </div>

        <div className="field full"><div className="field-label" style={{ marginTop: 4 }}>点数</div></div>
        <div className="field">
          <label className="field-label">総点数</label>
          <input className="input" type="number" inputMode="numeric" placeholder="例: 270"
                 value={form.items} onChange={set("items")}/>
        </div>
        <div className="field">
          <label className="field-label">1点単価 (円)</label>
          <input className="input" type="number" inputMode="numeric" placeholder="例: 764"
                 value={form.itemPrice} onChange={set("itemPrice")}/>
        </div>

        <div className="field full"><div className="field-label" style={{ marginTop: 4 }}>点数内訳 (任意)</div></div>
        <div className="field">
          <label className="field-label">ドライ点数</label>
          <input className="input" type="number" inputMode="numeric" value={form.drySheets} onChange={set("drySheets")}/>
        </div>
        <div className="field">
          <label className="field-label">ワイシャツ点数</label>
          <input className="input" type="number" inputMode="numeric" value={form.shirts} onChange={set("shirts")}/>
        </div>
        <div className="field full">
          <label className="field-label">ロット外・外注点数</label>
          <input className="input" type="number" inputMode="numeric" value={form.rotto} onChange={set("rotto")}/>
        </div>

        <div className="field full">
          <div className="field-label" style={{ marginTop: 4 }}>
            コース別点数 (任意)
            <span style={{ marginLeft: 8, fontWeight: 400, color: "var(--ink-mute)", fontSize: 11 }}>
              ※ (デリ+スタ)÷ドライ点数 ・ (ブラ+プレ)÷ドライ点数 の計算に使用
            </span>
          </div>
        </div>
        <div className="field">
          <label className="field-label">レギュラー</label>
          <input className="input" type="number" inputMode="numeric"
                 value={form.regular} onChange={set("regular")}/>
        </div>
        <div className="field">
          <label className="field-label">スタンダード</label>
          <input className="input" type="number" inputMode="numeric" placeholder="デリ+スタ の スタ"
                 value={form.standard} onChange={set("standard")}/>
        </div>
        <div className="field">
          <label className="field-label">デリケート</label>
          <input className="input" type="number" inputMode="numeric" placeholder="デリ+スタ の デリ"
                 value={form.delicate} onChange={set("delicate")}/>
        </div>
        <div className="field">
          <label className="field-label">プレミアム</label>
          <input className="input" type="number" inputMode="numeric" placeholder="ブラ+プレ の プレ"
                 value={form.premium} onChange={set("premium")}/>
        </div>
        <div className="field">
          <label className="field-label">ブランド</label>
          <input className="input" type="number" inputMode="numeric" placeholder="ブラ+プレ の ブラ"
                 value={form.brand} onChange={set("brand")}/>
        </div>
        {(() => {
          const dryN = Number(form.drySheets) || 0;
          const ds = (Number(form.delicate) || 0) + (Number(form.standard) || 0);
          const bp = (Number(form.brand) || 0) + (Number(form.premium) || 0);
          if (!dryN) return null;
          return (
            <div className="field full" style={{
              padding: "10px 12px", borderRadius: 10,
              background: "var(--accent-soft, rgba(0,0,0,0.04))",
              fontSize: 12, color: "var(--ink-soft)",
              display: "flex", gap: 24, flexWrap: "wrap",
            }}>
              <span>(デリ+スタ)÷ドライ点数 = <strong style={{ color: "var(--ink)" }}>{((ds / dryN) * 100).toFixed(1)}%</strong></span>
              <span>(ブラ+プレ)÷ドライ点数 = <strong style={{ color: "var(--ink)" }}>{((bp / dryN) * 100).toFixed(1)}%</strong></span>
            </div>
          );
        })()}
      </div>
    </Modal>
  );
};

// ── CSV import modal ──────────────────────────────────
const ImportModal = ({ onImport, onClose }) => {
  const [tab, setTab] = React.useState("file");
  const [pasted, setPasted] = React.useState("");
  const [errors, setErrors] = React.useState([]);
  const [preview, setPreview] = React.useState(null);
  const [drag, setDrag] = React.useState(false);
  const [sourceName, setSourceName] = React.useState("");
  const fileRef = React.useRef(null);

  const handleText = (text) => {
    const r = parseCSV(text);
    setErrors(r.errors);
    setPreview(r.rows);
  };

  const onFile = (file) => {
    if (!file) return;
    setSourceName(file.name || "");
    const reader = new FileReader();
    reader.onload = (e) => {
      // Try UTF-8 then Shift-JIS
      let txt = String(e.target.result);
      if (txt.includes("\uFFFD")) {
        const r2 = new FileReader();
        r2.onload = (ev) => handleText(String(ev.target.result));
        r2.readAsText(file, "shift-jis");
        return;
      }
      handleText(txt);
    };
    reader.readAsText(file, "UTF-8");
  };

  const submit = () => {
    if (preview && preview.length) {
      const name = sourceName || (tab === "paste" ? "貼り付けデータ" : "CSVファイル");
      onImport(preview, name);
      onClose();
    }
  };

  return (
    <Modal
      title="CSV インポート"
      sub="別サイトから書き出した CSV / TSV を読み込みます ・ UTF-8 / Shift-JIS 対応"
      wide
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>キャンセル</button>
          <button className="btn btn-primary" onClick={submit} disabled={!preview?.length}
                  style={!preview?.length ? { opacity: 0.5, cursor: "not-allowed" } : null}>
            {preview?.length ? `${preview.length} 件を追加` : "ファイルを選択"}
          </button>
        </>
      }
    >
      <div className="tabbar">
        <button className={tab === "file" ? "active" : ""} onClick={() => setTab("file")}>ファイルから</button>
        <button className={tab === "paste" ? "active" : ""} onClick={() => setTab("paste")}>貼り付けから</button>
      </div>

      {tab === "file" && (
        <div
          className={`dropzone ${drag ? "dragover" : ""}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files[0]); }}
        >
          <div className="dropzone-ico">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>
            </svg>
          </div>
          <div className="pri">CSV / TSV ファイルをドロップ</div>
          <div className="sec">または クリックして選択 ・ UTF-8 / Shift-JIS 自動判定</div>
          <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" style={{ display: "none" }}
                 onChange={(e) => onFile(e.target.files[0])} />
        </div>
      )}

      {tab === "paste" && (
        <textarea
          className="input"
          placeholder={SAMPLE_CSV}
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          onBlur={() => handleText(pasted)}
        />
      )}

      <div className="format-hint" style={{ marginTop: 14 }}>
{`必須カラム: 日付, 店舗, 売上額
任意カラム: 昨年実績, 客数, 客数前年実績, 新規数, 新規前年実績, 総点数, 1点単価

例:
` + SAMPLE_CSV}
      </div>

      {preview?.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="card-head" style={{ marginBottom: 8 }}>
            <h3 className="card-title">プレビュー</h3>
            <span className="card-sub">最初の 5 件 / 全 {preview.length} 件</span>
          </div>
          <div className="table-wrap" style={{ maxHeight: 200, overflowY: "auto" }}>
            <table className="dt" style={{ minWidth: 0, fontSize: 12 }}>
              <thead><tr><th>日付</th><th>店舗</th><th>売上額</th><th>昨年実績</th><th>点数</th></tr></thead>
              <tbody>
                {preview.slice(0, 5).map((r, i) => (
                  <tr key={i}>
                    <td>{r.date}</td>
                    <td>{r.store}</td>
                    <td className="num">{fmtYen(r.sales)}</td>
                    <td className="num muted">{fmtYen(r.lastYear)}</td>
                    <td className="num">{fmtNum(r.items)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: "#fde2ef", color: "#be3a82", fontSize: 12 }}>
          ⚠ {errors.join(" / ")}
        </div>
      )}
    </Modal>
  );
};

window.SalesAtoms = {
  STORES, STORE_COLOR, seedData, fmtYen, fmtYenShort, fmtNum, fmtPct, fmtDateShort,
  useLocalState, parseCSV, SAMPLE_CSV,
  SalesKpiRow, SalesChart, Modal, ManualForm, ImportModal,
};
