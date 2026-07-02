import React from 'react';
import logoUrl from '../assets/images/logo_degres_1782422728938.jpg';

interface LogoProps {
  className?: string;
  lightMode?: boolean; // true for styled overlay, false for white/light containers
}

export default function DgDegresLogo({ className = "h-14", lightMode = false }: LogoProps) {
  return (
    <img 
      id="dg-degres-img-logo"
      src={logoUrl} 
      alt="DG DEGRES" 
      className={`${className} select-none object-contain ${
        lightMode ? 'mix-blend-screen' : 'invert mix-blend-multiply'
      }`}
      referrerPolicy="no-referrer"
    />
  );
}
