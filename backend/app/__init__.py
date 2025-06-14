from flask import Flask
from flask_cors import CORS
from config import Config
from flask_migrate import Migrate
from app.models import db

def create_app():
    app = Flask(__name__)    # Enable CORS for both local dev and Vercel frontend
    CORS(app, 
         resources={
             r"/*": {
                 "origins": [
                     "http://localhost:3000",
                     "https://smartslide.vercel.app",
                     "https://*.vercel.app"
                 ],
                 "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                 "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
                 "supports_credentials": True,
                 "expose_headers": ["Content-Range", "X-Content-Range"],
                 "max_age": 86400
             }
         },
         origins=[
             "http://localhost:3000",
             "https://smartslide.vercel.app",
             "https://*.vercel.app"
         ],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept"],
         supports_credentials=True
    )
    app.config.from_object(Config)
    db.init_app(app)

    from .routes import main
    app.register_blueprint(main)

    return app