'use strict'

const assert = require('assert')
const { execFileSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const zlib = require('zlib')
const ts = require('typescript')

const root = __dirname
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'coinmarketcap-types-'))

function compile (directory, packed) {
  for (const fixture of ['commonjs', 'default']) {
    const options = {
      strict: true,
      exactOptionalPropertyTypes: true,
      noEmit: true,
      skipLibCheck: false,
      types: [],
      lib: ['lib.es2015.d.ts'],
      target: ts.ScriptTarget.ES2015,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      esModuleInterop: fixture === 'default'
    }
    if (!packed) {
      options.baseUrl = root
      options.paths = { 'coinmarketcap-api': ['./'] }
    }
    const program = ts.createProgram([path.join(directory, `${fixture}.ts`)], options)
    const diagnostics = ts.getPreEmitDiagnostics(program)
    assert.strictEqual(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => root,
      getCanonicalFileName: name => name,
      getNewLine: () => '\n'
    }))
    console.log(`${packed ? 'Packed' : 'Source'} ${fixture} TypeScript consumer passed`)
  }
}

// Read only known files from the tarball produced below. No archive paths are extracted.
function unpackConsumer (archive, destination) {
  const contents = zlib.gunzipSync(fs.readFileSync(archive))
  const required = new Set(['package/package.json', 'package/index.js', 'package/index.d.ts'])
  for (let offset = 0; offset + 512 <= contents.length;) {
    const header = contents.subarray(offset, offset + 512)
    const name = header.subarray(0, 100).toString().replace(/\0.*$/, '')
    const size = parseInt(header.subarray(124, 136).toString().replace(/\0.*$/, '').trim(), 8) || 0
    if (required.has(name)) {
      assert.ok(header[156] === 0 || header[156] === 48, `Expected a regular file: ${name}`)
      fs.writeFileSync(path.join(destination, path.basename(name)), contents.subarray(offset + 512, offset + 512 + size))
      required.delete(name)
    }
    offset += 512 + Math.ceil(size / 512) * 512
  }
  assert.deepStrictEqual(Array.from(required), [], 'The npm package must ship its declaration, entry point and metadata')
}

try {
  compile(path.join(root, 'test/types'), false)
  // Yarn and pnpm also set npm_execpath; only npm implements this pack contract.
  const npmCli = process.env.npm_execpath && path.basename(process.env.npm_execpath) === 'npm-cli.js'
    ? process.env.npm_execpath
    : undefined
  const output = execFileSync(npmCli ? process.execPath : 'npm',
    [...(npmCli ? [npmCli] : []), 'pack', '--ignore-scripts', '--json', '--pack-destination', temporary],
    { cwd: root, encoding: 'utf8' })
  const packages = JSON.parse(output)
  assert.strictEqual(packages.length, 1)
  const destination = path.join(temporary, 'node_modules/coinmarketcap-api')
  fs.mkdirSync(destination, { recursive: true })
  unpackConsumer(path.join(temporary, packages[0].filename), destination)
  const manifest = JSON.parse(fs.readFileSync(path.join(destination, 'package.json'), 'utf8'))
  assert.strictEqual(manifest.types, 'index.d.ts')
  assert.strictEqual(manifest.main, 'index.js')
  for (const fixture of ['commonjs', 'default']) {
    fs.copyFileSync(path.join(root, 'test/types', `${fixture}.ts`), path.join(temporary, `${fixture}.ts`))
  }
  compile(temporary, true)
} finally {
  fs.rmSync(temporary, { recursive: true, force: true })
}
