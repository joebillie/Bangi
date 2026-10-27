"""Compare the bundled timetable with live Namaadhu Vaguthu pages.
42 bands, positive/negative island offsets, leap day and multiple seasons.
Run manually with network access; ordinary tests use the resulting fixtures offline.
"""
import concurrent.futures,datetime,hashlib,html,json,re,time,subprocess
from pathlib import Path
x=json.loads(Path('src/data/maldives-timetable.json').read_text())
representatives={i['band']:i for i in reversed(x['islands'])}
checks=[(i,'2026-10-27') for i in representatives.values()]
for id,day in [(415,'2026-01-01'),(415,'2026-07-01'),(415,'2024-02-29'),(1,'2026-01-01'),(371,'2026-07-01')]:checks.append((next(i for i in x['islands'] if i['id']==id),day))
def check(item):
 i,day=item;y,m,d=day.split('-');url=f'https://namaadhuvaguthu.com/en/prayertimes/{i["id"]}/{y}/{m}/{d}'
 page=subprocess.check_output(['curl','--fail','--silent','--show-error','--location','--max-time','30',url],text=True)
 actual=re.findall(r'class="prayer-time">(\d\d:\d\d)</td>',page)
 index=(datetime.date.fromisoformat('2000-'+day[5:])-datetime.date(2000,1,1)).days
 expected=[f'{(v+i["offset"])//60:02}:{(v+i["offset"])%60:02}' for v in x['bands'][str(i['band'])][index]]
 if actual!=expected:raise ValueError(f'Mismatch {i["id"]} {day}: {actual} vs {expected}')
 heading=re.search(r'<h2>(.*?)</h2>',page)
 time.sleep(.15)
 return {'islandId':i['id'],'date':day,'times':actual,'heading':html.unescape(heading.group(1)) if heading else i['name'],'sourceUrl':url}
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(check,checks))
Path('tests/fixtures/namaadhu-vaguthu.json').write_text(json.dumps({'verifiedOn':datetime.datetime.now(datetime.timezone.utc).date().isoformat(),'checks':results},indent=2)+'\n')
print(f'Verified {len(results)} published daily timetables ({len(representatives)} bands); all six times match exactly.')
print(json.dumps([{'islandId':v['islandId'],'heading':v['heading']} for v in results]))
