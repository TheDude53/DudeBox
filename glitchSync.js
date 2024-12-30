"use strict";

console.log("Syncing from GitHub");
require("child_process").spawnSync("git", ["clone", "https://github.com/TheDude53/DudeBox.git"], {stdio: "inherit"});

// Move cloned files back into working directory
require("child_process").execSync("mv", ["-f", "./DudeBox/*", "."]);
// Delete old clone folder
require("child_process").execSync("rm", ["-rf", "./DudeBox"]);

// Start the server
require("./server.js");