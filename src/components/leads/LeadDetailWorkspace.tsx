import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Globe,
  ExternalLink,
  Send,
  MessageSquare,
  UserCheck,
  UserX,
  ShieldAlert,
  Copy,
  Check,
  CheckCircle2,
  Sparkles,
  Layers,
  Phone,
  Mail,
  Trash2,
  Edit3,
  Save,
  Building,
  MapPin,
  Tag,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Upload,
  Plus,
  Search,
  Maximize2,
  Download,
  ZoomIn,
  Paperclip,
  Link as LinkIcon,
  Calculator,
  DollarSign,
  Clipboard,
  ClipboardPaste,
  FileText,
  MousePointer
} from 'lucide-react';
import { Lead, Task, OutreachAttempt, User, LeadNote, LeadStage, LeadPriority, ImageAsset } from '../../types';
import { formatDateTime, formatTimeAgo, getStageLabel, formatExternalUrl, cleanUrl, getNextStage, getPreviousStage } from '../../lib/utils';
import { COUNTRIES, getCountryByName } from '../../lib/currencyUtils';
import { renderTextWithClickableLinks } from '../../lib/linkUtils';
import { ConfirmModal } from '../common/ConfirmModal';
import { DirectOutreachBar } from './DirectOutreachBar';
import { RecordOutreachModal } from './RecordOutreachModal';
import {
  subscribeToLeadDetail,
  addLeadNoteInFirestore,
  updateLeadInFirestore,
  recordOutreachInFirestore,
  grabTaskAtomic,
  completeTaskAtomic,
  claimLeadOwner,
  releaseLeadOwner,
  adminOverrideLeadOwner,
  releaseTaskAtomic,
  adminOverrideTask,
  deleteLeadCascade,
  deleteContactFromLead,
  deleteOutreachAttempt,
  deleteLeadNote,
  deleteTask,
  clearLeadPrototypeUrl,
  uploadClipboardOrFileToFirebaseStorage,
  addExternalImageUrlToLead,
  deleteImageFromLead
} from '../../lib/firestoreService';
import {
  generateEnglishPitch,
  generateAngolanPortuguesePitch,
  generateWhatsAppPitch,
  getLeadContactPerson,
  getLeadPhone
} from '../../lib/outreachActions';
import { SavedPackageModal } from '../processor/SavedPackageModal';

interface LeadDetailWorkspaceProps {
  leadId: string;
  currentUser: User;
  initialLead?: Lead;
  onClose: () => void;
  onLeadUpdated: () => void;
}

export const LeadDetailWorkspace: React.FC<LeadDetailWorkspaceProps> = ({
  leadId,
  currentUser,
  initialLead,
  onClose,
  onLeadUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'template' | 'outreach' | 'tasks' | 'images'>('overview');
  const [lead, setLead] = useState<Lead | null>(initialLead || null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [outreach, setOutreach] = useState<OutreachAttempt[]>([]);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [isLoading, setIsLoading] = useState(!initialLead);

  // Outreach Modal State
  const [isRecordOutreachModalOpen, setIsRecordOutreachModalOpen] = useState(false);
  const [modalInitialChannel, setModalInitialChannel] = useState('WhatsApp');
  const [modalInitialRecipient, setModalInitialRecipient] = useState('');
  const [modalInitialMessage, setModalInitialMessage] = useState('');

  // AI Sales Assistant State
  const [salesPitchLanguage, setSalesPitchLanguage] = useState<'english' | 'portuguese'>('english');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiCustomEnglish, setAiCustomEnglish] = useState('');
  const [aiCustomPortuguese, setAiCustomPortuguese] = useState('');
  const [salesAssistantInput, setSalesAssistantInput] = useState('');
  const [showSalesInputBox, setShowSalesInputBox] = useState(false);

  // Image Upload & Gallery State
  const [selectedZoomImage, setSelectedZoomImage] = useState<ImageAsset | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageCaptionInput, setImageCaptionInput] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [imageSearchQuery, setImageSearchQuery] = useState('');
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [pasteToast, setPasteToast] = useState<string | null>(null);
  const [isDownloadingAttachments, setIsDownloadingAttachments] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Forms
  const [templateUrl, setTemplateUrl] = useState('');
  const [outreachChannel, setOutreachChannel] = useState('WhatsApp');
  const [outreachMessage, setOutreachMessage] = useState('');
  const [outreachStatus, setOutreachStatus] = useState<OutreachAttempt['status']>('sent');
  const [isSubmittingOutreach, setIsSubmittingOutreach] = useState(false);

  // Comment state
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  // Copy feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingLead, setIsDeletingLead] = useState(false);

  // Lead Edit Modal state
  const [isEditingLead, setIsEditingLead] = useState(false);
  const [editLeadMode, setEditLeadMode] = useState<'form' | 'json'>('form');
  const [editLeadJson, setEditLeadJson] = useState('');
  const [jsonParseError, setJsonParseError] = useState('');
  const [editLeadName, setEditLeadName] = useState('');
  const [editLeadContactPerson, setEditLeadContactPerson] = useState('');
  const [editLeadPhone, setEditLeadPhone] = useState('');
  const [editLeadEmail, setEditLeadEmail] = useState('');
  const [editLeadCategory, setEditLeadCategory] = useState('');
  const [editLeadSource, setEditLeadSource] = useState('');
  const [editLeadSourceUrl, setEditLeadSourceUrl] = useState('');
  const [editLeadSourceId, setEditLeadSourceId] = useState('');
  const [editLeadCountry, setEditLeadCountry] = useState('South Africa');
  const [editLeadStage, setEditLeadStage] = useState<LeadStage>('captured');
  const [editLeadPriority, setEditLeadPriority] = useState<LeadPriority>('normal');
  const [editLeadCity, setEditLeadCity] = useState('');
  const [editLeadProvince, setEditLeadProvince] = useState('');
  const [editLeadAddress, setEditLeadAddress] = useState('');
  const [editLeadWebsite, setEditLeadWebsite] = useState('');
  const [editLeadGoogleBusinessUrl, setEditLeadGoogleBusinessUrl] = useState('');
  const [editLeadExistingWebsiteStatus, setEditLeadExistingWebsiteStatus] = useState('None');
  const [editLeadDescription, setEditLeadDescription] = useState('');
  const [isSavingLeadEdit, setIsSavingLeadEdit] = useState(false);

  const handleOpenEditLead = () => {
    if (!lead) return;
    setEditLeadName(lead.name || '');
    setEditLeadContactPerson(lead.contactPerson || '');
    setEditLeadPhone(lead.phone || '');
    setEditLeadEmail(lead.email || '');
    setEditLeadCategory(lead.category || '');
    setEditLeadSource(lead.source || 'Gumtree');
    setEditLeadSourceUrl(lead.sourceUrl || '');
    setEditLeadSourceId(lead.sourceId || '');
    setEditLeadCountry(lead.country || 'South Africa');
    setEditLeadStage(lead.stage || 'captured');
    setEditLeadPriority(lead.priority || 'normal');
    setEditLeadCity(lead.city || '');
    setEditLeadProvince(lead.province || '');
    setEditLeadAddress(lead.address || '');
    setEditLeadWebsite(lead.website || '');
    setEditLeadGoogleBusinessUrl(lead.googleBusinessUrl || '');
    setEditLeadExistingWebsiteStatus(lead.existingWebsiteStatus || 'None');
    setEditLeadDescription(lead.description || '');

    const jsonObj = {
      name: lead.name || '',
      contactPerson: lead.contactPerson || '',
      phone: lead.phone || '',
      email: lead.email || '',
      category: lead.category || '',
      source: lead.source || 'Gumtree',
      sourceUrl: lead.sourceUrl || '',
      sourceId: lead.sourceId || '',
      country: lead.country || 'South Africa',
      stage: lead.stage || 'captured',
      priority: lead.priority || 'normal',
      city: lead.city || '',
      province: lead.province || '',
      address: lead.address || '',
      website: lead.website || '',
      googleBusinessUrl: lead.googleBusinessUrl || '',
      existingWebsiteStatus: lead.existingWebsiteStatus || 'None',
      description: lead.description || '',
      contacts: lead.contacts || []
    };
    setEditLeadJson(JSON.stringify(jsonObj, null, 2));
    setJsonParseError('');
    setEditLeadMode('form');
    setIsEditingLead(true);
  };

  const handleSaveLeadEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    setIsSavingLeadEdit(true);
    setJsonParseError('');

    try {
      if (editLeadMode === 'json') {
        let parsed: any;
        try {
          parsed = JSON.parse(editLeadJson);
        } catch (err: any) {
          setJsonParseError('Invalid JSON format: ' + err.message);
          setIsSavingLeadEdit(false);
          return;
        }

        if (!parsed.name || typeof parsed.name !== 'string' || !parsed.name.trim()) {
          setJsonParseError('JSON must include a valid "name" field for the business.');
          setIsSavingLeadEdit(false);
          return;
        }

        const updatedFields: Partial<Lead> = {
          name: parsed.name.trim(),
          contactPerson: parsed.contactPerson || '',
          phone: parsed.phone || '',
          email: parsed.email || '',
          category: parsed.category || '',
          source: parsed.source || 'Gumtree',
          sourceUrl: cleanUrl(parsed.sourceUrl) || parsed.sourceUrl || '',
          sourceId: parsed.sourceId ? String(parsed.sourceId).replace(/^[\[\("'\s]+|[\]\)"'\s]+$/g, '').trim() : '',
          stage: parsed.stage || 'captured',
          priority: parsed.priority || 'normal',
          city: parsed.city || '',
          province: parsed.province || '',
          address: parsed.address || '',
          website: cleanUrl(parsed.website) || parsed.website || '',
          googleBusinessUrl: cleanUrl(parsed.googleBusinessUrl) || parsed.googleBusinessUrl || '',
          existingWebsiteStatus: parsed.existingWebsiteStatus || 'None',
          description: parsed.description || ''
        };

        if (Array.isArray(parsed.contacts)) {
          updatedFields.contacts = parsed.contacts;
        }

        await updateLeadInFirestore(lead.id, updatedFields, currentUser.id, currentUser.displayName);
      } else {
        if (!editLeadName.trim()) {
          alert('Business name is required.');
          setIsSavingLeadEdit(false);
          return;
        }
        await updateLeadInFirestore(
          lead.id,
          {
            name: editLeadName.trim(),
            contactPerson: editLeadContactPerson.trim(),
            phone: editLeadPhone.trim(),
            email: editLeadEmail.trim(),
            category: editLeadCategory.trim(),
            source: editLeadSource.trim(),
            sourceUrl: cleanUrl(editLeadSourceUrl) || editLeadSourceUrl.trim(),
            sourceId: editLeadSourceId.replace(/^[\[\("'\s]+|[\]\)"'\s]+$/g, '').trim(),
            country: editLeadCountry.trim(),
            stage: editLeadStage,
            priority: editLeadPriority,
            city: editLeadCity.trim(),
            province: editLeadProvince.trim(),
            address: editLeadAddress.trim(),
            website: cleanUrl(editLeadWebsite) || editLeadWebsite.trim(),
            googleBusinessUrl: cleanUrl(editLeadGoogleBusinessUrl) || editLeadGoogleBusinessUrl.trim(),
            existingWebsiteStatus: editLeadExistingWebsiteStatus,
            description: editLeadDescription.trim()
          },
          currentUser.id,
          currentUser.displayName
        );
      }

      setIsEditingLead(false);
      onLeadUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to save lead edits.');
    } finally {
      setIsSavingLeadEdit(false);
    }
  };

  useEffect(() => {
    if (initialLead) {
      setLead(initialLead);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    const unsubscribe = subscribeToLeadDetail(leadId, (data) => {
      if (data?.lead) {
        setLead(data.lead);
        if (data.lead.templateUrl) setTemplateUrl(data.lead.templateUrl);
      }
      setTasks(data?.tasks || []);
      setOutreach(data?.outreach || []);
      setNotes(data?.notes || []);
      setImages(data?.images || []);
      setUsers(data?.users || []);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [leadId]);

  // Paste handler for pasting images from clipboard
  const handlePaste = async (e: React.ClipboardEvent) => {
    if (!lead) return;

    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    // 1. Image files in clipboard
    if (clipboardData.files && clipboardData.files.length > 0) {
      for (let i = 0; i < clipboardData.files.length; i++) {
        const file = clipboardData.files[i];
        if (file.type.startsWith('image/')) {
          e.preventDefault();
          setIsUploadingImage(true);
          try {
            await uploadClipboardOrFileToFirebaseStorage(
              lead.id,
              file,
              currentUser.id,
              currentUser.displayName,
              file.name || `Pasted_Screenshot_${Date.now()}.png`,
              'Pasted picture'
            );
            setActiveTab('images');
          } catch (err: any) {
            alert(err.message || 'Failed to attach pasted image');
          } finally {
            setIsUploadingImage(false);
          }
        }
      }
      return;
    }

    // 2. Pasted Image URL
    const pastedText = clipboardData.getData('text')?.trim();
    if (
      pastedText &&
      (pastedText.startsWith('http://') || pastedText.startsWith('https://')) &&
      (pastedText.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) ||
        pastedText.includes('images.unsplash.com') ||
        pastedText.includes('googleusercontent.com') ||
        pastedText.includes('imgur.com') ||
        pastedText.includes('cloudinary') ||
        pastedText.includes('blob:'))
    ) {
      e.preventDefault();
      setIsUploadingImage(true);
      try {
        await addExternalImageUrlToLead(
          lead.id,
          pastedText,
          'Pasted_Image_Link.jpg',
          'Pasted picture link',
          currentUser.id,
          currentUser.displayName
        );
        setActiveTab('images');
      } catch (err: any) {
        alert(err.message || 'Failed to attach pasted image link');
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  const getAttachmentDownloadName = (filename: string) => {
    const parts = filename.split('/');
    return parts[parts.length - 1] || 'download';
  };

  const handleDownloadAttachment = async (attachment: ImageAsset) => {
    try {
      const response = await fetch(attachment.url);
      if (!response.ok) throw new Error('Download failed.');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = getAttachmentDownloadName(attachment.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      alert(err.message || 'Failed to download file.');
    }
  };

  const crc32 = (data: Uint8Array) => {
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
      for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    return (crc ^ 0xffffffff) >>> 0;
  };

  const makeZip = (files: Array<{ name: string; data: Uint8Array }>) => {
    const encoder = new TextEncoder();
    const localParts: Uint8Array[] = [];
    const centralParts: Uint8Array[] = [];
    let offset = 0;

    const write32 = (view: DataView, pos: number, value: number) => view.setUint32(pos, value >>> 0, true);
    const write16 = (view: DataView, pos: number, value: number) => view.setUint16(pos, value & 0xffff, true);

    for (const file of files) {
      const name = encoder.encode(file.name);
      const data = file.data;
      const crc = crc32(data);
      const local = new Uint8Array(30 + name.length + data.length);
      const lv = new DataView(local.buffer);
      write32(lv, 0, 0x04034b50);
      write16(lv, 4, 20);
      write16(lv, 6, 0x0800);
      write16(lv, 8, 0);
      write16(lv, 10, 0);
      write16(lv, 12, 0);
      write32(lv, 14, crc);
      write32(lv, 18, data.length);
      write32(lv, 22, data.length);
      write16(lv, 26, name.length);
      write16(lv, 28, 0);
      local.set(name, 30);
      local.set(data, 30 + name.length);
      localParts.push(local);

      const central = new Uint8Array(46 + name.length);
      const cv = new DataView(central.buffer);
      write32(cv, 0, 0x02014b50);
      write16(cv, 4, 20);
      write16(cv, 6, 20);
      write16(cv, 8, 0x0800);
      write16(cv, 10, 0);
      write16(cv, 12, 0);
      write16(cv, 14, 0);
      write32(cv, 16, crc);
      write32(cv, 20, data.length);
      write32(cv, 24, data.length);
      write16(cv, 28, name.length);
      write16(cv, 30, 0);
      write16(cv, 32, 0);
      write16(cv, 34, 0);
      write16(cv, 36, 0);
      write32(cv, 38, 0);
      write32(cv, 42, offset);
      central.set(name, 46);
      centralParts.push(central);
      offset += local.length;
    }

    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);
    write32(ev, 0, 0x06054b50);
    write16(ev, 8, files.length);
    write16(ev, 10, files.length);
    write32(ev, 12, centralSize);
    write32(ev, 16, offset);
    write16(ev, 20, 0);

    const total = [...localParts, ...centralParts, end];
    const blobParts = total.map(part => new Blob([part]));
    return new Blob(blobParts, { type: 'application/zip' });
  };

  const handleDownloadAllAttachments = async () => {
    if (!images.length) return;

    setIsDownloadingAttachments(true);
    try {
      const files: Array<{ name: string; data: Uint8Array }> = [];
      const usedNames = new Set<string>();

      for (const attachment of images) {
        if (!attachment.url) continue;
        const response = await fetch(attachment.url);
        if (!response.ok) throw new Error(`Failed to download ${attachment.filename}.`);
        const bytes = new Uint8Array(await response.arrayBuffer());

        let path = (attachment.filename || 'file').replace(/\\/g, '/').replace(/^\/+/, '');
        path = path.split('/').filter(part => part && part !== '.' && part !== '..').join('/');
        if (!path) path = 'file';

        let candidate = path;
        let index = 2;
        while (usedNames.has(candidate)) {
          const dot = path.lastIndexOf('.');
          candidate = dot > 0 ? `${path.slice(0, dot)}_${index++}${path.slice(dot)}` : `${path}_${index++}`;
        }

        usedNames.add(candidate);
        files.push({ name: candidate, data: bytes });
      }

      if (!files.length) throw new Error('There are no downloadable files.');

      const zipBlob = makeZip(files);
      const blobUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${(lead?.name || 'lead').replace(/[^a-zA-Z0-9._-]+/g, '_')}_attachments.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      alert(err.message || 'Failed to download attachments.');
    } finally {
      setIsDownloadingAttachments(false);
    }
  };

  // Drag & drop + folder upload helpers
  const isSupportedAttachment = (file: File) => {
    const name = file.name.toLowerCase();
    return file.size > 0 && (
      file.type.startsWith('image/') ||
      ['.pdf','.doc','.docx','.xls','.xlsx','.txt','.csv','.html','.css','.js','.json','.zip'].some(ext => name.endsWith(ext))
    );
  };

  const readDirectoryEntry = async (entry: any, parentPath = ''): Promise<File[]> => {
    if (entry?.isFile) {
      return await new Promise<File[]>((resolve, reject) => {
        entry.file(
          (file: File) => {
            Object.defineProperty(file, 'webkitRelativePath', {
              value: parentPath ? `${parentPath}/${file.name}` : file.name,
              configurable: true
            });
            resolve([file]);
          },
          reject
        );
      });
    }

    if (entry?.isDirectory) {
      const reader = entry.createReader();
      const files: File[] = [];
      const nextBatch = async (): Promise<void> => {
        const entries = await new Promise<any[]>((resolve, reject) =>
          reader.readEntries(resolve, reject)
        );
        if (!entries.length) return;
        for (const child of entries) {
          const childFiles = await readDirectoryEntry(
            child,
            parentPath ? `${parentPath}/${entry.name}` : entry.name
          );
          files.push(...childFiles);
        }
        await nextBatch();
      };
      await nextBatch();
      return files;
    }

    return [];
  };

  const collectDroppedFiles = async (dataTransfer: DataTransfer): Promise<File[]> => {
    const items = Array.from(dataTransfer.items || []);
    const entries = items
      .map((item: any) => item.webkitGetAsEntry?.())
      .filter(Boolean);

    if (entries.length > 0) {
      const allFiles: File[] = [];
      for (const entry of entries) {
        allFiles.push(...await readDirectoryEntry(entry));
      }
      return allFiles;
    }

    return Array.from(dataTransfer.files || []);
  };

  const uploadAttachmentFiles = async (files: File[], sourceLabel: string) => {
    const supportedFiles = files.filter(isSupportedAttachment);
    if (!supportedFiles.length) {
      alert('No supported files found. Images, PDF, DOC/DOCX, XLS/XLSX, TXT, CSV, HTML, CSS, JS, JSON and ZIP are supported.');
      return;
    }

    setIsUploadingImage(true);
    try {
      let uploaded = 0;
      for (const file of supportedFiles) {
        const relativeName = (file as any).webkitRelativePath || file.name;
        await uploadClipboardOrFileToFirebaseStorage(
          lead!.id,
          file,
          currentUser.id,
          currentUser.displayName,
          relativeName,
          sourceLabel
        );
        uploaded++;
      }

      setPasteToast(`${uploaded} file${uploaded === 1 ? '' : 's'} uploaded successfully.`);
      setTimeout(() => setPasteToast(null), 3000);
      setActiveTab('images');
    } catch (err: any) {
      alert(err.message || 'Failed to upload file(s).');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (!lead) return;

    try {
      const files = await collectDroppedFiles(e.dataTransfer);
      await uploadAttachmentFiles(files, 'Dropped file/folder');
    } catch (err: any) {
      alert(err.message || 'Failed to read the dropped folder/files.');
      setIsUploadingImage(false);
    }
  };

  // Attach files/folders via File Input
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!lead || !e.target.files || e.target.files.length === 0) return;
    await uploadAttachmentFiles(Array.from(e.target.files), 'Uploaded file/folder');
    e.target.value = '';
  };

  // Attach Image via URL input
  const handleAddImageUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !imageUrlInput.trim()) return;

    setIsUploadingImage(true);
    try {
      await addExternalImageUrlToLead(
        lead.id,
        imageUrlInput.trim(),
        'Web_Image.jpg',
        imageCaptionInput.trim() || 'Attached picture URL',
        currentUser.id,
        currentUser.displayName
      );
      setImageUrlInput('');
      setImageCaptionInput('');
      setActiveTab('images');
    } catch (err: any) {
      alert(err.message || 'Failed to attach image URL');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Preset sample image triggers for fast business mockup attachment
  const handleAttachPresetImage = async (presetUrl: string, title: string) => {
    if (!lead) return;
    setIsUploadingImage(true);
    try {
      await addExternalImageUrlToLead(
        lead.id,
        presetUrl,
        `${title.replace(/\s+/g, '_')}.jpg`,
        `${title} asset`,
        currentUser.id,
        currentUser.displayName
      );
      setPasteToast(`Preset "${title}" attached!`);
      setTimeout(() => setPasteToast(null), 3000);
      setActiveTab('images');
      setContextMenuPos(null);
    } catch (err: any) {
      alert(err.message || 'Failed to attach preset image');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Explicit Clipboard Paste Action (triggered by Right Click Menu or Paste Button)
  const handlePasteFromClipboard = async () => {
    if (!lead) return;
    setIsUploadingImage(true);
    setContextMenuPos(null);

    try {
      // 1. Try reading clipboard items (images / binary files)
      if (navigator.clipboard && typeof navigator.clipboard.read === 'function') {
        try {
          const clipboardItems = await navigator.clipboard.read();
          let pastedAny = false;

          for (const item of clipboardItems) {
            const imageType = item.types.find((t) => t.startsWith('image/'));
            if (imageType) {
              const blob = await item.getType(imageType);
              const ext = imageType.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
              const file = new File([blob], `Pasted_Screenshot_${Date.now()}.${ext}`, { type: imageType });
              await uploadClipboardOrFileToFirebaseStorage(
                lead.id,
                file,
                currentUser.id,
                currentUser.displayName,
                file.name,
                'Pasted from Clipboard'
              );
              pastedAny = true;
            }
          }

          if (pastedAny) {
            setPasteToast('Picture pasted from clipboard successfully!');
            setTimeout(() => setPasteToast(null), 3000);
            setActiveTab('images');
            return;
          }
        } catch (readErr: any) {
          console.warn('Direct clipboard.read() not available or permission denied, trying text:', readErr);
        }
      }

      // 2. Try reading clipboard text (URLs or data URLs)
      if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
        try {
          const text = (await navigator.clipboard.readText()) || '';
          const trimmed = text.trim();

          if (/^https?:\/\//i.test(trimmed)) {
            await addExternalImageUrlToLead(
              lead.id,
              trimmed,
              'Pasted_Web_Image.jpg',
              'Pasted Image URL from Clipboard',
              currentUser.id,
              currentUser.displayName
            );
            setPasteToast('Image link pasted and attached successfully!');
            setTimeout(() => setPasteToast(null), 3000);
            setActiveTab('images');
            return;
          } else if (trimmed.startsWith('data:image/')) {
            await uploadClipboardOrFileToFirebaseStorage(
              lead.id,
              trimmed,
              currentUser.id,
              currentUser.displayName,
              `Pasted_${Date.now()}.png`,
              'Pasted base64 image'
            );
            setPasteToast('Base64 image pasted successfully!');
            setTimeout(() => setPasteToast(null), 3000);
            setActiveTab('images');
            return;
          }
        } catch (textErr: any) {
          console.warn('clipboard.readText() fallback failed:', textErr);
        }
      }

      alert(
        'No image found in clipboard.\n\nTips:\n• Copy an image or take a screenshot (PrintScreen / Snipping Tool / Copy Image in WhatsApp).\n• Then click "Paste from Clipboard" or press Ctrl+V directly on the screen!'
      );
    } catch (err: any) {
      console.error('Paste error:', err);
      alert('Clipboard access notice: ' + (err.message || 'Press Ctrl+V to paste your image directly'));
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Close context menu on outside click or scroll
  useEffect(() => {
    const handleDismissContextMenu = () => {
      if (contextMenuPos) setContextMenuPos(null);
    };
    window.addEventListener('click', handleDismissContextMenu);
    window.addEventListener('contextmenu', (e) => {
      // Don't auto-dismiss if clicking inside the context menu itself
    });
    return () => {
      window.removeEventListener('click', handleDismissContextMenu);
    };
  }, [contextMenuPos]);

  // Global Keyboard Paste Listener (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handleGlobalWindowPaste = async (e: ClipboardEvent) => {
      if (!lead) return;

      // Don't hijack if user is typing in a text field, unless an actual image file was pasted
      const target = e.target as HTMLElement;
      const isTextInput =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      const hasImageFiles =
        e.clipboardData?.files && Array.from(e.clipboardData.files).some((f) => f.type.startsWith('image/'));

      if (isTextInput && !hasImageFiles) {
        return;
      }

      const imageFiles = e.clipboardData?.files
        ? Array.from(e.clipboardData.files).filter((f) => f.type.startsWith('image/'))
        : [];

      if (imageFiles.length > 0) {
        e.preventDefault();
        setIsUploadingImage(true);
        try {
          for (const file of imageFiles) {
            await uploadClipboardOrFileToFirebaseStorage(
              lead.id,
              file,
              currentUser.id,
              currentUser.displayName,
              `Pasted_${Date.now()}_${file.name}`,
              'Pasted via Ctrl+V'
            );
          }
          setPasteToast(`Attached ${imageFiles.length} pasted image(s) successfully!`);
          setTimeout(() => setPasteToast(null), 3000);
          setActiveTab('images');
        } catch (err: any) {
          alert(err.message || 'Failed to attach pasted image');
        } finally {
          setIsUploadingImage(false);
        }
        return;
      }

      // If on the images tab and user pasted a URL string
      if (activeTab === 'images' && !isTextInput) {
        const pastedText = e.clipboardData?.getData('text') || '';
        const trimmed = pastedText.trim();
        if (/^https?:\/\//i.test(trimmed)) {
          e.preventDefault();
          setIsUploadingImage(true);
          try {
            await addExternalImageUrlToLead(
              lead.id,
              trimmed,
              'Pasted_Web_Image.jpg',
              'Pasted Image URL from Clipboard',
              currentUser.id,
              currentUser.displayName
            );
            setPasteToast('Pasted image link attached successfully!');
            setTimeout(() => setPasteToast(null), 3000);
          } catch (err: any) {
            alert(err.message || 'Failed to attach image URL');
          } finally {
            setIsUploadingImage(false);
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalWindowPaste);
    return () => {
      window.removeEventListener('paste', handleGlobalWindowPaste);
    };
  }, [lead?.id, activeTab, currentUser.id, currentUser.displayName]);

  const handleDeleteImage = async (imageId: string) => {
    if (!lead) return;
    if (!window.confirm('Delete this attached picture?')) return;
    try {
      await deleteImageFromLead(imageId, lead.id, currentUser.id, currentUser.displayName);
      onLeadUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to delete picture');
    }
  };

  if (isLoading || !lead) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs font-['Poppins']">
        <div className="bg-white border border-[#DDD8CE] p-8 rounded-2xl shadow-xl text-[#292A29] text-center font-bold text-xs">
          Loading Plan Profile ({leadId})...
        </div>
      </div>
    );
  }

  const isAdminOrManager = currentUser.role === 'admin' || currentUser.role === 'manager';
  const isOwner = lead.ownerId === currentUser.id;

  // Lead Ownership Handlers
  const handleClaimLead = async () => {
    try {
      await claimLeadOwner(lead.id, currentUser.id, currentUser.displayName);
      onLeadUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to claim lead');
    }
  };

  const handleReleaseLead = async () => {
    try {
      await releaseLeadOwner(lead.id, currentUser.id, currentUser.displayName);
      onLeadUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to release lead');
    }
  };

  const handleAdminOverrideLeadOwner = async (newOwnerId: string) => {
    if (!newOwnerId) {
      await releaseLeadOwner(lead.id, currentUser.id, currentUser.displayName);
      onLeadUpdated();
      return;
    }
    const targetUser = users.find((u) => u.id === newOwnerId);
    if (!targetUser) return;

    try {
      await adminOverrideLeadOwner(
        currentUser,
        lead.id,
        targetUser.id,
        targetUser.displayName,
        'Admin reassigned lead contact step'
      );
      onLeadUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to reassign lead');
    }
  };

  // Task Handlers
  const handleGrabTask = async (taskId: string) => {
    try {
      const res = await grabTaskAtomic(taskId, currentUser.id, currentUser.displayName);
      if (!res.success) alert(res.message);
      else onLeadUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to grab task');
    }
  };

  const handleReleaseTask = async (taskId: string) => {
    try {
      const res = await releaseTaskAtomic(taskId, currentUser.id, currentUser.displayName);
      if (!res.success) alert(res.message);
      else onLeadUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to release task');
    }
  };

  const handleAdminOverrideTask = async (taskId: string, targetUserId: string) => {
    const targetUser = users.find((u) => u.id === targetUserId);
    try {
      if (!targetUserId) {
        await releaseTaskAtomic(taskId, currentUser.id, currentUser.displayName);
      } else {
        await adminOverrideTask(
          currentUser,
          taskId,
          {
            assignedTo: targetUser?.id,
            assignedToName: targetUser?.displayName,
            status: 'in_progress'
          },
          `Admin assigned task to ${targetUser?.displayName}`
        );
      }
      onLeadUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to reassign task');
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const res = await completeTaskAtomic(
        taskId,
        currentUser.id,
        currentUser.displayName,
        'Completed in Lead Workspace',
        templateUrl
      );
      if (!res.success) alert(res.message);
      else onLeadUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to complete task');
    }
  };

  const handleUpdateTemplateUrl = async () => {
    if (!templateUrl.trim()) return;
    try {
      await updateLeadInFirestore(
        lead.id,
        {
          templateUrl: templateUrl.trim(),
          previewUrl: templateUrl.trim(),
          stage: 'ready_for_outreach'
        },
        currentUser.id,
        currentUser.displayName
      );
      alert('Template mockup link updated successfully!');
      onLeadUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to update template URL');
    }
  };

  // Outreach Handler
  const handleRecordOutreach = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalMsg = outreachMessage.trim() || `Outreach attempt via ${outreachChannel}`;
    setIsSubmittingOutreach(true);
    try {
      await recordOutreachInFirestore(
        {
          leadId: lead.id,
          channel: outreachChannel,
          messageUsed: finalMsg,
          status: outreachStatus
        },
        currentUser.id,
        currentUser.displayName
      );
      setOutreachMessage('');
      onLeadUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to record outreach');
    } finally {
      setIsSubmittingOutreach(false);
    }
  };

  // Comment Handler
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsPostingComment(true);
    try {
      await addLeadNoteInFirestore(lead.id, currentUser.id, currentUser.displayName, newComment);
      setNewComment('');
    } catch (err: any) {
      alert(err.message || 'Failed to post comment');
    } finally {
      setIsPostingComment(false);
    }
  };

  // Copy helper
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Run AI Sales Assistant
  const handleRunSalesAssistant = async (customText?: string) => {
    if (!lead) return;
    const textToAnalyze =
      customText ||
      salesAssistantInput.trim() ||
      JSON.stringify(
        {
          name: lead.name,
          contactPerson: getLeadContactPerson(lead),
          category: lead.category,
          website: lead.website,
          existingWebsiteStatus: lead.existingWebsiteStatus,
          city: lead.city,
          country: lead.country,
          notes: lead.notes,
          description: lead.description,
          source: lead.source,
          sourceUrl: lead.sourceUrl,
          contacts: lead.contacts
        },
        null,
        2
      );

    setIsProcessingAI(true);
    try {
      const res = await fetch('/api/ai/sales-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawContent: textToAnalyze,
          senderName: currentUser.displayName || 'Olisbel',
          portfolioUrl: 'https://webcraftstudio.com',
          previewUrl: lead.templateUrl || lead.previewUrl || ''
        })
      });

      const json = (await res.json()) as any;
      if (json.success && json.data) {
        if (json.data.englishMessage) setAiCustomEnglish(json.data.englishMessage);
        if (json.data.portugueseMessage) setAiCustomPortuguese(json.data.portugueseMessage);
      }
    } catch (err: any) {
      console.error('Failed to run sales assistant:', err);
    } finally {
      setIsProcessingAI(false);
    }
  };

  // Quick Message Templates
  const applyQuickTemplate = (type: 'english' | 'portuguese' | 'initial' | 'followup' | 'pricing') => {
    if (!lead) return;
    const contactName = getLeadContactPerson(lead);
    if (type === 'english') {
      setOutreachMessage(aiCustomEnglish || generateEnglishPitch(lead, currentUser.displayName));
    } else if (type === 'portuguese') {
      setOutreachMessage(aiCustomPortuguese || generateAngolanPortuguesePitch(lead, currentUser.displayName));
    } else if (type === 'initial') {
      setOutreachMessage(generateWhatsAppPitch(lead, currentUser.displayName));
    } else if (type === 'followup') {
      setOutreachMessage(
        `Hi ${contactName}, following up on the website prototype created for ${lead.name}: ${lead.templateUrl || '[Prototype Link]'}. Let me know if you would like us to publish this live for your team!`
      );
    } else if (type === 'pricing') {
      setOutreachMessage(
        `Hi ${contactName}, for ${lead.name}, our special offer is R650/year (or 30.000 Kz/ano in Angola) payable in 3 installments. Preview: ${lead.templateUrl || '[Prototype Link]'}.`
      );
    }
  };

  // Deletion Handlers
  const handleDeleteEntireLead = () => {
    if (!lead) return;
    setIsDeleteModalOpen(true);
  };

  const executeDeleteLead = async () => {
    if (!lead) return;
    setIsDeletingLead(true);
    try {
      await deleteLeadCascade(lead.id, currentUser.id, currentUser.displayName);
      setIsDeleteModalOpen(false);
      onClose();
      onLeadUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to delete lead.');
    } finally {
      setIsDeletingLead(false);
    }
  };

  const handleDeleteContact = async (contactId: string, contactValue: string) => {
    if (!lead) return;
    if (!window.confirm(`Delete contact "${contactValue}"?`)) return;
    try {
      await deleteContactFromLead(lead.id, contactId, currentUser.id, currentUser.displayName);
      onLeadUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to delete contact.');
    }
  };

  const handleClearPrototypeUrl = async () => {
    if (!lead) return;
    if (!window.confirm('Clear and remove prototype URL for this lead?')) return;
    try {
      await clearLeadPrototypeUrl(lead.id, currentUser.id, currentUser.displayName);
      setTemplateUrl('');
      onLeadUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to clear prototype URL.');
    }
  };

  const handleDeleteOutreach = async (outreachId: string) => {
    if (!lead) return;
    if (!window.confirm('Delete this outreach log entry?')) return;
    try {
      await deleteOutreachAttempt(outreachId, lead.id, currentUser.id, currentUser.displayName);
      onLeadUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to delete outreach log.');
    }
  };

  const handleDeleteComment = async (noteId: string) => {
    if (!lead) return;
    if (!window.confirm('Delete this comment/note?')) return;
    try {
      await deleteLeadNote(noteId, lead.id, currentUser.id, currentUser.displayName);
      onLeadUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to delete comment.');
    }
  };

  const handleDeleteTask = async (taskId: string, taskName: string) => {
    if (!lead) return;
    if (!window.confirm(`Delete task "${taskName}"?`)) return;
    try {
      await deleteTask(taskId, lead.id, currentUser.id, currentUser.displayName);
      onLeadUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to delete task.');
    }
  };

  const handleMoveStageForward = async () => {
    if (!lead) return;
    const next = getNextStage(lead.stage);
    if (!next) return;
    try {
      await updateLeadInFirestore(
        lead.id,
        { stage: next as LeadStage },
        currentUser.id,
        currentUser.displayName
      );
      onLeadUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to advance pipeline stage.');
    }
  };

  const handleMoveStageBackward = async () => {
    if (!lead) return;
    const prev = getPreviousStage(lead.stage);
    if (!prev) return;
    try {
      await updateLeadInFirestore(
        lead.id,
        { stage: prev as LeadStage },
        currentUser.id,
        currentUser.displayName
      );
      onLeadUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to reverse pipeline stage.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/45 backdrop-blur-xs font-['Poppins']">
      <div className="bg-white border border-[#DDD8CE] rounded-3xl shadow-2xl max-w-6xl xl:max-w-7xl w-full h-[92vh] flex flex-col text-[#68645D] overflow-hidden">
        
        {/* Workspace Header in Gymove Signature Dark Header */}
        <div className="px-6 py-5 bg-[#FFFFFF] text-[#292A29] flex flex-wrap items-center justify-between gap-6 border-b border-[#DDD8CE]">
          <div className="flex items-center gap-4">
            <span className=" text-xs font-medium text-[#245F6B] bg-[#E5EEEE] px-2.5 py-1 rounded-md">
              {lead.id}
            </span>
            <div>
              <h2 className="font-semibold text-xl text-[#292A29] flex items-center gap-3">
                {lead.name}
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full uppercase bg-[#E5EEEE] text-[#245F6B]">
                  {getStageLabel(lead.stage)}
                </span>
              </h2>
              <p className="text-xs text-[#68645D] flex items-center gap-3 mt-1 font-medium">
                <span>Source: <strong className="text-[#292A29]">{lead.source}</strong></span>
                <span>•</span>
                <span>Contact Owner: <strong className="text-[#292A29]">{lead.ownerName || 'Unassigned'}</strong></span>
              </p>
            </div>
          </div>

          {/* Action Controls & Pipeline Movement Stepper */}
          <div className="flex items-center gap-2.5 flex-wrap">
            
            {/* Stage Movement Stepper Buttons */}
            <div className="flex items-center gap-1.5 p-1 rounded-lg">
              <button
                type="button"
                onClick={handleMoveStageBackward}
                disabled={!getPreviousStage(lead.stage)}
                className="px-3 py-1.5 bg-white border border-[#DDD8CE] hover:bg-[#F0EDE5] disabled:opacity-30 disabled:hover:bg-white text-[#292A29] text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                title="Move lead backward (reverse pipeline step)"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Move Back</span>
              </button>
              
              <button
                type="button"
                onClick={handleMoveStageForward}
                disabled={!getNextStage(lead.stage)}
                className="px-3 py-1.5 bg-[#245F6B] hover:bg-[#1E505A] disabled:opacity-30 disabled:hover:bg-[#245F6B] text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-xs"
                title="Move lead forward (advance pipeline step)"
              >
                <span>Move Forward</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Lead Ownership Action */}
            {!lead.ownerId || lead.ownerId === '' ? (
              <button
                onClick={handleClaimLead}
                className="px-3 py-1.5 bg-[#245F6B] hover:bg-[#1E505A] text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Claim Lead
              </button>
            ) : isOwner ? (
              <button
                onClick={handleReleaseLead}
                className="px-3 py-1.5 bg-white hover:bg-[#F0EDE5] text-[#292A29] border border-[#DDD8CE] rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <UserX className="w-3.5 h-3.5" />
                Release Lead
              </button>
            ) : null}

            {/* Admin Override Reassign Dropdown */}
            {isAdminOrManager && (
              <div className="flex items-center gap-1.5 bg-[#F4F1EA] border border-[#DDD8CE] rounded-lg px-2.5 py-1 text-xs">
                <ShieldAlert className="w-3.5 h-3.5 text-[#68645D] shrink-0" />
                <span className="font-medium text-[#68645D] text-[11px] uppercase">Reassign:</span>
                <select
                  value={lead.ownerId || ''}
                  onChange={(e) => handleAdminOverrideLeadOwner(e.target.value)}
                  className="bg-transparent font-medium text-[#292A29] text-xs focus:outline-none cursor-pointer"
                >
                  <option value="" className="text-[#292A29]">-- Unassigned --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id} className="text-[#292A29]">
                      {u.displayName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* View Stored ChatGPT Package Button */}
            {lead.chatgptPackage && (
              <button
                type="button"
                onClick={() => setIsPackageModalOpen(true)}
                className="px-3.5 py-1.5 bg-[#4F765C] hover:bg-[#3f604a] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                title="View original ChatGPT Business Package outputs: Gemini instructions, JSON data, and business parameters"
              >
                <Sparkles className="w-3.5 h-3.5 text-white" />
                <span>VIEW PACKAGE</span>
              </button>
            )}

            {/* View Prototype Button */}
            {lead.templateUrl && (
              <a
                href={formatExternalUrl(lead.templateUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-[#245F6B] hover:bg-[#1E505A] text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Globe className="w-3.5 h-3.5" />
                View Prototype ↗
              </a>
            )}

            {/* Edit Lead Button */}
            <button
              onClick={handleOpenEditLead}
              className="px-3 py-1.5 bg-white hover:bg-[#F0EDE5] text-[#292A29] border border-[#DDD8CE] rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="Edit lead business details, stage, location and source"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Lead
            </button>

            {/* Delete Entire Lead Button */}
            <button
              onClick={handleDeleteEntireLead}
              className="px-4 py-2 bg-[#F1E2E0] hover:bg-[#E4C8C4] text-[#A65B55] rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border border-[#E4C8C4] shadow-xs"
              title="Delete lead and all associated records"
            >
              <Trash2 className="w-4 h-4" />
              Delete Lead
            </button>

            <button
              onClick={onClose}
              className="p-2 text-[#969188] hover:text-[#292A29] rounded-full hover:bg-[#F0EDE5] transition-colors cursor-pointer ml-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="flex border-b border-[#DDD8CE] bg-[#F0EDE5] px-6 gap-2 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-5 border-b-2 font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-[#245F6B] text-[#245F6B] bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-[#68645D] hover:text-[#292A29]'
            }`}
          >
            Overview & Contacts
          </button>
          <button
            onClick={() => setActiveTab('images')}
            className={`py-3 px-5 border-b-2 font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'images'
                ? 'border-[#245F6B] text-[#245F6B] bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-[#68645D] hover:text-[#292A29]'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-[#245F6B]" />
            Pictures & Attachments ({images.length})
          </button>
          <button
            onClick={() => setActiveTab('template')}
            className={`py-3 px-5 border-b-2 font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'template'
                ? 'border-[#245F6B] text-[#245F6B] bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-[#68645D] hover:text-[#292A29]'
            }`}
          >
            Template Prototype
          </button>
          <button
            onClick={() => setActiveTab('outreach')}
            className={`py-3 px-5 border-b-2 font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'outreach'
                ? 'border-[#245F6B] text-[#245F6B] bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-[#68645D] hover:text-[#292A29]'
            }`}
          >
            Client Contact & Outreach ({outreach.length + notes.length})
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`py-3 px-5 border-b-2 font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'tasks'
                ? 'border-[#245F6B] text-[#245F6B] bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-[#68645D] hover:text-[#292A29]'
            }`}
          >
            Workflow Tasks ({tasks.length})
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs bg-white">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Direct Outreach Action Bar */}
              <DirectOutreachBar
                lead={lead}
                currentUser={currentUser}
                onOutreachRecorded={onLeadUpdated}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#F0EDE5] p-5 rounded-2xl border border-[#DDD8CE] space-y-3">
                  <h3 className="font-bold text-sm text-[#292A29]">Business Specifications</h3>
                  <div className="space-y-2 text-[#68645D]">
                    <div><strong className="text-[#292A29]">City/Region:</strong> {lead.city || 'Cape Town, South Africa'}</div>
                    <div><strong className="text-[#292A29]">Category:</strong> {lead.category || 'General Services'}</div>
                    <div className="flex items-center gap-2">
                      <strong className="text-[#292A29]">Discovery Source:</strong>
                      <span>{lead.source}</span>
                      {lead.sourceUrl && (
                        <a
                          href={formatExternalUrl(lead.sourceUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#245F6B] hover:underline font-semibold flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>View Listing / Post</span>
                        </a>
                      )}
                      {lead.sourceId && (
                        <span className="text-[10px] bg-white border border-[#DDD8CE] px-2 py-0.5 rounded text-[#292A29] font-mono">
                          ID: {lead.sourceId}
                        </span>
                      )}
                    </div>
                    {lead.contactPerson && (
                      <div><strong className="text-[#292A29]">Contact Person:</strong> {lead.contactPerson}</div>
                    )}
                    <div><strong className="text-[#292A29]">Current Website:</strong> {lead.website || 'None'}</div>
                    <div className="pt-2 border-t border-[#DDD8CE]">
                      <strong className="block text-[#292A29] mb-1">Notes & Details:</strong>
                      <div className="bg-white p-3.5 rounded-xl border border-[#DDD8CE] whitespace-pre-wrap text-[#292A29]">
                        {lead.description || 'No additional notes.'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#F0EDE5] p-5 rounded-2xl border border-[#DDD8CE] space-y-3">
                  <h3 className="font-bold text-sm text-[#292A29]">Contact Information</h3>
                  {lead.contacts && lead.contacts.length > 0 ? (
                    <div className="space-y-2">
                      {lead.contacts.map((c) => (
                        <div key={c.id} className="p-3.5 bg-white rounded-xl border border-[#DDD8CE] flex justify-between items-center">
                          <div>
                            <div className="font-bold text-[#292A29] text-xs">{c.value}</div>
                            <div className="text-[10px] text-[#969188] uppercase">{c.type} • {c.contactPerson || 'Owner'}</div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleCopyText(c.value, c.id)}
                              className="px-3 py-1 bg-[#F0EDE5] hover:bg-[#e9ecef] text-[#292A29] rounded-full text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              {copiedId === c.id ? <Check className="w-3 h-3 text-[#4F765C]" /> : <Copy className="w-3 h-3" />}
                              {copiedId === c.id ? 'Copied' : 'Copy'}
                            </button>
                            <button
                              onClick={() => handleDeleteContact(c.id, c.value)}
                              className="p-1.5 bg-[#A65B55]/10 hover:bg-[#A65B55]/20 text-[#A65B55] rounded-full text-[10px] transition-colors cursor-pointer"
                              title="Delete this contact"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#969188]">No contacts recorded yet.</p>
                  )}
                </div>
              </div>

              {/* Attached Pictures Quick Summary Box */}
              <div className="bg-[#F0EDE5] p-5 rounded-2xl border border-[#DDD8CE] space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[#292A29] flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#245F6B]" />
                    <span>Lead Pictures & Visual Assets ({images.length})</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('images')}
                    className="px-4 py-1.5 bg-[#245F6B] hover:bg-[#1E505A] text-white font-semibold text-xs rounded-full transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Attach or View All</span>
                  </button>
                </div>

                {images.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    {images.slice(0, 4).map((img) => (
                      <div
                        key={img.id}
                        onClick={() => setSelectedZoomImage(img)}
                        className="group relative h-28 rounded-2xl overflow-hidden border border-[#DDD8CE] bg-slate-200 cursor-pointer shadow-xs hover:shadow-md transition-all"
                      >
                        <img
                          src={img.url}
                          alt={img.caption || img.filename}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Maximize2 className="w-5 h-5" />
                        </div>
                        <div className="absolute bottom-0 inset-x-0 bg-black/70 p-1.5 text-[10px] text-white font-bold truncate">
                          {img.filename}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    onClick={() => setActiveTab('images')}
                    className="p-5 bg-white border border-dashed border-[#DDD8CE] rounded-2xl text-center text-[#68645D] cursor-pointer hover:border-[#245F6B] transition-all space-y-1"
                  >
                    <Upload className="w-6 h-6 mx-auto text-[#969188]" />
                    <p className="font-bold text-xs text-[#292A29]">No pictures attached yet</p>
                    <p className="text-[11px] text-[#969188]">Click to upload, drag & drop, or paste (Ctrl+V) storefronts, logos, or screenshots.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: IMAGES & ATTACHMENTS */}
          {activeTab === 'images' && (
            <div className="space-y-6">
              {/* Toast Feedback Notification */}
              {pasteToast && (
                <div className="p-3 bg-[#4F765C] text-white rounded-2xl font-bold text-xs flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>{pasteToast}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPasteToast(null)}
                    className="p-1 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Drag, Drop & Right-Click Paste Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMenuPos({ x: e.clientX, y: e.clientY });
                }}
                className={`border-2 border-dashed rounded-3xl p-6 text-center transition-all relative ${
                  isDragOver
                    ? 'border-[#245F6B] bg-[#E5EEEE]/50 scale-[1.01]'
                    : 'border-[#DDD8CE] bg-[#F0EDE5] hover:bg-[#e9ecef] hover:border-[#245F6B]'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.html,.css,.js,.json,.zip"
                  multiple
                  className="hidden"
                />
                <input
                  type="file"
                  ref={folderInputRef}
                  onChange={handleFileInputChange}
                  {...({ webkitdirectory: '', directory: '' } as any)}
                  multiple
                  className="hidden"
                />

                <div className="max-w-md mx-auto space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#245F6B] text-white mx-auto flex items-center justify-center font-bold shadow-md">
                    <Upload className="w-6 h-6" />
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-[#292A29]">
                      {isUploadingImage ? 'Uploading Picture...' : 'Add Pictures, Files or Folder'}
                    </h3>
                    <p className="text-xs text-[#969188] mt-0.5">
                      Supports images, PDF, DOCX, XLSX and common website/document assets. You can also upload an entire folder.
                    </p>
                  </div>

                  {/* Prominent Action Buttons */}
                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePasteFromClipboard();
                      }}
                      disabled={isUploadingImage}
                      className="px-4 py-2.5 bg-[#245F6B] hover:bg-[#1E505A] text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 transition-all hover:scale-102"
                      title="Paste image directly from clipboard (or press Ctrl+V)"
                    >
                      <ClipboardPaste className="w-4 h-4" />
                      <span>Paste from Clipboard (Ctrl+V)</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      disabled={isUploadingImage}
                      className="px-4 py-2.5 bg-white hover:bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#245F6B]" />
                      <span>Browse Files</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        folderInputRef.current?.click();
                      }}
                      disabled={isUploadingImage}
                      className="px-4 py-2.5 bg-[#4F765C] hover:bg-[#3f604a] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Upload Folder</span>
                    </button>
                  </div>

                  <div className="inline-flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full border border-[#DDD8CE] text-[11px] font-semibold text-[#292A29] shadow-2xs">
                    <MousePointer className="w-3.5 h-3.5 text-[#D9A441]" />
                    <span>
                      <strong>Right-Click anywhere</strong> in this box for the Custom Paste Menu, or press <strong>Ctrl+V</strong>!
                    </span>
                  </div>
                </div>
              </div>

              {/* Custom Right-Click Context Menu Popup */}
              {contextMenuPos && (
                <div
                  className="fixed z-100 bg-white border border-[#DDD8CE] rounded-2xl shadow-2xl p-2 w-72 text-xs font-['Poppins'] animate-in fade-in zoom-in-95 duration-100"
                  style={{
                    top: Math.min(contextMenuPos.y, window.innerHeight - 280),
                    left: Math.min(contextMenuPos.x, window.innerWidth - 300)
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-3 py-2 border-b border-[#DDD8CE] flex items-center justify-between">
                    <span className="font-bold text-[11px] uppercase tracking-wider text-[#245F6B] flex items-center gap-1.5">
                      <ClipboardPaste className="w-3.5 h-3.5" />
                      Add Picture / Asset
                    </span>
                    <button
                      type="button"
                      onClick={() => setContextMenuPos(null)}
                      className="text-[#969188] hover:text-[#292A29] p-0.5 rounded-md cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="py-1 space-y-0.5">
                    <button
                      type="button"
                      onClick={handlePasteFromClipboard}
                      disabled={isUploadingImage}
                      className="w-full text-left px-3 py-2.5 hover:bg-[#E5EEEE] text-[#292A29] rounded-xl flex items-start gap-2.5 transition-colors cursor-pointer group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[#245F6B]/10 group-hover:bg-[#245F6B] text-[#245F6B] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                        <ClipboardPaste className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs flex items-center gap-1.5">
                          <span>Paste from Clipboard</span>
                          <span className="text-[9px] bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-mono">
                            Ctrl+V
                          </span>
                        </div>
                        <p className="text-[10px] text-[#68645D]">Pastes screenshots or copied images</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setContextMenuPos(null);
                        fileInputRef.current?.click();
                      }}
                      className="w-full text-left px-3 py-2.5 hover:bg-[#F0EDE5] text-[#292A29] rounded-xl flex items-start gap-2.5 transition-colors cursor-pointer group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-slate-200 text-[#292A29] flex items-center justify-center shrink-0 transition-colors">
                        <Upload className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs">Browse Computer Files...</div>
                        <p className="text-[10px] text-[#68645D]">Select JPG, PNG, WEBP files</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        setContextMenuPos(null);
                        if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
                          try {
                            const text = await navigator.clipboard.readText();
                            if (text && /^https?:\/\//i.test(text.trim())) {
                              setImageUrlInput(text.trim());
                              return;
                            }
                          } catch {}
                        }
                        const input = prompt('Paste the Web Image URL (https://...):');
                        if (input && /^https?:\/\//i.test(input.trim())) {
                          setImageUrlInput(input.trim());
                        }
                      }}
                      className="w-full text-left px-3 py-2.5 hover:bg-[#F0EDE5] text-[#292A29] rounded-xl flex items-start gap-2.5 transition-colors cursor-pointer group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-slate-200 text-[#292A29] flex items-center justify-center shrink-0 transition-colors">
                        <LinkIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs">Paste Image Link / URL</div>
                        <p className="text-[10px] text-[#68645D]">Attach image via external web link</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Attach via Image Link or Preset Sample Images */}
              <div className="bg-[#F0EDE5] p-5 rounded-2xl border border-[#DDD8CE] space-y-4">
                <h4 className="font-bold text-xs uppercase text-[#292A29] tracking-wider flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-[#245F6B]" />
                  <span>Attach Image via URL or Business Presets</span>
                </h4>

                <form onSubmit={handleAddImageUrl} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="Paste image link URL (e.g. https://...)"
                    className="md:col-span-2 bg-white border border-[#DDD8CE] text-[#292A29] rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#245F6B]"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={imageCaptionInput}
                      onChange={(e) => setImageCaptionInput(e.target.value)}
                      placeholder="Caption (optional)"
                      className="flex-1 bg-white border border-[#DDD8CE] text-[#292A29] rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#245F6B]"
                    />
                    <button
                      type="submit"
                      disabled={!imageUrlInput.trim() || isUploadingImage}
                      className="px-4 py-2.5 bg-[#245F6B] hover:bg-[#1E505A] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      Attach Link
                    </button>
                  </div>
                </form>

                {/* Quick Presets */}
                <div className="pt-2 border-t border-[#DDD8CE]">
                  <span className="text-[11px] font-bold text-[#969188] block mb-2">Quick Sample Assets (1-Click Attach):</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleAttachPresetImage(
                          'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1000&q=80',
                          'Storefront Photo'
                        )
                      }
                      className="px-3.5 py-1.5 bg-white hover:bg-[#E5EEEE] border border-[#DDD8CE] text-[#292A29] text-xs font-semibold rounded-full transition-all cursor-pointer shadow-xs"
                    >
                      🏬 Storefront Photo
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleAttachPresetImage(
                          'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=80',
                          'Office Exterior'
                        )
                      }
                      className="px-3.5 py-1.5 bg-white hover:bg-[#E5EEEE] border border-[#DDD8CE] text-[#292A29] text-xs font-semibold rounded-full transition-all cursor-pointer shadow-xs"
                    >
                      🏢 Office Exterior
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleAttachPresetImage(
                          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80',
                          'Logo & Branding'
                        )
                      }
                      className="px-3.5 py-1.5 bg-white hover:bg-[#E5EEEE] border border-[#DDD8CE] text-[#292A29] text-xs font-semibold rounded-full transition-all cursor-pointer shadow-xs"
                    >
                      🎨 Logo & Branding
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleAttachPresetImage(
                          'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1000&q=80',
                          'Website Screenshot'
                        )
                      }
                      className="px-3.5 py-1.5 bg-white hover:bg-[#E5EEEE] border border-[#DDD8CE] text-[#292A29] text-xs font-semibold rounded-full transition-all cursor-pointer shadow-xs"
                    >
                      💻 Existing Site Screenshot
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleAttachPresetImage(
                          'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=1000&q=80',
                          'Google Maps Streetview'
                        )
                      }
                      className="px-3.5 py-1.5 bg-white hover:bg-[#E5EEEE] border border-[#DDD8CE] text-[#292A29] text-xs font-semibold rounded-full transition-all cursor-pointer shadow-xs"
                    >
                      🗺️ Google Maps Location
                    </button>
                  </div>
                </div>
              </div>

              {/* Gallery List Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#DDD8CE] pb-3">
                <h3 className="font-bold text-sm text-[#292A29] flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#245F6B]" />
                  <span>Attached Pictures Gallery ({images.length})</span>
                </h3>

                {images.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadAllAttachments}
                      disabled={isDownloadingAttachments}
                      className="px-3.5 py-1.5 bg-[#245F6B] hover:bg-[#1E505A] text-white rounded-full text-[11px] font-bold flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {isDownloadingAttachments ? 'Preparing ZIP...' : 'Download All'}
                    </button>
                    <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#969188]" />
                    <input
                      type="text"
                      value={imageSearchQuery}
                      onChange={(e) => setImageSearchQuery(e.target.value)}
                      placeholder="Search pictures..."
                      className="bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] text-xs rounded-full pl-8 pr-3 py-1.5 focus:outline-none"
                    />
                  </div>
                  </div>
                )}
              </div>

              {/* Image Grid */}
              {images.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                  {images
                    .filter((img) => {
                      if (!imageSearchQuery) return true;
                      const q = imageSearchQuery.toLowerCase();
                      return (
                        img.filename.toLowerCase().includes(q) ||
                        (img.caption || '').toLowerCase().includes(q) ||
                        (img.uploadedByName || '').toLowerCase().includes(q)
                      );
                    })
                    .map((img) => (
                      <div
                        key={img.id}
                        className="bg-white border border-[#DDD8CE] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                      >
                        {/* Image Preview Thumbnail */}
                        <div
                          onClick={() => setSelectedZoomImage(img)}
                          className="h-44 bg-slate-900 relative overflow-hidden cursor-pointer"
                        >
                          <img
                            src={img.url}
                            alt={img.caption || img.filename}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                            <span className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-xs font-semibold text-xs flex items-center gap-1">
                              <ZoomIn className="w-4 h-4" />
                              <span>Zoom</span>
                            </span>
                          </div>
                        </div>

                        {/* Image Metadata & Controls */}
                        <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <h5 className="font-bold text-xs text-[#292A29] truncate" title={img.filename}>
                                {img.filename}
                              </h5>
                              <span className="text-[10px] text-[#969188] font-bold shrink-0">
                                {img.fileSize ? `${Math.round(img.fileSize / 1024)} KB` : 'Web Link'}
                              </span>
                            </div>

                            <p className="text-xs text-[#68645D] bg-[#F0EDE5] p-2.5 rounded-xl italic">
                              "{img.caption || 'No caption'}"
                            </p>
                          </div>

                          <div className="pt-2 border-t border-[#DDD8CE] flex items-center justify-between text-[11px] text-[#969188]">
                            <span>By <strong>{img.uploadedByName}</strong></span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleCopyText(img.url, img.id)}
                                className="px-2.5 py-1 bg-[#F0EDE5] hover:bg-[#e9ecef] text-[#292A29] rounded-full font-semibold transition-colors cursor-pointer flex items-center gap-1"
                                title="Copy image URL"
                              >
                                {copiedId === img.id ? <Check className="w-3 h-3 text-[#4F765C]" /> : <Copy className="w-3 h-3" />}
                                {copiedId === img.id ? 'Copied' : 'URL'}
                              </button>

                              <button
                                onClick={() => handleDownloadAttachment(img)}
                                className="p-1.5 bg-[#E5EEEE] hover:bg-[#D6E5E7] text-[#245F6B] rounded-full transition-colors cursor-pointer"
                                title="Download file"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteImage(img.id)}
                                className="p-1.5 bg-[#A65B55]/10 hover:bg-[#A65B55]/20 text-[#A65B55] rounded-full transition-colors cursor-pointer"
                                title="Delete image"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="py-12 text-center text-[#969188] space-y-2">
                  <ImageIcon className="w-12 h-12 mx-auto text-[#DDD8CE]" />
                  <p className="font-bold text-sm text-[#292A29]">No pictures attached yet</p>
                  <p className="text-xs">Drag & drop files above, press Ctrl+V to paste, or attach an image link.</p>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: TEMPLATE */}
          {activeTab === 'template' && (
            <div className="bg-[#F0EDE5] p-6 rounded-2xl border border-[#DDD8CE] space-y-6">
              <div>
                <h3 className="font-bold text-base text-[#292A29]">Website Prototype Link</h3>
                <p className="text-xs text-[#68645D] mt-1">Enter or manage the custom web prototype URL created for this business client.</p>
              </div>

              {lead.templateUrl && (
                <div className="bg-white p-5 rounded-2xl border border-[#DDD8CE] shadow-xs flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#245F6B] text-white flex items-center justify-center font-bold">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#969188] block uppercase tracking-wider">Current Prototype Link</span>
                      <a
                        href={formatExternalUrl(lead.templateUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-bold text-[#245F6B] hover:underline transition-colors break-all"
                      >
                        {lead.templateUrl}
                      </a>
                    </div>
                  </div>

                  <a
                    href={formatExternalUrl(lead.templateUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 bg-[#245F6B] hover:bg-[#1E505A] text-white font-bold text-xs rounded-full transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Prototype ↗
                  </a>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="url"
                  value={templateUrl}
                  onChange={(e) => setTemplateUrl(e.target.value)}
                  placeholder="e.g. www.clientprototype.co.za or https://demo.webcraft.com/client"
                  className="flex-1 bg-white border border-[#DDD8CE] rounded-xl px-4 py-3 text-xs text-[#292A29] focus:outline-none focus:border-[#245F6B]"
                />
                <button
                  onClick={handleUpdateTemplateUrl}
                  className="px-6 py-3 bg-[#245F6B] hover:bg-[#1E505A] text-white font-bold rounded-full text-xs shadow-xs cursor-pointer"
                >
                  Save Link
                </button>
                {lead.templateUrl && (
                  <button
                    onClick={handleClearPrototypeUrl}
                    className="px-4 py-3 bg-[#F0EDE5] hover:bg-[#e9ecef] text-[#68645D] font-semibold rounded-full text-xs transition-colors cursor-pointer border border-[#DDD8CE]"
                    title="Remove prototype link from this lead"
                  >
                    Clear Link
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CLIENT CONTACT & OUTREACH LOG */}
          {activeTab === 'outreach' && (
            <div className="space-y-6">
              {/* Direct Outreach Bar at Top of Outreach Tab */}
              <DirectOutreachBar
                lead={lead}
                currentUser={currentUser}
                onOutreachRecorded={onLeadUpdated}
              />

              {/* AI SALES ASSISTANT & REGIONAL OUTREACH PITCHES */}
              <div className="bg-white p-5 rounded-2xl border border-[#DDD8CE] shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DDD8CE] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#245F6B]/10 flex items-center justify-center text-[#245F6B]">
                      <Sparkles className="w-4 h-4 text-[#245F6B]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#292A29]">
                        Sales Assistant & Regional Outreach Pitches
                      </h3>
                      <p className="text-[11px] text-[#68645D]">
                        Pre-crafted high-converting pitches customized with pricing for South Africa & Angola
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Language Switcher Tabs */}
                    <div className="flex bg-[#F0EDE5] p-1 rounded-xl border border-[#DDD8CE]">
                      <button
                        type="button"
                        onClick={() => setSalesPitchLanguage('english')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          salesPitchLanguage === 'english'
                            ? 'bg-white text-[#245F6B] shadow-2xs'
                            : 'text-[#68645D] hover:text-[#292A29]'
                        }`}
                      >
                        🇬🇧 English (R650/yr)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSalesPitchLanguage('portuguese')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          salesPitchLanguage === 'portuguese'
                            ? 'bg-white text-[#D9A441] shadow-2xs'
                            : 'text-[#68645D] hover:text-[#292A29]'
                        }`}
                      >
                        🇦🇴 Português (30.000 Kz)
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowSalesInputBox(!showSalesInputBox)}
                      className="px-3 py-1.5 bg-[#F0EDE5] hover:bg-[#E5EEEE] border border-[#DDD8CE] text-[#292A29] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Paste unstructured business info or customize via AI"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#D9A441]" />
                      <span>{showSalesInputBox ? 'Hide AI Input' : 'AI Extract & Polish'}</span>
                    </button>
                  </div>
                </div>

                {/* Collapsible AI Unstructured Info Processor */}
                {showSalesInputBox && (
                  <div className="p-4 bg-[#F0EDE5] rounded-xl border border-[#DDD8CE] space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#292A29] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#245F6B]" />
                        Paste Raw Unstructured Business Info (Text or JSON):
                      </label>
                      <span className="text-[10px] text-[#969188]">Powered by Gemini 3.7 Flash</span>
                    </div>
                    <textarea
                      rows={3}
                      value={salesAssistantInput}
                      onChange={(e) => setSalesAssistantInput(e.target.value)}
                      placeholder={`e.g. Pasted text from WhatsApp/Gumtree or JSON:\n{\n  "businessName": "${lead.name}",\n  "contact": "${getLeadContactPerson(lead)}",\n  "needs": "New modern website"\n}`}
                      className="w-full bg-white border border-[#DDD8CE] text-[#292A29] rounded-xl p-3 text-xs focus:outline-none focus:border-[#245F6B] font-mono text-[11px]"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleRunSalesAssistant()}
                        disabled={isProcessingAI}
                        className="px-4 py-2 bg-[#245F6B] hover:bg-[#1E505A] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                      >
                        {isProcessingAI ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Processing Unstructured Info...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Generate Dual Pitches</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Active Pitch Preview Display */}
                {(() => {
                  const currentPitch =
                    salesPitchLanguage === 'english'
                      ? aiCustomEnglish || generateEnglishPitch(lead, currentUser.displayName)
                      : aiCustomPortuguese || generateAngolanPortuguesePitch(lead, currentUser.displayName);

                  const phone = getLeadPhone(lead);
                  const isCopied = copiedId === `pitch-${salesPitchLanguage}`;

                  return (
                    <div className="space-y-3">
                      <div className="relative bg-[#F9F8F5] border border-[#DDD8CE] rounded-xl p-4 font-sans text-xs text-[#292A29] whitespace-pre-wrap leading-relaxed">
                        <div className="absolute top-3 right-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyText(currentPitch, `pitch-${salesPitchLanguage}`)}
                            className="px-3 py-1 bg-white hover:bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
                          >
                            {isCopied ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#4F765C]" />
                                <span className="text-[#4F765C]">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-[#68645D]" />
                                <span>Copy Script</span>
                              </>
                            )}
                          </button>
                        </div>
                        {renderTextWithClickableLinks(currentPitch)}
                      </div>

                      {/* Quick Action Footbar for this Pitch */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setOutreachMessage(currentPitch);
                              setOutreachChannel('WhatsApp');
                            }}
                            className="px-3 py-1.5 bg-[#E5EEEE] hover:bg-[#245F6B] hover:text-white border border-[#245F6B]/20 text-[#245F6B] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>Insert in Record Form Below</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setModalInitialChannel('WhatsApp');
                              setModalInitialRecipient(phone || lead.contacts?.[0]?.value || '');
                              setModalInitialMessage(currentPitch);
                              setIsRecordOutreachModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-white hover:bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            <Plus className="w-3 h-3 text-[#245F6B]" />
                            <span>Open in Detailed Outreach Modal</span>
                          </button>
                        </div>

                        {phone && (
                          <a
                            href={`https://wa.me/${phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(currentPitch)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Open WhatsApp Directly</span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Record Outreach Form */}
              <form onSubmit={handleRecordOutreach} className="bg-[#F0EDE5] p-5 rounded-2xl border border-[#DDD8CE] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[#292A29] flex items-center gap-2">
                    <Send className="w-4 h-4 text-[#245F6B]" />
                    Record Custom Outreach Message
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setModalInitialChannel(outreachChannel);
                        setModalInitialRecipient(lead.phone || lead.contacts?.[0]?.value || '');
                        setModalInitialMessage(outreachMessage);
                        setIsRecordOutreachModalOpen(true);
                      }}
                      className="px-3 py-1 bg-white border border-[#DDD8CE] hover:border-[#245F6B] text-[#245F6B] rounded-full text-xs font-semibold flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      Detailed Outreach Form
                    </button>
                    <span className="text-[11px] text-[#4F765C] font-semibold hidden sm:inline">Send Message = +R0.50 (+R25 Deal Bonus)</span>
                  </div>
                </div>

                {/* Quick Templates */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#68645D]">
                    Quick Templates:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => applyQuickTemplate('english')}
                      className="px-3.5 py-1.5 bg-white border border-[#DDD8CE] hover:border-[#245F6B] text-[#245F6B] rounded-full text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      🇬🇧 English (R650/yr - 3x)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickTemplate('portuguese')}
                      className="px-3.5 py-1.5 bg-white border border-[#DDD8CE] hover:border-[#D9A441] text-[#91651B] rounded-full text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      🇦🇴 Português (30.000 Kz - 3x)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickTemplate('initial')}
                      className="px-3.5 py-1.5 bg-white border border-[#DDD8CE] hover:border-[#245F6B] text-[#292A29] rounded-full text-[11px] font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <Sparkles className="w-3 h-3 text-[#D9A441]" />
                      Initial WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickTemplate('followup')}
                      className="px-3.5 py-1.5 bg-white border border-[#DDD8CE] hover:border-[#245F6B] text-[#292A29] rounded-full text-[11px] font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <Sparkles className="w-3 h-3 text-[#D9A441]" />
                      Prototype Follow-Up
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickTemplate('pricing')}
                      className="px-3.5 py-1.5 bg-white border border-[#DDD8CE] hover:border-[#245F6B] text-[#292A29] rounded-full text-[11px] font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <Sparkles className="w-3 h-3 text-[#D9A441]" />
                      Pricing Offer
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#292A29] font-semibold mb-1">Outreach Channel</label>
                    <select
                      value={outreachChannel}
                      onChange={(e) => setOutreachChannel(e.target.value)}
                      className="w-full bg-white border border-[#DDD8CE] text-[#292A29] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#245F6B]"
                    >
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Instagram">Instagram DM</option>
                      <option value="Phone Call">Phone Call</option>
                      <option value="Email">Email</option>
                      <option value="Gumtree Chat">Gumtree Chat</option>
                      <option value="Facebook Messenger">Facebook Messenger</option>
                      <option value="SMS">SMS</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#292A29] font-semibold mb-1">Delivery / Response Status</label>
                    <select
                      value={outreachStatus}
                      onChange={(e) => setOutreachStatus(e.target.value as any)}
                      className="w-full bg-white border border-[#DDD8CE] text-[#292A29] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#245F6B]"
                    >
                      <option value="sent">Message Sent</option>
                      <option value="delivered">Delivered</option>
                      <option value="responded">Responded</option>
                      <option value="interested">Interested Client</option>
                      <option value="follow_up_needed">Follow-Up Required</option>
                      <option value="no_response">No Response</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[#292A29] font-semibold mb-1">Exact Message Sent</label>
                  <textarea
                    rows={3}
                    value={outreachMessage}
                    onChange={(e) => setOutreachMessage(e.target.value)}
                    placeholder="Enter or select message text sent to client..."
                    className="w-full bg-white border border-[#DDD8CE] text-[#292A29] rounded-xl p-3 text-xs focus:outline-none focus:border-[#245F6B]"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingOutreach}
                    className="px-5 py-2.5 bg-[#245F6B] hover:bg-[#1E505A] text-white font-bold rounded-full text-xs cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    {isSubmittingOutreach ? 'Recording...' : 'Record Outreach'}
                  </button>
                </div>
              </form>

              {/* Add Comment Form */}
              <form onSubmit={handlePostComment} className="bg-[#F0EDE5] p-5 rounded-2xl border border-[#DDD8CE] space-y-3">
                <h3 className="font-bold text-sm text-[#292A29] flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#245F6B]" />
                  Add Client Comment / Engagement Development
                </h3>
                <textarea
                  rows={2}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Record client responses, new requirements, or phone feedback..."
                  className="w-full bg-white border border-[#DDD8CE] text-[#292A29] rounded-xl p-3 text-xs focus:outline-none focus:border-[#245F6B]"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isPostingComment || !newComment.trim()}
                    className="px-5 py-2 bg-[#292A29] hover:bg-[#1a2030] text-white font-bold rounded-full text-xs cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    {isPostingComment ? 'Posting...' : 'Post Client Comment'}
                  </button>
                </div>
              </form>

              {/* Log History */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-sm text-[#292A29]">
                    Contact & Engagement History ({outreach.length + notes.length} entries)
                  </h3>
                  {lead.outreachCount ? (
                    <span className="text-xs font-semibold bg-[#245F6B]/10 text-[#245F6B] px-3 py-1 rounded-full">
                      Total Outreach Attempts: {lead.outreachCount}
                    </span>
                  ) : null}
                </div>

                {outreach.length === 0 && notes.length === 0 ? (
                  <div className="p-6 text-center bg-[#F0EDE5] rounded-2xl border border-[#DDD8CE] text-[#969188]">
                    No outreach messages or client comments logged yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {outreach.map((o) => {
                      const getStatusBadge = (status: string, responseType?: string) => {
                        if (responseType === 'interested' || status === 'interested') {
                          return <span className="bg-[#4F765C]/15 text-[#4F765C] border border-[#4F765C]/30 px-2 py-0.5 rounded-md font-semibold text-[10px]">Interested</span>;
                        }
                        if (status === 'responded') {
                          return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-md font-semibold text-[10px]">Responded</span>;
                        }
                        if (status === 'delivered') {
                          return <span className="bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-md font-semibold text-[10px]">Delivered</span>;
                        }
                        if (status === 'follow_up_needed') {
                          return <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-md font-semibold text-[10px]">Follow-Up Needed</span>;
                        }
                        if (status === 'no_response') {
                          return <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-semibold text-[10px]">No Response</span>;
                        }
                        return <span className="bg-[#245F6B]/10 text-[#245F6B] border border-[#245F6B]/20 px-2 py-0.5 rounded-md font-semibold text-[10px]">Sent</span>;
                      };

                      return (
                        <div key={o.id} className="p-4 bg-[#F0EDE5] rounded-2xl border border-[#DDD8CE] space-y-2.5">
                          <div className="flex justify-between items-center text-xs flex-wrap gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-[#292A29]">{o.sentByName}</span>
                              <span className="text-[#68645D]">via</span>
                              <span className="font-semibold text-[#245F6B] bg-white border border-[#DDD8CE] px-2.5 py-0.5 rounded-md shadow-2xs">
                                {o.channel}
                              </span>
                              {o.targetRecipient && (
                                <span className="text-[11px] text-[#68645D] font-mono bg-white/70 px-2 py-0.5 rounded border border-[#DDD8CE]">
                                  To: {o.targetRecipient}
                                </span>
                              )}
                              {getStatusBadge(o.status, o.responseType)}
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[#969188] text-[11px]">{formatDateTime(o.sentAt)}</span>
                              <button
                                onClick={() => {
                                  setModalInitialChannel(o.channel);
                                  setModalInitialRecipient(o.targetRecipient || lead.phone || lead.contacts?.[0]?.value || '');
                                  setModalInitialMessage(`Hi, following up on our previous message regarding ${lead.name}...`);
                                  setIsRecordOutreachModalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-white hover:bg-[#F0EDE5] text-[#245F6B] border border-[#DDD8CE] rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                title="Follow up on this outreach"
                              >
                                <Send className="w-2.5 h-2.5" />
                                <span>Follow Up</span>
                              </button>
                              <button
                                onClick={() => handleDeleteOutreach(o.id)}
                                className="p-1.5 text-[#969188] hover:text-[#A65B55] hover:bg-[#A65B55]/10 rounded-md transition-colors cursor-pointer"
                                title="Delete outreach log entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {o.messageUsed && (
                            <div className="p-3 bg-white border border-[#DDD8CE] rounded-xl text-[#292A29] text-xs whitespace-pre-wrap leading-relaxed">
                              {renderTextWithClickableLinks(o.messageUsed)}
                            </div>
                          )}

                          {/* Response Notes / Scheduled Follow Up */}
                          {(o.responseNotes || o.followUpDate || o.nextAction) && (
                            <div className="p-2.5 bg-white/60 border border-[#DDD8CE] rounded-xl text-[11px] space-y-1 text-[#68645D]">
                              {o.responseNotes && (
                                <div><strong className="text-[#292A29]">Feedback:</strong> {o.responseNotes}</div>
                              )}
                              {o.followUpDate && (
                                <div><strong className="text-[#292A29]">Scheduled Follow-Up:</strong> {new Date(o.followUpDate).toLocaleDateString()}</div>
                              )}
                              {o.nextAction && (
                                <div><strong className="text-[#292A29]">Next Step:</strong> {o.nextAction}</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {notes.map((note) => (
                      <div key={note.id} className="p-4 bg-[#F0EDE5] rounded-2xl border border-[#DDD8CE] space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#292A29]">{note.authorName}</span>
                            <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-semibold uppercase">Note</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[#969188] text-[11px]">{formatTimeAgo(note.createdAt)}</span>
                            <button
                              onClick={() => handleDeleteComment(note.id)}
                              className="p-1.5 text-[#969188] hover:text-[#A65B55] hover:bg-[#A65B55]/10 rounded-md transition-colors cursor-pointer"
                              title="Delete comment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-[#68645D] text-xs font-medium leading-relaxed">{note.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 4: WORKFLOW TASKS */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-[#292A29]">Associated Workflow Tasks ({tasks.length})</h3>
                <span className="text-[11px] text-[#4F765C] font-semibold">Live Link = +R1.00 (+R50 Deal Won) | Outreach = +R0.50 (+R25 Deal Won)</span>
              </div>

              {tasks.map((task) => {
                const isTaskAssignedToMe = task.assignedTo === currentUser.id;

                return (
                  <div key={task.id} className="p-4 bg-[#F0EDE5] rounded-2xl border border-[#DDD8CE] flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="font-bold text-[#292A29] text-xs flex items-center gap-2">
                        {task.taskTypeName}
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full uppercase font-bold bg-[#E5EEEE] text-[#245F6B]">
                          {task.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#68645D]">
                        Assigned To: <strong className="text-[#292A29]">{task.assignedToName || 'Unassigned'}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      
                      {/* Admin Override */}
                      {isAdminOrManager && (
                        <select
                          value={task.assignedTo || ''}
                          onChange={(e) => handleAdminOverrideTask(task.id, e.target.value)}
                          className="bg-white border border-[#DDD8CE] font-semibold text-[#292A29] text-xs rounded-full px-3 py-1 focus:outline-none cursor-pointer"
                        >
                          <option value="">-- Available --</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.displayName}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Grab Task */}
                      {task.status === 'available' && (
                        <button
                          onClick={() => handleGrabTask(task.id)}
                          className="px-4 py-1.5 bg-[#245F6B] hover:bg-[#1E505A] text-white font-bold rounded-full text-xs cursor-pointer shadow-xs"
                        >
                          Grab Task
                        </button>
                      )}

                      {/* Complete Task */}
                      {task.status === 'in_progress' && (
                        <button
                          onClick={() => handleCompleteTask(task.id)}
                          className="px-4 py-1.5 bg-[#4F765C] hover:bg-[#239e46] text-white font-bold rounded-full text-xs cursor-pointer shadow-xs"
                        >
                          Complete Task
                        </button>
                      )}

                      {/* Delete Task */}
                      <button
                        onClick={() => handleDeleteTask(task.id, task.taskTypeName)}
                        className="p-1.5 bg-[#A65B55]/10 hover:bg-[#A65B55]/20 text-[#A65B55] rounded-full text-xs cursor-pointer transition-colors"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>

      {/* EDIT LEAD MODAL OVERLAY */}
      {isEditingLead && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-['Poppins']">
          <div className="bg-white border border-[#DDD8CE] rounded-3xl shadow-2xl max-w-2xl w-full text-[#68645D] overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white text-[#292A29]">
              <div className="flex items-center gap-2.5">
                <Edit3 className="w-5 h-5 text-[#D9A441]" />
                <div>
                  <h3 className="font-bold text-base">Edit Plan: {lead?.name}</h3>
                  <p className="text-[11px] text-[#969188]">Edit business parameters via Form fields or JSON payload</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditingLead(false)}
                className="text-[#969188] hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Selector Bar */}
            <div className="flex items-center gap-2 bg-[#F0EDE5] px-6 py-2 border-b border-[#DDD8CE] text-xs font-semibold">
              <span className="text-[#969188] uppercase text-[10px] tracking-wider">Editing Method:</span>
              <button
                type="button"
                onClick={() => setEditLeadMode('form')}
                className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                  editLeadMode === 'form'
                    ? 'bg-[#245F6B] text-white shadow-xs'
                    : 'bg-white text-[#68645D] hover:bg-[#e9ecef] border border-[#DDD8CE]'
                }`}
              >
                Standard Form
              </button>
              <button
                type="button"
                onClick={() => setEditLeadMode('json')}
                className={`px-4 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                  editLeadMode === 'json'
                    ? 'bg-[#245F6B] text-white shadow-xs'
                    : 'bg-white text-[#68645D] hover:bg-[#e9ecef] border border-[#DDD8CE]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D9A441]" />
                JSON Population & Code Mode
              </button>
            </div>

            <form onSubmit={handleSaveLeadEdit} className="p-6 space-y-4 overflow-y-auto text-xs flex-1">
              {jsonParseError && (
                <div className="p-3 bg-[#A65B55]/10 border border-[#A65B55]/30 text-[#A65B55] rounded-xl font-semibold text-xs">
                  {jsonParseError}
                </div>
              )}

              {editLeadMode === 'json' ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-[#292A29] font-semibold">
                      Raw Lead JSON Object (Editable & Pasteable)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const formatted = JSON.stringify(JSON.parse(editLeadJson), null, 2);
                          setEditLeadJson(formatted);
                          setJsonParseError('');
                        } catch (err: any) {
                          setJsonParseError('Cannot format invalid JSON: ' + err.message);
                        }
                      }}
                      className="text-[11px] font-semibold text-[#245F6B] hover:underline cursor-pointer"
                    >
                      Format JSON
                    </button>
                  </div>
                  <p className="text-[11px] text-[#969188]">
                    Paste raw JSON or edit fields directly below. Modifying fields here will update the lead attributes and contact structure.
                  </p>
                  <textarea
                    value={editLeadJson}
                    onChange={(e) => {
                      setEditLeadJson(e.target.value);
                      setJsonParseError('');
                    }}
                    rows={14}
                    className="w-full bg-[#292A29] text-[#4F765C]  text-xs p-4 rounded-2xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#245F6B] leading-relaxed"
                    placeholder="Paste structured lead JSON here..."
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#292A29] font-semibold mb-1">Business Name *</label>
                      <input
                        type="text"
                        required
                        value={editLeadName}
                        onChange={(e) => setEditLeadName(e.target.value)}
                        className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-[#245F6B]"
                      />
                    </div>

                    <div>
                      <label className="block text-[#292A29] font-semibold mb-1">Owner / Contact Person</label>
                      <input
                        type="text"
                        value={editLeadContactPerson}
                        onChange={(e) => setEditLeadContactPerson(e.target.value)}
                        placeholder="Owner or main contact"
                        className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3 py-2 focus:outline-none focus:border-[#245F6B]"
                      />
                    </div>

                    <div>
                      <label className="block text-[#292A29] font-semibold mb-1">Phone</label>
                      <input
                        type="text"
                        value={editLeadPhone}
                        onChange={(e) => setEditLeadPhone(e.target.value)}
                        placeholder="+27 ..."
                        className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3 py-2 focus:outline-none focus:border-[#245F6B]"
                      />
                    </div>

                    <div>
                      <label className="block text-[#292A29] font-semibold mb-1">Email</label>
                      <input
                        type="email"
                        value={editLeadEmail}
                        onChange={(e) => setEditLeadEmail(e.target.value)}
                        placeholder="business@example.com"
                        className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3 py-2 focus:outline-none focus:border-[#245F6B]"
                      />
                    </div>

                    <div>
                      <label className="block text-[#292A29] font-semibold mb-1">Business Category / Industry</label>
                      <input
                        type="text"
                        value={editLeadCategory}
                        onChange={(e) => setEditLeadCategory(e.target.value)}
                        placeholder="e.g. Plumbing, Solar, Accounting"
                        className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3 py-2 focus:outline-none focus:border-[#245F6B]"
                      />
                    </div>

                    <div>
                      <label className="block text-[#292A29] font-semibold mb-1">Discovery Source</label>
                      <select
                        value={editLeadSource}
                        onChange={(e) => setEditLeadSource(e.target.value)}
                        className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-[#245F6B]"
                      >
                        <option value="Gumtree">Gumtree</option>
                        <option value="Facebook Marketplace / Groups">Facebook Marketplace / Groups</option>
                        <option value="Google Business Search">Google Business Search</option>
                        <option value="Instagram / TikTok">Instagram / TikTok</option>
                        <option value="Direct Call / Walk-In">Direct Call / Walk-In</option>
                        <option value="Referral">Client Referral</option>
                        <option value="Other">Other Source</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[#292A29] font-semibold mb-1">Pipeline Stage</label>
                      <select
                        value={editLeadStage}
                        onChange={(e) => setEditLeadStage(e.target.value as any)}
                        className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-[#245F6B]"
                      >
                        <option value="new_lead">New Lead</option>
                        <option value="captured">Lead Captured</option>
                        <option value="template_pending">Template Pending</option>
                        <option value="template_in_progress">Template In Progress</option>
                        <option value="template_completed">Template Completed</option>
                        <option value="ready_for_outreach">Ready for Outreach</option>
                        <option value="outreach_sent">Outreach Sent</option>
                        <option value="response_received">Response Received</option>
                        <option value="interested">Interested Client</option>
                        <option value="negotiation">In Negotiation</option>
                        <option value="won">Won Deal</option>
                        <option value="website_production">Website Production</option>
                        <option value="completed">Completed & Paid</option>
                        <option value="lost">Lost</option>
                        <option value="do_not_contact">Do Not Contact</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[#292A29] font-semibold mb-1">Lead Priority</label>
                      <select
                        value={editLeadPriority}
                        onChange={(e) => setEditLeadPriority(e.target.value as any)}
                        className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-[#245F6B]"
                      >
                        <option value="low">Low Priority</option>
                        <option value="normal">Normal Priority</option>
                        <option value="high">High Priority</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[#292A29] font-semibold mb-1">Country / Region</label>
                      <select
                        value={editLeadCountry}
                        onChange={(e) => setEditLeadCountry(e.target.value)}
                        className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-[#245F6B]"
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.name}>
                            {c.flag} {c.name} ({c.currency})
                          </option>
                        ))}
                        <option value="International">🌐 Other / International</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[#292A29] font-semibold mb-1">City / Region</label>
                      <input
                        type="text"
                        value={editLeadCity}
                        onChange={(e) => setEditLeadCity(e.target.value)}
                        placeholder="e.g. Cape Town, Luanda"
                        className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3 py-2 focus:outline-none focus:border-[#245F6B]"
                      />
                    </div>

                    <div>
                      <label className="block text-[#292A29] font-semibold mb-1">Province</label>
                      <input
                        type="text"
                        value={editLeadProvince}
                        onChange={(e) => setEditLeadProvince(e.target.value)}
                        placeholder="e.g. Western Cape, Gauteng"
                        className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3 py-2 focus:outline-none focus:border-[#245F6B]"
                      />
                    </div>

                    <div>
                      <label className="block text-[#292A29] font-semibold mb-1">Source / Listing Link (URL)</label>
                      <input
                        type="url"
                        value={editLeadSourceUrl}
                        onChange={(e) => setEditLeadSourceUrl(e.target.value)}
                        placeholder="https://www.gumtree.co.za/... or Facebook/IG link"
                        className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3 py-2 focus:outline-none focus:border-[#245F6B]"
                      />
                    </div>

                    <div>
                      <label className="block text-[#292A29] font-semibold mb-1">Source / Ad ID</label>
                      <input
                        type="text"
                        value={editLeadSourceId}
                        onChange={(e) => setEditLeadSourceId(e.target.value)}
                        placeholder="e.g. Gumtree Ad ID 1002345 or IG @handle"
                        className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3 py-2 focus:outline-none focus:border-[#245F6B]"
                      />
                    </div>

                    <div>
                      <label className="block text-[#292A29] font-semibold mb-1">Existing Website URL</label>
                      <input
                        type="url"
                        value={editLeadWebsite}
                        onChange={(e) => setEditLeadWebsite(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3 py-2 focus:outline-none focus:border-[#245F6B]"
                      />
                    </div>

                    <div>
                      <label className="block text-[#292A29] font-semibold mb-1">Existing Website Status</label>
                      <select
                        value={editLeadExistingWebsiteStatus}
                        onChange={(e) => setEditLeadExistingWebsiteStatus(e.target.value)}
                        className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3 py-2 focus:outline-none focus:border-[#245F6B]"
                      >
                        <option value="None">None (No website)</option>
                        <option value="Outdated">Outdated / Legacy</option>
                        <option value="Non-Responsive">Non-Responsive on Mobile</option>
                        <option value="Broken">Broken / Down</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[#292A29] font-semibold mb-1">Google Business URL</label>
                      <input
                        type="url"
                        value={editLeadGoogleBusinessUrl}
                        onChange={(e) => setEditLeadGoogleBusinessUrl(e.target.value)}
                        placeholder="https://maps.google.com/..."
                        className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3 py-2 focus:outline-none focus:border-[#245F6B]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#292A29] font-semibold mb-1">Street Address</label>
                    <input
                      type="text"
                      value={editLeadAddress}
                      onChange={(e) => setEditLeadAddress(e.target.value)}
                      placeholder="Street, Suburb"
                      className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3 py-2 focus:outline-none focus:border-[#245F6B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#292A29] font-semibold mb-1">Business Description & Notes</label>
                    <textarea
                      value={editLeadDescription}
                      onChange={(e) => setEditLeadDescription(e.target.value)}
                      rows={3}
                      placeholder="Describe the lead, pitch angle, pricing ideas, client requirements..."
                      className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl p-2.5 focus:outline-none focus:border-[#245F6B]"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#DDD8CE]">
                <button
                  type="button"
                  onClick={() => setIsEditingLead(false)}
                  className="px-5 py-2 bg-[#F0EDE5] hover:bg-[#e9ecef] text-[#68645D] rounded-full font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingLeadEdit}
                  className="px-5 py-2 bg-[#245F6B] hover:bg-[#1E505A] text-white rounded-full font-bold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50 shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  {isSavingLeadEdit ? 'Saving Changes...' : 'Save Lead Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Zoom Modal */}
      {selectedZoomImage && (
        <div
          onClick={() => setSelectedZoomImage(null)}
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out font-['Poppins']"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl w-full max-h-[90vh] flex flex-col bg-[#292A29] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl cursor-default"
          >
            {/* Header */}
            <div className="px-6 py-4 bg-[#292A29] border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <ImageIcon className="w-5 h-5 text-[#D9A441]" />
                <div>
                  <h3 className="font-bold text-sm text-white">{selectedZoomImage.filename}</h3>
                  <p className="text-xs text-[#969188]">
                    Uploaded by {selectedZoomImage.uploadedByName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={selectedZoomImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={selectedZoomImage.filename}
                  className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#D9A441]" />
                  <span>Download Image</span>
                </a>
                <button
                  onClick={() => setSelectedZoomImage(null)}
                  className="p-1.5 text-[#969188] hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Image Body */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/60">
              <img
                src={selectedZoomImage.url}
                alt={selectedZoomImage.caption || selectedZoomImage.filename}
                className="max-w-full max-h-[72vh] object-contain rounded-2xl shadow-2xl"
              />
            </div>

            {/* Caption Footer */}
            {selectedZoomImage.caption && (
              <div className="px-6 py-3 bg-[#292A29] border-t border-slate-800 text-[#969188] text-xs font-semibold">
                Caption: <span className="text-white font-normal">{selectedZoomImage.caption}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Record Detailed Outreach Modal */}
      {isRecordOutreachModalOpen && (
        <RecordOutreachModal
          isOpen={isRecordOutreachModalOpen}
          onClose={() => setIsRecordOutreachModalOpen(false)}
          lead={lead}
          currentUser={currentUser}
          initialChannel={modalInitialChannel}
          initialRecipient={modalInitialRecipient}
          initialMessage={modalInitialMessage}
          onOutreachRecorded={() => {
            onLeadUpdated();
          }}
        />
      )}

      {/* Delete Lead Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title={`Delete Lead "${lead?.name}"?`}
        description="This will permanently delete this lead and ALL associated tasks, outreach logs, notes, and uploaded prototype assets. This action cannot be undone."
        confirmLabel="Delete Lead Permanently"
        isLoading={isDeletingLead}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={executeDeleteLead}
      />

      {/* View Stored ChatGPT Business Package Modal */}
      <SavedPackageModal
        isOpen={isPackageModalOpen}
        onClose={() => setIsPackageModalOpen(false)}
        chatgptPackage={lead?.chatgptPackage || null}
        businessName={lead?.name || 'Client'}
        leadId={lead?.id}
      />
    </div>
  );
};
