import os
import google.generativeai as genai
import json
from flask import Blueprint, jsonify, request, send_file
from flask_cors import CORS  # Import Flask-CORS for handling CORS
from pptx import Presentation
from pptx.util import Inches, Pt
import io
import traceback

# --- Gemini API Configuration ---
# IMPORTANT: Store your API key securely, preferably as an environment variable.
# Avoid hardcoding it directly in the source code.
# Example using environment variable:
# from dotenv import load_dotenv
# load_dotenv()
# API_KEY = os.getenv("GEMINI_API_KEY")
API_KEY = "AIzaSyAzixok8ILe00m1t6xUHEIkhyq497a_WuA"  # Replace with your actual key or use environment variable

model = None  # Initialize model to None
try:
    if not API_KEY:
        print("Error: GEMINI_API_KEY not found. Please set it as an environment variable or in the script.")
    else:
        genai.configure(api_key=API_KEY)
        # Initialize the Generative Model
        model = genai.GenerativeModel('gemini-1.5-pro-latest')
        print("Gemini API configured successfully.")
except Exception as e:
    print(f"Error configuring Gemini API: {e}")

# Initialize Blueprint
main = Blueprint("main", __name__)

# Enable CORS for the Blueprint
CORS(main, resources={r"/*": {"origins": "*"}})  # Allow all origins (for development only)

# Home route
@main.route("/")
def home():
    """
    Home route for the API.
    Returns a welcome message.
    """
    return jsonify({"message": "Welcome to the Flask API!"})

# --- Route for Slide Generation ---
@main.route("/generate-slides", methods=["POST"])
def generate_slides():
    """
    Generates presentation slides based on user input using the Gemini API.
    """
    if not model:
        return jsonify({"error": "Gemini API not configured correctly or API key missing."}), 500

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

    presentation_type = data.get("presentationType", "Default")

    if not prompt_topic:
        return jsonify({"error": "Prompt topic is required."}), 400

    try:
        # Construct a detailed prompt for Gemini
        generation_prompt = f"""
        Generate content for a presentation about "{prompt_topic}".
        The presentation should have exactly {num_slides} slides.
        The language should be {language}.
        For each slide, provide a concise title and bullet points or a short paragraph for the content.
        Format the output STRICTLY as a JSON array where each object represents a slide and has 'title' and 'content' keys. The 'content' should use '\\n' for newlines within the text.

        Example format:
        [
          {{"title": "Slide 1 Title", "content": "Bullet point 1\\nBullet point 2"}},
          {{"title": "Slide 2 Title", "content": "A short paragraph about the topic.\\nAnother point."}}
        ]

        Generate the slides now:
        """

        print(f"--- Sending prompt to Gemini (Topic: {prompt_topic}, Slides: {num_slides}, Lang: {language}) ---")

        response = model.generate_content(generation_prompt)

        # Clean the response text
        cleaned_response_text = response.text.strip()
        if cleaned_response_text.startswith('```json'):
            cleaned_response_text = cleaned_response_text[7:]
        elif cleaned_response_text.startswith('```'):
            cleaned_response_text = cleaned_response_text[3:]
        if cleaned_response_text.endswith('```'):
            cleaned_response_text = cleaned_response_text[:-3]

        cleaned_response_text = cleaned_response_text.strip()

        slides_data = json.loads(cleaned_response_text)

        # Validate the structure
        if not isinstance(slides_data, list):
            raise ValueError("Invalid JSON structure: Expected a list.")
        if not all(isinstance(s, dict) and 'title' in s and 'content' in s for s in slides_data):
            raise ValueError("Invalid JSON structure: Each slide object must have 'title' and 'content' keys.")
        if len(slides_data) != num_slides:
            print(f"Warning: Gemini returned {len(slides_data)} slides, but {num_slides} were requested.")

        print(f"--- Successfully Parsed {len(slides_data)} Slides ---")

        return jsonify({"slides": slides_data})

    except json.JSONDecodeError as e:
        print(f"JSON Decode Error: {e}")
        print(f"Problematic Text: '{cleaned_response_text}'")
        return jsonify({"error": "Failed to parse response from AI model. The format might be incorrect.", "details": str(e), "raw_response": response.text}), 500
    except Exception as e:
        print(f"Error during slide generation: {e}")
        traceback.print_exc()
        feedback = getattr(response, 'prompt_feedback', None)
        error_details = {"error": str(e), "prompt_feedback": str(feedback) if feedback else "N/A"}
        return jsonify({"error": "An error occurred during slide generation.", "details": error_details}), 500

# --- Route for Downloading PPTX ---
@main.route("/download-pptx", methods=["POST"])
def download_pptx():
    """
    Generates a PPTX file from slide data received from the frontend
    and sends it back for download.
    """
    data = request.json
    if not data:
        return jsonify({"error": "Invalid JSON payload."}), 400

    slides_data = data.get("slides")
    template_name = data.get("template", "business_template.pptx")  # Default to business template

    if not slides_data or not isinstance(slides_data, list):
        return jsonify({"error": "Invalid or missing slides data."}), 400

    try:
        # Load the selected template
        template_path = os.path.join("templates", template_name)
        if not os.path.exists(template_path):
            return jsonify({"error": f"Template '{template_name}' not found."}), 404

        prs = Presentation(template_path)

        # Add slides to the template
        for slide_content in slides_data:
            slide_layout = prs.slide_layouts[1]  # Use the second layout (Title and Content)
            slide = prs.slides.add_slide(slide_layout)
            title_placeholder = slide.shapes.title
            body_placeholder = slide.placeholders[1]

            title_placeholder.text = slide_content.get("title", "")
            content_text = slide_content.get("content", "")
            tf = body_placeholder.text_frame
            tf.clear()

            for para in content_text.split("\\n"):
                p = tf.add_paragraph()
                p.text = para.strip()

        # Save the generated presentation to a stream
        pptx_stream = io.BytesIO()
        prs.save(pptx_stream)
        pptx_stream.seek(0)

        return send_file(
            pptx_stream,
            as_attachment=True,
            download_name="generated_presentation_with_template.pptx",
            mimetype="application/vnd.openxmlformats-officedocument.presentationml.presentation"
        )

    except Exception as e:
        print(f"Error generating PPTX with template: {e}")
        traceback.print_exc()
        return jsonify({"error": f"Failed to generate PowerPoint file: {str(e)}"}), 500