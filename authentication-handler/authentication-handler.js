var express = require('express');
var app = express();


app.post('/authenticate', (req, res) => {
  authenticateUser(req.body.userData, res); 
})

function authenticateUser(userData, res) {
  let User = Parse.Object.extend('User');
  var query = new Parse.Query(User);
  query.equalTo('email', userData.email);
  query.first((currentUser) => {
    if(currentUser !== undefined) {
      res.json({
        "currentUser": currentUser
      })
    } else {
      createNewUser(userData)
      .then((newUser) => {
        res.json({
          "error": "user not accepted"
        })
      }).catch(function (error) {
        res.sendStatus(409);
      });
    }
  });
}

function createNewUser(userData) {
  var newUser = new User();
  newUser.set("name", userData.name);
  newUser.set("username", userData.email);
  newUser.set("email", userData.email);
  newUser.set("password", userData.id + accessToken);
  return newUser.save();
}

module.exports = app;