"use client"

import { motion, useReducedMotion, Variants } from "framer-motion"
import { Check, Users, UserCheck } from "lucide-react"
import { useState } from "react"
import { cn } from "../../lib/utils"
import { useTranslation } from 'react-i18next'

interface ProfileCardProps {
  name?: string
  description?: string
  image?: string
  isVerified?: boolean
  followers?: number
  following?: number
  enableAnimations?: boolean
  className?: string
  onFollow?: () => void
  isFollowing?: boolean
  role?: string
  specialty?: string
  phone?: string
}

export function ProfileCard({
  name = "Sophie Bennett",
  description = "Product Designer who focuses on simplicity & usability.",
  image = "https://images.unsplash.com/photo-1544717305-2782549b5136?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60",
  isVerified = true,
  followers = 312,
  following = 48,
  enableAnimations = true,
  className,
  onFollow = () => {},
  isFollowing = false,
  role = "",
  specialty = "",
  phone = "",
}: ProfileCardProps) {
  const { t } = useTranslation('common');
  const [hovered, setHovered] = useState(false)
  const shouldReduceMotion = useReducedMotion()
  const shouldAnimate = enableAnimations && !shouldReduceMotion

  const containerVariants = {
    rest: { 
      scale: 1,
      y: 0,
      filter: "blur(0px)",
    },
    hover: shouldAnimate ? { 
      scale: 1.02, 
      y: -4,
      filter: "blur(0px)",
      transition: { 
        type: "spring" as const, 
        stiffness: 400, 
        damping: 28,
        mass: 0.6,
      }
    } : {},
  }

  const imageVariants = {
    rest: { scale: 1 },
    hover: { scale: 1.05 },
  }

  const contentVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      filter: "blur(4px)",
    },
    visible: { 
      opacity: 1, 
      y: 0,
      filter: "blur(0px)",
      transition: {
        type: "spring" as const,
        stiffness: 400,
        damping: 28,
        mass: 0.6,
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: 15,
      scale: 0.95,
      filter: "blur(2px)",
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        type: "spring" as const,
        stiffness: 400,
        damping: 25,
        mass: 0.5,
      },
    },
  }

  const letterVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8,
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        type: "spring" as const,
        damping: 8,
        stiffness: 200,
        mass: 0.8,
      },
    },
  }

  return (
    <motion.div
      data-slot="profile-hover-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial="rest"
      whileHover="hover"
      variants={containerVariants}
      className={cn(
        "relative w-72 h-96 rounded-3xl border border-slate-700/20 text-slate-100 overflow-hidden shadow-xl shadow-black/5 cursor-pointer group backdrop-blur-sm mx-auto",
        "dark:shadow-black/20",
        className
      )}
    >
      {/* Full Cover Image */}
      <motion.img
        src={image}
        alt={name}
        className="absolute inset-0 w-full h-full object-cover"
        variants={imageVariants}
        transition={{ type: "spring" as const, stiffness: 300, damping: 30 }}
      />

      {/* Smooth Blur Overlay - Multiple layers for seamless fade */}
      <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-900/60 via-stone-900/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-stone-950/90 via-stone-900/50 via-stone-900/10 to-transparent backdrop-blur-[1px]" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-stone-950/90 via-stone-950/60 to-transparent backdrop-blur-sm" />

      {/* Content */}
      <motion.div 
        variants={contentVariants}
        initial="hidden"
        animate="visible"
        className="absolute bottom-0 left-0 right-0 p-5 space-y-3"
      >
        {/* Name and Verification */}
        <motion.div variants={itemVariants} className="flex items-center gap-2">
          <motion.h2 
            className="text-2xl font-black text-white drop-shadow-md tracking-wide"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.02,
                }
              }
            }}
          >
            {name.split("").map((letter, index) => (
              <motion.span
                key={index}
                variants={letterVariants}
                className="inline-block"
              >
                {letter === " " ? "\u00A0" : letter}
              </motion.span>
            ))}
          </motion.h2>
          {isVerified && (
            <motion.div 
              variants={itemVariants}
              className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white shadow-lg"
              whileHover={{ 
                scale: 1.1, 
                rotate: 5,
                transition: { type: "spring" as const, stiffness: 400, damping: 20 }
              }}
            >
              <Check className="w-3 h-3 stroke-[3]" />
            </motion.div>
          )}
        </motion.div>

        {/* Description */}
        <motion.p 
          variants={itemVariants}
          className="text-emerald-50/70 font-medium text-xs leading-relaxed"
        >
          {description}
        </motion.p>

        {/* Dynamics Meta Fields */}
        {(role || specialty) && (
          <motion.div variants={itemVariants} className="flex items-center gap-1.5 mt-1 border-b border-white/10 pb-2">
            {role && <span className="bg-[#34D399]/20 text-[#34D399] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">{role}</span>}
            {specialty && <span className="text-white/60 text-[10px] uppercase font-mono tracking-tight truncate max-w-[120px]">{specialty}</span>}
          </motion.div>
        )}

        {/* Stats */}
        <motion.div 
          variants={itemVariants}
          className="flex items-center justify-between gap-2 pt-2 pb-1"
        >
          <div className="flex flex-col text-stone-300">
            <span className="font-bold text-white text-lg">{followers}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">{t('profileCard.repairs')}</span>
          </div>
          <div className="flex flex-col text-stone-300 items-end">
            <span className="font-bold text-white text-lg">{following}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">{t('profileCard.rating')}</span>
          </div>
        </motion.div>

        {/* Follow Button */}
        <motion.button
          variants={itemVariants}
          onClick={onFollow}
          whileHover={{ 
            scale: 1.02,
            transition: { type: "spring" as const, stiffness: 400, damping: 25 }
          }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "w-full cursor-pointer py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-200 mt-1 shadow-xl",
            isFollowing 
              ? "bg-[#0E2829]/90 border border-emerald-500/30 text-emerald-300 hover:bg-[#0E2829] backdrop-blur-sm" 
              : "bg-emerald-500 border-2 border-emerald-400 text-[#0E2829] hover:bg-emerald-400",
            "transform-gpu"
          )}
        >
          {isFollowing ? t('profileCard.manage', 'MANAGE PROFILE') : t('profileCard.setup', 'SETUP AUTHORIZATION')}
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
