# Security Specification for ElimuPro SMS Tanzania

## 1. Data Invariants
- A student cannot be registered without a `form` and `gender`.
- Grades must have a score between 0 and `maxScore`.
- Fees must have a positive amount.
- Users can only modify their own profiles (except admins).
- Only teachers and admins can record attendance and grades.
- Only admins can manage fee records.
- Parents can only read data related to their linked `studentId` (mapped via `parentUid`).

## 2. The "Dirty Dozen" Payloads (Deny Cases)
1. **Identity Spoofing**: Attempt to create a user profile with a UID that doesn't match the auth token.
2. **Elevated Privileges**: A non-admin user trying to set `role: "admin"` on their own profile during creation.
3. **Invalid Grade**: Setting a score of 105 when `maxScore` is 100.
4. **Invalid Fee**: Setting a negative amount for a fee payment.
5. **Unauthorized Attendance Read**: A student trying to read another student's attendance records.
6. **Orphaned Student**: Registering a student without a valid `form` or `gender`.
7. **Cross-Tenant Access**: A parent trying to read grades of a student they don't own.
8. **Shadow Field Injection**: Adding `isVerified: true` to a student record.
9. **Timestamp Manipulation**: Providing a future or past `createdAt` date instead of server timestamp.
10. **ID Poisoning**: Using a 2KB string as a document ID.
11. **Action Gap**: Updating a fee record's `amount` after it has been confirmed (immutability).
12. **Blanket Query**: Unrestricted `list` query on `/users` collection without filtering by specific role or UID.

## 3. Test Runner (Draft)
A `firestore.rules.test.ts` would verify these cases. For now, we will enforce these logic boundaries in the rules.
