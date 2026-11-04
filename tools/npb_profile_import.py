#!/usr/bin/env python3
"""NPB official personal-season supplementary data import. Only verified year/team rows.
One-shot run, not a background service. Null/absent numbers are never treated as zero.
"""
import argparse, datetime, json, re, time, unicodedata, urllib.request, urllib.robotparser
from collections import Counter
from pathlib import Path
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parent.parent
DATA=ROOT/"pb96"/"data"
FIELDS={
 "batting":{"塁打":"totalBases","盗塁刺":"caughtStealing","犠打":"sacBunts","犠飛":"sacFlies","死球":"hitByPitch","併殺打":"gidp"},
 "pitching":{"完投":"completeGames","完封勝":"shutouts","無四球":"noWalks","打者":"battersFaced","本塁打":"homeRunsAllowed","死球":"hitBatters","暴投":"wildPitches","ボーク":"balks","失点":"runsAllowed"}
}
def norm(s):
 return re.sub(r"[\s\u3000・．.,]+","",unicodedata.normalize("NFKC",str(s or "")))
def integer(x):
 txt=norm(x).replace(",","")
 return int(txt) if re.fullmatch(r"\d+",txt) else None
def get_json(name):
 return json.loads((DATA/name).read_text(encoding="utf8"))
def fetch(url,delay=1.7):
 headers={"User-Agent":"Mozilla/5.0 (compatible; PB96-research/1.0; +https://github.com/pibikuro96-web/html_pages)","Accept-Language":"ja,en;q=0.8"}
 with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=30) as r:
  if r.status!=200:raise ValueError("HTTP "+str(r.status))
  html=r.read(650000)
 return BeautifulSoup(html,"html.parser")
def parse_tables(soup):
 result=[]
 for table in soup.select("table"):
  trs=table.select("tr")
  head=None;start=0
  for i,tr in enumerate(trs[:5]):
   heads=[norm(x.get_text(" ",strip=True)) for x in tr.find_all(["th","td"],recursive=False)]
   if "年度" in heads and "所属球団" in heads and ("打席" in heads or "登板" in heads):
    head=heads;start=i+1;break
  if not head:continue
  kind="pitching" if "登板" in head else "batting"
  fields=FIELDS[kind]
  ix={h:i for i,h in enumerate(head)}
  valid=[h for h in fields if h in ix]
  if len(valid)<5:continue
  for tr in trs[start:]:
   vals=[norm(x.get_text(" ",strip=True)) for x in tr.find_all(["th","td"],recursive=False)]
   if len(vals)<len(head):continue
   year=vals[ix["年度"]]
   if not re.fullmatch(r"20\d{2}",year):continue
   entry={"year":year,"npbClub":vals[ix["所属球団"]],"kind":kind}
   for official,col in fields.items():
    entry[col]=integer(vals[ix[official]]) if official in ix else None
   entry["_ab"]=integer(vals[ix["打数"]]) if "打数" in ix else None
   entry["_g"]=integer(vals[ix["登板"]]) if "登板" in ix else None
   result.append(entry)
 return result

def find_matching(player_id,entry,byyear,details):
 candidates=byyear.get((player_id,entry["year"]),[])
 if not candidates:return None,"no_NPB_source_season"
 if len(candidates)>1:
  target=norm(entry["npbClub"])
  matching=[s for s in candidates if target in norm(s["club"]) or norm(s["club"]) in target]
  if len(matching)!=1:return None,"ambiguous_multi_club"
  source=matching[0]
 else:source=candidates[0]
 ex=details.get((player_id,entry["year"],source["club"]),{})
 if entry["kind"]=="pitching":
  old=integer(source.get("pitchGames"))
  if old is None:return None,"no_pitching_in_source"
  if old!=entry["_g"]:return None,"pitching_games_mismatch"
 else:
  old=integer(ex.get("ab"))
  if old is None:return None,"no_batting_AB_in_source"
  if old!=entry["_ab"]:return None,"at_bats_mismatch"
 return source,None

def main():
 args=argparse.ArgumentParser()
 args.add_argument("--limit",type=int,default=0)
 args.add_argument("--delay",type=float,default=2.0)
 a=args.parse_args()
 players=get_json("players.json")
 seasons=get_json("seasons.json")
 byyear={}
 for row in seasons:
  if row["league"]!="NPB":continue
  byyear.setdefault((row["id"],row["year"]),[]).append(row)
 detailed={(r["id"],r["year"],r["club"]):r for r in get_json("npb_extended.json")["rows"]}
 pilot=get_json("npb_supplement.json")
 records={(r["id"],r["year"],r["kind"]):r for r in pilot["rows"]}
 urls=[p for p in players if re.fullmatch(r"https://npb\.jp/bis/players/\d+\.html",p.get("npbUrl",""))]
 if a.limit>0:urls=urls[:a.limit]
 rp=urllib.robotparser.RobotFileParser()
 rp.set_url("https://npb.jp/robots.txt")
 try:rp.read()
 except Exception as error:raise RuntimeError("Robots rule fetch failed, stopping safely: "+str(error))
 reports=[];changed=0;blocked=False
 for i,p in enumerate(urls):
  url=p["npbUrl"]
  if not rp.can_fetch("PB96-research",url):
   reports.append({"id":p["id"],"name":p["name"],"status":"robots_disallow","url":url})
   blocked=True;break
  if i:time.sleep(max(1.5,a.delay))
  try:
   soup=fetch(url)
   rows=parse_tables(soup)
   matched=0;issues=Counter()
   for row in rows:
    source,err=find_matching(p["id"],row,byyear,detailed)
    if err:issues[err]+=1;continue
    key=(p["id"],row["year"],row["kind"])
    item={"id":p["id"],"year":row["year"],"kind":row["kind"],"source":url,"club":source["club"]}
    for f in FIELDS[row["kind"]].values():
     value=row[f]
     if value is not None:item[f]=value
    if key in records:
     existing=records[key]
     mismatches={f:[existing[f],item[f]] for f in FIELDS[row["kind"]].values() if f in existing and f in item and str(existing[f])!=str(item[f])}
     if mismatches:issues["existing_mismatch"]+=1;continue
    if any(f in item for f in FIELDS[row["kind"]].values()):
     records[key]={**records.get(key,{}),**item}
     matched+=1;changed+=1
   reports.append({"id":p["id"],"name":p["name"],"status":"ok" if matched else "no_validated_rows","parsed":len(rows),"validated":matched,"issues":dict(issues),"url":url})
  except Exception as error:reports.append({"id":p["id"],"name":p["name"],"status":"fetch_error","detail":str(error)[:250],"url":url})
  print(f"{i+1}/{len(urls)}: {p['id']} {p['name']} => {reports[-1]['status']}, rows={reports[-1].get('validated',0)}",flush=True)
 current=datetime.date.today().isoformat()
 output={**pilot,"checked":current,"sourceScope":"NPB公式個人年度別成績の追加項目。出典URL・年度・一軍所属との突合が成功した記録のみ。","rows":sorted(records.values(),key=lambda x:(x["id"],int(x["year"]),x["kind"]))}
 (DATA/"npb_supplement.json").write_text(json.dumps(output,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf8")
 report={"date":current,"profilesInMaster":len(players),"profilesWithOfficialURL":len([p for p in players if p.get("npbUrl")]),"attempted":len(urls),"reported":len(reports),"successful":sum(r["status"]=="ok" for r in reports),"newlyValidated":changed,"totalSupplementRows":len(records),"results":reports,"robotsBlocked":blocked}
 (DATA/"npb_import_audit.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
 print("SUMMARY",json.dumps({k:v for k,v in report.items() if k!="results"},ensure_ascii=False),flush=True)
if __name__=="__main__":main()
