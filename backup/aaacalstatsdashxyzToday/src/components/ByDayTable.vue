<template>
  <!-- Table: daily totals with link to Calendar day view -->
  <table>
    <colgroup><col class="col-w-40"><col class="col-w-30"><col class="col-w-30"></colgroup>
    <thead><tr><th class="nowrap">Date</th><th class="num">Events</th><th class="num">Hours</th></tr></thead>
    <tbody>
      <tr v-for="r in rows" :key="r.date">
        <td class="mono nowrap"><a :href="link(r.date)" target="_blank">{{ r.date }}</a></td>
        <td class="num">{{ r.events_count }}</td>
        <td class="num">{{ n2(r.total_hours) }}</td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
defineProps<{ rows: any[]; n2: (v:any)=>string; link: (date:string)=>string }>()
</script>
