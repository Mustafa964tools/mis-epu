/**
 * Phase 0 — Firestore Security Rules TDD Specification Suite
 * Verifies that all "Dirty Dozen" adversarial payloads return PERMISSION_DENIED.
 */

export interface AdversarialTestCase {
  id: number;
  name: string;
  collection: string;
  docId: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: AdversarialTestCase[] = [
  { id: 1, name: 'Unauthenticated News Create', collection: 'news', docId: 'news_1', operation: 'create', expected: 'PERMISSION_DENIED' },
  { id: 2, name: 'Unverified Email Spoof on News', collection: 'news', docId: 'news_1', operation: 'create', expected: 'PERMISSION_DENIED' },
  { id: 3, name: 'Shadow Field Injection on News', collection: 'news', docId: 'news_1', operation: 'create', expected: 'PERMISSION_DENIED' },
  { id: 4, name: 'Author UID Spoofing on News', collection: 'news', docId: 'news_1', operation: 'create', expected: 'PERMISSION_DENIED' },
  { id: 5, name: 'Forged Client Timestamp on News', collection: 'news', docId: 'news_1', operation: 'create', expected: 'PERMISSION_DENIED' },
  { id: 6, name: 'Immutable Field Mutation on News Update', collection: 'news', docId: 'news_1', operation: 'update', expected: 'PERMISSION_DENIED' },
  { id: 7, name: 'Invalid Role Enum on Staff Create', collection: 'staff', docId: 'staff_1', operation: 'create', expected: 'PERMISSION_DENIED' },
  { id: 8, name: 'Oversized String Poisoning on Contact Message', collection: 'messages', docId: 'msg_1', operation: 'create', expected: 'PERMISSION_DENIED' },
  { id: 9, name: 'PII Leak Attempt on Messages by Non-Admin', collection: 'messages', docId: 'msg_1', operation: 'get', expected: 'PERMISSION_DENIED' },
  { id: 10, name: 'Message Status Tampering on Create', collection: 'messages', docId: 'msg_1', operation: 'create', expected: 'PERMISSION_DENIED' },
  { id: 11, name: 'Self-Privilege Escalation on Admins', collection: 'admins', docId: 'user_1', operation: 'create', expected: 'PERMISSION_DENIED' },
  { id: 12, name: 'Path Variable ID Poisoning', collection: 'news', docId: 'invalid$id!', operation: 'create', expected: 'PERMISSION_DENIED' },
];
