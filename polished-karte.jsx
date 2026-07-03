// カルテ（ハイブランドコース）── メインページ：一覧・検索・詳細・作成/編集

const KarteDetail = ({ karte, onEdit, onDelete, onBack, onOpenPrintSheet }) => {
  const total = window.karteTotal(karte);
  const overdue = karte.deliveryDate && karte.deliveryDate < window.kToday();
  return (
    <div className="card">
      <div className="card-head no-print">
        <button className="btn btn-ghost" onClick={onBack}>← 一覧へ戻る</button>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => window.print()}>🖨 簡易印刷</button>
          <button className="btn btn-primary" onClick={onOpenPrintSheet}>🖨 A5両面シート</button>
          <button className="btn btn-ghost" onClick={() => onEdit(karte)}>✎ 編集</button>
          <button className="btn btn-ghost" style={{ color: "#e54863" }} onClick={() => onDelete(karte.id)}>削除</button>
        </div>
      </div>

      <div className="kt-detail-head">
        <div>
          <h2 className="kt-detail-name">{karte.customerName}{/様$/.test((karte.customerName || "").trim()) ? "" : " 様"}</h2>
          <div className="kt-detail-sub">
            <StoreTag name={karte.store} /> ・ タグ {karte.tagNo || "—"} ・ 顧客番号 {karte.customerNo || "—"} ・ カルテNo. {karte.no || "—"}
          </div>
        </div>
        <div className="kt-detail-dates">
          <div>預かり日 {window.dateSlashK(karte.receivedDate) || "—"}</div>
          <div className={overdue ? "kt-overdue" : ""}>お渡し予定日 {window.dateSlashK(karte.deliveryDate) || "—"}{overdue ? "（超過）" : ""}</div>
        </div>
      </div>

      <div className="kt-section">
        <div className="kt-section-title">商品情報</div>
        <div className="kt-detail-grid">
          <div><span className="kt-dl">種別</span>{karte.item.category}</div>
          <div><span className="kt-dl">ブランド</span>{karte.item.brand || "—"}</div>
          <div><span className="kt-dl">製造番号</span>{karte.item.serialNo || "—"}</div>
          <div><span className="kt-dl">色</span>{karte.item.color || "—"}</div>
          <div><span className="kt-dl">参考購入価格</span>{karte.item.purchasePrice ? window.yenK(karte.item.purchasePrice) : "—"}</div>
          <div><span className="kt-dl">購入時期</span>{karte.item.purchaseTime || "—"}</div>
        </div>
      </div>

      {((karte.requestChecks || []).length > 0 || karte.request || karte.proposal || karte.customization) && (
        <div className="kt-section">
          <div className="kt-section-title">ご要望・ご提案</div>
          {(karte.requestChecks || []).length > 0 && (
            <div className="kt-detail-block">
              <span className="kt-dl">ご要望（チェック項目）</span>
              <div className="kt-measure-view" style={{ marginTop: 4 }}>
                {karte.requestChecks.map((r) => <div key={r} className="kt-measure-chip">✓ {r}</div>)}
              </div>
            </div>
          )}
          {karte.request && <div className="kt-detail-block"><span className="kt-dl">その他のご要望</span>{karte.request}</div>}
          {karte.proposal && <div className="kt-detail-block"><span className="kt-dl">ご提案</span>{karte.proposal}</div>}
          {(() => {
            const c = karte.custom || {};
            const parts = [];
            window.CUSTOMIZE_GROUPS.forEach((g) => { if (c[g.key]) parts.push(`${g.label}：${c[g.key]}`); });
            (c.options || []).forEach((o) => parts.push(o === "シミ抜き" && c.stainLimit ? `シミ抜き（${window.yenK(c.stainLimit)}まで）` : o));
            if (!parts.length) return null;
            return (
              <div className="kt-detail-block">
                <span className="kt-dl">カスタマイズ</span>
                <div className="kt-measure-view" style={{ marginTop: 4 }}>
                  {parts.map((p, i) => <div key={i} className="kt-measure-chip">{p}</div>)}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-mute)", marginTop: 6 }}>※ {window.CUSTOMIZE_STANDARD_NOTE}</div>
              </div>
            );
          })()}
          {karte.customization && <div className="kt-detail-block"><span className="kt-dl">カスタマイズ補足</span>{karte.customization}</div>}
        </div>
      )}

      {karte.measurements.length > 0 && (
        <div className="kt-section">
          <div className="kt-section-title">採寸</div>
          <div className="kt-measure-view">
            {karte.measurements.map((m) => (
              <div key={m.id} className="kt-measure-chip"><b>{m.label}</b>前 {m.before || "—"}cm ／ 後 {m.after || "—"}cm</div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-mute)", marginTop: 6 }}>※伸縮２％までは許容範囲とさせて頂きます</div>
        </div>
      )}

      <div className="kt-section">
        <div className="kt-section-title">シミ・傷の位置</div>
        <KarteDiagram type={karte.diagramType} pins={karte.pins} readOnly
                      onAddPin={() => {}} onRemovePin={() => {}} onUpdatePinNote={() => {}} onUpdatePinKind={() => {}} />
      </div>

      <div className="kt-section">
        <div className="kt-section-title">料金</div>
        <div className="kt-detail-grid">
          <div><span className="kt-dl">クリーニング料金</span>{window.yenK(karte.pricing.cleaningFee)}</div>
          <div><span className="kt-dl">オプション料金</span>{window.yenK(karte.pricing.optionFee)}</div>
          <div><span className="kt-dl">追加補償</span>{karte.pricing.hasCompensation ? `あり（${window.yenK(karte.pricing.compensationFee)}）` : "なし"}</div>
          <div className="kt-total-row"><span className="kt-dl">合計金額</span><span className="kt-total-value">{window.yenK(total)}</span></div>
        </div>
      </div>

      <div className="kt-section">
        <div className="kt-section-title">了解確認事項</div>
        {(karte.confirmations.checks || []).length > 0 && (
          <div className="kt-detail-block" style={{ marginBottom: 10 }}>
            <span className="kt-dl">現状確認項目</span>
            <div className="kt-measure-view" style={{ marginTop: 4 }}>
              {karte.confirmations.checks.map((c) => <div key={c} className="kt-measure-chip">{c}</div>)}
            </div>
          </div>
        )}
        {karte.confirmations.note && <div className="kt-detail-block" style={{ marginTop: 8 }}><span className="kt-dl">事前の検品時に気になった点</span>{karte.confirmations.note}</div>}
        {karte.confirmations.advice && <div className="kt-detail-block" style={{ marginTop: 8 }}><span className="kt-dl">クリーニング後のお客様へのアドバイス</span>{karte.confirmations.advice}</div>}
      </div>
    </div>
  );
};

const KarteCard = ({ karte, onOpen }) => {
  const total = window.karteTotal(karte);
  const overdue = karte.deliveryDate && karte.deliveryDate < window.kToday();
  const diffDays = karte.deliveryDate ? Math.round((new Date(karte.deliveryDate + "T00:00:00") - new Date(window.kToday() + "T00:00:00")) / 86400000) : null;
  const urgency = overdue ? "over" : (diffDays != null && diffDays <= 1 ? "red" : (diffDays != null && diffDays <= 3 ? "orange" : ""));
  const itemLine = [karte.item.brand, karte.item.category, karte.item.color].filter(Boolean).join(" ・ ");
  return (
    <div className="kt-card" onClick={() => onOpen(karte)}>
      <div className="kt-card-body">
        <div className="kt-card-row1">
          <StoreTag name={karte.store} />
          <span className="kt-card-no">{karte.no || "—"}</span>
        </div>
        <div className="kt-card-row2">
          <span className="kt-card-name">{karte.customerName ? `${karte.customerName.replace(/\s*様\s*$/, "")}様` : "（お名前未入力）"}</span>
          <span className="kt-card-tag">タグ {karte.tagNo || "—"}</span>
        </div>
        <div className="kt-card-item">{itemLine || "—"}</div>
        <div className={`kt-card-dates ${urgency ? "kt-card-dates-" + urgency : ""}`}>
          <span>預かり {window.dateSlashK(karte.receivedDate) || "—"}</span>
          <span>渡し {window.dateSlashK(karte.deliveryDate) || "—"}{overdue ? "（超過）" : ""}</span>
        </div>
      </div>
    </div>
  );
};

const KartePage = () => {
  const { list, upsertKarte, removeKarte, cloudOn, cloudTs } = window.useKarteData();
  const [mode, setMode] = React.useState("list"); // list | form | detail
  const [selectedId, setSelectedId] = React.useState(null);
  const [query, setQuery] = React.useState("");
  const [storeFilter, setStoreFilter] = React.useState("");

  const selected = list.find((k) => k.id === selectedId) || null;

  const filtered = React.useMemo(() => {
    let arr = [...list];
    if (storeFilter) arr = arr.filter((k) => k.store === storeFilter);
    const q = query.trim();
    if (q) {
      arr = arr.filter((k) =>
        (k.customerName || "").includes(q) || (k.customerNo || "").includes(q) ||
        (k.tagNo || "").includes(q) || (k.item.brand || "").includes(q)
      );
    }
    return arr.sort((a, b) => (b.receivedDate || "").localeCompare(a.receivedDate || "") || b.createdAt - a.createdAt);
  }, [list, query, storeFilter]);

  const openDetail = (k) => { setSelectedId(k.id); setMode("detail"); };
  const openNew = () => { setSelectedId(null); setMode("form"); };
  const openEdit = (k) => { setSelectedId(k.id); setMode("form"); };
  const backToList = () => { setMode("list"); setSelectedId(null); };
  const openItems = () => setMode("items");
  const openPrintSheet = () => setMode("print");
  const handleSave = (karte) => { upsertKarte(karte); setSelectedId(karte.id); setMode("detail"); };
  const handleDelete = (id) => {
    if (!confirm("このカルテを削除しますか？")) return;
    removeKarte(id); backToList();
  };

  if (mode === "print" && selected) {
    return <window.KartePrintSheet karte={selected} onBack={() => setMode("detail")} />;
  }
  if (mode === "items") {
    return (
      <div className="app">
        <div className="shell">
          <AppSidebar active="karte" />
          <main className="main">
            <window.KarteItemSettings onBack={backToList} />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="shell">
        <AppSidebar active="karte" />
        <main className="main">
          <div className="greet no-print">
            <div>
              <h1>カルテ作成</h1>
              <div className="sub">ハイブランドコース ・ 全{window.KARTE_STORES.length}店舗共通 ・ 全{list.length}件{cloudOn ? (cloudTs ? ` ・ ☁ 同期（更新 ${new Date(cloudTs).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}）` : " ・ ☁ 同期") : ""}</div>
            </div>
            {mode === "list" && (
              <div className="right">
                <button className="btn btn-ghost" onClick={openItems}>⚙ アイテム設定</button>
                <button className="btn btn-primary" onClick={openNew}>＋ 新規カルテ作成</button>
              </div>
            )}
          </div>

          {mode === "list" && (
            <>
              <div className="filter-bar no-print">
                <div className="field">
                  <label className="field-label">検索</label>
                  <input className="input" placeholder="お名前・顧客番号・タグ番号・ブランド" value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: 260 }} />
                </div>
                <div className="field">
                  <label className="field-label">店舗</label>
                  <select className="select" value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)}>
                    <option value="">すべて</option>
                    {window.KARTE_STORES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: 48, color: "var(--ink-mute)" }}>
                  {list.length === 0 ? "まだカルテがありません。「＋ 新規カルテ作成」から登録してください。" : "該当するカルテがありません"}
                </div>
              ) : (
                <div className="kt-grid">
                  {filtered.map((k) => <KarteCard key={k.id} karte={k} onOpen={openDetail} />)}
                </div>
              )}
            </>
          )}

          {mode === "form" && (
            <KarteForm initial={selected} onCancel={selected ? () => openDetail(selected) : backToList} onSave={handleSave} />
          )}

          {mode === "detail" && selected && (
            <KarteDetail karte={selected} onEdit={openEdit} onDelete={handleDelete} onBack={backToList} onOpenPrintSheet={openPrintSheet} />
          )}
        </main>
      </div>
    </div>
  );
};

window.KartePage = KartePage;
