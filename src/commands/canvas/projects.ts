import { Command } from '@oclif/command';
import { validateConfig } from '../validate';
import Canvas from '../../canvas';
import settings from '../../settings';
import Todoist from '../../todoist';
import inquirer from 'inquirer';

export default class CourseToProjectSelector extends Command {
  async run() {
    await validateConfig({
      canvas: {
        skip: false,
        term: true,
        token: true
      },
      todoist: {
        skip: false,
        projects: true,
        token: true
      }
    });

    const canvas = new Canvas(settings.canvasToken!, settings.canvasDomain!);
    const doist = new Todoist(settings.todoistToken!);

    const term = settings.enrollmentTerm;

    const allCourses = await canvas.getCourses(term);

    const projects = await doist.getProjects();

    let running = true;
    while (running) {
      const courseMappings = settings.projectMappings[term];
      const courses = allCourses.filter(
        course => typeof courseMappings[course.id] === 'number'
      );
      const { courseName }: { courseName: string } = await inquirer.prompt({
        type: 'list',
        name: 'courseName',
        message: 'Select course:',
        choices: courses.map(course => {
          return `[${
            courseMappings[course.id] > 0
              ? courseMappings[course.id]
              : 'Not set'
          }] - ${course.name}`;
        })
      });

      const course = courses.find(
        course =>
          course.name === courseName.substring(courseName.indexOf('] - ') + 4)
      );

      if (!course) {
        throw new Error(
          `There was an error trying to resolve course ${courseName}`
        );
      }

      const { projectName }: { projectName: string } = await inquirer.prompt({
        type: 'list',
        name: 'projectName',
        loop: false,
        message: 'What project should assignments from this course be copied?',
        choices: projects.map(project => project.name),
        default: projects.findIndex(
          project => project.id === courseMappings[course.id]
        )
      });

      const selectedProject = projects.find(
        project => project.name === projectName
      );

      const { confirmed }: { confirmed: boolean } = await inquirer.prompt({
        type: 'confirm',
        name: 'confirmed',
        message: `Save '${course.name}' assignments to project '${projectName}'?`,
        default: false
      });

      if (confirmed) {
        settings.projectMappings = {
          ...settings.projectMappings,
          [term]: {
            ...courseMappings,
            [course.id]: selectedProject?.id ?? -1
          }
        };
      } else {
        this.log('Cancelled.');
      }

      const shouldUpdateAnother = await (
        await inquirer.prompt({
          type: 'confirm',
          name: 'confirmed',
          message: 'Update another course?',
          default: true
        })
      ).confirmed;

      if (!shouldUpdateAnother) {
        running = false;
      }
    }
  }
}
