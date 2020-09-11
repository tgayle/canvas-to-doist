import { Command } from '@oclif/command';
import settings from '../settings';
import Listr from 'listr';
import Canvas from '../canvas';
import Todoist from '../todoist';
export default class ValidateConfig extends Command {
  async run() {
    const tasks = new Listr([
      {
        title: 'Validate Canvas Token',
        skip: () => {
          if (settings.canvasToken === null) {
            return 'Canvas token missing.';
          }

          if (settings.canvasDomain === null) {
            return 'Canvas domain not set.';
          }
        },
        task: async () => {
          const canvas = new Canvas(
            settings.canvasToken!,
            settings.canvasDomain!
          );

          await canvas.getCourses();
          return 'Success!';
        }
      },
      {
        title: 'Validate Todoist Token',
        skip: () => {
          if (settings.todoistToken === null) {
            return 'Todoist token missing.';
          }
        },
        task: async () => {
          const todoist = new Todoist(settings.todoistToken!);

          await todoist.getProjects();
          return 'Success!';
        }
      }
    ]);

    await tasks.run();
  }
}
