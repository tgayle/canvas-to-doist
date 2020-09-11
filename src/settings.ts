import Conf from 'conf';
import { readFileSync } from 'fs';

type CTDConfig = {
  token_canvas: string | null;
  token_todoist: string | null;
  enrollment_term: number;
};

type ConfigParams = {
  private: boolean;
};

const CONFIG_DEFAULTS: CTDConfig = {
  token_canvas: null,
  enrollment_term: -1,
  token_todoist: null
};

const configSecurity: Record<keyof CTDConfig | string, ConfigParams> = {
  enrollment_term: {
    private: true
  },
  token_canvas: {
    private: true
  },
  token_todoist: {
    private: true
  }
};

// TODO: Allow specifying config from another path.
export class Settings {
  private config = new Conf<CTDConfig>({
    projectName: 'canvas-to-doist',
    defaults: CONFIG_DEFAULTS
  });

  constructor() {
    // Touch file to make sure it exists on first launch.
    if (!this.config.has('token_canvas')) {
      this.canvasToken = null;
    }
  }

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

  getAllOptions(): { key: string; value: any; hidden: boolean }[] {
    const settingsJson: Record<string, any> = JSON.parse(
      readFileSync(this.config.path).toString()
    );

    const options: { key: string; value: any; hidden: boolean }[] = [];

    for (const key of Object.keys(settingsJson)) {
      const value: any = settingsJson[key];

      options.push({
        key,
        value,
        hidden: configSecurity[key]?.private ?? true
      });
    }

    return options;
  }
}

export default new Settings();
