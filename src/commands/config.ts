import Command, { flags } from '@oclif/command';
import cli from 'cli-ux';
import ValidateConfig from './validate';
import Settings from '../settings';

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
      options: ['list', 'validate']
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
            header: 'private'
          }
        });

        return;
      }

      case 'validate': {
        return new ValidateConfig([], this.config).run();
      }

      default:
        this.error('Invalid command.');
    }
  }
}
