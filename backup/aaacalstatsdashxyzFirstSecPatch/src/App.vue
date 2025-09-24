<template>
  <div id="aaacalstatsdashxyz" class="aaacaldash">
  <NcAppContent app-name="Calendar Dashboard">
    <template #navigation>
      <NcAppNavigation>
        <div class="sb-title" style="padding:8px 12px" title="Kalender filtern und gruppieren">Filter Calendars</div>
        <div class="rangebar" style="padding:0 12px 8px" title="Time range">
          <div class="range-toggle">
            <NcCheckboxRadioSwitch type="radio" name="range-week" :checked="range==='week'" @update:checked="val => { if (val) range='week' }">Week</NcCheckboxRadioSwitch>
            <NcCheckboxRadioSwitch type="radio" name="range-month" :checked="range==='month'" @update:checked="val => { if (val) range='month' }">Month</NcCheckboxRadioSwitch>
          </div>
          <div class="range-nav">
            <NcButton class="nav-btn" type="tertiary" :disabled="isLoading" @click="offset--; load()" title="Previous">◀</NcButton>
            <span class="range-dates">{{ from }} – {{ to }}</span>
            <NcButton class="nav-btn" type="tertiary" :disabled="isLoading" @click="offset++; load()" title="Next">▶</NcButton>
          </div>
        </div>
        <div class="sb-actions" style="padding:0 12px 4px; display:flex; justify-content:center; gap:8px">
          <NcButton type="tertiary" :disabled="isLoading" @click="selectAll(true)">All</NcButton>
          <NcButton type="tertiary" :disabled="isLoading" @click="selectAll(false)">None</NcButton>
        </div>
        <div class="sb-hints" style="padding:0 12px 6px; font-size:12px; color:var(--muted)">
          <div title="Gruppe 0 = keine Gruppe; 1–9 = benutzerdefinierte Gruppen">Group: 0 = none, 1–9 = custom</div>
          <div title="Nur ausgewählte Kalender fließen in die Auswertung">Only selected calendars are used</div>
        </div>
        <div class="sb-list" style="padding:0 12px 12px">
          <div v-for="c in calendars" :key="c.id" style="display:flex; align-items:center; gap:8px; justify-content:space-between; width:100%">
            <div style="flex:1; min-width:0">
              <NcAppNavigationItem
                :name="c.displayname || c.id"
                :active="isSelected(c.id)"
                @click="toggleCalendar(c.id)"
              >
                <template #icon>
                  <span :style="{display:'inline-block',width:'10px',height:'10px',borderRadius:'50%',background:(c.color||'var(--brand)')}"></span>
                </template>
              </NcAppNavigationItem>
            </div>
            <input type="number" :value="getGroup(c.id)" min="0" max="9" step="1" aria-label="Calendar group"
                   @input="(e:any)=> setGroup(c.id, e?.target?.value)"
                   title="Group 0–9 (0 = none)" style="width:58px; padding:6px 8px; border-radius:8px; border:1px solid var(--line); background:var(--card); color:var(--fg); text-align:right" />
          </div>
          <div class="hint" style="margin-top:8px">Selection is stored per user.</div>
        </div>

        <!-- Notes section -->
        <div class="sb-title" style="padding:8px 12px">Notes</div>
        <div style="padding:0 12px 8px; display:grid; gap:8px">
          <div class="hint" :title="notesLabelPrevTitle">{{ notesLabelPrev }}</div>
          <textarea :value="notesPrev" readonly rows="4"
            style="width:100%;resize:vertical;min-height:72px;max-height:200px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--fg);padding:8px"></textarea>
          <div class="hint" :title="notesLabelCurrTitle">{{ notesLabelCurr }}</div>
          <textarea v-model="notesCurrDraft" rows="4" placeholder="Write your notes…"
            style="width:100%;resize:vertical;min-height:72px;max-height:200px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--fg);padding:8px"></textarea>
          <div style="display:flex;justify-content:flex-end;gap:8px">
            <NcButton type="tertiary" :disabled="isSavingNote" @click="saveNotes">Save</NcButton>
          </div>
        </div>
      </NcAppNavigation>
    </template>

    <div class="app-container">
      <div class="appbar">
        <div class="title">
          <span>Calendar Dashboard</span>
          <span class="chip" v-text="range.toUpperCase()" />
        </div>
        <div class="hint" style="display:flex;align-items:center;gap:8px">
          <NcLoadingIcon v-if="isLoading" :size="16" />
          <span v-text="uid" />
          <span v-if="isTruncated" title="Results truncated for performance">· Partial data</span>
        </div>
      </div>

      <div class="cards">
        <div class="card">
          <div>Total Hours</div>
          <div class="value">{{ n2(stats.total_hours) }}</div>
          <div class="sub">
            <template v-if="stats.top_calendar">Top Cal: {{ stats.top_calendar.calendar }} {{ n1(stats.top_calendar.share) }}%</template>
            <template v-if="delta.total_hours != null"> · <span :class="delta.total_hours >= 0 ? 'delta pos' : 'delta neg'">{{ arrow(delta.total_hours) }} {{ n2(Math.abs(delta.total_hours)) }}h</span></template>
          </div>
        </div>
        <div class="card">
          <div>Avg Hours/Day</div>
          <div class="value">{{ n2(stats.avg_per_day) }}</div>
          <div class="sub">
            <template v-if="stats.busiest_day">Busiest: {{ stats.busiest_day.date }} {{ n2(stats.busiest_day.hours) }}h</template>
            <template v-if="delta.avg_per_day != null"> · <span :class="delta.avg_per_day >= 0 ? 'delta pos' : 'delta neg'">{{ arrow(delta.avg_per_day) }} {{ n2(Math.abs(delta.avg_per_day)) }}h</span></template>
          </div>
        </div>
        <div class="card">
          <div>Avg Hours/Event</div>
          <div class="value">{{ n2(stats.avg_per_event) }}</div>
          <div class="sub">
            <template v-if="stats.median_per_day != null">Median/Day: {{ n2(stats.median_per_day) }}h</template>
            <template v-if="delta.avg_per_event != null"> · <span :class="delta.avg_per_event >= 0 ? 'delta pos' : 'delta neg'">{{ arrow(delta.avg_per_event) }} {{ n2(Math.abs(delta.avg_per_event)) }}h</span></template>
          </div>
        </div>
        <div class="card">
          <div>Events</div>
          <div class="value">{{ stats.events ?? 0 }}</div>
          <div class="sub">
            <span v-if="stats.active_days != null">Active Days: {{ stats.active_days }}</span>
            <span v-if="stats.typical_start && stats.typical_end"> · Typical: {{ stats.typical_start }}–{{ stats.typical_end }}</span>
            <span v-if="stats.weekend_share != null"> · Weekend: {{ n1(stats.weekend_share) }}%</span>
            <span v-if="stats.evening_share != null"> · Evening: {{ n1(stats.evening_share) }}%</span>
            <span v-if="delta.events != null"> · Δ {{ arrow(delta.events) }} {{ Math.abs(delta.events) }}</span>
          </div>
        </div>
      </div>

      <div class="tabs">
        <a href="#" :class="{active: pane==='cal'}" @click.prevent="pane='cal'">By Calendar</a>
        <a href="#" :class="{active: pane==='day'}" @click.prevent="pane='day'">By Day</a>
        <a href="#" :class="{active: pane==='top'}" @click.prevent="pane='top'">Longest Tasks</a>
        <a href="#" :class="{active: pane==='heat'}" @click.prevent="pane='heat'">Heatmap</a>
      </div>

      <div class="card full tab-panel" v-show="pane==='cal'">
        <NcEmptyContent v-if="byCal.length===0" name="No data" description="Try changing the range or calendars"/>
        <template v-else>
          <table>
            <colgroup><col style="width:60%"><col style="width:20%"><col style="width:20%"></colgroup>
            <thead>
              <tr>
                <th class="nowrap">Calendar</th>
                <th class="num">Events</th>
                <th class="num">Hours</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in byCal" :key="r.calendar">
                <td><span class="cell" :title="r.calendar">{{ r.calendar }}</span></td>
                <td class="num">{{ r.events_count }}</td>
                <td class="num">{{ n2(r.total_hours) }}</td>
              </tr>
            </tbody>
          </table>
          <div class="grid2" style="margin-top:12px">
            <div class="card"><canvas ref="pie" class="chart" /></div>
            <div class="card"><canvas ref="perDay" class="chart" /></div>
          </div>
          <!-- Grouped charts: one card per used group (0-9), only if data exists -->
          <div class="grid2" style="margin-top:12px" v-if="groupList.length">
            <div class="card" v-for="g in groupList" :key="'g-'+g">
              <div class="title" style="font-size:14px; font-weight:700; margin-bottom:6px">Group {{ g }}</div>
              <div class="grid2">
                <div class="card"><canvas :ref="(el:any)=> setGroupRef('pie', g, el)" class="chart" /></div>
                <div class="card"><canvas :ref="(el:any)=> setGroupRef('bar', g, el)" class="chart" /></div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <div class="card full tab-panel" v-show="pane==='day'">
        <NcEmptyContent v-if="byDay.length===0" name="No data" description="Try changing the range or calendars"/>
        <template v-else>
          <table>
            <colgroup><col style="width:40%"><col style="width:30%"><col style="width:30%"></colgroup>
            <thead><tr><th class="nowrap">Date</th><th class="num">Events</th><th class="num">Hours</th></tr></thead>
            <tbody>
              <tr v-for="r in byDay" :key="r.date">
                <td class="mono nowrap"><a :href="calendarDayLink(r.date)" target="_blank">{{ r.date }}</a></td>
                <td class="num">{{ r.events_count }}</td>
                <td class="num">{{ n2(r.total_hours) }}</td>
              </tr>
            </tbody>
          </table>
        </template>
      </div>

      <div class="card full tab-panel" v-show="pane==='top'">
        <NcEmptyContent v-if="longest.length===0" name="No data" description="Try changing the range or calendars"/>
        <template v-else>
          <table>
            <colgroup><col style="width:22%"><col><col style="width:12%"><col style="width:18%"><col style="width:16%"></colgroup>
            <thead><tr><th>Calendar</th><th>Summary</th><th class="num">Hours</th><th class="nowrap">Start date</th><th class="nowrap">Start time</th></tr></thead>
            <tbody>
              <tr v-for="(r,i) in longest" :key="i" @click="toggleDetails(i)" style="cursor:pointer">
                <td>{{ r.calendar }}</td>
                <td><span class="cell" :title="r.summary">{{ r.summary }}</span></td>
                <td class="num">{{ n2(r.duration_h) }}</td>
                <td class="mono nowrap">{{ (r.start||'').split(' ')[0] }}</td>
                <td class="mono nowrap">{{ (r.start||'').split(' ')[1]?.slice(0,5) }}</td>
              </tr>
              <tr v-if="detailsIndex===i">
                <td colspan="5" class="mono" style="background:color-mix(in oklab, var(--card), #000 3%); border-top:1px solid var(--line)">
                  <div><strong>Details</strong></div>
                  <div v-if="r.desc">{{ r.desc }}</div>
                  <div v-else class="hint">No description</div>
                </td>
              </tr>
            </tbody>
          </table>
        </template>
      </div>

      <div class="card full tab-panel" v-show="pane==='heat'">
        <NcEmptyContent v-if="!charts.hod || !charts.hod.matrix || charts.hod.matrix.length===0" name="No data" description="Try changing the range or calendars"/>
        <template v-else>
          <canvas ref="hod" class="chart" />
          <div class="hint">24×7 Heatmap: cumulated hours by weekday (rows) and hour (columns).</div>
        </template>
      </div>

      <div class="hint footer">Powered by <strong>Gellert Innovation</strong> • Built with <span class="mono">aaacalstatsdashxyz</span></div>
    </div>
  </NcAppContent>
  </div>
</template>

<script setup lang="ts">
import { NcAppContent, NcAppNavigation, NcButton, NcEmptyContent, NcCheckboxRadioSwitch, NcLoadingIcon, NcAppNavigationItem } from '@nextcloud/vue'
// Lightweight notifications without @nextcloud/dialogs
function notifySuccess(msg: string){
  const w:any = window as any
  if (w.OC?.Notification?.showTemporary) { w.OC.Notification.showTemporary(msg) }
  else { console.log('SUCCESS:', msg) }
}
function notifyError(msg: string){
  const w:any = window as any
  if (w.OC?.Notification?.showTemporary) { w.OC.Notification.showTemporary(msg) }
  else { console.error('ERROR:', msg); alert(msg) }
}
import { onMounted, reactive, ref, watch, nextTick, computed } from 'vue'

type Charts = {
  pie?: { labels: string[]; data: number[] }
  perDay?: { labels: string[]; data: number[] }
  dow?: { labels: string[]; data: number[] }
  hod?: { dows: string[]; hours: number[]; matrix: number[][] }
}

const pane = ref<'cal'|'day'|'top'|'heat'>('cal')
const range = ref<'week'|'month'>('week')
const offset = ref<number>(0)
const uid = ref('')
const from = ref('')
const to = ref('')
const isLoading = ref(false)
const isTruncated = ref(false)

const calendars = ref<{id:string;displayname:string;color?:string;checked:boolean}[]>([])
const colorsByName = ref<Record<string,string>>({})
const colorsById = ref<Record<string,string>>({})
const groupsById = ref<Record<string, number>>({})
const selected = ref<string[]>([])
const isSaving = ref(false)
const userChangedSelection = ref(false)

function isSelected(id: string) {
  return selected.value.includes(id)
}
function setSelected(id: string, checked: boolean) {
  const set = new Set(selected.value)
  if (checked) {
    set.add(id)
  } else {
    set.delete(id)
  }
  selected.value = Array.from(set)
}
function toggleCalendar(id: string) {
  setSelected(id, !isSelected(id))
  userChangedSelection.value = true
  queueSave()
}

function getGroup(id: string){ const n = groupsById.value?.[id]; return (typeof n==='number' && isFinite(n)) ? Math.max(0, Math.min(9, Math.trunc(n))) : 0 }
function setGroup(id: string, n: number){
  const v = Math.max(0, Math.min(9, Math.trunc(Number(n)||0)))
  if (!groupsById.value) groupsById.value = {}
  groupsById.value = { ...groupsById.value, [id]: v }
  // Persist groups without forcing a data reload to avoid loops
  queueSave(false)
}

const stats = reactive<any>({})
const delta = reactive<any>({})
const byCal = ref<any[]>([])
const byDay = ref<any[]>([])
const longest = ref<any[]>([])
const charts = ref<Charts>({})
const detailsIndex = ref<number|null>(null)
function toggleDetails(i:number){ detailsIndex.value = detailsIndex.value===i ? null : i }
function calendarDayLink(dateStr: string){
  const w:any = window as any
  if (w.OC && typeof w.OC.generateUrl === 'function'){
    return w.OC.generateUrl('/apps/calendar/timeGridDay/' + dateStr)
  }
  return getRoot() + '/index.php/apps/calendar/timeGridDay/' + dateStr
}
function isDbg(){ return false }
function useTint(){ return false }
function useInvert(){ return false }

const pie = ref<HTMLCanvasElement | null>(null)
const perDay = ref<HTMLCanvasElement | null>(null)
const hod = ref<HTMLCanvasElement | null>(null)

// Notes
const notesPrev = ref('')
const notesCurrDraft = ref('')
const isSavingNote = ref(false)
const notesLabelPrev = computed(()=> range.value==='month' ? 'Last month' : 'Last week')
const notesLabelCurr = computed(()=> range.value==='month' ? 'This month' : 'This week')
const notesLabelPrevTitle = computed(()=> range.value==='month' ? 'Notes for previous month' : 'Notes for previous week')
const notesLabelCurrTitle = computed(()=> range.value==='month' ? 'Notes for current month' : 'Notes for current week')

function n1(v:any){ return Number(v ?? 0).toFixed(1) }
function n2(v:any){ return Number(v ?? 0).toFixed(2) }
function arrow(v:number){ return v>0?'▲':(v<0?'▼':'—') }

function getRoot(){ const w:any=window as any; return (w.OC && (w.OC.webroot || w.OC.getRootPath?.())) || (w._oc_webroot) || '' }
function qs(params: Record<string, any>): string { const u=new URLSearchParams(); Object.entries(params).forEach(([k,v])=>{ if(Array.isArray(v)) v.forEach(x=>u.append(k,String(x))); else if(v!==undefined&&v!==null) u.set(k,String(v)) }); return u.toString() }
async function getJson(url: string, params: any){ const q=qs(params||{}); const u=q?(url+(url.includes('?')?'&':'?')+q):url; const res=await fetch(u,{method:'GET',credentials:'same-origin'}); if(!res.ok) throw new Error('HTTP '+res.status); return await res.json() }
async function postJson(url: string, body: any){ const w:any=window as any; const rt=(w.OC?.requestToken)||(w.oc_requesttoken)||''; const headers:any={'Content-Type':'application/json'}; if(rt) headers['requesttoken']=rt; const res=await fetch(url,{method:'POST',credentials:'same-origin',headers,body:JSON.stringify(body||{})}); if(!res.ok) throw new Error('HTTP '+res.status); return await res.json() }

function route(name: string){
  const w:any = window as any
  if (w.OC && typeof w.OC.generateUrl === 'function') {
    if (name === 'load')    return w.OC.generateUrl('/apps/aaacalstatsdashxyz/config_dashboard/load')
    if (name === 'save')    return w.OC.generateUrl('/apps/aaacalstatsdashxyz/config_dashboard/save')
    if (name === 'persist') return w.OC.generateUrl('/apps/aaacalstatsdashxyz/config_dashboard/persist')
    if (name === 'notes')   return w.OC.generateUrl('/apps/aaacalstatsdashxyz/config_dashboard/notes')
    if (name === 'notesSave') return w.OC.generateUrl('/apps/aaacalstatsdashxyz/config_dashboard/notes')
    return w.OC.generateUrl('/apps/aaacalstatsdashxyz')
  }
  const base = getRoot() + '/apps/aaacalstatsdashxyz'
  if (name === 'load') return base + '/config_dashboard/load'
  if (name === 'save') return base + '/config_dashboard/save'
  if (name === 'persist') return base + '/config_dashboard/persist'
  if (name === 'notes')   return base + '/config_dashboard/notes'
  if (name === 'notesSave') return base + '/config_dashboard/notes'
  return base
}

function selectAll(v:boolean){
  selected.value = v ? calendars.value.map(c=>c.id) : []
}

let loadSeq = 0
async function load(){
  const mySeq = ++loadSeq
  isLoading.value = true
  try {
    // Read-only; never send selection here. We load whatever the server has saved.
    const params:any = { range: range.value, offset: offset.value|0, save: false }
    const json:any = await getJson(route('load'), params)
    if (mySeq !== loadSeq) { if (isDbg()) console.warn('discarding stale load response', { mySeq, loadSeq }); return }
    uid.value = json.meta?.uid || ''
    from.value = json.meta?.from || ''
    to.value = json.meta?.to || ''
    isTruncated.value = !!(json.meta && json.meta.truncated)

    calendars.value = json.calendars||[]
    colorsByName.value = (json.colors?.byName)||{}
    colorsById.value = (json.colors?.byId)||{}
    // groups mapping (id -> 0..9), default to 0
    const gobj = (json.groups && (json.groups.byId||json.groups.byID||json.groups.ids)) || {}
    const map: Record<string, number> = {}
    for (const c of calendars.value||[]) { const id=String(c.id); const n = Number((gobj as any)[id] ?? 0); map[id] = (isFinite(n)?Math.max(0,Math.min(9,Math.trunc(n))):0) }
    groupsById.value = map
    if (isDbg()) {
      console.group('[aaacalstatsdashxyz] calendars/colors')
      console.table((calendars.value||[]).map(c=>({id:c.id,name:c.displayname,color:c.color, raw:(c as any).color_raw, src:(c as any).color_src})))
      console.log('colors.byId', colorsById.value)
      console.log('colors.byName', colorsByName.value)
      if ((json as any).calDebug) console.log('server calDebug', (json as any).calDebug)
      console.groupEnd()
      console.group('[aaacalstatsdashxyz] server query debug')
      console.log((json as any).debug)
      console.groupEnd()
    }
    // If server couldn't provide colors (fallback), try WebDAV PROPFIND to get calendar-color like Calendar app
    const missing = (calendars.value||[]).filter((c:any)=>!c.color || (c as any).color_src==='fallback')
    if (missing.length) {
      try {
        const dav = await fetchDavColors(json.meta?.uid||'', calendars.value.map(c=>c.id))
        let updated=false
        calendars.value = calendars.value.map(c=>{
          const col = dav[c.id]
          if (col && col !== c.color) { (c as any).color_src = 'dav'; (c as any).color_raw = col; c.color = col; updated=true }
          return c
        })
        Object.entries(dav).forEach(([id,col])=>{ if (col) colorsById.value[id]=String(col) })
        if (updated) {
          if (isDbg()) { console.log('[aaacalstatsdashxyz] dav colors applied', dav) }
          // Recompute pie colors based on updated colorsById
          try {
            const pieData:any = charts.value?.pie || {}
            const ids:string[] = pieData.ids || []
            const srvCols:string[] = pieData.colors || []
            const newCols = ids.map((id,i)=> colorsById.value[id] || srvCols[i] || '#60a5fa')
            charts.value = { ...(charts.value||{}), pie: { ...pieData, colors: newCols } }
            if (isDbg()) console.log('[aaacalstatsdashxyz] recomputed pie colors', newCols)
          } catch(e){ if (isDbg()) console.warn('recompute pie colors failed', e) }
          // Recompute per-day series colors as well
          try {
            const pds:any = (charts.value as any).perDaySeries
            if (pds && Array.isArray(pds.series)) {
              const updSeries = pds.series.map((s:any)=> ({ ...s, color: (colorsById.value[s.id] || s.color || '#60a5fa') }))
              charts.value = { ...(charts.value||{}), perDaySeries: { labels: pds.labels, series: updSeries } }
            }
          } catch(e){ /* ignore */ }
          scheduleDraw()
        }
      } catch(e){ if (isDbg()) console.warn('dav colors failed', e) }
    }
    selected.value = json.selected||[]
    console.info('[aaacalstatsdashxyz] selection', { selected: selected.value.slice() })
    userChangedSelection.value = false

    Object.assign(stats, json.stats||{})
    Object.assign(delta, json.delta||{})
    byCal.value = json.byCal||[]
    byDay.value = json.byDay||[]
    longest.value = json.longest||[]
    charts.value = json.charts||{}
    await nextTick()
    scheduleDraw()
    // Load notes for current/previous period
    await fetchNotes().catch(()=>{})
  } catch (e:any) {
    console.error(e)
    notifyError('Failed to load data')
  } finally {
    isLoading.value = false
  }
}

async function fetchNotes(){
  const p = { range: range.value, offset: offset.value|0 }
  const json:any = await getJson(route('notes'), p)
  notesPrev.value = String(json?.notes?.previous || '')
  // Always reflect current period's saved content when switching periods
  const curSaved = String(json?.notes?.current || '')
  notesCurrDraft.value = curSaved
}

async function saveNotes(){
  try{
    isSavingNote.value = true
    await postJson(route('notesSave'), { range: range.value, offset: offset.value|0, content: notesCurrDraft.value||'' })
    notifySuccess('Notes saved')
    await fetchNotes()
  }catch(e){ console.error(e); notifyError('Failed to save notes') }
  finally{ isSavingNote.value = false }
}

let saveT: any = null
function queueSave(reload: boolean = true){
  if (saveT) clearTimeout(saveT)
  saveT = setTimeout(async () => {
    // Persist selection securely via POST + CSRF using persist endpoint
    try {
      isSaving.value = true
      // Include groups so group edits are saved too
      const res = await postJson(route('persist'), { cals: selected.value, groups: groupsById.value })
      // Update local selection from read-back to avoid mismatch
      selected.value = Array.isArray(res.read) ? res.read : (Array.isArray(res.saved)?res.saved:[])
      if (reload) {
        await load()
      }
      notifySuccess('Selection saved')
    } catch (e:any) {
      console.error(e)
      notifyError('Failed to save selection')
    } finally {
      isSaving.value = false
    }
  }, 250)
}

async function save(){
  isLoading.value = true
  try {
    try {
      await postJson(route('save'), { cals: selected.value, groups: groupsById.value })
    } catch (e: any) {
      await getJson(route('save'), { cals: selected.value.join(',') })
    }
    await load()
    notifySuccess('Selection saved')
  } catch (e:any) {
    console.error(e)
    notifyError('Failed to save selection')
  } finally {
    isLoading.value = false
  }
}

function ctxFor(c: HTMLCanvasElement | null){
  if (!c) return null
  const pr = window.devicePixelRatio || 1
  const r = c.getBoundingClientRect()
  if (r.width<2 || r.height<2) return null
  const tw = Math.floor(r.width*pr)
  const th = Math.floor(r.height*pr)
  // Only update backing resolution if it actually changed to avoid layout churn
  if (c.width !== tw) c.width = tw
  if (c.height !== th) c.height = th
  const ctx = c.getContext('2d')!
  ctx.setTransform(pr,0,0,pr,0,0)
  return ctx
}

function drawAll(){
  drawPie()
  drawPerDay()
  drawHod()
  drawGroups()
}

// ---- Grouped charts (per-group Pie + Stacked) ----
const groupList = ref<number[]>([])
const groupPieRefs = ref<Record<number, HTMLCanvasElement|null>>({})
const groupBarRefs = ref<Record<number, HTMLCanvasElement|null>>({})
function setGroupRef(kind:'pie'|'bar', g:number, el:HTMLCanvasElement|null){
  // Avoid replacing the whole object during render (can cause re-render loops)
  if (kind==='pie') {
    if (groupPieRefs.value[g] !== el) groupPieRefs.value[g] = el
  } else {
    if (groupBarRefs.value[g] !== el) groupBarRefs.value[g] = el
  }
}
function recomputeGroupList(){
  // Show a group if at least one selected calendar is assigned to it (1..9)
  const sel = new Set(selected.value||[])
  const gmap = groupsById.value||{}
  const present = new Set<number>()
  Object.entries(gmap).forEach(([id, n]) => {
    const grp = Math.max(0, Math.min(9, Math.trunc(Number(n)||0)))
    if (grp>=1 && grp<=9 && sel.has(String(id))) present.add(grp)
  })
  groupList.value = Array.from(present).sort((a,b)=>a-b)
}
watch([groupsById, selected], ()=>{ recomputeGroupList(); scheduleDraw() })

function drawGroups(){
  const pieAll:any = charts.value?.pie || {}
  const perAll:any = (charts.value as any).perDaySeries
  if (!pieAll || (!perAll || !Array.isArray(perAll.series))) return
  const sel = new Set(selected.value||[])
  const gmap = groupsById.value||{}
  // Draw per used group
  for (const g of groupList.value){
    // Pie
    const cvp = groupPieRefs.value[g] || null
    if (cvp){
      const ctx = ctxFor(cvp); if (ctx){
        const idsAll:string[] = pieAll.ids || []
        const labelsAll:string[] = pieAll.labels || []
        const dataAll:number[] = (pieAll.data||[]).map((x:any)=>Number(x)||0)
        const idx:number[] = []
        for (let i=0;i<idsAll.length;i++){ const id=String(idsAll[i]||''); if (sel.has(id) && (gmap[id]||0)===g && dataAll[i]>0) idx.push(i) }
        const subIds = idx.map(i=>idsAll[i])
        const sub = { ids: subIds, labels: idx.map(i=>labelsAll[i]), data: idx.map(i=>dataAll[i]), colors: subIds.map((id:any, j:number)=> colorsById.value[String(id)] || '#60a5fa') }
        // draw minimal donut
        const W=cvp.clientWidth,H=cvp.clientHeight,cx=W/2,cy=H/2,r=Math.min(W,H)*0.35
        ctx.clearRect(0,0,W,H)
        if (sub.data.length){
          const total=sub.data.reduce((a,b)=>a+Math.max(0,b),0)||1; let ang=-Math.PI/2
          ctx.lineWidth=1; ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--line').trim()||'#e5e7eb'
          sub.data.forEach((v,i)=>{ const f=Math.max(0,v)/total; const a2=ang+f*2*Math.PI; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,ang,a2); ctx.closePath(); ctx.fillStyle=sub.colors[i]||'#60a5fa'; ctx.fill(); ctx.stroke(); ang=a2 })
        }
      }
    }
    // Stacked bar
    const cvb = groupBarRefs.value[g] || null
    if (cvb){
      const ctx = ctxFor(cvb); if (ctx){
        const labels:string[] = perAll.labels||[]
        const series:any[] = (perAll.series||[]).filter((s:any)=> sel.has(String(s.id)) && (gmap[String(s.id)]||0)===g )
        const totals = labels.map((_,i)=> series.reduce((a,s)=>a+Math.max(0, Number(s.data?.[i]||0)),0))
        const W=cvb.clientWidth,H=cvb.clientHeight,pad=28,x0=pad*1.4,y0=H-pad,x1=W-pad
        const line=getComputedStyle(document.documentElement).getPropertyValue('--line').trim()||'#e5e7eb'
        const fg=getComputedStyle(document.documentElement).getPropertyValue('--fg').trim()||'#0f172a'
        ctx.clearRect(0,0,W,H)
        ctx.strokeStyle=line; ctx.lineWidth=1
        ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y0); ctx.moveTo(x0,y0); ctx.lineTo(x0,pad); ctx.stroke()
        const max = Math.max(1, ...totals)
        const n=labels.length||1, ggap=8, bw=Math.max(6,(x1-x0-ggap*(n+1))/n), scale=(y0-pad)/max
        labels.forEach((_,i)=>{
          let y=y0
          series.forEach(s=>{ const v=Math.max(0,Number(s.data?.[i]||0)); const h=v*scale; const x=x0+ggap+i*(bw+ggap); y=y-h; ctx.fillStyle=(colorsById.value[String(s.id)]||s.color||'#93c5fd'); if (h>0.5) ctx.fillRect(x,y,bw,h) })
          ctx.fillStyle=fg; ctx.font='12px ui-sans-serif,system-ui'
          const t=String(labels[i]||''); if (bw>26){ const tw=ctx.measureText(t).width; ctx.fillText(t, x0+ggap+i*(bw+ggap)+bw/2-tw/2, y0+14) }
        })
      }
    }
  }
}

function hexToRgb(hex:string){ const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex||''); if(!m) return null; return {r:parseInt(m[1],16), g:parseInt(m[2],16), b:parseInt(m[3],16)} }
  function rgbToHex(r:number,g:number,b:number){ const c=(n:number)=>('0'+Math.max(0,Math.min(255,Math.round(n))).toString(16)).slice(-2); return '#'+c(r)+c(g)+c(b) }
function tint(hex:string){
  const rgb = hexToRgb(hex); if(!rgb) return hex
  const dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  // Slight lightening in dark mode, slight darkening in light mode
  const f = dark ? 1.12 : 0.90
  return rgbToHex(rgb.r*f, rgb.g*f, rgb.b*f)
}
  function invert(hex:string){ const rgb=hexToRgb(hex); if(!rgb) return hex; return rgbToHex(255-rgb.r,255-rgb.g,255-rgb.b) }

  // Heatmap color: blue → purple spectrum
  function heatColor(t:number){
    const clamp=(x:number)=> x<0?0:(x>1?1:x)
    const tt = Math.pow(clamp(t), 0.6) // slight gamma for more contrast in low values
    const c1 = hexToRgb('#e0f2fe') // light blue
    const c2 = hexToRgb('#7c3aed') // violet
    if (!c1 || !c2) return '#7c3aed'
    const mix=(a:number,b:number,p:number)=> Math.round(a + (b-a)*p)
    const r = mix(c1.r, c2.r, tt)
    const g = mix(c1.g, c2.g, tt)
    const b = mix(c1.b, c2.b, tt)
    return `rgb(${r}, ${g}, ${b})`
  }

  async function fetchDavColors(uid:string, ids:string[]): Promise<Record<string,string>>{
    const out: Record<string,string> = {}
    if (!uid) return out
    const rt = (window as any).OC?.requestToken || (window as any).oc_requesttoken || ''
    const root = getRoot()
    // Try each id separately to avoid parsing large multistatus
    for (const id of ids){
      try{
        const url = `${root}/remote.php/dav/calendars/${encodeURIComponent(uid)}/${encodeURIComponent(id)}/`
        const body = `<?xml version="1.0" encoding="UTF-8"?>\n<d:propfind xmlns:d="DAV:" xmlns:ical="http://apple.com/ns/ical/">\n  <d:prop><ical:calendar-color/></d:prop>\n</d:propfind>`
        if (isDbg()) console.log('[aaacalstatsdashxyz] PROPFIND', {url, id})
        const res = await fetch(url, { method:'PROPFIND', credentials:'same-origin', headers:{'Depth':'0','Content-Type':'application/xml','requesttoken': rt}, body })
        if (!res.ok) continue
        const text = await res.text()
        if (isDbg()) console.log('[aaacalstatsdashxyz] PROPFIND response', {id, status: res.status, length: text.length, sample: text.slice(0,400)})
        const m = text.match(/<[^>]*calendar-color[^>]*>(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8}|rgb\([^<]+\))<\/[^>]*calendar-color>/i)
        if (m) out[id] = m[1]
      }catch(_){}
    }
    return out
  }

function drawPie(){
  const cv = pie.value, cdata = charts.value.pie
  if (!cv || !cdata) return
  const ctx = ctxFor(cv); if(!ctx) return
  const W=cv.clientWidth,H=cv.clientHeight,cx=W/2,cy=H/2,r=Math.min(W,H)*0.35
  const dataAll=cdata.data||[], labelsAll=cdata.labels||[], idsAll=(cdata.ids||[]), baseColorsAll=(cdata.colors||[])
  // Filter out zero-value calendars from the pie
  const idx:number[]=[]
  for (let i=0;i<dataAll.length;i++){ if ((Number(dataAll[i])||0) > 0) idx.push(i) }
  if (idx.length===0){ ctx.clearRect(0,0,W,H); return }
  const data = idx.map(i=>Number(dataAll[i])||0)
  const labels = idx.map(i=>String(labelsAll[i]||''))
  const ids = idx.map(i=>String(idsAll[i]||''))
  const baseColors = idx.map(i=>baseColorsAll[i])
  const total=data.reduce((a,b)=>a+Math.max(0,b),0)||1; let ang=-Math.PI/2
  const pal=['#60a5fa','#f59e0b','#ef4444','#10b981','#a78bfa','#fb7185','#22d3ee','#f97316']
  ctx.clearRect(0,0,W,H)
  ctx.lineWidth=1; ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--line').trim()||'#e5e7eb'
  const dbgRows:any[] = []
  data.forEach((v,i)=>{const f=Math.max(0,v)/total,a2=ang+f*2*Math.PI; const name=String(labels?.[i]||''); const id=String(ids?.[i]||'');
    const srvCol = baseColors[i]
    const idCol = id && colorsById.value[id]
    const nameCol = colorsByName.value[name]
    // Prefer ID color (latest DAV) over server-provided slice color
    const rawCol = (idCol || nameCol || srvCol || pal[i%pal.length]) as string
    let chosen = rawCol
    if (useInvert()) chosen = invert(chosen)
    if (useTint()) chosen = tint(chosen)
    const col = chosen
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,ang,a2);ctx.closePath();ctx.fillStyle=col;ctx.fill();ctx.stroke();
    const mid=(ang+a2)/2,lx=cx+Math.cos(mid)*(r+12),ly=cy+Math.sin(mid)*(r+12); ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--fg').trim()||'#0f172a'; ctx.font='12px ui-sans-serif,system-ui'
    const txt=`${labels?.[i]?labels[i]+' ':''}(${Number(v).toFixed(2)}h)`; const tw=ctx.measureText(txt).width; ctx.fillText(txt,lx-tw/2,ly)
    ang=a2;
    if (isDbg()) dbgRows.push({i, id, name, value: v, srvCol, idCol, nameCol, chosenRaw: rawCol, invert: useInvert(), tint: useTint(), final: col})
  })
  // minimal: no extra logs
}

function drawPerDay(){
  const cv = perDay.value; if (!cv) return
  const stacked:any = (charts.value as any).perDaySeries
  const legacy:any = charts.value.perDay
  const ctx = ctxFor(cv); if(!ctx) return
  const W=cv.clientWidth,H=cv.clientHeight,pad=28,x0=pad*1.4,y0=H-pad,x1=W-pad
  const line=getComputedStyle(document.documentElement).getPropertyValue('--line').trim()||'#e5e7eb'
  const fg=getComputedStyle(document.documentElement).getPropertyValue('--fg').trim()||'#0f172a'
  ctx.clearRect(0,0,W,H)
  ctx.strokeStyle=line; ctx.lineWidth=1
  ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y0); ctx.moveTo(x0,y0); ctx.lineTo(x0,pad); ctx.stroke()

  if (stacked && stacked.labels && stacked.series) {
    const labels:string[] = stacked.labels||[]
    const series:any[] = stacked.series||[]
    const totals = labels.map((_,i)=> series.reduce((a,s)=>a+Math.max(0, Number(s.data?.[i]||0)),0))
    const max = Math.max(1, ...totals)
    const n=labels.length||1, g=8, bw=Math.max(6,(x1-x0-g*(n+1))/n), scale=(y0-pad)/max
    labels.forEach((_,i)=>{
      let y=y0
      series.forEach(s=>{
        const v = Math.max(0, Number(s.data?.[i]||0))
        const h = v*scale
        const x = x0+g+i*(bw+g)
        y = y - h
        const col = colorsById.value[s.id] || s.color || '#93c5fd'
        ctx.fillStyle = col
        if (h>0.5) ctx.fillRect(x, y, bw, h)
      })
      ctx.fillStyle=fg; ctx.font='12px ui-sans-serif,system-ui'
      const t=String(labels[i]||'')
      if (bw>26){ const tw=ctx.measureText(t).width; ctx.fillText(t, x0+g+i*(bw+g)+bw/2-tw/2, y0+14) }
    })
    return
  }
  // legacy single-series fallback
  if (!legacy) return
  const data=legacy.data||[], labelsL=legacy.labels||[]
  const max=Math.max(1,...data.map((v:any)=>Math.max(0,v)))
  const n=(data.length||1), g=8, bw=Math.max(6,(x1-x0-g*(n+1))/n), scale=(y0-pad)/max
  ctx.fillStyle='#93c5fd'
  data.forEach((v:any,i:number)=>{
    const h=Math.max(0,v*scale), x=x0+g+i*(bw+g), y=y0-h; ctx.fillRect(x,y,bw,h)
    ctx.fillStyle=fg; ctx.font='12px ui-sans-serif,system-ui'
    const t=String(labelsL[i]||'')
    if (bw>26){ const tw=ctx.measureText(t).width; ctx.fillText(t, x+bw/2-tw/2, y0+14) }
  })
}

  function drawHod(){
  const cv = hod.value, cdata = charts.value.hod
  if (!cv || !cdata) return
  const ctx = ctxFor(cv); if(!ctx) return
  const W=cv.clientWidth,H=cv.clientHeight
  const rows=cdata.dows||[], cols=cdata.hours||[], m=cdata.matrix||[]
  ctx.clearRect(0,0,W,H)
  const pad=36, x0=pad, y0=pad, x1=W-pad, y1=H-pad
  const cw=(x1-x0)/Math.max(1,cols.length), rh=(y1-y0)/Math.max(1,rows.length)
  const vmax = Math.max(0, ...m.flat()) || 1
  for(let r=0;r<rows.length;r++){
    for(let c=0;c<cols.length;c++){
      const v = (m[r]?.[c]) || 0
      const ratio = v / vmax
      const x = x0 + c*cw, y = y0 + r*rh
      ctx.fillStyle = heatColor(ratio)
      ctx.fillRect(x,y,cw-1,rh-1)
    }
  }
  // axes labels (simple)
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--fg').trim()||'#0f172a'
  ctx.font = '12px ui-sans-serif,system-ui'
  rows.forEach((d,i)=> ctx.fillText(d, 8, y0 + i*rh + 12))
  cols.forEach((h,i)=>{ if (i%2===0) ctx.fillText(String(h), x0 + i*cw + 2, y0 - 6) })
  }

  // Efficient draw scheduling to avoid drawing while hidden or before layout
  // Re-enable chart draw scheduling
  let rafId:number|undefined
  function scheduleDraw(){
    if (rafId) return
    rafId = requestAnimationFrame(()=>{ rafId = undefined; drawAll() })
  }

  onMounted(() => {
    console.info('[aaacalstatsdashxyz] start')
    load().catch(err=>{ console.error(err); alert('Initial load failed') })
    // Use window resize listener instead of observing body to prevent RO loops
    try { window.addEventListener('resize', scheduleDraw) } catch(_) {}
  })
 
  watch(range, () => { offset.value = 0; load().catch(console.error) })
  watch(pane, () => { scheduleDraw() })
  watch(calendars, () => { recomputeGroupList(); scheduleDraw() })
</script>

<!-- styles moved to global css/style.css to satisfy strict CSP -->
