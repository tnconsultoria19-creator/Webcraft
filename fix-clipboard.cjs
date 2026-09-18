const fs = require('fs');

let content = fs.readFileSync('src/components/assets/ClipboardPasteZone.tsx', 'utf8');

content = content.replace(/bg-slate-800\/80/g, 'bg-white/50');
content = content.replace(/border-slate-700/g, 'border-[#DDD8CE]');
content = content.replace(/hover:border-indigo-500\/60/g, 'hover:border-[#245F6B]/60');
content = content.replace(/text-slate-300/g, 'text-[#68645D]');
content = content.replace(/text-indigo-400/g, 'text-[#245F6B]');
content = content.replace(/bg-indigo-950\/80/g, 'bg-[#E5EEEE]/80');
content = content.replace(/border-indigo-800\/50/g, 'border-[#245F6B]/20');
content = content.replace(/text-slate-200/g, 'text-[#292A29]');
content = content.replace(/bg-slate-700/g, 'bg-[#F0EDE5]');
content = content.replace(/bg-slate-900/g, 'bg-white');
content = content.replace(/focus:ring-indigo-500/g, 'focus:ring-[#245F6B]');
content = content.replace(/bg-indigo-600/g, 'bg-[#245F6B]');
content = content.replace(/hover:bg-indigo-500/g, 'hover:bg-[#1E505A]');
content = content.replace(/bg-slate-800\/40/g, 'bg-[#F4F1EA]');
content = content.replace(/border-slate-800/g, 'border-[#DDD8CE]');
content = content.replace(/bg-slate-800/g, 'bg-white');
content = content.replace(/hover:border-indigo-500/g, 'hover:border-[#245F6B]');
content = content.replace(/bg-slate-950/g, 'bg-[#F0EDE5]');
content = content.replace(/border-t border-slate-800\/80/g, 'border-t border-[#DDD8CE]');
content = content.replace(/bg-slate-900\/80/g, 'bg-white/80');

fs.writeFileSync('src/components/assets/ClipboardPasteZone.tsx', content, 'utf8');
