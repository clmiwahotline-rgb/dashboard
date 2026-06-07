// アカウント管理 — 管理者がログイン許可アカウントを追加 / 編集 / 削除
// GAS の listUsers / addUser / updateUser / removeUser を使用（管理者トークン必須）
const AccountsPage = () => {
  const auth = (window.MiwaAuth && window.MiwaAuth.user()) || null;
  const isAdmin = !!(window.MiwaAuth && window.MiwaAuth.isAdmin && window.MiwaAuth.isAdmin());
  const GAS = (window.MIWA_AUTH && window.MIWA_AUTH.GAS_URL) || "";

  const [users, setUsers] = React.useState(null);
  const [err, setErr] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [form, setForm] = React.useState({ email: "", name: "", role: "staff" });
  const [toast, setToast] = React.useState("");

  const post = async (action, extra) => {
    const body = Object.assign({ action, idToken: window.MiwaAuth.idToken() }, extra || {});
    const res = await fetch(GAS, {
      method: "POST", redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
    }).then((r) => r.json()).catch((e) => ({ ok: false, message: String(e) }));
    return res;
  };

  const load = React.useCallback(async () => {
    setErr("");
    const res = await post("listUsers");
    if (res && res.ok) setUsers(res.users || []);
    else { setUsers([]); setErr((res && res.message) || "読み込みに失敗しました"); }
  }, []);

  React.useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  const addUser = async () => {
    const email = form.email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setErr("正しいメールアドレスを入力してください"); return; }
    setBusy(true); setErr("");
    const res = await post("addUser", { user: { email, name: form.name.trim(), role: form.role } });
    setBusy(false);
    if (res && res.ok) { setForm({ email: "", name: "", role: "staff" }); setAdding(false); flash("追加しました"); load(); }
    else setErr((res && res.message) || "追加に失敗しました");
  };

  const toggleActive = async (u) => {
    setBusy(true);
    const res = await post("updateUser", { email: u.email, patch: { active: !isActiveU(u) } });
    setBusy(false);
    if (res && res.ok) { flash("更新しました"); load(); } else setErr((res && res.message) || "更新に失敗しました");
  };

  const changeRole = async (u, role) => {
    setBusy(true);
    const res = await post("updateUser", { email: u.email, patch: { role } });
    setBusy(false);
    if (res && res.ok) { flash("権限を変更しました"); load(); } else setErr((res && res.message) || "更新に失敗しました");
  };

  const removeUser = async (u) => {
    if (!confirm(`「${u.name || u.email}」(${u.email}) を削除します。よろしいですか?`)) return;
    setBusy(true);
    const res = await post("removeUser", { email: u.email });
    setBusy(false);
    if (res && res.ok) { flash("削除しました"); load(); } else setErr((res && res.message) || "削除に失敗しました");
  };

  const isActiveU = (u) => u && (u.active === true || String(u.active).toLowerCase() === "true" || u.active === 1 || u.active === "1");
  const isSelf = (u) => auth && String(u.email).toLowerCase() === String(auth.email).toLowerCase();

  return (
    <div className="app">
      <div className="shell">
        <AppSidebar active="account" />
        <main className="main">
          <div className="greet">
            <div>
              <h1>🔑 アカウント管理</h1>
              <div className="sub">ログインを許可する Google アカウントを管理します ・ {users ? `${users.length} 件` : "—"}</div>
            </div>
            {isAdmin && (
              <div className="right">
                <button className="btn btn-ghost" onClick={load} disabled={busy}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                  更新
                </button>
                <button className="btn btn-primary" onClick={() => { setAdding(true); setErr(""); }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 5v14M5 12h14"/></svg>
                  アカウントを追加
                </button>
              </div>
            )}
          </div>

          {!isAdmin ? (
            <div className="card ac-blocked">
              <div className="ac-blocked-ic">🔒</div>
              <div>
                <div className="ac-blocked-title">このページは管理者のみ利用できます</div>
                <div className="ac-blocked-sub">アカウントの追加・削除が必要な場合は、管理者にご依頼ください。</div>
              </div>
            </div>
          ) : (
            <>
              {err && <div className="ac-err">{err}</div>}

              <div className="ac-note">
                <b>使い方：</b> 社員の Google アカウント（メール）を追加すると、その人がログインできるようになります。
                権限「管理者」はこのページを操作できます。「無効」にすると一時的にログインを止められます（削除しなくてもOK）。
                <a href={encodeURIComponent("サインイン設定手順.html")} style={{ color: "var(--accent-ink)", fontWeight: 700, marginLeft: 6 }}>設定手順を見る</a>
              </div>

              <div className="card ac-table-card">
                <div className="ac-row ac-head">
                  <div className="ac-c-user">ユーザー</div>
                  <div className="ac-c-role">権限</div>
                  <div className="ac-c-status">状態</div>
                  <div className="ac-c-act"></div>
                </div>
                {users === null ? (
                  <div className="ac-empty">読み込み中…</div>
                ) : users.length === 0 ? (
                  <div className="ac-empty">登録されたアカウントがありません</div>
                ) : users.map((u, i) => (
                  <div className="ac-row" key={i}>
                    <div className="ac-c-user">
                      <div className="ac-av">{(u.name || u.email || "?").slice(0, 1)}</div>
                      <div className="ac-user-meta">
                        <div className="ac-user-name">{u.name || "—"}{isSelf(u) && <span className="ac-self">あなた</span>}</div>
                        <div className="ac-user-mail">{u.email}</div>
                      </div>
                    </div>
                    <div className="ac-c-role">
                      <select className="ac-select" value={u.role === "admin" ? "admin" : "staff"}
                              disabled={busy || isSelf(u)} onChange={(e) => changeRole(u, e.target.value)}>
                        <option value="staff">スタッフ</option>
                        <option value="admin">管理者</option>
                      </select>
                    </div>
                    <div className="ac-c-status">
                      <button className={`ac-toggle ${isActiveU(u) ? "on" : "off"}`}
                              disabled={busy || isSelf(u)} onClick={() => toggleActive(u)}>
                        {isActiveU(u) ? "有効" : "無効"}
                      </button>
                    </div>
                    <div className="ac-c-act">
                      <button className="ac-del" disabled={busy || isSelf(u)} title={isSelf(u) ? "自分は削除できません" : "削除"}
                              onClick={() => removeUser(u)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>

      {adding && (
        <div className="modal-backdrop" onClick={() => setAdding(false)}>
          <div className="modal ac-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>アカウントを追加</h3>
              <button className="modal-x" onClick={() => setAdding(false)}>✕</button>
            </div>
            <div className="modal-body">
              <label className="field-label">Google アカウント（メール） <span className="req">必須</span></label>
              <input className="input" type="email" placeholder="例: yamada@gmail.com" value={form.email}
                     onChange={(e) => setForm({ ...form, email: e.target.value })} autoFocus />
              <label className="field-label" style={{ marginTop: 14 }}>名前（表示用）</label>
              <input className="input" type="text" placeholder="例: 山田 太郎" value={form.name}
                     onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <label className="field-label" style={{ marginTop: 14 }}>権限</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="staff">スタッフ（通常）</option>
                <option value="admin">管理者（このページを操作できる）</option>
              </select>
              {err && <div className="ac-err" style={{ marginTop: 12 }}>{err}</div>}
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setAdding(false)}>キャンセル</button>
              <button className="btn btn-primary" onClick={addUser} disabled={busy}>{busy ? "追加中…" : "追加する"}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="ac-toast">{toast}</div>}
    </div>
  );
};
