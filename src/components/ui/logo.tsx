import React, { useState } from 'react';
import { Plane } from 'lucide-react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textClassName?: string;
}

const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  textClassName = ''
}) => {
  const [imageError, setImageError] = useState(false);
  
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };
  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const logoPath = '/piloto de drones-logo.png';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {!imageError ? (
        <img 
          src={logoPath} 
          alt="Piloto de Drones" 
          className={`${sizeClasses[size]} object-contain flex-shrink-0 w-auto`}
          style={{ 
            imageRendering: 'auto',
            maxWidth: '100%',
            height: 'auto'
          }}
          onError={() => {
            setImageError(true);
            console.error('Error loading logo:', logoPath);
          }}
        />
      ) : (
        <div className={`${sizeClasses[size]} flex items-center justify-center bg-accent/10 rounded-lg flex-shrink-0`}>
          <Plane className={`${sizeClasses[size]} text-accent`} />
        </div>
      )}
      {showText && (
        <span className={`font-bold text-primary ${textSizeClasses[size]} ${textClassName}`}>
          Piloto de Drones
        </span>
      )}
    </div>
  );
};

export default Logo;