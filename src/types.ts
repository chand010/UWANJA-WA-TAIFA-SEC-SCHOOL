export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  role: 'admin' | 'teacher' | 'parent' | 'student';
  phone?: string;
  preferredLanguage: 'Swahili' | 'English';
  createdAt: string;
}

export interface Student {
  id?: string;
  fullName: string;
  gender: 'Male' | 'Female';
  dob: string;
  nectaRegNumber?: string;
  form: string;
  stream?: string;
  parentUid?: string;
  studentUid?: string;
  status: 'Active' | 'Inactive' | 'Transferred' | 'Graduated';
  enrolledAt: string;
}

export interface Attendance {
  id?: string;
  studentId: string;
  date: string;
  status: 'Present' | 'Absent' | 'Late';
  reason?: string;
  term: 1 | 2 | 3;
  recordedBy: string;
}

export interface Grade {
  id?: string;
  studentId: string;
  subject: string;
  score: number;
  maxScore: number;
  term: 1 | 2 | 3;
  year: number;
  category: 'Test' | 'Mid-Term' | 'Final';
  recordedBy: string;
}

export interface Fee {
  id?: string;
  studentId: string;
  amount: number;
  date: string;
  category: 'Tuition' | 'Uniform' | 'Books' | 'Transport' | 'Other';
  term: 1 | 2 | 3;
  paymentMethod: string;
  transactionId?: string;
  recordedBy: string;
}

export interface PermissionRequest {
  id?: string;
  studentId: string;
  studentUid: string;
  studentName: string;
  type: 'Sick' | 'Emergency' | 'Other';
  reason: string;
  startDate: string;
  endDate: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  adminComment?: string;
}

export interface TeachingAssignment {
  id?: string;
  teacherId: string;
  subject: string;
  form: string;
  stream: string;
  academicYear: number;
}
