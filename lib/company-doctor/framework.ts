export type CompanyDoctorBusinessModel =
  | "physical_product"
  | "knowledge_expertise"
  | "service"
  | "software_digital";

export type CompanyDoctorProblemType = "external" | "internal" | "philosophical";
export type CompanyDoctorDesireType = "external" | "internal";
export type CompanyDoctorTemperature = "cold" | "warm" | "hot";

export type CompanyDoctorProblem = {
  id: string;
  type: CompanyDoctorProblemType;
  title: string;
  description: string;
  frequency: number;
  severity: number;
  willingnessToPay: number;
  score: number;
};

export type CompanyDoctorDesire = {
  id: string;
  type: CompanyDoctorDesireType;
  title: string;
  description: string;
  expectedImpact?: string;
};

export type CompanyDoctorCheck = {
  id: string;
  label: string;
  matched: boolean;
  weight?: number;
};

export type CompanyDoctorDiagnosis = {
  businessModel: CompanyDoctorBusinessModel;
  problems: CompanyDoctorProblem[];
  criticalProblems: CompanyDoctorProblem[];
  desires: CompanyDoctorDesire[];
  checks: CompanyDoctorCheck[];
  matchedChecks: number;
  temperature: CompanyDoctorTemperature;
  priorities: string[];
};

export type CompanyDoctorOpportunity = {
  id: string;
  title: string;
  reason: string;
  urgency: "low" | "medium" | "high";
  expectedImpact: "low" | "medium" | "high";
  recommendedAction: string;
  source: "diagnosis" | "calendar" | "trend" | "performance" | "competitor";
};

export function clampTen(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(10, Math.max(0, Math.round(value)));
}

/**
 * Pain score follows the Company Doctor source material's three recurring
 * dimensions: frequency, severity and willingness to spend for a solution.
 * The score is deliberately transparent and deterministic so AI suggestions
 * can be audited instead of relying on an unexplained model score.
 */
export function calculatePainScore(input: {
  frequency: number;
  severity: number;
  willingnessToPay: number;
}) {
  const frequency = clampTen(input.frequency);
  const severity = clampTen(input.severity);
  const willingnessToPay = clampTen(input.willingnessToPay);

  return Math.round((frequency * 0.3 + severity * 0.4 + willingnessToPay * 0.3) * 10) / 10;
}

export function normalizeProblem(problem: Omit<CompanyDoctorProblem, "score">): CompanyDoctorProblem {
  return {
    ...problem,
    frequency: clampTen(problem.frequency),
    severity: clampTen(problem.severity),
    willingnessToPay: clampTen(problem.willingnessToPay),
    score: calculatePainScore(problem),
  };
}

export function selectCriticalProblems(problems: CompanyDoctorProblem[], threshold = 8) {
  return [...problems]
    .filter((problem) => problem.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

export function temperatureFromChecks(checks: CompanyDoctorCheck[]): CompanyDoctorTemperature {
  const total = checks.reduce((sum, check) => sum + (check.matched ? check.weight ?? 1 : 0), 0);

  if (total >= 7) return "hot";
  if (total >= 4) return "warm";
  return "cold";
}

export function diagnoseCompany(input: {
  businessModel: CompanyDoctorBusinessModel;
  problems: Array<Omit<CompanyDoctorProblem, "score"> | CompanyDoctorProblem>;
  desires?: CompanyDoctorDesire[];
  checks?: CompanyDoctorCheck[];
}): CompanyDoctorDiagnosis {
  const problems = input.problems.map((problem) =>
    normalizeProblem({
      id: problem.id,
      type: problem.type,
      title: problem.title,
      description: problem.description,
      frequency: problem.frequency,
      severity: problem.severity,
      willingnessToPay: problem.willingnessToPay,
    }),
  );
  const checks = input.checks ?? [];
  const criticalProblems = selectCriticalProblems(problems);

  return {
    businessModel: input.businessModel,
    problems,
    criticalProblems,
    desires: input.desires ?? [],
    checks,
    matchedChecks: checks.filter((check) => check.matched).length,
    temperature: temperatureFromChecks(checks),
    priorities: criticalProblems.slice(0, 3).map((problem) => problem.title),
  };
}

export function buildOpportunityFromDiagnosis(diagnosis: CompanyDoctorDiagnosis): CompanyDoctorOpportunity[] {
  return diagnosis.criticalProblems.slice(0, 5).map((problem, index) => ({
    id: `diagnosis-${problem.id || index}`,
    title: problem.title,
    reason: problem.description,
    urgency: problem.score >= 9 ? "high" : "medium",
    expectedImpact: problem.willingnessToPay >= 8 ? "high" : "medium",
    recommendedAction: `Önce ${problem.title.toLocaleLowerCase("tr-TR")} problemini ölç, ardından tek bir iyileştirme deneyi başlat ve sonucu takip et.`,
    source: "diagnosis" as const,
  }));
}

export const companyDoctorBusinessModelLabels: Record<CompanyDoctorBusinessModel, string> = {
  physical_product: "Fiziksel Ürün",
  knowledge_expertise: "Bilgi & Tecrübe",
  service: "Servis & Hizmet",
  software_digital: "Yazılım & Dijital",
};

/**
 * Shared diagnostic lenses extracted from the supplied Company Doctor files.
 * Sector packs can add their own concrete checks without changing the engine.
 */
export const companyDoctorDiagnosticLenses = [
  "müşteri_akışı",
  "gelir_istikrarı",
  "ölçeklenebilirlik",
  "dijital_görünürlük",
  "içerik_sürekliliği",
  "crm_ve_takip",
  "otomasyon",
  "teklif_netliği",
  "sosyal_kanıt",
  "operasyon_bağımlılığı",
] as const;
