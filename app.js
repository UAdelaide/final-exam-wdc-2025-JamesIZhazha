const mysql = require('mysql2/promise');
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'dogwalkservice'
};


app.get('/api/dogs', async (req, res) => {
  try {
    const [dogs] = await pool.query(`
      SELECT d.name AS dog_name, d.size, u.username AS owner_username
      FROM Dogs d
      JOIN Users u ON d.owner_id = u.user_id
    `);
    res.json(dogs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

app.get('/api/walkrequests/open', async (req, res) => {
  try {
    const [requests] = await pool.query(`
      SELECT 
        wr.request_id,
        d.name AS dog_name,
        wr.requested_time,
        wr.duration_minutes,
        wr.location,
        u.username AS owner_username
      FROM WalkRequests wr
      JOIN Dogs d ON wr.dog_id = d.dog_id
      JOIN Users u ON d.owner_id = u.user_id
      WHERE wr.status = 'open'
    `);
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

app.get('/api/walkers/summary', async (req, res) => {
  try {
    const [walkers] = await pool.query(`
      SELECT 
        u.username AS walker_username,
        COUNT(wr.rating) AS total_ratings,
        AVG(wr.rating) AS average_rating,
        COUNT(DISTINCT CASE WHEN wa.status = 'accepted' AND wreq.status = 'completed' 
              THEN wreq.request_id END) AS completed_walks
      FROM Users u
      LEFT JOIN WalkApplications wa ON u.user_id = wa.walker_id
      LEFT JOIN WalkRequests wreq ON wa.request_id = wreq.request_id
      LEFT JOIN WalkRatings wr ON wreq.request_id = wr.request_id
      WHERE u.role = 'walker'
      GROUP BY u.user_id
    `);
    res.json(walkers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


module.exports = app;