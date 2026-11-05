#!/usr/bin/env python3
"""Validate and import 2026 HQS from nf3, only when published GS and QS agree."""
import json,re,unicodedata
from pathlib import Path
from datetime import datetime,timezone
from urllib.request import Request,urlopen
from bs4 import BeautifulSoup

DATA=Path(__file__).resolve().parent.parent/"pb96"/"data"
YEAR="2026"
TARGETS={
"001":("埼玉西武",["髙橋光成","高橋光成"],"Pacific/L"),
"049":("オリックス",["田嶋大樹"],"Pacific/B"),
"056":("福岡ソフトバンク",["上茶谷大河"],"Pacific/H"),
"067":("千葉ロッテ",["小島和哉"],"Pacific/M"),
"092":("広島東洋",["栗林良吏"],"Central/C"),
"094":("阪神",["伊藤将司"],"Central/T"),
"095":("東北楽天",["藤井聖"],"Pacific/E"),
"116":("千葉ロッテ",["アンドレ・ジャクソン","ジャクソン"],"Pacific/M"),
"118":("読売",["スペンサー・ハワード","ハワード"],"Central/G"),
"120":("横浜DeNA",["オースティン・コックス","コックス"],"Central/DB")
}
COUNT=re.compile(r"\(\s*(\d+)\s*/\s*(\d+)\s*\)")
def normal(x):
 return unicodedata.normalize("NFKC",str(x)).replace(" ","").replace("　","").replace("・","").replace("髙","高")
def read(n):
 return json.loads((DATA/n).read_text(encoding="utf-8"))
def save(n,x):
 (DATA/n).write_text(json.dumps(x,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
def fetch(route):
 url=f"https://nf3.sakura.ne.jp/{route}/t/pc_all_data_etc.htm"
 request=Request(url,headers={"User-Agent":"Mozilla/5.0 PB96-DataAudit/1.0","Cache-Control":"no-cache"})
 with urlopen(request,timeout=25) as res:
  html=res.read(1500000)
  if res.status!=200: raise ValueError(f"HTTP {res.status}")
 soup=BeautifulSoup(html,"html.parser")
 text=soup.get_text(" ",strip=True)
 if "2026年度版" not in text or "QS/HQS/SQS達成状況" not in text:
  raise ValueError("2026 season QS/HQS table not detected")
 matches=[]
 for tr in soup.find_all("tr"):
  t=tr.get_text(" ",strip=True)
  pairs=COUNT.findall(t)
  if len(pairs)!=3: continue
  gs=int(pairs[0][1])
  if gs<1 or any(int(q[1])!=gs for q in pairs):continue
  qs,hqs=int(pairs[0][0]),int(pairs[1][0])
  if not 0<=hqs<=qs<=gs:continue
  matches.append(dict(row=t,normalized=normal(t),gs=gs,qs=qs,hqs=hqs))
 if not matches:raise ValueError("No QS/HQS ratio rows parsed")
 return url,matches

def main():
 ext=read("npb_extended.json");sp=read("npb_supplement.json");season=read("seasons.json")
 eidx={(r["id"],str(r["year"]),r["club"]):r for r in ext["rows"]}
 pidx={(r["id"],str(r["year"]),r["club"]):r for r in sp["rows"] if r.get("kind")=="pitching"}
 sidx={(r["id"],str(r["year"]),r["club"]):r for r in season if r.get("league")=="NPB"}
 fetched={};matched=[];held=[]
 for ident,(club,aliases,route) in TARGETS.items():
  key=(ident,YEAR,club)
  item=dict(id=ident,year=YEAR,club=club,aliases=aliases)
  try:
   if route not in fetched:fetched[route]=fetch(route)
   url,rows=fetched[route]
   poss=[x for x in rows if any(normal(a) in x["normalized"] for a in aliases)]
   if len(poss)!=1:raise ValueError(f"Player rows={len(poss)}")
   found=poss[0]
   e,p,s=eidx.get(key),pidx.get(key),sidx.get(key)
   if not e or not p or not s:raise ValueError("Missing matching annual team record")
   gs,qs,games=int(e["starts"]),int(p["qs"]),int(s["pitchGames"])
   item.update(source=url,sourceGS=found["gs"],sourceQS=found["qs"],sourceHQS=found["hqs"],storedGS=gs,storedQS=qs,officialGames=games)
   if found["gs"]!=gs or found["qs"]!=qs or not 0<=found["hqs"]<=qs<=gs<=games:
    raise ValueError("2026 source is stale or mismatches verified full-season GS/QS")
   if p.get("hqs") not in (None,"") and int(p["hqs"])!=found["hqs"]:
    raise ValueError("Prior HQS conflicts")
   p["hqs"]=found["hqs"];p["hqsSource"]=url
   p["hqsChecked"]="2026-11-05"
   p["hqsBasis"]="nf3 annual 2026 team QS/HQS; GS and QS independently match published NPB annual data"
   item["result"]="accepted";matched.append(item)
  except Exception as ex:
   item["error"]=str(ex);held.append(item)
 pitch=[x for x in sp["rows"] if x.get("kind")=="pitching"]
 n=sum(x.get("hqs") not in (None,"") for x in pitch)
 report=dict(checkedAt=datetime.now(timezone.utc).isoformat(),source="nf3 team QS/HQS 2026",matches=matched,held=held,
  coverage=dict(pitchRows=len(pitch),hqs=n,missing=len(pitch)-n),
  policy="No guessed HQS; only accept matching player, team, 2026 starts and QS.")
 sp.setdefault("coverageAdditional2026AndHistorical",{})["pitcherHQS"]=n
 sp["coverageAdditional2026AndHistorical"]["hqs2026Audit"]="npb_hqs_2026_audit.json"
 save("npb_supplement.json",sp);save("npb_hqs_2026_audit.json",report)
 print(json.dumps(dict(accepted=len(matched),held=held,coverage=report["coverage"],sources=list(fetched)),ensure_ascii=False))
if __name__=="__main__":main()
