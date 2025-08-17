import { FC } from 'react';
import { Video } from 'lucide-react';

interface HeaderProps {
  toggleMobileMenu: () => void;
}

const Header: FC<HeaderProps> = ({ toggleMobileMenu }) => {
  return (
    <header className="py-4 px-6 md:px-10 lg:px-16 border-b border-gray-100 bg-white shadow-soft flex justify-between items-center">
      <div className="flex items-center gap-2">
        <Video className="text-secondary h-6 w-6" />
        <h1 className="text-xl md:text-2xl font-display font-bold">Free Recording Verse</h1>
      </div>
      
      <nav className="hidden md:flex items-center gap-8">
        <a href="#features" className="text-primary hover:text-secondary transition-colors">Features</a>
        <a href="#how-it-works" className="text-primary hover:text-secondary transition-colors">How It Works</a>
        <a href="#faq" className="text-primary hover:text-secondary transition-colors">FAQ</a>
      </nav>
      
      <button 
        className="block md:hidden text-primary"
        onClick={toggleMobileMenu}
        aria-label="Toggle mobile menu"
        data-mobile-menu
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </header>
  );
};

export default Header;
