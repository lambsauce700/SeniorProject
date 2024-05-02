function scaleValue(input, fromScale, toScale) {
  // Convert the input to a range from 0 to 1 (percentage of the old range)
  const percentage = (input - fromScale[0]) / (fromScale[1] - fromScale[0]);

  // Convert the percentage to the new range
  const output = percentage * (toScale[1] - toScale[0]) + toScale[0];

  // Return the value rounded to avoid floating-point numbers
  return Math.round(output);
}

const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const bodyParser = require('body-parser'); // Ensure to include bodyParser for parsing JSON request bodies
const app = express();
const port = 3000;

const admin = require('firebase-admin');

// Path to your service account key file
const serviceAccount = require('C:\\Users\\abdul\\Desktop\\Senior Project\\SeniorProject\\senior-project-esp8266-firebase-adminsdk-2wz1p-292e6d99f8.json');

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

// Route for the home page
app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, 'home.html'));
});
app.get('/SignUp', (req, res) => {
  res.sendFile(path.join(__dirname, 'SignUp.html'));
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

  // Define the API key; you can find this in your Firebase project settings
  const apiKey = 'AIzaSyA-D1jiMKHqNJ2K4s_AY5fTikYbuPuZNfw';

  // Prepare the request to Firebase Auth REST API
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: email,
      password: password,
      returnSecureToken: true
    })
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error.message);
    }

    // User is authenticated, retrieve user details if needed
    admin.auth().getUserByEmail(email)
      .then(userRecord => {
        res.status(200).send({ status: 'success', user: userRecord });
      })
      .catch(error => {
        throw error;
      });
  } catch (error) {
    res.status(401).send({ status: 'error', message: 'Authentication failed: ' + error.message });
  }
});


// User signup
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  admin.auth().createUser({
    email: email,
    password: password,
  })
  .then(userRecord => {
    // Store additional user details in Firebase Realtime Database
    const newUser = {
      email: email,
      password: password  // Store additional data as needed
    };
    db.ref('users/' + userRecord.uid).set(newUser)
      .then(() => {
        res.status(201).send({ status: 'success', user: userRecord });
      })
      .catch(error => {
        res.status(500).send({ status: 'error', message: 'Failed to create user record in database' });
      });
  })
  .catch(error => {
    res.status(500).send({ status: 'error', message: error.message });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
