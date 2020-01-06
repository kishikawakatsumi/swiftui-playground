'use strict';

const Sandbox = function(root_dir, temp_dir, code, timeout) {
  this.root_dir = root_dir;
  this.temp_dir = temp_dir;
  this.generator_dir = 'preview-generator';
  this.code = code;
  let to = parseInt(timeout);
  if (isNaN(to)) {
    to = 60;
  } else if (to > 600) {
    to = 600;
  }
  this.timeout = to;
};

Sandbox.prototype.run = function(success) {
  const sandbox = this;
  this.prepare(function() {
    sandbox.execute(success);
  });
};

Sandbox.prototype.prepare = function(success) {
  const exec = require('child_process').spawnSync;
  const fs = require('fs');
  const path = require('path');
  const sandbox = this;

  const generator_dir = path.join(this.root_dir, this.generator_dir);
  const work_dir = path.join(this.root_dir, this.temp_dir);
  exec('mkdir', [work_dir]);
  require('child_process').execSync(['cp', path.join(generator_dir, '*'), work_dir].join(' '));
  exec('chmod', ['755', work_dir]);

  fs.writeFileSync(path.join(work_dir, 'directory.swift'), `import Foundation\nfunc workingDirectory() -> String { "${work_dir}" }`);

  const usercode_path = path.join(work_dir, 'usercode.swift');
  fs.writeFileSync(usercode_path, sandbox.code);

  const previewProviders = require('child_process').execSync([path.join(this.root_dir, 'PreviewProviderParser'), usercode_path].join(' '));
  fs.writeFileSync(path.join(work_dir, 'preview.swift'), `import SwiftUI\nfunc previewProviders() -> some View { ${previewProviders.toString().trim().split(',')[0]}.previews }`);

  success();
};

Sandbox.prototype.execute = function(success) {
  const exec = require('child_process').exec;
  const execSync = require('child_process').spawnSync;
  const fs = require('fs');
  const path = require('path');

  const sandbox = this;
  let counter = 0;

  const work_dir = path.join(sandbox.root_dir, sandbox.temp_dir);
  exec(['sh', path.join(this.root_dir, 'run.sh'), this.timeout + 's', 'sh', path.join(work_dir, 'script.sh')].join(' '), {env: {'APP_ID': `${this.temp_dir}`.replace('temp/', '')}});

  const intid = setInterval(function() {
    counter = counter + 1;
    fs.readFile(path.join(work_dir, 'completed'), 'utf8', function(error, data) {
      if (error && counter < sandbox.timeout) {
        return;
      } else if (counter < sandbox.timeout) {
        fs.readFile(path.join(work_dir, 'errors'), 'utf8', function(error, errorlog) {
          if (!errorlog) {
            errorlog = '';
          }
          const version = fs.readFileSync(path.join(work_dir, 'version'), 'utf8');

          const Q = require('q');
          const imgur = require('imgur');
          imgur.setClientId(process.env.IMGUR_CLIENT_ID);
          imgur.setAPIUrl('https://api.imgur.com/3/');

          const glob = require('glob');
          const previewImages = glob.sync(`${work_dir}/*.png`);
          Q.all(previewImages.map(function (path) { return imgur.uploadFile(path); }))
            .then(function(responses) {
                execSync('rm', ['-rf', sandbox.temp_dir]);
                const previewData = responses.map(function (response) { return {width: response.data.width, height: response.data.height, link: response.data.link}; });
                console.log(previewData);
                success({output: data, previews: previewData}, errorlog, version);
            });
        });
      } else {
        fs.readFile(path.join(work_dir, 'errors'), 'utf8', function(error, errorlog) {
          if (!errorlog) {
            errorlog = 'timeout';
          }
          const version = fs.readFileSync(path.join(work_dir, 'version'), 'utf8');
          execSync('rm', ['-rf', sandbox.temp_dir]);
          success({output: data, previews: []}, errorlog, version);
        });
      }
      clearInterval(intid);
    });
  }, 1000);
};

module.exports = Sandbox;
