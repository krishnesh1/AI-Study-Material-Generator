import yt_dlp
import os
import time
import subprocess

def test_ffmpeg_extract(url, num_frames=3):
    t0 = time.time()
    ydl_opts = {
        'format': 'best', 
        'quiet': True,
        'extractor_args': {'youtube': {'player_client': ['android']}}
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info_dict = ydl.extract_info(url, download=False)
        video_url = info_dict.get('url', None)
        duration = info_dict.get('duration', 0)
        
    print(f"URL extraction took: {time.time() - t0:.2f}s, duration: {duration}s")
    
    if not video_url or duration == 0:
        return
        
    step = duration // (num_frames + 1)
    for i in range(1, num_frames + 1):
        t1 = time.time()
        timestamp = i * step
        frame_path = f"frame_{i}.jpg"
        
        cmd = [
            "ffmpeg", "-y", "-ss", str(timestamp), 
            "-i", video_url, 
            "-vframes", "1", "-q:v", "2", frame_path
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f"Frame {i} at {timestamp}s took {time.time() - t1:.2f}s")

if __name__ == "__main__":
    test_ffmpeg_extract("https://www.youtube.com/watch?v=exmSJpJvIPs")
