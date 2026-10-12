import os
import json
import uuid
import re
import urllib.parse as urlparse
import subprocess
import requests
import asyncio
import html
import xml.etree.ElementTree as ET
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import yt_dlp
from yt_dlp.networking.impersonate import ImpersonateTarget
from youtube_transcript_api import YouTubeTranscriptApi
from curl_cffi import requests as cffi_requests
from curl_cffi.requests import Session as CffiSession
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# Proxy and Cookies configuration for cloud deployment (e.g. Render, Railway)
PROXY_URL = os.environ.get("YOUTUBE_PROXY") or os.environ.get("HTTP_PROXY") or os.environ.get("HTTPS_PROXY") or None
COOKIES_ENV = os.environ.get("YOUTUBE_COOKIES", "").strip()
COOKIES_FILE = os.environ.get("YOUTUBE_COOKIES_FILE", "").strip()
SUPADATA_API_KEY = os.environ.get("SUPADATA_API_KEY", "").strip()

def get_proxy_dict() -> Optional[Dict[str, str]]:
    """Return dictionary of proxies if configured in environment."""
    if PROXY_URL:
        return {"http": PROXY_URL, "https": PROXY_URL}
    return None

def setup_cookies(temp_dir: str) -> Optional[str]:
    """Return path to a valid cookies file if configured via env or file."""
    if COOKIES_FILE and os.path.exists(COOKIES_FILE):
        return COOKIES_FILE
    local_cookies = os.path.join(os.path.dirname(__file__), "cookies.txt")
    if os.path.exists(local_cookies):
        return local_cookies
    if COOKIES_ENV:
        cookie_path = os.path.join(temp_dir, "cookies.txt")
        try:
            with open(cookie_path, "w", encoding="utf-8") as f:
                f.write(COOKIES_ENV)
            return cookie_path
        except Exception:
            pass
    return None


app = FastAPI(title="Multimodal AI Video to Study Notes Generator")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
@app.get("/health")
def health_check():
    """Health check endpoint to keep the Render server awake."""
    return {"status": "ok", "message": "Backend is running!"}

# Initialize Groq Client
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

class VideoRequest(BaseModel):
    url: Optional[str] = None
    text: Optional[str] = None
    language: str = "English"

def extract_video_id(url: str) -> str:
    """Extract standard 11-char YouTube video ID from various URL structures."""
    if not url:
        raise ValueError("Empty URL")
    url = url.strip()
    
    # Check youtu.be shortlinks
    if "youtu.be/" in url:
        match = re.search(r'youtu\.be/([a-zA-Z0-9_-]{11})', url)
        if match:
            return match.group(1)
            
    # Check shorts, embed, or v paths
    match = re.search(r'(?:shorts|embed|v)/([a-zA-Z0-9_-]{11})', url)
    if match:
        return match.group(1)
        
    # Check standard query param
    parsed = urlparse.urlparse(url)
    query = urlparse.parse_qs(parsed.query)
    if "v" in query and query["v"]:
        return query["v"][0]
        
    # Generic regex fallback for 11-char YouTube ID
    match = re.search(r'[?&]v=([a-zA-Z0-9_-]{11})', url)
    if match:
        return match.group(1)
        
    raise ValueError("Invalid YouTube URL")

def sanitize_youtube_url(url: str) -> tuple[str, str]:
    """Returns (video_id, clean_canonical_url) stripping playlist and timestamp parameters."""
    video_id = extract_video_id(url)
    return video_id, f"https://www.youtube.com/watch?v={video_id}"

def get_transcript_from_innertube(video_id: str, cookies_path: Optional[str] = None) -> str:
    """Fast direct transcript extraction via YouTube Innertube API using curl_cffi Chrome impersonation."""
    try:
        sess_kwargs = {"impersonate": "chrome"}
        proxy_dict = get_proxy_dict()
        if proxy_dict:
            sess_kwargs["proxies"] = proxy_dict
        sess = cffi_requests.Session(**sess_kwargs)

        r = sess.get(f"https://www.youtube.com/watch?v={video_id}", timeout=6)
        if r.status_code != 200:
            return ""
            
        key_match = re.search(r'"INNERTUBE_API_KEY":"([^"]+)"', r.text)
        api_key = key_match.group(1) if key_match else None
        if not api_key:
            return ""
            
        player_url = f"https://www.youtube.com/youtubei/v1/player?key={api_key}"
        payload = {
            "context": {
                "client": {
                    "clientName": "ANDROID",
                    "clientVersion": "20.10.38"
                }
            },
            "videoId": video_id
        }
        r_player = sess.post(player_url, json=payload, timeout=6)
        if r_player.status_code != 200:
            return ""
            
        data = r_player.json()
        tracks = data.get("captions", {}).get("playerCaptionsTracklistRenderer", {}).get("captionTracks", [])
        if not tracks:
            return ""
            
        # Prioritize English caption track if present, otherwise first available
        target_track = tracks[0]
        for t in tracks:
            lc = t.get("languageCode", "").lower()
            if lc.startswith("en"):
                target_track = t
                break
                
        base_url = target_track.get("baseUrl")
        if not base_url:
            return ""
            
        r_subs = sess.get(base_url, timeout=6)
        if r_subs.status_code != 200 or not r_subs.text:
            return ""
            
        root = ET.fromstring(r_subs.text)
        lines = []
        for elem in root.iter('p'):
            snippet = "".join(elem.itertext()).strip()
            if snippet:
                lines.append(html.unescape(snippet))
        return " ".join(lines).strip()
    except Exception as e:
        print(f"[Innertube Direct] Note: {e}")
        return ""

def get_transcript_from_api(video_id: str) -> str:
    """Fetch transcript using YouTubeTranscriptApi backed by curl_cffi Chrome impersonation."""
    try:
        sess_kwargs = {"impersonate": "chrome"}
        proxy_dict = get_proxy_dict()
        if proxy_dict:
            sess_kwargs["proxies"] = proxy_dict
        sess = CffiSession(**sess_kwargs)

        api = YouTubeTranscriptApi(http_client=sess)
        transcript_list = api.list(video_id)
        transcript = None
        try:
            transcript = transcript_list.find_transcript(['en', 'en-US', 'en-GB', 'en-IN'])
        except Exception:
            for t in transcript_list:
                transcript = t
                break
                
        if transcript:
            snippets = transcript.fetch()
            text = " ".join([s.text for s in snippets if hasattr(s, 'text') or (isinstance(s, dict) and 'text' in s)])
            if not text:
                text = " ".join([s.get('text', '') if isinstance(s, dict) else str(s) for s in snippets])
            return text.strip()
    except Exception as e:
        print(f"[YouTubeTranscriptApi] Note: {e}")
    return ""

def get_transcript_from_supadata(video_id: str) -> str:
    """Fallback: Fetch transcript using Supadata API if SUPADATA_API_KEY is configured."""
    if not SUPADATA_API_KEY:
        return ""
    try:
        url = f"https://api.supadata.ai/v1/youtube/transcript?videoId={video_id}"
        headers = {"x-api-key": SUPADATA_API_KEY}
        r = requests.get(url, headers=headers, timeout=10)
        if r.status_code == 200:
            data = r.json()
            content = data.get("content", [])
            if isinstance(content, list):
                return " ".join([c.get("text", "") for c in content if isinstance(c, dict)]).strip()
            elif isinstance(content, str):
                return content.strip()
    except Exception as e:
        print(f"[Supadata API] Note: {e}")
    return ""

def get_transcript_from_ytdlp(clean_url: str, temp_dir: str, cookies_path: Optional[str] = None) -> str:
    """Try fetching subtitles/captions with yt-dlp using clean canonical URL with strict timeout."""
    try:
        ydl_opts = {
            'impersonate': ImpersonateTarget(client='chrome'),
            'skip_download': True,
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['all', 'en.*', 'hi.*', 'es.*'],
            'subtitlesformat': 'vtt',
            'outtmpl': os.path.join(temp_dir, 'subs.%(ext)s'),
            'quiet': True,
            'no_warnings': True,
            'noplaylist': True,
            'ignoreerrors': True,
            'socket_timeout': 8,
        }
        if PROXY_URL:
            ydl_opts['proxy'] = PROXY_URL
        if cookies_path and os.path.exists(cookies_path):
            ydl_opts['cookiefile'] = cookies_path

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([clean_url])
            
        # Find any downloaded vtt file
        vtt_file = None
        for file in os.listdir(temp_dir):
            if file.endswith('.vtt'):
                vtt_file = os.path.join(temp_dir, file)
                break
                
        if not vtt_file:
            return ""
            
        with open(vtt_file, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
            
        text_lines = []
        for line in lines:
            line = line.strip()
            if not line or '-->' in line or line.startswith('WEBVTT') or line.startswith('Kind:') or line.startswith('Language:'):
                continue
            line = re.sub(r'<[^>]+>', '', line)
            text_lines.append(line)
            
        return " ".join(text_lines).strip()
    except Exception as e:
        print(f"[yt-dlp subtitle] Note: {e}")
        return ""

def extract_audio_and_transcribe_groq(clean_url: str, output_dir: str, cookies_path: Optional[str] = None) -> str:
    """Download audio track and transcribe in a single fast call with Groq Whisper with strict timeout."""
    if not client:
        return ""
    try:
        audio_raw_path = os.path.join(output_dir, "audio_raw.m4a")
        compressed_audio_path = os.path.join(output_dir, "audio_compressed.mp3")
        
        ydl_opts = {
            'impersonate': ImpersonateTarget(client='chrome'),
            'format': 'bestaudio[filesize<25M]/ba/b',
            'outtmpl': audio_raw_path,
            'quiet': True,
            'no_warnings': True,
            'noplaylist': True,
            'ignoreerrors': True,
            'socket_timeout': 10,
        }
        if PROXY_URL:
            ydl_opts['proxy'] = PROXY_URL
        if cookies_path and os.path.exists(cookies_path):
            ydl_opts['cookiefile'] = cookies_path

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([clean_url])
            
        if not os.path.exists(audio_raw_path):
            # Check if downloaded with other extension
            for f in os.listdir(output_dir):
                if f.startswith("audio_raw"):
                    audio_raw_path = os.path.join(output_dir, f)
                    break
                    
        if not os.path.exists(audio_raw_path):
            return ""

        # Compress to 32kbps mono MP3 to keep under Groq 25MB limit even for 1hr+ videos
        compress_cmd = [
            "ffmpeg", "-y", "-i", audio_raw_path,
            "-ac", "1", "-ar", "16000", "-b:a", "32k",
            compressed_audio_path
        ]
        subprocess.run(compress_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=20)
        
        target_audio = compressed_audio_path if os.path.exists(compressed_audio_path) else audio_raw_path
        
        with open(target_audio, "rb") as file_handle:
            transcription = client.audio.transcriptions.create(
                file=(os.path.basename(target_audio), file_handle.read()),
                model="whisper-large-v3-turbo",
                response_format="json"
            )
        return transcription.text.strip()
    except Exception as e:
        error_msg = f"[Whisper fallback error]: {str(e)}"
        print(error_msg)
        return ""

def clean_llm_json(raw_text: str) -> Dict[str, Any]:
    """Strip think tags, markdown wrappers, and safely parse JSON."""
    if not raw_text:
        return {}
    # Remove reasoning / <think> blocks
    cleaned = re.sub(r'<think>.*?</think>', '', raw_text, flags=re.DOTALL).strip()
    # Strip markdown code blocks ```json ... ```
    cleaned = re.sub(r'^```json\s*', '', cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r'^```\s*', '', cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r'```$', '', cleaned, flags=re.MULTILINE)
    
    # Find matching JSON object
    match = re.search(r'\{.*\}', cleaned, re.DOTALL)
    if match:
        json_str = match.group(0)
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            # Clean common syntax glitches
            try:
                fixed = re.sub(r',\s*([\]}])', r'\1', json_str)
                return json.loads(fixed)
            except Exception:
                pass
    return {}

def extract_visual_frames(clean_url: str, video_id: str, visual_insights: list, output_dir: str, cookies_path: Optional[str] = None) -> list:
    """Extract visual frame snapshots using yt-dlp and ffmpeg."""
    import base64
    results = []
    default_thumbnail = f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
    
    stream_url = None
    ydl_opts = {
        'format': 'bestvideo[ext=mp4]/best',
        'quiet': True,
        'no_warnings': True,
        'noplaylist': True,
        'socket_timeout': 8,
    }
    if PROXY_URL:
        ydl_opts['proxy'] = PROXY_URL
    if cookies_path and os.path.exists(cookies_path):
        ydl_opts['cookiefile'] = cookies_path
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(clean_url, download=False)
            stream_url = info.get('url', None)
    except Exception as e:
        print(f"[yt-dlp extract_info error]: {e}")
    
    for i, item in enumerate(visual_insights):
        time_str = item.get("timestamp", "00:00").strip()
        desc = item.get("description", "Video visual insight")
        image_url = default_thumbnail
        
        if stream_url:
            try:
                frame_path = os.path.join(output_dir, f"frame_{i}.jpg")
                cmd = [
                    "ffmpeg", "-y", "-ss", time_str,
                    "-i", stream_url,
                    "-vframes", "1",
                    "-q:v", "2",
                    frame_path
                ]
                subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=20)
                
                if os.path.exists(frame_path):
                    with open(frame_path, "rb") as f:
                        encoded = base64.b64encode(f.read()).decode("utf-8")
                        image_url = f"data:image/jpeg;base64,{encoded}"
            except Exception as e:
                print(f"[ffmpeg extract frame error]: {e}")

        results.append({
            "timestamp": time_str,
            "description": desc,
            "image_url": image_url
        })
    return results

@app.post("/api/process-video")
async def process_video(request: VideoRequest):
    if not client:
        raise HTTPException(status_code=500, detail="Groq API key not configured in .env")

    # If raw text is provided directly
    direct_text = request.text.strip() if request.text else ""
    video_id = ""
    clean_url = ""
    
    if request.url:
        try:
            video_id, clean_url = sanitize_youtube_url(request.url)
        except ValueError:
            if not direct_text:
                raise HTTPException(status_code=400, detail="Invalid YouTube URL. Please provide a valid YouTube URL or paste transcript text.")

    temp_dir = f"temp_{uuid.uuid4()}"
    os.makedirs(temp_dir, exist_ok=True)
    
    async def event_generator():
        try:
            transcript_text = direct_text
            
            if not transcript_text and clean_url:
                cookies_path = setup_cookies(temp_dir)
                yield f"data: {json.dumps({'status': 'progress', 'message': 'Fetching video transcript and subtitles...'})}\n\n"
                
                # 1. Try Direct Innertube API with Chrome TLS impersonation (Fastest, ~1s)
                transcript_text = await asyncio.to_thread(get_transcript_from_innertube, video_id, cookies_path)
                
                # 2. Try YouTubeTranscriptApi with Chrome TLS impersonation
                if not transcript_text:
                    transcript_text = await asyncio.to_thread(get_transcript_from_api, video_id)
                    
                # 3. Try Supadata API (if configured in environment)
                if not transcript_text and SUPADATA_API_KEY:
                    transcript_text = await asyncio.to_thread(get_transcript_from_supadata, video_id)

                # 4. Try yt-dlp clean subtitle extraction
                if not transcript_text:
                    transcript_text = await asyncio.to_thread(get_transcript_from_ytdlp, clean_url, temp_dir, cookies_path)
                    
                # 5. Try Whisper Audio Transcription
                if not transcript_text and client:
                    yield f"data: {json.dumps({'status': 'progress', 'message': 'Subtitles not directly available. Transcribing audio with Groq Whisper...'})}\n\n"
                    transcript_text = await asyncio.to_thread(extract_audio_and_transcribe_groq, clean_url, temp_dir, cookies_path)

            if not transcript_text:
                error_msg = (
                    "Could not extract transcript from YouTube. Cloud hosting providers (like Render/AWS) "
                    "are often rate-limited or blocked by YouTube's anti-bot system. "
                    "You can paste the transcript or notes text directly in the 'Paste Notes / Transcript' tab! "
                    "(Tip: On YouTube, click '... More' under the video title -> 'Show transcript' to copy it in 5 seconds!)"
                )
                yield f"data: {json.dumps({'status': 'error', 'message': error_msg})}\n\n"
                return

            yield f"data: {json.dumps({'status': 'progress', 'message': 'AI is analyzing concepts, generating study notes, and creating quiz...'})}\n\n"

            # Truncate if ultra-long to stay within token limits
            max_chars = 35000
            truncated_transcript = transcript_text[:max_chars]

            system_prompt = f"""You are an elite academic professor and master tutor.
Transform the following educational video transcript into exhaustive, high-yield, deeply detailed study material. Leave no important concept, technical mechanism, formula, definition, or explanation omitted.
Write the entire output in {request.language}.

You MUST respond strictly with valid JSON inside a ```json ... ``` codeblock using this exact format:
```json
{{
  "title": "Clear, informative topic title",
  "summary": "Exhaustive, deeply detailed 4-5 paragraph structured explanation thoroughly covering every concept, technical mechanism, process, advantage, disadvantage, formula, and real-world exam context taught in the video.",
  "key_points": [
    "Comprehensive key concept 1 with in-depth explanation",
    "Comprehensive key concept 2 with in-depth explanation",
    "Comprehensive key concept 3 with in-depth explanation",
    "Comprehensive key concept 4 with in-depth explanation",
    "Comprehensive key concept 5 with in-depth explanation"
  ],
  "visual_insights": [
    {{"timestamp": "01:30", "description": "Key visual diagram, slide, code, or architecture explained at this point"}},
    {{"timestamp": "04:15", "description": "Key formula, diagram, or workflow visual concept"}}
  ],
  "quiz": [
    {{
      "id": 1,
      "question": "Clear, challenging conceptual question testing comprehension?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A",
      "explanation": "Detailed explanation of why Option A is correct and why other options are incorrect."
    }},
    {{
      "id": 2,
      "question": "Second conceptual question?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option B",
      "explanation": "Detailed explanation."
    }},
    {{
      "id": 3,
      "question": "Third conceptual question?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option C",
      "explanation": "Detailed explanation."
    }},
    {{
      "id": 4,
      "question": "Fourth conceptual question?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option D",
      "explanation": "Detailed explanation."
    }},
    {{
      "id": 5,
      "question": "Fifth conceptual question?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A",
      "explanation": "Detailed explanation."
    }}
  ]
}}
```
Ensure exactly 5 high-yield quiz questions with detailed explanations. Do not include any text outside the json markdown block."""

            # Use openai/gpt-oss-20b on Groq for ultra-fast generation (< 2s)
            response = None
            for model_name in ["openai/gpt-oss-20b", "openai/gpt-oss-120b"]:
                try:
                    response = await asyncio.to_thread(
                        client.chat.completions.create,
                        model=model_name,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": f"Transcript Content:\n{truncated_transcript}"}
                        ],
                        temperature=0.2,
                        max_tokens=4096
                    )
                    if response and response.choices:
                        break
                except Exception as model_err:
                    print(f"Error with {model_name}: {model_err}")

            if not response or not response.choices:
                yield f"data: {json.dumps({'status': 'error', 'message': 'AI generation failed to produce output. Please check your GROQ_API_KEY.'})}\n\n"
                return

            raw_content = response.choices[0].message.content
            parsed_json = clean_llm_json(raw_content)

            if not parsed_json or "summary" not in parsed_json:
                yield f"data: {json.dumps({'status': 'error', 'message': 'Failed to parse AI output into study notes format.'})}\n\n"
                return

            # Prepare visual cards
            visuals = parsed_json.get("visual_insights", [])
            if visuals and video_id:
                parsed_json["visual_insights"] = extract_visual_frames(clean_url, video_id, visuals, temp_dir, cookies_path)
                
            parsed_json["status"] = "completed"
            yield f"data: {json.dumps(parsed_json)}\n\n"

        except Exception as e:
            print(f"[Streaming Error]: {e}")
            yield f"data: {json.dumps({'status': 'error', 'message': str(e)})}\n\n"
        finally:
            import shutil
            try:
                shutil.rmtree(temp_dir)
            except Exception:
                pass

    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
