const fs = require('fs');
const slugify = require('slugify');

const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

const { generateWCAGReport } = require('./lighthouse');
const crawler = require('./crawler');

const base = 'afito.com';

let data = [];

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  // console.log('GATHERING INTERNAL LINKS.');
  // crawler({ base, rootUrl, visited });
  // console.log('LOADING...');

  let visited = [
    'https://afito.com/',
    'https://afito.com/off-campus-housing',
    'https://afito.com/off-campus-housing/rutgers-university',
    'https://afito.com/off-campus-housing/rowan-university',
    'https://afito.com/off-campus-housing/auburn-university/',
    'https://afito.com/off-campus-housing/johns-hopkins-university',
    'https://afito.com/off-campus-housing/university-of-washington',
    'https://afito.com/property/629',
    'https://afito.com/off-campus-housing/university-of-south-alabama/300-north-duval-street-unit-804-tallahassee-florida-4475'
  ];

  for (let i = 0; i < numCPUs; i++) {
    let worker = cluster.fork();
    worker.send({ cmd: 'PROCESS_URL', url: visited.pop() });
  }

  for (const id in cluster.workers) {
    cluster.workers[id].on('message', messageHandler);
  }

  function messageHandler(msg) {
    if (msg.cmd === 'RUNNING_REPORT') {
      console.log('Running report for: ', msg.url);
    } else if (msg.cmd === 'DONE') {
      console.log('Finished report for: ', msg.url);
      data[msg.url] = msg.results;
    }
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    console.log('visited length, ', visited.length);
    if (visited.length > 0) {
      let worker = cluster.fork();
      console.log('fork: ', worker);
      worker.send({ cmd: 'PROCESS_URL', url: visited.pop() });
    } else {
      console.log({ data });
    }
  });
} else {
  _main();

  //console.log(`Worker ${process.pid} started`);
}

function _main() {
  process.on('message', async msg => {
    if (msg.cmd === 'PROCESS_URL') {
      let url = msg.url;
      if (!url) return;
      try {
        process.send({ cmd: 'RUNNING_REPORT', url });

        const report = await generateWCAGReport(url);
        if (report) {
          let results = JSON.parse(report).categories.accessibility.score;
          process.send({ cmd: 'DONE', url, results });
        }

        process.kill(process.pid);

        /*
        fs.writeFile(`./reports/page_${slugify(url)}.json`, report, error => {
          if (error) return console.error('File write error: ', { error });
          
        });
        */
      } catch (err) {
        console.error('Report Error: ', { err });
      }
    }
  });
}
