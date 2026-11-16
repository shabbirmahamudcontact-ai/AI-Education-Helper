import React, { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { BookOpen } from "lucide-react";

interface Hero3DStageProps {
  selectedTrack: string;
}

export const Hero3DStage: React.FC<Hero3DStageProps> = ({ selectedTrack }) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [interactive3D, setInteractive3D] = useState(false);

  const px = useMotionValue(0);
  const py = useMotionValue(0);

  const springX = useSpring(px, { stiffness: 120, damping: 20 });
  const springY = useSpring(py, { stiffness: 120, damping: 20 });

  const cardRotateX = useTransform(springY, [-1, 1], [4.5, -4.5]);
  const cardRotateY = useTransform(springX, [-1, 1], [-4.5, 4.5]);
  const orbShiftX = useTransform(springX, [-1, 1], [-12, 12]);
  const orbShiftY = useTransform(springY, [-1, 1], [-10, 10]);
  const bookShiftX = useTransform(springX, [-1, 1], [10, -10]);
  const bookShiftY = useTransform(springY, [-1, 1], [8, -8]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setInteractive3D(finePointer && !reducedMotion);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive3D || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    px.set(Math.max(-1, Math.min(1, nx)));
    py.set(Math.max(-1, Math.min(1, ny)));
  };

  const handleMouseLeave = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <div
      ref={stageRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-full flex items-center justify-center perspective-1100 py-2 sm:py-4"
    >
      {/* Subtle Ambient Indigo & Violet Depth Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-4 rounded-3xl bg-gradient-to-tr from-[#4338CA]/14 via-[#7C3AED]/10 to-transparent blur-2xl animate-orb-glow"
      />

      {/* Lightweight Floating Particles (Desktop mostly, minimal on mobile) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="absolute top-6 left-8 w-1.5 h-1.5 rounded-full bg-[#4338CA]/45 animate-float-slow" />
        <span className="absolute bottom-14 right-8 w-2 h-2 rounded-full bg-[#7C3AED]/45 animate-float-reverse" />
        <span className="hidden md:block absolute top-1/3 left-2 w-1.5 h-1.5 rounded-full bg-[#10B981]/50 animate-float-reverse" />
        <span className="hidden md:block absolute top-12 right-1/3 w-1.5 h-1.5 rounded-full bg-[#4338CA]/35 animate-float-slow" />
        <span className="hidden md:block absolute bottom-6 left-1/3 w-2 h-2 rounded-full bg-[#7C3AED]/30 animate-float-slow" />
      </div>

      {/* Main 3D Perspective Hero Visual Card */}
      <motion.div
        style={
          interactive3D
            ? {
                rotateX: cardRotateX,
                rotateY: cardRotateY,
                transformStyle: "preserve-3d",
              }
            : undefined
        }
        className="relative w-full rounded-2xl overflow-hidden border border-slate-200/90 bg-white shadow-[0_24px_50px_-18px_rgba(30,27,75,0.22)] flex flex-col"
      >
        <div className="relative flex-1 min-h-[270px] lg:min-h-[395px] bg-slate-100 overflow-hidden">
          {!heroImgFailed ? (
            <img
              src="/src/assets/images/hero_edugenius_study_1794629635745.jpg"
              alt="Students collaborating on study notes and digital coursework in a sunlit university library"
              referrerPolicy="no-referrer"
              loading="eager"
              onError={() => setHeroImgFailed(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-[#1E1B4B] to-[#4338CA] text-white text-center">
              <BookOpen className="w-10 h-10 mb-3 opacity-90" />
              <p className="text-base font-semibold">EduGenius AI Learning Environment</p>
            </div>
          )}

          {/* Subtle gradient depth scrim at bottom */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#1E1B4B]/55 via-[#1E1B4B]/15 to-transparent"
          />
        </div>

        <div className="px-5 py-3.5 bg-[#1E1B4B] text-white flex items-center justify-between text-xs relative z-10">
          <span className="text-slate-200">Concept Definition · Analogy · Practical Example</span>
          <span className="font-mono font-semibold text-white">{selectedTrack}</span>
        </div>
      </motion.div>

      {/* Floating 3D Animated AI Glowing Orb (Top-Right Foreground Layer) */}
      <motion.div
        aria-hidden="true"
        style={interactive3D ? { x: orbShiftX, y: orbShiftY } : undefined}
        className="pointer-events-none absolute -top-3 -right-2 sm:-right-4 z-20 animate-float-slow"
      >
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
          {/* Outer rotating orbital ring */}
          <div className="absolute inset-0 rounded-full border border-[#7C3AED]/45 border-t-[#4338CA] animate-orbit-spin" />
          <div className="absolute inset-1.5 rounded-full border border-dashed border-[#4338CA]/35 animate-orbit-spin [animation-direction:reverse]" />
          {/* Glowing 3D sphere */}
          <div
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full shadow-[0_0_24px_rgba(124,58,237,0.55)]"
            style={{
              background:
                "radial-gradient(circle at 32% 30%, #FFFFFF 0%, #C4B5FD 22%, #7C3AED 58%, #1E1B4B 100%)",
            }}
          />
        </div>
      </motion.div>

      {/* Floating 3D Educational Book Illustration (Bottom-Left Foreground Layer) */}
      <motion.div
        aria-hidden="true"
        style={interactive3D ? { x: bookShiftX, y: bookShiftY } : undefined}
        className="pointer-events-none absolute -bottom-3 -left-2 sm:-left-5 z-20 animate-float-reverse"
      >
        <div className="p-2.5 rounded-2xl bg-white/88 backdrop-blur-md border border-white/70 shadow-[0_14px_30px_-10px_rgba(30,27,75,0.28)]">
          <svg
            width="54"
            height="44"
            viewBox="0 0 64 52"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-11 h-9 sm:w-13 sm:h-11"
          >
            {/* 3D Book Base Shadow / Cover */}
            <path
              d="M6 12L32 18L58 12V40L32 47L6 40V12Z"
              fill="#1E1B4B"
            />
            {/* Left 3D Page */}
            <path
              d="M9 10L31 15.5V41L9 35.5V10Z"
              fill="#FFFFFF"
              stroke="#E2E8F0"
              strokeWidth="1.2"
            />
            {/* Right 3D Page */}
            <path
              d="M55 10L33 15.5V41L55 35.5V10Z"
              fill="#F8FAFC"
              stroke="#E2E8F0"
              strokeWidth="1.2"
            />
            {/* Illuminated Indigo/Violet Spine */}
            <path d="M32 15V44" stroke="url(#bookSpineGrad)" strokeWidth="2.5" strokeLinecap="round" />
            {/* Crisp Page Text Lines */}
            <path d="M13 18L26 21" stroke="#4338CA" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M13 24L25 27" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M13 30L23 32.5" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M51 18L38 21" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M51 24L39 27" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="45" cy="31" r="2.2" fill="#10B981" />
            <defs>
              <linearGradient id="bookSpineGrad" x1="32" y1="15" x2="32" y2="44" gradientUnits="userSpaceOnUse">
                <stop stopColor="#4338CA" />
                <stop offset="1" stopColor="#7C3AED" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </motion.div>

      {/* Floating Mathematical & Bilingual Learning Tokens (Glassmorphic, Desktop/Tablet) */}
      <motion.div
        aria-hidden="true"
        style={interactive3D ? { x: bookShiftX, y: orbShiftY } : undefined}
        className="hidden sm:flex pointer-events-none absolute top-10 -left-4 z-20 items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/85 backdrop-blur-md border border-slate-200/80 shadow-md text-xs font-mono font-semibold text-[#1E1B4B] animate-float-slow"
      >
        <span className="text-[#4338CA]">∑</span>
        <span>E = mc²</span>
      </motion.div>

      <motion.div
        aria-hidden="true"
        style={interactive3D ? { x: orbShiftX, y: bookShiftY } : undefined}
        className="hidden sm:flex pointer-events-none absolute bottom-16 -right-4 z-20 items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/85 backdrop-blur-md border border-slate-200/80 shadow-md text-xs font-semibold text-[#1E1B4B] animate-float-reverse"
      >
        <span className="text-[#7C3AED] font-mono">∫π</span>
        <span>·</span>
        <span>বাংলা + EN</span>
      </motion.div>
    </div>
  );
};
