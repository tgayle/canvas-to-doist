import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { v4 as uuid } from 'uuid';
import { SyncResponse, Project, Item, Note, Command, CompletedItem, ItemLike } from './types/todoist';

export default class Todoist {
  executeCommandsImmediately = false;

  private token: string;
  private http: AxiosInstance;
  pendingCommands: Command[] = [];

  constructor(token: string) {
    this.token = token
    this.http = axios.create({
      headers: {
        Authorization: `Bearer ${this.token}`
      },
      baseURL: 'https://api.todoist.com/sync/v8/sync',
    });
  }

  private async queueCommand(command: Command) {
    this.pendingCommands.push(command);

    if (this.executeCommandsImmediately) {
      await this.commitCommands(this.pendingCommands);
    }
  }

  async commitCommands(commands: Command[] = this.pendingCommands) {
    if (!commands.length) {
      return [];
    }

    const results: SyncResponse<"", Item>[] = [];

    if (commands.length > 100) {
      for (const commandChunk of this.chunkArrayInGroups(commands, 100)) {
        results.push(...(await this.commitCommands(commandChunk)).flat())
      }
      return results;
    }

    let res: any = {};

    try {
      res = await this.http.post<SyncResponse<"items", Item>>('', {
        commands: JSON.stringify(commands)
      }, {
      })
    } catch (error) {
      console.error(error.response);
    }

    results.push(res);

    return results;
  }

  async getProjects() {
    const res = await this.http.post<SyncResponse<"projects", Project>>('', {
      resource_types: '["projects"]'
    }, {
    })

    return res.data.projects;
  }

  async getItems() {
    const res = await this.http.post<SyncResponse<"items", Item>>('', {
      resource_types: '["items"]'
    }, {
    })

    return res.data;
  }

  async getProjectItems(projectId: number) {
    const [uncompleted, [completedItems, completedNotes]] = await Promise.all([this.getItems(), this.getCompletedItems(projectId)]);

    const uncompletedItems: ItemLike[] = uncompleted.items
    const res = uncompletedItems.filter(item => item.project_id === projectId);
    res.push(...completedItems);
    return res;
  }

  async getNotes() {
    const res = await this.http.post<SyncResponse<"notes", Note>>('', {
      resource_types: '["notes"]'
    }, {
    })

    return res.data.notes;
  }

  async getProjectItemsMap(projectId: number, allNotes: Note[]): Promise<{ [key: number]: ItemLike }> {
    const [ uncompletedItems, [completedItems, completedItemNotes]] = await Promise.all([
      this.getProjectItems(projectId), 
      this.getCompletedItems(projectId)
    ])

    // TODO: Don't mutate this array like this.
    allNotes.push(...completedItemNotes)
    const managedItems = [...uncompletedItems, ...completedItems]
      .filter(this.itemIsManaged(projectId, allNotes));

    const assignmentToItemId: { [key: number]: ItemLike } = {};


    managedItems.forEach(item => {
      const itemNotes = this.getNotesForItem(item, allNotes)
      const assignmentIdItem = itemNotes.find(note => note.content.startsWith('CanvasID'))
      
      if (assignmentIdItem) {
        const noteText = assignmentIdItem.content;
        assignmentToItemId[Number(noteText.substring(noteText.indexOf(' ')).trim())] = item
      }
    })

    return assignmentToItemId
  }

  itemIsManaged(projectId: number, allNotes: Note[]) {
    return (item: ItemLike) => {
      return item.project_id === projectId && this.isItemManaged(item, this.getNotesForItem(item, allNotes));
    }
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
        due: { date: this.dateToTodoist(due) }
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
      (due) ? { date: this.dateToTodoist(due) } :
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

  async getCompletedItems(projectId: number): Promise<[ItemLike[], Note[]]> {
    const allItems: ItemLike[] = [];
    const notes: Note[] = [];

    let numSeenLast = 0;

    do {
      const {data} = await this.http.post<{ items: (CompletedItem & { notes: Note[] })[] }>('https://api.todoist.com/sync/v8/completed/get_all', {
        project_id: projectId,
        annotate_notes: true,
        limit: 200,
        offset: numSeenLast
      });

      numSeenLast = data.items.length;
      allItems.push(...data.items.map(this.completedItemToProper))
      notes.push(...data.items.map(item => item.notes).flat())
    } while (numSeenLast != 0);

    return [allItems, notes];
  }

  getNotesForItem(item: ItemLike, allNotes: Note[]) {
    return allNotes
      .filter(note => note.item_id === item.id)
      .sort((a, b) => a.id - b.id)
  }

  isItemManaged(item: ItemLike, itemNotes: Note[]) {
    return itemNotes.length && itemNotes.some(note => note.content.startsWith('CanvasID:'))
  }

  dateToTodoist(date: Date) {
    return date.toISOString().substring(0, 19) + 'Z'
  }

  chunkArrayInGroups<T>(arr: T[], size: number) {
    const myArray: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      myArray.push(arr.slice(i, i + size));
    }
    return myArray;
  }

  completedItemToProper(item: CompletedItem): ItemLike {
    return {
      checked: 1,
      content: item.content,
      id: item.task_id,
      project_id: item.project_id,
    }
  }
}