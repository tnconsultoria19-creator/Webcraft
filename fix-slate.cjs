const fs = require('fs');

function replaceSlate(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Global slate replacements
  content = content.replace(/bg-slate-900\/40/g, 'bg-black/30');
  content = content.replace(/bg-slate-950\/80/g, 'bg-black/50');
  content = content.replace(/text-slate-400/g, 'text-[#969188]');
  content = content.replace(/text-slate-500/g, 'text-[#68645D]');
  content = content.replace(/hover:bg-slate-100/g, 'hover:bg-[#F0EDE5]');
  
  if (filePath.includes('PersonalProfileModal.tsx')) {
    content = content.replace(/bg-slate-50 border-b border-slate-200/g, 'bg-white border-b border-[#DDD8CE]');
    content = content.replace(/bg-slate-900 text-white/g, 'bg-[#245F6B] text-white');
    content = content.replace(/text-slate-700/g, 'text-[#292A29]');
    content = content.replace(/bg-slate-200\/60/g, 'bg-[#E8E9E2]');
    content = content.replace(/bg-slate-50 border border-slate-200/g, 'bg-[#F4F1EA] border border-[#DDD8CE]');
    content = content.replace(/text-slate-900/g, 'text-[#292A29]');
    content = content.replace(/bg-slate-100/g, 'bg-[#F0EDE5]');
    content = content.replace(/focus:ring-slate-900/g, 'focus:ring-[#245F6B]');
    content = content.replace(/hover:bg-slate-200/g, 'hover:bg-[#E8E9E2]');
    content = content.replace(/bg-slate-800/g, 'bg-[#1E505A]');
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Updated", filePath);
  }
}

[
  'src/components/dashboard/PersonalEarningsModal.tsx',
  'src/components/dashboard/TeamPerformanceModal.tsx',
  'src/components/dashboard/PersonalProfileModal.tsx',
  'src/components/layout/Navbar.tsx',
  'src/components/leads/LeadDetailWorkspace.tsx',
  'src/components/assets/ClipboardPasteZone.tsx'
].forEach(replaceSlate);
