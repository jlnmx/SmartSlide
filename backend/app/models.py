from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Analytics(db.Model):
    __tablename__ = 'analytics'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    # For time-based analytics (e.g., slides created per month)
    month = db.Column(db.String(20), nullable=True)  # e.g., '2025-05'
    slides_created = db.Column(db.Integer, default=0)
    # For topic analytics
    topic = db.Column(db.String(100), nullable=True)
    topic_count = db.Column(db.Integer, default=0)
    # General usage
    quizzes_generated = db.Column(db.Integer, default=0)
    scripts_generated = db.Column(db.Integer, default=0)
    last_active = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship('User', backref=db.backref('analytics', lazy=True))

class Presentation(db.Model):
    __tablename__ = 'presentations'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # Optionally store more metadata (e.g., template, type)
    template = db.Column(db.String(100), nullable=True)
    presentation_type = db.Column(db.String(100), nullable=True)
    slides_json = db.Column(db.Text, nullable=True)  # Store slides as JSON string
    user = db.relationship('User', backref=db.backref('presentations', lazy=True))
