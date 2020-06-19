const express = require("express");
const router = express.Router();

const computers = require("../api/computers");
const peripherals = require("../api/peripherals");

const { checkJwt, PERIPHERALS_PATH } = require("../config");

/* ------------- Begin Controller Functions ------------- */
router.get("/", checkJwt, async (req, res) => {
  const accepts = req.accepts("application/json");

  if (!accepts) {
    res.status(406).send("Not Acceptable");
  } else {
    computers.get_by_property(req, "user", req.user.sub).then(async (data) => {
      data.items.map((entity) => {
        entity.self = `${req.protocol}://${req.get("host")}${req.baseUrl}/${
          entity.id
        }`;
      });

      for (let entity of data.items) {
        const children = await peripherals.get_by_property(
          "computer",
          entity.id
        );
        children && children.length
          ? (entity.peripherals = children.map(({ id }) => ({
              id,
              self: `${req.protocol}://${req.get(
                "host"
              )}${PERIPHERALS_PATH}/${id}`,
            })))
          : (entity.peripherals = []);
      }

      if (data.next) {
        data.next = `${req.protocol}://${req.get("host")}${
          req.baseUrl
        }?cursor=${data.next}`;
      }

      res.status(200).json(data);
    });
  }
});

router.get("/:id", checkJwt, (req, res) => {
  const accepts = req.accepts("application/json");

  if (!accepts) {
    res.status(406).send("Not Acceptable");
  } else {
    computers
      .get_by_property(req, "__key__", req.params.id)
      .then(async (data) => {
        if (!data.items || data.items.length !== 1) {
          // Set the status code to 403 if a protected resource was not found.
          res.status(403).end();
        } else if (data.items[0].user && data.items[0].user !== req.user.sub) {
          // Set the status code to 403 if a protected resource does not belong to the current user.
          res.status(403).end();
        } else {
          const entity = data.items[0];
          entity.self = `${req.protocol}://${req.get("host")}${req.baseUrl}/${
            entity.id
          }`;

          const children = await peripherals.get_by_property(
            "computer",
            entity.id
          );
          children && children.length
            ? (entity.peripherals = children.map(({ id }) => ({
                id,
                self: `${req.protocol}://${req.get(
                  "host"
                )}${PERIPHERALS_PATH}/${id}`,
              })))
            : (entity.peripherals = []);

          res.status(200).json(entity);
        }
      });
  }
});

router.post("/", checkJwt, (req, res) => {
  const accepts = req.accepts("application/json");

  if (req.get("Content-Type") !== "application/json") {
    res.status(415).send("Server only accepts application/json data");
  } else if (!accepts) {
    res.status(406).send("Not Acceptable");
  } else if (req.body.id || req.body.self) {
    res.status(400).json({
      Error:
        "The request object attempted to specify one or more idempotent attributes",
    });
  } else if (
    !req.body.manufacturer ||
    !req.body.model ||
    !req.body.serial_number
  ) {
    res.status(400).json({
      Error:
        "The request object is missing at least one of the required attributes",
    });
  } else {
    const entity = {
      manufacturer: req.body.manufacturer,
      model: req.body.model,
      serial_number: req.body.serial_number,
      user: req.user.sub,
    };

    computers.post_one(entity).then((entity) => {
      entity.self = `${req.protocol}://${req.get("host")}${req.baseUrl}/${
        entity.id
      }`;

      // Append an empty array rather than querying for related non-user entities,
      // since this relationship can't exist yet.
      entity.peripherals = [];

      res.status(201).json(entity);
    });
  }
});

router.patch("/:id", checkJwt, (req, res) => {
  const accepts = req.accepts("application/json");

  if (req.get("Content-Type") !== "application/json") {
    res.status(415).send("Server only accepts application/json data");
  } else if (!accepts) {
    res.status(406).send("Not Acceptable");
  } else if (req.body.id || req.body.self) {
    res.status(400).json({
      Error:
        "The request object attempted to specify one or more idempotent attributes",
    });
  } else if (
    !req.body.manufacturer &&
    !req.body.model &&
    !req.body.serial_number
  ) {
    res.status(400).json({
      Error: "The request object contains no modifiable attribute",
    });
  } else {
    computers.get_by_property(req, "__key__", req.params.id).then((data) => {
      if (!data.items || data.items.length !== 1) {
        // Set the status code to 403 if a protected resource was not found.
        res.status(403).end();
      } else if (data.items[0].user && data.items[0].user !== req.user.sub) {
        // Set the status code to 403 if a protected resource does not belong to the current user.
        res.status(403).end();
      } else {
        const originalEntity = data.items[0];
        const updatedEntity = {
          manufacturer: req.body.manufacturer || originalEntity.manufacturer,
          model: req.body.model || originalEntity.model,
          serial_number: req.body.serial_number || originalEntity.serial_number,
          user: req.user.sub,
        };
        computers
          .update_one(req.params.id, updatedEntity)
          .then(async (entity) => {
            entity.self = `${req.protocol}://${req.get("host")}${req.baseUrl}/${
              entity.id
            }`;

            const children = await peripherals.get_by_property(
              "computer",
              entity.id
            );
            children && children.length
              ? (entity.peripherals = children.map(({ id }) => ({
                  id,
                  self: `${req.protocol}://${req.get(
                    "host"
                  )}${PERIPHERALS_PATH}/${id}`,
                })))
              : (entity.peripherals = []);
            res.status(200).json(entity);
          });
      }
    });
  }
});

router.put("/:id", checkJwt, (req, res) => {
  const accepts = req.accepts("application/json");

  if (req.get("Content-Type") !== "application/json") {
    res.status(415).send("Server only accepts application/json data");
  } else if (!accepts) {
    res.status(406).send("Not Acceptable");
  } else if (
    !req.body.manufacturer ||
    !req.body.model ||
    !req.body.serial_number
  ) {
    res.status(400).json({
      Error:
        "The request object is missing at least one of the required attributes",
    });
  } else if (req.body.id || req.body.self) {
    res.status(400).json({
      Error:
        "The request object attempted to specify one or more idempotent attributes",
    });
  } else {
    computers.get_by_property(req, "__key__", req.params.id).then((data) => {
      if (!data.items || data.items.length !== 1) {
        // Set the status code to 403 if a protected resource was not found.
        res.status(403).end();
      } else if (data.items[0].user && data.items[0].user !== req.user.sub) {
        // Set the status code to 403 if a protected resource does not belong to the current user.
        res.status(403).end();
      } else {
        const entity = {
          manufacturer: req.body.manufacturer,
          model: req.body.model,
          serial_number: req.body.serial_number,
          user: req.user.sub,
        };
        computers.update_one(req.params.id, entity).then(async (entity) => {
          entity.self = `${req.protocol}://${req.get("host")}${req.baseUrl}/${
            entity.id
          }`;

          const children = await peripherals.get_by_property(
            "computer",
            entity.id
          );
          children && children.length
            ? (entity.peripherals = children.map(({ id }) => ({
                id,
                self: `${req.protocol}://${req.get(
                  "host"
                )}${PERIPHERALS_PATH}/${id}`,
              })))
            : (entity.peripherals = []);

          res.status(200).json(entity);
        });
      }
    });
  }
});

router.put("/:computer_id/peripherals/:peripheral_id", (req, res) => {
  peripherals
    .get_by_property("__key__", req.params.peripheral_id)
    .then((child_data) => {
      if (child_data.length !== 1) {
        res.status(404).json({
          Error: "The specified computer and/or peripheral don\u2019t exist",
        });
      } else {
        computers
          .get_by_property(req, "__key__", req.params.computer_id)
          .then((parent_data) => {
            if (parent_data.items.length !== 1) {
              res.status(404).json({
                Error:
                  "The specified computer and/or peripheral don\u2019t exist",
              });
            } else if (child_data[0].computer) {
              res.status(403).json({
                Error:
                  "The specified peripheral is already assigned to a computer.",
              });
            } else {
              peripherals
                .update_one(
                  child_data[0].id,
                  child_data[0].manufacturer,
                  child_data[0].type,
                  child_data[0].serial_number,
                  parent_data.items[0].id
                )
                .then(() => res.status(204).end());
            }
          });
      }
    });
});

router.delete("/:computer_id/peripherals/:peripheral_id", (req, res) => {
  computers
    .get_by_property(req, "__key__", req.params.computer_id)
    .then((parent_data) => {
      if (parent_data.items.length !== 1) {
        res.status(404).json({
          Error:
            "No computer with this computer_id has a peripheral with this peripheral_id",
        });
      } else {
        peripherals
          .get_by_property("__key__", req.params.peripheral_id)
          .then((child_data) => {
            if (child_data.length !== 1) {
              res.status(404).json({
                Error:
                  "No computer with this computer_id has a peripheral with this peripheral_id",
              });
            } else {
              child_data[0].computer !== req.params.computer_id
                ? res.status(404).json({
                    Error:
                      "No computer with this computer_id has a peripheral with this peripheral_id",
                  })
                : peripherals
                    .update_one(
                      child_data[0].id,
                      child_data[0].manufacturer,
                      child_data[0].type,
                      child_data[0].serial_number,
                      null
                    )
                    .then(() => res.status(204).end());
            }
          });
      }
    });
});

router.delete("/:id", checkJwt, async (req, res) => {
  const data = await computers.get_by_property(req, "__key__", req.params.id);

  if (data.items && data.items.length === 1) {
    if (data.items[0].user === req.user.sub) {
      const children = await peripherals.get_by_property(
        "computer",
        req.params.id
      );

      for (let child of children) {
        peripherals.update_one(
          child.id,
          child.manufacturer,
          child.type,
          child.serial_number,
          null
        );
      }

      computers.delete_one(req.params.id).then((data) => {
        if (data.Error) {
          res.status(403).json(data);
        } else {
          res.status(204).end();
        }
      });
    } else {
      res.status(403).end();
    }
  } else {
    res.status(404).json({ Error: "No computer with this computer_id exists" });
  }
});

router.all("/", (req, res) => {
  res.set("Allow", "GET, POST");
  res.status(405).end();
});

router.all("/:id", (req, res) => {
  res.set("Allow", "GET, PATCH, PUT, DELETE");
  res.status(405).end();
});

router.all("/:computer_id/peripherals/:peripheral_id", (req, res) => {
  res.set("Allow", "PUT, DELETE");
  res.status(405).end();
});

/* ------------- End Controller Functions ------------- */

module.exports = router;
