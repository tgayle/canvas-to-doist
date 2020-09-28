import { Command } from '@oclif/command';
import settings from '../settings';
import Listr from 'listr';
import Canvas from '../canvas';
import Todoist from '../todoist';

type ConfigFlags = {
  canvas: {
    token: boolean;
    term: boolean;
    skip: boolean;
  };
};

const defaultFlags: ConfigFlags = {
  canvas: {
    skip: false,
    term: false,
    token: true
  }
};

export async function validateConfig(flags: ConfigFlags = defaultFlags) {
  const tasks = new Listr(
    [
      {
        title: 'Canvas',
        skip: () => {
          if (flags.canvas.skip) {
            return 'Skipped.';
          }

          if (settings.canvasToken === null) {
            return 'Canvas token missing.';
          }

          if (settings.canvasDomain === null) {
            return 'Canvas domain not set.';
          }
        },
        task: () => {
          return new Listr([
            {
              title: 'Validate Token',
              skip() {
                if (!flags.canvas.token) {
                  return 'Skipped.';
                }
              },
              task: async () => {
                const canvas = new Canvas(
                  settings.canvasToken!,
                  settings.canvasDomain!
                );

                await canvas.getCourses();
              }
            },
            {
              title: 'Validate Enrollment Term',
              skip: () => {
                if (!flags.canvas.term) {
                  return 'Skipped';
                }
                if (settings.enrollmentTerm < 0) {
                  throw new Error('Enrollment term is missing.');
                }
              },
              task: async () => {
                const canvas = new Canvas(
                  settings.canvasToken!,
                  settings.canvasDomain!
                );

                const termId = settings.enrollmentTerm;

                const termCourses = (await canvas.getCourses()).filter(
                  course => course.enrollment_term_id === termId
                );

                return `${termCourses.length} courses found for the given ernollment term.`;
              }
            }
          ]);
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
        }
      }
    ],
    // @ts-expect-error
    { collapse: false }
  );

  return await tasks.run();
}
export default class ValidateConfig extends Command {
  static description = 'Validates configuration.';

  async run() {
    await validateConfig();
  }
}
