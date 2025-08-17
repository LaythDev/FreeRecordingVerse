import { FC } from 'react';

interface MobileMenuProps {
  isOpen: boolean;
}

const MobileMenu: FC<MobileMenuProps> = ({ isOpen }) => {
  return (
    <div 
      className={`${isOpen ? 'block' : 'hidden'} bg-white absolute top-16 left-0 right-0 z-50 py-4 px-6 shadow-medium`}
      data-mobile-menu
    >
      <nav className="flex flex-col gap-4">
        <a href="#features" className="text-primary py-2 border-b border-gray-100">Features</a>
        <a href="#how-it-works" className="text-primary py-2 border-b border-gray-100">How It Works</a>
        <a href="#faq" className="text-primary py-2">FAQ</a>
      </nav>
    </div>
  );
};

export default MobileMenu;
