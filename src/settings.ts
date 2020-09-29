import Conf from 'conf';
import { readFileSync } from 'fs';

export type TodoistProjectId = number;
export type CanvasCourseId = number;
export type CanvasEnrollmentId = number;
export type CanvasProjectMap = Record<CanvasCourseId, TodoistProjectId>;
export type CourseProjectMapping = Record<CanvasEnrollmentId, CanvasProjectMap>;

type CTDConfig = {
  token_canvas: string | null;
  token_todoist: string | null;
  enrollment_term: number;
  canvas_domain: string | null;
  project_mappings: CourseProjectMapping;
};

type ConfigParams = {
  private: boolean;
};

const CONFIG_DEFAULTS: CTDConfig = Object.freeze({
  token_canvas: null,
  enrollment_term: -1,
  token_todoist: null,
  canvas_domain: null,
  project_mappings: {}
});

export const CONFIG_KEYS = Object.keys(CONFIG_DEFAULTS);
export type TYPE_CONFIG_KEYS = keyof CTDConfig;

const configSecurity: Record<keyof CTDConfig, ConfigParams> = {
  enrollment_term: {
    private: true
  },
  token_canvas: {
    private: true
  },
  token_todoist: {
    private: true
  },
  canvas_domain: {
    private: true
  },
  project_mappings: {
    private: false
  }
};

type SettingsMetaData<K extends keyof CTDConfig = keyof CTDConfig> = {
  key: K;
  value: CTDConfig[K];
  hidden: boolean;
};

// TODO: Allow specifying config from another path.
export class Settings {
  private config = new Conf<CTDConfig>({
    projectName: 'canvas-to-doist',
    defaults: CONFIG_DEFAULTS
  });

  get canvasToken() {
    return this.config.get('token_canvas', null);
  }

  set canvasToken(newToken: string | null) {
    this.config.set('token_canvas', newToken);
  }

  get todoistToken() {
    return this.config.get('token_todoist', null);
  }

  set todoistToken(newToken: string | null) {
    this.config.set('token_todoist', newToken);
  }

  get enrollmentTerm() {
    return this.config.get('enrollment_term', -1);
  }

  set enrollmentTerm(term: number) {
    this.config.set('enrollment_term', term);
  }

  get canvasDomain() {
    return this.config.get('canvas_domain', null);
  }

  set canvasDomain(domain: string | null) {
    this.config.set('canvas_domain', domain);
  }

  get projectMappings(): CourseProjectMapping {
    return this.config.get('project_mappings', {});
  }

  set projectMappings(mappings: CourseProjectMapping) {
    this.config.set('project_mappings', mappings);
  }

  getAllOptions(): SettingsMetaData[] {
    const settingsJson: CTDConfig = JSON.parse(
      readFileSync(this.config.path).toString()
    );

    const options: SettingsMetaData[] = [];

    for (const key of Object.keys(settingsJson) as (keyof CTDConfig)[]) {
      const value = settingsJson[key];

      options.push({
        key,
        value,
        hidden: configSecurity[key].private ?? true
      });
    }

    return options;
  }
}

export default new Settings();
