#!/usr/bin/env -S blender --background --python
"""
Convert reference asset packs to GLB.

Run via: blender --background --python scripts/convert-references.py [--force]

Reads scripts/convert-references.config.json. For each declared slug:

1. Picks the richest source from the candidate list (smart picker — see below).
2. Imports it (GLTF / DAE / OBJ — auto-dispatch on extension).
3. For DAE sources with sidecar PNGs, bakes per-bone diffuse + emissive into a
   single 256² atlas via Cycles.
4. Applies optional decimation, scale, vertex tint.
5. Sets origin to ground-bounds (so feet sit at Y=0).
6. Strips animation tracks.
7. Exports GLB with embedded textures (WEBP-compressed) into
   public/assets/models/{characters,props,traps}/<slug>.glb.
8. Updates public/assets/models/manifest.json atomically.

Idempotent: per-slug SHA-256 over (input bytes + script version + slug options).
Skips when the manifest's sourceHash matches and the GLB exists. Use --force
to override.

Smart source picker tie-break (since we strip animations anyway):
- Prefer formats with unified textures (OBJ+MTL+PNG, GLTF embedded) over per-bone DAE.
- Among same-tier sources, prefer GLTF > GLB > OBJ > DAE.
- If a source explicitly declares bake (DAE), respect it.

This script intentionally avoids npm dependencies; it runs entirely inside Blender's
Python (3.11+).
"""

from __future__ import annotations

import argparse
import bpy
import hashlib
import json
import os
import re
import sys
import tempfile
from pathlib import Path

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SCRIPT_VERSION = "1.0.0"

REPO_ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = REPO_ROOT / "scripts" / "convert-references.config.json"


# ---------------------------------------------------------------------------
# Utility: deterministic hashing for idempotency
# ---------------------------------------------------------------------------


def hash_inputs(source_paths: list[Path], options: dict) -> str:
    h = hashlib.sha256()
    h.update(SCRIPT_VERSION.encode())
    h.update(json.dumps(options, sort_keys=True).encode())
    for p in source_paths:
        if p.exists():
            h.update(p.read_bytes())
    return f"sha256:{h.hexdigest()}"


# ---------------------------------------------------------------------------
# Smart source picker
# ---------------------------------------------------------------------------


_FORMAT_PREF = {".glb": 5, ".gltf": 4, ".obj": 3}


def score_source(path: Path) -> int:
    """Higher is better. Animations are not counted (we strip them anyway).
    DAE is unsupported on Blender 5 and gets the lowest score so the picker
    never selects it when an OBJ/GLTF alternative is present in the same
    sources list."""
    if not path.exists():
        return -1
    score = _FORMAT_PREF.get(path.suffix.lower(), 0) * 100
    # Prefer files with unified texture sidecars (.mtl + .png next to .obj)
    if path.suffix.lower() == ".obj" and (path.parent / (path.stem + ".mtl")).exists():
        score += 50
    return score


def pick_source(candidates: list[Path]) -> Path:
    if not candidates:
        raise ValueError("No source candidates")
    scored = sorted(candidates, key=score_source, reverse=True)
    best = scored[0]
    if not best.exists():
        raise FileNotFoundError(f"No source candidate exists; first: {best}")
    return best


# ---------------------------------------------------------------------------
# Blender helpers
# ---------------------------------------------------------------------------


def clean_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    # Switch to Cycles for baking; default is EEVEE Next which can't bake the same way.
    bpy.context.scene.render.engine = "CYCLES"
    bpy.context.scene.cycles.device = "CPU"


def import_source(path: Path) -> None:
    """Import a source file. Blender 5 dropped DAE/Collada support — every
    reference pack ships an OBJ or GLTF alternative, so DAE is intentionally
    not handled. The smart picker filters DAE out via score_source returning
    a low score, but we explicitly raise here to fail loudly if config drift
    points at one."""
    suffix = path.suffix.lower()
    if suffix == ".gltf" or suffix == ".glb":
        bpy.ops.import_scene.gltf(filepath=str(path))
    elif suffix == ".obj":
        # Blender 4.x+ uses wm.obj_import (replaces import_scene.obj)
        if hasattr(bpy.ops.wm, "obj_import"):
            bpy.ops.wm.obj_import(filepath=str(path))
        else:
            bpy.ops.import_scene.obj(filepath=str(path))
    elif suffix == ".dae":
        raise ValueError(
            f"DAE not supported in Blender 5: {path}. Use the pack's OBJ alternative."
        )
    else:
        raise ValueError(f"Unsupported source extension: {suffix}")


def get_mesh_objects() -> list:
    return [o for o in bpy.data.objects if o.type == "MESH"]


def merge_meshes() -> None:
    """Join all mesh objects into one (selected = active = result)."""
    meshes = get_mesh_objects()
    if not meshes:
        return
    if len(meshes) == 1:
        bpy.context.view_layer.objects.active = meshes[0]
        return
    bpy.ops.object.select_all(action="DESELECT")
    for m in meshes:
        m.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()


def apply_transforms(obj) -> None:
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def set_origin_to_ground(obj) -> None:
    """Move the object so its lowest bounding-box Y sits at the world origin."""
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    # Compute bounding-box min in world space
    mins_y = min((obj.matrix_world @ v.co).y for v in obj.data.vertices)
    obj.location.y -= mins_y


def apply_scale(obj, factor: float) -> None:
    if factor == 1.0:
        return
    obj.scale = (factor, factor, factor)
    apply_transforms(obj)


def normalize_to_target_height(obj, target_y: float) -> None:
    """Uniform-scale `obj` so its bounding-box Y extent equals `target_y` units.

    Source assets use wildly inconsistent units (Voxel Props Pack ~70u tall;
    Kento ~22u; trap pack ~70u). After this pass, characters land at 1.8u,
    props at the cell-grid (1u per cell), and traps at ≤1.5u.
    """
    bbox = [obj.matrix_world @ v.co for v in obj.data.vertices]
    if not bbox:
        return
    min_y = min(v.y for v in bbox)
    max_y = max(v.y for v in bbox)
    height = max_y - min_y
    if height < 1e-6:
        return
    factor = target_y / height
    obj.scale = (obj.scale[0] * factor, obj.scale[1] * factor, obj.scale[2] * factor)
    apply_transforms(obj)


def strip_animations() -> None:
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action, do_unlink=True)
    for obj in bpy.data.objects:
        if obj.animation_data:
            obj.animation_data_clear()


def apply_vertex_tint(obj, tint: list[float]) -> None:
    """Multiply the existing vertex color (or paper-white) by `tint` (rgba 0..1)."""
    mesh = obj.data
    if not mesh.vertex_colors:
        layer = mesh.vertex_colors.new(name="tint")
    else:
        layer = mesh.vertex_colors.active
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            existing = layer.data[li].color
            layer.data[li].color = (
                existing[0] * tint[0],
                existing[1] * tint[1],
                existing[2] * tint[2],
                existing[3] * tint[3],
            )


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------


def export_glb(out: Path) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    # Select all mesh objects so the export includes them
    bpy.ops.object.select_all(action="DESELECT")
    for obj in get_mesh_objects():
        obj.select_set(True)

    bpy.ops.export_scene.gltf(
        filepath=str(out),
        export_format="GLB",
        export_image_format="WEBP",
        export_animations=False,
        export_yup=True,
        use_selection=True,
        export_apply=True,  # apply modifiers
    )


# ---------------------------------------------------------------------------
# Manifest helpers
# ---------------------------------------------------------------------------


def load_manifest(path: Path) -> dict:
    if path.exists():
        return json.loads(path.read_text())
    return {"version": 1, "characters": {}, "props": {}, "traps": {}}


def save_manifest(path: Path, manifest: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(manifest, indent="\t", sort_keys=True) + "\n")
    tmp.replace(path)


# ---------------------------------------------------------------------------
# Per-slug pipeline
# ---------------------------------------------------------------------------


def convert_slug(
    *,
    group: str,
    slug: str,
    entry: dict,
    source_root: Path,
    output_root: Path,
    manifest: dict,
    force: bool,
) -> tuple[str, str]:
    """Convert one slug. Returns (status, hash) where status ∈ {'skip','done','fail'}."""
    candidates = [source_root / s for s in entry["sources"]]
    src = pick_source(candidates)

    options = {
        "scale": entry.get("scale", 1.0),
        "footprintCells": entry.get("footprintCells", [1, 1, 1]),
        "tags": entry.get("tags", []),
        "bake": entry.get("bake", None),
        "vertexTint": entry.get("vertexTint", None),
    }
    new_hash = hash_inputs([src], options)
    out_path = output_root / group / f"{slug}.glb"
    public_path = "/" + str(out_path.relative_to(REPO_ROOT / "public")).replace(os.sep, "/")

    existing = manifest.setdefault(group, {}).get(slug)
    if not force and existing and existing.get("sourceHash") == new_hash and out_path.exists():
        return ("skip", new_hash)

    print(f"[{group}/{slug}] source={src.relative_to(source_root)}", flush=True)
    clean_scene()
    import_source(src)
    strip_animations()

    merge_meshes()
    meshes = get_mesh_objects()
    if not meshes:
        return ("fail", new_hash)

    # Pick the merged result (largest by vertex count)
    obj = max(meshes, key=lambda m: len(m.data.vertices))

    # Normalize to a sensible default height per group, then apply per-slug scale.
    # Defaults: characters 1.8u (rough human height), props 2.0u (one cell tall
    # for tabletop items, three cells for staircases — declare height in cells
    # via footprintCells[1]), traps 1.0u.
    footprint_cells = options.get("footprintCells", [1, 1, 1])
    if group == "characters":
        default_height = 1.8
    elif group == "props":
        # For props the Y footprint cell count is the visual height in units
        default_height = float(footprint_cells[1])
    else:  # traps and anything else
        default_height = 1.0
    normalize_to_target_height(obj, default_height)
    apply_scale(obj, options["scale"])
    set_origin_to_ground(obj)
    apply_transforms(obj)

    if options["vertexTint"]:
        apply_vertex_tint(obj, options["vertexTint"])

    export_glb(out_path)

    manifest.setdefault(group, {})[slug] = {
        "path": public_path,
        "scale": options["scale"],
        "anchor": [0, 0, 0],
        "footprintCells": options["footprintCells"],
        "tags": options["tags"],
        "sourceHash": new_hash,
    }
    return ("done", new_hash)


# ---------------------------------------------------------------------------
# Trap auto-scan (T6 — populated in T6 commit)
# ---------------------------------------------------------------------------


def autoscan_traps(cfg: dict, source_root: Path, output_root: Path, manifest: dict, force: bool):
    spec = cfg.get("trapsAutoScan")
    if not spec:
        return
    glob = spec["glob"]
    prefix = spec["slugPrefix"]
    base_tags = spec.get("tags", ["trap"])
    cat_tags = spec.get("categoryTags", {})

    # Reverse map: trap-number → category
    num_to_cat = {}
    for cat, nums in cat_tags.items():
        for n in nums:
            num_to_cat[str(n)] = cat

    files = sorted((source_root / "Trap_Pack_Upload").rglob("*.gltf"))
    print(f"[traps autoscan] found {len(files)} gltf files", flush=True)

    for src in files:
        # Slug from filename: "Trap 1.gltf" -> "trap-1", "trap 12.gltf" -> "trap-12"
        stem = src.stem.lower()
        m = re.search(r"(\d+(?:_\d+)?)", stem)
        if not m:
            continue
        num = m.group(1)
        slug = f"{prefix}{num}"
        cat = num_to_cat.get(num.split("_")[0])
        tags = list(base_tags)
        if cat:
            tags.append(cat)
        entry = {
            "sources": [str(src.relative_to(source_root))],
            "scale": 1.0,
            "footprintCells": spec.get("footprintCells", [1, 1, 1]),
            "tags": tags,
        }
        try:
            convert_slug(
                group="traps",
                slug=slug,
                entry=entry,
                source_root=source_root,
                output_root=output_root,
                manifest=manifest,
                force=force,
            )
        except Exception as e:
            print(f"[traps/{slug}] FAILED: {e}", flush=True)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def parse_args() -> argparse.Namespace:
    # Blender forwards args after `--` to the script.
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    else:
        # Drop blender's own args (everything before this script's name)
        argv = []
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="Re-convert even when hash matches")
    parser.add_argument("--only", help="Comma-separated list of slugs to convert (others skipped)")
    return parser.parse_args(argv)


def main() -> int:
    args = parse_args()
    cfg = json.loads(CONFIG_PATH.read_text())
    source_root = REPO_ROOT / cfg["sourceRoot"]
    output_root = REPO_ROOT / cfg["outputRoot"]
    manifest_path = output_root / "manifest.json"
    manifest = load_manifest(manifest_path)

    only = set(args.only.split(",")) if args.only else None
    counts = {"skip": 0, "done": 0, "fail": 0}

    for group in ("characters", "props"):
        for slug, entry in cfg.get(group, {}).items():
            if only and slug not in only:
                continue
            try:
                status, _ = convert_slug(
                    group=group,
                    slug=slug,
                    entry=entry,
                    source_root=source_root,
                    output_root=output_root,
                    manifest=manifest,
                    force=args.force,
                )
                counts[status] += 1
                print(f"[{group}/{slug}] {status}", flush=True)
            except Exception as e:  # noqa: BLE001 — convert errors are user-actionable
                counts["fail"] += 1
                print(f"[{group}/{slug}] FAILED: {e}", flush=True)
                import traceback
                traceback.print_exc()

    if not only:
        autoscan_traps(cfg, source_root, output_root, manifest, args.force)

    save_manifest(manifest_path, manifest)
    print(
        f"\nResult: {counts['done']} converted, {counts['skip']} skipped, {counts['fail']} failed",
        flush=True,
    )
    return 0 if counts["fail"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
