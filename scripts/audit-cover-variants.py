import hashlib
import html
import io
import json
import pathlib
import re
from urllib.parse import urljoin

import requests
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data" / "cover-variant-candidates.json"
REPORT = ROOT / "data" / "cover-variant-audit-report.json"
OUTDIR = ROOT / "assets" / "covers" / "variants"
OUTDIR.mkdir(parents=True, exist_ok=True)

HEADERS = {"User-Agent": "Mozilla/5.0 BibliotecaBrutaCoverAudit/1.0"}


def fetch(url):
    r = requests.get(url, timeout=30, headers=HEADERS)
    r.raise_for_status()
    return r.content, r.headers.get("content-type", "")


def discover_image(page_url):
    raw, _ = fetch(page_url)
    text = raw.decode("utf-8", errors="ignore")
    normalized = text.replace("\\/", "/")

    page_isbn_match = re.search(r"/livro/(\\d{10,13})(?:/|$)", page_url)
    page_isbn = page_isbn_match.group(1) if page_isbn_match else None

    if page_isbn and "companhiadasletras.com.br" in page_url:
        cover_pattern = rf"""https?://[^"'<> ]+/covers/(?:p|pp|g|gg|100|200|300|400|600)/{re.escape(page_isbn)}/[^"'<> ?]+\\.(?:jpg|jpeg|png|webp)"""
        m = re.search(cover_pattern, normalized, re.I)
        if not m:
            raise ValueError("Ficha da Companhia sem capa correspondente ao ISBN solicitado")
        url = html.unescape(m.group(0))
        return re.sub(
            r"/covers/(?:p|pp|g|gg|100|200|300|400|600)/",
            "/covers/gg/",
            url,
        )

    patterns = [
        r"""<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)""",
        r"""<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']""",
        r"""<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)""",
        r"""<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']""",
    ]
    for pattern in patterns:
        m = re.search(pattern, text, re.I)
        if m:
            return urljoin(page_url, html.unescape(m.group(1)))

    candidates = re.findall(
        r"""https?://[^"'<> ]+\\.(?:jpg|jpeg|png|webp)(?:\\?[^"'<> ]*)?""",
        normalized,
        re.I,
    )
    if candidates:
        return html.unescape(candidates[0])
    raise ValueError("Nenhuma imagem principal encontrada na página")


def dhash(raw):
    im = Image.open(io.BytesIO(raw)).convert("L").resize((9, 8))
    px = list(im.getdata())
    value = 0
    for y in range(8):
        row = px[y * 9 : (y + 1) * 9]
        for x in range(8):
            value = (value << 1) | int(row[x] > row[x + 1])
    return value


def distance(a, b):
    return (a ^ b).bit_count()


def image_info(raw):
    im = Image.open(io.BytesIO(raw))
    return {"width": im.width, "height": im.height, "format": im.format}


def safe_ext(content_type, info):
    ct = (content_type or "").lower()
    if "png" in ct or info["format"] == "PNG":
        return ".png"
    if "webp" in ct or info["format"] == "WEBP":
        return ".webp"
    return ".jpg"


items = json.loads(MANIFEST.read_text("utf-8"))
report = []

for item in items:
    row = {
        k: item.get(k)
        for k in [
            "edition_id",
            "title",
            "isbn",
            "variant_label",
            "publication_year",
            "source_url",
            "source_label",
            "audit_key",
        ]
    }
    try:
        current_raw, _ = fetch(item["current_cover_url"])
        candidate_url = item.get("candidate_url") or discover_image(item["candidate_page_url"])
        row["candidate_url_resolved"] = candidate_url

        cand_raw, cand_ct = fetch(candidate_url)
        cur_info = image_info(current_raw)
        cand_info = image_info(cand_raw)
        dist = distance(dhash(current_raw), dhash(cand_raw))

        row.update(
            {
                "status": "same" if dist < 8 else "different",
                "dhash_distance": dist,
                "current": cur_info,
                "candidate": cand_info,
            }
        )

        if dist >= 8:
            if item.get("compare_only"):
                row["status"] = "different_compare_only"
            elif cand_info["width"] < 400 or cand_info["height"] < 500:
                row["status"] = "different_low_resolution"
            else:
                ext = safe_ext(cand_ct, cand_info)
                out = OUTDIR / (item["output_basename"] + ext)
                out.write_bytes(cand_raw)
                row["saved_path"] = str(out.relative_to(ROOT)).replace("\\", "/")
                row["sha256"] = hashlib.sha256(cand_raw).hexdigest()
    except Exception as exc:
        row.update({"status": "error", "error": str(exc)})

    report.append(row)

REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", "utf-8")
print(json.dumps(report, ensure_ascii=False, indent=2))
