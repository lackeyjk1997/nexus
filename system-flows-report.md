# Nexus Codebase Audit — Full Inventory Report

**Generated:** 2026-04-03
**Purpose:** Read-only architectural reference for feature planning

---

## SECTION 1: DATABASE SCHEMA

### Enums (22)

| Enum Name | Values |
|-----------|--------|
| `roleEnum` ("role") | AE, BDR, SA, CSM, MANAGER |
| `verticalEnum` ("vertical") | healthcare, financial_services, manufacturing, retail, technology, general |
| `pipelineStageEnum` ("pipeline_stage") | new_lead, qualified, discovery, technical_validation, proposal, negotiation, closing, closed_won, closed_lost |
| `forecastCategoryEnum` ("forecast_category") | pipeline, upside, commit, closed |
| `productEnum` ("product") | claude_api, claude_enterprise, claude_team |
| `leadSourceEnum` ("lead_source") | inbound, outbound, plg_upgrade, partner, event |
| `contactRoleEnum` ("contact_role") | champion, economic_buyer, technical_evaluator, end_user, blocker, coach |
| `activityTypeEnum` ("activity_type") | email_sent, email_received, call_completed, meeting_scheduled, meeting_completed, note_added, stage_changed, task_completed, document_shared, call_prep, email_draft, call_analysis, observation, agent_feedback, competitive_intel |
| `enrichmentSourceEnum` ("enrichment_source") | apollo, clearbit, simulated |
| `milestoneSourceEnum` ("milestone_source") | manual, transcript, email, ai_detected |
| `stageChangedByEnum` ("stage_changed_by") | ai, human |
| `emailSequenceStatusEnum` ("email_sequence_status") | draft, active, paused, completed |
| `emailStepStatusEnum` ("email_step_status") | draft, approved, sent, opened, clicked, replied, bounced |
| `transcriptSourceEnum` ("transcript_source") | uploaded, recorded, simulated |
| `transcriptStatusEnum` ("transcript_status") | pending, transcribing, analyzing, complete |
| `agentRoleTypeEnum` ("agent_role_type") | ae, bdr, sa, csm, manager |
| `configChangedByEnum` ("config_changed_by") | user, ai, feedback_loop |
| `feedbackRequestTypeEnum` ("feedback_request_type") | add_info, change_format, add_question, remove_field, process_change |
| `feedbackStatusEnum` ("feedback_status") | pending, approved, rejected, auto_applied |
| `priorityEnum` ("priority") | low, medium, high, urgent |
| `agentActionTypeEnum` ("agent_action_type") | email_drafted, lead_scored, research_generated, transcript_analyzed, deal_stage_recommended, meeting_scheduled, feedback_processed, instruction_updated |
| `notificationTypeEnum` ("notification_type") | deal_at_risk, handoff_request, agent_recommendation, feedback_received, stage_change, meeting_reminder, approval_needed, system_intelligence |
| `observationRoutingStatusEnum` ("observation_routing_status") | sent, acknowledged, in_progress, resolved |
| `fieldQueryStatusEnum` ("field_query_status") | active, answered, expired |
| `fieldQueryQuestionStatusEnum` ("field_query_question_status") | pending, answered, skipped, expired |

### Tables (30)

#### 1. `team_members`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | defaultRandom(), PK |
| name | text | NOT NULL | — |
| email | text | NOT NULL | — |
| role | roleEnum | NOT NULL | — |
| vertical_specialization | verticalEnum | NOT NULL | 'general' |
| is_active | boolean | NOT NULL | true |
| avatar_url | text | YES | — |
| capacity_target | integer | YES | 10 |
| created_at | timestamp | NOT NULL | now() |
| updated_at | timestamp | NOT NULL | now() |

**Relations:** has many aeDeals, activities, agentConfigs, notifications

#### 2. `companies`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | defaultRandom(), PK |
| name | text | NOT NULL | — |
| domain | text | YES | — |
| industry | verticalEnum | NOT NULL | — |
| employee_count | integer | YES | — |
| annual_revenue | text | YES | — |
| tech_stack | text[] | YES | — |
| hq_location | text | YES | — |
| description | text | YES | — |
| enrichment_source | enrichmentSourceEnum | YES | 'simulated' |
| enrichment_data | jsonb | YES | — |
| created_at | timestamp | NOT NULL | now() |
| updated_at | timestamp | NOT NULL | now() |

**Relations:** has many contacts, deals, leadScores

#### 3. `contacts`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | defaultRandom(), PK |
| first_name | text | NOT NULL | — |
| last_name | text | NOT NULL | — |
| email | text | YES | — |
| phone | text | YES | — |
| title | text | YES | — |
| linkedin_url | text | YES | — |
| company_id | uuid (FK → companies.id) | NOT NULL | — |
| role_in_deal | contactRoleEnum | YES | — |
| is_primary | boolean | YES | false |
| created_at | timestamp | NOT NULL | now() |
| updated_at | timestamp | NOT NULL | now() |

**Relations:** belongs to company; has many activities

#### 4. `deals`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | defaultRandom(), PK |
| name | text | NOT NULL | — |
| company_id | uuid (FK → companies.id) | NOT NULL | — |
| primary_contact_id | uuid (FK → contacts.id) | YES | — |
| assigned_ae_id | uuid (FK → team_members.id) | YES | — |
| assigned_bdr_id | uuid (FK → team_members.id) | YES | — |
| assigned_sa_id | uuid (FK → team_members.id) | YES | — |
| stage | pipelineStageEnum | NOT NULL | 'new_lead' |
| deal_value | decimal(12,2) | YES | — |
| currency | text | YES | 'EUR' |
| close_date | timestamp | YES | — |
| win_probability | integer | YES | 0 |
| forecast_category | forecastCategoryEnum | YES | 'pipeline' |
| vertical | verticalEnum | NOT NULL | — |
| product | productEnum | YES | — |
| lead_source | leadSourceEnum | YES | — |
| competitor | text | YES | — |
| loss_reason | text | YES | — |
| close_competitor | text | YES | — |
| close_notes | text | YES | — |
| close_improvement | text | YES | — |
| win_turning_point | text | YES | — |
| win_replicable | text | YES | — |
| close_ai_analysis | jsonb | YES | — |
| close_factors | jsonb | YES | — |
| win_factors | jsonb | YES | — |
| close_ai_ran_at_timestamp | timestamp | YES | — |
| closed_at | timestamp | YES | — |
| stage_entered_at | timestamp | YES | now() |
| created_at | timestamp | NOT NULL | now() |
| updated_at | timestamp | NOT NULL | now() |

**Relations:** belongs to company, primaryContact, assignedAe; has many milestones, stageHistory, activities, callTranscripts, notifications; has one meddpicc

#### 5. `deal_milestones`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | defaultRandom(), PK |
| deal_id | uuid (FK → deals.id) | NOT NULL | — |
| milestone_key | text | NOT NULL | — |
| is_completed | boolean | YES | false |
| completed_at | timestamp | YES | — |
| source | milestoneSourceEnum | YES | 'manual' |
| evidence | text | YES | — |
| created_at | timestamp | NOT NULL | now() |
| updated_at | timestamp | NOT NULL | now() |

#### 6. `meddpicc_fields`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | defaultRandom(), PK |
| deal_id | uuid (FK → deals.id) | NOT NULL | — |
| metrics | text | YES | — |
| metrics_confidence | integer | YES | 0 |
| economic_buyer | text | YES | — |
| economic_buyer_confidence | integer | YES | 0 |
| decision_criteria | text | YES | — |
| decision_criteria_confidence | integer | YES | 0 |
| decision_process | text | YES | — |
| decision_process_confidence | integer | YES | 0 |
| identify_pain | text | YES | — |
| identify_pain_confidence | integer | YES | 0 |
| champion | text | YES | — |
| champion_confidence | integer | YES | 0 |
| competition | text | YES | — |
| competition_confidence | integer | YES | 0 |
| ai_extracted | boolean | YES | true |
| ae_confirmed | boolean | YES | false |
| created_at | timestamp | NOT NULL | now() |
| updated_at | timestamp | NOT NULL | now() |

**Indexes:** `meddpicc_deal_id_idx` UNIQUE on deal_id

#### 7. `deal_stage_history`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | defaultRandom(), PK |
| deal_id | uuid (FK → deals.id) | NOT NULL | — |
| from_stage | pipelineStageEnum | YES | — |
| to_stage | pipelineStageEnum | NOT NULL | — |
| changed_by | stageChangedByEnum | NOT NULL | — |
| reason | text | YES | — |
| created_at | timestamp | NOT NULL | now() |

#### 8. `activities`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | defaultRandom(), PK |
| deal_id | uuid (FK → deals.id) | YES | — |
| contact_id | uuid (FK → contacts.id) | YES | — |
| team_member_id | uuid (FK → team_members.id) | NOT NULL | — |
| type | activityTypeEnum | NOT NULL | — |
| subject | text | YES | — |
| description | text | YES | — |
| metadata | jsonb | YES | — |
| created_at | timestamp | NOT NULL | now() |

#### 9. `email_sequences`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | defaultRandom(), PK |
| deal_id | uuid (FK → deals.id) | NOT NULL | — |
| contact_id | uuid (FK → contacts.id) | NOT NULL | — |
| assigned_ae_id | uuid (FK → team_members.id) | NOT NULL | — |
| name | text | NOT NULL | — |
| status | emailSequenceStatusEnum | YES | 'draft' |
| created_at | timestamp | NOT NULL | now() |
| updated_at | timestamp | NOT NULL | now() |

#### 10. `email_steps`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | defaultRandom(), PK |
| sequence_id | uuid (FK → email_sequences.id) | NOT NULL | — |
| step_number | integer | NOT NULL | — |
| subject | text | NOT NULL | — |
| body | text | NOT NULL | — |
| delay_days | integer | YES | 0 |
| status | emailStepStatusEnum | YES | 'draft' |
| sent_at | timestamp | YES | — |
| opened_at | timestamp | YES | — |
| replied_at | timestamp | YES | — |
| ai_generated | boolean | YES | false |
| created_at | timestamp | NOT NULL | now() |
| updated_at | timestamp | NOT NULL | now() |

#### 11. `call_transcripts`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | defaultRandom(), PK |
| deal_id | uuid (FK → deals.id) | NOT NULL | — |
| title | text | NOT NULL | — |
| date | timestamp | NOT NULL | — |
| duration_seconds | integer | YES | — |
| participants | jsonb | YES | — |
| transcript_text | text | YES | — |
| source | transcriptSourceEnum | YES | 'simulated' |
| status | transcriptStatusEnum | YES | 'complete' |
| created_at | timestamp | NOT NULL | now() |
| updated_at | timestamp | NOT NULL | now() |

#### 12. `call_analyses`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | defaultRandom(), PK |
| transcript_id | uuid (FK → call_transcripts.id) | NOT NULL | — |
| summary | text | YES | — |
| pain_points | jsonb | YES | — |
| next_steps | jsonb | YES | — |
| stakeholders_mentioned | jsonb | YES | — |
| budget_signals | jsonb | YES | — |
| competitive_mentions | jsonb | YES | — |
| talk_ratio | jsonb | YES | — |
| question_quality | jsonb | YES | — |
| call_quality_score | integer | YES | — |
| meddpicc_extractions | jsonb | YES | — |
| coaching_insights | jsonb | YES | — |
| created_at | timestamp | NOT NULL | now() |

**Indexes:** `call_analyses_transcript_id_idx` UNIQUE on transcript_id

#### 13. `agent_configs`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | defaultRandom(), PK |
| team_member_id | uuid (FK → team_members.id) | NOT NULL | — |
| agent_name | text | NOT NULL | — |
| role_type | agentRoleTypeEnum | NOT NULL | — |
| instructions | text | NOT NULL | — |
| output_preferences | jsonb | YES | — |
| version | integer | YES | 1 |
| is_active | boolean | YES | true |
| created_at | timestamp | NOT NULL | now() |
| updated_at | timestamp | NOT NULL | now() |

#### 14. `agent_config_versions`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | defaultRandom(), PK |
| agent_config_id | uuid (FK → agent_configs.id) | NOT NULL | — |
| version | integer | NOT NULL | — |
| instructions | text | NOT NULL | — |
| output_preferences | jsonb | YES | — |
| changed_by | configChangedByEnum | NOT NULL | — |
| change_reason | text | YES | — |
| created_at | timestamp | NOT NULL | now() |

#### 15. `feedback_requests`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | defaultRandom(), PK |
| from_member_id | uuid (FK → team_members.id) | NOT NULL | — |
| from_agent_config_id | uuid (FK → agent_configs.id) | NOT NULL | — |
| target_role_type | agentRoleTypeEnum | NOT NULL | — |
| description | text | NOT NULL | — |
| request_type | feedbackRequestTypeEnum | NOT NULL | — |
| status | feedbackStatusEnum | YES | 'pending' |
| priority | priorityEnum | YES | 'medium' |
| approved_by_member_id | uuid (FK → team_members.id) | YES | — |
| resolved_at | timestamp | YES | — |
| created_at | timestamp | NOT NULL | now() |
| updated_at | timestamp | NOT NULL | now() |

#### 16. `agent_actions_log`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | defaultRandom(), PK |
| agent_config_id | uuid (FK → agent_configs.id) | NOT NULL | — |
| action_type | agentActionTypeEnum | NOT NULL | — |
| description | text | YES | — |
| input_data | jsonb | YES | — |
| output_data | jsonb | YES | — |
| was_overridden | boolean | YES | false |
| override_reason | text | YES | — |
| deal_id | uuid (FK → deals.id) | YES | — |
| created_at | timestamp | NOT NULL | now() |

#### 17. `lead_scores`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | defaultRandom(), PK |
| company_id | uuid (FK → companies.id) | NOT NULL | — |
| deal_id | uuid (FK → deals.id) | YES | — |
| score | integer | YES | 0 |
| scoring_factors | jsonb | YES | — |
| icp_match_pct | integer | YES | 0 |
| engagement_score | integer | YES | 0 |
| intent_score | integer | YES | 0 |
| created_at | timestamp | NOT NULL | now() |

#### 18. `notifications`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | defaultRandom(), PK |
| team_member_id | uuid (FK → team_members.id) | NOT NULL | — |
| type | notificationTypeEnum | NOT NULL | — |
| title | text | NOT NULL | — |
| message | text | NOT NULL | — |
| deal_id | uuid (FK → deals.id) | YES | — |
| is_read | boolean | YES | false |
| priority | priorityEnum | YES | 'medium' |
| created_at | timestamp | NOT NULL | now() |

#### 19. `observation_clusters`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | defaultRandom(), PK |
| title | text | NOT NULL | — |
| summary | text | YES | — |
| signal_type | text | NOT NULL | — |
| target_function | text | YES | — |
| observation_count | integer | YES | 1 |
| observer_count | integer | YES | 1 |
| verticals_affected | text[] | YES | — |
| pipeline_impact | jsonb | YES | — |
| severity | text | YES | 'informational' |
| resolution_status | text | YES | 'emerging' |
| resolution_notes | text | YES | — |
| effectiveness_score | integer | YES | — |
| arr_impact_total | decimal(12,2) | YES | — |
| arr_impact_details | jsonb | YES | — |
| unstructured_quotes | jsonb | YES | — |
| structured_summary | jsonb | YES | — |
| first_observed | timestamp | YES | now() |
| last_observed | timestamp | YES | now() |
| created_at | timestamp | NOT NULL | now() |
| updated_at | timestamp | NOT NULL | now() |

#### 20. `observations`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | defaultRandom(), PK |
| observer_id | uuid (FK → team_members.id) | NOT NULL | — |
| raw_input | text | NOT NULL | — |
| source_context | jsonb | YES | — |
| ai_classification | jsonb | YES | — |
| ai_giveback | jsonb | YES | — |
| status | text | YES | 'submitted' |
| lifecycle_events | jsonb | YES | — |
| cluster_id | uuid (FK → observation_clusters.id) | YES | — |
| follow_up_question | text | YES | — |
| follow_up_response | text | YES | — |
| follow_up_chips | text[] | YES | — |
| structured_data | jsonb | YES | — |
| arr_impact | jsonb | YES | — |
| linked_account_ids | uuid[] | YES | — |
| linked_deal_ids | uuid[] | YES | — |
| extracted_entities | jsonb | YES | — |
| created_at | timestamp | NOT NULL | now() |
| updated_at | timestamp | NOT NULL | now() |

#### 21. `support_function_members`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | defaultRandom(), PK |
| name | text | NOT NULL | — |
| role | text | NOT NULL | — |
| function | text | NOT NULL | — |
| email | text | YES | — |
| avatar_initials | text | YES | — |
| avatar_color | text | YES | — |
| verticals_covered | text[] | YES | — |
| created_at | timestamp | NOT NULL | now() |

#### 22. `observation_routing`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | defaultRandom(), PK |
| observation_id | uuid (FK → observations.id) | NOT NULL | — |
| target_function | text | NOT NULL | — |
| target_member_id | uuid | YES | — (no FK, supportFunctionMembers ID) |
| signal_type | text | NOT NULL | — |
| status | observationRoutingStatusEnum | NOT NULL | 'sent' |
| acknowledged_at | timestamp | YES | — |
| resolved_at | timestamp | YES | — |
| created_at | timestamp | NOT NULL | now() |

#### 23. `field_queries`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | defaultRandom(), PK |
| initiated_by | uuid | NOT NULL | — (no FK) |
| raw_question | text | NOT NULL | — |
| ai_analysis | jsonb | YES | — |
| cluster_id | uuid (FK → observation_clusters.id) | YES | — |
| aggregated_answer | jsonb | YES | — |
| status | fieldQueryStatusEnum | NOT NULL | 'active' |
| expires_at | timestamp | NOT NULL | — |
| initiated_at | timestamp | YES | now() |
| created_at | timestamp | NOT NULL | now() |
| updated_at | timestamp | NOT NULL | now() |

**Relations:** belongs to cluster; has many questions

#### 24. `field_query_questions`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | defaultRandom(), PK |
| query_id | uuid (FK → field_queries.id) | NOT NULL | — |
| target_member_id | uuid (FK → team_members.id) | NOT NULL | — |
| question_text | text | NOT NULL | — |
| chips | text[] | NOT NULL | — |
| deal_id | uuid (FK → deals.id) | YES | — |
| account_id | uuid (FK → companies.id) | YES | — |
| response_text | text | YES | — |
| response_type | text | YES | — |
| responded_at | timestamp | YES | — |
| give_back | jsonb | YES | — |
| records_updated | jsonb | YES | — |
| status | fieldQueryQuestionStatusEnum | NOT NULL | 'pending' |
| created_at | timestamp | NOT NULL | now() |

**Relations:** belongs to query, targetMember, deal, account

#### 25. `cross_agent_feedback`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | defaultRandom(), PK |
| source_member_id | uuid (FK → team_members.id) | NOT NULL | — |
| target_member_id | uuid (FK → team_members.id) | NOT NULL | — |
| content | text | NOT NULL | — |
| deal_id | uuid (FK → deals.id) | YES | — |
| account_id | uuid (FK → companies.id) | YES | — |
| vertical | verticalEnum | YES | — |
| created_at | timestamp | NOT NULL | now() |

#### 26. `system_intelligence`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | defaultRandom(), PK |
| vertical | text | YES | — |
| account_id | uuid (FK → companies.id) | YES | — |
| insight_type | text | NOT NULL | — |
| title | text | NOT NULL | — |
| insight | text | NOT NULL | — |
| supporting_data | jsonb | YES | — |
| confidence | decimal(3,2) | YES | — |
| relevance_score | decimal(3,2) | YES | — |
| status | text | NOT NULL | 'active' |
| created_at | timestamp | NOT NULL | now() |
| updated_at | timestamp | NOT NULL | now() |

#### 27. `manager_directives`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | defaultRandom(), PK |
| author_id | uuid (FK → team_members.id) | NOT NULL | — |
| scope | text | NOT NULL | — |
| vertical | text | YES | — |
| target_role | text | YES | — |
| target_member_id | uuid (FK → team_members.id) | YES | — |
| directive | text | NOT NULL | — |
| priority | text | NOT NULL | — |
| category | text | NOT NULL | — |
| is_active | boolean | NOT NULL | true |
| created_at | timestamp | NOT NULL | now() |
| expires_at | timestamp | YES | — |

#### 28. `resources`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | defaultRandom(), PK |
| title | text | NOT NULL | — |
| type | text | NOT NULL | — |
| description | text | YES | — |
| verticals | text[] | YES | — |
| tags | text[] | YES | — |
| url | text | YES | — |
| updated_at | timestamp | NOT NULL | now() |
| created_at | timestamp | NOT NULL | now() |

#### 29. `playbook_ideas`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | defaultRandom(), PK |
| originator_id | uuid (FK → team_members.id) | NOT NULL | — |
| originated_from | text | YES | — |
| source_observation_id | uuid (FK → observations.id) | YES | — |
| title | text | NOT NULL | — |
| hypothesis | text | NOT NULL | — |
| category | text | NOT NULL | — |
| vertical | text | YES | — |
| status | text | NOT NULL | 'proposed' |
| test_start_date | timestamp | YES | — |
| test_end_date | timestamp | YES | — |
| test_group_deals | text[] | YES | — |
| control_group_deals | text[] | YES | — |
| results | jsonb | YES | — |
| followers | text[] | YES | — |
| follower_count | integer | YES | 0 |
| test_group | text[] | YES | — |
| control_group | text[] | YES | — |
| success_thresholds | jsonb | YES | — |
| current_metrics | jsonb | YES | — |
| approved_by | text | YES | — |
| approved_at | timestamp | YES | — |
| graduated_at | timestamp | YES | — |
| experiment_duration_days | integer | YES | 30 |
| experiment_start | timestamp | YES | — |
| experiment_end | timestamp | YES | — |
| attribution | jsonb | YES | — |
| experiment_evidence | jsonb | YES | — |
| created_at | timestamp | NOT NULL | now() |
| updated_at | timestamp | NOT NULL | now() |

#### 30. `influence_scores`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | defaultRandom(), PK |
| member_id | uuid (FK → team_members.id) | NOT NULL | — |
| dimension | text | NOT NULL | — |
| vertical | text | YES | — |
| score | integer | YES | 0 |
| tier | text | YES | 'contributing' |
| attributions | jsonb | YES | — |
| last_contribution_at | timestamp | YES | — |
| decay_applied_at | timestamp | YES | — |
| created_at | timestamp | NOT NULL | now() |
| updated_at | timestamp | NOT NULL | now() |

### Foreign Key Relationships Summary

| Source Table | Source Column | Target Table |
|-------------|-------------|-------------|
| contacts | company_id | companies |
| deals | company_id | companies |
| deals | primary_contact_id | contacts |
| deals | assigned_ae_id | team_members |
| deals | assigned_bdr_id | team_members |
| deals | assigned_sa_id | team_members |
| deal_milestones | deal_id | deals |
| meddpicc_fields | deal_id | deals |
| deal_stage_history | deal_id | deals |
| activities | deal_id | deals |
| activities | contact_id | contacts |
| activities | team_member_id | team_members |
| email_sequences | deal_id | deals |
| email_sequences | contact_id | contacts |
| email_sequences | assigned_ae_id | team_members |
| email_steps | sequence_id | email_sequences |
| call_transcripts | deal_id | deals |
| call_analyses | transcript_id | call_transcripts |
| agent_configs | team_member_id | team_members |
| agent_config_versions | agent_config_id | agent_configs |
| feedback_requests | from_member_id | team_members |
| feedback_requests | from_agent_config_id | agent_configs |
| feedback_requests | approved_by_member_id | team_members |
| agent_actions_log | agent_config_id | agent_configs |
| agent_actions_log | deal_id | deals |
| lead_scores | company_id | companies |
| lead_scores | deal_id | deals |
| notifications | team_member_id | team_members |
| notifications | deal_id | deals |
| observations | observer_id | team_members |
| observations | cluster_id | observation_clusters |
| observation_routing | observation_id | observations |
| field_queries | cluster_id | observation_clusters |
| field_query_questions | query_id | field_queries |
| field_query_questions | target_member_id | team_members |
| field_query_questions | deal_id | deals |
| field_query_questions | account_id | companies |
| cross_agent_feedback | source_member_id | team_members |
| cross_agent_feedback | target_member_id | team_members |
| cross_agent_feedback | deal_id | deals |
| cross_agent_feedback | account_id | companies |
| system_intelligence | account_id | companies |
| manager_directives | author_id | team_members |
| manager_directives | target_member_id | team_members |
| playbook_ideas | originator_id | team_members |
| playbook_ideas | source_observation_id | observations |
| influence_scores | member_id | team_members |

### Indexes

| Table | Index Name | Columns | Type |
|-------|-----------|---------|------|
| meddpicc_fields | meddpicc_deal_id_idx | deal_id | UNIQUE |
| call_analyses | call_analyses_transcript_id_idx | transcript_id | UNIQUE |

---

## SECTION 2: API ROUTES (30)

### 1. `/api/deals` — GET
- **Purpose:** Retrieve all deals with company, team member, and contact joins.
- **Claude API:** No
- **Rivet:** No
- **DB Reads:** deals, companies, contacts, teamMembers (left joins)
- **DB Writes:** None

### 2. `/api/deals/stage` — POST
- **Purpose:** Update deal stage and track transitions. Handles closed won/lost outcomes with factors.
- **Claude API:** No
- **Rivet:** No
- **DB Reads:** deals
- **DB Writes:** deals, dealStageHistory, activities, observations
- **Notable:** Creates stage history with `changedBy: "human"`. On close, extracts confirmed AI factors and creates observations.

### 3. `/api/deals/resolve` — POST
- **Purpose:** Resolve deal by name fragment from rawQuery. Used by agent bar for context.
- **Claude API:** No
- **Rivet:** No
- **DB Reads:** deals, companies, contacts
- **Notable:** Keyword matching on deal/company names (4+ char words)

### 4. `/api/deals/close-analysis` — POST (`maxDuration: 60`)
- **Purpose:** AI-powered close/loss analysis with factors, questions, MEDDPICC gaps, stakeholder flags.
- **Claude API:** **Yes** — `claude-sonnet-4-20250514`. JSON output: summary, factors (label, category, evidence, confidence), questions, MEDDPICC gaps, stakeholder flags.
- **DB Reads:** deals, companies, contacts, meddpiccFields, activities, observations, callTranscripts, callAnalyses, dealStageHistory, systemIntelligence (8 parallel queries)

### 5. `/api/deals/[id]/meddpicc` — GET
- **Purpose:** Retrieve MEDDPICC data for a deal.
- **DB Reads:** meddpiccFields

### 6. `/api/deals/[id]/meddpicc-update` — PATCH (`maxDuration: 15`)
- **Purpose:** Update MEDDPICC dimensions with confidence scores and evidence. Tracks deltas.
- **DB Reads:** deals
- **DB Writes:** meddpiccFields, activities
- **Notable:** Insert-or-update pattern. Creates activity records documenting changes.

### 7. `/api/deals/[id]/update` — PATCH
- **Purpose:** Update whitelisted deal fields (close_date, stage, win_probability).
- **DB Writes:** deals

### 8. `/api/companies` — GET
- **DB Reads:** companies

### 9. `/api/team-members` — GET
- **DB Reads:** teamMembers

### 10. `/api/activities` — GET
- **Purpose:** Recent activities with joins (deal, company, team member, contact).
- **DB Reads:** activities, deals, companies, teamMembers, contacts
- **Notable:** 20-record limit, ordered descending.

### 11. `/api/notifications` — GET
- **Purpose:** Notifications filtered by memberId query param.
- **DB Reads:** notifications, teamMembers
- **Notable:** 20-record limit.

### 12. `/api/observations` — GET, POST (`maxDuration: 30`)
- **Purpose:** GET: List observations. POST: Create with AI classification, entity linking, clustering.
- **Claude API:** **Yes (POST)** — `claude-sonnet-4-20250514`. Classifies signals (competitive_intel, content_gap, deal_blocker, win_pattern, process_friction, agent_tuning, cross_agent, field_intelligence). Entity extraction, follow-up question generation.
- **DB Reads (POST):** companies, deals, teamMembers, observations (dedup check)
- **DB Writes (POST):** observations, observationClusters
- **Notable:** Dedup by transcriptId+signalType+dealId for pipeline triggers. Semantic cluster matching (confidence >= 0.6). ARR impact calculation.

### 13. `/api/observations/clusters` — GET
- **DB Reads:** observationClusters

### 14. `/api/observations/[id]/follow-up` — POST
- **Purpose:** Record follow-up response. Maps chips to structured data, calculates ARR, routes to team.
- **DB Reads:** observations, deals, teamMembers
- **DB Writes:** observations, observationClusters, notifications
- **Notable:** Chip mapping (scope, source, impact, frequency). Notifications to team in same vertical.

### 15. `/api/observation-routing` — GET, PATCH
- **Purpose:** List/update routing records by function/member.
- **DB Reads:** observationRouting, observations, teamMembers
- **DB Writes (PATCH):** observationRouting

### 16. `/api/field-queries` — GET, POST (`maxDuration: 30`)
- **Purpose:** Create field query. If answerable from data, returns immediately. Otherwise sends targeted questions to AEs.
- **Claude API:** **Yes (POST)** — analyzeQuery() + generateQuestion().
- **DB Reads:** observationClusters, observations, deals, fieldQueryQuestions
- **DB Writes:** fieldQueries, fieldQueryQuestions
- **Notable:** 4 resolution paths. Rate limit: max 3 pending questions per AE.

### 17. `/api/field-queries/respond` — POST (`maxDuration: 30`)
- **Purpose:** Record response. Generates give-back insight, creates observation.
- **Claude API:** **Yes** — generateGiveBack() synthesizes response.
- **DB Writes:** fieldQueryQuestions, activities, observations, fieldQueries

### 18. `/api/field-queries/suggestions` — GET
- **Purpose:** Generate 3 suggested queries from active clusters.
- **DB Reads:** observationClusters

### 19. `/api/analyze` — POST (`maxDuration: 60`)
- **Purpose:** Stream transcript analysis via Claude.
- **Claude API:** **Yes** — streaming. Imports prompts from `@/lib/analysis/prompts`.
- **Notable:** ReadableStream with SSE. Max 100K char transcript.

### 20. `/api/analyze/link` — POST
- **Purpose:** Link analysis to deal as activity. Triggers `/api/transcript-pipeline` if transcriptText provided.
- **DB Writes:** activities

### 21. `/api/agent/configure` — POST, PUT
- **Purpose:** POST: NL instruction → config changes via AI. PUT: Save confirmed config.
- **Claude API:** **Yes (POST)** — config interpreter.
- **DB Writes (PUT):** agentConfigs, agentConfigVersions

### 22. `/api/agent/feedback` — POST
- **Purpose:** Record feedback (1-5 rating) on agent output.
- **DB Writes:** feedbackRequests

### 23. `/api/agent/call-prep` — POST (`maxDuration: 120`)
- **Purpose:** Generate call prep brief with 8+ intelligence layers.
- **Claude API:** **Yes** — multi-section guide.
- **DB Reads:** deals, companies, contacts, meddpiccFields, activities, teamMembers, observations, observationClusters, agentConfigs, callTranscripts, callAnalyses, resources, crossAgentFeedback, systemIntelligence, managerDirectives, playbookIdeas (10 parallel queries)

### 24. `/api/agent/draft-email` — POST (`maxDuration: 60`)
- **Purpose:** Draft personalized email with rep's style, team context, system intelligence.
- **Claude API:** **Yes** — email persona with guardrails.
- **DB Reads:** deals, companies, contacts, meddpiccFields, activities, teamMembers, observations, agentConfigs, callTranscripts, callAnalyses, resources, crossAgentFeedback, systemIntelligence, managerDirectives

### 25. `/api/agent/save-to-deal` — POST
- **Purpose:** Save agent output as deal activity. Dedup within 1-hour window.
- **DB Writes:** activities

### 26. `/api/rivet/[...all]` — ALL methods (`maxDuration: 300`)
- **Purpose:** Proxy for Rivet actor registry via `toNextHandler(registry)`.
- **Rivet:** **Yes** — all actors

### 27. `/api/transcript-pipeline` — POST (`maxDuration: 300`)
- **Purpose:** Initiate transcript pipeline. Gathers context, sends to transcriptPipeline actor.
- **Rivet:** **Yes** — `transcriptPipeline.send("process", input)`
- **DB Reads:** deals, companies, contacts, meddpiccFields, agentConfigs, playbookIdeas, teamMembers

### 28. `/api/intelligence/agent-patterns` — GET (`maxDuration: 30`)
- **Purpose:** Fetch cross-deal patterns from coordinator actor.
- **Rivet:** **Yes** — `intelligenceCoordinator.getPatterns()`, `getStatus()`

### 29. `/api/playbook/ideas/[id]` — PATCH
- **Purpose:** Update experiment status with transitions.
- **DB Writes:** playbookIdeas, observations
- **Notable:** On graduation creates process_innovation observation.

### 30. `/api/demo/reset` — POST (`maxDuration: 300`)
- **Purpose:** Complete demo reset: delete pipeline data, reset deals, destroy Rivet actors, reinitialize experiments.
- **Rivet:** **Yes** — destroys all actors
- **DB Writes:** All tables (extensive cleanup)
- **Notable:** 3-phase reset with relative close dates.

---

## SECTION 3: RIVET ACTORS

### Actor 1: `dealAgent` (Simple Actor)

**File:** `apps/web/src/actors/deal-agent.ts`

**State Interface:**
```typescript
{
  dealId: string;
  dealName: string;
  companyName: string;
  vertical: string;
  initialized: boolean;
  interactionMemory: InteractionMemory[];  // { type, summary, insights, feedback } — last 50
  learnings: string[];
  riskSignals: string[];
  competitiveContext: {
    competitors: string[];
    ourDifferentiators: string[];
    recentMentions: Array<{ date: string; competitor: string; context: string }>; // last 10
  };
  coordinatedIntel: CoordinatedIntel[];  // last 20, from intelligence coordinator
  daysSinceCreation: number;
  totalInteractions: number;
  lastInteractionDate: string | null;
  lastCallPrepFeedback: { date: string; rating: number; comment: string } | null;
  currentStage: string;
  stageEnteredAt: string | null;
  lastCustomerResponseDate: string | null;
  closeDate: string | null;
  briefReady: BriefReady | null;  // { brief, generatedAt, context, dismissed }
  activeIntervention: ActiveIntervention | null;  // { type, title, diagnosis, action?, recommendation?, dismissed }
  lastHealthCheck: string | null;
  healthScore: number;
}
```

**RPC Methods:**

| Method | Purpose |
|--------|---------|
| initialize(dealId, dealName, companyName, vertical, currentStage, stageEnteredAt, closeDate?) | Set up state, schedule health check (30s) |
| getState() | Return full state |
| destroyActor() | Destroy instance |
| recordInteraction(type, summary, insights?, feedback?) | Append to memory (last 50), broadcast, reschedule health (10s) |
| recordFeedback(rating, comment) | Record lastCallPrepFeedback |
| updateLearnings(string[]) | Validate and consolidate learnings |
| addCompetitiveIntel(competitor, context, differentiators?) | Normalize competitor, track mentions (last 10) |
| addRiskSignal(signal, details) | Add if not duplicate |
| removeRiskSignal(signal) | Remove from array |
| updateStage(stage) | Update stage + timestamp |
| getMemoryForPrompt() | Return formatted memory string for prompt injection |
| workflowProgress(step, status, details?) | Broadcast progress event |
| setBriefReady(brief, generatedAt, context) | Set brief, broadcast |
| dismissBrief() | Mark dismissed |
| getBriefReady() | Return brief or null |
| setIntervention(ActiveIntervention or null) | Set intervention, broadcast |
| dismissIntervention() | Mark dismissed |
| addCoordinatedIntel(patternId, signalType, vertical, competitor?, synthesis, recommendations[], affectedDeals[], detectedAt) | Store (last 20), broadcast |
| runHealthCheck() | Calculate score (0-100), create intervention if <60 |

**Events:** memoryUpdated, learningsUpdated, riskDetected, workflowProgress, interventionReady, briefReady, healthChecked, coordinatedIntelReceived

**Scheduled Tasks:**
- initialize → runHealthCheck after 30s
- recordInteraction → runHealthCheck after 10s (if not run in last 60s)

**Health Score Formula:** Customer silence (-30/-15), risk signals (-10 each), MEDDPICC gaps (-5 each), competitive pressure (-10/-10), stage age vs threshold. NordicMed special case: timeline_risk for security reviews with close date <70 days.

**Claude API:** None directly (memory formatted for prompt injection)

---

### Actor 2: `transcriptPipeline` (Workflow Actor)

**File:** `apps/web/src/actors/transcript-pipeline.ts`

**State Interface:**
```typescript
{
  dealId: string;
  status: "idle" | "running" | "complete" | "error";
  currentStep: string;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  actionItems: ActionItem[];        // { item, owner, deadline? }
  meddpiccUpdates: Record<string, MeddpiccUpdate>;  // { score, evidence, delta }
  detectedSignals: DetectedSignal[];    // { type, content, context, urgency, source_speaker, quote }
  stakeholderInsights: StakeholderInsight[];  // { name, title?, sentiment, engagement, keyPriorities[], concerns[], notableQuotes[] }
  newLearnings: string[];
  followUpEmail: { subject: string; body: string } | null;
  experimentAttributions: ExperimentAttribution[];  // { experimentId, evidenceFound, tacticUsed, evidence, customerResponse, sentiment }
}
```

**Input (PipelineInput):**
```typescript
{ dealId, transcriptText, transcriptId, dealName, companyName, vertical,
  currentMeddpicc, existingContacts, agentConfigInstructions,
  assignedAeId, assignedAeName, appUrl, activeExperiments? }
```

**Workflow Steps (11):**
1. **init-pipeline** — Reset state
2. **parallel-analysis** (180s) — 3 Claude calls in parallel: extract actions (1024 tok), score MEDDPICC (1024 tok), detect signals+stakeholders (2048 tok)
3. **persist-meddpicc** — PATCH `/api/deals/{id}/meddpicc-update`
4. **create-signal-observations** — POST `/api/observations` per signal (parallel)
5. **synthesize-learnings** (180s) — Claude synthesis (1024 tok)
6. **check-experiments** (conditional) — Claude experiment evidence (1024 tok), PATCH `/api/playbook/ideas/{id}`
7. **draft-email** (graceful failure) — Claude email draft (1024 tok)
8. **update-deal-agent** — recordInteraction, updateLearnings, addCompetitiveIntel, addRiskSignal
9. **send-signals-to-coordinator** (180s) — intelligenceCoordinator.receiveSignal per signal
10. **auto-call-prep** (180s, graceful failure) — POST `/api/agent/call-prep` → dealAgent.setBriefReady
11. **mark-complete** — Set status complete

**Claude API:** 6 calls, all `claude-sonnet-4-20250514`

**RPC Methods:** getState, destroyActor, process (queue)

---

### Actor 3: `intelligenceCoordinator` (Simple Actor)

**File:** `apps/web/src/actors/intelligence-coordinator.ts`

**State Interface:**
```typescript
{
  signals: Signal[];     // last 200
  patterns: Pattern[];
  lastSynthesisRun: string | null;
  totalSignalsReceived: number;
  totalPatternsDetected: number;
}
```

**Signal:** `{ id, dealId, dealName, companyName, vertical, signalType, content, competitor?, urgency, receivedAt, sourceAeId, sourceAeName }`

**Pattern:** `{ id, signalType, vertical, competitor?, dealIds[], dealNames[], signals[], signalCount, synthesis, recommendations[], arrImpact, detectedAt, synthesizedAt, pushStatus }`

**RPC Methods:**

| Method | Purpose |
|--------|---------|
| receiveSignal(signal) | Validate, store, detect patterns (2+ same type/vertical/different deal), schedule synthesis |
| synthesizePattern(patternId) | Claude synthesis → push coordinated intel to affected deal agents |
| getPatterns() | Return all patterns |
| getPatternsForDeal(dealId) | Return patterns containing dealId |
| getStatus() | Return summary stats |
| destroyActor() | Destroy instance |

**Claude API:** 1 call in synthesizePattern (`claude-sonnet-4-20250514`, max 1024 tokens)

**Scheduled Tasks:** receiveSignal → synthesizePattern after 3s

---

### Actor 4: Registry

**File:** `apps/web/src/actors/registry.ts`
```typescript
const registry = setup({ use: { dealAgent, transcriptPipeline, intelligenceCoordinator } });
export type Registry = typeof registry;
```

### Inter-Actor Communication

```
/api/transcript-pipeline → transcriptPipeline.send("process", input)
  ├── dealAgent.workflowProgress (progress events)
  ├── dealAgent.recordInteraction/updateLearnings/addCompetitiveIntel/addRiskSignal
  ├── intelligenceCoordinator.receiveSignal (per signal)
  └── dealAgent.setBriefReady (after auto-call-prep)

intelligenceCoordinator.receiveSignal → detect pattern → synthesizePattern (3s)
  └── dealAgent.addCoordinatedIntel (per affected deal)

dealAgent.runHealthCheck (scheduled) → setIntervention (if score < 60)
```

---

## SECTION 4: PAGE ROUTES & COMPONENTS

### Page Routes (15)

| Route | Component | Data Fetching | Purpose |
|-------|-----------|--------------|---------|
| `/` | Inline | Client: POST `/api/demo/reset` | Landing page with demo reset, 3 pillars |
| `/command-center` | CommandCenterClient | Server: deals+companies+activities+notifications+team | Pipeline metrics, activities, notifications |
| `/pipeline` | PipelineClient | Server: deals+companies+AEs | Kanban board by stage |
| `/pipeline/[id]` | DealDetailClient | Server: deal+MEDDPICC+milestones+contacts+activities+transcripts+stageHistory+observations | Deal workspace with agent memory, interventions |
| `/intelligence` | IntelligenceClient | Server: clusters+observations+routing+closedDeals+directives | Patterns, Field Feed, Close Intelligence tabs |
| `/playbook` | PlaybookClient | Server: ideas+influenceScores+team+marketSignals | Experiments, What's Working, Influence tabs |
| `/outreach` | OutreachClient | Server: sequences+steps+clusters+directives | Email sequences + competitive context |
| `/agent-config` | AgentConfigClient | Server: configs+versions+feedback+team | Agent NL config with version history |
| `/observations` | — | Redirect | Redirects to `/intelligence?tab=feed` |
| `/prospects` | ProspectsClient | Server: contacts+companies+deals+activities | Contact database |
| `/calls` | Server table | Server: transcripts+analyses | Call library with quality scores |
| `/analyze` | TranscriptInput, AnalysisStream | Client: streaming `/api/analyze` | Streaming transcript analyzer |
| `/analytics` | AnalyticsClient | Server: deals+activities+team | Pipeline metrics and velocity |
| `/team` | — | None | Coming Soon |
| `/agent-admin` | — | None | Coming Soon |

### Sidebar Navigation (6 items)

1. Command Center (LayoutDashboard) → `/command-center`
2. Pipeline (Kanban) → `/pipeline`
3. Intelligence (BarChart3) → `/intelligence`
4. Playbook (FlaskConical) → `/playbook`
5. Outreach (Mail) → `/outreach`
6. Agent Config (Bot) → `/agent-config`

Collapsible: w-60 expanded, w-16 collapsed.

### Layout Structure

- **Root:** HTML wrapper, DM Sans font, metadata
- **Dashboard:** PersonaProvider → Sidebar + (TopBar + Main Content + LayoutAgentBar) + DemoGuide (floating right)
- **User switching:** PersonaProvider context, localStorage `nexus_persona_id`, default Sarah Chen
- **Top bar groups:** Sales (Sarah, David, Ryan), Leadership (Marcus), Solutions (Alex), Support Functions (Lisa, Michael, Rachel — collapsed)

### Key Components

| Component | Purpose |
|-----------|---------|
| `observation-input.tsx` (~1800 lines) | Universal agent bar. 4 modes: observe, call_prep, draft_email, quick_answer. Multi-phase state machine. |
| `agent-memory.tsx` | Deal agent state display via `useActor()`. Learnings, risks, competitive context, cross-deal intel. |
| `workflow-tracker.tsx` | 5-step visual pipeline tracker. Real-time via workflowProgress events. |
| `stage-change-modal.tsx` | Stage transitions with loss/win factor capture. AI close analysis integration. |
| `demo-guide.tsx` | 18-step guided demo. URL/element/manual detection. NordicMed + MedVista deals. |
| `agent-intervention.tsx` | Proactive intervention card. Health score bar, suggested actions, date picker. |
| `activity-feed.tsx` | Timeline list with type icons/filters. Expandable details, full brief modal. |
| `deal-question-input.tsx` | MANAGER-only "Ask about this deal". 3 contextual suggestions, keyboard shortcuts. |
| `layout-agent-bar.tsx` | Global agent bar, context-aware by pathname. |

---

## SECTION 5: SEED DATA

### File Inventory

| File | Entities |
|------|----------|
| `seed.ts` | 9 team members, 21 companies, 21+ deals, contacts |
| `seed-org.ts` | 11 more team members, 11 agent configs, 13 notifications, cross-agent versions |
| `seed-transcripts-resources.ts` | 4 call transcripts with analyses, 12 resources, 2 agent activities |
| `seed-observations.ts` | 5 observation clusters, 15 observations |
| `seed-intelligence.ts` | 3 support function members, cluster enrichment (ARR, quotes, summaries) |
| `seed-agents.ts` | Sarah's agent config (4 versions) |
| `seed-outreach.ts` | 5 email sequences with steps |
| `seed-playbook.ts` | 6 playbook experiments |
| `seed-playbook-lifecycle.ts` | Experiment evidence, influence scores, manager directives |
| `seed-field-queries.ts` | 1 field query with 3+ questions |
| `seed-cross-feedback.ts` | 8 cross-agent feedback records |
| `seed-hero-activities.ts` | 13+ activities for MedVista, HealthFirst, TrustBank |
| `seed-close-analysis.ts` | 2 close analyses (NordicCare, HealthBridge — both lost) |
| `seed-agent-actions.ts` | 2 agent-generated activities |
| `seed-final-polish.ts` | Cleanup: keeps 10 deals, deletes rest |
| `seed-system-intelligence.ts` | 7+ system intelligence insights |
| `seed-intelligence-fixes.ts` | Dedup, routing timestamps, ARR recalc |
| `seed-data/playbook-evidence.ts` | Hardcoded member/deal IDs, experiment evidence arrays |
| `seed-data/playbook-experiments.ts` | 8 experiment definitions with full lifecycle data |

### 10 Demo Deals

| Deal | AE | Value | Stage |
|------|----|-------|-------|
| MedVista Health Systems | Sarah Chen | €2.4M | Discovery (reset) |
| HealthFirst Insurance | Sarah Chen | €3.2M | Closed Lost |
| TrustBank Europe | Sarah Chen | €950K | Technical Validation |
| NordicMed Group | Ryan Foster | €1.6M | Proposal |
| Atlas Capital | David Park | €580K | Negotiation |
| HealthBridge Consulting | Sarah Chen | €1.2M | Closed Lost |
| MedTech Solutions | Ryan Foster | €2.1M | Closed Won |
| NordicCare Patient Records | Ryan Foster | €1.8M | Closed Lost |
| PharmaBridge Analytics | Sarah Chen | €340K | Discovery |
| NordicCare API Integration | Sarah Chen | €780K | Technical Validation |

### 8 Playbook Experiments

| Experiment | Status |
|-----------|--------|
| Compliance-led discovery in Healthcare | promoted |
| CISO engagement before Stage 3 | promoted |
| Security doc pre-delivery | promoted |
| Post-discovery prototype delivery | testing |
| Two-disco minimum before demo | testing |
| Multi-threaded engagement | testing |
| Competitive battlecard review before negotiation | proposed |
| ROI-first messaging in Healthcare | retired |

### Hardcoded IDs

- **MedVista:** `c0069b95-02dc-46db-bd04-aac69099ecfb`
- **NordicMed:** `3848a398-1850-4a8c-a44e-46aec01b6a24`
- Member IDs: Sarah, Alex, Ryan, David, Marcus, Tom, Priya, James, Elena

---

## SECTION 6: KEY SHARED UTILITIES

### `packages/shared/src/types.ts`

```typescript
ROLES: ["AE", "BDR", "SA", "CSM", "MANAGER"]
VERTICALS: ["healthcare", "financial_services", "manufacturing", "retail", "technology", "general"]
PIPELINE_STAGES: ["new_lead", "qualified", "discovery", "technical_validation", "proposal", "negotiation", "closing", "closed_won", "closed_lost"]
FORECAST_CATEGORIES: ["pipeline", "upside", "commit", "closed"]
PRODUCTS: ["claude_api", "claude_enterprise", "claude_team"]
LEAD_SOURCES: ["inbound", "outbound", "plg_upgrade", "partner", "event"]
CONTACT_ROLES: ["champion", "economic_buyer", "technical_evaluator", "end_user", "blocker", "coach"]
ACTIVITY_TYPES: [15 types]
VERTICAL_COLORS: { healthcare: "#3B82F6", financial_services: "#10B981", manufacturing: "#F59E0B", retail: "#8B5CF6", technology: "#06B6D4" }
NAV_ITEMS: [9 navigation items with role-based access]
```

### `apps/web/src/lib/db.ts`
Drizzle ORM client, `DATABASE_URL` env var, schema from `@nexus/db`.

### `apps/web/src/lib/rivet.ts`
RivetKit client + `useActor()` hook. Endpoint: `NEXT_PUBLIC_RIVET_ENDPOINT` || `window.location.origin/api/rivet` (browser) || `NEXT_PUBLIC_SITE_URL/api/rivet` (server).

---

## SECTION 7: ENVIRONMENT & CONFIG

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Supabase pooled connection |
| `DIRECT_URL` | Supabase direct connection (migrations) |
| `ANTHROPIC_API_KEY` | Claude API access |
| `NEXT_PUBLIC_SITE_URL` | Base URL for Rivet + internal HTTP calls |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public key |
| `NEXT_PUBLIC_RIVET_ENDPOINT` | Optional Rivet override |
| `RIVET_ENDPOINT` | Rivet Cloud internal (prod) |
| `RIVET_PUBLIC_ENDPOINT` | Rivet Cloud public (prod) |
| `VERCEL_URL` | Auto-set by Vercel |
| `PORT` | Server port (default 3001) |

### Next.js Config
```javascript
{ transpilePackages: ["@nexus/db", "@nexus/shared"],
  serverExternalPackages: ["rivetkit", "@rivetkit/next-js"] }
```

### Tailwind Config
```
Colors: background #FAF9F6, card #FFFFFF, sidebar #F5F3EF,
  primary #0C7489 (teal), secondary #D4735E (coral),
  muted #F5F3EF/#6B6B6B, border #E8E5E0,
  success #2D8A4E, warning #D4A843, danger #C74B3B,
  vertical: healthcare #3B82F6, financial #10B981, manufacturing #F59E0B, retail #8B5CF6, technology #06B6D4
Font: Inter, system-ui, sans-serif
Border Radius: lg=0.75rem, md=0.5rem, sm=0.375rem
Plugins: tailwindcss-animate
```

### Key Dependencies
```
@anthropic-ai/sdk ^0.80.0, @rivetkit/react ^2.2.0, @rivetkit/next-js ^2.2.0,
drizzle-orm ^0.39.0, postgres ^3.4.0, next 14.2.29, react ^18.3.0,
@radix-ui/* (avatar, dialog, dropdown, popover, select, separator, tabs, tooltip),
@tremor/react ^3.18.0, lucide-react ^0.468.0, tailwindcss ^3.4.0
```

### Build System
Turborepo + pnpm 10.33.0. Scripts: dev, build, lint, db:generate, db:push, db:seed.

---

## SECTION 8: CURRENT NAVIGATION & LAYOUT

### Sidebar (6 items)
1. Command Center → `/command-center`
2. Pipeline → `/pipeline`
3. Intelligence → `/intelligence`
4. Playbook → `/playbook`
5. Outreach → `/outreach`
6. Agent Config → `/agent-config`

### User Switching
- PersonaProvider context (providers.tsx)
- localStorage: `nexus_persona_id`
- Default: Sarah Chen (AE)
- 8 personas: 3 AEs, 1 Manager, 1 SA, 3 Support Functions

### Global Providers
- PersonaProvider (dashboard layout)
- No global RivetProvider — useActor() used per-component
- No theme provider — Tailwind only

### Dashboard Layout
```
┌──────────┬─────────────────────────────────┐
│ Sidebar  │ TopBar (logo, user switcher)     │
│ (w-60)   │─────────────────────────────────│
│          │ Main Content (scrollable)        │
│          │                                  │
│          │ LayoutAgentBar (bottom)           │
│          │                   DemoGuide (R)   │
└──────────┴─────────────────────────────────┘
```

---

## APPENDIX: CLAUDE API USAGE (15 call sites)

| Location | Model | Purpose |
|----------|-------|---------|
| /api/deals/close-analysis | claude-sonnet-4-20250514 | Close/loss analysis |
| /api/observations POST | claude-sonnet-4-20250514 | Observation classification |
| /api/field-queries POST | claude-sonnet-4-20250514 | Query analysis + question generation |
| /api/field-queries/respond | claude-sonnet-4-20250514 | Give-back insight synthesis |
| /api/analyze | claude-sonnet-4-20250514 | Streaming transcript analysis |
| /api/agent/configure POST | claude-sonnet-4-20250514 | NL config interpretation |
| /api/agent/call-prep | claude-sonnet-4-20250514 | 8-layer call prep brief |
| /api/agent/draft-email | claude-sonnet-4-20250514 | Personalized email draft |
| transcriptPipeline step 2a | claude-sonnet-4-20250514 | Extract action items (1024 tok) |
| transcriptPipeline step 2b | claude-sonnet-4-20250514 | Score MEDDPICC (1024 tok) |
| transcriptPipeline step 2c | claude-sonnet-4-20250514 | Detect signals (2048 tok) |
| transcriptPipeline step 5 | claude-sonnet-4-20250514 | Synthesize learnings (1024 tok) |
| transcriptPipeline step 6 | claude-sonnet-4-20250514 | Check experiment evidence (1024 tok) |
| transcriptPipeline step 7 | claude-sonnet-4-20250514 | Draft follow-up email (1024 tok) |
| intelligenceCoordinator | claude-sonnet-4-20250514 | Cross-deal pattern synthesis (1024 tok) |

## APPENDIX: INTER-ACTOR FLOW

```
/api/transcript-pipeline → transcriptPipeline.send("process")
  ├── [3 parallel Claude calls] → meddpicc + signals + actions
  ├── PATCH /api/deals/{id}/meddpicc-update
  ├── POST /api/observations (per signal)
  ├── Claude synthesis → dealAgent.updateLearnings
  ├── dealAgent.recordInteraction + addCompetitiveIntel + addRiskSignal
  ├── intelligenceCoordinator.receiveSignal (per signal)
  ├── POST /api/agent/call-prep → dealAgent.setBriefReady
  └── dealAgent.workflowProgress("finalize", "complete")

intelligenceCoordinator.receiveSignal → pattern detect (2+ signals same type/vertical)
  └── [3s] synthesizePattern → Claude → dealAgent.addCoordinatedIntel (per deal)

dealAgent.runHealthCheck (scheduled 30s/10s) → intervention if score < 60
```
