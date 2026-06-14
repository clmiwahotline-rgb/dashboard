// モバイル版 ─ 料金表（カウンター価格検索）
// PC版（料金表.html）と同じデータ層を共有：seed + localStorage編集 + クラウド同期済みキャッシュ
// 主用途はカウンターでの価格検索なので、検索ファースト＋カテゴリ＋コース展開の構成。

const MP_SHEETS = [
  { id: "cleaning", label: "クリーニング" },
  { id: "special",  label: "特殊品" },
  { id: "reform",   label: "リフォーム" },
  { id: "function", label: "加工" },
  { id: "sales",    label: "物販" },
];
const MP_COURSES = [
  { key: "p1", label: "レギュラー" },
  { key: "p4", label: "デリケート" },
  { key: "p5", label: "ブランド" },
  { key: "p6", label: "ハイブランド" },
];
const MP_TAX = 1.10;

const mpLS = (k, fb) => { try { const s = localStorage.getItem(k); if (s) return JSON.parse(s); } catch (e) {} return fb; };
const mpEditsKey = (brand) => brand === "blue" ? "miwa.price.edits.blue.v1" : "miwa.price.edits.v1";
const mpApplyEdits = (item, edits) => { const e = edits[item.code]; return e ? { ...item, ...e, deleted: !!e.deleted } : item; };

function mpSheetItems(sheet, brand, edits) {
  let base = [];
  if (sheet === "cleaning" || sheet === "special" || sheet === "reform") {
    const mainKey = brand === "blue" ? "miwa.price.blue.v2" : "miwa.price.green.v3";
    const seed = brand === "blue" ? window.PRICE_SEED_BLUE : window.PRICE_SEED;
    const data = mpLS(mainKey, null) || seed || {};
    base = data[sheet] || [];
  } else if (sheet === "function") {
    const d = mpLS("miwa.price.func.v1", null) || window.FUNCTION_SEED || null;
    base = d ? (d.items || []) : [];
  } else if (sheet === "sales") {
    const d = mpLS("miwa.price.sales.v1", null) || window.SALES_SEED || null;
    base = d ? (d.items || []) : [];
  }
  const custom = Object.values(edits).filter((e) => e.isNew && e.sheet === sheet && !e.deleted);
  return [...base.map((i) => mpApplyEdits(i, edits)), ...custom].filter((i) => !i.deleted);
}

const mpYen = (n) => "¥" + Math.round(n).toLocaleString("ja-JP");
const mpDisp = (s) => (s || "").normalize("NFKC"); // 半角カナ→全角カナ 表示用
const mpHasCourses = (it) => (it.p4 > 0) || (it.p5 > 0) || (it.p6 > 0);
const mpAllZero = (it) => !it.p1 && !it.p4 && !it.p5 && !it.p6;
const mpNorm = (s) => (s || "").normalize("NFKC").replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60)).toLowerCase(); // 半角/全角・カナ/かなを吸収

const MPriceRow = ({ item, tax, q }) => {
  const [open, setOpen] = React.useState(false);
  const px = (v) => tax ? Math.round(v * MP_TAX) : v;
  const courses = mpHasCourses(item);
  const quote = mpAllZero(item);
  const name = mpDisp(item.name || "");
  // 検索ハイライト
  const renderName = () => {
    if (!q) return name;
    const idx = name.toLowerCase().indexOf(q.toLowerCase());
    if (idx < 0) return name;
    return (<>{name.slice(0, idx)}<mark className="m-pr-hl">{name.slice(idx, idx + q.length)}</mark>{name.slice(idx + q.length)}</>);
  };
  return (
    <div className={`m-pr-item ${courses ? "tappable" : ""}`} onClick={courses ? () => setOpen((v) => !v) : undefined}>
      <div className="m-pr-item-top">
        <div className="m-pr-item-name">
          {renderName()}
          {item.mp > 0 && <span className="m-pr-mp">会員 {mpYen(px(item.mp))}</span>}
        </div>
        <div className="m-pr-item-price">
          {quote ? <span className="m-pr-quote">都度見積り</span> : <b>{mpYen(px(item.p1))}</b>}
          {courses && <svg className={`m-pr-chev ${open ? "open" : ""}`} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M6 9l6 6 6-6" /></svg>}
        </div>
      </div>
      {courses && open && (
        <div className="m-pr-courses">
          {MP_COURSES.map((c) => (item[c.key] > 0) && (
            <div key={c.key} className="m-pr-course">
              <span className="lbl">{c.label}</span>
              <span className="val">{mpYen(px(item[c.key]))}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MPrice = ({ registerHeader, registerFab }) => {
  const [brand, setBrand] = React.useState(() => { try { return localStorage.getItem("miwa.price.brand") || "green"; } catch (e) { return "green"; } });
  const [sheet, setSheet] = React.useState("cleaning");
  const [q, setQ] = React.useState("");
  const [tax, setTax] = React.useState(false);

  React.useEffect(() => { registerHeader && registerHeader({ title: "料金表", sub: "価格検索" }); registerFab && registerFab(null); }, []);

  const edits = React.useMemo(() => mpLS(mpEditsKey(brand), {}), [brand]);
  const hasBlue = !!(window.PRICE_SEED_BLUE && (window.PRICE_SEED_BLUE.cleaning || []).length);

  // 検索時は全シート横断、通常時は選択シート
  const nq = q.trim().toLowerCase();
  const allForSearch = React.useMemo(() => {
    if (!nq) return [];
    const out = [];
    MP_SHEETS.forEach((s) => mpSheetItems(s.id, brand, edits).forEach((it) => out.push({ ...it, _sheet: s.label })));
    return out;
  }, [nq, brand, edits]);

  const sheetItems = React.useMemo(() => nq ? [] : mpSheetItems(sheet, brand, edits), [nq, sheet, brand, edits]);

  const match = (it) => {
    if (!nq) return true;
    return mpNorm((it.name || "") + " " + (it.cat || "")).includes(mpNorm(q.trim()));
  };

  // 表示用：カテゴリでグループ化
  const grouped = React.useMemo(() => {
    const src = nq ? allForSearch.filter(match) : sheetItems.filter(match);
    const groups = [];
    const idx = {};
    src.forEach((it) => {
      const key = nq ? it._sheet : (it.cat || "その他");
      if (idx[key] == null) { idx[key] = groups.length; groups.push({ cat: key, items: [] }); }
      groups[idx[key]].items.push(it);
    });
    return groups;
  }, [nq, allForSearch, sheetItems]);

  const totalShown = grouped.reduce((a, g) => a + g.items.length, 0);

  return (
    <div>
      {/* 検索ボックス */}
      <div className="m-pr-searchbar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
        <input className="m-pr-search" placeholder="品名で検索（例：ワイシャツ、ダウン）" value={q} onChange={(e) => setQ(e.target.value)} />
        {q && <button className="m-pr-clear" onClick={() => setQ("")} aria-label="クリア">×</button>}
      </div>

      {/* ブランド＋税込トグル */}
      <div className="m-pr-controls">
        {hasBlue && (
          <div className="m-pr-seg">
            <button className={brand === "green" ? "on" : ""} onClick={() => { setBrand("green"); try { localStorage.setItem("miwa.price.brand", "green"); } catch (e) {} }}>緑のみわ</button>
            <button className={brand === "blue" ? "on blue" : ""} onClick={() => { setBrand("blue"); try { localStorage.setItem("miwa.price.brand", "blue"); } catch (e) {} }}>青のみわ</button>
          </div>
        )}
        <button className={`m-pr-tax ${tax ? "on" : ""}`} onClick={() => setTax((v) => !v)}>
          {tax ? "税込表示" : "税抜表示"}
        </button>
      </div>

      {/* タブ（検索中は非表示） */}
      {!nq && (
        <div className="m-chips m-pr-tabs">
          {MP_SHEETS.map((s) => {
            const n = mpSheetItems(s.id, brand, edits).filter((i) => !mpAllZero(i) || true).length;
            return <button key={s.id} className={`m-chip ${sheet === s.id ? "active" : ""}`} onClick={() => setSheet(s.id)}>{s.label}<span className="m-pr-tabn">{n}</span></button>;
          })}
        </div>
      )}

      {nq && <div className="m-pr-resultcount">「{q}」の検索結果：{totalShown}件</div>}

      {/* 一覧 */}
      {grouped.length === 0 ? (
        <div className="m-empty" style={{ marginTop: 28 }}>{nq ? "該当する品目がありません" : "品目がありません"}</div>
      ) : (
        grouped.map((g, gi) => (
          <div key={g.cat + gi} className="m-pr-group">
            <div className="m-pr-cat">{mpDisp(g.cat)}<span className="m-pr-catn">{g.items.length}</span></div>
            <div className="m-pr-list">
              {g.items.map((it, i) => <MPriceRow key={(it.code || it.name) + "_" + i} item={it} tax={tax} q={nq} />)}
            </div>
          </div>
        ))
      )}
      <div className="m-pr-note">価格はPOSデータ（{(window.PRICE_SEED && window.PRICE_SEED.updated) || ""}時点）。編集はPC版の料金表ページで行えます。</div>
      <div style={{ height: 16 }}></div>
    </div>
  );
};

window.MPrice = MPrice;
