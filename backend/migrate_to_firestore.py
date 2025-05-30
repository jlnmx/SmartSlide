import firebase_admin
from firebase_admin import credentials, firestore
from app.models import db, User, Analytics, Presentation, SavedQuiz, SavedScript
from app import create_app

cred = credentials.Certificate("firebase_key.json")
firebase_admin.initialize_app(cred)
firestore_db = firestore.client()

app = create_app()
with app.app_context():
    # --- USERS ---
    for user in User.query.all():
        firestore_db.collection('users').document(str(user.id)).set({
            'email': user.email,
            'password_hash': user.password_hash,
            'created_at': user.created_at
        })

    # --- ANALYTICS ---
    for analytics in Analytics.query.all():
        firestore_db.collection('analytics').document(str(analytics.user_id)).set({
            'user_id': analytics.user_id,
            'month': analytics.month,
            'slides_created': analytics.slides_created,
            'topic': analytics.topic,
            'topic_count': analytics.topic_count,
            'quizzes_generated': analytics.quizzes_generated,
            'scripts_generated': analytics.scripts_generated,
            'last_active': analytics.last_active
        })

    # --- PRESENTATIONS ---
    for pres in Presentation.query.all():
        firestore_db.collection('presentations').document(str(pres.id)).set({
            'user_id': pres.user_id,
            'title': pres.title,
            'created_at': pres.created_at,
            'updated_at': pres.updated_at,
            'template': pres.template,
            'presentation_type': pres.presentation_type,
            'slides': pres.slides_json  # If you want to keep as JSON string, or use json.loads(pres.slides_json)
        })

    # --- SAVED QUIZZES ---
    for quiz in SavedQuiz.query.all():
        firestore_db.collection('saved_quizzes').document(str(quiz.id)).set({
            'user_id': quiz.user_id,
            'name': quiz.name,
            'content': quiz.content,
            'created_at': quiz.created_at
        })

    # --- SAVED SCRIPTS ---
    for script in SavedScript.query.all():
        firestore_db.collection('saved_scripts').document(str(script.id)).set({
            'user_id': script.user_id,
            'name': script.name,
            'content': script.content,
            'created_at': script.created_at
        })

print("Migration complete!")