const http = require('http');

const request = (method, path, body = null, headers = {}) => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null, headers: res.headers }));
    });
    
    req.on('error', e => reject(e));
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

async function test() {
  try {
    console.log('--- Fetching CSRF Token ---');
    const csrfRes = await request('HEAD', '/sap/opu/odata/sap/API_EQUIPMENT/EquipmentCollection', null, { 'X-CSRF-Token': 'fetch' });
    const token = csrfRes.headers['x-csrf-token'];
    const cookie = csrfRes.headers['set-cookie'] ? csrfRes.headers['set-cookie'][0] : '';
    console.log('Token:', token);

    const headers = { 'X-CSRF-Token': token };
    if (cookie) headers['Cookie'] = cookie;

    console.log('\n--- Creating Equipment ---');
    const eq = await request('POST', '/sap/opu/odata/sap/API_EQUIPMENT/EquipmentCollection', {
      EquipmentName: 'Centrifugal Pump A1',
      EquipmentCategory: 'M',
      MaintenancePlant: '1000'
    }, headers);
    console.log('Create Equipment Status:', eq.status);
    console.log(eq.data);

    const eqId = eq.data.d ? eq.data.d.Equipment : eq.data.Equipment;

    console.log('\n--- Fetching Equipment Collection ---');
    const eqColl = await request('GET', '/sap/opu/odata/sap/API_EQUIPMENT/EquipmentCollection', null, headers);
    console.log('Get Equipments Status:', eqColl.status);
    console.log('Count:', eqColl.data['@odata.count']);

    console.log('\n--- Patching Equipment ---');
    const patchEq = await request('PATCH', `/sap/opu/odata/sap/API_EQUIPMENT/EquipmentCollection('${eqId}')`, {
      EquipmentName: 'Centrifugal Pump A1 - Patched'
    }, headers);
    console.log('Patch Equipment Status:', patchEq.status);
    console.log(patchEq.data);

    console.log('\n--- Fetching Single Equipment ---');
    const getSingle = await request('GET', `/sap/opu/odata/sap/API_EQUIPMENT/EquipmentCollection('${eqId}')`, null, headers);
    console.log('Get Single Equipment Status:', getSingle.status);

    console.log('\n--- Deleting Equipment ---');
    const delEq = await request('DELETE', `/sap/opu/odata/sap/API_EQUIPMENT/EquipmentCollection('${eqId}')`, null, headers);
    console.log('Delete Equipment Status:', delEq.status);

    console.log('\n--- Creating Functional Location ---');
    const fl = await request('POST', '/sap/opu/odata/sap/API_FUNCTIONALLOCATION/FunctionalLocationCollection', {
      FunctionalLocationName: 'Main Plant Building 1',
      MaintenancePlant: '1000'
    }, headers);
    console.log('Create FL Status:', fl.status);
    console.log(fl.data);

    const flId = fl.data.d ? fl.data.d.FunctionalLocation : fl.data.FunctionalLocation;

    console.log('\n--- Deleting Functional Location ---');
    const delFl = await request('DELETE', `/sap/opu/odata/sap/API_FUNCTIONALLOCATION/FunctionalLocationCollection('${flId}')`, null, headers);
    console.log('Delete FL Status:', delFl.status);
    if (delFl.status !== 204) console.log(delFl.data);

    console.log('\nAll tests completed.');
  } catch (err) {
    console.error('Test Failed:', err);
  }
}

test();
