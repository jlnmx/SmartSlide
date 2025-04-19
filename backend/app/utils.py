# filepath: d:\Codes\CAPSTONE\backend\app\utils.py
import firebase_admin
from firebase_admin import credentials, storage

# Initialize Firebase Admin
cred = credentials.Certificate("firebase_key.json")
firebase_admin.initialize_app(cred, {
    "storageBucket": "YOUR_STORAGE_BUCKET"
})

def upload_file_to_firebase(file_path, destination_blob_name):
    """
    Uploads a file to Firebase Storage.
    """
    bucket = storage.bucket()
    blob = bucket.blob(destination_blob_name)
    blob.upload_from_filename(file_path)
    return blob.public_url