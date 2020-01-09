export type SyncResponse <K extends string, R> = {
  sync_token: string,
  temp_id_mapping: any,
  full_sync: boolean,
} & {
  [key in K]: R[]
}

export type Project = {
  name: string;
  id: number;
  color: number;
  parent_id: number;
}

export type Item = ItemLike & {
  priority: number;
  due?: DueDateInfo;
  parent_id?: number;
  date_added: ParseThisStringAsDate;
}

export type DueDateInfo = {
  date: ParseThisStringAsDate;
  timezone?: string;
  is_recurring: boolean;
  string: string;
  lang: string;
}

export type Note = {
  is_deleted: 0 | 1;
  content: string;
  item_id: number;
  project_id: number;
  id: number;
  posted: ParseThisStringAsDate
}

export type ParseThisStringAsDate = string;

export type Command = {
  type: string;
  args: {[key: string]: any};
  uuid: string;
  temp_id: string;
}

export type CompletedItem = {
  task_id: number;
  completed_date: ParseThisStringAsDate;
  project_id: number;
  id: number;
  content: string;
  note_count: number;
}

export type ItemLike = {
  checked: 0 | 1;
  content: string;
  id: number;
  project_id: number;
}