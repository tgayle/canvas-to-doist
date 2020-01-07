import Datastore from 'nedb-promises';

export default function buildDatabase() {
  return Datastore.create({
    autoload: true,
    filename: 'persistence.nedb'
  });
}