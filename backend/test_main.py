import pytest
from main import extract_video_id, sanitize_youtube_url, clean_llm_json

def test_extract_video_id_valid():
    urls = [
        ("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://youtube.com/watch?v=dQw4w9WgXcQ&feature=share", "dQw4w9WgXcQ"),
        ("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s", "dQw4w9WgXcQ"),
    ]
    for url, expected in urls:
        assert extract_video_id(url) == expected

def test_extract_video_id_invalid():
    with pytest.raises(ValueError):
        extract_video_id("https://google.com")
    with pytest.raises(ValueError):
        extract_video_id("")

def test_sanitize_youtube_url():
    video_id, clean_url = sanitize_youtube_url("https://youtu.be/dQw4w9WgXcQ?t=10s")
    assert video_id == "dQw4w9WgXcQ"
    assert clean_url == "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

def test_clean_llm_json():
    # Test valid JSON
    valid_json = '{"title": "Test"}'
    assert clean_llm_json(valid_json) == {"title": "Test"}
    
    # Test JSON with markdown block
    markdown_json = '```json\n{"title": "Test"}\n```'
    assert clean_llm_json(markdown_json) == {"title": "Test"}
    
    # Test JSON with think tags
    think_json = '<think>some reasoning</think>\n```json\n{"title": "Test"}\n```'
    assert clean_llm_json(think_json) == {"title": "Test"}

    # Test invalid JSON
    assert clean_llm_json("invalid text") == {}
