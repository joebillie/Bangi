"""Convert factual public timetable data without executing SQL. Python standard library only.
Usage: python3 scripts/import-maldives-timetable.py /path/to/maldives_prayer_times.sql
Source: https://github.com/itsMaadh/maldives-prayer-times (attributed in dataset metadata).
"""
import datetime, hashlib, json, re, sys
from pathlib import Path
text=Path(sys.argv[1]).read_text()
island_pattern=r"\((\d+),(NULL|'(?:\\.|[^'])*'),'((?:\\.|[^'])*)',(-?\d+\.\d+),(-?\d+\.\d+),(\d+),(-?\d+)\)"
islands=[]
for id,reg,name,lat,lon,band,offset in re.findall(island_pattern,text):
 islands.append(dict(id=int(id),registration=None if reg=='NULL' else reg[1:-1],name=name.replace("\\'","'"),latitude=float(lat),longitude=float(lon),band=int(band),offset=int(offset)))
pattern=r"\((\d+),'0004-(\d{2}-\d{2})',"+','.join([r"'(\d{2}:\d{2}:\d{2})'"]*6)+r"\)"
bands={}
for row in re.findall(pattern,text):
 band,day,*times=row
 index=(datetime.date.fromisoformat('2000-'+day)-datetime.date(2000,1,1)).days
 values=[]
 for time in times:
  h,m,s=map(int,time.split(':'));assert s==0 and 0<=h<24 and 0<=m<60
  values.append(h*60+m)
 bands.setdefault(int(band),[None]*366)[index]=values
assert len(islands)==202 and len(bands)==42
assert all(all(day is not None for day in days) for days in bands.values())
result={'metadata':{'provider':'Namaadhu Vaguthu','providerUrl':'https://namaadhuvaguthu.com/en','datasetUrl':'https://github.com/itsMaadh/maldives-prayer-times','sqlSha256':hashlib.sha256(text.encode()).hexdigest(),'importedOn':datetime.datetime.now(datetime.timezone.utc).date().isoformat(),'calendar':'Perpetual month/day timetable; leap-year index','timezone':'Indian/Maldives','order':['fajr','sunrise','dhuhr','asr','maghrib','isha']},'islands':islands,'bands':{str(k):v for k,v in sorted(bands.items())}}
Path('src/data/maldives-timetable.json').write_text(json.dumps(result,separators=(',',':'))+'\n')
print(json.dumps({'islands':len(islands),'bands':len(bands),'sha256':result['metadata']['sqlSha256'],'male':next(i for i in islands if i['id']==415),'maleOctober27':bands[17][300]}))
