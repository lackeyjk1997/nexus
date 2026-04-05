import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const client = postgres(process.env.DIRECT_URL!, { max: 1 });
const db = drizzle(client, { schema });

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function monthsAgo(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

function monthsFromNow(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d;
}

// ── Company IDs ──
const MERIDIAN_HEALTH_ID = "a0000001-0001-4000-8000-000000000001";
const PACIFIC_COAST_ID = "a0000001-0002-4000-8000-000000000002";
const BRIGHTPATH_ID = "a0000001-0003-4000-8000-000000000003";
const CASCADIA_ID = "a0000001-0004-4000-8000-000000000004";
const SUMMIT_GENOMICS_ID = "a0000001-0005-4000-8000-000000000005";
const REDWOOD_CAPITAL_ID = "a0000001-0006-4000-8000-000000000006";
const HARBOR_COMPLIANCE_ID = "a0000001-0007-4000-8000-000000000007";
const LIGHTHOUSE_ID = "a0000001-0008-4000-8000-000000000008";
const APEX_FINANCIAL_ID = "a0000001-0009-4000-8000-000000000009";
const CORNERSTONE_ID = "a0000001-000a-4000-8000-000000000010";
const VERTEX_PHARMA_ID = "a0000001-000b-4000-8000-000000000011";
const PINNACLE_BIOTECH_ID = "a0000001-000c-4000-8000-000000000012";
const GENEPATH_ID = "a0000001-000d-4000-8000-000000000013";
const ATLAS_RETAIL_ID = "a0000001-000e-4000-8000-000000000014";
const BRIGHTSIDE_ID = "a0000001-000f-4000-8000-000000000015";
const METRO_MARKET_ID = "a0000001-0010-4000-8000-000000000016";
const CASCADE_SUPPLY_ID = "a0000001-0011-4000-8000-000000000017";
const EVOLVE_RETAIL_ID = "a0000001-0012-4000-8000-000000000018";

// ── Contact IDs ──
const MERIDIAN_CONTACT_1_ID = "b0000001-0001-4000-8000-000000000001";
const MERIDIAN_CONTACT_2_ID = "b0000001-0001-4000-8000-000000000002";
const PACIFIC_CONTACT_1_ID = "b0000001-0002-4000-8000-000000000001";
const BRIGHTPATH_CONTACT_1_ID = "b0000001-0003-4000-8000-000000000001";
const CASCADIA_CONTACT_1_ID = "b0000001-0004-4000-8000-000000000001";
const SUMMIT_CONTACT_1_ID = "b0000001-0005-4000-8000-000000000001";
const REDWOOD_CONTACT_1_ID = "b0000001-0006-4000-8000-000000000001";
const HARBOR_CONTACT_1_ID = "b0000001-0007-4000-8000-000000000001";
const HARBOR_CONTACT_2_ID = "b0000001-0007-4000-8000-000000000002";
const LIGHTHOUSE_CONTACT_1_ID = "b0000001-0008-4000-8000-000000000001";
const APEX_CONTACT_1_ID = "b0000001-0009-4000-8000-000000000001";
const CORNERSTONE_CONTACT_1_ID = "b0000001-000a-4000-8000-000000000001";
const CORNERSTONE_CONTACT_2_ID = "b0000001-000a-4000-8000-000000000002";
const VERTEX_CONTACT_1_ID = "b0000001-000b-4000-8000-000000000001";
const PINNACLE_CONTACT_1_ID = "b0000001-000c-4000-8000-000000000001";
const GENEPATH_CONTACT_1_ID = "b0000001-000d-4000-8000-000000000001";
const ATLAS_CONTACT_1_ID = "b0000001-000e-4000-8000-000000000001";
const ATLAS_CONTACT_2_ID = "b0000001-000e-4000-8000-000000000002";
const BRIGHTSIDE_CONTACT_1_ID = "b0000001-000f-4000-8000-000000000001";
const METRO_CONTACT_1_ID = "b0000001-0010-4000-8000-000000000001";
const CASCADE_CONTACT_1_ID = "b0000001-0011-4000-8000-000000000001";
const EVOLVE_CONTACT_1_ID = "b0000001-0012-4000-8000-000000000001";

// ── Deal IDs ──
const MERIDIAN_DEAL_ID = "c0000001-0001-4000-8000-000000000001";
const PACIFIC_DEAL_ID = "c0000001-0002-4000-8000-000000000002";
const BRIGHTPATH_DEAL_ID = "c0000001-0003-4000-8000-000000000003";
const CASCADIA_DEAL_ID = "c0000001-0004-4000-8000-000000000004";
const SUMMIT_DEAL_ID = "c0000001-0005-4000-8000-000000000005";
const REDWOOD_DEAL_ID = "c0000001-0006-4000-8000-000000000006";
const HARBOR_DEAL_ID = "c0000001-0007-4000-8000-000000000007";
const LIGHTHOUSE_DEAL_ID = "c0000001-0008-4000-8000-000000000008";
const APEX_DEAL_ID = "c0000001-0009-4000-8000-000000000009";
const CORNERSTONE_DEAL_ID = "c0000001-000a-4000-8000-000000000010";
const VERTEX_DEAL_ID = "c0000001-000b-4000-8000-000000000011";
const PINNACLE_DEAL_ID = "c0000001-000c-4000-8000-000000000012";
const GENEPATH_DEAL_ID = "c0000001-000d-4000-8000-000000000013";
const ATLAS_DEAL_ID = "c0000001-000e-4000-8000-000000000014";
const BRIGHTSIDE_DEAL_ID = "c0000001-000f-4000-8000-000000000015";
const METRO_DEAL_ID = "c0000001-0010-4000-8000-000000000016";
const CASCADE_DEAL_ID = "c0000001-0011-4000-8000-000000000017";
const EVOLVE_DEAL_ID = "c0000001-0012-4000-8000-000000000018";

// ── Knowledge Article IDs ──
const KB_HEALTHCARE_API_ID = "d0000001-0001-4000-8000-000000000001";
const KB_FINSERV_CODE_ID = "d0000001-0002-4000-8000-000000000002";
const KB_RATE_LIMITS_ID = "d0000001-0003-4000-8000-000000000003";
const KB_GDPR_ID = "d0000001-0004-4000-8000-000000000004";
const KB_MULTI_DEPT_ID = "d0000001-0005-4000-8000-000000000005";
const KB_ONBOARDING_ID = "d0000001-0006-4000-8000-000000000006";
const KB_ADOPTION_ID = "d0000001-0007-4000-8000-000000000007";
const KB_PROMPT_WORKSHOP_ID = "d0000001-0008-4000-8000-000000000008";
const KB_EXEC_SPONSOR_ID = "d0000001-0009-4000-8000-000000000009";
const KB_HEALTHCARE_PATTERNS_ID = "d0000001-000a-4000-8000-000000000010";
const KB_FINSERV_COMPLIANCE_ID = "d0000001-000b-4000-8000-000000000011";
const KB_COWORK_NONTECH_ID = "d0000001-000c-4000-8000-000000000012";
const KB_RESOLUTION_LATENCY_ID = "d0000001-000d-4000-8000-000000000013";
const KB_RESOLUTION_STAKEHOLDER_ID = "d0000001-000e-4000-8000-000000000014";
const KB_RESOLUTION_LIMS_ID = "d0000001-000f-4000-8000-000000000015";

async function seedBook() {
  console.log("📚 Seeding post-sale book of business...\n");

  // ── Get Sarah Chen's ID ──
  const allMembers = await db.select().from(schema.teamMembers);
  const sarah = allMembers.find((m) => m.name === "Sarah Chen");
  if (!sarah) {
    console.error("❌ Sarah Chen not found in team_members. Run seed-org.ts first.");
    process.exit(1);
  }
  const SARAH_ID = sarah.id;
  console.log(`  Found Sarah Chen: ${SARAH_ID}`);

  // ══════════════════════════════════════════════════════
  // STEP 1: Insert 18 companies
  // ══════════════════════════════════════════════════════
  console.log("\n📋 Inserting companies...");

  const companies = [
    { id: MERIDIAN_HEALTH_ID, name: "Meridian Health Network", domain: "meridianhealth.com", industry: "healthcare" as const, employeeCount: 1200, annualRevenue: "$380M", hqLocation: "Portland, OR", techStack: ["Epic EHR", "Azure", "Python", "React"], description: "Regional hospital network operating 8 facilities across the Pacific Northwest, specializing in integrated care delivery and population health management." },
    { id: PACIFIC_COAST_ID, name: "Pacific Coast Medical Group", domain: "pacificcoastmed.com", industry: "healthcare" as const, employeeCount: 800, annualRevenue: "$210M", hqLocation: "San Diego, CA", techStack: ["Cerner", "AWS", "Java", ".NET"], description: "Multi-specialty medical group with 120 physicians across 15 locations, focused on value-based care models and patient engagement." },
    { id: BRIGHTPATH_ID, name: "BrightPath Diagnostics", domain: "brightpathdiag.com", industry: "healthcare" as const, employeeCount: 600, annualRevenue: "$145M", hqLocation: "Boston, MA", techStack: ["Custom LIMS", "AWS", "Python", "PostgreSQL"], description: "Clinical diagnostics laboratory chain operating 12 facilities, processing over 2 million tests annually with a focus on molecular diagnostics." },
    { id: CASCADIA_ID, name: "Cascadia Life Sciences", domain: "cascadialifesci.com", industry: "healthcare" as const, employeeCount: 500, annualRevenue: "$120M", hqLocation: "Seattle, WA", techStack: ["AWS", "Python", "R", "Snowflake"], description: "Biotech research company specializing in genomics and precision medicine, with active clinical trials in oncology and rare diseases." },
    { id: SUMMIT_GENOMICS_ID, name: "Summit Genomics", domain: "summitgenomics.com", industry: "healthcare" as const, employeeCount: 400, annualRevenue: "$85M", hqLocation: "Boulder, CO", techStack: ["GCP", "Python", "TensorFlow", "BigQuery"], description: "Precision medicine company focused on next-generation gene sequencing and bioinformatics, serving both clinical and research markets." },
    { id: REDWOOD_CAPITAL_ID, name: "Redwood Capital Partners", domain: "redwoodcap.com", industry: "financial_services" as const, employeeCount: 900, annualRevenue: "$290M", hqLocation: "San Francisco, CA", techStack: ["Bloomberg", "Python", "React", "AWS"], description: "Private equity and wealth management firm with $12B AUM, serving high-net-worth individuals and institutional investors across North America." },
    { id: HARBOR_COMPLIANCE_ID, name: "Harbor Compliance Group", domain: "harborcompliance.com", industry: "financial_services" as const, employeeCount: 1500, annualRevenue: "$420M", hqLocation: "New York, NY", techStack: ["Salesforce", "Python", ".NET", "Azure"], description: "Regulatory compliance consulting firm serving financial institutions, providing automated compliance monitoring and reporting across 50 states." },
    { id: LIGHTHOUSE_ID, name: "Lighthouse Insurance", domain: "lighthouseins.com", industry: "financial_services" as const, employeeCount: 1100, annualRevenue: "$340M", hqLocation: "Hartford, CT", techStack: ["Guidewire", "Java", "AWS", "Tableau"], description: "Mid-market commercial insurance carrier specializing in professional liability, D&O, and cyber insurance for technology companies." },
    { id: APEX_FINANCIAL_ID, name: "Apex Financial Analytics", domain: "apexfinancial.com", industry: "financial_services" as const, employeeCount: 500, annualRevenue: "$95M", hqLocation: "Chicago, IL", techStack: ["Python", "Snowflake", "React", "AWS"], description: "Financial data analytics platform providing real-time risk analysis and portfolio optimization tools for mid-market investment firms." },
    { id: CORNERSTONE_ID, name: "Cornerstone Banking", domain: "cornerstonebank.com", industry: "financial_services" as const, employeeCount: 2000, annualRevenue: "$580M", hqLocation: "Charlotte, NC", techStack: ["FIS", "Java", "Oracle", "React"], description: "Regional bank operating 40 branches across the Southeast, with growing digital banking and commercial lending divisions." },
    { id: VERTEX_PHARMA_ID, name: "Vertex Pharmaceuticals R&D", domain: "vertexpharma-rd.com", industry: "technology" as const, employeeCount: 700, annualRevenue: "$190M", hqLocation: "Cambridge, MA", techStack: ["AWS", "Python", "R", "SAS", "Benchling"], description: "Pharmaceutical R&D division focused on clinical trials management and drug discovery, leveraging AI for protocol analysis and literature review." },
    { id: PINNACLE_BIOTECH_ID, name: "Pinnacle Biotech", domain: "pinnaclebiotech.com", industry: "technology" as const, employeeCount: 550, annualRevenue: "$130M", hqLocation: "San Diego, CA", techStack: ["Custom LIMS", "Python", "Docker", "AWS"], description: "Biotech company specializing in lab automation and high-throughput screening, with proprietary LIMS integration for sample management." },
    { id: GENEPATH_ID, name: "GenePath Analytics", domain: "genepathanalytics.com", industry: "technology" as const, employeeCount: 400, annualRevenue: "$75M", hqLocation: "Durham, NC", techStack: ["GCP", "Python", "TensorFlow", "BigQuery"], description: "Genomic data analysis SaaS platform serving academic medical centers and clinical research organizations with variant interpretation tools." },
    { id: ATLAS_RETAIL_ID, name: "Atlas Retail Group", domain: "atlasretail.com", industry: "retail" as const, employeeCount: 1800, annualRevenue: "$620M", hqLocation: "Dallas, TX", techStack: ["Shopify Plus", "React", "Node.js", "GCP"], description: "Multi-brand retail holding company operating 6 consumer brands across fashion, home goods, and outdoor equipment, with 200+ retail locations." },
    { id: BRIGHTSIDE_ID, name: "Brightside Commerce", domain: "brightsidecommerce.com", industry: "retail" as const, employeeCount: 900, annualRevenue: "$240M", hqLocation: "Austin, TX", techStack: ["Shopify", "React", "Node.js", "AWS"], description: "Direct-to-consumer e-commerce platform powering 50+ brands with fulfillment, personalization, and subscription management." },
    { id: METRO_MARKET_ID, name: "Metro Market Analytics", domain: "metromarket.com", industry: "retail" as const, employeeCount: 500, annualRevenue: "$85M", hqLocation: "Minneapolis, MN", techStack: ["Python", "Snowflake", "React", "AWS"], description: "Retail analytics and consumer insights company providing foot traffic analysis, competitive benchmarking, and demand forecasting." },
    { id: CASCADE_SUPPLY_ID, name: "Cascade Supply Chain", domain: "cascadesupply.com", industry: "retail" as const, employeeCount: 1200, annualRevenue: "$350M", hqLocation: "Seattle, WA", techStack: ["SAP", "Python", "React", "Azure"], description: "Supply chain management and logistics optimization company serving mid-market retailers with warehouse management and demand planning." },
    { id: EVOLVE_RETAIL_ID, name: "Evolve Retail Tech", domain: "evolveretail.com", industry: "retail" as const, employeeCount: 700, annualRevenue: "$165M", hqLocation: "Denver, CO", techStack: ["React", "Node.js", "PostgreSQL", "AWS"], description: "Retail technology solutions provider offering POS systems, inventory management, and omnichannel commerce tools for mid-market retailers." },
  ];

  await db.insert(schema.companies).values(companies);
  console.log(`  ✓ Inserted ${companies.length} companies`);

  // ══════════════════════════════════════════════════════
  // STEP 2: Insert contacts
  // ══════════════════════════════════════════════════════
  console.log("\n👤 Inserting contacts...");

  const contacts = [
    // Meridian Health (2 contacts)
    { id: MERIDIAN_CONTACT_1_ID, firstName: "James", lastName: "Chen", email: "j.chen@meridianhealth.com", title: "Chief Digital Officer", companyId: MERIDIAN_HEALTH_ID, roleInDeal: "economic_buyer" as const, isPrimary: true },
    { id: MERIDIAN_CONTACT_2_ID, firstName: "Karen", lastName: "Liu", email: "k.liu@meridianhealth.com", title: "VP of Clinical Informatics", companyId: MERIDIAN_HEALTH_ID, roleInDeal: "champion" as const, isPrimary: false },
    // Pacific Coast Medical
    { id: PACIFIC_CONTACT_1_ID, firstName: "Sarah", lastName: "Martinez", email: "s.martinez@pacificcoastmed.com", title: "Chief Medical Information Officer", companyId: PACIFIC_COAST_ID, roleInDeal: "economic_buyer" as const, isPrimary: true },
    // BrightPath Diagnostics
    { id: BRIGHTPATH_CONTACT_1_ID, firstName: "David", lastName: "Okafor", email: "d.okafor@brightpathdiag.com", title: "Director of Lab Informatics", companyId: BRIGHTPATH_ID, roleInDeal: "champion" as const, isPrimary: true },
    // Cascadia Life Sciences
    { id: CASCADIA_CONTACT_1_ID, firstName: "Kevin", lastName: "Wu", email: "k.wu@cascadialifesci.com", title: "Data Engineering Lead", companyId: CASCADIA_ID, roleInDeal: "technical_evaluator" as const, isPrimary: true },
    // Summit Genomics
    { id: SUMMIT_CONTACT_1_ID, firstName: "Priya", lastName: "Nair", email: "p.nair@summitgenomics.com", title: "Head of Bioinformatics", companyId: SUMMIT_GENOMICS_ID, roleInDeal: "champion" as const, isPrimary: true },
    // Redwood Capital Partners
    { id: REDWOOD_CONTACT_1_ID, firstName: "Michael", lastName: "Torres", email: "m.torres@redwoodcap.com", title: "Managing Director", companyId: REDWOOD_CAPITAL_ID, roleInDeal: "economic_buyer" as const, isPrimary: true },
    // Harbor Compliance Group (2 contacts)
    { id: HARBOR_CONTACT_1_ID, firstName: "Amanda", lastName: "Chen", email: "a.chen@harborcompliance.com", title: "Chief Operating Officer", companyId: HARBOR_COMPLIANCE_ID, roleInDeal: "economic_buyer" as const, isPrimary: true },
    { id: HARBOR_CONTACT_2_ID, firstName: "David", lastName: "Liu", email: "d.liu@harborcompliance.com", title: "Former VP of Compliance", companyId: HARBOR_COMPLIANCE_ID, roleInDeal: "champion" as const, isPrimary: false },
    // Lighthouse Insurance
    { id: LIGHTHOUSE_CONTACT_1_ID, firstName: "Lisa", lastName: "Park", email: "l.park@lighthouseins.com", title: "Compliance Director", companyId: LIGHTHOUSE_ID, roleInDeal: "champion" as const, isPrimary: true },
    // Apex Financial Analytics
    { id: APEX_CONTACT_1_ID, firstName: "Jason", lastName: "Reed", email: "j.reed@apexfinancial.com", title: "Head of Engineering", companyId: APEX_FINANCIAL_ID, roleInDeal: "technical_evaluator" as const, isPrimary: true },
    // Cornerstone Banking (2 contacts)
    { id: CORNERSTONE_CONTACT_1_ID, firstName: "Sarah", lastName: "Williams", email: "s.williams@cornerstonebank.com", title: "Head of Digital Transformation", companyId: CORNERSTONE_ID, roleInDeal: "champion" as const, isPrimary: true },
    { id: CORNERSTONE_CONTACT_2_ID, firstName: "Robert", lastName: "Franklin", email: "r.franklin@cornerstonebank.com", title: "Chief Technology Officer", companyId: CORNERSTONE_ID, roleInDeal: "economic_buyer" as const, isPrimary: false },
    // Vertex Pharmaceuticals R&D
    { id: VERTEX_CONTACT_1_ID, firstName: "Raj", lastName: "Patel", email: "r.patel@vertexpharma-rd.com", title: "Research Director", companyId: VERTEX_PHARMA_ID, roleInDeal: "champion" as const, isPrimary: true },
    // Pinnacle Biotech
    { id: PINNACLE_CONTACT_1_ID, firstName: "Jake", lastName: "Morrison", email: "j.morrison@pinnaclebiotech.com", title: "VP Engineering", companyId: PINNACLE_BIOTECH_ID, roleInDeal: "technical_evaluator" as const, isPrimary: true },
    // GenePath Analytics
    { id: GENEPATH_CONTACT_1_ID, firstName: "Emily", lastName: "Tran", email: "e.tran@genepathanalytics.com", title: "CTO", companyId: GENEPATH_ID, roleInDeal: "economic_buyer" as const, isPrimary: true },
    // Atlas Retail Group (2 contacts)
    { id: ATLAS_CONTACT_1_ID, firstName: "Maria", lastName: "Santos", email: "m.santos@atlasretail.com", title: "Director of Operations", companyId: ATLAS_RETAIL_ID, roleInDeal: "champion" as const, isPrimary: true },
    { id: ATLAS_CONTACT_2_ID, firstName: "Chris", lastName: "Bennett", email: "c.bennett@atlasretail.com", title: "VP of Technology", companyId: ATLAS_RETAIL_ID, roleInDeal: "economic_buyer" as const, isPrimary: false },
    // Brightside Commerce
    { id: BRIGHTSIDE_CONTACT_1_ID, firstName: "Lauren", lastName: "Hayes", email: "l.hayes@brightsidecommerce.com", title: "VP of Engineering", companyId: BRIGHTSIDE_ID, roleInDeal: "technical_evaluator" as const, isPrimary: true },
    // Metro Market Analytics
    { id: METRO_CONTACT_1_ID, firstName: "Daniel", lastName: "Kim", email: "d.kim@metromarket.com", title: "Head of Data Science", companyId: METRO_MARKET_ID, roleInDeal: "champion" as const, isPrimary: true },
    // Cascade Supply Chain
    { id: CASCADE_CONTACT_1_ID, firstName: "Tom", lastName: "Harris", email: "t.harris@cascadesupply.com", title: "Chief Technology Officer", companyId: CASCADE_SUPPLY_ID, roleInDeal: "economic_buyer" as const, isPrimary: true },
    // Evolve Retail Tech
    { id: EVOLVE_CONTACT_1_ID, firstName: "Rachel", lastName: "Kim", email: "r.kim@evolveretail.com", title: "VP Product", companyId: EVOLVE_RETAIL_ID, roleInDeal: "champion" as const, isPrimary: true },
  ];

  await db.insert(schema.contacts).values(contacts);
  console.log(`  ✓ Inserted ${contacts.length} contacts`);

  // ══════════════════════════════════════════════════════
  // STEP 3: Insert 18 closed_won deals
  // ══════════════════════════════════════════════════════
  console.log("\n💰 Inserting closed-won deals...");

  const deals = [
    { id: MERIDIAN_DEAL_ID, name: "Meridian Health - Claude API Enterprise", companyId: MERIDIAN_HEALTH_ID, primaryContactId: MERIDIAN_CONTACT_1_ID, assignedAeId: SARAH_ID, stage: "closed_won" as const, dealValue: "420000", vertical: "healthcare" as const, product: "claude_api" as const, winProbability: 100, forecastCategory: "closed" as const, leadSource: "inbound" as const, closeDate: monthsAgo(6), closedAt: monthsAgo(6) },
    { id: PACIFIC_DEAL_ID, name: "Pacific Coast Medical - Claude API Platform", companyId: PACIFIC_COAST_ID, primaryContactId: PACIFIC_CONTACT_1_ID, assignedAeId: SARAH_ID, stage: "closed_won" as const, dealValue: "280000", vertical: "healthcare" as const, product: "claude_api" as const, winProbability: 100, forecastCategory: "closed" as const, leadSource: "outbound" as const, closeDate: monthsAgo(10), closedAt: monthsAgo(10) },
    { id: BRIGHTPATH_DEAL_ID, name: "BrightPath Diagnostics - Claude API Integration", companyId: BRIGHTPATH_ID, primaryContactId: BRIGHTPATH_CONTACT_1_ID, assignedAeId: SARAH_ID, stage: "closed_won" as const, dealValue: "195000", vertical: "healthcare" as const, product: "claude_api" as const, winProbability: 100, forecastCategory: "closed" as const, leadSource: "inbound" as const, closeDate: monthsAgo(8), closedAt: monthsAgo(8) },
    { id: CASCADIA_DEAL_ID, name: "Cascadia Life Sciences - Claude API + Code", companyId: CASCADIA_ID, primaryContactId: CASCADIA_CONTACT_1_ID, assignedAeId: SARAH_ID, stage: "closed_won" as const, dealValue: "340000", vertical: "healthcare" as const, product: "claude_api" as const, winProbability: 100, forecastCategory: "closed" as const, leadSource: "partner" as const, closeDate: daysAgo(21), closedAt: daysAgo(21) },
    { id: SUMMIT_DEAL_ID, name: "Summit Genomics - Claude API for Bioinformatics", companyId: SUMMIT_GENOMICS_ID, primaryContactId: SUMMIT_CONTACT_1_ID, assignedAeId: SARAH_ID, stage: "closed_won" as const, dealValue: "150000", vertical: "healthcare" as const, product: "claude_api" as const, winProbability: 100, forecastCategory: "closed" as const, leadSource: "inbound" as const, closeDate: monthsAgo(5), closedAt: monthsAgo(5) },
    { id: REDWOOD_DEAL_ID, name: "Redwood Capital - Claude API + Code for Research", companyId: REDWOOD_CAPITAL_ID, primaryContactId: REDWOOD_CONTACT_1_ID, assignedAeId: SARAH_ID, stage: "closed_won" as const, dealValue: "380000", vertical: "financial_services" as const, product: "claude_api" as const, winProbability: 100, forecastCategory: "closed" as const, leadSource: "outbound" as const, closeDate: monthsAgo(7), closedAt: monthsAgo(7) },
    { id: HARBOR_DEAL_ID, name: "Harbor Compliance - Claude Enterprise Platform", companyId: HARBOR_COMPLIANCE_ID, primaryContactId: HARBOR_CONTACT_2_ID, assignedAeId: SARAH_ID, stage: "closed_won" as const, dealValue: "520000", vertical: "financial_services" as const, product: "claude_enterprise" as const, winProbability: 100, forecastCategory: "closed" as const, leadSource: "inbound" as const, closeDate: monthsAgo(9), closedAt: monthsAgo(9) },
    { id: LIGHTHOUSE_DEAL_ID, name: "Lighthouse Insurance - Claude API for Compliance", companyId: LIGHTHOUSE_ID, primaryContactId: LIGHTHOUSE_CONTACT_1_ID, assignedAeId: SARAH_ID, stage: "closed_won" as const, dealValue: "290000", vertical: "financial_services" as const, product: "claude_api" as const, winProbability: 100, forecastCategory: "closed" as const, leadSource: "inbound" as const, closeDate: monthsAgo(10), closedAt: monthsAgo(10) },
    { id: APEX_DEAL_ID, name: "Apex Financial - Claude API for Risk Analysis", companyId: APEX_FINANCIAL_ID, primaryContactId: APEX_CONTACT_1_ID, assignedAeId: SARAH_ID, stage: "closed_won" as const, dealValue: "180000", vertical: "financial_services" as const, product: "claude_api" as const, winProbability: 100, forecastCategory: "closed" as const, leadSource: "partner" as const, closeDate: monthsAgo(3), closedAt: monthsAgo(3) },
    { id: CORNERSTONE_DEAL_ID, name: "Cornerstone Banking - Claude API + Code", companyId: CORNERSTONE_ID, primaryContactId: CORNERSTONE_CONTACT_1_ID, assignedAeId: SARAH_ID, stage: "closed_won" as const, dealValue: "440000", vertical: "financial_services" as const, product: "claude_api" as const, winProbability: 100, forecastCategory: "closed" as const, leadSource: "inbound" as const, closeDate: monthsAgo(4), closedAt: monthsAgo(4) },
    { id: VERTEX_DEAL_ID, name: "Vertex Pharma R&D - Claude API for Clinical Trials", companyId: VERTEX_PHARMA_ID, primaryContactId: VERTEX_CONTACT_1_ID, assignedAeId: SARAH_ID, stage: "closed_won" as const, dealValue: "310000", vertical: "technology" as const, product: "claude_api" as const, winProbability: 100, forecastCategory: "closed" as const, leadSource: "inbound" as const, closeDate: monthsAgo(6), closedAt: monthsAgo(6) },
    { id: PINNACLE_DEAL_ID, name: "Pinnacle Biotech - Claude API for Lab Automation", companyId: PINNACLE_BIOTECH_ID, primaryContactId: PINNACLE_CONTACT_1_ID, assignedAeId: SARAH_ID, stage: "closed_won" as const, dealValue: "240000", vertical: "technology" as const, product: "claude_api" as const, winProbability: 100, forecastCategory: "closed" as const, leadSource: "outbound" as const, closeDate: daysAgo(28), closedAt: daysAgo(28) },
    { id: GENEPATH_DEAL_ID, name: "GenePath Analytics - Claude API for Variant Analysis", companyId: GENEPATH_ID, primaryContactId: GENEPATH_CONTACT_1_ID, assignedAeId: SARAH_ID, stage: "closed_won" as const, dealValue: "175000", vertical: "technology" as const, product: "claude_api" as const, winProbability: 100, forecastCategory: "closed" as const, leadSource: "inbound" as const, closeDate: monthsAgo(5), closedAt: monthsAgo(5) },
    { id: ATLAS_DEAL_ID, name: "Atlas Retail Group - Claude API for Operations", companyId: ATLAS_RETAIL_ID, primaryContactId: ATLAS_CONTACT_1_ID, assignedAeId: SARAH_ID, stage: "closed_won" as const, dealValue: "350000", vertical: "retail" as const, product: "claude_api" as const, winProbability: 100, forecastCategory: "closed" as const, leadSource: "partner" as const, closeDate: monthsAgo(7), closedAt: monthsAgo(7) },
    { id: BRIGHTSIDE_DEAL_ID, name: "Brightside Commerce - Claude API for Personalization", companyId: BRIGHTSIDE_ID, primaryContactId: BRIGHTSIDE_CONTACT_1_ID, assignedAeId: SARAH_ID, stage: "closed_won" as const, dealValue: "260000", vertical: "retail" as const, product: "claude_api" as const, winProbability: 100, forecastCategory: "closed" as const, leadSource: "inbound" as const, closeDate: monthsAgo(8), closedAt: monthsAgo(8) },
    { id: METRO_DEAL_ID, name: "Metro Market Analytics - Claude API for Insights", companyId: METRO_MARKET_ID, primaryContactId: METRO_CONTACT_1_ID, assignedAeId: SARAH_ID, stage: "closed_won" as const, dealValue: "190000", vertical: "retail" as const, product: "claude_api" as const, winProbability: 100, forecastCategory: "closed" as const, leadSource: "inbound" as const, closeDate: monthsAgo(4), closedAt: monthsAgo(4) },
    { id: CASCADE_DEAL_ID, name: "Cascade Supply Chain - Claude API + Code for Logistics", companyId: CASCADE_SUPPLY_ID, primaryContactId: CASCADE_CONTACT_1_ID, assignedAeId: SARAH_ID, stage: "closed_won" as const, dealValue: "420000", vertical: "retail" as const, product: "claude_api" as const, winProbability: 100, forecastCategory: "closed" as const, leadSource: "outbound" as const, closeDate: monthsAgo(8), closedAt: monthsAgo(8) },
    { id: EVOLVE_DEAL_ID, name: "Evolve Retail Tech - Claude API Platform", companyId: EVOLVE_RETAIL_ID, primaryContactId: EVOLVE_CONTACT_1_ID, assignedAeId: SARAH_ID, stage: "closed_won" as const, dealValue: "280000", vertical: "retail" as const, product: "claude_api" as const, winProbability: 100, forecastCategory: "closed" as const, leadSource: "inbound" as const, closeDate: monthsAgo(5), closedAt: monthsAgo(5) },
  ];

  await db.insert(schema.deals).values(deals);
  console.log(`  ✓ Inserted ${deals.length} closed-won deals`);

  // ══════════════════════════════════════════════════════
  // STEP 4: Insert 18 account_health records
  // ══════════════════════════════════════════════════════
  console.log("\n🏥 Inserting account health records...");

  const healthRecords = [
    {
      companyId: MERIDIAN_HEALTH_ID, dealId: MERIDIAN_DEAL_ID,
      healthScore: 85, healthTrend: "stable", contractStatus: "active",
      arr: "420000", productsPurchased: ["claude_api"],
      healthFactors: { adoption: 88, engagement: 82, sentiment: 85, support_health: 90 },
      usageMetrics: { api_calls_30d: 52000, trend_pct: 5, seats_active: 18, seats_total: 20 },
      lastTouchDate: daysAgo(5), daysSinceTouch: 5,
      contractStart: monthsAgo(6), renewalDate: monthsFromNow(8),
      keyStakeholders: [
        { name: "Dr. James Chen", title: "Chief Digital Officer", status: "engaged" },
        { name: "Karen Liu", title: "VP Clinical Informatics", status: "engaged" },
      ],
      expansionSignals: [{ signal: "API usage growing 5% MoM", confidence: 0.7, product: "claude_code", details: "Engineering team expressing interest in Claude Code for internal tools" }],
      riskSignals: [],
      contractedUseCases: null, expansionMap: null, proactiveSignals: null,
      nextQbrDate: monthsFromNow(2), onboardingComplete: true,
    },
    {
      companyId: PACIFIC_COAST_ID, dealId: PACIFIC_DEAL_ID,
      healthScore: 62, healthTrend: "declining", contractStatus: "renewal_window",
      arr: "280000", productsPurchased: ["claude_api"],
      healthFactors: { adoption: 55, engagement: 50, sentiment: 68, support_health: 75 },
      usageMetrics: { api_calls_30d: 18000, trend_pct: -23, seats_active: 8, seats_total: 20 },
      lastTouchDate: daysAgo(18), daysSinceTouch: 18,
      contractStart: monthsAgo(10), renewalDate: daysFromNow(45),
      keyStakeholders: [
        { name: "Dr. Sarah Martinez", title: "Chief Medical Information Officer", status: "engaged" },
      ],
      expansionSignals: [],
      riskSignals: [
        { signal: "API usage declined 23% in last 30 days", severity: "high", detected_at: daysAgo(7).toISOString() },
        { signal: "Renewal in 45 days with declining engagement", severity: "high", detected_at: daysAgo(3).toISOString() },
      ],
      contractedUseCases: [
        { team: "Clinical Documentation", seats: 20, product: "Claude API", useCase: "Medical note summarization and coding", expectedOutcome: "40% reduction in documentation time per encounter", adoptionStatus: "needs_attention", activeUsers: 11, notes: "Adoption plateaued at 55%. Physicians prefer existing EHR workflows." },
        { team: "Quality & Compliance", seats: 8, product: "Claude API", useCase: "Audit preparation and compliance checking", expectedOutcome: "Automated pre-audit compliance reports", adoptionStatus: "on_track", activeUsers: 7, notes: "Strong champion in quality director. Planning to present ROI at board meeting." },
      ],
      expansionMap: [
        { department: "Administration", headcount: 60, currentProduct: null, recommendedProduct: "Cowork", opportunityArr: 18000, rationale: "Scheduling, patient communications, insurance verification workflows." },
        { department: "Research", headcount: 15, currentProduct: null, recommendedProduct: "Claude Code", opportunityArr: 22500, rationale: "Clinical research data analysis, literature reviews, grant application drafting." },
      ],
      proactiveSignals: [
        { type: "industry_news", signal: "CMS announced expanded documentation requirements for Medicare reimbursement", relevance: "Pacific Coast's clinical documentation team will face increased workload", action: "Position Claude as scaling solution — schedule check-in with CMIO", daysAgo: 15 },
      ],
      similarSituations: [
        {
          accountName: "Meridian Health Network",
          vertical: "Healthcare",
          situation: "Clinical documentation adoption plateaued at 50% — physicians were comfortable with existing EHR workflows and saw Claude as extra work rather than a time saver.",
          resolution: "Identified the 3 highest-volume physicians and ran a timed comparison: documenting with Claude vs. their current EHR-only workflow. Results showed 35% time savings. Shared results in a 10-minute department meeting with video walkthrough.",
          outcome: "Adoption jumped from 50% to 80% within 3 weeks. Physicians responded to peer proof, not vendor claims.",
          relevance: "Pacific Coast has the same plateau at 55%. Physician adoption requires peer-driven evidence, not top-down mandates.",
        },
      ],
      recommendedResources: [
        {
          title: "Claude for Healthcare: Implementation Patterns",
          type: "implementation_guide",
          relevance: "Pacific Coast's clinical documentation team needs workflow patterns specific to their medical specialty mix.",
          keySection: "The specialty-specific documentation templates and EHR integration patterns",
        },
        {
          title: "Driving Adoption Beyond the Initial Team",
          type: "best_practice",
          relevance: "The quality & compliance team (7/8 active) is a success story. Use it to drive adoption in the clinical documentation team.",
          keySection: "Cross-department proof points and internal case study development",
        },
      ],
      nextQbrDate: daysFromNow(14), onboardingComplete: true,
    },
    {
      companyId: BRIGHTPATH_ID, dealId: BRIGHTPATH_DEAL_ID,
      healthScore: 78, healthTrend: "stable", contractStatus: "active",
      arr: "195000", productsPurchased: ["claude_api"],
      healthFactors: { adoption: 75, engagement: 72, sentiment: 80, support_health: 85 },
      usageMetrics: { api_calls_30d: 28000, trend_pct: 2, seats_active: 10, seats_total: 12 },
      lastTouchDate: daysAgo(12), daysSinceTouch: 12,
      contractStart: monthsAgo(8), renewalDate: monthsFromNow(6),
      keyStakeholders: [
        { name: "David Okafor", title: "Director of Lab Informatics", status: "engaged" },
      ],
      expansionSignals: [],
      riskSignals: [],
      contractedUseCases: null, expansionMap: null, proactiveSignals: null,
      nextQbrDate: monthsFromNow(3), onboardingComplete: true,
    },
    {
      companyId: CASCADIA_ID, dealId: CASCADIA_DEAL_ID,
      healthScore: 72, healthTrend: "declining", contractStatus: "onboarding",
      arr: "340000", productsPurchased: ["claude_api", "claude_code"],
      healthFactors: { adoption: 35, engagement: 60, sentiment: 72, support_health: 80 },
      usageMetrics: { api_calls_30d: 3200, trend_pct: -5, seats_active: 2, seats_total: 8 },
      lastTouchDate: daysAgo(8), daysSinceTouch: 8,
      contractStart: daysAgo(21), renewalDate: monthsFromNow(11),
      keyStakeholders: [
        { name: "Kevin Wu", title: "Data Engineering Lead", status: "engaged" },
      ],
      expansionSignals: [],
      riskSignals: [
        { signal: "Only 2 of 8 seats active after 3 weeks", severity: "medium", detected_at: daysAgo(5).toISOString() },
      ],
      contractedUseCases: [
        { team: "Data Science", seats: 12, product: "Claude API", useCase: "Experimental data analysis and visualization", expectedOutcome: "Automated statistical analysis of lab results", adoptionStatus: "needs_attention", activeUsers: 4, notes: "Only 2 of 8 data scientists using regularly. Team lead Kevin Wu asking for help." },
        { team: "Research", seats: 8, product: "Claude Code", useCase: "Lab automation scripts and data pipelines", expectedOutcome: "Reduce manual data entry by 80%", adoptionStatus: "needs_attention", activeUsers: 2, notes: "Early days. Team needs hands-on training before adoption will grow." },
      ],
      expansionMap: [
        { department: "Quality Assurance", headcount: 20, currentProduct: null, recommendedProduct: "Cowork", opportunityArr: 6000, rationale: "QA documentation, test protocol management, compliance tracking." },
      ],
      proactiveSignals: [
        { type: "product_release", signal: "Claude Code added Jupyter notebook integration", relevance: "Directly relevant for Cascadia's data science team — could accelerate adoption", action: "Share with Kevin Wu as a reason to re-engage his team", daysAgo: 11 },
      ],
      nextQbrDate: monthsFromNow(1), onboardingComplete: false,
    },
    {
      companyId: SUMMIT_GENOMICS_ID, dealId: SUMMIT_DEAL_ID,
      healthScore: 90, healthTrend: "improving", contractStatus: "active",
      arr: "150000", productsPurchased: ["claude_api"],
      healthFactors: { adoption: 95, engagement: 92, sentiment: 90, support_health: 88 },
      usageMetrics: { api_calls_30d: 41000, trend_pct: 18, seats_active: 8, seats_total: 8 },
      lastTouchDate: daysAgo(3), daysSinceTouch: 3,
      contractStart: monthsAgo(5), renewalDate: monthsFromNow(7),
      keyStakeholders: [
        { name: "Dr. Priya Nair", title: "Head of Bioinformatics", status: "engaged" },
      ],
      expansionSignals: [
        { signal: "100% seat utilization, requesting additional seats", confidence: 0.9, product: "claude_api", details: "Clinical team wants access for patient report generation" },
        { signal: "Asking about Claude Code for pipeline automation", confidence: 0.7, product: "claude_code", details: "Bioinformatics team building custom analysis pipelines" },
      ],
      riskSignals: [],
      contractedUseCases: [
        { team: "Bioinformatics", seats: 8, product: "Claude API", useCase: "Genomic data analysis and variant interpretation", expectedOutcome: "Reduce analysis time from days to hours", adoptionStatus: "on_track", activeUsers: 7, notes: "Power users. Team lead presenting results at upcoming genomics conference." },
        { team: "Clinical Operations", seats: 5, product: "Claude API", useCase: "Patient report generation", expectedOutcome: "Standardized reporting across all clinicians", adoptionStatus: "on_track", activeUsers: 5, notes: "Full adoption. Requesting additional seats for new hires." },
      ],
      expansionMap: [
        { department: "Lab Technicians", headcount: 25, currentProduct: null, recommendedProduct: "Cowork", opportunityArr: 7500, rationale: "Non-technical lab staff managing sample tracking and scheduling." },
        { department: "IT/DevOps", headcount: 8, currentProduct: null, recommendedProduct: "Claude Code", opportunityArr: 12000, rationale: "Infrastructure automation, CI/CD pipeline management, monitoring scripts." },
      ],
      proactiveSignals: [
        { type: "customer_news", signal: "Summit's lead bioinformatician presenting Claude results at Genomics Conference", relevance: "External validation strengthens internal champion — expansion readiness", action: "Offer to help prepare presentation materials — deepens relationship", daysAgo: 7 },
      ],
      similarSituations: [
        {
          accountName: "GenePath Analytics",
          vertical: "Life Sciences",
          situation: "Small bioinformatics team achieved full adoption quickly. Leadership wanted to expand but wasn't sure which department to target next.",
          resolution: "Mapped the org's data workflows department by department. Identified clinical operations as the highest-value expansion because they had manual reporting processes that mirrored the bioinformatics team's original use case.",
          outcome: "Expanded from 8 seats to 20 seats within one quarter. Clinical ops became the second power-user team.",
          relevance: "Summit is in the same position — high adoption, ready to expand. The department mapping approach identifies the right next team.",
        },
      ],
      recommendedResources: [
        {
          title: "Multi-Department Rollout Playbook",
          type: "best_practice",
          relevance: "Summit is ready for expansion beyond bioinformatics. This playbook covers phased rollout, department-specific use case development, and change management.",
          keySection: "The 'Proof Point Cascade' — using success in one department to drive adoption in the next",
        },
        {
          title: "Driving Adoption Beyond the Initial Team",
          type: "best_practice",
          relevance: "Summit's bioinformatics team lead presenting at a conference is the perfect internal proof point for expansion.",
          keySection: "Leveraging internal success stories and external validation to drive executive buy-in for expansion",
        },
      ],
      nextQbrDate: monthsFromNow(2), onboardingComplete: true,
    },
    {
      companyId: REDWOOD_CAPITAL_ID, dealId: REDWOOD_DEAL_ID,
      healthScore: 75, healthTrend: "stable", contractStatus: "active",
      arr: "380000", productsPurchased: ["claude_api", "claude_code"],
      healthFactors: { adoption: 70, engagement: 72, sentiment: 78, support_health: 80 },
      usageMetrics: { api_calls_30d: 35000, trend_pct: 3, seats_active: 14, seats_total: 20 },
      lastTouchDate: daysAgo(10), daysSinceTouch: 10,
      contractStart: monthsAgo(7), renewalDate: monthsFromNow(5),
      keyStakeholders: [
        { name: "Michael Torres", title: "Managing Director", status: "engaged" },
      ],
      expansionSignals: [{ signal: "Exploring Claude Code for analyst workflows", confidence: 0.6, product: "claude_code", details: "Research team testing Code for due diligence reports" }],
      riskSignals: [],
      contractedUseCases: null, expansionMap: null, proactiveSignals: null,
      nextQbrDate: monthsFromNow(2), onboardingComplete: true,
    },
    {
      companyId: HARBOR_COMPLIANCE_ID, dealId: HARBOR_DEAL_ID,
      healthScore: 45, healthTrend: "critical", contractStatus: "at_risk",
      arr: "520000", productsPurchased: ["claude_api", "claude_enterprise"],
      healthFactors: { adoption: 60, engagement: 35, sentiment: 40, support_health: 50 },
      usageMetrics: { api_calls_30d: 28000, trend_pct: -15, seats_active: 18, seats_total: 40 },
      lastTouchDate: daysAgo(22), daysSinceTouch: 22,
      contractStart: monthsAgo(9), renewalDate: monthsFromNow(3),
      keyStakeholders: [
        { name: "Amanda Chen", title: "Chief Operating Officer", status: "new" },
        { name: "David Liu", title: "Former VP of Compliance", status: "departed" },
      ],
      expansionSignals: [],
      riskSignals: [
        { signal: "Champion (David Liu) departed 6 weeks ago", severity: "critical", detected_at: daysAgo(42).toISOString() },
        { signal: "New COO reviewing all vendor contracts", severity: "critical", detected_at: daysAgo(5).toISOString() },
        { signal: "No executive engagement in 22 days", severity: "high", detected_at: daysAgo(1).toISOString() },
      ],
      contractedUseCases: [
        { team: "Compliance Analysts", seats: 25, product: "Claude Enterprise", useCase: "Regulatory review automation", expectedOutcome: "50% reduction in review cycle time", adoptionStatus: "on_track", activeUsers: 18, notes: "Strong adoption among senior analysts. Junior team still using manual process." },
        { team: "Legal", seats: 10, product: "Claude Enterprise", useCase: "Contract analysis and clause extraction", expectedOutcome: "Eliminate external counsel for standard reviews", adoptionStatus: "at_risk", activeUsers: 3, notes: "Legal team skeptical after champion departure. New COO hasn't advocated internally." },
        { team: "Risk Assessment", seats: 10, product: "Claude Enterprise", useCase: "Risk report generation", expectedOutcome: "3x throughput on quarterly risk assessments", adoptionStatus: "needs_attention", activeUsers: 5, notes: "Pilot team engaged but haven't expanded to full risk team." },
      ],
      expansionMap: [
        { department: "Operations", headcount: 120, currentProduct: null, recommendedProduct: "Cowork", opportunityArr: 36000, rationale: "Non-technical team doing manual process coordination. Cowork automates task management and document workflows." },
        { department: "Finance", headcount: 45, currentProduct: null, recommendedProduct: "Cowork", opportunityArr: 13500, rationale: "Financial reporting and audit prep. Cowork can automate recurring report generation." },
      ],
      proactiveSignals: [
        { type: "product_release", signal: "Anthropic launched enhanced compliance workflow templates in Cowork", relevance: "Directly applicable to Harbor's 120-person ops team — new expansion angle", action: "Share Cowork compliance demo with Amanda Chen", daysAgo: 5 },
        { type: "industry_news", signal: "New SEC reporting requirements effective Q3 2026", relevance: "Harbor's compliance team will need to process 40% more regulatory reviews", action: "Position increased Claude usage as scaling solution vs. hiring", daysAgo: 12 },
      ],
      similarSituations: [
        {
          accountName: "Cornerstone Banking",
          vertical: "Financial Services",
          situation: "Compliance team was fully adopted but legal team resisted adoption — only 20% utilization after 90 days. Legal team viewed AI-assisted contract review as a risk to their professional judgment.",
          resolution: "Shifted positioning from 'AI does your job' to 'AI handles the repetitive review so you focus on complex judgment calls.' Ran a pilot where AI flagged standard clauses and attorneys focused on non-standard terms. Framed it as 'augmentation not automation.'",
          outcome: "Legal adoption went from 20% to 65% in 6 weeks. Attorneys reported spending more time on high-value analysis.",
          relevance: "Harbor's legal team (3/10 active) has the same resistance pattern. The augmentation framing and pilot approach directly applies.",
        },
        {
          accountName: "Apex Financial Analytics",
          vertical: "Financial Services",
          situation: "New CFO questioned all technology spend during budget review. Existing champion couldn't articulate ROI in financial terms the CFO cared about.",
          resolution: "Built a one-page ROI summary translating usage metrics into business outcomes: hours saved × analyst hourly cost = dollar value. Coached the internal champion to present it in the CFO's language — cost avoidance, not productivity gains.",
          outcome: "CFO approved renewal and expanded budget by 15% after seeing the cost avoidance framing.",
          relevance: "Amanda Chen needs to see value in financial terms. The cost avoidance framing resonates with executives reviewing vendor spend.",
        },
      ],
      recommendedResources: [
        {
          title: "Executive Sponsor Engagement Framework",
          type: "best_practice",
          relevance: "Amanda Chen is new to the COO role and doesn't have context on the original purchase. The 'New Executive Brief' format is designed for exactly this situation.",
          keySection: "The 'New Executive Brief' — a one-page value summary for incoming leadership",
        },
        {
          title: "Resolution: Stakeholder Transition During Contract Renewal",
          type: "resolution_history",
          relevance: "Directly applicable case study on navigating leadership changes during renewal conversations.",
          keySection: "The 3-step re-engagement sequence: introduce, demonstrate value, propose forward plan",
        },
        {
          title: "Claude for Financial Services: Compliance Workflows",
          type: "implementation_guide",
          relevance: "Harbor's legal team needs to see compliance-specific use cases that match their workflow, not generic AI capabilities.",
          keySection: "Contract review automation patterns and regulatory document analysis",
        },
      ],
      nextQbrDate: daysFromNow(21), onboardingComplete: true,
    },
    {
      companyId: LIGHTHOUSE_ID, dealId: LIGHTHOUSE_DEAL_ID,
      healthScore: 68, healthTrend: "declining", contractStatus: "renewal_window",
      arr: "290000", productsPurchased: ["claude_api"],
      healthFactors: { adoption: 65, engagement: 60, sentiment: 70, support_health: 75 },
      usageMetrics: { api_calls_30d: 22000, trend_pct: -8, seats_active: 10, seats_total: 15 },
      lastTouchDate: daysAgo(15), daysSinceTouch: 15,
      contractStart: monthsAgo(10), renewalDate: daysFromNow(60),
      keyStakeholders: [
        { name: "Lisa Park", title: "Compliance Director", status: "engaged" },
      ],
      expansionSignals: [],
      riskSignals: [
        { signal: "Usage declining 8% with renewal in 60 days", severity: "medium", detected_at: daysAgo(10).toISOString() },
      ],
      contractedUseCases: null, expansionMap: null, proactiveSignals: null,
      nextQbrDate: daysFromNow(14), onboardingComplete: true,
    },
    {
      companyId: APEX_FINANCIAL_ID, dealId: APEX_DEAL_ID,
      healthScore: 82, healthTrend: "stable", contractStatus: "active",
      arr: "180000", productsPurchased: ["claude_api"],
      healthFactors: { adoption: 80, engagement: 85, sentiment: 82, support_health: 80 },
      usageMetrics: { api_calls_30d: 19000, trend_pct: 7, seats_active: 6, seats_total: 8 },
      lastTouchDate: daysAgo(7), daysSinceTouch: 7,
      contractStart: monthsAgo(3), renewalDate: monthsFromNow(9),
      keyStakeholders: [
        { name: "Jason Reed", title: "Head of Engineering", status: "engaged" },
      ],
      expansionSignals: [{ signal: "Asking about batch processing for quarterly reports", confidence: 0.5, product: "claude_api", details: "May need higher API tier for quarterly spikes" }],
      riskSignals: [],
      contractedUseCases: null, expansionMap: null, proactiveSignals: null,
      nextQbrDate: monthsFromNow(3), onboardingComplete: true,
    },
    {
      companyId: CORNERSTONE_ID, dealId: CORNERSTONE_DEAL_ID,
      healthScore: 88, healthTrend: "improving", contractStatus: "active",
      arr: "440000", productsPurchased: ["claude_api", "claude_code"],
      healthFactors: { adoption: 90, engagement: 88, sentiment: 85, support_health: 90 },
      usageMetrics: { api_calls_30d: 62000, trend_pct: 12, seats_active: 22, seats_total: 25 },
      lastTouchDate: daysAgo(4), daysSinceTouch: 4,
      contractStart: monthsAgo(4), renewalDate: monthsFromNow(8),
      keyStakeholders: [
        { name: "Sarah Williams", title: "Head of Digital Transformation", status: "engaged" },
        { name: "Robert Franklin", title: "CTO", status: "engaged" },
      ],
      expansionSignals: [
        { signal: "Commercial lending team requesting access", confidence: 0.85, product: "claude_api", details: "Second department expansion — commercial lending wants to automate loan document review" },
      ],
      riskSignals: [],
      contractedUseCases: [
        { team: "Credit Analysis", seats: 20, product: "Claude API", useCase: "Loan application review and risk scoring", expectedOutcome: "60% faster credit decisions on standard applications", adoptionStatus: "on_track", activeUsers: 17, notes: "Highest adoption in portfolio. Team built custom workflows." },
        { team: "Branch Operations", seats: 15, product: "Claude Code", useCase: "Internal tool development for branch staff", expectedOutcome: "Self-service reporting and customer lookup tools", adoptionStatus: "on_track", activeUsers: 12, notes: "Second department expansion. Dev team building branch tools with Code." },
      ],
      expansionMap: [
        { department: "Compliance", headcount: 30, currentProduct: null, recommendedProduct: "Claude Enterprise", opportunityArr: 45000, rationale: "Regulatory compliance workflows. Natural extension from credit analysis success." },
        { department: "Customer Service", headcount: 80, currentProduct: null, recommendedProduct: "Cowork", opportunityArr: 24000, rationale: "Customer inquiry routing, response drafting, knowledge base search." },
      ],
      proactiveSignals: [
        { type: "industry_news", signal: "Federal Reserve proposing new stress testing requirements for regional banks", relevance: "Cornerstone's credit team may need expanded analytical capacity", action: "Position Claude API expansion for stress test modeling", daysAgo: 18 },
      ],
      nextQbrDate: monthsFromNow(2), onboardingComplete: true,
    },
    {
      companyId: VERTEX_PHARMA_ID, dealId: VERTEX_DEAL_ID,
      healthScore: 80, healthTrend: "stable", contractStatus: "active",
      arr: "310000", productsPurchased: ["claude_api"],
      healthFactors: { adoption: 78, engagement: 80, sentiment: 82, support_health: 78 },
      usageMetrics: { api_calls_30d: 38000, trend_pct: 4, seats_active: 12, seats_total: 15 },
      lastTouchDate: daysAgo(9), daysSinceTouch: 9,
      contractStart: monthsAgo(6), renewalDate: monthsFromNow(6),
      keyStakeholders: [
        { name: "Dr. Raj Patel", title: "Research Director", status: "engaged" },
      ],
      expansionSignals: [{ signal: "Clinical trials team interested in protocol analysis", confidence: 0.65, product: "claude_api", details: "Dr. Patel exploring expansion to clinical operations" }],
      riskSignals: [],
      contractedUseCases: null, expansionMap: null, proactiveSignals: null,
      nextQbrDate: monthsFromNow(2), onboardingComplete: true,
    },
    {
      companyId: PINNACLE_BIOTECH_ID, dealId: PINNACLE_DEAL_ID,
      healthScore: 55, healthTrend: "declining", contractStatus: "onboarding",
      arr: "240000", productsPurchased: ["claude_api"],
      healthFactors: { adoption: 40, engagement: 45, sentiment: 50, support_health: 55 },
      usageMetrics: { api_calls_30d: 4500, trend_pct: -30, seats_active: 3, seats_total: 10 },
      lastTouchDate: daysAgo(14), daysSinceTouch: 14,
      contractStart: daysAgo(28), renewalDate: monthsFromNow(10),
      keyStakeholders: [
        { name: "Jake Morrison", title: "VP Engineering", status: "engaged" },
      ],
      expansionSignals: [],
      riskSignals: [
        { signal: "LIMS integration failing — blocking production use", severity: "critical", detected_at: daysAgo(3).toISOString() },
        { signal: "Only 3 of 10 seats active after 4 weeks", severity: "high", detected_at: daysAgo(7).toISOString() },
      ],
      contractedUseCases: [
        { team: "Data Engineering", seats: 15, product: "Claude API", useCase: "LIMS data processing pipeline", expectedOutcome: "Automated sample processing with 99%+ accuracy", adoptionStatus: "at_risk", activeUsers: 4, notes: "Integration failures blocking production deployment. Team reverting to manual." },
        { team: "Research Scientists", seats: 10, product: "Claude API", useCase: "Literature review and protocol analysis", expectedOutcome: "70% faster systematic review process", adoptionStatus: "needs_attention", activeUsers: 6, notes: "Good early adoption but waiting for LIMS integration before deeper commitment." },
      ],
      expansionMap: [
        { department: "Clinical Trials", headcount: 30, currentProduct: null, recommendedProduct: "Claude API", opportunityArr: 45000, rationale: "Protocol analysis, adverse event monitoring, regulatory submission prep." },
        { department: "Quality Assurance", headcount: 12, currentProduct: null, recommendedProduct: "Cowork", opportunityArr: 3600, rationale: "QA documentation, batch record review, deviation tracking." },
      ],
      proactiveSignals: [
        { type: "product_release", signal: "Claude API now supports structured JSON output mode", relevance: "Could resolve LIMS data format incompatibility without middleware", action: "Share with Jake Morrison's engineering team — may simplify integration", daysAgo: 3 },
        { type: "customer_news", signal: "Pinnacle Biotech announced Series C funding ($45M)", relevance: "Growth capital means hiring and scaling — more seats and deeper integration", action: "Congratulate and position expansion conversation", daysAgo: 8 },
      ],
      similarSituations: [
        {
          accountName: "Cascadia Life Sciences",
          vertical: "Life Sciences",
          situation: "Data science team struggled with API integration during first 30 days. Only 2 of 8 team members using Claude regularly. Team lead frustrated with lack of progress.",
          resolution: "Assigned dedicated integration support for 2 weeks. Ran hands-on 'build your first pipeline' workshop. Created starter templates specific to their data formats.",
          outcome: "Team adoption grew from 25% to 60% within 4 weeks. Integration completed successfully with the hands-on support model.",
          relevance: "Pinnacle's LIMS integration failure is the same onboarding friction pattern. Dedicated support plus hands-on workshops resolve it.",
        },
        {
          accountName: "BrightPath Diagnostics",
          vertical: "Healthcare",
          situation: "LIMS integration failed due to ASTM/LDT data format incompatibility with Claude API's JSON input requirements. Lab processing pipeline blocked for 5 days.",
          resolution: "Built a lightweight middleware layer (LIMS → data transformer → Claude API) that handles format conversion. Provided the architecture doc and paired their engineer with our integration team for 3 days.",
          outcome: "Pipeline went live with 99.7% accuracy and 45-second processing times. Processing time dropped from 12 minutes to 45 seconds per sample.",
          relevance: "Exact same technical root cause. The middleware architecture and data transformer pattern directly resolves Pinnacle's issue.",
        },
      ],
      recommendedResources: [
        {
          title: "Resolution: LIMS Integration Failure in Biotech",
          type: "resolution_history",
          relevance: "BrightPath case study with the exact middleware approach that resolves Pinnacle's integration failure.",
          keySection: "The LIMS → transformer → API architecture diagram and implementation steps",
        },
        {
          title: "API Integration Best Practices for Healthcare Systems",
          type: "implementation_guide",
          relevance: "Covers data format transformation patterns applicable to lab systems and clinical data pipelines.",
          keySection: "The 'Data Format Bridge' pattern for legacy system integration",
        },
        {
          title: "First 30 Days: Customer Onboarding Checklist",
          type: "best_practice",
          relevance: "Pinnacle is still in onboarding. The week-by-week milestone checklist identifies where they fell behind and what to prioritize.",
          keySection: "Week 2-3 integration milestones and red flag indicators",
        },
      ],
      nextQbrDate: monthsFromNow(1), onboardingComplete: false,
    },
    {
      companyId: GENEPATH_ID, dealId: GENEPATH_DEAL_ID,
      healthScore: 73, healthTrend: "stable", contractStatus: "active",
      arr: "175000", productsPurchased: ["claude_api"],
      healthFactors: { adoption: 70, engagement: 72, sentiment: 75, support_health: 74 },
      usageMetrics: { api_calls_30d: 15000, trend_pct: 1, seats_active: 6, seats_total: 8 },
      lastTouchDate: daysAgo(11), daysSinceTouch: 11,
      contractStart: monthsAgo(5), renewalDate: monthsFromNow(7),
      keyStakeholders: [
        { name: "Emily Tran", title: "CTO", status: "engaged" },
      ],
      expansionSignals: [],
      riskSignals: [],
      contractedUseCases: null, expansionMap: null, proactiveSignals: null,
      nextQbrDate: monthsFromNow(3), onboardingComplete: true,
    },
    {
      companyId: ATLAS_RETAIL_ID, dealId: ATLAS_DEAL_ID,
      healthScore: 77, healthTrend: "stable", contractStatus: "active",
      arr: "350000", productsPurchased: ["claude_api"],
      healthFactors: { adoption: 75, engagement: 78, sentiment: 80, support_health: 76 },
      usageMetrics: { api_calls_30d: 45000, trend_pct: -5, seats_active: 15, seats_total: 20 },
      lastTouchDate: daysAgo(8), daysSinceTouch: 8,
      contractStart: monthsAgo(7), renewalDate: monthsFromNow(5),
      keyStakeholders: [
        { name: "Maria Santos", title: "Director of Operations", status: "engaged" },
        { name: "Chris Bennett", title: "VP of Technology", status: "engaged" },
      ],
      expansionSignals: [{ signal: "Merchandising team asking about Cowork", confidence: 0.75, product: "cowork", details: "Non-technical team wants AI access without coding — strong expansion signal" }],
      riskSignals: [],
      contractedUseCases: [
        { team: "Category Management", seats: 12, product: "Claude API", useCase: "Competitive pricing analysis", expectedOutcome: "Daily competitive price monitoring across 5,000 SKUs", adoptionStatus: "on_track", activeUsers: 10, notes: "Seasonal usage — peaks during promotional planning cycles." },
        { team: "Operations", seats: 8, product: "Claude API", useCase: "Supply chain demand forecasting", expectedOutcome: "Improve forecast accuracy by 25%", adoptionStatus: "needs_attention", activeUsers: 4, notes: "Ops team wants non-technical interface. Potential Cowork expansion." },
      ],
      expansionMap: [
        { department: "Operations (broader)", headcount: 200, currentProduct: null, recommendedProduct: "Cowork", opportunityArr: 60000, rationale: "Maria Santos already asked about Cowork for merchandising. 200-person ops team is the largest whitespace opportunity in the portfolio." },
        { department: "Marketing", headcount: 35, currentProduct: null, recommendedProduct: "Claude Team", opportunityArr: 10500, rationale: "Content creation, campaign analysis, customer communication drafting." },
        { department: "Finance", headcount: 20, currentProduct: null, recommendedProduct: "Cowork", opportunityArr: 6000, rationale: "Financial modeling, budget tracking, automated reporting." },
      ],
      proactiveSignals: [
        { type: "product_release", signal: "Cowork now available for enterprise deployment", relevance: "Maria Santos specifically asked about Cowork for merchandising team", action: "Schedule Cowork demo — 200-person ops team is the target", daysAgo: 14 },
        { type: "industry_news", signal: "Retail AI adoption accelerating: 67% of retailers plan AI investment in 2026", relevance: "Executive air cover for expansion budget approval", action: "Share industry report with VP Operations", daysAgo: 20 },
      ],
      nextQbrDate: monthsFromNow(2), onboardingComplete: true,
    },
    {
      companyId: BRIGHTSIDE_ID, dealId: BRIGHTSIDE_DEAL_ID,
      healthScore: 70, healthTrend: "declining", contractStatus: "renewal_window",
      arr: "260000", productsPurchased: ["claude_api"],
      healthFactors: { adoption: 68, engagement: 65, sentiment: 70, support_health: 72 },
      usageMetrics: { api_calls_30d: 20000, trend_pct: -12, seats_active: 9, seats_total: 15 },
      lastTouchDate: daysAgo(16), daysSinceTouch: 16,
      contractStart: monthsAgo(8), renewalDate: daysFromNow(90),
      keyStakeholders: [
        { name: "Lauren Hayes", title: "VP of Engineering", status: "engaged" },
      ],
      expansionSignals: [],
      riskSignals: [
        { signal: "Competitor (OpenAI) conducting POC with their product team", severity: "high", detected_at: daysAgo(12).toISOString() },
        { signal: "Usage declining 12% ahead of renewal", severity: "medium", detected_at: daysAgo(8).toISOString() },
      ],
      contractedUseCases: null, expansionMap: null, proactiveSignals: null,
      nextQbrDate: daysFromNow(21), onboardingComplete: true,
    },
    {
      companyId: METRO_MARKET_ID, dealId: METRO_DEAL_ID,
      healthScore: 85, healthTrend: "improving", contractStatus: "active",
      arr: "190000", productsPurchased: ["claude_api"],
      healthFactors: { adoption: 90, engagement: 88, sentiment: 85, support_health: 82 },
      usageMetrics: { api_calls_30d: 25000, trend_pct: 15, seats_active: 8, seats_total: 8 },
      lastTouchDate: daysAgo(4), daysSinceTouch: 4,
      contractStart: monthsAgo(4), renewalDate: monthsFromNow(8),
      keyStakeholders: [
        { name: "Daniel Kim", title: "Head of Data Science", status: "engaged" },
      ],
      expansionSignals: [{ signal: "100% seat utilization, team growing", confidence: 0.6, product: "claude_api", details: "Hiring 2 more data scientists, will need additional seats" }],
      riskSignals: [],
      contractedUseCases: null, expansionMap: null, proactiveSignals: null,
      nextQbrDate: monthsFromNow(3), onboardingComplete: true,
    },
    {
      companyId: CASCADE_SUPPLY_ID, dealId: CASCADE_DEAL_ID,
      healthScore: 65, healthTrend: "declining", contractStatus: "active",
      arr: "420000", productsPurchased: ["claude_api", "claude_code"],
      healthFactors: { adoption: 70, engagement: 55, sentiment: 60, support_health: 50 },
      usageMetrics: { api_calls_30d: 48000, trend_pct: -3, seats_active: 16, seats_total: 22 },
      lastTouchDate: daysAgo(20), daysSinceTouch: 20,
      contractStart: monthsAgo(8), renewalDate: monthsFromNow(4),
      keyStakeholders: [
        { name: "Tom Harris", title: "CTO", status: "engaged" },
      ],
      expansionSignals: [],
      riskSignals: [
        { signal: "Ongoing API latency issues — 3rd escalation", severity: "high", detected_at: daysAgo(2).toISOString() },
        { signal: "20 days since last touch on high-value account", severity: "medium", detected_at: daysAgo(1).toISOString() },
      ],
      contractedUseCases: null, expansionMap: null, proactiveSignals: null,
      nextQbrDate: monthsFromNow(1), onboardingComplete: true,
    },
    {
      companyId: EVOLVE_RETAIL_ID, dealId: EVOLVE_DEAL_ID,
      healthScore: 48, healthTrend: "critical", contractStatus: "at_risk",
      arr: "280000", productsPurchased: ["claude_api"],
      healthFactors: { adoption: 45, engagement: 30, sentiment: 50, support_health: 55 },
      usageMetrics: { api_calls_30d: 8000, trend_pct: -35, seats_active: 4, seats_total: 12 },
      lastTouchDate: daysAgo(25), daysSinceTouch: 25,
      contractStart: monthsAgo(5), renewalDate: monthsFromNow(3),
      keyStakeholders: [
        { name: "Rachel Kim", title: "VP Product", status: "silent" },
      ],
      expansionSignals: [],
      riskSignals: [
        { signal: "Key stakeholder Rachel Kim silent for 3 weeks", severity: "critical", detected_at: daysAgo(4).toISOString() },
        { signal: "Usage dropped 35% — lowest engagement in portfolio", severity: "critical", detected_at: daysAgo(2).toISOString() },
        { signal: "25 days since last touch", severity: "high", detected_at: daysAgo(1).toISOString() },
      ],
      contractedUseCases: [
        { team: "Product Engineering", seats: 15, product: "Claude API", useCase: "Code review and documentation generation", expectedOutcome: "30% faster code review cycles", adoptionStatus: "at_risk", activeUsers: 5, notes: "Usage dropped 35% after key stakeholder Rachel Kim went silent." },
        { team: "Customer Insights", seats: 10, product: "Claude API", useCase: "Customer feedback analysis and trend detection", expectedOutcome: "Weekly automated insight reports from NPS data", adoptionStatus: "at_risk", activeUsers: 2, notes: "Team lost interest after initial pilot. No champion driving adoption." },
      ],
      expansionMap: [
        { department: "Design", headcount: 12, currentProduct: null, recommendedProduct: "Claude Team", opportunityArr: 3600, rationale: "UX research synthesis, design documentation, competitive analysis." },
      ],
      proactiveSignals: [
        { type: "customer_news", signal: "Evolve Retail Tech posted job listing for VP of AI Strategy", relevance: "New AI leadership hire could re-energize the account or reset vendor evaluation", action: "Monitor the hire — prepare re-engagement pitch for new VP", daysAgo: 10 },
      ],
      similarSituations: [
        {
          accountName: "Brightside Commerce",
          vertical: "Retail",
          situation: "Product team adoption dropped 40% over 6 weeks after their primary power user transferred to a different department. Remaining team members didn't have established workflows and reverted to manual processes.",
          resolution: "Identified two mid-level engineers who were still using Claude weekly. Ran a 30-minute workflow workshop with their team showing the specific use cases the power user had built. Created a shared prompt library so institutional knowledge wasn't locked to one person.",
          outcome: "Adoption recovered to 85% within 3 weeks. The two engineers became department champions and drove adoption in QA team as well.",
          relevance: "Same pattern — usage concentrated in one stakeholder, when they disengage the whole team stalls. The fix is finding embedded users and elevating them.",
        },
        {
          accountName: "Metro Market Analytics",
          vertical: "Retail",
          situation: "Key stakeholder went on extended leave. Usage dropped 50% immediately. No one on the team knew what workflows had been built or how to maintain them.",
          resolution: "Proactively reached out to the team lead (not the absent stakeholder). Ran an audit of existing Claude workflows and documented them. Set up bi-weekly 15-minute check-ins with the team lead for 6 weeks.",
          outcome: "Usage stabilized at 70% within 2 weeks, then grew to 110% of baseline as the team lead found new use cases during check-ins.",
          relevance: "When a stakeholder goes silent, don't wait for them to come back. Find the next person and give them ownership.",
        },
      ],
      recommendedResources: [
        {
          title: "Driving Adoption Beyond the Initial Team",
          type: "best_practice",
          relevance: "Evolve's usage is concentrated in a few power users. This playbook covers how to identify embedded champions and distribute adoption across the team.",
          keySection: "The 'Champion Ladder' framework — identifying users at each adoption tier and moving them up",
        },
        {
          title: "Prompt Engineering Workshop Guide",
          type: "implementation_guide",
          relevance: "Evolve's Customer Insights team (2/10 active) likely stalled because they don't know how to apply Claude to their specific NPS analysis workflow. A targeted workshop addresses this directly.",
          keySection: "The 45-minute 'Bring Your Own Workflow' session template",
        },
        {
          title: "Executive Sponsor Engagement Framework",
          type: "best_practice",
          relevance: "With Rachel Kim silent and a new VP of AI Strategy being hired, Sarah needs a re-engagement strategy for when the new executive starts.",
          keySection: "The 'New Executive Brief' format for introducing the platform's value to incoming leadership",
        },
      ],
      nextQbrDate: daysFromNow(14), onboardingComplete: true,
    },
  ];

  await db.insert(schema.accountHealth).values(healthRecords);
  console.log(`  ✓ Inserted ${healthRecords.length} account health records`);

  // ══════════════════════════════════════════════════════
  // STEP 5: Insert knowledge articles
  // ══════════════════════════════════════════════════════
  console.log("\n📖 Inserting knowledge articles...");

  const knowledgeArticles = [
    {
      id: KB_HEALTHCARE_API_ID,
      title: "API Integration Best Practices for Healthcare Systems",
      articleType: "implementation_guide",
      summary: "Comprehensive guide for HIPAA-compliant Claude API integration with healthcare IT systems including EHR, PACS, and lab information systems.",
      products: ["claude_api"],
      verticals: ["healthcare"],
      tags: ["integration", "hipaa", "healthcare", "api"],
      effectivenessScore: 88,
      viewCount: 142,
      content: `This guide covers the recommended approach for integrating Claude API into healthcare environments where HIPAA compliance is required. All implementations must follow these patterns to ensure PHI is properly handled throughout the data pipeline.

Authentication and Access Control: Healthcare integrations should use service-to-service OAuth 2.0 with short-lived tokens (15 minute expiry maximum). All API calls must route through a HIPAA-compliant proxy layer that strips PHI before sending data to Claude. We recommend the "de-identify, process, re-identify" pattern where patient identifiers are replaced with tokens before API submission and mapped back after response generation. This pattern has been validated with our legal and compliance teams and is documented in our BAA.

EHR Integration Patterns: For Epic-based systems, use the FHIR R4 API with SMART on FHIR authorization. Claude API calls should be wrapped in Epic's CDS Hooks framework for real-time clinical decision support. For Cerner-based systems, use the Millennium platform APIs with the same de-identification pattern. Common pitfalls include sending full patient records when only the relevant section is needed — always scope your API context to the minimum necessary PHI.

HL7 and FHIR Considerations: When processing HL7 v2 messages, parse them into structured JSON before sending to Claude. For FHIR bundles, extract only the relevant resources (Observation, Condition, MedicationRequest) rather than sending entire patient bundles. Rate limiting should be configured per-facility with burst capacity for high-census periods.

Performance and Reliability: Healthcare systems require 99.9% uptime for clinical workflows. Implement circuit breakers with graceful fallback to manual processing. Cache frequently requested reference data (drug interactions, procedure codes) locally. For radiology report generation, use streaming responses to minimize time-to-first-token.`,
    },
    {
      id: KB_FINSERV_CODE_ID,
      title: "Claude Code Deployment Guide for Financial Services",
      articleType: "implementation_guide",
      summary: "SOC 2 compliant deployment guide for Claude Code in regulated financial services environments.",
      products: ["claude_code"],
      verticals: ["financial_services"],
      tags: ["claude_code", "compliance", "soc2", "deployment"],
      effectivenessScore: 82,
      viewCount: 89,
      content: `This guide details the deployment requirements for Claude Code in financial services environments where SOC 2 Type II compliance, audit logging, and data governance are mandatory.

SOC 2 Compliance Requirements: Claude Code deployments in financial services must operate within the customer's VPC or approved cloud environment. All code generation and review activities must be logged in an immutable audit trail. Workspace configurations should enforce least-privilege access — analysts should only access repositories and data sources relevant to their role. Enable the "compliance mode" flag in workspace settings to automatically redact sensitive financial data from Claude's context window.

Audit Logging and Traceability: Every Claude Code interaction must be captured in the customer's SIEM system. This includes: prompts submitted, code generated, code accepted/rejected, and files modified. For regulatory examinations, customers need to demonstrate that AI-generated code went through the same review process as human-written code. Configure the audit webhook to forward events to Splunk, Datadog, or the customer's preferred logging platform.

Secure Workspace Configuration: Financial services workspaces must be configured with network isolation — no direct internet access from the coding environment. All package installations must go through an approved internal registry. Git operations should be restricted to approved repositories with branch protection rules enforced. Enable the "financial services" template which pre-configures these settings.

Regulatory Considerations: Different jurisdictions have varying requirements for AI-generated code in financial systems. In the US, OCC and FDIC guidelines require documentation of AI usage in critical systems. In the EU, DORA (Digital Operational Resilience Act) requires testing of AI-generated code as part of ICT risk management. Always involve the customer's compliance team early in deployment planning.`,
    },
    {
      id: KB_RATE_LIMITS_ID,
      title: "Troubleshooting API Rate Limits and Usage Optimization",
      articleType: "best_practice",
      summary: "Common causes of API throttling and optimization strategies for high-volume production deployments.",
      products: ["claude_api"],
      verticals: ["healthcare", "financial_services", "technology", "retail"],
      tags: ["api", "performance", "troubleshooting", "optimization"],
      effectivenessScore: 91,
      viewCount: 234,
      content: `This article covers the most common causes of API rate limiting and proven strategies for optimizing usage patterns to stay within rate limits while maximizing throughput.

Common Throttling Causes: The most frequent cause of rate limiting is burst traffic — customers who batch their API calls into narrow windows rather than distributing them evenly. The second most common cause is oversized prompts: sending 100K+ token contexts when 10K would suffice. Third is retry storms — when a rate limit triggers retries that compound the problem. Always implement exponential backoff with jitter.

Batching Strategies: For document processing workloads (common in healthcare and financial services), implement a queue-based architecture with rate-aware workers. Set worker concurrency to 80% of your rate limit to leave headroom for interactive requests. For real-time applications, use a token bucket algorithm to smooth request distribution. Batch similar requests together using Claude's multi-turn conversation feature rather than making separate API calls for each step.

Caching Patterns: Implement response caching for deterministic queries — if the same prompt with the same context would produce equivalent results, cache the response. Common cacheable patterns include: document classification, entity extraction from templated forms, and FAQ-style responses. Use a TTL of 1-24 hours depending on how frequently the underlying data changes. For healthcare customers, ensure the cache layer is HIPAA-compliant.

Tier Upgrade Criteria: Customers should consider a tier upgrade when they consistently use more than 70% of their rate limit during peak hours, when they need lower latency guarantees (P99 < 500ms), or when they require dedicated capacity for production workloads. The upgrade process takes 24-48 hours. Contact your AE to initiate.`,
    },
    {
      id: KB_GDPR_ID,
      title: "Data Residency and GDPR Configuration Guide",
      articleType: "implementation_guide",
      summary: "Guide for configuring Claude API for EU data residency requirements and GDPR compliance.",
      products: ["claude_api", "claude_code"],
      verticals: ["healthcare", "financial_services", "technology", "retail"],
      tags: ["gdpr", "data_residency", "compliance", "eu"],
      effectivenessScore: 79,
      viewCount: 67,
      content: `This guide covers the configuration requirements for customers who need to comply with GDPR, EU data residency requirements, or other regional data protection regulations.

Regional Endpoints: Anthropic operates dedicated inference endpoints in the EU (Frankfurt) and UK (London) regions. Customers subject to EU data residency requirements should configure their API client to use the eu.api.anthropic.com endpoint. All data processed through EU endpoints is stored and processed exclusively within EU infrastructure. The endpoint supports the same API contract as the global endpoint with equivalent performance characteristics.

Data Processing Agreements: All enterprise customers receive a standard DPA that covers GDPR Article 28 requirements. For customers who need custom DPA terms (common in healthcare and public sector), work with your AE to initiate the legal review process. Typical custom DPA turnaround is 2-3 weeks. The DPA covers data processing, sub-processor management, breach notification, and data subject rights.

Cross-Border Considerations: For multinational customers, configure regional routing at the application layer to ensure requests from EU users go to EU endpoints. If your customer operates in both the EU and US, they can maintain separate API keys for each region. Audit logs from each region can be consolidated in their SIEM while maintaining data residency for the actual API payloads.

GDPR Data Subject Rights: Claude API does not persistently store prompts or responses beyond the API call lifecycle (unless the customer opts into conversation logging). This means standard data subject access and deletion requests do not apply to API-processed data. Document this in the customer's data processing records to simplify their GDPR compliance posture.`,
    },
    {
      id: KB_MULTI_DEPT_ID,
      title: "Multi-Department Rollout Playbook",
      articleType: "best_practice",
      summary: "Step-by-step guide for expanding Claude adoption from a single team to multiple departments across an organization.",
      products: ["claude_api", "claude_code"],
      verticals: ["healthcare", "financial_services", "technology", "retail"],
      tags: ["adoption", "rollout", "expansion", "change_management"],
      effectivenessScore: 85,
      viewCount: 118,
      content: `This playbook outlines the proven approach for expanding Claude usage from an initial team to multiple departments within an organization. Based on patterns from our most successful expansions.

Phase 1 — Document the Win (Weeks 1-2): Before approaching new departments, quantify the impact of the initial deployment. Collect metrics: time saved per task, error rate reduction, user satisfaction scores, and business outcomes (revenue impact, cost reduction). Build an internal case study with quotes from the initial team. The strongest expansion signal is when other departments hear about the initial team's success organically.

Phase 2 — Identify Champions (Weeks 2-4): The best expansion champions are not executives — they are individual contributors who see a clear application to their daily work. Look for people who have already asked the initial team about Claude. Schedule informal conversations with potential champions to understand their workflows and identify high-value use cases. Map the organizational decision-making structure to understand who approves new tools in each department.

Phase 3 — Pilot and Prove (Weeks 4-8): Run a 2-week pilot with the new department using 3-5 users. Define success metrics upfront with the department lead. Provide hands-on training through a workshop format (see Prompt Engineering Workshop Guide). Assign a dedicated point of contact from the initial team as a peer mentor. Track usage daily and address friction immediately.

Phase 4 — Scale and Sustain (Weeks 8-12): After a successful pilot, work with the executive sponsor to approve full department rollout. Establish a cross-department Claude users group for knowledge sharing. Create department-specific prompt templates and workflows. Schedule monthly usage reviews with department leads to maintain momentum and identify optimization opportunities.`,
    },
    {
      id: KB_ONBOARDING_ID,
      title: "First 30 Days: Customer Onboarding Checklist",
      articleType: "best_practice",
      summary: "Week-by-week onboarding milestones, health indicators, red flags, and escalation triggers for new customers.",
      products: ["claude_api", "claude_code"],
      verticals: ["healthcare", "financial_services", "technology", "retail"],
      tags: ["onboarding", "adoption", "checklist"],
      effectivenessScore: 90,
      viewCount: 198,
      content: `This checklist covers the critical first 30 days after contract signing. Research shows that customers who hit these milestones in the first month have a 92% renewal rate vs 61% for those who miss them.

Week 1 — Technical Setup: API keys provisioned and tested. Development environment configured. First successful API call made. Security review completed (HIPAA/SOC 2 as applicable). Primary technical contact identified and responsive. RED FLAG: No API calls by end of Week 1 — escalate to AE immediately.

Week 2 — Initial Integration: First production use case identified and scoped. Integration with at least one existing system started. 3+ team members have made API calls. Basic prompt templates created for primary use case. RED FLAG: Only 1 person using the API — indicates single point of failure and low organizational buy-in.

Week 3 — Production Readiness: First use case in production or staging. Error handling and monitoring configured. At least 50% of licensed seats activated. First feedback session completed with users. RED FLAG: Integration blockers unresolved for more than 5 business days — assign dedicated support.

Week 4 — Value Demonstration: First measurable business outcome documented. Usage patterns stabilized and growing. Executive sponsor briefed on initial results. Second use case identified. 30-day health check meeting completed with AE. RED FLAG: Usage declining from Week 2 peak — indicates the "novelty wore off" pattern. Immediate intervention needed with training and use case coaching.

Escalation Triggers: Any of these should trigger an immediate AE + CSM review: zero API calls for 3+ consecutive days after initial setup, key stakeholder departure, integration failure blocking production use, customer expressing frustration in support tickets, or competitor evaluation mentioned.`,
    },
    {
      id: KB_ADOPTION_ID,
      title: "Driving Adoption Beyond the Initial Team",
      articleType: "best_practice",
      summary: "Strategies for developing internal champions, driving organic adoption, and expanding Claude usage across the organization.",
      products: ["claude_api", "claude_code"],
      verticals: ["healthcare", "financial_services", "technology", "retail"],
      tags: ["adoption", "expansion", "champion"],
      effectivenessScore: 83,
      viewCount: 96,
      content: `This guide addresses the most common challenge in post-sale account management: getting adoption to spread beyond the initial team that championed the purchase.

The Champion Development Model: Your initial champion is critical, but a single champion is also a single point of failure. Identify and develop 2-3 additional champions within the first 90 days. The ideal champion profile: mid-level technical leader who is respected by peers, has a clear pain point that Claude solves, and is willing to share their experience internally. Invest in these champions with early access to new features, direct access to our product team for feedback, and recognition in customer advisory boards.

Organic Adoption Signals: Watch for these indicators that adoption is spreading naturally: new users appearing without formal onboarding, API usage growing faster than seat provisioning, support tickets from teams you haven't worked with, and internal Slack messages mentioning Claude (ask your champion to monitor). When you see these signals, act quickly — reach out to the new users and offer support before they hit friction.

The "Show Don't Tell" Approach: The most effective expansion tactic is not a sales pitch — it is a live demonstration using the customer's own data and workflows. Work with your champion to build a demo that shows a specific colleague's workflow improved by Claude. A 15-minute screen share showing "here's how this could work for your team" converts at 3x the rate of a generic product demo.

Common Adoption Blockers: Security review delays (resolve by proactively sharing compliance docs), lack of training (offer prompt engineering workshops), unclear ROI (build department-specific business cases), and "we tried AI before and it didn't work" skepticism (address with specific success metrics from the initial team).`,
    },
    {
      id: KB_PROMPT_WORKSHOP_ID,
      title: "Prompt Engineering Workshop Guide",
      articleType: "best_practice",
      summary: "Training curriculum, hands-on exercises, and evaluation metrics for customer prompt engineering workshops.",
      products: ["claude_api", "claude_code"],
      verticals: ["healthcare", "financial_services", "technology", "retail"],
      tags: ["training", "prompt_engineering", "adoption"],
      effectivenessScore: 87,
      viewCount: 156,
      content: `This guide provides the curriculum and facilitation notes for running a prompt engineering workshop with customer teams. Workshops are our highest-impact adoption intervention — teams that complete a workshop show 40% higher API usage in the following month.

Workshop Format (2 hours): Part 1 — Foundations (30 min): How Claude thinks, token economics, the role of system prompts and context. Use the "before and after" prompt comparison to show the impact of good prompt engineering. Part 2 — Role-Specific Exercises (45 min): Break into groups by role. Each group works on prompts for their actual daily tasks. Facilitator circulates and provides real-time feedback. Part 3 — Advanced Techniques (30 min): Chain of thought, few-shot examples, structured output formatting, handling edge cases. Part 4 — Template Building (15 min): Each participant creates one reusable prompt template for their most common task.

Role-Specific Exercise Examples: For analysts — have them bring a real report and build a prompt that generates the first draft. For engineers — have them bring a code review and build a prompt that identifies issues. For support teams — have them bring 5 real customer tickets and build a prompt that generates response drafts. For compliance teams — have them bring a regulatory document and build a prompt that extracts requirements.

Evaluation Metrics: Track these after the workshop: prompt quality score (rated by facilitator, 1-10), time-to-value (how quickly participants produce useful outputs), template reuse rate (how often participants use the templates they created), and 30-day usage change (API calls per user before vs after workshop).

Facilitation Tips: Never lecture for more than 10 minutes without a hands-on exercise. Use the customer's actual data and workflows — generic examples are significantly less effective. Have participants share their best prompts with the group — peer learning is more memorable than instructor teaching. Follow up with each participant 1 week later to see if they are using their templates.`,
    },
    {
      id: KB_EXEC_SPONSOR_ID,
      title: "Executive Sponsor Engagement Framework",
      articleType: "best_practice",
      summary: "QBR templates, ROI storytelling, New Executive Brief format, and stakeholder mapping for expansion and renewal.",
      products: ["claude_api", "claude_code"],
      verticals: ["healthcare", "financial_services", "technology", "retail"],
      tags: ["executive", "qbr", "renewal", "stakeholder"],
      effectivenessScore: 86,
      viewCount: 110,
      content: `This framework covers how to engage executive sponsors effectively throughout the customer lifecycle, with special emphasis on the critical moments: QBRs, renewals, and leadership changes.

QBR Template: Every QBR should follow this structure: (1) Usage Dashboard — show adoption metrics, active users, top use cases. (2) Business Impact — translate usage into business outcomes (time saved, costs reduced, revenue enabled). (3) Roadmap Preview — share 2-3 upcoming features relevant to their use cases. (4) Success Stories — share what similar companies in their vertical are doing. (5) Expansion Discussion — introduce new products or use cases that could add value. (6) Action Items — always leave with 3-5 concrete next steps with owners and dates. QBRs should be 45-60 minutes, never longer. Send the deck 24 hours in advance.

The New Executive Brief: When a key stakeholder departs or a new executive joins, use the "New Executive Brief" format within the first 2 weeks. This is a concise 1-page document that covers: what their organization is using Claude for, quantified business impact to date, current contract terms and timeline, and a proposed 30-minute introductory meeting. The brief should be value-forward — lead with what Claude has done for their team, not with product features. The goal is to establish the relationship before the new executive starts reviewing vendor contracts.

ROI Storytelling: Executives do not care about API calls or seat utilization. They care about business outcomes. Always translate technical metrics into business language: "Your compliance team processed 2,400 regulatory reviews using Claude this quarter, compared to 800 manually last quarter — a 3x increase in throughput with the same team size." Use the customer's own KPIs and language, not ours.

Stakeholder Mapping for Expansion: Map all stakeholders using the MEDDPICC framework: who controls the budget (Economic Buyer), who would champion expansion (Champion), who would block it (Blocker), and who has decision authority (Decision Maker). Update this map quarterly. The most common expansion failure is pitching to the champion without engaging the economic buyer.`,
    },
    {
      id: KB_HEALTHCARE_PATTERNS_ID,
      title: "Claude for Healthcare: Implementation Patterns",
      articleType: "implementation_guide",
      summary: "Production-proven patterns for clinical documentation, prior authorization, radiology reporting, and patient communication workflows.",
      products: ["claude_api"],
      verticals: ["healthcare"],
      tags: ["healthcare", "implementation", "clinical"],
      effectivenessScore: 84,
      viewCount: 121,
      content: `This article catalogs the proven implementation patterns for Claude API in healthcare settings. These patterns have been validated in production across multiple health systems and meet HIPAA requirements when implemented with the de-identification layer described in our Healthcare API Integration guide.

Clinical Documentation: The most common healthcare use case. Claude generates draft clinical notes from structured data (vitals, lab results, assessment) and physician dictation. Implementation pattern: (1) Receive dictation or structured input, (2) De-identify patient data, (3) Send to Claude with specialty-specific system prompt, (4) Re-identify and present draft to physician for review, (5) Physician edits and signs the note. Average time savings: 8-12 minutes per encounter. Key consideration: the system prompt should specify the documentation standard (SOAP, DAP, narrative) and specialty conventions.

Prior Authorization Automation: Claude reviews prior authorization requests against payer criteria and generates determination recommendations. Implementation pattern: extract clinical data from the EHR, format against the payer's medical necessity criteria, generate a clinical justification letter if approved or a detailed denial reason if not. This workflow reduces PA turnaround from 3-5 days to same-day for routine requests. Integration points: Epic's Prior Auth module or custom middleware for other EHR systems.

Radiology Report Generation: Claude generates structured radiology reports from imaging study metadata and radiologist findings. The system prompt includes department-specific templates (chest CT, brain MRI, etc.) with standardized formatting. Key implementation detail: always include the comparison study date and relevant clinical history in the prompt context. Average time savings: 4-6 minutes per report.

Patient Communication: Claude generates patient-friendly summaries of clinical encounters, test results, and care plans. This requires a separate system prompt optimized for health literacy (target 6th grade reading level). All output must be reviewed by a clinician before delivery to the patient. Integration with patient portals (MyChart, etc.) through secure messaging APIs.`,
    },
    {
      id: KB_FINSERV_COMPLIANCE_ID,
      title: "Claude for Financial Services: Compliance Workflows",
      articleType: "implementation_guide",
      summary: "Implementation patterns for regulatory reporting, risk analysis, audit trail, and document review automation in financial services.",
      products: ["claude_api"],
      verticals: ["financial_services"],
      tags: ["financial_services", "compliance", "regulatory"],
      effectivenessScore: 81,
      viewCount: 93,
      content: `This article covers the proven implementation patterns for Claude API in financial services compliance workflows. These patterns have been deployed in production at regional banks, insurance carriers, and asset management firms.

Regulatory Reporting: Claude automates the extraction and formatting of data for regulatory filings (FDIC Call Reports, SEC filings, state insurance filings). Implementation pattern: (1) Extract raw data from core banking or policy administration systems, (2) Send to Claude with the specific regulatory template and reporting period, (3) Claude formats the data, identifies anomalies, and generates the draft filing, (4) Compliance team reviews and submits. Average time savings: 60-70% reduction in report preparation time. Key consideration: always validate numerical outputs against source data — Claude should be used for formatting and narrative generation, not calculations.

Risk Analysis: Claude analyzes loan applications, insurance submissions, and investment proposals against risk frameworks. The system prompt includes the customer's specific risk criteria, regulatory limits, and historical patterns. Claude generates a risk assessment with supporting rationale and flags items that require human review. This is particularly effective for commercial lending where each application requires 2-4 hours of analyst time.

Audit Trail and Explainability: Financial regulators require explainability for AI-assisted decisions. Every Claude API call in a compliance workflow must log: the input data, the system prompt (including risk criteria), the output, and the human reviewer's decision. Configure the audit webhook to capture these events in the customer's GRC (Governance, Risk, Compliance) platform. The log should support "show your work" requests from examiners.

Document Review Automation: Claude reviews contracts, regulatory filings, and policy documents for compliance issues. Implementation pattern: chunk large documents into sections, process each section with a compliance-specific system prompt, aggregate findings into a structured report with severity ratings. For insurance policy review, Claude can process 50+ pages in minutes compared to 2-3 hours of analyst time.`,
    },
    {
      id: KB_COWORK_NONTECH_ID,
      title: "Cowork for Non-Technical Teams",
      articleType: "product_update",
      summary: "Getting started guide for deploying Cowork to operations, finance, legal, and HR teams who need AI without coding.",
      products: ["cowork"],
      verticals: ["healthcare", "financial_services", "technology", "retail"],
      tags: ["cowork", "non_technical", "adoption"],
      effectivenessScore: 78,
      viewCount: 54,
      content: `Cowork is Anthropic's collaborative AI workspace designed for teams that need AI capabilities without writing code. This guide covers use cases, setup, and best practices for deploying Cowork to non-technical departments.

Target Audience and Use Cases: Cowork is ideal for operations, finance, legal, HR, and marketing teams. Common use cases include: document summarization and analysis (legal and compliance), report generation and formatting (finance and operations), content creation and editing (marketing), policy drafting and review (HR and legal), and data analysis through natural language queries (operations and finance). The key differentiator from Claude API is the visual interface — users interact through a familiar document-editor experience.

Getting Started: Cowork is provisioned through the same enterprise admin console as Claude API. Administrators create workspaces for each team and invite members via email. Each workspace can be configured with team-specific permissions, document templates, and shared context (company style guides, terminology, etc.). No IT support is needed beyond initial SSO configuration.

Permission Models: Cowork supports three permission levels: Viewer (can see shared outputs but not create), Editor (can create and edit their own work), and Admin (can manage workspace settings and shared resources). For regulated industries, enable the "audit mode" which logs all user interactions for compliance review. Documents created in Cowork can be exported to Google Docs, Microsoft Word, or PDF.

Pricing and Packaging: Cowork is licensed per-seat with volume discounts for 25+ users. It can be added to existing Claude API or Claude Enterprise contracts. For expansion opportunities, the most common path is: customer buys Claude API for engineering → non-technical teams hear about it → Cowork fills the gap for users who cannot code. This is a natural upsell that often doubles the account's seat count.`,
    },
    {
      id: KB_RESOLUTION_LATENCY_ID,
      title: "Resolution: API Latency in High-Volume Healthcare Environments",
      articleType: "resolution_history",
      summary: "How Meridian Health Network resolved API latency issues through connection pooling and regional endpoint migration.",
      products: ["claude_api"],
      verticals: ["healthcare"],
      tags: ["resolution", "latency", "api", "healthcare"],
      relatedCompanyIds: [MERIDIAN_HEALTH_ID],
      effectivenessScore: 92,
      viewCount: 78,
      resolutionSteps: [
        { step: 1, description: "Identified root cause: each API call was creating a new HTTPS connection, causing 200-400ms overhead per request" },
        { step: 2, description: "Implemented HTTP/2 connection pooling with keep-alive, reducing connection overhead to <10ms" },
        { step: 3, description: "Migrated from global endpoint to regional US-West endpoint, reducing network latency by ~40ms" },
        { step: 4, description: "Added request batching for non-urgent tasks (clinical note generation) to smooth traffic spikes" },
        { step: 5, description: "Configured monitoring dashboard to track P50/P95/P99 latency and alert on degradation" },
      ],
      content: `Meridian Health Network experienced significant API latency issues during their first month of production deployment. Their clinical documentation workflow was seeing response times of 3-5 seconds for routine requests, compared to the expected 1-2 seconds.

Root Cause Analysis: The engineering team was creating a new HTTPS connection for every API call. With their volume of ~2,000 calls per hour during peak clinical hours, this meant constant TLS handshakes adding 200-400ms per request. Additionally, they were routing through the global API endpoint from their Portland data center, adding unnecessary network hops.

Resolution: We worked with their engineering team over a 3-day sprint to implement connection pooling using an HTTP/2 client with persistent connections and keep-alive. This alone reduced median response time by 35%. We then migrated them to the US-West regional endpoint, which further reduced P50 latency by 40ms. For non-urgent workloads like overnight batch processing of clinical notes, we implemented request batching with a 100ms collection window that improved throughput by 60%.

Outcome: Median response time dropped from 3.2 seconds to 1.1 seconds. P99 latency improved from 8.5 seconds to 2.8 seconds. The clinical staff reported that the documentation workflow now felt "instant" and physician adoption increased from 60% to 88% in the month following the optimization. Meridian's health score improved from 72 to 85 after this resolution.

Applicability: This pattern applies to any high-volume deployment, particularly in healthcare where real-time clinical workflows are latency-sensitive. The connection pooling and regional endpoint migration are now part of our standard onboarding checklist for healthcare customers.`,
    },
    {
      id: KB_RESOLUTION_STAKEHOLDER_ID,
      title: "Resolution: Stakeholder Transition During Contract Renewal",
      articleType: "resolution_history",
      summary: "How Redwood Capital Partners renewed at 115% after their CFO departed mid-contract, through executive briefing and ROI documentation.",
      products: ["claude_api", "claude_code"],
      verticals: ["financial_services"],
      tags: ["resolution", "stakeholder", "renewal", "leadership_change"],
      relatedCompanyIds: [REDWOOD_CAPITAL_ID],
      effectivenessScore: 89,
      viewCount: 134,
      resolutionSteps: [
        { step: 1, description: "Detected champion departure (CFO) through LinkedIn monitoring and customer silence" },
        { step: 2, description: "Immediately reached out to remaining contacts to understand the new organizational structure" },
        { step: 3, description: "Prepared a New Executive Brief with quantified ROI metrics from the past 7 months" },
        { step: 4, description: "Scheduled introduction meeting with new Managing Director within 10 days of transition" },
        { step: 5, description: "Presented business impact data: 3x analyst throughput, $1.2M annualized time savings" },
        { step: 6, description: "Proposed expansion to research team with ROI projection, renewed at 115% of original contract" },
      ],
      content: `Redwood Capital Partners presented one of our most challenging renewal situations: their CFO — who had championed the original purchase — departed 5 months into the contract. The new Managing Director, Michael Torres, had no prior relationship with Anthropic and was reviewing all vendor contracts as part of his mandate to reduce costs.

Detection and Response: We detected the transition through a combination of signals: our champion stopped responding to emails, LinkedIn showed the CFO had moved to a new firm, and API usage patterns shifted (the CFO's personal workspace went inactive). Within 48 hours of confirmation, we executed our stakeholder transition playbook.

The New Executive Brief: We prepared a one-page brief for Michael Torres that led with business impact: "Your research team has processed 340 investment memos using Claude in the past 7 months, up from 110 done manually in the same period prior. Analyst throughput has tripled." We included specific dollar figures: estimated $1.2M in annualized time savings based on analyst compensation and hours saved. We deliberately did not lead with product features or contract terms.

The Meeting: We requested a 30-minute introduction meeting, framing it as "we want to make sure the team continues getting value during this transition." Michael was skeptical but agreed. During the meeting, we walked through the usage dashboard, showed him the top use cases his team relied on, and shared testimonials from his own analysts. His skepticism turned to interest when he saw the adoption metrics.

Outcome: Not only did Redwood renew, they expanded. Michael identified an opportunity for Claude Code in the research team's due diligence workflow. The contract renewed at 115% of the original value. Key lesson: when a champion departs, the window to engage the replacement is 2 weeks. After that, vendor consolidation decisions are often already made.`,
    },
    {
      id: KB_RESOLUTION_LIMS_ID,
      title: "Resolution: LIMS Integration Failure in Biotech",
      articleType: "resolution_history",
      summary: "How BrightPath Diagnostics resolved Claude API integration with their LIMS through a middleware approach and dedicated support.",
      products: ["claude_api"],
      verticals: ["technology"],
      tags: ["resolution", "integration", "lims", "biotech"],
      relatedCompanyIds: [BRIGHTPATH_ID],
      effectivenessScore: 85,
      viewCount: 62,
      resolutionSteps: [
        { step: 1, description: "Identified root cause: LIMS used a proprietary data format (LDT/ASTM) incompatible with Claude's JSON input" },
        { step: 2, description: "Designed middleware layer to translate LIMS data into structured JSON for Claude API consumption" },
        { step: 3, description: "Built custom data pipeline: LIMS → middleware → Claude API → results back to LIMS" },
        { step: 4, description: "Assigned dedicated integration support engineer for 2-week sprint" },
        { step: 5, description: "Validated end-to-end pipeline with 500 test samples before production deployment" },
      ],
      content: `BrightPath Diagnostics struggled for 3 weeks to integrate Claude API with their Laboratory Information Management System (LIMS). Their LIMS used a proprietary data format based on ASTM/LDT standards that could not be directly consumed by Claude's API.

The Problem: BrightPath's LIMS exported sample data in ASTM E1394 format — a legacy healthcare data standard used primarily in clinical laboratories. Their engineering team attempted to parse this directly in their API calls, resulting in malformed requests and inconsistent results. The sample processing pipeline was partially blocked, with lab technicians reverting to manual processing for Claude-targeted workflows.

Root Cause: The core issue was not a Claude API limitation but a data transformation gap. ASTM data includes segment delimiters, field separators, and encoding conventions that need to be translated into structured JSON before Claude can process them meaningfully. BrightPath's team was sending semi-parsed ASTM data as raw text, which produced unreliable outputs.

Resolution: We designed a lightweight middleware layer (Node.js service) that sits between the LIMS and Claude API. The middleware performs three functions: (1) receives ASTM-formatted data from the LIMS via TCP/IP (standard LIMS communication protocol), (2) parses it into clean, structured JSON with proper field mapping, and (3) constructs optimized Claude API requests with relevant context. We assigned a dedicated integration support engineer who worked directly with BrightPath's team for a 2-week sprint to build and test the middleware.

Outcome: After validation with 500 test samples, the pipeline went live with 99.7% accuracy on sample classification and result interpretation. Processing time dropped from 12 minutes (manual) to 45 seconds (automated). BrightPath's health score recovered from 60 to 78 within 6 weeks of the resolution. The middleware pattern has since been documented as our standard approach for LIMS integrations.`,
    },
  ];

  await db.insert(schema.knowledgeArticles).values(knowledgeArticles);
  console.log(`  ✓ Inserted ${knowledgeArticles.length} knowledge articles`);

  // ══════════════════════════════════════════════════════
  // STEP 6: Insert 8 customer messages
  // ══════════════════════════════════════════════════════
  console.log("\n📧 Inserting customer messages...");

  const customerMessages = [
    // Message 1: Harbor Compliance — CHURN SIGNAL
    {
      companyId: HARBOR_COMPLIANCE_ID,
      contactId: HARBOR_CONTACT_1_ID,
      dealId: HARBOR_DEAL_ID,
      subject: "Quick question about our contract",
      body: `Hi Sarah,

I hope this finds you well. I'm Amanda Chen — I recently stepped into the COO role here at Harbor Compliance Group. I've been spending my first couple of months getting up to speed on all of our vendor relationships and technology investments.

I'm reviewing our Anthropic contract and wanted to understand a few things. We're currently paying $520K annually for Claude Enterprise, and I'd like to get a better sense of what we're getting for that investment. My predecessor set this up, and while I can see we have the platform deployed, I don't have great visibility into how much value the team is actually getting from it.

Could you put together a summary of our usage and any ROI metrics you have? I'd like to make an informed decision about this as we approach our renewal window. I'm open to continuing the relationship, but I need to justify the spend to our board.

Thanks,
Amanda Chen
COO, Harbor Compliance Group`,
      channel: "email",
      receivedAt: daysAgo(2),
      priority: "high",
      status: "kit_ready",
      aiCategory: "renewal_discussion",
      responseKit: {
        message_analysis: {
          category: "renewal_discussion",
          urgency: "high",
          sentiment: "concerned",
          underlying_concern: "New executive reviewing all vendor contracts — may consolidate vendors to demonstrate cost discipline to board. Does not have the relationship or context that the previous champion had.",
        },
        similar_resolutions: [
          {
            company: "Redwood Capital Partners",
            situation: "CFO departed mid-contract, new Managing Director reviewed all vendor spend",
            outcome: "Renewed at 115% after executive briefing with quantified ROI metrics showing 3x analyst throughput and $1.2M annualized time savings",
            relevance: "Nearly identical pattern — champion departure followed by new executive contract review",
          },
          {
            company: "Lighthouse Insurance",
            situation: "Approaching renewal with declining engagement metrics",
            outcome: "Proactive QBR with usage data and business impact analysis helped secure renewal",
            relevance: "Similar renewal pressure, though Harbor's situation is more acute due to the leadership change",
          },
        ],
        recommended_resources: [
          { title: "Executive Sponsor Engagement Framework", reason: "Contains the 'New Executive Brief' format specifically designed for leadership transitions" },
          { title: "Resolution: Stakeholder Transition During Contract Renewal", reason: "Redwood Capital case study — exact same pattern, proven resolution approach" },
        ],
        draft_reply: `Hi Amanda,

Congratulations on the COO role — that's a well-deserved move, and I'm looking forward to working with you.

Great question, and I'm happy to pull this together. Your compliance team has been one of our most active users — they've processed over 2,400 regulatory reviews through Claude this quarter, which is a significant increase from the manual baseline. The analysts I've spoken with report meaningful time savings on their review workflows.

I'd love to walk you through the full usage dashboard and impact metrics in person. Would you have 30 minutes this week or next for a quick call? I'll bring the data and can answer any questions about how the platform fits into Harbor's workflow.

Looking forward to connecting.

Best,
Sarah`,
        internal_notes: "HIGH CHURN RISK. This is the #1 churn pattern: champion departure + contract inquiry from new executive. Amanda's tone is professional but detached — she has no emotional investment in the platform. Strong usage data is our best defense. The compliance team IS getting value (2,400+ reviews/quarter) but Amanda doesn't know that yet. Priority: get in front of her within 5 business days with concrete ROI numbers. Use the Redwood playbook — lead with business impact, not product features. Do NOT be defensive about the renewal. Frame the meeting as 'helping you get up to speed on your team's tools.'",
      },
    },
    // Message 2: Pinnacle Biotech — TECHNICAL ISSUE
    {
      companyId: PINNACLE_BIOTECH_ID,
      contactId: PINNACLE_CONTACT_1_ID,
      dealId: PINNACLE_DEAL_ID,
      subject: "Integration failing with our LIMS system",
      body: `Sarah,

We have a serious problem. Our LIMS integration with Claude API has been failing for the past 3 days. The sample processing pipeline is completely blocked — our lab techs are having to process everything manually, which is eating up hours of time we don't have.

Our engineering team has been troubleshooting around the clock. The issue seems to be with how our LIMS data format interacts with the API. We're getting malformed response errors on about 40% of our API calls, and the ones that do succeed are returning inconsistent results that we can't trust in a production lab environment.

I'll be honest — this was supposed to be production-ready two weeks ago. We committed to our leadership team that this integration would be live by end of March, and now we're looking at significant delays. Some of my engineers are starting to question whether Claude API is the right fit for our lab automation workflow.

We need this resolved immediately. What can your team do?

Jake Morrison
VP Engineering, Pinnacle Biotech`,
      channel: "email",
      receivedAt: daysAgo(1),
      priority: "urgent",
      status: "kit_ready",
      aiCategory: "technical_issue",
      responseKit: {
        message_analysis: {
          category: "technical_issue",
          urgency: "critical",
          sentiment: "frustrated",
          underlying_concern: "Questioning whether Claude API is reliable enough for production lab workflows. Leadership credibility is on the line — Jake committed to a timeline he's now missing.",
        },
        similar_resolutions: [
          {
            company: "BrightPath Diagnostics",
            situation: "Exact same LIMS integration failure — ASTM/LDT data format incompatible with JSON API input",
            outcome: "Resolved with middleware approach: LIMS → data transformer → Claude API. Pipeline went live with 99.7% accuracy. Processing time dropped from 12 min to 45 sec per sample.",
            relevance: "This is the same technical problem. The BrightPath middleware pattern directly applies.",
          },
          {
            company: "Cascadia Life Sciences",
            situation: "Slow onboarding with low team adoption, integration challenges in first month",
            outcome: "Dedicated integration support and hands-on onboarding sessions recovered adoption",
            relevance: "Similar onboarding-phase frustration, resolved with high-touch support",
          },
        ],
        recommended_resources: [
          { title: "Resolution: LIMS Integration Failure in Biotech", reason: "BrightPath Diagnostics case study — exact same LIMS integration issue with proven resolution" },
          { title: "API Integration Best Practices for Healthcare Systems", reason: "Contains data format transformation patterns applicable to lab systems" },
        ],
        draft_reply: `Jake,

I hear you — this is exactly the kind of issue that needs immediate attention, and I take full responsibility for getting it resolved.

Here's what I want you to know: we've seen this exact LIMS integration challenge before. Our BrightPath Diagnostics team hit the same wall with ASTM data format compatibility, and we resolved it completely. The root cause was a data transformation gap between the LIMS output format and our API's JSON input — not a fundamental platform limitation.

Here's what I'm proposing:
1. Emergency call today — I'm pulling in our integration support engineer who worked on the BrightPath resolution. Can your team do 2pm or 4pm today?
2. I'll send over the BrightPath middleware architecture doc within the hour so your engineers can review before the call.
3. We'll assign a dedicated integration engineer to work directly with your team until this is resolved — I'm targeting a 5 business day resolution window.

The solution that worked for BrightPath was a lightweight middleware layer that translates LIMS data into clean JSON before hitting our API. It took about 2 weeks to build and test, and they're now running at 99.7% accuracy with 45-second processing times.

This is my top priority. Let me know which time works for the call today.

Sarah`,
        internal_notes: "MEDIUM CHURN RISK during onboarding. Technical frustration is recoverable IF we respond within 24 hours. The BrightPath middleware playbook directly applies — same ASTM/LDT data format issue. Jake is frustrated but still engaged (he's emailing us, not ghosting). Key: assign dedicated integration support immediately. Do NOT let this go through normal support channels. If we can resolve this in 2 weeks, we save the account and turn Jake into a champion. If we don't, his engineers will push for an alternative platform.",
      },
    },
    // Message 3: Pacific Coast Medical — RENEWAL
    {
      companyId: PACIFIC_COAST_ID,
      contactId: PACIFIC_CONTACT_1_ID,
      dealId: PACIFIC_DEAL_ID,
      subject: "API usage review before our renewal",
      body: `Hi Sarah,

With our renewal coming up in about 6 weeks, I wanted to touch base about our API usage. Looking at our internal metrics, usage has been lower than we initially projected when we signed the contract. I know we had big plans for the clinical documentation workflows, but adoption has been slower than expected across our physician group.

I'm not ready to say we're not renewing — the physicians who ARE using Claude love it. But I need to understand whether we're set up to get more value in the next year before I can justify the spend internally. Our CMO is going to ask me pointed questions about the ROI.

Can we set up a call to review usage data and talk about what we can do differently?

Best,
Dr. Sarah Martinez
CMIO, Pacific Coast Medical Group`,
      channel: "email",
      receivedAt: daysAgo(4),
      priority: "high",
      status: "kit_ready",
      aiCategory: "renewal_discussion",
      responseKit: {
        message_analysis: {
          category: "renewal_discussion",
          urgency: "high",
          sentiment: "open_but_cautious",
          underlying_concern: "Usage below projections, needs ammunition to justify renewal to CMO. The positive signal is that active users are satisfied — this is an adoption problem, not a product problem.",
        },
        similar_resolutions: [
          {
            company: "Meridian Health Network",
            situation: "Similar-sized healthcare network, achieved 85% health score with strong API adoption",
            outcome: "Active usage of 52,000 API calls/month with 90% seat utilization after prompt engineering workshop and department-specific use case coaching",
            relevance: "Shows what good adoption looks like in a similar healthcare org — can serve as the target state",
          },
        ],
        recommended_resources: [
          { title: "Prompt Engineering Workshop Guide", reason: "Workshop format proven to increase adoption by 40% in the following month" },
          { title: "First 30 Days: Customer Onboarding Checklist", reason: "Even though they're past onboarding, the adoption milestones can identify what was missed" },
          { title: "Driving Adoption Beyond the Initial Team", reason: "Strategies for expanding usage across their physician group" },
        ],
        draft_reply: `Hi Dr. Martinez,

Thank you for being upfront about this — it's exactly the kind of conversation I want to have before renewal, not after.

You're right that overall usage is below what we projected, but the signal I'm most encouraged by is that the physicians who are using Claude are getting real value from it. That tells me this is an adoption challenge, not a product fit issue — and adoption is something we can solve together.

I'd like to propose a two-part approach:
1. Usage review call this week — I'll pull together your complete usage dashboard, highlight the top use cases from your most active physicians, and benchmark against similar medical groups (I have a great comparison from a network about your size that's seeing 88% physician adoption).
2. Adoption acceleration plan — based on what we find, I'll put together a 60-day plan that could include a hands-on prompt engineering workshop for your physician group and department-specific use case coaching.

I want to make sure you have a strong story for your CMO. Would Thursday or Friday work for the usage review?

Best,
Sarah`,
        internal_notes: "Renewal at risk but recoverable. Dr. Martinez is not hostile — she wants to renew but needs justification. Usage metrics are weak (18K calls/month, down 23%) but physician satisfaction is high. The play: (1) quantify the value the active users ARE getting, (2) benchmark against Meridian Health to show what's possible, (3) propose a prompt engineering workshop to boost adoption. If we can get adoption from 40% to 70% in the next 45 days, the renewal is secure.",
      },
    },
    // Message 4: Cascade Supply Chain — ESCALATION
    {
      companyId: CASCADE_SUPPLY_ID,
      contactId: CASCADE_CONTACT_1_ID,
      dealId: CASCADE_DEAL_ID,
      subject: "Ongoing latency issues still not resolved",
      body: `Sarah,

This is the third time I'm raising this issue, and honestly, I'm running out of patience.

Our batch processing API calls for supply chain optimization are consistently taking 3-4x longer than what was promised during the sales process. We were told to expect sub-2-second response times for our standard queries, but we're regularly seeing 6-8 seconds, and during peak hours it spikes to 12+ seconds. This is materially impacting our logistics planning workflow — our operations team can't wait that long for route optimization results.

I've filed two support tickets already. The first one was closed with a suggestion to "optimize our prompts" (we did, no improvement). The second one was escalated but I haven't heard back in 5 days.

I need a concrete resolution plan by end of this week, or we're going to start evaluating alternatives. We have a $420K contract and I expect the support experience to match.

Tom Harris
CTO, Cascade Supply Chain`,
      channel: "support_ticket",
      receivedAt: daysAgo(1),
      priority: "urgent",
      status: "kit_ready",
      aiCategory: "escalation",
      responseKit: {
        message_analysis: {
          category: "escalation",
          urgency: "critical",
          sentiment: "angry",
          underlying_concern: "Third escalation with no resolution. Trust is eroding. The threat to evaluate alternatives is real — CTOs don't make that threat casually at $420K.",
        },
        similar_resolutions: [
          {
            company: "Meridian Health Network",
            situation: "API latency 3-5x expected in high-volume healthcare environment",
            outcome: "Resolved with connection pooling and regional endpoint migration — median response time dropped from 3.2s to 1.1s",
            relevance: "Same root cause pattern — high-volume batch processing with connection overhead. Different vertical but identical technical solution.",
          },
        ],
        recommended_resources: [
          { title: "Resolution: API Latency in High-Volume Healthcare Environments", reason: "Different vertical, same root cause — connection pooling and regional endpoint optimization" },
          { title: "Troubleshooting API Rate Limits and Usage Optimization", reason: "Contains batching and caching strategies for high-volume deployments" },
        ],
        draft_reply: `Tom,

I owe you an apology. Three escalations without resolution is not acceptable, and I take personal responsibility for the support experience not matching the level of partnership you deserve at this contract level.

Here's what I'm doing immediately:
1. I'm pulling your case out of standard support and assigning a dedicated performance engineer starting today.
2. I've already reviewed your usage patterns and I believe the root cause is the same issue we resolved for another high-volume customer — connection overhead on batch requests. We cut their response times by 65% in a 3-day sprint.
3. I'd like to get your engineering team on a call tomorrow with our performance engineer to diagnose and implement the fix. Can you make time between 10am-2pm?

The specific fix that worked before: HTTP/2 connection pooling with persistent connections (eliminates per-request TLS overhead) plus migration to a regional endpoint closer to your infrastructure. For your batch processing workload, we'll also implement request batching to smooth traffic distribution.

I'll send you a written resolution plan by EOD today with timeline and milestones. You should see measurable improvement within 3 business days.

Sarah`,
        internal_notes: "URGENT — account at risk. Tom is a CTO making explicit threats at $420K ARR. Three unresolved escalations is a support failure. Apply the Meridian latency playbook (connection pooling + regional endpoint). The batch processing workload is the key — they're likely creating new connections per request and routing through the global endpoint. This is a 3-day technical fix if we assign the right engineer. Priority: acknowledge the failure, take personal ownership, and deliver a concrete plan by EOD. Do NOT route through normal support again.",
      },
    },
    // Message 5: Cascadia Life Sciences — ADOPTION
    {
      companyId: CASCADIA_ID,
      contactId: CASCADIA_CONTACT_1_ID,
      dealId: CASCADIA_DEAL_ID,
      subject: "Our team isn't using the API — what are we doing wrong?",
      body: `Hi Sarah,

We're about 3 weeks into our deployment and I'm struggling with adoption. Out of the 8 seats we licensed, only 2 people are actively using the API (myself included). The rest of the team signed up during the first week and then just... stopped.

I've tried sharing some of my prompts and use cases with the team, but I'm getting a lot of "I'll try it later" responses. I think part of the problem is that most of our data scientists are used to working with traditional ML pipelines, and they're not sure how Claude fits into their existing workflows.

I know we're still early, but I don't want to be 3 months in with the same problem. What have other customers done to get their teams actually using this? Is there a training program or something we could do?

Thanks,
Kevin Wu
Data Engineering Lead, Cascadia Life Sciences`,
      channel: "email",
      receivedAt: daysAgo(3),
      priority: "high",
      status: "kit_ready",
      aiCategory: "adoption_help",
      responseKit: {
        message_analysis: {
          category: "adoption_help",
          urgency: "high",
          sentiment: "concerned_but_engaged",
          underlying_concern: "Classic onboarding adoption gap — the champion is using the product but can't get the rest of the team to engage. Without intervention, this becomes a renewal risk.",
        },
        similar_resolutions: [
          {
            company: "Summit Genomics",
            situation: "Small bioinformatics team, 100% seat utilization achieved within 2 months",
            outcome: "Prompt engineering workshop + role-specific use cases drove full team adoption. Now a 90 health score account requesting expansion.",
            relevance: "Similar team size, similar data science/bioinformatics audience, proven adoption approach",
          },
        ],
        recommended_resources: [
          { title: "First 30 Days: Customer Onboarding Checklist", reason: "Week 2 milestone: 3+ team members making API calls. Cascadia is behind — need immediate intervention" },
          { title: "Prompt Engineering Workshop Guide", reason: "Workshops increase adoption 40% in the following month. Perfect for data science teams." },
          { title: "Driving Adoption Beyond the Initial Team", reason: "Champion development and the 'Show Don't Tell' approach" },
        ],
        draft_reply: `Hi Kevin,

First — the fact that you're raising this at week 3 is actually great. This is exactly the right time to course-correct, and we have a proven playbook for it.

What you're describing is something we see often with data science teams: they're experts in their existing tools and need to see how Claude fits into (not replaces) their workflows. The key is making it concrete and role-specific.

Here's what I'd like to propose:
1. Prompt Engineering Workshop — a 2-hour hands-on session where each person on your team brings a real task from their daily work and we build prompts together. We ran this with Summit Genomics (similar bioinformatics team) and went from partial adoption to 100% seat utilization in 6 weeks.
2. Role-specific use case guide — I'll put together a short doc showing how data scientists at similar biotech companies are using Claude for tasks like variant interpretation, literature review, and pipeline documentation.
3. Weekly office hours — for the next 4 weeks, I'll set up a 30-minute slot where your team can drop in and get help with whatever they're working on.

Can we schedule the workshop for next week? I'd suggest blocking 2 hours when the whole team can join.

Sarah`,
        internal_notes: "Onboarding risk — but Kevin is engaged and asking for help, which is the best possible signal at this stage. The Summit Genomics playbook applies directly. Schedule the workshop ASAP — every week of delay increases the risk that the team forms the habit of NOT using Claude. The 'data scientists skeptical of LLMs' pattern is common and resolved through hands-on demonstration with their actual workflows, not slides about capabilities.",
      },
    },
    // Message 6: Atlas Retail Group — EXPANSION
    {
      companyId: ATLAS_RETAIL_ID,
      contactId: ATLAS_CONTACT_1_ID,
      dealId: ATLAS_DEAL_ID,
      subject: "Can our merchandising team use Cowork?",
      body: `Hi Sarah,

Quick question — our operations team has been loving Claude API (as you know!), and word has gotten around to our merchandising team. They're really interested in using AI for things like product description writing, trend analysis summaries, and vendor communication drafts.

The challenge is that the merchandising team isn't technical — they can't write API calls or code. Someone mentioned that Anthropic has a product called "Cowork" that's more of a visual workspace. Is that something we could add to our contract?

If so, I'd love to set up a demo for the merchandising team leads. There are about 15 people on the team.

Best,
Maria Santos
Director of Operations, Atlas Retail Group`,
      channel: "email",
      receivedAt: daysAgo(5),
      priority: "medium",
      status: "kit_ready",
      aiCategory: "feature_request",
      responseKit: {
        message_analysis: {
          category: "feature_request",
          urgency: "medium",
          sentiment: "enthusiastic",
          underlying_concern: "This is NOT a support issue — this is an EXPANSION OPPORTUNITY. Organic demand from a non-technical team. The 15-person merchandising team represents a potential $75K-100K seat expansion.",
        },
        similar_resolutions: [],
        recommended_resources: [
          { title: "Cowork for Non-Technical Teams", reason: "Getting started guide for deploying Cowork to non-technical departments — exactly what the merchandising team needs" },
          { title: "Multi-Department Rollout Playbook", reason: "Phase 2 expansion playbook for going from one department to multiple" },
        ],
        draft_reply: `Hi Maria,

This is fantastic to hear — there's nothing better than organic demand from another team. Yes, Cowork is exactly what your merchandising team needs.

Cowork is our collaborative AI workspace designed for non-technical teams. It gives users a familiar document-editor experience where they can do everything from product description writing to trend analysis — no coding required. It integrates with your existing tools (Google Docs, Word) and includes team-specific templates.

Here's what I'd suggest:
1. Quick demo for the merchandising leads — I can show them exactly how it would work for their use cases (product descriptions, trend summaries, vendor comms). 30 minutes, and I'll customize the demo with retail examples.
2. Pilot program — start with 5 users for 2 weeks to validate the use cases before rolling out to all 15.
3. Pricing — Cowork is licensed per-seat and we offer volume discounts. I can add it to your existing contract as an expansion.

Would next Tuesday or Wednesday work for the demo? I'll send a calendar invite once you confirm.

Sarah`,
        internal_notes: "EXPANSION OPPORTUNITY — this is the ideal organic expansion signal. Maria is bringing us demand we didn't have to create. 15 merchandising seats at Cowork pricing represents $75K-100K additional ARR. Move fast: schedule the demo within 5 business days, run a pilot, and close the expansion before end of quarter. Atlas is currently a 77 health score with stable engagement — this expansion could push them to 85+. CC the account team on the demo invite.",
      },
    },
    // Message 7: Vertex Pharmaceuticals — PENDING (no kit)
    {
      companyId: VERTEX_PHARMA_ID,
      contactId: VERTEX_CONTACT_1_ID,
      dealId: VERTEX_DEAL_ID,
      subject: "Expanding Claude to our clinical trials team",
      body: `Hi Sarah,

I've been discussing Claude API with our clinical trials team, and they're very interested in exploring it for protocol analysis and literature review. Currently, our research team is the primary user, but the clinical operations group sees a clear application for automating some of their more repetitive document-heavy tasks.

Before we proceed, I need to understand a few things:
1. What does licensing look like for adding another team? Are there volume discounts?
2. Our clinical trials data is subject to FDA 21 CFR Part 11 compliance — how does Claude handle regulated data workflows?
3. Can we set up a separate workspace for the clinical team with its own access controls?

I'd appreciate any guidance you can provide. Happy to set up a call if it's easier to discuss.

Best regards,
Dr. Raj Patel
Research Director, Vertex Pharmaceuticals R&D`,
      channel: "email",
      receivedAt: daysAgo(6),
      priority: "medium",
      status: "pending",
      aiCategory: "feature_request",
      responseKit: null,
    },
    // Message 8: Lighthouse Insurance — PENDING (no kit)
    {
      companyId: LIGHTHOUSE_ID,
      contactId: LIGHTHOUSE_CONTACT_1_ID,
      dealId: LIGHTHOUSE_DEAL_ID,
      subject: "Updated SOC 2 documentation needed",
      body: `Hi Sarah,

We're in the middle of our annual compliance audit and our auditors are requesting updated SOC 2 Type II documentation from all our technology vendors. Could you send over the most recent report?

We also need:
- Current data processing addendum
- Updated sub-processor list
- Business continuity / disaster recovery documentation

Our audit window closes in 3 weeks so I'd appreciate getting these as soon as possible.

Thanks,
Lisa Park
Compliance Director, Lighthouse Insurance`,
      channel: "email",
      receivedAt: daysAgo(8),
      priority: "medium",
      status: "pending",
      aiCategory: "adoption_help",
      responseKit: null,
    },
  ];

  await db.insert(schema.customerMessages).values(customerMessages);
  console.log(`  ✓ Inserted ${customerMessages.length} customer messages`);

  console.log("\n✅ Post-sale book of business seed complete!");
  console.log(`   Companies: ${companies.length}`);
  console.log(`   Contacts: ${contacts.length}`);
  console.log(`   Deals: ${deals.length}`);
  console.log(`   Account Health: ${healthRecords.length}`);
  console.log(`   Knowledge Articles: ${knowledgeArticles.length}`);
  console.log(`   Customer Messages: ${customerMessages.length}`);

  process.exit(0);
}

seedBook().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
