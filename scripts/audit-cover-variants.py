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


def fetch(url, referer=None):
    headers = dict(HEADERS)
    if referer:
        headers["Referer"] = referer
    r = requests.get(url, timeout=30, headers=headers)
    r.raise_for_status()
    return r.content, r.headers.get("content-type", "")


def discover_image(page_url, expected_isbn=None):
    expected_digits = re.sub(r"[^0-9Xx]", "", str(expected_isbn or ""))

    if "goodreads.com/work/editions/" in page_url and expected_digits:
        for page_num in range(1, 5):
            try:
                rr = requests.get(
                    page_url,
                    params={"page": page_num, "per_page": 100},
                    timeout=30,
                    headers=HEADERS,
                )
                if rr.status_code != 200:
                    continue
                gr_text = html.unescape(rr.text).replace("\\/", "/")
                pos = gr_text.find(expected_digits)
                if pos < 0:
                    # Goodreads sometimes prints ISBN-10 instead of ISBN-13.
                    isbn10 = expected_digits
                    if len(expected_digits) == 13 and expected_digits.startswith("978"):
                        core = expected_digits[3:12]
                        total = sum((10 - i) * int(ch) for i, ch in enumerate(core))
                        check = (11 - (total % 11)) % 11
                        isbn10 = core + ("X" if check == 10 else str(check))
                    pos = gr_text.find(isbn10)
                if pos < 0:
                    continue

                # An edition card puts its cover before the ISBN metadata.
                chunk = gr_text[max(0, pos - 9000): pos + 2500]
                image_urls = re.findall(
                    r"""https?://[^"'<> ]+\.(?:jpg|jpeg|png)(?:\?[^"'<> ]*)?""",
                    chunk,
                    re.I,
                )
                image_urls = [
                    u for u in image_urls
                    if any(host in u for host in (
                        "goodreads.com",
                        "gr-assets.com",
                        "images-na.ssl-images-amazon.com",
                        "m.media-amazon.com",
                    ))
                    and "user" not in u.lower()
                    and "icon" not in u.lower()
                ]
                if image_urls:
                    url = image_urls[-1]
                    # Remove common Goodreads thumbnail size modifiers.
                    url = re.sub(r"\._S[XYL][0-9_]+_\.", ".", url)
                    url = re.sub(r"\._S[XY][0-9]+_\.", ".", url)
                    return url
            except Exception:
                continue
        raise ValueError("Goodreads: capa da edição com o ISBN solicitado não localizada")

    if "martinsfontespaulista.com.br" in page_url:
        ref_match = re.search(r"-(\d+)/p(?:$|[?#])", page_url)
        ref = ref_match.group(1) if ref_match else ""
        api = "https://www.martinsfontespaulista.com.br/api/catalog_system/pub/products/search/"
        attempts = []
        if expected_digits:
            attempts.extend([
                {"fq": "alternateIds_Ean:" + expected_digits},
                {"ft": expected_digits, "_from": "0", "_to": "9"},
            ])
        if ref:
            attempts.extend([
                {"fq": "alternateIds_RefId:" + ref},
                {"fq": "productId:" + ref},
                {"ft": ref, "_from": "0", "_to": "9"},
            ])

        for params in attempts:
            try:
                rr = requests.get(api, params=params, timeout=30, headers=HEADERS)
                if rr.status_code != 200:
                    continue
                data = rr.json()
                for product in data if isinstance(data, list) else []:
                    for sku in product.get("items", []):
                        eans = [str(v) for v in (sku.get("ean") or [])] if isinstance(sku.get("ean"), list) else [str(sku.get("ean") or "")]
                        refid = str(sku.get("referenceId") or sku.get("itemId") or "")
                        if expected_digits and any(expected_digits == re.sub(r"\D", "", v) for v in eans if v):
                            pass
                        elif ref and ref not in refid and expected_digits:
                            # Busca textual pode trazer produto irrelevante: exige EAN ou referência compatível.
                            continue
                        for image in sku.get("images", []):
                            url = image.get("imageUrl") or ""
                            if not url.startswith("http"):
                                continue
                            # VTEX normalmente aceita a mesma imagem com dimensões maiores.
                            url = re.sub(r"-\d+-\d+(?=\.[A-Za-z]+(?:\?|$))", "-1200-1200", url)
                            return url
            except Exception:
                continue

        raise ValueError("Martins Fontes: produto/capa não localizado no catálogo VTEX pelo ISBN/EAN")

    raw, _ = fetch(page_url)
    text = raw.decode("utf-8", errors="ignore")
    normalized = text.replace("\\/", "/")

    page_isbn_match = re.search(r"/livro/(\d{10,13})(?:/|$)", page_url)
    page_isbn = page_isbn_match.group(1) if page_isbn_match else None

    if page_isbn and "companhiadasletras.com.br" in page_url:
        cover_pattern = rf"""https?://[^"'<> ]+/covers/(?:p|pp|g|gg|100|200|300|400|600)/{re.escape(page_isbn)}/[^"'<> ?]+\.(?:jpg|jpeg|png|webp)"""
        m = re.search(cover_pattern, normalized, re.I)
        if not m:
            raise ValueError("Ficha da Companhia sem capa correspondente ao ISBN solicitado")
        url = html.unescape(m.group(0))
        return re.sub(
            r"/covers/(?:p|pp|g|gg|100|200|300|400|600)/",
            "/covers/gg/",
            url,
        )

    expected_digits = re.sub(r"[^0-9Xx]", "", str(expected_isbn or ""))
    if expected_digits:
        isbn_image_pattern = rf"""https?://[^"'<> ]*{re.escape(expected_digits)}[^"'<> ]*\.(?:jpg|jpeg|png|webp)(?:\?[^"'<> ]*)?"""
        m = re.search(isbn_image_pattern, normalized, re.I)
        if m:
            return html.unescape(m.group(0))

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
        r"""https?://[^"'<> ]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'<> ]*)?""",
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
        candidate_url = item.get("candidate_url") or discover_image(item["candidate_page_url"], item.get("isbn"))
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

        reference_distance = None
        if item.get("reference_url"):
            ref_raw, _ = fetch(item["reference_url"], item.get("reference_referer"))
            ref_info = image_info(ref_raw)
            reference_distance = distance(dhash(cand_raw), dhash(ref_raw))
            row["reference"] = ref_info
            row["candidate_reference_dhash_distance"] = reference_distance

        reference_limit = item.get("require_reference_match_under")
        reference_ok = reference_limit is None or (
            reference_distance is not None and reference_distance <= int(reference_limit)
        )
        if reference_limit is not None and not reference_ok:
            row["status"] = "reference_mismatch"

        if dist >= 8 and reference_ok:
            if item.get("compare_only"):
                row["status"] = "different_compare_only"
            elif (cand_info["width"] < 400 or cand_info["height"] < 500) and not item.get("allow_low_res"):
                row["status"] = "different_low_resolution"
            elif item.get("allow_low_res") and (cand_info["width"] < int(item.get("min_width", 280)) or cand_info["height"] < int(item.get("min_height", 420))):
                row["status"] = "different_low_resolution"
            else:
                ext = safe_ext(cand_ct, cand_info)
                target_dir = ROOT / item.get("output_dir", "assets/covers/variants")
                target_dir.mkdir(parents=True, exist_ok=True)
                out = target_dir / (item["output_basename"] + ext)
                out.write_bytes(cand_raw)
                row["saved_path"] = str(out.relative_to(ROOT)).replace("\\", "/")
                row["sha256"] = hashlib.sha256(cand_raw).hexdigest()
    except Exception as exc:
        row.update({"status": "error", "error": str(exc)})

    report.append(row)

REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", "utf-8")
print(json.dumps(report, ensure_ascii=False, indent=2))
