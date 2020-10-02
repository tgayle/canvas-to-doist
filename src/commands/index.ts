import Command from '@oclif/command';
import { validateConfig } from './validate';
import Canvas from '../canvas';
import settings, { CanvasCourseId } from '../settings';
import Todoist from '../todoist';
import { Assignment, AssignmentSubmission, Course } from '../types/canvas';
import { ItemLike, Note, Project } from '../types/todoist';
import Listr, { ListrTask } from 'listr';

type Await<T> = T extends {
  then(onfulfilled?: (value: infer U) => unknown): unknown;
}
  ? U
  : T;

enum CourseUpdateStatus {
  NEW,
  UPDATED,
  SKIPPED
}

export default class DefaultCommand extends Command {
  async run() {
    const startingTime = new Date();
    await validateConfig({
      canvas: { skip: false, term: true, token: true },
      interop: {
        failOnMissingCorrespondingProjects: false,
        skip: false,
        validateCoursesAndProjects: true
      },
      todoist: { projects: true, skip: false, token: true }
    });

    this.log('\n Courses:');
    const term = settings.enrollmentTerm;
    const mappings = settings.projectMappings[term];

    const canvas = new Canvas(settings.canvasToken!, settings.canvasDomain!);
    const doist = new Todoist(settings.todoistToken!);

    const projects = await doist.getProjects();
    const courses = (await canvas.getCourses(term)).filter(
      course => mappings[course.id] >= 0
    );
    const notes = await doist.getNotes();

    const coursesUpdated: Record<CanvasCourseId, CourseUpdateInfo[]> = {};

    await new Listr(
      [
        ...getCourseSyncTask(
          courses,
          projects,
          mappings,
          canvas,
          doist,
          notes,
          coursesUpdated
        ),

        {
          title: 'Sync with Todoist',
          task: async () => {
            await doist.commitCommands();
          }
        }
      ],
      // @ts-expect-error
      { collapse: true }
    ).run();

    await listUpdatedCourses(coursesUpdated, courses);

    const timeElapsed = new Date().getTime() - startingTime.getTime();
    this.log(`\nDone! (finished in ${(timeElapsed / 1000).toFixed(3)} s)`);
  }
}

type CourseUpdateInfo = {
  assignment: Assignment;
  status: CourseUpdateStatus;
};

function getCourseSyncTask(
  courses: Course[],
  projects: Project[],
  mappings: Record<number, number>,
  canvas: Canvas,
  doist: Todoist,
  notes: Note[],
  coursesUpdated: Record<
    number,
    { assignment: Assignment; status: CourseUpdateStatus }[]
  >
) {
  return courses.map<ListrTask>(course => {
    return {
      title: course.name,
      task: async (ctx, courseTask) => {
        const project = projects.find(
          project => project.id === mappings[course.id]
        );

        if (!project) {
          courseTask.skip('No corresponding project found for course.');
          return;
        }

        let assignments: Assignment[] = [];
        let assignmentSubmissionMap: Await<ReturnType<
          Canvas['getSubmissions']
        >> = {};
        let assignmentToItems: Await<ReturnType<
          Todoist['getProjectItemsMap']
        >> = {};

        return new Listr(
          [
            {
              title: 'Load assignments and submissions',
              task: async (ctx, task) => {
                const [
                  _assignments,
                  _assignmentSubmissionMap,
                  _assignmentToItems
                ] = await Promise.all([
                  canvas.getAssignments(course.id),
                  canvas.getSubmissions(course.id),
                  doist.getProjectItemsMap(project.id, notes)
                ]);

                assignments = _assignments;
                assignmentSubmissionMap = _assignmentSubmissionMap;
                assignmentToItems = _assignmentToItems;
              }
            },
            {
              title: 'Assignments',
              task: () => {
                return new Listr(
                  assignments.map<ListrTask>(assignment =>
                    getAssignmentSyncTask(
                      assignment,
                      assignmentToItems,
                      doist,
                      assignmentSubmissionMap,
                      course,
                      project,
                      coursesUpdated
                    )
                  ),
                  { concurrent: true }
                );
              }
            }
          ],
          // @ts-expect-error
          { collapse: true }
        );
      }
    };
  });
}

function getAssignmentSyncTask(
  assignment: Assignment,
  assignmentToItems: { [key: number]: ItemLike },
  doist: Todoist,
  assignmentSubmissionMap: { [key: number]: AssignmentSubmission },
  course: Course,
  project: Project,
  coursesUpdated: Record<
    number,
    { assignment: Assignment; status: CourseUpdateStatus }[]
  >
): Listr.ListrTask<any> {
  return {
    title: assignment.name,
    task: async (ctx, assignmentTask) => {
      let status: CourseUpdateStatus = CourseUpdateStatus.SKIPPED;
      const item = assignmentToItems[assignment.id];
      if (item) {
        const updated = await updateItemAsNecessary(
          doist,
          assignment,
          item,
          assignmentSubmissionMap
        );

        if (updated) {
          assignmentTask.output = `Assignment '${assignment.name}' was updated.`;
          status = CourseUpdateStatus.UPDATED;
        } else {
          assignmentTask.output = `[${course.name}] Assignment '${assignment.name}' did not need to be updated!`;
          status = CourseUpdateStatus.SKIPPED;
          assignmentTask.skip('No update necessary');
        }
      } else {
        status = CourseUpdateStatus.NEW;

        await createAssignmentItem(
          doist,
          assignment,
          project.id,
          assignmentSubmissionMap
        );
        assignmentTask.output = `[${course.name}] Assignment '${assignment.name}' was given an item.`;
      }

      if (!coursesUpdated[course.id]) {
        coursesUpdated[course.id] = [];
      }

      coursesUpdated[course.id].push({
        assignment: assignment,
        status: status
      });
    }
  };
}

async function listUpdatedCourses(
  coursesUpdated: Record<number, CourseUpdateInfo[]>,
  courses: Course[]
) {
  await new Listr(
    Object.keys(coursesUpdated).map(_courseId => {
      const courseId = parseInt(_courseId, 10);
      const assignments = coursesUpdated[courseId];

      const course =
        courses.find(course => course.id === courseId)?.name ??
        'Unknown? (' + courseId + ')';

      const numUpdated = assignments.filter(
        a => a.status === CourseUpdateStatus.UPDATED
      ).length;
      const numSkipped = assignments.filter(
        a => a.status === CourseUpdateStatus.SKIPPED
      ).length;
      const numCreated = assignments.filter(
        a => a.status === CourseUpdateStatus.NEW
      ).length;

      return {
        title: `${course} (${numCreated} created, ${numUpdated} updated, ${numSkipped} skipped)`,
        task: () => {
          return new Listr(
            assignments.map(assignment => {
              return {
                title: `${CourseUpdateStatus[assignment.status]} - ${
                  assignment.assignment.name
                }`,
                skip: () => assignment.status === CourseUpdateStatus.SKIPPED,
                task: () => {
                  return CourseUpdateStatus[assignment.status];
                }
              };
            }),
            // @ts-expect-error
            { collapse: false }
          );
        }
      };
    }),
    // @ts-expect-error
    { collapse: false }
  ).run();
}

async function completeItem(
  todoist: Todoist,
  submission: AssignmentSubmission,
  itemId: number | string
) {
  await todoist.addNote(
    itemId,
    `Completed at ${new Date(submission.submitted_at).toString()}`
  );
  await todoist.completeItem(itemId, new Date(submission.submitted_at));
}

async function updateItemAsNecessary(
  todoist: Todoist,
  assignment: Assignment,
  item: ItemLike,
  assignmentSubmissionMap: { [key: number]: AssignmentSubmission }
) {
  // ignore items already marked as completed.
  if (item.checked) return false;

  const submission = assignmentSubmissionMap[assignment.id];
  if (submission) {
    await completeItem(todoist, submission, item.id);
    return true;
  }

  return false;
}

async function createAssignmentItem(
  todoist: Todoist,
  assignment: Assignment,
  projectId: number,
  assignmentSubmissionMap: { [key: number]: AssignmentSubmission }
) {
  const itemId = await todoist.createItem(
    `[${assignment.name}](${assignment.html_url})`,
    new Date(assignment.due_at),
    projectId
  );

  const submission = assignmentSubmissionMap[assignment.id];
  if (submission) {
    await completeItem(todoist, submission, itemId);
  }

  await todoist.addNote(itemId, 'CanvasID: ' + assignment.id);
}
