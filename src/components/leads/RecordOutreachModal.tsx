import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Sparkles,
  MessageSquare,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  Clock,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { Lead, User, OutreachAttempt, OutreachStatus, ResponseType } from '../../types';
import { recordOutreachInFirestore } from '../../lib/firestoreService';
import { renderTextWithClickableLinks } from '../../lib/linkUtils';
import {
  generateWhatsAppPitch,
  generateEnglishPitch,
  generateAngolanPortuguesePitch,
  generateEmailProposal,
  getLeadContactPerson,
  getLeadPhone,
  getLeadEmail
} from '../../lib/outreachActions';

interface RecordOutreachModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  currentUser: User;
  onOutreachRecorded: () => void;
  initialChannel?: string;
  initialMessage?: string;
  initialRecipient?: string;
}

export const RecordOutreachModal: React.FC<RecordOutreachModalProps> = ({
  isOpen,
  onClose,
  lead,
  currentUser,
  onOutreachRecorded,
  initialChannel = 'WhatsApp',
  initialMessage = '',
  initialRecipient = ''
}) => {
  const [channel, setChannel] = useState(initialChannel);
  const [targetRecipient, setTargetRecipient] = useState(initialRecipient);
  const [messageUsed, setMessageUsed] = useState(initialMessage);
  const [status, setStatus] = useState<OutreachStatus>('sent');
  const [responseType, setResponseType] = useState<ResponseType | ''>('');
  const [responseNotes, setResponseNotes] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Sync initial values when modal opens or lead changes
  useEffect(() => {
    if (isOpen) {
      const detectedPhone = getLeadPhone(lead) || '';
      const detectedEmail = getLeadEmail(lead) || '';

      const targetChan = initialChannel || 'WhatsApp';
      setChannel(targetChan);

      if (initialRecipient) {
        setTargetRecipient(initialRecipient);
      } else if (targetChan.toLowerCase().includes('mail') && detectedEmail) {
        setTargetRecipient(detectedEmail);
      } else if (detectedPhone) {
        setTargetRecipient(detectedPhone);
      } else {
        setTargetRecipient(lead.sourceUrl || lead.sourceId || '');
      }

      if (initialMessage) {
        setMessageUsed(initialMessage);
      } else if (targetChan.toLowerCase().includes('whatsapp')) {
        setMessageUsed(generateWhatsAppPitch(lead, currentUser.displayName));
      } else if (targetChan.toLowerCase().includes('mail')) {
        const { body } = generateEmailProposal(lead);
        setMessageUsed(body);
      } else {
        setMessageUsed(generateWhatsAppPitch(lead, currentUser.displayName));
      }

      setStatus('sent');
      setResponseType('');
      setResponseNotes('');
      setNextAction('');
      setFollowUpDate('');
      setErrorMessage('');
    }
  }, [isOpen, lead, initialChannel, initialMessage, initialRecipient, currentUser.displayName]);

  if (!isOpen) return null;

  const handleApplyTemplate = (type: 'english' | 'portuguese' | 'initial' | 'prototype' | 'followup' | 'pricing') => {
    const person = getLeadContactPerson(lead);
    const prototype = lead.templateUrl || lead.previewUrl;

    if (type === 'english') {
      setMessageUsed(generateEnglishPitch(lead, currentUser.displayName));
    } else if (type === 'portuguese') {
      setMessageUsed(generateAngolanPortuguesePitch(lead, currentUser.displayName));
    } else if (type === 'initial') {
      setMessageUsed(generateWhatsAppPitch(lead, currentUser.displayName));
    } else if (type === 'prototype') {
      if (prototype) {
        setMessageUsed(
          `Hi ${person}, following up on our earlier note! We completed a live interactive demo mockup for ${lead.name}:\n\n🔗 ${prototype}\n\nTake a quick look on your phone and let us know what you think!`
        );
      } else {
        setMessageUsed(
          `Hi ${person}, following up regarding the custom website proposal for ${lead.name}. Would you be free for a 3-minute discussion this afternoon?`
        );
      }
    } else if (type === 'followup') {
      setMessageUsed(
        `Hi ${person}, just checking in to see if you had a chance to review the website preview we sent over for ${lead.name}. Would love to answer any questions you might have!`
      );
    } else if (type === 'pricing') {
      setMessageUsed(
        `Hi ${person}, we currently have a special promotion for local businesses: full website launch with hosting included for R650/year (or 30.000 Kz/ano in Angola) payable in 3 installments. Would you like me to send the full details?`
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const finalMsg = messageUsed.trim() || `Outreach attempt via ${channel}`;
      await recordOutreachInFirestore(
        {
          leadId: lead.id,
          channel,
          messageUsed: finalMsg,
          status,
          responseType: responseType ? (responseType as ResponseType) : undefined,
          responseNotes: responseNotes.trim() || undefined,
          nextAction: nextAction.trim() || undefined,
          followUpDate: followUpDate || undefined
        },
        currentUser.id,
        currentUser.displayName
      );

      onOutreachRecorded();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record outreach attempt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-xs font-['Poppins']">
      <div className="bg-white border border-[#DDD8CE] rounded-3xl shadow-2xl max-w-2xl w-full text-[#68645D] overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 bg-white border-b border-[#DDD8CE]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#245F6B] text-white rounded-2xl shadow-xs">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-[#292A29] flex items-center gap-2">
                <span>Record Outreach Attempt</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#E5EEEE] text-[#245F6B]">
                  {lead.name}
                </span>
              </h2>
              <p className="text-xs text-[#969188]">
                Log message transmission, phone call, or follow-up response to update CRM history
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#969188] hover:text-[#292A29] rounded-full hover:bg-[#F0EDE5] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs flex-1 bg-white">
          
          {errorMessage && (
            <div className="p-3.5 bg-[#A65B55]/10 border border-[#A65B55]/30 text-[#A65B55] rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Channel and Recipient Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#292A29] font-bold mb-1">
                Outreach Method / Channel <span className="text-[#A65B55]">*</span>
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] font-medium rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#245F6B]"
              >
                <option value="WhatsApp">WhatsApp</option>
                <option value="Phone Call">Phone Call</option>
                <option value="Email">Email</option>
                <option value="Instagram DM">Instagram DM</option>
                <option value="Facebook Message">Facebook Message / Group</option>
                <option value="Facebook Marketplace">Facebook Marketplace</option>
                <option value="Gumtree Message">Gumtree Message</option>
                <option value="SMS">SMS Message</option>
                <option value="In-Person / Referral">In-Person / Referral</option>
                <option value="Other">Other Channel</option>
              </select>
            </div>

            <div>
              <label className="block text-[#292A29] font-bold mb-1">
                Target Recipient / Phone / Handle
              </label>
              <input
                type="text"
                value={targetRecipient}
                onChange={(e) => setTargetRecipient(e.target.value)}
                placeholder="e.g. +27 82 123 4567 or @username"
                className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#245F6B]"
              />
            </div>
          </div>

          {/* Quick Pitch Templates */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[#292A29] font-bold">
                Message Content & Script
              </label>
              <span className="text-[11px] text-[#969188]">Click to load quick pitch template:</span>
            </div>

            <div className="flex flex-wrap gap-2 mb-2">
              <button
                type="button"
                onClick={() => handleApplyTemplate('english')}
                className="px-3 py-1.5 bg-[#E5EEEE] hover:bg-[#245F6B] hover:text-white border border-[#245F6B]/30 text-[#245F6B] rounded-full text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
              >
                <span>🇬🇧 English Pitch (R650 - 3x)</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate('portuguese')}
                className="px-3 py-1.5 bg-[#F4E9D8] hover:bg-[#D9A441] hover:text-white border border-[#D9A441]/30 text-[#91651B] rounded-full text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
              >
                <span>🇦🇴 Português Angola (30.000 Kz - 3x)</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate('prototype')}
                className="px-3 py-1.5 bg-[#F0EDE5] hover:bg-[#E5EEEE] border border-[#DDD8CE] text-[#292A29] rounded-full text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-3 h-3 text-[#D9A441]" />
                Prototype Demo
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate('followup')}
                className="px-3 py-1.5 bg-[#F0EDE5] hover:bg-[#E5EEEE] border border-[#DDD8CE] text-[#292A29] rounded-full text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-3 h-3 text-[#D9A441]" />
                Follow-Up Touch
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate('pricing')}
                className="px-3 py-1.5 bg-[#F0EDE5] hover:bg-[#E5EEEE] border border-[#DDD8CE] text-[#292A29] rounded-full text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-3 h-3 text-[#D9A441]" />
                Pricing Offer
              </button>
            </div>

            <textarea
              rows={4}
              value={messageUsed}
              onChange={(e) => setMessageUsed(e.target.value)}
              placeholder="Paste or write the exact outreach text or call notes here..."
              className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-2xl p-3.5 text-xs focus:outline-none focus:border-[#245F6B] leading-relaxed"
            />

            {/* Live Message Preview with Clickable Prototype / Website Links */}
            {messageUsed.trim() && (
              <div className="bg-white/80 border border-[#DDD8CE] rounded-xl p-3 text-xs space-y-1">
                <div className="text-[10px] font-bold text-[#68645D] uppercase tracking-wider flex items-center justify-between">
                  <span>Message Preview (Clickable Links)</span>
                  <span className="text-[#4F765C] lowercase font-normal">links open in new tab</span>
                </div>
                <div className="text-[#292A29] whitespace-pre-wrap leading-relaxed">
                  {renderTextWithClickableLinks(messageUsed)}
                </div>
              </div>
            )}
          </div>

          {/* Delivery Status & Response Outcome */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#292A29] font-bold mb-1">
                Outreach Status <span className="text-[#A65B55]">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OutreachStatus)}
                className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] font-medium rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#245F6B]"
              >
                <option value="sent">Message Sent / Called</option>
                <option value="delivered">Delivered to Client</option>
                <option value="seen">Seen / Read</option>
                <option value="responded">Client Responded</option>
                <option value="follow_up_required">Follow-Up Required</option>
                <option value="no_response">No Response Yet</option>
                <option value="interested">Client Interested</option>
                <option value="not_interested">Not Interested</option>
                <option value="wrong_contact">Wrong Contact Number</option>
                <option value="do_not_contact">Do Not Contact</option>
              </select>
            </div>

            <div>
              <label className="block text-[#292A29] font-bold mb-1">
                Response Type (if received)
              </label>
              <select
                value={responseType}
                onChange={(e) => setResponseType(e.target.value as ResponseType)}
                className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] font-medium rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#245F6B]"
              >
                <option value="">-- No response yet / Pending --</option>
                <option value="interested">Interested - Wants proposal/quote</option>
                <option value="wants_meeting">Wants call or demo meeting</option>
                <option value="wants_pricing">Requested pricing details</option>
                <option value="wants_more_info">Requested more information</option>
                <option value="contact_later">Asked to contact next week</option>
                <option value="already_has_website">Already has satisfied website</option>
                <option value="not_interested">Declined / Not interested</option>
                <option value="other">Other feedback</option>
              </select>
            </div>
          </div>

          {/* Response Notes / Client Feedback */}
          <div>
            <label className="block text-[#292A29] font-bold mb-1">
              Response Notes / Call Observations
            </label>
            <input
              type="text"
              value={responseNotes}
              onChange={(e) => setResponseNotes(e.target.value)}
              placeholder="e.g. Spoke to owner Jacob, wants e-commerce catalog add-on quote"
              className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#245F6B]"
            />
          </div>

          {/* Follow-Up Scheduling */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#292A29] font-bold mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#245F6B]" />
                <span>Next Follow-Up Date (optional)</span>
              </label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#245F6B]"
              />
            </div>

            <div>
              <label className="block text-[#292A29] font-bold mb-1">
                Next Action Step
              </label>
              <input
                type="text"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                placeholder="e.g. Send revised quote / Call back at 3 PM"
                className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#245F6B]"
              />
            </div>
          </div>

        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-[#DDD8CE]">
          <div className="flex items-center gap-2 text-[11px] text-[#68645D]">
            <UserCheck className="w-4 h-4 text-[#245F6B]" />
            <span>Logged by <strong>{currentUser.displayName}</strong></span>
          </div>

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-[#F0EDE5] hover:bg-[#e9ecef] text-[#292A29] text-xs font-semibold rounded-full transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-[#245F6B] hover:bg-[#1E505A] text-white text-xs font-semibold rounded-full transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Recording...' : 'Save Outreach Record'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
