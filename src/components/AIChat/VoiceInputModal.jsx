import { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Mic } from 'lucide-react';

const VoiceInputModal = ({ 
  isOpen, 
  onClose, 
  onSubmit 
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  
  const recognitionRef = useRef(null);
  const silenceTimeoutRef = useRef(null);

  // Use refs to hold the latest callbacks without causing re-renders
  const onSubmitRef = useRef(onSubmit);
  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const handleClose = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    onCloseRef.current();
  }, [isListening]);

  // Setup speech recognition once on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      const recognition = recognitionRef.current;
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }

        const currentTranscript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        
        setTranscript(currentTranscript);

        silenceTimeoutRef.current = setTimeout(() => {
          if (currentTranscript.trim()) {
            onSubmitRef.current(currentTranscript);
          }
          handleClose();
        }, 1500); // 1.5 seconds of silence
      };

      recognition.onerror = (event) => {
        // "no-speech" and "aborted" are common and not always errors.
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.error('Speech recognition error', event.error);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        // Let the timeout handle submission.
      };
    } else {
      console.warn("SpeechRecognition API not supported in this browser.");
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once

  // Control listening state based on modal visibility
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      setTranscript('');
      try {
        if (recognitionRef.current && !isListening) {
          recognitionRef.current.start();
        }
      } catch (e) {
        if (e.name !== 'InvalidStateError') { // Ignore if already started
          console.error("Could not start recognition:", e);
        }
      }
    } else {
      const timer = setTimeout(() => {
        setIsAnimating(false);
        if (recognitionRef.current && isListening) {
          recognitionRef.current.stop();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isListening]);

  if (!isOpen && !isAnimating) return null;

  const modalContent = (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div 
        className={`relative glass-panel max-w-lg w-full transform transition-all duration-300 ${
          isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
      >
        <div className="p-8 text-center">
          <div className="flex justify-center items-center mb-6">
            <div className={`p-4 rounded-full ${isListening ? 'bg-red-500/20 animate-pulse' : 'bg-cyan-500/20'}`}>
              <Mic size={32} className={isListening ? 'text-red-400' : 'text-cyan-400'} />
            </div>
          </div>
          
          <h3 className="text-2xl font-light text-white mb-4">
            {isListening ? 'Listening...' : 'Starting...'}
          </h3>
          
          <p className="text-white/70 min-h-[5em] leading-relaxed text-lg">
            {transcript || 'Say something... your words will appear here.'}
          </p>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(
    modalContent,
    document.body
  );
};

export default VoiceInputModal; 