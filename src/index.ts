import Canvas from './canvas';
import { config } from 'dotenv';
import Todoist from './todoist';
import buildDatabase from './db';
import canvasToTodoistMap from './canvasTodoistMappings'
import { Assignment } from './types/canvas';
import { Item, Note } from './types/todoist';

(async function () {
  config()
  const db = buildDatabase()
  await db.load()

  const canvas = new Canvas(process.env.CANVAS!!, "fgcu")
  const doist = new Todoist(process.env.TODOIST!!)

  let [courses, projects, notes] = await Promise.all([canvas.getCourses(), doist.getProjects(), doist.getNotes()])

  courses = courses.filter(c => c.enrollment_term_id === 286)

  for (const course of courses) {
    const projectId = canvasToTodoistMap[course.id]
    const project = projects.find(proj => proj.id === projectId)

    if (!project) {
      console.error(`Course ${course.name} (${course.id}) did not have a corresponding Todoist project, skipping...`)
      continue
    }

    const assignments = await canvas.getAssignments(course.id)
    const [courseItems, assignmentToItems] = await doist.getProjectItemsMap(project.id, notes)
    console.log(course.name)

    for (const assignment of assignments) {
      const itemId = assignmentToItems[assignment.id];
      if (itemId) {
        const item = courseItems.find(item => item.id == itemId) as Item // can't be null at this point
        updateItemAsNecessary(canvas, doist, assignment, item, notes)
      } else {
        createAssignmentItem(canvas, doist, assignment)
        // TODO: Promise.map and await all at and or queue commands and commit at end.
      }
    }

  }
})()

async function updateItemAsNecessary(canvas: Canvas, todoist: Todoist, assignment: Assignment, item: Item, notes: Note[]) {

}

async function createAssignmentItem(canvas: Canvas, todoist: Todoist, assignment: Assignment) {

}