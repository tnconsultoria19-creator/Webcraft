import React, { useState } from 'react';
import {
  MessageSquare,
  Phone,
  Mail,
  ShoppingBag,
  Facebook,
  Instagram,
  Globe,
  ExternalLink,
  Send,
  CheckCircle,
  Plus,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { Lead, User } from '../../types';
import { getDirectOutreachActions, DirectOutreachAction } from '../../lib/outreachActions';
import { cleanUrl } from '../../lib/utils';
import { RecordOutreachModal } from './RecordOutreachModal';

interface DirectOutreachBarProps {
  lead: Lead;
  currentUser: User;
  onOutreachRecorded: () => void;
  compact?: boolean;
  className?: string;
}

export const DirectOutreachBar: React.FC<DirectOutreachBarProps> = ({
  lead,
  currentUser,
  onOutreachRecorded,
  compact = false,
  className = ''
}) => {
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState('WhatsApp');
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [selectedMessage, setSelectedMessage] = useState('');

  const actions = getDirectOutreachActions(lead);

  const handleActionClick = (action: DirectOutreachAction, e: React.MouseEvent) => {
    // Open action URL in new window/tab or protocol handler
    if (action.url && action.url !== '#') {
      const rawUrl = action.url;
      const safeUrl = (rawUrl.startsWith('tel:') || rawUrl.startsWith('mailto:')) ? rawUrl : (cleanUrl(rawUrl) || rawUrl);
      if (safeUrl && safeUrl !== '#') {
        window.open(safeUrl, '_blank', 'noopener,noreferrer');
      }
    }

    // Automatically stage quick recording for this channel
    let chan = 'WhatsApp';
    if (action.type === 'call') chan = 'Phone Call';
    else if (action.type === 'email') chan = 'Email';
    else if (action.type === 'facebook') chan = 'Facebook Message';
    else if (action.type === 'instagram') chan = 'Instagram DM';
    else if (action.type === 'gumtree') chan = 'Gumtree Message';

    setSelectedChannel(chan);
    setSelectedRecipient(action.targetValue || '');
    setIsRecordModalOpen(true);
  };

  const handleOpenManualRecord = () => {
    setSelectedChannel('WhatsApp');
    setSelectedRecipient('');
    setSelectedMessage('');
    setIsRecordModalOpen(true);
  };

  const renderIcon = (iconName: string, className: string = 'w-4 h-4') => {
    switch (iconName) {
      case 'MessageSquare':
        return <MessageSquare className={className} />;
      case 'Phone':
        return <Phone className={className} />;
      case 'Mail':
        return <Mail className={className} />;
      case 'ShoppingBag':
        return <ShoppingBag className={className} />;
      case 'Facebook':
        return <Facebook className={className} />;
      case 'Instagram':
        return <Instagram className={className} />;
      case 'Globe':
        return <Globe className={className} />;
      default:
        return <ExternalLink className={className} />;
    }
  };

  if (actions.length === 0) {
    return (
      <div className={`p-4 bg-[#F0EDE5] rounded-2xl border border-[#DDD8CE] flex items-center justify-between gap-3 text-xs ${className}`}>
        <span className="text-[#969188]">No direct outreach contact details recorded yet.</span>
        <button
          type="button"
          onClick={handleOpenManualRecord}
          className="px-4 py-1.5 bg-[#245F6B] hover:bg-[#1E505A] text-white rounded-full font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Log Outreach Attempt</span>
        </button>

        {isRecordModalOpen && (
          <RecordOutreachModal
            isOpen={isRecordModalOpen}
            onClose={() => setIsRecordModalOpen(false)}
            lead={lead}
            currentUser={currentUser}
            onOutreachRecorded={onOutreachRecorded}
            initialChannel={selectedChannel}
            initialRecipient={selectedRecipient}
            initialMessage={selectedMessage}
          />
        )}
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
        {actions.map((act) => (
          <button
            key={act.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleActionClick(act, e);
            }}
            title={`${act.label}: ${act.description}`}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${act.buttonClass}`}
          >
            {renderIcon(act.iconName, 'w-3 h-3')}
            <span>{act.shortLabel}</span>
            <ArrowUpRight className="w-2.5 h-2.5 opacity-70" />
          </button>
        ))}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenManualRecord();
          }}
          className="p-1.5 bg-[#F0EDE5] hover:bg-[#e9ecef] text-[#292A29] rounded-full border border-[#DDD8CE] transition-colors cursor-pointer"
          title="Record Outreach Attempt / Log Note"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        {isRecordModalOpen && (
          <RecordOutreachModal
            isOpen={isRecordModalOpen}
            onClose={() => setIsRecordModalOpen(false)}
            lead={lead}
            currentUser={currentUser}
            onOutreachRecorded={onOutreachRecorded}
            initialChannel={selectedChannel}
            initialRecipient={selectedRecipient}
            initialMessage={selectedMessage}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`bg-[#F4F1EA] p-4.5 rounded-2xl border border-[#DDD8CE] space-y-3 font-['Poppins'] ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#245F6B] text-white rounded-lg">
            <Send className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-[#292A29] uppercase tracking-wider">
              Direct Outreach Actions
            </h4>
            <p className="text-[11px] text-[#969188]">
              1-Click direct connection actions based on captured prospect data
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenManualRecord}
          className="px-3.5 py-1.5 bg-white hover:bg-[#E5EEEE] border border-[#DDD8CE] text-[#245F6B] rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Record Outreach / Follow-up</span>
        </button>
      </div>

      {/* Buttons Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-1">
        {actions.map((act) => (
          <button
            key={act.id}
            type="button"
            onClick={(e) => handleActionClick(act, e)}
            className={`p-3 rounded-xl border border-[#DDD8CE] flex flex-col justify-between text-left transition-all hover:scale-[1.02] active:scale-[0.99] cursor-pointer shadow-2xs group ${
              act.type === 'whatsapp'
                ? 'bg-[#E8F8EE] hover:border-[#25D366] text-[#1EBE5D]'
                : act.type === 'call'
                ? 'bg-[#E5EEEE] hover:border-[#245F6B] text-[#245F6B]'
                : act.type === 'email'
                ? 'bg-[#EEF3F8] hover:border-[#4A6FA5] text-[#3D5C8A]'
                : act.type === 'facebook'
                ? 'bg-[#E8F0FE] hover:border-[#1877F2] text-[#1877F2]'
                : act.type === 'instagram'
                ? 'bg-[#FCE8F0] hover:border-[#E1306C] text-[#C13584]'
                : act.type === 'gumtree'
                ? 'bg-[#EAF3EB] hover:border-[#388E3C] text-[#2E7D32]'
                : 'bg-white hover:border-[#292A29] text-[#292A29]'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <div className="flex items-center gap-1.5 font-bold text-xs">
                {renderIcon(act.iconName, 'w-4 h-4 shrink-0')}
                <span>{act.label}</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>

            <div className="text-[11px] text-[#68645D] truncate font-medium mt-1">
              {act.targetValue}
            </div>
          </button>
        ))}
      </div>

      {isRecordModalOpen && (
        <RecordOutreachModal
          isOpen={isRecordModalOpen}
          onClose={() => setIsRecordModalOpen(false)}
          lead={lead}
          currentUser={currentUser}
          onOutreachRecorded={onOutreachRecorded}
          initialChannel={selectedChannel}
          initialRecipient={selectedRecipient}
          initialMessage={selectedMessage}
        />
      )}
    </div>
  );
};
