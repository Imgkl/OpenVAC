#!/usr/bin/env bash
set -euo pipefail

# --- defaults ---
INPUT=""
FPS=15
PLAYBACK=false
CLEANUP=false
ASPECT=2.0
THRESHOLD=10
MOTION=0
OUTPUT_DIR="frames"

DENSITY=' .\`^",:;Il!i><~+_-?][}{1)(|\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$'

usage() {
  cat <<EOF
Usage: $(basename "$0") -i <video> [options]

Options:
  -i FILE   Input video file (required)
  -f NUM    Target FPS (default: 15)
  -p        Enable terminal playback preview
  -c        Clean up temp image files after conversion
  -a NUM    Font aspect ratio height/width (default: 2.0)
  -t NUM    Black clipping threshold 0-255 (default: 10)
  -m NUM    Motion sensitivity: suppress static background (0=off, default: 0)
  -o DIR    Output directory (default: frames)
  -h        Show this help
EOF
  exit 1
}

while getopts "i:f:pca:t:m:o:h" opt; do
  case "$opt" in
    i) INPUT="$OPTARG" ;;
    f) FPS="$OPTARG" ;;
    p) PLAYBACK=true ;;
    c) CLEANUP=true ;;
    a) ASPECT="$OPTARG" ;;
    t) THRESHOLD="$OPTARG" ;;
    m) MOTION="$OPTARG" ;;
    o) OUTPUT_DIR="$OPTARG" ;;
    h) usage ;;
    *) usage ;;
  esac
done

if [[ -z "$INPUT" ]]; then
  echo "Error: input file is required (-i)" >&2
  usage
fi

if [[ ! -f "$INPUT" ]]; then
  echo "Error: file not found: $INPUT" >&2
  exit 1
fi

if ! command -v ffmpeg &>/dev/null; then
  echo "Error: ffmpeg is required but not installed." >&2
  echo "Install with:" >&2
  echo "  macOS:  brew install ffmpeg" >&2
  echo "  Ubuntu: sudo apt install ffmpeg" >&2
  exit 1
fi

if ! command -v ffprobe &>/dev/null; then
  echo "Error: ffprobe is required but not installed (comes with ffmpeg)." >&2
  exit 1
fi

WIDTHS=(80 160 240)
TIER_NAMES=("low" "medium" "high")
DENSITY_LEN=${#DENSITY}

probe=$(ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height -of csv=p=0 "$INPUT")
VID_W=$(echo "$probe" | cut -d',' -f1)
VID_H=$(echo "$probe" | cut -d',' -f2)

if [[ -z "$VID_W" || -z "$VID_H" ]]; then
  echo "Error: could not determine video dimensions" >&2
  exit 1
fi

echo "Video: ${VID_W}x${VID_H}"
echo "FPS: $FPS  Aspect: $ASPECT  Threshold: $THRESHOLD  Motion: $MOTION"

TMPDIR_WORK=$(mktemp -d)
trap 'rm -rf "$TMPDIR_WORK"' EXIT

for i in "${!WIDTHS[@]}"; do
  mkdir -p "${OUTPUT_DIR}/${TIER_NAMES[$i]}"
done

echo "Extracting frames..."
ffmpeg -v error -i "$INPUT" -vf "fps=$FPS" "$TMPDIR_WORK/frame_%04d.ppm"

FRAME_FILES=("$TMPDIR_WORK"/frame_*.ppm)
TOTAL=${#FRAME_FILES[@]}
echo "Extracted $TOTAL frames"

generate_ref() {
  local src="$1"
  local ascii_w="$2"
  local out="$3"
  local aspect="$4"

  local ascii_h
  ascii_h=$(awk "BEGIN { printf \"%d\", ($ascii_w * $VID_H / $VID_W) / $aspect }")

  ffmpeg -v error -i "$src" -vf "scale=${ascii_w}:${ascii_h}" \
    -f rawvideo -pix_fmt rgb24 pipe:1 | \
    hexdump -v -e '3/1 "%u " "\n"' | \
    awk '{
      lum = 0.2126*$1 + 0.7152*$2 + 0.0722*$3
      print (lum/255)^(1/2.2) * 255
    }' > "$out"
}

convert_frame() {
  local src="$1"
  local ascii_w="$2"
  local tier="$3"
  local out="$4"
  local threshold="$5"
  local aspect="$6"
  local motion="$7"
  local ref_file="$8"

  local ascii_h
  ascii_h=$(awk "BEGIN { printf \"%d\", ($ascii_w * $VID_H / $VID_W) / $aspect }")

  ffmpeg -v error -i "$src" -vf "scale=${ascii_w}:${ascii_h}" \
    -f rawvideo -pix_fmt rgb24 pipe:1 | \
    hexdump -v -e '3/1 "%u " "\n"' | \
    awk -v w="$ascii_w" -v thresh="$threshold" -v density="$DENSITY" \
        -v motion="$motion" -v reffile="$ref_file" '
    BEGIN {
      dlen = length(density); col = 0; line = ""; px = 0
      if (motion > 0 && reffile != "") {
        while ((getline rl < reffile) > 0) ref[px++] = rl + 0
        close(reffile)
      }
      px = 0
    }
    {
      lum = 0.2126*$1 + 0.7152*$2 + 0.0722*$3
      gc = (lum/255)^(1/2.2) * 255
      show = 1
      if (motion > 0 && px in ref) {
        diff = gc - ref[px]
        if (diff < 0) diff = -diff
        if (diff < motion) show = 0
      }
      px++
      if (!show || gc < thresh) ch = " "
      else {
        idx = int(gc * (dlen - 1) / 255)
        ch = substr(density, idx + 1, 1)
      }
      line = line ch
      col++
      if (col >= w) { print line; line = ""; col = 0 }
    }
    END { if (line != "") print line }
    ' > "$out"
}

if (( MOTION > 0 )); then
  echo "Generating reference frames for motion detection..."
  for t_idx in "${!WIDTHS[@]}"; do
    generate_ref \
      "${FRAME_FILES[0]}" \
      "${WIDTHS[$t_idx]}" \
      "$TMPDIR_WORK/ref_${TIER_NAMES[$t_idx]}.dat" \
      "$ASPECT"
  done
fi

for f_idx in "${!FRAME_FILES[@]}"; do
  frame_num=$((f_idx + 1))
  padded=$(printf "%03d" "$frame_num")
  echo "Converting frame ${frame_num}/${TOTAL}"

  for t_idx in "${!WIDTHS[@]}"; do
    ref_arg=""
    if (( MOTION > 0 )); then
      ref_arg="$TMPDIR_WORK/ref_${TIER_NAMES[$t_idx]}.dat"
    fi
    convert_frame \
      "${FRAME_FILES[$f_idx]}" \
      "${WIDTHS[$t_idx]}" \
      "${TIER_NAMES[$t_idx]}" \
      "${OUTPUT_DIR}/${TIER_NAMES[$t_idx]}/frame_${padded}.txt" \
      "$THRESHOLD" \
      "$ASPECT" \
      "$MOTION" \
      "$ref_arg"
  done
done
echo ""
echo "Done. Frames saved to ${OUTPUT_DIR}/"

for t in "${TIER_NAMES[@]}"; do
  count=$(ls -1 "${OUTPUT_DIR}/$t/" 2>/dev/null | wc -l | tr -d ' ')
  echo "  $t: $count frames"
done

if $PLAYBACK; then
  echo "Playing back (low tier)... Press Ctrl+C to stop."
  DELAY=$(awk "BEGIN { printf \"%.4f\", 1/$FPS }")
  for f in "${OUTPUT_DIR}/low"/frame_*.txt; do
    clear
    cat "$f"
    sleep "$DELAY"
  done
fi

if $CLEANUP; then
  echo "Cleaning up temp files..."
fi

echo "Complete."
