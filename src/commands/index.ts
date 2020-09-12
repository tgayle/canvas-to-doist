import Command from '@oclif/command';
import { validateConfig } from './validate';

export default class DefaultCommand extends Command {
  async run() {
    await validateConfig();
  }
}
