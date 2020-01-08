import Canvas from './canvas';
import { config } from 'dotenv';
import Todoist from './todoist';
import buildDatabase from './db';
import canvasToTodoistMap from './canvasTodoistMappings'

(async function () {
  config()
  const db = buildDatabase()
  await db.load()

  const canvas = new Canvas(process.env.CANVAS!!, "fgcu")
  const doist = new Todoist(process.env.TODOIST!!)

  let [courses, projects] = await Promise.all([canvas.getCourses(), doist.getProjects()])

  courses = courses.filter(c => c.enrollment_term_id === 286)

  const notes = await doist.getNotes();
  const items = await doist.getProjectItems(2226258353);

  await doist.createItem('test item!', new Date(), 2226258353)

  // const itemNotes = doist.getNotesForItem(items[0], notes)
  // console.log(itemNotes);
  // for (const course of courses) {
  //   const projectId = canvasToTodoistMap[course.id]
  //   const project = projects.find(proj => proj.id === projectId)

  //   if (!project) {
  //     console.error(`Course ${course.name} (${course.id}) did not have a corresponding Todoist project, skipping...`)
  //     continue
  //   }

  //   const projectItems = await doist.getProjectItems(project.id)
  //   console.log(course.name)
  //   projectItems.forEach(item => console.log('\t', item))
  // }


})()