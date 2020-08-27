const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const app = express();
var serviceAccount = require("./socialapp-3134b-firebase-adminsdk-k4k7f-e7b633fa81.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://socialapp-3134b.firebaseio.com",
});

const db = admin.firestore();

const firebaseConfig = {
  apiKey: "AIzaSyBbHLUASIyzuD3WJk8RNuqhjLr6nfpLS-Y",
  authDomain: "socialapp-3134b.firebaseapp.com",
  databaseURL: "https://socialapp-3134b.firebaseio.com",
  projectId: "socialapp-3134b",
  storageBucket: "socialapp-3134b.appspot.com",
  messagingSenderId: "996533803717",
  appId: "1:996533803717:web:a0cd49efac1bb70c11aeac",
  measurementId: "G-WF537TX5Q1",
};

const firebase = require("firebase");
const { error } = require("firebase-functions/lib/logger");
firebase.initializeApp(firebaseConfig);

app.get("/apes", (req, res) => {
  db.collection("apes")
    .orderBy("createdDate", "desc")
    .get()
    .then((data) => {
      let apes = [];

      data.forEach((doc) => {
        apes.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      return res.json(apes);
    })
    .catch((error) => {
      console.log(error);
    });
});

app.post("/addApes", (req, res) => {
  const newApp = {
    username: req.body.username,
    age: req.body.age,
    createdDate: new Date().toISOString(),
    info: req.body.info,
    commentCount: req.body.commentCount,
    likeCount: req.body.likeCount,
  };
  db.collection("apes")
    .add(newApp)
    .then((doc) => {
      res.json({ message: `ape is created with ID ${doc.id} successfully` });
    })
    .catch((e) => {
      res.status(500).json({ error: "something went wrong" + e.code });
    });
});

const isempty = (string) => {
  if (string.trim() === "") {
    return true;
  } else {
    return false;
  }
};

const validateEmail = (email) => {
  const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (email.match(emailRegEx)) {
    return true;
  } else {
    return false;
  }
};
app.post("/signup", (req, res) => {
  const newusr = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    username: req.body.username,
  };

  let error = {};

  if (isempty(newusr.username)) {
    error.username = "must not be empty";
  }
  if (!validateEmail(newusr.email) || isempty(newusr.email)) {
    error.email = "please enter a valid email address";
  }
  if (isempty(newusr.password)) {
    error.password = "must not be empty";
  }

  if (newusr.password !== newusr.confirmPassword) {
    error.confirmPassword = "password doesn't match please try again";
  }

  if (Object.keys(error).length > 0) {
    return res.status(400).json({ error });
  }
  let tokenID, userID;
  db.doc(`/users/${newusr.username}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return res
          .status(400)
          .json({ username: "this username is already taken" });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newusr.email, newusr.password);
      }
    })
    .then((data) => {
      userID = data.user.uid;
      return data.user.getIdToken();
    })
    .then((token) => {
      tokenID = token;
      const userCredential = {
        userID,
        email: newusr.email,
        password: newusr.password,
        createdAt: new Date().toISOString(),
      };

      return db.doc(`/users/${newusr.username}`).set(userCredential);
    })
    .then(() => {
      return res.status(201).json({ tokenID });
    })
    .catch((err) => {
      if (err.code === "auth/email-already-in-use") {
        return res.status(400).json({
          email: "email is already taken ",
        });
      } else {
        return res.status(500).json({
          error: `something went wrong while creating the User ${err.message} `,
        });
      }
    });
});

app.post("/login", (req, res) => {
  const signedUser = {
    email: req.body.email,
    password: req.body.password,
  };
  let error = {};
  if (!validateEmail(signedUser.email) || isempty(signedUser.email)) {
    error.email = "please enter a valid email address";
  } else if (isempty(signedUser.password)) {
    error.password = "password empty";
  }

  if (Object.keys(error).length > 0) {
    return res.status(403).json({ error });
  }

  firebase
    .auth()
    .signInWithEmailAndPassword(signedUser.email, signedUser.password)
    .then((data) => {
      return data.user.getIdToken();
    })
    .then((token) => {
      return res.status(201).json({ token });
    })
    .catch((err) => {
      return res.status(403).json(err.message);
    });
});

exports.api = functions.https.onRequest(app);
