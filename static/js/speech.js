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
        
        return new Promise((resolve, reject) => {
            try {
                // Stop any current speech
                this.stop();
                
                // Try fallback methods first for better Android compatibility
                if (this.tryFallbackSpeech(text, language)) {
                    resolve();
                    return;
                }
                
                // Use standard Web Speech API
                if (this.isSupported) {
                    this.speakWithWebAPI(text, language, resolve, reject);
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
            // Method 1: Force sync speech with chunks
            if (this.isSupported) {
                const chunks = this.chunkText(text, 100);
                let chunkIndex = 0;
                
                const speakChunk = () => {
                    if (chunkIndex >= chunks.length) return;
                    
                    const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);
                    utterance.lang = language;
                    utterance.rate = 0.8;
                    utterance.pitch = 1;
                    utterance.volume = 1;
                    
                    utterance.onend = () => {
                        chunkIndex++;
                        setTimeout(speakChunk, 100);
                    };
                    
                    utterance.onerror = (error) => {
                        console.error('Chunk speech error:', error);
                        chunkIndex++;
                        setTimeout(speakChunk, 100);
                    };
                    
                    speechSynthesis.speak(utterance);
                };
                
                speakChunk();
                console.log('Used Android WebView chunked speech');
                return true;
            }
        } catch (error) {
            console.error('Android WebView speech failed:', error);
        }
        
        return false;
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
    
    if (isAndroid && isWebView) {
        console.log('Android WebView detected, applying optimizations');
        
        // Enable hardware acceleration for better performance
        document.body.style.transform = 'translateZ(0)';
        
        // Optimize touch events
        document.addEventListener('touchstart', function() {}, { passive: true });
        
        // Preload speech synthesis
        if (typeof speechSynthesis !== 'undefined') {
            speechSynthesis.getVoices();
            
            // Trigger initial speech to activate the API
            const testUtterance = new SpeechSynthesisUtterance('');
            testUtterance.volume = 0;
            speechSynthesis.speak(testUtterance);
        }
    }
});

// Export for global use
window.speechUtils = {
    speak: (text, language) => window.enhancedSpeech.speak(text, language),
    stop: () => window.enhancedSpeech.stop(),
    isSupported: () => window.enhancedSpeech.isSupported
};

console.log('Enhanced Speech Synthesis loaded successfully');
