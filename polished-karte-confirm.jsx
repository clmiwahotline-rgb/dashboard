// 了解事項設定 — 了解確認事項のチェック項目とその印刷時の文章をカスタマイズ可能にするカタログ
// localStorage: miwa.karte.confirmCatalog.v1 = [{ id, label, text }]
// クラウド共有：シート「カルテ了解事項」（みわ共有API・KARTE_ITEM_SHEET と同じ仕組み）

const KARTE_CONFIRM_KEY = "miwa.karte.confirmCatalog.v1";
const KARTE_CONFIRM_SHEET = "カルテ了解事項";

const loadConfirmCatalog = () => {
  try { const a = JSON.parse(localStorage.getItem(KARTE_CONFIRM_KEY)); return Array.isArray(a) ? a : []; } catch (e) { return []; }
};
const saveConfirmCatalog = (list) => { try { localStorage.setItem(KARTE_CONFIRM_KEY, JSON.stringify(list)); } catch (e) {} };
const confirmRow = (it) => ({ id: it.id, label: it.label, text: it.text || "", updatedAt: it.updatedAt || Date.now() });

const useConfirmCatalog = () => {
  const [items, setItems] = React.useState(() => loadConfirmCatalog());
  const [cloudOn, setCloudOn] = React.useState(false);

  React.useEffect(() => {
    if (typeof window.cloudGet !== "function") return;
    let cancelled = false;
    (async () => {
      const remote = await window.cloudGet(KARTE_CONFIRM_SHEET);
      if (cancelled || remote == null) return;
      setCloudOn(true);
      if (remote.length) {
        const parsed = remote.map((r) => ({ id: r.id, label: r.label, text: r.text || "", updatedAt: Number(r.updatedAt) || 0 }));
        setItems(parsed); saveConfirmCatalog(parsed);
      } else {
        setItems((cur) => {
          if (cur.length) window.cloudReplaceAll(KARTE_CONFIRM_SHEET, cur.map(confirmRow));
          return cur;
        });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const addItem = (label, text) => {
    const it = { id: window.kNewId(), label: label.trim(), text: (text || "").trim(), updatedAt: Date.now() };
    const next = [...items, it];
    setItems(next); saveConfirmCatalog(next);
    if (window.cloudEnabled && window.cloudEnabled()) window.cloudAdd(KARTE_CONFIRM_SHEET, confirmRow(it));
  };
  const updItem = (id, patch) => {
    let updated = null;
    const next = items.map((it) => { if (it.id !== id) return it; updated = { ...it, ...patch, updatedAt: Date.now() }; return updated; });
    setItems(next); saveConfirmCatalog(next);
    if (updated && window.cloudEnabled && window.cloudEnabled()) window.cloudUpdate(KARTE_CONFIRM_SHEET, id, confirmRow(updated));
  };
  const delItem = (id) => {
    const next = items.filter((it) => it.id !== id);
    setItems(next); saveConfirmCatalog(next);
    if (window.cloudEnabled && window.cloudEnabled()) window.cloudDelete(KARTE_CONFIRM_SHEET, id);
  };
  return { items, addItem, updItem, delItem, cloudOn };
};

// フォーム／印刷から共通で使う：カタログが空ならデフォルト（CONFIRM_CHECK_ITEMS/CONFIRM_CHECK_TEXT）にフォールバック
const confirmLabels = (catalog) => catalog.length > 0 ? catalog.map((c) => c.label) : window.CONFIRM_CHECK_ITEMS;
const confirmTextOf = (catalog, label) => {
  const hit = catalog.find((c) => c.label === label);
  if (hit) return hit.text || label;
  return window.CONFIRM_CHECK_TEXT[label] || label;
};

const KarteConfirmSettings = ({ onBack }) => {
  const { items, addItem, updItem, delItem, cloudOn } = useConfirmCatalog();
  const [label, setLabel] = React.useState("");
  const [text, setText] = React.useState("");

  const handleAdd = () => {
    if (!label.trim()) return;
    addItem(label, text);
    setLabel(""); setText("");
  };

  const seedFromDefault = () => {
    if (items.length) return;
    const full = window.CONFIRM_CHECK_ITEMS.map((l) => ({ id: window.kNewId(), label: l, text: window.CONFIRM_CHECK_TEXT[l] || "", updatedAt: Date.now() }));
    setItems(full); saveConfirmCatalog(full);
    if (cloudOn) window.cloudReplaceAll(KARTE_CONFIRM_SHEET, full.map(confirmRow));
  };

  return (
    <div className="card">
      <div className="card-head no-print">
        <button className="btn btn-ghost" onClick={onBack}>← 一覧へ戻る</button>
        <h3 className="card-title" style={{ marginLeft: 8 }}>了解設定</h3>
      </div>
      <div className="kt-section">
        <div className="kt-section-title">項目を追加</div>
        <div className="form-grid">
          <div className="field">
            <label className="field-label">項目名（作成画面のチェック表示）</label>
            <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="例：装飾" />
          </div>
          <div className="field full">
            <label className="field-label">印刷時の文章</label>
            <textarea className="input" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="例：装飾には十分に気を付けますが、経年劣化により破損する場合があります。" />
          </div>
          <div className="field">
            <button type="button" className="btn btn-primary" disabled={!label.trim()} onClick={handleAdd}>＋ 追加</button>
          </div>
        </div>
      </div>

      <div className="kt-section">
        <div className="kt-section-title">登録済み項目（全{items.length}件）</div>
        {items.length === 0 ? (
          <div className="kt-empty-hint">
            まだ項目が登録されていません。上のフォームから追加するか、
            <button type="button" className="btn btn-ghost" style={{ marginLeft: 6 }} onClick={seedFromDefault}>標準の24項目を読み込む</button>
          </div>
        ) : (
          <div className="kt-item-table">
            {items.map((it) => (
              <div key={it.id} className="kt-confirm-row">
                <input className="input" value={it.label} onChange={(e) => updItem(it.id, { label: e.target.value })} style={{ maxWidth: 160 }} placeholder="項目名" />
                <textarea className="input" rows={2} value={it.text} onChange={(e) => updItem(it.id, { text: e.target.value })} style={{ flex: 1 }} placeholder="印刷時の文章" />
                <button type="button" className="kd-pin-x" onClick={() => { if (confirm("この項目を削除しますか？")) delItem(it.id); }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

Object.assign(window, {
  KARTE_CONFIRM_KEY, KARTE_CONFIRM_SHEET, loadConfirmCatalog, saveConfirmCatalog, useConfirmCatalog,
  confirmLabels, confirmTextOf, KarteConfirmSettings,
});
