import { Command } from '@oclif/command';

export default class ValidateConfig extends Command {
  async run() {
    this.log('Validating config...');
  }
}
