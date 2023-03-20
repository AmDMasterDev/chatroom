const express = require('express');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('attendance.db');
// const expbs = require('express-handlebars');
const {engine} = require('express-handlebars');

const app = express();
const port = 3000;

app.engine('.hbs', engine({ extname: '.hbs',defaultLayout:false,layoutsDir:'views'}));
app.set("view engine", "hbs");
// app.use(express.static('public'));
// app.set('views', __dirname + '\\views');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(require('express-session')({
  secret: 'secret',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  db.get("SELECT * FROM students WHERE id = ?", id, function(err, row) {
    done(err, row);
  });
});

passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  },
  function(email, password, done) {
    db.get("SELECT * FROM students WHERE email = ?", email, function(err, row) {
      if (!row) {
        return done(null, false, { message: 'Incorrect email.' });
      }

      bcrypt.compare(password, row.password, function(err, res) {
        if (!res) {
          return done(null, false, { message: 'Incorrect password.' });
        }

        return done(null, row);
      });
    });
  }
));

app.post('/login', passport.authenticate('local', { failureRedirect: '/login' }), function(req, res) {
  res.redirect('/dashboard');
});

app.get('/login', function(req, res) {
    if(req.isAuthenticated()) {
        res.redirect('/dashboard');
    } else {
        res.send(`
        <form action="/login" method="post">
        <div>
            <label>Email:</label>
            <input type="email" name="email">
        </div>
        <div>
            <label>Password:</label>
            <input type="password" name="password">
        </div>
        <div>
            <input type="submit" value="Log In">
        </div>
        </form>
        <a href="/register">REGISTER</a>
        `);
    }
});

app.get('/dashboard', ensureAuthenticated, function(req, res) {
    const studentId = req.user.id;
    // Count the number of attendance records for the current student
    const stmt = db.prepare("SELECT COUNT(*) AS total, COUNT(CASE WHEN is_present = 'true' THEN 1 END) AS attended FROM attendance WHERE student_id = ?");
    stmt.get(studentId, function(err, row) {
      if (err) {
        console.error(err);
        res.status(500).send('Internal server error');
      } else {
        // Render the dashboard template with the student's name and attendance count
        res.render('dashboard', {
          name: req.user.name,
          attendanceCount: row.attended,
          totalAttendance: row.total
        });
      }
    });
    stmt.finalize();
});

app.get('/', function(req, res) {
    res.redirect('/login');
});

app.get('/logout', function(req, res, next) {
    req.logout(function(err) {
      if (err) { 
        return next(err); 
        }
      res.redirect('/login');
    });
});

app.get('/register', function(req, res) {
    res.sendFile(__dirname + '/register.html');
});

// Route to register a new student
app.post('/register', function(req, res) {
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;
  
    // Hash the password
    bcrypt.hash(password, 10, function(err, hash) {
      if (err) {
        console.error(err);
        res.status(500).send('Internal server error');
      } else {
        // Insert the new student into the database
        const stmt = db.prepare("INSERT INTO students (name, email, password) VALUES (?, ?, ?)");
        stmt.run(name, email, hash, function(err) {
          if (err) {
            console.error(err);
            res.status(500).send('Internal server error');
          } else {
            res.redirect('/login');
          }
        });
        stmt.finalize();
      }
    });
});

app.get('/attendance', function(req, res) {
    res.send(`
    <form method="POST" action="/attendance">
        <label>
            <input type="radio" name="isPresent" value="true" checked>
            Present
        </label>
        <label>
            <input type="radio" name="isPresent" value="false">
            Absent
        </label>
        <button type="submit">Submit</button>
    </form>
    `);
});

app.post('/attendance', ensureAuthenticated, function(req, res) {
    const studentId = req.user.id;
    const date = new Date().toISOString().slice(0, 10);
    const isPresent = req.body.isPresent;
  
    const stmt = db.prepare("INSERT INTO attendance (student_id, date, is_present) VALUES (?, ?, ?)");
    stmt.run(studentId, date, isPresent, function(err) {
      if (err) {
        console.error(err);
        res.status(500).send('Internal server error');
      } else {
        res.redirect('/dashboard');
      }
    });
    stmt.finalize();
});
  
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    } else {
      res.redirect('/login');
    }
}

db.serialize(function() {
  db.run("CREATE TABLE IF NOT EXISTS students (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT UNIQUE, password TEXT)");

//   const stmt = db.prepare("INSERT INTO students (name, email, password) VALUES (?, ?, ?)");
//   stmt.run("John Doe", "johndoe@example.com", bcrypt.hashSync("password", 10));
//   stmt.run("Jane Doe", "janedoe@example.com", bcrypt.hashSync("password", 10));
//   stmt.finalize();
});

app.listen(port, () => console.log(`Server started on port ${port}`));
