// モバイル版 ─ クレーム・事故品（一覧・入力・編集・進捗コメント）
// PC版と同じ useClaimData() を流用 → 全端末・全データ共有

const M_CLAIM_FILTERS = [
  { id: "all", label: "すべて" }, { id: "unresolved", label: "未解決" },
  { id: "受付", label: "受付" }, { id: "対応中", label: "対応中" },
  { id: "解決", label: "解決" }, { id: "弁償", label: "弁償" },
];

// ── 入力/編集 ボトムシート ───────────────────────────
const MClaimSheet = ({ initial, onClose, onSave, onDelete }) => {
  const isNew = !initial;
  const [f, setF] = React.useState(() => initial ? { ...initial, files: initial.files || [] } : {
    id: Date.now(), ts: Date.now(), occurredOn: window.cToday, receivedOn: window.cToday,
    store: "", type: "クレーム", customer: "", memberNo: "", maker: "", makerContact: "",
    item: "", detail: "", status: "受付", amount: 0, staff: "", files: [], comments: [],
  });
  const [pending, setPending] = React.useState(initial ? (initial.files || []) : []);
  const [cmtText, setCmtText] = React.useState("");
  const [cmtWho, setCmtWho] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [confirmMissing, setConfirmMissing] = React.useState(null); // 未入力項目名の配列 | null
  const fileRef = React.useRef(null);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const addFiles = async (list) => {
    const arr = Array.from(list || []);
    for (const file of arr) { const r = await window.readClaimFile(file); setPending((p) => [...p, r]); }
  };
  const onDrop = (e) => { e.preventDefault(); if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files); };

  // 入力確認の対象項目（未入力でも投稿は許可するが、確認ポップアップを出す）
  const MC_CHECK_FIELDS = [
    ["store", "店舗（発生拠点）"], ["customer", "顧客名"], ["memberNo", "会員番号"],
    ["maker", "メーカー"], ["item", "品目"], ["detail", "内容・状況"], ["staff", "担当者"],
  ];
  const missingFields = () => MC_CHECK_FIELDS.filter(([k]) => !String(f[k] == null ? "" : f[k]).trim()).map(([, l]) => l);

  const doSave = async () => {
    setBusy(true);
    const claim = { ...f, files: pending };
    await onSave(claim, isNew);
    setBusy(false);
    onClose();
  };
  const save = () => {
    const miss = missingFields();
    if (miss.length) { setConfirmMissing(miss); return; }  // 未入力あり → 確認ポップアップ
    doSave();
  };

  const TYPES = window.CLAIM_TYPES || [];
  const STATUS = window.CLAIM_STATUS || [];
  const STORES = window.CLAIM_STORES || [];
  const comments = Array.isArray(f.comments) ? f.comments : [];

  const addProgress = () => {
    if (!cmtText.trim()) return;
    const note = { ts: Date.now(), who: cmtWho.trim(), text: cmtText.trim(), status: f.status };
    setF((p) => ({ ...p, comments: [...(p.comments || []), note] }));
    setCmtText("");
  };

  return (
    <div className="m-sheet-backdrop" onClick={onClose}>
      <div className="m-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="m-sheet-grab"></div>
        <div className="m-sheet-head">
          <span className="m-sheet-title">{isNew ? "新規登録" : "編集"}</span>
          <button className="m-sheet-close" onClick={onClose}>×</button>
        </div>
        <div className="m-sheet-body">
          <div className="m-field-row">
            <div className="m-field"><label className="m-label">発生日</label><input className="m-input" type="date" value={f.occurredOn} onChange={(e) => set("occurredOn", e.target.value)} /></div>
            <div className="m-field"><label className="m-label">受付日</label><input className="m-input" type="date" value={f.receivedOn} onChange={(e) => set("receivedOn", e.target.value)} /></div>
          </div>
          <div className="m-field">
            <label className="m-label">店舗（発生拠点）</label>
            <select className="m-select" value={f.store} onChange={(e) => set("store", e.target.value)}>
              <option value="">選択してください</option>
              {STORES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="m-field">
            <label className="m-label">種別</label>
            <div className="m-seg">
              {TYPES.map((t) => <button key={t.id} className={`m-seg-opt ${f.type === t.id ? "active" : ""}`} style={f.type === t.id ? { background: t.color } : null} onClick={() => set("type", t.id)}>{t.id}</button>)}
            </div>
          </div>
          <div className="m-field-row">
            <div className="m-field"><label className="m-label">顧客名</label><input className="m-input" value={f.customer} onChange={(e) => set("customer", e.target.value)} placeholder="例：佐々木 様" /></div>
            <div className="m-field"><label className="m-label">会員番号</label><input className="m-input" value={f.memberNo} onChange={(e) => set("memberNo", e.target.value)} placeholder="M-100482" /></div>
          </div>
          <div className="m-field-row">
            <div className="m-field"><label className="m-label">メーカー</label><input className="m-input" value={f.maker} onChange={(e) => set("maker", e.target.value)} placeholder="例：バーバリー" /></div>
            <div className="m-field"><label className="m-label">メーカー連絡先</label><input className="m-input" value={f.makerContact} onChange={(e) => set("makerContact", e.target.value)} placeholder="電話・メール" /></div>
          </div>
          <div className="m-field"><label className="m-label">品目</label><input className="m-input" value={f.item} onChange={(e) => set("item", e.target.value)} placeholder="例：ウールコート（ベージュ）" /></div>
          <div className="m-field"><label className="m-label">内容・状況</label><textarea className="m-textarea" value={f.detail} onChange={(e) => set("detail", e.target.value)} placeholder="状況の詳細を記入…" /></div>
          <div className="m-field">
            <label className="m-label">対応状況</label>
            <div className="m-seg">
              {STATUS.map((s) => <button key={s.id} className={`m-seg-opt ${f.status === s.id ? "active" : ""}`} style={f.status === s.id ? { background: s.color } : null} onClick={() => set("status", s.id)}>{s.id}</button>)}
            </div>
          </div>
          <div className="m-field-row">
            <div className="m-field"><label className="m-label">弁償・返金額</label><input className="m-input" type="number" inputMode="numeric" value={f.amount} onChange={(e) => set("amount", Number(e.target.value) || 0)} /></div>
            <div className="m-field"><label className="m-label">担当者</label><input className="m-input" value={f.staff} onChange={(e) => set("staff", e.target.value)} placeholder="例：鈴木" /></div>
          </div>

          {/* 写真添付 */}
          <div className="m-field">
            <label className="m-label">写真（事故品の画像）</label>
            <div className="m-drop" onClick={() => fileRef.current && fileRef.current.click()} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
              📷 タップで写真を選択 ／ ドラッグ＆ドロップ
              <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple style={{ display: "none" }} onChange={(e) => addFiles(e.target.files)} />
            </div>
            {pending.length > 0 && (
              <div className="m-pend">
                {pending.map((p, i) => (
                  <div key={i} className="m-pend-item">
                    {p.isImg && (p.url || p.thumb) ? <img src={p.url || p.thumb} alt="" referrerPolicy="no-referrer" /> : <div className="m-pend-file">{window.fileExtC(p.name) || "FILE"}</div>}
                    <button className="m-pend-x" onClick={() => setPending((arr) => arr.filter((_, j) => j !== i))}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 進捗コメント */}
          <div className="m-field">
            <label className="m-label">進捗コメント</label>
            {comments.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 9 }}>
                {comments.map((c, i) => {
                  const sc = (window.CLAIM_STATUS_BY && window.CLAIM_STATUS_BY[c.status]) || null;
                  return (
                    <div key={i} className="m-thx-cmt">
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        {sc && <span className="m-claim-badge" style={{ background: sc.bg, color: sc.color, fontSize: 10 }}>{c.status}</span>}
                        <b>{c.who || "担当"}</b><span style={{ color: "var(--ink-mute)", fontSize: 11 }}>{window.relTimeC(c.ts)}</span>
                      </div>
                      {c.text}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="m-field-row" style={{ gap: 7 }}>
              <input className="m-input" style={{ flex: "0 0 90px", fontSize: 14 }} placeholder="担当" value={cmtWho} onChange={(e) => setCmtWho(e.target.value)} />
              <input className="m-input" style={{ fontSize: 14 }} placeholder="進捗を追記（状況も反映）" value={cmtText} onChange={(e) => setCmtText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addProgress(); }} />
            </div>
            <button className="m-btn m-btn-ghost" style={{ marginTop: 8, padding: 10 }} onClick={addProgress} disabled={!cmtText.trim()}>＋ 進捗を追加（現在の状況「{f.status}」）</button>
          </div>

          {!isNew && <button className="m-btn m-btn-ghost" style={{ width: "100%", color: "#c5221f", marginTop: 4 }} onClick={() => { if (confirm("この案件を削除しますか？")) { onDelete(f.id); onClose(); } }}>削除する</button>}
        </div>
        <div className="m-sheet-foot">
          <button className="m-btn m-btn-ghost" onClick={onClose}>キャンセル</button>
          <button className="m-btn m-btn-primary" onClick={save} disabled={busy}>{busy ? "保存中…" : (isNew ? "登録する" : "保存する")}</button>
        </div>

        {confirmMissing && (
          <div className="m-confirm-backdrop" onClick={() => setConfirmMissing(null)}>
            <div className="m-confirm" onClick={(e) => e.stopPropagation()}>
              <div className="m-confirm-title">下記項目は未入力のまま<br />投稿してよろしいですか？</div>
              <ul className="m-confirm-list">
                {confirmMissing.map((m) => <li key={m}>{m}</li>)}
              </ul>
              <div className="m-confirm-actions">
                <button className="m-btn m-btn-ghost" onClick={() => setConfirmMissing(null)}>戻って入力する</button>
                <button className="m-btn m-btn-primary" disabled={busy} onClick={() => { setConfirmMissing(null); doSave(); }}>{busy ? "保存中…" : "このまま投稿する"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── クレーム カード ─────────────────────────────────
const MClaimCard = ({ claim, onEdit, onOpenImg }) => {
  const t = (window.CLAIM_TYPE_BY && window.CLAIM_TYPE_BY[claim.type]) || { color: "#5f6368", bg: "#eef0f2" };
  const s = (window.CLAIM_STATUS_BY && window.CLAIM_STATUS_BY[claim.status]) || { color: "#1a73e8", bg: "#e3f0fd" };
  const imgs = (claim.files || []).filter((f) => f.isImg && (f.thumb || f.url));
  return (
    <div className="m-claim">
      <div className="m-claim-top">
        <span className="m-claim-badge" style={{ background: t.bg, color: t.color }}>{claim.type}</span>
        <span className="m-claim-badge" style={{ background: s.bg, color: s.color }}>{claim.status}</span>
        {claim.amount > 0 && <span className="m-claim-badge" style={{ background: "#f3e8fd", color: "#8430ce" }}>弁償 {window.yenC(claim.amount)}</span>}
        <span className="m-claim-date">{claim.receivedOn ? claim.receivedOn.replaceAll("-", "/") : ""}</span>
      </div>
      <div className="m-claim-item">{claim.item || "（品目未記入）"}</div>
      <div className="m-claim-cust">{claim.store}{claim.customer ? ` ・ ${claim.customer}` : ""}{claim.memberNo ? ` ・ 会員No. ${claim.memberNo}` : ""}</div>
      {(claim.maker || claim.makerContact) && <div className="m-claim-cust">メーカー: {claim.maker || "—"}{claim.makerContact ? `（${claim.makerContact}）` : ""}</div>}
      {claim.detail && <div className="m-claim-detail">{claim.detail}</div>}
      {imgs.length > 0 && (
        <div className="m-claim-thumbs">
          {imgs.slice(0, 4).map((f, i) => <div key={i} className="m-claim-thumb" onClick={() => onOpenImg({ url: f.open || f.thumb || f.url, name: f.name })}><img src={f.thumb || f.url} alt="" referrerPolicy="no-referrer" /></div>)}
        </div>
      )}
      <div className="m-claim-foot">
        <span className="m-claim-staff">{claim.staff ? `担当: ${claim.staff}` : ""}{(claim.comments || []).length ? ` ・ 進捗${claim.comments.length}件` : ""}</span>
        <button className="m-claim-edit" onClick={() => onEdit(claim)}>詳細・編集</button>
      </div>
    </div>
  );
};

// ── クレーム タブ本体 ───────────────────────────────
const MClaims = ({ registerFab, registerHeader }) => {
  const { claims, upsert, remove, cloudOn, cloudState, pull, uploadWarn, clearUploadWarn, saveStatus } = window.useClaimData();
  const [filter, setFilter] = React.useState("all");
  const [editing, setEditing] = React.useState(null); // claim | "new" | null
  const [lightbox, setLightbox] = React.useState(null);
  const [importing, setImporting] = React.useState(false);
  const [importMsg, setImportMsg] = React.useState(null);

  const importFromForm = async () => {
    if (!cloudOn || importing) return;
    setImporting(true); setImportMsg(null);
    try {
      const res = (typeof cloudImportClaimForm === "function") ? await cloudImportClaimForm() : { ok: false, message: "未設定" };
      if (res && res.ok) { await pull(); setImportMsg({ ok: true, text: res.imported > 0 ? `${res.imported}件を取り込みました` : "新しい回答はありません" }); }
      else setImportMsg({ ok: false, text: (res && res.message) || "取込に失敗しました" });
    } catch (e) { setImportMsg({ ok: false, text: String((e && e.message) || e) }); }
    finally { setImporting(false); setTimeout(() => setImportMsg(null), 6000); }
  };

  React.useEffect(() => {
    registerHeader && registerHeader({ title: "クレーム・事故品", sub: cloudOn ? (cloudState === "ok" ? "☁ 全店で共有中" : cloudState === "loading" ? "☁ 接続中…" : "☁ 端末内表示") : "" });
    registerFab && registerFab(() => setEditing("new"));
    return () => { registerFab && registerFab(null); };
  }, [cloudState]);

  const filtered = claims.filter((c) => filter === "all" ? true : filter === "unresolved" ? ["受付", "対応中"].includes(c.status) : c.status === filter);
  const sorted = [...filtered].sort((a, b) => (b.receivedOn || "").localeCompare(a.receivedOn || "") || (b.ts || 0) - (a.ts || 0));

  return (
    <div>
      {saveStatus && (
        <div className="m-save-overlay">
          <div className="m-save-card">
            <div className="m-save-spinner"></div>
            <div className="m-save-text">
              {saveStatus.phase === "uploading"
                ? (saveStatus.total > 0 ? `写真をアップロード中… ${saveStatus.done}/${saveStatus.total}枚` : "写真をアップロード中…")
                : "保存中…"}
            </div>
            <div className="m-save-sub">全店に共有しています。そのままお待ちください</div>
          </div>
        </div>
      )}
      <div className="m-chips">
        {M_CLAIM_FILTERS.map((f) => {
          const n = f.id === "all" ? claims.length : f.id === "unresolved" ? claims.filter((c) => ["受付", "対応中"].includes(c.status)).length : claims.filter((c) => c.status === f.id).length;
          return <button key={f.id} className={`m-chip ${filter === f.id ? "active" : ""}`} onClick={() => setFilter(f.id)}>{f.label} {n}</button>;
        })}
      </div>
      {cloudOn && (
        <button className="m-import-btn" onClick={importFromForm} disabled={importing}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={importing ? { animation: "spin 1s linear infinite" } : null}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          {importing ? "取込中…" : "フォームから取込"}
        </button>
      )}
      {importMsg && (
        <div className="m-import-msg" style={{ color: importMsg.ok ? "#1e7a36" : "#b5271b", background: importMsg.ok ? "#e6f4ea" : "#fde2e2" }}>
          {importMsg.ok ? "✓ " : "⚠ "}{importMsg.text}
        </div>
      )}
      {uploadWarn && (
        <div className="m-upload-warn">
          <span>⚠️</span>
          <div>
            <b>写真をクラウドに保存できませんでした</b>
            <span>{/権限|permission|authoriz/i.test(uploadWarn)
              ? "共有APIにGoogleドライブの権限が未許可です。管理者にApps Scriptの再認証・再デプロイを依頼してください。"
              : uploadWarn}</span>
          </div>
          <button onClick={clearUploadWarn} aria-label="閉じる">×</button>
        </div>
      )}
      {sorted.length === 0 ? <div className="m-empty" style={{ marginTop: 30 }}>該当する案件はありません</div> : sorted.map((c) => <MClaimCard key={c.id} claim={c} onEdit={setEditing} onOpenImg={setLightbox} />)}
      <div style={{ height: 12 }}></div>

      {editing && <MClaimSheet initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSave={upsert} onDelete={remove} />}
      {lightbox && (
        <div className="m-lb" onClick={() => setLightbox(null)}>
          <button className="m-lb-x" onClick={() => setLightbox(null)}>×</button>
          <img src={lightbox.url} alt={lightbox.name} referrerPolicy="no-referrer" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};

window.MClaims = MClaims;
