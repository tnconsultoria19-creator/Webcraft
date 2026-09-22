-- WebCraft Studio performance indexes
-- Safe to run repeatedly; all indexes are created only when missing.

-- Lead detail and relationship lookups
CREATE INDEX IF NOT EXISTS idx_contacts_lead_id ON contacts(leadId);
CREATE INDEX IF NOT EXISTS idx_channels_lead_id ON channels(leadId);
CREATE INDEX IF NOT EXISTS idx_tasks_lead_id ON tasks(leadId);
CREATE INDEX IF NOT EXISTS idx_outreach_lead_id ON outreachAttempts(leadId);
CREATE INDEX IF NOT EXISTS idx_notes_lead_id ON leadNotes(leadId);
CREATE INDEX IF NOT EXISTS idx_financial_lead_id ON financialRecords(leadId);
CREATE INDEX IF NOT EXISTS idx_stage_history_lead_id ON stageHistory(leadId);
CREATE INDEX IF NOT EXISTS idx_images_lead_id ON images(leadId);
CREATE INDEX IF NOT EXISTS idx_documents_lead_id ON documents(leadId);

-- Pipeline filtering and sorting
CREATE INDEX IF NOT EXISTS idx_leads_stage_updated ON leads(stage, updatedAt DESC);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);

-- Task filtering
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status ON tasks(assignedTo, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(dueDate);

-- Outreach/activity timelines
CREATE INDEX IF NOT EXISTS idx_outreach_sent_at ON outreachAttempts(sentAt DESC);
CREATE INDEX IF NOT EXISTS idx_activities_lead_created ON activities(entityType, entityId, timestamp DESC);
