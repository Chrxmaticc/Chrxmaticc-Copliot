#!/usr/bin/env node
// Chrxmaticc Copilot v1.0.0 — CLI Entry
// Author: Chrxmee-Midnightt

var Command = require('commander').Command;
var chalk = require('chalk');
var path = require('path');
var fs = require('fs');
var program = new Command();

program
  .name('chrxmaticc-copilot')
  .description(chalk.magenta('🧠 Chrxmaticc Copilot — Hyper-Intelligent Terminal AI'))
  .version('1.0.0')
  .option('-c, --chat', 'Start interactive chat mode')
  .option('-a, --ask <question>', 'Ask a single question')
  .option('-i, --idea', 'Get a random creative idea')
  .option('-s, --shader <name>', 'Ask about a specific shader')
  .option('-l, --log', 'Save conversation to file')
  .option('--credits', 'Show credits')
  .action(function(options) {
    if (options.credits) {
      console.log('');
      console.log('  ' + chalk.magenta('╔══════════════════════════════════════╗'));
      console.log('  ' + chalk.magenta('║     Chrxmaticc Copilot v1.0.0       ║'));
      console.log('  ' + chalk.magenta('╠══════════════════════════════════════╣'));
      console.log('  ' + chalk.magenta('║') + '  Author:  ' + chalk.white('Chrxmee-Midnightt') + '       ' + chalk.magenta('║'));
      console.log('  ' + chalk.magenta('║') + '  AI:      ' + chalk.white('Pollinations AI') + '         ' + chalk.magenta('║'));
      console.log('  ' + chalk.magenta('║') + '  Memory:  ' + chalk.white('100 messages') + '            ' + chalk.magenta('║'));
      console.log('  ' + chalk.magenta('║') + '  Price:   ' + chalk.white('Free. No key.') + '           ' + chalk.magenta('║'));
      console.log('  ' + chalk.magenta('╚══════════════════════════════════════╝'));
      console.log('');
      return;
    }
    
    if (options.idea) {
      var chat = require('../src/chat');
      chat.getResponse('give me a creative shader idea').then(function(response) {
        console.log('');
        console.log('  ' + chalk.magenta('chrxmaticc > ') + response);
        console.log('');
      });
      return;
    }
    
    if (options.shader) {
      var chat = require('../src/chat');
      var question = 'tell me everything about the ' + options.shader + ' shader. what techniques does it use?';
      chat.getResponse(question).then(function(response) {
        console.log('');
        console.log('  ' + chalk.magenta('chrxmaticc > ') + response);
        console.log('');
      });
      return;
    }
    
    if (options.ask) {
      var chat = require('../src/chat');
      chat.getResponse(options.ask).then(function(response) {
        console.log('');
        console.log('  ' + chalk.magenta('chrxmaticc > ') + response);
        console.log('');
      });
      return;
    }
    
    // Default: start chat
    var chat = require('../src/chat');
    chat.chat();
  });

program.parse();
