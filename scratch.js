const { MavLinkPacketSplitter, MavLinkPacketParser } = require('node-mavlink');
const mappings = require('mavlink-mappings');
const REGISTRY = mappings.REGISTRY; // ?

console.log(Object.keys(require('node-mavlink')));
console.log(Object.keys(require('mavlink-mappings')).length);
