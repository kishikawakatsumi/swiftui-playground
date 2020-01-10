'use strict';

const Sandbox = function(root_dir, temp_dir, code, timeout) {
  this.root_dir = root_dir;
  this.temp_dir = temp_dir;
  this.generator_dir = 'preview-generator';
  this.macos_exec_dir = 'macos-exec';
  this.code = code;
  let to = parseInt(timeout);
  if (isNaN(to)) {
    to = 120;
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

Sandbox.prototype.isSwiftUI = function() {
  return !!this.code.match(/^\s*import\s+SwiftUI\s+$/gm)
};

Sandbox.prototype.prepare = function(success) {
  const exec = require('child_process').spawnSync;
  const fs = require('fs');
  const path = require('path');
  const sandbox = this;

  const work_dir = path.join(this.root_dir, this.temp_dir);
  exec('mkdir', [work_dir]);

  const generator_dir = path.join(this.root_dir, this.generator_dir);
  const macos_exec_dir = path.join(this.root_dir, this.macos_exec_dir);

  if (this.isSwiftUI()) {
    require('child_process').execSync(['cp', path.join(generator_dir, '*'), work_dir].join(' '));
  } else {
    require('child_process').execSync(['cp', path.join(macos_exec_dir, '*'), work_dir].join(' '));
  }

  exec('chmod', ['755', work_dir]);

  const usercode_path = path.join(work_dir, 'usercode.swift');
  fs.writeFileSync(usercode_path, sandbox.code);

  if (this.isSwiftUI()) {
    fs.writeFileSync(path.join(work_dir, 'directory.swift'), `import Foundation\nfunc workingDirectory() -> String { "${work_dir}" }`);

    const previewProviders = require('child_process').execSync([path.join(this.root_dir, 'PreviewProviderParser'), usercode_path].join(' '));
    const previewProvider = previewProviders.toString().trim().split(',')[0]
    this.previewProvider = previewProvider;
    fs.writeFileSync(path.join(work_dir, 'preview.swift'), `import SwiftUI\nfunc previewProviders() -> some View { ${previewProvider}.previews }`);
  }

  success();
};

Sandbox.prototype.execute = function(success) {
  const exec = require('child_process').exec;
  const execSync = require('child_process').spawnSync;
  const fs = require('fs');
  const path = require('path');

  const sandbox = this;
  let counter = 0;

  if (this.isSwiftUI() && !this.previewProvider) {
    success({output: '', previews: []}, 'No preview provider.', '');
    return;
  }

  const work_dir = path.join(sandbox.root_dir, sandbox.temp_dir);
  exec(['sh', path.join(this.root_dir, 'run.sh'), this.timeout + 's', 'sh', path.join(work_dir, 'script.sh')].join(' '), {env: {'APP_ID': `${this.temp_dir}`.replace('temp/', '')}});

  const root_dir = this.root_dir;
  const temp_dir = this.temp_dir;
  const static_dir = path.join(root_dir, path.join('static', path.join('results', temp_dir.split('/')[1])));

  const intid = setInterval(function() {
    counter = counter + 1;
    fs.readFile(path.join(work_dir, 'completed'), 'utf8', function(error, data) {
      if (error && counter < sandbox.timeout) {
        return;
      } else if (counter < sandbox.timeout) {
        fs.readFile(path.join(work_dir, 'errors'), 'utf8', function(error, errorlog) {
          if (errorlog) {
            errorlog = errorlog.split('usercode.swift:').join('');
            errorlog = errorlog.split('make: *** [simulator] Error 1').join('');
          } else {
            errorlog = '';
          }

          const version = fs.readFileSync(path.join(work_dir, 'version'), 'utf8');

          const glob = require('glob');
          const previewImages = glob.sync(`${work_dir}/*.png`);
          const previews = [];
          if (previewImages.length > 0) {
            require('child_process').spawnSync('mkdir', ['-p', static_dir]);
          }
          for (const image of previewImages) {
            require('child_process').execSync(['cp', image, static_dir].join(' '));
            const sizeOf = require('image-size');
            const dimensions = sizeOf(image);
            const previewData = {};
            previewData['width'] = dimensions.width;
            previewData['height'] = dimensions.height;
            previewData['link'] = 'https://swiftui-playground.kishikawakatsumi.com/results/' + path.join(path.basename(static_dir), path.basename(image));
            previews.push(previewData);
          }

          console.log(`${new Date().toLocaleString("en-US", {timeZone: "Asia/Tokyo"})} ${JSON.stringify(previews)}`);
          execSync('rm', ['-rf', sandbox.temp_dir]);
          success({output: data, previews: previews}, errorlog, version);
        });
      } else {
        fs.readFile(path.join(work_dir, 'errors'), 'utf8', function(error, errorlog) {
          if (!errorlog) {
            errorlog = 'The operation has timed out.';
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
