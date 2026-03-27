const os = require('os');
const osUtils = require('os-utils');
const disk = require('diskusage');

exports.getSystemStats = () => {
  return new Promise((resolve, reject) => {
    osUtils.cpuUsage((cpuPercent) => {
      try {
        const pathToCheck = os.platform() === 'win32' ? 'c:' : '/';
        const diskInfo = disk.checkSync(pathToCheck);
        
        resolve({
          cpu: (cpuPercent * 100).toFixed(1),
          mem: (100 - (os.freemem() / os.totalmem() * 100)).toFixed(1),
          disk: (100 - (diskInfo.available / diskInfo.total * 100)).toFixed(1),
          uptime: Math.floor(os.uptime() / 3600),
          load: os.loadavg()[0].toFixed(2)
        });
      } catch (err) {
        reject(err);
      }
    });
  });
};