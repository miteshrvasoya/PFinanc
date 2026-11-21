import { z } from 'zod';

/**
 * One schema for the advisor report, used two ways:
 *  - REPORT_JSON_SCHEMA is sent to providers that enforce output structure (Claude structured outputs,
 *    OpenAI strict json_schema). It sticks to the portable subset: every object lists all keys in
 *    `required` with additionalProperties: false, no numeric/length constraints, no nullable types.
 *  - reportValidator re-checks every provider's output (including the ones that cannot enforce a
 *    schema) and applies the range rules the JSON schema cannot express.
 */

export const INSIGHT_AREAS = ['cashflow', 'spending', 'savings', 'debt', 'liquidity', 'investments', 'tax', 'data_quality'] as const;
export const SEVERITIES = ['positive', 'info', 'warning', 'critical'] as const;
export const ACTIONS = [
  'BUY', 'SELL', 'HOLD', 'SIP', 'REBALANCE', 'AVOID',
  'SAVE_MORE', 'REDUCE_SPENDING', 'PAY_DOWN_DEBT', 'BUILD_EMERGENCY_FUND', 'TAX_PLANNING', 'REVIEW_DATA',
] as const;
export const SECURITY_TYPES = ['STOCK', 'MUTUAL_FUND', 'ETF', 'FIXED_INCOME', 'GENERAL'] as const;
export const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const;
export const HORIZONS = ['SHORT', 'MEDIUM', 'LONG'] as const;
export const RISK_LEVELS = ['Conservative', 'Moderate', 'Aggressive', 'Very Aggressive', 'Insufficient data'] as const;

const str = { type: 'string' } as const;
const strArray = { type: 'array', items: str } as const;
const enumOf = (values: readonly string[]) => ({ type: 'string', enum: [...values] });
const obj = (properties: Record<string, unknown>) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

export const REPORT_JSON_SCHEMA = obj({
  summary: str,
  financialHealthScore: { type: 'integer' },
  scoreBreakdown: obj({
    cashflow: { type: 'integer' },
    liquidity: { type: 'integer' },
    debt: { type: 'integer' },
    investments: { type: 'integer' },
  }),
  riskAssessment: enumOf(RISK_LEVELS),
  keyInsights: {
    type: 'array',
    items: obj({ title: str, detail: str, evidence: str, area: enumOf(INSIGHT_AREAS), severity: enumOf(SEVERITIES) }),
  },
  recommendations: {
    type: 'array',
    items: obj({
      action: enumOf(ACTIONS),
      title: str,
      security: str,
      securityType: enumOf(SECURITY_TYPES),
      reason: str,
      evidence: str,
      priority: enumOf(PRIORITIES),
      suggestedAmountInr: { type: 'number' },
      timeHorizon: enumOf(HORIZONS),
    }),
  },
  rebalancingSuggestions: strArray,
  monthlySipPlan: { type: 'array', items: obj({ fund: str, amount: { type: 'number' }, reason: str }) },
  monthlyStockPlan: { type: 'array', items: obj({ stock: str, amount: { type: 'number' }, reason: str }) },
  marketOutlook: str,
  dataCaveats: strArray,
});

const score = z.number().int().min(0).max(100);
const nonNegative = z.number().min(0);

export const reportValidator = z.object({
  summary: z.string().min(1),
  financialHealthScore: score,
  scoreBreakdown: z.object({ cashflow: score, liquidity: score, debt: score, investments: score }),
  riskAssessment: z.enum(RISK_LEVELS),
  keyInsights: z
    .array(
      z.object({
        title: z.string().min(1),
        detail: z.string().min(1),
        evidence: z.string(),
        area: z.enum(INSIGHT_AREAS),
        severity: z.enum(SEVERITIES),
      })
    )
    .min(1)
    .max(10),
  recommendations: z
    .array(
      z.object({
        action: z.enum(ACTIONS),
        title: z.string().min(1),
        security: z.string(),
        securityType: z.enum(SECURITY_TYPES),
        reason: z.string().min(1),
        evidence: z.string(),
        priority: z.enum(PRIORITIES),
        suggestedAmountInr: nonNegative,
        timeHorizon: z.enum(HORIZONS),
      })
    )
    .max(12),
  rebalancingSuggestions: z.array(z.string()).max(10),
  monthlySipPlan: z.array(z.object({ fund: z.string().min(1), amount: nonNegative, reason: z.string() })).max(10),
  monthlyStockPlan: z.array(z.object({ stock: z.string().min(1), amount: nonNegative, reason: z.string() })).max(10),
  marketOutlook: z.string(),
  dataCaveats: z.array(z.string()).max(10),
});

export type AdvisorReport = z.infer<typeof reportValidator>;

/** Extract the JSON object from a model reply (tolerates code fences / leading prose). */
export function extractJson(raw: string): unknown {
  const text = raw.replace(/^﻿/, '').trim();
  try {
    return JSON.parse(text);
  } catch {
    /* fall through */
  }
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      /* fall through */
    }
  }
  // Outermost balanced object (handles prose before/after the JSON).
  const start = text.indexOf('{');
  if (start >= 0) {
    let depth = 0;
    let inString = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (inString) {
        if (ch === '\\') i++;
        else if (ch === '"') inString = false;
      } else if (ch === '"') inString = true;
      else if (ch === '{') depth++;
      else if (ch === '}' && --depth === 0) {
        return JSON.parse(text.slice(start, i + 1));
      }
    }
  }
  throw new Error('No JSON object found in the model response');
}

/** Human-readable validation problems, fed back to the model on a repair attempt. */
export function describeIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 12)
    .map((i) => `- ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n');
}
