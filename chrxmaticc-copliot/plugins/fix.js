// Chrxmaticc Copilot — Auto-Fix Plugin v1.1.0
// Scans code, fixes errors, 3 fix modes, permission system
// Author: Chrxmee-Midnightt

var fs = require('fs');
var path = require('path');
var execSync = require('child_process').execSync;
var readline = require('readline');

var FIX_MODES = {
  speedy: {
    name: 'Speedy',
    description: 'Fast but surface-level. Might miss things.',
    timeout: 5000,
    prompt: 'Quickly fix this code. Give ONLY the fixed code. No explanation. Be fast.',
    thoroughness: 'low'
  },
  genius: {
    name: 'Genius',
    description: 'Smart and balanced. Medium speed.',
    timeout: 15000,
    prompt: 'Analyze this code carefully. Fix all errors, missing requires, syntax issues, and undefined variables. Return ONLY the complete fixed code. No explanation.',
    thoroughness: 'medium'
  },
  efficient: {
    name: 'Efficient',
    description: 'Slow but thorough. Checks everything.',
    timeout: 30000,
    prompt: 'Deep analysis. Check every line. Fix ALL issues including: missing requires, undefined variables, syntax errors, incorrect paths, API endpoint changes, deprecated methods, and potential runtime errors. Return ONLY the complete fixed code. Be extremely thorough.',
    thoroughness: 'high'
  }
};

var currentMode = 'genius';
var fixHistory = [];
var skipMode = false;

function askPermission(question, callback) {
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('  > ', function(answer) {
    rl.close();
    var lower = answer.trim().toLowerCase();
    
    if (lower === 'skip') {
      skipMode = true;
      callback('skip');
    } else if (lower === 'y' || lower === 'yes') {
      callback('yes');
    } else {
      callback('no');
    }
  });
}

function getFileList(dir) {
  var files = [];
  try {
    var entries = fs.readdirSync(dir, { withFileTypes: true });
    for (var i = 0; i < entries.length; i++) {
      var fullPath = path.join(dir, entries[i].name);
      if (entries[i].isDirectory() && entries[i].name !== 'node_modules' && entries[i].name.indexOf('.') !== 0) {
        files = files.concat(getFileList(fullPath));
      } else if (entries[i].isFile() && (entries[i].name.endsWith('.js') || entries[i].name.endsWith('.json') || entries[i].name.endsWith('.glsl'))) {
        files.push(fullPath);
      }
    }
  } catch (e) {}
  return files;
}

function diagnoseFile(filepath) {
  try {
    execSync('node -e "try { require(\'' + filepath.replace(/\\/g, '\\\\') + '\') } catch(e) { console.log(e.message) }"', { timeout: 5000, stdio: 'pipe' });
    return null;
  } catch (e) {
    var output = e.stdout ? e.stdout.toString() : '';
    var stderr = e.stderr ? e.stderr.toString() : '';
    return output + stderr;
  }
}

function diagnoseAll() {
  var files = getFileList(process.cwd());
  var problems = [];
  
  for (var i = 0; i < files.length; i++) {
    var error = diagnoseFile(files[i]);
    if (error) {
      problems.push({ file: files[i], error: error });
    }
  }
  
  return problems;
}

async function fixFile(filepath, mode, context) {
  var code = fs.readFileSync(filepath, 'utf8');
  var modeConfig = FIX_MODES[mode];
  
  var prompt = modeConfig.prompt + '\n\nFILE: ' + filepath + '\n\nCODE:\n```\n' + code + '\n```\n\nReturn ONLY the complete fixed code.';
  
  return new Promise(async function(resolve) {
    var timedOut = false;
    var timer = setTimeout(function() {
      timedOut = true;
      resolve({ success: false, error: 'timeout', fixedCode: null });
    }, modeConfig.timeout + 5000);
    
    try {
      var response = await context.getResponse(prompt);
      clearTimeout(timer);
      
      if (timedOut) return;
      
      var text = typeof response === 'string' ? response : response.text;
      var fixedCode = extractCode(text);
      
      if (fixedCode && fixedCode.length > code.length * 0.5) {
        resolve({ success: true, fixedCode: fixedCode, originalCode: code });
      } else {
        resolve({ success: false, error: 'incomplete response', fixedCode: null });
      }
    } catch (e) {
      clearTimeout(timer);
      resolve({ success: false, error: e.message, fixedCode: null });
    }
  });
}

function extractCode(text) {
  var match = text.match(/```(?:javascript|js)?\n?([\s\S]*?)```/);
  if (match && match[1]) return match[1].trim();
  
  if (text.indexOf('const ') !== -1 || text.indexOf('var ') !== -1 || text.indexOf('function ') !== -1 || text.indexOf('module.exports') !== -1) {
    return text.trim();
  }
  
  return null;
}

function createBackup(filepath) {
  var backupPath = filepath + '.chrxmaticc-backup';
  fs.copyFileSync(filepath, backupPath);
  return backupPath;
}

function executeUndo(filepath) {
  var backupPath = filepath + '.chrxmaticc-backup';
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, filepath);
    fs.unlinkSync(backupPath);
    return true;
  }
  return false;
}

module.exports = {
  name: 'fix',
  description: 'Auto-fix code errors with 3 fix modes and permission system',
  category: 'dev',
  run: async function(args, context) {
    var parts = (args || '').split(' ');
    var subCommand = parts[0] || '';
    var rest = parts.slice(1).join(' ');

    // /fix mode — switch fix mode
    if (subCommand === 'mode') {
      var mode = rest.toLowerCase();
      if (FIX_MODES[mode]) {
        currentMode = mode;
        return '🔧 Fix mode: ' + FIX_MODES[mode].name + ' — ' + FIX_MODES[mode].description;
      }
      return 'Available modes: speedy, genius, efficient. Current: ' + currentMode;
    }

    // /fix scan — diagnose all files
    if (subCommand === 'scan' || subCommand === 'diagnose') {
      console.log('  🔍 Scanning files...');
      console.log('');
      
      var problems = diagnoseAll();
      
      if (problems.length === 0) {
        return '✅ No issues found. All files load clean.';
      }
      
      var report = '🔍 Found ' + problems.length + ' issue(s):\n\n';
      for (var i = 0; i < problems.length; i++) {
        report = report + '  📄 ' + problems[i].file + '\n';
        report = report + '     ' + problems[i].error.split('\n')[0] + '\n\n';
      }
      report = report + 'Run /fix all to fix everything.';
      return report;
    }

    // /fix all — fix all files with permission per file
    if (subCommand === 'all') {
      var problems = diagnoseAll();
      
      if (problems.length === 0) {
        return '✅ Nothing to fix.';
      }
      
      console.log('  🔧 Found ' + problems.length + ' file(s) to fix with ' + FIX_MODES[currentMode].name + ' mode.');
      if (skipMode) console.log('  ⚡ Skip mode ON — fixing without asking.');
      console.log('');
      
      var fixed = 0;
      var failed = 0;
      var skipped = 0;
      
      for (var i = 0; i < problems.length; i++) {
        var p = problems[i];
        
        if (!skipMode) {
          console.log('  ══════════════════════════════════════════════');
          console.log('  📝 Copilot wants to edit: ' + p.file);
          console.log('  Error: ' + p.error.split('\n')[0]);
          console.log('');
          console.log('  Type "y" to allow, "n" to deny,');
          console.log('  or "skip" to fix ALL remaining files automatically.');
          console.log('  ══════════════════════════════════════════════');
          console.log('');
          
          var permissionResult = await new Promise(function(resolve) {
            askPermission('', function(answer) { resolve(answer); });
          });
          
          if (permissionResult === 'skip') {
            skipMode = true;
          } else if (permissionResult === 'no') {
            console.log('  ⏭️  Skipped: ' + p.file);
            console.log('');
            skipped++;
            continue;
          }
        }
        
        console.log('  🔧 Fixing: ' + p.file + '...');
        
        var result = await fixFile(p.file, currentMode, context);
        
        if (result.success) {
          var backup = createBackup(p.file);
          fs.writeFileSync(p.file, result.fixedCode, 'utf8');
          fixHistory.push({ file: p.file, backup: backup, timestamp: Date.now() });
          console.log('     ✅ Fixed! Backup saved.');
          console.log('');
          fixed++;
        } else if (result.error === 'timeout') {
          console.log('     ⏰ Timeout. Try /fix mode speedy or /fix mode efficient.');
          console.log('');
          failed++;
        } else {
          console.log('     ❌ ' + (result.error || 'Failed'));
          console.log('');
          failed++;
        }
      }
      
      skipMode = false;
      return '📊 Fixed: ' + fixed + ' | Failed: ' + failed + ' | Skipped: ' + skipped + ' | Mode: ' + FIX_MODES[currentMode].name + '\nRun /fix undo to revert any fix.';
    }

    // /fix <filename> — fix specific file with permission
    if (subCommand && subCommand.indexOf('.') !== -1) {
      var filepath = path.resolve(subCommand);
      
      if (!fs.existsSync(filepath)) {
        return '❌ File not found: ' + filepath;
      }
      
      console.log('  ══════════════════════════════════════════════');
      console.log('  📝 Copilot wants to edit: ' + filepath);
      console.log('');
      console.log('  Type "y" to allow, "n" to deny,');
      console.log('  or "skip" to fix automatically from now on.');
      console.log('  ══════════════════════════════════════════════');
      console.log('');
      
      var permission = await new Promise(function(resolve) {
        askPermission('', function(answer) { resolve(answer); });
      });
      
      if (permission === 'skip') skipMode = true;
      if (permission === 'no') return '⏭️  Fix cancelled.';
      
      console.log('  🔧 Fixing ' + filepath + ' with ' + FIX_MODES[currentMode].name + ' mode...');
      console.log('');
      
      var result = await fixFile(filepath, currentMode, context);
      
      if (result.success) {
        var backup = createBackup(filepath);
        fs.writeFileSync(filepath, result.fixedCode, 'utf8');
        fixHistory.push({ file: filepath, backup: backup, timestamp: Date.now() });
        return '✅ Fixed! Backup saved.\n\nRun /fix undo to revert.';
      } else if (result.error === 'timeout') {
        return '⏰ Copilot couldn\'t figure out the code in time.\n\nTry:\n  /fix mode speedy — faster\n  /fix mode efficient — slower but deeper\n  /fix undo — revert if needed';
      } else {
        return '❌ Fix failed: ' + (result.error || 'Unknown error');
      }
    }

    // /fix undo — revert last fix
    if (subCommand === 'undo') {
      if (fixHistory.length === 0) {
        return '📭 No fixes to undo.';
      }
      
      var last = fixHistory.pop();
      var undone = executeUndo(last.file);
      
      if (undone) {
        return '↩️  Undone: ' + last.file + '\n   Original code restored from backup.';
      }
      return '❌ Backup not found for ' + last.file + '. Cannot undo.';
    }

    // /fix history
    if (subCommand === 'history') {
      if (fixHistory.length === 0) {
        return '📭 No fix history.';
      }
      
      var hist = '📜 Fix history:\n\n';
      for (var i = fixHistory.length - 1; i >= 0; i--) {
        var h = fixHistory[i];
        hist = hist + '  ' + (i + 1) + '. ' + h.file + ' — ' + new Date(h.timestamp).toLocaleString() + '\n';
      }
      hist = hist + '\nRun /fix undo to revert the most recent fix.';
      return hist;
    }

    // Usage
    return [
      '🔧 Fix Plugin Commands:',
      '',
      '  /fix scan                    — Scan all files for errors',
      '  /fix all                     — Fix all files (asks per file)',
      '  /fix <filename>              — Fix a specific file',
      '  /fix mode <speedy|genius|efficient> — Switch fix mode',
      '  /fix undo                    — Revert last fix',
      '  /fix history                 — Show fix history',
      '',
      '  📊 Modes:',
      '  • Speedy    — Fast, surface-level fixes',
      '  • Genius    — Balanced speed and thoroughness (default)',
      '  • Efficient — Slow but checks everything deeply',
      '',
      '  🔒 Permission system:',
      '  • y = allow this one fix',
      '  • n = deny this fix',
      '  • skip = fix ALL remaining files automatically',
      '',
      '  ⚠️  Every fix creates a backup before editing.',
      '  ↩️  Use /fix undo to revert any fix.',
      '  📦 Current mode: ' + FIX_MODES[currentMode].name
    ].join('\n');
  }
};
