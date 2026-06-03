import db from "@/lib/db";

export type AutomotiveMarketIntelligenceLeadInput = {
  fullName: string;
  businessEmail: string;
  companyName: string;
  phoneNumber: string;
  country: string;
  userType: string;
  interest: string;
  message: string;
  consent: boolean;
  sourcePath?: string | null;
  userAgent?: string | null;
};

let tableReady: Promise<void> | null = null;

export function ensureAutomotiveMarketIntelligenceLeadsTable() {
  if (!tableReady) {
    tableReady = db
      .execute(`
        CREATE TABLE IF NOT EXISTS automotive_market_intelligence_leads (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          full_name VARCHAR(160) NOT NULL,
          business_email VARCHAR(190) NOT NULL,
          company_name VARCHAR(190) NOT NULL,
          phone_number VARCHAR(60) NOT NULL,
          country VARCHAR(120) NOT NULL,
          user_type VARCHAR(80) NOT NULL,
          interest VARCHAR(120) NOT NULL,
          message TEXT NOT NULL,
          consent TINYINT(1) NOT NULL DEFAULT 0,
          status ENUM('new','contacted','qualified','closed') NOT NULL DEFAULT 'new',
          source_path VARCHAR(255) NULL,
          user_agent VARCHAR(500) NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          reviewed_at TIMESTAMP NULL DEFAULT NULL,
          reviewed_by VARCHAR(190) NULL DEFAULT NULL,
          INDEX idx_ami_leads_created_at (created_at),
          INDEX idx_ami_leads_status (status),
          INDEX idx_ami_leads_email (business_email)
        )
      `)
      .then(() => undefined);
  }

  return tableReady;
}

export async function createAutomotiveMarketIntelligenceLead(
  input: AutomotiveMarketIntelligenceLeadInput,
) {
  await ensureAutomotiveMarketIntelligenceLeadsTable();

  const [result] = await db.execute(
    `INSERT INTO automotive_market_intelligence_leads
      (
        full_name,
        business_email,
        company_name,
        phone_number,
        country,
        user_type,
        interest,
        message,
        consent,
        source_path,
        user_agent
      )
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [
      input.fullName,
      input.businessEmail,
      input.companyName,
      input.phoneNumber,
      input.country,
      input.userType,
      input.interest,
      input.message,
      input.consent ? 1 : 0,
      input.sourcePath || null,
      input.userAgent || null,
    ],
  );

  return result;
}

export async function listAutomotiveMarketIntelligenceLeads() {
  await ensureAutomotiveMarketIntelligenceLeadsTable();

  const [rows] = await db.execute(
    `SELECT
       id,
       full_name,
       business_email,
       company_name,
       phone_number,
       country,
       user_type,
       interest,
       message,
       consent,
       status,
       source_path,
       created_at,
       reviewed_at,
       reviewed_by
     FROM automotive_market_intelligence_leads
     ORDER BY created_at DESC
     LIMIT 500`,
  );

  return rows;
}
