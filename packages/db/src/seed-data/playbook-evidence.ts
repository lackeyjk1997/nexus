// Extracted experiment evidence data for playbook demo reset
// Each export contains deal-level evidence for one experiment

// Team member IDs
export const MEMBER_IDS = {
  SARAH: "ec26c991-f580-452c-ae60-14b94800e920",
  ALEX: "eae38d09-1cfb-4044-8a16-b839bcb7d5d7",
  RYAN: "f7c15224-0883-46b7-affa-990eeedaac07",
  DAVID: "4443c9bb-5a4a-405a-9b99-f0e97e86b0d2",
  MARCUS: "fcbfac19-88eb-4a34-8582-b1cdfa03055b",
  TOM: "27cb3617-b187-40a5-9761-f878ce89f73d",
  PRIYA: "5d30b930-f2e8-4939-b2e6-2220385bf0fd",
  JAMES: "0f98cede-0aab-44aa-964d-06d2c634019c",
  ELENA: "a9b8cf2c-ec9b-4abc-97f0-c7d6f6523298",
} as const;

// Deal IDs.
// MedVista's UUID can be rotated via the MEDVISTA_DEAL_ID env var so the
// rotate-medvista script can swap in a fresh UUID without code changes.
// Old value kept as fallback so existing demos work without the env var set.
export const DEAL_IDS = {
  MEDVISTA: process.env.MEDVISTA_DEAL_ID || "c0069b95-02dc-46db-bd04-aac69099ecfb",
  NORDICMED: "3848a398-1850-4a8c-a44e-46aec01b6a24",
  HEALTHFIRST: "f4fee3bc-b65c-49e8-a34f-0fab8b8724c9",
  ATLAS: "0d0f187f-ee15-4baf-8ff5-08f88341eb1c",
} as const;

export const COMPLIANCE_OBS_ID = "5a8be514-7236-42ed-8929-119a362ea14c";

const { SARAH, RYAN, DAVID, PRIYA, JAMES, ALEX, TOM, ELENA } = MEMBER_IDS;
const { MEDVISTA, NORDICMED } = DEAL_IDS;

// ── TESTING experiment evidence ──

export const postDiscoveryEvidence = {
  deals: [
    { deal_name: "MedVista Health Systems", deal_id: MEDVISTA, owner_name: "Sarah Chen", owner_id: SARAH, group: "test", stage: "discovery", amount: 2400000, days_in_stage: 8, avg_days_baseline: 20, sentiment_score: 85, avg_sentiment_baseline: 60, evidence: [
      { type: "transcript", date: "2026-03-18", source: "Discovery Call with Dr. Patel", excerpt: "After building the EHR integration prototype live on the call, Dr. Patel immediately asked to bring in their CTO for a follow-up. She said: 'This is the first vendor who actually showed us what it would look like instead of just talking about it.'" },
      { type: "email", date: "2026-03-20", source: "Follow-up from Dr. Patel", excerpt: "The prototype from our session is already being reviewed by our compliance team. Can we schedule the security review this week instead of next month? We want to move quickly on this." },
    ]},
    { deal_name: "NordicMed Solutions", deal_id: NORDICMED, owner_name: "Sarah Chen", owner_id: SARAH, group: "test", stage: "technical_validation", amount: 1100000, days_in_stage: 11, avg_days_baseline: 20, sentiment_score: 78, avg_sentiment_baseline: 60, evidence: [
      { type: "transcript", date: "2026-03-14", source: "Discovery Call with CTO Eriksson", excerpt: "When we built the patient data routing automation live, Eriksson stopped the call to pull in two of his engineering leads. He said: 'They need to see this — this changes our whole evaluation timeline.'" },
    ]},
    { deal_name: "PharmaBridge Analytics", deal_id: null, owner_name: "Ryan Foster", owner_id: RYAN, group: "test", stage: "proposal", amount: 890000, days_in_stage: 6, avg_days_baseline: 20, sentiment_score: 82, avg_sentiment_baseline: 60, evidence: [
      { type: "transcript", date: "2026-03-21", source: "Discovery Call with VP Clinical Ops", excerpt: "Built a clinical trial data aggregation prototype during the call. The VP said: 'We've been asking our current vendor for this for 18 months. You just built it in 20 minutes.'" },
    ]},
    { deal_name: "NordicCare Group", deal_id: null, owner_name: "Sarah Chen", owner_id: SARAH, group: "test", stage: "discovery", amount: 750000, days_in_stage: 10, avg_days_baseline: 20, sentiment_score: 71, avg_sentiment_baseline: 60, evidence: [] },
    { deal_name: "Meridian Health Network", deal_id: null, owner_name: "Ryan Foster", owner_id: RYAN, group: "test", stage: "technical_validation", amount: 1300000, days_in_stage: 9, avg_days_baseline: 20, sentiment_score: 88, avg_sentiment_baseline: 60, evidence: [
      { type: "email", date: "2026-03-25", source: "Email from CIO to internal team (forwarded)", excerpt: "Forwarding the prototype link from today's call with Anthropic. This is significantly ahead of what we saw from Microsoft and Google. Let's fast-track the security review." },
    ]},
    { deal_name: "Coastal Medical Partners", deal_id: null, owner_name: "Priya Sharma", owner_id: PRIYA, group: "control", stage: "technical_validation", amount: 680000, days_in_stage: 22, avg_days_baseline: 20, sentiment_score: 55, avg_sentiment_baseline: 60, evidence: [] },
    { deal_name: "Summit Healthcare", deal_id: null, owner_name: "James Wilson", owner_id: JAMES, group: "control", stage: "proposal", amount: 920000, days_in_stage: 19, avg_days_baseline: 20, sentiment_score: 62, avg_sentiment_baseline: 60, evidence: [] },
    { deal_name: "Westlake Medical Group", deal_id: null, owner_name: "Priya Sharma", owner_id: PRIYA, group: "control", stage: "discovery", amount: 540000, days_in_stage: 24, avg_days_baseline: 20, sentiment_score: 48, avg_sentiment_baseline: 60, evidence: [] },
    { deal_name: "Pacific Health Alliance", deal_id: null, owner_name: "James Wilson", owner_id: JAMES, group: "control", stage: "negotiation", amount: 1050000, days_in_stage: 18, avg_days_baseline: 20, sentiment_score: 65, avg_sentiment_baseline: 60, evidence: [] },
  ],
};

export const multiThreadedEvidence = {
  deals: [
    { deal_name: "TechFlow Systems", deal_id: null, owner_name: "David Park", owner_id: DAVID, group: "test", stage: "proposal", amount: 890000, days_in_stage: 15, avg_days_baseline: 18, sentiment_score: 65, avg_sentiment_baseline: 60, evidence: [
      { type: "transcript", date: "2026-03-10", source: "Multi-stakeholder meeting", excerpt: "Brought in VP Engineering and Director of Product early. While both engaged positively, the VP later told David: 'Involving us this early felt premature — we hadn't even defined our requirements yet.'" },
    ]},
    { deal_name: "Apex Financial Corp", deal_id: null, owner_name: "Elena Rodriguez", owner_id: ELENA, group: "test", stage: "technical_validation", amount: 1200000, days_in_stage: 12, avg_days_baseline: 18, sentiment_score: 72, avg_sentiment_baseline: 60, evidence: [
      { type: "email", date: "2026-03-15", source: "Email from Elena to team", excerpt: "Multi-threading worked here — getting the CFO involved at Stage 2 meant the budget conversation happened in parallel with technical eval. Saved us 2 weeks." },
    ]},
    { deal_name: "Granite Insurance Group", deal_id: null, owner_name: "David Park", owner_id: DAVID, group: "test", stage: "discovery", amount: 650000, days_in_stage: 20, avg_days_baseline: 18, sentiment_score: 52, avg_sentiment_baseline: 60, evidence: [
      { type: "transcript", date: "2026-03-22", source: "Discovery call debrief", excerpt: "Tried to multi-thread by asking for CISO access during first discovery. Champion pushed back hard — said 'we don't bring security into vendor conversations until we've decided to move forward.' Felt like we overstepped." },
    ]},
    { deal_name: "Sterling Wealth Management", deal_id: null, owner_name: "Priya Sharma", owner_id: PRIYA, group: "control", stage: "proposal", amount: 780000, days_in_stage: 18, avg_days_baseline: 18, sentiment_score: 61, avg_sentiment_baseline: 60, evidence: [] },
    { deal_name: "Pinnacle Credit Union", deal_id: null, owner_name: "James Wilson", owner_id: JAMES, group: "control", stage: "technical_validation", amount: 950000, days_in_stage: 16, avg_days_baseline: 18, sentiment_score: 58, avg_sentiment_baseline: 60, evidence: [] },
    { deal_name: "Redwood Capital Partners", deal_id: null, owner_name: "Priya Sharma", owner_id: PRIYA, group: "control", stage: "discovery", amount: 1100000, days_in_stage: 21, avg_days_baseline: 18, sentiment_score: 55, avg_sentiment_baseline: 60, evidence: [] },
  ],
};

export const twoDiscoEvidence = {
  deals: [
    { deal_name: "CloudNine Logistics", deal_id: null, owner_name: "Priya Sharma", owner_id: PRIYA, group: "test", stage: "technical_validation", amount: 720000, days_in_stage: 10, avg_days_baseline: 16, sentiment_score: 79, avg_sentiment_baseline: 62, evidence: [
      { type: "transcript", date: "2026-03-19", source: "Second discovery call", excerpt: "The second discovery uncovered that their real pain was in logistics routing, not the inventory management they initially mentioned. The demo we built targeted routing specifically and the CTO said: 'Finally, someone who actually listened before showing us slides.'" },
    ]},
    { deal_name: "DataVault Systems", deal_id: null, owner_name: "James Wilson", owner_id: JAMES, group: "test", stage: "proposal", amount: 880000, days_in_stage: 8, avg_days_baseline: 16, sentiment_score: 83, avg_sentiment_baseline: 62, evidence: [
      { type: "email", date: "2026-03-24", source: "Follow-up from VP Engineering", excerpt: "Appreciate the thorough discovery process. The fact that you came back for a second conversation before jumping to a demo tells me your team actually cares about solving our problem, not just selling." },
    ]},
    { deal_name: "Quantum Analytics", deal_id: null, owner_name: "Priya Sharma", owner_id: PRIYA, group: "test", stage: "discovery", amount: 560000, days_in_stage: 14, avg_days_baseline: 16, sentiment_score: 68, avg_sentiment_baseline: 62, evidence: [] },
    { deal_name: "Atlas Data Corp", deal_id: null, owner_name: "Elena Rodriguez", owner_id: ELENA, group: "control", stage: "proposal", amount: 690000, days_in_stage: 18, avg_days_baseline: 16, sentiment_score: 57, avg_sentiment_baseline: 62, evidence: [] },
    { deal_name: "Nexgen Solutions", deal_id: null, owner_name: "David Park", owner_id: DAVID, group: "control", stage: "technical_validation", amount: 840000, days_in_stage: 15, avg_days_baseline: 16, sentiment_score: 64, avg_sentiment_baseline: 62, evidence: [] },
  ],
};

// ── PROMOTED experiment evidence ──

export const cisoEngagementEvidence = {
  deals: [
    { deal_name: "Regional Health Network", deal_id: null, owner_name: "Sarah Chen", owner_id: SARAH, group: "test", stage: "closed_won", amount: 1800000, days_in_stage: 7, avg_days_baseline: 16, sentiment_score: 91, avg_sentiment_baseline: 65, evidence: [
      { type: "transcript", date: "2026-02-12", source: "CISO introduction call", excerpt: "Getting the CISO engaged before Technical Validation meant the security review ran in parallel instead of blocking. The CISO said: 'I wish more vendors brought us in early — it saves everyone time.'" },
    ]},
    { deal_name: "HealthFirst Clinical", deal_id: null, owner_name: "Ryan Foster", owner_id: RYAN, group: "test", stage: "closed_won", amount: 2200000, days_in_stage: 9, avg_days_baseline: 16, sentiment_score: 87, avg_sentiment_baseline: 65, evidence: [
      { type: "email", date: "2026-02-18", source: "Internal Slack from Ryan", excerpt: "CISO engagement at Stage 2 completely changed the dynamic. Instead of security being a gate, they became an advocate. They're now pushing procurement to accelerate." },
    ]},
    { deal_name: "Metro Health Systems", deal_id: null, owner_name: "Alex Kim", owner_id: ALEX, group: "test", stage: "closed_won", amount: 1400000, days_in_stage: 11, avg_days_baseline: 16, sentiment_score: 79, avg_sentiment_baseline: 65, evidence: [] },
    { deal_name: "Valley Medical Center", deal_id: null, owner_name: "Sarah Chen", owner_id: SARAH, group: "test", stage: "closed_lost", amount: 900000, days_in_stage: 14, avg_days_baseline: 16, sentiment_score: 58, avg_sentiment_baseline: 65, evidence: [] },
  ],
};

export const complianceDiscoveryEvidence = {
  deals: [
    { deal_name: "MedVista Health Systems", deal_id: MEDVISTA, owner_name: "Sarah Chen", owner_id: SARAH, group: "test", stage: "discovery", amount: 2400000, days_in_stage: 6, avg_days_baseline: 14, sentiment_score: 88, avg_sentiment_baseline: 62, evidence: [
      { type: "transcript", date: "2026-01-22", source: "Discovery Call", excerpt: "Opening with HIPAA compliance positioning immediately changed the tone. Dr. Patel said: 'Finally — a vendor that understands healthcare isn't just another enterprise sale. Compliance is table stakes.'" },
    ]},
    { deal_name: "NordicMed Group Platform", deal_id: NORDICMED, owner_name: "Ryan Foster", owner_id: RYAN, group: "test", stage: "closed_won", amount: 1600000, days_in_stage: 8, avg_days_baseline: 14, sentiment_score: 82, avg_sentiment_baseline: 62, evidence: [
      { type: "email", date: "2026-01-28", source: "Follow-up from CTO", excerpt: "The fact that you led with data residency and AI governance — not features — made our compliance team comfortable from day one. That never happens with vendors." },
    ]},
    { deal_name: "Pacific Wellness Group", deal_id: null, owner_name: "Sarah Chen", owner_id: SARAH, group: "test", stage: "closed_won", amount: 1200000, days_in_stage: 9, avg_days_baseline: 14, sentiment_score: 79, avg_sentiment_baseline: 62, evidence: [] },
    { deal_name: "Eastside Medical", deal_id: null, owner_name: "Ryan Foster", owner_id: RYAN, group: "control", stage: "closed_lost", amount: 850000, days_in_stage: 18, avg_days_baseline: 14, sentiment_score: 51, avg_sentiment_baseline: 62, evidence: [] },
    { deal_name: "Lakeside Health Partners", deal_id: null, owner_name: "James Wilson", owner_id: JAMES, group: "control", stage: "proposal", amount: 960000, days_in_stage: 16, avg_days_baseline: 14, sentiment_score: 57, avg_sentiment_baseline: 62, evidence: [] },
  ],
};

export const securityDocEvidence = {
  deals: [
    { deal_name: "Atlas Capital Analytics", deal_id: DEAL_IDS.ATLAS, owner_name: "David Park", owner_id: DAVID, group: "test", stage: "negotiation", amount: 580000, days_in_stage: 5, avg_days_baseline: 14, sentiment_score: 84, avg_sentiment_baseline: 58, evidence: [
      { type: "email", date: "2026-02-05", source: "Prospect CISO reply", excerpt: "Thank you for sending the SOC 2 Type II report ahead of our meeting. This is the first time a vendor has done this proactively — it saved us at least two weeks of back-and-forth." },
    ]},
    { deal_name: "TrustBank Financial", deal_id: null, owner_name: "David Park", owner_id: DAVID, group: "test", stage: "closed_won", amount: 950000, days_in_stage: 7, avg_days_baseline: 14, sentiment_score: 81, avg_sentiment_baseline: 58, evidence: [
      { type: "transcript", date: "2026-02-10", source: "Technical Review", excerpt: "Their Head of Security opened with: 'I already reviewed your SOC 2 docs — let's skip the security overview and go straight to architecture.' We saved 30 minutes." },
    ]},
    { deal_name: "Pinnacle Financial Group", deal_id: null, owner_name: "Tom Bradley", owner_id: TOM, group: "test", stage: "closed_won", amount: 720000, days_in_stage: 6, avg_days_baseline: 14, sentiment_score: 77, avg_sentiment_baseline: 58, evidence: [] },
    { deal_name: "Meridian Capital", deal_id: null, owner_name: "David Park", owner_id: DAVID, group: "control", stage: "technical_validation", amount: 680000, days_in_stage: 16, avg_days_baseline: 14, sentiment_score: 54, avg_sentiment_baseline: 58, evidence: [] },
    { deal_name: "Heritage Banking Corp", deal_id: null, owner_name: "Tom Bradley", owner_id: TOM, group: "control", stage: "proposal", amount: 830000, days_in_stage: 15, avg_days_baseline: 14, sentiment_score: 52, avg_sentiment_baseline: 58, evidence: [] },
  ],
};
