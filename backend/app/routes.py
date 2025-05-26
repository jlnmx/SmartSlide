import os
import re
import json
import requests
import uuid
import base64
import pandas as pd
import traceback
from app.models import db, User, Analytics, Presentation, SavedQuiz, SavedScript # Added SavedQuiz, SavedScript
from app.templates_config import TEMPLATES # Ensure this import is present
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app, send_from_directory, send_file # Added send_file
from dotenv import load_dotenv
from flask_cors import CORS
from werkzeug.utils import secure_filename
from io import BytesIO
from pptx import Presentation as PptxPresentation
from pptx.util import Pt, Inches
from pptx.dml.color import RGBColor
from PIL import Image, ImageDraw
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR, MSO_AUTO_SIZE # Ensure MSO_AUTO_SIZE is imported
from pdf2image import convert_from_path
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from google.oauth2 import service_account
from googleapiclient.discovery import build
from docx import Document # Added for Word export
from bs4 import BeautifulSoup
try:
    from youtube_transcript_api import YouTubeTranscriptApi
except ImportError:
    YouTubeTranscriptApi = None
from collections import Counter # Added import for Counter

def update_analytics_on_slide(user_id, topic=None):
    """Update analytics for a user when a slide is generated."""
    analytics = Analytics.query.filter_by(user_id=user_id).first()
    if not analytics:
        analytics = Analytics(user_id=user_id, slides_created=0, last_topic=topic)
        db.session.add(analytics)
    analytics.slides_created += 1
    if topic:
        analytics.last_topic = topic
    analytics.last_generated_at = datetime.utcnow()
    db.session.commit()

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
# CORS(main, resources={r"/*": {"origins": "http://localhost:3000"}}) # Commented out old line
CORS(main, 
    resources={r"/*": {"origins": "http://localhost:3000"}},
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    supports_credentials=True
)

@main.after_request
def after_request(response):
    # The following CORS headers are now handled by the CORS() call above for the blueprint.
    # response.headers.add("Access-Control-Allow-Origin", "*") # Handled by Flask-CORS
    # response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization") # Handled by Flask-CORS
    # response.headers.add("Access-Control-Allow-Methods", "GET,POST,OPTIONS,DELETE") # Handled by Flask-CORS
    return response

@main.route('/generate-quiz', methods=['POST', 'OPTIONS'])
def generate_quiz_route():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    data = request.json
    slides_content = data.get("slides")
    if not slides_content:
        return jsonify({"error": "No slides content provided"}), 400    # Combine slide content into a single text for the prompt
    full_text_content = ""
    for slide in slides_content:
        # Handle both editor format (textboxes) and simple format (title/content)
        title = slide.get("title") or ""
        
        # Check if this is from the slide editor (has textboxes)
        if slide.get("textboxes") and isinstance(slide["textboxes"], list):
            title_box = next((tb for tb in slide["textboxes"] if tb.get("type") == "title"), None)
            body_box = next((tb for tb in slide["textboxes"] if tb.get("type") == "body"), None)
            
            if title_box:
                title = title_box.get("text", title)
            
            content = ""
            if body_box:
                content = body_box.get("text", "")
            
            # Also collect any other textboxes that might contain content
            other_textboxes = [tb for tb in slide["textboxes"] if tb.get("type") not in ["title", "body"] and tb.get("text")]
            for tb in other_textboxes:
                if content:
                    content += "\n"
                content += tb.get("text", "")
        else:
            # Handle simple format
            content = slide.get("content", "")
            if isinstance(content, list):
                content = "\n".join(content)
            elif not isinstance(content, str):
                content = str(content)
        
        if title:
            full_text_content += f"Slide Title: {title}\n"        
        if content:
            full_text_content += f"{content}\n\n"

    if not full_text_content.strip():
        current_app.logger.error(f"No content extracted from slides. Slides data: {slides_content}")
        return jsonify({"error": "No content found in slides"}), 400

    current_app.logger.info(f"Extracted content for quiz generation: {full_text_content[:500]}...")  # Log first 500 chars

    quiz_prompt = f"""
    Based on the following presentation content, generate a quiz with 5 multiple-choice questions.
    Each question should have 4 choices and a clear answer.
    Format the output as a JSON array, where each object has "question", "choices" (an array of 4 strings), and "answer" (a string).

    Presentation Content:
    ---
    {full_text_content}
    ---

    Generate the quiz now in JSON format:
    """
    try:
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "llama3-8b-8192",
            "messages": [
                {"role": "system", "content": "You are an assistant that generates quizzes in JSON format based on provided text."},
                {"role": "user", "content": quiz_prompt}
            ],
            "max_tokens": 2048,
            "temperature": 0.5
        }
        response = requests.post(GROQ_API_URL, headers=headers, json=payload)
        response.raise_for_status()

        result = response.json()
        model_output = result["choices"][0]["message"]["content"]
        
        # Extract JSON array from the response
        match = re.search(r'\[\s*{.*}\s*\]', model_output, re.DOTALL)
        if not match:
            current_app.logger.error(f"Failed to parse quiz JSON from LLM output: {model_output}")
            return jsonify({"error": "Failed to generate valid quiz format"}), 500
        
        quiz_data = json.loads(match.group(0))
        return jsonify({"quiz": quiz_data})

    except requests.exceptions.HTTPError as http_err:
        error_details = "N/A"
        if http_err.response is not None:
            try:
                error_details = http_err.response.json()
            except ValueError:
                error_details = http_err.response.text
        current_app.logger.error(f"HTTP error during quiz generation: {http_err}. Details: {error_details}")
        return jsonify({"error": "Failed to communicate with AI service"}), 500    
    except json.JSONDecodeError as e:
        output_for_log = locals().get('model_output', 'N/A')
        current_app.logger.error(f"JSON Decode Error in quiz generation: {e}. LLM Output: {output_for_log}")
        return jsonify({"error": "Failed to parse quiz response"}), 500
    except Exception as e:
        current_app.logger.error(f"Error during quiz generation: {e}")
        traceback.print_exc()
        return jsonify({"error": "Internal server error"}), 500

@main.route('/generate-script', methods=['POST', 'OPTIONS'])
def generate_script_route():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    data = request.json
    slides_content = data.get("slides")
    if not slides_content:
        return jsonify({"error": "No slides content provided"}), 400

    # Combine slide content into a single text for the prompt
    full_text_content = ""
    for slide in slides_content:
        title = slide.get("title") or None
        if slide.get("textboxes") and isinstance(slide["textboxes"], list):
            title_box = next((tb for tb in slide["textboxes"] if tb.get("type") == "title"), None)
            body_box = next((tb for tb in slide["textboxes"] if tb.get("type") == "body"), None)
            if title_box:
                title = title_box.get("text", title or "")
            content = body_box.get("text", "") if body_box else ""
        else:
            content = slide.get("content", "")
            if isinstance(content, list):
                content = "\n".join(content)
            elif not isinstance(content, str):
                content = str(content)
        if title:
            full_text_content += f"Slide Title: {title}\n"
        if content:
            full_text_content += f"{content}\n\n"

    if not full_text_content.strip():
        return jsonify({"error": "No content found in slides"}), 400

    script_prompt = f"""
    Based on the following presentation content, generate a detailed speaker script.
    The script should elaborate on the key points of each slide, provide transitions, and suggest where to pause or emphasize.
    The output should be a single string of text.

    Presentation Content:
    ---
    {full_text_content}
    ---

    Generate the speaker script now:
    """
    try:
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "llama3-8b-8192",
            "messages": [
                {"role": "system", "content": "You are an assistant that generates speaker scripts based on provided presentation content."},
                {"role": "user", "content": script_prompt}
            ],
            "max_tokens": 3000,
            "temperature": 0.6
        }
        response = requests.post(GROQ_API_URL, headers=headers, json=payload)
        response.raise_for_status()

        result = response.json()
        script_data = result["choices"][0]["message"]["content"]
        return jsonify({"script": script_data})

    except requests.exceptions.HTTPError as http_err:
        error_details = "N/A"
        if http_err.response is not None:
            try:
                error_details = http_err.response.json()
            except ValueError:
                error_details = http_err.response.text
        current_app.logger.error(f"HTTP error during script generation: {http_err}. Details: {error_details}")
        return jsonify({"error": "Failed to communicate with AI service"}), 500
    except Exception as e:
        current_app.logger.error(f"Error during script generation: {e}")
        traceback.print_exc()
        return jsonify({"error": "Internal server error"}), 500

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

@main.route('/presentation/<int:presentation_id>', methods=['GET', 'DELETE', 'OPTIONS'])
def manage_presentation(presentation_id):
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    presentation = Presentation.query.get_or_404(presentation_id)

    if request.method == 'GET':
        try:
            slides_data = json.loads(presentation.slides_json) if presentation.slides_json else []
            return jsonify({
                'id': presentation.id,
                'title': presentation.title,
                'slides': slides_data,
                'template': presentation.template,
                'presentation_type': presentation.presentation_type,
                'created_at': presentation.created_at.isoformat()
            })
        except Exception as e:
            current_app.logger.error(f"Error retrieving presentation {presentation_id}: {e}")
            return jsonify({'error': 'Failed to retrieve presentation'}), 500

    elif request.method == 'DELETE':
        try:
            db.session.delete(presentation)
            db.session.commit()
            return jsonify({'message': 'Presentation deleted successfully'}), 200
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error deleting presentation {presentation_id}: {e}")
            return jsonify({'error': 'Failed to delete presentation'}), 500

# Route to save or update slide editor state
@main.route('/api/save-slides-state', methods=['POST', 'OPTIONS'])
def save_slides_state():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON payload"}), 400

        user_id = data.get("userId") or data.get("user_id")
        slides = data.get("slides")
        template_id = data.get("templateId") or data.get("template")
        presentation_type = data.get("presentationType", "Default")
        presentation_id = data.get("presentationId") or data.get("presentation_id")

        if not user_id or not slides or not template_id:
            return jsonify({"error": "Missing required fields (user_id, slides, template_id)"}), 400

        slides_json_str = json.dumps(slides)
        now = datetime.utcnow()        
        if presentation_id:
            # Update existing presentation
            presentation = Presentation.query.get(presentation_id)
            if not presentation:
                return jsonify({"error": "Presentation not found"}), 404
            
            # Update the title from the slides if it has changed
            if slides and isinstance(slides, list) and len(slides) > 0:
                first_slide = slides[0]
                new_title = None
                
                # Check if it's editor format (with textboxes)
                if isinstance(first_slide, dict) and 'textboxes' in first_slide:
                    title_textbox = next((tb for tb in first_slide['textboxes'] if tb.get('type') == 'title'), None)
                    if title_textbox and title_textbox.get('text'):
                        new_title = title_textbox['text']
                # Check if it's simple format (with title field)
                elif isinstance(first_slide, dict) and 'title' in first_slide:
                    new_title = first_slide['title']
                
                if new_title and new_title.strip() and new_title != "Title":
                    presentation.title = new_title.strip()
            
            presentation.slides_json = slides_json_str
            presentation.template = template_id
            presentation.presentation_type = presentation_type
            presentation.updated_at = now
            db.session.commit()
            return jsonify({"message": "Presentation updated successfully", "presentationId": presentation.id}), 200
        else:
            # Create new presentation
            title = "Untitled Presentation"
            if slides and isinstance(slides, list) and len(slides) > 0:
                first_slide = slides[0]
                
                # Check if it's editor format (with textboxes)
                if isinstance(first_slide, dict) and 'textboxes' in first_slide:
                    title_textbox = next((tb for tb in first_slide['textboxes'] if tb.get('type') == 'title'), None)
                    if title_textbox and title_textbox.get('text') and title_textbox['text'].strip() != "Title":
                        title = title_textbox['text'].strip()
                # Check if it's simple format (with title field)
                elif isinstance(first_slide, dict) and 'title' in first_slide and first_slide['title'].strip():
                    title = first_slide['title'].strip()
            
            new_presentation = Presentation(
                user_id=user_id,
                title=title,
                slides_json=slides_json_str,
                template=template_id,
                presentation_type=presentation_type,
                created_at=now,
                updated_at=now
            )
            db.session.add(new_presentation)
            db.session.commit()
            return jsonify({"message": "Presentation created successfully", "presentationId": new_presentation.id}), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error in /api/save-slides-state: {e}", exc_info=True)
        return jsonify({"error": "An error occurred while saving the presentation."}), 500

@main.route("/generate-slides", methods=["POST"])
def generate_slides():
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400

    prompt_topic = data.get("prompt")
    language = data.get("language", "English")
    user_id = data.get("user_id")  # Expect user_id from frontend
    template = data.get("template")
    try:
        num_slides = int(data.get("numSlides", 5))
        if num_slides <= 0 or num_slides > 30:
            return jsonify({"error": "Invalid Number Of Slides."}), 400
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
            "title": "Market Analysis: Renewable Energy Sector",
            "content": [
              "Overview: The renewable energy sector has experienced significant growth over the past decade, driven by technological advancements and policy support.",
              "Global investment in renewables reached $500 billion in 2023.",
              "- Major segments: Solar, Wind, and Hydropower.",
              "- Key drivers: Climate change initiatives, government incentives, and declining technology costs."
            ]
          }},
          {{
            "title": "Key Trends and Opportunities",
            "content": [
              "Decentralization: Growth of distributed energy resources and microgrids.",
              "Corporate Adoption: Increasing number of Fortune 500 companies committing to 100% renewable energy.",
              "Emerging Markets: Rapid expansion in Asia-Pacific and Latin America.",
              "Opportunity: Investment in battery storage and grid modernization."
            ]
          }},
          {{
            "title": "Challenges and Risk Factors",
            "content": [
              "Regulatory Uncertainty: Changes in government policy can impact project viability.",
              "Supply Chain Constraints: Shortages of critical materials such as lithium and rare earth elements.",
              "Market Volatility: Fluctuations in energy prices and demand.",
              "Mitigation: Diversification of supply sources and long-term contracts."
            ]
          }},
          {{
            "title": "Strategic Recommendations",
            "content": [
              "Invest in Innovation: Focus on R&D for next-generation solar and wind technologies.",
              "Partnerships: Collaborate with local governments and technology providers.",
              "Sustainability Reporting: Enhance transparency to attract ESG-focused investors.",
              "Action Item: Develop a roadmap for entering emerging markets."
            ]
          }},
          {{
            "title": "Conclusion and Next Steps",
            "content": [
              "Summary: The renewable energy sector presents robust growth opportunities, but requires careful navigation of risks.",
              "Continue monitoring policy developments.",
              "Prioritize investments in high-growth regions.",
              "Schedule follow-up meeting to review implementation plan."
            ]
          }},
          {{
            "title": "References",
            "content": [
              "1. International Energy Agency. (2023). World Energy Outlook.",
              "2. https://www.iea.org/reports/world-energy-outlook-2023",
              "3. BloombergNEF. (2023). Renewable Energy Investment Trends."
            ]
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
                slides_json=json.dumps(slides_data)
            )
            db.session.add(new_presentation)
            db.session.commit()
            # Update analytics after successful slide generation and saving
            update_analytics_on_slide(user_id, topic=prompt_topic)

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
    # Define slide and editor dimensions (in inches and pixels)
    PPTX_SLIDE_WIDTH_INCHES = 13.33
    PPTX_SLIDE_HEIGHT_INCHES = 7.5
    EDITOR_SLIDE_WIDTH_PX = 1280 # Assuming this is the canvas width in the frontend editor
    EDITOR_SLIDE_HEIGHT_PX = 720 # Assuming this is the canvas height in the frontend editor

    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400

    slides_data = data.get("slides")
    if not slides_data or not isinstance(slides_data, list):
        return jsonify({"error": "Invalid slides data"}), 400

    prs = PptxPresentation()
    prs.slide_width = Inches(PPTX_SLIDE_WIDTH_INCHES)
    prs.slide_height = Inches(PPTX_SLIDE_HEIGHT_INCHES)

    # Calculate conversion factors once
    px_to_in_x = PPTX_SLIDE_WIDTH_INCHES / EDITOR_SLIDE_WIDTH_PX
    px_to_in_y = PPTX_SLIDE_HEIGHT_INCHES / EDITOR_SLIDE_HEIGHT_PX

    # Helper function (can be outside or nested if only used here)
    def parse_span_style(style_str):
        styles = {}
        if not style_str:
            return styles
        for part in style_str.split(';'):
            if ':' in part:
                key, value = part.split(':', 1)
                key = key.strip().replace('-', '').lower()
                value = value.strip()
                styles[key] = value
        return styles

    for slide_item_data in slides_data:
        slide_layout = prs.slide_layouts[6]  # BLANK layout
        ppt_slide = prs.slides.add_slide(slide_layout)

        # Background (apply directly to slide, not zIndex sorted)
        background_data = slide_item_data.get("background", {})
        bg_fill_hex = background_data.get("fill", "#FFFFFF")
        if bg_fill_hex:
            try:
                fill = ppt_slide.background.fill
                fill.solid()
                fill.fore_color.rgb = hex_to_rgb(bg_fill_hex)
            except Exception as e:
                current_app.logger.error(f"Error setting background color: {e}", exc_info=True)


        # Collect elements to be rendered based on zIndex
        elements_to_render = []

        textboxes_data = slide_item_data.get("textboxes", [])
        for tb_data in textboxes_data:
            elements_to_render.append({
                "type": "textbox",
                "data": tb_data,
                "zIndex": int(tb_data.get("zIndex", 100)) # Default zIndex for textboxes
            })

        images_data = slide_item_data.get("images", []) # Process multiple images
        for img_data in images_data:
            elements_to_render.append({
                "type": "image",
                "data": img_data,
                "zIndex": int(img_data.get("zIndex", 101)) # Images have zIndex
            })
        
        # Sort elements by zIndex: lower zIndex elements are added first (appear "behind")
        elements_to_render.sort(key=lambda el: el["zIndex"])

        # Render elements in sorted order
        for element in elements_to_render:
            el_data = element["data"]
            el_type = element["type"]

            if el_type == "textbox":
                try:
                    x_px = float(el_data.get("x", 0))
                    y_px = float(el_data.get("y", 0))
                    width_px = float(el_data.get("width", 100))
                    height_px = float(el_data.get("height", 50))

                    left = Inches(x_px * px_to_in_x)
                    top = Inches(y_px * px_to_in_y)
                    width = Inches(width_px * px_to_in_x)
                    height = Inches(height_px * px_to_in_y)
                    
                    if width <= Inches(0) or height <= Inches(0):
                        current_app.logger.warning(f"Skipping textbox with invalid dimensions: w_px={width_px}, h_px={height_px}")
                        continue

                    shape = ppt_slide.shapes.add_textbox(left, top, width, height)
                    tf = shape.text_frame
                    tf.word_wrap = True 
                    tf.auto_size = MSO_AUTO_SIZE.NONE # Use explicit height
                    tf.margin_bottom = Inches(0.05) 
                    tf.margin_left = Inches(0.1)
                    tf.margin_right = Inches(0.1)
                    tf.margin_top = Inches(0.05)
                    tf.clear()

                    text_content = el_data.get("text", "")
                    default_font_family = el_data.get("fontFamily", "Arial")
                    default_font_size_pt = float(el_data.get("fontSize", 18))
                    default_font_color_hex = el_data.get("fill", "#000000")
                    default_font_color_rgb = hex_to_rgb(default_font_color_hex)
                    
                    default_font_style_data = el_data.get("fontStyle", {})
                    default_bold = default_font_style_data.get("bold", False)
                    default_italic = default_font_style_data.get("italic", False)
                    default_underline = default_font_style_data.get("underline", False)
                    
                    default_align_str = el_data.get("align", "left").upper()
                    align_map = {
                        "LEFT": PP_ALIGN.LEFT, "CENTER": PP_ALIGN.CENTER,
                        "RIGHT": PP_ALIGN.RIGHT, "JUSTIFY": PP_ALIGN.JUSTIFY,
                    }
                    default_alignment = align_map.get(default_align_str, PP_ALIGN.LEFT)
                    
                    default_line_height_multiplier = el_data.get("lineHeight") # e.g., 1, 1.15, 1.5
                    default_paragraph_spacing_pt = float(el_data.get("paragraphSpacing", 0))
                    is_bulleted = el_data.get("bullets", False)

                    paragraphs_text = text_content.split('\\\\n') # Split by literal \\n from JSON
                    
                    if not paragraphs_text and not text_content.strip(): # Handle completely empty textbox or textbox with only whitespace
                        p = tf.add_paragraph()
                        run = p.add_run()
                        run.text = " " # Add a space to make it selectable and visible if it has dimensions
                        run.font.size = Pt(1)
                        continue # Move to next element

                    for para_idx, para_text_html in enumerate(paragraphs_text):
                        p = tf.add_paragraph()
                        p.alignment = default_alignment
                        if default_line_height_multiplier and isinstance(default_line_height_multiplier, (int, float)):
                            try:
                                p.line_spacing = float(default_line_height_multiplier)
                            except ValueError:
                                current_app.logger.warning(f"Invalid line height value: {default_line_height_multiplier}")
                        
                        if para_idx > 0 and default_paragraph_spacing_pt > 0:
                             p.space_before = Pt(default_paragraph_spacing_pt)
                        
                        if is_bulleted and para_text_html.strip(): # Add bullet only if line has content
                            p.level = 0

                        # Parse HTML-like content (spans) for rich text
                        # Replace &nbsp; with space for BeautifulSoup processing
                        soup = BeautifulSoup(f"<div>{para_text_html.replace('&nbsp;', ' ')}</div>", "html.parser")
                        
                        if not soup.div.contents: # Handle paragraph that becomes empty after parsing (e.g. only &nbsp;)
                            if is_bulleted: # If it was supposed to be a bullet, keep the paragraph for the bullet point
                                pass # The paragraph is already added, bullet will show if level is set
                            elif len(paragraphs_text) > 1 or para_text_html: # Preserve empty line if it's not a truly empty single-line textbox
                                run = p.add_run()
                                run.text = " " # Add a space to make the line take height
                            continue # Next content_node or next paragraph

                        for content_node in soup.div.contents:
                            run = p.add_run()
                            text_to_add = ""
                            
                            run_font_family = default_font_family
                            run_font_size_pt = default_font_size_pt
                            run_font_color_rgb = default_font_color_rgb
                            run_bold = default_bold
                            run_italic = default_italic
                            run_underline = default_underline

                            if content_node.name == 'span':
                                text_to_add = content_node.get_text()
                                span_style_str = content_node.get('style', '')
                                span_styles = parse_span_style(span_style_str)
                                
                                if 'fontfamily' in span_styles: run_font_family = span_styles['fontfamily']
                                if 'fontsize' in span_styles:
                                    try: run_font_size_pt = float(str(span_styles['fontsize']).replace('pt','').replace('px',''))
                                    except ValueError: pass
                                if 'color' in span_styles: 
                                    try: run_font_color_rgb = hex_to_rgb(span_styles['color'])
                                    except: pass # Ignore invalid color
                                if 'bold' in span_styles: run_bold = str(span_styles['bold']).lower() == 'true'
                                if 'italic' in span_styles: run_italic = str(span_styles['italic']).lower() == 'true'
                                if 'underline' in span_styles: run_underline = str(span_styles['underline']).lower() == 'true'
                            
                            elif content_node.name is None: # Plain text node
                                text_to_add = str(content_node)
                            
                            if text_to_add:
                                run.text = text_to_add
                                run.font.name = run_font_family
                                run.font.size = Pt(run_font_size_pt)
                                if run_font_color_rgb: run.font.color.rgb = run_font_color_rgb
                                run.font.bold = run_bold
                                run.font.italic = run_italic
                                run.font.underline = run_underline
                        
                        if not p.runs and not (is_bulleted and para_text_html.strip()): 
                             if len(paragraphs_text) > 1 or para_text_html: 
                                 run = p.add_run()
                                 run.text = " " 

                    if not tf.paragraphs: # Final check if textbox ended up with no paragraphs at all
                        p = tf.add_paragraph()
                        run = p.add_run()
                        run.text = " " 
                        run.font.size = Pt(1)
                except Exception as e:
                    tb_id_log = "Unknown Textbox"
                    if isinstance(el_data, dict):
                        tb_id_log = el_data.get('id', 'N/A')
                    current_app.logger.error(f"Error processing textbox: {tb_id_log}. Error: {e}", exc_info=True)

            elif el_type == "image":
                try:
                    img_src_base64 = el_data.get("src")
                    if img_src_base64 and img_src_base64.startswith('data:image'):
                        header, encoded = img_src_base64.split(',', 1)
                        img_bytes = base64.b64decode(encoded)
                        img_stream = BytesIO(img_bytes)

                        img_x_px = float(el_data.get("x", 0))
                        img_y_px = float(el_data.get("y", 0))
                        img_width_px = float(el_data.get("width", 100))
                        img_height_px = float(el_data.get("height", 100))
                        
                        if img_width_px <= 0 or img_height_px <= 0:
                            current_app.logger.warning(f"Skipping image with zero/negative pixel dimensions: w={img_width_px}, h={img_height_px}")
                            continue

                        img_left = Inches(img_x_px * px_to_in_x)
                        img_top = Inches(img_y_px * px_to_in_y)
                        img_width = Inches(img_width_px * px_to_in_x)
                        img_height = Inches(img_height_px * px_to_in_y)
                        
                        if img_width <= Inches(0) or img_height <= Inches(0):
                            current_app.logger.warning(f"Skipping image with zero/negative inch dimensions after conversion: w_in={img_width}, h_in={img_height}")
                            continue

                        ppt_slide.shapes.add_picture(img_stream, img_left, img_top, width=img_width, height=img_height)
                except Exception as e:
                    img_id_log = "Unknown Image"
                    if isinstance(el_data, dict):
                        img_id_log = el_data.get('id', 'N/A')
                    current_app.logger.error(f"Error processing image: {img_id_log}. Error: {e}", exc_info=True)

    file_stream = BytesIO()
    prs.save(file_stream)
    file_stream.seek(0)

    return send_file(
        file_stream,
        as_attachment=True,
        download_name="smartslide_presentation.pptx", # Changed name slightly
        mimetype="application/vnd.openxmlformats-officedocument.presentationml.presentation"
    )
    
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def hex_to_rgb(hex_color):
    """Convert hex color string (e.g. '#FF00AA' or 'FF00AA') to RGBColor tuple."""
    hex_color = hex_color.lstrip('#')
    if len(hex_color) == 6:
        r, g, b = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
        return RGBColor(r, g, b)
    elif len(hex_color) == 3:
        r, g, b = tuple(int(hex_color[i]*2, 16) for i in range(3))
        return RGBColor(r, g, b)
    else:
        # fallback to black
        return RGBColor(0, 0, 0)

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

        # --- Use LLM to structure slides ---
        prompt = f"""
        You are an expert presentation assistant.
        Given the following extracted document content, generate a well-structured, professional presentation as a JSON array.
        - The first slide should have a clear, relevant title based on the topic: \"{topic}\".
        - Each slide must have a concise, informative title (do NOT use generic titles like "Slide 1").
        - Divide the content logically across slides (introduction, main points, analysis, recommendations, summary, etc.).
        - Use bullet points or short paragraphs for slide content.
        - Use Markdown for formatting: **bold** for emphasis, *italic* for highlights, and __underline__ for key terms.
        - Ensure the content is detailed, precise, and suitable for a business, academic, or formal audience.
        - The last slide should be titled "References" and include a list of references, sources, or further reading if available from the document content.
        - Output format: a JSON array, where each object has:
            - "title": string (slide title)
            - "content": array of strings (each string is a bullet point or paragraph, use Markdown)
        - Do NOT include any text before or after the JSON array.

        Example:
        [
          {{
            "title": "Market Analysis: Renewable Energy Sector",
            "content": [
              "Overview: The renewable energy sector has experienced significant growth over the past decade, driven by technological advancements and policy support.",
              "Global investment in renewables reached $500 billion in 2023.",
              "- Major segments: Solar, Wind, and Hydropower.",
              "- Key drivers: Climate change initiatives, government incentives, and declining technology costs."
            ]
          }},
          {{
            "title": "Key Trends and Opportunities",
            "content": [
              "Decentralization: Growth of distributed energy resources and microgrids.",
              "Corporate Adoption: Increasing number of Fortune 500 companies committing to 100% renewable energy.",
              "Emerging Markets: Rapid expansion in Asia-Pacific and Latin America.",
              "Opportunity: Investment in battery storage and grid modernization."
            ]
          }},
          {{
            "title": "Challenges and Risk Factors",
            "content": [
              "Regulatory Uncertainty: Changes in government policy can impact project viability.",
              "Supply Chain Constraints: Shortages of critical materials such as lithium and rare earth elements.",
              "Market Volatility: Fluctuations in energy prices and demand.",
              "Mitigation: Diversification of supply sources and long-term contracts."
            ]
          }},
          {{
            "title": "Strategic Recommendations",
            "content": [
              "Invest in Innovation: Focus on R&D for next-generation solar and wind technologies.",
              "Partnerships: Collaborate with local governments and technology providers.",
              "Sustainability Reporting: Enhance transparency to attract ESG-focused investors.",
              "Action Item: Develop a roadmap for entering emerging markets."
            ]
          }},
          {{
            "title": "Conclusion and Next Steps",
            "content": [
              "Summary: The renewable energy sector presents robust growth opportunities, but requires careful navigation of risks.",
              "Continue monitoring policy developments.",
              "Prioritize investments in high-growth regions.",
              "Schedule follow-up meeting to review implementation plan."
            ]
          }},
          {{
            "title": "References",
            "content": [
              "1. International Energy Agency. (2023). World Energy Outlook.",
              "2. https://www.iea.org/reports/world-energy-outlook-2023",
              "3. BloombergNEF. (2023). Renewable Energy Investment Trends."
            ]
          }}
        ]

        Document content:
        ---
        {text}
        ---
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
            return jsonify({'error': 'Failed to generate slides from file.'}), 500

        result = response.json()
        model_output = result["choices"][0]["message"]["content"]

        # Extract JSON array from the response
        match = re.search(r'\[\s*{.*}\s*\]', model_output, re.DOTALL)
        if not match:
            return jsonify({'error': 'Failed to parse slides output.'}), 500
        slides = json.loads(match.group(0))

        if not slides:
            return jsonify({'error': 'Could not extract slides from file.'}), 400

        # Update analytics if user_id is provided
        user_id = request.form.get("user_id")
        if user_id:
            update_analytics_on_slide(user_id, topic=topic)

        return jsonify({'slides': slides})
    except Exception as e:
        return jsonify({'error': f'Failed to process file: {str(e)}'}), 500
    


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
        # Preflight request will be handled by Flask-CORS and the after_request hook
        return jsonify({"message": "CORS preflight acknowledged"}), 200

    if request.method == "POST":
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "Invalid JSON payload"}), 400

            text_input = data.get("text")
            user_id = data.get("user_id")
            template_id = data.get("template") # Ensure this line is present and uncommented

            if not text_input:
                return jsonify({"error": "No text provided"}), 400

            if not GROQ_API_KEY:
                current_app.logger.error("GROQ_API_KEY is not configured.")
                return jsonify({"error": "Server configuration error: Missing API key"}), 500
            
            if not GROQ_API_URL:
                current_app.logger.error("GROQ_API_URL is not configured.")
                return jsonify({"error": "Server configuration error: Missing API URL"}), 500

            headers = {
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            }
            
            system_prompt = (
                "You are an expert in structuring text content into presentation slides. "
                "Each slide in the presentation must have a 'title' (a string) and 'content' "
                "(a list of strings, where each string represents a paragraph or a bullet point). "
                "The entire output must be a valid JSON list of these slide objects, or a JSON object with a 'slides' key containing the list. "
                "Do NOT use emojis, special unicode, or non-ASCII characters. Use only plain English text and standard punctuation. "
                "Do not include any introductory text, explanations, or markdown formatting around the JSON itself."
            )
            user_prompt_content = f"Text to process:\n---\n{text_input}\n---\n\nDo NOT use emojis, special unicode, or non-ASCII characters. Use only plain English text and standard punctuation."

            payload = {
                "model": "llama3-8b-8192",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt_content}
                ],
                "temperature": 0.5,
                "max_tokens": 3000, # Adjusted to be within typical limits for llama3-8b if necessary, though 3000 is usually fine.
                "response_format": {"type": "json_object"}
            }

            api_response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=120)
            api_response.raise_for_status()

            llm_response_data = api_response.json()
            
            if not (llm_response_data.get("choices") and 
                    len(llm_response_data["choices"]) > 0 and
                    llm_response_data["choices"][0].get("message") and
                    llm_response_data["choices"][0]["message"].get("content")):
                current_app.logger.error(f"Unexpected LLM response structure: {llm_response_data}")
                return jsonify({"error": "Failed to parse slides from LLM response (incomplete structure)"}), 500

            json_string_from_llm = llm_response_data["choices"][0]["message"]["content"]

            if not isinstance(json_string_from_llm, str):
                current_app.logger.error(f"LLM response content is not a string as expected. Type: {type(json_string_from_llm)}. Content: {json_string_from_llm}")
                return jsonify({"error": "Invalid data type for slide content from LLM"}), 500
            
            try:
                # Try strict JSON parsing first
                parsed_llm_response_object = json.loads(json_string_from_llm)
                slides = None
                if isinstance(parsed_llm_response_object, dict):
                    if 'slides' in parsed_llm_response_object and isinstance(parsed_llm_response_object['slides'], list):
                        slides = parsed_llm_response_object['slides']
                    else:
                        for key, value in parsed_llm_response_object.items():
                            if isinstance(value, list):
                                if not value or isinstance(value[0], dict):
                                    slides = value
                                    current_app.logger.info(f"Extracted slides from key '{key}' in LLM response object.")
                                    break
                elif isinstance(parsed_llm_response_object, list):
                    slides = parsed_llm_response_object
                    current_app.logger.warning("LLM response was a direct list despite json_object format request.")
                if slides is None:
                    raise ValueError("No slides list found in JSON object")
            except Exception as je:
                # Fallback: try to extract a JSON array from the string using regex (like /upload-file)
                import re
                current_app.logger.warning(f"Strict JSON parse failed, attempting regex fallback. Error: {je}")
                match = re.search(r'\[\s*{.*?}\s*\]', json_string_from_llm, re.DOTALL)
                if not match:
                    current_app.logger.error(f"Regex fallback failed to find JSON array in LLM output: {json_string_from_llm[:500]}")
                    return jsonify({"error": "Failed to parse slides output from LLM."}), 500
                try:
                    slides = json.loads(match.group(0))
                except Exception as e2:
                    current_app.logger.error(f"Regex fallback found array but failed to parse JSON: {e2}. Content: {match.group(0)[:500]}")
                    return jsonify({"error": "Failed to decode slides JSON from LLM output."}), 500

            # Validate structure of each slide
            if not isinstance(slides, list): # Should be redundant now, but as a final safeguard.
                current_app.logger.error(f"Slides variable is not a list after extraction logic. Type: {type(slides)}. Value: {slides}")
                return jsonify({"error": "Internal error processing slide data format."}), 500

            for i, s_item in enumerate(slides):
                if not (isinstance(s_item, dict) and 
                        "title" in s_item and isinstance(s_item.get("title"), str) and
                        "content" in s_item and isinstance(s_item.get("content"), list) and
                        all(isinstance(c_item, str) for c_item in s_item.get("content"))):
                    current_app.logger.error(f"LLM generated invalid slide structure at index {i}: {s_item}")
                    return jsonify({"error": "LLM generated invalid slide data structure (title/content fields or content list/items missing/invalid)"}), 500
            
            # Save presentation to database
            if slides:
                presentation_title = slides[0].get("title") if slides and slides[0].get("title") else "Pasted Content"
                slides_json_str = json.dumps(slides)

                new_presentation = Presentation(
                    user_id=user_id if user_id else None,
                    title=presentation_title,
                    slides_json=slides_json_str,
                    template=template_id, # Changed from template_id to template
                    presentation_type="Pasted" # Default presentation_type for pasted content
                )
                db.session.add(new_presentation)
                db.session.commit()
                current_app.logger.info(f"Saved new presentation from paste-and-create: ID {new_presentation.id}, Title: {presentation_title}, UserID: {user_id}, TemplateID: {template_id}")
            
            if user_id:
                topic = slides[0].get("title", "Pasted Content") if slides else "Pasted Content"
                update_analytics_on_slide(user_id, topic=topic)

            return jsonify({"slides": slides, "result": f"Generated {len(slides)} slides."}), 200

        except requests.exceptions.HTTPError as http_err:
            error_details = "N/A"
            if http_err.response is not None:
                try:
                    error_details = http_err.response.json() # Try to get JSON error from Groq
                except ValueError:
                    error_details = http_err.response.text # Fallback to text
            current_app.logger.error(f"HTTP error occurred while calling Groq API: {http_err}. Status: {http_err.response.status_code if http_err.response is not None else 'Unknown'}. Details: {error_details}")
            return jsonify({"error": f"Failed to communicate with LLM service"}), getattr(http_err.response, 'status_code', 502)
        except requests.exceptions.RequestException as req_err:
            current_app.logger.error(f"Request error occurred while calling Groq API: {req_err}")
            return jsonify({"error": "Network error while communicating with LLM service"}), 503
        except json.JSONDecodeError as json_err: # If api_response.json() fails
            current_app.logger.error(f"Failed to decode JSON response from Groq API: {json_err}. Response text: {api_response.text[:500] if api_response else 'N/A'}")
            return jsonify({"error": "Invalid response from LLM service"}), 502
        except Exception as e:
            current_app.logger.error(f"An unexpected error occurred in /paste-and-create: {e}", exc_info=True)
            return jsonify({"error": "An internal server error occurred"}), 500
    
    return jsonify({"error": "Method not allowed"}), 405

@main.route("/templates-list", methods=["GET"])
def templates_list():
    try:
        # Transform the TEMPLATES dictionary into a list of objects,
        # adding the key as an 'id' field in each object.
        formatted_templates = []
        for template_id, template_data in TEMPLATES.items():
            formatted_templates.append({
                "id": template_id,
                "name": template_data.get("name"),
                "description": template_data.get("description"),
                "preview": template_data.get("preview") # Assuming you might add a preview image path later
                # Add any other fields the frontend might need, like 'title' if it's different from 'name'
            })
        return jsonify({"templates": formatted_templates})
    except Exception as e:
        current_app.logger.error(f"Error in /templates-list: {e}")
        return jsonify({"error": "Could not retrieve templates"}), 500

@main.route('/register', methods=['POST', 'OPTIONS'])
def register():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200  # Handle preflight
    
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"error": "Email and password are required"}), 400

    email = data['email']
    password = data['password']

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email address already registered"}), 409

    new_user = User(email=email)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    # Initialize analytics for the new user
    new_analytics = Analytics(user_id=new_user.id, slides_created=0) # Ensure Analytics is imported
    db.session.add(new_analytics)
    db.session.commit()

    return jsonify({"message": "User registered successfully", "user": {"id": new_user.id, "email": new_user.email}}), 201

@main.route('/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200  # Handle preflight

    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"error": "Email and password are required"}), 400

    email = data['email']
    password = data['password']
    user = User.query.filter_by(email=email).first()

    if user and user.check_password(password):
        # Update last_active for analytics
        analytics = Analytics.query.filter_by(user_id=user.id).first()
        if analytics:
            analytics.last_active = datetime.utcnow()
            db.session.commit()
        else:
            # Should not happen if analytics are created on registration, but as a safeguard:
            new_analytics = Analytics(user_id=user.id, last_active=datetime.utcnow())
            db.session.add(new_analytics)
            db.session.commit()
            current_app.logger.warning(f"Analytics record created for user {user.id} at login as it was missing.")

        return jsonify({"message": "Login successful", "user": {"id": user.id, "email": user.email}}), 200
    
    return jsonify({"error": "Invalid email or password"}), 401

@main.route('/user/<int:user_id>', methods=['GET', 'PUT', 'OPTIONS'])
def manage_user_profile(user_id):
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200 # Handle CORS preflight

    user = User.query.get_or_404(user_id)

    if request.method == 'GET':
        return jsonify({
            'id': user.id,
            'email': user.email
            # Add other user details here if needed in the future
        }), 200

    if request.method == 'PUT':
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid JSON payload'}), 400

        # Update email if provided and different
        if 'email' in data and data['email'] != user.email:
            # Optional: Check if the new email is already taken by another user
            existing_user_with_new_email = User.query.filter(User.email == data['email'], User.id != user.id).first()
            if existing_user_with_new_email:
                return jsonify({'error': 'New email address is already in use'}), 409
            user.email = data['email']
            current_app.logger.info(f'User {user_id} email updated to {data["email"]}')

        # Update password if provided
        if 'password' in data and data['password']:
            user.set_password(data['password'])
            current_app.logger.info(f'User {user_id} password updated.')
        
        try:
            db.session.commit()
            return jsonify({'message': 'User profile updated successfully', 'user': {'id': user.id, 'email': user.email}}), 200
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f'Error updating user {user_id} profile: {e}')
            return jsonify({'error': 'Failed to update user profile'}), 500

@main.route('/analytics/<int:user_id>', methods=['GET', 'OPTIONS'])
def get_user_analytics(user_id):
    if request.method == 'OPTIONS':
        # Preflight request. Reply successfully:
        return jsonify({'status': 'ok'}), 200

    # Check if user exists
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    analytics_record = Analytics.query.filter_by(user_id=user_id).first()
    presentations = Presentation.query.filter_by(user_id=user_id).all()

    # Slides created over time (monthly)
    monthly_slides_counter = Counter()
    if presentations:
        for p in presentations:
            if p.created_at:
                month_year = p.created_at.strftime('%Y-%m')
                monthly_slides_counter[month_year] += 1
    
    # Most common topics (using presentation titles)
    topic_counts_counter = Counter()
    if presentations:
        for p in presentations:
            if p.title: # Assuming title is the topic
                topic_counts_counter[p.title.lower()] += 1
    
    # Prepare summary data
    slides_generated = analytics_record.slides_created if analytics_record and analytics_record.slides_created is not None else 0
    # Always count actual saved quizzes/scripts for analytics
    quizzes_generated = SavedQuiz.query.filter_by(user_id=user_id).count()
    scripts_generated = SavedScript.query.filter_by(user_id=user_id).count()
    last_active_iso = analytics_record.last_active.isoformat() if analytics_record and analytics_record.last_active else None

    return jsonify({
        "monthly": dict(monthly_slides_counter),
        "topics": dict(topic_counts_counter),
        "slides_generated": slides_generated,
        "quizzes_generated": quizzes_generated,
        "scripts_generated": scripts_generated,
        "last_active": last_active_iso
    }), 200

# Ensure this new route is defined before any potential catch-all routes or error handlers, if any.
# If there's a specific place where new routes are usually added, it should go there.
# For now, adding it at the end of the file before any app.run() or similar global statements.

# Routes for Saved Quizzes and Scripts

@main.route('/save-quiz', methods=['POST', 'OPTIONS'])
def save_quiz():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    data = request.json
    user_id = data.get('user_id')
    name = data.get('name')
    content = data.get('content')
    if not all([user_id, name, content]):
        return jsonify({"error": "Missing data for saving quiz"}), 400
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    try:
        new_quiz = SavedQuiz(user_id=user_id, name=name, content=content)
        db.session.add(new_quiz)
        analytics = Analytics.query.filter_by(user_id=user_id).first()
        if analytics:
            analytics.quizzes_generated = (analytics.quizzes_generated or 0) + 1
            analytics.last_active = datetime.utcnow()
        db.session.commit()
        return jsonify({"message": "Quiz saved successfully", "quiz_id": new_quiz.id}), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error saving quiz: {e}")
        return jsonify({"error": "Failed to save quiz"}), 500

@main.route('/save-script', methods=['POST', 'OPTIONS'])
def save_script():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    data = request.json
    user_id = data.get('user_id')
    name = data.get('name')
    content = data.get('content')
    if not all([user_id, name, content]):
        return jsonify({"error": "Missing data for saving script"}), 400
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    try:
        new_script = SavedScript(user_id=user_id, name=name, content=content)
        db.session.add(new_script)
        analytics = Analytics.query.filter_by(user_id=user_id).first()
        if analytics:
            analytics.scripts_generated = (analytics.scripts_generated or 0) + 1
            analytics.last_active = datetime.utcnow()
        db.session.commit()
        return jsonify({"message": "Script saved successfully", "script_id": new_script.id}), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error saving script: {e}")
        return jsonify({"error": "Failed to save script"}), 500

@main.route('/saved-items/<int:user_id>', methods=['GET', 'OPTIONS'])
def get_saved_items(user_id):
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    quizzes = SavedQuiz.query.filter_by(user_id=user_id).order_by(SavedQuiz.created_at.desc()).all()
    scripts = SavedScript.query.filter_by(user_id=user_id).order_by(SavedScript.created_at.desc()).all()

    return jsonify({
        "quizzes": [{"id": q.id, "name": q.name, "created_at": q.created_at.isoformat()} for q in quizzes],
        "scripts": [{"id": s.id, "name": s.name, "created_at": s.created_at.isoformat()} for s in scripts]
    }), 200

@main.route('/saved-quiz/<int:quiz_id>', methods=['DELETE', 'OPTIONS'])
def delete_saved_quiz(quiz_id):
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    quiz = SavedQuiz.query.get(quiz_id)
    if not quiz:
        return jsonify({"error": "Quiz not found"}), 404
    
    # Optional: Check if the user owns this quiz before deleting
    # For simplicity, direct deletion is implemented here.
    try:
        db.session.delete(quiz)
        db.session.commit()
        return jsonify({"message": "Quiz deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting quiz: {e}")
        return jsonify({"error": "Failed to delete quiz"}), 500

@main.route('/saved-script/<int:script_id>', methods=['DELETE', 'OPTIONS'])
def delete_saved_script(script_id):
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    script = SavedScript.query.get(script_id)
    if not script:
        return jsonify({"error": "Script not found"}), 404

    try:
        db.session.delete(script)
        db.session.commit()
        return jsonify({"message": "Script deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()        
        current_app.logger.error(f"Error deleting script: {e}")
        return jsonify({"error": "Failed to delete script"}), 500

@main.route('/export-quiz-word', methods=['POST', 'OPTIONS'])
def export_quiz_word_direct():
    """Export quiz data directly to Word document (frontend expects this endpoint)"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    try:
        data = request.get_json()
        if not data or 'quiz' not in data:
            return jsonify({"error": "Quiz data is required"}), 400

        quiz_data = data['quiz']
        if not isinstance(quiz_data, list):
            return jsonify({"error": "Invalid quiz format"}), 400

        doc = Document()
        doc.add_heading("Generated Quiz", level=1)
        doc.add_paragraph(f"Generated on: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}")
        doc.add_paragraph()  # Spacer

        for i, item in enumerate(quiz_data, 1):
            doc.add_heading(f"Question {i}: {item.get('question', 'N/A')}", level=2)
            
            choices = item.get('choices', [])
            if choices:
                for choice_idx, choice in enumerate(choices):
                    doc.add_paragraph(f"{chr(97 + choice_idx)}) {choice}", style='ListBullet')  # a), b), c), d)
            
            doc.add_paragraph(f"Answer: {item.get('answer', 'N/A')}")
            doc.add_paragraph()  # Spacer

        file_stream = BytesIO()
        doc.save(file_stream)
        file_stream.seek(0)
        
        return send_file(
            file_stream,
            as_attachment=True,
            download_name="generated_quiz.docx",
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
    except Exception as e:
        current_app.logger.error(f"Error exporting quiz to Word: {e}")
        return jsonify({"error": "Failed to export quiz"}), 500

@main.route('/export-script-word', methods=['POST', 'OPTIONS'])
def export_script_word_direct():
    """Export script data directly to Word document (frontend expects this endpoint)"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    try:
        data = request.get_json()
        if not data or 'script' not in data:
            return jsonify({"error": "Script data is required"}), 400

        script_content = data['script']
        if not isinstance(script_content, str):
            return jsonify({"error": "Invalid script format"}), 400

        doc = Document()
        doc.add_heading("Generated Presentation Script", level=1)
        doc.add_paragraph(f"Generated on: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}")
        doc.add_paragraph()  # Spacer
        
        # Add script content
        doc.add_paragraph(script_content)

        file_stream = BytesIO()
        doc.save(file_stream)
        file_stream.seek(0)

        return send_file(
            file_stream,
            as_attachment=True,
            download_name="generated_script.docx",
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
    except Exception as e:
        current_app.logger.error(f"Error exporting script to Word: {e}")
        return jsonify({"error": "Failed to export script"}), 500

@main.route('/export-quiz/<int:quiz_id>/word', methods=['GET', 'OPTIONS'])
def export_quiz_word(quiz_id):
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    quiz = SavedQuiz.query.get(quiz_id)
    if not quiz:
        return jsonify({"error": "Quiz not found"}), 404

    try:
        quiz_data = json.loads(quiz.content) # Content is stored as JSON string
        doc = Document()
        doc.add_heading(quiz.name, level=1)
        doc.add_paragraph(f"Generated on: {quiz.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
        doc.add_paragraph() # Spacer

        for i, item in enumerate(quiz_data, 1):
            doc.add_heading(f"Question {i}: {item.get('question', 'N/A')}", level=2)
            
            choices = item.get('choices', [])
            if choices:
                for choice_idx, choice in enumerate(choices):
                    doc.add_paragraph(f"{chr(97 + choice_idx)}) {choice}", style='ListBullet') # a), b), c), d)
            
            doc.add_paragraph(f"Answer: {item.get('answer', 'N/A')}")
            doc.add_paragraph() # Spacer

        file_stream = BytesIO()
        doc.save(file_stream)
        file_stream.seek(0)
        
        return send_file(
            file_stream,
            as_attachment=True,
            download_name=f"{secure_filename(quiz.name)}.docx",
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
    except json.JSONDecodeError:
        return jsonify({"error": "Invalid quiz content format"}), 500
    except Exception as e:
        current_app.logger.error(f"Error exporting quiz to Word: {e}")
        return jsonify({"error": "Failed to export quiz"}), 500

@main.route('/export-script/<int:script_id>/word', methods=['GET', 'OPTIONS'])
def export_script_word(script_id):
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    script = SavedScript.query.get(script_id)
    if not script:
        return jsonify({"error": "Script not found"}), 404

    try:
        doc = Document()
        doc.add_heading(script.name, level=1)
        doc.add_paragraph(f"Generated on: {script.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
        doc.add_paragraph() # Spacer
        
        # Add script content - assuming it's plain text
        doc.add_paragraph(script.content)

        file_stream = BytesIO()
        doc.save(file_stream)
        file_stream.seek(0)

        return send_file(
            file_stream,
            as_attachment=True,
            download_name=f"{secure_filename(script.name)}.docx",
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
    except Exception as e:
        current_app.logger.error(f"Error exporting script to Word: {e}")
        return jsonify({"error": "Failed to export script"}), 500

@main.route('/save-presentation', methods=['POST', 'OPTIONS'])
def save_presentation():
    if request.method == 'OPTIONS':
        # Handle preflight request
        return jsonify({"message": "CORS preflight acknowledged"}), 200

    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON payload"}), 400

        user_id = data.get("user_id")
        title = data.get("title")
        slides = data.get("slides") # This is the raw slide data from older system
        template = data.get("template")
        presentation_type = data.get("presentationType", "Default") # Matches frontend key

        if not user_id or not title or not slides or not template:
            return jsonify({"error": "Missing required fields (user_id, title, slides, template)"}), 400
        
        # This route is likely for a simpler save mechanism, not the full editor state.
        # The /api/save-slides-state is for the detailed editor state.
        # We'll assume 'slides' here is a simpler structure if this route is still in use.
        # For robust storage, it should also be JSON.
        slides_json_str = json.dumps(slides)


        new_presentation = Presentation(
            user_id=user_id,
            title=title,
            slides_json=slides_json_str, # Storing the provided slides data as JSON
            template=template,
            presentation_type=presentation_type,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.session.add(new_presentation)
        db.session.commit()
        current_app.logger.info(f"Presentation '{title}' (ID: {new_presentation.id}) saved for user {user_id} via /save-presentation route.")
        return jsonify({"message": "Presentation saved successfully", "presentation_id": new_presentation.id}), 201 # 201 for created

    except Exception as e:
        db.session.rollback() # Rollback in case of error during commit
        current_app.logger.error(f"Error in /save-presentation: {e}", exc_info=True)
        return jsonify({"error": "An error occurred while saving the presentation."}), 500

