from convert_ui import send_image_to_groq

# Path to a sample screenshot (can be taken from screenpipe or manually added)
image_path = "static/screenshots/sample_ui.png"

# Call your Groq API function
result = send_image_to_groq(image_path)

# Print the result to verify
print("🧠 Groq Response:")
print(result)
