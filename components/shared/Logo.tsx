'use client'

import React from 'react'
import Image from 'next/image'

interface LogoProps {
  variant?: 'light' | 'dark' | 'full'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showSubtitle?: boolean
  subtitleText?: string
  className?: string
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'dark',
  size = 'md',
  showSubtitle = true,
  subtitleText,
  className = '',
}) => {
  // Height dimensions for the logo image
  const heightMap = {
    sm: 36,
    md: 48,
    lg: 68,
    xl: 88,
  }

  const subtitleSizeMap = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
    xl: 'text-sm',
  }

  const imgH = heightMap[size]
  // The logo image is square (roughly 1:1), give it a bit of width room
  const imgW = Math.round(imgH * 1.1)

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      {/* MUVE COLOMBO logo image */}
      <div
        className="relative flex-shrink-0 rounded-lg overflow-hidden"
        style={{ width: `${imgW}px`, height: `${imgH}px` }}
      >
        <Image
          src="/muve-logo.jpg"
          alt="MUVE COLOMBO"
          width={imgW * 2}
          height={imgH * 2}
          className="w-full h-full object-contain"
          priority
        />
      </div>

      {/* Optional extra subtitle label below the image logo */}
      {showSubtitle && subtitleText && (
        <span
          className={`font-extrabold tracking-[0.2em] uppercase leading-none ${subtitleSizeMap[size]} ${
            variant === 'light' ? 'text-slate-700' : 'text-[#D4FC04]'
          }`}
        >
          {subtitleText}
        </span>
      )}
    </div>
  )
}
