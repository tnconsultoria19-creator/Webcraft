import React, { useState } from 'react';
import { Globe, Clock, ChevronLeft, ChevronRight, ExternalLink, Trash2, AlertTriangle, FileText, Calendar, CheckCircle2, Pencil, Hand } from 'lucide-react';
import { Lead, LeadStage } from '../../types';
import { formatTimeAgo, formatDateTime, formatExternalUrl, getNextStage, getPreviousStage } from '../../lib/utils';
import { getCountryByName } from '../../lib/currencyUtils';
import { findLeadDuplicates } from '../../lib/searchUtils';
import { ConfirmModal } from '../common/ConfirmModal';
import { claimLeadOwner } from '../../lib/firestoreService';

interface LeadKanbanViewProps {
  leads: Lead[];
  currentUser: { id: string; displayName: string; role?: string };
  isLoading?: boolean;
  onSelectLead: (leadId: string) => void;
  onUpdateStage: (leadId: string, newStage: LeadStage) => void;
  onDeleteLead?: (leadId: string, leadName: string) => void;
}

const KANBAN_COLUMNS: { id: LeadStage; title: string }[] = [
  { id: 'captured', title: 'Captured Leads' },
  { id: 'template_in_progress', title: 'Prototype Building' },
  { id: 'ready_for_outreach', title: 'Ready for Outreach' },
  { id: 'approved', title: 'Approved' },
  { id: 'outreach_sent', title: 'Outreach Sent' },
  { id: 'response_received', title: 'Awaiting Response' },
  { id: 'interested', title: 'Interested Leads' },
  { id: 'won', title: 'Won / Production' }
];

export const LeadKanbanView: React.FC<LeadKanbanViewProps> = ({
  leads,
  currentUser,
  isLoading = false,
  onSelectLead,
  onUpdateStage,
  onDeleteLead
}) => {
  const [leadToDelete, setLeadToDelete] = useState<{ id: string; name: string } | null>(null);
  const [grabbingLeadId, setGrabbingLeadId] = useState<string | null>(null);

  const handleGrabLead = async (lead: Lead) => {
    if (lead.ownerId || grabbingLeadId) return;
    setGrabbingLeadId(lead.id);
    try {
      await claimLeadOwner(lead.id, currentUser.id, currentUser.displayName);
    } catch (err: any) {
      alert(err?.message || 'Failed to grab this prospect.');
    } finally {
      setGrabbingLeadId(null);
    }
  };
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px] bg-white border border-[#DDD8CE] rounded-2xl">
        <div className="inline-flex items-center gap-3 text-[#68645D] font-medium text-sm">
          <span className="w-5 h-5 rounded-full border-2 border-[#245F6B]/20 border-t-[#245F6B] animate-spin" />
          <span>Loading prospects...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 pt-1 min-h-[650px] font-['Poppins']">
      {KANBAN_COLUMNS.map((col) => {
        const columnLeads = leads.filter((l) => {
          if (col.id === 'captured') return l.stage === 'new_lead' || l.stage === 'captured';
          if (col.id === 'ready_for_outreach') return l.stage === 'ready_for_outreach' || l.stage === 'template_completed';
          if (col.id === 'outreach_sent') return l.stage === 'outreach_sent' || l.stage === 'outreach_in_progress';
          if (col.id === 'response_received') return l.stage === 'response_received' || l.stage === 'awaiting_response';
          if (col.id === 'interested') return l.stage === 'interested' || l.stage === 'negotiation';
          if (col.id === 'won') return l.stage === 'won' || l.stage === 'website_production' || l.stage === 'completed';
          return l.stage === col.id;
        });

        return (
          <div key={col.id} className="w-80 shrink-0 flex flex-col bg-white rounded-2xl border border-[#DDD8CE] shadow-xs overflow-hidden">
            {/* Column Header */}
            <div className="p-4 bg-[#F4F1EA] text-[#292A29] flex justify-between items-center border-b border-[#DDD8CE]">
              <h3 className="font-bold text-xs text-[#292A29] tracking-tight uppercase">{col.title}</h3>
              <span className="text-xs font-bold px-2.5 py-0.5 bg-[#245F6B] text-white rounded-full">
                {columnLeads.length}
              </span>
            </div>

            {/* Column Cards */}
            <div className="p-3.5 space-y-3 flex-1 overflow-y-auto max-h-[72vh] bg-[#F0EDE5]/50">
              {columnLeads.length === 0 ? (
                <div className="py-12 text-center text-[#68645D] text-xs font-medium italic border border-dashed border-[#DDD8CE] rounded-xl bg-white">
                  No prospects in stage
                </div>
              ) : (
                columnLeads.map((lead) => {
                  const prevStage = getPreviousStage(lead.stage);
                  const nextStage = getNextStage(lead.stage);
                  const country = getCountryByName(lead.country || lead.city);
                  const dupReport = findLeadDuplicates(lead, leads);

                  return (
                    <div
                      key={lead.id}
                      onClick={() => onSelectLead(lead.id)}
                      className="bg-white hover:bg-[#E5EEEE]/20 border border-[#DDD8CE] hover:border-[#245F6B] rounded-2xl p-4 cursor-pointer transition-all shadow-xs group space-y-2.5"
                    >
                      {/* Header ID & Country */}
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1.5 font-medium text-[#292A29]">
                          <span className="text-sm leading-none">{country.flag}</span>
                          <span className=" text-[#245F6B] font-bold bg-[#E5EEEE] px-2 py-0.5 rounded text-[11px]">
                            {lead.id}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {lead.priority === 'urgent' || lead.priority === 'high' ? (
                            <span className="text-white font-bold bg-[#A65B55] px-2 py-0.5 rounded-full uppercase text-[10px]">
                              {lead.priority}
                            </span>
                          ) : (
                            <span className="text-[#68645D] text-[11px] font-semibold">{country.name}</span>
                          )}
                          {onDeleteLead && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLeadToDelete({ id: lead.id, name: lead.name });
                              }}
                              className="p-1 text-[#A65B55] hover:bg-[#F1E2E0] rounded transition-colors cursor-pointer"
                              title="Delete Lead"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Business Name & Description & Duplicate indicator */}
                      <div>
                        <div className="flex items-center justify-between gap-1.5">
                          <h4 className="font-bold text-[#292A29] text-xs group-hover:text-[#245F6B] transition-colors line-clamp-1">
                            {lead.name}
                          </h4>
                          {dupReport.hasDuplicates && (
                            <span
                              className="text-[10px] font-semibold text-[#91651B] bg-[#D9A441]/15 px-1.5 py-0.5 rounded-full flex items-center gap-1 shrink-0"
                              title={dupReport.matches.map(m => m.reason).join('; ')}
                            >
                              <AlertTriangle className="w-3 h-3 text-[#D9A441]" />
                              <span>Dup ({dupReport.duplicateCount})</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#68645D] line-clamp-2 mt-0.5 leading-relaxed">
                          {lead.description || `${lead.category || 'Business'} in ${lead.city || country.name}`}
                        </p>
                      </div>

                      {/* Prototype Indicator & Package Badge */}
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        {lead.chatgptPackage && (
                          <span
                            className="bg-[#E5EEEE] text-[#245F6B] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 text-[10px] border border-[#245F6B]/20"
                            title="Original ChatGPT Business Package Attached"
                          >
                            <FileText className="w-2.5 h-2.5" />
                            <span>Package</span>
                          </span>
                        )}
                        {lead.templateUrl ? (
                          <a
                            href={formatExternalUrl(lead.templateUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#E5EEEE] hover:bg-[#245F6B] text-[#245F6B] hover:text-white px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5 transition-colors text-[11px] border border-[#245F6B]/20"
                          >
                            <Globe className="w-3 h-3 text-[#245F6B]" />
                            <span>Mockup Ready ↗</span>
                          </a>
                        ) : (
                          <span className="bg-[#F0EDE5] text-[#68645D] px-2.5 py-0.5 rounded-full text-[11px]">
                            Prototype Pending
                          </span>
                        )}
                      </div>

                      {/* Created Timestamp */}
                      <div className="flex items-center gap-1 text-[10px] text-[#969188] font-mono">
                        <Calendar className="w-3 h-3" />
                        <span>Created: {formatDateTime(lead.createdAt)}</span>
                      </div>

                      {/* Stage Movement Controls */}
                      <div
                        className="pt-2 border-t border-[#DDD8CE] flex items-center justify-between gap-2 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {col.id === 'ready_for_outreach' && (
                          <div className="w-full flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onSelectLead(lead.id)}
                              className="flex-1 px-3 py-1.5 bg-[#F0EDE5] hover:bg-[#E5EEEE] text-[#245F6B] font-bold rounded-full flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs border border-[#245F6B]/20"
                              title="Review and edit the outreach message"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Review & Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onUpdateStage(lead.id, 'approved')}
                              className="flex-1 px-3 py-1.5 bg-[#4F765C] hover:bg-[#3F614A] text-white font-bold rounded-full flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs shadow-xs"
                              title="Approve the reviewed message and move the lead to Approved"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                          </div>
                        )}
                        {col.id !== 'ready_for_outreach' && (
                          <>
                        <button
                          type="button"
                          onClick={() => prevStage && onUpdateStage(lead.id, prevStage as LeadStage)}
                          disabled={!prevStage}
                          className="px-2.5 py-1 bg-[#F0EDE5] hover:bg-[#e9ecef] disabled:opacity-30 text-[#292A29] font-medium rounded-full flex items-center gap-1 transition-colors disabled:cursor-not-allowed cursor-pointer text-xs"
                          title="Reverse pipeline stage"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span>Back</span>
                        </button>

                        {lead.ownerId ? (
                          <span className="text-[11px] text-[#68645D] truncate max-w-[85px] font-medium">
                            {lead.ownerName || 'Assigned'}
                          </span>
                         ) : false ? (
                          <span className="text-[10px] text-[#969188] truncate max-w-[85px]">
                            Open for team
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleGrabLead(lead)}
                            disabled={grabbingLeadId === lead.id}
                            className="px-2.5 py-1 bg-[#E5EEEE] hover:bg-[#245F6B] disabled:opacity-50 text-[#245F6B] hover:text-white font-semibold rounded-full flex items-center gap-1 transition-colors cursor-pointer disabled:cursor-not-allowed text-[10px]"
                            title="Grab this prospect"
                          >
                            <Hand className="w-3 h-3" />
                            <span>{grabbingLeadId === lead.id ? 'Grabbing...' : 'Grab'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => nextStage && onUpdateStage(lead.id, nextStage as LeadStage)}
                          disabled={!nextStage}
                          className="px-3 py-1 bg-[#245F6B] hover:bg-[#1E505A] disabled:opacity-30 text-white font-medium rounded-full flex items-center gap-1 transition-colors disabled:cursor-not-allowed cursor-pointer text-xs shadow-xs"
                          title={col.id === 'approved' ? 'Mark the outreach as sent' : 'Advance pipeline stage'}
                        >
                          <span>{col.id === 'approved' ? 'Mark Sent' : 'Forward'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                          </>
                        )}
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}

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
