// 請求書管理 — UI（PDFドロップ＋AI抽出 / 一覧 / 絞り込み / 編集モーダル）

// ── 期限バッジ ──────────────────────────────────────────
const InvDue = ({ inv }) => {
  const open = window.invIsOpen(inv.status);
  const d = window.iDaysUntil(inv.dueDate);
  if (!inv.dueDate) return <span className="inv-due inv-due-none">期限未設定</span>;
  if (!open) return <span className="inv-due inv-due-paid">{window.iSlash(inv.dueDate)}</span>;
  if (d == null) return <span className="inv-due">{window.iSlash(inv.dueDate)}</span>;
  if (d < 0) return <span className="inv-due inv-due-over">{window.iSlash(inv.dueDate)} ・ {-d}日超過</span>;
  if (d === 0) return <span className="inv-due inv-due-over">本日期限</span>;
  if (d <= 7) return <span className="inv-due inv-due-urgent">{window.iSlash(inv.dueDate)} ・ あと{d}日</span>;
  return <span className="inv-due">{window.iSlash(inv.dueDate)} ・ あと{d}日</span>;
};

// ── 編集モーダル ────────────────────────────────────────
const InvoiceEditor = ({ initial, nextNo, dropFiles, onClose, onSave, onDelete }) => {
  const isNew = !initial;
  const [f, setF] = React.useState(() => initial ? { ...initial, files: initial.files || [] } : {
    id: "iv" + Date.now(), ts: Date.now(), no: nextNo(), vendor: "", title: "",
    issueDate: window.iToday, dueDate: "", amount: 0, status: "入金待ち", note: "", files: [],
  });
  const [pending, setPending] = React.useState(initial ? (initial.files || []) : []);
  const [aiState, setAiState] = React.useState("");
  const [preview, setPreview] = React.useState("");
  const fileRef = React.useRef(null);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  // 保存済み請求のPDF/画像を開いたときのプレビュー（ナビゲーション無し）
  React.useEffect(() => {
    const files = (initial && initial.files) || [];
    if (!files.length) return;
    const f0 = files[0];
    if (f0.isImg && (f0.thumb || f0.href)) { setPreview({ kind: "img", imgUrl: f0.thumb || f0.href, loading: false }); return; }
    if (f0.fileId) { setPreview({ kind: "img", imgUrl: `https://lh3.googleusercontent.com/d/${f0.fileId}=w1000`, loading: false }); return; }
    // この端末のローカル dataURL（PDF）→ 画像化を試みる
    if (f0.href && /^data:application\/pdf/.test(f0.href)) {
      setPreview({ kind: "pdf", imgUrl: "", loading: true });
      (async () => {
        try {
          const blob = await (await fetch(f0.href)).blob();
          const file = new File([blob], f0.name || "invoice.pdf", { type: "application/pdf" });
          const img = await Promise.race([window.renderPdfPreview(file), new Promise((r) => setTimeout(() => r(null), 15000))]);
          setPreview((p) => (p && p.kind === "pdf" ? { ...p, imgUrl: img || "", loading: false } : p));
        } catch { setPreview((p) => (p ? { ...p, loading: false } : p)); }
      })();
    }
  }, []);

  const ingest = async (list) => {
    const arr = Array.from(list || []);
    const withTimeout = (p, ms) => Promise.race([p, new Promise((res) => setTimeout(() => res(null), ms))]);
    for (const file of arr) {
      const rec = await window.readInvoiceFile(file);
      setPending((p) => [...p, rec]);
      const isPdf = /pdf/i.test(file.type);
      const isImg = /^image\//.test(file.type);
      if (isPdf) {
        setAiState("内容を読み取り中…");
        // ① まずテキスト判定（描画より先に・確実に結果を出す）
        const text = (await withTimeout(window.extractPdfText(file), 8000)) || "";
        if (text && text.trim().length > 15) {
          const ex = await withTimeout(window.aiExtractInvoice(text), 15000);
          if (ex) {
            setF((p) => ({ ...p, vendor: p.vendor || ex.vendor, title: p.title || ex.title, issueDate: ex.issueDate || p.issueDate, dueDate: ex.dueDate || p.dueDate, amount: p.amount ? p.amount : ex.amount }));
            const got = [ex.vendor && "取引先", ex.amount && "金額", ex.issueDate && "請求日", ex.dueDate && "支払期限"].filter(Boolean).join("・");
            setAiState(`✓ 自動入力しました${got ? "（" + got + "）" : ""} ・ 内容をご確認ください`);
            setTimeout(() => setAiState(""), 6000);
          } else {
            setAiState("⚠ 自動抽出できませんでした。プレビューを見ながら手動で入力してください");
          }
        } else {
          setAiState("📷 画像（スキャン）PDFのため自動読み取りできません。下のプレビューを見ながら手動で入力してください");
        }
        // ② プレビュー：同ページ内の画像（data URL）のみ。blobリンク・別タブは使わない（ブロック回避）
        setPreview({ kind: "pdf", imgUrl: "", loading: true });
        withTimeout(window.renderPdfPreview(file), 15000).then((img) => {
          setPreview((p) => (p && p.kind === "pdf" ? { ...p, imgUrl: img || "", loading: false } : p));
        });
      } else if (isImg) {
        setPreview({ kind: "img", imgUrl: rec.url || "", loading: false });
        setAiState("📷 画像のため自動読み取りできません。プレビューを見ながら手動で入力してください");
      }
    }
  };
  const onDrop = (e) => { e.preventDefault(); if (e.dataTransfer && e.dataTransfer.files) ingest(e.dataTransfer.files); };

  // ページ全体へドロップされたファイルを開いた直後に取り込む
  React.useEffect(() => { if (dropFiles && dropFiles.length) ingest(dropFiles); /* eslint-disable-next-line */ }, []);

  const save = () => {
    if (!f.vendor.trim() && !pending.length) { alert("取引先またはPDFを入力してください"); return; }
    onSave({ ...f, amount: Number(f.amount) || 0, files: pending }, isNew);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div><h2>{isNew ? "請求書を追加" : "請求書を編集"}</h2><div className="sub">No. {f.no}（自動採番） ・ PDFをドロップするとAIが項目を読み取ります</div></div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {/* PDFドロップ */}
          <div className="inv-drop" onClick={() => fileRef.current && fileRef.current.click()} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
            📄 請求書PDFをドラッグ＆ドロップ ／ タップで選択
            <input ref={fileRef} type="file" accept="application/pdf,image/*" multiple style={{ display: "none" }} onChange={(e) => ingest(e.target.files)} />
          </div>
          {aiState && <div className="inv-ai-state">{aiState}</div>}
          {preview && (
            <div className="inv-preview">
              <div className="inv-preview-cap"><span>📄 プレビュー（内容確認用）</span></div>
              {preview.imgUrl
                ? <img src={preview.imgUrl} alt="プレビュー" />
                : preview.loading
                  ? <div className="inv-preview-ph"><div className="ic">⏳</div><div>プレビューを生成中…</div></div>
                  : <div className="inv-preview-ph"><div className="ic">📄</div><div>この端末ではプレビューを表示できません。<br/>ドロップした元のPDFファイルをご覧になりながら項目を入力してください。</div></div>}
            </div>
          )}
          {pending.length > 0 && (
            <div className="inv-pend">
              {pending.map((p, i) => (
                <div key={i} className="inv-pend-item">
                  <span className="inv-pend-ext">{p.isImg ? "IMG" : (window.iFileExt(p.name) || "PDF")}</span>
                  <span className="inv-pend-name">{p.name}</span>
                  <span className="inv-pend-size">{window.iBytes(p.size)}</span>
                  <button className="inv-pend-x" onClick={() => setPending((arr) => arr.filter((_, j) => j !== i))}>×</button>
                </div>
              ))}
            </div>
          )}

          <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
            <div className="field" style={{ gridColumn: "1 / -1" }}><label className="field-label">取引先・請求元（会社名）</label><input className="input" value={f.vendor} onChange={(e) => set("vendor", e.target.value)} placeholder="例：株式会社さくら商事" /></div>
            <div className="field" style={{ gridColumn: "1 / -1" }}><label className="field-label">件名・内容</label><input className="input" value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="例：5月分 制服クリーニング" /></div>
            <div className="field"><label className="field-label">請求日（発行日）</label><input className="input" type="date" value={f.issueDate} onChange={(e) => set("issueDate", e.target.value)} /></div>
            <div className="field"><label className="field-label">支払期限</label><input className="input" type="date" value={f.dueDate} onChange={(e) => set("dueDate", e.target.value)} /></div>
            <div className="field"><label className="field-label">金額（税込）</label><input className="input" type="number" inputMode="numeric" value={f.amount} onChange={(e) => set("amount", e.target.value)} /></div>
            <div className="field"><label className="field-label">入金状況</label>
              <div className="inv-seg">
                {(window.INV_STATUS || []).map((s) => <button key={s.id} className={`inv-seg-opt ${f.status === s.id ? "active" : ""}`} style={f.status === s.id ? { background: s.color, borderColor: s.color, color: "#fff" } : null} onClick={() => set("status", s.id)}>{s.id}</button>)}
              </div>
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}><label className="field-label">メモ</label><input className="input" value={f.note} onChange={(e) => set("note", e.target.value)} placeholder="任意（入金予定・備考など）" /></div>
          </div>
          {!isNew && <button className="btn btn-ghost" style={{ marginTop: 14, color: "#c5221f" }} onClick={() => { if (confirm("この請求書を削除しますか？")) { onDelete(f.id); onClose(); } }}>この請求書を削除</button>}
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>キャンセル</button>
          <button className="btn btn-primary" onClick={save}>{isNew ? "追加する" : "保存する"}</button>
        </div>
      </div>
    </div>
  );
};

// ── KPI ─────────────────────────────────────────────────
const InvoiceKpi = ({ invoices }) => {
  const open = invoices.filter((c) => window.invIsOpen(c.status));
  const openSum = open.reduce((s, c) => s + (c.amount || 0), 0);
  const overdue = open.filter((c) => { const d = window.iDaysUntil(c.dueDate); return d != null && d < 0; });
  const overdueSum = overdue.reduce((s, c) => s + (c.amount || 0), 0);
  const soon = open.filter((c) => { const d = window.iDaysUntil(c.dueDate); return d != null && d >= 0 && d <= 7; });
  const monthPaid = invoices.filter((c) => !window.invIsOpen(c.status) && (c.issueDate || "").startsWith(window.iToday.slice(0, 7)));
  const card = (label, value, sub, accent, vc) => (
    <div className="kpi" style={{ borderTop: `3px solid ${accent}`, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
      <div className="kpi-label"><span className="kpi-dot" style={{ background: accent }}></span>{label}</div>
      <div className="kpi-value" style={{ color: vc || accent, fontSize: 28 }}>{value}</div>
      <div className="kpi-delta">{sub}</div>
    </div>
  );
  return (
    <div className="kpi-row kpi-row-4">
      {card("💰 入金待ち", iYen(openSum), `${open.length} 件`, "#d9730a", "#d9730a")}
      {card("⚠ 期限超過", overdue.length + " 件", overdue.length ? iYen(overdueSum) : "なし", overdue.length ? "#EA4335" : "#34A853", overdue.length ? "#EA4335" : "#34A853")}
      {card("⏰ 今週期限", soon.length + " 件", "7日以内", "#FBBC04")}
      {card("✓ 今月入金済", monthPaid.length + " 件", "当月発行分", "#34A853", "#34A853")}
    </div>
  );
};

// ── 一覧の行 ────────────────────────────────────────────
const InvoiceRow = ({ inv, onEdit }) => {
  const s = window.INV_STATUS_BY[inv.status] || { color: "#5f6368", bg: "#eef0f2" };
  const pdf = (inv.files || [])[0];
  return (
    <div className="inv-tr" onClick={() => onEdit(inv)}>
      <span className="inv-no">{inv.no}</span>
      <span className="inv-vendor"><span className="v">{inv.vendor || "（未入力）"}</span>{inv.title && <span className="t">{inv.title}</span>}</span>
      <span className="inv-amount">{iYen(inv.amount)}</span>
      <span className="inv-duecell"><InvDue inv={inv} /></span>
      <span className="inv-statuscell"><span className="inv-badge" style={{ background: s.bg, color: s.color }}>{inv.status}</span></span>
      <span className="inv-pdfcell">
        {pdf ? <span className="inv-pdf" title="クリックで内容を表示">📄 PDF</span>
          : <span className="inv-pdf empty">—</span>}
      </span>
    </div>
  );
};

// ── メインページ ────────────────────────────────────────
const InvoicePage = () => {
  const { invoices, upsert, remove, cloudOn, cloudState, lastSync, pull, nextNo } = useInvoiceData();
  const [editing, setEditing] = React.useState(null); // inv | "new" | null
  const [vendorF, setVendorF] = React.useState("all");
  const [statusF, setStatusF] = React.useState("all");
  const [q, setQ] = React.useState("");
  const dropRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);

  // ページ全体へのPDFドロップ → 新規作成（AI抽出）
  const onPageDrop = async (e) => {
    e.preventDefault(); setDragging(false);
    const files = e.dataTransfer && e.dataTransfer.files;
    if (files && files.length) {
      setEditing({ __drop: files });
    }
  };

  const vendors = Array.from(new Set(invoices.map((c) => c.vendor).filter(Boolean)));
  const filtered = invoices.filter((c) => {
    if (vendorF !== "all" && c.vendor !== vendorF) return false;
    if (statusF !== "all" && c.status !== statusF) return false;
    if (q.trim()) { const k = q.trim().toLowerCase(); if (!((c.vendor || "").toLowerCase().includes(k) || (c.title || "").toLowerCase().includes(k) || (c.no || "").includes(k))) return false; }
    return true;
  });
  // 新しい請求が上に来る（登録新しい順）
  const sorted = [...filtered].sort((a, b) => (b.ts || 0) - (a.ts || 0));

  const cloudLabel = cloudOn ? (cloudState === "ok" ? "☁ 全店で共有中" : cloudState === "loading" ? "☁ 接続中…" : "☁ 接続エラー（端末内表示）") : "端末内表示";

  return (
    <div className="app">
      <div className="shell">
        <AppSidebar active="invoice" />
        <main className="main"
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={(e) => { if (e.target === dropRef.current) setDragging(false); }}
              onDrop={onPageDrop} ref={dropRef}>
          <div className="greet">
            <div>
              <h1>🧾 請求書管理</h1>
              <div className="sub">受取請求（売上・顧客請求） ・ {invoices.length} 件 ・ {cloudLabel}{lastSync ? ` ・ 最終更新 ${new Date(lastSync).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}` : ""}</div>
            </div>
            <div className="right" style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost" onClick={pull} disabled={!cloudOn || cloudState === "loading"}>更新</button>
              <button className="btn btn-primary" onClick={() => setEditing("new")}>＋ 請求書を追加</button>
            </div>
          </div>

          <InvoiceKpi invoices={invoices} />

          {/* 大きめドロップゾーン */}
          <div className={`inv-bigdrop ${dragging ? "dragging" : ""}`} onClick={() => setEditing("new")}>
            <div className="inv-bigdrop-ic">📄⬇</div>
            <div className="inv-bigdrop-main">請求書PDFをここにドラッグ＆ドロップ</div>
            <div className="inv-bigdrop-sub">AIが取引先・金額・支払期限を自動で読み取ります（内容は要確認）。クリックで手動追加も可。</div>
          </div>

          {/* フィルター */}
          <div className="card" style={{ padding: "14px 16px" }}>
            <div className="inv-filters">
              <div className="inv-search">
                {Ico.search()}
                <input placeholder="取引先・件名・番号で検索" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <select className="input inv-vendor-sel" value={vendorF} onChange={(e) => setVendorF(e.target.value)}>
                <option value="all">すべての取引先</option>
                {vendors.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <div className="inv-chips">
                <button className={`inv-chip ${statusF === "all" ? "active" : ""}`} onClick={() => setStatusF("all")}>すべて {invoices.length}</button>
                {(window.INV_STATUS || []).map((s) => <button key={s.id} className={`inv-chip ${statusF === s.id ? "active" : ""}`} onClick={() => setStatusF(s.id)}>{s.id} {invoices.filter((c) => c.status === s.id).length}</button>)}
              </div>
            </div>
          </div>

          {/* 一覧 */}
          <div className="card">
            <div className="card-head">
              <h3 className="card-title">📋 請求一覧</h3>
              <span className="card-sub">{sorted.length} 件 ・ 合計 {iYen(sorted.reduce((s, c) => s + (c.amount || 0), 0))}</span>
            </div>
            {sorted.length === 0 ? (
              <div className="inv-empty">該当する請求書はありません</div>
            ) : (
              <div className="inv-table">
                <div className="inv-tr inv-th">
                  <span>番号</span><span>取引先・件名</span><span className="r">金額</span><span>支払期限</span><span>状況</span><span>PDF</span>
                </div>
                {sorted.map((c) => <InvoiceRow key={c.id} inv={c} onEdit={setEditing} />)}
              </div>
            )}
          </div>
        </main>
      </div>

      {editing && (
        <InvoiceEditor
          initial={editing === "new" || editing.__drop ? null : editing}
          nextNo={nextNo}
          dropFiles={editing && editing.__drop ? editing.__drop : null}
          onClose={() => setEditing(null)}
          onSave={upsert}
          onDelete={remove}
          key={editing && editing.id ? editing.id : "new"}
        />
      )}
      {dragging && <div className="inv-dragmask">📄 ドロップして請求書を追加</div>}
    </div>
  );
};

window.InvoicePage = InvoicePage;
