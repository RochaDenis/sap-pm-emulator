const db=require('../database');
const tbls=[
  'S4_FUNCTIONALLOCATION',
  'S4_EQUIPMENT',
  'S4_MAINTENANCENOTIFICATION',
  'S4_MAINTENANCEORDER',
  'S4_MAINTENANCEORDER_OPERATION',
  'S4_MAINTPLAN',
  'S4_MAINTPLAN_ITEM'
];
for (const t of tbls) {
  console.log(t, db.prepare('SELECT count(*) as c FROM '+t).get().c);
}
