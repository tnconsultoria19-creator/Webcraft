import { Lead, ContactMethod } from '../types';
import { cleanUrl } from './utils';

export interface DirectOutreachAction {
  id: string;
  type: 'whatsapp' | 'call' | 'email' | 'facebook' | 'instagram' | 'gumtree' | 'website' | 'other';
  label: string;
  shortLabel: string;
  description: string;
  targetValue: string;
  url: string;
  iconName: 'MessageSquare' | 'Phone' | 'Mail' | 'Facebook' | 'Instagram' | 'ShoppingBag' | 'Globe' | 'ExternalLink';
  themeColor: string;
  buttonClass: string;
  badgeClass: string;
  isPrimary?: boolean;
}

/**
 * Extracts and formats the primary telephone number from a lead
 */
export function getLeadPhone(lead: Lead): string | null {
  if (lead.phone && lead.phone.trim()) return lead.phone.trim();

  if (lead.contacts && Array.isArray(lead.contacts)) {
    // Check primary_phone, whatsapp, secondary_phone
    const phoneContact = lead.contacts.find(
      (c) => c.type === 'primary_phone' || c.type === 'whatsapp' || c.type === 'secondary_phone'
    );
    if (phoneContact && phoneContact.value) return phoneContact.value.trim();

    // Check any contact with digit-heavy value
    const digitContact = lead.contacts.find((c) => /^[+\d\s().-]{7,}$/.test(c.value.trim()));
    if (digitContact) return digitContact.value.trim();
  }

  // Fallback: check if description or notes contains a phone number
  const descPhoneMatch = (lead.description || lead.notes || '').match(/(?:\+27|0)\s*\d{2}\s*\d{3}\s*\d{4}/);
  if (descPhoneMatch) return descPhoneMatch[0].trim();

  return null;
}

/**
 * Clean phone number for WhatsApp wa.me link
 * South African numbers starting with 0 (e.g. 082 123 4567) become 27821234567
 */
export function sanitizeWhatsAppPhone(phone: string): string {
  // Strip all non-numeric characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith('0') && cleaned.length === 10) {
    // Standard South African national format (082... -> 2782...)
    cleaned = '27' + cleaned.substring(1);
  }

  return cleaned;
}

/**
 * Clean phone number for tel: link
 */
export function sanitizeTelPhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

/**
 * Extracts the primary email address from a lead
 */
export function getLeadEmail(lead: Lead): string | null {
  if (lead.email && lead.email.trim()) return lead.email.trim();

  if (lead.contacts && Array.isArray(lead.contacts)) {
    const emailContact = lead.contacts.find(
      (c) => c.type === 'email' || c.type === 'secondary_email' || c.value.includes('@')
    );
    if (emailContact && emailContact.value) return emailContact.value.trim();
  }

  // Check description
  const emailMatch = (lead.description || lead.notes || '').match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) return emailMatch[0].trim();

  return null;
}

/**
 * Extracts contact person name or returns fallback
 */
export function getLeadContactPerson(lead: Lead): string {
  // The business-intelligence package should provide the Facebook/profile owner's
  // name as contactPerson. Prefer that over the business name so outreach is
  // addressed to the actual person rather than "the business".
  if (lead.contactPerson && lead.contactPerson.trim()) return lead.contactPerson.trim();

  if (lead.contacts && Array.isArray(lead.contacts)) {
    const contactWithPerson = lead.contacts.find((c) => c.contactPerson && c.contactPerson.trim());
    if (contactWithPerson?.contactPerson) return contactWithPerson.contactPerson.trim();
  }

  // If no individual/profile name was provided, address the business directly.
  // This is preferable to inventing or guessing a person's name.
  if (lead.name && lead.name.trim()) return lead.name.trim();

  return 'Hi there';
}

/**
 * Standard WebCraft outreach identity and offer.
 * Keep these centralized so every generated English outreach message uses
 * the same sender details and pricing.
 */
const WEBCRAFT_OUTREACH_SENDER = {
  name: 'Shiro Silvester',
  company: 'Silvestre Solutions',
  email: 'info@silvestre.co.za',
  phone: '+27 81 746 1041',
  website: 'www.silvestre.co.za'
};

function getOutreachRecipient(lead: Lead): { name: string; isIndividual: boolean } {
  const individual =
    lead.contactPerson?.trim() ||
    lead.contacts?.find((c) => c.contactPerson?.trim())?.contactPerson?.trim() ||
    '';

  return {
    name: individual || lead.name?.trim() || 'there',
    isIndividual: Boolean(individual)
  };
}

function getClickablePreviewUrl(lead: Lead): string {
  const raw = (lead.templateUrl || lead.previewUrl || '').trim();
  if (!raw) return '[Insert Link to Preview]';
  return raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
}


/**
 * Generates the English sales outreach pitch.
 * The greeting uses the Facebook/profile owner name stored in contactPerson,
 * while the business name is used in the body.
 */
export function generateEnglishPitch(lead: Lead, _senderName?: string, _portfolioUrl?: string): string {
  const recipient = getOutreachRecipient(lead);
  const businessName = lead.name || 'your business';
  const preview = getClickablePreviewUrl(lead);

  const opening = recipient.isIndividual
    ? `I came across ${businessName} and noticed that you don't have a website. So I put together a modern concept for you.`
    : `I came across your business and noticed that you don't have a website. So I put together a modern concept for ${businessName}.`;

  return `Hi ${recipient.name},

${opening}

Here's the link:
${preview}

If you like it, I'm currently running a special to get you online for R650 per year (payable in 3 installments), and I can set everything up for you.

Best regards,
${WEBCRAFT_OUTREACH_SENDER.name}
${WEBCRAFT_OUTREACH_SENDER.company}
${WEBCRAFT_OUTREACH_SENDER.website}
${WEBCRAFT_OUTREACH_SENDER.email}
${WEBCRAFT_OUTREACH_SENDER.phone}`;
}

/**
 * Generates the Angolan Portuguese sales outreach pitch (Angola: 30.000 Kz/ano pagos em 3 prestações)
 */
export function generateAngolanPortuguesePitch(lead: Lead, _senderName?: string, _portfolioUrl?: string): string {
  const recipient = getOutreachRecipient(lead);
  const businessName = lead.name || 'a vossa empresa';
  const preview = getClickablePreviewUrl(lead);
  const needsRedesign = lead.existingWebsiteStatus === 'Outdated' || (lead.website && lead.website.trim().length > 0);

  const websiteSentence = needsRedesign
    ? `notei que o vosso site beneficiaria de uma modernização, por isso criei um novo conceito de design para ${businessName}.`
    : recipient.isIndividual
      ? `notei que ainda não têm um site, por isso criei um conceito de design moderno para ${businessName}.`
      : `notei que a vossa empresa ainda não tem um site, por isso criei um conceito de design moderno para ${businessName}.`;

  return `Olá ${recipient.name},

Vi ${businessName} e ${websiteSentence}

${preview}

Se gostarem da direção, estou com uma promoção especial para vos colocar online por apenas 30.000 Kz/ano (pagos em 3 prestações), e posso tratar de tudo para vocês.

Melhores cumprimentos,
${WEBCRAFT_OUTREACH_SENDER.name}
${WEBCRAFT_OUTREACH_SENDER.company}
${WEBCRAFT_OUTREACH_SENDER.website}
${WEBCRAFT_OUTREACH_SENDER.email}
${WEBCRAFT_OUTREACH_SENDER.phone}`;
}

/**
 * Returns both English and Angolan Portuguese pitches for a lead
 */
export function generateDualLanguagePitches(
  lead: Lead,
  senderName?: string,
  portfolioUrl?: string
): { english: string; portuguese: string } {
  return {
    english: generateEnglishPitch(lead, senderName, portfolioUrl),
    portuguese: generateAngolanPortuguesePitch(lead, senderName, portfolioUrl)
  };
}

/**
 * Generates an initial WhatsApp proposal message based on lead region or defaults
 */
export function generateWhatsAppPitch(lead: Lead, senderName?: string): string {
  const isAngola =
    (lead.country && /angola/i.test(lead.country)) ||
    (lead.city && /luanda|benguela|huambo|lobito/i.test(lead.city));

  if (isAngola) {
    return generateAngolanPortuguesePitch(lead, senderName);
  }
  return generateEnglishPitch(lead, senderName);
}

/**
 * Generates email proposal subject & body
 */
export function generateEmailProposal(lead: Lead): { subject: string; body: string } {
  const person = getLeadContactPerson(lead);
  const businessName = lead.name || 'your business';
  const prototype = lead.templateUrl || lead.previewUrl;
  const sourceName = lead.source || 'your listing';

  const subject = `Website & Digital Growth Proposal for ${businessName}`;
  let body = `Hi ${person},\n\nI hope you're having a productive week.\n\n`;
  body += `I came across ${businessName} via ${sourceName} and was impressed by your work. I noticed an opportunity to significantly increase your client inquiries with a high-performance modern website.\n\n`;

  if (prototype) {
    body += `Our team has already crafted a working live prototype preview tailored for ${businessName}:\n👉 ${prototype}\n\n`;
  }

  body += `We specialize in fast, mobile-friendly websites that turn local visitors into paying customers.\n\n`;
  body += `Would you have 5 minutes this week for a brief conversation?\n\nBest regards,\nWebCraft Studio Team`;

  return { subject, body };
}

/**
 * Retrieves the exact Gumtree URL for this lead
 */
export function getGumtreeUrl(lead: Lead): string | null {
  const cleanedSourceUrl = cleanUrl(lead.sourceUrl);
  if (cleanedSourceUrl && /gumtree/i.test(cleanedSourceUrl)) {
    return cleanedSourceUrl;
  }

  if (lead.sourceId && /gumtree/i.test(lead.source || '')) {
    // If sourceId is numeric or alphanumeric Gumtree ad ID
    return `https://www.gumtree.co.za/a-services/${lead.sourceId}`;
  }

  if (lead.source && /gumtree/i.test(lead.source)) {
    if (cleanedSourceUrl) return cleanedSourceUrl;
    return `https://www.gumtree.co.za/s-all-the-ads/v1b0p1?q=${encodeURIComponent(lead.name)}`;
  }

  return null;
}

/**
 * Retrieves the Facebook URL (Profile, Page, Group, Marketplace post)
 */
export function getFacebookUrl(lead: Lead): string | null {
  const cleanedSourceUrl = cleanUrl(lead.sourceUrl);

  // If sourceUrl is explicitly a Facebook link (Group, Marketplace item, page)
  if (cleanedSourceUrl && /(facebook\.com|fb\.com|fb\.watch|fb\.me)/i.test(cleanedSourceUrl)) {
    return cleanedSourceUrl;
  }

  // Check contacts
  if (lead.contacts && Array.isArray(lead.contacts)) {
    const fbContact = lead.contacts.find((c) => c.type === 'facebook' || /facebook\.com/i.test(c.value));
    if (fbContact && fbContact.value) {
      const val = cleanUrl(fbContact.value) || fbContact.value.trim();
      return /^https?:\/\//i.test(val) ? val : `https://www.facebook.com/${val.replace(/^@/, '')}`;
    }
  }

  // If source is Facebook and sourceId exists
  if (lead.source && /facebook|fb/i.test(lead.source)) {
    if (cleanedSourceUrl) return cleanedSourceUrl;
    if (lead.sourceId) {
      const cleanId = lead.sourceId.replace(/^[\[\("'\s]+|[\]\)"'\s]+$/g, '').trim();
      if (/^\d+$/.test(cleanId)) {
        return `https://www.facebook.com/${cleanId}`;
      }
      return `https://www.facebook.com/search/top?q=${encodeURIComponent(cleanId)}`;
    }
    return `https://www.facebook.com/search/top?q=${encodeURIComponent(lead.name)}`;
  }

  return null;
}

/**
 * Retrieves the Instagram URL (Profile or DM)
 */
export function getInstagramUrl(lead: Lead): string | null {
  const cleanedSourceUrl = cleanUrl(lead.sourceUrl);
  if (cleanedSourceUrl && /(instagram\.com|instagr\.am)/i.test(cleanedSourceUrl)) {
    return cleanedSourceUrl;
  }

  if (lead.contacts && Array.isArray(lead.contacts)) {
    const igContact = lead.contacts.find((c) => c.type === 'instagram' || /instagram\.com/i.test(c.value));
    if (igContact && igContact.value) {
      const val = cleanUrl(igContact.value) || igContact.value.trim();
      if (/^https?:\/\//i.test(val)) return val;
      const cleanHandle = val.replace(/^@/, '').replace(/\s+/g, '');
      return `https://www.instagram.com/${cleanHandle}/`;
    }
  }

  if (lead.source && /instagram|insta|ig/i.test(lead.source)) {
    if (cleanedSourceUrl) return cleanedSourceUrl;
    if (lead.sourceId) {
      const cleanHandle = lead.sourceId.replace(/^[\[\("'\s@]+|[\]\)"'\s]+$/g, '').trim();
      return `https://www.instagram.com/${cleanHandle}/`;
    }
  }

  return null;
}

/**
 * Retrieves the business website or Google Business listing URL
 */
export function getBusinessWebsiteUrl(lead: Lead): string | null {
  const cleanedWeb = cleanUrl(lead.website);
  if (cleanedWeb && cleanedWeb.toLowerCase() !== 'none' && cleanedWeb !== '#') {
    return cleanedWeb;
  }

  const cleanedGoogle = cleanUrl(lead.googleBusinessUrl);
  if (cleanedGoogle && cleanedGoogle !== '#') {
    return cleanedGoogle;
  }

  return null;
}

/**
 * Computes all available Direct Outreach Actions for a given Lead
 */
export function getDirectOutreachActions(lead: Lead): DirectOutreachAction[] {
  const actions: DirectOutreachAction[] = [];
  const phone = getLeadPhone(lead);
  const email = getLeadEmail(lead);
  const person = getLeadContactPerson(lead);

  // 1. WhatsApp
  if (phone) {
    const waPhone = sanitizeWhatsAppPhone(phone);
    const pitch = generateWhatsAppPitch(lead);
    const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(pitch)}`;

    actions.push({
      id: 'act-whatsapp',
      type: 'whatsapp',
      label: 'WhatsApp Chat',
      shortLabel: 'WhatsApp',
      description: `Open WhatsApp with pre-filled pitch to ${person} (${phone})`,
      targetValue: phone,
      url: waUrl,
      iconName: 'MessageSquare',
      themeColor: '#25D366',
      buttonClass: 'bg-[#25D366] hover:bg-[#1EBE5D] text-white shadow-xs',
      badgeClass: 'bg-[#25D366]/10 text-[#1EBE5D] border-[#25D366]/30',
      isPrimary: true
    });

    // 2. Direct Phone Call
    const telPhone = sanitizeTelPhone(phone);
    actions.push({
      id: 'act-call',
      type: 'call',
      label: 'Phone Call',
      shortLabel: 'Call',
      description: `Direct dial ${person} on ${phone}`,
      targetValue: phone,
      url: `tel:${telPhone}`,
      iconName: 'Phone',
      themeColor: '#245F6B',
      buttonClass: 'bg-[#245F6B] hover:bg-[#1E505A] text-white shadow-xs',
      badgeClass: 'bg-[#E5EEEE] text-[#245F6B] border-[#245F6B]/30'
    });
  }

  // 3. Email
  if (email) {
    const { subject, body } = generateEmailProposal(lead);
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    actions.push({
      id: 'act-email',
      type: 'email',
      label: 'Send Email',
      shortLabel: 'Email',
      description: `Send proposal email to ${email}`,
      targetValue: email,
      url: mailtoUrl,
      iconName: 'Mail',
      themeColor: '#4A6FA5',
      buttonClass: 'bg-[#4A6FA5] hover:bg-[#3D5C8A] text-white shadow-xs',
      badgeClass: 'bg-[#4A6FA5]/10 text-[#4A6FA5] border-[#4A6FA5]/30'
    });
  }

  // 4. Gumtree
  const gumtreeUrl = getGumtreeUrl(lead);
  if (gumtreeUrl) {
    actions.push({
      id: 'act-gumtree',
      type: 'gumtree',
      label: 'Gumtree Listing',
      shortLabel: 'Gumtree Ad',
      description: lead.sourceId ? `Open Gumtree Listing (${lead.sourceId})` : 'Open original Gumtree listing ad',
      targetValue: lead.sourceId || lead.sourceUrl || 'Gumtree',
      url: gumtreeUrl,
      iconName: 'ShoppingBag',
      themeColor: '#388E3C',
      buttonClass: 'bg-[#388E3C] hover:bg-[#2E7D32] text-white shadow-xs',
      badgeClass: 'bg-[#388E3C]/10 text-[#2E7D32] border-[#388E3C]/30'
    });
  }

  // 5. Facebook (Group / Marketplace / Profile)
  const facebookUrl = getFacebookUrl(lead);
  if (facebookUrl) {
    let fbLabel = 'Facebook Post / Page';
    if (/marketplace/i.test(facebookUrl) || /marketplace/i.test(lead.source || '')) {
      fbLabel = 'FB Marketplace';
    } else if (/groups/i.test(facebookUrl) || /group/i.test(lead.source || '')) {
      fbLabel = 'FB Group Post';
    }

    actions.push({
      id: 'act-facebook',
      type: 'facebook',
      label: fbLabel,
      shortLabel: 'Facebook',
      description: `Open Facebook source link (${facebookUrl})`,
      targetValue: lead.sourceUrl || facebookUrl,
      url: facebookUrl,
      iconName: 'Facebook',
      themeColor: '#1877F2',
      buttonClass: 'bg-[#1877F2] hover:bg-[#0D65D9] text-white shadow-xs',
      badgeClass: 'bg-[#1877F2]/10 text-[#1877F2] border-[#1877F2]/30'
    });
  }

  // 6. Instagram (Profile / DM)
  const instagramUrl = getInstagramUrl(lead);
  if (instagramUrl) {
    actions.push({
      id: 'act-instagram',
      type: 'instagram',
      label: 'Instagram DM',
      shortLabel: 'Instagram',
      description: `Open Instagram profile / DM (${instagramUrl})`,
      targetValue: instagramUrl,
      url: instagramUrl,
      iconName: 'Instagram',
      themeColor: '#E1306C',
      buttonClass: 'bg-[#E1306C] hover:bg-[#C13584] text-white shadow-xs',
      badgeClass: 'bg-[#E1306C]/10 text-[#E1306C] border-[#E1306C]/30'
    });
  }

  // 7. Generic Source URL (if not already captured above)
  const cleanedSourceUrl = cleanUrl(lead.sourceUrl);
  if (cleanedSourceUrl && !actions.some((a) => a.url === cleanedSourceUrl)) {
    actions.push({
      id: 'act-source',
      type: 'other',
      label: `${lead.source || 'Source'} Link`,
      shortLabel: 'Source URL',
      description: `Open source reference link: ${cleanedSourceUrl}`,
      targetValue: cleanedSourceUrl,
      url: cleanedSourceUrl,
      iconName: 'ExternalLink',
      themeColor: '#68645D',
      buttonClass: 'bg-[#68645D] hover:bg-[#524E48] text-white shadow-xs',
      badgeClass: 'bg-[#F0EDE5] text-[#68645D] border-[#DDD8CE]'
    });
  }

  // 8. Business Website
  const websiteUrl = getBusinessWebsiteUrl(lead);
  if (websiteUrl) {
    actions.push({
      id: 'act-website',
      type: 'website',
      label: 'Current Website',
      shortLabel: 'Website',
      description: `Visit business website: ${websiteUrl}`,
      targetValue: websiteUrl,
      url: websiteUrl,
      iconName: 'Globe',
      themeColor: '#292A29',
      buttonClass: 'bg-[#292A29] hover:bg-[#1A1A1A] text-white shadow-xs',
      badgeClass: 'bg-[#F0EDE5] text-[#292A29] border-[#DDD8CE]'
    });
  }

  return actions;
}
