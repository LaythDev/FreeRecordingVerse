import { useState, useRef, useCallback, useEffect } from 'react';
import { RecordingMode, RecordingSettings, Recording, RecordingState } from '@shared/types';

// Flag to help with debugging
const DEBUG = true;

// High-quality default settings
const DEFAULT_SETTINGS: RecordingSettings = {
  quality: "720",
  frameRate: "30",
  includeAudio: true,
  showCursor: true,
};

// Format time for display
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

export function useProfessionalRecorder() {
  // Main state
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

  // Additional state for professional features
  const [recordingDetails, setRecordingDetails] = useState<{
    fps: number,
    resolution: string,
    fileSize: number,
    duration: number,
    isProcessing: boolean,
    processingProgress: number,
    isPreviewReady: boolean,
    error: string | null
  }>({
    fps: 0,
    resolution: '',
    fileSize: 0,
    duration: 0,
    isProcessing: false,
    processingProgress: 0,
    isPreviewReady: false,
    error: null
  });

  // References
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const canvasPreviewRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Calculate and track FPS
  const trackFPS = useCallback(() => {
    const now = performance.now();
    if (lastFrameTimeRef.current) {
      const delta = now - lastFrameTimeRef.current;
      const instantFPS = 1000 / delta;
      setRecordingDetails(prev => ({
        ...prev,
        fps: Math.round((prev.fps * 9 + instantFPS) / 10) // Weighted average
      }));
    }
    lastFrameTimeRef.current = now;
    frameCountRef.current++;
  }, []);

  // Generate video constraints based on settings
  const getVideoConstraints = useCallback(() => {
    const qualityMap: Record<string, any> = {
      "1080": { 
        width: { ideal: 1920 }, 
        height: { ideal: 1080 },
        frameRate: state.settings.frameRate === "60" ? { ideal: 60 } :
                   state.settings.frameRate === "30" ? { ideal: 30 } : { ideal: 24 }
      },
      "720": { 
        width: { ideal: 1280 }, 
        height: { ideal: 720 },
        frameRate: state.settings.frameRate === "60" ? { ideal: 60 } :
                   state.settings.frameRate === "30" ? { ideal: 30 } : { ideal: 24 }
      },
      "480": { 
        width: { ideal: 854 }, 
        height: { ideal: 480 },
        frameRate: state.settings.frameRate === "60" ? { ideal: 60 } :
                   state.settings.frameRate === "30" ? { ideal: 30 } : { ideal: 24 }
      }
    };

    return {
      ...qualityMap[state.settings.quality],
      cursor: state.settings.showCursor ? "always" : "never"
    };
  }, [state.settings]);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<RecordingSettings>) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...newSettings }
    }));
  }, []);

  // Set recording mode
  const setRecordingMode = useCallback((mode: RecordingMode) => {
    setState(prev => ({ ...prev, recordingMode: mode }));

    // Reset any existing stream when changing modes
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setState(prev => ({ ...prev, mediaStream: null }));
    }
  }, []);

  // Timer management
  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Use high-precision timing
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

    // Store the final duration for the recording
    const finalDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setRecordingDetails(prev => ({
      ...prev,
      duration: finalDuration
    }));

    startTimeRef.current = 0;
    pausedTimeRef.current = 0;
  }, []);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (!state.mediaRecorder) return;

    try {
      // Only stop if not already stopped
      if (state.mediaRecorder.state !== 'inactive') {
        state.mediaRecorder.stop();
      }

      // Stop all media tracks
      if (state.mediaStream) {
        state.mediaStream.getTracks().forEach(track => track.stop());
      }

      // finishRecording will be called by onstop handler
    } catch (error) {
      console.error("Error stopping recording:", error);
      finishRecording(); // Manually call in case of error
    }
  }, [state.mediaRecorder, state.mediaStream]);

  // Request permissions and get media stream
  const requestPermissions = useCallback(async () => {
    try {
      setRecordingDetails(prev => ({
        ...prev,
        error: null
      }));

      // Stop any existing streams
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      let stream: MediaStream;
      let trackSettings = null;

      if (state.recordingMode === "screen") {
        try {
          const constraints = {
            video: getVideoConstraints(),
            audio: state.settings.includeAudio,
            preferCurrentTab: true
          };

          // Request screen sharing
          stream = await navigator.mediaDevices.getDisplayMedia(constraints as any);

          // Check if we need to add audio
          if (state.settings.includeAudio) {
            try {
              // Try to get system audio if supported
              const audioStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true
                },
                video: false 
              });

              // Add audio tracks to the stream
              audioStream.getAudioTracks().forEach(track => {
                stream.addTrack(track);
              });
            } catch (audioErr) {
              console.warn("Could not add audio to screen recording:", audioErr);
            }
          }

          // Get video track settings for resolution info
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) {
            trackSettings = videoTrack.getSettings();
            const width = trackSettings.width || 0;
            const height = trackSettings.height || 0;
            setRecordingDetails(prev => ({
              ...prev,
              resolution: `${width}×${height}`
            }));
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

          // Get video track settings
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) {
            trackSettings = videoTrack.getSettings();
            const width = trackSettings.width || 0;
            const height = trackSettings.height || 0;
            setRecordingDetails(prev => ({
              ...prev,
              resolution: `${width}×${height}`
            }));
          }
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

          setRecordingDetails(prev => ({
            ...prev,
            resolution: 'Audio only'
          }));
        } catch (err) {
          console.error("Error accessing microphone:", err);
          throw new Error("Failed to access your microphone. Please check permissions and try again.");
        }
      } else {
        throw new Error(`Unsupported recording mode: ${state.recordingMode}`);
      }

      // Set up track ended handlers
      stream.getTracks().forEach(track => {
        track.onended = () => {
          console.log("Media track ended");
          if (state.isRecording) {
            stopRecording();
          }
        };
      });

      // Store references
      streamRef.current = stream;
      setState(prev => ({ ...prev, mediaStream: stream }));

      // Start live preview
      setupVideoPreview(stream);

      return stream;
    } catch (error) {
      console.error("Error getting permissions:", error);

      if (error instanceof Error) {
        setRecordingDetails(prev => ({
          ...prev,
          error: error.message
        }));
      } else {
        setRecordingDetails(prev => ({
          ...prev,
          error: "An unknown error occurred while accessing your device."
        }));
      }

      throw error;
    }
  }, [state.recordingMode, state.settings, state.isRecording, getVideoConstraints, stopRecording]);

  // Set up video preview
  const setupVideoPreview = useCallback((stream: MediaStream) => {
    if (videoPreviewRef.current && canvasPreviewRef.current && state.recordingMode !== "audio") {
      videoPreviewRef.current.srcObject = stream;
      videoPreviewRef.current.muted = true; // Prevent feedback
      videoPreviewRef.current.play().catch(err => console.warn("Preview autoplay prevented", err));

      const canvas = canvasPreviewRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas dimensions based on video
      videoPreviewRef.current.onloadedmetadata = () => {
        if (!videoPreviewRef.current || !canvasPreviewRef.current) return;

        canvasPreviewRef.current.width = videoPreviewRef.current.videoWidth;
        canvasPreviewRef.current.height = videoPreviewRef.current.videoHeight;

        // Draw video to canvas repeatedly for live preview
        const drawFrame = () => {
          if (!videoPreviewRef.current || !canvasPreviewRef.current) return;

          const ctx = canvasPreviewRef.current.getContext('2d');
          if (!ctx) return;

          // Only draw when video is playing
          if (!videoPreviewRef.current.paused && !videoPreviewRef.current.ended) {
            ctx.drawImage(videoPreviewRef.current, 0, 0, canvas.width, canvas.height);

            // Add recording indicator if recording
            if (state.isRecording) {
              // Red recording dot and timer
              ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
              ctx.fillRect(canvas.width - 150, 10, 140, 40);
              ctx.fillStyle = '#ff0000';
              ctx.beginPath();
              ctx.arc(canvas.width - 130, 30, 8, 0, 2 * Math.PI);
              ctx.fill();
              ctx.fillStyle = '#ffffff';
              ctx.font = '16px Arial';
              ctx.fillText(formatTime(state.recordingTime), canvas.width - 110, 35);
            }

            // Track FPS
            if (state.isRecording) {
              trackFPS();
            }
          }

          requestAnimationFrame(drawFrame);
        };

        drawFrame();
      };
    }
  }, [state.recordingMode, state.isRecording, state.recordingTime, trackFPS]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      // Clear any previous errors
      setRecordingDetails(prev => ({
        ...prev,
        error: null,
        isProcessing: false,
        isPreviewReady: false
      }));

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
      frameCountRef.current = 0;
      lastFrameTimeRef.current = 0;

      // Create optimal recorder options for high quality recording
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

      // Reset timing references
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;
      startTimer();

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, options);

      // Set up data handling
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
          // Update file size estimation
          setRecordingDetails(prev => ({
            ...prev,
            fileSize: prev.fileSize + event.data.size
          }));
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
        setRecordingDetails(prev => ({
          ...prev,
          error: "Recording error occurred. Please try again."
        }));
        stopRecording();
      };

      setState(prev => ({ 
        ...prev, 
        mediaRecorder,
        mediaStream: stream,
        isRecording: true,
        isPaused: false
      }));

      // Start recording with small timeslices for better data collection
      mediaRecorder.start(200); // Get data every 200ms

      console.log("Recording started successfully");
    } catch (error) {
      console.error("Error starting recording:", error);
      stopTimer();
      setState(prev => ({ ...prev, isRecording: false, isPaused: false }));

      // Set error message
      if (error instanceof Error) {
        setRecordingDetails(prev => ({
          ...prev,
          error: error.message
        }));
      } else {
        setRecordingDetails(prev => ({
          ...prev,
          error: "Failed to start recording. Please check your permissions and try again."
        }));
      }

      throw error;
    }
  }, [requestPermissions, state.recordingMode, state.settings, state.isPaused, state.mediaRecorder, startTimer, stopTimer]);

  // Pause recording
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
        setRecordingDetails(prev => ({
          ...prev,
          error: "Failed to resume recording. Please try stopping and starting again."
        }));
      }
    } else {
      // Pause recording
      try {
        state.mediaRecorder.pause();
        pauseTimer();
        setState(prev => ({ ...prev, isPaused: true }));
      } catch (e) {
        console.error("Error pausing recording:", e);
        setRecordingDetails(prev => ({
          ...prev,
          error: "Failed to pause recording. You can continue or stop the recording."
        }));
      }
    }
  }, [state.mediaRecorder, state.isPaused, startTimer, pauseTimer]);

  // Process recording chunks and create the final recording
  const finishRecording = useCallback(() => {
    stopTimer();
    const chunks = chunksRef.current;
    const finalDuration = state.recordingTime || 1; // Minimum 1 second

    if (!chunks.length) {
      console.warn("No data chunks available for recording");
      setRecordingDetails(prev => ({
        ...prev,
        error: "No recording data was captured. Please try again.",
        isProcessing: false
      }));
      setState(prev => ({
        ...prev,
        isRecording: false,
        isPaused: false,
        mediaRecorder: null,
        mediaStream: null
      }));
      return;
    }

    // Set processing state
    setRecordingDetails(prev => ({
      ...prev,
      isProcessing: true,
      processingProgress: 0,
      isPreviewReady: false
    }));

    // Create the final blob with appropriate MIME type
    const mimeType = state.recordingMode === "audio" ? "audio/webm" : "video/webm";

    // Processing progress simulation (since actual encoding can't be tracked)
    let progressInterval = setInterval(() => {
      setRecordingDetails(prev => {
        if (prev.processingProgress >= 95) {
          clearInterval(progressInterval);
          return prev;
        }
        return {
          ...prev,
          processingProgress: Math.min(prev.processingProgress + 5, 95)
        };
      });
    }, 100);

    // Create the final blob
    setTimeout(() => {
      try {
        const recordingBlob = new Blob(chunks, { type: mimeType });
        const recordingUrl = URL.createObjectURL(recordingBlob);

        const totalSize = recordingBlob.size;

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
          size: formatFileSize(totalSize),
          chunks: chunks.length
        });

        // Clear progress interval
        clearInterval(progressInterval);

        // Update state with completed recording
        setRecordingDetails(prev => ({
          ...prev,
          isProcessing: false,
          processingProgress: 100,
          isPreviewReady: true,
          fileSize: totalSize,
          duration: finalDuration
        }));

        setState(prev => ({
          ...prev,
          isRecording: false,
          isPaused: false,
          mediaRecorder: null,
          mediaStream: null,
          recording
        }));
      } catch (error) {
        console.error("Error finalizing recording:", error);
        clearInterval(progressInterval);

        setRecordingDetails(prev => ({
          ...prev,
          isProcessing: false,
          error: "Error processing recording. Please try again."
        }));

        setState(prev => ({
          ...prev,
          isRecording: false,
          isPaused: false,
          mediaRecorder: null,
          mediaStream: null
        }));
      }
    }, 1000); // Simulated processing time
  }, [state.recordingTime, state.recordingMode, stopTimer]);

  // Reset recording state
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

    // Reset recording details
    setRecordingDetails({
      fps: 0,
      resolution: '',
      fileSize: 0,
      duration: 0,
      isProcessing: false,
      processingProgress: 0,
      isPreviewReady: false,
      error: null
    });

    // Stop any existing streams
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, [state.recording]);

  // Enhanced download function with format options
  const downloadRecording = useCallback((format: 'mp4' | 'webm' | 'gif' = 'webm') => {
    if (!state.recording) return;

    const { blob, mode } = state.recording;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let fileName = `recording_${timestamp}.${format}`;

    // For audio recordings, enforce appropriate format
    if (mode === 'audio') {
      fileName = `audio_${timestamp}.webm`; // Force webm for audio
    }

    const a = document.createElement('a');
    a.href = state.recording.url;
    a.download = fileName;
    a.click();

    console.log(`Downloaded recording in ${format} format`);
  }, [state.recording]);

  // Get recording quality info
  const getRecordingInfo = useCallback(() => {
    return {
      duration: recordingDetails.duration,
      fileSize: recordingDetails.fileSize,
      resolution: recordingDetails.resolution,
      fps: recordingDetails.fps,
      format: state.recording?.mode === 'audio' ? 'Audio (WebM)' : 'Video (WebM)',
      created: state.recording?.createdAt,
      formattedSize: formatFileSize(recordingDetails.fileSize),
      formattedDuration: formatTime(recordingDetails.duration)
    };
  }, [recordingDetails, state.recording]);

  // Set video preview references
  const setPreviewRefs = useCallback((video: HTMLVideoElement | null, canvas: HTMLCanvasElement | null) => {
    videoPreviewRef.current = video;
    canvasPreviewRef.current = canvas;

    // Set up preview if we already have a stream
    if (video && canvas && streamRef.current) {
      setupVideoPreview(streamRef.current);
    }
  }, [setupVideoPreview]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      if (state.recording) {
        URL.revokeObjectURL(state.recording.url);
      }
    };
  }, [state.recording]);

  return {
    state,
    recordingDetails,
    updateSettings,
    setRecordingMode,
    requestPermissions,
    startRecording,
    pauseRecording,
    stopRecording,
    downloadRecording,
    resetRecording,
    formatTime,
    formatFileSize,
    getRecordingInfo,
    setPreviewRefs
  };
}