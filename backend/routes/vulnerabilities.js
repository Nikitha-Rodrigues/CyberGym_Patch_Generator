const express = require('express')
const router = express.Router()
const fs = require('fs-extra')
const path = require('path')

const DESCRIPTION_DIR = path.join(__dirname, '../../files_for_poc_generation/description_files')
const ERROR_DIR = path.join(__dirname, '../../files_for_poc_generation/error_files')

router.get('/', async (req, res) => {
  try {
    const vulnerabilities = []
    
    // Get all description files
    const descFiles = await fs.readdir(DESCRIPTION_DIR)
    
    for (const descFile of descFiles) {
      const descPath = path.join(DESCRIPTION_DIR, descFile)
      const descContent = await fs.readFile(descPath, 'utf-8')
      
      // Find matching error file (same index)
      const errorFile = descFile.replace('description', 'error')
      const errorPath = path.join(ERROR_DIR, errorFile)
      
      let errorContent = ''
      if (await fs.pathExists(errorPath)) {
        errorContent = await fs.readFile(errorPath, 'utf-8')
      }
      
      vulnerabilities.push({
        id: descFile.replace('description_', '').replace('.txt', ''),
        description: descContent,
        error_log: errorContent
      })
    }
    
    res.json(vulnerabilities)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load vulnerabilities' })
  }
})

module.exports = router
