// Inserts one contiguous block of NEW keys after a named anchor line, in one translation file.
// Refuses unless the anchor matches exactly once and none of the new keys already exist — a
// translation file edited by several lanes at once is exactly where a silent duplicate lands.
const fs = require('fs');

function insert (file, anchor, block, keys) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split('\n');
  const hits = lines.reduce((acc, l, i) => (l.startsWith(anchor) ? acc.concat(i) : acc), []);
  if (hits.length !== 1) { throw new Error(file + ': anchor matched ' + hits.length + ' times'); }

  const already = keys.filter(k => new RegExp('^\\s*' + k + '\\s*:', 'm').test(text));
  if (already.length) { throw new Error(file + ': keys already present: ' + already.join(', ')); }

  lines.splice(hits[0] + 1, 0, block);
  fs.writeFileSync(file, lines.join('\n'));
  console.log(file + ': inserted ' + keys.length + ' keys after line ' + (hits[0] + 1));
}

module.exports = { insert };
