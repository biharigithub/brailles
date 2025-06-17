# Braille World Web Application

## Overview

Braille World is a Flask-based web application designed to make digital content accessible to the visually impaired community. The application provides three main services: Text to Braille conversion, Image to Braille conversion, and Braille Image to Text conversion. It features a responsive design with Bootstrap 5, real-time voice recognition, text-to-speech capabilities, and OCR (Optical Character Recognition) for image processing.

## System Architecture

The application follows a simple monolithic architecture built on Flask, designed for easy deployment and maintenance:

### Frontend Architecture
- **Framework**: Bootstrap 5 for responsive UI components
- **JavaScript**: Vanilla JavaScript with custom modules for speech synthesis and main functionality
- **CSS**: Custom styling with CSS variables for consistent theming
- **Templates**: Jinja2 templating engine with a base template for consistent navigation and layout

### Backend Architecture
- **Framework**: Flask (Python web framework)
- **Application Structure**: Single-file application (`app.py`) for simplicity
- **Image Processing**: PIL (Python Imaging Library) for image manipulation
- **OCR**: Tesseract OCR engine via pytesseract for text extraction from images
- **File Handling**: Werkzeug utilities for secure file uploads

## Key Components

### Core Services
1. **Text to Braille Converter**
   - Real-time text input with live Braille conversion
   - Voice recognition using Web Speech API
   - Text-to-speech functionality for accessibility
   - Support for English and Hindi languages

2. **Image to Braille Converter**
   - Image upload with OCR text extraction
   - Automatic Braille conversion of extracted text
   - Support for multiple image formats (PNG, JPG, JPEG, GIF, BMP, TIFF, WEBP)
   - Language selection for proper Braille mapping

3. **Braille Image to Text**
   - External service integration (redirects to deployed tool)
   - Provides bidirectional conversion capabilities

### Technical Components
- **Braille Mapping**: Unicode Braille character mappings for English and Hindi
- **Speech Synthesis**: Enhanced cross-platform speech synthesis with Android WebView compatibility
- **File Upload System**: Secure file handling with size limits (16MB) and type validation
- **Responsive Design**: Mobile-first approach with Bootstrap grid system

## Data Flow

### Text to Braille Flow
1. User inputs text via typing or voice recognition
2. Text is processed through language-specific Braille mapping
3. Braille output is displayed in real-time
4. Optional text-to-speech playback of original text

### Image to Braille Flow
1. User uploads image file
2. Server validates file type and size
3. Tesseract OCR extracts text from image
4. Extracted text is converted to Braille using appropriate language mapping
5. Both original text and Braille conversion are displayed

### File Processing Pipeline
- Upload → Validation → OCR Processing → Text Extraction → Braille Conversion → Display

## External Dependencies

### Python Packages
- **Flask 3.1.1**: Web framework
- **Pillow 11.2.1**: Image processing
- **pytesseract 0.3.13**: OCR functionality
- **Werkzeug 3.1.3**: WSGI utilities
- **Gunicorn 23.0.0**: WSGI HTTP server for production

### System Dependencies
- **Tesseract OCR**: External OCR engine
- **PostgreSQL**: Database support (configured but not actively used)
- **Image Libraries**: freetype, lcms2, libimagequant, libjpeg, libtiff, libwebp, openjpeg

### Frontend Dependencies
- **Bootstrap 5.3.0**: UI framework via CDN
- **Font Awesome 6.4.0**: Icons via CDN
- **Web Speech API**: Browser-native speech recognition and synthesis

## Deployment Strategy

### Production Configuration
- **WSGI Server**: Gunicorn with autoscale deployment target
- **Binding**: 0.0.0.0:5000 for container compatibility
- **File Uploads**: Local filesystem storage in `uploads/` directory
- **Session Management**: Secret key from environment variables with fallback

### Development Setup
- **Python Version**: 3.11+
- **Environment**: Nix-based development environment
- **Hot Reload**: Gunicorn with reload flag for development
- **Port Configuration**: Automatic port detection and binding

### Security Considerations
- File type validation for uploads
- Secure filename handling
- File size limits to prevent abuse
- Session secret key management
- Input sanitization for text processing

## Changelog

- June 17, 2025. Initial setup
- June 17, 2025. Enhanced navigation and Read Aloud functionality:
  - Added "Back" and "Back to Homepage" buttons to all service pages
  - Created dedicated Braille Image to Text service page with external redirect
  - Implemented advanced Android Studio WebView-compatible Read Aloud
  - Added automatic language detection for Hindi/English text
  - Enhanced speech synthesis with chunked processing and multiple fallback methods
  - Improved cross-platform compatibility for deployed applications and Android APKs

## User Preferences

Preferred communication style: Simple, everyday language.