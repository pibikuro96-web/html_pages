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
function statCells(s){return [d(s.year),d(s.league),d(s.club),d(s.games),d(s.avg),d(s.hr),d(s.rbi),d(s.sb),d(s.pitchGames),d(s.era),d(s.wins),d(s.losses),d(s.hp),d(s.saves),d(s.innings),external(s.source,"出典")||"—"];}

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

const seasonCols=["年度","リーグ","球団","野手試合","打率","本塁打","打点","盗塁","投手登板","防御率","勝","敗","HP","S","投球回","資料"];
const seasonRows=x=>x.map(s=>statCells(s));
function countTile(n,text){return `<div class="stat"><strong>${e(n)}</strong><span>${e(text)}</span></div>`}

const NPB_NUMBER_FIELDS={
 battingGames:["season","games"],plateAppearances:["detail","pa"],atBats:["detail","ab"],
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
function joinedNPB(seasons,extended,supplement){
 const map=new Map(extended.rows.map(x=>[[x.id,x.year,x.club].join("|"),x]));
 const bat=new Map((supplement?.rows||[]).filter(x=>x.kind==="batting").map(x=>[[x.id,x.year,x.club].join("|"),x]));
 return seasons.filter(s=>s.league==="NPB").map(season=>{
   const key=[season.id,season.year,season.club].join("|");
   return {season,detail:map.get(key)||null,batting:bat.get(key)||null};
 });
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
function npbDetailView(records){
 if(!records.length)return "";
 const list=[...records].sort((a,b)=>Number(a.season.year)-Number(b.season.year)||
   String(a.season.club).localeCompare(String(b.season.club),"ja"));
 const bat=list.filter(r=>(numeric(r.detail?.pa)??0)>0||(numeric(r.season.games)??0)>0);
 const pit=list.filter(r=>numeric(r.season.pitchGames)>0);
 const tBat=sumNPB(bat),tPit=sumNPB(pit);
 const extra=(rows,kind,key)=>d(sumSupplement(rows,kind,key));
 const batColumns=["年","球団","試合","打席","打数","得点","安打","二塁打","三塁打","本塁打","塁打","打点","盗塁","盗塁刺","犠打","犠飛","四球","死球","三振","併殺打","打率","出塁率","長打率","OPS"];
 const pitchColumns=["年","球団","登板","完投","完封","無四球","投球回","勝","敗","HP","S","対戦打者","被安打","被本塁打","与四球","与死球","奪三振","暴投","ボーク","失点","自責点","防御率","WHIP"];
 const battingRow=r=>{
   const a=r.season,x=r.detail||{},z=r.batting||{};
   return [d(a.year),d(a.club),d(a.games),d(x.pa),d(x.ab),d(x.runs),d(x.hits),d(x.doubles),d(x.triples),d(a.hr),d(z.totalBases),d(a.rbi),d(a.sb),d(z.caughtStealing),d(z.sacBunts),d(z.sacFlies),d(x.walks),d(z.hitByPitch),d(x.strikeoutsBat),d(z.gidp),d(a.avg),d(x.obp),d(x.slg),d(x.ops)];
 };
 const pitchingRow=r=>{
   const a=r.season,x=r.detail||{},z=r.pitching||{};
   return [d(a.year),d(a.club),d(a.pitchGames),d(z.completeGames),d(z.shutouts),d(z.noWalks),d(a.innings),d(a.wins),d(a.losses),d(a.hp),d(a.saves),d(z.battersFaced),d(x.hitsAllowed),d(z.homeRunsAllowed),d(x.walksPitch),d(z.hitBatters),d(x.strikeoutsPitch),d(z.wildPitches),d(z.balks),d(z.runsAllowed),d(x.earnedRuns),d(a.era),d(x.whip)];
 };
 const battingTotal=[
  "<strong>通算</strong>","—",d(tBat.battingGames),d(tBat.plateAppearances),
  d(tBat.atBats),d(tBat.runs),d(tBat.hits),d(tBat.doubles),d(tBat.triples),
  d(tBat.homeRuns),extra(bat,"batting","totalBases"),d(tBat.rbi),
  d(tBat.sb),extra(bat,"batting","caughtStealing"),extra(bat,"batting","sacBunts"),
  extra(bat,"batting","sacFlies"),d(tBat.walks),extra(bat,"batting","hitByPitch"),
  d(tBat.battingStrikeouts),extra(bat,"batting","gidp"),ratioLabel(tBat.avg),
  ratioLabel(tBat.obp),ratioLabel(tBat.slg),ratioLabel(tBat.ops)
 ];
 const pitchingTotal=[
  "<strong>通算</strong>","—",d(tPit.pitcherGames),
  extra(pit,"pitching","completeGames"),extra(pit,"pitching","shutouts"),
  extra(pit,"pitching","noWalks"),inningsLabel(tPit.outs),d(tPit.wins),d(tPit.losses),
  d(tPit.hp),d(tPit.saves),extra(pit,"pitching","battersFaced"),d(tPit.hitsAllowed),
  extra(pit,"pitching","homeRunsAllowed"),d(tPit.pitchingWalks),
  extra(pit,"pitching","hitBatters"),d(tPit.pitchingStrikeouts),
  extra(pit,"pitching","wildPitches"),extra(pit,"pitching","balks"),
  extra(pit,"pitching","runsAllowed"),d(tPit.earnedRuns),ratioLabel(tPit.era,2),
  ratioLabel(tPit.whip)
 ];
 let html='<section class="panel npb-detail"><h2>NPB年度別・通算成績</h2>'+
  '<p class="small muted">NPB一軍のみ。公式追加記録も打撃・投手の各表へ統合しています。年度は古い順、通算は最下段です。表は横スクロールできます。</p>';
 if(bat.length)html+='<h3>打撃</h3>'+table(batColumns,[...bat.map(battingRow),battingTotal]);
 if(pit.length)html+='<h3>投手</h3>'+table(pitchColumns,[...pit.map(pitchingRow),pitchingTotal]);
 if(!bat.length&&!pit.length)html+='<p class="empty">NPB一軍成績は未収録です。</p>';
 return html+'</section>';
}

async function profilePage(){
const id=new URLSearchParams(location.search).get("id");
const [players,seasons,careers,internationals,awards,allstars,extended,supplement]=await Promise.all(["players","seasons","careers","internationals","awards","allstars","npb_extended","npb_supplement"].map(load));
const p=players.find(v=>v.id===id);if(!p){app.innerHTML=title("選手が見つかりません")+`<p>有効な世代IDを指定してください。 <a href="index.html">一覧へ戻る</a></p>`;return;}
const y=seasons.filter(s=>s.id===id).sort(yearsAsc),otherYears=y.filter(s=>s.league!=="NPB"),c=careers.filter(s=>s.id===id).sort((a,b)=>Number(a.order)-Number(b.order)),it=internationals.filter(s=>s.id===id).sort(yearsAsc),aw=awards.filter(s=>s.id===id),as=allstars.filter(s=>s.id===id).sort(yearsAsc),npbDetail=joinedNPB(y,extended,supplement),allstarYears=[...new Set(as.map(s=>Number(s.year)).filter(Number.isInteger))].sort((a,b)=>a-b),summaries=summarizeTitles(aw);
app.innerHTML=`<p class="breadcrumb"><a href="index.html">選手一覧</a> / 世代ID ${e(id)}</p>`+title(p.name,`世代ID ${id}・${p.dob||"生年月日未取得"}`)+
`<div class="stats">${countTile(y.filter(s=>s.league==="NPB").length,"NPB年度×球団")}${countTile(y.filter(s=>s.league==="独立").length,"独立年度×球団")}${countTile(it.length,"対象国際大会")}${countTile(summaries.reduce((n,x)=>n+x.years.length,0),"主要タイトル獲得")}</div>`+
`<section class="panel"><h2>基本情報</h2><dl class="details"><dt>生年月日</dt><dd>${d(p.dob)}</dd><dt>守備位置・投打</dt><dd>${d(p.pos)}／${d(p.throws)}投${d(p.bats)}打</dd><dt>出身校</dt><dd>${d(p.school)}</dd><dt>最終経歴(2026)</dt><dd>${d(p.club2026)}</dd></dl>${info(external(p.npbUrl,"NPB公式選手ページ"))}</section>`+
npbDetailView(npbDetail)+
(otherYears.length?`<section class="panel"><h2>年度別成績（NPB以外）</h2>${p.caution?`<p class="notice">独立リーグの一部数値は照合留保があります。出典・備考をご確認ください。</p>`:""}${table(seasonCols,seasonRows(otherYears))}<p class="small muted">※独立リーグ・MLB・その他海外リーグに収録記録がある場合のみ表示します。NPB成績は上の専用欄に掲載しています。欠測は「—」で表示します。</p></section>`:"")+

`<section class="panel"><h2>所属・経歴</h2>${table(["区分","所属・役職","開始","終了"],c.map(a=>[d(a.category),d(a.club),d(a.start),d(a.end)]),"プロ・独立・球団スタッフの経歴は未収録です。")}</section>`+
`<section class="panel"><h2>主要タイトル</h2>${summaries.length?`<ul class="award-summary">${summaries.map(x=>`<li>${e(x.name)} ${x.years.length}回（${e(compactYears(x.years))}）</li>`).join("")}</ul>`:`<p class="empty">該当する主要タイトルは、現在の収録データにありません。</p>`}<p class="small muted">NPB一軍のみ：MVP・沢村賞・長嶋賞・投手四冠・野手六冠・GG・B9・新人王を掲載しています。</p></section>`+
`<section class="panel"><h2>オールスター</h2>${allstarYears.length?`<ul class="award-summary"><li>オールスター選出 ${allstarYears.length}回（${e(compactYears(allstarYears))}）</li></ul>`:`<p class="empty">オールスター選出の収録記録はありません。</p>`}</section>`+
`<section class="panel international-detail"><h2>WBC・プレミア12・五輪</h2>${table(["年","大会","代表","試合・登板","本塁打","防御率","資料","備考"],it.map(a=>[d(a.year),d(a.event),d(a.country),d(a.pitchGames||a.batGames),d(a.hr),d(a.era),external(a.source,"資料")||"—",d(a.note)]))}</section>`;
}
async function seasonPage(){
const [allRows,meta]=await Promise.all([load("seasons"),load("meta")]);
const rows=allRows.filter(r=>r.league!=="NPB");
const leagueList=[...new Set(rows.map(r=>r.league))].sort((a,b)=>String(a).localeCompare(String(b),"ja"));
app.innerHTML=title("年度別成績（NPB以外）","独立リーグ・MLB・その他海外リーグの成績を表示します。NPB成績は選手詳細とNPBランキングで確認できます。")+
`<div class="control-bar"><label>選手名・球団名<input id="q" type="search" placeholder="例：岡本、DeNA"></label><label>リーグ<select id="league"><option value="">すべて</option>${leagueList.map(l=>`<option value="${e(l)}">${e(l)}</option>`).join("")}</select></label><label>年度<select id="year"><option value="">すべて</option>${[...new Set(rows.map(r=>r.year))].sort((a,b)=>Number(a)-Number(b)).map(y=>`<option>${e(y)}</option>`).join("")}</select></label></div><p id="count" class="small muted"></p><div id="results"></div>`+
info("現在の収録："+leagueList.map(l=>l+" "+rows.filter(r=>r.league===l).length+"行").join("／")+"。その他海外リーグは確認済みの成績が追加され次第ここに表示します。未入力値を0とみなしません。");
const q=app.querySelector("#q"),league=app.querySelector("#league"),year=app.querySelector("#year"),count=app.querySelector("#count"),target=app.querySelector("#results");
function render(){
const text=q.value.normalize("NFKC").toLocaleLowerCase("ja");let x=rows.filter(r=>(r.name+" "+r.club).normalize("NFKC").toLocaleLowerCase("ja").includes(text)&&(!league.value||r.league===league.value)&&(!year.value||r.year===year.value)).sort(yearsAsc);
count.textContent=`${x.length}件／全${rows.length}件`;
target.innerHTML=table(["選手",...seasonCols],x.map(s=>[`<a href="player.html?id=${encodeURIComponent(s.id)}">${e(s.name)}</a>`,...statCells(s)]));
}
for(const n of [q,league,year])n.addEventListener(n===q?"input":"change",render);render();
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
try{if(page==="index")await listPage();else if(page==="player")await profilePage();else if(page==="seasons")await seasonPage();else if(page==="compare")await comparePage();else if(page==="international")await internationalPage();else if(page==="rankings")await rankingsPage();else if(page==="about")await aboutPage();else app.textContent="不明なページです。";}
catch(err){app.innerHTML=`<section class="panel"><h2>データを読み込めませんでした</h2><p>${e(err.message)}</p><p>GitHub Pages上で開いているか、dataフォルダが配置されているか確認してください。</p></section>`;console.error(err);}
}
init();
})();