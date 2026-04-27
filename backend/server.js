const express = require('express')
const cors = require('cors')
const path = require('path')

const vulnerabilitiesRoutes = require('./routes/vulnerabilities')
const pocRoutes = require('./routes/poc')
const patchRoutes = require('./routes/patch')

const app = express()
const PORT = 5000

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api/vulnerabilities', vulnerabilitiesRoutes)
app.use('/api/poc', pocRoutes)
app.use('/api/patch', patchRoutes)

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`)
})
