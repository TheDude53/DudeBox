var users = {}
var colors = {}
var leaderboard = []
var he = require('he')
var fs = require('fs')
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { createHash } = require('crypto');
Array.prototype.random = function(){
	return this[Math.floor(Math.random()*this.length)];
}


const app = express();
const server = http.createServer(app);
const io = socketIo(server);

function findRooms() {
    var availableRooms = [];
    var rooms = io.sockets.adapter.rooms;

    if (rooms) {
        for (var room in rooms) {
            if (rooms[room].sockets) {
                availableRooms.push({
                    name: room,
                    members: rooms[room].length
                });
            }
        }
    }

    return availableRooms;
}



app.use(express.static('client'));


function printNick(n) {return `<span style="color:${he.decode(n.color)}">${he.decode(n.nick)}</span>`}

function check_for_ban(socket) {
	banned_users = JSON.parse(fs.readFileSync('configs/banned_users.json').toString())
	home = createHash('sha256').update(socket.handshake.address).digest('hex')
	if(banned_users.includes(home)) {
		d = new Date()
		socket.emit('message', {nick: '~', color: '#fff', msg: '<em>you have been banned from teh trollbox</em>', home: 'nodejs', date: d.getTime()})
		socket.disconnect()
		if(users[socket.id]) {
			io.emit('message', {color: '#f00', nick: '←', msg: printNick(users[socket.id]) + ' <em>has been banned from teh trollbox</em>', home: 'nodejs', date: d.getTime()})
			leaderboard.splice(leaderboard.indexOf(socket.id), 1) // leaderboard fix
			io.emit('update users', leaderboard.map(u=>users[u]))
			delete users[socket.id]
		}
	}
}


function goto_room(socket, r) {
	PREV_ROOM = Object.keys(socket.rooms)[0]
	socket.join(r)
	socket.leave(PREV_ROOM)
	msg = {nick: '~', color: '#fff', msg: printNick(users[socket.id])+' has entered room: <b>' + he.encode(r) + '</b>', home: 'nodejs', date: d.getTime()}
	io.to(PREV_ROOM).to(r).emit('message', msg)
	console.log(`~ ${users[socket.id].nick} has entered room: ${r}`)
}


io.on('connection', (socket) => {
	check_for_ban(socket)
	socket.join('atrium'); // default room
	socket.leave(socket.id)
    socket.on('message', (data) => {
		check_for_ban(socket)
        if(users[socket.id]) {
			d = new Date()
			wb = JSON.parse(fs.readFileSync('configs/banned_words.json').toString())
			for(i=0;i<wb.length;i++) {
				if(data.toLowerCase().includes(wb[i])) {
					return
				}
			}
			if(data.startsWith('/r ')) {
				goto_room(socket, data.slice(3))
				return
			}
			
			if(data.startsWith('/room ')) {
				goto_room(socket, data.slice(6))
				return
			}
			
			if(data==='/a') {
				goto_room(socket, 'atrium')
				return
			}
			
			if(data==='/r'||data==='/room') {
				rs = findRooms()
				msg = `Your current room is: <b>${Object.keys(socket.rooms)[0]}</b>\n––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––\nOnline rooms:\n`
				for(i=0;i<rs.length;i++) {
					msg += `${rs[i].name} (${rs[i].members})\n`
				}
				socket.emit('message', {nick: '~', color: '#fff', msg: msg, home: 'nodejs', date: d.getTime()})
				return
			}

			if(data==='/o'||data==='/who') {
				msg = 'Users:\n=======================' + leaderboard.map(e => {
					return `\nUsername: ${users[e].nick}\nColor: ${users[e].color}\nHome: ${users[e].home}`
				}).join('\n=======================') + '\n======================='
				socket.emit('message', {nick: '~', color: '#fff', msg: msg, home: 'nodejs', date: d.getTime()})
				return;
			}

			io.to(Object.keys(socket.rooms)[0]).emit('message', {...users[socket.id], msg: he.encode(data), date: d.getTime()});
			delete d
		}
    });
	
	socket.on('user joined', (pseudo, color, style, pass) => {
		if(!color) {
			if(!colors[pseudo]) {
				color = ['orangered', 'green', '#0088ff', '#fb8700', 'purple', 'magenta'].random()
				colors[pseudo] = color
			} else {
				color = colors[pseudo]
			}
		}
		if(!users[socket.id]) {
			home = createHash('sha256').update(socket.handshake.address).digest('hex');
			users[socket.id] = {nick: he.encode(pseudo), color, home}
			console.log(`-> ${users[socket.id].nick} has entered teh trollbox`)
			io.to('atrium').emit('user joined', users[socket.id])
			if(!leaderboard.includes(socket.id)) {
				leaderboard.push(socket.id)
			}
			d = new Date()
			socket.emit('message', {nick: '~', color: '#fff', msg: '<b>welcome to teh trollbox clone</b>\nchangelog: <a href="/change.log" target="_blank">/change.log</a>', home: 'nodejs', date: d.getTime()})
		} else {
			if(users[socket.id].color!==color) {users[socket.id].color=color} // be silent about it...
			if(users[socket.id].nick!==pseudo) {
				ou = users[socket.id]
				console.log(ou)
				users[socket.id].nick = he.encode(pseudo)
				console.log(users[socket.id])
				io.emit('user change nick', [ou, users[socket.id]])
				delete ou
			}
		}
		io.emit('update users', leaderboard.map(u=>users[u]))
	})

    socket.on('disconnect', () => {
		if(users[socket.id]) {
			io.emit('user left', users[socket.id])
			console.log(`<- ${he.decode(users[socket.id].nick)} has left teh trollbox`)
			leaderboard.splice(leaderboard.indexOf(socket.id), 1) // leaderboard fix
			io.emit('update users', leaderboard.map(u=>users[u]))
			delete users[socket.id]
		}
    });
});

// Start the server
const PORT = process.env.PORT || 80;
server.listen(PORT, '0.0.0.0');
console.clear()
console.log('Server started')
