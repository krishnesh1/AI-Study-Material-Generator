import asyncio
import time
import json
from main import process_video, VideoRequest

async def test_text():
    sample_text = """
    In computer science, a binary search tree (BST) is a rooted binary tree data structure with the key of each internal node being greater than all the keys in the respective node's left subtree and less than the ones in its right subtree.
    The time complexity of search, insertion, and deletion in a balanced BST is O(log n).
    In the worst case (e.g. an unbalanced tree resembling a linked list), operations take O(n).
    Self-balancing binary search trees such as AVL trees and Red-Black trees maintain a balanced height of O(log n) automatically during insertions and deletions.
    """
    req = VideoRequest(text=sample_text, language="English")
    print("Testing process_video with text...")
    t0 = time.time()
    response = await process_video(req)
    async for chunk in response.body_iterator:
        if chunk.startswith("data: "):
            data = json.loads(chunk[6:])
            status = data.get("status")
            print(f"  Stream event: {status}")
            if status == "completed":
                print("  Title:", data.get("title"))
                print("  Summary length:", len(data.get("summary", "")))
                print("  Quiz questions count:", len(data.get("quiz", [])))
                print("  Key points count:", len(data.get("key_points", [])))
    print(f"Total time: {(time.time()-t0):.2f}s\n")

async def test_playlist_url():
    req = VideoRequest(url="https://www.youtube.com/watch?v=RQ8IgK8z1y8&list=PLfEr2kn3s-bpXj_TMONjRwasyjiFgEwj0&index=16", language="English")
    print("Testing process_video with playlist URL...")
    t0 = time.time()
    response = await process_video(req)
    async for chunk in response.body_iterator:
        if chunk.startswith("data: "):
            data = json.loads(chunk[6:])
            status = data.get("status")
            print(f"  Stream event: {status}")
            if status == "completed":
                print("  Title:", data.get("title"))
                print("  Summary length:", len(data.get("summary", "")))
                print("  Quiz questions count:", len(data.get("quiz", [])))
            elif status == "error":
                print("  Error message:", data.get("message"))
    print(f"Total time: {(time.time()-t0):.2f}s")

if __name__ == "__main__":
    asyncio.run(test_text())
    asyncio.run(test_playlist_url())
