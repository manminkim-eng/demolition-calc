# -*- coding: utf-8 -*-
"""매뉴얼 검사 — usage: python verify_manual.py <repoDir>
   ① 그림 파일·표시점(0~100%) ② 범례 수 = 표시점 수 ③ 예제 수치(_example.json)가 본문에 있음 ④ 내부 링크 ⑤ 앱 화면의 근거 표기"""
import sys, os, re, json
repo = sys.argv[1]; M = os.path.join(repo, 'manual'); ok = True
def chk(name, cond, info=''):
    global ok; ok &= bool(cond); print(('✓' if cond else '✗'), name, info)
h = open(os.path.join(M, 'index.html'), encoding='utf-8').read()
marks = json.load(open(os.path.join(M, 'images', '_marks.json'), encoding='utf-8'))
ex = json.load(open(os.path.join(M, '_tools', '_example.json'), encoding='utf-8'))
figs = re.findall(r'<figure class="shot[^"]*" id="fig-([^"]+)">(.*?)</figure>', h, re.S)
chk('그림 수 = 캡처 수', len(figs) == len(marks), f'{len(figs)}/{len(marks)}')
chk('그림 파일 존재', all(os.path.exists(os.path.join(M, 'images', k + '.webp')) for k in marks))
out = [f'{k}:{m["label"]}' for k, v in marks.items() for m in v['marks'] if 'x' not in m or m['x'] < 0 or m['y'] < 0 or m['x'] + m['w'] > 100.5 or m['y'] + m['h'] > 100.5]
chk('표시점이 이미지 안', not out, str(out[:5]))
bad = [sid for sid, body in figs if len(re.findall(r'<li><b>', body)) != len(marks[sid]['marks'])]
chk('범례 수 = 표시점 수', not bad, str(bad))
c = lambda v: f'{int(v):,}'
need = [c(ex[k]['s'][f]) for k in ('A', 'B') for f in ('labor', 'over', 'tech', 'sub', 'vat', 'total')]
miss = [n for n in need if n not in h]
chk('예제 수치가 본문에 있음', not miss, f'{len(need)}개 ' + str(miss))
for k in ('A', 'B'):
    s = ex[k]['s']; over = s['labor'] * s['oR'] // 100; tech = (s['labor'] + over) * s['tR'] // 100
    sub = s['labor'] + over + tech + s['de'] + s['ins'] - s['neg']; vat = sub // 10; tot = (sub + vat) // 1000 * 1000
    chk(f'예제 {k} 재계산', (over, tech, sub, vat, tot) == (s['over'], s['tech'], s['sub'], s['vat'], s['total']), c(tot))
ids = set(re.findall(r'id="([^"]+)"', h)); links = set(re.findall(r'href="#([^"]+)"', h))
chk('내부 링크', links <= ids, str(sorted(links - ids)[:5]))
app = open(os.path.join(repo, 'index.html'), encoding='utf-8').read()
chk('앱 — 고시 번호 표기', app.count('국토교통부고시 제2022-446호') >= 5, str(app.count('국토교통부고시 제2022-446호')))
chk('앱 — 옛 표기 없음', not re.search(r'15m|유권해석|민간 표준|최상위|합법적|비상주 감리 현장|상단 탭에서|헤더의', app))
chk('앱 — 매뉴얼 버튼', 'class="tb tb-manual"' in app and 'demolition-calc/manual/' in app)
chk('앱 — 배치 기준 근거', '시행령 제23조의2' in app and '제30조제2항' in app and '시행규칙 제13조제4항' in app)
chk('앱 — 노임단가 5등급', all(str(v) in app for v in (467217, 373353, 310884, 295138, 235459)))
sys.exit(0 if ok else 1)
