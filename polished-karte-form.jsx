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
    setF((p) => ({ ...p, item: { ...p.item, category: cat }, diagramType: diagram, pins: p.diagramType === diagram ? p.pins : [] }));
    setView("front");
  };

  // ── 採寸 ──
  const addMeasure = (label) => setF((p) => ({ ...p, measurements: [...p.measurements, { id: window.kNewId(), label: label || "", value: "" }] }));
  const updMeasure = (id, k, v) => setF((p) => ({ ...p, measurements: p.measurements.map((m) => m.id === id ? { ...m, [k]: v } : m) }));
  const delMeasure = (id) => setF((p) => ({ ...p, measurements: p.measurements.filter((m) => m.id !== id) }));

  // ── シミ・傷ピン ──
  const addPin = ({ view: v, x, y }) => setF((p) => ({ ...p, pins: [...p.pins, { id: window.kNewId(), view: v, x, y, kind: "stain", note: "" }] }));
  const updPinNote = (id, note) => setF((p) => ({ ...p, pins: p.pins.map((pin) => pin.id === id ? { ...pin, note } : pin) }));
  const updPinKind = (id, kind) => setF((p) => ({ ...p, pins: p.pins.map((pin) => pin.id === id ? { ...pin, kind } : pin) }));
  const delPin = (id) => setF((p) => ({ ...p, pins: p.pins.filter((pin) => pin.id !== id) }));

  const total = window.karteTotal(f);
  const canSave = f.customerName.trim() && f.store;

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
              {window.KARTE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
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
          </div>
          <div className="field">
            <label className="field-label">購入時期</label>
            <input className="input" value={f.item.purchaseTime} onChange={(e) => setItem("purchaseTime", e.target.value)} placeholder="例：2023年頃" />
          </div>
        </div>
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
            {f.measurements.map((m) => (
              <div key={m.id} className="kt-measure-row">
                <input className="input" value={m.label} placeholder="項目名" onChange={(e) => updMeasure(m.id, "label", e.target.value)} style={{ maxWidth: 140 }} />
                <input className="input" value={m.value} placeholder="実寸（cm）" onChange={(e) => updMeasure(m.id, "value", e.target.value)} style={{ maxWidth: 120 }} />
                <button type="button" className="kd-pin-x" onClick={() => delMeasure(m.id)}>×</button>
              </div>
            ))}
          </div>
        )}
        {!f.measurements.length && <div className="kt-empty-hint">上のボタンから採寸項目を追加してください</div>}
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
          <div className="field">
            <label className="field-label">クリーニング料金</label>
            <input className="input" type="number" value={f.pricing.cleaningFee} onChange={(e) => setPricing("cleaningFee", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">オプション料金</label>
            <input className="input" type="number" value={f.pricing.optionFee} onChange={(e) => setPricing("optionFee", e.target.value)} />
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
            {window.CONFIRM_CHECK_ITEMS.map((item) => (
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
        <div className="kt-confirm-list" style={{ marginTop: 12 }}>
          {window.CONFIRM_ITEMS.map((c) => (
            <label key={c.key} className="kt-check kt-check-block">
              <input type="checkbox" checked={!!f.confirmations[c.key]} onChange={(e) => setConfirm(c.key, e.target.checked)} />
              {c.label}
            </label>
          ))}
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
