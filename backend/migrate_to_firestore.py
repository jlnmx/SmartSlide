import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime

# Initialize Firebase
cred = credentials.Certificate("firebase_key.json")
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)
firestore_db = firestore.client()

def migrate_user_fields():
    """Migrate existing users to include new fields"""
    print("Starting user migration...")
    
    # Get all existing users
    users_ref = firestore_db.collection('users')
    users = users_ref.stream()
    
    updated_count = 0
    for user_doc in users:
        user_data = user_doc.to_dict()
        user_id = user_doc.id
        
        # Check if user already has the new fields, if not add them with default values
        updates = {}
        
        if 'full_name' not in user_data:
            updates['full_name'] = ''
        
        if 'birthday' not in user_data:
            updates['birthday'] = ''
        
        if 'contact_number' not in user_data:
            updates['contact_number'] = ''
        
        if 'user_type' not in user_data:
            updates['user_type'] = ''
        
        if 'registration_completed' not in user_data:
            updates['registration_completed'] = False
        
        # Only update if there are new fields to add
        if updates:
            users_ref.document(user_id).update(updates)
            updated_count += 1
            print(f"Updated user {user_id} with new fields: {list(updates.keys())}")
    
    print(f"Migration completed! Updated {updated_count} users with new fields.")

def migrate_analytics_fields():
    """Migrate existing analytics to ensure all required fields exist"""
    print("Starting analytics migration...")
    
    # Get all existing analytics
    analytics_ref = firestore_db.collection('analytics')
    analytics = analytics_ref.stream()
    
    updated_count = 0
    for analytics_doc in analytics:
        analytics_data = analytics_doc.to_dict()
        analytics_id = analytics_doc.id
        
        # Check if analytics already has all required fields
        updates = {}
        
        if 'slides_created' not in analytics_data:
            updates['slides_created'] = 0
        
        if 'quizzes_generated' not in analytics_data:
            updates['quizzes_generated'] = 0
        
        if 'scripts_generated' not in analytics_data:
            updates['scripts_generated'] = 0
        
        if 'last_active' not in analytics_data:
            updates['last_active'] = datetime.utcnow()
        
        if 'last_generated_at' not in analytics_data:
            updates['last_generated_at'] = None
        
        if 'last_topic' not in analytics_data:
            updates['last_topic'] = None
        
        # Only update if there are new fields to add
        if updates:
            analytics_ref.document(analytics_id).update(updates)
            updated_count += 1
            print(f"Updated analytics {analytics_id} with new fields: {list(updates.keys())}")
    
    print(f"Analytics migration completed! Updated {updated_count} analytics records.")

if __name__ == "__main__":
    try:
        migrate_user_fields()
        migrate_analytics_fields()
        print("\n✅ All migrations completed successfully!")
    except Exception as e:
        print(f"❌ Error during migration: {str(e)}")
        import traceback
        traceback.print_exc()