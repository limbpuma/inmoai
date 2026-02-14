"use client";

import { useState, useCallback, useEffect, useRef } from "react";

export type VoiceSearchStatus =
  | "idle"
  | "listening"
  | "processing"
  | "error";

export interface VoiceSearchError {
  type:
    | "not-supported"
    | "permission-denied"
    | "no-speech"
    | "network"
    | "aborted"
    | "unknown";
  message: string;
}

export interface UseVoiceSearchOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: VoiceSearchError) => void;
  onEnd?: (transcript: string) => void;
}

export function useVoiceSearch(options: UseVoiceSearchOptions = {}) {
  const {
    language = "es-ES",
    continuous = false,
    interimResults = true,
    onResult,
    onError,
    onEnd,
  } = options;

  const [status, setStatus] = useState<VoiceSearchStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<VoiceSearchError | null>(null);

  // Use lazy initializer to check support once during initial render
  const [isSupported] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef("");

  // Initialize Speech Recognition
  const initRecognition = useCallback(() => {
    if (typeof window === "undefined") return null;

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setError({
        type: "not-supported",
        message: "El reconocimiento de voz no está soportado en este navegador",
      });
      return null;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = language;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setStatus("listening");
      setError(null);
      finalTranscriptRef.current = "";
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimResult = "";
      let finalResult = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalResult += result[0].transcript;
        } else {
          interimResult += result[0].transcript;
        }
      }

      if (finalResult) {
        finalTranscriptRef.current += finalResult;
        setTranscript(finalTranscriptRef.current);
        onResult?.(finalTranscriptRef.current, true);
      }

      if (interimResult) {
        setInterimTranscript(interimResult);
        onResult?.(finalTranscriptRef.current + interimResult, false);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorType: VoiceSearchError["type"] = "unknown";
      let errorMessage = "Error desconocido";

      switch (event.error) {
        case "not-allowed":
        case "service-not-allowed":
          errorType = "permission-denied";
          errorMessage = "Permiso de micrófono denegado";
          break;
        case "no-speech":
          errorType = "no-speech";
          errorMessage = "No se detectó ninguna voz";
          break;
        case "network":
          errorType = "network";
          errorMessage = "Error de conexión";
          break;
        case "aborted":
          errorType = "aborted";
          errorMessage = "Reconocimiento cancelado";
          break;
        default:
          errorType = "unknown";
          errorMessage = `Error: ${event.error}`;
      }

      const voiceError: VoiceSearchError = {
        type: errorType,
        message: errorMessage,
      };

      setError(voiceError);
      setStatus("error");
      onError?.(voiceError);
    };

    recognition.onend = () => {
      setStatus("idle");
      setInterimTranscript("");

      if (finalTranscriptRef.current) {
        onEnd?.(finalTranscriptRef.current);
      }
    };

    return recognition;
  }, [language, continuous, interimResults, onResult, onError, onEnd]);

  // Start listening
  const startListening = useCallback(() => {
    if (!isSupported) {
      const err: VoiceSearchError = {
        type: "not-supported",
        message: "El reconocimiento de voz no está soportado en este navegador",
      };
      setError(err);
      onError?.(err);
      return;
    }

    // Stop any existing recognition
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    // Create new recognition instance
    const recognition = initRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;
    setTranscript("");
    setInterimTranscript("");
    setError(null);

    try {
      recognition.start();
    } catch (e) {
      // Recognition already started
      console.error("Error starting recognition:", e);
    }
  }, [isSupported, initRecognition, onError]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  // Abort listening
  const abortListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      setStatus("idle");
      setTranscript("");
      setInterimTranscript("");
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  return {
    // State
    status,
    transcript,
    interimTranscript,
    error,
    isSupported,
    isListening: status === "listening",

    // Actions
    startListening,
    stopListening,
    abortListening,
  };
}
