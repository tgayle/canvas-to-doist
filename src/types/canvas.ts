import { ParseThisStringAsDate } from './todoist';

export type PotentialCourse = LockedCourse | Course;

export type LockedCourse = {
  id: number;
  access_restricted_by_date: boolean;
};

export type Course = {
  id: number;
  name: string;
  uuid: string;
  course_code: string;
  enrollment_term_id: number;
  end_at?: string;
  sections: Section[];
  enrollments: Enrollment[];
  total_students: number;
  teachers: Teacher[];
};

export type Teacher = {
  id: number;
  display_name: string;
  avatar_image_url: string;
  html_url: string;
  pronouns?: any;
};

export type Section = {
  id: number;
  name: string;
  enrollment_role: 'StudentEnrollment' | string;
};

export type Enrollment = {
  type: string;
  role: 'StudentEnrollment' | string;
  role_id: number;
  user_id: number;
  enrollment_state: string;
  computed_current_score: number;
  computed_final_score: number;
};

export type Assignment = {
  id: number;
  description: string;
  due_at: string;
  points_possible: number;
  has_submitted_submissions: boolean;
  course_id: number;
  name: string;
  html_url: string;
  published: boolean;
  is_quiz_assignment: boolean;
};

export type AssignmentSubmission = {
  id: number;
  workflow_state: 'submitted' | 'unsubmitted' | 'graded' | 'pending_review';
  submitted_at: ParseThisStringAsDate;
  assignment_id: number;
};
