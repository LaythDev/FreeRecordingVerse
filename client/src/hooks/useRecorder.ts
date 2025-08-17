import { useState, useRef, useCallback, useEffect } from 'react';
import { RecordingMode, RecordingSettings, Recording } from '@shared/types';

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

// FFmpeg.wasm loader for format conversion
let ffmpegInstance: any = null;

const loadFFmpeg = async () => {
  if (ffmpegInstance) return ffmpegInstance;

  try {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { fetchFile, toBlobURL } = await import('@ffmpeg/util');

    ffmpegInstance = new FFmpeg();

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

    await ffmpegInstance.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    return ffmpegInstance;
  } catch (error) {
    console.warn('FFmpeg.wasm not available, format conversion disabled:', error);
    return null;
  }
};

// Convert video format using FFmpeg.wasm
const convertVideoFormat = async (inputBlob: Blob, outputFormat: string): Promise<Blob> => {
  const ffmpeg = await loadFFmpeg();
  if (!ffmpeg) throw new Error('FFmpeg not available');

  const inputName = 'input.webm';
  const outputName = `output.${outputFormat}`;

  await ffmpeg.writeFile(inputName, await inputBlob.arrayBuffer());

  let ffmpegArgs = ['-i', inputName];

  if (outputFormat === 'mp4') {
    ffmpegArgs.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23');
  } else if (outputFormat === 'gif') {
    ffmpegArgs.push('-vf', 'fps=10,scale=640:-1:flags=lanczos,palettegen=reserve_transparent=0');
  }

  ffmpegArgs.push(outputName);

  await ffmpeg.exec(ffmpegArgs);

  const data = await ffmpeg.readFile(outputName);
  return new Blob([data], { type: `video/${outputFormat}` });
};

// Main recorder hook
export function useRecorder() {
  // State
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingMode, setRecordingMode] = useState<RecordingMode>('screen');
  const [settings, setSettings] = useState<RecordingSettings>(DEFAULT_SETTINGS);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recording, setRecording] = useState<Recording | null>(null);

  // UI state
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [processingRecording, setProcessingRecording] = useState(false);

  // Recording info
  const [recordingInfo, setRecordingInfo] = useState({
    fileSize: 0,
    resolution: '',
    fps: 0,
    bitrate: 0,
  });

  // Refs for reliable data storage
  const chunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null); // Ref for mediaStream
  const videoRefCallback = useRef<HTMLVideoElement | null>(null); // Ref for video element callback
  const mediaRecorderRef = useRef<MediaRecorder | null>(null); // Ref for mediaRecorder

  // Set video and canvas references
  const setRefs = useCallback((video: HTMLVideoElement, canvas?: HTMLCanvasElement) => {
    videoRef.current = video;
    videoRefCallback.current = video; // Assign to callback ref
    if (canvas) {
      canvasRef.current = canvas;
    }
  }, []);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<RecordingSettings>) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  }, []);

  // Fixed timer implementation
  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Calculate actual start time accounting for paused duration
    startTimeRef.current = Date.now() - pausedDurationRef.current;

    timerRef.current = setInterval(() => {
      const elapsedTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setRecordingTime(elapsedTime);
    }, 100);
  }, []);

  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // Store total elapsed time when pausing
    pausedDurationRef.current = Date.now() - startTimeRef.current;
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startTimeRef.current = 0;
    pausedDurationRef.current = 0;
    setRecordingTime(0);
  }, []);

  // Get optimized video constraints
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
      ...qualityMap[settings.quality],
      ...frameRateMap[settings.frameRate],
      cursor: settings.showCursor ? "always" : "never"
    };
  }, [settings]);

  // Request permissions based on recording mode
  const requestPermissions = useCallback(async () => {
    try {
      setIsRequestingAccess(true);
      setPermissionDenied(false);
      setErrorMessage('');

      let stream: MediaStream | null = null;

      if (recordingMode === 'screen') {
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              width: { ideal: 1920, max: 1920 },
              height: { ideal: 1080, max: 1080 },
              frameRate: { ideal: 30, max: 30 }
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              sampleRate: 44100
            }
          });
        } catch (screenError) {
          console.error('Error accessing screen:', screenError);
          throw new Error('Screen sharing not supported or denied');
        }
      } else if (recordingMode === 'camera') {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
              frameRate: { ideal: 30, max: 30 },
              facingMode: 'user'
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 44100
            }
          });
        } catch (cameraError) {
          console.error('Error accessing camera:', cameraError);
          throw new Error('Camera access denied or not available');
        }
      } else if (recordingMode === 'audio') {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 44100
            },
            video: false
          });
        } catch (audioError) {
          console.error('Error accessing microphone:', audioError);
          throw new Error('Microphone access denied or not available');
        }
      }

      if (stream) {
        mediaStreamRef.current = stream;

        // Show preview for video modes
        if (videoRefCallback.current && (recordingMode === 'screen' || recordingMode === 'camera')) {
          videoRefCallback.current.srcObject = stream;
          videoRefCallback.current.play().catch(err => console.log('Preview play error:', err));
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error getting permissions:', error);
      setPermissionDenied(true);
      const errorMsg = error instanceof Error ? error.message : 'Permission denied or device not supported';
      setErrorMessage(errorMsg);
      return false;
    } finally {
      setIsRequestingAccess(false);
    }
  }, [recordingMode]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      if (!mediaStreamRef.current) {
        const hasPermission = await requestPermissions();
        if (!hasPermission) return;
      }

      if (!mediaStreamRef.current) {
        throw new Error('No media stream available');
      }

      // Configure MediaRecorder with better codec support
      let options: MediaRecorderOptions = {};
      let mimeType = '';

      // Priority order for video codecs
      const videoCodecs = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=h264,opus',
        'video/webm',
        'video/mp4'
      ];

      // Priority order for audio codecs  
      const audioCodecs = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4'
      ];

      if (recordingMode === 'audio') {
        for (const codec of audioCodecs) {
          if (MediaRecorder.isTypeSupported(codec)) {
            options.mimeType = codec;
            mimeType = codec;
            break;
          }
        }
      } else {
        for (const codec of videoCodecs) {
          if (MediaRecorder.isTypeSupported(codec)) {
            options.mimeType = codec;
            mimeType = codec;
            break;
          }
        }
      }

      // Add quality settings
      if (recordingMode !== 'audio') {
        options.videoBitsPerSecond = 2500000; // 2.5 Mbps
      }
      options.audioBitsPerSecond = 128000; // 128 kbps

      console.log('Using MIME type:', mimeType);

      mediaRecorderRef.current = new MediaRecorder(mediaStreamRef.current, options);

      const chunks: BlobPart[] = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          console.log('Received data chunk:', (event.data.size / 1024).toFixed(2), 'KB');
        }
      };

      mediaRecorderRef.current.onstop = () => {
        console.log('MediaRecorder stopped, finishing recording...');
        const actualMimeType = mediaRecorderRef.current?.mimeType || mimeType || 'video/webm';
        const blob = new Blob(chunks, { type: actualMimeType });

        console.log('Created', (blob.size / 1024).toFixed(2), 'KB', actualMimeType, 'blob');

        const url = URL.createObjectURL(blob);
        const duration = recordingTime;

        const newRecording = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          mode: recordingMode,
          blob,
          url,
          duration,
          createdAt: new Date()
        };

        setRecording(newRecording);
        console.log('Recording completed successfully!', newRecording);

        setIsRecording(false);
        setIsPaused(false);
        setRecordingTime(0);

        // Clean up stream
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setErrorMessage('Recording error occurred');
      };

      // Start recording
      mediaRecorderRef.current.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to start recording';
      setErrorMessage(errorMsg);
    }
  }, [recordingMode, requestPermissions, recordingTime]);

  // Start with countdown
  const startRecordingWithCountdown = useCallback((seconds: number = 3) => {
    if (isPaused && mediaRecorderRef.current) {
      startRecording(); // If paused, resume by starting again
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
  }, [isPaused, mediaRecorderRef, startRecording]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.pause();
        pauseTimer();
        setIsRecording(false);
        setIsPaused(true);
      } catch (error) {
        console.error("Pause error:", error);
      }
    }
  }, [mediaRecorderRef, isRecording, pauseTimer]);

  // Stop recording
  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && (isRecording || isPaused)) {
      try {
        setProcessingRecording(true);
        mediaRecorderRef.current.stop();
        resetTimer();
        setIsRecording(false);
        setIsPaused(false);
      } catch (error) {
        console.error("Stop error:", error);
        setProcessingRecording(false);
      }
    }
  }, [mediaRecorderRef, isRecording, isPaused, resetTimer]);

  // Process recording into final blob
  const finishRecording = useCallback(() => {
    try {
      const chunks = chunksRef.current;
      if (chunks.length === 0) {
        setProcessingRecording(false);
        setErrorMessage("No recording data captured");
        return;
      }

      const mimeType = recordingMode === 'audio' ? 'audio/webm' : 'video/webm';
      const recordingBlob = new Blob(chunks, { type: mimeType });

      if (recordingBlob.size === 0) {
        setProcessingRecording(false);
        setErrorMessage("Recording file is empty");
        return;
      }

      const recordingUrl = URL.createObjectURL(recordingBlob);

      const newRecording: Recording = {
        id: generateId(),
        mode: recordingMode,
        blob: recordingBlob,
        url: recordingUrl,
        duration: recordingTime,
        createdAt: new Date()
      };

      setRecording(newRecording);
      setProcessingRecording(false);

      console.log(`Recording completed: ${formatFileSize(recordingBlob.size)}`);

    } catch (error) {
      console.error("Finish recording error:", error);
      setProcessingRecording(false);
      setErrorMessage("Failed to process recording");
    }
  }, [recordingMode, recordingTime]);

  // Download with format conversion
  const downloadRecording = useCallback(async (format: string = 'webm') => {
    if (!recording) return;

    try {
      let downloadBlob = recording.blob;
      let fileName = `recording-${Date.now()}.${format}`;

      // Convert video format if needed using FFmpeg.wasm
      if (format !== 'webm' && recording.mode !== 'audio') {
        try {
          // Check if FFmpeg is available and conversion is supported for the format
          const ffmpeg = await loadFFmpeg();
          if (ffmpeg) {
            downloadBlob = await convertVideoFormat(recording.blob, format);
            console.log(`Converted to ${format}`);
          } else {
            throw new Error('FFmpeg not available for conversion');
          }
        } catch (error) {
          console.warn(`Format conversion failed (${format}), downloading as original format:`, error);
          // Fallback to original format if conversion fails
          format = recording.blob.type.split('/')[1] || 'webm'; // Get extension from blob type
          fileName = `recording-${Date.now()}.${format}`;
        }
      } else if (format === 'mp4' && recording.mode !== 'audio' && !recording.blob.type.includes('mp4')) {
        // Handle cases where original blob is webm but mp4 is requested and FFmpeg is available
        try {
          const ffmpeg = await loadFFmpeg();
          if (ffmpeg) {
            downloadBlob = await convertVideoFormat(recording.blob, 'mp4');
            console.log('Converted to mp4');
            fileName = `recording-${Date.now()}.mp4`;
          } else {
            throw new Error('FFmpeg not available for conversion');
          }
        } catch (error) {
          console.warn(`Format conversion to mp4 failed, downloading as original format:`, error);
          format = recording.blob.type.split('/')[1] || 'webm';
          fileName = `recording-${Date.now()}.${format}`;
        }
      }

      const a = document.createElement('a');
      a.href = URL.createObjectURL(downloadBlob);
      a.download = fileName;
      a.click();

      // Cleanup
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);

    } catch (error) {
      console.error("Download error:", error);
      setErrorMessage("Download failed");
    }
  }, [recording]);

  // Export with multiple formats
  const exportRecording = useCallback(async (format: string) => {
    await downloadRecording(format);
  }, [downloadRecording]);

  // Reset everything
  const resetRecording = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (recording?.url) {
      URL.revokeObjectURL(recording.url);
    }

    resetTimer();
    setIsRecording(false);
    setIsPaused(false);
    setMediaStream(null);
    setMediaRecorder(null);
    setRecording(null);
    setErrorMessage('');
    setPermissionDenied(false);
    setProcessingRecording(false);
    setCountdown(0);
    setRecordingInfo({ fileSize: 0, resolution: '', fps: 0, bitrate: 0 });
    chunksRef.current = [];
  }, [recording, resetTimer]);

  // Get recording info for display
  const getRecordingInfo = useCallback(() => {
    return {
      fileSize: formatFileSize(recordingInfo.fileSize),
      duration: formatTime(recordingTime),
      resolution: recordingInfo.resolution,
      fps: recordingInfo.fps,
      bitrate: recordingInfo.bitrate,
      mode: recordingMode
    };
  }, [recordingInfo, recordingTime, recordingMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (recording?.url) {
        URL.revokeObjectURL(recording.url);
      }
    };
  }, [recording]);

  return {
    // State
    isRecording,
    isPaused,
    recordingTime,
    recordingMode,
    settings,
    recording,

    // UI state
    isRequestingAccess,
    permissionDenied,
    errorMessage,
    countdown,
    processingRecording,

    // Actions
    setRecordingMode,
    updateSettings,
    requestPermissions,
    startRecording,
    startRecordingWithCountdown,
    pauseRecording,
    stopRecording: handleStopRecording,
    downloadRecording,
    exportRecording,
    resetRecording,

    // Utilities
    formatTime,
    formatFileSize,
    getRecordingInfo,
    setRefs
  };
}