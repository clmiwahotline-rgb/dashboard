// モバイル版 ─ 請求書管理（閲覧中心）
// データ: useInvoiceData（polished-invoices-data.jsx）流用
//   クラウド: "請求書" シート / localStorage: miwa.invoice.v1
//   各行: { id, no, vendor, title, issueDate, dueDate, amount, status, note, files[] }
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── ユーティリティ（polished-invoices-data.jsx の window export を流用） ──
const minvYen   = (n) => "¥" + Math.round(n || 0).toLocaleString("ja-JP");
const minvSlash = (s) => (s || "").replaceAll("-", "/");
const minvDays  = (s) => { if (!s) return null; const d = new Date(s + "T00:00:00"); if (isNaN(d)) return null; return Math.round((d - new Date()) / 864e5); };

// ── 期限バッジ ─────────────────────────────────────
const MInvDue = ({ inv }) => {
  if (inv.status === "入金済") return <span className="minv-due minv-paid">{minvSlash(inv.dueDate) || "入金済"}</span>;
  if (!inv.dueDate) return <span className="minv-due minv-none">期限未設定</span>;
  const d = minvDays(inv.dueDate);
  if (d < 0) return <span className="minv-due minv-over">{minvSlash(inv.dueDate)} ・ {-d}日超過</span>;
  if (d === 0) return <span className="minv-due minv-over">本日期限</span>;
  if (d <= 7) return <span className="minv-due minv-urgent">{minvSlash(inv.dueDate)} ・ あと{d}日</span>;
  return <span className="minv-due minv-ok">{minvSlash(inv.dueDate)} ・ あと{d}日</span>;
};

// ── 請求書カード ───────────────────────────────────
const MInvCard = ({ inv }) => {
  const open = inv.status !== "入金済";
  return (
    <div className={`minv-card ${open ? "" : "minv-card-paid"}`}>
      <div className="minv-card-head">
        <span className={`minv-status ${open ? "open" : "paid"}`}>{inv.status}</span>
        {inv.no && <span className="minv-no">No.{inv.no}</span>}
        <span className="minv-date">{minvSlash(inv.issueDate)}</span>
      </div>
      <div className="minv-vendor">{inv.vendor || "（取引先未設定）"}</div>
      {inv.title && <div className="minv-title">{inv.title}</div>}
      <div className="minv-foot">
        <div className="minv-amount">{minvYen(inv.amount)}</div>
        <MInvDue inv={inv} />
      </div>
      {inv.note && <div className="minv-note">{inv.note}</div>}
      {inv.files && inv.files.length > 0 && (
        <div className="minv-files">
          {inv.files.map((f, i) => (
            f.href ? (
              <a key={i} className="minv-file-link" href={f.href} target="_blank" rel="noreferrer">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
                {f.name}
              </a>
            ) : (
              <span key={i} className="minv-file-link muted">{f.name}</span>
            )
          ))}
        </div>
      )}
    </div>
  );
};

// ── メイン ─────────────────────────────────────────
const MInvoice = ({ registerHeader, registerFab }) => {
  const { invoices, cloudOn, cloudState } = window.useInvoiceData();
  const [tab, setTab] = React.useState("open");

  React.useEffect(() => {
    const sub = cloudOn
      ? (cloudState === "ok" ? "☁ クラウド同期済み" : cloudState === "loading" ? "☁ 同期中…" : "☁ オフライン")
      : "端末内データ";
    registerHeader && registerHeader({ title: "請求書管理", sub });
    registerFab && registerFab(null);
  }, [cloudState]);

  const open   = invoices.filter((i) => i.status !== "入金済").sort((a, b) => {
    const da = minvDays(a.dueDate), db = minvDays(b.dueDate);
    if (da == null && db == null) return 0;
    if (da == null) return 1; if (db == null) return -1;
    return da - db;
  });
  const paid   = invoices.filter((i) => i.status === "入金済").sort((a, b) => (b.dueDate || "").localeCompare(a.dueDate || ""));
  const overdue = open.filter((i) => { const d = minvDays(i.dueDate); return d !== null && d < 0; });

  const openAmt  = open.reduce((s, i) => s + (i.amount || 0), 0);
  const paidAmt  = paid.reduce((s, i) => s + (i.amount || 0), 0);

  const list = tab === "open" ? open : paid;

  return (
    <div>
      {/* KPI */}
      <div className="m-sales-kpis" style={{ marginBottom: 14 }}>
        <div className="m-sales-kpi big" style={{ background: open.length > 0 ? "linear-gradient(135deg, #fdebcf, var(--card))" : undefined }}>
          <div className="m-sales-kpi-label">入金待ち</div>
          <div className="m-sales-kpi-val" style={{ color: open.length > 0 ? "#d9730a" : "var(--ink)" }}>{minvYen(openAmt)}</div>
          <div className="m-sales-kpi-sub">{open.length}件{overdue.length > 0 && <span style={{ color: "#c5221f", marginLeft: 8, fontWeight: 800 }}>超過 {overdue.length}件</span>}</div>
        </div>
        <div className="m-sales-kpi">
          <div className="m-sales-kpi-label">入金済み</div>
          <div className="m-sales-kpi-val">{minvYen(paidAmt)}</div>
          <div className="m-sales-kpi-sub">{paid.length}件</div>
        </div>
        <div className="m-sales-kpi">
          <div className="m-sales-kpi-label">合計件数</div>
          <div className="m-sales-kpi-val">{invoices.length}<span className="u">件</span></div>
        </div>
      </div>

      {/* タブ */}
      <div className="m-chips" style={{ marginBottom: 12 }}>
        <button className={`m-chip ${tab === "open" ? "active" : ""}`} onClick={() => setTab("open")}>
          入金待ち<span className="m-pr-tabn">{open.length}</span>
        </button>
        <button className={`m-chip ${tab === "paid" ? "active" : ""}`} onClick={() => setTab("paid")}>
          入金済み<span className="m-pr-tabn">{paid.length}</span>
        </button>
      </div>

      {/* リスト */}
      {list.length === 0
        ? <div className="m-empty">{tab === "open" ? "入金待ちの請求書はありません" : "入金済みの請求書はありません"}</div>
        : list.map((inv) => <MInvCard key={inv.id} inv={inv} />)
      }

      <div style={{ height: 16 }}></div>
    </div>
  );
};

window.MInvoice = MInvoice;
