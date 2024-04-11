const express = require('express');
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

// Route to update slider value in Firebase
app.post('/updateSliderValue', (req, res) => {
  const { value } = req.body;
  db.ref('sliderValue').set(value)
    .then(() => res.json({ status: 'Data updated successfully' }))
    .catch(error => {
      console.error('Firebase error:', error);
      res.status(500).send(error);
    });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
