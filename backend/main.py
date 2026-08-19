import os
import json
import uuid

# Ensure ffmpeg is in PATH for whisper
ffmpeg_path = r"C:\Users\WELCOME\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0-full_build\bin"
if os.path.exists(ffmpeg_path) and ffmpeg_path not in os.environ.get("PATH", ""):
    os.environ["PATH"] += os.pathsep + ffmpeg_path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from youtube_transcript_api import YouTubeTranscriptApi
import yt_dlp
import cv2
import os
import json
import uuid
import whisper
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Multimodal AI Video to Study Notes Generator")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq Client
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

class VideoRequest(BaseModel):
    url: str
    language: str = "English"

def extract_video_id(url: str) -> str:
    import urllib.parse as urlparse
    url_data = urlparse.urlparse(url)
    query = urlparse.parse_qs(url_data.query)
    if "v" in query:
        return query["v"][0]
    if "youtu.be" in url:
        return url_data.path[1:]
    raise ValueError("Invalid YouTube URL")

def get_transcript(url: str, temp_dir: str) -> str:
    try:
        ydl_opts = {
            'skip_download': True,
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['en', 'hi', 'ne', 'es', 'fr', 'de', 'ja', 'ko'],
            'subtitlesformat': 'vtt',
            'outtmpl': os.path.join(temp_dir, 'subs.%(ext)s'),
            'quiet': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
            
        # Find the downloaded vtt file
        vtt_file = None
        for file in os.listdir(temp_dir):
            if file.endswith('.vtt'):
                vtt_file = os.path.join(temp_dir, file)
                break
                
        if not vtt_file:
            return ""
            
        with open(vtt_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        # Basic VTT parsing (strip timestamps)
        text_lines = []
        for line in lines:
            line = line.strip()
            if not line or '-->' in line or line.startswith('WEBVTT') or line.startswith('Kind:') or line.startswith('Language:'):
                continue
            # remove formatting tags like <c>
            import re
            line = re.sub(r'<[^>]+>', '', line)
            text_lines.append(line)
            
        return " ".join(text_lines)
    except Exception as e:
        print(f"Error fetching transcript with yt-dlp: {e}")
        return ""

def extract_audio_and_transcribe_with_whisper(url: str, output_dir: str) -> str:
    try:
        audio_path = os.path.join(output_dir, "audio.m4a")
        ydl_opts = {
            'format': 'm4a/bestaudio/best',
            'outtmpl': audio_path,
            'quiet': True,
            'extractor_args': {'youtube': {'player_client': ['android']}}
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        
        # Use Groq's ultra-fast Whisper API instead of slow local CPU model
        with open(audio_path, "rb") as file:
            transcription = client.audio.transcriptions.create(
              file=(os.path.basename(audio_path), file.read()),
              model="whisper-large-v3",
              response_format="json"
            )
        return transcription.text
    except Exception as e:
        print(f"Whisper fallback failed: {e}")
        return ""

def extract_specific_timestamps(url: str, timestamps: list, output_dir: str) -> list:
    frames_paths = []
    try:
        ydl_opts = {
            'format': 'best', 
            'quiet': True,
            'extractor_args': {'youtube': {'player_client': ['android']}}
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(url, download=False)
            video_url = info_dict.get('url', None)
        
        if not video_url:
            return []

        import subprocess
        for i, time_str in enumerate(timestamps):
            # Clean up timestamp string
            time_str = time_str.strip()
            if not time_str: continue
            
            frame_path = os.path.join(output_dir, f"frame_{i}.jpg")
            
            cmd = [
                "ffmpeg", "-y", "-ss", time_str, 
                "-i", video_url, 
                "-vframes", "1", "-q:v", "2", frame_path
            ]
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            
            if os.path.exists(frame_path):
                import base64
                with open(frame_path, "rb") as image_file:
                    encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
                    frames_paths.append({
                        "image_url": f"data:image/jpeg;base64,{encoded_string}",
                        "timestamp": time_str
                    })
            else:
                frames_paths.append({
                    "image_url": None,
                    "timestamp": time_str
                })
        
        return frames_paths
    except Exception as e:
        print(f"Error extracting specific keyframes: {e}")
        return []

def map_reduce_chunking(text: str, chunk_size: int = 8000, overlap: int = 500) -> list:
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks

@app.post("/api/process-video")
async def process_video(request: VideoRequest):
    if not client:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")

    try:
        video_id = extract_video_id(request.url)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")

    temp_dir = f"temp_{uuid.uuid4()}"
    os.makedirs(temp_dir, exist_ok=True)
    
    try:
        # 1. Fetch Transcript
        transcript_text = get_transcript(request.url, temp_dir)
        
        if not transcript_text:
            print("Captions missing. Falling back to Whisper STT.")
            transcript_text = extract_audio_and_transcribe_with_whisper(request.url, temp_dir)
            
        if not transcript_text:
            raise HTTPException(status_code=500, detail="Failed to extract audio or text from video")

        # 2. AI Synthesis using Map-Reduce simulation
        chunks = map_reduce_chunking(transcript_text)
        if len(chunks) > 1:
            chunks = chunks[:1]
            print("Truncated transcript chunks to avoid Groq API rate limits.")
            
        summaries = []
        for chunk in chunks:
            map_prompt = f"Summarize the key information in this portion of a video transcript. You must write the summary entirely in {request.language}:\n\n{chunk}"
            map_res = client.chat.completions.create(
                model="openai/gpt-oss-20b",
                messages=[{"role": "user", "content": map_prompt}],
                max_tokens=4096
            )
            summaries.append(map_res.choices[0].message.content)
            
        combined_summary = "\n".join(summaries)
        
        reduce_prompt = f"""
        Using the following combined summary and transcript chunks of an educational video, generate structured study notes and a quiz.
        You MUST write the output (title, summary, key points, descriptions, and quiz questions/answers) entirely in {request.language}.
        
        Combined Video Summary:
        {combined_summary}
        
        Respond STRICTLY by wrapping your entire JSON output inside a markdown code block exactly like this:
        ```json
        {{
          "title": "Video Title or Topic",
          "summary": "A highly detailed, comprehensive summary of the video content, consisting of at least 3 to 4 detailed paragraphs explaining the core concepts.",
          "key_points": ["Point 1", "Point 2", "Point 3"],
          "visual_insights": [
             {{"timestamp": "01:20", "description": "Description of what is being shown visually at this point based on context"}}
          ],
          "quiz": [
            {{
              "id": 1,
              "question": "Question text?",
              "options": ["A", "B", "C", "D"],
              "correct_answer": "A",
              "explanation": "Why A is correct."
            }}
          ]
        }}
        ```
        Ensure exactly 5 quiz questions. You MUST wrap the JSON in ```json and ```.
        """
        
        response = client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[{"role": "user", "content": reduce_prompt}],
            max_tokens=4096
        )
        
        raw_content = response.choices[0].message.content
        start_idx = raw_content.find('{')
        result = None
        
        while start_idx != -1 and result is None:
            end_idx = raw_content.rfind('}')
            while end_idx != -1 and end_idx > start_idx:
                try:
                    result = json.loads(raw_content[start_idx:end_idx+1])
                    break
                except json.JSONDecodeError:
                    end_idx = raw_content.rfind('}', 0, end_idx)
            
            if result is None:
                start_idx = raw_content.find('{', start_idx + 1)
                
        if result is None:
            with open('failed_response.txt', 'w', encoding='utf-8') as f:
                f.write(raw_content)
            raise ValueError("No valid JSON object could be parsed from AI response. Saved to failed_response.txt")
        
        # 3. Extract specific keyframes requested by the AI
        visuals = result.get("visual_insights", [])
        if visuals:
            ai_timestamps = [v.get("timestamp", "00:00") for v in visuals]
            import asyncio
            keyframes_data = await asyncio.to_thread(extract_specific_timestamps, request.url, ai_timestamps, temp_dir)
            
            for i, frame in enumerate(keyframes_data):
                if i < len(visuals):
                    result["visual_insights"][i]["image_url"] = frame["image_url"]
                    
        return result
        
    except Exception as e:
        print(f"Error during processing: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process video: {str(e)}")
    finally:
        # Cleanup temp dir
        try:
            for file in os.listdir(temp_dir):
                os.remove(os.path.join(temp_dir, file))
            os.rmdir(temp_dir)
        except:
            pass
