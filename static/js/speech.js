// Enhanced Speech Synthesis for Cross-Platform Compatibility
// Especially optimized for Android Studio WebView

class EnhancedSpeechSynthesis {
    constructor() {
        this.isSupported = this.checkSupport();
        this.voices = [];
        this.currentUtterance = null;
        this.fallbackMethod = null;
        
        this.initializeVoices();
        this.setupFallbackMethods();
        
        console.log('EnhancedSpeechSynthesis initialized:', {
            isSupported: this.isSupported,
            voicesLoaded: this.voices.length,
            fallbackMethod: this.fallbackMethod
        });
    }
    
    checkSupport() {
        return (
            typeof speechSynthesis !== 'undefined' &&
            typeof SpeechSynthesisUtterance !== 'undefined'
        );
    }
    
    initializeVoices() {
        if (!this.isSupported) return;
        
        const loadVoices = () => {
            this.voices = speechSynthesis.getVoices();
            console.log('Voices loaded:', this.voices.length);
        };
        
        loadVoices();
        
        // Voices might load asynchronously
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = loadVoices;
        }
        
        // Fallback for Android WebView
        setTimeout(loadVoices, 1000);
    }
    
    setupFallbackMethods() {
        // Detect Android WebView
        const isAndroidWebView = /Android.*wv\)/.test(navigator.userAgent);
        const isAndroidStudio = /Android.*Version\/\d+\.\d+.*Chrome/.test(navigator.userAgent);
        
        if (isAndroidWebView || isAndroidStudio) {
            this.fallbackMethod = 'android';
            console.log('Android WebView detected, using fallback methods');
        }
        
        // Check for alternative speech APIs
        if (typeof window.Android !== 'undefined' && window.Android.speak) {
            this.fallbackMethod = 'native_android';
            console.log('Native Android speech interface detected');
        }
    }
    
    getVoiceForLanguage(language) {
        if (!this.voices.length) {
            this.initializeVoices();
        }
        
        // Language mapping
        const langMap = {
            'en-US': ['en-US', 'en_US', 'en'],
            'hi-IN': ['hi-IN', 'hi_IN', 'hi'],
            'english': ['en-US', 'en_US', 'en'],
            'hindi': ['hi-IN', 'hi_IN', 'hi']
        };
        
        const targetLangs = langMap[language] || [language];
        
        for (const targetLang of targetLangs) {
            const voice = this.voices.find(v => 
                v.lang.toLowerCase().includes(targetLang.toLowerCase()) ||
                v.name.toLowerCase().includes(targetLang.toLowerCase())
            );
            if (voice) return voice;
        }
        
        return null;
    }
    
    speak(text, language = 'en-US') {
        if (!text || !text.trim()) {
            console.warn('No text provided for speech synthesis');
            return Promise.resolve();
        }
        
        // Auto-detect language if not specified properly
        const detectedLanguage = this.detectLanguage(text) || language;
        
        return new Promise((resolve, reject) => {
            try {
                // Stop any current speech
                this.stop();
                
                // Try fallback methods first for better Android compatibility
                if (this.tryFallbackSpeech(text, detectedLanguage)) {
                    resolve();
                    return;
                }
                
                // Use standard Web Speech API
                if (this.isSupported) {
                    this.speakWithWebAPI(text, detectedLanguage, resolve, reject);
                } else {
                    console.warn('Speech synthesis not supported');
                    this.showSpeechNotSupportedMessage();
                    resolve();
                }
            } catch (error) {
                console.error('Speech synthesis error:', error);
                reject(error);
            }
        });
    }
    
    detectLanguage(text) {
        // Simple language detection based on character sets
        const hindiRegex = /[\u0900-\u097F]/;
        const englishRegex = /[a-zA-Z]/;
        
        const hasHindi = hindiRegex.test(text);
        const hasEnglish = englishRegex.test(text);
        
        if (hasHindi && !hasEnglish) {
            return 'hi-IN';
        } else if (hasEnglish && !hasHindi) {
            return 'en-US';
        } else if (hasHindi && hasEnglish) {
            // Mixed text - use Hindi if it's predominant
            const hindiMatches = text.match(hindiRegex) || [];
            const englishMatches = text.match(englishRegex) || [];
            return hindiMatches.length > englishMatches.length ? 'hi-IN' : 'en-US';
        }
        
        return null; // Use provided language
    }
    
    tryFallbackSpeech(text, language) {
        // Native Android interface (if app provides it)
        if (this.fallbackMethod === 'native_android' && typeof window.Android !== 'undefined') {
            try {
                window.Android.speak(text, language);
                console.log('Used native Android speech interface');
                return true;
            } catch (error) {
                console.error('Native Android speech failed:', error);
            }
        }
        
        // Android WebView specific workarounds
        if (this.fallbackMethod === 'android') {
            return this.androidWebViewSpeech(text, language);
        }
        
        // Try to trigger speech through user interaction
        if (this.triggerSpeechThroughUserAction(text, language)) {
            return true;
        }
        
        return false;
    }
    
    androidWebViewSpeech(text, language) {
        try {
            // Method 1: Multiple attempts with different configurations
            if (this.isSupported) {
                // Try immediate speech first
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = language;
                utterance.rate = 0.8;
                utterance.pitch = 1;
                utterance.volume = 1;
                
                // Force voice selection for better compatibility
                const voices = speechSynthesis.getVoices();
                const preferredVoice = voices.find(voice => 
                    voice.lang.includes(language.split('-')[0]) || 
                    voice.name.toLowerCase().includes(language.split('-')[0])
                );
                
                if (preferredVoice) {
                    utterance.voice = preferredVoice;
                    console.log('Using preferred voice for Android:', preferredVoice.name);
                }
                
                // Add multiple event handlers for reliability
                let speechCompleted = false;
                
                utterance.onstart = () => {
                    console.log('Android WebView speech started');
                };
                
                utterance.onend = () => {
                    if (!speechCompleted) {
                        speechCompleted = true;
                        console.log('Android WebView speech completed');
                    }
                };
                
                utterance.onerror = (error) => {
                    console.error('Android WebView speech error:', error);
                    if (!speechCompleted) {
                        // Try chunked fallback
                        this.androidWebViewChunkedSpeech(text, language);
                    }
                };
                
                // Clear any existing speech
                speechSynthesis.cancel();
                
                // Wait a moment then speak
                setTimeout(() => {
                    speechSynthesis.speak(utterance);
                }, 200);
                
                console.log('Used Android WebView direct speech');
                return true;
            }
        } catch (error) {
            console.error('Android WebView speech failed:', error);
            // Try chunked method as fallback
            return this.androidWebViewChunkedSpeech(text, language);
        }
        
        return false;
    }
    
    androidWebViewChunkedSpeech(text, language) {
        try {
            const chunks = this.chunkText(text, 80); // Smaller chunks for better reliability
            let chunkIndex = 0;
            
            const speakChunk = () => {
                if (chunkIndex >= chunks.length) {
                    console.log('Android WebView chunked speech completed');
                    return;
                }
                
                const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);
                utterance.lang = language;
                utterance.rate = 0.7; // Slower for better processing
                utterance.pitch = 1;
                utterance.volume = 1;
                
                utterance.onend = () => {
                    chunkIndex++;
                    setTimeout(speakChunk, 300); // Longer pause between chunks
                };
                
                utterance.onerror = (error) => {
                    console.error('Chunk speech error:', error);
                    chunkIndex++;
                    setTimeout(speakChunk, 300);
                };
                
                speechSynthesis.speak(utterance);
            };
            
            speakChunk();
            console.log('Used Android WebView chunked speech fallback');
            return true;
        } catch (error) {
            console.error('Android WebView chunked speech failed:', error);
            return false;
        }
    }
    
    triggerSpeechThroughUserAction(text, language) {
        // Create a temporary button to trigger speech on user interaction
        const button = document.createElement('button');
        button.style.position = 'fixed';
        button.style.top = '10px';
        button.style.right = '10px';
        button.style.zIndex = '9999';
        button.style.padding = '10px';
        button.style.background = '#007bff';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '5px';
        button.innerHTML = '<i class="fas fa-volume-up"></i> Tap to Hear';
        
        button.onclick = () => {
            if (this.isSupported) {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = language;
                speechSynthesis.speak(utterance);
            }
            document.body.removeChild(button);
        };
        
        document.body.appendChild(button);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (button.parentNode) {
                document.body.removeChild(button);
            }
        }, 10000);
        
        return true;
    }
    
    speakWithWebAPI(text, language, resolve, reject) {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set language
        utterance.lang = language;
        
        // Find and set appropriate voice
        const voice = this.getVoiceForLanguage(language);
        if (voice) {
            utterance.voice = voice;
            console.log('Using voice:', voice.name, voice.lang);
        }
        
        // Configure speech parameters
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        // Set up event handlers
        utterance.onstart = () => {
            console.log('Speech started');
        };
        
        utterance.onend = () => {
            console.log('Speech ended');
            this.currentUtterance = null;
            resolve();
        };
        
        utterance.onerror = (error) => {
            console.error('Speech error:', error);
            this.currentUtterance = null;
            
            // Try fallback on error
            if (this.tryFallbackOnError(text, language)) {
                resolve();
            } else {
                reject(error);
            }
        };
        
        // Store reference and speak
        this.currentUtterance = utterance;
        
        // Ensure speechSynthesis is ready
        if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
        }
        
        // Add delay for better compatibility
        setTimeout(() => {
            speechSynthesis.speak(utterance);
        }, 100);
    }
    
    tryFallbackOnError(text, language) {
        console.log('Trying fallback after error');
        
        // Try with different voice
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language;
        utterance.rate = 0.8;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        // Use default voice
        const defaultVoice = this.voices.find(v => v.default) || this.voices[0];
        if (defaultVoice) {
            utterance.voice = defaultVoice;
        }
        
        try {
            speechSynthesis.speak(utterance);
            return true;
        } catch (error) {
            console.error('Fallback speech also failed:', error);
            return false;
        }
    }
    
    chunkText(text, maxLength) {
        const words = text.split(' ');
        const chunks = [];
        let currentChunk = '';
        
        for (const word of words) {
            if (currentChunk.length + word.length + 1 <= maxLength) {
                currentChunk += (currentChunk ? ' ' : '') + word;
            } else {
                if (currentChunk) chunks.push(currentChunk);
                currentChunk = word;
            }
        }
        
        if (currentChunk) chunks.push(currentChunk);
        return chunks;
    }
    
    stop() {
        if (this.isSupported && speechSynthesis.speaking) {
            speechSynthesis.cancel();
        }
        this.currentUtterance = null;
    }
    
    pause() {
        if (this.isSupported && speechSynthesis.speaking) {
            speechSynthesis.pause();
        }
    }
    
    resume() {
        if (this.isSupported && speechSynthesis.paused) {
            speechSynthesis.resume();
        }
    }
    
    showSpeechNotSupportedMessage() {
        if (window.BrailleWorld) {
            window.BrailleWorld.showNotification(
                'Speech synthesis is not supported in this browser. Please try using a different browser or device.',
                'warning'
            );
        }
    }
}

// Initialize enhanced speech synthesis
window.enhancedSpeech = new EnhancedSpeechSynthesis();

// Additional Android-specific optimizations
document.addEventListener('DOMContentLoaded', function() {
    const userAgent = navigator.userAgent;
    const isAndroid = /Android/i.test(userAgent);
    const isWebView = /wv\)/.test(userAgent);
    const isAndroidStudio = /Android.*Version\/\d+\.\d+.*Chrome/.test(userAgent);
    
    if (isAndroid && (isWebView || isAndroidStudio)) {
        console.log('Android WebView/Studio detected, applying comprehensive optimizations');
        
        // Enable hardware acceleration for better performance
        document.body.style.transform = 'translateZ(0)';
        document.body.style.webkitTransform = 'translateZ(0)';
        
        // Optimize touch events
        document.addEventListener('touchstart', function() {}, { passive: true });
        document.addEventListener('touchmove', function() {}, { passive: true });
        
        // Enhanced speech synthesis initialization
        if (typeof speechSynthesis !== 'undefined') {
            // Multiple attempts to load voices
            let voiceLoadAttempts = 0;
            const maxVoiceLoadAttempts = 5;
            
            const loadVoices = () => {
                const voices = speechSynthesis.getVoices();
                voiceLoadAttempts++;
                
                if (voices.length > 0) {
                    console.log(`Voices loaded successfully on attempt ${voiceLoadAttempts}:`, voices.length);
                    
                    // Trigger initial speech to activate the API with actual voice
                    const testUtterance = new SpeechSynthesisUtterance('test');
                    testUtterance.volume = 0.01; // Very low but not zero
                    testUtterance.rate = 0.1;
                    testUtterance.pitch = 1;
                    
                    // Use first available voice
                    if (voices[0]) {
                        testUtterance.voice = voices[0];
                    }
                    
                    speechSynthesis.speak(testUtterance);
                } else if (voiceLoadAttempts < maxVoiceLoadAttempts) {
                    setTimeout(loadVoices, 500);
                }
            };
            
            // Initial load
            loadVoices();
            
            // Event-based loading
            if (speechSynthesis.onvoiceschanged !== undefined) {
                speechSynthesis.onvoiceschanged = loadVoices;
            }
            
            // Force wake up speech synthesis for Android
            setTimeout(() => {
                if (speechSynthesis.paused) {
                    speechSynthesis.resume();
                }
            }, 1000);
        }
        
        // Add Android-specific CSS optimizations
        const style = document.createElement('style');
        style.textContent = `
            * {
                -webkit-tap-highlight-color: transparent;
                -webkit-touch-callout: none;
                -webkit-user-select: none;
                user-select: none;
            }
            
            input, textarea, button {
                -webkit-user-select: text;
                user-select: text;
            }
            
            .btn {
                -webkit-transform: translateZ(0);
                transform: translateZ(0);
            }
        `;
        document.head.appendChild(style);
    }
});

// Export for global use
window.speechUtils = {
    speak: (text, language) => window.enhancedSpeech.speak(text, language),
    stop: () => window.enhancedSpeech.stop(),
    isSupported: () => window.enhancedSpeech.isSupported
};

console.log('Enhanced Speech Synthesis loaded successfully');
