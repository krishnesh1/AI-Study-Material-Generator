import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

def test_groq_api():
    print("Making the 1st API call to Groq...")
    
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # We use qwen/qwen3.6-27b or llama3-8b-8192 if it were active.
    # We found qwen/qwen3.6-27b to be active earlier.
    data = {
        "model": "qwen/qwen3.6-27b",
        "messages": [
            {
                "role": "user",
                "content": "Write a one-sentence greeting to the developer who just made their first Groq API call. Do not use a <think> block. Just output the greeting."
            }
        ],
        "max_tokens": 200
    }
    
    response = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers=headers,
        json=data
    )
    
    if response.status_code == 200:
        result = response.json()
        print("\nSuccess! Here is the response from Groq:")
        print("-" * 50)
        print(result["choices"][0]["message"]["content"].encode("ascii", "ignore").decode("ascii"))
        print("-" * 50)
    else:
        print(f"\nError: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    test_groq_api()
