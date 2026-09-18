import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import {
  User,
  Lead,
  ContactMethod,
  LeadChannel,
  Task,
  TaskType,
  OutreachAttempt,
  ImageAsset,
  StageHistory,
  LeadNote,
  ActivityLog,
  FollowUp,
  NotificationItem,
  ClosedPeriod,
  TaskTypeKey
} from '../types';

interface DatabaseSchema {
  users: User[];
  userPasswords: Record<string, string>; // userId -> hashedPassword
  leads: Lead[];
  contacts: ContactMethod[];
  channels: LeadChannel[];
  tasks: Task[];
  taskTypes: TaskType[];
  outreachAttempts: OutreachAttempt[];
  images: ImageAsset[];
  stageHistory: StageHistory[];
  notes: LeadNote[];
  activityLogs: ActivityLog[];
  followUps: FollowUp[];
  notifications: NotificationItem[];
  closedPeriods: ClosedPeriod[];
  systemSettings: {
    leadSources: string[];
    contactChannels: string[];
    leadCounter: number;
  };
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Ensure directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export function normalizePhone(phone: string): string {
  if (!phone) return '';
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  // If it starts with 27, or 0, return standardized suffix for comparison
  if (cleaned.length >= 9) {
    return cleaned.slice(-9); // Compare last 9 digits for country code independence
  }
  return cleaned;
}

export function normalizeEmail(email: string): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

class DatabaseStore {
  private db: DatabaseSchema;

  constructor() {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.db = JSON.parse(raw);
        // Ensure default settings if missing
        if (!this.db.systemSettings) {
          this.db.systemSettings = {
            leadSources: ['Facebook', 'Instagram', 'Gumtree', 'Google', 'TikTok', 'WhatsApp', 'LinkedIn', 'Referral', 'Website', 'Directory', 'Cold Prospecting', 'Other'],
            contactChannels: ['WhatsApp', 'Phone', 'Email', 'Facebook Messenger', 'Instagram DM', 'TikTok', 'LinkedIn', 'SMS', 'Website contact form', 'Other'],
            leadCounter: 100
          };
        }
      } catch (e) {
        console.error('Failed to load DB file, initializing fresh seed', e);
        this.db = this.initSeed();
        this.save();
      }
    } else {
      this.db = this.initSeed();
      this.save();
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.db, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save DB file', err);
    }
  }

  private initSeed(): DatabaseSchema {
    const adminId = 'user-admin-01';
    const johnId = 'user-john-02';
    const sarahId = 'user-sarah-03';
    const davidId = 'user-david-04';

    const defaultPasswordHash = bcrypt.hashSync('password123', 10);

    const users: User[] = [
      {
        id: adminId,
        email: 'admin@webcraft.com',
        displayName: 'Alex Admin (Manager)',
        role: 'admin',
        status: 'active',
        phone: '+27821112233',
        bio: 'Operations Director & Platform Admin',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        createdAt: '2026-08-01T08:00:00.000Z'
      },
      {
        id: johnId,
        email: 'john@webcraft.com',
        displayName: 'John Developer',
        role: 'member',
        status: 'active',
        phone: '+27834445566',
        bio: 'Senior Template Creator & Web Designer',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
        createdAt: '2026-08-01T09:00:00.000Z'
      },
      {
        id: sarahId,
        email: 'sarah@webcraft.com',
        displayName: 'Sarah Lead Finder',
        role: 'member',
        status: 'active',
        phone: '+27847778899',
        bio: 'Lead Prospector & Market Researcher',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
        createdAt: '2026-08-02T10:00:00.000Z'
      },
      {
        id: davidId,
        email: 'david@webcraft.com',
        displayName: 'David Sales Rep',
        role: 'member',
        status: 'active',
        phone: '+27851122334',
        bio: 'Outreach & Client Acquisition Specialist',
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
        createdAt: '2026-08-02T11:00:00.000Z'
      }
    ];

    const userPasswords: Record<string, string> = {
      [adminId]: defaultPasswordHash,
      [johnId]: defaultPasswordHash,
      [sarahId]: defaultPasswordHash,
      [davidId]: defaultPasswordHash
    };

    const taskTypes: TaskType[] = [
      { id: 'tt-1', key: 'capture', name: 'Lead Research & Capture', description: 'Discovering business & recording verified contacts/images', defaultRate: 0, active: true },
      { id: 'tt-2', key: 'template', name: 'Template Prototype Creation', description: 'Designing interactive website mockup for business preview', defaultRate: 1.0, active: true },
      { id: 'tt-3', key: 'outreach', name: 'Initial Business Outreach', description: 'Reaching out via WhatsApp/Social DM/Email with mockup', defaultRate: 0.5, active: true },
      { id: 'tt-4', key: 'followup', name: 'Client Negotiation & Follow-Up', description: 'Handling responses, answering queries, securing interest', defaultRate: 0, active: true },
      { id: 'tt-5', key: 'qualification', name: 'Qualification & Discovery Call', description: 'Validating client budget & website requirements', defaultRate: 0, active: true },
      { id: 'tt-6', key: 'onboarding', name: 'Client Contract & Deposit Onboarding', description: 'Finalizing pricing agreement and collecting brand assets', defaultRate: 0, active: true },
      { id: 'tt-7', key: 'production', name: 'Final Website Launch & Deployment', description: 'Building domain deployment and custom features', defaultRate: 0, active: true }
    ];

    // Seed realistic leads
    const lead1Id = 'LEAD-000001';
    const lead2Id = 'LEAD-000002';
    const lead3Id = 'LEAD-000003';
    const lead4Id = 'LEAD-000004';

    const leads: Lead[] = [
      {
        id: lead1Id,
        name: 'Apex Plumbing & Drainage',
        description: '24/7 Residential and commercial emergency plumbing services in Cape Town Northern Suburbs.',
        category: 'Home Services',
        industry: 'Plumbing',
        city: 'Cape Town',
        province: 'Western Cape',
        country: 'South Africa',
        address: '14 Durban Road, Bellville',
        website: '',
        existingWebsiteStatus: 'None',
        googleBusinessUrl: 'https://maps.google.com/?cid=12345678',
        notes: 'Owner interested in urgent website for emergency weekend call-outs.',
        source: 'Gumtree',
        stage: 'ready_for_outreach',
        priority: 'high',
        quality: 'verified',
        createdBy: sarahId,
        createdByName: 'Sarah Lead Finder',
        ownerId: davidId,
        ownerName: 'David Sales Rep',
        templateUrl: 'https://apex-plumbing-mockup.webcraft.preview',
        previewUrl: 'https://apex-plumbing-mockup.webcraft.preview',
        createdAt: '2026-08-10T08:15:00.000Z',
        updatedAt: '2026-08-11T11:20:00.000Z'
      },
      {
        id: lead2Id,
        name: 'Bella Vista Bistro',
        description: 'Authentic Italian wood-fired pizza and pasta restaurant with outdoor garden seating.',
        category: 'Hospitality',
        industry: 'Restaurants',
        city: 'Stellenbosch',
        province: 'Western Cape',
        country: 'South Africa',
        address: '42 Church Street',
        website: 'https://bellavistabistro.co.za',
        existingWebsiteStatus: 'Outdated / Not Mobile Friendly',
        notes: 'Current website built in 2014, broken menu PDF, needs online reservation button.',
        source: 'Instagram',
        stage: 'interested',
        priority: 'urgent',
        quality: 'verified',
        createdBy: sarahId,
        createdByName: 'Sarah Lead Finder',
        ownerId: davidId,
        ownerName: 'David Sales Rep',
        templateUrl: 'https://bella-vista-preview.webcraft.preview',
        createdAt: '2026-08-09T09:30:00.000Z',
        updatedAt: '2026-08-11T14:05:00.000Z'
      },
      {
        id: lead3Id,
        name: 'Vanguard Solar & Electrical',
        description: 'Solar inverter installations, lithium battery backup and electrical compliance certificates.',
        category: 'Clean Energy',
        industry: 'Solar & Electrical',
        city: 'Johannesburg',
        province: 'Gauteng',
        country: 'South Africa',
        address: '88 Main Reef Rd, Rosebank',
        website: '',
        existingWebsiteStatus: 'None',
        notes: 'Spoke with founder Mark. They get leads via Facebook ads but have no landing page.',
        source: 'Facebook',
        stage: 'template_in_progress',
        priority: 'normal',
        quality: 'verified',
        createdBy: sarahId,
        createdByName: 'Sarah Lead Finder',
        ownerId: johnId,
        ownerName: 'John Developer',
        createdAt: '2026-08-11T07:45:00.000Z',
        updatedAt: '2026-08-11T10:30:00.000Z'
      },
      {
        id: lead4Id,
        name: 'Urban Fitness Studio',
        description: 'Boutique functional fitness gym offering CrossFit classes and personal training.',
        category: 'Health & Fitness',
        industry: 'Gyms',
        city: 'Durban',
        province: 'KwaZulu-Natal',
        country: 'South Africa',
        address: '12 Florida Road, Morningside',
        website: '',
        existingWebsiteStatus: 'None',
        notes: 'Active Instagram account with 4.5k followers. Needs timetable schedule on web.',
        source: 'TikTok',
        stage: 'captured',
        priority: 'normal',
        quality: 'verified',
        createdBy: sarahId,
        createdByName: 'Sarah Lead Finder',
        ownerId: sarahId,
        ownerName: 'Sarah Lead Finder',
        createdAt: '2026-08-11T11:00:00.000Z',
        updatedAt: '2026-08-11T11:00:00.000Z'
      }
    ];

    const contacts: ContactMethod[] = [
      { id: 'c-1', leadId: lead1Id, type: 'primary_phone', value: '+27 65 123 4567', normalizedValue: '651234567', contactPerson: 'Jacob Apex', position: 'Owner', createdAt: '2026-08-10T08:15:00.000Z' },
      { id: 'c-2', leadId: lead1Id, type: 'whatsapp', value: '+27651234567', normalizedValue: '651234567', contactPerson: 'Jacob Apex', position: 'Owner', createdAt: '2026-08-10T08:15:00.000Z' },
      { id: 'c-3', leadId: lead1Id, type: 'email', value: 'info@apexplumbing.co.za', normalizedValue: 'info@apexplumbing.co.za', createdAt: '2026-08-10T08:15:00.000Z' },
      { id: 'c-4', leadId: lead2Id, type: 'primary_phone', value: '+27 21 883 9922', normalizedValue: '218839922', contactPerson: 'Marco Rossi', position: 'Head Chef / Owner', createdAt: '2026-08-09T09:30:00.000Z' },
      { id: 'c-5', leadId: lead2Id, type: 'instagram', value: '@bellavistabistro_stb', normalizedValue: 'bellavistabistro_stb', createdAt: '2026-08-09T09:30:00.000Z' },
      { id: 'c-6', leadId: lead3Id, type: 'whatsapp', value: '+27 82 999 1122', normalizedValue: '829991122', contactPerson: 'Mark Vanguard', position: 'Director', createdAt: '2026-08-11T07:45:00.000Z' }
    ];

    const channels: LeadChannel[] = [
      { id: 'ch-1', leadId: lead1Id, channel: 'whatsapp', detailValue: '+27651234567', createdAt: '2026-08-10T08:15:00.000Z' },
      { id: 'ch-2', leadId: lead1Id, channel: 'phone', detailValue: '+27 65 123 4567', createdAt: '2026-08-10T08:15:00.000Z' },
      { id: 'ch-3', leadId: lead1Id, channel: 'email', detailValue: 'info@apexplumbing.co.za', createdAt: '2026-08-10T08:15:00.000Z' },
      { id: 'ch-4', leadId: lead2Id, channel: 'instagram_dm', detailValue: '@bellavistabistro_stb', createdAt: '2026-08-09T09:30:00.000Z' },
      { id: 'ch-5', leadId: lead2Id, channel: 'whatsapp', detailValue: '+27218839922', createdAt: '2026-08-09T09:30:00.000Z' },
      { id: 'ch-6', leadId: lead3Id, channel: 'whatsapp', detailValue: '+27829991122', createdAt: '2026-08-11T07:45:00.000Z' }
    ];

    const tasks: Task[] = [
      // Completed capture task for lead 1
      {
        id: 'task-1',
        leadId: lead1Id,
        leadName: 'Apex Plumbing & Drainage',
        leadStage: 'ready_for_outreach',
        taskTypeId: 'tt-1',
        taskTypeKey: 'capture',
        taskTypeName: 'Lead Research & Capture',
        status: 'completed',
        createdBy: sarahId,
        createdByName: 'Sarah Lead Finder',
        assignedTo: sarahId,
        assignedToName: 'Sarah Lead Finder',
        rateValue: 100,
        startedAt: '2026-08-10T08:15:00.000Z',
        completedAt: '2026-08-10T08:23:00.000Z',
        version: 1,
        createdAt: '2026-08-10T08:15:00.000Z'
      },
      // Completed template task for lead 1
      {
        id: 'task-2',
        leadId: lead1Id,
        leadName: 'Apex Plumbing & Drainage',
        leadStage: 'ready_for_outreach',
        taskTypeId: 'tt-2',
        taskTypeKey: 'template',
        taskTypeName: 'Template Prototype Creation',
        status: 'completed',
        createdBy: sarahId,
        createdByName: 'Sarah Lead Finder',
        assignedTo: johnId,
        assignedToName: 'John Developer',
        rateValue: 100,
        startedAt: '2026-08-10T09:00:00.000Z',
        completedAt: '2026-08-10T11:20:00.000Z',
        version: 1,
        createdAt: '2026-08-10T08:23:00.000Z'
      },
      // Available outreach task for lead 1
      {
        id: 'task-3',
        leadId: lead1Id,
        leadName: 'Apex Plumbing & Drainage',
        leadStage: 'ready_for_outreach',
        taskTypeId: 'tt-3',
        taskTypeKey: 'outreach',
        taskTypeName: 'Initial Business Outreach',
        status: 'available',
        createdBy: johnId,
        createdByName: 'John Developer',
        rateValue: 100,
        version: 1,
        createdAt: '2026-08-10T11:20:00.000Z'
      },
      // Completed tasks for lead 2
      {
        id: 'task-4',
        leadId: lead2Id,
        leadName: 'Bella Vista Bistro',
        leadStage: 'interested',
        taskTypeId: 'tt-1',
        taskTypeKey: 'capture',
        taskTypeName: 'Lead Research & Capture',
        status: 'completed',
        createdBy: sarahId,
        createdByName: 'Sarah Lead Finder',
        assignedTo: sarahId,
        assignedToName: 'Sarah Lead Finder',
        rateValue: 100,
        startedAt: '2026-08-09T09:30:00.000Z',
        completedAt: '2026-08-09T09:40:00.000Z',
        version: 1,
        createdAt: '2026-08-09T09:30:00.000Z'
      },
      {
        id: 'task-5',
        leadId: lead2Id,
        leadName: 'Bella Vista Bistro',
        leadStage: 'interested',
        taskTypeId: 'tt-2',
        taskTypeKey: 'template',
        taskTypeName: 'Template Prototype Creation',
        status: 'completed',
        createdBy: sarahId,
        createdByName: 'Sarah Lead Finder',
        assignedTo: johnId,
        assignedToName: 'John Developer',
        rateValue: 100,
        startedAt: '2026-08-09T10:00:00.000Z',
        completedAt: '2026-08-09T12:30:00.000Z',
        version: 1,
        createdAt: '2026-08-09T09:40:00.000Z'
      },
      {
        id: 'task-6',
        leadId: lead2Id,
        leadName: 'Bella Vista Bistro',
        leadStage: 'interested',
        taskTypeId: 'tt-3',
        taskTypeKey: 'outreach',
        taskTypeName: 'Initial Business Outreach',
        status: 'completed',
        createdBy: johnId,
        createdByName: 'John Developer',
        assignedTo: davidId,
        assignedToName: 'David Sales Rep',
        rateValue: 100,
        startedAt: '2026-08-09T13:00:00.000Z',
        completedAt: '2026-08-09T13:45:00.000Z',
        version: 1,
        createdAt: '2026-08-09T12:30:00.000Z'
      },
      // In progress task for Lead 3
      {
        id: 'task-7',
        leadId: lead3Id,
        leadName: 'Vanguard Solar & Electrical',
        leadStage: 'template_in_progress',
        taskTypeId: 'tt-2',
        taskTypeKey: 'template',
        taskTypeName: 'Template Prototype Creation',
        status: 'in_progress',
        createdBy: sarahId,
        createdByName: 'Sarah Lead Finder',
        assignedTo: johnId,
        assignedToName: 'John Developer',
        rateValue: 100,
        startedAt: '2026-08-11T09:00:00.000Z',
        version: 1,
        createdAt: '2026-08-11T07:45:00.000Z'
      },
      // Available template task for Lead 4
      {
        id: 'task-8',
        leadId: lead4Id,
        leadName: 'Urban Fitness Studio',
        leadStage: 'captured',
        taskTypeId: 'tt-2',
        taskTypeKey: 'template',
        taskTypeName: 'Template Prototype Creation',
        status: 'available',
        createdBy: sarahId,
        createdByName: 'Sarah Lead Finder',
        rateValue: 100,
        version: 1,
        createdAt: '2026-08-11T11:00:00.000Z'
      }
    ];

    const outreachAttempts: OutreachAttempt[] = [
      {
        id: 'oa-1',
        leadId: lead2Id,
        channel: 'Instagram DM',
        sentBy: davidId,
        sentByName: 'David Sales Rep',
        sentAt: '2026-08-09T13:30:00.000Z',
        messageUsed: 'Hi Marco, loved your wood-fired pizzas! We put together a mobile-ready reservation prototype site for Bella Vista Bistro here: https://bella-vista-preview.webcraft.preview. Would love your feedback!',
        status: 'responded',
        responseType: 'interested',
        responseNotes: 'Marco replied saying the mockup looks amazing and asked for pricing on online table reservations!',
        nextAction: 'Send pricing options and schedule a 10-min phone call.',
        followUpDate: '2026-08-12T10:00:00.000Z'
      }
    ];

    const images: ImageAsset[] = [
      {
        id: 'img-1',
        leadId: lead1Id,
        objectKey: 'apex_van_logo.jpg',
        url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80',
        filename: 'apex_van_branding.jpg',
        mimeType: 'image/jpeg',
        fileSize: 420000,
        uploadedBy: sarahId,
        uploadedByName: 'Sarah Lead Finder',
        isPrimary: true,
        caption: 'Vehicle logo captured from Gumtree listing',
        createdAt: '2026-08-10T08:18:00.000Z'
      },
      {
        id: 'img-2',
        leadId: lead2Id,
        objectKey: 'bella_bistro_pizza.jpg',
        url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
        filename: 'bella_pizza_oven.jpg',
        mimeType: 'image/jpeg',
        fileSize: 680000,
        uploadedBy: sarahId,
        uploadedByName: 'Sarah Lead Finder',
        isPrimary: true,
        caption: 'Wood-fired oven shot from Instagram page',
        createdAt: '2026-08-09T09:35:00.000Z'
      }
    ];

    const stageHistory: StageHistory[] = [
      { id: 'sh-1', leadId: lead1Id, previousStage: 'new_lead', newStage: 'captured', changedBy: sarahId, changedByName: 'Sarah Lead Finder', reason: 'Lead captured from Gumtree', createdAt: '2026-08-10T08:15:00.000Z' },
      { id: 'sh-2', leadId: lead1Id, previousStage: 'captured', newStage: 'template_completed', changedBy: johnId, changedByName: 'John Developer', reason: 'Template mockup ready', createdAt: '2026-08-10T11:20:00.000Z' },
      { id: 'sh-3', leadId: lead1Id, previousStage: 'template_completed', newStage: 'ready_for_outreach', changedBy: johnId, changedByName: 'John Developer', reason: 'Template task completed', createdAt: '2026-08-10T11:20:00.000Z' },
      { id: 'sh-4', leadId: lead2Id, previousStage: 'new_lead', newStage: 'captured', changedBy: sarahId, changedByName: 'Sarah Lead Finder', reason: 'Initial capture', createdAt: '2026-08-09T09:30:00.000Z' },
      { id: 'sh-5', leadId: lead2Id, previousStage: 'ready_for_outreach', newStage: 'outreach_sent', changedBy: davidId, changedByName: 'David Sales Rep', reason: 'Sent Instagram DM', createdAt: '2026-08-09T13:30:00.000Z' },
      { id: 'sh-6', leadId: lead2Id, previousStage: 'outreach_sent', newStage: 'interested', changedBy: davidId, changedByName: 'David Sales Rep', reason: 'Client Marco responded enthusiastically', createdAt: '2026-08-09T14:05:00.000Z' }
    ];

    const notes: LeadNote[] = [
      { id: 'note-1', leadId: lead1Id, authorId: sarahId, authorName: 'Sarah Lead Finder', content: 'Owner Jacob mentioned he lost two major commercial contracts last month because they didn’t have a website to verify credentials.', createdAt: '2026-08-10T08:20:00.000Z' },
      { id: 'note-2', leadId: lead2Id, authorId: davidId, authorName: 'David Sales Rep', content: 'Marco requested a custom quote including online table reservations and PDF menu downloads.', createdAt: '2026-08-09T14:10:00.000Z' }
    ];

    const activityLogs: ActivityLog[] = [
      { id: 'act-1', userId: sarahId, userName: 'Sarah Lead Finder', action: 'lead_created', entityType: 'lead', entityId: lead1Id, entityName: 'Apex Plumbing & Drainage', timestamp: '2026-08-10T08:15:00.000Z' },
      { id: 'act-2', userId: johnId, userName: 'John Developer', action: 'task_grabbed', entityType: 'task', entityId: 'task-2', entityName: 'Template Prototype Creation', timestamp: '2026-08-10T09:00:00.000Z' },
      { id: 'act-3', userId: johnId, userName: 'John Developer', action: 'template_url_added', entityType: 'lead', entityId: lead1Id, entityName: 'Apex Plumbing & Drainage', timestamp: '2026-08-10T11:15:00.000Z' },
      { id: 'act-4', userId: johnId, userName: 'John Developer', action: 'task_completed', entityType: 'task', entityId: 'task-2', entityName: 'Template Prototype Creation', timestamp: '2026-08-10T11:20:00.000Z' },
      { id: 'act-5', userId: davidId, userName: 'David Sales Rep', action: 'outreach_sent', entityType: 'lead', entityId: lead2Id, entityName: 'Bella Vista Bistro', timestamp: '2026-08-09T13:30:00.000Z' },
      { id: 'act-6', userId: davidId, userName: 'David Sales Rep', action: 'response_recorded', entityType: 'lead', entityId: lead2Id, entityName: 'Bella Vista Bistro', timestamp: '2026-08-09T14:05:00.000Z' }
    ];

    const followUps: FollowUp[] = [
      {
        id: 'fu-1',
        leadId: lead2Id,
        leadName: 'Bella Vista Bistro',
        assignedTo: davidId,
        assignedToName: 'David Sales Rep',
        dueDate: '2026-08-12T10:00:00.000Z',
        status: 'pending',
        notes: 'Call Marco regarding pricing options for online table reservation integration.',
        createdAt: '2026-08-09T14:05:00.000Z'
      }
    ];

    const notifications: NotificationItem[] = [
      {
        id: 'notif-1',
        userId: davidId,
        title: 'New Response Received',
        message: 'Bella Vista Bistro responded to Instagram DM: Interested!',
        link: `/leads/${lead2Id}`,
        isRead: false,
        createdAt: '2026-08-09T14:05:00.000Z'
      },
      {
        id: 'notif-2',
        userId: johnId,
        title: 'Template Task Available',
        message: 'Urban Fitness Studio is ready for template mockup creation.',
        link: `/tasks`,
        isRead: true,
        createdAt: '2026-08-11T11:00:00.000Z'
      }
    ];

    return {
      users,
      userPasswords,
      leads,
      contacts,
      channels,
      tasks,
      taskTypes,
      outreachAttempts,
      images,
      stageHistory,
      notes,
      activityLogs,
      followUps,
      notifications,
      closedPeriods: [],
      systemSettings: {
        leadSources: ['Facebook', 'Instagram', 'Gumtree', 'Google', 'TikTok', 'WhatsApp', 'LinkedIn', 'Referral', 'Website', 'Directory', 'Cold Prospecting', 'Other'],
        contactChannels: ['WhatsApp', 'Phone', 'Email', 'Facebook Messenger', 'Instagram DM', 'TikTok', 'LinkedIn', 'SMS', 'Website contact form', 'Other'],
        leadCounter: 100
      }
    };
  }

  // Getters & Query Methods
  public getUsers(): User[] {
    return this.db.users;
  }

  public getUserById(id: string): User | undefined {
    return this.db.users.find(u => u.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    const norm = normalizeEmail(email);
    return this.db.users.find(u => normalizeEmail(u.email) === norm);
  }

  public verifyUserPassword(userId: string, pass: string): boolean {
    const hash = this.db.userPasswords[userId];
    if (!hash) return false;
    return bcrypt.compareSync(pass, hash);
  }

  public createUser(user: Omit<User, 'id' | 'createdAt'>, passwordPlain: string): User {
    const id = `user-${uuidv4().slice(0, 8)}`;
    const newObj: User = {
      ...user,
      id,
      createdAt: new Date().toISOString()
    };
    this.db.users.push(newObj);
    this.db.userPasswords[id] = bcrypt.hashSync(passwordPlain, 10);
    this.save();
    return newObj;
  }

  public updateUser(id: string, updates: Partial<User>, newPassword?: string): User | undefined {
    const idx = this.db.users.findIndex(u => u.id === id);
    if (idx === -1) return undefined;
    this.db.users[idx] = { ...this.db.users[idx], ...updates };
    if (newPassword) {
      this.db.userPasswords[id] = bcrypt.hashSync(newPassword, 10);
    }
    this.save();
    return this.db.users[idx];
  }

  // LEADS
  public getLeads(includeDeleted = false): Lead[] {
    return this.db.leads.filter(l => includeDeleted || !l.deletedAt).map(l => this.enrichLead(l));
  }

  public getLeadById(id: string): Lead | undefined {
    const l = this.db.leads.find(item => item.id === id || item.id === id.toUpperCase());
    if (!l) return undefined;
    return this.enrichLead(l);
  }

  private enrichLead(lead: Lead): Lead {
    const leadContacts = this.db.contacts.filter(c => c.leadId === lead.id);
    const leadChannels = this.db.channels.filter(ch => ch.leadId === lead.id);
    const leadImages = this.db.images.filter(i => i.leadId === lead.id);
    const openTasks = this.db.tasks.filter(t => t.leadId === lead.id && t.status !== 'completed' && t.status !== 'cancelled');

    const createdUser = this.getUserById(lead.createdBy);
    const ownerUser = this.getUserById(lead.ownerId);

    return {
      ...lead,
      createdByName: createdUser ? createdUser.displayName : lead.createdByName,
      ownerName: ownerUser ? ownerUser.displayName : lead.ownerName,
      contacts: leadContacts,
      channels: leadChannels,
      imagesCount: leadImages.length,
      openTasksCount: openTasks.length
    };
  }

  // Duplicate Check
  public checkDuplicates(query: {
    name?: string;
    phone?: string;
    email?: string;
    website?: string;
    instagram?: string;
    facebook?: string;
  }): Lead[] {
    const matches: Lead[] = [];
    const normPhone = query.phone ? normalizePhone(query.phone) : '';
    const normEmail = query.email ? normalizeEmail(query.email) : '';
    const nameLower = query.name ? query.name.trim().toLowerCase() : '';

    for (const lead of this.db.leads) {
      if (lead.deletedAt) continue;
      let matched = false;

      // 1. Business Name match
      if (nameLower && lead.name.toLowerCase().includes(nameLower)) {
        matched = true;
      }

      // 2. Contacts match (phone/email)
      const leadContacts = this.db.contacts.filter(c => c.leadId === lead.id);
      for (const c of leadContacts) {
        if (normPhone && c.normalizedValue && (c.normalizedValue.includes(normPhone) || normPhone.includes(c.normalizedValue))) {
          matched = true;
          break;
        }
        if (normEmail && c.normalizedValue === normEmail) {
          matched = true;
          break;
        }
      }

      // 3. Website match
      if (query.website && lead.website) {
        const w1 = query.website.replace(/(https?:\/\/)?(www\.)?/, '').toLowerCase();
        const w2 = lead.website.replace(/(https?:\/\/)?(www\.)?/, '').toLowerCase();
        if (w1 && w2 && (w1.includes(w2) || w2.includes(w1))) {
          matched = true;
        }
      }

      if (matched && !matches.find(m => m.id === lead.id)) {
        matches.push(this.enrichLead(lead));
      }
    }

    return matches;
  }

  // Global Search
  public searchLeads(q: string): Lead[] {
    if (!q || !q.trim()) return [];
    const term = q.trim().toLowerCase();
    const termNormPhone = normalizePhone(q);

    return this.getLeads().filter(lead => {
      if (lead.id.toLowerCase().includes(term)) return true;
      if (lead.name.toLowerCase().includes(term)) return true;
      if (lead.category && lead.category.toLowerCase().includes(term)) return true;
      if (lead.industry && lead.industry.toLowerCase().includes(term)) return true;
      if (lead.city && lead.city.toLowerCase().includes(term)) return true;
      if (lead.ownerName && lead.ownerName.toLowerCase().includes(term)) return true;

      // Check contacts
      const contacts = this.db.contacts.filter(c => c.leadId === lead.id);
      for (const c of contacts) {
        if (c.value.toLowerCase().includes(term)) return true;
        if (termNormPhone && c.normalizedValue && c.normalizedValue.includes(termNormPhone)) return true;
        if (c.contactPerson && c.contactPerson.toLowerCase().includes(term)) return true;
      }
      return false;
    });
  }

  // Create Lead
  public createLead(data: {
    name: string;
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
    notes?: string;
    source: string;
    priority?: Lead['priority'];
    createdBy: string;
    contacts?: Array<{ type: ContactMethod['type']; value: string; contactPerson?: string; position?: string }>;
    channels?: string[];
  }): Lead {
    this.db.systemSettings.leadCounter += 1;
    const numStr = String(this.db.systemSettings.leadCounter).padStart(6, '0');
    const leadId = `LEAD-${numStr}`;

    const creator = this.getUserById(data.createdBy);

    const newLead: Lead = {
      id: leadId,
      name: data.name,
      description: data.description || '',
      category: data.category || '',
      industry: data.industry || '',
      city: data.city || '',
      province: data.province || '',
      country: data.country || 'South Africa',
      address: data.address || '',
      website: data.website || '',
      existingWebsiteStatus: data.existingWebsiteStatus || 'None',
      googleBusinessUrl: data.googleBusinessUrl || '',
      notes: data.notes || '',
      source: data.source || 'Other',
      stage: 'captured',
      priority: data.priority || 'normal',
      quality: 'verified',
      createdBy: data.createdBy,
      createdByName: creator ? creator.displayName : 'Unknown',
      ownerId: data.createdBy,
      ownerName: creator ? creator.displayName : 'Unknown',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.db.leads.push(newLead);

    // Save contacts
    if (data.contacts && data.contacts.length > 0) {
      for (const c of data.contacts) {
        if (!c.value || !c.value.trim()) continue;
        const norm = c.type.includes('phone') || c.type === 'whatsapp' ? normalizePhone(c.value) : normalizeEmail(c.value);
        this.db.contacts.push({
          id: `c-${uuidv4().slice(0, 8)}`,
          leadId,
          type: c.type,
          value: c.value,
          normalizedValue: norm,
          contactPerson: c.contactPerson || '',
          position: c.position || '',
          createdAt: new Date().toISOString()
        });
      }
    }

    // Save channels
    if (data.channels && data.channels.length > 0) {
      for (const ch of data.channels) {
        this.db.channels.push({
          id: `ch-${uuidv4().slice(0, 8)}`,
          leadId,
          channel: ch as any,
          createdAt: new Date().toISOString()
        });
      }
    }

    // Record Stage History
    this.db.stageHistory.push({
      id: `sh-${uuidv4().slice(0, 8)}`,
      leadId,
      previousStage: 'new_lead',
      newStage: 'captured',
      changedBy: data.createdBy,
      changedByName: creator ? creator.displayName : '',
      reason: 'Lead initially captured into system',
      createdAt: new Date().toISOString()
    });

    // Automatically complete 'Lead Research & Capture' task for creator (PAYOUT = R0)
    const captureTaskType = this.db.taskTypes.find(tt => tt.key === 'capture');
    const rate = captureTaskType ? captureTaskType.defaultRate : 0;

    const captureTask: Task = {
      id: `task-${uuidv4().slice(0, 8)}`,
      leadId,
      leadName: newLead.name,
      leadStage: 'captured',
      taskTypeId: captureTaskType ? captureTaskType.id : 'tt-1',
      taskTypeKey: 'capture',
      taskTypeName: 'Lead Research & Capture',
      status: 'completed',
      createdBy: data.createdBy,
      createdByName: creator ? creator.displayName : '',
      assignedTo: data.createdBy,
      assignedToName: creator ? creator.displayName : '',
      rateValue: rate,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      version: 1,
      createdAt: new Date().toISOString()
    };
    this.db.tasks.push(captureTask);

    // Automatically generate next task: Template Creation Task (Available, Action = R1.00)
    const templateTaskType = this.db.taskTypes.find(tt => tt.key === 'template');
    const templateTask: Task = {
      id: `task-${uuidv4().slice(0, 8)}`,
      leadId,
      leadName: newLead.name,
      leadStage: 'captured',
      taskTypeId: templateTaskType ? templateTaskType.id : 'tt-2',
      taskTypeKey: 'template',
      taskTypeName: 'Template Prototype Creation',
      status: 'available',
      createdBy: data.createdBy,
      createdByName: creator ? creator.displayName : '',
      rateValue: templateTaskType ? templateTaskType.defaultRate : 1.0,
      version: 1,
      createdAt: new Date().toISOString()
    };
    this.db.tasks.push(templateTask);

    // Log Activity
    this.addActivityLog(data.createdBy, 'lead_created', 'lead', leadId, newLead.name, { source: data.source });

    this.save();
    return this.enrichLead(newLead);
  }

  public updateLead(id: string, updates: Partial<Lead>, userId: string): Lead | undefined {
    const idx = this.db.leads.findIndex(l => l.id === id);
    if (idx === -1) return undefined;

    const oldStage = this.db.leads[idx].stage;
    const user = this.getUserById(userId);

    this.db.leads[idx] = {
      ...this.db.leads[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // If stage changed, update history
    if (updates.stage && updates.stage !== oldStage) {
      this.db.stageHistory.push({
        id: `sh-${uuidv4().slice(0, 8)}`,
        leadId: id,
        previousStage: oldStage,
        newStage: updates.stage,
        changedBy: userId,
        changedByName: user ? user.displayName : '',
        reason: 'Stage updated manually',
        createdAt: new Date().toISOString()
      });
      this.addActivityLog(userId, 'stage_changed', 'lead', id, this.db.leads[idx].name, { from: oldStage, to: updates.stage });
    } else {
      this.addActivityLog(userId, 'lead_updated', 'lead', id, this.db.leads[idx].name);
    }

    this.save();
    return this.enrichLead(this.db.leads[idx]);
  }

  // Soft Delete Lead
  public deleteLead(id: string, userId: string, reason?: string): boolean {
    const lead = this.db.leads.find(l => l.id === id);
    if (!lead) return false;
    lead.deletedAt = new Date().toISOString();
    this.addActivityLog(userId, 'lead_deleted', 'lead', id, lead.name, { reason });
    this.save();
    return true;
  }

  // TASKS
  public getTasks(filters?: { status?: string; assignedTo?: string; taskTypeKey?: string; leadId?: string }): Task[] {
    let list = this.db.tasks;
    if (filters) {
      if (filters.status) list = list.filter(t => t.status === filters.status);
      if (filters.assignedTo) list = list.filter(t => t.assignedTo === filters.assignedTo);
      if (filters.taskTypeKey) list = list.filter(t => t.taskTypeKey === filters.taskTypeKey);
      if (filters.leadId) list = list.filter(t => t.leadId === filters.leadId);
    }
    return list.map(t => {
      const lead = this.db.leads.find(l => l.id === t.leadId);
      const assignedUser = t.assignedTo ? this.getUserById(t.assignedTo) : undefined;
      const createdUser = this.getUserById(t.createdBy);
      return {
        ...t,
        leadName: lead ? lead.name : t.leadName,
        leadStage: lead ? lead.stage : t.leadStage,
        assignedToName: assignedUser ? assignedUser.displayName : t.assignedToName,
        createdByName: createdUser ? createdUser.displayName : t.createdByName
      };
    });
  }

  public getTaskById(id: string): Task | undefined {
    return this.getTasks().find(t => t.id === id);
  }

  // ATOMIC TASK GRAB LOCK
  public grabTask(taskId: string, userId: string): { success: boolean; message: string; task?: Task } {
    const taskIdx = this.db.tasks.findIndex(t => t.id === taskId);
    if (taskIdx === -1) {
      return { success: false, message: 'Task not found' };
    }

    const task = this.db.tasks[taskIdx];

    // Concurrency check: Task must be 'available'
    if (task.status !== 'available') {
      const currentAssigned = task.assignedTo ? this.getUserById(task.assignedTo)?.displayName : 'another user';
      return {
        success: false,
        message: `Task is no longer available. It was already grabbed by ${currentAssigned}.`
      };
    }

    const user = this.getUserById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // Atomic update
    this.db.tasks[taskIdx] = {
      ...task,
      status: 'in_progress',
      assignedTo: userId,
      assignedToName: user.displayName,
      startedAt: new Date().toISOString(),
      version: task.version + 1
    };

    // Update lead owner
    const leadIdx = this.db.leads.findIndex(l => l.id === task.leadId);
    if (leadIdx !== -1) {
      this.db.leads[leadIdx].ownerId = userId;
      this.db.leads[leadIdx].ownerName = user.displayName;
    }

    this.addActivityLog(userId, 'task_grabbed', 'task', taskId, task.taskTypeName, { leadId: task.leadId, leadName: task.leadName });

    this.save();
    return {
      success: true,
      message: `Task successfully grabbed by ${user.displayName}`,
      task: this.getTaskById(taskId)
    };
  }

  // ATOMIC TASK COMPLETE
  public completeTask(taskId: string, userId: string, notes?: string, extraData?: { templateUrl?: string }): { success: boolean; message: string; task?: Task } {
    const taskIdx = this.db.tasks.findIndex(t => t.id === taskId);
    if (taskIdx === -1) {
      return { success: false, message: 'Task not found' };
    }

    const task = this.db.tasks[taskIdx];

    if (task.status === 'completed') {
      return { success: false, message: 'Task is already completed and counted.' };
    }

    const user = this.getUserById(userId);

    // Get latest rate from taskTypes
    const taskType = this.db.taskTypes.find(tt => tt.key === task.taskTypeKey);
    const rateValue = taskType ? taskType.defaultRate : task.rateValue;

    this.db.tasks[taskIdx] = {
      ...task,
      status: 'completed',
      assignedTo: task.assignedTo || userId,
      assignedToName: task.assignedToName || (user ? user.displayName : ''),
      rateValue,
      completedAt: new Date().toISOString(),
      notes: notes || task.notes,
      version: task.version + 1
    };

    // Workflow stage auto-progression on task completion
    const leadIdx = this.db.leads.findIndex(l => l.id === task.leadId);
    if (leadIdx !== -1) {
      const lead = this.db.leads[leadIdx];

      if (extraData?.templateUrl) {
        lead.templateUrl = extraData.templateUrl;
        lead.previewUrl = extraData.templateUrl;
      }

      if (task.taskTypeKey === 'template') {
        lead.stage = 'ready_for_outreach';
        this.db.stageHistory.push({
          id: `sh-${uuidv4().slice(0, 8)}`,
          leadId: lead.id,
          previousStage: lead.stage,
          newStage: 'ready_for_outreach',
          changedBy: userId,
          changedByName: user ? user.displayName : '',
          reason: 'Template created & completed',
          createdAt: new Date().toISOString()
        });

        // Generate next task: Outreach Task (Available)
        const outreachTaskType = this.db.taskTypes.find(tt => tt.key === 'outreach');
        const outreachTask: Task = {
          id: `task-${uuidv4().slice(0, 8)}`,
          leadId: lead.id,
          leadName: lead.name,
          leadStage: 'ready_for_outreach',
          taskTypeId: outreachTaskType ? outreachTaskType.id : 'tt-3',
          taskTypeKey: 'outreach',
          taskTypeName: 'Initial Business Outreach',
          status: 'available',
          createdBy: userId,
          createdByName: user ? user.displayName : '',
          rateValue: outreachTaskType ? outreachTaskType.defaultRate : 0.5,
          version: 1,
          createdAt: new Date().toISOString()
        };
        this.db.tasks.push(outreachTask);
      } else if (task.taskTypeKey === 'outreach') {
        lead.stage = 'awaiting_response';
      }
    }

    this.addActivityLog(userId, 'task_completed', 'task', taskId, task.taskTypeName, { leadId: task.leadId, rateValue });

    this.save();
    return {
      success: true,
      message: 'Task marked completed successfully.',
      task: this.getTaskById(taskId)
    };
  }

  // BLOCK TASK
  public blockTask(taskId: string, userId: string, reason: string): { success: boolean; task?: Task } {
    const taskIdx = this.db.tasks.findIndex(t => t.id === taskId);
    if (taskIdx === -1) return { success: false };

    this.db.tasks[taskIdx].status = 'blocked';
    this.db.tasks[taskIdx].blockReason = reason;
    this.db.tasks[taskIdx].version += 1;

    this.addActivityLog(userId, 'task_blocked', 'task', taskId, this.db.tasks[taskIdx].taskTypeName, { reason });

    this.save();
    return { success: true, task: this.getTaskById(taskId) };
  }

  // OUTREACH ATTEMPTS
  public recordOutreach(data: {
    leadId: string;
    channel: string;
    sentBy: string;
    messageUsed?: string;
    status: OutreachAttempt['status'];
    responseType?: OutreachAttempt['responseType'];
    responseNotes?: string;
    nextAction?: string;
    followUpDate?: string;
  }): OutreachAttempt {
    const user = this.getUserById(data.sentBy);

    const attempt: OutreachAttempt = {
      id: `oa-${uuidv4().slice(0, 8)}`,
      leadId: data.leadId,
      channel: data.channel,
      sentBy: data.sentBy,
      sentByName: user ? user.displayName : '',
      sentAt: new Date().toISOString(),
      messageUsed: data.messageUsed || '',
      status: data.status,
      responseType: data.responseType,
      responseNotes: data.responseNotes,
      nextAction: data.nextAction,
      followUpDate: data.followUpDate
    };

    this.db.outreachAttempts.push(attempt);

    // Update lead stage based on response
    const leadIdx = this.db.leads.findIndex(l => l.id === data.leadId);
    if (leadIdx !== -1) {
      const lead = this.db.leads[leadIdx];
      if (data.status === 'responded' || data.responseType) {
        if (data.responseType === 'interested') {
          lead.stage = 'interested';
        } else if (data.responseType === 'not_interested') {
          lead.stage = 'not_interested';
        } else {
          lead.stage = 'response_received';
        }
      } else {
        lead.stage = 'outreach_sent';
      }
    }

    // Schedule Follow Up if requested
    if (data.followUpDate) {
      this.db.followUps.push({
        id: `fu-${uuidv4().slice(0, 8)}`,
        leadId: data.leadId,
        leadName: leadIdx !== -1 ? this.db.leads[leadIdx].name : '',
        assignedTo: data.sentBy,
        assignedToName: user ? user.displayName : '',
        dueDate: data.followUpDate,
        status: 'pending',
        notes: data.nextAction || 'Outreach follow up',
        createdAt: new Date().toISOString()
      });
    }

    this.addActivityLog(data.sentBy, 'outreach_recorded', 'lead', data.leadId, leadIdx !== -1 ? this.db.leads[leadIdx].name : '', {
      channel: data.channel,
      status: data.status
    });

    this.save();
    return attempt;
  }

  public getOutreachHistory(leadId: string): OutreachAttempt[] {
    return this.db.outreachAttempts
      .filter(o => o.leadId === leadId)
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  }

  // IMAGES / ASSETS
  public addImage(data: {
    leadId: string;
    objectKey: string;
    url: string;
    filename: string;
    mimeType: string;
    fileSize: number;
    uploadedBy: string;
    caption?: string;
    isPrimary?: boolean;
  }): ImageAsset {
    const user = this.getUserById(data.uploadedBy);

    // If marked primary, un-primary existing images
    if (data.isPrimary) {
      this.db.images.forEach(img => {
        if (img.leadId === data.leadId) img.isPrimary = false;
      });
    }

    const newImg: ImageAsset = {
      id: `img-${uuidv4().slice(0, 8)}`,
      leadId: data.leadId,
      objectKey: data.objectKey,
      url: data.url,
      filename: data.filename,
      mimeType: data.mimeType,
      fileSize: data.fileSize,
      uploadedBy: data.uploadedBy,
      uploadedByName: user ? user.displayName : '',
      caption: data.caption || '',
      isPrimary: data.isPrimary || this.db.images.filter(i => i.leadId === data.leadId).length === 0,
      createdAt: new Date().toISOString()
    };

    this.db.images.push(newImg);
    this.addActivityLog(data.uploadedBy, 'image_uploaded', 'lead', data.leadId, data.filename);

    this.save();
    return newImg;
  }

  public getLeadImages(leadId: string): ImageAsset[] {
    return this.db.images.filter(i => i.leadId === leadId);
  }

  public deleteImage(imageId: string, userId: string): boolean {
    const idx = this.db.images.findIndex(i => i.id === imageId);
    if (idx === -1) return false;
    const img = this.db.images[idx];
    this.db.images.splice(idx, 1);
    this.addActivityLog(userId, 'image_deleted', 'lead', img.leadId, img.filename);
    this.save();
    return true;
  }

  // NOTES
  public addNote(leadId: string, authorId: string, content: string): LeadNote {
    const user = this.getUserById(authorId);
    const newNote: LeadNote = {
      id: `note-${uuidv4().slice(0, 8)}`,
      leadId,
      authorId,
      authorName: user ? user.displayName : '',
      content,
      createdAt: new Date().toISOString()
    };
    this.db.notes.push(newNote);
    this.addActivityLog(authorId, 'note_added', 'lead', leadId);
    this.save();
    return newNote;
  }

  public getLeadNotes(leadId: string): LeadNote[] {
    return this.db.notes.filter(n => n.leadId === leadId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // STAGE HISTORY & ACTIVITY LOGS
  public getStageHistory(leadId: string): StageHistory[] {
    return this.db.stageHistory.filter(s => s.leadId === leadId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getActivityLogs(limit = 50, leadId?: string): ActivityLog[] {
    let logs = this.db.activityLogs;
    if (leadId) {
      logs = logs.filter(l => l.entityId === leadId);
    }
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
  }

  private addActivityLog(userId: string, action: string, entityType: string, entityId: string, entityName?: string, metadata?: any) {
    const user = this.getUserById(userId);
    this.db.activityLogs.push({
      id: `act-${uuidv4().slice(0, 8)}`,
      userId,
      userName: user ? user.displayName : '',
      action,
      entityType,
      entityId,
      entityName,
      metadata,
      timestamp: new Date().toISOString()
    });
  }

  // FOLLOW UPS
  public getFollowUps(userId?: string): FollowUp[] {
    let list = this.db.followUps;
    if (userId) {
      list = list.filter(f => f.assignedTo === userId);
    }
    return list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  // STATS & EARNINGS CALCULATION ENGINE
  public getUserEarnings(userId: string): {
    todayCount: number;
    todayEarnings: number;
    weekCount: number;
    weekEarnings: number;
    monthCount: number;
    monthEarnings: number;
    breakdown: Record<string, { count: number; value: number }>;
    completedTasks: Task[];
  } {
    const completed = this.db.tasks.filter(t => t.assignedTo === userId && t.status === 'completed' && t.completedAt);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // Start of week (Monday)
    const dayOfWeek = now.getDay();
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday).getTime();

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let todayCount = 0;
    let todayEarnings = 0;
    let weekCount = 0;
    let weekEarnings = 0;
    let monthCount = 0;
    let monthEarnings = 0;

    const breakdown: Record<string, { count: number; value: number }> = {};

    for (const t of completed) {
      const tTime = new Date(t.completedAt!).getTime();
      const val = t.rateValue || 100;

      if (!breakdown[t.taskTypeName]) {
        breakdown[t.taskTypeName] = { count: 0, value: 0 };
      }
      breakdown[t.taskTypeName].count += 1;
      breakdown[t.taskTypeName].value += val;

      if (tTime >= startOfToday) {
        todayCount++;
        todayEarnings += val;
      }
      if (tTime >= startOfWeek) {
        weekCount++;
        weekEarnings += val;
      }
      if (tTime >= startOfMonth) {
        monthCount++;
        monthEarnings += val;
      }
    }

    return {
      todayCount,
      todayEarnings,
      weekCount,
      weekEarnings,
      monthCount,
      monthEarnings,
      breakdown,
      completedTasks: completed
    };
  }

  public getTeamPerformance(): Array<{
    user: User;
    captureCount: number;
    templateCount: number;
    outreachCount: number;
    followupCount: number;
    totalTasks: number;
    totalValue: number;
  }> {
    return this.db.users.map(u => {
      const userTasks = this.db.tasks.filter(t => t.assignedTo === u.id && t.status === 'completed');
      let captureCount = 0;
      let templateCount = 0;
      let outreachCount = 0;
      let followupCount = 0;
      let totalValue = 0;

      for (const t of userTasks) {
        const val = t.rateValue || 100;
        totalValue += val;
        if (t.taskTypeKey === 'capture') captureCount++;
        else if (t.taskTypeKey === 'template') templateCount++;
        else if (t.taskTypeKey === 'outreach') outreachCount++;
        else followupCount++;
      }

      return {
        user: u,
        captureCount,
        templateCount,
        outreachCount,
        followupCount,
        totalTasks: userTasks.length,
        totalValue
      };
    });
  }

  // ADMIN SYSTEM CONFIG
  public getSystemSettings() {
    return this.db.systemSettings;
  }

  public getTaskTypes(): TaskType[] {
    return this.db.taskTypes;
  }

  public updateTaskTypeRate(id: string, newRate: number, userId: string): boolean {
    const tt = this.db.taskTypes.find(t => t.id === id);
    if (!tt) return false;
    tt.defaultRate = newRate;
    this.addActivityLog(userId, 'task_rate_updated', 'system', id, tt.name, { newRate });
    this.save();
    return true;
  }

  public addLeadSource(sourceName: string, userId: string): boolean {
    if (!this.db.systemSettings.leadSources.includes(sourceName)) {
      this.db.systemSettings.leadSources.push(sourceName);
      this.addActivityLog(userId, 'lead_source_added', 'system', sourceName);
      this.save();
      return true;
    }
    return false;
  }
}

export const db = new DatabaseStore();
