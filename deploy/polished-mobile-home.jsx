// モバイル版 ─ ホーム（ダッシュボード要点サマリー・クラウド同期）

const mLS = (key, fb) => {
  try { const s = localStorage.getItem(key); if (s) { const v = JSON.parse(s); if (Array.isArray(v) ? v.length : v != null) return v; } } catch {}
  return fb;
};
// フォーム連携GAS（クラウドとは別）— ホーム起動時にありがとう・シミ抜きも更新
const MH_ARIGATOU_GAS = "https://script.google.com/macros/s/AKfycbxCHJ4OB8uYtdEflKyld4h3oitjW2Tr80UihXnVTd_jyUREAWz0qF5ebGzJpUhq2eQh/exec";
const MH_STAIN_GAS = "https://script.google.com/macros/s/AKfycbzkNu60eKOiHaBzWEH_5vRsVeErqrPhtkmhYSPNSdR7iZgiE3zIIFJAMQdU-E7cTo-7/exec";
const mYmd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const mParse = (s) => { const d = new Date(s); return isNaN(d) ? null : d; };
const mRel = (ts) => {
  if (!ts) return "";
  const d = typeof ts === "number" ? new Date(ts) : mParse(ts); if (!d) return "";
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (m < 1) return "たった今"; if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}時間前`;
  const dd = Math.floor(h / 24); if (dd < 7) return `${dd}日前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
};
const M_DOW = ["日", "月", "火", "水", "木", "金", "土"];
const M_WMO = (c) => c === 0 ? ["☀️", "快晴"] : c <= 2 ? ["🌤️", "晴れ"] : c === 3 ? ["☁️", "くもり"]
  : c <= 48 ? ["🌫️", "霧"] : c <= 67 ? ["🌧️", "雨"] : c <= 77 ? ["🌨️", "雪"] : c <= 82 ? ["🌧️", "にわか雨"] : c <= 99 ? ["⛈️", "雷雨"] : ["🌡️", "—"];

const M_BOARD_BADGE = {
  "重要": { c: "#c5221f", b: "#fde2e2" }, "販促": { c: "#9a6700", b: "#feefc3" },
  "クレーム/事故品": { c: "#be3a82", b: "#fde2ef" }, "トラブル": { c: "#8430ce", b: "#f3e8fd" },
  "提案": { c: "#1e8e3e", b: "#e6f4ea" }, "その他共有": { c: "#5f6368", b: "#eef0f2" },
};
const mAvatarHue = (s) => { let h = 0; for (let i = 0; i < (s || "").length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; };
const mDriveThumb = (id, w) => `https://lh3.googleusercontent.com/d/${id}=w${w || 600}`;
const mBoardImg = (files) => {
  for (const f of (files || [])) {
    if (!f.isImg) continue;
    if (f.thumb) return f.thumb;
    if (f.url) return f.url;
    if (f.fileId) return mDriveThumb(f.fileId, 600);
  }
  return null;
};

// クラウド共有リスト（cloudが正、無ければlocalStorage/サンプル）
const useCloudList = (sheet, lsKey, fallback) => {
  const [rows, setRows] = React.useState(() => mLS(lsKey, fallback));
  const on = typeof cloudEnabled === "function" && cloudEnabled();
  const [loading, setLoading] = React.useState(on);
  React.useEffect(() => {
    let c = false;
    if (on) {
      cloudGet(sheet).then((r) => {
        if (c || !Array.isArray(r)) return;
        if (r.length) {
          // files が文字列なら配列に戻す
          const norm = r.map((x) => {
            if (typeof x.files === "string") { try { return { ...x, files: JSON.parse(x.files) }; } catch { return { ...x, files: [] }; } }
            return x;
          });
          setRows(norm);
          try { localStorage.setItem(lsKey, JSON.stringify(norm)); } catch {}
        }
      }).catch(() => {}).finally(() => { if (!c) setLoading(false); });
    }
    return () => { c = true; };
  }, []);
  return [rows, loading];
};

// ── ヒーロー（時計＋天気）─────────────────────────────
const MHero = () => {
  const [now, setNow] = React.useState(() => new Date());
  const [wx, setWx] = React.useState(null);
  React.useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  React.useEffect(() => {
    let c = false;
    const url = "https://api.open-meteo.com/v1/forecast?latitude=35.825&longitude=139.805&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FTokyo&forecast_days=1";
    fetch(url).then((r) => r.json()).then((d) => { if (!c && d.current) setWx({ temp: Math.round(d.current.temperature_2m), code: d.current.weather_code, hi: Math.round(d.daily.temperature_2m_max[0]), lo: Math.round(d.daily.temperature_2m_min[0]) }); }).catch(() => {});
    return () => { c = true; };
  }, []);
  const w = wx ? M_WMO(wx.code) : null;
  const p2 = (n) => String(n).padStart(2, "0");
  return (
    <div className="m-hero">
      <div className="m-hero-date">{now.getFullYear()}年{now.getMonth() + 1}月{now.getDate()}日（{M_DOW[now.getDay()]}）</div>
      <div className="m-hero-clock">{p2(now.getHours())}:{p2(now.getMinutes())}<span className="sec">:{p2(now.getSeconds())}</span></div>
      <div className="m-hero-wx">
        {w ? <><span className="t">{w[0]}</span><span>{wx.temp}° ・ {w[1]}</span><span style={{ opacity: 0.8 }}>↑{wx.hi}° ↓{wx.lo}°</span><span style={{ opacity: 0.75 }}>草加市</span></>
           : <span style={{ opacity: 0.85 }}>天気を取得中…</span>}
      </div>
    </div>
  );
};

const MStat = ({ cap, icon, val, unit, foot, tone, onClick }) => (
  <a className="m-stat" onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }}>
    <div className="m-stat-cap">{icon && <span>{icon}</span>}{cap}</div>
    <div className="m-stat-val">{val}{unit && <span className="u">{unit}</span>}</div>
    {foot && <div className={`m-stat-foot ${tone ? "m-stat-" + tone : ""}`}>{foot}</div>}
  </a>
);

// 期限判定（車両）
const mDaysUntil = (s) => { const d = mParse(s); if (!d) return null; const t = new Date(mYmd(new Date()) + "T00:00:00"); return Math.round((new Date(mYmd(d) + "T00:00:00") - t) / 864e5); };
const mDueStatus = (days, warn) => {
  if (days == null) return null;
  if (days < 0) return { cls: "overdue", label: `${-days}日超過` };
  if (days === 0) return { cls: "overdue", label: "本日" };
  if (days <= 14) return { cls: "urgent", label: `あと${days}日` };
  if (days <= warn) return { cls: "warn", label: `あと${days}日` };
  return null;
};
const M_OIL_KM = 6000, M_OIL_MONTHS = 7, M_TIRE_MONTHS = 2;
const mAddMonths = (iso, m) => { if (!iso) return null; const d = new Date(iso + "T00:00:00"); d.setMonth(d.getMonth() + m); return mYmd(d); };
const mOilStatus = (v) => {
  const lastOdo = Number(v.oilLastOdo) || 0;
  const remKm = lastOdo > 0 ? M_OIL_KM - ((Number(v.odometer) || 0) - lastOdo) : null;
  const nd = mAddMonths(v.oilLastDate, M_OIL_MONTHS); const remDays = nd ? mDaysUntil(nd) : null;
  if (remKm == null && remDays == null) return null;
  const lbl = remKm != null ? `残${Math.max(0, remKm)}km` : `あと${remDays}日`;
  if ((remKm != null && remKm <= 0) || (remDays != null && remDays <= 0)) return { cls: "overdue", label: "交換時期" };
  if ((remKm != null && remKm <= 800) || (remDays != null && remDays <= 14)) return { cls: "urgent", label: lbl };
  if ((remKm != null && remKm <= 1500) || (remDays != null && remDays <= 30)) return { cls: "warn", label: lbl };
  return null;
};
const mTireStatus = (v) => {
  const nd = mAddMonths(v.tireLastDate, M_TIRE_MONTHS); const days = nd ? mDaysUntil(nd) : null;
  if (days == null) return null;
  if (days <= 0) return { cls: "overdue", label: days === 0 ? "本日" : `${-days}日超過` };
  if (days <= 7) return { cls: "urgent", label: `あと${days}日` };
  if (days <= 14) return { cls: "warn", label: `あと${days}日` };
  return null;
};
const M_VEH_RANK = { overdue: 0, urgent: 1, warn: 2 };
const M_SAMPLE_VEH = [
  { name: "川口 480 な 78-90", odometer: 38900, inspectionDue: "2026-06-08", insuranceDue: "2026-12-01", oilLastDate: "2026-05-12", oilLastOdo: 38000, tireLastDate: "2026-06-01" },
  { name: "草加 800 あ 12-34", odometer: 84200, inspectionDue: "2026-06-20", insuranceDue: "2026-09-01", oilLastDate: "2025-12-15", oilLastOdo: 78500, tireLastDate: "2026-03-25" },
];
const M_SAMPLE_FACTORY = [{ factory: "八潮ドライ", date: "2026-05-30", normalLot: 420, extraLot: 60, advance: 30, storage: 20, hours: 38 }];
const M_SAMPLE_STAIN = [{ date: "2026-05-30", processed: 14, failed: 1 }];

// 現在の出勤（コンパクト）
const MShiftMini = ({ go }) => {
  const SHIFT = (typeof window !== "undefined" && window.SHIFT_2026_06) || null;
  const now = new Date();
  if (!SHIFT) return null;
  const dset = new Set();
  SHIFT.stores.forEach((s) => (s.staff || []).forEach((st) => Object.keys(st.cells || {}).forEach((d) => { if (st.cells[d] && st.cells[d].time) dset.add(d); })));
  const dates = [...dset].sort();
  const todayISO = mYmd(now);
  const tomorrowMode = now.getHours() >= 20;
  let eff;
  if (tomorrowMode) { const tISO = mYmd(new Date(now.getTime() + 864e5)); eff = dates.find((d) => d >= tISO) || dates[dates.length - 1]; }
  else { eff = dset.has(todayISO) ? todayISO : (dates.filter((d) => d <= todayISO).pop() || dates[0]); }
  const nowH = now.getHours() + now.getMinutes() / 60;
  const refH = Math.min(18.99, Math.max(9, nowH));
  const filterNow = !tomorrowMode;
  const groups = SHIFT.stores.map((s) => {
    const arr = [];
    (s.staff || []).forEach((st) => { const c = st.cells && st.cells[eff]; if (c && c.time && (!filterNow || (c.time.s <= refH && refH < c.time.e))) arr.push({ name: st.name, time: c.time }); });
    ((s.help && s.help[eff]) || []).forEach((h) => { if (h && h.time && (!filterNow || (h.time.s <= refH && refH < h.time.e))) arr.push({ name: h.name, time: h.time, help: true }); });
    return { store: s.store, people: arr };
  }).filter((g) => g.people.length);
  const total = groups.reduce((a, b) => a + b.people.length, 0);
  const effD = new Date(eff + "T00:00:00");
  const dateLbl = `${effD.getMonth() + 1}/${effD.getDate()}（${M_DOW[effD.getDay()]}）`;
  return (
    <div className="m-card">
      <div className="m-card-head"><span className="m-card-title">🧑‍💼 {tomorrowMode ? "翌日の出勤予定" : "現在の出勤スタッフ"}</span><span className="m-card-sub">{tomorrowMode ? dateLbl : `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}時点`} ・ {total}名</span><a className="m-card-link" onClick={() => go("shift")} style={{ cursor: "pointer" }}>詳細 ›</a></div>
      <div className="m-card-body" style={{ paddingTop: 8 }}>
        {groups.length === 0 ? <div className="m-empty">{tomorrowMode ? "翌日の出勤予定はありません" : "現在出勤中のスタッフはいません"}</div> : (
          <div className="m-shift-strip">
            {groups.map((g) => (
              <div key={g.store} className="m-shift-pill">
                <div className="m-shift-pill-head"><StoreTag name={g.store} /><span className="n">{g.people.length}</span></div>
                {g.people.slice(0, 4).map((p, i) => <div key={i} className="m-shift-person"><b>{p.name}</b>{p.help && <span className="m-shift-help">応援</span>}<span className="t">{p.time.text}</span></div>)}
                {g.people.length > 4 && <div className="m-shift-person" style={{ color: "var(--ink-mute)" }}>＋{g.people.length - 4}名</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── ホーム本体 ───────────────────────────────────────
const MHome = ({ go }) => {
  const [claims, ldClaims] = useCloudList("クレーム", "miwa.claim.v1", []);
  const [vehicles, ldVeh] = useCloudList("車両", "miwa.vehicle.v1", M_SAMPLE_VEH);
  const [board, ldBoard] = useCloudList("共有事項", "miwa.board.v1", []);
  const refreshing = ldClaims || ldVeh || ldBoard;

  // ありがとう・シミ抜き（フォーム連携GAS）も起動時に更新 → 取得後に再描画
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    let c = false;
    const gsUrl = (k, fb) => { try { const s = JSON.parse(localStorage.getItem(k)); if (s && s.url) return s.url; } catch {} return fb; };
    Promise.all([
      fetch(gsUrl("miwa.arigatou.settings.v1", MH_ARIGATOU_GAS), { redirect: "follow" }).then((r) => r.json())
        .then((d) => { if (Array.isArray(d)) { try { localStorage.setItem("miwa.arigatou.v1", JSON.stringify(d)); } catch {} } }).catch(() => {}),
      fetch(gsUrl("miwa.stain.settings.v1", MH_STAIN_GAS), { redirect: "follow" }).then((r) => r.json())
        .then((d) => { if (Array.isArray(d)) { const f = d.filter((r) => (Number(r.processed) || 0) > 0 && (Number(r.amount) || 0) > 0); try { localStorage.setItem("miwa.stain.v1", JSON.stringify(f)); } catch {} } }).catch(() => {}),
    ]).then(() => { if (!c) setTick((t) => t + 1); });
    return () => { c = true; };
  }, []);

  // 共有ボードの確認済み（既読）管理：本日分は全表示、翌日以降は未確認のみ残す
  const [boardSeen, setBoardSeen] = React.useState(() => mLS("miwa.board.seen.v1", []));
  const confirmBoard = (id) => setBoardSeen((prev) => {
    const next = prev.includes(id) ? prev : [...prev, id];
    try { localStorage.setItem("miwa.board.seen.v1", JSON.stringify(next)); } catch {}
    return next;
  });
  const todayISO = mYmd(new Date());
  const boardId = (p) => String(p.id != null ? p.id : p.ts);
  const boardDate = (p) => { const t = Number(p.ts) || (p.ts ? Date.parse(p.ts) : 0); return t ? mYmd(new Date(t)) : todayISO; };

  const unresolved = claims.filter((c) => ["受付", "対応中"].includes(c.status));
  const vehAlerts = [];
  vehicles.forEach((v) => {
    [{ key: "inspectionDue", label: "車検", warn: 60 }, { key: "insuranceDue", label: "保険", warn: 30 }].forEach((it) => {
      const st = mDueStatus(mDaysUntil(v[it.key]), it.warn);
      if (st) vehAlerts.push({ vehicle: v.name, item: it.label, sortDays: mDaysUntil(v[it.key]) || 0, ...st });
    });
    const oil = mOilStatus(v); if (oil) vehAlerts.push({ vehicle: v.name, item: "オイル", sortDays: 0, ...oil });
    const tire = mTireStatus(v); if (tire) vehAlerts.push({ vehicle: v.name, item: "空気圧", sortDays: 0, ...tire });
  });
  vehAlerts.sort((a, b) => (M_VEH_RANK[a.cls] - M_VEH_RANK[b.cls]) || ((a.sortDays || 0) - (b.sortDays || 0)));

  const fb = mLS("miwa.feedback.v3", []);
  const monthPrefix = mYmd(new Date()).slice(0, 7);
  const fbMonth = fb.filter((r) => (r.reportDate || "").startsWith(monthPrefix)).length;
  const thanks = mLS("miwa.arigatou.v1", []);
  const thxWeek = thanks.filter((d) => { try { return (Date.now() - new Date(d.date).getTime()) / 864e5 <= 7; } catch { return false; } }).length;

  // 工場生産性（最新日・点/h）
  const fac = mLS("miwa.factory.v3", M_SAMPLE_FACTORY);
  const facLatest = [...fac].sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
  const facProd = facLatest && facLatest.hours > 0 ? ((facLatest.normalLot || 0) + (facLatest.extraLot || 0) + (facLatest.advance || 0) + (facLatest.storage || 0)) / facLatest.hours : 0;
  // シミ抜き除去率（直近30日）
  const stain = mLS("miwa.stain.v1", M_SAMPLE_STAIN);
  const since = mYmd(new Date(Date.now() - 30 * 864e5));
  const stRecent = stain.filter((r) => (r.date || "") >= since);
  const stProc = stRecent.reduce((s, r) => s + (Number(r.processed) || 0), 0);
  // PC版ダッシュボードと同じ算出：除去成功数 = removalRate(率)×処理数。
  // removalRate が無いデータは (処理数 - failed) で代替。
  const stRemoved = stRecent.reduce((s, r) => {
    const p = Number(r.processed) || 0;
    if (r.removalRate != null && r.removalRate !== "") return s + (Number(r.removalRate) || 0) * p;
    return s + Math.max(0, p - (Number(r.failed) || 0));
  }, 0);
  const stRate = stProc > 0 ? (stRemoved / stProc * 100) : null;

  // 表示する共有ボード：本日分は全件、過去分は未確認のみ（新しい順）
  const visibleBoard = [...board]
    .sort((a, b) => (Number(b.ts) || 0) - (Number(a.ts) || 0))
    .filter((p) => boardDate(p) === todayISO || !boardSeen.includes(boardId(p)));
  const ctSorted = [...unresolved].sort((a, b) => (b.receivedOn || "").localeCompare(a.receivedOn || ""));

  return (
    <div>
      <MHero />
      {refreshing && (
        <div className="m-refresh"><span className="m-spinner sm"></span>最新の情報に更新中…</div>
      )}
      <div style={{ height: 14 }}></div>

      <div className="m-stat-grid">
        <MStat cap="未解決クレーム" icon="⚠️" val={unresolved.length} unit="件" foot={unresolved.length ? "要対応" : "なし"} tone={unresolved.length ? "danger" : "accent"} onClick={() => go("claims")} />
        <MStat cap="車両の期限" icon="🚚" val={vehAlerts.length} unit="件" foot={vehAlerts.length ? "確認が必要" : "余裕あり"} tone={vehAlerts.length ? "warn" : "accent"} onClick={() => location.href = encodeURIComponent("車両管理.html") + "?view=pc"} />
        <MStat cap="今月フィードバック" icon="💬" val={fbMonth} unit="件" foot={`累計 ${fb.length} 件`} onClick={() => location.href = encodeURIComponent("フィードバック.html") + "?view=pc"} />
        <MStat cap="今週のありがとう" icon="🙏" val={thxWeek} unit="件" foot="直近7日間" tone="accent" onClick={() => go("thanks")} />
        <MStat cap="工場生産性" icon="🏭" val={facProd ? facProd.toFixed(1) : "—"} unit="点/h" foot={facLatest ? `${(facLatest.date || "").slice(5).replace("-", "/")} 最新` : "—"} onClick={() => location.href = encodeURIComponent("工場報告.html") + "?view=pc"} />
        <MStat cap="シミ抜き除去率" icon="🧴" val={stRate != null ? stRate.toFixed(1) : "—"} unit="%" foot={`直近30日 ${stProc}件`} tone="accent" onClick={() => location.href = encodeURIComponent("シミ抜き報告.html") + "?view=pc"} />
      </div>

      {/* 共有ボード：本日分は全件＋過去の未確認 */}
      <div className="m-sec-title">📌 共有ボード<a className="m-card-link" onClick={() => location.href = encodeURIComponent("共有ボード.html") + "?view=pc"} style={{ marginLeft: "auto", cursor: "pointer" }}>すべて ›</a></div>
      <div className="m-card">
        <div className="m-card-body">
          {visibleBoard.length === 0 ? <div className="m-empty">新しい投稿はありません（すべて確認済み）</div> : visibleBoard.map((p) => {
            const who = p.who || "匿名";
            const hue = mAvatarHue(who);
            const badge = M_BOARD_BADGE[p.badge];
            const thumb = mBoardImg(p.files);
            const id = boardId(p);
            const seen = boardSeen.includes(id);
            const isToday = boardDate(p) === todayISO;
            return (
              <div key={id} className="m-board">
                <div className="m-board-av" style={{ background: `linear-gradient(135deg, oklch(0.66 0.13 ${hue}), oklch(0.55 0.15 ${(hue + 40) % 360}))` }}>{who.replace(/^[^/]*\/\s*/, "").trim()[0] || who[0]}</div>
                <div className="m-board-body">
                  <div className="m-board-head">
                    <span className="m-board-who">{who}</span>
                    {isToday && <span className="m-board-new">本日</span>}
                    {badge && <span className="m-board-badge" style={{ background: badge.b, color: badge.c }}>{p.badge}</span>}
                    <span className="m-board-time">{mRel(Number(p.ts) || p.ts)}</span>
                  </div>
                  {p.text && <div className="m-board-text">{p.text}</div>}
                  {thumb && <div className="m-board-thumb"><img src={thumb} alt="" referrerPolicy="no-referrer" /></div>}
                  <div className="m-board-foot">
                    {seen
                      ? <span className="m-board-seen">✓ 確認済み{isToday ? "（本日中は表示）" : ""}</span>
                      : <button className="m-board-confirm" onClick={() => confirmBoard(id)}>✓ 確認した</button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 出勤スタッフ */}
      <div className="m-sec-title">🧑‍💼 出勤スタッフ</div>
      <MShiftMini go={go} />

      {/* 要対応：クレーム */}
      <div className="m-sec-title">⚠️ 未解決のクレーム・事故品<a className="m-card-link" onClick={() => go("claims")} style={{ marginLeft: "auto", cursor: "pointer" }}>一覧 ›</a></div>
      <div className="m-card">
        <div className="m-card-body">
          {ctSorted.length === 0 ? <div className="m-empty">未解決の案件はありません 🎉</div> : ctSorted.slice(0, 4).map((c, i) => {
            const t = (window.CLAIM_TYPE_BY && window.CLAIM_TYPE_BY[c.type]) || { color: "#5f6368", bg: "#eef0f2" };
            const s = (window.CLAIM_STATUS_BY && window.CLAIM_STATUS_BY[c.status]) || { color: "#1a73e8", bg: "#e3f0fd" };
            return (
              <div key={i} className="m-row" onClick={() => go("claims")} style={{ cursor: "pointer" }}>
                <span className="m-row-pill" style={{ background: t.bg, color: t.color }}>{c.type}</span>
                <div className="m-row-main"><div className="m-row-title">{c.item || "（品目未記入）"}</div><div className="m-row-meta">{c.store} ・ {c.receivedOn ? c.receivedOn.replaceAll("-", "/") : ""}</div></div>
                <span className="m-row-pill" style={{ background: s.bg, color: s.color }}>{c.status}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 要対応：車両 */}
      <div className="m-sec-title">🚚 車両の期限が近い項目</div>
      <div className="m-card">
        <div className="m-card-body">
          {vehAlerts.length === 0 ? <div className="m-empty">直近で期限が近い項目はありません</div> : vehAlerts.slice(0, 4).map((a, i) => (
            <div key={i} className="m-row">
              <span className={`m-row-pill m-due-${a.cls}`}>{a.label}</span>
              <div className="m-row-main"><div className="m-row-title">{a.item} ・ {a.vehicle}</div></div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ height: 10 }}></div>
    </div>
  );
};

window.MHome = MHome;
