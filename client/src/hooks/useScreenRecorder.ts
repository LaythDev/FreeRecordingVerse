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

// Helper to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function useScreenRecorder() {
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

  // Additional state for recording info
  const [recordingInfo, setRecordingInfo] = useState({
    fileSize: 0,
    resolution: '',
    fps: 0,
    duration: 0,
    isProcessing: false,
    processingProgress: 0,
    error: null as string | null
  });

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const canvasPreviewRef = useRef<HTMLCanvasElement | null>(null);

  // Generate video quality constraints based on settings
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
    }, 200); // More frequent updates for accuracy
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
    
    const finalDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    
    setRecordingInfo(prev => ({
      ...prev,
      duration: finalDuration
    }));
    
    startTimeRef.current = 0;
    pausedTimeRef.current = 0;
  }, []);

  // Request permissions and get media stream
  const requestPermissions = useCallback(async () => {
    try {
      setRecordingInfo(prev => ({
        ...prev,
        error: null
      }));
      
      // Stop any existing streams
      if (state.mediaStream) {
        state.mediaStream.getTracks().forEach(track => track.stop());
      }

      let stream: MediaStream;

      // Request appropriate media based on mode
      if (state.recordingMode === "screen") {
        try {
          const displayMediaOptions = {
            video: {
              ...getVideoConstraints(),
              displaySurface: "monitor"
            },
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
                  noiseSuppression: true
                }
              });
              
              audioStream.getAudioTracks().forEach(track => {
                stream.addTrack(track);
              });
            } catch (err) {
              console.warn("Could not add audio to screen recording:", err);
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
        } catch (err) {
          console.error("Error accessing screen:", err);
          throw new Error("Failed to access your screen. Please check your browser permissions and try again.");
        }
      } else if (state.recordingMode === "camera") {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: getVideoConstraints(),
            audio: state.settings.includeAudio
          });
          
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
        } catch (err) {
          console.error("Error accessing camera:", err);
          throw new Error("Failed to access your camera. Please check your browser permissions and try again.");
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
          
          setRecordingInfo(prev => ({
            ...prev,
            resolution: 'Audio only'
          }));
        } catch (err) {
          console.error("Error accessing microphone:", err);
          throw new Error("Failed to access your microphone. Please check your browser permissions and try again.");
        }
      } else {
        throw new Error(`Unsupported recording mode: ${state.recordingMode}`);
      }

      // Set up track ended listeners
      stream.getTracks().forEach(track => {
        track.onended = () => {
          console.log("Media track ended");
          // Only trigger stop if we're recording
          if (state.isRecording) {
            stopRecording();
          }
        };
      });

      // Update state with the new stream
      setState(prev => ({ ...prev, mediaStream: stream }));
      
      // Set up preview if refs are set
      if (videoPreviewRef.current && canvasPreviewRef.current) {
        setupPreview(stream);
      }
      
      return stream;
    } catch (error) {
      console.error("Error getting permissions:", error);
      
      // Set user-friendly error message
      if (error instanceof Error) {
        setRecordingInfo(prev => ({
          ...prev,
          error: error.message
        }));
      } else {
        setRecordingInfo(prev => ({
          ...prev,
          error: "Failed to access your device. Please check your permissions."
        }));
      }
      
      throw error;
    }
  }, [state.recordingMode, state.settings, state.isRecording, state.mediaStream, getVideoConstraints]);

  // Set up preview of stream in canvas
  const setupPreview = useCallback((stream: MediaStream) => {
    if (!videoPreviewRef.current || !canvasPreviewRef.current) return;
    
    const video = videoPreviewRef.current;
    const canvas = canvasPreviewRef.current;
    
    // Set up video with stream
    video.srcObject = stream;
    video.muted = true; // Prevent audio feedback
    
    // Play the video
    video.play().catch(err => {
      console.warn("Autoplay prevented:", err);
    });
    
    // Set up canvas when video metadata is loaded
    video.onloadedmetadata = () => {
      if (!canvas || !video) return;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      
      // Draw video to canvas repeatedly
      function drawFrame() {
        if (!canvas || !video) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Only draw when video is playing
        if (!video.paused && !video.ended) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Add recording indicator if we're recording
          if (state.isRecording) {
            // Add red recording dot in corner
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(canvas.width - 140, 10, 130, 40);
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(canvas.width - 120, 30, 8, 0, 2 * Math.PI);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = '16px Arial';
            ctx.fillText(formatTime(state.recordingTime), canvas.width - 100, 35);
          }
        }
        
        // Continue drawing frames
        requestAnimationFrame(drawFrame);
      }
      
      // Start drawing frames
      drawFrame();
    };
  }, [state.isRecording, state.recordingTime]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      // Reset recording info
      setRecordingInfo(prev => ({
        ...prev,
        error: null,
        isProcessing: false,
        processingProgress: 0
      }));

      // If paused, resume recording
      if (state.isPaused && state.mediaRecorder) {
        state.mediaRecorder.resume();
        startTimer();
        setState(prev => ({ ...prev, isRecording: true, isPaused: false }));
        return;
      }

      // Otherwise start a new recording
      const stream = await requestPermissions();
      chunksRef.current = [];

      // Create optimal recording options
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

      // Reset recording state and timer
      setState(prev => ({
        ...prev,
        recordingTime: 0,
        recording: null,
        recordedChunks: []
      }));
      
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;
      startTimer();

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, options);
      
      // Set up data collection
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
          
          // Update estimated file size
          setRecordingInfo(prev => ({
            ...prev,
            fileSize: prev.fileSize + event.data.size
          }));
        }
      };
      
      // Setup stop handler
      mediaRecorder.onstop = () => {
        console.log("MediaRecorder stopped, processing recording...");
        finishRecording();
      };
      
      // Setup error handler
      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setRecordingInfo(prev => ({
          ...prev,
          error: "Recording error occurred. Please try again."
        }));
        stopRecording();
      };

      // Update state with recorder
      setState(prev => ({ 
        ...prev, 
        mediaRecorder,
        mediaStream: stream,
        isRecording: true,
        isPaused: false
      }));

      // Start recording with timeslices
      mediaRecorder.start(200);
      
      console.log("Recording started successfully");
    } catch (error) {
      console.error("Error starting recording:", error);
      stopTimer();
      setState(prev => ({ ...prev, isRecording: false, isPaused: false }));
      
      // Set user-friendly error message
      if (error instanceof Error) {
        setRecordingInfo(prev => ({
          ...prev,
          error: error.message
        }));
      } else {
        setRecordingInfo(prev => ({
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
        setRecordingInfo(prev => ({
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
        setRecordingInfo(prev => ({
          ...prev,
          error: "Failed to pause recording. You can continue or stop the recording."
        }));
      }
    }
  }, [state.mediaRecorder, state.isPaused, startTimer, pauseTimer]);

  // Process recording and create final output
  const finishRecording = useCallback(() => {
    stopTimer();
    const chunks = chunksRef.current;
    const finalDuration = state.recordingTime || 1; // Minimum 1 second
    
    if (!chunks.length) {
      console.warn("No recording data captured");
      setRecordingInfo(prev => ({
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
    setRecordingInfo(prev => ({
      ...prev,
      isProcessing: true,
      processingProgress: 0
    }));
    
    // Create appropriate mime type
    const mimeType = state.recordingMode === "audio" ? "audio/webm" : "video/webm";
    
    // Simulate processing progress
    const progressInterval = setInterval(() => {
      setRecordingInfo(prev => {
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
    
    // Create the final recording blob
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
        setRecordingInfo(prev => ({
          ...prev,
          isProcessing: false,
          processingProgress: 100,
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
        
        setRecordingInfo(prev => ({
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
  }, [state.mediaRecorder, state.mediaStream, finishRecording]);

  // Reset recording
  const resetRecording = useCallback(() => {
    // Clean up any existing recording
    if (state.recording) {
      URL.revokeObjectURL(state.recording.url);
    }
    
    // Reset state
    setState(prev => ({
      ...prev,
      recordingTime: 0,
      recording: null,
      recordedChunks: []
    }));
    
    // Reset recording info
    setRecordingInfo({
      fileSize: 0,
      resolution: '',
      fps: 0,
      duration: 0,
      isProcessing: false,
      processingProgress: 0,
      error: null
    });
    
    // Stop any existing streams
    if (state.mediaStream) {
      state.mediaStream.getTracks().forEach(track => track.stop());
      setState(prev => ({ ...prev, mediaStream: null }));
    }
  }, [state.recording, state.mediaStream]);

  // Download recording
  const downloadRecording = useCallback((format: 'mp4' | 'webm' | 'gif' = 'webm') => {
    if (!state.recording) return;
    
    const { blob, mode } = state.recording;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let fileName = `recording_${timestamp}.${format}`;
    
    // For audio recordings, use appropriate format
    if (mode === 'audio') {
      fileName = `audio_${timestamp}.webm`;
    }
    
    const a = document.createElement('a');
    a.href = state.recording.url;
    a.download = fileName;
    a.click();
    
    console.log(`Downloaded recording in ${format} format`);
  }, [state.recording]);

  // Set preview references
  const setPreviewRefs = useCallback((video: HTMLVideoElement | null, canvas: HTMLCanvasElement | null) => {
    videoPreviewRef.current = video;
    canvasPreviewRef.current = canvas;
    
    // Setup preview if we already have a stream
    if (video && canvas && state.mediaStream) {
      setupPreview(state.mediaStream);
    }
  }, [state.mediaStream, setupPreview]);

  // Get recording info
  const getRecordingInfo = useCallback(() => {
    return {
      duration: recordingInfo.duration,
      fileSize: recordingInfo.fileSize,
      resolution: recordingInfo.resolution,
      fps: recordingInfo.fps,
      format: state.recording?.mode === 'audio' ? 'Audio (WebM)' : 'Video (WebM)',
      created: state.recording?.createdAt,
      formattedSize: formatFileSize(recordingInfo.fileSize),
      formattedDuration: formatTime(recordingInfo.duration)
    };
  }, [recordingInfo, state.recording]);

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
    recordingInfo,
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