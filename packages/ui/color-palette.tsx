'use client'

import { useEffect, useState } from 'react'
import styles from './case-layout.module.css'

interface ColorPaletteProps {
  imageUrl: string
}

export function ColorPalette({ imageUrl }: ColorPaletteProps) {
  const [colors, setColors] = useState<string[]>([])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!imageUrl) return
    
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.src = imageUrl
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        
        canvas.width = 50
        canvas.height = 50
        ctx.drawImage(img, 0, 0, 50, 50)
        
        const imageData = ctx.getImageData(0, 0, 50, 50).data
        const colorCounts: Record<string, number> = {}
        
        // Sample pixels
        for (let i = 0; i < imageData.length; i += 4) {
          const r = imageData[i]
          const g = imageData[i+1]
          const b = imageData[i+2]
          const a = imageData[i+3]
          
          if (a < 200) continue // Skip transparent pixels
          
          // Quantize color to group similar colors (reduce color space)
          const qr = Math.round(r / 16) * 16
          const qg = Math.round(g / 16) * 16
          const qb = Math.round(b / 16) * 16
          
          const rgbHex = rgbToHex(qr, qg, qb)
          
          // Avoid pure white, black, or gray unless they are very dominant
          const isMonochrome = Math.abs(qr - qg) < 20 && Math.abs(qg - qb) < 20
          const weight = isMonochrome ? 0.3 : 1.0
          
          colorCounts[rgbHex] = (colorCounts[rgbHex] || 0) + weight
        }
        
        // Sort and select top colors
        const sortedColors = Object.keys(colorCounts)
          .sort((a, b) => colorCounts[b] - colorCounts[a])
          .slice(0, 5)
        
        if (sortedColors.length >= 3) {
          setColors(sortedColors)
        } else {
          setColors(getFallbackPalette(imageUrl))
        }
      } catch (err) {
        // CORS or other canvas errors -> fallback to a beautiful palette based on image url hash
        setColors(getFallbackPalette(imageUrl))
      }
    }
    
    img.onerror = () => {
      setColors(getFallbackPalette(imageUrl))
    }
  }, [imageUrl])

  const handleCopy = (color: string, index: number) => {
    navigator.clipboard.writeText(color).then(() => {
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 1500)
    })
  }

  if (colors.length === 0) return null

  return (
    <div className={styles.paletteSection}>
      <span className={styles.paletteTitle}>
        🎨 提取色彩灵感 (Color Palette) {copiedIndex !== null && <span style={{ color: 'var(--feishu-accent)', textTransform: 'none', marginLeft: '6px' }}>已复制!</span>}
      </span>
      <div className={styles.paletteList}>
        {colors.map((color, i) => (
          <div 
            key={color + i} 
            title={`点击复制: ${color}`}
            onClick={() => handleCopy(color, i)}
            className={styles.colorSwatch}
            style={{
              backgroundColor: color,
              transform: copiedIndex === i ? 'scale(0.9) translateY(0px)' : undefined,
            }}
          />
        ))}
      </div>
    </div>
  )
}

function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

function getFallbackPalette(str: string) {
  // Simple hash function to generate a stable beautiful palette
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  const themes = [
    ['#2c3e50', '#18bc9c', '#2ecc71', '#3498db', '#f1c40f'], // emerald
    ['#1e1b4b', '#4338ca', '#3b82f6', '#60a5fa', '#a5f3fc'], // blue cyan
    ['#311b92', '#673ab7', '#9c27b0', '#e040fb', '#f3e5f5'], // purple
    ['#5d4037', '#8d6e63', '#d7ccc8', '#ffe0b2', '#ffb74d'], // warm earth
    ['#1a5f7a', '#57c5b6', '#159895', '#002b5b', '#000000'], // deep sea
    ['#f43f5e', '#fb7185', '#fda4af', '#fecdd3', '#fff1f2'], // rose
  ]
  
  const index = Math.abs(hash) % themes.length
  return themes[index]
}
