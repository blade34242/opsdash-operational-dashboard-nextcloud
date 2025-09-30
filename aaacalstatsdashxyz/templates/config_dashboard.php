<?php
// Minimal mount point; assets are loaded via Util::addScript in controller
?>
<?php
// Template receives optional $version and $changelog from controller
$ver = isset($version) ? (string)$version : '';
$chg = isset($changelog) ? (string)$changelog : '';
?>
<div id="app" data-aaacaldash-version="<?php echo htmlspecialchars($ver, ENT_QUOTES); ?>" data-aaacaldash-changelog="<?php echo htmlspecialchars($chg, ENT_QUOTES); ?>">
  <div class="fallback-msg">
    Calendar Dashboard is loading… If this message stays,
    the JS bundle may be missing.
    <div class="fallback-hint">
      Expected: <code>/apps/aaacalstatsdashxyz/js/main47.js</code>
    </div>
  </div>
</div>
