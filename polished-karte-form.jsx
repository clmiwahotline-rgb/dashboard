// カルテ作成・編集フォーム（ハイブランドコース）

const KarteForm = ({ initial, onCancel, onSave }) => {
  const [f, setF] = React.useState(() => initial ? JSON.parse(JSON.stringify(initial)) : window.blankKarte());
  const [view, setView] = React.useState("front");

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const setItem = (k, v) => setF((p) => ({ ...p, item: { ...p.item, [k]: v } }));
  const setPricing = (k, v) => setF((p) => ({ ...p, pricing: { ...p.pricing, [k]: v } }));
  const setConfirm = (k, v) => setF((p) => ({ ...p, confirmations: { ...p.confirmations, [k]: v } }));

  const setCategory = (cat) => {
    const diagram = window.CATEGORY_DIAGRAM[cat] || "garment";
    const match = itemCatalog.find((it) => it.name === cat);
    setF((p) => ({
      ...p,
      item: { ...p.item, category: cat },
      diagramType: diagram,
      pins: p.diagramType === diagram ? p.pins : [],
      // アイテム種別とカタログの品名が一致する場合は料金・カタログ紐付けも同期する（カタログは税抜なので税込に換算）
      pricing: match ? { ...p.pricing, catalogItemId: match.id, catalogItemName: match.name, cleaningFee: window.withTaxK(match.price) } : p.pricing,
    }));
    setView("front");
  };

  // ── 採寸 ──
  const addMeasure = (label) => setF((p) => ({ ...p, measurements: [...p.measurements, { id: window.kNewId(), label: label || "", before: "", after: "" }] }));
  const updMeasure = (id, k, v) => setF((p) => ({ ...p, measurements: p.measurements.map((m) => m.id === id ? { ...m, [k]: v } : m) }));
  const delMeasure = (id) => setF((p) => ({ ...p, measurements: p.measurements.filter((m) => m.id !== id) }));

  // ── シミ・傷ピン ──
  const addPin = ({ view: v, x, y }) => setF((p) => ({ ...p, pins: [...p.pins, { id: window.kNewId(), view: v, x, y, kind: "stain", note: "" }] }));
  const updPinNote = (id, note) => setF((p) => ({ ...p, pins: p.pins.map((pin) => pin.id === id ? { ...pin, note } : pin) }));
  const updPinKind = (id, kind) => setF((p) => ({ ...p, pins: p.pins.map((pin) => pin.id === id ? { ...pin, kind } : pin) }));
  const delPin = (id) => setF((p) => ({ ...p, pins: p.pins.filter((pin) => pin.id !== id) }));

  const total = window.karteTotal(f);
  const canSave = f.customerName.trim() && f.store;
  const { items: itemCatalog } = window.useItemCatalog();
  const { items: confirmCatalog } = window.useConfirmCatalog();
  const [photoDrag, setPhotoDrag] = React.useState(false);
  const [photoBusy, setPhotoBusy] = React.useState(false);
  const photoRef = React.useRef(null);
  const addPhotos = async (list) => {
    const arr = Array.from(list || []).filter((x) => /^image\//.test(x.type));
    if (!arr.length) return;
    setPhotoBusy(true);
    const out = [];
    for (const x of arr) { const r = await window.readKarteFile(x); out.push({ id: window.kNewId(), name: r.name, size: r.size, url: r.url }); }
    setF((p) => ({ ...p, photos: [...(p.photos || []), ...out] }));
    setPhotoBusy(false);
  };
  const removePhoto = (id) => setF((p) => ({ ...p, photos: (p.photos || []).filter((x) => x.id !== id), printPhotoId: p.printPhotoId === id ? "" : p.printPhotoId }));
  const setPrintPhoto = (id) => setF((p) => ({ ...p, printPhotoId: id }));

  const applyCatalogItem = (id) => {
    const it = itemCatalog.find((x) => x.id === id);
    setF((p) => ({
      ...p,
      // 料金欄から選んだ場合もアイテム種別を同期させる（二つのセレクタが飨離しないように）
      item: it ? { ...p.item, category: it.name } : p.item,
      // カタログ価格は税抜なので、クリーニング料金（税込）に換算して反映
      pricing: { ...p.pricing, catalogItemId: id, catalogItemName: it ? it.name : "", cleaningFee: it ? window.withTaxK(it.price) : p.pricing.cleaningFee },
    }));
  };

  return (
    <div className="card">
      <div className="card-head">
        <h3 className="card-title">{initial ? "カルテ編集" : "新規カルテ作成"}</h3>
        <span className="card-sub">ハイブランドコース</span>
      </div>

      {/* 基本情報 */}
      <div className="kt-section">
        <div className="kt-section-title">基本情報</div>
        <div className="form-grid">
          <div className="field">
            <label className="field-label">カルテNo.</label>
            <input className="input" value={f.no || "—"} readOnly disabled style={{ background: "var(--panel-2, #f4f4f4)", color: "var(--ink-mute)" }} />
          </div>
          <div className="field">
            <label className="field-label">対応店舗</label>
            <select className="select" value={f.store} onChange={(e) => set("store", e.target.value)}>
              {window.KARTE_STORES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">タグ番号</label>
            <input className="input" value={f.tagNo} onChange={(e) => set("tagNo", e.target.value)} placeholder="例：HB-0231" />
          </div>
          <div className="field">
            <label className="field-label">預かり日</label>
            <input className="input" type="date" value={f.receivedDate} onChange={(e) => set("receivedDate", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">お渡し予定日</label>
            <input className="input" type="date" value={f.deliveryDate} onChange={(e) => set("deliveryDate", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">顧客番号</label>
            <input className="input" value={f.customerNo} onChange={(e) => set("customerNo", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">お名前 <span className="kt-req">必須</span></label>
            <input className="input" value={f.customerName} onChange={(e) => set("customerName", e.target.value)} placeholder="例：山田 花子" />
          </div>
          <div className="field">
            <label className="field-label">日中のご連絡先</label>
            <input className="input" value={f.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} placeholder="090-xxxx-xxxx" />
          </div>
          <div className="field">
            <label className="field-label">連絡希望曜日・時間</label>
            <input className="input" value={f.contactPrefDay} onChange={(e) => set("contactPrefDay", e.target.value)} placeholder="例：平日 15時以降" />
          </div>
        </div>
      </div>

      {/* ご要望・提案 */}
      <div className="kt-section">
        <div className="kt-section-title">ご要望・ご提案</div>
        <div className="form-grid">
          <div className="field full">
            <label className="field-label">お客様からのご要望（該当するものにチェック・省略可）</label>
            <div className="kt-request-checks">
              {window.REQUEST_ITEMS.map((item) => (
                <label key={item} className="kt-check">
                  <input type="checkbox" checked={(f.requestChecks || []).includes(item)}
                         onChange={(e) => set("requestChecks", e.target.checked
                           ? [...(f.requestChecks || []), item]
                           : (f.requestChecks || []).filter((x) => x !== item))} />
                  {item}
                </label>
              ))}
            </div>
          </div>
          <div className="field full">
            <label className="field-label">その他のご要望（自由記入）</label>
            <textarea className="input" rows={2} value={f.request} onChange={(e) => set("request", e.target.value)} />
          </div>
          <div className="field full">
            <label className="field-label">マイスターからのご提案</label>
            <textarea className="input" rows={2} value={f.proposal} onChange={(e) => set("proposal", e.target.value)} />
          </div>
          <div className="field full">
            <label className="field-label">クリーニングカスタマイズ</label>
            <div className="kt-custom-groups">
              {window.CUSTOMIZE_GROUPS.map((g) => (
                <div key={g.key} className="kt-custom-group">
                  <span className="kt-custom-label">{g.label}</span>
                  <div className="kt-custom-opts">
                    {g.options.map((opt) => {
                      const on = (f.custom || {})[g.key] === opt;
                      return (
                        <button key={opt} type="button" className={`btn btn-sm ${on ? "btn-primary" : "btn-ghost"}`}
                                onClick={() => setF((p) => ({ ...p, custom: { ...(p.custom || {}), [g.key]: on ? "" : opt } }))}>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="kt-custom-group">
                <span className="kt-custom-label">オプション加工</span>
                <div className="kt-custom-opts">
                  {window.CUSTOMIZE_OPTIONS.map((opt) => {
                    const arr = (f.custom || {}).options || [];
                    const on = arr.includes(opt);
                    return (
                      <button key={opt} type="button" className={`btn btn-sm ${on ? "btn-primary" : "btn-ghost"}`}
                              onClick={() => setF((p) => {
                                const cur = (p.custom || {}).options || [];
                                return { ...p, custom: { ...(p.custom || {}), options: on ? cur.filter((x) => x !== opt) : [...cur, opt] } };
                              })}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {((f.custom || {}).options || []).includes("シミ抜き") && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                    <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>シミ抜き：</span>
                    <input className="input" type="number" style={{ maxWidth: 130 }} value={(f.custom || {}).stainLimit || ""}
                           onChange={(e) => setF((p) => ({ ...p, custom: { ...(p.custom || {}), stainLimit: e.target.value } }))} placeholder="金額上限" />
                    <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>円までは進めてOK</span>
                  </div>
                )}
              </div>
              <div className="kt-custom-std">※ {window.CUSTOMIZE_STANDARD_NOTE}</div>
            </div>
          </div>
          <div className="field full">
            <label className="field-label">カスタマイズ補足（自由記入）</label>
            <textarea className="input" rows={2} value={f.customization} onChange={(e) => set("customization", e.target.value)} />
          </div>
        </div>
      </div>

      {/* 商品情報 */}
      <div className="kt-section">
        <div className="kt-section-title">商品情報</div>
        <div className="form-grid">
          <div className="field">
            <label className="field-label">アイテム種別</label>
            <select className="select" value={f.item.category} onChange={(e) => setCategory(e.target.value)}>
              {itemCatalog.length > 0
                ? itemCatalog.map((it) => <option key={it.id} value={it.name}>{it.name}</option>)
                : window.KARTE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">ブランド</label>
            <input className="input" value={f.item.brand} onChange={(e) => setItem("brand", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">製造番号</label>
            <input className="input" value={f.item.serialNo} onChange={(e) => setItem("serialNo", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">色</label>
            <input className="input" value={f.item.color} onChange={(e) => setItem("color", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">参考購入価格</label>
            <input className="input" type="number" value={f.item.purchasePrice} onChange={(e) => setItem("purchasePrice", e.target.value)} placeholder="円" />
            <label className="kt-check" style={{ marginTop: 4 }}>
              <input type="checkbox" checked={f.item.showPurchasePrice !== false} onChange={(e) => setItem("showPurchasePrice", e.target.checked)} />
              印刷シートに表示する
            </label>
          </div>
          <div className="field">
            <label className="field-label">購入時期</label>
            <input className="input" value={f.item.purchaseTime} onChange={(e) => setItem("purchaseTime", e.target.value)} placeholder="例：2023年頃" />
          </div>
        </div>
      </div>

      {/* 写真 */}
      <div className="kt-section">
        <div className="kt-section-title">写真</div>
        <div className={`cl-drop ${photoDrag ? "dragging" : ""}`}
             onDragEnter={(e) => { if (Array.from(e.dataTransfer.types || []).includes("Files")) { e.preventDefault(); setPhotoDrag(true); } }}
             onDragOver={(e) => { if (Array.from(e.dataTransfer.types || []).includes("Files")) { e.preventDefault(); } }}
             onDragLeave={() => setPhotoDrag(false)}
             onDrop={(e) => { e.preventDefault(); setPhotoDrag(false); addPhotos(e.dataTransfer.files); }}
             onClick={() => photoRef.current && photoRef.current.click()}>
          <input ref={photoRef} type="file" accept="image/*" multiple style={{ display: "none" }}
                 onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
          {photoBusy ? "読み込み中…" : "クリックまたはドラッグ＆ドロップで写真を追加（複数可）"}
        </div>
        {(f.photos || []).length > 0 && (
          <div className="cl-pending">
            {f.photos.map((p) => {
              const isPrint = (f.printPhotoId || f.photos[0].id) === p.id;
              return (
                <div key={p.id} className="cl-pend img kt-photo-pend">
                  <img src={p.url || window.kPhotoThumb(p, 200)} alt={p.name} />
                  <button className="cl-pend-x" onClick={(e) => { e.stopPropagation(); removePhoto(p.id); }}>×</button>
                  <button type="button" className={`kt-photo-star ${isPrint ? "on" : ""}`} title="印刷シートに使用する写真"
                          onClick={(e) => { e.stopPropagation(); setPrintPhoto(p.id); }}>
                    {isPrint ? "★ 印刷用" : "☆"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="kt-hint7" style={{ marginTop: 8 }}>※★を付けた写真が印刷シートの仕上がり写真として使用されます（未選択時は最初の1枚）</div>
      </div>

      {/* 採寸 */}
      <div className="kt-section">
        <div className="kt-section-title">採寸</div>
        <div className="kt-measure-presets no-print">
          {window.MEASURE_PRESETS.map((p) => (
            <button key={p} type="button" className="btn btn-sm btn-ghost" onClick={() => addMeasure(p)}>＋{p}</button>
          ))}
        </div>
        {f.measurements.length > 0 && (
          <div className="kt-measure-list">
            <div className="kt-measure-header">
              <span style={{ maxWidth: 140, flex: "0 0 140px" }}>項目名</span>
              <span style={{ maxWidth: 120, flex: "0 0 120px" }}>クリーニング前</span>
              <span style={{ maxWidth: 120, flex: "0 0 120px" }}>クリーニング後</span>
              <span style={{ maxWidth: 70, flex: "0 0 70px" }}>伸縮率</span>
            </div>
            {f.measurements.map((m) => {
              const b = parseFloat(m.before), a = parseFloat(m.after);
              const rate = (!isNaN(b) && b !== 0 && !isNaN(a)) ? ((a - b) / b * 100) : null;
              return (
              <div key={m.id} className="kt-measure-row">
                <input className="input" value={m.label} placeholder="項目名" onChange={(e) => updMeasure(m.id, "label", e.target.value)} style={{ maxWidth: 140 }} />
                <input className="input" value={m.before} placeholder="実寸（cm）" onChange={(e) => updMeasure(m.id, "before", e.target.value)} style={{ maxWidth: 120 }} />
                <input className="input" value={m.after} placeholder="実寸（cm）" onChange={(e) => updMeasure(m.id, "after", e.target.value)} style={{ maxWidth: 120 }} />
                <span className={`kt-shrink-rate ${rate != null && rate <= -2 ? "kt-shrink-over" : ""}`} style={{ minWidth: 70 }}>
                  {rate != null ? `${rate > 0 ? "+" : ""}${rate.toFixed(1)}%` : "—"}
                </span>
                <button type="button" className="kd-pin-x" onClick={() => delMeasure(m.id)}>×</button>
              </div>
              );
            })}
          </div>
        )}
        {!f.measurements.length && <div className="kt-empty-hint">上のボタンから採寸項目を追加してください</div>}
        <div className="kt-hint7" style={{ marginTop: 8 }}>※伸縮２％までは許容範囲とさせて頂きます</div>
      </div>

      {/* シミ・傷の位置 */}
      <div className="kt-section">
        <div className="kt-section-title">シミ・傷の位置</div>
        <KarteDiagram type={f.diagramType} pins={f.pins}
                      onAddPin={addPin} onRemovePin={delPin} onUpdatePinNote={updPinNote} onUpdatePinKind={updPinKind} />
      </div>

      {/* 料金 */}
      <div className="kt-section">
        <div className="kt-section-title">料金</div>
        <div className="form-grid">
          <div className="field full">
            <label className="field-label">アイテムから選択（任意・選択するとクリーニング料金〈税込〉とアイテム種別に自動反映）</label>
            <select className="select" value={f.pricing.catalogItemId || ""} onChange={(e) => applyCatalogItem(e.target.value)}>
              <option value="">— 選択しない —</option>
              {itemCatalog.map((it) => <option key={it.id} value={it.id}>{it.name}（税抜{window.yenK(it.price)} ・ 税込{window.yenK(window.withTaxK(it.price))}）</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">クリーニング料金（税込）</label>
            <input className="input" type="number" value={f.pricing.cleaningFee} onChange={(e) => setPricing("cleaningFee", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">オプション料金（税込）</label>
            <input className="input" type="number" value={f.pricing.optionFee} onChange={(e) => setPricing("optionFee", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">割引・値引き額</label>
            <input className="input" type="number" value={f.pricing.discountFee} onChange={(e) => setPricing("discountFee", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">追加補償</label>
            <div className="kt-check-row">
              <label className="kt-check">
                <input type="checkbox" checked={f.pricing.hasCompensation} onChange={(e) => setPricing("hasCompensation", e.target.checked)} />
                あり
              </label>
            </div>
          </div>
          {f.pricing.hasCompensation && (
            <div className="field">
              <label className="field-label">追加補償料金</label>
              <input className="input" type="number" value={f.pricing.compensationFee} onChange={(e) => setPricing("compensationFee", e.target.value)} />
            </div>
          )}
          <div className="field full kt-total-row">
            <label className="field-label">合計金額</label>
            <div className="kt-total-value">{window.yenK(total)}</div>
          </div>
        </div>
      </div>

      {/* 了解確認事項 */}
      <div className="kt-section">
        <div className="kt-section-title">了解確認事項</div>
        <div className="field full">
          <label className="field-label">現状確認項目（該当するものを選択・省略可）</label>
          <div className="kt-request-checks">
            {window.confirmLabels(confirmCatalog).map((item) => (
              <label key={item} className="kt-check">
                <input type="checkbox" checked={(f.confirmations.checks || []).includes(item)}
                       onChange={(e) => setConfirm("checks", e.target.checked
                         ? [...(f.confirmations.checks || []), item]
                         : (f.confirmations.checks || []).filter((x) => x !== item))} />
                {item}
              </label>
            ))}
          </div>
        </div>
        <div className="field full" style={{ marginTop: 10 }}>
          <label className="field-label">事前の検品時に気になった点</label>
          <textarea className="input" rows={2} value={f.confirmations.note} onChange={(e) => setConfirm("note", e.target.value)} />
        </div>
        <div className="field full" style={{ marginTop: 10 }}>
          <label className="field-label">クリーニング後のお客様へのアドバイス</label>
          <textarea className="input" rows={2} value={f.confirmations.advice} onChange={(e) => setConfirm("advice", e.target.value)} />
        </div>
      </div>

      <div className="kt-form-actions no-print">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>キャンセル</button>
        <button type="button" className="btn btn-primary" disabled={!canSave} onClick={() => onSave(f)}>
          {initial ? "更新を保存" : "カルテを作成"}
        </button>
      </div>
    </div>
  );
};

Object.assign(window, { KarteForm });
