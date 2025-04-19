from flask import Blueprint, jsonify, request
from .utils import upload_file_to_firebase


main = Blueprint("main", __name__)

# Home route
@main.route("/")
def home():
    """
    Home route for the API.
    Returns a welcome message.
    """
    return jsonify({"message": "Welcome to the Flask API!"})


@main.route("/upload", methods=["POST"])
def upload_file():
    """
    Upload a file to Firebase Storage.
    """
    file = request.files["file"]
    file_path = f"temp/{file.filename}"
    file.save(file_path)

    # Upload to Firebase
    public_url = upload_file_to_firebase(file_path, f"uploads/{file.filename}")
    return jsonify({"message": "File uploaded successfully!", "url": public_url})

# Templates Page
@main.route("/templates", methods=["GET"])
def get_templates():
    """
    Fetch a list of templates grouped by category.
    This is a placeholder for fetching templates from a database or external API.
    """
    templates = [
        {"id": 1, "category": "Business", "name": "Business Plan"},
        {"id": 2, "category": "Education", "name": "Lesson Plan"},
        {"id": 3, "category": "Creative", "name": "Portfolio Showcase"},
    ]
    return jsonify(templates)


# Analytics Page
@main.route("/analytics", methods=["GET"])
def get_analytics():
    """
    Fetch analytics data for the application.
    This is a placeholder for fetching analytics data from a database or external API.
    """
    analytics_data = {
        "total_slides_created": 54,
        "most_used_template": "Modern Business",
        "usage_frequency": "3 times per week",
        "slides_over_time": [12, 19, 8, 15],
        "common_topics": {"Business": 40, "Education": 25, "Technology": 20, "Health": 15},
    }
    return jsonify(analytics_data)


# Create Page
@main.route("/create", methods=["POST"])
def create_presentation():
    """
    Create a new presentation.
    This is a placeholder for handling presentation creation logic.
    """
    data = request.json
    # Example: Process the data to create a presentation
    return jsonify({"message": "Presentation created successfully!", "data": data})


# Import Page
@main.route("/import", methods=["POST"])
def import_content():
    """
    Import content from a URL or file.
    This is a placeholder for handling content import logic.
    """
    data = request.json
    # Example: Process the URL or file data
    return jsonify({"message": "Content imported successfully!", "data": data})


# Paste and Create Page
@main.route("/paste-and-create", methods=["POST"])
def paste_and_create():
    """
    Create a presentation from pasted text.
    This is a placeholder for handling pasted text processing logic.
    """
    data = request.json
    # Example: Process the pasted text
    return jsonify({"message": "Presentation created from pasted text!", "data": data})


# Authentication (Sign In / Sign Up)
@main.route("/auth", methods=["POST"])
def authenticate_user():
    """
    Handle user authentication (Sign In / Sign Up).
    This is a placeholder for authentication logic.
    """
    data = request.json
    # Example: Validate user credentials or create a new account
    return jsonify({"message": "Authentication successful!", "data": data})


# Settings Page
@main.route("/settings", methods=["GET", "POST"])
def manage_settings():
    """
    Fetch or update user settings.
    This is a placeholder for handling user settings logic.
    """
    if request.method == "GET":
        # Example: Fetch user settings
        settings = {"theme": "light", "notifications": True}
        return jsonify(settings)
    elif request.method == "POST":
        # Example: Update user settings
        data = request.json
        return jsonify({"message": "Settings updated successfully!", "data": data})