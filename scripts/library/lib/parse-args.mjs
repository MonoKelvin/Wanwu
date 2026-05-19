/** @param {string[]} [argv] */
export function parseArgs(argv = process.argv.slice(2)) {
  const get = (key) => {
    const hit = argv.find((a) => a.startsWith(`${key}=`))
    return hit ? hit.slice(key.length + 1) : null
  }
  return {
    argv,
    force: argv.includes('--force'),
    full: argv.includes('--full'),
    limit: Number(get('--limit')) || 0,
    slug: get('--slug'),
    category: get('--category'),
    pack: get('--pack'),
    version: get('--version'),
    provider: get('--provider'),
    ids: argv.filter((a) => a.startsWith('--id=')).map((a) => a.slice(5))
  }
}
