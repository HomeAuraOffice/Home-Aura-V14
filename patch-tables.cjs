const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

const replacementBlock = `
                            <div class="mt-2 space-y-1.5 w-full max-w-[135px]">
                              <select
                                v-if="!['Factory Submit', 'Courier Pending', 'Delivered', 'Partial Delivered', 'Returned from Customer', 'Returned Received'].includes(ord.status)"
                                :value="ord.status"
                                @change="quickStatusChange(ord, \\$event.target.value)"
                                class="text-[10px] font-bold rounded px-2 py-1 border transition-all cursor-pointer focus:outline-none block w-full"
                                :class="getStatusStyle(ord.status)"
                              >
                                <option
                                  v-for="s in pipelineStages"
                                  :key="s"
                                  :value="s"
                                >
                                  {{ s }}
                                </option>
                              </select>
                              
                              <div
                                v-if="ord.cnNumber"
                                class="flex items-center mt-1"
                              >
                                <span
                                  class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold transition-all shadow-2xs cursor-pointer select-none"
                                  :class="getSfcTagClass(ord)"
                                  @click="refreshSingleSfcStatus(ord)"
                                  :title="'Steadfast Status: ' + getSfcStatusLabel(ord) + ' (Click to refresh SFC)'"
                                >
                                  <span
                                    class="w-1.5 h-1.5 rounded-full shrink-0"
                                    :class="getSfcDotClass(ord)"
                                  ></span>
                                  <span
                                    class="font-extrabold font-mono tracking-tight uppercase"
                                    >SFC:</span
                                  >
                                  <span class="truncate max-w-[85px]"
                                    >{{ getSfcStatusLabel(ord) }}</span
                                  >
                                  <svg
                                    v-if="isSfcLoading(ord)"
                                    class="animate-spin w-2.5 h-2.5 shrink-0 ml-0.5"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                  >
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                </span>
                              </div>
                              <div v-else-if="['Factory Submit', 'Courier Pending', 'Delivered', 'Partial Delivered', 'Returned from Customer', 'Returned Received'].includes(ord.status)" class="text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 mt-1 inline-block">
                                {{ ord.status }} (No CN)
                              </div>
                            </div>`;


// Replace first (Master Ledger) header
content = content.replace(
  /<th class="p-4">Pipeline Status<\/th>\s*<th class="p-4 text-center">Actions<\/th>/,
  '<th class="p-4 text-center">Actions</th>'
);

// Replace second (My Orders) header
content = content.replace(
  /<th class="p-4">Pipeline Status<\/th>\s*<th class="p-4 text-center">Actions<\/th>/,
  '<th class="p-4 text-center">Actions</th>'
);

// Remove Pipeline TD blocks
// Since there are exactly 2, we can just replace them iteratively.
const pipelineTdRegex = /\s*<!-- Pipeline Status -->\s*<td class="p-4 whitespace-nowrap">[\s\S]*?<\/td>/;
content = content.replace(pipelineTdRegex, '');
content = content.replace(pipelineTdRegex, '');

// Inject into Master Order Ledger's Order ID & Timestamp td
const masterOrderIdBlockRegex = /(<!-- Order ID & Timestamp -->\s*<td[^>]*>[\s\S]*?{{ formatBangladeshDisplayTime\(ord\.timestamp\) }}\s*<\/div>)/;
content = content.replace(masterOrderIdBlockRegex, '$1' + replacementBlock);

// Find the My Orders table's Order ID block.
// It starts with <div class="flex items-center gap-1.5">\s*<span>{{ ord.id }}</span>
// and ends after the formatBangladeshDisplayTime(ord.timestamp) or factoryTag div.
// Let's use a regex that captures up to the formatBangladeshDisplayTime or factoryTag div.
const myOrderIdBlockRegex = /(<td\s*class="p-4 whitespace-nowrap font-bold text-slate-900 dark:text-slate-100"[^>]*>[\s\S]*?{{ formatBangladeshDisplayTime\(ord\.timestamp\) }}\s*<\/div>\s*(?:<div\s*v-if="ord\.factoryTag"[\s\S]*?<\/div>\s*)?)/;
content = content.replace(myOrderIdBlockRegex, '$1' + replacementBlock);

fs.writeFileSync('index.html', content);
