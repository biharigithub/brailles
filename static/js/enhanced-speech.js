/**
 * Ultra-Compatible Speech Synthesis for Android WebView & Java Integration
 * Designed specifically for Android Studio WebView and APK deployment
 */

class AndroidCompatibleSpeech {
    constructor() {
        this.isSupported = 'speechSynthesis' in window;
        this.voices = [];
        this.currentUtterance = null;
        this.isAndroid = this.detectAndroid();
        this.isWebView = this.detectWebView();
        this.isJavaWebView = this.detectJavaWebView();
        this.queue = [];
        this.isPlaying = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        
        // Android-specific initialization
        this.setupAndroidInterface();
        this.initializeVoices();
        this.setupEventListeners();
        
        console.log('AndroidCompatibleSpeech initialized:', {
            isSupported: this.isSupported,
            isAndroid: this.isAndroid,
            isWebView: this.isWebView,
            isJavaWebView: this.isJavaWebView
        });
    }
    
    detectAndroid() {
        const userAgent = navigator.userAgent.toLowerCase();
        return userAgent.includes('android');
    }
    
    detectWebView() {
        const userAgent = navigator.userAgent.toLowerCase();
        return userAgent.includes('wv') || 
               (userAgent.includes('version/') && userAgent.includes('chrome')) ||
               userAgent.includes('webview');
    }
    
    detectJavaWebView() {
        // Detect Android Studio WebView or Java-based WebView
        return this.isAndroid && this.isWebView && 
               (typeof window.Android !== 'undefined' || 
                typeof window.JavaInterface !== 'undefined' ||
                navigator.userAgent.includes('AndroidStudio'));
    }
    
    setupAndroidInterface() {
        // Try to establish communication with Android native layer
        if (this.isAndroid) {
            // Method 1: Standard Android WebView interface
            if (typeof window.Android === 'undefined') {
                window.Android = {
                    speak: function(text, language) {
                        console.log('Android interface not available, using fallback');
                        return false;
                    }
                };
            }
            
            // Method 2: Alternative Java interface
            if (typeof window.JavaInterface === 'undefined') {
                window.JavaInterface = {
                    textToSpeech: function(text, language) {
                        console.log('Java interface not available, using fallback');
                        return false;
                    }
                };
            }
            
            // Method 3: Create custom event for Android communication
            this.setupAndroidEventSystem();
        }
    }
    
    setupAndroidEventSystem() {
        // Custom event system for Android communication
        document.addEventListener('androidSpeechReady', () => {
            console.log('Android speech system ready');
        });
        
        document.addEventListener('androidSpeechComplete', () => {
            this.isPlaying = false;
        });
        
        document.addEventListener('androidSpeechError', (event) => {
            console.error('Android speech error:', event.detail);
            this.isPlaying = false;
        });
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
        this.retryCount = 0;
        
        return new Promise((resolve, reject) => {
            // Stop any current speech
            this.stop();
            
            // Priority order for Android WebView
            if (this.isJavaWebView) {
                this.speakJavaWebView(text, detectedLanguage, resolve, reject);
            } else if (this.isAndroid && this.isWebView) {
                this.speakAndroidWebView(text, detectedLanguage, resolve, reject);
            } else if (this.isSupported) {
                this.speakStandard(text, detectedLanguage, resolve, reject);
            } else {
                this.fallbackMethod(text, resolve);
            }
        });
    }
    
    speakJavaWebView(text, language, resolve, reject) {
        console.log('Using Java WebView optimized speech method');
        
        // Method 1: Try Android native interface
        if (window.Android && typeof window.Android.speak === 'function') {
            try {
                const result = window.Android.speak(text, language);
                if (result !== false) {
                    this.isPlaying = true;
                    setTimeout(() => {
                        this.isPlaying = false;
                        resolve();
                    }, text.length * 100); // Estimate duration
                    return;
                }
            } catch (error) {
                console.error('Android native speech failed:', error);
            }
        }
        
        // Method 2: Try JavaInterface
        if (window.JavaInterface && typeof window.JavaInterface.textToSpeech === 'function') {
            try {
                const result = window.JavaInterface.textToSpeech(text, language);
                if (result !== false) {
                    this.isPlaying = true;
                    setTimeout(() => {
                        this.isPlaying = false;
                        resolve();
                    }, text.length * 100);
                    return;
                }
            } catch (error) {
                console.error('Java interface speech failed:', error);
            }
        }
        
        // Method 3: Custom event system
        this.tryAndroidEventSpeech(text, language, resolve, reject);
    }
    
    tryAndroidEventSpeech(text, language, resolve, reject) {
        // Dispatch custom event for Android to handle
        const speechEvent = new CustomEvent('requestSpeech', {
            detail: {
                text: text,
                language: language,
                timestamp: Date.now()
            }
        });
        
        document.dispatchEvent(speechEvent);
        
        // Wait for Android response or fallback
        let responded = false;
        
        const successHandler = () => {
            if (!responded) {
                responded = true;
                resolve();
            }
        };
        
        const errorHandler = () => {
            if (!responded) {
                responded = true;
                this.speakAdvancedFallback(text, language, resolve, reject);
            }
        };
        
        document.addEventListener('androidSpeechComplete', successHandler, { once: true });
        document.addEventListener('androidSpeechError', errorHandler, { once: true });
        
        // Timeout fallback
        setTimeout(() => {
            if (!responded) {
                responded = true;
                document.removeEventListener('androidSpeechComplete', successHandler);
                document.removeEventListener('androidSpeechError', errorHandler);
                this.speakAdvancedFallback(text, language, resolve, reject);
            }
        }, 2000);
    }
    
    speakAdvancedFallback(text, language, resolve, reject) {
        console.log('Using advanced fallback speech method');
        
        // Multi-attempt speech with different strategies
        if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            
            // Strategy based on retry count
            switch (this.retryCount) {
                case 1:
                    this.speakWithForceLoad(text, language, resolve, reject);
                    break;
                case 2:
                    this.speakInChunks(text, language, resolve, reject);
                    break;
                case 3:
                    this.speakWithAlternativeSettings(text, language, resolve, reject);
                    break;
                default:
                    this.fallbackMethod(text, resolve);
            }
        } else {
            this.fallbackMethod(text, resolve);
        }
    }
    
    speakWithForceLoad(text, language, resolve, reject) {
        // Force load voices and try again
        speechSynthesis.cancel();
        
        setTimeout(() => {
            speechSynthesis.getVoices();
            setTimeout(() => {
                this.speakStandard(text, language, resolve, reject);
            }, 200);
        }, 100);
    }
    
    speakWithAlternativeSettings(text, language, resolve, reject) {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Use minimal settings for maximum compatibility
        utterance.lang = language;
        utterance.rate = 0.5;  // Very slow
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // Don't set voice, let system choose
        
        utterance.onstart = () => {
            this.isPlaying = true;
        };
        
        utterance.onend = () => {
            this.isPlaying = false;
            resolve();
        };
        
        utterance.onerror = (error) => {
            console.error('Alternative settings speech error:', error);
            this.isPlaying = false;
            this.fallbackMethod(text, resolve);
        };
        
        this.currentUtterance = utterance;
        
        // Force speak with multiple attempts
        this.forceMultiAttemptSpeak(utterance);
    }
    
    forceMultiAttemptSpeak(utterance) {
        let attempts = 0;
        const maxAttempts = 5;
        
        const attemptSpeak = () => {
            attempts++;
            speechSynthesis.speak(utterance);
            
            // Check if speaking started
            setTimeout(() => {
                if (!speechSynthesis.speaking && !speechSynthesis.pending && attempts < maxAttempts) {
                    console.log(`Speech attempt ${attempts} failed, retrying...`);
                    speechSynthesis.cancel();
                    setTimeout(attemptSpeak, 100 * attempts); // Increasing delay
                }
            }, 100);
        };
        
        attemptSpeak();
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
        console.log('Using comprehensive fallback method for speech');
        
        // Try one final audio-based approach
        this.tryAudioAPIFallback(text).then(() => {
            resolve();
        }).catch(() => {
            // Create visual feedback as last resort
            this.showTextModal(text);
            resolve();
        });
    }
    
    tryAudioAPIFallback(text) {
        return new Promise((resolve, reject) => {
            // Try to create audio with text-to-speech service
            try {
                // Create a simple beep to indicate speech attempt
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
                
                setTimeout(() => {
                    resolve();
                }, 600);
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    showTextModal(text) {
        // Remove any existing modal
        const existingModal = document.getElementById('speech-fallback-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Detect language for proper display
        const isHindi = /[\u0900-\u097F]/.test(text);
        
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
            font-family: ${isHindi ? "'Noto Sans Devanagari', " : ""}-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        modal.innerHTML = `
            <div style="text-align: center; margin-bottom: 1rem;">
                <h3 style="margin: 0; color: #2563eb; font-size: 1.5rem;">
                    <i class="fas fa-volume-up" style="margin-right: 0.5rem;"></i>
                    ${isHindi ? 'पाठ सुनें' : 'Read Aloud'}
                </h3>
            </div>
            <div style="line-height: 1.8; color: #1e293b; font-size: ${isHindi ? '1.3rem' : '1.1rem'}; margin-bottom: 1.5rem; text-align: ${isHindi ? 'left' : 'left'};">
                ${text}
            </div>
            <div style="text-align: center;">
                <button onclick="this.closest('#speech-fallback-modal').remove()" 
                        style="background: #2563eb; color: white; border: none; padding: 0.75rem 2rem; 
                               border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: 600;">
                    ${isHindi ? 'बंद करें' : 'Close'}
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Auto-remove after 20 seconds for Hindi (more reading time needed)
        setTimeout(() => {
            if (modal.parentElement) {
                modal.remove();
            }
        }, isHindi ? 20000 : 15000);
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