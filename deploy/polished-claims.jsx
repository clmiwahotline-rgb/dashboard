// クレーム・事故品 — UI（一覧 / フォーム / 進捗コメント）

// ── 添付サムネ・ファイル ────────────────────────────────
const ClaimThumbs = ({ files, onOpen }) => {
  const imgs = (files || []).filter((f) => f.isImg && f.thumb);
  const docs = (files || []).filter((f) => !(f.isImg && f.thumb));
  if (!imgs.length && !docs.length) return null;
  return (
    <div className="cl-attach">
      {imgs.map((f, i) => (
        <button key={i} className="cl-thumb" onClick={() => onOpen({ url: f.open || f.thumb, name: f.name })} title={f.name}>
          <img src={f.thumb} alt={f.name} loading="lazy" referrerPolicy="no-referrer" />
        </button>
      ))}
      {docs.map((f, i) => (
        f.href
          ? <a key={"d" + i} className="cl-file" href={f.href} {...(f.driveLink ? { target: "_blank", rel: "noopener" } : { download: f.name })}><span className="cl-file-ext">{fileExtC(f.name) || "?"}</span><span className="cl-file-name">{f.name}</span></a>
          : <div key={"d" + i} className="cl-file na"><span className="cl-file-ext">{fileExtC(f.name) || "?"}</span><span className="cl-file-name">{f.name} ・ 共有準備中</span></div>
      ))}
    </div>
  );
};

// ── 進捗コメントスレッド ────────────────────────────────
const ProgressThread = ({ claim, onAddComment }) => {
  const [open, setOpen] = React.useState(false);
  const [who, setWho] = React.useState("");
  const [text, setText] = React.useState("");
  const [status, setStatus] = React.useState(claim.status);
  const comments = Array.isArray(claim.comments) ? claim.comments : [];

  const submit = () => {
    if (!text.trim()) return;
    onAddComment(claim, { ts: Date.now(), who: who.trim() || "担当者", text: text.trim(), status });
    setText(""); setWho(""); setOpen(false);
  };

  return (
    <div className="cl-thread">
      <div className="cl-thread-head">
        <span className="cl-thread-title">進捗 ({comments.length})</span>
        <button className="cl-thread-add" onClick={() => setOpen(!open)}>{open ? "閉じる" : "＋ 進捗を追加"}</button>
      </div>
      {comments.length > 0 && (
        <div className="cl-timeline">
          {comments.slice().sort((a, b) => (a.ts || 0) - (b.ts || 0)).map((c, i) => {
            const st = CLAIM_STATUS_BY[c.status];
            return (
              <div key={i} className="cl-tl-item">
                <span className="cl-tl-dot" style={{ background: st ? st.color : "var(--ink-mute)" }}></span>
                <div className="cl-tl-body">
                  <div className="cl-tl-meta">
                    <span className="cl-tl-who">{c.who}</span>
                    {c.status && <span className="cl-status-mini" style={{ background: st ? st.bg : "var(--bg-2)", color: st ? st.color : "var(--ink-mute)" }}>{c.status}</span>}
                    <span className="cl-tl-time" title={fullTimeC(c.ts)}>{relTimeC(c.ts)}</span>
                  </div>
                  <div className="cl-tl-text">{c.text}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {open && (
        <div className="cl-comment-form">
          <div className="cl-cf-row">
            <input className="input" placeholder="担当者名" value={who} onChange={(e) => setWho(e.target.value)} style={{ width: 130, flexShrink: 0 }} />
            <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 120, flexShrink: 0 }}>
              {CLAIM_STATUS.map((s) => <option key={s.id} value={s.id}>{s.id}</option>)}
            </select>
            <input className="input" placeholder="進捗内容を入力…" value={text} onChange={(e) => setText(e.target.value)}
                   onKeyDown={(e) => { if (e.key === "Enter") submit(); }} style={{ flex: 1 }} />
            <button className="btn btn-primary" onClick={submit} style={{ flexShrink: 0 }}>追加</button>
          </div>
          <div className="cl-cf-hint">進捗を追加すると、選んだ対応状況に更新されます。</div>
        </div>
      )}
    </div>
  );
};

// ── ケースカード ────────────────────────────────────────
const ClaimCard = ({ claim, onEdit, onDelete, onAddComment, onOpenImg }) => {
  const t = CLAIM_TYPE_BY[claim.type] || CLAIM_TYPE_BY["その他"];
  const st = CLAIM_STATUS_BY[claim.status] || CLAIM_STATUS[0];
  const unresolved = isUnresolved(claim.status);
  return (
    <div className={`card cl-card ${unresolved ? "cl-unresolved" : ""}`}>
      <div className="cl-card-top">
        <span className="cl-type" style={{ background: t.bg, color: t.color }}>{claim.type}</span>
        <StoreTag name={claim.store} />
        <span className="cl-status" style={{ background: st.bg, color: st.color }}>
          {unresolved && <span className="cl-status-dot" style={{ background: st.color }}></span>}{claim.status}
        </span>
        <div className="cl-card-actions">
          <button className="cl-icon-btn" onClick={() => onEdit(claim)} title="編集">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button className="cl-icon-btn danger" onClick={() => onDelete(claim.id)} title="削除">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </div>
      </div>

      <div className="cl-card-body">
        <div className="cl-main">
          <div className="cl-item-row">
            <span className="cl-item">{claim.item || "（品目未記入）"}</span>
            {claim.amount > 0 && <span className="cl-amount">{yenC(claim.amount)}</span>}
          </div>
          <div className="cl-customer">{claim.customer}{claim.memberNo ? ` ・ 会員No. ${claim.memberNo}` : ""}</div>
          {(claim.maker || claim.makerContact) && (
            <div className="cl-maker">メーカー: {claim.maker || "—"}{claim.makerContact ? ` （${claim.makerContact}）` : ""}</div>
          )}
          <div className="cl-detail">{claim.detail}</div>
          <div className="cl-dates">
            <span>発生 {dateSlash(claim.occurredOn) || "—"}</span>
            <span>受付 {dateSlash(claim.receivedOn) || "—"}</span>
            {claim.staff && <span>担当 {claim.staff}</span>}
          </div>
          <ClaimThumbs files={claim.files} onOpen={onOpenImg} />
        </div>
      </div>

      <ProgressThread claim={claim} onAddComment={onAddComment} />
    </div>
  );
};

// ── 入力／編集フォーム（モーダル）──────────────────────
const ClaimFormModal = ({ initial, onSave, onClose }) => {
  const blank = {
    id: Date.now(), ts: Date.now(),
    occurredOn: cToday, receivedOn: cToday, store: CLAIM_STORES[0], type: "クレーム",
    customer: "", memberNo: "", maker: "", makerContact: "", item: "", detail: "", status: "受付", amount: 0, staff: "",
    files: [], comments: [],
  };
  const [f, setF] = React.useState(initial ? { ...initial } : blank);
  const [busy, setBusy] = React.useState(false);
  const [drag, setDrag] = React.useState(false);
  const [confirmMissing, setConfirmMissing] = React.useState(null); // 未入力項目名の配列 | null
  const fileRef = React.useRef(null);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const addFiles = async (list) => {
    const arr = Array.from(list || []); if (!arr.length) return;
    setBusy(true);
    const out = []; for (const x of arr) out.push(await readClaimFile(x));
    setF((p) => ({ ...p, files: [...(p.files || []), ...out] }));
    setBusy(false);
  };
  const removeFile = (i) => setF((p) => ({ ...p, files: p.files.filter((_, j) => j !== i) }));

  // 未入力でも投稿は許可するが、確認ポップアップを出す対象項目
  const CL_CHECK_FIELDS = [
    ["customer", "顧客名"], ["memberNo", "会員番号"], ["maker", "メーカー"],
    ["item", "品目"], ["detail", "内容・状況の詳細"], ["staff", "担当者"],
  ];
  const missingFields = () => CL_CHECK_FIELDS.filter(([k]) => !String(f[k] == null ? "" : f[k]).trim()).map(([, l]) => l);
  const save = () => {
    const miss = missingFields();
    if (miss.length) { setConfirmMissing(miss); return; }  // 未入力あり → 確認
    onSave(f, !initial);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal cl-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>{initial ? "クレーム・事故品の編集" : "クレーム・事故品の登録"}</h2>
            <div className="sub">全項目をあとから編集できます</div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="閉じる">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="field"><label className="field-label">発生日</label><input className="input" type="date" value={f.occurredOn} onChange={(e) => set("occurredOn", e.target.value)} /></div>
            <div className="field"><label className="field-label">受付日</label><input className="input" type="date" value={f.receivedOn} onChange={(e) => set("receivedOn", e.target.value)} /></div>
            <div className="field"><label className="field-label">店舗（発生拠点）</label>
              <select className="select" value={f.store} onChange={(e) => set("store", e.target.value)}>
                {CLAIM_STORES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="field"><label className="field-label">種別</label>
              <select className="select" value={f.type} onChange={(e) => set("type", e.target.value)}>
                {CLAIM_TYPES.map((t) => <option key={t.id} value={t.id}>{t.id}</option>)}
              </select>
            </div>
            <div className="field"><label className="field-label">顧客名</label><input className="input" placeholder="例：佐藤 様" value={f.customer} onChange={(e) => set("customer", e.target.value)} /></div>
            <div className="field"><label className="field-label">会員番号</label><input className="input" placeholder="例：M-100482" value={f.memberNo} onChange={(e) => set("memberNo", e.target.value)} /></div>
            <div className="field"><label className="field-label">メーカー</label><input className="input" placeholder="例：バーバリー" value={f.maker} onChange={(e) => set("maker", e.target.value)} /></div>
            <div className="field"><label className="field-label">メーカー連絡先</label><input className="input" placeholder="電話・メールなど" value={f.makerContact} onChange={(e) => set("makerContact", e.target.value)} /></div>
            <div className="field full"><label className="field-label">品目</label><input className="input" placeholder="例：ウールコート（ベージュ）" value={f.item} onChange={(e) => set("item", e.target.value)} /></div>
            <div className="field full"><label className="field-label">内容・状況の詳細</label><textarea className="input" rows={3} placeholder="発生状況・対応方針などを記入…" value={f.detail} onChange={(e) => set("detail", e.target.value)} /></div>
            <div className="field"><label className="field-label">対応状況</label>
              <select className="select" value={f.status} onChange={(e) => set("status", e.target.value)}>
                {CLAIM_STATUS.map((s) => <option key={s.id} value={s.id}>{s.id}</option>)}
              </select>
            </div>
            <div className="field"><label className="field-label">弁償・返金額</label><input className="input" type="number" min="0" placeholder="0" value={f.amount} onChange={(e) => set("amount", parseInt(e.target.value) || 0)} /></div>
            <div className="field"><label className="field-label">担当者</label><input className="input" placeholder="例：鈴木" value={f.staff} onChange={(e) => set("staff", e.target.value)} /></div>

            <div className="field full">
              <label className="field-label">写真（事故品の画像）</label>
              <div className={`cl-drop ${drag ? "dragging" : ""}`}
                   onDragEnter={(e) => { if (Array.from(e.dataTransfer.types || []).includes("Files")) { e.preventDefault(); setDrag(true); } }}
                   onDragOver={(e) => { if (Array.from(e.dataTransfer.types || []).includes("Files")) { e.preventDefault(); } }}
                   onDragLeave={() => setDrag(false)}
                   onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
                   onClick={() => fileRef.current && fileRef.current.click()}>
                <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }}
                       onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
                {busy ? "読み込み中…" : "クリックまたはドラッグ＆ドロップで写真を追加"}
              </div>
              {f.files && f.files.length > 0 && (
                <div className="cl-pending">
                  {f.files.map((x, i) => (
                    <div key={i} className={`cl-pend ${x.isImg ? "img" : "doc"}`}>
                      {x.isImg && (x.url || x.thumb) ? <img src={x.url || x.thumb} alt={x.name} /> : <span className="cl-pend-doc">{fileExtC(x.name) || "?"}</span>}
                      <button className="cl-pend-x" onClick={(e) => { e.stopPropagation(); removeFile(i); }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>キャンセル</button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>{initial ? "保存" : "登録"}</button>
        </div>
      </div>
      {confirmMissing && (
        <div className="modal-backdrop" style={{ zIndex: 60 }} onClick={(e) => { e.stopPropagation(); setConfirmMissing(null); }}>
          <div className="modal" style={{ maxWidth: 400, width: "100%" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-body" style={{ textAlign: "center", padding: "28px 26px 8px" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)", lineHeight: 1.6 }}>下記項目は未入力のまま投稿してよろしいですか？</div>
              <ul style={{ listStyle: "none", margin: "18px 0 4px", padding: "14px 18px", background: "#fdf2f2", border: "1px solid #f6c9c4", borderRadius: 12, textAlign: "left", display: "flex", flexDirection: "column", gap: 7 }}>
                {confirmMissing.map((m) => <li key={m} style={{ fontSize: 14.5, fontWeight: 700, color: "#b5271b" }}>・{m}</li>)}
              </ul>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setConfirmMissing(null)}>戻って入力する</button>
              <button className="btn btn-primary" onClick={() => { setConfirmMissing(null); onSave(f, !initial); }}>このまま投稿する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── ライトボックス ──────────────────────────────────────
const ClaimLightbox = ({ url, name, onClose }) => {
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

// ── KPI ─────────────────────────────────────────────────
const ClaimKpi = ({ claims }) => {
  const unresolved = claims.filter((c) => isUnresolved(c.status)).length;
  const thisMonth = cToday.slice(0, 7);
  const monthCnt = claims.filter((c) => (c.receivedOn || "").startsWith(thisMonth)).length;
  const amount = claims.reduce((s, c) => s + (parseInt(c.amount) || 0), 0);
  const resolved = claims.filter((c) => !isUnresolved(c.status)).length;
  const rate = claims.length ? Math.round((resolved / claims.length) * 100) : 0;

  const card = (label, value, sub, accent, vColor) => (
    <div className="kpi" style={{ borderTop: `3px solid ${accent}`, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
      <div className="kpi-label"><span className="kpi-dot" style={{ background: accent }}></span>{label}</div>
      <div className="kpi-value" style={{ color: vColor || accent, fontSize: 30 }}>{value}</div>
      <div className="kpi-delta">{sub}</div>
    </div>
  );
  return (
    <div className="kpi-row kpi-row-4">
      {card("⚠ 未解決", unresolved + " 件", "受付・対応中", unresolved > 0 ? "#d9730a" : "#34A853", unresolved > 0 ? "#d9730a" : "#34A853")}
      {card("📥 今月の件数", monthCnt + " 件", "受付ベース", "var(--accent)")}
      {card("💸 弁償・返金", yenC(amount), "累計", "#8430ce")}
      {card("✅ 解決率", rate + " %", `${resolved}/${claims.length} 件`, "#34A853")}
    </div>
  );
};

// ── メインページ ────────────────────────────────────────
const ClaimPage = () => {
  const { claims, upsert, remove, cloudOn, cloudState, lastSync, pull, uploadWarn, clearUploadWarn, saveStatus } = useClaimData();
  const [filter, setFilter] = React.useState("未解決");
  const [editing, setEditing] = React.useState(null); // claim or {} for new
  const [lightbox, setLightbox] = React.useState(null);
  const [importing, setImporting] = React.useState(false);
  const [importMsg, setImportMsg] = React.useState(null); // {ok, text}

  const importFromForm = async () => {
    if (!cloudOn || importing) return;
    setImporting(true); setImportMsg(null);
    try {
      const res = (typeof cloudImportClaimForm === "function") ? await cloudImportClaimForm() : { ok: false, message: "未設定" };
      if (res && res.ok) {
        await pull();
        setImportMsg({ ok: true, text: res.imported > 0 ? `フォームから ${res.imported} 件を取り込みました` : "新しいフォーム回答はありませんでした" });
      } else {
        setImportMsg({ ok: false, text: (res && res.message) || "取込に失敗しました" });
      }
    } catch (e) {
      setImportMsg({ ok: false, text: String((e && e.message) || e) });
    } finally {
      setImporting(false);
      setTimeout(() => setImportMsg(null), 6000);
    }
  };

  const addComment = (claim, comment) => {
    upsert({ ...claim, comments: [...(claim.comments || []), comment], status: comment.status || claim.status }, false);
  };

  const FILTERS = ["未解決", "すべて", "受付", "対応中", "解決", "弁償"];
  const counts = {
    "未解決": claims.filter((c) => isUnresolved(c.status)).length,
    "すべて": claims.length,
    "受付": claims.filter((c) => c.status === "受付").length,
    "対応中": claims.filter((c) => c.status === "対応中").length,
    "解決": claims.filter((c) => c.status === "解決").length,
    "弁償": claims.filter((c) => c.status === "弁償").length,
  };
  const filtered = claims.filter((c) => {
    if (filter === "すべて") return true;
    if (filter === "未解決") return isUnresolved(c.status);
    return c.status === filter;
  }).sort((a, b) => {
    const ua = isUnresolved(a.status) ? 0 : 1, ub = isUnresolved(b.status) ? 0 : 1;
    if (ua !== ub) return ua - ub;
    return (b.receivedOn || "").localeCompare(a.receivedOn || "") || (b.ts || 0) - (a.ts || 0);
  });

  const cloudLabel = cloudOn
    ? (cloudState === "ok" ? "☁ 全店で共有中" : cloudState === "loading" ? "☁ 接続中…" : "☁ 接続エラー（端末内表示）")
    : "端末内表示";

  return (
    <div className="app">
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
      <div className="shell">
        <AppSidebar active="claim" />
        <main className="main">
          <div className="greet">
            <div>
              <h1>⚠ クレーム・事故品</h1>
              <div className="sub">
                未解決 {counts["未解決"]} 件 ・ 全 {claims.length} 件 ・ {cloudLabel}
                {lastSync ? ` ・ 最終更新 ${new Date(lastSync).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}` : ""}
              </div>
            </div>
            <div className="right">
              <button className="btn btn-ghost" onClick={pull} disabled={!cloudOn || cloudState === "loading"} title="今すぐ取得">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={cloudState === "loading" ? { animation: "spin 1s linear infinite" } : null}>
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                更新
              </button>
              <button className="btn btn-ghost" onClick={importFromForm} disabled={!cloudOn || importing} title="Googleフォームの回答を取り込む">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={importing ? { animation: "spin 1s linear infinite" } : null}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                {importing ? "取込中…" : "フォームから取込"}
              </button>
              <button className="btn btn-primary" onClick={() => setEditing({})}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 5v14M5 12h14"/></svg>
                新規登録
              </button>
            </div>
          </div>

          {importMsg && (
            <div className="cl-import-msg" style={{ background: importMsg.ok ? "#e6f4ea" : "#fde2e2", color: importMsg.ok ? "#1e7a36" : "#b5271b", border: "1px solid " + (importMsg.ok ? "#aadcb8" : "#f3b9b3"), borderRadius: 10, padding: "10px 14px", fontSize: 13.5, fontWeight: 700, margin: "0 0 14px" }}>
              {importMsg.ok ? "✓ " : "⚠ "}{importMsg.text}
            </div>
          )}

          <ClaimKpi claims={claims} />

          {uploadWarn && (
            <div className="cl-upload-warn">
              <span className="cl-uw-ic">⚠️</span>
              <div className="cl-uw-body">
                <b>写真をクラウドに保存できませんでした。</b>
                <span className="cl-uw-msg">{/権限|permission|authoriz/i.test(uploadWarn)
                  ? "共有APIにGoogleドライブの権限が未許可です。Apps Scriptを再認証して再デプロイすると、写真が全店で共有されます（詳細は管理者へ）。"
                  : uploadWarn}</span>
              </div>
              <button className="cl-uw-x" onClick={clearUploadWarn} aria-label="閉じる">×</button>
            </div>
          )}

          <div className="cl-filters">
            {FILTERS.map((ff) => (
              <button key={ff} className={`cl-filter ${filter === ff ? "active" : ""} ${ff === "未解決" ? "warn" : ""}`} onClick={() => setFilter(ff)}>
                {ff}<span className="cl-filter-n">{counts[ff]}</span>
              </button>
            ))}
          </div>

          <div className="cl-list">
            {filtered.length === 0 ? (
              <div className="card cl-empty">{filter === "未解決" ? "未解決のクレーム・事故品はありません 🎉" : "該当する記録がありません"}</div>
            ) : (
              filtered.map((c) => (
                <ClaimCard key={c.id} claim={c}
                  onEdit={(cl) => setEditing(cl)}
                  onDelete={(id) => { if (confirm("この記録を削除しますか？")) remove(id); }}
                  onAddComment={addComment}
                  onOpenImg={(f) => setLightbox(f)} />
              ))
            )}
          </div>
        </main>
      </div>

      {editing && (
        <ClaimFormModal
          initial={editing.id ? editing : null}
          onSave={(c, isNew) => { upsert(c, isNew); setEditing(null); }}
          onClose={() => setEditing(null)} />
      )}
      {lightbox && <ClaimLightbox url={lightbox.url} name={lightbox.name} onClose={() => setLightbox(null)} />}
    </div>
  );
};

window.ClaimPage = ClaimPage;
