import axios, { AxiosInstance } from 'axios';
import { SyncResponse, Project } from './types/todoist';

export default class Todoist {
  private token: string;
  private http: AxiosInstance;

  constructor(token: string) {
    this.token = token
    this.http = axios.create({
      baseURL: 'https://api.todoist.com/sync/v8/sync',
    });
  }

  private addAuth() {
    return {
      Authorization: `Bearer ${this.token}`
    }
  }

  async getProjects() {
    const res = await this.http.post<SyncResponse<"projects", Project>>('', {
      resource_types: '["projects"]'
    }, {
      headers: {
        ...this.addAuth()
      }
    })

    return res.data.projects;
  }

}