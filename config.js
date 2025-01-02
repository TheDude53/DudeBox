"use strict";

/*
 * DudeBox configuration options
 * 
 * You should really change/check these for your own DudeBox instance!
 */

module.exports = {
  
  // Options for an admin UI accessible at /admin (can be memory intensive)
  adminDash: true, // Also uses environment variable DB_ADMINUI
  adminUser: "username", // DB_ADMINUI_USER
  adminPass: "password", // DB_ADMINUI_PASS
  
  // Array of default user colors
  defaultColors: ["#ff386a", "#ea53ad", "#bb70db", "#6e72d8", "#3d9bff", "#2ec0ff", "#00e4f5", "#34daa3", "#71dc18", "#c9dc18", "#ffc60a", "#ffcf66", "#ff8e3d", "#ff816b"],
  
  // Logging options
  logChatEvents: false,
  logMessages: false,
  logToFile: "./chat.log", // set as false to disable; requires other logging options enabled
  
  // Message history: stores all messages in memory and sends full history to new clients
  messageHistory: false,
  
  // Web server port
  serverPort: 8081, // PORT environment variable can override this
  
  // System message user
  systemNick: "~",
  systemColor: "#f7f7f8",
  
  // Welcome message
  welcomeMsg: "<b>Welcome to DudeBox: a custom trollbox server and client by TheDude53!</b>\nFor more information, please visit https://github.com/TheDude53/DudeBox." // false to disable
};