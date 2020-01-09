# canvas-to-doist

A script that moves Canvas Instruture assignments into Todoist projects.

## Usage:

* Find your course ID from Canvas:
  * `https://****.instructure.com/courses/XXXXXX`
    * XXXXXX is your course's ID
* Create a Project in Todoist for this course and get it's ID.
* Fill in these values in a file called `mappings.json`
* Populate the values in your `.env` file with your Todoist Token, Canvas Access Token, and the domain for your school's canvas page.

* `npm i`
* `npm start`