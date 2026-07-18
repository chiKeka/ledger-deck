#!/usr/bin/env python3
"""Regenerate src/data/claims.ts and patch every board stat in src/App.tsx
from a fresh ledger.json (github.com/chiKeka/ledger).

Usage: python3 scripts/refresh_data.py /path/to/ledger.json

Every App.tsx patch asserts its pattern matches the expected number of
times and aborts otherwise, so a reworded slide can never be silently
half-updated. Idempotent: running against the board state already in the
files produces zero diff. Prints the recomputed stats plus the short list
of judgment-call spots it deliberately does NOT touch.
"""
import json
import random
import re
import sys
from collections import Counter
from datetime import date, timedelta

ROOT = re.sub(r'/scripts$', '', sys.path[0] or '.')
CLAIMS_TS = f'{ROOT}/src/data/claims.ts'
APP_TSX = f'{ROOT}/src/App.tsx'
DAY0 = date(2026, 6, 10)  # ledger go-live; deck day axis is days since
WEEK_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven',
              'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen',
              'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
              'nineteen', 'twenty']
# Heuristic region pins for NEW claims only (existing layout is preserved).
REGIONS = [
    ('Frankfurt', [50.11, 8.68], r'ECB|Frankfurt|Eurostat|euro area'),
    ('Brussels', [50.85, 4.35], r'EU |European|Brussels|AI Act|OECD'),
    ('Nairobi', [-1.29, 36.82], r'AfCFTA|Kenya|Nairobi|African Union|AU\b'),
    ('Lagos', [6.45, 3.39], r'Kasi|Lagos|Nigeria'),
    ('London', [51.5, -0.12], r'Bank of England|UK |London|ONS'),
    ('Ann Arbor', [42.3, -83.7], r'Michigan'),
    ('Beijing', [39.9, 116.4], r'China|Beijing'),
    ('Delhi', [28.6, 77.2], r'India|Delhi'),
    ('Washington DC', [38.9, -77.0], r'Fed|FOMC|BLS|Washington|US |Census|BEA'),
]
# StatGrid marker labels -> claims.ts region names (Globe slide)
MARKER_REGION = {'Washington': 'Washington DC', 'London': 'London',
                 'Brussels': 'Brussels', 'Nairobi': 'Nairobi', 'Lagos': 'Lagos'}


def short(text, limit=84):
    if len(text) <= limit:
        return text
    return text[:limit + 1].rsplit(' ', 1)[0] + '…'


def map_status(c):
    if c['status'] == 'open':
        return 'open'
    v = c.get('validity')
    if v and v.get('status') == 'invalid':
        return 'invalidated'
    return c['resolution']['outcome']  # confirmed | disconfirmed


def brier(pop, key):
    return sum((key(c) - (1.0 if c['resolution']['outcome'] == 'confirmed' else 0.0)) ** 2
               for c in pop) / len(pop)


def fmt3(x):
    return f'{x:.3f}'


def gnum(x):
    """JS number literal without trailing zeros (0.19, not 0.190)."""
    return f'{round(x, 3):g}'


def main():
    ledger_path = sys.argv[1]
    d = json.load(open(ledger_path))
    claims = d['claims']
    ledger = {c['id']: c for c in claims}
    updated = d['updated']  # YYYY-MM-DD
    end = date.fromisoformat(updated)

    # ---------- claims.ts ----------
    src = open(CLAIMS_TS).read()
    m = re.search(r'(export const CLAIMS: ClaimNode\[\] = )(\[.*\])( as ClaimNode\[\];)', src, re.S)
    old = json.loads(m.group(2))
    oldmap = {c['id']: c for c in old}
    dropped = set(oldmap) - set(ledger)
    assert not dropped, f'claims vanished from ledger.json: {dropped}'

    new_nodes, added = [], []
    for c in claims:  # ledger order; existing entries keep their layout fields
        lc = ledger[c['id']]
        if c['id'] in oldmap:
            n = dict(oldmap[c['id']])
        else:  # synthesize layout for a claim registered since last refresh
            rng = random.Random(c['id'])
            region, ll = None, None
            for name, coords, pat in REGIONS:
                if re.search(pat, lc['claim']):
                    region, ll = name, coords
                    break
            n = {'id': c['id'],
                 'day': (date.fromisoformat(lc['date']) - DAY0).days,
                 'short': short(lc['claim']), 'region': region, 'll': ll,
                 'jx': round(rng.uniform(-1, 1), 3),
                 'jz': round(rng.uniform(-1, 1), 3)}
            added.append(c['id'])
        n.update(conf=lc['confidence'], frame=lc['frame'], tier=lc['tier'],
                 by=lc['committed_by'], status=map_status(lc),
                 links=[{'to': r['id'], 'rel': r['relation']} for r in lc.get('related_to', [])])
        new_nodes.append({k: n[k] for k in ('id', 'day', 'conf', 'frame', 'tier', 'status',
                                            'by', 'short', 'region', 'll', 'links', 'jx', 'jz')})

    body = json.dumps(new_nodes, separators=(',', ':'), ensure_ascii=True)
    out = src[:m.start()] + m.group(1) + body + m.group(3) + src[m.end():]
    out = re.sub(r'board of \d{4}-\d{2}-\d{2}', f'board of {updated}', out, count=1)
    open(CLAIMS_TS, 'w').write(out)

    # ---------- stats ----------
    total = len(claims)
    by_status = Counter(map_status(c) for c in claims)
    valid = [c for c in claims if c['status'] == 'resolved'
             and not (c.get('validity') and c['validity'].get('status') == 'invalid')]
    n = len(valid)
    b_all = brier(valid, lambda c: c['confidence'])
    coin_skill = 0.25 - b_all
    based = [c for c in valid if c.get('base_rate') is not None]
    base_skill = brier(based, lambda c: c['base_rate']) - brier(based, lambda c: c['confidence'])
    frames = {}
    for fr in ('in', 'out'):
        sub = [c for c in valid if c['frame'] == fr]
        frames[fr] = (len(sub), brier(sub, lambda c: c['confidence']) if sub else None)
    committers = Counter(c['committed_by'] for c in claims)
    experiments = len(d.get('experiments', []))
    links_total = sum(len(c.get('related_to', [])) for c in claims)

    buckets = {}
    for c in valid:
        mid = min(int(round(c['confidence'] * 100)) // 10 * 10 + 5, 95)
        hit = 1 if c['resolution']['outcome'] == 'confirmed' else 0
        bn, bh = buckets.get(mid, (0, 0))
        buckets[mid] = (bn + 1, bh + hit)
    bucket_rows = [(mid, bn, round(100 * bh / bn))
                   for mid, (bn, bh) in sorted(buckets.items())]

    sub50 = [c for c in valid if c['confidence'] < 0.5]
    sub50_true = sum(1 for c in sub50 if c['resolution']['outcome'] == 'confirmed')

    events = []
    for c in claims:
        if c['status'] != 'resolved':
            continue
        v = c.get('validity')
        stamp = v['date'] if (v and v.get('status') == 'invalid') else c['resolution']['date']
        events.append(date.fromisoformat(stamp[:10]))
    weeks_ct = Counter(e - timedelta(days=e.weekday()) for e in events)
    first, last = min(weeks_ct), max(weeks_ct)
    week_rows, w = [], first
    while w <= last:
        week_rows.append((w.strftime('%b ') + str(w.day), weeks_ct.get(w, 0)))
        w += timedelta(days=7)

    commit_count = None
    if len(sys.argv) > 2 and sys.argv[2].strip():  # optional: ledger repo commit count
        commit_count = int(sys.argv[2])

    weeks_word = WEEK_WORDS[round((end - DAY0).days / 7)]
    end_label = end.strftime('%b ') + str(end.day)  # e.g. "Jul 17"
    region_ct = Counter(nd['region'] for nd in new_nodes if nd['region'])

    # ---------- App.tsx ----------
    app = open(APP_TSX).read()
    fails = []

    def sub(pattern, repl, count=1, flags=0):
        nonlocal app
        found = len(re.findall(pattern, app, flags))
        if found != count:
            fails.append(f'{pattern!r}: expected {count} match(es), found {found}')
            return
        app = re.sub(pattern, repl, app, flags=flags)

    sub(r'Jun 10 → \w+ \d+, 2026', f'Jun 10 → {end_label}, 2026')
    wk = len(re.findall(r'\b\w+ weeks\b', app))
    sub(r'\b(?:%s) weeks\b' % '|'.join(WEEK_WORDS[1:]), f'{weeks_word} weeks', count=wk)
    sub(r'(title=")\d+( claims in)', rf'\g<1>{total}\g<2>')
    sub(r'nav="Brier 0\.\d+"', f'nav="Brier {fmt3(b_all)}"')
    sub(r'(<CountUp to=\{)0?\.\d+(\} decimals=\{3\})', rf'\g<1>{gnum(b_all)}\g<2>')
    sub(r'Brier score across \d+ resolved claims\.', f'Brier score across {n} resolved claims.')
    sub(r'foot="Skill vs coin-flip[^"]*"',
        f'foot="Skill vs coin-flip {coin_skill:+.3f} · vs recorded base rates '
        f'{base_skill:+.3f} · board figures, {updated}"')
    for label, val in [('Claims registered', total), ('Confirmed', by_status['confirmed']),
                       ('Disconfirmed', by_status['disconfirmed']), ('Still open', by_status['open']),
                       ('Invalidated', by_status['invalidated']), ('Method experiments', experiments)]:
        sub(r"(value: <CountUp to=\{)\d+(\} />,\s*label: '" + re.escape(label) + "')",
            rf'\g<1>{val}\g<2>')
    sub(r"'\d+ by the twin, \d+ by Bruno'",
        f"'{committers['twin']} by the twin, {committers['bruno']} by Bruno'")
    sub(r'\d+ typed links from', f'{links_total} typed links from')
    if commit_count:
        sub(r'\d+ commits since go-live', f'{commit_count} commits since go-live')
    bars = '\n'.join(f"                  {{ label: '{lbl}', value: {v} }},"
                     for lbl, v in week_rows)
    sub(r'data=\{\[[^\]]+\]\}', 'data={[\n' + bars + '\n                ]}', flags=re.S)
    rows = '\n'.join(f'            {{ mid: {mid}, n: {bn}, hit: {hit} }},'
                     for mid, bn, hit in bucket_rows)
    sub(r'buckets=\{\[[^\]]+\]\}', 'buckets={[\n' + rows + '\n          ]}', flags=re.S)
    sub(r'caption="\d+ valid resolutions', f'caption="{n} valid resolutions')
    # frame-split lines: the in-frame (left) block precedes out-of-frame in the file
    pat = re.compile(r"'\d+ resolutions · Brier 0\.\d+'")
    hits = pat.findall(app)
    if len(hits) != 2:
        fails.append(f'frame-split lines: expected 2, found {len(hits)}')
    else:
        order = iter(['in', 'out'])
        app = pat.sub(lambda _: (lambda fr: f"'{frames[fr][0]} resolutions · Brier {fmt3(frames[fr][1])}'")(next(order)), app)
    sub(r"'KEEP · Brier 0\.\d+ vs 0\.\d+'",
        f"'KEEP · Brier {fmt3(frames['out'][1])} vs {fmt3(frames['in'][1])}'")
    sub(r"'STOP · [+-]0\.\d+ at n=\d+'", f"'STOP · {base_skill:+.3f} at n={len(based)}'")
    sub(r"'STOP · \d+ of \d+ came true'", f"'STOP · {sub50_true} of {len(sub50)} came true'")
    for marker, region in MARKER_REGION.items():
        sub(r"(label: '" + marker + r"', value: ')\d+(')", rf'\g<1>{region_ct[region]}\g<2>')
    sub(r"(value: ')\d+(', label: 'jurisdictions on the board')", rf'\g<1>{len(region_ct)}\g<2>')
    sub(r'(body=")64 of \d+( claims)', rf'\g<1>64 of {total}\g<2>')

    if fails:
        sys.exit('ABORTED — App.tsx patterns drifted, fix refresh_data.py or the slide:\n  '
                 + '\n  '.join(fails))
    open(APP_TSX, 'w').write(app)

    # ---------- report ----------
    print(f'board {updated} · {total} claims · {by_status["confirmed"]}Y {by_status["disconfirmed"]}N '
          f'{by_status["open"]} open {by_status["invalidated"]} invalid · Brier {fmt3(b_all)} n={n} '
          f'· coin {coin_skill:+.3f} · base {base_skill:+.3f} (n={len(based)})')
    print(f'frames: in n={frames["in"][0]} Brier {fmt3(frames["in"][1])} / '
          f'out n={frames["out"][0]} Brier {fmt3(frames["out"][1])}')
    print('buckets:', bucket_rows)
    if added:
        print(f'NEW claims (heuristic region/jitter, review on the field/globe): {added}')
    print('max stated confidence:', max(c['confidence'] for c in claims),
          '(cover/field titles say "none stated above 90%" — reword if this moves)')
    print('MANUAL-REVIEW spots (judgment calls, not auto-patched): the "64 claims tied to a '
          'named institution" globe stat; lesson-tile prose bodies; the calibration headline '
          '("Above 70% ... underconfident") if the 75+ buckets ever drop below the diagonal.')


if __name__ == '__main__':
    main()
