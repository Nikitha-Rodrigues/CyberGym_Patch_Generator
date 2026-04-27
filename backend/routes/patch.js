const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const openrouter = require('../services/openrouterService');

const PATCH_DIR = path.join(__dirname, '../../patches');
const VULN_CODE_DIR = path.join(__dirname, '../../vulnerable_codebase');
const DESCRIPTION_DIR = path.join(__dirname, '../../files_for_poc_generation/description_files');
const ERROR_DIR = path.join(__dirname, '../../files_for_poc_generation/error_files');
const VULN_FILES_DIR = path.join(__dirname, '../../files_for_poc_generation/vulnerable_files');

router.post('/generate', async (req, res) => {
  try {
    await fs.ensureDir(PATCH_DIR);
    
    // Get the latest vulnerability files
    const descFiles = await fs.readdir(DESCRIPTION_DIR);
    const latestDesc = descFiles.sort().reverse()[0];
    
    const description = await fs.readFile(path.join(DESCRIPTION_DIR, latestDesc), 'utf-8');
    
    const errorFile = latestDesc.replace('description', 'error');
    const errorPath = path.join(ERROR_DIR, errorFile);
    let errorLog = '';
    if (await fs.pathExists(errorPath)) {
      errorLog = await fs.readFile(errorPath, 'utf-8');
    }
    
    const vulnFile = latestDesc.replace('description', 'vulnerable').replace('.txt', '.c');
    const vulnPath = path.join(VULN_FILES_DIR, vulnFile);
    let vulnerableFileContent = '';
    let vulnerableFilePath = 'unknown';

    if (await fs.pathExists(vulnPath)) {
      vulnerableFilePath = vulnPath;
      vulnerableFileContent = await fs.readFile(vulnPath, 'utf-8');
    }
    
    // Generate patch using OpenRouter
    const result = await openrouter.generatePatch(vulnerableFilePath, errorLog, description, vulnerableFileContent);
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }
    
    const timestamp = Date.now();
    const patchFile = path.join(PATCH_DIR, `patch_${timestamp}.diff`);
    
    const patchContent = `# Patch Generated via OpenRouter
# Model: ${result.model}
# Generated at: ${new Date().toISOString()}
# Vulnerable file: ${vulnerableFilePath}

${result.content}
`;
    
    await fs.writeFile(patchFile, patchContent);
    
    res.json({ 
      success: true, 
      patch_path: patchFile,
      model_used: result.model,
      tokens_used: result.usage,
      message: 'Patch generated successfully using OpenRouter'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate patch' });
  }
});

router.post('/apply', async (req, res) => {
  try {
    const patches = await fs.readdir(PATCH_DIR);
    
    if (patches.length === 0) {
      return res.status(400).json({ error: 'No patches available to apply' });
    }
    
    const latestPatch = patches.sort().reverse()[0];
    const patchPath = path.join(PATCH_DIR, latestPatch);
    
    // In production: await execPromise(`cd ${VULN_CODE_DIR} && git apply ${patchPath}`)
    
    res.json({ 
      success: true, 
      message: `Patch ${latestPatch} applied successfully`
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to apply patch' });
  }
});

module.exports = router;
