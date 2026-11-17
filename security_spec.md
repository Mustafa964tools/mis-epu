# Security Specification — Phase 0 (Payload-First Security TDD)

## 1. Data Invariants
1. **Default-Deny Catch-All**: Every path not explicitly matched is denied (`allow read, write: if false;`).
2. **Admin Verification**: All administrative mutations (`news`, `staff`, `admins`, and reading/deleting `messages`) require a verified authenticated user (`request.auth != null && request.auth.token.email_verified == true`) whose email matches the bootstrapped department admin (`mustafanahroomar@gmail.com`) or whose UID exists in `/admins/$(request.auth.uid)`.
3. **Strict Key & Size Enforcement**: Every `create` and `update` operation validates exact allowed keys (`hasAll` + `hasOnly`), string length bounds (`.size()`), enum membership, and immutable `authorId` / `createdAt` fields.
4. **Temporal Integrity**: `createdAt` and `updatedAt` must equal `request.time`.
5. **PII Isolation**: `/messages/{messageId}` contains visitor email addresses (`senderEmail`) and message text. Public users can only `create` valid messages; `get`, `list`, and `delete` are strictly restricted to `isAdmin()`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Payload 1 (Unauthenticated News Create)**: Attempt to create `/news/news_1` with `auth == null` -> `PERMISSION_DENIED`.
2. **Payload 2 (Unverified Admin Email Spoof)**: Attempt to create `/news/news_1` with `email == 'mustafanahroomar@gmail.com'` but `email_verified == false` -> `PERMISSION_DENIED`.
3. **Payload 3 (Shadow Field Injection on News)**: Admin sends valid `/news/news_1` payload plus extra key `isPinned: true` -> `PERMISSION_DENIED`.
4. **Payload 4 (Author Spoofing on News Create)**: Admin sets `authorId: 'other_user_uid'` instead of `request.auth.uid` -> `PERMISSION_DENIED`.
5. **Payload 5 (Forged Client Timestamp on News)**: Admin sets `createdAt` to a past timestamp instead of `request.time` -> `PERMISSION_DENIED`.
6. **Payload 6 (Immutable Field Mutation on News Update)**: Admin attempts to change `createdAt` or `authorId` during `update` -> `PERMISSION_DENIED`.
7. **Payload 7 (Invalid Enum on Staff Create)**: Admin creates `/staff/staff_1` with `role_key: 'superadmin'` (not in `['head', 'doctor', 'lecturer']`) -> `PERMISSION_DENIED`.
8. **Payload 8 (Oversized String Poisoning on Contact Message)**: Visitor submits `/messages/msg_1` with `message` length > 4000 chars -> `PERMISSION_DENIED`.
9. **Payload 9 (PII Read by Non-Admin)**: Signed-in non-admin attempts `get` or `list` on `/messages/msg_1` -> `PERMISSION_DENIED`.
10. **Payload 10 (Message Status Tampering on Create)**: Visitor creates `/messages/msg_1` with `status: 'read'` instead of `'unread'` -> `PERMISSION_DENIED`.
11. **Payload 11 (Self-Privilege Escalation in `/admins`)**: Non-admin user attempts to create `/admins/{theirUid}` -> `PERMISSION_DENIED`.
12. **Payload 12 (ID Poisoning Attack)**: Attempt to create a document with an invalid or >128 char ID -> `PERMISSION_DENIED`.
