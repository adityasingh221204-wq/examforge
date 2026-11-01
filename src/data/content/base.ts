import type { TopicContent } from '../types';

/** Level 1 tuple — the fifth ("where it is used") element is derived from applications when omitted. */
type ZeroTuple = [what: string, why: string, problem: string, how: string, where?: string];
type TechTuple = [
  definition: string,
  architecture: string,
  components: string[],
  advantages: string[],
  disadvantages: string[],
];

type Rest = Partial<Omit<TopicContent, 'topicId' | 'objectives' | 'zero' | 'tech' | 'examples' | 'applications' | 'definitions'>> & {
  examples: string[];
  applications: string[];
  definitions: TopicContent['definitions'];
  limitations?: string[];
};

/**
 * Compact builder for a topic's five teaching levels:
 * L1 zero-level (what/why/problem/how/where), L2 technical, L3 visual (diagram/comparison/formulas),
 * L4 practical (examples/applications/code), L5 exam readiness (definitions + question bank join).
 */
export function c(
  topicId: string,
  objectives: string[],
  zero: ZeroTuple,
  tech: TechTuple,
  rest: Rest,
): TopicContent {
  const { limitations, ...other } = rest;
  const where = zero[4] ?? rest.applications.slice(0, 3).join(', ');
  // Level 3 must always be visual: fall back to a component sequence when no diagram was authored.
  const diagram = other.diagram ?? {
    kind: 'flow' as const,
    title: 'Components and working sequence',
    steps: tech[2].slice(0, 6),
  };
  return {
    topicId,
    objectives,
    zero: { what: zero[0], why: zero[1], problem: zero[2], how: zero[3], where },
    tech: {
      definition: tech[0],
      architecture: tech[1],
      components: tech[2],
      advantages: tech[3],
      disadvantages: tech[4],
      limitations,
    },
    ...other,
    diagram,
  };
}
