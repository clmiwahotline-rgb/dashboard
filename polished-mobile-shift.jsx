// モバイル版 ─ シフト（今日／20時以降は翌日・全店の出勤）

const MS_DOW = ["日", "月", "火", "水", "木", "金", "土"];
const msYmd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// 役割語（受付・研修 等）。セル先頭テキストがこれなら「業務」、それ以外の店名なら他店応援(→店名)
const MS_ROLE_WORDS = ["受付", "事務", "レジ", "研修", "集配", "配送", "ルート", "ヘルプ", "応援", "保育", "掃除", "洗い", "仕上げ", "プレス"];
// セル raw の先頭（時刻より前）のラベルを取り出す
const msRawLabel = (raw) => {
  if (!raw) return "";
  const m = String(raw).match(/^[^\d:：]+/);
  let s = m ? m[0] : "";
  return s.replace(/[\s　・,，/／:：-]+$/, "").trim();
};

const MShift = ({ registerHeader, registerFab }) => {
  const SHIFT = (typeof window !== "undefined" && window.SHIFT_2026_06) || null;
  const [mode, setMode] = React.useState("now"); // now | all
  const now = new Date();
  const tomorrowMode = now.getHours() >= 20;

  React.useEffect(() => { registerHeader && registerHeader({ title: "シフト", sub: tomorrowMode ? "20時以降：翌日の出勤" : "本日の出勤" }); registerFab && registerFab(null); }, []);

  if (!SHIFT) return <div className="m-empty" style={{ marginTop: 30 }}>シフトデータがありません</div>;

  // 勤務がある日付の集合
  const dset = new Set();
  SHIFT.stores.forEach((s) => (s.staff || []).forEach((st) => Object.keys(st.cells || {}).forEach((d) => { if (st.cells[d] && st.cells[d].time) dset.add(d); })));
  const dates = [...dset].sort();
  const todayISO = msYmd(now);
  let eff;
  if (tomorrowMode) { const tISO = msYmd(new Date(now.getTime() + 864e5)); eff = dates.find((d) => d >= tISO) || dates[dates.length - 1]; }
  else { eff = dset.has(todayISO) ? todayISO : (dates.filter((d) => d <= todayISO).pop() || dates[0]); }

  const nowH = now.getHours() + now.getMinutes() / 60;
  const refH = Math.min(18.99, Math.max(9, nowH));
  const filterNow = mode === "now" && !tomorrowMode;

  // ラベルが「自店以外の拠点名」かどうか＝他店ヘルプに出ているか
  const msStoreBase = (s) => s.replace(/(店|工場)$/, "");
  const isDispatchTo = (label, curStore) => {
    if (!label) return false;
    return SHIFT.stores.some((s) => {
      if (s.store === curStore) return false; // 自店は応援ではない
      const base = msStoreBase(s.store);
      return label === s.store || label === base || (base.length >= 2 && (label.indexOf(base) === 0 || base.indexOf(label) === 0));
    });
  };

  const groups = SHIFT.stores.map((s) => {
    const arr = [];
    (s.staff || []).forEach((st) => {
      const c = st.cells && st.cells[eff];
      if (c && c.time && (!filterNow || (c.time.s <= refH && refH < c.time.e))) {
        const label = msRawLabel(c.raw);
        const isRole = label && MS_ROLE_WORDS.some((w) => label.indexOf(w) >= 0);
        // 他店へ応援に出た日は、元店舗には掲載しない（応援先側に勤務として表示される）
        if (!isRole && isDispatchTo(label, s.store)) return;
        arr.push({ name: st.name, time: c.time, role: isRole ? label : "" });
      }
    });
    // 他店から来た応援（HELP）。時刻が未設定でも表示する（応援＝終日扱い）
    ((s.help && s.help[eff]) || []).forEach((h) => {
      if (!h) return;
      const t = h.time || null;
      if (filterNow && t && !(t.s <= refH && refH < t.e)) return; // 時刻が分かる場合のみ現在勤務中で絞る
      arr.push({ name: h.name, time: t, help: true });
    });
    arr.sort((a, b) => ((a.time && a.time.s) || 99) - ((b.time && b.time.s) || 99));
    return { store: s.store, people: arr, events: (s.events && s.events[eff]) || [] };
  }).filter((g) => g.people.length || g.events.length);

  const total = groups.reduce((a, b) => a + b.people.length, 0);
  const effD = new Date(eff + "T00:00:00");
  const dateLbl = `${effD.getMonth() + 1}/${effD.getDate()}（${MS_DOW[effD.getDay()]}）`;

  return (
    <div>
      <div className="m-shift-hero">
        <div className="m-shift-hero-date">{tomorrowMode ? "翌日の出勤予定" : "本日の出勤"}</div>
        <div className="m-shift-hero-main">{dateLbl}<span className="n">{total}名</span></div>
        {!tomorrowMode && (
          <div className="m-seg" style={{ marginTop: 12 }}>
            <button className={`m-seg-opt ${mode === "now" ? "active" : ""}`} style={mode === "now" ? { background: "#fff", color: "var(--accent-ink)" } : { background: "rgba(255,255,255,.18)", color: "#fff", borderColor: "transparent" }} onClick={() => setMode("now")}>現在勤務中</button>
            <button className={`m-seg-opt ${mode === "all" ? "active" : ""}`} style={mode === "all" ? { background: "#fff", color: "var(--accent-ink)" } : { background: "rgba(255,255,255,.18)", color: "#fff", borderColor: "transparent" }} onClick={() => setMode("all")}>終日</button>
          </div>
        )}
      </div>

      <div className="m-sec-title">🏪 拠点別の出勤{filterNow ? "（現在時刻）" : "（終日）"}</div>
      {groups.length === 0 ? (
        <div className="m-card"><div className="m-card-body"><div className="m-empty">{filterNow ? "現在出勤中のスタッフはいません" : "出勤予定はありません"}</div></div></div>
      ) : (
        groups.map((g) => (
          <div key={g.store} className="m-card m-shift-store">
            <div className="m-shift-store-head">
              <StoreTag name={g.store} />
              {g.events.map((ev, i) => (
                <span key={i} className="m-shift-sale">🏷 {ev}</span>
              ))}
              <span className="m-shift-store-n">{g.people.length}名</span>
            </div>
            <div className="m-shift-rows">
              {g.people.map((p, i) => (
                <div key={i} className="m-shift-row">
                  <span className="m-shift-row-name">{p.name}</span>
                  {p.help && <span className="m-shift-tag m-shift-tag-help">応援</span>}
                  {p.role && <span className="m-shift-tag m-shift-tag-role">{p.role}</span>}
                  <span className="m-shift-row-time">{p.time ? p.time.text : (p.help ? "終日" : "")}</span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
      <a className="m-bigbtn" href={encodeURIComponent("シフト.html") + "?view=pc"}>📅 月間シフト表をPC版で開く</a>
      <div style={{ height: 12 }}></div>
    </div>
  );
};

window.MShift = MShift;
