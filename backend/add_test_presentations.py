#!/usr/bin/env python3
"""
Script to add test presentations to Firestore for testing the dashboard
"""

import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timedelta

# Initialize Firebase (same as in routes.py)
cred = credentials.Certificate("firebase_key.json")
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)
firestore_db = firestore.client()

def add_test_presentations():
    """Add test presentations for user_id '1' to Firestore"""
    
    test_presentations = [
        {
            'user_id': '1',
            'title': 'Introduction to AI and Machine Learning',
            'slides': [
                {
                    'title': 'Introduction to AI',
                    'content': ['Artificial Intelligence overview', 'Key concepts and applications']
                },
                {
                    'title': 'Machine Learning Basics',
                    'content': ['Supervised learning', 'Unsupervised learning', 'Deep learning']
                }
            ],
            'template': 'professional',
            'presentation_type': 'Educational',
            'created_at': datetime.utcnow() - timedelta(days=1),
            'updated_at': datetime.utcnow() - timedelta(days=1)
        },
        {
            'user_id': '1',
            'title': 'Digital Marketing Strategies',
            'slides': [
                {
                    'title': 'Digital Marketing Overview',
                    'content': ['SEO fundamentals', 'Social media marketing', 'Content marketing']
                },
                {
                    'title': 'Analytics and ROI',
                    'content': ['Measuring success', 'Key performance indicators', 'ROI optimization']
                }
            ],
            'template': 'modern',
            'presentation_type': 'Business',
            'created_at': datetime.utcnow() - timedelta(hours=6),
            'updated_at': datetime.utcnow() - timedelta(hours=6)
        },
        {
            'user_id': '1',
            'title': 'Climate Change and Sustainability',
            'slides': [
                {
                    'title': 'Climate Change Impact',
                    'content': ['Global warming effects', 'Environmental consequences', 'Ecosystem changes']
                },
                {
                    'title': 'Sustainable Solutions',
                    'content': ['Renewable energy', 'Carbon footprint reduction', 'Green technologies']
                }
            ],
            'template': 'clean',
            'presentation_type': 'Environmental',
            'created_at': datetime.utcnow() - timedelta(hours=2),
            'updated_at': datetime.utcnow() - timedelta(hours=2)
        },
        {
            'user_id': '1',
            'title': 'Project Management Best Practices',
            'slides': [
                {
                    'title': 'Project Planning',
                    'content': ['Setting objectives', 'Resource allocation', 'Timeline management']
                },
                {
                    'title': 'Team Collaboration',
                    'content': ['Communication strategies', 'Agile methodologies', 'Risk management']
                }
            ],
            'template': 'corporate',
            'presentation_type': 'Professional',
            'created_at': datetime.utcnow() - timedelta(minutes=30),
            'updated_at': datetime.utcnow() - timedelta(minutes=30)
        }
    ]
    
    presentations_ref = firestore_db.collection('presentations')
    
    for presentation in test_presentations:
        doc_ref = presentations_ref.document()
        doc_ref.set(presentation)
        print(f"Added presentation: {presentation['title']} (ID: {doc_ref.id})")
    
    print(f"Successfully added {len(test_presentations)} test presentations for user_id '1'")

if __name__ == "__main__":
    add_test_presentations()
