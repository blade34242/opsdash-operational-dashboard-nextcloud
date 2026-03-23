<template>
  <div class="preferences-step">
    <h3>Preferences</h3>
    <p class="hint">Edit the defaults you almost always need. Add-ons stay separate.</p>

    <div class="preferences-grid preferences-grid--core-optional">
      <section class="pref-card pref-card--core pref-card--stack">
        <h4>Core defaults</h4>

        <div class="field-row">
          <div class="field-copy">
            <strong>Theme</strong>
            <p>Follow Nextcloud / light / dark</p>
          </div>
          <div class="field-actions">
            <span class="value-chip">{{ themeSummaryLabel }}</span>
            <button type="button" class="action-chip" @click="toggleCoreEditor('theme')">Choose</button>
          </div>
        </div>
        <div v-if="openCoreEditor === 'theme'" class="editor-card">
          <strong>Open theme selection</strong>
          <div class="choice-strip">
            <button
              type="button"
              class="choice-pill"
              :class="{ active: themePreference === 'auto' }"
              @click="setThemePreference('auto')"
            >
              Follow Nextcloud
            </button>
            <button
              type="button"
              class="choice-pill"
              :class="{ active: themePreference === 'light' }"
              @click="setThemePreference('light')"
            >
              Light
            </button>
            <button
              type="button"
              class="choice-pill"
              :class="{ active: themePreference === 'dark' }"
              @click="setThemePreference('dark')"
            >
              Dark
            </button>
          </div>
          <p class="quiet">Current preview follows {{ previewTheme === 'dark' ? 'dark' : 'light' }} mode.</p>
        </div>

        <div class="field-row">
          <div class="field-copy">
            <strong>All-day hours</strong>
            <p>Contribution per all-day event and day.</p>
          </div>
          <div class="field-actions">
            <span class="value-chip">{{ allDayHoursLabel }}</span>
            <button type="button" class="action-chip" @click="toggleCoreEditor('allDay')">Edit</button>
          </div>
        </div>
        <div v-if="openCoreEditor === 'allDay'" class="editor-card">
          <strong>Open all-day hours editor</strong>
          <div class="choice-strip">
            <button
              type="button"
              class="choice-pill"
              :class="{ active: allDayHoursInput === 6 }"
              @click="setAllDayHours(6)"
            >
              6 h
            </button>
            <button
              type="button"
              class="choice-pill"
              :class="{ active: allDayHoursInput === 8 }"
              @click="setAllDayHours(8)"
            >
              8 h
            </button>
            <button
              type="button"
              class="choice-pill"
              :class="{ active: allDayHoursInput === 10 }"
              @click="setAllDayHours(10)"
            >
              10 h
            </button>
            <label class="inline-input">
              <span>Custom</span>
              <input
                type="number"
                min="0"
                max="24"
                step="0.25"
                :value="allDayHoursInput"
                @input="onAllDayHoursChange($event.target as HTMLInputElement)"
              />
              <span class="slot">h</span>
            </label>
          </div>
          <p class="quiet">Preset values stay visible, but you can still type a custom hours value.</p>
        </div>

        <div class="field-row">
          <div class="field-copy">
            <strong>Trend lookback</strong>
            <p>Global default for trends.</p>
          </div>
          <div class="field-actions">
            <span class="value-chip">{{ lookbackLabel }}</span>
            <button type="button" class="action-chip" @click="toggleCoreEditor('lookback')">Choose</button>
          </div>
        </div>
        <div v-if="openCoreEditor === 'lookback'" class="editor-card">
          <strong>Open trend lookback selection</strong>
          <div class="choice-strip compact">
            <button
              v-for="option in lookbackOptions"
              :key="option"
              type="button"
              class="choice-pill"
              :class="{ active: trendLookbackInput === option }"
              @click="setTrendLookback(option)"
            >
              {{ option }} week{{ option === 1 ? '' : 's' }}
            </button>
          </div>
          <p class="quiet">Allowed range: 1 to 6 weeks. This stays compact as a one-row selection.</p>
        </div>
      </section>

      <section class="pref-card pref-card--stack">
        <h4>Add-on modules</h4>

        <div class="module-card">
          <strong>Recap reporting</strong>
          <p>Current optional module for schedule, reminders, and risk alerts.</p>
          <div class="row">
            <span class="soft-pill">{{ reportingDraft.enabled ? 'Recap on' : 'Recap off' }}</span>
            <button type="button" class="action-chip" @click="reportingOpen = !reportingOpen">
              {{ reportingOpen ? 'Close module' : 'Open module' }}
            </button>
          </div>
        </div>

        <div v-if="reportingOpen" class="editor-card">
          <strong>Open recap reporting module</strong>
          <div v-if="reportingDraft.enabled" class="field-row">
            <div class="field-copy">
              <strong>Enabled</strong>
              <p>Turn recap reporting on or off.</p>
            </div>
            <div class="field-actions">
              <button
                type="button"
                class="toggle-chip"
                :class="{ on: reportingDraft.enabled }"
                @click="setReportingEnabled(!reportingDraft.enabled)"
              >
                {{ reportingDraft.enabled ? 'On' : 'Off' }}
              </button>
            </div>
          </div>
          <div v-if="reportingDraft.enabled" class="field-row">
            <div class="field-copy">
              <strong>Schedule</strong>
              <p>When the recap should be sent.</p>
            </div>
            <div class="field-actions field-actions--wrap">
              <button
                type="button"
                class="choice-pill"
                :class="{ active: reportingDraft.schedule === 'week' }"
                @click="setReportingSchedule('week')"
              >
                Weekly
              </button>
              <button
                type="button"
                class="choice-pill"
                :class="{ active: reportingDraft.schedule === 'month' }"
                @click="setReportingSchedule('month')"
              >
                Monthly
              </button>
              <button
                type="button"
                class="choice-pill"
                :class="{ active: reportingDraft.schedule === 'both' }"
                @click="setReportingSchedule('both')"
              >
                Weekly + Monthly
              </button>
            </div>
          </div>
          <div v-if="reportingDraft.enabled" class="field-row">
            <div class="field-copy">
              <strong>Reminders</strong>
              <p>How often recap nudges appear while enabled.</p>
            </div>
            <div class="field-actions field-actions--wrap">
              <button
                type="button"
                class="choice-pill"
                :class="{ active: reportingDraft.interim === 'none' }"
                @click="setReportingInterim('none')"
              >
                Off
              </button>
              <button
                type="button"
                class="choice-pill"
                :class="{ active: reportingDraft.interim === 'midweek' }"
                @click="setReportingInterim('midweek')"
              >
                Mid-range
              </button>
              <button
                type="button"
                class="choice-pill"
                :class="{ active: reportingDraft.interim === 'daily' }"
                @click="setReportingInterim('daily')"
              >
                Daily
              </button>
            </div>
          </div>
          <div class="field-row">
            <div class="field-copy">
              <strong>Risk alert</strong>
              <p>Highlight if targets drift.</p>
            </div>
            <div class="field-actions">
              <button
                type="button"
                class="toggle-chip"
                :class="{ on: reportingDraft.alertOnRisk }"
                @click="updateReporting({ alertOnRisk: !reportingDraft.alertOnRisk })"
              >
                {{ reportingDraft.alertOnRisk ? 'On' : 'Off' }}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ReportingConfig } from '../../services/reporting'

const props = defineProps<{
  themePreference: 'auto' | 'light' | 'dark'
  systemThemeLabel: string
  previewTheme: 'light' | 'dark'
  setThemePreference: (value: 'auto' | 'light' | 'dark') => void
  totalHoursInput: number | null
  categoryTotalHours: number
  categoriesEnabled: boolean
  onTotalHoursChange: (el: HTMLInputElement) => void
  allDayHoursInput: number
  onAllDayHoursChange: (el: HTMLInputElement) => void
  trendLookbackInput: number
  onTrendLookbackChange: (el: HTMLInputElement) => void
  reportingDraft: ReportingConfig
  setReportingEnabled: (enabled: boolean) => void
  setReportingSchedule: (schedule: ReportingConfig['schedule']) => void
  setReportingInterim: (interim: ReportingConfig['interim']) => void
  updateReporting: (patch: Partial<ReportingConfig>) => void
}>()

const openCoreEditor = ref<'theme' | 'allDay' | 'lookback'>('theme')
const reportingOpen = ref(false)
const lookbackOptions = [1, 2, 3, 4, 5, 6]

const themeSummaryLabel = computed(() => {
  if (props.themePreference === 'auto') return 'Auto'
  if (props.themePreference === 'light') return 'Light'
  return 'Dark'
})

const allDayHoursLabel = computed(() => `${Number(props.allDayHoursInput || 0).toFixed(props.allDayHoursInput % 1 === 0 ? 0 : 2)} h`)
const lookbackLabel = computed(() => `${props.trendLookbackInput}`)

function toggleCoreEditor(target: 'theme' | 'allDay' | 'lookback') {
  openCoreEditor.value = openCoreEditor.value === target ? target : target
}

function setAllDayHours(value: number) {
  props.onAllDayHoursChange({ value: String(value) } as HTMLInputElement)
}

function setTrendLookback(value: number) {
  props.onTrendLookbackChange({ value: String(value) } as HTMLInputElement)
}

const {
  themePreference,
  previewTheme,
  setThemePreference,
  allDayHoursInput,
  onAllDayHoursChange,
  trendLookbackInput,
  reportingDraft,
  setReportingEnabled,
  setReportingSchedule,
  setReportingInterim,
  updateReporting,
} = props
</script>
