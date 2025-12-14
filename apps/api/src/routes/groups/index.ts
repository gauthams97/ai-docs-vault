/**
 * Groups API Routes
 * 
 * Central export for all group-related routes.
 */

export { POST as createGroup } from './create';
export { GET as listGroups } from './list';
export { DELETE as deleteGroup } from './delete';
export { POST as addDocumentToGroup, DELETE as removeDocumentFromGroup } from './documents';
export { POST as suggestGroups } from './suggest';
