import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const client = postgres(process.env.DIRECT_URL!, { max: 1 });
const db = drizzle(client, { schema });

function uuid() {
  return crypto.randomUUID();
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

async function seed() {
  console.log("🌱 Seeding database...");

  // Clean existing data (reverse FK order)
  await db.delete(schema.agentActionsLog);
  await db.delete(schema.agentConfigVersions);
  await db.delete(schema.feedbackRequests);
  await db.delete(schema.notifications);
  await db.delete(schema.leadScores);
  await db.delete(schema.callAnalyses);
  await db.delete(schema.callTranscripts);
  await db.delete(schema.emailSteps);
  await db.delete(schema.emailSequences);
  await db.delete(schema.activities);
  await db.delete(schema.dealStageHistory);
  await db.delete(schema.dealMilestones);
  await db.delete(schema.meddpiccFields);
  await db.delete(schema.deals);
  await db.delete(schema.contacts);
  await db.delete(schema.companies);
  await db.delete(schema.agentConfigs);
  await db.delete(schema.teamMembers);

  console.log("  Cleaned existing data");

  // ── Team Members ──
  const teamMemberData = [
    { id: uuid(), name: "Sarah Chen", email: "sarah.chen@anthropic.com", role: "AE" as const, verticalSpecialization: "healthcare" as const, capacityTarget: 12 },
    { id: uuid(), name: "Marcus Rodriguez", email: "marcus.rodriguez@anthropic.com", role: "AE" as const, verticalSpecialization: "manufacturing" as const, capacityTarget: 10 },
    { id: uuid(), name: "Priya Sharma", email: "priya.sharma@anthropic.com", role: "AE" as const, verticalSpecialization: "technology" as const, capacityTarget: 11 },
    { id: uuid(), name: "Jake Morrison", email: "jake.morrison@anthropic.com", role: "BDR" as const, verticalSpecialization: "general" as const, capacityTarget: 25 },
    { id: uuid(), name: "Amara Okafor", email: "amara.okafor@anthropic.com", role: "BDR" as const, verticalSpecialization: "general" as const, capacityTarget: 25 },
    { id: uuid(), name: "David Kim", email: "david.kim@anthropic.com", role: "SA" as const, verticalSpecialization: "healthcare" as const, capacityTarget: 8 },
    { id: uuid(), name: "Rachel Torres", email: "rachel.torres@anthropic.com", role: "SA" as const, verticalSpecialization: "technology" as const, capacityTarget: 8 },
    { id: uuid(), name: "Liam Foster", email: "liam.foster@anthropic.com", role: "CSM" as const, verticalSpecialization: "general" as const, capacityTarget: 15 },
    { id: uuid(), name: "Kate Jensen", email: "kate.jensen@anthropic.com", role: "MANAGER" as const, verticalSpecialization: "general" as const, capacityTarget: 0 },
  ];

  await db.insert(schema.teamMembers).values(teamMemberData);
  console.log("  ✓ Team members");

  const [sarah, marcus, priya, jake, amara, david, rachel, liam, kate] = teamMemberData;

  // ── Companies & Deals ──
  const companiesAndDeals = [
    // Healthcare (Sarah Chen)
    { company: { name: "MedVista Health Systems", domain: "medvista.com", industry: "healthcare" as const, employeeCount: 2800, annualRevenue: "€450M", hqLocation: "Munich, Germany", techStack: ["Epic EHR", "Azure", "Python", "React"], description: "Regional hospital network with 12 facilities across Bavaria" }, deals: [
      { name: "MedVista — Claude Enterprise for Clinical Docs", stage: "proposal" as const, dealValue: "2400000", product: "claude_enterprise" as const, winProbability: 65, forecastCategory: "upside" as const, leadSource: "inbound" as const, closeDate: daysAgo(-30), stageEnteredAt: daysAgo(8), competitor: "Microsoft Copilot" },
    ]},
    { company: { name: "NordicCare Group", domain: "nordiccare.eu", industry: "healthcare" as const, employeeCount: 5200, annualRevenue: "€820M", hqLocation: "Stockholm, Sweden", techStack: ["Cerner", "AWS", "Java", "Angular"], description: "Scandinavian healthcare provider specializing in eldercare and rehabilitation" }, deals: [
      { name: "NordicCare — Claude API Integration", stage: "technical_validation" as const, dealValue: "780000", product: "claude_api" as const, winProbability: 50, forecastCategory: "upside" as const, leadSource: "event" as const, closeDate: daysAgo(-45), stageEnteredAt: daysAgo(12) },
    ]},
    { company: { name: "PharmaBridge Analytics", domain: "pharmabridge.de", industry: "healthcare" as const, employeeCount: 450, annualRevenue: "€95M", hqLocation: "Berlin, Germany", techStack: ["Python", "TensorFlow", "GCP", "React"], description: "AI-driven pharmaceutical research analytics platform" }, deals: [
      { name: "PharmaBridge — Claude API for Drug Interaction Analysis", stage: "discovery" as const, dealValue: "340000", product: "claude_api" as const, winProbability: 35, forecastCategory: "pipeline" as const, leadSource: "inbound" as const, closeDate: daysAgo(-60), stageEnteredAt: daysAgo(5) },
    ]},
    { company: { name: "HealthFirst Insurance", domain: "healthfirst-ins.eu", industry: "healthcare" as const, employeeCount: 1800, annualRevenue: "€2.1B", hqLocation: "Zurich, Switzerland", techStack: ["Guidewire", "AWS", "Java", "React"], description: "Leading European health insurance provider" }, deals: [
      { name: "HealthFirst — Claude Enterprise for Claims Processing", stage: "negotiation" as const, dealValue: "3200000", product: "claude_enterprise" as const, winProbability: 75, forecastCategory: "commit" as const, leadSource: "outbound" as const, closeDate: daysAgo(-15), stageEnteredAt: daysAgo(10) },
    ]},
    { company: { name: "BioGenesis Labs", domain: "biogenesis.com", industry: "healthcare" as const, employeeCount: 320, annualRevenue: "€68M", hqLocation: "Cambridge, UK", techStack: ["AWS", "Python", "Django", "PostgreSQL"], description: "Biotech startup focused on genomics research" }, deals: [
      { name: "BioGenesis — Claude Team for Research", stage: "qualified" as const, dealValue: "120000", product: "claude_team" as const, winProbability: 25, forecastCategory: "pipeline" as const, leadSource: "plg_upgrade" as const, closeDate: daysAgo(-90), stageEnteredAt: daysAgo(3) },
    ]},

    // Financial Services (Sarah Chen)
    { company: { name: "Meridian Capital Partners", domain: "meridiancap.eu", industry: "financial_services" as const, employeeCount: 650, annualRevenue: "€180M", hqLocation: "Frankfurt, Germany", techStack: ["Bloomberg Terminal", "Python", "React", "AWS"], description: "Mid-market private equity firm with €4B AUM" }, deals: [
      { name: "Meridian — Claude Enterprise for Deal Analysis", stage: "closing" as const, dealValue: "1800000", product: "claude_enterprise" as const, winProbability: 90, forecastCategory: "commit" as const, leadSource: "partner" as const, closeDate: daysAgo(-7), stageEnteredAt: daysAgo(5) },
    ]},
    { company: { name: "TrustBank Europe", domain: "trustbank.eu", industry: "financial_services" as const, employeeCount: 4200, annualRevenue: "€1.2B", hqLocation: "Amsterdam, Netherlands", techStack: ["Temenos", "Azure", "Java", "Angular"], description: "Digital-first retail bank serving 3M customers across Benelux" }, deals: [
      { name: "TrustBank — Claude API for Fraud Detection", stage: "technical_validation" as const, dealValue: "950000", product: "claude_api" as const, winProbability: 55, forecastCategory: "upside" as const, leadSource: "inbound" as const, closeDate: daysAgo(-40), stageEnteredAt: daysAgo(15) },
    ]},
    { company: { name: "AlphaWealth Advisors", domain: "alphawealth.ch", industry: "financial_services" as const, employeeCount: 180, annualRevenue: "€42M", hqLocation: "Geneva, Switzerland", techStack: ["Salesforce", "Python", "React", "AWS"], description: "Boutique wealth management firm for UHNW clients" }, deals: [
      { name: "AlphaWealth — Claude Team for Client Reports", stage: "closed_won" as const, dealValue: "185000", product: "claude_team" as const, winProbability: 100, forecastCategory: "closed" as const, leadSource: "outbound" as const, closeDate: daysAgo(15), stageEnteredAt: daysAgo(15) },
    ]},

    // Manufacturing (Marcus Rodriguez)
    { company: { name: "Steelworks Continental", domain: "steelworks-continental.de", industry: "manufacturing" as const, employeeCount: 8500, annualRevenue: "€3.2B", hqLocation: "Essen, Germany", techStack: ["SAP", "Azure", "SCADA", "Python"], description: "Integrated steel manufacturer with plants across Central Europe" }, deals: [
      { name: "Steelworks — Claude Enterprise for Supply Chain", stage: "proposal" as const, dealValue: "4500000", product: "claude_enterprise" as const, winProbability: 60, forecastCategory: "upside" as const, leadSource: "event" as const, closeDate: daysAgo(-25), stageEnteredAt: daysAgo(7), competitor: "OpenAI" },
    ]},
    { company: { name: "PrecisionTech GmbH", domain: "precisiontech.de", industry: "manufacturing" as const, employeeCount: 1200, annualRevenue: "€280M", hqLocation: "Stuttgart, Germany", techStack: ["Siemens NX", "SAP", "Azure", "C++"], description: "Precision components manufacturer for automotive and aerospace" }, deals: [
      { name: "PrecisionTech — Claude API for Quality Control", stage: "discovery" as const, dealValue: "420000", product: "claude_api" as const, winProbability: 30, forecastCategory: "pipeline" as const, leadSource: "inbound" as const, closeDate: daysAgo(-75), stageEnteredAt: daysAgo(6) },
    ]},
    { company: { name: "EcoPackaging Solutions", domain: "ecopack.nl", industry: "manufacturing" as const, employeeCount: 600, annualRevenue: "€120M", hqLocation: "Rotterdam, Netherlands", techStack: ["Oracle", "AWS", "React", "Python"], description: "Sustainable packaging manufacturer serving FMCG brands" }, deals: [
      { name: "EcoPackaging — Claude Team for Design Automation", stage: "negotiation" as const, dealValue: "250000", product: "claude_team" as const, winProbability: 70, forecastCategory: "commit" as const, leadSource: "outbound" as const, closeDate: daysAgo(-20), stageEnteredAt: daysAgo(12) },
    ]},
    { company: { name: "Nordic Pulp & Paper", domain: "nordicpulp.fi", industry: "manufacturing" as const, employeeCount: 3400, annualRevenue: "€890M", hqLocation: "Helsinki, Finland", techStack: ["ABB Ability", "SAP", "Azure", "Java"], description: "Sustainable forestry and paper products manufacturer" }, deals: [
      { name: "Nordic Pulp — Claude Enterprise for Process Optimization", stage: "new_lead" as const, dealValue: "1600000", product: "claude_enterprise" as const, winProbability: 10, forecastCategory: "pipeline" as const, leadSource: "event" as const, closeDate: daysAgo(-120), stageEnteredAt: daysAgo(2) },
    ]},

    // Retail (Marcus Rodriguez)
    { company: { name: "LuxeMode Fashion", domain: "luxemode.fr", industry: "retail" as const, employeeCount: 900, annualRevenue: "€340M", hqLocation: "Paris, France", techStack: ["Shopify Plus", "GCP", "React", "Python"], description: "Premium fashion e-commerce brand with 45 European boutiques" }, deals: [
      { name: "LuxeMode — Claude API for Personalization Engine", stage: "technical_validation" as const, dealValue: "580000", product: "claude_api" as const, winProbability: 45, forecastCategory: "upside" as const, leadSource: "inbound" as const, closeDate: daysAgo(-50), stageEnteredAt: daysAgo(18) },
    ]},
    { company: { name: "FreshMarkt AG", domain: "freshmarkt.de", industry: "retail" as const, employeeCount: 15000, annualRevenue: "€4.8B", hqLocation: "Hamburg, Germany", techStack: ["SAP", "Azure", "React Native", "Python"], description: "Regional supermarket chain with 280 stores in Northern Germany" }, deals: [
      { name: "FreshMarkt — Claude Enterprise for Operations", stage: "discovery" as const, dealValue: "2100000", product: "claude_enterprise" as const, winProbability: 25, forecastCategory: "pipeline" as const, leadSource: "outbound" as const, closeDate: daysAgo(-90), stageEnteredAt: daysAgo(4) },
    ]},
    { company: { name: "SportZone Europe", domain: "sportzone.eu", industry: "retail" as const, employeeCount: 2200, annualRevenue: "€520M", hqLocation: "Barcelona, Spain", techStack: ["Magento", "AWS", "Vue.js", "Python"], description: "Multi-channel sports retail with e-commerce and 120 stores" }, deals: [
      { name: "SportZone — Claude Team for Customer Service", stage: "qualified" as const, dealValue: "290000", product: "claude_team" as const, winProbability: 20, forecastCategory: "pipeline" as const, leadSource: "plg_upgrade" as const, closeDate: daysAgo(-80), stageEnteredAt: daysAgo(7) },
    ]},
    { company: { name: "HomeStyle Interiors", domain: "homestyle.at", industry: "retail" as const, employeeCount: 350, annualRevenue: "€75M", hqLocation: "Vienna, Austria", techStack: ["WooCommerce", "AWS", "React", "Node.js"], description: "Premium home furnishing and interior design retailer" }, deals: [
      { name: "HomeStyle — Claude API for Product Descriptions", stage: "closed_won" as const, dealValue: "145000", product: "claude_api" as const, winProbability: 100, forecastCategory: "closed" as const, leadSource: "inbound" as const, closeDate: daysAgo(20), stageEnteredAt: daysAgo(20) },
    ]},

    // Technology (Priya Sharma)
    { company: { name: "DataStream Analytics", domain: "datastream.io", industry: "technology" as const, employeeCount: 400, annualRevenue: "€65M", hqLocation: "Dublin, Ireland", techStack: ["Snowflake", "dbt", "Python", "React", "AWS"], description: "Real-time analytics platform for enterprise data teams" }, deals: [
      { name: "DataStream — Claude API for Natural Language Queries", stage: "closing" as const, dealValue: "680000", product: "claude_api" as const, winProbability: 85, forecastCategory: "commit" as const, leadSource: "plg_upgrade" as const, closeDate: daysAgo(-10), stageEnteredAt: daysAgo(6) },
    ]},
    { company: { name: "CyberShield Security", domain: "cybershield.eu", industry: "technology" as const, employeeCount: 550, annualRevenue: "€110M", hqLocation: "Tallinn, Estonia", techStack: ["Elasticsearch", "Go", "React", "AWS"], description: "Enterprise cybersecurity platform with AI-powered threat detection" }, deals: [
      { name: "CyberShield — Claude Enterprise for Threat Analysis", stage: "proposal" as const, dealValue: "920000", product: "claude_enterprise" as const, winProbability: 55, forecastCategory: "upside" as const, leadSource: "partner" as const, closeDate: daysAgo(-35), stageEnteredAt: daysAgo(9), competitor: "Google Gemini" },
    ]},
    { company: { name: "CloudNine SaaS", domain: "cloudnine.dev", industry: "technology" as const, employeeCount: 220, annualRevenue: "€38M", hqLocation: "Berlin, Germany", techStack: ["Kubernetes", "Go", "React", "GCP"], description: "Cloud infrastructure management platform for mid-market" }, deals: [
      { name: "CloudNine — Claude API for DevOps Automation", stage: "technical_validation" as const, dealValue: "350000", product: "claude_api" as const, winProbability: 40, forecastCategory: "pipeline" as const, leadSource: "inbound" as const, closeDate: daysAgo(-55), stageEnteredAt: daysAgo(14) },
    ]},
    { company: { name: "FinLeap Technologies", domain: "finleap.com", industry: "technology" as const, employeeCount: 850, annualRevenue: "€145M", hqLocation: "Berlin, Germany", techStack: ["Kubernetes", "Python", "React", "AWS"], description: "Fintech platform builder and incubator in Europe" }, deals: [
      { name: "FinLeap — Claude Enterprise for Code Review", stage: "negotiation" as const, dealValue: "1350000", product: "claude_enterprise" as const, winProbability: 70, forecastCategory: "commit" as const, leadSource: "inbound" as const, closeDate: daysAgo(-18), stageEnteredAt: daysAgo(8) },
    ]},
    { company: { name: "AutoML Labs", domain: "automllabs.ai", industry: "technology" as const, employeeCount: 90, annualRevenue: "€12M", hqLocation: "London, UK", techStack: ["PyTorch", "FastAPI", "React", "GCP"], description: "AutoML platform making machine learning accessible to non-experts" }, deals: [
      { name: "AutoML Labs — Claude Team for Documentation", stage: "closed_lost" as const, dealValue: "95000", product: "claude_team" as const, winProbability: 0, forecastCategory: "closed" as const, leadSource: "plg_upgrade" as const, closeDate: daysAgo(30), stageEnteredAt: daysAgo(30), competitor: "OpenAI" },
    ]},
    { company: { name: "LogiTrack Systems", domain: "logitrack.eu", industry: "technology" as const, employeeCount: 380, annualRevenue: "€58M", hqLocation: "Warsaw, Poland", techStack: ["AWS", "Python", "React Native", "PostgreSQL"], description: "Fleet management and logistics optimization platform" }, deals: [
      { name: "LogiTrack — Claude API for Route Optimization", stage: "discovery" as const, dealValue: "410000", product: "claude_api" as const, winProbability: 30, forecastCategory: "pipeline" as const, leadSource: "outbound" as const, closeDate: daysAgo(-65), stageEnteredAt: daysAgo(3) },
    ]},

    // Additional deals for pipeline depth
    { company: { name: "VitalSign Medical Devices", domain: "vitalsign-med.de", industry: "healthcare" as const, employeeCount: 750, annualRevenue: "€160M", hqLocation: "Freiburg, Germany", techStack: ["AWS", "Python", "C++", "React"], description: "Connected medical devices manufacturer for patient monitoring" }, deals: [
      { name: "VitalSign — Claude API for Device Diagnostics", stage: "new_lead" as const, dealValue: "520000", product: "claude_api" as const, winProbability: 10, forecastCategory: "pipeline" as const, leadSource: "event" as const, closeDate: daysAgo(-100), stageEnteredAt: daysAgo(1) },
    ]},
    { company: { name: "RenewEnergy Corp", domain: "renewenergy.dk", industry: "manufacturing" as const, employeeCount: 1600, annualRevenue: "€420M", hqLocation: "Copenhagen, Denmark", techStack: ["Azure", "Python", "SCADA", "React"], description: "Wind turbine manufacturer and renewable energy solutions" }, deals: [
      { name: "RenewEnergy — Claude Enterprise for Predictive Maintenance", stage: "qualified" as const, dealValue: "1900000", product: "claude_enterprise" as const, winProbability: 20, forecastCategory: "pipeline" as const, leadSource: "partner" as const, closeDate: daysAgo(-85), stageEnteredAt: daysAgo(6) },
    ]},
    { company: { name: "InsureTech Europe", domain: "insuretech.eu", industry: "financial_services" as const, employeeCount: 320, annualRevenue: "€55M", hqLocation: "Lisbon, Portugal", techStack: ["AWS", "Python", "React", "PostgreSQL"], description: "Digital insurance platform for SMBs across Southern Europe" }, deals: [
      { name: "InsureTech — Claude API for Policy Generation", stage: "proposal" as const, dealValue: "460000", product: "claude_api" as const, winProbability: 50, forecastCategory: "upside" as const, leadSource: "inbound" as const, closeDate: daysAgo(-30), stageEnteredAt: daysAgo(11) },
    ]},
  ];

  const companyIds: string[] = [];
  const dealIds: string[] = [];
  const contactIds: string[] = [];

  for (const entry of companiesAndDeals) {
    const companyId = uuid();
    companyIds.push(companyId);

    await db.insert(schema.companies).values({
      id: companyId,
      ...entry.company,
      enrichmentSource: "simulated",
    });

    // Create 2-4 contacts per company
    const contactCount = randomBetween(2, 4);
    const titles = ["VP of Engineering", "CTO", "Head of IT", "Director of Innovation", "VP Product", "Chief Digital Officer", "Engineering Manager", "Director of Operations"];
    const roles: (typeof schema.contactRoleEnum.enumValues)[number][] = ["champion", "economic_buyer", "technical_evaluator", "end_user"];
    const firstNames = ["James", "Emma", "Oliver", "Sophie", "Alexander", "Maria", "Thomas", "Anna", "Henrik", "Clara", "Pierre", "Elena"];
    const lastNames = ["Mueller", "Schmidt", "Anderson", "Johansson", "Laurent", "Petrov", "Weber", "Fischer", "Dubois", "Rossi"];

    const companyContacts: string[] = [];
    for (let c = 0; c < contactCount; c++) {
      const contactId = uuid();
      contactIds.push(contactId);
      companyContacts.push(contactId);
      const fn = pick(firstNames);
      const ln = pick(lastNames);
      await db.insert(schema.contacts).values({
        id: contactId,
        firstName: fn,
        lastName: ln,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}@${entry.company.domain}`,
        title: titles[c % titles.length],
        companyId,
        roleInDeal: roles[c % roles.length],
        isPrimary: c === 0,
      });
    }

    // AE assignment based on vertical
    const aeMap: Record<string, typeof sarah> = {
      healthcare: sarah!,
      financial_services: sarah!,
      manufacturing: marcus!,
      retail: marcus!,
      technology: priya!,
    };
    const ae = aeMap[entry.company.industry] ?? sarah!;
    const bdr = pick([jake!, amara!]);
    const sa = entry.company.industry === "healthcare" || entry.company.industry === "financial_services" ? david! : rachel!;

    for (const deal of entry.deals) {
      const dealId = uuid();
      dealIds.push(dealId);

      await db.insert(schema.deals).values({
        id: dealId,
        name: deal.name,
        companyId,
        primaryContactId: companyContacts[0],
        assignedAeId: ae.id,
        assignedBdrId: bdr.id,
        assignedSaId: ["technical_validation", "proposal", "negotiation", "closing"].includes(deal.stage) ? sa.id : null,
        stage: deal.stage,
        dealValue: deal.dealValue,
        currency: "EUR",
        closeDate: deal.closeDate,
        winProbability: deal.winProbability,
        forecastCategory: deal.forecastCategory,
        vertical: entry.company.industry,
        product: deal.product,
        leadSource: deal.leadSource,
        competitor: (deal as any).competitor ?? null,
        stageEnteredAt: deal.stageEnteredAt,
      });

      // MEDDPICC for deals beyond new_lead
      if (deal.stage !== "new_lead") {
        const confidence = Math.min(deal.winProbability + 10, 100);
        await db.insert(schema.meddpiccFields).values({
          dealId,
          metrics: deal.winProbability > 40 ? `${randomBetween(15, 40)}% reduction in processing time, €${randomBetween(200, 800)}K annual savings` : null,
          metricsConfidence: deal.winProbability > 40 ? randomBetween(40, 80) : 0,
          economicBuyer: deal.winProbability > 30 ? `${pick(firstNames)} ${pick(lastNames)}, ${pick(["CFO", "VP Finance", "CEO", "COO"])}` : null,
          economicBuyerConfidence: deal.winProbability > 30 ? randomBetween(30, confidence) : 0,
          decisionCriteria: deal.winProbability > 25 ? "Security compliance, integration ease, accuracy, total cost of ownership" : null,
          decisionCriteriaConfidence: deal.winProbability > 25 ? randomBetween(20, confidence) : 0,
          decisionProcess: deal.winProbability > 50 ? "Technical eval → Security review → Procurement → Board approval" : null,
          decisionProcessConfidence: deal.winProbability > 50 ? randomBetween(40, 70) : 0,
          identifyPain: "Manual processes consuming 30+ hours/week, error rates in document processing, slow response to customer queries",
          identifyPainConfidence: randomBetween(50, 90),
          champion: companyContacts[0] ? `Primary contact (${pick(["VP Engineering", "Head of Innovation", "CTO"])})` : null,
          championConfidence: deal.winProbability > 30 ? randomBetween(30, 80) : 0,
          competition: (deal as any).competitor ?? "No identified competitor",
          competitionConfidence: (deal as any).competitor ? randomBetween(40, 70) : 20,
          aiExtracted: true,
          aeConfirmed: deal.winProbability > 60,
        });
      }

      // Deal milestones
      const milestones = [
        { key: "initial_meeting", label: "Initial Meeting" },
        { key: "pain_identified", label: "Pain Identified" },
        { key: "champion_identified", label: "Champion Identified" },
        { key: "technical_demo", label: "Technical Demo" },
        { key: "security_review", label: "Security Review" },
        { key: "proposal_sent", label: "Proposal Sent" },
        { key: "contract_negotiation", label: "Contract Negotiation" },
      ];
      const stageIndex = ["new_lead", "qualified", "discovery", "technical_validation", "proposal", "negotiation", "closing", "closed_won", "closed_lost"].indexOf(deal.stage);
      for (let m = 0; m < milestones.length; m++) {
        await db.insert(schema.dealMilestones).values({
          dealId,
          milestoneKey: milestones[m]!.key,
          isCompleted: m < stageIndex,
          completedAt: m < stageIndex ? daysAgo(randomBetween(5, 60)) : null,
          source: pick(["manual", "transcript", "ai_detected"] as const),
        });
      }

      // Stage history
      const stagesOrder = ["new_lead", "qualified", "discovery", "technical_validation", "proposal", "negotiation", "closing", "closed_won", "closed_lost"] as const;
      for (let s = 0; s <= stageIndex && s < stagesOrder.length - 1; s++) {
        await db.insert(schema.dealStageHistory).values({
          dealId,
          fromStage: s === 0 ? null : stagesOrder[s - 1],
          toStage: stagesOrder[s]!,
          changedBy: pick(["ai", "human"] as const),
          reason: s === 0 ? "New deal created" : `Advanced from ${stagesOrder[s - 1]} based on ${pick(["meeting outcome", "email engagement", "technical validation", "stakeholder buy-in"])}`,
          createdAt: daysAgo(randomBetween(stageIndex - s, (stageIndex - s + 1) * 10)),
        });
      }

      // Activities (3-5 per deal)
      const actCount = randomBetween(3, 5);
      for (let a = 0; a < actCount; a++) {
        const actType = pick(["email_sent", "call_completed", "meeting_completed", "note_added", "stage_changed"] as const);
        await db.insert(schema.activities).values({
          dealId,
          contactId: pick(companyContacts),
          teamMemberId: pick([ae.id, bdr.id]),
          type: actType,
          subject: actType === "email_sent" ? `Follow-up: ${entry.company.name} — Next Steps`
            : actType === "call_completed" ? `Discovery call with ${entry.company.name}`
            : actType === "meeting_completed" ? `Demo presentation for ${entry.company.name}`
            : actType === "note_added" ? `Internal notes on ${entry.company.name} deal progress`
            : `Stage changed for ${entry.company.name}`,
          description: `Activity for ${deal.name}`,
          createdAt: daysAgo(randomBetween(1, 30)),
        });
      }

      // Lead score
      await db.insert(schema.leadScores).values({
        companyId,
        dealId,
        score: randomBetween(30, 95),
        scoringFactors: {
          companySize: entry.company.employeeCount! > 1000 ? "high" : "medium",
          techFit: "high",
          engagement: deal.winProbability > 50 ? "high" : "medium",
        },
        icpMatchPct: randomBetween(50, 95),
        engagementScore: randomBetween(20, 90),
        intentScore: randomBetween(15, 85),
      });
    }
  }

  console.log("  ✓ Companies, contacts, deals, milestones, stage history, activities, lead scores");

  // ── Call Transcripts (5 simulated) ──
  const transcriptDeals = dealIds.slice(0, 5);
  for (let t = 0; t < 5; t++) {
    const transcriptId = uuid();
    await db.insert(schema.callTranscripts).values({
      id: transcriptId,
      dealId: transcriptDeals[t]!,
      title: `Discovery Call — ${companiesAndDeals[t]!.company.name}`,
      date: daysAgo(randomBetween(3, 20)),
      durationSeconds: randomBetween(1800, 3600),
      participants: [
        { name: "Sarah Chen", role: "AE" },
        { name: `${pick(["James", "Sophie", "Henrik"])} ${pick(["Mueller", "Schmidt"])}`, role: "Prospect" },
      ],
      transcriptText: generateTranscript(companiesAndDeals[t]!.company.name, companiesAndDeals[t]!.deals[0]!.product),
      source: "simulated",
      status: "complete",
    });

    await db.insert(schema.callAnalyses).values({
      transcriptId,
      summary: `Discovery call with ${companiesAndDeals[t]!.company.name} covering current pain points, AI adoption readiness, and next steps for ${companiesAndDeals[t]!.deals[0]!.product === "claude_enterprise" ? "Claude Enterprise" : "Claude API"} evaluation.`,
      painPoints: [
        "Manual document processing taking 30+ hours per week",
        "High error rates in current automated workflows",
        "Difficulty scaling current processes with team growth",
      ],
      nextSteps: [
        "Schedule technical demo with engineering team",
        "Share security documentation and compliance certifications",
        "Prepare ROI analysis with customer-specific metrics",
      ],
      stakeholdersMentioned: [
        { name: "CTO", sentiment: "positive" },
        { name: "Head of Engineering", sentiment: "neutral" },
        { name: "CFO", sentiment: "cautious" },
      ],
      budgetSignals: [
        { signal: "Annual innovation budget of €500K-1M mentioned", strength: "medium" },
        { signal: "Currently spending €200K on existing tools", strength: "strong" },
      ],
      competitiveMentions: [
        { competitor: "OpenAI", context: "Evaluated briefly but concerns about data privacy" },
      ],
      talkRatio: { ae: 35, prospect: 65 },
      questionQuality: { openEnded: 8, closedEnded: 3, discovery: 6 },
      callQualityScore: randomBetween(65, 92),
      meddpiccExtractions: {
        painIdentified: true,
        championSignal: true,
        budgetDiscussed: true,
      },
      coachingInsights: [
        "Good discovery questions — consider diving deeper on competitive landscape",
        "Talk ratio is excellent — prospect did most of the talking",
        "Follow up on the CFO's budget concerns in next meeting",
      ],
    });
  }
  console.log("  ✓ Call transcripts and analyses");

  // ── Agent Configs ──
  const agentConfigIds: string[] = [];
  const agentInstructions: { memberId: string; name: string; roleType: (typeof schema.agentRoleTypeEnum.enumValues)[number]; instructions: string }[] = [
    { memberId: sarah!.id, name: "Sarah's AE Agent", roleType: "ae", instructions: "Focus on healthcare and financial services verticals. Prioritize deals with >€500K value. Use consultative selling approach. Always reference industry-specific use cases. Include ROI calculations in proposals. Flag deals at risk of slipping past close date." },
    { memberId: marcus!.id, name: "Marcus's AE Agent", roleType: "ae", instructions: "Specialize in manufacturing and retail verticals. Emphasize operational efficiency gains. Use technical proof points for manufacturing buyers. For retail, focus on customer experience improvements and revenue growth metrics." },
    { memberId: priya!.id, name: "Priya's AE Agent", roleType: "ae", instructions: "Focus on technology companies. Speak developer-first language. Emphasize API capabilities, SDK quality, and developer experience. Reference GitHub integrations and CI/CD workflows. Lead with technical differentiation." },
    { memberId: jake!.id, name: "Jake's BDR Agent", roleType: "bdr", instructions: "Generate outbound sequences for mid-market companies (500-5000 employees). Research company tech stack before outreach. Personalize first touch with specific use case. Follow up 3x before moving to nurture. Target VP+ titles." },
    { memberId: amara!.id, name: "Amara's BDR Agent", roleType: "bdr", instructions: "Handle inbound lead qualification. Score leads based on ICP fit, company size, and engagement signals. Route qualified leads to appropriate AE within 4 hours. Nurture non-qualified leads with educational content." },
    { memberId: david!.id, name: "David's SA Agent", roleType: "sa", instructions: "Prepare technical demos for healthcare and financial services. Focus on security, compliance (HIPAA, SOX, GDPR), and data handling. Create architecture diagrams for enterprise integrations. Document technical requirements during discovery." },
    { memberId: rachel!.id, name: "Rachel's SA Agent", roleType: "sa", instructions: "Support technology and manufacturing deals with technical depth. Build proof-of-concept environments. Focus on API performance, scalability, and custom model fine-tuning. Create integration guides for common tech stacks." },
    { memberId: liam!.id, name: "Liam's CSM Agent", roleType: "csm", instructions: "Monitor customer health scores and usage metrics. Flag accounts with declining engagement. Prepare QBR materials with usage data and ROI metrics. Identify expansion opportunities based on team growth and feature adoption." },
    { memberId: kate!.id, name: "Kate's Manager Agent", roleType: "manager", instructions: "Generate weekly pipeline reports with forecast accuracy analysis. Identify coaching opportunities based on call analyses. Track team capacity and deal distribution. Alert on deals stuck in stage >2x average. Monitor competitive win/loss trends." },
  ];

  for (const ac of agentInstructions) {
    const configId = uuid();
    agentConfigIds.push(configId);
    await db.insert(schema.agentConfigs).values({
      id: configId,
      teamMemberId: ac.memberId,
      agentName: ac.name,
      roleType: ac.roleType,
      instructions: ac.instructions,
      outputPreferences: { format: "markdown", verbosity: "concise", includeMetrics: true },
      version: 1,
      isActive: true,
    });
  }
  console.log("  ✓ Agent configs");

  // ── Feedback Requests ──
  const feedbackData = [
    { from: david!, config: agentConfigIds[5]!, target: "ae" as const, desc: "Please add authentication architecture questions to discovery call guides. SA team needs auth details before technical validation.", type: "add_question" as const, status: "approved" as const, priority: "high" as const },
    { from: rachel!, config: agentConfigIds[6]!, target: "bdr" as const, desc: "Outbound sequences should mention API rate limits upfront — tech companies always ask and it delays qualification.", type: "add_info" as const, status: "pending" as const, priority: "medium" as const },
    { from: liam!, config: agentConfigIds[7]!, target: "ae" as const, desc: "Proposals should include implementation timeline and onboarding plan — CSM needs this to set accurate expectations.", type: "change_format" as const, status: "auto_applied" as const, priority: "medium" as const },
    { from: kate!, config: agentConfigIds[8]!, target: "bdr" as const, desc: "Remove company size from initial outreach emails — it feels too researched and is off-putting to European prospects.", type: "remove_field" as const, status: "pending" as const, priority: "low" as const },
    { from: sarah!, config: agentConfigIds[0]!, target: "sa" as const, desc: "For healthcare deals, please include HIPAA compliance checklist in technical validation materials automatically.", type: "add_info" as const, status: "approved" as const, priority: "high" as const },
    { from: marcus!, config: agentConfigIds[1]!, target: "bdr" as const, desc: "Manufacturing prospects respond better when outreach references specific industry challenges (e.g., supply chain disruption, quality control).", type: "process_change" as const, status: "pending" as const, priority: "medium" as const },
    { from: jake!, config: agentConfigIds[3]!, target: "ae" as const, desc: "Qualified leads are sitting too long before first AE contact. Can we auto-schedule intro calls when lead score > 70?", type: "process_change" as const, status: "pending" as const, priority: "high" as const },
  ];

  for (const fb of feedbackData) {
    await db.insert(schema.feedbackRequests).values({
      fromMemberId: fb.from.id,
      fromAgentConfigId: fb.config,
      targetRoleType: fb.target,
      description: fb.desc,
      requestType: fb.type,
      status: fb.status,
      priority: fb.priority,
      approvedByMemberId: fb.status === "approved" ? kate!.id : null,
      resolvedAt: fb.status === "approved" || fb.status === "auto_applied" ? daysAgo(randomBetween(1, 7)) : null,
    });
  }
  console.log("  ✓ Feedback requests");

  // ── Notifications ──
  const notificationData = [
    { member: sarah!, type: "deal_at_risk" as const, title: "Deal at Risk: NordicCare", message: "NordicCare deal has been in Technical Validation for 12 days. Average is 8 days. Consider scheduling follow-up.", dealIdx: 1, priority: "high" as const },
    { member: sarah!, type: "agent_recommendation" as const, title: "Suggested: Send ROI Analysis", message: "Based on HealthFirst discovery call, recommend sending customized ROI analysis highlighting claims processing automation.", dealIdx: 3, priority: "medium" as const },
    { member: sarah!, type: "stage_change" as const, title: "Meridian Capital → Closing", message: "Meridian Capital Partners deal has advanced to Closing stage. Contract review in progress.", dealIdx: 5, priority: "medium" as const },
    { member: marcus!, type: "deal_at_risk" as const, title: "Steelworks Proposal Review Delayed", message: "Steelworks Continental proposal has been pending internal review for 7 days. Recommend reaching out to champion.", dealIdx: 8, priority: "high" as const },
    { member: marcus!, type: "feedback_received" as const, title: "New Feedback from Rachel Torres", message: "Rachel (SA) suggests adding integration architecture diagrams to manufacturing proposals. See feedback request.", priority: "medium" as const },
    { member: priya!, type: "stage_change" as const, title: "DataStream → Closing", message: "DataStream Analytics has moved to Closing. PLG upgrade path confirmed — team already using Claude API.", dealIdx: 17, priority: "medium" as const },
    { member: priya!, type: "deal_at_risk" as const, title: "CyberShield Competitor Alert", message: "CyberShield Security evaluating Google Gemini. Recommend scheduling competitive differentiation call with SA.", dealIdx: 18, priority: "urgent" as const },
    { member: jake!, type: "approval_needed" as const, title: "Sequence Approval: Nordic Pulp Outreach", message: "AI-drafted outbound sequence for Nordic Pulp & Paper ready for review. 4-step email cadence targeting VP Manufacturing.", priority: "medium" as const },
    { member: amara!, type: "system_intelligence" as const, title: "High-Intent Lead Detected", message: "VitalSign Medical Devices showing high intent signals: 3 whitepaper downloads, pricing page visit, API docs browsing.", priority: "high" as const },
    { member: david!, type: "meeting_reminder" as const, title: "Technical Demo: HealthFirst Insurance", message: "Technical demo with HealthFirst Insurance engineering team scheduled for tomorrow at 14:00 CET.", dealIdx: 3, priority: "medium" as const },
    { member: david!, type: "handoff_request" as const, title: "SA Engagement: TrustBank Europe", message: "Sarah Chen requesting SA support for TrustBank Europe. Fraud detection use case needs technical deep-dive.", dealIdx: 6, priority: "high" as const },
    { member: rachel!, type: "agent_recommendation" as const, title: "Prep: CloudNine Technical Eval", message: "CloudNine SaaS entering technical validation. Recommend preparing Kubernetes integration demo and latency benchmarks.", dealIdx: 19, priority: "medium" as const },
    { member: kate!, type: "system_intelligence" as const, title: "Weekly Pipeline Summary", message: "Pipeline: €23.4M total, €7.5M in Commit. 3 deals at risk. Team at 78% of quarterly target.", priority: "medium" as const },
    { member: kate!, type: "deal_at_risk" as const, title: "2 Deals Approaching Close Date", message: "MedVista and Steelworks deals approaching close date with outstanding action items. Review recommended.", priority: "high" as const },
    { member: kate!, type: "feedback_received" as const, title: "3 Pending Feedback Requests", message: "3 feedback requests from team members awaiting review. 2 high priority items need attention.", priority: "medium" as const },
    { member: liam!, type: "system_intelligence" as const, title: "Onboarding: AlphaWealth Advisors", message: "AlphaWealth Advisors (Closed Won) ready for onboarding. CSM engagement recommended within 48 hours.", dealIdx: 7, priority: "high" as const },
    { member: liam!, type: "agent_recommendation" as const, title: "Expansion Opportunity: HomeStyle", message: "HomeStyle Interiors usage up 45% month-over-month. 3 new departments onboarded. Consider expansion conversation.", dealIdx: 16, priority: "medium" as const },
  ];

  for (const n of notificationData) {
    await db.insert(schema.notifications).values({
      teamMemberId: n.member.id,
      type: n.type,
      title: n.title,
      message: n.message,
      dealId: n.dealIdx !== undefined ? dealIds[n.dealIdx] : null,
      isRead: Math.random() > 0.6,
      priority: n.priority,
      createdAt: daysAgo(randomBetween(0, 5)),
    });
  }
  console.log("  ✓ Notifications");

  console.log("\n✅ Seed complete!");
  process.exit(0);
}

function generateTranscript(companyName: string, product: string): string {
  const productName = product === "claude_enterprise" ? "Claude Enterprise" : product === "claude_api" ? "Claude API" : "Claude Team";
  return `[00:00] Sarah Chen: Thanks for making time today, I appreciate you joining. I'd love to start by understanding what's driving your interest in ${productName}.

[00:45] Prospect: Sure, thanks Sarah. So at ${companyName}, we've been looking at ways to automate some of our more repetitive document processing workflows. We have a team of about 15 people who spend roughly half their day on this.

[01:30] Sarah Chen: That's significant. Can you walk me through what a typical day looks like for that team?

[02:15] Prospect: Absolutely. They're primarily reviewing incoming documents, extracting key data points, and entering them into our system. It's been our process for years, but with our growth rate, we just can't keep scaling the team linearly.

[03:00] Sarah Chen: I hear that a lot from companies at your stage. When you think about what success would look like in 6 months if we solved this, what metrics would you be tracking?

[03:45] Prospect: Great question. Primarily processing time per document — we'd love to cut that by at least 60%. And accuracy — our current error rate hovers around 3-4%, which creates downstream issues.

[04:30] Sarah Chen: Those are solid benchmarks. We've seen similar organizations achieve 70-80% reduction in processing time with ${productName}. Now, can you tell me about who else in the organization is involved in this decision?

[05:15] Prospect: Our CTO is the main sponsor. She's very keen on AI adoption. Our CFO will need to sign off on anything over €200K annually. And our Head of Engineering would lead the technical evaluation.

[06:00] Sarah Chen: Perfect, that's really helpful context. Let me ask about your current tech stack — what systems would ${productName} need to integrate with?

[06:45] Prospect: We're primarily on AWS, using a combination of Python services and React frontends. Our core data pipeline runs through PostgreSQL and we have a REST API layer.

[07:30] Sarah Chen: That's a great fit — our API is designed to integrate seamlessly with exactly that kind of architecture. What about compliance requirements? Are there specific regulations you need to adhere to?

[08:15] Prospect: Yes, that's actually one of our key concerns. We need GDPR compliance obviously, and depending on the use case, there might be industry-specific regulations as well.

[09:00] Sarah Chen: Understood. We take data handling very seriously — I'd love to get our Solutions Architect involved to walk through our security architecture in detail. Would that be valuable as a next step?

[09:45] Prospect: Definitely. That would address a lot of questions from our engineering team.

[10:15] Sarah Chen: Excellent. I'll set that up. One more question — have you looked at any other AI solutions for this use case?

[10:45] Prospect: We did a brief evaluation of OpenAI's offering, but we had some concerns about data privacy and the level of control we'd have. That's actually what drew us to Anthropic — your approach to safety and the enterprise controls.

[11:30] Sarah Chen: That's great to hear, and it's a common theme in our conversations. Let me summarize next steps: I'll schedule a technical deep-dive with our SA team, share our compliance documentation, and prepare a preliminary ROI analysis based on the metrics you mentioned. Does that sound right?

[12:00] Prospect: That sounds perfect. Looking forward to it.

[12:15] Sarah Chen: Wonderful. Thanks again for your time today — really exciting to explore how we can help ${companyName}.`;
}

seed().catch(console.error);
