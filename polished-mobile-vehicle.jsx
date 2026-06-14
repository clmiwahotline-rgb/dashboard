// モバイル版 ─ 車両管理（全機能）
// polished-vehicles.jsx の window エクスポートを流用
//   useVehicleData / DUE_ITEMS / itemStatus / fmtYenV / fmtKm / dateJP
//   VehicleEditor / FuelEditor / MaintEditor / MAINT_COLOR / VEH_STORES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── 期限バッジ ─────────────────────────────────────
const MVehDueChip = ({ v, it }) => {
  const st = window.itemStatus(v, it);
  const colors = {
    overdue: { bg: "#fde2e2", color: "#c5221f" },
    urgent:  { bg: "#fdebcf", color: "#d9730a" },
    warn:    { bg: "#fef3cd", color: "#9a6700" },
    ok:      { bg: "#e6f4ea", color: "#1e8e3e" },
    na:      { bg: "var(--card-2)", color: "var(--ink-mute)" },
  };
  const c = colors[st.cls] || colors.na;
  return (
    <div className="mveh-due-chip" style={{ background: c.bg, color: c.color }}>
      <div className="mveh-due-label">{it.label}</div>
      <div className="mveh-due-badge">{st.label}</div>
    </div>
  );
};

// ── 車両カード ─────────────────────────────────────
const MVehCard = ({ v, economy, report, onEdit }) => {
  const worst = window.DUE_ITEMS.reduce((acc, it) => {
    const r = window.STATUS_RANK[window.itemStatus(v, it).cls];
    return r < acc ? r : acc;
  }, 9);
  const rimColors = { 0: "#c5221f", 1: "#d9730a", 2: "#9a6700", 3: "#1e8e3e", 9: "var(--line)" };
  return (
    <div className="mveh-card" style={{ borderLeft: `4px solid ${rimColors[worst] || "var(--line)"}` }}>
      <div className="mveh-card-head">
        <div>
          <div className="mveh-plate">{v.name}</div>
          <div className="mveh-model">{v.model}{v.store ? ` ・ ${v.store}` : ""}</div>
        </div>
        <button className="mveh-edit-btn" onClick={() => onEdit(v)}>編集</button>
      </div>
      <div className="mveh-meta">
        {v.staff && <span className="mveh-meta-item">👤 {v.staff}</span>}
        {v.odometer > 0 && <span className="mveh-meta-item">🛣 {window.fmtKm(v.odometer)}</span>}
        {economy != null && <span className="mveh-meta-item">⛽ {economy.toFixed(1)}km/L</span>}
      </div>
      {report && (
        <div className="mveh-report">
          直近: <b>{(report.date || "").replaceAll("-", "/")}</b>　{report.label}
        </div>
      )}
      <div className="mveh-due-grid">
        {window.DUE_ITEMS.map((it) => <MVehDueChip key={it.key} v={v} it={it} />)}
      </div>
    </div>
  );
};

// ── アラートバナー ─────────────────────────────────
const MVehAlerts = ({ vehicles }) => {
  const alerts = [];
  vehicles.forEach((v) => {
    window.DUE_ITEMS.forEach((it) => {
      const st = window.itemStatus(v, it);
      if (["overdue","urgent","warn"].includes(st.cls)) {
        alerts.push({ vehicle: v.name, item: it.label, label: st.label, cls: st.cls });
      }
    });
  });
  if (!alerts.length) return (
    <div className="mveh-alert-ok">✓ 期限が近い項目はありません</div>
  );
  return (
    <div className="mveh-alert-list">
      {alerts.slice(0, 5).map((a, i) => {
        const bg = a.cls === "overdue" ? "#fde2e2" : a.cls === "urgent" ? "#fdebcf" : "#fef3cd";
        const color = a.cls === "overdue" ? "#c5221f" : a.cls === "urgent" ? "#d9730a" : "#9a6700";
        return (
          <div key={i} className="mveh-alert-row" style={{ background: bg }}>
            <span style={{ fontWeight: 800, color }}>{a.label}</span>
            <span className="mveh-alert-item">{a.item}</span>
            <span className="mveh-alert-vehicle">{a.vehicle}</span>
          </div>
        );
      })}
      {alerts.length > 5 && <div className="m-empty" style={{ padding: "6px 0" }}>他 {alerts.length - 5} 件</div>}
    </div>
  );
};

// ── 給油リスト ─────────────────────────────────────
const MVehFuelList = ({ fuel, eco, onAdd, onEdit }) => {
  const sorted = [...fuel].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return (
    <div>
      <div className="m-sec-title" style={{ marginTop: 16 }}>
        ⛽ 給油記録
        <button className="mveh-add-btn" onClick={onAdd}>＋ 追加</button>
      </div>
      {sorted.length === 0
        ? <div className="m-empty">給油記録がありません</div>
        : sorted.slice(0, 20).map((f, i) => (
          <div key={f.id || i} className="mveh-row" onClick={() => onEdit(f)}>
            <div className="mveh-row-date">{(f.date || "").slice(5).replaceAll("-", "/")}</div>
            <div className="mveh-row-main">
              <div className="mveh-row-title">{f.vehicle}</div>
              <div className="mveh-row-sub">{(parseFloat(f.liters)||0).toFixed(1)}L ・ {window.fmtYenV(f.amount)}{f.odometer ? ` ・ ${window.fmtKm(f.odometer)}` : ""}</div>
            </div>
            {eco[f.vehicle] != null && <div className="mveh-row-eco">{eco[f.vehicle].toFixed(1)}<span>km/L</span></div>}
          </div>
        ))
      }
    </div>
  );
};

// ── 整備リスト ─────────────────────────────────────
const MVehMaintList = ({ maint, onAdd, onEdit }) => {
  const sorted = [...maint].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return (
    <div>
      <div className="m-sec-title" style={{ marginTop: 16 }}>
        🔧 整備・修理履歴
        <button className="mveh-add-btn" onClick={onAdd}>＋ 追加</button>
      </div>
      {sorted.length === 0
        ? <div className="m-empty">整備記録がありません</div>
        : sorted.slice(0, 20).map((m, i) => {
          const c = window.MAINT_COLOR[m.type] || "#5f6368";
          return (
            <div key={m.id || i} className="mveh-row" onClick={() => onEdit(m)}>
              <div className="mveh-row-date">{(m.date || "").slice(5).replaceAll("-", "/")}</div>
              <div className="mveh-row-main">
                <div className="mveh-row-title">{m.vehicle} <span className="mveh-type-tag" style={{ background: c + "22", color: c }}>{m.type}</span></div>
                <div className="mveh-row-sub">{[m.detail, m.shop, m.cost ? window.fmtYenV(m.cost) : ""].filter(Boolean).join(" ・ ")}</div>
              </div>
            </div>
          );
        })
      }
    </div>
  );
};

// ── メイン ─────────────────────────────────────────
const MVehicle = ({ registerHeader, registerFab }) => {
  const { vehicles, fuel, maint, cloudOn, cloudState, lastSync, pull, vehicleMut, fuelMut, maintMut } = window.useVehicleData();
  const eco = window.computeFuelEconomy(fuel);
  const [tab, setTab] = React.useState("vehicles");
  const [editVeh, setEditVeh] = React.useState(null);
  const [editFuel, setEditFuel] = React.useState(null);
  const [editMaint, setEditMaint] = React.useState(null);
  const [importing, setImporting] = React.useState(false);
  const [importMsg, setImportMsg] = React.useState(null);

  React.useEffect(() => {
    const sub = cloudOn
      ? (cloudState === "ok" ? "☁ 全店で共有中" : cloudState === "loading" ? "☁ 同期中…" : "☁ オフライン")
      : "端末内データ";
    registerHeader && registerHeader({ title: "車両管理", sub });
    registerFab && registerFab(null);
  }, [cloudState]);

  // 洗車日を整備履歴から自動取得
  const lastWashByVehicle = React.useMemo(() => {
    const m = {};
    maint.forEach((r) => {
      if (r.type !== "洗車") return;
      const v = (r.vehicle || "").trim(), d = r.date || "";
      if (v && d && (!m[v] || d > m[v])) m[v] = d;
    });
    return m;
  }, [maint]);

  const latestOdoByVehicle = React.useMemo(() => {
    const m = {};
    fuel.forEach((r) => {
      const v = (r.vehicle || "").trim(), o = parseFloat(r.odometer) || 0;
      if (v && o && (!m[v] || o > m[v])) m[v] = o;
    });
    return m;
  }, [fuel]);

  const latestReportByVehicle = React.useMemo(() => {
    const m = {};
    const consider = (vn, date, label) => {
      const v = (vn || "").trim();
      if (!v || !date) return;
      if (!m[v] || date > m[v].date) m[v] = { date, label };
    };
    fuel.forEach((r) => consider(r.vehicle, r.date, `給油 ${(parseFloat(r.liters)||0).toFixed(1)}L`));
    maint.forEach((r) => consider(r.vehicle, r.date, r.type || "整備"));
    return m;
  }, [fuel, maint]);

  const vehiclesEnriched = React.useMemo(() => vehicles.map((v) => {
    const name = (v.name || "").trim();
    const repOdo = latestOdoByVehicle[name] || 0;
    const fromMaint = lastWashByVehicle[name] || "";
    const fromVehicle = v.washLastDate || "";
    return {
      ...v,
      odometer: Math.max(Number(v.odometer) || 0, repOdo),
      washLastDate: fromMaint && fromVehicle ? (fromMaint > fromVehicle ? fromMaint : fromVehicle) : (fromMaint || fromVehicle),
    };
  }), [vehicles, lastWashByVehicle, latestOdoByVehicle]);

  const worstRank = (v) => window.DUE_ITEMS.reduce((acc, it) => Math.min(acc, window.STATUS_RANK[window.itemStatus(v, it).cls]), 9);
  const sortedVehicles = [...vehiclesEnriched].sort((a, b) => worstRank(a) - worstRank(b));

  const needAttention = sortedVehicles.filter((v) => worstRank(v) <= 2).length;

  const importFromForm = async () => {
    if (importing) return;
    setImporting(true); setImportMsg(null);
    try {
      if (cloudOn && typeof cloudImportVehicleForm === "function") {
        const res = await cloudImportVehicleForm();
        if (res && res.ok) {
          await pull();
          const n = (res.fuel || 0) + (res.maint || 0);
          setImportMsg({ ok: true, text: n > 0 ? `給油 ${res.fuel||0}件・整備 ${res.maint||0}件 取り込みました` : "新しい回答はありませんでした" });
          return;
        }
      }
      setImportMsg({ ok: false, text: "クラウド接続が必要です" });
    } catch (e) {
      setImportMsg({ ok: false, text: String((e && e.message) || e) });
    } finally {
      setImporting(false);
      setTimeout(() => setImportMsg(null), 5000);
    }
  };

  return (
    <div>
      {/* KPI */}
      <div className="m-sales-kpis" style={{ marginBottom: 14 }}>
        <div className="m-sales-kpi big">
          <div className="m-sales-kpi-label">保有台数</div>
          <div className="m-sales-kpi-val">{vehicles.length}<span className="u">台</span></div>
        </div>
        <div className="m-sales-kpi" style={{ borderLeft: needAttention > 0 ? "3px solid #d9730a" : undefined }}>
          <div className="m-sales-kpi-label">要対応</div>
          <div className="m-sales-kpi-val" style={{ color: needAttention > 0 ? "#d9730a" : "#1e8e3e" }}>
            {needAttention}<span className="u">台</span>
          </div>
        </div>
      </div>

      {/* アラートバナー */}
      <MVehAlerts vehicles={vehiclesEnriched} />

      {/* 直近の報告ログ */}
      {(fuel.length > 0 || maint.length > 0) && (() => {
        const items = [
          ...fuel.map((r) => ({ date: r.date, label: `給油 ${(parseFloat(r.liters)||0).toFixed(1)}L`, vehicle: r.vehicle, sub: window.fmtYenV(r.amount), kind: "fuel" })),
          ...maint.map((r) => ({ date: r.date, label: r.type || "整備", vehicle: r.vehicle, sub: [r.detail, r.cost ? window.fmtYenV(r.cost) : ""].filter(Boolean).join(" ・ "), kind: r.type === "洗車" ? "wash" : "maint" })),
        ].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 5);
        const kindColor = { fuel: "#4285F4", maint: "#5f6368", wash: "#00A0B0" };
        return (
          <div className="m-card" style={{ marginBottom: 14 }}>
            <div className="m-card-head">
              <span className="m-card-title">🕒 直近の報告</span>
              <button className="m-import-btn" style={{ marginLeft: "auto" }} onClick={pull} disabled={!cloudOn || cloudState === "loading"}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={cloudState === "loading" ? { animation: "spin 0.8s linear infinite" } : {}}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                更新
              </button>
            </div>
            <div className="m-card-body" style={{ padding: "8px 16px 14px" }}>
              {items.map((it, i) => (
                <div key={i} className="mveh-row">
                  <div className="mveh-row-date">{(it.date || "").slice(5).replaceAll("-", "/")}</div>
                  <div className="mveh-row-main">
                    <div className="mveh-row-title">{it.vehicle} <span className="mveh-type-tag" style={{ background: (kindColor[it.kind] || "#5f6368") + "22", color: kindColor[it.kind] || "#5f6368" }}>{it.label}</span></div>
                    {it.sub && <div className="mveh-row-sub">{it.sub}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* タブ */}
      <div className="m-chips" style={{ marginBottom: 12 }}>
        <button className={`m-chip ${tab === "vehicles" ? "active" : ""}`} onClick={() => setTab("vehicles")}>
          車両<span className="m-pr-tabn">{vehicles.length}</span>
        </button>
        <button className={`m-chip ${tab === "fuel" ? "active" : ""}`} onClick={() => setTab("fuel")}>
          給油<span className="m-pr-tabn">{fuel.length}</span>
        </button>
        <button className={`m-chip ${tab === "maint" ? "active" : ""}`} onClick={() => setTab("maint")}>
          整備<span className="m-pr-tabn">{maint.length}</span>
        </button>
      </div>

      {/* 車両タブ */}
      {tab === "vehicles" && (
        <div>
          <button className="mveh-add-full" onClick={importFromForm} disabled={importing}>
            {importing ? "📥 取込中…" : "📥 フォームから取込"}
          </button>
          {importMsg && (
            <div style={{ background: importMsg.ok ? "#e6f4ea" : "#fde2e2", color: importMsg.ok ? "#1e7a36" : "#b5271b", borderRadius: 10, padding: "9px 13px", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
              {importMsg.ok ? "✓ " : "⚠ "}{importMsg.text}
            </div>
          )}
          {sortedVehicles.length === 0
            ? <div className="m-empty">車両データがありません</div>
            : sortedVehicles.map((v) => (
              <MVehCard key={v.id || v.name} v={v} economy={eco[v.name]} report={latestReportByVehicle[(v.name || "").trim()]} onEdit={setEditVeh} />
            ))
          }
        </div>
      )}

      {/* 給油タブ */}
      {tab === "fuel" && <MVehFuelList fuel={fuel} eco={eco} onAdd={() => setEditFuel("new")} onEdit={setEditFuel} />}

      {/* 整備タブ */}
      {tab === "maint" && <MVehMaintList maint={maint} onAdd={() => setEditMaint("new")} onEdit={setEditMaint} />}

      <div style={{ height: 16 }}></div>

      {/* モーダル（portal でタブバーの外に） */}
      {editVeh && ReactDOM.createPortal(
        <window.VehicleEditor initial={editVeh === "new" ? null : editVeh} vehicles={vehicles} onClose={() => setEditVeh(null)} onSave={vehicleMut.upsert} onDelete={vehicleMut.remove} />,
        document.getElementById("m-root") || document.body
      )}
      {editFuel && ReactDOM.createPortal(
        <window.FuelEditor initial={editFuel === "new" ? null : editFuel} vehicles={vehicles} onClose={() => setEditFuel(null)} onSave={fuelMut.upsert} onDelete={fuelMut.remove} />,
        document.getElementById("m-root") || document.body
      )}
      {editMaint && ReactDOM.createPortal(
        <window.MaintEditor initial={editMaint === "new" ? null : editMaint} vehicles={vehicles} onClose={() => setEditMaint(null)} onSave={maintMut.upsert} onDelete={maintMut.remove} />,
        document.getElementById("m-root") || document.body
      )}
    </div>
  );
};

window.MVehicle = MVehicle;
