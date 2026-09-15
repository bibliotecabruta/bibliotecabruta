import io, json, os, pathlib, re, sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import quote
import requests
from PIL import Image

ROOT=pathlib.Path(__file__).resolve().parents[1]
REPORT=ROOT/"data"/"collection-cover-discovery-report.json"
COLLECTIONS={
 "26ac5329-35a6-48ba-b733-ba1e5651b5db":"Coleção Negra",
 "d404697e-d860-4845-b1d0-d09292d60b41":"Coleção Policial",
}

config=(ROOT/"config.js").read_text("utf-8")
supabase_url=re.search(r'supabaseUrl:\s*["\']([^"\']+)',config).group(1).rstrip("/")
key=re.search(r'supabasePublishableKey:\s*["\']([^"\']+)',config).group(1)
headers={"apikey":key,"Authorization":"Bearer "+key,"User-Agent":"BibliotecaBrutaCoverDiscovery/1.0"}

def fetch_catalog():
    select="book_id,collection_id,books(id,title,editions(id,country,is_primary,isbn,cover_url,publication_year,publisher))"
    url=supabase_url+"/rest/v1/book_collections"
    params={"select":select,"collection_id":"in.("+",".join(COLLECTIONS.keys())+")"}
    r=requests.get(url,headers=headers,params=params,timeout=45)
    r.raise_for_status()
    rows=r.json()
    out=[]
    seen=set()
    for row in rows:
        book=row.get("books") or {}
        for ed in book.get("editions") or []:
            if ed.get("country")!="Brasil" or not ed.get("isbn") or not ed.get("cover_url"):
                continue
            key2=(row["collection_id"],ed["id"])
            if key2 in seen: continue
            seen.add(key2)
            out.append({
              "collection_id":row["collection_id"],
              "collection_name":COLLECTIONS[row["collection_id"]],
              "book_id":book.get("id"),
              "title":book.get("title"),
              "edition_id":ed.get("id"),
              "publication_year":ed.get("publication_year"),
              "publisher":ed.get("publisher"),
              "isbn":ed.get("isbn"),
              "cover_url":ed.get("cover_url"),
              "is_primary":bool(ed.get("is_primary")),
            })
    return out

def clean_isbn(v):
    return re.sub(r"[^0-9Xx]","",str(v or "")).upper()

def image_bytes(url,timeout=20):
    r=requests.get(url,timeout=timeout,headers={"User-Agent":"Mozilla/5.0 BibliotecaBrutaCoverDiscovery/1.0"})
    if r.status_code>=400:return None,None
    ct=r.headers.get("content-type","")
    if not ct.startswith("image/"):return None,None
    try:
        im=Image.open(io.BytesIO(r.content)); im.load()
        if im.width<=2 or im.height<=2:return None,None
        return r.content,{"width":im.width,"height":im.height,"format":im.format}
    except Exception:
        return None,None

def dhash(raw):
    im=Image.open(io.BytesIO(raw)).convert("L").resize((9,8))
    px=list(im.getdata())
    value=0
    for y in range(8):
        row=px[y*9:(y+1)*9]
        for x in range(8):
            value=(value<<1)|int(row[x]>row[x+1])
    return value

def dist(a,b):return (a^b).bit_count()

def google_candidates(isbn):
    url="https://www.googleapis.com/books/v1/volumes"
    try:
        r=requests.get(url,params={"q":"isbn:"+isbn,"maxResults":5},timeout=20,headers={"User-Agent":"BibliotecaBrutaCoverDiscovery/1.0"})
        if r.status_code!=200:return []
        found=[]
        for item in r.json().get("items",[]):
            info=item.get("volumeInfo") or {}
            links=info.get("imageLinks") or {}
            for k in ("extraLarge","large","medium","small","thumbnail","smallThumbnail"):
                u=links.get(k)
                if u:
                    u=u.replace("http://","https://")
                    found.append(("Google Books",u,item.get("id")))
                    break
        return found
    except Exception:
        return []

def openlibrary_candidates(isbn):
    return [("Open Library",f"https://covers.openlibrary.org/b/isbn/{quote(isbn)}-L.jpg?default=false",None)]

def audit_one(ed):
    base_raw,base_info=image_bytes(ed["cover_url"],25)
    if not base_raw:
        return {**ed,"status":"baseline_error"}
    base_hash=dhash(base_raw)
    candidates=[]
    seen=set()
    for source,url,source_id in openlibrary_candidates(clean_isbn(ed["isbn"]))+google_candidates(clean_isbn(ed["isbn"])):
        if not url or url in seen:continue
        seen.add(url)
        raw,info=image_bytes(url,20)
        if not raw:continue
        d=dist(base_hash,dhash(raw))
        candidates.append({
          "source":source,"source_id":source_id,"url":url,
          "width":info["width"],"height":info["height"],"format":info["format"],
          "dhash_distance":d,
          "different":d>=8,
          "quality_ok":info["width"]>=400 and info["height"]>=500,
        })
    diffs=[x for x in candidates if x["different"]]
    diffs.sort(key=lambda x:(not x["quality_ok"],-x["width"]*x["height"],-x["dhash_distance"]))
    return {
      **ed,
      "status":"candidate_difference" if diffs else ("same_in_sources" if candidates else "no_external_cover"),
      "baseline":base_info,
      "candidates":diffs[:4],
      "sources_checked":len(candidates),
    }

editions=fetch_catalog()
results=[]
with ThreadPoolExecutor(max_workers=10) as ex:
    futures={ex.submit(audit_one,e):e for e in editions}
    for i,f in enumerate(as_completed(futures),1):
        try:results.append(f.result())
        except Exception as err:results.append({**futures[f],"status":"error","error":str(err)})
        if i%50==0:print("auditados",i,"/",len(editions),flush=True)

priority={"candidate_difference":0,"baseline_error":1,"error":2,"no_external_cover":3,"same_in_sources":4}
results.sort(key=lambda x:(priority.get(x["status"],9),x["collection_name"],x["title"] or ""))
summary={}
for name in COLLECTIONS.values():
    rows=[x for x in results if x["collection_name"]==name]
    summary[name]={
      "editions_audited":len(rows),
      "candidate_difference":sum(x["status"]=="candidate_difference" for x in rows),
      "same_in_sources":sum(x["status"]=="same_in_sources" for x in rows),
      "no_external_cover":sum(x["status"]=="no_external_cover" for x in rows),
      "errors":sum(x["status"] in ("error","baseline_error") for x in rows),
    }
payload={"summary":summary,"candidates":[x for x in results if x["status"]=="candidate_difference"],"other_statuses":[x for x in results if x["status"]!="candidate_difference"]}
REPORT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n","utf-8")
print(json.dumps(summary,ensure_ascii=False,indent=2))
