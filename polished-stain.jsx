// シミ抜き報告 — adapted from stain_removal_dashboard GAS dashboard

// Default GAS URL from the original file
const DEFAULT_STAIN_GAS = "https://script.google.com/macros/s/AKfycbzkNu60eKOiHaBzWEH_5vRsVeErqrPhtkmhYSPNSdR7iZgiE3zIIFJAMQdU-E7cTo-7/exec";

const STAFF_COLORS = ["var(--accent)", "#EA4335", "#FBBC04", "#34A853", "#5e97f6", "#ff7b6b", "#fdd663", "#81c995"];

const SEED_STAIN = [];

const fmtYenSt = (n) => "¥" + Math.round(n || 0).toLocaleString("ja-JP");
const fmtPctSt = (n) => Math.round(n * 100) + "%";
const ymKey = (d) => (d || "").slice(0, 7);
const ymLabel = (ym) => {
  const [y, m] = ym.split("-");
  return `${y}年${parseInt(m)}月`;
};

const useFbStateSt = (key, initial) => {
  const [v, setV] = React.useState(() => {
    try { const s = localStorage.getItem(key); if (s) return JSON.parse(s); } catch {}
    return typeof initial === "function" ? initial() : initial;
  });
  React.useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }, [key, v]);
  return [v, setV];
};

// ── KPI cards ──────────────────────────────────────────
const StainKpiRow = ({ rows }) => {
  const totalAmount = rows.reduce((s, r) => s + (parseInt(r.amount) || 0), 0);
  const totalProcessed = rows.reduce((s, r) => s + (parseInt(r.processed) || 0), 0);
  const totalRefund = rows.reduce((s, r) => s + (parseInt(r.refund) || 0), 0);
  const totalRate = rows.reduce((s, r) => s + (parseFloat(r.removalRate) || 0), 0);
  const avgRemoval = rows.length ? totalRate / rows.length : 0;
  const refundRate = totalAmount > 0 ? totalRefund / totalAmount : 0;

  const card = (label, value, sub, accent, valueColor) => (
    <div className="kpi" style={{ borderTop: `3px solid ${accent}`, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
      <div className="kpi-label"><span className="kpi-dot" style={{ background: accent }}></span>{label}</div>
      <div className="kpi-value" style={{ color: valueColor || accent, fontSize: 30 }}>{value}</div>
      <div className="kpi-delta">{sub}</div>
    </div>
  );

  return (
    <div className="kpi-row kpi-row-4">
      {card("💰 処理金額", fmtYenSt(totalAmount),    "当月累計", "var(--accent)")}
      {card("📦 処理件数", totalProcessed + " 件",   "受付ベース", "#4285F4")}
      {card("✨ 除去率",   fmtPctSt(avgRemoval),     "成功率（平均）", "#34A853")}
      {card("💸 返金率",   fmtPctSt(refundRate),     fmtYenSt(totalRefund) + " 返金", "#FBBC04")}
    </div>
  );
};

// ── Report list (当月) ────────────────────────────────
const StainReportList = ({ rows }) => {
  if (rows.length === 0) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--ink-mute)" }}>当月のデータがありません</div>;
  }
  const sorted = [...rows].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="stain-list">
      {sorted.map((r, i) => {
        const rate = parseFloat(r.removalRate) || 0;
        const success = Math.round(rate * r.processed);
        return (
          <div key={i} className="stain-item">
            <div className="stain-item-head">
              <div className="staff-chip">{r.staff}</div>
              <div className="stain-date">{r.date}</div>
            </div>
            <div className="stain-item-grid">
              <div>
                <div className="stain-cell-label">📦 処理</div>
                <div className="stain-cell-value">{r.processed} 件</div>
                <div className="stain-cell-sub">受付ベース</div>
              </div>
              <div>
                <div className="stain-cell-label">💰 金額</div>
                <div className="stain-cell-value">{fmtYenSt(r.amount)}</div>
                <div className="stain-cell-sub">返金 {fmtYenSt(r.refund)}</div>
              </div>
              <div>
                <div className="stain-cell-label">✨ 除去成功</div>
                <div className="stain-cell-value">{success} 件</div>
                <div className="stain-cell-sub">除去率 {(rate * 100).toFixed(1)}%</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Staff bar chart (金額 + 落ち率) ────────────────────
const StainStaffChart = ({ rows }) => {
  const byStaff = {};
  rows.forEach((r) => {
    if (!byStaff[r.staff]) byStaff[r.staff] = { amount: 0, processed: 0, failed: 0 };
    byStaff[r.staff].amount    += parseInt(r.amount) || 0;
    byStaff[r.staff].processed += parseInt(r.processed) || 0;
    byStaff[r.staff].failed    += parseInt(r.failed) || 0;
  });
  const names = Object.keys(byStaff).sort();
  if (!names.length) return <div style={{ padding: 40, textAlign: "center", color: "var(--ink-mute)" }}>データがありません</div>;
  const maxAmt = Math.max(1, ...names.map((n) => byStaff[n].amount));
  const maxRate = Math.max(20, ...names.map((n) => byStaff[n].processed ? ((byStaff[n].processed - byStaff[n].failed) / byStaff[n].processed) * 100 : 0));

  const w = 720, h = 280;
  const padL = 56, padR = 56, padT = 20, padB = 40;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const groupW = innerW / names.length;
  const barW = Math.max(8, (groupW - 12) / 2);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: 280, display: "block" }}>
      {/* Left Y (amount) */}
      {[0, 0.25, 0.5, 0.75, 1].map((p) => (
        <g key={p}>
          <line x1={padL} x2={w - padR} y1={padT + innerH - p * innerH} y2={padT + innerH - p * innerH} stroke="var(--line)" strokeDasharray="2 4"/>
          <text x={padL - 8} y={padT + innerH - p * innerH + 3} fontSize="10" fill="var(--ink-mute)" textAnchor="end">¥{Math.round(maxAmt * p / 1000)}k</text>
        </g>
      ))}
      {/* Right Y (rate %) */}
      {[0, 0.5, 1].map((p) => (
        <text key={p} x={w - padR + 8} y={padT + innerH - p * innerH + 3} fontSize="10" fill="#FBBC04">{Math.round(maxRate * p)}%</text>
      ))}
      {names.map((n, i) => {
        const cx = padL + i * groupW + groupW / 2;
        const amt = byStaff[n].amount;
        const rate = byStaff[n].processed ? ((byStaff[n].processed - byStaff[n].failed) / byStaff[n].processed) * 100 : 0;
        const hA = (amt / maxAmt) * innerH;
        const hR = (rate / maxRate) * innerH;
        return (
          <g key={n}>
            <rect x={cx - barW - 2} y={padT + innerH - hA} width={barW} height={Math.max(0, hA)} fill="var(--accent)" rx="3">
              <title>{`${n}: ${fmtYenSt(amt)}`}</title>
            </rect>
            <rect x={cx + 2} y={padT + innerH - hR} width={barW} height={Math.max(0, hR)} fill="#FBBC04" rx="3">
              <title>{`${n}: 除去率 ${rate.toFixed(1)}%`}</title>
            </rect>
            <text x={cx} y={h - 16} fontSize="11" fill="var(--ink)" textAnchor="middle" fontWeight="600">{n}</text>
          </g>
        );
      })}
    </svg>
  );
};

// ── 6-month grid ──────────────────────────────────────
const StainMonthlyGrid = ({ rows }) => {
  const today = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push(d.toISOString().slice(0, 7));
  }
  const byMonth = {};
  months.forEach((m) => { byMonth[m] = { amount: 0, processed: 0, success: 0, refund: 0 }; });
  rows.forEach((r) => {
    const k = ymKey(r.date);
    if (byMonth[k]) {
      const p = parseInt(r.processed) || 0;
      const rate = parseFloat(r.removalRate) || 0;
      byMonth[k].amount    += parseInt(r.amount) || 0;
      byMonth[k].processed += p;
      byMonth[k].success   += rate * p;
      byMonth[k].refund    += parseInt(r.refund) || 0;
    }
  });

  return (
    <div className="stain-monthly-grid">
      {months.map((m) => {
        const d = byMonth[m];
        const successPct = d.processed ? Math.round((d.success / d.processed) * 100) : 0;
        return (
          <div key={m} className="stain-monthly-card">
            <div className="stain-monthly-month">{ymLabel(m)}</div>
            <div className="stain-monthly-value">{fmtYenSt(d.amount)}</div>
            <div className="stain-monthly-sub">{d.processed}件 ・ 除去率 {successPct}%</div>
          </div>
        );
      })}
    </div>
  );
};

// ── Modal ───────────────────────────────────────────
const ModalSt = ({ title, sub, onClose, children, footer }) => (
  <div className="modal-backdrop" onClick={onClose}>
    <div className="modal" onClick={(e) => e.stopPropagation()}>
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

// ── Settings modal ────────────────────────────────────
const StainSettingsModal = ({ settings, onSave, onClose, onSyncNow, lastSync, lastError, syncing }) => {
  const [url, setUrl] = React.useState(settings.url || "");
  const [autoSync, setAutoSync] = React.useState(settings.autoSync !== false);

  return (
    <ModalSt
      title="同期設定"
      sub="GAS エンドポイントから 1 時間ごとに自動取得"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>キャンセル</button>
          <button className="btn btn-primary" onClick={() => onSave({ url, autoSync, intervalH: 1 })}>保存</button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field full">
          <label className="field-label">GAS Web App URL</label>
          <input className="input" placeholder="https://script.google.com/macros/s/.../exec"
                 value={url} onChange={(e) => setUrl(e.target.value)}/>
          <div style={{ fontSize: 10.5, color: "var(--ink-mute)", marginTop: 4, lineHeight: 1.6 }}>
            <strong>事前準備:</strong><br/>
            1. Apps Script で「ウェブアプリとしてデプロイ」<br/>
            2. アクセス権限「全員」（または社内全員）<br/>
            3. 発行された URL をここに貼り付け
          </div>
        </div>
        <div className="field full">
          <label className="field-label">自動更新</label>
          <select className="select" value={autoSync ? "on" : "off"} onChange={(e) => setAutoSync(e.target.value === "on")}>
            <option value="on">1 時間ごとに自動更新</option>
            <option value="off">手動更新のみ</option>
          </select>
        </div>
        <div className="field full">
          <button className="btn btn-ghost" style={{ width: "100%" }} onClick={onSyncNow} disabled={!url || syncing}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 style={syncing ? { animation: "spin 1s linear infinite" } : null}>
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            {syncing ? "同期中..." : "今すぐ同期"}
          </button>
          <div style={{ fontSize: 11, color: "var(--ink-mute)", marginTop: 8, lineHeight: 1.6 }}>
            {lastSync ? `最終更新: ${new Date(lastSync).toLocaleString("ja-JP")}` : "未同期 ・ デモデータを表示中"}
            {lastError && <div style={{ color: "#dc2626", marginTop: 4 }}>⚠ {lastError}</div>}
          </div>
        </div>
      </div>
    </ModalSt>
  );
};

// ── Toast ──────────────────────────────────────────────
const ToastSt = ({ msg, onDone }) => {
  React.useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [msg]);
  return msg ? <div className="toast">{msg}</div> : null;
};

// ── Main page ─────────────────────────────────────────
const StainReportPage = () => {
  const [rows, setRows] = useFbStateSt("miwa.stain.v1", () => SEED_STAIN);
  const [settings, setSettings] = useFbStateSt("miwa.stain.settings.v1", () => ({
    url: DEFAULT_STAIN_GAS, autoSync: true, intervalH: 1,
  }));
  const [lastSync, setLastSync] = useFbStateSt("miwa.stain.lastSync.v1", () => null);
  const [lastError, setLastError] = React.useState("");
  const [syncing, setSyncing] = React.useState(false);

  const [showSettings, setShowSettings] = React.useState(false);
  const [toast, setToast] = React.useState("");
  const [dark, setDark] = React.useState(false);
  const [month, setMonth] = React.useState(() => new Date().toISOString().slice(0, 7));

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  const syncNow = React.useCallback(async () => {
    if (!settings.url) return;
    setSyncing(true);
    setLastError("");
    try {
      const res = await fetch(settings.url, { redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.message || "GAS error");
      if (!Array.isArray(data)) throw new Error("配列形式ではないレスポンス");
      const filtered = data.filter((r) => {
        const p = parseInt(r.processed) || 0;
        const a = parseInt(r.amount) || 0;
        return p > 0 && a > 0;
      });
      setRows(filtered);
      setLastSync(Date.now());
      setToast(`${filtered.length} 件を同期しました`);
    } catch (e) {
      setLastError(e.message || String(e));
      setToast("同期に失敗しました");
    } finally {
      setSyncing(false);
    }
  }, [settings.url]);

  // Stale-check + interval trigger (1h)
  React.useEffect(() => {
    if (!settings.url || !settings.autoSync) return;
    const intervalMs = (Number(settings.intervalH) || 1) * 60 * 60 * 1000;
    const isStale = () => !lastSync || (Date.now() - lastSync) >= intervalMs;
    if (isStale()) syncNow();
    const tick = setInterval(() => { if (isStale()) syncNow(); }, 60_000);
    return () => clearInterval(tick);
  }, [settings.url, settings.autoSync, settings.intervalH, lastSync, syncNow]);

  const nextSyncLabel = React.useMemo(() => {
    if (!settings.url) return "未設定";
    if (!settings.autoSync) return "自動同期 OFF";
    const intervalMs = (Number(settings.intervalH) || 1) * 60 * 60 * 1000;
    const next = (lastSync || 0) + intervalMs;
    const ms = next - Date.now();
    if (ms <= 0) return "更新待機中…";
    const min = Math.round(ms / 60000);
    if (min < 60) return `次回 ${min}分後`;
    const h = Math.floor(min / 60), m = min % 60;
    return `次回 ${h}時間${m ? `${m}分` : ""}後`;
  }, [settings, lastSync]);

  const monthRows = React.useMemo(() => rows.filter((r) => (r.date || "").startsWith(month)), [rows, month]);

  const availableMonths = React.useMemo(() => {
    const set = new Set(rows.map((r) => ymKey(r.date)).filter(Boolean));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [rows]);

  // 選択月がデータに無ければ、データのある最新月へ自動で合わせる
  React.useEffect(() => {
    if (availableMonths.length && !availableMonths.includes(month)) {
      setMonth(availableMonths[0]);
    }
  }, [availableMonths]);

  const saveSettings = (s) => {
    setSettings(s);
    setShowSettings(false);
    setToast("設定を保存しました");
  };

  return (
    <div className="app">
      <div className="shell">
        <AppSidebar active="stain" />
        <main className="main">
          {/* Greeting */}
          <div className="greet">
            <div>
              <h1>📊 シミ抜き報告</h1>
              <div className="sub">
                全 {rows.length} 件 ・ {lastSync ? `最終更新 ${new Date(lastSync).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}` : "未同期"} ・ {nextSyncLabel}
              </div>
            </div>
            <div className="right">
              <button className="btn btn-ghost" onClick={syncNow} disabled={!settings.url || syncing} title="今すぐ取得">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                     style={syncing ? { animation: "spin 1s linear infinite" } : null}>
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                {syncing ? "同期中" : "更新"}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowSettings(true)} title="同期設定">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>
                </svg>
                設定
              </button>
            </div>
          </div>

          {/* Month picker */}
          <div className="card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-mute)", letterSpacing: "0.06em" }}>対象月</div>
            <select className="select" style={{ width: 180 }} value={month} onChange={(e) => setMonth(e.target.value)}>
              {availableMonths.length === 0 && <option value={month}>{ymLabel(month)}</option>}
              {availableMonths.map((m) => <option key={m} value={m}>{ymLabel(m)}</option>)}
            </select>
            <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-mute)" }}>
              選択月: <strong style={{ color: "var(--ink)" }}>{monthRows.length}件</strong>
            </div>
          </div>

          {/* KPI */}
          <StainKpiRow rows={monthRows} />

          {/* 過去6か月 */}
          <div className="card">
            <div className="card-head">
              <h3 className="card-title">📅 過去 6 か月</h3>
              <span className="card-sub">MONTHLY</span>
            </div>
            <StainMonthlyGrid rows={rows} />
          </div>

          {/* 当月の報告 */}
          <div className="card">
            <div className="card-head">
              <h3 className="card-title">📋 {ymLabel(month)} の報告</h3>
              <span className="card-sub">REPORTS</span>
            </div>
            <StainReportList rows={monthRows} />
          </div>

          {/* 担当者別グラフ */}
          <div className="card chart-card">
            <div className="card-head">
              <h3 className="card-title">📊 担当者別 ・ 金額と除去率</h3>
              <div className="right" style={{ display: "flex", gap: 14, fontSize: 11.5, color: "var(--ink-soft)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--accent)" }}></span>金額
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: "#FBBC04" }}></span>除去率
                </span>
              </div>
            </div>
            <StainStaffChart rows={monthRows} />
          </div>
        </main>
      </div>

      {showSettings && (
        <StainSettingsModal
          settings={settings}
          onSave={saveSettings}
          onClose={() => setShowSettings(false)}
          onSyncNow={syncNow}
          lastSync={lastSync}
          lastError={lastError}
          syncing={syncing}
        />
      )}

      <ToastSt msg={toast} onDone={() => setToast("")}/>
    </div>
  );
};

window.StainReportPage = StainReportPage;
