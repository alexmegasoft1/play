"""نسخة احتياطية مجانية من الأخبار لشاشة ميجا: يشغّلها GitHub كل نصف ساعة ويكتب news.json.
الشاشة تجلب الأخبار من المواقع مباشرة، وتلجأ لهذا الملف فقط للمصادر التي تعذّر وصولها إليها."""
import json, re, html, urllib.request, email.utils, datetime, concurrent.futures

SOURCES = {
    'spa': ['https://www.spa.gov.sa/rss.xml', 'https://www.spa.gov.sa/ar/rss'],
    'arabiya': ['https://www.alarabiya.net/feed/rss2/ar.xml', 'https://www.alarabiya.net/.mrss/ar.xml'],
    'sky': ['https://www.skynewsarabia.com/rss.xml', 'https://www.skynewsarabia.com/web/rss'],
    'bbc': ['https://feeds.bbci.co.uk/arabic/rss.xml'],
    'aawsat': ['https://aawsat.com/feed'],
    'okaz': ['https://www.okaz.com.sa/rssFeed/0'],
    'masry': ['https://www.almasryalyoum.com/rss/rssfeed'],
}
UA = 'Mozilla/5.0 (Linux; Android 9; Android TV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'


def tag(block, name):
    m = re.search(r'<%s(?:\s[^>]*)?>([\s\S]*?)</%s>' % (name, name), block, re.I)
    return m.group(1) if m else ''


def clean(s):
    s = s.strip()
    m = re.match(r'^<!\[CDATA\[([\s\S]*?)\]\]>$', s)
    if m:
        s = m.group(1)
    s = re.sub(r'<[^>]+>', ' ', s)
    return re.sub(r'\s+', ' ', html.unescape(s)).strip()


def image(block):
    pats = [r'<media:content\b[^>]*\burl=["\']([^"\']+)["\'][^>]*>', r'<media:thumbnail\b[^>]*\burl=["\']([^"\']+)["\']',
            r'<enclosure\b[^>]*\burl=["\']([^"\']+\.(?:jpe?g|png|webp)[^"\']*)["\']', r'<img\b[^>]*\bsrc=["\']([^"\']+)["\']',
            r'&lt;img\b[^&]*?\bsrc=(?:&quot;|["\'])([^"\'&]+)']
    for i, p in enumerate(pats):
        for m in re.finditer(p, block, re.I):
            # media:content قد يكون فيديو: نقبل الصور فقط
            if i == 0 and re.search(r'medium=["\'](video|audio)|\.(mp4|m3u8|mp3)\b', m.group(0), re.I):
                continue
            u = html.unescape(m.group(1)).strip()
            if u.startswith('http'):
                return u
    return ''


def when(s):
    s = clean(s)
    if not s:
        return ''
    try:
        return email.utils.parsedate_to_datetime(s).astimezone(datetime.timezone.utc).isoformat()
    except Exception:
        pass
    try:
        return datetime.datetime.fromisoformat(s.replace('Z', '+00:00')).astimezone(datetime.timezone.utc).isoformat()
    except Exception:
        return ''


def fetch(sid):
    for url in SOURCES[sid]:
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'application/rss+xml, application/xml;q=0.9, */*;q=0.5'})
            xml = urllib.request.urlopen(req, timeout=20).read(3 * 1024 * 1024).decode('utf-8', 'replace')
        except Exception:
            continue
        out = []
        for m in re.finditer(r'<(item|entry)\b[\s\S]*?</\1>', xml, re.I):
            b = m.group(0)
            title = clean(tag(b, 'title'))
            if len(title) < 8:
                continue
            link = clean(tag(b, 'link'))
            if not link:
                h = re.search(r'<link[^>]*href=["\']([^"\']+)["\']', b, re.I)
                link = h.group(1) if h else ''
            date = tag(b, 'pubDate') or tag(b, 'updated') or tag(b, 'dc:date')
            out.append({'s': sid, 'title': title, 'link': link, 'time': when(date), 'image': image(b)})
        if out:
            return out[:10]
    return []


with concurrent.futures.ThreadPoolExecutor(8) as ex:
    results = list(ex.map(fetch, SOURCES))
items = [it for r in results for it in r]
if items:
    with open('news.json', 'w', encoding='utf-8') as f:
        json.dump({'items': items}, f, ensure_ascii=False, separators=(',', ':'))
print({sid: len(r) for sid, r in zip(SOURCES, results)})
