# Security Specification - Research Survey Feedback App

## 1. Data Invariants
- **Questions**:
  - Anyone can read the research questions (`allow read`).
  - Only authorized Admins (emails in the fixed list and verified) can create, update, or delete questions (`allow write`).
  - Immutability constraint: A question's `id` and `section` cannot change after creation.
  - Type-safety & limits: question text, title, targetText must be strings, with a size limit (e.g., <= 1000 chars) to prevent resource poisoning.
- **Responses**:
  - Anyone authenticated with `@bu.ac.th` domain (verified email) can create feedback responses under `/responses/{responseId}` (`allow create`).
  - Respondents CANNOT update or delete responses once written (`allow update, delete: if false`).
  - Only Admins can list or read (`get`) responses (`allow read`).
  - No anonymous submissions allowed. `request.auth.token.email_verified == true` is required.
  - Respondent profiles cannot be registered in general. Only answers are recorded within the responses.
- **AdminProfiles**:
  - Only authorized Admins can read or write elements in `/admins/{adminEmail}`.
  - Common users cannot write or read admin profiles.
  - Immutability constraint: `email` field must match the document path.

## 2. The "Dirty Dozen" Malicious Payloads
The following payloads are designed to test the robustness of the security rules. All of them must return `PERMISSION_DENIED` under the corresponding security rule conditions.

### Question Collection Attacks
1. **Unauthenticated Question Modification**: An anonymous attacker tries to write a question.
2. **Standard User Role Hijacking**: A regular `@bu.ac.th` user trying to create or edit a question.
3. **Invalid Parameter Poisoning**: An admin trying to create a question with a 2MB title to exhaust storage.
4. **Section Mutability Exploitation**: An admin trying to update the section number of an existing question.

### Response Collection Attacks
5. **Unauthorized Response Discovery (Data Leak)**: A regular user tries to retrieve all items in `/responses/` or read another user's item.
6. **Payload Identity Spoofing**: An authenticated user `user@bu.ac.th` tries to submit response data with a different respondentName/faculty to impersonate someone.
7. **Post-Submission Modification**: A user tries to update their submitted response state (e.g., modifying `answers`).
8. **Malicious Response Deletion**: A regular user tries to delete their submitted response (or someone else's).
9. **Unverified Email Access**: An attacker with a newly registered unverified Google account tries to write a response.
10. **Non-BU Domain Submission**: A user with `@gmail.com` trying to submit survey responses.

### Admin Profiles Collection Attacks
11. **Self-Promotion Hack**: A regular user tries to write a document under `/admins/user@bu.ac.th` to register themselves as an admin.
12. **Admin Profile Data Extraction**: A regular user tries to list or read another admin's profile doc underneath `/admins/*`.

## 3. Test Runner Definition (firestore.rules.test.ts)
Here is the conceptual validation test-runner that simulates testing of these rules against the firestore emulator with Google Authentication states:

```typescript
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collection } from 'firebase/firestore';

describe('Survey Feedback App Secure Rules Unit Tests', () => {
  let testEnv;

  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'bu-research-survey',
      firestore: {
        rules: `rules_version = '2'; ...`, // Simulated rules
      },
    });
  });

  after(async () => {
    await testEnv.cleanup();
  });

  it('Payload 1 Fail: Unauthenticated user cannot create questions', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    const qDoc = doc(unauthedDb, 'questions/q1');
    await assertFails(setDoc(qDoc, { title: 'Hack' }));
  });

  it('Payload 2 Fail: Regular BU user cannot create questions', async () => {
    const userDb = testEnv.authenticatedContext('user_1', {
      email: 'professor@bu.ac.th',
      email_verified: true,
    }).firestore();
    const qDoc = doc(userDb, 'questions/q1');
    await assertFails(setDoc(qDoc, { title: 'Hack Question' }));
  });

  it('Payload 5 Fail: Regular BU user cannot list responses (export)', async () => {
    const userDb = testEnv.authenticatedContext('user_1', {
      email: 'professor@bu.ac.th',
      email_verified: true,
    }).firestore();
    const resCol = collection(userDb, 'responses');
    await assertFails(getDocs(resCol));
  });

  it('Payload 10 Fail: Non-BU domain account cannot submit responses', async () => {
    const gmailDb = testEnv.authenticatedContext('gmail_user', {
      email: 'attacker@gmail.com',
      email_verified: true,
    }).firestore();
    const resDoc = doc(gmailDb, 'responses/res_1');
    await assertFails(setDoc(resDoc, { respondentName: 'Attacker', faculty: 'Science' }));
  });

  it('Payload 11 Fail: Regular user cannot promote themselves to administrator', async () => {
    const userDb = testEnv.authenticatedContext('user_1', {
      email: 'professor@bu.ac.th',
      email_verified: true,
    }).firestore();
    const adminDoc = doc(userDb, 'admins/professor@bu.ac.th');
    await assertFails(setDoc(adminDoc, { email: 'professor@bu.ac.th', name: 'Self Promo' }));
  });
});
```
