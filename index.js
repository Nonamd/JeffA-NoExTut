var express = require('express');
var bodyParser = require('body-parser');
var app = express();

app.use(bodyParser.json({type: 'application/json'}));

function lookupPhoto(req, res, next) {
  // We access the ID param on the request object
  var photoId = req.params.id;
  // Build an SQL query to select the resource object by ID
  var sql = ‘SELECT * FROM photo WHERE id = ?’;
  postgres.client.query(sql, [ photoId ], function(err, results) {
    if (err) {
      console.error(err);
      res.statusCode = 500;
      return res.json({ errors: [‘Could not retrieve photo’] });
    }
    // No results returned mean the object is not found
    if (results.rows.length === 0) {
      // We are able to set the HTTP status code on the res object
      res.statusCode = 404;
      return res.json({ errors: [‘Photo not found’] });
    }
    // By attaching a Photo property to the request
    // Its data is now made available in our handler function
    req.photo = results.rows[0];
    next();
  });
}

// Our handler function is passed a request and response object
app.get('/', function(req, res) {
  // We must end the request when we are done handling it
  res.end();
});

var app = express();

// Create the express router object for Photos
var photoRouter = express.Router();
// A GET to the root of a resource returns a list of that resource
photoRouter.get(‘/’, function(req, res) { });
// A POST to the root of a resource should create a new object
photoRouter.post(‘/’, function(req, res) { 
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
photoRouter.get(‘/:id’, lookupPhoto, function(req, res) {
  res.json(req.photo);
});
// Similar to the GET on an object, to update it we can PATCH
photoRouter.patch(‘/:id’, lookupPhoto, function(req, res) { });
// Delete a specific object
photoRouter.delete('/:id', lookupPhoto, function(req, res) { });
// Attach the routers for their respective paths
app.use(‘/photo’, photoRouter);

// Create the express router object for albums
var albumRouter = express.Router();
// A GET to the root of a resource returns a list of that resource
albumRouter.get(‘/’, function(req, res) { });
// A POST to the root of a resource should create a new object
albumRouter.post(‘/’, function(req, res) { });
// We specify a param in our path for the GET of a specific object
albumRouter.get(‘/:id’, function(req, res) { });
// Similar to the GET on an object, to update it we can PATCH
albumRouter.patch(‘/:id’, function(req, res) { });
// Delete a specific object
albumRouter.delete('/:id', function(req, res) { });
// Attach the routers for their respective paths
app.use(‘/album’, albumRouter);



module.exports = app;
