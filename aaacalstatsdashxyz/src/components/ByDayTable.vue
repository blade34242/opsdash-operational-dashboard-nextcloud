<template>
  <!-- Table: daily totals with link to Calendar day view -->
  <table>
    <colgroup><col class="col-w-40"><col class="col-w-30"><col class="col-w-30"></colgroup>
    <thead><tr><th class="nowrap">Date</th><th class="num">Events</th><th class="num">Hours</th></tr></thead>
    <tbody>
      <tr v-for="r in rows" :key="r.date">
        <td class="mono nowrap">
          <a :href="link(r.date)" target="_blank">{{ r.date }}</a>
          <span class="hint"> ({{ weekday(r.date) }})</span>
        </td>
        <td class="num">{{ r.events_count }}</td>
        <td class="num">{{ n2(r.total_hours) }}</td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
defineProps<{ rows: any[]; n2: (v:any)=>string; link: (date:string)=>string }>()

function weekday(dateStr: string): string {
  // Expect YYYY-MM-DD; render short English day for consistency
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr) || '')
  if (!m) return ''
  // Use UTC midnight to avoid local offset shifting date
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return days[d.getUTCDay()] || ''
}
</script>
