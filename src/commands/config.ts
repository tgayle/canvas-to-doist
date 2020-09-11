import Command, { flags } from '@oclif/command';
import cli from 'cli-ux';
import ValidateConfig from './validate';
import Settings, { CONFIG_KEYS, TYPE_CONFIG_KEYS } from '../settings';
import settings from '../settings';

export default class ConfigCommand extends Command {
  static flags = {
    includePrivate: flags.boolean()
  };

  static strict = false;

  static args = [
    {
      name: 'action',
      required: true,
      default: 'list',
      options: ['list', 'validate', 'set']
    },
    {
      name: 'configKey',
      required: false,
      default: null,
      options: CONFIG_KEYS
    },
    {
      name: 'configValue',
      required: false,
      default: undefined
    }
  ];

  async run() {
    const { flags, args } = this.parse(ConfigCommand);

    switch (args.action) {
      case 'list': {
        const settings = Settings.getAllOptions();
        cli.table(settings, {
          key: {},
          value: {
            get: row => {
              return typeof row.value != 'undefined' && row !== null
                ? row.hidden && !flags.includePrivate
                  ? '<hidden>'
                  : row.value
                : 'null';
            }
          },
          hidden: {
            // header: 'private'
          }
        });

        return;
      }

      case 'validate': {
        return new ValidateConfig([], this.config).run();
      }

      case 'set': {
        const key = args.configKey;
        let val = args.configValue;

        if (typeof key !== 'string') {
          throw new Error(`Invalid key '${key}' was provided.`);
        }

        if (typeof val === 'undefined') {
          throw new Error('A value or null must be specified.');
        }

        if (val === 'null') {
          val = null;
        }

        switch (key as TYPE_CONFIG_KEYS) {
          case 'canvas_domain':
            settings.canvasDomain = val;
            break;
          case 'enrollment_term':
            settings.enrollmentTerm = val === null ? -1 : parseInt(val);
            break;
          case 'token_canvas':
            settings.canvasToken = val;
            break;
          case 'token_todoist':
            settings.todoistToken = val;
            break;
        }

        return;
      }

      default:
        this.error('Invalid command.');
    }
  }
}
