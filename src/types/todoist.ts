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
}