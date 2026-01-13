<?php
// Minimal mount point; assets are loaded via Util::addScript in controller
?>
<?php
// Template receives optional $version and $changelog from controller
$ver = isset($version) ? (string)$version : '';
$chg = isset($changelog) ? (string)$changelog : '';
$themePref = isset($themePreference) ? (string)$themePreference : '';
$defaultWidgets = $defaultWidgets ?? [];
$defaultWidgetsJson = json_encode($defaultWidgets, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
?>
<div
  id="app"
  data-opsdash-version="<?php echo htmlspecialchars($ver, ENT_QUOTES); ?>"
  data-opsdash-changelog="<?php echo htmlspecialchars($chg, ENT_QUOTES); ?>"
  data-opsdash-theme-preference="<?php echo htmlspecialchars($themePref, ENT_QUOTES); ?>"
  data-opsdash-default-widgets="<?php echo htmlspecialchars($defaultWidgetsJson ?: '', ENT_QUOTES); ?>"
>
  <style>
    #content.app-opsdash #app {
      min-height: calc(100vh - 56px);
      background: var(--color-main-background, #f6f7f9);
      color: var(--color-main-text, #1f2937);
    }
    #content.app-opsdash #app .opsdash-boot {
      max-width: 640px;
      margin: 24px auto;
      padding: 20px 22px;
      border-radius: 16px;
      background: var(--color-main-background, #ffffff);
      border: 1px solid var(--color-border, #e5e7eb);
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
    }
    #content.app-opsdash #app .opsdash-boot__title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    #content.app-opsdash #app .opsdash-boot__hint {
      font-size: 13px;
      color: var(--color-text-maxcontrast, #6b7280);
      margin-top: 8px;
    }
    #content.app-opsdash #app .opsdash-boot__bars {
      display: grid;
      gap: 10px;
      margin-top: 14px;
    }
    #content.app-opsdash #app .opsdash-boot__bar {
      height: 10px;
      border-radius: 999px;
      background: linear-gradient(90deg, rgba(148, 163, 184, 0.25), rgba(148, 163, 184, 0.45));
      overflow: hidden;
      position: relative;
    }
    #content.app-opsdash #app .opsdash-boot__bar::after {
      content: '';
      position: absolute;
      inset: 0;
      transform: translateX(-60%);
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent);
      animation: opsdash-boot-shimmer 1.4s ease-in-out infinite;
    }
    #content.app-opsdash #app .opsdash-boot__bar--short { width: 52%; }
    #content.app-opsdash #app .opsdash-boot__bar--medium { width: 72%; }
    #content.app-opsdash #app .opsdash-boot__bar--full { width: 100%; }
    @keyframes opsdash-boot-shimmer {
      0% { transform: translateX(-60%); }
      100% { transform: translateX(140%); }
    }
  </style>
  <div class="opsdash-boot">
    <div class="opsdash-boot__title">Operational Dashboard is loading…</div>
    <div class="opsdash-boot__bars">
      <div class="opsdash-boot__bar opsdash-boot__bar--full"></div>
      <div class="opsdash-boot__bar opsdash-boot__bar--medium"></div>
      <div class="opsdash-boot__bar opsdash-boot__bar--short"></div>
    </div>
    <div class="opsdash-boot__hint">If this stays, the JS bundle may be missing.</div>
  </div>
</div>
