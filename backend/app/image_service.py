import os
import requests
from flask import current_app
from urllib.parse import quote
import time

def generate_image_pollinations(prompt, width=1024, height=576, model="flux"):
    """
    Generate image using Pollinations.ai (100% FREE, no API key needed)
    
    Args:
        prompt:  Text description of the image
        width:  Image width (default 1024 for slides)
        height: Image height (default 576 for 16:9 slides)
        model: AI model to use ('flux', 'turbo', or 'flux-realism')
    
    Returns:
        Image URL (direct link to generated image)
    """
    try:
        # URL encode the prompt
        encoded_prompt = quote(prompt)
        
        # Build the Pollinations.ai URL
        # Format: https://image.pollinations.ai/prompt/{prompt}? width={width}&height={height}&model={model}
        image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={width}&height={height}&model={model}&nologo=true&enhance=true"
        
        current_app.logger.info(f"Generating image via Pollinations.ai: {prompt}")
        current_app.logger.info(f"Image URL: {image_url}")
        
        # Verify the image is accessible (optional check)
        try:
            response = requests.head(image_url, timeout=10)
            if response.status_code == 200:
                current_app.logger.info(f"✅ Image generated successfully:  {image_url}")
                return image_url
            else: 
                current_app.logger.warning(f"Image URL returned status {response.status_code}")
                return image_url  # Still return it, might work
        except Exception as check_error:
            current_app.logger.warning(f"Could not verify image URL: {check_error}")
            return image_url  # Return anyway, Pollinations usually works
            
    except Exception as e: 
        current_app.logger.error(f"Error generating image with Pollinations:  {e}")
        return None

def generate_slide_image(prompt, width=1024, height=576, style="professional"):
    """
    Main function to generate images for slides using Pollinations.ai
    
    Args:
        prompt: Description of what to generate
        width: Image width (default 1024)
        height: Image height (default 576 for 16:9)
        style: Image style preference
    
    Returns:
        Direct URL to generated image
    """
    
    # Enhance prompt based on style
    style_enhancements = {
        "professional": "Professional, clean, high-quality, business presentation style,",
        "minimalist": "Minimalist, simple, clean lines, modern design,",
        "colorful":  "Vibrant colors, eye-catching, energetic, dynamic,",
        "3d":  "3D rendered, realistic lighting, detailed textures,",
        "illustration": "Illustrated, artistic, hand-drawn style, creative,",
        "photorealistic": "Photorealistic, detailed, sharp focus, professional photography,"
    }
    
    enhancement = style_enhancements.get(style, style_enhancements["professional"])
    enhanced_prompt = f"{enhancement} {prompt}.  No text, no watermarks, high quality."
    
    current_app.logger.info(f"Generating slide image:  {enhanced_prompt[: 100]}...")
    
    # Choose model based on style
    if style in ["photorealistic", "3d"]: 
        model = "flux-realism"
    elif style in ["minimalist", "illustration"]:
        model = "flux"
    else:
        model = "flux"  # Default to flux (best quality)
    
    # Generate with Pollinations.ai
    image_url = generate_image_pollinations(enhanced_prompt, width, height, model)
    
    if image_url:
        current_app.logger.info(f"✅ Successfully generated image for:  {prompt[: 50]}...")
        return image_url
    else:
        current_app.logger.warning(f"❌ Failed to generate image for:  {prompt}")
        return None

def generate_multiple_images(prompts, width=1024, height=576, style="professional", delay=0.5):
    """
    Generate multiple images with a delay between requests
    
    Args:
        prompts: List of text prompts
        width: Image width
        height: Image height
        style: Image style
        delay: Delay between requests in seconds (to avoid rate limiting)
    
    Returns:
        List of image URLs
    """
    images = []
    
    for i, prompt in enumerate(prompts):
        current_app.logger.info(f"Generating image {i+1}/{len(prompts)}")
        image_url = generate_slide_image(prompt, width, height, style)
        images.append(image_url)
        
        # Add delay between requests (except for last one)
        if i < len(prompts) - 1 and delay > 0:
            time.sleep(delay)
    
    return images