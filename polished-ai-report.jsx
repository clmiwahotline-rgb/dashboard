// AI レポート — メインページ
// 売上・シミ抜き・フィードバック・工場・クレーム・車両・ありがとう・共有ボードは
// 自動計算された構造化ビューを表示（+ 任意で「AIによる考察」を追加生成）。
// シフトのみ、従来通りプロンプト生成 → Claude 文章化のフローを維持する。

const REPORT_SOURCES = [
  { id: "sales", label: "売上レポート", icon: "💰", storage: "miwa.sales.v9", dateKey: "date" },
  { id: "stain", label: "シミ抜き報告", icon: "📊", storage: "miwa.stain.v1", dateKey: "date" },
  { id: "feedback", label: "フィードバック", icon: "💬", storage: "miwa.feedback.v3", dateKey: "reportDate" },
  { id: "factory", label: "工場報告", icon: "🏭", storage: "miwa.factory.v3", dateKey: "date" },
  { id: "claim", label: "クレーム・事故品", icon: "⚠️", storage: "miwa.claim.v1", dateKey: "receivedOn" },
  { id: "vehicle", label: "車両管理", icon: "🚚", storage: "miwa.vehicle.v1", dateKey: "" },
  { id: "thanks", label: "ありがとうカード", icon: "🙏", storage: "miwa.arigatou.v1", dateKey: "date" },
  { id: "board", label: "共有ボード", icon: "📌", storage: "miwa.board.v1", dateKey: "" },
  { id: "shift", label: "シフト", icon: "🗓️", storage: "__shift", dateKey: "",
    getRows: () => {
      const S = (typeof window !== "undefined") && window.SHIFT_2026_06;
      if (!S) return [];
      const out = [];
      S.stores.forEach((s) => (s.staff || []).forEach((st) => out.push({ store: s.store, name: st.name, days: st.days, hours: st.hours })));
      return out;
    },
    fmt: (d) => `【${d.store}】${d.name}/出勤${d.days || 0}日/${d.hours || 0}h` },
  { id: "meeting", label: "会議レポート", icon: "📑", storage: null, dateKey: "date" },
];

// 会議レポートに束ねるソース（この順に印刷される）
const MEETING_IDS = ["sales", "feedback", "claim", "thanks", "stain", "factory"];
const meetingNo = (i) => "①②③④⑤⑥⑦"[i] || `${i + 1}.`;

// シフトのみ従来のプロンプト生成タイプを保持
const SHIFT_REPORT_TYPES = [
  { id: "summary", label: "📊 まとめ", prompt: "拠点別の出勤日数・労働時間を集計し、人員の配置状況を箇条書きでまとめてください。" },
  { id: "balance", label: "⚖️ 負荷の偏り", prompt: "出勤日数・労働時間の偏りや、負荷の高いスタッフ・手薄な拠点を指摘してください。" },
];

const loadSource = (key) => {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : []; } catch { return []; }
};
const getSourceRows = (src) => {
  if (!src) return [];
  if (src.getRows) return src.getRows();
  const v = loadSource(src.storage);
  return Array.isArray(v) ? v : [];
};
const filterByMonth = (src, rows, month) => {
  if (!src.dateKey || !month) return rows;
  return rows.filter((r) => (r[src.dateKey] || "").startsWith(month));
};

// ── Markdown → HTML（AI考察テキスト・レポート全体のエクスポート共通）──
const mdToHtml = (md) => {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = (md || "").split("\n");
  let html = "", inList = false;
  const closeList = () => { if (inList) { html += "</ul>"; inList = false; } };
  for (const raw of lines) {
    let line = esc(raw).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    if (/^\s*#{1,6}\s/.test(raw)) {
      closeList();
      const lvl = Math.min((raw.match(/^\s*#+/)[0].trim().length) + 1, 4);
      html += `<h${lvl}>${line.replace(/^\s*#{1,6}\s/, "")}</h${lvl}>`;
    } else if (/^\s*[-・*]\s+/.test(raw)) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${line.replace(/^\s*[-・*]\s+/, "")}</li>`;
    } else if (/^\s*\d+[.)]\s+/.test(raw)) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${line.replace(/^\s*\d+[.)]\s+/, "")}</li>`;
    } else if (/^\s*$/.test(raw)) {
      closeList();
    } else {
      closeList();
      html += `<p>${line}</p>`;
    }
  }
  closeList();
  return html;
};

const buildReportHtml = (title, sub, body) => `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8"><title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  body { font-family: "Zen Kaku Gothic New", sans-serif; color: #1f2430; background: #fff; line-height: 1.75; max-width: 800px; margin: 0 auto; padding: 48px 40px; }
  .rp-head { border-bottom: 3px solid #2a6fdb; padding-bottom: 16px; margin-bottom: 28px; }
  .rp-brand { font-size: 12px; font-weight: 700; color: #2a6fdb; letter-spacing: .08em; }
  h1 { font-size: 24px; margin: 6px 0 4px; }
  .rp-sub { font-size: 13px; color: #6b7280; }
  h2 { font-size: 18px; margin: 26px 0 10px; padding-left: 10px; border-left: 4px solid #2a6fdb; }
  h3 { font-size: 15px; margin: 18px 0 8px; color: #2a3a5a; }
  h4 { font-size: 13.5px; margin: 14px 0 6px; color: #44506a; }
  p { margin: 8px 0; font-size: 14px; }
  ul { margin: 8px 0; padding-left: 22px; }
  li { font-size: 14px; margin: 4px 0; }
  strong { color: #14306b; }
  .rp-foot { margin-top: 36px; padding-top: 14px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; }
  @media print { body { padding: 24px; } }
</style></head>
<body>
  <div class="rp-head">
    <div class="rp-brand">クリーニングみわ ・ AI レポート</div>
    <h1>${title}</h1>
    <div class="rp-sub">${sub}</div>
  </div>
  <div class="rp-body">${mdToHtml(body)}</div>
  <div class="rp-foot">出力日時: ${new Date().toLocaleString("ja-JP")}</div>
</body></html>`;

const useAiState = (key, initial) => {
  const [v, setV] = React.useState(() => {
    try { const s = localStorage.getItem(key); if (s) return JSON.parse(s); } catch {}
    return typeof initial === "function" ? initial() : initial;
  });
  React.useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }, [key, v]);
  return [v, setV];
};

// 構造化レポート対象ソース（=シフト以外）の compute/markdown 関数マップ
const D = window.AiReportData;
const V = window.AiReportViews;
const STRUCTURED = {
  sales:    { compute: (rows) => D.computeSales(rows), md: (data, month, ctx) => D.salesMarkdown(data, month, ctx.mode === "store" ? (ctx.store || data.stores[0]?.store) : null),
              view: (data, ctx) => <V.SalesStructuredView data={data} mode={ctx.mode} store={ctx.store} setMode={ctx.setMode} setStore={ctx.setStore} /> },
  stain:    { compute: (rows) => D.computeStain(rows), md: (data, month) => D.stainMarkdown(data, month),
              view: (data) => <V.StainStructuredView data={data} /> },
  feedback: { compute: (rows) => D.computeFeedback(rows), md: (data, month) => D.feedbackMarkdown(data, month),
              view: (data) => <V.FeedbackStructuredView data={data} /> },
  factory:  { compute: (rows) => D.computeFactory(rows), md: (data, month) => D.factoryMarkdown(data, month),
              view: (data) => <V.FactoryStructuredView data={data} /> },
  claim:    { compute: (rows) => D.computeClaim(rows), md: (data, month) => D.claimMarkdown(data, month),
              view: (data) => <V.ClaimStructuredView data={data} /> },
  vehicle:  { compute: (rows, extra) => D.computeVehicle(rows, extra.fuel || [], extra.maint || []), md: (data) => D.vehicleMarkdown(data),
              view: (data) => <V.VehicleStructuredView data={data} /> },
  thanks:   { compute: (rows, extra) => D.computeThanks(rows, extra.comments || []), md: (data, month) => D.thanksMarkdown(data, month),
              view: (data) => <V.ThanksStructuredView data={data} /> },
  board:    { compute: (rows) => D.computeBoard(rows), md: (data) => D.boardMarkdown(data),
              view: (data) => <V.BoardStructuredView data={data} /> },
};

const fmtAIDate = (d) => d ? new Date(d).toLocaleString("ja-JP", { dateStyle: "short", timeStyle: "short" }) : "—";

// ── Main page ─────────────────────────────────────────
const AiReportPage = () => {
  const [source, setSource] = useAiState("miwa.ai.source", "sales");
  const [shiftType, setShiftType] = useAiState("miwa.ai.type", "summary");
  const [month, setMonth] = React.useState(() => new Date().toISOString().slice(0, 7));
  const [toast, setToast] = React.useState("");
  const [dark, setDark] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [generated, setGenerated] = React.useState("");
  const [salesMode, setSalesMode] = React.useState("all");
  const [salesStore, setSalesStore] = React.useState("");

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  const isShift = source === "shift";
  const isMeeting = source === "meeting";

  // ── 会議レポート：複数ソースを同一月でまとめて集計 ──
  const meetingSources = React.useMemo(() => MEETING_IDS.map((id) => REPORT_SOURCES.find((s) => s.id === id)), []);
  const meetingAvailableMonths = React.useMemo(() => {
    if (!isMeeting) return [];
    const set = new Set();
    meetingSources.forEach((src) => {
      if (!src.dateKey) return;
      getSourceRows(src).forEach((r) => { const m = (r[src.dateKey] || "").slice(0, 7); if (m) set.add(m); });
    });
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [isMeeting]);

  React.useEffect(() => {
    if (!isMeeting) return;
    setMonth((m) => (meetingAvailableMonths.includes(m) ? m : (meetingAvailableMonths[0] || "")));
  }, [isMeeting, meetingAvailableMonths]);

  const staticSalesCtx = { mode: "all", store: "", setMode: () => {}, setStore: () => {} };
  const meetingSections = React.useMemo(() => {
    if (!isMeeting) return [];
    return MEETING_IDS.map((id, i) => {
      const src = REPORT_SOURCES.find((s) => s.id === id);
      const rows = filterByMonth(src, getSourceRows(src), month);
      const ex = id === "thanks" ? { comments: loadSource("miwa.arigatou.comments.v1") } : {};
      const data = STRUCTURED[id].compute(rows, ex);
      const ctx = id === "sales" ? staticSalesCtx : {};
      const md = STRUCTURED[id].md(data, month, ctx);
      return { id, no: meetingNo(i), src, rows, data, ctx, md };
    });
  }, [isMeeting, month]);

  const currentSource = REPORT_SOURCES.find((s) => s.id === source);
  const sourceRows = React.useMemo(() => (isMeeting ? [] : getSourceRows(currentSource)), [source]);
  const availableMonths = React.useMemo(() => {
    if (isMeeting) return meetingAvailableMonths;
    if (!currentSource.dateKey) return [];
    const set = new Set(sourceRows.map((r) => (r[currentSource.dateKey] || "").slice(0, 7)).filter(Boolean));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [sourceRows, isMeeting, meetingAvailableMonths]);

  React.useEffect(() => {
    setGenerated("");
    if (isMeeting) return;
    const src = REPORT_SOURCES.find((s) => s.id === source);
    if (!src.dateKey) { setMonth(""); return; }
    setMonth((m) => (availableMonths.includes(m) ? m : (availableMonths[0] || "")));
  }, [source]);

  const monthRows = isMeeting ? [] : filterByMonth(currentSource, sourceRows, month);
  const meetingTotalRows = React.useMemo(() => meetingSections.reduce((s, sec) => s + sec.rows.length, 0), [meetingSections]);

  // 追加データ（車両の給油・整備、ありがとうのコメント）
  const extra = React.useMemo(() => {
    if (source === "vehicle") return { fuel: loadSource("miwa.fuel.v1"), maint: loadSource("miwa.maint.v1") };
    if (source === "thanks") return { comments: loadSource("miwa.arigatou.comments.v1") };
    return {};
  }, [source, sourceRows]);

  const structuredDef = (!isShift && !isMeeting) ? STRUCTURED[source] : null;
  const structuredData = React.useMemo(() => {
    if (!structuredDef) return null;
    return structuredDef.compute(monthRows, extra);
  }, [structuredDef, monthRows, extra]);

  const salesCtx = { mode: salesMode, store: salesStore, setMode: setSalesMode, setStore: setSalesStore };
  const structuredMarkdown = React.useMemo(() => {
    if (isMeeting) return meetingSections.map((s) => s.md).join("\n\n");
    if (!structuredDef || !structuredData) return "";
    return structuredDef.md(structuredData, month, salesCtx);
  }, [structuredDef, structuredData, month, salesMode, salesStore, isMeeting, meetingSections]);

  // ── シフト用（従来のプロンプト生成フロー） ──────────
  const buildShiftPrompt = () => {
    const t = SHIFT_REPORT_TYPES.find((x) => x.id === shiftType);
    const summary = monthRows.map(currentSource.fmt).join("\n");
    return `以下はシフトデータです。
${t.prompt}

見出し・箇条書きを使い、管理者がそのまま共有できる読みやすい日本語レポートにしてください。

=== データ (${monthRows.length} 件) ===
${summary}`;
  };

  const generateShift = async () => {
    if (!monthRows.length) { setToast("対象データがありません"); return; }
    setGenerating(true); setGenerated("");
    const prompt = buildShiftPrompt();
    try {
      if (window.claude && typeof window.claude.complete === "function") {
        const result = await window.claude.complete(prompt);
        setGenerated(result);
        setToast("レポートを作成しました");
      } else {
        await navigator.clipboard.writeText(prompt);
        setGenerated(`プロンプトをコピーしました。\n\nClaude.ai を開いて貼り付けてください。\n\n--- プロンプト内容 ---\n${prompt}`);
        setToast("プロンプトをコピーしました");
      }
    } catch (e) {
      setGenerated(`エラー: ${e.message || e}\n\n--- プロンプト ---\n${prompt}`);
      setToast("生成に失敗しました");
    } finally { setGenerating(false); }
  };

  // ── 構造化ソース用：AI による考察を追加生成 ──────────
  const generateInsight = async () => {
    setGenerating(true);
    const label = isMeeting ? "会議レポート（売上・フィードバック・クレーム・ありがとうカード・共有ボード・シミ拜き・工場報告）" : currentSource.label;
    const prompt = `以下は${label}の集計データです。この内容から、経営判断に役立つインサイトや改善提案を、見出し・箇条書きを使って日本語で簡潔にまとめてください。データの再掲は不要です。${isMeeting ? "複数ソースの情報を統合し、経営会議で共有すべき重要トピックを優先してください。" : ""}

=== 集計データ ===
${structuredMarkdown}`;
    try {
      if (window.claude && typeof window.claude.complete === "function") {
        const result = await window.claude.complete(prompt);
        setGenerated(result);
        setToast("AIによる考察を作成しました");
      } else {
        await navigator.clipboard.writeText(prompt);
        setGenerated(`プロンプトをコピーしました。\n\nClaude.ai を開いて貼り付けてください。\n\n--- プロンプト内容 ---\n${prompt}`);
        setToast("プロンプトをコピーしました");
      }
    } catch (e) {
      setGenerated(`エラー: ${e.message || e}`);
      setToast("生成に失敗しました");
    } finally { setGenerating(false); }
  };

  const copyPrompt = async () => {
    const text = isShift ? buildShiftPrompt() : structuredMarkdown;
    await navigator.clipboard.writeText(text);
    setToast("コピーしました");
  };
  const copyResult = async () => {
    if (!generated) return;
    await navigator.clipboard.writeText(generated);
    setToast("結果をコピーしました");
  };

  const reportTitle = () => {
    if (isShift) {
      const t = SHIFT_REPORT_TYPES.find((x) => x.id === shiftType);
      return `${currentSource.label} ・ ${t ? t.label.replace(/^\S+\s/, "") : ""}`;
    }
    if (isMeeting) return "会議レポート";
    return currentSource.label + (source === "sales" && salesMode === "store" && salesStore ? ` ・ ${salesStore}` : "");
  };
  const reportSub = () => isMeeting
    ? `${month ? `${month.slice(0, 4)}年${parseInt(month.slice(5, 7))}月` : "全期間"} ・ 全${MEETING_IDS.length}ソース合計 ${meetingTotalRows} 件`
    : `${(currentSource.dateKey && month) ? `${month.slice(0, 4)}年${parseInt(month.slice(5, 7))}月` : "全期間"} ・ 対象 ${monthRows.length} 件`;

  const exportBody = () => {
    if (isShift) return generated;
    return structuredMarkdown + (generated ? `\n\n## AIによる考察\n\n${generated}` : "");
  };
  const exportPdf = () => {
    const body = exportBody();
    if (!body) return;
    const w = window.open("", "_blank");
    if (!w) { setToast("ポップアップを許可してください"); return; }
    w.document.write(buildReportHtml(reportTitle(), reportSub(), body));
    w.document.close(); w.focus();
    setTimeout(() => { try { w.print(); } catch {} }, 600);
  };
  const exportHtml = () => {
    const body = exportBody();
    if (!body) return;
    const blob = new Blob([buildReportHtml(reportTitle(), reportSub(), body)], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AIレポート_${currentSource.label}_${(isMeeting || (currentSource.dateKey && month)) ? (month || "全期間") : "全期間"}.html`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast("HTMLを保存しました");
  };

  return (
    <div className="app">
      <div className="shell">
        <AppSidebar active="ai-report" />
        <main className="main">
          <div className="greet">
            <div>
              <h1>✨ AI レポート</h1>
              <div className="sub">各データソースを自動集計。必要に応じて AI による考察も追加できます</div>
            </div>
            <div className="right"></div>
          </div>

          {/* Source picker */}
          <div className="card no-print">
            <div className="card-head">
              <h3 className="card-title">1. データソース</h3>
              <span className="card-sub">SOURCE</span>
            </div>
            <div className="ai-source-grid">
              {REPORT_SOURCES.map((s) => {
                const count = s.id === "meeting" ? MEETING_IDS.length : getSourceRows(s).length;
                return (
                  <button key={s.id}
                          className={`ai-source-card ${source === s.id ? "active" : ""}`}
                          onClick={() => setSource(s.id)}>
                    <span className="ai-source-icon">{s.icon}</span>
                    <span className="ai-source-label">{s.label}</span>
                    <span className="ai-source-count">{s.id === "meeting" ? `${count} ソース` : `${count} 件`}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Shift: 従来のタイプ選択＋プロンプト生成 */}
          {isShift && (
            <div className="card">
              <div className="card-head">
                <h3 className="card-title">2. レポートの種類</h3>
                <span className="card-sub">TEMPLATE</span>
              </div>
              <div className="ai-type-pills">
                {SHIFT_REPORT_TYPES.map((t) => (
                  <button key={t.id} className={`ai-type-pill ${shiftType === t.id ? "active" : ""}`} onClick={() => setShiftType(t.id)}>{t.label}</button>
                ))}
              </div>
              <div className="filter-bar" style={{ marginTop: 16 }}>
                <div className="field" style={{ flex: 1 }}>
                  <label className="field-label">対象データ件数</label>
                  <div style={{ padding: "10px 0", fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>{monthRows.length} 件</div>
                </div>
                <div className="actions">
                  <button className="btn btn-ghost" onClick={copyPrompt}>📋 プロンプトのみコピー</button>
                  <button className="btn btn-primary" onClick={generateShift} disabled={generating || !monthRows.length}>
                    {generating ? "生成中..." : "✨ レポート作成"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 構造化ソース（単一）：ツールバー（月フィルタ＋印刷/保存） */}
          {!isShift && !isMeeting && (
            <div className="card no-print" style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {currentSource.dateKey ? (
                  <>
                    <label className="field-label" style={{ margin: 0 }}>対象月</label>
                    <select className="select" style={{ width: 180 }} value={month} onChange={(e) => setMonth(e.target.value)}>
                      <option value="">全期間</option>
                      {availableMonths.map((m) => {
                        const [y, mo] = m.split("-");
                        return <option key={m} value={m}>{y}年{parseInt(mo)}月</option>;
                      })}
                    </select>
                  </>
                ) : (
                  <span style={{ fontSize: 12.5, color: "var(--ink-mute)" }}>全期間</span>
                )}
                <span style={{ fontSize: 12.5, color: "var(--ink-mute)" }}>対象 {monthRows.length} 件</span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost" onClick={() => window.print()} title="この画面のレポートをそのまま印刷・PDF保存">🖨 印刷 / PDF保存</button>
                  <button className="btn btn-ghost" onClick={exportHtml} title="HTMLファイルでダウンロード">HTML保存</button>
                </div>
              </div>
            </div>
          )}

          {/* 会議レポート：ツールバー */}
          {isMeeting && (
            <div className="card no-print" style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <label className="field-label" style={{ margin: 0 }}>対象月</label>
                <select className="select" style={{ width: 180 }} value={month} onChange={(e) => setMonth(e.target.value)}>
                  <option value="">全期間</option>
                  {meetingAvailableMonths.map((m) => {
                    const [y, mo] = m.split("-");
                    return <option key={m} value={m}>{y}年{parseInt(mo)}月</option>;
                  })}
                </select>
                <span style={{ fontSize: 12.5, color: "var(--ink-mute)" }}>{MEETING_IDS.length}ソース合計 {meetingTotalRows} 件</span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost" onClick={() => window.print()} title="この画面のレポートをそのまま印刷・PDF保存">🖨 印刷 / PDF保存</button>
                  <button className="btn btn-ghost" onClick={exportHtml} title="HTMLファイルでダウンロード">HTML保存</button>
                </div>
              </div>
            </div>
          )}

          {/* 印刷時のみのヘッダ */}
          {(!isShift) && (
            <div className="print-only">
              <b>{reportTitle()}</b>
              クリーニングみわ ・ {reportSub()} ・ 出力: {new Date().toLocaleDateString("ja-JP")}
            </div>
          )}

          {/* 構造化レポート本体（単一ソース） */}
          {!isShift && !isMeeting && structuredDef && (
            <>
              {structuredDef.view(structuredData, salesCtx)}

              <div className={"card" + (generated ? "" : " no-print")}>
                <div className="card-head">
                  <h3 className="card-title">✨ AIによる考察</h3>
                </div>
                {generated ? (
                  <>
                    <div className="ai-output">{generated}</div>
                    <div className="no-print" style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button className="btn btn-ghost" onClick={copyResult}>コピー</button>
                      <button className="btn btn-ghost" onClick={generateInsight} disabled={generating}>{generating ? "生成中..." : "🔄 再生成"}</button>
                    </div>
                  </>
                ) : (
                  <button className="btn btn-primary" onClick={generateInsight} disabled={generating || !monthRows.length}>
                    {generating ? "生成中..." : "✨ AIによる考察を追加する"}
                  </button>
                )}
              </div>
            </>
          )}

          {/* 会議レポート本体（複数ソースを順に列挙） */}
          {isMeeting && (
            <>
              {meetingSections.map((sec, i) => (
                <div key={sec.id} className={"meeting-section" + (i >= 3 ? " meeting-section-flow" : "")}>
                  <div className="meeting-section-title">
                    <span>{sec.no}</span> {sec.src.icon} {sec.src.label}
                    <span className="meeting-section-count">{sec.rows.length} 件</span>
                  </div>
                  {STRUCTURED[sec.id].view(sec.data, sec.ctx)}
                </div>
              ))}

              <div className={"card" + (generated ? "" : " no-print")}>
                <div className="card-head">
                  <h3 className="card-title">✨ AIによる総合考察</h3>
                </div>
                {generated ? (
                  <>
                    <div className="ai-output">{generated}</div>
                    <div className="no-print" style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button className="btn btn-ghost" onClick={copyResult}>コピー</button>
                      <button className="btn btn-ghost" onClick={generateInsight} disabled={generating}>{generating ? "生成中..." : "🔄 再生成"}</button>
                    </div>
                  </>
                ) : (
                  <button className="btn btn-primary" onClick={generateInsight} disabled={generating || !meetingTotalRows}>
                    {generating ? "生成中..." : "✨ AIによる総合考察を追加する"}
                  </button>
                )}
              </div>
            </>
          )}

          {/* シフト：生成結果 */}
          {isShift && generated && (
            <div className="card">
              <div className="card-head">
                <h3 className="card-title">3. 生成結果</h3>
                <div className="right" style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost" onClick={exportPdf}>PDF保存</button>
                  <button className="btn btn-ghost" onClick={exportHtml}>HTML保存</button>
                  <button className="btn btn-ghost" onClick={copyResult}>コピー</button>
                </div>
              </div>
              <div className="ai-output">{generated}</div>
            </div>
          )}
        </main>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};

window.AiReportPage = AiReportPage;
