#!/usr/bin/env bash
# One-shot installer for cc-sdlc.
#
# MODE=cursor (default) → install Cursor plugin tree + walkthrough desktop app
# MODE=claude           → install walkthrough desktop app only
#                         (install plugin separately via /plugin marketplace)
#
# Bootstrap (public repo, no auth required):
#   # Cursor users
#   curl -fsSL https://raw.githubusercontent.com/zolem/cc-sdlc/main/install.sh | bash
#
#   # Claude Code users
#   curl -fsSL https://raw.githubusercontent.com/zolem/cc-sdlc/main/install.sh | MODE=claude bash
#
# Pin a version:
#   curl -fsSL https://raw.githubusercontent.com/zolem/cc-sdlc/main/install.sh | VERSION=v1.1.0 bash
#
# Skip the desktop app entirely:
#   curl -fsSL .../install.sh | SKIP_APP=1 bash
#
# Override the repo (e.g., your fork):
#   curl -fsSL .../install.sh | REPO=my-org/cc-sdlc bash
#
# Note: this script uses the public GitHub REST API to resolve asset URLs
#       (unauthenticated rate limit is 60 requests/hour per IP, plenty for
#       a single install).

set -euo pipefail

REPO="${REPO:-zolem/cc-sdlc}"
VERSION="${VERSION:-latest}"
MODE="${MODE:-cursor}"
SKIP_APP="${SKIP_APP:-0}"
SKIP_PLUGIN="${SKIP_PLUGIN:-0}"

case "$MODE" in
  cursor|claude)
    ;;
  *)
    echo "error: MODE must be 'cursor' or 'claude' (got '$MODE')" >&2
    exit 1
    ;;
esac

for cmd in curl tar; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "error: '$cmd' is required but not installed." >&2
    exit 1
  fi
done

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# Resolve a release asset URL from the public GitHub API.
# $1 = filename glob pattern (e.g. "Orchestrate.Walkthrough_*_aarch64.dmg")
resolve_asset_url() {
  local pattern="$1"
  local api_path
  if [[ "$VERSION" == "latest" ]]; then
    api_path="https://api.github.com/repos/$REPO/releases/latest"
  else
    api_path="https://api.github.com/repos/$REPO/releases/tags/$VERSION"
  fi

  # Convert shell glob to grep-friendly regex (escape dots, swap * for .*).
  local regex
  regex=$(printf '%s' "$pattern" | sed -e 's/\./\\./g' -e 's/\*/.*/g')

  curl -fsSL "$api_path" \
    | grep -o '"browser_download_url": *"[^"]*"' \
    | sed 's/.*: *"\(.*\)"/\1/' \
    | grep -E "/$regex$" \
    | head -1
}

download_asset() {
  local pattern="$1"
  local dest="$2"
  local url
  url=$(resolve_asset_url "$pattern")
  if [[ -z "$url" ]]; then
    echo "error: no release asset matching '$pattern' on $REPO ($VERSION)" >&2
    exit 1
  fi
  local fname="${url##*/}"
  echo "  ↓ $fname"
  curl -fsSL -o "$dest/$fname" "$url"
  echo "$dest/$fname"
}

install_cursor_plugin() {
  echo
  echo "═══ Installing Cursor plugin ═══"

  echo "→ Downloading cursor-plugin.tar.gz (${VERSION})"
  local archive
  archive=$(download_asset "cursor-plugin.tar.gz" "$TMP" | tail -1)

  local target="$HOME/.cursor/plugins/local/cc-sdlc"
  mkdir -p "$target"
  rm -rf "$target"/*
  tar -xzf "$archive" -C "$target"

  echo "✓ Cursor plugin installed at $target"
  echo "  Restart Cursor to load agents and skills."
}

install_app_macos() {
  local arch
  arch=$(uname -m)
  local pattern
  if [[ "$arch" == "arm64" ]]; then
    pattern="Orchestrate.Walkthrough_*_aarch64.dmg"
  else
    pattern="Orchestrate.Walkthrough_*_x64.dmg"
  fi

  echo "→ Downloading walkthrough app (${arch})"
  local dmg
  dmg=$(download_asset "$pattern" "$TMP" | tail -1)

  echo "→ Mounting ${dmg##*/}"
  local mount_point
  mount_point=$(hdiutil attach -nobrowse -noautoopen "$dmg" | tail -1 | awk -F'\t' '{print $NF}')

  if [[ -d "/Applications/Orchestrate Walkthrough.app" ]]; then
    echo "→ Removing previous installation"
    rm -rf "/Applications/Orchestrate Walkthrough.app"
  fi

  echo "→ Copying to /Applications"
  cp -R "$mount_point/Orchestrate Walkthrough.app" "/Applications/"

  hdiutil detach -quiet "$mount_point"

  # macOS Gatekeeper: clear the quarantine bit so the unsigned app can run
  xattr -dr com.apple.quarantine "/Applications/Orchestrate Walkthrough.app" 2>/dev/null || true

  local bin_target="/Applications/Orchestrate Walkthrough.app/Contents/MacOS/orchestrate-walkthrough"
  local link_dir="/usr/local/bin"
  if [[ ! -d "$link_dir" ]] || [[ ! -w "$link_dir" ]]; then
    link_dir="$HOME/.local/bin"
    mkdir -p "$link_dir"
  fi
  echo "→ Symlinking 'orchestrate-walkthrough' into ${link_dir}"
  ln -sf "$bin_target" "$link_dir/orchestrate-walkthrough"

  if [[ ":$PATH:" != *":$link_dir:"* ]]; then
    echo "  (note: $link_dir is not on your PATH; add it or use the full binary path)"
  fi

  echo "✓ Walkthrough app installed at /Applications/Orchestrate Walkthrough.app"
}

install_app_linux() {
  echo "→ Downloading walkthrough app (Linux)"
  local appimage
  appimage=$(download_asset "Orchestrate.Walkthrough_*_amd64.AppImage" "$TMP" | tail -1)

  local dest="$HOME/.local/bin"
  mkdir -p "$dest"
  cp "$appimage" "$dest/orchestrate-walkthrough"
  chmod +x "$dest/orchestrate-walkthrough"

  echo "✓ Walkthrough app installed at $dest/orchestrate-walkthrough"

  if [[ ":$PATH:" != *":$dest:"* ]]; then
    echo "  (note: $dest is not on your PATH; add it to your shell rc)"
  fi
}

install_app() {
  echo
  echo "═══ Installing walkthrough desktop app ═══"

  case "$(uname -s)" in
    Darwin) install_app_macos ;;
    Linux) install_app_linux ;;
    *) echo "warning: unsupported platform $(uname -s); skipping app install." >&2 ;;
  esac
}

# Main
echo "Installing cc-sdlc (${VERSION}, mode=${MODE}) from ${REPO}"

if [[ "$SKIP_PLUGIN" != "1" ]]; then
  if [[ "$MODE" == "cursor" ]]; then
    install_cursor_plugin
  fi
fi

if [[ "$SKIP_APP" != "1" ]]; then
  install_app
fi

echo
if [[ "$MODE" == "claude" ]]; then
  echo "Done. Next steps:"
  echo "  1. In Claude Code, run: /plugin marketplace add ${REPO}"
  echo "  2. Then: /plugin install cc-sdlc@cc-sdlc"
  echo "  3. Open the walkthrough app: orchestrate-walkthrough <repo>"
else
  echo "Done. Restart Cursor to load the plugin."
  echo "  CLI: orchestrate-walkthrough <repo>"
  echo "  In Cursor: /orchestrate <brief>"
fi
