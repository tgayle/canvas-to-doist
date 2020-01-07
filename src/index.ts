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

  const courses = await canvas.getCourses()

  courses
    .filter(c => c.enrollment_term_id === 286)
    .forEach(c => console.log(`(${c.enrollment_term_id}) ${c.name} - ${c.id}`))

  const projects = await doist.getProjects()
  projects.map(p => ({
    name: p.name,
    id: p.id,
    parent: p.parent_id
  }))
    .filter(p => p.parent === 2226258308)
    .forEach(p => console.log(`(${p.id}) ${p.name}`))
})()