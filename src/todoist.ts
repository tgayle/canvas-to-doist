import axios, { AxiosInstance } from 'axios';
import {v4 as uuid} from 'uuid';
import { SyncResponse, Project, Item, Note } from './types/todoist';

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

  async getProjectItems(projectId: number) {
    const res = await this.http.post<SyncResponse<"items", Item>>('', {
      resource_types: '["items"]'
    }, {
      headers: {
        ...this.addAuth()
      }
    })

    return res.data.items.filter(item => item.project_id === projectId);
  }

  async getNotes() {
    const res = await this.http.post<SyncResponse<"notes", Note>>('', {
      resource_types: '["notes"]'
    }, {
      headers: {
        ...this.addAuth()
      }
    })

    return res.data.notes;
  }

  async getProjectItemsMap(projectId: number, allNotes: Note[]): Promise<[Item[], {[key: number]: number}]> {
    const res = await this.http.post<SyncResponse<"items", Item>>('', {
      resource_types: '["items"]'
    }, {
      headers: {
        ...this.addAuth()
      }
    })

    const managedItems = res
      .data
      .items
      .filter(item => item.project_id === projectId && this.isItemManaged(item, allNotes)) ;
    
    const assignmentToItemId: {[key: number]: number} = {}; 


    managedItems.forEach(item => {
      const itemNotes = this.getNotesForItem(item, allNotes)
      assignmentToItemId[Number(itemNotes[0].content.split(' ')[1])] = item.id
    })

    return [managedItems, assignmentToItemId]
  }

  async createItem(content: string, due: Date, project_id?: number) {
    const command = [{
      type: "item_add",
      uuid: uuid(),
      temp_id: uuid(),
      args: {
        content,
        project_id,
        due: {date: due.toISOString().substring(0, 19) + 'Z'}
      }
    }]

    const res = await this.http.post<SyncResponse<"items", Item>>('', {
      // resource_types: '["items"]'
      commands: JSON.stringify(command)
    }, {
      headers: {
        ...this.addAuth()
      }
    })
  }

  async updateItem(itemId: number, content: string, due: Date, project_id?: number) {
    const command = [{
      type: "item_add",
      uuid: uuid(),
      temp_id: uuid(),
      args: {
        id: itemId,
        content,
        project_id,
        due: {date: due.toISOString().substring(0, 19) + 'Z'}
      }
    }]

    const res = await this.http.post<SyncResponse<"items", Item>>('', {
      // resource_types: '["items"]'
      commands: JSON.stringify(command)
    }, {
      headers: {
        ...this.addAuth()
      }
    })
  }

  async completeItem(item: Item, dateCompleted: Date = new Date()) {
    const command = [{
      type: "item_complete",
      uuid: uuid(),
      args: {
        id: item.id,
        date_completed: dateCompleted.toISOString().substring(0, 19) + 'Z',
      }
    }]

    await this.http.post<SyncResponse<"items", Item>>('', {
      commands: JSON.stringify(command)
    }, {
      headers: this.addAuth()
    })
  }

  async addNote(item: Item, content: string) {
    const command = [{
      type: "note_add",
      uuid: uuid(),
      temp_id: uuid(),
      args: {
        content,
        item_id: item.id,
      }
    }]

    await this.http.post<SyncResponse<"items", Item>>('', {
      commands: JSON.stringify(command)
    }, {
      headers: this.addAuth()
    })
  }

  getNotesForItem(item: Item, allNotes: Note[]) {
    return allNotes
    .filter(note => note.item_id === item.id)
    .sort((a, b) => a.id - b.id)
  }

  isItemManaged(item: Item, itemNotes: Note[]) {
    return itemNotes.length && itemNotes[0].content.startsWith('CanvasID: ')
  }

}