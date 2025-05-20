import os
import re
import json
import traceback
import uuid
import requests
from app.models import db, User, Analytics, Presentation
from app.templates_config import TEMPLATES
from datetime import datetime
from flask import Blueprint, jsonify, request, send_file, send_from_directory
from dotenv import load_dotenv
from flask_cors import CORS
from werkzeug.utils import secure_filename
from io import BytesIO
from pptx import Presentation as PptxPresentation
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
    response.headers.add("Access-Control-Allow-Methods", "GET,POST,OPTIONS,DELETE")
    return response

@main.route('/presentations/<int:user_id>', methods=['GET'])
def get_recent_presentations(user_id):
    """Return the most recent presentations for a user (limit 10)."""
    presentations = Presentation.query.filter_by(user_id=user_id).order_by(Presentation.created_at.desc()).limit(10).all()
    result = [
        {
            'id': p.id,
            'title': p.title,
            'created_at': p.created_at.isoformat(),
            'template': p.template,
            'presentation_type': p.presentation_type
        }
        for p in presentations
    ]
    return jsonify({'presentations': result})

@main.route("/generate-slides", methods=["POST"])
def generate_slides():
    data = request.json
    if not data:
        return

    prompt_topic = data.get("prompt")
    language = data.get("language", "English")
    user_id = data.get("user_id")  # Expect user_id from frontend
    template = data.get("template")
    presentation_type = data.get("presentationType", "Default")
    try:
        num_slides = int(data.get("numSlides", 5))
        if num_slides <= 0:
            return jsonify({"error": "Invalid number of slides."}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid number of slides."}), 400
    if not prompt_topic:
        return jsonify({"error": "Prompt topic is required."}), 400
    try:
        import requests, json, re, traceback
        generation_prompt = f"""
        Generate a professional, well-structured presentation about \"{prompt_topic}\".
        Requirements:
        - The presentation must have exactly {num_slides} slides.
        - Use {language} as the language.
        - The presentation style/type should be: {presentation_type}.
        - Each slide should have:
        - A concise and engaging title.
        - Remove the unnecessary characters from the texts like the ** or __. 
        - Make the structure of the sentences or paragraph clean
        - Generate the best answers possible for the given topic and do not be frugal with the content.
        - Clear and concise content, formatted as bullet points or short paragraphs.
        - Use Markdown for formatting: **bold** for emphasis, *italic* for highlights, and __underline__ for key terms.
        - If applicable, include a relevant image description for each slide (e.g., \"A diagram of the water cycle\").
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
            return jsonify({"error": "Failed to generate slides."}), 500

        result = response.json()
        model_output = result["choices"][0]["message"]["content"]

        # Extract JSON array from the response
        match = re.search(r'\[\s*{.*}\s*\]', model_output, re.DOTALL)
        if not match:
            return jsonify({"error": "Failed to parse slides output."}), 500
        slides_data = json.loads(match.group(0))

        # Validate the structure of each slide
        for slide in slides_data:
            pass

        print(f"--- Successfully Parsed {len(slides_data)} Slides ---")
        for slide in slides_data:
            pass

        # After successful slide generation, store presentation metadata and slides in DB
        if user_id:
            new_presentation = Presentation(
                user_id=user_id,
                title=prompt_topic,
                template=template,
                presentation_type=presentation_type,
                slides_json=json.dumps(slides_data)
            )
            db.session.add(new_presentation)
            db.session.commit()

        return jsonify({"slides": slides_data})

    except json.JSONDecodeError as e:
        print(f"JSON Decode Error: {e}")
        return jsonify({"error": "JSON decode error."}), 500
    except Exception as e:
        print(f"Error during slide generation: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Internal server error."}), 500

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

def apply_template_to_slide(slide, template, slide_data, ppt=None):
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

        # --- AUTO FONT SIZE LOGIC ---
        base_font_size = template["content_font"]["size"]
        font_size = base_font_size
        if template.get("auto_font_size", False):
            # Reduce font size if content is long (e.g. > 6 lines)
            n_items = len(content_list) if isinstance(content_list, list) else 1
            if n_items > 12:
                font_size = max(14, base_font_size - 8)
            elif n_items > 9:
                font_size = max(16, base_font_size - 6)
            elif n_items > 6:
                font_size = max(18, base_font_size - 4)
            else:
                font_size = base_font_size

        for idx, item in enumerate(content_list):
            p = content_shape.text_frame.add_paragraph()
            p.text = item
            font = p.font
            font.name = template["content_font"]["name"]
            font.size = Pt(font_size)
            font.color.rgb = RGBColor(*template["content_font"]["color"])
            font.bold = template.get("content_bold", False)
            p.level = 0 if idx == 0 else 1
    else:
        # fallback: add a textbox if placeholder not found
        left = Pt(50)
        top = Pt(150)
        width = Pt(600)
        height = Pt(350)
        textbox = slide.shapes.add_textbox(left, top, width, height)
        tf = textbox.text_frame
        tf.clear()
        content_list = slide_data.get("content", [])
        base_font_size = template["content_font"]["size"]
        font_size = base_font_size
        if template.get("auto_font_size", False):
            n_items = len(content_list) if isinstance(content_list, list) else 1
            if n_items > 12:
                font_size = max(14, base_font_size - 8)
            elif n_items > 9:
                font_size = max(16, base_font_size - 6)
            elif n_items > 6:
                font_size = max(18, base_font_size - 4)
            else:
                font_size = base_font_size
        for item in content_list:
            p = tf.add_paragraph()
            p.text = item
            font = p.font
            font.name = template["content_font"]["name"]
            font.size = Pt(font_size)
            font.color.rgb = RGBColor(*template["content_font"]["color"])
            font.bold = template.get("content_bold", False)

    if slide_data.get("image_url"):
        try:
            image_url = slide_data["image_url"]
            img_data = requests.get(image_url).content
            img_path = f"/tmp/{uuid.uuid4().hex}.png"
            with open(img_path, "wb") as f:
                f.write(img_data)
            # Place image on right half of slide, filling it edge-to-edge
            if ppt is not None:
                slide_width = ppt.slide_width
                slide_height = ppt.slide_height
                # Right half
                left = slide_width // 2
                top = 0
                width = slide_width // 2
                height = slide_height
                # Open image and crop/resize to fit right half
                with Image.open(img_path) as im:
                    # Calculate aspect ratios
                    target_ratio = width / height
                    img_ratio = im.width / im.height
                    # Crop image to match target aspect ratio (center crop)
                    if img_ratio > target_ratio:
                        # Image is wider than target: crop sides
                        new_width = int(im.height * target_ratio)
                        offset = (im.width - new_width) // 2
                        box = (offset, 0, offset + new_width, im.height)
                        im_cropped = im.crop(box)
                    else:
                        # Image is taller than target: crop top/bottom
                        new_height = int(im.width / target_ratio)
                        offset = (im.height - new_height) // 2
                        box = (0, offset, im.width, offset + new_height)
                        im_cropped = im.crop(box)
                    # Save cropped image
                    im_cropped.save(img_path)
                slide.shapes.add_picture(img_path, left, top, width, height)
            else:
                # fallback values if ppt is not provided
                left = Pt(400)
                top = Pt(0)
                width = Pt(300)
                height = Pt(225)
                slide.shapes.add_picture(img_path, left, top, width, height)
            os.remove(img_path)
        except Exception as e:
            print(f"Failed to add image to slide: {e}")


@main.route("/generate-presentation", methods=["POST"])
def generate_presentation():
    try:
        data = request.json
        slides = data.get("slides")
        template_id = data.get("template")
        template = TEMPLATES.get(template_id)
        presentation_type = data.get("presentationType", "Default")
        if not template:
            return jsonify({"error": "Invalid or missing template."}), 400

        ppt = PptxPresentation()
        set_presentation_size(ppt, presentation_type)  # Set slide size based on type

        for slide_data in slides:
            slide = ppt.slides.add_slide(ppt.slide_layouts[1])
            apply_template_to_slide(slide, template, slide_data, ppt)

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
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed'}), 400

    filename = secure_filename(file.filename)
    ext = filename.rsplit('.', 1)[1].lower()
    slides_content = []

    try:
        import re
        import string
        text = ""
        topic = os.path.splitext(filename)[0].replace('_', ' ').replace('-', ' ').title()
        if ext == 'pdf':
            from PyPDF2 import PdfReader
            reader = PdfReader(file)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        elif ext == 'docx':
            doc = Document(file)
            for para in doc.paragraphs:
                if para.text:
                    text += para.text + "\n"
        elif ext in ['csv', 'xls', 'xlsx']:
            import pandas as pd
            if ext == 'csv':
                df = pd.read_csv(file)
            else:
                df = pd.read_excel(file)
            text = df.to_string(index=False)
        else:
            text = file.read().decode(errors='ignore')

        # --- Slide splitting logic ---
        # Split by double newlines or headings
        sections = re.split(r'\n\s*\n|(?=^#+ )', text)
        slides = []
        for idx, section in enumerate(sections):
            if not section or not isinstance(section, str):
                continue
            section = section.strip()
            if not section:
                continue
            # Try to extract a title: first line if it's short and not generic
            lines = [l for l in section.split('\n') if l and l.strip()]
            first_line = lines[0].strip() if lines else ''
            # Heuristic: if first line is long or generic, generate a title
            generic_titles = [f"Slide {idx+1}", "Untitled", "Introduction", "Overview", "Summary"]
            if (not first_line or len(first_line) > 80 or first_line.lower() in [g.lower() for g in generic_titles]):
                # Use first 5-8 words of section as title, or fallback to topic
                words = section.split()
                if len(words) > 8:
                    title = " ".join(words[:8]) + "..."
                elif len(words) > 0:
                    title = " ".join(words[:min(8, len(words))])
                else:
                    title = topic
                # Capitalize first letter
                title = title[0].upper() + title[1:] if title else topic
            else:
                title = first_line
                # Remove title from content if it's the first line
                lines = lines[1:]
            # Remove any duplicate/overlapping content
            content = [l.strip() for l in lines if l.strip() and l.strip() != title]
            # If content is empty, use the section minus the title
            if not content:
                content = [section[len(title):].strip()] if section[len(title):].strip() else [section]
            slides.append({
                'title': title,
                'content': content
            })
        if not slides:
            return jsonify({'error': 'Could not extract slides from file.'}), 400
        return jsonify({'slides': slides})
    except Exception as e:
        return jsonify({'error': f'Failed to process file: {str(e)}'}), 500
    

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
                                "width": {"magnitude": 6096000, "unit": "EMU"},  # Half of 12192000
                                "height": {"magnitude": 6858000, "unit": "EMU"}
                            },
                            "transform": {
                                "scaleX": 1, "scaleY": 1,
                                "translateX": 6096000,  # Start at middle of slide
                                "translateY": 0,
                                "unit": "EMU"
                            }
                        }
                    }
                })

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

@main.route("/paste-and-create", methods=["POST", "OPTIONS"])
def paste_and_create():
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
        response.headers["Access-Control-Allow-Methods"] = "POST,OPTIONS"
        return response, 200

    data = request.json
    if not data or "text" not in data:
        return

    pasted_text = data["text"].strip()
    if not pasted_text:
        return

    import json
    # Split by double newlines or Markdown headings
    raw_sections = re.split(r'(?:\n\s*\n|^#+\s+)', pasted_text)
    slides = []
    for section in raw_sections:
        section = section.strip()
        if not section:
            continue
        lines = section.splitlines()
        first_line = lines[0].strip()
        if len(first_line.split()) > 12:
            title = first_line.split('.')[0] if '.' in first_line else first_line[:50]
            content_lines = lines
        else:
            title = first_line
            content_lines = lines[1:]
        if not content_lines:
            content_lines = lines[1:]
        if not content_lines:
            content_lines = [section[len(title):].strip()]
        content_lines = [l.strip() for l in content_lines if l.strip()]
        if not content_lines:
            continue
        slides.append({
            "title": title,
            "content": content_lines
        })

    # Fallback: if no slides detected, chunk by 100 words as before
    if not slides:
        words = pasted_text.split()
        chunk_size = 100
        for i in range(0, len(words), chunk_size):
            chunk = words[i:i+chunk_size]
            slides.append({
                "title": f"Slide {i//chunk_size+1}",
                "content": [' '.join(chunk)]
            })

    # Store presentation metadata in DB if user_id is provided
    user_id = data.get("user_id")
    template = data.get("template")
    presentation_type = data.get("presentationType", "Default")
    if user_id:
        new_presentation = Presentation(
            user_id=user_id,
            title=slides[0]["title"] if slides else "Untitled Presentation",
            template=template,
            presentation_type=presentation_type,
            slides_json=json.dumps(slides)
        )
        db.session.add(new_presentation)
        db.session.commit()

    return jsonify({"slides": slides, "result": f"Generated {len(slides)} slides."})

def generate_image_cloudflare(prompt):
    """
    Generate an image using Cloudflare Workers AI and return a data URL (base64-encoded PNG).
    """
    CLOUDFLARE_WORKERS_AI_KEY = os.environ.get("CLOUDFLARE_WORKERS_AI_KEY")
    CLOUDFLARE_ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
    if not CLOUDFLARE_WORKERS_AI_KEY:
        print("Error: CLOUDFLARE_WORKERS_AI_KEY is not set in the environment.")
        return None
    if not CLOUDFLARE_ACCOUNT_ID:
        print("Error: CLOUDFLARE_ACCOUNT_ID is not set in the environment.")
        return None

    url = f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0"
    headers = {
        "Authorization": f"Bearer {CLOUDFLARE_WORKERS_AI_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "prompt": prompt,
        "num_steps": 20,  # Cloudflare API requires <= 20
        "width": 768,
        "height": 512
    }
    try:
        response = requests.post(url, headers=headers, json=payload)
        if response.status_code != 200:
            print(f"Cloudflare Workers AI error: status={response.status_code}")
            print(f"Response content: {response.content}")
            return None
        if not response.content:
            print("Cloudflare Workers AI error: Empty response body.")
            return None
        try:
            result = response.json()
        except Exception as e:
            print(f"Cloudflare Workers AI error: Could not parse JSON. Raw response: {response.content}")
            return None
        # The result should contain a base64-encoded image string
        image_base64 = result.get("result", {}).get("image")
        if image_base64:
            return f"data:image/png;base64,{image_base64}"
    except Exception as e:
        print(f"Cloudflare Workers AI exception: {e}")
    return None

@main.route("/generate-quiz", methods=["POST"])
def generate_quiz():
    data = request.json
    slides = data.get("slides")
    user_id = data.get("user_id")  # Expect user_id from frontend
    if not slides or not isinstance(slides, list):
        return jsonify({"error": "Slides data is required."}), 400
    try:
        # Compose a prompt for quiz generation
        slide_text = "\n".join(
            f"Title: {slide.get('title', '')}\nContent: {' '.join(slide.get('content', []))}" for slide in slides
        )
        prompt = f"""
        Based on the following presentation slides, generate a structured quiz questionnaire. 
        - Include a mix of multiple choice, true/false, and short answer questions.
        - For each question, provide 3-4 choices if applicable, and indicate the correct answer.
        - Make sure the quiz covers all key points from the slides.
        - Return as a JSON array: [{{question, choices (optional), answer}}]
        Slides:\n{slide_text}
        """
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "llama3-8b-8192",
            "messages": [
                {"role": "system", "content": "You are a helpful assistant that generates quiz questions in JSON format."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 2048,
            "temperature": 0.3
        }
        response = requests.post(GROQ_API_URL, headers=headers, json=payload)
        if response.status_code != 200:
            return jsonify({"error": "Failed to generate quiz.", "details": response.text}), 500
        result = response.json()
        model_output = result["choices"][0]["message"]["content"]
        # Try to extract JSON array
        import re, json
        match = re.search(r'\[.*\]', model_output, re.DOTALL)
        if match:
            try:
                quiz = json.loads(match.group(0))
            except Exception:
                quiz = model_output
        else:
            quiz = model_output
        # Update analytics for quiz generation
        if user_id:
            update_analytics_on_quiz(user_id)
        return jsonify({"quiz": quiz})
    except Exception as e:
        print(f"Quiz generation error: {e}")
        return jsonify({"error": str(e)}), 500

@main.route("/generate-script", methods=["POST"])
def generate_script():
    data = request.json
    slides = data.get("slides")
    user_id = data.get("user_id")  # Expect user_id from frontend
    if not slides or not isinstance(slides, list):
        return jsonify({"error": "Slides data is required."}), 400
    try:
        # Compose a prompt for script generation
        slide_text = "\n".join(
            f"Title: {slide.get('title', '')}\nContent: {' '.join(slide.get('content', []))}" for slide in slides
        )
        prompt = f"""
        You are a professional speaker. Write a detailed speaker script for the following presentation slides.
        - The script should be engaging, clear, and follow the slide order.
        - For each slide, provide what the speaker should say, including transitions.
        Slides:\n{slide_text}
        """
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "llama3-8b-8192",
            "messages": [
                {"role": "system", "content": "You are a helpful assistant that generates speaker scripts."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 3072,
            "temperature": 0.3
        }
        response = requests.post(GROQ_API_URL, headers=headers, json=payload)
        if response.status_code != 200:
            return jsonify({"error": "Failed to generate script.", "details": response.text}), 500
        result = response.json()
        model_output = result["choices"][0]["message"]["content"]
        # Update analytics for script generation
        if user_id:
            update_analytics_on_script(user_id)
        return jsonify({"script": model_output.strip()})
    except Exception as e:
        print(f"Script generation error: {e}")
        return jsonify({"error": str(e)}), 500

@main.route("/export-quiz-word", methods=["POST"])
def export_quiz_word():
    data = request.json
    quiz = data.get("quiz")
    if not quiz:
        return jsonify({"error": "No quiz data provided."}), 400
    try:
        doc = Document()
        doc.add_heading("Generated Quiz", 0)
        if isinstance(quiz, list):
            for idx, q in enumerate(quiz, 1):
                doc.add_paragraph(f"Q{idx}: {q.get('question', '')}", style="List Number")
                choices = q.get("choices")
                if choices:
                    for c in choices:
                        doc.add_paragraph(c, style="List Bullet")
                answer = q.get("answer")
                if answer:
                    doc.add_paragraph(f"Answer: {answer}", style="Intense Quote")
                doc.add_paragraph("")
        else:
            doc.add_paragraph(str(quiz))
        buf = BytesIO()
        doc.save(buf)
        buf.seek(0)
        return send_file(buf, as_attachment=True, download_name="generated_quiz.docx", mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    except Exception as e:
        print(f"Quiz Word export error: {e}")
        return jsonify({"error": str(e)}), 500

@main.route("/export-script-word", methods=["POST"])
def export_script_word():
    data = request.json
    script = data.get("script")
    if not script:
        return jsonify({"error": "No script data provided."}), 400
    try:
        doc = Document()
        doc.add_heading("Speaker Script", 0)
        if isinstance(script, str):
            for para in script.split("\n"):
                doc.add_paragraph(para)
        else:
            doc.add_paragraph(str(script))
        buf = BytesIO()
        doc.save(buf)
        buf.seek(0)
        return send_file(buf, as_attachment=True, download_name="script.docx", mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    except Exception as e:
        print(f"Script Word export error: {e}")
        return jsonify({"error": str(e)}), 500

# --- AUTH ROUTES ---
@main.route('/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({'error': 'Email and password required.'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered.'}), 400
    user = User(email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    # Create analytics row for this user (one for general usage)
    analytics = Analytics(user_id=user.id)
    db.session.add(analytics)
    db.session.commit()
    return jsonify({'message': 'Registration successful.'})

@main.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password.'}), 401
    return jsonify({'message': 'Login successful.', 'user': {'id': user.id, 'email': user.email}})

@main.route('/user/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found.'}), 404
    return jsonify({'id': user.id, 'email': user.email, 'created_at': user.created_at})

@main.route('/user/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found.'}), 404
    data = request.json
    if 'email' in data:
        user.email = data['email']
    if 'password' in data and data['password']:
        user.set_password(data['password'])
    db.session.commit()
    return jsonify({'message': 'User updated.'})

# --- ANALYTICS ROUTES ---
@main.route('/analytics/<int:user_id>', methods=['GET'])
def get_analytics(user_id):
    # Fetch general usage analytics
    analytics = Analytics.query.filter_by(user_id=user_id, month=None, topic=None).first()
    if not analytics:
        return jsonify({'error': 'No analytics found.'}), 404
    # Fetch monthly slide creation
    monthly = Analytics.query.filter_by(user_id=user_id).filter(Analytics.month != None).all()
    month_stats = {a.month: a.slides_created for a in monthly}
    # Fetch topic stats
    topics = Analytics.query.filter_by(user_id=user_id).filter(Analytics.topic != None).all()
    topic_stats = {a.topic: a.topic_count for a in topics}
    return jsonify({
        'slides_generated': analytics.slides_created,
        'quizzes_generated': analytics.quizzes_generated,
        'scripts_generated': analytics.scripts_generated,
        'last_active': analytics.last_active,
        'monthly': month_stats,
        'topics': topic_stats
    })

@main.route('/presentation/<int:presentation_id>', methods=['GET'])
def get_presentation_slides(presentation_id):
    presentation = Presentation.query.get(presentation_id)
    if not presentation or not presentation.slides_json:
        return jsonify({'error': 'Presentation not found or no slides stored.'}), 404
    try:
        import json
        slides = json.loads(presentation.slides_json)
    except Exception:
        slides = []
    return jsonify({
        'slides': slides,
        'template': presentation.template,
        'presentationType': presentation.presentation_type
    })

@main.route('/presentation/<int:presentation_id>', methods=['DELETE'])
def delete_presentation(presentation_id):
    presentation = Presentation.query.get(presentation_id)
    if not presentation:
        return jsonify({'error': 'Presentation not found.'}), 404
    db.session.delete(presentation)
    db.session.commit()
    return jsonify({'message': 'Presentation deleted.'})

# --- ANALYTICS UPDATES (to be called in slide/quiz/script generation endpoints) ---
def update_analytics_on_slide(user_id, topic=None):
    # General usage
    analytics = Analytics.query.filter_by(user_id=user_id, month=None, topic=None).first()
    if analytics:
        analytics.slides_created += 1
        analytics.last_active = datetime.utcnow()
    # Monthly
    month_str = datetime.utcnow().strftime('%Y-%m')
    monthly = Analytics.query.filter_by(user_id=user_id, month=month_str).first()
    if not monthly:
        monthly = Analytics(user_id=user_id, month=month_str, slides_created=1)
        db.session.add(monthly)
    else:
        monthly.slides_created += 1
    # Topic
    if topic:
        topic_row = Analytics.query.filter_by(user_id=user_id, topic=topic).first()
        if not topic_row:
            topic_row = Analytics(user_id=user_id, topic=topic, topic_count=1)
            db.session.add(topic_row)
        else:
            topic_row.topic_count += 1
    db.session.commit()

def update_analytics_on_quiz(user_id):
    analytics = Analytics.query.filter_by(user_id=user_id, month=None, topic=None).first()
    if analytics:
        analytics.quizzes_generated += 1
        analytics.last_active = datetime.utcnow()
        db.session.commit()

def update_analytics_on_script(user_id):
    analytics = Analytics.query.filter_by(user_id=user_id, month=None, topic=None).first()
    if analytics:
        analytics.scripts_generated += 1
        analytics.last_active = datetime.utcnow()
        db.session.commit()

@main.route('/save-presentation', methods=['POST'])
def save_presentation():
    import json
    data = request.json
    user_id = data.get('user_id')
    title = data.get('title') or 'Untitled Presentation'
    slides = data.get('slides')
    template = data.get('template')
    presentation_type = data.get('presentationType', 'Default')
    if not user_id or not slides:
        return jsonify({'error': 'Missing user_id or slides'}), 400
    try:
        slides_json = json.dumps(slides)
        presentation = Presentation(
            user_id=user_id,
            title=title,
            slides_json=slides_json,
            template=template,
            presentation_type=presentation_type
        )
        db.session.add(presentation)
        db.session.commit()
        return jsonify({'message': 'Presentation saved', 'id': presentation.id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@main.route('/templates-list', methods=['GET'])
def templates_list():
    # Return all templates as a list of dicts with id, name, description, etc.
    templates = []
    for tpl_id, tpl in TEMPLATES.items():
        templates.append({
            'id': tpl_id,
            'name': tpl.get('name', tpl_id),
            'description': tpl.get('description', ''),
            'preview': f"/images/{tpl_id}_preview.png"  # convention for preview images
        })
    return jsonify({'templates': templates})

