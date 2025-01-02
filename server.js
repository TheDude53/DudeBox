// DudeBox server by Chris Helder (TheDude53/Dude)
"use strict";

console.log("Loading DudeBox server...");

// Load configuration (see config.js)
const {
  adminDash,
  adminUser,
  adminPass,
  defaultColors,
  logChatEvents,
  logMessages,
  logToFile,
  messageHistory,
  serverPort,
  systemNick,
  systemColor,
  welcomeMsg
} = require("./config.js");

// Prepare the great HTML entity utility
const he = require("he");

// Function for removing newlines
function stripNewlines(text) {
  return text.replace(/[\r\n\u2028\u2029]/g, "");
};

// Optional logging functions
function logCE(stuff) {
  if (!logChatEvents) {
    return;
  };
  
  // Parse HTML entities and force String conversion
  stuff = he.decode(stuff + "");
  console.log(stuff);
  
  if (logToFile) {
    // Print to file
    require("fs").appendFile(logToFile, stuff + "\n", ()=>{});
  };
};
function logM(stuff) {
  if (!logMessages) {
    return;
  };
  
  // Parse HTML entities and force String conversion
  stuff = he.decode(stuff + "");
  console.log(stuff);
  
  if (logToFile) {
    // Print to file
    require("fs").appendFile(logToFile, stuff + "\n", ()=>{});
  };
};



// Load servers
const server = require("http-server").createServer({
  root: "./client/",
  headers: {
    "Accept-Ranges": "bytes",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "*",
    "Server": "Node.js " + process.version
  },
  showDir: false,
  autoIndex: false,
  showDotfiles: false,
  gzip: true,
  brotli: true
});

const io = new (require("socket.io").Server)(server.server, {
  connectionStateRecovery: {
    maxDisconnectionDuration: 60000,
    skipMiddlewares: true
  },
  allowEIO3: true,
  cors: {
    origin: "*",
    allowedHeaders: ["*"],
    credentials: true
  },
  maxHttpBufferSize: 1024 * 256, // Limit message size to 256 KB (they shouldn't need to be bigger anyway)
  upgradeTimeout: 15000
});
// Socket.io admin UI
if (process.env.DB_ADMINUI || adminDash) {
  require("@socket.io/admin-ui").instrument(io, {
    auth: {
      type: "basic",
      username: process.env.DB_ADMINUI_USER || adminUser,
      password: require("bcryptjs").hashSync(process.env.DB_ADMINUI_PASS || adminPass)
    },
    serverId: "DudeBox (PID: " + process.pid + ")"
  });
};



// Master user list (we can use a Set because it maintains insertion order)
const users = new Set();

// Optional message history Array
const history = [];

function updateUsers() {
  // Update full user list for everyone
  const userList = {};
  
  // Add users into user list
  for (const userSocket of users) {
    userList[userSocket.id] = userSocket.user;
  };
  
  // Send out user list
  io.emit("update users", userList);
};



// Main connection handler
io.on("connection", (socket)=>{
  // Handle disconnects
  socket.on("disconnect", ()=>{
    socket.removeAllListeners();
    
    // If the user never entered (hence no user property), don't bother with stuff
    if (!socket.user) {
      socket = null;
      return;
    };
    
    // Remove from users list
    users.delete(socket);
    
    // Announce user departure
    io.to(socket.user.room).emit("user left", socket.user);
    logCE(socket.user.nick + " has left");
    
    updateUsers();
    
    // Wipe socket for garbage collection
    socket = null;
  });
  
  
  // Username/color change handler
  socket.on("user joined", (nick, color, style, pass)=>{
    // Get real IP address (even behind forwarders)
    const ip = socket.handshake.headers["cf-connecting-ip"] || socket.handshake.headers["fastly-client-ip"] || socket.handshake.headers["x-forwarded-for"]?.split(",")[0] || socket.handshake.headers["forwarded"]?.match(/for=([^;]+)/)[1] || socket.handshake.address;
    
    // Keep previous user object
    const prevUser = socket.user;
    
    // Create full user object (with defaults just in case, and making sure to avoid arbitrary execution garbage)
    socket.user = {
      nick: he.encode(stripNewlines(nick + "")) || "anonymous",
      color: he.encode(stripNewlines(color + "")) || defaultColors[Math.floor(Math.random() * defaultColors.length)],
      style: he.encode(style + "") || "",
      // This is probably a good enough hashing algorithm, although you can always brute-force this kind of thing
      home: socket.user?.home || require("crypto").createHash("sha512-256").update(ip).digest("hex"),
      room: socket.user?.room || "atrium",
      isBot: false // Come on, nobody's a bot here
    };
    
    // Push new user sockets into users list
    if (!users.has(socket)) {
      users.add(socket);
    };
    
    // Determine if user is joining or changing nickname
    if (prevUser) {
      // Just changing nickname
      io.to(socket.user.room).emit("user change nick", [prevUser, socket.user]);
      logCE(prevUser.nick + " is now known as " + socket.user.nick);
    } else {
      // Let's see about getting this new user up to speed
      if (messageHistory) {
        socket.emit("update history", history);
      };
      
      // Only start sending messages after joining (prevents hidden chat loggers)
      socket.join("atrium");
      
      // A new user has appeared; announce user join
      io.to(socket.user.room).emit("user joined", socket.user);
      logCE(socket.user.nick + " has joined");
    };
    
    updateUsers();
  });
  
  
  // Message handling
  socket.on("message", (message)=>{
    // Ignore messages if the user hasn't actually joined
    if (!socket.user) {
      return;
    };
    
    // Ensure message is actually a string
    message = message + "";
    
    // Also check that the message isn't blank
    if (!message.trim().length) {
      return;
    };
    
    logM(socket.user.nick + ": " + message);
    
    // /a is just an alias for /room atrium
    if (message === "/a") {
      message = "/room atrium";
    };
    
    // Respond to server-side command messages
    if (message === "/r" || message === "/room") {
      let response = "Your current room is: <b>" + he.encode(socket.user.room) + "</b>\n" + "–".repeat(85) + "\nOnline rooms:\n";
      
      // Get a Set of socket IDs
      const sids = io.of("/").adapter.sids;
      
      // Compile a list of open rooms
      io.of("/").adapter.rooms.forEach((roomSet, roomName)=>{
        // If the room is just a private sid, ignore it
        if (sids.has(roomName)) {
          return;
        };
        
        response += roomName + " (" + roomSet.size + ")\n";
      });
      
      // Send the list off
      socket.emit("message", {
        nick: systemNick,
        color: systemColor,
        style: "opacity: 0.7;",
        home: "trollbox",
        date: Date.now(),
        msg: response.slice(0, response.length - 1)
      });
    } else if (message.startsWith("/r ") || message.startsWith("/room ")) {
      // Room switching time! Replace alias and blank space just to make things easier, then slice out command
      const room = stripNewlines(message.replace(/^\/r /, "/room ")).trim().slice(6);
      
      // Check that a room is specified AND isn't the current one
      if (!room || socket.user.room === room) {
        return;
      };
      
      // Prevent joining a private sid room
      if (io.of("/").adapter.sids.has(room)) {
        return;
      };
      
      // Leave old room
      const oldRoom = socket.user.room;
      socket.leave(socket.user.room);
      
      // Set new room and join it
      socket.user.room = room;
      socket.join(socket.user.room);
      
      // Alert both rooms of the new development
      io.to([oldRoom, socket.user.room]).emit("message", {
        nick: systemNick,
        color: systemColor,
        style: "opacity: 0.7;",
        home: "trollbox",
        date: Date.now(),
        msg: "<span class='trollbox_nick' style='color:" + socket.user.color + ";'>" + socket.user.nick + "</span> has entered room: <b>" + socket.user.room + "</b>"
      });
    } else if (message === "/o" || message === "/who") {
      // List all active users + homes
      const line = "–".repeat(85);
      let response = line + "\n";
      
      // Sort users into object by home
      const homeSorted = {};
      for (const userSocket of users) {
        // Create Array for new homes
        homeSorted[userSocket.user.home] ||= [];
        
        homeSorted[userSocket.user.home].push(userSocket.user.nick);
      };
      
      // Format data for response
      for (const home in homeSorted) {
        response += "Home    | " + home + "\nName(s) | ";
        
        // List names
        response += homeSorted[home].join("\n        | ");
        
        // The bottom line
        response += "\n" + line + "\n";
      };
      
      socket.emit("message", {
        nick: systemNick,
        color: systemColor,
        style: "opacity: 0.7;",
        home: "trollbox",
        date: Date.now(),
        msg: response
      });
    } else {
      // Otherwise just broadcast the message (user object merged with date and message object)
      message = Object.assign({date: Date.now(), msg: he.encode(message)}, socket.user);
      
      io.to(socket.user.room).emit("message", message);
      
      // Store it in message history (if applicable)
      if (messageHistory) {
        history.push(message);
      };
    };
  });
  
  
  // Some clients still like to rely on the `_connected` event, so we'll humor them here
  socket.emit("_connected");
  
  
  if (welcomeMsg) {
    // This isn't an official feature, but I like to send a welcome message to the user
    socket.emit("message", {
      nick: systemNick,
      color: systemColor,
      style: "",
      home: "trollbox",
      date: Date.now(),
      msg: welcomeMsg
    });
  };
});



// Start it up
const port = process.env.PORT || serverPort || 8081;
server.listen(port);

console.log("Now listening on port " + port);