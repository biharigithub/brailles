# Deployment Guide for Braille World

## Render Deployment Requirements

### Dependencies
The application includes all necessary dependencies in `pyproject.toml`:
- **Flask 3.1.1**: Web framework
- **Gunicorn 23.0.0**: WSGI HTTP server for production
- **Pillow 11.2.1**: Image processing for OCR
- **pytesseract 0.3.13**: OCR text extraction
- **psycopg2-binary 2.9.10**: PostgreSQL database adapter
- **requests 2.32.4**: HTTP library for external service calls
- **urllib3 2.4.0**: HTTP client library
- **Werkzeug 3.1.3**: WSGI utilities

### System Dependencies
Render automatically provides these system packages:
- **Tesseract OCR**: For image text extraction
- **Image libraries**: freetype, lcms2, libimagequant, libjpeg, libtiff, libwebp, openjpeg

### Environment Variables
Required environment variables for Render deployment:
- `SESSION_SECRET`: Auto-generated secure session key
- `DATABASE_URL`: PostgreSQL connection string (auto-configured)
- `PORT`: Application port (auto-configured by Render)

### Deployment Configuration
The application uses:
- **Entry Point**: `main.py` imports the Flask app
- **WSGI Server**: Gunicorn with single worker for optimal performance
- **Port Binding**: `0.0.0.0:$PORT` for container compatibility
- **Auto-scaling**: Configured for web service deployment

## Android Studio WebView Compatibility

### Speech Synthesis Features
- **Multi-interface Support**: Android, JavaInterface, custom events
- **Progressive Fallbacks**: 5-tier fallback system for speech synthesis
- **Java Integration**: Designed for Android Studio WebView environments
- **Audio Fallback**: Beep notifications when speech fails
- **Visual Feedback**: Modal displays with proper Hindi font support

### WebView-Specific Optimizations
- **Enhanced Detection**: Identifies Android Studio WebView environments
- **Custom Event System**: JavaScript-to-Java communication bridge
- **Chunked Processing**: Breaks long text into manageable speech segments
- **Multiple Retry Logic**: 3-attempt system with increasing delays
- **Cross-platform Compatibility**: Works in both web browsers and WebView

### APK Deployment Ready
The application is optimized for:
- **Java WebView Integration**: Direct Android native method calls
- **Event-driven Communication**: Custom event listeners for Android
- **Offline Capability**: Core functionality works without internet
- **Responsive Design**: Mobile-first Bootstrap 5 interface
- **High Performance**: Minimal resource usage for mobile devices

## File Upload Configuration
- **Maximum File Size**: 16MB limit
- **Supported Formats**: PNG, JPG, JPEG, GIF, BMP, TIFF, WEBP
- **Upload Directory**: `uploads/` with secure file handling
- **Temporary Processing**: Uses system temp directory for OCR

## Database Configuration
- **Development**: SQLite fallback when DATABASE_URL not set
- **Production**: PostgreSQL via Render's managed database
- **Session Management**: Secure cookie-based sessions
- **Migration Support**: Auto-creates tables on first run