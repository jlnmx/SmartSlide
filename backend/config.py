import os

class Config:
    DEBUG = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    SECRET_KEY = "your_secret_key"
    
    # Admin Configuration
    ADMIN_SECRET_KEY = os.environ.get('ADMIN_SECRET_KEY', 'default_admin_key_change_this')
    
    # Other configurations
    GROQ_API_KEY = os.environ.get('GROQ_API_KEY')
    #EMAIL_ADDRESS = os.environ.get('EMAIL_ADDRESS')
    #EMAIL_PASSWORD = os.environ.get('EMAIL_PASSWORD')