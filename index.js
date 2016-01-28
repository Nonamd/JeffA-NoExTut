var express = require('express');
var bodyParser = require('body-parser');
var expressValidator = require('express-validator');

var app = express();

var postgres = require('./lib/postgres');

app.use(bodyParser.json({type: 'application/json'}));

app.use(expressValidator());

function lookupPhoto(req, res, next) {
  // We access the ID param on the request object
  var photoId = req.params.id;
  // Build an SQL query to select the resource object by ID
  var sql = 'SELECT * FROM photo WHERE id = ?';
  postgres.client.query(sql, [ photoId ], function(err, results) {
    if (err) {
      console.error(err);
      res.statusCode = 500;
      return res.json({ errors: ['Could not retrieve photo'] });
    }
    // No results returned mean the object is not found
    if (results.rows.length === 0) {
      // We are able to set the HTTP status code on the res object
      res.statusCode = 404;
      return res.json({ errors: ['Photo not found'] });
    }
    // By attaching a Photo property to the request
    // Its data is now made available in our handler function
    req.photo = results.rows[0];
    next();
  });
}

function validatePhoto(req, res, next) {
	req.checkBody('description', 'Invalid description').notEmpty();
	req.checkBody('album_id', 'Invalid album_id').isNumeric();

	var errors = req.validationErrors();
	if (errors) {
		var response = {errors: []};
		errors.forEach(function(err) {
			response.errors.push(err.msg);
		});

		res.statusCode = 400;
		return res.json(response);
	}

	return next();
}

// Our handler function is passed a request and response object
app.get('/', function(req, res) {
  // We must end the request when we are done handling it
  res.end();
});

// Create the express router object for Photos
var photoRouter = express.Router();
// A GET to the root of a resource returns a list of that resource
photoRouter.get('/', function(req, res) { 
// parseInt attempts to parse the value to an integer
// it returns a special "NaN" value when it is Not a Number.
	var page = parseInt(req.query.page, 10);
	if (isNaN(page) || page < 1) {
		page = 1;
	}

	var limit = parseInt(req.query.limit, 10);
	if (isNaN(limit)) {
		limit = 10;
	} else if (limit > 50) {
		limit = 50;
	} else if (limit < 1) {
		limit = 1;
	}

	var sql = 'SELECT count(1) FROM photo';
	postgres.client.query(sql, function(err, result) {
		if (err) {
			console.error(err);
			res.statusCode = 500;
			return res.json({
				errors: ['Could not retrieve photos']
			});
		}

	var count = parseInt(result.rows[0].count, 10);
	var offset = (page -1) * limit;

	sql = 'SELECT * FROM photo OFFSET $1 LIMIT $2';
	postgres.client.query(sql, [offset, limit], function(err, result) {
		if(err) {
			console.error(err);
			res.statusCode = 500;
			return res.json ({
				errors: ['Could not retrieve photos']
			});
		}

	return res.json(result.rows);

	});

	});

});
// A POST to the root of a resource should create a new object

photoRouter.post('/', validatePhoto, function(req, res) { 
	var sql = 'INSERT INTO photo (description, filepath, album_id) VALUES ($1, $2, $3) RETURNING id';
	var data = [
		req.body.description,
		req.body.filepath,
		req.body.album_id
	];
	postgres.client.query(sql, data, function(err, result) {
		if (err) {
			console.error(err);
			res.statusCode = 500;
			return res.json({
				errors: ['Failed to create photo']
			});
		}

		var newPhotoId = result.rows[0].id;
		var sql = 'SELECT * FROM photo WHERE id = $1';
		postgres.client.query(sql, [ newPhotoId ], function(err, result) {
			if (err) {
				console.error(err);
				res.statusCode = 500;
				return res.json({
					errors: ['Could not retrieve photo after create']
				});
			}

			res.statusCode = 201;
			res.json(result.rows[0]);
		});
	});
});
// We specify a param in our path for the GET of a specific object
photoRouter.get('/:id', lookupPhoto, function(req, res) {
  res.json(req.photo);
});
// Similar to the GET on an object, to update it we can PATCH
photoRouter.patch('/:id', lookupPhoto, function(req, res) { });
// Delete a specific object
photoRouter.delete('/:id', lookupPhoto, function(req, res) { });
// Attach the routers for their respective paths
app.use('/photo', photoRouter);

//Create the express router object for albums
var albumRouter = express.Router();
// A GET to the root of a resource returns a list of that resource
albumRouter.get('/', function(req, res) { });
// A POST to the root of a resource should create a new object
albumRouter.post('/', function(req, res) { });
// We specify a param in our path for the GET of a specific object
albumRouter.get('/:id', lookupPhoto, function(req, res) { });
// Similar to the GET on an object, to update it we can PATCH
albumRouter.patch('/:id', lookupPhoto, function(req, res) { });
// Delete a specific object
albumRouter.delete('/:id', lookupPhoto, function(req, res) { });
// Attach the routers for their respective paths
app.use('/album', albumRouter);



module.exports = app;
