const express = require('express')
const path = require('path')
const http = require('http')
const socketIo = require('socket.io')

const app = express()
const server = http.createServer(app)
const io = socketIo(server)
const PORT = process.env.PORT || 3000

const dotenv = require('dotenv');
const Bio = require('./bio')
const fs = require('fs')

// load .env files
/**
 * Note: 
 * 
 * bro reused ko tong script mo sa project ko ah
 * 
 * hindi ko na ininstall if ever you want to implement na lang dotenv for security purposes lang to missyou bro
 * 
 * npm i dotenv
 * 
 */
dotenv.config();

let biometric = new Bio(process.env.ENV_NAME, 4370, 10000, 4000, io) //earthhouse
let logsFileName = 'testLogs.json'
let usersFileName = 'testUsers.json'
let fingerprintsFileName = 'testFingerprints.json'

//Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve static files (the HTML file) from the "public" directory
app.use('/', express.static(path.join(__dirname + '/public')))

// Route to get the result of the Node code
app.post('/api/changeIP', async (req, res) => {
    //company string match with ip
    const { company } = req.body

    io.emit('status-update', { status: "Setting ip..." })
    switch (company) {
        case "earthhouse": 
            biometric = new Bio(process.env.EARTHHOUSE_IP, 4370, 10000, 4000, io) 
            logsFileName = 'testLogs.json'
            usersFileName = 'testUsers.json'
            fingerprintsFileName = 'testFingerprints.json'
            break;
        case "phihope":
            biometric = new Bio(process.env.PHIHOPE_IP, 4370, 10000, 4000, io)
            logsFileName = 'phihopeLogs.json'
            usersFileName = 'phihopeUsers.json'
            fingerprintsFileName = 'phihopeFingerprints.json'
            break;
        case "wetalk":
            biometric = new Bio(process.env.WETALK_IP, 4370, 10000, 4000, io)
            logsFileName = 'wetalkLogs.json'
            usersFileName = 'wetalkUsers.json'
            fingerprintsFileName = 'wetalkFingerprints.json'
            break;
    }
    res.json({ result: 'IP set to ' + company })
})

app.get('/api/readUsers', (req, res) => {
    fs.readFile(usersFileName, 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error reading file')
        } else {
            res.json({ result: data })
        }
    })
})

app.get('/api/readTransactions', (req, res) => {
    fs.readFile(logsFileName, 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error reading file')
        } else {
            res.json({ result: data })
        }
    })
})

app.get('/api/readFingerprints', (req, res) => {
    fs.readFile(fingerprintsFileName, 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error reading file')
        } else {
            res.json({ result: data })
        }
    })
})

app.get('/api/users', async (req, res) => {
    try {
        io.emit('status-update', { status: 'Connecting...' })
        const info = await biometric.connect()
        if(info) {
            io.emit('status-update', { status: 'Connected!' })
            io.emit('status-update', { status: 'User Count: ' + info.userCounts})
            io.emit('status-update', { status: 'Fingerprint Count: ' + info.fpCounts})
            
            let users = { data: [] }
            if(info.userCounts > 0) {
                io.emit('status-update', { status: 'Getting users...'})
                users = await biometric.getUsers().catch(err => {
                    io.emit('status-update', { status: 'Unhandled error in getUsers: ' + err})
                })
            }
            let fps = { data: [] }
            if(info.fpCounts > 0) {
                io.emit('status-update', { status: 'Getting Fingerprints...'})
                fps = await biometric.getFingerprints().catch(err => {
                    io.emit('status-update', { status:'Unhandled error in getFingerprints: ' + err})
                })
            }
            await biometric.disconnect()

            biometric.toJSON(users?.data, usersFileName)
            biometric.toJSON(fps?.data, fingerprintsFileName)

            res.json({ result: 'Users and fingerprints fetched!' })
        } else {
            io.emit('status-update', { status: 'Failed to get users' })
        }
    } catch (err) {
        console.error('Error getting users:', err)
        res.status(500).json({ result: 'Error getting users\n' + err})
    }
})

app.get('/api/transactions', async (req, res) => {
    try {
        io.emit('status-update', { status: 'Connecting...' })
        const info = await biometric.connect()
        if(info) {
            io.emit('status-update', { status: 'Connected!' })
            io.emit('status-update', { status: 'Log Count: ' + info.logCounts})
            
            let logs = { data: [] }
            if(info.logCounts > 0) {
                io.emit('status-update', { status: 'Loading Transactions...'})
                logs = await biometric.getTransactions().catch(err => {
                    io.emit('status-update', { status:'Unhandled error in getTransactions: ' + err})
                })
            }
            await biometric.disconnect()

            biometric.toJSON(logs?.data, logsFileName)

            res.json({ result: 'Transactions fetched!' })
        } else {
            io.emit('status-update', { status: 'Failed to get transactions' })
        }
    } catch (err) {
        console.error('Error getting transactions:', err)
        res.status(500).json({ result: 'Error getting transactions\n' + err})
    }
})

app.post('/api/addUser', async (req, res) => {
    try {
        io.emit('status-update', { status: 'Connecting...' })
        const info = await biometric.connect()
        if(info) {
            io.emit('status-update', { status: 'Connected!' })
            io.emit('status-update', { status: 'User Count: ' + info.userCounts})

            //Employee ID, Name, Card Num
            const { uid, id, name, card, password, role } = req.body
            io.emit('status-update', { status: "Adding user..." })
            await biometric.addUser(uid, id, name, password, role, card)
            io.emit('status-update', { status: "Added " + name })
            await biometric.disconnect()
            res.json({ result: 'Disconnected!' })
        } else {
            io.emit('status-update', { status: 'Failed to add user' })
        }
    } catch (err) {
        console.error('Error adding user:', err)
        res.status(500).json({ result: 'Error adding user\n' + err})
    }
})

app.post('/api/deleteUser', async (req, res) => {
    try {
        io.emit('status-update', { status: 'Connecting...' })
        const info = await biometric.connect()
        if(info) {
            io.emit('status-update', { status: 'Connected!' })
            io.emit('status-update', { status: 'User Count: ' + info.userCounts})

            //Device ID
            const { deviceID } = req.body
            io.emit('status-update', { status: "Deleting user..." })
            await biometric.deleteUser(deviceID)
            io.emit('status-update', { status: "Deleted uid: " + deviceID})
            await biometric.disconnect()
            res.json({ result: 'Disconnected!' })
        } else {
            io.emit('status-update', { status: 'Failed to delete user' })
        }
    } catch (err) {
        console.error('Error deleting user:', err)
        res.status(500).json({ result: 'Error deleting user\n' + err})
    }
})

app.post('/api/editUser', async (req, res) => {
    try {
        io.emit('status-update', { status: 'Connecting...' })
        const info = await biometric.connect()
        if(info) {
            io.emit('status-update', { status: 'Connected!' })
            io.emit('status-update', { status: 'User Count: ' + info.userCounts})

            let users = { data: [] }
            if(info.userCounts > 0) {
                io.emit('status-update', { status: 'Getting users...' })
                users = await biometric.getUsers().catch(err => {
                    io.emit('status-update', { status: 'Unhandled error in getUsers: ' + err})
                })
            }

            //Employee ID, Name, Card Num
            const { uid, id, name, card, password, role } = req.body
            io.emit('status-update', { status: "Editing user..." })
            const success = await biometric.editUser(users.data, uid, id, name, password, role, card)
            if(success)
                io.emit('status-update', { status: "Edited " + name })
            else
                io.emit('status-update', { status: 'Failed to edit user' })
            await biometric.disconnect()
            res.json({ result: 'Disconnected!' })
        } else {
            io.emit('status-update', { status: 'Failed to edit user' })
        }
    } catch (err) {
        console.error('Error editing user:', err)
        res.status(500).json({ result: 'Error editing user\n' + err})
    }
})

app.post('/api/updateUserbase', async (req, res) => {
    try {
        const { filename } = req.body
        let newFileJson = null

        //get file
        io.emit('userbase-status', { status: "Updating using " + filename + "..."})
        // const newFile = await fs.promises.readFile(filename, 'utf-8')
        try {
            const response = await fetch(filename)
            if (!response.ok) {
                io.emit('userbase-status', { status: "Fetch failed!" })
                throw new Error(`HTTP error! status: ${response.status}`);
            } else {
                io.emit('userbase-status', { status: "Fetch success!" })
            }
            // const newFile = await response.text() // For raw text (e.g., JSON string)
            const newFile = await response.json() // if response is JSON

            // newFileJson = JSON.parse(newFile)
            newFileJson = newFile
            
        } catch (err) {
            console.error('Error fetching file:', err)
            throw err
        }

        //get all operations from file
        let toAdd = []
        let toDel = []
        for(const user of newFileJson) {
            if(user.status === "ADD") {
                toAdd.push(user)
            } else if(user.status === "DELETE") {
                toDel.push(user)
            } 
        }

        io.emit('userbase-status', { status: 'Connecting...' })
        const info = await biometric.connect()
        if(info) {
            io.emit('userbase-status', { status: 'Connected!' })

            // get device users for searching
            let users = { data: [] }
            if(info.userCounts > 0) {
                io.emit('userbase-status', { status: 'Getting users for searching...'})
                users = await biometric.getUsers().catch(err => {
                    io.emit('userbase-status', { status: 'Unhandled error in getUsers: ' + err})
                })
            }

            // Search for user with given employee ID to delete
            for(const userDel of toDel) {
                const result = users.data.find(user => user.userId === userDel.userId)
                if(result) {
                    await biometric.deleteUser(result.uid)
                    io.emit('userbase-status', { status: "Deleted uid: " + result.uid})
                } else {
                    io.emit('userbase-status', { status: "Not found: " + userDel.name})
                }
            }

            // Add everything from toAdd
            for(const userAdd of toAdd) {
                const uid = userAdd.uid
                const id = userAdd.userId
                const name = userAdd.name
                const password = userAdd.password
                const role = userAdd.role
                const card = userAdd.cardno

                const newUID = await biometric.addUser(uid, id, name, password, role, card)
                users.data.push({"uid": newUID})
                io.emit('userbase-status', { status: "Added user: " + name })
            }

            await biometric.disconnect()
            res.json({ result: 'Update Finished!' })
            io.emit('userbase-status', { status: 'You may now close this tab' })
        } else {
            io.emit('userbase-status', { status: 'Failed to update userbase' })
        }
    } catch (err) {
        console.error('Error updating userbase:', err)
        res.status(500).json({ result: 'Error updating userbase\n' + err})
    }
})

app.post('/api/replaceUserbase', async (req, res) => {
    try {
        const { filename } = req.body

        //get file
        io.emit('status-update', { status: "Uploading " + filename + "..."})
        const newFile = await fs.promises.readFile(filename, 'utf-8')
        const newFileJson = JSON.parse(newFile)
        
        io.emit('status-update', { status: 'Connecting...' })
        const info = await biometric.connect()
        if(info) {
            io.emit('status-update', { status: 'Connected!' })

            // get device users and make backup
            let users = { data: [] }
            if(info.userCounts > 0) {
                io.emit('status-update', { status: 'Getting users for backup...'})
                users = await biometric.getUsers().catch(err => {
                    io.emit('status-update', { status: 'Unhandled error in getUsers: ' + err})
                })
            }
            biometric.toJSON(users.data, "userBackup " + new Date() + ".json")
            io.emit('status-update', { status: 'Backup finished' })

            //delete everything on device (3000 is the user limit)
            for (const user of users.data) {
                if(user.uid != 1) {
                    await biometric.deleteUser(user.uid)
                    io.emit('status-update', { status: "Deleted uid: " + user.uid})
                }
            }
            
            //since we are updating from scratch except the admin user
            users = { data: [{"uid": 1}] }
            for(const user of newFileJson) {
                const uid = user.uid
                const id = user.userId
                const name = user.name
                const password = user.password
                const role = user.role
                const card = user.cardno
                const newUID = await biometric.addUser(uid, id, name, password, role, card)
                users.data.push({"uid": newUID})
                io.emit('status-update', { status: "Added user: " + name })
            }
            await biometric.disconnect()
            res.json({ result: 'Overwrite Complete!' })
        } else {
            io.emit('status-update', { status: 'Failed to replace userbase' })
        }
    } catch (err) {
        console.error('Error replacing userbase:', err)
        res.status(500).json({ result: 'Error replacing userbase\n' + err})
    }
})

app.post('/api/downloadFps', async (req, res) => { 
    //fingerprint array and username
    const { fps, username } = req.body
    io.emit('status-update', { status: 'Downloading fingerprints...' })
    biometric.toJSON(fps, username + "_fps.json")
    res.json({ result: 'Downloaded ' + username + ' fingerprints!' })
})

app.post('/api/uploadFp', async (req, res) => {
    try {
        io.emit('status-update', { status: 'Connecting...' })
        const info = await biometric.connect()
        if(info) {
            io.emit('status-update', { status: 'Connected!' })
            io.emit('status-update', { status: 'Fingerprint Count: ' + info.fpCounts})

            const { templateEntry, uid } = req.body
            io.emit('status-update', { status: "Adding fingerprint..." })

            await biometric.setFingerprint(uid, 
                templateEntry.fpIndex, 
                templateEntry.fpFlag, 
                templateEntry.fpTemplate, 
                templateEntry.entrySize - 6
            )
            io.emit('status-update', { status: "Added fingerprint!" })
            await biometric.disconnect()
            res.json({ result: 'Disconnected!' })
        } else {
            io.emit('status-update', { status: 'Failed to add fingerprint' })
        }
    } catch (err) {
        console.error('Error adding fingerprint:', err)
        res.status(500).json({ result: 'Error adding fingerprint\n' + err})
    }
})

app.post('/api/deleteFps', async (req, res) => {
    try {
        io.emit('status-update', { status: 'Connecting...' })
        const info = await biometric.connect()
        if(info) {
            io.emit('status-update', { status: 'Connected!' })
            io.emit('status-update', { status: 'Fingerprint Count: ' + info.fpCounts})

            const { uid, userId, name, cardno, password, role } = req.body
            io.emit('status-update', { status: "Deleting fingerprints..." })

            await biometric.deleteUser(uid)
            await biometric.addUser(uid, userId, name, password, role, cardno)

            io.emit('status-update', { status: "Fingerprints deleted!" })
            await biometric.disconnect()
            res.json({ result: 'Disconnected!' })
        } else {
            io.emit('status-update', { status: 'Failed to delete fingerprints' })
        }
    } catch (err) {
         console.error('Error deleting fingerprints:', err)
        res.status(500).json({ result: 'Error deleting fingerprints\n' + err})
    }
})
// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})
