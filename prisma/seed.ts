import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const db = new PrismaClient();

// Mirror src/lib/auth.ts hashPassword (kept inline so seed is standalone).
function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

const DEMO_PASSWORD = "tenant@123";
const DEMO_CONTRACTOR_PASSWORD = "contractor@123";

const TENANTS = [
  { name: "Unit 1 Tenant", email: "tenant1@example.com", unit: "1", phone: "555-0101" },
  { name: "Unit 2 Tenant", email: "tenant2@example.com", unit: "2", phone: "555-0102" },
  { name: "Unit 3 Tenant", email: "tenant3@example.com", unit: "3", phone: "555-0103" },
];

const CONTRACTORS = [
  { name: "Pat Rivera", company: "Rivera Plumbing", email: "plumber@example.com", phone: "555-0201", trades: ["Plumbing", "Appliance"] },
  { name: "Sam Cole", company: "Cole Electric & HVAC", email: "electric@example.com", phone: "555-0202", trades: ["Electrical", "HVAC"] },
  { name: "Jordan Fix", company: null, email: "handyman@example.com", phone: "555-0203", trades: ["Appliance", "Pest", "Other"] },
];

async function main() {
  let created = 0;
  let updated = 0;
  for (const t of TENANTS) {
    const existing = await db.tenant.findUnique({ where: { email: t.email } });
    if (existing) {
      if (!existing.passwordHash) {
        await db.tenant.update({
          where: { id: existing.id },
          data: { passwordHash: hashPassword(DEMO_PASSWORD) },
        });
        updated++;
      }
    } else {
      await db.tenant.create({
        data: { ...t, passwordHash: hashPassword(DEMO_PASSWORD) },
      });
      created++;
    }
  }

  let contractorsCreated = 0;
  for (const c of CONTRACTORS) {
    const existing = await db.contractor.findUnique({ where: { email: c.email } });
    if (!existing) {
      await db.contractor.create({
        data: {
          name: c.name,
          company: c.company,
          email: c.email,
          phone: c.phone,
          trades: JSON.stringify(c.trades),
          passwordHash: hashPassword(DEMO_CONTRACTOR_PASSWORD),
        },
      });
      contractorsCreated++;
    }
  }

  console.log(`Seed complete. Created ${created} tenants, password-fixed ${updated}, created ${contractorsCreated} contractors.`);
  console.log(`Demo tenant credentials: tenant1@example.com / ${DEMO_PASSWORD}  (and tenant2@, tenant3@).`);
  console.log(`Demo contractor credentials: plumber@example.com / ${DEMO_CONTRACTOR_PASSWORD}  (and electric@, handyman@).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
