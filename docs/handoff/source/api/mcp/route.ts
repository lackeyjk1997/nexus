export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  deals,
  companies,
  contacts,
  teamMembers,
  meddpiccFields,
  activities,
  dealFitnessEvents,
  dealFitnessScores,
  dealAgentStates,
} from "@nexus/db";
import { eq, desc, sql } from "drizzle-orm";

// ─── CORS headers ────────────────────────────────────────────────────────────

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID",
  "Access-Control-Expose-Headers": "Mcp-Session-Id",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";
}

function textResult(data: unknown) {
  return {
    content: [
      { type: "text" as const, text: JSON.stringify(data, null, 2) },
    ],
  };
}

function errorResult(message: string) {
  return {
    content: [{ type: "text" as const, text: `Error: ${message}` }],
    isError: true as const,
  };
}

/**
 * Fuzzy-resolve a deal from a free-form name string.
 *
 * Matches against both deals.name and companies.name via SQL ILIKE.
 * If multiple matches, prefers exact name match, then shortest (most specific) name.
 */
async function resolveDealByName(name: string) {
  const like = `%${name}%`;
  const results = await db
    .select({
      id: deals.id,
      name: deals.name,
      companyId: deals.companyId,
      companyName: companies.name,
      assignedAeId: deals.assignedAeId,
    })
    .from(deals)
    .leftJoin(companies, eq(deals.companyId, companies.id))
    .where(sql`${deals.name} ILIKE ${like} OR ${companies.name} ILIKE ${like}`)
    .limit(5);

  if (results.length === 0) return null;
  if (results.length === 1) return results[0];
  const exact = results.find((r) => r.name.toLowerCase() === name.toLowerCase());
  return exact || results.sort((a, b) => a.name.length - b.name.length)[0];
}

async function findSarahChenId(): Promise<string | null> {
  const [row] = await db
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .where(eq(teamMembers.name, "Sarah Chen"))
    .limit(1);
  return row?.id ?? null;
}

// ─── Tool handlers ───────────────────────────────────────────────────────────

async function getPipeline(args: { assignedTo?: string }) {
  try {
    const rows = await db
      .select({
        id: deals.id,
        name: deals.name,
        stage: deals.stage,
        dealValue: deals.dealValue,
        currency: deals.currency,
        closeDate: deals.closeDate,
        winProbability: deals.winProbability,
        forecastCategory: deals.forecastCategory,
        vertical: deals.vertical,
        product: deals.product,
        companyName: companies.name,
        companyIndustry: companies.industry,
        aeName: teamMembers.name,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
        contactTitle: contacts.title,
      })
      .from(deals)
      .leftJoin(companies, eq(deals.companyId, companies.id))
      .leftJoin(teamMembers, eq(deals.assignedAeId, teamMembers.id))
      .leftJoin(contacts, eq(deals.primaryContactId, contacts.id));

    const filtered = args.assignedTo
      ? rows.filter((r) =>
          (r.aeName ?? "").toLowerCase().includes(args.assignedTo!.toLowerCase())
        )
      : rows;

    const open = filtered.filter(
      (d) => d.stage !== "closed_won" && d.stage !== "closed_lost"
    );
    const totalPipeline = open.reduce(
      (sum, d) => sum + Number(d.dealValue || 0),
      0
    );
    const commitCount = filtered.filter((d) => d.forecastCategory === "commit")
      .length;
    const closedWon = filtered.filter((d) => d.stage === "closed_won").length;
    const closedLost = filtered.filter((d) => d.stage === "closed_lost").length;

    const fmtMillions = (n: number) => `$${(n / 1_000_000).toFixed(2)}M`;

    return textResult({
      summary: {
        totalDeals: filtered.length,
        openDeals: open.length,
        totalPipelineUsd: totalPipeline,
        totalPipelineFormatted: fmtMillions(totalPipeline),
        commitCount,
        closedWonCount: closedWon,
        closedLostCount: closedLost,
      },
      summaryLine: `${filtered.length} deals, ${fmtMillions(totalPipeline)} open pipeline, ${commitCount} in commit${args.assignedTo ? ` (filtered to AE matching "${args.assignedTo}")` : ""}.`,
      deals: filtered.map((d) => ({
        id: d.id,
        name: d.name,
        company: d.companyName,
        industry: d.companyIndustry,
        stage: d.stage,
        dealValue: d.dealValue ? Number(d.dealValue) : null,
        dealValueFormatted: d.dealValue
          ? `$${Number(d.dealValue).toLocaleString("en-US")}`
          : null,
        currency: d.currency,
        closeDate: d.closeDate,
        winProbability: d.winProbability,
        forecastCategory: d.forecastCategory,
        vertical: d.vertical,
        product: d.product,
        ae: d.aeName,
        primaryContact:
          d.contactFirstName && d.contactLastName
            ? `${d.contactFirstName} ${d.contactLastName}${d.contactTitle ? `, ${d.contactTitle}` : ""}`
            : null,
      })),
    });
  } catch (err) {
    return errorResult(err instanceof Error ? err.message : String(err));
  }
}

async function getDealDetails(args: { dealName: string }) {
  try {
    const deal = await resolveDealByName(args.dealName);
    if (!deal) return errorResult(`No deal found matching "${args.dealName}"`);

    const [
      dealRows,
      meddpiccRows,
      fitnessRows,
      fitnessEvents,
      agentStateRows,
      recentActivities,
      allContacts,
    ] = await Promise.all([
      db
        .select({
          id: deals.id,
          name: deals.name,
          stage: deals.stage,
          dealValue: deals.dealValue,
          currency: deals.currency,
          closeDate: deals.closeDate,
          winProbability: deals.winProbability,
          forecastCategory: deals.forecastCategory,
          vertical: deals.vertical,
          product: deals.product,
          competitor: deals.competitor,
          createdAt: deals.createdAt,
          stageEnteredAt: deals.stageEnteredAt,
          companyName: companies.name,
          companyDomain: companies.domain,
          companyIndustry: companies.industry,
          companyEmployeeCount: companies.employeeCount,
          aeName: teamMembers.name,
          aeEmail: teamMembers.email,
        })
        .from(deals)
        .leftJoin(companies, eq(deals.companyId, companies.id))
        .leftJoin(teamMembers, eq(deals.assignedAeId, teamMembers.id))
        .where(eq(deals.id, deal.id))
        .limit(1),
      db
        .select()
        .from(meddpiccFields)
        .where(eq(meddpiccFields.dealId, deal.id))
        .limit(1),
      db
        .select()
        .from(dealFitnessScores)
        .where(eq(dealFitnessScores.dealId, deal.id))
        .limit(1),
      db
        .select()
        .from(dealFitnessEvents)
        .where(eq(dealFitnessEvents.dealId, deal.id)),
      db
        .select()
        .from(dealAgentStates)
        .where(eq(dealAgentStates.dealId, deal.id))
        .limit(1),
      db
        .select({
          id: activities.id,
          type: activities.type,
          subject: activities.subject,
          description: activities.description,
          createdAt: activities.createdAt,
          contactName: contacts.firstName,
        })
        .from(activities)
        .leftJoin(contacts, eq(activities.contactId, contacts.id))
        .where(eq(activities.dealId, deal.id))
        .orderBy(desc(activities.createdAt))
        .limit(10),
      deal.companyId
        ? db
            .select({
              id: contacts.id,
              firstName: contacts.firstName,
              lastName: contacts.lastName,
              title: contacts.title,
              email: contacts.email,
              roleInDeal: contacts.roleInDeal,
              isPrimary: contacts.isPrimary,
            })
            .from(contacts)
            .where(eq(contacts.companyId, deal.companyId))
        : Promise.resolve([] as Array<{
            id: string;
            firstName: string | null;
            lastName: string | null;
            title: string | null;
            email: string | null;
            roleInDeal: string | null;
            isPrimary: boolean | null;
          }>),
    ]);

    const [dealRow] = dealRows;
    const [meddpicc] = meddpiccRows;
    const [fitness] = fitnessRows;
    const [agentState] = agentStateRows;

    return textResult({
      dealResolved: {
        id: deal.id,
        name: deal.name,
        company: deal.companyName,
      },
      deal: dealRow
        ? {
            ...dealRow,
            dealValueFormatted: dealRow.dealValue
              ? `$${Number(dealRow.dealValue).toLocaleString("en-US")}`
              : null,
          }
        : null,
      stakeholders: allContacts,
      meddpicc: meddpicc ?? null,
      fitness: {
        scores: fitness ?? null,
        events: fitnessEvents.map((e) => ({
          id: e.id,
          fitCategory: e.fitCategory,
          eventKey: e.eventKey,
          eventLabel: e.eventLabel,
          status: e.status,
          confidence: e.confidence,
          detectedAt: e.detectedAt,
          contactName: e.contactName,
          evidenceSnippets: e.evidenceSnippets,
        })),
      },
      agentIntelligence: agentState
        ? {
            learnings: agentState.learnings ?? [],
            riskSignals: agentState.riskSignals ?? [],
            competitiveContext: agentState.competitiveContext ?? null,
            coordinatedIntel: agentState.coordinatedIntel ?? [],
            interactionCount: agentState.interactionCount,
            lastInteractionDate: agentState.lastInteractionDate,
            lastInteractionSummary: agentState.lastInteractionSummary,
          }
        : null,
      recentActivities,
    });
  } catch (err) {
    return errorResult(err instanceof Error ? err.message : String(err));
  }
}

async function generateCallPrep(args: {
  dealName: string;
  prepContext?: string;
  attendeeNames?: string[];
}) {
  try {
    const deal = await resolveDealByName(args.dealName);
    if (!deal) return errorResult(`No deal found matching "${args.dealName}"`);

    const memberId = await findSarahChenId();
    if (!memberId) return errorResult("Sarah Chen not found in team members");

    let attendeeIds: string[] = [];
    if (args.attendeeNames && args.attendeeNames.length > 0 && deal.companyId) {
      const companyContacts = await db
        .select({
          id: contacts.id,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          title: contacts.title,
        })
        .from(contacts)
        .where(eq(contacts.companyId, deal.companyId));

      attendeeIds = args.attendeeNames
        .map((n) => {
          const lower = n.toLowerCase();
          const match = companyContacts.find((c) => {
            const fullName =
              `${c.firstName ?? ""} ${c.lastName ?? ""}`.toLowerCase().trim();
            return (
              fullName.includes(lower) ||
              (c.title ?? "").toLowerCase().includes(lower)
            );
          });
          return match?.id;
        })
        .filter((id): id is string => typeof id === "string");
    }

    const response = await fetch(`${baseUrl()}/api/agent/call-prep`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dealId: deal.id,
        memberId,
        prepContext: args.prepContext || undefined,
        attendeeIds: attendeeIds.length > 0 ? attendeeIds : undefined,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return errorResult(
        `call-prep failed: ${response.status} ${response.statusText}${errText ? ` — ${errText}` : ""}`
      );
    }

    const data = await response.json();
    return textResult({
      dealResolved: {
        id: deal.id,
        name: deal.name,
        company: deal.companyName,
      },
      attendeesResolved: attendeeIds,
      callPrep: data,
    });
  } catch (err) {
    return errorResult(err instanceof Error ? err.message : String(err));
  }
}

async function getDealFitness(args: { dealName: string }) {
  try {
    const deal = await resolveDealByName(args.dealName);
    if (!deal) return errorResult(`No deal found matching "${args.dealName}"`);

    const [scoresRows, eventRows] = await Promise.all([
      db
        .select()
        .from(dealFitnessScores)
        .where(eq(dealFitnessScores.dealId, deal.id))
        .limit(1),
      db
        .select()
        .from(dealFitnessEvents)
        .where(eq(dealFitnessEvents.dealId, deal.id))
        .orderBy(desc(dealFitnessEvents.detectedAt)),
    ]);

    const [scores] = scoresRows;

    if (!scores) {
      return textResult({
        dealResolved: {
          id: deal.id,
          name: deal.name,
          company: deal.companyName,
        },
        scores: null,
        events: [],
        message:
          "No deal fitness analysis has been run for this deal yet. Run the transcript pipeline to generate fitness scores.",
      });
    }

    const grouped: Record<string, typeof eventRows> = {
      business_fit: [],
      emotional_fit: [],
      technical_fit: [],
      readiness_fit: [],
    };
    for (const e of eventRows) {
      if (grouped[e.fitCategory]) grouped[e.fitCategory].push(e);
    }

    return textResult({
      dealResolved: {
        id: deal.id,
        name: deal.name,
        company: deal.companyName,
      },
      scores: {
        overallFitness: scores.overallFitness,
        velocityTrend: scores.velocityTrend,
        daysSinceLastEvent: scores.daysSinceLastEvent,
        fitImbalanceFlag: scores.fitImbalanceFlag,
        eventsThisWeek: scores.eventsThisWeek,
        eventsLastWeek: scores.eventsLastWeek,
        categories: {
          business_fit: {
            score: scores.businessFitScore,
            detected: scores.businessFitDetected,
            total: scores.businessFitTotal,
          },
          emotional_fit: {
            score: scores.emotionalFitScore,
            detected: scores.emotionalFitDetected,
            total: scores.emotionalFitTotal,
          },
          technical_fit: {
            score: scores.technicalFitScore,
            detected: scores.technicalFitDetected,
            total: scores.technicalFitTotal,
          },
          readiness_fit: {
            score: scores.readinessFitScore,
            detected: scores.readnessFitDetected,
            total: scores.readinessFitTotal,
          },
        },
        buyerMomentum: scores.buyerMomentum,
        conversationSignals: scores.conversationSignals,
        stakeholderEngagement: scores.stakeholderEngagement,
        benchmarkVsWon: scores.benchmarkVsWon,
      },
      eventsByCategory: Object.fromEntries(
        Object.entries(grouped).map(([category, items]) => [
          category,
          items.map((e) => ({
            eventKey: e.eventKey,
            eventLabel: e.eventLabel,
            status: e.status,
            confidence: e.confidence,
            detectedAt: e.detectedAt,
            contactName: e.contactName,
            evidenceSnippets: e.evidenceSnippets,
          })),
        ])
      ),
    });
  } catch (err) {
    return errorResult(err instanceof Error ? err.message : String(err));
  }
}

async function logObservation(args: {
  observation: string;
  dealName?: string;
  context?: string;
}) {
  try {
    const memberId = await findSarahChenId();
    if (!memberId) return errorResult("Sarah Chen not found in team members");

    let dealId: string | undefined;
    let accountId: string | undefined;
    let dealResolved: { id: string; name: string; company: string | null } | null = null;

    if (args.dealName) {
      const deal = await resolveDealByName(args.dealName);
      if (deal) {
        dealId = deal.id;
        accountId = deal.companyId ?? undefined;
        dealResolved = {
          id: deal.id,
          name: deal.name,
          company: deal.companyName ?? null,
        };
      }
    }

    const response = await fetch(`${baseUrl()}/api/observations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rawInput: args.observation,
        observerId: memberId,
        context: {
          page: "mcp",
          trigger: "mcp_tool",
          mcpContext: args.context,
          dealId,
          accountId,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return errorResult(
        `observations failed: ${response.status} ${response.statusText}${errText ? ` — ${errText}` : ""}`
      );
    }

    const data = await response.json();
    return textResult({
      dealResolved,
      observation: data,
    });
  } catch (err) {
    return errorResult(err instanceof Error ? err.message : String(err));
  }
}

// ─── MCP server builder ──────────────────────────────────────────────────────

function buildServer(): McpServer {
  const server = new McpServer({
    name: "nexus-mcp",
    version: "0.1.0",
  });

  server.registerTool(
    "get_pipeline",
    {
      title: "Get Pipeline",
      description:
        "Returns the sales pipeline — all deals with company, stage, value, close date, forecast category, vertical, primary contact, and assigned AE. Includes a summary with open pipeline total and commit count.",
      inputSchema: {
        assignedTo: z
          .string()
          .optional()
          .describe(
            "Optional AE name to filter by (case-insensitive partial match). Omit to return all deals."
          ),
      },
    },
    getPipeline
  );

  server.registerTool(
    "get_deal_details",
    {
      title: "Get Deal Details",
      description:
        "Returns comprehensive detail for a single deal — overview, all company stakeholders, MEDDPICC with confidence scores, deal fitness (scores + events), agent intelligence (learnings, risk signals, competitive context, cross-deal coordinated intel), and the 10 most recent activities.",
      inputSchema: {
        dealName: z
          .string()
          .describe(
            "Deal or company name, fuzzy matched (e.g. 'MedVista', 'NordicMed', 'Horizon', 'Harbor Compliance')."
          ),
      },
    },
    getDealDetails
  );

  server.registerTool(
    "generate_call_prep",
    {
      title: "Generate Call Prep",
      description:
        "Generates a full AI call preparation brief using all 8+ Nexus intelligence layers (agent config, team intelligence, system patterns, win/loss data, stakeholder alerts, manager directives, CRM context, playbook experiments, cross-deal intel). Returns a structured brief with headline, talking points, questions, and fitness gaps.",
      inputSchema: {
        dealName: z
          .string()
          .describe("Deal or company name (fuzzy matched)."),
        prepContext: z
          .string()
          .optional()
          .describe(
            "Optional call type context, e.g. 'discovery', 'negotiation', 'technical_validation'."
          ),
        attendeeNames: z
          .array(z.string())
          .optional()
          .describe(
            "Optional attendee names (matched against first+last name or title) to focus the brief on."
          ),
      },
    },
    generateCallPrep
  );

  server.registerTool(
    "get_deal_fitness",
    {
      title: "Get Deal Fitness",
      description:
        "Returns oDeal fitness analysis for a deal — Business, Emotional, Technical, and Readiness scores with detected events, confidence, evidence snippets, buyer momentum, conversation signals, stakeholder engagement, and benchmarks vs won deals.",
      inputSchema: {
        dealName: z
          .string()
          .describe("Deal or company name (fuzzy matched)."),
      },
    },
    getDealFitness
  );

  server.registerTool(
    "log_observation",
    {
      title: "Log Observation",
      description:
        "Logs a field observation into Nexus. The system will classify signal type, extract entities, fuzzy-match to CRM, cluster semantically, route to support functions (Product Marketing, Enablement, Deal Desk, Leadership, etc.), and return a give-back (acknowledgment + related observations). Use this for competitive intel, deal blockers, process friction, content gaps, win patterns — anything worth capturing.",
      inputSchema: {
        observation: z
          .string()
          .describe("The raw observation text."),
        dealName: z
          .string()
          .optional()
          .describe(
            "Optional deal or company name to associate with (fuzzy matched)."
          ),
        context: z
          .string()
          .optional()
          .describe(
            "Optional free-form context, e.g. 'post-call', 'competitive', 'process'."
          ),
      },
    },
    logObservation
  );

  return server;
}

// ─── Next.js route handlers ──────────────────────────────────────────────────

async function handle(request: Request): Promise<Response> {
  try {
    const server = buildServer();
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless mode
    });

    await server.connect(transport);

    const response = await transport.handleRequest(request);

    // Merge CORS headers onto the transport response
    const headers = new Headers(response.headers);
    for (const [k, v] of Object.entries(corsHeaders)) {
      headers.set(k, v);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (err) {
    console.error("[mcp] request failed:", err);
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: err instanceof Error ? err.message : String(err),
        },
        id: null,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}

export async function DELETE(request: Request) {
  return handle(request);
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
