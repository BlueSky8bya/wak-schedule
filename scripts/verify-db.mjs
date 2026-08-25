// DB 적용 상태 확인용 일회성 스크립트.
import { readFileSync } from "node:fs";
import { Client } from "pg";

const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const env = Object.fromEntries(
  text.split(/\r?\n/).map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2]])
);
const ref = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)[1];

// [WH-CHANGE v0.1.0 | FIX | 2026-08-26 | CHG-20260826-005]
// Reason: pooler 호스트가 aws-1로 하드코딩돼 있었는데 프로젝트가 aws-0 클러스터에 배정되면
//   ENOTFOUND(tenant not found)로 죽는다. apply-db.mjs와 같은 후보 폴백을 쓴다.
const candidates = [
  { host: `aws-0-ap-northeast-2.pooler.supabase.com`, port: 5432, user: `postgres.${ref}` },
  { host: `aws-1-ap-northeast-2.pooler.supabase.com`, port: 5432, user: `postgres.${ref}` },
  { host: `db.${ref}.supabase.co`, port: 5432, user: "postgres" }
];

let client = null;
for (const cfg of candidates) {
  const c = new Client({
    ...cfg,
    password: env.SUPABASE_DB_PASSWORD,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000
  });
  try {
    await c.connect();
    await c.query("select 1");
    client = c;
    break;
  } catch {
    await c.end().catch(() => {});
  }
}
if (!client) {
  console.error("모든 후보 접속 실패.");
  process.exit(2);
}

const tables = await client.query(
  `select count(*)::int as n from information_schema.tables where table_schema='public'`
);
const admins = await client.query(`select email from public.platform_admins`);
const policies = await client.query(
  `select count(*)::int as n from pg_policies where schemaname='public'`
);
const funcs = await client.query(
  `select proname from pg_proc where proname in ('is_developer','is_calendar_admin','is_calendar_owner','has_private_unlock') order by proname`
);

console.log("public 테이블 수:", tables.rows[0].n);
console.log("RLS 정책 수:", policies.rows[0].n);
console.log("보안 함수:", funcs.rows.map((r) => r.proname).join(", "));
console.log("platform_admins:", admins.rows.map((r) => r.email).join(", ") || "(없음)");

await client.end();
