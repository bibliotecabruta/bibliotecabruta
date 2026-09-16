import json, urllib.request, io, os
from PIL import Image, ImageChops, ImageStat
import imagehash

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
manifest_path=os.path.join(ROOT,'cover-compare-batch.json')
out_path=os.path.join(ROOT,'cover-compare-results.json')

with open(manifest_path,'r',encoding='utf-8') as f:
    items=json.load(f)

def fetch(url):
    req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (compatible; BibliotecaBrutaCoverAudit/1.0)'})
    with urllib.request.urlopen(req,timeout=30) as r:
        data=r.read()
    im=Image.open(io.BytesIO(data)).convert('RGB')
    return im, len(data)

def rms(a,b):
    a=a.resize((256,384))
    b=b.resize((256,384))
    diff=ImageChops.difference(a,b)
    stat=ImageStat.Stat(diff)
    return round(sum(v*v for v in stat.rms)/3.0,2)

results=[]
for item in items:
    row={k:v for k,v in item.items() if k not in ('left_url','right_url')}
    try:
        left,lb=fetch(item['left_url']); right,rb=fetch(item['right_url'])
        lph=imagehash.phash(left); rph=imagehash.phash(right)
        ldh=imagehash.dhash(left); rdh=imagehash.dhash(right)
        ph=int(lph-rph); dh=int(ldh-rdh)
        row.update({
            'status':'ok',
            'left_width':left.width,'left_height':left.height,'left_bytes':lb,
            'right_width':right.width,'right_height':right.height,'right_bytes':rb,
            'phash_distance':ph,'dhash_distance':dh,'rms_distance':rms(left,right),
            'same_cover_likely': ph<=6 and dh<=8
        })
    except Exception as e:
        row.update({'status':'failed','error':str(e)})
    results.append(row)

with open(out_path,'w',encoding='utf-8') as f:
    json.dump({'results':results},f,ensure_ascii=False,indent=2)
print(json.dumps(results,ensure_ascii=False))
