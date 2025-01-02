# DudeBox
A custom trollbox server (and customized client) by TheDude53.
Based on the original [Windows 93 trollbox](https://www.windows93.net/trollbox/), and (more loosely) [dell-optiplex-790's tb-clone](https://github.com/dell-optiplex-790/tb-clone).

## Features
- Modern Socket.IO server/client (version 4)
- Tons of code comments (great for learning the ropes)
- Revamped client interface (much more mobile-friendly)
- Client settings dialog with custom server support
- Less injection vulnerabilities
- Configurable server options
- Socket.IO admin UI support
- 100% compatible with the original trollbox API
- Log to console and file capabilities (disabled by default)
- Message history (with syncing) support

## How to run
If you don't want to run it yourself, you can check out the demo server at https://dudebox.glitch.me.

To start the server, simply run `npm i && npm run server` in the root project directory with Node.js version 16 or later. You can change the server's port via the `PORT` environment variable, otherwise it will default to 8081. If you plan on running a public instance of DudeBox, please check the configuration options in `config.js`.

> [!NOTE]
> Because this is designed to run on [Glitch](https://glitch.com), the main `npm start` command will run a script to sync with this repository before starting the server. It's only going to work properly if you're on Linux and have Git installed.

## License
Unless otherwise specified, this repository is licensed under the Do What the Fuck You Want to Public License.

```
Copyright © 2025 Chris Helder (TheDude53)
This work is free. You can redistribute it and/or modify it under the
terms of the Do What The Fuck You Want To Public License, Version 2,
as published by Sam Hocevar. See the LICENSE file for more details.
```

[![WTFPL 2.0](http://www.wtfpl.net/wp-content/uploads/2012/12/wtfpl-badge-1.png)](http://www.wtfpl.net/)