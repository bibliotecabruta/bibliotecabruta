import json, hashlib, io, os, pathlib, sys
import requests
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data" / "cover-variant-candidates.json"
REPORT = ROOT / "data" / "cover-variant-audit-report.json"
OUTDIR = ROOT / "assets" / "covers" / "variants"
OUTDIR.mkdir(parents=True, exist_ok=True)

def fetch(url):
    r = requests.get(url, timeout=30, headers={"User-Agent":"BibliotecaBrutaCoverAudit/1.0"})
    r.raise_for_status()
    return r.content, r.headers.get("content-type","")

def dhash(raw):
    im = Image.open(io.BytesIO(raw)).convert("L").resize((9,8))
    px = list(im.getdata())
    bits = []
    for y in range(8):
        row = px[y*9:(y+1)*9]
        bits.extend(row[x] > row[x+1] for x in range(8))
    value = 0
    for bit in bits:
        value = (value << 1) | int(bit)
    return value

def distance(a,b):
    return (a ^ b).bit_count()

def image_info(raw):
    im = Image.open(io.BytesIO(raw))
    return {"width":im.width,"height":im.height,"format":im.format}

def safe_ext(content_type, info):
    ct=(content_type or "").lower()
    if "png" in ct or info["format"]=="PNG": return ".png"
    if "webp" in ct or info["format"]=="WEBP": return ".webp"
    return ".jpg"

items=json.loads(MANIFEST.read_text("utf-8"))
report=[]
for item in items:
    row={k:item.get(k) for k in ["edition_id","title","isbn","variant_label","publication_year","source_url","source_label"]}
    try:
        current_raw,_ = fetch(item["current_cover_url"])
        cand_raw,cand_ct = fetch(item["candidate_url"])
        cur_info=image_info(current_raw)
        cand_info=image_info(cand_raw)
        dist=distance(dhash(current_raw),dhash(cand_raw))
        row.update({"status":"same" if dist < 8 else "different","dhash_distance":dist,"current":cur_info,"candidate":cand_info})
        if dist >= 8:
            if cand_info["width"] < 400 or cand_info["height"] < 500:
                row["status"]="different_low_resolution"
            else:
                ext=safe_ext(cand_ct,cand_info)
                out=OUTDIR/(item["output_basename"]+ext)
                out.write_bytes(cand_raw)
                row["saved_path"]=str(out.relative_to(ROOT)).replace("\\","/")
                row["sha256"]=hashlib.sha256(cand_raw).hexdigest()
    except Exception as e:
        row.update({"status":"error","error":str(e)})
    report.append(row)

REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n","utf-8")
print(json.dumps(report,ensure_ascii=False,indent=2))
if any(x["status"]=="error" for x in report):
    sys.exit(1)
