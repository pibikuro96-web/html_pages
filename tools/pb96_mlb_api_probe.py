from urllib.request import urlopen,Request
from urllib.parse import urlencode
import json, time
from pathlib import Path
OUT=Path("pb96/data/mlb_api_probe.json")
BASE="https://statsapi.mlb.com/api/v1/people/"
cases=[(675921,"pitching","yearByYear",None),(656578,"pitching","yearByYear",None),(680735,"pitching","yearByYear",None),(672960,"hitting","yearByYear",None),(675921,"pitching","gameLog",2024),(656578,"pitching","gameLog",2023),(675921,"pitching","season",2024),(684320,"pitching","yearByYear",None)]
r=[]
for id,group,stat,year in cases:
 params=dict(stats=stat,group=group,gameType="R",sportId=1)
 if year:params["season"]=year
 url=BASE+str(id)+"/stats?"+urlencode(params)
 try:
  req=Request(url,headers={"User-Agent":"PB96 MLB regular-season data project (Mozilla/5.0)"})
  with urlopen(req,timeout=25) as res:d=json.load(res)
  st=d.get("stats",[])
  splits=[x for block in st for x in block.get("splits",[])]
  sample=[{"season":x.get("season"),"team":x.get("team"),"sport":x.get("sport"),"league":x.get("league"),"date":x.get("date"),"game":x.get("game"),"isHome":x.get("isHome"),"stat":x.get("stat")} for x in splits]
  r.append({"id":id,"group":group,"type":stat,"url":url,"count":len(splits),"first":sample[:4],"last":sample[-3:],"yearTeamCounts":sorted(set((x.get("season"),x.get("team",{}).get("abbreviation")) for x in sample if isinstance(x.get("team"),dict)))})
 except Exception as ex:r.append({"id":id,"group":group,"type":stat,"error":str(ex)})
 time.sleep(0.3)
OUT.write_text(json.dumps(r,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
print(json.dumps([{"id":x["id"],"type":x["type"],"count":x.get("count"),"error":x.get("error")} for x in r]))
