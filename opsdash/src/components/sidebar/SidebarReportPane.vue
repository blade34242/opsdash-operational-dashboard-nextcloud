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
            {{ reportingConfig.enabled ? 'Sending on schedule' : 'Disabled' }}
          </div>
        </div>
        <label class="switch">
          <input
            type="checkbox"
            :checked="reportingConfig.enabled"
            @change="updateReporting({ enabled: !reportingConfig.enabled })"
          />
          <span />
        </label>
      </div>

      <div class="report-form" :class="{ 'report-form--disabled': !reportingConfig.enabled }">
        <label class="report-field">
          <span>Cadence</span>
          <select
            :value="reportingConfig.schedule"
            :disabled="!reportingConfig.enabled"
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
            :value="reportingConfig.interim"
            :disabled="!reportingConfig.enabled"
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
            :value="reportingConfig.reminderLead"
            :disabled="!reportingConfig.enabled"
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
                :checked="reportingConfig.alertOnRisk"
                :disabled="!reportingConfig.enabled"
                @change="updateReporting({ alertOnRisk: !reportingConfig.alertOnRisk })"
              />
              Alert when schedule is at risk
            </label>
            <span>{{ Math.round(reportingConfig.riskThreshold * 100) }}%</span>
          </div>
          <input
            type="range"
            min="50"
            max="100"
            step="5"
            :disabled="!reportingConfig.enabled"
            :value="Math.round(reportingConfig.riskThreshold * 100)"
            @input="onRiskInput"
          />
        </div>

        <fieldset class="report-notify" :disabled="!reportingConfig.enabled">
          <legend>Delivery channels</legend>
          <label>
            <input
              type="checkbox"
              :checked="reportingConfig.notifyEmail"
              :disabled="!reportingConfig.enabled"
              @change="updateReporting({ notifyEmail: !reportingConfig.notifyEmail })"
            />
            Send via email
          </label>
          <label>
            <input
              type="checkbox"
              :checked="reportingConfig.notifyNotification"
              :disabled="!reportingConfig.enabled"
              @change="updateReporting({ notifyNotification: !reportingConfig.notifyNotification })"
            />
            Nextcloud notification
          </label>
        </fieldset>
      </div>
    </div>

    <div class="report-card">
      <div class="report-card__header">
        <div>
          <div class="report-card__title">Deck tab</div>
          <div class="report-card__subtitle">
            {{ deckSettings.enabled ? 'Visible in dashboard' : 'Hidden for this user' }}
          </div>
        </div>
        <label class="switch">
          <input
            type="checkbox"
            :checked="deckSettings.enabled"
            @change="updateDeck({ enabled: !deckSettings.enabled })"
          />
          <span />
        </label>
      </div>

      <div class="report-form">
        <label class="report-field">
          <span>Default filter</span>
          <select
            :value="deckSettings.defaultFilter"
            :disabled="!deckSettings.enabled"
            @change="updateDeck({ defaultFilter: ($event.target as HTMLSelectElement).value as any })"
          >
            <option value="all">All cards</option>
            <option value="mine">My cards</option>
          </select>
        </label>

        <label class="report-field report-field--checkbox">
          <input
            type="checkbox"
            :checked="deckSettings.filtersEnabled"
            :disabled="!deckSettings.enabled"
            @change="updateDeck({ filtersEnabled: !deckSettings.filtersEnabled })"
          />
          Enable filter buttons
        </label>
      </div>
    </div>

    <div v-if="saving" class="report-saving">Saving changes…</div>
  </div>
</template>

<script setup lang="ts">
import { type ReportingConfig, type DeckFeatureSettings } from '../../services/reporting'

const props = defineProps<{
  reportingConfig: ReportingConfig
  deckSettings: DeckFeatureSettings
  saving: boolean
}>()

const emit = defineEmits<{
  (e: 'update:reporting-config', value: ReportingConfig): void
  (e: 'update:deck-settings', value: DeckFeatureSettings): void
}>()

function updateReporting(patch: Partial<ReportingConfig>) {
  emit('update:reporting-config', {
    ...props.reportingConfig,
    ...patch,
  })
}

function updateDeck(patch: Partial<DeckFeatureSettings>) {
  emit('update:deck-settings', {
    ...props.deckSettings,
    ...patch,
  })
}

function onRiskInput(event: Event) {
  const target = event.target as HTMLInputElement | null
  if (!target) return
  const percent = Number(target.value)
  if (!Number.isFinite(percent)) return
  updateReporting({ riskThreshold: Math.max(0.5, Math.min(1, percent / 100)) })
}
</script>

<style scoped>
.report-card {
  border: 1px solid var(--color-border-maxcontrast);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
  background: var(--color-main-background);
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
  color: var(--color-text-maxcontrast);
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
  color: var(--color-text-maxcontrast);
}
</style>
