TEMPLATES = {
    "business_template": {
        "name": "Business",
        "description": "A professional, clean template for business presentations.",
        "background_color": (245, 245, 245),  # Light gray
        "title_font": {"name": "Arial", "size": 44, "color": (33, 37, 41)},  # Arial is supported everywhere
        "content_font": {"name": "Arial", "size": 28, "color": (60, 60, 60)},  # Arial for content
        "layout": "title_and_content",
        "title_bold": True,
        "content_bold": False,
        "auto_font_size": True,
    },
    "education_template": {
        "name": "Education",
        "description": "A template designed for school or academic presentations.",
        "background_color": (255, 255, 240),  # Ivory
        "title_font": {"name": "Times New Roman", "size": 40, "color": (25, 70, 140)},
        "content_font": {"name": "Arial", "size": 26, "color": (40, 40, 40)},
        "accent_color": (255, 193, 7),  # School yellow
        "layout": "title_and_content",
        "title_bold": True,
        "content_bold": False,
        "auto_font_size": True,
    },
    "creative_template": {
        "name": "Creative",
        "description": "A vibrant, visually engaging template for creative presentations.",
        "background_color": (255, 243, 207),  # Light pastel yellow
        "title_font": {"name": "Trebuchet MS", "size": 48, "color": (255, 87, 34)},  # Trebuchet MS is supported
        "content_font": {"name": "Georgia", "size": 30, "color": (103, 58, 183)},  # Georgia is supported
        "accent_color": (0, 200, 83),  # Green accent
        "layout": "title_and_content",
        "title_bold": True,
        "content_bold": False,
        "auto_font_size": True,

    },
    "modern_template": {
        "name": "Modern",
        "description": "A sleek, minimal template for modern presentations.",
        "background_color": (255, 255, 255),  # White
        "title_font": {"name": "Arial", "size": 32, "color": (33, 33, 33)},
        "content_font": {"name": "Arial", "size": 28, "color": (80, 80, 80)},
        "accent_color": (0, 191, 255),  # Cyan
        "layout": "title_and_content",
        "title_bold": True,
        "content_bold": False,
        "auto_font_size": True,

    },
    "abstract_template": {
        "name": "Abstract",
        "description": "A template with artistic and unique color combinations.",
        "background_color": (230, 230, 250),  # Lavender
        "title_font": {"name": "Georgia", "size": 46, "color": (138, 43, 226)},  # Georgia is supported
        "content_font": {"name": "Arial", "size": 28, "color": (44, 62, 80)},  # Arial is supported
        "accent_color": (255, 87, 34),  # Orange
        "layout": "title_and_content",
        "title_bold": True,
        "content_bold": False,
        "auto_font_size": True,

    },
    "minimal_template": {
        "name": "Minimal",
        "description": "A simple, elegant template for minimal presentations.",
        "background_color": (255, 255, 255),  # White
        "title_font": {"name": "Arial", "size": 40, "color": (0, 0, 0)},
        "content_font": {"name": "Arial", "size": 24, "color": (100, 100, 100)},
        "accent_color": (200, 200, 200),  # Light gray
        "layout": "title_and_content",
        "title_bold": False,
        "content_bold": False,
        "auto_font_size": True,
    },
    "business_plan": {
        "name": "Business Plan",
        "description": "A template for business plans.",
        "background_color": (245, 245, 245),
        "title_font": {"name": "Arial", "size": 44, "color": (33, 37, 41)},
        "content_font": {"name": "Arial", "size": 28, "color": (60, 60, 60)},
        "layout": "title_and_content",
        "title_bold": True,
        "content_bold": False,
        "auto_font_size": True,
    },
    "marketing_strategy": {
        "name": "Marketing Strategy",
        "description": "A template for marketing strategies.",
        "background_color": (255, 255, 255),
        "title_font": {"name": "Arial", "size": 40, "color": (0, 0, 0)},
        "content_font": {"name": "Arial", "size": 24, "color": (100, 100, 100)},
        "layout": "title_and_content",
        "title_bold": True,
        "content_bold": False,
        "auto_font_size": True,
    },
    "sales_pitch": {
        "name": "Sales Pitch",
        "description": "A template for sales pitches.",
        "background_color": (255, 255, 240),
        "title_font": {"name": "Arial", "size": 42, "color": (25, 70, 140)},
        "content_font": {"name": "Arial", "size": 26, "color": (40, 40, 40)},
        "layout": "title_and_content",
        "title_bold": True,
        "content_bold": False,
        "auto_font_size": True,
    },
    "lesson_plan": {
        "name": "Lesson Plan",
        "description": "A template for lesson plans.",
        "background_color": (255, 255, 240),
        "title_font": {"name": "Times New Roman", "size": 40, "color": (25, 70, 140)},
        "content_font": {"name": "Arial", "size": 26, "color": (40, 40, 40)},
        "layout": "title_and_content",
        "title_bold": True,
        "content_bold": False,
        "auto_font_size": True,
    },
    "research_presentation": {
        "name": "Research Presentation",
        "description": "A template for research presentations.",
        "background_color": (255, 255, 255),
        "title_font": {"name": "Arial", "size": 40, "color": (0, 0, 0)},
        "content_font": {"name": "Arial", "size": 24, "color": (100, 100, 100)},
        "layout": "title_and_content",
        "title_bold": True,
        "content_bold": False,
        "auto_font_size": True,
    },
    "classroom_activity": {
        "name": "Classroom Activity",
        "description": "A template for classroom activities.",
        "background_color": (255, 255, 240),
        "title_font": {"name": "Arial", "size": 38, "color": (25, 70, 140)},
        "content_font": {"name": "Arial", "size": 24, "color": (40, 40, 40)},
        "layout": "title_and_content",
        "title_bold": True,
        "content_bold": False,
        "auto_font_size": True,
    },
    "portfolio_showcase": {
        "name": "Portfolio Showcase",
        "description": "A template for showcasing portfolios.",
        "background_color": (255, 243, 207),
        "title_font": {"name": "Trebuchet MS", "size": 48, "color": (255, 87, 34)},
        "content_font": {"name": "Georgia", "size": 30, "color": (103, 58, 183)},
        "layout": "title_and_content",
        "title_bold": True,
        "content_bold": False,
        "auto_font_size": True,
    },
    "storytelling": {
        "name": "Storytelling",
        "description": "A template for storytelling presentations.",
        "background_color": (255, 243, 207),
        "title_font": {"name": "Trebuchet MS", "size": 44, "color": (255, 87, 34)},
        "content_font": {"name": "Georgia", "size": 28, "color": (103, 58, 183)},
        "layout": "title_and_content",
        "title_bold": True,
        "content_bold": False,
        "auto_font_size": True,
    },
    "design_proposal": {
        "name": "Design Proposal",
        "description": "A template for design proposals.",
        "background_color": (255, 243, 207),
        "title_font": {"name": "Trebuchet MS", "size": 42, "color": (255, 87, 34)},
        "content_font": {"name": "Georgia", "size": 26, "color": (103, 58, 183)},
        "layout": "title_and_content",
        "title_bold": True,
        "content_bold": False,
        "auto_font_size": True,
    },
}