import os
import requests  
import json
from flask import Blueprint, jsonify, request, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
import io
import re
import traceback
import pdfplumber
import pandas as pd
from docx import Document
from bs4 import BeautifulSoup
try:
    from youtube_transcript_api import YouTubeTranscriptApi
except ImportError:
    YouTubeTranscriptApi = None

ALLOWED_EXTENSIONS = {'pdf', 'xlsx', 'xls', 'csv', 'docx'}
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_API_KEY = "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"  # For production, use os.environ.get("GROQ_API_KEY")

main = Blueprint("main", __name__)
CORS(main, resources={r"/*": {"origins": "*"}})

@main.route("/generate-slides", methods=["POST"])
def generate_slides():
    data = request.json
    if not data:
        return jsonify({"error": "Invalid JSON payload."}), 400

    prompt_topic = data.get("prompt")
    language = data.get("language", "English")
    try:
        num_slides = int(data.get("numSlides", 5))
        if num_slides <= 0:
            raise ValueError("Number of slides must be positive.")
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid number of slides specified."}), 400

    if not prompt_topic:
        return jsonify({"error": "Prompt topic is required."}), 400

    try:
        generation_prompt = f"""
        Generate a professional, well-structured presentation about "{prompt_topic}".
        Requirements:
        - The presentation must have exactly {num_slides} slides.
        - Use {language} as the language.
        - Each slide should be clear, concise, and suitable for a business or academic audience.
        - Organize the content logically: include an introduction, definitions of key terms, main points with bullet points or enumerations, examples or case studies if relevant, and a references or further reading slide at the end.
        - Use paragraphs for explanations, bullet points for lists, and enumerations where appropriate.
        - For each slide, provide a concise and engaging title.
        - Use Markdown for formatting: **bold** for emphasis, *italic* for highlights, and __underline__ for key terms.
        - Specify font family and font size for both title and content.
        - Suggest appropriate colors and layout (e.g., Title and Content, Two Content, Section Header, etc.).
        - For the references slide, include at least 2 reputable sources (real or plausible).
        - Make the content sound professional and insightful, not simplistic.

        Format the output STRICTLY as a JSON array where each object has:
        - 'title': string,
        - 'content': array of strings (use Markdown for formatting),
        - 'title_font': string,
        - 'title_size': int,
        - 'content_font': string,
        - 'content_size': int,
        - 'color': string,
        - 'layout': string

        Example:
        [
        {{
            "title": "Introduction to Artificial Intelligence",
            "content": [
            "**Artificial Intelligence (AI)** is the simulation of human intelligence in machines.",
            "Key areas include: \n- Machine Learning\n- Natural Language Processing\n- Robotics",
            "*AI is transforming industries worldwide.*"
            ],
            "title_font": "Arial Black",
            "title_size": 44,
            "content_font": "Calibri",
            "content_size": 32,
            "color": "#1F497D",
            "layout": "Title and Content"
            "image_prompt": "A diagram of the water cycle showing evaporation, condensation, precipitation, and collection"
        }},
        {{
            "title": "References",
            "content": [
            "1. Russell, S., & Norvig, P. (2020). *Artificial Intelligence: A Modern Approach*.",
            "2. https://www.ibm.com/cloud/learn/what-is-artificial-intelligence"
            ],
            "title_font": "Arial",
            "title_size": 36,
            "content_font": "Calibri",
            "content_size": 28,
            "color": "#333333",
            "layout": "Section Header"
        }}
        ]

        Generate the slides now:
        """

        print(f"--- Sending prompt to Groq (Topic: {prompt_topic}, Slides: {num_slides}, Lang: {language}) ---")

        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "llama3-8b-8192",  # Or "gpt-3.5-turbo" if you prefer
            "messages": [
                {"role": "system", "content": "You are a helpful assistant that generates slide content in JSON format."},
                {"role": "user", "content": generation_prompt}
            ],
            "max_tokens": 4096,
            "temperature": 0.3
        }
        response = requests.post(GROQ_API_URL, headers=headers, json=payload)
        if response.status_code != 200:
            return jsonify({"error": "Failed to generate slides using Groq API.", "details": response.text}), 500

        result = response.json()
        model_output = result["choices"][0]["message"]["content"]

        # Extract JSON array from the response
        match = re.search(r'\[\s*{.*}\s*\]', model_output, re.DOTALL)
        if not match:
            raise ValueError("Could not find a JSON array in the model output.")
        slides_data = json.loads(match.group(0))

        for slide in slides_data:
            image_prompt = slide.get("image_prompt") or slide.get("title")
            if image_prompt:
                slide["image_url"] = generate_image_replicate(image_prompt)

        # Validate
        if not isinstance(slides_data, list):
            raise ValueError("Invalid JSON structure: Expected a list.")
        if not all(isinstance(s, dict) and 'title' in s and 'content' in s for s in slides_data):
            raise ValueError("Invalid JSON structure: Each slide object must have 'title' and 'content' keys.")
        if len(slides_data) != num_slides:
            print(f"Warning: Groq returned {len(slides_data)} slides, but {num_slides} were requested.")

        print(f"--- Successfully Parsed {len(slides_data)} Slides ---")
        return jsonify({"slides": slides_data})

    except json.JSONDecodeError as e:
        print(f"JSON Decode Error: {e}")
        return jsonify({"error": "Failed to parse response from Groq API.", "details": str(e)}), 500
    except Exception as e:
        print(f"Error during slide generation: {e}")
        traceback.print_exc()
        return jsonify({"error": "An error occurred during slide generation.", "details": str(e)}), 500

def apply_markdown_formatting(run, text):
    import re
    # Bold
    bold_match = re.search(r"\*\*(.*?)\*\*", text)
    if bold_match:
        run.bold = True
        text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    # Italic
    italic_match = re.search(r"\*(.*?)\*", text)
    if italic_match:
        run.italic = True
        text = re.sub(r"\*(.*?)\*", r"\1", text)
    # Underline
    underline_match = re.search(r"__(.*?)__", text)
    if underline_match:
        run.underline = True
        text = re.sub(r"__(.*?)__", r"\1", text)
    run.text = text

def download_image(url, filename):
    response = requests.get(url)
    if response.status_code == 200:
        with open(filename, "wb") as f:
            f.write(response.content)
        return filename
    return None

def generate_image_replicate(prompt):
    """
    Calls Replicate API to generate an image from a prompt.
    Returns the image URL or None.
    """
    import time
    REPLICATE_API_TOKEN = "r8_WmanNC94gwfpLpabUeCRwMX2TjThxtS2lWoX3"
    model_version = "stability-ai/sdxl:1b6d6e3e8b7e4e6e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8estability-ai/sdxl:1b6d6e3e8b7e4e6e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e"
    url = f"https://api.replicate.com/v1/predictions"
    headers = {
        "Authorization": f"Token {REPLICATE_API_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "version": model_version,
        "input": {"prompt": prompt}
    }
    try:
        print(f"Requesting image from Replicate for prompt: {prompt}")
        response = requests.post(url, headers=headers, json=payload, timeout=60)
        if response.status_code != 201:
            print("Replicate error:", response.text)
            return None
        prediction = response.json()
        prediction_url = prediction["urls"]["get"]
        for i in range(40):  # Wait up to 40 seconds
            status_resp = requests.get(prediction_url, headers=headers)
            status_data = status_resp.json()
            print(f"Replicate status ({i}): {status_data['status']}")
            if status_data["status"] == "succeeded":
                output = status_data.get("output")
                if output and isinstance(output, list) and output[0]:
                    print(f"Image generated: {output[0]}")
                    return output[0]
                else:
                    print("No output in Replicate response.")
                    return None
            elif status_data["status"] == "failed":
                print("Replicate generation failed.")
                break
            time.sleep(1)
        print("Replicate timed out.")
    except Exception as e:
        print(f"Replicate API error: {e}")
    return None

@main.route("/download-pptx", methods=["POST"])
def download_pptx():
    data = request.json
    slides = data.get("slides", [])

    if not slides or not isinstance(slides, list):
        return jsonify({"error": "Invalid slide data provided."}), 400

    try:
        ppt = Presentation()
        blank_layout = ppt.slide_layouts[6]  # Blank layout for custom positioning

        for idx, slide_data in enumerate(slides):
            slide = ppt.slides.add_slide(blank_layout)

            # LEFT: Title and Content (split layout)
            left = Inches(0.3)
            top = Inches(0.7)
            width = Inches(5.5)
            height = Inches(6.0)
            txBox = slide.shapes.add_textbox(left, top, width, height)
            tf = txBox.text_frame
            tf.word_wrap = True

            # Title
            title_run = tf.paragraphs[0].add_run()
            apply_markdown_formatting(title_run, slide_data.get("title", "Untitled Slide"))
            if "title_font" in slide_data or "title_size" in slide_data:
                font = title_run.font
                if "title_font" in slide_data:
                    font.name = slide_data["title_font"]
                if "title_size" in slide_data:
                    font.size = Pt(slide_data["title_size"])
            tf.paragraphs[0].space_after = Pt(18)

            # Content
            content_items = slide_data.get("content", [])
            if isinstance(content_items, str):
                content_items = [content_items]
            for para_text in content_items:
                p = tf.add_paragraph()
                run = p.add_run()
                apply_markdown_formatting(run, para_text)
                if "content_font" in slide_data or "content_size" in slide_data:
                    font = run.font
                    if "content_font" in slide_data:
                        font.name = slide_data["content_font"]
                    if "content_size" in slide_data:
                        font.size = Pt(slide_data["content_size"])
                p.alignment = PP_ALIGN.LEFT
                p.space_after = Pt(8)

            # RIGHT: Image (split layout)
            image_url = slide_data.get("image_url")
            if image_url:
                img_path = download_image(image_url, f"temp_slide_img_{idx}.png")
                if img_path:
                    img_left = Inches(6.1)
                    img_top = Inches(0.7)
                    img_width = Inches(3.3)
                    img_height = Inches(6.0)
                    try:
                        slide.shapes.add_picture(img_path, img_left, img_top, img_width, img_height)
                    except Exception as e:
                        print(f"Failed to add image for slide {idx+1}: {e}")
                    finally:
                        if os.path.exists(img_path):
                            os.remove(img_path)

        ppt_stream = io.BytesIO()
        ppt.save(ppt_stream)
        ppt_stream.seek(0)

        return send_file(
            ppt_stream,
            as_attachment=True,
            download_name="generated_presentation.pptx",
            mimetype="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        )
    except Exception as e:
        print(f"Error generating PowerPoint file: {e}")
        traceback.print_exc()
        return jsonify({"error": "An error occurred while generating the PowerPoint file.", "details": str(e)}), 500
    
@main.route("/import-from-url", methods=["POST"])
def import_from_url():
    data = request.json
    url = data.get("url")
    if not url:
        return jsonify({"error": "No URL provided."}), 400

    try:
        text = ""
        # Handle Google Docs
        doc_match = re.match(r"https://docs\.google\.com/document/d/([a-zA-Z0-9-_]+)", url)
        if doc_match:
            doc_id = doc_match.group(1)
            export_url = f"https://docs.google.com/document/d/{doc_id}/export?format=txt"
            resp = requests.get(export_url)
            if resp.status_code == 200:
                text = resp.text
            else:
                return jsonify({"error": "Failed to fetch Google Doc content."}), 400

        # Handle Google Slides
        slide_match = re.match(r"https://docs\.google\.com/presentation/d/([a-zA-Z0-9-_]+)", url)
        if slide_match:
            slide_id = slide_match.group(1)
            export_url = f"https://docs.google.com/presentation/d/{slide_id}/export/txt"
            resp = requests.get(export_url)
            if resp.status_code == 200:
                text = resp.text
            else:
                return jsonify({"error": "Failed to fetch Google Slides content."}), 400

        # Handle YouTube
        yt_id = None
        # Match youtu.be short links
        short_match = re.match(r"https?://youtu\.be/([a-zA-Z0-9_-]+)", url)
        # Match youtube.com/watch?v=... links
        long_match = re.match(r"https?://(www\.)?youtube\.com/watch\?v=([a-zA-Z0-9_-]+)", url)
        if short_match:
            yt_id = short_match.group(1)
        elif long_match:
            yt_id = long_match.group(2)
        else:
            # Try to extract v= param from any YouTube URL
            v_match = re.search(r"[?&]v=([a-zA-Z0-9_-]+)", url)
            if v_match:
                yt_id = v_match.group(1)
        if yt_id and YouTubeTranscriptApi:
            try:
                transcript = YouTubeTranscriptApi.get_transcript(yt_id)
                text = " ".join([item['text'] for item in transcript])
            except Exception as e:
                return jsonify({"error": f"Could not fetch YouTube transcript: {str(e)}"}), 400
        # Fallback: Generic webpage
        if not text:
            resp = requests.get(url, timeout=10)
            if resp.status_code != 200:
                return jsonify({"error": "Failed to fetch the URL."}), 400
            soup = BeautifulSoup(resp.text, "html.parser")
            for tag in soup(["script", "style"]):
                tag.decompose()
            text = soup.get_text(separator="\n", strip=True)

        # Limit text length for LLM prompt
        text = text[:4000]

        # Prompt LLM to structure as slides
        prompt = f"""
        The following is content extracted from a URL:
        ---
        {text}
        ---
        Please summarize and organize this content into a professional presentation with concise slides.
        Format the output STRICTLY as a JSON array where each object represents a slide and has 'title', 'content', 'font', 'color', and 'layout' keys.
        """

        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "llama3-8b-8192",
            "messages": [
                {"role": "system", "content": "You are a helpful assistant that generates slide content in JSON format."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 4096,
            "temperature": 0.3
        }
        response = requests.post(GROQ_API_URL, headers=headers, json=payload)
        if response.status_code != 200:
            return jsonify({"error": "Failed to generate slides using Groq API.", "details": response.text}), 500

        result = response.json()
        model_output = result["choices"][0]["message"]["content"]

        # Extract JSON array from the response
        match = re.search(r'\[\s*{.*}\s*\]', model_output, re.DOTALL)
        if not match:
            raise ValueError("Could not find a JSON array in the model output.")
        slides_data = json.loads(match.group(0))
        for slide in slides_data:
            image_prompt = slide.get("image_prompt") or slide.get("title")
            if image_prompt:
                slide["image_url"] = generate_image_replicate(image_prompt)
        return jsonify({"slides": slides_data})

    except Exception as e:
        print(f"Error importing from URL: {e}")
        traceback.print_exc()
        return jsonify({"error": "An error occurred while importing from URL.", "details": str(e)}), 500
    

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@main.route("/upload-file", methods=["POST"])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request."}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file."}), 400
    if not allowed_file(file.filename):
        return jsonify({"error": "File type not allowed."}), 400

    filename = secure_filename(file.filename)
    ext = filename.rsplit('.', 1)[1].lower()
    slides_content = []

    try:
        if ext == 'pdf':
            with pdfplumber.open(file) as pdf:
                for i, page in enumerate(pdf.pages):
                    text = page.extract_text() or ""
                    slides_content.append({"title": f"Page {i+1}", "content": text})
        elif ext in ['xlsx', 'xls']:
            df = pd.read_excel(file)
            for i, col in enumerate(df.columns):
                content = df[col].astype(str).tolist()
                slides_content.append({"title": str(col), "content": "\n".join(content)})
        elif ext == 'csv':
            df = pd.read_csv(file)
            for i, col in enumerate(df.columns):
                content = df[col].astype(str).tolist()
                slides_content.append({"title": str(col), "content": "\n".join(content)})
        elif ext == 'docx':
            doc = Document(file)
            content = []
            for para in doc.paragraphs:
                if para.text.strip():
                    content.append(para.text.strip())
            # Split into slides every ~200 words
            chunk = []
            word_count = 0
            for para in content:
                chunk.append(para)
                word_count += len(para.split())
                if word_count > 200:
                    slides_content.append({"title": f"Slide {len(slides_content)+1}", "content": "\n".join(chunk)})
                    chunk = []
                    word_count = 0
            if chunk:
                slides_content.append({"title": f"Slide {len(slides_content)+1}", "content": "\n".join(chunk)})
        else:
            return jsonify({"error": "Unsupported file type."}), 400

        # Generate PowerPoint
        ppt = Presentation()
        for slide_data in slides_content:
            slide = ppt.slides.add_slide(ppt.slide_layouts[1])
            title = slide.shapes.title
            content = slide.placeholders[1]
            title.text = slide_data.get("title", "Untitled Slide")
            content.text = slide_data.get("content", "")

        ppt_stream = io.BytesIO()
        ppt.save(ppt_stream)
        ppt_stream.seek(0)

        return send_file(
            ppt_stream,
            as_attachment=True,
            download_name="converted_presentation.pptx",
            mimetype="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        )
    except Exception as e:
        print(f"Error converting file: {e}")
        traceback.print_exc()
        return jsonify({"error": "An error occurred while converting the file.", "details": str(e)}), 500
    

@main.route("/paste-and-create", methods=["POST"])
def paste_and_create():
    data = request.json
    pasted_text = data.get("text")
    if not pasted_text or not pasted_text.strip():
        return jsonify({"error": "No text provided."}), 400

    try:
        # Limit text length for LLM prompt
        text = pasted_text[:4000]

        prompt = f"""
        The following is content pasted by a user for a presentation:
        ---
        {text}
        ---
        Please summarize and organize this content into a professional presentation with concise slides.
        Format the output STRICTLY as a JSON array where each object has:
        - 'title': string,
        - 'content': array of strings (use Markdown for formatting),
        - 'title_font': string,
        - 'title_size': int,
        - 'content_font': string,
        - 'content_size': int,
        - 'color': string,
        - 'layout': string

        Example:
        [
        {{
            "title": "Introduction",
            "content": ["**Welcome** to the presentation!", "*Let's get started*"],
            "title_font": "Arial Black",
            "title_size": 44,
            "content_font": "Calibri",
            "content_size": 32,
            "color": "#1F497D",
            "layout": "Title and Content"
        }}
        ]

        Generate the slides now:
        """

        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "llama3-8b-8192",
            "messages": [
                {"role": "system", "content": "You are a helpful assistant that generates slide content in JSON format."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 4096,
            "temperature": 0.3
        }
        response = requests.post(GROQ_API_URL, headers=headers, json=payload)
        if response.status_code != 200:
            return jsonify({"error": "Failed to generate slides using Groq API.", "details": response.text}), 500

        result = response.json()
        model_output = result["choices"][0]["message"]["content"]

        # Extract JSON array from the response
        match = re.search(r'\[\s*{.*}\s*\]', model_output, re.DOTALL)
        if not match:
            raise ValueError("Could not find a JSON array in the model output.")
        slides_data = json.loads(match.group(0))
        for slide in slides_data:
            image_prompt = slide.get("image_prompt") or slide.get("title")
            if image_prompt:
                slide["image_url"] = generate_image_replicate(image_prompt)
        return jsonify({"slides": slides_data})
    
    except Exception as e:
        print(f"Error in paste-and-create: {e}")
        traceback.print_exc()
        return jsonify({"error": "An error occurred while processing the pasted text.", "details": str(e)}), 500