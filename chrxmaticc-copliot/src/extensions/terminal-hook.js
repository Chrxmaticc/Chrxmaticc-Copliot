// Chrxmaticc Copilot — Terminal Hook
// Auto-completes commands in your terminal
// Author: Chrxmee-Midnightt

var chat = require('../chat');
var chalk = require('chalk');

var commandHistory = [];
var maxHistory = 50;

function suggestCommand(partial) {
  var prompt = 'Complete this terminal command. Give ONLY the command, no explanation:\n' + partial;
  
  return chat.getResponse(prompt).then(function(response) {
    var text = typeof response === 'string' ? response : response.text;
    return text.trim().split('\n')[0].replace(/`/g, '').trim();
  });
}

function explainCommand(command) {
  return chat.getResponse('Explain this terminal command in one sentence:\n' + command)
    .then(function(response) {
      return typeof response === 'string' ? response : response.text;
    });
}

function getDangerousCommands() {
  return [
    'rm -rf /', 'sudo rm', ':(){ :|:& };:', 'mkfs',
    'dd if=', '> /dev/sda', 'chmod 777 /',
    'wget -O - | sh', 'curl | bash'
  ];
}

function isDangerous(command) {
  var dangerous = getDangerousCommands();
  for (var i = 0; i < dangerous.length; i++) {
    if (command.indexOf(dangerous[i]) !== -1) return true;
  }
  return false;
}

function hookShell() {
  console.log('');
  console.log('  ' + chalk.magenta('💻 Terminal Hook active'));
  console.log('  ' + chalk.gray('Type "??" after any partial command for suggestions'));
  console.log('');
}

module.exports = {
  suggestCommand: suggestCommand,
  explainCommand: explainCommand,
  isDangerous: isDangerous,
  hookShell: hookShell
};
