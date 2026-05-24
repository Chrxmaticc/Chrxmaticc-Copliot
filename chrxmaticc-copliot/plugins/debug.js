// Chrxmaticc Copilot — Debug Plugin v1.1.0
// Deep error scanning + AI code review
// Author: Chrxmee-Midnightt

var fs = require('fs');
var path = require('path');
var execSync = require('child_process').execSync;

var ERROR_TYPES = {
  'Cannot find module': { type: 'Missing Dependency', fix: 'npm install <module>', severity: 'critical' },
  'is not defined': { type: 'Undefined Variable', fix: 'Add require or declaration', severity: 'critical' },
  'SyntaxError': { type: 'Syntax Error', fix: 'Check brackets, quotes, or commas', severity: 'critical' },
  'Unexpected token': { type: 'Syntax Error', fix: 'Check for missing brackets or quotes', severity: 'critical' },
  'is not a function': { type: 'Type Error', fix: 'Check variable assignment', severity: 'critical' },
  'cannot read property': { type: 'Null Reference', fix: 'Add null check', severity: 'high' },
  'ENOENT': { type: 'File Not Found', fix: 'Check file path', severity: 'high' },
  'EACCES': { type: 'Permission Denied', fix: 'Check file permissions', severity: 'high' },
  'ECONNREFUSED': { type: 'Connection Refused', fix: 'Check if server is running', severity: 'medium' },
  'timeout': { type: 'Timeout', fix: 'Increase timeout or check network', severity: 'medium' }
};

function getErrorType(message) {
  var keys = Object.keys(ERROR_TYPES);
  for (var i = 0; i < keys.length; i++) {
    if (message.indexOf(keys[i]) !== -1) {
      return ERROR_TYPES[keys[i]];
    }
  }
  return { type: 'Runtime Error', fix: 'Run /fix <file> to attempt auto-fix', severity: 'unknown' };
}

function getFileList(dir) {
  var files = [];
  try {
    var entries = fs.readdirSync(dir, { withFileTypes: true });
    for (var i = 0; i < entries.length; i++) {
      var fullPath = path.join(dir, entries[i].name);
      if (entries[i].isDirectory() && entries[i].name !== 'node_modules' && entries[i].name.indexOf('.') !== 0) {
        files = files.concat(getFileList(fullPath));
      } else if (entries[i].isFile() && (entries[i].name.endsWith('.js') || entries[i].name.endsWith('.json') || entries[i].name.endsWith('.glsl') || entries[i].name.endsWith('.yml') || entries[i].name.endsWith('.yaml'))) {
        files.push(fullPath);
      }
    }
  } catch (e) {}
  return files;
}

function parseErrorOutput(output) {
  var lines = output.split('\n');
  var result = { line: null, column: null, file: null, message: '', stack: [] };
  
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;
    
    var fileMatch = line.match(/at\s+.*\((.+):(\d+):(\d+)\)/);
    if (fileMatch) {
      result.file = fileMatch[1];
      result.line = parseInt(fileMatch[2]);
      result.column = parseInt(fileMatch[3]);
      result.stack.push({ file: fileMatch[1], line: parseInt(fileMatch[2]), column: parseInt(fileMatch[3]) });
    }
    
    if (line.indexOf('Error') !== -1 || line.indexOf('error') !== -1) {
      result.message = line;
    }
  }
  
  return result;
}

function diagnoseFile(filepath) {
  try {
    execSync('node -e "try { require(\'' + filepath.replace(/\\/g, '\\\\') + '\') } catch(e) { console.log(e.message); console.log(e.stack) }"', { timeout: 8000, stdio: 'pipe' });
    return null;
  } catch (e) {
    var output = '';
    if (e.stdout) output = output + e.stdout.toString();
    if (e.stderr) output = output + e.stderr.toString();
    return output;
  }
}

function getRelativePath(filepath) {
  return path.relative(process.cwd(), filepath);
}

async function getAIReview(filepath, context) {
  var code = fs.readFileSync(filepath, 'utf8');
  var relPath = getRelativePath(filepath);
  
  var prompt = [
    'Review this code file. Be direct and technical.',
    '',
    'File: ' + relPath,
    'Lines: ' + code.split('\n').length,
    '',
    'Tell me:',
    '1. What this file does (one sentence)',
    '2. Any potential bugs or issues',
    '3. Missing error handling',
    '4. Performance concerns',
    '5. Security issues (if any)',
    '6. Suggestions for improvement',
    '7. Overall code quality rating (1-10)',
    '',
    'Be concise but thorough. Keep it under 200 words.',
    '',
    '```javascript',
    code.slice(0, 3000),
    '```'
  ].join('\n');
  
  var response = await context.getResponse(prompt);
  return typeof response === 'string' ? response : response.text;
}

var scanResults = [];

module.exports = {
  name: 'debug',
  description: 'Deep scan for errors with line numbers, types, and AI code review',
  category: 'dev',
  run: async function(args, context) {
    var parts = (args || '').split(' ');
    var subCommand = parts[0] || '';

    // /debug scan — full scan
    if (subCommand === 'scan' || !subCommand) {
      console.log('  🔍 Debug scan starting...');
      console.log('');
      
      var files = getFileList(process.cwd());
      var errors = [];
      var warnings = [];
      var clean = 0;
      scanResults = [];
      
      for (var i = 0; i < files.length; i++) {
        var filepath = files[i];
        var relPath = getRelativePath(filepath);
        
        process.stdout.write('\r  Scanning: ' + (i + 1) + '/' + files.length + ' — ' + relPath.slice(-50));
        
        var output = diagnoseFile(filepath);
        
        if (output) {
          var parsed = parseErrorOutput(output);
          var errorType = getErrorType(output);
          
          var entry = {
            file: relPath,
            absolutePath: filepath,
            error: parsed.message || output.split('\n')[0],
            type: errorType.type,
            severity: errorType.severity,
            fix: errorType.fix,
            line: parsed.line,
            column: parsed.column,
            stack: parsed.stack,
            timestamp: Date.now()
          };
          
          if (errorType.severity === 'critical' || errorType.severity === 'high') {
            errors.push(entry);
          } else {
            warnings.push(entry);
          }
          
          scanResults.push(entry);
        } else {
          clean++;
        }
      }
      
      process.stdout.write('\r                                  \r');
      
      console.log('');
      console.log('  ══════════════════════════════════════════════');
      console.log('  🔍 DEBUG SCAN COMPLETE');
      console.log('  ══════════════════════════════════════════════');
      console.log('');
      console.log('  📊 Summary:');
      console.log('     ✅ Clean files:    ' + clean);
      console.log('     ❌ Errors:         ' + errors.length);
      console.log('     ⚠️  Warnings:       ' + warnings.length);
      console.log('');
      
      if (errors.length === 0 && warnings.length === 0) {
        return '🎉 All ' + clean + ' files are clean. No errors found.';
      }
      
      if (errors.length > 0) {
        console.log('  ❌ ERRORS (these will prevent your code from running):');
        console.log('');
        
        for (var e = 0; e < errors.length; e++) {
          var err = errors[e];
          console.log('  ' + (e + 1) + '. 📄 ' + err.file);
          console.log('     🏷️  Type:     ' + err.type);
          console.log('     ⚡ Severity: ' + err.severity.toUpperCase());
          if (err.line) console.log('     📍 Line:     ' + err.line);
          console.log('     💬 ' + err.error.slice(0, 120));
          console.log('     🔧 Fix:      ' + err.fix);
          console.log('');
        }
      }
      
      if (warnings.length > 0) {
        console.log('  ⚠️  WARNINGS (minor issues):');
        console.log('');
        
        for (var w = 0; w < warnings.length; w++) {
          var warn = warnings[w];
          console.log('  ' + (w + 1) + '. 📄 ' + warn.file);
          console.log('     🏷️  Type: ' + warn.type);
          console.log('     💬 ' + warn.error.slice(0, 120));
          console.log('');
        }
      }
      
      return '🔧 Run /fix all to automatically fix these errors, or /debug review <file> for AI analysis.';
    }

    // /debug <filename> — debug specific file
    if (subCommand && subCommand.indexOf('.') !== -1) {
      var filepath = path.resolve(subCommand);
      
      if (!fs.existsSync(filepath)) {
        return '❌ File not found: ' + filepath;
      }
      
      var relPath = getRelativePath(filepath);
      console.log('  🔍 Debugging: ' + relPath);
      console.log('');
      
      var output = diagnoseFile(filepath);
      
      if (!output) {
        return '✅ ' + relPath + ' — No runtime errors detected. Run /debug review ' + relPath + ' for AI analysis.';
      }
      
      var parsed = parseErrorOutput(output);
      var errorType = getErrorType(output);
      
      console.log('  ══════════════════════════════════════════════');
      console.log('  🔍 DEBUG RESULT');
      console.log('  ══════════════════════════════════════════════');
      console.log('');
      console.log('  📄 File:     ' + relPath);
      console.log('  🏷️  Type:     ' + errorType.type);
      console.log('  ⚡ Severity: ' + errorType.severity.toUpperCase());
      if (parsed.line) {
        console.log('  📍 Line:     ' + parsed.line);
        console.log('  📍 Column:   ' + parsed.column);
      }
      console.log('  💬 Error:    ' + (parsed.message || output.split('\n')[0]));
      console.log('  🔧 Fix:      ' + errorType.fix);
      
      if (parsed.stack && parsed.stack.length > 0) {
        console.log('');
        console.log('  📚 Stack trace:');
        for (var s = 0; s < Math.min(parsed.stack.length, 5); s++) {
          var frame = parsed.stack[s];
          console.log('     ' + (s + 1) + '. ' + getRelativePath(frame.file) + ':' + frame.line);
        }
      }
      
      console.log('');
      return '🔧 Run /fix ' + relPath + ' to attempt auto-fix, or /debug review ' + relPath + ' for AI analysis.';
    }

    // /debug review <filename> — AI code review
    if (subCommand === 'review') {
      var target = rest;
      
      if (!target) {
        return 'Usage: /debug review <filename>\n\nExample: /debug review src/chat.js';
      }
      
      var filepath = path.resolve(target);
      
      if (!fs.existsSync(filepath)) {
        return '❌ File not found: ' + filepath;
      }
      
      var relPath = getRelativePath(filepath);
      var code = fs.readFileSync(filepath, 'utf8');
      
      console.log('  🤖 AI reviewing: ' + relPath);
      console.log('  📏 ' + code.split('\n').length + ' lines, ' + code.length + ' chars');
      console.log('');
      console.log('  ══════════════════════════════════════════════');
      console.log('');
      
      var review = await getAIReview(filepath, context);
      
      console.log(review);
      console.log('');
      console.log('  ══════════════════════════════════════════════');
      console.log('');
      
      return '📊 AI review complete. Issues found? Run /fix ' + relPath + ' to auto-fix.';
    }

    // /debug summary
    if (subCommand === 'summary') {
      if (scanResults.length === 0) {
        return '📭 No scan data. Run /debug scan first.';
      }
      
      var critical = scanResults.filter(function(r) { return r.severity === 'critical'; }).length;
      var high = scanResults.filter(function(r) { return r.severity === 'high'; }).length;
      var medium = scanResults.filter(function(r) { return r.severity === 'medium'; }).length;
      var unknown = scanResults.filter(function(r) { return r.severity === 'unknown'; }).length;
      
      var types = {};
      scanResults.forEach(function(r) {
        if (!types[r.type]) types[r.type] = 0;
        types[r.type]++;
      });
      
      var report = '📊 Last scan summary:\n\n';
      report = report + '  Severity:\n';
      report = report + '    🔴 Critical: ' + critical + '\n';
      report = report + '    🟠 High:     ' + high + '\n';
      report = report + '    🟡 Medium:   ' + medium + '\n';
      report = report + '    ⚪ Unknown:  ' + unknown + '\n\n';
      report = report + '  Error types:\n';
      
      var typeKeys = Object.keys(types);
      for (var t = 0; t < typeKeys.length; t++) {
        report = report + '    ' + typeKeys[t] + ': ' + types[typeKeys[t]] + '\n';
      }
      
      return report;
    }

    // Usage
    return [
      '🔍 Debug Plugin Commands:',
      '',
      '  /debug scan                  — Full scan of all files',
      '  /debug <filename>            — Debug a specific file',
      '  /debug review <filename>     — AI code review and analysis',
      '  /debug summary               — Show last scan summary',
      '',
      '  🤖 AI Review checks:',
      '  • What the file does',
      '  • Potential bugs and issues',
      '  • Missing error handling',
      '  • Performance concerns',
      '  • Security issues',
      '  • Improvement suggestions',
      '  • Overall quality rating',
      '',
      '  🔧 When errors are found:',
      '  • Shows file name and directory',
      '  • Shows exact line number',
      '  • Shows error type and severity',
      '  • Recommends specific fix action',
      '',
      '  ⚡ Workflow: /debug scan → /debug review <file> → /fix <file>'
    ].join('\n');
  }
};
