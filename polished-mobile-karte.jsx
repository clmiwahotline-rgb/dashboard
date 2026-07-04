// モバイル版 ─ カルテ閲覧（読み取り専用）
// データ: polished-karte-data.jsx の useKarteData()（PC版と同一クラウドシート「カルテ」を共有）
// 追加・編集・削除・印刷は行わない。確認のみ。

const mkYmd = (s) => {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${y}/${parseInt(m)}/${parseInt(d)}`;
};
const mkWd = (s) => {
  if (!s) return "";
  const wd = ["日", "月", "火", "水", "木", "金", "土"];
  const d = new Date(s + "T00:00:00");
  return isNaN(d) ? "" : `(${wd[d.getDay()]})`;
};

const MKarteCard = ({ karte, onOpen }) => {
  const overdue = karte.deliveryDate && karte.deliveryDate < window.kToday();
  const diffDays = karte.deliveryDate ? Math.round((new Date(karte.deliveryDate + "T00:00:00") - new Date(window.kToday() + "T00:00:00")) / 86400000) : null;
  const urgency = overdue ? "over" : (diffDays != null && diffDays <= 1 ? "red" : (diffDays != null && diffDays <= 3 ? "orange" : ""));
  const urgentColor = urgency === "orange" ? "#9a6700" : (urgency === "red" || urgency === "over") ? "#c5221f" : "var(--ink-mute)";
  const itemLine = [karte.item.brand, karte.item.category, karte.item.color].filter(Boolean).join(" ・ ");
  return (
    <div className="m-stain-card" style={{ textAlign: "left", width: "100%", cursor: "pointer" }} onClick={() => onOpen(karte)} role="button" tabIndex={0}>
      <div className="m-stain-card-head">
        {window.StoreTag ? <window.StoreTag name={karte.store} /> : <span>{karte.store}</span>}
        <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "var(--ink-mute)" }}>{karte.no || "—"}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 6 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: "var(--ink)" }}>{karte.customerName ? `${karte.customerName.replace(/\s*様\s*$/, "")}様` : "（お名前未入力）"}</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: "var(--ink)" }}>タグ {karte.tagNo || "—"}</span>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ink-mute)", marginTop: 3 }}>{itemLine || "—"}</div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: urgentColor, fontWeight: urgency ? 800 : 500, marginTop: 6 }}>
        <span>預かり {mkYmd(karte.receivedDate)}</span>
        <span>渡し {mkYmd(karte.deliveryDate)}{overdue ? "（超過）" : ""}</span>
      </div>
    </div>
  );
};

const MKarteDetailField = ({ label, value }) => (
  <div style={{ marginBottom: 10 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-mute)", marginBottom: 2 }}>{label}</div>
    <div style={{ fontSize: 13.5, color: "var(--ink)", lineHeight: 1.6 }}>{value || "—"}</div>
  </div>
);

const MKarteLightbox = ({ url, name, onClose }) => {
  React.useEffect(() => {
    const k = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="lb-backdrop" onClick={onClose}>
      <button className="lb-close" onClick={onClose}>✕</button>
      <img className="lb-img" src={url} alt={name} referrerPolicy="no-referrer" onClick={(e) => e.stopPropagation()} />
      {name && <div className="lb-cap">{name}</div>}
    </div>
  );
};

const MKarteDetail = ({ karte, onBack }) => {
  const total = window.karteTotal ? window.karteTotal(karte) : 0;
  const custom = karte.customize || {};
  const customLine = ["wash", "button", "hanger", "wrap"].map((k) => custom[k]).filter(Boolean).join(" ・ ");
  const [lightbox, setLightbox] = React.useState(null);
  return (
    <div>
      <button className="m-btn m-btn-ghost" style={{ marginBottom: 12, color: "var(--ink)" }} onClick={onBack}>← 一覧へ戻る</button>
      <div className="m-card">
        <div className="m-card-body" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            {window.StoreTag ? <window.StoreTag name={karte.store} /> : <span>{karte.store}</span>}
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-mute)" }}>{karte.no || "—"}</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 2 }}>
            {karte.customerName ? `${karte.customerName.replace(/\s*様\s*$/, "")}様` : "（お名前未入力）"}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink-mute)", marginBottom: 14 }}>タグ {karte.tagNo || "—"} ・ 顧客番号 {karte.customerNo || "—"}</div>

          <MKarteDetailField label="お預かり日" value={`${mkYmd(karte.receivedDate)} ${mkWd(karte.receivedDate)}`} />
          <MKarteDetailField label="お渡し予定日" value={`${mkYmd(karte.deliveryDate)} ${mkWd(karte.deliveryDate)}`} />
          <MKarteDetailField label="連絡先" value={karte.phone} />
          <MKarteDetailField label="ご連絡希望" value={karte.contactPref} />

          <div style={{ borderTop: "1px solid var(--line)", margin: "14px 0" }}></div>
          <MKarteDetailField label="お品物情報" value={[karte.item.brand, karte.item.category, karte.item.serialNo, karte.item.color].filter(Boolean).join(" ・ ")} />
          {karte.item.showPrice !== false && karte.item.purchasePrice ? <MKarteDetailField label="参考購入価格" value={window.yenK ? window.yenK(karte.item.purchasePrice) : karte.item.purchasePrice} /> : null}
          <MKarteDetailField label="購入時期" value={karte.item.purchaseTime} />
          {(karte.photos || []).length > 0 && (
            <div className="cl-attach" style={{ marginTop: 4 }}>
              {karte.photos.map((p) => (
                <button key={p.id} className="cl-thumb" onClick={() => setLightbox({ url: window.kPhotoOpen(p), name: p.name })} title={p.name}>
                  <img src={window.kPhotoThumb(p, 300)} alt={p.name} loading="lazy" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}

          <div style={{ borderTop: "1px solid var(--line)", margin: "14px 0" }}></div>
          <MKarteDetailField label="お客様からのご要望" value={(karte.requests || []).join(" / ")} />
          <MKarteDetailField label="マイスターからの提案" value={karte.proposal} />
          <MKarteDetailField label="クリーニングカスタマイズ" value={customLine || custom.note} />
          {custom.note && customLine ? <MKarteDetailField label="カスタマイズ補足" value={custom.note} /> : null}

          {karte.measurements && karte.measurements.length > 0 && (
            <React.Fragment>
              <div style={{ borderTop: "1px solid var(--line)", margin: "14px 0" }}></div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-mute)", marginBottom: 6 }}>採寸（前 / 後）</div>
              {karte.measurements.map((m) => (
                <div key={m.id} style={{ fontSize: 13, marginBottom: 4 }}>
                  <b>{m.label}</b> 前{m.before || "—"} / 後{m.after || "—"} cm
                </div>
              ))}
            </React.Fragment>
          )}

          <div style={{ borderTop: "1px solid var(--line)", margin: "14px 0" }}></div>
          <MKarteDetailField label="了解確認事項" value={(karte.confirmations && karte.confirmations.items || []).join(" / ")} />
          <MKarteDetailField label="事前の検品時に気になった点" value={karte.confirmations && karte.confirmations.note} />
          <MKarteDetailField label="クリーニング後のお客様へのアドバイス" value={karte.confirmations && karte.confirmations.advice} />

          <div style={{ borderTop: "1px solid var(--line)", margin: "14px 0" }}></div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-mute)" }}>合計金額</span>
            <span style={{ fontSize: 20, fontWeight: 800 }}>{window.yenK ? window.yenK(total) : total}</span>
          </div>
        </div>
      </div>
      <div style={{ height: 16 }}></div>
      {lightbox && <MKarteLightbox url={lightbox.url} name={lightbox.name} onClose={() => setLightbox(null)} />}
    </div>
  );
};

const MKarte = ({ registerHeader, registerFab }) => {
  const { list } = (window.useKarteData ? window.useKarteData() : { list: [] });
  const [query, setQuery] = React.useState("");
  const [storeFilter, setStoreFilter] = React.useState("");
  const [selectedId, setSelectedId] = React.useState(null);

  React.useEffect(() => {
    registerHeader && registerHeader({ title: "カルテ閲覧", sub: "ハイブランドコース ・ 閲覧のみ" });
    registerFab && registerFab(null);
  }, []);

  const selected = list.find((k) => k.id === selectedId) || null;

  const filtered = React.useMemo(() => {
    let arr = [...list];
    if (storeFilter) arr = arr.filter((k) => k.store === storeFilter);
    const q = query.trim();
    if (q) {
      arr = arr.filter((k) =>
        (k.customerName || "").includes(q) ||
        (k.tagNo || "").includes(q) ||
        (k.customerNo || "").includes(q) ||
        (k.item.brand || "").includes(q)
      );
    }
    return arr.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }, [list, query, storeFilter]);

  if (selected) return <MKarteDetail karte={selected} onBack={() => setSelectedId(null)} />;

  return (
    <div>
      <div className="m-field">
        <label className="m-label">検索</label>
        <input className="m-input" placeholder="お名前・顧客番号・タグ番号・ブランド" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="m-field">
        <label className="m-label">店舗</label>
        <select className="m-input" value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)}>
          <option value="">すべて</option>
          {(window.KARTE_STORES || []).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="m-sec-title" style={{ marginTop: 6 }}>
        カルテ一覧
        <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: "var(--ink-mute)" }}>{filtered.length}件</span>
      </div>
      {filtered.length === 0
        ? <div className="m-empty">該当するカルテがありません</div>
        : filtered.map((k) => <MKarteCard key={k.id} karte={k} onOpen={(kk) => setSelectedId(kk.id)} />)
      }
      <div style={{ height: 16 }}></div>
    </div>
  );
};

window.MKarte = MKarte;
