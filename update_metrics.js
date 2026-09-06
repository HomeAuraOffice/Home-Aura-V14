const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');

appJs = appJs.replace(
`        const metrics = computed(() => {
          const filteredOrders = filterOrdersForDashboard(orders.value);
          const grossRevenue = filteredOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);`,
`        const metrics = computed(() => {
          const filteredOrders = filterOrdersForDashboard(orders.value);
          const grossRevenue = filteredOrders.reduce((acc, o) => {
            const total = o.totalAmount || 0;
            const deliveryExp = estimateSteadfastCharge(o);
            let codExp = 0;
            if (o.codCharge !== undefined && o.codCharge !== null && o.codCharge > 0) {
              codExp = Number(o.codCharge);
            } else {
              codExp = Math.round(total * 0.01);
            }
            return acc + (total - (deliveryExp + codExp));
          }, 0);`
);

fs.writeFileSync('app.js', appJs);
console.log('Fixed appJs metrics');
