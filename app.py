import os
import logging
from flask import Flask, render_template, request, jsonify, flash, redirect, url_for
from werkzeug.utils import secure_filename
import base64
from PIL import Image
import pytesseract
import io
import re

# Configure logging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "braille-world-secret-key-2024")

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'webp'}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Braille Unicode mapping for English alphabet
BRAILLE_MAP = {
    'a': '⠁', 'b': '⠃', 'c': '⠉', 'd': '⠙', 'e': '⠑', 'f': '⠋', 'g': '⠛', 'h': '⠓',
    'i': '⠊', 'j': '⠚', 'k': '⠅', 'l': '⠇', 'm': '⠍', 'n': '⠝', 'o': '⠕', 'p': '⠏',
    'q': '⠟', 'r': '⠗', 's': '⠎', 't': '⠞', 'u': '⠥', 'v': '⠧', 'w': '⠺', 'x': '⠭',
    'y': '⠽', 'z': '⠵', ' ': '⠀', '.': '⠲', ',': '⠂', '?': '⠦', '!': '⠖', "'": '⠄',
    '-': '⠤', '(': '⠦', ')': '⠴', '"': '⠦', ':': '⠒', ';': '⠆', '1': '⠁', '2': '⠃',
    '3': '⠉', '4': '⠙', '5': '⠑', '6': '⠋', '7': '⠛', '8': '⠓', '9': '⠊', '0': '⠚'
}

# Comprehensive Hindi Braille mapping with matras and conjuncts
HINDI_BRAILLE_MAP = {
    # Independent vowels
    'अ': '⠁', 'आ': '⠜', 'इ': '⠊', 'ई': '⠔', 'उ': '⠥', 'ऊ': '⠳', 'ए': '⠑', 'ऐ': '⠌',
    'ओ': '⠕', 'औ': '⠪', 'अं': '⠁⠰', 'अः': '⠁⠱',
    
    # Consonants
    'क': '⠅', 'ख': '⠨', 'ग': '⠛', 'घ': '⠣', 'ङ': '⠒',
    'च': '⠉', 'छ': '⠡', 'ज': '⠚', 'झ': '⠯', 'ञ': '⠝',
    'ट': '⠞', 'ठ': '⠹', 'ड': '⠙', 'ढ': '⠮', 'ण': '⠼',
    'त': '⠞', 'थ': '⠹', 'द': '⠙', 'ध': '⠮', 'न': '⠝',
    'प': '⠏', 'फ': '⠋', 'ब': '⠃', 'भ': '⠘', 'म': '⠍',
    'य': '⠽', 'र': '⠗', 'ल': '⠇', 'व': '⠧',
    'श': '⠩', 'ष': '⠱', 'स': '⠎', 'ह': '⠓',
    
    # Matras (dependent vowel signs)
    'ा': '⠜', 'ि': '⠊', 'ी': '⠔', 'ु': '⠥', 'ू': '⠳', 'े': '⠑', 'ै': '⠌',
    'ो': '⠕', 'ौ': '⠪', 'ं': '⠰', 'ः': '⠱', '्': '⠈',
    
    # Common conjuncts and special characters
    'क्ष': '⠅⠈⠱', 'त्र': '⠞⠈⠗', 'ज्ञ': '⠚⠈⠝', 'श्र': '⠩⠈⠗',
    
    # Numerals
    '०': '⠚', '१': '⠁', '२': '⠃', '३': '⠉', '४': '⠙', '५': '⠑',
    '६': '⠋', '७': '⠛', '८': '⠓', '९': '⠊',
    
    # Punctuation
    ' ': '⠀', '।': '⠲', '?': '⠦', '!': '⠖', ',': '⠂', '.': '⠲',
    '(': '⠦', ')': '⠴', '"': '⠦', ':': '⠒', ';': '⠆', '-': '⠤'
}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def text_to_braille(text, language='english'):
    """Convert text to Braille Unicode with enhanced matra support"""
    if not text:
        return ""
    
    if language == 'hindi':
        return convert_hindi_to_braille(text)
    else:
        return convert_english_to_braille(text.lower())

def convert_english_to_braille(text):
    """Convert English text to Braille"""
    braille_text = ""
    for char in text:
        if char in BRAILLE_MAP:
            braille_text += BRAILLE_MAP[char]
        else:
            braille_text += char  # Keep unmapped characters
    return braille_text

def convert_hindi_to_braille(text):
    """Convert Hindi text to Braille with proper matra handling"""
    braille_text = ""
    i = 0
    
    while i < len(text):
        char = text[i]
        
        # Check for multi-character conjuncts first
        if i < len(text) - 2:
            three_char = text[i:i+3]
            if three_char in HINDI_BRAILLE_MAP:
                braille_text += HINDI_BRAILLE_MAP[three_char]
                i += 3
                continue
        
        # Check for two-character combinations
        if i < len(text) - 1:
            two_char = text[i:i+2]
            if two_char in HINDI_BRAILLE_MAP:
                braille_text += HINDI_BRAILLE_MAP[two_char]
                i += 2
                continue
        
        # Single character conversion
        if char in HINDI_BRAILLE_MAP:
            braille_text += HINDI_BRAILLE_MAP[char]
        else:
            # If character not found, try to handle it gracefully
            if ord(char) >= 0x0900 and ord(char) <= 0x097F:  # Devanagari range
                # Unknown Devanagari character, add a placeholder
                braille_text += "⠿"  # Braille pattern dots-123456
            else:
                braille_text += char
        
        i += 1
    
    return braille_text

def extract_text_from_image(image_path, language='english'):
    """Extract text from image using OCR"""
    try:
        # Configure Tesseract for different languages
        if language == 'hindi':
            config = '--oem 3 --psm 6 -l hin'
        else:
            config = '--oem 3 --psm 6 -l eng'
        
        # Extract text using Tesseract
        text = pytesseract.image_to_string(Image.open(image_path), config=config)
        return text.strip()
    except Exception as e:
        logging.error(f"OCR Error: {e}")
        return ""

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/text-to-braille')
def text_to_braille_page():
    return render_template('text_to_braille.html')

@app.route('/image-to-braille')
def image_to_braille_page():
    return render_template('image_to_braille.html')

@app.route('/braille-image-to-text')
def braille_image_to_text_page():
    return render_template('braille_image_to_text.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/api/text-to-braille', methods=['POST'])
def api_text_to_braille():
    """API endpoint for text to Braille conversion"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        language = data.get('language', 'english')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Convert to Braille
        braille_text = text_to_braille(text, language)
        
        return jsonify({
            'success': True,
            'original_text': text,
            'braille_text': braille_text,
            'language': language
        })
    
    except Exception as e:
        logging.error(f"Text to Braille API Error: {e}")
        return jsonify({'error': 'Conversion failed'}), 500

@app.route('/api/image-to-braille', methods=['POST'])
def api_image_to_braille():
    """API endpoint for image to Braille conversion"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        language = request.form.get('language', 'english')
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not file.filename or not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type'}), 400
        
        # Save uploaded file
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            # Extract text from image
            extracted_text = extract_text_from_image(filepath, language)
            
            if not extracted_text:
                return jsonify({'error': 'No text found in image'}), 400
            
            # Convert to Braille
            braille_text = text_to_braille(extracted_text, language)
            
            return jsonify({
                'success': True,
                'extracted_text': extracted_text,
                'braille_text': braille_text,
                'language': language
            })
        
        finally:
            # Clean up uploaded file
            if os.path.exists(filepath):
                os.remove(filepath)
    
    except Exception as e:
        logging.error(f"Image to Braille API Error: {e}")
        return jsonify({'error': 'Processing failed'}), 500

@app.errorhandler(413)
def too_large(e):
    flash("File is too large. Maximum size is 16MB.", "error")
    return redirect(request.url)

@app.errorhandler(404)
def not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def server_error(e):
    return render_template('500.html'), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
