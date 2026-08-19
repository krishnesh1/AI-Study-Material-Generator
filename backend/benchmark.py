import asyncio
import time
from main import process_video, VideoRequest

async def test():
    req = VideoRequest(url="https://www.youtube.com/watch?v=R-CKBYnOv1U", language="English")
    print("Starting process...")
    t0 = time.time()
    try:
        res = await process_video(req)
        print("Success! JSON keys:", res.keys())
    except Exception as e:
        print("ERROR:", e)
    print(f"Total time: {(time.time()-t0):.2f}s")

if __name__ == "__main__":
    asyncio.run(test())
