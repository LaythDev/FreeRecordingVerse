import { FC } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'Is this screen recorder really 100% free?',
    answer: 'Yes! Our screen recorder is completely free with no restrictions, hidden fees, or subscriptions. You don\'t need to create an account or provide payment information. All features are available at no cost, and there are no watermarks on your recordings.'
  },
  {
    question: 'Where are my recordings stored?',
    answer: 'Your recordings are never uploaded to any servers - they stay on your device until you download them. Once you download your recording, you have complete control over it. If you refresh or close the page before downloading, recordings are permanently deleted from temporary memory.'
  },
  {
    question: 'Which browsers support screen recording?',
    answer: 'Our screen recorder works best on Chrome, Firefox, Edge, and Opera. Safari has limited support for some features. For the best experience with all features, we recommend using Google Chrome or Microsoft Edge.'
  },
  {
    question: 'Is there a time limit for recordings?',
    answer: 'There are no artificial time limits imposed by our software. Recording length is only limited by your device\'s available memory. Most modern computers can record 1-2 hours without issues. For longer recordings, we recommend downloading your current recording and starting a new session.'
  },
  {
    question: 'Can I record system audio and my microphone at the same time?',
    answer: 'Yes, you can record both system audio and microphone input simultaneously on Chrome and Edge browsers. When you start a screen recording, make sure to select "Share audio" when prompted during screen selection, and enable the microphone option in our settings panel.'
  },
  {
    question: 'What recording quality options are available?',
    answer: 'You can choose from multiple quality settings: 480p (SD), 720p (HD), or 1080p (Full HD). You can also select your frame rate (24, 30, or 60 FPS) to balance between quality and file size. Higher quality and frame rates will result in larger file sizes.'
  },
  {
    question: 'What file formats can I save my recordings in?',
    answer: 'You can download your recordings as WebM (highest quality) by default. We also offer export options for MP4 (widely compatible) and GIF (for short clips that need to be easily shared). All export options are completely free.'
  },
  {
    question: 'Can I edit my recordings after capturing them?',
    answer: 'Yes! After completing a recording, you can use our built-in editor to trim your video, add text annotations, draw arrows or highlights, and more. All editing features are available at no cost and require no additional software.'
  },
  {
    question: 'Will my recordings have a watermark?',
    answer: 'Absolutely not. Unlike many free screen recorders, we never add watermarks to your videos. Your recordings are yours to use however you want, without any branding or restrictions.'
  },
  {
    question: 'Can I use this screen recorder on my mobile device?',
    answer: 'While our interface is mobile-responsive, screen recording capabilities on mobile devices are limited by browser support. For full screen recording on mobile, we recommend using your device\'s built-in screen recording feature.'
  }
];

const FAQ: FC = () => {
  return (
    <section id="faq" className="py-12 md:py-20 px-6 md:px-10 lg:px-16 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-block bg-secondary/20 text-primary px-4 py-1 rounded-full text-sm font-medium mb-3">
            QUESTIONS & ANSWERS
          </div>
          <h3 className="text-2xl md:text-3xl font-bold mb-4 text-gray-800">Frequently Asked Questions</h3>
          <p className="text-gray-600 max-w-2xl mx-auto">Everything you need to know about our free screen recorder</p>
        </div>

        <div className="space-y-4">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="border border-gray-100 rounded-lg overflow-hidden mb-4 shadow-sm hover:shadow-md transition-shadow bg-white"
              >
                <AccordionTrigger className="px-4 py-4 hover:bg-gray-50 transition-colors font-medium text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="px-4 py-4 bg-gray-50 border-t border-gray-100 text-gray-700">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-6">Still have questions?</p>
          <a href="#recorder" className="inline-flex items-center justify-center py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('recorder')?.scrollIntoView({ behavior: 'smooth' });
            }}>
            Try it for yourself
          </a>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
