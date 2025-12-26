<template>
  <div
    id="opsdash-sidebar-pane-report"
    class="sb-pane"
    role="tabpanel"
    aria-labelledby="opsdash-sidebar-tab-report"
  >
    <div class="sb-title">Reports &amp; Automation</div>
    <p class="sb-description">
      Configure weekly/monthly digests, interim reminders, and Deck visibility.
    </p>

    <div class="report-card">
      <div class="report-card__header">
        <div>
          <div class="report-card__title">Scheduled summaries</div>
          <div class="report-card__subtitle">
            {{ localReporting.enabled ? 'Sending on schedule' : 'Disabled' }}
          </div>
        </div>
        <label class="switch">
          <input
            type="checkbox"
            :checked="localReporting.enabled"
            @change="updateReporting({ enabled: !localReporting.enabled })"
          />
          <span />
        </label>
      </div>

      <div class="report-form" :class="{ 'report-form--disabled': !localReporting.enabled }">
        <label class="report-field">
          <span>Cadence</span>
          <select
            :value="localReporting.schedule"
            :disabled="!localReporting.enabled"
            @change="updateReporting({ schedule: ($event.target as HTMLSelectElement).value as any })"
          >
            <option value="week">Weekly only</option>
            <option value="month">Monthly only</option>
            <option value="both">Weekly + Monthly</option>
          </select>
        </label>

        <label class="report-field">
          <span>Interim updates</span>
          <select
            :value="localReporting.interim"
            :disabled="!localReporting.enabled"
            @change="updateReporting({ interim: ($event.target as HTMLSelectElement).value as any })"
          >
            <option value="none">None</option>
            <option value="midweek">Mid-week snapshot</option>
            <option value="daily">Daily digest</option>
          </select>
        </label>

        <label class="report-field">
          <span>Reminder lead</span>
          <select
            :value="localReporting.reminderLead"
            :disabled="!localReporting.enabled"
            @change="updateReporting({ reminderLead: ($event.target as HTMLSelectElement).value as any })"
          >
            <option value="none">No reminder</option>
            <option value="1d">1 day before</option>
            <option value="2d">2 days before</option>
          </select>
        </label>

        <div class="report-risk">
          <div class="report-risk__header">
            <label>
              <input
                type="checkbox"
                :checked="localReporting.alertOnRisk"
                :disabled="!localReporting.enabled"
                @change="updateReporting({ alertOnRisk: !localReporting.alertOnRisk })"
              />
              Alert when schedule is at risk
            </label>
            <span>{{ Math.round(localReporting.riskThreshold * 100) }}%</span>
          </div>
          <input
            type="range"
            min="50"
            max="100"
            step="5"
            :disabled="!localReporting.enabled"
            :value="Math.round(localReporting.riskThreshold * 100)"
            @change="onRiskInput"
          />
        </div>

        <fieldset class="report-notify" :disabled="!localReporting.enabled">
          <legend>Delivery channels</legend>
          <label>
            <input
              type="checkbox"
              :checked="localReporting.notifyEmail"
              :disabled="!localReporting.enabled"
              @change="updateReporting({ notifyEmail: !localReporting.notifyEmail })"
            />
            Send via email
          </label>
          <label>
            <input
              type="checkbox"
              :checked="localReporting.notifyNotification"
              :disabled="!localReporting.enabled"
              @change="updateReporting({ notifyNotification: !localReporting.notifyNotification })"
            />
            Nextcloud notification
          </label>
        </fieldset>
      </div>
    </div>

    <div class="report-actions">
      <button
        type="button"
        class="report-save"
        :disabled="saving || !hasChanges"
        @click="saveConfig"
      >
        {{ saving ? 'Saving…' : hasChanges ? 'Save changes' : 'Saved' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { type ReportingConfig } from '../../services/reporting'

const props = defineProps<{
  reportingConfig: ReportingConfig
  saving: boolean
}>()

const emit = defineEmits<{
  (e: 'save-reporting', value: ReportingConfig): void
}>()

const localReporting = ref<ReportingConfig>(cloneReporting(props.reportingConfig))

watch(
  () => props.reportingConfig,
  (next) => {
    localReporting.value = cloneReporting(next)
  },
  { deep: true },
)

const hasChanges = computed(
  () => JSON.stringify(localReporting.value) !== JSON.stringify(props.reportingConfig),
)

function updateReporting(patch: Partial<ReportingConfig>) {
  localReporting.value = {
    ...localReporting.value,
    ...patch,
  }
}

function saveConfig() {
  emit('save-reporting', cloneReporting(localReporting.value))
}

function onRiskInput(event: Event) {
  const target = event.target as HTMLInputElement | null
  if (!target) return
  const percent = Number(target.value)
  if (!Number.isFinite(percent)) return
  updateReporting({ riskThreshold: Math.max(0.5, Math.min(1, percent / 100)) })
}

function cloneReporting(value: ReportingConfig): ReportingConfig {
  return JSON.parse(JSON.stringify(value))
}
</script>

<style scoped>
.report-card {
  border: 1px solid var(--color-border-maxcontrast);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
  background: var(--color-background-hover);
  color: var(--color-main-text);
}
.report-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}
.report-card__title {
  font-weight: 600;
  font-size: 1rem;
}
.report-card__subtitle {
  font-size: 0.85rem;
  color: var(--color-text-lighter);
}
.report-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.report-form--disabled {
  opacity: 0.6;
}
.report-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.85rem;
}
.report-field select {
  border-radius: 8px;
  padding: 0.35rem 0.45rem;
  border: 1px solid var(--color-border);
}
.report-field--checkbox {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}
.report-risk {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.report-risk__header {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  align-items: center;
}
.report-notify {
  border: 1px dashed var(--color-border);
  border-radius: 8px;
  padding: 0.5rem;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}
.report-notify legend {
  font-size: 0.85rem;
  font-weight: 600;
}
.report-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
}
.report-save {
  border-radius: 999px;
  border: 1px solid var(--color-border-maxcontrast);
  padding: 0.35rem 0.9rem;
  background: var(--color-background-hover);
  cursor: pointer;
}
.report-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.switch {
  position: relative;
  display: inline-block;
  width: 38px;
  height: 20px;
}
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.switch span {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-border);
  transition: 0.2s;
  border-radius: 999px;
}
.switch span:before {
  position: absolute;
  content: '';
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: 0.2s;
  border-radius: 50%;
}
.switch input:checked + span {
  background-color: var(--color-primary);
}
.switch input:checked + span:before {
  transform: translateX(18px);
}
.report-saving {
  font-size: 0.85rem;
  color: var(--color-text-lighter);
}

:global(#opsdash.opsdash-theme-dark) .report-card{
  background:var(--opsdash-surface);
  border-color:var(--opsdash-border);
  color:var(--opsdash-text);
}

:global(#opsdash.opsdash-theme-dark) .report-card__subtitle,
:global(#opsdash.opsdash-theme-dark) .report-saving{
  color:var(--opsdash-muted);
}

:global(#opsdash.opsdash-theme-dark) .report-save{
  background:#0f1a30;
  border-color:var(--opsdash-border);
  color:var(--opsdash-text);
}

:global(#opsdash.opsdash-theme-dark) .report-notify{
  border-color:var(--opsdash-border);
}
</style>
