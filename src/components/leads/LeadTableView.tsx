import React, { useState } from 'react';
import { Globe, Eye, ExternalLink, Phone, AlertTriangle, Trash2, FileText } from 'lucide-react';
import { Lead } from '../../types';
import { getStageLabel, formatDateTime, formatExternalUrl } from '../../lib/utils';
import { getCountryByName } from '../../lib/currencyUtils';
import { findLeadDuplicates } from '../../lib/searchUtils';
import { ConfirmModal } from '../common/ConfirmModal';

interface LeadTableViewProps {
  leads: Lead[];
  isLoading?: boolean;
  onSelectLead: (leadId: string) => void;
  onDeleteLead?: (leadId: string, leadName: string) => void;
}

export const LeadTableView: React.FC<LeadTableViewProps> = ({
  leads,
  isLoading = false,
  onSelectLead,
  onDeleteLead
}) => {
  const [leadToDelete, setLeadToDelete] = useState<{ id: string; name: string } | null>(null);

  return (
    <div className="bg-white border border-[#DDD8CE] rounded-2xl overflow-hidden shadow-xs font-['Poppins']">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#F4F1EA] text-[#68645D] font-bold text-[11px] uppercase tracking-wider border-b border-[#DDD8CE]">
              <th className="py-4.5 px-5">Prospect ID</th>
              <th className="py-4.5 px-5">Business Name</th>
              <th className="py-4.5 px-5">Contact Details</th>
              <th className="py-4.5 px-5">Country / Region</th>
              <th className="py-4.5 px-5">Source</th>
              <th className="py-4.5 px-5">Stage</th>
              <th className="py-4.5 px-5">Created</th>
              <th className="py-4.5 px-5">Owner</th>
              <th className="py-4.5 px-5">Prototype</th>
              <th className="py-4.5 px-5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DDD8CE] text-[#68645D]">
            {isLoading ? (
              <tr>
                <td colSpan={10} className="py-16 text-center">
                  <div className="inline-flex items-center gap-3 text-[#68645D] font-medium">
                    <span className="w-5 h-5 rounded-full border-2 border-[#245F6B]/20 border-t-[#245F6B] animate-spin" />
                    <span>Loading prospects...</span>
                  </div>
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-16 text-center text-[#68645D] font-medium italic">
                  No matching prospects found in pipeline.
                </td>
              </tr>
            ) : (
              leads.map((lead) => {
                const country = getCountryByName(lead.country || lead.city);
                const dupReport = findLeadDuplicates(lead, leads);
                const primaryContact = lead.contacts?.[0];

                return (
                  <tr
                    key={lead.id}
                    onClick={() => onSelectLead(lead.id)}
                    className="hover:bg-[#F0EDE5] transition-colors cursor-pointer group"
                  >
                    <td className="py-4.5 px-5 text-xs font-bold text-[#245F6B]">
                      {lead.id}
                    </td>

                    <td className="py-4.5 px-5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#292A29] group-hover:text-[#245F6B] transition-colors text-xs">
                          {lead.name}
                        </span>
                        {lead.chatgptPackage && (
                          <span
                            className="text-[10px] font-semibold text-[#245F6B] bg-[#E5EEEE] px-2 py-0.5 rounded-full flex items-center gap-1 border border-[#245F6B]/20"
                            title="Original ChatGPT Business Package Attached"
                          >
                            <FileText className="w-2.5 h-2.5" />
                            <span>Package</span>
                          </span>
                        )}
                        {dupReport.hasDuplicates && (
                          <span
                            className="text-[10px] font-semibold text-[#91651B] bg-[#D9A441]/15 px-2 py-0.5 rounded-full flex items-center gap-1"
                            title={`Duplicate: ${dupReport.matches.map((m) => m.reason).join(', ')}`}
                          >
                            <AlertTriangle className="w-3 h-3 text-[#D9A441]" />
                            <span>Dup ({dupReport.duplicateCount})</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#969188] truncate max-w-xs mt-0.5 leading-normal">
                        {lead.category || 'General Industry'}
                      </div>
                    </td>

                    <td className="py-4.5 px-5">
                      {primaryContact ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-[#292A29] font-medium text-xs">
                            <Phone className="w-3.5 h-3.5 text-[#4F765C] shrink-0" />
                            <span>{primaryContact.value}</span>
                          </div>
                          {primaryContact.contactPerson && (
                            <div className="text-[11px] text-[#969188] truncate max-w-[150px]">
                              {primaryContact.contactPerson}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#969188] text-[11px] italic">No contact logged</span>
                      )}
                    </td>

                    <td className="py-4.5 px-5">
                      <div className="flex items-center gap-1.5 font-medium text-xs text-[#292A29]">
                        <span className="text-sm">{country.flag}</span>
                        <span>{country.name}</span>
                      </div>
                      {lead.city && (
                        <div className="text-[11px] text-[#969188] truncate max-w-[140px] mt-0.5">
                          {lead.city}
                        </div>
                      )}
                    </td>

                    <td className="py-4.5 px-5 text-[#68645D] font-medium text-xs">
                      {lead.source}
                    </td>

                    <td className="py-4.5 px-5">
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase bg-[#E5EEEE] text-[#245F6B]">
                        {getStageLabel(lead.stage)}
                      </span>
                    </td>

                    <td className="py-4.5 px-5 text-[#68645D] text-[11px] font-mono whitespace-nowrap">
                      {formatDateTime(lead.createdAt)}
                    </td>

                    <td className="py-4.5 px-5 text-[#68645D] text-xs font-medium">
                      {lead.ownerName || 'Unassigned'}
                    </td>

                    <td className="py-4.5 px-5">
                      {lead.templateUrl ? (
                        <a
                          href={formatExternalUrl(lead.templateUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[#245F6B] hover:text-[#1E505A] bg-[#E5EEEE] hover:bg-[#E5EEEE]/80 px-3 py-1 rounded-full font-semibold flex items-center gap-1.5 text-xs w-max transition-colors shadow-2xs"
                        >
                          <Globe className="w-3.5 h-3.5 text-[#245F6B]" /> Mockup ↗
                        </a>
                      ) : (
                        <span className="text-[#969188] text-xs">Pending</span>
                      )}
                    </td>

                    <td className="py-4.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectLead(lead.id);
                          }}
                          className="px-4 py-1.5 bg-[#245F6B] hover:bg-[#1E505A] text-white rounded-full text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                          title="Open Lead Workspace"
                        >
                          Open Plan
                        </button>
                        {onDeleteLead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setLeadToDelete({ id: lead.id, name: lead.name });
                            }}
                            className="p-1.5 bg-[#F1E2E0] hover:bg-[#E4C8C4] text-[#A65B55] rounded-full text-xs transition-colors cursor-pointer border border-[#E4C8C4]"
                            title="Delete Lead"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={!!leadToDelete}
        title={`Delete Lead "${leadToDelete?.name}"?`}
        description="Are you sure you want to delete this lead and all associated data? This action cannot be undone."
        confirmLabel="Delete Lead"
        onClose={() => setLeadToDelete(null)}
        onConfirm={() => {
          if (leadToDelete && onDeleteLead) {
            onDeleteLead(leadToDelete.id, leadToDelete.name);
            setLeadToDelete(null);
          }
        }}
      />
    </div>
  );
};
