const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 }); // TTL de 1 hora, check period de 10 minutos

module.exports = {
    get: (key) => cache.get(key),
    set: (key, value) => cache.set(key, value),
    del: (key) => cache.del(key),
    flush: () => cache.flushAll(),
};
