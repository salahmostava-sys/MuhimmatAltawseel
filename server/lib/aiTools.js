import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  AI_CHAT_SYSTEM_PROMPT,
  AI_CHAT_TOOLS,
  TOOL_PERMISSIONS,
  canAccessTool,
  buildNamePattern,
  queryRidersRanking,
  callGroqChat,
  executeAiTool,
} = require('../../api/_aiTools.js');

export {
  AI_CHAT_SYSTEM_PROMPT,
  AI_CHAT_TOOLS,
  TOOL_PERMISSIONS,
  canAccessTool,
  buildNamePattern,
  queryRidersRanking,
  callGroqChat,
  executeAiTool,
};
