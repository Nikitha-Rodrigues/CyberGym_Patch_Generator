const axios = require('axios');
require('dotenv').config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL;
const SITE_URL = process.env.SITE_URL;
const SITE_NAME = process.env.SITE_NAME;

class OpenRouterService {
  constructor() {
    this.client = axios.create({
      baseURL: OPENROUTER_BASE_URL,
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': SITE_URL,
        'X-Title': SITE_NAME
      }
    });
  }

  async chatCompletion(messages, model = null, options = {}) {
    try {
      const response = await this.client.post('/chat/completions', {
        model: model || process.env.DEFAULT_MODEL,
        messages: messages,
        max_tokens: options.max_tokens || 2000,
        temperature: options.temperature || 0.7
      });

      return {
        success: true,
        content: response.data.choices[0].message.content,
        usage: response.data.usage,
        model: response.data.model
      };
    } catch (error) {
      console.error('OpenRouter API Error:', error.response?.data || error.message);
      
      if (error.response?.status === 402) {
        return {
          success: false,
          error: 'Free tier limit reached. Please try again tomorrow or use a different model.'
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Failed to get response from LLM'
      };
    }
  }

  async generatePOCFromError(errorLog, description, vulnerableFilePath, vulnerableFileContent) {
    const systemPrompt = `You are a vulnerability exploitation expert. Your task is to provide a precise, reproducible exploit recipe that generates malformed input and triggers the exact crash described.

FORMAT YOUR RESPONSE EXACTLY AS:

=== STEP 1: CREATE MALICIOUS INPUT ===
[Exact commands to generate the crashing file - using a full C program, python script, or hexdump]

=== STEP 2: TRIGGER THE VULNERABILITY ===
[Exact command to run the vulnerable binary with the malicious input]

Your response must:
- produce malformed input, not valid input
- include a complete C source file if using C to generate the crash file. 
- not include extra narrative outside the two sections
- assume no files exist and create them explicitly`;

    const userPrompt = `Use the crash report and vulnerability description to generate exact malformed input that reproduces the bug.

ERROR LOG:
${errorLog}

DESCRIPTION:
${description}

REQUIREMENTS:
1. Generate the malicious input using a complete C program whenever possible.
2. If a binary or text file is needed, the program must write the exact bad bytes.
3. If a file format is required, produce malformed or oversized data that triggers the vulnerability.
4. Provide the exact gcc compile command if using C and the exact command to run the vulnerable program.
5. The output must be copy-paste runnable and must not generate a normal valid file.

Do not produce valid input; produce malicious input that matches the failure mode described.`;

    return await this.chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);
  }

  async generatePatch(vulnerableFile, errorLog, description, vulnerableFileContent) {
    const systemPrompt = `You are a security engineer writing patches for vulnerabilities.
Return ONLY the diff/patch content in unified diff format. No explanations outside the patch.`;

    const userPrompt = `Generate a patch for this vulnerability:

VULNERABLE FILE PATH: ${vulnerableFile}
ERROR LOG: ${errorLog}
DESCRIPTION: ${description}
VULNERABLE FILE CONTENT: ${vulnerableFileContent || 'File content not available'}

Output in unified diff format (git patch style) showing what lines to change.`;

    return await this.chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);
  }

  async validateKey() {
    try {
      const response = await this.client.get('/auth/key');
      return { valid: true, data: response.data };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}

module.exports = new OpenRouterService();
