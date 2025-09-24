<template>
  <!-- Table: totals grouped by calendar -->
  <table>
    <colgroup><col class="col-w-60"><col class="col-w-20"><col class="col-w-20"></colgroup>
    <thead>
      <tr>
        <th class="nowrap">Calendar</th>
        <th class="num">Events</th>
        <th class="num">Hours</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="r in rows" :key="r.calendar">
        <td><span class="cell" :title="r.calendar">{{ r.calendar }}</span></td>
        <td class="num">{{ r.events_count }}</td>
        <td class="num">{{ n2(r.total_hours) }}</td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
defineProps<{ rows: any[]; n2: (v:any)=>string }>()
</script>
