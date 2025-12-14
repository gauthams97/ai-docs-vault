/**
 * Grouping Types
 * 
 * Types for AI-assisted grouping and suggestions.
 */

import type { Group } from './group';
import { GroupType } from './group';

/**
 * Group Suggestion
 * 
 * Represents an AI-suggested group that requires user approval.
 * Never auto-assigned - user must accept or reject.
 */
export interface GroupSuggestion {
  group: {
    name: string;
    description: string;
    type: GroupType;
  };
  document_ids: string[];
  confidence: number; // 0-1 score indicating confidence in the suggestion
  reason: string; // Explanation of why these documents were grouped
}

/**
 * Group with Document Count
 * 
 * Group information with count of documents in the group.
 */
export interface GroupWithCount extends Group {
  document_count: number;
}

import type { Document } from './document';

/**
 * Document with Groups
 * 
 * Document information with list of groups it belongs to.
 */
export interface DocumentWithGroups {
  document: Document;
  groups: Group[];
}
