import Canvas from './canvas';
import {config} from 'dotenv';
import Todoist from './todoist';

(async function() {
  config()

  const canvas = new Canvas(process.env.CANVAS!!, "fgcu")
  const doist = new Todoist(process.env.TODOIST!!)

  // const courses = await canvas.getCourses()
  
  // courses
  //   .filter(c => c.enrollment_term_id === 286)
  //   .forEach(c => console.log(`(${c.enrollment_term_id}) ${c.name} - ${c.id}`))

  const projects = await doist.getProjects()
  console.log(projects)
})()