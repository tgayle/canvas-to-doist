import Canvas from './canvas';
import { config } from 'dotenv';
import Todoist from './todoist';
import buildDatabase from './db';

import { projects as canvasToTodoistMap } from '../mappings.json'

(async function () {
  config()
  const db = buildDatabase()
  await db.load()

  const canvas = new Canvas(process.env.CANVAS!!, "fgcu")
  const doist = new Todoist(process.env.TODOIST!!)

  let [courses, projects] = await Promise.all([canvas.getCourses(), doist.getProjects()])

  courses = courses.filter(c => c.enrollment_term_id === 286)


  courses.forEach(c => console.log(`(${c.enrollment_term_id}) ${c.name} - ${c.id}`))

  const assignments = await canvas.getAssignments(courses[0].id)
  assignments.forEach(a => console.log(a.name))
})()