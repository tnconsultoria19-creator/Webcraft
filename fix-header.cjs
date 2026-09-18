const fs = require('fs');

let content = fs.readFileSync('src/components/leads/LeadDetailWorkspace.tsx', 'utf8');

// The block to replace
const oldBlock = `<div className="px-8 py-6 bg-white text-[#292A29] flex flex-wrap items-center justify-between gap-6 border-b border-[#DDD8CE]">
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs font-bold text-[#D9A441] bg-white/10 px-3 py-1.5 rounded-full border border-[#D9A441]/30">
              {lead.id}
            </span>
            <div>
              <h2 className="font-bold text-xl text-white flex items-center gap-3">
                {lead.name}
                <span className="text-xs font-bold px-3.5 py-1 rounded-full uppercase bg-[#245F6B] text-white shadow-xs">
                  {getStageLabel(lead.stage)}
                </span>
              </h2>
              <p className="text-xs text-[#969188] flex items-center gap-3 mt-1 font-medium">
                <span>Source: <strong className="text-white">{lead.source}</strong></span>
                <span>•</span>
                <span>Contact Owner: <strong className="text-white">{lead.ownerName || 'Unassigned'}</strong></span>
              </p>
            </div>
          </div>

          {/* Action Controls & Pipeline Movement Stepper */}
          <div className="flex items-center gap-3 flex-wrap">
            
            {/* Stage Movement Stepper Buttons */}
            <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-full border border-white/20">
              <button
                type="button"
                onClick={handleMoveStageBackward}
                disabled={!getPreviousStage(lead.stage)}
                className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 text-white text-xs font-semibold rounded-full transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                title="Move lead backward (reverse pipeline step)"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Move Back</span>
              </button>
              
              <button
                type="button"
                onClick={handleMoveStageForward}
                disabled={!getNextStage(lead.stage)}
                className="px-3.5 py-1.5 bg-[#245F6B] hover:bg-[#1E505A] disabled:opacity-30 disabled:hover:bg-[#245F6B] text-white text-xs font-semibold rounded-full transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-xs"
                title="Move lead forward (advance pipeline step)"
              >
                <span>Move Forward</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Lead Ownership Action */}
            {!lead.ownerId || lead.ownerId === '' ? (
              <button
                onClick={handleClaimLead}
                className="px-4 py-2 bg-[#245F6B] hover:bg-[#1E505A] text-white rounded-full text-xs font-semibold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                Claim Lead
              </button>
            ) : isOwner ? (
              <button
                onClick={handleReleaseLead}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer border border-white/15"
              >
                <UserX className="w-4 h-4" />
                Release Lead
              </button>
            ) : null}

            {/* Admin Override Reassign Dropdown */}
            {isAdminOrManager && (
              <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1.5 text-xs">
                <ShieldAlert className="w-4 h-4 text-[#D9A441] shrink-0" />
                <span className="font-semibold text-[#969188] text-xs uppercase">Reassign:</span>
                <select
                  value={lead.ownerId || ''}
                  onChange={(e) => handleAdminOverrideLeadOwner(e.target.value)}
                  className="bg-transparent font-semibold text-white text-xs focus:outline-none cursor-pointer"
                >
                  <option value="" className="text-[#292A29]">-- Unassigned --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id} className="text-[#292A29]">
                      {u.displayName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* View Prototype Button */}
            {lead.templateUrl && (
              <a
                href={formatExternalUrl(lead.templateUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#4F765C] hover:bg-[#239e46] text-white rounded-full text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
              >
                <Globe className="w-4 h-4" />
                View Prototype ↗
              </a>
            )}

            {/* Client Quote & Profit Converter Button */}
            <button
              onClick={() => setIsQuoteCalculatorOpen(true)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-white/20 shadow-xs"
              title="Calculate client quote and ensure R500 minimum profit margin"
            >
              <Calculator className="w-4 h-4 text-[#D9A441]" />
              <span>Quote & Profit (R500)</span>
            </button>

            {/* Edit Lead Button */}
            <button
              onClick={handleOpenEditLead}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border border-white/20 shadow-xs"
              title="Edit lead business details, stage, location and source"
            >
              <Edit3 className="w-4 h-4" />
              Edit Lead
            </button>`;

const newBlock = `<div className="px-6 py-5 bg-[#FFFFFF] text-[#292A29] flex flex-wrap items-center justify-between gap-6 border-b border-[#DDD8CE]">
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs font-medium text-[#245F6B] bg-[#E5EEEE] px-2.5 py-1 rounded-md">
              {lead.id}
            </span>
            <div>
              <h2 className="font-semibold text-xl text-[#292A29] flex items-center gap-3">
                {lead.name}
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full uppercase bg-[#E5EEEE] text-[#245F6B]">
                  {getStageLabel(lead.stage)}
                </span>
              </h2>
              <p className="text-xs text-[#68645D] flex items-center gap-3 mt-1 font-medium">
                <span>Source: <strong className="text-[#292A29]">{lead.source}</strong></span>
                <span>•</span>
                <span>Contact Owner: <strong className="text-[#292A29]">{lead.ownerName || 'Unassigned'}</strong></span>
              </p>
            </div>
          </div>

          {/* Action Controls & Pipeline Movement Stepper */}
          <div className="flex items-center gap-2.5 flex-wrap">
            
            {/* Stage Movement Stepper Buttons */}
            <div className="flex items-center gap-1.5 p-1 rounded-lg">
              <button
                type="button"
                onClick={handleMoveStageBackward}
                disabled={!getPreviousStage(lead.stage)}
                className="px-3 py-1.5 bg-white border border-[#DDD8CE] hover:bg-[#F0EDE5] disabled:opacity-30 disabled:hover:bg-white text-[#292A29] text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                title="Move lead backward (reverse pipeline step)"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Move Back</span>
              </button>
              
              <button
                type="button"
                onClick={handleMoveStageForward}
                disabled={!getNextStage(lead.stage)}
                className="px-3 py-1.5 bg-[#245F6B] hover:bg-[#1E505A] disabled:opacity-30 disabled:hover:bg-[#245F6B] text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-xs"
                title="Move lead forward (advance pipeline step)"
              >
                <span>Move Forward</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Lead Ownership Action */}
            {!lead.ownerId || lead.ownerId === '' ? (
              <button
                onClick={handleClaimLead}
                className="px-3 py-1.5 bg-[#245F6B] hover:bg-[#1E505A] text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Claim Lead
              </button>
            ) : isOwner ? (
              <button
                onClick={handleReleaseLead}
                className="px-3 py-1.5 bg-white hover:bg-[#F0EDE5] text-[#292A29] border border-[#DDD8CE] rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <UserX className="w-3.5 h-3.5" />
                Release Lead
              </button>
            ) : null}

            {/* Admin Override Reassign Dropdown */}
            {isAdminOrManager && (
              <div className="flex items-center gap-1.5 bg-[#F4F1EA] border border-[#DDD8CE] rounded-lg px-2.5 py-1 text-xs">
                <ShieldAlert className="w-3.5 h-3.5 text-[#68645D] shrink-0" />
                <span className="font-medium text-[#68645D] text-[11px] uppercase">Reassign:</span>
                <select
                  value={lead.ownerId || ''}
                  onChange={(e) => handleAdminOverrideLeadOwner(e.target.value)}
                  className="bg-transparent font-medium text-[#292A29] text-xs focus:outline-none cursor-pointer"
                >
                  <option value="" className="text-[#292A29]">-- Unassigned --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id} className="text-[#292A29]">
                      {u.displayName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* View Prototype Button */}
            {lead.templateUrl && (
              <a
                href={formatExternalUrl(lead.templateUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-[#245F6B] hover:bg-[#1E505A] text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Globe className="w-3.5 h-3.5" />
                View Prototype ↗
              </a>
            )}

            {/* Client Quote & Profit Converter Button */}
            <button
              onClick={() => setIsQuoteCalculatorOpen(true)}
              className="px-3 py-1.5 bg-white hover:bg-[#F0EDE5] text-[#292A29] border border-[#DDD8CE] rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="Calculate client quote and ensure R500 minimum profit margin"
            >
              <Calculator className="w-3.5 h-3.5 text-[#245F6B]" />
              <span>Quote & Profit</span>
            </button>

            {/* Edit Lead Button */}
            <button
              onClick={handleOpenEditLead}
              className="px-3 py-1.5 bg-white hover:bg-[#F0EDE5] text-[#292A29] border border-[#DDD8CE] rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="Edit lead business details, stage, location and source"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Lead
            </button>`;

if (content.includes(oldBlock)) {
  content = content.replace(oldBlock, newBlock);
  fs.writeFileSync('src/components/leads/LeadDetailWorkspace.tsx', content, 'utf8');
  console.log("Replaced block successfully");
} else {
  console.log("Old block not found!");
}
