from desktop_use.client import DesktopUseClient
import time
import json
import os
import subprocess
from datetime import datetime

# Initialize client
client = DesktopUseClient("http://127.0.0.1:9375")

# Ensure the screenshot directory exists
os.makedirs("static/screenshots", exist_ok=True)

try:
    # The URL to open
    url = "https://dribbble.com/shots/popular"
    
    # Try different methods to open Chrome
    print("[*] Opening Chrome...")
    
    # Method 1: Try using open_url if the method exists
    try:
        if hasattr(client, 'open_url'):
            client.open_url(url, browser="chrome")
            print("Opened URL using client.open_url")
        else:
            # Method 2: Use subprocess to launch Chrome directly
            chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
            subprocess.Popen([chrome_path, url])
            print("Opened URL using subprocess")
    except Exception as open_error:
        print(f"Warning: Could not open Chrome automatically: {str(open_error)}")
        print("Please open Chrome manually and navigate to: " + url)
    
    # Wait for the page to load
    print("[*] Waiting for site to load...")
    time.sleep(5)

    print("[*] Capturing UI Tree...")
    
    # Check if capture_ui_tree method exists
    if hasattr(client, 'capture_ui_tree'):
        ui_tree = client.capture_ui_tree()
    else:
        # Create a mock UI tree for testing
        print("Note: Using mock UI data since capture_ui_tree method is not available")
        ui_tree = {
            "timestamp": datetime.now().isoformat(),
            "url": url,
            "title": "Popular Designs on Dribbble",
            "elements": [
                {"type": "header", "text": "Popular designs", "bounds": {"x": 0, "y": 0, "width": 100, "height": 50}},
                {"type": "gallery", "childCount": 20, "bounds": {"x": 0, "y": 50, "width": 1000, "height": 800}},
                {"type": "footer", "text": "© 2023 Dribbble", "bounds": {"x": 0, "y": 850, "width": 1000, "height": 100}}
            ]
        }

    # Save UI layout to JSON
    with open("ui_layout.json", "w", encoding="utf-8") as f:
        json.dump(ui_tree, f, indent=2)
    print("[✅] UI layout saved to ui_layout.json")

    # Capture and save the screenshot
    screenshot_path = "static/screenshots/sample_ui.png"
    
    # Check if capture_screenshot method exists
    if hasattr(client, 'capture_screenshot'):
        client.capture_screenshot(screenshot_path)
    else:
        # Try to use capture_screen if available, otherwise create a blank image
        print("Note: Creating a placeholder screenshot since capture_screenshot method is not available")
        try:
            if hasattr(client, 'capture_screen'):
                screenshot = client.capture_screen()
                # Save base64 image to file
                import base64
                with open(screenshot_path, "wb") as f:
                    f.write(base64.b64decode(screenshot.image_base64))
            else:
                # Create a simple colored rectangle as placeholder
                from PIL import Image, ImageDraw
                img = Image.new('RGB', (1280, 800), color = (73, 109, 137))
                d = ImageDraw.Draw(img)
                d.rectangle([(400, 300), (880, 500)], fill=(255, 255, 255))
                d.text((440, 400), "Mock Screenshot for Dribbble", fill=(0, 0, 0))
                img.save(screenshot_path)
        except Exception as img_error:
            print(f"Warning: Could not create screenshot: {str(img_error)}")
            # Create empty file as fallback
            with open(screenshot_path, "w") as f:
                f.write("")
    
    print(f"[📸] Screenshot saved to {screenshot_path}")

except Exception as e:
    print(f"[❌] Error: {str(e)}")
    # If the error mentions ui_tree or capture methods, recommend checking the version
    if "capture_ui_tree" in str(e) or "capture_screenshot" in str(e):
        print("\nNOTE: Make sure you're using the correct version of the DesktopUseClient library")
        print("that has the capture_ui_tree() and capture_screenshot() methods implemented.")