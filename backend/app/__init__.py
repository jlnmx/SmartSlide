from flask import Flask
from flask_cors import CORS
from config import Config
from flask_migrate import Migrate
from app.models import db

def create_app():
    app = Flask(__name__)
    # Enable CORS for both local dev and Vercel frontend with more comprehensive settings
    # Temporarily allowing all origins to debug CORS issue
    CORS(app, 
         resources={
             r"/*": {
                 "origins": "*",
                 "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                 "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
                 "supports_credentials": False  # Disabled for wildcard origin
             }
         }
    )
    app.config.from_object(Config)
    db.init_app(app)

    from .routes import main
    app.register_blueprint(main)

    return app