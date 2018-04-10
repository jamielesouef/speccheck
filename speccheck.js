const glob = require('glob');
const fs = require('fs');
const path = require('path');
const colors = require('colors');
const deepmerge = require('deepmerge');

const defaultConfig = {
  src: 'src/**/*.js',
  specFormat: '',
  testPrependFolder: '',
  testAppendFolder: '',
  options: {
    exitOnMissingSpecs: true,
  },
  ignore: [],
};

const configFile = `${process.cwd()}/speccheck.json`;

const getConfig = () => new Promise((resolve) => {
  fs.readFile(configFile, 'utf8', (err, f) => {
    if (err) {
      console.log('Using default config...'.green);
      resolve(defaultConfig);
    } else {
      console.log(`Using ${configFile} config file`.green);
      resolve(deepmerge(defaultConfig, JSON.parse(f)));
    }
  });
});

const fromSrcToTestObject = config => (src) => {
  const basename = path.basename(src);
  const extName = path.extname(src);
  const dir = src.replace(`${basename}`, '');
  const testBasename = `${basename.replace(extName, '')}${config.specFormat}`;
  const test = `${config.testPrependFolder}${dir}${config.testAppendFolder}/${testBasename}${extName}`;

  return {
    src,
    test,
  };
};

const removeExistingTestFiles = config => file => file.indexOf(config.testAppendFolder) === -1;
const checkIfSpecFileExists = file => !fs.existsSync(file.test);
const fromTestObjectToSrc = file => file.src;
const removeIgnoredFiles = config => file => (config.ignore || []).indexOf(file) === -1;

const processTestFiles = (config) => {
  glob('src/**/*.js', (err, files) => {
    const srcFilesMissingSpec = files
      .filter(removeExistingTestFiles(config))
      .filter(removeIgnoredFiles(config))
      .map(fromSrcToTestObject(config))
      .filter(checkIfSpecFileExists)
      .map(fromTestObjectToSrc);

    const ignoreLength = (config.ignore || []).length;
    const checked = files.length - ignoreLength;
    console.log('\n😌 ', `${checked} files checked (${ignoreLength} file${ignoreLength === 1 ? '' : 's'} ignored)`.bold);

    if (srcFilesMissingSpec) {
      console.log('🤘 ', `${checked - srcFilesMissingSpec.length} files have specs `.green);
      console.log('😱 ', `${srcFilesMissingSpec.length} files are missing specs`.red.underline.bold);
      srcFilesMissingSpec.forEach(file => console.error(`- ${file}`.red));
      if (config.options.exitOnMissingSpecs) {
        process.exit(1);
      }
    } else {
      console.log('🙌 ', 'All files have spec files'.green);
    }
  });
};

getConfig().then(processTestFiles);
