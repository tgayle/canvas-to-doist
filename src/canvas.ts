import axios, { AxiosInstance } from 'axios';
import {
  PotentialCourse,
  Course,
  Assignment,
  AssignmentSubmission
} from './types/canvas';

export default class Canvas {
  private token: string;
  private domain: string;
  private http: AxiosInstance;

  constructor(token: string, domain: string) {
    this.token = token;
    this.domain = domain;

    this.http = axios.create({
      baseURL: `https://${this.domain}.instructure.com/api/v1/`,
      headers: this.addAuth()
    });
  }

  private addAuth() {
    return {
      Authorization: `Bearer ${this.token}`
    };
  }

  async getCourses() {
    const response = await this.http.get<PotentialCourse[]>('/courses', {
      params: {
        enrollment_type: 'student',
        include: ['sections', 'total_students', 'teachers', 'total_scores'],
        per_page: 1000
      }
    });

    const courses = response.data.filter(isValidCourse);

    return courses;
  }

  async getAssignments(courseId: number) {
    const response = await this.http.get<Assignment[]>(
      `/courses/${courseId}/assignments`,
      {
        params: {
          per_page: 1000
        }
      }
    );
    return response.data;
  }

  async getSubmissions(
    courseId: number
  ): Promise<{ [key: number]: AssignmentSubmission }> {
    const response = await this.http.get<AssignmentSubmission[]>(
      `/courses/${courseId}/students/submissions`,
      {
        params: {
          per_page: 1000
        }
      }
    );

    const submissions = response.data.filter(sub => {
      return (
        !sub.missing &&
        (sub.workflow_state === 'graded' ||
          sub.workflow_state === 'submitted' ||
          sub.workflow_state === 'pending_review')
      );
    });

    const assignmentIdToSubmission: {
      [key: number]: AssignmentSubmission;
    } = {};

    submissions.forEach(submission => {
      assignmentIdToSubmission[submission.assignment_id] = submission;
    });

    return assignmentIdToSubmission;
  }
}

function isValidCourse(potential: PotentialCourse): potential is Course {
  // keep items with this property
  return !!(potential as Course).name;
}
