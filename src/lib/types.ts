export type Json =
  string | number | boolean | null | Json[] | { [key: string]: Json };
export interface EventRecord {
  id: string;
  date: string;
  added?: string;
  precision: string;
  issues: string[];
  kind: string;
  actor: string;
  text: string;
  source: string;
  url?: string;
  tier: string;
  context?: string;
  rationale?: string;
  fxnote?: string;
  origin?: string;
  weight: number;
  by?: string[];
  fx?: Record<string, number>;
}
export interface Issue {
  code: string;
  name: string;
  decision: string;
  heldBy: string;
  pending: string;
}
export interface Faction {
  id: string;
  name: string;
  short: string;
  overview: string[];
  positions: Record<string, { title: string; paras: string[] }[]>;
  members: string[][];
  donors: string[][];
  edges: string[][];
  wants: string;
  why: string;
  gained: string;
  lost: string;
  weak: string;
  dissolved?: string;
  [key: string]: unknown;
}
export interface Person {
  id: string;
  name: string;
  role: string;
  home?: string;
  also: string[];
  positions: Record<string, { label: string; view: string; status?: string }>;
  rosters: {
    f: string;
    role: string;
    backs: string;
    onSide: string;
    driver: string;
  }[];
  read?: string;
  drive?: string;
  pattern?: string[];
  flip?: string;
  [key: string]: unknown;
}
export interface Donor {
  id: string;
  name: string;
  identity: string;
  factions: string[];
  people: string[];
  issues: string[];
  supports?: string[];
  amounts: string[];
  beneficiaries: string[];
  views: string[];
  motive: string;
  gain: string;
  tier: string;
  [key: string]: unknown;
}
export interface Candidate {
  id: string;
  name: string;
  nomination_likelihood_pct: number;
  forecast_rationale: string;
  positions: Record<
    string,
    { summary: string; evidence: Json[]; uncertainty: string }
  >;
  strengths_for_base: string[];
  weaknesses_for_base: string[];
  upside_triggers: string[];
  downside_triggers: string[];
  strongest_counterargument: string;
  [key: string]: unknown;
}
export interface Wargame {
  model_version: string;
  summary: string;
  debate_mode: string;
  field_risk: string;
  weighting_note: string;
  partition_rule: string;
  judgments: Record<
    string,
    EvidenceRef & { finding: string; countercase: string; resolution: string }
  >;
  scenarios: (EvidenceRef & {
    id: string;
    name: string;
    weight_pct: number;
    definition: string;
    weight_reason: string;
    sequence: string;
    falsifier: string;
    shares_pct: Record<string, number>;
    candidate_reasoning: Record<string, string>;
  })[];
  candidate_debates: Record<
    string,
    EvidenceRef & {
      best_case: string;
      failure_case: string;
      rebuttal: string;
      verdict: string;
      entry_assessment: string;
      next_move: string;
      rival_attack: string;
      durability_test: string;
    }
  >;
  predictions: (EvidenceRef & {
    id: string;
    claim: string;
    resolve_by: string;
    likelihood: string;
    active?: boolean;
    retirement_reason?: string;
    test: string;
    status: string;
    resolution: string;
  })[];
}
export interface Snapshot {
  comparison?: string;
  roster_ids?: string[];
  wargame?: Wargame;
  wargame_ref?: string;
  monitoring?: {
    summary: string;
    prediction_updates: (EvidenceRef & {
      id: string;
      status: string;
      resolution: string;
    })[];
  };
  type?: string;
  id: string;
  date: string;
  summary: string;
  gaps: string[];
  probabilities_pct: Record<string, number>;
  assessments: Record<
    string,
    {
      delta_pp: number | null;
      reason: string;
      review_status: string;
      source_ids: string[];
      event_ids: string[];
      faction_links: Json[];
    }
  >;
}
export interface Nomination {
  as_of_date: string;
  candidates: Candidate[];
  sources: {
    id: string;
    url: string;
    publisher: string;
    description: string;
    publication_date?: string;
  }[];
  issue_definitions: { id: string; label: string }[];
  tracking: { history: Snapshot[] };
  forecast_methodology: {
    target: string;
    base_case: string;
    critical_uncertainties: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
export interface LedgerData {
  assessment: CurrentAssessment;
  issueAssessments: Record<string, IssueAssessment>;
  events: EventRecord[];
  issues: Issue[];
  factions: Faction[];
  people: Person[];
  donors: Donor[];
  nomination: Nomination;
  meta: Record<string, Json>;
  report: Record<string, Json>;
  runs: Record<string, Json>;
}

export interface EvidenceRef {
  event_ids: string[];
  source_ids?: string[];
}
export interface PowerContest extends EvidenceRef {
  id: string;
  issue_id: string;
  title: string;
  status:
    | "pending"
    | "contested"
    | "strengthening"
    | "weakening"
    | "unchanged"
    | "not_reviewed";
  assessment: string;
  summary: string;
  authority: string;
  leverage: string;
  change: string;
  basis: { actions: string; positions: string; money: string };
  watch: string;
  faction_ids: string[];
  reviewed_at: string;
}
export interface CandidateAssessment extends EvidenceRef {
  candidate_id: string;
  person_id: string | null;
  path: string;
  coalition: string;
  advantage: string;
  vulnerability: string;
  positions: string;
  money: string;
  reviewed_at: string;
}
export interface CurrentAssessment {
  power_shifts: {
    faction_id: string;
    actor: string;
    before: number;
    after: number;
    role_change: string;
    implication: string;
  }[];
  power_method: {
    title: string;
    scale: string;
    status: string;
    condition: string;
    policy_projection: string;
    event_ids: string[];
  };
  research_as_of: string;
  last_substantive_change: string;
  review: { run_id: string; date: string; type: string; scope: string };
  administration: {
    headline: string;
    summary: string;
    contests: PowerContest[];
  };
  nomination: {
    headline: string;
    summary: string;
    snapshot_id: string;
    candidates: CandidateAssessment[];
  };
  cross_implications: (EvidenceRef & {
    id: string;
    title: string;
    assessment: string;
    faction_ids: string[];
  })[];
  relationships: (EvidenceRef & {
    id: string;
    source: string;
    target: string;
    issues: string[];
    kind: string;
    assessment: string;
  })[];
}

export interface IssueAssessment {
  actors: {
    person_id: string;
    role: string;
    faction_id: string | null;
    position: string;
    goal: string;
    financial_relationships: {
      name: string;
      relationship: string;
      relevance: string;
    }[];
    basis_note: string;
  }[];
  policy: string;
  dispute: string;
  player_ids: string[];
  research_as_of: string;
  scope: string;
  event_ids: string[];
  factions: {
    faction_id: string;
    position: string;
    actions: string;
    goals: string;
    actors: string[];
    observations: string[];
  }[];
}
