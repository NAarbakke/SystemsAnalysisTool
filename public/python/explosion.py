"""Deterministic exploded-view layout; runs in CPython or a Pyodide worker.

Uses assembly-space bounding boxes, not CAD constraints. Final automatic layouts
separate bounding boxes; motion paths are illustrative, not disassembly proofs.
"""
import json
import math


def plan_explosion(parts, mode="radial"):
    if mode not in ("radial", "x", "y", "z"):
        raise ValueError("Unknown explosion direction")
    if not parts or len(parts) > 500:
        raise ValueError("Provide between 1 and 500 parts")
    centers, sizes = [], []
    for part in parts:
        c, s = part["center"], part["size"]
        if len(c) != 3 or len(s) != 3 or not all(math.isfinite(v) for v in c + s) or min(s) < 0:
            raise ValueError("Invalid part bounds")
        centers.append(c[:])
        sizes.append([max(v, 1e-6) for v in s])
    count = len(parts)
    anchor = max(range(count), key=lambda i: math.prod(sizes[i]))
    targets = [c[:] for c in centers]
    gap = 0.3
    if mode != "radial":
        axis = "xyz".index(mode)
        order = sorted(range(count), key=lambda i: (centers[i][axis], i))
        pivot = order.index(anchor)
        for side in (-1, 1):
            previous = anchor
            indices = order[pivot + 1:] if side == 1 else list(reversed(order[:pivot]))
            for i in indices:
                step = (sizes[previous][axis] + sizes[i][axis]) / 2 + gap
                targets[i][axis] = targets[previous][axis] + side * step
                previous = i
    else:
        # Place each part outwards from the anchor. Increase travel until its
        # box clears all previously placed boxes, including concentric parts.
        placed = [anchor]
        for i in sorted((i for i in range(count) if i != anchor), key=lambda i: -math.dist(centers[i], centers[anchor])):
            vector = [centers[i][k] - centers[anchor][k] for k in range(3)]
            length = math.sqrt(sum(v*v for v in vector))
            if length < 1e-6:
                angle = i * 2.399963229728653
                vector = [math.cos(angle), 0.5 if i % 2 else -0.5, math.sin(angle)]
                length = math.sqrt(1.25)
            vector = [v / length for v in vector]
            travel = gap + max(sizes[i]) * 0.3
            for _ in range(10000):
                candidate = [centers[i][k] + vector[k] * travel for k in range(3)]
                if all(any(abs(candidate[k] - targets[j][k]) >= (sizes[i][k] + sizes[j][k]) / 2 + gap for k in range(3)) for j in placed):
                    targets[i] = candidate
                    break
                travel += gap
            else:
                raise ValueError("Assembly is too dense to arrange")
            placed.append(i)
    offsets = [[targets[i][k] - centers[i][k] for k in range(3)] for i in range(count)]
    # Explicit overrides intentionally take precedence over automatic packing.
    for i, part in enumerate(parts):
        direction = part.get("direction", "auto")
        if direction == "fixed":
            offsets[i] = [0.0, 0.0, 0.0]
        elif direction != "auto":
            if direction not in ("+x", "-x", "+y", "-y", "+z", "-z"):
                raise ValueError("Unknown part direction")
            travel = max(math.sqrt(sum(v*v for v in offsets[i])), max(sizes[i]) + gap)
            offsets[i] = [0.0, 0.0, 0.0]
            offsets[i]["xyz".index(direction[1])] = travel * (1 if direction[0] == "+" else -1)
    return {"offsets": offsets, "anchor": anchor}


def plan_json(payload):
    data = json.loads(payload)
    return json.dumps(plan_explosion(data["parts"], data.get("mode", "radial")), allow_nan=False)
