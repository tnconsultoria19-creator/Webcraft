import React, { useState } from 'react';
import {
  Copy,
  Check,
  Save,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Sparkles,
  FileCode,
  Globe,
  Layers,
  HelpCircle
} from 'lucide-react';
import { User, Lead } from '../../types';
import { parseChatGPTPackage, ParsedChatGPTResponse } from '../../lib/chatgptPackageParser';
import { createLeadInFirestore } from '../../lib/firestoreService';
import { findLeadDuplicates, LeadDuplicateReport } from '../../lib/searchUtils';
import { SavedPackageModal } from './SavedPackageModal';

interface CreateClientWorkspaceProps {
  currentUser: User;
  existingLeads: Lead[];
  onClientSaved: (savedLead: Lead) => void;
  onOpenPipeline?: () => void;
  onSelectLead?: (leadId: string) => void;
}

export const CreateClientWorkspace: React.FC<CreateClientWorkspaceProps> = ({
  currentUser,
  existingLeads,
  onClientSaved,
  onOpenPipeline,
  onSelectLead
}) => {
  // Input state
  const [rawPackage, setRawPackage] = useState('');
  const [parseError, setParseError] = useState('');

  // Parsed 3 outputs state
  const [parsedData, setParsedData] = useState<ParsedChatGPTResponse | null>(null);

  // Copy status feedback for each block
  const [copyGeminiStatus, setCopyGeminiStatus] = useState(false);
  const [copyJsonStatus, setCopyJsonStatus] = useState(false);
  const [copyNameStatus, setCopyNameStatus] = useState(false);

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [savedLead, setSavedLead] = useState<Lead | null>(null);

  // Duplicate warning state
  const [duplicateReport, setDuplicateReport] = useState<LeadDuplicateReport | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);

  // PROCESS PACKAGE
  const handleProcessPackage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setParseError('');
    setSaveSuccessMsg('');
    setSavedLead(null);
    setDuplicateReport(null);

    const result = parseChatGPTPackage(rawPackage);
    if (!result.success || !result.data) {
      setParseError(result.error || 'Failed to parse package.');
      return;
    }

    setParsedData(result.data);
  };

  // CLIPBOARD COPIES
  const handleCopyGemini = async () => {
    if (!parsedData) return;
    try {
      await navigator.clipboard.writeText(parsedData.geminiInstruction);
      setCopyGeminiStatus(true);
      setTimeout(() => setCopyGeminiStatus(false), 2200);
    } catch (err) {
      console.error('Failed to copy Gemini instruction:', err);
    }
  };

  const handleCopyJson = async () => {
    if (!parsedData) return;
    try {
      await navigator.clipboard.writeText(parsedData.rawClientProfileJson);
      setCopyJsonStatus(true);
      setTimeout(() => setCopyJsonStatus(false), 2200);
    } catch (err) {
      console.error('Failed to copy JSON:', err);
    }
  };

  const handleCopyProjectDomainName = async () => {
    if (!parsedData) return;
    try {
      await navigator.clipboard.writeText(parsedData.projectDomainName);
      setCopyNameStatus(true);
      setTimeout(() => setCopyNameStatus(false), 2200);
    } catch (err) {
      console.error('Failed to copy project / domain name:', err);
    }
  };

  // SAVE CLIENT TO FIRESTORE
  const handleSaveClient = async (forceBypassDuplicate = false) => {
    if (!parsedData) return;
    const { clientProfile } = parsedData;

    // Validate businessName
    if (!clientProfile.businessName || !clientProfile.businessName.trim()) {
      setParseError('Business name is required.');
      return;
    }

    // DUPLICATE DETECTION CHECK
    if (!forceBypassDuplicate) {
      const candidateLead: Partial<Lead> = {
        id: 'CANDIDATE',
        name: clientProfile.businessName,
        phone: clientProfile.phone || '',
        email: clientProfile.email || '',
        website: clientProfile.website || '',
        sourceUrl: clientProfile.sourceUrl || '',
        projectDomainName: parsedData.projectDomainName,
        chatgptPackage: {
          geminiInstruction: parsedData.geminiInstruction,
          clientProfileJson: parsedData.rawClientProfileJson,
          businessName: parsedData.businessName,
          projectDomainName: parsedData.projectDomainName,
          savedAt: new Date().toISOString()
        },
        contacts: [
          ...(clientProfile.phone
            ? [
                {
                  id: 'c1',
                  leadId: 'CANDIDATE',
                  type: 'primary_phone' as const,
                  value: clientProfile.phone,
                  normalizedValue: clientProfile.phone,
                  createdAt: new Date().toISOString()
                }
              ]
            : []),
          ...(clientProfile.email
            ? [
                {
                  id: 'c2',
                  leadId: 'CANDIDATE',
                  type: 'email' as const,
                  value: clientProfile.email,
                  normalizedValue: clientProfile.email,
                  createdAt: new Date().toISOString()
                }
              ]
            : [])
        ]
      };

      const dupCheck = findLeadDuplicates(candidateLead as Lead, existingLeads);
      if (dupCheck.hasDuplicates) {
        setDuplicateReport(dupCheck);
        setShowDuplicateModal(true);
        return;
      }
    }

    setIsSaving(true);
    setParseError('');

    try {
      const channelsList: string[] = Array.isArray(clientProfile.channels)
        ? clientProfile.channels
        : ['WhatsApp', 'Phone', 'Email'];

      const contacts = [];
      if (clientProfile.phone) {
        contacts.push({
          type: 'primary_phone' as const,
          value: clientProfile.phone.toString().trim(),
          contactPerson: clientProfile.contactPerson || ''
        });
      }
      if (clientProfile.email) {
        contacts.push({
          type: 'email' as const,
          value: clientProfile.email.toString().trim(),
          contactPerson: clientProfile.contactPerson || ''
        });
      }

      const newLead = await createLeadInFirestore(
        {
          name: clientProfile.businessName.toString().trim(),
          source: clientProfile.source || 'Other',
          sourceUrl: clientProfile.sourceUrl || '',
          sourceId: clientProfile.sourceId || '',
          priority: (clientProfile.priority as any) || 'normal',
          contactPerson: clientProfile.contactPerson || '',
          phone: clientProfile.phone || '',
          email: clientProfile.email || '',
          website: clientProfile.website || '',
          city: clientProfile.city || '',
          category: clientProfile.category || '',
          description: clientProfile.description || '',
          channels: channelsList,
          createdMethod: 'import',
          chatgptPackage: {
            geminiInstruction: parsedData.geminiInstruction,
            clientProfileJson: parsedData.rawClientProfileJson,
            businessName: parsedData.businessName,
            projectDomainName: parsedData.projectDomainName,
            savedAt: new Date().toISOString()
          },
          contacts
        },
        currentUser.id,
        currentUser.displayName
      );

      setSavedLead(newLead);
      setSaveSuccessMsg('Client saved successfully.');
      setShowDuplicateModal(false);
      onClientSaved(newLead);
    } catch (err: any) {
      setParseError(err.message || 'Failed to save client to Firestore.');
    } finally {
      setIsSaving(false);
    }
  };

  // RESET / PROCESS ANOTHER
  const handleReset = () => {
    setRawPackage('');
    setParsedData(null);
    setParseError('');
    setSaveSuccessMsg('');
    setSavedLead(null);
    setDuplicateReport(null);
    setShowDuplicateModal(false);
    setIsPackageModalOpen(false);
  };

  return (
    <div className="space-y-6 font-['Poppins']">
      
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#DDD8CE] p-5 rounded-2xl shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#292A29] tracking-tight">Create Client</h1>
          <p className="text-xs text-[#68645D] mt-0.5">Paste the complete ChatGPT business package below.</p>
        </div>

        {parsedData && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-3.5 py-1.5 rounded-full border border-[#DDD8CE] text-xs font-semibold text-[#68645D] hover:text-[#292A29] hover:bg-[#F0EDE5] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>+ Process Another Package</span>
            </button>
          </div>
        )}
      </div>

      {/* ERROR BANNER */}
      {parseError && (
        <div className="p-4 bg-[#A65B55]/10 border border-[#A65B55]/30 text-[#A65B55] text-xs rounded-xl font-semibold flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-[#A65B55]" />
          <span>{parseError}</span>
        </div>
      )}

      {/* SUCCESS BANNER */}
      {saveSuccessMsg && savedLead && (
        <div className="p-4 bg-[#4F765C]/10 border border-[#4F765C]/30 text-[#4F765C] text-xs rounded-2xl font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#4F765C]" />
            <div>
              <span>{saveSuccessMsg}</span>
              <span className="text-[#292A29] ml-1">
                Created <strong>{savedLead.name}</strong> ({savedLead.id}) in pipeline stage <strong>Captured</strong>.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {onSelectLead && (
              <button
                type="button"
                onClick={() => onSelectLead(savedLead.id)}
                className="px-3.5 py-1.5 bg-white border border-[#DDD8CE] text-[#292A29] rounded-full text-xs font-bold hover:bg-[#F0EDE5] transition-colors cursor-pointer shadow-xs"
              >
                View Client
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsPackageModalOpen(true)}
              className="px-3.5 py-1.5 bg-[#245F6B] text-white rounded-full text-xs font-bold hover:bg-[#1E505A] transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>View Package</span>
            </button>
            {onOpenPipeline && (
              <button
                type="button"
                onClick={onOpenPipeline}
                className="px-3 py-1 bg-[#F0EDE5] border border-[#DDD8CE] text-[#68645D] hover:text-[#292A29] rounded-full text-[11px] font-semibold transition-colors cursor-pointer"
              >
                Pipeline
              </button>
            )}
          </div>
        </div>
      )}

      {/* INPUT WORKSPACE — PARTIAL PACKAGES ARE ALLOWED */}
      {(
        <form onSubmit={handleProcessPackage} className="bg-white border border-[#DDD8CE] rounded-3xl p-6 shadow-xs space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#292A29]">ChatGPT Business Package / Any Output Block</label>
            <textarea
              value={rawPackage}
              onChange={(e) => setRawPackage(e.target.value)}
              placeholder="Paste the Gemini instruction, Client Profile JSON, Business/Project Name, or the complete package. Any one is enough to process."
              rows={12}
              className="w-full bg-[#FBF9F5] border border-[#DDD8CE] text-[#292A29] rounded-2xl p-4 text-xs font-mono leading-relaxed focus:outline-none focus:border-[#245F6B] transition-colors resize-y min-h-[260px]"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <p className="text-[11px] text-[#969188]">
              You may paste one output, two outputs, or all three. Missing outputs will not block processing.
            </p>

            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 bg-[#245F6B] hover:bg-[#1E505A] text-white font-bold text-xs rounded-full shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{parsedData ? 'UPDATE AVAILABLE OUTPUTS' : 'PROCESS AVAILABLE OUTPUTS'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}
      
      {parsedData && (
        /* STEP 2: THREE OUTPUT BLOCKS */

        <div className="space-y-6">

          {/* OUTPUT BLOCK 1: GEMINI IMPLEMENTATION INSTRUCTION */}
          <div className="bg-white border border-[#DDD8CE] rounded-3xl p-6 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#DDD8CE]/60 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#245F6B] block">Block 1</span>
                <h3 className="text-sm font-bold text-[#292A29]">GEMINI IMPLEMENTATION INSTRUCTION</h3>
              </div>

              <button
                type="button"
                onClick={handleCopyGemini}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  copyGeminiStatus
                    ? 'bg-[#4F765C] text-white'
                    : 'bg-[#245F6B] text-white hover:bg-[#1E505A]'
                }`}
              >
                {copyGeminiStatus ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copyGeminiStatus ? 'Copied' : 'COPY GEMINI INSTRUCTION'}</span>
              </button>
            </div>

            <div className="bg-[#FBF9F5] border border-[#DDD8CE] rounded-2xl p-4 max-h-[340px] overflow-y-auto font-mono text-xs text-[#292A29] whitespace-pre-wrap leading-relaxed select-text">
              {parsedData.geminiInstruction}
            </div>
          </div>

          {/* OUTPUT BLOCK 2: CLIENT PROFILE JSON */}
          <div className="bg-white border border-[#DDD8CE] rounded-3xl p-6 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#DDD8CE]/60 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#245F6B] block">Block 2</span>
                <h3 className="text-sm font-bold text-[#292A29]">CLIENT PROFILE</h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border shadow-xs ${
                    copyJsonStatus
                      ? 'bg-[#4F765C] text-white border-[#4F765C]'
                      : 'bg-white text-[#292A29] border-[#DDD8CE] hover:bg-[#F0EDE5]'
                  }`}
                >
                  {copyJsonStatus ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copyJsonStatus ? 'Copied' : 'COPY JSON'}</span>
                </button>

                <button
                  type="button"
                  disabled={isSaving || !!savedLead}
                  onClick={() => handleSaveClient(false)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    savedLead
                      ? 'bg-[#4F765C] text-white opacity-90 cursor-default'
                      : 'bg-[#245F6B] text-white hover:bg-[#1E505A]'
                  }`}
                >
                  {savedLead ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                  <span>
                    {isSaving
                      ? 'Saving...'
                      : savedLead
                      ? 'Saved to System'
                      : 'SAVE CLIENT'}
                  </span>
                </button>
              </div>
            </div>

            <div className="bg-[#FBF9F5] border border-[#DDD8CE] rounded-2xl p-4 max-h-[340px] overflow-y-auto font-mono text-xs text-[#292A29] whitespace-pre-wrap leading-relaxed select-text">
              {parsedData.rawClientProfileJson}
            </div>
          </div>

          {/* OUTPUT BLOCK 3: PROJECT / DOMAIN NAME */}
          <div className="bg-white border border-[#DDD8CE] rounded-3xl p-6 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#DDD8CE]/60 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#245F6B] block">Block 3</span>
                <h3 className="text-sm font-bold text-[#292A29]">PROJECT / DOMAIN NAME</h3>
              </div>

              <button
                type="button"
                onClick={handleCopyProjectDomainName}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  copyNameStatus
                    ? 'bg-[#4F765C] text-white'
                    : 'bg-[#245F6B] text-white hover:bg-[#1E505A]'
                }`}
              >
                {copyNameStatus ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copyNameStatus ? 'Copied' : 'COPY PROJECT / DOMAIN NAME'}</span>
              </button>
            </div>

            <div className="bg-[#FBF9F5] border border-[#DDD8CE] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-base font-bold text-[#292A29] font-mono tracking-tight select-text">
                {parsedData.projectDomainName}
              </div>
              <span className="text-[11px] text-[#969188] font-medium font-mono">
                Gemini folder: {parsedData.projectDomainName}/ • ZIP: {parsedData.projectDomainName}.zip
              </span>
            </div>
          </div>

        </div>
      )}

      {/* DUPLICATE WARNING MODAL */}
      {showDuplicateModal && duplicateReport && (() => {
        const hasDomainCollision = duplicateReport.matches.some((m) => m.field === 'project_domain');
        const domainMatch = duplicateReport.matches.find((m) => m.field === 'project_domain');

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs font-['Poppins']">
            <div className="max-w-lg w-full bg-white border border-[#DDD8CE] rounded-3xl p-6 shadow-2xl space-y-5 text-[#292A29] animate-in fade-in">
              
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  hasDomainCollision ? 'bg-[#A65B55]/15 text-[#A65B55]' : 'bg-[#D9A441]/15 text-[#D9A441]'
                }`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#292A29]">
                    {hasDomainCollision ? 'Project / Domain Name already exists.' : 'Potential Duplicate Detected'}
                  </h3>
                  <p className="text-xs text-[#68645D]">
                    {hasDomainCollision
                      ? 'The Project / Domain Name is already assigned to an existing client.'
                      : 'This business matches records already existing in WebCraft Studio.'}
                  </p>
                </div>
              </div>

              {hasDomainCollision && domainMatch && (
                <div className="p-3.5 bg-[#A65B55]/10 border border-[#A65B55]/30 rounded-2xl space-y-2 text-xs text-[#A65B55]">
                  <div className="font-bold">Unique Identifier Conflict:</div>
                  <div className="text-[11px] leading-relaxed">
                    Identifier <code className="font-mono font-bold text-[#245F6B] bg-[#E5EEEE] px-1.5 py-0.5 rounded">{domainMatch.matchedValue}</code> is already assigned to <strong>{domainMatch.leadName}</strong> ({domainMatch.leadId}).
                  </div>
                  <div className="text-[11px] text-[#68645D] pt-1">
                    ChatGPT Output 3 must generate a distinctive, unique Project / Domain Name to ensure live website links attach deterministically. Please correct the domain name in Output 3 before saving.
                  </div>
                </div>
              )}

              {/* Matching items breakdown */}
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {duplicateReport.matches.map((match, idx) => (
                  <div key={idx} className="p-3 bg-[#FBF9F5] border border-[#DDD8CE] rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#292A29]">{match.leadName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E5EEEE] text-[#245F6B] font-semibold">
                        {match.leadId} • {match.stage}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#68645D] leading-snug">{match.reason}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-[#DDD8CE]">
                <button
                  type="button"
                  onClick={() => setShowDuplicateModal(false)}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-[#68645D] hover:text-[#292A29] rounded-full border border-[#DDD8CE] hover:bg-[#F0EDE5] transition-colors cursor-pointer"
                >
                  {hasDomainCollision ? 'Back to Edit / Correct' : 'Cancel / Do Not Save'}
                </button>

                {onSelectLead && duplicateReport.matches[0] && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowDuplicateModal(false);
                      onSelectLead(duplicateReport.matches[0].leadId);
                    }}
                    className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-[#245F6B] bg-[#E5EEEE] hover:bg-[#245F6B]/15 rounded-full transition-colors cursor-pointer"
                  >
                    View Existing Client
                  </button>
                )}

                {!hasDomainCollision && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSaveClient(true)}
                    className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-[#D9A441] hover:bg-[#C08E33] rounded-full shadow-xs transition-colors cursor-pointer"
                  >
                    {isSaving ? 'Saving...' : 'Save Anyway'}
                  </button>
                )}
              </div>

            </div>
          </div>
        );
      })()}

      {/* Saved Package Viewer Modal */}
      {savedLead?.chatgptPackage && (
        <SavedPackageModal
          isOpen={isPackageModalOpen}
          onClose={() => setIsPackageModalOpen(false)}
          chatgptPackage={savedLead.chatgptPackage}
          businessName={savedLead.name}
          leadId={savedLead.id}
        />
      )}

    </div>
  );
};
