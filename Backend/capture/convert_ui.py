import os 
from dotenv import load_dotenv
import json
import requests
import base64


load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY is not set")

def send_image_to_groq(image_path):
    debug_info = []
    debug_info.append(f"Starting image processing for {image_path}")
    
    # Check if UI layout exists
    if not os.path.exists("ui_layout.json"):
        return "Error: ui_layout.json not found. Run capture_ui.py first to generate it."
    
    # Load the UI data
    with open("ui_layout.json", "r", encoding="utf-8") as f:
        ui_data = json.load(f)
    debug_info.append(f"Loaded UI data with {len(json.dumps(ui_data))} characters")
    
    # Check if image exists
    if not os.path.exists(image_path):
        debug_info.append(f"Image not found at {image_path}")
        return f"Error: Image file not found at {image_path}\nDebug: {', '.join(debug_info)}"
    
    # Read image and encode as base64
    try:
        with open(image_path, "rb") as img_file:
            image_data = base64.b64encode(img_file.read()).decode('utf-8')
        debug_info.append(f"Loaded image with {len(image_data)} base64 characters")
    except Exception as e:
        debug_info.append(f"Error reading image: {str(e)}")
        return f"Error reading image file: {str(e)}\nDebug: {', '.join(debug_info)}"
    
    # Since Llama 3 doesn't support image inputs, let's modify our approach
    groq_api_url = "https://api.groq.com/openai/v1/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    
    # Prepare UI data as a formatted string
    ui_data_str = json.dumps(ui_data, indent=2)
    
    # For Llama 3, we'll use text-only prompt without image
    payload = {
        "model": "llama3-8b-8192",
        "messages": [
            {
                "role": "system", 
                "content": "You are a UI expert that converts UI descriptions into JSX React components."
            },
            {
                "role": "user",
                "content": f"Here is a UI layout JSON from a webpage. Convert this into a clean, modern JSX React component with styled-components. Use best practices and make it responsive. Here's the UI data:\n\n{ui_data_str}"
            }
        ],
        "max_tokens": 4000
    }
    
    debug_info.append(f"Prepared API payload with model {payload['model']}")
    
    try:
        debug_info.append("Sending request to Groq API...")
        response = requests.post(groq_api_url, headers=headers, json=payload)
        debug_info.append(f"Received response with status code {response.status_code}")
        
        if response.status_code == 200:
            response_data = response.json()
            debug_info.append("Successfully parsed JSON response")
            
            if 'choices' in response_data and len(response_data['choices']) > 0:
                jsx_content = response_data['choices'][0]['message']['content']
                debug_info.append(f"Extracted JSX content with {len(jsx_content)} characters")
                
                # Save the output JSX code to a file
                with open("generated_ui.jsx", "w", encoding="utf-8") as f:
                    f.write(jsx_content)
                
                return f"JSX code has been generated and saved to generated_ui.jsx\nDebug: {', '.join(debug_info)}"
            else:
                debug_info.append(f"Unexpected response format: {json.dumps(response_data)[:200]}...")
                return f"Error: Unexpected response format\nDebug: {', '.join(debug_info)}"
        else:
            debug_info.append(f"Error response: {response.text[:200]}...")
            return f"Error: {response.status_code} - {response.text}\nDebug: {', '.join(debug_info)}"
    except Exception as e:
        debug_info.append(f"Exception: {str(e)}")
        return f"Request error: {str(e)}\nDebug: {', '.join(debug_info)}"
