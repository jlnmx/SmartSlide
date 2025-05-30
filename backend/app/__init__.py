from flask import Flask
from flask_cors import CORS
from config import Config
from flask_migrate import Migrate
from app.models import db

def create_app():
    app = Flask(__name__)
    # Enable CORS for both local dev and Vercel frontend
    CORS(app, origins=[
        "http://localhost:3000",
        "https://smartslide.vercel.app"
    ], allow_headers=["Content-Type", "Authorization"], supports_credentials=True)
    app.config.from_object(Config)
    db.init_app(app)

    from .routes import main
    app.register_blueprint(main)

    return app