import Command, { flags } from '@oclif/command';
import cli from 'cli-ux';
import ValidateConfig from './validate';
import Settings from '../settings';

export default class ConfigCommand extends Command {
  static flags = {
    validate: flags.boolean({ default: true }),
    list: flags.boolean(),
    includePrivate: flags.boolean()
  };

  async run() {
    const { flags } = this.parse(ConfigCommand);

    if (flags.list) {
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

    if (flags.validate) {
      return new ValidateConfig([], this.config).run();
    }
  }
}
