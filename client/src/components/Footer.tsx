import { FC } from 'react';
import { Video, Mail, Heart, Shield, Download, Monitor, Camera, Mic, Edit, Share2 } from 'lucide-react';
import { FaTwitter, FaGithub, FaLinkedin, FaYoutube, FaDiscord } from 'react-icons/fa';

const Footer: FC = () => {
  return (
    <footer className="py-16 px-6 md:px-10 lg:px-16 bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-12">
          <div className="md:col-span-4">
            <div className="flex items-center gap-2 mb-5">
              <Video className="text-secondary h-7 w-7" />
              <h2 className="text-2xl font-bold">Screen Recorder</h2>
            </div>
            <p className="text-gray-400 mb-6">
              The most powerful free screen recorder with no limits. Create and edit professional recordings without signup, 
              installation, watermarks, or time restrictions.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-gray-400 hover:text-secondary transition-colors">
                <FaTwitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-secondary transition-colors">
                <FaGithub className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-secondary transition-colors">
                <FaLinkedin className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-secondary transition-colors">
                <FaYoutube className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-secondary transition-colors">
                <FaDiscord className="h-5 w-5" />
              </a>
            </div>
          </div>
          
          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold mb-4">Recording</h3>
            <ul className="space-y-3">
              <li>
                <a href="#recorder" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-secondary" />
                  <span>Screen</span>
                </a>
              </li>
              <li>
                <a href="#recorder" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                  <Camera className="h-4 w-4 text-secondary" />
                  <span>Camera</span>
                </a>
              </li>
              <li>
                <a href="#recorder" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                  <Mic className="h-4 w-4 text-secondary" />
                  <span>Audio</span>
                </a>
              </li>
              <li>
                <a href="#features" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                  <Edit className="h-4 w-4 text-secondary" />
                  <span>Editor</span>
                </a>
              </li>
              <li>
                <a href="#features" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-secondary" />
                  <span>Export</span>
                </a>
              </li>
            </ul>
          </div>
          
          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold mb-4">Learn More</h3>
            <ul className="space-y-3">
              <li><a href="#how-it-works" className="text-gray-400 hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a></li>
              <li><a href="#faq" className="text-gray-400 hover:text-white transition-colors">FAQ</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Terms</a></li>
            </ul>
          </div>
          
          <div className="md:col-span-4">
            <h3 className="text-lg font-semibold mb-4">Why Use Our Screen Recorder?</h3>
            <ul className="space-y-4">
              <li className="flex gap-3">
                <Shield className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-white font-medium block mb-1">100% Private & Secure</span>
                  <span className="text-gray-400 text-sm">Your recordings stay on your device - we never store or access your content.</span>
                </div>
              </li>
              <li className="flex gap-3">
                <Download className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-white font-medium block mb-1">Instant Downloads</span>
                  <span className="text-gray-400 text-sm">Export your recordings in multiple formats instantly with one click.</span>
                </div>
              </li>
            </ul>
            
            <div className="mt-6 pt-6 border-t border-gray-800">
              <a href="#recorder" className="bg-secondary/20 text-secondary hover:bg-secondary/30 transition-all rounded-lg py-3 px-4 inline-flex items-center gap-2 text-sm font-medium"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('recorder')?.scrollIntoView({ behavior: 'smooth' });
                }}>
                <Video className="h-4 w-4" />
                Try It Free - No Sign Up
              </a>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm mb-4 md:mb-0">
            © {new Date().getFullYear()} Free Screen Recorder. All rights reserved.
          </p>
          <p className="text-gray-400 text-sm flex items-center">
            Made with <Heart className="h-4 w-4 text-red-500 mx-1" /> for creators, teachers, and professionals worldwide
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
