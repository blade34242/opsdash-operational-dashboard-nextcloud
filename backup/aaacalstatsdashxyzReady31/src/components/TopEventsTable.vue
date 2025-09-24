<template>
  <!-- Table: longest events with toggleable details row -->
  <table>
    <colgroup><col class="col-w-22"><col><col class="col-w-12"><col class="col-w-18"><col class="col-w-16"></colgroup>
    <thead><tr><th>Calendar</th><th>Summary</th><th class="num">Hours</th><th class="nowrap">Start date</th><th class="nowrap">Start time</th></tr></thead>
    <tbody>
      <template v-for="(r,i) in rows" :key="i">
        <tr @click="$emit('toggle', i)" class="cursor-pointer">
          <td>{{ r.calendar }}</td>
          <td><span class="cell" :title="r.summary">{{ r.summary }}</span></td>
          <td class="num">{{ n2(r.duration_h) }}</td>
          <td class="mono nowrap">{{ (r.start||'').split(' ')[0] }}</td>
          <td class="mono nowrap">{{ (r.start||'').split(' ')[1]?.slice(0,5) }}</td>
        </tr>
        <tr v-if="detailsIndex===i">
          <td colspan="5" class="mono cell-details">
            <div><strong>Details</strong></div>
            <div v-if="r.desc">{{ r.desc }}</div>
            <div v-else class="hint">No description</div>
          </td>
        </tr>
      </template>
    </tbody>
  </table>
</template>

<script setup lang="ts">
defineProps<{ rows: any[]; n2: (v:any)=>string; detailsIndex: number|null }>()
defineEmits(['toggle'])
</script>
