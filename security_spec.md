# Security Specification — Rawaj Store Authentication & Data Isolation

## 1. Data Invariants
1. A private PII document (`/users/{userId}/private/{docId}`) and public profile (`/users/{userId}/public/{docId}`) can ONLY be read or written by the verified owner (`request.auth.uid == userId && request.auth.token.email_verified == true`), with zero cross-user access even by admins, and `email` must match `request.auth.token.email`.
2. A wishlist item (`/users/{userId}/wishlist/{productId}`) is strictly owner-only and must have `data.uid == request.auth.uid == userId` and `productId` matching `^[a-zA-Z0-9_\-]+$`.
3. A security audit log (`/security_logs/{logId}`) is immutable (`allow update, delete: if false;`), strictly owner-only (`existing().uid == request.auth.uid`), and must use server timestamp `createdAt == request.time`.
4. No user can self-assign Admin privileges (`/admins/{userId}`); users may only read their own `/admins/{request.auth.uid}` status, list is disabled, and only the bootstrapped verified admin (`telrawaj@gmail.com` with `email_verified == true`) can manage admin records.
5. `list` queries on `/security_logs` MUST enforce `isVerifiedUser() && resource.data.uid == request.auth.uid`.

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated read on private PII**: `GET /users/u1/private/info` with `auth = null`.
2. **Cross-user PII read**: `GET /users/u1/private/info` with `auth = { uid: "u2", token: { email_verified: true } }`.
3. **Unverified email write**: `CREATE /users/u1/private/info` with `auth = { uid: "u1", token: { email_verified: false } }`.
4. **Shadow/Ghost privilege escalation field**: `CREATE /users/u1/private/info` including `"role": "admin"` or `"isAdmin": true`.
5. **Identity spoofing on wishlist**: `CREATE /users/u1/wishlist/prod-1` with `uid: "u2"`.
6. **ID poisoning (oversized docId)**: `CREATE /users/u1/wishlist/${"a".repeat(200)}`.
7. **Self-assign admin role**: `CREATE /admins/u2` with `auth = { uid: "u2", token: { email: "attacker@evil.com", email_verified: true } }`.
8. **Admin email spoof without verification**: `GET /admins/u2` with `auth = { uid: "u2", token: { email: "telrawaj@gmail.com", email_verified: false } }`.
9. **Client timestamp forgery**: `CREATE /security_logs/log1` with `createdAt` != `request.time`.
10. **Audit log tampering**: `UPDATE /security_logs/log1` trying to change `status` from `"blocked"` to `"success"`.
11. **Unfiltered security log scraping**: `LIST /security_logs` without `where('uid', '==', auth.uid)`.
12. **Type/size poisoning**: `UPDATE /users/u1/private/info` with `fullName` as boolean or `> 120` chars.
