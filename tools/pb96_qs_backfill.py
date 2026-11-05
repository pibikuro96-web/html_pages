#!/usr/bin/env python3
"""One-shot, source-verified PB96 QS/HQS backfill from nf3 team archive.

Only updates existing player/year/team rows. No unverified zeros are assigned.
The source is a third-party archive; all adopted rows are cross-checked with
NPB official games already in PB96 data. Existing disagreements are held.
"""
import argparse
import json
import re
import time
import unicodedata
from collections import defaultdict
from datetime import date
from pathlib import Path
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "pb96" / "data"
CODES = {
    "読売": ("Central", "G"),
    "東京ヤクルト": ("Central", "S"),
    "横浜DeNA": ("Central", "DB"),
    "中日": ("Central", "D"),
    "阪神": ("Central", "T"),
    "広島東洋": ("Central", "C"),
    "北海道日本ハム": ("Pacific", "F"),
    "東北楽天": ("Pacific", "E"),
    "千葉ロッテ": ("Pacific", "M"),
    "埼玉西武": ("Pacific", "L"),
    "オリックス": ("Pacific", "B"),
    "福岡ソフトバンク": ("Pacific", "H"),
}
BASE = "https://nf3.sakura.ne.jp"
SEASON_START, SEASON_END = 2015, 2025
REGEX = re.compile(
    r"(?<!\d)(?P<jersey>\d{1,3})\s+"
    r"(?P<name>[^\s\d]+?)\s+[左右]\s+(?P<gs>\d+)\s+"
    r"(?P<pct>\d+(?:\.\d+)?)\s*%\s*\(\s*(?P<qs>\d+)\s*/\s*(?P<den>\d+)\s*\)"
)
COUNT = re.compile(r"\(\s*(\d+)\s*/\s*(\d+)\s*\)")


def normal(text):
    value = unicodedata.normalize("NFKC", str(text or ""))
    return (value.replace(" ", "").replace("\u3000", "")
            .replace("・", "").replace("髙", "高").replace("﨑", "崎")
            .replace("齋", "斎").replace("澤", "沢"))


def read(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def write(name, obj):
    (DATA / name).write_text(
        json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8")


def fetch_team(year, club, pause):
    league, code = CODES[club]
    url = f"{BASE}/{year}/{league}/{code}/t/pc_all_data_etc.htm"
    request = Request(url, headers={
        "User-Agent": "PB96DataValidation/1.0 (source-aware one-time research; standard browser)",
        "Accept": "text/html,application/xhtml+xml",
    })
    time.sleep(pause)
    with urlopen(request, timeout=20) as response:
        raw = response.read(1_800_000)
        if response.status != 200:
            raise ValueError(f"HTTP {response.status}")
    soup = BeautifulSoup(raw, "html.parser")
    text = soup.get_text(" ", strip=True)
    if "QS/HQS/SQS達成状況" not in text:
        raise ValueError("QS section missing")
    if f"{year}年度" not in text and f"{year}年" not in text:
        raise ValueError("year header missing")
    entries = []
    for table in soup.find_all("table"):
        for tr in table.find_all("tr"):
            cells = tr.get_text(" ", strip=True)
            m = REGEX.search(cells)
            if not m:
                continue
            gs, qs = int(m.group("gs")), int(m.group("qs"))
            denom = int(m.group("den"))
            if denom != gs or qs > gs:
                continue
            ratios = COUNT.findall(cells)
            hqs = int(ratios[1][0]) if len(ratios) >= 2 and int(ratios[1][1]) == gs else None
            name = m.group("name")
            if not name or len(name) > 40:
                continue
            entries.append({"name": name, "gs": gs, "qs": qs, "hqs": hqs,
                            "jersey": m.group("jersey")})
    unique = {}
    for entry in entries:
        k = normal(entry["name"])
        if k in unique and unique[k] != entry:
            raise ValueError("multiple inconsistent starter entries for " + k)
        unique[k] = entry
    if not unique:
        raise ValueError("QS starters were not parsed; page layout may have changed")
    # The later '各種成績' table includes both starters and relievers. A relief
    # pitcher absent from the complete QS starter table has GS=QS=HQS=0,
    # but only if that pitcher is positively identified in the later table.
    after = text.split("各種成績・連投実績", 1)
    roster = normal(after[1] if len(after) == 2 else "")
    return url, unique, roster


def resolve(name, entries):
    key = normal(name)
    if key in entries:
        return entries[key]
    # NF3 may use only an overseas pitcher's surname. Accept only an
    # unambiguous suffix, and not a one-character match.
    candidates = [v for k, v in entries.items()
                  if len(k) >= 4 and (key.endswith(k) or k.endswith(key))]
    return candidates[0] if len(candidates) == 1 else None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--delay", type=float, default=0.7)
    parser.add_argument("--limit", type=int, default=0,
                        help="limit number of team/year pages; 0 means all")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    seasons = read("seasons.json")
    players = read("players.json")
    ext = read("npb_extended.json")
    sup = read("npb_supplement.json")
    people = {p["id"]: p["name"] for p in players}
    pindex = {(r["id"], str(r["year"]), r["club"]): r for r in
              sup["rows"] if r.get("kind") == "pitching"}
    eindex = {(r["id"], str(r["year"]), r["club"]): r for r in ext["rows"]}
    groups = defaultdict(list)
    for rec in seasons:
        yr, club = str(rec["year"]), rec["club"]
        if (rec.get("league") != "NPB" or club not in CODES
                or not yr.isdigit() or not SEASON_START <= int(yr) <= SEASON_END
                or not rec.get("pitchGames") or int(rec["pitchGames"]) <= 0):
            continue
        groups[(int(yr), club)].append(rec)

    changes, errors, held, unchecked = [], [], [], []
    completed = 0
    for year, club in sorted(groups):
        if args.limit and completed >= args.limit:
            break
        completed += 1
        try:
            url, entries, roster = fetch_team(year, club, args.delay)
        except Exception as exc:
            errors.append({"year": year, "club": club, "error": str(exc)})
            continue
        for rec in groups[(year, club)]:
            key = (rec["id"], str(year), club)
            p, e = pindex.get(key), eindex.get(key)
            if not p or not e:
                held.append({"key": key, "reason": "no matching stored NPB data"})
                continue
            player = people[rec["id"]]
            match = resolve(player, entries)
            basis = "season-start QS/HQS official-play crosscheck"
            if match is None:
                full = normal(player)
                roster_confirmed = bool(roster) and len(full) >= 3 and full in roster
                if roster_confirmed:
                    match = {"name": player, "gs": 0, "qs": 0, "hqs": 0}
                    basis = "roster confirmed; absent from complete team-starter table"
                else:
                    unchecked.append({"key": key, "reason": "name/roster not confirmed",
                                      "source": url})
                    continue

            gs, qs, hqs = match["gs"], match["qs"], match["hqs"]
            games = int(rec["pitchGames"])
            if not (0 <= qs <= gs <= games):
                held.append({"key": key, "reason": "GS/QS exceeds official starts/games",
                             "values": [gs, qs, games], "source": url})
                continue
            if hqs is not None and not (0 <= hqs <= qs):
                held.append({"key": key, "reason": "HQS exceeds QS", "source": url})
                continue
            old_gs = e.get("starts")
            old_qs = p.get("qs")
            old_hqs = p.get("hqs")
            if ((old_gs is not None and old_gs != "" and int(old_gs) != gs) or
                (old_qs is not None and old_qs != "" and int(old_qs) != qs) or
                (hqs is not None and old_hqs is not None and old_hqs != ""
                 and int(old_hqs) != hqs)):
                held.append({"key": key, "reason": "conflicts with previously verified value",
                             "old": [old_gs, old_qs, old_hqs],
                             "found": [gs, qs, hqs], "source": url})
                continue
            if old_qs is not None and old_gs not in (None, "") and (
                    hqs is None or old_hqs is not None):
                continue
            if old_gs is None or old_gs == "":
                e["starts"] = str(gs)
                e["startsSource"] = url
            if old_qs is None or old_qs == "":
                p["qs"] = qs
                p["qsSource"] = url
                p["qsBasis"] = basis
                p["qsChecked"] = str(date.today())
            if hqs is not None and (old_hqs is None or old_hqs == ""):
                p["hqs"] = hqs
                p["hqsSource"] = url
                p["hqsChecked"] = str(date.today())
            changes.append({"id": rec["id"], "name": player, "year": year,
                            "club": club, "gs": gs, "qs": qs, "hqs": hqs,
                            "source": url, "basis": basis})

    pitch_rows = [x for x in sup["rows"] if x.get("kind") == "pitching"]
    count = lambda field: sum(x.get(field) is not None and x.get(field) != ""
                              for x in pitch_rows)
    report = {
        "checkedAt": str(date.today()), "teamYearPages": completed,
        "pagesFailed": len(errors), "updatedRows": len(changes),
        "qsCoverage": count("qs"), "hqsCoverage": count("hqs"),
        "remainingQS": len(pitch_rows)-count("qs"),
        "changes": changes, "errors": errors, "conflicts": held,
        "nameOrRosterUnconfirmed": unchecked,
        "policy": "Do not overwrite mismatches or assume absence means zero."
    }
    print(json.dumps({k: v for k, v in report.items()
                      if k not in ("changes","errors","conflicts","nameOrRosterUnconfirmed")},
                     ensure_ascii=False))
    if not args.dry_run:
        ext["coverage"]["pitcherStartsAllYears"] = sum(
            r.get("starts") is not None and r.get("starts") != ""
            for r in ext["rows"])
        sup.setdefault("coverageAdditional2026AndHistorical", {}).update({
            "pitcherQS": count("qs"), "pitcherHQS": count("hqs"),
            "automatedBackfillOn": str(date.today()),
            "source": "https://nf3.sakura.ne.jp/",
        })
        write("npb_extended.json", ext)
        write("npb_supplement.json", sup)
        write("npb_qs_import_audit.json", report)


if __name__ == "__main__":
    main()
