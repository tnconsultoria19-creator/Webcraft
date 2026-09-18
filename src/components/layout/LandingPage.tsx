import React from 'react';
import {
  Layers,
  ArrowRight,
  Zap,
  Globe,
  Send,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { WorldClockBar } from './WorldClockBar';

interface LandingPageProps {
  onSignInClick: () => void;
  onSignUpClick: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSignInClick,
  onSignUpClick
}) => {
  return (
    <div className="min-h-screen bg-[#F0EDE5] text-[#68645D] font-['Poppins'] flex flex-col">
      
      {/* Top Header Bar */}
      <header className="bg-white text-[#292A29] px-6 sm:px-10 py-4 flex items-center justify-between sticky top-0 z-40 border-b border-[#DDD8CE] shadow-xs">
        <button
          onClick={onSignInClick}
          className="flex items-center gap-3 text-left cursor-pointer group"
          title="WebCraft Studio - Go to Home / Sign In"
        >
          <div className="w-10 h-10 rounded-2xl bg-[#245F6B] group-hover:bg-[#1E505A] flex items-center justify-center font-extrabold text-xl text-white shadow-xs transition-colors">
            W
          </div>
          <div>
            <span className="font-bold text-lg sm:text-xl tracking-tight block leading-none text-[#292A29] group-hover:text-[#245F6B] transition-colors">WebCraft Studio</span>
            <span className="text-[10px] text-[#68645D] font-semibold tracking-wider block mt-0.5 uppercase">Sales & Production Workspace</span>
          </div>
        </button>

        <nav className="hidden lg:flex items-center gap-8 text-xs font-semibold text-[#68645D]">
          <a href="#world-clock" className="hover:text-[#245F6B] transition-colors flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#245F6B]" />
            <span>Regional Clocks</span>
          </a>
          <a href="#features" className="hover:text-[#245F6B] transition-colors">Workflow</a>
          <a href="#earnings" className="hover:text-[#245F6B] transition-colors">Action Structure</a>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={onSignInClick}
            className="px-4 py-2 text-xs font-semibold text-[#292A29] hover:text-[#245F6B] transition-colors cursor-pointer"
          >
            Sign In
          </button>
          <button
            onClick={onSignUpClick}
            className="px-6 py-2.5 bg-[#245F6B] hover:bg-[#1E505A] text-white text-xs font-bold rounded-full transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <span>Employee Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Global Real-Time World Clocks Banner */}
      <section id="world-clock" className="bg-[#292A29] border-b border-[#DDD8CE] py-3 px-6 sm:px-10 z-30">
        <div className="max-w-7xl mx-auto">
          <WorldClockBar variant="landing" />
        </div>
      </section>

      {/* Hero Banner Section */}
      <section
        className="w-full h-[380px] sm:h-[460px] relative bg-cover bg-center bg-no-repeat border-b border-[#DDD8CE] shadow-xs"
        style={{
          backgroundImage: "url('https://images.pexels.com/photos/37410573/pexels-photo-37410573.jpeg')"
        }}
      />

      {/* Main Features & Value Grid */}
      <section id="features" className="max-w-7xl mx-auto px-6 sm:px-10 py-16 space-y-10">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E5EEEE] text-[#245F6B] text-xs font-bold rounded-full border border-[#245F6B]/20">
            <Sparkles className="w-3.5 h-3.5 text-[#245F6B]" />
            <span>Workflow Overview</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#292A29]">Production Pipeline</h2>
          <p className="text-xs sm:text-sm text-[#68645D] font-medium max-w-xl mx-auto">
            Organized tools for discovery, prototyping, and client communication.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1 */}
          <div className="bg-white p-6 rounded-2xl border border-[#DDD8CE] shadow-xs space-y-4 hover:shadow-sm transition-all hover:-translate-y-0.5 group">
            <div className="w-12 h-12 rounded-2xl bg-[#E5EEEE] text-[#245F6B] flex items-center justify-center font-bold border border-[#DDD8CE] group-hover:bg-[#245F6B] group-hover:text-white transition-colors">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-[#292A29]">1. Prospect Discovery</h3>
            <p className="text-xs text-[#68645D] leading-relaxed font-medium">
              Record business leads with automatic deduplication across phone numbers, emails, and company records.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-6 rounded-2xl border border-[#DDD8CE] shadow-xs space-y-4 hover:shadow-sm transition-all hover:-translate-y-0.5 group">
            <div className="w-12 h-12 rounded-2xl bg-[#E5EEEE] text-[#245F6B] flex items-center justify-center font-bold border border-[#DDD8CE] group-hover:bg-[#245F6B] group-hover:text-white transition-colors">
              <Globe className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-[#292A29]">2. Prototype Showcase</h3>
            <p className="text-xs text-[#68645D] leading-relaxed font-medium">
              Link live web design prototypes directly to lead profiles for instant preview during sales outreach.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-6 rounded-2xl border border-[#DDD8CE] shadow-xs space-y-4 hover:shadow-sm transition-all hover:-translate-y-0.5 group">
            <div className="w-12 h-12 rounded-2xl bg-[#E5EEEE] text-[#245F6B] flex items-center justify-center font-bold border border-[#DDD8CE] group-hover:bg-[#245F6B] group-hover:text-white transition-colors">
              <Send className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-[#292A29]">3. Client Outreach</h3>
            <p className="text-xs text-[#68645D] leading-relaxed font-medium">
              Log communication via WhatsApp, call, or email, track feedback, and update pipeline stage progression.
            </p>
          </div>

        </div>
      </section>

      {/* Action Allocation & Structure */}
      <section id="earnings" className="bg-white border-y border-[#DDD8CE] py-16 px-6 sm:px-10">
        <div className="max-w-5xl mx-auto space-y-8 text-center">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-[#245F6B] uppercase tracking-wider">Action Structure</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#292A29]">Team Workflow Earnings</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            
            <div className="bg-[#F0EDE5] p-6 rounded-2xl border border-[#DDD8CE] space-y-3 shadow-xs">
              <div className="flex items-center justify-between gap-4">
                <span className="font-bold text-base text-[#292A29]">Full Lead Creator Action</span>
                <span className="px-3.5 py-1 bg-[#245F6B] text-white text-xs font-bold rounded-full shrink-0">R100 Action</span>
              </div>
              <p className="text-xs text-[#68645D] leading-relaxed font-medium">
                Capturing a verified lead and executing the client contact step combined receives full action allocation.
              </p>
            </div>

            <div className="bg-[#F0EDE5] p-6 rounded-2xl border border-[#DDD8CE] space-y-3 shadow-xs">
              <div className="flex items-center justify-between gap-4">
                <span className="font-bold text-base text-[#292A29]">Reassigned Client Outreach</span>
                <span className="px-3.5 py-1 bg-[#D9A441] text-[#292A29] text-xs font-bold rounded-full shrink-0">R50 Half Action</span>
              </div>
              <p className="text-xs text-[#68645D] leading-relaxed font-medium">
                When a lead has an attached website prototype, client contact can be reassigned to team members for half action allocation.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#292A29] text-[#969188] text-xs py-8 px-6 sm:px-10 text-center mt-auto border-t border-[#DDD8CE]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-white font-bold text-sm">
            <div className="w-8 h-8 rounded-lg bg-[#245F6B] flex items-center justify-center font-bold text-sm text-white">W</div>
            WebCraft Studio Workspace
          </div>
          <p className="text-xs">© {new Date().getFullYear()} WebCraft Studio. Regional Sales & Production System.</p>
        </div>
      </footer>

    </div>
  );
};
