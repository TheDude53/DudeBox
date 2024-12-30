"use strict";

console.log("Syncing from GitHub");
require("child_process").execSync("git clone https://github.com/TheDude53/DudeBox.git");

// Move cloned files back into working directory
require("child_process").execSync("cp -rf ./DudeBox/* .");
// Delete old clone folder
require("child_process").execSync("rm -rf ./DudeBox");

// Start the server
require("./server.js");