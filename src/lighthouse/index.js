const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

const opts = {
  chromeFlags: ['--headless'],
  onlyCategories: ['accessibility']
};

module.exports = {
  generateWCAGReport: (url, config = null) => {
    return chromeLauncher
      .launch({ port: 0, chromeFlags: opts.chromeFlags })
      .then(chrome => {
        opts.port = chrome.port;
        return lighthouse(url, opts, config)
          .then(results => {
            return chrome.kill().then(() => results.report);
          })
          .catch(err => {
            console.error('Lighthouse Error: ', { err });

            chrome.kill();
          });
      })
      .catch(err => {
        console.error('Generate WCAG Report Error: ', { err });
      });
  }
};
