
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

// Advanced Video Editor Component
const AdvancedVideoEditor = ({ recording, onBack, onSave, onExport }: { 
  recording: any; 
  onBack: () => void; 
  onSave: (blob: Blob) => void;
  onExport: (format: string) => void; 
}) => {
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingTool, setDrawingTool] = useState<'pencil' | 'arrow' | 'text' | 'shape' | 'blur' | 'none'>('none');
  const [color, setColor] = useState('#FF0000');
  const [lineWidth, setLineWidth] = useState(3);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
  const [showTextInput, setShowTextInput] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(recording.duration);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([1]);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  // Effects and filters
  const [effects, setEffects] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    hue: 0,
    sepia: 0,
    grayscale: 0,
    invert: 0,
    opacity: 100
  });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const drawStartPosition = useRef({ x: 0, y: 0 });
  
  // Initialize video and canvas
  useEffect(() => {
    if (videoRef.current && recording?.url) {
      videoRef.current.src = recording.url;
      videoRef.current.currentTime = 0;
      
      if (canvasRef.current) {
        videoRef.current.onloadedmetadata = () => {
          if (canvasRef.current && videoRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
          }
        };
      }
    }
  }, [recording]);
  
  // Draw annotations and effects on canvas
  useEffect(() => {
    const drawFrame = () => {
      if (!canvasRef.current || !videoRef.current) return;
      
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      // Apply CSS filters to context
      const filterString = `
        brightness(${effects.brightness}%) 
        contrast(${effects.contrast}%) 
        saturate(${effects.saturation}%) 
        blur(${effects.blur}px)
        hue-rotate(${effects.hue}deg)
        sepia(${effects.sepia}%)
        grayscale(${effects.grayscale}%)
        invert(${effects.invert}%)
        opacity(${effects.opacity}%)
      `;
      ctx.filter = filterString;
      
      // Draw video frame
      if (videoRef.current.readyState >= 2) {
        ctx.drawImage(
          videoRef.current, 
          0, 0, 
          canvasRef.current.width, 
          canvasRef.current.height
        );
      }
      
      // Reset filter for annotations
      ctx.filter = 'none';
      
      // Draw annotations
      annotations.forEach(annotation => {
        ctx.strokeStyle = annotation.color;
        ctx.fillStyle = annotation.color;
        ctx.lineWidth = annotation.lineWidth || 3;
        
        if (annotation.type === 'pencil') {
          ctx.beginPath();
          annotation.points.forEach((point: {x: number, y: number}, index: number) => {
            if (index === 0) {
              ctx.moveTo(point.x, point.y);
            } else {
              ctx.lineTo(point.x, point.y);
            }
          });
          ctx.stroke();
        } else if (annotation.type === 'arrow') {
          drawArrow(ctx, annotation.start.x, annotation.start.y, annotation.end.x, annotation.end.y);
        } else if (annotation.type === 'text') {
          ctx.font = `${annotation.fontSize || 20}px Arial`;
          ctx.fillText(annotation.text, annotation.x, annotation.y);
        } else if (annotation.type === 'shape') {
          if (annotation.shape === 'rectangle') {
            ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
          } else if (annotation.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(annotation.x, annotation.y, annotation.radius, 0, 2 * Math.PI);
            ctx.stroke();
          }
        }
      });
    };
    
    drawFrame();
    
    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.addEventListener('timeupdate', drawFrame);
      return () => videoElement.removeEventListener('timeupdate', drawFrame);
    }
  }, [annotations, effects]);
  
  // Arrow drawing helper
  const drawArrow = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
    const headLength = 15;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    
    // Line
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    // Arrow head
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI/6), y2 - headLength * Math.sin(angle - Math.PI/6));
    ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI/6), y2 - headLength * Math.sin(angle + Math.PI/6));
    ctx.closePath();
    ctx.fill();
  };
  
  // Mouse event handlers for drawing
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawingTool === 'none') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    setIsDrawing(true);
    
    if (drawingTool === 'pencil') {
      setAnnotations([...annotations, { 
        type: 'pencil', 
        color, 
        lineWidth,
        points: [{ x, y }] 
      }]);
    } else if (drawingTool === 'arrow') {
      drawStartPosition.current = { x, y };
    } else if (drawingTool === 'text') {
      setTextPosition({ x, y });
      setShowTextInput(true);
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || drawingTool === 'none' || drawingTool === 'text') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    if (drawingTool === 'pencil') {
      const newAnnotations = [...annotations];
      const lastAnnotation = newAnnotations[newAnnotations.length - 1];
      lastAnnotation.points.push({ x, y });
      setAnnotations(newAnnotations);
    }
  };
  
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    if (drawingTool === 'arrow') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
      
      setAnnotations([...annotations, {
        type: 'arrow',
        color,
        lineWidth,
        start: drawStartPosition.current,
        end: { x, y }
      }]);
    }
    
    setIsDrawing(false);
  };
  
  // Add text annotation
  const handleTextSubmit = () => {
    if (textInput.trim()) {
      setAnnotations([...annotations, {
        type: 'text',
        color,
        text: textInput,
        x: textPosition.x,
        y: textPosition.y,
        fontSize: 20
      }]);
      setTextInput('');
      setShowTextInput(false);
    }
  };
  
  // Video controls
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };
  
  const seekTo = (time: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time[0];
      setCurrentTime(time[0]);
    }
  };
  
  const changeVolume = (newVolume: number[]) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume[0];
      setVolume(newVolume);
    }
  };
  
  const changePlaybackSpeed = (speed: string) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = parseFloat(speed);
      setPlaybackSpeed(parseFloat(speed));
    }
  };
  
  // Export functions
  const exportVideo = () => {
    if (canvasRef.current) {
      canvasRef.current.toBlob((blob) => {
        if (blob) {
          onSave(blob);
        }
      }, 'image/png');
    }
  };
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" onClick={onBack}>
          ← Back to Recorder
        </Button>
        <h2 className="text-2xl font-bold">Professional Video Editor</h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => onExport('mp4')}>
            <Download className="mr-2 h-4 w-4" />
            Export MP4
          </Button>
          <Button onClick={exportVideo}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>
      </div>
      
      {/* Video player with canvas overlay */}
      <div className="relative aspect-video bg-black rounded-lg mb-6 overflow-hidden">
        <video 
          ref={videoRef} 
          className="absolute inset-0 w-full h-full object-contain z-0"
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full z-10 cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
        
        {/* Text input overlay */}
        {showTextInput && (
          <div 
            className="absolute z-20 bg-white p-3 rounded-lg shadow-lg border"
            style={{ 
              left: `${(textPosition.x / (canvasRef.current?.width || 1)) * 100}%`, 
              top: `${(textPosition.y / (canvasRef.current?.height || 1)) * 100}%` 
            }}
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="border rounded px-3 py-2 text-sm w-48"
              placeholder="Enter text..."
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && handleTextSubmit()}
            />
            <div className="flex mt-2 justify-end space-x-2">
              <Button size="sm" variant="outline" onClick={() => setShowTextInput(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleTextSubmit}>
                Add
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Video controls */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <Button variant="outline" size="sm" onClick={togglePlayPause}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          
          <span className="text-sm font-mono">
            {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')} / 
            {Math.floor(recording.duration / 60)}:{Math.floor(recording.duration % 60).toString().padStart(2, '0')}
          </span>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm">Volume:</span>
            <div className="w-20">
              <Slider value={volume} min={0} max={1} step={0.1} onValueChange={changeVolume} />
            </div>
          </div>
          
          <Select value={playbackSpeed.toString()} onValueChange={changePlaybackSpeed}>
            <SelectTrigger className="w-20">
              <SelectValue />
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
        </div>
        
        {/* Timeline */}
        <Slider 
          value={[currentTime]} 
          min={0} 
          max={recording.duration} 
          step={0.1} 
          onValueChange={seekTo}
          className="mb-4"
        />
        
        {/* Trim controls */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm">Trim Start: {Math.floor(trimStart)}s</Label>
            <Slider 
              value={[trimStart]} 
              min={0} 
              max={recording.duration} 
              step={0.1} 
              onValueChange={(v) => setTrimStart(v[0])}
            />
          </div>
          <div>
            <Label className="text-sm">Trim End: {Math.floor(trimEnd)}s</Label>
            <Slider 
              value={[trimEnd]} 
              min={0} 
              max={recording.duration} 
              step={0.1} 
              onValueChange={(v) => setTrimEnd(v[0])}
            />
          </div>
        </div>
      </div>
      
      {/* Editor tools */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Drawing tools */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Drawing Tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={drawingTool === 'none' ? "default" : "outline"} 
                size="sm"
                onClick={() => setDrawingTool('none')}
              >
                <MousePointer className="h-4 w-4" />
              </Button>
              <Button 
                variant={drawingTool === 'pencil' ? "default" : "outline"} 
                size="sm"
                onClick={() => setDrawingTool('pencil')}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button 
                variant={drawingTool === 'arrow' ? "default" : "outline"} 
                size="sm"
                onClick={() => setDrawingTool('arrow')}
              >
                ↗
              </Button>
              <Button 
                variant={drawingTool === 'text' ? "default" : "outline"} 
                size="sm"
                onClick={() => setDrawingTool('text')}
              >
                <Type className="h-4 w-4" />
              </Button>
            </div>
            
            <div>
              <Label className="text-sm">Color</Label>
              <div className="flex gap-2 mt-1">
                {['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF', '#000000'].map(c => (
                  <button
                    key={c}
                    className={`w-6 h-6 rounded border-2 ${color === c ? 'border-gray-800' : 'border-gray-300'}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
            
            <div>
              <Label className="text-sm">Line Width: {lineWidth}px</Label>
              <Slider 
                value={[lineWidth]} 
                min={1} 
                max={10} 
                step={1} 
                onValueChange={(v) => setLineWidth(v[0])}
              />
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setAnnotations([])}
              className="w-full"
            >
              Clear All
            </Button>
          </CardContent>
        </Card>
        
        {/* Effects & Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Effects & Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(effects).map(([key, value]) => (
              <div key={key}>
                <Label className="text-sm capitalize">
                  {key}: {value}{key === 'hue' ? '°' : '%'}
                </Label>
                <Slider 
                  value={[value]} 
                  min={key === 'hue' ? -180 : 0} 
                  max={key === 'hue' ? 180 : key === 'brightness' || key === 'contrast' ? 200 : 100} 
                  step={1} 
                  onValueChange={(v) => setEffects(prev => ({ ...prev, [key]: v[0] }))}
                />
              </div>
            ))}
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setEffects({
                brightness: 100, contrast: 100, saturation: 100, blur: 0,
                hue: 0, sepia: 0, grayscale: 0, invert: 0, opacity: 100
              })}
              className="w-full"
            >
              Reset Filters
            </Button>
          </CardContent>
        </Card>
        
        {/* Export options */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Export Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={() => onExport('webm')} className="w-full" variant="outline">
              <Video className="mr-2 h-4 w-4" />
              Export WebM
            </Button>
            <Button onClick={() => onExport('mp4')} className="w-full" variant="outline">
              <FileVideo className="mr-2 h-4 w-4" />
              Export MP4
            </Button>
            <Button onClick={() => onExport('gif')} className="w-full" variant="outline">
              <Image className="mr-2 h-4 w-4" />
              Export GIF
            </Button>
            
            <div className="pt-2 border-t">
              <p className="text-xs text-gray-500">
                High-quality exports with all effects and annotations applied
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Main Professional Screen Recorder Component
const ProfessionalScreenRecorder: React.FC = () => {
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
              <div className="flex items-center gap-2 bg-red-50 px-3 py-2 rounded-lg">
                <Activity className="h-4 w-4 text-red-500" />
                <span className="text-sm font-mono font-bold text-red-700">
                  {formatTime(recordingTime)}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {isEditingVideo && recording ? (
          <AdvancedVideoEditor 
            recording={recording} 
            onBack={handleBackToRecorder}
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
                    
                    {getRecordingInfo().resolution && (
                      <div className="flex items-center">
                        <Monitor className="text-purple-500 mr-3 h-6 w-6" />
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Resolution</p>
                          <p className="font-bold text-lg">{getRecordingInfo().resolution}</p>
                        </div>
                      </div>
                    )}
                    
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
                <div>
                  <div className="bg-gradient-to-br from-green-500 to-teal-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                    <Camera className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">Camera Recording</h3>
                  <p className="text-gray-300 max-w-md mx-auto mb-6 leading-relaxed">
                    Record high-quality video using your webcam. Perfect for presentations, tutorials, and video messages.
                  </p>
                  {!isRecording && !recording && (
                    <Button 
                      onClick={requestPermissions}
                      className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-8 py-3 text-lg font-semibold shadow-xl"
                    >
                      <Camera className="mr-2 h-5 w-5" />
                      Enable Camera
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>
            
            {/* AUDIO TAB */}
            <TabsContent value="audio" className="p-6">
              <div className="aspect-video bg-gradient-to-br from-gray-900 to-black rounded-xl mb-6 text-center p-8 flex items-center justify-center">
                <div>
                  <div className="bg-gradient-to-br from-red-500 to-pink-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                    <Mic className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">Audio Recording</h3>
                  <p className="text-gray-300 max-w-md mx-auto mb-6 leading-relaxed">
                    Capture crystal-clear audio using your microphone. Ideal for podcasts, voice notes, and audio content.
                  </p>
                  {!isRecording && !recording && (
                    <Button 
                      onClick={requestPermissions}
                      className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white px-8 py-3 text-lg font-semibold shadow-xl"
                    >
                      <Mic className="mr-2 h-5 w-5" />
                      Enable Microphone
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfessionalScreenRecorder;
