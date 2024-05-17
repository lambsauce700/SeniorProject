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
const cron = require('node-cron');

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
app.get('/TimerPage', (req, res) => {
    res.sendFile(path.join(__dirname, 'TimerPage.html'));
});
// Route for the home page
app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, 'home.html'));
});
app.get('/SignUp', (req, res) => {
  res.sendFile(path.join(__dirname, 'SignUp(frontend).html'));
});
app.get('/getSliderInitialValue', (req, res) => {
  const ref = db.ref("sliderValue"); // Adjust the path as per your Firebase database structure
  ref.once("value", function(snapshot) {
    const sliderValue = snapshot.val(); // Assuming the value you need is directly here
    res.json({ value: sliderValue });
  }, function (errorObject) {
    console.log("The read failed: " + errorObject.code);
    res.status(500).json({error: errorObject.code});
  });
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

app.post('/setSchedule', (req, res) => {
  const { days, startTime, endTime , enableTimer  } = req.body; // Expect days to be an array of days

  if (!Array.isArray(days) || days.length === 0) {
    return res.status(400).send({ message: 'Invalid days provided' });
  }

  const schedulesRef = db.ref('pumpControl');
  let updates = {};

  // Loop through each day and create an update object
  days.forEach(day => {
    updates[`schedules/${day}`] = { startTime, endTime };
  });

  updates['timerEnabled'] = enableTimer;


  // Perform a multi-location update
  schedulesRef.update(updates)
    .then(() => res.status(200).send({ message: 'Schedules set successfully' }))
    .catch(error => res.status(500).send({ message: 'Failed to set schedules', error }));
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
  if (req.session.user) {
    console.log("Logging out user:", req.session.user); // Print the user object if exists
} else {
    console.log("No user found in session to log out."); // Debug message if no user is in session
}
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
function checkSchedules(schedules) {
  const now = new Date();
  const currentDay = now.toLocaleString('en-us', { weekday: 'long' }); // "Monday", "Tuesday", etc.
  const currentTime = parseInt(now.toTimeString().substr(0, 2), 10);

  let shouldBeOn = false;

  if (schedules[currentDay]) {
    const { startTime, endTime } = schedules[currentDay];
    const startTime24 = convertTo24Hour(startTime);
    const endTime24 = convertTo24Hour(endTime);
    console.log(startTime24);
    console.log(endTime24);
    console.log(currentTime);


    if ((currentTime >= startTime24) && (currentTime < endTime24)) {
      shouldBeOn = true;
    }
  }

  const lightStatusRef = db.ref('lightStatus');
  lightStatusRef.set(shouldBeOn ? 'ON' : 'OFF')
    .then(() => console.log(`Timer set to ${shouldBeOn ? 'ON' : 'OFF'}`))
    .catch(error => console.error("Error updating light status:", error));
}

app.post('/updateLightStatus', (req, res) => {
  const { status } = req.body;  // Destructure the status from the request body

  // References for lightStatus and pumpControl/timerEnabled
  const lightStatusRef = db.ref('lightStatus');
  const timerEnabledRef = db.ref('pumpControl/timerEnabled');

  // Update lightStatus independently
  lightStatusRef.set(status)
    .then(() => {
      // If lightStatus update is successful, then disable the timer
      return timerEnabledRef.set(false);
    })
    .then(() => {
      // Send a response if both updates are successful
      res.send({ message: 'Light status updated and timer disabled successfully!' });
    })
    .catch(error => {
      // Handle any errors that occur during the update
      res.status(500).send({ error: error.message });
    });
});

// Endpoint to get current lightStatus
app.get('/getLightStatus', (req, res) => {
  db.ref('lightStatus').once('value')
    .then(snapshot => res.send({ status: snapshot.val() }))
    .catch(error => res.status(500).send({ error: error.message }));
});

// Schedule to run every 10 seconds
cron.schedule('*/10 * * * * *', () => {
  const controlRef = db.ref('pumpControl/');
  controlRef.once('value', snapshot => {
    const pumpControl = snapshot.val();
    console.log()
    if (pumpControl.timerEnabled) {
      checkSchedules(pumpControl.schedules);
    } else {
      console.log("Timer is disabled. No action taken.");
    }
  }).catch(error => {
    console.error("Error fetching control settings:", error);
  });
});

// function checkSchedules() {
//   const ref = db.ref('lightStatus');
//   const schedulesRef = db.ref('pumpControl/schedules');
//   schedulesRef.once('value', snapshot => {
//     const schedules = snapshot.val();
//     const now = new Date();
//     const currentDay = now.getDay();  // Sunday - 0, Monday - 1, ..., Saturday - 6
//     const currentTime = `${now.getHours()}:${now.getMinutes()}`;

//     let shouldBeOn = false;

//     Object.keys(schedules).forEach(key => {
//       const schedule = schedules[key];
//       if (schedule.days.includes(currentDay)) {
//         const startTime = schedule.startTime;
//         const endTime = schedule.endTime;
//         if (currentTime >= startTime && currentTime < endTime) {
//           shouldBeOn = true;
//         }
//       }
//     });

//     ref.set(shouldBeOn ? 'ON' : 'OFF');
//   });
// }

// cron.schedule('* * * * *', checkSchedules);
function convertTo24Hour(timeStr) {
  const [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':');

  // Convert the hour string to an integer to handle it numerically
  hours = parseInt(hours, 10);

  if (hours === 12) {
      hours = 0; // Midnight case should be zero not 12 in 24-hour time
  }
  if (modifier === 'PM' && hours != 12) { // Handle PM times but exclude 12 PM which is already correct
      hours += 12;
  }

  return hours; // Return the hour as an integer
}

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
