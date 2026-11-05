(function pb96App(){
"use strict";
const app=document.querySelector("#app");
const page=document.body.dataset.page;
const e=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const blank=x=>x===null||x===undefined||String(x).trim()==="";
const d=x=>blank(x)?"—":e(x);
const validUrl=u=>typeof u==="string"&&/^https:\/\/[a-z0-9.-]+\//i.test(u);
const external=(url,label="資料")=>validUrl(url)?`<a href="${e(url)}" target="_blank" rel="noopener noreferrer">${e(label)}<span aria-hidden="true"> ↗</span></a>`:"";
const who=p=>`<a href="player.html?id=${encodeURIComponent(p.id)}">${e(p.name)}</a>`;
const badge=s=>`<span class="badge ${s==="確認済"?"ok":s==="要確認"?"warn":""}">${d(s)}</span>`;
const yearsAsc=(a,b)=>Number(a.year)-Number(b.year)||String(a.league).localeCompare(String(b.league),"ja");
const table=(cols,items,empty="該当する記録はありません。")=>items.length?`<div class="table-outer"><table><thead><tr>${cols.map(x=>`<th scope="col">${e(x)}</th>`).join("")}</tr></thead><tbody>${items.map(c=>`<tr>${c.map(x=>`<td>${x}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`:`<p class="empty">${e(empty)}</p>`;
async function load(name){const r=await fetch("data/"+name+".json",{cache:"no-store"});if(!r.ok)throw Error(name+" のデータを取得できません（HTTP "+r.status+"）");return await r.json();}
function info(s){return `<p class="small muted">${s}</p>`}
function title(t,subtitle=""){return `<div class="page-title"><h1>${e(t)}</h1>${subtitle?`<p>${e(subtitle)}</p>`:""}</div>`;}
function statCells(s){return [d(s.year),d(s.league),d(s.club),d(s.games),d(s.avg),d(s.hr),d(s.rbi),d(s.sb),d(s.pitchGames),d(s.era),d(s.wins),d(s.losses),d(s.hp),d(s.saves),d(s.innings),d(s.pitchingStrikeouts),d(s.whip),external(s.source,"出典")||"—"]; }

const MAIN_TITLE_ORDER=["MVP","沢村賞","長嶋賞","最多勝","最優秀防御率","最多奪三振","最高勝率","首位打者","本塁打王","打点王","最多安打","最高出塁率","盗塁王","GG","B9","新人王"];
function mainTitleName(item){
  if(!["セ・リーグ","パ・リーグ","NPB"].includes(String(item.league||"")))return null;
  const name=String(item.award||"").replace(/\s+/g,"");
  if(/長嶋(?:茂雄)?賞/.test(name))return "長嶋賞";
  if(/沢村(?:栄治)?賞/.test(name))return "沢村賞";
  if(/最優秀選手賞|年間MVP|シーズンMVP/.test(name))return "MVP";
  if(/最優秀新人賞|^新人王$/.test(name))return "新人王";
  if(/ゴールデン[・-]?グラブ|ゴールデングラブ|GG賞/.test(name))return "GG";
  if(/ベストナイン/.test(name))return "B9";
  const mapping=[
    ["最多勝",/最多勝利|最多勝投手|最多勝賞/],
    ["最優秀防御率",/最優秀防御率|防御率第一位/],
    ["最多奪三振",/最多奪三振|最多三振奪取|奪三振王/],
    ["最高勝率",/最高勝率|勝率第一位/],
    ["首位打者",/首位打者/],
    ["本塁打王",/最多本塁打|本塁打王/],
    ["打点王",/最多打点|打点王/],
    ["最多安打",/最多安打/],
    ["最高出塁率",/最高出塁率|最高出塁/],
    ["盗塁王",/最多盗塁|盗塁王/]
  ];
  return mapping.find(([k,re])=>re.test(name))?.[0]||null;
}
function summarizeTitles(entries){
  const by=new Map();
  for(const item of entries){
    const k=mainTitleName(item);
    if(!k||!/^\d{4}$/.test(String(item.year)))continue;
    if(!by.has(k))by.set(k,new Set());
    by.get(k).add(Number(item.year));
  }
  return MAIN_TITLE_ORDER.filter(k=>by.has(k)).map(k=>({name:k,years:[...by.get(k)].sort((a,b)=>a-b)}));
}
function compactYears(years){
  const list=[...new Set(years)].sort((a,b)=>a-b),groups=[];
  if(!list.length)return "";
  let start=list[0],end=list[0];
  const push=()=>groups.push(start===end?String(start):start+"〜"+end);
  for(const value of list.slice(1)){
    if(value===end+1){end=value;continue;}
    push();start=end=value;
  }
  push();return groups.join("、");
}

const seasonCols=["年度","リーグ","球団","野手試合","打率","本塁打","打点","盗塁","投手登板","防御率","勝","敗","HP","S","投球回","奪三振","WHIP","資料"];
const seasonRows=x=>x.map(s=>statCells(s));
function countTile(n,text){return `<div class="stat"><strong>${e(n)}</strong><span>${e(text)}</span></div>`}

const NPB_NUMBER_FIELDS={
 battingGames:["detail","officialGames"],plateAppearances:["detail","pa"],atBats:["detail","ab"],
 hits:["detail","hits"],doubles:["detail","doubles"],triples:["detail","triples"],runs:["detail","runs"],
 walks:["detail","walks"],battingStrikeouts:["detail","strikeoutsBat"],
 homeRuns:["season","hr"],rbi:["season","rbi"],sb:["season","sb"],
 pitcherGames:["season","pitchGames"],wins:["season","wins"],losses:["season","losses"],
 hp:["season","hp"],saves:["season","saves"],outs:["season","outs"],
 pitchingStrikeouts:["detail","strikeoutsPitch"],pitchingWalks:["detail","walksPitch"],
 earnedRuns:["detail","earnedRuns"],hitsAllowed:["detail","hitsAllowed"]
};
function numeric(x){
 if(x===undefined||x===null||String(x).trim()==="")return null;
 const n=Number(x);return Number.isFinite(n)?n:null;
}
function joinedNPB(seasons,extended,supplement,includeUnplayedId=null){
 const map=new Map(extended.rows.map(x=>[[x.id,x.year,x.club].join("|"),x]));
 const bat=new Map((supplement?.rows||[]).filter(x=>x.kind==="batting").map(x=>[[x.id,x.year,x.club].join("|"),x]));
 const pit=new Map((supplement?.rows||[]).filter(x=>x.kind==="pitching").map(x=>[[x.id,x.year,x.club].join("|"),x]));
 const played=seasons.filter(s=>s.league==="NPB").map(season=>{
   const key=[season.id,season.year,season.club].join("|");
   return {season,detail:map.get(key)||null,batting:bat.get(key)||null,pitching:pit.get(key)||null};
 });
 // NPB公式登録が確認できても一軍に出場していない年度は、選手個別表でのみ補完。
 // ランキングの集計には追加しない。
 if(!includeUnplayedId)return played;
 const unplayed=(extended.noFirstTeamSeasons||[]).filter(x=>x.id===includeUnplayedId).map(x=>({
   season:{id:x.id,year:x.year,club:x.club,league:"NPB",games:"",pitchGames:""},
   detail:null,batting:null,pitching:null,noFirstTeam:true
 }));
 return played.concat(unplayed);
}
function sumNPB(rows){
 const out={};
 for(const [name,[src,key]] of Object.entries(NPB_NUMBER_FIELDS)){
   const vals=rows.map(r=>numeric(r[src]?.[key])).filter(v=>v!==null);
   out[name]=vals.length?vals.reduce((n,x)=>n+x,0):null;
   out[name+"Count"]=vals.length;
 }
 for(const f of ["hitByPitch","sacFlies"]){
   const vals=rows.map(r=>numeric(r.batting?.[f]));
   out[f]=vals.length&&vals.every(v=>v!==null)?vals.reduce((a,b)=>a+b,0):null;
 }
 out.avg=out.atBats>0&&out.hits!==null?out.hits/out.atBats:null;
 out.slg=out.atBats>0&&out.hits!==null&&out.doubles!==null&&out.triples!==null&&out.homeRuns!==null?
   (out.hits+out.doubles+2*out.triples+3*out.homeRuns)/out.atBats:null;
 const obpDenom=(out.atBats??0)+(out.walks??0)+(out.hitByPitch??0)+(out.sacFlies??0);
 out.obp=obpDenom>0&&out.hits!==null&&out.walks!==null&&out.hitByPitch!==null&&out.sacFlies!==null?
  (out.hits+out.walks+out.hitByPitch)/obpDenom:null;
 out.ops=out.obp!==null&&out.slg!==null?out.obp+out.slg:null;
 out.era=out.outs>0&&out.earnedRuns!==null?27*out.earnedRuns/out.outs:null;
 out.whip=out.outs>0&&out.hitsAllowed!==null&&out.pitchingWalks!==null?
   3*(out.hitsAllowed+out.pitchingWalks)/out.outs:null;
 return out;
}
function inningsLabel(outs){
 if(outs===null||outs===undefined)return "—";
 const v=Math.round(outs),whole=Math.floor(v/3),r=v%3;
 return e(r?whole+" "+r+"/3":String(whole));
}
function ratioLabel(value,places=3){
 if(value===null||!Number.isFinite(value))return "—";
 const fixed=value.toFixed(places);
 return e(places===3?fixed.replace(/^0\./,"."):fixed);
}
function yearlyNPB(rows){
 const m=new Map();
 for(const rec of rows){const k=rec.season.year;if(!m.has(k))m.set(k,[]);m.get(k).push(rec);}
 return [...m.entries()].sort((a,b)=>Number(a[0])-Number(b[0])).map(([year,list])=>({year,rows:list,total:sumNPB(list),club:[...new Set(list.map(x=>x.season.club))].join("・")}));
}
const RANK_CATEGORIES={
 batting:[
  ["battingGames","出場試合"],["plateAppearances","打席"],["atBats","打数"],["hits","安打"],
  ["doubles","二塁打"],["triples","三塁打"],["homeRuns","本塁打"],["rbi","打点"],
  ["sb","盗塁"],["runs","得点"],["walks","四球"],["battingStrikeouts","三振"],
  ["avg","打率"],["obp","出塁率"],["slg","長打率"],["ops","OPS"]
 ],
 pitching:[
  ["pitcherGames","登板"],["wins","勝利"],["losses","敗戦"],["hp","ホールドポイント"],
  ["saves","セーブ"],["outs","投球回"],["pitchingStrikeouts","奪三振"],
  ["pitchingWalks","与四球"],["earnedRuns","自責点"],["hitsAllowed","被安打"],
  ["era","防御率"],["whip","WHIP"]
 ]
};
function metricValue(total,metric){return total[metric]??null;}
function metricLabel(total,metric){
 const v=metricValue(total,metric);
 return metric==="outs"?inningsLabel(v):
   metric==="avg"||metric==="obp"||metric==="slg"||metric==="ops"||metric==="whip"?ratioLabel(v,3):
   metric==="era"?ratioLabel(v,2):v===null?"—":e(v);
}
function metricQualified(total,metric,min){
 const value=metricValue(total,metric);
 if(value===null)return false;
 if(["avg","obp","slg","ops"].includes(metric))return total.atBats!==null&&total.atBats>=min;
 if(metric==="era"||metric==="whip")return total.outs!==null&&total.outs>=min*3;
 return value>0;
}
function rankRecords(source,metric,minimum){
 const low=metric==="era"||metric==="whip";
 const rankable=source.filter(x=>metricQualified(x.total,metric,minimum));
 rankable.sort((a,b)=>low?metricValue(a.total,metric)-metricValue(b.total,metric)||Number(a.id)-Number(b.id):
 metricValue(b.total,metric)-metricValue(a.total,metric)||Number(a.id)-Number(b.id));
 let last=null,rank=0;
 return rankable.map((x,i)=>{
   const value=metricValue(x.total,metric);
   if(last===null||Math.abs(value-last)>0.00000001)rank=i+1;
   last=value;return {...x,rank};
 });
}

async function listPage(){
const [players,meta]=await Promise.all([load("players"),load("meta")]);
app.innerHTML=title("1996年度世代 選手一覧","1996年4月2日～1997年4月1日生まれ。世代IDで選手を管理します。")+
`<div class="stats">${countTile(players.length,"登録選手")}${countTile(meta.counts.seasons,"年度別成績レコード")}${countTile(meta.counts.internationals,"対象国際大会記録")}</div>`+
`<div class="control-bar"><label>選手名・球団・学校を検索<input id="search" type="search" placeholder="例：岡本、阪神、西武"></label><label>守備位置<select id="position"><option value="">すべて</option><option value="投">投手</option><option value="捕">捕手</option><option value="内">内野手</option><option value="外">外野手</option></select></label><label>並べ替え<select id="sort"><option value="id">世代ID順</option><option value="name">氏名順</option><option value="dob">生年月日順</option><option value="npb">NPB成績最終年順</option></select></label></div>`+
`<p id="counter" class="small muted" aria-live="polite"></p><div id="results"></div>`+info("※最終経歴(2026)は資料で確認できた内容です。2027年の所属を保証するものではありません。");
const q=app.querySelector("#search"),pos=app.querySelector("#position"),sort=app.querySelector("#sort"),target=app.querySelector("#results"),counter=app.querySelector("#counter");
function render(){
const text=q.value.normalize("NFKC").toLocaleLowerCase("ja");
let x=players.filter(p=>([p.id,p.name,p.club2026,p.school].join(" ").normalize("NFKC").toLocaleLowerCase("ja").includes(text))&&(!pos.value||p.pos.includes(pos.value)));
x.sort(sort.value==="name"?(a,b)=>a.name.localeCompare(b.name,"ja"):sort.value==="dob"?(a,b)=>a.dob.localeCompare(b.dob):sort.value==="npb"?(a,b)=>Number(b.lastNpbYear||0)-Number(a.lastNpbYear||0):((a,b)=>Number(a.id)-Number(b.id)));
counter.textContent=`${x.length} / ${players.length} 人`;
target.innerHTML=`<div class="player-list">`+table(["ID","選手名","生年月日","位置","最終経歴(2026)","NPB最終成績年"],x.map(p=>[d(p.id),who(p),d(p.dob),d(p.pos),d(p.club2026),d(p.lastNpbYear)]),"一致する選手はありません。")+`</div>`;
}
for(const n of [q,pos,sort])n.addEventListener(n===q?"input":"change",render);
render();
}

function sumSupplement(rows,kind,key){
 const vals=rows.map(r=>numeric(r[kind]?.[key]));
 return vals.length&&vals.every(v=>v!==null)?vals.reduce((sum,v)=>sum+v,0):null;
}
function npbDetailView(records,position){
 if(!records.length)return "";
 const sorted=[...records].sort((a,b)=>Number(a.season.year)-Number(b.season.year)||
  String(a.season.club).localeCompare(String(b.season.club),"ja"));
 const played=sorted.filter(r=>!r.noFirstTeam),unplayed=sorted.filter(r=>r.noFirstTeam);
 const bat=played.filter(r=>numeric(r.detail?.officialGames)!==null||
   numeric(r.detail?.pa)!==null||numeric(r.season.games)!==null);
 const pit=played.filter(r=>(numeric(r.season.pitchGames)??0)>0);
 const isPitcher=String(position||"").includes("投");
 const N=x=>numeric(x);
 const sum=(arr,k)=>{
   const values=arr.map(v=>N(v[k]));
   return values.length&&values.every(v=>v!==null)?values.reduce((a,b)=>a+b,0):null;
 };
 const rate=(v,places=3,leadingZero=false)=>{
   const n=N(v);if(n===null)return "—";
   const fixed=n.toFixed(places);
   return e(leadingZero?fixed:fixed.replace(/^0\./,"."));
 };
 const div=(a,b)=>N(a)!==null&&N(b)!==null&&Number(b)!==0?Number(a)/Number(b):null;
 const percentage=(a,b)=>rate(div(a,b)===null?null:100*div(a,b),1,true).replace(/^(?!—)(.+)$/,"$1%");
 const showTeam=x=>d(teamAbbrev(x));
 const officialGames=r=>N(r.detail?.officialGames)??N(r.season.games);
 const battingData=r=>{
   const s=r.season,x=r.detail||{},z=r.batting||{};
   return {year:s.year,club:s.club,games:officialGames(r),pa:N(x.pa),ab:N(x.ab),
    runs:N(x.runs),hits:N(x.hits),doubles:N(x.doubles),triples:N(x.triples),
    hr:N(s.hr),totalBases:N(z.totalBases),rbi:N(s.rbi),sb:N(s.sb),
    caught:N(z.caughtStealing),bunts:N(z.sacBunts),flies:N(z.sacFlies),
    bb:N(x.walks),ibb:N(z.ibb),hbp:N(z.hitByPitch),k:N(x.strikeoutsBat),gidp:N(z.gidp),errors:N(z.errors),
    avg:N(s.avg),obp:N(x.obp),slg:N(x.slg),ops:N(x.ops)};
 };
 const pitchingData=r=>{
   const s=r.season,x=r.detail||{},z=r.pitching||{};
   return {year:s.year,club:s.club,games:officialGames(r),gamesPitch:N(s.pitchGames),
    starts:N(x.starts),outs:N(s.outs),era:N(s.era),
    wins:N(s.wins),losses:N(s.losses),holds:N(z.holds),hp:N(s.hp),saves:N(s.saves),
    complete:N(z.completeGames),shutouts:N(z.shutouts),noWalks:N(z.noWalks),
    k:N(x.strikeoutsPitch),bb:N(x.walksPitch),hbp:N(z.hitBatters),
    batters:N(z.battersFaced),hits:N(x.hitsAllowed),hr:N(z.homeRunsAllowed),
    wp:N(z.wildPitches),balk:N(z.balks),runs:N(z.runsAllowed),
    earned:N(x.earnedRuns),whip:N(x.whip),qs:N(z.qs),hqs:N(z.hqs),ibb:N(z.ibb),opponentAvg:N(z.opponentAvg),
    sacBunts:N(z.sacBuntsAllowed),sacFlies:N(z.sacFliesAllowed),ab:N(z.opponentAtBats),pitches:N(z.pitches),fip:N(z.fip)};
 };
 const battings=bat.map(battingData),pitchings=pit.map(pitchingData);
 const sumObject=(objects,fields)=>{
   const obj={year:"通算",club:"—"};
   for(const key of fields)obj[key]=sum(objects,key);
   return obj;
 };
 const batTotals=()=>{
   const t=sumObject(battings,["games","pa","ab","runs","hits","doubles","triples","hr",
    "totalBases","rbi","sb","caught","bunts","flies","bb","ibb","hbp","k","gidp","errors"]);
   t.avg=div(t.hits,t.ab);
   const denom=[t.ab,t.bb,t.hbp,t.flies].every(x=>x!==null)?t.ab+t.bb+t.hbp+t.flies:null;
   const numer=[t.hits,t.bb,t.hbp].every(x=>x!==null)?t.hits+t.bb+t.hbp:null;
   t.obp=div(numer,denom);
   t.slg=div(t.totalBases,t.ab);
   t.ops=t.obp!==null&&t.slg!==null?t.obp+t.slg:null;
   return t;
 };
 const pitchTotals=()=>{
   const t=sumObject(pitchings,["games","gamesPitch","outs","wins","losses","holds","hp",
    "saves","complete","shutouts","noWalks","k","bb","hbp","batters",
    "hits","hr","wp","balk","runs","earned"]);
   t.starts=sum(pitchings,"starts");t.qs=sum(pitchings,"qs");t.hqs=sum(pitchings,"hqs");
   t.ibb=sum(pitchings,"ibb");t.sacBunts=sum(pitchings,"sacBunts");
   t.sacFlies=sum(pitchings,"sacFlies");t.ab=sum(pitchings,"ab");
   t.pitches=sum(pitchings,"pitches");
   t.era=t.outs>0&&t.earned!==null?27*t.earned/t.outs:null;
   t.whip=t.outs>0&&t.hits!==null&&t.bb!==null?
     3*(t.hits+t.bb)/t.outs:null;
   return t;
 };
 const rc2=x=>{
   const fields=["hits","bb","hbp","caught","gidp","totalBases","flies","bunts","sb","k","ab"];
   if(!fields.every(k=>N(x[k])!==null))return null;
   const A=x.hits+x.bb+x.hbp-x.caught-x.gidp;
   const B=x.totalBases+0.26*(x.bb+x.hbp)+0.53*(x.flies+x.bunts)+0.64*x.sb-0.03*x.k;
   const C=x.ab+x.bb+x.hbp+x.bunts+x.flies;
   return C>0?(A+2.4*C)*(B+3*C)/(9*C)-0.9*C:null;
 };
 const rcOuts=x=>["ab","hits","caught","gidp","bunts","flies"].every(k=>N(x[k])!==null)?
   x.ab-x.hits+x.caught+x.gidp+x.bunts+x.flies:null;
 const BatCols=["打率","試合","打席","打数","安打","二塁打","三塁打","本塁打","塁打","打点","本打率","得点","三振","三振率","四球","敬遠","死球","BB/K","犠打","犠飛","併殺","失策","盗企数","盗塁","盗塁率","出塁率","長打率","OPS","RC","RC27"];
 const PitchCols=["防御率","投球回","試合","登板","先発","勝率","勝","負","H","HP","S",
  "完封","完投","QS","QS率","HQS","HQS率","奪三振","奪三振率","四球","敬遠","死球",
  "四死球率","BB/9","K/BB","被犠打","被犠飛","打者","打数","被安打","被打率",
  "被本塁打","被本率","WHIP","FIP","暴投","ボーク","球数","失点","自責点"];
 const batMetric=(x,k)=>{
   switch(k){
    case "打率":return rate(x.avg); case "試合":return d(x.games);
    case "打席":return d(x.pa);case "打数":return d(x.ab);
    case "安打":return d(x.hits);case "二塁打":return d(x.doubles);
    case "三塁打":return d(x.triples);case "本塁打":return d(x.hr);
    case "塁打":return d(x.totalBases);case "打点":return d(x.rbi);
    case "本打率":return rate(div(x.ab,x.hr),1,true);
    case "得点":return d(x.runs);case "三振":return d(x.k);case "敬遠":return d(x.ibb);
    case "三振率":return percentage(x.k,x.pa);case "四球":return d(x.bb);
    case "死球":return d(x.hbp);case "BB/K":return rate(div(x.bb,x.k),2,true);
    case "犠打":return d(x.bunts);case "犠飛":return d(x.flies);
    case "併殺":return d(x.gidp);case "失策":return d(x.errors);
    case "盗企数":return N(x.sb)!==null&&N(x.caught)!==null?d(x.sb+x.caught):"—";
    case "盗塁":return d(x.sb);
    case "盗塁率":return N(x.sb)!==null&&N(x.caught)!==null?percentage(x.sb,x.sb+x.caught):"—";
    case "出塁率":return rate(x.obp);
    case "長打率":return rate(x.slg);
    case "OPS":return rate(x.ops);
    case "RC":return rate(rc2(x),2,true);
    case "RC27":return rate(div(rc2(x),rcOuts(x))===null?null:27*div(rc2(x),rcOuts(x)),2,true);
    default:return "—";
   }
 };
 const pitchMetric=(x,k)=>{
   switch(k){
    case "防御率":return rate(x.era,2,true);
    case "投球回":return inningsLabel(x.outs);
    case "試合":return d(x.games);case "登板":return d(x.gamesPitch);
    case "先発":return d(x.starts);
    case "勝率":return N(x.wins)!==null&&N(x.losses)!==null?
      rate(div(x.wins,x.wins+x.losses)):"—";
    case "勝":return d(x.wins);case "負":return d(x.losses);
    case "H":return d(x.holds);case "HP":return d(x.hp);case "S":return d(x.saves);
    case "完封":return d(x.shutouts);case "完投":return d(x.complete);
    case "QS":return d(x.qs);case "QS率":return percentage(x.qs,x.starts);
    case "HQS":return d(x.hqs);case "HQS率":return percentage(x.hqs,x.starts);
    case "奪三振":return d(x.k);
    case "奪三振率":return rate(div(x.k,x.outs)===null?null:27*div(x.k,x.outs),2,true);
    case "四球":return d(x.bb);case "敬遠":return d(x.ibb);case "死球":return d(x.hbp);
    case "四死球率":return N(x.bb)!==null&&N(x.hbp)!==null?
      percentage(x.bb+x.hbp,x.batters):"—";
    case "BB/9":return rate(div(x.bb,x.outs)===null?null:27*div(x.bb,x.outs),2,true);
    case "K/BB":return rate(div(x.k,x.bb),2,true);
    case "被犠打":return d(x.sacBunts);case "被犠飛":return d(x.sacFlies);
    case "打者":return d(x.batters);case "打数":return d(x.ab);
    case "被安打":return d(x.hits);case "被打率":return rate(x.opponentAvg!==null?x.opponentAvg:div(x.hits,x.ab));
    case "被本塁打":return d(x.hr);
    case "被本率":return rate(div(x.hr,x.outs)===null?null:27*div(x.hr,x.outs),2,true);
    case "WHIP":return rate(x.whip,2,true);
    case "FIP":return d(x.fip);case "暴投":return d(x.wp);
    case "ボーク":return d(x.balk);case "球数":return d(x.pitches);
    case "失点":return d(x.runs);case "自責点":return d(x.earned);
    default:return "—";
   }
 };
 const yearCell=r=>r.noFirstTeam?
   d(r.season.year)+'<span class="npb-unplayed-mark" title="NPB在籍・一軍出場なし"> ※</span>':
   d(r.season.year);
 const emptyRow=(r,columns,kind)=>{
   const zero=kind==="pitch"?new Set(["試合","登板"]):new Set(["試合"]);
   return [yearCell(r),showTeam(r.season.club),...columns.map(k=>zero.has(k)?"0":"—")];
 };
 const byYear=(a,b)=>Number(a.season.year)-Number(b.season.year)||
  String(a.season.club).localeCompare(String(b.season.club),"ja");
 const makeRows=(source,columns,fn,kind)=>{
   const arr=[...source,...unplayed].sort(byYear).map(r=>r.noFirstTeam?
     emptyRow(r,columns,kind):[d(r.season.year),showTeam(r.season.club),
     ...columns.map(k=>fn(kind==="pitch"?pitchingData(r):battingData(r),k))]);
   if(source.length){
     const t=kind==="pitch"?pitchTotals():batTotals();
     arr.push(["<strong>通算</strong>","—",...columns.map(k=>fn(t,k))]);
   }
   return arr;
 };
 const parts=[];
 const addBat=bat.length||(!isPitcher&&unplayed.length);
 const addPitch=pit.length||(isPitcher&&unplayed.length);
 if(addBat)parts.push({kind:"bat",html:"<h3>打撃成績</h3>"+
   table(["年","球団",...BatCols],makeRows(bat,BatCols,batMetric,"bat"))});
 if(addPitch)parts.push({kind:"pit",html:"<h3>投手成績</h3>"+
   table(["年","球団",...PitchCols],makeRows(pit,PitchCols,pitchMetric,"pitch"))});
 if(isPitcher)parts.sort((a,b)=>a.kind==="pit"?-1:b.kind==="pit"?1:0);
 return '<section class="panel npb-detail"><h2>NPB年度別・通算成績</h2>'+
  '<p class="small muted">右にスクロールすると全項目を確認できます。率の1未満は先頭0を省略（例：.300、.950）、WHIPは小数第2位まで表示します。※はNPB在籍のみの年度で、通算には算入しません。</p>'+
  (parts.length?parts.map(x=>x.html).join(""):
    '<p class="empty">NPB一軍成績は未収録です。</p>')+
  '<p class="small muted">先発・QSは2015〜2026年のNPB一軍投手298年度行を出典付きで照合済みです。HQS・敬遠・失策など、一部未収録の項目は確認済み年度だけ表示します。未確認の数値は0ではなく「—」で、全年度が未確認なら通算も「—」です。FIPは資料掲載の算出方法に依存します。算出指標：本打率＝打数÷本塁打、三振率＝三振÷打席、奪三振率・BB/9・被本率＝各数値×9÷投球回、盗塁率＝盗塁÷盗企数、RC・RC27はRC2方式。未収録のQS・HQS・敬遠・特殊本塁打・球数などは「—」です。HとHP、試合と登板は別記録です。</p></section>';
}

function careerCategory(a){
 const k=String(a.category||"");
 if(k==="学校")return "高校";
 if(k==="大学")return "大学";
 if(k==="社会人")return "社会人";
 if(k==="NPB")return "NPB";
 if(k==="独立")return "独立";
 if(["MLB","MLB球団","MiLB","MLB・傘下","MLB・組織所属"].includes(k))return "MLB";
 if(["海外","韓国"].includes(k))return "海外";
 return "他";
}

function careerClub(a){
 let c=String(a.club||"");
 const k=String(a.category||"");
 if(k==="専門学校")c+="（専門学校）";
 if(k==="ファーム参加球団")c+="（NPBファーム参加）";
 if(k==="就任予定（球団スタッフ）")c+="（就任予定）";
 if(["MiLB","MLB・傘下","MLB・組織所属"].includes(k)&&!/傘下|MiLB/.test(c))c+="（MLB傘下）";
 return c;
}


const MLB_BAT_COLS=["打率","試合","打席","打数","安打","二塁打","三塁打","本塁打","塁打","打点","本打率","得点","三振","三振率","四球","敬遠","死球","BB/K","犠打","犠飛","併殺","失策","盗企数","盗塁","盗塁率","出塁率","長打率","OPS","RC","RC27"];
const MLB_PITCH_COLS=["防御率","投球回","試合","登板","先発","勝率","勝","負","H","HP","S",
 "完封","完投","QS","QS率","HQS","HQS率","奪三振","奪三振率","四球","敬遠","死球",
 "四死球率","BB/9","K/BB","被犠打","被犠飛","打者","打数","被安打","被打率",
 "被本塁打","被本率","WHIP","FIP","暴投","ボーク","球数","失点","自責点"];
function mlbOuts(ip){
 if(blank(ip))return null;
 const match=/^(\d+)(?:\.([012]))?$/.exec(String(ip));
 if(!match)return null;
 return Number(match[1])*3+Number(match[2]||0);
}
function mlbDetailView(items,position,officialTotals=null){
 if(!items.length)return "";
 const bat=items.filter(x=>x.kind==="batting").sort((a,b)=>Number(a.year)-Number(b.year)||a.club.localeCompare(b.club));
 const pit=items.filter(x=>x.kind==="pitching").sort((a,b)=>Number(a.year)-Number(b.year)||a.club.localeCompare(b.club));
 const N=numeric,rate=(v,places=3,leading=false)=>v===null||!Number.isFinite(Number(v))?"—":
   e((Number(v)).toFixed(places).replace(leading?/^$/:/^0\./,leading?"":"."));
 const share=(v,den)=>v!==null&&den!==null&&Number(den)!==0?Number(v)/Number(den):null;
 const pct=(v,den)=>{const r=share(v,den);return r===null?"—":(100*r).toFixed(1)+"%";};
 const strict=(arr,k)=>{
  const nums=arr.map(x=>N(x[k]));
  return nums.length&&nums.every(n=>n!==null)?nums.reduce((a,b)=>a+b,0):null;
 };
 const add=(...values)=>values.every(v=>v!==null)?values.reduce((a,b)=>a+b,0):null;
 const ipLabel=x=>mlbOuts(x)===null?"—":inningsLabel(mlbOuts(x));
 const batSum=()=>{
  const x={year:"通算",club:"—"};
  for(const k of ["g","pa","ab","r","h","doubles","triples","hr","rbi","bb","ibb","k",
    "sb","cs","hbp","sh","sf","tb","gidp","errors"])x[k]=strict(bat,k);
  x.avg=share(x.h,x.ab);
  x.obp=share(add(x.h,x.bb,x.hbp),add(x.ab,x.bb,x.hbp,x.sf));
  x.slg=share(x.tb,x.ab);
  x.ops=add(x.obp,x.slg);
  if(officialTotals?.kind==="batting"){
   for(const [k,v] of Object.entries(officialTotals))
    if(N(x[k])===null&&N(v)!==null)x[k]=v;
  }
  return x;
 };
 const pitSum=()=>{
  const x={year:"通算",club:"—"};
  for(const k of ["g","gs","w","l","sv","hold","h","r","er","hr","bb","k","bf","np",
     "hbp","ibb","qs","hqs","wp","bk","sh","sf","ab","cg","sho"])x[k]=strict(pit,k);
  const outs=pit.map(x=>mlbOuts(x.ip));
  x.outs=outs.length&&outs.every(v=>v!==null)?outs.reduce((a,b)=>a+b,0):null;
  x.ip=x.outs!==null?String(Math.floor(x.outs/3))+"."+(x.outs%3):null;
  x.era=x.outs>0&&x.er!==null?27*x.er/x.outs:null;
  x.whip=x.outs>0&&x.h!==null&&x.bb!==null?3*(x.h+x.bb)/x.outs:null;
  if(officialTotals?.kind==="pitching"){
   for(const [k,v] of Object.entries(officialTotals))
    if(N(x[k])===null&&N(v)!==null)x[k]=v;
  }
  return x;
 };
 const rc=x=>{
  if(["h","bb","hbp","cs","gidp","tb","sf","sh","sb","k","ab"].some(k=>N(x[k])===null))return null;
  const a=x.h+x.bb+x.hbp-x.cs-x.gidp,b=x.tb+.26*(x.bb+x.hbp)+.53*(x.sf+x.sh)+.64*x.sb-.03*x.k;
  const c=x.ab+x.bb+x.hbp+x.sh+x.sf;
  return c>0?(a+2.4*c)*(b+3*c)/(9*c)-.9*c:null;
 };
 const batValue=(x,k)=>{
  const attempt=add(x.sb,x.cs);
  const B= N(x.bb),K=N(x.k);
  switch(k){
   case "打率":return rate(N(x.avg));case "試合":return d(x.g);
   case "打席":return d(x.pa);case "打数":return d(x.ab);case "安打":return d(x.h);
   case "二塁打":return d(x.doubles);case "三塁打":return d(x.triples);
   case "本塁打":return d(x.hr);case "塁打":return d(x.tb);case "打点":return d(x.rbi);
   case "本打率":return rate(share(N(x.ab),N(x.hr)),1,true);
   case "得点":return d(x.r);case "三振":return d(x.k);
   case "三振率":return pct(N(x.k),N(x.pa));
   case "四球":return d(x.bb);case "敬遠":return d(x.ibb);case "死球":return d(x.hbp);
   case "BB/K":return rate(share(B,K),2,true);case "犠打":return d(x.sh);
   case "犠飛":return d(x.sf);case "併殺":return d(x.gidp);case "失策":return d(x.errors);
   case "盗企数":return d(attempt);case "盗塁":return d(x.sb);
   case "盗塁率":return pct(N(x.sb),attempt);case "出塁率":return rate(N(x.obp));
   case "長打率":return rate(N(x.slg));case "OPS":return rate(N(x.ops));
   case "RC":return rate(rc(x),2,true);
   case "RC27":{
    const run=rc(x),outs= N(x.ab)!==null&&N(x.h)!==null&&N(x.cs)!==null&&N(x.gidp)!==null&&
      N(x.sh)!==null&&N(x.sf)!==null?x.ab-x.h+x.cs+x.gidp+x.sh+x.sf:null;
    const v=share(run,outs);return rate(v===null?null:27*v,2,true);
   }
   default:return "—";
  }
 };
 const pitchValue=(x,k)=>{
  const o=x.outs??mlbOuts(x.ip),w=N(x.w),l=N(x.l);
  switch(k){
   case "防御率":return rate(N(x.era),2,true);case "投球回":return ipLabel(x.ip);
   case "試合":case "登板":return d(x.g);case "先発":return d(x.gs);
   case "勝率":return rate(w!==null&&l!==null?share(w,w+l):null);
   case "勝":return d(w);case "負":return d(l);case "H":return d(x.hold);
   case "HP":return "—";case "S":return d(x.sv);
   case "完封":return d(x.sho);case "完投":return d(x.cg);
   case "QS":return d(x.qs);case "QS率":return pct(N(x.qs),N(x.gs));
   case "HQS":return d(x.hqs);case "HQS率":return pct(N(x.hqs),N(x.gs));
   case "奪三振":return d(x.k);
   case "奪三振率":return rate(share(N(x.k),o)===null?null:27*share(N(x.k),o),2,true);
   case "四球":return d(x.bb);case "敬遠":return d(x.ibb);case "死球":return d(x.hbp);
   case "四死球率":return pct(add(N(x.bb),N(x.hbp)),N(x.bf));
   case "BB/9":return rate(share(N(x.bb),o)===null?null:27*share(N(x.bb),o),2,true);
   case "K/BB":return rate(share(N(x.k),N(x.bb)),2,true);
   case "被犠打":return d(x.sh);case "被犠飛":return d(x.sf);
   case "打者":return d(x.bf);case "打数":return d(x.ab);case "被安打":return d(x.h);
   case "被打率":return rate(N(x.avg));case "被本塁打":return d(x.hr);
   case "被本率":return rate(share(N(x.hr),o)===null?null:27*share(N(x.hr),o),2,true);
   case "WHIP":return rate(N(x.whip),2,true);case "暴投":return d(x.wp);
   case "ボーク":return d(x.bk);case "球数":return d(x.np);
   case "失点":return d(x.r);case "自責点":return d(x.er);
   default:return "—";
  }
 };
 const display=(rows,cols,fn,total)=>{
  const out=rows.map(x=>[d(x.year),d(x.club),...cols.map(k=>fn(x,k))]);
  if(rows.length)out.push(["<strong>通算</strong>","—",...cols.map(k=>fn(total(),k))]);
  return table(["年","球団",...cols],out);
 };
 const chunks=[];
 if(bat.length)chunks.push({kind:"bat",html:"<h3>MLB打撃成績</h3>"+display(bat,MLB_BAT_COLS,batValue,batSum)});
 if(pit.length)chunks.push({kind:"pit",html:"<h3>MLB投手成績</h3>"+display(pit,MLB_PITCH_COLS,pitchValue,pitSum)});
 if(String(position||"").includes("投"))chunks.sort((a,b)=>a.kind==="pit"?-1:b.kind==="pit"?1:0);
 const sourceLinks=[...new Set(items.map(x=>x.source).filter(validUrl))];
 return '<section class="panel npb-detail mlb-detail"><h2>MLB年度別・通算成績</h2>'+
  '<p class="small muted">MLBレギュラーシーズンのメジャー公式戦のみです（MiLB・マイナー、オープン戦、ポストシーズン除外）。NPBと同じ列で年度・球団別・通算を表示します。QS/HQSはMLB公式の試合別投手記録から計算し、未確認は「—」です。</p>'+
  chunks.map(c=>c.html).join("")+
  '<p class="small muted">出典：MLB公式Stats API（レギュラーシーズンの球団別記録）。移籍年の合計行は重複計上せず、QS率・HQS率は達成数÷先発登板数×100で計算します。HP・FIPなど比較可能な公式値がない項目は「—」です。</p>'+
  (sourceLinks.length?'<p class="small muted">記録資料：'+sourceLinks.map((url,i)=>external(url,"MLB成績資料"+(sourceLinks.length>1?" "+(i+1):""))).join("／")+'</p>':"")+'</section>';
}

async function profilePage(){
const id=new URLSearchParams(location.search).get("id");
const [players,seasons,careers,internationals,awards,allstars,extended,supplement,mlb]=await Promise.all(["players","seasons","careers","internationals","awards","allstars","npb_extended","npb_supplement","mlb_extended"].map(load));
const p=players.find(v=>v.id===id);if(!p){app.innerHTML=title("選手が見つかりません")+`<p>有効な世代IDを指定してください。 <a href="index.html">一覧へ戻る</a></p>`;return;}
const y=seasons.filter(s=>s.id===id).sort(yearsAsc),mlbYears=(mlb.rows||[]).filter(s=>s.id===id),otherYears=y.filter(s=>s.league!=="NPB"&&s.league!=="MLB"),c=careers.filter(s=>s.id===id).sort((a,b)=>Number(a.order)-Number(b.order)),it=internationals.filter(s=>s.id===id).sort(yearsAsc),aw=awards.filter(s=>s.id===id),as=allstars.filter(s=>s.id===id).sort(yearsAsc),npbDetail=joinedNPB(y,extended,supplement,id),allstarYears=[...new Set(as.map(s=>Number(s.year)).filter(Number.isInteger))].sort((a,b)=>a-b),summaries=summarizeTitles(aw);
app.innerHTML=`<p class="breadcrumb"><a href="index.html">選手一覧</a> / 世代ID ${e(id)}</p>`+title(p.name,`世代ID ${id}・${p.dob||"生年月日未取得"}`)+

`<section class="panel"><h2>基本情報</h2><dl class="details"><dt>生年月日</dt><dd>${d(p.dob)}</dd><dt>守備位置・投打</dt><dd>${d(p.pos)}／${d(p.throws)}投${d(p.bats)}打</dd><dt>出身校</dt><dd>${d(p.school)}</dd><dt>最終経歴(2026)</dt><dd>${d(p.club2026)}</dd></dl>${info(external(p.npbUrl,"NPB公式選手ページ"))}</section>`+
npbDetailView(npbDetail,p.pos)+
mlbDetailView(mlbYears,p.pos,mlb.careerTotals?.[id]||null)+
(otherYears.length?`<section class="panel"><h2>独立・その他リーグ年度別成績</h2>${p.caution?`<p class="notice">一部数値は照合留保があります。出典を確認してください。</p>`:""}${table(seasonCols,seasonRows(otherYears))}<p class="small muted">NPBとMLBとは分離し、独立・その他リーグの収録済み成績だけを簡易表示します。未取得値は「—」です。</p></section>`:"")+

`<section class="panel career-detail"><h2>所属・経歴</h2><p class="small muted">高校からの球歴を時系列順に掲載します（助っ人は学歴を省略）。NPBは育成期間・一軍未出場年度を含む在籍年度を表示し、高校・大学・社会人・NPB・独立・MLB（傘下を含む）・海外・他に分類しています。終了年は引退または2025年以前の確認済み終了時に表示します。2026年まで在籍が確認できても引退未確認なら終了欄は空欄です。</p>${table(["区分","所属・役職","開始","終了"],c.map(a=>[d(careerCategory(a)),d(careerClub(a)),d(a.start),blank(a.end)?"":d(a.end)]),"所属・経歴は未収録です.")}${c.filter(a=>a.activityNote).map(a=>`<p class="small muted">※${e(a.activityNote)}</p>`).join("")}</section>`+
`<section class="panel"><h2>主要タイトル</h2>${summaries.length?`<ul class="award-summary">${summaries.map(x=>`<li>${e(x.name)} ${x.years.length}回（${e(compactYears(x.years))}）</li>`).join("")}</ul>`:`<p class="empty">該当する主要タイトルは、現在の収録データにありません。</p>`}<p class="small muted">NPB一軍のみ：MVP・沢村賞・長嶋賞・投手四冠・野手六冠・GG・B9・新人王を掲載しています。</p></section>`+
`<section class="panel"><h2>オールスター</h2>${allstarYears.length?`<ul class="award-summary"><li>オールスター選出 ${allstarYears.length}回（${e(compactYears(allstarYears))}）</li></ul>`:`<p class="empty">オールスター選出の収録記録はありません。</p>`}</section>`+
`<section class="panel international-detail"><h2>WBC・プレミア12・五輪</h2>${table(["年","大会","代表","試合・登板","本塁打","防御率","資料","備考"],it.map(a=>[d(a.year),d(a.event),d(a.country),d(a.pitchGames||a.batGames),d(a.hr),d(a.era),external(a.source,"資料")||"—",d(a.note)]))}</section>`;
}
async function seasonPage(){
const [allRows,meta]=await Promise.all([load("seasons"),load("meta")]);
const rows=allRows.filter(r=>r.league!=="NPB"&&r.league!=="MLB");
const leagueList=[...new Set(rows.map(r=>r.league))].sort((a,b)=>String(a).localeCompare(String(b),"ja"));
app.innerHTML=title("独立・その他リーグ年度別成績","MLBは専用タブで表示します。こちらは独立リーグなどNPB・MLB以外の年度別成績です。")+
`<div class="control-bar"><label>選手名・球団名<input id="q" type="search" placeholder="例：岡本、DeNA"></label><label>リーグ<select id="league"><option value="">すべて</option>${leagueList.map(l=>`<option value="${e(l)}">${e(l)}</option>`).join("")}</select></label><label>年度<select id="year"><option value="">すべて</option>${[...new Set(rows.map(r=>r.year))].sort((a,b)=>Number(a)-Number(b)).map(y=>`<option>${e(y)}</option>`).join("")}</select></label></div><p id="count" class="small muted"></p><div id="results"></div>`+
info("現在の収録："+leagueList.map(l=>l+" "+rows.filter(r=>r.league===l).length+"行").join("／")+"。その他海外リーグは確認済みの成績が追加され次第ここに表示します。独立リーグでは大会ごとに集計範囲が異なる場合があるため注記を確認してください。未入力値を0とみなしません。");
const q=app.querySelector("#q"),league=app.querySelector("#league"),year=app.querySelector("#year"),count=app.querySelector("#count"),target=app.querySelector("#results");
function render(){
const text=q.value.normalize("NFKC").toLocaleLowerCase("ja");let x=rows.filter(r=>(r.name+" "+r.club).normalize("NFKC").toLocaleLowerCase("ja").includes(text)&&(!league.value||r.league===league.value)&&(!year.value||r.year===year.value)).sort(yearsAsc);
count.textContent=`${x.length}件／全${rows.length}件`;
target.innerHTML=table(["選手",...seasonCols],x.map(s=>[`<a href="player.html?id=${encodeURIComponent(s.id)}">${e(s.name)}</a>`,...statCells(s)]));
}
for(const n of [q,league,year])n.addEventListener(n===q?"input":"change",render);render();
}

async function mlbListPage(){
 const [mlb,players]=await Promise.all([load("mlb_extended"),load("players")]);
 const names=new Map(players.map(p=>[p.id,p.name]));
 const rows=[...(mlb.rows||[])].sort((a,b)=>Number(a.year)-Number(b.year)||String(a.id).localeCompare(String(b.id))||String(a.club).localeCompare(String(b.club)));
 app.innerHTML=title("MLB年度別成績","1996年度生まれの収録選手に限定したMLBレギュラーシーズンの球団別成績です。")+
 '<div class="control-bar"><label>選手名・球団名<input id="mlb-q" type="search" placeholder="例：岡本、TOR"></label>'+
 '<label>年度<select id="mlb-year"><option value="">すべて</option>'+[...new Set(rows.map(x=>x.year))].sort((a,b)=>Number(a)-Number(b)).map(y=>'<option value="'+e(y)+'">'+e(y)+'</option>').join("")+'</select></label></div>'+
 '<p id="mlb-count" class="small muted"></p><div id="mlb-results"></div>'+
 info("MLB公式戦の年度・球団別数値を表示。NPB・MiLB・独立リーグは含みません。欠測を0とみなしません。個人ページではさらに多くの指標とMLB通算を確認できます。");
 const q=app.querySelector("#mlb-q"),year=app.querySelector("#mlb-year"),counter=app.querySelector("#mlb-count"),target=app.querySelector("#mlb-results");
 const rate=(value,places=3)=>{const n=numeric(value);return n===null?"—":e(n.toFixed(places).replace(places===3?/^0\./:/^$/,"."));};
 function render(){
   const term=q.value.normalize("NFKC").toLocaleLowerCase("ja");
   const chosen=rows.filter(x=>((names.get(x.id)||"")+" "+x.club).normalize("NFKC").toLocaleLowerCase("ja").includes(term)&&(!year.value||x.year===year.value));
   counter.textContent=chosen.length+" / "+rows.length+" 行、"+new Set(chosen.map(x=>x.id)).size+"人";
   const bat=chosen.filter(x=>x.kind==="batting"),pit=chosen.filter(x=>x.kind==="pitching");
   const name=x=>'<a href="player.html?id='+encodeURIComponent(x.id)+'">'+e(names.get(x.id)||x.id)+'</a>';
   const v=x=>d(x);
   target.innerHTML='<section class="panel"><h2>MLB打撃成績</h2>'+
    table(["選手","年","球団","試合","打席","打数","打率","安打","本塁打","打点","盗塁","出塁率","長打率","OPS","資料"],
      bat.map(x=>[name(x),v(x.year),v(x.club),v(x.g),v(x.pa),v(x.ab),rate(x.avg),v(x.h),v(x.hr),v(x.rbi),v(x.sb),rate(x.obp),rate(x.slg),rate(x.ops),external(x.source,"出典")||"—"]))+'</section>'+
    '<section class="panel"><h2>MLB投手成績</h2>'+
    table(["選手","年","球団","登板","先発","防御率","投球回","勝","敗","H","S","奪三振","WHIP","資料"],
      pit.map(x=>[name(x),v(x.year),v(x.club),v(x.g),v(x.gs),rate(x.era,2),v(x.ip),v(x.w),v(x.l),v(x.hold),v(x.sv),v(x.k),rate(x.whip,2),external(x.source,"出典")||"—"]))+'</section>';
 }
 q.addEventListener("input",render);year.addEventListener("change",render);render();
}

async function comparePage(){
const [players,seasons]=await Promise.all([load("players"),load("seasons")]);
const opts=players.map(p=>`<option value="${e(p.id)}">${e(p.name)}（${e(p.id)}）</option>`).join("");
app.innerHTML=title("2選手比較","リーグ混算を避けるため、NPBの年度別成績を並べて比較します。")+
`<div class="control-bar"><label>選手A<select id="a">${opts}</select></label><label>選手B<select id="b">${opts}</select></label></div><div id="compare"></div>`;
const a=app.querySelector("#a"),b=app.querySelector("#b"),target=app.querySelector("#compare");a.value="001";b.value="002";
function render(){
const p1=players.find(p=>p.id===a.value),p2=players.find(p=>p.id===b.value);
const per=p=>seasons.filter(s=>s.id===p.id&&s.league==="NPB").sort(yearsAsc);
const total=(list,k)=>{const vals=list.map(v=>v[k]).filter(v=>v!==""&&!isNaN(Number(v)));return vals.length?String(vals.reduce((n,v)=>n+Number(v),0)):"—";};
const s1=per(p1),s2=per(p2);
target.innerHTML=`<div class="compare-grid">${[p1,p2].map((p,i)=>`<section class="panel"><h2>${who(p)}</h2><p>${d(p.pos)}・${d(p.club2026)}</p><div class="stats">${countTile((i?s2:s1).length,"NPB年度×球団行")}${countTile(total(i?s2:s1,"hr"),"本塁打合計")}${countTile(total(i?s2:s1,"wins"),"勝利数合計")}</div>${table(seasonCols,seasonRows(i?s2:s1))}</section>`).join("")}</div>${info("本塁打・勝利数は収録済みNPB行の単純合計です。未収録年度や未確認値は補完しません。防御率・打率の単純平均は算出しません。")}`;
}
a.addEventListener("change",render);b.addEventListener("change",render);render();
}
async function internationalPage(){
const [rows,players]=await Promise.all([load("internationals"),load("players")]);
const names=new Map(players.map(p=>[p.id,p]));
app.innerHTML=title("国際大会成績","対象：WBC、プレミア12、オリンピック（該当予選を含む）")+
`<div class="control-bar"><label>選手名・代表国・大会名<input id="q" type="search" placeholder="例：キューバ、WBC"></label><label>種別<select id="event"><option value="">すべて</option><option value="WBC">WBC</option><option value="プレミア">プレミア12</option><option value="五輪">五輪・オリンピック</option></select></label></div><p id="count" class="small muted"></p><div id="results"></div>`;
const q=app.querySelector("#q"),evt=app.querySelector("#event"),count=app.querySelector("#count"),target=app.querySelector("#results");
function render(){
const text=q.value.normalize("NFKC").toLocaleLowerCase("ja");
const x=rows.filter(r=>(r.name+" "+r.event+" "+r.country+" "+r.stage).normalize("NFKC").toLocaleLowerCase("ja").includes(text)&&(!evt.value||(evt.value==="五輪"?/五輪|オリンピック|Olympic/i.test(r.event):r.event.includes(evt.value)))).sort(yearsAsc);
count.textContent=`${x.length} / ${rows.length}件`;
target.innerHTML=table(["選手","年","大会","国","区分","投手登板","投球回","野手試合","本塁打","打点","資料"],x.map(r=>[who(names.get(r.id)||{id:r.id,name:r.name}),d(r.year),d(r.event),d(r.country),d(r.stage),d(r.pitchGames),r.outs!==""?d(Number(r.outs)%3===0?String(Number(r.outs)/3):`${Math.floor(Number(r.outs)/3)} ${Number(r.outs)%3}/3`):"—",d(r.batGames),d(r.hr),d(r.rbi),external(r.source,"出典")||"—"]));
}
q.addEventListener("input",render);evt.addEventListener("change",render);render();
}


const TEAM_ABBREV={
 "読売":"巨人","読売ジャイアンツ":"巨人","巨人":"巨人",
 "東京ヤクルト":"ヤクルト","ヤクルト":"ヤクルト",
 "横浜DeNA":"DeNA","横浜DeNAベイスターズ":"DeNA",
 "中日":"中日","中日ドラゴンズ":"中日",
 "阪神":"阪神","阪神タイガース":"阪神",
 "広島東洋":"広島","広島":"広島",
 "北海道日本ハム":"日ハム","日本ハム":"日ハム",
 "東北楽天":"楽天","楽天":"楽天",
 "千葉ロッテ":"ロッテ","ロッテ":"ロッテ",
 "埼玉西武":"西武","西武":"西武",
 "オリックス":"オリ","オリックス・バファローズ":"オリ",
 "福岡ソフトバンク":"ソフト","ソフトバンク":"ソフト",
 "オイシックス新潟":"オイシ","オイシックス":"オイシ",
 "くふうハヤテ":"ハヤテ","くふうハヤテベンチャーズ静岡":"ハヤテ",
 "ハヤテ":"ハヤテ"
};
function teamAbbrev(name){return TEAM_ABBREV[String(name||"")]||String(name||"");}

async function rankingsPage(){
 const [players,seasons,extended,supplement]=await Promise.all(["players","seasons","npb_extended","npb_supplement"].map(load));
 const records=joinedNPB(seasons,extended,supplement), people=new Map(players.map(x=>[x.id,x]));
 const years=[...new Set(records.map(r=>r.season.year))].sort((a,b)=>Number(a)-Number(b));
 const opts=k=>RANK_CATEGORIES[k].map(([id,name])=>'<option value="'+e(id)+'">'+e(name)+'</option>').join("");
 app.innerHTML=title("1996世代 NPBランキング","1996年度生まれの選手のみを対象にしたNPB一軍の年度別・通算ランキングです。")+
 '<div class="control-bar">'+
 '<label>集計期間<select id="scope"><option value="career">NPB通算</option><option value="year">年度別</option></select></label>'+
 '<label>年度<select id="year">'+years.map(y=>'<option value="'+e(y)+'">'+e(y)+'年</option>').join("")+'</select></label>'+
 '<label>分野<select id="kind"><option value="batting">打撃</option><option value="pitching">投手</option></select></label>'+
 '<label>指標<select id="metric">'+opts("batting")+'</select></label>'+
 '<label>率の最低基準（打数／投球回）<input id="minimum" type="number" min="0" step="1" value="300"></label>'+
 '</div><p id="rank-info" class="rank-note"></p><div id="results"></div>'+
 '<p class="small muted">※NPB全選手ではなく、1996年度世代内の順位です。同一年の複数球団成績は合算します。率の順位は公式の規定打席・規定投球回ではなく、指定した最低打数／投球回による参考順位です。欠測は0として扱いません。通算出塁率・OPSは、NPB公式から取得した死球・犠飛を含む分母で算出しています。</p>';
 const scope=app.querySelector("#scope"),year=app.querySelector("#year"),
 kind=app.querySelector("#kind"),metric=app.querySelector("#metric"),
 minimum=app.querySelector("#minimum"),infoEl=app.querySelector("#rank-info"),target=app.querySelector("#results");
 scope.value="career";year.value=years[years.length-1]||"";kind.value="batting";metric.value="homeRuns";
 function refreshOptions(){
   const prev=metric.value;
   metric.innerHTML=opts(kind.value);
   metric.value=RANK_CATEGORIES[kind.value].some(x=>x[0]===prev)?prev:
     (kind.value==="pitching"?"wins":"homeRuns");
 }
 function resetMin(){
   const ratio=["avg","obp","slg","ops","era","whip"].includes(metric.value);
   minimum.disabled=!ratio;
   if(ratio)minimum.value=scope.value==="career"?
     (kind.value==="batting"?"300":"100"):(kind.value==="batting"?"100":"50");
 }
 function render(){
   const annual=scope.value==="year";year.disabled=!annual;
   const group=new Map();
   for(const x of records){
     if(annual&&x.season.year!==year.value)continue;
     const id=x.season.id;
     if(!group.has(id))group.set(id,[]);
     group.get(id).push(x);
   }
   const entries=[...group.entries()].map(([id,rows])=>({
     id,name:people.get(id)?.name||rows[0].season.name,total:sumNPB(rows),
     clubs:[...new Set([...rows].sort((a,b)=>Number(a.season.year)-Number(b.season.year)).map(x=>teamAbbrev(x.season.club)))].join("・"),
     years:[...new Set(rows.map(x=>Number(x.season.year)))].sort((a,b)=>a-b)
   }));
   const min=Math.max(0,Number(minimum.value)||0);
   const ranked=rankRecords(entries,metric.value,min);
   const metricName=RANK_CATEGORIES[kind.value].find(x=>x[0]===metric.value)?.[1]||"";
   infoEl.textContent=(annual?year.value+"年":"NPB通算")+"／"+metricName+
     "／対象"+ranked.length+"人"+
     (["avg","obp","slg","ops"].includes(metric.value)?"（最低打数"+min+"）":
       ["era","whip"].includes(metric.value)?"（最低投球回"+min+"）":"");
   const rows=ranked.map(x=>[
     '<span class="rank-number" aria-label="第'+e(x.rank)+'位">'+e(x.rank)+'.</span><a href="player.html?id='+encodeURIComponent(x.id)+'">'+e(x.name)+'</a>',
     d(x.clubs),'<strong>'+metricLabel(x.total,metric.value)+'</strong>',
     d(annual?year.value:compactYears(x.years))
   ]);
   target.innerHTML='<div class="leaders-table">'+
      table(["選手","チーム","記録","年度"],rows,"条件を満たす記録がありません。")+
     '</div>';
 }
 scope.addEventListener("change",()=>{resetMin();render()});
 year.addEventListener("change",render);
 kind.addEventListener("change",()=>{refreshOptions();resetMin();render()});
 metric.addEventListener("change",()=>{resetMin();render()});
 minimum.addEventListener("input",render);
 resetMin();render();
}

async function aboutPage(){
const m=await load("meta");
app.innerHTML=title("データの見方","公開データの対象・更新方法・未確認値の扱い")+
`<section class="panel"><h2>収録範囲</h2><p>1996年度生まれ（1996年4月2日～1997年4月1日）のNPB所属経験者を中心に扱います。現在の公開選手は<strong>${e(m.counts.players)}人</strong>です。</p><p>NPB・国内独立・MLBの年度別成績はリーグ別に記録し、国際大会はWBC・プレミア12・オリンピックに限定しています。</p></section>`+
`<section class="panel"><h2>NPB詳細成績・通算成績・ランキング</h2><p>現在、NPB一軍の年度成績549行について打席・打数・安打・長打率・出塁率・OPSなどの詳細項目を収録し、投手298年度行には奪三振・与四球・自責点・被安打・WHIPも収録しています。</p><p>通算打率は「安打÷打数」、長打率は「塁打÷打数」、防御率は「自責点×27÷投球アウト数」、WHIPは「（被安打＋与四球）×3÷投球アウト数」から算出します。通算出塁率は「（安打＋四球＋死球）÷（打数＋四球＋死球＋犠飛）」、通算OPSは「出塁率＋長打率」で算出しています。</p><p><a href="rankings.html">NPB年度別・通算ランキング</a>は1996年度生まれの収録選手内で比較します。公式のNPB全体順位とは異なり、率の集計は任意の最低打数・最低投球回による参考順位です。</p><p>NPB公式ページにある完投・完封・対戦打者・盗塁刺・犠飛などの追加項目を、NPB一軍年度成績がある96人の打撃549行・投手298行について収録しました。一軍成績のない26人には、追加記録を無理に補完していません。</p></section>`+
`<section class="panel"><h2>欠測・照合上の注意</h2><p>空欄は取得できていない値や該当しない値を表します。ゼロと同一視しません。国内独立リーグには照合が未完了の数値があり、留保注記を付けます。</p><p>投球回は3アウトを1回として「140 1/3」などの帯分数で表示します。現況所属は確認日現在のものです。</p></section>`+
`<section class="panel"><h2>公開用スナップショット</h2><p>このページのデータ基準日：<strong>${e(m.built)}</strong>。Googleスプレッドシートの一部公開用列からJSONを生成しており、元スプレッドシートを丸ごと一般公開していません。元表を更新してもサイトには自動反映しません。</p><ul>${Object.entries(m.counts).map(([k,v])=>`<li>${e(k)}：${e(v)}件</li>`).join("")}</ul></section>`+
``;
}
async function init(){
try{if(page==="index")await listPage();else if(page==="player")await profilePage();else if(page==="seasons")await seasonPage();else if(page==="mlb")await mlbListPage();else if(page==="compare")await comparePage();else if(page==="international")await internationalPage();else if(page==="rankings")await rankingsPage();else if(page==="about")await aboutPage();else app.textContent="不明なページです。";}
catch(err){app.innerHTML=`<section class="panel"><h2>データを読み込めませんでした</h2><p>${e(err.message)}</p><p>GitHub Pages上で開いているか、dataフォルダが配置されているか確認してください。</p></section>`;console.error(err);}
}
init();
})();