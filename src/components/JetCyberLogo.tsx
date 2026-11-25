import React from 'react';

interface JetCyberLogoProps {
  variant?: 'full' | 'icon-only' | 'horizontal';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'light' | 'dark';
  className?: string;
}

export const JetCyberLogo: React.FC<JetCyberLogoProps> = ({
  variant = 'full',
  size = 'md',
  theme = 'light',
  className = ''
}) => {
  const pixelSizes = {
    sm: { w: 42, h: 42 },
    md: { w: 72, h: 72 },
    lg: { w: 120, h: 120 },
    xl: { w: 180, h: 180 },
  };

  const currentDim = pixelSizes[size] || pixelSizes.md;
  const textColor = theme === 'dark' ? '#FFFFFF' : '#000000';

  // Exact 1:1 Vector Icon matching user's official Jet Cyber Network logo
  const ExactMark = (
    <svg
      width={currentDim.w}
      height={currentDim.h}
      viewBox="0 0 400 340"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 select-none drop-shadow-2xs"
    >
      {/* 1. BLACK FIBER OPTIC CABLE BODY */}
      {/* Outer thick swoosh wrapping under the globe */}
      <path
        d="M 102 188 
           C 85 228, 115 272, 168 285 
           C 230 298, 308 262, 324 195 
           C 334 150, 318 102, 268 65 
           C 250 52, 225 48, 208 50 
           C 235 58, 276 86, 288 126 
           C 302 176, 252 238, 186 240 
           C 134 240, 102 210, 102 188 Z"
        fill="#0A0E17"
      />

      <path
        d="M 98 185 
           C 80 226, 112 272, 164 286 
           C 228 300, 312 265, 328 194 
           C 340 144, 316 95, 268 62 
           C 285 75, 302 94, 310 118 
           C 326 162, 318 218, 274 252 
           C 230 286, 160 282, 118 248 
           C 106 238, 98 222, 98 185 Z"
        fill="#0A0E17"
      />

      {/* BOTTOM-LEFT CABLE SLEEVE & FIBERS */}
      {/* Cable cut head */}
      <g transform="translate(-4, 0)">
        <ellipse cx="114" cy="196" rx="26" ry="16" transform="rotate(-30 114 196)" fill="#0A0E17" />
        <ellipse cx="114" cy="196" rx="23" ry="13" transform="rotate(-30 114 196)" fill="#FFFFFF" stroke="#0A0E17" strokeWidth="3.5" />
        <ellipse cx="114" cy="196" rx="15" ry="8" transform="rotate(-30 114 196)" fill="#FFFFFF" stroke="#0A0E17" strokeWidth="2.5" />

        {/* 3 Fiber Strands sticking out to the upper-left */}
        {/* Strand 1 (Left) */}
        <line x1="102" y1="188" x2="78" y2="152" stroke="#0A0E17" strokeWidth="4" strokeLinecap="round" />
        <circle cx="76" cy="148" r="6.5" fill="#FFFFFF" stroke="#0A0E17" strokeWidth="3.5" />

        {/* Strand 2 (Middle, Tallest) */}
        <line x1="113" y1="184" x2="90" y2="126" stroke="#0A0E17" strokeWidth="4" strokeLinecap="round" />
        <circle cx="88" cy="120" r="6.5" fill="#FFFFFF" stroke="#0A0E17" strokeWidth="3.5" />

        {/* Strand 3 (Right) */}
        <line x1="125" y1="188" x2="112" y2="145" stroke="#0A0E17" strokeWidth="4" strokeLinecap="round" />
        <circle cx="110" cy="139" r="6.5" fill="#FFFFFF" stroke="#0A0E17" strokeWidth="3.5" />
      </g>

      {/* 2. SOLID VIBRANT BLUE GLOBE (CENTER) */}
      <circle cx="210" cy="165" r="90" fill="#1371EE" />

      {/* Network Lines on the Globe (White Grid + Nodes) */}
      <g>
        {/* Main longitudinal central oval */}
        <ellipse cx="196" cy="165" rx="42" ry="90" fill="none" stroke="#FFFFFF" strokeWidth="3.2" transform="rotate(-12 210 165)" />
        {/* Side longitudinal ellipse */}
        <ellipse cx="228" cy="165" rx="28" ry="90" fill="none" stroke="#FFFFFF" strokeWidth="2.8" transform="rotate(12 210 165)" />

        {/* Diagonal wireframe arc 1 */}
        <path d="M 132 126 C 172 115, 255 158, 290 205" fill="none" stroke="#FFFFFF" strokeWidth="3.2" />
        {/* Equatorial arc */}
        <path d="M 136 205 C 182 230, 246 218, 292 180" fill="none" stroke="#FFFFFF" strokeWidth="3" />
        {/* Upper contour arc */}
        <path d="M 162 90 C 200 114, 256 118, 296 140" fill="none" stroke="#FFFFFF" strokeWidth="2.8" />
        {/* Lower curve */}
        <path d="M 166 235 C 205 248, 248 244, 276 226" fill="none" stroke="#FFFFFF" strokeWidth="2.8" />

        {/* Intersecting White Nodes (Solid dots) */}
        <circle cx="170" cy="94" r="6" fill="#FFFFFF" />
        <circle cx="148" cy="144" r="6.5" fill="#FFFFFF" />
        <circle cx="196" cy="118" r="6.5" fill="#FFFFFF" />
        <circle cx="186" cy="208" r="6.5" fill="#FFFFFF" />
        <circle cx="260" cy="162" r="6" fill="#FFFFFF" />
        <circle cx="274" cy="210" r="5.5" fill="#FFFFFF" />
      </g>

      {/* TOP-RIGHT CABLE SLEEVE & FIBERS */}
      <g transform="translate(18, -4)">
        <ellipse cx="292" cy="100" rx="26" ry="16" transform="rotate(32 292 100)" fill="#0A0E17" />
        <ellipse cx="292" cy="100" rx="23" ry="13" transform="rotate(32 292 100)" fill="#FFFFFF" stroke="#0A0E17" strokeWidth="3.5" />
        <ellipse cx="292" cy="100" rx="15" ry="8" transform="rotate(32 292 100)" fill="#FFFFFF" stroke="#0A0E17" strokeWidth="2.5" />

        {/* 4 Fiber Strands sticking out to the upper-right */}
        {/* Strand 1 (Highest) */}
        <line x1="292" y1="88" x2="310" y2="48" stroke="#0A0E17" strokeWidth="4" strokeLinecap="round" />
        <circle cx="313" cy="42" r="6.5" fill="#FFFFFF" stroke="#0A0E17" strokeWidth="3.5" />

        {/* Strand 2 */}
        <line x1="302" y1="94" x2="332" y2="64" stroke="#0A0E17" strokeWidth="4" strokeLinecap="round" />
        <circle cx="336" cy="59" r="6.5" fill="#FFFFFF" stroke="#0A0E17" strokeWidth="3.5" />

        {/* Strand 3 */}
        <line x1="308" y1="105" x2="350" y2="92" stroke="#0A0E17" strokeWidth="4" strokeLinecap="round" />
        <circle cx="355" cy="90" r="6.5" fill="#FFFFFF" stroke="#0A0E17" strokeWidth="3.5" />

        {/* Strand 4 (Lowest) */}
        <line x1="305" y1="114" x2="340" y2="125" stroke="#0A0E17" strokeWidth="4" strokeLinecap="round" />
        <circle cx="345" cy="127" r="6.5" fill="#FFFFFF" stroke="#0A0E17" strokeWidth="3.5" />
      </g>
    </svg>
  );

  if (variant === 'icon-only') {
    return <div className={`inline-flex items-center justify-center ${className}`}>{ExactMark}</div>;
  }

  if (variant === 'horizontal') {
    return (
      <div className={`flex items-center gap-3 select-none ${className}`}>
        {ExactMark}
        <div className="flex flex-col">
          <span 
            className="text-base font-black tracking-wide uppercase leading-tight font-sans"
            style={{ color: textColor }}
          >
            JET CYBER NETWORK
          </span>
          <span 
            className="text-[9px] font-bold uppercase tracking-[0.32em] mt-0.5"
            style={{ color: textColor, opacity: 0.9 }}
          >
            REACH WITHOUT LIMITS
          </span>
        </div>
      </div>
    );
  }

  // Exact 1:1 Full Logo (Centered Icon + Exact Typography)
  return (
    <div className={`flex flex-col items-center text-center select-none ${className}`}>
      <div className="mb-2">
        {ExactMark}
      </div>
      <div 
        className="text-xl sm:text-2xl font-black tracking-wider uppercase leading-tight font-sans"
        style={{ color: textColor }}
      >
        JET CYBER NETWORK
      </div>
      <div 
        className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.34em] mt-1"
        style={{ color: textColor, opacity: 0.85 }}
      >
        REACH WITHOUT LIMITS
      </div>
    </div>
  );
};
