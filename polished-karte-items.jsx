// アイテム設定 — カルテの料金と紐づけるアイテム単価カタログ
// localStorage: miwa.karte.itemCatalog.v1 = [{ id, name, price }]
// クラウド共有：シート「カルテ商品」（みわ共有API・KARTE_SHEET と同じ仕組み）

const KARTE_ITEM_KEY = "miwa.karte.itemCatalog.v1";
const KARTE_ITEM_SHEET = "カルテ商品";
// アイテム単価は税抜。カルテ作成時にクリーニング料金へ自動反映する際は税込に換算する。
const KARTE_TAX_RATE = 0.10;
const withTaxK = (price) => Math.round((Number(price) || 0) * (1 + KARTE_TAX_RATE));

const loadItemCatalog = () => {
  try { const a = JSON.parse(localStorage.getItem(KARTE_ITEM_KEY)); return Array.isArray(a) ? a : []; } catch (e) { return []; }
};
const saveItemCatalog = (list) => { try { localStorage.setItem(KARTE_ITEM_KEY, JSON.stringify(list)); } catch (e) {} };
const itemRow = (it, idx) => ({ id: it.id, name: it.name, price: it.price, order: idx != null ? idx : (it.order || 0), updatedAt: it.updatedAt || Date.now() });

const useItemCatalog = () => {
  const [items, setItems] = React.useState(() => loadItemCatalog());
  const [cloudOn, setCloudOn] = React.useState(false);

  React.useEffect(() => {
    if (typeof window.cloudGet !== "function") return;
    let cancelled = false;
    (async () => {
      const remote = await window.cloudGet(KARTE_ITEM_SHEET);
      if (cancelled || remote == null) return;
      setCloudOn(true);
      if (remote.length) {
        const parsed = remote
          .map((r) => ({ id: r.id, name: r.name, price: Number(r.price) || 0, order: Number(r.order) || 0, updatedAt: Number(r.updatedAt) || 0 }))
          .sort((a, b) => a.order - b.order);
        setItems(parsed);
        saveItemCatalog(parsed);
      } else {
        setItems((cur) => {
          if (cur.length) window.cloudReplaceAll(KARTE_ITEM_SHEET, cur.map((it, i) => itemRow(it, i)));
          return cur;
        });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const addItem = (name, price) => {
    const it = { id: window.kNewId(), name: name.trim(), price: Number(price) || 0, order: items.length, updatedAt: Date.now() };
    const next = [...items, it];
    setItems(next); saveItemCatalog(next);
    if (window.cloudEnabled && window.cloudEnabled()) window.cloudAdd(KARTE_ITEM_SHEET, itemRow(it, it.order));
  };
  const updItem = (id, patch) => {
    let updated = null;
    const next = items.map((it) => { if (it.id !== id) return it; updated = { ...it, ...patch, updatedAt: Date.now() }; return updated; });
    setItems(next); saveItemCatalog(next);
    if (updated && window.cloudEnabled && window.cloudEnabled()) window.cloudUpdate(KARTE_ITEM_SHEET, id, itemRow(updated, updated.order));
  };
  const delItem = (id) => {
    const next = items.filter((it) => it.id !== id);
    setItems(next); saveItemCatalog(next);
    if (window.cloudEnabled && window.cloudEnabled()) window.cloudDelete(KARTE_ITEM_SHEET, id);
  };
  const moveItem = (id, dir) => {
    const idx = items.findIndex((it) => it.id === id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= items.length) return;
    const next = [...items];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    const withOrder = next.map((it, i) => ({ ...it, order: i, updatedAt: Date.now() }));
    setItems(withOrder); saveItemCatalog(withOrder);
    if (window.cloudEnabled && window.cloudEnabled()) window.cloudReplaceAll(KARTE_ITEM_SHEET, withOrder.map((it, i) => itemRow(it, i)));
  };
  return { items, addItem, updItem, delItem, moveItem, cloudOn };
};

const KarteItemSettings = ({ onBack }) => {
  const { items, addItem, updItem, delItem, moveItem, cloudOn } = useItemCatalog();
  const [name, setName] = React.useState("");
  const [price, setPrice] = React.useState("");

  const handleAdd = () => {
    if (!name.trim()) return;
    addItem(name, price);
    setName(""); setPrice("");
  };

  return (
    <div className="card">
      <div className="card-head no-print">
        <button className="btn btn-ghost" onClick={onBack}>← 一覧へ戻る</button>
        <h3 className="card-title" style={{ marginLeft: 8 }}>アイテム設定</h3>
        {cloudOn && <span className="card-sub">☁ 同期</span>}
      </div>
      <div className="kt-section">
        <div className="kt-section-title">アイテムを追加</div>
        <div className="form-grid">
          <div className="field">
            <label className="field-label">アイテム名</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="例：コート（ハイブランド）" />
          </div>
          <div className="field">
            <label className="field-label">クリーニング料金（税抜）</label>
            <input className="input" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="円" />
            {price ? <div className="kt-tax-hint">税込 {window.yenK(withTaxK(price))}（カルテには税込金額が自動反映されます）</div> : null}
          </div>
          <div className="field" style={{ alignSelf: "flex-end" }}>
            <button type="button" className="btn btn-primary" disabled={!name.trim()} onClick={handleAdd}>＋ 追加</button>
          </div>
        </div>
      </div>

      <div className="kt-section">
        <div className="kt-section-title">登録済みアイテム（全{items.length}件）</div>
        {items.length === 0 ? (
          <div className="kt-empty-hint">まだアイテムが登録されていません。上のフォームから追加してください。</div>
        ) : (
          <div className="kt-item-table">
            <div className="kt-item-row kt-item-row-head">
              <span style={{ width: 44 }}></span>
              <span style={{ flex: 1 }}>アイテム名</span>
              <span style={{ maxWidth: 130, width: 130 }}>税抜価格</span>
              <span className="kt-item-yen">税込</span>
              <span style={{ width: 24 }}></span>
            </div>
            {items.map((it, i) => (
              <div key={it.id} className="kt-item-row">
                <div className="kt-item-reorder">
                  <button type="button" className="kt-item-move" disabled={i === 0} onClick={() => moveItem(it.id, -1)} aria-label="上へ">▲</button>
                  <button type="button" className="kt-item-move" disabled={i === items.length - 1} onClick={() => moveItem(it.id, 1)} aria-label="下へ">▼</button>
                </div>
                <input className="input" value={it.name} onChange={(e) => updItem(it.id, { name: e.target.value })} style={{ flex: 1 }} />
                <input className="input" type="number" value={it.price} onChange={(e) => updItem(it.id, { price: Number(e.target.value) || 0 })} style={{ maxWidth: 130 }} />
                <span className="kt-item-yen">{window.yenK(withTaxK(it.price))}</span>
                <button type="button" className="kd-pin-x" onClick={() => { if (confirm("このアイテムを削除しますか？")) delItem(it.id); }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

Object.assign(window, { KARTE_ITEM_KEY, KARTE_ITEM_SHEET, KARTE_TAX_RATE, withTaxK, loadItemCatalog, saveItemCatalog, useItemCatalog, KarteItemSettings });
