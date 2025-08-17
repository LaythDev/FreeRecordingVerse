import { FC } from 'react';
import { ArrowRight, Monitor, Video, Download, Edit, CheckCircle } from 'lucide-react';

const HowItWorks: FC = () => {
  return (
    <section id="how-it-works" className="py-16 md:py-24 px-6 md:px-10 lg:px-16 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <div className="inline-block bg-secondary/20 text-primary px-4 py-1 rounded-full text-sm font-medium mb-3">
            EASY TO USE
          </div>
          <h3 className="text-2xl md:text-3xl font-bold mb-4 text-gray-800">How It Works</h3>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Create professional-quality recordings in just four simple steps, all for free.
          </p>
        </div>

        <div className="relative">
          <div className="hidden md:block absolute top-20 left-0 right-0 h-1 bg-gray-200">
            <div className="absolute left-1/8 w-3/4 h-full bg-gradient-to-r from-secondary/70 to-secondary"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            <div className="bg-white p-7 rounded-xl shadow-lg border border-gray-200 relative transition-all duration-300 hover:shadow-xl hover:translate-y-[-5px]">
              <div className="w-12 h-12 bg-secondary text-primary text-xl font-bold rounded-full flex items-center justify-center mb-5 mx-auto md:mx-0">
                1
              </div>
              <h4 className="text-lg font-semibold mb-3 text-gray-800 text-center md:text-left">Select Recording Mode</h4>
              <p className="text-gray-600 text-sm">Choose to record your screen, webcam, or audio only. Customize quality settings for your perfect recording.</p>
              <Monitor className="absolute top-7 right-7 h-5 w-5 text-secondary opacity-20 md:opacity-100" />
            </div>

            <div className="bg-white p-7 rounded-xl shadow-lg border border-gray-200 relative transition-all duration-300 hover:shadow-xl hover:translate-y-[-5px]">
              <div className="w-12 h-12 bg-secondary text-primary text-xl font-bold rounded-full flex items-center justify-center mb-5 mx-auto md:mx-0">
                2
              </div>
              <h4 className="text-lg font-semibold mb-3 text-gray-800 text-center md:text-left">Start Recording</h4>
              <p className="text-gray-600 text-sm">Press record and create your content with our easy controls. Use pause/resume or stop when you've finished.</p>
              <Video className="absolute top-7 right-7 h-5 w-5 text-secondary opacity-20 md:opacity-100" />
            </div>

            <div className="bg-white p-7 rounded-xl shadow-lg border border-gray-200 relative transition-all duration-300 hover:shadow-xl hover:translate-y-[-5px]">
              <div className="w-12 h-12 bg-secondary text-primary text-xl font-bold rounded-full flex items-center justify-center mb-5 mx-auto md:mx-0">
                3
              </div>
              <h4 className="text-lg font-semibold mb-3 text-gray-800 text-center md:text-left">Edit Your Recording</h4>
              <p className="text-gray-600 text-sm">Use our built-in editor to trim, add text annotations, arrows, and other helpful visual elements.</p>
              <Edit className="absolute top-7 right-7 h-5 w-5 text-secondary opacity-20 md:opacity-100" />
            </div>

            <div className="bg-white p-7 rounded-xl shadow-lg border border-gray-200 relative transition-all duration-300 hover:shadow-xl hover:translate-y-[-5px]">
              <div className="w-12 h-12 bg-secondary text-primary text-xl font-bold rounded-full flex items-center justify-center mb-5 mx-auto md:mx-0">
                4
              </div>
              <h4 className="text-lg font-semibold mb-3 text-gray-800 text-center md:text-left">Download & Share</h4>
              <p className="text-gray-600 text-sm">Download in WebM, MP4, or GIF format with one click. Your recordings stay private - we never store your content.</p>
              <Download className="absolute top-7 right-7 h-5 w-5 text-secondary opacity-20 md:opacity-100" />
            </div>
          </div>
        </div>
        
        <div className="mt-16 bg-white p-8 rounded-xl shadow-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-1 text-center md:text-left">No Registration</h4>
                <p className="text-gray-600 text-sm text-center md:text-left">Start recording instantly with no account creation or sign-up process.</p>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-1 text-center md:text-left">No Time Limits</h4>
                <p className="text-gray-600 text-sm text-center md:text-left">Record for as long as you need without any artificial time restrictions.</p>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-1 text-center md:text-left">No Watermarks</h4>
                <p className="text-gray-600 text-sm text-center md:text-left">Your recordings are clean and professional with no watermarks or branding.</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-12 flex justify-center">
          <a 
            href="#recorder" 
            className="inline-flex items-center py-3 px-6 bg-secondary text-primary font-medium rounded-lg hover:bg-secondary/90 transition-all shadow-md"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('recorder')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Try It Now - Free Forever
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
