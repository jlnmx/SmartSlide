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
        Generate a professional presentation about "{prompt_topic}".
        The presentation should have exactly {num_slides} slides.
        The language should be {language}.
        Each slide should have:
        - A concise and engaging title.
        - Slide content as a list of paragraphs or bullet points, using Markdown for formatting (**bold**, *italic*, __underline__).
        - Font family and font size for title and content.
        - Suggestions for colors and layout (e.g., Title and Content, Two Content, Section Header, etc.).
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

@main.route("/download-pptx", methods=["POST"])
def download_pptx():
    data = request.json
    slides = data.get("slides", [])

    if not slides or not isinstance(slides, list):
        return jsonify({"error": "Invalid slide data provided."}), 400

    try:
        ppt = Presentation()
        for slide_data in slides:
            layout = slide_data.get("layout", "Title and Content")
            slide_layout = ppt.slide_layouts[1]  # Default to Title and Content
            slide = ppt.slides.add_slide(slide_layout)

            # Title
            title_shape = slide.shapes.title
            title_shape.text = ""
            title_run = title_shape.text_frame.paragraphs[0].add_run()
            apply_markdown_formatting(title_run, slide_data.get("title", "Untitled Slide"))
            # Font for title
            if "title_font" in slide_data or "title_size" in slide_data:
                font = title_run.font
                if "title_font" in slide_data:
                    font.name = slide_data["title_font"]
                if "title_size" in slide_data:
                    font.size = Pt(slide_data["title_size"])

            # Content
            content_shape = slide.placeholders[1]
            content_shape.text = ""
            content_items = slide_data.get("content", [])
            if isinstance(content_items, str):
                content_items = [content_items]
            for para_text in content_items:
                p = content_shape.text_frame.add_paragraph()
                run = p.add_run()
                apply_markdown_formatting(run, para_text)
                # Font for content
                if "content_font" in slide_data or "content_size" in slide_data:
                    font = run.font
                    if "content_font" in slide_data:
                        font.name = slide_data["content_font"]
                    if "content_size" in slide_data:
                        font.size = Pt(slide_data["content_size"])
                p.alignment = PP_ALIGN.LEFT

            # Color (background)
            if "color" in slide_data:
                try:
                    rgb = slide_data["color"].lstrip("#")
                    fill = slide.background.fill
                    fill.solid()
                    fill.fore_color.rgb = RGBColor(int(rgb[0:2], 16), int(rgb[2:4], 16), int(rgb[4:6], 16))
                except Exception:
                    pass

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

        return jsonify({"slides": slides_data})

    except Exception as e:
        print(f"Error in paste-and-create: {e}")
        traceback.print_exc()
        return jsonify({"error": "An error occurred while processing the pasted text.", "details": str(e)}), 500