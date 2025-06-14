from flask import Flask
from flask_cors import CORS
from config import Config
from flask_migrate import Migrate
from app.models import db

def create_app():
    app = Flask(__name__)
    
    app.config.from_object(Config)
    db.init_app(app)

    from .routes import main
    app.register_blueprint(main)
    
    # Configure CORS after registering blueprints
    CORS(app, 
         origins=[
             "http://localhost:3000",
             "https://smartslide.vercel.app"
         ],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
         supports_credentials=True,
         max_age=86400
    )

    return app