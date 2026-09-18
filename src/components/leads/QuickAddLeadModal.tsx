import React, { useState } from 'react';
import { X, Plus, Phone, Mail, Globe, MapPin, Tag, FileText, Sparkles, AlertTriangle, CheckCircle2, RotateCcw, ExternalLink } from 'lucide-react';
import { Lead, User } from '../../types';
import { createLeadInFirestore } from '../../lib/firestoreService';
import { cleanUrl } from '../../lib/utils';
import { COUNTRIES, getCountryByName } from '../../lib/currencyUtils';
import { arePhoneNumbersMatching, normalizeBusinessName, normalizeWebsiteUrl, normalizeEmailStr, normalizePhoneDigits } from '../../lib/searchUtils';

interface QuickAddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadCreated: (lead: Lead) => void;
  currentUser: User;
  existingLeads?: Lead[];
}

export const QuickAddLeadModal: React.FC<QuickAddLeadModalProps> = ({
  isOpen,
  onClose,
  onLeadCreated,
  currentUser,
  existingLeads = []
}) => {
  // Mode selection
  const [activeTab, setActiveTab] = useState<'manual' | 'import'>('manual');

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState('Gumtree');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [country, setCountry] = useState('South Africa');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['WhatsApp', 'Phone', 'Email']);
  const [contactPerson, setContactPerson] = useState('');

  // Import State
  const [rawJson, setRawJson] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccessMsg, setImportSuccessMsg] = useState('');
  const [unmappedNotice, setUnmappedNotice] = useState<string[]>([]);
  const [createdMethod, setCreatedMethod] = useState<'manual' | 'import'>('manual');

  // Duplicate Check State
  const [duplicateWarning, setDuplicateWarning] = useState<{ matchedLead: Lead; reason: string } | null>(null);
  const [bypassedDuplicate, setBypassedDuplicate] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const toggleChannel = (ch: string) => {
    if (selectedChannels.includes(ch)) {
      setSelectedChannels(selectedChannels.filter((c) => c !== ch));
    } else {
      setSelectedChannels([...selectedChannels, ch]);
    }
  };

  // Helper to map external source strings to known WebCraft Studio source options
  const matchSourceOption = (rawSource?: string): string => {
    if (!rawSource) return 'Other';
    const s = rawSource.toLowerCase().trim();
    if (s.includes('gumtree')) return 'Gumtree';
    if (s.includes('fb') || s.includes('facebook')) return 'Facebook';
    if (s.includes('ig') || s.includes('insta')) return 'Instagram';
    if (s.includes('google')) return 'Google Business';
    if (s.includes('call') || s.includes('referral') || s.includes('direct')) return 'Direct Call';
    return 'Other';
  };

  // Helper to map priority strings
  const matchPriorityOption = (rawPrio?: string): 'low' | 'normal' | 'high' | 'urgent' => {
    if (!rawPrio) return 'normal';
    const p = rawPrio.toLowerCase().trim();
    if (p.includes('urgent') || p.includes('critical')) return 'urgent';
    if (p.includes('high')) return 'high';
    if (p.includes('low')) return 'low';
    return 'normal';
  };

  // PARSE & POPULATE FIELDS FROM JSON
  const handlePopulateFields = () => {
    setImportError('');
    setImportSuccessMsg('');
    setUnmappedNotice([]);

    if (!rawJson.trim()) {
      setImportError('Please paste structured lead data into the text box above.');
      return;
    }

    try {
      let cleaned = rawJson.trim();
      // Remove markdown code fences like ```json and ```
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

      // Extract JSON object substring if surrounding text exists
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }

      const data = JSON.parse(cleaned);

      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        throw new Error('Pasted content must be a valid JSON object.');
      }

      // Track mapped keys
      const mappedKeys = new Set<string>();

      // 1. Business Name (accepts businessName or name)
      const parsedName = data.businessName || data.name || data.business_name || '';
      if (data.businessName !== undefined) mappedKeys.add('businessName');
      if (data.name !== undefined) mappedKeys.add('name');
      if (data.business_name !== undefined) mappedKeys.add('business_name');
      if (parsedName) setName(String(parsedName));

      // 2. Source & Source Links
      const parsedSource = data.source || data.leadSource || data.lead_source;
      if (data.source !== undefined) mappedKeys.add('source');
      if (data.leadSource !== undefined) mappedKeys.add('leadSource');
      if (data.lead_source !== undefined) mappedKeys.add('lead_source');
      if (parsedSource) setSource(matchSourceOption(String(parsedSource)));

      const parsedSourceUrl = data.sourceUrl || data.source_url || data.adUrl || data.ad_url || data.listingUrl || data.listing_url || data.postUrl || data.post_url;
      if (data.sourceUrl !== undefined) mappedKeys.add('sourceUrl');
      if (data.source_url !== undefined) mappedKeys.add('source_url');
      if (data.adUrl !== undefined) mappedKeys.add('adUrl');
      if (data.ad_url !== undefined) mappedKeys.add('ad_url');
      if (data.listingUrl !== undefined) mappedKeys.add('listingUrl');
      if (data.listing_url !== undefined) mappedKeys.add('listing_url');
      if (data.postUrl !== undefined) mappedKeys.add('postUrl');
      if (data.post_url !== undefined) mappedKeys.add('post_url');
      if (parsedSourceUrl) setSourceUrl(String(parsedSourceUrl));

      const parsedSourceId = data.sourceId || data.source_id || data.adId || data.ad_id || data.listingId || data.listing_id || data.postId || data.post_id;
      if (data.sourceId !== undefined) mappedKeys.add('sourceId');
      if (data.source_id !== undefined) mappedKeys.add('source_id');
      if (data.adId !== undefined) mappedKeys.add('adId');
      if (data.ad_id !== undefined) mappedKeys.add('ad_id');
      if (data.listingId !== undefined) mappedKeys.add('listingId');
      if (data.listing_id !== undefined) mappedKeys.add('listing_id');
      if (data.postId !== undefined) mappedKeys.add('postId');
      if (data.post_id !== undefined) mappedKeys.add('post_id');
      if (parsedSourceId) setSourceId(String(parsedSourceId));

      // 3. Priority
      const parsedPriority = data.priority || data.priorityLevel;
      if (data.priority !== undefined) mappedKeys.add('priority');
      if (data.priorityLevel !== undefined) mappedKeys.add('priorityLevel');
      if (parsedPriority) setPriority(matchPriorityOption(String(parsedPriority)));

      // 4. Contact Person / Owner
      const parsedContactPerson = data.contactPerson || data.owner || data.contact_person || data.contact;
      if (data.contactPerson !== undefined) mappedKeys.add('contactPerson');
      if (data.owner !== undefined) mappedKeys.add('owner');
      if (data.contact_person !== undefined) mappedKeys.add('contact_person');
      if (data.contact !== undefined) mappedKeys.add('contact');
      if (parsedContactPerson) setContactPerson(String(parsedContactPerson));

      // 5. Phone
      const parsedPhone = data.phone || data.whatsapp || data.mobile || data.phoneNumber || data.phone_number;
      if (data.phone !== undefined) mappedKeys.add('phone');
      if (data.whatsapp !== undefined) mappedKeys.add('whatsapp');
      if (data.mobile !== undefined) mappedKeys.add('mobile');
      if (data.phoneNumber !== undefined) mappedKeys.add('phoneNumber');
      if (data.phone_number !== undefined) mappedKeys.add('phone_number');
      if (parsedPhone) setPhone(String(parsedPhone));

      // 6. Email
      const parsedEmail = data.email || data.emailAddress || data.email_address;
      if (data.email !== undefined) mappedKeys.add('email');
      if (data.emailAddress !== undefined) mappedKeys.add('emailAddress');
      if (data.email_address !== undefined) mappedKeys.add('email_address');
      if (parsedEmail) setEmail(String(parsedEmail));

      // 7. Website
      const parsedWebsite = data.website || data.url || data.websiteUrl || data.website_url;
      if (data.website !== undefined) mappedKeys.add('website');
      if (data.url !== undefined) mappedKeys.add('url');
      if (data.websiteUrl !== undefined) mappedKeys.add('websiteUrl');
      if (data.website_url !== undefined) mappedKeys.add('website_url');
      if (parsedWebsite) setWebsite(String(parsedWebsite));

      // 8. Country & City / Region
      const parsedCountry = data.country || data.nation || data.countryName;
      if (data.country !== undefined) mappedKeys.add('country');
      if (data.nation !== undefined) mappedKeys.add('nation');
      if (data.countryName !== undefined) mappedKeys.add('countryName');
      if (parsedCountry) {
        setCountry(getCountryByName(String(parsedCountry)).name);
      }

      const parsedCity = data.city || data.region || data.location;
      if (data.city !== undefined) mappedKeys.add('city');
      if (data.region !== undefined) mappedKeys.add('region');
      if (data.location !== undefined) mappedKeys.add('location');
      if (parsedCity) {
        setCity(String(parsedCity));
        // If country wasn't explicitly provided, infer country from city if possible
        if (!parsedCountry) {
          const inferred = getCountryByName(String(parsedCity));
          if (inferred) setCountry(inferred.name);
        }
      }

      // 9. Industry / Category
      const parsedCategory = data.category || data.industry || data.sector;
      if (data.category !== undefined) mappedKeys.add('category');
      if (data.industry !== undefined) mappedKeys.add('industry');
      if (data.sector !== undefined) mappedKeys.add('sector');
      if (parsedCategory) setCategory(String(parsedCategory));

      // 10. Description / Notes
      const parsedDesc = data.description || data.notes || data.details || data.businessDescription;
      if (data.description !== undefined) mappedKeys.add('description');
      if (data.notes !== undefined) mappedKeys.add('notes');
      if (data.details !== undefined) mappedKeys.add('details');
      if (data.businessDescription !== undefined) mappedKeys.add('businessDescription');
      if (parsedDesc) setDescription(String(parsedDesc));

      // 11. Channels
      const parsedChannels = data.channels || data.outreachChannels;
      if (data.channels !== undefined) mappedKeys.add('channels');
      if (data.outreachChannels !== undefined) mappedKeys.add('outreachChannels');
      if (Array.isArray(parsedChannels) && parsedChannels.length > 0) {
        setSelectedChannels(parsedChannels.map((c: any) => String(c)));
      }

      // Collect unmapped properties to prevent silent data loss
      const unmapped: string[] = [];
      Object.keys(data).forEach((key) => {
        if (!mappedKeys.has(key) && data[key] !== null && data[key] !== undefined && data[key] !== '') {
          unmapped.push(`${key}: ${typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key]}`);
        }
      });

      if (unmapped.length > 0) {
        setUnmappedNotice(unmapped);
        // Append unmapped information to description so it remains saved with lead
        const unmappedText = `\n\n--- Unmapped Imported Data ---\n` + unmapped.join('\n');
        setDescription((prev) => (prev ? prev + unmappedText : unmappedText.trim()));
      }

      setCreatedMethod('import');
      setImportSuccessMsg('Lead information imported successfully. Please review the information before creating the lead.');
      
      // Auto-switch to Form tab for user review
      setActiveTab('manual');

    } catch (err: any) {
      setImportError(`We couldn't read this information. Please paste valid lead data. (${err.message})`);
    }
  };

  const handleClearImport = () => {
    setRawJson('');
    setImportError('');
    setImportSuccessMsg('');
    setUnmappedNotice([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Business name is required.');
      return;
    }

    // DUPLICATE DETECTION CHECK (unless bypassed)
    if (!bypassedDuplicate) {
      const cleanNewName = normalizeBusinessName(name);
      const cleanNewPhone = phone.trim();
      const cleanNewEmail = normalizeEmailStr(email);
      const cleanNewWebsite = normalizeWebsiteUrl(website);

      let matchedLead: Lead | null = null;
      let reason = '';

      for (const lead of existingLeads) {
        // 1. Phone check (handles spaced numbers like 923 456 789 vs +244923456789)
        if (cleanNewPhone && normalizePhoneDigits(cleanNewPhone).length >= 5) {
          const matchedContact = lead.contacts?.find((c) => {
            return arePhoneNumbersMatching(cleanNewPhone, c.value);
          });
          if (matchedContact) {
            matchedLead = lead;
            reason = `Phone Number "${cleanNewPhone}" matches "${matchedContact.value}" in "${lead.name}" (${lead.id})`;
            break;
          }
        }

        // 2. Business Name check (handles accents, legal suffixes, and spacing)
        if (cleanNewName && cleanNewName.length >= 3) {
          const leadNormName = normalizeBusinessName(lead.name);
          if (leadNormName && leadNormName === cleanNewName) {
            matchedLead = lead;
            reason = `Business Name ("${lead.name}") matches "${name}" (${lead.id})`;
            break;
          }
        }

        // 3. Email check
        if (cleanNewEmail) {
          const matchedEmail = lead.contacts?.find((c) => normalizeEmailStr(c.value) === cleanNewEmail);
          if (matchedEmail) {
            matchedLead = lead;
            reason = `Email Address (${email.trim()}) matches (${lead.id})`;
            break;
          }
        }

        // 4. Website check
        if (cleanNewWebsite && lead.website) {
          const normLeadSite = normalizeWebsiteUrl(lead.website);
          if (normLeadSite && normLeadSite === cleanNewWebsite) {
            matchedLead = lead;
            reason = `Website URL (${normLeadSite}) matches (${lead.id})`;
            break;
          }
        }
      }

      if (matchedLead) {
        setDuplicateWarning({ matchedLead, reason });
        return;
      }
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const contacts = [];
      if (phone.trim()) {
        contacts.push({ type: 'primary_phone' as const, value: phone.trim(), contactPerson });
      }
      if (email.trim()) {
        contacts.push({ type: 'email' as const, value: email.trim(), contactPerson });
      }

      const cleanedSrcUrl = cleanUrl(sourceUrl);
      const cleanedWeb = cleanUrl(website);

      const newLead = await createLeadInFirestore(
        {
          name: name.trim(),
          description: description.trim(),
          category: category.trim(),
          city: city.trim(),
          country: country.trim(),
          website: cleanedWeb || website.trim(),
          source,
          sourceUrl: cleanedSrcUrl || sourceUrl.trim(),
          sourceId: sourceId.replace(/^[\[\("'\s]+|[\]\)"'\s]+$/g, '').trim(),
          contactPerson: contactPerson.trim(),
          phone: phone.trim(),
          email: email.trim(),
          priority,
          createdMethod,
          contacts,
          channels: selectedChannels
        },
        currentUser.id,
        currentUser.displayName
      );

      onLeadCreated(newLead);
      resetForm();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create lead');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setCategory('');
    setCity('');
    setWebsite('');
    setDescription('');
    setContactPerson('');
    setSource('Gumtree');
    setSourceUrl('');
    setSourceId('');
    setPriority('normal');
    setSelectedChannels(['WhatsApp', 'Phone', 'Email']);
    setRawJson('');
    setImportError('');
    setImportSuccessMsg('');
    setUnmappedNotice([]);
    setErrorMessage('');
    setCreatedMethod('manual');
    setDuplicateWarning(null);
    setBypassedDuplicate(false);
    setActiveTab('manual');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/45 backdrop-blur-xs font-['Poppins']">
      <div className="bg-white border border-[#DDD8CE] rounded-3xl shadow-2xl max-w-4xl xl:max-w-5xl w-full text-[#68645D] overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 bg-white text-[#292A29] border-b border-[#DDD8CE]">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-[#245F6B] rounded-2xl text-white shadow-xs">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-[#292A29]">Add New Business Prospect</h2>
              <p className="text-xs text-[#969188]">Capture business information to trigger prototype and outreach workflows</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#969188] hover:text-[#292A29] rounded-full hover:bg-[#F0EDE5] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Option Tabs: Create Manually vs Import Lead */}
        <div className="px-7 pt-4 bg-[#F0EDE5] border-b border-[#DDD8CE] flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-t-2xl text-xs font-bold border-t border-x transition-all cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-white text-[#292A29] border-[#DDD8CE] shadow-xs'
                : 'bg-transparent text-[#68645D] border-transparent hover:text-[#292A29]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Create Manually
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-t-2xl text-xs font-bold border-t border-x transition-all cursor-pointer ${
              activeTab === 'import'
                ? 'bg-white text-[#245F6B] border-[#DDD8CE] shadow-xs'
                : 'bg-transparent text-[#68645D] border-transparent hover:text-[#245F6B]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#245F6B]" />
            Import / Paste Lead
            {createdMethod === 'import' && (
              <span className="w-2 h-2 rounded-full bg-[#245F6B] inline-block animate-pulse" />
            )}
          </button>
        </div>

        {/* OPTION 2: IMPORT / PASTE LEAD PANEL */}
        {activeTab === 'import' && (
          <div className="p-7 overflow-y-auto space-y-4 text-xs flex-1 bg-white">
            <div className="p-5 bg-[#F0EDE5] border border-[#DDD8CE] rounded-2xl space-y-1.5 shadow-xs">
              <h3 className="font-bold text-sm text-[#292A29] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#245F6B]" />
                Import Lead Information
              </h3>
              <p className="text-xs text-[#68645D]">
                Paste structured lead information below. The system will automatically populate the lead form for you.
              </p>
              <p className="text-[11px] text-[#68645D] pt-1">
                💡 <strong>Tip:</strong> You can paste structured JSON generated by an external AI assistant (GPT).
              </p>
            </div>

            {importError && (
              <div className="p-4 bg-[#A65B55]/10 border border-[#A65B55]/30 text-[#A65B55] rounded-2xl text-xs font-bold space-y-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Import Parsing Error</span>
                </div>
                <p className="font-normal text-[11px]">{importError}</p>
              </div>
            )}

            <div>
              <label className="block text-[#292A29] font-bold mb-1.5">
                Paste Structured Lead Data (JSON Format)
              </label>
              <textarea
                rows={10}
                value={rawJson}
                onChange={(e) => {
                  setRawJson(e.target.value);
                  setImportError('');
                }}
                placeholder={`Paste lead data here... e.g.\n{\n  "businessName": "ABC Plumbing",\n  "description": "Professional plumbing services",\n  "phone": "0651234567",\n  "email": "abc@example.com",\n  "source": "Gumtree"\n}`}
                className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] text-xs rounded-2xl p-4 focus:outline-none focus:border-[#245F6B]"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleClearImport}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#F0EDE5] hover:bg-[#e9ecef] text-[#292A29] text-xs font-semibold rounded-full transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear
              </button>

              <button
                type="button"
                onClick={handlePopulateFields}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#245F6B] hover:bg-[#1E505A] text-white text-xs font-semibold rounded-full transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Populate Fields
              </button>
            </div>
          </div>
        )}

        {/* OPTION 1: CREATE MANUALLY (FORM VIEW) */}
        {activeTab === 'manual' && (
          <form onSubmit={handleSubmit} className="p-7 overflow-y-auto space-y-4 text-xs flex-1 bg-white">
            
            {/* Import Success Banner */}
            {importSuccessMsg && (
              <div className="p-4 bg-[#4F765C]/10 border border-[#4F765C]/30 text-[#4F765C] rounded-2xl text-xs font-bold flex items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{importSuccessMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setImportSuccessMsg('')}
                  className="text-[#4F765C] hover:underline font-bold text-[10px] uppercase cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Unmapped Data Alert */}
            {unmappedNotice.length > 0 && (
              <div className="p-4 bg-[#D9A441]/15 border border-[#D9A441]/40 text-[#292A29] rounded-2xl text-xs space-y-1.5 shadow-xs">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 text-[#D9A441] shrink-0" />
                  <span>Some information could not be directly mapped to form fields:</span>
                </div>
                <ul className="list-disc list-inside text-[11px] text-[#68645D] space-y-0.5">
                  {unmappedNotice.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
                <p className="text-[10px] text-[#68645D] pt-1">
                  This extra data has been automatically preserved in the <strong>Business Notes</strong> field below.
                </p>
              </div>
            )}

            {/* Duplicate Detection Warning Modal / Box */}
            {duplicateWarning && (
              <div className="p-5 bg-[#D9A441]/15 border-2 border-[#D9A441] text-[#292A29] rounded-2xl space-y-3 shadow-md">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-[#D9A441] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-xs text-[#292A29] uppercase tracking-wide">
                      Potential Duplicate Lead Detected
                    </h4>
                    <p className="text-xs">
                      A lead matching this <strong>{duplicateWarning.reason}</strong> already exists in your platform:
                    </p>
                    <div className="p-3 bg-white border border-[#DDD8CE] rounded-xl text-xs font-bold text-[#292A29] shadow-xs">
                      {duplicateWarning.matchedLead.name}
                      <span className="ml-2 text-[10px] text-[#68645D] font-normal">
                        ({duplicateWarning.matchedLead.id} • Stage: {duplicateWarning.matchedLead.stage})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D9A441]/30">
                  <button
                    type="button"
                    onClick={() => setDuplicateWarning(null)}
                    className="px-4 py-1.5 bg-white border border-[#DDD8CE] text-[#292A29] font-semibold text-xs rounded-full hover:bg-[#F0EDE5] transition-colors cursor-pointer"
                  >
                    Review & Edit Info
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      setBypassedDuplicate(true);
                      setDuplicateWarning(null);
                      handleSubmit(e);
                    }}
                    className="px-4 py-1.5 bg-[#D9A441] text-[#292A29] font-bold text-xs rounded-full transition-colors cursor-pointer"
                  >
                    Proceed & Add Lead Anyway
                  </button>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="p-4 bg-[#A65B55]/10 border border-[#A65B55]/30 text-[#A65B55] rounded-2xl text-xs font-bold">
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Business Name */}
              <div className="md:col-span-2">
                <label className="block text-[#292A29] font-semibold mb-1">
                  Business Name <span className="text-[#A65B55]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Apex Plumbing & Drainage"
                  className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#245F6B]"
                />
              </div>

              {/* Lead Source */}
              <div>
                <label className="block text-[#292A29] font-semibold mb-1">Discovery Source</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#245F6B]"
                >
                  <option value="Gumtree">Gumtree</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Google Business">Google Business</option>
                  <option value="Direct Call">Direct Referral</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-[#292A29] font-semibold mb-1">Priority Level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#245F6B]"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Contact Person */}
              <div>
                <label className="block text-[#292A29] font-semibold mb-1">Contact Person / Owner</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g. Jacob Smith (Owner)"
                  className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#245F6B]"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-[#292A29] font-semibold mb-1">Phone / WhatsApp</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-[#969188] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +27 65 123 4567"
                    className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl pl-9 pr-3.5 py-2 text-xs focus:outline-none focus:border-[#245F6B]"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[#292A29] font-semibold mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-[#969188] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. info@business.co.za"
                    className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl pl-9 pr-3.5 py-2 text-xs focus:outline-none focus:border-[#245F6B]"
                  />
                </div>
              </div>

              {/* Website */}
              <div>
                <label className="block text-[#292A29] font-semibold mb-1">Current Website (if any)</label>
                <div className="relative">
                  <Globe className="w-3.5 h-3.5 text-[#969188] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="e.g. https://business.co.za"
                    className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl pl-9 pr-3.5 py-2 text-xs focus:outline-none focus:border-[#245F6B]"
                  />
                </div>
              </div>

              {/* Source / Listing URL */}
              <div>
                <label className="block text-[#292A29] font-semibold mb-1">Source / Listing Link (URL)</label>
                <div className="relative">
                  <ExternalLink className="w-3.5 h-3.5 text-[#969188] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="e.g. Gumtree ad link, FB Group post, IG profile"
                    className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl pl-9 pr-3.5 py-2 text-xs focus:outline-none focus:border-[#245F6B]"
                  />
                </div>
              </div>

              {/* Source / Ad ID */}
              <div>
                <label className="block text-[#292A29] font-semibold mb-1">Source / Ad ID (optional)</label>
                <input
                  type="text"
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  placeholder="e.g. Gumtree Ad ID (10023456) or IG @handle"
                  className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#245F6B]"
                />
              </div>

              {/* Country / Region */}
              <div>
                <label className="block text-[#292A29] font-semibold mb-1">
                  Country / Region <span className="text-[#A65B55]">*</span>
                </label>
                <div className="relative">
                  <select
                    value={country}
                    onChange={(e) => {
                      setCountry(e.target.value);
                      if (e.target.value === 'Angola' && !city) setCity('Luanda');
                      if (e.target.value === 'South Africa' && !city) setCity('Cape Town');
                      if (e.target.value === 'Namibia' && !city) setCity('Windhoek');
                    }}
                    className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] font-semibold rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#245F6B]"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.name}>
                        {c.flag} {c.name} ({c.currency})
                      </option>
                    ))}
                    <option value="International">🌐 Other / International</option>
                  </select>
                </div>
              </div>

              {/* City */}
              <div>
                <label className="block text-[#292A29] font-semibold mb-1">City / District</label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-[#969188] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={country === 'Angola' ? 'e.g. Luanda, Benguela' : 'e.g. Cape Town, Western Cape'}
                    className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl pl-9 pr-3.5 py-2 text-xs focus:outline-none focus:border-[#245F6B]"
                  />
                </div>
              </div>

              {/* Industry */}
              <div>
                <label className="block text-[#292A29] font-semibold mb-1">Industry / Category</label>
                <div className="relative">
                  <Tag className="w-3.5 h-3.5 text-[#969188] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Plumbing / Home Services"
                    className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl pl-9 pr-3.5 py-2 text-xs focus:outline-none focus:border-[#245F6B]"
                  />
                </div>
              </div>

            </div>

            {/* Description */}
            <div>
              <label className="block text-[#292A29] font-semibold mb-1">
                Business Notes & Prototype Specifications
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detail services offered, website feature requirements, design style preferences..."
                className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-2xl p-3.5 text-xs focus:outline-none focus:border-[#245F6B]"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-[#DDD8CE]">
              <span className="text-[11px] text-[#68645D] font-medium">
                ⚡ Contact creation logged (R0 payout). Earn by adding live links (+R1) & outreach (+R0.50).
              </span>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 bg-[#F0EDE5] hover:bg-[#e9ecef] text-[#292A29] text-xs font-semibold rounded-full transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 bg-[#245F6B] hover:bg-[#1E505A] text-white text-xs font-semibold rounded-full transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {isLoading ? 'Creating Lead...' : 'Add Prospect'}
                </button>
              </div>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
