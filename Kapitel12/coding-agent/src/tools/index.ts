/**
 * Tools - Export
 * Kapitel 11: Architektur eines Programmierautomaten
 */

export { Tool, ToolResult, ToolExecutor } from "./types.js";
export {
  ReadFileTool,
  WriteFileTool,
  ListFilesTool,
  SearchCodeTool,
} from "./filesystem-tools.js";
export { RunCommandTool } from "./shell-tool.js";
export { GitTool } from "./git-tool.js";

import { Tool } from "./types.js";
import {
  ReadFileTool,
  WriteFileTool,
  ListFilesTool,
  SearchCodeTool,
} from "./filesystem-tools.js";
import { RunCommandTool } from "./shell-tool.js";
import { GitTool } from "./git-tool.js";

/**
 * Erstellt alle Standard-Tools für ein Projekt
 */
export function createStandardTools(projectRoot: string): Tool[] {
  return [
    new ReadFileTool(projectRoot),
    new WriteFileTool(projectRoot, true),
    new ListFilesTool(projectRoot),
    new SearchCodeTool(projectRoot),
    new RunCommandTool(projectRoot),
    new GitTool(projectRoot),
  ];
}
