import os
import requests  
import json
import subprocess
import fitz 
import uuid
from datetime import datetime
from flask import Blueprint, jsonify, request, send_file, send_from_directory
from dotenv import load_dotenv
from flask_cors import CORS
from werkzeug.utils import secure_filename
from pptx import Presentation
from pptx.util import Inches, Pt
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
GOOGLE_CREDENTIALS_FILE = "D:/Codes/CAPSTONE/backend/credentials.json"  
SCOPES = ["https://www.googleapis.com/auth/presentations", "https://www.googleapis.com/auth/drive.file"]
ALLOWED_EXTENSIONS = {'pdf', 'xlsx', 'xls', 'csv', 'docx'}
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_API_KEY = "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"  # For production, use os.environ.get("GROQ_API_KEY")

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
        return jsonify({"error": "Invalid number of slides specified."}), 400

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

def generate_image_replicate(prompt):
    """
    Calls Replicate API to generate an image from a prompt.
    Returns the image URL or None.
    """
    import time
    REPLICATE_API_TOKEN = os.environ.get("REPLICATE_API_TOKEN")  # Fetch token from .env
    if not REPLICATE_API_TOKEN:
        print("Error: REPLICATE_API_TOKEN is not set in the environment.")
        return None

    # Use a valid SDXL version string from Replicate
    model_version = "fdcf65a5b427c3c6b9b7d6c8b7c3c6b9b7d6c8b7c3c6b9b7d6c8b7c3c6b9b7"  # Example version
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

@main.route("/generate-presentation", methods=["POST"])
def generate_presentation():
    try:
        data = request.json
        slides = data.get("slides")
        if not slides or not isinstance(slides, list):
            return jsonify({"error": "Invalid slides data."}), 400

        # Generate Markdown content from slides
        markdown_content = "---\nmarp: true\npaginate: true\nsize: 16:9\n---\n\n"
        for slide in slides:
            markdown_content += f"# {slide['title']}\n\n"
            if isinstance(slide['content'], list):
                markdown_content += "\n".join(slide['content']) + "\n\n"
            else:
                markdown_content += slide['content'] + "\n\n"
            markdown_content += "---\n\n"

        # Create a unique filename for the Markdown file
        slides_folder = os.path.join(os.getcwd(), "slides")
        os.makedirs(slides_folder, exist_ok=True)  # Ensure the slides folder exists
        unique_filename = f"presentation_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
        markdown_file = os.path.join(slides_folder, f"{unique_filename}.md")

        # Save Markdown to a file
        with open(markdown_file, "w", encoding="utf-8") as f:
            f.write(markdown_content)

        # Use Marp CLI to generate PDF
        pdf_file = markdown_file.replace(".md", ".pdf")
        marp_executable = "C:\\Users\\saban\\AppData\\Roaming\\npm\\marp.cmd"  # Full path to marp.cmd
        subprocess.run([marp_executable, markdown_file, "--pdf", "-o", pdf_file], check=True, stdin=subprocess.DEVNULL)

        # Convert PDF to PPTX with editable content
        pptx_file = markdown_file.replace(".md", ".pptx")
        ppt = Presentation()
        pdf_document = fitz.open(pdf_file)  # Open the PDF file

        for page_number in range(len(pdf_document)):
            page = pdf_document.load_page(page_number)  # Load each page
            text = page.get_text("text")  # Extract text from the page
            images = page.get_images(full=True)  # Extract images from the page

            # Create a new slide
            slide = ppt.slides.add_slide(ppt.slide_layouts[1])  # Title and Content layout
            title = slide.shapes.title
            content = slide.placeholders[1]

            # Set the title and content
            lines = text.split("\n")
            if lines:
                title.text = lines[0]  # First line as title
                content.text = "\n".join(lines[1:])  # Remaining lines as content

            # Add images to the slide
            for img_index, img in enumerate(images):
                xref = img[0]
                base_image = pdf_document.extract_image(xref)
                image_bytes = base_image["image"]
                image_path = os.path.join(slides_folder, f"{uuid.uuid4().hex[:8]}.png")
                with open(image_path, "wb") as img_file:
                    img_file.write(image_bytes)

                # Add the image to the slide
                left = Inches(1)
                top = Inches(2 + img_index * 2)  # Stack images vertically
                slide.shapes.add_picture(image_path, left, top, width=Inches(4))

        pdf_document.close()  # Close the PDF document
        ppt.save(pptx_file)  # Save the PowerPoint file

        # Send the PPTX file to the client
        return send_from_directory(
            directory=os.path.dirname(pptx_file),
            path=os.path.basename(pptx_file),
            as_attachment=True,
            download_name="generated_presentation.pptx",  # This sets the filename in the browser
        )

    except subprocess.CalledProcessError as e:
        print(f"Error during Marp CLI execution: {e}")
        return jsonify({"error": "Failed to generate PDF using Marp CLI.", "details": str(e)}), 500
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
        # Authenticate using the service account
        credentials = service_account.Credentials.from_service_account_file(
            GOOGLE_CREDENTIALS_FILE, scopes=SCOPES
        )
        slides_service = build("slides", "v1", credentials=credentials)
        drive_service = build("drive", "v3", credentials=credentials)

        data = request.json
        slides_from_frontend = data.get("slides")
        # presentation_type = data.get("presentationType", "default") # For future layout variations

        # Validate slides_from_frontend input
        if slides_from_frontend is None:
            # If you want to allow creating a presentation even if 'slides' key is missing and treat as empty:
            # slides_from_frontend = [] 
            # Else, return an error:
            return jsonify({"error": "Slides data is missing (must be a list, can be empty)."}), 400
        if not isinstance(slides_from_frontend, list):
            return jsonify({"error": "Slides data must be a list."}), 400

        # Create a new Google Slides presentation
        presentation_title = "Generated Presentation"
        if not slides_from_frontend: # If frontend provides an empty list for slides
            presentation_title = "New Presentation (Empty)"
        
        presentation = slides_service.presentations().create(body={"title": presentation_title}).execute()
        presentation_id = presentation["presentationId"]

        # If slides_from_frontend is an empty list, set permissions and return the empty presentation
        if not slides_from_frontend:
            drive_service.permissions().create(
                fileId=presentation_id, body={"type": "anyone", "role": "writer"}
            ).execute()
            presentation_url = f"https://docs.google.com/presentation/d/{presentation_id}/edit"
            return jsonify({"url": presentation_url})

        # --- Batch 1: Delete initial default slide AND Create all new slide pages ---
        # slides_from_frontend is now guaranteed to be a non-empty list.
        
        # Get the initial slide created by default to delete it
        initial_presentation_data = slides_service.presentations().get(presentationId=presentation_id, fields="slides(objectId)").execute()
        initial_api_slides = initial_presentation_data.get("slides", [])
        
        batch1_requests = []
        if initial_api_slides: 
            initial_slide_id = initial_api_slides[0].get("objectId")
            if initial_slide_id: 
                batch1_requests.append({"deleteObject": {"objectId": initial_slide_id}})

        # Prepare requests to create new slides based on frontend data
        # created_page_object_ids = [] # Not strictly needed if we fetch slides again by order
        for _ in slides_from_frontend: 
            page_object_id = f"page_{uuid.uuid4().hex}" # Assign unique ID for creation
            # created_page_object_ids.append(page_object_id)
            batch1_requests.append({
                "createSlide": {
                    "objectId": page_object_id, # Provide an objectId for the new slide
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
        # api_slides now contains only the slides created in Batch 1, in order.
        api_slides = presentation_with_slides.get("slides", [])

        # --- Batch 2: Add content (text and images) to the created slides ---
        update_content_requests = []
        
        # len(api_slides) should now equal len(slides_from_frontend)
        for i in range(min(len(slides_from_frontend), len(api_slides))): 
            frontend_slide_content = slides_from_frontend[i]
            current_api_slide = api_slides[i] # This is the i-th slide we created

            page_elements = current_api_slide.get("pageElements", [])
            title_placeholder_id = None
            body_placeholder_id = None

            # Find placeholders by their type in the current slide
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
                        
                        if title_placeholder_id and body_placeholder_id: # Optimization
                            break 
            
            # Add text to title placeholder
            if title_placeholder_id and frontend_slide_content.get("title"):
                update_content_requests.append({
                    "insertText": {
                        "objectId": title_placeholder_id,
                        "text": frontend_slide_content["title"]
                    }
                })
            
            # Add text to body placeholder
            if body_placeholder_id and frontend_slide_content.get("content"):
                content_list = frontend_slide_content.get("content", [])
                content_text = ""
                if isinstance(content_list, list):
                    content_text = "\n".join(str(item) for item in content_list)
                elif isinstance(content_list, str): # If content is already a string
                    content_text = content_list
                
                if content_text: # Only add if there's text
                    update_content_requests.append({
                        "insertText": {
                            "objectId": body_placeholder_id,
                            "text": content_text
                        }
                    })

            # Add image if available
            if frontend_slide_content.get("image_url"):
                update_content_requests.append({
                    "createImage": {
                        "url": frontend_slide_content["image_url"],
                        "elementProperties": {
                            "pageObjectId": current_api_slide.get("objectId"), # ID of the slide page
                            "size": { 
                                "width": {"magnitude": 3000000, "unit": "EMU"}, 
                                "height": {"magnitude": 2250000, "unit": "EMU"} 
                            },
                            "transform": { 
                                "scaleX": 1, "scaleY": 1,
                                "translateX": 5500000, # Adjust X for right side
                                "translateY": 1400000, # Adjust Y for vertical position
                                "unit": "EMU"
                            }
                        }
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