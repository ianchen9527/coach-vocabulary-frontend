#!/usr/bin/env python3
"""
Crop preview images for Apple App Store dimensions.

Takes images from previews-ai/ and crops them to Apple-supported dimensions.
Original images are not modified.

Usage: python tools/crop-for-apple.py

Supported Apple dimensions:
- 1284 x 2778px (iPhone 6.7" - default)
- 1242 x 2688px (iPhone 6.5")
"""

import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Error: Pillow is required. Install with: pip install Pillow")
    sys.exit(1)


# === CONFIGURATION ===

SCRIPT_DIR = Path(__file__).parent
INPUT_DIR = SCRIPT_DIR / "previews-ai"
OUTPUT_DIR = SCRIPT_DIR / "previews-apple"

# Apple App Store dimensions (portrait)
APPLE_DIMENSIONS = {
    "6.7": (1284, 2778),  # iPhone 14 Pro Max, 15 Pro Max
    "6.5": (1242, 2688),  # iPhone 11 Pro Max, XS Max
}

# Default to 6.7" (most common requirement)
DEFAULT_SIZE = "6.7"


def crop_center(image: Image.Image, target_width: int, target_height: int) -> Image.Image:
    """
    Crop image from center to target dimensions.
    If image is smaller than target, it will be scaled up first.
    """
    img_width, img_height = image.size

    # If image is smaller than target, scale it up proportionally
    if img_width < target_width or img_height < target_height:
        scale = max(target_width / img_width, target_height / img_height)
        new_width = int(img_width * scale)
        new_height = int(img_height * scale)
        image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
        img_width, img_height = image.size

    # Calculate crop box (center crop)
    left = (img_width - target_width) // 2
    top = (img_height - target_height) // 2
    right = left + target_width
    bottom = top + target_height

    return image.crop((left, top, right, bottom))


def main():
    print("\n=== Crop Previews for Apple App Store ===\n")

    # Get target dimensions
    size_key = DEFAULT_SIZE
    if len(sys.argv) > 1 and sys.argv[1] in APPLE_DIMENSIONS:
        size_key = sys.argv[1]

    target_width, target_height = APPLE_DIMENSIONS[size_key]
    print(f"Target: {target_width}x{target_height}px (iPhone {size_key}\")")

    # Check input directory
    if not INPUT_DIR.exists():
        print(f"\nError: Input directory not found: {INPUT_DIR}")
        print("Run generate-previews-ai.py first to create preview images.")
        sys.exit(1)

    # Find images
    images = list(INPUT_DIR.glob("*.png"))
    if not images:
        print(f"\nNo PNG images found in: {INPUT_DIR}")
        sys.exit(1)

    print(f"Found {len(images)} image(s) in {INPUT_DIR}")

    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Output: {OUTPUT_DIR}\n")

    # Process images
    success = 0
    for input_path in sorted(images):
        try:
            print(f"Processing: {input_path.name}")

            # Load image
            image = Image.open(input_path)
            original_size = image.size
            print(f"  Original: {original_size[0]}x{original_size[1]}")

            # Crop to Apple dimensions
            cropped = crop_center(image, target_width, target_height)

            # Save
            output_path = OUTPUT_DIR / input_path.name
            cropped.save(output_path, "PNG")

            size_kb = output_path.stat().st_size / 1024
            print(f"  Cropped:  {target_width}x{target_height} ({size_kb:.0f} KB)")
            print(f"  Saved:    {output_path.name}")
            success += 1

        except Exception as e:
            print(f"  Error: {e}")

    print(f"\n{'✓' if success > 0 else '✗'} Processed {success}/{len(images)} image(s)")

    if success > 0:
        print(f"\nOutput directory: {OUTPUT_DIR}")
        print(f"\nTo use iPhone 6.5\" dimensions instead:")
        print(f"  python tools/crop-for-apple.py 6.5")


if __name__ == "__main__":
    main()
