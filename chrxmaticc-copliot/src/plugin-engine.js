// Chrxmaticc Copilot — Plugin Engine
// Drop .js files in plugins/ folder. They auto-load.
// Author: Chrxmee-Midnightt

var fs = require('fs');
var path = require('path');

var PLUGINS_DIR = path.join(process.env.HOME || '/tmp', '.chrxmaticc', 'plugins');
var plugins = {};
var pluginCommands = {};

function init() {
  if (!fs.existsSync(PLUGINS_DIR)) {
    fs.mkdirSync(PLUGINS_DIR, { recursive: true });
    
    // Create example plugin so users understand the format
    var examplePlugin = `// Example plugin for Chrxmaticc Copilot
// Save any .js file in this folder and it auto-loads!

module.exports = {
  name: 'example',
  description: 'An example plugin — try /example',
  category: 'custom',
  
  // Called when user types /example
  run: async function(args, context) {
    return 'This is an example plugin! You said: ' + (args || 'nothing');
  }
};
`;
    fs.writeFileSync(path.join(PLUGINS_DIR, 'example.js'), examplePlugin);
  }
  
  loadAll();
}

function loadAll() {
  plugins = {};
  pluginCommands = {};
  
  if (!fs.existsSync(PLUGINS_DIR)) return;
  
  var files = fs.readdirSync(PLUGINS_DIR).filter(function(f) { return f.endsWith('.js'); });
  
  files.forEach(function(file) {
    try {
      var pluginPath = path.join(PLUGINS_DIR, file);
      delete require.cache[require.resolve(pluginPath)];
      var plugin = require(pluginPath);
      
      if (plugin.name && plugin.run) {
        plugins[plugin.name] = plugin;
        pluginCommands['/' + plugin.name] = plugin;
        console.log('  ' + chalk.green('✓') + ' Plugin loaded: ' + plugin.name + ' — ' + (plugin.description || ''));
      }
    } catch (e) {
      console.log('  ' + chalk.red('✗') + ' Failed to load plugin: ' + file + ' (' + e.message + ')');
    }
  });
}

function reload() {
  loadAll();
  return Object.keys(plugins).length;
}

function getPlugin(name) {
  return plugins[name] || null;
}

function getAllPlugins() {
  return Object.keys(plugins).map(function(key) {
    var p = plugins[key];
    return { name: p.name, description: p.description, category: p.category || 'custom' };
  });
}

async function runPlugin(name, args, context) {
  var plugin = plugins[name];
  if (!plugin) return null;
  
  try {
    var result = await plugin.run(args, context);
    return result;
  } catch (e) {
    return 'Plugin error: ' + e.message;
  }
}

function isPluginCommand(command) {
  return command.indexOf('/') === 0 && pluginCommands[command.split(' ')[0]];
}

function getPluginFromCommand(command) {
  var cmdName = command.split(' ')[0].replace('/', '');
  return plugins[cmdName] || null;
}

function getPluginDir() {
  return PLUGINS_DIR;
}

function installPlugin(name, code) {
  var filePath = path.join(PLUGINS_DIR, name + '.js');
  fs.writeFileSync(filePath, code);
  loadAll();
  return { success: true, name: name };
}

function uninstallPlugin(name) {
  var filePath = path.join(PLUGINS_DIR, name + '.js');
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    loadAll();
    return { success: true, name: name };
  }
  return { success: false, error: 'Plugin not found' };
}

module.exports = {
  init: init,
  reload: reload,
  getPlugin: getPlugin,
  getAllPlugins: getAllPlugins,
  runPlugin: runPlugin,
  isPluginCommand: isPluginCommand,
  getPluginFromCommand: getPluginFromCommand,
  getPluginDir: getPluginDir,
  installPlugin: installPlugin,
  uninstallPlugin: uninstallPlugin
};
