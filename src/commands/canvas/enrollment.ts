import { Command } from '@oclif/command';
import { validateConfig } from '../validate';
import settings, { CanvasProjectMap } from '../../settings';
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

    if (
      await cli.confirm(
        `Term ID will be set to ${selectedCourse.enrollment_term_id}. Confirm?`
      )
    ) {
      settings.enrollmentTerm = selectedCourse.enrollment_term_id;
      this.log('Term ID updated to ' + settings.enrollmentTerm);

      const preexistingSelectedCourses =
        settings.projectMappings[settings.enrollmentTerm];

      const selectedCourses: {
        selectedTerms: Course[];
      } = await inquirer.prompt({
        type: 'checkbox',
        name: 'selectedTerms',
        choices: termCourses.map(course => {
          return {
            checked: !!preexistingSelectedCourses?.[course.id],
            value: course,
            name: course.name
          };
        })
      });

      const newMapping: CanvasProjectMap = {};

      selectedCourses.selectedTerms.forEach(course => {
        newMapping[course.id] = preexistingSelectedCourses?.[course.id] ?? -1;
      });

      settings.projectMappings = {
        ...settings.projectMappings,
        [settings.enrollmentTerm]: newMapping
      };
      this.log('Updated.');
    } else {
      this.log('Cancelled.');
    }
  }
}
