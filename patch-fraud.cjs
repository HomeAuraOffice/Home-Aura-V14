const fs = require('fs');
let appCode = fs.readFileSync('app.js', 'utf8');

// 1. Remove the auto-fetch from syncPullData and loadLocalData
appCode = appCode.replace(/fetchFraudCheckForOrders\(orders\.value\);/g, '// fetchFraudCheckForOrders(orders.value);');

// 2. Add local storage persistence to fraudCheckMap
appCode = appCode.replace(
  /const fraudCheckMap = ref\(\{\}\);/g,
  `const storedFraud = localStorage.getItem('homeaura_fraud_cache');
        const fraudCheckMap = ref(storedFraud ? JSON.parse(storedFraud) : {});
        watch(fraudCheckMap, (newVal) => {
          localStorage.setItem('homeaura_fraud_cache', JSON.stringify(newVal));
        }, { deep: true });`
);

fs.writeFileSync('app.js', appCode);
