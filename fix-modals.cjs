const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  // QuickAddLeadModal
  content = content.replace(
    /<h2 className="font-bold text-base text-white">/g, 
    '<h2 className="font-bold text-base text-[#292A29]">'
  );
  content = content.replace(
    /className="p-2 text-\[#969188\] hover:text-white rounded-full hover:bg-white\/10 transition-colors cursor-pointer"/g,
    'className="p-2 text-[#969188] hover:text-[#292A29] rounded-full hover:bg-[#F0EDE5] transition-colors cursor-pointer"'
  );
  
  // AdminSettingsModal
  content = content.replace(
    /<h2 className="font-bold text-xl text-white flex items-center gap-2">/g,
    '<h2 className="font-bold text-xl text-[#292A29] flex items-center gap-2">'
  );
  
  // PricingQuoteConverterModal
  content = content.replace(
    /<h2 className="text-lg font-bold text-white flex items-center gap-2">/g,
    '<h2 className="text-lg font-bold text-[#292A29] flex items-center gap-2">'
  );

  // LeadTableView
  content = content.replace(
    /tr className="bg-white text-\[#292A29\] font-semibold text-xs uppercase tracking-wider"/g,
    'tr className="bg-[#F4F1EA] text-[#68645D] font-semibold text-[11px] uppercase tracking-wider"'
  );
  
  // LeadKanbanView
  content = content.replace(
    /div className="p-4 bg-white text-\[#292A29\] flex justify-between items-center border-b border-\[#DDD8CE\]"/g,
    'div className="p-4 bg-[#F4F1EA] text-[#292A29] flex justify-between items-center border-b border-[#DDD8CE]"'
  );
  content = content.replace(
    /<h3 className="font-bold text-base text-white capitalize flex items-center gap-2">/g,
    '<h3 className="font-bold text-sm text-[#292A29] capitalize flex items-center gap-2">'
  );
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Updated", filePath);
  }
}

const filesToProcess = [
  'src/components/leads/QuickAddLeadModal.tsx',
  'src/components/admin/AdminSettingsModal.tsx',
  'src/components/calculator/PricingQuoteConverterModal.tsx',
  'src/components/leads/LeadTableView.tsx',
  'src/components/leads/LeadKanbanView.tsx',
  'src/components/leads/LeadDetailWorkspace.tsx',
  'src/components/dashboard/PersonalEarningsModal.tsx',
  'src/components/dashboard/TeamPerformanceModal.tsx'
];

filesToProcess.forEach(processFile);
