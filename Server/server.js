const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const moment = require("moment");
const bcrypt = require("bcrypt");
const mysql = require("mysql");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

var users = {};
const usersArr = [];
var usersObj = {};
var AdminWhitelist = [];
var usersInChatroom = [];

const AdminUsername =
  "$2b$10$CZZV.J6.NiFJ04A83VFkCuxc8Ohc8ZXgvoMq9tXxF9rNt58sSbgSi"; //Admin
const AdminPassword =
  "$2b$10$7NivWKUNsXSCWNM2B16NXe16cMcXs/UrEI5K5KrGFtl8iQaEz0sI6"; //12345678

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "123456",
  database: "chatapp",
});

//chatapp: messages (id, username, text, time), users (id, username, password)

db.connect((err) => {
  if (err) throw err;
  console.log("Database connected");
});

//User Nutzung
io.on("connection", (socket) => {
  console.log("a user connected");
  socket.on("new-user", (name) => {
    let sql = `SELECT * FROM messages`;
    let query = db.query(sql, (err, result) => {
      result.forEach((res) => {
        socket.emit("alleMessages", res);
      });
    });
    usersInChatroom.push(socket.id);
    users[socket.id] = name;
    usersObj = { name: name, id: socket.id };
    usersArr.push(usersObj);
    socket.broadcast.emit("user-connected", name);
    io.emit("online", usersArr);
  });
  socket.on("chat message", (msg) => {
    let message = {
      username: users[socket.id],
      text: msg,
      time: moment().format("h:mm a"),
    };
    let sql = "INSERT INTO messages SET ?";
    let query = db.query(sql, message, (err, result) => {
      if (err) throw err;
      socket.broadcast.emit("chat message", {
        msg: msg,
        name: users[socket.id],
        time: moment().format("h:mm a"),
      });
      socket.emit("chat message", {
        msg: msg,
        name: "Du",
        time: moment().format("h:mm a"),
      });
    });
  });
  socket.on("disconnect", () => {
    console.log("user disconnected " + socket.id);
    if (usersInChatroom.indexOf(socket.id) >= 0) {
      socket.broadcast.emit("user-disconnected", users[socket.id]);
      usersInChatroom.splice(usersInChatroom.indexOf(socket.id), 1)[0];
    }
    delete users[socket.id];
    const index = usersArr.findIndex((user) => user.id === socket.id);
    if (index !== -1) {
      usersArr.splice(index, 1)[0];
    }
    io.emit("online", usersArr);
  });

  //Admin Login
  socket.on("login-try", async (data) => {
    if (
      (await bcrypt.compare(data.username, AdminUsername)) &&
      (await bcrypt.compare(data.password, AdminPassword))
    ) {
      socket.emit("access");
      AdminWhitelist.push(data.ip);
      app.get("/admin", (req, res) => {
        res.sendFile(__dirname + "/public" + "/server.html");
      });
      console.log(AdminWhitelist);
    } else {
      socket.emit("denied");
    }
  });
  socket.on("admin-connected", (ip) => {
    if (AdminWhitelist.includes(ip)) {
      socket.emit("admin-welcome-message", "Willkommen Admin");
    } else {
      socket.emit(
        "admin-verweigert",
        "Zutritt verweigert, bitte erst anmelden"
      );
      socket.disconnect();
    }
  });

  //Admin Konsole
  socket.on("Befehl", (befehl) => {
    alleBefehle = [
      "alle Befehle: ",
      "!help",
      "!allUsers",
      "$kick <id>",
      "$message <message>",
    ];
    if (befehl.slice(0, 5) == "$kick") {
      let kickID = befehl.slice(6);
      console.log(kickID);
      io.to(kickID).emit("chat message", {
        msg: "Du wurdest gekickt",
        name: "Admin",
        time: moment().format("h:mm a"),
      });
      io.sockets.sockets.forEach((socket) => {
        if (socket.id === kickID) socket.disconnect(true);
      });
    }
    if (befehl.slice(0, 8) === "$message") {
      let msg = befehl.slice(9);
      socket.broadcast.emit("admin-message", msg);
    }
    if (befehl == "!help") {
      socket.emit("help", alleBefehle);
    } else if (befehl == "!allUsers") {
      socket.emit("allUsers", usersArr);
    }
  });

  // USER LOGIN
  // Registrierung
  socket.on("registerUser", (userdata) => {
    let sql = `SELECT * FROM users WHERE username = ${mysql.escape(
      userdata.username
    )}`;
    let query = db.query(sql, (err, result) => {
      if (err) throw err;
      if (Object.keys(result).length > 0) {
        socket.emit("userExists");
      } else {
        const pw = bcrypt.hash(userdata.password, 10);
        pw.then(function (result) {
          let hashedpw = result;
          let user = { username: userdata.username, password: hashedpw };
          let sql = "INSERT INTO users SET ?";
          let query = db.query(sql, user, (err, result) => {
            if (err) throw err;
            socket.emit("userCreated");
          });
        });
      }
    });
  });

  //Login
  socket.on("loginTry", (userdata) => {
    let sql = `SELECT * FROM users WHERE username = ${mysql.escape(
      userdata.username
    )}`;
    let query = db.query(sql, (err, result) => {
      if (err) throw err;
      if (Object.keys(result).length == 0) {
        socket.emit("user-doesnt-exist");
      } else {
        let sql = `SELECT password FROM users WHERE username = "${userdata.username}"`;
        let query = db.query(sql, (err, result) => {
          if (err) throw err;
          setValue(result, userdata.password);
        });
      }
    });
  });
  function setValue(pw, userPw) {
    let savedPw = pw[0].password;
    pwCheck(savedPw, userPw);
  }

  async function pwCheck(savedPw, enteredPw) {
    if (await bcrypt.compare(enteredPw, savedPw)) {
      socket.emit("access");
    } else {
      socket.emit("denied");
    }
  }

  //Passwort aendern
  socket.on("change-password", (data) => {
    const pw = bcrypt.hash(data.password, 10);
    pw.then(function (result) {
      let hashedpw = result;
      let sql =
        'UPDATE users SET password = "' +
        hashedpw +
        '" WHERE username = "' +
        data.username +
        '"';
      let query = db.query(sql, (err, result) => {
        if (err) throw err;
        socket.emit("changed");
      });
    });
  });
});

server.listen(3000, "192.168.178.104", () => {
  console.log("listening on *:3000");
});
