import os
import requests  
import json
from flask import Blueprint, jsonify, request, send_file
from flask_cors import CORS
from pptx import Presentation
from pptx.util import Inches, Pt
import io
import re
import traceback

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
        - A short paragraph or bullet points for the content.
        - Suggestions for colors, fonts, and layouts for a visually appealing design.
        Format the output STRICTLY as a JSON array where each object represents a slide and has 'title', 'content', 'font', 'color', and 'layout' keys.

        Example format:
        [
          {{"title": "Slide 1 Title", "content": "Bullet point 1\\nBullet point 2", "font": "Arial", "color": "#000000", "layout": "Title and Content"}},
          {{"title": "Slide 2 Title", "content": "A short paragraph about the topic.", "font": "Calibri", "color": "#333333", "layout": "Title and Content"}}
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

@main.route("/download-pptx", methods=["POST"])
def download_pptx():
    data = request.json
    slides = data.get("slides", [])

    if not slides or not isinstance(slides, list):
        return jsonify({"error": "Invalid slide data provided."}), 400

    try:
        ppt = Presentation()
        for slide_data in slides:
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
            download_name="generated_presentation.pptx",
            mimetype="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        )
    except Exception as e:
        print(f"Error generating PowerPoint file: {e}")
        traceback.print_exc()
        return jsonify({"error": "An error occurred while generating the PowerPoint file.", "details": str(e)}), 500