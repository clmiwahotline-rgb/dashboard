// モバイル版 ─ お知らせ（自社WP）＋ 業界ニュース（localStorage 共有）

const M_NEWS_API = "https://www.cl-miwa.jp/wp-json/wp/v2/posts?per_page=20&_embed=1";
const M_CAT = {
  "news": { l: "お知らせ", c: "#2a6fdb", b: "#e7f0fd" }, "campaign": { l: "キャンペーン", c: "#c5221f", b: "#fde2e2" },
  "openandclosed": { l: "営業日", c: "#1a73e8", b: "#e3f0fd" }, "service": { l: "サービス", c: "#1e8e3e", b: "#e6f4ea" },
  "recruit": { l: "募集", c: "#9a6700", b: "#fef3cd" }, "etc": { l: "お知らせ", c: "#5f6368", b: "#eef0f2" },
};
const mCat = (s) => M_CAT[s] || M_CAT["etc"];
const M_NEWS_SEED = [];
const M_IND_SEED = [];

const mParseWp = (p) => {
  const cats = (p._embedded && p._embedded["wp:term"] && p._embedded["wp:term"][0]) || [];
  const slugs = cats.map((c) => c.slug).filter(Boolean);
  const ex = (p.excerpt && p.excerpt.rendered || "").replace(/<[^>]+>/g, "").replace(/\[&hellip;\]|…|Continue reading.*/g, "").trim().slice(0, 140);
  return { id: p.id, date: (p.date || "").slice(0, 10), title: (p.title && p.title.rendered || "").replace(/&#[0-9]+;/g, (c) => String.fromCharCode(c.slice(2, -1))).replace(/&amp;/g, "&"), link: p.link || "", excerpt: ex, categories: slugs.length ? slugs : ["etc"] };
};
const mNewsDate = (s) => { try { const d = new Date(s); return `${d.getMonth() + 1}/${d.getDate()}`; } catch { return s; } };
const mIndRel = (ts) => { const m = Math.floor((Date.now() - ts) / 60000); if (m < 60) return `${Math.max(1, m)}分前`; const h = Math.floor(m / 60); if (h < 24) return `${h}時間前`; return `${Math.floor(h / 24)}日前`; };

const MNews = ({ registerHeader, registerFab }) => {
  const [sub, setSub] = React.useState("news");
  const [posts, setPosts] = React.useState(() => { try { const s = localStorage.getItem("miwa.news.v1"); if (s) return JSON.parse(s); } catch {} return M_NEWS_SEED; });
  const [loading, setLoading] = React.useState(true);
  const industry = (() => { try { const s = localStorage.getItem("miwa.industry.items.v1"); if (s) { const v = JSON.parse(s); if (Array.isArray(v) && v.length) return v; } } catch {} return M_IND_SEED; })();

  React.useEffect(() => { registerHeader && registerHeader({ title: "お知らせ・ニュース", sub: "" }); registerFab && registerFab(null); }, []);
  React.useEffect(() => {
    let c = false;
    fetch(M_NEWS_API).then((r) => r.json()).then((data) => {
      if (c || !Array.isArray(data)) return;
      const parsed = data.map(mParseWp);
      setPosts(parsed); try { localStorage.setItem("miwa.news.v1", JSON.stringify(parsed)); } catch {}
    }).catch(() => {}).finally(() => { if (!c) setLoading(false); });
    return () => { c = true; };
  }, []);

  const indSorted = [...industry].sort((a, b) => (b.date || 0) - (a.date || 0));
  const indOk = (u) => u && /^https?:\/\//.test(u) && !/google\./.test(u) && !/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u);

  return (
    <div>
      <div className="m-chips" style={{ paddingTop: 2 }}>
        <button className={`m-chip ${sub === "news" ? "active" : ""}`} onClick={() => setSub("news")}>📢 お知らせ</button>
        <button className={`m-chip ${sub === "industry" ? "active" : ""}`} onClick={() => setSub("industry")}>📰 業界ニュース</button>
      </div>

      {sub === "news" ? (
        loading && posts.length === 0 ? <div className="m-loading"><div className="m-spinner"></div>読み込み中…</div> :
        [...posts].sort((a, b) => String(b.date).localeCompare(String(a.date))).map((p) => {
          const cat = mCat((p.categories || [])[0]);
          return (
            <a key={p.id} className="m-news" href={p.link && p.link !== "#" ? p.link : "#"} target="_blank" rel="noopener noreferrer">
              <span className="m-news-date">{mNewsDate(p.date)}</span>
              <div className="m-news-body">
                <span className="m-news-cat" style={{ background: cat.b, color: cat.c }}>{cat.l}</span>
                <div className="m-news-title">{p.title}</div>
                {p.excerpt && <div className="m-news-excerpt">{p.excerpt}</div>}
              </div>
            </a>
          );
        })
      ) : (
        indSorted.map((it, i) => {
          const href = indOk(it.link) ? it.link : `https://search.yahoo.co.jp/search?p=${encodeURIComponent(it.title)}&ei=UTF-8`;
          const src = (it.source && !/google/i.test(it.source)) ? it.source : (it.keyword || "ニュース");
          return (
            <a key={i} className="m-news" href={href} target="_blank" rel="noopener noreferrer">
              <span className="m-news-date" style={{ background: "var(--card-2)", color: "var(--ink-soft)" }}>{i + 1}</span>
              <div className="m-news-body">
                <div className="m-news-title">{it.title}</div>
                <div className="m-news-src">{src} ・ {it.date ? mIndRel(it.date) : ""}</div>
              </div>
            </a>
          );
        })
      )}
      <div style={{ height: 12 }}></div>
    </div>
  );
};

window.MNews = MNews;
