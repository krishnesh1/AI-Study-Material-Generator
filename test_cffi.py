import re
import json
from curl_cffi import requests

def test():
    video_id = 'RQ8IgK8z1y8'
    html_response = requests.get(f'https://www.youtube.com/watch?v={video_id}', impersonate='chrome')
    
    match = re.search(r'"captionTracks":\[(.*?)\]', html_response.text)
    if not match:
        print("No caption tracks")
        return
        
    # Extract the first baseUrl
    url_match = re.search(r'"baseUrl":"([^"]+)"', match.group(1))
    if not url_match:
        print("No url found")
        return
        
    url = url_match.group(1).replace('\\u0026', '&') + '&fmt=json3'
    print("URL:", url)
    
    # Fetch transcript
    transcript_response = requests.get(url, impersonate='chrome')
    try:
        data = transcript_response.json()
        events = data.get('events', [])
        text = ' '.join([seg.get('utf8', '') for event in events for seg in event.get('segs', [])])
        print("TEXT:", text[:500])
    except Exception as e:
        print("Error parsing json:", e)

test()
