"""Curate the PSX FPS Hands GLB into public/assets/models/hands/.

Drops the debug `Sphere(can delete)` mesh and the bonus item meshes
(Bat / Flashlight / Lanturn / Pistol — they ship as their own GLBs in a
follow-up if we want to use them). Keeps the armature + Arms / hand_1
meshes + their shared 'Arms' material.

Re-export:
  - GLB format, embedded textures
  - Original native scale preserved (centimeter-ish — runtime scales
    relative to the camera FOV, so absolute scale is decoupled)
  - Bone names preserved so the runtime can parent weapons to Hand.R

Run via: blender --background --python scripts/extract-hands.py
"""
import bpy
import os

REPO = '/Users/jbogaty/src/arcade-cabinet/department-of-redundancy-department'
SRC = os.path.join(REPO, 'references/PSX Hands/FPS_Arms_glb.glb')
OUT_DIR = os.path.join(REPO, 'public/assets/models/hands')
os.makedirs(OUT_DIR, exist_ok=True)

# Meshes to drop. Bonus items get their own GLBs in a follow-up if we
# decide to use them as melee/utility viewmodels.
DROP_MESHES = {
    'Sphere(can delete)',  # explicit dev marker
    'Bat_Shape',           # bonus melee item
    'Flashlight_Shape',    # bonus utility
    'Lanturn_Shape',       # bonus utility
    'Pistol_Shape',        # bonus weapon (we have better gun GLBs)
    'Icosphere',            # leftover from gltf import workaround
}


def reset_scene():
    # Avoid `read_homefile(use_empty=True)` — Blender 5.1 GLTF importer
    # crashes on empty contexts due to bpy.context.object being None
    # during armature_display(). Just drop existing data.
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    # Add a temp empty so context.object is set when GLTF imports.
    bpy.ops.object.empty_add(location=(0, 0, 0))


def main():
    reset_scene()
    bpy.ops.import_scene.gltf(filepath=SRC)
    print(f'imported {SRC}', flush=True)

    # Drop the temp empty + the unwanted meshes.
    for o in list(bpy.context.scene.objects):
        if o.type == 'EMPTY' and o.name.startswith('Empty'):
            bpy.data.objects.remove(o, do_unlink=True)
            continue
        if o.name in DROP_MESHES:
            print(f'  dropping {o.name!r}', flush=True)
            bpy.data.objects.remove(o, do_unlink=True)

    # List what's left.
    print('remaining:', flush=True)
    for o in sorted(bpy.context.scene.objects, key=lambda o: o.name):
        print(f'  {o.type:8s} {o.name!r}', flush=True)

    # Select all remaining + active = armature so the export captures
    # the rig + skinned meshes together.
    arm = next((o for o in bpy.context.scene.objects if o.type == 'ARMATURE'), None)
    if arm is None:
        print('ERROR: no armature found', flush=True)
        return 1
    bpy.ops.object.select_all(action='SELECT')
    bpy.context.view_layer.objects.active = arm

    out = os.path.join(OUT_DIR, 'fps-arms.glb')
    bpy.ops.export_scene.gltf(
        filepath=out,
        export_format='GLB',
        use_selection=True,
        export_apply=False,           # keep transforms (don't bake)
        export_yup=True,
        export_image_format='AUTO',
        export_skins=True,
        export_animations=False,       # static rig — runtime drives pose
    )
    size_kb = os.path.getsize(out) // 1024
    print(f'wrote {out} ({size_kb} KB)', flush=True)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
