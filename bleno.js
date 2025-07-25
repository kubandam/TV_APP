const bleno = require('@abandonware/bleno');
const { Buffer } = require('buffer');

bleno.on('stateChange', state => {
  if (state === 'poweredOn') {
    bleno.startAdvertising('Samsung‑Fake', ['1800']);
  }
});

bleno.on('advertisingStart', () => {
  bleno.setServices([
    new bleno.PrimaryService({
      uuid: '1800',
      characteristics: [
        new bleno.Characteristic({
          uuid: '2a00', // Device Name
          properties: ['read'],
          onReadRequest: (offset, cb) =>
            cb(this.RESULT_SUCCESS, Buffer.from('Samsung‑Fake')),
        }),
      ],
    }),
  ]);
});
