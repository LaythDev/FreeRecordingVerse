import { useState, useRef, useCallback, useEffect } from 'react';
import { RecordingMode, RecordingSettings, Recording, RecordingState } from '@shared/types';

// Default recording settings
const DEFAULT_SETTINGS: RecordingSettings = {
  quality: "720",
  frameRate: "30",
  includeAudio: true,
  showCursor: true,
};

// Generate a unique ID for recordings
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Format time display (HH:MM:SS)
export const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

// Format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Main hook for professional recorder functionality
export function useFreeProfessionalRecorder() {
  // Internal state
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    recordingTime: 0,
    recordingMode: 'screen',
    settings: DEFAULT_SETTINGS,
    mediaStream: null,
    mediaRecorder: null,
    recordedChunks: [],
    recording: null
  });

  // UI state
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [processingRecording, setProcessingRecording] = useState(false);
  const [recordingInfo, setRecordingInfo] = useState({
    fileSize: 0,
    resolution: '',
  });

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<RecordingSettings>) => {
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...newSettings
      }
    }));
  }, []);

  // Set recording mode
  const setRecordingMode = useCallback((mode: RecordingMode) => {
    setState(prev => ({
      ...prev,
      recordingMode: mode
    }));
  }, []);

  // Generate video constraints based on settings
  const getVideoConstraints = useCallback(() => {
    const qualityMap = {
      "1080": { width: { ideal: 1920 }, height: { ideal: 1080 } },
      "720": { width: { ideal: 1280 }, height: { ideal: 720 } },
      "480": { width: { ideal: 854 }, height: { ideal: 480 } }
    };

    const frameRateMap = {
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

  // Timer functions
  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    startTimeRef.current = Date.now() - (pausedTimeRef.current || 0);

    timerRef.current = setInterval(() => {
      const elapsedTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setState(prev => ({
        ...prev,
        recordingTime: elapsedTime
      }));
    }, 100);
  }, []);

  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      pausedTimeRef.current = Date.now() - startTimeRef.current;
    }
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startTimeRef.current = 0;
    pausedTimeRef.current = 0;
    setState(prev => ({
      ...prev,
      recordingTime: 0
    }));
  }, []);

  // Stop the timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Set up preview refs
  const setPreviewRefs = useCallback((video: HTMLVideoElement, canvas?: HTMLCanvasElement) => {
    videoRef.current = video;
    if (canvas) {
      canvasRef.current = canvas;
    }
  }, []);

  // Setup video preview with the media stream
  const setupVideoPreview = useCallback((stream: MediaStream) => {
    if (videoRef.current && state.recordingMode !== 'audio') {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = true; // Prevent feedback

      const playPreview = async () => {
        try {
          if (videoRef.current) {
            await videoRef.current.play();
          }
        } catch (err) {
          console.log("Preview autoplay was prevented - this is normal behavior", err);
        }
      };

      playPreview();

      // Draw to canvas for screen recording to enable annotations
      if (canvasRef.current && state.recordingMode === 'screen') {
        const ctx = canvasRef.current.getContext('2d');

        if (ctx) {
          const drawFrame = () => {
            if (videoRef.current && canvasRef.current) {
              // Match canvas size to video
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;

              // Draw video frame to canvas
              ctx.drawImage(
                videoRef.current,
                0, 0,
                canvasRef.current.width,
                canvasRef.current.height
              );

              // Request next frame
              animationFrameRef.current = requestAnimationFrame(drawFrame);
            }
          };

          // Start drawing frames
          animationFrameRef.current = requestAnimationFrame(drawFrame);
        }
      }

      // Get resolution info
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        const width = settings.width || 0;
        const height = settings.height || 0;

        setRecordingInfo(prev => ({
          ...prev,
          resolution: `${width}×${height}`
        }));
      }
    }
  }, [state.recordingMode]);

  // Stop recording function (defined early to avoid circular dependencies)
  const handleStopRecording = useCallback(() => {
    if (!state.mediaRecorder || (!state.isRecording && !state.isPaused)) return;

    try {
      if (state.mediaRecorder.state !== 'inactive') {
        state.mediaRecorder.stop();
      }

      if (state.mediaStream) {
        state.mediaStream.getTracks().forEach(track => track.stop());
      }

      stopTimer();
    } catch (error) {
      console.error('Error stopping recording:', error);
      setState(prev => ({ ...prev, errorMessage: 'Failed to stop recording' }));
    }
  }, [state.mediaRecorder, state.isRecording, state.isPaused, state.mediaStream, stopTimer]);

  // Request recording permissions
  const requestPermissions = useCallback(async () => {
    try {
      setIsRequestingAccess(true);
      setPermissionDenied(false);
      setErrorMessage('');

      // Stop any existing streams
      if (state.mediaStream) {
        state.mediaStream.getTracks().forEach(track => track.stop());
      }

      // Stop animation frame if active
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      let stream: MediaStream;

      // Request media based on mode
      if (state.recordingMode === "screen") {
        try {
          const displayMediaOptions = {
            video: getVideoConstraints(),
            audio: state.settings.includeAudio
          };

          // Request screen sharing
          stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions as any);

          // Add audio if enabled
          if (state.settings.includeAudio) {
            try {
              const audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true
                }
              });

              // Create a new combined stream
              const combinedStream = new MediaStream();

              // Add all video tracks from screen capture
              stream.getVideoTracks().forEach(track => {
                combinedStream.addTrack(track);
              });

              // Add audio track
              const audioTrack = audioStream.getAudioTracks()[0];
              if (audioTrack) {
                combinedStream.addTrack(audioTrack);
              }

              // Replace the stream with the combined one
              stream = combinedStream;
            } catch (err) {
              console.warn("Could not add audio to screen recording:", err);
              // Continue with just video
            }
          }
        } catch (err) {
          console.error("Error accessing screen:", err);
          throw new Error("Failed to access your screen. Please check permissions and try again.");
        }
      } else if (state.recordingMode === "camera") {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: state.settings.includeAudio
          });
        } catch (err) {
          console.error("Error accessing camera:", err);
          throw new Error("Failed to access your camera. Please check permissions and try again.");
        }
      } else if (state.recordingMode === "audio") {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
          });
        } catch (err) {
          console.error("Error accessing microphone:", err);
          throw new Error("Failed to access your microphone. Please check permissions and try again.");
        }
      } else {
        throw new Error(`Unsupported recording mode: ${state.recordingMode}`);
      }

      // Set up track ended listeners
      stream.getTracks().forEach(track => {
        track.onended = () => {
          console.log("Media track ended");
          if (state.isRecording) {
            handleStopRecording();
          }
        };
      });

      // Update state with the new stream
      setState(prev => ({
        ...prev,
        mediaStream: stream
      }));

      // Setup video preview
      setupVideoPreview(stream);

      setIsRequestingAccess(false);
      return stream;
    } catch (error) {
      console.error("Error getting permissions:", error);
      setIsRequestingAccess(false);
      setPermissionDenied(true);

      // Set user-friendly error message
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Failed to access your device. Please check your permissions.");
      }

      return null;
    }
  }, [state.recordingMode, state.settings, state.isRecording, state.mediaStream, getVideoConstraints, setupVideoPreview, handleStopRecording]);

  // Start recording with countdown
  const startRecordingWithCountdown = useCallback((seconds: number = 3) => {
    // Skip countdown if already recording but paused
    if (state.isPaused && state.mediaRecorder) {
      startRecording(true);
      return;
    }

    setCountdown(seconds);

    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          startRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [state.isPaused, state.mediaRecorder]);

  // Start recording
  const startRecording = useCallback(async (skipPermissionRequest: boolean = false) => {
    try {
      // Reset error state
      setErrorMessage('');
      setRecordingInfo(prev => ({ ...prev, fileSize: 0 }));

      // If paused, resume recording
      if (state.isPaused && state.mediaRecorder) {
        state.mediaRecorder.resume();
        startTimer();
        setState(prev => ({
          ...prev,
          isRecording: true,
          isPaused: false
        }));
        return;
      }

      // Get media stream (use existing if told to skip permission request)
      let stream = state.mediaStream;

      if (!skipPermissionRequest || !stream) {
        stream = await requestPermissions();
        if (!stream) {
          throw new Error("Failed to get media stream");
        }
      }

      // Reset recorded chunks for new recording
      setState(prev => ({
        ...prev,
        recordedChunks: []
      }));

      // Create optimal recording options
      const options: MediaRecorderOptions = {
        mimeType: 'video/webm;codecs=vp9,opus'
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
      }

      // Reset recording state and timer
      resetTimer();
      setState(prev => ({
        ...prev,
        recording: null
      }));

      // Start the timer
      startTimer();

      // Create MediaRecorder
      const recorder = new MediaRecorder(stream, options);

      // Set up data collection
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          setState(prev => ({
            ...prev,
            recordedChunks: [...prev.recordedChunks, event.data]
          }));

          // Update estimated file size
          setRecordingInfo(prev => ({
            ...prev,
            fileSize: prev.fileSize + event.data.size
          }));
        }
      };

      // Handle recorder stopping
      recorder.onstop = () => {
        console.log("MediaRecorder stopped, processing recording...");
        finishRecording();
      };

      // Setup error handler
      recorder.onerror = (event) => {
        console.error("MediaRecorder error", event);
        handleStopRecording();
        setErrorMessage("Recording error occurred. Please try again.");
      };

      // Set recorder to state and start
      setState(prev => ({
        ...prev,
        mediaRecorder: recorder,
        isRecording: true
      }));

      // Request data every second for progress updates
      recorder.start(1000);

    } catch (error) {
      console.error("Error starting recording:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to start recording");
      setState(prev => ({
        ...prev,
        isRecording: false
      }));
      resetTimer();
    }
  }, [state.isPaused, state.mediaRecorder, state.mediaStream, state.recordingMode, state.settings, requestPermissions, startTimer, resetTimer]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (state.mediaRecorder && state.isRecording) {
      try {
        state.mediaRecorder.pause();
        pauseTimer();
        setState(prev => ({
          ...prev,
          isRecording: false,
          isPaused: true
        }));
      } catch (error) {
        console.error("Error pausing recording:", error);
      }
    }
  }, [state.mediaRecorder, state.isRecording, pauseTimer]);

  

  // Process and finalize the recording
  const finishRecording = useCallback(() => {
    if (state.recordedChunks.length === 0) {
      setProcessingRecording(false);
      setErrorMessage("No data was recorded. Please try again.");
      return;
    }

    try {
      // Create a blob from the recorded chunks
      const recordingBlob = new Blob(state.recordedChunks, {
        type: state.recordingMode === 'audio'
          ? 'audio/webm'
          : 'video/webm'
      });

      // Create object URL for playback
      const recordingUrl = URL.createObjectURL(recordingBlob);

      // Create recording object
      const recording: Recording = {
        id: generateId(),
        mode: state.recordingMode,
        blob: recordingBlob,
        url: recordingUrl,
        duration: state.recordingTime,
        createdAt: new Date()
      };

      // Update state with the new recording
      setState(prev => ({
        ...prev,
        recording,
        recordedChunks: [] // Clear chunks to free memory
      }));

      setProcessingRecording(false);

    } catch (error) {
      console.error("Error finalizing recording:", error);
      setProcessingRecording(false);
      setErrorMessage("Error processing recording. Please try again.");
    }
  }, [state.recordedChunks, state.recordingMode, state.recordingTime]);

  // Download recording
  const downloadRecording = useCallback((format: string = 'webm') => {
    if (!state.recording) {
      setErrorMessage("No recording to download");
      return;
    }

    try {
      const { blob, mode } = state.recording;

      // Default filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const recordingType = mode === 'screen' ? 'screen' : mode === 'camera' ? 'camera' : 'audio';
      let fileName = `recording-${recordingType}-${timestamp}.${format}`;

      // If format is not webm, we need to convert
      if (format !== 'webm') {
        // For simplicity, we'll use the webm file in this example
        // In a real app, you would use a conversion library or service
        console.warn('Format conversion not implemented, downloading as webm');
        fileName = `recording-${recordingType}-${timestamp}.webm`;
      }

      // Create download link
      const a = document.createElement('a');
      a.href = state.recording.url;
      a.download = fileName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

    } catch (error) {
      console.error("Error downloading recording:", error);
      setErrorMessage("Error downloading recording. Please try again.");
    }
  }, [state.recording]);

  // Export recording to a specific format (e.g., mp4, gif)
  const exportRecording = useCallback((format: string) => {
    if (!state.recording) {
      setErrorMessage("No recording to export");
      return;
    }

    // In a real application, you would use a conversion library or service
    // For this demo, we'll just download as webm since client-side conversion is complex
    console.warn(`Format conversion to ${format} not implemented, downloading as webm`);
    downloadRecording('webm');

  }, [state.recording, downloadRecording]);

  // Reset the entire recording state
  const resetRecording = useCallback(() => {
    // Stop any media streams
    if (state.mediaStream) {
      state.mediaStream.getTracks().forEach(track => track.stop());
    }

    // Clear timer and animation frame
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Release memory from previous recordings
    if (state.recording && state.recording.url) {
      URL.revokeObjectURL(state.recording.url);
    }

    // Reset all state
    resetTimer();
    setState({
      isRecording: false,
      isPaused: false,
      recordingTime: 0,
      recordingMode: state.recordingMode, // Keep the selected mode
      settings: state.settings, // Keep the settings
      mediaStream: null,
      mediaRecorder: null,
      recordedChunks: [],
      recording: null
    });

    setErrorMessage('');
    setPermissionDenied(false);
    setProcessingRecording(false);
    setCountdown(0);
    setRecordingInfo({
      fileSize: 0,
      resolution: '',
    });

  }, [state.mediaStream, state.recording, state.recordingMode, state.settings, resetTimer]);

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      // Stop any media streams
      if (state.mediaStream) {
        state.mediaStream.getTracks().forEach(track => track.stop());
      }

      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Clear animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Release memory from URL objects
      if (state.recording && state.recording.url) {
        URL.revokeObjectURL(state.recording.url);
      }
    };
  }, [state.mediaStream, state.recording]);

  // Get estimated recording info
  const getRecordingInfo = useCallback(() => {
    return {
      fileSize: formatFileSize(recordingInfo.fileSize),
      duration: formatTime(state.recordingTime),
      resolution: recordingInfo.resolution,
      mode: state.recordingMode
    };
  }, [recordingInfo.fileSize, recordingInfo.resolution, state.recordingTime, state.recordingMode]);

  return {
    state,
    recordingInfo,
    isRequestingAccess,
    permissionDenied,
    errorMessage,
    countdown,
    processingRecording,
    updateSettings,
    setRecordingMode,
    requestPermissions,
    startRecording,
    startRecordingWithCountdown,
    pauseRecording,
    handleStopRecording,
    downloadRecording,
    exportRecording,
    resetRecording,
    formatTime,
    formatFileSize,
    getRecordingInfo,
    setPreviewRefs
  };
}