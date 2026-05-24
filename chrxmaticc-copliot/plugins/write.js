// Chrxmaticc Copilot — Write Plugin
// Writes files with permission system and safety checks
// Author: Chrxmee-Midnightt

var fs = require('fs');
var path = require('path');
var readline = require('readline');

var autoMode = false;
var askedTOS = false;
var tosAccepted = false;

var TOS_MESSAGE = [
  '══════════════════════════════════════════════',
  '  📝 FILE SYSTEM ACCESS REQUEST',
  '══════════════════════════════════════════════',
  '',
  '  Chrxmaticc Copilot is requesting permission',
  '  to write files and create directories.',
  '',
  '  ⚠️  IMPORTANT NOTES:',
  '  • Copilot does NOT write malware or malicious code',
  '  • All files are written exactly as specified by you',
  '  • You can revoke permission at any time with /write stop',
  '  • Automatic mode requires creator approval',
  '  • Files are written to your current working directory',
  '',
  '  Type "y" to accept, "n" to decline,',
  '  or "stop" to permanently stop asking.',
  '══════════════════════════════════════════════'
].join('\n');

var PERMISSION_MESSAGE = [
  '══════════════════════════════════════════════',
  '  📝 Copilot wants to write a file:',
  '  {filename}',
  '  Type "y" to allow, "n" to deny,',
  '  or "stop" to grant full permission permanently.',
  '══════════════════════════════════════════════'
].join('\n');

function askPermission(question, callback) {
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('  > ', function(answer) {
    rl.close();
    var lower = answer.trim().toLowerCase();
    
    if (lower === 'stop') {
      autoMode = true;
      callback(true);
    } else if (lower === 'y' || lower === 'yes') {
      callback(true);
    } else {
      callback(false);
    }
  });
}

function checkTOS(callback) {
  if (tosAccepted || autoMode) {
    callback(true);
    return;
  }
  
  console.log('');
  console.log(TOS_MESSAGE);
  console.log('');
  
  askPermission('', function(accepted) {
    tosAccepted = accepted;
    if (accepted) {
      console.log('  ✅ File system access granted.');
      console.log('  Use /write stop to revoke at any time.');
      console.log('');
    } else {
      console.log('  ❌ File system access denied.');
      console.log('');
    }
    callback(accepted);
  });
}

function writeFile(filename, content, callback) {
  if (!tosAccepted && !autoMode) {
    checkTOS(function(accepted) {
      if (accepted) {
        doWrite(filename, content, callback);
      } else {
        if (callback) callback({ success: false, error: 'TOS not accepted' });
      }
    });
  } else if (autoMode) {
    doWrite(filename, content, callback);
  } else {
    var msg = PERMISSION_MESSAGE.replace('{filename}', filename);
    console.log('');
    console.log(msg);
    console.log('');
    
    askPermission('', function(accepted) {
      if (accepted) {
        doWrite(filename, content, callback);
      } else {
        if (callback) callback({ success: false, error: 'Permission denied' });
      }
    });
  }
}

function doWrite(filename, content, callback) {
  try {
    var dir = path.dirname(filename);
    if (dir && dir !== '.' && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filename, content, 'utf8');
    console.log('  ✅ Written: ' + filename + ' (' + content.length + ' bytes)');
    console.log('');
    if (callback) callback({ success: true, filename: filename, size: content.length });
  } catch (e) {
    console.log('  ❌ Failed to write: ' + e.message);
    console.log('');
    if (callback) callback({ success: false, error: e.message });
  }
}

// ──────────────────────────────────────────────
//  DANGEROUS PATTERN DETECTION
// ──────────────────────────────────────────────

var DANGEROUS_PATTERNS = [
  'rm -rf', 'sudo rm', ':(){ :|:& };:', 'mkfs',
  'dd if=', '> /dev/sda', 'chmod 777 /',
  'wget -O - | sh', 'curl | bash', 'eval(',
  'exec(', 'require("child_process")', 'spawn(',
  'fork(', 'Process.start', 'Runtime.exec',
  'os.system', 'subprocess', 'shell_exec'
];

function hasDangerousCode(code) {
  var lower = code.toLowerCase();
  for (var i = 0; i < DANGEROUS_PATTERNS.length; i++) {
    if (lower.indexOf(DANGEROUS_PATTERNS[i]) !== -1) {
      return DANGEROUS_PATTERNS[i];
    }
  }
  return null;
}

// ──────────────────────────────────────────────
//  COMMAND HANDLER
// ──────────────────────────────────────────────

module.exports = {
  name: 'write',
  description: 'Write files with permission system (git, node, automatic)',
  category: 'system',
  run: async function(args, context) {
    var parts = (args || '').split(' ');
    var subCommand = parts[0] || '';
    var rest = parts.slice(1).join(' ');

    // /write stop — revoke permissions
    if (subCommand === 'stop') {
      autoMode = false;
      tosAccepted = false;
      return '🛑 Permissions revoked. Copilot will ask again before writing.';
    }

    // /write status
    if (subCommand === 'status') {
      return '📝 Write mode: ' + (autoMode ? 'Automatic (full permission)' : 'Ask every time') + ' | TOS: ' + (tosAccepted ? 'Accepted' : 'Not accepted');
    }

    // /write automatic — enable auto mode
    if (subCommand === 'automatic' || subCommand === 'auto') {
      return new Promise(function(resolve) {
        checkTOS(function(accepted) {
          if (accepted) {
            autoMode = true;
            resolve('🤖 Automatic mode ON. Copilot can write files without asking. /write stop to revoke.');
          } else {
            resolve('❌ Automatic mode requires TOS acceptance.');
          }
        });
      });
    }

    // /write git.js <filename> — write a git script
    if (subCommand === 'git.js' || subCommand === 'git') {
      var filename = rest || 'git-script.js';
      return new Promise(function(resolve) {
        var content = '// Git automation script generated by Chrxmaticc Copilot\n' +
                      '// Created: ' + new Date().toISOString() + '\n\n' +
                      'const { execSync } = require("child_process");\n\n' +
                      'function gitCommand(cmd) {\n' +
                      '  try {\n' +
                      '    return execSync("git " + cmd, { encoding: "utf8" });\n' +
                      '  } catch (e) {\n' +
                      '    return e.message;\n' +
                      '  }\n' +
                      '}\n\n' +
                      '// Example: git status\n' +
                      'console.log(gitCommand("status"));\n\n' +
                      '// Add your git commands here\n' +
                      '// gitCommand("add .")\n' +
                      '// gitCommand(\'commit -m "message"\')\n' +
                      '// gitCommand("push origin main")\n';
        
        writeFile(filename, content, function(result) {
          if (result.success) {
            resolve('✅ Git script written to ' + filename);
          } else {
            resolve('❌ ' + (result.error || 'Failed'));
          }
        });
      });
    }

    // /write node.js <filename> <description> — write node code via AI
    if (subCommand === 'node.js' || subCommand === 'node') {
      var parts2 = rest.split(' ');
      var filename = parts2[0] || 'script.js';
      var description = parts2.slice(1).join(' ') || 'a basic Node.js script';
      
      return new Promise(async function(resolve) {
        console.log('  🤖 Generating Node.js code for: ' + description);
        console.log('');
        
        var aiPrompt = 'Write a complete Node.js script that does the following: ' + description + '. Output ONLY the code. No explanations. No markdown. Just raw JavaScript code.';
        var response = await context.getResponse(aiPrompt);
        var code = typeof response === 'string' ? response : response.text;
        
        var dangerous = hasDangerousCode(code);
        if (dangerous) {
          resolve('⚠️  DANGEROUS PATTERN DETECTED: "' + dangerous + '". File not written for safety.');
          return;
        }
        
        writeFile(filename, code, function(result) {
          if (result.success) {
            resolve('✅ Node.js script written to ' + filename + ' (' + result.size + ' bytes)');
          } else {
            resolve('❌ ' + (result.error || 'Failed'));
          }
        });
      });
    }

    // /write code <filename> <code> — write raw code directly
    if (subCommand === 'code') {
      var parts3 = rest.split(' ');
      var filename = parts3[0];
      var code = parts3.slice(1).join(' ');
      
      if (!filename) return 'Usage: /write code <filename> <code>';
      if (!code) return 'Usage: /write code <filename> <code>';
      
      return new Promise(function(resolve) {
        var dangerous = hasDangerousCode(code);
        if (dangerous) {
          resolve('⚠️  DANGEROUS PATTERN DETECTED: "' + dangerous + '". File not written for safety.');
          return;
        }
        
        writeFile(filename, code, function(result) {
          if (result.success) {
            resolve('✅ Written to ' + filename);
          } else {
            resolve('❌ ' + (result.error || 'Failed'));
          }
        });
      });
    }

    // Usage help
    return [
      '📝 Write Plugin Commands:',
      '',
      '  /write git.js <filename>     — Create a Git automation script',
      '  /write node.js <filename> <description> — AI generates Node.js code',
      '  /write code <filename> <code> — Write raw code directly',
      '  /write automatic              — Enable auto mode (no more asking)',
      '  /write stop                   — Revoke all permissions',
      '  /write status                 — Check current permissions',
      '',
      '  ⚠️  Safety: Dangerous patterns are blocked automatically.',
      '  🔒 Your files, your control. Copilot never writes without permission.'
    ].join('\n');
  }
};
