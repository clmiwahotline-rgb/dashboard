// シフト — 各拠点の本日シフト状況 + 月間シフト表（横スライド）+ 変更メモ + CSV取込
// data 構造: { month, stores:[{store, sheet, dates, weekday, events:{date:[..]}, help:{date:[{raw,name,time}]}, staff:[{name, days, hours, cells:{date:{raw,time:{s,e,text}}}}]}] }

const DOM_S = 9, DOM_E = 19;                  // カバーバー営業時間ドメイン
const SLOTS = (DOM_E - DOM_S) * 4;            // 15分刻み
const ROLE_WORDS = /受付|事務|レジ|電話|研修|本部|休|練習|会議|面談|集配|配送|ルート|回収|納品|配達/;

const pad2 = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const dayNum = (s) => parseInt(s.slice(8, 10), 10);
const monNum = (s) => parseInt(s.slice(5, 7), 10);
// 曜日は日付から自動算出
const wdOf = (s) => { const d = new Date(s + "T00:00:00"); return isNaN(d) ? "" : WD_JP[d.getDay()]; };
const isSat = (s) => wdOf(s) === "土";
const isSun = (s) => wdOf(s) === "日";

const locOf = (raw) => {
  if (!raw) return "";
  const m = /^([^\d]+)/.exec(raw);
  return (m ? m[1] : "").replace(/[\/・]/g, " ").trim();
};
const isDispatch = (loc) => !!loc && /[一-龯]/.test(loc) && !ROLE_WORDS.test(loc);
const initial = (name) => (name || "·").trim().replace(/[\s（(ｈh]/g, "").slice(0, 1) || "·";
const hhmm = (h) => h == null ? "—" : (Number.isInteger(h) ? `${h}:00` : `${Math.floor(h)}:${pad2(Math.round((h % 1) * 60))}`);

// 氏名末尾の「研修」をバッジ分離
const splitName = (name) => {
  const m = /^(.*?)[\s　]*(研修)$/.exec(name || "");
  return m && m[1].trim() ? { base: m[1].trim(), badge: m[2] } : { base: name, badge: null };
};
// 役割ラベル表示（集配＋時間付き＝AM集配）
const roleLabel = (loc, hasTime, compact) => (/集配/.test(loc) && hasTime) ? (compact ? "AM集配" : "AM集配有") : loc;

// 指定日の勤務状況（KPIは他店応援を除外、HELP=受入は加算）
const dayInfo = (store, date) => {
  const onsite = [], out = [];
  for (const p of store.staff) {
    const c = p.cells[date];
    if (!c || (!c.time && !c.raw)) continue;
    const loc = locOf(c.raw);
    const t = c.time || null;
    const row = { name: p.name, raw: c.raw, loc, time: t, s: t ? t.s : null, e: t ? t.e : null };
    if (isDispatch(loc)) out.push(row); else onsite.push(row);
  }
  const helpers = (store.help[date] || []).map(h => ({
    name: h.name || locOf(h.raw), raw: h.raw, time: h.time || null,
    s: h.time ? h.time.s : null, e: h.time ? h.time.e : null, help: true,
  }));
  const counted = [...onsite, ...helpers];
  counted.sort((a, b) => (a.s ?? 99) - (b.s ?? 99));
  out.sort((a, b) => (a.s ?? 99) - (b.s ?? 99));

  const cover = new Array(SLOTS).fill(0);
  for (const w of counted) {
    if (w.s == null) continue;
    const e = w.e ?? DOM_E;
    const a = Math.max(0, Math.round((w.s - DOM_S) * 4));
    const b = Math.min(SLOTS, Math.round((e - DOM_S) * 4));
    for (let i = a; i < b; i++) cover[i]++;
  }
  const open = counted.filter(w => w.s != null).reduce((m, w) => Math.min(m, w.s), 99);
  const close = counted.filter(w => w.e != null).reduce((m, w) => Math.max(m, w.e), 0);
  const peak = cover.reduce((m, v) => Math.max(m, v), 0);
  return { onsite, helpers, out, counted, cover, count: counted.length,
    open: open === 99 ? null : open, close: close === 0 ? null : close, peak,
    events: store.events[date] || [] };
};

const coverColor = (n) => n <= 0 ? "transparent" : n === 1 ? "var(--cov-1)" : n === 2 ? "var(--cov-2)" : "var(--cov-3)";

// ── カバーバー ──
const CoverBar = ({ info }) => {
  const segs = []; let i = 0;
  while (i < SLOTS) {
    const v = info.cover[i]; let j = i + 1;
    while (j < SLOTS && info.cover[j] === v) j++;
    if (v > 0) segs.push({ left: (i / SLOTS) * 100, width: ((j - i) / SLOTS) * 100, n: v });
    i = j;
  }
  return (
    <div className="st-cover">
      <div className="st-cover-track">
        {[11, 13, 15, 17].map(h => <div key={h} className="st-cover-tick" style={{ left: `${((h - DOM_S) / (DOM_E - DOM_S)) * 100}%` }} />)}
        {segs.map((s, k) => <div key={k} className="st-cover-seg" title={`${s.n}名`} style={{ left: `${s.left}%`, width: `${s.width}%`, background: coverColor(s.n) }} />)}
      </div>
      <div className="st-cover-axis"><span>9</span><span>11</span><span>13</span><span>15</span><span>17</span><span>19</span></div>
    </div>
  );
};

const WorkerRow = ({ w }) => {
  const { base, badge } = splitName(w.name);
  return (
    <div className="st-w" title={w.raw}>
      <span className={`st-w-av ${w.help ? "help" : ""}`}>{initial(w.name)}</span>
      <span className="st-w-name">{base}</span>
      {badge && <span className="st-w-train">{badge}</span>}
      {w.help && <span className="st-w-help">応援</span>}
      {!w.help && w.loc && !isDispatch(w.loc) && <span className="st-w-role">{roleLabel(w.loc, !!w.time)}</span>}
      <span className="st-w-time">{w.time ? w.time.text : (w.raw || "—")}</span>
    </div>
  );
};

// ── 本日の拠点カード ──
const StoreToday = ({ store, date, notes, onOpenTable }) => {
  const info = React.useMemo(() => dayInfo(store, date), [store, date]);
  const empty = info.count === 0;
  const isFactory = /工場/.test(store.store);
  return (
    <div className={`st-card ${empty ? "is-empty" : ""}`}>
      <div className="st-card-head">
        <StoreTag name={store.store} />
        {notes.length > 0 && <span className="st-note-badge" title={`変更メモ ${notes.length}件`}>メモ{notes.length}</span>}
        <button className="st-card-link" onClick={() => onOpenTable(store.store)} title="月間シフト表で見る">表 →</button>
      </div>

      {notes.length > 0 && (
        <div className="st-notes">
          {notes.map(n => (
            <div key={n.id} className="st-note">
              <span className="st-note-ico" aria-hidden="true">!</span>
              <span className="st-note-txt">{n.who && n.who !== "（拠点全体）" ? <b>{n.who}：</b> : null}{n.text}</span>
            </div>
          ))}
        </div>
      )}

      <div className="st-card-metrics">
        <div className="st-metric"><span className="st-metric-num">{info.count}</span><span className="st-metric-u">名</span></div>
        <div className="st-metric-sub">
          {empty ? "本日のシフトなし"
                 : <>カバー <b>{hhmm(info.open)}–{hhmm(info.close)}</b>
                     {isFactory
                       ? (info.count <= 3 && <span className="st-help-need">ヘルプ確認</span>)
                       : (info.peak >= 3 && <span className="st-peak">最大{info.peak}名重複</span>)}
                   </>}
        </div>
        {info.events.map((e, i) => <span key={i} className="st-event">{e}</span>)}
      </div>

      {!empty && <CoverBar info={info} />}

      <div className="st-workers">
        {empty && <div className="st-empty-note">— 休業 / 配置なし —</div>}
        {info.counted.map((w, i) => <WorkerRow key={"c" + i} w={w} />)}
        {info.out.length > 0 && (
          <div className="st-out">
            {info.out.map((w, i) => {
              const sn = splitName(w.name);
              return (
              <div key={"o" + i} className="st-w is-out" title={w.raw}>
                <span className="st-w-av out">{initial(w.name)}</span>
                <span className="st-w-name">{sn.base}</span>
                {sn.badge && <span className="st-w-train">{sn.badge}</span>}
                <span className="st-w-disp">→{w.loc}</span>
                <span className="st-w-time">{w.time ? w.time.text : ""}</span>
              </div>
            );})}
          </div>
        )}
      </div>
    </div>
  );
};

// ── 月間グリッド ──
const GridCell = ({ c, sel, sat, sun, editable, onEdit }) => {
  const [editing, setEditing] = React.useState(false);
  const [val, setVal] = React.useState("");
  const start = () => { if (!editable) return; setVal(c ? c.raw : ""); setEditing(true); };
  const commit = () => { setEditing(false); onEdit(val); };

  if (editing) {
    return (
      <div className={`sg-cell sg-cell-editing ${sat ? "sat" : ""} ${sun ? "sun" : ""} ${sel ? "sel" : ""}`}>
        <input autoFocus className="sg-cell-input" value={val} placeholder="例 9-15"
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            else if (e.key === "Escape") { e.preventDefault(); setEditing(false); }
          }} />
      </div>
    );
  }
  if (!c) return <div className={`sg-cell ${editable ? "sg-cell-edit" : ""} ${sat ? "sat" : ""} ${sun ? "sun" : ""} ${sel ? "sel" : ""}`} onClick={start} title={editable ? "クリックして入力" : undefined} />;
  const loc = locOf(c.raw);
  const disp = isDispatch(loc);
  return (
    <div className={`sg-cell on ${editable ? "sg-cell-edit" : ""} ${disp ? "disp" : ""} ${sat ? "sat" : ""} ${sun ? "sun" : ""} ${sel ? "sel" : ""}`} title={c.raw} onClick={start}>
      <span className="sg-cell-t">{c.time ? c.time.text : c.raw}</span>
      {loc && <span className="sg-cell-loc">{roleLabel(loc, !!c.time, true)}</span>}
    </div>
  );
};

const ShiftGrid = ({ store, selDate, dates, scrollRef, editMode, onCellEdit }) => {
  const helpDates = store.help || {};
  const hasHelp = dates.some(d => (helpDates[d] || []).length);
  return (
    <div className="sg-scroll" ref={scrollRef}>
      <div className="sg" style={{ gridTemplateColumns: `var(--namew) repeat(${dates.length}, var(--cellw))` }}>
        <div className="sg-corner">スタッフ</div>
        {dates.map(d => (
          <div key={d} className={`sg-dh ${isSat(d) ? "sat" : ""} ${isSun(d) ? "sun" : ""} ${d === selDate ? "sel" : ""}`}>
            <span className="sg-dh-n">{dayNum(d)}</span><span className="sg-dh-w">{wdOf(d)}</span>
          </div>
        ))}
        <div className="sg-evlbl">イベント</div>
        {dates.map(d => {
          const ev = store.events[d] || [];
          return <div key={d} className={`sg-ev ${isSat(d) ? "sat" : ""} ${isSun(d) ? "sun" : ""} ${d === selDate ? "sel" : ""}`}>
            {ev.length ? <span className="sg-ev-tag" title={ev.join(" / ")}>{ev[0]}</span> : ""}
          </div>;
        })}
        {store.staff.map((p) => (
          <React.Fragment key={p.name}>
            <div className="sg-name">
              <span className="sg-name-av">{initial(p.name)}</span>
              <div className="sg-name-main">
                <span className="sg-name-t">{splitName(p.name).base}</span>
                <span className="sg-name-meta">
                  {splitName(p.name).badge && <span className="sg-train-badge">{splitName(p.name).badge}</span>}
                  <span className="sg-name-sub">{p.days}日</span>
                </span>
              </div>
            </div>
            {dates.map(d => <GridCell key={d} c={p.cells[d]} sel={d === selDate} sat={isSat(d)} sun={isSun(d)}
              editable={editMode} onEdit={(v) => onCellEdit(store.store, p.name, d, v)} />)}
          </React.Fragment>
        ))}
        {hasHelp && (
          <React.Fragment>
            <div className="sg-name sg-name-help"><span className="sg-name-av help">助</span><span className="sg-name-t">応援(HELP)</span></div>
            {dates.map(d => {
              const hs = helpDates[d] || [];
              return (
                <div key={d} className={`sg-cell sg-cell-help ${isSat(d) ? "sat" : ""} ${isSun(d) ? "sun" : ""} ${d === selDate ? "sel" : ""} ${hs.length ? "on" : ""}`} title={hs.map(h => h.raw).join(" / ")}>
                  {hs.map((h, i) => <span key={i} className="sg-help-chip">{h.name}{h.time ? <b>{h.time.text}</b> : null}</span>)}
                </div>
              );
            })}
          </React.Fragment>
        )}
      </div>
    </div>
  );
};

// ── 変更メモ入力フォーム + CSV取込 ──
const NotesPanel = ({ stores, dates, notes, selDate, onAdd, onDel, onCSV, onResetData }) => {
  const [date, setDate] = React.useState(selDate);
  const [store, setStore] = React.useState(stores[0] ? stores[0].store : "");
  const [who, setWho] = React.useState("（拠点全体）");
  const [text, setText] = React.useState("");
  const fileRef = React.useRef(null);

  React.useEffect(() => { setDate(selDate); }, [selDate]);
  const staffOf = (sn) => { const s = stores.find(x => x.store === sn); return s ? s.staff.map(p => p.name) : []; };
  React.useEffect(() => { setWho("（拠点全体）"); }, [store]);

  const minD = dates[0], maxD = dates[dates.length - 1];

  const submit = () => {
    if (!text.trim()) return;
    onAdd({ id: "n" + Date.now() + Math.random().toString(36).slice(2, 6), date, store, who, text: text.trim(), ts: Date.now() });
    setText("");
  };

  const todayISO = ymd(new Date());
  const recent = notes.filter(n => n.date >= todayISO).sort((a, b) => a.date.localeCompare(b.date) || b.ts - a.ts);

  const dlSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "シフト取込_見本.csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="card">
      <div className="card-head">
        <h3 className="card-title">変更メモ・連絡</h3>
        <span className="card-sub">当日の変更を記録 → 拠点カードに表示</span>
        <div className="right nf-tools">
          <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: "none" }}
                 onChange={(e) => { const f = e.target.files[0]; if (f) onCSV(f); e.target.value = ""; }} />
          <button className="nf-btn ghost" onClick={dlSample} title="取込フォーマットの見本をダウンロード">見本CSV</button>
          <button className="nf-btn" onClick={() => fileRef.current && fileRef.current.click()}>CSV取込</button>
        </div>
      </div>

      <div className="nf-form">
        <label className="nf-field">
          <span className="nf-lbl">日付</span>
          <input type="date" className="nf-input" value={date} min={minD} max={maxD} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="nf-field">
          <span className="nf-lbl">どこの（拠点）</span>
          <select className="nf-input" value={store} onChange={(e) => setStore(e.target.value)}>
            {stores.map(s => <option key={s.store} value={s.store}>{s.store}</option>)}
          </select>
        </label>
        <label className="nf-field">
          <span className="nf-lbl">誰が（スタッフ）</span>
          <select className="nf-input" value={who} onChange={(e) => setWho(e.target.value)}>
            <option value="（拠点全体）">（拠点全体）</option>
            {staffOf(store).map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="nf-field nf-grow">
          <span className="nf-lbl">どうなった</span>
          <input type="text" className="nf-input" value={text} placeholder="例：休みに変更になりました"
                 onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
        </label>
        <button className="nf-btn nf-add" onClick={submit} disabled={!text.trim()}>追加</button>
      </div>

      {recent.length > 0 && (
        <div className="nf-list">
          {recent.map(n => (
            <div key={n.id} className="nf-item">
              <span className="nf-item-date">{monNum(n.date)}/{dayNum(n.date)}</span>
              <StoreTag name={n.store} className="nf-item-store" />
              <span className="nf-item-txt">{n.who && n.who !== "（拠点全体）" ? <b>{n.who}：</b> : null}{n.text}</span>
              <button className="nf-del" onClick={() => onDel(n.id)} aria-label="削除">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── 編集履歴パネル（最下部） ──
const HistoryPanel = ({ history, onClear }) => {
  const fmtTs = (ts) => new Date(ts).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const dLabel = (d) => `${monNum(d)}/${dayNum(d)}（${wdOf(d)}）`;
  return (
    <div className="card" id="st-history-card">
      <div className="card-head">
        <h3 className="card-title">編集履歴</h3>
        <span className="card-sub">{history.length ? `新しい変更が上 ・ ${history.length}件` : "シフト編集の変更がここに記録されます"}</span>
        {history.length > 0 && <div className="right"><button className="nf-btn ghost" onClick={onClear} title="編集履歴をすべて消去">履歴をクリア</button></div>}
      </div>
      {history.length === 0 ? (
        <div className="hist-empty">まだ変更はありません。「✎ シフト編集」でセルをタップして時間を変えると、変更点がここに残ります。</div>
      ) : (
        <div className="hist-list">
          {history.map((h) => (
            <div key={h.id} className="hist-item">
              <span className="hist-time">{fmtTs(h.ts)}</span>
              <StoreTag name={h.store} className="hist-store" />
              <span className="hist-who">{splitName(h.staff).base}</span>
              <span className="hist-date">{dLabel(h.date)}</span>
              <span className="hist-change">
                <span className={`hist-val ${h.before ? "" : "off"}`}>{h.before || "休み"}</span>
                <span className="hist-arrow">→</span>
                <span className={`hist-val to ${h.after ? "" : "off"}`}>{h.after || "休み"}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── ページ ──
const StoresPage = () => {
  const [dark, setDark] = React.useState(false);
  React.useEffect(() => { document.documentElement.setAttribute("data-theme", dark ? "dark" : "light"); }, [dark]);

  const [data, setData] = React.useState(() => recomputeData(loadShiftData()));
  const [notes, setNotes] = React.useState(loadNotes);
  const [history, setHistory] = React.useState(loadHistory);
  const stores = data.stores;
  const dates = React.useMemo(() => {
    if (data._allDates && data._allDates.length) return data._allDates;
    const s = new Set(); stores.forEach(st => (st.dates || []).forEach(d => s.add(d))); return [...s].sort();
  }, [data]);

  const realToday = ymd(new Date());
  const startIdx = dates.indexOf(realToday) >= 0 ? dates.indexOf(realToday) : 0;
  const [dateIdx, setDateIdx] = React.useState(startIdx);
  const di = Math.min(dateIdx, dates.length - 1);
  const selDate = dates[di];
  const isToday = selDate === realToday;

  const [storeIdx, setStoreIdx] = React.useState(0);
  const [dir, setDir] = React.useState(1);
  const scrollRef = React.useRef(null);
  const si = Math.min(storeIdx, stores.length - 1);
  const goStore = (next) => { const i = Math.max(0, Math.min(stores.length - 1, next)); setDir(i >= si ? 1 : -1); setStoreIdx(i); };

  const totals = React.useMemo(() => {
    let people = 0, open = 0;
    stores.forEach(st => { const d = dayInfo(st, selDate); people += d.count; if (d.count > 0) open++; });
    return { people, open };
  }, [selDate, data]);

  const notesByStore = React.useMemo(() => {
    const m = {}; notes.filter(n => n.date === selDate).forEach(n => { (m[n.store] = m[n.store] || []).push(n); }); return m;
  }, [notes, selDate]);

  const openTable = (storeName) => {
    const i = stores.findIndex(s => s.store === storeName);
    if (i >= 0) goStore(i);
    requestAnimationFrame(() => document.getElementById("st-table-card")?.scrollIntoView?.({ block: "nearest" }));
  };
  React.useEffect(() => { if (scrollRef.current) scrollRef.current.scrollLeft = 0; }, [storeIdx]);
  const onKey = (e) => { if (e.key === "ArrowLeft") goStore(si - 1); if (e.key === "ArrowRight") goStore(si + 1); };

  // メモ操作（変更メモ＝コメントを全端末で同期）
  const NOTES_SHEET = "シフト変更メモ";
  const cloudOn = React.useRef(typeof cloudEnabled === "function" && cloudEnabled()).current;

  // 起動時：クラウドからメモを取得（あれば正とする）
  React.useEffect(() => {
    if (!cloudOn) return;
    let cancelled = false;
    (async () => {
      const remote = await cloudGet(NOTES_SHEET);
      if (cancelled || remote == null) return;
      if (remote.length) {
        const norm = remote.map((n) => ({ ...n, ts: Number(n.ts) || 0 }));
        setNotes(norm); saveNotes(norm);
      } else if (notes.length) {
        cloudReplaceAll(NOTES_SHEET, notes);  // 初回：ローカルのメモをクラウドへ移行
      }
    })();
    return () => { cancelled = true; };
  }, [cloudOn]); // eslint-disable-line

  const addNote = (n) => {
    const next = [...notes, n]; setNotes(next); saveNotes(next);
    if (cloudOn) cloudAdd(NOTES_SHEET, n);
  };
  const delNote = (id) => {
    const next = notes.filter(x => x.id !== id); setNotes(next); saveNotes(next);
    if (cloudOn) cloudDelete(NOTES_SHEET, id);
  };

  // 編集履歴（シフト編集の変更ログ＝全端末で同期）
  const HISTORY_SHEET = "シフト編集履歴";
  React.useEffect(() => {
    if (!cloudOn) return;
    let cancelled = false;
    (async () => {
      const remote = await cloudGet(HISTORY_SHEET);
      if (cancelled || remote == null) return;
      if (remote.length) {
        const norm = remote.map((h) => ({ ...h, ts: Number(h.ts) || 0 })).sort((a, b) => b.ts - a.ts).slice(0, 300);
        setHistory(norm); saveHistory(norm);
      } else if (history.length) {
        cloudReplaceAll(HISTORY_SHEET, history);  // 初回：ローカル履歴をクラウドへ移行
      }
    })();
    return () => { cancelled = true; };
  }, [cloudOn]); // eslint-disable-line

  const addHistory = (rec) => {
    setHistory((prev) => { const next = [rec, ...prev].slice(0, 300); saveHistory(next); return next; });
    if (cloudOn) cloudAdd(HISTORY_SHEET, rec);
  };
  const clearHistory = () => {
    if (!confirm("編集履歴をすべて消去します。よろしいですか？（シフト本体は変わりません）")) return;
    setHistory([]); saveHistory([]);
    if (cloudOn) cloudReplaceAll(HISTORY_SHEET, []);
  };

  // ── シフトデータ：全端末同期（拠点ごと1レコード = 月JSON）──
  const SHIFT_SHEET = "シフトデータ";
  const [cloudTs, setCloudTs] = React.useState(0);
  const [editMode, setEditMode] = React.useState(false);
  const [toast, setToast] = React.useState("");
  React.useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2200); return () => clearTimeout(t); }, [toast]);

  const storeRow = (month, s) => ({ id: `${month}__${s.store}`, month, store: s.store, json: JSON.stringify(s), ts: Date.now() });
  const pushAllStores = (d) => { if (cloudOn) cloudReplaceAll(SHIFT_SHEET, d.stores.map((s) => storeRow(d.month, s))); };
  const pushOneStore = (d, s) => { if (cloudOn && s) { const r = storeRow(d.month, s); cloudUpdate(SHIFT_SHEET, r.id, r); } };

  React.useEffect(() => {
    if (!cloudOn) return;
    let cancelled = false;
    (async () => {
      const remote = await cloudGet(SHIFT_SHEET);
      if (cancelled || remote == null) return;
      const monthRows = remote.filter((r) => r.month === data.month);
      if (monthRows.length) {
        const stores = monthRows.map((r) => { try { return JSON.parse(r.json); } catch { return null; } }).filter(Boolean);
        if (stores.length) {
          const nd = { ...data, stores };
          recomputeData(nd);
          setData(nd);
          setCloudTs(Math.max(...monthRows.map((r) => Number(r.ts) || 0)));
        }
      } else {
        pushAllStores(data);   // 初回：ローカルをクラウドへ移行
      }
    })();
    return () => { cancelled = true; };
  }, [cloudOn]); // eslint-disable-line

  // セル編集：時間テキストを更新 → 再集計 → 該当拠点だけクラウド反映
  const editCell = (storeName, staffName, date, rawText) => {
    const txt = (rawText || "").trim();
    let rec = null;
    setData((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const st = next.stores.find((s) => s.store === storeName);
      if (!st) return prev;
      const p = st.staff.find((x) => x.name === staffName);
      if (!p) return prev;
      const before = p.cells[date] ? p.cells[date].raw : "";
      if (txt === before) return prev;
      if (!txt) delete p.cells[date];
      else p.cells[date] = { raw: txt, time: ioParseTime(txt) };
      recomputeData(next);
      saveShiftData(next);
      setCloudTs(Date.now());
      pushOneStore(next, next.stores.find((s) => s.store === storeName));
      rec = { id: "h" + Date.now() + Math.random().toString(36).slice(2, 6), ts: Date.now(), store: storeName, staff: staffName, date, before, after: txt };
      return next;
    });
    if (rec) { addHistory(rec); setToast(cloudOn ? "シフトを更新（全端末に同期）" : "シフトを更新しました"); }
  };

  // CSV取込
  const onCSV = (file) => {
    const rdr = new FileReader();
    rdr.onload = () => {
      const res = importShiftCSV(String(rdr.result), data);
      if (res.error) { alert("取込エラー：" + res.error); return; }
      recomputeData(res.data);
      setData({ ...res.data });
      saveShiftData(res.data);
      pushAllStores(res.data);
      setCloudTs(Date.now());
      alert(`CSVを取り込みました（${res.added}件の勤務を反映、全${res.data.stores.length}拠点）`);
    };
    rdr.readAsText(file, "utf-8");
  };
  const onResetData = () => {
    if (!confirm("CSV取込分をクリアし、初期データに戻します。よろしいですか？")) return;
    resetShiftData();
    const d = recomputeData(window.SHIFT_2026_06 || { month: "2026-06", stores: [] });
    setData({ ...d });
    pushAllStores(d);
    setCloudTs(Date.now());
  };

  const wd = wdOf(selDate);
  const wdCls = wd === "土" ? "sat" : wd === "日" ? "sun" : "";

  return (
    <div className="app">
      <div className="shell">
        <AppSidebar active="shift" />
        <main className="main">
          <div className="greet">
            <div>
              <h1>シフト</h1>
              <div className="sub">2026年6月 ・ 仮シフト ・ 全{stores.length}拠点{cloudOn ? (cloudTs ? ` ・ ☁ 同期（更新 ${new Date(cloudTs).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}）` : " ・ ☁ 同期") : ""}</div>
            </div>
            <div className="right" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button className={`nf-btn ${editMode ? "" : "ghost"}`} onClick={() => setEditMode((v) => !v)} title="月間表のセルをタップして時間を編集">{editMode ? "✓ 編集を終了" : "✎ シフト編集"}</button>
              <button className="nf-btn ghost" onClick={onResetData} title="CSV取込をクリアして初期データに戻す">初期化</button>
            </div>
          </div>

          {/* 変更メモ + CSV取込 */}
          <NotesPanel stores={stores} dates={dates} notes={notes} selDate={selDate}
                      onAdd={addNote} onDel={delNote} onCSV={onCSV} onResetData={onResetData} />

          {/* 各拠点のシフト状況 */}
          <div className="card">
            <div className="card-head">
              <h3 className="card-title">各拠点のシフト状況</h3>
              <span className="card-sub">{isToday ? "本日" : "選択日"}</span>
              <div className="right st-daynav">
                <button className="st-nav-btn" onClick={() => setDateIdx(Math.max(0, di - 1))} disabled={di === 0} aria-label="前日">‹</button>
                <div className={`st-daypick ${wdCls}`}><span className="st-daypick-d">{monNum(selDate)}月{dayNum(selDate)}日</span><span className="st-daypick-w">（{wd}）</span></div>
                <button className="st-nav-btn" onClick={() => setDateIdx(Math.min(dates.length - 1, di + 1))} disabled={di === dates.length - 1} aria-label="翌日">›</button>
                {dates.indexOf(realToday) >= 0 && <button className={`st-today-btn ${isToday ? "on" : ""}`} onClick={() => setDateIdx(dates.indexOf(realToday))}>今日</button>}
              </div>
            </div>

            <div className="st-summary">
              {totals.open === 0
                ? <span><b>全拠点休業</b> ・ 定休日（{wd}曜）</span>
                : <><span><b>{totals.open}</b>/{stores.length} 拠点が稼働</span><span className="st-summary-dot">・</span><span>出勤 のべ <b>{totals.people}</b> 名<span className="st-summary-note">（他店応援は除く）</span></span></>}
              <span className="st-cov-legend">
                <span className="st-cov-key"><i style={{ background: "var(--cov-1)" }} />1名</span>
                <span className="st-cov-key"><i style={{ background: "var(--cov-2)" }} />2名</span>
                <span className="st-cov-key"><i style={{ background: "var(--cov-3)" }} />3名+</span>
              </span>
            </div>

            <div className="st-grid">
              {stores.map((st) => <StoreToday key={st.store} store={st} date={selDate} notes={notesByStore[st.store] || []} onOpenTable={openTable} />)}
            </div>
          </div>

          {/* 月間シフト表 */}
          <div className="card" id="st-table-card" tabIndex={0} onKeyDown={onKey} style={{ outline: "none" }}>
            <div className="card-head">
              <h3 className="card-title">月間シフト表</h3>
              <span className="card-sub">{editMode ? "✎ セルをタップ → 時間を入力（例 9-15／空欄で休み）→ Enter" : "タブ／←→キーで拠点切替 ・ 表は左右スクロール"}</span>
              <div className="right st-daynav">
                <button className="st-nav-btn" onClick={() => goStore(si - 1)} disabled={si === 0} aria-label="前の拠点">‹</button>
                <span className="st-storepos">{si + 1} / {stores.length}</span>
                <button className="st-nav-btn" onClick={() => goStore(si + 1)} disabled={si === stores.length - 1} aria-label="次の拠点">›</button>
              </div>
            </div>

            <div className="st-tabs">
              {stores.map((st, i) => (
                <button key={st.store} className={`st-tab ${i === si ? "active" : ""}`} onClick={() => goStore(i)}>
                  <span className="st-tab-dot" style={{ background: (storeColor(st.store) || {}).bg || "var(--ink-faint)" }} />{st.store}
                </button>
              ))}
            </div>

            <div className="st-carousel">
              <div className={`st-panel ${dir >= 0 ? "slide-next" : "slide-prev"}`} key={si}>
                <div className="st-panel-head">
                  <StoreTag name={stores[si].store} />
                  <span className="st-panel-meta">{stores[si].staff.length}名 ・ シート「{stores[si].sheet}」</span>
                </div>
                <ShiftGrid store={stores[si]} selDate={selDate} dates={dates} scrollRef={scrollRef} editMode={editMode} onCellEdit={editCell} />
              </div>
            </div>

            <div className="sg-legend">
              <span className="sg-lg"><span className="sg-lg-sw on" />勤務</span>
              <span className="sg-lg"><span className="sg-lg-sw disp" />他店応援</span>
              <span className="sg-lg"><span className="sg-lg-sw help" />応援受入(HELP)</span>
              <span className="sg-lg"><span className="sg-lg-sw sel" />選択日</span>
              <span className="sg-lg sat">土</span>
              <span className="sg-lg sun">日</span>
            </div>
          </div>

          {/* 編集履歴 */}
          <HistoryPanel history={history} onClear={clearHistory} />
        </main>
      </div>
      {toast && <div className="toast" onClick={() => setToast("")}>{toast}</div>}
    </div>
  );
};

window.StoresPage = StoresPage;
