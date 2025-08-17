import { useState, useRef, useEffect } from 'react';
import { useRecorder } from '@/hooks/useRecorder';
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
  Monitor,
  Camera,
  Mic,
  Play,
  Pause,
  Square,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

// Main Screen Recorder Component
const MainRecorder = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const [activeTab, setActiveTab] = useState<RecordingMode>('screen');
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const {
    isRecording,
    isPaused,
    recordingTime,
    recordingMode,
    settings,
    recording,
    errorMessage,
    countdown,
    processingRecording,
    setRecordingMode,
    updateSettings,
    requestPermissions,
    startRecording,
    pauseRecording,
    stopRecording,
    downloadRecording,
    resetRecording,
    formatTime,
    setRefs
  } = useRecorder();

  const handleTabChange = (value: string) => {
    const mode = value as RecordingMode;
    setActiveTab(mode);
    setRecordingMode(mode);
  };

  const handleSettingsChange = (key: keyof RecordingSettings, value: any) => {
    updateSettings({ [key]: value });
  };

  // Handle selecting screen or enabling camera/microphone
  const handleSelectScreen = async () => {
    try {
      setIsRequestingAccess(true);
      setPermissionDenied(false);
      const stream = await requestPermissions();

      if (videoRef.current && typeof stream === 'object' && stream !== null && (stream as MediaStream).getTracks) { // Check if stream is a valid MediaStream
        videoRef.current.srcObject = stream; // Set srcObject without type casting
        try {
          await videoRef.current.play();
        } catch (err) {
          // This is expected in some browsers that prevent autoplay
          console.log("Autoplay prevented, user may need to interact with the video");
        }
        setIsRequestingAccess(false);
        return true;
      }

      setIsRequestingAccess(false);
      return false;
    } catch (error) {
      console.error('Error selecting screen:', error);
      setIsRequestingAccess(false);
      setPermissionDenied(true);
      return false;
    }
  };

  // Toggle recording function (start/stop)
  const toggleRecording = async () => {
    if (isRecording) {
      // If currently recording, stop it
      await stopRecording();
      return;
    }

    try {
      // Start recording immediately
      setIsRequestingAccess(true);
      setPermissionDenied(false);

      await startRecording();
      setIsRequestingAccess(false);

      if (videoRef.current) {
        // Stream will be handled by the useRecorder hook
        videoRef.current.play().catch(() => {
          // Expected in some browsers that prevent autoplay
        });
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRequestingAccess(false);
      setPermissionDenied(true);

      // Simple error message
      alert('Please allow access to your device to start recording');
    }
  };

  // Handle recording preview
  useEffect(() => {
    if (recording && previewRef.current) {
      // Set the video source
      previewRef.current.src = recording.url;

      // Make sure the video loads and can play
      previewRef.current.onloadedmetadata = () => {
        if (previewRef.current) {
          try {
            // Ensure it's ready to play with proper duration
            previewRef.current.currentTime = 0;

            // Load and attempt to play
            previewRef.current.load();
            previewRef.current.play().catch(err => {
              console.log("Preview autoplay prevented (expected):", err);
            });

            console.log("Recording preview loaded successfully, duration:", 
                       recording?.duration || previewRef.current.duration);
          } catch (err) {
            console.error("Error setting up preview:", err);
          }
        }
      };
    }
  }, [recording]);

  return (
    <section id="recorder" className="py-10 md:py-16 px-6 md:px-10 lg:px-16 bg-gradient-to-b from-light to-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h3 className="text-2xl md:text-3xl font-bold mb-4 text-gray-800">Start Recording Now</h3>
          <p className="text-gray-600 max-w-2xl mx-auto">Select your recording type, adjust settings, and start recording with a single click.</p>
        </div>

        <Card className="shadow-xl border-gray-200 overflow-hidden">
          <CardHeader className="bg-white border-b border-gray-100 px-6 py-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-xl text-gray-800">Screen Recorder</CardTitle>
                <CardDescription className="text-gray-500">Record your screen, camera, or audio in high quality.</CardDescription>
              </div>
              <Badge className={`${
                isRecording
                  ? isPaused
                    ? "bg-yellow-500"
                    : "bg-red-500 animate-pulse"
                  : "bg-gray-200"
              } text-white px-3 py-1`}>
                {isRecording
                  ? isPaused
                    ? "Paused"
                    : "Recording"
                  : "Ready"}
              </Badge>
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
              <div className="aspect-video bg-gray-100 rounded-lg mb-6 flex items-center justify-center border border-gray-200">
                {isRecording || recording ? (
                  <div className="relative w-full h-full">
                    <video ref={videoRef} className="w-full h-full" muted />
                    {isRecording && (
                      <div className="absolute top-4 right-4 bg-red-500 text-white text-sm py-1 px-3 rounded-full flex items-center gap-1 shadow-md">
                        <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                        REC {formatTime(recordingTime)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center px-4 py-8">
                    <Monitor className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 font-medium mb-3">Your screen will appear here</p>
                    <Button 
                      onClick={handleSelectScreen}
                      className="bg-primary text-white py-2 px-4 rounded-md font-medium text-sm hover:bg-primary/90 transition-all mt-2"
                    >
                      Select Screen
                    </Button>

                    {permissionDenied && (
                      <div className="mt-4 text-red-500 flex items-center justify-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        <span>Permission denied. Please allow screen access in your browser.</span>
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
                    <span className="text-gray-600">Screen recording in progress...</span>
                  </div>
                  <Progress 
                    value={Math.min((recordingTime / 3600) * 100, 100)} 
                    className="h-1.5 mt-3" 
                  />
                </div>
              )}

              {/* Recording Controls */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="quality" className="text-gray-700 mb-2 block">Video Quality</Label>
                      <Select 
                        disabled={isRecording}
                        value={settings.quality}
                        onValueChange={(value) => handleSettingsChange('quality', value)}
                      >
                        <SelectTrigger id="quality" className="border-gray-200">
                          <SelectValue placeholder="Select quality" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1080">High Definition (1080p)</SelectItem>
                          <SelectItem value="720">Standard HD (720p)</SelectItem>
                          <SelectItem value="480">Standard Definition (480p)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="frameRate" className="text-gray-700 mb-2 block">Frame Rate</Label>
                      <Select 
                        disabled={isRecording}
                        value={settings.frameRate}
                        onValueChange={(value) => handleSettingsChange('frameRate', value)}
                      >
                        <SelectTrigger id="frameRate" className="border-gray-200">
                          <SelectValue placeholder="Select frame rate" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="60">60 FPS (Smooth)</SelectItem>
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
                        onCheckedChange={(checked) => handleSettingsChange('includeAudio', checked)}
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
                        onCheckedChange={(checked) => handleSettingsChange('showCursor', checked)}
                      />
                    </div>
                  </div>
                </div>

                {/* Main Recording Controls */}
                <div className="flex flex-col sm:flex-row gap-4 mt-6">
                  {/* Start/Stop Recording Button */}
                  <Button 
                    size="lg" 
                    className={`py-6 flex items-center justify-center gap-2 font-medium ${
                      isRecording 
                        ? 'bg-destructive text-white hover:bg-destructive/90' 
                        : 'bg-primary text-white hover:bg-primary/90'
                    }`}
                    onClick={toggleRecording}
                    disabled={isRequestingAccess}
                  >
                    {isRequestingAccess ? (
                      <span className="animate-pulse">Requesting access...</span>
                    ) : isRecording ? (
                      <>
                        <Square className="h-5 w-5" />
                        Stop Recording
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
                      onClick={isPaused ? startRecording : pauseRecording}
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
                </div>
              </div>
            </TabsContent>

            {/* CAMERA RECORDING TAB */}
            <TabsContent value="camera" className="p-6">
              <div className="aspect-video bg-gray-100 rounded-lg mb-6 flex items-center justify-center overflow-hidden border border-gray-200">
                {isRecording || recording ? (
                  <div className="relative w-full h-full">
                    <video ref={videoRef} className="w-full h-full" muted />
                    {isRecording && (
                      <div className="absolute top-4 right-4 bg-red-500 text-white text-sm py-1 px-3 rounded-full flex items-center gap-1 shadow-md">
                        <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                        REC {formatTime(recordingTime)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center px-4 py-8">
                    <Camera className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 font-medium mb-3">Your camera will appear here</p>
                    <Button 
                      onClick={handleSelectScreen}
                      className="bg-primary text-white py-2 px-4 rounded-md font-medium text-sm hover:bg-primary/90 transition-all mt-2"
                    >
                      Enable Camera
                    </Button>

                    {permissionDenied && (
                      <div className="mt-4 text-red-500 flex items-center justify-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        <span>Permission denied. Please allow camera access.</span>
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
                    <span className="text-gray-600">Camera recording in progress...</span>
                  </div>
                  <Progress 
                    value={Math.min((recordingTime / 3600) * 100, 100)} 
                    className="h-1.5 mt-3" 
                  />
                </div>
              )}

              {/* Main Recording Controls */}
              <div className="flex flex-col sm:flex-row gap-4 mt-6">
                {/* Start/Stop Recording Button */}
                <Button 
                  size="lg" 
                  className={`py-6 flex items-center justify-center gap-2 font-medium ${
                    isRecording 
                      ? 'bg-destructive text-white hover:bg-destructive/90' 
                      : 'bg-primary text-white hover:bg-primary/90'
                  }`}
                  onClick={toggleRecording}
                  disabled={isRequestingAccess}
                >
                  {isRequestingAccess ? (
                    <span className="animate-pulse">Requesting access...</span>
                  ) : isRecording ? (
                    <>
                      <Square className="h-5 w-5" />
                      Stop Recording
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
                    onClick={isPaused ? startRecording : pauseRecording}
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
              </div>
            </TabsContent>

            {/* AUDIO RECORDING TAB */}
            <TabsContent value="audio" className="p-6">
              <div className="aspect-video bg-gray-100 rounded-lg mb-6 flex items-center justify-center border border-gray-200">
                {isRecording || recording ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <Mic className="h-16 w-16 mx-auto text-primary mb-4" />
                      <p className="text-gray-600 font-medium mb-2">Microphone is active</p>
                      {isRecording && (
                        <div className="inline-flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full mt-2">
                          <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                          Recording {formatTime(recordingTime)}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center px-4 py-8">
                    <Mic className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 font-medium mb-3">Your microphone will be used for recording</p>
                    <Button 
                      onClick={handleSelectScreen}
                      className="bg-primary text-white py-2 px-4 rounded-md font-medium text-sm hover:bg-primary/90 transition-all mt-2"
                    >
                      Enable Microphone
                    </Button>

                    {permissionDenied && (
                      <div className="mt-4 text-red-500 flex items-center justify-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        <span>Permission denied. Please allow microphone access.</span>
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
                    <span className="text-gray-600">Audio recording in progress...</span>
                  </div>
                  <Progress 
                    value={Math.min((recordingTime / 3600) * 100, 100)} 
                    className="h-1.5 mt-3" 
                  />
                </div>
              )}

              {/* Main Recording Controls */}
              <div className="flex flex-col sm:flex-row gap-4 mt-6">
                {/* Start/Stop Recording Button */}
                <Button 
                  size="lg" 
                  className={`py-6 flex items-center justify-center gap-2 font-medium ${
                    isRecording 
                      ? 'bg-destructive text-white hover:bg-destructive/90' 
                      : 'bg-primary text-white hover:bg-primary/90'
                  }`}
                  onClick={toggleRecording}
                  disabled={isRequestingAccess}
                >
                  {isRequestingAccess ? (
                    <span className="animate-pulse">Requesting access...</span>
                  ) : isRecording ? (
                    <>
                      <Square className="h-5 w-5" />
                      Stop Recording
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
                    onClick={isPaused ? startRecording : pauseRecording}
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
              </div>
            </TabsContent>
          </Tabs>

          {/* Recording Preview & Editing Section (Only visible when a recording exists) */}
          {recording && (
            <div className="border-t border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Recording Preview & Editor</h3>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200 col-span-2">
                  <video 
                    ref={previewRef} 
                    className="w-full h-full" 
                    controls
                    playsInline
                  />
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-700">Recording Details</h4>
                      <Badge variant="outline" className="text-xs font-normal">
                        {recording.mode}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Duration:</span>
                        <span className="font-mono">{formatTime(recording.duration)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Created:</span>
                        <span>{recording.createdAt.toLocaleTimeString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Size:</span>
                        <span>{(recording.blob.size / (1024 * 1024)).toFixed(2)} MB</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Download Options */}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h4 className="font-medium text-gray-700 mb-3">Download Format</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          className="w-full py-2 bg-primary text-white flex items-center justify-center gap-2"
                          onClick={() => downloadRecording('webm')}
                        >
                          <Download className="h-4 w-4" />
                          WebM
                        </Button>
                        <Button
                          className="w-full py-2 bg-primary text-white flex items-center justify-center gap-2"
                          onClick={() => downloadRecording('mp4')}
                        >
                          <Download className="h-4 w-4" />
                          MP4
                        </Button>
                      </div>
                    </div>

                    {/* Reset recording button */}
                    <Button
                      variant="outline"
                      className="w-full py-2 border-gray-200 text-gray-700 flex items-center justify-center gap-2"
                      onClick={() => resetRecording()}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Start New Recording
                    </Button>
                  </div>
                </div>
              </div>

              {/* Basic Editing Tools */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-700 mb-3">Editing Tools</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 border rounded-lg">
                    <h5 className="text-sm font-medium mb-2">Trim Video</h5>
                    <div className="mb-3">
                      <Label className="mb-1 text-xs">Start Time (seconds)</Label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="range" 
                          min="0" 
                          max={Math.max(1, recording ? recording.duration : 1)}
                          step="1"
                          className="w-full"
                        />
                        <span className="text-xs font-mono">0s</span>
                      </div>
                    </div>
                    <div className="mb-3">
                      <Label className="mb-1 text-xs">End Time (seconds)</Label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="range" 
                          min="0" 
                          max={Math.max(1, recording ? recording.duration : 1)}
                          step="1"
                          defaultValue={Math.max(1, recording ? recording.duration : 1)}
                          className="w-full"
                        />
                        <span className="text-xs font-mono">{recording?.duration || 0}s</span>
                      </div>
                    </div>
                    <Button size="sm" className="w-full mt-2 text-xs py-1">Apply Trim</Button>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h5 className="text-sm font-medium mb-2">Add Text Overlay</h5>
                    <div className="space-y-2">
                      <div>
                        <Label className="mb-1 text-xs">Text Content</Label>
                        <input 
                          type="text" 
                          placeholder="Enter text here" 
                          className="w-full text-sm p-1 border rounded" 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="mb-1 text-xs">Font Size</Label>
                          <Select defaultValue="medium">
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="small">Small</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="large">Large</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="mb-1 text-xs">Color</Label>
                          <Select defaultValue="white">
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="white">White</SelectItem>
                              <SelectItem value="black">Black</SelectItem>
                              <SelectItem value="red">Red</SelectItem>
                              <SelectItem value="blue">Blue</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button size="sm" className="w-full mt-2 text-xs py-1">Add Text</Button>
                    </div>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <h5 className="text-sm font-medium mb-2">Effects</h5>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="flex items-center space-x-2">
                        <Switch id="brightness" />
                        <Label htmlFor="brightness" className="text-xs">Brightness</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="contrast" />
                        <Label htmlFor="contrast" className="text-xs">Contrast</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="grayscale" />
                        <Label htmlFor="grayscale" className="text-xs">Grayscale</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="blur" />
                        <Label htmlFor="blur" className="text-xs">Blur</Label>
                      </div>
                    </div>
                    <Button size="sm" className="w-full mt-2 text-xs py-1">Apply Effects</Button>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-primary/5 border border-primary/10 rounded text-sm text-primary">
                  Editing functionality will apply visual changes in a production version. For now, you can interact with the controls for demonstration.
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </section>
  );
};

export default MainRecorder;