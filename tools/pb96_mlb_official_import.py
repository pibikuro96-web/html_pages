#!/usr/bin/env python3
"""PB96 MLB-only regular-season stats rebuild (official MLB Stats API).

No MiLB, Spring Training, playoff, NPBL or international-game data are accepted.
The publication unit is player x season x MLB TEAM, excluding MLB TOTAL rows.
Pitching QS/HQS are derived only from a complete official MLB game log.

Any incomplete player-level query is retained from pre-existing verified rows and
explicitly flagged in the audit, never silently replaced with zeros.
"""
import json, os, time, random, re
from pathlib import Path
from collections import defaultdict
from urllib.request import Request, urlopen
from urllib.parse import urlencode
from datetime import datetime, timezone

DATA = Path(__file__).resolve().parent.parent / "pb96" / "data"
BASE = "https://statsapi.mlb.com/api/v1/people"
IDS = {
    "002": 672960, "091": 684320, "109": 650668, "110": 650382,
    "112": 658551, "113": 656008, "114": 642376, "115": 664744,
    "116": 656578, "117": 663796, "118": 675921, "119": 658648,
    "120": 680735, "121": 664294, "122": 687922
}
TEAM = {
    108:"LAA",109:"ARI",110:"BAL",111:"BOS",112:"CHC",113:"CIN",
    114:"CLE",115:"COL",116:"DET",117:"HOU",118:"KC",119:"LAD",
    120:"WSH",121:"NYM",133:"OAK",134:"PIT",135:"SD",136:"SEA",
    137:"SF",138:"STL",139:"TB",140:"TEX",141:"TOR",142:"MIN",
    143:"PHI",144:"ATL",145:"CWS",146:"MIA",147:"NYY",158:"MIL"
}
YEAR_MIN,YEAR_MAX=2015,2026
INT_FIELDS_B = {
    "g":"gamesPlayed","pa":"plateAppearances","ab":"atBats",
    "r":"runs","h":"hits","doubles":"doubles","triples":"triples",
    "hr":"homeRuns","rbi":"rbi","bb":"baseOnBalls",
    "ibb":"intentionalWalks","k":"strikeOuts","sb":"stolenBases",
    "cs":"caughtStealing","hbp":"hitByPitch","sh":"sacBunts",
    "sf":"sacFlies","tb":"totalBases","gidp":"groundIntoDoublePlay",
}
INT_FIELDS_P = {
    "g":"gamesPlayed","gs":"gamesStarted","w":"wins","l":"losses",
    "sv":"saves","hold":"holds","h":"hits","r":"runs",
    "er":"earnedRuns","hr":"homeRuns","bb":"baseOnBalls",
    "k":"strikeOuts","bf":"battersFaced","np":"numberOfPitches",
    "hbp":"hitBatsmen","ibb":"intentionalWalks",
    "wp":"wildPitches","bk":"balks","cg":"completeGames",
    "sho":"shutouts","sh":"sacBunts","sf":"sacFlies","ab":"atBats",
}
def read(name):
    return json.loads((DATA/name).read_text(encoding="utf-8"))
def save(name,obj):
    (DATA/name).write_text(json.dumps(obj,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
def parse_int(x):
    if x in (None,"",".---","-.--"):return None
    try:
        z=int(x)
        return z
    except (ValueError,TypeError):return None
def parse_float(x):
    if x in (None,"",".---","-.--"):return None
    try:return float(x)
    except (ValueError,TypeError):return None
def ip_out(ip):
    if ip is None:return None
    m=re.fullmatch(r"(\d+)(?:\.([012]))?",str(ip))
    return int(m.group(1))*3+int(m.group(2) or "0") if m else None
def get(pid,kind,group,season=None):
    params=dict(stats=kind,group=group,gameType="R",sportId=1)
    if season is not None:params["season"]=int(season)
    url=f"{BASE}/{pid}/stats?"+urlencode(params)
    err=None
    for attempt in range(3):
        try:
            req=Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; PB96 research; MLB stats only)","Accept":"application/json"})
            with urlopen(req,timeout=36) as response:
                if response.status!=200:raise RuntimeError(f"HTTP {response.status}")
                payload=json.load(response)
            splits=[split for b in payload.get("stats",[]) for split in b.get("splits",[])
                if split.get("sport",{}).get("id")==1 and (
                split.get("league") is None or split.get("league",{}).get("id") in (103,104))]
            time.sleep(0.14)
            return splits,url
        except Exception as exc:
            err=exc
            time.sleep(1.2*(attempt+1))
    raise RuntimeError(f"{url} failed 3x: {err}")
def key(row):
    return (str(row["id"]),str(row["year"]),str(row["club"]),row["kind"])
def stat_to_row(id,pid,group,s):
    team=s.get("team")
    if not team or not team.get("id"):return None
    abbr=TEAM.get(team["id"])
    if not abbr:raise ValueError("Unknown MLB team ID "+str(team["id"]))
    year=str(s.get("season") or "")
    if not year.isdigit() or not YEAR_MIN<=int(year)<=YEAR_MAX:return None
    v=s.get("stat") or {}
    if not v:return None
    base={"id":id,"year":year,"club":abbr,
          "kind":"batting" if group=="hitting" else "pitching",
          "mlbId":pid,"sportId":1,"gameType":"R",
          "source":f"https://www.mlb.com/player/{pid}",
          "sourceApi":f"{BASE}/{pid}/stats?"+urlencode(dict(stats="yearByYear",group=group,gameType="R",sportId=1)),
          "sourcePolicy":"Official MLB regular-season only; sportId=1, league AL/NL, team splits"}
    if group=="hitting":
        if parse_int(v.get("plateAppearances")) in (None,0):return None
        for target,api in INT_FIELDS_B.items():base[target]=parse_int(v.get(api))
        for target in ["avg","obp","slg","ops"]:base[target]=parse_float(v.get(target))
    else:
        if not parse_int(v.get("gamesPlayed")):return None
        for target,api in INT_FIELDS_P.items():base[target]=parse_int(v.get(api))
        base["ip"]=str(v.get("inningsPitched")) if v.get("inningsPitched") is not None else None
        base["outs"]=parse_int(v.get("outs"))
        base["era"]=parse_float(v.get("era"))
        base["whip"]=parse_float(v.get("whip"))
        base["avg"]=parse_float(v.get("avg"))
        base["obp"]=parse_float(v.get("obp"))
        base["slg"]=parse_float(v.get("slg"))
        base["ops"]=parse_float(v.get("ops"))
        base["qs"]=None;base["hqs"]=None
    return base
def add_fielding(rows, id, splits):
    index=defaultdict(list)
    for x in splits:
        team=x.get("team",{}).get("id")
        yr=str(x.get("season") or "")
        if team in TEAM and yr.isdigit():
            value=parse_int((x.get("stat") or {}).get("errors"))
            if value is not None:
                pos=x.get("position") or {}
                index[(yr,TEAM[team])].append((pos.get("abbreviation",""),value))
    for r in rows:
        if r["id"]!=id or r["kind"]!="batting":continue
        values=index.get((r["year"],r["club"])) or []
        if not values:continue
        positions=[v for p,v in values if p not in ("ALL","TOT")]
        if positions:
            r["errors"]=sum(positions)
        elif len(values)==1:
            r["errors"]=values[0][1]
def compute_qs(rows,pid,audit):
    # Fetch once per player/season, then verify complete MLB gamelogs against
    # published TEAM-specific pitch lines; do not mix minors or postseason.
    by_year=defaultdict(list)
    for r in rows:
        if r["kind"]=="pitching":by_year[r["year"]].append(r)
    for year,groups in sorted(by_year.items()):
        try:logs,url=get(pid,"gameLog","pitching",year)
        except Exception as exc:
            audit["gameLogErrors"].append({"player":pid,"year":year,"error":str(exc)})
            continue
        by_team=defaultdict(list)
        for line in logs:
            team=line.get("team",{}).get("id")
            if team not in TEAM or line.get("season")!=year:continue
            stat=line.get("stat") or {}
            if not stat:continue
            if stat.get("gamesPlayed") is None:continue
            by_team[TEAM[team]].append(line)
        for r in groups:
            gl=by_team.get(r["club"],[])
            log_count=sum(parse_int(z.get("stat",{}).get("gamesPlayed")) or 0 for z in gl)
            log_starts=sum(parse_int(z.get("stat",{}).get("gamesStarted")) or 0 for z in gl)
            outs=sum(parse_int(z.get("stat",{}).get("outs")) or 0 for z in gl)
            official_outs=ip_out(r.get("ip"))
            if log_count!=r["g"] or log_starts!=r["gs"] or outs!=official_outs:
                audit["gameLogMismatch"].append({"id":r["id"],"year":year,"club":r["club"],
                  "log":[log_count,log_starts,outs],"official":[r["g"],r["gs"],official_outs]})
                continue
            count_qs=count_hqs=0
            for game in gl:
                s=game["stat"]
                if (parse_int(s.get("gamesStarted")) or 0) <= 0:continue
                outs=parse_int(s.get("outs"))
                er=parse_int(s.get("earnedRuns"))
                if outs is None or er is None:
                    audit["gameLogMismatch"].append({"id":r["id"],"year":year,"club":r["club"],"error":"start missing earnedRuns or outs"})
                    count_qs=count_hqs=None
                    break
                if outs>=18 and er<=3:count_qs+=1
                if outs>=21 and er<=2:count_hqs+=1
            if count_qs is None:continue
            r["qs"]=count_qs;r["hqs"]=count_hqs
            r["qsSource"]=url;r["hqsSource"]=url
            audit["verifiedPitchGameLogs"]+=1
def career(rows):
    ret={}
    for id in sorted(set(r["id"] for r in rows)):
        for kind in ("batting","pitching"):
            group=[r for r in rows if r["id"]==id and r["kind"]==kind]
            if not group:continue
            fields=INT_FIELDS_B if kind=="batting" else INT_FIELDS_P
            o={"kind":kind,"source":f"https://www.mlb.com/player/{IDS[id]}"}
            for key in fields:
                vals=[r.get(key) for r in group]
                o[key]=sum(vals) if vals and all(isinstance(v,int) for v in vals) else None
            if kind=="pitching":
                outs=[ip_out(r.get("ip")) for r in group]
                total=sum(outs) if all(v is not None for v in outs) else None
                o["ip"]=f"{total//3}.{total%3}" if total is not None else None
                o["era"]=round(o["er"]*27/total,3) if total and o["er"] is not None else None
                o["whip"]=round((o["h"]+o["bb"])*3/total,3) if total and o["h"] is not None and o["bb"] is not None else None
                for k in ("qs","hqs"):
                    vs=[r.get(k) for r in group]
                    o[k]=sum(vs) if vs and all(isinstance(v,int) for v in vs) else None
            else:
                ab=o.get("ab")
                o["avg"]=round(o["h"]/ab,5) if ab and o["h"] is not None else None
                o["slg"]=round(o["tb"]/ab,5) if ab and o["tb"] is not None else None
                denom=[o.get(f) for f in ("ab","bb","hbp","sf")]
                numer=[o.get(f) for f in ("h","bb","hbp")]
                o["obp"]=round(sum(numer)/sum(denom),5) if all(v is not None for v in numer+denom) and sum(denom)>0 else None
                o["ops"]=round(o["obp"]+o["slg"],5) if o["obp"] is not None and o["slg"] is not None else None
            ret[id]=o if id not in ret or kind=="pitching" else ret[id]
    return ret
def main():
    old=read("mlb_extended.json")
    old_index={key(r):r for r in old["rows"]}
    players=read("players.json")
    pnames={p["id"]:p["name"] for p in players}
    audit={
      "runAt":datetime.now(timezone.utc).isoformat(),
      "policy":"MLB regular season sportId 1, gameType R, AL/NL, team-specific only. No MiLB, ST, postseason or duplicate aggregate rows.",
      "playerErrors":[],"gameLogErrors":[],"gameLogMismatch":[],"verifiedPitchGameLogs":0,
      "playerSummary":[],"oldRowKeys":len(old_index),"newRowKeys":None,
      "addedRows":[],"removedRows":[],"conflicts":[],"missingGroups":[]
    }
    rows=[]
    for ident,mlb_id in IDS.items():
        per=[]
        for group in ("hitting","pitching"):
            try:
                splits,url=get(mlb_id,"yearByYear",group)
                items=[stat_to_row(ident,mlb_id,group,x) for x in splits]
                items=[x for x in items if x]
                if not items and any(r["id"]==ident and r["kind"]==("batting" if group=="hitting" else "pitching") for r in old["rows"]):
                    raise ValueError("No MLB official split found, existing source rows remain")
                if len(items)!=len({key(x) for x in items}):
                    raise ValueError("Duplicate player/year/team split")
                per.extend(items)
            except Exception as exc:
                audit["playerErrors"].append({"id":ident,"name":pnames.get(ident),"group":group,"error":str(exc)})
                per.extend(r.copy() for r in old["rows"] if r["id"]==ident and r["kind"]==("batting" if group=="hitting" else "pitching"))
        # Official MLB fielding provides fielding errors when safely partitioned.
        try:
            fielding,_=get(mlb_id,"yearByYear","fielding")
            add_fielding(per,ident,fielding)
        except Exception as exc:
            audit["playerErrors"].append({"id":ident,"group":"fielding","error":str(exc)})
        compute_qs(per,mlb_id,audit)
        rows.extend(per)
        audit["playerSummary"].append({"id":ident,"name":pnames.get(ident),
            "mlbId":mlb_id,"rows":len(per),
            "pitching":sum(r["kind"]=="pitching" for r in per),
            "batting":sum(r["kind"]=="batting" for r in per)})
    unique={}
    for r in rows:
        k=key(r)
        if k in unique:raise ValueError("duplicate "+str(k))
        unique[k]=r
    old_keys=set(old_index)
    new_keys=set(unique)
    audit["newRowKeys"]=len(new_keys)
    audit["addedRows"]=[list(k) for k in sorted(new_keys-old_keys)]
    audit["removedRows"]=[list(k) for k in sorted(old_keys-new_keys)]
    # Do not erase previously known majors if API failed to enumerate them.
    if old_keys-new_keys:
        audit["conflicts"].append("Existing MLB team seasons not returned: manual source check required; retained previously verified rows.")
        for k in sorted(old_keys-new_keys):
            unique[k]=old_index[k]
    for r in unique.values():
        if r.get("sportId",1)!=1 or r.get("gameType","R")!="R":
            raise ValueError("Non-MLB or non-regular season row "+str(key(r)))
        if r.get("kind")=="pitching":
            g=r.get("g");gs=r.get("gs");qs=r.get("qs");hqs=r.get("hqs")
            if qs is not None and not (0<=qs<=gs<=g):raise ValueError("GS/QS invalid "+str(key(r)))
            if hqs is not None and not (0<=hqs<=qs):raise ValueError("HQS invalid "+str(key(r)))
            if r.get("ip") is not None and ip_out(r["ip"]) is None:raise ValueError("IP invalid "+str(key(r)))
    new_rows=sorted(unique.values(),key=lambda x:(int(x["id"]),int(x["year"]),x["club"],x["kind"]))
    old["rows"]=new_rows
    old["asOf"]=datetime.now(timezone.utc).date().isoformat()
    old["scope"]="MLB公式レギュラーシーズンのみ。MiLB/マイナー、オープン戦、ポストシーズン等はすべて除外。"
    old["sourcePolicy"]="MLB Stats API sportId=1, gameType=R, AL/NL: yearByYear team splits only; pitching QS/HQS from verified MLB gameLog, no double-count of combined rows."
    old["careerTotals"]=career(new_rows)
    old["importAudit"]="mlb_import_audit.json"
    old["coverage"]={"mlbPlayers":len(set(r["id"] for r in new_rows)),"mlbRows":len(new_rows),
                     "batting":sum(r["kind"]=="batting" for r in new_rows),
                     "pitching":sum(r["kind"]=="pitching" for r in new_rows),
                     "qsComplete":sum(r["kind"]=="pitching" and r.get("qs") is not None for r in new_rows),
                     "hqsComplete":sum(r["kind"]=="pitching" and r.get("hqs") is not None for r in new_rows)}
    save("mlb_extended.json",old)
    save("mlb_import_audit.json",audit)
    print(json.dumps({"coverage":old["coverage"],"addedRows":audit["addedRows"],
          "removedRows":audit["removedRows"],"playerErrors":audit["playerErrors"],
          "gameLogErrors":audit["gameLogErrors"],"gameLogMismatch":audit["gameLogMismatch"][:15]},ensure_ascii=False))
if __name__=="__main__":main()
