const ds = require("../datastore");
const datastore = ds.datastore;

const { COMPUTER_KIND } = require("../config");

/* ------------- Begin Model Functions ------------- */
function get_all() {
  const accepts = req.accepts("application/json"); //TODO: update status code

  const results = {};
  const q = datastore.createQuery(COMPUTER_KIND).limit(5);

  if (req.query && Object.keys(req.query).includes("cursor")) {
    q.start(req.query.cursor);
  }

  return datastore.runQuery(q).then((entities) => {
    results.items = entities[0].map(ds.fromDatastore);

    if (data[1].moreResults !== ds.Datastore.NO_MORE_RESULTS) {
      results.next = data[1].endCursor;
    }

    results.count = -1; // TODO: get unpaginated count

    return results;
  });
}

function get_by_property(propKey, propValue) {
  const accepts = req.accepts("application/json"); //TODO: update status code
  let value;

  //TODO: get relationship to peripherals

  propKey === "__key__"
    ? (value = datastore.key([COMPUTER_KIND, datastore.int(propValue)]))
    : (value = propValue);

  const q = datastore.createQuery(COMPUTER_KIND).filter(propKey, "=", value);
  return datastore.runQuery(q).then((data) => {
    return data[0]
      ? data[0].map(ds.fromDatastore)
      : { Error: "No computer with this computer_id exists" };
  });
}

function post_one(name, type, length, owner) {
  const key = datastore.key(COMPUTER_KIND);
  const entity = { name, type, length, owner };
  return datastore.save({ key: key, data: entity }).then(() => {
    entity.id = key.id;
    return entity;
  });
}

async function delete_one(id) {
  const entity = await get_by_property("__key__", id);

  if (entity.Error || entity.length !== 1) {
    return { Error: "No computer with this computer_id exists" };
  } else {
    const key = datastore.key([COMPUTER_KIND, parseInt(id, 10)]);
    return datastore.delete(key);
  }
}
/* ------------- End Model Functions ------------- */

module.exports = {
  get_all,
  get_by_property,
  post_one,
  delete_one,
};