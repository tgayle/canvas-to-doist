import Command from '@oclif/command';

export default class DefaultCommand extends Command {
  async run() {
    this.log('test');
  }
}
