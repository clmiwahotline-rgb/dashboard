// モバイル版 ─ 工場報告（PC版フル機能対応）
// PC版 polished-factory.jsx / polished-factory-atoms.jsx と同じデータ・ロジック
// localStorage: miwa.factory.v3 / miwa.factory.settings.v4
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── 定数 ─────────────────────────────────────────────
const MF_LS_KEY       = "miwa.factory.v3";
const MF_SETTINGS_KEY = "miwa.factory.settings.v4";
const MF_SYNC_KEY     = "miwa.factory.lastSync.v4";
const MF_DEFAULT_URL  = "https://docs.google.com/spreadsheets/d/1vG_IRqtef1ZCiG1MkZgUot4Vrmj59RIfQjhRO4aKDMQ/edit";

const MF_FACTORIES = [
  { id: "all",                    short: "全工場",  color: "var(--accent)" },
  { id: "八潮ドライ工場",           short: "八潮",   color: "var(--accent)" },
  { id: "東川口ワイシャツ工場",     short: "東川口", color: "#34A853" },
];
const MF_DAYS = ["日","月","火","水","木","金","土"];
const mfTotal    = (r) => (r.normalLot||0) + (r.extraLot||0) + (r.advance||0) + (r.storage||0);
const mfDayColor = (d) => { if (!d) return null; const w = new Date(d).getDay(); return w===0?"#ef4444":w===6?"#4285F4":null; };
const mfDayName  = (d) => d ? MF_DAYS[new Date(d).getDay()] : "";
const mfShort    = (f) => f && f.includes("八潮") ? "八潮" : "東川口";
const mfColor    = (f) => f && f.includes("八潮") ? "var(--accent)" : "#34A853";
const mfMembers  = (m) => !m||!m.trim() ? 0 : m.split(/[,、\s]+/).filter(s=>s.trim()).length;
const mfFmtYen   = (n) => "¥" + Math.round(n||0).toLocaleString("ja-JP");
const MF_RATES   = { "八潮ドライ工場": 1260, "東川口ワイシャツ工場": 1160 };

// ── CSV パーサ ────────────────────────────────────────
const mfCsvUrl = (raw) => {
  if (!raw) return "";
  const t = raw.trim();
  if (/output=csv|tqx=out:csv|format=csv/.test(t)) return t;
  const m = t.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]+)/);
  if (!m) return t;
  const gid = (t.match(/[?#&]gid=(\d+)/)||[])[1]||"0";
  return `https://docs.google.com/spreadsheets/d/${m[1]}/gviz/tq?tqx=out:csv&gid=${gid}`;
};
const mfParseCsv = (text) => {
  const rows=[]; let row=[],cur="",q=false;
  for (let i=0;i<text.length;i++){
    const c=text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){cur+='"';i++;}else q=false; }else cur+=c; }
    else if(c==='"')q=true;
    else if(c===','){row.push(cur);cur="";}
    else if(c==='\n'){row.push(cur);rows.push(row);row=[];cur="";}
    else if(c!=='\r')cur+=c;
  }
  if(cur.length||row.length){row.push(cur);rows.push(row);}
  return rows;
};
const mfNum = (v) => { if(v==null||v==="")return 0; const n=parseFloat(String(v).replace(/,/g,"")); return isNaN(n)?0:n; };

const mfImportCsv = (text) => {
  const rows = mfParseCsv(text).filter(r=>r.some(c=>c&&c.trim()));
  if(rows.length<2) return {rows:[],columns:[]};
  const H = rows[0].map(h=>(h||"").replace(/\s+/g," ").trim());
  const idxAll = (kw) => H.map((h,i)=>h.includes(kw)?i:-1).filter(i=>i>=0);
  const idxBy  = (pred) => H.map((h,i)=>pred(h)?i:-1).filter(i=>i>=0);
  const first  = (a) => a.length?a[0]:-1;
  const dateI  = first(idxAll("報告日").concat(idxAll("日付")));
  const facI   = first(idxAll("どちらの工場").concat(idxAll("工場")));
  const tsI    = first(idxAll("タイムスタンプ"));
  const memI   = idxAll("出勤したメンバー").length?idxAll("出勤したメンバー"):idxAll("メンバー");
  const norPrevI  = idxBy(h=>h.includes("通常ロット")&&h.includes("前日"));
  const norTodayI = idxBy(h=>h.includes("通常ロット")&&(h.includes("当日")||h.includes("本日")));
  const norPlainI = idxBy(h=>h.includes("通常ロット")&&!h.includes("前日")&&!h.includes("当日")&&!h.includes("本日"));
  const norI   = norPrevI.length?norPrevI:norPlainI;
  const extI   = idxAll("ロット外");
  const advI   = idxAll("先付け");
  const stoI   = idxAll("保管処理");
  const hrI    = idxAll("合計時間").length?idxAll("合計時間"):idxAll("時間");
  const noteI  = idxAll("自由報告").length?idxAll("自由報告"):idxAll("その他");
  const out=[];
  for(let ri=1;ri<rows.length;ri++){
    const r=rows[ri];
    const cell=(i)=>(i>=0&&i<r.length)?r[i]:"";
    const factory=String(cell(facI)||"").trim();
    if(!factory)continue;
    const isY=factory.includes("八潮")||factory.includes("ドライ");
    const b=isY?0:1;
    const at=(arr)=>arr.length?cell(arr[Math.min(b,arr.length-1)]):"";
    let date="";
    const dateRaw=cell(dateI);
    if(dateRaw){const d=new Date(dateRaw);if(!isNaN(d)){const j=new Date(d.getTime()+9*3600*1000);date=j.toISOString().slice(0,10);}else date=String(dateRaw).slice(0,10);}
    if(!date)continue;
    let ts="";const tsRaw=cell(tsI);
    if(tsRaw){const d=new Date(tsRaw);if(!isNaN(d))ts=d.toLocaleString("ja-JP",{timeZone:"Asia/Tokyo"});}
    out.push({
      timestamp:ts,date,factory,reportID:date+"_"+factory,
      members:String(at(memI)||""),
      normalLot:mfNum(at(norI)),normalLotToday:mfNum(at(norTodayI)),
      extraLot:mfNum(at(extI)),advance:mfNum(at(advI)),
      storage:isY?mfNum(at(stoI)):null,
      hours:mfNum(at(hrI)),note:String(at(noteI)||""),
    });
  }
  return {rows:out,columns:H};
};

// ── localStorage フック ────────────────────────────────
const useMFState = (key, initial) => {
  const [v, setV] = React.useState(() => {
    try { const s=localStorage.getItem(key); if(s)return JSON.parse(s); } catch{}
    return typeof initial==="function"?initial():initial;
  });
  React.useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(v));}catch{}}, [key,v]);
  return [v,setV];
};

// ── トースト ─────────────────────────────────────────
const MFToast = ({msg, onDone}) => {
  React.useEffect(()=>{
    if(!msg)return;
    const t=setTimeout(onDone,2400);
    return()=>clearTimeout(t);
  },[msg,onDone]);
  if(!msg)return null;
  return (
    <div style={{
      position:"fixed",bottom:"calc(env(safe-area-inset-bottom,0px) + 80px)",left:"50%",
      transform:"translateX(-50%)",zIndex:200,
      background:"rgba(20,20,30,.88)",color:"#fff",fontSize:13,fontWeight:700,
      padding:"10px 20px",borderRadius:24,whiteSpace:"nowrap",
      boxShadow:"0 4px 20px rgba(0,0,0,.28)",backdropFilter:"blur(6px)"
    }}>{msg}</div>
  );
};

// ── 未提出アラート ────────────────────────────────────
const MFAlert = ({rows}) => {
  const y=rows.filter(r=>r.factory==="八潮ドライ工場").map(r=>r.date).sort();
  const h=rows.filter(r=>r.factory==="東川口ワイシャツ工場").map(r=>r.date).sort();
  const yL=y[y.length-1], hL=h[h.length-1];
  if(!yL||!hL||yL===hL)return null;
  const miss=yL>hL?{factory:"東川口ワイシャツ工場",last:hL,other:yL}:{factory:"八潮ドライ工場",last:yL,other:hL};
  return (
    <div style={{
      background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:14,
      padding:"10px 14px",marginBottom:12,display:"flex",gap:10,alignItems:"flex-start"
    }}>
      <span style={{fontSize:16,flexShrink:0}}>⚠️</span>
      <div>
        <div style={{fontSize:12.5,fontWeight:800,color:"#92400e"}}>報告未提出の可能性</div>
        <div style={{fontSize:11.5,color:"#78350f",marginTop:2,lineHeight:1.5}}>
          <strong>{mfShort(miss.factory)}</strong> の最終報告は {miss.last}（{mfDayName(miss.last)}）<br/>
          もう一方は {miss.other}（{mfDayName(miss.other)}）まで提出済み
        </div>
      </div>
    </div>
  );
};

// ── KPI グリッド ──────────────────────────────────────
const MFKpi = ({rows, selectedFactory, latestDate}) => {
  const pd = rows.filter(r=>r.date===latestDate);
  const sum = (k) => pd.reduce((s,r)=>s+(r[k]||0),0);
  const total  = pd.reduce((s,r)=>s+mfTotal(r),0);
  const hours  = sum("hours");
  const members= pd.reduce((s,r)=>s+mfMembers(r.members),0);
  const cost   = pd.reduce((s,r)=>s+Math.round(r.hours*(MF_RATES[r.factory]||1200)),0);
  const prod   = hours>0?(total/hours).toFixed(1):"0";
  const perPt  = total>0?Math.round(cost/total):0;
  const isH    = selectedFactory==="東川口ワイシャツ工場";

  const cards = [
    {label:"総点数",          v:total.toLocaleString(),             u:"点",  c:"var(--ink)"},
    {label:"前日通常",         v:sum("normalLot").toLocaleString(), u:"点",  c:"var(--accent)"},
    {label:"当日通常",         v:sum("normalLotToday").toLocaleString(), u:"点", c:"#7C4DFF"},
    {label:"ロット外",         v:sum("extraLot").toLocaleString(),  u:"点",  c:"#4285F4"},
    {label:"先付け",           v:sum("advance").toLocaleString(),   u:"点",  c:"#34A853"},
    {label:"保管処理",         v:isH?"—":sum("storage").toLocaleString(), u:isH?"":"点", c:"#34A853"},
    {label:"稼働時間",         v:(hours||0).toFixed(2),             u:"h",   c:"#EA4335"},
    {label:"人件費目安",        v:mfFmtYen(cost),                    u:"",    c:"#EA4335"},
    {label:"生産性",           v:prod,                               u:"点/h",c:"var(--accent)"},
    {label:"1点単価",          v:perPt>0?mfFmtYen(perPt):"—",       u:"",    c:"var(--accent)"},
  ];

  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:14}}>
      {cards.map((c,i)=>(
        <div key={i} style={{
          background:"var(--card)",border:"1px solid var(--line)",borderRadius:14,
          padding:"10px 12px",borderTop:`3px solid ${c.c}`
        }}>
          <div style={{fontSize:10.5,fontWeight:700,color:"var(--ink-mute)",marginBottom:4}}>{c.label}</div>
          <div style={{fontSize:18,fontWeight:800,color:"var(--ink)",lineHeight:1}}>
            {c.v}<span style={{fontSize:11,fontWeight:600,color:"var(--ink-mute)",marginLeft:2}}>{c.u}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── 日別バーチャート ──────────────────────────────────
const MFBarChart = ({rows, valueFn, color, unit, formatVal}) => {
  if(!rows||rows.length===0) return <div style={{padding:24,textAlign:"center",fontSize:12,color:"var(--ink-mute)"}}>データなし</div>;
  const dates=[...new Set(rows.map(r=>r.date).filter(d=>d))].sort();
  if(!dates.length) return null;
  const vals=dates.map(d=>({date:d,value:rows.filter(r=>r.date===d).reduce((s,r)=>s+valueFn(r),0)}));
  const max=Math.max(...vals.map(v=>v.value),1);
  const w=600,h=160,pL=34,pR=8,pT=20,pB=32;
  const iW=w-pL-pR,iH=h-pT-pB;
  const bW=Math.max(8,Math.min(40,iW/vals.length-4));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{width:"100%",height:140,display:"block"}}>
      {[0,0.5,1].map(p=>{
        const y=pT+iH-p*iH;
        return (
          <g key={p}>
            <line x1={pL} x2={w-pR} y1={y} y2={y} stroke="var(--line)" strokeDasharray="2 4"/>
            <text x={pL-4} y={y+3} fontSize="8" fill="var(--ink-mute)" textAnchor="end">
              {formatVal?formatVal(max*p):Math.round(max*p)}
            </text>
          </g>
        );
      })}
      {vals.map((v,i)=>{
        const cx=pL+(iW/vals.length)*(i+0.5);
        const bH=(v.value/max)*iH;
        const y=pT+iH-bH;
        const dc=mfDayColor(v.date);
        const disp=formatVal?formatVal(v.value):(Number.isInteger(v.value)?v.value:v.value.toFixed(1));
        return (
          <g key={v.date}>
            <rect x={cx-bW/2} y={y} width={bW} height={Math.max(2,bH)} fill={color} rx="3" opacity="0.9">
              <title>{`${v.date}(${mfDayName(v.date)}): ${disp}${unit||""}`}</title>
            </rect>
            <text x={cx} y={y-4} fontSize="8" fill="var(--ink-soft)" textAnchor="middle" fontWeight="600">{disp}</text>
            <text x={cx} y={h-18} fontSize="8" fill="var(--ink-mute)" textAnchor="middle">{v.date.slice(5)}</text>
            <text x={cx} y={h-6} fontSize="7.5" fill={dc||"var(--ink-mute)"} textAnchor="middle" fontWeight="600">({mfDayName(v.date)})</text>
          </g>
        );
      })}
    </svg>
  );
};

// ── 工場別比較 ────────────────────────────────────────
const MFComparison = ({rows}) => {
  const allDates=[...new Set(rows.map(r=>r.date))].sort();
  const weekDates=allDates.slice(-7);
  const period=weekDates.length?`${weekDates[0]} 〜 ${weekDates[weekDates.length-1]}`:"—";
  const sections=[
    {name:"八潮ドライ工場",     short:"八潮",   color:"var(--accent)",  hasStorage:true},
    {name:"東川口ワイシャツ工場",short:"東川口", color:"#34A853",        hasStorage:false},
  ];
  return (
    <div>
      <div style={{fontSize:10.5,color:"var(--ink-mute)",marginBottom:10}}>{period}（直近7日平均）</div>
      {sections.map(f=>{
        const fd=rows.filter(r=>r.factory===f.name&&weekDates.includes(r.date));
        const days=new Set(fd.map(r=>r.date)).size||1;
        const nl=fd.reduce((s,r)=>s+r.normalLot,0)/days;
        const nt=fd.reduce((s,r)=>s+(r.normalLotToday||0),0)/days;
        const el=fd.reduce((s,r)=>s+r.extraLot,0)/days;
        const ad=fd.reduce((s,r)=>s+r.advance,0)/days;
        const st=fd.reduce((s,r)=>s+(r.storage||0),0)/days;
        const tot=nl+el+ad+st;
        const hr=fd.reduce((s,r)=>s+r.hours,0)/days;
        const totHr=fd.reduce((s,r)=>s+r.hours,0);
        const totPt=fd.reduce((s,r)=>s+mfTotal(r),0);
        const maxV=Math.max(nl,nt,el,ad,st,1);
        const bar=(label,val)=>{
          const pct=(val/maxV)*100;
          return (
            <div key={label} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <div style={{width:52,fontSize:10.5,color:"var(--ink-mute)",fontWeight:600,flexShrink:0}}>{label}</div>
              <div style={{flex:1,height:10,background:"var(--bg-2,#eef0f3)",borderRadius:5,overflow:"hidden"}}>
                <div style={{width:`${pct}%`,height:"100%",background:f.color,borderRadius:5}}></div>
              </div>
              <div style={{width:36,fontSize:11,fontWeight:700,color:"var(--ink)",textAlign:"right"}}>{Math.round(val*10)/10}</div>
            </div>
          );
        };
        return (
          <div key={f.name} style={{marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:800,color:f.color,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
              <span style={{width:8,height:8,borderRadius:999,background:f.color,display:"inline-block"}}></span>
              {f.name}
              <span style={{fontSize:10.5,color:"var(--ink-mute)",fontWeight:500}}>{days}日間</span>
            </div>
            <div style={{fontSize:14,fontWeight:800,color:f.color,marginBottom:8}}>
              総点数 {Math.round(tot*10)/10}<span style={{fontSize:11,fontWeight:500,color:"var(--ink-mute)",marginLeft:3}}>点/日</span>
            </div>
            {bar("前日通常",Math.round(nl*10)/10)}
            {bar("当日通常",Math.round(nt*10)/10)}
            {bar("ロット外",Math.round(el*10)/10)}
            {bar("先付け",Math.round(ad*10)/10)}
            {f.hasStorage&&bar("保管処理",Math.round(st*10)/10)}
            <div style={{fontSize:11,color:"var(--ink-mute)",marginTop:6}}>
              平均稼働 <strong style={{color:"var(--ink)"}}>{(hr||0).toFixed(2)}h/日</strong>
              <span style={{margin:"0 6px"}}>·</span>
              生産性 <strong style={{color:"var(--ink)"}}>{totHr>0?(totPt/totHr).toFixed(1):"0"}点/h</strong>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── 報告一覧テーブル ─────────────────────────────────
const MFTable = ({rows, showCount, onShowMore, onEdit}) => {
  const sorted=[...rows].sort((a,b)=>{
    const d=(b.date||"").localeCompare(a.date||"");
    return d!==0?d:(b.timestamp||"").localeCompare(a.timestamp||"");
  });
  const showing=sorted.slice(0,showCount);
  return (
    <div>
      <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5,minWidth:520}}>
          <thead>
            <tr style={{background:"var(--bg-2,#eef0f3)"}}>
              {["日付","曜","工場","人数","前日通","当日通","外","先付","保管","合計","時間","修正"].map(h=>(
                <th key={h} style={{padding:"7px 6px",fontWeight:700,color:"var(--ink-mute)",textAlign:"center",fontSize:10.5,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {showing.length===0&&(
              <tr><td colSpan="12" style={{padding:24,textAlign:"center",color:"var(--ink-mute)"}}>データがありません</td></tr>
            )}
            {showing.map((r,i)=>{
              const tp=mfTotal(r);
              const dc=mfDayColor(r.date);
              const isY=(r.factory||"").includes("八潮");
              return (
                <tr key={(r.reportID||i)+i} style={{borderBottom:"1px solid var(--line)"}}>
                  <td style={{padding:"7px 6px",textAlign:"center",fontWeight:700,fontSize:11,fontFamily:"ui-monospace,monospace",whiteSpace:"nowrap"}}>{(r.date||"").slice(5)}</td>
                  <td style={{padding:"7px 4px",textAlign:"center",fontWeight:700,color:dc||"var(--ink-soft)"}}>{mfDayName(r.date)}</td>
                  <td style={{padding:"7px 5px",textAlign:"center"}}>
                    <span style={{
                      fontSize:10,fontWeight:800,padding:"2px 6px",borderRadius:6,
                      background:isY?"var(--accent-soft)":"rgba(52,168,83,.14)",
                      color:isY?"var(--accent-ink)":"#1e8e3e"
                    }}>{mfShort(r.factory)}</span>
                  </td>
                  <td style={{padding:"7px 5px",textAlign:"center"}}>{mfMembers(r.members)}名</td>
                  <td style={{padding:"7px 6px",textAlign:"right",fontWeight:700,fontFamily:"ui-monospace,monospace"}}>{r.normalLot||0}</td>
                  <td style={{padding:"7px 6px",textAlign:"right",color:"#7C4DFF",fontFamily:"ui-monospace,monospace"}}>{r.normalLotToday||0}</td>
                  <td style={{padding:"7px 6px",textAlign:"right",fontFamily:"ui-monospace,monospace"}}>{r.extraLot||0}</td>
                  <td style={{padding:"7px 6px",textAlign:"right",fontFamily:"ui-monospace,monospace"}}>{r.advance||0}</td>
                  <td style={{padding:"7px 6px",textAlign:"right",color:r.storage==null?"var(--ink-faint)":"var(--ink)",fontFamily:"ui-monospace,monospace"}}>{r.storage??"—"}</td>
                  <td style={{padding:"7px 6px",textAlign:"right",fontWeight:800,fontFamily:"ui-monospace,monospace"}}>{tp}</td>
                  <td style={{padding:"7px 6px",textAlign:"right",fontFamily:"ui-monospace,monospace"}}>{(r.hours||0).toFixed(1)}h</td>
                  <td style={{padding:"7px 6px",textAlign:"center"}}>
                    <button
                      onClick={()=>onEdit(r)}
                      style={{
                        width:30,height:30,border:"1px solid var(--line)",borderRadius:8,
                        background:"var(--card)",cursor:"pointer",display:"inline-flex",
                        alignItems:"center",justifyContent:"center",color:"var(--ink-mute)"
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {sorted.length>showCount&&(
        <div style={{textAlign:"center",marginTop:12}}>
          <button
            onClick={onShowMore}
            style={{
              border:"1px solid var(--line)",borderRadius:10,padding:"8px 20px",
              background:"var(--card)",fontSize:12.5,fontWeight:700,color:"var(--ink-mute)",cursor:"pointer"
            }}
          >さらに表示（残り{sorted.length-showCount}件）</button>
        </div>
      )}
    </div>
  );
};

// ── 編集モーダル ─────────────────────────────────────
const MFEditModal = ({open, record, onSave, onClose}) => {
  // 数値フィールドを文字列として管理（入力中に0リセットされないよう）
  const [form, setForm] = React.useState({});
  React.useEffect(()=>{
    if(!record)return;
    setForm({
      normalLot:     String(record.normalLot??0),
      normalLotToday:String(record.normalLotToday??0),
      extraLot:      String(record.extraLot??0),
      advance:       String(record.advance??0),
      storage:       String(record.storage??0),
      hours:         String(record.hours??0),
      members:       record.members||"",
      note:          record.note||"",
    });
  },[record]);

  if(!open||!record)return null;
  const isY=(record.factory||"").includes("八潮");

  const numField = (label, key, isDecimal=false) => (
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      <div style={{fontSize:11,fontWeight:700,color:"var(--ink-mute)",letterSpacing:".02em"}}>{label}</div>
      <input
        type="text"
        inputMode={isDecimal?"decimal":"numeric"}
        value={form[key]??""}
        onChange={e=>{
          const v=e.target.value;
          if(/^-?\d*\.?\d*$/.test(v))setForm({...form,[key]:v});
        }}
        onBlur={e=>{
          const v=parseFloat(e.target.value);
          setForm({...form,[key]:String(isNaN(v)?0:v)});
        }}
        style={{
          padding:"11px 12px",border:"1.5px solid var(--line)",borderRadius:12,
          fontSize:17,fontFamily:"inherit",background:"var(--bg)",color:"var(--ink)",
          boxSizing:"border-box",width:"100%",fontWeight:600
        }}
      />
    </div>
  );

  const handleSave = () => {
    onSave({
      ...record,
      normalLot:      parseFloat(form.normalLot)||0,
      normalLotToday: parseFloat(form.normalLotToday)||0,
      extraLot:       parseFloat(form.extraLot)||0,
      advance:        parseFloat(form.advance)||0,
      storage:        isY?(parseFloat(form.storage)||0):record.storage,
      hours:          parseFloat(form.hours)||0,
      members:        form.members,
      note:           form.note,
    });
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position:"fixed",inset:0,zIndex:200,
        background:"rgba(0,0,0,.5)",display:"flex",flexDirection:"column",justifyContent:"flex-end",
        backdropFilter:"blur(2px)"
      }}
    >
      <div
        onClick={e=>e.stopPropagation()}
        style={{
          width:"100%",maxWidth:520,margin:"0 auto",
          background:"var(--card)",borderRadius:"20px 20px 0 0",
          maxHeight:"92dvh",display:"flex",flexDirection:"column"
        }}
      >
        {/* ── 固定ヘッダー ── */}
        <div style={{flexShrink:0,padding:"12px 20px 14px",borderBottom:"1px solid var(--line)"}}>
          <div style={{width:36,height:4,borderRadius:2,background:"#c8ccd4",margin:"0 auto 14px"}}></div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{
              width:38,height:38,borderRadius:11,flexShrink:0,
              background:"var(--accent-soft)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18
            }}>📝</div>
            <div>
              <div style={{fontSize:16,fontWeight:800,color:"var(--ink)",lineHeight:1.2}}>報告内容を修正</div>
              <div style={{fontSize:12,color:"var(--ink-mute)",marginTop:2,display:"flex",alignItems:"center",gap:6}}>
                <span style={{
                  fontSize:10.5,fontWeight:700,padding:"2px 7px",borderRadius:6,
                  background:isY?"var(--accent-soft)":"rgba(52,168,83,.14)",
                  color:isY?"var(--accent-ink)":"#1e8e3e"
                }}>{mfShort(record.factory)}</span>
                {record.date}（{mfDayName(record.date)}）
              </div>
            </div>
          </div>
        </div>

        {/* ── スクロール本体 ── */}
        <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:"18px 20px 8px"}}>
          <div style={{fontSize:10.5,fontWeight:800,color:"var(--ink-mute)",letterSpacing:".08em",marginBottom:10}}>点数（点）</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}>
            {numField("前日通常ロット","normalLot")}
            {numField("当日通常ロット","normalLotToday")}
            {numField("ロット外","extraLot")}
            {numField("先付け処理","advance")}
            {isY&&numField("保管処理","storage")}
          </div>

          <div style={{fontSize:10.5,fontWeight:800,color:"var(--ink-mute)",letterSpacing:".08em",marginBottom:10}}>稼働</div>
          <div style={{marginBottom:18}}>
            {numField("合計稼働時間（h）","hours",true)}
          </div>

          <div style={{fontSize:10.5,fontWeight:800,color:"var(--ink-mute)",letterSpacing:".08em",marginBottom:10}}>出勤メンバー</div>
          <div style={{marginBottom:18}}>
            <input
              type="text"
              value={form.members||""}
              onChange={e=>setForm({...form,members:e.target.value})}
              placeholder="名前, 名前, …"
              style={{
                width:"100%",padding:"11px 12px",border:"1.5px solid var(--line)",borderRadius:12,
                fontSize:14,fontFamily:"inherit",background:"var(--bg)",color:"var(--ink)",
                boxSizing:"border-box"
              }}
            />
          </div>

          <div style={{fontSize:10.5,fontWeight:800,color:"var(--ink-mute)",letterSpacing:".08em",marginBottom:10}}>自由報告</div>
          <div style={{marginBottom:14}}>
            <textarea
              rows={3}
              value={form.note||""}
              onChange={e=>setForm({...form,note:e.target.value})}
              style={{
                width:"100%",padding:"11px 12px",border:"1.5px solid var(--line)",
                borderRadius:12,fontSize:13,fontFamily:"inherit",resize:"none",
                background:"var(--bg)",color:"var(--ink)",boxSizing:"border-box",lineHeight:1.6
              }}
            />
          </div>

          <div style={{fontSize:11,color:"var(--ink-mute)",background:"var(--bg-2,#eef0f3)",borderRadius:10,padding:"9px 12px",marginBottom:4,lineHeight:1.5}}>
            ⚠️ 修正はローカル保存です。次回同期で最新データに上書きされます。
          </div>
        </div>

        {/* ── 固定フッター ── */}
        <div style={{
          flexShrink:0,padding:"12px 20px calc(env(safe-area-inset-bottom,0px) + 16px)",
          borderTop:"1px solid var(--line)",display:"flex",gap:10
        }}>
          <button onClick={onClose}
            style={{flex:1,padding:"13px",border:"1.5px solid var(--line)",borderRadius:14,
              background:"var(--bg)",fontSize:14,fontWeight:700,color:"var(--ink-mute)",cursor:"pointer"}}
          >キャンセル</button>
          <button onClick={handleSave}
            style={{flex:2,padding:"13px",border:"none",borderRadius:14,
              background:"var(--accent)",fontSize:14,fontWeight:800,color:"#fff",cursor:"pointer"}}
          >保存する</button>
        </div>
      </div>
    </div>
  );
};

// ── 設定モーダル ─────────────────────────────────────
const MFSettingsModal = ({open, settings, onSave, onClose, onSyncNow, lastSync, lastError, syncing, diag}) => {
  const [url, setUrl] = React.useState(settings.url||"");
  const [autoSync, setAutoSync] = React.useState(settings.autoSync!==false);
  React.useEffect(()=>{setUrl(settings.url||"");setAutoSync(settings.autoSync!==false);},[settings,open]);
  if(!open)return null;
  return (
    <div
      onClick={onClose}
      style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"flex-end",backdropFilter:"blur(2px)"}}
    >
      <div
        onClick={e=>e.stopPropagation()}
        style={{
          width:"100%",maxWidth:520,margin:"0 auto",
          background:"var(--card)",borderRadius:"20px 20px 0 0",
          padding:"20px 18px calc(env(safe-area-inset-bottom,0px)+20px)",
          maxHeight:"90dvh",overflowY:"auto"
        }}
      >
        <div style={{width:40,height:4,borderRadius:2,background:"var(--line)",margin:"0 auto 16px"}}></div>
        <div style={{fontSize:16,fontWeight:800,color:"var(--ink)",marginBottom:18}}>⚙️ 同期設定</div>

        <div style={{marginBottom:14}}>
          <div style={{fontSize:11.5,fontWeight:700,color:"var(--ink-mute)",marginBottom:6}}>
            GAS Web App URL ／ 回答スプレッドシート URL
          </div>
          <textarea
            rows={3}
            value={url}
            onChange={e=>setUrl(e.target.value)}
            placeholder="https://script.google.com/.../exec または https://docs.google.com/spreadsheets/d/.../edit"
            style={{
              width:"100%",padding:"10px 12px",border:"1.5px solid var(--line)",
              borderRadius:10,fontSize:12,fontFamily:"inherit",resize:"none",
              background:"var(--bg)",color:"var(--ink)",boxSizing:"border-box"
            }}
          />
          <div style={{fontSize:10.5,color:"var(--ink-mute)",marginTop:6,lineHeight:1.6}}>
            八潮の数値が0になる場合は、回答スプレッドシートのURLをそのまま貼ると正しく取り込めます。<br/>
            シートを「リンクを知っている全員 · 閲覧者」で共有してください。
          </div>
        </div>

        <div style={{marginBottom:16}}>
          <div style={{fontSize:11.5,fontWeight:700,color:"var(--ink-mute)",marginBottom:6}}>自動更新</div>
          <div style={{display:"flex",gap:8}}>
            {[{v:true,label:"1時間ごとに自動更新"},{v:false,label:"手動のみ"}].map(opt=>(
              <button
                key={String(opt.v)}
                onClick={()=>setAutoSync(opt.v)}
                style={{
                  flex:1,padding:"9px 12px",borderRadius:10,fontSize:12.5,fontWeight:700,cursor:"pointer",
                  border:autoSync===opt.v?"2px solid var(--accent)":"1.5px solid var(--line)",
                  background:autoSync===opt.v?"var(--accent-soft)":"var(--bg)",
                  color:autoSync===opt.v?"var(--accent-ink)":"var(--ink-mute)"
                }}
              >{opt.label}</button>
            ))}
          </div>
        </div>

        <button
          onClick={onSyncNow}
          disabled={!url||syncing}
          style={{
            width:"100%",padding:"12px",border:"1.5px solid var(--line)",borderRadius:12,
            background:"var(--bg)",fontSize:13,fontWeight:700,color:"var(--ink-mute)",
            cursor:(!url||syncing)?"not-allowed":"pointer",marginBottom:12,
            display:"flex",alignItems:"center",justifyContent:"center",gap:8
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={syncing?{animation:"mfSpin 1s linear infinite"}:null}>
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          {syncing?"同期中...":"今すぐ同期"}
        </button>

        <div style={{fontSize:11,color:"var(--ink-mute)",marginBottom:8,lineHeight:1.6}}>
          {lastSync?`最終更新: ${new Date(lastSync).toLocaleString("ja-JP")}`:"未同期"}
          {lastError&&<div style={{color:"#dc2626",marginTop:4}}>⚠ {lastError}</div>}
        </div>

        {diag&&diag.columns&&diag.columns.length>0&&(
          <details style={{marginBottom:16,fontSize:11,color:"var(--ink-mute)"}}>
            <summary style={{cursor:"pointer",fontWeight:700}}>
              受信した列名（{diag.count}行 · {diag.columns.length}列）
            </summary>
            <div style={{marginTop:6,lineHeight:1.8,maxHeight:140,overflowY:"auto",background:"var(--bg-2,#eef0f3)",borderRadius:8,padding:"8px 10px",fontFamily:"ui-monospace,monospace"}}>
              {diag.columns.map((c,i)=><div key={i}>{i+1}. {c}</div>)}
            </div>
          </details>
        )}

        <div style={{display:"flex",gap:10}}>
          <button onClick={onClose}
            style={{flex:1,padding:"12px",border:"1.5px solid var(--line)",borderRadius:12,background:"var(--bg)",fontSize:13,fontWeight:700,color:"var(--ink-mute)",cursor:"pointer"}}
          >キャンセル</button>
          <button onClick={()=>{onSave({url,autoSync,intervalH:1});onClose();}}
            style={{flex:2,padding:"12px",border:"none",borderRadius:12,background:"var(--accent)",fontSize:13,fontWeight:800,color:"#fff",cursor:"pointer"}}
          >保存</button>
        </div>
      </div>
    </div>
  );
};

// ── メイン ─────────────────────────────────────────────
const MFactory = ({registerHeader, registerFab}) => {
  const [rows,     setRows]     = useMFState(MF_LS_KEY, []);
  const [settings, setSettings] = useMFState(MF_SETTINGS_KEY, ()=>({url:MF_DEFAULT_URL,autoSync:true,intervalH:1}));
  const [lastSync, setLastSync] = useMFState(MF_SYNC_KEY, null);
  const [lastError, setLastError] = React.useState("");
  const [diag,    setDiag]     = React.useState(null);
  const [syncing,  setSyncing]  = React.useState(false);
  const [factory,  setFactory]  = React.useState("all");
  const [showSettings, setShowSettings] = React.useState(false);
  const [showEdit, setShowEdit] = React.useState(false);
  const [editRecord, setEditRecord] = React.useState(null);
  const [toast,    setToast]    = React.useState("");
  const [showCount, setShowCount] = React.useState(20);

  // 同期
  const syncNow = React.useCallback(async () => {
    if(!settings.url)return;
    setSyncing(true);
    setLastError("");
    try {
      const isSheet=/docs\.google\.com\/spreadsheets/.test(settings.url)||/output=csv|tqx=out:csv/.test(settings.url);
      let parsed,columns;
      if(isSheet){
        const res=await fetch(mfCsvUrl(settings.url),{redirect:"follow"});
        if(!res.ok)throw new Error("HTTP "+res.status+"（シートを「リンクを知っている全員・閲覧者」で共有してください）");
        const text=await res.text();
        ({rows:parsed,columns}=mfImportCsv(text));
      } else {
        const res=await fetch(settings.url,{redirect:"follow"});
        if(!res.ok)throw new Error("HTTP "+res.status);
        const raw=await res.json();
        if(raw&&raw.error)throw new Error(raw.message||"GAS error");
        if(!Array.isArray(raw))throw new Error("応答が配列ではありません");
        columns=raw.length?Object.keys(raw[0]):[];
        parsed=raw.map(r=>{
          const factory=r["どちらの工場"]||r["工場名"]||r["工場"]||"";
          if(!factory)return null;
          const isY=factory.includes("八潮")||factory.includes("ドライ");
          const dateRaw=r["報告日"]||r["日付"]||"";
          let date="";
          if(dateRaw){const d=new Date(dateRaw);if(!isNaN(d)){const j=new Date(d.getTime()+9*3600*1000);date=j.toISOString().slice(0,10);}else date=String(dateRaw).slice(0,10);}
          if(!date)return null;
          return {date,factory,reportID:date+"_"+factory,
            members:String(r["出勤したメンバー"]||""),
            normalLot:mfNum(r["通常ロット（前日）"]||r["通常ロット"]||0),
            normalLotToday:mfNum(r["通常ロット（当日）"]||0),
            extraLot:mfNum(r["ロット外"]||0),advance:mfNum(r["先付け"]||0),
            storage:isY?mfNum(r["保管処理"]||0):null,
            hours:mfNum(r["合計時間"]||r["時間"]||0),note:String(r["自由報告"]||""),
          };
        }).filter(Boolean);
      }
      setDiag({columns:columns||[],count:parsed?parsed.length:0});
      const deduped={};
      (parsed||[]).forEach(r=>{const k=r.date+"_"+r.factory;if(!deduped[k]||r.timestamp>deduped[k].timestamp)deduped[k]=r;});
      const data=Object.values(deduped);
      if(!data.length)throw new Error("データを認識できませんでした。列名を設定画面でご確認ください");
      setRows(data);
      setLastSync(Date.now());
      setToast(`✅ ${data.length}件を同期しました`);
    } catch(e){
      setLastError(e.message||String(e));
      setToast("⚠ 同期に失敗しました");
    }
    setSyncing(false);
  },[settings.url]);

  // 自動同期
  React.useEffect(()=>{
    if(!settings.url||!settings.autoSync)return;
    const intervalMs=(Number(settings.intervalH)||1)*60*60*1000;
    const isStale=()=>!lastSync||(Date.now()-lastSync)>=intervalMs;
    if(isStale())syncNow();
    const tick=setInterval(()=>{if(isStale())syncNow();},60_000);
    return()=>clearInterval(tick);
  },[settings.url,settings.autoSync,settings.intervalH,lastSync,syncNow]);

  const nextSyncLabel=React.useMemo(()=>{
    if(!settings.url)return"未設定";
    if(!settings.autoSync)return"自動同期OFF";
    const ms=(Number(settings.intervalH)||1)*3600*1000;
    const rem=(lastSync||0)+ms-Date.now();
    if(rem<=0)return"更新待機中…";
    const min=Math.round(rem/60000);
    return min<60?`次回${min}分後`:`次回${Math.floor(min/60)}時間後`;
  },[settings,lastSync]);

  // ヘッダー
  React.useEffect(()=>{
    const sub=syncing?"🔄 同期中…":lastSync?`最終 ${new Date(lastSync).toLocaleString("ja-JP",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"})}`:nextSyncLabel;
    registerHeader&&registerHeader({title:"工場報告",sub});
  },[syncing,lastSync,nextSyncLabel]);

  React.useEffect(()=>{
    registerFab&&registerFab(null);
  },[]);

  const filtered = factory==="all"?rows:rows.filter(r=>r.factory===factory);
  const allDates = [...new Set(rows.map(r=>r.date).filter(d=>d))].sort();
  const latestDate = allDates.length?allDates[allDates.length-1]:new Date().toISOString().slice(0,10);

  const handleEdit = (record) => {setEditRecord(record);setShowEdit(true);};
  const handleSaveEdit = (updated) => {
    setRows(rows.map(r=>r.reportID===editRecord.reportID?{...r,...updated}:r));
    setToast("✅ 修正を保存しました");
  };

  const counts={all:rows.length};
  MF_FACTORIES.slice(1).forEach(f=>{counts[f.id]=rows.filter(r=>r.factory===f.id).length;});

  // スピンアニメCSS（1回だけ挿入）
  React.useEffect(()=>{
    if(document.getElementById("mf-spin-style"))return;
    const s=document.createElement("style");
    s.id="mf-spin-style";
    s.textContent="@keyframes mfSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}";
    document.head.appendChild(s);
  },[]);

  // ─ データなし ─
  if(rows.length===0){
    return (
      <div>
        <div className="m-card" style={{padding:"28px 18px",textAlign:"center",marginBottom:12}}>
          <div style={{fontSize:36,marginBottom:12}}>🏭</div>
          <div style={{fontSize:14,fontWeight:800,color:"var(--ink)",marginBottom:8}}>データがありません</div>
          <div style={{fontSize:12.5,color:"var(--ink-mute)",lineHeight:1.6,marginBottom:16}}>
            同期ボタンを押すとスプレッドシートから<br/>最新データを取得します
          </div>
          <button
            onClick={syncNow}
            disabled={syncing}
            style={{
              padding:"12px 28px",borderRadius:12,border:"none",
              background:"var(--accent)",color:"#fff",fontSize:13,fontWeight:800,
              cursor:syncing?"not-allowed":"pointer",marginBottom:10,
              display:"inline-flex",alignItems:"center",gap:8
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={syncing?{animation:"mfSpin 1s linear infinite"}:null}>
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            {syncing?"同期中...":"スプレッドシートから同期"}
          </button>
          {lastError&&<div style={{fontSize:12,color:"#dc2626",marginTop:4}}>{lastError}</div>}
          <div>
            <button
              onClick={()=>setShowSettings(true)}
              style={{
                marginTop:8,padding:"9px 18px",borderRadius:10,border:"1.5px solid var(--line)",
                background:"var(--bg)",fontSize:12.5,fontWeight:700,color:"var(--ink-mute)",cursor:"pointer"
              }}
            >⚙️ 設定</button>
          </div>
        </div>
        <MFSettingsModal open={showSettings} settings={settings} onSave={setSettings}
          onClose={()=>setShowSettings(false)} onSyncNow={syncNow}
          lastSync={lastSync} lastError={lastError} syncing={syncing} diag={diag}/>
        <MFToast msg={toast} onDone={()=>setToast("")}/>
      </div>
    );
  }

  return (
    <div>
      {/* ステータスバー */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"2px 2px 10px",gap:8}}>
        <span style={{fontSize:11.5,color:"var(--ink-mute)",fontWeight:600,flex:1}}>
          {syncing?"🔄 同期中…":lastError?`⚠ ${lastError}`:lastSync?`最終: ${new Date(lastSync).toLocaleString("ja-JP",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"})} · ${nextSyncLabel}`:nextSyncLabel}
        </span>
        <button
          onClick={syncNow} disabled={syncing}
          style={{
            flexShrink:0,padding:"6px 12px",borderRadius:10,border:"1.5px solid var(--line)",
            background:"var(--card)",fontSize:12,fontWeight:700,
            color:syncing?"var(--ink-mute)":"var(--accent-ink)",cursor:syncing?"not-allowed":"pointer",
            display:"flex",alignItems:"center",gap:5
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={syncing?{animation:"mfSpin 1s linear infinite"}:null}>
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          {syncing?"同期中":"同期"}
        </button>
        <button
          onClick={()=>setShowSettings(true)}
          style={{
            flexShrink:0,width:34,height:34,borderRadius:10,border:"1.5px solid var(--line)",
            background:"var(--card)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
            color:"var(--ink-mute)"
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>
          </svg>
        </button>
      </div>

      {/* 未提出アラート */}
      <MFAlert rows={rows}/>

      {/* 工場フィルタ */}
      <div className="m-chips" style={{marginBottom:14}}>
        {MF_FACTORIES.map(f=>(
          <button key={f.id} className={`m-chip ${factory===f.id?"active":""}`} onClick={()=>setFactory(f.id)}>
            {f.short}<span className="m-pr-tabn">{counts[f.id]}</span>
          </button>
        ))}
      </div>

      {/* KPI（最新日） */}
      <div style={{fontSize:11.5,fontWeight:700,color:"var(--ink-mute)",marginBottom:8}}>
        最新日: <span style={{color:"var(--ink)"}}>{latestDate}（{mfDayName(latestDate)}）</span>
      </div>
      <MFKpi rows={filtered} selectedFactory={factory} latestDate={latestDate}/>

      {/* 日別バーチャート */}
      <div className="m-card" style={{marginBottom:12}}>
        <div className="m-card-head" style={{paddingBottom:8}}>
          <div className="m-card-title">📊 日別 総点数</div>
        </div>
        <div style={{padding:"0 12px 12px"}}>
          <MFBarChart rows={filtered} valueFn={mfTotal} color="var(--accent)" unit="点" formatVal={v=>Math.round(v)}/>
        </div>
      </div>

      <div className="m-card" style={{marginBottom:12}}>
        <div className="m-card-head" style={{paddingBottom:8}}>
          <div className="m-card-title">⏱ 日別 稼働時間</div>
        </div>
        <div style={{padding:"0 12px 12px"}}>
          <MFBarChart rows={filtered} valueFn={r=>r.hours} color="#4285F4" unit="h" formatVal={v=>v.toFixed(1)}/>
        </div>
      </div>

      {/* 工場別比較 */}
      <div className="m-card" style={{marginBottom:12}}>
        <div className="m-card-head">
          <div className="m-card-title">🏭 工場別 比較</div>
        </div>
        <div style={{padding:"12px 16px"}}>
          <MFComparison rows={filtered}/>
        </div>
      </div>

      {/* 報告一覧 */}
      <div className="m-card" style={{marginBottom:12}}>
        <div className="m-card-head">
          <div className="m-card-title">📋 報告一覧</div>
          <span style={{marginLeft:"auto",fontSize:11.5,color:"var(--ink-mute)"}}>{filtered.length}件</span>
        </div>
        <div style={{padding:"0 0 8px"}}>
          <MFTable
            rows={filtered}
            showCount={showCount}
            onShowMore={()=>setShowCount(c=>c+20)}
            onEdit={handleEdit}
          />
        </div>
      </div>

      <div style={{height:16}}></div>

      {/* モーダル */}
      <MFEditModal open={showEdit} record={editRecord} onSave={handleSaveEdit} onClose={()=>setShowEdit(false)}/>
      <MFSettingsModal open={showSettings} settings={settings} onSave={setSettings}
        onClose={()=>setShowSettings(false)} onSyncNow={syncNow}
        lastSync={lastSync} lastError={lastError} syncing={syncing} diag={diag}/>
      <MFToast msg={toast} onDone={()=>setToast("")}/>
    </div>
  );
};

window.MFactory = MFactory;
