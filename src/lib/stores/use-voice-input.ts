'use client';

import * as React from 'react';
import { api } from '@/lib/api-client';

interface UseVoiceInputOptions {
  onTranscript?: (text: string) => void;
  onError?: (message: string) => void;
}

interface UseVoiceInputReturn {
  recording: boolean;
  supported: boolean;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  transcribing: boolean;
}

/**
 * Browser mic capture → base64 → /api/transcribe (ASR) → onTranscript.
 * Falls back gracefully if getUserMedia / MediaRecorder is unavailable.
 */
export function useVoiceInput(opts: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const [recording, setRecording] = React.useState(false);
  const [transcribing, setTranscribing] = React.useState(false);
  const [supported] = React.useState<boolean>(
    typeof window !== 'undefined' &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof window.MediaRecorder !== 'undefined',
  );
  const mediaRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const streamRef = React.useRef<MediaStream | null>(null);
  const optsRef = React.useRef(opts);
  optsRef.current = opts;

  const cleanup = React.useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRef.current = null;
    chunksRef.current = [];
  }, []);

  const start = React.useCallback(async () => {
    if (!supported) {
      optsRef.current.onError?.('Voice input is not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        cleanup();
        if (blob.size === 0) {
          optsRef.current.onError?.('No audio captured.');
          return;
        }
        setTranscribing(true);
        try {
          const base64 = await blobToBase64(blob);
          const res = await api.post<{ text: string }>('/api/transcribe', {
            audio: base64,
            format: blob.type.includes('webm') ? 'webm' : 'wav',
          });
          const text = res.text?.trim();
          if (text) optsRef.current.onTranscript?.(text);
          else optsRef.current.onError?.('Could not transcribe audio. Please try again.');
        } catch (e) {
          optsRef.current.onError?.((e as Error).message || 'Transcription failed.');
        } finally {
          setTranscribing(false);
        }
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch (e) {
      cleanup();
      optsRef.current.onError?.(
        (e as Error).name === 'NotAllowedError'
          ? 'Microphone permission denied.'
          : 'Could not access microphone.',
      );
    }
  }, [supported, cleanup]);

  const stop = React.useCallback(async () => {
    if (mediaRef.current && mediaRef.current.state !== 'inactive') {
      mediaRef.current.stop();
    }
    setRecording(false);
  }, []);

  React.useEffect(() => () => cleanup(), [cleanup]);

  return { recording, supported, start, stop, transcribing };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // strip data-URL prefix
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
