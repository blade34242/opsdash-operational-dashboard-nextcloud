<template>
  <!-- Table: totals grouped by calendar -->
  <table>
    <colgroup><col class="col-w-42"><col class="col-w-12"><col class="col-w-14"><col class="col-w-14"><col class="col-w-18"></colgroup>
    <thead>
      <tr>
        <th class="nowrap">Calendar</th>
        <th class="num">Events</th>
        <th class="num">Hours</th>
        <th class="num">Target</th>
        <th class="num">Δ / %</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="r in rows" :key="r.id || r.calendar">
        <td>
          <div class="cell" :title="r.calendar">
            <div class="row-name">{{ r.calendar }}</div>
            <div class="progress" v-if="hasTarget(r.id) && targetVal(r.id) > 0">
              <div class="progress-bar" :style="{ width: progressPct(r.total_hours, targetVal(r.id)) + '%' }"></div>
            </div>
          </div>
        </td>
        <td class="num">{{ r.events_count }}</td>
        <td class="num">{{ n2(r.total_hours) }}</td>
        <td class="num">{{ targetText(r.id) }}</td>
        <td class="num">
          <template v-if="hasTarget(r.id)">
            <span :class="deltaClass(r.total_hours, targetVal(r.id))">{{ deltaText(r.total_hours, targetVal(r.id)) }}</span>
            <span class="hint" v-if="targetVal(r.id) > 0"> ({{ progressText(r.total_hours, targetVal(r.id)) }})</span>
          </template>
          <template v-else>—</template>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
const props = defineProps<{ rows: any[]; n2: (v:any)=>string; targets?: Record<string, number> }>()

function hasTarget(id?: string){ if (!id) return false; const t = props.targets||{} as any; const v = Number((t as any)[id]); return isFinite(v) && v > 0 }
function targetVal(id?: string){ if (!id) return 0; const t = props.targets||{} as any; const v = Number((t as any)[id]); return isFinite(v) ? v : 0 }
function targetText(id?: string){ const v = targetVal(id); return v>0 ? (Math.round(v*100)/100).toFixed(2) : '—' }
function deltaClass(hours:number, target:number){ const d = hours - target; return d>=0 ? 'delta pos' : 'delta neg' }
function deltaText(hours:number, target:number){ const d = hours - target; const v = Math.abs(Math.round(d*100)/100).toFixed(2); return (d>=0?'+':'-') + v + 'h' }
function progressText(hours:number, target:number){ const p = Math.max(0, Math.min(100, target>0 ? (hours/target*100) : 0)); return p.toFixed(0) + '%' }
function progressPct(hours:number, target:number){ return Math.max(0, Math.min(100, target>0 ? (hours/target*100) : 0)) }
</script>
