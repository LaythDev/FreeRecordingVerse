import { useState, useRef, useCallback, useEffect } from 'react';
import { RecordingMode, RecordingSettings, Recording, RecordingState } from '@shared/types';

const DEFAULT_SETTINGS: RecordingSettings = {
  quality: "720",
  frameRate: "30",
  includeAudio: true,
  showCursor: true,
};

// Helper function to format time display
const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

export function useAdvancedRecorder() {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    recordingTime: 0,
    recordingMode: "screen",
    settings: DEFAULT_SETTINGS,
    mediaStream: null,
    mediaRecorder: null,
    recordedChunks: [],
    recording: null,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  // Generate video constraints based on settings
  const getVideoConstraints = useCallback(() => {
    const qualityMap: Record<string, any> = {
      "1080": { width: { ideal: 1920 }, height: { ideal: 1080 } },
      "720": { width: { ideal: 1280 }, height: { ideal: 720 } },
      "480": { width: { ideal: 854 }, height: { ideal: 480 } }
    };
    
    const frameRateMap: Record<string, any> = {
      "60": { frameRate: { ideal: 60 } },
      "30": { frameRate: { ideal: 30 } },
      "24": { frameRate: { ideal: 24 } }
    };

    return {
      ...qualityMap[state.settings.quality],
      ...frameRateMap[state.settings.frameRate],
      cursor: state.settings.showCursor ? "always" : "never"
    };
  }, [state.settings]);

  const updateSettings = useCallback((newSettings: Partial<RecordingSettings>) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...newSettings }
    }));
  }, []);

  const setRecordingMode = useCallback((mode: RecordingMode) => {
    setState(prev => ({ ...prev, recordingMode: mode }));
  }, []);

  // Timer management functions
  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    startTimeRef.current = Date.now() - (pausedTimeRef.current || 0);
    
    timerRef.current = setInterval(() => {
      const elapsedTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setState(prevState => ({
        ...prevState,
        recordingTime: elapsedTime
      }));
    }, 100); // Update more frequently for accuracy
  }, []);
  
  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      pausedTimeRef.current = Date.now() - startTimeRef.current;
    }
  }, []);
  
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startTimeRef.current = 0;
    pausedTimeRef.current = 0;
  }, []);

  const requestPermissions = useCallback(async () => {
    try {
      // Stop existing streams
      if (state.mediaStream) {
        state.mediaStream.getTracks().forEach(track => track.stop());
      }

      let stream: MediaStream;

      // Request media based on the recording mode
      if (state.recordingMode === "screen") {
        try {
          const displayMediaOptions = {
            video: {
              ...getVideoConstraints(),
              displaySurface: "monitor",
            },
            audio: state.settings.includeAudio,
            selfBrowserSurface: "include",
            systemAudio: state.settings.includeAudio ? "include" : "exclude"
          };
          
          // getDisplayMedia might not be fully typed in some TS versions
          stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions as any);
          
          // If audio is enabled and browser doesn't support system audio capture,
          // try to capture microphone as fallback
          if (state.settings.includeAudio && !stream.getAudioTracks().length) {
            try {
              const audioStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true
                }
              });
              
              audioStream.getAudioTracks().forEach(track => {
                stream.addTrack(track);
              });
            } catch (audioErr) {
              console.warn("Could not add microphone audio:", audioErr);
            }
          }
        } catch (err) {
          console.error("Error accessing screen:", err);
          throw new Error("Failed to access your screen. Please check permissions and try again.");
        }
      } else if (state.recordingMode === "camera") {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: getVideoConstraints(),
            audio: state.settings.includeAudio ? {
              echoCancellation: true,
              noiseSuppression: true
            } : false
          });
        } catch (err) {
          console.error("Error accessing camera:", err);
          throw new Error("Failed to access your camera. Please check permissions and try again.");
        }
      } else if (state.recordingMode === "audio") {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            },
            video: false
          });
        } catch (err) {
          console.error("Error accessing microphone:", err);
          throw new Error("Failed to access your microphone. Please check permissions and try again.");
        }
      } else {
        throw new Error(`Unsupported recording mode: ${state.recordingMode}`);
      }

      // Handle stream ending (e.g., user stops sharing screen)
      stream.getTracks().forEach(track => {
        track.onended = () => {
          console.log("Media track ended");
          if (state.isRecording) {
            stopRecording();
          }
        };
      });

      setState(prev => ({ ...prev, mediaStream: stream }));
      return stream;
    } catch (error) {
      console.error("Error getting permissions:", error);
      throw error;
    }
  }, [state.recordingMode, state.settings, state.mediaStream, state.isRecording, getVideoConstraints]);

  const startRecording = useCallback(async () => {
    try {
      // If paused, just resume
      if (state.isPaused && state.mediaRecorder) {
        state.mediaRecorder.resume();
        startTimer();
        setState(prev => ({ ...prev, isRecording: true, isPaused: false }));
        return;
      }

      // Otherwise start a new recording
      const stream = await requestPermissions();
      chunksRef.current = [];

      // Create optimal recorder options for high quality
      const options: MediaRecorderOptions = { 
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: state.settings.quality === "1080" ? 8000000 : 
                             state.settings.quality === "720" ? 5000000 : 2500000,
        audioBitsPerSecond: 128000
      };
      
      // Try different codecs if vp9 isn't supported
      if (!MediaRecorder.isTypeSupported(options.mimeType || '')) {
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
          options.mimeType = 'video/webm;codecs=vp8,opus';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
          options.mimeType = 'video/webm';
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
          options.mimeType = 'video/mp4';
        }
      }

      // Handle audio only mode
      if (state.recordingMode === "audio") {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          options.mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          options.mimeType = 'audio/webm';
        }
        delete options.videoBitsPerSecond;
      }

      console.log("Starting recording with options:", options);

      // Reset recording state
      setState(prev => ({
        ...prev,
        recordingTime: 0,
        recording: null,
        recordedChunks: []
      }));
      
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;
      startTimer();

      // Create and setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, options);
      
      // Set up data collection
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      // Handle recorder stopping
      mediaRecorder.onstop = () => {
        console.log("MediaRecorder stopped, processing recording...");
        finishRecording();
      };
      
      // Handle recorder errors
      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        stopRecording();
      };

      setState(prev => ({ 
        ...prev, 
        mediaRecorder,
        mediaStream: stream,
        isRecording: true,
        isPaused: false
      }));

      // Start recording with small timeslices for better real-time performance
      mediaRecorder.start(200); // Get data every 200ms
      
      console.log("Recording started successfully");
    } catch (error) {
      console.error("Error starting recording:", error);
      stopTimer();
      setState(prev => ({ ...prev, isRecording: false, isPaused: false }));
      
      // Rethrow to allow component to show error
      throw error;
    }
  }, [requestPermissions, state.recordingMode, state.settings, state.isPaused, state.mediaRecorder, startTimer, stopTimer]);

  const pauseRecording = useCallback(() => {
    if (!state.mediaRecorder) return;
    
    if (state.isPaused) {
      // Resume recording
      try {
        state.mediaRecorder.resume();
        startTimer();
        setState(prev => ({ ...prev, isPaused: false }));
      } catch (e) {
        console.error("Error resuming recording:", e);
      }
    } else {
      // Pause recording
      try {
        state.mediaRecorder.pause();
        pauseTimer();
        setState(prev => ({ ...prev, isPaused: true }));
      } catch (e) {
        console.error("Error pausing recording:", e);
      }
    }
  }, [state.mediaRecorder, state.isPaused, startTimer, pauseTimer]);

  // Function to process the recording chunks and create the final recording object
  const finishRecording = useCallback(() => {
    stopTimer();
    const chunks = chunksRef.current;
    const finalDuration = state.recordingTime || 1; // Minimum 1 second
    
    if (!chunks.length) {
      console.warn("No data chunks available for recording");
      setState(prev => ({
        ...prev,
        isRecording: false,
        isPaused: false,
        mediaRecorder: null,
        mediaStream: null
      }));
      return;
    }
    
    // Create the final blob with appropriate MIME type
    const mimeType = state.recordingMode === "audio" ? "audio/webm" : "video/webm";
    const recordingBlob = new Blob(chunks, { type: mimeType });
    const recordingUrl = URL.createObjectURL(recordingBlob);
    
    const recording: Recording = {
      id: Date.now().toString(),
      mode: state.recordingMode,
      blob: recordingBlob,
      url: recordingUrl,
      duration: finalDuration,
      createdAt: new Date()
    };
    
    console.log("Recording completed:", {
      mode: recording.mode,
      duration: recording.duration,
      size: Math.round(recordingBlob.size / 1024 / 1024 * 100) / 100 + "MB",
      chunks: chunks.length
    });
    
    setState(prev => ({
      ...prev,
      isRecording: false,
      isPaused: false,
      mediaRecorder: null,
      mediaStream: null,
      recording
    }));
  }, [state.recordingTime, state.recordingMode, stopTimer]);

  const stopRecording = useCallback(() => {
    if (!state.mediaRecorder) return;
    
    try {
      // Only stop if it's not already stopped
      if (state.mediaRecorder.state !== 'inactive') {
        state.mediaRecorder.stop();
      }
      
      // Stop all media tracks
      if (state.mediaStream) {
        state.mediaStream.getTracks().forEach(track => track.stop());
      }
      
      // The onstop event handler will call finishRecording
    } catch (error) {
      console.error("Error stopping recording:", error);
      finishRecording(); // Manually finish in case of error
    }
  }, [state.mediaRecorder, state.mediaStream, finishRecording]);

  const resetRecording = useCallback(() => {
    // Clean up any existing recording
    if (state.recording) {
      URL.revokeObjectURL(state.recording.url);
    }
    
    // Reset the state
    setState(prev => ({
      ...prev,
      recordingTime: 0,
      recording: null,
      recordedChunks: []
    }));
  }, [state.recording]);

  // Enhanced download function with format options
  const downloadRecording = useCallback((format: 'mp4' | 'webm' | 'gif' = 'webm') => {
    if (!state.recording) return;
    
    const { blob, mode } = state.recording;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let fileName = `recording_${timestamp}.${format}`;
    
    if (mode === 'audio' && format !== 'mp4') {
      fileName = `audio_${timestamp}.webm`; // Force webm for audio
    }
    
    const a = document.createElement('a');
    a.href = state.recording.url;
    a.download = fileName;
    a.click();
    
    console.log(`Downloaded recording in ${format} format`);
  }, [state.recording]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (state.mediaStream) {
        state.mediaStream.getTracks().forEach(track => track.stop());
      }
      
      if (state.recording) {
        URL.revokeObjectURL(state.recording.url);
      }
    };
  }, [state.mediaStream, state.recording]);

  return {
    state,
    updateSettings,
    setRecordingMode,
    requestPermissions,
    startRecording,
    pauseRecording,
    stopRecording,
    downloadRecording,
    resetRecording,
    formatTime
  };
}