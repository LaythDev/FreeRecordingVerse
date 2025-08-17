import { useEffect, useRef } from 'react';
import Header from '@/components/Header';
import MobileMenu from '@/components/MobileMenu';
import Hero from '@/components/Hero';
import ProfessionalScreenRecorder from '@/components/ProfessionalScreenRecorder';
import Features from '@/components/Features';
import HowItWorks from '@/components/HowItWorks';
import FAQ from '@/components/FAQ';
import CTA from '@/components/CTA';
import Footer from '@/components/Footer';
import { useState } from 'react';
import { Toaster } from '@/components/ui/toaster';

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const recorderRef = useRef<HTMLDivElement>(null);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(prev => !prev);
  };

  const scrollToRecorder = () => {
    recorderRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Close mobile menu when clicking outside or when window is resized
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (mobileMenuOpen && !(e.target as Element).closest('[data-mobile-menu]')) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-white text-gray-800">
      <Header toggleMobileMenu={toggleMobileMenu} />
      <MobileMenu isOpen={mobileMenuOpen} />
      
      <main>
        <Hero scrollToRecorder={scrollToRecorder} />
        <div id="recorder" ref={recorderRef} className="bg-gray-50 py-8 md:py-16 px-4 md:px-0">
          <div className="container mx-auto">
            <h2 className="text-4xl font-bold text-center mb-8">Free Screen Recorder</h2>
            <p className="text-center text-gray-600 max-w-2xl mx-auto mb-12">
              Record your screen, camera, or audio with our powerful screen recorder. 
              No sign up, no time limits, no watermarks - completely free!
            </p>
            <ProfessionalScreenRecorder />
          </div>
        </div>
        <Features />
        <HowItWorks />
        <CTA scrollToRecorder={scrollToRecorder} />
        <FAQ />
      </main>
      
      <Footer />
      <Toaster />
    </div>
  );
}