from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
    app.config.from_object("config.Config")

    # Register Blueprints
    from .routes import main
    app.register_blueprint(main)

    return app