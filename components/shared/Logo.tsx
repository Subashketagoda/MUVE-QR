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
  subtitleText = 'COLOMBO',
  className = '',
}) => {
  // Height and Width dimensions
  const dimensionMap = {
    sm: { img: 36, text: 'text-base', sub: 'text-[9px]' },
    md: { img: 48, text: 'text-lg', sub: 'text-[10px]' },
    lg: { img: 68, text: 'text-2xl', sub: 'text-xs' },
    xl: { img: 88, text: 'text-3xl', sub: 'text-sm' },
  }

  const { img, text, sub } = dimensionMap[size]

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* 3D App Emblem */}
      <div 
        className="relative overflow-hidden rounded-xl shadow-lg border border-[#D4FC04]/40 flex-shrink-0 bg-[#050D1A] group transition-transform duration-200 hover:scale-105"
        style={{ width: `${img}px`, height: `${img}px` }}
      >
        <Image
          src="/logo.png"
          alt="MUVE QR Logo"
          width={img * 2}
          height={img * 2}
          className="w-full h-full object-cover"
          priority
        />
      </div>

      {/* Brand Typography & Subtitle */}
      {showSubtitle && (
        <div className="flex flex-col justify-center text-left">
          <div className="flex items-center gap-1.5">
            <span className={`font-black tracking-wider leading-tight ${text} ${variant === 'light' ? 'text-slate-900' : 'text-white'}`}>
              MUVE <span className="text-[#D4FC04]">QR</span>
            </span>
          </div>
          {subtitleText && (
            <span className={`font-extrabold tracking-[0.25em] text-[#D4FC04] uppercase leading-none mt-0.5 ${sub}`}>
              {subtitleText}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
