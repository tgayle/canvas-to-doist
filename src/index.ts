import Canvas from './canvas';
import { config } from 'dotenv';
import Todoist from './todoist';
import buildDatabase from './db';
import canvasToTodoistMap from './canvasTodoistMappings'
import { Assignment, Course, AssignmentSubmission } from './types/canvas';
import { Item, Note, Project } from './types/todoist';

(async function () {
  config()
  const db = buildDatabase()
  await db.load()

  const canvas = new Canvas(process.env.CANVAS!!, "fgcu")
  const doist = new Todoist(process.env.TODOIST!!)

  let [courses, projects, notes] = await Promise.all([
    canvas.getCourses(), 
    doist.getProjects(), 
    doist.getNotes()
  ])

  courses = courses.filter(c => c.enrollment_term_id === 286)

  await processCourses(canvas, doist, courses, projects, notes);

})()

async function processCourses(canvas: Canvas, doist: Todoist, courses: Course[], projects: Project[], notes: Note[]) {
  const coursesPromise = courses.map(async (course) => {
    const projectId = canvasToTodoistMap[course.id]
    const project = projects.find(proj => proj.id === projectId)

    if (!project) {
      console.error(`Course ${course.name} (${course.id}) did not have a corresponding Todoist project, skipping...`)
      return;
    }

    console.log(`${course.name}: `)

    console.log('Fetching course info...')
    const [assignments, assignmentSubmissionMap, projectItemInfo] = await Promise.all([
      canvas.getAssignments(course.id), 
      canvas.getSubmissions(course.id), 
      doist.getProjectItemsMap(project.id, notes)
    ])

    const [courseItems, assignmentToItems] = projectItemInfo

    await Promise.all(assignments.map(async (assignment) => {
      const itemId = assignmentToItems[assignment.id];
      if (itemId) {
        const item = courseItems.find(item => item.id == itemId) as Item // can't be null at this point
        const updated = await updateItemAsNecessary(canvas, doist, assignment, item, assignmentSubmissionMap)

        if (updated) {
          console.log(`Assignment '${assignment.name}' was updated.`)
        }
      } else {
        await createAssignmentItem(canvas, doist, assignment, project.id, assignmentSubmissionMap)
        console.log(`[${course.name}] Assignment '${assignment.name}' was given an item.`)
      }
    }))
  })

  console.log('Waiting for all courses to finish their business...')
  await Promise.all(coursesPromise);
  console.log('Done!')
  console.log('Committing...');

  console.log(doist.pendingCommands);
  // const todoistResult = await doist.commitCommands();
  // console.log(todoistResult);
}

async function updateItemAsNecessary(
  canvas: Canvas,
  todoist: Todoist,
  assignment: Assignment,
  item: Item,
  assignmentSubmissionMap: { [key: number]: AssignmentSubmission }) {
  // ignore items already marked as completed.
  if (item.checked) return false;

  const submission = assignmentSubmissionMap[assignment.id];
  if (submission) {
    await completeItem(todoist, assignment, submission, item.id)
    return true;
  }

  return false;
}

async function completeItem(todoist: Todoist, assignment: Assignment, submission: AssignmentSubmission, itemId: number | string) {
  await todoist.addNote(itemId, `Completed at ${new Date(submission.submitted_at).toString()}`)
  await todoist.completeItem(itemId, new Date(submission.submitted_at))
}

async function createAssignmentItem(canvas: Canvas, todoist: Todoist, assignment: Assignment, projectId: number, assignmentSubmissionMap: { [key: number]: AssignmentSubmission }) {
  const itemId = await todoist.createItem(
    `[${assignment.name}](${assignment.html_url})`, 
    new Date(assignment.due_at), 
    projectId
  );

  const submission = assignmentSubmissionMap[assignment.id]
  if (submission) {
    await completeItem(todoist, assignment, submission, itemId);
  }

  await todoist.addNote(itemId, "CanvasID: " + assignment.id)
}