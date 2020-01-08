import axios, { AxiosInstance } from 'axios';
import {v4 as uuid} from 'uuid';
import { SyncResponse, Project, Item, Note, Command } from './types/todoist';

export default class Todoist {
  executeCommandsImmediately = false;

  private token: string;
  private http: AxiosInstance;
  private pendingCommands: Command[] = [];

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

  private async queueCommand(command: Command) {
    this.pendingCommands.push(command);

    if (this.executeCommandsImmediately) {
      await this.commitCommands();
    }
  }

  async commitCommands() {
    if (!this.pendingCommands.length) {
      return {};
    }

    const res = await this.http.post<SyncResponse<"items", Item>>('', {
      commands: JSON.stringify(this.pendingCommands)
    }, {
      headers: {
        ...this.addAuth()
      }
    })

    return res.data;
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

  async getItems() {
    const res = await this.http.post<SyncResponse<"items", Item>>('', {
      resource_types: '["items"]'
    }, {
      headers: {
        ...this.addAuth()
      }
    })

    return res.data;
  }

  async getProjectItems(projectId: number) {
    const result = await this.getItems();
    return result.items.filter(item => item.project_id === projectId);
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
    const itemTempId = uuid();
    const command = {
      type: "item_add",
      uuid: uuid(),
      temp_id: itemTempId,
      args: {
        content,
        project_id,
        due: {date: this.dateToTodoist(due)}
      }
    }

    await this.queueCommand(command)

    return itemTempId;
  }

  async updateItem(item: Item | number | string, content: string, due?: Date | null, project_id?: number) {
    const id = typeof item === 'object' ? item.id : item

    const command: Command = {
      type: "item_update",
      uuid: uuid(),
      temp_id: uuid(),
      args: {
        id,
        content,
        project_id,
      }
    }

    command.args.due = (due === null) ? null : 
                       (due) ? {date: this.dateToTodoist(due)} : 
                       undefined

    await this.queueCommand(command);
  }

  async completeItem(item: Item | number | string, dateCompleted: Date = new Date()) {
    const id = typeof item === 'object' ? item.id : item

    const command: Command = {
      type: "item_complete",
      uuid: uuid(),
      temp_id: uuid(),
      args: {
        id: id,
        date_completed: this.dateToTodoist(dateCompleted),
      }
    }

    await this.queueCommand(command);
  }

  async addNote(item: Item | number | string, content: string) {
    const id = typeof item === 'object' ? item.id : item

    const tempId = uuid();
    const command = {
      type: "note_add",
      uuid: uuid(),
      temp_id: tempId,
      args: {
        content,
        item_id: id,
      }
    }

    await this.queueCommand(command);
    return tempId;
  }

  async updateNote(item: Item | number | string, content: string) {
    const id = typeof item === 'object' ? item.id : item

    const tempId = uuid();
    const command = {
      type: "note_update",
      uuid: uuid(),
      temp_id: tempId,
      args: {
        id,
        content,
      }
    }

    await this.queueCommand(command);
    return tempId;
  }

  getNotesForItem(item: Item, allNotes: Note[]) {
    return allNotes
    .filter(note => note.item_id === item.id)
    .sort((a, b) => a.id - b.id)
  }

  isItemManaged(item: Item, itemNotes: Note[]) {
    return itemNotes.length && itemNotes[0].content.startsWith('CanvasID: ')
  }

  dateToTodoist(date: Date) {
    return date.toISOString().substring(0, 19) + 'Z'
  }

}