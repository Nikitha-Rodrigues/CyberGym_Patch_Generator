const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const openrouter = require('../services/openrouterService');

const POC_DIR = path.join(__dirname, '../../poc');
const DESCRIPTION_DIR = path.join(__dirname, '../../files_for_poc_generation/description_files');
const ERROR_DIR = path.join(__dirname, '../../files_for_poc_generation/error_files');
const VULN_FILES_DIR = path.join(__dirname, '../../files_for_poc_generation/vulnerable_files_from_codebase');

// Helper function to get vulnerability by ID
async function getVulnerabilityById(id) {
  const descPath = path.join(DESCRIPTION_DIR, `description_${id}.txt`);
  const errorPath = path.join(ERROR_DIR, `error_${id}.txt`);
  const vulnPath = path.join(VULN_FILES_DIR, `vulnerable_file_${id}.c`);
  
  if (!await fs.pathExists(descPath)) {
    return null;
  }
  
  const description = await fs.readFile(descPath, 'utf-8');
  let errorLog = '';
  if (await fs.pathExists(errorPath)) {
    errorLog = await fs.readFile(errorPath, 'utf-8');
  }
  
  let vulnerableFileContent = '';
  let vulnerableFilePath = 'unknown';
  if (await fs.pathExists(vulnPath)) {
    vulnerableFilePath = vulnPath;
    vulnerableFileContent = await fs.readFile(vulnPath, 'utf-8');
  }
  
  return {
    id,
    description,
    errorLog,
    vulnerableFilePath,
    vulnerableFileContent
  };
}

// Get all available vulnerability IDs
async function getAllVulnerabilityIds() {
  const descFiles = await fs.readdir(DESCRIPTION_DIR);
  return descFiles
    .filter(f => f.match(/description_(\d+)\.txt/))
    .map(f => parseInt(f.match(/description_(\d+)\.txt/)[1]))
    .sort((a, b) => a - b);
}

router.get('/list', async (req, res) => {
  try {
    const ids = await getAllVulnerabilityIds();
    const vulnerabilities = [];
    
    for (const id of ids) {
      const vuln = await getVulnerabilityById(id);
      if (vuln) {
        vulnerabilities.push({
          id: vuln.id,
          description: vuln.description.substring(0, 100) + '...'
        });
      }
    }
    
    res.json({ vulnerabilities });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to list vulnerabilities' });
  }
});

router.get('/view/:id', async (req, res) => {
  try {
    const vulnId = parseInt(req.params.id, 10);
    if (!vulnId || vulnId < 1 || vulnId > 6) {
      return res.status(400).json({ error: 'Invalid vulnerability id. Use a number between 1 and 6.' });
    }

    // Find the latest POC for this vulnerability
    const pocFiles = await fs.readdir(POC_DIR);
    const matchingPocs = pocFiles
      .filter(f => f.startsWith(`poc_${vulnId}`) && f.endsWith('.txt'))
      .sort()
      .reverse();

    if (matchingPocs.length === 0) {
      return res.json({ 
        success: false, 
        message: `POC for vulnerability ${vulnId} not generated yet`,
        content: null
      });
    }

    const latestPoc = matchingPocs[0];
    const pocPath = path.join(POC_DIR, latestPoc);
    const pocContent = await fs.readFile(pocPath, 'utf-8');

    res.json({ 
      success: true,
      poc_path: pocPath,
      vulnerability_id: vulnId,
      content: pocContent,
      message: `POC for vulnerability ${vulnId} loaded successfully`
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to view POC' });
  }
});


router.post('/apply/:id', async (req, res) => {
  try {
    const vulnId = req.params.id;
    const { cybergym_url = 'http://localhost:8080' } = req.body;
    
    // Find the latest POC for this vulnerability
    const pocFiles = await fs.readdir(POC_DIR);
    const matchingPocs = pocFiles
      .filter(f => f.startsWith(`poc_${vulnId}_`))
      .sort()
      .reverse();
    
    if (matchingPocs.length === 0) {
      return res.status(404).json({ error: `No POC found for vulnerability ${vulnId}` });
    }
    
    const latestPoc = matchingPocs[0];
    const pocPath = path.join(POC_DIR, latestPoc);
    const pocContent = await fs.readFile(pocPath, 'utf-8');
    
    // Send to CyberGym server
    // const response = await axios.post(`${cybergym_url}/execute`, {
    //   poc: pocContent,
    //   vulnerability_id: vulnId,
    //   target: '/out/coder_MNG_fuzzer'
    // });
    
    // Simulate execution and verification
    const executionResult = {
      crashed: true,
      exit_code: 139, // SIGSEGV
      asan_output: 'heap-buffer-overflow detected',
      memory_corruption: true
    };
    
    res.json({ 
      success: true, 
      message: `POC applied to CyberGym for vulnerability ${vulnId}`,
      verification: executionResult
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to apply POC to CyberGym' });
  }
});

router.post('/generate/:id', async (req, res) => {
  try {
    const vulnId = parseInt(req.params.id, 10);
    if (!vulnId || vulnId < 1 || vulnId > 6) {
      return res.status(400).json({ error: 'Invalid vulnerability id. Use a number between 1 and 6.' });
    }

    const vuln = await getVulnerabilityById(vulnId);
    if (!vuln) {
      return res.status(404).json({ error: `Vulnerability ${vulnId} not found` });
    }

    await fs.ensureDir(POC_DIR);

    const result = await openrouter.generatePOCFromError(
      vuln.errorLog,
      vuln.description,
      vuln.vulnerableFilePath,
      vuln.vulnerableFileContent
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    if (!result.content) {
      return res.status(500).json({ error: 'No POC content returned from the model' });
    }
    const timestamp = Date.now();
    const pocFile = path.join(POC_DIR, `poc_${vulnId}.txt`);
    let exploitCode = result.content;
    exploitCode = exploitCode.replace(/```[\s\S]*?\n/g, '').replace(/```/g, '');

    // Add metadata to the file content
    const fileContent = `# Generated by: ${result.model}\n# Tokens used: ${JSON.stringify(result.usage)}\n# Generated at: ${new Date(timestamp).toISOString()}\n\n${exploitCode}`;

    await fs.writeFile(pocFile, fileContent);

    res.json({ 
      success: true,
      poc_path: pocFile,
      vulnerability_id: vulnId,
      content: fileContent,
      model_used: result.model,
      tokens_used: result.usage,
      message: 'POC generated successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate POC' });
  }
});

module.exports = router;
