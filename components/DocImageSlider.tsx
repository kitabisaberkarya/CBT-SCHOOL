import React, { useState, useEffect } from 'react';

interface DocImageSliderProps {
  images?: string[];
  title: string;
  onImageClick?: (url: string) => void;
}

const DocImageSlider: React.FC<DocImageSliderProps> = ({ images = [], title, onImageClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const safeImages = images || [];

  useEffect(() => {
    if (safeImages.length <= 1) return; // Don't slide if only 1 image

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % safeImages.length);
    }, 3000); // 3 Seconds slide interval

    return () => clearInterval(interval);
  }, [safeImages.length]);

  return (
    <div className="w-full h-full relative overflow-hidden group bg-slate-900">
      {safeImages.map((img, index) => (
        <div
          key={index}
          className={`absolute inset-0 w-full h-full transition-all duration-700 ease-in-out transform ${onImageClick ? 'cursor-zoom-in' : ''}`}
          onClick={() => onImageClick && onImageClick(img)}
          style={{
            opacity: index === currentIndex ? 1 : 0,
            transform: `translateX(${index === currentIndex ? '0%' : '10%'}) scale(${index === currentIndex ? '1' : '1.1'})`,
            zIndex: index === currentIndex ? 10 : 0
          }}
        >
          <img 
            src={img} 
            alt={`${title} - slide ${index + 1}`} 
            className="w-full h-full object-cover" 
          />
          {/* Overlay gradient for text readability if needed, currently kept subtle */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent"></div>
        </div>
      ))}

      {/* Slide Indicators (Dots) */}
      {safeImages.length > 1 && (
        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-1.5 z-20">
          {safeImages.map((_, index) => (
            <div
              key={index}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'bg-white w-4' 
                  : 'bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DocImageSlider;
