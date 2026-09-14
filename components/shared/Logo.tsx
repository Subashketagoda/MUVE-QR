import React from 'react'

interface LogoProps {
  variant?: 'light' | 'dark' | 'full'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showSubtitle?: boolean
  subtitleText?: string
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'dark',
  size = 'md',
  showSubtitle = true,
  subtitleText = 'COLOMBO',
}) => {
  // Height sizing
  const heightMap = {
    sm: 32,
    md: 42,
    lg: 56,
    xl: 72,
  }

  const h = heightMap[size]

  return (
    <div className="inline-flex items-center gap-3 select-none">
      <svg
        height={h}
        viewBox="0 0 320 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-auto max-w-full"
        style={{ height: `${h}px` }}
      >
        {/* Chevron Icon Roof above U */}
        <path
          d="M102 38 L124 20 L146 38 L146 26 L124 8 L102 26 Z"
          fill="#D4FC04"
        />

        {/* MUVE Typography */}
        {/* M */}
        <path
          d="M20 46 H40 L54 82 L68 46 H88 V104 H70 V72 L58 104 H50 L38 72 V104 H20 V46 Z"
          fill={variant === 'light' ? '#FFFFFF' : '#FFFFFF'}
        />
        {/* U */}
        <path
          d="M96 46 H114 V84 C114 92 120 96 125 96 C130 96 136 92 136 84 V46 H154 V84 C154 100 142 106 125 106 C108 106 96 100 96 84 V46 Z"
          fill={variant === 'light' ? '#FFFFFF' : '#FFFFFF'}
        />
        {/* V */}
        <path
          d="M162 46 H182 L196 90 L210 46 H230 L206 104 H186 L162 46 Z"
          fill={variant === 'light' ? '#FFFFFF' : '#FFFFFF'}
        />
        {/* E */}
        <path
          d="M238 46 H286 V62 H256 V68 H282 V82 H256 V88 H286 V104 H238 V46 Z"
          fill={variant === 'light' ? '#FFFFFF' : '#FFFFFF'}
        />

        {/* Subtitle COLOMBO with underline */}
        {showSubtitle && (
          <>
            <text
              x="20"
              y="120"
              fontSize="24"
              fontWeight="900"
              letterSpacing="3"
              fill="#D4FC04"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              {subtitleText}
            </text>
            <line
              x1="160"
              y1="114"
              x2="286"
              y2="114"
              stroke="#D4FC04"
              strokeWidth="4"
            />
          </>
        )}
      </svg>
    </div>
  )
}
