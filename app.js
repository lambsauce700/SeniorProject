function scaleValue(input, fromScale, toScale) {
  // Convert the input to a range from 0 to 1 (percentage of the old range)
  const percentage = (input - fromScale[0]) / (fromScale[1] - fromScale[0]);

  // Convert the percentage to the new range
  const output = percentage * (toScale[1] - toScale[0]) + toScale[0];
  // Return the value rounded to avoid floating-point numbers
  return Math.round(output);
}
const crypto = require('crypto');
const session = require('express-session');
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const bodyParser = require('body-parser'); // Ensure to include bodyParser for parsing JSON request bodies
const app = express();
const port = 3000;

const admin = require('firebase-admin');
// Path to your service account key file
const serviceAccount = require('./config/senior-project-esp8266-firebase-adminsdk-2wz1p-292e6d99f8.json');

app.use(session({
  secret: 'ca2cab7b13ec9d04f2de7f317c8b094063b089d5de2e44b0d6223c2da559d3f31e4ddc6a6085c9054a99775b97e3a94f23f2a02d9383af23ce7434c01ad68ba3', // Change this to a long, random string in production
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true } // Set secure to true if using HTTPS
}));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://senior-project-esp8266-default-rtdb.europe-west1.firebasedatabase.app"
});

const db = admin.database();

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Use bodyParser middleware to parse JSON bodies
app.use(bodyParser.json());

// Redirect from the root path to the index page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/index', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/outputpage', (req, res) => {
  res.sendFile(path.join(__dirname, 'outputpage.html'));
});

// Route for the home page
app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, 'home.html'));
});
app.get('/SignUp', (req, res) => {
  res.sendFile(path.join(__dirname, 'SignUp(frontend).html'));
});

// Route to update slider value in Firebase
app.post('/updateSliderValue', (req, res) => {
  const { value } = req.body;
  const scaledValue = scaleValue(parseInt(value, 10), [0, 60], [0, 1024]);

  db.ref('sliderValue').set(scaledValue)
    .then(() => res.json({ status: 'Data updated successfully' }))
    .catch(error => {
      console.error('Firebase error:', error);
      res.status(500).send(error);
    });
});


app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const apiKey = 'AIzaSyA-D1jiMKHqNJ2K4s_AY5fTikYbuPuZNfw';
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;

  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) throw new Error(data.error.message);

    // Store user data in session
    req.session.user = { email: data.email, uid: data.localId }; // Adjust based on the actual data you need
    res.status(200).send({ status: 'success', user: data });

  } catch (error) {
    res.status(401).send({ status: 'error', message: 'Authentication failed: ' + error.message });
  }
});
// user logout

app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send({ status: 'error', message: 'Could not log out, please try again' });
    }
    res.send({ status: 'success', message: 'Logged out successfully' });
  });
});

// User signup
app.post('/signup', (req, res) => {
  const { email, password, phoneNumber } = req.body;

  if (!email || !password || !phoneNumber) {
      return res.status(400).json({ status: 'error', message: 'All fields are required.' });
  }

  // Assuming you're using Firebase Admin SDK to create a user
  admin.auth().createUser({
      email: email,
      emailVerified: false,
      phoneNumber: phoneNumber,
      password: password,
      disabled: false
  })
  .then(userRecord => {
      // See the UserRecord reference doc for the contents of userRecord.
      console.log('Successfully created new user:', userRecord.uid);
      res.send({ status: 'success', user: userRecord });
  })
  .catch(error => {
      console.log('Error creating new user:', error);
      res.status(500).json({ status: 'error', message: error.message });
  });
});


app.post('/updateLightStatus', (req, res) => {
  const status = req.body.status;
  db.ref('lightStatus').set(status)
    .then(() => res.send({ message: 'Updated successfully!' }))
    .catch(error => res.status(500).send({ error: error.message }));
});

// Endpoint to get current lightStatus
app.get('/getLightStatus', (req, res) => {
  db.ref('lightStatus').once('value')
    .then(snapshot => res.send({ status: snapshot.val() }))
    .catch(error => res.status(500).send({ error: error.message }));
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
