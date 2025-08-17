import { FC } from 'react';
import { Monitor, Camera, Mic, Settings, Download, Shield, Edit, Zap, Paintbrush, Clock, Globe, Smartphone } from 'lucide-react';

interface Feature {
  icon: JSX.Element;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: <Monitor className="h-6 w-6 text-secondary" />,
    title: 'HD Screen Recording',
    description: 'Capture your entire screen, application window, or browser tab with crystal-clear quality up to 1080p resolution.'
  },
  {
    icon: <Camera className="h-6 w-6 text-secondary" />,
    title: 'Webcam Recording',
    description: 'Use your webcam to record professional videos with customizable resolution and frame rate settings.'
  },
  {
    icon: <Mic className="h-6 w-6 text-secondary" />,
    title: 'Audio Recording',
    description: 'Create podcasts, voice notes, or music recordings with crystal-clear audio capture from your microphone.'
  },
  {
    icon: <Edit className="h-6 w-6 text-secondary" />,
    title: 'Video Editing Tools',
    description: 'Edit your recordings with intuitive tools for trimming, adding text annotations, drawing, and highlighting important content.'
  },
  {
    icon: <Download className="h-6 w-6 text-secondary" />,
    title: 'Multiple Export Formats',
    description: 'Download your recordings in WebM, MP4, or GIF formats to suit your specific needs without any fees.'
  },
  {
    icon: <Shield className="h-6 w-6 text-secondary" />,
    title: 'Complete Privacy',
    description: 'Your security matters - all recordings stay on your device. We never upload or store your content on any servers.'
  }
];

const Features: FC = () => {
  return (
    <section id="features" className="py-12 md:py-20 px-6 md:px-10 lg:px-16 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-block bg-secondary/20 text-primary px-4 py-1 rounded-full text-sm font-medium mb-3">
            POWERFUL & FREE
          </div>
          <h3 className="text-2xl md:text-3xl font-bold mb-4 text-gray-800">
            Professional Features, Zero Cost
          </h3>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            All the tools you need for professional-quality screen recording, without any subscriptions or hidden fees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 transition-all hover:shadow-xl hover:border-secondary/30 hover:translate-y-[-5px]"
            >
              <div className="w-14 h-14 bg-primary/5 rounded-lg flex items-center justify-center mb-5 border border-gray-100">
                {feature.icon}
              </div>
              <h4 className="text-xl font-semibold mb-3 text-gray-800">{feature.title}</h4>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
        
        <div className="mt-16 bg-white p-8 rounded-xl shadow-lg border border-gray-200">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h4 className="text-xl font-bold text-gray-800 mb-2">Ready to start recording?</h4>
              <p className="text-gray-600">No downloads, no signups, completely free to use - forever.</p>
            </div>
            <a 
              href="#recorder" 
              className="inline-flex items-center justify-center py-3 px-6 bg-secondary text-primary font-medium rounded-lg hover:bg-secondary/90 transition-all"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('recorder')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Try Free Screen Recorder
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
