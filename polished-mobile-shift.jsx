// モバイル版 ─ シフト（今日の出勤 ＋ 月間スケジュール）

const MS_DOW = ["日", "月", "火", "水", "木", "金", "土"];
const msYmd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const MS_ROLE_WORDS = ["受付", "事務", "レジ", "研修", "集配", "配送", "ルート", "ヘルプ", "応援", "保育", "掃除", "洗い", "仕上げ", "プレス"];

const msRawLabel = (raw) => {
  if (!raw) return "";
  const m = String(raw).match(/^[^\d:：]+/);
  let s = m ? m[0] : "";
  return s.replace(/[\s　・,，/／:：-]+$/, "").trim();
};

// ── 今日ビュー ─────────────────────────────────────
const MShiftToday = ({ SHIFT }) => {
  const [mode, setMode] = React.useState("now");
  const now = new Date();
  const tomorrowMode = now.getHours() >= 20;
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
  const msStoreBase = (s) => s.replace(/(店|工場)$/, "");
  const isDispatchTo = (label, curStore) => {
    if (!label) return false;
    return SHIFT.stores.some((s) => {
      if (s.store === curStore) return false;
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
        if (!isRole && isDispatchTo(label, s.store)) return;
        arr.push({ name: st.name, time: c.time, role: isRole ? label : "" });
      }
    });
    ((s.help && s.help[eff]) || []).forEach((h) => {
      if (!h) return;
      const t = h.time || null;
      if (filterNow && t && !(t.s <= refH && refH < t.e)) return;
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
              {g.events.map((ev, i) => <span key={i} className="m-shift-sale">🏷 {ev}</span>)}
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
    </div>
  );
};

// ── 月間ビュー（横スクロール表）─────────────────────
const MShiftMonthly = ({ SHIFT }) => {
  const storeNames = SHIFT.stores.map((s) => s.store);
  const [selStore, setSelStore] = React.useState(storeNames[0] || "");
  const store = SHIFT.stores.find((s) => s.store === selStore);
  if (!store) return <div className="m-empty">拠点が見つかりません</div>;

  const dates = [...(store.dates || [])].sort();
  const ym = SHIFT.month || "";
  const [y, mo] = ym.split("-").map(Number);
  const monthLabel = ym ? `${y}年${mo}月` : "";

  // HELP 出勤者をまとめる（日付→名前→時刻）
  const helpByPerson = {};
  dates.forEach((d) => {
    (store.help && store.help[d] || []).forEach((h) => {
      if (!helpByPerson[h.name]) helpByPerson[h.name] = {};
      helpByPerson[h.name][d] = h.time ? h.time.text : "終日";
    });
  });

  return (
    <div>
      {/* 拠点セレクト */}
      <div className="m-field" style={{ marginBottom: 12 }}>
        <select className="m-input" value={selStore} onChange={(e) => setSelStore(e.target.value)}>
          {storeNames.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* 月ラベル */}
      <div className="m-shift-hero" style={{ marginBottom: 12 }}>
        <div className="m-shift-hero-date">{monthLabel}</div>
        <div className="m-shift-hero-main">
          {(store.staff || []).length}<span className="n" style={{ fontSize: 15 }}>名 / {dates.length}日</span>
        </div>
      </div>

      {/* 横スクロール表 */}
      <div className="mshift-table-outer">
        <div className="mshift-table">
          {/* ヘッダー行（日付） */}
          <div className="mshift-row">
            <div className="mshift-cell-name mshift-head">名前</div>
            {dates.map((d) => {
              const dateObj = new Date(d + "T00:00:00");
              const dow = MS_DOW[dateObj.getDay()];
              const isSun = dateObj.getDay() === 0;
              const isSat = dateObj.getDay() === 6;
              const hasEvent = store.events && store.events[d] && store.events[d].length > 0;
              return (
                <div key={d} className="mshift-cell-date mshift-head" style={{ color: isSun ? "#c5221f" : isSat ? "#1a73e8" : "var(--ink)", background: hasEvent ? "#fef3cd" : undefined }}>
                  <div>{parseInt(d.slice(8))}</div>
                  <div className="mshift-dow">{dow}</div>
                </div>
              );
            })}
          </div>

          {/* スタッフ行 */}
          {(store.staff || []).map((st) => (
            <div key={st.name} className="mshift-row">
              <div className="mshift-cell-name">{st.name}</div>
              {dates.map((d) => {
                const cell = st.cells && st.cells[d];
                const t = cell && cell.time;
                const dateObj = new Date(d + "T00:00:00");
                const isSun = dateObj.getDay() === 0;
                const isSat = dateObj.getDay() === 6;
                const wkBg = isSun ? "rgba(197,34,31,.06)" : isSat ? "rgba(26,115,232,.06)" : undefined;
                return (
                  <div key={d} className={`mshift-cell${t ? " mshift-work" : ""}`} style={{ background: t ? undefined : wkBg }}>
                    {t ? t.text : ""}
                  </div>
                );
              })}
            </div>
          ))}

          {/* 応援行 */}
          {Object.entries(helpByPerson).map(([name, days]) => (
            <div key={"h-" + name} className="mshift-row mshift-help-row">
              <div className="mshift-cell-name">{name}<span className="m-shift-tag m-shift-tag-help" style={{ fontSize: 9, marginLeft: 4 }}>応援</span></div>
              {dates.map((d) => (
                <div key={d} className={`mshift-cell${days[d] ? " mshift-help-cell" : ""}`}>
                  {days[d] || ""}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div style={{ height: 16 }}></div>
    </div>
  );
};

// ── メイン ─────────────────────────────────────────
const MShift = ({ registerHeader, registerFab }) => {
  const SHIFT = (typeof window !== "undefined" && window.SHIFT_2026_06) || null;
  const now = new Date();
  const tomorrowMode = now.getHours() >= 20;
  const [tab, setTab] = React.useState("today");

  React.useEffect(() => {
    registerHeader && registerHeader({ title: "シフト", sub: tab === "today" ? (tomorrowMode ? "20時以降：翌日の出勤" : "本日の出勤") : "月間スケジュール" });
    registerFab && registerFab(null);
  }, [tab]);

  if (!SHIFT) return <div className="m-empty" style={{ marginTop: 30 }}>シフトデータがありません</div>;

  return (
    <div>
      <div className="m-chips" style={{ marginBottom: 14 }}>
        <button className={`m-chip ${tab === "today" ? "active" : ""}`} onClick={() => setTab("today")}>
          {tomorrowMode ? "翌日" : "今日"}の出勤
        </button>
        <button className={`m-chip ${tab === "monthly" ? "active" : ""}`} onClick={() => setTab("monthly")}>
          月間スケジュール
        </button>
      </div>
      {tab === "today"   && <MShiftToday   SHIFT={SHIFT} />}
      {tab === "monthly" && <MShiftMonthly SHIFT={SHIFT} />}
    </div>
  );
};

window.MShift = MShift;
