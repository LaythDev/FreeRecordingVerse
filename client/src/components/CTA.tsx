import { FC } from 'react';
import { Button } from '@/components/ui/button';
import { Video, CheckCircle, ArrowRight } from 'lucide-react';

interface CTAProps {
  scrollToRecorder: () => void;
}

const CTA: FC<CTAProps> = ({ scrollToRecorder }) => {
  return (
    <section className="py-16 md:py-24 px-6 md:px-10 lg:px-16 bg-gradient-to-br from-primary to-primary/90">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <h3 className="text-2xl md:text-3xl xl:text-4xl font-bold mb-6 text-white">Ready to Create Professional Recordings Easily?</h3>
            <p className="text-gray-100 text-lg mb-8">
              Our free screen recorder gives you all the professional tools you need - with no downloads, 
              no sign-ups, and absolutely no restrictions.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-300 flex-shrink-0" />
                <span className="text-white">No watermarks</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-300 flex-shrink-0" />
                <span className="text-white">No time limits</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-300 flex-shrink-0" />
                <span className="text-white">No sign-up required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-300 flex-shrink-0" />
                <span className="text-white">No installation needed</span>
              </div>
            </div>
            
            <Button 
              onClick={scrollToRecorder}
              className="bg-white text-primary hover:bg-gray-100 py-7 px-8 rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-lg text-lg"
            >
              <Video className="h-5 w-5" />
              Start Recording Free
              <ArrowRight className="ml-1 h-5 w-5" />
            </Button>
          </div>
          
          <div className="bg-white/10 rounded-2xl p-6 border border-white/20 backdrop-blur-sm text-white">
            <h4 className="text-xl font-semibold mb-6 flex items-center">
              <span className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white mr-3 text-sm">
                <CheckCircle className="h-5 w-5" />
              </span>
              What our users say
            </h4>
            
            <div className="space-y-6">
              <div className="bg-white/5 border border-white/10 p-4 rounded-lg">
                <p className="italic mb-3">"This is the best free screen recorder I've found. No watermarks, no time limits, and the built-in editor is fantastic!"</p>
                <div className="text-sm text-gray-300">— Sarah K., Content Creator</div>
              </div>
              
              <div className="bg-white/5 border border-white/10 p-4 rounded-lg">
                <p className="italic mb-3">"I love that I can record my screen without downloading any software or creating an account. So simple and effective."</p>
                <div className="text-sm text-gray-300">— Michael T., Teacher</div>
              </div>
              
              <div className="bg-white/5 border border-white/10 p-4 rounded-lg">
                <p className="italic mb-3">"The video quality is amazing and I can export in different formats. All for free? Incredible!"</p>
                <div className="text-sm text-gray-300">— Jamie R., Software Developer</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
