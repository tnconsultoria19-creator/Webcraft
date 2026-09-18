export type UserRole = 'admin' | 'manager' | 'member' | 'viewer';
export type UserStatus = 'active' | 'inactive';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  phone?: string;
  bio?: string;
  storedPassword?: string;
  createdAt: string;
}

export type LeadStage =
  | 'new_lead'
  | 'captured'
  | 'template_pending'
  | 'template_in_progress'
  | 'template_completed'
  | 'ready_for_outreach'
  | 'outreach_in_progress'
  | 'outreach_sent'
  | 'awaiting_response'
  | 'response_received'
  | 'interested'
  | 'negotiation'
  | 'won'
  | 'website_production'
  | 'completed'
  | 'lost'
  | 'not_interested'
  | 'do_not_contact';

export type LeadPriority = 'low' | 'normal' | 'high' | 'urgent';
export type LeadQuality = 'verified' | 'needs_verification' | 'invalid' | 'duplicate';

export interface ContactMethod {
  id: string;
  leadId: string;
  type: 'primary_phone' | 'secondary_phone' | 'whatsapp' | 'email' | 'secondary_email' | 'facebook' | 'instagram' | 'tiktok' | 'linkedin' | 'other';
  value: string;
  normalizedValue: string;
  contactPerson?: string;
  position?: string;
  createdAt: string;
}

export interface SavedChatgptPackage {
  geminiInstruction: string;
  clientProfileJson: string;
  businessName: string;
  projectDomainName?: string;
  savedAt?: string;
}

export interface LeadChannel {
  id: string;
  leadId: string;
  channel: 'whatsapp' | 'phone' | 'email' | 'facebook_messenger' | 'instagram_dm' | 'tiktok' | 'linkedin' | 'sms' | 'website_form' | 'other';
  detailValue?: string;
  createdAt: string;
}

export interface Lead {
  id: string; // LEAD-000001
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  description?: string;
  category?: string;
  industry?: string;
  city?: string;
  province?: string;
  country?: string;
  address?: string;
  website?: string;
  existingWebsiteStatus?: string;
  googleBusinessUrl?: string;
  sourceUrl?: string;
  sourceId?: string;
  notes?: string;
  source: string;
  createdMethod?: 'manual' | 'import';
  stage: LeadStage;
  priority: LeadPriority;
  quality: LeadQuality;
  createdBy: string;
  createdByName?: string;
  ownerId: string;
  ownerName?: string;
  templateUrl?: string;
  previewUrl?: string;
  workingUrl?: string;
  githubUrl?: string;
  productionNotes?: string;
  deletedAt?: string;
  projectDomainName?: string;
  createdAt: string;
  updatedAt: string;
  chatgptPackage?: SavedChatgptPackage;
  contacts?: ContactMethod[];
  channels?: LeadChannel[];
  imagesCount?: number;
  openTasksCount?: number;
  lastActivityAt?: string;
  lastOutreachAt?: string;
  lastOutreachChannel?: string;
  outreachCount?: number;
  // Financial Tracking & Bonus Attribution
  linkCreatorId?: string;
  linkCreatorName?: string;
  linkCreatedAt?: string;
  messageSenderId?: string;
  messageSenderName?: string;
  messageSentAt?: string;
  linkBonusAwarded?: boolean;
  messageBonusAwarded?: boolean;
  isDealClosed?: boolean;
  closedAt?: string;
  clientPrice?: number;
  currency?: string;
}

export type TaskStatus = 'available' | 'assigned' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
export type TaskTypeKey = 'capture' | 'template' | 'outreach' | 'followup' | 'qualification' | 'onboarding' | 'production';

export interface TaskType {
  id: string;
  key: TaskTypeKey;
  name: string;
  description: string;
  defaultRate: number;
  active: boolean;
}

export interface Task {
  id: string;
  leadId: string;
  leadName?: string;
  leadStage?: LeadStage;
  taskTypeId: string;
  taskTypeKey: TaskTypeKey;
  taskTypeName: string;
  status: TaskStatus;
  createdBy: string;
  createdByName?: string;
  assignedTo?: string;
  assignedToName?: string;
  rateValue: number;
  dueDate?: string;
  startedAt?: string;
  completedAt?: string;
  blockReason?: string;
  notes?: string;
  version: number;
  createdAt: string;
}

export type OutreachStatus =
  | 'planned'
  | 'sent'
  | 'delivered'
  | 'seen'
  | 'responded'
  | 'no_response'
  | 'follow_up_required'
  | 'interested'
  | 'not_interested'
  | 'wrong_contact'
  | 'do_not_contact';

export type ResponseType =
  | 'interested'
  | 'maybe'
  | 'wants_pricing'
  | 'wants_more_info'
  | 'wants_meeting'
  | 'not_interested'
  | 'already_has_website'
  | 'contact_later'
  | 'other';

export interface OutreachAttempt {
  id: string;
  leadId: string;
  channel: string;
  actionType?: 'whatsapp' | 'call' | 'email' | 'facebook' | 'instagram' | 'gumtree' | 'website' | 'other';
  targetRecipient?: string;
  sentBy: string;
  sentByName?: string;
  sentAt: string;
  messageUsed?: string;
  status: OutreachStatus;
  responseType?: ResponseType;
  responseNotes?: string;
  nextAction?: string;
  followUpDate?: string;
}

export interface ImageAsset {
  id: string;
  leadId: string;
  objectKey: string;
  url: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedByName?: string;
  isPrimary: boolean;
  caption?: string;
  createdAt: string;
}

export interface StageHistory {
  id: string;
  leadId: string;
  previousStage: LeadStage;
  newStage: LeadStage;
  changedBy: string;
  changedByName?: string;
  reason?: string;
  createdAt: string;
}

export interface LeadNote {
  id: string;
  leadId: string;
  authorId: string;
  authorName?: string;
  content: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName?: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface FollowUp {
  id: string;
  leadId: string;
  leadName?: string;
  assignedTo: string;
  assignedToName?: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'overdue' | 'cancelled';
  notes?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface UserEarningsSummary {
  userId: string;
  displayName: string;
  todayCount: number;
  todayEarnings: number;
  weekCount: number;
  weekEarnings: number;
  monthCount: number;
  monthEarnings: number;
  breakdown: Record<string, { count: number; value: number }>;
}

export interface ClosedPeriod {
  id: string;
  startDate: string;
  endDate: string;
  closedBy: string;
  closedByName?: string;
  closedAt: string;
  totalTasks: number;
  totalValue: number;
}

export type FinancialActionType =
  | 'LINK_CREATED'
  | 'MESSAGE_SENT'
  | 'LINK_SUCCESS_BONUS'
  | 'MESSAGE_SUCCESS_BONUS'
  | 'MANUAL_OVERRIDE';

export type FinancialRecordStatus = 'earned' | 'potential' | 'reversed';

export interface FinancialRecord {
  id: string;
  userId: string;
  userName: string;
  leadId: string;
  leadName: string;
  action: FinancialActionType;
  amount: number;
  currency: string;
  currencySymbol: string;
  timestamp: string;
  earningType: 'action' | 'success_bonus';
  status: FinancialRecordStatus;
  notes?: string;
  overriddenBy?: string;
  overriddenAt?: string;
  originalAmount?: number;
  isReversed?: boolean;
}

