"""Split the Stylized Guns FBX into one GLB per weapon.

Run via:
  blender --background --python scripts/extract-weapons.py

Each output GLB:
  - Contains the named meshes for ONE weapon, joined into a single mesh.
  - Has its origin moved to the bbox center-bottom-rear (the grip area)
    so a runtime parent transform places the grip at the hand bone.
  - Includes the embedded textures from the source FBX (default Blender
    GLB export = embedded). Mobile-flexible: we don't decimate or
    KTX2-compress here; that comes later if the perf budget demands it.
  - Lands at public/assets/models/weapons/<slug>.glb.

The mapping table is the source of truth — adding a new weapon means
adding one entry. Each slug uses a stable kebab-case name so the
runtime can reference it directly via the manifest.
"""
import bpy
import os
from mathutils import Vector

REPO = '/Users/jbogaty/src/arcade-cabinet/department-of-redundancy-department'
SRC_FBX = os.path.join(REPO, 'references/Stylized Guns 3D Models PRO/Stylized Gun Models PRO Textured.fbx')
OUT_DIR = os.path.join(REPO, 'public/assets/models/weapons')
os.makedirs(OUT_DIR, exist_ok=True)

# slug -> [exact mesh names from the FBX]
WEAPONS = {
    'ak47': [
        'AK - 47 Body',
        'AK - 47 Barrel ',  # trailing space is intentional — matches FBX
        'AK - 47 Magazine',
        'AK - 47 Selector Switch',
        'AK - 47 Trigger',
    ],
    'shotgun': [
        'Shotgun Handle',
        'Shotgun barrel',
        'Shotgun Forestock',
        'Shotgun Trigger',
    ],
    'mac10': [
        'MAC - 10 Body',
        'MAC 10 Trigger',
    ],
    'bazooka': [
        'Bazooka Body',
        'Bazooka Trigger',
    ],
    'flamethrower': [
        'Stylized Flamethrower',
        'Stylized Flamethrower Lever',
    ],
    'mgd-pm9': [
        'MGD PM-9 Body',
        'MGD PM-9 Magzine',
        'MGD PM-9 Magzine Hinge',
        'MGD PM-9 Trigger',
        'MGD PM-9 Front Loop',
        'MGD PM-9 Shoulder Stock',
        'MGD PM-9 Winder',
    ],
}


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def world_bbox(obj):
    """Return (min, max) of the object's world-space AABB."""
    mn = Vector((1e9,) * 3)
    mx = Vector((-1e9,) * 3)
    for v in obj.bound_box:
        wv = obj.matrix_world @ Vector(v)
        for i in range(3):
            if wv[i] < mn[i]:
                mn[i] = wv[i]
            if wv[i] > mx[i]:
                mx[i] = wv[i]
    return mn, mx


def export_weapon(slug, mesh_names):
    print(f'\n=== {slug} ===', flush=True)
    reset_scene()
    bpy.ops.import_scene.fbx(filepath=SRC_FBX)

    # Find the mesh objects for this weapon. Source-name match is exact.
    selected = []
    for name in mesh_names:
        obj = bpy.data.objects.get(name)
        if obj is None:
            print(f'  WARN: missing mesh {name!r}', flush=True)
            continue
        if obj.type != 'MESH':
            print(f'  WARN: {name!r} is {obj.type}, not MESH', flush=True)
            continue
        selected.append(obj)

    if not selected:
        print(f'  ERROR: no meshes found for {slug}', flush=True)
        return False

    # Delete every other object so the export only sees this weapon.
    keep_set = set(selected)
    for obj in list(bpy.context.scene.objects):
        if obj not in keep_set:
            bpy.data.objects.remove(obj, do_unlink=True)

    # Apply each remaining mesh's transform so vertex coords are in world
    # space — joining requires shared transform basis, and downstream
    # parenting wants the geometry expressed at world locations.
    bpy.ops.object.select_all(action='DESELECT')
    for obj in selected:
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # Join into a single mesh — simpler runtime, single draw call per weapon.
    bpy.context.view_layer.objects.active = selected[0]
    bpy.ops.object.join()
    weapon = bpy.context.active_object
    weapon.name = f'weapon-{slug}'

    # Use Blender's set-origin operator to put the mesh origin at the
    # GEOMETRY bounding-box center, then shift again so the grip sits
    # at the local origin. The grip is the bottom-rear of the weapon
    # — for FPS viewmodels this is what attaches to the hand bone.
    #
    # We compute the world-space bbox, derive the grip world-position,
    # then move the 3D cursor there + use 'origin_set' with type
    # 'ORIGIN_CURSOR'. This rewrites the mesh so the local origin is
    # the grip without manually editing vertex positions.
    mn, mx = world_bbox(weapon)
    grip_world = Vector((
        (mn.x + mx.x) / 2.0,  # mid X (along barrel)
        mn.y,                  # bottom Y (under the trigger)
        mn.z,                  # rear Z (back of stock)
    ))
    bpy.context.scene.cursor.location = grip_world
    bpy.context.view_layer.objects.active = weapon
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR', center='MEDIAN')
    # Now the origin sits at grip_world. Move the object so the new
    # origin is at world (0,0,0).
    weapon.location = (0, 0, 0)
    bpy.context.view_layer.update()

    mn2, mx2 = world_bbox(weapon)
    dim = (round(mx2.x - mn2.x, 3), round(mx2.y - mn2.y, 3), round(mx2.z - mn2.z, 3))
    print(f'  joined {len(selected)} meshes; final dims={dim} bbox=[{tuple(round(c,2) for c in mn2)} → {tuple(round(c,2) for c in mx2)}]', flush=True)

    # Export. Embed textures (default for GLB), include only selected.
    out_path = os.path.join(OUT_DIR, f'weapon-{slug}.glb')
    bpy.ops.object.select_all(action='DESELECT')
    weapon.select_set(True)
    bpy.context.view_layer.objects.active = weapon
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_image_format='AUTO',
    )
    size_kb = os.path.getsize(out_path) // 1024
    print(f'  wrote {out_path} ({size_kb} KB)', flush=True)
    return True


def main():
    print(f'src: {SRC_FBX}')
    print(f'out: {OUT_DIR}')
    if not os.path.exists(SRC_FBX):
        print('ERROR: source FBX missing')
        return 1
    failures = 0
    for slug, names in WEAPONS.items():
        if not export_weapon(slug, names):
            failures += 1
    print(f'\nDONE. failures={failures}')
    return 1 if failures else 0


if __name__ == '__main__':
    raise SystemExit(main())
