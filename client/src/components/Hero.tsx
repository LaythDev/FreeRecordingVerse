import { FC } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Video, 
  ArrowDownCircle, 
  CheckCircle, 
  Shield, 
  Clock, 
  Pause, 
  Square, 
  Monitor, 
  Camera, 
  Mic,
  Download,
  Edit,
  FileVideo
} from 'lucide-react';

interface HeroProps {
  scrollToRecorder: () => void;
}

const Hero: FC<HeroProps> = ({ scrollToRecorder }) => {
  return (
    <section className="bg-gradient-to-b from-white to-gray-50 py-16 md:py-24 px-6 md:px-10 lg:px-16">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-block bg-secondary/20 text-primary px-4 py-1 rounded-full text-sm font-medium mb-4">
              100% FREE - NO SIGNUP REQUIRED
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-6 text-gray-800">
              Professional Screen <span className="text-secondary">Recording</span> Made Simple
            </h1>
            <p className="text-gray-600 text-lg mb-8">
              Create stunning screen recordings, webcam videos, and audio recordings instantly. No downloads, 
              no sign up, no watermarks, and absolutely no time limits - completely free forever.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">HD recording up to 1080p/60fps</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">Unlimited recording time</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">No watermarks or branding</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">Built-in video editor</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">Multiple export formats</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">100% private & secure</span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                className="bg-secondary text-primary hover:bg-secondary/90 transition-all flex items-center justify-center gap-2 shadow-lg py-6 text-lg"
                onClick={scrollToRecorder}
              >
                <Video className="h-5 w-5" />
                Start Recording Now
              </Button>
              <Button 
                variant="outline"
                className="bg-white text-gray-700 border border-gray-200 hover:border-secondary hover:bg-gray-50 transition-all flex items-center justify-center gap-2 py-6 text-lg"
                onClick={() => {
                  document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <ArrowDownCircle className="h-5 w-5" />
                See How It Works
              </Button>
            </div>
          </div>
          
          <div className="relative mt-10 lg:mt-0 mb-10 transform transition-all duration-500 hover:scale-[1.02]">
            {/* Main UI window with glass effect */}
            <div className="rounded-xl shadow-2xl overflow-hidden w-full aspect-[4/3] md:aspect-video bg-gradient-to-br from-white to-gray-50 border border-gray-200 backdrop-blur-sm">
              {/* Browser-style header */}
              <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-r from-gray-100 to-gray-50 border-b border-gray-200 flex items-center px-4 shadow-sm">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors cursor-pointer"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors cursor-pointer"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors cursor-pointer"></div>
                </div>
                <div className="mx-auto flex items-center bg-white rounded-full px-4 py-1.5 text-xs text-gray-600 border border-gray-200 shadow-sm">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                  free-recording-verse.vercel.app
                </div>
              </div>
              
              {/* App content */}
              <div className="pt-12 flex flex-col" style={{ height: 'calc(100% - 0px)' }}>
                {/* Tab navigation */}
                <div className="flex border-b border-gray-200 bg-white">
                  <div className="px-4 py-3 bg-secondary/10 border-r border-gray-200 flex items-center gap-2 relative cursor-pointer hover:bg-secondary/20 transition-colors">
                    <Monitor className="h-4 w-4 text-secondary" />
                    <span className="text-sm font-medium">Screen</span>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary"></div>
                  </div>
                  <div className="px-4 py-3 border-r border-gray-200 flex items-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors">
                    <Camera className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Camera</span>
                  </div>
                  <div className="px-4 py-3 flex items-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors">
                    <Mic className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Audio</span>
                  </div>
                </div>
                
                {/* Preview area with reflection effect */}
                <div className="flex-1 p-4 bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center min-h-[180px]">
                  <div className="w-full max-w-md aspect-video bg-black rounded-lg shadow-xl flex items-center justify-center relative overflow-hidden">
                    {/* Reflection effect */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-30"></div>
                    
                    <div className="text-center z-10">
                      <div className="bg-black/30 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Monitor className="h-12 w-12 text-white/80" />
                      </div>
                      <p className="text-white/90 font-medium text-lg">Click to select your screen</p>
                      <p className="text-white/60 text-sm mt-2">High quality • No watermark • Free</p>
                    </div>
                  </div>
                </div>
                
                {/* Control panel with enhanced UI */}
                <div className="h-20 bg-gradient-to-r from-gray-50 to-white border-t border-gray-200 flex items-center justify-between px-6 shadow-inner">
                  <div className="flex items-center gap-8">
                    <div className="flex flex-col items-center group">
                      <Button className="h-12 w-12 rounded-full bg-red-500 hover:bg-red-600 shadow-md group-hover:shadow-lg transition-all duration-300">
                        <span className="sr-only">Record</span>
                      </Button>
                      <span className="text-xs font-medium text-gray-600 mt-1 group-hover:text-gray-900 transition-colors">Record</span>
                    </div>
                    
                    <div className="flex flex-col items-center group opacity-70">
                      <Button className="h-10 w-10 rounded-full bg-gray-200 hover:bg-gray-300 shadow-sm group-hover:shadow transition-all" disabled>
                        <Pause className="h-4 w-4" />
                        <span className="sr-only">Pause</span>
                      </Button>
                      <span className="text-xs text-gray-500 mt-1 group-hover:text-gray-700 transition-colors">Pause</span>
                    </div>
                    
                    <div className="flex flex-col items-center group opacity-70">
                      <Button className="h-10 w-10 rounded-full bg-gray-200 hover:bg-gray-300 shadow-sm group-hover:shadow transition-all" disabled>
                        <Square className="h-4 w-4" />
                        <span className="sr-only">Stop</span>
                      </Button>
                      <span className="text-xs text-gray-500 mt-1 group-hover:text-gray-700 transition-colors">Stop</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center bg-gray-100 px-3 py-2 rounded-full shadow-inner">
                    <Clock className="h-4 w-4 text-gray-600 mr-2" />
                    <span className="text-sm font-mono font-medium">00:00:00</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="absolute top-4 right-4 bg-red-600 text-white text-xs uppercase tracking-wider py-1 px-3 rounded-full font-bold shadow-lg animate-pulse">
              Free Forever
            </div>
            
            <div className="absolute -bottom-4 -right-4 bg-white py-2 px-3 rounded-lg shadow-lg border border-gray-200 text-sm font-semibold text-gray-800 flex items-center">
              <Shield className="h-4 w-4 text-green-600 mr-2" />
              100% Private &amp; Secure
            </div>
            
            <div className="absolute -bottom-4 -left-4 bg-white py-2 px-3 rounded-lg shadow-lg border border-gray-200 text-sm font-semibold text-gray-800 flex items-center">
              <Download className="h-4 w-4 text-blue-600 mr-2" />
              Instant Download
            </div>
            
            <div className="absolute hidden md:flex -top-8 -left-8 bg-white py-2 px-3 rounded-lg shadow-lg border border-gray-200 text-sm font-semibold text-gray-800 items-center">
              <Edit className="h-4 w-4 text-purple-600 mr-2" />
              Edit &amp; Annotate
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
