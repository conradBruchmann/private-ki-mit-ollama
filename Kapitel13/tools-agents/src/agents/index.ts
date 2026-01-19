/**
 * Agents Export
 * Kapitel 12: Tools & Agenten auf Ollama-Basis
 */

export {
  ReactAgent,
  createAgent,
  createReadOnlyAgent,
  type ReactAgentConfig,
  type AgentResult,
  type AgentTrace,
  type AgentCallbacks
} from './react-agent.js';

export {
  FeatureAgent,
  createFeature,
  fixBug,
  refactorCode,
  type FeatureAgentConfig
} from './feature-agent.js';
