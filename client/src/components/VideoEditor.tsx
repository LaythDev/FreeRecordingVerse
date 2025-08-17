
import React, { useState, useRef, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Crop, Scissors, Type, ArrowLeft, ArrowRight, 
  Image, Volume2, Volume1, VolumeX, Download, Save, 
  Layers, RotateCcw, Eye, EyeOff,
  Play, Pause, SkipBack, SkipForward
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Recording } from '@shared/types';

interface VideoEditorProps {
  recording: Recording;
  onSave: (blob: Blob) => void;
  onExport: (format: string) => void;
}

const VideoEditor: React.FC<VideoEditorProps> = ({ recording, onSave, onExport }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(recording.duration);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(duration);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [activeTab, setActiveTab] = useState('trim');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Text overlay states
  const [textOverlays, setTextOverlays] = useState<Array<{
    id: string;
    text: string;
    x: number;
    y: number;
    fontSize: number;
    color: string;
    visible: boolean;
  }>>([]);
  
  const [newText, setNewText] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [fontSize, setFontSize] = useState(24);
  
  // Effect/filter states
  const [filters, setFilters] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    grayscale: false,
    sepia: false,
    invert: false
  });
  
  // Initialize video player
  useEffect(() => {
    if (videoRef.current && recording.url) {
      videoRef.current.src = recording.url;
      videoRef.current.crossOrigin = 'anonymous';
      
      videoRef.current.onloadedmetadata = () => {
        if (videoRef.current) {
          const videoDuration = videoRef.current.duration || recording.duration;
          setDuration(videoDuration);
          setTrimEnd(videoDuration);
          
          // Setup canvas
          if (canvasRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth || 1280;
            canvasRef.current.height = videoRef.current.videoHeight || 720;
          }
          if (outputCanvasRef.current) {
            outputCanvasRef.current.width = videoRef.current.videoWidth || 1280;
            outputCanvasRef.current.height = videoRef.current.videoHeight || 720;
          }
        }
      };
      
      videoRef.current.ontimeupdate = () => {
        if (videoRef.current) {
          setCurrentTime(videoRef.current.currentTime);
          drawCurrentFrame();
          
          // Stop at trim end
          if (videoRef.current.currentTime >= trimEnd) {
            videoRef.current.pause();
            setPlaying(false);
          }
        }
      };
    }
  }, [recording.url]);

  // Draw current video frame with overlays
  const drawCurrentFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Apply filters and draw video
    ctx.filter = getFilterString();
    ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Draw text overlays
    ctx.filter = 'none';
    textOverlays.forEach(overlay => {
      if (overlay.visible) {
        ctx.font = `${overlay.fontSize}px Arial`;
        ctx.fillStyle = overlay.color;
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 2;
        ctx.strokeText(overlay.text, overlay.x, overlay.y);
        ctx.fillText(overlay.text, overlay.x, overlay.y);
      }
    });
  };
  
  // Get CSS filter string
  const getFilterString = () => {
    return `
      brightness(${filters.brightness}%) 
      contrast(${filters.contrast}%) 
      saturate(${filters.saturation}%) 
      blur(${filters.blur}px)
      ${filters.grayscale ? 'grayscale(100%)' : ''}
      ${filters.sepia ? 'sepia(100%)' : ''}
      ${filters.invert ? 'invert(100%)' : ''}
    `;
  };
  
  // Video controls
  const togglePlay = () => {
    if (!videoRef.current) return;
    
    if (playing) {
      videoRef.current.pause();
    } else {
      if (videoRef.current.currentTime < trimStart || videoRef.current.currentTime >= trimEnd) {
        videoRef.current.currentTime = trimStart;
      }
      videoRef.current.play();
    }
    setPlaying(!playing);
  };
  
  const seekVideo = (time: number) => {
    if (videoRef.current) {
      const constrainedTime = Math.max(trimStart, Math.min(time, trimEnd));
      videoRef.current.currentTime = constrainedTime;
      setCurrentTime(constrainedTime);
    }
  };
  
  const skipTime = (seconds: number) => {
    if (videoRef.current) {
      const newTime = Math.max(trimStart, Math.min(videoRef.current.currentTime + seconds, trimEnd));
      videoRef.current.currentTime = newTime;
    }
  };
  
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !muted;
      setMuted(!muted);
    }
  };
  
  const changeVolume = (newVolume: number[]) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume[0];
      setVolume(newVolume[0]);
      if (newVolume[0] === 0) {
        setMuted(true);
        videoRef.current.muted = true;
      } else if (muted) {
        setMuted(false);
        videoRef.current.muted = false;
      }
    }
  };
  
  const changePlaybackRate = (rate: string) => {
    if (videoRef.current) {
      const numRate = parseFloat(rate);
      videoRef.current.playbackRate = numRate;
      setPlaybackRate(numRate);
    }
  };
  
  // Text overlay functions
  const addTextOverlay = () => {
    if (newText.trim()) {
      setTextOverlays([
        ...textOverlays,
        {
          id: Date.now().toString(),
          text: newText,
          x: canvasRef.current ? canvasRef.current.width / 4 : 100,
          y: canvasRef.current ? canvasRef.current.height / 2 : 100,
          fontSize,
          color: textColor,
          visible: true
        }
      ]);
      setNewText('');
    }
  };
  
  const removeTextOverlay = (id: string) => {
    setTextOverlays(textOverlays.filter(overlay => overlay.id !== id));
  };
  
  const toggleTextVisibility = (id: string) => {
    setTextOverlays(textOverlays.map(overlay => 
      overlay.id === id 
        ? { ...overlay, visible: !overlay.visible } 
        : overlay
    ));
  };
  
  // Format time
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // PROFESSIONAL VIDEO PROCESSING FUNCTIONS
  
  // Create video with annotations burned in
  const createVideoWithAnnotations = async (): Promise<Blob> => {
    return new Promise((resolve) => {
      if (!videoRef.current || !outputCanvasRef.current) {
        return resolve(recording.blob);
      }

      const canvas = outputCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(recording.blob);

      // Create MediaRecorder to capture the processed video
      const stream = canvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const processedBlob = new Blob(chunks, { type: 'video/webm' });
        resolve(processedBlob);
      };

      // Start recording the canvas
      mediaRecorder.start();

      // Process video frame by frame
      const video = videoRef.current;
      video.currentTime = trimStart;
      
      const processFrame = () => {
        if (video.currentTime >= trimEnd) {
          mediaRecorder.stop();
          return;
        }

        // Draw video frame with effects
        ctx.filter = getFilterString();
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Draw text overlays
        ctx.filter = 'none';
        textOverlays.forEach(overlay => {
          if (overlay.visible) {
            ctx.font = `${overlay.fontSize}px Arial`;
            ctx.fillStyle = overlay.color;
            ctx.strokeStyle = 'rgba(0,0,0,0.8)';
            ctx.lineWidth = 2;
            ctx.strokeText(overlay.text, overlay.x, overlay.y);
            ctx.fillText(overlay.text, overlay.x, overlay.y);
          }
        });

        // Continue to next frame
        setTimeout(() => {
          video.currentTime += 1/30; // 30fps
          processFrame();
        }, 33);
      };

      video.onseeked = () => {
        processFrame();
      };
    });
  };

  // Professional trim function
  const performTrim = async (): Promise<Blob> => {
    setIsProcessing(true);
    
    try {
      // If no annotations, just trim the original video
      if (textOverlays.length === 0 && 
          filters.brightness === 100 && 
          filters.contrast === 100 && 
          filters.saturation === 100 &&
          !filters.grayscale && !filters.sepia && !filters.invert) {
        
        // Simple trim using MediaRecorder
        const video = videoRef.current;
        if (!video) throw new Error('Video not available');
        
        const stream = (video as any).captureStream ? (video as any).captureStream() : null;
        if (!stream) {
          throw new Error('captureStream not supported');
        }
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9'
        });
        
        return new Promise((resolve) => {
          const chunks: BlobPart[] = [];
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              chunks.push(event.data);
            }
          };
          
          mediaRecorder.onstop = () => {
            const trimmedBlob = new Blob(chunks, { type: 'video/webm' });
            resolve(trimmedBlob);
          };
          
          // Set video to trim start and play
          video.currentTime = trimStart;
          video.play();
          mediaRecorder.start();
          
          // Stop recording at trim end
          setTimeout(() => {
            video.pause();
            mediaRecorder.stop();
          }, (trimEnd - trimStart) * 1000);
        });
      } else {
        // Complex processing with annotations
        return await createVideoWithAnnotations();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Save with all modifications
  const saveWithEffects = async () => {
    try {
      setIsProcessing(true);
      const processedBlob = await createVideoWithAnnotations();
      onSave(processedBlob);
    } catch (error) {
      console.error('Error saving video:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Export with format handling
  const exportWithFormat = async (format: string) => {
    try {
      setIsProcessing(true);
      
      if (format === 'mp4') {
        // For MP4 export, we need to handle it properly
        const processedBlob = await performTrim();
        
        // Create download link
        const url = URL.createObjectURL(processedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recording_${Date.now()}.webm`; // WebM is the actual format
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        onExport(format);
      }
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="video-editor bg-gray-50 rounded-lg border border-gray-200 p-2 md:p-4">
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-2 md:gap-4">
        {/* Main preview area */}
        <div className="xl:col-span-3 space-y-2 md:space-y-4">
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video w-full">
            {recording.mode === 'screen' || recording.mode === 'camera' ? (
              <>
                <video 
                  ref={videoRef} 
                  className="absolute inset-0 w-full h-full opacity-0 pointer-events-none" 
                  playsInline
                  preload="metadata"
                />
                <canvas 
                  ref={canvasRef}
                  className="w-full h-full object-contain" 
                />
                <canvas 
                  ref={outputCanvasRef}
                  className="hidden" 
                />
                
                {/* Professional video controls overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <div className="flex items-center gap-2 md:gap-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={togglePlay}
                      className="text-white hover:bg-white/20 p-2 touch-manipulation"
                      disabled={isProcessing}
                    >
                      {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => skipTime(-10)}
                      className="text-white hover:bg-white/20 p-2 touch-manipulation hidden md:flex"
                      disabled={isProcessing}
                    >
                      <SkipBack className="h-4 w-4" />
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => skipTime(10)}
                      className="text-white hover:bg-white/20 p-2 touch-manipulation hidden md:flex"
                      disabled={isProcessing}
                    >
                      <SkipForward className="h-4 w-4" />
                    </Button>
                    
                    <span className="text-white text-sm font-mono flex-shrink-0">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                    
                    <div className="flex-1 mx-2">
                      <Slider
                        value={[currentTime]}
                        min={0}
                        max={duration}
                        step={0.1}
                        onValueChange={(value) => seekVideo(value[0])}
                        className="touch-manipulation"
                        disabled={isProcessing}
                      />
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={toggleMute}
                      className="text-white hover:bg-white/20 p-2 touch-manipulation"
                      disabled={isProcessing}
                    >
                      {muted || volume === 0 ? (
                        <VolumeX className="h-4 w-4" />
                      ) : volume > 0.5 ? (
                        <Volume2 className="h-4 w-4" />
                      ) : (
                        <Volume1 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-4 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-sm">Processing video...</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                <div className="text-center">
                  <Volume2 size={48} className="mx-auto mb-4" />
                  <h3 className="text-xl font-medium">Audio Recording</h3>
                  <p className="opacity-70 mt-2">Duration: {formatTime(duration)}</p>
                  <video ref={videoRef} className="hidden" playsInline />
                </div>
              </div>
            )}
          </div>
          
          {/* Professional trim timeline */}
          <div className="bg-white rounded-lg border p-3 md:p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-sm">Timeline & Trim</h3>
                <Badge variant="outline" className="text-xs">
                  {formatTime(trimEnd - trimStart)} selected
                </Badge>
              </div>
              
              <div className="relative">
                {/* Timeline ruler */}
                <div className="flex justify-between text-xs text-gray-500 mb-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <span key={i}>{formatTime((duration / 5) * i)}</span>
                  ))}
                </div>
                
                {/* Main timeline */}
                <div className="relative bg-gray-200 rounded-full h-2 mb-4">
                  {/* Selected region */}
                  <div 
                    className="absolute bg-blue-500 h-2 rounded-full"
                    style={{
                      left: `${(trimStart / duration) * 100}%`,
                      width: `${((trimEnd - trimStart) / duration) * 100}%`
                    }}
                  />
                  
                  {/* Current time indicator */}
                  <div 
                    className="absolute w-1 h-4 bg-red-500 rounded-full -top-1"
                    style={{ left: `${(currentTime / duration) * 100}%` }}
                  />
                </div>
                
                {/* Trim controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium">Start: {formatTime(trimStart)}</Label>
                    <Slider
                      value={[trimStart]}
                      min={0}
                      max={duration}
                      step={0.1}
                      onValueChange={(value) => setTrimStart(Math.min(value[0], trimEnd - 0.1))}
                      className="touch-manipulation mt-1"
                      disabled={isProcessing}
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs font-medium">End: {formatTime(trimEnd)}</Label>
                    <Slider
                      value={[trimEnd]}
                      min={0}
                      max={duration}
                      step={0.1}
                      onValueChange={(value) => setTrimEnd(Math.max(value[0], trimStart + 0.1))}
                      className="touch-manipulation mt-1"
                      disabled={isProcessing}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Professional editing panel */}
        <div className="xl:col-span-1">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-3 touch-manipulation">
              <TabsTrigger value="trim" className="text-xs">
                <Scissors className="h-4 w-4 mr-1" /> Edit
              </TabsTrigger>
              <TabsTrigger value="text" className="text-xs">
                <Type className="h-4 w-4 mr-1" /> Text
              </TabsTrigger>
              <TabsTrigger value="filters" className="text-xs">
                <Layers className="h-4 w-4 mr-1" /> FX
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="trim" className="p-3 border rounded-lg mt-3">
              <div className="space-y-4">
                <h3 className="font-medium text-sm">Professional Tools</h3>
                
                <div className="space-y-3">
                  <Button 
                    className="w-full h-10 bg-blue-600 hover:bg-blue-700 touch-manipulation"
                    onClick={saveWithEffects}
                    disabled={isProcessing}
                  >
                    <Save className="h-4 w-4 mr-2" /> 
                    Save with Effects
                  </Button>
                  
                  <Button 
                    variant="outline"
                    className="w-full h-10 touch-manipulation"
                    onClick={() => performTrim()}
                    disabled={isProcessing}
                  >
                    <Scissors className="h-4 w-4 mr-2" /> 
                    Apply Trim
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => seekVideo(trimStart)}
                      className="touch-manipulation"
                      disabled={isProcessing}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => seekVideo(trimEnd)}
                      className="touch-manipulation"
                      disabled={isProcessing}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="text" className="p-3 border rounded-lg mt-3">
              <div className="space-y-4">
                <h3 className="font-medium text-sm">Text Overlay</h3>
                
                <div className="space-y-3">
                  <Input
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    placeholder="Enter text"
                    className="touch-manipulation"
                    disabled={isProcessing}
                  />
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={fontSize.toString()}
                      onValueChange={(value) => setFontSize(parseInt(value))}
                      disabled={isProcessing}
                    >
                      <SelectTrigger className="touch-manipulation">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="16">Small</SelectItem>
                        <SelectItem value="24">Medium</SelectItem>
                        <SelectItem value="32">Large</SelectItem>
                        <SelectItem value="48">X-Large</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <select 
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="border rounded px-2 text-sm touch-manipulation"
                      disabled={isProcessing}
                    >
                      <option value="#ffffff">White</option>
                      <option value="#000000">Black</option>
                      <option value="#ff0000">Red</option>
                      <option value="#00ff00">Green</option>
                      <option value="#0000ff">Blue</option>
                      <option value="#ffff00">Yellow</option>
                    </select>
                  </div>
                  
                  <Button 
                    className="w-full touch-manipulation"
                    onClick={addTextOverlay}
                    disabled={!newText.trim() || isProcessing}
                  >
                    <Type className="h-4 w-4 mr-2" /> Add Text
                  </Button>
                  
                  {textOverlays.length > 0 && (
                    <div className="border rounded p-2 max-h-32 overflow-y-auto">
                      <h4 className="text-xs font-medium mb-2">Text Elements</h4>
                      {textOverlays.map(overlay => (
                        <div 
                          key={overlay.id}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-gray-100"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 touch-manipulation"
                              onClick={() => toggleTextVisibility(overlay.id)}
                              disabled={isProcessing}
                            >
                              {overlay.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                            </Button>
                            <span className="truncate" style={{ color: overlay.color }}>
                              {overlay.text}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-500 touch-manipulation"
                            onClick={() => removeTextOverlay(overlay.id)}
                            disabled={isProcessing}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="filters" className="p-3 border rounded-lg mt-3">
              <div className="space-y-4">
                <h3 className="font-medium text-sm">Effects & Filters</h3>
                
                <div className="space-y-3">
                  {Object.entries({
                    brightness: { min: 50, max: 150, step: 1 },
                    contrast: { min: 50, max: 150, step: 1 },
                    saturation: { min: 0, max: 200, step: 1 },
                    blur: { min: 0, max: 10, step: 0.1 }
                  }).map(([key, config]) => (
                    <div key={key}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="capitalize">{key}</span>
                        <span>{filters[key as keyof typeof filters]}{key === 'blur' ? 'px' : '%'}</span>
                      </div>
                      <Slider
                        value={[filters[key as keyof typeof filters] as number]}
                        min={config.min}
                        max={config.max}
                        step={config.step}
                        onValueChange={(value) => setFilters({...filters, [key]: value[0]})}
                        className="touch-manipulation"
                        disabled={isProcessing}
                      />
                    </div>
                  ))}
                  
                  <div className="grid grid-cols-1 gap-2">
                    {(['grayscale', 'sepia', 'invert'] as const).map(effect => (
                      <div key={effect} className="flex items-center space-x-2 p-2 border rounded">
                        <Switch
                          checked={filters[effect]}
                          onCheckedChange={(checked) => setFilters({...filters, [effect]: checked})}
                          className="touch-manipulation"
                          disabled={isProcessing}
                        />
                        <Label className="text-sm capitalize">{effect}</Label>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    variant="outline"
                    className="w-full touch-manipulation"
                    onClick={() => setFilters({
                      brightness: 100, contrast: 100, saturation: 100, blur: 0,
                      grayscale: false, sepia: false, invert: false
                    })}
                    disabled={isProcessing}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" /> Reset
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          {/* Professional export section */}
          <div className="mt-4 p-3 border rounded-lg bg-white">
            <h3 className="font-medium text-sm mb-3">Export Options</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline"
                onClick={() => exportWithFormat('webm')}
                className="touch-manipulation text-xs"
                disabled={isProcessing}
              >
                <Download className="h-4 w-4 mr-1" /> WebM
              </Button>
              <Button 
                variant="outline"
                onClick={() => exportWithFormat('mp4')}
                className="touch-manipulation text-xs"
                disabled={isProcessing}
              >
                <Download className="h-4 w-4 mr-1" /> MP4
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoEditor;
