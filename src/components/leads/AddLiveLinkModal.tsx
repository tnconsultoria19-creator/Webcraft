import React, { useState, useEffect, useMemo } from 'react';
import {
  Link as LinkIcon,
  ExternalLink,
  Copy,
  Check,
  Search,
  AlertTriangle,
  CheckCircle2,
  X,
  Globe,
  Trash2,
  RefreshCw,
  UserCheck,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { Lead, User } from '../../types';
import {
  matchUrlToLeads,
  normalizeInputUrl,
  MatchCandidate,
  MatchEvaluationResult,
  MatchMethod
} from '../../lib/domainMatcher';
import {
  attachLiveWebsiteLinkToLead,
  removeLiveWebsiteLinkFromLead,
  reassignLiveWebsiteLinkToLead
} from '../../lib/firestoreService';
import { formatExternalUrl } from '../../lib/utils';

interface AddLiveLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  leads: Lead[];
  onSelectLead?: (leadId: string) => void;
}

export const AddLiveLinkModal: React.FC<AddLiveLinkModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  leads,
  onSelectLead
}) => {
  const [rawUrl, setRawUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // View States:
  // 'input' | 'confirm_candidates' | 'search_fallback' | 'success' | 'already_attached' | 'reassign'
  const [viewState, setViewState] = useState<
    'input' | 'confirm_candidates' | 'search_fallback' | 'success' | 'already_attached' | 'reassign'
  >('input');

  const [evaluationResult, setEvaluationResult] = useState<MatchEvaluationResult | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<MatchCandidate | null>(null);
  const [attachedLead, setAttachedLead] = useState<Lead | null>(null);
  const [attachedUrl, setAttachedUrl] = useState<string>('');
  const [attachedProjectDomain, setAttachedProjectDomain] = useState<string>('');
  const [attachedMatchMethod, setAttachedMatchMethod] = useState<MatchMethod>('Project Domain Name');

  // Search & Reassignment state
  const [searchQuery, setSearchQuery] = useState('');
  const [manualSelectedLead, setManualSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRawUrl('');
      setIsProcessing(false);
      setErrorMessage('');
      setSuccessMessage('');
      setCopiedLink(false);
      setViewState('input');
      setEvaluationResult(null);
      setSelectedCandidate(null);
      setAttachedLead(null);
      setAttachedUrl('');
      setAttachedProjectDomain('');
      setAttachedMatchMethod('Project Domain Name');
      setSearchQuery('');
      setManualSelectedLead(null);
    }
  }, [isOpen]);

  // Filtered leads for manual selection / reassignment
  const filteredSearchLeads = useMemo(() => {
    if (!searchQuery.trim()) return leads.filter((l) => !l.deletedAt).slice(0, 15);
    const q = searchQuery.toLowerCase().trim();
    const digitsOnly = q.replace(/\D/g, '');

    return leads.filter((l) => {
      if (l.deletedAt) return false;
      const nameMatch = l.name.toLowerCase().includes(q);
      const domainMatch = (l.projectDomainName || l.chatgptPackage?.projectDomainName || '')
        .toLowerCase()
        .includes(q);
      const emailMatch = l.email?.toLowerCase().includes(q);
      const contactMatch = l.contacts?.some((c) => c.value.toLowerCase().includes(q));
      let phoneMatch = false;
      if (digitsOnly.length >= 3) {
        phoneMatch = Boolean(
          (l.phone && l.phone.replace(/\D/g, '').includes(digitsOnly)) ||
          l.contacts?.some((c) => c.value.replace(/\D/g, '').includes(digitsOnly))
        );
      }
      return nameMatch || domainMatch || emailMatch || contactMatch || phoneMatch;
    }).slice(0, 20);
  }, [leads, searchQuery]);

  if (!isOpen) return null;

  // Execute deterministic matching when user submits URL
  const handleSubmitUrl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    if (!rawUrl.trim()) {
      setErrorMessage('Please paste or enter a live website URL.');
      return;
    }

    const norm = normalizeInputUrl(rawUrl);
    if (!norm) {
      setErrorMessage('Please enter a valid URL (e.g., https://psroyaltymassage.pages.dev).');
      return;
    }

    setIsProcessing(true);

    try {
      // 100% Deterministic logic against existing client records (NO AI / NO API)
      const result = matchUrlToLeads(rawUrl, leads);
      if (!result) {
        setErrorMessage('Unable to parse the provided URL.');
        setIsProcessing(false);
        return;
      }

      setEvaluationResult(result);

      if (result.status === 'single_match' && result.bestMatch) {
        const targetLead = result.bestMatch.lead;
        const targetDomain = result.bestMatch.projectDomainName;
        const matchMethod = result.bestMatch.matchMethod;

        // Check duplicate
        if (result.isDuplicate) {
          setAttachedLead(targetLead);
          setAttachedUrl(result.urlInfo.cleanUrl);
          setAttachedProjectDomain(targetDomain);
          setAttachedMatchMethod(matchMethod);
          setViewState('already_attached');
          setIsProcessing(false);
          return;
        }

        // Automatic deterministic attach
        const saveRes = await attachLiveWebsiteLinkToLead(
          targetLead.id,
          result.urlInfo.cleanUrl,
          currentUser.id,
          currentUser.displayName || 'User'
        );

        setAttachedLead(saveRes.lead);
        setAttachedUrl(result.urlInfo.cleanUrl);
        setAttachedProjectDomain(targetDomain);
        setAttachedMatchMethod(matchMethod);
        setViewState('success');
      } else if (result.status === 'multiple_matches') {
        setSelectedCandidate(result.candidates[0] || null);
        setViewState('confirm_candidates');
      } else {
        // Level 4: No deterministic match found -> DO NOT GUESS.
        setViewState('search_fallback');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while attaching the link.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirm candidate selection from multiple exact matches
  const handleConfirmCandidate = async () => {
    if (!selectedCandidate || !evaluationResult) return;
    setIsProcessing(true);
    setErrorMessage('');

    try {
      const targetLead = selectedCandidate.lead;
      const targetDomain = selectedCandidate.projectDomainName;
      const matchMethod = selectedCandidate.matchMethod;
      const cleanUrl = evaluationResult.urlInfo.cleanUrl;

      // Check duplicate
      if (selectedCandidate.isAlreadyAttached) {
        setAttachedLead(targetLead);
        setAttachedUrl(cleanUrl);
        setAttachedProjectDomain(targetDomain);
        setAttachedMatchMethod(matchMethod);
        setViewState('already_attached');
        setIsProcessing(false);
        return;
      }

      const saveRes = await attachLiveWebsiteLinkToLead(
        targetLead.id,
        cleanUrl,
        currentUser.id,
        currentUser.displayName || 'User'
      );

      setAttachedLead(saveRes.lead);
      setAttachedUrl(cleanUrl);
      setAttachedProjectDomain(targetDomain);
      setAttachedMatchMethod(matchMethod);
      setViewState('success');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to attach link.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirm manual selection from search fallback
  const handleConfirmManualSelection = async () => {
    if (!manualSelectedLead || !evaluationResult) return;
    setIsProcessing(true);
    setErrorMessage('');

    try {
      const targetDomain =
        manualSelectedLead.projectDomainName ||
        manualSelectedLead.chatgptPackage?.projectDomainName ||
        manualSelectedLead.name;
      const cleanUrl = evaluationResult.urlInfo.cleanUrl;

      // Check duplicate
      const existingUrls = [
        manualSelectedLead.templateUrl,
        manualSelectedLead.previewUrl,
        manualSelectedLead.workingUrl,
        manualSelectedLead.website
      ].filter(Boolean) as string[];

      const isDup = existingUrls.some((u) => {
        const norm = normalizeInputUrl(u);
        return norm && norm.cleanUrl === cleanUrl;
      });

      if (isDup) {
        setAttachedLead(manualSelectedLead);
        setAttachedUrl(cleanUrl);
        setAttachedProjectDomain(targetDomain);
        setAttachedMatchMethod('Manual Selection');
        setViewState('already_attached');
        setIsProcessing(false);
        return;
      }

      const saveRes = await attachLiveWebsiteLinkToLead(
        manualSelectedLead.id,
        cleanUrl,
        currentUser.id,
        currentUser.displayName || 'User'
      );

      setAttachedLead(saveRes.lead);
      setAttachedUrl(cleanUrl);
      setAttachedProjectDomain(targetDomain);
      setAttachedMatchMethod('Manual Selection');
      setViewState('success');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to attach link.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Admin Override: Reassign link to another client
  const handleReassignLink = async () => {
    if (!manualSelectedLead || !attachedLead || !attachedUrl) return;
    setIsProcessing(true);
    setErrorMessage('');

    try {
      const result = await reassignLiveWebsiteLinkToLead(
        attachedLead.id,
        manualSelectedLead.id,
        attachedUrl,
        currentUser.id,
        currentUser.displayName || 'Admin',
        'Manual Admin Reassignment'
      );

      setAttachedLead(result.toLead);
      setAttachedProjectDomain(
        result.toLead.projectDomainName ||
        result.toLead.chatgptPackage?.projectDomainName ||
        result.toLead.name
      );
      setAttachedMatchMethod('Manual Selection');
      setSuccessMessage(`Link successfully reassigned to ${result.toLead.name}`);
      setViewState('success');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reassign link.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Admin Override: Remove link completely
  const handleRemoveLink = async () => {
    if (!attachedLead) return;
    if (!window.confirm(`Are you sure you want to remove this website link from ${attachedLead.name}?`)) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      await removeLiveWebsiteLinkFromLead(
        attachedLead.id,
        currentUser.id,
        currentUser.displayName || 'Admin',
        'Admin manual removal'
      );
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to remove link.');
      setIsProcessing(false);
    }
  };

  // Copy link handler
  const handleCopyLink = () => {
    if (!attachedUrl) return;
    navigator.clipboard.writeText(attachedUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Paste from clipboard helper
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRawUrl(text.trim());
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white border border-[#DDD8CE] rounded-3xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden font-['Poppins']">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DDD8CE] bg-[#FBF9F5]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#245F6B]/10 flex items-center justify-center text-[#245F6B]">
              <LinkIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#292A29] leading-tight">
                Add Live Website Link
              </h2>
              <p className="text-[11px] text-[#969188]">
                Deterministic Project Domain Matching
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center text-[#969188] hover:text-[#292A29] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* ===================== VIEW STATE: INPUT ===================== */}
          {viewState === 'input' && (
            <form onSubmit={handleSubmitUrl} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#68645D]">
                  Live Website URL
                </label>
                <div className="relative flex items-center">
                  <Globe className="absolute left-4 w-4 h-4 text-[#969188]" />
                  <input
                    type="text"
                    value={rawUrl}
                    onChange={(e) => {
                      setRawUrl(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    autoFocus
                    placeholder="https://psroyaltymassage.pages.dev"
                    className="w-full bg-[#FBF9F5] border border-[#DDD8CE] rounded-2xl pl-11 pr-24 py-3.5 text-xs text-[#292A29] font-medium placeholder-[#969188] focus:border-[#245F6B] focus:bg-white focus:outline-none transition-all shadow-2xs"
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                    {rawUrl ? (
                      <button
                        type="button"
                        onClick={() => setRawUrl('')}
                        className="p-1.5 text-[#969188] hover:text-[#292A29] rounded-lg transition-colors cursor-pointer"
                        title="Clear"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handlePasteClipboard}
                        className="px-2.5 py-1 text-[10px] font-bold text-[#245F6B] bg-[#E5EEEE] hover:bg-[#245F6B]/20 rounded-lg transition-colors cursor-pointer"
                        title="Paste from clipboard"
                      >
                        Paste
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-[#969188] leading-relaxed">
                  Enter the live Cloudflare Pages URL or custom domain. WebCraft will match it deterministically against saved <code className="font-mono text-[#245F6B]">projectDomainName</code> records.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 bg-[#A65B55]/10 border border-[#A65B55]/30 rounded-2xl flex items-center gap-2 text-xs text-[#A65B55] font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-[#A65B55]" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Supported Logic Matching Rules */}
              <div className="p-4 rounded-2xl bg-[#F0EDE5]/60 border border-[#DDD8CE]/60 space-y-2 text-xs text-[#68645D]">
                <div className="flex items-center gap-1.5 font-bold text-[#292A29] text-[11px] uppercase tracking-wider">
                  <Globe className="w-3.5 h-3.5 text-[#245F6B]" />
                  <span>Deterministic Matching Rules</span>
                </div>
                <ul className="text-[11px] space-y-1 text-[#68645D]">
                  <li>• <strong>Level 1:</strong> Exact match on <code className="text-[#245F6B] font-mono">projectDomainName</code> (e.g. <code className="text-[#245F6B] font-mono">psroyaltymassage.pages.dev</code>)</li>
                  <li>• <strong>Level 2:</strong> Exact match on previously stored live website URL</li>
                  <li>• <strong>Level 3:</strong> Exact match on registered custom domain (<code className="text-[#245F6B] font-mono">.co.za</code>, <code className="text-[#245F6B] font-mono">.com</code>)</li>
                  <li>• <strong>Level 4:</strong> If no exact deterministic match exists, WebCraft stops and prompts for manual selection.</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-full text-xs font-bold text-[#68645D] hover:bg-black/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing || !rawUrl.trim()}
                  className="px-6 py-2.5 rounded-full bg-[#245F6B] hover:bg-[#1E505A] text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Matching Client...</span>
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>ADD LINK</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ===================== VIEW STATE: CONFIRM CANDIDATES ===================== */}
          {viewState === 'confirm_candidates' && evaluationResult && (
            <div className="space-y-4">
              <div className="p-3.5 bg-[#D9A441]/15 border border-[#D9A441]/30 rounded-2xl flex items-start gap-2.5 text-xs text-[#91651B]">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#D9A441] mt-0.5" />
                <div>
                  <div className="font-bold">Multiple projects matched this domain identifier</div>
                  <div className="text-[11px] text-[#91651B]/90 mt-0.5">
                    Target URL: <code className="font-mono font-semibold">{evaluationResult.urlInfo.cleanUrl}</code>. Please select the target client project below.
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {evaluationResult.candidates.map((cand) => {
                  const isSelected = selectedCandidate?.lead.id === cand.lead.id;
                  const createdDateStr = cand.lead.createdAt
                    ? new Date(cand.lead.createdAt).toLocaleDateString()
                    : 'Recent';

                  return (
                    <div
                      key={cand.lead.id}
                      onClick={() => setSelectedCandidate(cand)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'border-[#245F6B] bg-[#E5EEEE]/50 shadow-xs ring-1 ring-[#245F6B]'
                          : 'border-[#DDD8CE] bg-[#FBF9F5] hover:bg-[#F0EDE5]/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#292A29] truncate">
                              {cand.lead.name}
                            </span>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#245F6B]/10 text-[#245F6B] shrink-0">
                              {cand.projectDomainName}
                            </span>
                          </div>

                          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#68645D]">
                            {cand.lead.city && <span>City: {cand.lead.city}</span>}
                            {cand.lead.category && <span>Category: {cand.lead.category}</span>}
                            <span>Created: {createdDateStr}</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#245F6B]/10 text-[#245F6B]">
                            {cand.matchMethod}
                          </span>
                          <input
                            type="radio"
                            checked={isSelected}
                            onChange={() => setSelectedCandidate(cand)}
                            className="mt-1.5 accent-[#245F6B]"
                          />
                        </div>
                      </div>

                      <div className="mt-2 text-[10px] text-[#969188] italic">
                        {cand.matchDetails}
                      </div>
                    </div>
                  );
                })}
              </div>

              {errorMessage && (
                <div className="p-3 bg-[#A65B55]/10 border border-[#A65B55]/30 rounded-2xl text-xs text-[#A65B55] font-medium">
                  {errorMessage}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setViewState('search_fallback')}
                  className="text-xs font-bold text-[#245F6B] hover:underline cursor-pointer"
                >
                  Search all clients manually
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewState('input')}
                    className="px-4 py-2 rounded-full text-xs font-bold text-[#68645D] hover:bg-black/5 transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing || !selectedCandidate}
                    onClick={handleConfirmCandidate}
                    className="px-5 py-2.5 rounded-full bg-[#245F6B] hover:bg-[#1E505A] text-white font-bold text-xs transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isProcessing ? 'Attaching...' : 'CONFIRM & ATTACH'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===================== VIEW STATE: SEARCH FALLBACK (LEVEL 4 - NO MATCH) ===================== */}
          {viewState === 'search_fallback' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-[#A65B55]/10 border border-[#A65B55]/30 rounded-2xl flex items-start gap-2.5 text-xs text-[#A65B55]">
                <ShieldAlert className="w-4 h-4 shrink-0 text-[#A65B55] mt-0.5" />
                <div>
                  <div className="font-bold">Could not confidently identify this project.</div>
                  <div className="text-[11px] text-[#A65B55]/90 mt-0.5">
                    Target link: <code className="font-mono font-semibold">{evaluationResult?.urlInfo.cleanUrl || rawUrl}</code>. No exact deterministic match was found. Please select the client manually below.
                  </div>
                </div>
              </div>

              {/* Search input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#68645D]">
                  Select Client Manually
                </label>
                <div className="relative flex items-center">
                  <Search className="absolute left-3.5 w-4 h-4 text-[#969188]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    placeholder="Search client by business name, domain, phone, or email..."
                    className="w-full bg-[#FBF9F5] border border-[#DDD8CE] rounded-2xl pl-10 pr-4 py-3 text-xs text-[#292A29] placeholder-[#969188] focus:border-[#245F6B] focus:bg-white focus:outline-none transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Matching leads list */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {filteredSearchLeads.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#969188]">
                    No clients found matching "{searchQuery}".
                  </div>
                ) : (
                  filteredSearchLeads.map((lead) => {
                    const isSelected = manualSelectedLead?.id === lead.id;
                    const domain = lead.projectDomainName || lead.chatgptPackage?.projectDomainName;

                    return (
                      <div
                        key={lead.id}
                        onClick={() => setManualSelectedLead(lead)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left ${
                          isSelected
                            ? 'border-[#245F6B] bg-[#E5EEEE]/60 shadow-xs ring-1 ring-[#245F6B]'
                            : 'border-[#DDD8CE] bg-[#FBF9F5] hover:bg-[#F0EDE5]/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-[#292A29] truncate">
                              {lead.name}
                            </div>
                            <div className="flex items-center flex-wrap gap-x-2 text-[10px] text-[#68645D] mt-0.5">
                              {domain && (
                                <span className="font-mono text-[#245F6B] font-semibold">{domain}</span>
                              )}
                              {lead.phone && <span>• {lead.phone}</span>}
                              {lead.email && <span>• {lead.email}</span>}
                              {lead.city && <span>• {lead.city}</span>}
                            </div>
                          </div>

                          <input
                            type="radio"
                            checked={isSelected}
                            onChange={() => setManualSelectedLead(lead)}
                            className="accent-[#245F6B]"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {errorMessage && (
                <div className="p-3 bg-[#A65B55]/10 border border-[#A65B55]/30 rounded-2xl text-xs text-[#A65B55] font-medium">
                  {errorMessage}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setViewState('input')}
                  className="text-xs font-bold text-[#68645D] hover:text-[#292A29] cursor-pointer"
                >
                  ← Back to URL input
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-full text-xs font-bold text-[#68645D] hover:bg-black/5 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing || !manualSelectedLead}
                    onClick={handleConfirmManualSelection}
                    className="px-5 py-2.5 rounded-full bg-[#245F6B] hover:bg-[#1E505A] text-white font-bold text-xs transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isProcessing ? 'Attaching...' : 'ATTACH TO SELECTED CLIENT'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===================== VIEW STATE: REASSIGN (ADMIN OVERRIDE) ===================== */}
          {viewState === 'reassign' && attachedLead && (
            <div className="space-y-4">
              <div className="p-3.5 bg-[#245F6B]/10 border border-[#245F6B]/30 rounded-2xl flex items-start gap-2.5 text-xs text-[#245F6B]">
                <RefreshCw className="w-4 h-4 shrink-0 text-[#245F6B] mt-0.5" />
                <div>
                  <div className="font-bold">Reassign Link to Another Client (Admin Override)</div>
                  <div className="text-[11px] text-[#245F6B]/90 mt-0.5">
                    Reassigning <code className="font-mono font-semibold">{attachedUrl}</code> away from <strong>{attachedLead.name}</strong>.
                  </div>
                </div>
              </div>

              {/* Search input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#68645D]">
                  Select New Target Client
                </label>
                <div className="relative flex items-center">
                  <Search className="absolute left-3.5 w-4 h-4 text-[#969188]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    placeholder="Search new client by business name, domain, phone..."
                    className="w-full bg-[#FBF9F5] border border-[#DDD8CE] rounded-2xl pl-10 pr-4 py-3 text-xs text-[#292A29] placeholder-[#969188] focus:border-[#245F6B] focus:bg-white focus:outline-none transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Matching leads list */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {filteredSearchLeads.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#969188]">
                    No clients found matching "{searchQuery}".
                  </div>
                ) : (
                  filteredSearchLeads.map((lead) => {
                    const isSelected = manualSelectedLead?.id === lead.id;
                    const domain = lead.projectDomainName || lead.chatgptPackage?.projectDomainName;

                    return (
                      <div
                        key={lead.id}
                        onClick={() => setManualSelectedLead(lead)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left ${
                          isSelected
                            ? 'border-[#245F6B] bg-[#E5EEEE]/60 shadow-xs ring-1 ring-[#245F6B]'
                            : 'border-[#DDD8CE] bg-[#FBF9F5] hover:bg-[#F0EDE5]/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-[#292A29] truncate">
                              {lead.name}
                            </div>
                            <div className="flex items-center flex-wrap gap-x-2 text-[10px] text-[#68645D] mt-0.5">
                              {domain && (
                                <span className="font-mono text-[#245F6B] font-semibold">{domain}</span>
                              )}
                              {lead.phone && <span>• {lead.phone}</span>}
                              {lead.city && <span>• {lead.city}</span>}
                            </div>
                          </div>

                          <input
                            type="radio"
                            checked={isSelected}
                            onChange={() => setManualSelectedLead(lead)}
                            className="accent-[#245F6B]"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {errorMessage && (
                <div className="p-3 bg-[#A65B55]/10 border border-[#A65B55]/30 rounded-2xl text-xs text-[#A65B55] font-medium">
                  {errorMessage}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setViewState('success')}
                  className="text-xs font-bold text-[#68645D] hover:text-[#292A29] cursor-pointer"
                >
                  ← Back to Link Summary
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-full text-xs font-bold text-[#68645D] hover:bg-black/5 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing || !manualSelectedLead || manualSelectedLead.id === attachedLead.id}
                    onClick={handleReassignLink}
                    className="px-5 py-2.5 rounded-full bg-[#245F6B] hover:bg-[#1E505A] text-white font-bold text-xs transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isProcessing ? 'Reassigning...' : 'CONFIRM REASSIGNMENT'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===================== VIEW STATE: SUCCESS (TRANSPARENT MATCH DETAILS) ===================== */}
          {viewState === 'success' && attachedLead && (
            <div className="space-y-5 animate-in zoom-in-95 duration-200">
              
              <div className="text-center space-y-1.5 py-1">
                <div className="w-12 h-12 rounded-full bg-[#4F765C]/15 text-[#4F765C] flex items-center justify-center mx-auto shadow-2xs">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-[#292A29] tracking-tight">
                  ✓ LINK MATCHED
                </h3>
                <p className="text-xs text-[#68645D]">
                  The live website has been deterministically attached to the client record.
                </p>
              </div>

              {successMessage && (
                <div className="p-3 bg-[#4F765C]/10 border border-[#4F765C]/30 rounded-2xl text-xs text-[#4F765C] font-semibold text-center">
                  {successMessage}
                </div>
              )}

              {/* Transparent Confirmation Card */}
              <div className="bg-[#FBF9F5] border border-[#DDD8CE] rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#DDD8CE]/60 pb-2">
                  <span className="text-[11px] font-bold uppercase text-[#969188]">Website:</span>
                  <a
                    href={formatExternalUrl(attachedUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono font-bold text-[#245F6B] hover:underline break-all text-right"
                  >
                    {attachedUrl}
                  </a>
                </div>

                <div className="flex items-center justify-between border-b border-[#DDD8CE]/60 pb-2">
                  <span className="text-[11px] font-bold uppercase text-[#969188]">Matched Project:</span>
                  <span className="text-xs font-mono font-bold text-[#245F6B] bg-[#E5EEEE] px-2 py-0.5 rounded-md">
                    {attachedProjectDomain || attachedLead.projectDomainName || attachedLead.chatgptPackage?.projectDomainName || attachedLead.name}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-[#DDD8CE]/60 pb-2">
                  <span className="text-[11px] font-bold uppercase text-[#969188]">Client:</span>
                  <span className="text-xs font-bold text-[#292A29] text-right">{attachedLead.name}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-[#969188]">Match Method:</span>
                  <span className="text-xs font-bold text-[#4F765C] bg-[#4F765C]/10 px-2.5 py-0.5 rounded-full">
                    {attachedMatchMethod}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                <a
                  href={formatExternalUrl(attachedUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-4 py-2.5 rounded-full bg-[#4F765C] hover:bg-[#3F604A] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>OPEN WEBSITE</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-full bg-[#F0EDE5] hover:bg-[#E5EEEE] text-[#292A29] hover:text-[#245F6B] text-xs font-bold flex items-center justify-center gap-1.5 border border-[#DDD8CE] transition-all cursor-pointer shadow-2xs"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-[#4F765C]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'COPIED' : 'COPY LINK'}</span>
                </button>

                {onSelectLead && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectLead(attachedLead.id);
                      onClose();
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-full bg-[#245F6B] hover:bg-[#1E505A] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>VIEW CLIENT</span>
                  </button>
                )}
              </div>

              {/* Admin Override Controls */}
              <div className="flex items-center justify-between border-t border-[#DDD8CE] pt-3 text-xs">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setManualSelectedLead(null);
                      setViewState('reassign');
                    }}
                    className="text-[11px] font-bold text-[#245F6B] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Change Client</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRemoveLink}
                    disabled={isProcessing}
                    className="text-[11px] font-bold text-[#A65B55] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove Link</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-full text-xs font-bold text-[#68645D] hover:bg-black/5 transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>

            </div>
          )}

          {/* ===================== VIEW STATE: ALREADY ATTACHED ===================== */}
          {viewState === 'already_attached' && attachedLead && (
            <div className="space-y-5 animate-in zoom-in-95 duration-200">
              
              <div className="text-center space-y-1.5 py-1">
                <div className="w-12 h-12 rounded-full bg-[#D9A441]/15 text-[#91651B] flex items-center justify-center mx-auto shadow-2xs">
                  <Check className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-[#292A29] tracking-tight">
                  This link is already attached to this client.
                </h3>
                <p className="text-xs text-[#68645D]">
                  No duplicate record was created.
                </p>
              </div>

              <div className="bg-[#FBF9F5] border border-[#DDD8CE] rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#DDD8CE]/60 pb-2">
                  <span className="text-[11px] font-bold uppercase text-[#969188]">Website:</span>
                  <a
                    href={formatExternalUrl(attachedUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono font-bold text-[#245F6B] hover:underline break-all text-right"
                  >
                    {attachedUrl}
                  </a>
                </div>

                <div className="flex items-center justify-between border-b border-[#DDD8CE]/60 pb-2">
                  <span className="text-[11px] font-bold uppercase text-[#969188]">Matched Project:</span>
                  <span className="text-xs font-mono font-bold text-[#245F6B] bg-[#E5EEEE] px-2 py-0.5 rounded-md">
                    {attachedProjectDomain || attachedLead.projectDomainName || attachedLead.chatgptPackage?.projectDomainName || attachedLead.name}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-[#DDD8CE]/60 pb-2">
                  <span className="text-[11px] font-bold uppercase text-[#969188]">Client:</span>
                  <span className="text-xs font-bold text-[#292A29] text-right">{attachedLead.name}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-[#969188]">Match Method:</span>
                  <span className="text-xs font-bold text-[#4F765C] bg-[#4F765C]/10 px-2.5 py-0.5 rounded-full">
                    {attachedMatchMethod}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                <a
                  href={formatExternalUrl(attachedUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-4 py-2.5 rounded-full bg-[#4F765C] hover:bg-[#3F604A] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>OPEN WEBSITE</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-full bg-[#F0EDE5] hover:bg-[#E5EEEE] text-[#292A29] hover:text-[#245F6B] text-xs font-bold flex items-center justify-center gap-1.5 border border-[#DDD8CE] transition-all cursor-pointer shadow-2xs"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-[#4F765C]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'COPIED' : 'COPY LINK'}</span>
                </button>

                {onSelectLead && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectLead(attachedLead.id);
                      onClose();
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-full bg-[#245F6B] hover:bg-[#1E505A] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>VIEW CLIENT</span>
                  </button>
                )}
              </div>

              {/* Admin Override Controls */}
              <div className="flex items-center justify-between border-t border-[#DDD8CE] pt-3 text-xs">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setManualSelectedLead(null);
                      setViewState('reassign');
                    }}
                    className="text-[11px] font-bold text-[#245F6B] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Change Client</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRemoveLink}
                    disabled={isProcessing}
                    className="text-[11px] font-bold text-[#A65B55] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove Link</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-full text-xs font-bold text-[#68645D] hover:bg-black/5 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
