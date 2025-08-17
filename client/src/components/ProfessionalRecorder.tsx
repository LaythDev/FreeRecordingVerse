import React, { useState, useRef, useEffect } from 'react';
import { useScreenRecorder } from '@/hooks/useScreenRecorder';
import { RecordingMode, RecordingSettings } from '@shared/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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
import { toast } from "@/hooks/use-toast";

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
  Share2,
  ChevronDown,
  Trash2,
  Clock,
  FileText,
  Edit,
  FileVideo,
  Image,
  Loader2,
  Info,
  ArrowLeft,
} from 'lucide-react';

// Professional Video Editor Component
const SimpleVideoEditor = ({ 
  recording, 
  onSave, 
  onBack, 
  onExport 
}: { 
  recording: any; 
  onSave: (blob: Blob) => void; 
  onBack: () => void; 
  onExport: (format: string) => void; 
}) => {
  return (
    <div className="editor-container bg-gray-50 rounded-lg border border-gray-200 p-4">
      <div className="flex justify-between items-center mb-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onBack}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
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
          variant="default"
          onClick={() => onSave(recording.blob)}
          className="bg-primary text-white hover:bg-primary/90"
        >
          <Edit className="mr-2 h-4 w-4" />
          Save As Is
        </Button>
        
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
const ProfessionalRecorder: React.FC = () => {
  // State management
  const [activeTab, setActiveTab] = useState<RecordingMode>('screen');
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isEditingVideo, setIsEditingVideo] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [showPreview, setShowPreview] = useState(true);
  
  // References
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  
  // Use the screen recorder hook
  const {
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
  } = useScreenRecorder();

  // Set preview refs when component mounts
  useEffect(() => {
    if (videoRef.current && canvasRef.current) {
      setPreviewRefs(videoRef.current, canvasRef.current);
    }
  }, [videoRef.current, canvasRef.current, setPreviewRefs]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    const mode = value as RecordingMode;
    setActiveTab(mode);
    setRecordingMode(mode);
  };

  // Update recording settings
  const handleSettingsChange = (key: keyof RecordingSettings, value: any) => {
    updateSettings({ [key]: value });
  };

  // Request media access
  const handleSelectMedia = async () => {
    try {
      setIsRequestingAccess(true);
      setPermissionDenied(false);
      setErrorMessage('');
      
      const stream = await requestPermissions();
      setIsRequestingAccess(false);
      
      return true;
    } catch (error) {
      console.error(`Error accessing ${activeTab}:`, error);
      setIsRequestingAccess(false);
      setPermissionDenied(true);
      
      // Set user-friendly error message
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(`Failed to access your ${activeTab}. Please check your permissions.`);
      }
      
      return false;
    }
  };

  // Start countdown before recording
  const startCountdownBeforeRecording = () => {
    // Start with 3 second countdown
    setCountdown(3);
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          startActualRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Start the actual recording after countdown
  const startActualRecording = async () => {
    try {
      setIsRequestingAccess(true);
      setPermissionDenied(false);
      setErrorMessage('');
      
      await startRecording();
      setIsRequestingAccess(false);
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRequestingAccess(false);
      setPermissionDenied(true);
      
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Failed to start recording. Please check permissions and try again.');
      }
      
      // Show error toast
      toast({
        title: "Recording Error",
        description: errorMessage || "Failed to start recording. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Toggle recording (start/stop)
  const toggleRecording = async () => {
    if (state.isRecording) {
      await stopRecording();
      
      // Show success toast
      toast({
        title: "Recording Complete",
        description: `Your ${state.recordingMode} recording has been saved. Duration: ${formatTime(state.recordingTime)}`,
        variant: "default",
      });
      
      return;
    }
    
    // Show preview first if not already shown
    if (!state.mediaStream) {
      const success = await handleSelectMedia();
      if (!success) return;
    }
    
    // Start countdown then recording
    startCountdownBeforeRecording();
  };

  // Handle recording preview
  useEffect(() => {
    if (state.recording && previewRef.current && showPreview) {
      previewRef.current.src = state.recording.url;
      
      previewRef.current.onloadedmetadata = () => {
        if (previewRef.current) {
          previewRef.current.currentTime = 0;
          previewRef.current.load();
          previewRef.current.play().catch(err => {
            console.log("Preview autoplay prevented:", err);
          });
        }
      };
    }
  }, [state.recording, showPreview]);

  // Delete current recording
  const handleDeleteRecording = () => {
    if (window.confirm('Are you sure you want to delete this recording?')) {
      resetRecording();
      setShowPreview(false);
      
      toast({
        title: "Recording Deleted",
        description: "Your recording has been deleted.",
        variant: "default",
      });
    }
  };

  // Edit current recording
  const handleEditRecording = () => {
    if (state.recording) {
      setIsEditingVideo(true);
    }
  };

  // Save edited recording
  const handleSaveEditedVideo = (blob: Blob) => {
    // In a real implementation, you would process and replace the recording
    console.log("Saving edited video", blob);
    setIsEditingVideo(false);
    
    toast({
      title: "Video Saved",
      description: "Your edited video has been saved successfully.",
      variant: "default",
    });
  };

  // Export video in different format
  const handleExportVideo = (format: string) => {
    downloadRecording(format as 'webm' | 'mp4' | 'gif');
    
    toast({
      title: "Export Complete",
      description: `Your recording has been exported in ${format.toUpperCase()} format.`,
      variant: "default",
    });
  };

  // Get current recording information (file size, resolution, etc)
  const currentRecordingInfo = getRecordingInfo();

  return (
    <div className="py-8 px-4 md:px-6 lg:px-8">
      {isEditingVideo && state.recording ? (
        // Video editor view
        <SimpleVideoEditor 
          recording={state.recording} 
          onSave={handleSaveEditedVideo}
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
                    : state.isRecording
                      ? state.isPaused
                        ? "bg-yellow-500"
                        : "bg-red-500 animate-pulse"
                      : "bg-gray-200 text-gray-600"
                } px-3 py-1 text-xs font-semibold rounded-full`}>
                  {countdown > 0 
                    ? `Starting in ${countdown}...` 
                    : state.isRecording
                      ? state.isPaused
                        ? "Paused"
                        : "Recording"
                      : "Ready"}
                </Badge>
                
                {state.isRecording && (
                  <span className="text-sm font-mono">
                    {formatTime(state.recordingTime)}
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
                  disabled={state.isRecording}
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  Screen
                </TabsTrigger>
                <TabsTrigger 
                  value="camera" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-white"
                  disabled={state.isRecording}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Camera
                </TabsTrigger>
                <TabsTrigger 
                  value="audio" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-white"
                  disabled={state.isRecording}
                >
                  <Mic className="h-4 w-4 mr-2" />
                  Audio
                </TabsTrigger>
              </TabsList>
            </div>

            {/* SCREEN RECORDING TAB */}
            <TabsContent value="screen" className="p-6">
              <div className="aspect-video bg-gray-100 rounded-lg mb-6 flex items-center justify-center border border-gray-200 overflow-hidden">
                {state.recording && !state.isRecording && showPreview ? (
                  <div className="relative w-full h-full">
                    <video 
                      ref={previewRef} 
                      className="w-full h-full" 
                      controls 
                      playsInline
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
                            <Button size="sm" variant="secondary" onClick={() => setShowPreview(false)}>
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
                        <span className="font-mono">{currentRecordingInfo.formattedDuration}</span>
                        
                        <div className="flex items-center">
                          <FileText className="h-3 w-3 mr-1" />
                          <span>Size:</span>
                        </div>
                        <span className="font-mono">{currentRecordingInfo.formattedSize}</span>
                        
                        <div className="flex items-center">
                          <Monitor className="h-3 w-3 mr-1" />
                          <span>Resolution:</span>
                        </div>
                        <span className="font-mono">{currentRecordingInfo.resolution}</span>
                      </div>
                    </div>
                  </div>
                ) : state.mediaStream ? (
                  <div className="relative w-full h-full">
                    {/* Hidden video element for MediaStream */}
                    <video 
                      ref={videoRef} 
                      className="hidden" 
                      muted 
                      playsInline
                    />
                    
                    {/* Canvas for displaying the video stream with effects */}
                    <canvas 
                      ref={canvasRef} 
                      className="w-full h-full"
                    />
                    
                    {state.isRecording && (
                      <div className="absolute top-4 right-4 bg-red-500 text-white text-sm py-1 px-3 rounded-full flex items-center gap-1 shadow-md">
                        <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                        REC {formatTime(state.recordingTime)}
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
              {state.isRecording && (
                <div className="mb-6 bg-primary/5 p-4 rounded-lg border border-primary/10">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                    <div className="font-mono text-xl font-semibold">{formatTime(state.recordingTime)}</div>
                    <span className="text-gray-600">
                      {state.recordingMode === 'screen' ? 'Screen recording' : 
                      state.recordingMode === 'camera' ? 'Camera recording' : 
                      'Audio recording'} in progress...
                    </span>
                  </div>
                  <Progress 
                    value={Math.min((state.recordingTime / 3600) * 100, 100)} 
                    className="h-1.5 mt-3" 
                  />
                </div>
              )}

              {/* Recording Details Info Card - only visible when previewing a recording */}
              {state.recording && !state.isRecording && showPreview && (
                <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200">
                  <h3 className="font-medium mb-2 flex items-center">
                    <Info className="h-4 w-4 mr-2 text-primary" />
                    Recording Details
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Duration</p>
                      <p className="font-medium">{currentRecordingInfo.formattedDuration}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">File Size</p>
                      <p className="font-medium">{currentRecordingInfo.formattedSize}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Resolution</p>
                      <p className="font-medium">{currentRecordingInfo.resolution}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Format</p>
                      <p className="font-medium">{currentRecordingInfo.format}</p>
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
                        disabled={state.isRecording}
                        value={state.settings.quality}
                        onValueChange={(value) => handleSettingsChange('quality', value)}
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
                        disabled={state.isRecording}
                        value={state.settings.frameRate}
                        onValueChange={(value) => handleSettingsChange('frameRate', value)}
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
                        checked={state.settings.includeAudio}
                        disabled={state.isRecording}
                        onCheckedChange={(checked) => handleSettingsChange('includeAudio', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-gray-700">Show Cursor</Label>
                        <p className="text-gray-500 text-sm">Include your mouse pointer in the recording</p>
                      </div>
                      <Switch 
                        checked={state.settings.showCursor}
                        disabled={state.isRecording}
                        onCheckedChange={(checked) => handleSettingsChange('showCursor', checked)}
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
                      state.isRecording 
                        ? 'bg-destructive text-white hover:bg-destructive/90' 
                        : 'bg-primary text-white hover:bg-primary/90'
                    }`}
                    onClick={toggleRecording}
                    disabled={isRequestingAccess || countdown > 0}
                  >
                    {isRequestingAccess ? (
                      <span className="flex items-center">
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Preparing...
                      </span>
                    ) : countdown > 0 ? (
                      <span className="flex items-center">
                        <span className="h-5 w-5 mr-2 flex items-center justify-center">{countdown}</span>
                        Starting soon...
                      </span>
                    ) : state.isRecording ? (
                      <>
                        <Square className="h-5 w-5" />
                        Stop Recording
                      </>
                    ) : state.recording && showPreview ? (
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
                  {state.isRecording && (
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="py-6 flex items-center justify-center gap-2 border-gray-200 hover:bg-gray-50"
                      onClick={pauseRecording}
                    >
                      {state.isPaused ? (
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
                  {!state.isRecording && state.recording && showPreview && (
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
                  {!state.isRecording && state.recording && showPreview && (
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
                            disabled={state.recordingMode === 'audio'}>
                            <Image className="h-4 w-4 mr-2" />
                            GIF (Animated)
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  
                  {/* Delete recording button - only visible when recording is complete */}
                  {!state.isRecording && state.recording && showPreview && (
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
            
            {/* CAMERA TAB - similar structure but for camera */}
            <TabsContent value="camera" className="p-6">
              {/* Similar to screen tab but with camera-specific UI */}
              {/* Implementation simplified for brevity */}
              <div className="flex flex-col items-center justify-center p-12">
                <Camera className="h-16 w-16 text-primary mb-4" />
                <h3 className="text-xl font-semibold">Camera Recording</h3>
                <p className="text-gray-600 mb-6">Record video from your webcam</p>
                <Button 
                  size="lg"
                  onClick={handleSelectMedia}
                  className="bg-primary text-white"
                  disabled={state.isRecording || isRequestingAccess}
                >
                  {state.mediaStream ? "Camera Ready" : "Enable Camera"}
                </Button>
              </div>
            </TabsContent>
            
            {/* AUDIO TAB - similar structure but for audio */}
            <TabsContent value="audio" className="p-6">
              {/* Similar to screen tab but with audio-specific UI */}
              {/* Implementation simplified for brevity */}
              <div className="flex flex-col items-center justify-center p-12">
                <Mic className="h-16 w-16 text-primary mb-4" />
                <h3 className="text-xl font-semibold">Audio Recording</h3>
                <p className="text-gray-600 mb-6">Record audio from your microphone</p>
                <Button 
                  size="lg"
                  onClick={handleSelectMedia}
                  className="bg-primary text-white"
                  disabled={state.isRecording || isRequestingAccess}
                >
                  {state.mediaStream ? "Microphone Ready" : "Enable Microphone"}
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

export default ProfessionalRecorder;