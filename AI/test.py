import google.generativeai as genai
from dotenv import load_dotenv
import os

load_dotenv()  # .env 로드

api_key = os.getenv("GEMINI_API_KEY")
print("GEMINI:", api_key)

genai.configure(api_key=api_key)   

for m in genai.list_models():
    if "generateContent" in m.supported_generation_methods:
        print(m.name, m.supported_generation_methods)