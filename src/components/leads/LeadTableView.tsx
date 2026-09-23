import React, { useEffect, useMemo, useState } from 'react';
import { Globe, Eye, ExternalLink, Phone, AlertTriangle, Trash2, FileText, Check, Minus, Hand } from 'lucide-react';
import { Lead, User, LeadStage } from '../../types';
import { getStageLabel, formatDateTime, formatExternalUrl } from '../../lib/utils';
import { getCountryByName } from '../../lib/currencyUtils';
import { findLeadDuplicates } from '../../lib/searchUtils';
import { ConfirmModal } from '../common/ConfirmModal';
import { claimLeadOwner } from '../../lib/firestoreService';

interface LeadTableViewProps {
  leads: Lead[];
  currentUser: User;
  isLoading?: boolean;
  onSelectLead: (leadId: string) => void;
  onDeleteLead?: (leadId: string, leadName: string) => void;
  onBulkDelete?: (leadIds: string[]) => Promise<void>;
  onUpdateStage?: (leadId: string, newStage: LeadStage) => void;
}

export const LeadTableView: React.FC<LeadTableViewProps> = ({
  leads,
  currentUser,
  isLoading = false,
  onSelectLead,
  onDeleteLead,
  onBulkDelete,
  onUpdateStage
}) => {
  const [leadToDelete, setLeadToDelete] = useState<{ id: string; name: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [grabbingLeadId, setGrabbingLeadId] = useState<string | null>(null);
  const [claimedOwners, setClaimedOwners] = useState<Record<string, { id: string; name: string }>>({});

  const visibleLeadIds = useMemo(() => leads.map((lead) => lead.id), [leads]);
  const selectedVisibleCount = visibleLeadIds.filter((id) => selectedIds.has(id)).length;
  const allVisibleSelected = visibleLeadIds.length > 0 && selectedVisibleCount === visibleLeadIds.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;

  useEffect(() => {
    setSelectedIds((previous) => {
      const visible = new Set(visibleLeadIds);
      const next = new Set(Array.from(previous).filter((id) => visible.has(id)));
      return next.size === previous.size ? previous : next;
    });
  }, [visibleLeadIds]);

  const toggleLeadSelection = (leadId: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((previous) => {
      if (allVisibleSelected) return new Set();
      return new Set(visibleLeadIds);
    });
  };

  const handleGrabLead = async (lead: Lead) => {
    if (lead.ownerId || grabbingLeadId) return;

    setGrabbingLeadId(lead.id);
    try {
      await claimLeadOwner(lead.id, currentUser.id, currentUser.displayName);
      setClaimedOwners((previous) => ({
        ...previous,
        [lead.id]: { id: currentUser.id, name: currentUser.displayName }
      }));
    } catch (err: any) {
      alert(err?.message || 'Failed to grab this prospect.');
    } finally {
      setGrabbingLeadId(null);
    }
  };

  const confirmBulkDelete = async () => {
    if (!onBulkDelete || !selectedIds.size) return;
    setIsBulkDeleting(true);
    try {
      await onBulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
    } catch (err) {
      alert((err as any)?.message || 'Failed to delete selected prospects.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <div className="bg-white border border-[#DDD8CE] rounded-2xl overflow-hidden shadow-xs font-['Poppins']">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-[#FAF7F2] border-b border-[#DDD8CE]">
        <div className="text-xs font-semibold text-[#68645D]">
          {selectedVisibleCount > 0 ? <span><strong className="text-[#245F6B]">{selectedVisibleCount}</strong> selected</span> : <span>Select prospects to perform bulk actions</span>}
        </div>
        {selectedVisibleCount > 0 && onBulkDelete && (
          <button
            type="button"
            onClick={() => setShowBulkDeleteConfirm(true)}
            disabled={isBulkDeleting}
            className="px-3.5 py-1.5 bg-[#A65B55] hover:bg-[#8F4D48] text-white rounded-full text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Selected ({selectedVisibleCount})
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#F4F1EA] text-[#68645D] font-bold text-[11px] uppercase tracking-wider border-b border-[#DDD8CE]">
              <th className="py-3 px-2 w-10">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleSelectAll(); }}
                  disabled={!visibleLeadIds.length || isBulkDeleting}
                  className="w-7 h-7 rounded-lg border border-[#DDD8CE] bg-white hover:bg-[#E5EEEE] flex items-center justify-center disabled:opacity-40"
                  title={allVisibleSelected ? "Deselect all visible prospects" : "Select all visible prospects"}
                >
                  {allVisibleSelected ? <Check className="w-4 h-4 text-[#245F6B]" /> : someVisibleSelected ? <Minus className="w-4 h-4 text-[#245F6B]" /> : null}
                </button>
              </th>
              <th className="py-3 px-3">Prospect ID</th>
              <th className="py-3 px-3">Business Name</th>
              <th className="py-3 px-3">Contact Details</th>
              <th className="py-3 px-3">Country / Region</th>
              <th className="py-3 px-3">Source</th>
              <th className="py-3 px-3">Stage</th>
              <th className="py-3 px-3">Created</th>
              <th className="py-3 px-3">Owner / Grab</th>
              <th className="py-3 px-3">Prototype</th>
              <th className="py-3 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DDD8CE] text-[#68645D]">
            {isLoading ? (
              <tr>
                <td colSpan={11} className="py-16 text-center">
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
                const claimedOwner = claimedOwners[lead.id];
                const ownerId = claimedOwner?.id || lead.ownerId;
                const ownerName = claimedOwner?.name || lead.ownerName;
                const isOwned = Boolean(ownerId);
                const isOwnedByMe = ownerId === currentUser.id;

                return (
                  <tr
                    key={lead.id}
                    onClick={() => onSelectLead(lead.id)}
                    className="hover:bg-[#F0EDE5] transition-colors cursor-pointer group"
                  >
                    <td className="py-4.5 px-3 w-12">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleLeadSelection(lead.id); }}
                        disabled={isBulkDeleting}
                        className="w-7 h-7 rounded-lg border border-[#DDD8CE] bg-white hover:bg-[#E5EEEE] flex items-center justify-center"
                        title={selectedIds.has(lead.id) ? "Deselect prospect" : "Select prospect"}
                      >
                        {selectedIds.has(lead.id) && <Check className="w-4 h-4 text-[#245F6B]" />}
                      </button>
                    </td>

                    <td className="py-3 px-3 text-xs font-bold text-[#245F6B]">
                      {lead.id}
                    </td>

                    <td className="py-3 px-3">
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

                    <td className="py-3 px-3">
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

                    <td className="py-3 px-3">
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

                    <td className="py-3 px-3 text-[#68645D] font-medium text-xs">
                      {lead.source}
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase bg-[#E5EEEE] text-[#245F6B]">
                        {getStageLabel(lead.stage)}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-[#68645D] text-[11px] font-mono whitespace-nowrap">
                      {formatDateTime(lead.createdAt)}
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <div className="min-w-[90px]">
                          <div className="text-xs font-semibold text-[#292A29]">
                            {isOwnedByMe ? 'You' : ownerName || 'Unassigned'}
                          </div>
                          <div className="text-[10px] text-[#969188]">
                            {isOwnedByMe ? 'Grabbed by you' : isOwned ? `Grabbed by ${ownerName}` : 'Not grabbed yet'}
                          </div>
                        </div>
                        {isOwnedByMe && (
                          <button
                            type="button"
                            disabled
                            className="px-2.5 py-1 bg-[#E5EEEE] text-[#245F6B] rounded-full text-[11px] font-bold flex items-center gap-1 opacity-80 cursor-default"
                            title="This prospect is already grabbed by you"
                          >
                            <Hand className="w-3.5 h-3.5" />
                            Grabbed
                          </button>
                        )}
                        {!isOwned && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleGrabLead(lead);
                            }}
                            disabled={grabbingLeadId === lead.id}
                            className="px-2.5 py-1 bg-[#4F765C] hover:bg-[#3F614A] text-white rounded-full text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Grab this prospect"
                          >
                            <Hand className="w-3.5 h-3.5" />
                            {grabbingLeadId === lead.id ? 'Grabbing...' : 'Grab'}
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3">
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

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {lead.stage === 'ready_for_outreach' && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectLead(lead.id);
                              }}
                              className="px-3 py-1.5 bg-white hover:bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-full text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Review & Edit
                            </button>
                            {onUpdateStage && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUpdateStage(lead.id, 'approved');
                                }}
                                className="px-3 py-1.5 bg-[#4F765C] hover:bg-[#3F614A] text-white rounded-full text-xs font-bold transition-colors cursor-pointer"
                              >
                                Approve
                              </button>
                            )}
                          </>
                        )}
                        {lead.stage === 'approved' && onUpdateStage && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateStage(lead.id, 'outreach_sent');
                            }}
                            className="px-3 py-1.5 bg-[#245F6B] hover:bg-[#1E505A] text-white rounded-full text-xs font-bold transition-colors cursor-pointer"
                          >
                            Mark Sent
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectLead(lead.id);
                          }}
                          className="px-3 py-1.5 bg-[#245F6B] hover:bg-[#1E505A] text-white rounded-full text-xs font-semibold transition-colors cursor-pointer shadow-xs"
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
        isOpen={showBulkDeleteConfirm}
        title={`Delete ${selectedVisibleCount} selected prospect${selectedVisibleCount === 1 ? '' : 's'}?`}
        description="This will remove the selected prospects from the active pipeline. Their records are soft-deleted and an audit entry is recorded. This action cannot be undone from the pipeline."
        confirmLabel={isBulkDeleting ? 'Deleting...' : 'Delete Selected'}
        onClose={() => !isBulkDeleting && setShowBulkDeleteConfirm(false)}
        onConfirm={confirmBulkDelete}
      />

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