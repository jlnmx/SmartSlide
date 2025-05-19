from flask import Flask
from flask_cors import CORS
from config import Config
from flask_migrate import Migrate
from app.models import db

def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
    app.config.from_object(Config)
    db.init_app(app)
    migrate = Migrate(app, db)

    from .routes import main
    app.register_blueprint(main)

    return app