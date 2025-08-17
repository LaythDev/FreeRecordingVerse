import React, { useState, useRef, useEffect } from 'react';
import { RecordingMode, RecordingSettings, Recording } from '@shared/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Import Lucide icons
import {
  Monitor,
  Camera,
  Mic,
  Play,
  Pause,
  Square,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Settings,
  Video,
  Scissors,
  ChevronDown,
  Trash2,
  Clock,
  FileText,
  Edit,
  FileVideo,
  Image,
  Loader2,
  Info
} from 'lucide-react';

const DEFAULT_SETTINGS: RecordingSettings = {
  quality: "720",
  frameRate: "30",
  includeAudio: true,
  showCursor: true,
};

// Format time display
const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Simple Video Editor Component
const SimpleVideoEditor = ({ recording, onBack, onExport }: { 
  recording: Recording; 
  onBack: () => void; 
  onExport: (format: string) => void; 
}) => {
  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
      <div className="flex justify-between items-center mb-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onBack}
        >
          Back to Recorder
        </Button>
        <h2 className="text-xl font-bold">Video Editor</h2>
        <div></div>
      </div>
      
      <div className="aspect-video bg-black rounded-lg mb-6 flex items-center justify-center overflow-hidden">
        <video 
          src={recording.url} 
          controls 
          className="w-full h-full"
        />
      </div>
      
      <div className="flex flex-wrap gap-3 justify-center">
        <Button
          variant="outline"
          onClick={() => onExport('webm')}
        >
          <Download className="mr-2 h-4 w-4" />
          Export WebM
        </Button>
        
        <Button
          variant="outline"
          onClick={() => onExport('mp4')}
        >
          <FileVideo className="mr-2 h-4 w-4" />
          Export MP4
        </Button>
        
        {recording.mode !== 'audio' && (
          <Button
            variant="outline"
            onClick={() => onExport('gif')}
          >
            <Image className="mr-2 h-4 w-4" />
            Export GIF
          </Button>
        )}
      </div>
    </div>
  );
};

// Main Professional Screen Recorder Component
const ProScreenRecorder: React.FC = () => {
  // State
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [activeTab, setActiveTab] = useState<RecordingMode>('screen');
  const [recordingMode, setRecordingMode] = useState<RecordingMode>('screen');
  const [settings, setSettings] = useState<RecordingSettings>(DEFAULT_SETTINGS);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recording, setRecording] = useState<Recording | null>(null);
  
  // UI state
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isEditingVideo, setIsEditingVideo] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [processingRecording, setProcessingRecording] = useState(false);
  const [recordingInfo, setRecordingInfo] = useState({
    fileSize: 0,
    resolution: '',
  });
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  
  // Update settings
  const updateSettings = (newSettings: Partial<RecordingSettings>) => {
    // Ensure proper types for quality and frameRate
    const typedSettings: Partial<RecordingSettings> = {};
    
    if (newSettings.quality) {
      typedSettings.quality = newSettings.quality as "1080" | "720" | "480";
    }
    
    if (newSettings.frameRate) {
      typedSettings.frameRate = newSettings.frameRate as "60" | "30" | "24";
    }
    
    if (typeof newSettings.includeAudio !== 'undefined') {
      typedSettings.includeAudio = newSettings.includeAudio;
    }
    
    if (typeof newSettings.showCursor !== 'undefined') {
      typedSettings.showCursor = newSettings.showCursor;
    }
    
    setSettings(prev => ({ ...prev, ...typedSettings }));
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    const mode = value as RecordingMode;
    setActiveTab(mode);
    setRecordingMode(mode);
  };

  // Timer functions
  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    startTimeRef.current = Date.now() - (pausedTimeRef.current || 0);
    
    timerRef.current = setInterval(() => {
      const elapsedTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setRecordingTime(elapsedTime);
    }, 100);
  };
  
  const pauseTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      pausedTimeRef.current = Date.now() - startTimeRef.current;
    }
  };
  
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startTimeRef.current = 0;
    pausedTimeRef.current = 0;
  };

  // Generate video constraints based on settings
  const getVideoConstraints = () => {
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
  };

  // Request permissions
  const requestPermissions = async () => {
    try {
      setIsRequestingAccess(true);
      setPermissionDenied(false);
      setErrorMessage('');
      
      // Stop any existing streams
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }

      let stream: MediaStream;

      // Request media based on mode
      if (recordingMode === "screen") {
        try {
          const displayMediaOptions = {
            video: getVideoConstraints(),
            audio: settings.includeAudio
          };
          
          // Request screen sharing
          stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions as any);
          
          // Add audio if enabled - with improved audio capture
          if (settings.includeAudio) {
            try {
              const audioStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true
                }
              });
              
              // Create a new combined stream to properly mix video and audio
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
          throw new Error("Failed to access your screen. Please check permissions and try again.");
        }
      } else if (recordingMode === "camera") {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: settings.includeAudio
          });
        } catch (err) {
          console.error("Error accessing camera:", err);
          throw new Error("Failed to access your camera. Please check permissions and try again.");
        }
      } else if (recordingMode === "audio") {
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
        throw new Error(`Unsupported recording mode: ${recordingMode}`);
      }

      // Set up track ended listeners
      stream.getTracks().forEach(track => {
        track.onended = () => {
          console.log("Media track ended");
          if (isRecording) {
            stopRecording();
          }
        };
      });

      // Update state with the new stream
      setMediaStream(stream);
      
      // Setup video preview with improved autoplay handling
      if (videoRef.current && recordingMode !== 'audio') {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; // Prevent feedback
        
        // Use user interaction to trigger play safely without autoplay issues
        const playPreview = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(err => {
              // If autoplay is blocked, we won't show an error since we'll rely on the user seeing the preview
              console.log("Preview autoplay prevented - this is normal behavior", err);
            });
          }
        };
        
        // Try to play, and if it fails, it's okay - the user will see the live feed anyway
        playPreview();
        
        // Add click handler to video preview to ensure playback on user interaction
        videoRef.current.onclick = playPreview;
      }
      
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
      
      throw error;
    }
  };

  // Handle selecting media
  const handleSelectMedia = async () => {
    try {
      await requestPermissions();
      return true;
    } catch (error) {
      return false;
    }
  };

  // Start recording
  const startRecording = async (skipPermissionRequest = false) => {
    try {
      // Reset error state
      setErrorMessage('');

      // If paused, resume recording
      if (isPaused && mediaRecorder) {
        mediaRecorder.resume();
        startTimer();
        setIsPaused(false);
        return;
      }

      // Get media stream (use existing if told to skip permission request)
      const stream = skipPermissionRequest ? mediaStream! : await requestPermissions();
      // Reset recorded chunks for new recording
      setRecordedChunks([]);

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
      if (recordingMode === "audio") {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          options.mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          options.mimeType = 'audio/webm';
        }
      }

      console.log("Starting recording with options:", options);

      // Reset recording state and timer
      setRecordingTime(0);
      setRecording(null);
      
      // Initialize timer with immediate update
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;
      
      // Start the timer immediately
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Force an immediate update of the timer display before the interval starts
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        const elapsedTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordingTime(elapsedTime);
      }, 100);

      // Create MediaRecorder
      const recorder = new MediaRecorder(stream, options);
      
      // Set up data collection
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          setRecordedChunks(prev => [...prev, event.data]);
          
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
      recorder.onerror = () => {
        console.error("MediaRecorder error");
        stopRecording();
      };

      setMediaRecorder(recorder);
      setIsRecording(true);
      setIsPaused(false);

      // Start recording with small timeslices for better real-time performance
      recorder.start(200);
      
      console.log("Recording started successfully");
    } catch (error) {
      console.error("Error starting recording:", error);
      stopTimer();
      setIsRecording(false);
      setIsPaused(false);
      
      // Show error toast
      toast({
        title: "Recording Error",
        description: "Failed to start recording. Please check your permissions and try again.",
        variant: "destructive",
      });
    }
  };

  // Pause recording
  const pauseRecording = () => {
    if (!mediaRecorder) return;
    
    if (isPaused) {
      // Resume recording
      mediaRecorder.resume();
      startTimer();
      setIsPaused(false);
    } else {
      // Pause recording
      mediaRecorder.pause();
      pauseTimer();
      setIsPaused(true);
    }
  };

  // Process recording data directly from chunks
  const processRecordingData = (chunks: Blob[]) => {
    stopTimer();
    
    try {
      // Create appropriate mime type
      const mimeType = recordingMode === "audio" ? "audio/webm" : "video/webm";
      
      // Create the blob and URL
      const recordingBlob = new Blob(chunks, { type: mimeType });
      const recordingUrl = URL.createObjectURL(recordingBlob);
      
      console.log("Created recording blob:", formatFileSize(recordingBlob.size));
      
      // Create the recording object
      const newRecording: Recording = {
        id: Date.now().toString(),
        mode: recordingMode,
        blob: recordingBlob,
        url: recordingUrl,
        duration: recordingTime,
        createdAt: new Date()
      };
      
      // Set the recording
      setRecording(newRecording);
      
      // Update info
      setRecordingInfo(prev => ({
        ...prev,
        fileSize: recordingBlob.size
      }));
      
      // Show success toast
      toast({
        title: "Recording Complete",
        description: `Your ${formatTime(recordingTime)} recording is ready.`,
        variant: "default"
      });
      
      // Set up preview display
      setTimeout(() => {
        if (previewRef.current) {
          previewRef.current.src = recordingUrl;
        }
      }, 100);
    } catch (error) {
      console.error("Error processing recording:", error);
      
      toast({
        title: "Processing Error",
        description: "Failed to process recording. Please try again.",
        variant: "destructive"
      });
    }
    
    // Reset state
    setIsRecording(false);
    setIsPaused(false);
    setMediaRecorder(null);
    
    // Stop media tracks
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }
    
    setMediaStream(null);
  };

  // Process recording and create final output
  const finishRecording = () => {
    stopTimer();
    
    if (!recordedChunks.length) {
      console.warn("No recording data captured");
      setIsRecording(false);
      setIsPaused(false);
      setMediaRecorder(null);
      
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      
      setMediaStream(null);
      
      // Show error toast for no recording data
      toast({
        title: "Recording Failed",
        description: "No recording data was captured. Please try again.",
        variant: "destructive",
      });
      
      return;
    }
    
    // Set processing state
    setProcessingRecording(true);
    
    // Create appropriate mime type
    const mimeType = recordingMode === "audio" ? "audio/webm" : "video/webm";
    
    // Create the final recording blob
    try {
      const recordingBlob = new Blob(recordedChunks, { type: mimeType });
      
      // Check if we actually have data in the blob
      if (recordingBlob.size === 0) {
        throw new Error("Empty recording blob created");
      }
      
      const recordingUrl = URL.createObjectURL(recordingBlob);
      
      // Set file size in recording info
      setRecordingInfo(prev => ({
        ...prev,
        fileSize: recordingBlob.size
      }));
      
      const newRecording: Recording = {
        id: Date.now().toString(),
        mode: recordingMode,
        blob: recordingBlob,
        url: recordingUrl,
        duration: recordingTime,
        createdAt: new Date()
      };
      
      console.log("Recording completed:", {
        mode: newRecording.mode,
        duration: newRecording.duration,
        size: formatFileSize(recordingBlob.size),
        chunks: recordedChunks.length
      });
      
      // Update state with completed recording
      setRecording(newRecording);
      setProcessingRecording(false);
      
      // Show success toast
      toast({
        title: "Recording Complete",
        description: `Your ${formatTime(recordingTime)} recording is ready to view and download.`,
        variant: "default",
      });
      
      // Wait a moment for state to update, then initialize the preview video
      setTimeout(() => {
        if (previewRef.current) {
          previewRef.current.src = recordingUrl;
          
          // Add click-to-play functionality
          previewRef.current.onclick = () => {
            if (previewRef.current && previewRef.current.paused) {
              previewRef.current.play().catch(err => {
                console.log("Manual play failed:", err);
              });
            }
          };
        }
      }, 100);
      
    } catch (error) {
      console.error("Error finalizing recording:", error);
      setProcessingRecording(false);
      
      // Show error toast
      toast({
        title: "Processing Error",
        description: "Error processing recording. Please try again.",
        variant: "destructive",
      });
    }
    
    // Clean up recording state
    setIsRecording(false);
    setIsPaused(false);
    setMediaRecorder(null);
    
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }
    
    setMediaStream(null);
  };

  // Stop recording
  const stopRecording = () => {
    if (!mediaRecorder) return;
    
    try {
      // Only stop if not already stopped
      if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      
      // finishRecording will be called by onstop handler
    } catch (error) {
      console.error("Error stopping recording:", error);
      finishRecording(); // Manually call in case of error
    }
  };

  // Reset recording
  const resetRecording = () => {
    // Clean up any existing recording
    if (recording) {
      URL.revokeObjectURL(recording.url);
    }
    
    // Reset state
    setRecordingTime(0);
    setRecording(null);
    setRecordedChunks([]);
    setRecordingInfo({
      fileSize: 0,
      resolution: ''
    });
    
    toast({
      title: "Recording Reset",
      description: "Ready to start a new recording.",
      variant: "default",
    });
  };

  // Start countdown then recording (without requesting permissions twice)
  const startCountdownBeforeRecording = () => {
    // Check if we already have the necessary stream before showing countdown
    if (!mediaStream && recordingMode === "screen") {
      // If we need to request screen permission, do that first before starting countdown
      handleSelectMedia().then(success => {
        if (success) {
          // Now start countdown
          showCountdownAndStartRecording();
        }
      });
    } else {
      // Already have permissions, just start countdown
      showCountdownAndStartRecording();
    }
  };
  
  // Helper function to show countdown and then start recording
  const showCountdownAndStartRecording = () => {
    // Start with 3 second countdown
    setCountdown(3);
    
    // Reset recording time to ensure we start from 0
    setRecordingTime(0);
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          // Start recording without requesting permissions again
          startRecording(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Toggle recording (start/stop) - simplified for reliability
  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
      return;
    }
    
    // Always request fresh permissions when starting a new recording
    try {
      // Request permissions directly
      const stream = await requestPermissions();
      
      if (!stream) {
        console.error("Failed to get media stream");
        return;
      }
      
      // Set the media stream
      setMediaStream(stream);
      
      // Reset state
      setRecordedChunks([]);
      setRecordingTime(0);
      setIsPaused(false);
      setIsRecording(true);
      
      // Start the timer immediately
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      timerRef.current = setInterval(() => {
        const elapsedTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordingTime(elapsedTime);
      }, 100);
      
      // Create optimal recording options
      const options: MediaRecorderOptions = { 
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 5000000,
        audioBitsPerSecond: 128000
      };
      
      // Try different codecs if vp9 isn't supported
      if (!MediaRecorder.isTypeSupported(options.mimeType || '')) {
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
          options.mimeType = 'video/webm;codecs=vp8,opus';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
          options.mimeType = 'video/webm';
        }
      }
      
      console.log("Starting recording with options:", options);
      
      // Create MediaRecorder
      const recorder = new MediaRecorder(stream, options);
      
      // Set up data collection with improved handling
      let chunks: Blob[] = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          console.log("Received data chunk:", event.data.size, "bytes");
          chunks.push(event.data);
          setRecordedChunks(prev => [...prev, event.data]);
        }
      };
      
      // Handle recorder stopping
      recorder.onstop = () => {
        console.log("MediaRecorder stopped, processing recording...");
        finishRecording();
      };
      
      // Setup error handler
      recorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        stopRecording();
      };
      
      setMediaRecorder(recorder);
      
      // Force data collection every 100ms to ensure we get data
      recorder.start(100);
      
      console.log("Recording started successfully");
    } catch (error) {
      console.error("Error starting recording:", error);
      setIsRecording(false);
      
      toast({
        title: "Recording Error",
        description: "Failed to start recording. Please check your permissions and try again.",
        variant: "destructive",
      });
    }
  };

  // Download recording
  const downloadRecording = (format: 'mp4' | 'webm' | 'gif' = 'webm') => {
    if (!recording) return;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let fileName = `recording_${timestamp}.${format}`;
    
    // For audio recordings, use appropriate format
    if (recording.mode === 'audio') {
      fileName = `audio_${timestamp}.webm`;
    }
    
    const a = document.createElement('a');
    a.href = recording.url;
    a.download = fileName;
    a.click();
    
    toast({
      title: "Download Started",
      description: `Your recording is being downloaded as ${fileName}`,
      variant: "default",
    });
  };

  // Edit recording
  const handleEditRecording = () => {
    if (recording) {
      setIsEditingVideo(true);
    }
  };

  // Delete recording
  const handleDeleteRecording = () => {
    if (window.confirm('Are you sure you want to delete this recording?')) {
      resetRecording();
    }
  };

  // Export video in different format
  const handleExportVideo = (format: string) => {
    downloadRecording(format as 'webm' | 'mp4' | 'gif');
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      
      if (recording) {
        URL.revokeObjectURL(recording.url);
      }
    };
  }, [mediaStream, recording]);

  return (
    <div className="py-8 px-4 md:px-6 lg:px-8">
      {isEditingVideo && recording ? (
        // Video editor view
        <SimpleVideoEditor 
          recording={recording} 
          onBack={() => setIsEditingVideo(false)}
          onExport={handleExportVideo}
        />
      ) : (
        // Main recorder view
        <Card className="shadow-lg border-gray-200 overflow-hidden">
          <CardHeader className="bg-white border-b border-gray-100 px-6 py-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-xl text-gray-800">Professional Screen Recorder</CardTitle>
                <CardDescription className="text-gray-500">
                  Record your screen, camera, or audio with professional quality
                </CardDescription>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge className={`${
                  countdown > 0 
                    ? "bg-yellow-500 animate-pulse"
                    : isRecording
                      ? isPaused
                        ? "bg-yellow-500"
                        : "bg-red-500 animate-pulse"
                      : "bg-gray-200 text-gray-600"
                } px-3 py-1 text-xs font-semibold rounded-full`}>
                  {countdown > 0 
                    ? `Starting in ${countdown}...` 
                    : isRecording
                      ? isPaused
                        ? "Paused"
                        : "Recording"
                      : "Ready"}
                </Badge>
                
                {isRecording && (
                  <span className="text-sm font-mono">
                    {formatTime(recordingTime)}
                  </span>
                )}
              </div>
            </div>
          </CardHeader>

          <Tabs 
            defaultValue="screen" 
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <TabsList className="grid grid-cols-3 md:w-[400px]">
                <TabsTrigger 
                  value="screen" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-white"
                  disabled={isRecording}
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  Screen
                </TabsTrigger>
                <TabsTrigger 
                  value="camera" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-white"
                  disabled={isRecording}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Camera
                </TabsTrigger>
                <TabsTrigger 
                  value="audio" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-white"
                  disabled={isRecording}
                >
                  <Mic className="h-4 w-4 mr-2" />
                  Audio
                </TabsTrigger>
              </TabsList>
            </div>

            {/* SCREEN RECORDING TAB */}
            <TabsContent value="screen" className="p-6">
              <div className="aspect-video bg-gray-100 rounded-lg mb-6 flex items-center justify-center border border-gray-200 overflow-hidden relative">
                {isRecording && (
                  <div className="absolute top-4 right-4 bg-red-500 text-white text-sm py-1 px-3 rounded-full flex items-center gap-1 shadow-md z-10">
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                    REC {formatTime(recordingTime)}
                  </div>
                )}
                {recording && !isRecording ? (
                  <div className="relative w-full h-full">
                    <video 
                      ref={previewRef} 
                      src={recording.url}
                      className="w-full h-full" 
                      controls 
                      playsInline
                      muted
                      onCanPlay={() => {
                        if (previewRef.current) {
                          previewRef.current.muted = false; // Unmute when ready
                        }
                      }}
                    />
                    <div className="absolute top-4 right-4 flex gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="secondary" onClick={handleEditRecording}>
                              <Scissors className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit Recording</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <DropdownMenu>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="secondary">
                                  <Download className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent>Download</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <DropdownMenuContent className="w-52">
                          <DropdownMenuLabel>Export As</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => handleExportVideo('webm')}>
                              WebM (High Quality)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExportVideo('mp4')}>
                              MP4 (Compatible)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExportVideo('gif')}>
                              GIF (Animated)
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="secondary" onClick={resetRecording}>
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>New Recording</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    
                    {/* Recording info overlay */}
                    <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white rounded-md p-2 text-xs">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>Duration:</span>
                        </div>
                        <span className="font-mono">{formatTime(recording.duration)}</span>
                        
                        <div className="flex items-center">
                          <FileText className="h-3 w-3 mr-1" />
                          <span>Size:</span>
                        </div>
                        <span className="font-mono">{formatFileSize(recordingInfo.fileSize)}</span>
                        
                        <div className="flex items-center">
                          <Monitor className="h-3 w-3 mr-1" />
                          <span>Resolution:</span>
                        </div>
                        <span className="font-mono">{recordingInfo.resolution || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>
                ) : mediaStream ? (
                  <div className="relative w-full h-full">
                    <video 
                      ref={videoRef}
                      className="w-full h-full" 
                      muted 
                      playsInline
                    />
                    
                    {isRecording && (
                      <div className="absolute top-4 right-4 bg-red-500 text-white text-sm py-1 px-3 rounded-full flex items-center gap-1 shadow-md">
                        <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                        REC {formatTime(recordingTime)}
                      </div>
                    )}
                    
                    {countdown > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="text-white text-7xl font-bold animate-pulse">
                          {countdown}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center px-4 py-12">
                    <Monitor className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-xl font-semibold mb-2 text-gray-700">Select Your Screen</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Choose which screen or application window you want to record
                    </p>
                    
                    <Button 
                      size="lg"
                      onClick={handleSelectMedia}
                      className="bg-primary text-white font-medium hover:bg-primary/90 transition-all"
                      disabled={isRequestingAccess}
                    >
                      {isRequestingAccess ? (
                        <span className="flex items-center">
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 
                          Requesting access...
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <Monitor className="h-4 w-4 mr-2" /> 
                          Select Screen
                        </span>
                      )}
                    </Button>
                    
                    {permissionDenied && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Permission denied</p>
                          <p className="text-sm">{errorMessage || 'Please allow screen access in your browser.'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Status display when recording */}
              {isRecording && (
                <div className="mb-6 bg-primary/5 p-4 rounded-lg border border-primary/10">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                    <div className="font-mono text-xl font-semibold">{formatTime(recordingTime)}</div>
                    <span className="text-gray-600">
                      {recordingMode === 'screen' ? 'Screen recording' : 
                       recordingMode === 'camera' ? 'Camera recording' : 
                       'Audio recording'} in progress...
                    </span>
                  </div>
                  <Progress 
                    value={Math.min((recordingTime / 3600) * 100, 100)} 
                    className="h-1.5 mt-3" 
                  />
                </div>
              )}

              {/* Recording Details Info Card - only visible when previewing a recording */}
              {recording && !isRecording && (
                <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200">
                  <h3 className="font-medium mb-2 flex items-center">
                    <Info className="h-4 w-4 mr-2 text-primary" />
                    Recording Details
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Duration</p>
                      <p className="font-medium">{formatTime(recording.duration)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">File Size</p>
                      <p className="font-medium">{formatFileSize(recordingInfo.fileSize || 0)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Resolution</p>
                      <p className="font-medium">{recordingInfo.resolution || 'Auto'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Format</p>
                      <p className="font-medium">{recording.mode === 'audio' ? 'Audio (WebM)' : 'Video (WebM)'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Video Settings Panel */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="quality" className="text-gray-700 mb-2 block">Video Quality</Label>
                      <Select 
                        disabled={isRecording}
                        value={settings.quality}
                        onValueChange={(value) => updateSettings({ quality: value as "1080" | "720" | "480" })}
                      >
                        <SelectTrigger id="quality" className="border-gray-200">
                          <SelectValue placeholder="Select quality" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1080">Full HD (1080p)</SelectItem>
                          <SelectItem value="720">HD (720p)</SelectItem>
                          <SelectItem value="480">SD (480p)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="frameRate" className="text-gray-700 mb-2 block">Frame Rate</Label>
                      <Select 
                        disabled={isRecording}
                        value={settings.frameRate}
                        onValueChange={(value) => updateSettings({ frameRate: value as "60" | "30" | "24" })}
                      >
                        <SelectTrigger id="frameRate" className="border-gray-200">
                          <SelectValue placeholder="Select frame rate" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="60">60 FPS (Smooth Motion)</SelectItem>
                          <SelectItem value="30">30 FPS (Standard)</SelectItem>
                          <SelectItem value="24">24 FPS (Film-like)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-gray-700">Include Audio</Label>
                        <p className="text-gray-500 text-sm">Record system and microphone audio</p>
                      </div>
                      <Switch 
                        checked={settings.includeAudio}
                        disabled={isRecording}
                        onCheckedChange={(checked) => updateSettings({ includeAudio: checked })}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-gray-700">Show Cursor</Label>
                        <p className="text-gray-500 text-sm">Include your mouse pointer in the recording</p>
                      </div>
                      <Switch 
                        checked={settings.showCursor}
                        disabled={isRecording}
                        onCheckedChange={(checked) => updateSettings({ showCursor: checked })}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Main Recording Controls */}
                <div className="flex flex-wrap gap-4 mt-6">
                  {/* Start/Stop Recording Button */}
                  <Button 
                    size="lg" 
                    className={`py-6 flex items-center justify-center gap-2 font-medium ${
                      isRecording 
                        ? 'bg-destructive text-white hover:bg-destructive/90' 
                        : 'bg-primary text-white hover:bg-primary/90'
                    }`}
                    onClick={toggleRecording}
                    disabled={isRequestingAccess || countdown > 0 || processingRecording}
                  >
                    {isRequestingAccess || processingRecording ? (
                      <span className="flex items-center">
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        {processingRecording ? "Processing..." : "Preparing..."}
                      </span>
                    ) : countdown > 0 ? (
                      <span className="flex items-center">
                        <span className="h-5 w-5 mr-2 flex items-center justify-center">{countdown}</span>
                        Starting soon...
                      </span>
                    ) : isRecording ? (
                      <>
                        <Square className="h-5 w-5" />
                        Stop Recording
                      </>
                    ) : recording ? (
                      <>
                        <RefreshCw className="h-5 w-5" />
                        New Recording
                      </>
                    ) : (
                      <>
                        <Play className="h-5 w-5" />
                        Start Recording
                      </>
                    )}
                  </Button>
                  
                  {/* Pause/Resume button only visible when recording */}
                  {isRecording && (
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="py-6 flex items-center justify-center gap-2 border-gray-200 hover:bg-gray-50"
                      onClick={pauseRecording}
                    >
                      {isPaused ? (
                        <>
                          <Play className="h-5 w-5" />
                          Resume
                        </>
                      ) : (
                        <>
                          <Pause className="h-5 w-5" />
                          Pause
                        </>
                      )}
                    </Button>
                  )}
                  
                  {/* Edit button - only visible when recording is complete */}
                  {!isRecording && recording && (
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="py-6 flex items-center justify-center gap-2 border-gray-200 hover:bg-blue-50 text-blue-600 hover:text-blue-700 hover:border-blue-200"
                      onClick={handleEditRecording}
                    >
                      <Scissors className="h-5 w-5" />
                      Edit Recording
                    </Button>
                  )}
                  
                  {/* Download button - only visible when recording is complete */}
                  {!isRecording && recording && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          size="lg" 
                          variant="outline" 
                          className="py-6 flex items-center justify-center gap-2 border-gray-200 hover:bg-green-50 text-green-600 hover:text-green-700 hover:border-green-200"
                        >
                          <Download className="h-5 w-5" />
                          Download <ChevronDown className="h-4 w-4 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56">
                        <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                          <DropdownMenuItem onClick={() => handleExportVideo('webm')}>
                            <FileVideo className="h-4 w-4 mr-2" />
                            WebM (High Quality)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExportVideo('mp4')}>
                            <Video className="h-4 w-4 mr-2" />
                            MP4 (Compatible)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExportVideo('gif')} 
                            disabled={recordingMode === 'audio'}>
                            <Image className="h-4 w-4 mr-2" />
                            GIF (Animated)
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  
                  {/* Delete recording button - only visible when recording is complete */}
                  {!isRecording && recording && (
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="py-6 flex items-center justify-center gap-2 border-gray-200 hover:bg-red-50 text-red-600 hover:text-red-700 hover:border-red-200"
                      onClick={handleDeleteRecording}
                    >
                      <Trash2 className="h-5 w-5" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>
            
            {/* CAMERA TAB */}
            <TabsContent value="camera" className="p-6">
              <div className="text-center px-4 py-12">
                <Camera className="h-16 w-16 text-primary mb-4 mx-auto" />
                <h3 className="text-xl font-semibold mb-2">Camera Recording</h3>
                <p className="text-gray-600 mb-6">Record yourself using your camera</p>
                <Button 
                  size="lg"
                  onClick={toggleRecording}
                  className="bg-primary text-white"
                >
                  {isRecording ? "Stop Recording" : "Start Camera Recording"}
                </Button>
              </div>
            </TabsContent>
            
            {/* AUDIO TAB */}
            <TabsContent value="audio" className="p-6">
              <div className="text-center px-4 py-12">
                <Mic className="h-16 w-16 text-primary mb-4 mx-auto" />
                <h3 className="text-xl font-semibold mb-2">Audio Recording</h3>
                <p className="text-gray-600 mb-6">Record audio from your microphone</p>
                <Button 
                  size="lg"
                  onClick={toggleRecording}
                  className="bg-primary text-white"
                >
                  {isRecording ? "Stop Recording" : "Start Audio Recording"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      )}

      {/* Add custom CSS for animation */}
      <style>{`
        @keyframes pulse {
          0% { height: 10px; }
          50% { height: 40px; }
          100% { height: 20px; }
        }
      `}</style>
    </div>
  );
};

export default ProScreenRecorder;