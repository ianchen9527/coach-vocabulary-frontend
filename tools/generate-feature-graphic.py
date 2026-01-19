#!/usr/bin/env python3
"""
Google Play Feature Graphic Generator (AI Version)

Generates a 1024x500 feature graphic for Google Play Store using Gemini AI.

Usage: python tools/generate-feature-graphic.py

Requirements:
    pip install google-genai Pillow

Before running:
1. Set your API key: export GOOGLE_API_KEY="your-api-key"
2. Run the script

Get your API key from: https://aistudio.google.com/app/apikey
"""

import sys
import os
import base64
import traceback
from pathlib import Path
from io import BytesIO

try:
    from PIL import Image
except ImportError:
    print("Error: Pillow is required. Install with: pip install Pillow")
    sys.exit(1)

try:
    from google import genai
    from google.genai import types
except ImportError:
    print("Error: google-genai is required. Install with: pip install google-genai")
    sys.exit(1)


# === CONFIGURATION ===

SCRIPT_DIR = Path(__file__).parent
ASSETS_DIR = SCRIPT_DIR.parent / "assets"
OUTPUT_DIR = SCRIPT_DIR / "feature-graphic"

# Google Play Feature Graphic dimensions
OUTPUT_WIDTH = 1024
OUTPUT_HEIGHT = 500

# Brand info
BRAND_COLOR = "#E0F7EF"  # Mint green
APP_NAME = "Attain"
TAGLINE = "30分鐘背50個單字"
SUBTITLE = "English All In One"

# Icon paths (in order of preference)
ICON_PATHS = [
    # SCRIPT_DIR / "Gemini_Generated_Image_4i3al54i3al54i3a.png",  # Original high-res
    ASSETS_DIR / "icon.png",
    ASSETS_DIR / "adaptive-icon.png",
]


def find_icon() -> Path:
    """Find the best available icon file."""
    for path in ICON_PATHS:
        if path.exists():
            return path
    return None


def ensure_exact_size(image: Image.Image, target_width: int, target_height: int) -> Image.Image:
    """
    Ensure image is exactly the target size.
    If aspect ratio differs, crop/pad to fit while maintaining center.
    """
    current_width, current_height = image.size
    target_ratio = target_width / target_height
    current_ratio = current_width / current_height

    if current_ratio > target_ratio:
        # Image is wider - crop sides
        new_width = int(current_height * target_ratio)
        left = (current_width - new_width) // 2
        image = image.crop((left, 0, left + new_width, current_height))
    elif current_ratio < target_ratio:
        # Image is taller - crop top/bottom
        new_height = int(current_width / target_ratio)
        top = (current_height - new_height) // 2
        image = image.crop((0, top, current_width, top + new_height))

    # Resize to exact dimensions
    image = image.resize((target_width, target_height), Image.Resampling.LANCZOS)

    print(f"  Final size: {image.size[0]}x{image.size[1]}")
    return image


def generate_feature_graphic(client, model_name: str, icon_path: Path) -> bool:
    """Generate the feature graphic using Gemini AI."""
    output_path = OUTPUT_DIR / "feature-graphic.png"

    try:
        # Load the icon
        icon = Image.open(icon_path)
        print(f"  Icon loaded: {icon.size[0]}x{icon.size[1]}")

        # Create the prompt
        prompt = f"""Generate a simple, minimal Google Play Store feature graphic banner.

SPECIFICATIONS:
- Dimensions: {OUTPUT_WIDTH}x{OUTPUT_HEIGHT} pixels (wide horizontal banner)

DESIGN:
- Place the app icon I'm providing a little to the right of the center of the image
- Background: Clean, solid using {BRAND_COLOR} (light mint green)
- NO text, NO words, NO taglines - just the icon
- Minimalist and clean aesthetic
- The icon should be sized appropriately (not too large, not too small)
- Keep it simple and elegant

STYLE:
- Simple, understated, professional
- Not flashy or busy
- Calm and clean
- Premium minimal feel

Generate a clean, simple banner with just the icon centered on the light mint green background."""

        print(f"  Generating with AI...")

        # Send to Gemini with the icon
        response = client.models.generate_content(
            model=model_name,
            contents=[prompt, icon],
            config=types.GenerateContentConfig(
                response_modalities=["Text", "Image"]
            )
        )

        # Check if we got an image back
        if response.parts:
            for part in response.parts:
                if hasattr(part, 'inline_data') and part.inline_data is not None:
                    mime_type = getattr(part.inline_data, 'mime_type', 'unknown')
                    print(f"  Found image data (mime: {mime_type})")

                    # Get image data and convert to PIL Image
                    image_data = part.inline_data.data
                    if isinstance(image_data, str):
                        image_data = base64.b64decode(image_data)
                    image = Image.open(BytesIO(image_data))

                    # Ensure exact dimensions
                    image = ensure_exact_size(image, OUTPUT_WIDTH, OUTPUT_HEIGHT)

                    # Convert to RGB (no transparency for feature graphic)
                    if image.mode == 'RGBA':
                        background = Image.new('RGB', image.size, (255, 255, 255))
                        background.paste(image, mask=image.split()[3])
                        image = background
                    elif image.mode != 'RGB':
                        image = image.convert('RGB')

                    # Save as PNG (Google Play accepts PNG or JPEG)
                    image.save(output_path, "PNG")

                    size_kb = output_path.stat().st_size / 1024
                    print(f"  Saved: {output_path.name} ({size_kb:.0f} KB)")
                    return True

        # Log what we got instead
        print(f"  No image in response. Parts received:")
        for i, part in enumerate(response.parts if response.parts else []):
            part_type = type(part).__name__
            if hasattr(part, 'text') and part.text:
                preview = part.text[:80].replace('\n', ' ')
                print(f"    Part {i}: {part_type} - text: \"{preview}...\"")
            else:
                print(f"    Part {i}: {part_type}")

        return False

    except Exception as e:
        print(f"  Error: {type(e).__name__}: {e}")
        traceback.print_exc()
        return False


def main():
    print("\n=== Google Play Feature Graphic Generator ===\n")

    # Check for API key
    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print("Error: GOOGLE_API_KEY environment variable not set")
        print("\nTo set it:")
        print('  export GOOGLE_API_KEY="your-api-key"')
        print("\nGet your API key from: https://aistudio.google.com/app/apikey")
        sys.exit(1)

    # Initialize client
    client = genai.Client(api_key=api_key)

    # Find icon
    icon_path = find_icon()
    if not icon_path:
        print("Error: No icon file found.")
        print("\nExpected locations:")
        for p in ICON_PATHS:
            print(f"  - {p}")
        sys.exit(1)

    print(f"Using icon: {icon_path.name}")

    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Output: {OUTPUT_DIR}\n")

    # Try image generation models in order of preference
    models_to_try = [
        "gemini-3-pro-image-preview",
        "gemini-2.5-flash-image",
    ]

    model_name = None
    for test_model in models_to_try:
        try:
            print(f"Trying model: {test_model}...")
            test_response = client.models.generate_content(
                model=test_model,
                contents="Say hello",
                config=types.GenerateContentConfig(
                    response_modalities=["Text"]
                )
            )
            model_name = test_model
            print(f"Using {model_name}\n")
            break
        except Exception as e:
            error_msg = str(e)[:100]
            print(f"  Not available: {error_msg}")
            continue

    if not model_name:
        print("\nNo image generation model available.")
        print("Please check your API key has access to image generation models.")
        sys.exit(1)

    # Generate the feature graphic
    print("Generating feature graphic...")
    if generate_feature_graphic(client, model_name, icon_path):
        print(f"\n✓ Feature graphic generated successfully!")
        print(f"\nOutput: {OUTPUT_DIR / 'feature-graphic.png'}")
        print(f"\nDimensions: {OUTPUT_WIDTH}x{OUTPUT_HEIGHT}px")
        print("Ready for Google Play Store!")
    else:
        print("\n✗ Failed to generate feature graphic")
        print("\nTry running the script again or check your API key.")
        sys.exit(1)


if __name__ == "__main__":
    main()
