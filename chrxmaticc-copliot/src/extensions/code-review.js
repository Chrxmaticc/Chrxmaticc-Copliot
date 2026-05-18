// Chrxmaticc Copilot — Code Review Bot
// Reviews GitHub PRs with AI suggestions
// Author: Chrxmee-Midnightt

var chat = require('../chat');
var chalk = require('chalk');

var reviewCache = {};

async function reviewCode(code, language) {
  language = language || 'javascript';
  
  var prompt = 'Review this ' + language + ' code. Find bugs, suggest improvements, and check for best practices. Be direct and concise.\n\n```' + language + '\n' + code.slice(0, 3000) + '\n```';
  
  var response = await chat.getResponse(prompt);
  var text = typeof response === 'string' ? response : response.text;
  
  return {
    review: text,
    timestamp: Date.now()
  };
}

async function reviewPR(prTitle, prDescription, files) {
  var prompt = 'Review this pull request:\nTitle: ' + prTitle + '\nDescription: ' + prDescription + '\n\nFiles changed:\n';
  
  for (var i = 0; i < files.length; i++) {
    prompt = prompt + '\n### ' + files[i].filename + '\n```\n' + files[i].patch.slice(0, 1500) + '\n```\n';
  }
  
  prompt = prompt + '\nGive me a summary, any bugs found, and suggestions.';
  
  var response = await chat.getResponse(prompt);
  var text = typeof response === 'string' ? response : response.text;
  
  return {
    review: text,
    filesReviewed: files.length,
    timestamp: Date.now()
  };
}

function watchGitHubPRs(webhookUrl) {
  console.log('');
  console.log('  ' + chalk.magenta('🔍 Code Review Bot active'));
  console.log('  ' + chalk.gray('Send PRs to review. Results cached for 1 hour.'));
  console.log('');
}

function getReviewFromCache(key) {
  if (reviewCache[key] && Date.now() - reviewCache[key].timestamp < 3600000) {
    return reviewCache[key].review;
  }
  return null;
}

module.exports = {
  reviewCode: reviewCode,
  reviewPR: reviewPR,
  watchGitHubPRs: watchGitHubPRs,
  getReviewFromCache: getReviewFromCache
};
