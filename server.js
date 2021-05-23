require('dotenv').config;
const express = require('express');
const app = express();
const cors = require('cors');
const firebase = require('firebase/app');
const path = require('path')
require('firebase/auth');
require('firebase/firestore');

var firebaseConfig = {
    apiKey: "AIzaSyBHRCXcMvKERAbRpLK2PQSeEyV-Yao3Shg",
    authDomain: "countivity.firebaseapp.com",
    projectId: "countivity",
    storageBucket: "countivity.appspot.com",
    messagingSenderId: "218799087026",
    appId: "1:218799087026:web:4648c462aad69d4be898ab"
  };

const FireApp = firebase.initializeApp(firebaseConfig);

const db = firebase.firestore()
const userRef = db.collection("users");
const activityRef = db.collection("activities");

// Static production settings
if(process.env.NODE_ENV === 'production'){
    app.use(express.static('client/build'));

    app.get('*', (req,res)=>{
        res.sendFile(path.resolve(__dirname), 'client', 'build', 'index.html')
    })
}

const port = process.env.PORT || 5000;
app.use(cors());

app.get('/', (req, res) =>{
    res.json("Countivity Server")
})

app.get('/signin/:credentials', (req,res)=>{
    const credentials = req.params.credentials.split(',');
    const email = credentials[0];
    const pass = credentials[1];
    firebase.auth().signInWithEmailAndPassword(email, pass)
    .then(()=>{
        res.json({
            loginState: true
        })
    })
    .catch((err)=>{
        console.log(err)
        res.json({
            loginState: false
        })
    })

})

app.get('/signup/:credentials', (req,res)=>{
    const credentials = req.params.credentials.split(',');
    const email = credentials[0];
    const pass = credentials[1];
    firebase.auth().createUserWithEmailAndPassword(email, pass)
    .then(()=>{
        userRef.add({
            email: email
        })
        res.send("Created User")
    })
})

app.get('/auth/username/:username', (req,res)=>{
    const username = req.params.username;
    const docArray = [];
    userRef.where("username", "==", username).get()
    .then((snapshot)=>{
        snapshot.forEach((doc)=>{
            docArray.push(doc.data)
        })
        if(docArray.length == 0){
            res.json({
                message: "No Users Yet :)",
                userCreated: false
            })
            const userDetails = firebase.auth().currentUser;
            if(userDetails != null){
                const currentEmail = userDetails.email
                userRef.where("email", "==", currentEmail).get()
                .then((snapshot)=>{
                    snapshot.forEach((doc)=>{
                        const userID = doc.id;
                        userRef.doc(userID).set({
                            username: username,
                            activities: 0,
                            hours: 0
                        }, {merge: true})
                    })
                })
            }
        } else if (docArray.length > 0){
            res.json({
                message: "User Already Created",
                userCreated: true
            })
        }
    })
    .catch((err)=>{
        console.log(err)
    })
})

app.get('/auth/check', (req,res)=>{
    const userState = firebase.auth().currentUser;
    if(userState == null){
        var loginState = false;
    } else if (userState != null){
        loginState = true
    }
    res.json({
        loginState: loginState
    })
})

app.get('/signout', (req, res)=>{
    firebase.auth().signOut()
    .then(()=>{
        res.json({
            signedOut: true
        })
    })
})

app.get('/user/data', (req,res)=>{
    const currentUser = firebase.auth().currentUser;
    var docData;
    if (currentUser) {
        const userEmail = currentUser.email
        userRef.where("email", "==", userEmail).get()
        .then((snapshot)=>{
            snapshot.forEach((doc)=>{
                docData = doc.data()
            })
            res.json({
                userData: docData
            })
        })
    }
})

app.get('/activities', (req, res)=>{
    var dataArray= []
    activityRef.get()
    .then((snapshot)=>{
        snapshot.forEach((doc)=>{
            dataArray.push(doc.data())
        })
        res.json({
            activities: dataArray
        })
    })
})

app.get('/add/:activityname', (req,res)=>{
    var hours = 0;
    const activityname = req.params.activityname;
    activityRef.where("name", "==", activityname).get()
    .then((snapshot)=>{
        snapshot.forEach((doc)=>{
            hours = doc.data().hours
        })
    const currentUser = firebase.auth().currentUser;
    if(currentUser){
        userRef.where("email", "==", currentUser.email).get()
        .then((snapshot)=>{
            snapshot.forEach((doc)=>{
                const userID = doc.id;
                const previousActivities = doc.data().activities;
                const previousHours = doc.data().hours;
                const Totalhours = hours + previousHours;
                const TotalActivities = previousActivities + 1;
                userRef.doc(userID).set({
                    hours: Totalhours,
                    activities: TotalActivities
                }, {merge: true})
            })
            res.json({
                hoursUpdated: true
            })
        })
        .catch((err)=>{
            res.json({
                error: err,
                hoursUpdated: false
            })
        })
    }
    })
})

app.get('/:score/:email', (req,res)=>{
    const score = parseInt(req.params.score);
    const email = req.params.email;
    userRef.where("email", "==", email).get()
    .then((snapshot)=>{
        snapshot.forEach((doc)=>{
            const docID=doc.id
            userRef.doc(docID).set({
                score: score
            }, {merge: true})
        })
        res.json({
            score: score
        })
    })
    .catch((err)=>{
        console.log(err)
    })
})

app.get('/ranks', (req,res)=>{
    var ranks = []
    userRef.get()
    .then((snapshot)=>{
        snapshot.forEach((doc)=>{
            ranks.push(doc.data())
        })
    })
})



app.listen(port, ()=>{
    console.log(`Server running on: ${port}`)
})