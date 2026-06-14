// モバイル版 ─ シミ抜き報告（閲覧中心）
// データ: GAS直接フェッチ → localStorage miwa.stain.v1（PC版と共有）
//   各行: { date:"YYYY-MM-DD", staff, processed, amount, refund, removalRate, failed }
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MST_GAS_URL = "https://script.google.com/macros/s/AKfycbzkNu60eKOiHaBzWEH_5vRsVeErqrPhtkmhYSPNSdR7iZgiE3zIIFJAMQdU-E7cTo-7/exec";
const MST_DATA_KEY = "miwa.stain.v1";
const MST_SYNC_KEY = "miwa.stain.lastSync.v1";

const mstYen = (n) => "¥" + Math.round(n || 0).toLocaleString("ja-JP");
const mstPct = (n) => Math.round((n || 0) * 100) + "%";
const mstYmKey = (d) => (d || "").slice(0, 7);
const mstYmLabel = (ym) => { const [y, m] = (ym || "").split("-"); return `${y}年${parseInt(m)}月`; };
const mstRel = (ts) => {
  if (!ts) return "未同期";
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "たった今";
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}時間前`;
  return `${Math.floor(h / 24)}日前`;
};

// ── データフック ────────────────────────────────────
const useMStainData = () => {
  const [rows, setRows] = React.useState(() => {
    try { const s = localStorage.getItem(MST_DATA_KEY); if (s) return JSON.parse(s); } catch (e) {}
    return [];
  });
  const [lastSync, setLastSync] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem(MST_SYNC_KEY)); } catch (e) { return null; }
  });
  const [syncing, setSyncing] = React.useState(false);
  const [syncError, setSyncError] = React.useState("");

  const syncNow = React.useCallback(async () => {
    setSyncing(true);
    setSyncError("");
    try {
      const res = await fetch(MST_GAS_URL, { redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("データ形式エラー");
      const filtered = data.filter((r) => (parseInt(r.processed) || 0) > 0 && (parseInt(r.amount) || 0) > 0);
      setRows(filtered);
      const now = Date.now();
      setLastSync(now);
      try { localStorage.setItem(MST_DATA_KEY, JSON.stringify(filtered)); } catch (e) {}
      try { localStorage.setItem(MST_SYNC_KEY, String(now)); } catch (e) {}
    } catch (e) {
      setSyncError(e.message || "同期に失敗しました");
    } finally {
      setSyncing(false);
    }
  }, []);

  // 起動時に1時間以上経過していたら自動同期
  React.useEffect(() => {
    const stale = !lastSync || (Date.now() - lastSync) >= 60 * 60 * 1000;
    if (stale) syncNow();
  }, []);

  return { rows, lastSync, syncing, syncError, syncNow };
};

// ── KPIカード ──────────────────────────────────────
const MStainKpi = ({ rows }) => {
  const totalAmount    = rows.reduce((s, r) => s + (parseInt(r.amount) || 0), 0);
  const totalProcessed = rows.reduce((s, r) => s + (parseInt(r.processed) || 0), 0);
  const totalRefund    = rows.reduce((s, r) => s + (parseInt(r.refund) || 0), 0);
  const avgRemoval     = rows.length ? rows.reduce((s, r) => s + (parseFloat(r.removalRate) || 0), 0) / rows.length : 0;
  const refundRate     = totalAmount > 0 ? totalRefund / totalAmount : 0;

  return (
    <div className="m-sales-kpis">
      <div className="m-sales-kpi big">
        <div className="m-sales-kpi-label">処理金額</div>
        <div className="m-sales-kpi-val">{mstYen(totalAmount)}</div>
        <div className="m-sales-kpi-sub">{rows.length}報告 ・ 当月累計</div>
      </div>
      <div className="m-sales-kpi">
        <div className="m-sales-kpi-label">処理件数</div>
        <div className="m-sales-kpi-val">{totalProcessed}<span className="u">件</span></div>
      </div>
      <div className="m-sales-kpi">
        <div className="m-sales-kpi-label">除去率（平均）</div>
        <div className="m-sales-kpi-val" style={{ color: avgRemoval >= 0.8 ? "#1e8e3e" : avgRemoval >= 0.6 ? "#9a6700" : "#c5221f" }}>
          {mstPct(avgRemoval)}
        </div>
      </div>
      <div className="m-sales-kpi">
        <div className="m-sales-kpi-label">返金率</div>
        <div className="m-sales-kpi-val" style={{ color: refundRate > 0.1 ? "#c5221f" : "var(--ink)" }}>
          {mstPct(refundRate)}
        </div>
        <div className="m-sales-kpi-sub">{mstYen(totalRefund)}</div>
      </div>
    </div>
  );
};

// ── 報告カード ─────────────────────────────────────
const MStainCard = ({ row }) => {
  const rate = parseFloat(row.removalRate) || 0;
  const processed = parseInt(row.processed) || 0;
  const success = Math.round(rate * processed);
  const rateColor = rate >= 0.8 ? "#1e8e3e" : rate >= 0.6 ? "#9a6700" : "#c5221f";
  const rateBg   = rate >= 0.8 ? "#e6f4ea" : rate >= 0.6 ? "#fef3cd" : "#fde2e2";
  return (
    <div className="m-stain-card">
      <div className="m-stain-card-head">
        <span className="m-stain-staff">{row.staff || "不明"}</span>
        <span className="m-stain-rate" style={{ color: rateColor, background: rateBg }}>除去 {Math.round(rate * 100)}%</span>
        <span className="m-stain-date">{row.date}</span>
      </div>
      <div className="m-stain-grid">
        <div className="m-stain-cell">
          <div className="m-stain-cell-label">処理件数</div>
          <div className="m-stain-cell-val">{processed}<span className="u">件</span></div>
          <div className="m-stain-cell-sub">除去成功 {success}件</div>
        </div>
        <div className="m-stain-cell">
          <div className="m-stain-cell-label">処理金額</div>
          <div className="m-stain-cell-val">{mstYen(row.amount)}</div>
          <div className="m-stain-cell-sub">返金 {mstYen(row.refund)}</div>
        </div>
      </div>
    </div>
  );
};

// ── 過去6か月サマリー ──────────────────────────────
const MStainHistory = ({ rows }) => {
  const today = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1);
    return d.toISOString().slice(0, 7);
  });
  const byMonth = {};
  months.forEach((m) => { byMonth[m] = { amount: 0, processed: 0, success: 0 }; });
  rows.forEach((r) => {
    const k = mstYmKey(r.date);
    if (byMonth[k]) {
      const p = parseInt(r.processed) || 0;
      byMonth[k].amount    += parseInt(r.amount) || 0;
      byMonth[k].processed += p;
      byMonth[k].success   += (parseFloat(r.removalRate) || 0) * p;
    }
  });
  const maxAmt = Math.max(1, ...months.map((m) => byMonth[m].amount));

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">過去6か月</span>
      </div>
      <div className="m-card-body" style={{ padding: "8px 16px 14px" }}>
        {months.map((m) => {
          const d = byMonth[m];
          const rate = d.processed ? Math.round((d.success / d.processed) * 100) : 0;
          const barW = maxAmt > 0 ? (d.amount / maxAmt) * 100 : 0;
          return (
            <div key={m} className="m-stain-hist-row">
              <div className="m-stain-hist-month">{mstYmLabel(m)}</div>
              <div className="m-stain-hist-bar-wrap">
                <div className="m-stain-hist-bar" style={{ width: `${barW}%` }}></div>
              </div>
              <div className="m-stain-hist-vals">
                <span>{mstYen(d.amount)}</span>
                {d.processed > 0 && <span className="m-stain-hist-rate">{rate}%</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── メイン ─────────────────────────────────────────
const MStain = ({ registerHeader, registerFab }) => {
  const { rows, lastSync, syncing, syncError, syncNow } = useMStainData();
  const [month, setMonth] = React.useState(() => new Date().toISOString().slice(0, 7));

  React.useEffect(() => {
    const sub = syncing ? "🔄 同期中…" : syncError ? "⚠ 同期エラー" : `最終更新: ${mstRel(lastSync)}`;
    registerHeader && registerHeader({ title: "シミ抜き報告", sub });
    registerFab && registerFab(null);
  }, [syncing, syncError, lastSync]);

  const months = React.useMemo(() => {
    const set = new Set(rows.map((r) => mstYmKey(r.date)).filter(Boolean));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [rows]);

  React.useEffect(() => {
    if (months.length && !months.includes(month)) setMonth(months[0]);
  }, [months]);

  const monthRows = React.useMemo(
    () => [...rows.filter((r) => (r.date || "").startsWith(month))].sort((a, b) => b.date.localeCompare(a.date)),
    [rows, month]
  );

  return (
    <div>
      {/* 月選択 + 手動更新 */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 14 }}>
        <div className="m-field" style={{ flex: 1, marginBottom: 0 }}>
          <label className="m-label">対象月</label>
          <select className="m-input" value={month} onChange={(e) => setMonth(e.target.value)}>
            {months.length === 0 && <option value={month}>{mstYmLabel(month)}</option>}
            {months.map((m) => <option key={m} value={m}>{mstYmLabel(m)}</option>)}
          </select>
        </div>
        <button
          className="m-btn m-btn-ghost"
          style={{ flex: "0 0 auto", padding: "11px 14px", fontSize: 13 }}
          onClick={syncNow}
          disabled={syncing}
        >
          {syncing ? "同期中…" : "🔄 更新"}
        </button>
      </div>

      {syncError && (
        <div style={{ fontSize: 12, color: "#c5221f", background: "#fde2e2", borderRadius: 10, padding: "8px 12px", marginBottom: 12 }}>
          ⚠ {syncError}
        </div>
      )}

      {/* KPI */}
      <MStainKpi rows={monthRows} />

      {/* 当月報告リスト */}
      <div className="m-sec-title" style={{ marginTop: 18 }}>
        {mstYmLabel(month)} の報告
        <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: "var(--ink-mute)" }}>{monthRows.length}件</span>
      </div>
      {monthRows.length === 0
        ? <div className="m-empty">当月のデータがありません</div>
        : monthRows.map((r, i) => <MStainCard key={i} row={r} />)
      }

      {/* 過去6か月 */}
      <div style={{ marginTop: 18 }}>
        <MStainHistory rows={rows} />
      </div>

      <div style={{ height: 16 }}></div>
    </div>
  );
};

window.MStain = MStain;
