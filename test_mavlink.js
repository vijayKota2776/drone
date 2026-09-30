const { MavLinkPacketSplitter, MavLinkPacketParser } = require('node-mavlink');
const parser = new MavLinkPacketParser();
const splitter = new MavLinkPacketSplitter();
splitter.pipe(parser);
parser.on('data', (packet) => {
    console.log(packet);
});
// Fake MAVLink 1 packet for GLOBAL_POSITION_INT (msgid 33)
// FE 1C 00 01 01 21 [28 bytes payload] [2 bytes CRC]
const fakePacket = Buffer.from('FE1C00010121000000000000000000000000000000000000000000000000000000000000', 'hex');
splitter.write(fakePacket);
