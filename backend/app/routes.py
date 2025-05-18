import os
import requests  
import json
import uuid
from app.templates_config import TEMPLATES
from datetime import datetime
from flask import Blueprint, jsonify, request, send_file, send_from_directory
from dotenv import load_dotenv
from flask_cors import CORS
from werkzeug.utils import secure_filename
from pptx import Presentation
from pptx.util import Pt, Inches
from pptx.dml.color import RGBColor
from PIL import Image, ImageDraw
from pptx.enum.text import PP_ALIGN
from pdf2image import convert_from_path
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from google.oauth2 import service_account
from googleapiclient.discovery import build
import io
import re
import os
import traceback
import pdfplumber
import pandas as pd
from docx import Document
from bs4 import BeautifulSoup
try:
    from youtube_transcript_api import YouTubeTranscriptApi
except ImportError:
    YouTubeTranscriptApi = None

load_dotenv()
GOOGLE_CREDENTIALS_FILE = os.path.join(os.path.dirname(__file__), '..', 'credentials.json')
GOOGLE_CREDENTIALS_FILE = os.path.abspath(GOOGLE_CREDENTIALS_FILE)
SCOPES = ["https://www.googleapis.com/auth/presentations", "https://www.googleapis.com/auth/drive.file"]
ALLOWED_EXTENSIONS = {'pdf', 'xlsx', 'xls', 'csv', 'docx'}
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY environment variable is not set. Please set it in your environment or .env file.")

main = Blueprint("main", __name__)
CORS(main, resources={r"/*": {"origins": "http://localhost:3000"}})

@main.after_request
def after_request(response):
    response.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
    response.headers.add("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    return response

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
        return jsonify({"error": "Invalid number of slides."}), 400
    if not prompt_topic:
        return jsonify({"error": "Prompt topic is required."}), 400
    try:
        presentation_type = data.get("presentationType", "Default")
        generation_prompt = f"""
        Generate a professional, well-structured presentation about "{prompt_topic}".
        Requirements:
        - The presentation must have exactly {num_slides} slides.
        - Use {language} as the language.
        - The presentation style/type should be: {presentation_type}.
        - Each slide should have:
        - A concise and engaging title.
        - Clear and concise content, formatted as bullet points or short paragraphs.
        - Use Markdown for formatting: **bold** for emphasis, *italic* for highlights, and __underline__ for key terms.
        - If applicable, include a relevant image description for each slide (e.g., "A diagram of the water cycle").
        - Organize the content logically:
        - Slide 1: Introduction (overview of the topic).
        - Slide 2: Key definitions or background information.
        - Slide 3-{num_slides-1}: Main points, examples, or case studies.
        - Slide {num_slides}: Conclusion or references.
        - Ensure the content is professional, insightful, and suitable for a business or academic audience.
        - Provide a JSON array where each object has:
        - 'title': string,
        - 'content': array of strings (use Markdown for formatting),
        - 'image_prompt': string (optional, for generating relevant images).

        Example:
        [
        {{
            "title": "Introduction to Artificial Intelligence",
            "content": [
            "**Artificial Intelligence (AI)** is the simulation of human intelligence in machines.",
            "Key areas include: \n- Machine Learning\n- Natural Language Processing\n- Robotics",
            "*AI is transforming industries worldwide.*"
            ],
            "image_prompt": "A futuristic image of AI robots working in an office"
        }},
        {{
            "title": "References",
            "content": [
            "1. Russell, S., & Norvig, P. (2020). *Artificial Intelligence: A Modern Approach*.",
            "2. https://www.ibm.com/cloud/learn/what-is-artificial-intelligence"
            ],
            "image_prompt": null
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
            "model": "llama3-8b-8192",  
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

        # Validate the structure of each slide
        for slide in slides_data:
            if not isinstance(slide, dict):
                raise ValueError("Each slide must be a dictionary.")
            if 'title' not in slide or not isinstance(slide['title'], str):
                raise ValueError("Each slide must have a 'title' field of type string.")
            if 'content' not in slide or not isinstance(slide['content'], list):
                raise ValueError("Each slide must have a 'content' field of type list.")
            if not all(isinstance(item, str) for item in slide['content']):
                raise ValueError("Each item in the 'content' field must be a string.")

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

def generate_image_huggingface(prompt):
    """
    Calls Hugging Face API to generate an image from a prompt.
    Returns the image URL or None.
    """
    import time

    HUGGINGFACE_API_TOKEN = os.environ.get("HUGGINGFACE_API_TOKEN")  # Fetch token from .env
    if not HUGGINGFACE_API_TOKEN:
        print("Error: HUGGINGFACE_API_TOKEN is not set in the environment.")
        return None

    url = "https://api-inference.huggingface.co/models/CompVis/stable-diffusion-v1-4"
    headers = {
        "Authorization": f"Bearer {HUGGINGFACE_API_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "inputs": prompt,
        "options": {"wait_for_model": True}
    }

    try:
        print(f"Requesting image from Hugging Face for prompt: {prompt}")
        response = requests.post(url, headers=headers, json=payload, timeout=60)
        if response.status_code != 200:
            print("Hugging Face error:", response.text)
            return None

        # Hugging Face returns the image as binary data
        image_bytes = response.content
        image_path = os.path.join(os.getcwd(), f"{uuid.uuid4().hex[:8]}.png")
        with open(image_path, "wb") as img_file:
            img_file.write(image_bytes)

        print(f"Image generated and saved at: {image_path}")
        return image_path
    except Exception as e:
        print(f"Hugging Face API error: {e}")
    return None

def apply_template_to_slide(slide, template, slide_data):
    # Set background color
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = RGBColor(*template["background_color"])

    # Title
    title_shape = slide.shapes.title
    if title_shape:
        title_shape.text = slide_data.get("title", "Untitled Slide")
        p = title_shape.text_frame.paragraphs[0]
        font = p.font
        font.name = template["title_font"]["name"]
        font.size = Pt(template["title_font"]["size"])
        font.color.rgb = RGBColor(*template["title_font"]["color"])
        font.bold = template.get("title_bold", False)

    content_shape = slide.placeholders[1] if len(slide.placeholders) > 1 else None
    if content_shape:
        content_shape.text_frame.clear()
        content_list = slide_data.get("content", [])
        # If too many items, reduce font size
        font_size = template["content_font"]["size"]
        if isinstance(content_list, list) and len(content_list) > 6:
            font_size = max(16, font_size - 4)
        for idx, item in enumerate(content_list):
            p = content_shape.text_frame.add_paragraph()
            p.text = item
            font = p.font
            font.name = template["content_font"]["name"]
            font.size = Pt(font_size)
            font.color.rgb = RGBColor(*template["content_font"]["color"])
            font.bold = template.get("content_bold", False)
            if idx == 0:
                p.level = 0
            else:
                p.level = 1
    else:
        left = Pt(50)
        top = Pt(150)
        width = Pt(600)
        height = Pt(350)
        textbox = slide.shapes.add_textbox(left, top, width, height)
        tf = textbox.text_frame
        tf.clear()
        content_list = slide_data.get("content", [])
        font_size = template["content_font"]["size"]
        if isinstance(content_list, list) and len(content_list) > 6:
            font_size = max(16, font_size - 4)
        for item in content_list:
            p = tf.add_paragraph()
            p.text = item
            font = p.font
            font.name = template["content_font"]["name"]
            font.size = Pt(font_size)
            font.color.rgb = RGBColor(*template["content_font"]["color"])
            font.bold = template.get("content_bold", False)


@main.route("/generate-presentation", methods=["POST"])
def generate_presentation():
    try:
        data = request.json
        slides = data.get("slides")
        template_id = data.get("template")
        template = TEMPLATES.get(template_id)
        presentation_type = data.get("presentationType", "Default")
        if not slides or not isinstance(slides, list):
            return jsonify({"error": "Invalid slides data."}), 400
        if not template:
            return jsonify({"error": "Invalid or missing template."}), 400

        ppt = Presentation()
        set_presentation_size(ppt, presentation_type)  # Set slide size based on type

        for slide_data in slides:
            slide = ppt.slides.add_slide(ppt.slide_layouts[1])
            apply_template_to_slide(slide, template, slide_data)

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
        print(f"Error generating presentation: {e}")
        traceback.print_exc()
        return jsonify({"error": "An error occurred while generating the presentation.", "details": str(e)}), 500
    
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
    

@main.route("/create-google-slides", methods=["POST"])
def create_google_slides():
    try:
        credentials = service_account.Credentials.from_service_account_file(
            GOOGLE_CREDENTIALS_FILE, scopes=SCOPES
        )
        slides_service = build("slides", "v1", credentials=credentials)
        drive_service = build("drive", "v3", credentials=credentials)

        data = request.json
        slides_from_frontend = data.get("slides")
        template_id = data.get("template")
        template = TEMPLATES.get(template_id)
        presentation_type = data.get("presentationType", "Default")

        if slides_from_frontend is None:
            return jsonify({"error": "Slides data is missing (must be a list, can be empty)."}), 400
        if not isinstance(slides_from_frontend, list):
            return jsonify({"error": "Slides data must be a list."}), 400
        if not template:
            return jsonify({"error": "Invalid or missing template."}), 400

        presentation_title = "Generated Presentation"
        if not slides_from_frontend:
            presentation_title = "New Presentation (Empty)"

        # Set slide size based on presentation type
        if presentation_type == "Tall":
            page_size = {"width": {"magnitude": 6858000, "unit": "EMU"}, "height": {"magnitude": 12192000, "unit": "EMU"}}
        elif presentation_type == "Traditional":
            page_size = {"width": {"magnitude": 9144000, "unit": "EMU"}, "height": {"magnitude": 6858000, "unit": "EMU"}}
        else:  # Default (Widescreen)
            page_size = {"width": {"magnitude": 12192000, "unit": "EMU"}, "height": {"magnitude": 6858000, "unit": "EMU"}}

        presentation = slides_service.presentations().create(
            body={"title": presentation_title, "pageSize": page_size}
        ).execute()
        presentation_id = presentation["presentationId"]

        if not slides_from_frontend:
            drive_service.permissions().create(
                fileId=presentation_id, body={"type": "anyone", "role": "writer"}
            ).execute()
            presentation_url = f"https://docs.google.com/presentation/d/{presentation_id}/edit"
            return jsonify({"url": presentation_url})

        # --- Batch 1: Delete initial default slide AND Create all new slide pages ---
        initial_presentation_data = slides_service.presentations().get(presentationId=presentation_id, fields="slides(objectId)").execute()
        initial_api_slides = initial_presentation_data.get("slides", [])

        batch1_requests = []
        if initial_api_slides:
            initial_slide_id = initial_api_slides[0].get("objectId")
            if initial_slide_id:
                batch1_requests.append({"deleteObject": {"objectId": initial_slide_id}})

        page_object_ids = []
        for _ in slides_from_frontend:
            page_object_id = f"page_{uuid.uuid4().hex}"
            page_object_ids.append(page_object_id)
            batch1_requests.append({
                "createSlide": {
                    "objectId": page_object_id,
                    "slideLayoutReference": {
                        "predefinedLayout": "TITLE_AND_BODY"
                    }
                }
            })

        if batch1_requests:
            slides_service.presentations().batchUpdate(
                presentationId=presentation_id,
                body={"requests": batch1_requests}
            ).execute()

        # --- Retrieve the presentation again. It should now only contain the slides we created. ---
        fields_to_get = "slides(objectId,pageElements(objectId,shape(placeholder(type))))"
        presentation_with_slides = slides_service.presentations().get(
            presentationId=presentation_id,
            fields=fields_to_get
        ).execute()
        api_slides = presentation_with_slides.get("slides", [])

        # --- Batch 2: Add content (text and images) and apply template styles ---
        update_content_requests = []

        for i in range(min(len(slides_from_frontend), len(api_slides))):
            frontend_slide_content = slides_from_frontend[i]
            current_api_slide = api_slides[i]
            page_id = current_api_slide.get("objectId")
            page_elements = current_api_slide.get("pageElements", [])
            title_placeholder_id = None
            body_placeholder_id = None

            for element in page_elements:
                shape = element.get("shape")
                if shape:
                    placeholder = shape.get("placeholder")
                    if placeholder:
                        placeholder_type = placeholder.get("type")
                        if placeholder_type == "TITLE":
                            title_placeholder_id = element.get("objectId")
                        elif placeholder_type == "BODY":
                            body_placeholder_id = element.get("objectId")
                        if title_placeholder_id and body_placeholder_id:
                            break

            # Add text to title placeholder
            if title_placeholder_id and frontend_slide_content.get("title"):
                update_content_requests.append({
                    "insertText": {
                        "objectId": title_placeholder_id,
                        "text": frontend_slide_content["title"]
                    }
                })
                # Apply title font style if template is provided
                update_content_requests.append({
                    "updateTextStyle": {
                        "objectId": title_placeholder_id,
                        "style": {
                            "fontFamily": template["title_font"]["name"],
                            "fontSize": {"magnitude": template["title_font"]["size"], "unit": "PT"},
                            "bold": template.get("title_bold", False),
                            "foregroundColor": {
                                "opaqueColor": {
                                    "rgbColor": {
                                        "red": template["title_font"]["color"][0] / 255.0,
                                        "green": template["title_font"]["color"][1] / 255.0,
                                        "blue": template["title_font"]["color"][2] / 255.0
                                    }
                                }
                            }
                        },
                        "fields": "fontFamily,fontSize,bold,foregroundColor",
                        "textRange": {"type": "ALL"}
                    }
                })

            # Add text to body placeholder
            if body_placeholder_id and frontend_slide_content.get("content"):
                content_list = frontend_slide_content.get("content", [])
                content_text = ""
                if isinstance(content_list, list):
                    content_text = "\n".join(str(item) for item in content_list)
                elif isinstance(content_list, str):
                    content_text = content_list

                if content_text:
                    update_content_requests.append({
                        "insertText": {
                            "objectId": body_placeholder_id,
                            "text": content_text
                        }
                    })
                    # Apply content font style if template is provided
                    update_content_requests.append({
                        "updateTextStyle": {
                            "objectId": body_placeholder_id,
                            "style": {
                                "fontFamily": template["content_font"]["name"],
                                "fontSize": {"magnitude": template["content_font"]["size"], "unit": "PT"},
                                "bold": template.get("content_bold", False),
                                "foregroundColor": {
                                    "opaqueColor": {
                                        "rgbColor": {
                                            "red": template["content_font"]["color"][0] / 255.0,
                                            "green": template["content_font"]["color"][1] / 255.0,
                                            "blue": template["content_font"]["color"][2] / 255.0
                                        }
                                    }
                                }
                            },
                            "fields": "fontFamily,fontSize,bold,foregroundColor",
                            "textRange": {"type": "ALL"}
                        }
                    })

            # Add image if available
            if frontend_slide_content.get("image_url"):
                update_content_requests.append({
                    "createImage": {
                        "url": frontend_slide_content["image_url"],
                        "elementProperties": {
                            "pageObjectId": page_id,
                            "size": {
                                "width": {"magnitude": 3000000, "unit": "EMU"},
                                "height": {"magnitude": 2250000, "unit": "EMU"}
                            },
                            "transform": {
                                "scaleX": 1, "scaleY": 1,
                                "translateX": 5500000,
                                "translateY": 1400000,
                                "unit": "EMU"
                            }
                        }
                    }
                })

            # Apply background color if template is provided
            update_content_requests.append({
                "updatePageProperties": {
                    "objectId": page_id,
                    "pageProperties": {
                        "pageBackgroundFill": {
                            "solidFill": {
                                "color": {
                                    "rgbColor": {
                                        "red": template["background_color"][0] / 255.0,
                                        "green": template["background_color"][1] / 255.0,
                                        "blue": template["background_color"][2] / 255.0
                                    }
                                }
                            }
                        }
                    },
                    "fields": "pageBackgroundFill"
                }
            })

        if update_content_requests:
            slides_service.presentations().batchUpdate(
                presentationId=presentation_id,
                body={"requests": update_content_requests}
            ).execute()

        # Update sharing permissions
        drive_service.permissions().create(
            fileId=presentation_id,
            body={"type": "anyone", "role": "writer"},
        ).execute()

        presentation_url = f"https://docs.google.com/presentation/d/{presentation_id}/edit"
        return jsonify({"url": presentation_url})

    except Exception as e:
        print(f"Error creating Google Slides presentation: {e}")
        traceback.print_exc()
        return jsonify({"error": "An error occurred while creating the Google Slides presentation.", "details": str(e)}), 500
    
def set_presentation_size(ppt, presentation_type):
    if presentation_type == "Tall":
        ppt.slide_width = Inches(7.5)
        ppt.slide_height = Inches(13.33)
    elif presentation_type == "Traditional":
        ppt.slide_width = Inches(10)
        ppt.slide_height = Inches(7.5)
    else:  # Default (Widescreen)
        ppt.slide_width = Inches(13.33)
        ppt.slide_height = Inches(7.5)