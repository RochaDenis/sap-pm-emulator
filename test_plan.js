async function test() {
  try {
    const baseURL = 'http://localhost:3000/sap/opu/odata/sap/API_MAINTPLAN';
    
    // 1. Get CSRF Token
    const resGet = await fetch(`${baseURL}/MaintenancePlanCollection`, {
      method: 'GET',
      headers: { 'X-CSRF-Token': 'Fetch' }
    });
    
    const token = resGet.headers.get('x-csrf-token');
    const cookiesRaw = resGet.headers.get('set-cookie') || '';
    const cookies = cookiesRaw.split(', ').map(c => c.split(';')[0]).join('; ');

    const headers = {
        'X-CSRF-Token': token,
        'Cookie': cookies,
        'Content-Type': 'application/json'
    };

    console.log("--- CREATE MAINTENANCE PLAN ---");
    const planPayload = {
      MaintPlanDesc: "Test S/4 Plan",
      MaintenancePlant: "1000",
      CycleLength: 30,
      CycleUnit: "DAY"
    };
    
    const resCreate = await fetch(`${baseURL}/MaintenancePlanCollection`, {
        method: 'POST',
        headers,
        body: JSON.stringify(planPayload)
    });
    const createData = await resCreate.json();
    console.log("Created Status:", resCreate.status);
    console.log("Created Data:", JSON.stringify(createData));
    const planId = createData.d ? createData.d.MaintenancePlan : null;

    if (!planId) return;

    console.log("\n--- PATCH MAINTENANCE PLAN ---");
    const resPatch = await fetch(`${baseURL}/MaintenancePlanCollection('${planId}')`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ MaintPlanDesc: "Updated Plan" })
    });
    const patchData = await resPatch.json();
    console.log("Patched Status:", resPatch.status);
    console.log("Patched Data:", JSON.stringify(patchData));

    console.log("\n--- POST to_MaintenancePlanItem ---");
    // Get an equipment to use
    let equipId = '10000000'; // we will assume one exists, if it fails, we ignore for now,
    
    const resItem = await fetch(`${baseURL}/MaintenancePlanCollection('${planId}')/to_MaintenancePlanItem`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ TechnicalObject: equipId, MaintenanceItemDesc: "Item 1" })
    });
    const itemData = await resItem.json();
    console.log("Item Create Status:", resItem.status);
    if (resItem.status !== 201) console.log("Failed Item Create:", JSON.stringify(itemData));

    console.log("\n--- FUNCTION EMPORTS ---");
    const reqStart = await fetch(`${baseURL}/StartMaintPlnSchedule`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ MaintenancePlan: planId })
    });
    const startData = await reqStart.json();
    console.log("Start Schedule Status:", reqStart.status);
    console.log("NextPlannedDate:", startData.d ? startData.d.NextPlannedDate : 'err');

    const reqRestart = await fetch(`${baseURL}/RestartMaintPlnSchedule`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ MaintenancePlan: planId })
    });
    const restartData = await reqRestart.json();
    console.log("Restart Schedule Status:", reqRestart.status);
    console.log("NextPlannedDate:", restartData.d ? restartData.d.NextPlannedDate : 'err');

  } catch (error) {
     console.error("Test Error:", error);
  }
}

test();
