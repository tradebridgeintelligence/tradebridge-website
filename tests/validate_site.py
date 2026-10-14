#!/usr/bin/env python3
"""Dependency-free TradeBridge static-site contract checks."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
PROD = "https://tradebridgeintelligence.com"
ROUTES = ["/", "/commercial-intelligence/", "/business-operations/",
          "/ventures/", "/how-tradebridge-works/", "/insights/",
          "/about/", "/start/", "/privacy/", "/accessibility/",
          "/intake-received/", "/newsletter-confirmation/",
          "/insights/the-tradebridge-standard/",
          "/insights/disconnected-workflows/",
          "/insights/selective-ownership/"]
ERRORS = []
def check(condition, message):
    if not condition: ERRORS.append(message)

class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title = ""
        self.in_title = False
        self.h1 = 0
        self.links = []
        self.images = []
        self.ids = set()
        self.metas = {}
        self.canonical = []
        self.nav = 0
        self.main = 0
        self.lang = False
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "html": self.lang = a.get("lang") == "en"
        if tag == "title": self.in_title = True
        if tag == "h1": self.h1 += 1
        if tag == "main": self.main += 1
        if tag == "nav" and a.get("id") == "primary-menu": self.nav += 1
        if a.get("id"): self.ids.add(a["id"])
        if tag == "meta": self.metas[a.get("name") or a.get("property")] = a.get("content")
        if tag == "link" and a.get("rel") == "canonical": self.canonical.append(a.get("href"))
        if tag == "a": self.links.append(a.get("href", ""))
        if tag == "img": self.images.append((a.get("src", ""), a.get("alt")))
        if tag == "script" and a.get("src"): self.links.append(a["src"])
        if tag == "link" and a.get("rel") == "stylesheet": self.links.append(a.get("href", ""))
    def handle_endtag(self, tag):
        if tag == "title": self.in_title = False
    def handle_data(self, data):
        if self.in_title: self.title += data

def to_file(path):
    if path == "/": return ROOT / "index.html"
    if path == "/404.html": return ROOT / "404.html"
    return ROOT / path.lstrip("/") / "index.html"

seen_titles = {}
for route in ROUTES + ["/404.html"]:
    fp = to_file(route)
    check(fp.is_file(), f"Missing route: {route}")
    if not fp.is_file(): continue
    text = fp.read_text(encoding="utf-8")
    p = Page()
    p.feed(text)
    check(text.lstrip().lower().startswith("<!doctype html>"), f"{route}: DOCTYPE missing")
    check(p.lang, f"{route}: English lang attribute missing")
    check(p.h1 == 1, f"{route}: expected exactly one H1; found {p.h1}")
    check(p.main == 1, f"{route}: expected one main landmark")
    check(p.nav == 1, f"{route}: main navigation missing")
    check(bool(p.title), f"{route}: page title missing")
    check(p.title not in seen_titles, f"{route}: duplicate title with {seen_titles.get(p.title)}")
    seen_titles[p.title] = route
    check(bool(p.metas.get("description")), f"{route}: meta description missing")
    check(bool(p.metas.get("og:title")), f"{route}: OpenGraph title missing")
    check(bool(p.metas.get("og:description")), f"{route}: OpenGraph description missing")
    check(len(p.canonical) == 1, f"{route}: expected exactly one canonical URL")
    if p.canonical:
        check(p.canonical[0] == PROD + route, f"{route}: incorrect canonical {p.canonical[0]}")
    check("tradebridge-logo-nav.png" in text, f"{route}: accessible branded home link missing")
    for target in p.links:
        if not target or target.startswith(("mailto:", "tel:", "https:", "http:", "javascript:")): continue
        if target.startswith("#"):
            check(target[1:] in p.ids, f"{route}: broken in-page fragment {target}")
            continue
        u = urlsplit(target)
        path = unquote(u.path)
        if not path.startswith("/"): continue
        expected = ROOT / path.lstrip("/")
        if path == "/": expected = ROOT / "index.html"
        elif path.endswith("/"): expected = expected / "index.html"
        check(expected.is_file(), f"{route}: missing link target {target}")
    for src, alt in p.images:
        check(alt is not None, f"{route}: image lacks alt attribute {src}")
        if src.startswith("/"):
            check((ROOT / src.lstrip("/")).is_file(), f"{route}: missing image asset {src}")

sitemap = (ROOT / "sitemap.xml").read_text()
for route in ROUTES[:10] + ROUTES[12:]:
    check(PROD + route in sitemap, f"Sitemap missing indexable route: {route}")
for route in ["/intake-received/", "/newsletter-confirmation/", "/404.html"]:
    check(PROD + route not in sitemap, f"Sitemap indexes confirmation/error page: {route}")
css = (ROOT / "assets/site.css").read_text()
check('body::before{content:none!important' in css, "Full-width white masthead still visible")
check('background-image:url("/tradebridge-logo-full.png")' in css, "Full logo is not in the dark header badge")
check('.site-header .brand img{display:none!important' in css, "Legacy overlaid nav logo not suppressed")
check('background-position:-310px -13px' in css, "Logo framing changed without review")
check('original-globe.png' in (ROOT/"index.html").read_text(), "Original globe hero missing")
check((ROOT/"assets/original-globe.png").is_file(), "Original globe graphic asset absent")
for marker in ("FIND IT.", "BUILD IT.", "OWN IT.", "id=\"three-divisions\""):
    check(marker in (ROOT/"index.html").read_text(), f"Homepage missing approved {marker}")
config = json.loads((ROOT / "vercel.json").read_text())
headers = [h["value"] for x in config["headers"] for h in x["headers"] if h["key"].lower()=="x-robots-tag"]
check(any("noindex" in h for h in headers), "Staging deployment lacks noindex")
for api in ["api/_common.js", "api/intake.js", "api/newsletter.js"]:
    check((ROOT/api).is_file(), f"Intake API missing: {api}")
print(f"Audited {len(ROUTES)+1} HTML routes, links/assets, logo treatment, sitemap, intake and staging directives")
if ERRORS:
    print("\n".join("ERROR: "+e for e in ERRORS))
    sys.exit(1)
print("PASS: static-site contracts")
