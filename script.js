const SUPABASE_URL = '<https://aohufdritckbxsmjqkjp.supabase.co>';
const SUPABASE_ANON_KEY = '<eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvaHVmZHJpdGNrYnhzbWpxa2pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NzU3MjgsImV4cCI6MjA5MDA1MTcyOH0.2wNx-dwthoQ7Ga-P29XDGxd0ySZfOeSZRG7h9FxsLtg>';
const OPENAI_API_KEY = '<AIzaSyCTqOGL3aZmM6xKZvaAc4rVDl-LBlhXjyc>'; // optional, provided for AI scheduling agent

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


const state = {
  organizationId: '',
  employees: [],
  availability: [],
  schedule: [],
  swaps: [],
  audit: [],
  theme: 'dark',
};

const dom = {
  statusPanel: document.getElementById('statusPanel'),
  orgIdDisplay: document.getElementById('orgIdDisplay'),
  employeesList: document.getElementById('employees'),
  availabilityPre: document.getElementById('availability'),
  schedulePre: document.getElementById('schedule'),
  swapsList: document.getElementById('swaps'),
  auditLog: document.getElementById('auditLog'),
  newEmployeeName: document.getElementById('newEmployeeName'),
  saveAvailBtn: document.getElementById('saveAvailBtn'),
  reloadBtn: document.getElementById('reloadBtn'),
  seedScheduleBtn: document.getElementById('seedScheduleBtn'),
  publishScheduleBtn: document.getElementById('publishScheduleBtn'),
  migrateBtn: document.getElementById('migrateBtn'),
};

function setStatus(message, type = 'info') {
  dom.statusPanel.textContent = message;
  dom.statusPanel.className = 'panel';
  if (type === 'success') dom.statusPanel.classList.add('status-success');
  if (type === 'error') dom.statusPanel.classList.add('status-error');
}

function getOrganizationId() {
  const urlOrg = new URLSearchParams(window.location.search).get('organization_id');
  const storedOrg = localStorage.getItem('organization_id');
  const orgId = urlOrg || storedOrg || '';
  if (!orgId) {
    const promptOrg = prompt('Enter organization_id to continue (example: org_12345):');
    if (promptOrg) {
      localStorage.setItem('organization_id', promptOrg.trim());
      return promptOrg.trim();
    }
    throw new Error('organization_id is required');
  }
  localStorage.setItem('organization_id', orgId);
  return orgId;
}

async function addAudit(action, details = {}) {
  const data = {
    organization_id: state.organizationId,
    event: action,
    metadata: JSON.stringify(details),
    created_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('audit').insert(data);
  if (error) {
    console.error('addAudit error', error);
    setStatus(`Audit failed: ${error.message}`, 'error');
    return;
  }

  state.audit.unshift({ ...data, id: data.id });
  renderAudit();
}

async function fetchEmployees() {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('organization_id', state.organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  state.employees = data || [];
  renderEmployees();
  return state.employees;
}

async function fetchAvailability() {
  const { data, error } = await supabase
    .from('availability')
    .select('*')
    .eq('organization_id', state.organizationId)
    .order('date', { ascending: true });

  if (error) {
    throw error;
  }

  state.availability = data || [];
  renderAvailability();
  return state.availability;
}

async function fetchSchedule() {
  const { data, error } = await supabase
    .from('schedule')
    .select('*')
    .eq('organization_id', state.organizationId)
    .order('date', { ascending: true });

  if (error) {
    throw error;
  }

  state.schedule = data || [];
  renderSchedule();
  return state.schedule;
}

async function fetchSwaps() {
  const { data, error } = await supabase
    .from('swaps')
    .select('*')
    .eq('organization_id', state.organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  state.swaps = data || [];
  renderSwaps();
  return state.swaps;
}

async function fetchAudit() {
  const { data, error } = await supabase
    .from('audit')
    .select('*')
    .eq('organization_id', state.organizationId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  state.audit = data || [];
  renderAudit();
  return state.audit;
}

async function saveAvailability(entries) {
  if (!Array.isArray(entries)) {
    throw new Error('saveAvailability expects an array of availability entries');
  }

  const upsertPayload = entries.map((entry) => ({
    organization_id: state.organizationId,
    employee_id: entry.employee_id,
    date: entry.date,
    slot: entry.slot,
    status: entry.status,
  }));

  const { data, error } = await supabase
    .from('availability')
    .upsert(upsertPayload, {
      onConflict: ['organization_id', 'employee_id', 'date', 'slot'],
    });

  if (error) {
    console.error('saveAvailability error', error);
    setStatus(`Failed to save availability: ${error.message}`, 'error');
    return null;
  }

  state.availability = data;
  await addAudit('saveAvailability', { rows: data.length });
  setStatus('Availability saved to Supabase', 'success');
  renderAvailability();
  return data;
}

async function addEmployee(name) {
  if (!name || !name.trim()) return null;

  const payload = {
    organization_id: state.organizationId,
    name: name.trim(),
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('employees').insert(payload).select('*');
  if (error) {
    console.error('addEmployee error', error);
    setStatus(`Failed to add employee: ${error.message}`, 'error');
    return null;
  }

  state.employees.unshift(data[0]);
  renderEmployees();
  await addAudit('addEmployee', { name: payload.name, id: data[0].id });
  setStatus('Employee added', 'success');
  return data[0];
}

async function removeEmployee(employeeId) {
  if (!employeeId) return false;

  const { error } = await supabase
    .from('employees')
    .delete()
    .match({ id: employeeId, organization_id: state.organizationId });

  if (error) {
    console.error('removeEmployee error', error);
    setStatus(`Failed to remove employee: ${error.message}`, 'error');
    return false;
  }

  state.employees = state.employees.filter((emp) => emp.id !== employeeId);
  renderEmployees();
  await addAudit('removeEmployee', { id: employeeId });
  setStatus('Employee removed', 'success');
  return true;
}

async function seedSchedule() {
  if (state.employees.length === 0) {
    setStatus('No employees available to seed schedule', 'error');
    return;
  }

  const todaysSchedule = state.employees.map((emp, idx) => ({
    organization_id: state.organizationId,
    employee_id: emp.id,
    date: new Date().toISOString().slice(0, 10),
    start_time: `0${8 + (idx % 8)}:00`,
    end_time: `1${6 + (idx % 8)}:00`,
    title: `Shift ${idx + 1}`,
  }));

  const { data, error } = await supabase.from('schedule').upsert(todaysSchedule, {
    onConflict: ['organization_id', 'employee_id', 'date'],
  });

  if (error) {
    setStatus(`Failed seeding schedule: ${error.message}`, 'error');
    return;
  }

  state.schedule = data;
  await addAudit('seedSchedule', { count: data.length });
  renderSchedule();
  setStatus('Schedule seeded', 'success');
}

async function publishSchedule() {
  const { data, error } = await supabase
    .from('schedule')
    .select('*')
    .eq('organization_id', state.organizationId)
    .order('date', { ascending: true });

  if (error) {
    setStatus(`Failed publishing schedule: ${error.message}`, 'error');
    return;
  }

  state.schedule = data;
  renderSchedule();
  await addAudit('publishSchedule', { count: data.length });
  setStatus('Schedule published', 'success');
}

function renderEmployees() {
  dom.employeesList.innerHTML = '';
  for (const emp of state.employees) {
    const li = document.createElement('li');
    li.textContent = `[${emp.id}] ${emp.name}`;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.onclick = () => removeEmployee(emp.id);
    li.appendChild(removeBtn);

    dom.employeesList.appendChild(li);
  }
}

function renderAvailability() {
  dom.availabilityPre.textContent = JSON.stringify(state.availability, null, 2);
}

function renderSchedule() {
  dom.schedulePre.textContent = JSON.stringify(state.schedule, null, 2);
}

function renderAudit() {
  dom.auditLog.innerHTML = '';
  for (const item of state.audit.slice(0, 20)) {
    const li = document.createElement('li');
    li.textContent = `${new Date(item.created_at).toLocaleString()} - ${item.event} - ${item.metadata || ''}`;
    dom.auditLog.appendChild(li);
  }
}

function buildAISchedulePrompt() {
  const employeeNames = state.employees.map((e) => `${e.id}:${e.name}`).join(', ');
  const availabilityLines = state.availability
    .map((a) => `${a.employee_id} available on ${a.date} (${a.slot})`) 
    .join('\n');
  return `You are an AI shift scheduler. Build a JSON array of shifts with fields: employee_id, date, start_time, end_time, title.\n` +
    `organization_id: ${state.organizationId}\n` +
    `employees: ${employeeNames}\n` +
    `availability:\n${availabilityLines}\n` +
    `Objective: maximize coverage for next 7 days, avoid conflicts, assign one shift per day per employee. Return only JSON array.`;
}

async function runAIScheduler() {
  if (!OPENAI_API_KEY || OPENAI_API_KEY.includes('<YOUR_OPENAI_API_KEY>')) {
    setStatus('Set OPENAI_API_KEY in script.js to use AI scheduling.', 'error');
    return;
  }

  if (!state.employees.length) {
    setStatus('No employees loaded. Add employees first.', 'error');
    return;
  }

  setStatus('Generating ai schedule...', 'info');

  const prompt = buildAISchedulePrompt();

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: 'You are a helpful shift scheduling assistant.' }, { role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.2,
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    console.error(payload);
    setStatus(`AI scheduling failed: ${payload.error?.message || 'unknown error'}`, 'error');
    return;
  }

  const aiText = payload.choices?.[0]?.message?.content;
  if (!aiText) {
    setStatus('AI returned empty scheduling output', 'error');
    return;
  }

  let shifts;
  try {
    // The model is asked to produce pure JSON array
    shifts = JSON.parse(aiText);
    if (!Array.isArray(shifts)) {
      throw new Error('Expected array');
    }
  } catch (err) {
    setStatus('Could not parse AI output; check log for details', 'error');
    console.error('AI output', aiText, err);
    return;
  }

  const mapped = shifts.map((shift) => ({
    organization_id: state.organizationId,
    employee_id: shift.employee_id,
    date: shift.date,
    start_time: shift.start_time,
    end_time: shift.end_time,
    title: shift.title || `AI shift ${shift.employee_id}`,
  }));

  await upsertScheduleEntries(mapped);
  setStatus('AI schedule created and saved', 'success');
}

function renderSwaps() {
  dom.swapsList.innerHTML = '';
  for (const swap of state.swaps) {
    const li = document.createElement('li');
    li.textContent = `Swap ${swap.id}: ${swap.requested_by} wants ${swap.requested_shift_id} -> ${swap.target_employee_id} (${swap.status})`;

    if (swap.status === 'pending') {
      const approve = document.createElement('button');
      approve.textContent = 'Approve';
      approve.onclick = () => approveSwap(swap.id);
      li.appendChild(approve);

      const reject = document.createElement('button');
      reject.textContent = 'Reject';
      reject.onclick = () => rejectSwap(swap.id);
      li.appendChild(reject);
    }

    dom.swapsList.appendChild(li);
  }
}

async function submitSwap(requestedShiftId, targetEmployeeId) {
  const payload = {
    organization_id: state.organizationId,
    requested_shift_id: requestedShiftId,
    target_employee_id: targetEmployeeId,
    requested_by: state.organizationId,
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('swaps').insert(payload).select('*');
  if (error) {
    setStatus(`Failed to submit swap: ${error.message}`, 'error');
    return null;
  }

  state.swaps.unshift(data[0]);
  renderSwaps();
  await addAudit('submitSwap', { swapId: data[0].id });
  setStatus('Swap request submitted', 'success');
  return data[0];
}

async function approveSwap(swapId) {
  const { data, error } = await supabase
    .from('swaps')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .match({ id: swapId, organization_id: state.organizationId });

  if (error) {
    setStatus(`Failed to approve swap: ${error.message}`, 'error');
    return;
  }

  await addAudit('approveSwap', { swapId });
  await reloadData();
  setStatus('Swap approved', 'success');
}

async function rejectSwap(swapId) {
  const { data, error } = await supabase
    .from('swaps')
    .update({ status: 'rejected', rejected_at: new Date().toISOString() })
    .match({ id: swapId, organization_id: state.organizationId });

  if (error) {
    setStatus(`Failed to reject swap: ${error.message}`, 'error');
    return;
  }

  await addAudit('rejectSwap', { swapId });
  await reloadData();
  setStatus('Swap rejected', 'success');
}

async function upsertScheduleEntries(shifts) {
  if (!Array.isArray(shifts)) throw new Error('Expected schedule entries array');

  const payload = shifts.map((shift) => ({
    organization_id: state.organizationId,
    ...shift,
    created_at: shift.created_at || new Date().toISOString(),
  }));

  const { data, error } = await supabase.from('schedule').upsert(payload, {
    onConflict: ['organization_id', 'employee_id', 'date', 'start_time', 'end_time'],
  });

  if (error) {
    setStatus(`Failed saving schedule entries: ${error.message}`, 'error');
    return null;
  }

  state.schedule = data;
  await addAudit('upsertScheduleEntries', { count: data.length });
  renderSchedule();
  setStatus('Schedule entries saved', 'success');
  return data;
}

async function removeScheduleEntry(scheduleId) {
  if (!scheduleId) return false;

  const { error } = await supabase
    .from('schedule')
    .delete()
    .match({ id: scheduleId, organization_id: state.organizationId });

  if (error) {
    setStatus(`Failed to remove schedule entry: ${error.message}`, 'error');
    return false;
  }

  state.schedule = state.schedule.filter((item) => item.id !== scheduleId);
  renderSchedule();
  await addAudit('removeScheduleEntry', { scheduleId });
  setStatus('Schedule entry removed', 'success');
  return true;
}

async function migrateFromLocalStorage() {
  try {
    setStatus('Starting data migration from localStorage...', 'info');

    const employeesData = JSON.parse(localStorage.getItem('ss3_emp') || '[]');
    const availabilityData = JSON.parse(localStorage.getItem('ss3_avail') || '[]');
    const scheduleData = JSON.parse(localStorage.getItem('ss3_sched') || '[]');
    const swapsData = JSON.parse(localStorage.getItem('ss3_swaps') || '[]');
    const auditData = JSON.parse(localStorage.getItem('ss3_audit') || '[]');

    if (employeesData.length) {
      await Promise.all(
        employeesData.map((emp) =>
          supabase.from('employees').upsert({
            organization_id: state.organizationId,
            id: emp.id,
            name: emp.name,
            created_at: emp.created_at || new Date().toISOString(),
          }, { onConflict: ['organization_id', 'id'] })
        )
      );
    }

    if (availabilityData.length) {
      await saveAvailability(
        availabilityData.map((av) => ({
          employee_id: av.employee_id,
          date: av.date,
          slot: av.slot || 'default',
          status: av.status || 'available',
        }))
      );
    }

    if (scheduleData.length) {
      await upsertScheduleEntries(
        scheduleData.map((s) => ({
          employee_id: s.employee_id,
          date: s.date,
          start_time: s.start_time || '08:00',
          end_time: s.end_time || '16:00',
          title: s.title || 'shift',
        }))
      );
    }

    if (swapsData.length) {
      await Promise.all(
        swapsData.map((swap) =>
          supabase.from('swaps').upsert({
            organization_id: state.organizationId,
            id: swap.id,
            requested_shift_id: swap.requested_shift_id,
            target_employee_id: swap.target_employee_id,
            requested_by: swap.requested_by,
            status: swap.status || 'pending',
            created_at: swap.created_at || new Date().toISOString(),
          }, { onConflict: ['organization_id', 'id'] })
        )
      );
    }

    if (auditData.length) {
      await Promise.all(
        auditData.map((entry) =>
          supabase.from('audit').upsert({
            organization_id: state.organizationId,
            id: entry.id,
            event: entry.event,
            metadata: JSON.stringify(entry.metadata || {}),
            created_at: entry.created_at || new Date().toISOString(),
          }, { onConflict: ['organization_id', 'id'] })
        )
      );
    }

    await reloadData();
    setStatus('Migration from localStorage complete', 'success');
    await addAudit('migrateFromLocalStorage', {
      employees: employeesData.length,
      availability: availabilityData.length,
      schedule: scheduleData.length,
      swaps: swapsData.length,
      audit: auditData.length,
    });
  } catch (error) {
    setStatus(`Migration failed: ${error.message}`, 'error');
  }
}

async function reloadData() {
  try {
    setStatus('Reloading data...', 'info');
    await Promise.all([
      fetchEmployees(),
      fetchAvailability(),
      fetchSchedule(),
      fetchSwaps(),
      fetchAudit(),
    ]);
    setStatus('Data reloaded', 'success');
  } catch (error) {
    setStatus(`Reload failed: ${error.message}`, 'error');
  }
}

async function initHandlers() {
  dom.reloadBtn.addEventListener('click', reloadData);

  dom.saveAvailBtn.addEventListener('click', async () => {
    if (!state.employees.length) {
      setStatus('No employees to create availability', 'error');
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const entries = state.employees.map((employee) => ({
      employee_id: employee.id,
      date: today,
      slot: 'default',
      status: 'available',
    }));

    await saveAvailability(entries);
  });

  dom.seedScheduleBtn.addEventListener('click', seedSchedule);
  dom.publishScheduleBtn.addEventListener('click', publishSchedule);
  dom.aiScheduleBtn.addEventListener('click', runAIScheduler);
  dom.migrateBtn.addEventListener('click', migrateFromLocalStorage);

  dom.newEmployeeName.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') {
      await addEmployee(dom.newEmployeeName.value);
      dom.newEmployeeName.value = '';
    }
  });

  document.getElementById('addEmployeeBtn').addEventListener('click', async () => {
    await addEmployee(dom.newEmployeeName.value);
    dom.newEmployeeName.value = '';
  });
}

async function initializeApp() {
  try {
    if (SUPABASE_URL.includes('<YOUR_SUPABASE_URL>') || SUPABASE_ANON_KEY.includes('<YOUR_SUPABASE_ANON_KEY>')) {
      setStatus('Set SUPABASE_URL and SUPABASE_ANON_KEY in script.js, then refresh the page.', 'error');
      return;
    }

    state.organizationId = getOrganizationId();
    dom.orgIdDisplay.textContent = state.organizationId;

    await initHandlers();
    await reloadData();
    setTheme(state.theme);
  } catch (error) {
    setStatus(`Initialization error: ${error.message}`, 'error');
    console.error(error);
  }
}

function setTheme(theme) {
  state.theme = theme;
  document.body.dataset.theme = theme;
}

async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service worker registered:', registration);
    } catch (error) {
      console.warn('Service worker registration failed:', error);
    }
  }
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const installBtn = document.createElement('button');
  installBtn.textContent = 'Install app';
  installBtn.id = 'installAppBtn';
  installBtn.onclick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      setStatus('App installed', 'success');
    } else {
      setStatus('App install dismissed', 'info');
    }
    deferredPrompt = null;
    installBtn.remove();
  };
  document.querySelector('#controls').appendChild(installBtn);
});

document.addEventListener('DOMContentLoaded', async () => {
  await registerServiceWorker();
  await initializeApp();
});
