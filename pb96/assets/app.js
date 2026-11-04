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
  const name=String(item.award||"").replace(/\\s+/g,"");
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
    if(!k||!/^\\d{4}$/.test(String(item.year)))continue;
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
async function listPage(){
const [players,meta]=await Promise.all([load("players"),load("meta")]);
app.innerHTML=title("1996年度世代 選手一覧","1996年4月2日～1997年4月1日生まれ。新規登録選手も世代IDで管理します。")+
`<div class="stats">${countTile(players.length,"登録選手")}${countTile(meta.counts.seasons,"年度別成績レコード")}${countTile(meta.counts.internationals,"対象国際大会記録")}</div>`+
`<div class="control-bar"><label>選手名・球団・学校を検索<input id="search" type="search" placeholder="例：岡本、阪神、西武"></label><label>守備位置<select id="position"><option value="">すべて</option><option value="投">投手</option><option value="捕">捕手</option><option value="内">内野手</option><option value="外">外野手</option></select></label><label>並べ替え<select id="sort"><option value="id">世代ID順</option><option value="name">氏名順</option><option value="dob">生年月日順</option><option value="npb">NPB成績最終年順</option></select></label></div>`+
`<p id="counter" class="small muted" aria-live="polite"></p><div id="results"></div>`+info("※2026年の所属は資料確認時点の記録です。「要確認」は現在の所属確定を意味しません。");
const q=app.querySelector("#search"),pos=app.querySelector("#position"),sort=app.querySelector("#sort"),target=app.querySelector("#results"),counter=app.querySelector("#counter");
function render(){
const text=q.value.normalize("NFKC").toLocaleLowerCase("ja");
let x=players.filter(p=>([p.id,p.name,p.club2026,p.club2025,p.school].join(" ").normalize("NFKC").toLocaleLowerCase("ja").includes(text))&&(!pos.value||p.pos.includes(pos.value)));
x.sort(sort.value==="name"?(a,b)=>a.name.localeCompare(b.name,"ja"):sort.value==="dob"?(a,b)=>a.dob.localeCompare(b.dob):sort.value==="npb"?(a,b)=>Number(b.lastNpbYear||0)-Number(a.lastNpbYear||0):((a,b)=>Number(a.id)-Number(b.id)));
counter.textContent=`${x.length} / ${players.length} 人`;
target.innerHTML=table(["ID","選手名","生年月日","位置","2026年確認所属・経歴","現況","NPB最終成績年"],x.map(p=>[d(p.id),who(p),d(p.dob),d(p.pos),d(p.club2026),badge(p.clubStatus),d(p.lastNpbYear)]),"一致する選手はありません。");
}
for(const n of [q,pos,sort])n.addEventListener(n===q?"input":"change",render);
render();
}
async function profilePage(){
const id=new URLSearchParams(location.search).get("id");
const [players,seasons,careers,internationals,awards,allstars]=await Promise.all(["players","seasons","careers","internationals","awards","allstars"].map(load));
const p=players.find(v=>v.id===id);if(!p){app.innerHTML=title("選手が見つかりません")+`<p>有効な世代IDを指定してください。 <a href="index.html">一覧へ戻る</a></p>`;return;}
const y=seasons.filter(s=>s.id===id).sort(yearsAsc),c=careers.filter(s=>s.id===id).sort((a,b)=>Number(a.order)-Number(b.order)),it=internationals.filter(s=>s.id===id).sort(yearsAsc),aw=awards.filter(s=>s.id===id),as=allstars.filter(s=>s.id===id).sort(yearsAsc),summaries=summarizeTitles(aw);
app.innerHTML=`<p class="breadcrumb"><a href="index.html">選手一覧</a> / 世代ID ${e(id)}</p>`+title(p.name,`世代ID ${id}・${p.dob||"生年月日未取得"}`)+
`<div class="stats">${countTile(y.filter(s=>s.league==="NPB").length,"NPB年度×球団")}${countTile(y.filter(s=>s.league==="独立").length,"独立年度×球団")}${countTile(it.length,"対象国際大会")}${countTile(summaries.reduce((n,x)=>n+x.years.length,0),"主要タイトル獲得")}</div>`+
`<section class="panel"><h2>基本情報・2026年確認状況</h2><dl class="details"><dt>生年月日</dt><dd>${d(p.dob)}</dd><dt>守備位置・投打</dt><dd>${d(p.pos)}／${d(p.throws)}投${d(p.bats)}打</dd><dt>出身校</dt><dd>${d(p.school)}</dd><dt>2025年保存球団</dt><dd>${d(p.club2025)}</dd><dt>2026年確認所属・経歴</dt><dd>${d(p.club2026)}</dd><dt>現況確認</dt><dd>${badge(p.clubStatus)}</dd><dt>確認日</dt><dd>${d(p.checked)}</dd></dl>${p.clubNote?`<p class="notice">${e(p.clubNote)}</p>`:""}${info(external(p.clubUrl,"現況の根拠")+`　${external(p.npbUrl,"NPB公式選手ページ")}`)}</section>`+
`<section class="panel"><h2>年度別成績 <small>（${y.length}件）</small></h2>${p.caution?`<p class="notice">独立リーグの一部数値は照合留保があります。出典・備考をご確認ください。</p>`:""}${table(seasonCols,seasonRows(y), "年度別成績の記録は未収録です。未出場やゼロ成績を意味しません。")}<p class="small muted">※球団・リーグ別の原表行です。NPBと独立とMLBを合算していません。空欄は「—」で表示します。</p></section>`+
`<section class="panel"><h2>所属・経歴 <small>（${c.length}件）</small></h2>${table(["区分","所属・役職","開始","終了"],c.map(a=>[d(a.category),d(a.club),d(a.start),d(a.end)]),"プロ・独立・球団スタッフの経歴は未収録です。")}</section>`+
`<section class="panel"><h2>主要タイトル <small>（${summaries.length}部門）</small></h2>${summaries.length?`<ul class="award-summary">${summaries.map(x=>`<li>${e(x.name)} ${x.years.length}回（${e(compactYears(x.years))}）</li>`).join("")}</ul>`:`<p class="empty">該当する主要タイトルは、現在の収録データにありません。</p>`}<p class="small muted">NPB一軍のみ：MVP・沢村賞・長嶋賞・投手四冠・野手六冠・GG・B9・新人王を掲載しています。</p></section>`+
`<section class="panel"><h2>オールスター <small>（${as.length}件）</small></h2>${table(["年度","大会","選出","資料"],as.map(a=>[d(a.year),d(a.event),d(a.status),external(a.source,"出典")||"—"]) )}</section>`+
`<section class="panel"><h2>WBC・プレミア12・五輪 <small>（${it.length}件）</small></h2>${table(["年","大会","代表","試合・登板","本塁打","防御率","備考"],it.map(a=>[d(a.year),d(a.event),d(a.country),d(a.pitchGames||a.batGames),d(a.hr),d(a.era),`${external(a.source,"資料")} ${e(a.note)}`]))}</section>`;
}
async function seasonPage(){
const [rows,meta]=await Promise.all([load("seasons"),load("meta")]);
app.innerHTML=title("年度別成績","NPB・国内独立リーグ・MLBの成績を分けて検索できます。")+
`<div class="control-bar"><label>選手名・球団名<input id="q" type="search" placeholder="例：岡本、DeNA"></label><label>リーグ<select id="league"><option value="">すべて</option><option>NPB</option><option>独立</option><option>MLB</option></select></label><label>年度<select id="year"><option value="">すべて</option>${[...new Set(rows.map(r=>r.year))].sort((a,b)=>Number(a)-Number(b)).map(y=>`<option>${e(y)}</option>`).join("")}</select></label></div><p id="count" class="small muted"></p><div id="results"></div>`+
info("各行の確認区分・出典をご確認ください。投球回は投球アウト数を3で割った帯分数です。");
const q=app.querySelector("#q"),league=app.querySelector("#league"),year=app.querySelector("#year"),count=app.querySelector("#count"),target=app.querySelector("#results");
function render(){
const text=q.value.normalize("NFKC").toLocaleLowerCase("ja");let x=rows.filter(r=>(r.name+" "+r.club).normalize("NFKC").toLocaleLowerCase("ja").includes(text)&&(!league.value||r.league===league.value)&&(!year.value||r.year===year.value)).sort(yearsAsc);
count.textContent=`${x.length}件（最大300件を表示）／全${rows.length}件`;
target.innerHTML=table(["選手",...seasonCols],x.slice(0,300).map(s=>[`<a href="player.html?id=${encodeURIComponent(s.id)}">${e(s.name)}</a>`,...statCells(s)]));
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
async function aboutPage(){
const m=await load("meta");
app.innerHTML=title("データの見方","公開データの対象・更新方法・未確認値の扱い")+
`<section class="panel"><h2>収録範囲</h2><p>1996年度生まれ（1996年4月2日～1997年4月1日）のNPB所属経験者を中心に扱います。現在の公開選手は<strong>${e(m.counts.players)}人</strong>です。</p><p>NPB・国内独立・MLBの年度別成績はリーグ別に記録し、国際大会はWBC・プレミア12・オリンピックに限定しています。</p></section>`+
`<section class="panel"><h2>欠測・照合上の注意</h2><p>空欄は取得できていない値や該当しない値を表します。ゼロと同一視しません。国内独立リーグには照合が未完了の数値があり、留保注記を付けます。</p><p>投球回は3アウトを1回として「140 1/3」などの帯分数で表示します。現況所属は確認日現在のものです。</p></section>`+
`<section class="panel"><h2>公開用スナップショット</h2><p>このページのデータ基準日：<strong>${e(m.built)}</strong>。Googleスプレッドシートの一部公開用列からJSONを生成しており、元スプレッドシートを丸ごと一般公開していません。元表を更新してもサイトには自動反映しません。</p><ul>${Object.entries(m.counts).map(([k,v])=>`<li>${e(k)}：${e(v)}件</li>`).join("")}</ul></section>`+
``;
}
async function init(){
try{if(page==="index")await listPage();else if(page==="player")await profilePage();else if(page==="seasons")await seasonPage();else if(page==="compare")await comparePage();else if(page==="international")await internationalPage();else if(page==="about")await aboutPage();else app.textContent="不明なページです。";}
catch(err){app.innerHTML=`<section class="panel"><h2>データを読み込めませんでした</h2><p>${e(err.message)}</p><p>GitHub Pages上で開いているか、dataフォルダが配置されているか確認してください。</p></section>`;console.error(err);}
}
init();
})();