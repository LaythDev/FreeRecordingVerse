import React, { useState, useRef, useEffect } from 'react';
import { RecordingMode } from '@shared/types';
import { useRecorder } from '@/hooks/useRecorder';

// UI Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from "@/hooks/use-toast";
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Dropdown Menu
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

// Icons
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
  Clock,
  FileText,
  Edit,
  FileVideo,
  Image,
  Loader2,
  Info,
  MoreHorizontal,
  Copy,
  Share2,
  Pencil,
  Type,
  MousePointer,
  Wand2,
  Sparkles,
  Zap,
  Activity
} from 'lucide-react';

// Video Editor Component Import
import VideoEditor from './VideoEditor';

const ScreenRecorder: React.FC = () => {
  // UI state
  const [activeTab, setActiveTab] = useState<RecordingMode>('screen');
  const [showSettings, setShowSettings] = useState(false);
  const [isEditingVideo, setIsEditingVideo] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  // References
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);

  // Use our enhanced recorder hook
  const {
    isRecording,
    isPaused,
    recordingTime,
    recordingMode,
    settings,
    recording,
    isRequestingAccess,
    permissionDenied,
    errorMessage,
    countdown,
    processingRecording,
    setRecordingMode,
    updateSettings,
    requestPermissions,
    startRecording,
    startRecordingWithCountdown,
    pauseRecording,
    stopRecording,
    downloadRecording,
    exportRecording,
    resetRecording,
    formatTime,
    formatFileSize,
    getRecordingInfo,
    setRefs
  } = useRecorder();

  // Set refs when component mounts
  useEffect(() => {
    if (videoRef.current) {
      setRefs(videoRef.current, canvasRef.current || undefined);
    }
  }, [videoRef.current, canvasRef.current, setRefs]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    const mode = value as RecordingMode;
    setActiveTab(mode);
    setRecordingMode(mode);
  };

  // Start recording with countdown
  const handleStartRecording = () => {
    if (isPaused) {
      startRecording();
    } else {
      startRecordingWithCountdown(3);
    }
  };

  // Toggle to editor mode
  const handleEditRecording = () => {
    setIsEditingVideo(true);
    setShowPreview(false);
  };

  // Handle back to recorder from editor
  const handleBackToRecorder = () => {
    setIsEditingVideo(false);
    setShowPreview(true);
  };

  // Handle saving edited video
  const handleSaveEditedVideo = (blob: Blob) => {
    handleBackToRecorder();
    toast({
      title: "Video saved",
      description: "Your edited video is ready to download.",
    });
  };

  // Handle exporting to specific format
  const handleExportVideo = (format: string) => {
    exportRecording(format);
    toast({
      title: "Export started",
      description: `Exporting video as ${format.toUpperCase()}...`,
    });
  };

  // Show error notifications
  useEffect(() => {
    if (errorMessage && !permissionDenied) {
      toast({
        title: "Recording error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [errorMessage, permissionDenied]);

  useEffect(() => {
    if (permissionDenied) {
      toast({
        title: "Permission denied",
        description: errorMessage || "Please allow access to continue recording.",
        variant: "destructive"
      });
    }
  }, [permissionDenied, errorMessage]);

  return (
    <Card className="shadow-xl border border-gray-200 overflow-hidden bg-gradient-to-br from-white to-gray-50">
      <CardHeader className="bg-white border-b border-gray-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-blue-500" />
              Professional Screen Recorder
            </CardTitle>
            <CardDescription className="text-gray-600 mt-1">
              Ultra-fast, unlimited recording with professional editing tools - completely free
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            {processingRecording && (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-sm text-gray-600">Processing...</span>
              </div>
            )}

            <Badge className={`${
              countdown > 0 
                ? "bg-yellow-500 animate-pulse text-white"
                : isRecording 
                  ? "bg-red-500 animate-pulse text-white" 
                  : isPaused 
                    ? "bg-amber-500 text-white" 
                    : recording 
                      ? "bg-green-500 text-white" 
                      : "bg-gray-100 text-gray-600"
            } px-4 py-2 text-sm font-semibold`}>
              {countdown > 0 
                ? `Starting in ${countdown}...` 
                : isRecording 
                  ? "● RECORDING" 
                  : isPaused 
                    ? "⏸ PAUSED" 
                    : recording 
                      ? "✓ READY" 
                      : "⚪ STANDBY"}
            </Badge>

            {isRecording && (
              <span className="text-sm font-mono font-bold text-red-700">
                {formatTime(recordingTime)}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isEditingVideo && recording ? (
          <VideoEditor 
            recording={recording} 
            onSave={handleSaveEditedVideo}
            onExport={handleExportVideo}
          />
        ) : (
          <Tabs 
            defaultValue="screen" 
            value={activeTab} 
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList className="flex bg-gradient-to-r from-blue-50 to-indigo-50 p-2 m-6 w-fit rounded-xl shadow-inner">
              <TabsTrigger value="screen" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">
                <Monitor className="h-4 w-4 mr-2" />
                Screen
              </TabsTrigger>
              <TabsTrigger value="camera" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">
                <Camera className="h-4 w-4 mr-2" />
                Camera
              </TabsTrigger>
              <TabsTrigger value="audio" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">
                <Mic className="h-4 w-4 mr-2" />
                Audio
              </TabsTrigger>
            </TabsList>

            {/* SCREEN RECORDING TAB */}
            <TabsContent value="screen" className="p-6">
              <div className="aspect-video bg-gradient-to-br from-gray-900 to-black rounded-xl mb-6 flex items-center justify-center border-2 border-gray-200 overflow-hidden relative shadow-2xl">
                {isRecording && (
                  <div className="absolute top-4 right-4 bg-red-500 text-white text-sm py-2 px-4 rounded-full flex items-center gap-2 shadow-lg z-10 animate-pulse">
                    <div className="w-3 h-3 rounded-full bg-white"></div>
                    <span className="font-semibold">REC {formatTime(recordingTime)}</span>
                  </div>
                )}

                {countdown > 0 && (
                  <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-20">
                    <div className="text-white text-9xl font-bold animate-bounce">
                      {countdown}
                    </div>
                  </div>
                )}

                {recording && !isRecording && showPreview ? (
                  <div className="relative w-full h-full">
                    <video 
                      ref={previewRef} 
                      src={recording.url}
                      className="w-full h-full object-contain" 
                      controls 
                      playsInline
                    />
                    <div className="absolute top-4 right-4 flex gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="secondary" onClick={handleEditRecording} className="shadow-lg">
                              <Wand2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Professional Editor</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <DropdownMenu>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="secondary" className="shadow-lg">
                                  <Download className="h-4 w-4" />
                                  <ChevronDown className="h-3 w-3 ml-1" />
                                </Button>
                              </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent>Download Options</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Export Formats</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => downloadRecording('webm')}>
                              <Video className="mr-2 h-4 w-4 text-green-600" />
                              <span>WebM (Original)</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExportVideo('mp4')}>
                              <FileVideo className="mr-2 h-4 w-4 text-blue-600" />
                              <span>MP4 (Universal)</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExportVideo('gif')}>
                              <Image className="mr-2 h-4 w-4 text-purple-600" />
                              <span>GIF (Animation)</span>
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="secondary" onClick={resetRecording} className="shadow-lg">
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>New Recording</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full h-full">
                    {!isRecording && !recording && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                        {isRequestingAccess ? (
                          <div className="text-center">
                            <Loader2 className="h-12 w-12 animate-spin text-blue-400 mx-auto mb-4" />
                            <p className="text-white text-lg font-medium">Requesting screen access...</p>
                            <p className="text-gray-300 mt-2">Select the screen or window you want to record</p>
                          </div>
                        ) : permissionDenied ? (
                          <div className="text-center">
                            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                            <p className="text-red-400 font-medium text-lg">Permission Denied</p>
                            <p className="text-gray-300 mt-3 max-w-md">
                              Please allow screen sharing to start recording. Your privacy is protected - recordings stay on your device.
                            </p>
                            <Button className="mt-6 bg-blue-600 hover:bg-blue-700" onClick={requestPermissions}>
                              <Zap className="mr-2 h-4 w-4" />
                              Try Again
                            </Button>
                          </div>
                        ) : (
                          <div className="text-center">
                            <div className="bg-gradient-to-br from-blue-500 to-purple-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                              <Monitor className="h-10 w-10 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3">Professional Screen Recording</h3>
                            <p className="text-gray-300 max-w-lg mb-8 leading-relaxed">
                              Capture your screen in ultra-high quality with unlimited recording time. 
                              No watermarks, no signup required, completely free forever.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                              <Button 
                                onClick={requestPermissions}
                                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg font-semibold shadow-xl"
                              >
                                <Play className="mr-2 h-5 w-5" />
                                Start Recording
                              </Button>
                              <Button 
                                variant="outline" 
                                onClick={() => setShowSettings(!showSettings)}
                                className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white px-6 py-3"
                              >
                                <Settings className="mr-2 h-4 w-4" />
                                Settings
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Video Preview Layer */}
                    <video 
                      ref={videoRef} 
                      className="w-full h-full object-contain" 
                      playsInline
                      muted
                      style={{ display: isRecording ? 'block' : 'none' }}
                    />
                    <canvas 
                      ref={canvasRef} 
                      className="w-full h-full object-contain absolute inset-0"
                      style={{ display: isRecording ? 'block' : 'none' }}
                    />
                  </div>
                )}
              </div>

              {/* Enhanced Recording Controls */}
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                {!recording && !isRecording ? (
                  <Button
                    className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-8 py-4 text-lg font-semibold shadow-xl transform hover:scale-105 transition-all"
                    onClick={handleStartRecording}
                    disabled={isRequestingAccess || countdown > 0}
                  >
                    {isRequestingAccess ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <Play className="mr-2 h-5 w-5" />
                    )}
                    Start Recording
                  </Button>
                ) : isRecording ? (
                  <>
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={pauseRecording} 
                      className="border-amber-500 text-amber-600 hover:bg-amber-50 px-6 py-3 shadow-lg"
                    >
                      <Pause className="mr-2 h-5 w-5" />
                      Pause
                    </Button>
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={stopRecording} 
                      className="border-red-500 text-red-600 hover:bg-red-50 px-6 py-3 shadow-lg"
                    >
                      <Square className="mr-2 h-5 w-5" />
                      Stop Recording
                    </Button>
                  </>
                ) : isPaused ? (
                  <>
                    <Button 
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 shadow-lg" 
                      size="lg"
                      onClick={handleStartRecording}
                    >
                      <Play className="mr-2 h-5 w-5" />
                      Resume
                    </Button>
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={stopRecording} 
                      className="border-red-500 text-red-600 hover:bg-red-50 px-6 py-3 shadow-lg"
                    >
                      <Square className="mr-2 h-5 w-5" />
                      Stop
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-6 py-3 shadow-lg" 
                      size="lg"
                      onClick={() => {
                        resetRecording();
                        requestPermissions();
                      }}
                    >
                      <Play className="mr-2 h-5 w-5" />
                      New Recording
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => downloadRecording('webm')}
                      className="border-blue-500 text-blue-600 hover:bg-blue-50 px-6 py-3 shadow-lg"
                    >
                      <Download className="mr-2 h-5 w-5" />
                      Download
                    </Button>
                  </>
                )}

                {!recording && !isRecording && (
                  <Button 
                    variant="outline" 
                    size="lg" 
                    onClick={() => setShowSettings(!showSettings)}
                    className="border-gray-300 text-gray-600 hover:bg-gray-50 px-6 py-3 shadow-lg"
                  >
                    <Settings className="mr-2 h-5 w-5" />
                    Advanced Settings
                  </Button>
                )}
              </div>

              {/* Enhanced Settings Panel */}
              {showSettings && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-6 shadow-lg">
                  <h3 className="text-lg font-semibold mb-6 text-gray-800 flex items-center gap-2">
                    <Settings className="h-5 w-5 text-blue-600" />
                    Professional Recording Settings
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                      <Label htmlFor="quality" className="block mb-2 font-medium">Video Quality</Label>
                      <Select 
                        defaultValue={settings.quality}
                        onValueChange={(value) => updateSettings({ quality: value as "1080" | "720" | "480" })}
                      >
                        <SelectTrigger id="quality" className="bg-white">
                          <SelectValue placeholder="Select quality" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1080">🎯 Full HD (1080p)</SelectItem>
                          <SelectItem value="720">⚡ HD (720p)</SelectItem>
                          <SelectItem value="480">💾 SD (480p)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">Higher quality = larger file size</p>
                    </div>

                    <div>
                      <Label htmlFor="frameRate" className="block mb-2 font-medium">Frame Rate</Label>
                      <Select 
                        defaultValue={settings.frameRate}
                        onValueChange={(value) => updateSettings({ frameRate: value as "60" | "30" | "24" })}
                      >
                        <SelectTrigger id="frameRate" className="bg-white">
                          <SelectValue placeholder="Select frame rate" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="60">🚀 60 FPS (Gaming)</SelectItem>
                          <SelectItem value="30">📹 30 FPS (Standard)</SelectItem>
                          <SelectItem value="24">🎬 24 FPS (Cinematic)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">60 FPS for smooth motion</p>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Switch 
                        id="includeAudio" 
                        checked={settings.includeAudio}
                        onCheckedChange={(checked) => updateSettings({ includeAudio: checked })}
                      />
                      <Label htmlFor="includeAudio" className="font-medium">🎤 Include Audio</Label>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Switch 
                        id="showCursor" 
                        checked={settings.showCursor}
                        onCheckedChange={(checked) => updateSettings({ showCursor: checked })}
                      />
                      <Label htmlFor="showCursor" className="font-medium">🖱️ Show Cursor</Label>
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Recording Info */}
              {isRecording && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
                  <h4 className="text-lg font-semibold mb-4 text-gray-800">Recording Details</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center">
                      <Clock className="text-blue-500 mr-3 h-6 w-6" />
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Duration</p>
                        <p className="font-bold text-lg">{formatTime(recordingTime)}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <FileText className="text-green-500 mr-3 h-6 w-6" />
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">File Size</p>
                        <p className="font-bold text-lg">{getRecordingInfo().fileSize}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Activity className="text-orange-500 mr-3 h-6 w-6" />
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Quality</p>
                        <p className="font-bold text-lg">{settings.quality}p</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* CAMERA TAB */}
            <TabsContent value="camera" className="p-6">
              <div className="aspect-video bg-gradient-to-br from-gray-900 to-black rounded-xl mb-6 text-center p-8 flex items-center justify-center">
                {isRecording && (
                  <div className="absolute top-4 right-4 bg-red-500 text-white text-sm py-2 px-4 rounded-full flex items-center gap-2 shadow-lg z-10 animate-pulse">
                    <div className="w-3 h-3 rounded-full bg-white"></div>
                    <span className="font-semibold">REC {formatTime(recordingTime)}</span>
                  </div>
                )}

                {recording && !isRecording && showPreview ? (
                  <div className="relative w-full h-full">
                    <video 
                      ref={previewRef} 
                      src={recording.url}
                      className="w-full h-full object-contain" 
                      controls 
                      playsInline
                    />
                  </div>
                ) : (
                  <div>
                    {!isRecording && !recording && (
                      <div className="text-center">
                        <div className="bg-gradient-to-br from-green-500 to-teal-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                          <Camera className="h-10 w-10 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-3">Camera Recording</h3>
                        <p className="text-gray-300 max-w-md mx-auto mb-6 leading-relaxed">
                          Record high-quality video using your webcam. Perfect for presentations, tutorials, and video messages.
                        </p>
                        <Button 
                          onClick={requestPermissions}
                          className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-8 py-3 text-lg font-semibold shadow-xl"
                        >
                          <Camera className="mr-2 h-5 w-5" />
                          Enable Camera
                        </Button>
                      </div>
                    )}

                    <video 
                      ref={videoRef} 
                      className="w-full h-full object-contain" 
                      playsInline
                      muted
                      style={{ display: isRecording ? 'block' : 'none' }}
                    />
                  </div>
                )}
              </div>

              {/* Recording Controls */}
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                {!recording && !isRecording ? (
                  <Button
                    className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white px-8 py-4 text-lg font-semibold shadow-xl"
                    onClick={handleStartRecording}
                    disabled={isRequestingAccess || countdown > 0}
                  >
                    {isRequestingAccess ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <Play className="mr-2 h-5 w-5" />
                    )}
                    Start Recording
                  </Button>
                ) : isRecording ? (
                  <>
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={pauseRecording} 
                      className="border-amber-500 text-amber-600 hover:bg-amber-50 px-6 py-3 shadow-lg"
                    >
                      <Pause className="mr-2 h-5 w-5" />
                      Pause
                    </Button>
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={stopRecording} 
                      className="border-red-500 text-red-600 hover:bg-red-50 px-6 py-3 shadow-lg"
                    >
                      <Square className="mr-2 h-5 w-5" />
                      Stop Recording
                    </Button>
                  </>
                ) : isPaused ? (
                  <>
                    <Button 
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 shadow-lg" 
                      size="lg"
                      onClick={handleStartRecording}
                    >
                      <Play className="mr-2 h-5 w-5" />
                      Resume
                    </Button>
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={stopRecording} 
                      className="border-red-500 text-red-600 hover:bg-red-50 px-6 py-3 shadow-lg"
                    >
                      <Square className="mr-2 h-5 w-5" />
                      Stop
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white px-6 py-3 shadow-lg" 
                      size="lg"
                      onClick={() => {
                        resetRecording();
                        requestPermissions();
                      }}
                    >
                      <Play className="mr-2 h-5 w-5" />
                      New Recording
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => downloadRecording('webm')}
                      className="border-blue-500 text-blue-600 hover:bg-blue-50 px-6 py-3 shadow-lg"
                    >
                      <Download className="mr-2 h-5 w-5" />
                      Download
                    </Button>
                  </>
                )}
              </div>

              {/* Settings Panel for Camera */}
              {!recording && !isRecording && (
                <div className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-xl p-6 mb-6 shadow-lg">
                  <h3 className="text-lg font-semibold mb-6 text-gray-800">Camera Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <Label htmlFor="quality" className="block mb-2 font-medium">Video Quality</Label>
                      <Select 
                        defaultValue={settings.quality}
                        onValueChange={(value) => updateSettings({ quality: value as "1080" | "720" | "480" })}
                      >
                        <SelectTrigger id="quality" className="bg-white">
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
                      <Label htmlFor="frameRate" className="block mb-2 font-medium">Frame Rate</Label>
                      <Select 
                        defaultValue={settings.frameRate}
                        onValueChange={(value) => updateSettings({ frameRate: value as "60" | "30" | "24" })}
                      >
                        <SelectTrigger id="frameRate" className="bg-white">
                          <SelectValue placeholder="Select frame rate" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="60">60 FPS</SelectItem>
                          <SelectItem value="30">30 FPS</SelectItem>
                          <SelectItem value="24">24 FPS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Switch 
                        id="includeAudio" 
                        checked={settings.includeAudio}
                        onCheckedChange={(checked) => updateSettings({ includeAudio: checked })}
                      />
                      <Label htmlFor="includeAudio" className="font-medium">Include Audio</Label>
                    </div>
                  </div>
                </div>
              )}

              {/* Recording Info for Camera */}
              {isRecording && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
                  <h4 className="text-lg font-semibold mb-4 text-gray-800">Recording Details</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="flex items-center">
                      <Clock className="text-blue-500 mr-3 h-6 w-6" />
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Duration</p>
                        <p className="font-bold text-lg">{formatTime(recordingTime)}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <FileText className="text-green-500 mr-3 h-6 w-6" />
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">File Size</p>
                        <p className="font-bold text-lg">{getRecordingInfo().fileSize}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Activity className="text-orange-500 mr-3 h-6 w-6" />
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Quality</p>
                        <p className="font-bold text-lg">{settings.quality}p</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* AUDIO TAB */}
            <TabsContent value="audio" className="p-6">
              <div className="aspect-video bg-gradient-to-br from-gray-900 to-black rounded-xl mb-6 text-center p-8 flex items-center justify-center">
                {isRecording && (
                  <div className="absolute top-4 right-4 bg-red-500 text-white text-sm py-2 px-4 rounded-full flex items-center gap-2 shadow-lg z-10 animate-pulse">
                    <div className="w-3 h-3 rounded-full bg-white"></div>
                    <span className="font-semibold">REC {formatTime(recordingTime)}</span>
                  </div>
                )}

                {recording && !isRecording ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <Mic className="h-16 w-16 mx-auto text-green-400 mb-4" />
                      <p className="text-white text-lg font-medium mb-2">Audio Recording Complete</p>
                      <p className="text-gray-300 mb-4">Duration: {formatTime(recording.duration)}</p>
                      <p className="text-gray-300 text-sm">Size: {formatFileSize(recording.blob.size)}</p>
                      <audio 
                        src={recording.url}
                        controls 
                        className="mt-4 mx-auto"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    {!isRecording && !recording ? (
                      <div className="text-center">
                        <div className="bg-gradient-to-br from-red-500 to-pink-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                          <Mic className="h-10 w-10 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-3">Audio Recording</h3>
                        <p className="text-gray-300 max-w-md mx-auto mb-6 leading-relaxed">
                          Capture crystal-clear audio using your microphone. Ideal for podcasts, voice notes, and audio content.
                        </p>
                        <Button 
                          onClick={requestPermissions}
                          className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white px-8 py-3 text-lg font-semibold shadow-xl"
                        >
                          <Mic className="mr-2 h-5 w-5" />
                          Enable Microphone
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Mic className="h-16 w-16 mx-auto text-red-400 mb-4 animate-pulse" />
                        <p className="text-white text-lg font-medium mb-2">Recording Audio...</p>
                        <p className="text-lg font-medium">{formatTime(recordingTime)}</p>
                        <p className="text-gray-300 mt-2">File Size: {getRecordingInfo().fileSize}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Audio Recording Controls */}
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                {!recording && !isRecording ? (
                  <Button
                    className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-8 py-4 text-lg font-semibold shadow-xl"
                    onClick={handleStartRecording}
                    disabled={isRequestingAccess || countdown > 0}
                  >
                    {isRequestingAccess ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <Play className="mr-2 h-5 w-5" />
                    )}
                    Start Recording
                  </Button>
                ) : isRecording ? (
                  <>
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={pauseRecording} 
                      className="border-amber-500 text-amber-600 hover:bg-amber-50 px-6 py-3 shadow-lg"
                    >
                      <Pause className="mr-2 h-5 w-5" />
                      Pause
                    </Button>
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={stopRecording} 
                      className="border-red-500 text-red-600 hover:bg-red-50 px-6 py-3 shadow-lg"
                    >
                      <Square className="mr-2 h-5 w-5" />
                      Stop Recording
                    </Button>
                  </>
                ) : isPaused ? (
                  <>
                    <Button 
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 shadow-lg" 
                      size="lg"
                      onClick={handleStartRecording}
                    >
                      <Play className="mr-2 h-5 w-5" />
                      Resume
                    </Button>
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={stopRecording} 
                      className="border-red-500 text-red-600 hover:bg-red-50 px-6 py-3 shadow-lg"
                    >
                      <Square className="mr-2 h-5 w-5" />
                      Stop
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-6 py-3 shadow-lg" 
                      size="lg"
                      onClick={() => {
                        resetRecording();
                        requestPermissions();
                      }}
                    >
                      <Play className="mr-2 h-5 w-5" />
                      New Recording
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => downloadRecording('webm')}
                      className="border-blue-500 text-blue-600 hover:bg-blue-50 px-6 py-3 shadow-lg"
                    >
                      <Download className="mr-2 h-5 w-5" />
                      Download
                    </Button>
                  </>
                )}
              </div>

              {/* Audio Recording Info */}
              {isRecording && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
                  <h4 className="text-lg font-semibold mb-4 text-gray-800">Recording Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center">
                      <Clock className="text-blue-500 mr-3 h-6 w-6" />
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Duration</p>
                        <p className="font-bold text-lg">{formatTime(recordingTime)}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <FileText className="text-green-500 mr-3 h-6 w-6" />
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">File Size</p>
                        <p className="font-bold text-lg">{getRecordingInfo().fileSize}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default ScreenRecorder;