import { Command } from '@oclif/command';
import { validateConfig } from '../validate';
import settings from '../../settings';
import Canvas from '../../canvas';
import * as inquirer from 'inquirer';
import { Course } from '../../types/canvas';
import cli from 'cli-ux';

inquirer.registerPrompt(
  'autocomplete',
  require('inquirer-autocomplete-prompt')
);

export default class CanvasCommand extends Command {
  async run() {
    await validateConfig({ canvas: { token: true, term: false, skip: false } });

    const canvas = new Canvas(settings.canvasToken!, settings.canvasDomain!);
    // const term = settings.enrollmentTerm;

    cli.action.start('Loading courses...');
    const courses = await (await canvas.getCourses()).sort(
      (a, b) => b.enrollment_term_id - a.enrollment_term_id
    );

    cli.action.stop();

    const answers = await inquirer.prompt({
      // @ts-expect-error
      type: 'autocomplete',
      message: 'What course matches your current term?',
      name: 'course',
      transformer: (course: Course) => {
        return course.name;
      },
      source: (_, input) => {
        return courses.filter(course =>
          course.name.toLowerCase().includes(String(input || '').toLowerCase())
        );
      }
    });

    const selectedCourse = courses.find(
      course => course.name === answers.course
    );

    if (!selectedCourse) {
      throw new Error('Could not find specified course: ' + answers.course);
    }

    const termCourses = courses.filter(
      course => course.enrollment_term_id === selectedCourse.enrollment_term_id
    );

    cli.table(termCourses, {
      enrollment_term_id: {
        header: 'Term ID'
      },
      name: {}
    });

    const confirmed = await cli.confirm(
      'Term id will be set to include the following courses. Confirm?'
    );

    if (confirmed) {
      settings.enrollmentTerm = selectedCourse.enrollment_term_id;
      this.log('Term ID updated to ' + settings.enrollmentTerm);
    } else {
      this.log('Cancelled.');
    }
  }
}
