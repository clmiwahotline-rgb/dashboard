// 共有事項ボード — ダッシュボード最上部の投稿フォーム＋フィード
// localStorage: miwa.board.v1 = [{ id, who, text, files:[{name,type,size,url,isImg}], ts }]

const BOARD_KEY = "miwa.board.v1";

// 投稿区分バッジ
const BOARD_BADGES = [
  { id: "重要",          color: "#c5221f", bg: "#fde2e2" },
  { id: "販促",          color: "#9a6700", bg: "#feefc3" },
  { id: "クレーム/事故品", color: "#be3a82", bg: "#fde2ef" },
  { id: "トラブル",      color: "#8430ce", bg: "#f3e8fd" },
  { id: "提案",          color: "#1e8e3e", bg: "#e6f4ea" },
  { id: "その他共有",    color: "#5f6368", bg: "#eef0f2" },
];
const BADGE_BY_ID = Object.fromEntries(BOARD_BADGES.map((b) => [b.id, b]));
const DEFAULT_BADGE = "その他共有";

const SAMPLE_BOARD = [];

// ── localStorage helpers ──────────────────────────────
const boardLoad = () => {
  try {
    const s = localStorage.getItem(BOARD_KEY);
    if (s) { const v = JSON.parse(s); if (Array.isArray(v)) return v; }
  } catch {}
  return SAMPLE_BOARD;
};
const boardSave = (rows) => {
  try { localStorage.setItem(BOARD_KEY, JSON.stringify(rows)); return true; }
  catch { return false; }
};

// ── クラウド共有（全端末で同じ投稿を表示）─────────────────
// 添付の dataURL はスプレッドシートのセル上限を超えるためクラウドへは送らず、
// ファイルのメタ情報のみ共有。実体（サムネ/DLデータ）は投稿した端末にローカル保存する。
const BOARD_SHEET = "共有事項";
const FILE_MAP_KEY = "miwa.board.files.v1";
const fileMapLoad = () => { try { return JSON.parse(localStorage.getItem(FILE_MAP_KEY)) || {}; } catch { return {}; } };
const fileMapSave = (m) => { try { localStorage.setItem(FILE_MAP_KEY, JSON.stringify(m)); } catch {} };

const stripForCloud = (p) => ({
  id: p.id, ts: p.ts, who: p.who || "", badge: p.badge || "", text: p.text || "",
  files: (p.files || []).map((f) => ({ name: f.name, type: f.type, size: f.size, isImg: !!f.isImg })),
});
const normalizeRemote = (r) => {
  let files = r.files;
  if (typeof files === "string") { try { files = JSON.parse(files); } catch { files = []; } }
  return {
    id: Number(r.id) || r.id,
    ts: Number(r.ts) || (r.ts ? Date.parse(r.ts) : Date.now()),
    who: r.who || "", badge: r.badge || "", text: r.text || "",
    files: Array.isArray(files) ? files : [],
  };
};

// Drive サムネ / 閲覧 URL
const driveThumb = (id, w) => `https://lh3.googleusercontent.com/d/${id}=w${w || 600}`;
const driveView = (id) => `https://drive.google.com/file/d/${id}/view`;

// 添付1件を表示用に解決（Drive fileId 優先 → 端末ローカル dataURL）
const resolveFile = (f, localFile) => {
  const fileId = f.fileId || (localFile && localFile.fileId) || "";
  const localUrl = (localFile && localFile.url) || (f.url) || "";
  const isImg = !!f.isImg;
  let thumb = "", open = "";
  if (isImg) {
    thumb = fileId ? driveThumb(fileId, 600) : localUrl;
    open = fileId ? driveThumb(fileId, 1600) : localUrl;
  }
  const href = fileId ? driveView(fileId) : localUrl;
  return {
    name: f.name, type: f.type, size: f.size, isImg, fileId,
    thumb, open, href,
    driveLink: !!fileId,           // Drive 共有済み（全端末で見える）
    localOnly: !fileId && !!localUrl, // この端末のみ
    remote: !fileId && !localUrl,   // 実体なし（別端末で添付）
  };
};

// 投稿の添付に、Drive / ローカルの実体を解決して付与
const hydrateFiles = (posts, fm) => posts.map((p) => {
  const lf = fm[p.id] || [];
  const files = (p.files || []).map((f, i) => {
    const local = lf.find((l) => l.name === f.name) || (lf.length === (p.files || []).length ? lf[i] : null);
    return resolveFile(f, local);
  });
  return { ...p, files };
});

// 共有ボードのデータ層（localStorage ＋ クラウド同期）
const useBoardData = () => {
  const cloudOn = (typeof cloudEnabled === "function") && cloudEnabled();
  const [posts, setPosts] = React.useState(() => hydrateFiles(boardLoad(), fileMapLoad()));
  const [cloudState, setCloudState] = React.useState(cloudOn ? "loading" : "off");

  React.useEffect(() => { boardSave(posts); }, [posts]);

  // 初回：クラウドが正。空ならローカルを移行
  React.useEffect(() => {
    if (!cloudOn) return;
    let cancelled = false;
    (async () => {
      const remote = await cloudGet(BOARD_SHEET);
      if (cancelled) return;
      if (remote == null) { setCloudState("error"); return; }
      const fm = fileMapLoad();
      if (remote.length) {
        setPosts(hydrateFiles(remote.map(normalizeRemote), fm));
      } else {
        const local = boardLoad();
        if (local.length) await cloudReplaceAll(BOARD_SHEET, local.map(stripForCloud));
      }
      setCloudState("ok");
    })();
    return () => { cancelled = true; };
  }, [cloudOn]);

  // 定期的に取り直し（他端末の投稿に追従）
  React.useEffect(() => {
    if (!cloudOn) return;
    const t = setInterval(async () => {
      const remote = await cloudGet(BOARD_SHEET);
      if (remote != null) setPosts(hydrateFiles(remote.map(normalizeRemote), fileMapLoad()));
    }, 20000);
    return () => clearInterval(t);
  }, [cloudOn]);

  const addPost = (p) => {
    // 端末ローカルに実体（dataURL）を保持 → 即時表示
    if (p.files && p.files.length) { const fm = fileMapLoad(); fm[p.id] = p.files; fileMapSave(fm); }
    setPosts((prev) => [...hydrateFiles([{ ...p }], fileMapLoad()), ...prev]);

    (async () => {
      const cloudFiles = (p.files || []).map((f) => ({ name: f.name, type: f.type, size: f.size, isImg: !!f.isImg }));
      if (cloudOn && p.files && p.files.length) {
        for (let i = 0; i < p.files.length; i++) {
          const f = p.files[i];
          const b64 = (f.url || "").split(",")[1];
          if (!b64) continue;
          try {
            const res = await cloudUploadFile(f.name, f.type || "application/octet-stream", b64);
            if (res && res.ok && res.fileId) cloudFiles[i].fileId = res.fileId;
          } catch (_) {}
        }
        // ローカルの控えにも fileId を反映
        const fm = fileMapLoad();
        fm[p.id] = (p.files || []).map((f, i) => ({ ...f, fileId: cloudFiles[i].fileId }));
        fileMapSave(fm);
        // Drive 化された添付を表示へ反映
        setPosts((prev) => hydrateFiles(prev.map((x) => x.id === p.id
          ? { ...x, files: cloudFiles } : x), fileMapLoad()));
      }
      if (cloudOn) {
        cloudAdd(BOARD_SHEET, { id: p.id, ts: p.ts, who: p.who || "", badge: p.badge || "", text: p.text || "", files: cloudFiles });
      }
    })();
  };
  const delPost = (id) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    const fm = fileMapLoad(); if (fm[id]) { delete fm[id]; fileMapSave(fm); }
    if (cloudOn) cloudDelete(BOARD_SHEET, id);
  };

  return { posts, addPost, delPost, cloudOn, cloudState };
};

// ── 画像を縮小して dataURL 化（localStorage 節約） ──────
const readAttachment = (file) => new Promise((resolve) => {
  const isImg = /^image\//.test(file.type);
  if (isImg) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1100;
        let { width: w, height: h } = img;
        if (w > MAX || h > MAX) {
          const k = MAX / Math.max(w, h);
          w = Math.round(w * k); h = Math.round(h * k);
        }
        const cv = document.createElement("canvas");
        cv.width = w; cv.height = h;
        cv.getContext("2d").drawImage(img, 0, 0, w, h);
        const url = cv.toDataURL("image/jpeg", 0.82);
        resolve({ name: file.name, type: file.type, size: file.size, url, isImg: true });
      };
      img.onerror = () => resolve({ name: file.name, type: file.type, size: file.size, url: reader.result, isImg: true });
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  } else {
    // 非画像：3MB 未満なら dataURL で保持（ダウンロード可）、超過時はメタのみ
    if (file.size <= 3 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, type: file.type, size: file.size, url: reader.result, isImg: false });
      reader.readAsDataURL(file);
    } else {
      resolve({ name: file.name, type: file.type, size: file.size, url: "", isImg: false });
    }
  }
});

const fmtBytes = (n) => {
  if (!n && n !== 0) return "";
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + " KB";
  return (n / 1024 / 1024).toFixed(1) + " MB";
};
const fileExt = (name) => (name.split(".").pop() || "").toUpperCase().slice(0, 4);

const boardRelTime = (ts) => {
  if (!ts) return "";
  const diff = Date.now() - ts;
  if (diff < 0) return "予定";
  const m = Math.floor(diff / 6e4);
  if (m < 1) return "たった今";
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  const d = new Date(ts);
  const dd = Math.floor(h / 24);
  if (dd < 7) return `${dd}日前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
};
const boardFullTime = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

// ── ファイル系アイコン ─────────────────────────────────
const BoardIco = {
  clip: (s) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={s}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>,
  send: (s) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={s}><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>,
  file: (s) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={s}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>,
  x: (s) => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" style={s}><path d="M18 6 6 18M6 6l12 12"/></svg>,
  trash: (s) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={s}><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>,
  download: (s) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={s}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>,
};

const avatarHue = (s) => {
  let h = 0; for (let i = 0; i < (s || "").length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};

// ── ライトボックス ─────────────────────────────────────
const Lightbox = ({ url, name, onClose }) => {
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="lb-backdrop" onClick={onClose}>
      <button className="lb-close" onClick={onClose} aria-label="閉じる">{BoardIco.x({})}</button>
      <img className="lb-img" src={url} alt={name} onClick={(e) => e.stopPropagation()} />
      {name && <div className="lb-cap">{name}</div>}
    </div>
  );
};

// ── 添付ファイル（書類・Drive リンク）チップ ───────────
const DocChips = ({ docs }) => {
  if (!docs || !docs.length) return null;
  return (
    <div className="bd-files">
      {docs.map((f, i) => (
        f.href ? (
          <a key={i} className="bd-file"
             href={f.href}
             {...(f.driveLink ? { target: "_blank", rel: "noopener" } : { download: f.name })}
             title={f.driveLink ? `${f.name}（Driveで開く）` : `${f.name} をダウンロード`}>
            <span className="bd-file-ext">{f.isImg ? "IMG" : (fileExt(f.name) || BoardIco.file({}))}</span>
            <span className="bd-file-meta">
              <span className="bd-file-name">{f.name}</span>
              <span className="bd-file-size">
                {fmtBytes(f.size)} ・ {f.driveLink
                  ? <>Driveで開く {BoardIco.download({ style: { verticalAlign: "-2px" } })}</>
                  : <>ダウンロード {BoardIco.download({ style: { verticalAlign: "-2px" } })}</>}
              </span>
            </span>
          </a>
        ) : (
          <div key={i} className="bd-file bd-file-na" title="添付の共有準備中、または投稿端末でのみ表示できます">
            <span className="bd-file-ext">{f.isImg ? "IMG" : (fileExt(f.name) || BoardIco.file({}))}</span>
            <span className="bd-file-meta">
              <span className="bd-file-name">{f.name}</span>
              <span className="bd-file-size">{fmtBytes(f.size)} ・ 共有準備中</span>
            </span>
          </div>
        )
      ))}
    </div>
  );
};

// ── 添付サムネ（上半分クロップ・コメント右側） ─────────
const SideThumbs = ({ imgs, onOpenImg }) => {
  if (!imgs || !imgs.length) return null;
  return (
    <div className="bd-side-thumbs">
      {imgs.map((f, i) => (
        <button key={i} className="bd-thumb-half" onClick={() => onOpenImg({ url: f.open || f.thumb, name: f.name })} title={`${f.name} ・ クリックで拡大`}>
          <img src={f.thumb} alt={f.name} loading="lazy" referrerPolicy="no-referrer" />
        </button>
      ))}
    </div>
  );
};

// ── 投稿1件 ────────────────────────────────────────────
const BoardPost = ({ post, onDelete, onOpenImg, clamp = false, onConfirm, confirmed = false, isToday = false }) => {
  const who = post.who || "匿名";
  const hue = avatarHue(who);
  const files = post.files || [];
  const imgs = files.filter((f) => f.isImg && f.thumb);
  const docs = files.filter((f) => !(f.isImg && f.thumb));
  const [expanded, setExpanded] = React.useState(false);
  const [overflowing, setOverflowing] = React.useState(false);
  const textRef = React.useRef(null);
  React.useEffect(() => {
    if (!clamp || !textRef.current) return;
    const el = textRef.current;
    setOverflowing(el.scrollHeight - el.clientHeight > 2);
  }, [clamp, post.text, expanded]);
  return (
    <div className="bd-post">
      <div className="bd-av" style={{ background: `linear-gradient(135deg, oklch(0.66 0.13 ${hue}), oklch(0.55 0.15 ${(hue + 40) % 360}))` }}>
        {who.replace(/^[^/]*\/\s*/, "").trim()[0] || who[0]}
      </div>
      <div className="bd-main">
        <div className="bd-post-head">
          <span className="bd-who">{who}</span>
          {post.badge && BADGE_BY_ID[post.badge] && (
            <span className="bd-badge" style={{ background: BADGE_BY_ID[post.badge].bg, color: BADGE_BY_ID[post.badge].color }}>
              <span className="dot" style={{ background: BADGE_BY_ID[post.badge].color }}></span>{post.badge}
            </span>
          )}
          <span className="bd-time" title={boardFullTime(post.ts)}>{boardRelTime(post.ts)}</span>
          <button className="bd-del" onClick={() => onDelete(post.id)} title="削除">{BoardIco.trash({})}</button>
        </div>
        <div className="bd-post-body">
          <div className="bd-post-text-col">
            {post.text && <div ref={textRef} className={"bd-text" + (clamp && !expanded ? " bd-clamp" : "")}>{post.text}</div>}
            {clamp && (overflowing || expanded) && (
              <button className="bd-expand" onClick={() => setExpanded((v) => !v)}>
                {expanded ? "折りたたむ ▴" : "続きを読む ▾"}
              </button>
            )}
            <DocChips docs={docs} />
          </div>
          <SideThumbs imgs={imgs} onOpenImg={onOpenImg} />
        </div>
        {onConfirm && (
          <div className="bd-confirm-row">
            {confirmed
              ? <span className="bd-seen">✓ 確認済み</span>
              : <button className="bd-confirm" onClick={() => onConfirm(post)}>✓ 確認した</button>}
          </div>
        )}
      </div>
    </div>
  );
};

// ── 投稿フォーム ───────────────────────────────────────
const BoardComposer = ({ onPost }) => {
  const [open, setOpen] = React.useState(false);
  const [who, setWho] = React.useState("");
  const [badge, setBadge] = React.useState(DEFAULT_BADGE);
  const [text, setText] = React.useState("");
  const [pending, setPending] = React.useState([]); // {name,type,size,url,isImg}
  const [busy, setBusy] = React.useState(false);
  const [drag, setDrag] = React.useState(false);
  const fileRef = React.useRef(null);
  const dragDepth = React.useRef(0);

  const reset = () => { setWho(""); setBadge(DEFAULT_BADGE); setText(""); setPending([]); setOpen(false); setDrag(false); dragDepth.current = 0; };

  const hasFiles = (e) => Array.from(e.dataTransfer && e.dataTransfer.types || []).includes("Files");
  const onDragEnter = (e) => { if (!hasFiles(e)) return; e.preventDefault(); dragDepth.current++; setDrag(true); };
  const onDragOver = (e) => { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = "copy"; };
  const onDragLeave = (e) => { if (!hasFiles(e)) return; dragDepth.current = Math.max(0, dragDepth.current - 1); if (dragDepth.current === 0) setDrag(false); };
  const onDrop = (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth.current = 0; setDrag(false);
    if (!open) setOpen(true);
    if (e.dataTransfer.files && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const addFiles = async (fileList) => {
    const arr = Array.from(fileList || []);
    if (!arr.length) return;
    setBusy(true);
    const out = [];
    for (const f of arr) out.push(await readAttachment(f));
    setPending((p) => [...p, ...out]);
    setBusy(false);
  };

  const removePending = (i) => setPending((p) => p.filter((_, j) => j !== i));

  const submit = () => {
    if (!text.trim() && !pending.length) return;
    onPost({
      id: Date.now(),
      who: who.trim(),
      badge,
      text: text.trim(),
      files: pending,
      ts: Date.now(),
    });
    reset();
  };

  if (!open) {
    return (
      <button className={`bd-compose-trigger ${drag ? "dragging" : ""}`} onClick={() => setOpen(true)}
              onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
        <span className="bd-av bd-av-ghost">{BoardIco.send({})}</span>
        <span className="bd-trigger-text">{drag ? "ここにドロップして添付" : "共有したいこと・連絡事項を投稿する…"}</span>
        <span className="bd-trigger-clip">{BoardIco.clip({})} ドラッグ&ドロップ可</span>
      </button>
    );
  }

  return (
    <div className={`bd-composer ${drag ? "dragging" : ""}`}
         onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      {drag && (
        <div className="bd-drop-overlay">
          <span>{BoardIco.clip({})}</span>
          <span>ここにファイルをドロップして添付</span>
        </div>
      )}
      <div className="bd-compose-row">
        <div className="field" style={{ width: 170, flexShrink: 0 }}>
          <label className="field-label">区分バッジ</label>
          <select className="select" value={badge} onChange={(e) => setBadge(e.target.value)}>
            {BOARD_BADGES.map((b) => <option key={b.id} value={b.id}>{b.id}</option>)}
          </select>
        </div>
        <div className="field" style={{ width: 220, flexShrink: 0 }}>
          <label className="field-label">誰から</label>
          <input className="input" placeholder="名前・店舗名（例：本店 / 田中）"
                 value={who} onChange={(e) => setWho(e.target.value)} autoFocus />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 200 }}>
          <label className="field-label">なにを</label>
          <textarea className="input" rows={2} placeholder="共有したい内容を入力…"
                    value={text} onChange={(e) => setText(e.target.value)} />
        </div>
      </div>

      {pending.length > 0 && (
        <div className="bd-pending">
          {pending.map((f, i) => (
            <div key={i} className={`bd-pend ${f.isImg ? "img" : "doc"}`}>
              {f.isImg && f.url
                ? <img src={f.url} alt={f.name} />
                : <span className="bd-pend-doc"><span className="bd-file-ext">{fileExt(f.name) || "?"}</span><span className="bd-pend-name">{f.name}</span></span>}
              <button className="bd-pend-x" onClick={() => removePending(i)} title="削除">{BoardIco.x({})}</button>
            </div>
          ))}
        </div>
      )}

      <div className="bd-compose-foot">
        <input ref={fileRef} type="file" multiple style={{ display: "none" }}
               onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        <button className="btn btn-ghost" onClick={() => fileRef.current && fileRef.current.click()} disabled={busy}>
          {BoardIco.clip({})} {busy ? "読み込み中…" : "ファイルを添付"}
        </button>
        <span className="bd-hint">画像・PDF・書類など（画像はサムネイル表示）</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" onClick={reset}>キャンセル</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy || (!text.trim() && !pending.length)}>
            {BoardIco.send({})} 投稿する
          </button>
        </div>
      </div>
    </div>
  );
};

// ── ボード本体（ダッシュボード：最新1件＋未読通知） ──
const BOARD_SEEN_KEY = "miwa.board.seenCount.v1";
const readSeen = () => parseInt(localStorage.getItem(BOARD_SEEN_KEY) || "0", 10);

// スマホホームと同じ miwa.board.seen.v1（確認済みID配列）を共有 → 端末間で状態一致
const BOARD_SEEN_IDS_KEY = "miwa.board.seen.v1";
const readSeenIds = () => { try { const a = JSON.parse(localStorage.getItem(BOARD_SEEN_IDS_KEY)); return Array.isArray(a) ? a : []; } catch { return []; } };
const boardYmd = (d) => { const z = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; };

const ShareBoard = () => {
  const { posts, addPost: addData, delPost: delData, cloudOn, cloudState } = useBoardData();
  const [lightbox, setLightbox] = React.useState(null);
  const [warn, setWarn] = React.useState("");
  const [seenIds, setSeenIds] = React.useState(readSeenIds);

  // 別タブ・スマホが確認状態を更新したら追従
  React.useEffect(() => {
    const sync = () => setSeenIds(readSeenIds());
    window.addEventListener("storage", sync);
    const t = setInterval(sync, 3000);
    return () => { window.removeEventListener("storage", sync); clearInterval(t); };
  }, []);

  const todayISO = boardYmd(new Date());
  const boardId = (p) => String(p.id != null ? p.id : p.ts);
  const boardDate = (p) => { const t = Number(p.ts) || (p.ts ? Date.parse(p.ts) : 0); return t ? boardYmd(new Date(t)) : todayISO; };
  const confirmBoard = (p) => setSeenIds((prev) => {
    const id = boardId(p);
    const next = prev.includes(id) ? prev : [...prev, id];
    try { localStorage.setItem(BOARD_SEEN_IDS_KEY, JSON.stringify(next)); } catch {}
    return next;
  });

  const addPost = (p) => { addData(p); };
  const delPost = (id) => {
    if (!confirm("この投稿を削除しますか？")) return;
    delData(id);
  };

  // 本日分は全件、過去分は未確認のみ（新しい順）
  const sorted = [...posts].sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const visible = sorted.filter((p) => boardDate(p) === todayISO || !seenIds.includes(boardId(p)));
  const hiddenConfirmed = posts.length - visible.length;

  return (
    <div className="card bd-card">
      <div className="card-head">
        <h3 className="card-title">📌 共有事項</h3>
        <span className="card-sub">
          全店への連絡・共有
          {cloudOn && (cloudState === "ok" ? " ・ ☁ 全店で共有中" : cloudState === "loading" ? " ・ ☁ 接続中…" : " ・ ☁ 接続エラー（端末内表示）")}
        </span>
        <div className="right">
          <a className="link" href={encodeURIComponent("共有ボード.html")} style={{ textDecoration: "none" }}>共有ボード →</a>
        </div>
      </div>

      <BoardComposer onPost={addPost} />

      {warn && <div className="bd-warn">⚠ {warn}</div>}

      <div className="bd-feed">
        {visible.length === 0 ? (
          <div className="bd-empty">
            {posts.length === 0
              ? "まだ投稿がありません。上のフォームから共有事項を投稿しましょう。"
              : "新しい投稿はありません（すべて確認済み）。"}
          </div>
        ) : (
          <>
            {visible.map((p) => (
              <BoardPost
                key={boardId(p)}
                post={p}
                onDelete={delPost}
                onOpenImg={(f) => setLightbox(f)}
                clamp={true}
                onConfirm={confirmBoard}
                confirmed={seenIds.includes(boardId(p))}
                isToday={boardDate(p) === todayISO}
              />
            ))}
            {hiddenConfirmed > 0 && (
              <a className="bd-more" href={encodeURIComponent("共有ボード.html")}>
                確認済み {hiddenConfirmed} 件を含めて共有ボードで見る →
              </a>
            )}
          </>
        )}
      </div>

      {lightbox && <Lightbox url={lightbox.url} name={lightbox.name} onClose={() => setLightbox(null)} />}
    </div>
  );
};

window.ShareBoard = ShareBoard;

// ── 共有ボード（独立ページ：全件表示） ──────────────────
const BoardPage = () => {
  const { posts, addPost: addData, delPost: delData, cloudOn, cloudState } = useBoardData();
  const [lightbox, setLightbox] = React.useState(null);

  // このページを開いた時点で全件を既読にする
  React.useEffect(() => {
    try { localStorage.setItem(BOARD_SEEN_KEY, String(posts.length)); } catch {}
  }, [posts.length]);

  const addPost = (p) => {
    addData(p);
    try { localStorage.setItem(BOARD_SEEN_KEY, String(posts.length + 1)); } catch {}
  };
  const delPost = (id) => {
    if (!confirm("この投稿を削除しますか？")) return;
    delData(id);
  };

  const sorted = [...posts].sort((a, b) => (b.ts || 0) - (a.ts || 0));

  return (
    <div className="app">
      <div className="shell">
        <AppSidebar active="board" />
        <main className="main">
          <div className="greet">
            <div>
              <h1>📌 共有ボード</h1>
              <div className="sub">
                全店への連絡・共有 ・ 全 {posts.length} 件
                {cloudOn && (cloudState === "ok" ? " ・ ☁ 全店で共有中" : cloudState === "loading" ? " ・ ☁ 接続中…" : " ・ ☁ 接続エラー（端末内表示）")}
              </div>
            </div>
          </div>

          <div className="card bd-card">
            <BoardComposer onPost={addPost} />
            <div className="bd-feed bd-feed-page">
              {sorted.length === 0 ? (
                <div className="bd-empty">まだ投稿がありません。上のフォームから共有事項を投稿しましょう。</div>
              ) : (
                sorted.map((p) => (
                  <BoardPost key={p.id} post={p} onDelete={delPost} onOpenImg={(f) => setLightbox(f)} />
                ))
              )}
            </div>
          </div>

          {lightbox && <Lightbox url={lightbox.url} name={lightbox.name} onClose={() => setLightbox(null)} />}
        </main>
      </div>
    </div>
  );
};

window.BoardPage = BoardPage;
