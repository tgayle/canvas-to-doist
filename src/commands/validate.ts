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

  todoist: {
    skip: boolean;
    projects: boolean;
    token: boolean;
  };
};

const defaultFlags: ConfigFlags = {
  canvas: {
    skip: false,
    term: false,
    token: true
  },
  todoist: {
    skip: false,
    projects: true,
    token: true
  }
};

export async function validateConfig(
  _flags: Partial<ConfigFlags> = defaultFlags
) {
  const flags = Object.assign(
    Object.assign({}, defaultFlags),
    _flags
  ) as ConfigFlags;

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
        title: 'Todoist',
        skip: () => {
          if (flags.todoist.skip) {
            return 'Skipped.';
          }

          if (settings.todoistToken === null) {
            return 'Todoist token missing.';
          }
        },
        task: async () => {
          const todoist = new Todoist(settings.todoistToken!);

          return new Listr([
            {
              title: 'Validate Token',
              skip: () => {
                if (!flags.todoist.token) {
                  return 'Skipped';
                }
              },
              task: async () => {
                await todoist.getProjects();
              }
            },
            {
              title: 'Validate Projects',
              skip: () => {
                if (!flags.todoist.projects) {
                  return 'Skipped';
                }
              },
              task: async () => {
                return 'TODO: validate projects.';
              }
            }
          ]);
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
