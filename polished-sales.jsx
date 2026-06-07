// 売上レポート main view — tabbed layout

const {
  STORES, STORE_COLOR, seedData, fmtYen, fmtYenShort, fmtNum, fmtPct, fmtDateShort,
  useLocalState, SalesKpiRow, ManualForm, ImportModal, Modal
} = window.SalesAtoms;

const { DailyComparisonChart, CumulativeChart, StoreComparisonChart, CourseChart, COURSE_FIELDS } = window.SalesCharts;

// ── Sortable detail table ───────────────────────────────
const SalesTable = ({ rows, onEdit, onDelete, sort, setSort }) => {
  const cols = [
  { key: "date", label: "日付", align: "left" },
  { key: "store", label: "店舗", align: "left" },
  { key: "sales", label: "売上額", align: "right" },
  { key: "yoy", label: "昨対比", align: "right" },
  { key: "lastYear", label: "昨年実績", align: "right" },
  { key: "customers", label: "客数", align: "right" },
  { key: "customersYoy", label: "客数前年比", align: "right" },
  { key: "newCustomers", label: "新規数", align: "right" },
  { key: "newCustomersYoy", label: "新規前年比", align: "right" },
  { key: "items", label: "総点数", align: "right" },
  { key: "drySheets", label: "ドライ", align: "right" },
  { key: "shirts", label: "ワイシャツ", align: "right" },
  { key: "regular", label: "レギュラー", align: "right" },
  { key: "standard", label: "スタンダード", align: "right" },
  { key: "premium", label: "プレミアム", align: "right" },
  { key: "delicate", label: "デリケート", align: "right" },
  { key: "brand", label: "ブランド", align: "right" },
  { key: "itemPrice", label: "1点単価", align: "right" }];

  const flip = (k) => () => setSort({ key: k, dir: sort.key === k && sort.dir === "desc" ? "asc" : "desc" });
  const deltaCell = (val, hasBase) => hasBase ?
  <span className={val >= 0 ? "delta-up" : "delta-down"}>{fmtPct(val)}</span> :
  <span style={{ color: "var(--ink-faint)" }}>—</span>;

  return (
    <div className="table-wrap">
      <table className="dt">
        <thead>
          <tr>
            {cols.map((c) =>
            <th key={c.key}
            className={`sortable ${sort.key === c.key ? "active" : ""}`}
            style={{ textAlign: c.align }}
            onClick={flip(c.key)}>
                {c.label}
                <span className="sort-ind">{sort.key === c.key ? sort.dir === "desc" ? "▼" : "▲" : "↕"}</span>
              </th>
            )}
            <th style={{ textAlign: "right" }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ?
          <tr><td colSpan={cols.length + 1}><div className="dt-empty">該当するデータがありません</div></td></tr> :
          rows.map((r) =>
          <tr key={r.id}>
              <td>{r.date}</td>
              <td>
                <span className="store-chip">
                  <span className="swatch" style={{ background: STORE_COLOR[r.store] || "var(--ink-mute)" }}></span>
                  {r.store}
                </span>
              </td>
              <td className="num">{fmtYen(r.sales)}</td>
              <td className="num">{deltaCell(r.yoy, r.lastYear > 0)}</td>
              <td className="num muted">{r.lastYear ? fmtYen(r.lastYear) : <span style={{ color: "var(--ink-faint)" }}>—</span>}</td>
              <td className="num">{r.customers ? fmtNum(r.customers) : <span style={{ color: "var(--ink-faint)" }}>—</span>}</td>
              <td className="num">{deltaCell(r.customersYoy, r.customersLastYear > 0)}</td>
              <td className="num">{r.newCustomers ? fmtNum(r.newCustomers) : <span style={{ color: "var(--ink-faint)" }}>—</span>}</td>
              <td className="num">{deltaCell(r.newCustomersYoy, r.newCustomersLastYear > 0)}</td>
              <td className="num">{fmtNum(r.items)}</td>
              <td className="num muted">{fmtNum(r.drySheets)}</td>
              <td className="num muted">{fmtNum(r.shirts)}</td>
              <td className="num muted">{fmtNum(r.regular)}</td>
              <td className="num muted">{fmtNum(r.standard)}</td>
              <td className="num muted">{fmtNum(r.premium)}</td>
              <td className="num muted">{fmtNum(r.delicate)}</td>
              <td className="num muted">{fmtNum(r.brand)}</td>
              <td className="num muted">{fmtYen(r.itemPrice)}</td>
              <td className="actions">
                <button className="row-action" title="編集" onClick={() => onEdit(r)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </svg>
                </button>
                <button className="row-action danger" title="削除" onClick={() => onDelete(r.id)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  </svg>
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>);

};

// ── Filter bar ─────────────────────────────────────────
const FilterBar = ({ filter, setFilter, months, onAdd, onImport, onExport, onHistory }) =>
<div className="card" style={{ padding: 16 }}>
    <div className="filter-bar">
      <div className="field">
        <label className="field-label">対象月</label>
        <select className="select" style={{ width: 180 }}
      value={filter.month} onChange={(e) => setFilter({ ...filter, month: e.target.value })}>
          {months.length === 0 && <option value="">データなし</option>}
          {months.map((m) => {
          const [y, mo] = m.split("-");
          return <option key={m} value={m}>{y}年{parseInt(mo)}月</option>;
        })}
        </select>
      </div>
      <div className="field">
        <label className="field-label">店舗</label>
        <select className="select" style={{ width: 180 }}
      value={filter.store} onChange={(e) => setFilter({ ...filter, store: e.target.value })}>
          <option value="">すべて</option>
          {STORES.map((s) => <option key={s.id} value={s.id}>{s.id}</option>)}
        </select>
      </div>
      <div className="field" style={{ flex: 1, minWidth: 160 }}>
        <label className="field-label">キーワード</label>
        <input className="input" placeholder="店舗名・日付で検索"
      value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} />
      </div>
      <div className="actions">
        <button className="btn btn-ghost" onClick={onExport}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M7 10l5 5 5-5" /><path d="M12 15V3" />
          </svg>
          書き出し
        </button>
        <button className="btn btn-ghost" onClick={onImport}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M17 8l-5-5-5 5" /><path d="M12 3v12" />
          </svg>
          CSV 取り込み
        </button>
        <button className="btn btn-ghost" onClick={onHistory} title="ファイルごとに取り込み履歴を確認・削除">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l4 2" />
          </svg>
          取り込み履歴
        </button>
        <button className="btn btn-primary" onClick={onAdd}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M12 5v14M5 12h14" />
          </svg>
          手動入力
        </button>
      </div>
    </div>
  </div>;


// Toast
const Toast = ({ msg, onDone }) => {
  React.useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [msg]);
  return msg ? <div className="toast">{msg}</div> : null;
};

// ── Tab pill control ───────────────────────────────────
const Tabs = ({ value, onChange, tabs }) =>
<div className="tab-pills">
    {tabs.map((t) =>
  <button
    key={t.id}
    className={`tab-pill ${value === t.id ? "active" : ""}`}
    onClick={() => onChange(t.id)}>
    
        {t.label}
      </button>
  )}
  </div>;


// ── Import history modal ───────────────────────────────
const ImportHistoryModal = ({ imports, rowCountById, onDelete, onClose }) => {
  const fmt = (ts) => new Date(ts).toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  return (
    <Modal
      title="取り込み履歴"
      sub="CSV / 貼り付けで取り込んだデータを、ファイル単位で確認・削除できます"
      onClose={onClose}
      footer={<button className="btn btn-ghost" onClick={onClose}>閉じる</button>}>
      
      {!imports || imports.length === 0 ?
      <div className="imp-hist-empty">取り込み履歴はまだありません。「CSV 取り込み」で読み込むと、ここにファイルごとに記録されます。</div> :

      <div className="imp-hist-list">
          {imports.map((im) => {
          const remaining = rowCountById(im.id);
          return (
            <div key={im.id} className="imp-hist-item">
                <div className="imp-hist-ic"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg></div>
                <div className="imp-hist-main">
                  <div className="imp-hist-name" title={im.name}>{im.name}</div>
                  <div className="imp-hist-meta">{fmt(im.ts)} ・ 取り込み {im.count} 件{remaining !== im.count ? `（現存 ${remaining} 件）` : ""}</div>
                </div>
                <button className="imp-hist-del" onClick={() => onDelete(im)} disabled={remaining === 0} title={remaining === 0 ? "この取り込み分のデータは残っていません" : "この取り込み分をすべて削除"}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                  削除
                </button>
              </div>);

        })}
        </div>
      }
    </Modal>);

};

// ── Main report view ───────────────────────────────────
const SalesReport = () => {
  const [rows, setRows] = useLocalState("miwa.sales.v9", () => seedData());
  const [imports, setImports] = useLocalState("miwa.sales.imports.v1", () => []);
  const [filter, setFilter] = React.useState({ month: "", store: "", q: "" });
  const [sort, setSort] = React.useState({ key: "date", dir: "desc" });
  const [editing, setEditing] = React.useState(null);
  const [importing, setImporting] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [toast, setToast] = React.useState("");
  const [dark, setDark] = React.useState(false);
  const [tab, setTab] = React.useState("daily");
  const [chartStore, setChartStore] = React.useState("all");

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  // ── 共有クラウド：手動入力（マミー川口安行店のみ）を全端末同期 ──
  // 他店は将来 API 自動取得予定のためクラウドには上げない。
  const MANUAL_STORE = "マミー川口安行店";
  const SALES_SHEET = "売上_マミー安行";
  // CSV取込データ（マミー以外の全店）と取込履歴も全端末で共有するための専用シート
  const SALES_IMPORT_SHEET = "売上_取込";
  const SALES_IMPORT_META_SHEET = "売上_取込履歴";
  const NUM_SKIP = React.useRef(new Set(["date", "store", "ts"])).current;
  const coerceSalesRow = React.useCallback((r) => {
    const o = { ...r };
    for (const k in o) {
      if (NUM_SKIP.has(k)) continue;
      const v = o[k];
      if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) o[k] = Number(v);
    }
    return o;
  }, []);
  const [cloudOn] = React.useState(() => typeof cloudEnabled === "function" && cloudEnabled());
  // マミーの行だけをクラウドへ反映（追加・編集・削除・CSV取込すべて経由）
  const syncManualToCloud = React.useCallback((allRows) => {
    if (!cloudOn) return;
    const manual = allRows.filter((r) => r.store === MANUAL_STORE);
    cloudReplaceAll(SALES_SHEET, manual);
  }, [cloudOn]);
  // CSV取込（マミー以外の全店）＋取込履歴をクラウドへ反映→全端末共有
  const syncImportsToCloud = React.useCallback((allRows, importsList) => {
    if (!cloudOn) return;
    const imported = allRows.filter((r) => r.importId && r.store !== MANUAL_STORE);
    cloudReplaceAll(SALES_IMPORT_SHEET, imported);
    cloudReplaceAll(SALES_IMPORT_META_SHEET, importsList || []);
  }, [cloudOn]);

  React.useEffect(() => {
    if (!cloudOn) return;
    let cancelled = false;
    (async () => {
      const [remoteManual, remoteImport, remoteMeta] = await Promise.all([
        cloudGet(SALES_SHEET),
        cloudGet(SALES_IMPORT_SHEET),
        cloudGet(SALES_IMPORT_META_SHEET),
      ]);
      if (cancelled) return;

      setRows((prev) => {
        // ベース＝シード等（手動マミーでも取込でもない行）
        let base = prev.filter((r) => r.store !== MANUAL_STORE && !r.importId);

        // 取込データ（マミー以外の全店・全端末共有）
        let importArr;
        if (remoteImport == null) {
          importArr = prev.filter((r) => r.importId && r.store !== MANUAL_STORE); // 取得失敗→ローカル維持
        } else if (remoteImport.length) {
          importArr = remoteImport.map(coerceSalesRow);
        } else {
          const localImport = prev.filter((r) => r.importId && r.store !== MANUAL_STORE);
          if (localImport.length) cloudReplaceAll(SALES_IMPORT_SHEET, localImport); // 初回移行
          importArr = localImport;
        }
        // 取込は (date|store) でベースを上書き
        if (importArr.length) {
          const ik = new Set(importArr.map((r) => `${r.date}|${r.store}`));
          base = base.filter((r) => !ik.has(`${r.date}|${r.store}`));
        }

        // 手動マミー
        let manualArr;
        if (remoteManual == null) {
          manualArr = prev.filter((r) => r.store === MANUAL_STORE);
        } else if (remoteManual.length) {
          manualArr = remoteManual.map(coerceSalesRow);
        } else {
          const localManual = prev.filter((r) => r.store === MANUAL_STORE);
          if (localManual.length) cloudReplaceAll(SALES_SHEET, localManual); // 初回移行
          manualArr = localManual;
        }

        return [...manualArr, ...importArr, ...base];
      });

      // 取込履歴（ファイル一覧）も共有
      if (remoteMeta != null) {
        setImports((prevMeta) => {
          if (remoteMeta.length) return remoteMeta;
          if (prevMeta.length) cloudReplaceAll(SALES_IMPORT_META_SHEET, prevMeta); // 初回移行
          return prevMeta;
        });
      }
    })();
    return () => {cancelled = true;};
  }, [cloudOn]); // eslint-disable-line

  // Available months (descending) — derived from data
  const months = React.useMemo(() => {
    const set = new Set(rows.map((r) => (r.date || "").slice(0, 7)).filter(Boolean));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [rows]);

  // Default month → most recent
  React.useEffect(() => {
    if (!filter.month && months.length) {
      setFilter((f) => ({ ...f, month: months[0] }));
    }
  }, [months, filter.month]);

  // Filter (month/store/keyword)
  const filtered = React.useMemo(() => {
    return rows.filter((x) =>
    (!filter.month || (x.date || "").startsWith(filter.month)) && (
    !filter.store || x.store === filter.store) && (
    !filter.q || (x.store + x.date).includes(filter.q))
    );
  }, [rows, filter]);

  const availableStores = React.useMemo(() => [...new Set(filtered.map((r) => r.store))], [filtered]);

  const sorted = React.useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sort.key] ?? 0,bv = b[sort.key] ?? 0;
      if (typeof av === "string") return sort.dir === "desc" ? bv.localeCompare(av) : av.localeCompare(bv);
      return sort.dir === "desc" ? bv - av : av - bv;
    });
  }, [filtered, sort]);

  const saveRow = (data) => {
    let next;
    if (data.id && rows.find((r) => r.id === data.id)) {
      next = rows.map((r) => r.id === data.id ? data : r);
      setToast("売上データを更新しました");
    } else {
      // Dedup on (date, store) when manually adding
      const filtered = rows.filter((r) => !(r.date === data.date && r.store === data.store));
      next = [{ ...data, id: Date.now() }, ...filtered];
      setToast(filtered.length === rows.length ? "売上データを追加しました" : "同日・同店舗のデータを更新しました");
    }
    setRows(next);
    syncManualToCloud(next);
    setEditing(null);
  };

  const deleteRow = (id) => {
    if (!confirm("この行を削除しますか?")) return;
    const next = rows.filter((r) => r.id !== id);
    setRows(next);
    syncManualToCloud(next);
    setToast("削除しました");
  };

  // Import: accumulate, dedup by (date, store) — new replaces old
  const importRows = (newRows, sourceName) => {
    const importId = "imp" + Date.now();
    const keys = new Set(newRows.map((r) => `${r.date}|${r.store}`));
    const kept = rows.filter((r) => !keys.has(`${r.date}|${r.store}`));
    const stamped = newRows.map((r) => ({ ...r, id: Date.now() + Math.random(), importId }));
    const next = [...stamped, ...kept];
    setRows(next);
    const meta = { id: importId, name: sourceName || "CSV取り込み", ts: Date.now(), count: stamped.length };
    const nextImports = [meta, ...imports];
    setImports(nextImports);
    syncManualToCloud(next);                // マミー分
    syncImportsToCloud(next, nextImports);  // 取込分（全店）＋履歴 → 全端末共有
    const replaced = rows.length - kept.length;
    setToast(`${newRows.length} 件を取り込みました${replaced ? `（うち ${replaced} 件は上書き）` : ""}`);
  };

  // 取り込み履歴：ファイル単位でデータごと削除
  const rowCountById = (importId) => rows.filter((r) => r.importId === importId).length;
  const deleteImport = (im) => {
    const n = rowCountById(im.id);
    if (!confirm(`「${im.name}」で取り込んだデータ ${n} 件を削除します。よろしいですか?`)) return;
    const next = rows.filter((r) => r.importId !== im.id);
    setRows(next);
    const nextImports = imports.filter((x) => x.id !== im.id);
    setImports(nextImports);
    syncManualToCloud(next);
    syncImportsToCloud(next, nextImports);
    setToast(`「${im.name}」の取り込み分（${n} 件）を削除しました`);
  };

  const exportCSV = () => {
    const header = "日付,店舗,売上額,昨年実績,昨対比,客数,客数前年実績,客数前年比,新規数,新規前年実績,新規前年比,総点数,1点単価,レギュラー,スタンダード,プレミアム,デリケート,ブランド,ドライ,ワイシャツ,ロット外";
    const lines = sorted.map((r) =>
    [r.date, r.store, r.sales, r.lastYear || 0, r.yoy || 0,
    r.customers || 0, r.customersLastYear || 0, r.customersYoy || 0,
    r.newCustomers || 0, r.newCustomersLastYear || 0, r.newCustomersYoy || 0,
    r.items || 0, r.itemPrice || 0,
    r.regular || 0, r.standard || 0, r.premium || 0, r.delicate || 0, r.brand || 0,
    r.drySheets || 0, r.shirts || 0, r.rotto || 0].join(",")
    );
    const csv = "\uFEFF" + [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `売上レポート_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast(`${sorted.length} 件を書き出しました`);
  };

  // Period label: shows selected month or count
  const periodLabel = filter.month ?
  `${filter.month.slice(0, 4)}年${parseInt(filter.month.slice(5, 7))}月` :
  "全期間";

  return (
    <div className="app">
      <div className="shell">
        <AppSidebar active="sales" />
        <main className="main">
          {/* Greeting */}
          <div className="greet">
            <div>
              <h1>店舗売上レポート</h1>
              <div className="sub">{periodLabel} ・ {availableStores.length} 店舗 ・ 全 {rows.length} 件保存中</div>
            </div>
            <div className="right">
              <a className="btn btn-ghost" href="https://cl.astempo.jp/Top-TCP.php" target="_blank" rel="noopener" style={{ fontSize: 12 }} title="テラオカアステンポを開く">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 3h7v7" /><path d="M10 14L21 3" /><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" /></svg>
                テラオカアステンポ
              </a>
              <a className="btn btn-ghost" href="https://asp.right.jp/asp/index.htm?" target="_blank" rel="noopener" style={{ fontSize: 12 }} title="ライトクラウドを開く">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 3h7v7" /><path d="M10 14L21 3" /><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" /></svg>
                ライトクラウド
              </a>
            </div>
          </div>

          {/* KPI summary */}
          <SalesKpiRow rows={filtered} />

          {/* Filter bar */}
          <FilterBar
            filter={filter}
            setFilter={setFilter}
            months={months}
            onAdd={() => setEditing({})}
            onImport={() => setImporting(true)}
            onExport={exportCSV}
            onHistory={() => setHistoryOpen(true)} />
          

          {/* Tabs */}
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
            { id: "daily", label: "日別売上推移" },
            { id: "store", label: "店舗別比較" },
            { id: "course", label: "コース別点数" },
            { id: "detail", label: "明細テーブル" }]
            } />
          

          {/* Tab body */}
          {tab === "daily" &&
          <div className="card chart-card" style={{ minHeight: 380 }}>
              <div className="card-head">
                <h3 className="card-title">日別売上 (今期 vs 昨年)</h3>
                <div className="right" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 12, fontSize: 11.5, color: "var(--ink-soft)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--accent)" }}></span>今期
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--ink-faint)" }}></span>昨年
                    </span>
                  </div>
                  <select className="select" style={{ width: 180 }}
                value={chartStore} onChange={(e) => setChartStore(e.target.value)}>
                    <option value="all">全店合計</option>
                    {availableStores.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <DailyComparisonChart rows={filtered} storeFilter={chartStore} />
            </div>
          }

          {tab === "store" &&
          <div className="card chart-card" style={{ minHeight: 380 }}>
              <div className="card-head">
                <h3 className="card-title">店舗別比較 (今期 vs 昨年)</h3>
                <span className="card-sub">期間内合計</span>
              </div>
              <StoreComparisonChart rows={filtered} />
            </div>
          }

          {tab === "course" &&
          <div className="card chart-card" style={{ minHeight: 380 }}>
              <div className="card-head">
                <h3 className="card-title">コース別点数</h3>
                <span className="card-sub">レギュラー / スタンダード / プレミアム / デリケート / ブランド</span>
              </div>
              <CourseChart rows={filtered} />
            </div>
          }

          {tab === "detail" &&
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="card-head" style={{ padding: "16px 20px 10px", marginBottom: 0 }}>
                <h3 className="card-title">明細テーブル</h3>
                <span className="card-sub">{sorted.length} 件</span>
                <div className="right">
                  <span style={{ fontSize: 11, color: "var(--ink-mute)" }}>
                    並び替え: {sort.key} {sort.dir === "desc" ? "↓" : "↑"}
                  </span>
                </div>
              </div>
              <SalesTable
              rows={sorted}
              onEdit={(r) => setEditing(r)}
              onDelete={deleteRow}
              sort={sort}
              setSort={setSort} />
            
            </div>
          }

          {/* Cumulative chart — always shown */}
          <div className="card chart-card" style={{ minHeight: 280 }}>
            <div className="card-head">
              <h3 className="card-title">累計売上推移 (今期 vs 昨年)</h3>
              <span className="card-sub">横軸は期間内の日順 ・ 曜日ズレに関係なく累計額を比較</span>
              <div className="right" style={{ display: "flex", gap: 12, fontSize: 11.5, color: "var(--ink-soft)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 16, height: 2, background: "var(--accent)" }}></span>今期累計
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 16, height: 0, borderTop: "2px dashed var(--ink-faint)" }}></span>昨年累計
                </span>
              </div>
            </div>
            <CumulativeChart rows={filtered} storeFilter={chartStore} />
          </div>
        </main>
      </div>

      {editing !== null &&
      <ManualForm
        initial={editing.id ? editing : null}
        onSave={saveRow}
        onClose={() => setEditing(null)} />

      }
      {importing &&
      <ImportModal
        onImport={importRows}
        onClose={() => setImporting(false)} />

      }
      {historyOpen &&
      <ImportHistoryModal
        imports={imports}
        rowCountById={rowCountById}
        onDelete={deleteImport}
        onClose={() => setHistoryOpen(false)} />

      }
      <Toast msg={toast} onDone={() => setToast("")} />
    </div>);

};

window.SalesReport = SalesReport;