import axios, { AxiosInstance } from 'axios';
import { PotentialCourse, LockedCourse, Course, Assignment } from './types/canvas';

export default class Canvas {
  private token: string;
  private domain: string;
  private http: AxiosInstance;

  constructor(token: string, domain: string) {
    this.token = token
    this.domain = domain;

    this.http = axios.create({
      baseURL: `https://${this.domain}.instructure.com/api/v1/`,
    });
  }

  private addAuth() {
    return {
      Authorization: `Bearer ${this.token}`
    }
  }

  async getCourses() {
    const response = await this.http.get<PotentialCourse[]>('/courses', {
      headers: {
        ...this.addAuth()
      },
      params: {
        enrollment_type: 'student',
        include: ['sections', 'total_students', 'teachers', 'total_scores'],
        per_page: 1000,
      }
    });

    const courses = response.data.filter(isValidCourse)

    return courses;
  }

  async getAssignments(courseId: number) {
    const response = await this.http.get<Assignment[]>(`/courses/${courseId}/assignments`, {
      headers: this.addAuth(),
      params: {
        per_page: 1000,
      }
    })
    return response.data;
  }

}

function isValidCourse(potential: PotentialCourse): potential is Course {
  // keep items with this property
  return !!(potential as Course).name
}