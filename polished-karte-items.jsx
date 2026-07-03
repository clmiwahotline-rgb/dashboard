// アイテム設定 — カルテの料金と紐づけるアイテム単価カタログ
// localStorage: miwa.karte.itemCatalog.v1 = [{ id, name, price }]
// クラウド共有：シート「カルテ商品」（みわ共有API・KARTE_SHEET と同じ仕組み）

const KARTE_ITEM_KEY = "miwa.karte.itemCatalog.v1";
const KARTE_ITEM_SHEET = "カルテ商品";

const loadItemCatalog = () => {
  try { const a = JSON.parse(localStorage.getItem(KARTE_ITEM_KEY)); return Array.isArray(a) ? a : []; } catch (e) { return []; }
};
const saveItemCatalog = (list) => { try { localStorage.setItem(KARTE_ITEM_KEY, JSON.stringify(list)); } catch (e) {} };
const itemRow = (it) => ({ id: it.id, name: it.name, price: it.price, updatedAt: it.updatedAt || Date.now() });

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
        const parsed = remote.map((r) => ({ id: r.id, name: r.name, price: Number(r.price) || 0, updatedAt: Number(r.updatedAt) || 0 }));
        setItems(parsed);
        saveItemCatalog(parsed);
      } else {
        setItems((cur) => {
          if (cur.length) window.cloudReplaceAll(KARTE_ITEM_SHEET, cur.map(itemRow));
          return cur;
        });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const addItem = (name, price) => {
    const it = { id: window.kNewId(), name: name.trim(), price: Number(price) || 0, updatedAt: Date.now() };
    const next = [...items, it];
    setItems(next); saveItemCatalog(next);
    if (cloudOn) window.cloudAdd(KARTE_ITEM_SHEET, itemRow(it));
  };
  const updItem = (id, patch) => {
    let updated = null;
    const next = items.map((it) => { if (it.id !== id) return it; updated = { ...it, ...patch, updatedAt: Date.now() }; return updated; });
    setItems(next); saveItemCatalog(next);
    if (cloudOn && updated) window.cloudUpdate(KARTE_ITEM_SHEET, id, itemRow(updated));
  };
  const delItem = (id) => {
    const next = items.filter((it) => it.id !== id);
    setItems(next); saveItemCatalog(next);
    if (cloudOn) window.cloudDelete(KARTE_ITEM_SHEET, id);
  };
  return { items, addItem, updItem, delItem, cloudOn };
};

const KarteItemSettings = ({ onBack }) => {
  const { items, addItem, updItem, delItem, cloudOn } = useItemCatalog();
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
            <label className="field-label">クリーニング料金</label>
            <input className="input" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="円" />
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
            {items.map((it) => (
              <div key={it.id} className="kt-item-row">
                <input className="input" value={it.name} onChange={(e) => updItem(it.id, { name: e.target.value })} style={{ flex: 1 }} />
                <input className="input" type="number" value={it.price} onChange={(e) => updItem(it.id, { price: Number(e.target.value) || 0 })} style={{ maxWidth: 130 }} />
                <span className="kt-item-yen">{window.yenK(it.price)}</span>
                <button type="button" className="kd-pin-x" onClick={() => { if (confirm("このアイテムを削除しますか？")) delItem(it.id); }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

Object.assign(window, { KARTE_ITEM_KEY, KARTE_ITEM_SHEET, loadItemCatalog, saveItemCatalog, useItemCatalog, KarteItemSettings });
