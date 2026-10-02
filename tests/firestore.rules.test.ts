import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

const projectId = process.env.FIREBASE_PROJECT_ID || 'elimu-pro-sms-test';
const rules = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');

let testEnv: RulesTestEnvironment;

const ctx = {
  admin: () => testEnv.authenticatedContext('admin-uid'),
  teacher: () => testEnv.authenticatedContext('teacher-uid'),
  parent: () => testEnv.authenticatedContext('parent-uid'),
  student: () => testEnv.authenticatedContext('student-uid'),
  unauthenticated: () => testEnv.unauthenticatedContext(),
};

async function seedUser(uid: string, role: string, email = `${uid}@example.test`) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users', uid), {
      uid,
      fullName: uid,
      role,
      email,
    });
  });
}

async function seedStudent(id = 'student-1', overrides: Record<string, unknown> = {}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'students', id), {
      fullName: 'Student One',
      gender: 'Male',
      dob: '2010-01-01',
      form: 'Form 1',
      stream: 'A',
      parentUid: 'parent-uid',
      studentUid: 'student-uid',
      status: 'active',
      enrolledAt: '2026-01-01',
      ...overrides,
    });
  });
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules },
  });
});

afterAll(async () => testEnv.cleanup());
beforeEach(async () => testEnv.clearFirestore());

describe('ElimuPro Firestore security contract', () => {
  it('denies unauthenticated reads of users', async () => {
    await assertFails(getDoc(doc(ctx.unauthenticated().firestore(), 'users', 'student-uid')));
  });

  it('prevents identity spoofing when creating a user profile', async () => {
    await assertFails(setDoc(doc(ctx.student().firestore(), 'users', 'someone-else'), {
      uid: 'someone-else',
      fullName: 'Spoofed',
      role: 'student',
      email: 'x@example.test',
    }));
  });

  it('prevents a non-admin from creating an admin profile', async () => {
    await assertFails(setDoc(doc(ctx.student().firestore(), 'users', 'student-uid'), {
      uid: 'student-uid',
      fullName: 'Student',
      role: 'admin',
      email: 'student@example.test',
    }));
  });

  it('rejects an invalid grade above maxScore', async () => {
    await seedUser('teacher-uid', 'teacher');
    await seedStudent();

    await assertFails(setDoc(doc(ctx.teacher().firestore(), 'grades', 'grade-1'), {
      studentId: 'student-1',
      subject: 'Mathematics',
      score: 105,
      maxScore: 100,
      term: 1,
      year: 2026,
      recordedBy: 'teacher-uid',
      category: 'Test',
    }));
  });

  it('rejects a grade without maxScore', async () => {
    await seedUser('teacher-uid', 'teacher');
    await seedStudent();

    await assertFails(setDoc(doc(ctx.teacher().firestore(), 'grades', 'grade-no-max'), {
      studentId: 'student-1',
      subject: 'Mathematics',
      score: 80,
      term: 1,
      year: 2026,
      recordedBy: 'teacher-uid',
      category: 'Test',
    }));
  });

  it('rejects a negative fee', async () => {
    await seedUser('admin-uid', 'admin');
    await seedStudent();

    await assertFails(setDoc(doc(ctx.admin().firestore(), 'fees', 'fee-1'), {
      studentId: 'student-1',
      amount: -100,
      date: '2026-01-01',
      category: 'Tuition',
      term: 1,
    }));
  });

  it('prevents a student from reading another student\'s attendance', async () => {
    await seedUser('student-uid', 'student');
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'students', 'student-2'), {
        fullName: 'Other',
        gender: 'Male',
        dob: '2010-01-01',
        form: 'Form 1',
        stream: 'A',
        parentUid: 'other-parent',
        studentUid: 'other-student',
        status: 'active',
        enrolledAt: '2026-01-01',
      });
      await setDoc(doc(context.firestore(), 'attendance', 'att-2'), {
        studentId: 'student-2',
        date: '2026-01-01',
        status: 'Present',
        term: 1,
      });
    });

    await assertFails(getDoc(doc(ctx.student().firestore(), 'attendance', 'att-2')));
  });

  it('rejects an orphaned student without a non-empty form', async () => {
    await seedUser('admin-uid', 'admin');

    await assertFails(setDoc(doc(ctx.admin().firestore(), 'students', 'bad-student'), {
      fullName: 'Bad Student',
      gender: 'Male',
      dob: '2010-01-01',
      form: '',
    }));
  });

  it('prevents a parent from reading another parent\'s grades', async () => {
    await seedUser('parent-uid', 'parent');
    await seedStudent();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'students', 'student-other'), {
        fullName: 'Other',
        gender: 'Male',
        dob: '2010-01-01',
        form: 'Form 1',
        stream: 'A',
        parentUid: 'other-parent',
        studentUid: 'other-student',
        status: 'active',
        enrolledAt: '2026-01-01',
      });
      await setDoc(doc(context.firestore(), 'grades', 'grade-other'), {
        studentId: 'student-other',
        subject: 'Math',
        score: 80,
        maxScore: 100,
        term: 1,
        year: 2026,
        recordedBy: 'teacher-uid',
        category: 'Test',
      });
    });

    await assertFails(getDoc(doc(ctx.parent().firestore(), 'grades', 'grade-other')));
  });

  it('rejects shadow-field injection on student records', async () => {
    await seedUser('admin-uid', 'admin');

    await assertFails(setDoc(doc(ctx.admin().firestore(), 'students', 'shadow-student'), {
      fullName: 'Shadow',
      gender: 'Male',
      dob: '2010-01-01',
      form: 'Form 1',
      isVerified: true,
    }));
  });

  it('rejects a 2KB document id', async () => {
    await seedUser('admin-uid', 'admin');
    const longId = 'a'.repeat(2048);

    await assertFails(setDoc(doc(ctx.admin().firestore(), 'students', longId), {
      fullName: 'Long ID',
      gender: 'Male',
      dob: '2010-01-01',
      form: 'Form 1',
    }));
  });

  it('prevents confirmed fee amount from being changed', async () => {
    await seedUser('admin-uid', 'admin');
    await seedStudent();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'fees', 'fee-confirmed'), {
        studentId: 'student-1',
        amount: 10000,
        date: '2026-01-01',
        category: 'Tuition',
        term: 1,
        confirmed: true,
      });
    });

    await assertFails(updateDoc(doc(ctx.admin().firestore(), 'fees', 'fee-confirmed'), {
      amount: 20000,
    }));
  });

  it('prevents blanket user listing for non-admins', async () => {
    await seedUser('student-uid', 'student');
    await assertFails(getDocs(query(collection(ctx.student().firestore(), 'users'))));
  });
});
