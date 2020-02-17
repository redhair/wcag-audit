const url = require('url');
const Crawler = require('crawler');

function _initCrawler({ base, visited }) {
  const rootUrl = `https://${base}`;

  /*
    A "valid" link is one that is internal to
    the site we are scanning. Exclude undefined
    href values as well as non http "links" such
    as tel: or mailto: links.
  */
  function isHrefValid(href) {
    const isHttp = href => href.indexOf('http://') > -1 || href.indexOf('https://') > -1;
    const isValidInternalLink = href => url.resolve(rootUrl, href).length > 0 && href.indexOf(base) > -1;
    if (href) {
      let absolute = url.resolve(rootUrl, href);
      if (isValidInternalLink(absolute) && isHttp(absolute) && !visited.includes(absolute)) {
        return {
          valid: true,
          absoluteUrl: absolute
        };
      }
    }

    return {
      valid: false
    };
  }

  /* 
    Select all anchor tags in page, then
    validate their href attribute. "Valid"
    hrefs get pushed to the crawl queue and
    added to our "visited" pages.
  */
  function getValidLinksFromPage(res) {
    let nextUrls = [];
    let $ = res.$;
    let links = $('a');
    $(links).each((i, link) => {
      const href = $(link).attr('href');
      const { valid, absoluteUrl } = isHrefValid(href);
      if (valid) {
        nextUrls.push(absoluteUrl);
        visited.push(absoluteUrl);
      }
    });

    if (nextUrls.length > 0) {
      crawler.queue(nextUrls);
    }
  }

  const crawler = new Crawler({
    maxConnections: 10,
    rateLimit: 100,
    callback: (error, res, done) => {
      if (error) console.error({ error });

      console.log('VISITING: ', res.options.uri);
      getValidLinksFromPage(res);
      done();
    }
  });

  crawler.queue(rootUrl);

  crawler.on('drain', () => {
    console.log('drain');
  });

  return crawler;
}

module.exports = ({ base, visited }) => {
  _initCrawler({ base, visited });
};
