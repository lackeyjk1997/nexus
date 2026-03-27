import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const client = postgres(process.env.DIRECT_URL!, { max: 1 });
const db = drizzle(client, { schema });

async function main() {
  const members = await db.select().from(schema.teamMembers);
  console.log("=== TEAM MEMBERS ===");
  members.forEach((m) =>
    console.log(`${m.role.padEnd(8)} ${m.name.padEnd(22)} ${m.verticalSpecialization}`)
  );

  const configs = await db.select().from(schema.agentConfigs);
  console.log("\n=== AGENT CONFIGS ===");
  configs.forEach((c) => {
    const member = members.find((m) => m.id === c.teamMemberId);
    console.log(`${c.agentName.padEnd(25)} v${c.version} -> ${member?.name || "UNKNOWN"}`);
  });

  const versions = await db.select().from(schema.agentConfigVersions);
  const crossAgent = versions.filter((v) => {
    const prefs = v.outputPreferences as Record<string, unknown> | null;
    return prefs?.crossAgentUpdate;
  });
  console.log(`\n=== CROSS-AGENT VERSIONS: ${crossAgent.length} ===`);
  crossAgent.forEach((v) => {
    const prefs = v.outputPreferences as Record<string, unknown>;
    const config = configs.find((c) => c.id === v.agentConfigId);
    const member = members.find((m) => m.id === config?.teamMemberId);
    console.log(`v${v.version} -> ${member?.name || "?"} from ${prefs.fromUser}`);
  });

  process.exit(0);
}
main();
