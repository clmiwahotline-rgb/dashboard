// モバイル版 ─ 共有ボード（フィード閲覧＋投稿）
// データモデル: polished-board.jsx と同一
//   localStorage: miwa.board.v1 = [{ id, who, text, badge, files:[{name,type,size,url,isImg,thumb,fileId}], ts }]
//   クラウド: "共有事項" シート
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MB_KEY = "miwa.board.v1";
const MB_FILE_MAP = "miwa.board.files.v1";
const MB_SHEET = "共有事項";

const MB_BADGES = [
  { id: "重要",            c: "#c5221f", b: "#fde2e2" },
  { id: "販促",            c: "#9a6700", b: "#feefc3" },
  { id: "クレーム/事故品", c: "#be3a82", b: "#fde2ef" },
  { id: "トラブル",        c: "#8430ce", b: "#f3e8fd" },
  { id: "提案",            c: "#1e8e3e", b: "#e6f4ea" },
  { id: "その他共有",      c: "#5f6368", b: "#eef0f2" },
];
const MB_BADGE_BY = Object.fromEntries(MB_BADGES.map((b) => [b.id, b]));
const MB_DEFAULT_BADGE = "その他共有";

const mbLS = (k, fb) => { try { const s = localStorage.getItem(k); if (s) return JSON.parse(s); } catch (e) {} return fb; };
const mbSave = (posts) => { try { localStorage.setItem(MB_KEY, JSON.stringify(posts)); } catch (e) {} };
const mbFileMapLoad = () => mbLS(MB_FILE_MAP, {});
const mbFileMapSave = (m) => { try { localStorage.setItem(MB_FILE_MAP, JSON.stringify(m)); } catch (e) {} };
const mbDriveThumb = (id, w) => `https://lh3.googleusercontent.com/d/${id}=w${w || 800}`;
const mbAvatarHue = (s) => { let h = 0; for (let i = 0; i < (s || "").length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; };

const mbRel = (ts) => {
  if (!ts) return "";
  const d = typeof ts === "number" ? new Date(ts) : new Date(Date.parse(ts));
  if (isNaN(d)) return "";
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (m < 1) return "たった今"; if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}時間前`;
  const dd = Math.floor(h / 24); if (dd < 7) return `${dd}日前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

// クラウド行 → ローカル正規化
const mbNormalize = (r) => {
  let files = r.files;
  if (typeof files === "string") { try { files = JSON.parse(files); } catch (e) { files = []; } }
  return {
    id: Number(r.id) || r.id,
    ts: Number(r.ts) || (r.ts ? Date.parse(r.ts) : Date.now()),
    who: r.who || "", badge: r.badge || "", text: r.text || "",
    files: Array.isArray(files) ? files : [],
  };
};

// 添付の実体（Drive / 端末ローカル）を解決
const mbResolveFile = (f, local) => {
  const out = { ...f };
  if (local && local.url) { out.url = local.url; out.thumb = local.isImg ? local.url : out.thumb; }
  if (f.fileId) { out.href = `https://drive.google.com/file/d/${f.fileId}/view`; if (f.isImg) out.thumb = mbDriveThumb(f.fileId, 800); }
  return out;
};
const mbHydrate = (posts, fm) => posts.map((p) => {
  const lf = fm[p.id] || [];
  const files = (p.files || []).map((f, i) => {
    const local = lf.find((l) => l.name === f.name) || (lf.length === (p.files || []).length ? lf[i] : null);
    return mbResolveFile(f, local);
  });
  return { ...p, files };
});
const mbFirstImg = (files) => {
  for (const f of (files || [])) { if (f.isImg && f.thumb) return f.thumb; if (f.isImg && f.url) return f.url; }
  return null;
};

// ── データフック（クラウドが正・無ければローカル） ──
const useMBoardData = () => {
  const cloudOn = (typeof cloudEnabled === "function") && cloudEnabled();
  const [posts, setPosts] = React.useState(() => mbHydrate(mbLS(MB_KEY, []), mbFileMapLoad()));
  const [state, setState] = React.useState(cloudOn ? "loading" : "off");

  React.useEffect(() => { mbSave(posts); }, [posts]);

  React.useEffect(() => {
    if (!cloudOn) return;
    let cancelled = false;
    (async () => {
      const remote = await cloudGet(MB_SHEET);
      if (cancelled) return;
      if (remote == null) { setState("error"); return; }
      if (remote.length) setPosts(mbHydrate(remote.map(mbNormalize), mbFileMapLoad()));
      setState("ok");
    })();
    const t = setInterval(async () => {
      const remote = await cloudGet(MB_SHEET);
      if (remote != null) setPosts(mbHydrate(remote.map(mbNormalize), mbFileMapLoad()));
    }, 20000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const addPost = (p) => {
    if (p.files && p.files.length) { const fm = mbFileMapLoad(); fm[p.id] = p.files; mbFileMapSave(fm); }
    setPosts((prev) => [...mbHydrate([{ ...p }], mbFileMapLoad()), ...prev]);
    (async () => {
      const cloudFiles = (p.files || []).map((f) => ({ name: f.name, type: f.type, size: f.size, isImg: !!f.isImg }));
      if (cloudOn && p.files && p.files.length) {
        for (let i = 0; i < p.files.length; i++) {
          const b64 = (p.files[i].url || "").split(",")[1];
          if (!b64) continue;
          try { const res = await cloudUploadFile(p.files[i].name, p.files[i].type || "application/octet-stream", b64);
            if (res && res.ok && res.fileId) cloudFiles[i].fileId = res.fileId; } catch (e) {}
        }
        const fm = mbFileMapLoad();
        fm[p.id] = (p.files || []).map((f, i) => ({ ...f, fileId: cloudFiles[i].fileId }));
        mbFileMapSave(fm);
        setPosts((prev) => mbHydrate(prev.map((x) => x.id === p.id ? { ...x, files: cloudFiles } : x), mbFileMapLoad()));
      }
      if (cloudOn) cloudAdd(MB_SHEET, { id: p.id, ts: p.ts, who: p.who || "", badge: p.badge || "", text: p.text || "", files: cloudFiles });
    })();
  };

  return { posts, addPost, cloudOn, state };
};

// ── 投稿カード ─────────────────────────────────────
const MBoardCard = ({ post, onImg }) => {
  const who = post.who || "匿名";
  const hue = mbAvatarHue(who);
  const badge = MB_BADGE_BY[post.badge];
  const thumb = mbFirstImg(post.files);
  const docs = (post.files || []).filter((f) => !(f.isImg && f.thumb));
  const [expanded, setExpanded] = React.useState(false);
  const long = (post.text || "").length > 120;
  return (
    <div className="m-board-post">
      <div className="m-board">
        <div className="m-board-av" style={{ background: `linear-gradient(135deg, oklch(0.66 0.13 ${hue}), oklch(0.55 0.15 ${(hue + 40) % 360}))` }}>
          {who.replace(/^[^/]*\/\s*/, "").trim()[0] || "?"}
        </div>
        <div className="m-board-body">
          <div className="m-board-head">
            <span className="m-board-who">{who}</span>
            {badge && <span className="m-board-badge" style={{ background: badge.b, color: badge.c }}>{post.badge}</span>}
            <span className="m-board-time">{mbRel(Number(post.ts) || post.ts)}</span>
          </div>
          {post.text && (
            <div className={`m-board-text ${(!expanded && long) ? "clamp" : ""}`} onClick={() => long && setExpanded((v) => !v)}>
              {post.text}
            </div>
          )}
          {long && <button className="m-board-more" onClick={() => setExpanded((v) => !v)}>{expanded ? "閉じる" : "続きを読む"}</button>}
          {thumb && <div className="m-board-thumb" onClick={() => onImg(thumb)}><img src={thumb} alt="" referrerPolicy="no-referrer" /></div>}
          {docs.length > 0 && (
            <div className="m-board-docs">
              {docs.map((f, i) => (
                <a key={i} className="m-board-doc" href={f.href || f.url || "#"} target="_blank" rel="noreferrer">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
                  {f.name}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── 投稿ボトムシート ───────────────────────────────
const MBoardComposer = ({ onClose, onPost }) => {
  const [who, setWho] = React.useState("");
  const [badge, setBadge] = React.useState(MB_DEFAULT_BADGE);
  const [text, setText] = React.useState("");
  const [pending, setPending] = React.useState([]); // {name,type,size,url,isImg}
  const [busy, setBusy] = React.useState(false);
  const fileRef = React.useRef(null);

  const addFiles = async (fileList) => {
    const arr = Array.from(fileList || []);
    if (!arr.length) return;
    const read = (file) => new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res({ name: file.name, type: file.type, size: file.size, url: r.result, isImg: /^image\//.test(file.type) });
      r.readAsDataURL(file);
    });
    const files = await Promise.all(arr.map(read));
    setPending((prev) => [...prev, ...files]);
  };

  const submit = () => {
    if (!text.trim() && pending.length === 0) return;
    setBusy(true);
    onPost({ id: Date.now(), who: who.trim(), badge, text: text.trim(), files: pending, ts: Date.now() });
    onClose();
  };

  return (
    <div className="m-sheet-backdrop" onClick={onClose}>
      <div className="m-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="m-sheet-grab"></div>
        <div className="m-sheet-head">
          <span className="m-sheet-title">共有を投稿</span>
          <button className="m-sheet-close" onClick={onClose}>×</button>
        </div>
        <div className="m-sheet-body">
          <div className="m-field-row">
            <div className="m-field"><label className="m-label">投稿者</label><input className="m-input" placeholder="店舗 / 名前" value={who} onChange={(e) => setWho(e.target.value)} /></div>
            <div className="m-field"><label className="m-label">区分</label>
              <select className="m-input" value={badge} onChange={(e) => setBadge(e.target.value)}>
                {MB_BADGES.map((b) => <option key={b.id} value={b.id}>{b.id}</option>)}
              </select>
            </div>
          </div>
          <div className="m-field"><label className="m-label">内容</label>
            <textarea className="m-input m-textarea" rows="5" placeholder="共有したい内容を入力" value={text} onChange={(e) => setText(e.target.value)}></textarea>
          </div>
          {pending.length > 0 && (
            <div className="m-board-pending">
              {pending.map((f, i) => (
                <div key={i} className="m-board-pend-item">
                  {f.isImg ? <img src={f.url} alt="" /> : <span className="m-board-pend-doc">{f.name}</span>}
                  <button className="m-board-pend-x" onClick={() => setPending((prev) => prev.filter((_, j) => j !== i))}>×</button>
                </div>
              ))}
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          <button className="m-btn m-btn-ghost" style={{ width: "100%" }} onClick={() => fileRef.current && fileRef.current.click()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6, verticalAlign: "-3px" }}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
            写真を追加
          </button>
        </div>
        <div className="m-sheet-foot">
          <button className="m-btn m-btn-ghost" onClick={onClose}>キャンセル</button>
          <button className="m-btn m-btn-primary" onClick={submit} disabled={busy || (!text.trim() && pending.length === 0)}>{busy ? "投稿中…" : "投稿する"}</button>
        </div>
      </div>
    </div>
  );
};

// ── 共有ボード タブ本体 ─────────────────────────────
const MBoard = ({ registerFab, registerHeader }) => {
  const { posts, addPost, cloudOn, state } = useMBoardData();
  const [filter, setFilter] = React.useState("all");
  const [composing, setComposing] = React.useState(false);
  const [lightbox, setLightbox] = React.useState(null);

  React.useEffect(() => {
    registerHeader && registerHeader({ title: "共有ボード", sub: cloudOn ? (state === "ok" ? "☁ 全店で共有中" : state === "loading" ? "☁ 接続中…" : "☁ 端末内のみ") : "端末内のみ" });
    registerFab && registerFab(() => setComposing(true));
    return () => { registerFab && registerFab(null); };
  }, [state]);

  const sorted = [...posts].sort((a, b) => (Number(b.ts) || 0) - (Number(a.ts) || 0));
  const filtered = filter === "all" ? sorted : sorted.filter((p) => p.badge === filter);

  return (
    <div>
      {/* フィルタチップ */}
      <div className="m-chips m-board-chips">
        <button className={`m-chip ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>すべて<span className="m-pr-tabn">{posts.length}</span></button>
        {MB_BADGES.map((b) => {
          const n = posts.filter((p) => p.badge === b.id).length;
          if (n === 0) return null;
          return <button key={b.id} className={`m-chip ${filter === b.id ? "active" : ""}`} onClick={() => setFilter(b.id)}>{b.id}<span className="m-pr-tabn">{n}</span></button>;
        })}
      </div>

      {/* フィード */}
      {filtered.length === 0 ? (
        <div className="m-empty" style={{ marginTop: 40 }}>投稿はまだありません</div>
      ) : (
        <div>
          {filtered.map((p) => <MBoardCard key={String(p.id)} post={p} onImg={setLightbox} />)}
        </div>
      )}
      <div style={{ height: 16 }}></div>

      {composing && <MBoardComposer onClose={() => setComposing(false)} onPost={addPost} />}
      {lightbox && (
        <div className="m-lb" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" referrerPolicy="no-referrer" />
        </div>
      )}
    </div>
  );
};

window.MBoard = MBoard;
