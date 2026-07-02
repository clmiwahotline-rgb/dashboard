// AI レポート ── 構造化ビュー（JSX）
// polished-ai-report-data.jsx の計算結果を見やすく表示するコンポーネント群。
// window.AiReportViews として公開。

const { yen: aiYen, pct: aiPct } = window.AiReportData;

const AiKpi = (label, value, sub, accent, valueColor) => (
  <div className="kpi" style={{ borderTop: `3px solid ${accent}`, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
    <div className="kpi-label"><span className="kpi-dot" style={{ background: accent }}></span>{label}</div>
    <div className="kpi-value" style={{ color: valueColor || accent, fontSize: 26 }}>{value}</div>
    <div className="kpi-delta">{sub}</div>
  </div>
);

const AiEmpty = ({ label = "データがありません" }) => (
  <div style={{ padding: 40, textAlign: "center", color: "var(--ink-mute)" }}>{label}</div>
);

// ── ① 売上レポート ─────────────────────────────────────
const SalesStructuredView = ({ data, mode, store, setMode, setStore }) => {
  if (!data.stores.length) return <AiEmpty />;
  const g = data.grand;
  const selected = mode === "store" ? data.stores.find((s) => s.store === store) || data.stores[0] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4, background: "var(--bg-2)", borderRadius: 10, padding: 3 }}>
          <button className={`btn btn-sm ${mode !== "store" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode("all")}>🏢 全社版</button>
          <button className={`btn btn-sm ${mode === "store" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode("store")}>🏪 店舗別版</button>
        </div>
        {mode === "store" && (
          <select className="select" value={store || data.stores[0].store} onChange={(e) => setStore(e.target.value)} style={{ width: 200 }}>
            {data.stores.map((s) => <option key={s.store} value={s.store}>{s.store}</option>)}
          </select>
        )}
      </div>

      {mode !== "store" ? (
        <>
          {window.SalesAtoms && window.SalesAtoms.SalesKpiRow ? (
            <window.SalesAtoms.SalesKpiRow rows={data.rawRows} />
          ) : (
            <div className="kpi-row kpi-row-4">
              {AiKpi("💰 売上合計", aiYen(g.sales), `昨対比 ${aiPct(g.yoyPct)}`, "var(--accent)")}
              {AiKpi("👥 客数合計", `${g.customers}人`, `新規 ${g.newCustomers}人`, "#4285F4")}
              {AiKpi("📦 点数合計", `${g.items}点`, "全店舗合計", "#34A853")}
              {AiKpi("💴 客単価", aiYen(g.itemPrice), "全社平均", "#FBBC04")}
            </div>
          )}
          <div className="card" style={{ padding: 0 }}>
            <div className="card-head" style={{ padding: "14px 16px 0" }}>
              <h3 className="card-title">店舗別 売上ランキング</h3>
              <span className="card-sub">RANKING</span>
            </div>
            <div className="ai-group-list" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {data.stores.map((s) => {
                const maxSales = data.stores[0].sales || 1;
                const barPct = Math.max(2, (s.sales / maxSales) * 100);
                const barColor = (window.storeColor && window.storeColor(s.store)) || "var(--accent)";
                return (
                  <div key={s.store} className="ai-item" style={{ display: "grid", gridTemplateColumns: "36px 1fr auto auto auto", gap: 12, alignItems: "center", padding: "10px 12px", background: "var(--bg-2)", borderRadius: 10 }}>
                    <div style={{ fontWeight: 800, color: s.rank <= 3 ? "var(--accent)" : "var(--ink-mute)", fontSize: 15 }}>{s.rank}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
                      <StoreTag name={s.store} />
                      <div style={{ height: 8, background: "var(--card-2, #e9edf1)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${barPct}%`, height: "100%", background: barColor, borderRadius: 4 }}></div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, textAlign: "right" }}>{aiYen(s.sales)}</div>
                    <div style={{ fontSize: 12, color: s.yoyPct >= 100 ? "oklch(0.55 0.15 150)" : "#e54863", fontWeight: 700, textAlign: "right", minWidth: 56 }}>{aiPct(s.yoyPct)}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-mute)", textAlign: "right", minWidth: 90 }}>客{s.customers}人・{s.items}点</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 店舗別 詳細（全社版でも各店舗の内訳をまとめて印刷できるように） */}
          {data.stores.map((s) => (
            <div key={s.store} className="card">
              <div className="card-head">
                <h3 className="card-title">{s.rank}位 {s.store}</h3>
                <span className="card-sub">全{data.stores.length}店舗中</span>
              </div>
              {window.SalesAtoms && window.SalesAtoms.SalesKpiRow ? (
                <window.SalesAtoms.SalesKpiRow rows={data.rawRows.filter((r) => r.store === s.store)} />
              ) : (
                <div className="kpi-row kpi-row-4">
                  {AiKpi("💰 売上", aiYen(s.sales), `昨対比 ${aiPct(s.yoyPct)}`, "var(--accent)")}
                  {AiKpi("📈 日商平均", aiYen(s.avgDaily), `対象${s.days}日`, "#4285F4")}
                  {AiKpi("👥 客数/点数", `${s.customers}人 / ${s.items}点`, `新規 ${s.newCustomers}人`, "#34A853")}
                  {AiKpi("💴 客単価", aiYen(s.itemPrice), "1人あたり", "#FBBC04")}
                </div>
              )}
            </div>
          ))}
        </>
      ) : selected && (
        <>
          {window.SalesAtoms && window.SalesAtoms.SalesKpiRow ? (
            <window.SalesAtoms.SalesKpiRow rows={data.rawRows.filter((r) => r.store === selected.store)} />
          ) : (
            <div className="kpi-row kpi-row-4">
              {AiKpi("💰 売上合計", aiYen(selected.sales), `昨対比 ${aiPct(selected.yoyPct)}`, "var(--accent)")}
              {AiKpi("📈 日商平均", aiYen(selected.avgDaily), `対象${selected.days}日`, "#4285F4")}
              {AiKpi("👥 客数", `${selected.customers}人`, `新規 ${selected.newCustomers}人`, "#34A853")}
              {AiKpi("🏆 順位", `${selected.rank}位`, `全${data.stores.length}店舗中`, selected.rank <= 3 ? "#FBBC04" : "var(--ink-mute)")}
            </div>
          )}
          <div className="card">
            <div className="card-head">
              <h3 className="card-title">🏆 全店舗中の順位</h3>
              <span className="card-sub">{selected.store}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: selected.rank <= 3 ? "#FBBC04" : "var(--ink)" }}>
              {selected.rank}<span style={{ fontSize: 15, fontWeight: 700, color: "var(--ink-mute)", marginLeft: 6 }}>/ 全{data.stores.length}店舗中</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ── ② シミ抜き報告 ─────────────────────────────────────
const StainStructuredView = ({ data }) => (
  <div className="kpi-row kpi-row-4">
    {AiKpi("📦 処理件数", `${data.totalProcessed}件`, "受付ベース", "#4285F4")}
    {AiKpi("💰 金額合計", aiYen(data.totalAmount), "当期累計", "var(--accent)")}
    {AiKpi("✨ 除去率", aiPct(data.avgRemoval * 100), "成功率（平均）", "#34A853")}
    {AiKpi("💸 返金", aiYen(data.totalRefund), `返金率 ${aiPct(data.refundRate * 100)}`, "#FBBC04")}
  </div>
);

// ── ③ フィードバック（店舗別グループ・新しい順・原文） ──
const FeedbackStructuredView = ({ data }) => {
  if (!data.total) return <AiEmpty />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {data.storesSorted.map((store) => (
        <div key={store} className="card">
          <div className="card-head">
            <StoreTag name={store} />
            <span className="card-sub">{data.byStore[store].length} 件</span>
          </div>
          <div className="ai-group-list" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.byStore[store].map((r, i) => (
              <div key={i} className="ai-item" style={{ padding: "10px 12px", background: "var(--bg-2)", borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink-mute)", marginBottom: 4 }}>
                  <span>{r.reportDate || "—"} ・ {r.item || "—"}</span>
                  <span style={{ fontWeight: 700, color: "var(--accent)" }}>{r.type || "—"}</span>
                </div>
                <div style={{ fontSize: 13.5, whiteSpace: "pre-wrap" }}>{r.content || "—"}</div>
                {(r.cause || r.improvement) && (
                  <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-soft)" }}>
                    {r.cause && <div>原因: {r.cause}</div>}
                    {r.improvement && <div>改善: {r.improvement}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── ④ 工場報告（工場別合計/平均 + 曜日別） ─────────────
const FactoryStructuredView = ({ data }) => {
  if (!data.factories.length) return <AiEmpty />;
  const maxWeekday = Math.max(1, ...data.factories.flatMap((f) => f.weekday.map((w) => w.total)));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {data.factories.map((f) => (
        <div key={f.factory} className="card">
          <div className="card-head">
            <h3 className="card-title">🏭 {f.factory}</h3>
            <span className="card-sub">対象 {f.dayCount} 日</span>
          </div>
          <div className="kpi-row kpi-row-4" style={{ marginBottom: 16 }}>
            {AiKpi("📦 合計処理点数", `${f.totalLots}点`, `通常${f.normalLot}・特急${f.extraLot}`, "var(--accent)")}
            {AiKpi("⏱ 合計工数", `${f.hours}h`, `日平均 ${f.avgHoursPerDay.toFixed(1)}h`, "#4285F4")}
            {AiKpi("📈 生産性", `${f.productivity.toFixed(1)}点/h`, "工数あたり", "#34A853")}
            {AiKpi("📊 日平均点数", `${f.avgLotsPerDay.toFixed(1)}点`, "1日あたり", "#FBBC04")}
          </div>
          <div className="card-head" style={{ padding: 0, marginBottom: 8 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-soft)", margin: 0 }}>曜日別 合計処理点数</h4>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 100 }}>
            {f.weekday.map((w) => (
              <div key={w.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)" }}>{w.total}</div>
                <div style={{ width: "70%", height: Math.max(3, (w.total / maxWeekday) * 64), background: "var(--accent)", borderRadius: 4 }}></div>
                <div style={{ fontSize: 11.5, color: "var(--ink-mute)" }}>{w.label}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── ⑤ クレーム・事故品（店舗別グループ・新しい順） ─────
const CLAIM_STATUS_COLOR = { "受付": "#4285F4", "対応中": "#FBBC04", "解決済み": "#34A853", "完了": "#34A853" };
const ClaimStructuredView = ({ data }) => {
  if (!data.total) return <AiEmpty />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {data.storesSorted.map((store) => (
        <div key={store} className="card">
          <div className="card-head">
            <StoreTag name={store} />
            <span className="card-sub">{data.byStore[store].length} 件</span>
          </div>
          <div className="ai-group-list" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.byStore[store].map((r, i) => {
              const stColor = CLAIM_STATUS_COLOR[r.status] || "var(--ink-mute)";
              return (
                <div key={i} className="ai-item" style={{ padding: "10px 12px", background: "var(--bg-2)", borderRadius: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6, fontSize: 12, color: "var(--ink-mute)", marginBottom: 4 }}>
                    <span>{r.receivedOn || r.occurredOn || "—"} ・ {r.type || "—"} ・ {r.item || "—"}</span>
                    <span style={{ fontWeight: 700, color: stColor }}>{r.status || "—"}{r.amount > 0 ? ` ・ ${aiYen(r.amount)}` : ""}</span>
                  </div>
                  <div style={{ fontSize: 13.5, whiteSpace: "pre-wrap" }}>{r.detail || "—"}</div>
                  <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-soft)", display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {r.maker && <span>メーカー: {r.maker}{r.makerContact ? `（${r.makerContact}）` : ""}</span>}
                    {r.staff && <span>担当: {r.staff}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── ⑥ 車両管理（車両別メンテ履歴＋燃費） ───────────────
const VehicleStructuredView = ({ data }) => {
  if (!data.vehicles.length) return <AiEmpty />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {data.vehicles.map((v) => (
        <div key={v.name} className="card">
          <div className="card-head">
            <h3 className="card-title">🚚 {v.name}{v.model ? `（${v.model}）` : ""}</h3>
            <span className="card-sub">{v.store || "—"}</span>
          </div>
          <div className="kpi-row kpi-row-4" style={{ marginBottom: 14 }}>
            {AiKpi("🧑 担当", v.staff || "—", "配備担当", "var(--accent)")}
            {AiKpi("📍 走行距離", v.odometer ? `${v.odometer.toLocaleString("ja-JP")}km` : "—", "現在値", "#4285F4")}
            {AiKpi("⛽ 燃費", v.economy != null ? `${v.economy.toFixed(1)} km/L` : "—", "給油記録より算出", "#34A853")}
            {AiKpi("🔧 整備件数", `${v.history.length}件`, "履歴合計", "#FBBC04")}
          </div>
          {v.history.length > 0 ? (
            <div className="ai-group-list" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {v.history.map((h, i) => (
                <div key={i} className="ai-item" style={{ display: "grid", gridTemplateColumns: "90px 1fr auto", gap: 10, padding: "8px 12px", background: "var(--bg-2)", borderRadius: 10, fontSize: 13 }}>
                  <span style={{ color: "var(--ink-mute)", fontSize: 12 }}>{h.date || "—"}</span>
                  <span>{h.type || "整備"}{h.detail ? ` ・ ${h.detail}` : ""}{h.shop ? ` ・ ${h.shop}` : ""}</span>
                  <span style={{ fontWeight: 700, color: "var(--accent)" }}>{h.cost ? aiYen(h.cost) : ""}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: "var(--ink-mute)" }}>整備履歴の記録はありません</div>
          )}
        </div>
      ))}
    </div>
  );
};

// ── ⑦ ありがとうカード（総括＋店舗別・カテゴリ別・原文） ─
const ThanksStructuredView = ({ data }) => {
  if (!data.total) return <AiEmpty />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="kpi-row kpi-row-4">
        {AiKpi("📮 総登録数", `${data.total}件`, "全店舗合計", "var(--accent)")}
        {AiKpi("🥇 投稿最多店舗", data.topStore ? data.topStore[0] : "—", data.topStore ? `${data.topStore[1]}件` : "", "#EA4335")}
        {AiKpi("🏷 最多カテゴリ", data.topKind ? data.topKind[0] : "—", data.topKind ? `${data.topKind[1]}件` : "", "#FBBC04")}
        {AiKpi("🏪 投稿店舗数", `${data.storesSorted.length}店舗`, "対象拠点", "#34A853")}
      </div>
      {data.storesSorted.map((store) => {
        const g = data.grouped[store];
        return (
          <div key={store} className="card">
            <div className="card-head">
              <StoreTag name={store} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {g.kindsSorted.map((kind) => (
                <div key={kind}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent)", marginBottom: 6 }}>{kind}（{g.byKind[kind].length}件）</div>
                  <div className="ai-group-list" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {g.byKind[kind].map((r, i) => {
                      const ck = window.AiReportData.cardKeyOf(r);
                      const comments = data.commentsByKey[ck] || [];
                      return (
                        <div key={i} className="ai-item" style={{ padding: "9px 12px", background: "var(--bg-2)", borderRadius: 10 }}>
                          <div style={{ fontSize: 11.5, color: "var(--ink-mute)", marginBottom: 3 }}>{(r.date || "").slice(0, 10)}</div>
                          <div style={{ fontSize: 13.5, whiteSpace: "pre-wrap" }}>{r.content || "—"}</div>
                          {comments.length > 0 && (
                            <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 3 }}>
                              {comments.map((c, j) => (
                                <div key={j} style={{ fontSize: 12, color: "var(--ink-soft)" }}>💬 {c.who ? <b>{c.who}：</b> : ""}{c.text}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── ⑧ 共有ボード（リスト表示のみ） ─────────────────────
const BoardStructuredView = ({ data }) => {
  if (!data.total) return <AiEmpty />;
  return (
    <div className="card">
      <div className="card-head">
        <h3 className="card-title">📌 共有事項一覧</h3>
        <span className="card-sub">{data.total} 件</span>
      </div>
      <div className="ai-group-list" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data.sorted.map((p, i) => (
          <div key={i} className="ai-item" style={{ padding: "10px 12px", background: "var(--bg-2)", borderRadius: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink-mute)", marginBottom: 4 }}>
              <span>{p.who || "匿名"}{p.badge ? ` ・ ${p.badge}` : ""}</span>
              <span>{p.ts ? new Date(p.ts).toLocaleString("ja-JP", { dateStyle: "short", timeStyle: "short" }) : ""}</span>
            </div>
            {p.text && <div style={{ fontSize: 13.5, whiteSpace: "pre-wrap" }}>{p.text}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

window.AiReportViews = {
  SalesStructuredView, StainStructuredView, FeedbackStructuredView,
  FactoryStructuredView, ClaimStructuredView, VehicleStructuredView,
  ThanksStructuredView, BoardStructuredView,
};
