import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  jsonb,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Enums ──────────────────────────────────────────

export const roleEnum = pgEnum("role", [
  "AE",
  "BDR",
  "SA",
  "CSM",
  "MANAGER",
]);

export const verticalEnum = pgEnum("vertical", [
  "healthcare",
  "financial_services",
  "manufacturing",
  "retail",
  "technology",
  "general",
]);

export const pipelineStageEnum = pgEnum("pipeline_stage", [
  "new_lead",
  "qualified",
  "discovery",
  "technical_validation",
  "proposal",
  "negotiation",
  "closing",
  "closed_won",
  "closed_lost",
]);

export const forecastCategoryEnum = pgEnum("forecast_category", [
  "pipeline",
  "upside",
  "commit",
  "closed",
]);

export const productEnum = pgEnum("product", [
  "claude_api",
  "claude_enterprise",
  "claude_team",
]);

export const leadSourceEnum = pgEnum("lead_source", [
  "inbound",
  "outbound",
  "plg_upgrade",
  "partner",
  "event",
]);

export const contactRoleEnum = pgEnum("contact_role", [
  "champion",
  "economic_buyer",
  "technical_evaluator",
  "end_user",
  "blocker",
  "coach",
]);

export const activityTypeEnum = pgEnum("activity_type", [
  "email_sent",
  "email_received",
  "call_completed",
  "meeting_scheduled",
  "meeting_completed",
  "note_added",
  "stage_changed",
  "task_completed",
  "document_shared",
  "call_prep",
  "email_draft",
  "call_analysis",
  "observation",
  "agent_feedback",
  "competitive_intel",
]);

export const enrichmentSourceEnum = pgEnum("enrichment_source", [
  "apollo",
  "clearbit",
  "simulated",
]);

export const milestoneSourceEnum = pgEnum("milestone_source", [
  "manual",
  "transcript",
  "email",
  "ai_detected",
]);

export const stageChangedByEnum = pgEnum("stage_changed_by", ["ai", "human"]);

export const emailSequenceStatusEnum = pgEnum("email_sequence_status", [
  "draft",
  "active",
  "paused",
  "completed",
]);

export const emailStepStatusEnum = pgEnum("email_step_status", [
  "draft",
  "approved",
  "sent",
  "opened",
  "clicked",
  "replied",
  "bounced",
]);

export const transcriptSourceEnum = pgEnum("transcript_source", [
  "uploaded",
  "recorded",
  "simulated",
]);

export const transcriptStatusEnum = pgEnum("transcript_status", [
  "pending",
  "transcribing",
  "analyzing",
  "complete",
]);

export const agentRoleTypeEnum = pgEnum("agent_role_type", [
  "ae",
  "bdr",
  "sa",
  "csm",
  "manager",
]);

export const configChangedByEnum = pgEnum("config_changed_by", [
  "user",
  "ai",
  "feedback_loop",
]);

export const feedbackRequestTypeEnum = pgEnum("feedback_request_type", [
  "add_info",
  "change_format",
  "add_question",
  "remove_field",
  "process_change",
]);

export const feedbackStatusEnum = pgEnum("feedback_status", [
  "pending",
  "approved",
  "rejected",
  "auto_applied",
]);

export const priorityEnum = pgEnum("priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const agentActionTypeEnum = pgEnum("agent_action_type", [
  "email_drafted",
  "lead_scored",
  "research_generated",
  "transcript_analyzed",
  "deal_stage_recommended",
  "meeting_scheduled",
  "feedback_processed",
  "instruction_updated",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "deal_at_risk",
  "handoff_request",
  "agent_recommendation",
  "feedback_received",
  "stage_change",
  "meeting_reminder",
  "approval_needed",
  "system_intelligence",
]);

// ── Tables ─────────────────────────────────────────

export const teamMembers = pgTable("team_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: roleEnum("role").notNull(),
  verticalSpecialization: verticalEnum("vertical_specialization")
    .notNull()
    .default("general"),
  isActive: boolean("is_active").notNull().default(true),
  avatarUrl: text("avatar_url"),
  capacityTarget: integer("capacity_target").default(10),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  domain: text("domain"),
  industry: verticalEnum("industry").notNull(),
  employeeCount: integer("employee_count"),
  annualRevenue: text("annual_revenue"),
  techStack: text("tech_stack").array(),
  hqLocation: text("hq_location"),
  description: text("description"),
  enrichmentSource: enrichmentSourceEnum("enrichment_source").default(
    "simulated"
  ),
  enrichmentData: jsonb("enrichment_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contacts = pgTable("contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  title: text("title"),
  linkedinUrl: text("linkedin_url"),
  companyId: uuid("company_id")
    .references(() => companies.id)
    .notNull(),
  roleInDeal: contactRoleEnum("role_in_deal"),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const deals = pgTable("deals", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  companyId: uuid("company_id")
    .references(() => companies.id)
    .notNull(),
  primaryContactId: uuid("primary_contact_id").references(() => contacts.id),
  assignedAeId: uuid("assigned_ae_id").references(() => teamMembers.id),
  assignedBdrId: uuid("assigned_bdr_id").references(() => teamMembers.id),
  assignedSaId: uuid("assigned_sa_id").references(() => teamMembers.id),
  stage: pipelineStageEnum("stage").notNull().default("new_lead"),
  dealValue: decimal("deal_value", { precision: 12, scale: 2 }),
  currency: text("currency").default("EUR"),
  closeDate: timestamp("close_date"),
  winProbability: integer("win_probability").default(0),
  forecastCategory: forecastCategoryEnum("forecast_category").default(
    "pipeline"
  ),
  vertical: verticalEnum("vertical").notNull(),
  product: productEnum("product"),
  leadSource: leadSourceEnum("lead_source"),
  competitor: text("competitor"),
  lossReason: text("loss_reason"),
  closeCompetitor: text("close_competitor"),
  closeNotes: text("close_notes"),
  closeImprovement: text("close_improvement"),
  winTurningPoint: text("win_turning_point"),
  winReplicable: text("win_replicable"),
  closeAiAnalysis: jsonb("close_ai_analysis"),
  closeFactors: jsonb("close_factors"),
  winFactors: jsonb("win_factors"),
  closeAiRanAtTimestamp: timestamp("close_ai_ran_at_timestamp"),
  closedAt: timestamp("closed_at"),
  stageEnteredAt: timestamp("stage_entered_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const dealMilestones = pgTable("deal_milestones", {
  id: uuid("id").defaultRandom().primaryKey(),
  dealId: uuid("deal_id")
    .references(() => deals.id)
    .notNull(),
  milestoneKey: text("milestone_key").notNull(),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  source: milestoneSourceEnum("source").default("manual"),
  evidence: text("evidence"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const meddpiccFields = pgTable(
  "meddpicc_fields",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dealId: uuid("deal_id")
      .references(() => deals.id)
      .notNull(),
    metrics: text("metrics"),
    metricsConfidence: integer("metrics_confidence").default(0),
    economicBuyer: text("economic_buyer"),
    economicBuyerConfidence: integer("economic_buyer_confidence").default(0),
    decisionCriteria: text("decision_criteria"),
    decisionCriteriaConfidence: integer(
      "decision_criteria_confidence"
    ).default(0),
    decisionProcess: text("decision_process"),
    decisionProcessConfidence: integer("decision_process_confidence").default(
      0
    ),
    identifyPain: text("identify_pain"),
    identifyPainConfidence: integer("identify_pain_confidence").default(0),
    champion: text("champion"),
    championConfidence: integer("champion_confidence").default(0),
    competition: text("competition"),
    competitionConfidence: integer("competition_confidence").default(0),
    aiExtracted: boolean("ai_extracted").default(true),
    aeConfirmed: boolean("ae_confirmed").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("meddpicc_deal_id_idx").on(table.dealId)]
);

export const dealStageHistory = pgTable("deal_stage_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  dealId: uuid("deal_id")
    .references(() => deals.id)
    .notNull(),
  fromStage: pipelineStageEnum("from_stage"),
  toStage: pipelineStageEnum("to_stage").notNull(),
  changedBy: stageChangedByEnum("changed_by").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activities = pgTable("activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  dealId: uuid("deal_id").references(() => deals.id),
  contactId: uuid("contact_id").references(() => contacts.id),
  teamMemberId: uuid("team_member_id")
    .references(() => teamMembers.id)
    .notNull(),
  type: activityTypeEnum("type").notNull(),
  subject: text("subject"),
  description: text("description"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emailSequences = pgTable("email_sequences", {
  id: uuid("id").defaultRandom().primaryKey(),
  dealId: uuid("deal_id")
    .references(() => deals.id)
    .notNull(),
  contactId: uuid("contact_id")
    .references(() => contacts.id)
    .notNull(),
  assignedAeId: uuid("assigned_ae_id")
    .references(() => teamMembers.id)
    .notNull(),
  name: text("name").notNull(),
  status: emailSequenceStatusEnum("status").default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const emailSteps = pgTable("email_steps", {
  id: uuid("id").defaultRandom().primaryKey(),
  sequenceId: uuid("sequence_id")
    .references(() => emailSequences.id)
    .notNull(),
  stepNumber: integer("step_number").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  delayDays: integer("delay_days").default(0),
  status: emailStepStatusEnum("status").default("draft"),
  sentAt: timestamp("sent_at"),
  openedAt: timestamp("opened_at"),
  repliedAt: timestamp("replied_at"),
  aiGenerated: boolean("ai_generated").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const callTranscripts = pgTable("call_transcripts", {
  id: uuid("id").defaultRandom().primaryKey(),
  dealId: uuid("deal_id")
    .references(() => deals.id)
    .notNull(),
  title: text("title").notNull(),
  date: timestamp("date").notNull(),
  durationSeconds: integer("duration_seconds"),
  participants: jsonb("participants"),
  transcriptText: text("transcript_text"),
  source: transcriptSourceEnum("source").default("simulated"),
  status: transcriptStatusEnum("status").default("complete"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const callAnalyses = pgTable(
  "call_analyses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    transcriptId: uuid("transcript_id")
      .references(() => callTranscripts.id)
      .notNull(),
    summary: text("summary"),
    painPoints: jsonb("pain_points"),
    nextSteps: jsonb("next_steps"),
    stakeholdersMentioned: jsonb("stakeholders_mentioned"),
    budgetSignals: jsonb("budget_signals"),
    competitiveMentions: jsonb("competitive_mentions"),
    talkRatio: jsonb("talk_ratio"),
    questionQuality: jsonb("question_quality"),
    callQualityScore: integer("call_quality_score"),
    meddpiccExtractions: jsonb("meddpicc_extractions"),
    coachingInsights: jsonb("coaching_insights"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("call_analyses_transcript_id_idx").on(table.transcriptId)]
);

export const agentConfigs = pgTable("agent_configs", {
  id: uuid("id").defaultRandom().primaryKey(),
  teamMemberId: uuid("team_member_id")
    .references(() => teamMembers.id)
    .notNull(),
  agentName: text("agent_name").notNull(),
  roleType: agentRoleTypeEnum("role_type").notNull(),
  instructions: text("instructions").notNull(),
  outputPreferences: jsonb("output_preferences"),
  version: integer("version").default(1),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const agentConfigVersions = pgTable("agent_config_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentConfigId: uuid("agent_config_id")
    .references(() => agentConfigs.id)
    .notNull(),
  version: integer("version").notNull(),
  instructions: text("instructions").notNull(),
  outputPreferences: jsonb("output_preferences"),
  changedBy: configChangedByEnum("changed_by").notNull(),
  changeReason: text("change_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const feedbackRequests = pgTable("feedback_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  fromMemberId: uuid("from_member_id")
    .references(() => teamMembers.id)
    .notNull(),
  fromAgentConfigId: uuid("from_agent_config_id")
    .references(() => agentConfigs.id)
    .notNull(),
  targetRoleType: agentRoleTypeEnum("target_role_type").notNull(),
  description: text("description").notNull(),
  requestType: feedbackRequestTypeEnum("request_type").notNull(),
  status: feedbackStatusEnum("status").default("pending"),
  priority: priorityEnum("priority").default("medium"),
  approvedByMemberId: uuid("approved_by_member_id").references(
    () => teamMembers.id
  ),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const agentActionsLog = pgTable("agent_actions_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentConfigId: uuid("agent_config_id")
    .references(() => agentConfigs.id)
    .notNull(),
  actionType: agentActionTypeEnum("action_type").notNull(),
  description: text("description"),
  inputData: jsonb("input_data"),
  outputData: jsonb("output_data"),
  wasOverridden: boolean("was_overridden").default(false),
  overrideReason: text("override_reason"),
  dealId: uuid("deal_id").references(() => deals.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leadScores = pgTable("lead_scores", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .references(() => companies.id)
    .notNull(),
  dealId: uuid("deal_id").references(() => deals.id),
  score: integer("score").default(0),
  scoringFactors: jsonb("scoring_factors"),
  icpMatchPct: integer("icp_match_pct").default(0),
  engagementScore: integer("engagement_score").default(0),
  intentScore: integer("intent_score").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  teamMemberId: uuid("team_member_id")
    .references(() => teamMembers.id)
    .notNull(),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  dealId: uuid("deal_id").references(() => deals.id),
  isRead: boolean("is_read").default(false),
  priority: priorityEnum("priority").default("medium"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const observationClusters = pgTable("observation_clusters", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  summary: text("summary"),
  signalType: text("signal_type").notNull(),
  targetFunction: text("target_function"),
  observationCount: integer("observation_count").default(1),
  observerCount: integer("observer_count").default(1),
  verticalsAffected: text("verticals_affected").array(),
  pipelineImpact: jsonb("pipeline_impact"),
  severity: text("severity").default("informational"),
  resolutionStatus: text("resolution_status").default("emerging"),
  resolutionNotes: text("resolution_notes"),
  effectivenessScore: integer("effectiveness_score"),
  arrImpactTotal: decimal("arr_impact_total", { precision: 12, scale: 2 }),
  arrImpactDetails: jsonb("arr_impact_details"),
  unstructuredQuotes: jsonb("unstructured_quotes"),
  structuredSummary: jsonb("structured_summary"),
  firstObserved: timestamp("first_observed").defaultNow(),
  lastObserved: timestamp("last_observed").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const observations = pgTable("observations", {
  id: uuid("id").defaultRandom().primaryKey(),
  observerId: uuid("observer_id")
    .references(() => teamMembers.id)
    .notNull(),
  rawInput: text("raw_input").notNull(),
  sourceContext: jsonb("source_context"),
  aiClassification: jsonb("ai_classification"),
  aiGiveback: jsonb("ai_giveback"),
  status: text("status").default("submitted"),
  lifecycleEvents: jsonb("lifecycle_events"),
  clusterId: uuid("cluster_id").references(() => observationClusters.id),
  followUpQuestion: text("follow_up_question"),
  followUpResponse: text("follow_up_response"),
  followUpChips: text("follow_up_chips").array(),
  structuredData: jsonb("structured_data"),
  arrImpact: jsonb("arr_impact"),
  linkedAccountIds: uuid("linked_account_ids").array(),
  linkedDealIds: uuid("linked_deal_ids").array(),
  extractedEntities: jsonb("extracted_entities"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const supportFunctionMembers = pgTable("support_function_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  function: text("function").notNull(),
  email: text("email"),
  avatarInitials: text("avatar_initials"),
  avatarColor: text("avatar_color"),
  verticalsCovered: text("verticals_covered").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Relations ──────────────────────────────────────

export const companiesRelations = relations(companies, ({ many }) => ({
  contacts: many(contacts),
  deals: many(deals),
  leadScores: many(leadScores),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  company: one(companies, {
    fields: [contacts.companyId],
    references: [companies.id],
  }),
  activities: many(activities),
}));

export const dealsRelations = relations(deals, ({ one, many }) => ({
  company: one(companies, {
    fields: [deals.companyId],
    references: [companies.id],
  }),
  primaryContact: one(contacts, {
    fields: [deals.primaryContactId],
    references: [contacts.id],
  }),
  assignedAe: one(teamMembers, {
    fields: [deals.assignedAeId],
    references: [teamMembers.id],
    relationName: "aeDeals",
  }),
  milestones: many(dealMilestones),
  meddpicc: one(meddpiccFields, {
    fields: [deals.id],
    references: [meddpiccFields.dealId],
  }),
  stageHistory: many(dealStageHistory),
  activities: many(activities),
  callTranscripts: many(callTranscripts),
  notifications: many(notifications),
}));

export const teamMembersRelations = relations(teamMembers, ({ many }) => ({
  aeDeals: many(deals, { relationName: "aeDeals" }),
  activities: many(activities),
  agentConfigs: many(agentConfigs),
  notifications: many(notifications),
}));

// ── Observation Routing ───────────────────────────

export const observationRoutingStatusEnum = pgEnum("observation_routing_status", [
  "sent",
  "acknowledged",
  "in_progress",
  "resolved",
]);

export const observationRouting = pgTable("observation_routing", {
  id: uuid("id").defaultRandom().primaryKey(),
  observationId: uuid("observation_id")
    .references(() => observations.id)
    .notNull(),
  targetFunction: text("target_function").notNull(),
  targetMemberId: uuid("target_member_id"), // supportFunctionMembers ID (no FK since different table)
  signalType: text("signal_type").notNull(),
  status: observationRoutingStatusEnum("status").notNull().default("sent"),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Field Query Engine ────────────────────────────

export const fieldQueryStatusEnum = pgEnum("field_query_status", [
  "active",
  "answered",
  "expired",
]);

export const fieldQueryQuestionStatusEnum = pgEnum("field_query_question_status", [
  "pending",
  "answered",
  "skipped",
  "expired",
]);

export const fieldQueries = pgTable("field_queries", {
  id: uuid("id").defaultRandom().primaryKey(),
  initiatedBy: uuid("initiated_by").notNull(), // Can be teamMembers or supportFunctionMembers
  rawQuestion: text("raw_question").notNull(),
  aiAnalysis: jsonb("ai_analysis"),
  clusterId: uuid("cluster_id").references(() => observationClusters.id),
  aggregatedAnswer: jsonb("aggregated_answer"),
  status: fieldQueryStatusEnum("status").notNull().default("active"),
  expiresAt: timestamp("expires_at").notNull(),
  initiatedAt: timestamp("initiated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const fieldQueryQuestions = pgTable("field_query_questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  queryId: uuid("query_id")
    .references(() => fieldQueries.id)
    .notNull(),
  targetMemberId: uuid("target_member_id")
    .references(() => teamMembers.id)
    .notNull(),
  questionText: text("question_text").notNull(),
  chips: text("chips").array().notNull(),
  dealId: uuid("deal_id").references(() => deals.id),
  accountId: uuid("account_id").references(() => companies.id),
  responseText: text("response_text"),
  responseType: text("response_type"),
  respondedAt: timestamp("responded_at"),
  giveBack: jsonb("give_back"),
  recordsUpdated: jsonb("records_updated"),
  status: fieldQueryQuestionStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const fieldQueriesRelations = relations(fieldQueries, ({ one, many }) => ({
  cluster: one(observationClusters, {
    fields: [fieldQueries.clusterId],
    references: [observationClusters.id],
  }),
  questions: many(fieldQueryQuestions),
}));

export const fieldQueryQuestionsRelations = relations(fieldQueryQuestions, ({ one }) => ({
  query: one(fieldQueries, {
    fields: [fieldQueryQuestions.queryId],
    references: [fieldQueries.id],
  }),
  targetMember: one(teamMembers, {
    fields: [fieldQueryQuestions.targetMemberId],
    references: [teamMembers.id],
  }),
  deal: one(deals, {
    fields: [fieldQueryQuestions.dealId],
    references: [deals.id],
  }),
  account: one(companies, {
    fields: [fieldQueryQuestions.accountId],
    references: [companies.id],
  }),
}));

// ── Cross-Agent Feedback ────────────────────────

export const crossAgentFeedback = pgTable("cross_agent_feedback", {
  id: uuid("id").defaultRandom().primaryKey(),
  sourceMemberId: uuid("source_member_id")
    .references(() => teamMembers.id)
    .notNull(),
  targetMemberId: uuid("target_member_id")
    .references(() => teamMembers.id)
    .notNull(),
  content: text("content").notNull(),
  dealId: uuid("deal_id").references(() => deals.id),
  accountId: uuid("account_id").references(() => companies.id),
  vertical: verticalEnum("vertical"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── System Intelligence ────────────────────────

export const systemIntelligence = pgTable("system_intelligence", {
  id: uuid("id").defaultRandom().primaryKey(),
  vertical: text("vertical"),
  accountId: uuid("account_id").references(() => companies.id),
  insightType: text("insight_type").notNull(),
  title: text("title").notNull(),
  insight: text("insight").notNull(),
  supportingData: jsonb("supporting_data"),
  confidence: decimal("confidence", { precision: 3, scale: 2 }),
  relevanceScore: decimal("relevance_score", { precision: 3, scale: 2 }),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Manager Directives ─────────────────────────

export const managerDirectives = pgTable("manager_directives", {
  id: uuid("id").defaultRandom().primaryKey(),
  authorId: uuid("author_id")
    .references(() => teamMembers.id)
    .notNull(),
  scope: text("scope").notNull(),
  vertical: text("vertical"),
  targetRole: text("target_role"),
  targetMemberId: uuid("target_member_id").references(() => teamMembers.id),
  directive: text("directive").notNull(),
  priority: text("priority").notNull(),
  category: text("category").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});

// ── Resource Hub ────────────────────────────────

export const resources = pgTable("resources", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(), // one_pager, case_study, whitepaper, faq, battlecard, roi_calculator, security_doc, template
  description: text("description"),
  verticals: text("verticals").array(),
  tags: text("tags").array(),
  url: text("url"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Playbook Intelligence ────────────────────────

export const playbookIdeas = pgTable("playbook_ideas", {
  id: uuid("id").defaultRandom().primaryKey(),
  originatorId: uuid("originator_id").references(() => teamMembers.id).notNull(),
  originatedFrom: text("originated_from"), // observation, close_analysis, manual, system_detected, cross_agent
  sourceObservationId: uuid("source_observation_id").references(() => observations.id),
  title: text("title").notNull(),
  hypothesis: text("hypothesis").notNull(),
  category: text("category").notNull(), // process, messaging, positioning, discovery, closing, engagement
  vertical: text("vertical"),
  status: text("status").notNull().default("proposed"), // proposed, testing, graduated, rejected, archived
  testStartDate: timestamp("test_start_date"),
  testEndDate: timestamp("test_end_date"),
  testGroupDeals: text("test_group_deals").array(),
  controlGroupDeals: text("control_group_deals").array(),
  results: jsonb("results"),
  followers: text("followers").array(),
  followerCount: integer("follower_count").default(0),
  // Experiment lifecycle fields
  testGroup: text("test_group").array(), // AE user IDs assigned to test
  controlGroup: text("control_group").array(), // AE user IDs as control
  successThresholds: jsonb("success_thresholds"), // { velocity_pct, sentiment_pts, close_rate_pct }
  currentMetrics: jsonb("current_metrics"), // { velocity_pct, sentiment_pts, close_rate_pct, deals_tested }
  approvedBy: text("approved_by"), // manager user ID
  approvedAt: timestamp("approved_at"),
  graduatedAt: timestamp("graduated_at"),
  experimentDurationDays: integer("experiment_duration_days").default(30),
  experimentStart: timestamp("experiment_start"),
  experimentEnd: timestamp("experiment_end"),
  attribution: jsonb("attribution"), // { proposed_by, proposed_at, approved_by, impact_arr }
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const influenceScores = pgTable("influence_scores", {
  id: uuid("id").defaultRandom().primaryKey(),
  memberId: uuid("member_id").references(() => teamMembers.id).notNull(),
  dimension: text("dimension").notNull(), // process_innovation, competitive_intel, technical_expertise, deal_coaching, customer_insight
  vertical: text("vertical"),
  score: integer("score").default(0),
  tier: text("tier").default("contributing"), // high_impact, growing, contributing, new
  attributions: jsonb("attributions"),
  lastContributionAt: timestamp("last_contribution_at"),
  decayAppliedAt: timestamp("decay_applied_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
