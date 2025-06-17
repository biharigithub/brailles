/**
 * Enhanced Speech Synthesis for Android WebView Compatibility
 * Optimized for Braille World Application
 */

class AndroidCompatibleSpeech {
    constructor() {
        this.isSupported = 'speechSynthesis' in window;
        this.voices = [];
        this.currentUtterance = null;
        this.isAndroid = this.detectAndroid();
        this.isWebView = this.detectWebView();
        this.queue = [];
        this.isPlaying = false;
        
        this.initializeVoices();
        this.setupEventListeners();
        
        console.log('AndroidCompatibleSpeech initialized:', {
            isSupported: this.isSupported,
            isAndroid: this.isAndroid,
            isWebView: this.isWebView
        });
    }
    
    detectAndroid() {
        const userAgent = navigator.userAgent.toLowerCase();
        return userAgent.includes('android');
    }
    
    detectWebView() {
        const userAgent = navigator.userAgent.toLowerCase();
        return userAgent.includes('wv') || userAgent.includes('version/') && userAgent.includes('chrome');
    }
    
    initializeVoices() {
        const loadVoices = () => {
            this.voices = speechSynthesis.getVoices();
            console.log('Voices loaded:', this.voices.length);
            
            if (this.voices.length > 0) {
                this.voicesLoaded = true;
            }
        };
        
        // Load voices immediately
        loadVoices();
        
        // Handle voice loading for different browsers
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = loadVoices;
        }
        
        // Additional fallback for Android
        setTimeout(loadVoices, 1000);
        setTimeout(loadVoices, 2000);
    }
    
    setupEventListeners() {
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isPlaying) {
                this.pause();
            }
        });
        
        // Handle Android app state changes
        window.addEventListener('blur', () => {
            if (this.isAndroid && this.isPlaying) {
                this.pause();
            }
        });
    }
    
    detectLanguage(text) {
        // Enhanced language detection
        const hindiRegex = /[\u0900-\u097F]/;
        const englishRegex = /[a-zA-Z]/;
        
        const hasHindi = hindiRegex.test(text);
        const hasEnglish = englishRegex.test(text);
        
        if (hasHindi && !hasEnglish) {
            return 'hi-IN';
        } else if (hasEnglish && !hasHindi) {
            return 'en-US';
        } else if (hasHindi && hasEnglish) {
            // Mixed content - prefer Hindi for better support
            return 'hi-IN';
        }
        
        return 'en-US'; // Default fallback
    }
    
    getBestVoice(language) {
        if (!this.voices || this.voices.length === 0) {
            return null;
        }
        
        // Language preference mapping
        const langMap = {
            'hi-IN': ['hi-IN', 'hi_IN', 'hi', 'hindi'],
            'en-US': ['en-US', 'en_US', 'en', 'english'],
            'hindi': ['hi-IN', 'hi_IN', 'hi', 'hindi'],
            'english': ['en-US', 'en_US', 'en', 'english']
        };
        
        const targetLangs = langMap[language] || [language];
        
        // Prefer local voices for Android
        if (this.isAndroid) {
            for (const targetLang of targetLangs) {
                const localVoice = this.voices.find(voice => 
                    voice.localService && 
                    (voice.lang.toLowerCase().includes(targetLang.toLowerCase()) ||
                     voice.name.toLowerCase().includes(targetLang.toLowerCase()))
                );
                if (localVoice) return localVoice;
            }
        }
        
        // Fallback to any matching voice
        for (const targetLang of targetLangs) {
            const voice = this.voices.find(voice => 
                voice.lang.toLowerCase().includes(targetLang.toLowerCase()) ||
                voice.name.toLowerCase().includes(targetLang.toLowerCase())
            );
            if (voice) return voice;
        }
        
        // Return default voice if available
        return this.voices.find(voice => voice.default) || this.voices[0] || null;
    }
    
    speak(text, language = 'en-US') {
        if (!text || !text.trim()) {
            return Promise.resolve();
        }
        
        const detectedLanguage = this.detectLanguage(text) || language;
        
        return new Promise((resolve, reject) => {
            // Stop any current speech
            this.stop();
            
            if (this.isAndroid && this.isWebView) {
                this.speakAndroidWebView(text, detectedLanguage, resolve, reject);
            } else if (this.isSupported) {
                this.speakStandard(text, detectedLanguage, resolve, reject);
            } else {
                this.fallbackMethod(text, resolve);
            }
        });
    }
    
    speakAndroidWebView(text, language, resolve, reject) {
        console.log('Using Android WebView optimized speech');
        
        // Try native Android interface first
        if (window.Android && typeof window.Android.speak === 'function') {
            try {
                window.Android.speak(text, language);
                resolve();
                return;
            } catch (error) {
                console.error('Native Android speech failed:', error);
            }
        }
        
        // Use chunked approach for better Android compatibility
        this.speakInChunks(text, language, resolve, reject);
    }
    
    speakInChunks(text, language, resolve, reject) {
        const chunks = this.chunkText(text, 100);
        let currentIndex = 0;
        let hasStarted = false;
        
        const speakNextChunk = () => {
            if (currentIndex >= chunks.length) {
                resolve();
                return;
            }
            
            const chunk = chunks[currentIndex];
            const utterance = new SpeechSynthesisUtterance(chunk);
            
            // Android-optimized settings
            utterance.lang = language;
            utterance.rate = 0.7;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            
            // Set best voice
            const voice = this.getBestVoice(language);
            if (voice) {
                utterance.voice = voice;
            }
            
            utterance.onstart = () => {
                hasStarted = true;
                this.isPlaying = true;
                console.log(`Speaking chunk ${currentIndex + 1}/${chunks.length}`);
            };
            
            utterance.onend = () => {
                currentIndex++;
                setTimeout(speakNextChunk, 200); // Delay for Android
            };
            
            utterance.onerror = (error) => {
                console.error('Speech error:', error);
                currentIndex++;
                if (currentIndex < chunks.length) {
                    setTimeout(speakNextChunk, 500);
                } else {
                    this.isPlaying = false;
                    resolve();
                }
            };
            
            this.currentUtterance = utterance;
            
            // Enhanced Android WebView compatibility
            this.forceSpeechAndroid(utterance);
        };
        
        speakNextChunk();
        
        // Timeout fallback
        setTimeout(() => {
            if (!hasStarted) {
                this.fallbackMethod(text, resolve);
            }
        }, 3000);
    }
    
    forceSpeechAndroid(utterance) {
        // Cancel any existing speech
        if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
        }
        
        // Wait for cancel to complete
        setTimeout(() => {
            speechSynthesis.speak(utterance);
            
            // Double check for Android WebView
            setTimeout(() => {
                if (!speechSynthesis.speaking && !speechSynthesis.pending) {
                    console.log('Retrying speech for Android WebView');
                    speechSynthesis.speak(utterance);
                }
            }, 100);
        }, 100);
    }
    
    speakStandard(text, language, resolve, reject) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language;
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        const voice = this.getBestVoice(language);
        if (voice) {
            utterance.voice = voice;
        }
        
        utterance.onstart = () => {
            this.isPlaying = true;
        };
        
        utterance.onend = () => {
            this.isPlaying = false;
            resolve();
        };
        
        utterance.onerror = (error) => {
            console.error('Speech error:', error);
            this.isPlaying = false;
            reject(error);
        };
        
        this.currentUtterance = utterance;
        speechSynthesis.speak(utterance);
    }
    
    chunkText(text, maxLength) {
        if (text.length <= maxLength) {
            return [text];
        }
        
        const chunks = [];
        const sentences = text.split(/[.!?]+/).filter(s => s.trim());
        
        let currentChunk = '';
        
        for (const sentence of sentences) {
            const trimmedSentence = sentence.trim();
            if (!trimmedSentence) continue;
            
            if (currentChunk.length + trimmedSentence.length <= maxLength) {
                currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
            } else {
                if (currentChunk) {
                    chunks.push(currentChunk);
                }
                
                if (trimmedSentence.length > maxLength) {
                    // Split long sentences by words
                    const words = trimmedSentence.split(' ');
                    let wordChunk = '';
                    
                    for (const word of words) {
                        if (wordChunk.length + word.length <= maxLength) {
                            wordChunk += (wordChunk ? ' ' : '') + word;
                        } else {
                            if (wordChunk) {
                                chunks.push(wordChunk);
                            }
                            wordChunk = word;
                        }
                    }
                    
                    if (wordChunk) {
                        currentChunk = wordChunk;
                    }
                } else {
                    currentChunk = trimmedSentence;
                }
            }
        }
        
        if (currentChunk) {
            chunks.push(currentChunk);
        }
        
        return chunks.length > 0 ? chunks : [text];
    }
    
    stop() {
        if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
        }
        this.currentUtterance = null;
        this.isPlaying = false;
    }
    
    pause() {
        if (speechSynthesis.speaking) {
            speechSynthesis.pause();
        }
    }
    
    resume() {
        if (speechSynthesis.paused) {
            speechSynthesis.resume();
        }
    }
    
    fallbackMethod(text, resolve) {
        console.log('Using fallback method for speech');
        
        // Create visual feedback
        this.showTextModal(text);
        resolve();
    }
    
    showTextModal(text) {
        // Remove any existing modal
        const existingModal = document.getElementById('speech-fallback-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create modal
        const modal = document.createElement('div');
        modal.id = 'speech-fallback-modal';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 90%;
            max-height: 80%;
            overflow-y: auto;
            border: 2px solid #2563eb;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        modal.innerHTML = `
            <div style="text-align: center; margin-bottom: 1rem;">
                <h3 style="margin: 0; color: #2563eb; font-size: 1.5rem;">
                    <i class="fas fa-volume-up" style="margin-right: 0.5rem;"></i>
                    Read Aloud
                </h3>
            </div>
            <div style="line-height: 1.6; color: #1e293b; font-size: 1.1rem; margin-bottom: 1.5rem;">
                ${text}
            </div>
            <div style="text-align: center;">
                <button onclick="this.closest('#speech-fallback-modal').remove()" 
                        style="background: #2563eb; color: white; border: none; padding: 0.75rem 2rem; 
                               border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: 600;">
                    Close
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Auto-remove after 15 seconds
        setTimeout(() => {
            if (modal.parentElement) {
                modal.remove();
            }
        }, 15000);
    }
}

// Initialize enhanced speech synthesis
let enhancedSpeech;

document.addEventListener('DOMContentLoaded', function() {
    enhancedSpeech = new AndroidCompatibleSpeech();
    
    // Make it globally available
    window.enhancedSpeech = enhancedSpeech;
    
    console.log('Enhanced Speech Synthesis loaded and ready');
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AndroidCompatibleSpeech;
}