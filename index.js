#!/usr/bin/env node
/**
 * Created by paul on 7/10/17.
 */
const fs = require('fs')
const ncp = require('ncp').ncp
const childProcess = require('child_process')

const argv = process.argv
const mylog = console.log

const _workingDir = process.cwd()
let _currentPath = _workingDir
let _srcDir = '..'

function ncpPromise (src, dest, opts) {
  return new Promise(function (resolve, reject) {
    ncp(src, dest, opts, function (err, data) {
      if (err !== null) {
        return reject(err)
      }
      resolve(data)
    })
  })
}

function chdir (path) {
  _currentPath = path
}

function call (cmdstring) {
  mylog(cmdstring)
  const opts = {
    encoding: 'utf8',
    timeout: 3600000,
    stdio: 'inherit',
    cwd: _currentPath,
    killSignal: 'SIGKILL'
  }
  childProcess.execSync(cmdstring, opts)
}

function cmd (cmdstring) {
  mylog(cmdstring)
  const opts = {
    encoding: 'utf8',
    timeout: 3600000,
    cwd: _currentPath,
    killSignal: 'SIGKILL'
  }
  const r = childProcess.execSync(cmdstring, opts)
  return r
}

function hashCode(string){
  var hash = 0;
  if (string.length === 0) return hash;
  for (i = 0; i < string.length; i++) {
    let char = string.charCodeAt(i);
    hash = ((hash<<5)-hash)+char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

function arrayIntersect (a, b) {
  return a.filter(function (n) {
    return b.indexOf(n) !== -1
  })
}

if (argv.length > 2) {
  _srcDir = argv[2]
}

const dotdot = cmd('ls -1 ' + _srcDir)
const dotdotArray = dotdot.split('\n')
const modules = cmd('ls -1 node_modules')
const modulesArray = modules.split('\n')

const result = arrayIntersect(dotdotArray, modulesArray)

// mylog(result)

let excludeFiles = [
  '/node_modules',
  '.git',
  '.idea',
  '.vscode',
  '.babelrc',
  '.eslintrc.json',
  '.flowconfig'
]

let packageJsonFiles

function filter (file) {

  if (packageJsonFiles) {
    for (const n in packageJsonFiles) {
      const f = packageJsonFiles[n]
      const s = f.replace('*', '')
      if (file.includes('package.json')) {
        return true
      }
      if (file.includes(s)) {
        return true
      }
    }
    return false
  } else {
    for (const n in excludeFiles) {
      const f = excludeFiles[n]
      if (file.includes(f)) {
        return false
      }
    }
  }
  return true
}

mylog('Found intersecting repos:')
mylog(result)

let numReposWatched = 0

main()

async function main () {
  for (const n in result) {
    const dir = result[n]
    if (dir.length === 0) {
      continue
    }
    const source = _srcDir + '/' + dir
    const dest = 'node_modules/' + dir
    const opts = {
      filter
    }
    chdir(source)
    call('npm run build')
    chdir(_workingDir)
    const packageJson = require('./package.json')
    if (typeof packageJson.files !== 'undefined') {
      mylog('Found package.json file Including only mentioned files')
      packageJsonFiles = packageJson.files
    } else {
      mylog('Excluding default files')
      packageJsonFiles = null
    }

    mylog('Copying ' + source + " to " + dest)

    try {
      await ncpPromise(source, dest, opts)
    } catch (e) {
      mylog(e)
    }
  }
}

