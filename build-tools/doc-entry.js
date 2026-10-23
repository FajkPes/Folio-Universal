const WordExtractor = require('word-extractor');
const Buffer = require('buffer').Buffer;
// Match Node's UTF-16 handling: ignore an incomplete final code unit.
// OLE directory name lengths include a terminator; old browser Buffer versions
// otherwise append a NUL to stream names such as WordDocument.
const toString = Buffer.prototype.toString;
Buffer.prototype.toString = function(encoding,start=0,end=this.length) {
  if (/^(utf-?16le|ucs-?2)$/i.test(encoding||'')) end-= (end-start)%2;
  return toString.call(this,encoding,start,end);
};
module.exports = async function(bytes) {
  const doc = await new WordExtractor().extract(Buffer.from(bytes));
  return [doc.getBody(), doc.getFootnotes(), doc.getEndnotes()].filter(Boolean).join('\n\n');
};
