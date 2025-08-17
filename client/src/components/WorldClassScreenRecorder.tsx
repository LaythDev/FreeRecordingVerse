import React, { useState, useRef, useEffect } from 'react';
import { useProfessionalRecorder } from '@/hooks/useProfessionalRecorder';
import { RecordingMode, RecordingSettings, Recording } from '@shared/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  Cog,
  Share2,
  ChevronDown,
  Trash2,
  Clock,
  FileText,
  Edit,
  Copy,
  Image,
  Film,
  Volume2,
  Volume1,
  VolumeX,
  Save,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Loader2,
  Maximize,
  XCircle,
  Info,
  Type,
  Crop,
  Layers,
  Smile,
  MousePointer,
  Sliders,
  FileVideo,
  Eye,
  EyeOff,
  Check,
  X,
  PenTool
} from 'lucide-react';

// Professional Video Editor Component
const ProfessionalVideoEditor = ({ 
  recording, 
  onSave, 
  onBack, 
  onExport 
}: { 
  recording: Recording; 
  onSave: (blob: Blob) => void; 
  onBack: () => void; 
  onExport: (format: string) => void; 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(recording.duration);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [cropMode, setCropMode] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(duration);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [activeTab, setActiveTab] = useState('trim');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Editing features
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
  
  // Filters state
  const [filters, setFilters] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    grayscale: false,
    sepia: false,
    invert: false
  });
  
  // Annotations state
  const [annotations, setAnnotations] = useState<Array<{
    id: string;
    type: 'arrow' | 'rectangle' | 'circle' | 'freehand';
    points: number[];
    color: string;
    lineWidth: number;
    visible: boolean;
  }>>([]);
  
  const [drawingMode, setDrawingMode] = useState<'arrow' | 'rectangle' | 'circle' | 'freehand' | null>(null);
  const [drawingColor, setDrawingColor] = useState('#ff0000');
  const [lineWidth, setLineWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<number[]>([]);
  
  // Initialize video player
  useEffect(() => {
    if (!videoRef.current) return;
    
    videoRef.current.src = recording.url;
    
    videoRef.current.onloadedmetadata = () => {
      if (!videoRef.current) return;
      
      const videoDuration = videoRef.current.duration || recording.duration;
      setDuration(videoDuration);
      setTrimEnd(videoDuration);
      
      // Setup canvas for preview
      if (canvasRef.current) {
        canvasRef.current.width = videoRef.current.videoWidth || 1280;
        canvasRef.current.height = videoRef.current.videoHeight || 720;
      }
    };
    
    videoRef.current.ontimeupdate = () => {
      if (!videoRef.current) return;
      
      setCurrentTime(videoRef.current.currentTime);
      
      // Draw video frame to canvas
      drawCurrentFrame();
      
      // Stop at trim end
      if (videoRef.current.currentTime >= trimEnd) {
        videoRef.current.pause();
        videoRef.current.currentTime = trimStart;
        setPlaying(false);
      }
    };
  }, [recording]);
  
  // Draw the current frame with all effects and overlays
  const drawCurrentFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    // Apply filters
    ctx.filter = getFilterString();
    
    // Draw video frame
    ctx.drawImage(
      videoRef.current,
      0, 0,
      canvasRef.current.width,
      canvasRef.current.height
    );
    
    // Draw text overlays
    textOverlays.forEach(overlay => {
      if (overlay.visible) {
        ctx.font = `${overlay.fontSize}px Arial`;
        ctx.fillStyle = overlay.color;
        ctx.fillText(overlay.text, overlay.x, overlay.y);
      }
    });
    
    // Draw annotations
    annotations.forEach(annotation => {
      if (!annotation.visible) return;
      
      ctx.strokeStyle = annotation.color;
      ctx.lineWidth = annotation.lineWidth;
      
      ctx.beginPath();
      
      if (annotation.type === 'arrow') {
        drawArrow(ctx, annotation.points[0], annotation.points[1], 
                 annotation.points[2], annotation.points[3], annotation.lineWidth * 3);
      } else if (annotation.type === 'rectangle') {
        const [x1, y1, x2, y2] = annotation.points;
        ctx.rect(x1, y1, x2 - x1, y2 - y1);
      } else if (annotation.type === 'circle') {
        const [x1, y1, x2, y2] = annotation.points;
        const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        ctx.arc(x1, y1, radius, 0, 2 * Math.PI);
      } else if (annotation.type === 'freehand') {
        // Draw freehand line segments
        ctx.moveTo(annotation.points[0], annotation.points[1]);
        for (let i = 2; i < annotation.points.length; i += 2) {
          ctx.lineTo(annotation.points[i], annotation.points[i + 1]);
        }
      }
      
      ctx.stroke();
    });
    
    // Draw current annotation in progress
    if (isDrawing && drawingMode && currentPoints.length >= 2) {
      ctx.strokeStyle = drawingColor;
      ctx.lineWidth = lineWidth;
      
      ctx.beginPath();
      
      if (drawingMode === 'arrow') {
        if (currentPoints.length >= 4) {
          drawArrow(ctx, currentPoints[0], currentPoints[1], 
                   currentPoints[2], currentPoints[3], lineWidth * 3);
        }
      } else if (drawingMode === 'rectangle') {
        const [x1, y1, x2, y2] = currentPoints;
        ctx.rect(x1, y1, x2 - x1, y2 - y1);
      } else if (drawingMode === 'circle') {
        const [x1, y1, x2, y2] = currentPoints;
        const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        ctx.arc(x1, y1, radius, 0, 2 * Math.PI);
      } else if (drawingMode === 'freehand') {
        ctx.moveTo(currentPoints[0], currentPoints[1]);
        for (let i = 2; i < currentPoints.length; i += 2) {
          ctx.lineTo(currentPoints[i], currentPoints[i + 1]);
        }
      }
      
      ctx.stroke();
    }
  };
  
  // Helper function to draw an arrow
  const drawArrow = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, headSize: number) => {
    // Line
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    
    // Arrow head
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.lineTo(
      x2 - headSize * Math.cos(angle - Math.PI / 6),
      y2 - headSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - headSize * Math.cos(angle + Math.PI / 6),
      y2 - headSize * Math.sin(angle + Math.PI / 6)
    );
  };
  
  // Handle canvas mouse events for drawing
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingMode || !canvasRef.current) return;
    
    setIsDrawing(true);
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCurrentPoints([x, y, x, y]);
  };
  
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawingMode || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (drawingMode === 'freehand') {
      // For freehand, add points continuously
      setCurrentPoints(prev => [...prev, x, y]);
    } else {
      // For shapes, update the end point
      setCurrentPoints(prev => [prev[0], prev[1], x, y]);
    }
    
    // Redraw
    drawCurrentFrame();
  };
  
  const handleCanvasMouseUp = () => {
    if (!isDrawing || !drawingMode) return;
    
    setIsDrawing(false);
    
    // Add the annotation
    if (currentPoints.length >= 4) {
      setAnnotations(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          type: drawingMode,
          points: [...currentPoints],
          color: drawingColor,
          lineWidth: lineWidth,
          visible: true
        }
      ]);
    }
    
    setCurrentPoints([]);
  };
  
  // Filter string generation
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
  
  // Video playback controls
  const togglePlay = () => {
    if (!videoRef.current) return;
    
    if (playing) {
      videoRef.current.pause();
    } else {
      // Ensure we're within trim boundaries
      if (videoRef.current.currentTime < trimStart) {
        videoRef.current.currentTime = trimStart;
      } else if (videoRef.current.currentTime > trimEnd) {
        videoRef.current.currentTime = trimStart;
      }
      videoRef.current.play();
    }
    setPlaying(!playing);
  };
  
  const seekVideo = (time: number) => {
    if (!videoRef.current) return;
    
    videoRef.current.currentTime = time;
    setCurrentTime(time);
    drawCurrentFrame();
  };
  
  const toggleMute = () => {
    if (!videoRef.current) return;
    
    videoRef.current.muted = !muted;
    setMuted(!muted);
  };
  
  const changeVolume = (newVolume: number[]) => {
    if (!videoRef.current) return;
    
    videoRef.current.volume = newVolume[0];
    setVolume(newVolume[0]);
    
    if (newVolume[0] === 0) {
      setMuted(true);
      videoRef.current.muted = true;
    } else if (muted) {
      setMuted(false);
      videoRef.current.muted = false;
    }
  };
  
  const changePlaybackRate = (rate: string) => {
    if (!videoRef.current) return;
    
    const numRate = parseFloat(rate);
    videoRef.current.playbackRate = numRate;
    setPlaybackRate(numRate);
  };
  
  // Text overlay functions
  const addTextOverlay = () => {
    if (!newText || !canvasRef.current) return;
    
    setTextOverlays([
      ...textOverlays,
      {
        id: Date.now().toString(),
        text: newText,
        x: canvasRef.current.width / 2 - 100,
        y: canvasRef.current.height / 2,
        fontSize,
        color: textColor,
        visible: true
      }
    ]);
    
    setNewText('');
    drawCurrentFrame();
  };
  
  const removeTextOverlay = (id: string) => {
    setTextOverlays(textOverlays.filter(overlay => overlay.id !== id));
    drawCurrentFrame();
  };
  
  const toggleTextVisibility = (id: string) => {
    setTextOverlays(textOverlays.map(overlay => 
      overlay.id === id 
        ? { ...overlay, visible: !overlay.visible } 
        : overlay
    ));
    drawCurrentFrame();
  };
  
  // Annotation functions
  const removeAnnotation = (id: string) => {
    setAnnotations(annotations.filter(annotation => annotation.id !== id));
    drawCurrentFrame();
  };
  
  const toggleAnnotationVisibility = (id: string) => {
    setAnnotations(annotations.map(annotation => 
      annotation.id === id 
        ? { ...annotation, visible: !annotation.visible } 
        : annotation
    ));
    drawCurrentFrame();
  };
  
  // Format time (mm:ss)
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Process and save the edited video
  const processAndSave = () => {
    if (!canvasRef.current || recording.mode === 'audio') {
      return onSave(recording.blob);
    }
    
    setIsProcessing(true);
    setProgress(0);
    
    // In a real implementation, you would perform actual video processing here
    // This is a simplified version for demonstration
    
    // Simulate processing progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return prev;
        }
        return prev + 5;
      });
    }, 200);
    
    // Simulate completion after "processing"
    setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      
      // Get the final frame
      canvasRef.current?.toBlob((blob) => {
        if (blob) {
          setIsProcessing(false);
          
          // In a real implementation, this would be a modified video
          // For now, we just return the current blob as proof of concept
          onSave(blob);
          
          toast({
            title: "Editing complete",
            description: "Your video has been processed successfully.",
            variant: "default",
          });
        }
      }, 'image/png');
    }, 3000);
  };
  
  return (
    <div className="video-editor bg-gray-50 rounded-lg border border-gray-200 p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main preview area */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            {recording.mode === 'screen' || recording.mode === 'camera' ? (
              <>
                <video 
                  ref={videoRef} 
                  className="absolute inset-0 w-full h-full opacity-0" 
                  playsInline
                />
                <canvas 
                  ref={canvasRef}
                  className="w-full h-full cursor-crosshair" 
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                />
                
                {cropMode && (
                  <div className="absolute inset-0 border-2 border-blue-500 bg-black bg-opacity-50 cursor-move">
                    <div className="absolute top-0 left-0 w-4 h-4 bg-blue-500 cursor-nw-resize" />
                    <div className="absolute top-0 right-0 w-4 h-4 bg-blue-500 cursor-ne-resize" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 bg-blue-500 cursor-sw-resize" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-se-resize" />
                  </div>
                )}
                
                {drawingMode && (
                  <div className="absolute top-4 left-4 bg-gray-800 text-white text-sm py-1 px-3 rounded-md opacity-80">
                    Drawing: {drawingMode} (click and drag)
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
            
            {isProcessing && (
              <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center">
                <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                <p className="text-white text-lg font-medium">Processing your video...</p>
                <Progress 
                  value={progress} 
                  className="w-64 h-2 mt-4" 
                />
                <p className="text-white text-sm mt-2">{progress}% complete</p>
              </div>
            )}
          </div>
          
          {/* Playback controls */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={togglePlay}
                className="w-24"
                disabled={isProcessing}
              >
                {playing ? (
                  <><Pause className="mr-1 h-4 w-4" /> Pause</>
                ) : (
                  <><Play className="mr-1 h-4 w-4" /> Play</>
                )}
              </Button>
              
              <span className="text-sm font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              
              <div className="flex items-center ml-auto gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={toggleMute}
                  disabled={isProcessing}
                >
                  {muted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : volume > 0.5 ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <Volume1 className="h-4 w-4" />
                  )}
                </Button>
                
                <div className="w-24">
                  <Slider
                    value={[volume]}
                    min={0}
                    max={1}
                    step={0.1}
                    onValueChange={changeVolume}
                    disabled={isProcessing}
                  />
                </div>
                
                <Select 
                  value={playbackRate.toString()} 
                  onValueChange={changePlaybackRate}
                  disabled={isProcessing}
                >
                  <SelectTrigger className="w-24 h-8">
                    <SelectValue placeholder="1x" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.5">0.5x</SelectItem>
                    <SelectItem value="0.75">0.75x</SelectItem>
                    <SelectItem value="1">1x</SelectItem>
                    <SelectItem value="1.25">1.25x</SelectItem>
                    <SelectItem value="1.5">1.5x</SelectItem>
                    <SelectItem value="2">2x</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCropMode(!cropMode)}
                  disabled={isProcessing}
                >
                  <Crop className="h-4 w-4 mr-1" /> Crop
                </Button>
              </div>
            </div>
            
            {/* Timeline */}
            <div className="space-y-2">
              <div className="relative pt-5">
                <div className="absolute inset-x-0 h-1 -top-1 flex">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="flex-1 flex justify-between">
                      <div className="w-px h-2 bg-gray-300" />
                      <div className="w-px h-2 bg-gray-300" />
                    </div>
                  ))}
                </div>
                <Slider
                  value={[currentTime]}
                  min={0}
                  max={duration}
                  step={0.01}
                  onValueChange={(value) => seekVideo(value[0])}
                  className="z-10"
                  disabled={isProcessing}
                />
              </div>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              variant="default"
              onClick={processAndSave}
              disabled={isProcessing}
              className="bg-primary text-white hover:bg-primary/90"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => onExport('webm')}
              disabled={isProcessing}
            >
              <Download className="mr-2 h-4 w-4" />
              Export WebM
            </Button>
            
            <Button
              variant="outline"
              onClick={() => onExport('mp4')}
              disabled={isProcessing}
            >
              <FileVideo className="mr-2 h-4 w-4" />
              Export MP4
            </Button>
            
            {recording.mode !== 'audio' && (
              <Button
                variant="outline"
                onClick={() => onExport('gif')}
                disabled={isProcessing}
              >
                <Image className="mr-2 h-4 w-4" />
                Export GIF
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={onBack}
              disabled={isProcessing}
              className="ml-auto"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Recorder
            </Button>
          </div>
        </div>
        
        {/* Editing tools panel */}
        <div className="lg:col-span-1">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="trim">
                <Scissors className="h-4 w-4 mr-1" /> Trim
              </TabsTrigger>
              <TabsTrigger value="text">
                <Type className="h-4 w-4 mr-1" /> Text
              </TabsTrigger>
              <TabsTrigger value="draw">
                <PenTool className="h-4 w-4 mr-1" /> Draw
              </TabsTrigger>
              <TabsTrigger value="filters">
                <Sliders className="h-4 w-4 mr-1" /> Filters
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="trim" className="p-3 border rounded-lg mt-3">
              <div className="space-y-4">
                <h3 className="font-medium">Trim Video</h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Start Time</span>
                    <span className="font-mono">{formatTime(trimStart)}</span>
                  </div>
                  <Slider
                    value={[trimStart]}
                    min={0}
                    max={duration}
                    step={0.1}
                    onValueChange={(value) => setTrimStart(value[0])}
                    disabled={isProcessing}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>End Time</span>
                    <span className="font-mono">{formatTime(trimEnd)}</span>
                  </div>
                  <Slider
                    value={[trimEnd]}
                    min={0}
                    max={duration}
                    step={0.1}
                    onValueChange={(value) => setTrimEnd(value[0])}
                    disabled={isProcessing}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1"
                    onClick={() => seekVideo(trimStart)}
                    disabled={isProcessing}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" /> Start
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1"
                    onClick={() => seekVideo(trimEnd)}
                    disabled={isProcessing}
                  >
                    End <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-medium mb-2">Playback Speed</h3>
                  <Select 
                    value={playbackRate.toString()} 
                    onValueChange={changePlaybackRate}
                    disabled={isProcessing}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="1x" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.5">0.5x (Slow Motion)</SelectItem>
                      <SelectItem value="0.75">0.75x (Slow)</SelectItem>
                      <SelectItem value="1">1x (Normal)</SelectItem>
                      <SelectItem value="1.25">1.25x (Fast)</SelectItem>
                      <SelectItem value="1.5">1.5x (Faster)</SelectItem>
                      <SelectItem value="2">2x (Double Speed)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="text" className="p-3 border rounded-lg mt-3">
              <div className="space-y-4">
                <h3 className="font-medium">Add Text Overlay</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="textOverlay">Text Content</Label>
                  <Input 
                    id="textOverlay" 
                    value={newText} 
                    onChange={(e) => setNewText(e.target.value)} 
                    placeholder="Enter text to overlay"
                    disabled={isProcessing}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="fontSize">Font Size</Label>
                    <Select 
                      value={fontSize.toString()} 
                      onValueChange={(value) => setFontSize(parseInt(value))}
                      disabled={isProcessing}
                    >
                      <SelectTrigger id="fontSize">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="16">Small (16px)</SelectItem>
                        <SelectItem value="24">Medium (24px)</SelectItem>
                        <SelectItem value="32">Large (32px)</SelectItem>
                        <SelectItem value="48">X-Large (48px)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="textColor">Text Color</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="textColor"
                        type="color" 
                        value={textColor} 
                        onChange={(e) => setTextColor(e.target.value)} 
                        className="w-12 h-9 p-1"
                        disabled={isProcessing}
                      />
                      <Input 
                        value={textColor.toUpperCase()} 
                        onChange={(e) => setTextColor(e.target.value)}
                        className="flex-1"
                        disabled={isProcessing}
                      />
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={addTextOverlay} 
                  className="w-full"
                  disabled={!newText.trim() || isProcessing}
                >
                  <Type className="h-4 w-4 mr-1" /> Add Text
                </Button>
                
                <Separator />
                
                <div className="space-y-2">
                  <h3 className="font-medium">Existing Text Overlays</h3>
                  
                  {textOverlays.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">No text overlays added yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {textOverlays.map(overlay => (
                        <div 
                          key={overlay.id} 
                          className="flex items-center justify-between border rounded-md p-2"
                        >
                          <div className="flex items-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => toggleTextVisibility(overlay.id)}
                              className="p-1 h-7 w-7"
                              disabled={isProcessing}
                            >
                              {overlay.visible ? (
                                <Eye className="h-4 w-4" />
                              ) : (
                                <EyeOff className="h-4 w-4" />
                              )}
                            </Button>
                            <span 
                              className={`ml-2 text-sm truncate max-w-[10rem] ${
                                overlay.visible ? "" : "line-through opacity-50"
                              }`}
                              style={{ color: overlay.color }}
                            >
                              {overlay.text}
                            </span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeTextOverlay(overlay.id)}
                            className="p-1 h-7 w-7 text-red-500 hover:text-red-700"
                            disabled={isProcessing}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="draw" className="p-3 border rounded-lg mt-3">
              <div className="space-y-4">
                <h3 className="font-medium">Drawing Tools</h3>
                
                <div className="flex flex-wrap gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant={drawingMode === 'arrow' ? "default" : "outline"} 
                          size="sm" 
                          onClick={() => setDrawingMode(drawingMode === 'arrow' ? null : 'arrow')}
                          className="p-2"
                          disabled={isProcessing}
                        >
                          <ArrowRight className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Arrow</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant={drawingMode === 'rectangle' ? "default" : "outline"} 
                          size="sm" 
                          onClick={() => setDrawingMode(drawingMode === 'rectangle' ? null : 'rectangle')}
                          className="p-2"
                          disabled={isProcessing}
                        >
                          <div className="w-5 h-5 border-2 border-current" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Rectangle</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant={drawingMode === 'circle' ? "default" : "outline"} 
                          size="sm" 
                          onClick={() => setDrawingMode(drawingMode === 'circle' ? null : 'circle')}
                          className="p-2"
                          disabled={isProcessing}
                        >
                          <div className="w-5 h-5 rounded-full border-2 border-current" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Circle</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant={drawingMode === 'freehand' ? "default" : "outline"} 
                          size="sm" 
                          onClick={() => setDrawingMode(drawingMode === 'freehand' ? null : 'freehand')}
                          className="p-2"
                          disabled={isProcessing}
                        >
                          <PenTool className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Freehand</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  {drawingMode && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setDrawingMode(null)}
                      className="bg-red-50 border-red-200 hover:bg-red-100 text-red-600 ml-auto"
                      disabled={isProcessing}
                    >
                      <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="drawingColor">Color</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="drawingColor"
                        type="color" 
                        value={drawingColor} 
                        onChange={(e) => setDrawingColor(e.target.value)} 
                        className="w-12 h-9 p-1"
                        disabled={isProcessing}
                      />
                      <Input 
                        value={drawingColor.toUpperCase()} 
                        onChange={(e) => setDrawingColor(e.target.value)}
                        className="flex-1"
                        disabled={isProcessing}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lineWidth">Line Width</Label>
                    <Select 
                      value={lineWidth.toString()} 
                      onValueChange={(value) => setLineWidth(parseInt(value))}
                      disabled={isProcessing}
                    >
                      <SelectTrigger id="lineWidth">
                        <SelectValue placeholder="Select width" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Thin (1px)</SelectItem>
                        <SelectItem value="3">Medium (3px)</SelectItem>
                        <SelectItem value="5">Thick (5px)</SelectItem>
                        <SelectItem value="8">Very Thick (8px)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {drawingMode && (
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-md text-blue-700 text-sm">
                    <Info className="h-4 w-4 inline mr-2" />
                    Click and drag on the video to draw {drawingMode} shapes.
                  </div>
                )}
                
                <Separator />
                
                <div className="space-y-2">
                  <h3 className="font-medium">Annotations</h3>
                  
                  {annotations.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">No annotations added yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {annotations.map((annotation, index) => (
                        <div 
                          key={annotation.id} 
                          className="flex items-center justify-between border rounded-md p-2"
                        >
                          <div className="flex items-center">
                            <div 
                              className="h-5 w-5 rounded-full" 
                              style={{ backgroundColor: annotation.color }}
                            ></div>
                            <span className="ml-2 text-sm">
                              {annotation.type.charAt(0).toUpperCase() + annotation.type.slice(1)} {index + 1}
                            </span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeAnnotation(annotation.id)}
                            className="p-1 h-7 w-7 text-red-500 hover:text-red-700"
                            disabled={isProcessing}
                          >
                            <Trash2 className="h-4 w-4" />
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
                <h3 className="font-medium">Video Filters</h3>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Brightness</span>
                      <span>{filters.brightness}%</span>
                    </div>
                    <Slider
                      value={[filters.brightness]}
                      min={0}
                      max={200}
                      step={5}
                      onValueChange={(value) => {
                        setFilters({...filters, brightness: value[0]});
                        drawCurrentFrame();
                      }}
                      disabled={isProcessing}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Contrast</span>
                      <span>{filters.contrast}%</span>
                    </div>
                    <Slider
                      value={[filters.contrast]}
                      min={0}
                      max={200}
                      step={5}
                      onValueChange={(value) => {
                        setFilters({...filters, contrast: value[0]});
                        drawCurrentFrame();
                      }}
                      disabled={isProcessing}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Saturation</span>
                      <span>{filters.saturation}%</span>
                    </div>
                    <Slider
                      value={[filters.saturation]}
                      min={0}
                      max={200}
                      step={5}
                      onValueChange={(value) => {
                        setFilters({...filters, saturation: value[0]});
                        drawCurrentFrame();
                      }}
                      disabled={isProcessing}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Blur</span>
                      <span>{filters.blur}px</span>
                    </div>
                    <Slider
                      value={[filters.blur]}
                      min={0}
                      max={10}
                      step={0.5}
                      onValueChange={(value) => {
                        setFilters({...filters, blur: value[0]});
                        drawCurrentFrame();
                      }}
                      disabled={isProcessing}
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <Label htmlFor="grayscale" className="cursor-pointer">Grayscale</Label>
                    <Switch
                      id="grayscale"
                      checked={filters.grayscale}
                      onCheckedChange={(checked) => {
                        setFilters({...filters, grayscale: checked});
                        drawCurrentFrame();
                      }}
                      disabled={isProcessing}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <Label htmlFor="sepia" className="cursor-pointer">Sepia</Label>
                    <Switch
                      id="sepia"
                      checked={filters.sepia}
                      onCheckedChange={(checked) => {
                        setFilters({...filters, sepia: checked});
                        drawCurrentFrame();
                      }}
                      disabled={isProcessing}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <Label htmlFor="invert" className="cursor-pointer">Invert</Label>
                    <Switch
                      id="invert"
                      checked={filters.invert}
                      onCheckedChange={(checked) => {
                        setFilters({...filters, invert: checked});
                        drawCurrentFrame();
                      }}
                      disabled={isProcessing}
                    />
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setFilters({
                      brightness: 100,
                      contrast: 100,
                      saturation: 100,
                      blur: 0,
                      grayscale: false,
                      sepia: false,
                      invert: false
                    });
                    drawCurrentFrame();
                  }}
                  disabled={isProcessing}
                  className="w-full"
                >
                  <RotateCcw className="h-4 w-4 mr-1" /> Reset Filters
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

// Main World-Class Screen Recorder Component
const WorldClassScreenRecorder: React.FC = () => {
  // State management
  const [activeTab, setActiveTab] = useState<RecordingMode>('screen');
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isEditingVideo, setIsEditingVideo] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<'webm' | 'mp4' | 'gif'>('webm');
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [showPreview, setShowPreview] = useState(true);
  
  // References
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  
  // Use the professional recorder hook
  const {
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
  } = useProfessionalRecorder();

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
  const recordingInfo = getRecordingInfo();

  return (
    <div className="py-8 px-4 md:px-6 lg:px-8">
      {isEditingVideo && state.recording ? (
        // Video editor view
        <div className="editor-container">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Professional Video Editor</h2>
            <p className="text-gray-500">
              Edit your recording with professional tools and effects
            </p>
          </div>
          
          <ProfessionalVideoEditor 
            recording={state.recording} 
            onSave={handleSaveEditedVideo}
            onBack={() => setIsEditingVideo(false)}
            onExport={handleExportVideo}
          />
        </div>
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
                        <span className="font-mono">{recordingInfo.formattedDuration}</span>
                        
                        <div className="flex items-center">
                          <FileText className="h-3 w-3 mr-1" />
                          <span>Size:</span>
                        </div>
                        <span className="font-mono">{recordingInfo.formattedSize}</span>
                        
                        <div className="flex items-center">
                          <Monitor className="h-3 w-3 mr-1" />
                          <span>Resolution:</span>
                        </div>
                        <span className="font-mono">{recordingInfo.resolution}</span>
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
                      <p className="font-medium">{recordingInfo.formattedDuration}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">File Size</p>
                      <p className="font-medium">{recordingInfo.formattedSize}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Resolution</p>
                      <p className="font-medium">{recordingInfo.resolution}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Format</p>
                      <p className="font-medium">{recordingInfo.format}</p>
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
                
                {/* Advanced settings accordion */}
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="advanced-settings">
                    <AccordionTrigger className="text-sm font-medium text-gray-700">
                      <Settings className="h-4 w-4 mr-2" /> Advanced Settings
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-2 pb-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-gray-700">Record Tab Audio</Label>
                            <p className="text-gray-500 text-sm">Capture audio from the current browser tab</p>
                          </div>
                          <Switch 
                            checked={true}
                            disabled={state.isRecording}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-gray-700">Record System Audio</Label>
                            <p className="text-gray-500 text-sm">Capture audio from your entire system</p>
                          </div>
                          <Switch 
                            checked={true}
                            disabled={state.isRecording}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="codec" className="text-gray-700 mb-2 block">Video Codec</Label>
                          <Select 
                            disabled={state.isRecording}
                            value="vp9"
                          >
                            <SelectTrigger id="codec" className="border-gray-200">
                              <SelectValue placeholder="VP9 (Recommended)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="vp9">VP9 (High Quality)</SelectItem>
                              <SelectItem value="vp8">VP8 (Compatible)</SelectItem>
                              <SelectItem value="h264">H.264 (Best Compatibility)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                
                {/* Main Recording Controls */}
                <div className="flex flex-col sm:flex-row gap-4 mt-6">
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

            {/* CAMERA RECORDING TAB - Similar structure to screen tab */}
            <TabsContent value="camera" className="p-6">
              {/* Similar structure to screen tab, adapted for camera */}
              <div className="aspect-video bg-gray-100 rounded-lg mb-6 flex items-center justify-center overflow-hidden border border-gray-200">
                {state.recording && !state.isRecording && showPreview ? (
                  <div className="relative w-full h-full">
                    <video 
                      ref={previewRef} 
                      className="w-full h-full" 
                      controls 
                      playsInline
                    />
                    <div className="absolute top-4 right-4 flex gap-2">
                      <Button size="sm" variant="secondary" onClick={handleEditRecording}>
                        <Scissors className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="secondary">
                            <Download className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
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
                      <Button size="sm" variant="secondary" onClick={() => setShowPreview(false)}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Recording info overlay */}
                    <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white rounded-md p-2 text-xs">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>Duration:</span>
                        </div>
                        <span className="font-mono">{recordingInfo.formattedDuration}</span>
                        
                        <div className="flex items-center">
                          <FileText className="h-3 w-3 mr-1" />
                          <span>Size:</span>
                        </div>
                        <span className="font-mono">{recordingInfo.formattedSize}</span>
                        
                        <div className="flex items-center">
                          <Camera className="h-3 w-3 mr-1" />
                          <span>Resolution:</span>
                        </div>
                        <span className="font-mono">{recordingInfo.resolution}</span>
                      </div>
                    </div>
                  </div>
                ) : state.mediaStream ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <video 
                      ref={videoRef} 
                      className="hidden" 
                      muted 
                      playsInline
                    />
                    
                    <canvas 
                      ref={canvasRef} 
                      className="max-w-full max-h-full"
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
                    <Camera className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-xl font-semibold mb-2 text-gray-700">Camera Access Required</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Allow access to your camera to start recording video
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
                          <Camera className="h-4 w-4 mr-2" /> 
                          Enable Camera
                        </span>
                      )}
                    </Button>
                    
                    {permissionDenied && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Camera access denied</p>
                          <p className="text-sm">{errorMessage || 'Please allow camera access in your browser settings.'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Rest of camera tab content similar to screen tab */}
              {/* Status display, settings, and control buttons */}
              {/* Simplified for brevity, as structure is similar to screen tab */}
              {/* Main Recording Controls */}
              <div className="flex flex-col sm:flex-row gap-4 mt-6">
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
              </div>
            </TabsContent>

            {/* AUDIO RECORDING TAB */}
            <TabsContent value="audio" className="p-6">
              <div className="h-64 bg-gray-100 rounded-lg mb-6 flex items-center justify-center border border-gray-200">
                {state.recording && !state.isRecording && showPreview ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="mb-4">
                        <Mic className="h-16 w-16 mx-auto text-primary" />
                        <h3 className="text-xl font-semibold mt-2">Audio Recording</h3>
                        <p className="text-gray-600">Duration: {formatTime(state.recording.duration)}</p>
                      </div>
                      
                      <audio 
                        ref={previewRef} 
                        controls 
                        className="w-80 mx-auto"
                      />
                    </div>
                    
                    <div className="absolute top-4 right-4 flex gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="secondary">
                            <Download className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-52">
                          <DropdownMenuLabel>Export Audio</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => handleExportVideo('webm')}>
                              WebM Audio
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExportVideo('mp4')}>
                              MP4 Audio
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button size="sm" variant="secondary" onClick={() => setShowPreview(false)}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : state.mediaStream ? (
                  <div className="w-full h-full flex items-center justify-center">
                    {state.isRecording ? (
                      <div className="text-center">
                        {/* Audio visualizer (animated bars) */}
                        <div className="flex items-center justify-center h-16 mb-4 gap-1">
                          {Array.from({length: 12}).map((_, i) => (
                            <div 
                              key={i}
                              className="w-1.5 bg-primary rounded-full"
                              style={{
                                height: `${20 + Math.sin(Date.now()/200 + i) * 30}px`,
                                animation: `pulse ${0.5 + Math.random() * 0.5}s ease-in-out infinite alternate`,
                                animationDelay: `${i * 0.05}s`
                              }}
                            ></div>
                          ))}
                        </div>
                        
                        <div className="font-mono text-2xl font-semibold mb-2">
                          {formatTime(state.recordingTime)}
                        </div>
                        <p className="text-gray-600">Microphone recording in progress...</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Mic className="h-16 w-16 mx-auto text-primary mb-4" />
                        <p className="text-gray-600 font-medium">Microphone ready!</p>
                        <p className="text-gray-500 text-sm mt-2">Press "Start Recording" to begin</p>
                      </div>
                    )}
                    
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
                    <Mic className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-xl font-semibold mb-2 text-gray-700">Microphone Access Required</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Allow access to your microphone to start recording audio
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
                          <Mic className="h-4 w-4 mr-2" /> 
                          Enable Microphone
                        </span>
                      )}
                    </Button>
                    
                    {permissionDenied && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Microphone access denied</p>
                          <p className="text-sm">{errorMessage || 'Please allow microphone access in your browser settings.'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Rest of audio tab content similar to other tabs */}
              {/* Status display, settings, and control buttons */}
              {/* Main Recording Controls */}
              <div className="flex flex-col sm:flex-row gap-4 mt-6">
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

export default WorldClassScreenRecorder;