const EventEmitter = require('events');

class SystemEmitter extends EventEmitter { }

// Create a singleton emitter instance
const systemEmitter = new SystemEmitter();

module.exports = systemEmitter;
