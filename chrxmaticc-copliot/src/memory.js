// Chrxmaticc Copilot — Persistent Memory Engine
// Zero dependencies. JSON-backed. Auto-creates on first run.
// Author: Chrxmee-Midnightt

var fs = require('fs');
var path = require('path');

var MEMORY_DIR = path.join(process.env.HOME || '/tmp', '.chrxmaticc');
var CONVERSATIONS_FILE = path.join(MEMORY_DIR, 'conversations.json');
var FACTS_FILE = path.join(MEMORY_DIR, 'facts.json');

var conversations = {};
var facts = {};

function init() {
  if (!fs.existsSync(MEMORY_DIR)) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
  }
  if (fs.existsSync(CONVERSATIONS_FILE)) {
    try { conversations = JSON.parse(fs.readFileSync(CONVERSATIONS_FILE, 'utf8')); } catch (e) {}
  }
  if (fs.existsSync(FACTS_FILE)) {
    try { facts = JSON.parse(fs.readFileSync(FACTS_FILE, 'utf8')); } catch (e) {}
  }
}

function save() {
  fs.writeFileSync(CONVERSATIONS_FILE, JSON.stringify(conversations, null, 2));
  fs.writeFileSync(FACTS_FILE, JSON.stringify(facts, null, 2));
}

function storeMessage(userId, role, content, provider) {
  if (!conversations[userId]) conversations[userId] = [];
  conversations[userId].push({ role: role, content: content, provider: provider || 'unknown', timestamp: Date.now() });
  if (conversations[userId].length > 500) conversations[userId] = conversations[userId].slice(-500);
  save();
}

function storeConversation(userId, history) {
  conversations[userId] = history.map(function(msg) { return { role: msg.role, content: msg.content, timestamp: Date.now() }; });
  save();
}

function recall(userId, query) {
  if (!conversations[userId]) return null;
  var lower = query.toLowerCase();
  for (var i = conversations[userId].length - 1; i >= 0; i--) {
    if (conversations[userId][i].content.toLowerCase().indexOf(lower) !== -1) return conversations[userId][i].content;
  }
  return null;
}

function getStats(userId) {
  return { conversations: conversations[userId] ? conversations[userId].length : 0, facts: facts[userId] ? Object.keys(facts[userId]).length : 0 };
}

module.exports = { init: init, storeMessage: storeMessage, storeConversation: storeConversation, recall: recall, getStats: getStats };
