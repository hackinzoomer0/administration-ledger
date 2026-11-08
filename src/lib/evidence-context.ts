import { createContext, useContext } from "react";
import type { EvidenceRef } from "./types";
export interface EvidenceRequest extends EvidenceRef {
  title: string;
  summary?: string;
  showIssuePlayers?: boolean;
  candidateId?: string;
}
export const EvidenceContext = createContext<
  (request: EvidenceRequest) => void
>(() => undefined);
export function useEvidence() {
  return useContext(EvidenceContext);
}
