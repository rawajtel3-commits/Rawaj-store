import { useCallback, useEffect, useRef, useState } from 'react';

export type ArabicSpeechLocale = 'ar-SA' | 'ar-YE' | 'ar-EG';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

export function normalizeArabicVoiceCommand(rawText: string): string {
  const trimmed = rawText.trim().replace(/[،.؟!؛:]+$/g, '').trim();
  const stripped = trimmed
    .replace(
      /^(?:أريد|اريد|أبغى|ابغى|أرني|ارني|وريني|ورني|أعرض لي|اعرض لي|ابحث لي عن|ابحث عن|بحث عن|دور على|دور لي على|عايز|بدي)\s+/i,
      ''
    )
    .trim();
  return stripped || trimmed;
}

function mapSpeechErrorToArabic(errorCode: string): string {
  switch (errorCode) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'تم رفض إذن الميكروفون؛ يرجى السماح بالوصول للميكروفون من إعدادات المتصفح.';
    case 'no-speech':
      return 'لم يتم التقاط أي صوت. تأكد من التحدث بوضوح بالقرب من الميكروفون.';
    case 'audio-capture':
      return 'تعذر العثور على ميكروفون متصل أو أنه قيد الاستخدام حالياً.';
    case 'network':
      return 'يتطلب التعرف الصوتي اتصالاً نشطاً بالإنترنت.';
    case 'aborted':
      return '';
    default:
      return 'تعذر إتمام البحث الصوتي، يرجى المحاولة مرة أخرى.';
  }
}

export function useVoiceSearch(options: {
  onResult: (query: string) => void;
  initialLang?: ArabicSpeechLocale;
}) {
  const { onResult, initialLang = 'ar-SA' } = options;
  const [lang, setLang] = useState<ArabicSpeechLocale>(initialLang);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const isSupported = Boolean(getSpeechRecognitionCtor());

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors
      }
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError('متصفحك الحالي لا يدعم البحث الصوتي (Web Speech API). جرّب Chrome أو Edge أو تطبيق أندرويد.');
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }

    setError(null);
    setInterimTranscript('');

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let interim = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const transcript = res?.[0]?.transcript || '';
        if (res.isFinal) {
          finalText += transcript + ' ';
        } else {
          interim += transcript;
        }
      }

      if (interim.trim()) {
        setInterimTranscript(interim.trim());
      }

      if (finalText.trim()) {
        const cleaned = normalizeArabicVoiceCommand(finalText);
        setInterimTranscript('');
        onResultRef.current(cleaned);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      const msg = mapSpeechErrorToArabic(event.error);
      if (msg) setError(msg);
      setIsListening(false);
      setInterimTranscript('');
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setError('تعذر تشغيل الميكروفون حالياً، يرجى المحاولة مرة أخرى.');
      setIsListening(false);
    }
  }, [lang]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    interimTranscript,
    error,
    lang,
    setLang,
    startListening,
    stopListening,
    toggleListening,
    clearError,
  };
}
