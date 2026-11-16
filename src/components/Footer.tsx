import React from "react";
import { PageId } from "../types";
import { BrandLogo } from "./BrandLogo";

interface FooterProps {
  onNavigate: (page: PageId) => void;
}

const FOOTER_LINKS: { id: PageId; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "study-hub", label: "AI Study Hub" },
  { id: "smart-quiz", label: "Smart Quiz" },
  { id: "live-tutor", label: "Live Tutor" },
  { id: "settings", label: "Settings" },
];

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-[#1E1B4B] text-white border-t border-white/10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3">
            <BrandLogo variant="dark" size="sm" />
            <p className="text-sm text-slate-300 max-w-md leading-relaxed">
              Built by Apex Edutech Labs Inc. Adaptive explanations, dynamic quizzes, and bilingual
              tutoring in English & বাংলা for SSC, HSC, University, IELTS, and Job exams.
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2" aria-label="Footer Navigation">
            {FOOTER_LINKS.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => onNavigate(link.id)}
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
              >
                {link.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Apex Edutech Labs Inc. All rights reserved.</p>
          <p className="flex items-center gap-2">
            <span>English & বাংলা Ready</span>
            <span aria-hidden="true">·</span>
            <span>Server-Side Gemini Proxy</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
