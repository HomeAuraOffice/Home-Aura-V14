    const { createApp, ref, reactive, computed, onMounted, watch } = Vue;

    createApp({
      setup() {
  try {

        // --- 8-STAGE WORKFLOW PIPELINE ---
        
        // --- INDEXEDDB IMAGE CACHE ---
        const DB_NAME = 'HomeAura_ImagesDB';
        const STORE_NAME = 'images';

        const initDB = () => {
          return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);
            request.onerror = (e) => reject(e);
            request.onsuccess = (e) => resolve(e.target.result);
            request.onupgradeneeded = (e) => {
              const db = e.target.result;
              if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
              }
            };
          });
        };

        const saveImageToIDB = async (url, blob) => {
          if (!url || !blob || url.startsWith('blob:') || url.startsWith('data:')) return;
          try {
            const db = await initDB();
            return new Promise((resolve, reject) => {
              const tx = db.transaction(STORE_NAME, 'readwrite');
              const store = tx.objectStore(STORE_NAME);
              const request = store.put(blob, url);
              request.onsuccess = () => resolve();
              request.onerror = (e) => reject(e);
            });
          } catch (e) {
            console.warn('IDB Save Error:', e);
          }
        };

        const getImageFromIDB = async (url) => {
          if (!url || url.startsWith('blob:') || url.startsWith('data:')) return null;
          try {
            const db = await initDB();
            return new Promise((resolve, reject) => {
              const tx = db.transaction(STORE_NAME, 'readonly');
              const store = tx.objectStore(STORE_NAME);
              const request = store.get(url);
              request.onsuccess = (e) => resolve(e.target.result);
              request.onerror = (e) => reject(e);
            });
          } catch(e) {
            console.warn('IDB Get Error:', e);
            return null;
          }
        };

        const syncImagesToLocal = async () => {
          // Disabled intentionally because blob: URLs were causing issues for the user.
          // Now we rely on /api/proxy which works consistently.
        };

        const pipelineStages = [
          'Confirmation Call',
          'Courier Booking',
          'Factory Submit'
        ];

        // --- SEEDING DEFAULT USERS ---
        const defaultUsers = [];

        // --- SEEDING DEFAULT FACTORIES ---
        const defaultFactories = [];

        const sampleCollagePresets = [
          { name: 'Royal Velvet Sofa', url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80' },
          { name: 'Modern Leatherette', url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80' },
          { name: 'Minimalist Dining', url: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=600&q=80' },
          { name: 'Chesterfield Armchair', url: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=600&q=80' }
        ];

        // --- EMPTY INITIAL BOOTSTRAP ORDERS (DATA LOADS FROM GOOGLE SHEETS) ---
        const defaultOrders = [];

        const defaultCategories = ['L-Shape Sofa', 'Sofa Set', 'Recliner Chair', 'Dining Table', 'Custom Bed', 'Living Room Accessories'];
        const defaultFabrics = ['Velvet', 'PU Leather', 'Jute', 'Cotton', 'Linen'];

        // --- BANGLADESH TIME UTILITIES (Asia/Dhaka, UTC+6) ---
        const getBangladeshDate = (dateInput = new Date()) => {
          if (!dateInput) dateInput = new Date();
          const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
          if (isNaN(d.getTime())) return new Date();
          const dhakaStr = d.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' });
          return new Date(dhakaStr);
        };

        const getBangladeshTimeString = (dateInput = new Date()) => {
          const d = getBangladeshDate(dateInput);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const hours = String(d.getHours()).padStart(2, '0');
          const minutes = String(d.getMinutes()).padStart(2, '0');
          return `${year}-${month}-${day} ${hours}:${minutes}`;
        };

        const getBangladeshTimestamp = (dateInput = new Date()) => {
          const d = getBangladeshDate(dateInput);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const hours = String(d.getHours()).padStart(2, '0');
          const minutes = String(d.getMinutes()).padStart(2, '0');
          const seconds = String(d.getSeconds()).padStart(2, '0');
          return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        };

        const getBangladeshDateString = (dateInput = new Date()) => {
          const d = getBangladeshDate(dateInput);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        const getBstIsoString = (dateInput = new Date()) => {
          const d = new Date(dateInput);
          if (isNaN(d.getTime())) return getBstIsoString();
          const pad = (n) => String(n).padStart(2, '0');
          const dhakaStr = d.toLocaleString('en-US', { timeZone: 'Asia/Dhaka', hour12: false });
          const dhakaDate = new Date(dhakaStr);
          const year = dhakaDate.getFullYear();
          const month = pad(dhakaDate.getMonth() + 1);
          const day = pad(dhakaDate.getDate());
          const hours = pad(dhakaDate.getHours());
          const minutes = pad(dhakaDate.getMinutes());
          const seconds = pad(dhakaDate.getSeconds());
          return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+06:00`;
        };

        const getBstDateString = (isoOrDate) => { if (!isoOrDate) return ''; const d = new Date(isoOrDate); if (isNaN(d.getTime())) return ''; return new Date(d.getTime() + (6 * 60 * 60 * 1000)).toISOString().split('T')[0]; };
        
        const formatBangladeshDisplayTime = (isoOrDate) => {
          if (!isoOrDate) return 'N/A';
          try {
            const d = new Date(isoOrDate);
            if (isNaN(d.getTime())) return String(isoOrDate);
            return d.toLocaleString('en-GB', {
              timeZone: 'Asia/Dhaka',
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }) + ' BST';
          } catch(e) {
            return String(isoOrDate);
          }
        };

        const getBangladeshClockString = () => {
          const now = new Date();
          return now.toLocaleString('en-GB', {
            timeZone: 'Asia/Dhaka',
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          }) + ' BST';
        };

        const bangladeshTimeDisplay = ref(getBangladeshClockString());
        setInterval(() => {
          bangladeshTimeDisplay.value = getBangladeshClockString();
        }, 1000);

        // --- REACTIVE STATE MANAGEMENT ---
        const users = ref([]);
        const orders = ref([]);
        const deletedOrders = ref([]);
        const selectedOrders = ref(new Set());
        const categories = ref([]);
        const fabrics = ref([]);
        const newFabricName = ref('');
        const factories = ref([]);
        const factoryBills = ref([]);
        const expenses = ref([]);
        const marketingSpends = ref([]);
        const marketingSpendFilterDate = ref(new Date().toISOString().split('T')[0]);
        const tasks = ref([]);
        const notifications = ref([]);
        const currentUser = ref(null);
        const isUserOnline = (timeStr) => {
          if (!timeStr) return false;
          return (Date.now() - new Date(timeStr).getTime()) < 5 * 60000;
        };

        // --- STEADFAST FRAUD CHECK ENGINE (TOP-LEVEL INITIALIZATION) ---
        const storedFraud = localStorage.getItem('homeaura_fraud_cache');
        let parsedFraud = {};
        try {
          if (storedFraud) parsedFraud = JSON.parse(storedFraud);
        } catch (e) {
          parsedFraud = {};
        }
        const fraudCheckMap = ref(parsedFraud || {});
        watch(fraudCheckMap, (newVal) => {
          try {
            localStorage.setItem('homeaura_fraud_cache', JSON.stringify(newVal));
          } catch (e) {}
        }, { deep: true });
        const fraudLoadingMap = ref({});

        const normalizeCustomerPhone = (rawPhone) => {
          if (rawPhone === undefined || rawPhone === null) return '';
          let str = String(rawPhone).trim();
          // Convert Bengali digits (০-৯) to English digits (0-9)
          const bnToEn = { '০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9' };
          str = str.replace(/[০-৯]/g, d => bnToEn[d] || d);
          
          let digits = str.replace(/\D/g, '');
          if (digits.startsWith('880') && digits.length >= 13) {
            digits = digits.slice(2);
          } else if (digits.startsWith('880')) {
            digits = digits.slice(2);
          } else if (digits.startsWith('88') && digits.length >= 13) {
            digits = digits.slice(2);
          }

          if (digits.length === 10 && digits.startsWith('1')) {
            digits = '0' + digits;
          }
          if (digits.length > 0 && !digits.startsWith('0') && digits.length <= 10) {
            digits = '0' + digits;
          }
          return digits;
        };

        const isFraudLoading = (orderOrPhone) => {
          const phone = typeof orderOrPhone === 'object' ? (orderOrPhone?.customerPhone || '') : orderOrPhone;
          const norm = normalizeCustomerPhone(phone);
          if (!norm) return false;
          return !!fraudLoadingMap.value[norm];
        };

        const getFraudData = (orderOrPhone) => {
          const phone = typeof orderOrPhone === 'object' ? (orderOrPhone?.customerPhone || '') : orderOrPhone;
          const norm = normalizeCustomerPhone(phone);
          if (norm && fraudCheckMap.value[norm]) {
            return fraudCheckMap.value[norm];
          }
          if (typeof orderOrPhone === 'object' && orderOrPhone && orderOrPhone.fraudData) {
            let f = orderOrPhone.fraudData;
            if (typeof f === 'string') {
              try { f = JSON.parse(f); } catch (e) {}
            }
            if (f && typeof f === 'object') {
              if (norm) fraudCheckMap.value[norm] = f;
              return f;
            }
          }
          return null;
        };

        const getFraudBadgeInfo = (orderOrPhone) => {
          const phone = typeof orderOrPhone === 'object' ? (orderOrPhone?.customerPhone || '') : orderOrPhone;
          const norm = normalizeCustomerPhone(phone);
          if (!norm || norm.length < 8) {
            return {
              label: 'No Phone',
              shortLabel: 'No Phone',
              riskLevel: 'none',
              tagClass: 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700',
              dotClass: 'bg-slate-300 dark:bg-slate-600',
              parcelsText: 'No phone provided',
              stats: 'Cannot verify'
            };
          }

          if (isFraudLoading(orderOrPhone)) {
            return {
              label: 'Checking...',
              shortLabel: 'Checking...',
              riskLevel: 'loading',
              tagClass: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-850 animate-pulse',
              dotClass: 'bg-indigo-500 animate-ping',
              parcelsText: 'Scanning Steadfast...',
              stats: 'Querying Steadfast network'
            };
          }

          const data = getFraudData(orderOrPhone);
          if (!data) {
            return {
              label: 'Fraud Check',
              shortLabel: 'Scan',
              riskLevel: 'untested',
              tagClass: 'bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 hover:bg-indigo-100 dark:hover:bg-indigo-900/60',
              dotClass: 'bg-indigo-400',
              parcelsText: 'Click to scan Steadfast',
              stats: 'Not yet scanned'
            };
          }

          if (!data.success && data.error) {
            return {
              label: 'SFC Error',
              shortLabel: 'Error',
              riskLevel: 'error',
              tagClass: 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700',
              dotClass: 'bg-slate-400',
              parcelsText: (typeof data.error === 'string' ? data.error : JSON.stringify(data.error)).includes('Rate limit') ? 'API Limit Exceeded' : ((typeof data.error === 'string' ? data.error : JSON.stringify(data.error)).includes('Unauthorized') ? 'Invalid API Key' : 'SFC API unreachable'),
              stats: typeof data.error === 'string' ? data.error : JSON.stringify(data.error)
            };
          }

          const totalParcels = data.totalParcels !== undefined ? data.totalParcels : 0;
          const totalDelivered = data.totalDelivered !== undefined ? data.totalDelivered : 0;
          const totalCancelled = data.totalCancelled !== undefined ? data.totalCancelled : 0;
          const fraudReports = Array.isArray(data.fraudReports) ? data.fraudReports : [];
          const deliveryRate = data.deliveryRate !== undefined ? data.deliveryRate : 0;

          if (fraudReports.length > 0) {
            return {
              label: `🚨 Fraud Alert (${fraudReports.length})`,
              shortLabel: `🚨 Fraud (${fraudReports.length})`,
              riskLevel: 'fraud',
              tagClass: 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700 font-extrabold shadow-2xs',
              dotClass: 'bg-rose-600 animate-pulse',
              parcelsText: `${totalDelivered}/${totalParcels} delivered (${totalCancelled} ret)`,
              stats: `Alert: ${fraudReports.length} fraud reports recorded on SFC`
            };
          }

          if (totalParcels === 0) {
            return {
              label: 'New Customer (0)',
              shortLabel: 'New (0)',
              riskLevel: 'new',
              tagClass: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700',
              dotClass: 'bg-slate-400',
              parcelsText: '0 Steadfast parcels recorded',
              stats: 'Clean / First-time buyer on Steadfast'
            };
          }

          if (deliveryRate >= 80) {
            return {
              label: `✓ Reliable (${deliveryRate}%)`,
              shortLabel: `✓ ${deliveryRate}% (${totalDelivered}/${totalParcels})`,
              riskLevel: 'low',
              tagClass: 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 shadow-2xs',
              dotClass: 'bg-emerald-500',
              parcelsText: `${totalDelivered} of ${totalParcels} delivered (${totalCancelled} returned)`,
              stats: `${deliveryRate}% success rate across ${totalParcels} parcels`
            };
          }

          if (deliveryRate >= 50) {
            return {
              label: `⚠️ Moderate (${deliveryRate}%)`,
              shortLabel: `⚠️ ${deliveryRate}% (${totalDelivered}/${totalParcels})`,
              riskLevel: 'medium',
              tagClass: 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60 shadow-2xs',
              dotClass: 'bg-amber-500',
              parcelsText: `${totalDelivered} of ${totalParcels} delivered (${totalCancelled} returned)`,
              stats: `${deliveryRate}% success rate (${totalCancelled} returned parcels)`
            };
          }

          return {
            label: `⚠️ High Risk (${deliveryRate}%)`,
            shortLabel: `⚠️ Risk ${deliveryRate}% (${totalDelivered}/${totalParcels})`,
            riskLevel: 'high',
            tagClass: 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/60 shadow-2xs',
            dotClass: 'bg-rose-500 animate-pulse',
            parcelsText: `${totalDelivered} of ${totalParcels} delivered (${totalCancelled} returned)`,
            stats: `High cancellation rate: ${totalCancelled} out of ${totalParcels} parcels returned`
          };
        };

        const fetchFraudCheck = async (orderOrPhone, force = false) => {
          const phone = typeof orderOrPhone === 'object' ? (orderOrPhone?.customerPhone || '') : orderOrPhone;
          const norm = normalizeCustomerPhone(phone);
          if (!norm || norm.length < 8) return null;

          if (fraudLoadingMap.value[norm]) return;
          if (!force && fraudCheckMap.value[norm] && fraudCheckMap.value[norm].success) return fraudCheckMap.value[norm];

          fraudLoadingMap.value[norm] = true;
          try {
            let data = null;
            // 1. Primary: Server Proxy Route
            try {
              const res = await fetch(`/api/steadfast/fraud-check/${encodeURIComponent(norm)}`);
              if (res.ok) {
                data = await res.json();
              }
            } catch (proxyErr) {
              console.warn('[SFC Proxy Error, trying direct fallback]', proxyErr);
            }

            // 2. Secondary Direct Fallback if server proxy is unavailable
            if (!data || !data.success) {
              try {
                const directRes = await fetch(`https://portal.packzy.com/api/v1/fraud_check/${encodeURIComponent(norm)}`, {
                  headers: {
                    'Api-Key': 'lhigcp1yxdqrcdtmhth0cvdekae3c8u2',
                    'Secret-Key': '7ksaufrn6qqjhxpk0prsugls',
                    'Content-Type': 'application/json'
                  }
                });
                if (directRes.ok) {
                  const json = await directRes.json();
                  const totalParcels = Number(json.total_parcels) || 0;
                  const totalDelivered = Number(json.total_delivered) || 0;
                  const totalCancelled = Number(json.total_cancelled) || 0;
                  const fraudReports = Array.isArray(json.total_fraud_reports) ? json.total_fraud_reports : [];
                  const deliveryRate = totalParcels > 0 ? Math.round((totalDelivered / totalParcels) * 100) : 0;
                  const cancelRate = totalParcels > 0 ? Math.round((totalCancelled / totalParcels) * 100) : 0;

                  let riskLevel = 'new';
                  let riskLabel = 'New Customer';
                  if (fraudReports.length > 0) {
                    riskLevel = 'fraud';
                    riskLabel = `Fraud Alert (${fraudReports.length})`;
                  } else if (totalParcels > 0) {
                    if (deliveryRate >= 80) {
                      riskLevel = 'low';
                      riskLabel = `Reliable (${deliveryRate}%)`;
                    } else if (deliveryRate >= 50) {
                      riskLevel = 'medium';
                      riskLabel = `Moderate (${deliveryRate}%)`;
                    } else {
                      riskLevel = 'high';
                      riskLabel = `High Risk (${deliveryRate}%)`;
                    }
                  }

                  data = {
                    success: true,
                    phone: norm,
                    rawPhone: phone,
                    totalParcels,
                    totalDelivered,
                    totalCancelled,
                    deliveryRate,
                    cancelRate,
                    fraudReports,
                    riskLevel,
                    riskLabel,
                    timestamp: new Date().toISOString()
                  };
                }
              } catch (directErr) {
                console.warn('[SFC Direct Fallback Error]', directErr);
              }
            }

            if (data) {
              fraudCheckMap.value[norm] = data;
              try {
                localStorage.setItem('homeaura_fraud_cache', JSON.stringify(fraudCheckMap.value));
              } catch (e) {}

              // Update any orders in local state with this phone & broadcast to Google Sheets
              let orderChanged = false;
              orders.value.forEach(o => {
                if (normalizeCustomerPhone(o.customerPhone) === norm) {
                  o.fraudData = data;
                  o.fraudStatus = data.riskLabel;
                  if (typeof queueChange === 'function') queueChange('orders', o);
                  orderChanged = true;
                }
              });
              if (orderChanged) {
                if (typeof saveOrdersLocally === 'function') saveOrdersLocally();
                if (typeof triggerAutoSync === 'function') triggerAutoSync();
              }
              return data;
            }
          } catch (err) {
            console.warn('[Fraud Check Fetch Error]', err);
          } finally {
            fraudLoadingMap.value[norm] = false;
          }
        };

        const fetchFraudCheckForOrders = async (ordersList) => {
          const listWithPhone = (ordersList || []).filter(o => o && o.customerPhone && normalizeCustomerPhone(o.customerPhone));
          if (listWithPhone.length === 0) return;

          // Query items that are either unscanned or cached older than 4 hours
          const itemsToQuery = listWithPhone.filter(o => {
            const p = normalizeCustomerPhone(o.customerPhone);
            const cached = fraudCheckMap.value[p];
            if (!cached || !cached.success) return true;
            if (!cached.timestamp) return true;
            const ageMs = Date.now() - new Date(cached.timestamp).getTime();
            return ageMs > 4 * 3600 * 1000;
          }).map(o => ({
            id: o.id,
            phone: normalizeCustomerPhone(o.customerPhone)
          }));

          if (itemsToQuery.length === 0) return;

          try {
            const res = await fetch('/api/steadfast/bulk-fraud-check', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items: itemsToQuery })
            });
            if (res.ok) {
              const data = await res.json();
              if (data && data.results) {
                let anyChanged = false;
                Object.keys(data.results).forEach(orderId => {
                  const resObj = data.results[orderId];
                  if (resObj && resObj.phone) {
                    fraudCheckMap.value[resObj.phone] = resObj;
                    orders.value.forEach(o => {
                      if (o.id === orderId || normalizeCustomerPhone(o.customerPhone) === resObj.phone) {
                        o.fraudData = resObj;
                        o.fraudStatus = resObj.riskLabel;
                        if (typeof queueChange === 'function') queueChange('orders', o);
                        anyChanged = true;
                      }
                    });
                  }
                });
                try {
                  localStorage.setItem('homeaura_fraud_cache', JSON.stringify(fraudCheckMap.value));
                } catch (e) {}
                if (anyChanged) {
                  if (typeof saveOrdersLocally === 'function') saveOrdersLocally();
                  if (typeof triggerAutoSync === 'function') triggerAutoSync();
                }
              }
            }
          } catch (err) {
            console.warn('[Fraud Check Bulk Error]', err);
          }
        };

        const openFraudDetailModal = (orderOrPhone) => {
          const phone = typeof orderOrPhone === 'object' ? (orderOrPhone?.customerPhone || '') : orderOrPhone;
          const norm = normalizeCustomerPhone(phone);
          const orderObj = typeof orderOrPhone === 'object' ? orderOrPhone : orders.value.find(o => normalizeCustomerPhone(o.customerPhone) === norm);
          
          modalData.title = `Steadfast Fraud & Reliability Assessment`;
          modalData.fraud = {
            phone: norm,
            rawPhone: phone,
            order: orderObj || null,
            data: getFraudData(phone) || null
          };
          activeModal.value = 'fraudModal';

          fetchFraudCheck(phone, false).then(d => {
            if (d && modalData.fraud) {
              modalData.fraud.data = d;
            }
          });
        };

        const refreshModalFraudCheck = async () => {
          if (!modalData.fraud || !modalData.fraud.phone) return;
          const res = await fetchFraudCheck(modalData.fraud.phone, true);
          if (res && modalData.fraud) {
            modalData.fraud.data = res;
          }
        };
        
        // --- ADVANCED TASK & REMINDERS STATE MANAGEMENT ---
        const newTask = reactive({
          title: '',
          description: '',
          assigneeRole: 'all',
          assigneeId: '',
          assigneeIds: [],
          hasReminder: false,
          reminderAt: '',
          isDaily: false,
          priority: 'normal'
        });

        const taskFilter = ref('all'); // 'all' | 'pending_48h' | 'reminders' | 'daily' | 'completed'
        const taskSearch = ref('');
        const taskReminderModal = reactive({
          isOpen: false,
          task: null,
          reminderAt: ''
        });

        // Bangladesh Time helpers for tasks
        const getBstTodayString = () => {
          const d = getBangladeshDate();
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        const isTaskPendingForUser = (t, user) => {
          if (!user || !t) return false;
          
          // Check if assigned to user
          let isAssigned = false;
          if (t.assigneeId === user.id) {
            isAssigned = true;
          } else if (Array.isArray(t.assigneeIds) && t.assigneeIds.length > 0 && t.assigneeIds.includes(user.id)) {
            isAssigned = true;
          } else if ((!t.assigneeIds || t.assigneeIds.length === 0) && (!t.assigneeId || t.assigneeId === '')) {
            if (t.assigneeRole === user.role || t.assigneeRole === 'all') {
              isAssigned = true;
            }
          } else if (t.assigneeRole === 'all' && (!t.assigneeId || t.assigneeId === '')) {
            isAssigned = true;
          }

          if (!isAssigned) return false;

          // 1. Daily recurring task logic: check if completed for TODAY (BST)
          if (t.isDaily) {
            const todayStr = getBstTodayString();
            if (t.dailyCompletions && t.dailyCompletions[todayStr] && t.dailyCompletions[todayStr].includes(user.id)) {
              return false; // Already completed for today
            }
            return true; // Pending for today!
          }

          // 2. Standard task logic
          if (t.completedByUsers && t.completedByUsers.includes(user.id)) return false;
          
          if (t.assigneeId && t.assigneeId !== '' && (!t.assigneeIds || t.assigneeIds.length <= 1)) {
            return t.status === 'pending';
          } else {
            if (t.status === 'completed' && (!t.completedByUsers || t.completedByUsers.length === 0)) {
               return false;
            }
            return true;
          }
        };

        const getTaskCompletedByNames = (task) => {
          if (!task) return 'Unknown';
          if (task.isDaily) {
            const todayStr = getBstTodayString();
            const todayCompleted = (task.dailyCompletions && task.dailyCompletions[todayStr]) || [];
            if (todayCompleted.length > 0) {
              const names = todayCompleted.map(id => {
                const u = users.value.find(user => user.id === id);
                return u ? (u.name || u.username) : 'Unknown';
              });
              return names.join(', ');
            }
            if (task.lastCompletedBy) return task.lastCompletedBy;
            return 'Pending Today';
          }
          if (task.completedByUsers && task.completedByUsers.length > 0) {
            const names = task.completedByUsers.map(id => {
              const u = users.value.find(user => user.id === id);
              return u ? (u.name || u.username) : 'Unknown';
            });
            return names.join(', ');
          }
          if (task.completedBy) return task.completedBy;
          return 'Unknown';
        };

        const isTaskCompletedForUser = (t, user) => {
          if (!user || !t) return false;
          
          let isAssigned = false;
          if (t.assigneeId === user.id) {
            isAssigned = true;
          } else if (Array.isArray(t.assigneeIds) && t.assigneeIds.length > 0 && t.assigneeIds.includes(user.id)) {
            isAssigned = true;
          } else if ((!t.assigneeIds || t.assigneeIds.length === 0) && (!t.assigneeId || t.assigneeId === '')) {
            if (t.assigneeRole === user.role || t.assigneeRole === 'all') {
              isAssigned = true;
            }
          } else if (t.assigneeRole === 'all' && (!t.assigneeId || t.assigneeId === '')) {
            isAssigned = true;
          }

          if (!isAssigned) return false;

          // 1. Daily recurring task check for today
          if (t.isDaily) {
            const todayStr = getBstTodayString();
            return Boolean(t.dailyCompletions && t.dailyCompletions[todayStr] && t.dailyCompletions[todayStr].includes(user.id));
          }

          // 2. Standard task check
          if (t.completedByUsers && t.completedByUsers.includes(user.id)) return true;
          
          if (t.assigneeId && t.assigneeId !== '' && (!t.assigneeIds || t.assigneeIds.length <= 1)) {
            return t.status === 'completed';
          } else {
            if (t.status === 'completed' && (!t.completedByUsers || t.completedByUsers.length === 0)) {
               return true;
            }
            return false;
          }
        };

        const markTaskDone = (task) => {
          if (!task) return;
          const todayBst = getBstTodayString();
          const userName = currentUser.value?.name || currentUser.value?.username || 'Unknown';

          if (task.isDaily) {
            // Record today's completion for daily task
            if (!task.dailyCompletions) task.dailyCompletions = {};
            if (!task.dailyCompletions[todayBst]) task.dailyCompletions[todayBst] = [];
            if (currentUser.value && !task.dailyCompletions[todayBst].includes(currentUser.value.id)) {
              task.dailyCompletions[todayBst].push(currentUser.value.id);
            }
            task.lastCompletedAt = getBstIsoString();
            task.lastCompletedDate = todayBst;
            task.lastCompletedBy = userName;
          } else {
            if (!task.completedByUsers) task.completedByUsers = [];
            if (currentUser.value && !task.completedByUsers.includes(currentUser.value.id)) {
              task.completedByUsers.push(currentUser.value.id);
            }
            
            if (task.assigneeId && task.assigneeId !== '' && (!task.assigneeIds || task.assigneeIds.length <= 1)) {
              task.status = 'completed';
              task.completedAt = getBstIsoString();
              task.completedBy = userName;
            } else {
              task.completedAt = getBstIsoString();
              task.completedBy = userName;
            }
          }
          
          syncQueue.value.changes.tasks = syncQueue.value.changes.tasks || {};
          queueChange('tasks', task);
          localStorage.setItem('homeaura_tasks', JSON.stringify(tasks.value));
          saveSyncQueue();
        };

        // Create Task with Reminders and Daily Repeat options
        const createNewTask = () => {
          if (!newTask.title) return;
          const taskId = 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
          
          let formattedReminder = '';
          if (newTask.hasReminder && newTask.reminderAt) {
            formattedReminder = newTask.reminderAt;
          }

          const createdTask = {
            id: taskId,
            title: newTask.title.trim(),
            description: newTask.description ? newTask.description.trim() : '',
            status: 'pending',
            assigneeRole: newTask.assigneeRole,
            assigneeId: newTask.assigneeId || '',
            assigneeIds: Array.isArray(newTask.assigneeIds) ? [...newTask.assigneeIds] : [],
            isDaily: Boolean(newTask.isDaily),
            dailyCompletions: newTask.isDaily ? {} : undefined,
            hasReminder: Boolean(formattedReminder),
            reminderAt: formattedReminder || '',
            priority: newTask.priority || 'normal',
            createdAt: getBstIsoString(),
            createdBy: currentUser.value?.username || 'admin'
          };

          tasks.value.unshift(createdTask);
          syncQueue.value.changes.tasks = syncQueue.value.changes.tasks || {};
          queueChange('tasks', createdTask);
          localStorage.setItem('homeaura_tasks', JSON.stringify(tasks.value));
          saveSyncQueue();

          // Reset form
          newTask.title = '';
          newTask.description = '';
          newTask.assigneeRole = 'all';
          newTask.assigneeId = '';
          newTask.assigneeIds = [];
          newTask.hasReminder = false;
          newTask.reminderAt = '';
          newTask.isDaily = false;
          newTask.priority = 'normal';
        };

        // Reminder Presets and Quick Actions
        const setNewTaskReminderPreset = (preset) => {
          newTask.hasReminder = true;
          const now = new Date();
          if (preset === '1h') {
            const d = new Date(now.getTime() + 60 * 60 * 1000);
            newTask.reminderAt = getBstIsoString(d).slice(0, 16);
          } else if (preset === '3h') {
            const d = new Date(now.getTime() + 3 * 60 * 60 * 1000);
            newTask.reminderAt = getBstIsoString(d).slice(0, 16);
          } else if (preset === 'tomorrow_10am') {
            const d = getBangladeshDate();
            d.setDate(d.getDate() + 1);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            newTask.reminderAt = `${yyyy}-${mm}-${dd}T10:00`;
          } else if (preset === 'tomorrow_3pm') {
            const d = getBangladeshDate();
            d.setDate(d.getDate() + 1);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            newTask.reminderAt = `${yyyy}-${mm}-${dd}T15:00`;
          } else if (preset === '2d') {
            const d = getBangladeshDate();
            d.setDate(d.getDate() + 2);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            newTask.reminderAt = `${yyyy}-${mm}-${dd}T10:00`;
          }
        };

        const getTaskReminderInfo = (task) => {
          if (!task || !task.reminderAt) return null;
          try {
            const reminderTime = new Date(task.reminderAt).getTime();
            if (isNaN(reminderTime)) return null;
            const now = Date.now();
            const isDue = reminderTime <= now;
            const diffMinutes = Math.round(Math.abs(reminderTime - now) / 60000);
            const diffHours = Math.round(diffMinutes / 60);

            let relativeStr = '';
            if (isDue) {
              if (diffMinutes < 1) relativeStr = 'Due just now';
              else if (diffMinutes < 60) relativeStr = `Overdue by ${diffMinutes}m`;
              else if (diffHours < 24) relativeStr = `Overdue by ${diffHours}h`;
              else relativeStr = `Overdue by ${Math.round(diffHours / 24)}d`;
            } else {
              if (diffMinutes < 60) relativeStr = `Due in ${diffMinutes}m`;
              else if (diffHours < 24) relativeStr = `Due in ${diffHours}h`;
              else relativeStr = `Due in ${Math.round(diffHours / 24)}d`;
            }

            return {
              isDue,
              reminderAt: task.reminderAt,
              formatted: formatBangladeshDisplayTime(task.reminderAt),
              relative: relativeStr
            };
          } catch (e) {
            return null;
          }
        };

        const activeDueReminders = computed(() => {
          if (!currentUser.value) return [];
          return tasks.value.filter(t => {
            if (!isTaskPendingForUser(t, currentUser.value)) return false;
            const info = getTaskReminderInfo(t);
            return info && info.isDue;
          });
        });

        const openTaskReminderModal = (task) => {
          taskReminderModal.task = task;
          taskReminderModal.reminderAt = task.reminderAt ? task.reminderAt.slice(0, 16) : '';
          taskReminderModal.isOpen = true;
          activeModal.value = 'taskReminderModal';
        };

        const saveTaskReminderModal = () => {
          if (taskReminderModal.task) {
            setTaskReminder(taskReminderModal.task, taskReminderModal.reminderAt);
          }
          taskReminderModal.isOpen = false;
          closeModal();
        };

        const setTaskReminder = (task, reminderAt) => {
          if (!task) return;
          task.reminderAt = reminderAt || '';
          task.hasReminder = Boolean(reminderAt);
          queueChange('tasks', task);
          localStorage.setItem('homeaura_tasks', JSON.stringify(tasks.value));
          saveSyncQueue();
        };

        const snoozeTaskReminder = (task, hours = 1) => {
          if (!task) return;
          const d = new Date(Date.now() + hours * 3600000);
          task.reminderAt = getBstIsoString(d).slice(0, 16);
          task.hasReminder = true;
          queueChange('tasks', task);
          localStorage.setItem('homeaura_tasks', JSON.stringify(tasks.value));
          saveSyncQueue();
        };

        const clearTaskReminder = (task) => {
          if (!task) return;
          task.reminderAt = '';
          task.hasReminder = false;
          queueChange('tasks', task);
          localStorage.setItem('homeaura_tasks', JSON.stringify(tasks.value));
          saveSyncQueue();
        };

        const toggleTaskDaily = (task) => {
          if (!task) return;
          task.isDaily = !task.isDaily;
          if (task.isDaily && !task.dailyCompletions) {
            task.dailyCompletions = {};
          }
          queueChange('tasks', task);
          localStorage.setItem('homeaura_tasks', JSON.stringify(tasks.value));
          saveSyncQueue();
        };

        const deleteTask = (task) => {
          if (!task) return;
          if (!confirm(`Are you sure you want to delete task "${task.title}"?`)) return;
          const idx = tasks.value.findIndex(t => t.id === task.id);
          if (idx !== -1) {
            tasks.value.splice(idx, 1);
            queueDelete('tasks', task.id);
            localStorage.setItem('homeaura_tasks', JSON.stringify(tasks.value));
            saveSyncQueue();
          }
        };

        const openOrderFromTask = (task) => {
          if (!task || !task.orderId) return;
          const ord = orders.value.find(o => o.id === task.orderId || o.orderId === task.orderId || o.cnNumber === task.orderId);
          if (ord) {
            editOrder(ord);
          } else {
            activeTab.value = (currentUser.value?.role === 'admin' || currentUser.value?.role === 'moderator' || currentUser.value?.role === 'marketer') ? 'dashboard' : 'myOrders';
            orderSearch.value = task.orderNumber || task.orderId;
          }
        };

        // --- AUTOMATED 48H PENDING ORDER TASK DETECTOR & ASSIGNMENT ---
        const isOrderStuckPending48h = (order) => {
          if (!order) return false;
          const status = (order.status || '').trim();
          // Check for all pending stage names
          const isPendingStatus = (
            status === 'Pending' ||
            status === 'Confirmation Call' ||
            status === 'Courier Pending' ||
            status.toLowerCase().includes('pending')
          );
          if (!isPendingStatus) return false;

          const timeStr = order.createdAt || order.timestamp || order.date || order.updatedAt;
          if (!timeStr) return false;
          const orderTime = new Date(timeStr).getTime();
          if (isNaN(orderTime)) return false;

          const fortyEightHoursMs = 48 * 60 * 60 * 1000;
          return (Date.now() - orderTime) >= fortyEightHoursMs;
        };

        const checkAndAssignPending48hTasks = () => {
          const now = Date.now();
          let changed = false;

          // 1. Scan active orders for stuck >= 48h pending orders
          orders.value.forEach(order => {
            if (isOrderStuckPending48h(order)) {
              const timeStr = order.createdAt || order.timestamp || order.date || order.updatedAt;
              const orderTime = new Date(timeStr).getTime();
              const elapsedHours = Math.floor((now - orderTime) / (3600 * 1000));
              const taskId = 'auto_pending_48h_' + order.id;

              // Find assigned seller/merchant
              let targetUserId = '';
              let targetRole = 'seller';
              let targetAssigneeIds = [];

              if (order.merchantId) {
                targetUserId = order.merchantId;
              } else if (order.sellerId) {
                targetUserId = order.sellerId;
              } else if (order.merchantName || order.updatedBy) {
                const sellerUser = users.value.find(u => 
                  (u.name && u.name.toLowerCase() === (order.merchantName || '').toLowerCase()) ||
                  (u.username && u.username.toLowerCase() === (order.updatedBy || '').toLowerCase())
                );
                if (sellerUser) targetUserId = sellerUser.id;
              }

              if (targetUserId) {
                targetAssigneeIds = [targetUserId];
                targetRole = 'seller';
              } else {
                targetRole = 'all';
              }

              const existing = tasks.value.find(t => t.id === taskId);
              const orderNum = order.cnNumber || order.orderId || (order.id ? order.id.slice(-6) : 'N/A');
              const taskTitle = `🚨 48h Overdue Pending Order: #${orderNum} (${order.customerName || 'Customer'})`;
              const taskDesc = `Order #${orderNum} for ${order.customerName || 'Customer'} (${order.customerPhone || 'No Phone'}, ${order.fabric || order.productCategory || 'Product'} - ৳${order.totalAmount || order.saleAmount || 0}) has been stuck in "${order.status}" for over ${elapsedHours} hours. Please confirm with customer, dispatch, or update order status immediately.`;

              if (!existing) {
                const autoTask = {
                  id: taskId,
                  title: taskTitle,
                  description: taskDesc,
                  status: 'pending',
                  priority: 'urgent',
                  isUrgent: true,
                  isAutomated: true,
                  autoType: 'pending_48h',
                  orderId: order.id,
                  orderNumber: orderNum,
                  customerName: order.customerName || '',
                  customerPhone: order.customerPhone || '',
                  elapsedHours: elapsedHours,
                  assigneeRole: targetRole,
                  assigneeId: targetUserId,
                  assigneeIds: targetAssigneeIds,
                  createdAt: getBstIsoString(),
                  hasReminder: true,
                  reminderAt: getBstIsoString()
                };
                tasks.value.unshift(autoTask);
                syncQueue.value.changes.tasks = syncQueue.value.changes.tasks || {};
                queueChange('tasks', autoTask);
                changed = true;
              } else {
                // Update elapsed hours if changed
                if (existing.elapsedHours !== elapsedHours || existing.description !== taskDesc) {
                  existing.elapsedHours = elapsedHours;
                  existing.description = taskDesc;
                  if (targetUserId && !existing.assigneeId) {
                    existing.assigneeId = targetUserId;
                    existing.assigneeIds = [targetUserId];
                  }
                  queueChange('tasks', existing);
                  changed = true;
                }
              }
            }
          });

          // 2. Auto-resolve or archive automated 48h tasks if order is no longer pending or was deleted
          tasks.value.forEach(t => {
            if (t && t.isAutomated && t.autoType === 'pending_48h' && t.orderId) {
              const matchedOrder = orders.value.find(o => o.id === t.orderId);
              if (!matchedOrder || !isOrderStuckPending48h(matchedOrder)) {
                if (t.status === 'pending') {
                  t.status = 'completed';
                  t.completedAt = getBstIsoString();
                  t.completedBy = 'Auto-Resolved (Status Updated)';
                  queueChange('tasks', t);
                  changed = true;
                }
              }
            }
          });

          if (changed) {
            localStorage.setItem('homeaura_tasks', JSON.stringify(tasks.value));
            saveSyncQueue();
          }
        };

        // Run automated 48h pending check on interval
        setInterval(() => {
          checkAndAssignPending48hTasks();
        }, 30000);

        // Filtered tasks computation for comprehensive Task Management
        const filteredTasksList = computed(() => {
          const query = taskSearch.value.trim().toLowerCase();
          return tasks.value.filter(task => {
            // Text search
            if (query) {
              const titleMatch = (task.title || '').toLowerCase().includes(query);
              const descMatch = (task.description || '').toLowerCase().includes(query);
              const orderMatch = (task.orderNumber || task.orderId || '').toLowerCase().includes(query);
              const custMatch = (task.customerName || task.customerPhone || '').toLowerCase().includes(query);
              if (!titleMatch && !descMatch && !orderMatch && !custMatch) return false;
            }

            // Filter tab
            if (taskFilter.value === 'pending_48h') {
              return isTaskPendingForUser(task, currentUser.value) && task.isAutomated && task.autoType === 'pending_48h';
            }
            if (taskFilter.value === 'reminders') {
              if (!isTaskPendingForUser(task, currentUser.value)) return false;
              const r = getTaskReminderInfo(task);
              return r && (r.isDue || task.hasReminder);
            }
            if (taskFilter.value === 'daily') {
              return task.isDaily && (isTaskPendingForUser(task, currentUser.value) || isTaskCompletedForUser(task, currentUser.value));
            }
            if (taskFilter.value === 'completed') {
              return isTaskCompletedForUser(task, currentUser.value);
            }

            // Default 'all' filter shows pending tasks for current user
            return isTaskPendingForUser(task, currentUser.value);
          });
        });

        const activeTab = ref('dashboard');
        const isSidebarCollapsed = ref(false);

        const isTasksPanelOpen = ref(false);

        const openTasksPanel = () => {
          isTasksPanelOpen.value = true;
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
          }
        };
  
        const unreadNotificationsCount = computed(() => {
          if (!currentUser.value) return 0;
          return tasks.value.filter(t => isTaskPendingForUser(t, currentUser.value)).length;
        });


        // WhatsApp Submission Group Default Link
        const DEFAULT_WA_GROUP_LINK = 'https://chat.whatsapp.com/LStonFBgIe67wTqWx9f1dw';
        const LEGACY_BAD_LINK = 'https://chat.whatsapp.com/HomeAuraOfficialTeam';

        // Apps Script Endpoint URL
        const appsScriptUrl = ref('https://script.google.com/macros/s/AKfycbxap5GbDEQe8PrEs3gS2MPtrVgGDVSHmvK-qdPfklpbzHTPsQ3oEzHlFlF3J5FghTMeKw/exec');
        const backupFrequency = ref(localStorage.getItem('homeaura_backup_frequency') || '6');
        let initialStoredWa = localStorage.getItem('homeaura_admin_wa');
        if (initialStoredWa && initialStoredWa.includes('HomeAuraOfficialTeam')) {
            initialStoredWa = DEFAULT_WA_GROUP_LINK; // Force overwrite bad legacy link
            localStorage.setItem('homeaura_admin_wa', DEFAULT_WA_GROUP_LINK);
        }
        const adminWaGroupLink = ref(initialStoredWa && initialStoredWa.trim().startsWith('http') ? initialStoredWa.trim() : DEFAULT_WA_GROUP_LINK);

        // --- OPTIMAL MULTI-USER OUTBOX SYNC QUEUE (DELTA SYNC) ---
        const initSyncQueue = () => {
          try {
            const raw = localStorage.getItem('homeaura_sync_queue_v4');
            if (raw) {
              const q = JSON.parse(raw);
              if (q && q.changes && q.deletes) return q;
            }
          } catch(e) {}
          
        // Browser Notifications for Tasks
        let lastTaskIds = new Set(tasks.value.map(t => t.id));
        watch(() => tasks.value, (newTasks) => {
          if (!currentUser.value) return;
          const currentTaskIds = new Set(newTasks.map(t => t.id));
          
          // Check for new tasks
          const newAddedTasks = newTasks.filter(t => !lastTaskIds.has(t.id));
          
          newAddedTasks.forEach(task => {
            // Check if task is for me
            if (task.assigneeRole === 'all' || task.assigneeRole === currentUser.value.role || task.assigneeId === currentUser.value.id) {
              // It's a new task for me!
              // Ask for permission and notify
              if (typeof window !== 'undefined' && 'Notification' in window) {
                if (Notification.permission === 'granted') {
                  new Notification('HomeAura: New Task Assigned', {
                    body: task.title,
                    icon: '/icon.png' // fallback if exists
                  });
                } else if (Notification.permission !== 'denied') {
                  Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                      new Notification('HomeAura: New Task Assigned', {
                        body: task.title
                      });
                    }
                  });
                }
              }
              // Also show in-app toast if toast exists
              if (typeof showToast === 'function') {
                showToast('New Task: ' + task.title, 'info');
              }
            }
          });
          
          lastTaskIds = currentTaskIds;
        }, { deep: true });

        return {
            changes: {
              orders: {},
              deletedOrders: {},
              users: {},
              factories: {},
              factoryBills: {},
              expenses: {},
              tasks: {},
              notifications: {},
              categories: null,
              fabrics: null,
              settings: {}
            },
            deletes: {
              orders: [],
              deletedOrders: [],
              users: [],
              factories: [],
              factoryBills: [],
              expenses: [],
              tasks: [],
              notifications: []
            }
          };
        };

        const syncQueue = ref(initSyncQueue());

        const saveSyncQueue = () => {
          try {
            localStorage.setItem('homeaura_sync_queue_v4', JSON.stringify(syncQueue.value));
          } catch (e) {}
        };

        // Real-time pending changes counter
        const pendingSyncCount = computed(() => {
          let count = 0;
          const ch = syncQueue.value.changes;
          const del = syncQueue.value.deletes;
          if (ch) {
            count += Object.keys(ch.orders || {}).length;
            count += Object.keys(ch.deletedOrders || {}).length;
            count += Object.keys(ch.users || {}).length;
            count += Object.keys(ch.factories || {}).length;
            count += Object.keys(ch.factoryBills || {}).length;
            count += Object.keys(ch.expenses || {}).length;
            count += Object.keys(ch.tasks || {}).length;
            count += Object.keys(ch.notifications || {}).length;
            count += Object.keys(ch.settings || {}).length;
            if (ch.categories) count += 1;
          }
          if (del) {
            count += (del.orders || []).length;
            count += (del.deletedOrders || []).length;
            count += (del.users || []).length;
            count += (del.factories || []).length;
            count += (del.factoryBills || []).length;
            count += (del.expenses || []).length;
            count += (del.tasks || []).length;
            count += (del.notifications || []).length;
          }
          return count;
        });

        // Sync Status Indicators
        const syncStatus = ref('synced'); // 'synced' | 'syncing_push' | 'syncing_pull' | 'offline' | 'error'
        const syncNotice = ref('');
        const syncStatusMsg = ref('');
        const syncStatusColor = ref('');
        const lastSyncTimestamp = ref(localStorage.getItem('homeaura_last_sync_time') || '');
        const lastPullTimestamp = ref(localStorage.getItem('homeaura_last_pull_time') || '');
        const isBackingUp = ref(false);
        const isPushing = ref(false);
        const isPulling = ref(false);
        const isInitialLoad = ref(true);
        const isAuthenticating = ref(false);
        const isTestingSync = ref(false);

        // Helper: Stamp entity with ISO timestamp and author
        const stampEntity = (entity) => {
          if (!entity) return entity;
          entity.updatedAt = getBstIsoString();
          if (currentUser.value?.username) {
            entity.updatedBy = currentUser.value?.username;
          }
          return entity;
        };

        // Outbox queue mutations
        const queueChange = (collection, entity) => {
          if (!entity) return;
          stampEntity(entity);
          if (collection === 'categories') { syncQueue.value.changes.categories = [...categories.value]; } else if (collection === 'fabrics') { syncQueue.value.changes.fabrics = [...fabrics.value]; } else if (collection === 'settings') {
            if (!syncQueue.value.changes.settings) syncQueue.value.changes.settings = {};
            syncQueue.value.changes.settings[entity.id] = { ...entity };
          } else {
            if (!syncQueue.value.changes[collection]) syncQueue.value.changes[collection] = {};
            syncQueue.value.changes[collection][entity.id] = { ...entity };
            // Remove from deletes list if it was previously queued for deletion
            if (syncQueue.value.deletes[collection]) {
              syncQueue.value.deletes[collection] = syncQueue.value.deletes[collection].filter(id => id !== entity.id);
            }
          }
          saveSyncQueue();
          triggerAutoSync();
        };

        const queueDelete = (collection, id) => {
          if (!id) return;
          // Remove from changes list if queued
          if (syncQueue.value.changes[collection] && syncQueue.value.changes[collection][id]) {
            delete syncQueue.value.changes[collection][id];
          }
          if (!syncQueue.value.deletes[collection]) syncQueue.value.deletes[collection] = [];
          if (!syncQueue.value.deletes[collection].includes(id)) {
            syncQueue.value.deletes[collection].push(id);
          }
          saveSyncQueue();
          triggerAutoSync();
        };

        // --- BIDIRECTIONAL DELTA SYNC ENGINE ---
        let autoSyncTimeout = null;
        const triggerAutoSync = (immediate = false) => {
          if (!appsScriptUrl.value) return;
          if (autoSyncTimeout) clearTimeout(autoSyncTimeout);
          if (immediate) {
            pushToGoogleSheets(false);
          } else {
            autoSyncTimeout = setTimeout(() => {
              pushToGoogleSheets(false);
            }, 1000); // 1-second batching debounce
          }
        };

        const pushToGoogleSheets = async (forceFull = false, isUserTriggered = false) => {
          if (currentUser.value) {
            const myU = users.value.find(u => u && u?.username === currentUser.value?.username);
            if (myU) {
              myU.lastActive = getBstIsoString();
              syncQueue.value.changes.users = syncQueue.value.changes.users || {};
              syncQueue.value.changes.users[myU.id] = { ...myU };
              saveSyncQueue();
            }
          }
          if (!appsScriptUrl.value) return;
          if (!navigator.onLine) {
            syncStatus.value = 'offline';
            return;
          }
          if (isPushing.value) return;
          if (!forceFull && pendingSyncCount.value === 0) return;

          isPushing.value = true;
          isBackingUp.value = true;
          syncStatus.value = 'syncing_push';

          // Snapshot queue so newly created changes during request aren't lost
          const queueSnapshot = JSON.parse(JSON.stringify(syncQueue.value));

          let payload;
          const stripHugeFields = (arr) => arr.map(o => {
            const copy = { ...o };
            delete copy.collagePhotoLocalUrl;
            delete copy.collagePhotoBase64;
            delete copy.socialProofLocalUrl;
            delete copy.socialProofBase64;
            if (copy.collagePhotoUrl && (copy.collagePhotoUrl.startsWith('data:') || copy.collagePhotoUrl.startsWith('blob:'))) {
              copy.collagePhotoUrl = '';
            }
            if (copy.socialProofUrl && (copy.socialProofUrl.startsWith('data:') || copy.socialProofUrl.startsWith('blob:'))) {
              copy.socialProofUrl = '';
            }
            return copy;
          });

          if (forceFull) {
            payload = {
              action: 'sync_full',
              delta: false,
              sender: currentUser.value?.username || 'user',
              clientTimestamp: getBstIsoString(),
              users: users.value,
              orders: stripHugeFields(orders.value),
              deletedOrders: stripHugeFields(deletedOrders.value),
              categories: categories.value,
              fabrics: fabrics.value,
              factories: factories.value,
              factoryBills: factoryBills.value,
              expenses: expenses.value,
              tasks: tasks.value,
              notifications: notifications.value,
              settings: [{ id: "adminWaGroupLink", value: adminWaGroupLink.value }]
            };
          } else {
            payload = {
              action: 'sync_delta',
              delta: true,
              sender: currentUser.value?.username || 'user',
              clientTimestamp: getBstIsoString(),
              changes: {
                orders: stripHugeFields(Object.values(queueSnapshot.changes.orders || {})),
                deletedOrders: stripHugeFields(Object.values(queueSnapshot.changes.deletedOrders || {})),
                users: Object.values(queueSnapshot.changes.users || {}),
                factories: Object.values(queueSnapshot.changes.factories || {}),
                factoryBills: Object.values(queueSnapshot.changes.factoryBills || {}),
                expenses: Object.values(queueSnapshot.changes.expenses || {}),
                tasks: Object.values(queueSnapshot.changes.tasks || {}),
                notifications: Object.values(queueSnapshot.changes.notifications || {}),
                categories: queueSnapshot.changes.categories,
                fabrics: queueSnapshot.changes.fabrics,
                settings: Object.values(queueSnapshot.changes.settings || {})
              },
              deletes: queueSnapshot.deletes || {}
            };
          }

          try {
            const url = (appsScriptUrl.value || '').trim();
            if (!url || !url.startsWith('http')) {
              isPushing.value = false;
              isBackingUp.value = false;
              return;
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(new Error('Request timed out')), 90000);

            const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify(payload),
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!res.ok) {
              throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }

            const data = await res.json();
            if (data && data.status === 'error') {
              throw new Error(data.error || 'Server rejected changes');
            }

            if (!forceFull) {
              // Prune successfully synced items from queue
              if (queueSnapshot.changes) {
                Object.keys(queueSnapshot.changes.orders || {}).forEach(id => {
                  delete syncQueue.value.changes.orders[id];
                });
                Object.keys(queueSnapshot.changes.deletedOrders || {}).forEach(id => {
                  delete syncQueue.value.changes.deletedOrders[id];
                });
                Object.keys(queueSnapshot.changes.users || {}).forEach(id => {
                  delete syncQueue.value.changes.users[id];
                });
                Object.keys(queueSnapshot.changes.factories || {}).forEach(id => {
                  delete syncQueue.value.changes.factories[id];
                });
                Object.keys(queueSnapshot.changes.factoryBills || {}).forEach(id => {
                  delete syncQueue.value.changes.factoryBills[id];
                });
                Object.keys(queueSnapshot.changes.expenses || {}).forEach(id => {
                  delete syncQueue.value.changes.expenses[id];
                });
                Object.keys(queueSnapshot.changes.tasks || {}).forEach(id => {
                  delete syncQueue.value.changes.tasks[id];
                });
                Object.keys(queueSnapshot.changes.settings || {}).forEach(id => {
                  delete syncQueue.value.changes.settings[id];
                });
                if (queueSnapshot.changes.categories) { syncQueue.value.changes.categories = null; }
                  if (queueSnapshot.changes.fabrics) { syncQueue.value.changes.fabrics = null; }
              }
              if (queueSnapshot.deletes) {
                Object.keys(queueSnapshot.deletes).forEach(coll => {
                  const sentIds = queueSnapshot.deletes[coll] || [];
                  syncQueue.value.deletes[coll] = (syncQueue.value.deletes[coll] || []).filter(id => !sentIds.includes(id));
                });
              }
            } else {
              // Reset queue after full sync
              syncQueue.value = {
                changes: { orders: {}, deletedOrders: {}, users: {}, factories: {}, factoryBills: {}, expenses: {}, tasks: {}, notifications: {}, categories: null, fabrics: null, settings: {} },
                deletes: { orders: [], deletedOrders: [], users: [], factories: [], factoryBills: [], expenses: [], tasks: [], notifications: [] }
              };
            }

            saveSyncQueue();
            lastSyncTimestamp.value = getBangladeshClockString();
            localStorage.setItem('homeaura_last_sync_time', lastSyncTimestamp.value);
            syncStatus.value = 'synced';
          } catch (err) {
            console.warn('Push sync note (local outbox preserved):', err.message);
            syncStatus.value = 'offline';
            if (isUserTriggered) {
              syncNotice.value = 'Sync push queued locally: ' + (err.name === 'AbortError' ? 'request timeout' : err.message);
              setTimeout(() => { syncNotice.value = ''; }, 5000);
            }
          } finally {
            isPushing.value = false;
            isBackingUp.value = false;
          }
        };

        // Smart Non-Destructive Pull with Conflict-Free LWW Resolution
        const syncFromGoogleSheets = async (isUserTriggered = false) => {
          const url = (appsScriptUrl.value || '').trim();
          if (!url || !url.startsWith('http')) return;
          if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            syncStatus.value = 'offline';
            return;
          }
          if (isPulling.value || isPushing.value) return;

          isPulling.value = true;
          if (isUserTriggered) syncStatus.value = 'syncing_pull';

          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(new Error('Request timed out')), 45000);

            const res = await fetch(url, {
              method: 'GET',
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!res.ok) {
              throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }

            const data = await res.json();
            if (!data || data.status === 'error') {
              throw new Error(data?.error || 'Failed to fetch sheet data');
            }

            let updatedCount = 0;

            // 1. Orders Smart Merge (Remote Source of Truth with Local Offline Preservation)
            if (Array.isArray(data.orders)) {
              const remoteOrderMap = new Map();
              data.orders.forEach(ro => { if (ro && ro.id) remoteOrderMap.set(String(ro.id), ro); });

              const newOrdersList = [];
              const processedIds = new Set();

              // Merge/add all remote orders
              data.orders.forEach(remoteOrd => {
                if (!remoteOrd || !remoteOrd.id) return;
                const rId = String(remoteOrd.id);
                processedIds.add(rId);

                const wasDeletedLocally = deletedOrders.value.some(d => String(d.id) === rId) ||
                  (syncQueue.value.deletes.orders && syncQueue.value.deletes.orders.map(String).includes(rId));
                if (wasDeletedLocally) return;

                const localOrd = orders.value.find(o => String(o.id) === rId);
                if (localOrd) {
                  const hasLocalPending = syncQueue.value.changes.orders && syncQueue.value.changes.orders[localOrd.id];
                  if (!hasLocalPending) {
                    const locTime = localOrd.updatedAt ? new Date(localOrd.updatedAt).getTime() : 0;
                    const remTime = remoteOrd.updatedAt ? new Date(remoteOrd.updatedAt).getTime() : 0;
                    if (remTime >= locTime || !localOrd.updatedAt) {
                      const prevStatus = localOrd.status;
                      Object.assign(localOrd, remoteOrd);
                      if (prevStatus !== remoteOrd.status) updatedCount++;
                    }
                  }
                  
                  // Ensure photo Google Drive URLs and file names from remote are always preserved and merged
                  if (remoteOrd.collagePhotoUrl && (!localOrd.collagePhotoUrl || (localOrd.collagePhotoUrl.startsWith('data:') || localOrd.collagePhotoUrl.startsWith('blob:')))) {
                    localOrd.collagePhotoUrl = remoteOrd.collagePhotoUrl;
                  }
                  if (remoteOrd.collagePhotoFileName && !localOrd.collagePhotoFileName) {
                    localOrd.collagePhotoFileName = remoteOrd.collagePhotoFileName;
                  }
                  if (remoteOrd.socialProofUrl && (!localOrd.socialProofUrl || (localOrd.socialProofUrl.startsWith('data:') || localOrd.socialProofUrl.startsWith('blob:')))) {
                    localOrd.socialProofUrl = remoteOrd.socialProofUrl;
                  }
                  if (remoteOrd.socialProofFileName && !localOrd.socialProofFileName) {
                    localOrd.socialProofFileName = remoteOrd.socialProofFileName;
                  }

                  // Merge Fraud Assessment from remote orders into local state
                  if (remoteOrd.fraudData) {
                    let fData = remoteOrd.fraudData;
                    if (typeof fData === 'string') {
                      try { fData = JSON.parse(fData); } catch (e) {}
                    }
                    if (fData) {
                      localOrd.fraudData = fData;
                      if (fData.riskLabel) localOrd.fraudStatus = fData.riskLabel;
                      const pKey = normalizeCustomerPhone(fData.phone || remoteOrd.customerPhone);
                      if (pKey) {
                        fraudCheckMap.value[pKey] = fData;
                      }
                    }
                  }

                  newOrdersList.push(localOrd);
                } else {
                  if (remoteOrd.fraudData) {
                    let fData = remoteOrd.fraudData;
                    if (typeof fData === 'string') {
                      try { fData = JSON.parse(fData); } catch (e) {}
                    }
                    if (fData) {
                      remoteOrd.fraudData = fData;
                      if (fData.riskLabel) remoteOrd.fraudStatus = fData.riskLabel;
                      const pKey = normalizeCustomerPhone(fData.phone || remoteOrd.customerPhone);
                      if (pKey) {
                        fraudCheckMap.value[pKey] = fData;
                      }
                    }
                  }
                  newOrdersList.push(remoteOrd);
                  updatedCount++;
                }
              });

              // Keep only truly local new orders created offline that haven't been pushed to the remote sheet yet
              orders.value.forEach(localOrd => {
                if (!localOrd || !localOrd.id) return;
                const lId = String(localOrd.id);
                if (!processedIds.has(lId)) {
                  const hasLocalPending = syncQueue.value.changes.orders && syncQueue.value.changes.orders[localOrd.id];
                  if (hasLocalPending) {
                    newOrdersList.unshift(localOrd);
                  }
                }
              });

              orders.value = newOrdersList;
              localStorage.setItem('homeaura_orders', JSON.stringify(orders.value));
            }

            // 2. Deleted Orders Merge
            if (Array.isArray(data.deletedOrders)) {
              data.deletedOrders.forEach(remDel => {
                if (remDel && remDel.id && !deletedOrders.value.some(ld => String(ld.id) === String(remDel.id))) {
                  deletedOrders.value.unshift(remDel);
                }
              });
              orders.value = orders.value.filter(o => !deletedOrders.value.some(d => String(d.id) === String(o.id)));
              localStorage.setItem('homeaura_deleted_orders', JSON.stringify(deletedOrders.value));
              localStorage.setItem('homeaura_orders', JSON.stringify(orders.value));
            }

            // 3. Users Merge
            if (Array.isArray(data.users) && data.users.length > 0) {
              const userMap = new Map();
              data.users.forEach(u => { if (u && u?.username) userMap.set(String(u?.username), u); });
              const newUsersList = [];
              const processedUsernames = new Set();

              data.users.forEach(remoteU => {
                if (!remoteU || !remoteU?.username) return;
                const uname = String(remoteU?.username);
                processedUsernames.add(uname);
                const localU = users.value.find(u => u && String(u?.username) === uname);
                if (localU) {
                  if (!syncQueue.value.changes.users || !syncQueue.value.changes.users[localU.id]) {
                    Object.assign(localU, remoteU);
                  }
                  newUsersList.push(localU);
                } else {
                  newUsersList.push(remoteU);
                }
              });

              users.value.forEach(localU => {
                if (localU && localU.username && !processedUsernames.has(String(localU.username))) {
                  if (syncQueue.value.changes.users && syncQueue.value.changes.users[localU.id]) {
                    newUsersList.push(localU);
                  }
                }
              });

              if (newUsersList.length > 0) {
                users.value = newUsersList;
                localStorage.setItem('homeaura_users', JSON.stringify(users.value));
              }
            }

            // 4. Factories Merge
            if (Array.isArray(data.factories)) {
              if (data.factories.length > 0 || factories.value.length === 0) {
                const facMap = new Map();
                data.factories.forEach(f => { if (f && f.id) facMap.set(String(f.id), f); });
                const newFacsList = [];
                const processedFacIds = new Set();

                data.factories.forEach(remoteF => {
                  if (!remoteF || !remoteF.id) return;
                  const fid = String(remoteF.id);
                  processedFacIds.add(fid);
                  const localF = factories.value.find(f => String(f.id) === fid);
                  if (localF) {
                    if (!syncQueue.value.changes.factories || !syncQueue.value.changes.factories[localF.id]) {
                      Object.assign(localF, remoteF);
                    }
                    newFacsList.push(localF);
                  } else {
                    newFacsList.push(remoteF);
                  }
                });

                factories.value.forEach(localF => {
                  if (localF && localF.id && !processedFacIds.has(String(localF.id))) {
                    if (syncQueue.value.changes.factories && syncQueue.value.changes.factories[localF.id]) {
                      newFacsList.push(localF);
                    }
                  }
                });

                factories.value = newFacsList;
                localStorage.setItem('homeaura_factories', JSON.stringify(factories.value));
              }
            }

            // 5. Factory Bills Merge
            if (Array.isArray(data.factoryBills)) {
              const billMap = new Map();
              data.factoryBills.forEach(b => { if (b && b.id) billMap.set(String(b.id), b); });
              const newBillsList = [];
              const processedBillIds = new Set();

              data.factoryBills.forEach(remoteB => {
                if (!remoteB || !remoteB.id) return;
                const bid = String(remoteB.id);
                processedBillIds.add(bid);
                if (syncQueue.value.deletes.factoryBills && syncQueue.value.deletes.factoryBills.includes(remoteB.id)) return;
                const localB = factoryBills.value.find(b => String(b.id) === bid);
                if (localB) {
                  if (!syncQueue.value.changes.factoryBills || !syncQueue.value.changes.factoryBills[localB.id]) {
                    Object.assign(localB, remoteB);
                  }
                  newBillsList.push(localB);
                } else {
                  newBillsList.push(remoteB);
                }
              });

              factoryBills.value.forEach(localB => {
                if (localB && localB.id && !processedBillIds.has(String(localB.id))) {
                  if (syncQueue.value.changes.factoryBills && syncQueue.value.changes.factoryBills[localB.id]) {
                    newBillsList.push(localB);
                  }
                }
              });

              factoryBills.value = newBillsList;
              localStorage.setItem('homeaura_factory_bills', JSON.stringify(factoryBills.value));
            }

            // 6. Expenses Merge
            if (Array.isArray(data.expenses)) {
              const expMap = new Map();
              data.expenses.forEach(e => { if (e && e.id) expMap.set(String(e.id), e); });
              const newExpList = [];
              const processedExpIds = new Set();

              data.expenses.forEach(remoteE => {
                if (!remoteE || !remoteE.id) return;
                const eid = String(remoteE.id);
                processedExpIds.add(eid);
                if (syncQueue.value.deletes.expenses && syncQueue.value.deletes.expenses.includes(remoteE.id)) return;
                const localE = expenses.value.find(e => String(e.id) === eid);
                if (localE) {
                  if (!syncQueue.value.changes.expenses || !syncQueue.value.changes.expenses[localE.id]) {
                    Object.assign(localE, remoteE);
                  }
                  newExpList.push(localE);
                } else {
                  newExpList.push(remoteE);
                }
              });

              expenses.value.forEach(localE => {
                if (localE && localE.id && !processedExpIds.has(String(localE.id))) {
                  if (syncQueue.value.changes.expenses && syncQueue.value.changes.expenses[localE.id]) {
                    newExpList.push(localE);
                  }
                }
              });

              expenses.value = newExpList;
              localStorage.setItem('homeaura_expenses', JSON.stringify(expenses.value));
            }

            // 7. Categories Merge
            if (Array.isArray(data.categories) && data.categories.length > 0 && !syncQueue.value.changes.categories) {
              categories.value = data.categories.map(c => typeof c === 'object' && c !== null ? (c.name || Object.values(c).join('')) : String(c));
              localStorage.setItem('homeaura_categories', JSON.stringify(categories.value));
            }
            if (Array.isArray(data.fabrics) && data.fabrics.length > 0 && !syncQueue.value.changes.fabrics) {
              fabrics.value = data.fabrics.map(c => typeof c === 'object' && c !== null ? (c.name || Object.values(c).join('')) : String(c));
              localStorage.setItem('homeaura_fabrics', JSON.stringify(fabrics.value));
            }

            
            // 9. Tasks Merge
            if (Array.isArray(data.tasks)) {
              const taskMap = new Map();
              data.tasks.forEach(t => { if (t && t.id) taskMap.set(String(t.id), t); });
              const newTasksList = [];
              const processedTaskIds = new Set();
              data.tasks.forEach(remoteT => {
                if (!remoteT || !remoteT.id) return;
                const tid = String(remoteT.id);
                processedTaskIds.add(tid);
                if (syncQueue.value.deletes.tasks && syncQueue.value.deletes.tasks.includes(remoteT.id)) return;
                const localT = tasks.value.find(t => String(t.id) === tid);
                if (localT) {
                  if (!syncQueue.value.changes.tasks || !syncQueue.value.changes.tasks[localT.id]) {
                    Object.assign(localT, remoteT);
                  }
                  newTasksList.push(localT);
                } else {
                  newTasksList.push(remoteT);
                }
              });
              tasks.value.forEach(localT => {
                if (localT && localT.id && !processedTaskIds.has(String(localT.id))) {
                  if (syncQueue.value.changes.tasks && syncQueue.value.changes.tasks[localT.id]) {
                    newTasksList.push(localT);
                  }
                }
              });
              tasks.value = newTasksList;
              localStorage.setItem('homeaura_tasks', JSON.stringify(tasks.value));
            }

            // 8. Settings Merge (WhatsApp Reporting Group, etc.)
            if (data.settings) {
              let waRemoteVal = null;
              if (Array.isArray(data.settings)) {
                const waSetting = data.settings.find(s => s && (s.id === 'adminWaGroupLink' || s.key === 'adminWaGroupLink' || s.name === 'adminWaGroupLink'));
                if (waSetting) {
                  waRemoteVal = waSetting.value !== undefined ? waSetting.value : (waSetting.val || waSetting.link || '');
                }
              } else if (typeof data.settings === 'object') {
                waRemoteVal = data.settings.adminWaGroupLink;
              }

              if (waRemoteVal && typeof waRemoteVal === 'string' && waRemoteVal.trim().startsWith('http')) {
                // Ignore the bad legacy link from Google Sheets if it's there
                if (waRemoteVal.includes('HomeAuraOfficialTeam')) {
                    waRemoteVal = DEFAULT_WA_GROUP_LINK;
                }
                const hasLocalPending = syncQueue.value.changes.settings && syncQueue.value.changes.settings.adminWaGroupLink;
                if (!hasLocalPending) {
                  if (adminWaGroupLink.value !== waRemoteVal.trim()) {
                    adminWaGroupLink.value = waRemoteVal.trim();
                    localStorage.setItem('homeaura_admin_wa', waRemoteVal.trim());
                  }
                }
              }
            }

            lastPullTimestamp.value = getBangladeshClockString();
            localStorage.setItem('homeaura_last_pull_time', lastPullTimestamp.value);
            syncStatus.value = 'synced';

            if (updatedCount > 0) {
              syncNotice.value = `⚡ Synced ${updatedCount} team updates from Google Sheets`;
              setTimeout(() => { syncNotice.value = ''; }, 4000);
            }
            setTimeout(() => { 
              fetchSfcStatusForOrders(orders.value); 
              fetchFraudCheckForOrders(orders.value);
            }, 200);
          } catch (err) {
            console.warn('Pull sync note (offline/local fallback):', err.message);
            syncStatus.value = 'offline';
            if (isUserTriggered) {
              syncNotice.value = 'Offline mode: using local cache (' + (err.name === 'AbortError' ? 'request timeout' : err.message) + ')';
              setTimeout(() => { syncNotice.value = ''; }, 5000);
            }
          } finally {
            isPulling.value = false;
          }
        };

        const backupToGoogleSheets = async (isAuto = false) => {
          return pushToGoogleSheets(!isAuto);
        };

        // --- DARK MODE LOGIC ---
        const isDarkMode = ref(localStorage.getItem('homeaura_dark') === 'true');

        const applyDarkMode = () => {
          if (isDarkMode.value) {
            document.body.classList.add('dark');
            document.documentElement.classList.add('dark');
          } else {
            document.body.classList.remove('dark');
            document.documentElement.classList.remove('dark');
          }
        };

        const toggleDarkMode = () => {
          isDarkMode.value = !isDarkMode.value;
          localStorage.setItem('homeaura_dark', isDarkMode.value ? 'true' : 'false');
          applyDarkMode();
        };

        // --- LOCAL STORAGE PERSISTENCE INITIAL LOAD ---
                const getProxiedUrl = (url) => {
          if (!url) return '';
          if (url.startsWith('data:')) return url;
          if (url.startsWith('blob:')) return ''; // Ignore dead blobs
          return '/api/proxy-image?url=' + encodeURIComponent(url);
        };

        const loadInitialData = () => {
          const storedUsers = localStorage.getItem('homeaura_users');
          let parsedUsrs = storedUsers ? JSON.parse(storedUsers) : null;
          if (!parsedUsrs || parsedUsrs.length === 0) parsedUsrs = defaultUsers;
          users.value = parsedUsrs;
          if (!storedUsers) localStorage.setItem('homeaura_users', JSON.stringify(defaultUsers));

          const fakeOrderIds = new Set(['ORD-1001', 'ORD-1002', 'ORD-1003', 'ORD-1004', 'ORD-1005', 'ORD-1006', 'ORD-1007', 'ORD-1008', 'ORD-1009']);
          const storedOrders = localStorage.getItem('homeaura_orders');
          let parsedOrders = [];
          if (storedOrders) {
            try {
              const loaded = JSON.parse(storedOrders);
              if (Array.isArray(loaded)) {
                // Filter out legacy fake demo orders
                parsedOrders = loaded.filter(o => {
                  if (!o || !o.id) return false;
                  if (fakeOrderIds.has(String(o.id)) && (o.customerName === 'Far Ha Na' || o.customerName === 'Muslim Wddin Piyash' || o.customerName === 'Rayhan Kabir' || o.customerName === 'Farah Naz' || o.customerName === 'Tanvir Hossain' || o.customerName === 'Kazi Shakil' || o.customerName === 'Nusrat Jahan' || o.customerName === 'Mahfuzur Rahman' || o.customerName === 'Sultana Razia' || o.customerName === 'Anisur Rahman' || o.customerName === 'Tahmina Begum')) {
                    return false;
                  }
                  return true;
                }).map(o => {
                  if (o.collagePhotoBase64 && !o.collagePhotoLocalUrl) o.collagePhotoLocalUrl = o.collagePhotoBase64;
                  if (o.socialProofBase64 && !o.socialProofLocalUrl) o.socialProofLocalUrl = o.socialProofBase64;
                  return o;
                });
              }
            } catch (e) {
              parsedOrders = [];
            }
          }
          orders.value = parsedOrders;
          // Populate fraud cache from parsed orders
          orders.value.forEach(o => {
            if (o && o.fraudData) {
              let f = o.fraudData;
              if (typeof f === 'string') {
                try { f = JSON.parse(f); } catch (e) {}
              }
              if (f && (f.phone || o.customerPhone)) {
                const p = normalizeCustomerPhone(f.phone || o.customerPhone);
                if (p) fraudCheckMap.value[p] = f;
              }
            }
          });
          localStorage.setItem('homeaura_orders', JSON.stringify(orders.value));
          setTimeout(() => { 
            fetchSfcStatusForOrders(orders.value); 
            fetchFraudCheckForOrders(orders.value);
          }, 100);

          const storedDeletedOrders = localStorage.getItem('homeaura_deleted_orders');
          deletedOrders.value = storedDeletedOrders ? JSON.parse(storedDeletedOrders) : [];

          const storedCats = localStorage.getItem('homeaura_categories');
          let parsedCats = storedCats ? JSON.parse(storedCats) : null;
          if (!parsedCats || parsedCats.length === 0) parsedCats = defaultCategories;
          categories.value = parsedCats;
          if (!storedCats) localStorage.setItem('homeaura_categories', JSON.stringify(defaultCategories));
          
          const storedFabs = localStorage.getItem('homeaura_fabrics');
          let parsedFabs = storedFabs ? JSON.parse(storedFabs) : null;
          if (!parsedFabs || parsedFabs.length === 0) parsedFabs = defaultFabrics;
          fabrics.value = parsedFabs;
          if (!storedFabs) localStorage.setItem('homeaura_fabrics', JSON.stringify(defaultFabrics));

          const fakeFactoryIds = new Set(['f1', 'f2', 'f3']);
          const storedFactories = localStorage.getItem('homeaura_factories');
          let parsedFacs = [];
          if (storedFactories) {
            try {
              const loadedFacs = JSON.parse(storedFactories);
              if (Array.isArray(loadedFacs)) {
                parsedFacs = loadedFacs.filter(f => {
                  if (!f || !f.id) return false;
                  if (fakeFactoryIds.has(String(f.id)) && (f.name === 'Apex Crafting Hub' || f.name === 'Royal Heritage Workshop' || f.name === 'Standard Guild Factory')) {
                    return false;
                  }
                  return true;
                });
              }
            } catch (e) {
              parsedFacs = [];
            }
          }
          factories.value = parsedFacs;
          localStorage.setItem('homeaura_factories', JSON.stringify(factories.value));

          const storedFactoryBills = localStorage.getItem('homeaura_factory_bills');
          factoryBills.value = storedFactoryBills ? JSON.parse(storedFactoryBills) : [];

          const storedExpenses = localStorage.getItem('homeaura_expenses');
          const storedSpends = localStorage.getItem('homeaura_marketing_spends');
          if (storedSpends) { try { marketingSpends.value = JSON.parse(storedSpends); } catch (e) {} }
          expenses.value = storedExpenses ? JSON.parse(storedExpenses) : [];

          const storedTasks = localStorage.getItem('homeaura_tasks');
          if (storedTasks) {
            try {
              const loadedTasks = JSON.parse(storedTasks);
              if (Array.isArray(loadedTasks)) {
                tasks.value = loadedTasks;
              }
            } catch (e) {}
          }

          // Initial check for stuck >= 48h pending orders
          setTimeout(() => {
            checkAndAssignPending48hTasks();
          }, 300);

          let storedWa = localStorage.getItem('homeaura_admin_wa');
          if (storedWa && storedWa.includes('HomeAuraOfficialTeam')) {
            storedWa = DEFAULT_WA_GROUP_LINK;
          }
          if (storedWa && storedWa.trim().startsWith('http')) {
            adminWaGroupLink.value = storedWa.trim();
          } else {
            adminWaGroupLink.value = DEFAULT_WA_GROUP_LINK;
            localStorage.setItem('homeaura_admin_wa', DEFAULT_WA_GROUP_LINK);
          }

          const storedSession = localStorage.getItem('homeaura_session');
          if (storedSession) {
            try {
              const user = JSON.parse(storedSession);
              if (!user || !user?.username) throw new Error('Invalid session');
              const freshUser = users.value.find(u => u && u?.username === user?.username);
              if (freshUser) {
                if (freshUser.active) {
                  currentUser.value = freshUser;
                  activeTab.value = (freshUser.role === 'admin' || freshUser.role === 'marketer' || freshUser.role === 'moderator') ? 'dashboard' : 'intake';
                } else {
                  localStorage.removeItem('homeaura_session');
                }
              } else if (user && user.active !== false) {
                // Fallback: If local users array is empty/missing, keep session alive
                currentUser.value = user;
                activeTab.value = (user.role === 'admin' || user.role === 'marketer' || user.role === 'moderator') ? 'dashboard' : 'intake';
              } else {
                localStorage.removeItem('homeaura_session');
              }
            } catch (e) {}
          }
        };

        const saveOrdersLocally = () => {
          const stripped = orders.value.map(o => {
            const copy = { ...o };
            delete copy.collagePhotoLocalUrl;
            delete copy.collagePhotoBase64;
            delete copy.socialProofLocalUrl;
            delete copy.socialProofBase64;
            return copy;
          });
          localStorage.setItem("homeaura_orders", JSON.stringify(stripped));
        };
        const saveDeletedOrdersLocally = () => {
          const stripped = deletedOrders.value.map(o => {
            const copy = { ...o };
            delete copy.collagePhotoLocalUrl;
            delete copy.collagePhotoBase64;
            delete copy.socialProofLocalUrl;
            delete copy.socialProofBase64;
            return copy;
          });
          localStorage.setItem("homeaura_deleted_orders", JSON.stringify(stripped));
        };
        const saveUsersLocally = () => {
          localStorage.setItem("homeaura_users", JSON.stringify(users.value));
        };
        const saveCategoriesLocally = () => {
          localStorage.setItem("homeaura_categories", JSON.stringify(categories.value));
        };
        const saveFactoryBillsLocally = () => {
          localStorage.setItem("homeaura_factory_bills", JSON.stringify(factoryBills.value));
        };
        const saveExpensesLocally = () => {
          localStorage.setItem("homeaura_expenses", JSON.stringify(expenses.value));
        };
        const saveFactoriesLocally = () => {
          localStorage.setItem("homeaura_factories", JSON.stringify(factories.value));
        };

        // --- MODAL AND VIEW STATE ---
        const selectedProofTile = ref('');
        const selectProofTile = (tileKey) => { selectedProofTile.value = tileKey; selectedCollageTile.value = null; };
        
        const selectedCollageTile = ref('terminal');
        const selectCollageTile = (tileKey) => { selectedCollageTile.value = tileKey; selectedProofTile.value = null; };

        const loginForm = reactive({ username: '', password: '' });
        const loginError = ref('');

        // Filtering
        const orderSearch = ref('');
        const sortOption = ref('NEWEST');
        const statusFilter = ref('ALL');
        const merchantFilter = ref('ALL');
        const factoryFilter = ref('ALL');
        const urgentOnly = ref(false);
        const newCategoryName = ref('');

        // Intake Form
        const clipboardRawText = ref('');
        const parseSuccessMsg = ref('');
        const missingFieldsHighlight = ref(false);
        const nextUpcomingOrderNum = computed(() => {
          let maxNum = 1000;
          orders.value.forEach(o => {
            if (o && o.id) {
              const m = String(o.id).match(/-(\d+)/i);
              if (m) {
                const num = parseInt(m[1], 10);
                if (!isNaN(num) && num > maxNum) maxNum = num;
              }
            }
          });
          deletedOrders.value.forEach(o => {
            if (o && o.id) {
              const m = String(o.id).match(/-(\d+)/i);
              if (m) {
                const num = parseInt(m[1], 10);
                if (!isNaN(num) && num > maxNum) maxNum = num;
              }
            }
          });
          return maxNum + 1;
        });

        const nextUpcomingOrderId = computed(() => {
          const customPrefix = (currentUser.value && currentUser.value.pagePrefix && currentUser.value.pagePrefix.trim() !== '') ? currentUser.value.pagePrefix.trim().toUpperCase() : 'ORD';
          return `${customPrefix}-${nextUpcomingOrderNum.value}`;
        });

        const isCopiedUpcomingOrderId = ref(false);
        const copyUpcomingOrderId = async () => {
          const id = nextUpcomingOrderId.value;
          if (!id) return;
          try {
            if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
              await navigator.clipboard.writeText(id);
            } else {
              const textarea = document.createElement('textarea');
              textarea.value = id;
              textarea.style.position = 'fixed';
              textarea.style.opacity = '0';
              document.body.appendChild(textarea);
              textarea.select();
              document.execCommand('copy');
              document.body.removeChild(textarea);
            }
            isCopiedUpcomingOrderId.value = true;
            setTimeout(() => {
              isCopiedUpcomingOrderId.value = false;
            }, 2500);
          } catch (err) {
            console.warn('Failed to copy upcoming order ID:', err);
          }
        };

        const intakeForm = reactive({
          customerName: '',
          customerPhone: '',
          customerAddress: '',
          trafficSource: 'Messenger',
          fabric: '',
          productCategory: 'L-Shape Sofa',
          seatConfig: '3-Seater',
          fulfillmentMethod: 'Home Delivery',
          saleAmount: 0,
          deliveryCharge: 0,
          urgent: false,
          notes: '',
          cnNumber: '',
          collagePhotoUrl: '',
          collagePhotoLocalUrl: '',
          collagePhotoFileName: '',
          socialProofUrl: '',
          socialProofLocalUrl: '',
          socialProofFileName: '',
          extraDetails: '',
          factoryTag: ''
        });

        // Modals
        const activeModal = ref(null);
        const modalData = reactive({ title: '', order: null, user: null, factory: null, bill: null, expense: null, marketingSpend: { date: "", sellerId: "", amount: 0, history: [] }, selectedFactoryId: null, newStatus: '', url: '', confirmMessage: '', confirmButtonText: '', confirmButtonClass: '', onConfirm: null });
        const trackingData = ref(null);
        const isLoadingTracking = ref(false);

        const orderSuccessData = reactive({
          order: null,
          hasCopiedPhotos: false,
          compositePngUrl: '',
          previewPngUrl: '',
          compositePngBlob: null,
          previewBlob: null,
          waGroupLink: DEFAULT_WA_GROUP_LINK,
          formattedSummary: '',
          isCopiedText: false
        });

        const bulkDispatchData = reactive({
          selectedFactoryId: null,
          isGeneratingPng: false,
          isLoading: false,
          selectedOrdersList: [],
          orders: []
        });

        const bulkDispatchSuccessData = reactive({
          ordersCount: 0,
          count: 0,
          photoCount: 0,
          factoryName: '',
          waGroupLink: '',
          compositePngUrl: '',
          previewPngUrl: '',
          compositePngBlob: null,
          previewBlob: null,
          hasCopiedPhotos: false,
          manifestText: '',
          isCopiedText: false
        });

        const onDispatchFactoryChange = () => {
          // Reactive change handler for modal
        };

        const copyOrderWhatsAppText = async () => {
          if (!orderSuccessData.formattedSummary) return;
          try {
            await navigator.clipboard.writeText(orderSuccessData.formattedSummary);
            orderSuccessData.isCopiedText = true;
            setTimeout(() => { orderSuccessData.isCopiedText = false; }, 3000);
          } catch(e) {
            console.warn('Clipboard text copy warning:', e.message);
          }
        };

        const reCopySingleOrderPngToClipboard = async () => {
          const blobToCopy = orderSuccessData.previewBlob || orderSuccessData.compositePngBlob;
          if (!blobToCopy) {
            alert('No PNG image was generated for this order.');
            return;
          }
          const success = await writePngBlobToClipboard(blobToCopy);
          if (success) {
            orderSuccessData.hasCopiedPhotos = true;
            alert(`✅ Image copied to clipboard!\n\nPress Ctrl+V (or Cmd+V) to paste in WhatsApp.`);
          } else {
            alert('Clipboard write was blocked by browser permissions. Please ensure the tab is active.');
          }
        };

        const copyBulkManifestText = async () => {
          if (!bulkDispatchSuccessData.manifestText) return;
          try {
            await navigator.clipboard.writeText(bulkDispatchSuccessData.manifestText);
            bulkDispatchSuccessData.isCopiedText = true;
            setTimeout(() => { bulkDispatchSuccessData.isCopiedText = false; }, 3000);
          } catch (e) {
            console.warn('Bulk manifest copy warning:', e.message);
          }
        };
        
        const copyBulkDispatchWhatsAppText = copyBulkManifestText; // alias

        const reCopyBulkPngToClipboard = async () => {
          const blobToCopy = bulkDispatchSuccessData.previewBlob || bulkDispatchSuccessData.compositePngBlob;
          if (!blobToCopy) {
            alert('No PNG image available to copy.');
            return;
          }
          const success = await writePngBlobToClipboard(blobToCopy);
          if (success) {
            bulkDispatchSuccessData.hasCopiedPhotos = true;
            alert(`✅ Image copied to clipboard!\n\nPress Ctrl+V (or Cmd+V) to paste in WhatsApp.`);
          } else {
            alert('Clipboard write was blocked by browser permissions. Please ensure the tab is active.');
          }
        };

        const testOpenWaGroup = () => {
          const targetLink = (adminWaGroupLink.value || '').trim() || DEFAULT_WA_GROUP_LINK;
          try {
            window.open(targetLink, '_blank', 'noopener,noreferrer');
          } catch (e) {
            console.warn('Failed to open test link:', e.message);
          }
        };

        const openOrderWaGroup = (order) => {
          const targetLink = (adminWaGroupLink.value || '').trim() || DEFAULT_WA_GROUP_LINK;
          try {
            window.open(targetLink, '_blank', 'noopener,noreferrer');
          } catch (e) {
            console.warn('Failed to open group:', e.message);
          }
        };

        const copyOrderWaGroupLink = async (order) => {
          const targetLink = (adminWaGroupLink.value || '').trim() || DEFAULT_WA_GROUP_LINK;
          try {
            await navigator.clipboard.writeText(targetLink);
            alert('Group link copied to clipboard!');
          } catch (e) {
            console.warn('Clipboard write warning:', e.message);
          }
        };

        
        // --- FAST CLIENT-SIDE IMAGE COMPRESSION & DIRECT UPLOAD ENGINE ---
        const compressImageForUpload = (file, maxDimension = 1600, quality = 0.85) => {
          return new Promise((resolve) => {
            if (!file || !file.type || !file.type.startsWith('image/')) {
              return resolve(null);
            }
            if (file.size && file.size < 250 * 1024) {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target.result);
              reader.onerror = () => resolve(null);
              reader.readAsDataURL(file);
              return;
            }
            const reader = new FileReader();
            reader.onerror = () => resolve(null);
            reader.onload = (e) => {
              const rawDataUrl = e.target.result;
              const img = new Image();
              img.onerror = () => resolve(rawDataUrl);
              img.onload = () => {
                try {
                  let width = img.width;
                  let height = img.height;
                  if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                      height = Math.round((height * maxDimension) / width);
                      width = maxDimension;
                    } else {
                      width = Math.round((width * maxDimension) / height);
                      height = maxDimension;
                    }
                  }
                  const canvas = document.createElement('canvas');
                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  if (!ctx) return resolve(rawDataUrl);
                  ctx.imageSmoothingEnabled = true;
                  ctx.imageSmoothingQuality = 'high';
                  ctx.drawImage(img, 0, 0, width, height);
                  const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                  const compressed = canvas.toDataURL(mime, quality);
                  resolve(compressed);
                } catch (err) {
                  console.warn('Canvas compression error, using raw:', err);
                  resolve(rawDataUrl);
                }
              };
              img.src = rawDataUrl;
            };
            reader.readAsDataURL(file);
          });
        };

        const processCollageFile = async (file, targetObj = intakeForm) => {
          if (!file || !file.type.startsWith('image/')) return;
          const sellerUsername = currentUser.value ? currentUser.value?.username : 'seller';
          const rawCn = String(targetObj.cnNumber || 'NOCN');
          const cleanCn = rawCn.replace(/[^a-zA-Z0-9-]/g, '');
          const dateStr = targetObj.timestamp ? targetObj.timestamp.slice(0, 10) : getBstIsoString().slice(0, 10);
          let ext = 'jpg';
          if (file.name && file.name.includes('.')) {
            ext = file.name.split('.').pop().toLowerCase();
          } else if (file.type === 'image/png') {
            ext = 'png';
          } else if (file.type === 'image/webp') {
            ext = 'webp';
          }
          const fileName = `collage_${sellerUsername}_${cleanCn}_${dateStr}.${ext}`;
          
          if (targetObj === intakeForm) {
            parseSuccessMsg.value = '⏳ Optimizing & uploading collage to Google Drive... Please wait.';
          }
          
          const targetToken = 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
          targetObj.collageUploadToken = targetToken;
          targetObj.collagePhotoUrl = '';
          targetObj.collagePhotoFileName = fileName;
          targetObj.isUploadingCollage = true;
          
          try {
            const base64Data = await compressImageForUpload(file);
            if (!base64Data) {
              targetObj.isUploadingCollage = false;
              if (targetObj === intakeForm) parseSuccessMsg.value = '⚠️ Could not read image file.';
              return;
            }
            targetObj.collagePhotoLocalUrl = base64Data;
            
            if (!appsScriptUrl.value) {
              if (targetObj === intakeForm) parseSuccessMsg.value = '⚠️ No Google Script URL set to upload image.';
              targetObj.isUploadingCollage = false;
              return;
            }
            const url = (appsScriptUrl.value || '').trim();
            if (!url || !url.startsWith('http')) {
              targetObj.isUploadingCollage = false;
              return;
            }
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(new Error('Request timed out')), 60000);
            
            const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                action: 'upload_image',
                filename: fileName,
                base64: base64Data,
                folder: 'HomeAura_Order_Collages'
              }),
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            const result = await res.json();
            
            if (result.status === 'success' && result.url) {
                targetObj.collagePhotoUrl = result.url;
                targetObj.collagePhotoLocalUrl = base64Data;
                targetObj.collagePhotoFileName = fileName;
                targetObj.updatedAt = getBstIsoString();
                if (targetObj === intakeForm) {
                  parseSuccessMsg.value = '✅ Collage uploaded to Google Drive & linked!';
                  setTimeout(() => { parseSuccessMsg.value = ''; }, 4000);
                }
                
                if (targetObj.id) {
                  const realOrder = orders.value.find(o => o.id === targetObj.id);
                  if (realOrder) {
                    realOrder.collagePhotoUrl = result.url;
                    realOrder.collagePhotoLocalUrl = base64Data;
                    realOrder.collagePhotoFileName = fileName;
                    realOrder.updatedAt = getBstIsoString();
                    queueChange('orders', realOrder);
                    saveOrdersLocally();
                    triggerAutoSync(true);
                  }
                } else {
                  // Match in-flight order submitted before upload finished
                  const recentOrder = orders.value.find(o => 
                    (o.collageUploadToken && o.collageUploadToken === targetToken) ||
                    (o.collagePhotoFileName && o.collagePhotoFileName === fileName) ||
                    (!o.collagePhotoUrl && Date.now() - new Date(o.timestamp || o.updatedAt).getTime() < 180000)
                  );
                  if (recentOrder) {
                    recentOrder.collagePhotoUrl = result.url;
                    recentOrder.collagePhotoLocalUrl = base64Data;
                    recentOrder.collagePhotoFileName = fileName;
                    recentOrder.updatedAt = getBstIsoString();
                    queueChange('orders', recentOrder);
                    saveOrdersLocally();
                    triggerAutoSync(true);
                  }
                }
            } else if (result.error) {
              console.warn('[Image Upload Error from Apps Script]', result.error);
              if (targetObj === intakeForm) parseSuccessMsg.value = '❌ Upload failed: ' + result.error;
            }
          } catch(err) {
            console.warn("Upload Notice:", err.message);
            if (targetObj === intakeForm) parseSuccessMsg.value = '❌ Upload timed out or failed. Please check internet connection.';
          } finally {
            targetObj.isUploadingCollage = false;
          }
        };

        const handleCollageFileUpload = (event, targetObj = intakeForm) => {
          const file = event.target.files && event.target.files[0];
          if (!file) return;
          processCollageFile(file, targetObj);
        };
        
        const handleCollagePaste = (event, targetObj = intakeForm) => {
          const clipboardData = event.clipboardData || (event.originalEvent && event.originalEvent.clipboardData);
          if (!clipboardData || !clipboardData.items) return;
          const items = clipboardData.items;
          for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
              const blob = items[i].getAsFile();
              if (blob) {
                processCollageFile(blob, targetObj);
                event.preventDefault();
                break;
              }
            }
          }
        };

        const handleCollageDrop = (event, targetObj = intakeForm) => {
          event.preventDefault();
          if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
            processCollageFile(event.dataTransfer.files[0], targetObj);
          }
        };

        const processProofFile = async (file, targetObj = intakeForm) => {
          if (!file || !file.type.startsWith('image/')) return;
          const sellerUsername = currentUser.value ? currentUser.value?.username : 'seller';
          const rawCn = String(targetObj.cnNumber || 'NOCN');
          const cleanCn = rawCn.replace(/[^a-zA-Z0-9-]/g, '');
          const dateStr = targetObj.timestamp ? targetObj.timestamp.slice(0, 10) : getBstIsoString().slice(0, 10);
          let ext = 'jpg';
          if (file.name && file.name.includes('.')) {
            ext = file.name.split('.').pop().toLowerCase();
          } else if (file.type === 'image/png') {
            ext = 'png';
          } else if (file.type === 'image/webp') {
            ext = 'webp';
          }
          const fileName = `proof_${sellerUsername}_${cleanCn}_${dateStr}.${ext}`;

          if (targetObj === intakeForm) {
            parseSuccessMsg.value = '⏳ Optimizing & uploading screenshot to Google Drive... Please wait.';
          }
          
          const proofToken = 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
          targetObj.proofUploadToken = proofToken;
          targetObj.socialProofUrl = '';
          targetObj.socialProofFileName = fileName;
          targetObj.isUploadingProof = true;

          try {
            const base64Data = await compressImageForUpload(file);
            if (!base64Data) {
              targetObj.isUploadingProof = false;
              if (targetObj === intakeForm) parseSuccessMsg.value = '⚠️ Could not read image file.';
              return;
            }
            targetObj.socialProofLocalUrl = base64Data;

            if (!appsScriptUrl.value) {
              if (targetObj === intakeForm) parseSuccessMsg.value = '⚠️ No Google Script URL set to upload proof.';
              targetObj.isUploadingProof = false;
              return;
            }

            const url = (appsScriptUrl.value || '').trim();
            if (!url || !url.startsWith('http')) {
              targetObj.isUploadingProof = false;
              return;
            }
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(new Error('Request timed out')), 60000);
            const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                action: 'upload_image',
                filename: fileName,
                base64: base64Data,
                folder: 'HomeAura_Screenshot_Proofs'
              }),
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            const result = await res.json();
            if (result.status === 'success' && result.url) {
                targetObj.socialProofUrl = result.url;
                targetObj.socialProofLocalUrl = base64Data;
                targetObj.socialProofFileName = fileName;
                targetObj.updatedAt = getBstIsoString();
                if (targetObj === intakeForm) {
                  parseSuccessMsg.value = '✅ Screenshot uploaded to Google Drive & linked!';
                  setTimeout(() => { parseSuccessMsg.value = ''; }, 4000);
                }
                if (targetObj.id) {
                  const realOrder = orders.value.find(o => o.id === targetObj.id);
                  if (realOrder) {
                    realOrder.socialProofUrl = result.url;
                    realOrder.socialProofLocalUrl = base64Data;
                    realOrder.socialProofFileName = fileName;
                    realOrder.updatedAt = getBstIsoString();
                    queueChange('orders', realOrder);
                    saveOrdersLocally();
                    triggerAutoSync(true);
                  }
                } else {
                  // Match in-flight order submitted before upload finished
                  const recentOrder = orders.value.find(o => 
                    (o.proofUploadToken && o.proofUploadToken === proofToken) ||
                    (o.socialProofFileName && o.socialProofFileName === fileName) ||
                    (!o.socialProofUrl && Date.now() - new Date(o.timestamp || o.updatedAt).getTime() < 180000)
                  );
                  if (recentOrder) {
                    recentOrder.socialProofUrl = result.url;
                    recentOrder.socialProofLocalUrl = base64Data;
                    recentOrder.socialProofFileName = fileName;
                    recentOrder.updatedAt = getBstIsoString();
                    queueChange('orders', recentOrder);
                    saveOrdersLocally();
                    triggerAutoSync(true);
                  }
                }
            } else if (result.error) {
              console.warn('[Proof Upload Error from Apps Script]', result.error);
              if (targetObj === intakeForm) parseSuccessMsg.value = '❌ Upload failed: ' + result.error;
            }
          } catch(err) {
            console.warn("Upload Notice:", err.message);
            if (targetObj === intakeForm) parseSuccessMsg.value = '❌ Upload timed out or failed. Please check internet connection.';
          } finally {
            targetObj.isUploadingProof = false;
          }
        };


        const uploadCompositePngToDrive = async (base64Data, filename) => {
          const url = (appsScriptUrl.value || '').trim();
          if (!url || !url.startsWith('http')) return null;
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(new Error('Request timed out')), 90000);
            const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                action: 'upload_image',
                filename: filename,
                base64: base64Data,
                folder: 'HomeAura_Dispatch_Manifests'
              }),
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            const result = await res.json();
            if (result.status === 'success' && result.url) {
              return result.url;
            }
          } catch(e) {
            console.error('Failed to upload composite PNG to drive:', e);
          }
          return null;
        };

        const handleProofFileUpload = (event, targetObj = intakeForm) => {
          const file = event.target.files && event.target.files[0];
          if (file) processProofFile(file, targetObj);
        };

        const handleProofPaste = (event, targetObj = intakeForm) => {
          const clipboardData = event.clipboardData || (event.originalEvent && event.originalEvent.clipboardData);
          if (!clipboardData || !clipboardData.items) return;
          const items = clipboardData.items;
          for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
              const blob = items[i].getAsFile();
              if (blob) {
                processProofFile(blob, targetObj);
                event.preventDefault();
                break;
              }
            }
          }
        };

        const handleProofDrop = (event, targetObj = intakeForm) => {
          event.preventDefault();
          if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
            processProofFile(event.dataTransfer.files[0], targetObj);
          }
        };

        // --- SELLER ONE-WAY STATUS ALLOWED PIPELINE ---
        const getAllowedStatusesForUser = (currentStatus) => {
          if (!currentUser.value) return pipelineStages;
          if (currentUser.value.role === 'admin') return pipelineStages;
          const currIdx = pipelineStages.indexOf(currentStatus);
          if (currIdx === -1) return pipelineStages;
          return pipelineStages.slice(currIdx);
        };

        const advanceSellerStatus = (order) => {
          const currIdx = pipelineStages.indexOf(order.status);
          if (currIdx !== -1 && currIdx < pipelineStages.length - 1) {
            order.status = pipelineStages[currIdx + 1];
            order.updatedAt = getBstIsoString();
            order.updatedBy = currentUser.value?.username || 'seller';
            queueChange('orders', order);
            saveOrdersLocally();
          }
        };

        // --- DYNAMIC FACTORY PRIORITY ENGINE ---
        const rankedFactories = computed(() => {
          return factories.value.map(f => {
            const pendingCount = orders.value.filter(o => {
              const isThisFactory = o.factoryTag === f.name;
              const isPending = o.status !== 'Delivered' && o.status !== 'Returned Received';
              return isThisFactory && isPending;
            }).length;

            let stockScore = 30;
            if (f.stockStatus === 'Low Stock') stockScore = 15;
            if (f.stockStatus === 'Out of Stock') stockScore = -50;

            const qualityScore = (f.fabricQuality || 3) * 25;
            const priceFactor = Math.round((f.baseWholesaleCost || 35000) / 1000);
            const loadPenalty = pendingCount * 12;

            const totalScore = qualityScore + stockScore - priceFactor - loadPenalty;

            return {
              ...f,
              pendingCount,
              totalScore
            };
          }).sort((a, b) => b.totalScore - a.totalScore);
        });

        // --- CURRENCY FORMATTING ---
        const formatBDT = (amount) => {
          const val = Number(amount) || 0;
          return '৳' + val.toLocaleString('en-BD');
        };

        // --- AUTHENTICATION ---
        const handleLogin = async () => {
          loginError.value = '';
          isAuthenticating.value = true;
          
          let enteredUser = String(loginForm?.username || '').trim().toLowerCase();
          let enteredPass = String(loginForm?.password || '').trim();
          
          let user = users.value.find(u => u && String(u.username || '').trim().toLowerCase() === enteredUser && String(u.password || '').trim() === enteredPass);
          
          if (!user && appsScriptUrl.value) {
            try {
                if (!isPulling.value) {
                    await syncFromGoogleSheets(true);
                } else {
                    while (isPulling.value) {
                        await new Promise(r => setTimeout(r, 200));
                    }
                }
                user = users.value.find(u => u && String(u.username || '').trim().toLowerCase() === enteredUser && String(u.password || '').trim() === enteredPass);
            } catch(e) {
                console.error("Login fetch error:", e);
            }
          }
          
          isAuthenticating.value = false;

          if (!user) {
            loginError.value = 'Invalid username or password.';
            return;
          }
          if (!user.active) {
            loginError.value = 'Account is suspended. Contact Administrator.';
            return;
          }
          
          currentUser.value = user;
          localStorage.setItem('homeaura_session', JSON.stringify(user));
          activeTab.value = (user.role === 'admin' || user.role === 'marketer' || user.role === 'moderator') ? 'dashboard' : 'intake';
          loginForm.username = '';
          loginForm.password = '';
        };

        const handleLogout = () => {
          currentUser.value = null;
          localStorage.removeItem('homeaura_session');
        };

        // --- COMPUTED METRICS ---
        
        const dashboardFilter = reactive({
          dateRange: 'all',
          sellerId: 'all'
        });

                const filterOrdersForDashboard = (orderList) => {
          return orderList.filter(o => {
            // Apply seller filter
            if (dashboardFilter.sellerId !== 'all') {
              if (o.merchantId !== dashboardFilter.sellerId) return false;
            } else {
              // Exclude isolated users when viewing 'all'
              const seller = users.value.find(u => u.id === o.merchantId);
              if (seller && seller.excludeFromGlobalAnalytics) return false;
            }
            
            // Apply date filter
            if (dashboardFilter.dateRange !== 'all' && o.createdAt) {
              const orderDate = new Date(o.createdAt);
              const now = new Date();
              const orderBst = getBstDateString(orderDate);
              const nowBst = getBstDateString(now);
              if (dashboardFilter.dateRange === 'today') {
                if (orderBst !== nowBst) return false;
              } else if (dashboardFilter.dateRange === 'week') {
                const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                if (orderDate < oneWeekAgo) return false;
              } else if (dashboardFilter.dateRange === 'month') {
                if (orderBst.substring(0, 7) !== nowBst.substring(0, 7)) return false;
              }
            }
            return true;
          });
        };

        const metrics = computed(() => {
          const filteredOrders = filterOrdersForDashboard(orders.value);
          
          const calculateNetForOrder = (o) => {
            const total = o.totalAmount || 0;
            const deliveryExp = o.deliveryCharge || 0;
            let codExp = 0;
            if (o.codCharge !== undefined && o.codCharge !== null && o.codCharge > 0) {
              codExp = Number(o.codCharge);
            } else {
              codExp = Math.round(total * 0.01);
            }
            return total - (deliveryExp + codExp);
          };

          const grossRevenue = filteredOrders.reduce((acc, o) => acc + calculateNetForOrder(o), 0);
          const deliveredProductsRevenue = filteredOrders.filter(o => o.status === 'Delivered' || o.status === 'Partial Delivered').reduce((acc, o) => acc + calculateNetForOrder(o), 0);
          const deliveredCount = filteredOrders.filter(o => o.status === 'Delivered').length;
          const pendingCount = filteredOrders.filter(o => o.status !== 'Delivered' && o.status !== 'Returned Received').length;
          const urgentCount = filteredOrders.filter(o => o.urgent).length;
          return { grossRevenue, deliveredProductsRevenue, deliveredCount, pendingCount, urgentCount };
        });

        const sellersList = computed(() => users.value.filter(u => u && (u.role === 'seller' || u.role === 'moderator')));
        const globalSalesProgress = computed(() => {
          const allSellers = users.value.filter(u => u && u.role === 'seller');
          const target = allSellers.reduce((sum, u) => sum + (Number(u.target) || 0), 0);
          
          const now = new Date();
          // get current month using local Bangladesh time if possible, or just local ISO string
          const currentMonth = getBstIsoString().slice(0, 7); 
          const thisMonthOrders = orders.value.filter(o => o.timestamp && o.timestamp.startsWith(currentMonth) && o.status !== 'Void' && o.status !== 'Returned Received');
          
          const sales = thisMonthOrders.reduce((sum, o) => sum + (o.saleAmount || 0), 0);
          const percentage = target > 0 ? Math.min(100, Math.round((sales / target) * 100)) : 0;
          return { target, sales, percentage };
        });
        const dispatchDeskOrders = computed(() => {
          return orders.value.filter(o => o.status !== 'Delivered' && o.status !== 'Returned Received').sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        });

        
        const estimateSteadfastCharge = (order) => {
          let weight = 2; // Default for sofa covers
          const cat = (order.productCategory || '').toLowerCase();
          if (cat.includes('sofa') && !cat.includes('cover')) weight = 50;
          else if (cat.includes('bed')) weight = 80;
          else if (cat.includes('dining')) weight = 60;
          else if (cat.includes('wardrobe') || cat.includes('almirah')) weight = 70;
          
          const addr = (order.customerAddress || '').toLowerCase();
          let base = 130;
          let perKg = 20;
          if (addr.includes('dhaka') && !addr.includes('outside')) {
            if (addr.includes('savar') || addr.includes('gazipur') || addr.includes('keraniganj') || addr.includes('narayanganj')) {
              base = 100;
              perKg = 15;
            } else {
              base = 70;
              perKg = 10;
            }
          }
          
          return base + (weight - 1) * perKg;
        };

        const steadfastReport = computed(() => {
          let totalSales = 0;
          let totalDeliveryCollected = 0;
          let totalSteadfastCharge = 0;
          let totalCodCharge = 0;
          
          const filteredOrders = filterOrdersForDashboard(orders.value);
          const relevantOrders = filteredOrders.filter(o => o.status !== 'Void' && o.status !== 'Returned Received');
          
          relevantOrders.forEach(o => {
            totalSales += (Number(o.saleAmount) || 0);
            totalDeliveryCollected += (Number(o.deliveryCharge) || 0);
            
            const deliveryExp = o.deliveryCharge || 0;
            let codExp = 0;
            if (o.codCharge !== undefined && o.codCharge !== null && o.codCharge > 0) {
              codExp = Number(o.codCharge);
            } else {
              codExp = Math.round((o.totalAmount || 0) * 0.01);
            }
            
            totalSteadfastCharge += deliveryExp + codExp;
            totalCodCharge += codExp;
          });
          
          return {
            totalSales,
            totalDeliveryCollected,
            totalSteadfastCharge,
            totalCodCharge,
            profitOnDelivery: totalDeliveryCollected - totalSteadfastCharge
          };
        });

                const merchantStats = computed(() => {
          let visibleSellersList = sellersList.value;
          if (currentUser.value?.role === 'marketer' && currentUser.value?.visibleSellers) {
              visibleSellersList = sellersList.value.filter(s => currentUser.value.visibleSellers.includes(s.id));
          }
          // Also apply the dashboard filter for specific user, if active
          if (dashboardFilter.sellerId !== 'all') {
             visibleSellersList = visibleSellersList.filter(s => s.id === dashboardFilter.sellerId);
          } else {
             visibleSellersList = visibleSellersList.filter(s => !s.excludeFromGlobalAnalytics);
          }
          const filteredOrders = filterOrdersForDashboard(orders.value);
          return visibleSellersList.map(seller => {
            const sellerOrders = filteredOrders.filter(o => o.merchantName === seller.name || o.merchantId === seller.id);
            const totalSales = sellerOrders.reduce((acc, o) => acc + (Number(o.saleAmount) || 0), 0);
            const target = seller.target || 300000;
            const percentage = target > 0 ? Math.round((totalSales / target) * 100) : 0;
            return {
              username: seller?.username,
              name: seller.name,
              totalOrders: sellerOrders.length,
              totalSales,
              target,
              percentage
            };
          });
        });

        const factoryBillStats = computed(() => {
          const stats = {};
          factoryBills.value.forEach(bill => {
            if (!stats[bill.factoryId]) {
              stats[bill.factoryId] = { factoryId: bill.factoryId, factoryName: getFactoryName(bill.factoryId), totalAmount: 0, billCount: 0, orderCount: 0 };
            }
            stats[bill.factoryId].totalAmount += Number(bill.amount) || 0;
            stats[bill.factoryId].billCount += 1;
            stats[bill.factoryId].orderCount += (bill.linkedOrderIds || []).length;
          });
          return Object.values(stats).sort((a, b) => b.totalAmount - a.totalAmount);
        });

        
                const totalFactoryBillsAmount = computed(() => {
          let bills = factoryBills.value;
          
          if (dashboardFilter.sellerId !== 'all') {
            bills = bills.filter(b => b.sellerId === dashboardFilter.sellerId);
          } else {
            bills = bills.filter(b => {
              if (b.sellerId) {
                const seller = users.value.find(u => u.id === b.sellerId);
                if (seller && seller.excludeFromGlobalAnalytics) return false;
              }
              return true;
            });
          }

          if (dashboardFilter.dateRange !== 'all') {
            bills = bills.filter(b => {
              if (!b.date) return true;
              const d = new Date(b.date);
              const now = new Date();
              const dBst = getBstDateString(d);
              const nowBst = getBstDateString(now);
              if (dashboardFilter.dateRange === 'today') return dBst === nowBst;
              if (dashboardFilter.dateRange === 'week') return d >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              if (dashboardFilter.dateRange === 'month') return dBst.substring(0, 7) === nowBst.substring(0, 7);
              return true;
            });
          }
          return bills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
        });

        const totalOperationalExpenses = computed(() => {
          let exps = expenses.value;
          
          if (dashboardFilter.sellerId !== 'all') {
            exps = exps.filter(e => e.sellerId === dashboardFilter.sellerId);
          } else {
            exps = exps.filter(e => {
              if (e.sellerId) {
                const seller = users.value.find(u => u.id === e.sellerId);
                if (seller && seller.excludeFromGlobalAnalytics) return false;
              }
              return true;
            });
          }

          if (dashboardFilter.dateRange !== 'all') {
            exps = exps.filter(e => {
              if (!e.date) return true;
              const d = new Date(e.date);
              const now = new Date();
              const dBst = getBstDateString(d);
              const nowBst = getBstDateString(now);
              if (dashboardFilter.dateRange === 'today') return dBst === nowBst;
              if (dashboardFilter.dateRange === 'week') return d >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              if (dashboardFilter.dateRange === 'month') return dBst.substring(0, 7) === nowBst.substring(0, 7);
              return true;
            });
          }
          return exps.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        });

        const sellerBillStats = computed(() => {
          const stats = {};
          factoryBills.value.forEach(bill => {
            const linked = bill.linkedOrderIds || [];
            if (linked.length === 0) return;
            const costPerOrder = (Number(bill.amount) || 0) / linked.length;
            linked.forEach(oid => {
              const ord = orders.value.find(o => o.id === oid);
              if (ord) {
                if (!stats[ord.merchantId]) {
                  stats[ord.merchantId] = { merchantId: ord.merchantId, merchantName: ord.merchantName, totalCost: 0, linkedOrdersCount: 0 };
                }
                stats[ord.merchantId].totalCost += costPerOrder;
                stats[ord.merchantId].linkedOrdersCount += 1;
              }
            });
          });
          return Object.values(stats).sort((a, b) => b.totalCost - a.totalCost);
        });

        const myOrders = computed(() => {
          if (!currentUser.value) return [];
          return orders.value.filter(o => o.merchantName === currentUser.value.name || o.merchantId === currentUser.value.id);
        });

        const myOrdersCount = computed(() => myOrders.value.length);
        const myMonthlySales = computed(() => myOrders.value.reduce((acc, o) => acc + (o.saleAmount || 0), 0));
        const myTargetPercentage = computed(() => {
          const target = currentUser.value?.target || 300000;
          return target > 0 ? Math.round((myMonthlySales.value / target) * 100) : 0;
        });

        const filteredOrders = computed(() => {
          let result = orders.value.filter(o => {
            if (statusFilter.value !== 'ALL' && o.status !== statusFilter.value) return false;
            if (merchantFilter.value !== 'ALL' && o.merchantName !== merchantFilter.value) return false;
            if (factoryFilter.value !== 'ALL' && (o.factoryTag || '') !== factoryFilter.value) return false;
            if (urgentOnly.value && !o.urgent) return false;
            if (orderSearch.value) {
              const q = orderSearch.value.toLowerCase();
              return (
                o.id.toLowerCase().includes(q) ||
                o.customerName.toLowerCase().includes(q) ||
                o.customerPhone.includes(q) ||
                o.fabric.toLowerCase().includes(q)
              );
            }
            return true;
          });

          if (sortOption.value === 'NEWEST') {
            result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          } else if (sortOption.value === 'OLDEST') {
            result.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          } else if (sortOption.value === 'FACTORY') {
            result.sort((a, b) => {
              const fA = a.factoryTag || 'Z_Unassigned';
              const fB = b.factoryTag || 'Z_Unassigned';
              return fA.localeCompare(fB);
            });
          }

          return result;
        });

        // --- OMNI-CLIPBOARD PARSER ENGINE ---
        const parseClipboard = async () => {
          const text = clipboardRawText.value;
          const image = intakeForm.socialProofBase64 || '';
          if (!text && !image) return;
          
          parseSuccessMsg.value = `✨ Analyzing with Omni-Clipboard AI...`;
          
          try {
            const res = await fetch('/api/parse-clipboard', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ text, image })
            });
            
            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || 'Failed to parse');
            }
            
            const data = await res.json();
            
            let parsedCount = 0;
            const keys = [
              'customerName', 'customerPhone', 'customerAddress', 'trafficSource',
              'fabric', 'productCategory', 'seatConfig', 'fulfillmentMethod',
              'saleAmount', 'deliveryCharge', 'urgent', 'notes', 'cnNumber',
              'extraDetails', 'factoryTag'
            ];
            
            keys.forEach(k => {
              if (data[k] !== undefined && data[k] !== null && data[k] !== '') {
                intakeForm[k] = data[k];
                parsedCount++;
              }
            });
            
            parseSuccessMsg.value = `✨ AI successfully parsed ${parsedCount} fields!`;
            missingFieldsHighlight.value = true;
            setTimeout(() => { parseSuccessMsg.value = ''; }, 4000);
          } catch (err) {
            parseSuccessMsg.value = `❌ ${err.message || 'Failed to parse using AI.'}`;
            setTimeout(() => { parseSuccessMsg.value = ''; }, 4000);
          }
        };


        // --- HIGH-PERFORMANCE PNG CONVERTER & CLIPBOARD ENGINE ---
        const loadImageSafe = (url) => {
          return new Promise((resolve) => {
            if (!url || typeof url !== 'string' || !url.trim()) return resolve(null);
            const cleanUrl = url.trim();

            let timedOut = false;
            const timer = setTimeout(() => {
              timedOut = true;
              console.warn('[Image Load Timeout]', cleanUrl.slice(0, 60));
              resolve(null);
            }, 10000);

            const handleSuccess = (img) => {
              if (timedOut) return;
              clearTimeout(timer);
              if (img && img.naturalWidth > 1 && img.naturalHeight > 1) {
                resolve(img);
              } else {
                resolve(null);
              }
            };

            const handleFail = () => {
              if (timedOut) return;
              clearTimeout(timer);
              resolve(null);
            };

            // Direct loading for data and blob URLs
            if (cleanUrl.startsWith('data:') || cleanUrl.startsWith('blob:')) {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => handleSuccess(img);
              img.onerror = () => handleFail();
              img.src = cleanUrl;
              return;
            }

            // For remote URLs, proxy via backend to bypass CORS
            const proxyUrl = '/api/proxy-image?url=' + encodeURIComponent(cleanUrl);
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              if (img.naturalWidth > 1 && img.naturalHeight > 1) {
                handleSuccess(img);
              } else {
                // Try direct URL fallback if proxy returned a placeholder
                const directImg = new Image();
                directImg.crossOrigin = 'anonymous';
                directImg.onload = () => handleSuccess(directImg);
                directImg.onerror = () => handleFail();
                directImg.src = cleanUrl;
              }
            };
            img.onerror = () => {
              // Direct URL fallback on proxy error
              const directImg = new Image();
              directImg.crossOrigin = 'anonymous';
              directImg.onload = () => handleSuccess(directImg);
              directImg.onerror = () => handleFail();
              directImg.src = cleanUrl;
            };
            img.src = proxyUrl;
          });
        };

        const writePngBlobToClipboard = async (pngBlob, textMsg = '') => {
          if (!pngBlob) return false;
          try {
            // Chrome strictly requires type matching. If we have a JPEG, try to force it as PNG or use its actual type.
            let blobType = pngBlob.type;
            if (blobType !== 'image/png') {
              // Attempt to recreate as PNG blob if possible, otherwise use original type
              pngBlob = new Blob([pngBlob], { type: 'image/png' });
              blobType = 'image/png';
            }
            
            if (navigator.clipboard && navigator.clipboard.write && window.ClipboardItem) {
              const items = { [blobType]: pngBlob };
              if (textMsg) {
                items['text/plain'] = new Blob([textMsg], { type: 'text/plain' });
              }
              await navigator.clipboard.write([
                new ClipboardItem(items)
              ]);
              return true;
            }
            return false;
          } catch (err) {
            console.warn('Direct clipboard write failed:', err);
            return false;
          }
        };

        const generateOrdersCompositePng = async (ordersList, headerTitle = 'HOMEAURA PRODUCTION DISPATCH') => {
          if (!ordersList || ordersList.length === 0) return null;

          // SPECIAL HIGH-DEFINITION RENDERING FOR SINGLE ORDER SUBMISSION
          if (ordersList.length === 1) {
            const ord = ordersList[0];
            const collageSource = ord.collagePhotoLocalUrl || ord.collagePhotoUrl;
            const proofSource = ord.socialProofLocalUrl || ord.socialProofUrl;
            const collageImg = collageSource ? await loadImageSafe(collageSource) : null;
            const proofImg = proofSource ? await loadImageSafe(proofSource) : null;

            const canvasWidth = 1120;
            const padding = 28;
            const headerHeight = 96;
            const specHeight = 160;
            const footerHeight = 44;

            // Calculate height of image region
            let imageSectionHeight = 0;
            const hasBoth = !!(collageImg && proofImg);
            const hasAny = !!(collageImg || proofImg);

            if (hasBoth) {
              const halfWidth = (canvasWidth - padding * 3) / 2;
              const aspect1 = collageImg.height / collageImg.width;
              const aspect2 = proofImg.height / proofImg.width;
              const h1 = Math.min(Math.max(halfWidth * aspect1, 380), 750);
              const h2 = Math.min(Math.max(halfWidth * aspect2, 380), 750);
              imageSectionHeight = Math.max(h1, h2) + 50; // extra for photo titles
            } else if (hasAny) {
              const targetImg = collageImg || proofImg;
              const targetWidth = canvasWidth - padding * 2;
              const aspect = targetImg.height / targetImg.width;
              imageSectionHeight = Math.min(Math.max(targetWidth * aspect, 420), 850) + 50;
            } else {
              imageSectionHeight = 120;
            }

            const totalHeight = headerHeight + specHeight + imageSectionHeight + footerHeight + padding * 3;

            const canvas = document.createElement('canvas');
            canvas.width = canvasWidth;
            canvas.height = totalHeight;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Dark Luxury Background (#090d16)
            ctx.fillStyle = '#090d16';
            ctx.fillRect(0, 0, canvasWidth, totalHeight);

            // Top Gradient Accent Line
            const grad = ctx.createLinearGradient(0, 0, canvasWidth, 0);
            grad.addColorStop(0, '#6366f1');
            grad.addColorStop(0.5, '#06b6d4');
            grad.addColorStop(1, '#10b981');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvasWidth, 5);

            // Master Header Container
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.roundRect(padding, padding, canvasWidth - padding * 2, headerHeight, 14);
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#1e293b';
            ctx.stroke();

            // Brand & Order Badge
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 22px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
            ctx.fillText('✨ HOMEAURA LUXURY FURNITURE', padding + 20, padding + 38);

            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 13px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
            ctx.fillText(`ORDER MANIFEST: ${ord.id} • ${ord.fabric || 'CUSTOM SPEC'}`, padding + 20, padding + 64);

            // Order ID / Urgent pill on right
            const pillX = canvasWidth - padding - 210;
            ctx.fillStyle = ord.urgent ? '#e11d48' : '#4f46e5';
            ctx.beginPath();
            ctx.roundRect(pillX, padding + 22, 190, 48, 10);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 15px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
            ctx.textAlign = 'center';
            ctx.fillText(ord.id, pillX + 95, padding + 44);
            ctx.font = '10px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
            ctx.fillText(ord.urgent ? '🚨 URGENT RUSH ORDER' : `MERCHANT: ${ord.merchantName || 'SELLER'}`, pillX + 95, padding + 60);
            ctx.textAlign = 'left';

            // Specification Grid Card
            const specY = padding + headerHeight + 16;
            ctx.fillStyle = '#111827';
            ctx.beginPath();
            ctx.roundRect(padding, specY, canvasWidth - padding * 2, specHeight, 14);
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#1e293b';
            ctx.stroke();

            const colWidth = (canvasWidth - padding * 2) / 4;

            // Column 1: Client
            ctx.fillStyle = '#94a3b8';
            ctx.font = 'bold 10px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
            ctx.fillText('👤 CUSTOMER INFORMATION', padding + 16, specY + 28);
            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 14px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
            ctx.fillText(ord.customerName || 'N/A', padding + 16, specY + 50);
            ctx.fillStyle = '#38bdf8';
            ctx.font = '12px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
            ctx.fillText(ord.customerPhone || 'N/A', padding + 16, specY + 70);
            ctx.fillStyle = '#cbd5e1';
            ctx.font = '11px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
            const addr = ord.customerAddress || 'N/A';
            ctx.fillText(addr.length > 36 ? addr.slice(0, 34) + '...' : addr, padding + 16, specY + 92);
            ctx.fillStyle = '#64748b';
            ctx.font = '10px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
            ctx.fillText(`Source: ${ord.trafficSource || 'Direct'}`, padding + 16, specY + 114);

            // Column 2: Product & Config
            ctx.fillStyle = '#94a3b8';
            ctx.font = 'bold 10px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
            ctx.fillText('🛋️ PRODUCT SPECIFICATION', padding + colWidth + 10, specY + 28);
            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 14px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
            ctx.fillText(`${ord.productCategory || 'Sofa'}`, padding + colWidth + 10, specY + 50);
            ctx.fillStyle = '#a78bfa';
            ctx.font = 'bold 12px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
            ctx.fillText(`Fabric: ${ord.fabric || 'N/A'}`, padding + colWidth + 10, specY + 70);
            ctx.fillStyle = '#cbd5e1';
            ctx.font = '11px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
            ctx.fillText(`Config: ${ord.seatConfig || 'Standard'}`, padding + colWidth + 10, specY + 92);
            ctx.fillStyle = '#64748b';
            ctx.font = '10px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
            ctx.fillText(`Fulfillment: ${ord.fulfillmentMethod || 'Delivery'}`, padding + colWidth + 10, specY + 114);

            // Column 3: Pricing
            ctx.fillStyle = '#94a3b8';
            ctx.font = 'bold 10px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
            ctx.fillText('💵 FINANCIAL BREAKDOWN', padding + colWidth * 2 + 10, specY + 28);
            ctx.fillStyle = '#cbd5e1';
            ctx.font = '12px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
            ctx.fillText(`Sale Price: ৳${(ord.saleAmount || 0).toLocaleString()}`, padding + colWidth * 2 + 10, specY + 50);
            ctx.fillText(`Delivery: ৳${(ord.deliveryCharge || 0).toLocaleString()}`, padding + colWidth * 2 + 10, specY + 70);
            ctx.fillStyle = '#34d399';
            ctx.font = 'bold 16px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
            ctx.fillText(`TOTAL: ৳${(ord.totalAmount || 0).toLocaleString()}`, padding + colWidth * 2 + 10, specY + 98);
            ctx.fillStyle = '#64748b';
            ctx.font = '10px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
            ctx.fillText(`Status: ${ord.status || 'Active'}`, padding + colWidth * 2 + 10, specY + 120);

            // Column 4: Tracking & Notes
            ctx.fillStyle = '#94a3b8';
            ctx.font = 'bold 10px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
            ctx.fillText('📑 LOGISTICS & NOTES', padding + colWidth * 3 + 10, specY + 28);
            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 11px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
            ctx.fillText(`CN: ${ord.cnNumber || 'N/A'}`, padding + colWidth * 3 + 10, specY + 50);
            if (ord.extraDetails) {
              ctx.fillStyle = '#fbbf24';
              ctx.font = '10px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
              ctx.fillText(`Specs: ${ord.extraDetails.slice(0, 30)}`, padding + colWidth * 3 + 10, specY + 88);
            }
            if (ord.notes) {
              ctx.fillStyle = '#94a3b8';
              ctx.font = 'italic 10px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
              ctx.fillText(`Note: ${ord.notes.slice(0, 30)}`, padding + colWidth * 3 + 10, specY + 108);
            }

            // Image Render Area
            const imgY = specY + specHeight + 16;

            if (hasBoth) {
              const cardW = (canvasWidth - padding * 3) / 2;
              const maxH = imageSectionHeight - 40;

              // Left: Product & Fabric Collage Photo
              ctx.fillStyle = '#1e293b';
              ctx.beginPath();
              ctx.roundRect(padding, imgY, cardW, imageSectionHeight, 14);
              ctx.fill();
              ctx.strokeStyle = '#334155';
              ctx.stroke();

              ctx.fillStyle = '#6366f1';
              ctx.beginPath();
              ctx.roundRect(padding + 12, imgY + 12, 170, 24, 6);
              ctx.fill();
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 11px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
              ctx.fillText('📸 PRODUCT COLLAGE', padding + 20, imgY + 28);

              ctx.save();
              ctx.beginPath();
              ctx.roundRect(padding + 10, imgY + 44, cardW - 20, maxH - 12, 10);
              ctx.clip();
              // Calculate draw bounds preserving aspect ratio
              const imgW = cardW - 20;
              const imgH = maxH - 12;
              const aspect = collageImg.width / collageImg.height;
              let dw = imgW;
              let dh = imgW / aspect;
              if (dh > imgH) {
                dh = imgH;
                dw = imgH * aspect;
              }
              const dx = (padding + 10) + (imgW - dw) / 2;
              const dy = (imgY + 44) + (imgH - dh) / 2;
              ctx.fillStyle = '#0f172a';
              ctx.fillRect(padding + 10, imgY + 44, imgW, imgH);
              ctx.drawImage(collageImg, dx, dy, dw, dh);
              ctx.restore();

              // Right: Social Proof Screenshot
              const rightX = padding * 2 + cardW;
              ctx.fillStyle = '#1e293b';
              ctx.beginPath();
              ctx.roundRect(rightX, imgY, cardW, imageSectionHeight, 14);
              ctx.fill();
              ctx.strokeStyle = '#334155';
              ctx.stroke();

              ctx.fillStyle = '#059669';
              ctx.beginPath();
              ctx.roundRect(rightX + 12, imgY + 12, 190, 24, 6);
              ctx.fill();
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 11px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
              ctx.fillText('💬 CHAT & SOCIAL PROOF', rightX + 20, imgY + 28);

              ctx.save();
              ctx.beginPath();
              ctx.roundRect(rightX + 10, imgY + 44, cardW - 20, maxH - 12, 10);
              ctx.clip();
              const pImgW = cardW - 20;
              const pImgH = maxH - 12;
              const pAspect = proofImg.width / proofImg.height;
              let pdw = pImgW;
              let pdh = pImgW / pAspect;
              if (pdh > pImgH) {
                pdh = pImgH;
                pdw = pImgH * pAspect;
              }
              const pdx = (rightX + 10) + (pImgW - pdw) / 2;
              const pdy = (imgY + 44) + (pImgH - pdh) / 2;
              ctx.fillStyle = '#0f172a';
              ctx.fillRect(rightX + 10, imgY + 44, pImgW, pImgH);
              ctx.drawImage(proofImg, pdx, pdy, pdw, pdh);
              ctx.restore();

            } else if (hasAny) {
              const targetImg = collageImg || proofImg;
              const isCollage = !!collageImg;
              const cardW = canvasWidth - padding * 2;
              const maxH = imageSectionHeight - 40;

              ctx.fillStyle = '#1e293b';
              ctx.beginPath();
              ctx.roundRect(padding, imgY, cardW, imageSectionHeight, 14);
              ctx.fill();
              ctx.strokeStyle = '#334155';
              ctx.stroke();

              ctx.fillStyle = isCollage ? '#6366f1' : '#059669';
              ctx.beginPath();
              ctx.roundRect(padding + 14, imgY + 12, 200, 24, 6);
              ctx.fill();
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 11px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
              ctx.fillText(isCollage ? '📸 PRODUCT COLLAGE PHOTO' : '💬 SOCIAL PROOF SCREENSHOT', padding + 22, imgY + 28);

              ctx.save();
              ctx.beginPath();
              ctx.roundRect(padding + 10, imgY + 44, cardW - 20, maxH - 12, 10);
              ctx.clip();
              const sImgW = cardW - 20;
              const sImgH = maxH - 12;
              const sAspect = targetImg.width / targetImg.height;
              let sdw = sImgW;
              let sdh = sImgW / sAspect;
              if (sdh > sImgH) {
                sdh = sImgH;
                sdw = sImgH * sAspect;
              }
              const sdx = (padding + 10) + (sImgW - sdw) / 2;
              const sdy = (imgY + 44) + (sImgH - sdh) / 2;
              ctx.fillStyle = '#0f172a';
              ctx.fillRect(padding + 10, imgY + 44, sImgW, sImgH);
              ctx.drawImage(targetImg, padding + 10, imgY + 44, cardW - 20, maxH - 12);
              ctx.restore();
            } else {
              // No image fallback container
              const cardW = canvasWidth - padding * 2;
              ctx.fillStyle = '#111827';
              ctx.beginPath();
              ctx.roundRect(padding, imgY, cardW, imageSectionHeight, 14);
              ctx.fill();
              ctx.fillStyle = '#94a3b8';
              ctx.font = 'italic 13px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
              ctx.fillText('ℹ️ No image attachments uploaded for this order manifest.', padding + 24, imgY + 65);
            }

            // Bottom Footer
            const footY = totalHeight - footerHeight;
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, footY, canvasWidth, footerHeight);

            ctx.fillStyle = '#64748b';
            ctx.font = '11px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
            ctx.fillText(`🕒 Verified Bangladesh Time (BST, UTC+6): ${formatBangladeshDisplayTime(new Date())} | HomeAura Production Hub`, padding, footY + 26);

            return new Promise((resolve) => {
              canvas.toBlob((blob) => {
                resolve({
                  blob,
                  dataUrl: canvas.toDataURL('image/png'),
                  itemsCount: (collageImg ? 1 : 0) + (proofImg ? 1 : 0)
                });
              }, 'image/png');
            });
          }

          // MULTI-ORDER BULK DISPATCH GRID RENDERING
          const items = [];
          for (const ord of ordersList) {
            const urls = [];
            // For Factory Bulk Dispatch, only include the Product Collage Photo
            // Exclude Social Proof to keep the factory manifest focused and clean
            if (ord.collagePhotoUrl) urls.push({ type: 'Collage Photo', url: ord.collagePhotoLocalUrl || ord.collagePhotoUrl, filename: ord.collagePhotoFileName });

            if (urls.length === 0) {
              items.push({
                order: ord,
                type: 'Order Spec Card',
                img: null
              });
            } else {
              for (const u of urls) {
                const loaded = await loadImageSafe(u.url);
                items.push({
                  order: ord,
                  type: u.type,
                  img: loaded
                });
              }
            }
          }

          if (items.length === 0) return null;

          const cardWidth = 600;
          const padding = 24;
          const masterHeaderHeight = 96;
          const cardHeaderHeight = 64;
          const numItems = items.length;

          let cols = 1;
          if (numItems >= 7) cols = 3;
          else if (numItems >= 3) cols = 2;
          else cols = numItems === 1 ? 1 : 2;

          const rows = Math.ceil(numItems / cols);

          const cardHeights = items.map(item => {
            if (!item.img) return 240;
            const aspect = item.img.height / item.img.width;
            const imgH = Math.min(Math.max(cardWidth * aspect, 280), 750);
            return imgH + cardHeaderHeight + 20;
          });

          const rowHeights = [];
          for (let r = 0; r < rows; r++) {
            let maxH = 0;
            for (let c = 0; c < cols; c++) {
              const idx = r * cols + c;
              if (idx < numItems) {
                maxH = Math.max(maxH, cardHeights[idx]);
              }
            }
            rowHeights.push(maxH);
          }

          const totalWidth = cols * cardWidth + (cols + 1) * padding;
          const totalHeight = masterHeaderHeight + rowHeights.reduce((a, b) => a + b, 0) + (rows + 1) * padding;

          const canvas = document.createElement('canvas');
          canvas.width = totalWidth;
          canvas.height = totalHeight;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Dark slate luxury canvas background
          ctx.fillStyle = '#090d16';
          ctx.fillRect(0, 0, totalWidth, totalHeight);

          // Master Banner Header
          ctx.fillStyle = '#111827';
          ctx.fillRect(0, 0, totalWidth, masterHeaderHeight);

          // Top Vibrant Accent Line
          const grad = ctx.createLinearGradient(0, 0, totalWidth, 0);
          grad.addColorStop(0, '#6366f1');
          grad.addColorStop(0.5, '#06b6d4');
          grad.addColorStop(1, '#10b981');
          ctx.fillStyle = grad;
          ctx.fillRect(0, masterHeaderHeight - 5, totalWidth, 5);

          // Master Header Text
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 24px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
          ctx.fillText(`✨ ${headerTitle}`, padding + 4, 42);

          ctx.fillStyle = '#94a3b8';
          ctx.font = '13px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
          const subText = `Batch: ${ordersList.length} Order(s) | Attached Collages: ${numItems} Image(s) | Bangladesh Time: ${formatBangladeshDisplayTime(new Date())}`;
          ctx.fillText(subText, padding + 4, 70);

          // Render Cards
          let currentY = masterHeaderHeight + padding;
          for (let r = 0; r < rows; r++) {
            const rowH = rowHeights[r];
            for (let c = 0; c < cols; c++) {
              const idx = r * cols + c;
              if (idx >= numItems) break;

              const item = items[idx];
              const cardX = padding + c * (cardWidth + padding);
              const cardY = currentY;
              const thisCardH = cardHeights[idx];
              const ord = item.order;

              // Card Background
              ctx.fillStyle = '#1e293b';
              ctx.beginPath();
              ctx.roundRect(cardX, cardY, cardWidth, thisCardH, 14);
              ctx.fill();
              ctx.lineWidth = 1.5;
              ctx.strokeStyle = '#334155';
              ctx.stroke();

              // Card Header Top Area
              ctx.fillStyle = '#0f172a';
              ctx.beginPath();
              ctx.roundRect(cardX, cardY, cardWidth, cardHeaderHeight, [14, 14, 0, 0]);
              ctx.fill();

              // Order ID & Design Code
              ctx.fillStyle = '#38bdf8';
              ctx.font = 'bold 15px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
              ctx.fillText(`📦 ${ord.id} - ${ord.fabric || 'No Fabric'}`, cardX + 16, cardY + 26);

              // Secondary details line
              ctx.fillStyle = '#cbd5e1';
              ctx.font = '12px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
              const detailStr = `Item: ${ord.productCategory || 'N/A'} (${ord.seatConfig || ''}) | Specs: ${ord.extraDetails || 'Standard'}`;
              ctx.fillText(detailStr.length > 50 ? detailStr.slice(0, 48) + '...' : detailStr, cardX + 16, cardY + 48);

              // Type Tag Badge
              ctx.fillStyle = item.type.includes('Collage') ? '#4f46e5' : (item.type.includes('Proof') ? '#059669' : '#475569');
              ctx.beginPath();
              ctx.roundRect(cardX + cardWidth - 120, cardY + 14, 106, 24, 6);
              ctx.fill();
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 11px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
              ctx.fillText(item.type, cardX + cardWidth - 110, cardY + 30);

              // Image Area
              const imgAreaX = cardX + 12;
              const imgAreaY = cardY + cardHeaderHeight + 8;
              const imgAreaW = cardWidth - 24;
              const imgAreaH = thisCardH - cardHeaderHeight - 20;

              if (item.img) {
                ctx.save();
                ctx.beginPath();
                ctx.roundRect(imgAreaX, imgAreaY, imgAreaW, imgAreaH, 10);
                ctx.clip();
                ctx.drawImage(item.img, imgAreaX, imgAreaY, imgAreaW, imgAreaH);
                ctx.restore();
              } else {
                ctx.fillStyle = '#0f172a';
                ctx.beginPath();
                ctx.roundRect(imgAreaX, imgAreaY, imgAreaW, imgAreaH, 10);
                ctx.fill();
                ctx.fillStyle = '#94a3b8';
                ctx.font = 'italic 13px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
                ctx.fillText('No image attachment uploaded', imgAreaX + 18, imgAreaY + 36);
                ctx.fillStyle = '#e2e8f0';
                ctx.font = '12px Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
                ctx.fillText(`Phone: ${ord.customerPhone || 'N/A'}`, imgAreaX + 18, imgAreaY + 66);
                ctx.fillText(`Address: ${ord.customerAddress || 'N/A'}`, imgAreaX + 18, imgAreaY + 90);
                if (ord.extraDetails) ctx.fillText(`Specs: ${ord.extraDetails}`, imgAreaX + 18, imgAreaY + 114);
              }
            }
            currentY += rowH + padding;
          }

          return new Promise((resolve) => {
            canvas.toBlob((blob) => {
              resolve({
                blob,
                dataUrl: canvas.toDataURL('image/png'),
                itemsCount: numItems
              });
            }, 'image/png');
          });
        };

        const copyBothPhotosToClipboard = async (url1, url2, orderObj = null) => {
          return { success: false, result: null };
        };
        const fetchImageAsBlob = async (url) => {
          if (!url) return null;
          
          if (!url.startsWith('blob:') && !url.startsWith('data:')) {
            const cachedBlob = await getImageFromIDB(url);
            if (cachedBlob) return cachedBlob;
          }

          try {
            const proxyUrl = url.startsWith('data:') || url.startsWith('blob:') ? url : '/api/proxy-image?url=' + encodeURIComponent(url);
            const res = await fetch(proxyUrl);
            if (!res.ok) throw new Error("Fetch failed");
            let blob = await res.blob();
            if (blob.type !== 'image/png') {
              blob = await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                  const canvas = document.createElement("canvas");
                  canvas.width = img.width;
                  canvas.height = img.height;
                  const ctx = canvas.getContext("2d");
                  ctx.drawImage(img, 0, 0);
                  canvas.toBlob((b) => {
                    resolve(b || blob);
                  }, "image/png");
                };
                img.onerror = () => resolve(blob);
                const reader = new FileReader();
                reader.onloadend = () => { img.src = reader.result; };
                reader.readAsDataURL(blob);
              });
            }
            if (!url.startsWith('blob:') && !url.startsWith('data:')) {
              await saveImageToIDB(url, blob);
            }
            return blob;
          } catch (e) {
            console.warn("Fetch failed, trying canvas fallback:", url);
            return new Promise((resolve) => {
              const proxyUrl = url.startsWith('data:') || url.startsWith('blob:') ? url : '/api/proxy-image?url=' + encodeURIComponent(url);
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(async (b) => {
                  if (b && !url.startsWith('blob:') && !url.startsWith('data:')) {
                    await saveImageToIDB(url, b);
                  }
                  resolve(b);
                }, "image/png");
              };
              img.onerror = () => resolve(null);
              img.src = proxyUrl;
            });
          }
        };

        const writeMultipleBlobsToClipboard = async (blobs, textMsg = '') => {
          const validBlobs = blobs.filter(b => b);
          if (validBlobs.length === 0) {
            if (textMsg) {
              await navigator.clipboard.writeText(textMsg);
              return true;
            }
            return false;
          }
          try {
            let copied = false;
            const copyHandler = (e) => {
              validBlobs.forEach((b, i) => {
                e.clipboardData.items.add(new File([b], `image_${i}.png`, { type: b.type || 'image/png' }));
              });
              if (textMsg) e.clipboardData.setData('text/plain', textMsg);
              e.preventDefault();
              copied = true;
            };
            document.addEventListener('copy', copyHandler, { once: true });
            document.execCommand('copy');
            if (copied) return true;
          } catch (e) {
            console.warn('execCommand copy failed, falling back to Clipboard API', e);
          }
          try {
            if (navigator.clipboard && navigator.clipboard.write && window.ClipboardItem) {
               let b = validBlobs[0];
               let blobType = b.type;
               if (blobType !== 'image/png') {
                 b = new Blob([b], { type: 'image/png' });
                 blobType = 'image/png';
               }
               const items = { [blobType]: b };
               if (textMsg) items['text/plain'] = new Blob([textMsg], { type: 'text/plain' });
               await navigator.clipboard.write([new ClipboardItem(items)]);
               return true;
            }
          } catch (e) {
            console.warn('Clipboard API write failed', e);
          }
          return false;
        };
        const submitNewOrder = async () => {
          if (intakeForm.isUploadingCollage || intakeForm.isUploadingProof) {
            alert('Please wait for the image uploads to complete before submitting the order.');
            return;
          }
          missingFieldsHighlight.value = false;
          const nextOrderNum = nextUpcomingOrderNum.value;
          const newId = nextUpcomingOrderId.value;
          const timestamp = getBstIsoString();
          const sellerUsername = currentUser.value ? currentUser.value?.username : 'seller';
          const autoCn = intakeForm.cnNumber || ("CN-" + nextOrderNum);
          const dateStr = getBangladeshDateString(new Date());
          const autoFileName = intakeForm.collagePhotoFileName || `collage_attachments/${sellerUsername}_${autoCn.replace(/[^a-zA-Z0-9-]/g, '')}_${dateStr}.jpg`;
          
          const normalizedPhone = normalizeCustomerPhone(intakeForm.customerPhone) || intakeForm.customerPhone;
          
          const saleAmountItems = Number(intakeForm.saleAmount) || 0;
          const initialDeliveryCharge = Number(intakeForm.deliveryCharge) || 0;
          const totalOrderPrice = saleAmountItems + initialDeliveryCharge;

          const newOrder = {
            id: newId,
            timestamp,
            merchantId: currentUser.value.id,
            merchantName: currentUser.value.name,
            customerName: intakeForm.customerName,
            customerPhone: normalizedPhone,
            customerAddress: intakeForm.customerAddress,
            trafficSource: intakeForm.trafficSource,
            fabric: intakeForm.fabric,
            productCategory: intakeForm.productCategory,
            seatConfig: intakeForm.seatConfig,
            fulfillmentMethod: intakeForm.fulfillmentMethod,
            saleAmount: saleAmountItems,
            deliveryCharge: initialDeliveryCharge,
            totalAmount: totalOrderPrice,
            status: 'Confirmation Call',
            urgent: intakeForm.urgent,
            notes: intakeForm.notes,
            cnNumber: autoCn,
            collagePhotoUrl: intakeForm.collagePhotoUrl || '',
            collagePhotoLocalUrl: intakeForm.collagePhotoLocalUrl || '',
            collagePhotoFileName: intakeForm.collagePhotoFileName || autoFileName,
            collageUploadToken: intakeForm.collageUploadToken || '',
            socialProofUrl: intakeForm.socialProofUrl || '',
            socialProofLocalUrl: intakeForm.socialProofLocalUrl || '',
            socialProofFileName: intakeForm.socialProofFileName || '',
            proofUploadToken: intakeForm.proofUploadToken || '',
            extraDetails: intakeForm.extraDetails || '',
            factoryTag: intakeForm.factoryTag || '',
            updatedAt: getBstIsoString(),
            updatedBy: currentUser.value ? currentUser.value?.username : 'seller'
          };

          // Attach cached Steadfast Fraud Assessment if already known
          const existingFraud = getFraudData(normalizedPhone);
          if (existingFraud) {
            newOrder.fraudData = existingFraud;
            newOrder.fraudStatus = existingFraud.riskLabel || '';
          }
          
          const proofUrlToCopy = intakeForm.socialProofUrl;
          const collageUrlToCopy = intakeForm.collagePhotoUrl;
          
          orders.value.unshift(newOrder);
          queueChange('orders', newOrder);
          saveOrdersLocally();
          triggerAutoSync(true);
          if (newOrder.cnNumber) {
            fetchSfcStatus(newOrder, true);
          }
          if (newOrder.customerPhone) {
            fetchFraudCheck(newOrder.customerPhone, true);
          }

          // Reset intake form
          intakeForm.customerName = '';
          intakeForm.customerPhone = '';
          intakeForm.customerAddress = '';
          intakeForm.fabric = '';
          intakeForm.saleAmount = 0;
          intakeForm.deliveryCharge = 0;
          intakeForm.urgent = false;
          intakeForm.notes = '';
          intakeForm.cnNumber = '';
          intakeForm.collagePhotoUrl = '';
          intakeForm.collagePhotoLocalUrl = '';
          intakeForm.collagePhotoFileName = '';
          intakeForm.collageUploadToken = '';
          intakeForm.isUploadingCollage = false;
          intakeForm.socialProofUrl = '';
          intakeForm.socialProofLocalUrl = '';
          intakeForm.socialProofFileName = '';
          intakeForm.proofUploadToken = '';
          intakeForm.isUploadingProof = false;
          intakeForm.extraDetails = '';
          intakeForm.factoryTag = '';
          clipboardRawText.value = '';
          activeTab.value = 'my_orders';
          
          let waText = `📦 *NEW HOMEAURA ORDER SUBMISSION*
`;
          waText += `━━━━━━━━━━━━━━━━━━━━━
`;
          waText += `🆔 *Order Ref:* ${newOrder.id}
`;
          waText += `👤 *Merchant:* ${newOrder.merchantName}
`;
          waText += `📞 *Customer:* ${newOrder.customerName} (${newOrder.customerPhone})
`;
          waText += `📍 *Delivery Address:* ${newOrder.customerAddress}
`;
          waText += `🛋️ *Item:* ${newOrder.productCategory} (${newOrder.fabric}) (${newOrder.seatConfig})
`;
          waText += `🚚 *Fulfillment:* ${newOrder.fulfillmentMethod}
`;
          waText += `💵 *Total Payable:* ৳${(newOrder.totalAmount || 0).toLocaleString()} (Sale: ৳${(newOrder.saleAmount || 0).toLocaleString()} + Del: ৳${(newOrder.deliveryCharge || 0).toLocaleString()})
`;
          waText += `📑 *CN:* ${newOrder.cnNumber || 'N/A'}
`;
          if (newOrder.notes) waText += `📝 *Notes:* ${newOrder.notes}
`;
          if (newOrder.extraDetails) waText += `🔍 *Specs:* ${newOrder.extraDetails}
`;
          if (newOrder.collagePhotoUrl) waText += `🖼️ *Product Photo:* ${newOrder.collagePhotoUrl}
`;
          if (newOrder.socialProofUrl) waText += `📸 *Payment/Proof:* ${newOrder.socialProofUrl}
`;
          waText += `━━━━━━━━━━━━━━━━━━━━━
`;
          waText += `🕒 *Registered (BST):* ${formatBangladeshDisplayTime(new Date())}
`;



          orderSuccessData.order = newOrder;
          orderSuccessData.hasCopiedPhotos = false;
          orderSuccessData.compositePngUrl = "";
          orderSuccessData.previewPngUrl = "";
          orderSuccessData.compositePngBlob = null;
          orderSuccessData.waGroupLink = (adminWaGroupLink.value || '').trim() || DEFAULT_WA_GROUP_LINK;
          orderSuccessData.formattedSummary = waText;
          orderSuccessData.isCopiedText = false;
          activeModal.value = 'orderSuccessModal';

          // Promise-based clipboard write to preserve user gesture
          let resolveClipboard, rejectClipboard;
          const clipboardPromise = new Promise((resolve, reject) => {
            resolveClipboard = resolve;
            rejectClipboard = reject;
          });
          
          let clipboardWriteStarted = false;
          try {
            if (navigator.clipboard && navigator.clipboard.write && window.ClipboardItem) {
              navigator.clipboard.write([
                new ClipboardItem({ 'image/png': clipboardPromise })
              ]).then(() => {
                 orderSuccessData.hasCopiedPhotos = true;
              }).catch(err => {
                 console.warn('Deferred clipboard write failed:', err);
              });
              clipboardWriteStarted = true;
            }
          } catch(e) {
            console.warn('Synchronous clipboard init failed:', e);
          }

          try {
            const compositeData = await generateOrdersCompositePng([newOrder], 'HOMEAURA NEW ORDER REGISTRATION');
            if (compositeData && compositeData.blob) {
              orderSuccessData.compositePngBlob = compositeData.blob;
              orderSuccessData.previewBlob = compositeData.blob;
              orderSuccessData.compositePngUrl = compositeData.dataUrl;
              orderSuccessData.previewPngUrl = compositeData.dataUrl;
              if (clipboardWriteStarted) resolveClipboard(compositeData.blob);
            } else {
              orderSuccessData.previewPngUrl = 'FAILED';
              orderSuccessData.compositePngUrl = 'FAILED';
              if (clipboardWriteStarted) rejectClipboard('No image');
            }
          } catch (e) {
            console.warn('Failed to auto-generate order PNG:', e);
            orderSuccessData.previewPngUrl = 'FAILED';
            orderSuccessData.compositePngUrl = 'FAILED';
            if (clipboardWriteStarted) rejectClipboard(e);
          }

          // Attempt pop-up opening if configured
          const targetWaUrl = orderSuccessData.waGroupLink;
          if (targetWaUrl) {
            try {
              window.open(targetWaUrl, '_blank');
            } catch (e) {}
          }
        };

        const quickStatusChange = (order, newStatus) => {
          if (currentUser.value?.role === 'seller' && order.merchantName !== currentUser.value?.name && order.merchantId !== currentUser.value?.id) {
            alert("⚠️ Security restriction: You cannot update status of orders assigned to other merchants.");
            return;
          }
          order.status = newStatus;
          order.updatedAt = getBstIsoString();
          order.updatedBy = currentUser.value?.username || 'seller';
          queueChange('orders', order);
          saveOrdersLocally();
        };

        const toggleUrgent = (order) => {
          if (currentUser.value?.role === 'seller' && order.merchantName !== currentUser.value?.name && order.merchantId !== currentUser.value?.id) {
            alert("⚠️ Security restriction: You cannot update orders assigned to other merchants.");
            return;
          }
          order.urgent = !order.urgent;
          order.updatedAt = getBstIsoString();
          order.updatedBy = currentUser.value?.username || 'seller';
          queueChange('orders', order);
          saveOrdersLocally();
        };

        // --- FACTORY BILLS AND EXPENSES ---
        const openAddBillModal = () => {
          modalData.title = 'Add Factory Bill & Payment';
          modalData.bill = reactive({ factoryId: '', sellerId: '', amount: '', overcharge: '', date: getBangladeshDateString(new Date()), notes: '', linkedOrderIds: [], photoUrl: '' });
          selectedProofTile.value = 'modal';
          activeModal.value = 'factoryBillModal';
        };

        const openEditBillModal = (bill) => {
          modalData.title = 'Edit Factory Bill & Linked Orders';
          modalData.bill = reactive({ ...bill, linkedOrderIds: bill.linkedOrderIds || [], overcharge: bill.overcharge || '' });
          selectedProofTile.value = 'modal';
          activeModal.value = 'factoryBillModal';
        };

        const saveBillModal = () => {
          if (!modalData.bill.factoryId || !modalData.bill.amount) {
            alert('Factory and Amount are required.');
            return;
          }
          
          const factoryName = getFactoryName(modalData.bill.factoryId);
          const allOrders = [...orders.value, ...deletedOrders.value];
          modalData.bill.linkedOrderIds = (modalData.bill.linkedOrderIds || []).filter(id => {
            const o = allOrders.find(ord => ord.id === id);
            if (!o) return false;
            if (o.factoryTag !== factoryName) return false;
            if (modalData.bill.sellerId && o.merchantId !== modalData.bill.sellerId) return false;
            return true;
          });

          let billToSave;
          if (modalData.bill.id) {
            const idx = factoryBills.value.findIndex(b => b.id === modalData.bill.id);
            if (idx !== -1) {
              factoryBills.value[idx] = { ...modalData.bill };
              billToSave = factoryBills.value[idx];
            } else {
              billToSave = { ...modalData.bill };
              factoryBills.value.push(billToSave);
            }
          } else {
            modalData.bill.id = 'FB-' + Date.now().toString().slice(-6);
            billToSave = { ...modalData.bill };
            factoryBills.value.push(billToSave);
          }

          billToSave.updatedAt = getBstIsoString();
          billToSave.updatedBy = currentUser.value?.username || 'admin';
          queueChange('factoryBills', billToSave);
          saveFactoryBillsLocally();
          closeModal();
        };

        const deleteBill = (id) => {
          openGlobalConfirm('Are you sure you want to delete this bill?', 'Delete Bill', 'bg-rose-600 hover:bg-rose-500 text-white', () => {
            factoryBills.value = factoryBills.value.filter(b => b.id !== id);
            queueDelete('factoryBills', id);
            saveFactoryBillsLocally();
            closeModal();
          });
        };

        const openAddExpenseModal = () => {
          modalData.title = 'Record Operating Expense';
          modalData.expense = reactive({ date: getBangladeshDateString(new Date()), category: 'Other', amount: '', description: '' });
          activeModal.value = 'expenseModal';
        };

        const saveExpenseModal = () => {
          if (!modalData.expense.amount || !modalData.expense.category) {
            alert('Category and Amount are required.');
            return;
          }
          modalData.expense.id = 'EXP-' + Date.now().toString().slice(-6);
          modalData.expense.updatedAt = getBstIsoString();
          modalData.expense.updatedBy = currentUser.value?.username || 'admin';
          const savedExp = { ...modalData.expense };
          expenses.value.push(savedExp);
          queueChange('expenses', savedExp);
          saveExpensesLocally();
          closeModal();
        };

        const deleteExpense = (id) => {
          openGlobalConfirm('Are you sure you want to delete this expense record?', 'Delete Expense', 'bg-rose-600 hover:bg-rose-500 text-white', () => {
            expenses.value = expenses.value.filter(e => e.id !== id);
            queueDelete('expenses', id);
            saveExpensesLocally();
            closeModal();
          });
        };

        const getExpenseCategoryClass = (cat) => {
          switch(cat) {
            case 'Salary': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'Rent': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
            case 'Electricity': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'Factory Payment': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
            case 'Marketing': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
          }
        };

        const getOrdersByIds = (ids) => {
          if (!ids || !ids.length) return [];
          return orders.value.filter(o => ids.includes(o.id));
        };

        const getBillOrdersTotalSale = (ids) => {
          const linked = getOrdersByIds(ids);
          return linked.reduce((sum, ord) => sum + (Number(ord.saleAmount) || 0), 0);
        };

        const getFactoryName = (id) => {
          const f = factories.value.find(fac => fac.id === id);
          return f ? f.name : 'Unknown Factory';
        };

        const openAddFactoryModal = () => {
          modalData.title = 'Register New Manufacturing Partner';
          modalData.factory = reactive({
            id: 'f' + (factories.value.length + 1),
            name: '',
            phone: '',
            waGroupLink: '',
            fabricQuality: 4,
            stockStatus: 'In Stock',
            baseWholesaleCost: 35000,
            notes: ''
          });
          activeModal.value = 'factoryModal';
        };

        const openEditFactoryModal = (factory) => {
          modalData.title = `Edit Factory: ${factory.name}`;
          modalData.factory = reactive({ ...factory });
          activeModal.value = 'factoryModal';
        };

        const saveFactoryModal = () => {
          const idx = factories.value.findIndex(f => f.id === modalData.factory.id);
          let facToSave;
          if (idx !== -1) {
            factories.value[idx] = { ...modalData.factory };
            facToSave = factories.value[idx];
          } else {
            facToSave = { ...modalData.factory };
            factories.value.push(facToSave);
          }
          facToSave.updatedAt = getBstIsoString();
          facToSave.updatedBy = currentUser.value?.username || 'admin';
          queueChange('factories', facToSave);
          saveFactoriesLocally();
          closeModal();
        };

        // --- WHATSAPP FACTORY DISPATCH ---
        const openDispatchModal = (order) => {
          modalData.title = `WhatsApp Factory Dispatch (Order ${order.id})`;
          modalData.order = reactive({ ...order });
          modalData.selectedFactoryId = rankedFactories.value.length > 0 ? rankedFactories.value[0].id : '';
          activeModal.value = 'dispatchModal';
        };

        const getWhatsAppPayloadText = (order, factoryId) => {
          if (!order) return "";
          const targetFactory = factories.value.find(f => f.id === factoryId) || factories.value[0];
          const factoryName = targetFactory ? targetFactory.name : "Factory Partner";
          let payload = `🏭 *HOMEAURA PRODUCTION ORDER DISPATCH*
`;
          payload += `━━━━━━━━━━━━━━━━━━━━━
`;
          payload += `🏭 *Target Factory:* ${factoryName}
`;
          payload += `🆔 *Order Ref:* ${order.id}
`;
          payload += `📑 *Consignment No (CN):* ${order.cnNumber || "N/A"}
`;
          payload += `📅 *Date:* ${order.timestamp}
`;
          payload += `🛋️ *Product:* ${order.productCategory} (${order.seatConfig})
`;
          payload += `🧵 *Fabric:* ${order.fabric}
`;
          payload += `👤 *Client Name:* ${order.customerName}
`;
          payload += `📞 *Client Contact:* ${order.customerPhone}
`;
          payload += `📍 *Delivery Address:* ${order.customerAddress}
`;
          if (order.extraDetails) payload += `🔍 *Fabric & Specs:* ${order.extraDetails}
`;
          if (order.notes) payload += `📝 *Special Notes:* ${order.notes}
`;
          
          if (order.collagePhotoUrl && !order.collagePhotoUrl.startsWith("data:") && !order.collagePhotoUrl.startsWith("blob:")) payload += `${order.collagePhotoUrl}
`;
          if (order.socialProofUrl && !order.socialProofUrl.startsWith("data:") && !order.socialProofUrl.startsWith("blob:")) payload += `📸 *Payment Proof Link:* ${order.socialProofUrl}
`;
          payload += `━━━━━━━━━━━━━━━━━━━━━
`;
          return payload;
        };

        
        const copyDispatchPayloadAndImage = async () => {
          const order = modalData.order;
          const imgUrl = order.collagePhotoLocalUrl || order.collagePhotoUrl;
          if (imgUrl) {
            window.open(getProxiedUrl(imgUrl), '_blank');
          }
          modalData.hasCopiedImage = true;
        };
const executeWhatsAppDispatch = async () => {
          if (!modalData.order || !modalData.selectedFactoryId) return;
          const targetFactory = factories.value.find(f => f.id === modalData.selectedFactoryId);
          if (!targetFactory) return;

          const order = modalData.order;
          const realOrder = orders.value.find(o => o.id === order.id);
          if (realOrder) {
            realOrder.factoryTag = targetFactory.name;
            realOrder.status = 'Factory Submit';
            realOrder.updatedAt = getBstIsoString();
            realOrder.updatedBy = currentUser.value?.username || 'user';
            queueChange('orders', realOrder);
            saveOrdersLocally();
          }

          const messageText = getWhatsAppPayloadText(order, modalData.selectedFactoryId);
          const encodedMessage = encodeURIComponent(messageText);

          let waUrl = '';
          if (targetFactory.waGroupLink) {
            waUrl = targetFactory.waGroupLink;
          } else {
            const cleanPhone = (targetFactory.phone || '').replace(/[^0-9]/g, '');
            waUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
          }

          bulkDispatchSuccessData.ordersCount = 1;
          bulkDispatchSuccessData.count = 1;
          bulkDispatchSuccessData.photoCount = (order.collagePhotoUrl ? 1 : 0) + (order.socialProofUrl ? 1 : 0);
          bulkDispatchSuccessData.factoryName = targetFactory.name;
          bulkDispatchSuccessData.waGroupLink = waUrl;
          bulkDispatchSuccessData.previewPngUrl = "";
          bulkDispatchSuccessData.compositePngBlob = null;
          bulkDispatchSuccessData.previewBlob = null;
          bulkDispatchSuccessData.hasCopiedPhotos = modalData.hasCopiedImage;
          bulkDispatchSuccessData.manifestText = messageText;
          bulkDispatchSuccessData.isCopiedText = false;
          activeModal.value = 'bulkDispatchSuccessModal';

          let resolveClipboard, rejectClipboard;
          const clipboardPromise = new Promise((resolve, reject) => {
            resolveClipboard = resolve;
            rejectClipboard = reject;
          });
          
          let clipboardWriteStarted = false;
          try {
            if (navigator.clipboard && navigator.clipboard.write && window.ClipboardItem) {
              navigator.clipboard.write([
                new ClipboardItem({ 'image/png': clipboardPromise })
              ]).then(() => {
                 bulkDispatchSuccessData.hasCopiedPhotos = true;
              }).catch(err => {
                 console.warn('Deferred clipboard write failed:', err);
              });
              clipboardWriteStarted = true;
            }
          } catch(e) {
            console.warn('Synchronous clipboard init failed:', e);
          }

          try {
            const collageUrl = order.collagePhotoLocalUrl || order.collagePhotoUrl;
            if (collageUrl) {
               const img = await loadImageSafe(collageUrl);
               if (img) {
                 const blob = await new Promise(resolve => {
                   const canvas = document.createElement('canvas');
                   canvas.width = img.width;
                   canvas.height = img.height;
                   const ctx = canvas.getContext('2d');
                   ctx.drawImage(img, 0, 0);
                   canvas.toBlob(b => resolve(b), 'image/png');
                 });
                 if (blob) {
                   bulkDispatchSuccessData.previewBlob = blob;
                   bulkDispatchSuccessData.previewPngUrl = URL.createObjectURL(blob);
                   if (clipboardWriteStarted) resolveClipboard(blob);
                 } else {
                   bulkDispatchSuccessData.previewPngUrl = 'FAILED';
                   if (clipboardWriteStarted) rejectClipboard('No blob');
                 }
               } else {
                 bulkDispatchSuccessData.previewPngUrl = 'FAILED';
                 if (clipboardWriteStarted) rejectClipboard('No image');
               }
            } else {
               bulkDispatchSuccessData.previewPngUrl = 'FAILED';
               if (clipboardWriteStarted) rejectClipboard('No URL');
            }
          } catch (e) {
            console.warn('Failed to auto copy collage', e);
            bulkDispatchSuccessData.previewPngUrl = 'FAILED';
            if (clipboardWriteStarted) rejectClipboard(e);
          }

          if (waUrl) {
            try {
              window.open(waUrl, '_blank');
            } catch (e) {}
          }
        };

        // --- BULK FACTORY DISPATCH ENGINE ---
        const openBulkFactoryDispatchModal = () => {
          if (selectedOrders.value.size === 0) {
            alert('⚠️ Please select at least one order using the checkboxes.');
            return;
          }
          if (currentUser.value?.role === 'seller') {
            const toDispatchIds = Array.from(selectedOrders.value);
            const hasOthers = orders.value.some(o => toDispatchIds.includes(o.id) && o.merchantName !== currentUser.value?.name && o.merchantId !== currentUser.value?.id);
            if (hasOthers) {
              alert("⚠️ Security restriction: You cannot dispatch orders assigned to other merchants.");
              return;
            }
          }

          const selectedList = orders.value.filter(o => selectedOrders.value.has(o.id));
          bulkDispatchData.selectedOrdersList = selectedList;
          bulkDispatchData.orders = selectedList;
          bulkDispatchData.selectedFactoryId = rankedFactories.value[0]?.id || (factories.value[0]?.id || null);
          bulkDispatchData.isGeneratingPng = false;
          bulkDispatchData.isLoading = false;
          bulkDispatchData.hasCopiedImage = false;
          activeModal.value = 'bulkDispatchModal';
        };

        
        const copyBulkDispatchPayloadAndImage = async () => {
          if (!bulkDispatchData.selectedFactoryId) {
            alert('⚠️ Please select a target factory.');
            return;
          }
          const targetFactory = factories.value.find(f => f.id === bulkDispatchData.selectedFactoryId);
          if (!targetFactory) return;

          const selectedList = orders.value.filter(o => selectedOrders.value.has(o.id));
          if (selectedList.length === 0) return;
          
          bulkDispatchData.isLoading = true;

          // Build consolidated manifest text for WhatsApp
          let manifestText = `🏭 *HOMEAURA BULK FACTORY DISPATCH MANIFEST*
`;
          manifestText += `━━━━━━━━━━━━━━━━━━━━━
`;
          manifestText += `🏭 *Factory:* ${targetFactory.name}
`;
          manifestText += `📦 *Total Batched Orders:* ${selectedList.length} Order(s)
`;
          manifestText += `📅 *Dispatch Date (BST):* ${formatBangladeshDisplayTime(new Date())}
`;
          manifestText += `👤 *Dispatched By:* ${currentUser.value?.name || 'Administrator'}
`;
          manifestText += `━━━━━━━━━━━━━━━━━━━━━
`;
          selectedList.forEach((ord, index) => {
            manifestText += `*#${index + 1} | Order ID:* ${ord.id}
`;
            manifestText += `🛋️ *Item:* ${ord.productCategory} (${ord.fabric || 'N/A'}) (${ord.seatConfig || ''})
`;
            if (ord.extraDetails) manifestText += `🔍 *Specs:* ${ord.extraDetails}
`;
            if (ord.notes) manifestText += `📝 *Notes:* ${ord.notes}
`;
            if (ord.collagePhotoUrl) manifestText += `🖼️ Product Photo: ${ord.collagePhotoUrl}
`;
            manifestText += `------------------------------------
`;
          });
          manifestText += `*Please confirm fabric availability & production queue for the attached order collages.*`;

          bulkDispatchData.isLoading = false;
          bulkDispatchData.hasCopiedImage = true;
          bulkDispatchData.manifestText = manifestText; 
          
          const allUrls = [];
          selectedList.forEach(o => {
             if(o.collagePhotoUrl && !o.collagePhotoUrl.startsWith('data:') && !o.collagePhotoUrl.startsWith('blob:')) {
               allUrls.push(o.collagePhotoUrl);
             }
          });
          
          allUrls.forEach(url => {
            window.open(url, '_blank');
          });
        };
const executeBulkFactoryDispatch = async () => {
          if (!bulkDispatchData.selectedFactoryId) {
            alert('⚠️ Please select a target factory.');
            return;
          }
          const targetFactory = factories.value.find(f => f.id === bulkDispatchData.selectedFactoryId);
          if (!targetFactory) {
            alert('⚠️ Selected factory not found.');
            return;
          }

          bulkDispatchData.isGeneratingPng = true;
          bulkDispatchData.isLoading = true;

          const selectedList = orders.value.filter(o => selectedOrders.value.has(o.id));
          if (selectedList.length === 0) {
            bulkDispatchData.isGeneratingPng = false;
            bulkDispatchData.isLoading = false;
            closeModal();
            return;
          }

          // Build consolidated manifest text for WhatsApp
          let manifestText = `🏭 *HOMEAURA BULK FACTORY DISPATCH MANIFEST*
`;
          manifestText += `━━━━━━━━━━━━━━━━━━━━━
`;
          manifestText += `🏭 *Factory:* ${targetFactory.name}
`;
          manifestText += `📦 *Total Batched Orders:* ${selectedList.length} Order(s)
`;
          manifestText += `📅 *Dispatch Date (BST):* ${formatBangladeshDisplayTime(new Date())}
`;
          manifestText += `👤 *Dispatched By:* ${currentUser.value?.name || 'Administrator'}
`;
          manifestText += `━━━━━━━━━━━━━━━━━━━━━

`;

          selectedList.forEach((ord, index) => {
            manifestText += `*#${index + 1} | Order ID:* ${ord.id}
`;
            manifestText += `🛋️ *Item:* ${ord.productCategory} (${ord.fabric || 'N/A'}) (${ord.seatConfig || ''})
`;
            if (ord.extraDetails) manifestText += `🔍 *Specs:* ${ord.extraDetails}
`;
            if (ord.notes) manifestText += `📝 *Notes:* ${ord.notes}
`;
            if (ord.collagePhotoUrl) manifestText += `🖼️ Product Photo: ${ord.collagePhotoUrl}
`;
            manifestText += `------------------------------------
`;
          });
          manifestText += `
*Please confirm fabric availability & production queue for the attached order collages.*`;

          // Generate composite PNG containing all collages

          // Update status of all selected orders in local state and queue for delta sync
          const nowIso = getBstIsoString();
          selectedList.forEach(ord => {
            ord.factoryTag = targetFactory.name;
            ord.status = 'Factory Submit';
            ord.updatedAt = nowIso;
            ord.updatedBy = currentUser.value?.username || 'user';
            queueChange('orders', ord);
          });
          saveOrdersLocally();

          // Calculate WA URL
          const encodedMessage = encodeURIComponent(manifestText);
          let waUrl = '';
          if (targetFactory.waGroupLink) {
            waUrl = targetFactory.waGroupLink;
          } else {
            const cleanPhone = (targetFactory.phone || '').replace(/[^0-9]/g, '');
            waUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
          }

          // Download all selected photos directly to the user's device
          let photosDownloaded = 0;
          for (const ord of selectedList) {
            const url = ord.collagePhotoUrl || ord.collagePhotoLocalUrl;
            if (url) {
              try {
                let fetchUrl = url;
                if (url.startsWith('http')) {
                   fetchUrl = '/api/proxy-image?url=' + encodeURIComponent(url);
                }
                const response = await fetch(fetchUrl);
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = `Order_${ord.id}_${ord.customerName || 'Customer'}_Collage.png`.replace(/[^a-zA-Z0-9_.-]/g, '_');
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
                photosDownloaded++;
              } catch (err) {
                console.error("Failed to download image for order", ord.id, err);
              }
            }
          }

          // Setup success modal state
          bulkDispatchSuccessData.ordersCount = selectedList.length;
          bulkDispatchSuccessData.count = selectedList.length;
          bulkDispatchSuccessData.photoCount = photosDownloaded;
          bulkDispatchSuccessData.factoryName = targetFactory.name;
          bulkDispatchSuccessData.waGroupLink = waUrl;
          bulkDispatchSuccessData.compositePngUrl = '';
          bulkDispatchSuccessData.previewPngUrl = '';
          bulkDispatchSuccessData.compositePngBlob = null;
          bulkDispatchSuccessData.previewBlob = null;
          bulkDispatchSuccessData.hasCopiedPhotos = false;
          bulkDispatchSuccessData.manifestText = manifestText;
          bulkDispatchSuccessData.isCopiedText = false;
          
          // Clear selection
          selectedOrders.value.clear();
          bulkDispatchData.isGeneratingPng = false;
          bulkDispatchData.isLoading = false;

          // Show success modal
          activeModal.value = 'bulkDispatchSuccessModal';

          // Open WhatsApp group/chat
          if (waUrl) {
            try {
              window.open(waUrl, '_blank');
            } catch (e) {}
          }
        };

        // --- COURIER TRACKING MODAL ---
        const openCourierModal = (order) => {
          modalData.title = `Courier Site Verification: Order ${order.id}`;
          modalData.order = reactive({ ...order });
          modalData.newStatus = order.status;
          activeModal.value = 'courierModal';
          if (order.cnNumber) {
            fetchSfcStatus(order, true);
          }
        };

        const updateCourierStatus = () => {
          if (!modalData.order) return;
          const realOrder = orders.value.find(o => o.id === modalData.order.id);
          if (realOrder) {
            realOrder.status = modalData.newStatus;
            realOrder.updatedAt = getBstIsoString();
            realOrder.updatedBy = currentUser.value?.username || 'user';
            queueChange('orders', realOrder);
            saveOrdersLocally();
          }
          closeModal();
        };

        // --- PHOTO LIGHTBOX METHOD ---
        const openPhotoModal = (url, id, rawDriveUrl) => {
          modalData.title = `Photo Attachment - ${id || ''}`;
          modalData.url = url;
          modalData.driveUrl = rawDriveUrl || (url && !url.startsWith('data:') && !url.startsWith('blob:') ? url : '');
          activeModal.value = 'photoModal';
        };

        const openOriginalImage = (url, driveUrlFallback) => {
          let targetUrl = driveUrlFallback || url;
          if (!targetUrl) return;
          if (targetUrl.startsWith('/api/proxy-image?url=')) {
            targetUrl = decodeURIComponent(targetUrl.substring(targetUrl.indexOf('?url=') + 5));
          }
          if (targetUrl.startsWith('data:')) {
            fetch(targetUrl).then(r => r.blob()).then(blob => {
              const blobUrl = URL.createObjectURL(blob);
              window.open(blobUrl, '_blank');
            });
            return;
          }
          window.open(targetUrl, '_blank');
        };

        const openInspectModal = (order) => {
          modalData.title = `Full Order & Attachments: ${order.id}`;
          modalData.order = reactive({ ...order });
          activeModal.value = 'inspectModal';
        };

        // --- STATUS STYLING HELPER ---
        const getStatusStyle = (status) => {
          switch (status) {
            case 'Confirmation Call': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
            case 'Courier Booking': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'Factory Submit': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'Courier Pending': return 'bg-cyan-50 text-cyan-700 border-cyan-200';
            case 'Delivered': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'Partial Delivered': return 'bg-teal-50 text-teal-700 border-teal-200';
            case 'Returned from Customer': return 'bg-rose-50 text-rose-700 border-rose-200';
            case 'Returned Received': return 'bg-slate-100 text-slate-700 border-slate-300';
            default: return 'bg-slate-50 text-slate-700 border-slate-200';
          }
        };

        // --- STEADFAST COURIER (SFC) REAL-TIME DELIVERY STATUS INTEGRATION ---
        const sfcDeliveryStatuses = ref({});
        const sfcLoadingMap = ref({});

        const isSfcLoading = (order) => {
          if (!order || !order.id) return false;
          return !!sfcLoadingMap.value[order.id];
        };

        const getSfcStatus = (order) => {
          if (!order || !order.id) return null;
          return sfcDeliveryStatuses.value[order.id] || (order.sfcDeliveryStatus ? { delivery_status: order.sfcDeliveryStatus, success: true } : null);
        };

        const getSfcStatusLabel = (order) => {
          if (!order || !order.cnNumber) return '';
          if (isSfcLoading(order)) return 'Checking...';
          const sfc = getSfcStatus(order);
          if (!sfc || !sfc.delivery_status) return 'SFC Assigned';
          
          const rawStatus = (sfc.delivery_status || '').toLowerCase().trim();
          switch (rawStatus) {
            case 'delivered': return 'Delivered';
            case 'partial_delivered': return 'Partial Delivered';
            case 'in_transit': return 'In Transit';
            case 'pending': return 'Pending';
            case 'in_review': return 'In Review';
            case 'delivered_approval_pending': return 'Delivered (Pending)';
            case 'partial_delivered_approval_pending': return 'Partial (Pending)';
            case 'cancelled_approval_pending': return 'Cancelled (Pending)';
            case 'unknown_approval_pending': return 'Unknown (Pending)';
            case 'cancelled': return 'Cancelled';
            case 'hold': return 'On Hold';
            case 'not_found': return 'Active CN';
            default:
              return rawStatus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          }
        };

        const getSfcTagClass = (order) => {
          if (!order || !order.cnNumber) return '';
          if (isSfcLoading(order)) {
            return 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 animate-pulse';
          }
          const sfc = getSfcStatus(order);
          const rawStatus = (sfc?.delivery_status || '').toLowerCase().trim();
          switch (rawStatus) {
            case 'delivered':
              return 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60';
            case 'partial_delivered':
            case 'partial_delivered_approval_pending':
              return 'bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/60';
            case 'in_transit':
              return 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60';
            case 'pending':
            case 'in_review':
              return 'bg-cyan-50 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 hover:bg-cyan-100 dark:hover:bg-cyan-900/60';
            case 'hold':
              return 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60';
            case 'cancelled':
            case 'cancelled_approval_pending':
              return 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/60';
            case 'delivered_approval_pending':
              return 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60';
            default:
              return 'bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100';
          }
        };

        const getSfcDotClass = (order) => {
          if (!order || !order.cnNumber) return '';
          if (isSfcLoading(order)) return 'bg-slate-400 animate-ping';
          const sfc = getSfcStatus(order);
          const rawStatus = (sfc?.delivery_status || '').toLowerCase().trim();
          switch (rawStatus) {
            case 'delivered': return 'bg-emerald-500';
            case 'partial_delivered':
            case 'partial_delivered_approval_pending': return 'bg-teal-500';
            case 'in_transit': return 'bg-blue-500 animate-pulse';
            case 'pending':
            case 'in_review': return 'bg-cyan-500';
            case 'hold': return 'bg-amber-500';
            case 'cancelled':
            case 'cancelled_approval_pending': return 'bg-rose-500';
            case 'delivered_approval_pending': return 'bg-indigo-500';
            default: return 'bg-indigo-500';
          }
        };

        const fetchSfcStatus = async (order, force = false) => {
          if (!order || !order.cnNumber) return null;
          const cn = String(order.cnNumber).trim();
          if (!cn) return null;

          if (sfcLoadingMap.value[order.id]) return;
          if (!force && sfcDeliveryStatuses.value[order.id]) return sfcDeliveryStatuses.value[order.id];

          sfcLoadingMap.value[order.id] = true;
          try {
            const res = await fetch(`/api/steadfast/status/${encodeURIComponent(cn)}`);
            if (res.ok) {
              const data = await res.json();
              sfcDeliveryStatuses.value[order.id] = data;
              if (data && data.delivery_status && data.delivery_status !== 'not_found') {
                order.sfcDeliveryStatus = data.delivery_status;
              }
              // Manual delivery charge (no auto steadfast sync)
              let chargeChanged = false;
              if (data && data.cod_fee !== undefined && data.cod_fee !== null) {
                const newCod = Number(data.cod_fee);
                if (order.codCharge !== newCod) {
                  order.codCharge = newCod;
                  chargeChanged = true;
                }
              }
              
              if (chargeChanged) {
                order.updatedAt = getBstIsoString();
                saveOrdersLocally();
              }
            }
          } catch (err) {
            console.warn('[SFC Fetch Error]', err);
          } finally {
            sfcLoadingMap.value[order.id] = false;
          }
        };

        const refreshSingleSfcStatus = async (order) => {
          await fetchSfcStatus(order, true);
        };

        const fetchSfcStatusForOrders = async (ordersList) => {
          const listWithCn = (ordersList || []).filter(o => o && o.cnNumber && String(o.cnNumber).trim());
          if (listWithCn.length === 0) return;

          const itemsToQuery = listWithCn.map(o => ({
            id: o.id,
            cnNumber: o.cnNumber
          }));

          try {
            const res = await fetch('/api/steadfast/bulk-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items: itemsToQuery })
            });
            if (res.ok) {
              const data = await res.json();
              if (data && data.results) {
                let anyUpdated = false;
                Object.keys(data.results).forEach(orderId => {
                  const resObj = data.results[orderId];
                  sfcDeliveryStatuses.value[orderId] = resObj;
                  const ord = orders.value.find(o => o.id === orderId);
                  if (ord) {
                    if (resObj && resObj.delivery_status && resObj.delivery_status !== 'not_found') {
                      ord.sfcDeliveryStatus = resObj.delivery_status;
                    }

                    if (resObj && resObj.cod_fee !== undefined && resObj.cod_fee !== null) {
                      const newCod = Number(resObj.cod_fee);
                      if (ord.codCharge !== newCod) {
                        ord.codCharge = newCod;
                        anyUpdated = true;
                      }
                    }
                  }
                });
                if (anyUpdated) {
                  saveOrdersLocally();
                }
              }
            }
          } catch (err) {
            console.warn('[SFC Bulk Status Error]', err);
          }
        };

        // --- FABRICS ---
        const addFabric = () => {
          if (newFabricName.value && !fabrics.value.includes(newFabricName.value)) {
            fabrics.value.push(newFabricName.value);
            queueChange('fabrics', fabrics.value);
            localStorage.setItem('homeaura_fabrics', JSON.stringify(fabrics.value));
            newFabricName.value = '';
          }
        };
        const removeFabric = (index) => { openGlobalConfirm('Are you sure you want to remove this fabric?', 'Remove Fabric', 'bg-rose-600 hover:bg-rose-500 text-white', () => { fabrics.value.splice(index, 1); queueChange('fabrics', fabrics.value);
            localStorage.setItem('homeaura_fabrics', JSON.stringify(fabrics.value));
            closeModal(); }); };

        // --- CATEGORIES ---
        const addCategory = () => {
          if (newCategoryName.value && !categories.value.includes(newCategoryName.value)) {
            categories.value.push(newCategoryName.value);
            queueChange('categories', categories.value);
            saveCategoriesLocally();
            newCategoryName.value = '';
          }
        };

        const removeCategory = (index) => { openGlobalConfirm('Are you sure you want to remove this category?', 'Remove Category', 'bg-rose-600 hover:bg-rose-500 text-white', () => { categories.value.splice(index, 1); queueChange('categories', categories.value); saveCategoriesLocally(); closeModal(); }); };

        // --- CSV EXPORT ---
        const exportCSV = () => {
          const headers = ['Order ID', 'CN Number', 'Timestamp', 'Merchant', 'Customer Name', 'Phone', 'Shipping Address', 'Source', 'Design Code', 'Product', 'Seat Config', 'Fulfillment', 'Sale Price (BDT)', 'Delivery Charge (BDT)', 'Total Price (BDT)', 'Pipeline Status', 'Urgent Flag', 'Local Attachment Path', 'Notes'];
          
          const rows = orders.value.map(o => [
            `"${o.id}"`,
            `"${o.cnNumber || ''}"`,
            `"${o.timestamp}"`,
            `"${o.merchantName}"`,
            `"${o.customerName.replace(/"/g, '""')}"`,
            `"${o.customerPhone}"`,
            `"${o.customerAddress.replace(/"/g, '""')}"`,
            `"${o.trafficSource}"`,
            `"${o.designCode}"`,
            `"${o.productCategory}"`,
            `"${o.seatConfig}"`,
            `"${o.fulfillmentMethod}"`,
            o.saleAmount,
            o.deliveryCharge,
            o.totalAmount,
            `"${o.status}"`,
            o.urgent ? 'YES' : 'NO',
            `"${o.collagePhotoFileName || ''}"`,
            `"${(o.notes || '').replace(/"/g, '""')}"`
          ]);



          const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
          const encodedUri = encodeURI(csvContent);
          const link = document.createElement('a');
          link.setAttribute('href', encodedUri);
          link.setAttribute('download', `HomeAura_Master_Ledger_Export_${getBangladeshDateString(new Date())}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };

        // --- ORDER EDITING ---
        const openEditOrderModal = (order) => {
          if (currentUser.value?.role === 'seller' && order.merchantName !== currentUser.value?.name && order.merchantId !== currentUser.value?.id) {
            alert("⚠️ Security restriction: You cannot edit orders assigned to other merchants/sellers.");
            return;
          }
          modalData.title = `Edit Order: ${order.id}`;
          const initialDelivery = (order.deliveryCharge !== undefined && order.deliveryCharge !== null && !isNaN(Number(order.deliveryCharge))) ? Number(order.deliveryCharge) : 0;
          const initialTotal = (order.totalAmount !== undefined && order.totalAmount !== null && !isNaN(Number(order.totalAmount))) ? Number(order.totalAmount) : 0;
          const initialSale = (order.saleAmount !== undefined && order.saleAmount !== null && !isNaN(Number(order.saleAmount))) ? Number(order.saleAmount) : Math.max(0, initialTotal - initialDelivery);

          modalData.order = reactive({
            ...order,
            saleAmount: initialSale,
            deliveryCharge: initialDelivery,
            totalAmount: initialTotal > 0 ? initialTotal : (initialSale + initialDelivery)
          });
          selectedCollageTile.value = 'modal';
          activeModal.value = 'editOrder';
        };

        const setEditOrderDeliveryCharge = (charge) => {
          if (!modalData.order) return;
          modalData.order.deliveryCharge = Number(charge) || 0;
          const sale = Number(modalData.order.saleAmount) || 0;
          modalData.order.totalAmount = sale + modalData.order.deliveryCharge;
        };

        const onEditOrderSaleOrDeliveryChange = () => {
          if (!modalData.order) return;
          const sale = Number(modalData.order.saleAmount) || 0;
          const del = Number(modalData.order.deliveryCharge) || 0;
          modalData.order.totalAmount = sale + del;
        };

        const onEditOrderTotalChange = () => {
          if (!modalData.order) return;
          const total = Number(modalData.order.totalAmount) || 0;
          const del = Number(modalData.order.deliveryCharge) || 0;
          modalData.order.saleAmount = Math.max(0, total - del);
        };

        const saveEditedOrder = () => {
          const idx = orders.value.findIndex(o => o.id === modalData.order.id);
          if (idx !== -1) {
            if (currentUser.value.role === 'seller') {
              const oldStatus = orders.value[idx].status;
              const newStatus = modalData.order.status;
              const oldIdx = pipelineStages.indexOf(oldStatus);
              const newIdx = pipelineStages.indexOf(newStatus);
              if (newIdx < oldIdx) {
                alert('⚠️ Sellers can only update order status in one way (forward pipeline stages). Backwards status updates are restricted to Admins.');
                modalData.order.status = oldStatus;
                return;
              }
            }
            const del = Number(modalData.order.deliveryCharge) || 0;
            const sale = Number(modalData.order.saleAmount) || Math.max(0, (Number(modalData.order.totalAmount) || 0) - del);
            const total = sale + del;
            modalData.order.deliveryCharge = del;
            modalData.order.saleAmount = sale;
            modalData.order.totalAmount = total;
            modalData.order.updatedAt = getBstIsoString();
            modalData.order.updatedBy = currentUser.value?.username || 'user';
            orders.value[idx] = { ...modalData.order };
            queueChange('orders', orders.value[idx]);
            saveOrdersLocally();
            triggerAutoSync(true);
            if (orders.value[idx].cnNumber) {
              fetchSfcStatus(orders.value[idx], true);
            }
            if (orders.value[idx].customerPhone) {
              fetchFraudCheck(orders.value[idx].customerPhone, false);
            }
          }
          closeModal();
        };

        // --- VOID AND TRASH ---
        const confirmVoidOrder = (order) => {
          if (currentUser.value?.role === 'seller' && order.merchantName !== currentUser.value?.name && order.merchantId !== currentUser.value?.id) {
            alert("⚠️ Security restriction: You cannot void orders assigned to other merchants.");
            return;
          }
          modalData.title = 'Confirm Void Order';
          modalData.order = order;
          activeModal.value = 'confirmVoid';
        };

        const executeVoidOrder = () => {
          const orderToVoid = orders.value.find(o => o.id === modalData.order.id);
          if (orderToVoid) {
            orderToVoid.deletedAt = getBstIsoString();
            orderToVoid.updatedAt = getBstIsoString();
            orderToVoid.updatedBy = currentUser.value?.username || 'user';
            deletedOrders.value.unshift(orderToVoid);
            orders.value = orders.value.filter(o => o.id !== modalData.order.id);
            queueChange('deletedOrders', orderToVoid);
            queueDelete('orders', modalData.order.id);
            saveOrdersLocally();
            saveDeletedOrdersLocally();
            selectedOrders.value.delete(modalData.order.id);
          }
          closeModal();
        };

        const restoreOrder = (order) => {
          if (currentUser.value?.role === 'seller' && order.merchantName !== currentUser.value?.name && order.merchantId !== currentUser.value?.id) {
            alert("⚠️ Security restriction: You cannot restore orders assigned to other merchants.");
            return;
          }
          deletedOrders.value = deletedOrders.value.filter(o => o.id !== order.id);
          delete order.deletedAt;
          order.updatedAt = getBstIsoString();
          order.updatedBy = currentUser.value?.username || 'user';
          orders.value.push(order);
          queueChange('orders', order);
          queueDelete('deletedOrders', order.id);
          saveOrdersLocally();
          saveDeletedOrdersLocally();
        };

        const emptyTrash = () => {
          openGlobalConfirm('Are you sure you want to permanently delete all items in the trash? This action cannot be undone.', 'Empty Trash', 'bg-rose-600 hover:bg-rose-500 text-white', () => {
            const permanentlyDeletedIds = deletedOrders.value.map(o => o.id);
            deletedOrders.value = [];
            permanentlyDeletedIds.forEach(id => queueDelete('deletedOrders', id));
            saveDeletedOrdersLocally();
            
            let billsChanged = false;
            factoryBills.value.forEach(bill => {
              if (bill.linkedOrderIds) {
                const originalLength = bill.linkedOrderIds.length;
                bill.linkedOrderIds = bill.linkedOrderIds.filter(id => !permanentlyDeletedIds.includes(id));
                if (bill.linkedOrderIds.length !== originalLength) {
                  billsChanged = true;
                  queueChange('factoryBills', bill);
                }
              }
            });
            if (billsChanged) saveFactoryBillsLocally();
            closeModal();
          });
        };

        // --- BULK SELECTION ACTIONS ---
        const toggleOrderSelection = (id) => {
          if (selectedOrders.value.has(id)) {
            selectedOrders.value.delete(id);
          } else {
            selectedOrders.value.add(id);
          }
        };

        const toggleAllSelection = (filteredArray) => {
          if (selectedOrders.value.size === filteredArray.length) {
            selectedOrders.value.clear();
          } else {
            filteredArray.forEach(o => selectedOrders.value.add(o.id));
          }
        };

        const bulkDispatchSelected = () => {
          if (selectedOrders.value.size === 0) return;
          if (currentUser.value?.role === 'seller') {
            const toDispatchIds = Array.from(selectedOrders.value);
            const hasOthers = orders.value.some(o => toDispatchIds.includes(o.id) && o.merchantName !== currentUser.value?.name && o.merchantId !== currentUser.value?.id);
            if (hasOthers) {
              alert("⚠️ Security restriction: You cannot modify orders assigned to other merchants.");
              return;
            }
          }
          openGlobalConfirm(`Are you sure you want to mark ${selectedOrders.value.size} selected order(s) as Dispatched?`, 'Dispatch Selected', 'bg-emerald-600 hover:bg-emerald-500 text-white', () => {
            const toDispatchIds = Array.from(selectedOrders.value);
            orders.value.forEach(o => {
              if (toDispatchIds.includes(o.id)) {
                o.status = 'Dispatched';
                o.updatedAt = getBstIsoString();
                o.updatedBy = currentUser.value?.username || 'user';
                queueChange('orders', o);
              }
            });
            saveOrdersLocally();
            selectedOrders.value.clear();
            closeModal();
          });
        };

        const bulkDeleteSelected = () => {
          if (selectedOrders.value.size === 0) return;
          if (currentUser.value?.role === 'seller') {
            const toDeleteIds = Array.from(selectedOrders.value);
            const hasOthers = orders.value.some(o => toDeleteIds.includes(o.id) && o.merchantName !== currentUser.value?.name && o.merchantId !== currentUser.value?.id);
            if (hasOthers) {
              alert("⚠️ Security restriction: You cannot void orders assigned to other merchants.");
              return;
            }
          }
          if (!confirm(`Are you sure you want to void ${selectedOrders.value.size} selected order(s)?`)) return;

          const toDeleteIds = Array.from(selectedOrders.value);
          const ordersToMove = orders.value.filter(o => toDeleteIds.includes(o.id));
          
          const now = getBstIsoString();
          ordersToMove.forEach(o => {
            o.deletedAt = now;
            o.updatedAt = getBstIsoString();
            o.updatedBy = currentUser.value?.username || 'user';
            deletedOrders.value.unshift(o);
            queueChange('deletedOrders', o);
            queueDelete('orders', o.id);
          });
          
          orders.value = orders.value.filter(o => !toDeleteIds.includes(o.id));
          saveOrdersLocally();
          saveDeletedOrdersLocally();
          selectedOrders.value.clear();
        };

        // --- SETTINGS AND DIAGNOSTICS ---
        const saveAppsScriptUrl = async () => { localStorage.setItem('homeaura_apps_script_url', appsScriptUrl.value); alert('Google Apps Script URL saved! Synchronizing database...'); await syncFromGoogleSheets(true); alert('Synchronization complete. You can now log in.'); };

                const updateBackupFrequency = async () => {
          if (!appsScriptUrl.value) {
            alert('Please configure the Apps Script URL first.');
            return;
          }
          try {
            const url = appsScriptUrl.value.trim();
            localStorage.setItem('homeaura_backup_frequency', backupFrequency.value);
            const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: 'setup_backup', hours: parseInt(backupFrequency.value) })
            });
            const data = await res.json();
            if (data && data.status === 'success') {
              alert(data.message || 'Backup schedule updated successfully!');
            } else {
              throw new Error(data.error || 'Unknown error');
            }
          } catch(err) {
            alert('Failed to update backup schedule: ' + err.message);
          }
        };

        const instantBackupToDrive = async () => {
          if (!appsScriptUrl.value) {
            alert("Please configure the Apps Script URL first.");
            return;
          }
          try {
            const url = appsScriptUrl.value.trim();
            isBackingUp.value = true;
            const res = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "text/plain;charset=utf-8" },
              body: JSON.stringify({ action: "manual_backup" })
            });
            const text = await res.text();
            let data;
            try {
              data = JSON.parse(text);
            } catch (e) {
              throw new Error("Server returned invalid JSON. Did you re-deploy as a NEW Web App and grant Drive permissions?");
            }
            if (data && data.status === "success") {
              if (data.mode === "full") {
                 alert(`⚠️ Backup ignored! You are using an OLD version of the Apps Script.

Please click \"Copy Apps Script Code (V4)\", paste it in the Apps Script editor, and create a NEW deployment.`);
              } else {
                 alert(data.message || "✅ Manual backup completed successfully!");
              }
            } else {
              throw new Error(data.error || "Unknown error");
            }
          } catch(err) {
            let msg = err.message;
            if (msg.includes("permission") || msg.includes("DriveApp") || msg.includes("invalid JSON")) {
                msg += "\n\n💡 FIX: Open your Google Sheet > Extensions > Apps Script. Select \"backupSpreadsheet\" from the top toolbar and click \"Run\" to trigger the Google Drive permission prompt. After granting access, click Deploy > New Deployment!";


            }
            alert(`❌ Backup Failed:\n` + msg);
          } finally {
            isBackingUp.value = false;
          }
        };

        const saveAdminWaGroupLink = async () => {
          const linkToSave = (adminWaGroupLink.value || '').trim() || DEFAULT_WA_GROUP_LINK;
          adminWaGroupLink.value = linkToSave;
          localStorage.setItem('homeaura_admin_wa', linkToSave);
          queueChange('settings', { id: 'adminWaGroupLink', value: linkToSave });
          alert(`✅ WhatsApp Group Link saved & queued for sync!

Pushing to Google Sheets so all sellers sync this link automatically.`);
          await pushToGoogleSheets(false);
        };

        const testSyncConnection = async () => {
          if (!appsScriptUrl.value) {
            syncStatusMsg.value = 'No URL provided!';
            syncStatusColor.value = 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800';
            return;
          }
          isTestingSync.value = true;
          syncStatusMsg.value = 'Testing network connection to Google Apps Script...';
          syncStatusColor.value = 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800';
          try {
            const url = (appsScriptUrl.value || '').trim();
            if (!url || !url.startsWith('http')) {
              throw new Error('Invalid URL format. Must begin with https://');
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(new Error('Request timed out')), 45000);

            const testPayload = { _connectionTest: [{ timestamp: getBstIsoString(), message: "HomeAura multi-user sync engine is online!" }] };
            const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify(testPayload),
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!res.ok) {
              throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }

            const data = await res.json();
            if (data && data.status === 'success') {
              syncStatusMsg.value = '✅ Google Apps Script V4 connection verified successfully! Ready for multi-user sync.';
              syncStatusColor.value = 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800';
            } else {
              throw new Error(data?.error || 'Unknown script response');
            }
          } catch (err) {
            console.warn('Sync connection test warning:', err.message);
            syncStatusMsg.value = '⚠️ Connection note: ' + (err.name === 'AbortError' ? 'Connection timed out. Check Apps Script URL & access settings.' : err.message);
            syncStatusColor.value = 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800';
          } finally {
            isTestingSync.value = false;
          }
        };

        // --- APPS SCRIPT V4 MODAL & COPY ---
        const openAppsScriptModal = () => {
          activeModal.value = 'appsScriptModal';
        };

        const copyAppsScriptV4Code = async () => {
          const code = `// ==============================================================================
// HOMEAURA MULTI-USER OPTIMAL SYNC SCRIPT (VERSION 4.0)
// High-Performance Bidirectional Delta Sync with Last-Write-Wins (LWW)
// ==============================================================================

function doGet(e) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'busy', error: 'Server lock timeout' })).setMimeType(ContentService.MimeType.JSON);
  }
  try {
    var rawCategories = sheetToObjects("categories");
    var categories = rawCategories.map(function(c) {
      return typeof c === 'object' && c !== null ? (c.name || Object.values(c).join('')) : String(c);
    });
    var rawFabrics = sheetToObjects("fabrics");
    var fabrics = rawFabrics.map(function(c) {
      return typeof c === 'object' && c !== null ? (c.name || Object.values(c).join('')) : String(c);
    });
    var data = {
      status: 'success',
      serverTimestamp: new Date().toISOString(),
      users: sheetToObjects("users"),
      orders: sheetToObjects("orders"),
      deletedOrders: sheetToObjects("deletedOrders"),
      categories: categories,
      fabrics: fabrics,
      factories: sheetToObjects("factories"),
      factoryBills: sheetToObjects("factoryBills"),
      expenses: sheetToObjects("expenses"),
      tasks: sheetToObjects("tasks"),
      notifications: sheetToObjects("notifications"),
      settings: sheetToObjects("settings")
    };
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'busy', error: 'Database lock timeout' })).setMimeType(ContentService.MimeType.JSON);
  }
  try {
    var payloadObj;
    try { payloadObj = JSON.parse(e.postData.contents); } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: 'Invalid JSON' })).setMimeType(ContentService.MimeType.JSON);
    }
    if (payloadObj._connectionTest) {
      objectsToSheetAtomic("connectionTest", payloadObj._connectionTest);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', serverTimestamp: new Date().toISOString() })).setMimeType(ContentService.MimeType.JSON);
    }
    if (payloadObj.action === 'upload_image' && payloadObj.base64) {
      return ContentService.createTextOutput(JSON.stringify(handleDriveImageUpload(payloadObj.filename || 'attachment.jpg', payloadObj.base64, payloadObj.folder))).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (payloadObj.action === 'setup_backup') {
      try {
        setupBackupTrigger(payloadObj.hours);
        return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Backup frequency set to ' + payloadObj.hours + ' hour(s).' })).setMimeType(ContentService.MimeType.JSON);
      } catch(err) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    if (payloadObj.action === 'manual_backup') {
      try {
        backupSpreadsheet();
        return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Manual backup completed successfully!' })).setMimeType(ContentService.MimeType.JSON);
      } catch(err) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    var stats = { updatedRecords: 0, deletedRecords: 0 };
    if (payloadObj.action === 'sync_delta' || payloadObj.delta === true) {
      var changes = payloadObj.changes || {};
      var deletes = payloadObj.deletes || {};
      if (changes.users && changes.users.length) stats.updatedRecords += mergeObjectsByIdLWW("users", changes.users);
      if (changes.orders && changes.orders.length) stats.updatedRecords += mergeObjectsByIdLWW("orders", changes.orders);
      if (changes.deletedOrders && changes.deletedOrders.length) stats.updatedRecords += mergeObjectsByIdLWW("deletedOrders", changes.deletedOrders);
      if (changes.factories && changes.factories.length) stats.updatedRecords += mergeObjectsByIdLWW("factories", changes.factories);
      if (changes.factoryBills && changes.factoryBills.length) stats.updatedRecords += mergeObjectsByIdLWW("factoryBills", changes.factoryBills);
      if (changes.expenses && changes.expenses.length) stats.updatedRecords += mergeObjectsByIdLWW("expenses", changes.expenses);
      if (changes.settings && changes.settings.length) stats.updatedRecords += mergeObjectsByIdLWW("settings", changes.settings);
      if (changes.tasks && changes.tasks.length) stats.updatedRecords += mergeObjectsByIdLWW("tasks", changes.tasks);
      if (changes.notifications && changes.notifications.length) stats.updatedRecords += mergeObjectsByIdLWW("notifications", changes.notifications);
      if (changes.categories && Array.isArray(changes.categories)) {
        var catObjs = changes.categories.map(function(c) { return { name: typeof c === 'object' && c !== null ? (c.name || Object.values(c).join('')) : String(c) }; });
        objectsToSheetAtomic("categories", catObjs);
        stats.updatedRecords += catObjs.length;
      }
      if (changes.fabrics && Array.isArray(changes.fabrics)) {
        var fabObjs = changes.fabrics.map(function(c) { return { name: typeof c === 'object' && c !== null ? (c.name || Object.values(c).join('')) : String(c) }; });
        objectsToSheetAtomic("fabrics", fabObjs);
        stats.updatedRecords += fabObjs.length;
      }
      Object.keys(deletes).forEach(function(sheetName) {
        var idsToDelete = deletes[sheetName];
        if (idsToDelete && idsToDelete.length > 0) stats.deletedRecords += deleteObjectsById(sheetName, idsToDelete);
      });
      logHistory(payloadObj, stats);
      try { distributeOrdersBySeller(); } catch(e) {}
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', mode: 'delta', stats: stats, serverTimestamp: new Date().toISOString() })).setMimeType(ContentService.MimeType.JSON);
    }
    if (payloadObj.users) stats.updatedRecords += mergeObjectsByIdLWW("users", payloadObj.users);
    if (payloadObj.orders) stats.updatedRecords += mergeObjectsByIdLWW("orders", payloadObj.orders);
    if (payloadObj.deletedOrders) stats.updatedRecords += mergeObjectsByIdLWW("deletedOrders", payloadObj.deletedOrders);
    if (payloadObj.factories) stats.updatedRecords += mergeObjectsByIdLWW("factories", payloadObj.factories);
    if (payloadObj.factoryBills) stats.updatedRecords += mergeObjectsByIdLWW("factoryBills", payloadObj.factoryBills);
    if (payloadObj.expenses) stats.updatedRecords += mergeObjectsByIdLWW("expenses", payloadObj.expenses);
    if (payloadObj.settings) stats.updatedRecords += mergeObjectsByIdLWW("settings", payloadObj.settings);
    if (payloadObj.tasks) stats.updatedRecords += mergeObjectsByIdLWW("tasks", payloadObj.tasks);
    if (payloadObj.notifications) stats.updatedRecords += mergeObjectsByIdLWW("notifications", payloadObj.notifications);
    if (payloadObj.categories && Array.isArray(payloadObj.categories)) {
      var catObjs2 = payloadObj.categories.map(function(c) { return { name: typeof c === 'object' && c !== null ? (c.name || Object.values(c).join('')) : String(c) }; });
      objectsToSheetAtomic("categories", catObjs2);
    }
    if (payloadObj.fabrics && Array.isArray(payloadObj.fabrics)) {
      var fabObjs2 = payloadObj.fabrics.map(function(c) { return { name: typeof c === 'object' && c !== null ? (c.name || Object.values(c).join('')) : String(c) }; });
      objectsToSheetAtomic("fabrics", fabObjs2);
    }
    logHistory(payloadObj, stats);
    try { distributeOrdersBySeller(); } catch(e) {}
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', mode: 'full', stats: stats, serverTimestamp: new Date().toISOString() })).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

function mergeObjectsByIdLWW(sheetName, incomingObjects) {
  if (!incomingObjects || incomingObjects.length === 0) return 0;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  var existingObjects = sheetToObjects(sheetName);
  var map = {}, order = [];
  existingObjects.forEach(function(obj) {
    if (obj && obj.id !== undefined && obj.id !== '') {
      var key = String(obj.id);
      map[key] = obj;
      order.push(key);
    }
  });
  var updatedCount = 0;
  incomingObjects.forEach(function(incObj) {
    if (!incObj || incObj.id === undefined || incObj.id === '') return;
    var key = String(incObj.id);
    var existing = map[key];
    if (!existing) {
      map[key] = incObj;
      order.push(key);
      updatedCount++;
    } else {
      var incTime = incObj.updatedAt ? new Date(incObj.updatedAt).getTime() : 0;
      var extTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
      if (incTime >= extTime || !extTime) {
        map[key] = Object.assign({}, existing, incObj);
        updatedCount++;
      }
    }
  });
  var merged = order.map(function(key) { return map[key]; });
  objectsToSheetAtomic(sheetName, merged);
  return updatedCount;
}

function deleteObjectsById(sheetName, idsToDelete) {
  if (!idsToDelete || idsToDelete.length === 0) return 0;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return 0;
  var existingObjects = sheetToObjects(sheetName);
  var idMap = {};
  idsToDelete.forEach(function(id) { idMap[String(id)] = true; });
  var keptObjects = [], deleteCount = 0;
  existingObjects.forEach(function(obj) {
    if (obj && obj.id !== undefined && idMap[String(obj.id)]) { deleteCount++; } else { keptObjects.push(obj); }
  });
  if (deleteCount > 0) objectsToSheetAtomic(sheetName, keptObjects);
  return deleteCount;
}

function sheetToObjects(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0], result = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var isEmpty = row.every(function(cell) { return cell === '' || cell === null; });
    if (isEmpty) continue;
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var header = String(headers[j]).trim();
      if (header) {
        var cellVal = row[j];
        if (typeof cellVal === 'string' && (cellVal.startsWith('[') || cellVal.startsWith('{'))) {
          try { cellVal = JSON.parse(cellVal); } catch(e) {}
        }
        obj[header] = cellVal;
      }
    }
    result.push(obj);
  }
  return result;
}

function objectsToSheetAtomic(sheetName, objects) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  if (!objects || objects.length === 0) { sheet.clearContents(); return; }
  var headersMap = {};
  objects.forEach(function(obj) {
    if (typeof obj === 'object' && obj !== null) {
      Object.keys(obj).forEach(function(key) { headersMap[key] = true; });
    }
  });
  var headers = Object.keys(headersMap);
  if (headers.length === 0) return;
  var rows = [headers];
  objects.forEach(function(obj) {
    var row = [];
    headers.forEach(function(header) {
      var val = obj ? obj[header] : '';
      if (val === undefined || val === null) val = '';
      else if (typeof val === 'object') val = JSON.stringify(val);
      row.push(val);
    });
    rows.push(row);
  });
  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
}

function handleDriveImageUpload(filename, base64Data, customFolder) {
  try {
    var cleanBase64 = base64Data;
    var contentType = "image/jpeg";
    if (cleanBase64.indexOf(",") > -1) {
      var parts = cleanBase64.split(",");
      var mimeMatch = parts[0].match(/:(.*?);/);
      if (mimeMatch) contentType = mimeMatch[1];
      cleanBase64 = parts[1];
    }
    var decodedBlob = Utilities.newBlob(Utilities.base64Decode(cleanBase64), contentType, filename);
    var folderName = customFolder || "HomeAura_Order_Attachments";
    var folders = DriveApp.getFoldersByName(folderName);
    var targetFolder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    var file = targetFolder.createFile(decodedBlob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return { status: 'success', url: "https://drive.google.com/uc?export=view&id=" + file.getId(), fileId: file.getId(), filename: filename };
  } catch(err) {
    return { status: 'error', error: err.toString() };
  }
}

function logHistory(payload, stats) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var historySheet = ss.getSheetByName("History_Log");
    if (!historySheet) {
      historySheet = ss.insertSheet("History_Log");
      historySheet.appendRow(["Timestamp", "Action/Mode", "Updated", "Deleted", "Sender"]);
    }
    historySheet.appendRow([
      new Date().toISOString(),
      payload.delta ? "delta" : (payload.action || "full"),
      (stats && stats.updatedRecords) || 0,
      (stats && stats.deletedRecords) || 0,
      payload.sender || "app_client"
    ]);
    if (historySheet.getLastRow() > 1000) historySheet.deleteRows(2, 200);
  } catch(e) {}
}

function distributeOrdersBySeller() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var orders = sheetToObjects("orders");
  var users = sheetToObjects("users");
  
  var idToUsername = {};
  var validSellerUsernames = {};
  
  users.forEach(function(u) {
    if (u && u.id && u?.username) {
      idToUsername[u.id] = u?.username;
      // Only allocate individual sheets for sellers and moderators
      if (u.role === 'seller' || u.role === 'moderator') {
        validSellerUsernames[u?.username] = true;
      }
    }
  });
  
  if (Object.keys(validSellerUsernames).length === 0) return;
  
  var sellerOrders = {};
  Object.keys(validSellerUsernames).forEach(function(username) {
    sellerOrders[username] = [];
  });
  
  orders.forEach(function(o) {
    if (o && o.merchantId) {
      var username = idToUsername[o.merchantId];
      if (username && validSellerUsernames[username]) {
        sellerOrders[username].push(o);
      }
    }
  });
  
  Object.keys(sellerOrders).forEach(function(username) {
    var sheetName = "Orders_" + username;
    var userOrders = sellerOrders[username];
    objectsToSheetAtomic(sheetName, userOrders);
  });
  
  // Cleanup orphaned/stale sheets (e.g., if a username changes or role changes)
  var allSheets = ss.getSheets();
  allSheets.forEach(function(sheet) {
    var sName = sheet.getName();
    if (sName.indexOf("Orders_") === 0) {
      var sUser = sName.substring(7);
      if (!validSellerUsernames[sUser]) {
        ss.deleteSheet(sheet);
      }
    }
  });
}

function setupBackupTrigger(hours) {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'backupSpreadsheet') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  if (hours > 0) {
    ScriptApp.newTrigger('backupSpreadsheet')
             .timeBased()
             .everyHours(hours)
             .create();
  }
}

function backupSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var formattedDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  var name = ss.getName() + " Backup " + formattedDate;
  var destFolder = DriveApp.getFoldersByName("HomeAura_Backups");
  var folder;
  if (destFolder.hasNext()) {
    folder = destFolder.next();
  } else {
    folder = DriveApp.createFolder("HomeAura_Backups");
  }
  DriveApp.getFileById(ss.getId()).makeCopy(name, folder);
}
`;
          try {
            await navigator.clipboard.writeText(code);
            alert(`✅ Google Apps Script V4 code copied to clipboard!

Open your Google Sheet > Extensions > Apps Script, paste the code, click Deploy > New Deployment (Web App, Who has access: Anyone), and copy the resulting Web App URL.`);
          } catch(e) {
            alert('Please select and copy the code manually from the window.');
          }
        };

        // --- SNAPSHOT BACKUP IMPORT / EXPORT ---
        const exportSnapshot = () => {
          const password = prompt('Enter a password to encrypt this backup file (leave blank for no encryption):');
          const snapshot = {
            users: users.value,
            orders: orders.value,
            deletedOrders: deletedOrders.value,
            categories: categories.value,
              fabrics: fabrics.value,
            factories: factories.value,
            factoryBills: factoryBills.value,
            expenses: expenses.value,
            timestamp: getBstIsoString()
          };
          let dataToExport = JSON.stringify(snapshot, null, 2);
          let fileExt = 'json';
          let mimeType = 'application/json';
          
          if (password) {
            dataToExport = CryptoJS.AES.encrypt(dataToExport, password).toString();
            fileExt = 'enc';
            mimeType = 'text/plain';
          }

          const blob = new Blob([dataToExport], { type: mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `homeaura_snapshot_${getBangladeshDateString(new Date())}.${fileExt}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        };
        
        const importSnapshot = (event) => {
          const file = event.target.files[0];
          if (!file) return;
          
          if (!confirm('Warning: Restoring from a snapshot will completely overwrite the current system data. Proceed?')) {
            event.target.value = '';
            return;
          }

          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              let fileContent = e.target.result;
              let snapshot;
              
              if (file.name.endsWith('.enc')) {
                const password = prompt('This backup is encrypted. Please enter the password to decrypt:');
                if (!password) {
                  alert('Password is required to decrypt this file.');
                  event.target.value = '';
                  return;
                }
                const bytes = CryptoJS.AES.decrypt(fileContent, password);
                const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
                if (!decryptedData) {
                  throw new Error('Incorrect password or corrupted file.');
                }
                snapshot = JSON.parse(decryptedData);
              } else {
                snapshot = JSON.parse(fileContent);
              }

              if (snapshot.users && snapshot.orders) {
                users.value = snapshot.users;
                orders.value = snapshot.orders;
                deletedOrders.value = snapshot.deletedOrders || [];
                categories.value = snapshot.categories || [];
                fabrics.value = snapshot.fabrics || [];
                localStorage.setItem('homeaura_fabrics', JSON.stringify(fabrics.value));
                factories.value = snapshot.factories || [];
                factoryBills.value = snapshot.factoryBills || [];
                expenses.value = snapshot.expenses || [];
                
                saveUsersLocally();
                saveOrdersLocally();
                saveDeletedOrdersLocally();
                saveCategoriesLocally();
                saveFactoriesLocally();
                saveFactoryBillsLocally();
                saveExpensesLocally();
                
                pushToGoogleSheets(true);
                
                alert('Snapshot restored successfully! The application will now reload to apply changes.');
                window.location.reload();
                event.target.value = '';
              } else {
                alert('Invalid snapshot file format.');
              }
            } catch (err) {
              alert('Error parsing snapshot file.');
            }
          };
          reader.readAsText(file);
        };

        // --- USER PROFILE MANAGEMENT ---
        const openAddUserModal = () => {
          modalData.title = 'Register New User Profile';
          modalData.user = reactive({ name: '', username: '', password: '1234', role: 'seller', active: true, target: 300000, visibleSellers: [], pagePrefix: '' });
          modalData.showPassword = false;
          activeModal.value = 'userModal';
        };

        const openEditUserModal = (user) => {
          modalData.title = `Edit Profile: @${user?.username}`;
          modalData.user = reactive({ ...user, visibleSellers: user.visibleSellers || [] });
          modalData.showPassword = false;
          activeModal.value = 'userModal';
        };

        const saveUserModal = () => {
          const idx = users.value.findIndex(u => u && u?.username === modalData.user?.username);
          let userToSave;
          if (idx !== -1) {
            users.value[idx] = { ...modalData.user };
            userToSave = users.value[idx];
          } else {
            modalData.user.id = 'u' + (users.value.length + 1);
            userToSave = { ...modalData.user };
            users.value.push(userToSave);
          }
          userToSave.updatedAt = getBstIsoString();
          userToSave.updatedBy = currentUser.value?.username || 'admin';
          queueChange('users', userToSave);
          saveUsersLocally();
          closeModal();
        };

        const toggleUserActive = (user) => {
          user.active = !user.active;
          user.updatedAt = getBstIsoString();
          user.updatedBy = currentUser.value?.username || 'admin';
          queueChange('users', user);
          saveUsersLocally();
        };

        const openGlobalConfirm = (message, confirmText, confirmClass, onConfirm) => {
          modalData.title = 'Confirmation Required';
          modalData.confirmMessage = message;
          modalData.confirmButtonText = confirmText || 'Confirm';
          modalData.confirmButtonClass = confirmClass || 'bg-rose-600 hover:bg-rose-500 text-white';
          modalData.onConfirm = onConfirm;
          activeModal.value = 'globalConfirm';
        };

        const closeModal = () => {
          activeModal.value = null;
          selectedCollageTile.value = 'terminal';
          selectedProofTile.value = null;
          modalData.order = null;
          modalData.user = null;
          modalData.factory = null;
          modalData.bill = null;
          modalData.expense = null;
        };

        // --- DASHBOARD CHARTS ---
        let chartInstance = null;
        let pieChartInstance = null;

        const renderChart = () => {
          const canvas = document.getElementById('revenueChartCanvas');
          if (!canvas) return;
          if (chartInstance) chartInstance.destroy();
          
          const daysMap = {};
          const currentMonthStr = getBangladeshDateString(new Date()).slice(0, 7);
          const monthName = getBangladeshDate(new Date()).toLocaleString('default', { month: 'short' });
          
          orders.value.forEach(o => {
            if (o.timestamp && String(o.timestamp).startsWith(currentMonthStr)) {
              const day = String(o.timestamp).slice(8, 10);
              daysMap[day] = (daysMap[day] || 0) + (Number(o.totalAmount) || 0);
            }
          });
          
          const labels = Object.keys(daysMap).sort();
          const data = labels.map(day => daysMap[day]);
          const isDark = document.body.classList.contains('dark');
          const gridColor = isDark ? '#334155' : '#e2e8f0';
          const textColor = isDark ? '#94a3b8' : '#64748b';
          
          chartInstance = new Chart(canvas, {
            type: 'line',
            data: {
              labels: labels.map(l => l + ' ' + monthName),
              datasets: [{
                label: 'Revenue (BDT)',
                data: data,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#6366f1',
                pointBorderWidth: 2,
                pointRadius: 4,
                fill: true,
                tension: 0.4
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true,
                  grid: { color: gridColor, drawBorder: false },
                  ticks: { color: textColor, callback: val => '৳' + val.toLocaleString() }
                },
                x: {
                  grid: { display: false },
                  ticks: { color: textColor }
                }
              },
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: isDark ? '#1e293b' : '#fff',
                  titleColor: isDark ? '#f8fafc' : '#0f172a',
                  bodyColor: isDark ? '#cbd5e1' : '#475569',
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                  borderWidth: 1,
                  callbacks: {
                    label: (context) => '৳' + context.raw.toLocaleString()
                  }
                }
              }
            }
          });
        };

        const renderPieChart = () => {
          const canvas = document.getElementById('statusPieChartCanvas');
          if (!canvas) return;
          if (pieChartInstance) pieChartInstance.destroy();

          const statusCounts = {};
          orders.value.forEach(o => {
            statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
          });

          const sortedStatuses = Object.keys(statusCounts).sort((a, b) => statusCounts[b] - statusCounts[a]);
          const data = sortedStatuses.map(status => statusCounts[status]);
          const isDark = document.body.classList.contains('dark');
          const textColor = isDark ? '#94a3b8' : '#64748b';

          const backgroundColors = sortedStatuses.map(status => {
            if (status === 'Delivered') return isDark ? '#059669' : '#10b981';
            if (status === 'Confirmation Call') return isDark ? '#4338ca' : '#6366f1';
            if (status === 'Courier Booking') return isDark ? '#2563eb' : '#3b82f6';
            if (status === 'Factory Submit') return isDark ? '#d97706' : '#f59e0b';
            if (status === 'Courier Pending') return isDark ? '#0891b2' : '#06b6d4';
            if (status === 'Partial Delivered') return isDark ? '#0d9488' : '#14b8a6';
            if (status === 'Returned Received') return isDark ? '#e11d48' : '#f43f5e';
            if (status === 'Returned from Customer') return isDark ? '#be123c' : '#e11d48';
            return isDark ? '#475569' : '#94a3b8';
          });

          pieChartInstance = new Chart(canvas, {
            type: 'doughnut',
            data: {
              labels: sortedStatuses,
              datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderWidth: isDark ? 2 : 1,
                borderColor: isDark ? '#0f172a' : '#ffffff',
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              cutout: '65%',
              animation: {
                animateScale: true,
                animateRotate: true,
                duration: 800,
                easing: 'easeOutQuart'
              },
              plugins: {
                legend: {
                  position: 'right',
                  labels: {
                    color: textColor,
                    usePointStyle: true,
                    padding: 12,
                    font: { size: 11 }
                  }
                },
                tooltip: {
                  backgroundColor: isDark ? '#1e293b' : '#fff',
                  titleColor: isDark ? '#f8fafc' : '#0f172a',
                  bodyColor: isDark ? '#cbd5e1' : '#475569',
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                  borderWidth: 1,
                  callbacks: {
                    label: (context) => {
                      const total = context.dataset.data.reduce((a, b) => a + b, 0);
                      const value = context.raw;
                      const percentage = Math.round((value / total) * 100);
                      return ` ${context.label}: ${value} (${percentage}%)`;
                    }
                  }
                }
              }
            }
          });
        };

        
        // Browser Notifications for new tasks
        watch(tasks, (newTasks, oldTasks) => {
          if (!currentUser.value) return;
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            const oldIds = new Set((oldTasks || []).map(t => t.id));
            const newAssignedTasks = newTasks.filter(t => !oldIds.has(t.id) && isTaskPendingForUser(t, currentUser.value));
            
            newAssignedTasks.forEach(task => {
              new Notification('HomeAura Task Assigned', {
                body: task.title + '\n' + task.description,

                icon: 'https://cdn-icons-png.flaticon.com/512/3233/3233483.png'
              });
            });
          }
        }, { deep: true });

        const requestNotificationPermission = () => {
          if (typeof Notification !== 'undefined' && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
          }
        };
        onMounted(() => {
          requestNotificationPermission();
        });

        // Watchers for Charts
        watch([activeTab, isSidebarCollapsed], () => {
          if (activeTab.value === 'dashboard') {
            setTimeout(() => { // ensure DOM layout is updated
              renderChart();
              renderPieChart();
            }, 50);
          }
        });
        
        watch(isDarkMode, () => {
          if (activeTab.value === 'dashboard') {
            Vue.nextTick(() => {
              renderChart();
              renderPieChart();
            });
          }
        });

        // --- LIFECYCLE & POLLING ENGINE ---
        onMounted(() => {
          applyDarkMode();
          loadInitialData();
          
          // Initial non-destructive background pull
          syncFromGoogleSheets().finally(() => { 
            isInitialLoad.value = false; 
            syncImagesToLocal();
          });

          if (activeTab.value === 'dashboard') {
            Vue.nextTick(() => {
              renderChart();
              renderPieChart();
            });
          }

          // Dynamic polling (12s when visible, 60s when hidden)
          let pollInterval = setInterval(() => {
            if (appsScriptUrl.value && !document.hidden && navigator.onLine) {
              syncFromGoogleSheets().finally(() => { isInitialLoad.value = false; });
            }
          }, 12000);

          // Visibility change listener
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              syncFromGoogleSheets().finally(() => { isInitialLoad.value = false; });
            }
          });

          // Window Focus listener
          window.addEventListener('focus', () => {
            if (navigator.onLine) {
              syncFromGoogleSheets().finally(() => { isInitialLoad.value = false; });
            }
          });

          // Online / Offline handlers
          window.addEventListener('online', () => {
            syncStatus.value = 'synced';
            syncNotice.value = '🌐 Connection restored! Syncing data...';
            setTimeout(() => { syncNotice.value = ''; }, 3000);
            triggerAutoSync(true);
            syncFromGoogleSheets().finally(() => { isInitialLoad.value = false; });
          });

          window.addEventListener('offline', () => {
            syncStatus.value = 'offline';
          });

          // Paste handler for screenshots
          window.addEventListener('paste', (e) => {
            if (!selectedProofTile.value && !selectedCollageTile.value) return;

            const activeElem = document.activeElement;
            const tag = activeElem ? activeElem.tagName.toLowerCase() : '';
            const isTextInput = tag === 'textarea' || (tag === 'input' && activeElem.type === 'text');

            if (isTextInput) {
              const items = e.clipboardData && e.clipboardData.items;
              let hasImage = false;
              if (items) {
                for (let i = 0; i < items.length; i++) {
                  if (items[i].type.indexOf('image') !== -1) {
                    hasImage = true;
                    break;
                  }
                }
              }
              if (!hasImage) return;
            }

            if (selectedCollageTile.value === 'modal') {
              if (modalData.order) handleCollagePaste(e, modalData.order);
            } else if (selectedCollageTile.value === 'terminal') {
              handleCollagePaste(e, intakeForm);
            } else if (selectedProofTile.value === 'terminal') {
              handleProofPaste(e, intakeForm);
            } else if (selectedProofTile.value === 'modal') {
              if (modalData.order) handleProofPaste(e, modalData.order);
              if (modalData.bill) handleProofPaste(e, modalData.bill);
            }
          });
        });

        const saveMarketingSpendsLocally = () => {
          localStorage.setItem('homeaura_marketing_spends', JSON.stringify(marketingSpends.value));
        };
        const filteredMarketingSpends = computed(() => {
          let list = marketingSpends.value.filter(s => s.date === marketingSpendFilterDate.value);
          if (currentUser.value && currentUser.value.role === 'marketer' && currentUser.value.visibleSellers && currentUser.value.visibleSellers.length > 0) {
            list = list.filter(s => currentUser.value.visibleSellers.includes(s.sellerId));
          }
          return list;
        });

        const openMarketingSpendModal = (spend = null) => {
          if (spend) {
            modalData.marketingSpend = { ...spend };
          } else {
            modalData.marketingSpend = {
              date: marketingSpendFilterDate.value,
              sellerId: '',
              amount: 0,
              history: []
            };
          }
          activeModal.value = 'marketingSpendModal';
        };

        const openMarketingSpendHistory = (spend) => {
          modalData.marketingSpend = { ...spend };
          activeModal.value = 'marketingSpendHistoryModal';
        };

        const saveMarketingSpend = () => {
          const spend = modalData.marketingSpend;
          if (!spend.date || !spend.sellerId) return;
          const ts = Date.now();
          const recordHistory = {
            timestamp: ts,
            amount: spend.amount,
            updatedBy: currentUser.value ? currentUser.value?.username : 'system'
          };
          if (spend.id) {
            const idx = marketingSpends.value.findIndex(s => s.id === spend.id);
            if (idx !== -1) {
              const target = marketingSpends.value[idx];
              target.amount = spend.amount;
              target.updatedBy = recordHistory.updatedBy;
              target.history = target.history || [];
              target.history.unshift(recordHistory);
            }
          } else {
            const existing = marketingSpends.value.find(s => s.date === spend.date && s.sellerId === spend.sellerId);
            if (existing) {
              existing.amount = spend.amount;
              existing.updatedBy = recordHistory.updatedBy;
              existing.history = existing.history || [];
              existing.history.unshift(recordHistory);
            } else {
              spend.id = 'ms_' + ts + Math.random().toString(36).substr(2, 5);
              spend.updatedBy = recordHistory.updatedBy;
              spend.history = [recordHistory];
              marketingSpends.value.push(spend);
            }
          }
          saveMarketingSpendsLocally();
          closeModal();
        };

        const totalMarketingSpendToday = computed(() => {
          const today = new Date().toISOString().split('T')[0];
          return marketingSpends.value.filter(s => s.date === today).reduce((sum, s) => sum + s.amount, 0);
        });
        return {
          getProxiedUrl,
          formatBangladeshDisplayTime,
          getBstIsoString,
          getBstDateString,
          getBangladeshDate,
          getBangladeshTimeString,
          getBangladeshTimestamp,
          getBangladeshDateString,
          getBangladeshClockString,
          bangladeshTimeDisplay,
          marketingSpends, marketingSpendFilterDate, filteredMarketingSpends,
          openMarketingSpendModal, openMarketingSpendHistory, saveMarketingSpend, totalMarketingSpendToday,
          getBillOrdersTotalSale,
          getOrdersByIds,
          factoryBills, isTasksPanelOpen, openTasksPanel, isUserOnline, newTask, createNewTask, markTaskDone, unreadNotificationsCount, tasks, notifications, isTaskPendingForUser, isTaskCompletedForUser, getTaskCompletedByNames,
          taskFilter, taskSearch, filteredTasksList, taskReminderModal, getTaskReminderInfo, activeDueReminders,
          openTaskReminderModal, saveTaskReminderModal, setTaskReminder, snoozeTaskReminder, clearTaskReminder,
          toggleTaskDaily, deleteTask, openOrderFromTask, checkAndAssignPending48hTasks, setNewTaskReminderPreset, getBstTodayString,
          openAddBillModal,
          openEditBillModal,
          saveBillModal,
          deleteBill,
          getFactoryName,
          pipelineStages,
          users,
          orders,
          categories,
          factories,
          sampleCollagePresets,
          rankedFactories,
          currentUser,
          isDarkMode,
          toggleDarkMode,
          openInspectModal,
          selectedProofTile,
          selectedCollageTile,
          selectCollageTile,
          handleCollagePaste,
          handleCollageDrop,
          selectProofTile,
          activeTab, isSidebarCollapsed,
          loginForm,
          loginError,
          lastSyncTimestamp,
          lastPullTimestamp,
          deletedOrders,
          selectedOrders,
          restoreOrder,
          emptyTrash,
          toggleOrderSelection,
          toggleAllSelection,
          bulkDeleteSelected,
          bulkDispatchSelected,
          updateBackupFrequency, instantBackupToDrive,
          backupFrequency,
          appsScriptUrl,
          isBackingUp,
          isPushing,
          isPulling,
          isTestingSync,
          isAuthenticating,
          isInitialLoad,
          syncStatus,
          syncNotice,
          syncStatusMsg,
          syncStatusColor,
          pendingSyncCount,
          syncQueue,
          triggerAutoSync,
          pushToGoogleSheets,
          syncFromGoogleSheets,
          testSyncConnection,
          saveAppsScriptUrl,
          saveAdminWaGroupLink,
          backupToGoogleSheets,
          openAppsScriptModal,
          copyAppsScriptV4Code,
          exportSnapshot,
          importSnapshot,
          orderSearch,
          statusFilter,
          merchantFilter,
          factoryFilter,
          sortOption,
          urgentOnly,
          newCategoryName,
          clipboardRawText,
          parseSuccessMsg,
          intakeForm,
          activeModal,
          modalData,
          metrics, globalSalesProgress,
          sellersList,
          merchantStats, steadfastReport, dashboardFilter,
          factoryBillStats,
          sellerBillStats,
          totalFactoryBillsAmount,
          totalOperationalExpenses,
          expenses,
          openAddExpenseModal,
          saveExpenseModal,
          deleteExpense,
          getExpenseCategoryClass,
          myOrders,
          myOrdersCount,
          myMonthlySales,
          myTargetPercentage,
          dispatchDeskOrders,
          filteredOrders,
          formatBDT,
          handleLogin,
          handleLogout,
          parseClipboard,
          missingFieldsHighlight,
          nextUpcomingOrderNum,
          nextUpcomingOrderId,
          isCopiedUpcomingOrderId,
          copyUpcomingOrderId,
          submitNewOrder,
          quickStatusChange,
          toggleUrgent,
          handleCollageFileUpload,
          handleProofFileUpload,
          handleProofPaste,
          handleProofDrop,
          getAllowedStatusesForUser,
          advanceSellerStatus,
          getStatusStyle,
          fabrics,
          newFabricName,
          addFabric,
          removeFabric,
          addCategory,
          removeCategory,
          exportCSV,
          openEditOrderModal,
          saveEditedOrder,
          setEditOrderDeliveryCharge,
          onEditOrderSaleOrDeliveryChange,
          onEditOrderTotalChange,
          confirmVoidOrder,
          executeVoidOrder,
          openAddUserModal,
          openEditUserModal,
          saveUserModal,
          toggleUserActive,
          openAddFactoryModal,
          openEditFactoryModal,
          saveFactoryModal,
          openDispatchModal,
          getWhatsAppPayloadText,
          executeWhatsAppDispatch,
          copyDispatchPayloadAndImage,
          openCourierModal,
          updateCourierStatus,
          trackingData,
          isLoadingTracking,
          openPhotoModal,
          openOriginalImage,
          closeModal,
          openGlobalConfirm,
          adminWaGroupLink,
          DEFAULT_WA_GROUP_LINK,
          orderSuccessData,
          copyOrderWhatsAppText,
          reCopySingleOrderPngToClipboard,
          testOpenWaGroup,
          openOrderWaGroup,
          copyOrderWaGroupLink,
          bulkDispatchData,
          bulkDispatchSuccessData,
          openBulkFactoryDispatchModal,
          copyBulkDispatchPayloadAndImage,
          executeBulkFactoryDispatch,
          copyBulkManifestText,
          reCopyBulkPngToClipboard,
          copyBulkDispatchWhatsAppText,
          marketingSpends, marketingSpendFilterDate, filteredMarketingSpends,
          openMarketingSpendModal, openMarketingSpendHistory, saveMarketingSpend, totalMarketingSpendToday,
          sfcDeliveryStatuses,
          isSfcLoading,
          getSfcStatus,
          getSfcStatusLabel,
          getSfcTagClass,
          getSfcDotClass,
          fetchSfcStatus,
          refreshSingleSfcStatus,
          fetchSfcStatusForOrders,
          fraudCheckMap,
          fraudLoadingMap,
          normalizeCustomerPhone,
          isFraudLoading,
          getFraudData,
          getFraudBadgeInfo,
          fetchFraudCheck,
          fetchFraudCheckForOrders,
          openFraudDetailModal,
          refreshModalFraudCheck,
        };
      } catch (e) {
    document.body.innerHTML += '<div style="color:red; background:white; position:fixed; top:50px; left:0; z-index:9999; padding: 20px;">APP.JS ERROR: ' + e.message + '<br>' + e.stack + '</div>';
    console.error("APP.JS ERROR:", e);
    throw e;
  }
}
}).mount('#app');
