import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface ConfirmationSlideProps {
  onContinue: () => void;
}

// URLs for the public folder images - updated paths
const figmaImageUrls = {
  ellipse10: '/assets/figma/male-vector-1.svg',
  ellipse11: '/assets/figma/male-vector-2.svg',
  ellipse12: '/assets/figma/male-vector-3.svg',
  ellipse13: '/assets/figma/male-vector-4.svg',
  ellipse14: '/assets/figma/male-vector-5.svg',
  ellipse15: '/assets/figma/female-vector-1.svg',
  ellipse16: '/assets/figma/female-vector-2.svg',
  ellipse17: '/assets/figma/female-vector-3.svg',
  ellipse18: '/assets/figma/female-vector-4.svg',
  ellipse19: '/assets/figma/female-vector-5.svg',
};

// Coordinates and sizes are illustrative and will need adjustment for an exact match.
// Based on Figma structure (node 71:1073 and its children)
// For simplicity, using a subset of images and a more structured layout.
const peopleGraphic = [
  { id: 'ellipse10', src: figmaImageUrls.ellipse10, size: 'w-20 h-20', top: '35%', left: '40%', zIndex: 10 }, // Center-ish
  { id: 'ellipse11', src: figmaImageUrls.ellipse11, size: 'w-14 h-14', top: '15%', left: '25%' },
  { id: 'ellipse12', src: figmaImageUrls.ellipse12, size: 'w-14 h-14', top: '30%', left: '65%' },
  { id: 'ellipse13', src: figmaImageUrls.ellipse13, size: 'w-14 h-14', top: '60%', left: '30%' },
  { id: 'ellipse19', src: figmaImageUrls.ellipse19, size: 'w-12 h-12', top: '5%', left: '50%' },
  { id: 'ellipse14', src: figmaImageUrls.ellipse14, size: 'w-12 h-12', top: '55%', left: '60%' },
  { id: 'ellipse15', src: figmaImageUrls.ellipse15, size: 'w-12 h-12', top: '20%', left: '5%' },
];

const ConfirmationSlide: React.FC<ConfirmationSlideProps> = ({ onContinue }) => {
  // Single animation variant for all content
  const contentAnimation = {
    hidden: { opacity: 0, x: 100 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }} // This initial animation is for the slide itself
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.4 }}
      className="bg-lucid-cream h-full flex flex-col text-center"
    >
      {/* Scrollable content area */}
      <motion.div 
        className="flex-1 overflow-y-auto p-4 pt-8"
        initial="hidden"
        animate="visible"
        variants={contentAnimation} // Apply shared animation to this container
      >
        {/* Logo and back button would go here in a real implementation */}
        
        <div className="max-w-md mx-auto flex flex-col items-center">
          <h2 className="text-[28px] font-medium text-[#191825] whitespace-nowrap mt-8">
            Over 1,000,000 people
          </h2>
          <p className="text-[18px] font-medium text-[#191825] mb-4">
            have chosen Lucid
          </p>
          
          <div className="w-full flex justify-center items-center mb-6">
            <img 
              src="/assets/image.png"
              alt="People Circles" 
              className="w-4/5 max-h-[45vh] object-contain" 
              style={{ background: 'transparent' }}
            />
          </div>
        </div>
      </motion.div>
      
      {/* Continue Button */}
      <motion.div 
        className="flex-shrink-0 p-4 bg-lucid-cream continue-button-container"
        initial="hidden"
        animate="visible"
        variants={contentAnimation} // Apply shared animation to the button container as well
      >
        <button
          onClick={onContinue}
          type="button"
          className="w-full bg-lucid-dark text-lucid-cream py-3 rounded-full font-semibold text-lg"
        >
          Continue
        </button>
      </motion.div>
    </motion.div>
  );
};

export default ConfirmationSlide; 