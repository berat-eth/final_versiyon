import asyncio
import aiohttp
import time
from collections import Counter

URL = "https://api.zerodaysoftware.tr/api/categories"  # burayı değiştir
CONCURRENT_REQUESTS = 50
TOTAL_REQUESTS = 500

async def fetch(session, url):
    start = time.time()
    try:
        async with session.get(url) as response:
            await response.text()  # yanıtı al
            elapsed = time.time() - start
            return response.status, elapsed
    except Exception as e:
        elapsed = time.time() - start
        return f"Error: {e}", elapsed

async def worker(session, queue, results):
    while not queue.empty():
        await queue.get()
        status, elapsed = await fetch(session, URL)
        results.append((status, elapsed))
        queue.task_done()

async def main():
    queue = asyncio.Queue()
    for _ in range(TOTAL_REQUESTS):
        queue.put_nowait(1)

    results = []
    start_time = time.time()

    async with aiohttp.ClientSession() as session:
        tasks = [asyncio.create_task(worker(session, queue, results)) for _ in range(CONCURRENT_REQUESTS)]
        await queue.join()
        for task in tasks:
            task.cancel()

    end_time = time.time()

    # İstatistikler
    status_codes = Counter([r[0] for r in results])
    times = [r[1] for r in results]
    success = status_codes.get(200, 0)
    errors = TOTAL_REQUESTS - success

    print(f"Toplam istek: {TOTAL_REQUESTS}")
    print(f"Başarılı (200): {success}")
    print(f"Hata: {errors}")
    print("Durum kodları dağılımı:")
    for code, count in status_codes.items():
        print(f"  {code}: {count}")
    print(f"Geçen süre: {end_time - start_time:.2f} saniye")
    print(f"Ortalama istek/saniye: {TOTAL_REQUESTS / (end_time - start_time):.2f}")
    print(f"Yanıt süreleri (saniye) -> min: {min(times):.3f}, max: {max(times):.3f}, avg: {sum(times)/len(times):.3f}")

if __name__ == "__main__":
    asyncio.run(main())
